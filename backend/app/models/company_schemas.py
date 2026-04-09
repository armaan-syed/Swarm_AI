"""Company schemas for context personalization."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CompanyCreate(BaseModel):
    """Schema for creating a company."""
    name: str = Field(..., min_length=1, max_length=255, description="Company name")
    industry: Optional[str] = Field(None, max_length=255, description="Industry sector")
    product_description: Optional[str] = Field(None, description="Brief product/service description")


class CompanyUpdate(BaseModel):
    """Schema for updating a company."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Company name")
    industry: Optional[str] = Field(None, max_length=255, description="Industry sector")
    product_description: Optional[str] = Field(None, description="Brief product/service description")


class CompanyOut(BaseModel):
    """Schema for company response."""
    id: str = Field(..., description="Company ID (UUID)")
    name: str = Field(..., description="Company name")
    industry: Optional[str] = Field(None, description="Industry sector")
    product_description: Optional[str] = Field(None, description="Product/service description")
    created_at: datetime = Field(..., description="Created timestamp")
    updated_at: datetime = Field(..., description="Updated timestamp")

    class Config:
        from_attributes = True


class CompanyContext(BaseModel):
    """Lightweight company context for agents."""
    id: str
    name: str
    industry: Optional[str] = None
    product_description: Optional[str] = None
