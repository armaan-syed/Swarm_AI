"""Pydantic schemas shared across the API."""
from typing import Any, Optional
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


class QueryRequest(BaseModel):
    """Natural-language compliance question."""
    query: str = Field(..., description="The question to ask")
    company_id: Optional[str] = Field(default=None, description="Optional company ID for context scoping")
    context: Optional[str] = Field(default=None, description="Optional additional context")


class QueryResponse(BaseModel):
    """Response to a compliance query."""
    success: bool = True
    answer: str
    company_id: Optional[str] = None

