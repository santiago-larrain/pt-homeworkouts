"""Recorta una 'tira de fotogramas' (N poses en fila, generada con Wonder) en fotogramas alineados.

Uso: python3 strip_frames.py <imagen> <N> <carpeta_salida> <prefijo> [--gif] [--anchor=feet|center|left|right] [--cuts=x1,x2,…]
- Separa las figuras por regiones conectadas en 2D (sirve aunque una cabeza quede sobre los pies de la vecina).
- Reconoce el suelo / mat (filas casi completas de un color) y lo reconstruye limpio en cada fotograma.
- Alinea los fotogramas por su punto de apoyo (centro de los píxeles más bajos de la figura) para que
  el personaje no "salte" al animarse (--anchor=center: centro de la figura; left/right: su borde izquierdo/derecho, útil tendida); todos del mismo tamaño.
- Exporta <prefijo>-1.webp … <prefijo>-N.webp (ancho máx. 720) y, con --gif, una vista previa ida y vuelta.
Requiere numpy, pillow y scipy.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    src, n, out, prefix = args[0], int(args[1]), args[2], args[3]
    gif = '--gif' in sys.argv
    anchor_mode = next((x.split('=')[1] for x in sys.argv if x.startswith('--anchor=')), 'feet')
    im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
    H, W, _ = a.shape
    mx, mn = a.max(2), a.min(2)
    ink = (mn < 232) | ((mx - mn) > 28)
    paper = np.median(a[:8].reshape(-1, 3), axis=0)

    # suelo / mat: filas casi completas (entre figuras siempre hay papel)
    frac = ink.mean(1)
    floor_rows = [int(y) for y in np.where(frac > 0.82)[0]]
    # solo la franja contigua más baja (una banda elástica larga a media altura no es suelo)
    if floor_rows:
        keep = [floor_rows[-1]]
        for y in reversed(floor_rows[:-1]):
            if keep[-1] - y <= 4: keep.append(y)
            else: break
        floor_rows = sorted(keep)
    base = []
    for y in floor_rows:
        med = np.median(a[y][ink[y]], axis=0)
        if (np.abs(a[y] - med).sum(1) <= 40).mean() > 0.9: base.append(med)
    if floor_rows and not base: base = [np.median(a[floor_rows].reshape(-1, 3), axis=0)]
    fig = ink.copy()
    bg_rows = np.tile(paper, (H, 1))
    for y in floor_rows:
        d = np.min([np.abs(a[y] - c).sum(1) for c in base], axis=0)
        r_, g_, b_ = a[y, :, 0], a[y, :, 1], a[y, :, 2]
        violet = r_ >= g_ - 4  # lavanda/gris tienen R >= G; un celeste (polera) no
        bluish = (b_ > r_ + 15) & (b_ > g_ + 15) & violet  # sombras sobre mat lavanda
        matlike = (d <= 75) & violet
        rowmed = np.median(a[y], axis=0)  # color dominante de la fila (p. ej. el borde del mat)
        same_row = np.abs(a[y] - rowmed).sum(1) <= 50
        fig[y] &= ~bluish & ~same_row & (~violet | (d > 140))  # sobre el mat solo cuenta lo claramente distinto
        bg_rows[y] = np.median(a[y][matlike], axis=0) if matlike.any() else paper
    floor_y = min(floor_rows) if floor_rows else H - 1
    floor_bot = max(floor_rows) if floor_rows else H - 1
    if floor_bot - floor_y > 20: fig[floor_bot + 1:] = False  # bajo un mat grueso solo hay sombras (una línea fina puede cruzar los pies)

    # cortes manuales (--cuts=x1,x2,…): columnas que separan figuras que casi se tocan
    cuts = next((x.split('=')[1] for x in sys.argv if x.startswith('--cuts=')), '')
    for c in [int(v) for v in cuts.split(',') if v]:
        fig[:, max(0, c - 1):c + 2] = False
    # regiones conectadas -> N figuras (las N más grandes son semillas; el resto se une a la más cercana)
    lab, k = ndimage.label(ndimage.binary_closing(fig, iterations=2))
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
    objs = ndimage.find_objects(lab)
    order = np.argsort(-sizes)
    big = [int(i) for i in order if sizes[i] >= sizes[order[0]] * 0.25]
    masks = [lab == i + 1 for i in big]
    # si dos figuras se tocan, corta la región más ancha por su columna más delgada
    while len(masks) < n:
        widths = [np.ptp(np.where(m.any(0))[0]) for m in masks]
        j = int(np.argmax(widths)); m = masks[j]
        cols = np.where(m.any(0))[0]; c0, c1 = cols.min(), cols.max()
        counts = m[:, c0:c1 + 1].sum(0)
        k_per = round(widths[j] / (np.median(widths) if len(masks) > 1 else widths[j] / 2))
        k_per = max(2, k_per)
        lo, hi = int((c1 - c0) * 0.5 / k_per * 0.8), int((c1 - c0) * (1 - 0.5 / k_per * 0.8))
        cut = c0 + lo + int(np.argmin(counts[lo:hi]))
        left, right = m.copy(), m.copy(); left[:, cut:] = False; right[:, :cut] = False
        masks[j:j + 1] = [left, right]
    if len(masks) != n:
        sys.exit(f'Encontré {len(masks)} figuras grandes, esperaba {n} (tamaños: {sorted(sizes, reverse=True)[:n + 2]})')
    order_x = np.argsort([np.where(m.any(0))[0].min() for m in masks])
    masks = [masks[i] for i in order_x]
    # fragmentos sueltos (contornos de calcetas blancas, puntas de pelo): a la figura más cercana en píxeles
    dists = [ndimage.distance_transform_edt(~m) for m in masks]
    big_set = set(big)
    for i in range(k):
        if i in big_set or sizes[i] < 12: continue
        comp = lab == i + 1
        if any((m & comp).any() for m in masks): continue
        j = min(range(n), key=lambda q: dists[q][comp].min())
        masks[j] = masks[j] | comp
    # rellena huecos cerrados (ropa blanca dentro del contorno) para que el mat no la tiña
    masks = [ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=3)) | m for m in masks]

    boxes, anchors = [], []
    for m in masks:
        ys, xs = np.where(m)
        top, bot = ys.min(), ys.max()
        if anchor_mode == 'center':
            anchors.append(xs.mean())
        elif anchor_mode in ('left', 'right'):  # tendida: la cabeza (o los pies) quedan fijos
            anchors.append(xs.min() if anchor_mode == 'left' else xs.max())
        else:
            low = ys > bot - max(6, (bot - top) * 0.04)
            anchors.append(xs[low].mean())
        boxes.append((xs.min(), top, xs.max(), bot))
    pad = 16
    ext_l = int(max(ax - b[0] for b, ax in zip(boxes, anchors)) + pad)
    ext_r = int(max(b[2] - ax for b, ax in zip(boxes, anchors)) + pad)
    top = max(0, min(b[1] for b in boxes) - pad)
    bottom = min(H, max(floor_bot + 10 if floor_rows else 0, max(b[3] for b in boxes) + pad))

    os.makedirs(out, exist_ok=True)
    frames = []
    for i, ax in enumerate(anchors):
        L, R = int(round(ax)) - ext_l, int(round(ax)) + ext_r
        bg = np.repeat(bg_rows[top:bottom, None, :], R - L, axis=1)
        # alfa: máscara propia dilatada (incluye el borde suavizado) y difuminada
        m = ndimage.binary_dilation(masks[i], iterations=4)
        alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
        alpha = np.asarray(alpha).astype(float)[..., None] / 255
        src_img = np.zeros((bottom - top, R - L, 3)); al = np.zeros((bottom - top, R - L, 1))
        x0, x1 = max(0, L), min(W, R)
        src_img[:, x0 - L:x1 - L] = a[top:bottom, x0:x1]
        al[:, x0 - L:x1 - L] = alpha[top:bottom, x0:x1]
        cm = (src_img * al + bg * (1 - al)).clip(0, 255).astype(np.uint8)
        canvas = Image.fromarray(cm)
        if canvas.width > 720:
            canvas = canvas.resize((720, round(canvas.height * 720 / canvas.width)), Image.LANCZOS)
        canvas.save(f'{out}/{prefix}-{i + 1}.webp', 'WEBP', quality=86, method=6)
        frames.append(canvas)
    if gif:
        seq = frames + frames[-2:0:-1]
        seq[0].save(f'{out}/{prefix}.gif', save_all=True, append_images=seq[1:], duration=260, loop=0)
    print(prefix, 'frames', len(frames), 'size', frames[0].size, 'floor', floor_y, floor_bot)


main()
