"""Agent 3 — Change Detector.

Compares the new document version with the previous one clause-by-clause.
Finds added / removed / modified clauses and flags important terms.
"""
from __future__ import annotations

import difflib
import hashlib
from dataclasses import dataclass, field
from typing import Literal

from rapidfuzz import fuzz

from app.agents.base import BaseAgent
from app.agents.rbi.document_extractor import Clause, ExtractedDoc

ChangeType = Literal["added", "removed", "modified", "unchanged"]

IMPORTANT_TERMS = (
    "shall", "must", "applicable to", "exempted", "with effect from",
    "mandatory", "prohibited", "penalty", "compliance", "notwithstanding",
)


@dataclass
class ClauseChange:
    change_type: ChangeType
    number: str
    old_text: str | None
    new_text: str | None
    diff: str
    important_terms: list[str] = field(default_factory=list)
    similarity: float = 0.0


@dataclass
class ChangeReport:
    new_doc: ExtractedDoc
    old_doc: ExtractedDoc | None
    changes: list[ClauseChange] = field(default_factory=list)
    summary: str = ""
    doc_hash: str = ""
    version: int = 1
    is_duplicate: bool = False


class ChangeDetectorAgent(BaseAgent):
    name = "change_detector"

    async def run(
        self, new_doc: ExtractedDoc, old_doc: ExtractedDoc | None
    ) -> ChangeReport:
        report = ChangeReport(new_doc=new_doc, old_doc=old_doc)

        new_hash = self._compute_hash(new_doc.raw_text)
        report.doc_hash = new_hash

        if old_doc is not None:
            old_hash = self._compute_hash(old_doc.raw_text)
            if old_hash == new_hash:
                report.is_duplicate = True
                report.summary = "unchanged"
                return report

        if old_doc is None:
            # First ingest → treat all clauses as added
            for c in new_doc.clauses:
                report.changes.append(
                    ClauseChange(
                        change_type="added",
                        number=c.number,
                        old_text=None,
                        new_text=c.text,
                        diff=c.text,
                        important_terms=self._find_terms(c.text),
                    )
                )
            report.summary = f"{len(report.changes)} new clauses (first ingest)"
            return report
            # First ingest → treat all clauses as added
            for c in new_doc.clauses:
                report.changes.append(
                    ClauseChange(
                        change_type="added",
                        number=c.number,
                        old_text=None,
                        new_text=c.text,
                        diff=c.text,
                        important_terms=self._find_terms(c.text),
                    )
                )
            report.summary = f"{len(report.changes)} new clauses (first ingest)"
            return report

        old_map = {c.number: c for c in old_doc.clauses}
        new_map = {c.number: c for c in new_doc.clauses}

        # Added / modified
        for num, new_c in new_map.items():
            old_c = old_map.get(num)
            if old_c is None:
                matched = self._fuzzy_match(new_c, old_doc.clauses)
                if matched is None:
                    report.changes.append(
                        ClauseChange(
                            change_type="added",
                            number=num,
                            old_text=None,
                            new_text=new_c.text,
                            diff=new_c.text,
                            important_terms=self._find_terms(new_c.text),
                        )
                    )
                else:
                    report.changes.append(self._build_modified(matched, new_c))
            elif old_c.text.strip() != new_c.text.strip():
                report.changes.append(self._build_modified(old_c, new_c))

        # Removed
        for num, old_c in old_map.items():
            if num not in new_map:
                report.changes.append(
                    ClauseChange(
                        change_type="removed",
                        number=num,
                        old_text=old_c.text,
                        new_text=None,
                        diff=f"- {old_c.text}",
                        important_terms=self._find_terms(old_c.text),
                    )
                )

        report.summary = self._summary_stats(report.changes)
        return report

    # ------------------------------------------------------------------
    def _build_modified(self, old_c: Clause, new_c: Clause) -> ClauseChange:
        diff = "\n".join(
            difflib.unified_diff(
                old_c.text.splitlines(),
                new_c.text.splitlines(),
                lineterm="",
                n=2,
            )
        )
        similarity = fuzz.ratio(old_c.text, new_c.text) / 100.0
        return ClauseChange(
            change_type="modified",
            number=new_c.number,
            old_text=old_c.text,
            new_text=new_c.text,
            diff=diff,
            similarity=similarity,
            important_terms=self._find_terms(new_c.text),
        )

    def _fuzzy_match(self, new_c: Clause, old_clauses: list[Clause]) -> Clause | None:
        best: tuple[float, Clause | None] = (0.0, None)
        for old_c in old_clauses:
            score = fuzz.partial_ratio(new_c.heading, old_c.heading)
            if score > best[0]:
                best = (score, old_c)
        return best[1] if best[0] >= 85 else None

    def _find_terms(self, text: str) -> list[str]:
        low = text.lower()
        return [t for t in IMPORTANT_TERMS if t in low]

    def _summary_stats(self, changes: list[ClauseChange]) -> str:
        stats = {"added": 0, "removed": 0, "modified": 0}
        for c in changes:
            stats[c.change_type] = stats.get(c.change_type, 0) + 1
        return f"{stats['added']} added · {stats['modified']} modified · {stats['removed']} removed"

    def _compute_hash(self, text: str) -> str:
        # Normalize: strip whitespace, lowercase
        normalized = text.strip().lower()
        return hashlib.sha256(normalized.encode()).hexdigest()
