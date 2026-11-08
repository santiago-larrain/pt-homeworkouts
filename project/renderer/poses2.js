const R2 = require('./rig2');
const { renderPose, D, add, sub, mul, nrm, lerp, arrow, curveArrow, arcArrow, tag, dumbbell, dbEnd, band, ring, smooth, capsule, C, P, f, inset, bezPts, braid, ribbon } = R2;

const G = 152, AY = G - 3.8;
const FL = { type: 'line', y: G };
const MAT = { type: 'mat', y: G };
const along = (a, b, t, off = 0) => { const d = sub(b, a), n = nrm([d[1], -d[0]]); return add(add(a, mul(d, t)), mul(n, off)); };
const thighBand = (J, side = 'n', t = 0.84, w = 9) => {
  const L = J[side], c = along(L.hip, L.K, t), d = nrm(sub(L.K, L.hip)), n = [d[1], -d[0]];
  return band([add(c, mul(n, w)), add(c, mul(n, -w))], 2.6);
};
const post = (x, y0 = 16, y1 = G, w = 6) => `<rect x="${x - w / 2}" y="${y0}" width="${w}" height="${y1 - y0}" rx="2.4" fill="#E2D8F6" stroke="#9F8BD6" stroke-width="0.9"/>`;
const anchorPt = (p) => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="3.2" fill="#fff" stroke="#8A1F4D" stroke-width="1.3"/>`;
const T = (p, s, o) => tag(p, s, o);

// músculos (atajos)
const M = (m, on, lvl = 1, side) => ({ m, on, lvl, side });

// ═════════════ A · ACTIVACIÓN
const A1 = (cat) => ({
  anchor: { hip: [100, 110] }, floor: MAT,
  torso: { a: -10.5, len: 44.5, bend: cat ? -7.5 : 5.5 },
  head: { a: cat ? 55 : -38 },
  leg: { th: 90, sh: 179, ft: 180 },
  arm: { ua: 90, fa: 90 },
  mus: cat ? [M('abs', 'torso'), M('transverse', 'torso', 2)] : [M('erectors', 'torso'), M('gluteMed', 'torso', 2)],
  props: J => {
    const m = J.torso.pos(0.5);
    return cat ? curveArrow(add(m, [-14, -16]), add(m, [0, -30]), add(m, [14, -16]))
      : arrow(add(m, [0, 12]), add(m, [0, 27]));
  },
});

const A2 = (back) => ({
  anchor: { ankle: [120, AY] }, floor: FL,
  torso: { a: back ? -91 : -88, bend: back ? 1.5 : -1.5 },
  shrug: back ? [-3.5, 2.2] : [1.5, -5],
  head: { a: -90 },
  arm: back ? { ua: 84, fa: 88 } : { ua: 96, fa: 94 },
  mus: back ? [M('rhomboids', 'torso'), M('traps', 'torso', 2)] : [M('traps', 'torso'), M('rhomboids', 'torso', 2)],
  props: J => arcArrow(add(J.armn.S, [-2, 2]), 12, 40, -230),
});

const A3 = (hinge) => hinge ? {
  anchor: { ankle: [112, AY] }, floor: FL,
  leg: { th: 72, sh: 96, ft: 0 },
  torso: { a: -24 }, head: { a: -24 },
  arm: { ua: -10, uaS: 0.7, fa: 205 },
  mus: [M('hams', 'thigh'), M('glute'), M('erectors', 'torso', 2)],
  props: J => curveArrow(add(J.H, [6, -16]), add(J.H, [-8, -22]), add(J.H, [-18, -10])),
} : {
  anchor: { ankle: [118, AY] }, floor: FL,
  arm: { ua: -70, uaS: 0.7, fa: 160 },
  mus: [M('hams', 'thigh'), M('glute'), M('erectors', 'torso', 2)],
};

const A4 = (up) => ({
  anchor: { ankle: [160, AY] }, floor: MAT,
  leg: up ? { th: -21, sh: 84, ft: 0 } : { th: -48, sh: 82, ft: 0 },
  torso: { a: up ? 157 : 176 }, head: { a: 186 },
  arm: { ua: 6, fa: 3 },
  mus: [M('glute'), M('hams', 'thigh', 2), M('transverse', 'torso', 2)],
  props: J => up ? arrow(add(J.H, [2, 26]), add(J.H, [2, 9])) + T(add(J.H, [-4, -22]), '3 s arriba') : '',
});

// ═════════════ B1 · TREN INFERIOR
const B11 = (sq) => sq ? {
  anchor: { ankle: [112, AY] }, floor: FL,
  leg: { th: 12, sh: 115, ft: 0 },
  torso: { a: -62 }, head: { a: -78 },
  arm: { ua: 92, fa: -50, faS: 0.95, grip: true },
  mus: [M('quads', 'thigh'), M('glute'), M('adductors', 'thigh', 2), M('gluteMed', 'torso', 2)],
  props: J => thighBand(J) + dumbbell(add(J.armn.W, [3, 0]), 90) + arrow(add(J.H, [-14, -26]), add(J.H, [-14, -6])),
} : {
  anchor: { ankle: [118, AY] }, floor: FL,
  arm: { ua: 80, fa: -68, faS: 0.9, grip: true },
  mus: [M('quads', 'thigh'), M('glute'), M('adductors', 'thigh', 2), M('gluteMed', 'torso', 2)],
  props: J => thighBand(J) + dumbbell(add(J.armn.W, [3, 0]), 90),
};

const B12 = (h) => h ? {
  anchor: { ankle: [130, AY] }, floor: FL,
  leg: { th: 76, sh: 95, ft: 0 },
  legF: { th: 104, sh: 103, ft: 58, fl: 0.85 },
  torso: { a: -18 }, head: { a: -22 },
  arm: { ua: 96, fa: 92, grip: true }, armF: { ua: 96, fa: 92, grip: true },
  mus: [M('hams', 'thigh', 1, 'n'), M('glute'), M('erectors', 'torso', 2)],
  props: J => dbEnd(add(J.armn.W, [1, 2])) + curveArrow(add(J.H, [8, -14]), add(J.H, [-6, -22]), add(J.H, [-18, -12])) + T([J.n.A[0] - 4, 40], '80% peso adelante'),
} : {
  anchor: { ankle: [130, AY] }, floor: FL,
  leg: { th: 90, sh: 90, ft: 0 },
  legF: { th: 99, sh: 99, ft: 58, fl: 0.85 },
  torso: { a: -90 },
  arm: { ua: 96, fa: 90, grip: true }, armF: { ua: 96, fa: 90, grip: true },
  mus: [M('hams', 'thigh', 1, 'n'), M('glute'), M('erectors', 'torso', 2)],
  props: J => dbEnd(add(J.armn.W, [1, 2])),
};

const B13 = (step) => ({
  view: 'back', anchor: { hip: [120, 82] }, floor: FL,
  torso: { a: -90 }, head: { a: -90 },
  l1: { th: 103, sh: 82 },
  l2: step ? { th: 58, sh: 94 } : { th: 77, sh: 98 },
  a1: { ua: 98, fa: 90, faS: 0.3, grip: true }, a2: { ua: 82, fa: 90, faS: 0.3, grip: true },
  mus: [M('gluteMed', 'torso'), M('gluteMax', 'torso', 2)],
  props: J => {
    const a = J.f.A, b = J.n.A;
    return band([add(a, [2, 0.5]), add(lerp(a, b, 0.5), [0, step ? 0 : 1.5]), add(b, [-2, 0.5])], 2.6) +
      (step ? arrow([b[0] + 6, b[1] - 16], [b[0] + 22, b[1] - 16]) : '') + T([120, 18], 'media sentadilla');
  },
});

// ═════════════ B2 · TORSO / HOMBRO
const B21 = (pull) => ({
  anchor: { ankle: [96, AY] }, floor: FL,
  leg: { th: 92, sh: 90 }, legF: { th: 86, sh: 92 },
  shrug: pull ? [-2.5, 0] : [1.5, 0],
  arm: pull ? { ua: 182, uaS: 0.55, fa: -82, grip: true } : { ua: -6, fa: -6, grip: true },
  armF: pull ? { ua: 182, uaS: 0.55, fa: -82, grip: true } : { ua: -6, fa: -6, grip: true },
  mus: [M('deltPost', 'ua'), M('rhomboids', 'torso'), M('infra', 'torso', 2), M('traps', 'torso', 2)],
  props: J => post(226, 14) + anchorPt([226, 32]) + band([[226, 32], add(J.armn.W, [1, -1])], 2.2) +
    (pull ? curveArrow([196, 26], [180, 20], [164, 26]) + T(add(J.armn.E, [-4, 14]), 'codos altos', { fs: 5.6 }) : ''),
});

const B22 = (up) => ({
  anchor: { ankle: [162, AY] }, floor: MAT,
  leg: { th: -48, sh: 82, ft: 0 },
  torso: { a: 176 }, head: { a: 186 },
  arm: up ? { ua: -84, fa: -86, grip: true } : { ua: 4, uaS: 0.78, fa: -90, grip: true },
  mus: [M('pec', 'torso'), M('triceps', 'ua', 2), M('deltAnt', 'ua', 2)],
  props: J => dbEnd(add(J.armn.W, [0, -2])) + (up ? arrow(add(J.armn.W, [14, 22]), add(J.armn.W, [14, 4])) : T(add(J.armn.E, [6, 14]), 'codo al suelo', { fs: 5.6 })),
});

function shoulderInset() {
  const back = renderPose({ view: 'back', anchor: { ankle: [120, AY] }, l1: { th: 92, sh: 91 }, l2: { th: 88, sh: 89 }, leg: { th: 90, sh: 90 }, a1: { ua: 100, fa: 94 }, a2: { ua: 80, fa: 86 }, mus: [M('infra', 'torso'), M('deltPost', 'ua', 2)] });
  return back.svg.replace('<g class="fig">', '<g>');
}
const B23 = (out) => ({
  view: 'front', anchor: { ankle: [124, AY] }, floor: FL,
  torso: { a: -90 }, head: { a: -90 },
  l1: { th: 93, sh: 91 }, l2: { th: 87, sh: 89 }, leg: { th: 90, sh: 90 },
  a1: { ua: 93, fa: 92 },
  a2: out ? { ua: 92, fa: 8, faS: 0.95, grip: true } : { ua: 92, fa: 178, faS: 0.95, grip: true },
  mus: [M('delt', 'ua', 2, 'n')],
  props: J => post(84, 40) + anchorPt([84, 64]) + band([[84, 64], add(J.armn.W, [0, 0])], 2.2) +
    `<rect x="${f(J.armn.E[0] - 7.5)}" y="${f(J.armn.E[1] - 9)}" width="5" height="8" rx="2.2" fill="#fff" stroke="#9AA3BC" stroke-width="0.8"/>` +
    (out ? curveArrow(add(J.armn.E, [-4, 12]), add(J.armn.E, [12, 16]), add(J.armn.E, [22, 6])) : '') + T([170, 20], 'trabaja detrás', { col: '#B9470F' }),
  overlay: J => inset(shoulderInset(), 170, 52, 24, [106, 30, 28, 28]),
});

// ═════════════ B3 · CORE / ARO
const DB = (ext) => ({
  anchor: { hip: [130, G - 10] }, floor: MAT,
  torso: { a: 176 }, head: { a: 186 },
  leg: { th: -90, sh: 0, ft: -70, fl: 0.9 },
  legF: ext ? { th: -7, sh: -5, ft: -60, fl: 0.9 } : undefined,
  arm: ext ? { ua: 196, fa: 192 } : { ua: -90, fa: -90 },
  armF: { ua: -88, fa: -90 },
  mus: [M('transverse', 'torso'), M('abs', 'torso', 2)],
  props: J => { const p = J.torso.pos(0.22); return arrow(add(p, [0, -40]), add(p, [0, -13])) + T(add(p, [-6, -48]), 'lumbar pegada'); },
});

const R32 = (up) => up ? {
  // Foto 2: torso levantado apoyada en los antebrazos, rodillas dobladas, aro entre las rodillas
  anchor: { hip: [130, G - 12] }, floor: MAT,
  leg: { th: -48, sh: 82, ft: 0 },
  torso: { a: 214, bend: -2 }, head: { a: 240 },
  arm: { ua: 78, uaS: 0.78, fa: 0 }, armF: { ua: 78, uaS: 0.78, fa: 0 },
  mus: [M('adductors', 'thigh'), M('abs', 'torso'), M('transverse', 'torso', 2)],
  props: J => { const k = J.n.K; return ring(add(k, [-2, 3]), 4.6, 13) + arrow([k[0] + 22, k[1] + 3], [k[0] + 10, k[1] + 3]) + arrow([k[0] - 26, k[1] + 3], [k[0] - 14, k[1] + 3]) + arrow(add(J.torso.pos(0.7), [-6, -14]), add(J.torso.pos(0.7), [-14, -26])) + T([k[0] - 4, k[1] - 28], 'aprieta el aro'); },
} : {
  // Foto 1: boca arriba, rodillas dobladas, aro entre las rodillas
  anchor: { ankle: [160, AY] }, floor: MAT,
  leg: { th: -48, sh: 82, ft: 0 },
  torso: { a: 176 }, head: { a: 186 }, arm: { ua: 6, fa: 3 },
  mus: [M('adductors', 'thigh'), M('transverse', 'torso', 2)],
  props: J => { const k = J.n.K; return ring(add(k, [-2, 3]), 4.6, 13) + arrow([k[0] + 22, k[1] + 3], [k[0] + 10, k[1] + 3]) + arrow([k[0] - 26, k[1] + 3], [k[0] - 14, k[1] + 3]) + T([k[0] - 2, k[1] - 26], 'aprieta el aro'); },
};

// Foto 4: cabeza y hombros levantados, brazos adelante, piernas casi verticales con el aro entre los tobillos
const R33a = {
  anchor: { hip: [128, G - 12] }, floor: MAT,
  torso: { a: 196, bend: -3 }, head: { a: 208 },
  leg: { th: -80, sh: -80, ft: -70, fl: 0.9 },
  arm: { ua: 4, fa: 2 }, armF: { ua: 4, fa: 2 },
  mus: [M('adductors', 'thigh'), M('abs', 'torso'), M('transverse', 'torso', 2)],
  props: J => ring(add(J.n.A, [0, -1]), 4.4, 13, 90) + arrow(add(J.n.A, [-20, -6]), add(J.n.A, [-9, -1])) + arrow(add(J.n.A, [20, -6]), add(J.n.A, [9, -1])) + T(add(J.n.A, [26, 24]), 'aprieta y respira'),
};
// Foto 6: de lado, apoyada en el antebrazo, pierna de arriba elevada con el aro entre los tobillos
const R33b = {
  view: 'front', anchor: { hip: [112, G - 12] }, floor: MAT,
  torso: { a: 198 }, head: { a: 205 },
  l2: { th: -30, sh: -32 }, l1: { th: 2, sh: 1 },
  a1: { ua: 90, uaS: 0.5, fa: 0, faS: 0.9 }, a2: { to: [88, G - 5], bend: 1 },
  order: ['legf', 'armf', 'legn', 'neck', 'torso', 'head', 'armn'],
  mus: [M('abductors', 'thigh', 1, 'n'), M('adductors', 'thigh', 2, 'f'), M('obliques', 'torso', 2)],
  props: J => {
    const a = J.n.A, b = J.f.A, m = lerp(a, b, 0.5);
    return ring([m[0], m[1]], 4.4, Math.max(8, Math.abs(b[1] - a[1]) / 2 + 3)) + arrow([a[0] + 14, a[1] - 6], [a[0] + 14, a[1] - 20]) + T([a[0] - 6, a[1] - 34], 'aprieta y eleva');
  },
};

// ═════════════ C · DESCOMPRESIÓN
const F = 150;
const frame = `<rect x="${F - 5.5}" y="6" width="11" height="${G - 6}" rx="2" fill="#EBDCC3" stroke="#B89B6E" stroke-width="0.9"/><rect x="${F - 5.5}" y="6" width="3" height="${G - 6}" fill="#D8C29F"/>`;
const C1 = (step) => step ? {
  anchor: { ankle: [F + 50, AY] }, floor: FL,
  leg: { th: 32, sh: 100, ft: 0 },
  legF: { th: 128, sh: 126, ft: 40, fl: 0.9, thS: 0.98, shS: 0.98 },
  torso: { a: -88 }, head: { a: -88 },
  arm: { to: [F + 1, 30], bend: 1 }, armF: { ua: 98, fa: 95 },
  back: () => frame,
  mus: [M('pec', 'torso'), M('deltAnt', 'ua', 2)],
  props: J => curveArrow(add(J.S, [-8, 34]), add(J.S, [2, 30]), add(J.S, [12, 34])) + T(add(J.S, [16, -24]), 'pecho abierto', { fs: 5.6 }),
} : {
  anchor: { ankle: [F + 10, AY] }, floor: FL,
  leg: { th: 90, sh: 90, ft: 0 }, legF: { th: 96, sh: 94, ft: 0 },
  torso: { a: -90 }, head: { a: -90 },
  arm: { ua: 180, uaS: 0.3, fa: -90 }, armF: { ua: 96, fa: 94 },
  back: () => frame,
  mus: [M('pec', 'torso'), M('deltAnt', 'ua', 2)],
  props: J => T([F - 26, J.S[1]], 'codo a 90°', { fs: 5.6 }),
};

const C2a = {
  anchor: { hip: [94, 136] }, floor: MAT,
  leg: { th: 17, sh: 182, ft: 180 },
  torso: { a: 2, len: 42, bend: -2.5 }, head: { a: 25 },
  arm: { ua: 18, fa: 4 },
  order: ['legf', 'legn', 'glute', 'armf', 'neck', 'torso', 'head', 'armn'],
  mus: [M('erectors', 'torso'), M('lats', 'torso', 2)],
  props: J => curveArrow(add(J.H, [12, -18]), add(J.H, [0, -26]), add(J.H, [-10, -16])) + arrow(add(J.armn.W, [-8, -12]), add(J.armn.W, [10, -12])),
};

function C2b() {
  // vista cenital: alcance lateral con brazos hacia la derecha-arriba
  const sk = C.skin, sl = C.skinLn;
  let s = `<rect x="4" y="12" width="232" height="146" rx="10" fill="${C.mat}" stroke="${C.matLn}" stroke-width="1"/><g class="fig">`;
  const leg = (y, far) => `<path d="${smooth([[30, y - 6], [74, y - 9], [80, y], [74, y + 9], [30, y + 6], [24, y]])}" fill="${far ? C.clothF : C.cloth}" stroke="${C.clothLn}" stroke-width="0.9"/>`;
  s += `<path d="${smooth([[14, 79], [26, 75], [30, 82], [18, 86]])}" fill="${sk}" stroke="${sl}" stroke-width="0.8"/>`;
  s += `<path d="${smooth([[14, 109], [26, 113], [30, 106], [18, 102]])}" fill="${sk}" stroke="${sl}" stroke-width="0.8"/>`;
  s += leg(82, true) + leg(106, false);
  s += `<ellipse cx="84" cy="94" rx="19" ry="23" fill="${C.cloth}" stroke="${C.clothLn}" stroke-width="0.9"/><path d="M70 94 L98 94" stroke="${C.clothLn}" stroke-width="0.7"/>`;
  // tronco curvado (C) hacia el alcance
  const tor = [[90, 74], [118, 66], [146, 52], [164, 48], [170, 62], [160, 80], [132, 98], [100, 114], [88, 104]];
  const td = smooth(tor);
  s += `<clipPath id="c2t"><path d="${td}"/></clipPath><path d="${td}" fill="${sk}"/>`;
  s += `<g clip-path="url(#c2t)"><path d="M80 60 L130 40 L136 120 L80 130Z" fill="${C.cloth}"/><path d="M140 30 L170 30 L174 90 L144 100Z" fill="${C.cloth}"/>`;
  // dorsal estirado (lado externo = abajo)
  const lat = [[108, 104], [132, 94], [156, 78], [164, 70], [150, 74], [126, 86], [104, 96]];
  s += `<path d="${smooth(lat)}" fill="${C.mus}" stroke="${C.musLn}" stroke-width="0.7"/>`;
  for (let k = 0; k < 6; k++) s += `<path d="M${108 + k * 9} ${104 - k * 5} L${116 + k * 9} ${92 - k * 5}" stroke="${C.musFib}" stroke-width="0.55"/>`;
  s += `<path d="${smooth([[96, 96], [120, 86], [138, 76], [136, 70], [118, 80], [96, 88]])}" fill="${C.mus2}" stroke="${C.mus2Ln}" stroke-width="0.6"/>`;
  s += `</g><path d="${td}" fill="none" stroke="${C.clothLn}" stroke-width="0.9"/>`;
  // columna
  s += `<path d="${smooth([[92, 92], [120, 82], [148, 66]], false)}" stroke="${C.skinSh}" stroke-width="0.8" fill="none"/>`;
  // brazos
  const arm = (a, b, far) => { const sh = R2.limb(a, b, [[0, 4.6], [0.4, 4], [1, 2.8]], [[0, 4.6], [0.4, 4], [1, 2.8]]); return `<path d="${sh.d}" fill="${far ? C.skinF : sk}" stroke="${sl}" stroke-width="0.85"/>`; };
  s += arm([150, 50], [200, 26], true) + `<ellipse cx="203" cy="24" rx="5" ry="3.4" transform="rotate(-25 203 24)" fill="${C.skinF}" stroke="${sl}" stroke-width="0.8"/>`;
  s += arm([164, 74], [214, 50], false) + `<ellipse cx="217" cy="48" rx="5" ry="3.4" transform="rotate(-25 217 48)" fill="${sk}" stroke="${sl}" stroke-width="0.8"/>`;
  // cabeza desde arriba (pelo + coleta)
  s += `<path d="${ribbon(bezPts([170, 62], [160, 66], [150, 70], [138, 72], 8), 3.4, 1.2)}" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.8"/>`;
  s += `<ellipse cx="176" cy="60" rx="10.5" ry="9.5" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.9"/>`;
  s += `<path d="${smooth([[170, 53], [178, 52], [184, 58]], false)}" stroke="${C.hairHi}" stroke-width="1" fill="none"/>`;
  s += braid(bezPts([184, 54], [180, 60], [174, 62], [168, 62], 6), 1.1, C.hairHi);
  s += R2.curveArrow([150, 128], [176, 124], [196, 92]);
  s += `</g>`;
  return { svg: s };
}

