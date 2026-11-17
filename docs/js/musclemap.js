// Mapa muscular: cuerpo de frente y de espalda con cada músculo teñido según cuánto lo trabaja un plan.
// Sin dependencias del resto de la app: recibe el plan y el catálogo (`movesById`) por parámetro.
// Geometría y alias en docs/data/muscles.js · documentación en project/MUSCLEMAP.md.
import { MUSCLES, SILHOUETTE, WARP, DETAILS, canonicalMuscles, MUSCLE_BY_NAME } from '../data/muscles.js';

export { MUSCLES, canonicalMuscles };

// ───────────────────────────── Carga (plan → 0..1 por músculo) ─────────────────────────────
const W_FOCUS = 1, W_SUPPORT = 0.5;

// Segundos de trabajo de una dosis, contando los dos lados. Repeticiones: máx. × secsPerRep (como el modo «Con tiempo» del motor).
function doseSecs(d, st) {
  if (!d) return 30;
  const spr = (st && st.secsPerRep) || 3;
  if (d.type === 'time') return d.secs * (d.perSide ? 2 : 1);
  if (d.type === 'reps') return d.max * spr * (d.perSide ? 2 : 1);
  if (d.type === 'phases') return d.phases.reduce((a, p) => a + p.secs * (p.perSide ? 2 : 1), 0);
  return 30;
}

// Suma un movimiento al acumulador `acc` con `secs` de trabajo. foco = 1, apoyo = 0,5 (si está en ambos, vale el mayor).
function addMove(acc, move, secs) {
  if (!move || !(secs > 0)) return;
  const w = {};
  (move.support || []).forEach(n => canonicalMuscles(n).forEach(c => { w[c] = Math.max(w[c] || 0, W_SUPPORT); }));
  (move.focus || []).forEach(n => canonicalMuscles(n).forEach(c => { w[c] = Math.max(w[c] || 0, W_FOCUS); }));
  Object.keys(w).forEach(c => { acc[c] = (acc[c] || 0) + w[c] * secs; });
}

// Normaliza al máximo (0..1). Solo devuelve los músculos con carga.
function normalise(acc) {
  const max = Math.max(0, ...Object.values(acc));
  const out = {};
  if (max > 0) Object.keys(acc).forEach(k => { if (acc[k] > 0) out[k] = acc[k] / max; });
  return out;
}

// Plan → { 'Glúteo mayor': 1, 'Cuádriceps': 0.62, … }.
// settings: { secsPerRep, person } — `person` solo en planes en pareja: 0 (por defecto) | 1 | 'both'.
export function muscleLoad(plan, movesById, settings = {}) {
  const acc = {}, byId = movesById || {};
  const duo = plan && plan.mode === 'duo', who = settings.person == null ? 0 : settings.person;
  ((plan && plan.sections) || []).forEach(sec => {
    const rounds = sec.kind === 'circuit' ? Math.max(1, sec.rounds || 1) : 1;
    (sec.items || []).forEach(item => {
      const parts = !duo || who === 0 ? [item] : who === 1 ? [item.b] : [item, item.b];
      parts.forEach(p => {
        if (!p) return;
        const move = byId[p.move];
        if (!move) return;
        addMove(acc, move, doseSecs(p.dose || move.dose, settings) * rounds);
      });
    });
  });
  return normalise(acc);
}

// Lista de movimientos (para uno solo o para agregar historial) → carga 0..1.
// Cada elemento: un movimiento `{focus, support, dose}` o `{ move, secs?, weight? }` (id si se pasa `movesById`).
// `secs` por defecto = estimación de la dosis del movimiento; `weight` multiplica (p. ej. nº de sesiones).
export function muscleLoadFromMoves(list, movesById, settings = {}) {
  const acc = {};
  (list || []).forEach(e => {
    if (!e) return;
    const entry = e.move !== undefined || e.secs !== undefined || e.weight !== undefined ? e : { move: e };
    const move = typeof entry.move === 'string' ? (movesById || {})[entry.move] : entry.move;
    if (!move) return;
    addMove(acc, move, (entry.secs != null ? entry.secs : doseSecs(move.dose, settings)) * (entry.weight == null ? 1 : entry.weight));
  });
  return normalise(acc);
}

