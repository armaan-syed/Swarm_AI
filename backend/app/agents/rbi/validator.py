"""Agent 6 — RBI Validator.

Dedicated final-stage validator separate from report_generator.py.
Confirms grounding, completeness, section structure, and emits a
single confidence score so the frontend can surface warnings.

The report is returned regardless of validation outcome — `is_valid=False`
does not block delivery, it just annotates quality issues.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.agents.base import BaseAgent
from app.agents.rbi.change_detector import ChangeReport
from app.agents.rbi.impact_mapper import ImpactMap
from app.agents.rbi.report_generator import ValidatedReport
from app.utils.logger import get_logger

logger = get_logger("rbi_validator")

REQUIRED_SECTIONS = [
    "executive summary",
    "affected teams",
    "action items",
    "citations",
]


@dataclass
class ValidationResult:
    """Outcome of the validation pass."""

    is_valid: bool = True
    confidence: float = 1.0  # 0..1
    issues: list[str] = field(default_factory=list)
    final_report: ValidatedReport | None = None


class RBIValidatorAgent(BaseAgent):
    """Final-stage validator for the RBI compliance pipeline.

    Checks:
        1. Every citation maps to a real clause number in the document.
        2. Required sections are present in the markdown.
        3. At least one action item exists when severity != LOW.
        4. Severity consistency between impact map and report.
        5. Aggregates a confidence score.
    """

    name = "rbi_validator"

    async def run(
        self,
        change_report: ChangeReport,
        impact_map: ImpactMap,
        report: ValidatedReport,
    ) -> ValidationResult:
        issues: list[str] = []

        # 1. Grounding — every citation must map to a real clause
        grounding_score = self._check_grounding(report, change_report, issues)

        # 2. Section completeness
        sections_score = self._check_sections(report.markdown, issues)

        # 3. Action items when severity is not LOW
        actions_score = self._check_action_items(report, impact_map, issues)

        # 4. Severity consistency
        severity_score = self._check_severity_consistency(
            report, impact_map, issues
        )

        # Aggregate confidence
        confidence = (
            grounding_score * 0.35
            + sections_score * 0.25
            + actions_score * 0.20
            + severity_score * 0.20
        )
        confidence = round(max(0.0, min(1.0, confidence)), 3)

        is_valid = confidence >= 0.5 and len(issues) <= 2

        result = ValidationResult(
            is_valid=is_valid,
            confidence=confidence,
            issues=issues,
            final_report=report,
        )

        logger.info(
            "Validation complete: valid=%s confidence=%.3f issues=%d",
            is_valid,
            confidence,
            len(issues),
        )
        return result

    # ------------------------------------------------------------------
    # Validation checks
    # ------------------------------------------------------------------
    def _check_grounding(
        self,
        report: ValidatedReport,
        change_report: ChangeReport,
        issues: list[str],
    ) -> float:
        """Verify every citation references an actual clause number."""
        if not report.citations:
            issues.append("No citations found in the report")
            return 0.0

        valid_numbers = {c.number for c in change_report.new_doc.clauses}
        if not valid_numbers:
            # No clauses parsed — can't validate, assume OK
            return 0.8

        ungrounded = [c for c in report.citations if c not in valid_numbers]
        if ungrounded:
            issues.append(
                f"Ungrounded citations (not in source): {', '.join(ungrounded[:5])}"
            )

        total = len(report.citations)
        grounded = total - len(ungrounded)
        return grounded / total if total else 0.0

    def _check_sections(
        self, markdown: str, issues: list[str]
    ) -> float:
        """Check that the required markdown sections are present."""
        lower = markdown.lower()
        found = 0
        for section in REQUIRED_SECTIONS:
            if f"## {section}" in lower or f"# {section}" in lower:
                found += 1
            else:
                issues.append(f"Missing section: '{section}'")

        return found / len(REQUIRED_SECTIONS) if REQUIRED_SECTIONS else 1.0

    def _check_action_items(
        self,
        report: ValidatedReport,
        impact_map: ImpactMap,
        issues: list[str],
    ) -> float:
        """When severity is MEDIUM or HIGH, at least one action item is expected."""
        if impact_map.overall_severity == "LOW":
            return 1.0  # no action items required for LOW

        if not report.action_items:
            issues.append(
                f"No action items found but severity is {impact_map.overall_severity}"
            )
            return 0.0
        return 1.0

    def _check_severity_consistency(
        self,
        report: ValidatedReport,
        impact_map: ImpactMap,
        issues: list[str],
    ) -> float:
        """The report's overall_severity should match the impact map's."""
        if report.overall_severity != impact_map.overall_severity:
            issues.append(
                f"Severity mismatch: report says '{report.overall_severity}' "
                f"but impact map says '{impact_map.overall_severity}'"
            )
            return 0.5
        return 1.0
