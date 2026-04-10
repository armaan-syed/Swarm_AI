"""RAG health check endpoint"""
from fastapi import APIRouter, HTTPException
from app.services.vector_store import get_vector_store
from app.services.rag_service import get_rag_service
from app.utils.logger import get_logger

logger = get_logger("rag_health")
router = APIRouter()


@router.get("/health")
async def rag_health() -> dict:
    """Check RAG system health."""
    status = {
        "chroma": False,
        "ollama": False,
        "rag_service": False,
        "errors": []
    }

    # Check ChromaDB
    try:
        vs = get_vector_store()
        if vs._ensure_client():
            status["chroma"] = True
            logger.info("✓ ChromaDB healthy")
        else:
            status["errors"].append("ChromaDB client initialization failed")
    except Exception as e:
        status["errors"].append(f"ChromaDB error: {str(e)}")

    # Check Ollama
    try:
        from langchain_ollama import OllamaEmbeddings
        from app.config import settings
        embedder = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL
        )
        result = embedder.embed_query("test")
        if result and len(result) > 0:
            status["ollama"] = True
            logger.info(f"✓ Ollama healthy (embedding dim: {len(result)})")
        else:
            status["errors"].append("Ollama returned empty embedding")
    except Exception as e:
        status["errors"].append(f"Ollama error: {str(e)}")

    # Check RAG Service
    try:
        rag = get_rag_service()
        if rag is not None:
            status["rag_service"] = True
            logger.info("✓ RAG service initialized")
        else:
            status["errors"].append("RAG service initialization failed")
    except Exception as e:
        status["errors"].append(f"RAG service error: {str(e)}")

    # Determine overall status
    overall_healthy = status["chroma"] and status["ollama"] and status["rag_service"]
    
    if overall_healthy:
        return {
            "status": "healthy",
            "components": status,
            "message": "RAG system is fully operational"
        }
    else:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "components": status,
                "errors": status["errors"]
            }
        )


@router.post("/test-embedding")
async def test_embedding(text: str = "test query") -> dict:
    """Test embedding generation."""
    try:
        from langchain_ollama import OllamaEmbeddings
        from app.config import settings
        
        embedder = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL
        )
        result = embedder.embed_query(text)
        
        return {
            "success": True,
            "text": text,
            "embedding_dimension": len(result),
            "sample_values": result[:5]  # First 5 values
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


@router.post("/test-storage")
async def test_storage() -> dict:
    """Test document storage and retrieval."""
    try:
        vs = get_vector_store()
        
        # Test upsert
        test_id = "test_doc_123"
        test_text = "The Reserve Bank of India manages monetary policy"
        test_meta = {"source": "RBI", "title": "Test"}
        
        success = vs.upsert(
            collection="test_rag_health",
            ids=[test_id],
            texts=[test_text],
            metadatas=[test_meta]
        )
        
        if not success:
            raise Exception("Upsert failed")
        
        # Test query
        results = vs.query(
            collection="test_rag_health",
            text="monetary policy banking",
            n_results=1
        )
        
        return {
            "success": True,
            "upsert": "ok",
            "retrieval": "ok",
            "documents_stored": 1,
            "documents_retrieved": len(results),
            "sample_result": results[0] if results else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage test failed: {str(e)}")
