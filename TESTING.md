# Testing

How the tool's answers are checked, in the form the assignment asks for: for each case, the input, the
source, the expected result worked without the tool, and what the tool actually did. The three cases are
a typical case, a boundary-and-conflict case, and a case with missing information. All three are asserted
in `tests/test_hand_worked.py`; run everything with:

```
python3 -m unittest discover -s tests
```

## The example floor

One floor of ten SRA-designated rooms in corridor order, all occupied:

| Room | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Area (SF) | 100 | 110 | 165 | 121 | 100 | 110 | 165 | 121 | 100 | 100 |
| Tenancy | 5 yr | 6 yr | 14 mo | 3 yr | 10 yr | 7 yr | 10 mo | 8 mo | 12 yr | 5 yr |

No room reaches 200 SF alone, so every converted unit needs at least two rooms. That fact drives all three cases.

## Case 1 · typical: full conversion in pairs (a boundary case too)

**Input.** All ten rooms merged in adjacent pairs: 1+2, 3+4, 5+6, 7+8, 9+10. `python3 -m sro.cli --example case1`

**Source.** SRA Guidelines p.4 (200 SF; at most 50% reduction); DTES Plan 9.2.7 (at least 50% replaced).

**Expected, by hand.** Units 210 / 286 / 210 / 286 / 200 SF. Size passes with unit E exactly at 200 SF.
Room count 10 → 5, a reduction of exactly 50%: passes at the cap. Replacement 5 ÷ 10 = 50%: passes at
the floor. Both pass only on the inclusive reading of "at least" and "up to a maximum of" (see README,
Interpretive Decisions). This is the only compliant scheme this floor admits: a three-room merge drops the
count to four and fails the cap.

**What the tool did.** Matches. Reports all three as "Pass, at the limit" rather than a bare pass, since
the scheme has no margin on any of them. The search under the strict reading finds this scheme and no
other (`tests/test_optimize.py`, `test_strict_reading_finds_case_1_and_only_case_1`).

## Case 2 · conflicting: a partial conversion

**Input.** Rooms 1–6 merged into three units; rooms 7–10 left as SRA. `python3 -m sro.cli --example case2`

**Source.** The same three provisions; and SRA By-law s.4.3A (the three-room route).

**Expected, by hand.** Units 210 / 286 / 210 SF: size passes. 10 → 7 rooms, a 30% reduction: room count
passes with margin. Units 3 ÷ 10 original rooms = 30%: replacement **fails**. One scheme, two documents,
opposite outcomes: the unconverted rooms count toward the Guidelines' surviving total but earn nothing
under 9.2.7. The loss is exactly three rooms, at the s.4.3A threshold for the General Manager route.

**What the tool did.** Matches: size pass (235.3 SF average, applied to converted units only), room count
pass at 30%, replacement fail at 30%, overall NOT COMPLIANT. It flags the s.4.3A route and states the two
discretionary findings it cannot compute.

## Case 3 · missing information: who is displaced

**Input.** The Case 1 scheme with all ten rooms occupied. Question: what compensation does the project owe?
`python3 -m sro.cli --example case1`

**Source.** SRA By-law s.4.8(i) (the schedule of months' rent by tenancy); s.4.8(f)–(g) (right of first refusal);
s.1.2 (permanent resident, 30 days).

**Expected, by hand.** Per-room compensation 4, 5, 4, 4, 5, 5, 4, 4, 6, 4 months' rent (rooms 1, 5 and 10
on bracket boundaries, read inclusively). Five units for ten tenants: five are re-housed under the right of
first refusal and five must leave, and **no source says which five**. So the expected output is not a
number but a range: 20 months' rent if the five shortest tenancies leave, 25 if the five longest, with the
statement that the allocation is left to the permit process.

**What the tool did.** Matches: 20–25 months' rent, returned as a range with the reason attached, never a
single total; per-room figures as above. Under the Case 2 scheme it narrows the candidates to rooms 1–6
and returns 12–15 months.

## The browser against Python

The browser tool reimplements the search and the district ledger in JavaScript. `tests/fixtures/district_stock.json`
records the exact stock the browser fed its ledger for the market SROs at the default scenario, with the
browser's own answers; `test_the_browser_and_python_agree_on_the_district` asserts the Python ledger gives
the same phases, the same figures for every phase, and the same cost. To refresh the fixture after a change
to either side, open the browser tool with the Scenario drawer on and run `SRO.lastStock()` in the console.

## Sanity checks in the browser

Things that must be true; if any is not, something is wrong.

- Mandate slider at 0: nothing converts, nobody displaced. At 100%: every building that can convert does.
- The strict reading never produces more units or fewer displaced than the average reading.
- Vacancy 0% and no new supply: everyone who cannot return leaves the district, and the headline's "opening
  N more units" equals that number. Set new supply to N per phase and the leavers fall to about zero.
- Raising the relocation housing never increases displacement; it reduces phases.
- The who-moves bar sums to the tenants in scope; a phase's *Out* equals its wait and for-good columns.
- Pinning a building as drawn changes the district total by exactly that building's difference.
- Arcs on the map land on buildings with spare rooms; a 14-room building does not absorb 40 people.

## A test sample in the browser: the Ivanhoe Hotel

Run 2026-09-29 on the market stock at the default scenario. The Ivanhoe (1038 Main St, 92 rooms, read from
its footprint as 4 residential storeys × 23 rooms of 116 SF) was loaded from the district table and each
step's result was predicted before it was taken.

| Step | Input | Predicted from the sources | What the tool did |
|---|---|---|---|
| Load | click the Ivanhoe | rooms of 116 SF cannot pass strict; on the average fallback, pairs at 232 SF can carry rooms converted in place | least-displacement scheme: 48 units, 8 kept, 36 displaced (39.1%); all three tests pass, size on the average fallback |
| Clear | split every unit | every room converts in place at 116 SF: size fails (average 116), room count and replacement pass (92 of 92) | "Fails the size test"; 92 units below 200 SF listed; 0 displaced; Not compliant |
| Pin | (the edit above pins the building) | a non-compliant drawing cannot convert, so the district loses it | "pinned as drawn, but the drawing fails the tests, so it cannot convert"; district falls from 33 of 67 buildings and 1,033 units to 32 of 66 and 1,009 |
| Strict | apply the strict search | pairs only: 11 units on a 23-room floor, 44 of 92 = 47.8% < 50%, so no compliant scheme | "No scheme of adjacent merges is compliant under the strict reading"; drawing left as it was |
| Average | apply the average search | back to the loaded scheme | 48 / 8 / 36, all pass; district back to 33 of 67 and 1,033 units |
| Mandate 100% → 50% | move the slider with the Ivanhoe selected | at 100% it converts; at 50% the mandate does not need it | "phase 8 · 52 units · 40 displaced" then "left as it is" |

One defect surfaced and was fixed in the same session: the building panel's "In the district scenario" line
did not refresh when the mandate slider moved, so it kept saying "phase 8" after the district had dropped the
building. Cause: the district re-rendered without re-rendering the building panel. Change: the district
render now re-renders the building panel when a building is selected.

## A problem, its cause, and what changed

The one-pass ordering rule for the district programme put a swing building (one whose conversion adds spare
homes) first, but the phase filler could pack it into the same phase as the building that needed those homes,
which exist only after the phase ends: two tenants left who need not have. Found by reasoning about the
rule; reproduced in `test_the_rule_packs_the_swing_building_with_the_one_that_needs_it`; fixed by adding a
search over partitions into phases that separates them (`test_the_search_separates_them_and_nobody_leaves`).
On the real stock the search found an order with 27 fewer tenants left with nowhere to wait.
