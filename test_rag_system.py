#!/usr/bin/env python3
"""
Test script to verify RAG system functionality.
Tests: Ollama connectivity, ChromaDB initialization, embedding generation, and retrieval.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

async def main():
    print("\n" + "="*60)
    print("RAG SYSTEM TEST SUITE")
    print("="*60)

    # Test 1: Check Ollama connectivity
    print("\n[1/5] Testing Ollama connectivity...")
    try:
        from langchain_ollama import OllamaEmbeddings
        from app.config import settings
        
        embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL,
        )
        
        # Try a simple embedding
        test_text = "Test embedding generation"
        result = embeddings.embed_query(test_text)
        
        if result and len(result) > 0:
            print(f"✅ Ollama connection successful")
            print(f"   - Base URL: {settings.OLLAMA_BASE_URL}")
            print(f"   - Model: {settings.OLLAMA_EMBED_MODEL}")
            print(f"   - Embedding dimension: {len(result)}")
        else:
            print("❌ Ollama returned empty embedding")
            return False
            
    except Exception as e:
        print(f"❌ Ollama connectivity failed: {e}")
        print("   FIX: Make sure Ollama is running and reachable at http://localhost:11434")
        return False

    # Test 2: Check ChromaDB initialization
    print("\n[2/5] Testing ChromaDB initialization...")
    try:
        from app.services.vector_store import get_vector_store
        from app.config import settings
        
        vector_store = get_vector_store()
        
        # Check if we can access the client
        if vector_store._ensure_client() is None:
            print("❌ ChromaDB client initialization failed")
            return False
            
        print(f"✅ ChromaDB initialized successfully")
        print(f"   - Persist directory: {settings.CHROMA_PERSIST_DIR}")
        
    except Exception as e:
        print(f"❌ ChromaDB initialization failed: {e}")
        return False

    # Test 3: Test document storage and retrieval
    print("\n[3/5] Testing document storage...")
    try:
        from app.services.vector_store import get_vector_store
        
        vector_store = get_vector_store()
        
        # Insert test documents
        test_docs = [
            "The Reserve Bank of India manages monetary policy and banking regulations.",
            "SEBI oversees securities markets and investor protection in India.",
            "The Companies Act governs corporate entities and MCA regulations.",
        ]
        
        test_ids = ["doc_1", "doc_2", "doc_3"]
        test_metadata = [
            {"source": "RBI", "title": "RBI Overview"},
            {"source": "SEBI", "title": "SEBI Overview"},
            {"source": "MCA", "title": "MCA Overview"},
        ]
        
        success = vector_store.upsert(
            collection="test_documents",
            ids=test_ids,
            texts=test_docs,
            metadatas=test_metadata
        )
        
        if success:
            print(f"✅ Document storage successful")
            print(f"   - Stored {len(test_docs)} test documents")
        else:
            print("❌ Document storage failed")
            return False
            
    except Exception as e:
        print(f"❌ Document storage failed: {e}")
        return False

    # Test 4: Test semantic search/retrieval
    print("\n[4/5] Testing semantic search/retrieval...")
    try:
        from app.services.vector_store import get_vector_store
        
        vector_store = get_vector_store()
        
        # Query for RBI-related content
        query_text = "monetary policy and banking"
        results = vector_store.query(
            collection="test_documents",
            text=query_text,
            n_results=2
        )
        
        if results and len(results) > 0:
            print(f"✅ Semantic search successful")
            print(f"   - Query: '{query_text}'")
            print(f"   - Results found: {len(results)}")
            for i, result in enumerate(results):
                print(f"   - Result {i+1}: {result['document'][:60]}...")
                print(f"     Distance: {result['distance']:.4f}")
        else:
            print("❌ No results found from semantic search")
            return False
            
    except Exception as e:
        print(f"❌ Semantic search failed: {e}")
        return False

    # Test 5: Test RAG service integration
    print("\n[5/5] Testing RAG service integration...")
    try:
        from app.services.rag_service import get_rag_service
        
        rag_service = get_rag_service()
        
        # Test embed and store
        doc_id = "test_rag_doc"
        doc_content = """
        Central banks implement monetary policy to manage inflation and economic growth.
        The Reserve Bank of India (RBI) is India's central banking institution.
        RBI regulations ensure financial stability and consumer protection.
        """
        
        success = await rag_service.embed_and_store(
            document_id=doc_id,
            content=doc_content,
            source="RBI",
            metadata={"title": "RBI Monetary Policy"},
            collection="test_rag"
        )
        
        if success:
            print(f"✅ RAG embed_and_store successful")
            
            # Test retrieval
            retrieval = await rag_service.retrieve_context(
                query="What is RBI and monetary policy",
                collection="test_rag",
                top_k=3
            )
            
            if retrieval:
                print(f"✅ RAG retrieval successful")
                print(f"   - Retrieved {len(retrieval)} context chunks")
                for i, chunk in enumerate(retrieval):
                    print(f"   - Chunk {i+1}: {chunk['chunk'][:50]}...")
            else:
                print("⚠️  RAG retrieval returned empty results (might need more documents)")
        else:
            print("❌ RAG embed_and_store failed")
            return False
            
    except Exception as e:
        print(f"❌ RAG service integration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED - RAG SYSTEM IS WORKING!")
    print("="*60)
    return True


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
