"""Application configuration and settings.

Uses Pydantic Settings to load configuration from environment variables
with proper typing and defaults.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = "postgresql+asyncpg://tribe:tribe@localhost:5432/tribe"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
