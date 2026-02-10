# F5: Discovery & Search -- Systems Design

**Feature**: Discovery & Search
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.
**Source**: Extracted from [SYSTEMS_DESIGN.md](../SYSTEMS_DESIGN.md)

---

## Table of Contents

1. [Full-Text Search Implementation](#full-text-search-implementation)
2. [Vector Search with pgvector](#vector-search-with-pgvector)
3. [MCP Server Architecture](#mcp-server-architecture)
4. [Embedding Pipeline](#embedding-pipeline)
5. [AI Search Flow (End-to-End)](#ai-search-flow-end-to-end)
6. [Hybrid Search Scoring](#hybrid-search-scoring)
7. [Claude API Integration](#claude-api-integration)
8. [Caching Strategy for Search Results](#caching-strategy-for-search-results)
9. [Pagination for Search](#pagination-for-search)

---

## Full-Text Search Implementation

### Users Search Vector

```sql
-- Trigger function for users search vector
CREATE OR REPLACE FUNCTION users_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.headline, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.primary_role, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_search_vector_trigger
  BEFORE INSERT OR UPDATE OF display_name, headline, primary_role, username
  ON users
  FOR EACH ROW EXECUTE FUNCTION users_search_vector_update();
```

### Projects Search Vector

```sql
-- Trigger function for projects search vector
CREATE OR REPLACE FUNCTION projects_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.tech_stack, '{}'), ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, tech_stack
  ON projects
  FOR EACH ROW EXECUTE FUNCTION projects_search_vector_update();
```

### Query Example

```sql
SELECT id, display_name, headline,
       ts_rank(search_vector, query) AS rank
FROM users, plainto_tsquery('english', 'react native designer') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

### GIN Indexes for Full-Text Search

```sql
-- Full-text search (GIN indexes)
CREATE INDEX idx_users_search ON users USING GIN (search_vector);
CREATE INDEX idx_projects_search ON projects USING GIN (search_vector);

-- Tech stack search (GIN for array containment)
CREATE INDEX idx_projects_tech_stack ON projects USING GIN (tech_stack);
```

### SQLAlchemy Integration

All database access goes through SQLAlchemy ORM, which uses parameterized queries exclusively.

```python
# Safe: parameterized via SQLAlchemy
from sqlalchemy import func

query = select(User).where(
    User.search_vector.match(search_term)  # SQLAlchemy generates parameterized query
).order_by(
    func.ts_rank(User.search_vector, func.plainto_tsquery("english", search_term)).desc()
)
```

---

## Vector Search with pgvector

### `embeddings` Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| source_type | VARCHAR(20) | NOT NULL | 'user', 'project' |
| source_id | UUID | NOT NULL | FK to users or projects |
| embedding | VECTOR(1536) | NOT NULL | OpenAI-compatible dimension |
| content_hash | VARCHAR(64) | NOT NULL | SHA-256 of input text; skip recompute if unchanged |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique constraint**: (source_type, source_id)

### Vector Index

```sql
-- Vector similarity search (HNSW for approximate nearest neighbor)
CREATE INDEX idx_embeddings_vector ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_embeddings_source ON embeddings (source_type, source_id);
```

**Storage**: pgvector extension in the same PostgreSQL database.
- Dimension: 1536 (compatible with common embedding models)
- Index: HNSW with cosine similarity
- This is sufficient for V1 scale (< 100K builders, < 500K projects)
- Future: If scale exceeds ~1M vectors, consider a dedicated vector database (Pinecone, Qdrant)

**HNSW chosen over IVFFlat** because it does not require retraining and works well up to ~1M vectors.

---

## MCP Server Architecture

The MCP (Model Context Protocol) server is a standalone Python service that exposes AI-powered tools
via the MCP protocol. The backend communicates with it programmatically -- it is NOT a Claude Desktop
integration. The backend acts as the MCP client.

### Server Structure

```
src/mcp/
  server.py                    # MCP server entrypoint (FastMCP)
  config.py                    # Configuration (API keys, DB connection)
  tools/
    __init__.py
    search_builders.py         # Natural language builder search
    match_tribe.py             # Find matching builders for a tribe
    analyze_project.py         # Extract metadata from a project URL
    suggest_collaborators.py   # Recommend co-builders
  embeddings/
    __init__.py
    generator.py               # Generate embeddings from text
    store.py                   # pgvector storage and retrieval
    pipeline.py                # Orchestrates embedding creation/updates
  prompts/
    search_prompt.py           # System prompts for search interpretation
    analysis_prompt.py         # Prompts for project analysis
  db.py                        # Database connection (read-only for queries)
```

### Tool Registration

```python
# server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("find-your-tribe")

@mcp.tool()
async def search_builders(query: str) -> list[dict]:
    """Search for builders using natural language.

    Examples:
    - "React Native developers in PST timezone"
    - "Designers who have shipped B2B SaaS products"
    - "Full-stack engineers open to joining a tribe"

    Returns a ranked list of matching builder profiles.
    """
    # 1. Use Claude to parse intent (skills, role, timezone, availability)
    # 2. Generate embedding of the query
    # 3. Combine vector similarity + structured filters
    # 4. Return ranked results
    ...

@mcp.tool()
async def match_tribe(
    skills_needed: list[str],
    timezone_preference: str | None = None,
    project_type: str | None = None
) -> list[dict]:
    """Find builders who complement the skills a tribe needs."""
    ...

@mcp.tool()
async def analyze_project(url: str) -> dict:
    """Analyze a project URL (GitHub repo, website) and extract metadata.

    Returns: title, description, tech stack, languages, stars, last commit date.
    """
    ...

@mcp.tool()
async def suggest_collaborators(builder_id: str) -> list[dict]:
    """Suggest potential collaborators for a builder based on complementary skills
    and shared tech stack interests."""
    ...
```

### Backend <-> MCP Server Communication

```
FastAPI Backend                              MCP Server (port 8100)
     |                                            |
     | 1. User triggers AI search in frontend     |
     |                                            |
     | 2. GraphQL resolver calls MCP client       |
     |    client = MCPClient("http://mcp:8100")   |
     |                                            |
     | 3. client.call_tool(                       |
     |      "search_builders",                    |
     |      {"query": "react designer PST"}       |
     |    )                                       |
     | -----------------------------------------> |
     |    (HTTP/SSE transport, MCP JSON-RPC)      |
     |                                            |
     |                                4. MCP server:
     |                                   a. Calls Claude API to parse query
     |                                   b. Generates query embedding
     |                                   c. Queries pgvector for similar builders
     |                                   d. Applies structured filters
     |                                   e. Ranks and returns results
     |                                            |
     | <----------------------------------------- |
     |    JSON response: [{builder}, {builder}]   |
     |                                            |
     | 4. Resolver formats response               |
     |    for GraphQL return type                  |
     v                                            v
```

The backend uses the official `mcp` Python SDK as a client:
```python
# services/ai_service.py
from mcp import ClientSession
from mcp.client.sse import sse_client

class AIService:
    def __init__(self, mcp_url: str):
        self.mcp_url = mcp_url

    async def search_builders(self, query: str) -> list[dict]:
        async with sse_client(self.mcp_url) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(
                    "search_builders",
                    arguments={"query": query}
                )
                return result.content
```

---

## Embedding Pipeline

### What Gets Embedded

| Source | Text Assembled For Embedding | Trigger |
|--------|------------------------------|---------|
| Builder profile | `{display_name}. {headline}. Role: {primary_role}. Skills: {skills joined}. {availability}.` | Profile create/update |
| Project | `{title}. {description}. Tech: {tech_stack joined}. Status: {status}.` | Project create/update |

### When Embeddings Are Generated/Updated

1. **On create**: Background task enqueued immediately after profile/project creation
2. **On update**: Background task enqueued after relevant field changes; `content_hash` is checked to skip recomputation if text hasn't changed
3. **Batch recomputation**: Scheduled nightly job recomputes any embeddings where the source has been modified since the embedding was last updated (catch-up for failed tasks)

### Generation Flow

```
Profile/Project saved
       |
       v
[Compute SHA-256 of assembled text]
       |
       v
[Compare with stored content_hash] --Same--> [Skip, no update needed]
       |
       Different
       v
[Call embedding API (Claude/Voyage AI)]
       |
       v
[Upsert into embeddings table with new vector + content_hash]
```

---

## AI Search Flow (End-to-End)

```
User                      Next.js                 FastAPI              MCP Server          Claude API       PostgreSQL
  |                          |                       |                     |                   |               |
  | 1. Type natural          |                       |                     |                   |               |
  |    language query:       |                       |                     |                   |               |
  |    "React designer       |                       |                     |                   |               |
  |     in PST timezone      |                       |                     |                   |               |
  |     who shipped fintech" |                       |                     |                   |               |
  |------------------------->|                       |                     |                   |               |
  |                          |---aiSearch(query)---->|                     |                   |               |
  |                          |                       |                     |                   |               |
  |                          |                       | 2. Call MCP tool    |                   |               |
  |                          |                       |---search_builders-->|                   |               |
  |                          |                       |   (query)           |                   |               |
  |                          |                       |                     |                   |               |
  |                          |                       |                     | 3. Parse query    |               |
  |                          |                       |                     |---extract intent->|               |
  |                          |                       |                     |<--structured------|               |
  |                          |                       |                     |   filters         |               |
  |                          |                       |                     |                   |               |
  |                          |                       |                     | 4. Generate       |               |
  |                          |                       |                     |    query embedding|               |
  |                          |                       |                     |---embed(text)---->|               |
  |                          |                       |                     |<--vector----------|               |
  |                          |                       |                     |                   |               |
  |                          |                       |                     | 5. Hybrid search: |               |
  |                          |                       |                     |    a. Vector similarity           |
  |                          |                       |                     |    b. Structured filters          |
  |                          |                       |                     |    c. Full-text search            |
  |                          |                       |                     |---SQL query-------------------->|
  |                          |                       |                     |<--ranked results----------------|
  |                          |                       |                     |                   |               |
  |                          |                       |                     | 6. Score fusion   |               |
  |                          |                       |                     |    (RRF or linear |               |
  |                          |                       |                     |     combination)  |               |
  |                          |                       |                     |                   |               |
  |                          |                       |<--ranked builders---|                   |               |
  |                          |                       |                     |                   |               |
  |                          |                       | 7. Hydrate full     |                   |               |
  |                          |                       |    user profiles    |                   |               |
  |                          |                       |---SELECT users------------------------------>|
  |                          |                       |<--user data---------------------------------|
  |                          |                       |                     |                   |               |
  |                          |<--search results------|                     |                   |               |
  |<--render results---------|                       |                     |                   |               |
```

---

## Hybrid Search Scoring

**Reciprocal Rank Fusion (RRF)**:
```
final_score = (1 / (k + vector_rank)) + (1 / (k + fts_rank)) + filter_bonus
```
Where `k = 60` (standard RRF constant), and `filter_bonus` adds weight when structured filters match exactly.

The search combines three signals:
1. **Vector similarity** -- semantic match via pgvector cosine similarity
2. **Full-text search** -- keyword match via PostgreSQL tsvector/tsquery with ts_rank
3. **Structured filters** -- exact match on role, timezone, availability, skills

---

## Claude API Integration

The MCP server uses the Claude API for two purposes:

### 1. Query Interpretation

Parse natural language search queries into structured filters:
```
User query: "React designer in PST who's shipped a fintech product"
Claude extracts: {
  skills: ["React", "UI Design"],
  role: "designer",
  timezone: "America/Los_Angeles",
  project_domain: "fintech",
  availability: any
}
```

### 2. Project Analysis

Analyze a URL to extract metadata:
```
Claude analyzes GitHub repo README + metadata to produce:
{
  description: "...",
  tech_stack: ["Next.js", "PostgreSQL", "Stripe"],
  category: "fintech",
  maturity: "shipped"
}
```

**Model selection**: Use `claude-sonnet-4-20250514` for cost-effective, fast responses on structured extraction tasks. Reserve `claude-opus-4-0-20250115` for complex analysis if needed.

---

## Caching Strategy for Search Results

| What | Cache Location | TTL | Invalidation |
|------|---------------|-----|--------------|
| Parsed search queries | In-memory (LRU, 1000 entries) | 1 hour | Same query string = cache hit |
| Builder search results | In-memory (LRU, 500 entries) | 5 minutes | Short TTL because builder data changes |
| Project analysis results | PostgreSQL (stored on project) | Indefinite | Re-analyze on explicit user request |
| Embedding vectors | PostgreSQL (embeddings table) | Indefinite | Recomputed on source content change |

V1 uses in-memory caching (`cachetools.TTLCache`). Future: Redis for shared caching across instances.

---

## Pagination for Search

**Offset-based** (for search results and filtered lists):
```graphql
type UserSearchResult {
  users: [User!]!
  totalCount: Int!
  page: Int!
  pageSize: Int!
}

# Usage
query {
  searchUsers(query: "react designer", page: 1, pageSize: 20) {
    users { ... }
    totalCount
  }
}
```

Offset pagination is acceptable for search because:
- Users rarely paginate beyond page 3-4 in search results
- Full-text search with `ts_rank` ordering is hard to cursor-paginate
- `totalCount` is useful for search UX

### GraphQL Schema (Search)

```
src/backend/schema/
  queries/
    search_queries.py  # aiSearch(query) -- delegates to MCP
```

Cache strategy for search:
- **Search results**: `network-only` (always fresh)
