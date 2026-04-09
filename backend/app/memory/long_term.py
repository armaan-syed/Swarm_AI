"""Long-term memory backed by Supabase + pgvector.

Expects a table like:
    create table memories (
        id uuid primary key default gen_random_uuid(),
        user_id text,
        content text,
        embedding vector(1536),
        created_at timestamptz default now()
    );

And an RPC `match_memories(query_embedding vector, match_count int, user_filter text)`
returning the top matches.
"""
from typing import Any

from langchain_openai import OpenAIEmbeddings

from app.config import settings
from app.db.supabase_client import get_supabase


class LongTermMemory:
    def __init__(self) -> None:
        self.embeddings = (
            OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)
            if settings.OPENAI_API_KEY
            else None
        )

    async def store(self, query: str, answer: str, user_id: str | None = None) -> None:
        client = get_supabase()
        if not client or not self.embeddings:
            return
        text = f"Q: {query}\nA: {answer}"
        vector = self.embeddings.embed_query(text)
        client.table("memories").insert(
            {"user_id": user_id, "content": text, "embedding": vector}
        ).execute()

    async def search(
        self, query: str, user_id: str | None = None, top_k: int = 5
    ) -> list[dict[str, Any]]:
        client = get_supabase()
        if not client or not self.embeddings:
            return []
        vector = self.embeddings.embed_query(query)
        result = client.rpc(
            "match_memories",
            {"query_embedding": vector, "match_count": top_k, "user_filter": user_id},
        ).execute()
        return getattr(result, "data", []) or []
