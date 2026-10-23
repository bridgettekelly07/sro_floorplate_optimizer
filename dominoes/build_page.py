#!/usr/bin/env python3
"""build_page.py: write index.html, one self-contained page, from page_template.html,
edges.json, timing.json, track_map.json, size_quotes.json and diagrams/case_study_track.svg. The data is copied in as it stands;
nothing is added or changed.
  python3 diagrams/build_case_study_wide.py --page   (from diagrams/, writes case_study_track.svg)
  python3 build_page.py"""
import json
t = open("page_template.html").read()
for key, path in (("EDGES", "edges.json"), ("TIMING", "timing.json"), ("TRACKMAP", "track_map.json"), ("QUOTES", "size_quotes.json")):
    t = t.replace(f"/*__{key}__*/null", json.dumps(json.load(open(path))))
t = t.replace("<!--__TRACK__-->", open("diagrams/case_study_track.svg").read())
open("index.html", "w").write(t)
print("wrote index.html")
