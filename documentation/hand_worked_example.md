*The three cases below were worked by hand from the source documents before any code existed, and are asserted in
`frontend/tests/evaluate.test.js` and `frontend/tests/search.test.js`. The passages cited are in
[`source_extract.md`](source_extract.md).*

# The hand-worked example, the answer key

These three cases were worked by hand from the source documents before any code existed. They are the answer key: when the tool runs, its output is checked against the expected results below, so that correctness does not depend on the model's own answer. The "Tool output" rows below record what the code actually returns; each is asserted in `frontend/tests/evaluate.test.js`.

## The floorplate

One floor of an SRA-designated SRO building, 10 rooms, listed in corridor order:

| Room | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Area (SF) | 100 | 110 | 165 | 121 | 100 | 110 | 165 | 121 | 100 | 100 |
| Tenancy | 5 yr | 6 yr | 14 mo | 3 yr | 10 yr | 7 yr | 10 mo | 8 mo | 12 yr | 5 yr |

Total room area 1,192 SF; all rooms occupied. Merges are assumed to combine adjacent rooms only, and a merged unit's area is taken as the sum of its rooms. That merging two rooms reduces the room count by one is not an assumption but a definition: under SRA By-law s.1.2 a "room" may include "one or more connecting rooms… used, intended to be used, or customarily used as one unit" (`documentation/source_extract.md`, passage 13).

**A structural fact about this floor:** no room reaches 200 SF on its own (the largest is 165) so every converted unit requires at least two rooms. That constraint drives all three cases.

## Case 1: typical full conversion in pairs

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

## Case 2: conflicting partial conversion

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

## Case 3: missing information about who is displaced

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


## A note on who qualifies

s.4.8(i) is owed to every **"permanent resident"** whose tenancy is terminated, which the By-law defines as someone who occupies a room as their residence "for at least 30 days" (s.1.2; `documentation/source_extract.md`, passage 12). All ten tenancies on this floor exceed 30 days, including rooms 7 and 8 at ten and eight months, so every occupant is a permanent resident and the compensation schedule reaches all of them.

# Interpretive decisions

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

# Open questions

- "Tenants permanently displaced" is counted as rooms lost with every room occupied, and the surviving units re-house the rest under the right of first refusal (s.4.8(f)–(g)). The by-law's "comparable accommodation" standard (rent at most 30% of income or the previous rent) is not tested, since no source gives rent or income per tenant; the compensation total is therefore owed to a count the tool fixes by assumption, not by the standard.
- The SRA By-law's 3-room exemption (s.4.3A) operates independently of the percentage-based tests. Does a small building's proposal need to check both the percentage tests *and* this absolute-count exemption?
- **The replacement test counts units, but Policy 9.2.7 counts social housing units.** The engagement handout proposes changing what that term covers, and the tool has no notion of tenure or rent, so every unit it counts is assumed to qualify. **Its replacement percentage is therefore an upper bound.** Resolving this needs the enacted definition and a tenure attribute on each unit, neither of which the current inputs carry.
- Whether the s.4.8(i) compensation schedule the tool encodes is still the operative one. Recommendation E amends the SRA By-law "to improve tenant protections," and the schedule sits inside that section. The tool's figures are checked against the by-law text in hand, not against the amendment.
