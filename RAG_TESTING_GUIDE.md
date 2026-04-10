# RAG System Testing Guide

Your RAG (Retrieval-Augmented Generation) system has been set up with health check endpoints. Here's how to test it:

## Prerequisites

Make sure you have these running:
1. **Ollama** - Language model server
   ```bash
   ollama serve
   ```

2. **Backend Server** - FastAPI server
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

## Testing Endpoints

### 1. RAG System Health Check
**Check if all RAG components are working**

```bash
curl -X GET http://127.0.0.1:8000/api/v1/rag/health
```

Expected response (if healthy):
```json
{
  "status": "healthy",
  "components": {
    "chroma": true,
    "ollama": true,
    "rag_service": true,
    "errors": []
  },
  "message": "RAG system is fully operational"
}
```

**Possible issues & fixes:**

| Issue | Fix |
|-------|-----|
| `"chroma": false` | ChromaDB not initialized. Check `./chroma_store` directory exists |
| `"ollama": false` | Ollama not running. Run `ollama serve` in another terminal |
| Connection refused errors | Ollama/API server not running |

---

### 2. Test Embedding Generation
**Verify Ollama can create embeddings**

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/rag/test-embedding?text=test%20query"
```

Expected response:
```json
{
  "success": true,
  "text": "test query",
  "embedding_dimension": 768,
  "sample_values": [0.123, -0.456, 0.789, ...]
}
```

**What this tests:**
- Ollama connectivity ✓
- Model loading (`nomic-embed-text`) ✓
- Embedding generation ✓

---

### 3. Test Document Storage & Retrieval
**End-to-end RAG test: store a document and retrieve it**

```bash
curl -X POST http://127.0.0.1:8000/api/v1/rag/test-storage
```

Expected response:
```json
{
  "success": true,
  "upsert": "ok",
  "retrieval": "ok",
  "documents_stored": 1,
  "documents_retrieved": 1,
  "sample_result": {
    "id": "test_doc_123",
    "document": "The Reserve Bank of India manages monetary policy",
    "metadata": {"source": "RBI"},
    "distance": 0.123
  }
}
```

**What this tests:**
- ChromaDB storage (upsert) ✓
- Semantic search/retrieval ✓
- Embedding quality & similarity ✓

---

## Python Testing

Run the diagnostic script:

```bash
python c:\Sunhks\SunHacks\check_rag.py
```

Or run the full test suite:

```bash
python c:\Sunhks\SunHacks\test_rag_system.py
```

---

## Troubleshooting

### Ollama Issues

**Error: "Could not connect to Ollama at http://localhost:11434"**
```bash
# Start Ollama (if not running)
ollama serve

# In another terminal, verify the model is installed:
ollama list
ollama pull nomic-embed-text
```

**Error: "Model 'nomic-embed-text' not found"**
```bash
ollama pull nomic-embed-text
```

### ChromaDB Issues

**Error: "Failed to initialise Chroma client"**
- Ensure `./chroma_store` directory is writable
- Check disk space (ChromaDB needs persistence)

**Error: "Collection not found"**
- ChromaDB auto-creates collections on first use
- If persistence is broken, delete `./chroma_store` and restart

### Common Configuration

Your RAG configuration (in `backend/app/config.py`):
```python
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_EMBED_MODEL = "nomic-embed-text"
CHROMA_PERSIST_DIR = "./chroma_store"
```

---

## Using RAG in Your Application

### 1. Store Documents
```python
from app.services.rag_service import get_rag_service

rag = get_rag_service()

success = await rag.embed_and_store(
    document_id="doc_123",
    content="Your document text here...",
    source="RBI",
    metadata={"title": "Policy Document"},
    collection="regulatory_circulars"
)
```

### 2. Retrieve Documents
```python
results = await rag.retrieve_context(
    query="What is the policy about...?",
    collection="regulatory_circulars",
    top_k=5,
    source_filter=["RBI"]
)

for result in results:
    print(f"Match: {result['chunk'][:100]}...")
    print(f"Score: {result['score']}")
```

### 3. Mixed Retrieval (Regulatory + Company)
```python
mixed = await rag.retrieve_mixed_context(
    query="Compliance requirements...",
    top_k_regulatory=3,
    top_k_company=2,
    company_id="company_123"
)
```

---

## Performance Notes

- **First embedding**: ~2-5 seconds (model loading)
- **Subsequent embeddings**: ~100-500ms each
- **Retrieval speed**: 50-200ms depending on collection size
- **Chunk size**: 4000 characters with 200 character overlap

---

## Monitoring

Check logs for RAG operations:
```bash
tail -f backend/app/logs/rag_service.log  # Not auto-created yet
```

Or use the backend terminal output (if running with `--reload`)

---

**All set!** Your RAG system is ready to retrieve and ground agent reasoning in real documents. 🚀
