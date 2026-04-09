"""Agent 4 — Impact Mapper.

Converts legal/regulatory changes into business impact:
  - maps changed clauses to departments / processes
  - retrieves similar documents via ChromaDB (replaces broken Supabase RPC)
  - estimates severity (low / medium / high)
  - optionally personalizes analysis using company context
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import BaseAgent
from app.agents.rbi.change_detector import ChangeReport, ClauseChange
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("impact_mapper")

Severity = Literal["LOW", "MEDIUM", "HIGH"]

DEPARTMENT_HINTS = {
    "kyc": ["compliance", "onboarding"],
    "aml": ["compliance", "risk"],
    "capital": ["treasury", "finance"],
    "lending": ["credit", "risk"],
    "deposit": ["retail-banking"],
    "report": ["compliance", "reporting"],
    "audit": ["audit", "compliance"],
    "disclosure": ["legal", "compliance"],
    "data": ["it", "data-protection"],
    "customer": ["retail-banking", "service"],
}

IMPACT_SYSTEM = """You are an Impact Mapper agent for an Indian compliance team.
Given a regulatory clause change, analyze:
  1. Which business departments/processes are affected
  2. Severity (LOW, MEDIUM, HIGH)
  3. A concise plain-English impact statement (max 2 sentences)

Return ONLY valid JSON in this exact format:
{"severity":"HIGH|MEDIUM|LOW","departments":["..."],"impact":"..."}
"""


@dataclass
class ClauseImpact:
    clause_number: str
    severity: Severity
    departments: list[str]
    impact_statement: str
    similar_docs: list[dict] = field(default_factory=list)


@dataclass
class ImpactMap:
    items: list[ClauseImpact] = field(default_factory=list)
    overall_severity: Severity = "LOW"


class ImpactMapperAgent(BaseAgent):
    name = "impact_mapper"

    def __init__(self, company_context=None) -> None:
        super().__init__()
        self._company_context = company_context

    async def run(self, change_report: ChangeReport, company_context=None) -> ImpactMap:
        # Allow runtime override of company context
        ctx = company_context or self._company_context

        impact_map = ImpactMap()
        for change in change_report.changes:
            if change.change_type == "unchanged":
                continue
            item = await self._analyze_change(change, ctx)
            impact_map.items.append(item)

        impact_map.overall_severity = self._roll_up(impact_map.items)
        return impact_map

    # ------------------------------------------------------------------
    async def _analyze_change(self, change: ClauseChange, company_context=None) -> ClauseImpact:
        text = change.new_text or change.old_text or ""
        similar = await self._find_similar(text, company_context)
        departments = self._guess_departments(text)

        # Build system prompt with optional company context
        system_prompt = IMPACT_SYSTEM
        if company_context:
            system_prompt += (
                f"\n\nCompany context:\n"
                f"- Name: {company_context.name}\n"
                f"- Industry: {company_context.industry or 'not specified'}\n"
                f"- Products/Services: {company_context.product_description or 'not specified'}\n"
                f"Tailor your analysis to this company's specific business."
            )

        # LLM call for severity + impact statement
        try:
            response = await self.llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(
                    content=(
                        f"Change type: {change.change_type}\n"
                        f"Clause {change.number}\n"
                        f"Important terms: {', '.join(change.important_terms) or 'none'}\n"
                        f"Text:\n{text[:1500]}"
                    )
                ),
            ])
            parsed = self._parse_json(response.content)
            severity = parsed.get("severity", "MEDIUM").upper()
            departments = parsed.get("departments") or departments
            impact_statement = parsed.get("impact", "")
        except Exception:
            severity = "MEDIUM"
            impact_statement = text[:200]

        return ClauseImpact(
            clause_number=change.number,
            severity=severity if severity in ("LOW", "MEDIUM", "HIGH") else "MEDIUM",
            departments=departments,
            impact_statement=impact_statement,
            similar_docs=similar,
        )

    async def _find_similar(self, text: str, company_context=None) -> list[dict]:
        """Query ChromaDB for similar company documents instead of the
        broken Supabase RPC match_company_documents."""
        try:
            from app.services.vector_store import get_vector_store

            vs = get_vector_store()
            where_filter = None
            if company_context:
                where_filter = {"company_id": company_context.id}

            results = vs.query(
                collection=settings.CHROMA_COMPANY_COLLECTION,
                text=text[:2000],
                n_results=3,
                where=where_filter,
            )
            return results
        except Exception as exc:
            logger.debug("ChromaDB similarity search failed: %s", exc)
            return []

    def _guess_departments(self, text: str) -> list[str]:
        low = text.lower()
        depts: set[str] = set()
        for keyword, mapped in DEPARTMENT_HINTS.items():
            if keyword in low:
                depts.update(mapped)
        return sorted(depts) or ["compliance"]

    def _parse_json(self, raw: str) -> dict:
        import json
        import re

        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return {}
        try:
            return json.loads(match.group(0))
        except Exception:
            return {}

    def _roll_up(self, items: list[ClauseImpact]) -> Severity:
        if any(i.severity == "HIGH" for i in items):
            return "HIGH"
        if any(i.severity == "MEDIUM" for i in items):
            return "MEDIUM"
        return "LOW"
