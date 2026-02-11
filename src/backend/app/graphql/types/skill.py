"""Strawberry GraphQL type for Skill model."""

import strawberry

from app.models.enums import SkillCategory


@strawberry.type
class SkillType:
    """GraphQL type for Skill."""

    id: str
    name: str
    slug: str
    category: SkillCategory
