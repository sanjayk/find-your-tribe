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

        assert settings.DATABASE_URL == "postgresql+asyncpg://tribe:tribe@localhost:5432/tribe"
        assert settings.ENVIRONMENT == "development"
        assert settings.DEBUG is True
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

        assert settings.DATABASE_URL == "postgresql+asyncpg://custom:custom@example.com:5432/custom"
        assert settings.ENVIRONMENT == "production"
        assert settings.DEBUG is False
    finally:
        # Clean up
        os.environ.pop("DATABASE_URL", None)
        os.environ.pop("ENVIRONMENT", None)
        os.environ.pop("DEBUG", None)


def test_settings_proper_typing():
    """Test that Settings fields have proper typing."""
    settings = Settings()

    # DATABASE_URL should be a string
    assert isinstance(settings.DATABASE_URL, str)
    # ENVIRONMENT should be a string
    assert isinstance(settings.ENVIRONMENT, str)
    # DEBUG should be a boolean
    assert isinstance(settings.DEBUG, bool)


def test_settings_singleton_behavior():
    """Test that Settings can be instantiated multiple times consistently."""
    settings1 = Settings()
    settings2 = Settings()

    # Both should have the same default values
    assert settings1.DATABASE_URL == settings2.DATABASE_URL
    assert settings1.ENVIRONMENT == settings2.ENVIRONMENT
    assert settings1.DEBUG == settings2.DEBUG
