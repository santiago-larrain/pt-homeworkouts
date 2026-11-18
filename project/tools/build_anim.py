"""Genera los fotogramas de animación de la app a partir de las tiras de Wonder (v2: dirigido por configuración).

Uso (desde la raíz del repo):  python3 project/tools/build_anim.py [id …] [--no-arrows] [--no-data]
- Lee  project/tools/anim_config.json  (una entrada por movimiento: fotogramas, ancla, cortes por modelo, loop, pos,
  nowall, tiras unidas `parts`, flechas manuales `arrows`).
- `matfix: <fracción>`: rellena los recortes blancos de un mat escalonado (ring-squeeze, vista desde los pies).
- `alt: "<id>-b"` (+ `bodyAlign` (alinea por el contorno inferior del cuerpo), `altFrames`, `altCuts`, `altArrows`: 'same' (por defecto) | 'auto' | false | {f,m}): tira B de un movimiento alternante, `<f|m>-<id>-b.jpg`; se corta con el mismo lienzo que A y
  alineada con su fotograma 1 (strip_frames.cut_pair) y se escribe `<id>-b-<k>.webp` (flechas en ARROWS['<id>-b']).
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


def cut(model, sid, n, anchor, cuts, nowall, body=False):
    from strip_frames import cut_strip
    src = os.path.join(SRC, f'{model}-{sid}.jpg')
    if not os.path.exists(src): raise SystemExit(f'falta {src}')
    return cut_strip(src, n, anchor, (cuts or {}).get(model, ''), nowall, None, body)


def fix_mat(frames, masks, top):
    """matfix (fracción de la altura bajo la cual el mat es continuo): en tiras con mat escalonado (vista desde los pies) rellena los
    recortes blancos del mat con el color del mat más cercano, solo fuera de la figura (los calcetines blancos quedan intactos)."""
    from PIL import Image
    import numpy as np
    from scipy import ndimage
    out = []
    for im, m in zip(frames, masks):
        a = np.asarray(im.convert('RGB')).copy(); h, w, _ = a.shape
        white = ndimage.binary_dilation(a.min(2) > 212, iterations=2)
        reg = np.zeros((h, w), bool); reg[int(h * top):] = True
        fill = white & ~m & reg
        valid = ~white & reg & ~ndimage.binary_dilation(m, iterations=3)
        if fill.any() and valid.any():
            idx = ndimage.distance_transform_edt(~valid, return_distances=False, return_indices=True)
            a[fill] = a[idx[0][fill], idx[1][fill]]
        out.append(Image.fromarray(a))
    return out


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
        return mid, model, ([[] for _ in range(len(pos_of(c)) - 1)], None)
    if c.get('alt'):  # movimiento alternante: tira A (mid) + tira B (c['alt']) con el mismo lienzo y alineadas en el fotograma 1
        from strip_frames import cut_pair
        srcA, srcB = os.path.join(SRC, f'{model}-{mid}.jpg'), os.path.join(SRC, f'{model}-{c["alt"]}.jpg')
        for f in (srcA, srcB):
            if not os.path.exists(f): raise SystemExit(f'falta {f}')
        cuts = c.get('cuts') or {}; acuts = c.get('altCuts') or {}
        r, rb, dx = cut_pair(srcA, srcB, c['frames'], c.get('altFrames', c['frames']), c['anchor'], cuts.get(model, ''), acuts.get(model, ''), c.get('nowall', False), bool(c.get('bodyAlign')))
        save(r['frames'], model, mid); save(rb['frames'], model, c['alt'])
        print(mid, model, 'B alineada con dx =', dx, flush=True)
    else:
        r = cut(model, mid, c['frames'], c['anchor'], c.get('cuts'), c.get('nowall', False), bool(c.get('bodyAlign'))); rb = None
        if c.get('matfix'): r['frames'] = fix_mat(r['frames'], r['masks'], float(c['matfix']))
        save(r['frames'], model, mid)
    arrows = None; arrowsB = None
    if want_arrows and c.get('arrows') is not False:
        man = (c.get('arrows') or {}).get(model)
        if man is not None: arrows = man
        else:
            import arrows as A
            arrows = A.compute(r['masks'], [np.asarray(f) for f in r['frames']], pos_of(c), bool(c.get('loop')))
        # tira B: por defecto las MISMAS flechas que A (el gesto 2D es igual, solo cambia qué lado es: las automáticas salían
        # inconsistentes entre modelos); altArrows: 'auto' las calcula sobre B, false las apaga, {f:…,m:…} las fija a mano
        alt_a = c.get('altArrows', 'same')
        if rb is not None and alt_a is not False and arrows is not None:
            if alt_a == 'same': arrowsB = arrows
            elif isinstance(alt_a, dict): arrowsB = alt_a.get(model)
            elif alt_a == 'auto':
                import arrows as A
                arrowsB = A.compute(rb['masks'], [np.asarray(f) for f in rb['frames']], pos_of(c), bool(c.get('loop')))
    return mid, model, (arrows, arrowsB)


def sanitize(tr):
    """Revisión de flechas (v1.11): una flecha de menos de 0,10 (fracción del fotograma) se lee como una mancha (la punta es más
    grande que el cuerpo) y se descarta; las cortas (< 0,2) con mucha curvatura salen como ganchos, así que se enderezan."""
    out = []
    for t in tr or []:
        keep = []
        for a in t:
            L = ((a['to'][0] - a['from'][0]) ** 2 + (a['to'][1] - a['from'][1]) ** 2) ** 0.5
            if L < 0.10: continue
            if L < 0.2 and abs(a.get('curve', 0)) > 0.15: a = dict(a, curve=round(0.15 if a['curve'] > 0 else -0.15, 3))
            keep.append(a)
        out.append(keep)
    return out


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
             '//   alt: nº de fotogramas de la tira B (img/anim/<f|m>/<id>-b-<k>.webp) de un movimiento alternante (dose.alternating): el otro brazo/pierna.',
             '// Los fotogramas intermedios se recorren con fundidos suaves; en las posiciones la animación se detiene un momento.',
             'export const ANIM = {']
    for mid, c in cfg.items():
        n = sum(p['frames'] - p.get('skip', 0) for p in c['parts']) if 'parts' in c else c['frames']
        bits = [f'n: {n}']
        if c.get('pos') and c['pos'] != [0, n - 1]: bits.append(f"pos: {json.dumps(c['pos'])}")
        if c.get('loop'): bits.append('loop: true')
        if c.get('alt'): bits.append(f"alt: {c.get('altFrames', c['frames'])}")
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
        for mid, model, res in pool.imap_unordered(job, todo):
            if isinstance(res, str):
                errors.append((mid, model, res)); print(mid, model, res, flush=True); continue
            arrows, arrowsB = res
            if arrows is not None: data.setdefault(mid, {})[model] = arrows
            if arrowsB is not None: data.setdefault(cfg[mid]['alt'], {})[model] = arrowsB
            print(mid, model, 'flechas', [len(t) for t in arrows] if arrows is not None else '-', flush=True)
    for mid in list(data):
        for m in list(data[mid]): data[mid][m] = sanitize(data[mid][m])
    if '--no-data' not in sys.argv:
        open(os.path.join(ROOT, 'docs', 'data', 'anim.js'), 'w').write(js_anim(cfg))
        if want_arrows: open(arrows_path, 'w').write(js_arrows(data))
    files = sorted(os.path.relpath(f, os.path.join(ROOT, 'docs')) for f in glob.glob(os.path.join(OUT, '*', '*.webp')))
    with open(os.path.join(OUT, 'list.json'), 'w') as fh: json.dump(files, fh, indent=0)
    print('listo:', OUT, len(files), 'fotogramas')
    if errors: sys.exit(f'{len(errors)} errores: ' + ', '.join(f'{a}-{b}' for a, b, _ in errors))


if __name__ == '__main__':
    main()
