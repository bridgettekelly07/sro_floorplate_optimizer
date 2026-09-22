"""The hand-worked example in the README is the answer key.

These tests assert the tool reproduces results that were derived from the
source documents by hand, before any code existed.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from examples.floorplate import EXAMPLE, PAIRS, PARTIAL  # noqa: E402
from sro import rules  # noqa: E402
from sro.evaluate import evaluate  # noqa: E402
from sro.model import Floorplate, Room, Scheme  # noqa: E402


class TestFloorplate(unittest.TestCase):
    def test_totals(self):
        self.assertEqual(EXAMPLE.room_count, 10)
        self.assertEqual(EXAMPLE.total_area_sf, 1192)

    def test_no_room_reaches_200_alone(self):
        self.assertLess(max(r.area_sf for r in EXAMPLE.rooms), 200)

    def test_every_occupant_is_a_permanent_resident(self):
        # s.1.2: 30 days. The 8- and 10-month tenancies clear it.
        self.assertTrue(all(r.is_permanent_resident for r in EXAMPLE.rooms))


class TestCase1(unittest.TestCase):
    """Typical full conversion in pairs. Passes all three, with zero margin."""

    def setUp(self):
        self.ev = evaluate(EXAMPLE, PAIRS)

    def test_unit_areas(self):
        self.assertEqual(
            [u.area_sf for u in self.ev.units], [210, 286, 210, 286, 200]
        )

    def test_size_passes_without_the_average_fallback(self):
        self.assertTrue(self.ev.size.passed)
        self.assertFalse(self.ev.size_via_average)
        self.assertIn("238.4", self.ev.size.working)  # 1192 / 5

    def test_room_count_passes_at_the_cap(self):
        self.assertEqual(self.ev.surviving_rooms, 5)
        self.assertTrue(self.ev.room_count.passed)
        self.assertTrue(self.ev.room_count.at_boundary)
        self.assertEqual(self.ev.room_count.verdict, "Pass, at the limit")

    def test_replacement_passes_at_the_floor(self):
        self.assertTrue(self.ev.replacement.passed)
        self.assertTrue(self.ev.replacement.at_boundary)

    def test_compliant_overall(self):
        self.assertTrue(self.ev.compliant)

    def test_three_room_merge_breaks_the_cap(self):
        """Any three-room merge drops to four units: a 60% reduction."""
        scheme = Scheme(
            groups=[("1", "2", "3"), ("4", "5"), ("6", "7"), ("8", "9", "10")]
        )
        ev = evaluate(EXAMPLE, scheme)
        self.assertEqual(ev.surviving_rooms, 4)
        self.assertFalse(ev.room_count.passed)
        self.assertIn("60%", ev.room_count.working)


class TestCase2(unittest.TestCase):
    """One scheme, two documents, opposite outcomes."""

    def setUp(self):
        self.ev = evaluate(EXAMPLE, PARTIAL)

    def test_seven_rooms_survive(self):
        self.assertEqual(len(self.ev.units), 3)
        self.assertEqual(len(self.ev.untouched), 4)
        self.assertEqual(self.ev.surviving_rooms, 7)

    def test_size_applies_only_to_converted_units(self):
        self.assertEqual([u.area_sf for u in self.ev.units], [210, 286, 210])
        self.assertTrue(self.ev.size.passed)
        self.assertIn("235.3", self.ev.size.working)  # 706 / 3

    def test_room_count_passes_with_margin(self):
        self.assertTrue(self.ev.room_count.passed)
        self.assertFalse(self.ev.room_count.at_boundary)
        self.assertIn("30%", self.ev.room_count.working)

    def test_replacement_fails(self):
        self.assertFalse(self.ev.replacement.passed)
        self.assertIn("30%", self.ev.replacement.working)

    def test_not_compliant_overall(self):
        self.assertFalse(self.ev.compliant)

    def test_lands_on_the_three_room_exemption_threshold(self):
        self.assertEqual(self.ev.rooms_lost, 3)
        self.assertTrue(self.ev.small_loss_route)


class TestCase3(unittest.TestCase):
    """Compensation is a range, not a number."""

    def setUp(self):
        self.ev = evaluate(EXAMPLE, PAIRS)
        self.comp = self.ev.compensation

    def test_per_room_schedule(self):
        expected = {
            "1": 4, "2": 5, "3": 4, "4": 4, "5": 5,
            "6": 5, "7": 4, "8": 4, "9": 6, "10": 4,
        }
        self.assertEqual(self.comp.per_room, expected)

    def test_boundary_tenancies_read_inclusively(self):
        # Rooms 1, 10 at 5 years and room 5 at 10 years sit on bracket edges.
        self.assertEqual(rules.compensation_months(5), 4)
        self.assertEqual(rules.compensation_months(10), 5)
        self.assertEqual(rules.compensation_months(10.0001), 6)

    def test_total_if_everyone_were_displaced(self):
        self.assertEqual(self.comp.all_displaced_months, 45)

    def test_five_rehoused_five_leave(self):
        self.assertEqual(self.ev.rehoused, 5)
        self.assertEqual(self.ev.permanently_displaced, 5)

    def test_range_is_20_to_25_months(self):
        self.assertEqual(self.comp.low_months, 20)
        self.assertEqual(self.comp.high_months, 25)
        self.assertFalse(self.comp.is_determinate)

    def test_output_is_not_a_single_number(self):
        self.assertIn("20-25", self.comp.summary)
        self.assertIn("right of first", self.comp.summary)


class TestCase2Compensation(unittest.TestCase):
    """Untouched rooms terminate no tenancy, so they are not candidates."""

    def setUp(self):
        self.ev = evaluate(EXAMPLE, PARTIAL)

    def test_only_converted_rooms_are_at_risk(self):
        # Rooms 1-6 hold 6 tenants; 3 units re-house 3; 3 must leave.
        self.assertEqual(self.ev.permanently_displaced, 3)

    def test_range_drawn_from_rooms_1_to_6_only(self):
        # Amounts for rooms 1-6: 4, 5, 4, 4, 5, 5 -> low 4+4+4, high 5+5+5
        self.assertEqual(self.ev.compensation.low_months, 12)
        self.assertEqual(self.ev.compensation.high_months, 15)


class TestEdges(unittest.TestCase):
    def test_average_fallback_can_rescue_a_short_unit(self):
        fp = Floorplate(rooms=[
            Room("1", 150, 1), Room("2", 150, 1),
            Room("3", 130, 1), Room("4", 130, 1),
        ])
        ev = evaluate(fp, Scheme(groups=[("1", "2"), ("3", "4")]))
        self.assertEqual([u.area_sf for u in ev.units], [300, 260])
        self.assertTrue(ev.size.passed)
        self.assertFalse(ev.size_via_average)

        fp2 = Floorplate(rooms=[
            Room("1", 120, 1), Room("2", 60, 1),
            Room("3", 150, 1), Room("4", 150, 1),
        ])
        ev2 = evaluate(fp2, Scheme(groups=[("1", "2"), ("3", "4")]))
        self.assertEqual([u.area_sf for u in ev2.units], [180, 300])
        self.assertTrue(ev2.size_via_average)
        self.assertTrue(ev2.size.passed)  # average 240

    def test_exactly_200_passes_inclusively(self):
        fp = Floorplate(rooms=[Room("1", 100, 1), Room("2", 100, 1)])
        ev = evaluate(fp, Scheme(groups=[("1", "2")]))
        self.assertTrue(ev.size.passed)
        self.assertTrue(ev.size.at_boundary)

    def test_six_room_building_losing_three(self):
        """Guidelines cap met exactly and s.4.3A available at the same time."""
        fp = Floorplate(rooms=[Room(str(i), 110, 2) for i in range(1, 7)])
        ev = evaluate(fp, Scheme(groups=[("1", "2"), ("3", "4"), ("5", "6")]))
        self.assertEqual(ev.rooms_lost, 3)
        self.assertTrue(ev.room_count.at_boundary)
        self.assertTrue(ev.small_loss_route)

    def test_non_adjacent_merge_is_flagged_not_rejected(self):
        ev = evaluate(EXAMPLE, Scheme(groups=[("1", "3")]))
        self.assertFalse(ev.units[0].adjacent)
        self.assertTrue(any("non-consecutive" in w for w in ev.warnings))

    def test_vacant_room_owes_nothing(self):
        fp = Floorplate(rooms=[
            Room("1", 100, 20), Room("2", 100, None, occupied=False),
        ])
        ev = evaluate(fp, Scheme(groups=[("1", "2")]))
        self.assertEqual(ev.permanent_residents, 1)
        self.assertEqual(ev.permanently_displaced, 0)
        self.assertEqual(ev.compensation.low_months, 0)

    def test_room_in_two_units_is_rejected(self):
        with self.assertRaises(ValueError):
            Scheme(groups=[("1", "2"), ("2", "3")])


if __name__ == "__main__":
    unittest.main(verbosity=2)
