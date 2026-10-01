---
name: sro-conversion-tests
description: Test a proposed conversion of SRA-designated SRO rooms in Vancouver's Downtown Eastside against the City's three numeric provisions (SRA Guidelines p.4, DTES Plan 9.2.7, SRA By-law s.4.8), count the tenants displaced, and find the compliant scheme that displaces the fewest. Use when someone asks whether a scheme of merged SRO rooms passes, what it costs in people, or which scheme would cost least.
---

# SRO conversion tests

## What this does

Given one floor of SRA-designated rooms in corridor order and a proposed scheme of adjacent merges, the
tool reports, with a citation for each: whether every unit reaches 200 SF (or the average does, at the
City's discretion); whether the room count falls by at most 50%; whether at least 50% of the original
rooms are replaced as self-contained units; the rooms lost; and the compensation owed under s.4.8(i) as a
range, since no source says which tenants leave. It can also search every scheme of adjacent merges for the
one that passes while losing the fewest rooms.

## Procedure

1. Get the inputs: each room's area in SF in corridor order, its tenancy in years (or vacant), and the
   proposed groups of rooms to merge. Rooms not in any group stay as SRA rooms. If the user has no scheme,
   ask whether they want the least-displacement scheme found instead.
2. Write them as JSON (see `README.md`, "Start here") and run
   `python3 -m sro.cli --input floorplate.json` (add `--json` for machine-readable output, `--svg plan.svg`
   for the before/after plan). For the least-displacement scheme use `sro.optimize.optimise` with the
   room areas, `strict=True` for every unit at the minimum size or `strict=False` for the average fallback.
   Both take a `policy` (`sro.rules.Policy`); leave it at the default, the sources' thresholds, unless the
   user is asking what a different threshold would do, and then say so in the report.
3. Report the three tests separately, each with its clause, and say whether a pass is at the limit. Never
   fold them into one ratio: the Guidelines' 50% cap and 9.2.7's 50% floor are different tests and a scheme
   can pass one and fail the other.
4. Report rooms lost, and compensation as a range with the reason. State that passing is a precondition,
   not an approval: the Guidelines say qualifying rooms "will be considered", and a permit is still required
   under s.4.1.
5. If a threshold is questioned, quote the passage from `documentation/source_extract.md` rather than the tool's
   summary, and check the version and access date in `documentation/citation.md`.

## Where things are

- `sro/rules.py`: every threshold with the clause behind it, gathered in a `Policy`; the default is the sources'.
- `sro/evaluate.py`: the operation. `sro/optimize.py`: the search, under any policy.
- `documentation/source_extract.md`, `documentation/citation.md`: the annotated passages and their authority.
- `TESTING.md`: the three hand-worked cases and what the tool did with them.
- `web/index.html` (`node server.js`): the same operation as a browser tool, with the plan as the editor.

## Limits to state

The tool models adjacency only: rooms merge along one corridor, and structure, plumbing and light are not
checked. It does not model the permit process, financial viability, or rent-setting. Where the browser tool
draws a building from the City's footprint, that plan is a type, not a survey. Anything beyond one floor
(the district scenario) rests on assumptions the sources do not give, listed in the README.
