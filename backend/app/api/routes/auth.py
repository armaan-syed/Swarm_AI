"""Authentication routes (Supabase JWT)."""
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.schemas import UserOut, LoginRequest, AuthResponse
from app.db.supabase_client import get_supabase

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    client = get_supabase()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        # Sign in through Supabase Auth
        res = client.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
        if not res.user or not res.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return AuthResponse(
            access_token=res.session.access_token,
            token_type=res.session.token_type,
            user=UserOut(id=res.user.id, email=res.user.email)
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: LoginRequest) -> AuthResponse:
    client = get_supabase()
    if not client:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        # Sign up through Supabase Auth
        res = client.auth.sign_up({"email": payload.email, "password": payload.password})
        if not res.user or not res.session:
            raise HTTPException(status_code=400, detail="Signup failed or email confirmation required.")
        return AuthResponse(
            access_token=res.session.access_token,
            token_type=res.session.token_type,
            user=UserOut(id=res.user.id, email=res.user.email)
        )
    except Exception as e:
        # Capture error directly from Supabase
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(id=user.get("sub", ""), email=user.get("email", ""))
