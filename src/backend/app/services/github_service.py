"""GitHub service — repo listing and import."""

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.user import User
from app.services import project_service

GITHUB_API_BASE = "https://api.github.com"


def _make_project_title(repo_name: str) -> str:
    """Convert a repo name to a human-readable title.

    Replaces hyphens and underscores with spaces and title-cases the result.
    Example: 'my-cool-repo' -> 'My Cool Repo'
    """
    return repo_name.replace("-", " ").replace("_", " ").title()


async def list_importable_repos(session: AsyncSession, user: User) -> list[dict]:
    """List GitHub repos owned by the user that have not yet been imported.

    Args:
        session: Async database session.
        user: The authenticated user whose repos to list.

    Returns:
        List of GitHub repo dicts, excluding already-imported repos.

    Raises:
        ValueError: If the user has no GitHub token or the API returns an error.
    """
    # TODO: Decrypt github_access_token_encrypted once the crypto module is implemented.
    # For now the field is treated as plaintext.
    token = user.github_access_token_encrypted
    if not token:
        raise ValueError("User has no GitHub access token")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GITHUB_API_BASE}/user/repos",
            headers={"Authorization": f"Bearer {token}"},
            params={"sort": "updated", "per_page": 100, "type": "owner"},
        )

    if response.status_code != 200:
        raise ValueError(
            f"GitHub API error fetching repos: {response.status_code} {response.text}"
        )

    repos: list[dict] = response.json()
    imported_names = await project_service.get_imported_repo_names(session, user.id)
    return [repo for repo in repos if repo["full_name"] not in imported_names]


async def import_repo(session: AsyncSession, user: User, repo_full_name: str) -> Project:
    """Import a GitHub repository as a project.

    Fetches repo details from the GitHub API, maps them to project fields,
    creates the project, and stores GitHub metadata.

    Args:
        session: Async database session.
        user: The authenticated user who will own the project.
        repo_full_name: GitHub repo full name (e.g. 'owner/repo-name').

    Returns:
        The newly created Project.

    Raises:
        ValueError: If the user has no GitHub token, the repo is not found,
                    or the API returns an error.
    """
    # TODO: Decrypt github_access_token_encrypted once the crypto module is implemented.
    # For now the field is treated as plaintext.
    token = user.github_access_token_encrypted
    if not token:
        raise ValueError("User has no GitHub access token")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GITHUB_API_BASE}/repos/{repo_full_name}",
            headers={"Authorization": f"Bearer {token}"},
        )

    if response.status_code == 404:
        raise ValueError(f"Repository not found: {repo_full_name}")
    if response.status_code != 200:
        raise ValueError(
            f"GitHub API error fetching repo: {response.status_code} {response.text}"
        )

    repo = response.json()

    title = _make_project_title(repo["name"])
    description = repo.get("description") or ""
    status = "archived" if repo.get("archived") else "shipped"

    links: dict = {"repo": repo["html_url"]}
    homepage = repo.get("homepage")
    if homepage and isinstance(homepage, str) and homepage.startswith("https://"):
        links["live_url"] = homepage

    language = repo.get("language")
    tech_stack = [language] if language else []

    impact_metrics: dict = {
        "stars": repo["stargazers_count"],
        "forks": repo["forks_count"],
    }

    project = await project_service.create(
        session,
        owner_id=user.id,
        title=title,
        description=description,
        status=status,
        links=links,
        tech_stack=tech_stack,
        impact_metrics=impact_metrics,
    )

    await project_service.set_github_metadata(
        session,
        project_id=project.id,
        repo_full_name=repo_full_name,
        stars=repo["stargazers_count"],
    )

    return project
