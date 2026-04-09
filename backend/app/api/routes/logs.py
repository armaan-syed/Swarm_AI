"""Logs API route — recent pipeline activity for the frontend."""
from fastapi import APIRouter

from app.utils.logger import get_run_log_store

router = APIRouter()


@router.get("/recent")
async def recent_logs(limit: int = 50) -> list[dict]:
    """Return the most recent pipeline events from the in-memory ring buffer.

    Used by the frontend's Activity / Timeline panel.
    """
    store = get_run_log_store()
    return store.recent(limit=limit)
