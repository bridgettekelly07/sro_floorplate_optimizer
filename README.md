# SRO Conversion & Displacement in the DTES

Interactive tool translating Vancouver's SRA-Designated Room conversion rules into an explicit operation, checked against a hand-worked example and visualized in Rhino, and then run the other way: a search for the compliant scheme that displaces the fewest tenants, building by building across the district's SRO stock.

## Sources

See [`source/citation.md`](source/citation.md) for document versions and authority notes, and [`source/source_extract.md`](source/source_extract.md) for the annotated passages this tool is built from.

The tests come from three sources: the SRA Guidelines, the Downtown Eastside Plan, and the Single Room Accommodation By-law. Two further documents are recorded but implement nothing — a Council public hearing summary (December 9, 2025) and the engagement handout from the consultation before it.

### A note on currency

All three primary sources were before Council for amendment at that hearing, as one exercise aimed at accelerating SRO replacement. The substance sits in appendices that are not part of the summary, so it establishes *that* the sources moved, not *how*. Two risks follow, and neither is resolved by these documents:

- **Recommendation E is aimed at s.4.8** — the relocation and compensation provisions this tool computes from.
- **The guideline named is not obviously the one used.** Recommendation H amends the Guidelines for the *Upgrade* of designated rooms; this tool is built on the Guidelines for *Converting* them. The 200 SF and 50% thresholds appear nowhere in the summary.

Both are settled by checking the enacted texts against `sro/rules.py`, where every threshold sits with its citation.

## The district in 3D

The stock map in section 01 has a 3D button. Selecting a building there draws its typical floor in section 02 with the square footage of every room, and the least-displacement scheme over it. It raises every building footprint on the map to the height the
City's 2009 LiDAR recorded for it (*Building Footprints 2009*, field `hgt_agl`), and draws the 143 SRO
buildings of Appendix B on their own footprints, coloured by tenure as on the flat map. Drag to pan, shift-drag
or right-drag to orbit, scroll to zoom; hovering names a building and clicking loads it into the sections below,
exactly as on the flat map. The **Plan** button looks straight down through an orthographic camera, north up,
so the district reads as a plan without perspective; panning, zooming and picking work as before, and orbiting
tips it back into perspective.

Each SRO is drawn from the City's LiDAR-measured footprint parts at their own heights, so a rear wing or a lower
annex stands at its measured height rather than being averaged into one block. The masses are plain; a faint line
around each part at every floor level marks the storeys, spaced from that part's own height at the 3.4 m floor to
floor the tool assumes throughout. (An earlier version generated street elevations from the type the stock shares;
that code is kept behind a flag but no longer drawn.) Where the building is on the Vancouver Heritage Register the
record gives its evaluation group, the register's own name for it and any designation.

The ground under the buildings is the City's 2002 shoreline, joined into a land polygon and clipped to the map, with
the water as the plane beneath it; the City's parks as flat polygons; and the streets and lanes as surfaces drawn
from their centrelines at a pavement width by street use (13, 11 and 8.5 m for arterial, secondary and residential,
5 m for lanes) with a 2.5 m sidewalk band either side. The centrelines, shoreline, parks and lanes are measured; the
widths are a drawing convention, not a survey of curbs.

