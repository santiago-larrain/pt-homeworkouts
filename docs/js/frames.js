// Animación por fotogramas (v1.3): el mismo personaje dibujado en N poses alineadas (docs/data/anim.js).
// Se recorren con fundidos suaves entre fotogramas vecinos; en cada posición del movimiento hay una pausa breve.
// v2: precarga/decodifica antes de animar, tiempos con aceleración suave entre posiciones, fundido corto
// (la figura nueva aparece sobre la anterior, que sigue opaca debajo) y flechas de movimiento (data/arrows.js).
import { ANIM } from '../data/anim.js';
import { ARROWS } from '../data/arrows.js';

export const hasFrames = id => !!ANIM[id];
export const frameCount = id => (ANIM[id] ? ANIM[id].n : 0);
export const frameURL = (id, model, k) => `img/anim/${model === 'm' ? 'm' : 'f'}/${id}-${k + 1}.webp`;
// fotograma (base 0) de cada posición del movimiento
export function posFrames(id, nPos) {
  const a = ANIM[id];
  if (a.pos) return a.pos;
  return nPos > 2 ? Array.from({ length: nPos }, (_, i) => Math.round(i * (a.n - 1) / (nPos - 1))) : [0, a.n - 1];
}
export const posFrame = (id, pos, nPos = 2) => posFrames(id, nPos)[pos] ?? 0;

const ease = t => t * t * (3 - 2 * t);                       // suavizado (smoothstep)
const clamp01 = x => Math.min(1, Math.max(0, x));
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

const NAVY = '#1c2f7a';
const SVGNS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

// capa SVG de flechas sobre los fotogramas (mismo recuadro que las imágenes: object-fit contain ⇒ viewBox con su proporción).
// Va dentro de .rigframes: si la caja se espeja (.flip), las flechas se espejan con la imagen y siguen coincidiendo.
class ArrowLayer {
  constructor(host) {
    this.svg = mk('svg', { viewBox: '0 0 1 1', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
    Object.assign(this.svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 5 });
    this.slots = [0, 1].map(() => {
      const g = mk('g', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); g.style.opacity = 0;
      const halo = mk('path', { fill: 'none', stroke: '#fff', 'stroke-width': 0.034, pathLength: 1 });
      const line = mk('path', { fill: 'none', stroke: NAVY, 'stroke-width': 0.016, pathLength: 1 });
      const hh = mk('path', { fill: '#fff', stroke: '#fff', 'stroke-width': 0.02 });
      const head = mk('path', { fill: NAVY, stroke: NAVY, 'stroke-width': 0.006 });
      g.append(halo, line, hh, head); this.svg.append(g);
      return { g, halo, line, hh, head };
    });
    host.append(this.svg);
    this.key = null;
  }
  setAspect(ar) { if (ar && ar !== this.ar) { this.ar = ar; this.svg.setAttribute('viewBox', `0 0 ${ar} 1`); this.key = null; } }
  // arrows: [{from,to,curve}] en 0..1; reversed: invierte el sentido
  set(arrows, reversed, key) {
    if (key === this.key) return;
    this.key = key;
    const ar = this.ar || 1;
    this.slots.forEach((s, i) => {
      const a = arrows && arrows[i];
      s.on = !!a; s.q = null;
      if (!a) { s.g.style.opacity = 0; return; }
      let p0 = a.from, p1 = a.to, c = a.curve || 0;
      if (reversed) { [p0, p1] = [p1, p0]; c = -c; }
      const P0 = [p0[0] * ar, p0[1]], P1 = [p1[0] * ar, p1[1]];
      const dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy) || 1e-6;
      const C = [(P0[0] + P1[0]) / 2 - dy / L * c * L, (P0[1] + P1[1]) / 2 + dx / L * c * L];
      let tx = P1[0] - C[0], ty = P1[1] - C[1]; const tl = Math.hypot(tx, ty) || 1e-6; tx /= tl; ty /= tl;
      const hl = Math.min(0.09, Math.max(0.055, L * 0.3)), hw = hl * 0.45;
      const E = [P1[0] - tx * hl * 0.75, P1[1] - ty * hl * 0.75];
      const d = `M${P0[0]} ${P0[1]} Q${C[0]} ${C[1]} ${E[0]} ${E[1]}`;
      const B = [P1[0] - tx * hl, P1[1] - ty * hl];
      const head = `M${P1[0]} ${P1[1]} L${B[0] - ty * hw} ${B[1] + tx * hw} L${B[0] + ty * hw} ${B[1] - tx * hw}Z`;
      s.halo.setAttribute('d', d); s.line.setAttribute('d', d); s.hh.setAttribute('d', head); s.head.setAttribute('d', head);
    });
  }
  // u: progreso del traslado 0..1 (null = estático)
  update(u) {
    for (const s of this.slots) {
      if (!s.on) continue;
      let op, draw;
      if (u == null) { op = 0.8; draw = 1; }
      else {
        draw = ease(clamp01(u / 0.55));                      // se traza al empezar el movimiento
        op = u < 0.12 ? ease(u / 0.12) : u > 0.72 ? ease(clamp01((1 - u) / 0.28)) : 1; // aparece y se desvanece
        op *= 0.85;
      }
      const q = Math.round(draw * 100) + ':' + Math.round(op * 100);
      if (s.q === q) continue; s.q = q;
      s.g.style.opacity = op;
      const off = 1 - draw;
      s.halo.setAttribute('stroke-dasharray', '1 1.01'); s.halo.setAttribute('stroke-dashoffset', off);
      s.line.setAttribute('stroke-dasharray', '1 1.01'); s.line.setAttribute('stroke-dashoffset', off);
      const hv = draw > 0.9 ? 1 : 0; s.head.style.opacity = hv; s.hh.style.opacity = hv;
    }
  }
  destroy() { this.svg.remove(); }
}

