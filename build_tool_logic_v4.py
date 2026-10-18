# Builds a dense, annotated tool-logic diagram in the style of an information-architecture map.
W,H=1000,1330
BG="#E9E2D6"; SL="#3D5A6C"; CO="#E0724E"; TX="#2B3A42"; MU="#5F6E78"; TAN="#C9A66B"; LT="#F2EFE9"; RULE="#C9BFAE"
out=[]
def add(s): out.append(s)
def pill(x,y,w,h,label,kind,sub=None,fs=9):
    # kind: person (slate fill), script (outline), model (tan), check (coral outline), entry (coral fill), minor (small outline)
    if kind=="person": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{SL}"/>'); c=LT
    elif kind=="script": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{BG}" stroke="{SL}" stroke-width="1"/>'); c=TX
    elif kind=="model": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{TAN}"/>'); c=TX
    elif kind=="check": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{BG}" stroke="{CO}" stroke-width="1.8"/>'); c=TX
    elif kind=="entry": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{CO}"/>'); c=LT
    elif kind=="minor": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{SL}"/>'); c=LT
    elif kind=="minor_out": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{BG}" stroke="{SL}" stroke-width="0.7"/>'); c=TX
    cx=x+w/2
    if sub:
        add(f'<text x="{cx}" y="{y+h/2-3}" font-size="{fs}" fill="{c}" text-anchor="middle" font-weight="bold">{label}</text>')
        add(f'<text x="{cx}" y="{y+h/2+8}" font-size="{fs-2.5}" fill="{c}" text-anchor="middle">{sub}</text>')
    else:
        add(f'<text x="{cx}" y="{y+h/2+3}" font-size="{fs}" fill="{c}" text-anchor="middle" font-weight="bold">{label}</text>')
def note(x,y,lines,fs=6.3,color=MU,anchor="start"):
    for i,l in enumerate(lines):
        add(f'<text x="{x}" y="{y+i*(fs+2)}" font-size="{fs}" fill="{color}" text-anchor="{anchor}">{l}</text>')
def line(pts,arrow=True,dash=False,color=SL,w=0.9):
    d="M"+" L".join(f"{p[0]} {p[1]}" for p in pts)
    add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}"{" stroke-dasharray=\"4 3\"" if dash else ""}{" marker-end=\"url(#arrow)\"" if arrow else ""}/>')
def filedot(x,y,label,sub=None):
    add(f'<circle cx="{x}" cy="{y}" r="4.5" fill="{BG}" stroke="{SL}" stroke-width="0.7"/>')
    add(f'<text x="{x+9}" y="{y+2.5}" font-size="7" fill="{TX}">{label}</text>')
    if sub: add(f'<text x="{x+9}" y="{y+11}" font-size="6" fill="{MU}">{sub}</text>')

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*2}" height="{H*2}" viewBox="0 0 {W} {H}" font-family="Helvetica, Arial, DejaVu Sans, sans-serif">')
add(f'<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="{SL}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>')
add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')

# title block
note(30,40,["Tool logic: SRO domino scenario tool","ARCH 540, Assignment 2, mid review draft","Downtown Eastside, Vancouver","Spine: as_is_workflow_v3; data: edges.json v0.5, timing.json v0.2"],fs=8,color=TX)

# legend top right
lx=760; ly=36
items=[("person","judgment stays with a person"),("script","script or tool, deterministic"),("model","model, writes one sentence per edge"),("check","code check, gates the run"),("entry","entry and exit points")]
for i,(k,lab) in enumerate(items):
    pill(lx+150,ly+i*20-6,60,14,"",k)
    add(f'<text x="{lx+140}" y="{ly+i*20+4}" font-size="6.5" fill="{TX}" text-anchor="end">{lab}</text>')
line([(lx+150,ly+106),(lx+210,ly+106)],arrow=True); add(f'<text x="{lx+140}" y="{ly+109}" font-size="6.5" fill="{TX}" text-anchor="end">data moves one way</text>')
line([(lx+150,ly+126),(lx+210,ly+126)],arrow=True,dash=True); add(f'<text x="{lx+140}" y="{ly+129}" font-size="6.5" fill="{TX}" text-anchor="end">loop, rerun or redraft</text>')
add(f'<circle cx="{lx+180}" cy="{ly+146}" r="4.5" fill="{BG}" stroke="{SL}" stroke-width="0.7"/>'); add(f'<text x="{lx+140}" y="{ly+149}" font-size="6.5" fill="{TX}" text-anchor="end">file passed between steps</text>')
add(f'<rect x="{lx+152}" y="{ly+160}" width="56" height="12" rx="3" fill="none" stroke="{CO}" stroke-width="0.9" stroke-dasharray="3 3"/>'); add(f'<text x="{lx+140}" y="{ly+169}" font-size="6.5" fill="{TX}" text-anchor="end">first attempt, Oct 23</text>')
note(lx+210,ly+192,["Stop nodes return control to the person with a question,","never with an answer the tool made up."],fs=6,color=TX,anchor="end")

