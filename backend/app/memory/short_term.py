"""In-process short-term memory (per user, last N exchanges)."""
from collections import defaultdict, deque
from typing import Any


class ShortTermMemory:
    def __init__(self, max_items: int = 10) -> None:
        self.max_items = max_items
        self._store: dict[str, deque] = defaultdict(lambda: deque(maxlen=max_items))

    def append(self, user_id: str | None, item: dict[str, Any]) -> None:
        self._store[user_id or "anon"].append(item)

    def recent(self, user_id: str | None) -> list[dict[str, Any]]:
        return list(self._store[user_id or "anon"])

    def clear(self, user_id: str | None) -> None:
        self._store[user_id or "anon"].clear()
