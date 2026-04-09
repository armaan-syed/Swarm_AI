"""Pydantic schemas for the RBI compliance pipeline."""
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


class RunPipelineRequest(BaseModel):
    sources: list[Literal["RBI", "SEBI", "MCA"]] | None = None
    max_docs: int = Field(default=5, ge=1, le=20)
    company_id: Optional[str] = Field(default=None, description="Optional company ID for contextual analysis")


class RunOneRequest(BaseModel):
    url: str
    source: Literal["RBI", "SEBI", "MCA"] = "RBI"


class ClauseImpactOut(BaseModel):
    clause_number: str
    severity: str
    departments: list[str]
    impact_statement: str
    similar_docs: list[dict[str, Any]] = []


class ReportOut(BaseModel):
    markdown: str
    citations: list[str]
    affected_teams: list[str]
    action_items: list[str]
    grounded: bool
    generated_at: str
    overall_severity: str


class ValidationOut(BaseModel):
    """Validation results from the RBI Validator Agent."""
    is_valid: bool
    confidence: float
    issues: list[str] = []


class PipelineResultOut(BaseModel):
    ref: dict[str, Any]
    summary: str
    severity: str
    report: ReportOut | None = None
    validation: ValidationOut | None = None


class PipelineRunOut(BaseModel):
    found: int
    processed: int
    errors: list[str]
    reports: list[PipelineResultOut]


class CircularOut(BaseModel):
    id: str
    source: str
    title: str
    url: str
    published_date: str | None
    effective_date: str | None
    severity: str | None
    created_at: str


class ImpactReportOut(BaseModel):
    id: str
    circular_url: str
    summary: str
    severity: str
    markdown: str
    citations: list[str]
    affected_teams: list[str]
    action_items: list[str]
    grounded: bool
    created_at: str
