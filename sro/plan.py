"""Before/after floor plan geometry, emitted as SVG.

Geometric assumptions, stated because the sources do not supply them: a list of
room areas carries no shape. Rooms are drawn as a single-loaded corridor of
rectangles in corridor order, each ROOM_DEPTH_FT deep, with width derived from
its area. The drawing is diagrammatic: it shows the merge pattern and whether
the required pods fit, not a buildable plan.

Pod sizes come from SRA Guidelines p.5-6 (passage 2), which specifies the
program but dimensions only the refrigerator (24" x 24"). The bathroom and
kitchen footprints below are conventional minimums, flagged as assumptions.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence

from .evaluate import Evaluation

ROOM_DEPTH_FT = 12.0          # assumption: typical SRO room depth
CORRIDOR_WIDTH_FT = 5.0       # assumption: drawn for orientation only
BATHROOM_FT = (5.0, 8.0)      # 40 SF; complete bathroom, partitioned (p.5-6)
KITCHEN_FT = (8.0, 2.0)       # 16 SF counter run incl. 24"x24" fridge (p.5-6)
PODS_SF = BATHROOM_FT[0] * BATHROOM_FT[1] + KITCHEN_FT[0] * KITCHEN_FT[1]

SCALE = 9.0                   # px per foot
MARGIN = 46.0


@dataclass
class Box:
    x: float
    y: float
    w: float
    h: float
    label: str
    sub: str = ""
    kind: str = "room"        # room | unit | untouched | bath | kitchen
    ok: Optional[bool] = None


def _row(items: Sequence[dict], y_ft: float) -> List[Box]:
    boxes, x = [], 0.0
    for it in items:
        w = it["area"] / ROOM_DEPTH_FT
        boxes.append(
            Box(x, y_ft, w, ROOM_DEPTH_FT, it["label"], it["sub"], it["kind"], it.get("ok"))
        )
        x += w
    return boxes


def _pods(unit: Box) -> List[Box]:
    """Bathroom and kitchen placed at the back of a converted unit."""
    bw, bh = BATHROOM_FT
    kw, kh = KITCHEN_FT
    if unit.w < bw + 1 or unit.h < bh + 1:
        return []
    bath = Box(unit.x + unit.w - bw, unit.y, bw, bh, "BATH", "", "bath")
    k_w = min(kw, unit.w - bw - 0.5)
    kitchen = Box(unit.x, unit.y, k_w, kh, "KITCH", "", "kitchen")
    return [bath, kitchen]


def layout(ev: Evaluation) -> List[Box]:
    fp = ev.floorplate
    before = _row(
        [
            {
                "area": r.area_sf,
                "label": r.id,
                "sub": f"{r.area_sf:g} SF",
                "kind": "room",
            }
            for r in fp.rooms
        ],
        0.0,
    )

    # "After" keeps each room's footprint width, so merged units read as the
    # sum of the rooms they consume and the two rows align.
    assigned = {rid for g in ev.scheme.groups for rid in g}
    after_items = []
    order = []
    for u in ev.units:
        order.append(("unit", u))
    for r in ev.untouched:
        order.append(("room", r))
    # keep corridor order by first room index
    order.sort(
        key=lambda t: fp.index_of(
            t[1].room_ids[0] if t[0] == "unit" else t[1].id
        )
    )
    for kind, obj in order:
        if kind == "unit":
            fits = obj.area_sf - PODS_SF >= 0
            after_items.append(
                {
                    "area": obj.area_sf,
                    "label": obj.label,
                    "sub": f"{'+'.join(obj.room_ids)}  {obj.area_sf:g} SF",
                    "kind": "unit",
                    "ok": obj.area_sf >= 200,
                }
            )
        else:
            after_items.append(
                {
                    "area": obj.area_sf,
                    "label": obj.id,
                    "sub": f"{obj.area_sf:g} SF  (SRA)",
                    "kind": "untouched",
                }
            )
    gap = ROOM_DEPTH_FT + CORRIDOR_WIDTH_FT + 10.0
    after = _row(after_items, gap)

    pods: List[Box] = []
    for b in after:
        if b.kind == "unit":
            pods.extend(_pods(b))
    return before + after + pods


_FILL = {
    "room": "#e8e2d9",
    "unit": "#cfe0d6",
    "untouched": "#e8e2d9",
    "bath": "#b9c6cf",
    "kitchen": "#c8c2b4",
}


def to_svg(ev: Evaluation) -> str:
    boxes = layout(ev)
    total_w = max(b.x + b.w for b in boxes) * SCALE + 2 * MARGIN
    total_h = max(b.y + b.h for b in boxes) * SCALE + 2 * MARGIN + 30

    def px(v: float) -> float:
        return round(v * SCALE + MARGIN, 2)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w:.0f}" '
        f'height="{total_h:.0f}" viewBox="0 0 {total_w:.0f} {total_h:.0f}" '
        'font-family="Helvetica, Arial, sans-serif">',
        f'<rect width="{total_w:.0f}" height="{total_h:.0f}" fill="#faf8f5"/>',
    ]
    y_before = px(0) - 12
    y_after = px(ROOM_DEPTH_FT + CORRIDOR_WIDTH_FT + 10.0) - 12
    parts.append(
        f'<text x="{MARGIN:.0f}" y="{y_before:.0f}" font-size="12" '
        f'fill="#555" letter-spacing="1.5">EXISTING &#183; '
        f'{ev.original_rooms} SRA ROOMS</text>'
    )
    parts.append(
        f'<text x="{MARGIN:.0f}" y="{y_after:.0f}" font-size="12" fill="#555" '
        f'letter-spacing="1.5">PROPOSED &#183; {ev.surviving_rooms} ROOMS '
        f'({len(ev.units)} UNITS + {len(ev.untouched)} SRA)</text>'
    )

    for b in boxes:
        stroke = "#2f3b36"
        sw = 1.4
        if b.kind == "unit":
            stroke = "#2f6b4f" if b.ok else "#a33a2d"
            sw = 2.2
        if b.kind in ("bath", "kitchen"):
            sw = 0.9
            stroke = "#6a7780"
        parts.append(
            f'<rect x="{px(b.x):.1f}" y="{px(b.y):.1f}" '
            f'width="{b.w * SCALE:.1f}" height="{b.h * SCALE:.1f}" '
            f'fill="{_FILL[b.kind]}" stroke="{stroke}" stroke-width="{sw}"/>'
        )
        cx = px(b.x) + b.w * SCALE / 2
        if b.kind in ("bath", "kitchen"):
            parts.append(
                f'<text x="{cx:.1f}" y="{px(b.y) + b.h * SCALE / 2 + 3:.1f}" '
                f'font-size="7" fill="#42525c" text-anchor="middle">{b.label}</text>'
            )
            continue
        parts.append(
            f'<text x="{cx:.1f}" y="{px(b.y) + b.h * SCALE / 2:.1f}" '
            f'font-size="15" font-weight="600" fill="#22302a" '
            f'text-anchor="middle">{b.label}</text>'
        )
        parts.append(
            f'<text x="{cx:.1f}" y="{px(b.y) + b.h * SCALE / 2 + 15:.1f}" '
            f'font-size="9" fill="#5d6560" text-anchor="middle">{b.sub}</text>'
        )

    # corridor strips
    for y in (ROOM_DEPTH_FT, ROOM_DEPTH_FT * 2 + CORRIDOR_WIDTH_FT + 10.0):
        w = max(b.x + b.w for b in boxes)
        parts.append(
            f'<rect x="{px(0):.1f}" y="{px(y):.1f}" width="{w * SCALE:.1f}" '
            f'height="{CORRIDOR_WIDTH_FT * SCALE:.1f}" fill="#f0ece5" '
            'stroke="#b9b3a8" stroke-width="0.8" stroke-dasharray="4 3"/>'
        )
        parts.append(
            f'<text x="{px(0) + 8:.1f}" y="{px(y) + CORRIDOR_WIDTH_FT * SCALE / 2 + 3:.1f}" '
            'font-size="8" fill="#8d8579" letter-spacing="1">CORRIDOR</text>'
        )

    parts.append(
        f'<text x="{MARGIN:.0f}" y="{total_h - 16:.0f}" font-size="9" '
        'fill="#8d8579">Diagrammatic. Room depth '
        f'{ROOM_DEPTH_FT:g}′ assumed; widths derived from area. Pods per '
        'SRA Guidelines p.5–6 (bathroom '
        f'{BATHROOM_FT[0]:g}′×{BATHROOM_FT[1]:g}′, kitchen '
        f'{KITCHEN_FT[0]:g}′×{KITCHEN_FT[1]:g}′) — '
        'conventional minimums, not dimensioned in the source.</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)
