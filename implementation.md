# Backend Completion — Implementation Plan

Status: planning document. Scope is **only the missing pieces** of the
RBI compliance backend. Existing modules (5 RBI agents, generic
planner/executor/validator, FastAPI structure, Supabase client,
APScheduler skeleton) are kept untouched unless explicitly required.

---

## 1. Current State (audit)

### Already implemented and working
- `app/main.py` — FastAPI app + CORS + lifespan that starts/stops the scheduler
- `app/config.py` — Pydantic settings (LLM, Supabase, JWT, scheduler, **Chroma stub already added**)
- `app/db/supabase_client.py` — singleton Supabase client
- `app/services/scheduler.py` — APScheduler `_run_pipeline` job, default interval **10h** (already updated)
- `app/agents/base.py` — Ollama primary + Groq fallback `BaseAgent`
- `app/agents/{planner,executor,validator,orchestrator}.py` — generic 3-agent loop
- `app/agents/rbi/source_monitor.py` — RBI/SEBI/MCA scrapers (httpx bug already fixed)
- `app/agents/rbi/document_extractor.py` — PyMuPDF + pdfplumber + HTML, clause splitter
- `app/agents/rbi/change_detector.py` — clause-level diff (added/modified/removed) + fuzzy match
- `app/agents/rbi/impact_mapper.py` — LLM severity + dept mapping + Supabase RPC similar-doc lookup
- `app/agents/rbi/report_generator.py` — markdown report + grounding self-check
- `app/agents/rbi/orchestrator.py` — wires the 5 agents, persists to Supabase
- `app/api/routes/{health,auth,agents,compliance}.py` — base routes incl. `/compliance/run`, `/circulars`, `/reports`, `/stats`
- `app/models/{schemas,compliance_schemas}.py` — request/response shapes
- `app/memory/{short_term,long_term}.py` — in-memory + pgvector stores for the generic loop
- `app/tools/{registry,example_tool}.py` — pluggable tool layer
- `requirements.txt` — chromadb already pinned

### Already partially staged (config-only, no code yet)
- `chromadb>=0.5.23` in `requirements.txt`
- `CHROMA_PERSIST_DIR`, `CHROMA_COMPANY_COLLECTION`, `CHROMA_CIRCULAR_COLLECTION` in `app/config.py` and `.env.example`
- `MONITOR_INTERVAL_HOURS` default flipped from 6 → 10
- Scheduler docstring updated; unused `asyncio`/`logging` imports removed

### Gaps (the work this doc plans)
1. No ChromaDB client wrapper — `impact_mapper.py` still calls a Supabase RPC (`match_company_documents`) that does not exist in our schema
2. No company-context model, service, or `/company` route — Impact Mapper has no per-tenant data to personalize against
3. `change_detector.py` has clause-level diffing but **no document-level hash** and **no version tracking**, so the same circular can be processed twice
4. The RBI pipeline ends at `report_generator.py`. There is **no final validator stage** — grounding is checked inside the report generator, which mixes concerns
5. No service-layer **ingestion pipeline** — orchestrator is invoked directly from the route. There is no place to ingest **company** documents (only regulatory ones)
6. Missing routes: `/query`, `/company`, `/regulations`. `/reports` exists.
7. Logging is bare (`get_logger`) — agents `print(...)` errors instead of using a logger. No per-run trace useful for the frontend.
8. No `companies` table in Supabase, no `doc_hash`/`version` columns on `circulars`

---

## 2. Phased Plan

Each phase lists: **goal**, **files**, **integration points**, and **risks**.
Phases are ordered so each one only depends on the ones above it.

---

### Phase 1 — ChromaDB Vector Store Layer  ✅ DONE

**Goal:** one place to embed + store + query vectors. Replaces the
non-existent `match_company_documents` Supabase RPC.

**New files**
- `backend/app/services/vector_store.py`

