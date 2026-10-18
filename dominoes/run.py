#!/usr/bin/env python3
"""run.py: second pass of the SRO domino scenario tool. No model is called.
  python3 run.py conversion_permit=allow 10        option and horizon in years
  python3 run.py --target tenant_return_rate 10    which edges reach an outcome
Reads edges.json and timing.json, writes timeline.json. Rules from the tool-logic diagram:
an option with no sourced outgoing edge stops the run (a source must be a key in edges.json
sources, and timing_json_cases must resolve to timing.json); an effect lands at t + lag_min and
persists through t + lag_max, summed along the chain, negative lags land before t; a direction 0
edge lands on the axis but does not propagate; sign multiplies along a chain (direction_net is
the product of every direction on the path, direction stays the edge's own reading); forks are
traversed on both sides and never resolved; effects past the horizon are kept and marked."""
import json, sys
from collections import deque

SIGN, CHAR = {"+": 1, "-": -1, "0": 0}, {1: "+", -1: "-", 0: "0"}

def stop(msg):
    print("STOP:", msg)
    sys.exit(2)

def check_source(graph, timing, e):
    src = e.get("source")
    if not src or src not in graph["sources"]:
        stop(f"edge {e['id']} has no source listed in edges.json sources")
    if src == "timing_json_cases" and not timing.get("cases"):
        stop(f"edge {e['id']} cites timing.json but it has no cases")

def check_option(graph, timing, option):
    (dec_id, _, opt), decs = option.partition("="), {d["id"]: d for d in graph["decisions"]}
    if dec_id not in decs:
        stop(f"{dec_id} is not a decision in edges.json")
    if opt not in decs[dec_id]["options"]:
        stop(f"{opt} is not an option of {dec_id}; options are {decs[dec_id]['options']}")
    edges = [e for e in graph["edges"] if e["from"] == option]
    if not edges:
        stop(f"{option} has no sourced outgoing edge. Add one to edges.json with a source before running.")
    for e in edges:
        check_source(graph, timing, e)
    return decs[dec_id]["label"]

def check_target(graph, target):
    outcomes = {o["id"]: o for o in graph["outcomes"]}
    if target not in outcomes:
        stop(f"{target} is not an outcome in edges.json")
    edges = [e["id"] for e in graph["edges"] if e["to"] == target]
    if not edges:
        stop(f"no sourced edge leads to {target}. {outcomes[target].get('note', '')}")
    print(f"{target} is reachable through {edges}")

def traverse(graph, timing, option, horizon):
    """Breadth-first over edges, summing lags and multiplying signs along each path."""
    labels, events, queue = {o["id"]: o["label"] for o in graph["outcomes"]}, [], deque([(option, 0, 0, [], 1)])
    while queue:
        node, y_min, y_max, path, sign = queue.popleft()
        for e in graph["edges"]:
            if e["from"] != node or e["id"] in path:
                continue  # not from here, or a cycle
            check_source(graph, timing, e)
            emin, emax, net = y_min + e["lag_min"], y_max + e["lag_max"], sign * SIGN[e["direction"]]
            ev = {k: e.get(k) for k in ("claim_type", "from", "to", "direction", "camp", "evidence", "geography", "source", "fork")}
            ev.update(edge=e["id"], to_label=labels.get(e["to"], e["to"]), direction_net=CHAR[net], year_min=emin, year_max=emax,
                      past_horizon=emin > horizon, before_decision=emin < 0, path=path + [e["id"]])
            if e["source"] == "timing_json_cases":
                ev["timing_cases"] = [c["id"] for c in timing["cases"]]
            events.append(ev)
            if net != 0:  # a 0 edge lands but passes nothing on
                queue.append((e["to"], emin, emax, ev["path"], net))
    return events

def render_text(events, option, horizon):
    print(f"\nTimeline for {option}, horizon {horizon} years, axis starts at year {min([ev['year_min'] for ev in events] + [0])}\n")
    for ev in sorted(events, key=lambda x: (x["year_min"], x["camp"])):
        flags = [f for f, on in (("before decision", ev["before_decision"]), ("past horizon", ev["past_horizon"]),
                 (f"fork {ev['fork']}", ev["fork"]), (f"edge reads {ev['direction']}, net {ev['direction_net']}", ev["direction"] != ev["direction_net"])) if on]
        yrs = f"yr {ev['year_min']:>3}" if ev["year_min"] == ev["year_max"] else f"yr {ev['year_min']:>3} to {ev['year_max']:<3}"
        print(f"  {yrs}  {ev['direction_net']}  {ev['to_label']:<38} {ev['camp']:<13} {ev['evidence'] or ev['claim_type']:<12} {ev['source']:<28} {', '.join(flags)}")
    forks = {f: [ev["edge"] for ev in events if ev["fork"] == f] for f in dict.fromkeys(ev["fork"] for ev in events if ev["fork"])}
    if forks:
        print("\nForks reached (both sides drawn):", forks)
    print(f"\n{len(events)} effects. {sum(ev['before_decision'] for ev in events)} land before the decision. "
          f"{sum(ev['past_horizon'] for ev in events)} land past the horizon.")

def main():
    args = sys.argv[1:]
    if not args: sys.exit(__doc__)
    graph, timing = json.load(open("edges.json")), json.load(open("timing.json"))
    horizon = int(args[-1]) if args[-1].isdigit() else 10
    if args[0] == "--target":
        return check_target(graph, args[1])
    option, decision_label = args[0], check_option(graph, timing, args[0])
    events = traverse(graph, timing, option, horizon)
    with open("timeline.json", "w") as f:
        json.dump({"option": option, "decision_label": decision_label, "option_label": option.partition("=")[2].replace("_", " "),
                   "horizon": horizon, "axis_start": min([ev["year_min"] for ev in events] + [0]), "events": events}, f, indent=2)
    render_text(events, option, horizon)
    print("\nwrote timeline.json")

if __name__ == "__main__":
    main()
