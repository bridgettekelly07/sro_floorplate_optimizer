"""Thresholds and citations from the source documents.

Every number here traces to a passage in `source/source_extract.md`; the
`Citation` attached to each rule is what the evaluator reports alongside a
pass/fail so a result is never a bare boolean. The thresholds are gathered in
a :class:`Policy`, whose default, :data:`SOURCE`, is the sources' own; the
evaluator and the search take a policy so that a different set of thresholds
can be tried against the same stock, which is what the browser tool's policy
panel does. The module-level constants remain as the source values.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class Citation:
    document: str
    clause: str
    quote: str
    passage: int  # passage number in source/source_extract.md

    def __str__(self) -> str:
        return f"{self.document}, {self.clause}"


# --- Thresholds -------------------------------------------------------------

MIN_UNIT_AREA_SF = 200.0        # SRA Guidelines p.4; restated DTES 9.2.11
MAX_ROOM_REDUCTION = 0.50       # SRA Guidelines p.4
MIN_REPLACEMENT_RATIO = 0.50    # DTES 9.2.7
SMALL_LOSS_MAX_ROOMS = 3        # SRA By-law s.4.3A
PERMANENT_RESIDENT_MIN_DAYS = 30  # SRA By-law s.1.2

# All thresholds are read as inclusive; see README, Interpretive Decisions.


@dataclass(frozen=True)
class Policy:
    """The thresholds a conversion is tested against.

    The default is the sources' own. Any other set is the user's, and the
    tool says so wherever it reports a result under it.
    """
    min_unit_area_sf: float = MIN_UNIT_AREA_SF
    max_room_reduction: float = MAX_ROOM_REDUCTION
    min_replacement_ratio: float = MIN_REPLACEMENT_RATIO
    small_loss_max_rooms: int = SMALL_LOSS_MAX_ROOMS
    permanent_resident_min_days: int = PERMANENT_RESIDENT_MIN_DAYS

    @property
    def is_source(self) -> bool:
        return self == SOURCE


SOURCE = Policy()

# --- Citations --------------------------------------------------------------

SIZE = Citation(
    document="SRA Guidelines",
    clause="p.4",
    quote=(
        "Converted SRA rooms that are at least 200 SF will be removed from the "
        "SRA By-law, subject to Council approval. If a minimum of 200 SF for a "
        "converted room cannot be achieved, an average of 200 SF across all "
        "converted rooms will be considered for removal from the SRA By-law."
    ),
    passage=1,
)

ROOM_COUNT = Citation(
    document="SRA Guidelines",
    clause="p.4",
    quote=(
        "To enable the conversion of rooms to self-contained units, a reduction "
        "to the total number of rooms, up to a maximum of 50%, will be considered."
    ),
    passage=1,
)

REPLACEMENT = Citation(
    document="DTES Plan",
    clause="Policy 9.2.7",
    quote=(
        "For conversion of SRO rooms to self-contained units, ensure a minimum "
        "of 50% of rooms are replaced."
    ),
    passage=3,
)

SMALL_LOSS = Citation(
    document="SRA By-law No. 8733",
    clause="s.4.3A",
    quote=(
        "...the work approved by the permit will result in the loss of no more "
        "than 3 designated rooms in the building and the work will, in the "
        "opinion of the General Manager, result in improved livability or "
        "operations of the building and secure affordability..."
    ),
    passage=11,
)

RIGHT_OF_FIRST_REFUSAL = Citation(
    document="SRA By-law No. 8733",
    clause="s.4.8(f)-(g)",
    quote=(
        "...ensures that comparable or better accommodation is provided to every "
        "tenant displaced by the conversion or demolition... gives the permanent "
        "resident re-located... the first right of refusal to rent the "
        "replacement rooms..."
    ),
    passage=9,
)

COMPENSATION = Citation(
    document="SRA By-law No. 8733",
    clause="s.4.8(i)",
    quote=(
        "...additional compensation based on the length of tenancy... (i) 4 "
        "months' rent for tenancies up to 5 years, (ii) 5 months' rent for "
        "tenancies over 5 years and up to 10 years, (iii) 6 months'... over 10 "
        "and up to 20 years, (iv) 12 months'... over 20 and up to 30 years, (v) "
        "18 months'... over 30 and up to 40 years, and (vi) 24 months'... over "
        "40 years."
    ),
    passage=10,
)

PERMANENT_RESIDENT = Citation(
    document="SRA By-law No. 8733",
    clause="s.1.2",
    quote=(
        "'permanent resident' means an individual who, in return for rent, "
        "occupies or usually occupies a room as his or her residence, and does "
        "so for at least 30 days;"
    ),
    passage=12,
)

ROOM_DEFINITION = Citation(
    document="SRA By-law No. 8733",
    clause="s.1.2",
    quote=(
        "'room' may include one or more connecting rooms, cooking facilities, or "
        "bathroom facilities used, intended to be used, or customarily used as "
        "one unit;"
    ),
    passage=13,
)

PERMIT = Citation(
    document="SRA By-law No. 8733",
    clause="s.4.1",
    quote=(
        "A person must not... convert or demolish a designated room; unless the "
        "owner: (d) obtains a conversion or demolition permit; (e) complies with "
        "this By-law; and (f) fulfils all conditions required..."
    ),
    passage=8,
)

# --- Compensation schedule --------------------------------------------------

# (upper bound of tenancy in years inclusive, months' rent owed). The final
# bracket is open-ended. Brackets are read inclusively at each boundary: a
# 5-year tenancy owes 4 months, a 10-year tenancy owes 5.
COMPENSATION_SCHEDULE: Tuple[Tuple[float, int], ...] = (
    (5.0, 4),
    (10.0, 5),
    (20.0, 6),
    (30.0, 12),
    (40.0, 18),
    (float("inf"), 24),
)


def compensation_months(tenancy_years: float) -> int:
    """Months' rent owed to a permanent resident of this tenancy length."""
    if tenancy_years < 0:
        raise ValueError("tenancy length cannot be negative")
    for upper, months in COMPENSATION_SCHEDULE:
        if tenancy_years <= upper:
            return months
    raise AssertionError("unreachable: schedule is open-ended")
