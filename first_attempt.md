# First attempt, Oct 18

Core step: `run.py` loads `edges.json`, checks that the chosen option has a sourced edge, traverses the claim chains summing lags, and writes `timeline.json`. No model, no interface. Three runs of the same input produce byte-identical output.

## What it showed

The run on `conversion_permit=allow` over ten years placed six effects, four of them before the decision. The eviction edge from the seven permit files (e29, lag minus ten years to zero) pulled the whole health chain with it: violence exposure, treatment disruption and mortality risk all land on the axis before Council meets, because they follow from a move that has already happened. The timeline starts at year minus ten and the decision sits at the far right of the harm. That is the tenant sentence drawn by a script rather than argued by a person.

The run on `unit_size_sf=200` no longer stops. The July 2026 Council report gave it two edges: the designation threshold (mechanism) and the room-to-unit ratio of about one half (observation). The script carried the unit loss into evictions and then into the health chain. The 200 sf question now has a sourced timeline for building and tenant counts; it still has nothing for how tenants fare by unit size, which stays a stop in the schema.

The run on `--target tenant_return_rate` stopped as designed: no sourced edge leads to it, and the note explains why.

The run on `replacement_ratio=partial` over fifteen years reached fork f1 and drew both sides: Mast's vacancy chain lowering nearby rents from year one, and Smith's rent gap raising displacement from year eight to twenty-eight. The two camps occupy different parts of the same axis rather than contradicting each other at one point, which is the result the project is built around.

## What is still unknown

1. Sign is not composed along a chain. Each effect shows its own edge's direction, not the net direction after the edges before it. Edge e07 reads "units down, evictions up," so a chain through it should flip sign; the script does not yet do that. This is the first fix.
2. An edge with direction 0 propagates as if it moved. e29 says the permit does not cause the eviction, yet the traversal continues through evictions into health. The right rule is probably: a 0 edge lands on the axis but does not pass its effect on. To be decided.
3. A fork is only drawn on both sides when both edges are reachable from the chosen option. f4 pairs e29 (permit) with e30 (fee), which start from different decisions, so a single run shows one side. Either forks must share a start, or the comparison view is where both appear.
4. Past-horizon uses the earliest year. An effect spanning years eight to twenty-eight on a fifteen-year horizon is not flagged even though most of it falls outside. Flag on the midpoint or draw the overrun.
5. The repeated case cannot be run yet. The only non-deterministic step is the model, and the model is outside the first attempt. Variance will be measured at peer review 1.

## Evaluation cases as run

| case | input | expected | actual | status |
|---|---|---|---|---|
| typical | conversion_permit=allow, 10 yr | e01, e29 with negative lag, health chain | 6 effects, 4 before decision, axis from year -10 | pass, sign composition pending |
| boundary | unit_size_sf=200, 10 yr | e27, e28, fork f4 both sides | 6 effects via merge chain; f4 not reached from this option | partial, see unknown 3 |
| missing | --target tenant_return_rate | stop, ask for source | STOP with the outcome's note, exit code 2 | pass |
| supply | replacement_ratio=partial, 15 yr | fork f1 both sides | e12 and e14 both drawn, years 1 to 28 | pass |
| repeated | conversion_permit=allow, 3 runs | identical | identical md5 | pass, model variance not yet testable |

Outputs are in `cases/`.

## Second pass, Oct 18

The negative lag did not break the traversal. Lags are summed as plain integers, so e29 at minus ten to zero simply put the eviction bar and everything downstream of it on the left of the decision rule, and the axis started at year minus ten. What was wrong was the propagation: the first pass carried e29's target on into the health chain, so violence exposure, treatment disruption and mortality risk were drawn as following from a move the edge itself says the permit did not cause. Under the new rule a direction 0 edge lands on the axis and passes nothing on, so the typical case falls from six effects to three: the eviction record (0, years minus ten to zero, fork f4, now carrying the seven permit files from timing.json), the room count (minus, years zero to one) and the per-room charge (years two to six). Sign now multiplies along the chain, which changed two readings without moving a single bar: the per-room charge flips from minus to plus (rooms down, fee up, as the Council record says) and in the boundary case evictions flip from minus to plus (units down, evictions up), so the health chain downstream of the 200 sf threshold now reads as a rise on every row. The supply case and the missing case did not vary: no 0 edge and no sign flip lie on those paths, and tenant_return_rate still stops with its note. The harm before the decision is now one bar rather than a chain, and that is the honest shape of the evidence: the permit files show tenants already gone, and the health studies attach to evictions in general, not to evictions caused by a permit. Unknown: whether the downstream of a 0 edge should be drawn at all, perhaps as something that already happened rather than as a consequence; unknowns 3, 4 and 5 from the first pass still stand, since fork f4 still shows one side per run, past-horizon is still flagged on the earliest year, and no model has been called.
