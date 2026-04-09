"""Pydantic schemas shared across the API."""
from typing import Any
from pydantic import BaseModel, Field


class AgentRequest(BaseModel):
    query: str = Field(..., description="User instruction or question")
    context: dict[str, Any] | None = Field(default=None, description="Optional context")


class AgentStep(BaseModel):
    agent: str
    output: Any


class AgentResponse(BaseModel):
    success: bool
    answer: str
    steps: list[AgentStep] = []
    metadata: dict[str, Any] = {}


class UserOut(BaseModel):
    id: str
    email: str