**Shape**
```python
# vector_store.py
class VectorStore:
    def __init__(self) -> None:
        self.client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        self.embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL,
        )

    def _collection(self, name: str): ...
    def upsert(self, collection: str, ids: list[str],
               texts: list[str], metadatas: list[dict]) -> None: ...
    def query(self, collection: str, text: str,
              n_results: int = 3, where: dict | None = None) -> list[dict]: ...
    def delete(self, collection: str, ids: list[str]) -> None: ...

@lru_cache
def get_vector_store() -> VectorStore: ...
```
- Custom Chroma `EmbeddingFunction` that wraps `OllamaEmbeddings.embed_documents` so we keep one embedding model across the codebase.
- Two collections seeded: `company_documents`, `regulatory_circulars` (names already in config).
- Metadata convention: `{company_id, source, url, title, version, doc_hash, ingested_at}`.

**Touched (minimal)** — none yet. Existing modules call this in later phases.

**Risks** — Chroma 0.5+ changed the persistent-client API; pin already in `requirements.txt` is `>=0.5.23`. First run creates the persist dir.

**Implementation notes (actual):**
- `_OllamaChromaEmbeddingFunction` adapts `langchain_ollama.OllamaEmbeddings` to Chroma's `__call__(input)->Embeddings` interface, lazy-imported so module load does not require Ollama to be reachable.
- `VectorStore` class wraps `chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)` with cosine HNSW.
- All public methods (`upsert`, `query`, `delete`, `count`, `exists`) are best-effort: on Chroma init failure they log via `app.utils.logger` and return empty/False instead of raising — keeps the rest of the pipeline alive in dev when Chroma is not yet installed.
- `get_vector_store()` is `@lru_cache`-singleton'd so cold-start cost only happens on first real use.
- AST parse: ✅ clean.

---

### Phase 2 — Company Context (model + service + route)

**Goal:** persist `company_name`, `industry`, `product_description` so the
Impact Mapper and Report Generator can personalize.

**New files**
- `backend/app/models/company_schemas.py`
  - `CompanyCreate`, `CompanyUpdate`, `CompanyOut`, `CompanyContext`
- `backend/app/services/company_service.py`
  - `create_company`, `get_company`, `update_company`, `list_companies`, `delete_company`
  - Uses Supabase `companies` table; falls back to in-memory dict if `get_supabase()` returns `None` (so dev works without Supabase).
- `backend/app/api/routes/company.py`
  - `POST /company` create
  - `GET /company` list
  - `GET /company/{id}` fetch
  - `PATCH /company/{id}` update
  - `DELETE /company/{id}` delete

**Touched**
- `app/main.py` — register the new router under `f"{prefix}/company"`.

**Supabase DDL (documentation only — added to `HOW_TO_START.md`)**
```sql
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  product_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Risks** — none. Falls back gracefully without Supabase.

---

### Phase 3 — Change Detection: hash + version + dedup

**Goal:** stop re-processing identical circulars; track document versions
in Supabase.

**Touched (extend, do not rewrite)**
- `app/agents/rbi/change_detector.py`
  - Add `doc_hash: str` and `version: int` to `ChangeReport`.
  - Add `_compute_hash(text: str) -> str` (sha256 of normalized text).
  - At top of `run()`: compute new hash; if `old_doc and old_hash == new_hash`, return a `ChangeReport` with `change_type="unchanged"` summary and an explicit `is_duplicate=True` flag — orchestrator can skip impact/report stages.

- `app/agents/rbi/orchestrator.py`
  - In `_process_one`: after `ChangeDetectorAgent.run`, short-circuit if `change_report.is_duplicate` — do not call mapper/report/persist.
  - When persisting, pass `doc_hash` and `version` (= prev version + 1) into the `circulars` upsert.

**Supabase DDL (documentation only — `HOW_TO_START.md`)**
```sql
alter table circulars
  add column if not exists doc_hash text,
  add column if not exists version  int default 1;
create index if not exists circulars_doc_hash_idx on circulars(doc_hash);
```

**Risks** — `circulars.upsert(on_conflict="url")` already exists; new columns are nullable so old rows still load.

---

### Phase 4 — RBI Validator Agent (final stage)

**Goal:** dedicated final-stage validator separate from `report_generator.py`.
Confirms grounding, completeness, and emits a single confidence score.

**New file**
- `backend/app/agents/rbi/validator.py`

**Shape**
```python
@dataclass
class ValidationResult:
    is_valid: bool
    confidence: float          # 0..1
    issues: list[str]          # missing sections, ungrounded claims, etc.
    final_report: ValidatedReport

