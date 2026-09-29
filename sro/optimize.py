"""The search: which compliant scheme displaces the fewest tenants?

The evaluator tests a scheme the user proposes. This module does the other
half of the job the README recorded as the next direction: it searches every
scheme of *adjacent* merges a building admits and returns the one that loses
the fewest rooms while passing all three numeric tests.

Why the objective is "rooms lost". Rooms left untouched keep their tenant, and
the units produced re-house one tenant each under the right of first refusal
(SRA By-law s.4.8(f)-(g)). So, with every room occupied, the tenants who must
leave are exactly the rooms consumed by conversion minus the units made -- the
building's net room loss. Minimising loss is minimising displacement.

Two readings of the size test are offered, because the Guidelines offer two:

* ``strict``   -- every converted unit reaches 200 SF on its own.
* ``average``  -- the fallback: "an average of 200 SF across all converted
                  rooms will be considered". A room converted in place below
                  200 SF is then permitted if larger units carry the mean.

The fallback is discretionary ("will be considered"), so the strict result is
the safe one and the average result is the best case. Both are reported.

Two levels:

* :func:`optimise` -- one building of one or more floors, room by room, by
  dynamic programming over corridor order. Exact.
* :func:`uniform` -- the closed form for a building whose rooms are all the
  same size, which is all Appendix B lets us assume about most of the stock.
  Checked against :func:`optimise` in the tests.
* :func:`allocate` -- the district: given each building's trade-off curve,
  which buildings convert, and how far, to reach a mandated number of
  self-contained units at the least displacement.
* :func:`sequence` -- the order: the chosen conversions packed into phases
  under a relocation capacity, least harm first.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from . import rules

EPS = 1e-9
MAX_MERGE = 3   # rooms a unit may take. An assumption: beyond three the "unit" is a
                # suite, and the search would otherwise favour one huge merge that
                # carries the average for many rooms converted in place.


# ---------------------------------------------------------------------------
# One floor: every (units, kept) pair reachable by adjacent merges, with the
# largest converted area that pair can carry.
# ---------------------------------------------------------------------------

@dataclass
class _State:
    area: float                    # converted area so far
    prev: Optional[Tuple[int, int, int]]   # (i, u, k) this came from
    move: Tuple                    # ("keep",) or ("unit", start, end)


@dataclass
class FloorFrontier:
    layers: List[Dict[Tuple[int, int], _State]]

    @property
    def terminal(self) -> Dict[Tuple[int, int], _State]:
        return self.layers[-1]

    def walk(self, key: Tuple[int, int]):
        """Rebuild one floor's groups and kept rooms from a terminal state."""
        i, (u, k) = len(self.layers) - 1, key
        groups: List[List[int]] = []
        kept: List[int] = []
        st = self.layers[i][(u, k)]
        while st.prev is not None:
            pi, pu, pk = st.prev
            if st.move[0] == "keep":
                kept.append(pi)
            else:
                groups.append(list(range(st.move[1], st.move[2] + 1)))
            i, u, k = pi, pu, pk
            st = self.layers[i][(u, k)]
        groups.reverse()
        kept.reverse()
        return groups, kept


def floor_frontier(areas: Sequence[float], strict: bool) -> FloorFrontier:
    """Reachable (units, kept) pairs for one floor, each with its max area.

    ``areas`` are the room areas in corridor order. A unit is a run of
    consecutive rooms. Under ``strict`` a run below 200 SF is not a unit.
    The terminal layer is keyed by (units, kept); every state carries the
    back-pointer needed to rebuild the scheme.
    """
    n = len(areas)
    # layers[i]: states after deciding rooms 0..i-1
    layers: List[Dict[Tuple[int, int], _State]] = [dict() for _ in range(n + 1)]
    layers[0][(0, 0)] = _State(0.0, None, ())
    for i in range(n):
        for (u, k), st in layers[i].items():
            # leave room i as an SRA room
            _push(layers[i + 1], (u, k + 1), st.area, (i, u, k), ("keep",))
            # or start a unit at i and close it at j
            s = 0.0
            for j in range(i, min(n, i + MAX_MERGE)):
                s += areas[j]
                if strict and s < rules.MIN_UNIT_AREA_SF - EPS:
                    continue
                _push(layers[j + 1], (u + 1, k), st.area + s, (i, u, k), ("unit", i, j))
    return FloorFrontier(layers)


