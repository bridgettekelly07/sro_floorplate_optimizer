#!/usr/bin/env python3
"""build_page.py: write index.html, one self-contained page, from page_template.html,
edges.json and timing.json. The data is copied in as it stands; nothing is added or changed.
  python3 build_page.py"""
import json
t = open("page_template.html").read()
for key, path in (("EDGES", "edges.json"), ("TIMING", "timing.json")):
    t = t.replace(f"/*__{key}__*/null", json.dumps(json.load(open(path))))
open("index.html", "w").write(t)
print("wrote index.html")
