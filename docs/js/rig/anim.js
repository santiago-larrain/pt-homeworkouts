// Animación en vivo del modelo: normaliza las poses clave a ángulos, las interpola con suavizado
// y redibuja el SVG ~30 veces por segundo. Un mismo esqueleto para todos los movimientos y modelos.
import { renderPose, solve, setModel, LEN } from './rig.js';
import { RIG } from './poses.js';

const ANG = new Set(['a', 'th', 'sh', 'ft', 'ua', 'fa']);
const lerpAngle = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
export const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * t);

function copy(o) { if (Array.isArray(o)) return o.map(copy); if (o && typeof o === 'object') { const r = {}; for (const k in o) r[k] = copy(o[k]); return r; } return o; }

// Convierte una pose (con objetivos IK, extremidades omitidas, etc.) a una forma explícita en ángulos.
function normalize(p) {
  if (p.custom) return p;
  const J = solve(p), q = copy(p), fr = J.view !== 'side';
  const armOf = (A, src, off) => ({ ...(src || {}), to: undefined, ua: ang(A.S, A.E), fa: ang(A.E, A.W), uaS: dist(A.S, A.E) / LEN.ua, faS: dist(A.E, A.W) / LEN.fa, ...(off != null ? { off } : {}) });
  if (fr) {
    q.a2 = armOf(J.armn, { ...(p.arm || {}), ...(p.a2 || {}) });
    q.a1 = armOf(J.armf, { ...(p.arm || {}), ...(p.a1 || {}) });
    q.l1 = { ...(p.leg || {}), ...(p.l1 || {}) }; q.l2 = { ...(p.leg || {}), ...(p.l2 || {}) };
  } else {
    q.arm = armOf(J.armn, p.arm);
    q.armF = armOf(J.armf, p.armF || p.arm, p.armF ? (p.armF.off ?? 0) : 1);
    q.leg = { th: 90, sh: 90, ft: 0, ...(p.leg || {}) };
    q.legF = p.legF ? { off: 0, ...q.leg, ...p.legF } : { ...q.leg, off: 1 };
  }
  q.torso = { a: -90, len: LEN.torso, bend: 0, ...(p.torso || {}) };
  q.head = { a: (p.head && p.head.a !== undefined) ? p.head.a : q.torso.a };
  q.shrug = p.shrug || [0, 0];
  q._H = J.H;
  return q;
}

function blend(p, q, t, key = '') {
  if (typeof p === 'number' && typeof q === 'number') return ANG.has(key) ? lerpAngle(p, q, t) : p + (q - p) * t;
  if (Array.isArray(p) && Array.isArray(q) && p.length === q.length && p.every(x => typeof x === 'number')) return p.map((x, i) => x + (q[i] - x) * t);
  if (p && q && typeof p === 'object' && typeof q === 'object' && !Array.isArray(p)) {
    const o = {};
    for (const k of new Set([...Object.keys(p), ...Object.keys(q)])) o[k] = !(k in p) ? q[k] : !(k in q) ? p[k] : blend(p[k], q[k], t, k);
    return o;
  }
  return t < 0.5 ? p : q;
}
function blendPose(p, q, t) {
  const o = blend(p, q, t);
  o.anchor = (p.anchor.ankle && q.anchor.ankle) ? { ankle: blend(p.anchor.ankle, q.anchor.ankle, t) } : { hip: blend(p._H, q._H, t) };
  for (const k of ['props', 'back', 'overlay', 'mus', 'order', 'floor', 'view']) o[k] = t < 0.5 ? p[k] : q[k];
  return o;
}

const cache = new Map();
export const morphs = id => RIG[id] && RIG[id].morph !== false;
function keysFor(id, model) {
  const k = `${id}|${model}`;
  if (!cache.has(k)) { setModel(model); cache.set(k, RIG[id].keys().map(normalize)); }
  return cache.get(k);
}
const strip = svg => svg.replace(/<g class="anns">[\s\S]*$/, '');

// Dibujo (contenido SVG) de un movimiento: entre la pose a y b con t ∈ [0,1].
export function frame(id, model, a, b = a, t = 0) {
  setModel(model);
  const keys = keysFor(id, model);
  const p = keys[a], q = keys[b];
  if (p.custom) return p.custom();
  const vs = new Set(RIG[id].via || []);
  const e = vs.has(a) ? 1 - Math.pow(1 - t, 2) : vs.has(b) ? t * t : ease(t); // sin frenar al pasar por una pose de paso
  const pose = (a === b || t <= 0) ? p : t >= 1 ? q : blendPose(p, q, e);
  return strip(renderPose(pose).svg);
}

