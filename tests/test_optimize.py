"""The optimiser, checked against the evaluator and against the README.

The README proves by hand that Case 1 is the only compliant scheme the
example floor admits under the strict reading. The search must find it, and
nothing else. Every scheme the search returns must also pass the evaluator,
so the two halves of the tool cannot disagree.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from examples.floorplate import AREAS, EXAMPLE  # noqa: E402
from sro.evaluate import evaluate  # noqa: E402
from sro.model import Scheme  # noqa: E402
from sro.optimize import (  # noqa: E402
    Candidate, allocate, optimise, trade_off, uniform, uniform_trade_off,
)


def as_scheme(opt, floorplate):
    ids = [r.id for r in floorplate.rooms]
    groups = [[ids[i] for i in g] for g in opt.floors[0].groups]
    return Scheme(groups=groups, name="optimum")


class TestHandWorkedFloor(unittest.TestCase):
    def test_strict_reading_finds_case_1_and_only_case_1(self):
        o = optimise([AREAS], strict=True)
        self.assertTrue(o.feasible)
        self.assertEqual(o.floors[0].groups, [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]])
        self.assertEqual(o.floors[0].kept, [])
        self.assertEqual((o.units, o.lost), (5, 5))
        # the curve has a single point: five units, no other count is legal
        self.assertEqual([(t.units, t.lost) for t in trade_off([AREAS], True)], [(5, 5)])

    def test_strict_optimum_passes_the_evaluator(self):
        o = optimise([AREAS], strict=True)
        ev = evaluate(EXAMPLE, as_scheme(o, EXAMPLE))
        self.assertTrue(ev.compliant)
        self.assertEqual(ev.rooms_lost, o.lost)

    def test_average_reading_loses_fewer_rooms_and_still_passes(self):
        o = optimise([AREAS], strict=False)
        self.assertTrue(o.feasible)
        self.assertLess(o.lost, 5)
        ev = evaluate(EXAMPLE, as_scheme(o, EXAMPLE))
        self.assertTrue(ev.compliant)
        self.assertEqual(ev.rooms_lost, o.lost)
        self.assertEqual(len(ev.units), o.units)

    def test_asking_for_more_units_costs_more_rooms(self):
        # under the average reading the curve exists beyond the 50% floor
        curve = trade_off([AREAS], strict=False)
        self.assertEqual(curve[0].units, 5)
        for a, b in zip(curve, curve[1:]):
            self.assertGreaterEqual(b.lost, a.lost)


class TestBuilding(unittest.TestCase):
    def test_a_generous_floor_carries_a_mean_one(self):
        # README, Interpretive Decisions: the tests count rooms in the
        # building. Alone, a floor of three 100 SF rooms has no compliant
        # scheme (one pair is 33%). Under a floor of 200 SF rooms converted in
        # place, the building of six reaches 50% and the small floor is left
        # untouched, losing nobody.
        mean, generous = [100, 100, 100], [200, 200, 200]
        self.assertFalse(optimise([mean], strict=True).feasible)
        o = optimise([generous, mean], strict=True)
        self.assertTrue(o.feasible)
        self.assertEqual((o.units, o.lost), (3, 0))
        self.assertEqual(o.floors[1].kept, [0, 1, 2])

    def test_rooms_never_merge_across_a_floor_slab(self):
        # two floors of five 100 SF rooms: each floor pairs four and strands
        # one, so the building makes four units of ten, not five
        five = [100] * 5
        self.assertFalse(optimise([five, five], strict=True).feasible)

    def test_rooms_already_200_convert_in_place_with_no_loss(self):
        o = optimise([[200, 210, 250]], strict=True)
        self.assertEqual((o.units, o.lost, o.kept), (3, 0, 0))


class TestUniformClosedForm(unittest.TestCase):
    def test_matches_the_search(self):
        for n in (4, 7, 10, 11, 16):
            for a in (80, 95, 100, 115, 133, 150, 180, 200, 240):
                for strict in (True, False):
                    u = uniform(n, a, strict)
                    o = optimise([[a] * n], strict)
                    self.assertEqual(u.feasible, o.feasible, (n, a, strict))
                    if u.feasible:
                        self.assertEqual((u.units, u.lost), (o.units, o.lost), (n, a, strict))

    def test_curve_matches_the_search(self):
        for n, a in ((10, 150), (12, 120), (9, 110)):
            got = [(t.units, t.lost) for t in uniform_trade_off(n, a, False)]
            want = [(t.units, t.lost) for t in trade_off([[a] * n], False)]
            self.assertEqual(got, want, (n, a))

    def test_the_thresholds_the_stock_turns_on(self):
        # pairs at exactly 100 SF: the 50% case, no margin
        self.assertEqual(uniform(10, 100, True).lost, 5)
        # under 100 SF no adjacent-merge scheme is compliant under either reading
        self.assertFalse(uniform(10, 99, True).feasible)
        self.assertFalse(uniform(10, 99, False).feasible)
        # an odd count of sub-200 rooms cannot pair its way to 50% strictly...
        self.assertFalse(uniform(11, 150, True).feasible)
        # ...but a single carried by the average can
        self.assertTrue(uniform(11, 150, False).feasible)
        # larger rooms lose fewer: 150 SF rooms lose 2 of 10, not 5
        self.assertEqual(uniform(10, 150, False).lost, 2)


class TestDistrict(unittest.TestCase):
    def setUp(self):
        self.small = Candidate("small", 10, uniform_trade_off(10, 100, False))
        self.large = Candidate("large", 10, uniform_trade_off(10, 150, False))
        self.stuck = Candidate("stuck", 10, uniform_trade_off(10, 90, False))

    def test_the_building_with_larger_rooms_converts_first(self):
        a = allocate([self.small, self.large, self.stuck], 5)
        self.assertTrue(a.feasible)
        self.assertEqual(list(a.chosen), ["large"])
        self.assertEqual(a.lost, 2)

    def test_both_convert_when_the_mandate_asks_for_both(self):
        a = allocate([self.small, self.large, self.stuck], 10)
        self.assertEqual(set(a.chosen), {"small", "large"})
        self.assertGreaterEqual(a.units, 10)
        self.assertEqual(a.lost, 7)

    def test_a_building_with_no_compliant_scheme_cannot_help(self):
        self.assertEqual(self.stuck.curve, [])
        a = allocate([self.small, self.large, self.stuck], 25)
        self.assertFalse(a.feasible)

    def test_zero_target_converts_nothing(self):
        a = allocate([self.small, self.large], 0)
        self.assertEqual((a.units, a.lost, a.chosen), (0, 0, {}))


if __name__ == "__main__":
    unittest.main()
