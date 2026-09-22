"""Render an Evaluation as text. Every result is printed with its citation."""

from __future__ import annotations

from typing import List

from .evaluate import Evaluation
from . import rules

RULE = "-" * 72


def _w(s: str, width: int = 72, indent: str = "    ") -> str:
    out, line = [], ""
    for word in s.split():
        if len(line) + len(word) + 1 > width - len(indent):
            out.append(indent + line)
            line = word
        else:
            line = f"{line} {word}".strip()
    if line:
        out.append(indent + line)
    return "\n".join(out)


def render(ev: Evaluation) -> str:
    L: List[str] = []
    fp, sc = ev.floorplate, ev.scheme

    L.append(RULE)
    L.append(f"{fp.name} / {sc.name}")
    L.append(RULE)
    L.append(
        f"Existing: {fp.room_count} SRA-designated rooms, "
        f"{fp.total_area_sf:g} SF total, {ev.permanent_residents} occupied "
        f"by permanent residents (s.1.2)"
    )
    L.append("")

    L.append("PROPOSED UNITS")
    for u in ev.units:
        flag = "" if u.adjacent else "  [non-consecutive]"
        L.append(
            f"  {u.label:<4} {'+'.join(u.room_ids):<12} {u.area_sf:>7.1f} SF"
            f"  ({u.rooms_consumed} rooms){flag}"
        )
    if ev.untouched:
        ids = ", ".join(r.id for r in ev.untouched)
        L.append(f"  Untouched SRA rooms: {ids}")
    L.append(
        f"  {fp.room_count} rooms -> {ev.surviving_rooms} rooms "
        f"({len(ev.units)} units + {len(ev.untouched)} untouched); "
        f"{ev.rooms_lost} lost"
    )
    L.append("")

    L.append("TESTS")
    for t in ev.tests:
        L.append(f"  [{t.verdict.upper()}] {t.name}")
        L.append(f"      source:  {t.citation}")
        L.append(f"      working: {t.working}")
    L.append("")
    L.append(
        f"  Overall: {'all three tests pass' if ev.compliant else 'NOT COMPLIANT'}"
    )
    L.append(
        _w(
            "Passing is a precondition, not an approval. The Guidelines say "
            "qualifying rooms 'will be considered' for release, and a "
            f"conversion permit is still required ({rules.PERMIT})."
        )
    )
    L.append("")

    if ev.small_loss_route:
        L.append("SMALL-LOSS ROUTE")
        L.append(
            _w(
                f"{ev.rooms_lost} designated room(s) lost, at or under the "
                f"{rules.SMALL_LOSS_MAX_ROOMS}-room threshold in "
                f"{rules.SMALL_LOSS}, so a permit may be sought from the "
                "General Manager rather than Council. Not automatic: it also "
                "requires findings of improved livability or operations and "
                "secured affordability, both discretionary and outside what "
                "this tool computes."
            )
        )
        L.append("")

    L.append("DISPLACEMENT")
    L.append(f"  Rooms lost outright:      {ev.rooms_lost}")
    L.append(f"  Tenants re-housed:        {ev.rehoused}   ({rules.RIGHT_OF_FIRST_REFUSAL})")
    L.append(f"  Permanently displaced:    {ev.permanently_displaced}")
    L.append(
        _w(
            "Rooms lost and tenants displaced are different quantities: the "
            "surviving units absorb tenants under the right of first refusal, "
            "so permanent displacement is the smaller figure."
        )
    )
    L.append("")

    L.append("COMPENSATION (months' rent)")
    L.append(f"  source: {ev.compensation.citation}")
    for rid, months in ev.compensation.per_room.items():
        room = fp.by_id[rid]
        L.append(
            f"    room {rid:<4} tenancy {room.tenancy_years:>5.2f} yr -> "
            f"{months} months"
        )
    L.append(f"  Owed to the project: {ev.compensation.summary}")
    if not ev.compensation.is_determinate:
        L.append(
            _w(
                "The by-law grants the right of first refusal without ranking "
                "tenants by tenancy length, need, or any other criterion, so "
                "which tenants leave is not derivable from the sources. The "
                "range is the honest output; a single total would assert more "
                "than the sources support."
            )
        )
    L.append("")

    if ev.warnings:
        L.append("NOTES")
        for w in ev.warnings:
            L.append(_w(f"- {w}", indent="  "))
        L.append("")

    L.append(RULE)
    return "\n".join(L)
