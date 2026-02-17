"""Tests for app/config.py — configuration and settings."""

import os

from app.config import Settings


def test_settings_default_values():
    """Test that Settings loads with correct default values."""
    # Clear environment variables that might interfere
    env_vars = ["DATABASE_URL", "ENVIRONMENT", "DEBUG"]
    original_values = {var: os.environ.get(var) for var in env_vars}
    for var in env_vars:
        os.environ.pop(var, None)

    try:
        settings = Settings()

        assert settings.database_url == "postgresql+asyncpg://tribe:tribe@localhost:5433/tribe"
        assert settings.environment == "development"
        assert settings.debug is True
    finally:
        # Restore original environment
        for var, value in original_values.items():
            if value is not None:
                os.environ[var] = value


def test_settings_loads_from_environment():
    """Test that Settings loads from environment variables."""
    # Set environment variables
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://custom:custom@example.com:5432/custom"
    os.environ["ENVIRONMENT"] = "production"
    os.environ["DEBUG"] = "false"

    try:
        settings = Settings()

        assert settings.database_url == "postgresql+asyncpg://custom:custom@example.com:5432/custom"
        assert settings.environment == "production"
        assert settings.debug is False
    finally:
        # Clean up
        os.environ.pop("DATABASE_URL", None)
        os.environ.pop("ENVIRONMENT", None)
        os.environ.pop("DEBUG", None)


def test_settings_proper_typing():
    """Test that Settings fields have proper typing."""
    settings = Settings()

    assert isinstance(settings.database_url, str)
    assert isinstance(settings.environment, str)
    assert isinstance(settings.debug, bool)


def test_settings_singleton_behavior():
    """Test that Settings can be instantiated multiple times consistently."""
    settings1 = Settings()
    settings2 = Settings()

    assert settings1.database_url == settings2.database_url
    assert settings1.environment == settings2.environment
    assert settings1.debug == settings2.debug
