"""Tests for github_service — repo listing and import."""

from unittest.mock import ANY, AsyncMock, MagicMock, patch

import pytest

from app.services import github_service

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_user(token: str = "test-token", user_id: str = "user01234567890123456"):
    user = MagicMock()
    user.id = user_id
    user.github_access_token_encrypted = token
    return user


def _make_http_response(status_code: int, json_data):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data
    response.text = str(json_data)
    return response


def _make_repo(
    full_name: str = "owner/my-cool-repo",
    name: str = "my-cool-repo",
    description: str = "A cool repo",
    html_url: str = "https://github.com/owner/my-cool-repo",
    homepage: str | None = None,
    language: str | None = "Python",
    stargazers_count: int = 10,
    forks_count: int = 2,
    archived: bool = False,
) -> dict:
    return {
        "full_name": full_name,
        "name": name,
        "description": description,
        "html_url": html_url,
        "homepage": homepage,
        "language": language,
        "stargazers_count": stargazers_count,
        "forks_count": forks_count,
        "archived": archived,
    }


def _patch_httpx(response) -> tuple:
    """Return (patch object, mock_client) for patching httpx.AsyncClient."""
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=response)
    mock_cls = MagicMock()
    mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
    mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)
    return mock_cls, mock_client


# ---------------------------------------------------------------------------
# _make_project_title
# ---------------------------------------------------------------------------


def test_make_project_title_hyphens():
    """Hyphens are replaced with spaces and result is title-cased."""
    assert github_service._make_project_title("my-cool-repo") == "My Cool Repo"


def test_make_project_title_underscores():
    """Underscores are replaced with spaces and result is title-cased."""
    assert github_service._make_project_title("my_cool_project") == "My Cool Project"


def test_make_project_title_mixed():
    """Mixed hyphens and underscores both become spaces."""
    assert github_service._make_project_title("my-cool_repo") == "My Cool Repo"


def test_make_project_title_plain():
    """Plain name is title-cased unchanged."""
    assert github_service._make_project_title("mytool") == "Mytool"


# ---------------------------------------------------------------------------
# list_importable_repos
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_importable_repos_calls_github_api():
    """list_importable_repos calls GitHub API with correct auth and params."""
    repos = [_make_repo()]
    response = _make_http_response(200, repos)
    mock_cls, mock_client = _patch_httpx(response)
    session = AsyncMock()

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.get_imported_repo_names",
            new=AsyncMock(return_value=set()),
        ),
    ):
        result = await github_service.list_importable_repos(session, _make_user())

    mock_client.get.assert_called_once_with(
        "https://api.github.com/user/repos",
        headers={"Authorization": "Bearer test-token"},
        params={"sort": "updated", "per_page": 100, "type": "owner"},
    )
    assert len(result) == 1
    assert result[0]["full_name"] == "owner/my-cool-repo"


@pytest.mark.asyncio
async def test_list_importable_repos_filters_already_imported():
    """Repos whose full_name is already imported are excluded."""
    repos = [
        _make_repo(full_name="owner/repo-a", name="repo-a"),
        _make_repo(full_name="owner/repo-b", name="repo-b"),
    ]
    response = _make_http_response(200, repos)
    mock_cls, _ = _patch_httpx(response)
    session = AsyncMock()

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.get_imported_repo_names",
            new=AsyncMock(return_value={"owner/repo-a"}),
        ),
    ):
        result = await github_service.list_importable_repos(session, _make_user())

    assert len(result) == 1
    assert result[0]["full_name"] == "owner/repo-b"


@pytest.mark.asyncio
async def test_list_importable_repos_no_token():
    """User with no GitHub token raises ValueError."""
    user = _make_user(token=None)
    with pytest.raises(ValueError, match="no GitHub access token"):
        await github_service.list_importable_repos(AsyncMock(), user)


@pytest.mark.asyncio
async def test_list_importable_repos_api_error():
    """Non-200 GitHub response raises ValueError with status code."""
    response = _make_http_response(403, {"message": "Forbidden"})
    mock_cls, _ = _patch_httpx(response)
    session = AsyncMock()

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        pytest.raises(ValueError, match="403"),
    ):
        await github_service.list_importable_repos(session, _make_user())


# ---------------------------------------------------------------------------
# import_repo
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_import_repo_happy_path():
    """import_repo creates a project with correct field mapping."""
    repo = _make_repo(
        full_name="owner/my-cool-repo",
        name="my-cool-repo",
        description="A great tool",
        html_url="https://github.com/owner/my-cool-repo",
        homepage="https://mycoolrepo.com",
        language="TypeScript",
        stargazers_count=42,
        forks_count=7,
        archived=False,
    )
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)
    session = AsyncMock()
    user = _make_user()

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ) as mock_create,
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ) as mock_set_meta,
    ):
        result = await github_service.import_repo(session, user, "owner/my-cool-repo")

    mock_create.assert_called_once_with(
        session,
        owner_id=user.id,
        title="My Cool Repo",
        description="A great tool",
        status="shipped",
        links={"repo": "https://github.com/owner/my-cool-repo", "live_url": "https://mycoolrepo.com"},
        tech_stack=["TypeScript"],
        impact_metrics={"stars": 42, "forks": 7},
    )
    mock_set_meta.assert_called_once_with(
        session,
        project_id=mock_project.id,
        repo_full_name="owner/my-cool-repo",
        stars=42,
    )
    assert result is mock_project