def _push(layer, key, area, prev, move):
    cur = layer.get(key)
    if cur is None or area > cur.area + EPS:
        layer[key] = _State(area, prev, move)




# ---------------------------------------------------------------------------
# One building
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class FloorScheme:
    groups: List[List[int]]        # room indices per unit, in corridor order
    kept: List[int]                # room indices left as SRA rooms


@dataclass(frozen=True)
class Optimum:
    """The least-loss compliant scheme, or the reason there is none."""

    feasible: bool
    strict: bool
    original: int
    units: int
    kept: int
    lost: int
    converted_area: float
    floors: List[FloorScheme] = field(default_factory=list)
    reason: str = ""

    @property
    def surviving(self) -> int:
        return self.units + self.kept

    @property
    def reduction(self) -> float:
        return self.lost / self.original if self.original else 0.0

    @property
    def replacement(self) -> float:
        return self.units / self.original if self.original else 0.0

    @property
    def average_unit_sf(self) -> float:
        return self.converted_area / self.units if self.units else 0.0


@dataclass(frozen=True)
class TradeOff:
    """One point on a building's curve: this many units cost this many rooms."""
    units: int
    lost: int
    kept: int
    converted_area: float


def _min_units(original: int) -> int:
    # DTES 9.2.7, read inclusively: units / original >= 0.5
    return math.ceil(original * rules.MIN_REPLACEMENT_RATIO - EPS)


def _passes(original: int, u: int, k: int, area: float) -> bool:
    lost = original - u - k
    if original and lost / original > rules.MAX_ROOM_REDUCTION + EPS:
        return False
    if u < _min_units(original):
        return False
    if u and area / u < rules.MIN_UNIT_AREA_SF - EPS:
        return False
    return True


def building_frontier(floors: Sequence[Sequence[float]], strict: bool):
    """Combine the floors: every (units, kept) the building can reach.

    Returns ``(states, per_floor)`` where ``states`` maps (U, K) to
    (max area, list of per-floor (u, k) choices) and ``per_floor`` holds each
    floor's own frontier for rebuilding.
    """
    per_floor = [floor_frontier(f, strict) for f in floors]
    states: Dict[Tuple[int, int], Tuple[float, List[Tuple[int, int]]]] = {(0, 0): (0.0, [])}
    for fr in per_floor:
        nxt: Dict[Tuple[int, int], Tuple[float, List[Tuple[int, int]]]] = {}
        for (U, K), (A, path) in states.items():
            for (u, k), st in fr.terminal.items():
                key = (U + u, K + k)
                a = A + st.area
                cur = nxt.get(key)
                if cur is None or a > cur[0] + EPS:
                    nxt[key] = (a, path + [(u, k)])
        states = nxt
    return states, per_floor


def optimise(floors: Sequence[Sequence[float]], strict: bool = True,
             min_units: Optional[int] = None) -> Optimum:
    """The compliant scheme that loses the fewest rooms.

    ``floors`` is a list of floors, each a list of room areas in corridor
    order; a run of rooms that cannot merge with one another (the far side of
    a corridor) is passed as its own floor. A unit takes at most ``MAX_MERGE``
    rooms. ``min_units`` raises the floor on self-contained units above what
    DTES 9.2.7 requires, for a mandate that asks more of a building.
    Ties on rooms lost go to more units, then to more converted area.
    """
    original = sum(len(f) for f in floors)
    states, per_floor = building_frontier(floors, strict)
    need = max(_min_units(original), min_units or 0)
    best = None
    for (U, K), (A, path) in states.items():
        if U < need or not _passes(original, U, K, A):
            continue
        cand = (U + K, U, A, (U, K), path)
        if best is None or cand[:3] > best[:3]:
            best = cand
    if best is None:
        return Optimum(False, strict, original, 0, 0, 0, 0.0, [],
                       reason=_why_infeasible(floors, strict, need))
    _, _, A, (U, K), path = best
    schemes = []
    for fr, key in zip(per_floor, path):
        g, kept = fr.walk(key)
        schemes.append(FloorScheme(g, kept))
    return Optimum(True, strict, original, U, K, original - U - K, A, schemes)


