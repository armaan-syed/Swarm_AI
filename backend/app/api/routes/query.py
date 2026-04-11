"""Query API route — natural-language questions against the knowledge base.

Proxies to the generic planner/executor/validator Orchestrator (if available)
or falls back to a simple LLM call with ChromaDB retrieval context.
"""
import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import QueryRequest
from app.utils.logger import get_logger

logger = get_logger("query_route")
router = APIRouter()

@router.post("/stream")
async def query_stream(payload: QueryRequest) -> StreamingResponse:
    """Answer a compliance question with real-time streaming tokens."""
    from app.services.rag_service import get_rag_service
    from app.agents.base import build_llm
    from langchain_core.messages import HumanMessage, SystemMessage

    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    async def generate():
        # 1. Retrieve GROUNDED context (Synchronous relative to the start of stream)
        retrieval_context = ""
        try:
            rag_service = get_rag_service()
            mixed_context = await rag_service.retrieve_mixed_context(
                query=payload.query,
                company_id=payload.company_id,
                top_k_regulatory=3,
                top_k_company=2
            )
            if mixed_context["company"]:
                retrieval_context += "\n--- INTERNAL POLICY CONTEXT ---\n"
                for ctx in mixed_context["company"]:
                    retrieval_context += f"{ctx['chunk']}\n\n"
            if mixed_context["regulatory"]:
                retrieval_context += "\n--- REGULATORY FRAMEWORK CONTEXT ---\n"
                for ctx in mixed_context["regulatory"]:
                    retrieval_context += f"{ctx['chunk']}\n\n"
        except Exception as exc:
            logger.warning("RAG retrieval failed for stream: %s", exc)

        # 2. Build Prompt
        system_prompt = (
            "You are the Swarm AI Compliance Assistant. Your purpose is to provide "
            "precise, grounded answers to regulatory questions based on Indian "
            "financial frameworks (RBI, SEBI, MCA) and internal company policies. "
            "\n\nSTRICT RULES:\n"
            "1. If context is provided, prioritize it above general knowledge.\n"
            "2. If you don't know the answer or the context is insufficient, state it clearly.\n"
            "3. Cite specific circulars, clauses, or internal document names where available.\n"
            "4. Maintain a professional, executive tone."
        )
        full_user_prompt = payload.query
        if retrieval_context.strip():
            full_user_prompt = f"RELEVANT CONTEXT:\n{retrieval_context}\n\nUSER QUESTION: {payload.query}"
        if payload.context:
            full_user_prompt += f"\n\nADDITIONAL RUNTIME CONTEXT: {payload.context}"

        # 3. Stream from Intelligence Engine
        try:
            llm = build_llm()
            async for chunk in llm.astream([
                SystemMessage(content=system_prompt),
                HumanMessage(content=full_user_prompt),
            ]):
                if chunk.content:
                    yield chunk.content
        except Exception as exc:
            logger.exception("Streaming LLM call failed")
            yield f"\n\n[ERROR: Intelligence engine connection interrupted: {str(exc)}]"

    return StreamingResponse(generate(), media_type="text/plain")
