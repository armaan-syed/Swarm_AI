from fastapi import APIRouter, HTTPException, Depends
from app.services.department_service import DepartmentContact, list_departments, create_department


router = APIRouter()

@router.get("/{company_id}", response_model=list[DepartmentContact])
async def get_departments(company_id: str):
    return await list_departments(company_id)

@router.post("", response_model=DepartmentContact)
async def add_department(dept: DepartmentContact):
    return await create_department(dept)
