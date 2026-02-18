"""Strawberry GraphQL types for Tribe model."""

from datetime import datetime
from typing import TYPE_CHECKING

import strawberry

from app.models.enums import MemberRole, MemberStatus, TribeStatus

if TYPE_CHECKING:
    from app.models.tribe import Tribe as TribeModel


@strawberry.type
class TribeType:
    """GraphQL type for Tribe."""

    id: str
    name: str
    mission: str | None
    status: TribeStatus
    max_members: int
    created_at: datetime
    updated_at: datetime

    _owner: strawberry.Private[object | None]
    _members: strawberry.Private[list]
    _open_roles: strawberry.Private[list]

    @strawberry.field
    def owner(self) -> "UserType":
        return self._owner  # type: ignore[return-value]

    @strawberry.field
    def members(self) -> list["TribeMemberType"]:
        return self._members  # type: ignore[return-value]

    @strawberry.field
    def open_roles(self) -> list["OpenRoleType"]:
        return self._open_roles  # type: ignore[return-value]

    @classmethod
    def from_model(cls, tribe: "TribeModel") -> "TribeType":
        owner_type = None
        if tribe.owner is not None:
            owner_type = UserType.from_model(tribe.owner)

        member_types = []
        for member in (tribe.members or []):
            member_user = UserType.from_model(member)
            member_types.append(
                TribeMemberType(
                    user=member_user,
                    role=MemberRole.MEMBER,
                    status=MemberStatus.ACTIVE,
                    joined_at=None,
                )
            )

        open_role_types = [
            OpenRoleType(
                id=r.id,
                title=r.title,
                skills_needed=r.skills_needed,
                filled=r.filled,
            )
            for r in (tribe.open_roles or [])
        ]

        return cls(
            id=tribe.id,
            name=tribe.name,
            mission=tribe.mission,
            status=tribe.status,
            max_members=tribe.max_members,
            created_at=tribe.created_at,
            updated_at=tribe.updated_at,
            _owner=owner_type,
            _members=member_types,
            _open_roles=open_role_types,
        )


@strawberry.type
class TribeMemberType:
    """GraphQL type for TribeMember."""

    user: "UserType"
    role: MemberRole
    status: MemberStatus
    joined_at: datetime | None


@strawberry.type
class OpenRoleType:
    """GraphQL type for TribeOpenRole."""

    id: str
    title: str
    skills_needed: strawberry.scalars.JSON
    filled: bool


# Import after class definitions to avoid circular import at module level
from app.graphql.types.user import UserType  # noqa: E402