const C3 = (hold) => ({
  anchor: { ankle: [F + 4, AY] }, floor: MAT,
  // pierna delantera = lejana; pierna trasera (estirada) = cercana
  legF: { th: 2, sh: 92, ft: 0 },
  leg: hold ? { th: 96, sh: -128, ft: -140, fl: 0.9 } : { th: 100, sh: 179, ft: 182, fl: 0.95 },
  anchorLeg: 'f',
  torso: { a: hold ? -88 : -90 }, head: { a: -90 },
  arm: hold ? { to: [0, 0], bend: -1 } : { to: [0, 0], bend: 1 },
  armF: { to: [0, 0], bend: 1 },
  mus: [M('psoas', 'torso'), M('rectus', 'thigh', 1, 'n'), M('quads', 'thigh', 2, 'n')],
});

const C4 = (pull) => pull ? {
  anchor: { hip: [128, G - 10] }, floor: MAT,
  torso: { a: 176 }, head: { a: 194 },
  leg: { th: -116, sh: -18, shS: 0.38, ft: -50, fl: 0.9 },
  legF: { th: -96, sh: 6, ft: -20 },
  arm: { to: [0, 0], bend: -1 }, armF: { to: [0, 0], bend: -1 },
  mus: [M('glute'), M('piriformis', 'torso')],
  props: J => arrow(add(J.f.K, [-6, -14]), add(J.f.K, [-22, -6])),
} : {
  anchor: { hip: [128, G - 10] }, floor: MAT,
  torso: { a: 176 }, head: { a: 186 },
  leg: { th: -74, sh: 26, shS: 0.46, ft: -50, fl: 0.9 },
  legF: { th: -48, sh: 82, ft: 0 },
  arm: { ua: 6, fa: 3 },
  mus: [M('glute'), M('piriformis', 'torso')],
  props: J => T(add(J.n.K, [6, -16]), 'tobillo sobre rodilla', { fs: 5.4 }),
};

