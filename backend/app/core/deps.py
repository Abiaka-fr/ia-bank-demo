"""Shared FastAPI dependencies for authentication."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db import get_db
from app.models.user import User

# tokenUrl is only used to populate the "Authorize" button in /docs.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/signin")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Resolve the authenticated user from the 'Authorization: Bearer <token>' header."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_error

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_error

    return user


# `User.role` is a free string: either the profile code or the French label the user
# screen stores (same mapping as frontend/src/lib/access-profile.ts).
ADMIN_ROLES = {"COMPLIANCE_ADMIN", "Admin Base de Connaissances"}
READ_ONLY_ROLES = {"AUDITOR", "Auditeur Interne"}


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Only an administrator may change roles."""
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator role required")
    return current_user


def require_writer(current_user: User = Depends(get_current_user)) -> User:
    """Auditors consult; they never upload, analyse, decide or delete."""
    if current_user.role in READ_ONLY_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Read-only role")
    return current_user
