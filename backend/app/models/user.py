"""User model for authentication and authorization."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String

from app.db.base import Base
from app.utils.ulid_utils import generate_ulid


class User(Base):
    """Represents an application user (e.g. a Compliance Officer)."""

    __tablename__ = "users"

    user_id = Column(String(26), primary_key=True, default=generate_ulid)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    # TODO: confirm allowed role values against docs/api-contract.md / docs/glossary.md
    role = Column(String, nullable=False, default="COMPLIANCE_OFFICER")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
