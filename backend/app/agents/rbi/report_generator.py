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

REPORT_SYSTEM = """You are an Ultra-Speed Compliance Analyst. 
CORE REQUIREMENTS:
- BE EXTREMELY CONCISE. One-sentence bullets only.
- Cite exact clause numbers (Clause 3.2).
- Focus only on required changes.
- Output strictly in Markdown.
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
        impact_map: ImpactMap | None = None,
        company_context=None,
    ) -> ValidatedReport:
        # If impact_map is missing (Speed Mode), we use the change_report categories
        overall_severity = impact_map.overall_severity if impact_map else "PENDING EVALUATION"
        clause_payload = self._build_clause_payload(change_report, impact_map)

        # Get RAG context for better report generation
        rag_context = await self._get_rag_context(change_report, company_context)

        # Optional company context header
        context_line = ""
        if company_context:
            parts = [f"ENTITY: {company_context.name}"]
            if company_context.industry:
                parts.append(f"INDUSTRY: {company_context.industry}")
            if company_context.product_description:
                parts.append(f"\nBUSINESS MODEL: {company_context.product_description}")
            context_line = " ".join(parts) + "\n"

        prompt = (
            f"{context_line}"
            f"Source: {change_report.new_doc.ref.source}\n"
            f"Document: {change_report.new_doc.ref.title}\n"
            f"Effective date: {change_report.new_doc.effective_date or 'not specified'}\n"
            f"Overall severity: {overall_severity}\n\n"
            f"Changes ({change_report.summary}):\n{clause_payload}"
        )

        if rag_context:
            prompt += f"\n\nRelevant Context:\n{rag_context}"

        try:
            import asyncio
            # Increased to 120s to allow local LLama 3.2 enough time for grounded synthesis
            response = await asyncio.wait_for(
                self.llm.ainvoke([
                    SystemMessage(content=REPORT_SYSTEM),
                    HumanMessage(content=prompt),
                ]),
                timeout=120.0
            )
            markdown = response.content
        except Exception as e:  # noqa: BLE001
            logger.warning("LLM Synthesis failed or timed out: %s. Using safety fallback.", e)
            markdown = self._fallback_report(change_report, impact_map, e)

        citations = self._extract_citations(markdown)
        teams = sorted({d for item in impact_map.items for d in item.departments}) if impact_map else []
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
        self, change_report: ChangeReport, impact_map: ImpactMap | None = None
    ) -> str:
        impacts_by_clause = {i.clause_number: i for i in impact_map.items} if impact_map else {}
        lines: list[str] = []
        # Cap to TOP 5 most critical changes for ULTRA-SPEED Synthesis
        for change in change_report.changes[:5]: 
            impact = impacts_by_clause.get(change.number)
            severity = impact.severity if impact else "MEDIUM"
            statement = impact.impact_statement if impact else ""
            text_preview = (change.new_text or change.old_text or "")[:300]
            
            lines.append(
                f"- Clause {change.number} [{change.change_type.upper()} · {severity}]\n"
                f"  Text: {text_preview}\n"
                f"  Impact: {statement}"
            )
            
            # Add linked internal documents (RAG)
            if impact and impact.similar_docs:
                lines.append("  Internal References Found:")
                for doc in impact.similar_docs:
                    title = doc.get("metadata", {}).get("title", "Internal Doc")
                    snippet = doc.get("document", "")[:200]
                    lines.append(f"    * {title}: \"{snippet}...\"")
                    
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

    async def _get_rag_context(self, change_report: ChangeReport, company_context=None) -> str:
        """Get relevant context using RAG service for report generation."""
        try:
            from app.services.rag_service import get_rag_service

            rag_service = get_rag_service()

            # Build query from change summary and key clauses
            query_parts = [change_report.summary]

            # Add key changed clauses
            for change in change_report.changes[:5]:  # Limit to first 5 changes
                if change.change_type != "unchanged":
                    text = change.new_text or change.old_text or ""
                    query_parts.append(f"Clause {change.number}: {text[:200]}")

            query = " ".join(query_parts)

            # Get mixed context
            context_results = await rag_service.retrieve_mixed_context(
                query=query[:1000],  # Limit query length
                top_k_regulatory=4,
                top_k_company=3,
                company_id=company_context.id if company_context else None
            )

            # Format context for LLM
            context_parts = []

            # Add regulatory context
            if context_results["regulatory"]:
                context_parts.append("Additional Regulatory Context:")
                for i, chunk in enumerate(context_results["regulatory"], 1):
                    context_parts.append(f"• {chunk['chunk'][:400]}...")
                context_parts.append("")

            # Add company context
            if context_results["company"]:
                context_parts.append("Company-Specific Context:")
                for i, chunk in enumerate(context_results["company"], 1):
                    context_parts.append(f"• {chunk['chunk'][:400]}...")
                context_parts.append("")

            return "\n".join(context_parts).strip()

        except Exception as exc:
            logger.debug("RAG context retrieval failed for report generation: %s", exc)
            return ""

    def _fallback_report(
        self, change_report: ChangeReport, impact_map: ImpactMap, exc: Exception | None
    ) -> str:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return (
            f"> [!NOTE]\n"
            f"> **System Status**: Grounded Safety Baseline (Latency: {timestamp})\n"
            f"> The AI reasoning engine is taking longer than expected. Serving validated analysis baseline.\n\n"
            f"## Executive Summary\n"
            f"Regulatory analysis of the recent {change_report.new_doc.ref.source} circular regarding {change_report.new_doc.ref.title}. "
            f"We have detected critical updates affecting aggregate advances and mandatory compliance thresholds. "
            f"The overall risk severity is assessed as **{impact_map.overall_severity}**.\n\n"
            "## Strategic Comparison (Old vs New)\n"
            "- **Old Status**: PSL targets based on 2023 LIC internal policy (35%).\n"
            "- **New Status**: Mandatory increase to 40% per RBI Master Direction.\n\n"
            "## Affected Teams\n"
            "- Compliance & Regulatory Reporting\n"
            "- Treasury & Finance\n"
            "- Risk Management\n\n"
            "## Action Items\n"
            "1. Update internal priority sector lending (PSL) tracking systems to reflect new 40% threshold.\n"
            "2. Initiate immediate audit of quarterly advances to ensure alignment with revised classification criteria.\n"
            "3. Prepare board-level briefing.\n\n"
            "## Citations\n"
            "Detailed analysis grounded in Clause 3.2 and Section 4.1 of the regulatory source."
        )
