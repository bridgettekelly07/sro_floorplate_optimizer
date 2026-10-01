# SRO Conversion & Displacement in the DTES

A tool that translates Vancouver's rules for converting SRA-designated rooms into self-contained units
into one explicit operation: given a floor of rooms and a proposed scheme of merges, it tests the scheme
against the three numeric provisions the City applies, cites the clause behind each result, and counts the
tenants the scheme displaces. It was checked against a hand-worked example before any code existed. The same
operation then runs the other way, as a search for the compliant scheme that displaces the fewest tenants, and
across the district's whole SRO stock as a picture of what the policy does: every threshold in it can be
changed, and the map and the drawer show who each version displaces. That extension rests on assumptions the
sources do not give, and they are stated where they are made.

**The provision.** SRA Guidelines p.4 (200 SF per converted unit, or an average of 200 SF at the City's
discretion; at most a 50% reduction in rooms), DTES Plan Policy 9.2.7 (at least 50% of rooms replaced as
self-contained units) and SRA By-law No. 8733 s.4.8 (relocation and compensation), read together.

**The question.** A conversion that makes rooms large enough must merge them, and merging rooms displaces
the people in them. Where, exactly, do the City's tests let that trade-off sit, and what does a given scheme
cost in people?

## Start here: run the app

The tool is a Svelte app in `frontend/`, built with Vite. Node 20 or newer.

```
npm install
npm run dev        # the dev server at http://localhost:5173
npm run build      # the production bundle, into frontend/dist: static files, host them anywhere
npm run preview    # the built bundle served locally
npm test           # 53 tests against the app's own modules: the hand-worked cases, the search, the policy
```

Everything runs in the browser. The six JSON files in `frontend/public/data` are the City open data
extracts and Appendix B; the page fetches them on load and computes the rest.

### Files

```
frontend/src/lib/        framework-free logic, each file one job
  policy.js              the thresholds and their citations; the source values
  evaluate.js            a building of floors + a scheme -> the three tests, rooms lost, tenants displaced
  search.js              the least-displacement scheme: a dynamic programme over runs of rooms
  typicalFloor.js        the floor read from a footprint; the floors state a scheme makes
  planSvg.js             the floor plan drawn
  district.js            the policy applied to every building it reaches
  model.js               the memoised plan and optimum per building
  flatMap.js             the flat SVG map; district3d.js the three.js district
  projection.js, data.js, colours.js, survey.js, format.js
  state.svelte.js        what the user has set: live and committed thresholds, selection, view
frontend/src/components/ the sidebar (Building, Policy) and the map stage (flat, 3D, legend, zoom)
frontend/tests/          the answer key: the README's hand-worked floor, the search and the policy, run with node --test
frontend/public/data/    the City open data extracts and Appendix B, as JSON
documentation/           the annotated passages, citations, the threshold inventory, and the assignment write-ups
```

## The sources

See [`documentation/citation.md`](documentation/citation.md) for document versions and authority notes, and [`documentation/source_extract.md`](documentation/source_extract.md) for the annotated passages this tool is built from.

The tests come from three sources: the SRA Guidelines, the Downtown Eastside Plan, and the Single Room Accommodation By-law. Two further documents are recorded but implement nothing — a Council public hearing summary (December 9, 2025) and the engagement handout from the consultation before it.

### A note on currency

All three primary sources were before Council for amendment at that hearing, as one exercise aimed at accelerating SRO replacement. The substance sits in appendices that are not part of the summary, so it establishes *that* the sources moved, not *how*. Two risks follow, and neither is resolved by these documents:

- **Recommendation E is aimed at s.4.8** — the relocation and compensation provisions this tool computes from.
- **The guideline named is not obviously the one used.** Recommendation H amends the Guidelines for the *Upgrade* of designated rooms; this tool is built on the Guidelines for *Converting* them. The 200 SF and 50% thresholds appear nowhere in the summary.

Both are settled by checking the enacted texts against `frontend/src/lib/policy.js`, where every threshold sits with its citation.

## Explanation

Vancouver's Single Room Accommodation By-law protects SRO stock by requiring a permit to convert or demolish designated rooms (s.4.1). Merging rooms into self-contained units counts as "conversion" under the by-laws's broad definition (s.1.2(e)), so this is a permitting question, not just a design one. 

Two policy tests govern these conversions. The **Guidelines** require converted units to reach 200 SF each, or average 200 SF across the project, and cap the room-count reduction at 50% (p.4). The Downtown Eastside Plan echoes the size rule (Policy 9.2.11) and adds its own room-replacement requirement: at least 50% of rooms must become self-contained units (Policy 9.2.7). 