// Los n músculos más trabajados: [{ name, value }].
export function topMuscles(load, n = 3) {
  return Object.entries(load || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, n).map(([name, value]) => ({ name, value }));
}

// ───────────────────────────── Color ─────────────────────────────
export const LEVELS = 16;
const RAMP = {
  // claro: del ámbar pálido al rojo anaranjado profundo (la luminosidad baja con la carga)
  light: [[0, '#FFDA85'], [0.3, '#FFC25E'], [0.55, '#FF8F34'], [0.78, '#E8541D'], [1, '#A81F12']],
  // oscuro (v1.7): de un marrón rosado apagado, casi del color del cuerpo, a un naranja vivo: más carga = más saturado y más brillante
  dark: [[0, '#5A3A36'], [0.3, '#8F4A30'], [0.6, '#D55A22'], [0.85, '#F36A1E'], [1, '#FF7A1A']],
};
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function sample(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0] || i === stops.length - 1) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      const a = hex2rgb(c0), b = hex2rgb(c1);
      return rgb2hex(a.map((v, j) => v + (b[j] - v) * k));
    }
  }
  return stops[0][1];
}
// Nivel discreto 0..LEVELS (0 = sin trabajo; cualquier carga > 0 llega al menos al nivel 1).
// Curva suave (v^0,8) para que las cargas medias se distingan del neutro; el % mostrado siempre es el valor real.
export const levelOf = v => (!(v > 0) ? 0 : Math.min(LEVELS, Math.max(1, Math.round(Math.pow(Math.min(1, v), 0.8) * LEVELS))));
// Color hex del mapa para un valor 0..1 (para gráficos que quieran coincidir con él).
export const heatColor = (v, dark = false) => { const l = levelOf(v); return l ? sample(RAMP[dark ? 'dark' : 'light'], (l - 1) / (LEVELS - 1)) : (dark ? '#3A3036' : '#E3DBDF'); };

const varsFor = mode => Array.from({ length: LEVELS }, (_, i) => `--mm-c${i + 1}:${sample(RAMP[mode], i / (LEVELS - 1))};`).join('');
// Variables del modo oscuro como estilo en línea (para pantallas siempre oscuras, p. ej. el reproductor)
export const mmDarkVars = `--mm-shade:rgba(0,0,0,.34);--mm-c0:#3A3036;--mm-body:#241B21;--mm-outline:#6E5E67;--mm-line:#241B21;--mm-chip:rgba(255,255,255,.1);--mm-ink:#F5EDF0;--mm-ink2:#C4B0B8;${varsFor('dark')}`;
const gradStops = Array.from({ length: LEVELS + 1 }, (_, i) => `var(--mm-c${i || 'x'})`).join(',').replace('var(--mm-cx)', 'var(--mm-c0)');

