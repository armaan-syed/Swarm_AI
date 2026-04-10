from typing import Optional
from app.db.supabase_client import get_supabase
from app.services.email_service import DEPT_EMAIL_MAP
from pydantic import BaseModel, Field
from app.utils.logger import get_logger

logger = get_logger("department_service")

# In-memory cache to handle missing table scenario without stalling
_DEPT_CACHE = {}

# Fallback team defaults for G->P flow
TEAM_DEFAULTS = [
    {
        "name": "Strategic Oversight",
        "description": "Executive leadership and strategic decision-making. Responsible for Board-level compliance strategy, policy approvals, and regulatory liaison.",
        "contact_name": "John Philji",
        "contact_email": "johnphilji2007@gmail.com",
        "company_id": "",
    },
    {
        "name": "Operations",
        "description": "Day-to-day operational management. Handles lending pipeline, portfolio rebalancing, product development, and system migrations.",
        "contact_name": "Chris Fernandes",
        "contact_email": "chriscric17@gmail.com",
        "company_id": "",
    },
    {
        "name": "Risk & Audit",
        "description": "Risk assessment, internal audit, and regulatory compliance monitoring. Conducts stress testing, capital adequacy analysis, and audit trail management.",
        "contact_name": "Armaan Syed",
        "contact_email": "armaansyed009@gmail.com",
        "company_id": "",
    },
]

class DepartmentContact(BaseModel):
    id: Optional[str] = None
    company_id: str
    name: str # Department name
    description: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: str

async def list_departments(company_id: str) -> list[DepartmentContact]:
    if company_id in _DEPT_CACHE:
        return _DEPT_CACHE[company_id]

    client = get_supabase()
    if not client:
        return TEAM_DEFAULTS
    
    try:
        res = client.table("departments").select("*").eq("company_id", company_id).execute()
        data = [DepartmentContact(**row) for row in res.data]
        _DEPT_CACHE[company_id] = data if data else TEAM_DEFAULTS
        return _DEPT_CACHE[company_id]
    except Exception as exc:
        logger.warning("Failed to fetch departments from DB, using team defaults: %s", exc)
        _DEPT_CACHE[company_id] = TEAM_DEFAULTS
        return TEAM_DEFAULTS

async def create_department(dept: DepartmentContact) -> DepartmentContact:
    # Also register in email map for live dispatch
    DEPT_EMAIL_MAP[dept.name.lower().strip()] = dept.contact_email
    logger.info("Registered new department in email map: %s -> %s", dept.name, dept.contact_email)

    # Add to in-memory cache
    if dept.company_id in _DEPT_CACHE:
        _DEPT_CACHE[dept.company_id].append(dept)
    
    client = get_supabase()
    if not client:
        return dept
    
    try:
        res = client.table("departments").insert(dept.dict(exclude={"id"})).execute()
        if res.data:
            return DepartmentContact(**res.data[0])
    except Exception as exc:
        logger.error("Failed to create department: %s", exc)
    return dept
