# Testing

How the tool's answers are checked, in the form the assignment asks for: for each case, the input, the
source, the expected result worked without the tool, and what the tool actually did. The three cases are
a typical case, a boundary-and-conflict case, and a case with missing information. All three are asserted
in `frontend/tests/evaluate.test.js`; run everything from the repository root with:

```
npm test
```

*This write-up was made when the tool was a Python command line. The cases and the figures are
unchanged; the commands named below belonged to that version.*

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

## The thresholds as a policy

The browser tool and the Python package take the same five thresholds as a policy, the sources' by
default. `TestPolicy` in `tests/test_optimize.py` asserts that the default is the sources', that a lower
minimum unit size displaces fewer on the hand-worked floor, that a tighter cap makes the example
infeasible, that the replacement floor moves with the policy, that the closed form for uniform rooms
follows the search under another set of thresholds, and that an evaluation carries the policy it was run
under, so a result under a user's thresholds is never reported as the by-law's. The CLI takes the same
thresholds as flags (`--min-unit`, `--max-reduction`, `--min-replacement`, `--small-loss`,
`--resident-days`) and prints a line to stderr when they are not the sources'.

## Sanity checks in the browser

Things that must be true; if any is not, something is wrong.

- Source values: the panel says the thresholds are the sources', and the figures match the README's.
- The strict reading never produces more units or fewer displaced than the average reading.
- Lowering the minimum unit size never displaces more; raising it never displaces fewer. At a minimum every
  room already meets, nobody is displaced and every room converts in place.
- Tightening the largest cut can only take buildings out of "convert" and into "cannot pass", never the reverse.
- The tenants bar sums to everyone in the stock the policy reaches; displaced equals the tiles' figure.
- Pinning a building as drawn changes the district total by exactly that building's difference.
- The marks on the map add up to the tenants displaced; a building with none displaced carries no mark.
- A kept variant's row never changes; loading it reproduces its figures exactly.

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
| Policy at 150 SF | set the minimum unit size to 150 with the Ivanhoe selected | rooms of 116 SF pair less often; fewer tenants leave | section 02's size test reads 150 SF; the panel's tenants displaced falls, and the Ivanhoe's line follows |

One defect surfaced and was fixed in the same session: the building panel's scenario line did not refresh
when the district's inputs moved, so it kept an old answer after the district had dropped the building.
Cause: the district re-rendered without re-rendering the building panel. Change: the district render now
re-renders the building panel when a building is selected. The same wiring carries the policy panel.

## A problem, its cause, and what changed

The district's one-pass ordering rule, when the tool still phased conversions and re-housed tenants, put a
swing building in the same phase as the building that needed its spare homes, which exist only after the
phase ends; a search over partitions into phases fixed it. That machinery was removed when the tool became a
visualization of the policy, and its tests with it; the history is in git. The defect that remains worth
recording is the one above: a panel that reports on another panel's state must be re-rendered with it.
