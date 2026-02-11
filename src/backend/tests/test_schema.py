"""Tests for GraphQL schema."""

import strawberry

from app.graphql.mutations import Mutation
from app.graphql.queries import Query
from app.graphql.schema import schema


def test_schema_imports_successfully():
    """Test that schema can be imported without errors."""
    assert schema is not None


def test_schema_has_query_type():
    """Test that schema includes Query type."""
    assert schema.query == Query


def test_schema_has_mutation_type():
    """Test that schema includes Mutation type."""
    assert schema.mutation == Mutation


def test_schema_is_strawberry_schema():
    """Test that schema is a valid Strawberry schema instance."""
    assert isinstance(schema, strawberry.Schema)


def test_query_type_has_health_field():
    """Test that Query type includes health field."""
    query_type = schema.query
    assert hasattr(query_type, "__strawberry_definition__")
    # Check that health field exists in the schema definition
    fields = query_type.__strawberry_definition__.fields
    field_names = [field.python_name for field in fields]
    assert "health" in field_names


def test_mutation_type_has_placeholder():
    """Test that Mutation type exists with placeholder field."""
    mutation_type = schema.mutation
    assert hasattr(mutation_type, "__strawberry_definition__")
    # Mutation stub should have placeholder field for schema validation
    fields = mutation_type.__strawberry_definition__.fields
    field_names = [field.python_name for field in fields]
    assert "_placeholder" in field_names
