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
    Candidate, Stock, TradeOff, allocate, optimise, programme, programme_cost,
    run_programme, search_programme, sequence, trade_off, uniform,
    uniform_trade_off,
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


class TestSequence(unittest.TestCase):
    def setUp(self):
        # (key, rooms, point): harm per unit is lost / units
        self.gentle = ("gentle", 10, TradeOff(5, 0, 5, 1000.0))   # 0 per unit
        self.mid = ("mid", 10, TradeOff(5, 2, 3, 1000.0))          # 0.4 per unit
        self.harsh = ("harsh", 10, TradeOff(5, 5, 0, 1000.0))      # 1 per unit
        self.big = ("big", 40, TradeOff(20, 4, 16, 4000.0))         # 0.2 per unit

    def test_least_harm_first(self):
        ph = sequence([self.harsh, self.gentle, self.mid], capacity=10)
        self.assertEqual([p.keys for p in ph], [["gentle"], ["mid"], ["harsh"]])

    def test_capacity_packs_buildings_into_one_phase(self):
        ph = sequence([self.harsh, self.gentle, self.mid], capacity=20)
        self.assertEqual([p.keys for p in ph], [["gentle", "mid"], ["harsh"]])
        self.assertEqual(ph[0].in_works, 20)

    def test_cumulative_totals_match_the_allocation(self):
        ph = sequence([self.harsh, self.gentle, self.mid], capacity=10)
        self.assertEqual(ph[-1].cumulative_units, 15)
        self.assertEqual(ph[-1].cumulative_lost, 7)
        self.assertEqual([p.number for p in ph], [1, 2, 3])

    def test_a_building_over_capacity_stands_alone_and_is_flagged(self):
        ph = sequence([self.big, self.gentle, self.mid], capacity=20)
        big = [p for p in ph if "big" in p.keys][0]
        self.assertEqual(big.keys, ["big"])
        self.assertTrue(big.over_capacity)
        self.assertFalse(any(p.over_capacity for p in ph if p is not big))

    def test_a_later_small_building_fills_an_earlier_gap(self):
        # harm order: gentle, big, mid; mid (10) fits beside gentle (10) at 20
        ph = sequence([self.big, self.gentle, self.mid], capacity=20)
        self.assertEqual(ph[0].keys, ["gentle", "mid"])

    def test_nothing_chosen_means_no_phases(self):
        self.assertEqual(sequence([], capacity=10), [])


