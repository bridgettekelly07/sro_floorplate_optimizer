# SRO Conversion & Displacement in the DTES

ARCH 540, Assignment 1 — interactive tool translating Vancouver's SRA-Designated Room conversion rules into an explicit operation, checked against a hand-worked example and visualized in Rhino.

## Sources

See [`source/citation.md`](source/citation.md) for document versions and authority notes, and [`source/source_extract.md`](source/source_extract.md) for the annotated passages this tool is built from.

## Explanation

Vancouver protects its single-room occupancy stock through the Single Room Accommodation By-law, which designates individual rooms and makes it an offence to convert or demolish one without a permit (s.4.1). "Conversion" is defined broadly enough (s.1.2(e)) that physically merging rooms into self-contained units falls inside it, so a scheme of the kind this tool models begins as a permit application, not simply a design exercise. The *Policies and Guidelines for Converting SRA-Designated Rooms to Self-Contained Units* then set the criteria by which converted rooms may be released from that designation: each converted unit should reach 200 SF, or the project should average 200 SF where individual units fall short, and the total room count may drop by no more than 50% (Guidelines p.4). The Downtown Eastside Plan restates the size rule for conversions (Policy 9.2.11) and adds a requirement of its own — that at least 50% of rooms be replaced with self-contained units (Policy 9.2.7).

Read together, these numbers describe a trade-off rather than a checklist. The policy presupposes that existing rooms fall short of 200 SF, since otherwise no merging would be needed to reach it, so satisfying the size test generally means combining two or more rooms into one unit — and every combination reduces the room count. Raising unit quality therefore lowers unit quantity, and the 50% figure marks the point at which the City stops accepting that exchange. The interesting cases sit near that boundary: schemes where the size test can be met only by crossing the room-count cap, or where the room count can be held only by leaving some units under 200 SF and relying on the project average to carry them. Making that exchange visible — what a given merge pattern costs in rooms and what it buys in floor area — is the operation this tool performs.

Two things the arithmetic does not settle. First, passing both tests is not approval. The Guidelines say converted rooms "will be considered" for removal from the By-law, and the permit and its conditions remain with Council or the General Manager (By-law s.4.1, s.4.8); the numbers are a precondition, not an entitlement. Second, rooms lost is not the same quantity as tenants displaced. The By-law requires that displaced tenants be offered comparable accommodation and gives relocated residents a first right of refusal on the replacement rooms (s.4.8(f)–(g)), so some original tenants are re-housed within the smaller unit count. The number permanently displaced is therefore smaller than the arithmetic difference between old and new room counts, and how much smaller is a judgment the sources leave open. This tool reports the two figures separately rather than collapsing them into one.

## Scope

A single floorplate (or floor-equivalent room inventory) of an existing SRA-designated SRO building. The tool is an **evaluator**: the user proposes one combination scheme and the tool tests it against the source thresholds. It does not search for the best scheme — see Out of Scope. Given the room count, the individual room areas, and a proposed scheme, the tool computes:

- Whether the proposed scheme satisfies the 200 SF test, including the average fallback where individual units fall short (SRA Guidelines, p.4)
- Whether the resulting room-count reduction is ≤ 50% (SRA Guidelines, p.4)
- Whether the self-contained units produced are ≥ 50% of the original room count (DTES Plan, Policy 9.2.7) — a separate test from the one above, which a scheme can fail independently
- How many original rooms are lost outright (original count − new unit count) as a proxy for the scale of tenant relocation, distinguished from the (smaller) number requiring permanent relocation, using the right-of-first-refusal logic in Policy 9.5.3
- The compensation owed to each displaced tenant, in months' rent, from the tenancy-length schedule in the SRA By-law (s.4.8(i))
- A simple Rhino floor plan showing the "before" room grid and one "after" combination scheme, with bathroom/kitchen pods sized per Section 4.1

## Out of Scope

