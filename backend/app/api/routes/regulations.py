"""Regulations API route — browse known regulatory circulars.

Provides a clean regulations-dashboard-shaped API:
    GET /regulations       — list circulars with pagination
    GET /regulations/{id}  — fetch one circular with full clause JSON
"""
from fastapi import APIRouter, HTTPException

from app.db.supabase_client import get_supabase
from app.utils.logger import get_logger

logger = get_logger("regulations_route")

router = APIRouter()


@router.get("")
async def list_regulations(
    source: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """List known regulatory circulars.

    Optionally filter by source (RBI / SEBI / MCA).
    Returns a simplified shape for the regulations dashboard.
    """
    client = get_supabase()
    if not client:
        return []

    try:
        query = (
            client.table("circulars")
            .select("id, source, title, url, published_date, effective_date, doc_hash, version, created_at")
            .order("created_at", desc=True)
        )
        if source:
            query = query.eq("source", source.upper())

        res = query.range(offset, offset + limit - 1).execute()
        return res.data or []
    except Exception as exc:
        logger.exception("Failed to list regulations")
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{regulation_id}")
async def get_regulation(regulation_id: str) -> dict:
    """Fetch a single circular with its full clause JSON."""
    client = get_supabase()
    if not client:
        raise HTTPException(status_code=503, detail="DB unavailable")

    try:
        res = (
            client.table("circulars")
            .select("*")
            .eq("id", regulation_id)
            .single()
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Regulation not found")
        return res.data
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch regulation %s", regulation_id)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
