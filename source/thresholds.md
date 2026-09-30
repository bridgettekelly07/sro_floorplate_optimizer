# Design Thresholds in the Sources

Every number the source documents set, gathered in one place so each can be judged as a slider.
Passage numbers refer to `source/source_extract.md`; authority of each document is in `source/citation.md`.

Three columns matter for the visualization. **Moves the count** says whether changing the value changes
how many tenants a conversion displaces. **In the tool** says whether it is already an input in the
policy panel. Thresholds that do not move the count still shape *who* is displaced, what they are owed,
or which route a permit takes, and can be shown without being sliders.

## A. Thresholds that decide the room arithmetic (these move the displacement count)

| # | Threshold | Source value | Clause | What it governs | Moves the count | In the tool |
|---|---|---|---|---|---|---|
| A1 | Minimum converted unit size, each unit | 200 SF net | SRA Guidelines p.4 (passage 1) | A merged unit smaller than this fails the size test on its own | Yes, strongly: the larger the unit, the more rooms merge into it | Yes, slider `Minimum unit size` |
| A2 | Minimum converted unit size, averaged across the project | 200 SF net average | SRA Guidelines p.4; DTES Plan 9.2.11 (passages 1, 4) | The discretionary alternative to A1: units may fall short if the average holds | Yes: the average read lets more rooms survive than the strict read | Yes, the `Size test read as` switch |
| A3 | Largest reduction in room count | 50% of original rooms | SRA Guidelines p.4 (passage 1) | A conversion may not lose more than this share of rooms | Yes: it caps displacement per building | Yes, slider `Largest cut in rooms` |
| A4 | Least share of rooms replaced, conversion | 50% of original rooms | DTES Plan 9.2.7 (passage 3) | At least this share must come back as self-contained units | Yes: numerically the mirror of A3; diverges from it only if the two are set apart | Yes, slider `Least replaced` |
| A5 | Least share of rooms replaced, redevelopment | 80%, or the inclusionary-zoning share if greater; 1 for 1 is the aim | DTES Plan 9.2.7 (passage 3) | The floor for demolition-and-rebuild, not conversion | Yes, if the visualization ever compares conversion against redevelopment | No |
| A6 | Rooms one unit may absorb | none stated | — | The sources set no ceiling; the tool assumes at most 3 rooms per unit | Yes: it bounds how big a unit can grow | Assumption only, not an input |

## B. Unit-design requirements that consume floor area (they move the count indirectly)

The Guidelines require a program inside every converted unit. None of these is a slider in the sources'
terms, but together they fix how much of a merged area is left as living space, which is what A1 and A2
test against.

| # | Requirement | Source value | Clause | Effect on the count |
|---|---|---|---|---|
| B1 | Complete bathroom: washbasin, toilet, shower and/or bath, partitioned with a door | no area stated | SRA Guidelines p.5–6 (passage 2) | Area taken out of the unit before the size test; the tool's "pod" |
| B2 | Cooking facilities: sink, counter space, cook top, refrigerator with freezer | fridge/freezer at least 12 cubic feet, 24 in × 24 in footprint | SRA Guidelines p.5–6 (passage 2) | The only dimensioned element; sets a floor on the kitchen pod |
| B3 | Sleeping area contiguous with living area, not enclosed; hide-a-bed and fold-down table if in the main area | no area stated | SRA Guidelines p.5–6 (passage 2) | No area cost by itself |
| B4 | Net area is measured after the above | "net" | DTES Plan 9.2.11 (passage 4) | Confirms A1/A2 are tested on what remains after B1–B2 |

A slider for **pod area** (bathroom plus kitchen, in SF) would let B1–B2 be explored; the survey's finding
that only 19% of tenants have a private bathroom (passage 16) means the pod is new construction in most
rooms, not an upgrade.

## C. Thresholds that route the permit or fix who is counted (they do not move the count)

