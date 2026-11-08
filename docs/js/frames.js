// Animación por fotogramas (v1.3): el mismo personaje dibujado en N poses alineadas (docs/data/anim.js).
// Se recorren con fundidos suaves entre fotogramas vecinos; en cada posición del movimiento hay una pausa breve.
import { ANIM } from '../data/anim.js';

export const hasFrames = id => !!ANIM[id];
export const frameURL = (id, model, k) => `img/anim/${model === 'm' ? 'm' : 'f'}/${id}-${k + 1}.webp`;
// fotograma (base 0) de cada posición del movimiento
export function posFrames(id, nPos) {
  const a = ANIM[id];
  if (a.pos) return a.pos;
  return nPos > 2 ? Array.from({ length: nPos }, (_, i) => Math.round(i * (a.n - 1) / (nPos - 1))) : [0, a.n - 1];
}
export const posFrame = (id, pos, nPos = 2) => posFrames(id, nPos)[pos] ?? 0;

const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * t);

export class FrameAnimator {
  // nPos: número de posiciones del movimiento; onPos(i): posición hacia la que va (para la respiración)
  constructor(box, id, model, { nPos = 2, fixed = null, play = true, speed = 1.6, isPaused = () => false, onPos = () => {} } = {}) {
    const A = ANIM[id];
    Object.assign(this, { box, id, n: A.n, speed, isPaused, onPos });
    this.P = posFrames(id, nPos);
    this.el = document.createElement('div');
    this.el.className = 'rigframes';
    this.el.innerHTML = Array.from({ length: A.n }, (_, k) => `<img src="${frameURL(id, model, k)}" alt="" decoding="async" draggable="false">`).join('');
    this.imgs = [...this.el.children];
    box.prepend(this.el);
    this.cur = -1; this.pos = -1;
    if (fixed != null || !play) { this.show(this.P[fixed ?? 0] ?? 0, null, 0); this.setPos(fixed ?? 0); return; }
    const up = [...Array(A.n).keys()];
    this.seq = A.loop ? up : up.concat(up.slice(1, -1).reverse()); // ciclo o ida y vuelta
    this.k = 0; this.phase = 0; this.last = 0; this.lastDraw = 0;
    // tiempo de traslado entre dos posiciones ≈ speed; pausa en cada posición
    const gaps = this.P.length > 1 ? Math.max(1, (A.n - 1) / (this.P.length - 1)) : A.n - 1;
    this.stepMs = speed * 1000 * 0.85 / gaps;
    this.holdMs = speed * 1000 * 0.45;
    this.show(this.seq[0], null, 0); this.setPos(this.headingFrom(0, 0));
    this.loop = requestAnimationFrame(ts => this.tick(ts));
  }
  setPos(i) { if (i !== this.pos && i >= 0) { this.pos = i; this.onPos(i); } }
  isPosFrame(f) { return this.P.includes(f) || (!ANIM[this.id].loop && (f === 0 || f === this.n - 1)); }
  holdOf(f) { return this.isPosFrame(f) ? this.holdMs : 0; }
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
  tick(ts) {
    if (this.dead) return;
    this.loop = requestAnimationFrame(t2 => this.tick(t2));
    if (!this.last) this.last = ts;
    const dt = Math.min(ts - this.last, 250); this.last = ts;
    if (this.isPaused()) return;
    this.phase += dt;
    const L = this.seq.length;
    let a = this.seq[this.k];
    while (this.phase >= this.holdOf(a) + this.stepMs) { this.phase -= this.holdOf(a) + this.stepMs; this.k = (this.k + 1) % L; a = this.seq[this.k]; }
    const b = this.seq[(this.k + 1) % L], h = this.holdOf(a);
    const t = this.phase < h ? 0 : (this.phase - h) / this.stepMs;
    if (ts - this.lastDraw < 33 && t > 0 && t < 1) return; // ~30 fps
    this.lastDraw = ts;
    // el fundido ocupa el centro del paso (menos tiempo con dos figuras superpuestas)
    this.show(a, b, ease(Math.min(1, Math.max(0, (t - 0.2) / 0.6))));
    this.setPos(this.headingFrom(this.k, t));
  }
  destroy() { this.dead = true; cancelAnimationFrame(this.loop); this.el.remove(); }
}
