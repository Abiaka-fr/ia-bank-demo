"""Database session configuration."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

# Pooled: with a remote DB (Neon), a fresh TLS connection per request costs ~500 ms
# vs ~150 ms reused. pre_ping drops connections Neon closed while idle/suspended.
engine = create_engine(
    settings.database_url,
    echo=False,  # Disable SQL query logging (use logging config instead)
    pool_pre_ping=True,
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
