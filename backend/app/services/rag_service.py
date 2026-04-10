"""RAG (Retrieval-Augmented Generation) service.

Provides text chunking, embedding generation, vector storage, and retrieval
for grounding agent reasoning in real documents.
"""
from __future__ import annotations

import hashlib
import re
from typing import Any, Literal

from app.config import settings
from app.services.vector_store import get_vector_store
from app.utils.logger import get_logger

logger = get_logger("rag_service")

# Chunking configuration
CHUNK_SIZE = 4000  # characters (~1000 tokens)
CHUNK_OVERLAP = 200  # characters for overlap

SourceType = Literal["RBI", "SEBI", "MCA", "COMPANY"]


class RAGService:
    """RAG service for document processing and retrieval."""

    def __init__(self) -> None:
        self.vector_store = get_vector_store()

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for chunking."""
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())

        # Remove page headers/footers (common in PDFs)
        text = re.sub(r'Page \d+ of \d+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\d{1,2}/\d{1,2}/\d{4}', '', text)  # dates
        text = re.sub(r'©.*?\d{4}', '', text)  # copyright notices

        return text.strip()

    def _chunk_text(self, text: str) -> list[str]:
        """Split text into overlapping chunks."""
        if len(text) <= CHUNK_SIZE:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + CHUNK_SIZE

            # If we're not at the end, try to find a good break point
            if end < len(text):
                # Look for sentence endings within the last 200 chars
                last_period = text.rfind('.', end - 200, end)
                last_newline = text.rfind('\n', end - 200, end)

                # Use the latest good break point
                break_point = max(last_period, last_newline)
                if break_point > start + CHUNK_SIZE // 2:  # Don't break too early
                    end = break_point + 1

            chunk = text[start:end].strip()
            if chunk:  # Only add non-empty chunks
                chunks.append(chunk)

            # Move start position with overlap
            start = max(start + 1, end - CHUNK_OVERLAP)

        return chunks

    def _generate_chunk_id(self, document_id: str, chunk_index: int) -> str:
        """Generate unique chunk ID."""
        content = f"{document_id}:{chunk_index}"
        return hashlib.md5(content.encode()).hexdigest()

    async def embed_and_store(
        self,
        document_id: str,
        content: str,
        source: SourceType,
        metadata: dict[str, Any] | None = None,
        collection: str = "regulatory_circulars"
    ) -> bool:
        """Process document: chunk, embed, and store in vector database."""
        try:
            # Clean and chunk the text
            cleaned_text = self._clean_text(content)
            chunks = self._chunk_text(cleaned_text)

            if not chunks:
                logger.warning("No chunks generated for document %s", document_id)
                return False

            # Prepare data for vector store
            ids = []
            texts = []
            metadatas = []

            for i, chunk in enumerate(chunks):
                chunk_id = self._generate_chunk_id(document_id, i)

                chunk_metadata = {
                    "document_id": document_id,
                    "source": source,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "chunk_hash": hashlib.md5(chunk.encode()).hexdigest(),
                    **(metadata or {})
                }

                ids.append(chunk_id)
                texts.append(chunk)
                metadatas.append(chunk_metadata)

            # Store in vector database
            success = self.vector_store.upsert(
                collection=collection,
                ids=ids,
                texts=texts,
                metadatas=metadatas
            )

            if success:
                logger.info(
                    "Stored %d chunks for document %s in collection %s",
                    len(chunks), document_id, collection
                )
            else:
                logger.error("Failed to store chunks for document %s", document_id)

            return success

        except Exception as exc:
            logger.exception("Error in embed_and_store for document %s: %s", document_id, exc)
            return False

    async def retrieve_context(
        self,
        query: str,
        collection: str = "regulatory_circulars",
        top_k: int = 5,
        source_filter: list[SourceType] | None = None,
        company_id: str | None = None
    ) -> list[dict[str, Any]]:
        """Retrieve relevant context chunks for a query."""
        try:
            # Build where clause for filtering
            where_clause = {}

            if source_filter:
                # ChromaDB supports $in operator for arrays
                where_clause["source"] = {"$in": source_filter}

            if company_id:
                where_clause["company_id"] = company_id

            # Query the vector store
            results = self.vector_store.query(
                collection=collection,
                text=query,
                n_results=top_k,
                where=where_clause if where_clause else None
            )

            # Format results
            context_chunks = []
            for result in results:
                context_chunks.append({
                    "chunk": result.get("document", ""),
                    "source": result.get("metadata", {}).get("source", "unknown"),
                    "document_id": result.get("metadata", {}).get("document_id", ""),
                    "score": result.get("distance", 0),
                    "metadata": result.get("metadata", {})
                })

            logger.info(
                "Retrieved %d context chunks for query: %s",
                len(context_chunks), query[:50] + "..." if len(query) > 50 else query
            )

            return context_chunks

        except Exception as exc:
            logger.exception("Error in retrieve_context: %s", exc)
            return []

    async def retrieve_mixed_context(
        self,
        query: str,
        top_k_regulatory: int = 3,
        top_k_company: int = 2,
        company_id: str | None = None,
        source_filter: list[SourceType] | None = None
    ) -> dict[str, list[dict[str, Any]]]:
        """Retrieve mixed context from both regulatory and company collections."""
        regulatory_context = await self.retrieve_context(
            query=query,
            collection=settings.CHROMA_CIRCULAR_COLLECTION,
            top_k=top_k_regulatory,
            source_filter=source_filter
        )

        company_context = []
        if company_id:
            company_context = await self.retrieve_context(
                query=query,
                collection=settings.CHROMA_COMPANY_COLLECTION,
                top_k=top_k_company,
                company_id=company_id
            )

        return {
            "regulatory": regulatory_context,
            "company": company_context
        }


# Global RAG service instance
_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    """Get the global RAG service instance."""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service