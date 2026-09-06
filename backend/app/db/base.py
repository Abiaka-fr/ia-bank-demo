"""SQLAlchemy declarative base and model imports for Alembic."""

from sqlalchemy.orm import declarative_base

# Create declarative base
Base = declarative_base()

# Import all models here so Alembic can see them
# This ensures all models are registered with the Base before migrations run
from app.models.audit import AuditHistory  # noqa: F401, E402
from app.models.control import Control  # noqa: F401, E402
from app.models.document import Document, DocumentChunk, DocumentVersion  # noqa: F401, E402
from app.models.mapping import RequirementProcedureMap  # noqa: F401, E402
from app.models.procedure import Procedure, ProcedureVersion  # noqa: F401, E402
from app.models.requirement import RegulatoryRequirement  # noqa: F401, E402
from app.models.source import OfficialPublicSource  # noqa: F401, E402
from app.models.user import User  # noqa: F401, E402

__all__ = [
    "Base",
    "Document",
    "DocumentVersion",
    "DocumentChunk",
    "RegulatoryRequirement",
    "Procedure",
    "ProcedureVersion",
    "Control",
    "RequirementProcedureMap",
    "AuditHistory",
    "OfficialPublicSource",
    "User",
]