// ─── poses que requieren posiciones dependientes (IK sobre puntos del propio cuerpo)
function solveDeps(p) {
  if (p === C3(false) || true) { }
  return p;
}

const EX = [
  { id: 'A1', sec: 'A', num: '1', name: 'Gato – Camello', dose: { t: '45 s' }, eq: 'mat', focus: ['Columna', 'Abdomen'],
    cue: 'Vértebra por vértebra', poses: [A1(false), A1(true)], lab: ['Camello', 'Gato'],
    br: [['in', 'arquea'], ['ex', 'redondea']] },
  { id: 'A2', sec: 'A', num: '2', name: 'Círculos de hombros', dose: { t: '45 s' }, eq: 'none', focus: ['Trapecio', 'Romboides'],
    cue: 'Círculos lentos hacia atrás', poses: [A2(false), A2(true)], lab: ['Arriba', 'Atrás y abajo'],
    br: [['in', 'sube'], ['ex', 'atrás y abajo']] },
  { id: 'A3', sec: 'A', num: '3', name: 'Bisagra de cadera', sub: 'Good Morning sin peso', dose: { t: '45 s' }, eq: 'none', focus: ['Isquios', 'Glúteos'],
    cue: 'Cadera atrás, espalda larga', poses: [A3(false), A3(true)], lab: ['De pie', 'Bisagra'],
    br: [['ex', 'sube'], ['in', 'cadera atrás']] },
  { id: 'A4', sec: 'A', num: '4', name: 'Puente isométrico', dose: { t: '45 s', hold: '3 s' }, eq: 'mat', focus: ['Glúteo mayor', 'Transverso'],
    cue: 'Aprieta glúteos arriba', poses: [A4(false), A4(true)], lab: ['Base', 'Arriba'],
    br: [['in', 'prepara'], ['ex', 'sube y sostén']] },

  { id: '1.1', sec: 'B1', num: '1.1', name: 'Sentadilla Goblet', dose: { r: '10–12' }, eq: 'db+band', eqTxt: '3 kg + banda', focus: ['Cuádriceps', 'Glúteos'],
    cue: 'Rodillas empujan la banda', poses: [B11(false), B11(true)], lab: ['Arriba', 'Abajo'],
    br: [['ex', 'sube'], ['in', 'baja']] },
  { id: '1.2', sec: 'B1', num: '1.2', name: 'Peso muerto B-Stance', dose: { r: '10', side: true }, eq: 'db', eqTxt: '3 kg', focus: ['Isquios', 'Glúteos'],
    cue: 'Cadera atrás, rodilla suave', poses: [B12(false), B12(true)], lab: ['Arriba', 'Bisagra'],
    br: [['ex', 'sube'], ['in', 'baja']] },
  { id: '1.3', sec: 'B1', num: '1.3', name: 'Monster Walk lateral', dose: { r: '10 pasos', side: true }, eq: 'band', eqTxt: 'banda tobillos', focus: ['Glúteo medio'],
    cue: 'Pies nunca se juntan', poses: [B13(false), B13(true)], lab: ['Base', 'Paso'],
    br: [['in', 'prepara'], ['ex', 'paso lateral']] },

  { id: '2.1', sec: 'B2', num: '2.1', name: 'Face-Pull', dose: { r: '12' }, eq: 'band', eqTxt: 'banda brazos', focus: ['Deltoides post.', 'Romboides'],
    cue: 'Junta escápulas atrás', poses: [B21(false), B21(true)], lab: ['Brazos largos', 'Jala'],
    br: [['in', 'extiende'], ['ex', 'jala']] },
  { id: '2.2', sec: 'B2', num: '2.2', name: 'Floor Press', dose: { r: '10–12' }, eq: 'db', eqTxt: '3 kg', focus: ['Pectoral', 'Tríceps'],
    cue: 'Codos a 45° del cuerpo', poses: [B22(false), B22(true)], lab: ['Abajo', 'Arriba'],
    br: [['in', 'baja'], ['ex', 'empuja']] },
  { id: '2.3', sec: 'B2', num: '2.3', name: 'Rotación externa', dose: { r: '10', side: true }, eq: 'band', eqTxt: 'banda brazos', focus: ['Manguito rotador'],
    cue: 'Codo pegado a las costillas', poses: [B23(false), B23(true)], lab: ['Adentro', 'Afuera'],
    br: [['in', 'regresa'], ['ex', 'abre']] },

  { id: '3.1', sec: 'B3', num: '3.1', name: 'Dead Bug', sub: 'Bicho muerto', dose: { r: '10–12', alt: true }, eq: 'mat', focus: ['Transverso', 'Abdomen'],
    cue: 'Brazo y pierna opuestos', poses: [DB(false), DB(true)], lab: ['Mesa', 'Estira'],
    br: [['in', 'prepara'], ['ex', 'estira']] },
  { id: '3.2', sec: 'B3', num: '3.2', name: 'Aro: aductores + torso arriba', dose: { t: '20 s', t2: '20 s' }, eq: 'ring', eqTxt: 'aro', focus: ['Aductores', 'Glúteos'],
    cue: 'Aro firme entre las rodillas', poses: [R32(false), R32(true)], lab: ['Foto 1 · 20 s', 'Foto 2 · 20 s'],
    br: [['in', 'aprieta el aro'], ['ex', 'sube el torso']] },
  { id: '3.3', sec: 'B3', num: '3.3', name: 'Aro: piernas arriba + lateral', dose: { t: '20 s', t2: '15 s', side2: true }, eq: 'ring', eqTxt: 'aro', focus: ['Transverso', 'Aductores'],
    cue: 'Aro firme entre los tobillos', poses: [R33a, R33b], lab: ['Foto 4 · 20 s', 'Foto 6 · 15 s c/lado'],
    br: [['ex', 'piernas arriba'], ['ex', 'eleva la pierna']] },

  { id: 'C1', sec: 'C', num: '1', name: 'Pectoral en marco de puerta', dose: { t: '30 s', side: true }, eq: 'door', focus: ['Pectoral'],
    cue: 'Sin dolor en el hombro', poses: [C1(false), C1(true)], lab: ['Apoya', 'Avanza'],
    br: [['in', 'apoya'], ['ex', 'abre el pecho']] },
  { id: 'C2', fitEach: true, sec: 'C', num: '2', name: 'Postura del niño + lateral', dose: { t: '30 s', t2: '15 s', side2: true }, eq: 'mat', focus: ['Lumbar', 'Dorsal ancho'],
    cue: 'Cadera a los talones', poses: [C2a, null], lab: ['Centro · 30 s', 'Lateral · 15 s c/lado'],
    br: [['ex', 'suelta'], ['in', 'alcanza']] },
  { id: 'C3', sec: 'C', num: '3', name: 'Psoas y cuádriceps', dose: { t: '30 s', side: true }, eq: 'mat', focus: ['Psoas', 'Cuádriceps'],
    cue: 'Pelvis hacia adentro', poses: [C3(false), C3(true)], lab: ['Lunge', 'Toma el pie'],
    br: [['ex', 'cadera adelante'], ['in', 'talón al glúteo']] },
  { id: 'C4', sec: 'C', num: '4', name: 'Figura 4', dose: { t: '30 s', side: true }, eq: 'mat', focus: ['Glúteo', 'Piriforme'],
    cue: 'Tobillo cruzado, pie activo', poses: [C4(false), C4(true)], lab: ['Cruza', 'Acerca'],
    br: [['in', 'cruza'], ['ex', 'muslo al pecho']] },
];