# ---------- main spine x centre 500
CX=500; PW=220
# entry
pill(CX-50,150,100,30,"Run","entry",fs=11)
line([(CX,180),(CX,206)])
# 1 choose
pill(CX-PW/2,208,PW,34,"Choose decision option","person","and a horizon in years")
# decisions fan to the left
decs=[("conversion_permit","deny · allow · minor repair"),("replacement_ratio","1:1 · partial · none"),("unit_size_sf","100 · 200 · 250 · 320"),("tenure","private · non-profit"),("rent_at_turnover","vacancy control · market"),("income_mix","60/40 · 100 social"),("conversion_fee","waived · charged · in kind")]
line([(CX-PW/2,225),(300,225)],arrow=False)
for i,(d,o) in enumerate(decs):
    r,c=divmod(i,2); x=60+c*120; y=190+r*42
    if d=='conversion_fee': x=180
    pill(x,y,110,18,d,"minor",fs=7)
    add(f'<text x="{x+55}" y="{y+29}" font-size="6" fill="{MU}" text-anchor="middle">{o}</text>')
line([(300,225),(300,190),(300,380)],arrow=False)
for r in range(4):
    y=190+r*42+9
    line([(300,y),(292,y)],arrow=True)
note(60,364,["7 decisions, each a variable with options.","Editing means choosing another option; the","two scenarios differ only in what is active."],fs=6.3)
# horizon to the right
pill(640,212,90,26,"Horizon","minor_out","5 · 10 · 15 · 30 yr",fs=7.5)
line([(CX+PW/2,225),(640,225)],arrow=True)
line([(CX,242),(CX,268)])

# 2 load
pill(CX-PW/2,270,PW,34,"Load the claim graph","script","edges.json + timing.json")
filedot(640,280,"edges.json","7 decisions · 21 outcomes · 30 edges")
filedot(640,302,"timing.json","7 permit cases, 2013 to 2026")
line([(CX+PW/2,287),(632,287)],arrow=False)
note(640,319,["edge = {from, to, direction, lag, camp, claim_type, evidence, geography, source, fork}","7 mechanism · 4 theory · 19 observation · 4 forks kept unresolved"],fs=6,color=MU)
line([(CX,304),(CX,330)])

# 3 check
pill(CX-PW/2,332,PW,34,"Option has a sourced edge?","check","code, not model")
line([(CX+PW/2,349),(680,349),(680,387),(700,387)],arrow=True)
pill(702,372,120,30,"Stop and ask","entry","for a source, no run",fs=8.5)
line([(762,402),(762,422)],arrow=False)
stops=[("tenant_return_rate","City requires a plan, records no return"),("replacement_units_built","fee to reserve to room: lag unknown"),("unit_size → tenant outcome","no study for SRO tenants")]
for i,(s,n) in enumerate(stops):
    y=422+i*34
    line([(762,y+9),(770,y+9)],arrow=True)
    pill(772,y,140,18,s,"minor_out",fs=6.5)
    add(f'<text x="{842}" y="{y+28}" font-size="5.8" fill="{MU}" text-anchor="middle">{n}</text>')
line([(762,422),(762,508)],arrow=False)
note(772,536,["Three honest stops. The tool refuses","to draw a domino nobody has measured."],fs=6.3)
line([(CX,366),(CX,392)])

# 4 traverse
pill(CX-PW/2,394,PW,34,"Traverse chains, place by lag","script","effect lands at t + lag, persists")
note(60,398,["Time rule","t = the option takes effect.","Effect appears at t + lag_min,","persists through t + lag_max.","Negative lag lands before t:","e29, tenants out before permit.","Direction and lag only, no magnitudes."],fs=6.3,color=TX)
line([(CX-PW/2,411),(230,411)],arrow=True)
note(60,460,["Forks","Two camps, opposite sign, same","decision. Both are traversed and","drawn as parallel tracks. Nothing","in the script picks a winner."],fs=6.3,color=TX)
line([(CX,428),(CX,454)])

