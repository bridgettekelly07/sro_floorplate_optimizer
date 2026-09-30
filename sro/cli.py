"""Command line entry point.

    python3 -m sro.cli --example case1
    python3 -m sro.cli --input floorplate.json --svg plan.svg
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Tuple

from . import rules
from .evaluate import evaluate
from .model import Floorplate, Room, Scheme
from .plan import to_svg
from .report import render


def load(path: Path) -> Tuple[Floorplate, Scheme]:
    data = json.loads(path.read_text())
    rooms = [
        Room(
            id=str(r["id"]),
            area_sf=float(r["area_sf"]),
            tenancy_years=(
                None if r.get("tenancy_years") is None else float(r["tenancy_years"])
            ),
            occupied=bool(r.get("occupied", r.get("tenancy_years") is not None)),
        )
        for r in data["rooms"]
    ]
    fp = Floorplate(rooms=rooms, name=data.get("name", str(path.stem)))
    scheme = Scheme(
        groups=[[str(x) for x in g] for g in data["scheme"]["groups"]],
        labels=data["scheme"].get("labels"),
        name=data["scheme"].get("name", "proposed scheme"),
    )
    return fp, scheme


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        prog="sro", description="Evaluate an SRA conversion scheme."
    )
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--input", type=Path, help="JSON floorplate + scheme")
    src.add_argument(
        "--example",
        choices=["case1", "case2"],
        help="run a case from the README's hand-worked example",
    )
    ap.add_argument("--svg", type=Path, help="write a before/after floor plan")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    pol = ap.add_argument_group("thresholds", "the sources' values unless set; any other set is yours")
    pol.add_argument("--min-unit", type=float, default=rules.MIN_UNIT_AREA_SF, help="minimum unit size, SF (200)")
    pol.add_argument("--max-reduction", type=float, default=rules.MAX_ROOM_REDUCTION, help="largest cut in rooms, 0-1 (0.5)")
    pol.add_argument("--min-replacement", type=float, default=rules.MIN_REPLACEMENT_RATIO, help="least share of rooms replaced, 0-1 (0.5)")
    pol.add_argument("--small-loss", type=int, default=rules.SMALL_LOSS_MAX_ROOMS, help="rooms lost at or under which the General Manager may permit (3)")
    pol.add_argument("--resident-days", type=int, default=rules.PERMANENT_RESIDENT_MIN_DAYS, help="days of occupancy that make a permanent resident (30)")
    args = ap.parse_args(argv)
    policy = rules.Policy(args.min_unit, args.max_reduction, args.min_replacement, args.small_loss, args.resident_days)

    if args.example:
        from examples.floorplate import EXAMPLE, PAIRS, PARTIAL

        fp, scheme = EXAMPLE, (PAIRS if args.example == "case1" else PARTIAL)
    else:
        fp, scheme = load(args.input)

    ev = evaluate(fp, scheme, policy)
    if not policy.is_source:
        print("thresholds: yours, not the sources' --", policy, file=sys.stderr)

    if args.json:
        print(
            json.dumps(
                {
                    "original_rooms": ev.original_rooms,
                    "surviving_rooms": ev.surviving_rooms,
                    "rooms_lost": ev.rooms_lost,
                    "units": [
                        {"label": u.label, "rooms": list(u.room_ids), "area_sf": u.area_sf}
                        for u in ev.units
                    ],
                    "tests": [
                        {
                            "name": t.name,
                            "passed": t.passed,
                            "at_boundary": t.at_boundary,
                            "source": str(t.citation),
                            "working": t.working,
                        }
                        for t in ev.tests
                    ],
                    "compliant": ev.compliant,
                    "small_loss_route": ev.small_loss_route,
                    "rehoused": ev.rehoused,
                    "permanently_displaced": ev.permanently_displaced,
                    "compensation": {
                        "per_room": ev.compensation.per_room,
                        "low_months": ev.compensation.low_months,
                        "high_months": ev.compensation.high_months,
                        "determinate": ev.compensation.is_determinate,
                    },
                    "warnings": ev.warnings,
                },
                indent=2,
            )
        )
    else:
        print(render(ev))

    if args.svg:
        args.svg.write_text(to_svg(ev))
        print(f"floor plan written to {args.svg}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
