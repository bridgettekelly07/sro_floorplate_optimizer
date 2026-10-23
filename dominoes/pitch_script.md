# Pitch script, 5 minutes (draft to edit)

Square brackets mark things only you can fill in or confirm. About 700 words at a steady pace; the starting-point slide adds about 30 seconds, so trim the existing-tools section if you run long.

## 0:00 Background (40 sec)

Vancouver's Downtown Eastside has about [6,500] single room occupancy rooms in [142] surveyed buildings. The SRA Bylaw and the DTES Plan set the rules for converting them: how big a unit must be, how many rooms can be lost, what the owner pays. The people who work with these rules are planners and housing advocates. Their job is to read a policy and judge what it does to tenants.

*Starting point slide, about 30 sec:* This builds on my Phase 1 tool, a 3D map of the Downtown Eastside that applies the City's conversion thresholds to every surveyed SRO. The thresholds are sliders and the map recolours to show who is displaced. At the City's own thresholds the model estimates 1,138 tenants displaced and 130 of 142 buildings converting, reading every room as occupied. It answers what the rules do to people today. It does not say what follows over time.

## 0:40 Problem (60 sec)

*Point at the as-is sheet.*

Today that judgment is made by hand. The rules sit in three documents. The evidence on what follows from them sits in separate papers that often disagree. A planner picks one reading, works one building at a time, and rarely re-runs it with another reading.

The process itself adds a problem. In six of seven Council permit cases, tenants had already left before the application was filed. So the decisions made at Council act after the harm, and nobody can see that on one page.

## 1:40 Existing tools (30 sec)

*Point at the case study sheet.*

Owners and architects have tools: Excel, Revit, Yardi. The City uses ArcGIS and Tableau for the survey. None of them answers the planner's question, which is what a decision leads to over the years and who it lands on. [Add what you found in your own case study.]

## 2:10 What AI changes, and what it doesn't (30 sec)

AI does two jobs. First, it reads a Council report and extracts one permit case: dates, rooms, fee, route. Code checks the dates and that every value is quoted from the report, and a person checks it against the PDF before it joins the case file. That grows the evidence behind the time scale. Second, after a run, it drafts the case for Council, one sentence per effect, and code rejects any sentence that does not cite a rule. The rules themselves are written by hand with the paper open. AI does not decide which reading of the evidence is right. That stays with the planner.

## 2:40 The proposal (60 sec)

*Open the page and demonstrate.*

This is a scenario tool. The seven decisions in the conversion process are boxes along the top, each with the settings that have a sourced effect. Pick one. The sheet lights the stages it reaches and names the effects. Below, each effect sits under who it lands on, at the years the evidence says it lands.

*Press minor repair.* Four effects on tenants begin at once. *Add partial replacement.* Now effects on the neighbourhood appear, and two of them are marked disputed, because two sources disagree. The tool draws both and picks neither. Where a source gives a size, it is quoted. Everywhere else it says "size not stated".

## 3:40 Method and checks (40 sec)

The rules live in one file: [32] rules, [26] sources, each marked verified or not. Seven Council cases supply the step durations. The tool never adds a rule or a source itself. If a setting has no sourced effect, it stops and asks for one. Twelve of the nineteen settings have a sourced effect, so seven do not. [Six] evaluation cases check this, and they pass. A separate floorplate model gives room counts for unit size, and the page labels them as a different model.

## 4:20 Outcome and what is still unknown (40 sec)

At the end, a planner can say: under this reading of the rules, here is what follows, here is the source, and here is where the evidence stops.

What I don't know yet: how decisions interact, since the sources don't say. Where the planner enters the process, which I have assumed. [Who my user will be, matched by Nov 6.] I would like your view on [which decision to build out next].

## Notes for you

- The brief asks for a 150-word proposal written by you. This script is not that; keep your own words there.
- Check every number in brackets before you present.
- If you run short, drop the existing-tools section and say it in one line.
