"""ULID generation utilities for database IDs."""

from ulid import ULID


def generate_ulid() -> str:
    """Generate a ULID string (26 characters, sortable by timestamp)."""
    return str(ULID())
