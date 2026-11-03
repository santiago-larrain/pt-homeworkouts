import numpy as np, os, sys
from PIL import Image
U='/root/.claude/uploads/36549b73-3a22-5657-ba96-3ce441154ccf/'
G='/tmp/claude-0/-home-user-santiago-larrain/36549b73-3a22-5657-ba96-3ce441154ccf/scratchpad/v2/gallery/'
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
# id: (file, swap)
AI={'cat-cow':('9b4187ca-image.jpg',0),'shoulder-circles':('9e21d32b-image.jpg',0),'good-morning':('619d0c38-image.jpg',0),
'glute-bridge-iso':('de26bd39-image.jpg',0),'goblet-squat':('e26cb12b-image.jpg',0),'b-stance-rdl':('8e11fd53-image.jpg',0),
'monster-walk':('e03884f8-image.jpg',0),'face-pull':('b420c273-image.png',0),'floor-press':('57f0bcd9-image.jpg',0),
'ring-adductor-lift':('49d9b974-image.jpg',0),'ring-legs-side':('5cd01a99-image.jpg',1),'kneeling-hip-flexor':('7dd7bc88-image.jpg',0),
'figure-4':('715165e8-image.jpg',0)}
PH={'dead-bug':('21_3-1_dead-bug_pos1-mesa.png','22_3-1_dead-bug_pos2-estira.png'),
'band-external-rotation':('19_2-3_rotacion-externa_pos1-adentro.png','20_2-3_rotacion-externa_pos2-afuera.png'),
'doorway-pec':('27_C1_pectoral-en-marco-de-puerta_pos1-apoya.png','28_C1_pectoral-en-marco-de-puerta_pos2-avanza.png'),
'child-pose-lateral':('29_C2_postura-del-nino-lateral_pos1-centro-30-s.png','30_C2_postura-del-nino-lateral_pos2-lateral-15-s-c-lado.png')}
def divider(a):
    h,w,_=a.shape; g=a.mean(axis=2)
    best=None
    for x in range(int(w*.4),int(w*.6)):
        col=g[int(h*.1):int(h*.9),x]
        m,s=col.mean(),col.std()
        score=m+s*0.5
        if best is None or score<best[0]: best=(score,x)
    # extend: divider width
    x=best[1]; return x
def content_rows(a):
    g=a.astype(int); r,gg,b=g[...,0],g[...,1],g[...,2]
    mx=np.maximum(np.maximum(r,gg),b); mn=np.minimum(np.minimum(r,gg),b)
    ink=(mn<185)|((mx-mn)>40)
    rows=np.where(ink.mean(axis=1)>0.002)[0]
    cols=np.where(ink.mean(axis=0)>0.002)[0]
    return rows.min(),rows.max(),cols.min(),cols.max()
def save(im,path,maxw=900):
    if im.width>maxw: im=im.resize((maxw,round(im.height*maxw/im.width)),Image.LANCZOS)
    im.save(path,'WEBP',quality=82,method=6)
for mid,(f,swap) in AI.items():
    im=Image.open(U+f).convert('RGB'); a=np.asarray(im)
    x=divider(a); m=max(6,int(im.width*0.006))
    L=im.crop((0,0,x-m,im.height)); R=im.crop((x+m,0,im.width,im.height))
    w=min(L.width,R.width); L=L.crop((L.width-w,0,L.width,L.height)) if False else L.crop((0,0,w,L.height)); R=R.crop((R.width-w,0,R.width,R.height))
    p=[R,L] if swap else [L,R]
    boxes=[content_rows(np.asarray(q)) for q in p]
    t=max(0,min(b[0] for b in boxes)-int(im.height*.04)); bt=min(p[0].height,max(b[1] for b in boxes)+int(im.height*.04))
    for i,q in enumerate(p):
        q=q.crop((0,t,q.width,bt))
        save(q,f'{OUT}/{mid}-{i+1}.webp')
    print(mid,x,p[0].size,(t,bt))
for mid,(a,b) in PH.items():
    for i,f in enumerate((a,b)):
        im=Image.open(G+f).convert('RGB'); save(im,f'{OUT}/{mid}-{i+1}.webp')
    print(mid,'placeholder')
save(Image.open(U+'ee4008fa-image.png').convert('RGB'),f'{OUT}/cover.webp',800)
save(Image.open(U+'da5a3b5c-image.jpg').convert('RGB'),f'{OUT}/muscle-map.webp',1264)
