"""Company service for CRUD operations."""
import uuid
from typing import Optional
from datetime import datetime
from app.db.supabase_client import get_supabase
from app.models.company_schemas import CompanyCreate, CompanyUpdate, CompanyOut, CompanyContext
from app.utils.logger import get_logger

logger = get_logger(__name__)

# No in-memory fallback allowed for production/persistence
# _companies_cache: dict[str, dict] = {}


async def create_company(payload: CompanyCreate) -> CompanyOut:
    """Create a new company."""
    client = get_supabase()
    if not client:
        raise RuntimeError("Supabase client not initialized. Check your environment variables.")
    
    company_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    company_data = {
        "id": company_id,
        "name": payload.name,
        "industry": payload.industry,
        "product_description": payload.product_description,
        "created_at": now,
        "updated_at": now,
    }
    
    try:
        response = client.table("companies").insert(company_data).execute()
        if response.data:
            return CompanyOut(**response.data[0])
        raise RuntimeError("Failed to insert company: No data returned")
    except Exception as exc:
        logger.error(f"Error creating company in Supabase: {exc}")
        raise


async def get_company(company_id: str) -> Optional[CompanyOut]:
    """Fetch a single company by ID."""
    client = get_supabase()
    if not client:
        return None
    
    try:
        response = client.table("companies").select("*").eq("id", company_id).execute()
        if response.data:
            return CompanyOut(**response.data[0])
    except Exception as exc:
        logger.error(f"Error fetching company from Supabase: {exc}")
    
    return None


async def list_companies(limit: int = 10, offset: int = 0) -> list[CompanyOut]:
    """List all companies with pagination."""
    client = get_supabase()
    if not client:
        return []
    
    try:
        response = (
            client.table("companies")
            .select("*")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [CompanyOut(**row) for row in response.data]
    except Exception as exc:
        logger.error(f"Error listing companies from Supabase: {exc}")
        return []


async def update_company(company_id: str, payload: CompanyUpdate) -> Optional[CompanyOut]:
    """Update a company."""
    client = get_supabase()
    if not client:
        raise RuntimeError("Supabase client not initialized")
    
    # Prepare update data (only non-None fields)
    update_data = {}
    if payload.name is not None:
        update_data["name"] = payload.name
    if payload.industry is not None:
        update_data["industry"] = payload.industry
    if payload.product_description is not None:
        update_data["product_description"] = payload.product_description
    
    if not update_data:
        return await get_company(company_id)
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    try:
        response = (
            client.table("companies")
            .update(update_data)
            .eq("id", company_id)
            .execute()
        )
        if response.data:
            return CompanyOut(**response.data[0])
    except Exception as exc:
        logger.error(f"Error updating company in Supabase: {exc}")
        raise
    
    return None


async def delete_company(company_id: str) -> bool:
    """Delete a company."""
    client = get_supabase()
    if not client:
        return False
    
    try:
        client.table("companies").delete().eq("id", company_id).execute()
        return True
    except Exception as exc:
        logger.error(f"Error deleting company from Supabase: {exc}")
        return False


async def get_company_context(company_id: str) -> Optional[CompanyContext]:
    """Fetch lightweight company context for agents."""
    company = await get_company(company_id)
    if company:
        return CompanyContext(
            id=company.id,
            name=company.name,
            industry=company.industry,
            product_description=company.product_description,
        )
    return None
