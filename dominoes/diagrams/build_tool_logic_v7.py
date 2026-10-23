W,H=1600,900
BG="#E9E2D6"; SL="#3D5A6C"; CO="#E0724E"; TX="#2B3A42"; MU="#5F6E78"; TAN="#9DB9F0"; LT="#F2EFE9"; RULE="#C9BFAE"
o=[]
def add(s): o.append(s)
def pill(x,y,w,h,label,kind,sub=None,fs=11,sfs=7.6):
    if kind=="person": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{SL}"/>'); c=LT
    elif kind=="script": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{BG}" stroke="{SL}" stroke-width="1.2"/>'); c=TX
    elif kind=="model": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{CO}"/>'); c=LT
    elif kind=="check": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{BG}" stroke="{TAN}" stroke-width="2.4"/>'); c=TX
    elif kind=="data": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="none" stroke="{SL}" stroke-width="0.8" stroke-dasharray="5 4"/>'); c=TX
    elif kind=="chip": add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{BG}" stroke="{SL}" stroke-width="0.8"/>'); c=TX
    cx=x+w/2
    if sub:
        add(f'<text x="{cx}" y="{y+h/2-3}" font-size="{fs}" fill="{c}" text-anchor="middle" font-weight="bold">{label}</text>')
        add(f'<text x="{cx}" y="{y+h/2+10}" font-size="{sfs}" fill="{c}" text-anchor="middle">{sub}</text>')
    else:
        add(f'<text x="{cx}" y="{y+h/2+4}" font-size="{fs}" fill="{c}" text-anchor="middle" font-weight="bold">{label}</text>')
def line(pts,arrow=True,dash=False,color=SL,w=1.1):
    d="M"+" L".join(f"{p[0]} {p[1]}" for p in pts)
    da = ' stroke-dasharray="5 4"' if dash else ""
    ar = ' marker-end="url(#arrow' + ("c" if color==CO else "") + ')"' if arrow else ""
    add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}"{da}{ar}/>')
def lab(x,y,t,fs=7.4,color=MU,anchor="middle"):
    add(f'<text x="{x}" y="{y}" font-size="{fs}" fill="{color}" text-anchor="{anchor}">{t}</text>')

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*2}" height="{H*2}" viewBox="0 0 {W} {H}" font-family="Helvetica, Arial, DejaVu Sans, sans-serif">')
add(f'<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="{SL}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></marker>'
    f'<marker id="arrowc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="{CO}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>')
add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')

# phase labels
lab(60,112,"BEFORE THE RUN",fs=9,anchor="start"); lab(60,124,"rules, written once",anchor="start")
lab(60,262,"BEFORE THE RUN",fs=9,anchor="start"); lab(60,274,"cases, as reports are found",anchor="start")
lab(60,452,"THE RUN",fs=9,anchor="start"); lab(60,464,"every time a setting is chosen",anchor="start")
lab(60,632,"MAKING THE CASE",fs=9,anchor="start"); lab(60,644,"after a run",anchor="start")
add(f'<line x1="-10" y1="372" x2="{W+10}" y2="372" stroke="{RULE}" stroke-width="1.6"/>')
add(f'<line x1="-10" y1="590" x2="{W+10}" y2="590" stroke="{RULE}" stroke-width="0.8" stroke-dasharray="3 5"/>')

PW,PH=200,54
X=[220,470,720,970,1220]
def row(y,items):
    for i,(l,k,sub) in enumerate(items): pill(X[i],y,PW,PH,l,k,sub)
def flow(y,labels,n):
    for i in range(n-1):
        a=X[i]+PW; b=X[i+1]
        line([(a,y+PH/2),(b-2,y+PH/2)])
        if labels[i]: lab((a+b)/2,y+PH/2-8,labels[i])

# A: rules
yA=100
row(yA,[("Research","person","papers, Council reports"),("Write rule","person","direction, lag, source, by hand"),("Source check","check","source listed, sentence quoted"),("Rule set","data","edges.json")])
flow(yA,["a finding","drafted rule","accepted rule"],4)

# B: cases (AI use 1)
yB=250
row(yB,[("Council report","data","PDF, one permit case"),("Extract case","model","dates, rooms, fee, route"),("Quote check","check","dates in order, values quoted"),("Person checks","check","against the PDF"),("Case file","data","timing.json")])
flow(yB,["report text","draft case","checked case","approved case"],5)

# C: the run
yC=440
row(yC,[("Set levers","person","one setting each, any number"),("Source check","check","a sourced effect for each?"),("Walk rule chains","script","rules and lags"),("Effects by who","script","years, who, quoted sizes"),("Visualize","script","sheet and chart")])
flow(yC,["settings","sourced","effects","effects"],5)
# stop node
line([(X[1]+PW/2,yC+PH),(X[1]+PW/2,yC+80)],color=CO)
pill(X[1]+PW/2-90,yC+82,180,34,"Stop","data",sub="no source: asks for one",fs=10,sfs=7.4)
line([(X[1]+PW/2-90,yC+99),(X[0]+PW/2,yC+99),(X[0]+PW/2,yC+PH+2)],dash=True,color=CO)
lab(X[0]+PW/2+8,yC+134,"the person adds a source by hand, or picks another setting",fs=7.2,color=CO,anchor="start")
# floorplate chip
line([(X[4]+PW/2,yC+PH),(X[4]+PW/2,yC+80)],arrow=False,dash=True)
pill(X[4]+PW/2-100,yC+82,200,34,"Floorplate counts","data",sub="unit size only, a separate model",fs=9,sfs=7)

# store feeds into the run (right margin)
line([(X[3]+PW,yA+PH/2),(1470,yA+PH/2),(1470,392),(X[2]+PW/2,392),(X[2]+PW/2,yC-2)],dash=True)
lab(1130,386,"rule set, read at every run",fs=7.2)
line([(X[4]+PW,yB+PH/2),(1500,yB+PH/2),(1500,404),(X[4]+PW/2,404),(X[4]+PW/2,yC-2)],dash=True)
lab(1400,398,"step durations",fs=7.2)
# loop
line([(X[4]+PW-30,yC),(X[4]+PW-30,424),(X[0]+PW/2,424),(X[0]+PW/2,yC-2)],dash=True,color=CO)
lab(700,420,"move a setting, run again, compare",color=CO,fs=8)

# D: the case (AI use 2)
yD=620
row(yD,[("Chosen effects","data","edge ids, sources, sizes"),("Draft the case","model","one edge in, one sentence out"),("Citation check","check","every sentence cites an edge"),("Person edits","person","chooses which reading to follow"),("Case for Council","data","memo or testimony")])
flow(yD,["each edge","sentences","checked text","final text"],5)
line([(X[3]+PW/2,yC+PH),(X[3]+PW/2,590+14),(X[0]+PW/2,590+14),(X[0]+PW/2,yD-2)])
lab(700,590+8,"chosen settings and their effects, with edge ids",fs=7.2)

# legend
ly=850
items=[("person","person"),("script","code"),("model","model"),("check","code check or person review"),("data","file or data passed")]
x=60
for k,l in items:
    pill(x,ly-7,40,14,"",k); lab(x+48,ly+4,l,fs=8,color=TX,anchor="start"); x+=48+len(l)*4.6+40
line([(x,ly),(x+40,ly)],dash=True,color=CO); lab(x+48,ly+4,"stop or loop",fs=8,color=TX,anchor="start")
lab(W-60,ly+4,"A model never sees more than one report or one edge at a time. Stop nodes return control to the person.",fs=7.4,anchor="end")
add('</svg>')
open('tool_logic_v7.svg','w').write("\n".join(o)); print("ok")