// resolver objetivos IK que dependen de las piernas (C3, C4) con 2 pasadas
const { solve } = R2;
function fixTargets(e, p, i) {
  if (!p || p.svg) return p;
  if (e.id === 'C3') {
    const anchorA = p.anchor.ankle;
    // pierna lejana (delantera) anclada al suelo → hip
    const lf = p.legF;
    const K = sub(anchorA, mul(D(lf.sh), 36)); const H = sub(K, mul(D(lf.th), 37));
    const q = Object.assign({}, p, { anchor: { hip: H } });
    delete q.anchorLeg;
    const J = solve(q);
    const fk = J.f.K;
    q.armF = { to: add(fk, [-2, -8]), bend: 1 };
    q.arm = i === 1 ? { to: add(J.n.A, [1, 1]), bend: -1, grip: true } : { to: add(fk, [-6, -9]), bend: 1 };
    q.props = JJ => (i === 0 ? curveArrow(add(JJ.H, [-6, -14]), add(JJ.H, [4, -20]), add(JJ.H, [14, -14])) + T(add(JJ.H, [-30, -32]), 'glúteo apretado', { fs: 5.4 })
      : curveArrow(add(JJ.n.A, [-14, 14]), add(JJ.n.A, [-12, -2]), add(JJ.n.A, [-2, -8])));
    return q;
  }
  if (e.id === 'C4' && i === 1) {
    const J = solve(p);
    const tgt = lerp(J.f.hip, J.f.K, 0.72);
    return Object.assign({}, p, { arm: { to: add(tgt, [0, 2]), bend: -1 }, armF: { to: add(tgt, [-1, 1]), bend: -1 } });
  }
  return p;
}

function renderAll() {
  return EX.map(e => {
    const svgs = e.poses.map((p, i) => {
      if (e.id === 'C2' && i === 1) return C2b().svg;
      const q = fixTargets(e, p, i);
      return renderPose(q).svg;
    });
    return Object.assign({}, e, { svgs });
  });
}

module.exports = { EX, renderAll, renderPose, G, AY, C2b };
