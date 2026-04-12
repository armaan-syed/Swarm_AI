"""Authentication routes (Supabase JWT)."""
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.schemas import UserOut, LoginRequest, AuthResponse
from app.db.supabase_client import get_supabase, get_supabase_auth

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    client = get_supabase_auth()
    if not client:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")

    email = (payload.email or payload.username or "").strip()
    password = (payload.password or payload.access_key or "").strip()
    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="email and password are required (accepted aliases: username, access_key)",
        )

    try:
        # Sign in through Supabase Auth
        res = client.auth.sign_in_with_password({"email": email, "password": password})
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
    admin_client = get_supabase()  # Uses SERVICE_ROLE_KEY
    auth_client = get_supabase_auth() # Uses ANON_KEY
    
    if not admin_client or not auth_client:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    
    email = (payload.email or payload.username or "").strip()
    password = (payload.password or payload.access_key or "").strip()
    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="email and password are required (accepted aliases: username, access_key)",
        )

    try:
        # 1. Attempt to create and auto-verify user via Admin API
        # This bypasses the email confirmation requirement for the demo
        try:
            admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
        except Exception as e:
            # If user already exists, we ignore and proceed to login
            if "already registered" not in str(e).lower():
                raise HTTPException(status_code=400, detail=str(e))
        
        # 2. Log in immediately
        res = auth_client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if not res.user or not res.session:
            raise HTTPException(status_code=401, detail="Invalid credentials or session failed.")
            
        return AuthResponse(
            access_token=res.session.access_token,
            token_type=res.session.token_type,
            user=UserOut(id=res.user.id, email=res.user.email)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(id=user.get("sub", ""), email=user.get("email", ""))
