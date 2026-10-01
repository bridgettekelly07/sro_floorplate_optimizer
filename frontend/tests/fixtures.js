// The README's hand-worked floorplate, as code: 10 rooms in corridor order,
// all occupied, total 1,192 SF. A port of examples/floorplate.py.
export const AREAS = [100, 110, 165, 121, 100, 110, 165, 121, 100, 100];
export const TENANCIES = [5, 6, 14 / 12, 3, 10, 7, 10 / 12, 8 / 12, 12, 5];

// A floor as the evaluator takes it: rooms with id, area and tenancy, every
// room kept until a scheme says otherwise.
export function floor(areas, tenancies) {
  const rooms = areas.map((a, i) => ({ id: String(i + 1), area: a, tenancy: tenancies ? tenancies[i] : 1, keep: true }));
  return { rooms, joints: rooms.slice(1).map(() => false) };
}

// A scheme of adjacent merges, as groups of 1-based room ids, applied to a
// floor: the rooms in a group convert and are joined to their neighbour in
// it; every other room stays an SRA room.
export function scheme(fl, groups) {
  const rooms = fl.rooms.map((r) => ({ ...r })), joints = fl.joints.slice();
  const at = (id) => rooms.findIndex((r) => r.id === String(id));
  for (const g of groups) {
    const idx = g.map(at);
    idx.forEach((k) => { rooms[k].keep = false; });
    for (let q = 0; q < idx.length - 1; q++) {
      if (idx[q + 1] !== idx[q] + 1) throw new Error("a group must be consecutive rooms");
      joints[idx[q]] = true;
    }
  }
  return { rooms, joints };
}

export const EXAMPLE = floor(AREAS, TENANCIES);
// Case 1 / Case 3: all ten rooms merged in adjacent pairs.
export const PAIRS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];
// Case 2: rooms 1-6 merged into three units; rooms 7-10 left as SRA rooms.
export const PARTIAL = [[1, 2], [3, 4], [5, 6]];