Appendix B gives a room count and never a storey count or a floor area. The height fills the first gap: a
building's storeys are read from its LiDAR height at an assumed 3.4 m floor to floor, and that count is what
the floorplate model starts from (the Ivanhoe Hotel's 18.2 m reads as five storeys). It is an estimate and is
labelled as one; the older assumption of about 22 rooms to a floor remains for the nine buildings the City has
no height for. See [`source/citation.md`](source/citation.md) for how the heights were matched.

## The optimizer

The evaluator answers "does this scheme pass?". The optimizer answers the question the mandate
actually poses: *of every scheme this building admits, which one passes while moving the fewest
people?* It works at three scales, and each is in the browser tool.

**One building** (section 02). Rooms sit in corridor order,
and a unit is a run of consecutive rooms, so the search is a dynamic programme along each row of
rooms: at every room, leave it as an SRA room or close a unit there. Rows on opposite sides of a
corridor and on different floors are searched separately and combined, because rooms never merge
across a corridor or a slab. The objective is rooms lost, which with every room occupied is exactly
the number of tenants the right of first refusal cannot re-house (s.4.8(f)–(g)). Ties go to more
units, then to more converted area. The search is exact and runs under both readings of the size
test the Guidelines offer: **strict**, every unit at 200 SF on its own, and the **average fallback**,
"an average of 200 SF across all converted rooms will be considered", under which a room converted
in place below 200 SF is carried by the pairs around it. The fallback is discretionary, so the strict
result is the safe one and the average result the best case. The same search, run for every unit
count the building can legally reach from the DTES 9.2.7 floor upward, gives the building's
trade-off curve; it is not drawn in section 02 but is what the building contributes to the district
allocation in the map's scenario drawer.

**The plan is the editor.** The typical floor in section 02 is drawn from the building's state, not from
the search, so what the user does to it is what the tests run on. A marker in the corridor between two
rooms merges them into one unit or splits them; dragging the wall between two rooms shifts area from one
to the other, the row keeping its length; clicking a room keeps it as an SRA room or releases it. Every
floor is the typical floor, so an edit applies to all of them, and the search likewise runs on one floor
and repeats it. The buttons beside the plan restore the least-displacement scheme under either reading
or clear every merge, and a single tenancy length stands for every room, since no source gives one per
room. The tally beside the plan says whether the drawn scheme passes and how far it sits from the
least-displacement one; section 03 shows the working.

The plan is drawn two ways. **Existing** shows the rooms as they stand, a door each to the corridor
and a window on the outer wall; the shared washrooms are not drawn, since the outline holds no
record of them. **Proposed** gives every unit the program of SRA Guidelines p.5–6, a complete
bathroom and a kitchen run with a 24″ refrigerator, and one door. The source dimensions only the
refrigerator; the pods are conventional minimums (5′ × 8′ bath, 8′ × 2′ kitchen, 3′ door) and are
stated as such on the plan. They sit at the corridor wall so the window wall stays free: the
bathroom at one end of the unit, the door beside it, the kitchen run along the corridor wall after
the door or, where the unit is too narrow for that, up the far party wall. A unit that cannot take
the run either way is flagged: it fails on program before it fails on area, which the area tests
alone would not show.

**The stock** (section 02's plan). Appendix B gives each building a room count and nothing else, so
the tool reads a typical floor from the City's footprint: a double-loaded corridor along the long axis
of the outline, rooms in equal bays on both sides, a stair bay at one end, over a retail ground floor
(the same assumption the storey count on the map makes). Room size is the footprint less a circulation
share, divided by the rooms Appendix B counts on a floor, capped where the outline holds far more
floor than its count suggests, since the City counts designated rooms and not the commercial or
common floor around them. Both figures are inputs (25% and 180 SF by default) and every plan says
which assumptions produced it. Rooms that would fall outside the outline are dropped; rooms that come
out narrower than 8 ft are flagged. The outline is measured; everything drawn inside it is the type
the stock shares, not a survey of that building.

**The district** (the scenario drawer beside the map, opened by the map's **Scenario** button). Each building contributes its trade-off curve; the mandate is a number
of self-contained units the stock must produce; the optimizer chooses which buildings convert, and
how far each goes, so the target is met with the fewest tenants displaced. It is a multiple-choice
knapsack solved exactly, and one pass yields the least displacement for every mandate at once, so the
slider answers instantly. The scenario lives beside the map, in a drawer the **Scenario** button opens, so the
controls and the map they change share one frame. The result is shown three ways rather than as an abstract curve: a sentence,
with the map coloured by the scenario as the primary representation;
a single bar of every room in scope, split into tenants re-housed in a new unit, tenants staying in
a room kept as SRA, tenants displaced, rooms in buildings left alone, and rooms in buildings with no
compliant conversion; and, under the phasing, a timeline where each phase is a bar of the tenants
out while their building is in works, with the ones who never return as a red cap and the units
delivered so far written above. A building converts at a point on its own curve or not at all, because a
partial conversion below 50% fails DTES 9.2.7; a building whose rooms are too small for any scheme of
adjacent merges to leave half the count standing cannot contribute, is counted and listed, and is
drawn in solid ink on the map. The map's **Scenario** button colours every building by the share of
its tenants displaced. Compensation is totalled at the survey's average tenancy (4.6 years, the
4-month bracket of s.4.8(i)) and the survey's average rent for the tenure in scope.

**The two sections are joined both ways.** Clicking a building in the district table loads it in
section 02, and section 02 says what the scenario currently does with the building on screen (its
phase, units and displacement, or that it is left alone). Editing a building in section 02 **pins**
it: the district then takes that building exactly as drawn, or not at all, in place of its search
result, so a designer's decision overrides the optimizer for that building and the district
re-allocates around it. A pinned drawing that fails the tests cannot convert and is reported. Reset
or Unpin hands the building back to the search.

**The order, as a housing ledger** (in the drawer, below the bar). The allocation says which
buildings convert; the ledger says when, and follows every tenant. Converting a building removes
homes, so moving tenants between SROs can only help where the district has slack: vacant rooms,
homes a converted building has to spare (where its vacancy exceeded the rooms it lost), and new
units opening elsewhere. Three inputs the sources do not give are therefore stated as assumptions:
the vacancy rate (5% by default), the relocation housing the City can supply at once (300 tenants),
and new supply opening per phase (none). Works empty a building (s.4.8(f)), so everyone in it is
placed for the duration, nearest slack first, then in the relocation housing, and otherwise has
nowhere to wait; those the building cannot take back afterwards (its tenants less its homes after
works) are placed for good in the nearest slack, then in new supply, and the rest leave the
district. A phase takes as many buildings as the slack of the moment can hold. The order is a
heuristic, stated rather than searched: buildings whose conversion adds slack go first, since they
make room for the phases after them, then least harm per unit. The result is a timeline of who
goes where each phase, a table with the same figures, the moves drawn on the map as arcs between
roofs (ochre to wait, red for good) for the phase shown, and a headline that says how many new
units would let nobody leave. The Python module (`sro/optimize.py`, `programme`) and the browser
implement the same ledger; the swing-building case, the capacity, the nearest-first placement and
the conservation of every tenant are asserted in `tests/test_optimize.py`.

Three findings the search makes visible, all of which follow from the thresholds rather than from
any modelling choice:

- **Below 100 SF a room has no compliant conversion under either reading.** Two rooms cannot reach
  200 SF, so units need three, and three-room units cannot leave 50% of the count standing. For those
  buildings the mandate means replacement, not conversion.
- **Under the strict reading an odd row of sub-200 rooms strands a room.** Every unit is a pair, so a
  row of nine makes four and leaves one; the building reaches 50% only if another row makes up the
  difference. Under the fallback the stranded room converts in place and the pairs carry the average.
- **Larger rooms displace fewer people.** At 100 SF the least-loss scheme is Case 1: half the tenants
  leave. At 150 SF under the fallback, two of ten leave; at 200 SF nobody does. The district curve
  steepens as the mandate reaches buildings with smaller rooms, which is where it costs the most.

Two assumptions are the optimizer's own and are stated here because nothing in the sources fixes
them: a unit takes at most three rooms (`MAX_MERGE`), without which the search favours one huge
merge carrying the average for many rooms converted in place; and every room is occupied, so rooms
lost equals tenants displaced. The Python module (`sro/optimize.py`) and the browser tool implement
the same search; the closed form for a building of uniform rooms is checked against the search in
`tests/test_optimize.py`, and every scheme the search returns is checked against the evaluator.

## Explanation

Vancouver's Single Room Accommodation By-law protects SRO stock by requiring a permit to convert or demolish designated rooms (s.4.1). Merging rooms into self-contained units counts as "conversion" under the by-laws's broad definition (s.1.2(e)), so this is a permitting question, not just a design one. 

Two policy tests govern these conversions. The **Guidelines** require converted units to reach 200 SF each, or average 200 SF across the project, and cap the room-count reduction at 50% (p.4). The Downtown Eastside Plan echoes the size rule (Policy 9.2.11) and adds its own room-replacement requirement: at least 50% of rooms must become self-contained units (Policy 9.2.7). 

These tests express a trade-off, not a checklist. Since existing rooms are ususally smaller than 200 SF, meeting the size test typically requires merging multiple rooms into one, reducing the room count. Bigger units mean fewer units, and the 50% threshold marks where the City stops tolerating that exchange. This tool makes that trade-off visible: what a given merge pattern costs in rooms against what it gains in floor area, particularly near the 50% limit. 

Two caveats matter. Meeting both tests doesn't guarantee approval. The Guidelines only say qualifying rooms "will be considered" for release, with final say resting with Council (s.4.1). Also rooms lost isn't the same as tenants displaced: the by-law requires comparable relocation housing and gives affected tenants first right of refusal on new units (s.4.8(f)-(g)), so actual permanent displacement is likely lower than the raw room-count drop, by a margin the sources don't specificy. The tool reports these two figures seperately rather than conflating them. 

## Scope

A building of one or more floors of an existing SRA-designated SRO. The browser tool models the
building as a stack of floorplates: a floor can be isolated and edited room by room, and the
remaining floors are drawn around it as context. The Python evaluator still takes one floorplate
at a time; the building-wide arithmetic lives in the browser tool. The tool is an **evaluator** and an **optimizer**: the user proposes one combination scheme and the tool tests it against the source thresholds, or asks the tool for the compliant scheme that loses the fewest rooms, for one building or across the stock (see The optimizer). Given the room count, the individual room areas, and a proposed scheme, the tool computes:

- Whether the proposed scheme satisfies the 200 SF test, including the average fallback where individual units fall short (SRA Guidelines, p.4)
- Whether the resulting room-count reduction is ≤ 50% (SRA Guidelines, p.4)
- Whether the self-contained units produced are ≥ 50% of the original room count (DTES Plan, Policy 9.2.7). This is a separate test from the one above, which a scheme can fail independently
- How many original rooms are lost outright (original count − new unit count) as a proxy for the scale of tenant relocation, distinguished from the (smaller) number requiring permanent relocation, using the right-of-first-refusal logic in Policy 9.5.3
- The compensation owed to each displaced tenant, in months' rent, from the tenancy-length schedule in the SRA By-law (s.4.8(i))
- A simple Rhino floor plan showing the "before" room grid and one "after" combination scheme, with bathroom/kitchen pods sized per Section 4.1

## Out of Scope

- The SRA By-law's permit *process* itself (application requirements, fees, inspections, enforcement), the tool cites the By-law's definitions, permit trigger, and relocation/compensation conditions (see `source/source_extract.md`, passages 7–11) but does not model the approval workflow
- Financing/viability determinations of when 1-for-1 replacement is "not achievable due to financial or development constraints" (Policy 9.2.7) (at the discretion of City/Council)
- Affordability and rent-setting mechanics generally (Section 5 of the Guidelines, and the TRPP's rent calculations), excluding the SRA By-law's own compensation schedule (s.4.8(i)), which is in scope above
- Whether a proposed scheme is physically buildable beyond adjacency. Rooms are held in corridor order and the search merges only consecutive rooms on one side of one corridor; structure, plumbing and light are not modelled
- The typical floor of any particular building. Appendix B gives a count, the City gives an outline, and the plan drawn between them is the stock's type, not a survey; measured plans replace it through the floorplate editor
- The relocation housing and the new supply themselves: the ledger counts places, not buildings, rents or how long a phase takes, and its vacancy is one rate across the stock rather than a survey of each building


## Input → Operation → Output

**Inputs (supplied by the user, one floorplate at a time):**
- Original room inventory: the number of existing SRA-designated rooms and each room's net floor area in SF
- Proposed combination scheme: which original rooms are grouped together to form each converted unit
- Tenancy length per occupied room, in years, used for the compensation schedule

**Thresholds (fixed by the sources, what the operation tests against, not user input):**
- 200 SF average threshold (SRA Guidelines p.4; restated DTES 9.2.11)
- 50% maximum room reduction (SRA Guidelines p.4)
- 50% minimum replacement for SRA conversions (DTES 9.2.7)
- 3-room minimum exemption threshold (SRA By-law s.4.3A)
- Displacement trigger: any net room loss requires a relocation plan (DTES 9.5.1); SRA-designated rooms route specifically to the SRA By-law's relocation mechanism (9.5.4)
- Right-of-first-refusal as an available alternative when affordable replacement accommodation isn't otherwise available (9.5.3)
- Compensation schedule of 4–24 months' rent, indexed to tenancy length (SRA By-law s.4.8(i))

**Operation (planned):** from the original inventory and the proposed combination scheme, derive each converted unit's net area and the resulting unit count, then evaluate the numeric tests independently, each citing its own source clause, and compute rooms lost outright vs. an estimate of permanent displacement.

**Output (planned):** pass/fail on each test with its citation, room-loss count, permanently-displaced estimate, required compensation in months' rent per displaced tenant, and a Rhino before/after floor plan.

## Running the Tool

```
python3 -m sro.cli --example case1              # the hand-worked cases
python3 -m sro.cli --example case2 --svg out.svg
python3 -m sro.cli --input floorplate.json --json
python3 -m unittest discover -s tests           # 56 tests: the answer key below, the search, the phasing, the ledger
```

Stdlib only, no install. `web/index.html` is the same operation as a browser tool,
with the floorplate built as a manipulable 3D model (three.js r160 from cdnjs; it
falls back to the inventory table if WebGL is unavailable). Existing rooms sit on the
near side of the corridor and are the input: drag one along the corridor to reorder,
drag the partition between two rooms to shift area from one to the other, and add or
remove rooms from the inventory panel. Moving a partition conserves the floor's total
area, which is what moving a partition actually does; the corridor and back walls are
the envelope and are fixed, the left end wall is the datum, and the right end wall
moves so the floor can be extended. Shift-dragging any partition does the same thing
— one room grows and the floor grows with it. A partition inside a merged pair can
still be moved, and doing so leaves the unit's area unchanged, which is the clearest
demonstration that the room-count tests turn on unit totals rather than partition
positions. The
proposed scheme is derived on the far side, with the bathroom and kitchen pods drawn
inside each unit. Merges are made by clicking a marker in the corridor *between* two
rooms, so every scheme the model can express is one of adjacent rooms — the adjacency
a list of areas cannot record. Because a merge belongs to the boundary rather than to
the rooms, dragging a room through a boundary clears the joints it crosses.

| File | What it holds |
|---|---|
| `sro/rules.py` | the thresholds and the quoted clause behind each one; nothing here is user input |
| `sro/model.py` | `Room`, `Floorplate`, `Scheme`, `Unit` |
| `sro/evaluate.py` | the operation: the three tests, displacement, compensation |
| `sro/optimize.py` | the search: least-loss scheme per building, the trade-off curve, the district allocation, the phasing |
| `sro/plan.py` | before/after floor plan geometry, emitted as SVG |
| `sro/report.py`, `sro/cli.py` | text and JSON output |
| `tests/test_hand_worked.py` | the hand-worked example, asserted |
| `tests/test_optimize.py` | the search finds Case 1 and nothing else; closed form against search; the district knapsack; the phasing |
| `web/index.html` | the interactive version: the stock in 3D, a typical plan per building, the search, the district scenario, the floorplate editor, same tests |

## Hand-Worked Example

These three cases were worked by hand from the source documents before any code existed. They are the answer key: when the tool runs, its output is checked against the expected results below, so that correctness does not depend on the model's own answer. The "Tool output" rows below record what the code actually returns; each is asserted in `tests/test_hand_worked.py`.

### The floorplate

One floor of an SRA-designated SRO building, 10 rooms, listed in corridor order:

| Room | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Area (SF) | 100 | 110 | 165 | 121 | 100 | 110 | 165 | 121 | 100 | 100 |
| Tenancy | 5 yr | 6 yr | 14 mo | 3 yr | 10 yr | 7 yr | 10 mo | 8 mo | 12 yr | 5 yr |

Total room area 1,192 SF; all rooms occupied. Merges are assumed to combine adjacent rooms only, and a merged unit's area is taken as the sum of its rooms. That merging two rooms reduces the room count by one is not an assumption but a definition: under SRA By-law s.1.2 a "room" may include "one or more connecting rooms… used, intended to be used, or customarily used as one unit" (`source/source_extract.md`, passage 13).

**A structural fact about this floor:** no room reaches 200 SF on its own (the largest is 165) so every converted unit requires at least two rooms. That constraint drives all three cases.

### Case 1: typical full conversion in pairs

**Input.** All ten rooms merged in adjacent pairs, producing five units:

| Unit | A | B | C | D | E |
|---|---|---|---|---|---|
| Rooms | 1+2 | 3+4 | 5+6 | 7+8 | 9+10 |
| Area | 210 | 286 | 210 | 286 | **200** |

**Expected result, worked by hand:**

| Test | Source | Working | Result |
|---|---|---|---|
| Size | Guidelines p.4: *"Converted SRA rooms that are at least 200 SF"* | every unit ≥ 200; average fallback not triggered. Average 1192 ÷ 5 = 238.4 SF | **Pass** |
| Room count | Guidelines p.4: *"up to a maximum of 50%"* | 10 → 5 rooms; reduction 5 ÷ 10 = 50% | **Pass, at the cap** |
| Replacement | DTES 9.2.7: *"a minimum of 50% of rooms are replaced"* | 5 units ÷ 10 original rooms = 50% | **Pass, at the floor** |

Unit E sits exactly at 200 SF and the reduction exactly at 50%; both pass only under the inclusive reading recorded in Interpretive Decisions.

**Why this case matters.** Because every unit needs at least two rooms, five units consume all ten so any scheme satisfying DTES 9.2.7 on this floor must be a full conversion into pairs. Any three-room merge drops the count to four units, a 60% reduction that breaks the Guidelines' cap. **This is the only compliant scheme this floorplate admits,** and it passes with zero margin on both tests.

**Tool output:** matches. Units 210 / 286 / 210 / 286 / 200 SF; 10 → 5 rooms;
size **pass** (average 238.4 SF, fallback not triggered), room count **pass at the cap**
(50%), replacement **pass at the floor** (50%). The tool labels all three "Pass, at the
limit" rather than a bare pass, since the scheme has no margin on any of them. A test also
asserts the three-room-merge variant fails at 60%.

### Case 2: conflicting partial conversion

**Input.** Rooms 1–6 merged into three units; rooms 7–10 left as SRA rooms.

| Unit | A | B | C | Untouched |
|---|---|---|---|---|
| Rooms | 1+2 | 3+4 | 5+6 | 7, 8, 9, 10 |
| Area | 210 | 286 | 210 | 165, 121, 100, 100 |

After conversion: 3 units + 4 rooms = **7 rooms total.**

**Expected result, worked by hand:**

| Test | Source | Working | Result |
|---|---|---|---|
| Size | Guidelines p.4 | applies only to converted units: 210, 286, 210, all ≥ 200. Average 706 ÷ 3 = 235.3 SF | **Pass** |
| Room count | Guidelines p.4 | 10 → 7 rooms; reduction 3 ÷ 10 = 30% | **Pass**, with margin |
| Replacement | DTES 9.2.7 | 3 units ÷ 10 original rooms = 30%, below the 50% floor | **Fail** |

**Why this case matters.** One scheme, two documents, opposite outcomes. The four unconverted rooms count toward the Guidelines' surviving total but earn nothing under 9.2.7, so a scheme that looks conservative under the Guidelines is non-compliant under the Plan. This is the case that shows the two 50% figures are separate tests rather than one ratio stated twice.

It also lands on a second, unrelated boundary: the loss here is exactly **3 designated rooms**, which is the threshold in SRA By-law s.4.3A for the simplified permit route to the General Manager rather than Council. That route is not automatic; it additionally requires the General Manager to find "improved livability or operations" and secured affordability, both discretionary and outside what this tool computes. It confirms that s.4.3A operates on an absolute count, on a different axis from the percentage tests.

**Tool output:** matches. 3 units + 4 untouched = 7 rooms; size **pass** (235.3 SF
average, applied to the converted units only), room count **pass** at 30%, replacement
**fail** at 30%. The tool additionally flags the s.4.3A route, the 3-room loss being at
that threshold, and states the two discretionary findings it cannot compute.

### Case 3: missing information about who is displaced

**Input.** The Case 1 scheme, with all ten rooms occupied. Question asked of the tool: what compensation does the project owe?

**Expected result, worked by hand.** Each tenancy maps to a bracket in SRA By-law s.4.8(i):

| Room | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Tenancy | 5 yr | 6 yr | 14 mo | 3 yr | 10 yr | 7 yr | 10 mo | 8 mo | 12 yr | 5 yr |
| Owed (months' rent) | 4 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 6 | 4 |

Rooms 1, 5 and 10 fall exactly on bracket boundaries (five and ten years) and are placed by the same inclusive reading applied to the area and room-count thresholds. Read exclusively instead, the total would be 48 months rather than 45.

Were every tenant displaced, the total owed would be **45 months' rent**. But Case 1 produces five units for ten occupied rooms, so five tenants are re-housed under the right of first refusal (s.4.8(f)–(g)) and **five must leave** and no source says which five. The by-law grants the right of first refusal without ranking tenants by tenancy length, need, or any other criterion.

| | Tenants displaced | Total owed |
|---|---|---|
| Lower bound | the five shortest tenancies | **20 months' rent** |
| Upper bound | the five longest | **25 months' rent** |

**Expected output is therefore not a number.** It is the range 20–25 months' rent, plus the statement that the exact figure turns on an allocation decision the sources leave to the permit process. A tool that returned a single total here would be asserting something its sources do not support.

**Tool output:** matches. 20–25 months' rent, returned as a range with the reason
attached, never a single total. Per-room figures (4, 5, 4, 4, 5, 5, 4, 4, 6, 4) match the
table above, including the three boundary tenancies. Under the Case 2 scheme the same
logic narrows the candidate pool to rooms 1–6 — a tenant whose room is left untouched has
no tenancy terminated by the work — and returns 12–15 months.

**Why this case matters.** The missing information is missing from the *regulation*, not from the user's input supplying more data would not resolve it. The range is narrow on this floor because the tenancies are mostly short; on a building with long-tenured residents the same unresolved question would swing the total far more, since a single tenancy over 40 years carries 24 months on its own. The size of the gap is floorplate-dependent.


### A note on who qualifies

s.4.8(i) is owed to every **"permanent resident"** whose tenancy is terminated, which the By-law defines as someone who occupies a room as their residence "for at least 30 days" (s.1.2; `source/source_extract.md`, passage 12). All ten tenancies on this floor exceed 30 days, including rooms 7 and 8 at ten and eight months, so every occupant is a permanent resident and the compensation schedule reaches all of them.

## Interpretive Decisions

- **The numeric tests are applied to the building, not to one floorplate.** The sources count
  rooms in a building: s.4.3A speaks of "the loss of no more than 3 designated rooms **in the
  building**," and the Guidelines' fallback is an average "across all converted rooms" in the
  project, not on one floor. So the browser tool sums rooms, units and losses across every floor
  and tests once. Two consequences worth seeing: a building can pass while an individual floor
  would fail, because a generous floor carries a mean one; and the 200 SF average is a
  building-wide mean, so leaving one floor unconverted can drag the whole project's average below
  the threshold even though every merged unit on the other floors clears it. On a single-floor
  building this reading is identical to the per-floorplate one, which is why the hand-worked
  example below is unaffected.

- **"A minimum of 50% of rooms are replaced" (DTES 9.2.7) counts the self-contained units produced, not the original rooms consumed.** Policy 9.2.7 sits in a passage about replacing SRO stock with self-contained *social housing units*, so the quantity being counted is what the project ends up with. The test is therefore `units ÷ original rooms ≥ 50%`.

- **The Guidelines' 50% cap and DTES 9.2.7's 50% floor are two separate tests, reported separately with their own citations.** They coincide only where every room is converted. Where rooms are left unconverted, those rooms still count toward the Guidelines' surviving total but earn nothing under 9.2.7 so a scheme can pass the cap and fail the floor. Under this reading 9.2.7 is the binding constraint on any partial conversion. Demonstrated in Case 2 of the hand-worked example.

- **Numeric thresholds are read as inclusive.** "At least 200 SF," "up to a maximum of 50%," "a minimum of 50%," and "no more than 3 designated rooms" each include the stated value, so a unit at exactly 200 SF and a reduction of exactly 50% both pass.

## Open Questions

- How to quantify "tenants permanently displaced" as distinct from "rooms lost outright." The SRA By-law (s.4.8(f)) gives a concrete "comparable accommodation" standard (rent ≤ 30% of income or previous rent, whichever is lower) and its own right-of-first-refusal condition. This can likely replace the placeholder logic from DTES 9.5.3 with something the tool can actually test against.
- The compensation schedule (s.4.8(i)) is in scope, but it is owed to tenants "whose tenancy is terminated as a result of the work", so which tenants it covers depends on the displacement question above. Compensation can be computed confidently for any individual tenancy length; a project-wide total cannot be stated until "permanently displaced" is defined.
- The SRA By-law's 3-room exemption (s.4.3A) operates independently of the percentage-based tests. Does a small building's proposal need to check both the percentage tests *and* this absolute-count exemption?
- **The replacement test counts units, but Policy 9.2.7 counts social housing units.** The engagement handout proposes changing what that term covers, and the tool has no notion of tenure or rent, so every unit it counts is assumed to qualify. **Its replacement percentage is therefore an upper bound.** Resolving this needs the enacted definition and a tenure attribute on each unit, neither of which the current inputs carry.
- Whether the s.4.8(i) compensation schedule the tool encodes is still the operative one. Recommendation E amends the SRA By-law "to improve tenant protections," and the schedule sits inside that section. The tool's figures are checked against the by-law text in hand, not against the amendment.
