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
    admin_client = get_supabase()  # Uses SERVICE_ROLE_KEY
    auth_client = get_supabase_auth() # Uses ANON_KEY
    
    if not admin_client or not auth_client:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    
    try:
        # 1. Create and auto-verify user via Admin API
        # This bypasses the email confirmation requirement for the demo
        admin_client.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True
        })
        
        # 2. Log in immediately after creation to get a session
        res = auth_client.auth.sign_in_with_password({
            "email": payload.email, 
            "password": payload.password
        })
        
        if not res.user or not res.session:
            raise HTTPException(status_code=400, detail="Signup succeeded but session creation failed.")
            
        return AuthResponse(
            access_token=res.session.access_token,
            token_type=res.session.token_type,
            user=UserOut(id=res.user.id, email=res.user.email)
        )
    except Exception as e:
        # If user already exists, try to log them in directly
        if "already registered" in str(e).lower():
            try:
                res = auth_client.auth.sign_in_with_password({
                    "email": payload.email, 
                    "password": payload.password
                })
                if res.user and res.session:
                    return AuthResponse(
                        access_token=res.session.access_token,
                        token_type=res.session.token_type,
                        user=UserOut(id=res.user.id, email=res.user.email)
                    )
            except Exception:
                pass
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(id=user.get("sub", ""), email=user.get("email", ""))
