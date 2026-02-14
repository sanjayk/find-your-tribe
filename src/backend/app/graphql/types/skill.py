"""Strawberry GraphQL type for Skill model."""

from __future__ import annotations

from typing import TYPE_CHECKING

import strawberry

from app.models.enums import SkillCategory

if TYPE_CHECKING:
    from app.models.skill import Skill


@strawberry.type
class SkillType:
    """GraphQL type for Skill."""

    id: str
    name: str
    slug: str
    category: SkillCategory

    @classmethod
    def from_model(cls, skill: Skill) -> SkillType:
        return cls(
            id=skill.id,
            name=skill.name,
            slug=skill.slug,
            category=skill.category,
        )
