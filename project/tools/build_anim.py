"""Genera los fotogramas de animación de la app a partir de las tiras de Wonder.

Uso (desde la raíz del repo):  python3 project/tools/build_anim.py [id …]
- Lee  project/references/anim/<f|m>-<id>.jpg  (una tira con N poses en fila; ver project/IMAGES.md).
- Recorta y alinea con strip_frames.py y escribe  docs/img/anim/<f|m>/<id>-<k>.webp  (k desde 1)
  y docs/img/anim/list.json (lo usa el service worker para guardar todo sin internet).
- La lista de abajo dice cuántos fotogramas tiene cada tira, cómo alinearlos y, si hace falta,
  cortes manuales. Las posiciones de cada movimiento (qué fotograma es cada posición) están en
  docs/data/anim.js: si cambias el número de fotogramas, actualiza también ese archivo.
Requiere numpy, pillow y scipy.
"""
import os, sys, shutil, subprocess, tempfile, glob

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'project', 'references', 'anim')
OUT = os.path.join(ROOT, 'docs', 'img', 'anim')
CUT = os.path.join(ROOT, 'project', 'tools', 'strip_frames.py')

# id: (fotogramas, ancla, {modelo: cortes manuales})
STRIPS = {
    'goblet-squat': (5, 'feet', {}),
    'cat-cow': (4, 'feet', {'m': '426,856,1298'}),
    'shoulder-circles': (4, 'feet', {}),
    'good-morning': (4, 'feet', {}),
    'glute-bridge-iso': (4, 'left', {}),
    'b-stance-rdl': (4, 'feet', {}),
    'monster-walk': (4, 'center', {}),
    'face-pull': (4, 'feet', {}),
    'floor-press': (4, 'left', {}),
    'band-external-rotation': (4, 'feet', {}),
    'dead-bug': (4, 'feet', {}),
    'ring-adductor-lift': (4, 'right', {}),
    'kneeling-hip-flexor': (4, 'right', {}),
    'figure-4': (4, 'left', {}),
    'doorway-pec': (3, 'left', {}),
    'child-pose-lateral': (4, 'center', {}),
    'ring-legs-up': (3, 'feet', {}),     # posición 1 de ring-legs-side
    'ring-legs-side': (3, 'left', {}),   # posición 2 (se usan los fotogramas 2 y 3)
}
MAX_W, QUALITY = 640, 80


def cut(model, sid, n, anchor, cuts, tmp):
    src = os.path.join(SRC, f'{model}-{sid}.jpg')
    if not os.path.exists(src):
        print('falta', src); return []
    args = [sys.executable, CUT, src, str(n), tmp, f'{model}-{sid}', f'--anchor={anchor}']
    if cuts.get(model): args.append(f'--cuts={cuts[model]}')
    subprocess.run(args, check=True)
    return [os.path.join(tmp, f'{model}-{sid}-{k}.webp') for k in range(1, n + 1)]


def save(frames, model, mid):
    from PIL import Image
    import numpy as np
    os.makedirs(os.path.join(OUT, model), exist_ok=True)
    for old in glob.glob(os.path.join(OUT, model, f'{mid}-*.webp')): os.remove(old)
    for k, f in enumerate(frames, 1):
        im = Image.open(f).convert('RGB')
        # el papel de la tira queda en blanco puro (igual que el fondo de la caja de la app)
        a = np.asarray(im).astype(float)
        paper = np.median(a[:6].reshape(-1, 3), axis=0)
        im = Image.fromarray(np.clip(a * (255 / np.maximum(paper, 1)), 0, 255).astype(np.uint8))
        if im.width > MAX_W: im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, model, f'{mid}-{k}.webp'), 'WEBP', quality=QUALITY, method=6)


def main():
    only = set(sys.argv[1:])
    with tempfile.TemporaryDirectory() as tmp:
        for model in ('f', 'm'):
            got = {}
            for sid, (n, anchor, cuts) in STRIPS.items():
                if only and sid not in only and not (sid.startswith('ring-legs') and 'ring-legs-side' in only): continue
                got[sid] = cut(model, sid, n, anchor, cuts, tmp)
            for sid, frames in got.items():
                if sid.startswith('ring-legs') or not frames: continue
                save(frames, model, sid)
            if got.get('ring-legs-up') and got.get('ring-legs-side'):
                # una sola secuencia: piernas arriba (1-3) + de lado (4-5, sin el primer fotograma del aro aplastado)
                save(got['ring-legs-up'] + got['ring-legs-side'][1:], model, 'ring-legs-side')
    # lista para que el service worker guarde todos los fotogramas (uso sin internet)
    import json
    files = sorted(os.path.relpath(f, os.path.join(ROOT, 'docs')) for f in glob.glob(os.path.join(OUT, '*', '*.webp')))
    with open(os.path.join(OUT, 'list.json'), 'w') as fh: json.dump(files, fh, indent=0)
    print('listo:', OUT, len(files), 'fotogramas')


if __name__ == '__main__':
    main()
