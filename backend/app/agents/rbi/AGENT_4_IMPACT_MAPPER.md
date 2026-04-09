# Agent 4 — Impact Mapper

## Purpose
Translates raw legal/regulatory changes into **business impact**: which departments are affected, how severe the change is, and how it relates to the company's existing policies.

## Responsibilities
- Map changed clauses → business departments / processes
- Retrieve similar past cases via pgvector semantic search
- Estimate severity (LOW / MEDIUM / HIGH) per clause
- Roll up to an overall severity for the document
- Generate plain-English impact statements

## Inputs
A `ChangeReport` from Agent 3.

## Outputs
```python
ImpactMap(
    items: list[ClauseImpact],
    overall_severity: 'LOW' | 'MEDIUM' | 'HIGH',
)

ClauseImpact(
    clause_number: str,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    departments: list[str],
    impact_statement: str,
    similar_docs: list[dict],   # top-k matches from vector search
)
```

## Tools / Libraries
- `OllamaEmbeddings` (`nomic-embed-text`) — 768-dim embeddings
- `pgvector` (Supabase) — semantic search over `company_documents`
- `LangChain` / `Ollama` — severity classification + impact statement generation
- Custom keyword → department mapping

## Severity Roll-Up
```
HIGH if any clause is HIGH
else MEDIUM if any clause is MEDIUM
else LOW
```

## Department Hint Map
```python
{
    "kyc":        ["compliance", "onboarding"],
    "aml":        ["compliance", "risk"],
    "capital":    ["treasury", "finance"],
    "lending":    ["credit", "risk"],
    "deposit":    ["retail-banking"],
    "report":     ["compliance", "reporting"],
    "audit":      ["audit", "compliance"],
    "disclosure": ["legal", "compliance"],
    "data":       ["it", "data-protection"],
    "customer":   ["retail-banking", "service"],
}
```
LLM may override these based on actual clause content.

## LLM Prompt
The system prompt asks the LLM to return ONLY JSON:
```json
{
  "severity": "HIGH|MEDIUM|LOW",
  "departments": ["compliance", "risk"],
  "impact": "Plain English impact statement, max 2 sentences."
}
```

## Vector Search
Calls Supabase RPC `match_company_documents(query_embedding, match_count)` to find policies / contracts related to the changed clause.

## Required Supabase Schema
```sql
create table company_documents (
  id uuid primary key default gen_random_uuid(),
  name text,
  doc_type text,
  content text,
  embedding vector(768)
);

create function match_company_documents(
  query_embedding vector(768),
  match_count int
) returns table (id uuid, name text, content text, similarity float)
language sql stable as $$
  select id, name, content, 1 - (embedding <=> query_embedding) as similarity
  from company_documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

## Next Agent
Passes `ImpactMap` (along with the original `ChangeReport`) to **Agent 5 (Report Generator)**.
