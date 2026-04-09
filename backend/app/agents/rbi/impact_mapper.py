"""Agent 4 — Impact Mapper.

Converts legal/regulatory changes into business impact:
  - maps changed clauses to departments / processes
  - retrieves similar past cases via pgvector
  - estimates severity (low / medium / high)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import OllamaEmbeddings

from app.agents.base import BaseAgent
from app.agents.rbi.change_detector import ChangeReport, ClauseChange
from app.config import settings
from app.db.supabase_client import get_supabase

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

    def __init__(self) -> None:
        super().__init__()
        self.embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL,
        )

    async def run(self, change_report: ChangeReport) -> ImpactMap:
        impact_map = ImpactMap()
        for change in change_report.changes:
            if change.change_type == "unchanged":
                continue
            item = await self._analyze_change(change)
            impact_map.items.append(item)

        impact_map.overall_severity = self._roll_up(impact_map.items)
        return impact_map

    # ------------------------------------------------------------------
    async def _analyze_change(self, change: ClauseChange) -> ClauseImpact:
        text = change.new_text or change.old_text or ""
        similar = await self._find_similar(text)
        departments = self._guess_departments(text)

        # LLM call for severity + impact statement
        try:
            response = await self.llm.ainvoke([
                SystemMessage(content=IMPACT_SYSTEM),
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

    async def _find_similar(self, text: str) -> list[dict]:
        client = get_supabase()
        if not client:
            return []
        try:
            vector = self.embeddings.embed_query(text[:2000])
            result = client.rpc(
                "match_company_documents",
                {"query_embedding": vector, "match_count": 3},
            ).execute()
            return getattr(result, "data", []) or []
        except Exception:
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