# first attempt box
add(f'<rect x="{CX-PW/2-14}" y="138" width="{PW+28}" height="300" rx="10" fill="none" stroke="{CO}" stroke-width="1" stroke-dasharray="4 3"/>')
add(f'<text x="{CX-PW/2-10}" y="448" font-size="6.5" fill="{CO}">first attempt: Run to Traverse, one option in, timeline.json out, no model</text>')

# 5 model
pill(CX-PW/2,466,PW,34,"Draft one sentence per edge","model","from, to, direction, year, source id")
filedot(640,476,"one edge + its finding sentence","the only evidence text the model sees")
line([(CX+PW/2,483),(632,483)],arrow=False)
note(640,500,["Prompt contract","must contain: both labels, sign, year, source id","must not contain: any number absent from","the edge row or the finding sentence","model never adds, removes or reorders edges"],fs=6.3)
line([(CX,500),(CX,526)])

# 6 check
pill(CX-PW/2,528,PW,34,"Every sentence cited and lagged?","check","string check against the file")
line([(CX+PW/2,545),(620,545),(620,483),(612,483)],arrow=True,dash=True)
add(f'<text x="626" y="560" font-size="6.3" fill="{MU}">redraft, three tries, then</text>')
line([(CX+PW/2,553),(600,553),(600,578),(640,578)],arrow=True)
pill(642,566,130,24,"Flag and continue","entry","edge drawn, marked unverified",fs=7.5)
note(780,575,["run does not halt; the edge","is shown with a visible mark"],fs=6)
line([(CX,562),(CX,588)])

# 7 review forks
pill(CX-PW/2,590,PW,34,"Review the forks","person","choose what to show, not who wins")
# toggles row left
line([(CX-PW/2,607),(300,607)],arrow=False); line([(300,607),(300,630)],arrow=False)
camps=["economics","geography","planning","health","architecture"]
for i,c in enumerate(camps):
    x=60+i*62; y=632
    add(f'<rect x="{x}" y="{y}" width="26" height="12" rx="6" fill="{SL}"/><circle cx="{x+19}" cy="{y+6}" r="4" fill="{LT}"/>')
    add(f'<text x="{x+13}" y="{y+22}" font-size="5.8" fill="{MU}" text-anchor="middle">{c}</text>')
line([(300,630),(60,630)],arrow=False)
add(f'<text x="60" y="625" font-size="6.3" fill="{TX}">camps on / off</text>')
grades=["mechanism","theory","observation"]
for i,g in enumerate(grades):
    x=60+i*80; y=670
    add(f'<rect x="{x}" y="{y}" width="26" height="12" rx="6" fill="{SL}"/><circle cx="{x+19}" cy="{y+6}" r="4" fill="{LT}"/>')
    add(f'<text x="{x+13}" y="{y+22}" font-size="5.8" fill="{MU}" text-anchor="middle">{g}</text>')
add(f'<text x="60" y="663" font-size="6.3" fill="{TX}">claim types on / off</text>')
line([(CX,624),(CX,650)])
line([(CX+PW/2,607),(640,607)],arrow=True)
pill(642,596,100,22,"Stop here","entry","reading only",fs=7.5)
note(748,604,["timeline kept,","no comparison"],fs=6)

# 8 edit
pill(CX-PW/2,652,PW,34,"Edit a decision and rerun","person","or continue to render")
# rerun loop far left? route via x=390 between fan and spine
line([(CX-PW/2,669),(360,669),(360,411),(CX-PW/2-2,411)],arrow=True,dash=True)
add(f'<text x="352" y="540" font-size="6.3" fill="{MU}" transform="rotate(-90 352 540)">rerun with the new option, same horizon</text>')
# scenario tags right
pill(640,660,70,18,"scenario A","minor_out",fs=7); pill(720,660,70,18,"scenario B","minor_out",fs=7)
line([(CX+PW/2,669),(640,669)],arrow=False)
note(640,692,["Two runs, one edited option between them.","More than two is allowed; two is what the","review shows."],fs=6.3)
line([(CX,686),(CX,712)])