def trade_off(floors: Sequence[Sequence[float]], strict: bool = True) -> List[TradeOff]:
    """Least rooms lost for every unit count the building can legally reach.

    The curve starts at the DTES 9.2.7 floor and rises: each further unit the
    mandate asks for costs more rooms, because a smaller share of the stock
    is left untouched.
    """
    original = sum(len(f) for f in floors)
    states, _ = building_frontier(floors, strict)
    best: Dict[int, TradeOff] = {}
    for (U, K), (A, _p) in states.items():
        if not _passes(original, U, K, A):
            continue
        lost = original - U - K
        cur = best.get(U)
        if cur is None or lost < cur.lost or (lost == cur.lost and A > cur.converted_area):
            best[U] = TradeOff(U, lost, K, A)
    return [best[u] for u in sorted(best)]


def _why_infeasible(floors, strict, need) -> str:
    original = sum(len(f) for f in floors)
    areas = [a for f in floors for a in f]
    small = sum(1 for a in areas if a < rules.MIN_UNIT_AREA_SF - EPS)
    if strict:
        return (f"under the strict reading every unit needs 200 SF; {small} of {original} rooms "
                f"fall short, and merging them cannot leave {need} units standing")
    return (f"even averaging, the floor area of the rooms merged cannot reach 200 SF x {need} units "
            f"without consuming more rooms than the building has")


# ---------------------------------------------------------------------------
# The closed form for uniform rooms, for the stock at large
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Uniform:
    feasible: bool
    original: int
    units: int
    consumed: int          # rooms merged or converted in place
    kept: int
    lost: int
    pairs: int             # two-room units
    singles: int           # one-room units, only under the average reading
    triples: int           # three-room units, only where rooms are small
    note: str = ""


def uniform(original: int, area_sf: float, strict: bool = True,
            min_units: Optional[int] = None) -> Uniform:
    """Least-loss compliant conversion of ``original`` rooms all of ``area_sf``.

    Derivation. Let U be units, C rooms consumed, K = N - C kept. Loss is
    C - U. DTES 9.2.7 needs U >= N/2. Under the average reading the size test
    is C * a >= 200 U, so C = ceil(200 U / a); loss never falls as U rises,
    so the least-loss U is at or just above the floor. Under the strict reading each unit takes g = ceil(200 / a)
    rooms, C = g U, and U >= N/2 is only reachable when g <= 2.
    """
    N = original
    if N <= 0:
        return Uniform(False, 0, 0, 0, 0, 0, 0, 0, 0, "no rooms")
    need = max(_min_units(N), min_units or 0)
    a = area_sf
    if a >= rules.MIN_UNIT_AREA_SF - EPS:
        # every room already meets the standard: convert in place, lose nothing
        return Uniform(True, N, N, N, 0, 0, 0, N, 0, "rooms already reach 200 SF; converted in place")
    if strict:
        g = math.ceil(rules.MIN_UNIT_AREA_SF / a - EPS)
        U = N // g
        if U < need:
            return Uniform(False, N, 0, 0, N, 0, 0, 0, 0,
                           f"{g}-room units leave at most {U} of {N}; the 50% floor needs {need}")
        # more units than needed only lose more rooms; stop at the floor
        U = need
        C = g * U
        return Uniform(True, N, U, C, N - C, C - U,
                       U if g == 2 else 0, 0, U if g == 3 else 0)
    # Loss ceil(200U/a) - U is non-decreasing in U but not strictly: where a
    # further unit costs nothing extra, take it (the search breaks ties the
    # same way, towards more units).
    best = None
    for U in range(need, N + 1):
        C = math.ceil(rules.MIN_UNIT_AREA_SF * U / a - EPS)
        if C > N:
            break
        if best is None or C - U <= best[1] - best[0]:
            best = (U, C)
    if best is None:
        C = math.ceil(rules.MIN_UNIT_AREA_SF * need / a - EPS)
        return Uniform(False, N, 0, 0, N, 0, 0, 0, 0,
                       f"{need} units averaging 200 SF need {C} rooms of {a:g} SF; the building has {N}")
    U, C = best
    # C rooms into U adjacent units: as many pairs as the surplus demands,
    # triples only when C > 2U
    extra = C - U
    if extra <= U:
        pairs, singles, triples = extra, U - extra, 0
    else:
        triples = extra - U
        pairs = U - triples
        singles = 0
    return Uniform(True, N, U, C, N - C, C - U, pairs, singles, triples)