// Tokens `--mm-*` con respaldo: se pueden sobrescribir desde cualquier ancestro (el tema de la app los hereda de :root).
export const MM_CSS = `
:root{--mm-shade:rgba(70,30,50,.2);--mm-c0:#E3DBDF;--mm-body:#F3EEF0;--mm-outline:#BCB0B6;--mm-line:#F3EEF0;--mm-ink:#2A1D23;--mm-ink2:#6B5A62;--mm-sel:#E0457B;--mm-chip:rgba(0,0,0,.05);${varsFor('light')}}
@supports (color:color-mix(in srgb,red,blue)){:root{--mm-c0:color-mix(in srgb,var(--accent,#E0457B) 7%,#E3DBDF);--mm-body:color-mix(in srgb,var(--accent,#E0457B) 3%,#F4EFF1);--mm-line:var(--mm-body)}}
:root{--mm-ink:var(--label,#2A1D23);--mm-ink2:var(--label2,#6B5A62);--mm-sel:var(--accent-ink,#C42E64)}
:root[data-mode="dark"]{--mm-shade:rgba(0,0,0,.34);--mm-c0:#3A3036;--mm-body:#241B21;--mm-outline:#6E5E67;--mm-line:#241B21;--mm-chip:rgba(255,255,255,.08);${varsFor('dark')}}
@supports (color:color-mix(in srgb,red,blue)){:root[data-mode="dark"]{--mm-c0:color-mix(in srgb,var(--accent,#FF6E9C) 8%,#372E34);--mm-body:color-mix(in srgb,var(--accent,#FF6E9C) 4%,#241B21);--mm-line:var(--mm-body)}}
@media (prefers-color-scheme:dark){:root:not([data-mode="light"]):not([data-mode="dark"]){--mm-shade:rgba(0,0,0,.34);--mm-c0:#3A3036;--mm-body:#241B21;--mm-outline:#6E5E67;--mm-line:#241B21;--mm-chip:rgba(255,255,255,.08);${varsFor('dark')}}}
.mm-wrap{position:relative;-webkit-tap-highlight-color:transparent}
.mm-svg{display:block;margin:0 auto;max-width:100%;height:auto;overflow:visible}
.mm-sil-o{fill:var(--mm-outline);stroke:var(--mm-outline);stroke-width:2.6;stroke-linejoin:round}
.mm-sil{fill:var(--mm-body)}
.mm-r path{stroke:var(--mm-line);stroke-width:.9;stroke-linejoin:round;transition:fill .22s}
.mm-r{cursor:pointer;outline:none}
.mm-r.mm-sel path{stroke:var(--mm-sel);stroke-width:1.5}
.mm-l0 path{fill:var(--mm-c0)}${Array.from({ length: LEVELS }, (_, i) => `.mm-l${i + 1} path{fill:var(--mm-c${i + 1})}`).join('')}
.mm-shade{pointer-events:none}.mm-sh0{stop-color:var(--mm-shade)}.mm-sh1{stop-color:var(--mm-shade);stop-opacity:0}
.mm-detail{fill:none;stroke:var(--mm-outline);stroke-width:.7;stroke-linecap:round;opacity:.7}
.mm-title{font:600 9px/1 -apple-system,system-ui,sans-serif;fill:var(--mm-ink2);text-anchor:middle;letter-spacing:.04em;text-transform:uppercase}
.mm-lab{font:600 3.6px/1 -apple-system,system-ui,sans-serif;fill:#111;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:rgba(255,255,255,.75);stroke-width:.9px}
.mm-tip{position:absolute;z-index:3;transform:translate(-50%,-100%);margin-top:-10px;padding:6px 10px;border-radius:10px;background:var(--mm-ink,#2A1D23);color:var(--card,#fff);font:600 13px/1.25 -apple-system,system-ui,sans-serif;white-space:nowrap;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.mm-tip span{display:block;font-weight:500;font-size:12px;opacity:.8}
.mm-tip[hidden]{display:none}
.mm-legend{margin-top:12px;font:500 13px/1.3 -apple-system,system-ui,sans-serif;color:var(--mm-ink2)}
.mm-bar{display:flex;align-items:center;gap:8px}
.mm-grad{flex:1;height:10px;border-radius:99px;background:linear-gradient(90deg,${gradStops});box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.mm-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.mm-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px 5px 8px;border-radius:99px;background:var(--mm-chip);color:var(--mm-ink);font-weight:600;min-height:28px}
.mm-chip i{width:10px;height:10px;border-radius:50%;flex:none}
.mm-chip b{font-weight:500;color:var(--mm-ink2);font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.mm-r path{transition:none}}
`;

let injected = false;
export function injectMuscleMapCSS() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mm', '');
  s.textContent = MM_CSS;
  document.head.appendChild(s);
}

// ───────────────────────────── Geometría ─────────────────────────────
const parse = str => str.trim().split(/\s+/).map(t => {
  const c = t.endsWith('!'), [x, y] = (c ? t.slice(0, -1) : t).split(',').map(Number);
  return { x, y, c };
});

const warpFn = g => {
  const T = WARP[g] || WARP.f;
  return y => {
    if (y <= T[0][0]) return T[0][1];
    for (let i = 1; i < T.length; i++) if (y <= T[i][0]) { const [y0, f0] = T[i - 1], [y1, f1] = T[i]; return f0 + (f1 - f0) * (y - y0) / (y1 - y0); }
    return T[T.length - 1][1];
  };
};

const r1 = n => Math.round(n * 10) / 10;

