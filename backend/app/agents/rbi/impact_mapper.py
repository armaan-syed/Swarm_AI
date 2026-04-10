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

        import asyncio
        
        # Throttling semaphore to prevent overloading local Ollama
        semaphore = asyncio.Semaphore(2)
        
        # Limit analysis to Top 10 changes for high-speed demo performance
        active_changes = [c for c in change_report.changes if c.change_type != "unchanged"][:10]
        
        async def throttled_analyze(change):
            async with semaphore:
                return await self._analyze_change(change, ctx)

        if not active_changes:
            return ImpactMap()

        logger.info("[Agent 4] Running %d throttled reasoning tasks for impact mapping...", len(active_changes))
        results = await asyncio.gather(*[throttled_analyze(c) for c in active_changes])
        
        impact_map = ImpactMap(items=list(results))
        impact_map.overall_severity = self._roll_up(impact_map.items)
        return impact_map

    # ------------------------------------------------------------------
    async def _analyze_change(self, change: ClauseChange, company_context=None) -> ClauseImpact:
        text = change.new_text or change.old_text or ""
        similar = await self._find_similar(text, company_context)

        # Get RAG context for better analysis
        rag_context = await self._get_rag_context(text, company_context)
        departments = self._guess_departments(text)

        # Build system prompt with optional company context and RAG context
        system_prompt = IMPACT_SYSTEM
        if company_context:
            system_prompt += (
                f"\n\nCompany context:\n"
                f"- Name: {company_context.name}\n"
                f"- Industry: {company_context.industry or 'not specified'}\n"
                f"- Products/Services: {company_context.product_description or 'not specified'}\n"
                f"Tailor your analysis to this company's specific business."
            )

        if rag_context:
            system_prompt += (
                f"\n\nRelevant regulatory context:\n{rag_context}\n"
                f"Use this context to inform your impact analysis."
            )

        # Build RAG context from similarity search results
        rag_context = ""
        if similar:
            rag_context = "\n\nRelevant Internal Policy Snippets (from ChromaDB):\n"
            for i, doc in enumerate(similar):
                title = doc.get("metadata", {}).get("title", "Internal Document")
                rag_context += f"[{i+1}] Source: {title}\nText: {doc.get('document', '')[:500]}\n---\n"

        # LLM call for severity + impact statement
        try:
            response = await self.llm.ainvoke([
                SystemMessage(content=system_prompt + rag_context),
                HumanMessage(
                    content=(
                        f"Change type: {change.change_type}\n"
                        f"Clause {change.number}\n"
                        f"Important terms: {', '.join(change.important_terms) or 'none'}\n"
                        f"Text:\n{text[:1500]}\n\n"
                        f"Task: Identify if this regulatory change conflicts with or updates the Internal Policy Snippets provided above."
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

    async def _get_rag_context(self, text: str, company_context=None) -> str:
        """Get relevant regulatory context using RAG service."""
        try:
            from app.services.rag_service import get_rag_service

            rag_service = get_rag_service()

            # Get mixed context (regulatory + company)
            context_results = await rag_service.retrieve_mixed_context(
                query=text[:1000],  # Use first 1000 chars for query
                top_k_regulatory=3,
                top_k_company=2,
                company_id=company_context.id if company_context else None
            )

            # Format context for LLM
            context_parts = []

            # Add regulatory context
            if context_results["regulatory"]:
                context_parts.append("Regulatory Context:")
                for i, chunk in enumerate(context_results["regulatory"], 1):
                    context_parts.append(f"{i}. {chunk['chunk'][:500]}...")
                context_parts.append("")

            # Add company context
            if context_results["company"]:
                context_parts.append("Company Context:")
                for i, chunk in enumerate(context_results["company"], 1):
                    context_parts.append(f"{i}. {chunk['chunk'][:500]}...")
                context_parts.append("")

            return "\n".join(context_parts).strip()

        except Exception as exc:
            logger.debug("RAG context retrieval failed: %s", exc)
            return ""

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
