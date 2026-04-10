"""RBI 6-agent orchestrator.

Pipeline:
    SourceMonitor -> DocumentExtractor -> ChangeDetector ->
    ImpactMapper -> ReportGenerator -> Validator
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Optional

from app.agents.rbi.change_detector import ChangeDetectorAgent, ChangeReport
from app.agents.rbi.document_extractor import (
    DocumentExtractorAgent,
    ExtractedDoc,
)
from app.agents.rbi.impact_mapper import ImpactMap, ImpactMapperAgent
from app.agents.rbi.report_generator import ReportGeneratorAgent, ValidatedReport
from app.agents.rbi.source_monitor import CircularRef, SourceMonitorAgent
from app.agents.rbi.validator import RBIValidatorAgent, ValidationResult
from app.db.supabase_client import get_supabase
from app.utils.logger import get_logger

logger = get_logger("rbi_orchestrator")


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
        self.validator = RBIValidatorAgent()

    async def run(
        self,
        sources: list[str] | None = None,
        max_docs: int = 5,
        company_id: str | None = None,
    ) -> PipelineRun:
        result = PipelineRun()

        # Fetch company context if provided
        company_context = None
        if company_id:
            try:
                from app.services.company_service import get_company_context
                company_context = await get_company_context(company_id)
                if company_context:
                    logger.info("Company context loaded: %s", company_context.name)
                else:
                    logger.warning("Company ID %s not found, proceeding without context", company_id)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to load company context: %s", exc)

        # 1. Source Monitor
        refs = await self.monitor.run(sources=sources)
        result.found_refs = [asdict(r) for r in refs]
        if not refs:
            return result

        # 2-6. Process each new document
        # HACKATHON DEMO: Always cap at 1 document to ensure the presentation is fast and reliable.
        demo_max_docs = 1 
        for ref in refs[:demo_max_docs]:
            try:
                import asyncio
                # Strict 120s timeout per document to ensure the UI eventually returns something
                report = await asyncio.wait_for(self._process_one(ref, company_context), timeout=120.0)
                result.reports.append(report)
            except asyncio.TimeoutError:
                logger.error("Pipeline timed out for %s", ref.url)
                result.errors.append(f"{ref.url}: AI Reasoning Timeout (Local LLM too slow)")
            except Exception as exc:  # noqa: BLE001
                logger.exception("Pipeline failed for %s", ref.url)
                result.errors.append(f"{ref.url}: {exc}")
        return result

    async def run_one(self, url: str, source: str = "RBI", company_id: str | None = None) -> dict[str, Any]:
        ref = CircularRef(source=source, title=url, url=url)
        company_context = None
        if company_id:
            try:
                from app.services.company_service import get_company_context
                company_context = await get_company_context(company_id)
            except Exception:  # noqa: BLE001
                pass
        return await self._process_one(ref, company_context)

    # ------------------------------------------------------------------
    async def _process_one(self, ref: CircularRef, company_context=None) -> dict[str, Any]:
        logger.info("[Agent 2] Extracting document: %s", ref.url)
        # 2. Extract
        new_doc = await self.extractor.run(ref)
        logger.info("[Agent 2] Extraction complete. Clauses found: %d", len(new_doc.clauses))

        # Look up previous version (by source + title prefix)
        old_doc = await self._fetch_previous(ref)

        # 3. Detect changes
        logger.info("[Agent 3] Detecting changes against previous versions...")
        change_report = await self.detector.run(new_doc, old_doc)

        # HACKATHON DEMO: Force pipeline to always map impact and generate a report, bypassing duplicate checks.
        # if change_report.is_duplicate:
        #     return {
        #         "ref": asdict(ref),
        #         "summary": change_report.summary,
        #         "severity": "none",
        #         "report": None,
        #         "validation": None,
        #     }

        # 4. Map impact (with company context)
        logger.info("[Agent 4] Mapping impact for %d changes...", len(change_report.changes))
        impact_map = await self.mapper.run(change_report, company_context=company_context)

        # 5. Generate report (with company context)
        logger.info("[Agent 5] Generating grounded compliance report...")
        report = await self.reporter.run(change_report, impact_map, company_context=company_context)

        # 6. Validate
        logger.info("[Agent 6] Validating report for hallucinations/accuracy...")
        validation = await self.validator.run(change_report, impact_map, report)

        # Persist
        logger.info("Persisting results to Supabase...")
        await self._persist(new_doc, change_report, impact_map, report, validation)

        logger.info("Pipeline successfully completed for %s", ref.url)
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
            "validation": {
                "is_valid": validation.is_valid,
                "confidence": validation.confidence,
                "issues": validation.issues,
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
        validation: ValidationResult | None = None,
    ) -> None:
        client = get_supabase()
        if not client:
            logger.error("Supabase client missing - skipping persistence")
            return
        try:
            # 1. Update/Insert Circular
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

            # 2. Insert Impact Report
            report_row = {
                "circular_url": new_doc.ref.url,
                "summary": change_report.summary,
                "severity": impact_map.overall_severity,
                "markdown": report.markdown,
                "citations": report.citations,
                "affected_teams": report.affected_teams,
                "action_items": report.action_items,
                "grounded": report.grounded,
            }
            if validation:
                report_row["is_valid"] = validation.is_valid
                report_row["confidence"] = validation.confidence
                report_row["validation_issues"] = validation.issues

            client.table("impact_reports").insert(report_row).execute()
            logger.info("Successfully persisted circular and report for %s", new_doc.ref.url)
            
        except Exception as exc:  # noqa: BLE001
            logger.error("Persist failed for %s: %s", new_doc.ref.url, exc, exc_info=True)
