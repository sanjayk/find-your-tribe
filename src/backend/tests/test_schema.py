"""Tests for GraphQL schema — validates schema loads and exposes expected types/queries/mutations."""

import strawberry

from app.graphql.mutations import Mutation
from app.graphql.queries import Query
from app.graphql.schema import schema


class TestSchemaLoads:
    """Tests that the schema object is correctly constructed."""

    def test_schema_imports_successfully(self):
        """Schema can be imported without errors."""
        assert schema is not None

    def test_schema_is_strawberry_schema(self):
        """schema is an instance of strawberry.Schema."""
        assert isinstance(schema, strawberry.Schema)

    def test_schema_has_query_type(self):
        """Schema includes the Query type."""
        assert schema.query == Query

    def test_schema_has_mutation_type(self):
        """Schema includes the Mutation type."""
        assert schema.mutation == Mutation

    def test_schema_sdl_is_nonempty(self):
        """Schema produces a non-trivial SDL string."""
        sdl = schema.as_str()
        assert len(sdl) > 100


class TestSchemaQueries:
    """Tests for expected query fields in the schema."""

    def _query_field_names(self) -> list[str]:
        fields = schema.query.__strawberry_definition__.fields
        return [field.python_name for field in fields]

    def test_health_query_exists(self):
        """Schema exposes a 'health' query."""
        assert "health" in self._query_field_names()

    def test_user_query_exists(self):
        """Schema exposes a 'user' query."""
        assert "user" in self._query_field_names()

    def test_builders_query_exists(self):
        """Schema exposes a 'builders' query."""
        assert "builders" in self._query_field_names()

    def test_burn_summary_query_exists(self):
        """Schema exposes a 'burn_summary' query."""
        assert "burn_summary" in self._query_field_names()

    def test_burn_receipt_query_exists(self):
        """Schema exposes a 'burn_receipt' query."""
        assert "burn_receipt" in self._query_field_names()

    def test_project_query_exists(self):
        """Schema exposes a 'project' query."""
        assert "project" in self._query_field_names()

    def test_projects_query_exists(self):
        """Schema exposes a 'projects' query."""
        assert "projects" in self._query_field_names()

    def test_tribe_query_exists(self):
        """Schema exposes a 'tribe' query."""
        assert "tribe" in self._query_field_names()

    def test_tribes_query_exists(self):
        """Schema exposes a 'tribes' query."""
        assert "tribes" in self._query_field_names()

    def test_feed_query_exists(self):
        """Schema exposes a 'feed' query."""
        assert "feed" in self._query_field_names()


class TestSchemaMutations:
    """Tests for expected mutation namespaces in the schema."""

    def _mutation_field_names(self) -> list[str]:
        fields = schema.mutation.__strawberry_definition__.fields
        return [field.python_name for field in fields]

    def test_auth_mutations_exist(self):
        """Schema exposes 'auth' mutation namespace."""
        assert "auth" in self._mutation_field_names()

    def test_profile_mutations_exist(self):
        """Schema exposes 'profile' mutation namespace."""
        assert "profile" in self._mutation_field_names()

    def test_projects_mutations_exist(self):
        """Schema exposes 'projects' mutation namespace."""
        assert "projects" in self._mutation_field_names()

    def test_burn_mutations_exist(self):
        """Schema exposes 'burn' mutation namespace."""
        assert "burn" in self._mutation_field_names()

    def test_tribes_mutations_exist(self):
        """Schema exposes 'tribes' mutation namespace."""
        assert "tribes" in self._mutation_field_names()

    def test_feed_mutations_exist(self):
        """Schema exposes 'feed' mutation namespace."""
        assert "feed" in self._mutation_field_names()


class TestSchemaTypes:
    """Tests that key GraphQL types appear in the schema SDL."""

    def test_user_type_in_schema(self):
        """UserType is exposed in the schema."""
        sdl = schema.as_str()
        assert "type UserType" in sdl

    def test_project_type_in_schema(self):
        """ProjectType is exposed in the schema."""
        sdl = schema.as_str()
        assert "type ProjectType" in sdl

    def test_skill_type_in_schema(self):
        """SkillType is exposed in the schema."""
        sdl = schema.as_str()
        assert "type SkillType" in sdl

    def test_burn_summary_type_in_schema(self):
        """BurnSummaryType is exposed in the schema."""
        sdl = schema.as_str()
        assert "type BurnSummaryType" in sdl

    def test_burn_receipt_type_in_schema(self):
        """BurnReceiptType is exposed in the schema."""
        sdl = schema.as_str()
        assert "type BurnReceiptType" in sdl

    def test_burn_day_type_in_schema(self):
        """BurnDayType is exposed in the schema."""
        sdl = schema.as_str()
        assert "type BurnDayType" in sdl

    def test_auth_payload_type_in_schema(self):
        """AuthPayload is exposed in the schema."""
        sdl = schema.as_str()
        assert "type AuthPayload" in sdl

    def test_collaborator_type_in_schema(self):
        """CollaboratorType is exposed in the schema."""
        sdl = schema.as_str()
        assert "type CollaboratorType" in sdl
