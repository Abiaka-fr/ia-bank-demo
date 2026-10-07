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
    # The default (5) is fewer than the requests one screen sends at once: each one beyond
    # it opened a throwaway connection, ~0.9 s more against Neon. Measured 2026-10-07 on
    # the hosted instance, 12 parallel /health: 5 answers in ~0.8 s, 7 in ~1.7 s.
    pool_size=20,
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