class RBIValidatorAgent(BaseAgent):
    name = "rbi_validator"

    async def run(
        self,
        change_report: ChangeReport,
        impact_map: ImpactMap,
        report: ValidatedReport,
    ) -> ValidationResult:
        # 1. Re-verify every citation maps to a real clause number
        # 2. Check required sections are present (Executive, Affected, Action, Citations)
        # 3. Check at least one action item exists when severity != LOW
        # 4. Aggregate confidence: grounded * sections_ok * severity_consistency
```

**Touched**
- `app/agents/rbi/orchestrator.py`
  - Instantiate `RBIValidatorAgent` in `__init__`.
  - In `_process_one`, add Step 6:
    `validation = await self.validator.run(change_report, impact_map, report)`
  - Include `validation` in the returned dict (`is_valid`, `confidence`, `issues`).
  - Persist `is_valid` + `confidence` into `impact_reports` insert.
- `app/models/compliance_schemas.py`
  - Add `validation: ValidationOut` (`is_valid`, `confidence`, `issues`) to `PipelineResultOut`.

**Why a new agent rather than reusing `app/agents/validator.py`** —
the generic `ValidatorAgent.run(query, executions)` is shaped for the
planner/executor loop and would have to be twisted to fit the RBI
pipeline. Adding `app/agents/rbi/validator.py` keeps both pipelines clean
and matches the convention used by the other 5 RBI agents
(one file per agent under `app/agents/rbi/`). This is **extension, not
recreation** — the rule against duplication targets
re-implementing already-existing RBI agents, of which there is no
validator.

**Risks** — `is_valid=False` should not block report delivery (frontend
needs to surface the warning). Orchestrator returns the report
regardless, with the validation block attached.

---

### Phase 5 — Orchestrator Chaining + Structured I/O + Company Context

**Goal:** clean JSON-shaped handoffs between stages and propagate
company context end-to-end.

**Touched**
- `app/agents/rbi/orchestrator.py`
  - `RBIOrchestrator.run(sources, max_docs, company_id=None)` — fetches `CompanyContext` once via `company_service.get_company(company_id)` and threads it through.
  - `_process_one(ref, company_context)` — passes context to mapper, report generator, validator.
  - Add explicit `to_dict()` step after each agent (already mostly via `dataclasses.asdict`) and use `app/utils/logger` instead of `print`.

- `app/agents/rbi/impact_mapper.py`
  - Constructor accepts `company_context: CompanyContext | None = None`.
  - Replace the broken `match_company_documents` Supabase RPC call with `vector_store.query("company_documents", text, where={"company_id": ctx.id})`.
  - Inject `company_context.industry / product_description` into the LLM system prompt so severity/department guesses are tenant-aware.

- `app/agents/rbi/report_generator.py`
  - Accept `company_context` and prepend a one-line "For: <name>, <industry>" header to the prompt; do not change citation/grounding behavior.

**Risks** — the existing Supabase persistence in `_persist()` is unchanged.

---

### Phase 6 — Ingestion Pipeline Service

**Goal:** a single service-layer entry point for both flows:
1. **Regulatory ingestion** (existing RBI orchestrator)
2. **Company document ingestion** (PDF/HTML/text → embeddings → ChromaDB)

**New files**
- `backend/app/services/ingestion_pipeline.py`

**Shape**
```python
class IngestionPipeline:
    def __init__(self) -> None:
        self.rbi = RBIOrchestrator()
        self.vector_store = get_vector_store()
        self.extractor = DocumentExtractorAgent()  # reuse, do not recreate

    async def run_regulatory(
        self, sources=None, max_docs=5, company_id=None
    ) -> PipelineRun:
        return await self.rbi.run(sources, max_docs, company_id)

    async def ingest_company_document(
        self, company_id: str, filename: str, raw_bytes: bytes
    ) -> dict:
        # 1. Extract text via existing DocumentExtractorAgent helpers
        # 2. Chunk into ~1000-token segments
        # 3. Compute sha256 → doc_hash; skip if already in collection (where filter)
        # 4. vector_store.upsert(...)
        # 5. Optional: store row in supabase company_documents table
