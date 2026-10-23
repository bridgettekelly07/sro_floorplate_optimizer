import math, re, sys
overlay = "--overlay" in sys.argv
tool = "--tool" in sys.argv   # the overlay sheet with the dominoes tool and the planner / advocate placed on it
page = "--page" in sys.argv   # the diagram as the interactive page uses it: tool tracks on, callouts and stages tagged
if page or tool: overlay = True
FS = 1.25 if page else 1       # the page shows the sheet narrower than 1600, so type is enlarged
W,H=1600,(830 if page else 900)
BG="#E9E2D6"; SL="#3D5A6C"; CO="#E0724E"; TX="#2B3A42"; MU="#5F6E78"; RULE="#C9BFAE"; LT="#F2EFE9"; TAN="#9DB9F0"; BL="#9DB9F0"
o=[]; add=o.append
if page:
    import json as _jj, os as _oo, math as _mm
    _TM=_jj.load(open(_oo.path.join(_oo.path.dirname(_oo.path.abspath(__file__)),"..","track_map.json")))
    _sc=_TM["scale"]
    def _gap(w):
        if not w: return _sc["min_gap"]
        return max(_sc["min_gap"], _sc["min_gap"]+_sc["per_decade"]*(_mm.log10(1+w/10.5)-_mm.log10(2)))
    cols=[190]
    for _g in _TM["gap_step"]: cols.append(cols[-1]+_gap(_g["weeks"]))
else:
    cols=[200+i*168 for i in range(8)]
T,B=300,450; BAND=375; r=32; R=r+7
ys=[T,B,B,T,T,B,T,B]
names=["Tenants out","Apply","Council","Design","Fund","Build","Rent","Monitor"]
judg=[True,False,True,True,True,False,True,False]
pain=[True,False,True,True,False,False,True,True]
axis=["10 years to 1 day before","week 0","9 to 12 weeks","","3 years, open ended","","","0 to 104 weeks"]
actors=["Owner, fire, closure","Owner","Council, SRA Bylaw","Architect, City","BC Housing","Owner, City","Owner, RTA","City, CCAP"]
tools=["Excel list, TRP form","SRA form, PDF drawings","Word report, Excel pro forma","Revit, Rhino, Forma, VanMap","BC Housing forms, Excel","Revit docs, MS Project","Yardi or Excel, RTA forms","Excel, ArcGIS, Tableau"]
docs=["relocation plan","application","permit, conditions","drawings","agreement","occupancy permit","rent roll"]

def tangent(c1,c2):
    (x1,y1),(x2,y2)=c1,c2
    if y1==y2:
        off = -R if y1==T else R
        return (x1,y1+off),(x2,y2+off)
    mx,my=(x1+x2)/2,(y1+y2)/2
    d=math.hypot(mx-x1,my-y1); a=math.asin(R/d); base=math.atan2(my-y1,mx-x1)
    c=[]
    for sgn in (1,-1):
        th=base+sgn*(math.pi/2-a); c.append((x1+R*math.cos(th),y1+R*math.sin(th)))
    t1=max(c,key=lambda p:abs(p[1]-BAND)); return t1,(2*mx-t1[0],2*my-t1[1])
ex=[None]*8; en=[None]*8
for i in range(7):
    a,b=tangent((cols[i],ys[i]),(cols[i+1],ys[i+1])); ex[i]=a; en[i+1]=b
top0 = ys[0]==T
d=[f"M-10 {ys[0]-R if top0 else ys[0]+R} L{cols[0]} {ys[0]-R if top0 else ys[0]+R}"]
for i in range(8):
    top = ys[i]==T
    if i<7:
        e = ex[i]
    else:
        e = (cols[i], ys[i]-R if top else ys[i]+R)
    d.append(f"A{R} {R} 0 0 {1 if top else 0} {e[0]:.1f} {e[1]:.1f}")
    if i<7: d.append(f"L{en[i+1][0]:.1f} {en[i+1][1]:.1f}")
    else: d.append(f"L{W+10} {e[1]:.1f}")
