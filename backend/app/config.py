"""Application configuration."""

from pydantic_settings import BaseSettings


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
    access_token_expire_minutes: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env


settings = Settings()
