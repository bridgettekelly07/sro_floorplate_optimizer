import math, sys
overlay = "--overlay" in sys.argv
W,H=1600,900
BG="#E9E2D6"; SL="#3D5A6C"; CO="#E0724E"; TX="#2B3A42"; MU="#5F6E78"; RULE="#C9BFAE"; LT="#F2EFE9"; TAN="#C9A66B"; BL="#9DB9F0"
o=[]; add=o.append
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
def panel(cx,title,lines):
    w=162; x=cx-w/2; y=100
    add(f'<rect x="{x}" y="{y}" width="{w}" height="46" rx="6" fill="none" stroke="{SL}" stroke-width="0.7" stroke-dasharray="5 4"/>')
    add(f'<text x="{x+10}" y="{y+16}" font-size="9" fill="{TX}" font-weight="bold">{title}</text>')
    for k,l in enumerate(lines): add(f'<text x="{x+10}" y="{y+32+k*13}" font-size="6.9" fill="{TX}">{l}</text>')
panel(cols[0],"Relocation",["6 of 7 cases: gone before filing"])
panel(cols[2],"Council conditions",["fee $300k per door, last charged 2015"])
panel(cols[3],"Unit size",["200 sf average decides designation"])
panel(cols[4],"Replacement",["committed, interim, permanent open"])
panel(cols[6],"Rent rule",["resets between tenants"])
panel(cols[7],"Monitoring",["City survey every 2 years"])
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
add(f'<path d="M{cols[1]} {B+R} L{cols[1]} {B+R+50} L{cols[3]} {B+R+50} L{cols[3]} {T+R+3}" fill="none" stroke="{CO}" stroke-width="0.9" stroke-dasharray="5 4" marker-end="url(#arrowc)"/>')
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
    add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
    add(f'<text x="{cx}" y="{cy+3.5}" font-size="9.5" fill="{LT if judg[i] else TX}" text-anchor="middle" font-weight="bold">{names[i]}</text>')
# time axis
AY=640
# ticks only, no axis line
for x in range(0,W+10,10):
    if any(abs(x-c)<6 for c in cols): continue
    add(f'<line x1="{x}" y1="{AY-3}" x2="{x}" y2="{AY+3}" stroke="{TX}" stroke-width="0.9"/>')
for c in cols:
    add(f'<line x1="{c}" y1="{AY-7}" x2="{c}" y2="{AY+7}" stroke="{TX}" stroke-width="1.6"/>')
for x,lab,act,tl in zip(cols,axis,actors,tools):
    if lab: add(f'<text x="{x}" y="{AY-13}" font-size="7.5" fill="{TX}" text-anchor="middle">{lab}</text>')
    add(f'<text x="{x}" y="{AY+18}" font-size="8" fill="{TX}" text-anchor="middle" font-weight="bold">{act}</text>')
    if overlay: add(f'<text x="{x}" y="{AY+30}" font-size="7" fill="{MU}" text-anchor="middle">{tl}</text>')

# tracks
if overlay:
    cov=[("docs",['f','f','f','h','f','h','f','h']),("sheets",['f','h','f','n','f','n','f','f']),("models",['n','h','n','f','n','h','n','n']),("data",['n','h','n','h','n','n','n','f'])]
    for k,(lab,m) in enumerate(cov):
        y=712+k*18
        add(f'<line x1="120" y1="{y}" x2="{W+10}" y2="{y}" stroke="{RULE}" stroke-width="0.5"/>')
        add(f'<text x="112" y="{y+3}" font-size="8" fill="{MU}" text-anchor="end">{lab}</text>')
        for x,c in zip(cols,m):
            if c=='f': add(f'<circle cx="{x}" cy="{y}" r="4" fill="{CO}"/>')
            elif c=='h': add(f'<circle cx="{x}" cy="{y}" r="4" fill="{BG}" stroke="{CO}" stroke-width="1.1"/>')
# legend
ly=870
add(f'<g font-size="9" fill="{TX}">'
    f'<circle cx="52" cy="{ly}" r="7" fill="{SL}"/><text x="66" y="{ly+3}">Judgment</text>'
    f'<circle cx="160" cy="{ly}" r="7" fill="{BG}" stroke="{SL}"/><text x="174" y="{ly+3}">Handover</text>'
    f'<circle cx="270" cy="{ly}" r="7" fill="none" stroke="{BL}" stroke-width="2.6"/><text x="284" y="{ly+3}">Pain point</text>'
    f'<circle cx="380" cy="{ly}" r="5" fill="{BG}" stroke="{SL}" stroke-width="0.6"/><text x="394" y="{ly+3}">Document</text>'
    f'<line x1="490" y1="{ly}" x2="520" y2="{ly}" stroke="{CO}" stroke-width="0.9" stroke-dasharray="5 4"/><text x="528" y="{ly+3}">Minor repair route</text>'
    + (f'<circle cx="660" cy="{ly}" r="4" fill="{CO}"/><text x="672" y="{ly+3}">Tool runs the step</text>'
       f'<circle cx="780" cy="{ly}" r="4" fill="{BG}" stroke="{CO}" stroke-width="1.1"/><text x="792" y="{ly+3}">Tool present, not deciding</text>' if overlay else '') + '</g>')
add('</svg>')
name="case_study_wide" if overlay else "as_is_wide"
open(name+".svg","w").write("\n".join(o)); print(name)
