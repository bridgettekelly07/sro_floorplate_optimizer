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
lab(60,170,"BEFORE THE RUN",fs=9,anchor="start"); lab(60,182,"evidence is gathered",anchor="start")
lab(60,420,"THE RUN",fs=9,anchor="start"); lab(60,432,"each time a setting is chosen",anchor="start")
lab(60,670,"MAKING THE CASE",fs=9,anchor="start"); lab(60,682,"after a run",anchor="start")
add(f'<line x1="-10" y1="304" x2="{W+10}" y2="304" stroke="{RULE}" stroke-width="1.6"/>')
add(f'<line x1="-10" y1="600" x2="{W+10}" y2="600" stroke="{RULE}" stroke-width="1.6"/>')

PW,PH=220,58
X=[220,490,760,1030,1300]
Y1,Y2,Y3=150,400,650
def box(i,y,l,k,sub): pill(X[i],y,PW,PH,l,k,sub,fs=12,sfs=8.4)
def arrow(i,j,y,t=None):
    a=X[i]+PW; b=X[j]
    line([(a,y+PH/2),(b-2,y+PH/2)])
    if t: lab((a+b)/2,y+PH/2-8,t,fs=8)

# before the run
box(1,Y1,"Add a Council report","person","one permit case, as a PDF")
box(2,Y1,"Extract case","model","dates, rooms, fee, route")
box(3,Y1,"Case file","data","timing.json")
box(4,Y1,"Rule set","data","edges.json, written by hand")
arrow(1,2,Y1); arrow(2,3,Y1)

# the run
box(0,Y2,"Set levers","person","any number, one setting each")
box(1,Y2,"Source check","check","a sourced effect for each?")
box(2,Y2,"Walk rule chains","script","rules and lags")
box(3,Y2,"Effects by who","script","the sheet and the chart")
arrow(0,1,Y2); arrow(1,2,Y2); arrow(2,3,Y2)
# stop node above the source check, returning to the person
line([(X[1]+PW/2,Y2),(X[1]+PW/2,Y2-46)],color=CO)
pill(X[1]+PW/2-100,Y2-82,200,36,"Stop","data",sub="no source: asks for one",fs=11,sfs=8)
line([(X[1]+PW/2-100,Y2-64),(X[0]+PW/2,Y2-64),(X[0]+PW/2,Y2-2)],dash=True,color=CO)
# stores feed the run
line([(X[3]+PW/2,Y1+PH),(X[3]+PW/2,Y2-2)],dash=True)
lab(X[3]+PW/2+8,(Y1+PH+Y2)/2+12,"step durations",fs=8,anchor="start")
line([(X[4]+PW/2,Y1+PH),(X[4]+PW/2,262),(X[2]+PW/2,262),(X[2]+PW/2,Y2-2)],dash=True)
lab(X[4]+PW/2-8,254,"rules, read at every run",fs=8,anchor="end")

# making the case
box(0,Y3,"Pick effects to cite","person","which ones to argue")
box(1,Y3,"Draft the case","model","one edge in, one sentence out")
box(2,Y3,"Citation check","check","every sentence cites an edge")
box(3,Y3,"Person edits","person","chooses which reading to follow")
box(4,Y3,"Case for Council","data","memo or testimony")
arrow(0,1,Y3); arrow(1,2,Y3); arrow(2,3,Y3); arrow(3,4,Y3)
line([(X[3]+PW/2,Y2+PH),(X[3]+PW/2,545),(X[0]+PW/2,545),(X[0]+PW/2,Y3-2)])
lab((X[0]+X[3])/2+PW/2,537,"effects, with their edge ids",fs=8)

for (i,y) in ((1,Y1),(0,Y2),(0,Y3)):
    lab(X[i]+10,y-8,"planner input",fs=8.5,color=CO,anchor="start")
# legend
ly=850
items=[("person","person"),("script","code"),("model","model"),("check","code check or person review"),("data","file or data passed")]
x=60
for k,l in items:
    pill(x,ly-7,40,14,"",k); lab(x+48,ly+4,l,fs=9,color=TX,anchor="start"); x+=48+len(l)*5+40
line([(x,ly),(x+40,ly)],dash=True,color=CO); lab(x+48,ly+4,"stop",fs=9,color=TX,anchor="start")
lab(W-60,ly+4,"A model sees one report or one edge at a time. Change a setting and run again.",fs=8.5,anchor="end")
add('</svg>')
open('tool_logic_v8.svg','w').write("\n".join(o)); print("ok")
