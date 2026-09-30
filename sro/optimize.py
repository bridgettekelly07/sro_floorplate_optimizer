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

Every function takes a :class:`rules.Policy`; the default is the sources'
thresholds, and any other set is the user's, tried to see who it displaces.
The district-scale allocation and housing ledger that once followed here were
removed when the tool became a visualization of the policy rather than a
search for the least displacement; git holds them.
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


def floor_frontier(areas: Sequence[float], strict: bool,
                   policy: rules.Policy = rules.SOURCE) -> FloorFrontier:
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
                if strict and s < policy.min_unit_area_sf - EPS:
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


def _min_units(original: int, policy: rules.Policy = rules.SOURCE) -> int:
    # DTES 9.2.7, read inclusively: units / original >= 0.5
    return math.ceil(original * policy.min_replacement_ratio - EPS)


def _passes(original: int, u: int, k: int, area: float,
            policy: rules.Policy = rules.SOURCE) -> bool:
    lost = original - u - k
    if original and lost / original > policy.max_room_reduction + EPS:
        return False
    if u < _min_units(original, policy):
        return False
    if u and area / u < policy.min_unit_area_sf - EPS:
        return False
    return True


def building_frontier(floors: Sequence[Sequence[float]], strict: bool,
                      policy: rules.Policy = rules.SOURCE):
    """Combine the floors: every (units, kept) the building can reach.

    Returns ``(states, per_floor)`` where ``states`` maps (U, K) to
    (max area, list of per-floor (u, k) choices) and ``per_floor`` holds each
    floor's own frontier for rebuilding.
    """
    per_floor = [floor_frontier(f, strict, policy) for f in floors]
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
             min_units: Optional[int] = None,
             policy: rules.Policy = rules.SOURCE) -> Optimum:
    """The compliant scheme that loses the fewest rooms.

    ``floors`` is a list of floors, each a list of room areas in corridor
    order; a run of rooms that cannot merge with one another (the far side of
    a corridor) is passed as its own floor. A unit takes at most ``MAX_MERGE``
    rooms. ``min_units`` raises the floor on self-contained units above what
    DTES 9.2.7 requires, for a mandate that asks more of a building.
    Ties on rooms lost go to more units, then to more converted area.
    """
    original = sum(len(f) for f in floors)
    states, per_floor = building_frontier(floors, strict, policy)
    need = max(_min_units(original, policy), min_units or 0)
    best = None
    for (U, K), (A, path) in states.items():
        if U < need or not _passes(original, U, K, A, policy):
            continue
        cand = (U + K, U, A, (U, K), path)
        if best is None or cand[:3] > best[:3]:
            best = cand
    if best is None:
        return Optimum(False, strict, original, 0, 0, 0, 0.0, [],
                       reason=_why_infeasible(floors, strict, need, policy))
    _, _, A, (U, K), path = best
    schemes = []
    for fr, key in zip(per_floor, path):
        g, kept = fr.walk(key)
        schemes.append(FloorScheme(g, kept))
    return Optimum(True, strict, original, U, K, original - U - K, A, schemes)


def trade_off(floors: Sequence[Sequence[float]], strict: bool = True,
              policy: rules.Policy = rules.SOURCE) -> List[TradeOff]:
    """Least rooms lost for every unit count the building can legally reach.

    The curve starts at the DTES 9.2.7 floor and rises: each further unit the
    mandate asks for costs more rooms, because a smaller share of the stock
    is left untouched.
    """
    original = sum(len(f) for f in floors)
    states, _ = building_frontier(floors, strict, policy)
    best: Dict[int, TradeOff] = {}
    for (U, K), (A, _p) in states.items():
        if not _passes(original, U, K, A, policy):
            continue
        lost = original - U - K
        cur = best.get(U)
        if cur is None or lost < cur.lost or (lost == cur.lost and A > cur.converted_area):
            best[U] = TradeOff(U, lost, K, A)
    return [best[u] for u in sorted(best)]


def _why_infeasible(floors, strict, need, policy: rules.Policy = rules.SOURCE) -> str:
    original = sum(len(f) for f in floors)
    areas = [a for f in floors for a in f]
    m = policy.min_unit_area_sf
    small = sum(1 for a in areas if a < m - EPS)
    if strict:
        return (f"under the strict reading every unit needs {m:g} SF; {small} of {original} rooms "
                f"fall short, and merging them cannot leave {need} units standing")
    return (f"even averaging, the floor area of the rooms merged cannot reach {m:g} SF x {need} units "
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
            min_units: Optional[int] = None,
            policy: rules.Policy = rules.SOURCE) -> Uniform:
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
    need = max(_min_units(N, policy), min_units or 0)
    a, m = area_sf, policy.min_unit_area_sf
    if a >= m - EPS:
        # every room already meets the standard: convert in place, lose nothing
        return Uniform(True, N, N, N, 0, 0, 0, N, 0, f"rooms already reach {m:g} SF; converted in place")
    if strict:
        g = math.ceil(m / a - EPS)
        U = N // g
        if U < need:
            return Uniform(False, N, 0, 0, N, 0, 0, 0, 0,
                           f"{g}-room units leave at most {U} of {N}; the replacement floor needs {need}")
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
        C = math.ceil(m * U / a - EPS)
        if C > N:
            break
        if best is None or C - U <= best[1] - best[0]:
            best = (U, C)
    if best is None:
        C = math.ceil(m * need / a - EPS)
        return Uniform(False, N, 0, 0, N, 0, 0, 0, 0,
                       f"{need} units averaging {m:g} SF need {C} rooms of {a:g} SF; the building has {N}")
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


def uniform_trade_off(original: int, area_sf: float, strict: bool = True,
                      policy: rules.Policy = rules.SOURCE) -> List[TradeOff]:
    """The curve for uniform rooms: rooms lost for each reachable unit count."""
    N, a, m = original, area_sf, policy.min_unit_area_sf
    out: List[TradeOff] = []
    if N <= 0:
        return out
    for U in range(_min_units(N, policy), N + 1):
        if a >= m - EPS:
            C = U
        elif strict:
            C = math.ceil(m / a - EPS) * U
        else:
            C = math.ceil(m * U / a - EPS)
        if C > N:
            break
        out.append(TradeOff(U, C - U, N - C, C * a))
    return out
