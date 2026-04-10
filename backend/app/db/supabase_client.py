"""Supabase client singleton."""
from functools import lru_cache

from supabase import Client, create_client

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("supabase_client")


@lru_cache
def get_supabase() -> Client | None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase keys are missing! Falling back to empty client.")
        return None
    
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        # Attempt a quick ping to verify token validity
        # res = client.table("companies").select("id").limit(1).execute()
        return client
    except Exception as exc:
        logger.error("Failed to initialize Supabase client: %s", exc)
        return None
