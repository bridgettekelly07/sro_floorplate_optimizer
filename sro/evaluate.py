"""The operation: floorplate + proposed scheme -> test results and displacement.

Each numeric test is evaluated independently and carries its own citation. The
two 50% figures are deliberately *not* collapsed into one ratio (README,
Interpretive Decisions); Case 2 of the hand-worked example is the case that
separates them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from . import rules
from .model import Floorplate, Room, Scheme, Unit
from .rules import Citation


@dataclass(frozen=True)
class TestResult:
    name: str
    passed: bool
    citation: Citation
    working: str
    at_boundary: bool = False

    @property
    def verdict(self) -> str:
        if not self.passed:
            return "Fail"
        return "Pass, at the limit" if self.at_boundary else "Pass"


@dataclass(frozen=True)
class Compensation:
    """Months' rent owed, per s.4.8(i).

    `per_room` is confident for every occupied room. The project total is a
    range whenever fewer tenants leave than remain, because no source says
    *which* tenants take up the right of first refusal.
    """

    per_room: Dict[str, int]
    displaced_count: int
    low_months: int
    high_months: int
    all_displaced_months: int
    citation: Citation = rules.COMPENSATION

    @property
    def is_determinate(self) -> bool:
        return self.low_months == self.high_months

    @property
    def summary(self) -> str:
        if self.displaced_count == 0:
            return "0 months' rent (no tenancy is terminated by this scheme)"
        if self.is_determinate:
            return f"{self.low_months} months' rent"
        return (
            f"{self.low_months}-{self.high_months} months' rent "
            "(exact figure turns on which tenants take up the right of first "
            "refusal, an allocation the sources leave to the permit process)"
        )


@dataclass
class Evaluation:
    floorplate: Floorplate
    scheme: Scheme
    units: List[Unit]
    untouched: List[Room]
    original_rooms: int
    surviving_rooms: int
    rooms_lost: int
    size: TestResult
    room_count: TestResult
    replacement: TestResult
    size_via_average: bool
    permanent_residents: int
    rehoused: int
    permanently_displaced: int
    compensation: Compensation
    small_loss_route: bool
    warnings: List[str] = field(default_factory=list)

    @property
    def tests(self) -> List[TestResult]:
        return [self.size, self.room_count, self.replacement]

    @property
    def compliant(self) -> bool:
        """All three numeric tests pass. Not the same as 'approved'."""
        return all(t.passed for t in self.tests)


def _pct(x: float) -> str:
    return f"{x * 100:g}%"


def _build_units(floorplate: Floorplate, scheme: Scheme) -> Tuple[List[Unit], List[str]]:
    by_id = floorplate.by_id
    warnings: List[str] = []
    unknown = [rid for rid in scheme.assigned_ids if rid not in by_id]
    if unknown:
        raise KeyError(f"scheme names rooms not on this floorplate: {unknown}")

    units: List[Unit] = []
    for i, group in enumerate(scheme.groups):
        idx = sorted(floorplate.index_of(rid) for rid in group)
        adjacent = idx == list(range(idx[0], idx[0] + len(idx)))
        notes: List[str] = []
        if not adjacent:
            note = (
                f"unit {scheme.label_for(i)} merges non-consecutive rooms "
                f"({', '.join(group)}); buildability is assumed, not checked"
            )
            notes.append(note)
            warnings.append(note)
        units.append(
            Unit(
                label=scheme.label_for(i),
                room_ids=list(group),
                area_sf=sum(by_id[rid].area_sf for rid in group),
                adjacent=adjacent,
                notes=notes,
            )
        )
    return units, warnings


def _size_test(units: Sequence[Unit]) -> Tuple[TestResult, bool]:
    """Each converted unit >= 200 SF, else the average across converted units."""
    threshold = rules.MIN_UNIT_AREA_SF
    if not units:
        return (
            TestResult(
                name="Size (200 SF)",
                passed=True,
                citation=rules.SIZE,
                working="no rooms converted; the size test does not apply",
            ),
            False,
        )

    short = [u for u in units if u.area_sf < threshold]
    converted_area = sum(u.area_sf for u in units)
    average = converted_area / len(units)
    at_limit = any(abs(u.area_sf - threshold) < 1e-9 for u in units)

    if not short:
        working = (
            f"every unit >= {threshold:g} SF "
            f"(smallest {min(u.area_sf for u in units):g}); average fallback not "
            f"triggered. Average {converted_area:g} / {len(units)} = {average:.1f} SF"
        )
        return (
            TestResult("Size (200 SF)", True, rules.SIZE, working, at_limit),
            False,
        )

    names = ", ".join(f"{u.label} {u.area_sf:g}" for u in short)
    passed = average >= threshold
    working = (
        f"{len(short)} unit(s) below {threshold:g} SF ({names}); average fallback "
        f"applies: {converted_area:g} / {len(units)} = {average:.1f} SF"
    )
    return (
        TestResult(
            "Size (200 SF)",
            passed,
            rules.SIZE,
            working,
            at_boundary=abs(average - threshold) < 1e-9,
        ),
        True,
    )


def _room_count_test(original: int, surviving: int) -> TestResult:
    lost = original - surviving
    reduction = lost / original
    passed = reduction <= rules.MAX_ROOM_REDUCTION + 1e-12
    return TestResult(
        name="Room count (max 50% reduction)",
        passed=passed,
        citation=rules.ROOM_COUNT,
        working=(
            f"{original} -> {surviving} rooms; reduction {lost} / {original} = "
            f"{_pct(reduction)}"
        ),
        at_boundary=abs(reduction - rules.MAX_ROOM_REDUCTION) < 1e-12,
    )


def _replacement_test(original: int, unit_count: int) -> TestResult:
    ratio = unit_count / original
    passed = ratio >= rules.MIN_REPLACEMENT_RATIO - 1e-12
    return TestResult(
        name="Replacement (min 50% of rooms)",
        passed=passed,
        citation=rules.REPLACEMENT,
        working=(
            f"{unit_count} self-contained unit(s) / {original} original rooms = "
            f"{_pct(ratio)}"
        ),
        at_boundary=abs(ratio - rules.MIN_REPLACEMENT_RATIO) < 1e-12,
    )


def _compensation(
    floorplate: Floorplate,
    displaced_count: int,
    candidate_ids: Sequence[str],
) -> Compensation:
    """`candidate_ids` are the residents who could be the ones to leave.

    Only residents of converted rooms are candidates: a tenant in a room the
    scheme leaves untouched has no tenancy terminated by the work, so s.4.8(i)
    is not engaged for them.
    """
    residents = [r for r in floorplate.rooms if r.is_permanent_resident]
    per_room = {
        r.id: rules.compensation_months(r.tenancy_years or 0.0) for r in residents
    }
    candidates = set(candidate_ids)
    amounts = sorted(m for rid, m in per_room.items() if rid in candidates)
    n = min(displaced_count, len(amounts))
    low = sum(amounts[:n])
    high = sum(amounts[len(amounts) - n :]) if n else 0
    return Compensation(
        per_room=per_room,
        displaced_count=n,
        low_months=low,
        high_months=high,
        all_displaced_months=sum(amounts),
    )


def evaluate(floorplate: Floorplate, scheme: Scheme) -> Evaluation:
    """Evaluate one proposed scheme against the source thresholds."""
    units, warnings = _build_units(floorplate, scheme)
    assigned = set(scheme.assigned_ids)
    untouched = [r for r in floorplate.rooms if r.id not in assigned]

    original = floorplate.room_count
    # SRA By-law s.1.2: connecting rooms used as one unit count as one "room".
    surviving = len(units) + len(untouched)
    rooms_lost = original - surviving

    size, via_average = _size_test(units)
    room_count = _room_count_test(original, surviving)
    replacement = _replacement_test(original, len(units))

    # Displacement. Rooms lost is a design/regulatory number; permanent
    # displacement is smaller, because the surviving units absorb tenants under
    # the right of first refusal (s.4.8(f)-(g); DTES 9.5.3).
    residents = [r for r in floorplate.rooms if r.is_permanent_resident]
    converted_resident_ids = [r.id for r in residents if r.id in assigned]
    converted_residents = len(converted_resident_ids)
    rehoused = min(converted_residents, len(units))
    permanently_displaced = max(0, converted_residents - rehoused)

    if len(units) > converted_residents:
        warnings.append(
            f"{len(units) - converted_residents} new unit(s) exceed the tenants "
            "being re-housed; surplus capacity is not modelled"
        )

    return Evaluation(
        floorplate=floorplate,
        scheme=scheme,
        units=units,
        untouched=untouched,
        original_rooms=original,
        surviving_rooms=surviving,
        rooms_lost=rooms_lost,
        size=size,
        room_count=room_count,
        replacement=replacement,
        size_via_average=via_average,
        permanent_residents=len(residents),
        rehoused=rehoused,
        permanently_displaced=permanently_displaced,
        compensation=_compensation(
            floorplate, permanently_displaced, converted_resident_ids
        ),
        small_loss_route=0 < rooms_lost <= rules.SMALL_LOSS_MAX_ROOMS,
        warnings=warnings,
    )