thread=" ".join(d)
mids=[((ex[i][0]+en[i+1][0])/2,(ex[i][1]+en[i+1][1])/2) for i in range(7)]

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*2}" height="{H*2}" viewBox="0 0 {W} {H}" font-family="Helvetica, Arial, DejaVu Sans, sans-serif">')
add(f'<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="{SL}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker><marker id="arrowc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="{CO}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>')
add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')
# top panels
LEVERS={0:[],2:["conversion_permit","conversion_fee"],3:["unit_size_sf"],4:["replacement_ratio","tenure","income_mix"],6:["rent_at_turnover"],7:[]}
def panel(cx,title,lines,i=None):
    w=162; x=cx-w/2; y=100
    if not page:
        add(f'<rect x="{x}" y="{y}" width="{w}" height="46" rx="6" fill="none" stroke="{SL}" stroke-width="0.7" stroke-dasharray="5 4"/>')
        add(f'<text x="{x+10}" y="{y+16}" font-size="9" fill="{TX}" font-weight="bold">{title}</text>')
        for k,l in enumerate(lines): add(f'<text x="{x+10}" y="{y+32+k*13}" font-size="6.9" fill="{TX}">{l}</text>')
        return
    import textwrap
    wrapped=[w2 for l in lines for w2 in textwrap.wrap(l,27)]
    lev=LEVERS.get(i,[]); h=36+13*len(wrapped)+(14 if lev else 0)
    add(f'<g class="callout" data-levers="{" ".join(lev)}" data-col="{i}">')
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{BG}" stroke="{SL}" stroke-width="0.7" stroke-dasharray="5 4"/>')
    add(f'<text x="{x+10}" y="{y+16}" font-size="9" fill="{TX}" font-weight="bold">{title}</text>')
    for k,l in enumerate(wrapped): add(f'<text x="{x+10}" y="{y+32+k*13}" font-size="6.9" fill="{TX}">{l}</text>')
    if lev: add(f'<text class="setting" data-levers="{" ".join(lev)}" x="{x+10}" y="{y+h-9}" font-size="7.5" fill="{CO}" font-weight="bold"></text>')
    add('</g>')
