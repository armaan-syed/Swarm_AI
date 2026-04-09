"""Plug-and-play tool registry. Register hackathon-specific tools here."""
from dataclasses import dataclass
from typing import Any, Callable, Awaitable

ToolFn = Callable[..., Awaitable[Any]]


@dataclass
class Tool:
    name: str
    description: str
    func: ToolFn


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, name: str, description: str) -> Callable[[ToolFn], ToolFn]:
        def decorator(func: ToolFn) -> ToolFn:
            self._tools[name] = Tool(name=name, description=description, func=func)
            return func
        return decorator

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def all(self) -> list[Tool]:
        return list(self._tools.values())

    def describe(self) -> str:
        if not self._tools:
            return "(no tools registered)"
        return "\n".join(f"- {t.name}: {t.description}" for t in self._tools.values())


tool_registry = ToolRegistry()

# Importing example_tool registers it via decorator side-effects.
from app.tools import example_tool  # noqa: E402,F401
