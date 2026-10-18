#!/usr/bin/env python3
"""
render.py: draw timeline.json as one static SVG.

Usage:
  python3 render.py                      # reads timeline.json, writes timeline.svg
  python3 render.py timeline.json out.svg

Reads timeline.json only. It never opens edges.json and never adds, drops or
re-times an effect: every bar is one event from the file, placed at
year_min to year_max as run.py wrote it.

Drawing rules:
  - x axis in years, starting at axis_start, ending at the later of the
    horizon and the last year_max; years past the horizon are hatched
  - one row per outcome; an outcome reached by several edges stacks its bars
    in that row; an effect with lag_min equal to lag_max is a diamond on that
    year rather than a bar
  - the drawing is never narrower than the legend
  - edges sharing a fork id are drawn as paired rows, bracketed and labelled
    with the fork id, so both sides sit next to each other
  - colour by camp: economics, planning and architecture are tints of slate;
    health and geography are tints of coral
  - stroke weight by evidence grade: strong 4, moderate 2.5, weak 1.2;
    mechanism and theory edges carry no grade and are drawn with a 1.2
    dashed outline
  - palette from CLAUDE.md: background #E9E2D6, slate #3D5A6C, coral #E0724E,
    tan #C9A66B for the past-horizon hatch, text #2B3A42, muted #5F6E78
  - a vertical rule at year 0 labelled "decision"; effects with
    before_decision fall to its left by construction
  - net direction (direction_net if present, else direction) is printed
    inside the left end of each bar
"""
import json, sys
from xml.sax.saxutils import escape

BG = "#E9E2D6"
SLATE = "#3D5A6C"
CORAL = "#E0724E"
INK = "#2B3A42"    # text
MUTED = "#5F6E78"  # axis labels and notes
TAN = "#C9A66B"    # past-horizon hatch
CAMP_COLOUR = {
    "economics": SLATE,
    "planning": "#6E8594",      # slate tint
    "architecture": "#9FB0BA",  # lighter slate tint
    "health": CORAL,
    "geography": "#B8553A",     # darker coral
}
GRADE_WEIGHT = {"strong": 4.0, "moderate": 2.5, "weak": 1.2}

LEFT = 300      # label column
RIGHT = 40
TOP = 70
ROW_H = 30
BAR_H = 14
YEAR_W = 36
FONT = "Helvetica, Arial, sans-serif"
LEGEND_W = 560   # five camps at 100 each, or three grades plus the dashed entry
MARK = 7         # half-width of the diamond for a zero-length effect


def load(path):
    with open(path) as f:
        return json.load(f)


def net_direction(ev):
    return ev.get("direction_net", ev.get("direction"))


def row_order(events):
    """Return a list of rows: (outcome_id, label, fork_or_None, [events]).

    Outcomes are ordered by first year_min. Fork sides are pulled out of their
    outcome rows and placed as adjacent rows, one per edge, after the row that
    first reaches them.
    """
    by_outcome = {}
    first_year = {}
    order = []
    for ev in sorted(events, key=lambda e: (e["year_min"], e["year_max"], e["edge"])):
        key = ev["to"]
        if key not in by_outcome:
            by_outcome[key] = []
            first_year[key] = ev["year_min"]
            order.append(key)
        by_outcome[key].append(ev)

    rows = []
    forks_done = set()
    for key in order:
        evs = by_outcome[key]
        plain = [e for e in evs if not e.get("fork")]
        if plain:
            rows.append((key, plain[0]["to_label"], None, plain))
        for ev in evs:
            fid = ev.get("fork")
            if not fid or fid in forks_done:
                continue
            forks_done.add(fid)
            sides = sorted([e for e in events if e.get("fork") == fid],
                           key=lambda e: (e["year_min"], e["edge"]))
            for side in sides:
                rows.append((side["to"], side["to_label"], fid, [side]))
    return rows