if page:
    import json as _j, os as _o, textwrap as _t
    _here=_o.path.dirname(_o.path.abspath(__file__))
    _M=_j.load(open(_o.path.join(_here,"..","track_map.json")))
    _G=_j.load(open(_o.path.join(_here,"..","edges.json")))
    PW,PH,TOPY,GAP=162,68,14,3
    def short(lev,o):
        if lev=="unit_size_sf": return o
        return {"minor_repair_staff":"minor repair","60_40":"60/40","100_social":"100 social"}.get(o,o.replace("_"," "))
    def lever_panel(ci,k,lev):
        x=cols[ci]-PW/2; y=TOPY+k*(PH+GAP); dt=_M["decision_timing"][lev]; rg=_M["range"][lev]
        add(f'<g class="callout" data-levers="{lev}" data-col="{ci}">')
        add(f'<rect x="{x}" y="{y}" width="{PW}" height="{PH}" rx="6" fill="{BG}" stroke="{SL}" stroke-width="0.7" stroke-dasharray="5 4"/>')
        add(f'<text x="{x+10}" y="{y+13}" font-size="9" fill="{TX}" font-weight="bold">{dt["title"]}</text>')
        for j,l in enumerate(_t.wrap(dt["callout"],30)): add(f'<text class="timing{" timed" if dt["stage"] else ""}" x="{x+10}" y="{y+24+j*9}" font-size="6.5" fill="{TX if dt["stage"] else MU}">{l}</text>')
        opts=[o for o in rg["order"] if any(e["from"]==f"{lev}={o}" for e in _G["edges"])]; n=len(opts); x1,x2=x+22,x+PW-22; ty=y+PH-21
        for q,o in enumerate(opts):
            dx=(x1+x2)/2 if n==1 else x1+(x2-x1)*q/(n-1); has=any(e["from"]==f"{lev}={o}" for e in _G["edges"])
            now = rg.get("now")==o
            tip=("sourced effects" if has else "no sourced effect: the tool stops here and asks for a source")+(f"; in force now: {rg['now_basis']}" if now else "")
            add(f'<g class="det{" has" if has else ""}" data-lever="{lev}" data-opt="{o}"><title>{short(lev,o)}{" sf" if lev=="unit_size_sf" else ""}: {tip}</title><circle cx="{dx:.1f}" cy="{ty}" r="9" fill="transparent"/>')
            dsh='' if has else ' stroke-dasharray="1.6 1.6"'
            add(f'<circle class="dot" cx="{dx:.1f}" cy="{ty}" r="5" fill="{BG}" stroke="{SL}" stroke-width="1.2"{dsh}/></g>')
            anc="middle" if n==1 else "start" if q==0 else "end" if q==n-1 else "middle"
            lx=dx if n==1 else dx-8 if q==0 else dx+8 if q==n-1 else dx
            add(f'<text x="{lx:.1f}" y="{y+PH-6}" font-size="6.3" fill="{TX}" text-anchor="{anc}">{short(lev,o)}</text>')
        add('</g>')
    left=[f'{_M["decision_timing"][d["id"]]["title"].lower()}: {short(d["id"],o)}' for d in _G["decisions"] for o in d["options"] if not any(e["from"]==f'{d["id"]}={o}' for e in _G["edges"])]
    left_lines=_t.wrap("Left off, no sourced effect: "+"; ".join(left)+".",62)
    add(f'<g font-size="7" fill="{TX}"><text x="60" y="30" font-size="8" font-weight="bold">Each decision is a box of dots</text>'
        f'<circle cx="66" cy="46" r="5" fill="{BG}" stroke="{SL}" stroke-width="1.2"/><text x="78" y="49">a setting with a sourced effect</text>'
        f'<circle cx="66" cy="62" r="5" fill="{CO}" stroke="{CO}"/><text x="78" y="65">the setting you chose; click it again to clear a lone dot</text>'
        + "".join(f'<text x="60" y="{82+i*9}" fill="{MU}">{ln}</text>' for i,ln in enumerate(left_lines)) + '</g>')
    _stk={int(ci):levs for ci,levs in _M["decision_stack"].items()}
    _ord=sorted(_stk); _px={ci:cols[ci] for ci in _ord}
    for _ in range(40):
        for u,v in zip(_ord,_ord[1:]):
            d=_px[v]-_px[u]
            if d<PW+8: _px[u]-=(PW+8-d)/2; _px[v]+=(PW+8-d)/2
    for ci in _ord:
        levs=_stk[ci]; x0=_px[ci]; cx_save=cols[ci]
        cols[ci]=x0
        for k,lev in enumerate(levs): lever_panel(ci,k,lev)
        cols[ci]=cx_save
        add(f'<line x1="{x0}" y1="{TOPY+len(levs)*(PH+GAP)}" x2="{cols[ci]}" y2="{ys[ci]-R-3}" stroke="{RULE}" stroke-width="0.6" stroke-dasharray="5 4"/>')
else:
    panel(cols[0],"Relocation",["6 of 7 cases: gone before filing"],0)
    panel(cols[2],"Council conditions",["fee $300k per door, last charged 2015"],2)
    panel(cols[3],"Unit size",["200 sf average decides designation"],3)
    panel(cols[4],"Replacement",["committed, interim, permanent open"],4)
    panel(cols[6],"Rent rule",["resets between tenants"],6)
    panel(cols[7],"Monitoring",["City survey every 2 years"],7)
    # connectors from panels down to node column (light)
    for i in (0,3,4,6):
        add(f'<line x1="{cols[i]}" y1="146" x2="{cols[i]}" y2="{ys[i]-R-40}" stroke="{RULE}" stroke-width="0.6" stroke-dasharray="5 4"/>')


