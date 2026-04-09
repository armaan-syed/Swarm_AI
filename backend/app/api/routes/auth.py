"""Authentication routes (Supabase JWT)."""
from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.schemas import UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(id=user.get("sub", ""), email=user.get("email", ""))
