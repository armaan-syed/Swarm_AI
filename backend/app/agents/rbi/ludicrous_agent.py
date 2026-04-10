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
    action_items: list[str]
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

        # Fast heuristic fallback — avoids long LLM waits and keeps pipeline responsive
        heuristic = self._heuristic_blitz(change_report, company_context)

        try:
            import asyncio
            # Use a short timeout for the LLM; if it fails or is slow, fallback to heuristic
            response = await asyncio.wait_for(
                self.llm.ainvoke([
                    SystemMessage(content=BLITZ_SYSTEM),
                    HumanMessage(content=prompt)
                ]),
                timeout=8.0,
            )

            parsed = self._parse_json(response.content)

            return BlitzResult(
                summary=parsed.get("summary", heuristic.summary),
                severity=(parsed.get("severity") or heuristic.severity).upper(),
                affected_teams=parsed.get("affected_teams", heuristic.affected_teams),
                action_items=self._normalize_action_items(parsed.get("action_items", heuristic.action_items)),
                emails=parsed.get("emails", heuristic.emails),
            )
        except Exception as exc:
            logger.warning(f"[Blitz] LLM failed or timed out: {exc}; using heuristic fallback")
            return heuristic

    def _parse_json(self, raw: str) -> dict:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match: return {}
        try:
            return json.loads(match.group(0))
        except: return {}

    def _normalize_action_items(self, items) -> list[str]:
        """Normalize various possible action_items formats into list[str].
        Accepts list[str] or list[dict] where dict contains 'task' or 'text'.
        """
        if not items:
            return []
        out: list[str] = []
        try:
            for it in items:
                if isinstance(it, str):
                    out.append(it)
                elif isinstance(it, dict):
                    # prefer fields commonly used by agents
                    text = it.get("task") or it.get("text") or it.get("description")
                    if text:
                        out.append(text)
                    else:
                        out.append(json.dumps(it))
                else:
                    out.append(str(it))
        except Exception:
            return []
        return out

    def _heuristic_blitz(self, change_report: ChangeReport, company_context: Any = None) -> BlitzResult:
        """Produce a quick, deterministic BlitzResult using simple rules.
        This is fast and safe when the LLM is slow/unavailable.
        """
        active = [c for c in change_report.changes if c.change_type != "unchanged"][:3]
        if not active:
            return BlitzResult(
                summary="No material changes detected.",
                severity="LOW",
                affected_teams=["Compliance"],
                action_items=[],
                emails=[],
            )

        # Build a terse summary from top clause texts
        top_texts = [((c.new_text or c.old_text) or "").strip()[:200] for c in active]
        summary = " ".join([t.split('.')[0] for t in top_texts])
        if not summary:
            summary = "Regulatory updates detected affecting core compliance requirements."

        # Heuristic severity detection
        severity = "MEDIUM"
        joined = " ".join(top_texts).lower()
        if any(k in joined for k in ("increase", "mandatory", "must", "required", "penalty")):
            severity = "HIGH"
        elif any(k in joined for k in ("clarify", "guidance", "optional")):
            severity = "LOW"

        # Map to teams and generate one action per team
        teams = ["Compliance", "Operations", "Risk"]
        action_items = []
        for i, c in enumerate(active):
            task = f"Review Clause {c.number} and update internal controls to reflect the change."
            action_items.append(task)

        emails = []
        for team in teams:
            emails.append({
                "to": team,
                "subject": f"Immediate: Regulatory update requires {team} attention",
                "body": f"Please review the attached change summary and execute the recommended actions for {team}.",
            })

        return BlitzResult(
            summary=summary,
            severity=severity,
            affected_teams=teams,
            action_items=action_items,
            emails=emails,
        )