# City boundary: a tinted zone below the line for the City, labels at the left margin
BX1,BX2=140,1460
add(f'<line x1="-10" y1="{BAND}" x2="{W+10}" y2="{BAND}" stroke="{SL}" stroke-width="0.9" stroke-dasharray="5 4"/>')
add(f'<text x="{BX1-96}" y="{BAND-24}" font-size="8" fill="{MU}" letter-spacing="1.2">OUTSIDE THE CITY</text>')
add(f'<text x="{BX1-96}" y="{BAND-12}" font-size="7" fill="{MU}">owner, architect, funder, Province</text>')
add(f'<text x="{BX1-96}" y="{BAND+18}" font-size="8" fill="{MU}" letter-spacing="1.2">CITY OF VANCOUVER</text>')
add(f'<text x="{BX1-96}" y="{BAND+30}" font-size="7" fill="{MU}">intake, Council, permits, inspection, survey</text>')

# thread
add(f'<path d="{thread}" fill="none" stroke="{SL}" stroke-width="1.2"/>')
# minor repair route: Apply (bottom) to Design (bottom), under the bottom nodes
bc=' class="bypass"' if page else ''
add(f'<path{bc} d="M{cols[1]} {B+R} L{cols[1]} {B+R+50} L{cols[3]} {B+R+50} L{cols[3]} {T+R+3}" fill="none" stroke="{CO}" stroke-width="0.9" stroke-dasharray="5 4" marker-end="url(#arrowc)"/>')
add(f'<text x="{(cols[1]+cols[3])/2}" y="{B+R+60}" font-size="7" fill="{CO}" text-anchor="middle">minor repair, staff approval, no Council</text>')

