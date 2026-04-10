"""Agent Turbo — Ludicrous Speed Blitz.

Collapses Impact Mapper and Report Generator into a single LLM pass.
Focuses on the Top 3 changes and produces the full report + emails in one go.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import BaseAgent
from app.agents.rbi.change_detector import ChangeReport
from app.utils.logger import get_logger

logger = get_logger("ludicrous_agent")

BLITZ_SYSTEM = """You are a Blitz Compliance Analyst. Your goal is extreme speed and actionable precision.
Given a regulatory change report, produce a unified compliance intelligence payload.

STRICT REQUIREMENTS:
1. Analyze only the Top 3 most critical changes.
2. Produce a high-impact Executive Summary (max 2 sentences).
3. Draft 3 Action Items (one per affected department).
4. Draft 3 Briefing Emails (Strategic, Operations, Risk).

Return ONLY valid JSON in this exact structure:
{
  "summary": "...",
  "severity": "HIGH|MEDIUM|LOW",
  "affected_teams": ["Strategic Oversight", "Operations", "Risk & Audit"],
  "action_items": [{"id": "1", "task": "...", "status": "pending"}],
  "emails": [
    {"to": "Strategic Oversight", "subject": "...", "body": "..."},
    {"to": "Operations", "subject": "...", "body": "..."},
    {"to": "Risk & Audit", "subject": "...", "body": "..."}
  ]
}
"""

@dataclass
class BlitzResult:
    summary: str
    severity: str
    affected_teams: list[str]
    action_items: list[dict]
    emails: list[dict]

class LudicrousSpeedAgent(BaseAgent):
    name = "ludicrous_speed"

    async def run(self, change_report: ChangeReport, company_context: Any = None) -> BlitzResult:
        logger.info("[Blitz] Collapsing pipeline into single reasoning pass...")
        
        # Prune changes to Top 3 for blitz performance
        active = [c for c in change_report.changes if c.change_type != "unchanged"][:3]
        
        payload = []
        for c in active:
            payload.append(f"Clause {c.number}: {c.new_text[:300]}")
        
        prompt = f"REGULATORY CHANGES:\n" + "\n".join(payload)
        if company_context:
            prompt += f"\n\nCOMPANY: {company_context.name} ({company_context.industry})\n"
            prompt += f"SERVICES: {company_context.product_description}\n"

        try:
            response = await self.llm.ainvoke([
                SystemMessage(content=BLITZ_SYSTEM),
                HumanMessage(content=prompt)
            ])
            
            parsed = self._parse_json(response.content)
            
            return BlitzResult(
                summary=parsed.get("summary", "New regulatory updates detected."),
                severity=parsed.get("severity", "MEDIUM").upper(),
                affected_teams=parsed.get("affected_teams", ["Compliance"]),
                action_items=parsed.get("action_items", []),
                emails=parsed.get("emails", [])
            )
        except Exception as exc:
            logger.error(f"[Blitz] Reasoning failed: {exc}")
            return BlitzResult(
                summary="Speed run failed. Check logs.",
                severity="MEDIUM",
                affected_teams=["Compliance"],
                action_items=[],
                emails=[]
            )

    def _parse_json(self, raw: str) -> dict:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match: return {}
        try:
            return json.loads(match.group(0))
        except: return {}