def uniform_trade_off(original: int, area_sf: float, strict: bool = True) -> List[TradeOff]:
    """The curve for uniform rooms: rooms lost for each reachable unit count."""
    N, a = original, area_sf
    out: List[TradeOff] = []
    if N <= 0:
        return out
    for U in range(_min_units(N), N + 1):
        if a >= rules.MIN_UNIT_AREA_SF - EPS:
            C = U
        elif strict:
            C = math.ceil(rules.MIN_UNIT_AREA_SF / a - EPS) * U
        else:
            C = math.ceil(rules.MIN_UNIT_AREA_SF * U / a - EPS)
        if C > N:
            break
        out.append(TradeOff(U, C - U, N - C, C * a))
    return out


# ---------------------------------------------------------------------------
# The district
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Candidate:
    """A building the mandate might reach, with its trade-off curve."""
    key: str
    original: int
    curve: Sequence[TradeOff]


@dataclass(frozen=True)
class Allocation:
    target_units: int
    units: int
    lost: int
    chosen: Dict[str, TradeOff]    # key -> the point taken; absent = not converted
    feasible: bool


def allocate(candidates: Sequence[Candidate], target_units: int) -> Allocation:
    """Reach ``target_units`` self-contained units district-wide at least loss.

    A multiple-choice knapsack: every building contributes nothing, or one
    point of its curve. Exact, by dynamic programming over the unit count,
    capped at the target so that overshooting costs nothing extra. A building
    with an empty curve has no compliant conversion and cannot contribute;
    the mandate has to be met without it.
    """
    T = max(0, target_units)
    INF = float("inf")
    layers = _forward_layers(candidates, T)
    if layers[-1][T] == INF:
        return Allocation(T, 0, 0, {}, False)
    chosen: Dict[str, TradeOff] = {}
    t, units = T, 0
    for idx in range(len(candidates) - 1, -1, -1):
        prev, cur, c = layers[idx], layers[idx + 1], candidates[idx]
        if prev[t] != INF and abs(prev[t] - cur[t]) < EPS:
            continue                      # skipped: same loss without it
        for p in c.curve:
            hit = None
            for t_prev in range(T + 1):
                if prev[t_prev] != INF and min(T, t_prev + p.units) == t \
                        and abs(prev[t_prev] + p.lost - cur[t]) < EPS:
                    hit = t_prev
                    break
            if hit is not None:
                chosen[c.key] = p
                units += p.units
                t = hit
                break
    return Allocation(T, units, int(round(layers[-1][T])), chosen, True)


@dataclass(frozen=True)
class Phase:
    """One phase of works: the buildings converted together.

    ``in_works`` is every room in those buildings, since a building's tenants
    are all re-housed for the duration of its conversion (s.4.8(f)); ``lost``
    is the permanent displacement the phase produces.
    """
    number: int
    keys: List[str]
    in_works: int
    units: int
    lost: int
    cumulative_units: int
    cumulative_lost: int
    over_capacity: bool = False


def sequence(chosen: Sequence[Tuple[str, int, TradeOff]], capacity: int) -> List[Phase]:
    """Order the chosen conversions into phases under a relocation capacity.

    ``chosen`` holds (key, original rooms, the point taken) for every building
    the allocation converts. ``capacity`` is the most rooms that can be under
    works at once: the relocation housing the City can supply for one phase.

    Least harm first: buildings are taken in rising order of tenants displaced
    per unit delivered, so if the programme stops early the conversions made
    are the ones that cost least. Each building goes into the earliest phase
    with room for it. A building larger than the capacity gets a phase of its
    own and is flagged.
    """
    cap = max(1, capacity)
    order = sorted(chosen, key=lambda c: (c[2].lost / c[2].units if c[2].units else math.inf,
                                          -c[2].units, c[1], c[0]))
    bins: List[dict] = []
    for key, original, point in order:
        slot = next((b for b in bins if b["in_works"] + original <= cap and not b["over"]), None)
        if slot is None:
            slot = {"keys": [], "in_works": 0, "units": 0, "lost": 0, "over": original > cap}
            bins.append(slot)
        slot["keys"].append(key)
        slot["in_works"] += original
        slot["units"] += point.units
        slot["lost"] += point.lost
    out: List[Phase] = []
    cu = cl = 0
    for n, b in enumerate(bins, 1):
        cu += b["units"]
        cl += b["lost"]
        out.append(Phase(n, b["keys"], b["in_works"], b["units"], b["lost"], cu, cl, b["over"]))
    return out


