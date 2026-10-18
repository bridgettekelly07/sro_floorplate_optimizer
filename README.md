# SRO dominoes

A scenario tool for Vancouver's Downtown Eastside: pick a decision in the SRO conversion process, and the tool traces what the published evidence says follows, year by year, with a source on every link and both sides of every disagreement.

ARCH 540, Assignment 2. Mid review Oct 23, 2026.

## Run the first attempt

    python3 run.py conversion_permit=allow 10
    python3 run.py unit_size_sf=200 10
    python3 run.py --target tenant_return_rate 10
    python3 run.py replacement_ratio=partial 15

Each run writes timeline.json. Saved outputs are in cases/.

## Files

- edges.json: the claim graph. 7 decisions with options, 21 outcomes, 30 edges, 4 forks, 18 sources. v0.5.
- timing.json: seven SRA permit cases from Council reports 2013 to 2026, with step durations.
- run.py: load, check, traverse by lag, write timeline. No model.
- first_attempt.md: what the runs showed, the evaluation cases, and five known problems.
- cases/: outputs of the four evaluation cases.
- sources/sources_to_proof.md: every source with verification status.
- sources/pitch_notes.md: the tenant sentence, the two permit-file findings, user sessions.
- diagrams/: as-is workflow, case-study overlay, tool logic (jpg, svg, and the Python that generates the tool-logic svg).

## Next task

Build render.py: timeline.json in, one static SVG out. Years on x starting at axis_start, one row per outcome, each effect a bar from year_min to year_max, colour by camp, stroke weight by evidence grade, a vertical rule at year 0 labelled decision, forks as paired rows, before_decision effects left of the rule.

Then fix in run.py: direction 0 edges land but do not propagate; sign composes along a chain by multiplication. Rerun cases/ and diff.

## Credits

Permit cases from City of Vancouver Council reports. Claim sources listed in sources/sources_to_proof.md. User sessions to be credited here once held.
