"""Query API route — natural-language questions against the knowledge base.

Proxies to the generic planner/executor/validator Orchestrator (if available)
or falls back to a simple LLM call with ChromaDB retrieval context.
"""
import asyncio

from fastapi import APIRouter, HTTPException

from app.models.schemas import QueryRequest, QueryResponse
from app.utils.logger import get_logger

logger = get_logger("query_route")

router = APIRouter()
_MAX_CHUNK_CHARS = 700
_MAX_CONTEXT_CHARS = 2800


@router.post("", response_model=QueryResponse)
async def query(payload: QueryRequest) -> QueryResponse:
    """Answer a natural-language compliance question.

    Uses ChromaDB to retrieve relevant company/regulatory documents as context,
    then passes the enriched prompt to the LLM.
    """
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # 1. Retrieve context from ChromaDB
    retrieval_context = ""
    try:
        from app.services.vector_store import get_vector_store
        from app.config import settings

        vs = get_vector_store()

        # Search company docs if company_id is provided
        if payload.company_id:
            company_results = vs.query(
                collection=settings.CHROMA_COMPANY_COLLECTION,
                text=payload.query,
                n_results=3,
                where={"company_id": payload.company_id},
            )
            if company_results:
                retrieval_context += "\n--- Company Documents ---\n"
                for r in company_results:
                    retrieval_context += f"{(r.get('document', '') or '')[:_MAX_CHUNK_CHARS]}\n\n"

        # Search regulatory circulars
        reg_results = vs.query(
            collection=settings.CHROMA_CIRCULAR_COLLECTION,
            text=payload.query,
            n_results=3,
        )
        if reg_results:
            retrieval_context += "\n--- Regulatory Circulars ---\n"
            for r in reg_results:
                retrieval_context += f"{(r.get('document', '') or '')[:_MAX_CHUNK_CHARS]}\n\n"

        if len(retrieval_context) > _MAX_CONTEXT_CHARS:
            retrieval_context = retrieval_context[:_MAX_CONTEXT_CHARS]

    except Exception as exc:
        logger.debug("Retrieval context failed: %s", exc)

    # 2. Build LLM prompt
    system_prompt = (
        "You are a compliance assistant for Indian financial services. "
        "Answer the user's question accurately using the provided context. "
        "If the context does not contain enough information, say so clearly. "
        "Cite specific circulars or clauses when possible."
    )

    user_prompt = payload.query
    if retrieval_context.strip():
        user_prompt = f"Context:\n{retrieval_context}\n\nQuestion: {payload.query}"
    if payload.context:
        user_prompt += f"\n\nAdditional context: {payload.context}"

    # 3. Call LLM
    try:
        from app.agents.base import build_llm
        from langchain_core.messages import HumanMessage, SystemMessage

        from app.config import settings

        llm = build_llm()
        response = await asyncio.wait_for(
            llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]),
            timeout=settings.QUERY_LLM_TIMEOUT_SECONDS,
        )
        answer = response.content
    except TimeoutError as exc:
        logger.warning("LLM query timed out after %.1fs", settings.QUERY_LLM_TIMEOUT_SECONDS)
        raise HTTPException(
            status_code=504,
            detail="LLM timed out while generating a response. Please try again.",
        ) from exc
    except Exception as exc:
        logger.exception("LLM query failed")
        raise HTTPException(
            status_code=503, detail=f"LLM unavailable: {exc}"
        ) from exc

    return QueryResponse(
        success=True,
        answer=answer,
        company_id=payload.company_id,
    )
