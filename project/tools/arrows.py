"""Flechas de movimiento automáticas a partir de las máscaras alineadas de los fotogramas (usado por build_anim.py).

Para cada transición entre dos posiciones consecutivas se compara la máscara de la figura en ambos fotogramas:
  - región que se DESOCUPA (A y no B)   → de dónde sale la parte que se mueve
  - región que se OCUPA de nuevo (B y no A) → hacia dónde va
Se agrupan en partes móviles (componentes conexos cercanos), se toma el centroide de la mayor componente de cada
lado y se descarta lo diminuto (ruido de alineación, bordes) o lo que se desplaza menos del 6 % del tamaño del
fotograma. Hasta 2 flechas por transición (p. ej. brazo y pierna del dead bug). La curvatura sale de los
fotogramas intermedios (trayectoria real del centroide); sin intermedios, una curva suave por defecto.
Las flechas no deben tapar la cara: se detecta la cabeza (mancha grande de pelo oscuro) y se prueban otras curvaturas
o se desplaza la flecha; si aun así choca, se descarta.
Coordenadas normalizadas 0..1 del fotograma: {'from': [x, y], 'to': [x, y], 'curve': c}; c = desvío del punto de control
como fracción del largo, positivo hacia la derecha del sentido (pantalla, y hacia abajo).
"""
import numpy as np
from scipy import ndimage

WORK = 220          # lado mayor de trabajo (px)
MIN_DISP = 0.06     # desplazamiento mínimo (fracción del lado mayor)
SOFT_DISP = 0.035   # segundo intento si no salió ninguna flecha (movimientos pequeños: superman, remo, curl-up…)


def _down(m, s):
    h, w = m.shape
    hh, ww = max(1, int(h * s)), max(1, int(w * s))
    ys = (np.arange(hh) / s).astype(int).clip(0, h - 1); xs = (np.arange(ww) / s).astype(int).clip(0, w - 1)
    # voto por bloque: más estable que un muestreo puntual
    f = ndimage.zoom(m.astype(float), (hh / h, ww / w), order=1)
    return f > 0.5


def _biggest(m):
    lab, k = ndimage.label(m)
    if not k: return None, 0
    sz = ndimage.sum(m, lab, range(1, k + 1)); i = int(np.argmax(sz))
    return lab == i + 1, float(sz[i])


def head_circle(frame_rgb, mask, scale):
    """(cx, cy, r) normalizados del pelo (≈ cabeza) o None. frame_rgb: array HxWx3 del fotograma."""
    a = frame_rgb.astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    hair = (a.max(2) < 100) & (r - b >= 10) & (r >= g) & mask
    hair = ndimage.binary_erosion(hair, iterations=max(2, int(a.shape[1] / 220)))
    big, sz = _biggest(hair)
    if big is None or sz < 40: return None
    ys, xs = np.where(big)
    h, w = mask.shape
    rad = max(np.ptp(xs), np.ptp(ys)) * 0.75 + 0.03 * max(h, w)
    return (xs.mean() / w, ys.mean() / h, rad / max(h, w))


def _disc(shape, head, grow=1.6):
    h, w = shape
    m = max(h, w)
    yy, xx = np.mgrid[0:h, 0:w]
    return np.hypot((xx / w - head[0]) * w / m, (yy / h - head[1]) * h / m) < head[2] * grow


def _moving_parts(A, B, aspect, skip=None, min_disp=MIN_DISP):
    """Devuelve lista de dicts {from, to, area} (coords normalizadas) para un par de máscaras (ya reducidas)."""
    h, w = A.shape
    V = ndimage.binary_opening(A & ~B, iterations=2)
    N = ndimage.binary_opening(B & ~A, iterations=2)
    if skip is not None: V &= ~skip; N &= ~skip  # la cabeza no es el origen de la flecha (la cara no se tapa)
    region = V | N
    if not region.any(): return []
    zone, k = ndimage.label(ndimage.binary_dilation(region, iterations=max(2, int(0.05 * max(h, w)))))
    parts = []
    for i in range(1, k + 1):
        z = zone == i
        v, vs = _biggest(V & z); n, ns = _biggest(N & z)
        if v is None or n is None: continue
        if min(vs, ns) < 0.0006 * h * w: continue
        cv = np.array(ndimage.center_of_mass(v))[::-1]; cn = np.array(ndimage.center_of_mass(n))[::-1]  # (x,y) px
        disp = np.hypot(*(cn - cv)) / max(h, w)
        if disp < min_disp: continue
        parts.append({'from': cv / [w, h], 'to': cn / [w, h], 'area': min(vs, ns), 'zone': z})
    parts.sort(key=lambda p: -p['area'])
    out = []
    for p in parts:
        if len(out) >= 2: break
        if out:
            if p['area'] < 0.35 * out[0]['area']: continue
            if np.hypot(*((p['from'] + p['to']) / 2 - (out[0]['from'] + out[0]['to']) / 2)) < 0.12: continue
        out.append(p)
    return out


