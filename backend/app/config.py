"""Application configuration."""

import logging
import os
from pydantic_settings import BaseSettings

# Create logs directory if it doesn't exist
try:
    os.makedirs("logs", exist_ok=True)
except Exception:
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("logs/app.log"),
        logging.StreamHandler(),
    ],
)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = ""

    # App
    environment: str = "development"
    debug: bool = True

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Auth (JWT)
    secret_key: str = "dev-secret-key-change-me"  # override via .env — never use in production
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # OpenRouter API (for pipeline ingestion)
    openrouter_api_key: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env


settings = Settings()