@pytest.mark.asyncio
async def test_import_repo_title_transformation():
    """Title hyphens and underscores are replaced with spaces and title-cased."""
    repo = _make_repo(name="my_cool-repo", full_name="owner/my_cool-repo")
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ) as mock_create,
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ),
    ):
        await github_service.import_repo(AsyncMock(), _make_user(), "owner/my_cool-repo")

    call_kwargs = mock_create.call_args.kwargs
    assert call_kwargs["title"] == "My Cool Repo"


@pytest.mark.asyncio
async def test_import_repo_archived_status():
    """Archived repo maps to 'archived' status."""
    repo = _make_repo(archived=True)
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ) as mock_create,
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ),
    ):
        await github_service.import_repo(AsyncMock(), _make_user(), "owner/my-cool-repo")

    assert mock_create.call_args.kwargs["status"] == "archived"


@pytest.mark.asyncio
async def test_import_repo_non_archived_status():
    """Non-archived repo maps to 'shipped' status."""
    repo = _make_repo(archived=False)
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ) as mock_create,
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ),
    ):
        await github_service.import_repo(AsyncMock(), _make_user(), "owner/my-cool-repo")

    assert mock_create.call_args.kwargs["status"] == "shipped"


@pytest.mark.asyncio
async def test_import_repo_no_homepage_omits_live_url():
    """Repo with no homepage does not include live_url in links."""
    repo = _make_repo(homepage=None)
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ) as mock_create,
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ),
    ):
        await github_service.import_repo(AsyncMock(), _make_user(), "owner/my-cool-repo")

    links = mock_create.call_args.kwargs["links"]
    assert "live_url" not in links
    assert links["repo"] == "https://github.com/owner/my-cool-repo"


@pytest.mark.asyncio
async def test_import_repo_non_https_homepage_omitted():
    """Repo with non-HTTPS homepage does not include live_url in links."""
    repo = _make_repo(homepage="http://insecure.example.com")
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ) as mock_create,
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ),
    ):
        await github_service.import_repo(AsyncMock(), _make_user(), "owner/my-cool-repo")

    links = mock_create.call_args.kwargs["links"]
    assert "live_url" not in links


@pytest.mark.asyncio
async def test_import_repo_no_language():
    """Repo with no language produces empty tech_stack."""
    repo = _make_repo(language=None)
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ) as mock_create,
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ),
    ):
        await github_service.import_repo(AsyncMock(), _make_user(), "owner/my-cool-repo")

    assert mock_create.call_args.kwargs["tech_stack"] == []


@pytest.mark.asyncio
async def test_import_repo_404_raises_value_error():
    """GitHub 404 raises ValueError with repo name."""
    response = _make_http_response(404, {"message": "Not Found"})
    mock_cls, _ = _patch_httpx(response)

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        pytest.raises(ValueError, match="owner/my-cool-repo"),
    ):
        await github_service.import_repo(
            AsyncMock(), _make_user(), "owner/my-cool-repo"
        )


@pytest.mark.asyncio
async def test_import_repo_api_error_raises_value_error():
    """Non-200/404 GitHub response raises ValueError."""
    response = _make_http_response(500, {"message": "Server Error"})
    mock_cls, _ = _patch_httpx(response)

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        pytest.raises(ValueError, match="500"),
    ):
        await github_service.import_repo(
            AsyncMock(), _make_user(), "owner/my-cool-repo"
        )


@pytest.mark.asyncio
async def test_import_repo_no_token():
    """User with no GitHub token raises ValueError."""
    user = _make_user(token=None)
    with pytest.raises(ValueError, match="no GitHub access token"):
        await github_service.import_repo(AsyncMock(), user, "owner/repo")


@pytest.mark.asyncio
async def test_import_repo_stores_github_metadata():
    """set_github_metadata is called with repo full_name and star count."""
    repo = _make_repo(full_name="owner/my-cool-repo", stargazers_count=99)
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ),
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ) as mock_set_meta,
    ):
        await github_service.import_repo(AsyncMock(), _make_user(), "owner/my-cool-repo")

    mock_set_meta.assert_called_once_with(
        ANY,
        project_id=mock_project.id,
        repo_full_name="owner/my-cool-repo",
        stars=99,
    )


@pytest.mark.asyncio
async def test_import_repo_no_description_defaults_to_empty_string():
    """Repo with None description creates project with empty string description."""
    repo = _make_repo(description=None)
    response = _make_http_response(200, repo)
    mock_cls, _ = _patch_httpx(response)

    mock_project = MagicMock()
    mock_project.id = "proj01234567890123456789"

    with (
        patch("app.services.github_service.httpx.AsyncClient", mock_cls),
        patch(
            "app.services.github_service.project_service.create",
            new=AsyncMock(return_value=mock_project),
        ) as mock_create,
        patch(
            "app.services.github_service.project_service.set_github_metadata",
            new=AsyncMock(),
        ),
    ):
        await github_service.import_repo(AsyncMock(), _make_user(), "owner/my-cool-repo")

    assert mock_create.call_args.kwargs["description"] == ""
