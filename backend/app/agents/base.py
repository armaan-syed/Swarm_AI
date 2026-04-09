"""Base agent class - Ollama (default) with optional Groq fallback."""
from abc import ABC, abstractmethod
from typing import Any

from langchain_ollama import ChatOllama

from app.config import settings


def build_llm(model: str | None = None, temperature: float | None = None):
    """Construct the chat LLM with Ollama as primary and Groq as fallback."""
    temp = temperature if temperature is not None else settings.LLM_TEMPERATURE

    primary = ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=model or settings.OLLAMA_MODEL,
        temperature=temp,
    )

    if settings.GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq

            fallback = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
                temperature=temp,
            )
            return primary.with_fallbacks([fallback])
        except ImportError:
            pass

    return primary


class BaseAgent(ABC):
    name: str = "base"

    def __init__(self, model: str | None = None, temperature: float | None = None) -> None:
        self.llm = build_llm(model=model, temperature=temperature)

    @abstractmethod
    async def run(self, *args: Any, **kwargs: Any) -> Any:
        """Execute the agent's task."""
