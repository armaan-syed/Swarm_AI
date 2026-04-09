# Agent 3 — Change Detector

## Purpose
Compares the new version of a document with the previous version, clause-by-clause, and reports exactly what was added, removed, or modified.

## Responsibilities
- Clause-by-clause diff (not raw text diff)
- Detect added / removed / modified clauses
- Compute similarity scores for fuzzy matches
- Flag important regulatory terms (`shall`, `must`, `prohibited`, etc.)
- Identify effective-date changes

## Inputs
| Field | Type | Description |
|---|---|---|
| `new_doc` | `ExtractedDoc` | The new circular |
| `old_doc` | `ExtractedDoc \| None` | Previous version (None on first ingest) |

## Outputs
```python
ChangeReport(
    new_doc: ExtractedDoc,
    old_doc: ExtractedDoc | None,
    changes: list[ClauseChange],
    summary: str,    # e.g. "3 added · 1 modified · 0 removed"
)

ClauseChange(
    change_type: 'added' | 'removed' | 'modified' | 'unchanged',
    number: str,
    old_text: str | None,
    new_text: str | None,
    diff: str,
    important_terms: list[str],
    similarity: float,
)
```

## Tools / Libraries
- `difflib.unified_diff` — line-level diff for modified clauses
- `rapidfuzz` — fuzzy matching when clause numbers shift between versions

## Algorithm
1. **Build clause maps** — `{clause_number: Clause}` for both versions
2. **Walk new map**:
   - If clause exists in old → check if text changed → `modified` or `unchanged`
   - If clause doesn't exist in old → fuzzy match by heading (≥ 85% similarity) → `modified` if matched, `added` otherwise
3. **Walk old map** for clauses missing in new → `removed`
4. **Tag important terms** present in each changed clause

## Important Terms Tracked
```
shall, must, applicable to, exempted, with effect from,
mandatory, prohibited, penalty, compliance, notwithstanding
```

## First-Ingest Behavior
When `old_doc is None`, every clause is marked as `added` so the downstream agents still produce a useful baseline report.

## Next Agent
Passes `ChangeReport` to **Agent 4 (Impact Mapper)**.