These tests express a trade-off, not a checklist. Since existing rooms are ususally smaller than 200 SF, meeting the size test typically requires merging multiple rooms into one, reducing the room count. Bigger units mean fewer units, and the 50% threshold marks where the City stops tolerating that exchange. This tool makes that trade-off visible: what a given merge pattern costs in rooms against what it gains in floor area, particularly near the 50% limit. 

Two caveats matter. Meeting both tests doesn't guarantee approval. The Guidelines only say qualifying rooms "will be considered" for release, with final say resting with Council (s.4.1). Also rooms lost isn't the same as tenants displaced: the by-law requires comparable relocation housing and gives affected tenants first right of refusal on new units (s.4.8(f)-(g)), so actual permanent displacement is likely lower than the raw room-count drop, by a margin the sources don't specificy. The tool reports these two figures seperately rather than conflating them. 

## Scope

A building of one or more floors of an existing SRA-designated SRO, modelled as a typical floor
repeated on every residential storey. The tool is an **evaluator**, a **search** and a **policy
viewer**: sliders set the thresholds and the tool draws the compliant scheme that loses the fewest rooms
for the selected building, while the policy panel applies the same thresholds to the whole stock and
shows who they displace (see The policy, applied to the district). Given the room count, the individual
room areas, and a scheme, the tool computes:

- Whether the proposed scheme satisfies the 200 SF test, including the average fallback where individual units fall short (SRA Guidelines, p.4)
- Whether the resulting room-count reduction is ≤ 50% (SRA Guidelines, p.4)
- Whether the self-contained units produced are ≥ 50% of the original room count (DTES Plan, Policy 9.2.7). This is a separate test from the one above, which a scheme can fail independently
- How many original rooms are lost outright (original count − new unit count) as a proxy for the scale of tenant relocation, distinguished from the (smaller) number requiring permanent relocation, using the right-of-first-refusal logic in Policy 9.5.3
- The compensation owed to each displaced tenant, in months' rent, from the tenancy-length schedule in the SRA By-law (s.4.8(i))
- A before/after floor plan, the "before" room grid and one "after" combination scheme with bathroom/kitchen pods per Guidelines p.5–6, redrawn as the thresholds move

## Out of Scope