export class FrameAnimator {
  // nPos: número de posiciones del movimiento; onPos(i): posición hacia la que va (para la respiración)
  constructor(box, id, model, { nPos = 2, fixed = null, play = true, speed = 1.6, isPaused = () => false, onPos = () => {} } = {}) {
    const A = ANIM[id];
    Object.assign(this, { box, id, n: A.n, speed, isPaused, onPos, model: model === 'm' ? 'm' : 'f' });
    this.P = posFrames(id, nPos);
    this.el = document.createElement('div');
    this.el.className = 'rigframes';
    this.el.innerHTML = Array.from({ length: A.n }, (_, k) => `<img src="${frameURL(id, model, k)}" alt="" decoding="async" loading="eager" draggable="false">`).join('');
    this.imgs = [...this.el.children];
    box.prepend(this.el);
    this.cur = -1; this.pos = -1; this.reduced = reduced();
    this.arrowsData = (ARROWS[id] || {})[this.model] || null;
    this.fixedMode = fixed != null || !play;
    if (this.arrowsData && !this.fixedMode && A.n > 1) this.layer = new ArrowLayer(this.el);
    // decodifica todo antes de animar (sin parpadeo en la primera vuelta); el primer fotograma se muestra ya
    this.isReady = false;
    this.ready = Promise.all(this.imgs.map(im => (im.decode ? im.decode() : Promise.resolve()).catch(() => {}))).then(() => {
      if (this.dead) return;
      const im = this.imgs[0]; if (im && im.naturalWidth && this.layer) this.layer.setAspect(im.naturalWidth / im.naturalHeight);
      this.isReady = true;
    });
    if (this.fixedMode) { this.show(this.P[fixed ?? 0] ?? 0, null, 0); this.setPos(fixed ?? 0); return; }
    const up = [...Array(A.n).keys()];
    this.loopMode = !!A.loop;
    this.seq = this.loopMode ? up : up.concat(up.slice(1, -1).reverse()); // ciclo o ida y vuelta
    this.buildTimeline();
    this.k = 0; this.phase = 0; this.last = 0; this.lastDraw = 0;
    this.show(this.seq[0], null, 0); this.setPos(this.headingFrom(0, 0));
    this.loop = requestAnimationFrame(ts => this.tick(ts));
  }
  setPos(i) {
    if (i !== this.pos && i >= 0) { this.pos = i; this.onPos(i); if (this.layer && this.reduced) this.staticArrow(i); }
  }
  isPosFrame(f) { return this.P.includes(f) || (!this.loopMode && (f === 0 || f === this.n - 1)); }
  // Línea de tiempo: marcas (fotogramas de posición) en la secuencia; el traslado entre dos marcas dura lo mismo
  // (≈ speed·0,85 s) sea cual sea el nº de fotogramas intermedios, con aceleración y frenado suaves; pausa en cada marca.
  buildTimeline() {
    const L = this.seq.length;
    const marks = []; this.seq.forEach((f, k) => { if (this.isPosFrame(f)) marks.push(k); });
    if (!marks.length) marks.push(0);
    this.holdMs = this.speed * 1000 * 0.45;
    const legMs = this.speed * 1000 * 0.85;
    this.dur = new Array(L).fill(legMs); this.hold = new Array(L).fill(0);
    this.legOf = new Array(L); // por paso: {kp, kn, c0, c1} (fracción acumulada de la etapa)
    marks.forEach((m, i) => {
      const nxt = marks[(i + 1) % marks.length];
      const len = ((nxt - m + L - 1) % L) + 1; // pasos de la etapa
      this.hold[m] = this.holdMs;
      for (let s = 0; s < len; s++) {
        const k = (m + s) % L;
        const c0 = ease(s / len), c1 = ease((s + 1) / len);
        this.dur[k] = Math.max(60, legMs * (c1 - c0));
        this.legOf[k] = { kp: m, kn: nxt, c0, c1 };
      }
    });
  }
  // posición hacia la que se mueve (o en la que está detenida)
  headingFrom(k, t) {
    const a = this.seq[k];
    if (t === 0 && this.P.includes(a)) return this.P.indexOf(a);
    for (let j = 1; j <= this.seq.length; j++) { const f = this.seq[(k + j) % this.seq.length]; if (this.P.includes(f)) return this.P.indexOf(f); }
    return 0;
  }
  // a: fotograma de abajo (opaco); b: fotograma que aparece encima con opacidad t
  show(a, b, t) {
    this.imgs.forEach((im, i) => {
      const o = i === a ? 1 : i === b ? t : 0;
      if (im._o !== o) { im.style.opacity = o; im._o = o; }
      const z = i === b ? 2 : i === a ? 1 : 0;
      if (im._z !== z) { im.style.zIndex = z; im._z = z; }
    });
  }
  // flechas de la etapa del paso k: ¿hay transición entre las posiciones de sus marcas?
  arrowsFor(k) {
    const d = this.arrowsData; if (!d) return null;
    const lg = this.legOf[k]; if (!lg) return null;
    const pa = this.P.indexOf(this.seq[lg.kp]), pb = this.P.indexOf(this.seq[lg.kn]);
    if (pa < 0 || pb < 0 || pa === pb) return null;
    const n = this.P.length;
    let t = -1, rev = false;
    if (pb === pa + 1) t = pa;
    else if (this.loopMode && pa === n - 1 && pb === 0) t = n - 1;
    else if (pb === pa - 1) { t = pb; rev = true; }
    const list = d[t];
    return list && list.length ? { list, rev, key: `${t}${rev ? 'r' : 'f'}` } : null;
  }
  // con prefers-reduced-motion: flecha estática hacia la posición a la que va
  staticArrow(posIdx) {
    const d = this.arrowsData; const t = posIdx > 0 ? posIdx - 1 : 0;
    this.layer.set(d && d[t], posIdx === 0 && d && d.length > 1 ? true : false, 'S' + posIdx); this.layer.update(null);
  }
  tick(ts) {
    if (this.dead) return;
    this.loop = requestAnimationFrame(t2 => this.tick(t2));
    if (!this.last) this.last = ts;
    const dt = Math.min(ts - this.last, 250); this.last = ts;
    if (this.isPaused() || !this.isReady) return;
    this.phase += dt;
    const L = this.seq.length;
    while (this.phase >= this.hold[this.k] + this.dur[this.k]) { this.phase -= this.hold[this.k] + this.dur[this.k]; this.k = (this.k + 1) % L; }
    this.draw(ts);
  }
  // pinta el estado (k, phase); ts = null fuerza el repintado
  draw(ts) {
    const L = this.seq.length;
    const a = this.seq[this.k], b = this.seq[(this.k + 1) % L], h = this.hold[this.k];
    const t = this.phase < h ? 0 : (this.phase - h) / this.dur[this.k];
    if (ts != null && ts - this.lastDraw < 33 && t > 0 && t < 1) return; // ~30 fps
    this.lastDraw = ts || 0;
    // fundido corto en el centro del paso: la figura nueva sube sobre la anterior (que sigue opaca) y no hay "doble exposición" larga
    this.show(a, b, ease(clamp01((t - 0.12) / 0.55)));
    this.setPos(this.headingFrom(this.k, t));
    if (this.layer && !this.reduced) {
      const lg = this.legOf[this.k];
      const ar = lg && this.arrowsFor(this.k);
      if (!ar) this.layer.set(null, false, 'none');
      else {
        this.layer.set(ar.list, ar.rev, ar.key);
        // progreso del traslado entre posiciones; durante la pausa de una marca, 0 (la flecha está oculta)
        this.layer.update(this.phase < h ? 0 : lg.c0 + (lg.c1 - lg.c0) * t);
      }
    }
  }
  // (revisión) salta a un instante del ciclo (ms) y lo pinta; lo usa docs/dev/anim.html
  seek(ms) {
    const L = this.seq.length;
    const tot = this.cycleMs();
    ms = ((ms % tot) + tot) % tot; this.k = 0;
    while (ms >= this.hold[this.k] + this.dur[this.k]) { ms -= this.hold[this.k] + this.dur[this.k]; this.k++; }
    this.phase = ms; this.draw(null);
  }
  cycleMs() { let t = 0; for (let k = 0; k < this.seq.length; k++) t += this.hold[k] + this.dur[k]; return t; }
  destroy() { this.dead = true; cancelAnimationFrame(this.loop); if (this.layer) this.layer.destroy(); this.el.remove(); }
}
