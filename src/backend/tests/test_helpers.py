"""Tests for GraphQL helper utilities — AuthError and require_auth."""

from unittest.mock import MagicMock

import pytest

from app.graphql.context import Context
from app.graphql.helpers import AuthError, require_auth

# ---------------------------------------------------------------------------
# AuthError
# ---------------------------------------------------------------------------


class TestAuthError:
    """Tests for the AuthError exception class."""

    def test_default_message(self):
        """Default message is 'Authentication required'."""
        err = AuthError()
        assert str(err) == "Authentication required"
        assert err.message == "Authentication required"

    def test_default_code(self):
        """Default code is 'UNAUTHORIZED'."""
        err = AuthError()
        assert err.code == "UNAUTHORIZED"

    def test_custom_message(self):
        """Custom message is stored and used as string representation."""
        err = AuthError(message="Token expired")
        assert str(err) == "Token expired"
        assert err.message == "Token expired"

    def test_custom_code(self):
        """Custom code is stored."""
        err = AuthError(code="FORBIDDEN")
        assert err.code == "FORBIDDEN"

    def test_custom_message_and_code(self):
        """Both custom message and code can be set."""
        err = AuthError(message="Not allowed", code="FORBIDDEN")
        assert err.message == "Not allowed"
        assert err.code == "FORBIDDEN"
        assert str(err) == "Not allowed"

    def test_is_exception(self):
        """AuthError is an Exception subclass."""
        assert issubclass(AuthError, Exception)

    def test_can_be_raised_and_caught(self):
        """AuthError can be raised and caught."""
        with pytest.raises(AuthError) as exc_info:
            raise AuthError("Test error", "TEST_CODE")
        assert exc_info.value.message == "Test error"
        assert exc_info.value.code == "TEST_CODE"


# ---------------------------------------------------------------------------
# require_auth
# ---------------------------------------------------------------------------


class TestRequireAuth:
    """Tests for the require_auth helper function."""

    def _make_info(self, user_id: str | None) -> MagicMock:
        """Create a mock Strawberry Info object with a Context."""
        context = MagicMock(spec=Context)
        context.current_user_id = user_id
        info = MagicMock()
        info.context = context
        return info

    def test_returns_user_id_when_authenticated(self):
        """Returns user_id string when context has a current_user_id."""
        info = self._make_info("user_01HQZXYZ123456789A")
        result = require_auth(info)
        assert result == "user_01HQZXYZ123456789A"

    def test_raises_auth_error_when_no_user(self):
        """Raises AuthError when current_user_id is None."""
        info = self._make_info(None)
        with pytest.raises(AuthError) as exc_info:
            require_auth(info)
        assert exc_info.value.message == "Authentication required"

    def test_raises_auth_error_when_empty_string(self):
        """Raises AuthError when current_user_id is an empty string."""
        info = self._make_info("")
        with pytest.raises(AuthError):
            require_auth(info)

    def test_returns_exact_user_id(self):
        """The returned user_id is the exact string from context."""
        info = self._make_info("01ABCDEFGHJKMNPQRSTVWXYZ")
        result = require_auth(info)
        assert result == "01ABCDEFGHJKMNPQRSTVWXYZ"
