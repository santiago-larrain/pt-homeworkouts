"""Genera los fotogramas de animación de la app a partir de las tiras de Wonder (v2: dirigido por configuración).

Uso (desde la raíz del repo):  python3 project/tools/build_anim.py [id …] [--no-arrows] [--no-data]
- Lee  project/tools/anim_config.json  (una entrada por movimiento: fotogramas, ancla, cortes por modelo, loop, pos,
  nowall, tiras unidas `parts`, flechas manuales `arrows`).
- Lee  project/references/anim/<f|m>-<id>.jpg  (una tira con N poses en fila; ver project/IMAGES.md).
- Recorta y alinea con strip_frames.py y escribe  docs/img/anim/<f|m>/<id>-<k>.webp  (k desde 1, ancho ≤ 640, WebP q80).
- Genera docs/data/anim.js (ANIM: n, pos, loop), docs/data/arrows.js (ARROWS: flechas de movimiento calculadas con
  arrows.py, salvo las manuales) y docs/img/anim/list.json (lo usa el service worker para guardar todo sin internet).
  Con ids sueltos solo rehace esos movimientos, pero anim.js / arrows.js / list.json se reescriben completos a partir de
  la configuración y de lo ya calculado (arrows.js conserva las flechas de los demás movimientos).
Requiere numpy, pillow y scipy.
"""
import os, sys, json, glob, re
from multiprocessing import Pool

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'project', 'references', 'anim')
OUT = os.path.join(ROOT, 'docs', 'img', 'anim')
CFG = os.path.join(ROOT, 'project', 'tools', 'anim_config.json')
MAX_W, QUALITY = 640, 80


def cut(model, sid, n, anchor, cuts, nowall):
    from strip_frames import cut_strip
    src = os.path.join(SRC, f'{model}-{sid}.jpg')
    if not os.path.exists(src): raise SystemExit(f'falta {src}')
    return cut_strip(src, n, anchor, (cuts or {}).get(model, ''), nowall)


def save(frames, model, mid):
    from PIL import Image
    import numpy as np
    os.makedirs(os.path.join(OUT, model), exist_ok=True)
    for old in glob.glob(os.path.join(OUT, model, f'{mid}-*.webp')):
        if re.fullmatch(re.escape(mid) + r'-\d+\.webp', os.path.basename(old)): os.remove(old)  # (glute-bridge no debe borrar glute-bridge-iso)
    for k, im in enumerate(frames, 1):
        # el papel de la tira queda en blanco puro (igual que el fondo de la caja de la app)
        a = np.asarray(im.convert('RGB')).astype(float)
        paper = np.median(a[:6].reshape(-1, 3), axis=0)
        im = Image.fromarray(np.clip(a * (255 / np.maximum(paper, 1)), 0, 255).astype(np.uint8))
        if im.width > MAX_W: im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, model, f'{mid}-{k}.webp'), 'WEBP', quality=QUALITY, method=6)


def pos_of(c):
    return c.get('pos') or [0, c['frames'] - 1]


def job(args):
    try:
        return job_(args)
    except BaseException as e:  # un fallo en un hijo no debe colgar el pool
        return args[0], args[1], 'ERROR: ' + str(e)


def job_(args):
    mid, model, c, want_arrows = args
    import numpy as np
    if 'parts' in c:
        frames = []
        for p in c['parts']:
            r = cut(model, p['src'], p['frames'], p['anchor'], c.get('cuts'), False)
            frames += r['frames'][p.get('skip', 0):]
        save(frames, model, mid)
        return mid, model, [[] for _ in range(len(pos_of(c)) - 1)]
    r = cut(model, mid, c['frames'], c['anchor'], c.get('cuts'), c.get('nowall', False))
    save(r['frames'], model, mid)
    arrows = None
    if want_arrows and c.get('arrows') is not False:
        man = (c.get('arrows') or {}).get(model)
        if man is not None: arrows = man
        else:
            import arrows as A
            arrows = A.compute(r['masks'], [np.asarray(f) for f in r['frames']], pos_of(c), bool(c.get('loop')))
    return mid, model, arrows


