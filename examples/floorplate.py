"""The README's hand-worked floorplate, as code.

10 rooms in corridor order, all occupied, total 1,192 SF.
"""

from __future__ import annotations

from sro.model import Floorplate, Room, Scheme

AREAS = [100, 110, 165, 121, 100, 110, 165, 121, 100, 100]
TENANCIES = [5, 6, 14 / 12, 3, 10, 7, 10 / 12, 8 / 12, 12, 5]

EXAMPLE = Floorplate(
    rooms=[
        Room(id=str(i + 1), area_sf=float(a), tenancy_years=t)
        for i, (a, t) in enumerate(zip(AREAS, TENANCIES))
    ],
    name="Hand-worked example floor",
)

# Case 1 / Case 3: all ten rooms merged in adjacent pairs.
PAIRS = Scheme(
    groups=[("1", "2"), ("3", "4"), ("5", "6"), ("7", "8"), ("9", "10")],
    name="Case 1 - full conversion in pairs",
)

# Case 2: rooms 1-6 merged into three units; rooms 7-10 left as SRA rooms.
PARTIAL = Scheme(
    groups=[("1", "2"), ("3", "4"), ("5", "6")],
    name="Case 2 - partial conversion",
)