class TestProgramme(unittest.TestCase):
    """The housing ledger: where the tenants of each phase go."""

    def setUp(self):
        # A: 10 rooms, 4 vacant, 8 homes after -> 6 tenants all return, 2 homes to spare
        self.swing = Stock("A", 10, 4, 8, 0, (0.0, 0.0))
        # B: 10 rooms, full, 7 homes after -> 3 tenants cannot return
        self.tight = Stock("B", 10, 0, 7, 0, (100.0, 0.0))

    def test_the_swing_building_goes_first_and_its_spare_homes_absorb_the_next_phase(self):
        # relocation for six: A's tenants fit a phase, A and B together do not
        steps = programme([self.swing, self.tight], relocation=6)
        self.assertEqual([s.keys for s in steps], [["A"], ["B"]])
        p2 = steps[1]
        self.assertEqual(p2.perm_need, 3)
        self.assertEqual(p2.perm_district, 2)       # A's two spare homes
        self.assertEqual(p2.perm_left, 1)
        self.assertEqual(steps[-1].cum_perm_left, 1)

    def test_new_supply_absorbs_what_the_district_cannot(self):
        steps = programme([self.swing, self.tight], relocation=6, new_per_phase=1)
        p2 = steps[1]
        self.assertEqual((p2.perm_district, p2.perm_new, p2.perm_left), (2, 1, 0))

    def test_relocation_capacity_sets_the_phase_size(self):
        three = [Stock(k, 10, 0, 7, 0, (i * 50.0, 0.0)) for i, k in enumerate("XYZ")]
        steps = programme(three, relocation=15)
        self.assertEqual(len(steps), 3)
        # 7 return and wait in relocation housing; 3 have no home to return to and no slack to go to
        self.assertTrue(all(s.temp_relocation == 7 and s.temp_left == 0 and s.perm_left == 3 for s in steps))

    def test_a_building_larger_than_every_capacity_still_goes_and_the_overflow_is_counted(self):
        big = Stock("big", 40, 0, 30, 0, (0.0, 0.0))
        steps = programme([big], relocation=15)
        self.assertEqual(steps[0].temp_relocation, 15)
        self.assertEqual(steps[0].temp_left, 15)     # 30 returning tenants, 15 places
        self.assertEqual(steps[0].perm_left, 10)

    def test_tenants_go_to_the_nearest_slack_and_a_building_not_converting_can_lend_rooms(self):
        lender = Stock("C", 10, 5, 10, 0, (110.0, 0.0), convert=False)
        steps = programme([self.swing, self.tight, lender], relocation=100)
        p2 = [s for s in steps if "B" in s.keys][0]
        perm = [m for m in p2.moves if m.permanent]
        self.assertEqual([(m.dst, m.n) for m in perm], [("C", 3)])   # 10 m away beats A at 100 m
        self.assertEqual(p2.perm_left, 0)

    def test_vacancy_override_rewrites_every_building(self):
        steps = programme([self.tight], relocation=100, vacancy=0.3)
        # 10 rooms at 30% vacancy: 7 tenants, 7 homes after -> nobody lost
        self.assertEqual(steps[0].perm_need, 0)
        self.assertEqual(steps[0].out, 7)

    def test_totals_are_conserved(self):
        steps = programme([self.swing, self.tight], relocation=4, new_per_phase=1)
        for s in steps:
            self.assertEqual(s.out, sum(by.tenants for by in [self.swing, self.tight] if by.key in s.keys))
            self.assertEqual(s.temp_district + s.temp_relocation + s.temp_left + s.perm_district + s.perm_new + s.perm_left, s.out)


class TestSearchProgramme(unittest.TestCase):
    """The search over partitions, against the one-pass rule."""

    def setUp(self):
        self.swing = Stock("A", 10, 4, 8, 0, (0.0, 0.0))     # 2 homes to spare after works
        self.tight = Stock("B", 10, 0, 8, 0, (50.0, 0.0))    # 2 tenants cannot return

    def test_the_rule_packs_the_swing_building_with_the_one_that_needs_it(self):
        # with room for both at once, the rule converts them together, and A's spare
        # homes do not exist until the phase ends: B's two tenants leave
        steps = programme([self.swing, self.tight], relocation=100)
        self.assertEqual([s.keys for s in steps], [["A", "B"]])
        self.assertEqual(programme_cost(steps)[0], 2)

    def test_the_search_separates_them_and_nobody_leaves(self):
        r = search_programme([self.swing, self.tight], relocation=100)
        self.assertEqual(r.baseline_cost[0], 2)
        self.assertEqual(r.cost[0], 0)
        self.assertEqual(r.phases, [["A"], ["B"]])
        self.assertEqual(r.steps[1].perm_district, 2)

    def test_the_search_never_does_worse_than_the_rule(self):
        import random
        rng = random.Random(7)
        stock = [Stock(str(i), rng.randint(8, 40), rng.randint(0, 3), rng.randint(4, 30), 0,
                       (rng.uniform(0, 500), rng.uniform(0, 500)), rng.random() < 0.8) for i in range(12)]
        r = search_programme(stock, relocation=60, new_per_phase=2)
        self.assertLessEqual(r.cost, r.baseline_cost)
        keys = sorted(k for p in r.phases for k in p)
        self.assertEqual(keys, sorted(s.key for s in stock if s.convert))
        self.assertTrue(all(p for p in r.phases))

    def test_any_partition_can_be_run(self):
        steps = run_programme([self.swing, self.tight], [["B"], ["A"]], relocation=100)
        self.assertEqual([s.keys for s in steps], [["B"], ["A"]])
        self.assertEqual(steps[0].perm_district, 2)   # B first takes A's vacant rooms instead


if __name__ == "__main__":
    unittest.main()
