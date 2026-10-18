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

The run placed the eviction as a single bar before the decision, so the harm reads as one event rather than a chain of consequences. That matches the evidence: the permit files show tenants already gone, and the health studies cover evictions in general. Two rule changes drove the difference from the first pass: a direction-0 edge now lands on the axis and passes nothing downstream, and sign now multiplies along the chain, which flipped the per-room charge and, in the boundary case, evictions from falling to rising. The supply and missing cases did not change. Still open: whether anything downstream of a 0 edge should be drawn at all, fork f4 showing only one side per run, the past-horizon flag on the earliest year, and the fact that no model has been called yet.
