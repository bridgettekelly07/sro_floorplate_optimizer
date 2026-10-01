# How the tool works

## The provision

Vancouver's Single Room Accommodation By-law protects SRO stock by requiring a permit to convert or demolish designated rooms (s.4.1). Merging rooms into self-contained units counts as "conversion" under the by-law's broad definition (s.1.2(e)), so this is a permitting question, not just a design one. 

Two policy tests govern these conversions. The **Guidelines** require converted units to reach 200 SF each, or average 200 SF across the project, and cap the room-count reduction at 50% (p.4). The Downtown Eastside Plan echoes the size rule (Policy 9.2.11) and adds its own room-replacement requirement: at least 50% of rooms must become self-contained units (Policy 9.2.7). 

These tests express a trade-off, not a checklist. Since existing rooms are usually smaller than 200 SF, meeting the size test typically requires merging multiple rooms into one, reducing the room count. Bigger units mean fewer units, and the 50% threshold marks where the City stops tolerating that exchange. This tool makes that trade-off visible: what a given merge pattern costs in rooms against what it gains in floor area, particularly near the 50% limit. 

Two caveats matter. Meeting both tests doesn't guarantee approval. The Guidelines only say qualifying rooms "will be considered" for release, with final say resting with Council (s.4.1). Also rooms lost isn't the same as tenants displaced: the by-law requires comparable relocation housing and gives affected tenants first right of refusal on new units (s.4.8(f)-(g)), so actual permanent displacement is likely lower than the raw room-count drop, by a margin the sources don't specify. The tool reports these two figures separately rather than conflating them. 

## One building: the floor, searched as the thresholds move

The evaluator answers "does this scheme pass?". The search answers the question a conversion
actually poses: *of every scheme this building admits, which one passes while moving the fewest
people?* It works for one building in section 01, and section 02 applies it to every building.

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

**The thresholds are the controls.** The plan is not edited by hand: beneath it sit six sliders, four for
the thresholds that decide the room arithmetic (minimum unit size, the largest cut in rooms, the least
share replaced, the rooms one unit may take) and two for the assumptions that fix the room sizes read
from the footprint (the largest existing room, the circulation share). Move one and the plan redraws at
the least-displacement scheme that passes the new set; the map and the district tally follow when the
slider is released. One set of thresholds drives the building and the district, so the two never
disagree. The size test is read on the average fallback; the strict reading is in the code but has no
control. The small-loss route (3 rooms, s.4.3A) and the permanent-resident threshold (30 days, s.1.2)
are fixed at the source values: they decide who is owed and which permit route applies, not who is
displaced. Where no scheme of adjacent
merges passes, every room is drawn as kept and the building is reported as not converting. A single
tenancy length stands for every room, since no source gives one per room. The tally beside the plan
gives the scheme's figures; the tests below the plan show the working, each with its citation.
[`thresholds.md`](thresholds.md) lists every threshold the sources set, with which ones move the count.

The plan is drawn two ways. When a building is selected it shows the rooms **as they stand**, a door
each to the corridor and a window on the outer wall; the shared washrooms are not drawn, since the
outline holds no record of them. Once a slider moves it shows the scheme **under these thresholds**,
which gives every unit the program of SRA Guidelines p.5–6, a complete
bathroom and a kitchen run with a 24″ refrigerator, and one door. The source dimensions only the
refrigerator; the pods are conventional minimums (5′ × 8′ bath, 8′ × 2′ kitchen, 3′ door) and are
stated as such on the plan. They sit at the corridor wall so the window wall stays free: the
bathroom at one end of the unit, the door beside it, the kitchen run along the corridor wall after
the door or, where the unit is too narrow for that, up the far party wall. A unit that cannot take
the run either way is flagged: it fails on program before it fails on area, which the area tests
alone would not show.

**The stock.** Appendix B gives each building a room count and nothing else, so
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

Everything above tests one floor against the sources. Section 02 applies the same tests to every building
in the stock at once and shows who they displace, and the **Policy** button on the map colours the
district by the result. It is not a
search for the least displacement across the district, and it does not decide where anyone goes: it is a
picture of what a policy does, so that the policy itself can be questioned. Three kinds of assumption enter
and are the tool's own, not the City's: how a typical floor is read from a footprint (a double-loaded
corridor, 25% circulation, rooms capped at 180 SF); that every room is occupied, so rooms lost are tenants
displaced; and the survey's average tenancy and rent, which price the compensation. A reviewer checking
claims against sources should treat this part as an argument built on the operation, not as a reading of
the documents.

**The thresholds are the sliders of section 01.** Section 02 adds only the choice of stock: private SROs,
public SROs, or all of Appendix B. Changing a slider re-runs the search for every building in that
stock when the slider is released.

**What the section shows.** Every building
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

**The frame.** The map fills the window and the sidebar scrolls through section 01, the selected building,
and section 02, the policy. The policy colouring is on from the start; the Policy button toggles it back
to tenure. Below 900 px the map sits above the sidebar.

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

### The district in 3D

The map opens in 3D. It raises every building footprint to the height the City's 2009 LiDAR recorded for
it (*Building Footprints 2009*, field `hgt_agl`), and draws the 143 SRO buildings of Appendix B on their
own footprints, coloured by the policy, or by tenure when the Policy colouring is off. Selecting a
building draws its typical floor in section 01. Drag to pan, shift-drag
or right-drag to orbit, scroll to zoom; hovering names a building and clicking loads it into section 01,
exactly as on the flat map. The **Plan** button looks straight down through an orthographic camera, north up,
so the district reads as a plan without perspective; panning, zooming and picking work as before, and orbiting
tips it back into perspective.

Each SRO is drawn from the City's LiDAR-measured footprint parts at their own heights, so a rear wing or a lower
annex stands at its measured height rather than being averaged into one block. The masses are plain; a faint line
around each part at every floor level marks the storeys, spaced from that part's own height at the 3.4 m floor to
floor the tool assumes throughout. Where the building is on the Vancouver Heritage Register the
building card gives its evaluation group, the register's own name for it and any designation.

The map covers more than the stock: the downtown peninsula, False Creek and the blocks east to Clark
Drive, so the district reads as part of the city. Around the surveyed extent every building is the
City's 2009 footprint at its LiDAR height. The ground is the City's terrain: a heightfield interpolated
from its 1-metre contours at a 15 m cell,
drawn as a lit mesh so the slopes read, with every second contour laid on it, the fives stronger. Every building stands on the ground under its footprint, sunk a little so no gap
opens on a slope. The land is the City's 2002 shoreline flood-filled from known land, water everything else, and the
parks, streets and lanes are painted onto the terrain over it: the City's parks, lanes and street centrelines, the streets drawn at a
pavement width by use (13, 11 and 8.5 m for arterial, secondary and residential, 5 m for lanes) with a
sidewalk band either side and a curb line between, and the City's own sidewalk centrelines over that.
The centrelines, shoreline, parks and lanes are measured; the widths are a drawing convention, not a
survey of curbs. The City's public trees stand where it records them, each a canopy and a trunk sized
from the height and diameter it lists. `tools/city-data.py` rebuilds all of this from the portal.

Appendix B gives a room count and never a storey count or a floor area. The height fills the first gap: a
building's storeys are read from its LiDAR height at an assumed 3.4 m floor to floor, and that count is what
the floorplate model starts from (the Ivanhoe Hotel's 18.2 m reads as five storeys). It is an estimate and is
labelled as one; the older assumption of about 22 rooms to a floor remains for the nine buildings the City has
no height for. See [`citation.md`](citation.md) for how the heights were matched.

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
