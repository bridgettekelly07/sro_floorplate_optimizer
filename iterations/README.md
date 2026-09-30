# Iterations

Features the browser tool once had and no longer uses, lifted out of `web/index.html` on
2026-09-30 so the live page holds only what it runs. Each file is the code as it was when it was
set aside, cut at the seams it had with the rest of the page; none of it runs on its own, and the
names it calls (`refresh`, `evaluate`, `typicalPlan`, `M3`, `PROJ`, `css`) are the live page's.
Git holds the working versions: the commit named beside each entry is the last that ran it.

| File | What it was | Last ran |
|---|---|---|
| `floorplate-editor.{html,js,css}` | Section 04: one floor as a manipulable three.js model. Rooms in a band off a corridor, partitions dragged to shift area, markers in the corridor to merge, a floor stack with duplicate and isolate, presets for the README's two cases, and the rooms-as-a-table inventory. Set aside when the plan became a drawing driven by the search, then by the sliders. | `cea93cd` (the model was already switched off by `EDITOR_OFF`) |
| `compensation-panel.{html,js,css}` | The compensation range under the tests: months' rent owed under s.4.8(i) as a low-to-high range over the displaced tenants, with the per-room schedule. The district tally still reports the compensation total. | `cea93cd` (hidden) |
| `unit-breakdown.{html,js}` | Section 05: units per floor, SF per unit, circulation and floors typed in to generate a floorplate, and the seeding of those inputs when a building was selected. Replaced by the typical floor read from the footprint. | `cea93cd` (hidden) |
| `rent-affordability.{html,js,css}` | The rent test against the by-law's 30%-of-income ceiling and the shelter component, with the unit size following the scheme. The survey's reference values it used stay in the page as `SURVEY`. | `cea93cd` (hidden) |
| `building-records.{html,js,css}` | The user's own building records: the form with the hundred-block address index, click-to-place on the map, the list, the store (`window.claude.use("db")` with an in-memory fallback), CSV import and export, and the survey toggle. Appendix B replaced the need for them. | `cea93cd` (hidden) |
| `rhino-export-import.js` | Export the selected building to a `.3dm` (massing, typical floor, notes as document user text) and read one back, the imported drawing pinning the building so the policy took it as drawn. Removed with the pinning it relied on. | `cea93cd` |
| `roof-marks.js` | One column per building in perspective, one metre per displaced tenant, and a disc of the same count in plan. Tried on 2026-09-30 and replaced by the gradient on the massing. | never committed |

Two tries from the same day left no code worth keeping: a kernel-smoothed hexagonal dot field after
John Nelson's drought maps (colour the share displaced, size the count), and a white-city look with drawn
roof edges after the studio's axonometrics (light theme forced, `--m3-bldg #f4f2ed`, `--m3-water
#c8d4d4`, `--m3-park #c3d1b5`, hemisphere light 1.7, sun 0.38). Both were undone within the hour.

To bring a feature back, put its markup where the `<!-- ==== ... ==== -->` headings say it sat, its
script inside the page's IIFE at the matching section, and its styles in the `<style>` block; then
restore the seams named in the headings.