def _bez(p0, c, p1, t):
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t * t * p1


def _ctrl(p0, p1, curve):
    d = p1 - p0; L = np.hypot(*d)
    n = np.array([-d[1], d[0]]) / max(L, 1e-9)
    return (p0 + p1) / 2 + n * curve * L


def _hits(p0, p1, curve, heads, aspect):
    """¿La flecha (curva + punta) toca alguna cabeza? Las distancias se miden con el eje x escalado por el aspecto."""
    c = _ctrl(p0, p1, curve)
    for t in np.linspace(0, 1, 16):
        q = _bez(p0, c, p1, t)
        for hd in heads:
            if hd is None: continue
            dx = (q[0] - hd[0]) * aspect[0]; dy = (q[1] - hd[1]) * aspect[1]
            if np.hypot(dx, dy) < hd[2] * 1.15: return True
    return False


def compute(masks, frames_rgb, P, loop, scale_hint=None):
    """masks/frames_rgb: listas alineadas (mismo tamaño). P: fotograma de cada posición. Devuelve una lista (una por
    transición entre posiciones consecutivas, cíclica si loop) de listas de flechas."""
    h0, w0 = masks[0].shape
    s = WORK / max(h0, w0)
    small = [_down(m, s) for m in masks]
    aspect = (w0 / max(h0, w0), h0 / max(h0, w0))
    heads = [head_circle(np.asarray(f), m, s) for f, m in zip(frames_rgb, masks)]
    heads_n = heads
    n = len(P)
    trans = [(i, i + 1) for i in range(n - 1)] + ([(n - 1, 0)] if loop and n > 1 else [])
    res = []
    for (i, j) in trans:
        fa, fb = P[i], P[j]
        skip = None
        for k in (fa, fb):
            if heads[k] is not None:
                d_ = _disc(small[0].shape, heads[k]); skip = d_ if skip is None else skip | d_
        parts = _moving_parts(small[fa], small[fb], aspect, skip) or _moving_parts(small[fa], small[fb], aspect, skip, SOFT_DISP)
        arrows = []
        step = 1 if fb > fa else -1
        mids = list(range(fa + step, fb, step)) if fa != fb else []
        for p in parts:
            p0, p1 = np.array(p['from']), np.array(p['to'])
            # trayectoria real: centroide de lo nuevo (respecto de A) en la zona, en cada fotograma intermedio
            pts = [p0]
            for k in mids:
                nk, sz = _biggest(ndimage.binary_opening(small[k] & ~small[fa], iterations=2) & p['zone'])
                if nk is not None and sz > 0.0004 * small[k].size:
                    pts.append(np.array(ndimage.center_of_mass(nk))[::-1] / [small[k].shape[1], small[k].shape[0]])
            pts.append(p1)
            chord = p1 - p0; L = np.hypot(*chord)
            normal = np.array([-chord[1], chord[0]]) / L
            if len(pts) > 2:
                dev = np.mean([np.dot(q - p0, normal) for q in pts[1:-1]])
                curve = float(np.clip(2 * dev / L, -0.45, 0.45))
                if abs(curve) < 0.08: curve = 0.12 if curve >= 0 else -0.12
            else:
                curve = 0.2
            # evita la cara: ambos fotogramas
            hs = [heads_n[fa], heads_n[fb]] + [heads_n[k] for k in mids]
            ok = None
            for cv in (curve, -curve, curve * 1.8, -curve * 1.8, 0.0):
                if not _hits(p0, p1, cv, hs, aspect): ok = cv; break
            if ok is None:
                # desplaza la flecha alejándola de la cabeza más cercana
                for off in (0.04, 0.08, 0.12):
                    hd = min([x for x in hs if x is not None], key=lambda x: np.hypot((x[0] - (p0[0] + p1[0]) / 2) * aspect[0], (x[1] - (p0[1] + p1[1]) / 2) * aspect[1]))
                    mid = (p0 + p1) / 2; v = mid - np.array(hd[:2]); v = v / max(np.hypot(*v), 1e-9)
                    q0, q1 = p0 + v * off, p1 + v * off
                    if not _hits(q0, q1, curve, hs, aspect): p0, p1, ok = q0, q1, curve; break
            if ok is None: continue
            arrows.append({'from': [round(float(p0[0]), 3), round(float(p0[1]), 3)],
                           'to': [round(float(p1[0]), 3), round(float(p1[1]), 3)], 'curve': round(float(ok), 2)})
        res.append(arrows)
    return res
