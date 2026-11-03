// Rig v2: personaje cartoon (contorno, cel-shading) + músculos anatómicos con fibras.
const R = Math.PI / 180;
const D = a => [Math.cos(a * R), Math.sin(a * R)];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const mul = (v, k) => [v[0] * k, v[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = v => Math.hypot(v[0], v[1]);
const nrm = v => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const f = n => (Math.round(n * 100) / 100).toString();
const P = p => f(p[0]) + ' ' + f(p[1]);

const C = {
  skin: '#F3C49D', skinSh: '#E3A47C', skinHi: '#FBDCC2', skinLn: '#7A4430',
  skinF: '#E6B188', skinShF: '#D3946C',
  cloth: '#3C3F47', clothSh: '#2B2D33', clothHi: '#575B66', clothLn: '#16171B',
  clothF: '#33363D', clothShF: '#25272C',
  hair: '#5B3826', hairSh: '#3F2619', hairHi: '#B98250', hairHi2: '#D6A46C', hairLn: '#2A170F',
  lip: '#D9786C', lipLn: '#A9524A', eye: '#4B2D1D', blush: '#F09A86',
  mus: '#F26A1F', musLn: '#A9400D', musFib: '#C24E13', musHi: '#FF9B57',
  mus2: '#F6B23A', mus2Ln: '#B9800F', mus2Fib: '#D79623',
  pearl: '#FFFDF6',
  mat: '#D7CBF3', matLn: '#9F8BD6', floor: '#C6CCDC',
};

let UID = 0;
const uid = p => `${p}${++UID}`;

function cos01(a, b, t) { const k = (1 - Math.cos(t * Math.PI)) / 2; return a + (b - a) * k; }
function prof(knots, t) {
  if (t <= knots[0][0]) return knots[0][1];
  for (let i = 0; i < knots.length - 1; i++) {
    const [t0, v0] = knots[i], [t1, v1] = knots[i + 1];
    if (t >= t0 && t <= t1) return cos01(v0, v1, (t - t0) / (t1 - t0 || 1));
  }
  return knots[knots.length - 1][1];
}

// Catmull-Rom → Bezier (cerrado o abierto)
function smooth(pts, closed = true, k = 1) {
  const n = pts.length;
  if (n < 3) return 'M' + pts.map(P).join(' L') + (closed ? 'Z' : '');
  let d = 'M' + P(pts[0]);
  const g = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = add(p1, mul(sub(p2, p0), k / 6)), c2 = sub(p2, mul(sub(p3, p1), k / 6));
    d += ` C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return d + (closed ? 'Z' : '');
}

// ───────────── perfiles (medio ancho)
const PR = {
  side: {
    thighF: [[0, 8.2], [0.22, 8.6], [0.55, 7.1], [0.86, 5.3], [1, 5.1]],
    thighB: [[0, 9.2], [0.18, 8.0], [0.5, 7.0], [0.86, 5.0], [1, 4.9]],
    shinF: [[0, 4.9], [0.14, 4.3], [0.6, 3.3], [0.9, 2.6], [1, 2.5]],
    shinB: [[0, 4.9], [0.22, 6.1], [0.45, 5.0], [0.75, 3.0], [1, 2.6]],
    uaF: [[0, 4.7], [0.35, 3.9], [0.8, 3.1], [1, 3.0]],
    uaB: [[0, 5.0], [0.3, 4.4], [0.8, 3.2], [1, 3.0]],
    faF: [[0, 3.0], [0.3, 3.2], [1, 2.0]],
    faB: [[0, 3.0], [0.25, 3.5], [1, 2.1]],
    tF: [[0, 8.4], [0.12, 8.8], [0.36, 6.6], [0.58, 7.2], [0.72, 10.0], [0.86, 8.4], [1, 6.2]],
    tB: [[0, 10.2], [0.1, 9.6], [0.32, 6.3], [0.55, 7.0], [0.78, 8.2], [0.94, 7.0], [1, 6.2]],
  },
  front: {
    thighL: [[0, 8.8], [0.25, 7.9], [0.6, 6.5], [0.9, 5.0], [1, 4.8]],
    thighM: [[0, 6.6], [0.25, 6.8], [0.6, 5.7], [0.9, 4.6], [1, 4.6]],
    shinL: [[0, 4.8], [0.25, 5.4], [0.6, 3.8], [1, 2.6]],
    shinM: [[0, 4.6], [0.25, 5.2], [0.6, 3.6], [1, 2.6]],
    uaL: [[0, 4.5], [0.3, 4.0], [1, 3.0]],
    uaM: [[0, 3.4], [0.4, 3.3], [1, 2.8]],
    faL: [[0, 3.1], [0.3, 3.4], [1, 2.1]],
    faM: [[0, 3.0], [0.3, 3.2], [1, 2.0]],
    t: [[0, 12.0], [0.1, 11.8], [0.38, 8.6], [0.6, 9.4], [0.76, 10.6], [0.9, 11.4], [1, 9.6]],
  },
};

const LEN = { torso: 40, neck: 5, headR: 10.4, thigh: 37, shin: 36, ua: 25, fa: 22 };

// forma de segmento con perfil. Devuelve outline + mapa (t,u)
function limb(P0, P1, wF, wB, nOverride) {
  const v = sub(P1, P0), L = len(v), d = nrm(v);
  const n = nOverride || [d[1], -d[0]];
  const wf = t => prof(wF, t), wb = t => prof(wB, t);
  const map = (t, u) => add(add(P0, mul(v, t)), mul(n, u >= 0 ? u * wf(t) : u * wb(t)));
  const pts = [];
  const N = 16;
  for (let i = 0; i <= N; i++) pts.push(map(i / N, 1));
  // tapa distal
  const r1 = (wf(1) + wb(1)) / 2, c1 = add(P1, mul(n, (wf(1) - wb(1)) / 2));
  for (let i = 1; i < 6; i++) { const th = i / 6 * Math.PI; pts.push(add(c1, add(mul(n, r1 * Math.cos(th)), mul(d, r1 * Math.sin(th))))); }
  for (let i = N; i >= 0; i--) pts.push(map(i / N, -1));
  const r0 = (wf(0) + wb(0)) / 2, c0 = add(P0, mul(n, (wf(0) - wb(0)) / 2));
  for (let i = 1; i < 6; i++) { const th = i / 6 * Math.PI; pts.push(add(c0, add(mul(n, -r0 * Math.cos(th)), mul(d, -r0 * Math.sin(th))))); }
  return { d: smooth(pts), map, n, dir: d, P0, P1 };
}

function torsoShape(H, S0, bend, view) {
  const v = sub(S0, H), dd = nrm(v), n = [-dd[1], dd[0]];
  const mid = mul(add(H, S0), 0.5), Cc = add(mid, mul(n, 2 * bend));
  const pos = t => { const a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; return [a * H[0] + b * Cc[0] + c * S0[0], a * H[1] + b * Cc[1] + c * S0[1]]; };
  const nor = t => {
    const tx = 2 * (1 - t) * (Cc[0] - H[0]) + 2 * t * (S0[0] - Cc[0]);
    const ty = 2 * (1 - t) * (Cc[1] - H[1]) + 2 * t * (S0[1] - Cc[1]);
    const l = Math.hypot(tx, ty) || 1; return [-ty / l, tx / l];
  };
  const side = view === 'side';
  const wf = t => side ? prof(PR.side.tF, t) : prof(PR.front.t, t);
  const wb = t => side ? prof(PR.side.tB, t) : prof(PR.front.t, t);
  const map = (t, u) => add(pos(t), mul(nor(t), u >= 0 ? u * wf(t) : u * wb(t)));
  const pts = [];
  const N = 22;
  for (let i = 0; i <= N; i++) pts.push(map(i / N, 1));
  for (let i = N; i >= 0; i--) pts.push(map(i / N, -1));
  return { d: smooth(pts), map, pos, nor, dir: dd, n };
}

// región (t,u) de una forma → path suave
function region(map, t0, t1, u0, u1, N = 10) {
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push(map(t0 + (t1 - t0) * i / N, u1));
  for (let i = N; i >= 0; i--) pts.push(map(t0 + (t1 - t0) * i / N, u0));
  return 'M' + pts.map(P).join(' L') + 'Z';
}
function polyTU(map, tu) { return smooth(tu.map(([t, u]) => map(t, u))); }

// ───────────── MÚSCULOS (coordenadas t,u)
// side: u + = anterior, - = posterior. front/back: u + = derecha del espectador; M = signo medial
const MUS = {
  side: {
    thigh: {
      quads: { pts: [[0.1, 0.15], [0.2, 0.8], [0.45, 0.95], [0.78, 0.8], [0.95, 0.3], [0.88, -0.05], [0.55, -0.2], [0.25, -0.12]], fib: 'long' },
      rectus: { pts: [[0.0, 0.3], [0.1, 0.8], [0.45, 0.75], [0.85, 0.5], [0.93, 0.25], [0.5, 0.2], [0.12, 0.2]], fib: 'long' },
      hams: { pts: [[0.06, -0.3], [0.18, -0.9], [0.55, -0.95], [0.86, -0.7], [0.97, -0.35], [0.8, -0.2], [0.5, -0.35], [0.2, -0.25]], fib: 'long' },
      adductors: { pts: [[0.02, -0.3], [0.0, 0.35], [0.22, 0.3], [0.5, 0.05], [0.66, -0.15], [0.4, -0.35]], fib: 'diag' },
      abductors: { pts: [[0.0, -0.4], [0.0, 0.6], [0.35, 0.3], [0.85, 0.1], [0.85, -0.1], [0.35, -0.25]], fib: 'long' },
    },
    shin: {
      calf: { pts: [[0.04, -0.2], [0.14, -0.95], [0.36, -0.95], [0.58, -0.5], [0.66, -0.15], [0.4, -0.08], [0.15, -0.02]], fib: 'long' },
    },
    torso: {
      erectors: { pts: [[0.04, -0.95], [0.05, -0.55], [0.4, -0.5], [0.72, -0.55], [0.76, -0.9], [0.4, -0.97]], fib: 'long' },
      rhomboids: { pts: [[0.6, -0.98], [0.98, -0.98], [0.97, -0.35], [0.74, -0.4]], fib: 'diag' },
      lats: { pts: [[0.34, -0.95], [0.55, -0.98], [0.82, -0.6], [0.84, -0.2], [0.6, -0.35], [0.4, -0.6]], fib: 'diag' },
      infra: { pts: [[0.7, -0.96], [0.92, -0.96], [0.92, -0.5], [0.76, -0.45]], fib: 'fan', focus: [0.9, -0.3] },
      pec: { pts: [[0.66, 0.05], [0.7, 0.95], [0.9, 0.95], [0.97, 0.4], [0.92, 0.02]], fib: 'fan', focus: [0.95, 0.0] },
      abs: { pts: [[0.16, 0.55], [0.64, 0.55], [0.64, 0.97], [0.16, 0.97]], fib: 'abs' },
      transverse: { pts: [[0.1, -0.4], [0.1, 0.97], [0.56, 0.97], [0.56, -0.4]], fib: 'cross' },
      obliques: { pts: [[0.14, -0.3], [0.2, 0.55], [0.6, 0.55], [0.64, -0.3]], fib: 'diag' },
      psoas: { pts: [[0.0, 0.15], [0.02, 0.8], [0.3, 0.35], [0.3, 0.05]], fib: 'long', deep: true },
      gluteMed: { pts: [[0.08, -0.95], [0.3, -0.7], [0.33, -0.15], [0.14, 0.05], [0.04, -0.4]], fib: 'fan', focus: [0.02, -0.4] },
      piriformis: { pts: [[0.03, -0.92], [0.1, -0.96], [0.13, -0.3], [0.06, -0.25]], fib: 'long', deep: true },
      traps: { pts: [[0.82, -0.98], [1.0, -0.95], [1.0, -0.2], [0.9, -0.3]], fib: 'diag' },
    },
    ua: {
      delt: { pts: [[0.0, -1], [0.0, 1], [0.38, 0.6], [0.45, 0.0], [0.38, -0.6]], fib: 'long' },
      deltPost: { pts: [[0.0, -0.1], [0.0, -1], [0.36, -0.9], [0.44, -0.35]], fib: 'long' },
      deltAnt: { pts: [[0.0, 0.1], [0.0, 1], [0.36, 0.9], [0.44, 0.35]], fib: 'long' },
      triceps: { pts: [[0.22, -0.2], [0.28, -0.95], [0.7, -0.95], [0.95, -0.5], [0.9, -0.1]], fib: 'long' },
      biceps: { pts: [[0.3, 0.1], [0.35, 0.9], [0.75, 0.9], [0.92, 0.3]], fib: 'long' },
    },
  },
  front: {
    torso: {
      abs: { pts: [[0.16, -0.38], [0.64, -0.4], [0.64, 0.4], [0.16, 0.38]], fib: 'abs' },
      transverse: { pts: [[0.1, -0.92], [0.56, -0.86], [0.56, 0.86], [0.1, 0.92]], fib: 'cross' },
      pec: { sym: true, pts: [[0.66, 0.06], [0.68, 0.85], [0.9, 1.0], [0.95, 0.15]], fib: 'fan', focus: [0.95, 1.0] },
      obliques: { sym: true, pts: [[0.14, 0.45], [0.18, 0.95], [0.6, 0.9], [0.6, 0.45]], fib: 'diag' },
      traps: { sym: true, pts: [[0.93, 0.1], [1.0, 0.18], [1.0, 0.8], [0.95, 0.75]], fib: 'long' },
    },
    thigh: {
      quads: { pts: [[0.1, -0.7], [0.1, 0.7], [0.55, 0.85], [0.92, 0.5], [0.95, -0.5], [0.55, -0.85]], fib: 'long' },
      adductors: { med: true, pts: [[0.0, 0.25], [0.0, 1.0], [0.62, 0.95], [0.45, 0.4]], fib: 'diag' },
      abductors: { lat: true, pts: [[0.0, 0.3], [0.0, 1.0], [0.55, 0.95], [0.3, 0.5]], fib: 'long' },
    },
    ua: { delt: { pts: [[0, -1], [0, 1], [0.4, 0.5], [0.45, 0], [0.4, -0.5]], fib: 'long' } },
  },
  back: {
    torso: {
      gluteMax: { sym: true, pts: [[-0.02, 0.04], [-0.02, 0.98], [0.2, 0.95], [0.24, 0.4], [0.18, 0.05]], fib: 'diag' },
      gluteMed: { sym: true, pts: [[0.12, 0.32], [0.08, 1.0], [0.36, 0.98], [0.34, 0.45]], fib: 'fan', focus: [0.08, 0.85] },
      erectors: { sym: true, pts: [[0.08, 0.04], [0.08, 0.32], [0.72, 0.26], [0.72, 0.05]], fib: 'long' },
      rhomboids: { sym: true, pts: [[0.66, 0.04], [0.68, 0.48], [0.94, 0.42], [0.94, 0.04]], fib: 'diag' },
      infra: { sym: true, pts: [[0.7, 0.4], [0.68, 0.86], [0.88, 0.86], [0.9, 0.42]], fib: 'fan', focus: [0.9, 0.95] },
      lats: { sym: true, pts: [[0.3, 0.3], [0.4, 0.95], [0.76, 0.95], [0.66, 0.5]], fib: 'diag' },
      traps: { sym: true, pts: [[0.72, 0.02], [1.0, 0.1], [1.0, 0.8], [0.9, 0.55]], fib: 'diag' },
    },
    thigh: {
      hams: { pts: [[0.12, -0.6], [0.12, 0.6], [0.88, 0.45], [0.92, -0.45]], fib: 'long' },
      adductors: { med: true, pts: [[0.0, 0.25], [0.0, 1.0], [0.62, 0.95], [0.45, 0.4]], fib: 'diag' },
      gluteMaxLow: { pts: [[0.0, -0.95], [0.0, 0.95], [0.16, 0.8], [0.18, -0.8]], fib: 'diag' },
    },
    shin: { calf: { pts: [[0.05, -0.9], [0.05, 0.9], [0.5, 0.7], [0.6, 0], [0.5, -0.7]], fib: 'long' } },
    ua: {
      deltPost: { pts: [[0, -1], [0, 1], [0.4, 0.5], [0.45, 0], [0.4, -0.5]], fib: 'long' },
      triceps: { pts: [[0.25, -0.7], [0.25, 0.7], [0.9, 0.5], [0.9, -0.5]], fib: 'long' },
    },
  },
};

function fibers(map, def, mirror) {
  const ts = def.pts.map(p => p[0]), us = def.pts.map(p => p[1] * mirror);
  const t0 = Math.min(...ts), t1 = Math.max(...ts), u0 = Math.min(...us), u1 = Math.max(...us);
  const lines = [];
  const line = (a, b, N = 8) => { const pts = []; for (let i = 0; i <= N; i++) pts.push(map(a[0] + (b[0] - a[0]) * i / N, a[1] + (b[1] - a[1]) * i / N)); return smooth(pts, false); };
  if (def.fib === 'long') for (let k = 1; k < 6; k++) { const u = u0 + (u1 - u0) * k / 6; lines.push(line([t0 - 0.05, u], [t1 + 0.05, u])); }
  if (def.fib === 'cross') for (let k = 1; k < 7; k++) { const t = t0 + (t1 - t0) * k / 7; lines.push(line([t, u0 - 0.1], [t, u1 + 0.1])); }
  if (def.fib === 'diag') for (let k = -3; k < 8; k++) { const t = t0 + (t1 - t0) * k / 6; lines.push(line([t, u0 - 0.1], [t + (t1 - t0) * 0.6, u1 + 0.1])); }
  if (def.fib === 'fan') { const fc = [def.focus[0], def.focus[1] * mirror]; for (let k = 0; k <= 6; k++) { const a = [t0 + (t1 - t0) * (k / 6), (fc[1] > (u0 + u1) / 2) ? u0 : u1]; const b = [t0 + (t1 - t0) * 0.5, a[1]]; lines.push(line(fc, [t0 + (t1 - t0) * k / 6, fc[1] > (u0 + u1) / 2 ? u0 - 0.1 : u1 + 0.1])); } }
  if (def.fib === 'abs') {
    for (let k = 1; k < 4; k++) { const t = t0 + (t1 - t0) * k / 4; lines.push(line([t, u0 - 0.1], [t, u1 + 0.1])); }
    const um = (u0 + u1) / 2; lines.push(line([t0 - 0.05, um], [t1 + 0.05, um]));
  }
  return lines;
}

function drawMuscle(map, def, lvl, clip, mirror = 1) {
  const id = uid('m');
  const pts = def.pts.map(([t, u]) => [t, u * mirror]);
  const d = polyTU(map, pts);
  const c = lvl === 2 ? [C.mus2, C.mus2Ln, C.mus2Fib] : [C.mus, C.musLn, C.musFib];
  const fl = fibers(map, def, mirror).map(p => `<path d="${p}" fill="none" stroke="${c[2]}" stroke-width="0.55" stroke-linecap="round" opacity="0.85"/>`).join('');
  const hiPath = polyTU(map, pts.map(([t, u]) => [t, u]));
  return `<g clip-path="url(#${clip})"><clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="${c[0]}" opacity="${def.deep ? 0.78 : 0.95}"/>` +
    `<g clip-path="url(#${id})">${fl}</g>` +
    `<path d="${d}" fill="none" stroke="${c[1]}" stroke-width="0.7" ${def.deep ? 'stroke-dasharray="1.6 1.2"' : ''} stroke-linejoin="round"/></g>`;
}

// ───────────── SOLVER
function solve(p) {
  const view = p.view || 'side';
  const fr = view !== 'side';
  const T = Object.assign({ a: -90, len: LEN.torso, bend: 0 }, p.torso || {});
  const nl = Object.assign({ th: 90, sh: 90, ft: 0, shS: 1, thS: 1 }, p.leg || {});
  const J = { view, fr, T };
  let H;
  if (p.anchor.ankle) {
    const A = p.anchor.ankle;
    const K = sub(A, mul(D(nl.sh), LEN.shin * nl.shS));
    H = sub(K, mul(D(nl.th), LEN.thigh * nl.thS));
    if (fr) H = add(H, [0, 0]);
  } else H = p.anchor.hip;
  J.H = H;
  const S0 = add(H, mul(D(T.a), T.len));
  const tn = nrm([-(S0[1] - H[1]), S0[0] - H[0]]);
  J.S0 = S0; J.tn = tn;
  J.S = add(S0, p.shrug || [0, 0]);
  J.hairDown = !!p.hairDown;
  J.torso = torsoShape(H, S0, T.bend, view);
  const ha = (p.head && p.head.a !== undefined) ? p.head.a : T.a;
  J.up = D(ha);
  J.C = add(J.S, mul(J.up, LEN.neck + LEN.headR * 0.78));
  const legPts = (hip, l) => { const K = add(hip, mul(D(l.th), LEN.thigh * (l.thS || 1))); const A = add(K, mul(D(l.sh), LEN.shin * (l.shS || 1))); return { K, A }; };
  const legs = fr ? [['n', 'l2', add(H, mul(tn, 6.5)), -1], ['f', 'l1', sub(H, mul(tn, 6.5)), 1]] : [['n', 'leg', H, 0], ['f', 'legF', H, 0]];
  for (const [side, key, hp, med] of legs) {
    let l = fr ? Object.assign({}, nl, p[key] || {}) : (side === 'n' ? nl : Object.assign({}, nl, p.legF || {}));
    const hpp = (!fr && side === 'f' && !p.legF) ? add(hp, [-2.5, -0.5]) : hp;
    const k = legPts(hpp, l);
    J[side] = { hip: hpp, K: k.K, A: k.A, ft: l.ft, fl: l.fl || 1, med, toe: l.toe };
  }
  const base = Object.assign({ ua: 95, fa: 92, uaS: 1, faS: 1 }, p.arm || {});
  const arms = fr ? [['n', 'a2', add(J.S, mul(tn, 11)), -1], ['f', 'a1', sub(J.S, mul(tn, 11)), 1]] : [['n', 'arm', J.S, 0], ['f', 'armF', J.S, 0]];
  for (const [side, key, sp, med] of arms) {
    let a = fr ? Object.assign({}, base, p[key] || {}) : (side === 'n' ? base : Object.assign({}, base, p.armF || {}));
    const spp = (!fr && side === 'f' && !p.armF) ? add(sp, [-1.5, -0.5]) : sp;
    let E, W;
    if (a.to) {
      const tv = sub(a.to, spp), dd = Math.min(len(tv), (LEN.ua * a.uaS + LEN.fa * a.faS) * 0.995), l1 = LEN.ua * a.uaS, l2 = LEN.fa * a.faS;
      const base = Math.atan2(tv[1], tv[0]);
      const al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd))));
      E = add(spp, mul([Math.cos(base + (a.bend || 1) * al), Math.sin(base + (a.bend || 1) * al)], l1));
      W = add(E, mul(nrm(sub(a.to, E)), l2));
    } else {
      E = add(spp, mul(D(a.ua), LEN.ua * a.uaS));
      W = add(E, mul(D(a.fa), LEN.fa * a.faS));
    }
    J['arm' + side] = { S: spp, E, W, grip: a.grip, hand: a.hand, med, fa: a.fa };
  }
  return J;
}

// ───────────── DIBUJO
function shadeSide(n) { // luz desde arriba-izquierda
  const L = [0.45, 0.89];
  return dot(n, L) > 0 ? 1 : -1;
}

function paintLimb(sh, opts) {
  // opts: base, shade, line, clothT (t hasta donde llega la ropa), clothCol, muscles, far
  const cid = uid('c');
  let s = `<clipPath id="${cid}"><path d="${sh.d}"/></clipPath>`;
  s += `<path d="${sh.d}" fill="${opts.base}"/>`;
  s += `<g clip-path="url(#${cid})">`;
  if (opts.cloth) {
    const [ct0, ct1] = opts.cloth;
    s += `<path d="${region(sh.map, ct0 - 0.2, ct1, -1.6, 1.6)}" fill="${opts.clothCol}"/>`;
  }
  const sd = shadeSide(sh.n);
  // sombra cel
  if (opts.shadeSkin) s += `<path d="${region(sh.map, -0.3, 1.3, sd * 0.42, sd * 1.6)}" fill="${opts.shadeSkin}" opacity="0.9"/>`;
  if (opts.cloth) {
    const [ct0, ct1] = opts.cloth;
    s += `<path d="${region(sh.map, ct0 - 0.2, ct1, sd * 0.4, sd * 1.6)}" fill="${opts.clothSh}"/>`;
    s += `<path d="${region(sh.map, ct0 + 0.05, Math.min(ct1, 1) - 0.08, -sd * 0.52, -sd * 0.62)}" fill="${C.clothHi}" opacity="0.7"/>`;
    if (ct1 < 1) s += `<path d="${smooth([sh.map(ct1, -1.2), sh.map(ct1, 0), sh.map(ct1, 1.2)], false)}" stroke="${C.clothLn}" stroke-width="0.7" fill="none"/>`;
  }
  s += `</g>`;
  s += (opts.muscles || []).map(m => drawMuscle(sh.map, m.def, m.lvl, cid, m.mirror || 1)).join('');
  s += `<path d="${sh.d}" fill="none" stroke="${opts.line}" stroke-width="${opts.lw || 0.9}" stroke-linejoin="round"/>`;
  return s;
}

function musFor(J, seg, sideKey, list, mirrorFn) {
  const V = J.view === 'side' ? MUS.side : (J.view === 'front' ? MUS.front : MUS.back);
  const out = [];
  for (const m of list || []) {
    const defs = V[seg] || {};
    if (!defs[m.m]) continue;
    if (m.side && m.side !== 'both' && m.side !== sideKey) continue;
    const def = defs[m.m];
    out.push({ def, lvl: m.lvl || 1, mirror: mirrorFn ? mirrorFn(def) : 1 });
  }
  return out;
}

function drawFoot(J, L, far) {
  const skin = far ? C.skinF : C.skin;
  if (J.view === 'side') {
    const d = D(L.ft);
    let up = [-d[1], d[0]];
    if (dot(up, sub(L.K, L.A)) < 0) up = mul(up, -1);
    const sc = L.fl || 1;
    const loc = [[-3.6, 2.0], [-4.4, -1.0], [-3.0, -3.3], [2, -3.6], [9, -3.2], [12.6, -2.4], [14.2, -1.0], [13.4, 0.6], [9, 1.2], [4.5, 2.6], [1, 4.2], [-2.6, 4.0]];
    const pts = loc.map(([x, y]) => add(L.A, add(mul(d, x * sc), mul(up, y))));
    const toe = add(L.A, add(mul(d, 11.5 * sc), mul(up, -0.2)));
    const toe2 = add(L.A, add(mul(d, 12.8 * sc), mul(up, -2.4)));
    return `<path d="${smooth(pts)}" fill="${skin}" stroke="${C.skinLn}" stroke-width="0.85" stroke-linejoin="round"/>` +
      `<path d="M${P(toe)} Q${P(add(toe, mul(up, -1.2)))} ${P(toe2)}" fill="none" stroke="${C.skinLn}" stroke-width="0.5"/>`;
  }
  // frontal / trasera
  const A = L.A, dir = nrm(sub(A, L.K));
  const side = [-dir[1], dir[0]];
  if (J.view === 'front') {
    const pts = [add(A, mul(side, -3)), add(A, add(mul(side, -4.4), mul(dir, 4))), add(A, add(mul(side, -3.2), mul(dir, 6.6))), add(A, add(mul(side, 3.2), mul(dir, 6.6))), add(A, add(mul(side, 4.4), mul(dir, 4))), add(A, mul(side, 3))];
    return `<path d="${smooth(pts)}" fill="${skin}" stroke="${C.skinLn}" stroke-width="0.85"/>`;
  }
  const pts = [add(A, mul(side, -3)), add(A, add(mul(side, -3.4), mul(dir, 4.2))), add(A, mul(dir, 6.2)), add(A, add(mul(side, 3.4), mul(dir, 4.2))), add(A, mul(side, 3))];
  return `<path d="${smooth(pts)}" fill="${skin}" stroke="${C.skinLn}" stroke-width="0.85"/>`;
}

function drawLeg(J, side, mus) {
  const L = J[side], far = side === 'f', v = J.view;
  let tF, tB, sF, sB;
  if (v === 'side') { tF = PR.side.thighF; tB = PR.side.thighB; sF = PR.side.shinF; sB = PR.side.shinB; }
  else {
    // u + = derecha del espectador; medial = L.med
    const pos = L.med > 0 ? 'M' : 'L', neg = L.med > 0 ? 'L' : 'M';
    tF = PR.front['thigh' + pos]; tB = PR.front['thigh' + neg]; sF = PR.front['shin' + pos]; sB = PR.front['shin' + neg];
  }
  const nOv = v === 'side' ? null : null;
  const th = limb(L.hip, L.K, tF, tB), sh = limb(L.K, L.A, sF, sB);
  if (v !== 'side') { // en vista frontal la normal de la extremidad debe ser "derecha del espectador"
    const fix = s => { if (s.n[0] < 0 || (Math.abs(s.n[0]) < 0.01 && s.n[1] > 0)) { /* invertir u */ } };
  }
  const mirrorFn = def => (def.med ? L.med : def.lat ? -L.med : 1) * (v !== 'side' && th.n[0] < 0 ? -1 : 1);
  const legg = far ? C.clothF : C.cloth, leggSh = far ? C.clothShF : C.clothSh;
  let s = drawFoot(J, L, far);
  const segOpts = (cloth) => ({ base: far ? C.skinF : C.skin, shadeSkin: far ? C.skinShF : C.skinSh, line: C.clothLn, cloth, clothCol: legg, clothSh: leggSh });
  s += paintLimb(sh, Object.assign(segOpts([0, 0.84]), { muscles: musFor(J, 'shin', side, mus, mirrorFn) }));
  s += paintLimb(th, Object.assign(segOpts([0, 1.2]), { muscles: musFor(J, 'thigh', side, mus, mirrorFn) }));
  return s;
}

function drawHand(J, A, far) {
  const skin = far ? C.skinF : C.skin;
  const d = nrm(sub(A.W, A.E));
  if (A.grip) return `<circle cx="${f(A.W[0] + d[0] * 2)}" cy="${f(A.W[1] + d[1] * 2)}" r="3.4" fill="${skin}" stroke="${C.skinLn}" stroke-width="0.85"/>`;
  const n = [-d[1], d[0]];
  const pts = [add(A.W, mul(n, 2.6)), add(A.W, add(mul(d, 5), mul(n, 2.8))), add(A.W, add(mul(d, 8.4), mul(n, 1.2))), add(A.W, add(mul(d, 8.6), mul(n, -1.2))), add(A.W, add(mul(d, 5.2), mul(n, -2.6))), add(A.W, mul(n, -2.4))];
  return `<path d="${smooth(pts)}" fill="${skin}" stroke="${C.skinLn}" stroke-width="0.85"/>`;
}

function drawArm(J, side, mus) {
  const A = J['arm' + side], far = side === 'f', v = J.view;
  let uF, uB, fF, fB;
  if (v === 'side') { uF = PR.side.uaF; uB = PR.side.uaB; fF = PR.side.faF; fB = PR.side.faB; }
  else { const pos = A.med > 0 ? 'M' : 'L', neg = A.med > 0 ? 'L' : 'M'; uF = PR.front['ua' + pos]; uB = PR.front['ua' + neg]; fF = PR.front['fa' + pos]; fB = PR.front['fa' + neg]; }
  const ua = limb(A.S, A.E, uF, uB), fa = limb(A.E, A.W, fF, fB);
  const o = { base: far ? C.skinF : C.skin, shadeSkin: far ? C.skinShF : C.skinSh, line: C.skinLn };
  const mirrorFn = def => 1;
  let s = '';
  s += paintLimb(fa, Object.assign({}, o, { muscles: [] }));
  s += drawHand(J, A, far);
  s += paintLimb(ua, Object.assign({}, o, { muscles: musFor(J, 'ua', side, mus, mirrorFn) }));
  return s;
}

function drawTorso(J, mus) {
  const T = J.torso, v = J.view;
  const cid = uid('c');
  let s = `<clipPath id="${cid}"><path d="${T.d}"/></clipPath>`;
  s += `<path d="${T.d}" fill="${C.skin}"/>`;
  s += `<g clip-path="url(#${cid})">`;
  const sd = shadeSide(T.n);
  if (v === 'side') {
    s += `<path d="${region(T.map, -0.1, 1.1, sd * 0.45, sd * 1.5)}" fill="${C.skinSh}"/>`;
    // leggings tiro alto
    s += `<path d="${region(T.map, -0.2, 0.27, -1.5, 1.5)}" fill="${C.cloth}"/>`;
    s += `<path d="${region(T.map, -0.2, 0.27, sd * 0.45, sd * 1.5)}" fill="${C.clothSh}"/>`;
    s += `<path d="${region(T.map, 0.22, 0.27, -1.5, 1.5)}" fill="${C.clothHi}" opacity="0.6"/>`;
    // top deportivo
    s += `<path d="${region(T.map, 0.6, 0.9, -1.5, 1.5)}" fill="${C.cloth}"/>`;
    s += `<path d="${region(T.map, 0.6, 0.66, -1.5, 1.5)}" fill="${C.clothSh}"/>`;
    s += `<path d="${region(T.map, 0.9, 1.05, -0.45, 0.1)}" fill="${C.cloth}"/>`;
    s += `<path d="${region(T.map, 0.68, 0.88, sd * 0.4, sd * 1.5)}" fill="${C.clothSh}" opacity="0.8"/>`;
  } else {
    s += `<path d="${region(T.map, -0.1, 1.1, 0.62, 1.5)}" fill="${C.skinSh}"/>`;
    s += `<path d="${region(T.map, -0.2, 0.27, -1.5, 1.5)}" fill="${C.cloth}"/>`;
    s += `<path d="${region(T.map, -0.2, 0.27, 0.62, 1.5)}" fill="${C.clothSh}"/>`;
    s += `<path d="${region(T.map, 0.22, 0.27, -1.5, 1.5)}" fill="${C.clothHi}" opacity="0.55"/>`;
    if (v === 'front') {
      // top con escote
      const top = [];
      for (let i = 0; i <= 12; i++) { const u = -1.3 + 2.6 * i / 12; top.push(T.map(0.9 - 0.06 * Math.max(0, 1 - u * u), u)); }
      const bot = []; for (let i = 12; i >= 0; i--) { const u = -1.3 + 2.6 * i / 12; bot.push(T.map(0.6, u)); }
      s += `<path d="M${top.concat(bot).map(P).join(' L')}Z" fill="${C.cloth}"/>`;
      s += `<path d="${region(T.map, 0.6, 0.65, -1.5, 1.5)}" fill="${C.clothSh}"/>`;
      s += `<path d="${region(T.map, 0.86, 1.05, 0.48, 0.72)}" fill="${C.cloth}"/><path d="${region(T.map, 0.86, 1.05, -0.72, -0.48)}" fill="${C.cloth}"/>`;
      // ombligo y línea alba
      const nv = T.map(0.32, 0);
      s += `<ellipse cx="${f(nv[0])}" cy="${f(nv[1])}" rx="0.7" ry="1.1" fill="${C.skinLn}" opacity="0.6"/>`;
      s += `<path d="${smooth([T.map(0.38, 0), T.map(0.5, 0), T.map(0.58, 0)], false)}" stroke="${C.skinSh}" stroke-width="0.6" fill="none"/>`;
      s += `<path d="${smooth([T.map(0.4, -0.55), T.map(0.5, -0.5), T.map(0.58, -0.55)], false)}" stroke="${C.skinSh}" stroke-width="0.5" fill="none"/>`;
      s += `<path d="${smooth([T.map(0.4, 0.55), T.map(0.5, 0.5), T.map(0.58, 0.55)], false)}" stroke="${C.skinSh}" stroke-width="0.5" fill="none"/>`;
    } else {
      // espalda: top racerback
      s += `<path d="${region(T.map, 0.6, 0.72, -1.5, 1.5)}" fill="${C.cloth}"/>`;
      const rb = [T.map(0.72, -0.32), T.map(0.84, -0.18), T.map(1.02, -0.42), T.map(1.02, -0.62), T.map(0.84, -0.32), T.map(0.72, -0.6)];
      const rb2 = rb.map(p => p); // espejo
      s += `<path d="M${[T.map(0.7, -0.35), T.map(0.84, -0.12), T.map(1.03, -0.4), T.map(1.03, -0.6), T.map(0.84, -0.32), T.map(0.7, -0.62)].map(P).join(' L')}Z" fill="${C.cloth}"/>`;
      s += `<path d="M${[T.map(0.7, 0.35), T.map(0.84, 0.12), T.map(1.03, 0.4), T.map(1.03, 0.6), T.map(0.84, 0.32), T.map(0.7, 0.62)].map(P).join(' L')}Z" fill="${C.cloth}"/>`;
      // columna
      s += `<path d="${smooth([T.map(0.3, 0), T.map(0.45, 0), T.map(0.6, 0)], false)}" stroke="${C.skinSh}" stroke-width="0.7" fill="none"/>`;
      // glúteos (separación)
      s += `<path d="${smooth([T.map(0.2, 0), T.map(0.1, 0), T.map(-0.02, 0)], false)}" stroke="${C.clothLn}" stroke-width="0.7" fill="none"/>`;
    }
  }
  s += `</g>`;
  // músculos
  const V = v === 'side' ? MUS.side.torso : (v === 'front' ? MUS.front.torso : MUS.back.torso);
  for (const m of mus || []) {
    const def = V[m.m]; if (!def) continue;
    if (def.sym) { s += drawMuscle(T.map, def, m.lvl || 1, cid, 1) + drawMuscle(T.map, def, m.lvl || 1, cid, -1); }
    else s += drawMuscle(T.map, def, m.lvl || 1, cid, 1);
  }
  s += `<path d="${T.d}" fill="none" stroke="${C.clothLn}" stroke-width="0.9" stroke-linejoin="round"/>`;
  return s;
}

// glúteo (vista lateral)
function drawGlute(J, mus) {
  if (J.view !== 'side') return '';
  const L = J.n, d = nrm(sub(L.K, L.hip)), nn = [d[1], -d[0]], back = mul(nn, -1);
  const c = add(add(L.hip, mul(back, 4.2)), mul(d, 1.8));
  const pts = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * Math.PI; pts.push(add(c, add(mul(d, Math.cos(a) * 8.6), mul(back, Math.sin(a) * 7.4)))); }
  const dd = smooth(pts);
  const cid = uid('c');
  let s = `<clipPath id="${cid}"><path d="${dd}"/></clipPath><path d="${dd}" fill="${C.cloth}"/>`;
  s += `<g clip-path="url(#${cid})"><path d="M${P(add(c, mul(back, 2.5)))} L${P(add(c, add(mul(back, 12), mul(d, -12))))} L${P(add(c, add(mul(back, 12), mul(d, 12))))}Z" fill="${C.clothSh}"/></g>`;
  const gm = (mus || []).find(m => m.m === 'glute' || m.m === 'gluteMax');
  if (gm) {
    const id2 = uid('m');
    const col = gm.lvl === 2 ? [C.mus2, C.mus2Ln, C.mus2Fib] : [C.mus, C.musLn, C.musFib];
    const ip = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * Math.PI; ip.push(add(add(c, mul(back, 0.6)), add(mul(d, Math.cos(a) * 7.2), mul(back, Math.sin(a) * 6.2)))); }
    const di = smooth(ip);
    let fl = '';
    const fd = nrm(add(mul(d, 0.75), mul(nn, 0.66))); const fp = [-fd[1], fd[0]];
    for (let k = -4; k <= 4; k++) { const o = add(c, mul(fp, k * 2)); fl += `<path d="M${P(add(o, mul(fd, -12)))} L${P(add(o, mul(fd, 12)))}" stroke="${col[2]}" stroke-width="0.55"/>`; }
    s += `<clipPath id="${id2}"><path d="${di}"/></clipPath><path d="${di}" fill="${col[0]}" opacity="0.95"/><g clip-path="url(#${id2})">${fl}</g><path d="${di}" fill="none" stroke="${col[1]}" stroke-width="0.7"/>`;
  }
  // contorno sólo hacia atrás
  const arc = []; for (let i = -5; i <= 13; i++) { const a = i / 16 * 2 * Math.PI; arc.push(add(c, add(mul(d, Math.cos(a) * 8.6), mul(back, Math.sin(a) * 7.4)))); }
  s += `<path d="${smooth(arc.slice(3, 15), false)}" fill="none" stroke="${C.clothLn}" stroke-width="0.9"/>`;
  return s;
}

// ───────────── CABEZA (estilo cartoon, rasgos de ella)
function ribbon(center, w0, w1) {
  const L = [], Rr = [];
  for (let i = 0; i < center.length; i++) {
    const a = center[Math.max(0, i - 1)], b = center[Math.min(center.length - 1, i + 1)];
    const t = nrm(sub(b, a)), n = [-t[1], t[0]];
    const w = w0 + (w1 - w0) * (i / (center.length - 1));
    const ww = w * Math.sin(Math.min(1, (i + 0.6) / 1.6) * Math.PI / 2);
    L.push(add(center[i], mul(n, ww))); Rr.push(add(center[i], mul(n, -ww)));
  }
  return smooth(L.concat(Rr.reverse()));
}
function bezPts(p0, p1, p2, p3, N = 10) {
  const out = [];
  for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
  return out;
}
function braid(pts, w = 1.5, col = C.hairHi) {
  let s = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], m = lerp(a, b, 0.5), d = sub(b, a), ang = Math.atan2(d[1], d[0]) / R + (i % 2 ? 28 : -28);
    s += `<ellipse cx="${f(m[0])}" cy="${f(m[1])}" rx="${f(len(d) * 0.75)}" ry="${f(w)}" transform="rotate(${f(ang)} ${f(m[0])} ${f(m[1])})" fill="${col}" stroke="${C.hairLn}" stroke-width="0.4"/>`;
  }
  return s;
}

function drawNeck(J) {
  const up = J.up; let s = '';
  const neckBase = add(J.S, mul(up, -3));
  const neckTop = add(J.S, mul(up, LEN.neck + 4));
  const nk = limb(neckBase, neckTop, [[0, 3.8], [1, 3.3]], [[0, 3.8], [1, 3.3]]);
  s += `<path d="${nk.d}" fill="${C.skin}" stroke="${C.skinLn}" stroke-width="0.85"/>`;
  if (J.view === 'side') s += `<path d="${region(nk.map, 0.1, 0.95, -0.95, -0.25)}" fill="${C.skinSh}"/>`;
  return s;
}

function hairBack(J) {
  const r = LEN.headR, Cc = J.C, up = J.up, front = [-up[1], up[0]];
  const hp = (x, y) => add(Cc, add(mul(front, x * r), mul(up, y * r)));
  const pts = [[0, 1.16], [0.75, 0.98], [1.08, 0.4], [1.15, -0.5], [1.32, -1.6], [1.38, -2.7], [1.15, -3.25], [0.8, -3.0], [0.4, -2.9], [-0.4, -2.9], [-0.8, -3.05], [-1.2, -3.2], [-1.38, -2.6], [-1.3, -1.5], [-1.15, -0.5], [-1.08, 0.4], [-0.75, 0.98]];
  let s = `<path d="${smooth(pts.map(([x, y]) => hp(x, y)))}" fill="${C.hairSh}" stroke="${C.hairLn}" stroke-width="0.9"/>`;
  for (const [x0, x1, c] of [[1.0, 1.2, C.hairHi], [-1.0, -1.22, C.hairHi], [0.85, 0.95, C.hairHi2], [-0.85, -0.9, C.hairHi2]]) s += `<path d="${smooth([hp(x0, 0.2), hp(x1, -1.4), hp(x1 * 0.95, -2.8)], false)}" stroke="${c}" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.85"/>`;
  return s;
}
function hairFront(J, hp) {
  let s = '';
  // mechones que caen por delante de los hombros
  const strand = (pts, w0, w1) => { const cl = bezPts(...pts.map(([x, y]) => hp(x, y)), 14); return `<path d="${ribbon(cl, w0, w1)}" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.8"/>` + `<path d="${smooth(cl.slice(2, 13), false)}" stroke="${C.hairHi}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`; };
  s += strand([[0.92, 0.55], [1.18, -0.2], [1.25, -1.6], [1.1, -2.9]], 2.6, 1.2);
  s += strand([[-0.92, 0.55], [-1.2, -0.2], [-1.26, -1.6], [-1.12, -2.85]], 2.6, 1.2);
  // trenzas finas con cuentas y concha (lado izquierdo del espectador)
  for (const [ox, len2] of [[-0.78, -2.4], [-0.96, -2.75]]) {
    const pts = bezPts(hp(ox + 0.3, 0.95), hp(ox - 0.15, 0.4), hp(ox - 0.2, -1.2), hp(ox - 0.05, len2), 14);
    s += braid(pts, 0.7, C.hairHi);
    for (const i of [6, 10]) { const q = pts[i]; s += `<rect x="${f(q[0] - 0.8)}" y="${f(q[1] - 1)}" width="1.6" height="2" rx="0.6" fill="${i === 9 ? '#E3C27A' : '#F5EEDC'}" stroke="#9C8460" stroke-width="0.35"/>`; }
    const e = pts[pts.length - 1];
    s += `<ellipse cx="${f(e[0])}" cy="${f(e[1] + 1.2)}" rx="1.0" ry="1.5" fill="#FFF8EA" stroke="#9C8460" stroke-width="0.35"/><path d="M${f(e[0])} ${f(e[1] + 0.3)} L${f(e[0])} ${f(e[1] + 2.1)}" stroke="#9C8460" stroke-width="0.35"/>`;
  }
  return s;
}
function necklace(J) {
  const S = J.S;
  const pts = bezPts(add(S, [-6.5, -2]), add(S, [-5, 4]), add(S, [5, 4]), add(S, [6.5, -2]), 12);
  let s = `<path d="${smooth(pts, false)}" stroke="#C9A55E" stroke-width="0.45" fill="none"/>`;
  pts.forEach((q, i) => { if (i % 2 === 1 && i !== 6 && i !== 5 && i !== 7) s += `<ellipse cx="${f(q[0])}" cy="${f(q[1])}" rx="0.9" ry="0.65" fill="#FFF8EA" stroke="#9C8460" stroke-width="0.25"/>`; });
  const c = pts[6];
  s += `<ellipse cx="${f(c[0])}" cy="${f(c[1] + 1.2)}" rx="1.6" ry="2.2" fill="#FFF8EA" stroke="#9C8460" stroke-width="0.4"/><path d="M${f(c[0])} ${f(c[1])} L${f(c[0])} ${f(c[1] + 2.4)}" stroke="#9C8460" stroke-width="0.35"/>`;
  return s;
}

function drawHead(J, opts = {}) {
  const r = LEN.headR, Cc = J.C, up = J.up, front = [-up[1], up[0]];
  const hp = (x, y) => add(Cc, add(mul(front, x * r), mul(up, y * r)));
  const g = [0, 1];
  let s = '';
  if (J.view === 'side') {
    // coleta (detrás)
    const tie = hp(-0.62, 0.62), back = mul(front, -1);
    const lying = Math.abs(up[1]) < 0.55 && back[1] > 0.4;
    let fall = lying ? nrm(add(mul(up, -1), mul(back, 0.25))) : nrm(add(mul(back, 0.45), g));
    if (!lying && dot(g, back) > 0.7) fall = nrm(add(back, mul(up, -0.4)));
    const p1 = add(tie, add(mul(back, 6), mul(up, 2))), p2 = add(tie, add(mul(back, 6.5), mul(fall, 10))), p3 = add(tie, add(mul(back, 4), mul(fall, 24)));
    const cl = bezPts(tie, p1, p2, p3, 12);
    s += `<path d="${ribbon(cl, 3.4, 1.1)}" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.8"/>`;
    s += `<path d="${smooth(cl.slice(1, 11).map((p, i) => add(p, mul(front, 0.9))), false)}" stroke="${C.hairHi}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${smooth(cl.slice(2, 10).map((p, i) => add(p, mul(front, -1.2))), false)}" stroke="${C.hairHi2}" stroke-width="0.6" fill="none" stroke-linecap="round" opacity="0.8"/>`;
    // cara de perfil
    const face = [[0.05, 1.0], [0.55, 0.86], [0.8, 0.5], [0.84, 0.28], [0.8, 0.16], [0.9, 0.02], [1.0, -0.09], [0.95, -0.16], [0.84, -0.2], [0.89, -0.28], [0.85, -0.36], [0.88, -0.44], [0.78, -0.55], [0.77, -0.66], [0.58, -0.8], [0.25, -0.76], [0.0, -0.52], [-0.45, -0.55], [-0.92, -0.18], [-0.97, 0.38], [-0.6, 0.86]];
    s += `<path d="${smooth(face.map(([x, y]) => hp(x, y)))}" fill="${C.skin}" stroke="${C.skinLn}" stroke-width="0.85" stroke-linejoin="round"/>`;
    const bl = hp(0.46, -0.27);
    s += `<ellipse cx="${f(bl[0])}" cy="${f(bl[1])}" rx="${f(r * 0.16)}" ry="${f(r * 0.09)}" fill="${C.blush}" opacity="0.5"/>`;
    // ojo almendrado de perfil
    const eyeP = [hp(0.5, 0.15), hp(0.64, 0.2), hp(0.74, 0.12), hp(0.66, 0.03), hp(0.53, 0.07)];
    s += `<path d="${smooth(eyeP)}" fill="#fff" stroke="${C.eye}" stroke-width="0.45"/>`;
    const ic = hp(0.62, 0.11); s += `<circle cx="${f(ic[0])}" cy="${f(ic[1])}" r="${f(r * 0.075)}" fill="${C.eye}"/>`;
    s += `<path d="M${P(hp(0.48, 0.16))} Q${P(hp(0.63, 0.25))} ${P(hp(0.76, 0.13))} L${P(hp(0.82, 0.18))}" stroke="${C.eye}" stroke-width="0.85" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="M${P(hp(0.4, 0.33))} Q${P(hp(0.6, 0.42))} ${P(hp(0.78, 0.32))}" stroke="${C.hairSh}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${smooth([hp(0.85, -0.26), hp(0.9, -0.29), hp(0.86, -0.36), hp(0.9, -0.42), hp(0.79, -0.4), hp(0.8, -0.3)])}" fill="${C.lip}"/>`;
    s += `<path d="M${P(hp(0.86, -0.35))} Q${P(hp(0.8, -0.36))} ${P(hp(0.75, -0.31))}" stroke="${C.lipLn}" stroke-width="0.5" fill="none" stroke-linecap="round"/>`;
    const ml = hp(0.38, -0.05); s += `<circle cx="${f(ml[0])}" cy="${f(ml[1])}" r="0.42" fill="${C.eye}"/>`;
    // pelo (casquete)
    const hair = [[0.62, 0.74], [0.3, 1.06], [-0.3, 1.08], [-0.85, 0.75], [-1.05, 0.25], [-0.98, -0.15], [-0.7, -0.42], [-0.5, -0.3], [-0.3, -0.05], [-0.18, 0.28], [0.1, 0.5], [0.4, 0.6]];
    s += `<path d="${smooth(hair.map(([x, y]) => hp(x, y)))}" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.85"/>`;
    s += `<path d="${smooth([hp(0.45, 0.82), hp(0.0, 0.98), hp(-0.55, 0.85), hp(-0.85, 0.5)], false)}" stroke="${C.hairHi}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${smooth([hp(0.25, 0.68), hp(-0.2, 0.78), hp(-0.65, 0.62)], false)}" stroke="${C.hairHi2}" stroke-width="0.6" fill="none" stroke-linecap="round"/>`;
    // trenza desde la sien hacia la coleta
    s += braid(bezPts(hp(0.25, 0.55), hp(-0.05, 0.45), hp(-0.4, 0.55), hp(-0.6, 0.62), 7), 1.15, C.hairHi);
    // goma
    s += `<ellipse cx="${f(tie[0])}" cy="${f(tie[1])}" rx="1.1" ry="2.0" transform="rotate(${f(Math.atan2(up[1], up[0]) / R)} ${f(tie[0])} ${f(tie[1])})" fill="#E7D3B4" stroke="${C.hairLn}" stroke-width="0.5"/>`;
    // oreja + perla
    const ear = [[-0.02, 0.18], [-0.24, 0.16], [-0.3, -0.05], [-0.2, -0.25], [-0.04, -0.22]];
    s += `<path d="${smooth(ear.map(([x, y]) => hp(x, y)))}" fill="${C.skin}" stroke="${C.skinLn}" stroke-width="0.7"/>`;
    const pl = hp(-0.14, -0.3); s += `<circle cx="${f(pl[0])}" cy="${f(pl[1])}" r="0.75" fill="${C.pearl}" stroke="#B9B1A0" stroke-width="0.3"/>`;
  } else if (J.view === 'front') {
    // coleta asomando detrás
    if (!J.hairDown) s += `<path d="${ribbon(bezPts(hp(0.55, 0.3), hp(1.1, 0.0), hp(1.25, -0.6), hp(1.05, -1.4), 10), 2.6, 1)}" fill="${C.hairSh}" stroke="${C.hairLn}" stroke-width="0.7"/>`;
    const face = [[0, 1.0], [0.62, 0.8], [0.84, 0.25], [0.78, -0.3], [0.55, -0.72], [0.0, -0.98], [-0.55, -0.72], [-0.78, -0.3], [-0.84, 0.25], [-0.62, 0.8]];
    // orejas
    for (const sg of [-1, 1]) {
      const e = [[0.8 * sg, 0.15], [1.0 * sg, 0.12], [1.02 * sg, -0.12], [0.86 * sg, -0.3]];
      s += `<path d="${smooth(e.map(([x, y]) => hp(x, y)))}" fill="${C.skin}" stroke="${C.skinLn}" stroke-width="0.7"/>`;
      const pl = hp(0.94 * sg, -0.33); s += `<circle cx="${f(pl[0])}" cy="${f(pl[1])}" r="0.75" fill="${C.pearl}" stroke="#B9B1A0" stroke-width="0.3"/>`;
    }
    s += `<path d="${smooth(face.map(([x, y]) => hp(x, y)))}" fill="${C.skin}" stroke="${C.skinLn}" stroke-width="0.9"/>`;
    // ojos, cejas
    for (const sg of [-1, 1]) {
      const ec = hp(0.34 * sg, 0.02);
      const eye = [hp(0.17 * sg, 0.03), hp(0.3 * sg, 0.14), hp(0.47 * sg, 0.1), hp(0.52 * sg, 0.03), hp(0.36 * sg, -0.06), hp(0.22 * sg, -0.04)];
      s += `<path d="${smooth(eye)}" fill="#fff" stroke="${C.eye}" stroke-width="0.4"/>`;
      s += `<circle cx="${f(ec[0])}" cy="${f(ec[1] + 0.05)}" r="${f(r * 0.095)}" fill="#7A4B2C"/><circle cx="${f(ec[0])}" cy="${f(ec[1] + 0.05)}" r="${f(r * 0.05)}" fill="#2B1810"/>`;
      s += `<circle cx="${f(ec[0] + 0.35)}" cy="${f(ec[1] - 0.35)}" r="0.32" fill="#fff"/>`;
      s += `<path d="M${P(hp(0.15 * sg, 0.04))} Q${P(hp(0.3 * sg, 0.18))} ${P(hp(0.5 * sg, 0.1))} L${P(hp(0.57 * sg, 0.15))}" stroke="${C.eye}" stroke-width="0.95" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="M${P(hp(0.13 * sg, 0.28))} Q${P(hp(0.33 * sg, 0.4))} ${P(hp(0.56 * sg, 0.29))}" stroke="${C.hairSh}" stroke-width="1.35" fill="none" stroke-linecap="round"/>`;
      const bl = hp(0.47 * sg, -0.3); s += `<ellipse cx="${f(bl[0])}" cy="${f(bl[1])}" rx="${f(r * 0.15)}" ry="${f(r * 0.08)}" fill="${C.blush}" opacity="0.5"/>`;
    }
    s += `<path d="M${P(hp(0.03, -0.1))} Q${P(hp(0.09, -0.26))} ${P(hp(-0.03, -0.28))}" stroke="${C.skinLn}" stroke-width="0.55" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${P(hp(-0.24, -0.47))} Q${P(hp(0, -0.6))} ${P(hp(0.24, -0.47))} Q${P(hp(0, -0.53))} ${P(hp(-0.24, -0.47))}Z" fill="${C.lip}" stroke="${C.lipLn}" stroke-width="0.45"/>`;
    const ml = hp(-0.44, -0.1); s += `<circle cx="${f(ml[0])}" cy="${f(ml[1])}" r="0.4" fill="${C.eye}"/>`;
    // pelo con raya al medio
    const hair = [[0, 0.88], [-0.35, 0.82], [-0.72, 0.48], [-0.86, 0.1], [-0.96, 0.15], [-0.98, 0.6], [-0.6, 1.08], [0, 1.18], [0.6, 1.08], [0.98, 0.6], [0.96, 0.15], [0.86, 0.1], [0.72, 0.48], [0.35, 0.82]];
    s += `<path d="${smooth(hair.map(([x, y]) => hp(x, y)))}" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.85"/>`;
    s += `<path d="M${P(hp(0, 0.9))} L${P(hp(0, 1.15))}" stroke="${C.hairLn}" stroke-width="0.6"/>`;
    s += `<path d="${smooth([hp(0.3, 1.02), hp(0.7, 0.85), hp(0.9, 0.45)], false)}" stroke="${C.hairHi}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${smooth([hp(-0.3, 1.02), hp(-0.65, 0.88), hp(-0.88, 0.5)], false)}" stroke="${C.hairHi2}" stroke-width="0.7" fill="none" stroke-linecap="round"/>`;
    if (!J.hairDown) s += braid(bezPts(hp(-0.2, 0.96), hp(-0.55, 0.9), hp(-0.85, 0.6), hp(-0.98, 0.2), 7), 1.1, C.hairHi);
    else s += hairFront(J, hp);
  } else {
    // vista trasera
    const hb = [[0, 1.12], [0.7, 0.92], [0.98, 0.3], [0.85, -0.45], [0.4, -0.8], [-0.4, -0.8], [-0.85, -0.45], [-0.98, 0.3], [-0.7, 0.92]];
    for (const sg of [-1, 1]) { const e = [[0.86 * sg, 0.12], [1.04 * sg, 0.08], [1.0 * sg, -0.2], [0.82 * sg, -0.3]]; s += `<path d="${smooth(e.map(([x, y]) => hp(x, y)))}" fill="${C.skin}" stroke="${C.skinLn}" stroke-width="0.7"/>`; }
    s += `<path d="${smooth(hb.map(([x, y]) => hp(x, y)))}" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.85"/>`;
    const tie = hp(0, 0.42);
    const cl = bezPts(tie, hp(0.25, 0.0), hp(-0.2, -1.0), hp(0.1, -2.4), 12);
    s += `<path d="${ribbon(cl, 3.2, 1.1)}" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.8"/>`;
    s += `<path d="${smooth(cl.slice(1, 11), false)}" stroke="${C.hairHi}" stroke-width="0.8" fill="none"/>`;
    for (const sg of [-1, 1]) s += `<path d="${smooth([hp(0.75 * sg, 0.7), hp(0.4 * sg, 0.55), hp(0.08 * sg, 0.44)], false)}" stroke="${C.hairHi}" stroke-width="0.8" fill="none" stroke-linecap="round"/>`;
    s += braid(bezPts(hp(-0.9, 0.35), hp(-0.6, 0.5), hp(-0.3, 0.45), hp(-0.05, 0.42), 6), 1.1, C.hairHi);
    s += `<ellipse cx="${f(tie[0])}" cy="${f(tie[1])}" rx="2.0" ry="1.1" fill="#E7D3B4" stroke="${C.hairLn}" stroke-width="0.5"/>`;
  }
  return s;
}

// ───────────── utilidades de escena
const NAVY = '#2B4C9B';
function arrow(p, q, opts = {}) {
  const col = opts.col || NAVY, w = opts.w || 2;
  const d = nrm(sub(q, p)), n = [-d[1], d[0]];
  const a = add(q, add(mul(d, -5.5), mul(n, 3.6))), b = add(q, add(mul(d, -5.5), mul(n, -3.6)));
  const body = `M${P(p)} L${P(add(q, mul(d, -2)))}`, head = `M${P(a)} L${P(q)} L${P(b)}`;
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${body}" stroke="#fff" stroke-width="${w + 2.4}"/><path d="${head}" stroke="#fff" stroke-width="${w + 2.4}"/><path d="${body}" stroke="${col}" stroke-width="${w}"/><path d="${head}" stroke="${col}" stroke-width="${w}"/></g>`;
}
function curveArrow(p0, c, p1, opts = {}) {
  const col = opts.col || NAVY, w = opts.w || 2;
  const d = nrm(sub(p1, c)), n = [-d[1], d[0]];
  const a = add(p1, add(mul(d, -5.5), mul(n, 3.6))), b = add(p1, add(mul(d, -5.5), mul(n, -3.6)));
  const body = `M${P(p0)} Q${P(c)} ${P(add(p1, mul(d, -1.5)))}`, head = `M${P(a)} L${P(p1)} L${P(b)}`;
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${body}" stroke="#fff" stroke-width="${w + 2.4}"/><path d="${head}" stroke="#fff" stroke-width="${w + 2.4}"/><path d="${body}" stroke="${col}" stroke-width="${w}" ${opts.dash ? 'stroke-dasharray="3 2.4"' : ''}/><path d="${head}" stroke="${col}" stroke-width="${w}"/></g>`;
}
function arcArrow(c, r, a0, a1, opts = {}) {
  const pts = []; const N = 16; for (let i = 0; i <= N; i++) pts.push(add(c, mul(D(a0 + (a1 - a0) * i / N), r)));
  const col = opts.col || NAVY, w = opts.w || 2;
  const p1 = pts[N], pp = pts[N - 2], d = nrm(sub(p1, pp)), n = [-d[1], d[0]];
  const a = add(p1, add(mul(d, -5), mul(n, 3.4))), b = add(p1, add(mul(d, -5), mul(n, -3.4)));
  const body = smooth(pts, false), head = `M${P(a)} L${P(p1)} L${P(b)}`;
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${body}" stroke="#fff" stroke-width="${w + 2.4}"/><path d="${head}" stroke="#fff" stroke-width="${w + 2.4}"/><path d="${body}" stroke="${col}" stroke-width="${w}"/><path d="${head}" stroke="${col}" stroke-width="${w}"/></g>`;
}
function tag(p, txt, opts = {}) {
  const fs = 6.2, w = txt.length * fs * 0.54 + 8, h = fs + 5;
  const col = opts.col || NAVY;
  return `<g class="ann" transform="translate(${f(p[0])} ${f(p[1])}) scale(__K__)"><rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="#fff" stroke="${col}" stroke-width="1"/><text x="0" y="${f(fs * 0.36)}" font-size="${fs}" font-weight="800" fill="${col}" text-anchor="middle" font-family="Nunito, sans-serif">${txt}</text></g>`;
}
function dumbbell(c, ang = 0, col = '#8E7BE0') {
  const d = D(ang), n = [-d[1], d[0]];
  const hex = (e, r) => { const pts = []; for (let i = 0; i < 6; i++) pts.push(add(e, add(mul(d, Math.cos(i * 60 * R) * r * 0.6), mul(n, Math.sin(i * 60 * R) * r)))); return `<path d="M${pts.map(P).join(' L')}Z" fill="${col}" stroke="#3B2F78" stroke-width="0.8" stroke-linejoin="round"/>`; };
  const e1 = add(c, mul(d, 6)), e2 = add(c, mul(d, -6));
  return `<g><path d="M${P(e2)} L${P(e1)}" stroke="#545A6B" stroke-width="2.2" stroke-linecap="round"/>${hex(e1, 5.2)}${hex(e2, 5.2)}<path d="M${P(add(e1, mul(n, -2.6)))} L${P(add(e1, mul(n, 2.6)))}" stroke="#fff" stroke-opacity="0.45" stroke-width="0.7"/></g>`;
}
function dbEnd(c, col = '#8E7BE0') {
  const pts = []; for (let i = 0; i < 6; i++) pts.push(add(c, mul(D(i * 60 + 30), 6)));
  return `<g><path d="M${pts.map(P).join(' L')}Z" fill="${col}" stroke="#3B2F78" stroke-width="0.8" stroke-linejoin="round"/><circle cx="${f(c[0])}" cy="${f(c[1])}" r="1.8" fill="#545A6B"/></g>`;
}
function band(pts, w = 2.2) {
  return `<path d="${pts.length > 2 ? smooth(pts, false) : 'M' + pts.map(P).join(' L')}" fill="none" stroke="#8A1F4D" stroke-width="${w + 1.3}" stroke-linecap="round"/><path d="${pts.length > 2 ? smooth(pts, false) : 'M' + pts.map(P).join(' L')}" fill="none" stroke="#F0609A" stroke-width="${w}" stroke-linecap="round"/>`;
}
function ring(c, rx, ry, rot = 0) {
  const t = `transform="rotate(${f(rot)} ${f(c[0])} ${f(c[1])})"`;
  return `<g ${t}><ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${rx}" ry="${ry}" fill="none" stroke="#3E2A86" stroke-width="4.2"/><ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${rx}" ry="${ry}" fill="none" stroke="#8E6CF0" stroke-width="2.8"/><ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${rx}" ry="${ry}" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="0.7"/>` +
    `<rect x="${f(c[0] - 3)}" y="${f(c[1] - ry - 3.5)}" width="6" height="7" rx="2.6" fill="#C9B8FF" stroke="#3E2A86" stroke-width="0.8"/><rect x="${f(c[0] - 3)}" y="${f(c[1] + ry - 3.5)}" width="6" height="7" rx="2.6" fill="#C9B8FF" stroke="#3E2A86" stroke-width="0.8"/></g>`;
}
function floorSvg(fl) {
  if (!fl) return '';
  if (fl.type === 'mat') return `<ellipse cx="120" cy="${fl.y + 8}" rx="400" ry="3" fill="#000" opacity="0.05"/><rect x="-300" y="${fl.y}" width="840" height="5.5" rx="2.7" fill="${C.mat}" stroke="${C.matLn}" stroke-width="0.9"/>`;
  return `<line x1="-300" y1="${fl.y}" x2="540" y2="${fl.y}" stroke="${C.floor}" stroke-width="1.6" stroke-linecap="round"/>`;
}
function shadow(J, y) {
  const xs = [J.n.A[0], J.f.A[0], J.H[0], J.S[0], J.C[0]];
  const x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10;
  return `<ellipse cx="${f((x0 + x1) / 2)}" cy="${f(y + 1)}" rx="${f((x1 - x0) / 2)}" ry="3.2" fill="#1B2A55" opacity="0.10"/>`;
}

function renderPose(p) {
  UID += 0;
  const J = solve(p);
  const mus = p.mus || [];
  const m = k => mus.filter(x => (x.on || 'torso') === k);
  const legM = mus.filter(x => ['thigh', 'shin'].includes(x.on));
  const armM = mus.filter(x => x.on === 'ua');
  const torM = mus.filter(x => !x.on || x.on === 'torso');
  let s = '';
  if (p.back) s += p.back(J);
  if (p.floor) s += shadow(J, p.floor.y);
  if (p.pre) s += p.pre(J);
  const order = p.order || (J.view === 'side' ? ['legf', 'armf', 'neck', 'torso', 'legn', 'glute', 'head', 'armn'] : (J.view === 'front' ? ['legf', 'legn', 'neck', 'torso', 'head', 'armf', 'armn'] : ['legf', 'legn', 'neck', 'torso', 'head', 'armf', 'armn']));
  for (const o of order) {
    if (o === 'legf') s += drawLeg(J, 'f', legM.filter(x => !x.side || x.side === 'both' || x.side === 'f').map(x => ({ m: x.m, lvl: x.lvl })));
    if (o === 'legn') s += drawLeg(J, 'n', legM.filter(x => !x.side || x.side === 'both' || x.side === 'n').map(x => ({ m: x.m, lvl: x.lvl })));
    if (o === 'armf') s += drawArm(J, 'f', armM.filter(x => !x.side || x.side === 'both' || x.side === 'f').map(x => ({ m: x.m, lvl: x.lvl })));
    if (o === 'armn') s += drawArm(J, 'n', armM.filter(x => !x.side || x.side === 'both' || x.side === 'n').map(x => ({ m: x.m, lvl: x.lvl })));
    if (o === 'torso') s += drawTorso(J, torM);
    if (o === 'glute') s += drawGlute(J, mus.filter(x => x.m === 'glute'));
    if (o === 'head') s += drawHead(J);
    if (o === 'neck') s += drawNeck(J);
    if (o === 'hairback') s += hairBack(J);
    if (o === 'necklace') s += necklace(J);
    if (o === 'mid' && p.mid) s += p.mid(J);
  }
  if (p.props) s += p.props(J);
  const anns = [];
  s = s.replace(/<g class="ann"[^>]*>.*?<\/g>/g, m => { anns.push(m); return ''; });
  return { svg: `<g class="floor">${floorSvg(p.floor)}</g><g class="fig">${s}</g>${p.overlay ? `<g class="ovl">${p.overlay(J)}</g>` : ''}<g class="anns">${anns.join('')}</g>`, J };
}

function inset(inner, cx, cy, r, vb, opts = {}) {
  // vb: [x,y,w,h] región del dibujo interior a mostrar dentro del círculo
  const id = uid('i'), sc = (2 * r) / vb[2];
  const col = opts.col || '#F26A1F';
  return `<g><circle cx="${cx}" cy="${cy}" r="${r + 1.6}" fill="#fff" stroke="${col}" stroke-width="1.4"/><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>` +
    `<g clip-path="url(#${id})"><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="#FFF6EE"/><g transform="translate(${f(cx - r - vb[0] * sc)} ${f(cy - r - vb[1] * sc)}) scale(${f(sc)})">${inner}</g></g></g>`;
}

module.exports = { inset, renderPose, solve, D, add, sub, mul, nrm, lerp, len, dot, arrow, curveArrow, arcArrow, tag, dumbbell, dbEnd, band, ring, floorSvg, smooth, bezPts, braid, ribbon, C, LEN, P, f, NAVY, limb, region, drawHead, MUS };
