# Case study: the Ivanhoe Hotel, and what 200 square feet costs

A demo script for the SRO Conversion tool. One building carries the story from the first click to
the district tally, and two others show the edges of the policy. Every figure here is what the tool
shows under the thresholds named, read from the same model the page runs; the figures are in the
tables so you can glance at them while you talk.

Allow about twelve minutes. The headings are the beats; the indented lines are what to do on screen.

---

## 0. Before you start

- Open the live page, or `npm run dev` and open http://localhost:5173.
- Light theme reads better on a projector; the sun and moon button under the legend toggles it.
- Leave every slider at its default. The policy colouring is on from the start.
- Decide beforehand whether you will orbit. Shift-drag or right-drag tips the view; **Plan** returns
  it to a straight-down drawing, and **Fit** brings the whole district back.

## 1. The question (one minute)

Vancouver lets an owner merge single-room-occupancy rooms into self-contained units if three tests
pass: every unit reaches 200 SF, no more than half the rooms are lost, and at least half the rooms
come back as units. Every merge removes a room, and a tenant with it. The tool asks one question:
**under these thresholds, who leaves?**

> The thresholds are sliders. That is the point of the tool. The by-law is a set of numbers, and
> this lets you argue with the numbers.

## 2. Orient the district (two minutes)

> The map opens on the Downtown Eastside in 3D: the peninsula, False Creek, the blocks east to
> Clark Drive.

- Scroll out once or twice so the water and Stanley Park are in frame. Beyond the City's data the
  ground is a plain grid; inside it the terrain is the City's 1 m contours and the water its 2002
  shoreline.
- Point out that every building stands at the height the City's 2009 LiDAR measured. Science World
  is the dome at the east end of False Creek, a useful landmark when you orbit.
- The coloured buildings are the 143 SROs of Appendix B of the 2024 SRO Tenant Survey, on their own
  footprints. Everything else is context in white.

Read the legend aloud, it is the whole colour logic:

- **Pale yellow** converts with nobody displaced.
- **Amber, orange, red** convert with 1 to 10, 11 to 25, and 26 or more tenants displaced. The
  classes count people, not shares, so a big hotel and a small rooming house at the same share no
  longer match.
- **Slate blue** means the building cannot convert under these thresholds: no compliant scheme
  exists. A building already self-contained by its record displaces nobody and shows yellow.

> Press **Policy** once to drop back to tenure colouring, then again to return. Note that the camera
> holds its position.

## 3. The building: the Ivanhoe Hotel (three minutes)

Zoom toward Main Street at the east end of False Creek. The Ivanhoe is the five-storey block at
1038 Main St, a short walk north of Science World, and it is on the Vancouver Heritage Register in
evaluation group B. Hover to confirm the name, then click it.

- Section 01 loads the building card and the typical floor.

| The Ivanhoe as it stands | |
|---|---|
| Rooms | 92 |
| Residential storeys | 4, over a ground floor |
| Rooms per floor | 23, in a double-loaded corridor |
| Each room, read from the footprint | about 116 SF |
| Tenure | private, privately operated |

> The plan is a type, not a survey. The room count is Appendix B's, the outline is the City's, and
> the corridor, the bays and the stair between them are stated assumptions. The square footage sits
> on every room.

Now read the right-hand tally. The plan is already drawn at the scheme that passes the City's
thresholds while losing the fewest rooms.

| Under the City's thresholds, 200 SF | |
|---|---|
| Units | 48 |
| Rooms kept as SRA | 8 |
| Tenants displaced | 36 |
| Share of the building | 39% |

> At 116 SF no room reaches 200 SF alone, so nearly every unit is two rooms. Two rooms into one
> unit is one tenant out. Below the plan the three tests are worked line by line, each with its
> citation: the size test, the 50% cap on the cut, the 50% replacement floor.

The 36 is above the small-loss route of three rooms, so this is a Council decision, not a
General Manager permit. The tool says so under the plan.

## 4. Move one slider (two minutes)

Drag **Minimum unit size** down from 200 to 150 and let go.

- The plan redraws as you drag. Most rooms now convert in place; the pairs are fewer. When you
  release, the map recolours and the district tally in section 02 updates.

| The Ivanhoe at 150 SF | |
|---|---|
| Units | 52 |
| Rooms kept as SRA | 24 |
| Tenants displaced | 16 |
| Share of the building | 17% |

> Fifty square feet is the difference between 36 people and 16, in one building. Nothing else
> changed.

Try 175 SF for the middle case: 52 units, 12 kept, 28 displaced. Then drag the size up to 250 and
**Largest cut in rooms** down to 30%. The Ivanhoe turns blue: three-room units cannot leave 70% of
the count standing, so there is no compliant scheme and the plan shows every room kept.

Return both sliders to their defaults before the next beat. With a slider focused, the arrow keys step it, which is steadier than dragging on a projector.

## 5. The district (two minutes)

The district's figures sit in the readout on the map, under the title, and update with every slider.
The policy is applied to every SRO in Appendix B, public and private alike.