// Contorno cerrado suave (Catmull-Rom → Bézier); los puntos marcados con «!» son esquinas.
function smooth(pts) {
  const n = pts.length;
  if (n < 3) return '';
  const P = i => pts[(i + n) % n], k = 1 / 6;
  let d = `M${r1(pts[0].x)} ${r1(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const t1 = p1.c ? [0, 0] : [(p2.x - p0.x) * k, (p2.y - p0.y) * k];
    const t2 = p2.c ? [0, 0] : [(p3.x - p1.x) * k, (p3.y - p1.y) * k];
    d += `C${r1(p1.x + t1[0])} ${r1(p1.y + t1[1])} ${r1(p2.x - t2[0])} ${r1(p2.y - t2[1])} ${r1(p2.x)} ${r1(p2.y)}`;
  }
  return d + 'Z';
}

const geomCache = {};
// Geometría ya deformada para un género: { sil:{body,arm}, regions:{id:{d:[...], anchor:[x,y], area}} } por vista.
function geometry(gender) {
  if (geomCache[gender]) return geomCache[gender];
  const wx = warpFn(gender), W = pts => pts.map(p => ({ ...p, x: p.x * wx(p.y) }));
  const g = { sil: { body: smooth(W(parse(SILHOUETTE.body))), arm: smooth(W(parse(SILHOUETTE.arm))) }, front: [], back: [] };
  MUSCLES.forEach(m => ['front', 'back'].forEach(v => {
    if (!m[v]) return;
    const polys = m[v].map(s => W(parse(s)));
    // ancla de la etiqueta: centro del contorno más grande
    let best = null, bestA = -1;
    polys.forEach(p => {
      const xs = p.map(q => q.x), ys = p.map(q => q.y), a = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
      if (a > bestA) { bestA = a; best = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2]; }
    });
    g[v].push({ m, d: polys.map(smooth), anchor: best });
  }));
  g.det = { front: (DETAILS.front || []).map(s => smooth(W(parse(s.replace(/\s*z$/, '')))) ), back: (DETAILS.back || []).map(s => smooth(W(parse(s.replace(/\s*z$/, ''))))) };
  g.front.sort((a, b) => (a.m.z || 0) - (b.m.z || 0));
  g.back.sort((a, b) => (a.m.z || 0) - (b.m.z || 0));
  return (geomCache[gender] = g);
}

// Sombreado cilíndrico (oscurece los bordes de tronco y brazos). `objectBoundingBox`: cada mitad/brazo se sombrea por su ancho.
const SHADE_DEFS = '<linearGradient id="mmShB" x1="0" x2="1" y1="0" y2="0"><stop offset=".55" class="mm-sh1"/><stop offset="1" class="mm-sh0"/></linearGradient><linearGradient id="mmShA" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="mm-sh0"/><stop offset=".3" class="mm-sh1"/><stop offset=".7" class="mm-sh1"/><stop offset="1" class="mm-sh0"/></linearGradient>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const levelWord = v => (v <= 0 ? 'sin trabajo' : v < 0.34 ? 'ligero' : v < 0.67 ? 'medio' : 'alto');
const pct = v => `${Math.round(v * 100)} %`;

// ───────────────────────────── SVG ─────────────────────────────
// opts: gender 'f'|'m' · size (px de ancho; sin valor = 100 % del contenedor) · views 'both'|'front'|'back'
//       labels false | true (nombre) | 'num' (número) · titles (Frente/Espalda) · style (incluye el CSS) · selected (nombre)
export function muscleMapSVG(load = {}, opts = {}) {
  const { gender = 'f', size = null, views = 'both', labels = false, titles = true, style = true, selected = null } = opts;
  const g = geometry(gender === 'm' ? 'm' : 'f');
  const list = views === 'both' ? ['front', 'back'] : [views];
  const vbW = 200 * list.length, vbH = titles ? 432 : 420;
  const wAttr = size ? ` width="${size}" height="${Math.round(size * vbH / vbW)}"` : '';
  const top = topMuscles(load, 3).map(t => t.name);
  const label = top.length ? `Mapa muscular, ${list.length === 2 ? 'frente y espalda' : views === 'front' ? 'frente' : 'espalda'}. Más trabajados: ${top.join(', ')}.` : 'Mapa muscular sin carga.';
  const nums = {};
  MUSCLES.forEach((m, i) => { nums[m.id] = i + 1; });
  let out = `<svg class="mm-svg mm-root" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}"${wAttr} role="img" aria-label="${esc(label)}" data-gender="${gender}">${style ? `<style>${MM_CSS}</style>` : ''}<defs>${SHADE_DEFS}</defs>`;
  list.forEach((v, vi) => {
    const cx = 100 + vi * 200;
    const mir = body => `<path d="${body}"/><path d="${body}" transform="scale(-1 1)"/>`;
    const head = `<ellipse cx="0" cy="${SILHOUETTE.headFront.cy}" rx="${SILHOUETTE.headFront.rx}" ry="${SILHOUETTE.headFront.ry}"/>${v === 'front' ? '<ellipse cx="-17.6" cy="33" rx="2.6" ry="4.8"/><ellipse cx="17.6" cy="33" rx="2.6" ry="4.8"/>' : '<ellipse cx="-17.6" cy="33" rx="2.6" ry="4.8"/><ellipse cx="17.6" cy="33" rx="2.6" ry="4.8"/>'}<path d="M-8.6 50L-9.6 76L9.6 76L8.6 50Z"/>`;
    out += `<g transform="translate(${cx} 0)" data-view="${v}"><g class="mm-sil-o">${head}${mir(g.sil.body)}${mir(g.sil.arm)}</g><g class="mm-sil">${head}${mir(g.sil.body)}${mir(g.sil.arm)}</g>`;
    if (v === 'front') out += `<path class="mm-detail" d="M-1.6 170.5Q0 173.5 1.6 170.5"/>`; // ombligo
    g.det[v].forEach(d => { out += `<path class="mm-detail" d="${d}"/><path class="mm-detail" d="${d}" transform="scale(-1 1)"/>`; });
    g[v].forEach(({ m, d, anchor }) => {
      const val = load[m.name] || 0, lvl = levelOf(val);
      const paths = d.map(s => `<path d="${s}"/><path d="${s}" transform="scale(-1 1)"/>`).join('');
      out += `<g class="mm-r mm-l${lvl}${selected === m.name ? ' mm-sel' : ''}" data-m="${esc(m.name)}" data-v="${val.toFixed(3)}"><title>${esc(m.name)} · ${val > 0 ? pct(val) : 'sin trabajo'}</title>${paths}</g>`;
    });
    out += `<g class="mm-shade" aria-hidden="true"><g fill="url(#mmShB)"><path d="${g.sil.body}"/><path d="${g.sil.body}" transform="scale(-1 1)"/></g><g fill="url(#mmShA)"><path d="${g.sil.arm}"/><path d="${g.sil.arm}" transform="scale(-1 1)"/></g></g>`;
    if (labels) {
      g[v].forEach(({ m, anchor }) => {
        const t = labels === 'num' ? nums[m.id] : m.name;
        out += `<text class="mm-lab" x="${r1(anchor[0] < 3 ? 0 : anchor[0])}" y="${r1(anchor[1] + 1.2)}">${esc(t)}</text>`;
      });
    }
    if (titles) out += `<text class="mm-title" x="0" y="426">${v === 'front' ? 'Frente' : 'Espalda'}</text>`;
    out += '</g>';
  });
  return out + '</svg>';
}