# doc nodes + labels
for i,((mx,my),lab) in enumerate(zip(mids,docs)):
    add(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="5.5" fill="{BG}" stroke="{SL}" stroke-width="0.6"/>')
    same = ys[i]==ys[i+1]
    if same: add(f'<text x="{mx:.1f}" y="{my-9 if ys[i]==T else my+14:.1f}" font-size="7" fill="{MU}" text-anchor="middle">{lab}</text>')
    elif ys[i]==T: add(f'<text x="{mx+10:.1f}" y="{my+15:.1f}" font-size="7" fill="{MU}" text-anchor="start">{lab}</text>')
    else: add(f'<text x="{mx-10:.1f}" y="{my-9:.1f}" font-size="7" fill="{MU}" text-anchor="end">{lab}</text>')
# nodes with actor + tool labels
for i in range(8):
    cx,cy=cols[i],ys[i]
    fill=SL if judg[i] else BG; stroke=BL if pain[i] else SL; sw=2.6 if pain[i] else 1
    if page: add(f'<g class="stage" data-stage="{names[i]}">')
    add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
    add(f'<text x="{cx}" y="{cy+3.5}" font-size="{7.8 if page else 9.5}" fill="{LT if judg[i] else TX}" text-anchor="middle" font-weight="bold">{names[i]}</text>')
    if page: add('</g>')
# time axis
AY=640
# ticks only, no axis line
for x in (range(0,W+10,10) if not page else []):
    if any(abs(x-c)<6 for c in cols): continue
    add(f'<line x1="{x}" y1="{AY-3}" x2="{x}" y2="{AY+3}" stroke="{TX}" stroke-width="0.9"/>')
for c in cols:
    add(f'<line x1="{c}" y1="{AY-7}" x2="{c}" y2="{AY+7}" stroke="{TX}" stroke-width="1.6"/>')
for ai,(x,lab,act,tl) in enumerate(zip(cols,axis,actors,tools)):
    if page: lab=""
    if lab:
        ax=f' class="axis{" gap" if lab=="no case yet" else ""}" data-stage="{names[ai]}"' if page else ''
        add(f'<text{ax} x="{x}" y="{AY-13}" font-size="7.5" fill="{MU if lab=="no case yet" else TX}" text-anchor="middle">{lab}</text>')
    add(f'<text x="{x}" y="{AY+18}" font-size="8" fill="{TX}" text-anchor="middle" font-weight="bold">{act}</text>')
    if overlay and not page: add(f'<text x="{x}" y="{AY+30}" font-size="7" fill="{MU}" text-anchor="middle">{tl}</text>')

if page:
    for i,gs in enumerate(_TM["gap_step"]):
        x1,x2=cols[i],cols[i+1]; dot=gs["weeks"] is None
        dash=' stroke-dasharray="1 5" stroke-linecap="round"' if dot else ''
        add(f'<line x1="{x1+9}" y1="{AY}" x2="{x2-9}" y2="{AY}" stroke="{MU if dot else SL}" stroke-width="{1.2 if dot else 2.6}"{dash}/>')
        if gs.get("open"): add(f'<path d="M{x2-16} {AY-5} L{x2-9} {AY} L{x2-16} {AY+5}" fill="none" stroke="{SL}" stroke-width="1.4"/>')
        cls=f' class="axis{" gap" if dot else ""}" data-stage="{gs["stage"] or ""}"'
        add(f'<text{cls} x="{(x1+x2)/2}" y="{AY-13}" font-size="7.5" fill="{MU if dot else TX}" text-anchor="middle">{gs["label"]}</text>')
    tr=_TM["gap_trailing"]; x1=cols[7]
    add(f'<line x1="{x1+9}" y1="{AY}" x2="{x1+90}" y2="{AY}" stroke="{SL}" stroke-width="2.6"/><path d="M{x1+83} {AY-5} L{x1+90} {AY} L{x1+83} {AY+5}" fill="none" stroke="{SL}" stroke-width="1.4"/>')
    add(f'<text class="axis" data-stage="{tr["stage"]}" x="{x1+50}" y="{AY-13}" font-size="7.5" fill="{TX}" text-anchor="middle">{tr["label"]}</text>')
    add(f'<text x="{cols[1]}" y="{AY+42}" font-size="7" fill="{MU}" text-anchor="middle">week 0, application filed</text>')
    add(f'<text x="{W-24}" y="{AY-30}" font-size="7" fill="{MU}" text-anchor="end">Distance between stages grows with the log of the weeks measured between them. Dotted: no case, drawn at the shortest length.</text>')
# tracks
if overlay and not page:
    cov=[("docs",['f','f','f','h','f','h','f','h']),("sheets",['f','h','f','n','f','n','f','f']),("models",['n','h','n','f','n','h','n','n']),("data",['n','h','n','h','n','n','n','f'])]
    for k,(lab,m) in enumerate(cov):
        y=712+k*18
        add(f'<line x1="120" y1="{y}" x2="{W+10}" y2="{y}" stroke="{RULE}" stroke-width="0.5"/>')
        add(f'<text x="112" y="{y+3}" font-size="8" fill="{MU}" text-anchor="end">{lab}</text>')
        for x,c in zip(cols,m):
            if c=='f': add(f'<circle cx="{x}" cy="{y}" r="4" fill="{CO}"/>')
            elif c=='h': add(f'<circle cx="{x}" cy="{y}" r="4" fill="{BG}" stroke="{CO}" stroke-width="1.1"/>')
# the dominoes tool and the planner / advocate, in the same row language as the tracks above
if tool or page:
    import json, os
    here=os.path.dirname(os.path.abspath(__file__))
    G=json.load(open(os.path.join(here,"..","edges.json"))); M=json.load(open(os.path.join(here,"..","track_map.json")))
    col=dict(zip(names,cols))
    read={M["lever_stage"][d["id"]] for d in G["decisions"]}
    effect={M["outcome_stage"][e["to"]] for e in G["edges"] if e["to"] in M["outcome_stage"]}
    planner=set(M["planner_stage"])
    def diamond(x,y,fill,stage=None,kind=""):
        tag=f' class="dia {kind}" data-stage="{stage}"' if page else ''
        add(f'<polygon{tag} points="{x},{y-5} {x+5},{y} {x},{y+5} {x-5},{y}" fill="{CO if fill else BG}" stroke="{CO}" stroke-width="1.1"/>')
    for k,(lab,st,kind) in enumerate([(("planner / advocate" if not page else "planner steps in"),planner,"p"),(("tool reads lever" if not page else "decision set here"),read,"r"),(("tool traces effect" if not page else "effects land here"),effect,"e")]):
        y=(692 if page else 792)+k*18
        add(f'<line x1="120" y1="{y}" x2="{W+10}" y2="{y}" stroke="{RULE}" stroke-width="0.5"/>')
        add(f'<text x="112" y="{y+3}" font-size="8" fill="{MU}" text-anchor="end">{lab}</text>')
        for n in names:
            if n not in st: continue
            x=col[n]
            if kind=="p": add(f'<circle cx="{x}" cy="{y}" r="4" fill="{SL}"/>')
            else: diamond(x,y,kind=="r",n,"read" if kind=="r" else "effect")
    miss=[n for n in names if n not in read and n not in effect]
    cap=(f"The tool sits outside the eight steps. No rule reaches {', '.join(miss[:-1])} or {miss[-1]}. Planner placement is assumed until user session 1." if page else f"The tool sits outside the eight steps: it reads the lever set at a stage and traces effects to the stages marked. No rule reaches {', '.join(miss[:-1])} or {miss[-1]}. Planner / advocate placement is assumed until user session 1.")
    add(f'<text x="120" y="{(692 if page else 792)+3*18+2}" font-size="7.5" fill="{MU}">{cap}</text>')
# legend
ly=790 if page else 870
LX=660 if page else 940
LR="Decision set here" if page else "Dominoes reads this lever"
LE="Effects land here" if page else "Dominoes traces effects here"
add(f'<g font-size="9" fill="{TX}">'
    f'<circle cx="52" cy="{ly}" r="7" fill="{SL}"/><text x="66" y="{ly+3}">Judgment</text>'
    f'<circle cx="160" cy="{ly}" r="7" fill="{BG}" stroke="{SL}"/><text x="174" y="{ly+3}">Handover</text>'
    f'<circle cx="270" cy="{ly}" r="7" fill="none" stroke="{BL}" stroke-width="2.6"/><text x="284" y="{ly+3}">Pain point</text>'
    f'<circle cx="380" cy="{ly}" r="5" fill="{BG}" stroke="{SL}" stroke-width="0.6"/><text x="394" y="{ly+3}">Document</text>'
    f'<line x1="490" y1="{ly}" x2="520" y2="{ly}" stroke="{CO}" stroke-width="0.9" stroke-dasharray="5 4"/><text x="528" y="{ly+3}">Minor repair route</text>'
    + (f'<circle cx="660" cy="{ly}" r="4" fill="{CO}"/><text x="672" y="{ly+3}">Tool runs the step</text>'
       f'<circle cx="780" cy="{ly}" r="4" fill="{BG}" stroke="{CO}" stroke-width="1.1"/><text x="792" y="{ly+3}">Tool present, not deciding</text>' if (overlay and not page) else '')
    + (f'<polygon points="{LX},{ly-5} {LX+5},{ly} {LX},{ly+5} {LX-5},{ly}" fill="{CO}" stroke="{CO}"/><text x="{LX+14}" y="{ly+3}">{LR}</text>'
       f'<polygon points="{LX+160},{ly-5} {LX+165},{ly} {LX+160},{ly+5} {LX+155},{ly}" fill="{BG}" stroke="{CO}" stroke-width="1.1"/><text x="{LX+174}" y="{ly+3}">{LE}</text>'
       f'<circle cx="{LX+335}" cy="{ly}" r="4" fill="{SL}"/><text x="{LX+347}" y="{ly+3}">Planner / advocate steps in</text>' if (tool or page) else '') + '</g>')
add('</svg>')
name="case_study_tool" if tool else "case_study_track" if page else "case_study_wide" if overlay else "as_is_wide"
out="\n".join(o)
if page:
    out=re.sub(r'font-size="([\d.]+)"',lambda m:'font-size="%.2f"'%(float(m.group(1))*FS),out)
    out=out.replace(f'width="{W*2}" height="{H*2}" viewBox','viewBox',1)
open(name+".svg","w").write(out); print(name)
