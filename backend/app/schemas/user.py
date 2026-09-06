"""Pydantic schemas for authentication and user data."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Payload for POST /api/auth/signup."""

    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None


class UserLogin(BaseModel):
    """Payload for POST /api/auth/signin."""

    email: EmailStr
    password: str


class UserRead(BaseModel):
    """User data returned to the client — never includes the password hash."""

    user_id: str
    email: EmailStr
    full_name: str | None = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT access token returned after a successful signup/signin."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead
