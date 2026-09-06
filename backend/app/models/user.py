"""User model for authentication and authorization."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String

from app.db.base import Base


def _generate_user_id() -> str:
    """Generate a unique user id, consistent with the string-id style used by other tables."""
    return f"USR-{uuid.uuid4().hex}"


class User(Base):
    """Represents an application user (e.g. a Compliance Officer)."""

    __tablename__ = "users"

    user_id = Column(String, primary_key=True, default=_generate_user_id)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    # TODO: confirm allowed role values against docs/api-contract.md / docs/glossary.md
    role = Column(String, nullable=False, default="COMPLIANCE_OFFICER")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