// Índice de números usado por labels:'num' (para tablas de depuración).
export const muscleNumbers = () => MUSCLES.map((m, i) => ({ n: i + 1, name: m.name, id: m.id, group: m.group, views: ['front', 'back'].filter(v => m[v]) }));

// ───────────────────────────── Leyenda ─────────────────────────────
// Barra «menos ↔ más» + chips con los n músculos más trabajados.
export function muscleLegendHTML(load = {}, { n = 3, style = false } = {}) {
  const chips = topMuscles(load, n).map(t => `<span class="mm-chip"><i style="background:var(--mm-c${levelOf(t.value)})"></i>${esc(t.name)} <b>${pct(t.value)}</b></span>`).join('');
  return `${style ? `<style>${MM_CSS}</style>` : ''}<div class="mm-legend"><div class="mm-bar" aria-hidden="true"><span>menos</span><i class="mm-grad"></i><span>más</span></div>${chips ? `<div class="mm-chips">${chips}</div>` : '<div class="mm-chips">Sin músculos registrados.</div>'}</div>`;
}

// ───────────────────────────── Montaje con interacción ─────────────────────────────
// Dibuja el mapa en `el`. opts = los de muscleMapSVG + { legend:true, topN:3, onSelect(name, value), format(name, value) → {title, sub} }.
// Devuelve { update(load, opts?), select(name|null), destroy() }.
export function mountMuscleMap(el, load = {}, opts = {}) {
  injectMuscleMapCSS();
  let cur = load, o = { ...opts }, sel = null, tip = null, timer = 0;
  const fmt = o.format || ((name, v) => ({ title: name, sub: v > 0 ? `${pct(v)} · ${levelWord(v)}` : 'sin trabajo en este plan' }));

  const render = () => {
    el.innerHTML = `<div class="mm-wrap">${muscleMapSVG(cur, { ...o, style: false, selected: sel })}<div class="mm-tip" hidden></div></div>${o.legend === false ? '' : muscleLegendHTML(cur, { n: o.topN || 3 })}`;
    tip = el.querySelector('.mm-tip');
  };
  const hide = () => { sel = null; clearTimeout(timer); if (tip) tip.hidden = true; el.querySelectorAll('.mm-sel').forEach(x => x.classList.remove('mm-sel')); };
  const show = (name, clientX, clientY) => {
    const svg = el.querySelector('svg'), wrap = el.querySelector('.mm-wrap');
    el.querySelectorAll('.mm-sel').forEach(x => x.classList.remove('mm-sel'));
    el.querySelectorAll('[data-m]').forEach(x => { if (x.getAttribute('data-m') === name) x.classList.add('mm-sel'); });
    sel = name;
    const v = cur[name] || 0, t = fmt(name, v), wr = wrap.getBoundingClientRect();
    tip.innerHTML = `${esc(t.title)}<span>${esc(t.sub)}</span>`;
    tip.hidden = false;
    const half = tip.offsetWidth / 2 + 4;
    tip.style.left = `${Math.min(wr.width - half, Math.max(half, clientX - wr.left))}px`;
    tip.style.top = `${Math.max(tip.offsetHeight + 12, clientY - wr.top)}px`;
    clearTimeout(timer); timer = setTimeout(hide, 4000);
    if (o.onSelect) o.onSelect(name, v);
    void svg;
  };
  // Si el toque cae junto a una región (no encima), elige la más cercana (≤ 6 unidades del dibujo).
  const nearest = e => {
    const svg = el.querySelector('svg'), ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse()), views = svg.querySelectorAll('[data-view]');
    const vi = views.length === 2 && p.x >= 200 ? 1 : 0, v = views[vi].getAttribute('data-view'), cx = 100 + (views.length === 2 ? vi * 200 : 0);
    const gm = geometry(svg.getAttribute('data-gender') === 'm' ? 'm' : 'f'), dx = Math.abs(p.x - cx);
    let best = null, bd = 6;
    gm[v].forEach(({ m, anchor }) => { const d = Math.hypot(dx - anchor[0], p.y - anchor[1]); if (d < bd) { bd = d; best = m.name; } });
    return best;
  };
  const onClick = e => {
    const r = e.target.closest && e.target.closest('[data-m]');
    const name = r ? r.getAttribute('data-m') : (e.target.closest && e.target.closest('.mm-svg') ? nearest(e) : null);
    if (!name || name === sel) { hide(); return; }
    show(name, e.clientX, e.clientY);
  };
  const onDoc = e => { if (!el.contains(e.target)) hide(); };
  el.addEventListener('click', onClick);
  document.addEventListener('click', onDoc, true);
  render();
  return {
    update(next, more) { cur = next || {}; if (more) o = { ...o, ...more }; sel = null; render(); },
    select(name) { if (!name) return hide(); const r = el.querySelector(`[data-m="${CSS.escape(name)}"]`); if (r) { const b = r.getBoundingClientRect(); show(name, b.left + b.width / 2, b.top + b.height / 2); } },
    destroy() { el.removeEventListener('click', onClick); document.removeEventListener('click', onDoc, true); clearTimeout(timer); el.innerHTML = ''; },
  };
}

// Nombres canónicos que tienen región (útil para pruebas).
export const mappedMuscles = () => MUSCLES.map(m => m.name);
export const hasRegion = name => !!MUSCLE_BY_NAME[name];
