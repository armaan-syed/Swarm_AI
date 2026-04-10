"""Quick RAG diagnostics"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

print("\n=== RAG DIAGNOSTIC CHECK ===\n")

# Check 1: Can we import the modules?
print("1. Module imports...")
try:
    from app.config import settings
    print(f"   ✓ Config loaded")
    print(f"     Ollama URL: {settings.OLLAMA_BASE_URL}")
    print(f"     Ollama Model: {settings.OLLAMA_EMBED_MODEL}")
    print(f"     ChromaDB Path: {settings.CHROMA_PERSIST_DIR}")
except Exception as e:
    print(f"   ✗ Config error: {e}")
    sys.exit(1)

# Check 2: Can we initialize ChromaDB?
print("\n2. ChromaDB initialization...")
try:
    from app.services.vector_store import get_vector_store
    vs = get_vector_store()
    if vs._ensure_client():
        print(f"   ✓ ChromaDB client ready")
        count = vs.count("test_check")
        print(f"   ✓ Can query collections (test count: {count})")
    else:
        print(f"   ✗ ChromaDB client failed to initialize")
except Exception as e:
    print(f"   ✗ ChromaDB error: {e}")

# Check 3: Can we connect to Ollama?
print("\n3. Ollama embedding test...")
try:
    from langchain_ollama import OllamaEmbeddings
    embedder = OllamaEmbeddings(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_EMBED_MODEL
    )
    result = embedder.embed_query("test")
    print(f"   ✓ Ollama responding")
    print(f"   ✓ Embedding dimension: {len(result)}")
except Exception as e:
    print(f"   ✗ Ollama error: {e}")
    print(f"   >> Make sure Ollama is running with: ollama serve")

# Check 4: RAG service
print("\n4. RAG service initialization...")
try:
    from app.services.rag_service import get_rag_service
    rag = get_rag_service()
    print(f"   ✓ RAG service initialized")
except Exception as e:
    print(f"   ✗ RAG service error: {e}")

print("\n=== END DIAGNOSTIC ===\n")
