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
lab(60,150,"BEFORE THE RUN",fs=9,anchor="start"); lab(60,162,"rules are made once",anchor="start")
lab(60,470,"THE RUN",fs=9,anchor="start"); lab(60,482,"every time a lever moves",anchor="start")
# divider
add(f'<line x1="-10" y1="400" x2="{W+10}" y2="400" stroke="{RULE}" stroke-width="1.6"/>')

PW,PH=230,54
# ---------- before the run (y=200)
y=200
xs=[220,540,860,1180]
pill(xs[0],y,PW,PH,"Research","person","literature review")
pill(xs[1],y,PW,PH,"Model","model","proposes rules based on literature")
pill(xs[2],y,PW,PH,"Person validates rules","check","adjusts or rejects each proposed rule")
pill(xs[3],y,PW,PH,"Save","script","lock in rule logic")
for a,b,t in [(xs[0],xs[1],"papers, Council reports"),(xs[1],xs[2],"proposed rules"),(xs[2],xs[3],"validated rules")]:
    line([(a+PW,y+PH/2),(b-2,y+PH/2)]); lab((a+PW+b)/2,y+PH/2-8,t)
# rule parts under model
pill(xs[1]-10,y+86,250,56,"","data")
lab(xs[1]+4,y+100,"each rule has",anchor="start")
for i,(w,l) in enumerate([(66,"direction"),(40,"lag"),(60,"source")]):
    pill(xs[1]+4+[0,74,122][i],y+108,w,20,l,"chip",fs=8)
line([(xs[1]+PW/2,y+PH),(xs[1]+PW/2,y+84)],arrow=False,dash=True)
lab(xs[1]+PW/2,y+168,"direction: which way the outcome moves · lag: years until it shows · source: the paper or report behind it",fs=6.8)
# reject exit
line([(xs[2]+PW/2,y+PH),(xs[2]+PW/2,y+92)])
pill(xs[2]+PW/2-50,y+94,100,30,"rejected","data",fs=9)
lab(xs[2]+PW/2,y+140,"rule not saved; the process stops for it")
# rule set output
line([(xs[3]+PW/2,y+PH),(xs[3]+PW/2,y+92)],arrow=False,dash=True)
pill(xs[3]+PW/2-60,y+94,120,30,"rule set","data",fs=9)
# rule set crosses into the run
line([(xs[3]+PW/2,y+124),(xs[3]+PW/2,400)],arrow=False,dash=True)
line([(xs[3]+PW/2,400),(xs[3]+PW/2,440),(410+PW/2,440),(410+PW/2,518)],dash=True)
lab(800,434,"rule set, read at every run")

# ---------- the run (y=520)
y=520
rx=[410,730,1050]
pill(rx[0],y,PW,PH,"Set levers","person","7 levers, one horizon")
pill(rx[1],y,PW,PH,"Code walks rule chains","script","combining lever rules and logic")
pill(rx[2],y,PW,PH+6,"Timeline","script","sequential effects of combined lever settings",sfs=7)
pill(rx[2]+PW+60,y+6,130,48,"Visualize","script",fs=11)
for a,b,t in [(rx[0],rx[1],"lever settings"),(rx[1],rx[2],"effects with years")]:
    line([(a+PW,y+PH/2),(b-2,y+PH/2)]); lab((a+PW+b)/2,y+PH/2-8,t)
line([(rx[2]+PW,y+PH/2+3),(rx[2]+PW+58,y+PH/2+3)]); lab(rx[2]+PW+30,y+PH/2-6,"timeline data")
# levers and horizon chips under set levers
lab(rx[0],y+86,"levers",anchor="start")
levers=[("permit route",74),("replacement ratio",96),("unit size",62),("tenure",50),("rent rule",60),("income mix",68),("conversion fee",84)]
cx=rx[0]; row=y+92
for i,(l,w) in enumerate(levers):
    if i==4: cx=rx[0]; row=y+118
    pill(cx,row,w,20,l,"chip",fs=7.5); cx+=w+6
lab(rx[0],y+152,"horizon",anchor="start")
for i,h in enumerate(["5 yr","10 yr","15 yr","30 yr"]): pill(rx[0]+i*54,y+158,48,20,h,"chip",fs=7.5)
line([(rx[0]+PW/2,y+PH),(rx[0]+PW/2,y+84)],arrow=False,dash=True)
# loop: visualize back to set levers, under the run
vx=rx[2]+PW+60+65
line([(vx,y+54),(vx,y+200),(rx[0]+PW/2,y+210),(rx[0]+PW/2,y+182)],dash=True,color=CO)
lab((vx+rx[0]+PW/2)/2,y+224,"move a lever, run again, compare",color=CO,fs=8)

# legend
ly=850
items=[("person","person"),("script","code"),("model","model"),("check","code check or person review"),("data","file or data passed")]
x=60
for k,l in items:
    pill(x,ly-7,40,14,"",k); lab(x+48,ly+4,l,fs=8,color=TX,anchor="start"); x+=48+len(l)*4.6+40
line([(x,ly),(x+40,ly)],dash=True,color=CO); lab(x+48,ly+4,"loop",fs=8,color=TX,anchor="start")
lab(W-60,ly+4,"Stop nodes return control to the person with a question, never with an answer the tool made up.",fs=7.4,anchor="end")
add('</svg>')
open('tool_logic_v6.svg','w').write("\n".join(o)); print("ok")
