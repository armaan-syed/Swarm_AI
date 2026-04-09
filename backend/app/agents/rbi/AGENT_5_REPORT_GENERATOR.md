# Agent 5 — Report Generator + Validator

## Purpose
Produces the final, source-grounded compliance impact report and verifies that every claim is traceable to a real clause — preventing hallucination.

## Responsibilities
- Generate executive summary in plain English
- List affected teams with priorities
- Produce actionable compliance checklist
- Cite exact clause numbers for every claim
- Validate grounding (all citations must map to real clauses)
- Produce Markdown output ready for the dashboard

## Inputs
| Field | Type | Description |
|---|---|---|
| `change_report` | `ChangeReport` | From Agent 3 |
| `impact_map` | `ImpactMap` | From Agent 4 |

## Outputs
```python
ValidatedReport(
    markdown: str,              # Full Markdown report
    citations: list[str],       # Clause numbers cited
    affected_teams: list[str],  # Unique departments
    action_items: list[str],    # Extracted action checklist
    grounded: bool,             # All citations map to real clauses?
    overall_severity: str,      # LOW | MEDIUM | HIGH
    generated_at: str,          # ISO timestamp
    metadata: dict,             # source, title, url, stats
)
```

## Tools / Libraries
- `LangChain` + `Ollama` — report generation
- `re` — citation + action item extraction
- `supabase-py` — persist report to `impact_reports` table

## Report Structure (Markdown)
```markdown
## Executive Summary
1-2 sentences. Overall severity. Key change in plain English. (Clause X.X)

## Affected Teams
- compliance — primary owner
- risk — secondary

## Action Items
- Review Clause 3.2 (must, HIGH)
- Update KYC policy by effective date

## Citations
Clause 3.2, Clause 4.1(a)
```

## Hallucination Validation
1. Extract all `Clause X.X` references from generated markdown
2. Cross-check each against the set of real clause numbers in `new_doc.clauses`
3. If any citation is NOT in the real clause list → `grounded = False`
4. `grounded = False` is flagged visibly in the dashboard

## Prompt Cap
Only the first 25 changed clauses (up to 300 chars each) are sent in the prompt to avoid context overflow. The LLM sees a structured bullet list, not raw text.

## Fallback Behavior
If the LLM is unavailable (Ollama not running, Groq rate-limited):
- Falls back to a pre-templated report with the stats and severity
- `grounded = False` is set so the user knows LLM wasn't used

## Supabase Persistence
```sql
create table impact_reports (
  id uuid primary key default gen_random_uuid(),
  circular_url text references circulars(url),
  summary text,
  severity text,
  markdown text,
  citations text[],
  affected_teams text[],
  action_items text[],
  grounded boolean,
  created_at timestamptz default now()
);
```
