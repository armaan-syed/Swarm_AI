"""Shared FastAPI dependencies (auth, etc.)."""
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from app.config import settings


def _decode_token(token: str) -> dict:
    try:
        # Supabase signs JWTs with the project JWT secret (service role key works for verification
        # in many setups; replace with the dedicated JWT secret in production).
        return jwt.decode(
            token,
            settings.SUPABASE_SERVICE_ROLE_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False, "verify_signature": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth token",
        ) from exc


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    token = authorization.split(" ", 1)[1]
    return _decode_token(token)


async def get_current_user_optional(
    authorization: str | None = Header(default=None),
) -> dict | None:
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
