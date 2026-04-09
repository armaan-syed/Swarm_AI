"""ChromaDB vector store wrapper.

Single entry point for all embedding + semantic-search operations across
the backend. Wraps a `chromadb.PersistentClient` and reuses the project's
`OllamaEmbeddings` so the same model is used everywhere.

Two collections are seeded on first use:
    - company_documents      (uploaded company policies / SOPs / FAQs)
    - regulatory_circulars   (RBI / SEBI / MCA circulars for retrieval)

Metadata convention:
    {
        "company_id":  str | None,
        "source":      str | None,   # RBI | SEBI | MCA | "company"
        "url":         str | None,
        "title":       str | None,
        "version":     int | None,
        "doc_hash":    str | None,
        "ingested_at": str (iso8601),
    }

Chroma's `where` filter is used to scope queries by company / source.
"""
from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from typing import Any

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("vector_store")


class _OllamaChromaEmbeddingFunction:
    """Adapter that exposes `OllamaEmbeddings` with the signature ChromaDB
    expects (`__call__(input: list[str]) -> list[list[float]]`).

    Implemented lazily so importing this module does not require Ollama to
    be reachable.
    """

    def __init__(self, base_url: str, model: str) -> None:
        self._base_url = base_url
        self._model = model
        self._client = None  # lazy

    def _ensure_client(self):
        if self._client is None:
            from langchain_ollama import OllamaEmbeddings

            self._client = OllamaEmbeddings(
                base_url=self._base_url,
                model=self._model,
            )
        return self._client

    # ChromaDB validates this exact signature.
    def __call__(self, input: list[str]) -> list[list[float]]:  # noqa: A002
        client = self._ensure_client()
        return client.embed_documents(list(input))

    # Chroma 0.5+ also calls these introspection helpers.
    def name(self) -> str:
        return f"ollama:{self._model}"


class VectorStore:
    """Thin wrapper around a persistent Chroma client.

    All public methods are best-effort: if Chroma fails to initialise
    (e.g. dependency missing on a fresh checkout) the methods log and
    return empty results instead of raising, so the rest of the pipeline
    keeps running.
    """

    def __init__(self) -> None:
        self._client = None
        self._collections: dict[str, Any] = {}
        self._embedding_fn = _OllamaChromaEmbeddingFunction(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL,
        )

    # ------------------------------------------------------------------
    # init helpers
    # ------------------------------------------------------------------
    def _ensure_client(self):
        if self._client is not None:
            return self._client
        try:
            import chromadb

            self._client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIR,
            )
            logger.info(
                "Chroma client ready (path=%s)", settings.CHROMA_PERSIST_DIR
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to initialise Chroma client: %s", exc)
            self._client = None
        return self._client

    def _collection(self, name: str):
        if name in self._collections:
            return self._collections[name]
        client = self._ensure_client()
        if client is None:
            return None
        try:
            coll = client.get_or_create_collection(
                name=name,
                embedding_function=self._embedding_fn,
                metadata={"hnsw:space": "cosine"},
            )
            self._collections[name] = coll
            return coll
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to get/create collection %s: %s", name, exc)
            return None

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------
    def upsert(
        self,
        collection: str,
        ids: list[str],
        texts: list[str],
        metadatas: list[dict[str, Any]] | None = None,
    ) -> bool:
        """Insert or update documents. Returns True on success."""
        coll = self._collection(collection)
        if coll is None or not ids:
            return False

        now = datetime.utcnow().isoformat()
        metas = metadatas or [{} for _ in ids]
        # Chroma metadata cannot contain `None` values — strip them.
        cleaned: list[dict[str, Any]] = []
        for m in metas:
            m = dict(m)
            m.setdefault("ingested_at", now)
            cleaned.append({k: v for k, v in m.items() if v is not None})

        try:
            coll.upsert(ids=ids, documents=texts, metadatas=cleaned)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Chroma upsert failed (%s): %s", collection, exc)
            return False

    def query(
        self,
        collection: str,
        text: str,
        n_results: int = 3,
        where: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Semantic search. Returns a list of {id, document, metadata, distance}."""
        coll = self._collection(collection)
        if coll is None or not text:
            return []
        try:
            res = coll.query(
                query_texts=[text],
                n_results=n_results,
                where=where or None,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Chroma query failed (%s): %s", collection, exc)
            return []

        # Chroma returns parallel lists wrapped in an outer list per query.
        ids = (res.get("ids") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]

        out: list[dict[str, Any]] = []
        for i, doc_id in enumerate(ids):
            out.append(
                {
                    "id": doc_id,
                    "document": docs[i] if i < len(docs) else "",
                    "metadata": metas[i] if i < len(metas) else {},
                    "distance": dists[i] if i < len(dists) else None,
                }
            )
        return out

    def delete(self, collection: str, ids: list[str]) -> bool:
        coll = self._collection(collection)
        if coll is None or not ids:
            return False
        try:
            coll.delete(ids=ids)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Chroma delete failed (%s): %s", collection, exc)
            return False

    def count(self, collection: str) -> int:
        coll = self._collection(collection)
        if coll is None:
            return 0
        try:
            return coll.count()
        except Exception:
            return 0

    def exists(self, collection: str, doc_id: str) -> bool:
        """Cheap existence check used for hash-based dedup."""
        coll = self._collection(collection)
        if coll is None:
            return False
        try:
            res = coll.get(ids=[doc_id], include=[])
            return bool(res.get("ids"))
        except Exception:
            return False


@lru_cache
def get_vector_store() -> VectorStore:
    """Module-wide singleton."""
    return VectorStore()
