"""Agent 5 — Report Generator + Validator.

Produces the final, source-grounded compliance report:
  - executive summary
  - affected teams
  - prioritized action items
  - exact clause citations
  - hallucination check (every fact must be traceable to a clause)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import BaseAgent
from app.agents.rbi.change_detector import ChangeReport
from app.agents.rbi.impact_mapper import ImpactMap

REPORT_SYSTEM = """You are a Compliance Report Generator for an Indian financial
services compliance team. Produce a concise, structured impact brief.

You MUST:
- Cite the exact clause number for every claim, e.g. (Clause 3.2)
- Never invent facts. Every statement must trace to a provided clause.
- Use plain English. No legalese.
- Output Markdown with these sections:
  ## Executive Summary
  ## Affected Teams
  ## Action Items
  ## Citations
"""


@dataclass
class ValidatedReport:
    markdown: str
    citations: list[str]
    affected_teams: list[str]
    action_items: list[str]
    grounded: bool
    overall_severity: str
    generated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: dict[str, Any] = field(default_factory=dict)


class ReportGeneratorAgent(BaseAgent):
    name = "report_generator"

    async def run(
        self,
        change_report: ChangeReport,
        impact_map: ImpactMap,
    ) -> ValidatedReport:
        clause_payload = self._build_clause_payload(change_report, impact_map)

        prompt = (
            f"Source: {change_report.new_doc.ref.source}\n"
            f"Document: {change_report.new_doc.ref.title}\n"
            f"Effective date: {change_report.new_doc.effective_date or 'not specified'}\n"
            f"Overall severity: {impact_map.overall_severity}\n\n"
            f"Changes ({change_report.summary}):\n{clause_payload}"
        )

        try:
            response = await self.llm.ainvoke([
                SystemMessage(content=REPORT_SYSTEM),
                HumanMessage(content=prompt),
            ])
            markdown = response.content
        except Exception as exc:  # noqa: BLE001
            markdown = self._fallback_report(change_report, impact_map, exc)

        citations = self._extract_citations(markdown)
        teams = sorted({d for item in impact_map.items for d in item.departments})
        action_items = self._extract_action_items(markdown)
        grounded = self._validate_grounding(citations, change_report)

        return ValidatedReport(
            markdown=markdown,
            citations=citations,
            affected_teams=teams,
            action_items=action_items,
            grounded=grounded,
            overall_severity=impact_map.overall_severity,
            metadata={
                "source": change_report.new_doc.ref.source,
                "title": change_report.new_doc.ref.title,
                "url": change_report.new_doc.ref.url,
                "summary_stats": change_report.summary,
            },
        )

    # ------------------------------------------------------------------
    def _build_clause_payload(
        self, change_report: ChangeReport, impact_map: ImpactMap
    ) -> str:
        impacts_by_clause = {i.clause_number: i for i in impact_map.items}
        lines: list[str] = []
        for change in change_report.changes[:25]:  # cap for prompt size
            impact = impacts_by_clause.get(change.number)
            severity = impact.severity if impact else "MEDIUM"
            statement = impact.impact_statement if impact else ""
            text_preview = (change.new_text or change.old_text or "")[:300]
            lines.append(
                f"- Clause {change.number} [{change.change_type.upper()} · {severity}]\n"
                f"  Text: {text_preview}\n"
                f"  Impact: {statement}"
            )
        return "\n".join(lines) or "(no changes)"

    def _extract_citations(self, markdown: str) -> list[str]:
        import re

        return sorted(set(re.findall(r"Clause\s+([\d\.\(\)a-zA-Z]+)", markdown)))

    def _extract_action_items(self, markdown: str) -> list[str]:
        items: list[str] = []
        in_section = False
        for line in markdown.splitlines():
            if line.strip().lower().startswith("## action"):
                in_section = True
                continue
            if in_section and line.strip().startswith("##"):
                break
            if in_section and line.strip().startswith(("-", "*", "1.", "2.")):
                items.append(line.strip().lstrip("-*0123456789. ").strip())
        return items

    def _validate_grounding(
        self, citations: list[str], change_report: ChangeReport
    ) -> bool:
        if not citations:
            return False
        valid_numbers = {c.number for c in change_report.new_doc.clauses}
        return all(cite in valid_numbers for cite in citations)

    def _fallback_report(
        self, change_report: ChangeReport, impact_map: ImpactMap, exc: Exception
    ) -> str:
        return (
            f"## Executive Summary\nLLM unavailable ({exc}). "
            f"Detected {change_report.summary}. "
            f"Overall severity: {impact_map.overall_severity}.\n\n"
            "## Affected Teams\n- compliance\n\n"
            "## Action Items\n- Review changes manually.\n\n"
            "## Citations\n(none)"
        )
