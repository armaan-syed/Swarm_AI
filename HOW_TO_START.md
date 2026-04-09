# How to Start

Quick setup guide for the Agentic AI base project.

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** (for frontend, when added)
- **Ollama** — local LLM runtime → https://ollama.com
- **Git**
- *(Optional)* **Groq API key** for fallback LLM → https://console.groq.com/keys
- *(Optional)* **Supabase project** for auth + memory → https://supabase.com

---

## 1. Clone & enter the repo

```bash
git clone https://github.com/armaan-syed/SunHacks.git
cd SunHacks
```

---

## 2. Install Ollama and pull models

After installing Ollama from the link above:

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

Make sure Ollama is running (it usually starts automatically; otherwise run `ollama serve`).

---

## 3. Backend setup

```bash
cd backend

# Create + activate a virtual environment
python -m venv .venv

# Windows (Git Bash)
source .venv/Scripts/activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your env file
cp .env.example .env
```

Open `.env` and fill in:
- `OLLAMA_BASE_URL` — leave default unless Ollama runs elsewhere
- `OLLAMA_MODEL` — default `llama3.2`
- `GROQ_API_KEY` — *(optional)* enables fallback if Ollama fails
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — *(optional)* enables auth + long-term memory

### Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

API is now live at:
- `http://localhost:8000/api/v1/health` — health check
- `http://localhost:8000/docs` — interactive Swagger UI

### Test the agent

```bash
curl -X POST http://localhost:8000/api/v1/agents/run \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the capital of France?"}'
```

---

## 4. Frontend setup *(coming soon)*

Will be added once `package.json` is in place.

```bash
cd frontend
npm install
npm run dev
```

Frontend will run at `http://localhost:3000`.

---

## 5. Supabase setup *(optional)*

If you want long-term memory + auth:

1. Create a project at https://supabase.com
2. Enable the `pgvector` extension (Database → Extensions)
3. Run this SQL in the SQL editor:

```sql
create extension if not exists vector;

create table memories (
    id uuid primary key default gen_random_uuid(),
    user_id text,
    content text,
    embedding vector(768),
    created_at timestamptz default now()
);

create or replace function match_memories(
    query_embedding vector(768),
    match_count int,
    user_filter text
) returns table (id uuid, content text, similarity float)
language sql stable as $$
    select id, content, 1 - (embedding <=> query_embedding) as similarity
    from memories
    where (user_filter is null or user_id = user_filter)
    order by embedding <=> query_embedding
    limit match_count;
$$;
```

4. Copy your project URL + keys into `backend/.env`.

---

## Project structure

```
SunHacks/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py            # env settings
│   │   ├── api/routes/          # /health, /auth, /agents
│   │   ├── agents/              # planner, executor, validator, orchestrator
│   │   ├── tools/               # plug-and-play tool registry
│   │   ├── memory/              # short-term + long-term (pgvector)
│   │   ├── db/                  # supabase client
│   │   └── models/              # pydantic schemas
│   ├── requirements.txt
│   └── .env.example
├── frontend/                    # (Next.js, coming soon)
├── .gitignore
└── HOW_TO_START.md
```

---

## Troubleshooting

**Ollama connection refused** → make sure `ollama serve` is running, or that the desktop app is open.

**Model not found** → `ollama pull llama3.2` (or whatever `OLLAMA_MODEL` is set to).

**Slow first response** → Ollama loads the model into memory on first call; subsequent calls are fast.

**Want a different LLM?** → Change `OLLAMA_MODEL` in `.env`, or set `GROQ_API_KEY` to use Groq as fallback.