| All of Appendix B, 142 buildings with rooms | 200 SF (the City's) | 150 SF | 250 SF and a 30% cut |
|---|---|---|---|
| Buildings that convert | 130 of 142 | 136 of 142 | 77 of 142 |
| Units delivered | 3,921 | 5,357 | 1,823 |
| Rooms kept as SRA | 887 | 443 | 573 |
| Tenants displaced | 1,139 · 18% | 372 · 6% | 764 |
| Buildings that cannot pass | 12, holding 540 rooms | 6 | 65, holding 3,329 rooms |
| Need Council, over 3 rooms lost | 85 | 23 | 71 |
| Compensation owed, s.4.8(i) | $2.41 M | $0.76 M | $1.61 M |

Of the 1,139 at the City's thresholds, 544 are in the 76 private SROs, 520 in public stock and 75 in
buildings the survey could not enter.

> The bar in the readout sorts every tenant the policy reaches: displaced, re-housed in a new unit,
> staying in a kept room, or in a building that cannot convert. Section 02 in the sidebar holds the
> ranked list of buildings by tenants displaced; clicking a row loads it into section 01.

> Compensation is the by-law's own schedule, s.4.8(i): months of rent by length of tenancy. The
> survey's average tenancy of 4.6 years gives four months, at the survey's average market rent of
> $640. Every room is taken as occupied.

## 6. The building that cannot convert: the Lion Hotel (one minute)

Click the Lion Hotel at 316 Powell St, or pick it from the list. 77 rooms at about 88 SF each. At
200 SF it is blue.

> Below 100 SF a room has no compliant conversion. Two rooms cannot reach 200 SF, so a unit needs
> three, and three-room units cannot leave half the count standing. For this building the policy
> means replacement, not conversion. Lower the minimum to 150 and it converts: 42 units, 6 kept,
> 30 displaced. The minimum unit size is the only threshold that changes its fate.

For the opposite end, the Lotus Hotel at 455 Abbott St: 106 rooms, and at the City's thresholds only
6 tenants displaced, under 6%, because its rooms are large enough to convert in place.

## 7. Landing (one minute)

Three things the thresholds say on their own, before any modelling choice:

1. **The minimum unit size sets who leaves.** It decides how many rooms a unit consumes, and that,
   more than anything else in the provision, sets the displacement.
2. **Below 100 SF the policy is a replacement policy.** No threshold other than the minimum reaches
   those buildings.
3. **Larger rooms displace fewer people.** The stock with the smallest rooms is where any version
   of the policy costs the most.

> Reset the sliders. The tool does not say what the thresholds should be. It shows what each set
> costs, in people, in a building you can name.

---

## If someone asks

**Is rooms lost the same as tenants displaced?** The tool reports them as one figure because every
room is taken as occupied. The by-law requires comparable relocation housing and a first right of
refusal on the new units (s.4.8(f) and (g)), so permanent displacement is likely lower, by a margin
the sources do not give.

**Why does the size test pass with rooms under 200 SF?** The Guidelines allow an average of 200 SF
across all converted rooms where 200 SF each cannot be achieved. The tool reads the test on that
average fallback; the strict reading is in the code and makes every unit a pair.

**Why no more than three rooms to a unit?** No source sets a ceiling. Without one the search favours
one huge merge that carries the average for many rooms converted in place. It is stated as the tool's
own assumption and it is a slider.

**Where do the room sizes come from?** The footprint's area, less the circulation share, divided
among the rooms per floor, with the largest room capped. Both assumptions are sliders in the
second group, so the sensitivity is one drag away.

**Does passing mean approval?** No. The Guidelines say qualifying rooms will be considered for
release; Council decides. The replacement test here counts every unit made where Policy 9.2.7
counts social housing units, so the replacement share reported is an upper bound.

## The figures in one place

| Building | Address | Rooms | Room SF | 200 SF: units / kept / displaced | 150 SF | 250 SF, 30% cut |
|---|---|---|---|---|---|---|
| Ivanhoe Hotel | 1038 Main St | 92 | 116 | 48 / 8 / **36** (39%) | 52 / 24 / **16** | cannot pass |
| Lion Hotel | 316 Powell St | 77 | 88 | cannot pass | 42 / 6 / **30** | cannot pass |
| Hotel Canada | 518 Richards St | 150 | 130 | 84 / 18 / **48** (32%) | 114 / 18 / **18** | cannot pass |
| Lotus Hotel | 455 Abbott St | 106 | | 54 / 48 / **6** (6%) | | |


Sources: SRA Conversion Guidelines p.4–6; Downtown Eastside Plan Policies 9.2.7 and 9.2.11; SRA
By-law No. 8733 s.1.2, s.4.3A, s.4.8; 2024 SRO Tenant Survey, Appendix B. Threshold citations are
in [`thresholds.md`](thresholds.md) and [`source_extract.md`](source_extract.md); the model is
described in [`how_it_works.md`](how_it_works.md).
