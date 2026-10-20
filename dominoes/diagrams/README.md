# diagrams

Current set, 16:9, 1600 by 900 viewBox. Replace the whole folder in the repo with this one.

- as_is_workflow_16x9.svg: the process as the Council files show it
- case_study_overlay_16x9.svg: the same sheet with tool-type tracks and tool names
- tool_logic_16x9.svg: how the tool runs, agent-workflow notation
- run_supply_partial_15.svg, run_permit_allow_10.svg: first-attempt timelines rendered from cases/

Regenerate:
    python3 build_case_study_wide.py            # writes as_is_wide.svg
    python3 build_case_study_wide.py --overlay  # writes case_study_wide.svg
    python3 build_tool_logic_v6.py              # writes tool_logic_v6.svg
    python3 ../render.py ../cases/<case>.json <out>.svg

Palette: background #E9E2D6, slate #3D5A6C, coral #E0724E, pale cornflower #9DB9F0, text #2B3A42, muted #5F6E78.