def render(tl):
    events = tl["events"]
    horizon = tl["horizon"]
    x0 = tl.get("axis_start", min([e["year_min"] for e in events] + [0]))
    x1 = max([horizon] + [e["year_max"] for e in events])
    rows = row_order(events)

    width = max(LEFT + (x1 - x0) * YEAR_W, LEFT + LEGEND_W) + RIGHT
    height = TOP + len(rows) * ROW_H + 110

    def X(year):
        return LEFT + (year - x0) * YEAR_W

    out = []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
               f'viewBox="0 0 {width} {height}" font-family="{FONT}" font-size="12" fill="{INK}">')
    out.append('<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" '
               'patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" '
               f'stroke="{TAN}" stroke-opacity="0.6" stroke-width="1"/></pattern></defs>')
    out.append(f'<rect width="{width}" height="{height}" fill="{BG}"/>')

    # title
    out.append(f'<text x="{LEFT}" y="28" font-size="15" font-weight="bold">'
               f'{escape(tl["option"])}</text>')
    out.append(f'<text x="{LEFT}" y="46" fill="{MUTED}">horizon {horizon} years, '
               f'{len(events)} effects, axis from year {x0}</text>')

    plot_top = TOP
    plot_bottom = TOP + len(rows) * ROW_H

    # past-horizon hatch
    if x1 > horizon:
        out.append(f'<rect x="{X(horizon)}" y="{plot_top}" width="{X(x1) - X(horizon)}" '
                   f'height="{plot_bottom - plot_top}" fill="url(#hatch)"/>')
        out.append(f'<text x="{X(horizon) + 4}" y="{plot_top - 6}" fill="{MUTED}" '
                   f'font-size="10">past horizon</text>')

    # year grid and axis labels
    for yr in range(x0, x1 + 1):
        x = X(yr)
        out.append(f'<line x1="{x}" y1="{plot_top}" x2="{x}" y2="{plot_bottom}" '
                   f'stroke="{SLATE}" stroke-opacity="0.15" stroke-width="1"/>')
        if yr % 5 == 0 or yr == x0 or yr == x1:
            out.append(f'<text x="{x}" y="{plot_bottom + 18}" text-anchor="middle" '
                       f'fill="{MUTED}">{yr}</text>')
    out.append(f'<text x="{(X(x0) + X(x1)) / 2}" y="{plot_bottom + 36}" text-anchor="middle" '
               f'fill="{MUTED}">years from the decision</text>')

    # rows
    prev_fork = None
    for i, (oid, lab, fid, evs) in enumerate(rows):
        y = plot_top + i * ROW_H
        cy = y + ROW_H / 2
        if i % 2 == 0:
            out.append(f'<rect x="0" y="{y}" width="{width}" height="{ROW_H}" '
                       f'fill="{SLATE}" fill-opacity="0.04"/>')
        out.append(f'<text x="{LEFT - 12}" y="{cy + 4}" text-anchor="end">{escape(lab)}</text>')
        if fid:
            # bracket along the left edge of the label column, spanning the paired rows
            if fid != prev_fork:
                n = sum(1 for r in rows if r[2] == fid)
                out.append(f'<line x1="18" y1="{y + 4}" x2="18" y2="{y + n * ROW_H - 4}" '
                           f'stroke="{CORAL}" stroke-width="2"/>')
                out.append(f'<text x="24" y="{y + 14}" fill="{CORAL}" font-size="10" '
                           f'font-weight="bold">fork {escape(fid)}</text>')
        prev_fork = fid

        # bars, stacked when several edges reach one outcome
        k = len(evs)
        sub_h = BAR_H if k == 1 else max(5, (ROW_H - 8) / k)
        for j, ev in enumerate(evs):
            by = cy - (k * sub_h) / 2 + j * sub_h
            xa, xb = X(ev["year_min"]), X(ev["year_max"])
            w = xb - xa
            colour = CAMP_COLOUR.get(ev["camp"], SLATE)
            grade = ev.get("evidence")
            weight = GRADE_WEIGHT.get(grade, 1.2)
            dash = '' if grade else ' stroke-dasharray="4 3"'
            title = (f'{ev["edge"]} {ev["from"]} -> {ev["to"]}  dir {net_direction(ev)}  '
                     f'yr {ev["year_min"]} to {ev["year_max"]}  {ev["camp"]}  '
                     f'{grade or ev["claim_type"]}  {ev["source"]}')
            style = f'fill="{colour}" fill-opacity="0.35" stroke="{colour}" stroke-width="{weight}"{dash}'
            if ev["year_min"] == ev["year_max"]:
                # a zero-length effect: a diamond on the year, sign to its right
                my = by + sub_h / 2
                shape = (f'<polygon points="{xa},{my - MARK} {xa + MARK},{my} {xa},{my + MARK} '
                         f'{xa - MARK},{my}" {style}/>')
                sign_x = xa + MARK + 3
            else:
                shape = f'<rect x="{xa}" y="{by + 1}" width="{w}" height="{sub_h - 2}" {style}/>'
                sign_x = xa + 5
            out.append(f'<g><title>{escape(title)}</title>{shape}'
                       f'<text x="{sign_x}" y="{by + sub_h / 2 + 4}" text-anchor="start" '
                       f'font-size="11" font-weight="bold" fill="{INK}">'
                       f'{escape(str(net_direction(ev)))}</text></g>')

    # decision rule
    xd = X(0)
    out.append(f'<line x1="{xd}" y1="{plot_top - 14}" x2="{xd}" y2="{plot_bottom}" '
               f'stroke="{INK}" stroke-width="1.5"/>')
    out.append(f'<text x="{xd + 5}" y="{plot_top - 4}" font-size="11" font-weight="bold">decision</text>')

    # legend
    ly = plot_bottom + 60
    lx = LEFT
    for camp, colour in CAMP_COLOUR.items():
        out.append(f'<rect x="{lx}" y="{ly - 9}" width="14" height="10" fill="{colour}" '
                   f'fill-opacity="0.35" stroke="{colour}" stroke-width="2"/>')
        out.append(f'<text x="{lx + 18}" y="{ly}" font-size="11">{camp}</text>')
        lx += 100
    ly += 20
    lx = LEFT
    for grade, weight in GRADE_WEIGHT.items():
        out.append(f'<line x1="{lx}" y1="{ly - 4}" x2="{lx + 24}" y2="{ly - 4}" '
                   f'stroke="{INK}" stroke-width="{weight}"/>')
        out.append(f'<text x="{lx + 30}" y="{ly}" font-size="11">{grade}</text>')
        lx += 100
    out.append(f'<line x1="{lx}" y1="{ly - 4}" x2="{lx + 24}" y2="{ly - 4}" '
               f'stroke="{INK}" stroke-width="1.2" stroke-dasharray="4 3"/>')
    out.append(f'<text x="{lx + 30}" y="{ly}" font-size="11">mechanism or theory, no grade</text>')

    out.append('</svg>')
    return "\n".join(out)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "timeline.json"
    dst = sys.argv[2] if len(sys.argv) > 2 else "timeline.svg"
    tl = load(src)
    if not tl.get("events"):
        print(f"{src} has no events; nothing to draw")
        sys.exit(2)
    svg = render(tl)
    with open(dst, "w") as f:
        f.write(svg)
    print(f"wrote {dst}: {len(tl['events'])} effects, axis {tl.get('axis_start')} to "
          f"{max([tl['horizon']] + [e['year_max'] for e in tl['events']])}")


if __name__ == "__main__":
    main()
