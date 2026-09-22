"""Input types: the floorplate the user has, and the scheme they propose.

Scope note (README, Out of Scope): a list of room areas cannot express which
rooms adjoin one another, so adjacency is the user's responsibility. Rooms are
held in corridor order and a group of *consecutive* rooms is reported as
adjacent; a group that skips rooms is flagged, not rejected.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence

from .rules import PERMANENT_RESIDENT_MIN_DAYS

DAYS_PER_YEAR = 365.0


@dataclass(frozen=True)
class Room:
    """One existing SRA-designated room."""

    id: str
    area_sf: float
    tenancy_years: Optional[float] = None  # None = vacant
    occupied: bool = True

    def __post_init__(self) -> None:
        if self.area_sf <= 0:
            raise ValueError(f"room {self.id}: area must be positive")
        if self.occupied and self.tenancy_years is None:
            raise ValueError(f"room {self.id}: occupied room needs a tenancy length")
        if self.tenancy_years is not None and self.tenancy_years < 0:
            raise ValueError(f"room {self.id}: tenancy length cannot be negative")

    @property
    def is_permanent_resident(self) -> bool:
        """SRA By-law s.1.2: occupancy as a residence for at least 30 days."""
        if not self.occupied or self.tenancy_years is None:
            return False
        return self.tenancy_years * DAYS_PER_YEAR >= PERMANENT_RESIDENT_MIN_DAYS


@dataclass(frozen=True)
class Floorplate:
    """One floor of an SRA-designated building, rooms in corridor order."""

    rooms: Sequence[Room]
    name: str = "floorplate"

    def __post_init__(self) -> None:
        if not self.rooms:
            raise ValueError("floorplate has no rooms")
        ids = [r.id for r in self.rooms]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"duplicate room ids: {sorted(dupes)}")

    @property
    def room_count(self) -> int:
        return len(self.rooms)

    @property
    def total_area_sf(self) -> float:
        return sum(r.area_sf for r in self.rooms)

    @property
    def by_id(self) -> Dict[str, Room]:
        return {r.id: r for r in self.rooms}

    def index_of(self, room_id: str) -> int:
        for i, r in enumerate(self.rooms):
            if r.id == room_id:
                return i
        raise KeyError(room_id)


@dataclass(frozen=True)
class Scheme:
    """A proposed combination: each group of room ids becomes one unit.

    Rooms named in no group are left as SRA rooms ("untouched"). A single-room
    group is a room converted in place without merging.
    """

    groups: Sequence[Sequence[str]]
    labels: Optional[Sequence[str]] = None
    name: str = "scheme"

    def __post_init__(self) -> None:
        seen: List[str] = []
        for g in self.groups:
            if not g:
                raise ValueError("a unit cannot be made of zero rooms")
            seen.extend(g)
        dupes = {i for i in seen if seen.count(i) > 1}
        if dupes:
            raise ValueError(f"room assigned to more than one unit: {sorted(dupes)}")
        if self.labels is not None and len(self.labels) != len(self.groups):
            raise ValueError("labels must match the number of groups")

    def label_for(self, i: int) -> str:
        if self.labels is not None:
            return self.labels[i]
        # A, B, ... Z, AA, AB, ...
        name, n = "", i
        while True:
            name = chr(ord("A") + n % 26) + name
            n = n // 26 - 1
            if n < 0:
                return name

    @property
    def assigned_ids(self) -> List[str]:
        return [rid for g in self.groups for rid in g]


@dataclass(frozen=True)
class Unit:
    """A self-contained unit produced by the scheme."""

    label: str
    room_ids: Sequence[str]
    area_sf: float
    adjacent: bool = True
    notes: List[str] = field(default_factory=list)

    @property
    def rooms_consumed(self) -> int:
        return len(self.room_ids)
