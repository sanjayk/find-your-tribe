# F5: Discovery & Search — Tech Spec

> See [overview.md](./overview.md) for full architecture context.
> Depends on: [F2 Profiles](./f2-builder-profiles.md), [F3 Projects](./f3-projects.md), [F4 Tribes](./f4-tribes.md).

## Two Search Modes

1. **Structured Search** — filters + full-text search via PostgreSQL. Default mode. Fast, free.
2. **AI Search** — natural language queries via MCP server. "Find me a designer who's shipped B2B SaaS." Uses embeddings + Claude.

## Structured Search

### Builder Discovery

```python
@strawberry.input
class BuilderFilters:
    skills: list[str] | None = None        # Filter by skill slugs
    roles: list[str] | None = None         # Filter by primary_role
    availability: list[str] | None = None  # Filter by availability_status
    timezone: str | None = None            # Filter by timezone (exact or ±N hours)

@strawberry.type
class SearchResult:
    items: list[UserType]
    total_count: int
    has_more: bool

@strawberry.type
class Query:
    @strawberry.field
    async def search_builders(
        self,
        query: str | None = None,
        filters: BuilderFilters | None = None,
        limit: int = 20,
        offset: int = 0,
        info: strawberry.types.Info,
    ) -> SearchResult:
        return await search_service.search_builders(query, filters, limit, offset)
```

```python
# backend/services/search_service.py
async def search_builders(query, filters, limit, offset):
    stmt = select(User).where(User.onboarding_completed == True)

    # Full-text search
    if query:
        stmt = stmt.where(User.search_vector.match(query))
        stmt = stmt.order_by(
            func.ts_rank(User.search_vector, func.plainto_tsquery("english", query)).desc()
        )
    else:
        stmt = stmt.order_by(User.builder_score.desc())

    # Filters
    if filters:
        if filters.roles:
            stmt = stmt.where(User.primary_role.in_(filters.roles))
        if filters.availability:
            stmt = stmt.where(User.availability_status.in_(filters.availability))
        if filters.skills:
            stmt = stmt.where(
                User.id.in_(
                    select(UserSkill.user_id)
                    .join(Skill, UserSkill.skill_id == Skill.id)
                    .where(Skill.slug.in_(filters.skills))
                    .group_by(UserSkill.user_id)
                )
            )
        if filters.timezone:
            stmt = stmt.where(User.timezone == filters.timezone)

    # Count + paginate
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await session.scalar(count_stmt)
    results = await session.scalars(stmt.offset(offset).limit(min(limit, 50)))

    return SearchResult(
        items=[UserType.from_model(u) for u in results],
        total_count=total,
        has_more=(offset + limit) < total,
    )
```

### Project Discovery

```python
@strawberry.input
class ProjectFilters:
    tech_stack: list[str] | None = None
    status: list[str] | None = None  # shipped, in_progress
    sort_by: str = "recent"          # recent | stars | score

async def search_projects(query, filters, limit, offset):
    stmt = select(Project)

    if query:
        stmt = stmt.where(Project.search_vector.match(query))

    if filters:
        if filters.tech_stack:
            # JSONB array contains any of the specified tech
            for tech in filters.tech_stack:
                stmt = stmt.where(Project.tech_stack.contains([tech]))
        if filters.status:
            stmt = stmt.where(Project.status.in_(filters.status))

    # Sorting
    if not query:
        if filters and filters.sort_by == "stars":
            stmt = stmt.order_by(Project.github_stars.desc().nullslast())
        else:
            stmt = stmt.order_by(Project.created_at.desc())

    # paginate...
```

### Tribe Discovery

```python
@strawberry.input
class TribeFilters:
    skills_needed: list[str] | None = None  # Match against open role skills
    status: list[str] | None = None         # open, active

async def search_tribes(query, filters, limit, offset):
    stmt = select(Tribe)

    if query:
        stmt = stmt.where(Tribe.search_vector.match(query))

    if filters:
        if filters.status:
            stmt = stmt.where(Tribe.status.in_(filters.status))
        if filters.skills_needed:
            # Join with open roles that need matching skills
            stmt = stmt.where(
                Tribe.id.in_(
                    select(TribeOpenRole.tribe_id)
                    .where(
                        TribeOpenRole.filled == False,
                        TribeOpenRole.skills_needed.overlap(filters.skills_needed),
                    )
                )
            )

    stmt = stmt.order_by(Tribe.created_at.desc())
    # paginate...
```

## AI Search (MCP Server)

### MCP Tool: `search_builders`