```

**Touched**
- `app/api/routes/compliance.py` — `POST /compliance/documents/upload` (currently absent) routes through `IngestionPipeline.ingest_company_document`.
- `app/services/scheduler.py` — `_run_pipeline` switches from instantiating `RBIOrchestrator()` to calling `IngestionPipeline().run_regulatory()` so the scheduled job goes through the same entry point as manual runs.

**Risks** — none. Pure composition of existing pieces.

---

### Phase 7 — REST API: /query, /company, /regulations

**Goal:** flesh out the public API surface required by the spec.

**Existing**
- `/api/v1/compliance/run` (orchestrator trigger)
- `/api/v1/compliance/reports` (already covers `/reports`)
- `/api/v1/compliance/circulars`
- `/api/v1/compliance/stats`

**New files**
- `backend/app/api/routes/query.py` — `POST /query` proxies to the generic `Orchestrator` (planner/executor/validator) with the user's natural-language question. Reuses existing `app/agents/orchestrator.py`. No agent recreation.
- `backend/app/api/routes/regulations.py` — `GET /regulations` lists known circulars (alias for `compliance/circulars` shaped for the regulations dashboard); `GET /regulations/{id}` fetches one with full clause JSON.
- (Phase 2 already covered `/company`.)

**Touched**
- `app/main.py` — register `query`, `regulations`, `company` routers under `f"{prefix}/query"`, `f"{prefix}/regulations"`, `f"{prefix}/company"`.

**Schemas**
- `app/models/schemas.py` — add `QueryRequest{ query, company_id?, context? }`, `QueryResponse{ answer, steps, company_id }`. Keep using existing `AgentResponse` shape internally.

**Risks** — none. New routes only.

---

### Phase 8 — Logging Extensions

**Goal:** structured logs for agent runs, scheduler jobs, errors;
optional in-memory ring buffer for the frontend.

**Touched**
- `app/utils/logger.py`
  - Add `get_agent_logger(name: str)` and `get_scheduler_logger()` thin wrappers over `get_logger` so naming is consistent.
  - Add an in-process `RunLogStore` (capped `deque[dict]`, e.g. 200 entries) with `record(event: dict)` and `recent(limit) -> list[dict]`.

- All RBI agents — replace the few `print(f"[…] failed: {exc}")` lines (in `source_monitor.py`, `orchestrator.py`) with `logger.exception(...)`. This is the only edit to those files outside Phase 3/4/5.

**New files**
- `backend/app/api/routes/logs.py` (optional) — `GET /logs/recent` returns the buffer for the frontend's "Activity" panel.

**Risks** — none.

---

## 3. File Manifest

### New files (create)
| Path | Phase |
| --- | --- |
| `app/services/vector_store.py` | 1 |
| `app/services/company_service.py` | 2 |
| `app/services/ingestion_pipeline.py` | 6 |
| `app/models/company_schemas.py` | 2 |
| `app/api/routes/company.py` | 2 |
| `app/api/routes/query.py` | 7 |
| `app/api/routes/regulations.py` | 7 |
| `app/api/routes/logs.py` (optional) | 8 |
| `app/agents/rbi/validator.py` | 4 |

### Modified files (extend, minimal-touch)
| Path | Phase | What changes |
| --- | --- | --- |
| `app/agents/rbi/change_detector.py` | 3 | hash, version, `is_duplicate` flag |
| `app/agents/rbi/impact_mapper.py` | 5 | ChromaDB query + company context |
| `app/agents/rbi/report_generator.py` | 5 | company context in prompt |
| `app/agents/rbi/orchestrator.py` | 3,4,5 | dedup short-circuit, validator step, company context, logger |
| `app/agents/rbi/source_monitor.py` | 8 | swap `print` for `logger.exception` |
| `app/services/scheduler.py` | 6 | call `IngestionPipeline().run_regulatory()` |
| `app/utils/logger.py` | 8 | helpers + RunLogStore |
| `app/api/routes/compliance.py` | 6 | add `POST /documents/upload` calling `IngestionPipeline` |
| `app/models/compliance_schemas.py` | 4 | `ValidationOut`, optional `validation` on `PipelineResultOut` |
| `app/main.py` | 2,7 | register new routers |
| `HOW_TO_START.md` | 2,3 | document new SQL DDL |

### Already partially staged (no further action needed)
- `requirements.txt` — chromadb pin
- `app/config.py` + `.env.example` — Chroma vars + 10h scheduler default
- `app/services/scheduler.py` — docstring + import cleanup

---

## 4. Database / Schema Changes (documentation only)

Added to `HOW_TO_START.md`:

```sql
-- Phase 2
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  product_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Phase 3
alter table circulars
  add column if not exists doc_hash text,
  add column if not exists version  int default 1;
