"""Ingestion pipeline service.

Single service-layer entry point for both flows:
    1. Regulatory ingestion (RBI orchestrator pipeline)
    2. Company document ingestion (PDF/HTML/text -> chunks -> ChromaDB)

All routes and the scheduler should go through this service rather than
calling the RBI orchestrator directly.
"""
from __future__ import annotations

import hashlib
import uuid
from typing import Any

from app.agents.rbi.orchestrator import PipelineRun, RBIOrchestrator
from app.config import settings
from app.db.supabase_client import get_supabase
from app.services.vector_store import get_vector_store
from app.utils.logger import get_logger

logger = get_logger("ingestion_pipeline")

# Rough chunk size in characters (~1000 tokens ≈ 4000 chars)
_CHUNK_SIZE = 4000
_CHUNK_OVERLAP = 200


class IngestionPipeline:
    """Unified ingestion entry point."""

    def __init__(self) -> None:
        self.rbi = RBIOrchestrator()
        self.vector_store = get_vector_store()

    # ------------------------------------------------------------------
    # Flow 1: Regulatory (delegates to RBI orchestrator)
    # ------------------------------------------------------------------
    async def run_regulatory(
        self,
        sources: list[str] | None = None,
        max_docs: int = 5,
        company_id: str | None = None,
    ) -> PipelineRun:
        """Run the full regulatory compliance pipeline."""
        logger.info(
            "Starting regulatory pipeline: sources=%s max_docs=%d company_id=%s",
            sources,
            max_docs,
            company_id,
        )
        result = await self.rbi.run(
            sources=sources, max_docs=max_docs, company_id=company_id
        )
        logger.info(
            "Regulatory pipeline done: found=%d processed=%d errors=%d",
            len(result.found_refs),
            len(result.reports),
            len(result.errors),
        )
        return result

    # ------------------------------------------------------------------
    # Flow 2: Company document upload
    # ------------------------------------------------------------------
    async def ingest_company_document(
        self,
        company_id: str,
        filename: str,
        raw_bytes: bytes,
    ) -> dict[str, Any]:
        """Extract text from a company document, chunk it, embed, and
        store in ChromaDB's company_documents collection using RAG service.

        Returns a summary dict with chunk count and doc_hash.
        """
        logger.info(
            "Ingesting company document: company=%s file=%s (%d bytes)",
            company_id,
            filename,
            len(raw_bytes),
        )

        # 1. Extract text using the same logic as DocumentExtractorAgent
        text = self._extract_text(raw_bytes, filename)
        if not text.strip():
            return {
                "company_id": company_id,
                "filename": filename,
                "chunks": 0,
                "doc_hash": "",
                "status": "empty_document",
            }

        # 2. Compute doc hash for dedup
        doc_hash = hashlib.sha256(text.strip().lower().encode()).hexdigest()

        # 3. Check if already ingested (by hash)
        existing_id = f"{company_id}:{doc_hash}:0"
        if self.vector_store.exists(settings.CHROMA_COMPANY_COLLECTION, existing_id):
            logger.info("Document already ingested (hash=%s), skipping", doc_hash[:12])
            return {
                "company_id": company_id,
                "filename": filename,
                "chunks": 0,
                "doc_hash": doc_hash,
                "status": "duplicate",
            }

        # 4. Use RAG service to chunk and embed
        from app.services.rag_service import get_rag_service

        rag_service = get_rag_service()
        document_id = f"{company_id}:{doc_hash}"

        success = await rag_service.embed_and_store(
            document_id=document_id,
            content=text,
            source="COMPANY",
            metadata={
                "company_id": company_id,
                "title": filename,
                "doc_hash": doc_hash,
                "filename": filename,
            },
            collection=settings.CHROMA_COMPANY_COLLECTION
        )

        if not success:
            return {
                "company_id": company_id,
                "filename": filename,
                "chunks": 0,
                "doc_hash": doc_hash,
                "status": "embedding_failed",
            }

        # Estimate chunk count (rough approximation)
        estimated_chunks = max(1, len(text) // (_CHUNK_SIZE - _CHUNK_OVERLAP))

        # 5. Store metadata in Supabase (MANDATORY for persistence tracking)
        client = get_supabase()
        if not client:
            logger.error("Supabase client missing during document ingestion!")
            return {
                "company_id": company_id,
                "filename": filename,
                "chunks": estimated_chunks,
                "doc_hash": doc_hash,
                "status": "db_unavailable",
            }
            
        try:
            client.table("company_documents").insert(
                {
                    "company_id": company_id,
                    "filename": filename,
                    "doc_hash": doc_hash,
                }
            ).execute()
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to persist doc metadata to Supabase: %s", exc)
            return {
                "company_id": company_id,
                "filename": filename,
                "chunks": estimated_chunks,
                "doc_hash": doc_hash,
                "status": "db_insert_failed",
                "error": str(exc),
            }

        status = "ingested" if success else "chroma_failed"
        logger.info(
            "Document ingestion %s: %d chunks, hash=%s",
            status,
            estimated_chunks,
            doc_hash[:12],
        )

        return {
            "company_id": company_id,
            "filename": filename,
            "chunks": estimated_chunks,
            "doc_hash": doc_hash,
            "status": status,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _extract_text(self, data: bytes, filename: str) -> str:
        """Extract text from PDF or HTML bytes. Reuses the same logic as
        DocumentExtractorAgent but without needing an agent instance."""
        if filename.lower().endswith(".pdf") or data[:4] == b"%PDF":
            try:
                import fitz  # PyMuPDF

                pages = []
                with fitz.open(stream=data, filetype="pdf") as doc:
                    for page in doc:
                        pages.append(page.get_text("text"))
                return "\n".join(pages)
            except Exception:
                try:
                    import pdfplumber
                    from io import BytesIO

                    with pdfplumber.open(BytesIO(data)) as pdf:
                        return "\n".join((p.extract_text() or "") for p in pdf.pages)
                except Exception:
                    return ""

        # HTML / plain text fallback
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(data, "lxml")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()
            return soup.get_text("\n", strip=True)
        except Exception:
            # Plain text
            return data.decode("utf-8", errors="replace")

    def _chunk_text(self, text: str) -> list[str]:
        """Split text into roughly _CHUNK_SIZE character segments with overlap."""
        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = start + _CHUNK_SIZE
            chunk = text[start:end]
            if chunk.strip():
                chunks.append(chunk.strip())
            start = end - _CHUNK_OVERLAP
        return chunks or [text.strip()]