| # | Threshold | Source value | Clause | What it governs | In the tool |
|---|---|---|---|---|---|
| C1 | Small-loss route | at most 3 designated rooms lost in the building | SRA By-law s.4.3A (passage 11) | At or under: permit from the General Manager; over: Council | Yes, slider `Small-loss route` |
| C2 | Permanent resident | at least 30 days in the room | SRA By-law s.1.2 (passage 12) | Who is owed relocation and compensation under s.4.8 | Yes, slider `Permanent resident` |
| C3 | Definition of a room | connecting rooms used as one unit count as one | SRA By-law s.1.2 (passage 13) | The denominator for A3 and A4 | Implicit |
| C4 | Definition of conversion | any alteration with material effect on permanent residents | SRA By-law s.1.2(e) (passage 7) | Every merge the tool draws is a conversion and needs a permit | Implicit |

## D. What a displaced tenant is owed (outputs, not inputs)

| # | Provision | Source value | Clause | Computable from |
|---|---|---|---|---|
| D1 | Comparable or better accommodation, rent cap | no higher than 30% of income or the previous rent, whichever is lower; RGI tenants no higher than paid | SRA By-law s.4.8(f) (passage 9) | rent and income per tenant, neither in Appendix B |
| D2 | First right of refusal on the replacement rooms | — | SRA By-law s.4.8(g); DTES Plan 9.5.3 (passages 6, 9) | the surviving unit count |
| D3 | Compensation by length of tenancy | 4 months' rent up to 5 years; 5 to 10 years; 6 to 20; 12 to 30; 18 to 40; 24 over 40 | SRA By-law s.4.8(i) (passage 10) | tenancy length and rent; the survey's averages stand in |
| D4 | Moving costs | actual costs | SRA By-law s.4.8(i) (passage 10) | not modelled |

D3 could become a **tenancy slider** (years at address) that changes the compensation total the map reports
without changing who is displaced.

## E. Proposed, not enacted (record only)

| # | Proposal | Value | Source | Bears on |
|---|---|---|---|---|
| E1 | What counts as social housing for replacement | from 33% of units at shelter rate, to 30% at or below Housing Income Limits with 20% at shelter rate | Engagement handout, May 2025 (passage 15) | Whether a replaced unit counts toward A4 and A5 |
| E2 | Amendments to the SRA By-law tenant protections, the DTES Plan and the Upgrade Guidelines | wording in appendices not in hand | Public hearing December 9, 2025 (passage 14) | D1–D4, possibly A1–A4 |

## F. Reference values from the 2024 SRO Tenant Survey (measurements, not rules)

| # | Value | Figure | Used for |
|---|---|---|---|
| F1 | Average rent, private SROs | $640 per month (from $439 eleven years earlier) | D3 compensation; affordability |
| F2 | Average rent, non-market SROs | $426 per month | D3 compensation; affordability |
| F3 | Shelter component of income assistance | $500 (from $375) | D1 rent cap |
| F4 | Average length of tenancy | 4.6 years | D3 bracket: 4 months' rent |
| F5 | Private bathroom / toilet / shower | 19% / 20% / 17% of tenants | B1 is new construction for most rooms |
| F6 | Stock | 143 buildings, 6,153 rooms; 133 surveyed, 908 tenants | the map |

## G. The tool's own assumptions (not in any source; each moves the count)

| # | Assumption | Value | Why it matters |
|---|---|---|---|
| G1 | Largest existing room | 180 SF cap | Sets how many rooms must merge to reach A1 |
| G2 | Circulation share of a floorplate | 25% | Sets the room area read from each footprint |
| G3 | Rooms per unit at most | 3 | A6 above |
| G4 | Floor to floor | 3.4 m | Storey count from LiDAR height |
| G5 | Every room occupied | 100% | Rooms lost equal tenants displaced |
| G6 | Pod area per unit | in the model, not exposed | B1–B2 above |

## Where this leaves the sliders

Already sliders: A1, A2, A3, A4, C1, C2. Of these only A1–A4 move the count.

Candidates to add, in order of how much they change the answer:
1. **Pod area** (B1–B2): bathroom plus kitchen SF taken from each unit before the size test.
2. **Rooms per unit** (A6/G3): the merge ceiling, now fixed at 3.
3. **Occupancy** (G5): the share of rooms occupied, now 100%; the survey does not give it.
4. **Largest existing room** and **circulation** (G1, G2): already in the Assumptions fold-out; could be promoted.
5. **Redevelopment replacement floor** (A5): only if redevelopment joins conversion on the map.
6. **Tenancy length** (D3): changes the compensation owed, not who is displaced.