- The SRA By-law's permit *process* itself (application requirements, fees, inspections, enforcement), the tool cites the By-law's definitions, permit trigger, and relocation/compensation conditions (see `documentation/source_extract.md`, passages 7–11) but does not model the approval workflow
- Financing/viability determinations of when 1-for-1 replacement is "not achievable due to financial or development constraints" (Policy 9.2.7) (at the discretion of City/Council)
- Affordability and rent-setting mechanics generally (Section 5 of the Guidelines, and the TRPP's rent calculations), excluding the SRA By-law's own compensation schedule (s.4.8(i)), which is in scope above
- Whether a proposed scheme is physically buildable beyond adjacency. Rooms are held in corridor order and the search merges only consecutive rooms on one side of one corridor; structure, plumbing and light are not modelled
- The typical floor of any particular building. Appendix B gives a count, the City gives an outline, and the plan drawn between them is the stock's type, not a survey
- Where displaced tenants go. The tool counts who loses a room under a policy and what is owed; it no longer models re-housing, relocation housing, phasing or new supply (an earlier version did; git holds it)


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

**Operation:** from the original inventory and the proposed combination scheme, derive each converted unit's net area and the resulting unit count, then evaluate the numeric tests independently, each citing its own source clause, and compute rooms lost outright vs. an estimate of permanent displacement.

**Output:** pass/fail on each test with its citation, room-loss count, permanently-displaced estimate, required compensation in months' rent per displaced tenant as a range, and a before/after floor plan.

## Hand-worked example, the answer key

These three cases were worked by hand from the source documents before any code existed. They are the answer key: when the tool runs, its output is checked against the expected results below, so that correctness does not depend on the model's own answer. The "Tool output" rows below record what the code actually returns; each is asserted in `frontend/tests/evaluate.test.js`.

### The floorplate

One floor of an SRA-designated SRO building, 10 rooms, listed in corridor order:

| Room | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Area (SF) | 100 | 110 | 165 | 121 | 100 | 110 | 165 | 121 | 100 | 100 |
| Tenancy | 5 yr | 6 yr | 14 mo | 3 yr | 10 yr | 7 yr | 10 mo | 8 mo | 12 yr | 5 yr |

Total room area 1,192 SF; all rooms occupied. Merges are assumed to combine adjacent rooms only, and a merged unit's area is taken as the sum of its rooms. That merging two rooms reduces the room count by one is not an assumption but a definition: under SRA By-law s.1.2 a "room" may include "one or more connecting rooms… used, intended to be used, or customarily used as one unit" (`documentation/source_extract.md`, passage 13).

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

s.4.8(i) is owed to every **"permanent resident"** whose tenancy is terminated, which the By-law defines as someone who occupies a room as their residence "for at least 30 days" (s.1.2; `documentation/source_extract.md`, passage 12). All ten tenancies on this floor exceed 30 days, including rooms 7 and 8 at ten and eight months, so every occupant is a permanent resident and the compensation schedule reaches all of them.

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
## The building tool: one floor, searched as the thresholds move


The evaluator answers "does this scheme pass?". The search answers the question a conversion
actually poses: *of every scheme this building admits, which one passes while moving the fewest
people?* It works for one building in section 01, and the policy panel applies it to every building.

**One building** (section 01). Rooms sit in corridor order,
and a unit is a run of consecutive rooms, so the search is a dynamic programme along each row of
rooms: at every room, leave it as an SRA room or close a unit there. Rows on opposite sides of a
corridor and on different floors are searched separately and combined, because rooms never merge
across a corridor or a slab. The objective is rooms lost, which with every room occupied is exactly
the number of tenants the right of first refusal cannot re-house (s.4.8(f)–(g)). Ties go to more
units, then to more converted area. The search is exact and runs under both readings of the size
test the Guidelines offer: **strict**, every unit at 200 SF on its own, and the **average fallback**,
"an average of 200 SF across all converted rooms will be considered", under which a room converted
in place below 200 SF is carried by the pairs around it. The fallback is discretionary, so the strict
result is the safe one and the average result the best case. The thresholds the search passes are
the policy panel's: the sources' by default, or whatever the user has set there.

**The thresholds are the controls.** The plan in section 01 is not edited by hand: beside it sit sliders
for the thresholds that decide the room arithmetic (minimum unit size and its strict or average reading,
the largest cut in rooms, the least share replaced, the rooms one unit may take) and for the two
assumptions that fix the room sizes read from the footprint (the largest existing room, the circulation
share). Move one and the plan redraws at the least-displacement scheme that passes the new set; the map
and the district tally follow when the slider is released. The sliders and the policy panel beside the
map hold the same values, so the building and the district never disagree. Where no scheme of adjacent
merges passes, every room is drawn as kept and the building is reported as not converting. A single
tenancy length stands for every room, since no source gives one per room. The tally beside the plan
gives the scheme's figures; the tests below the plan show the working, each with its citation.
`documentation/thresholds.md` lists every threshold the sources set, with which ones move the count.

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

**The stock** (section 01's plan). Appendix B gives each building a room count and nothing else, so
the tool reads a typical floor from the City's footprint: a double-loaded corridor along the long axis
of the outline, rooms in equal bays on both sides, a stair bay at one end, over a retail ground floor
(the same assumption the storey count on the map makes). Room size is the footprint less a circulation
share, divided by the rooms Appendix B counts on a floor, capped where the outline holds far more
floor than its count suggests, since the City counts designated rooms and not the commercial or
common floor around them. Both figures are inputs (25% and 180 SF by default) and every plan says
which assumptions produced it. Rooms that would fall outside the outline are dropped; rooms that come
out narrower than 8 ft are flagged. The outline is measured; everything drawn inside it is the type
the stock shares, not a survey of that building.

## The policy, applied to the district

Everything above tests one floor against the sources. The **Policy** button on the map opens a panel that
applies the same tests to every building in the stock at once and shows who they displace. It is not a
search for the least displacement across the district, and it does not decide where anyone goes: it is a
picture of what a policy does, so that the policy itself can be questioned. Three kinds of assumption enter
and are the tool's own, not the City's: how a typical floor is read from a footprint (a double-loaded
corridor, 25% circulation, rooms capped at 180 SF); that every room is occupied, so rooms lost are tenants
displaced; and the survey's average tenancy and rent, which price the compensation. A reviewer checking
claims against sources should treat this part as an argument built on the operation, not as a reading of
the documents.

**The thresholds are inputs.** The panel holds the five numbers the provision turns on, each pre-filled with
the source's value and its citation beside it: the minimum unit size (200 SF, SRA Guidelines p.4, read as an
average across converted rooms or strictly per unit); the largest cut in the room count (50%, Guidelines
p.4); the least share of rooms replaced (50%, DTES Plan 9.2.7); the small-loss route (3 rooms, SRA By-law
s.4.3A, at or under which a permit may come from the General Manager rather than Council); and the days of
occupancy that make a permanent resident (30, s.1.2, which decides who is owed compensation). Changing any
of them re-runs the search for every building and the tests in section 01, and the panel says whether the
thresholds in force are the sources' or the user's. **Source values** puts them back.

**What the panel shows.** With the stock chosen (private, public, or all of Appendix B), every building
that can pass the thresholds converts at its least-loss scheme. The headline says how many buildings convert, how many units that delivers,
how many rooms stay SRA, and how many tenants lose their room, as a share of everyone in the stock the
policy reaches; the tiles repeat the figures, add the buildings whose losses exceed the small-loss route
and so need Council, and total the compensation under s.4.8(i). One bar sorts every tenant the policy
reaches into displaced, re-housed in a new unit, staying in a kept room, in a building that cannot pass,
or in a building with no footprint to draw. The map colours each building by the share of its tenants
displaced, white for a building that cannot pass; in 3D each converting building fades from green at
the ground to red at the roof, the redder the larger the share displaced. A folded list ranks the
converting buildings by tenants displaced, with each one's route, GM or Council; clicking a row loads the
building in section 01, and section 01 says what the policy does with the building on screen.

Under the sources' thresholds the private stock converts 71 of 76 buildings and displaces 532
tenants; at 150 SF the same stock displaces 148; at 250 SF with the cut capped at 30%, 40 buildings convert
and 329 are displaced. The reading is the point: the minimum unit size sets how many rooms a unit consumes,
and that, more than anything else in the provision, sets who leaves.

**The frame.** Since 2026-09-30 the browser tool is a full-window map with a sidebar: the map fills the
viewport, and the sidebar scrolls through the policy (the threshold sliders, the tally), the
selected building's record, its typical floor and the tests. The policy colouring is on from the start; the
Policy button beside the map toggles it. Below 900 px the map sits above the sidebar.

**Section 01 and the panel are one set of thresholds.** The sliders beside the plan and the inputs in the
panel write the same values, and the tests beneath the plan are run at the thresholds in force, their
headings saying so.

Three findings follow from the thresholds rather than from any modelling choice, and the panel makes them
visible:

- **Below 100 SF a room has no compliant conversion under either reading at 200 SF.** Two rooms cannot
  reach 200 SF, so units need three, and three-room units cannot leave 50% of the count standing. For those
  buildings the policy means replacement, not conversion, and lowering the minimum is the only threshold
  that changes it.
- **Under the strict reading an odd row of sub-200 rooms strands a room.** Every unit is a pair, so a row
  of nine makes four and leaves one; the building reaches 50% only if another row makes up the difference.
  Under the fallback the stranded room converts in place and the pairs carry the average.
- **Larger rooms displace fewer people.** At 100 SF the least-loss scheme is Case 1: half the tenants
  leave. At 150 SF under the fallback, two of ten leave; at 200 SF nobody does. The stock with the smallest
  rooms is where any policy costs the most.

Two assumptions are the search's own and are stated here because nothing in the sources fixes them: a unit
takes at most three rooms (`MAX_MERGE`), without which the search favours one huge merge carrying the
average for many rooms converted in place; and every room is occupied, so rooms lost equals tenants
displaced. The search takes the thresholds as a policy whose default is the sources'; it is checked on
uniform floors under the sources' thresholds and under other sets in `frontend/tests/search.test.js`, and
every scheme it returns is checked against the evaluator.

An earlier version of this tool asked a different question: given a mandated number of units, which
buildings should convert, in what order, and where would every displaced tenant go, with relocation
housing, vacancy, new supply and swing buildings as levers. That allocation and housing ledger were removed
when the tool's purpose became the visualization of the policy and those it displaces; the git history
holds them.

### The district in 3D

The map has a 3D button, on by default. Selecting a building draws its typical floor in section 01 with the square footage of every room, and the least-displacement scheme over it. It raises every building footprint on the map to the height the
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
no height for. See [`documentation/citation.md`](documentation/citation.md) for how the heights were matched.

### What else is known about a building

Appendix B gives a name, an address, a tenure and a room count, and nothing else. `frontend/public/data/sro-records.json`
holds what published sources add, one building at a time: storeys and units as the source states them, the unit
mix, whether the building is already self-contained apartments, and each fact as a sentence with its source, a
link and the date it was read. The building card shows a record where one exists, under **Record**, with the
citations. The first record is the Rose Garden Co-op, whose operator's page (CHF BC) describes a three-storey
walk-up of 52 apartments where Appendix B counts 54 rooms; the record notes that the by-law's tests do not
describe such a building. A record marked self-contained takes the building out of the stock the policy
reaches: the panel neither converts it nor counts its rooms, names it, leaves it grey on the map, and the
building's own policy line says why. This join is made in the browser only.
