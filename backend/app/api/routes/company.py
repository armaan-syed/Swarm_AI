"""Company routes for CRUD operations."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends

from app.api.deps import get_current_user_optional
from app.db.supabase_client import get_supabase
from app.models.company_schemas import CompanyCreate, CompanyUpdate, CompanyOut
from app.services.company_service import (
    create_company,
    get_company,
    list_companies,
    update_company,
    delete_company,
)

router = APIRouter()


@router.post("", response_model=CompanyOut, status_code=201)
async def create_new_company(
    payload: CompanyCreate,
    user: dict | None = Depends(get_current_user_optional),
) -> CompanyOut:
    """Create a new company."""
    company = await create_company(payload)
    return company


@router.get("", response_model=list[CompanyOut])
async def list_all_companies(
    limit: int = Query(10, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    user: dict | None = Depends(get_current_user_optional),
) -> list[CompanyOut]:
    """List all companies with pagination."""
    companies = await list_companies(limit=limit, offset=offset)
    return companies


@router.get("/{company_id}", response_model=CompanyOut)
async def fetch_company(
    company_id: str,
    user: dict | None = Depends(get_current_user_optional),
) -> CompanyOut:
    """Get a specific company by ID."""
    company = await get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.patch("/{company_id}", response_model=CompanyOut)
async def update_existing_company(
    company_id: str,
    payload: CompanyUpdate,
    user: dict | None = Depends(get_current_user_optional),
) -> CompanyOut:
    """Update a company."""
    company = await update_company(company_id, payload)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.delete("/{company_id}", status_code=204)
async def delete_existing_company(
    company_id: str,
    user: dict | None = Depends(get_current_user_optional),
) -> None:
    """Delete a company."""
    success = await delete_company(company_id)
    if not success:
        raise HTTPException(status_code=404, detail="Company not found")


@router.get("/{company_id}/documents")
async def list_company_documents(
    company_id: str,
    user: dict | None = Depends(get_current_user_optional),
) -> list[dict]:
    """List uploaded documents for a company."""
    client = get_supabase()
    if not client:
        return []
    try:
        res = (
            client.table("company_documents")
            .select("id, company_id, filename, doc_hash, created_at")
            .eq("company_id", company_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {exc}") from exc

    rows = res.data or []
    return [
        {
            "id": row.get("id"),
            "company_id": row.get("company_id"),
            "filename": row.get("filename"),
            "doc_hash": row.get("doc_hash"),
            "ingested_at": row.get("created_at"),
        }
        for row in rows
    ]


@router.delete("/{company_id}/documents/{doc_id}", status_code=204)
async def delete_company_document(
    company_id: str,
    doc_id: str,
    user: dict | None = Depends(get_current_user_optional),
) -> None:
    """Delete an uploaded company document metadata row."""
    client = get_supabase()
    if not client:
        raise HTTPException(status_code=503, detail="DB unavailable")

    res = (
        client.table("company_documents")
        .delete()
        .eq("id", doc_id)
        .eq("company_id", company_id)
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found")