```python
# mcp/tools/search_builders.py
@mcp.tool()
async def search_builders(query: str) -> list[dict]:
    """
    Natural language search for builders.

    Examples:
    - "designer who's shipped B2B SaaS products"
    - "backend engineer with Python and PostgreSQL experience, PST timezone"
    - "growth marketer for a fintech startup"

    Args:
        query: Natural language description of the builder you're looking for

    Returns:
        List of matching builder profiles with relevance scores
    """
    # 1. Generate embedding for the query
    query_embedding = await generate_embedding(query)

    # 2. Vector similarity search against user embeddings
    vector_results = await vector_search(
        table="users",
        embedding_column="embedding",
        query_embedding=query_embedding,
        limit=20,
    )

    # 3. Full-text search as a secondary signal
    fts_results = await full_text_search("users", query, limit=20)

    # 4. Reciprocal Rank Fusion to combine both result sets
    combined = reciprocal_rank_fusion(vector_results, fts_results)

    # 5. Return top results with user profile details
    return [format_builder_result(r) for r in combined[:10]]
```

### MCP Tool: `suggest_collaborators`

```python
# mcp/tools/suggest_collaborators.py
@mcp.tool()
async def suggest_collaborators(builder_id: str) -> list[dict]:
    """
    Suggest potential collaborators for a builder based on complementary skills
    and project history.

    Args:
        builder_id: The ID of the builder to suggest collaborators for

    Returns:
        List of suggested builders with reason for suggestion
    """
    # 1. Get builder's profile, skills, and projects
    builder = await get_builder_profile(builder_id)

    # 2. Build a description of what this builder might need
    prompt = f"""Given this builder's profile:
    - Role: {builder['role']}
    - Skills: {builder['skills']}
    - Projects: {builder['projects']}

    What complementary skills and roles would make a strong team?
    Return as a search query."""

    # 3. Use Claude to generate a search query
    search_query = await claude_generate(prompt)

    # 4. Search for matching builders
    results = await search_builders(search_query)

    # 5. Filter out the builder themselves and existing collaborators
    return filter_and_rank(results, builder_id)
```

### MCP Tool: `match_tribe`

```python
# mcp/tools/match_tribe.py
@mcp.tool()
async def match_tribe(
    skills_needed: list[str],
    preferences: dict | None = None,
) -> list[dict]:
    """
    Find builders who match a tribe's open role requirements.

    Args:
        skills_needed: List of skills the tribe is looking for
        preferences: Optional filters like timezone, availability

    Returns:
        Ranked list of matching builders
    """
    # 1. Build search query from skills + preferences
    query_parts = [f"builder with skills: {', '.join(skills_needed)}"]
    if preferences:
        if preferences.get("timezone"):
            query_parts.append(f"timezone: {preferences['timezone']}")
        if preferences.get("project_type"):
            query_parts.append(f"experience with: {preferences['project_type']}")

    query = " ".join(query_parts)

    # 2. Embedding search + structured filter
    query_embedding = await generate_embedding(query)
    results = await vector_search("users", "embedding", query_embedding, limit=30)

    # 3. Filter by availability and skills match
    filtered = [r for r in results if r.availability_status in ("open_to_tribe", "available_for_projects")]

    return filtered[:10]
```

## Embedding Pipeline

```python
# mcp/embeddings/generator.py
import anthropic

async def generate_embedding(text: str) -> list[float]:
    """Generate embedding using Voyage AI (via Anthropic partner)."""
    # Using voyage-3 for embeddings (1536 dimensions)
    response = await voyage_client.embed(
        texts=[text],
        model="voyage-3",
    )
    return response.embeddings[0]

async def generate_user_embedding(user_id: str):
    """Generate and store embedding for a user profile."""
    user = await get_user_with_details(user_id)

    text = f"""
    {user.display_name} - {user.headline or ''}
    Role: {user.primary_role or ''}
    Skills: {', '.join(s.name for s in user.skills)}
    Bio: {user.bio or ''}
    Projects: {', '.join(p.title + ': ' + (p.description or '') for p in user.projects[:5])}
    """.strip()

    embedding = await generate_embedding(text)
    await update_user_embedding(user_id, embedding)

async def generate_project_embedding(project_id: str):
    """Generate and store embedding for a project."""
    project = await get_project(project_id)

    text = f"""
    {project.title}
    {project.description or ''}
    Tech: {', '.join(project.tech_stack)}
    Status: {project.status}
    """.strip()

    embedding = await generate_embedding(text)
    await update_project_embedding(project_id, embedding)
```

## Frontend Pages

```
app/
├── discover/
│   ├── page.tsx              # Discovery hub (tabbed: builders, projects, tribes)
│   ├── builders/page.tsx     # Builder discovery with filters
│   ├── projects/page.tsx     # Project discovery with filters
│   └── tribes/page.tsx       # Tribe discovery with filters
```

### Discovery Page Layout
- Tab bar: Builders | Projects | Tribes
- Search input with AI toggle ("Search" vs "Ask AI")
- Filter sidebar (role, skills, availability, timezone)
- Results grid (BuilderCard / ProjectCard / TribeCard components)
- Pagination at bottom
