#!/usr/bin/env python3
"""
run.py: first attempt for the SRO domino scenario tool.

Usage:
  python3 run.py conversion_permit=allow 10
  python3 run.py unit_size_sf=200 10
  python3 run.py --target tenant_return_rate 10

Reads edges.json. Writes timeline.json. No model is called.
Rules (from the tool-logic diagram):
  - an option with no sourced outgoing edge stops the run and asks for a source
  - an effect lands at t + lag_min and persists through t + lag_max, summed along the chain
  - negative lags are allowed and land before t
  - a direction 0 edge lands on the axis but does not propagate: the outcome
    it reaches is drawn, and nothing downstream of it is reached through it
  - sign composes along a chain by multiplication: an effect's net direction
    is the product of the directions of every edge on its path (- times - is
    +), kept in direction_net; direction stays the edge's own reading
  - forks are traversed on both sides and never resolved
  - effects whose earliest year is past the horizon are kept and marked, not dropped
"""
import json, sys
from collections import deque

def load(path="edges.json"):
    with open(path) as f:
        return json.load(f)

def outgoing(graph, node):
    return [e for e in graph["edges"] if e["from"] == node]

def incoming(graph, node):
    return [e for e in graph["edges"] if e["to"] == node]

def label(graph, node):
    for o in graph["outcomes"]:
        if o["id"] == node:
            return o["label"]
    return node

SIGN = {"+": 1, "-": -1, "0": 0}
SIGN_CHAR = {1: "+", -1: "-", 0: "0"}

def compose(sign, direction):
    """Multiply the sign carried along the path by this edge's direction."""
    return sign * SIGN[direction]

def stop(msg):
    print("STOP:", msg)
    sys.exit(2)

def check_option(graph, option):
    dec_id, _, opt = option.partition("=")
    decs = {d["id"]: d for d in graph["decisions"]}
    if dec_id not in decs:
        stop(f"{dec_id} is not a decision in edges.json")
    if opt not in decs[dec_id]["options"]:
        stop(f"{opt} is not an option of {dec_id}; options are {decs[dec_id]['options']}")
    edges = outgoing(graph, option)
    if not edges:
        stop(f"{option} has no sourced outgoing edge. Add one to edges.json with a source before running.")
    unsourced = [e["id"] for e in edges if not e.get("source")]
    if unsourced:
        stop(f"edges {unsourced} have no source")
    return edges

def check_target(graph, target):
    if target not in [o["id"] for o in graph["outcomes"]]:
        stop(f"{target} is not an outcome in edges.json")
    edges = incoming(graph, target)
    if not edges:
        note = next((o.get("note", "") for o in graph["outcomes"] if o["id"] == target), "")
        stop(f"no sourced edge leads to {target}. {note}")
    return edges

def traverse(graph, option, horizon):
    """Breadth-first over outcome-to-outcome edges, summing lags along each path."""
    events = []
    seen_paths = set()
    queue = deque([(option, 0, 0, [], 1)])
    while queue:
        node, y_min, y_max, path, sign = queue.popleft()
        for e in outgoing(graph, node):
            if e["id"] in path:
                continue  # no cycles
            new_path = path + [e["id"]]
            key = tuple(new_path)
            if key in seen_paths:
                continue
            seen_paths.add(key)
            emin = y_min + e["lag_min"]
            emax = y_max + e["lag_max"]
            net = compose(sign, e["direction"])
            events.append({
                "edge": e["id"],
                "claim_type": e["claim_type"],
                "from": e["from"],
                "to": e["to"],
                "to_label": label(graph, e["to"]),
                "direction": e["direction"],
                "direction_net": SIGN_CHAR[net],
                "year_min": emin,
                "year_max": emax,
                "camp": e["camp"],
                "evidence": e.get("evidence"),
                "geography": e["geography"],
                "source": e["source"],
                "fork": e.get("fork"),
                "past_horizon": emin > horizon,
                "before_decision": emin < 0,
                "path": new_path,
            })
            if e["direction"] == "0":
                # a 0 edge lands on the axis but does not pass its effect on
                continue
            queue.append((e["to"], emin, emax, new_path, net))
    return events

def render_text(events, option, horizon):
    start = min([ev["year_min"] for ev in events] + [0])
    print(f"\nTimeline for {option}, horizon {horizon} years, axis starts at year {start}\n")
    for ev in sorted(events, key=lambda x: (x["year_min"], x["camp"])):
        flags = []
        if ev["before_decision"]: flags.append("before decision")
        if ev["past_horizon"]: flags.append("past horizon")
        if ev["fork"]: flags.append(f"fork {ev['fork']}")
        if ev["direction_net"] != ev["direction"]: flags.append(f"edge reads {ev['direction']}, net {ev['direction_net']}")
        grade = ev["evidence"] or ev["claim_type"]
        yrs = f"yr {ev['year_min']:>3}" if ev["year_min"] == ev["year_max"] else f"yr {ev['year_min']:>3} to {ev['year_max']:<3}"
        print(f"  {yrs}  {ev['direction_net']}  {ev['to_label']:<38} {ev['camp']:<13} {grade:<12} {ev['source']:<28} {', '.join(flags)}")
    forks = {}
    for ev in events:
        if ev["fork"]:
            forks.setdefault(ev["fork"], []).append(ev["edge"])
    if forks:
        print("\nForks reached (both sides drawn):", forks)
    print(f"\n{len(events)} effects. {sum(ev['before_decision'] for ev in events)} land before the decision. "
          f"{sum(ev['past_horizon'] for ev in events)} land past the horizon.")

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(1)
    graph = load()
    horizon = int(args[-1]) if args[-1].isdigit() else 10
    if args[0] == "--target":
        target = args[1]
        edges = check_target(graph, target)
        print(f"{target} is reachable through {[e['id'] for e in edges]}")
        return
    option = args[0]
    check_option(graph, option)
    events = traverse(graph, option, horizon)
    out = {"option": option, "horizon": horizon, "axis_start": min([ev["year_min"] for ev in events] + [0]), "events": events}
    with open("timeline.json", "w") as f:
        json.dump(out, f, indent=2)
    render_text(events, option, horizon)
    print("\nwrote timeline.json")

if __name__ == "__main__":
    main()