# 9 render
pill(CX-PW/2,714,PW,34,"Render timelines side by side","script","tool the person operates: years on x, outcomes on y")
filedot(640,724,"timeline.json","one per scenario: effect, year, camp, grade, source")
line([(CX+PW/2,731),(632,731)],arrow=False)
# render features fan left
feats=[("year slider","scrub t0 to horizon"),("parallel fork tracks","both camps, never merged"),("evidence as line weight","mechanism thin, observation thick"),("negative lags","drawn left of t0")]
line([(CX-PW/2,731),(300,731)],arrow=False); line([(300,731),(300,850)],arrow=False)
for i,(f,s) in enumerate(feats):
    y=738+i*30
    line([(300,y+9),(292,y+9)],arrow=True)
    pill(170,y,120,18,f,"minor_out",fs=6.8)
    add(f'<text x="{230}" y="{y+27}" font-size="5.8" fill="{MU}" text-anchor="middle">{s}</text>')
line([(CX,748),(CX,774)])

# 10 barriers
pill(CX-PW/2,776,PW,34,"Flag barriers","script","three pattern rules, no judgment")
rules=[("only negative edges","every sourced effect on tenants is harm"),("fork, no local evidence","camps disagree, nothing from Vancouver"),("lands past horizon","the benefit arrives after the policy ends")]
line([(CX+PW/2,793),(640,793)],arrow=False); line([(640,793),(640,880)],arrow=False)
for i,(r,s) in enumerate(rules):
    y=800+i*32
    line([(640,y+9),(648,y+9)],arrow=True)
    pill(650,y,150,18,r,"minor_out",fs=6.8)
    add(f'<text x="{725}" y="{y+27}" font-size="5.8" fill="{MU}" text-anchor="middle">{s}</text>')
filedot(640,900,"barriers.json","rule hit, decision, edge ids")
line([(CX,810),(CX,836)])

# exit
pill(CX-70,838,140,30,"Scenario comparison","entry",fs=9.5)

# ---------- bottom clusters
# evaluation cases (left)
add(f'<line x1="40" y1="920" x2="{W-40}" y2="920" stroke="{RULE}" stroke-width="0.6"/>')
note(40,940,["Evaluation cases, checkable without the model"],fs=7.5,color=TX)
cases=[("typical","conversion_permit = allow, 10 yr","expected: e01, e29 (negative lag), e07 chain into health"),("boundary","unit_size_sf = 200","expected: e27, e28, fork f4 drawn twice"),("missing","target tenant_return_rate","expected: stop at check 1, ask for source"),("repeated","model step, 5 runs, same edge","report: how much the sentences vary")]
for i,(c,inp,exp) in enumerate(cases):
    x=40+i*235
    pill(x,952,90,20,c,"minor",fs=7.5)
    note(x,986,[inp,exp],fs=6.2)
# user sessions (right lower)
note(40,1040,["User sessions"],fs=7.5,color=TX)
users=[("session 1, by Nov 12","non-profit SRO operator","real building file: fills the ? weeks on the as-is axis"),("session 2, by Nov 27","City housing planner","tests the rerun loop on an option they actually chose"),("session 3, by Dec 3","tenant group or advocate","tests whether the forks read as fair to the party with no document")]
for i,(s,who,why) in enumerate(users):
    x=40+i*310
    pill(x,1052,120,20,s,"minor_out",fs=7)
    note(x,1086,[who,why],fs=6.2)
# tenant sentence
add(f'<rect x="40" y="1130" width="{W-80}" height="48" rx="6" fill="none" stroke="{SL}" stroke-width="0.7" stroke-dasharray="4 3"/>')
note(52,1148,["Every actor in the process produces a document: the owner an application, Council a permit, the architect drawings, the funder an agreement, the City a survey.","The tenant produces none and receives none. In six of seven permit files the tenants were gone before the application was filed.","The tool is the first point in the sequence where the tenant's timeline is drawn."],fs=6.8,color=TX)
# what is delegated
note(40,1210,["Delegated to the tool: loading, traversal, time placement, citation checking, rendering, pattern flags.","Kept with a person: which option, which horizon, which camps to show, whether to edit, what a flagged barrier means.","Never delegated: adding an edge, setting a lag, choosing a source. Those happen in edges.json, by hand, with the paper open."],fs=6.8,color=MU)
note(40,1262,["Known limits at mid review","Evidence is thin where the debate is loudest: three weak observation edges, all from one thesis. Two of four strong edges are from US cities.","No magnitudes anywhere; the tool shows direction and timing only. Four as-is durations are still unknown and wait on an operator's file.","The 200 sf rule is a live designation threshold, not a design standard; its effect on tenants has no source and the tool stops there."],fs=6.8,color=MU)
add('</svg>')
open('/home/claude/tool_logic_v4.svg','w').write("\n".join(out))
print("ok")
