"""User management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.user import UserListResponse, UserRead

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=UserListResponse)
def list_users(
    role: str | None = Query(None, description="Filter by role (e.g., COMPLIANCE_OFFICER)"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=200, description="Max results per page"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserListResponse:
    """
    Get a list of users with optional filtering.

    **Query Parameters:**
    - `role` (optional): Filter by role (e.g., COMPLIANCE_OFFICER)
    - `is_active` (optional): Filter by active status (true/false)
    - `limit`: Max results to return (default 50, max 200)
    - `offset`: Number of results to skip for pagination (default 0)

    **Example URLs:**
    - `/api/users?limit=100`
    - `/api/users?role=COMPLIANCE_OFFICER`
    - `/api/users?is_active=true`
    - `/api/users?role=COMPLIANCE_OFFICER&is_active=true`
    """
    query = db.query(User)

    if role is not None:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    items = query.offset(offset).limit(limit).all()

    return UserListResponse(
        total=total,
        items=[UserRead.model_validate(user) for user in items],
        limit=limit,
        offset=offset,
    )


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    """Get a single user by ID."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return UserRead.model_validate(user)
