# SRO dominoes

A scenario tool for Vancouver's Downtown Eastside: set the levers in the SRO conversion process and the tool traces what the published evidence says follows, year by year, with a source on every link and both sides of every disagreement.

ARCH 540, Assignment 2. Mid review Oct 23, 2026.

## Run

    python3 run.py conversion_permit=allow 10
    python3 run.py unit_size_sf=200 10
    python3 run.py --target tenant_return_rate 10
    python3 run.py replacement_ratio=partial 15
    python3 render.py timeline.json timeline.svg

run.py writes timeline.json; render.py turns it into an SVG. Saved case outputs are in cases/, and check_cases.sh reruns and diffs all of them.

## Files

- edges.json: the rule set. 7 levers with settings, 21 outcomes, 30 rules, 4 forks, 18 sources. v0.5.
- timing.json: seven SRA permit cases from Council reports 2013 to 2026, with step durations.
- run.py: load, check, walk the chains by lag, write timeline.json. No model.
- render.py: timeline.json to SVG. Reads nothing else.
- page_template.html, build_page.py, index.html: the interactive page. Pick a lever and setting, set the horizon, click a bar for its source. It carries a JavaScript port of run.py and render.py. The case-study sheet at the top is the control: click a dashed callout to set its lever, and the stages the evidence reaches are ringed. Rebuild after editing edges.json, timing.json, track_map.json or the template with `(cd diagrams && python3 build_case_study_wide.py --page) && python3 build_page.py`, then open index.html.
- track_map.json: presentation only, which stage of the case-study sheet each outcome is drawn against. The author's reading, not a sourced claim.
- floorplate_unit_size.mjs, floorplate_unit_size.json: a separate model. Room counts from the floorplate engine in frontend/src/lib at each unit_size_sf setting. Counts, not claims; the page shows them in their own panel and the chain never uses them. Rerun with `node floorplate_unit_size.mjs`.
- first_attempt.md: what the runs showed, the evaluation cases as first run and as rerun, and what is still open.
- cases/: outputs of the six evaluation cases, one commit per rule-driven change.
- sources/: every source with verification status; pitch notes and user sessions.
- diagrams/: the three sheets and two run timelines as SVG, with the generators and a README.
- exports/: JPG and PDF of the same, for slides.

## Known problems, in order

1. Sign does not compose along a chain. Fixed Oct 18: directions multiply along the path.
2. A direction-0 rule propagates. Fixed Oct 18: it lands and stops.
3. A fork across two levers only shows one side per run. Fork f4 re-paired by hand so both sides leave one setting; the compare view is still to build.
4. Past-horizon is judged on the earliest year. Fixed Oct 18: judged on the midpoint.
5. The run starts from one setting; the final tool sets all seven at once.

## Credits

Permit cases from City of Vancouver Council reports. Claim sources listed in sources/sources_to_proof.md. User sessions to be credited here once held.