# ---------------------------------------------------------------------------
# The programme as a housing ledger: where the tenants of each phase go.
#
# Converting a building removes homes, so moving tenants between SROs can
# only help where there is slack: vacant rooms in the stock, homes a converted
# building has to spare, and new units opening elsewhere. The ledger tracks
# that slack phase by phase. Everyone in a building under works is out for the
# duration and is placed, nearest first, in slack inside the district, then in
# the relocation housing the City supplies, and otherwise leaves the district
# for the phase. Those the building cannot take back (tenants minus homes
# after conversion) need a permanent place: slack in the district consumes
# it, new supply consumes it, and the rest leave the district for good.
#
# The order is a heuristic, stated: buildings whose conversion adds slack
# (vacant rooms exceeding rooms lost) go first, since they make room for the
# phases after them; among the rest, least harm per unit first.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Stock:
    """A building in the programme."""
    key: str
    rooms: int
    vacant: int                  # rooms with no tenant before works
    units: int                   # self-contained units after conversion
    kept: int                    # rooms kept as SRA
    xy: Tuple[float, float]      # metres, any local frame
    convert: bool = True

    @property
    def tenants(self) -> int:
        return max(0, self.rooms - self.vacant)

    @property
    def homes_after(self) -> int:
        return self.units + self.kept

    @property
    def lost(self) -> int:
        return self.rooms - self.homes_after

    @property
    def not_returning(self) -> int:
        return max(0, self.tenants - self.homes_after)

    @property
    def spare_after(self) -> int:
        return max(0, self.homes_after - self.tenants)


@dataclass(frozen=True)
class Move:
    src: str
    dst: str                     # a building key, or "relocation", "new", "out"
    n: int
    permanent: bool
    metres: float


@dataclass(frozen=True)
class Step:
    number: int
    keys: List[str]
    out: int                     # tenants out of their building this phase
    temp_district: int           # of those, housed in slack inside the district
    temp_relocation: int         # in the City's relocation housing
    temp_left: int               # nowhere in the district or the relocation housing
    perm_need: int               # tenants the buildings cannot take back
    perm_district: int           # absorbed by slack in the district
    perm_new: int                # absorbed by new supply
    perm_left: int               # leave the district for good
    moves: List[Move]
    cum_units: int
    cum_perm_left: int


def _dist(a, b) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _with_vacancy(stock: Sequence[Stock], vacancy: Optional[float]) -> List[Stock]:
    if vacancy is None:
        return list(stock)
    return [Stock(s.key, s.rooms, int(round(s.rooms * vacancy)), s.units, s.kept, s.xy, s.convert) for s in stock]


def heuristic_phases(stock: Sequence[Stock], relocation: int, new_per_phase: int = 0) -> List[List[str]]:
    """The stated rule: slack-adding buildings first, then least harm per unit,
    each phase filled until the tenants going out exceed the slack of the moment."""
    free = {s.key: s.vacant for s in stock}
    todo = [s for s in stock if s.convert]
    new_pool = 0
    phases: List[List[str]] = []

    def order_key(s: Stock):
        harm = s.lost / s.units if s.units else math.inf
        return (-(s.vacant - s.lost), harm, s.key)

    while todo:
        todo.sort(key=order_key)
        new_pool += new_per_phase
        chosen: List[Stock] = []
        out = 0
        for s in todo:
            taken = {c.key for c in chosen}
            slack = sum(free[k] for k in free if k != s.key and k not in taken) + new_pool + relocation
            if chosen and out + s.tenants > slack:
                continue
            chosen.append(s)
            out += s.tenants
        for s in chosen:
            todo.remove(s)
            free[s.key] = s.spare_after
        phases.append([s.key for s in chosen])
    return phases


