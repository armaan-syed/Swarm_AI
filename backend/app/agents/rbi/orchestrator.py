"""RBI 5-agent orchestrator.

Pipeline:
    SourceMonitor -> DocumentExtractor -> ChangeDetector ->
    ImpactMapper -> ReportGenerator
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from app.agents.rbi.change_detector import ChangeDetectorAgent, ChangeReport
from app.agents.rbi.document_extractor import (
    DocumentExtractorAgent,
    ExtractedDoc,
)
from app.agents.rbi.impact_mapper import ImpactMap, ImpactMapperAgent
from app.agents.rbi.report_generator import ReportGeneratorAgent, ValidatedReport
from app.agents.rbi.source_monitor import CircularRef, SourceMonitorAgent
from app.db.supabase_client import get_supabase


@dataclass
class PipelineRun:
    found_refs: list[dict] = field(default_factory=list)
    reports: list[dict] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class RBIOrchestrator:
    def __init__(self) -> None:
        self.monitor = SourceMonitorAgent()
        self.extractor = DocumentExtractorAgent()
        self.detector = ChangeDetectorAgent()
        self.mapper = ImpactMapperAgent()
        self.reporter = ReportGeneratorAgent()

    async def run(
        self,
        sources: list[str] | None = None,
        max_docs: int = 5,
    ) -> PipelineRun:
        result = PipelineRun()

        # 1. Source Monitor
        refs = await self.monitor.run(sources=sources)
        result.found_refs = [asdict(r) for r in refs]
        if not refs:
            return result

        # 2-5. Process each new document
        for ref in refs[:max_docs]:
            try:
                report = await self._process_one(ref)
                result.reports.append(report)
            except Exception as exc:  # noqa: BLE001
                result.errors.append(f"{ref.url}: {exc}")
        return result

    async def run_one(self, url: str, source: str = "RBI") -> dict[str, Any]:
        ref = CircularRef(source=source, title=url, url=url)
        return await self._process_one(ref)

    # ------------------------------------------------------------------
    async def _process_one(self, ref: CircularRef) -> dict[str, Any]:
        # 2. Extract
        new_doc = await self.extractor.run(ref)

        # Look up previous version (by source + title prefix)
        old_doc = await self._fetch_previous(ref)

        # 3. Detect changes
        change_report = await self.detector.run(new_doc, old_doc)

        if change_report.is_duplicate:
            return {
                "ref": asdict(ref),
                "summary": change_report.summary,
                "severity": "none",
                "report": None,
            }

        # 4. Map impact
        impact_map = await self.mapper.run(change_report)

        # 5. Generate report
        report = await self.reporter.run(change_report, impact_map)

        # Persist
        await self._persist(new_doc, change_report, impact_map, report)

        return {
            "ref": asdict(ref),
            "summary": change_report.summary,
            "severity": impact_map.overall_severity,
            "report": {
                "markdown": report.markdown,
                "citations": report.citations,
                "affected_teams": report.affected_teams,
                "action_items": report.action_items,
                "grounded": report.grounded,
                "generated_at": report.generated_at,
                "overall_severity": report.overall_severity,
            },
        }

    async def _fetch_previous(self, ref: CircularRef) -> ExtractedDoc | None:
        client = get_supabase()
        if not client:
            return None
        try:
            res = (
                client.table("circulars")
                .select("*")
                .eq("source", ref.source)
                .ilike("title", f"{ref.title[:30]}%")
                .order("published_date", desc=True)
                .limit(1)
                .execute()
            )
            row = (res.data or [None])[0]
            if not row:
                return None
            from app.agents.rbi.document_extractor import Clause

            return ExtractedDoc(
                ref=CircularRef(
                    source=row["source"],
                    title=row["title"],
                    url=row["url"],
                    published_date=row.get("published_date"),
                ),
                raw_text=row.get("raw_text", ""),
                clauses=[
                    Clause(**c) for c in (row.get("clauses_json") or [])
                ],
                effective_date=row.get("effective_date"),
            )
        except Exception:
            return None

    async def _persist(
        self,
        new_doc: ExtractedDoc,
        change_report: ChangeReport,
        impact_map: ImpactMap,
        report: ValidatedReport,
    ) -> None:
        client = get_supabase()
        if not client:
            return
        try:
            # Get current version
            res = (
                client.table("circulars")
                .select("version")
                .eq("url", new_doc.ref.url)
                .execute()
            )
            current_version = (res.data or [{}])[0].get("version", 0)
            new_version = current_version + 1

            client.table("circulars").upsert(
                {
                    "source": new_doc.ref.source,
                    "title": new_doc.ref.title,
                    "url": new_doc.ref.url,
                    "published_date": new_doc.ref.published_date,
                    "raw_text": new_doc.raw_text,
                    "clauses_json": [asdict(c) for c in new_doc.clauses],
                    "effective_date": new_doc.effective_date,
                    "doc_hash": change_report.doc_hash,
                    "version": new_version,
                },
                on_conflict="url",
            ).execute()

            client.table("impact_reports").insert(
                {
                    "circular_url": new_doc.ref.url,
                    "summary": change_report.summary,
                    "severity": impact_map.overall_severity,
                    "markdown": report.markdown,
                    "citations": report.citations,
                    "affected_teams": report.affected_teams,
                    "action_items": report.action_items,
                    "grounded": report.grounded,
                }
            ).execute()
        except Exception as exc:  # noqa: BLE001
            print(f"[Orchestrator] persist failed: {exc}")
