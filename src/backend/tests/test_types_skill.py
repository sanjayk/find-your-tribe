"""Tests for SkillType GraphQL type."""

from unittest.mock import MagicMock

from app.graphql.types.skill import SkillType
from app.models.enums import SkillCategory
from app.models.skill import Skill


class TestSkillType:
    """Tests for the SkillType Strawberry type."""

    def test_is_strawberry_type(self):
        """SkillType is a valid Strawberry type."""
        assert hasattr(SkillType, "__strawberry_definition__")

    def test_has_required_fields(self):
        """SkillType has id, name, slug, and category fields."""
        fields = {
            field.name for field in SkillType.__strawberry_definition__.fields
        }
        assert "id" in fields
        assert "name" in fields
        assert "slug" in fields
        assert "category" in fields

    def test_field_types(self):
        """id, name, slug are str; category is SkillCategory enum."""
        field_map = {
            field.name: field for field in SkillType.__strawberry_definition__.fields
        }
        assert field_map["id"].type is str
        assert field_map["name"].type is str
        assert field_map["slug"].type is str
        # category is wrapped as a Strawberry enum
        category_field = field_map["category"]
        assert hasattr(category_field.type, "wrapped_cls")
        assert category_field.type.wrapped_cls is SkillCategory

    def test_instantiation(self):
        """SkillType can be constructed with all fields."""
        skill = SkillType(
            id="01HQZXYZ123456789ABCDEFGH",
            name="Python",
            slug="python",
            category=SkillCategory.ENGINEERING,
        )
        assert skill.id == "01HQZXYZ123456789ABCDEFGH"
        assert skill.name == "Python"
        assert skill.slug == "python"
        assert skill.category == SkillCategory.ENGINEERING

    def test_from_model(self):
        """SkillType.from_model() converts a Skill model to SkillType."""
        model = MagicMock(spec=Skill)
        model.id = "01HQZXYZ123456789ABCDEFGH"
        model.name = "React"
        model.slug = "react"
        model.category = SkillCategory.ENGINEERING

        result = SkillType.from_model(model)

        assert isinstance(result, SkillType)
        assert result.id == "01HQZXYZ123456789ABCDEFGH"
        assert result.name == "React"
        assert result.slug == "react"
        assert result.category == SkillCategory.ENGINEERING

    def test_from_model_data_category(self):
        """SkillType.from_model() works with DATA category."""
        model = MagicMock(spec=Skill)
        model.id = "01SKILL_PG_00000000000"
        model.name = "PostgreSQL"
        model.slug = "postgresql"
        model.category = SkillCategory.DATA

        result = SkillType.from_model(model)

        assert result.category == SkillCategory.DATA
        assert result.slug == "postgresql"

    def test_from_model_preserves_all_fields(self):
        """from_model() preserves every field from the model."""
        model = MagicMock(spec=Skill)
        model.id = "unique_id"
        model.name = "Figma"
        model.slug = "figma"
        model.category = SkillCategory.DESIGN

        result = SkillType.from_model(model)

        assert result.id == model.id
        assert result.name == model.name
        assert result.slug == model.slug
        assert result.category == model.category

    def test_different_categories(self):
        """SkillType works with all SkillCategory values."""
        for category in SkillCategory:
            skill = SkillType(
                id="test_id",
                name=f"Skill_{category.value}",
                slug=f"skill-{category.value}",
                category=category,
            )
            assert skill.category == category