PLACEMENTS = ("nearest", "concentrate")
WALK_M = 600.0   # how far "together" will reach before it falls back to nearest: about a ten-minute walk


def run_programme(stock: Sequence[Stock], phases: Sequence[Sequence[str]], relocation: int,
                  new_per_phase: int = 0, placement: str = "nearest") -> List[Step]:
    """Follow the tenants through a given partition of the conversions into phases.

    ``placement`` is where a building's tenants go first: ``nearest`` takes the
    nearest spare room, however scattered; ``concentrate`` takes the building
    that can hold the most of them within ``WALK_M`` metres, nearest first
    among equals, so they stay together in as few buildings as possible; beyond
    that walk it falls back to nearest.
    """
    if placement not in PLACEMENTS:
        raise ValueError(f"placement must be one of {PLACEMENTS}")
    by = {s.key: s for s in stock}
    free: Dict[str, int] = {s.key: s.vacant for s in stock}
    new_pool = 0
    steps: List[Step] = []
    cum_units = cum_left = 0
    for keys in phases:
        chosen = [by[k] for k in keys]
        new_pool += new_per_phase
        in_works = set(keys)
        for s in chosen:
            free[s.key] = 0                     # its vacant rooms go into the works
        moves: List[Move] = []
        tally = {"perm_district": 0, "perm_new": 0, "perm_left": 0,
                 "temp_district": 0, "temp_relocation": 0, "temp_left": 0, "relocation": relocation}
        # temporary occupants borrow slack for the phase; track what is borrowed so
        # two buildings in one phase do not both borrow the same room
        borrowed: Dict[str, int] = {}

        def place(src: Stock, n: int, permanent: bool):
            nonlocal new_pool
            kind = "perm" if permanent else "temp"
            left = n
            room = lambda k: free[k] - borrowed.get(k, 0)
            if placement == "concentrate":
                # within a walk (WALK_M), the building that holds the most of them; beyond it, nearest
                dests = sorted((k for k in free if k not in in_works and room(k) > 0),
                               key=lambda k: (_dist(src.xy, by[k].xy) > WALK_M, -min(room(k), n), _dist(src.xy, by[k].xy)))
            else:
                dests = sorted((k for k in free if k not in in_works and free[k] > 0), key=lambda k: _dist(src.xy, by[k].xy))
            for k in dests:
                if left <= 0:
                    break
                take = min(left, free[k] - borrowed.get(k, 0))
                if take <= 0:
                    continue
                moves.append(Move(src.key, k, take, permanent, _dist(src.xy, by[k].xy)))
                if permanent:
                    free[k] -= take
                else:
                    borrowed[k] = borrowed.get(k, 0) + take
                tally[kind + "_district"] += take
                left -= take
            if left > 0 and new_pool - borrowed.get("new", 0) > 0:
                take = min(left, new_pool - borrowed.get("new", 0))
                moves.append(Move(src.key, "new", take, permanent, 0.0))
                if permanent:
                    new_pool -= take
                    tally["perm_new"] += take
                else:
                    borrowed["new"] = borrowed.get("new", 0) + take
                    tally["temp_district"] += take
                left -= take
            if left > 0 and not permanent and tally["relocation"] > 0:
                take = min(left, tally["relocation"])
                moves.append(Move(src.key, "relocation", take, False, 0.0))
                tally["relocation"] -= take
                tally["temp_relocation"] += take
                left -= take
            if left > 0:
                moves.append(Move(src.key, "out", left, permanent, 0.0))
                tally[kind + "_left"] += left

        # permanent placements first, since they consume slack; then the returning tenants borrow it
        for s in chosen:
            place(s, s.not_returning, True)
        for s in chosen:
            place(s, s.tenants - s.not_returning, False)
        for s in chosen:
            free[s.key] = s.spare_after            # homes nobody returns to
        cum_units += sum(s.units for s in chosen)
        cum_left += tally["perm_left"]
        steps.append(Step(len(steps) + 1, list(keys), sum(s.tenants for s in chosen),
                          tally["temp_district"], tally["temp_relocation"], tally["temp_left"],
                          sum(s.not_returning for s in chosen),
                          tally["perm_district"], tally["perm_new"], tally["perm_left"],
                          moves, cum_units, cum_left))
    return steps