// Encuadre común de todas las poses (medido una vez con el DOM)
const boxes = new Map();
let meter = null;
export function viewBox(id, model) {
  const k = `${id}|${model}`;
  if (boxes.has(k)) return boxes.get(k);
  if (!meter) { meter = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); meter.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:240px;height:170px'); document.body.appendChild(meter); }
  const n = keysFor(id, model).length, bb = [1e9, 1e9, -1e9, -1e9];
  let custom = false;
  for (let i = 0; i < n; i++) for (const t of (morphs(id) && i < n - 1 ? [0, 0.5] : [0])) {
    meter.innerHTML = frame(id, model, i, Math.min(i + 1, n - 1), t);
    custom = custom || !!meter.querySelector('#c2t');
    meter.querySelectorAll('.fig, .ovl circle').forEach(el => { const r = el.getBBox(); if (!r.width) return; bb[0] = Math.min(bb[0], r.x); bb[1] = Math.min(bb[1], r.y); bb[2] = Math.max(bb[2], r.x + r.width); bb[3] = Math.max(bb[3], r.y + r.height); });
  }
  meter.innerHTML = '';
  const pad = 8;
  if (!custom) bb[3] = Math.max(bb[3], 152 + 7);
  const vb = [bb[0] - pad, bb[1] - pad, bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad];
  boxes.set(k, vb);
  return vb;
}
const vbStr = vb => vb.map(x => x.toFixed(1)).join(' ');

// Imagen estática (para miniaturas): blob URL en caché
const stills = new Map();
export function stillURL(id, model, pos = 0) {
  const k = `${id}|${model}|${pos}`;
  if (!stills.has(k)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbStr(viewBox(id, model))}" width="300" height="240" preserveAspectRatio="xMidYMid meet"><rect x="-500" y="-500" width="1500" height="1500" fill="#fff"/>${frame(id, model, keyOfPos(id, pos))}</svg>`;
    stills.set(k, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
  }
  return stills.get(k);
}

// Animador en vivo dentro de un contenedor
// índice de pose clave → índice de posición (las poses `via` heredan la siguiente posición)
export function posMap(id) {
  const via = new Set(RIG[id].via || []), n = RIG[id].keys().length, out = [];
  let p = 0; for (let i = 0; i < n; i++) { out.push(p); if (!via.has(i)) p++; }
  return out;
}
export const keyOfPos = (id, pos) => { const m = posMap(id), via = new Set(RIG[id].via || []); return m.findIndex((x, i) => x === pos && !via.has(i)); };

export class Animator {
  constructor(box, id, model, { fixed = null, play = true, speed = 1.6, isPaused = () => false, onPos = () => {} } = {}) {
    Object.assign(this, { box, id, model, speed, isPaused, onPos });
    this.via = new Set(RIG[id].via || []); this.pmap = posMap(id);
    if (fixed != null) fixed = keyOfPos(id, fixed);
    this.fixed = fixed; this.play = play;
    this.n = keysFor(id, model).length;
    this.morph = morphs(id);
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', vbStr(viewBox(id, model)));
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('class', 'rigsvg');
    box.prepend(this.svg);
    // secuencia de ida y vuelta entre poses clave
    this.seq = [...Array(this.n).keys()]; if (this.n > 2) this.seq = this.seq.concat(this.seq.slice(1, -1).reverse());
    this.k = 0; this.phase = 0; this.last = 0; this.lastDraw = 0; this.pos = -1;
    if (fixed != null || !play) this.draw(fixed ?? 0, fixed ?? 0, 0);
    else this.loop = requestAnimationFrame(ts => this.tick(ts));
  }
  holdOf(a) { return this.via.has(a) ? 0 : this.speed * 1000 * 0.38; }
  moveOf(a, b) { return this.speed * 1000 * 0.72 * (this.via.has(a) || this.via.has(b) ? 0.55 : 1); }
  draw(a, b, t) {
    const target = this.pmap[t > 0 ? b : a];
    if (target !== this.pos) { this.pos = target; this.onPos(target); }
    if (!this.morph) {
      // vistas distintas: fundido entre dos dibujos fijos
      if (!this.layers) { this.svg.innerHTML = `<g class="lay on">${frame(this.id, this.model, 0)}</g><g class="lay">${frame(this.id, this.model, 1)}</g>`; this.layers = [...this.svg.querySelectorAll('.lay')]; }
      this.layers.forEach((g, i) => g.classList.toggle('on', i === target));
      return;
    }
    this.svg.innerHTML = frame(this.id, this.model, a, b, t);
  }
  tick(ts) {
    if (this.dead) return;
    this.loop = requestAnimationFrame(t2 => this.tick(t2));
    if (!this.last) this.last = ts;
    const dt = ts - this.last; this.last = ts;
    if (this.isPaused()) return;
    this.phase += dt;
    let a = this.seq[this.k], b = this.seq[(this.k + 1) % this.seq.length];
    while (this.phase >= this.holdOf(a) + this.moveOf(a, b)) { this.phase -= this.holdOf(a) + this.moveOf(a, b); this.k = (this.k + 1) % this.seq.length; a = this.seq[this.k]; b = this.seq[(this.k + 1) % this.seq.length]; }
    const h = this.holdOf(a), t = this.phase < h ? 0 : (this.phase - h) / this.moveOf(a, b);
    if (ts - this.lastDraw < 30 && t > 0 && t < 1) return; // ~30 fps
    this.lastDraw = ts;
    this.draw(a, b, t);
  }
  destroy() { this.dead = true; cancelAnimationFrame(this.loop); this.svg.remove(); }
}
