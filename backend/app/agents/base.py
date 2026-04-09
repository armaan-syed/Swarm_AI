"""Base agent class - shared LLM client + interface."""
from abc import ABC, abstractmethod
from typing import Any

from langchain_openai import ChatOpenAI

from app.config import settings


class BaseAgent(ABC):
    name: str = "base"

    def __init__(self, model: str | None = None, temperature: float | None = None) -> None:
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model=model or settings.OPENAI_MODEL,
            temperature=temperature if temperature is not None else settings.OPENAI_TEMPERATURE,
        )

    @abstractmethod
    async def run(self, *args: Any, **kwargs: Any) -> Any:
        """Execute the agent's task."""