def programme(stock: Sequence[Stock], relocation: int, new_per_phase: int = 0,
              vacancy: Optional[float] = None, placement: str = "nearest") -> List[Step]:
    """Sequence the conversions by the stated rule and follow the tenants.

    ``relocation`` is the tenants the City can house outside the district at
    once. ``new_per_phase`` is new supply opening each phase, taken as within
    the district. ``vacancy`` overrides every building's vacant count with a
    share of its rooms. Buildings with ``convert`` false only lend their vacant
    rooms.
    """
    stock = _with_vacancy(stock, vacancy)
    return run_programme(stock, heuristic_phases(stock, relocation, new_per_phase), relocation, new_per_phase, placement)


def programme_cost(steps: Sequence[Step]) -> Tuple[int, int, int, float]:
    """What a programme costs, in the order that matters: tenants who leave the
    district for good, tenants with nowhere to wait, phases, metres walked."""
    return (sum(s.perm_left for s in steps), sum(s.temp_left for s in steps), len(steps),
            sum(m.n * m.metres for s in steps for m in s.moves))


@dataclass(frozen=True)
class Programme:
    steps: List[Step]
    phases: List[List[str]]
    evaluations: int
    baseline_cost: Tuple[int, int, int, float]
    cost: Tuple[int, int, int, float]


def search_programme(stock: Sequence[Stock], relocation: int, new_per_phase: int = 0,
                     vacancy: Optional[float] = None, budget: int = 4000, placement: str = "nearest") -> Programme:
    """Improve on the stated rule by local search over the partition into phases.

    From the heuristic partition, try moving one building to another phase
    (or a new one), and swapping two buildings across phases; keep any change
    that lowers the cost, until nothing improves or the budget of evaluations
    runs out. The search can separate a swing building from the building that
    needs its spare homes, which the one-pass rule cannot: spare homes exist
    only after their phase ends.
    """
    stock = _with_vacancy(stock, vacancy)
    phases = [list(p) for p in heuristic_phases(stock, relocation, new_per_phase)]
    best = run_programme(stock, phases, relocation, new_per_phase, placement)
    best_cost = programme_cost(best)
    baseline = best_cost
    evals = 1

    def clean(ph):
        return [p for p in ph if p]

    improved = True
    while improved and evals < budget:
        improved = False
        n = len(phases)
        # move one building to another phase, or to a new phase after any position
        for i in range(n):
            for k in list(phases[i]):
                for j in range(n + 1):
                    if evals >= budget:
                        break
                    if j == i:
                        continue
                    trial = [list(p) for p in phases]
                    trial[i].remove(k)
                    if j == n:
                        trial.append([k])
                    else:
                        trial[j].append(k)
                    trial = clean(trial)
                    steps = run_programme(stock, trial, relocation, new_per_phase, placement)
                    evals += 1
                    c = programme_cost(steps)
                    if c < best_cost:
                        phases, best, best_cost, improved = trial, steps, c, True
                        break
                if improved:
                    break
            if improved:
                break
        if improved:
            continue
        # swap two buildings across phases
        for i in range(n):
            for j in range(i + 1, n):
                for a in list(phases[i]):
                    for b in list(phases[j]):
                        if evals >= budget:
                            break
                        trial = [list(p) for p in phases]
                        trial[i][trial[i].index(a)] = b
                        trial[j][trial[j].index(b)] = a
                        steps = run_programme(stock, trial, relocation, new_per_phase, placement)
                        evals += 1
                        c = programme_cost(steps)
                        if c < best_cost:
                            phases, best, best_cost, improved = trial, steps, c, True
                            break
                    if improved:
                        break
                if improved:
                    break
            if improved:
                break
    return Programme(best, phases, evals, baseline, best_cost)


def _forward_layers(candidates, T):
    INF = float("inf")
    layers = [[0] + [INF] * T]
    for c in candidates:
        cur = layers[-1]
        nxt = cur[:]
        for t in range(T + 1):
            if cur[t] == INF:
                continue
            for p in c.curve:
                t2 = min(T, t + p.units)
                nxt[t2] = min(nxt[t2], cur[t] + p.lost)
        layers.append(nxt)
    return layers