- The SRA By-law's permit *process* itself (application requirements, fees, inspections, enforcement) — the tool cites the By-law's definitions, permit trigger, and relocation/compensation conditions (see `source/source_extract.md`, passages 7–11) but does not model the approval workflow
- Financing/viability determinations of when 1-for-1 replacement is "not achievable due to financial or development constraints" (Policy 9.2.7) — at the discretion of City/Council
- Affordability and rent-setting mechanics generally (Section 5 of the Guidelines, and the TRPP's rent calculations) — excluding the SRA By-law's own compensation schedule (s.4.8(i)), which is in scope above
- Searching for an optimal or compliant combination scheme. The tool evaluates a scheme the user proposes; finding the best arrangement across all possible merge patterns is a search problem, recorded as the next direction beyond this assignment
- Whether a proposed scheme is physically buildable. A list of room areas cannot express which rooms adjoin one another, so the tool assumes the user proposes a scheme of adjacent rooms


## Input → Operation → Output

**Inputs (supplied by the user, one floorplate at a time):**
- Original room inventory — the number of existing SRA-designated rooms and each room's net floor area in SF
- Proposed combination scheme — which original rooms are grouped together to form each converted unit
- Tenancy length per occupied room, in years — used for the compensation schedule

**Thresholds (fixed by the sources — what the operation tests against, not user input):**
- 200 SF average threshold (SRA Guidelines p.4; restated DTES 9.2.11)
- 50% maximum room reduction (SRA Guidelines p.4)
- 50% minimum replacement for SRA conversions (DTES 9.2.7)
- 3-room de minimis exemption threshold (SRA By-law s.4.3A)
- Displacement trigger: any net room loss requires a relocation plan (DTES 9.5.1); SRA-designated rooms route specifically to the SRA By-law's relocation mechanism (9.5.4)
- Right-of-first-refusal as an available alternative when affordable replacement accommodation isn't otherwise available (9.5.3)
- Compensation schedule of 4–24 months' rent, indexed to tenancy length (SRA By-law s.4.8(i))

**Operation (planned):** from the original inventory and the proposed combination scheme, derive each converted unit's net area and the resulting unit count, then evaluate the numeric tests independently, each citing its own source clause, and compute rooms lost outright vs. an estimate of permanent displacement.

**Output (planned):** pass/fail on each test with its citation, room-loss count, permanently-displaced estimate, required compensation in months' rent per displaced tenant, and a Rhino before/after floor plan.

## Hand-Worked Example

These three cases were worked by hand from the source documents before any code existed. They are the answer key: when the tool runs, its output is checked against the expected results below, so that correctness does not depend on the model's own answer. The "Tool output" rows are filled in at W3–W4.

### The floorplate

One floor of an SRA-designated SRO building, 10 rooms, listed in corridor order:

| Room | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Area (SF) | 100 | 110 | 165 | 121 | 100 | 110 | 165 | 121 | 100 | 100 |
| Tenancy | 5 yr | 6 yr | 14 mo | 3 yr | 10 yr | 7 yr | 10 mo | 8 mo | 12 yr | 5 yr |

Total room area 1,192 SF; all rooms occupied. Merges are assumed to combine adjacent rooms only, and a merged unit's area is taken as the sum of its rooms. That merging two rooms reduces the room count by one is not an assumption but a definition: under SRA By-law s.1.2 a "room" may include "one or more connecting rooms… used, intended to be used, or customarily used as one unit" (`source/source_extract.md`, passage 13).

**A structural fact about this floor:** no room reaches 200 SF on its own — the largest is 165 — so every converted unit requires at least two rooms. That constraint drives all three cases.

### Case 1 — typical: full conversion in pairs

**Input.** All ten rooms merged in adjacent pairs, producing five units:

| Unit | A | B | C | D | E |
|---|---|---|---|---|---|
| Rooms | 1+2 | 3+4 | 5+6 | 7+8 | 9+10 |
| Area | 210 | 286 | 210 | 286 | **200** |

**Expected result — worked by hand:**

| Test | Source | Working | Result |
|---|---|---|---|
| Size | Guidelines p.4 — *"Converted SRA rooms that are at least 200 SF"* | every unit ≥ 200; average fallback not triggered. Average 1192 ÷ 5 = 238.4 SF | **Pass** |
| Room count | Guidelines p.4 — *"up to a maximum of 50%"* | 10 → 5 rooms; reduction 5 ÷ 10 = 50% | **Pass, at the cap** |
| Replacement | DTES 9.2.7 — *"a minimum of 50% of rooms are replaced"* | 5 units ÷ 10 original rooms = 50% | **Pass, at the floor** |

Unit E sits exactly at 200 SF and the reduction exactly at 50%; both pass only under the inclusive reading recorded in Interpretive Decisions.

**Why this case matters.** Because every unit needs at least two rooms, five units consume all ten — so any scheme satisfying DTES 9.2.7 on this floor must be a full conversion into pairs. Any three-room merge drops the count to four units, a 60% reduction that breaks the Guidelines' cap. **This is the only compliant scheme this floorplate admits,** and it passes with zero margin on both tests.

**Tool output:** *to be recorded at W3.*

### Case 2 — conflicting: partial conversion

**Input.** Rooms 1–6 merged into three units; rooms 7–10 left as SRA rooms.

| Unit | A | B | C | Untouched |
|---|---|---|---|---|
| Rooms | 1+2 | 3+4 | 5+6 | 7, 8, 9, 10 |
| Area | 210 | 286 | 210 | 165, 121, 100, 100 |

After conversion: 3 units + 4 rooms = **7 rooms total.**

**Expected result — worked by hand:**

| Test | Source | Working | Result |
|---|---|---|---|
| Size | Guidelines p.4 | applies only to converted units: 210, 286, 210, all ≥ 200. Average 706 ÷ 3 = 235.3 SF | **Pass** |
| Room count | Guidelines p.4 | 10 → 7 rooms; reduction 3 ÷ 10 = 30% | **Pass**, with margin |
| Replacement | DTES 9.2.7 | 3 units ÷ 10 original rooms = 30%, below the 50% floor | **Fail** |

**Why this case matters.** One scheme, two documents, opposite outcomes. The four unconverted rooms count toward the Guidelines' surviving total but earn nothing under 9.2.7, so a scheme that looks conservative under the Guidelines is non-compliant under the Plan. This is the case that shows the two 50% figures are separate tests rather than one ratio stated twice.

It also lands on a second, unrelated boundary: the loss here is exactly **3 designated rooms**, which is the threshold in SRA By-law s.4.3A for the simplified permit route to the General Manager rather than Council. That route is not automatic — it additionally requires the General Manager to find "improved livability or operations" and secured affordability, both discretionary and outside what this tool computes. It confirms that s.4.3A operates on an absolute count, on a different axis from the percentage tests.

**Tool output:** *to be recorded at W3.*

### Case 3 — missing information: who is displaced

**Input.** The Case 1 scheme, with all ten rooms occupied. Question asked of the tool: what compensation does the project owe?

**Expected result — worked by hand.** Each tenancy maps to a bracket in SRA By-law s.4.8(i):

| Room | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Tenancy | 5 yr | 6 yr | 14 mo | 3 yr | 10 yr | 7 yr | 10 mo | 8 mo | 12 yr | 5 yr |
| Owed (months' rent) | 4 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 6 | 4 |

Rooms 1, 5 and 10 fall exactly on bracket boundaries (five and ten years) and are placed by the same inclusive reading applied to the area and room-count thresholds. Read exclusively instead, the total would be 48 months rather than 45.

Were every tenant displaced, the total owed would be **45 months' rent**. But Case 1 produces five units for ten occupied rooms, so five tenants are re-housed under the right of first refusal (s.4.8(f)–(g)) and **five must leave** — and no source says which five. The by-law grants the right of first refusal without ranking tenants by tenancy length, need, or any other criterion.

| | Tenants displaced | Total owed |
|---|---|---|
| Lower bound | the five shortest tenancies | **20 months' rent** |
| Upper bound | the five longest | **25 months' rent** |

**Expected output is therefore not a number.** It is the range 20–25 months' rent, plus the statement that the exact figure turns on an allocation decision the sources leave to the permit process. A tool that returned a single total here would be asserting something its sources do not support.

**Why this case matters.** The missing information is missing from the *regulation*, not from the user's input — supplying more data would not resolve it. The range is narrow on this floor because the tenancies are mostly short; on a building with long-tenured residents the same unresolved question would swing the total far more, since a single tenancy over 40 years carries 24 months on its own. The size of the gap is floorplate-dependent.

**Tool output:** *to be recorded at W3.*

### A note on who qualifies

s.4.8(i) is owed to every **"permanent resident"** whose tenancy is terminated, which the By-law defines as someone who occupies a room as their residence "for at least 30 days" (s.1.2; `source/source_extract.md`, passage 12). All ten tenancies on this floor exceed 30 days, including rooms 7 and 8 at ten and eight months, so every occupant is a permanent resident and the compensation schedule reaches all of them.

## Interpretive Decisions

- **"A minimum of 50% of rooms are replaced" (DTES 9.2.7) counts the self-contained units produced, not the original rooms consumed.** Policy 9.2.7 sits in a passage about replacing SRO stock with self-contained *social housing units*, so the quantity being counted is what the project ends up with. The test is therefore `units ÷ original rooms ≥ 50%`.

- **The Guidelines' 50% cap and DTES 9.2.7's 50% floor are two separate tests, reported separately with their own citations.** They coincide only where every room is converted. Where rooms are left unconverted, those rooms still count toward the Guidelines' surviving total but earn nothing under 9.2.7 — so a scheme can pass the cap and fail the floor. Under this reading 9.2.7 is the binding constraint on any partial conversion. Demonstrated in Case 2 of the hand-worked example.

- **Numeric thresholds are read as inclusive.** "At least 200 SF," "up to a maximum of 50%," "a minimum of 50%," and "no more than 3 designated rooms" each include the stated value, so a unit at exactly 200 SF and a reduction of exactly 50% both pass.

## Open Questions

- How to quantify "tenants permanently displaced" as distinct from "rooms lost outright." The SRA By-law (s.4.8(f)) gives a concrete "comparable accommodation" standard (rent ≤ 30% of income or previous rent, whichever is lower) and its own right-of-first-refusal condition — this can likely replace the placeholder logic from DTES 9.5.3 with something the tool can actually test against.
- The compensation schedule (s.4.8(i)) is in scope, but it is owed to tenants "whose tenancy is terminated as a result of the work" — so which tenants it covers depends on the displacement question above. Compensation can be computed confidently for any individual tenancy length; a project-wide total cannot be stated until "permanently displaced" is defined.
- The SRA By-law's 3-room de minimis exemption (s.4.3A) operates independently of the percentage-based tests — does a small building's proposal need to check both the percentage tests *and* this absolute-count exemption?