create index if not exists circulars_doc_hash_idx on circulars(doc_hash);

-- Phase 4
alter table impact_reports
  add column if not exists is_valid    boolean default true,
  add column if not exists confidence  numeric default 1.0,
  add column if not exists validation_issues jsonb default '[]'::jsonb;

-- Phase 6
create table if not exists company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  filename text,
  doc_hash text,
  ingested_at timestamptz default now()
);
```

ChromaDB persists to `./chroma_store` (gitignored).

---

## 5. Risk / Breaking-Change Analysis

| Area | Risk | Mitigation |
| --- | --- | --- |
| Existing `/compliance/run` callers | New optional `company_id` defaults to `None` → request shape unchanged | Add as optional field on `RunPipelineRequest` |
| `PipelineResultOut.validation` | New required field would break old responses | Mark `validation: ValidationOut \| None = None` |
| Supabase missing in dev | Phases 2/3/4 store-side changes assume tables exist | All `get_supabase()` paths already guard for `None`; new services do the same |
| ChromaDB first-run cost | Embedding model load on cold start | Lazy-init `VectorStore` via `lru_cache` so it only loads on first query |
| Replacing `match_company_documents` RPC | Currently fails silently in `impact_mapper._find_similar` | Replacement is strictly an improvement |
| Validator marking grounded reports invalid | Could hide real reports from the dashboard | Orchestrator returns reports regardless of `is_valid`; frontend shows the issues list |

**No file is recreated.** Every modified file is an additive extension.

---

## 6. Verification Plan

After each phase:

1. **AST parse** all changed Python files (already used in the prior audit).
2. `python -c "from app.main import app; print(app.routes)"` — confirm imports resolve, new routes registered.
3. Hit each new endpoint with `curl` against a local uvicorn:
   - `POST /api/v1/company` create
   - `POST /api/v1/compliance/documents/upload` (multipart PDF)
   - `POST /api/v1/query`
   - `GET /api/v1/regulations`
   - `POST /api/v1/compliance/run` with `company_id` to validate context propagation end-to-end.
4. Trigger the scheduler manually (`get_scheduler().get_job("rbi_monitor").func()`) to confirm the new ingestion pipeline path works under the same entrypoint.
5. Query Chroma directly: `vector_store.query("company_documents", "kyc onboarding", n_results=3)` to confirm embeddings round-trip.

---

## 7. Out of Scope (deliberately not in this plan)

- Frontend changes (separate Next.js app under `frontend/`).
- Auth hardening beyond the existing Supabase JWT verification.
- Multi-tenant row-level security in Supabase.
- Production deployment / Dockerization.
- Replacing `print` statements outside `app/agents/rbi/*` and `services/*`.
- Migrating long-term memory (`app/memory/long_term.py`) from Supabase pgvector to Chroma — both can coexist; the generic agent loop keeps using pgvector, the RBI pipeline uses Chroma.

---

## 8. Execution Order Summary

1. Phase 1 — `vector_store.py`
2. Phase 2 — company model/service/route + `main.py` wiring
3. Phase 3 — change detector hash/version + orchestrator short-circuit
4. Phase 4 — RBI validator + orchestrator step 6
5. Phase 5 — impact mapper + report generator + orchestrator company context
6. Phase 6 — ingestion pipeline service + scheduler rewire + upload route
7. Phase 7 — `/query`, `/regulations` routes
8. Phase 8 — logger helpers + replace `print`s

Each phase ends with an AST smoke test and a manual `curl` of any new
endpoint it exposes.
