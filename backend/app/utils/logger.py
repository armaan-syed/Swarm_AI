"""Project logger setup.

Provides:
    - get_logger(name)          — standard logger with consistent formatting
    - get_agent_logger(name)    — agent-scoped logger
    - get_scheduler_logger()    — scheduler-scoped logger
    - RunLogStore               — in-process ring buffer for the frontend Activity panel
"""
import logging
import sys
from collections import deque
from datetime import datetime
from typing import Any


def get_logger(name: str = "agentic") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    )
    logger.addHandler(handler)
    return logger


def get_agent_logger(name: str) -> logging.Logger:
    """Logger for RBI / generic agents — prefixed with 'agent.'."""
    return get_logger(f"agent.{name}")


def get_scheduler_logger() -> logging.Logger:
    """Logger for the APScheduler pipeline job."""
    return get_logger("scheduler")


class RunLogStore:
    """Thread-safe in-process ring buffer that stores recent pipeline events.

    Used by the frontend's "Activity" panel via GET /logs/recent.
    Not persisted — lost on process restart.
    """

    _MAX_ENTRIES = 200

    def __init__(self, max_entries: int | None = None) -> None:
        cap = max_entries or self._MAX_ENTRIES
        self._buffer: deque[dict[str, Any]] = deque(maxlen=cap)

    def record(self, event: dict[str, Any]) -> None:
        """Append an event to the buffer. Auto-adds a timestamp if missing."""
        if "timestamp" not in event:
            event["timestamp"] = datetime.utcnow().isoformat()
        self._buffer.append(event)

    def recent(self, limit: int = 50) -> list[dict[str, Any]]:
        """Return the most recent *limit* events, newest first."""
        items = list(self._buffer)
        items.reverse()
        return items[:limit]

    def clear(self) -> None:
        self._buffer.clear()

    def __len__(self) -> int:
        return len(self._buffer)


# Module-level singleton
_run_log_store: RunLogStore | None = None


def get_run_log_store() -> RunLogStore:
    """Return the module-wide RunLogStore singleton."""
    global _run_log_store
    if _run_log_store is None:
        _run_log_store = RunLogStore()
    return _run_log_store