def js_arrows(data):
    lines = ['// Flechas de movimiento (generado por project/tools/build_anim.py; no editar a mano: usa "arrows" en anim_config.json).',
             '// ARROWS[id][modelo] = una lista por transición entre posiciones consecutivas (cíclica si el movimiento es loop);',
             '// cada flecha {from:[x,y], to:[x,y], curve}: coordenadas 0..1 del fotograma; curve = desvío del punto de control',
             '// (fracción del largo; + hacia la derecha del sentido, y hacia abajo). Para ir de la posición i+1 a la i se invierte.',
             'export const ARROWS = {']
    for mid in sorted(data):
        e = data[mid]
        lines.append(f"  '{mid}': {{")
        for m in 'fm':
            if m in e: lines.append(f"    {m}: {json.dumps(e[m], separators=(',', ':'))},")
        lines.append('  },')
    lines.append('};')
    return '\n'.join(lines) + '\n'


def js_anim(cfg):
    lines = ['// Animaciones por fotogramas (v1.3): img/anim/<f|m>/<id>-<k>.webp, generadas con Wonder y recortadas con',
             '// project/tools/build_anim.py (configuración en project/tools/anim_config.json; este archivo se genera, no se edita a mano).',
             '//   n:   número de fotogramas (iguales para ambos modelos).',
             '//   pos: fotograma (base 0) que corresponde a cada posición de MOVES[id].positions (por defecto: primero y último).',
             '//   loop: ciclo 1→…→n→1 (movimientos circulares) en vez de ida y vuelta.',
             '// Los fotogramas intermedios se recorren con fundidos suaves; en las posiciones la animación se detiene un momento.',
             'export const ANIM = {']
    for mid, c in cfg.items():
        n = sum(p['frames'] - p.get('skip', 0) for p in c['parts']) if 'parts' in c else c['frames']
        bits = [f'n: {n}']
        if c.get('pos') and c['pos'] != [0, n - 1]: bits.append(f"pos: {json.dumps(c['pos'])}")
        if c.get('loop'): bits.append('loop: true')
        lines.append(f"  '{mid}': {{ {', '.join(bits)} }},")
    lines.append('};')
    return '\n'.join(lines) + '\n'


def main():
    only = [x for x in sys.argv[1:] if not x.startswith('--')]
    want_arrows = '--no-arrows' not in sys.argv
    cfg = json.load(open(CFG))['moves']
    todo = [(mid, m, c, want_arrows) for mid, c in cfg.items() for m in 'fm' if not only or mid in only]
    arrows_path = os.path.join(ROOT, 'docs', 'data', 'arrows.js')
    data = {}
    if only and os.path.exists(arrows_path):  # conserva las flechas ya calculadas de los demás
        txt = open(arrows_path).read()
        for mm in re.finditer(r"'([\w-]+)': \{\n((?:    [fm]: .*\n)+)", txt):
            data[mm.group(1)] = {l.strip()[0]: json.loads(l.strip()[3:].rstrip(',')) for l in mm.group(2).strip('\n').split('\n')}
    errors = []
    with Pool(min(8, os.cpu_count() or 2)) as pool:
        for mid, model, arrows in pool.imap_unordered(job, todo):
            if isinstance(arrows, str):
                errors.append((mid, model, arrows)); print(mid, model, arrows, flush=True); continue
            if arrows is not None: data.setdefault(mid, {})[model] = arrows
            print(mid, model, 'flechas', [len(t) for t in arrows] if arrows is not None else '-', flush=True)
    if '--no-data' not in sys.argv:
        open(os.path.join(ROOT, 'docs', 'data', 'anim.js'), 'w').write(js_anim(cfg))
        if want_arrows: open(arrows_path, 'w').write(js_arrows(data))
    files = sorted(os.path.relpath(f, os.path.join(ROOT, 'docs')) for f in glob.glob(os.path.join(OUT, '*', '*.webp')))
    with open(os.path.join(OUT, 'list.json'), 'w') as fh: json.dump(files, fh, indent=0)
    print('listo:', OUT, len(files), 'fotogramas')
    if errors: sys.exit(f'{len(errors)} errores: ' + ', '.join(f'{a}-{b}' for a, b, _ in errors))


if __name__ == '__main__':
    main()
