"""APScheduler — periodic RBI/SEBI/MCA source monitoring.

The scheduler starts with the FastAPI app and polls regulatory sources
every 10 hours (default). Interval is configurable via
MONITOR_INTERVAL_HOURS in .env.
"""
from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("scheduler")

_scheduler: AsyncIOScheduler | None = None


async def _run_pipeline() -> None:
    """Job executed by the scheduler — runs full compliance pipeline."""
    from app.services.ingestion_pipeline import IngestionPipeline

    logger.info("Scheduled pipeline run starting...")
    try:
        pipeline = IngestionPipeline()
        result = await pipeline.run_regulatory(max_docs=settings.MONITOR_MAX_DOCS)
        logger.info(
            "Pipeline done. found=%d processed=%d errors=%d",
            len(result.found_refs),
            len(result.reports),
            len(result.errors),
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Scheduled pipeline failed: %s", exc)


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            _run_pipeline,
            trigger=IntervalTrigger(hours=settings.MONITOR_INTERVAL_HOURS),
            id="rbi_monitor",
            replace_existing=True,
            misfire_grace_time=300,
        )
    return _scheduler


def start_scheduler() -> None:
    sched = get_scheduler()
    if not sched.running:
        sched.start()
        logger.info(
            "Scheduler started — polling every %dh",
            settings.MONITOR_INTERVAL_HOURS,
        )


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
