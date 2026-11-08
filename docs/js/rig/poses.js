// Poses clave de cada movimiento (mismo esqueleto para todos). La app interpola entre ellas en vivo.
// Coordenadas en un lienzo de 240×170 con el suelo en y = 152.
// keys corresponden en orden a MOVES[id].positions; `via` = índices de poses de paso (no son posiciones, sin pausa).
// morph: false → no se interpola (vistas distintas), solo fundido.
import { D, add, sub, mul, nrm, lerp, dumbbell, dbEnd, band, ring, smooth, C, P, f, inset, renderPose, solve, bezPts, braid, ribbon, limb } from './rig.js';

export const G = 152, AY = G - 3.8;
const FL = { type: 'line', y: G };
const MAT = { type: 'mat', y: G };
const M = (m, on, lvl = 1, side) => ({ m, on, lvl, side });
const along = (a, b, t) => add(a, mul(sub(b, a), t));
const thighBand = (J, side = 'n', t = 0.84, w = 9.5) => {
  const L = J[side], c = along(L.hip, L.K, t), d = nrm(sub(L.K, L.hip)), n = [d[1], -d[0]];
  return band([add(c, mul(n, w)), add(c, mul(n, -w))], 2.6);
};
const post = (x, y0 = 16, y1 = G, w = 6) => `<rect x="${x - w / 2}" y="${y0}" width="${w}" height="${y1 - y0}" rx="2.4" fill="#D9DCE6" stroke="#9AA1B5" stroke-width="0.9"/><rect x="${x - w / 2 + 1}" y="${y0}" width="1.6" height="${y1 - y0}" fill="#fff" opacity=".5"/>`;
const anchorPt = p => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="3.2" fill="#fff" stroke="#8A1F4D" stroke-width="1.3"/>`;

// ═════════════ A · ACTIVACIÓN
const catCow = cat => ({
  anchor: { hip: [100, 110] }, floor: MAT,
  torso: { a: -10.5, len: 44.5, bend: cat ? -7.5 : 5.5 },
  head: { a: cat ? 55 : -38 },
  leg: { th: 90, sh: 179, ft: 180 },
  arm: { ua: 90, fa: 90 },
  mus: cat ? [M('abs', 'torso'), M('transverse', 'torso', 2)] : [M('erectors', 'torso'), M('gluteMed', 'torso', 2)],
});
const shoulders = back => ({
  anchor: { ankle: [120, AY] }, floor: FL,
  torso: { a: back ? -91 : -88, bend: back ? 1.5 : -1.5 },
  shrug: back ? [-3.5, 2.2] : [1.5, -5],
  head: { a: -90 },
  arm: back ? { ua: 84, fa: 88 } : { ua: 96, fa: 94 },
  mus: [M('traps', 'torso'), M('rhomboids', 'torso', 2)],
});
const goodMorning = hinge => hinge ? {
  anchor: { ankle: [112, AY] }, floor: FL,
  leg: { th: 72, sh: 96, ft: 0 },
  torso: { a: -24 }, head: { a: -24 },
  arm: { ua: -10, uaS: 0.7, fa: 205 },
  mus: [M('hams', 'thigh'), M('glute'), M('erectors', 'torso', 2)],
} : {
  anchor: { ankle: [112, AY] }, floor: FL,
  leg: { th: 90, sh: 90, ft: 0 }, torso: { a: -90 }, head: { a: -90 },
  arm: { ua: -70, uaS: 0.7, fa: 160 },
  mus: [M('hams', 'thigh'), M('glute'), M('erectors', 'torso', 2)],
};
const bridge = up => ({
  anchor: { ankle: [160, AY] }, floor: MAT,
  leg: up ? { th: -21, sh: 84, ft: 0 } : { th: -48, sh: 82, ft: 0 },
  torso: { a: up ? 157 : 176 }, head: { a: 186 },
  arm: { ua: 6, fa: 3 },
  mus: [M('glute'), M('hams', 'thigh', 2), M('transverse', 'torso', 2)],
});

// ═════════════ B1 · TREN INFERIOR
const goblet = sq => sq ? {
  anchor: { ankle: [112, AY] }, floor: FL,
  leg: { th: 12, sh: 115, ft: 0 },
  torso: { a: -62 }, head: { a: -78 },
  arm: { ua: 92, fa: -50, faS: 0.95, grip: true },
  mus: [M('quads', 'thigh'), M('glute'), M('adductors', 'thigh', 2), M('gluteMed', 'torso', 2)],
  props: J => thighBand(J) + dumbbell(add(J.armn.W, [3, 0]), 90),
} : {
  anchor: { ankle: [112, AY] }, floor: FL,
  leg: { th: 90, sh: 90, ft: 0 }, torso: { a: -90 }, head: { a: -90 },
  arm: { ua: 80, fa: -68, faS: 0.9, grip: true },
  mus: [M('quads', 'thigh'), M('glute'), M('adductors', 'thigh', 2), M('gluteMed', 'torso', 2)],
  props: J => thighBand(J) + dumbbell(add(J.armn.W, [3, 0]), 90),
};
const bStance = h => h ? {
  anchor: { ankle: [130, AY] }, floor: FL,
  leg: { th: 76, sh: 95, ft: 0 },
  legF: { th: 104, sh: 103, ft: 58, fl: 0.85 },
  torso: { a: -18 }, head: { a: -22 },
  arm: { ua: 96, fa: 92, grip: true }, armF: { ua: 96, fa: 92, grip: true },
  mus: [M('hams', 'thigh', 1, 'n'), M('glute'), M('erectors', 'torso', 2)],
  props: J => dbEnd(add(J.armn.W, [1, 2])),
} : {
  anchor: { ankle: [130, AY] }, floor: FL,
  leg: { th: 90, sh: 90, ft: 0 },
  legF: { th: 99, sh: 99, ft: 58, fl: 0.85 },
  torso: { a: -90 }, head: { a: -90 },
  arm: { ua: 96, fa: 90, grip: true }, armF: { ua: 96, fa: 90, grip: true },
  mus: [M('hams', 'thigh', 1, 'n'), M('glute'), M('erectors', 'torso', 2)],
  props: J => dbEnd(add(J.armn.W, [1, 2])),
};
const monster = step => ({
  view: 'back', anchor: { hip: [120, 82] }, floor: FL,
  torso: { a: -90 }, head: { a: -90 },
  l1: { th: 103, sh: 82 },
  l2: step ? { th: 58, sh: 94 } : { th: 77, sh: 98 },
  a1: { ua: 98, fa: 90, faS: 0.3, grip: true }, a2: { ua: 82, fa: 90, faS: 0.3, grip: true },
  mus: [M('gluteMed', 'torso'), M('gluteMax', 'torso', 2)],
  props: J => { const a = J.f.A, b = J.n.A; return band([add(a, [2, 0.5]), add(lerp(a, b, 0.5), [0, 1]), add(b, [-2, 0.5])], 2.6); },
});

// ═════════════ B2 · TORSO / HOMBRO
const facePull = pull => ({
  anchor: { ankle: [96, AY] }, floor: FL,
  leg: { th: 92, sh: 90 }, legF: { th: 86, sh: 92 },
  torso: { a: -90 }, head: { a: -90 },
  shrug: pull ? [-2.5, 0] : [1.5, 0],
  arm: pull ? { ua: 182, uaS: 0.55, fa: -82, grip: true } : { ua: -6, fa: -6, grip: true },
  armF: pull ? { ua: 182, uaS: 0.55, fa: -82, grip: true } : { ua: -6, fa: -6, grip: true },
  mus: [M('deltPost', 'ua'), M('rhomboids', 'torso'), M('infra', 'torso', 2), M('traps', 'torso', 2)],
  back: () => post(226, 14),
  props: J => anchorPt([226, 32]) + band([[226, 32], add(J.armn.W, [1, -1])], 2.2),
});
// paso intermedio: el codo sube hacia la cámara antes de abrirse atrás
const facePullVia = { ...facePull(false), shrug: [0, 0], arm: { ua: -4, uaS: 0.32, fa: -48, grip: true }, armF: { ua: -4, uaS: 0.32, fa: -48, grip: true } };
const floorPress = up => ({
  anchor: { ankle: [162, AY] }, floor: MAT,
  leg: { th: -48, sh: 82, ft: 0 },
  torso: { a: 176 }, head: { a: 186 },
  arm: up ? { ua: -84, fa: -86, grip: true } : { ua: 4, uaS: 0.78, fa: -90, grip: true },
  mus: [M('pec', 'torso'), M('triceps', 'ua', 2), M('deltAnt', 'ua', 2)],
  props: J => dbEnd(add(J.armn.W, [0, -2])),
});
let insetCache = {};
function shoulderInset(model) {
  if (!insetCache[model]) {
    const back = renderPose({ view: 'back', anchor: { ankle: [120, AY] }, l1: { th: 92, sh: 91 }, l2: { th: 88, sh: 89 }, leg: { th: 90, sh: 90 }, a1: { ua: 100, fa: 94 }, a2: { ua: 80, fa: 86 }, mus: [M('infra', 'torso'), M('deltPost', 'ua', 2)] });
    insetCache[model] = back.svg.replace('<g class="fig">', '<g>');
  }
  return insetCache[model];
}
const extRot = out => ({
  view: 'front', anchor: { ankle: [124, AY] }, floor: FL,
  torso: { a: -90 }, head: { a: -90 },
  l1: { th: 93, sh: 91 }, l2: { th: 87, sh: 89 }, leg: { th: 90, sh: 90 },
  a1: { ua: 93, fa: 92 },
  a2: out ? { ua: 92, fa: 8, faS: 0.95, grip: true } : { ua: 92, fa: 178, faS: 0.95, grip: true },
  mus: [M('delt', 'ua', 2, 'n')],
  back: () => post(84, 40),
  props: J => anchorPt([84, 64]) + band([[84, 64], J.armn.W], 2.2) + `<rect x="${f(J.armn.E[0] - 7.5)}" y="${f(J.armn.E[1] - 9)}" width="5" height="8" rx="2.2" fill="#fff" stroke="#9AA3BC" stroke-width="0.8"/>`,
  overlay: (J, model) => inset(shoulderInset(model), 170, 52, 24, [106, 30, 28, 28]),
});

// ═════════════ B3 · CORE / ARO
const deadBug = ext => ({
  anchor: { hip: [130, G - 10] }, floor: MAT,
  torso: { a: 176 }, head: { a: 186 },
  leg: { th: -90, sh: 0, ft: -70, fl: 0.9 },
  legF: ext ? { th: -7, sh: -5, ft: -60, fl: 0.9 } : { th: -90, sh: 0, ft: -70, fl: 0.9, off: 1 },
  arm: { ua: -90, fa: -90 },
  armF: ext ? { ua: 196, fa: 192 } : { ua: -88, fa: -90, off: 1 },
  mus: [M('transverse', 'torso'), M('abs', 'torso', 2)],
});
const ringLift = up => up ? {
  anchor: { hip: [130, G - 12] }, floor: MAT,
  leg: { th: -48, sh: 82, ft: 0 },
  torso: { a: 214, bend: -2 }, head: { a: 240 },
  arm: { ua: 78, uaS: 0.78, fa: 0 }, armF: { ua: 78, uaS: 0.78, fa: 0 },
  mus: [M('adductors', 'thigh'), M('abs', 'torso'), M('transverse', 'torso', 2)],
  props: J => ring(add(J.n.K, [-2, 3]), 4.6, 13),
} : {
  anchor: { hip: [125.6, G - 10.4] }, floor: MAT,
  leg: { th: -48, sh: 82, ft: 0 },
  torso: { a: 176 }, head: { a: 186 }, arm: { ua: 6, fa: 3 }, armF: { ua: 6, fa: 3, off: 1 },
  mus: [M('adductors', 'thigh'), M('transverse', 'torso', 2)],
  props: J => ring(add(J.n.K, [-2, 3]), 4.6, 13),
};
const ringLegsUp = {
  anchor: { hip: [128, G - 12] }, floor: MAT,
  torso: { a: 196, bend: -3 }, head: { a: 208 },
  leg: { th: -80, sh: -80, ft: -70, fl: 0.9 },
  arm: { ua: 4, fa: 2 }, armF: { ua: 4, fa: 2 },
  mus: [M('adductors', 'thigh'), M('abs', 'torso'), M('transverse', 'torso', 2)],
  props: J => ring(add(J.n.A, [0, -1]), 4.4, 13, 90),
};
const ringSide = {
  view: 'front', anchor: { hip: [112, G - 12] }, floor: MAT,
  torso: { a: 198 }, head: { a: 205 },
  l2: { th: -30, sh: -32 }, l1: { th: 2, sh: 1 },
  a1: { ua: 90, uaS: 0.5, fa: 0, faS: 0.9 }, a2: { to: [88, G - 5], bend: 1 },
  order: ['legf', 'armf', 'legn', 'neck', 'torso', 'head', 'armn'],
  mus: [M('abductors', 'thigh', 1, 'n'), M('adductors', 'thigh', 2, 'f'), M('obliques', 'torso', 2)],
  props: J => { const a = J.n.A, b = J.f.A, m = lerp(a, b, 0.5); return ring(m, 4.4, Math.max(8, Math.abs(b[1] - a[1]) / 2 + 3)); },
};

// ═════════════ C · DESCOMPRESIÓN
const F = 150;
const doorFrame = () => `<rect x="${F - 5.5}" y="6" width="11" height="${G - 6}" rx="2" fill="#EBDCC3" stroke="#B89B6E" stroke-width="0.9"/><rect x="${F - 5.5}" y="6" width="3" height="${G - 6}" fill="#D8C29F"/>`;
const doorway = step => step ? {
  anchor: { ankle: [F + 50, AY] }, floor: FL,
  leg: { th: 32, sh: 100, ft: 0 },
  legF: { th: 128, sh: 126, ft: 40, fl: 0.9, thS: 0.98, shS: 0.98 },
  torso: { a: -88 }, head: { a: -88 },
  arm: { to: [F + 1, 30], bend: 1 }, armF: { ua: 98, fa: 95 },
  back: doorFrame,
  mus: [M('pec', 'torso'), M('deltAnt', 'ua', 2)],
} : {
  anchor: { ankle: [F + 10, AY] }, floor: FL,
  leg: { th: 90, sh: 90, ft: 0 }, legF: { th: 96, sh: 94, ft: 0 },
  torso: { a: -90 }, head: { a: -90 },
  arm: { to: [F + 1, 30], bend: 1 }, armF: { ua: 96, fa: 94 },
  back: doorFrame,
  mus: [M('pec', 'torso'), M('deltAnt', 'ua', 2)],
};
const childCenter = {
  anchor: { hip: [94, 136] }, floor: MAT,
  leg: { th: 17, sh: 182, ft: 180 },
  torso: { a: 2, len: 42, bend: -2.5 }, head: { a: 25 },
  arm: { ua: 18, fa: 4 },
  order: ['legf', 'legn', 'glute', 'armf', 'neck', 'torso', 'head', 'armn'],
  mus: [M('erectors', 'torso'), M('lats', 'torso', 2)],
};
// vista cenital (no interpolable): alcance lateral
function childTop() {
  const sk = C.skin, sl = C.skinLn, cl = C.cloth || C.shorts;
  let s = `<rect x="4" y="12" width="232" height="146" rx="10" fill="${C.mat}" stroke="${C.matLn}" stroke-width="1"/><g class="fig">`;
  const leg = (y, far) => `<path d="${smooth([[30, y - 6], [74, y - 9], [80, y], [74, y + 9], [30, y + 6], [24, y]])}" fill="${far ? (C.shortsF || C.clothF) : (C.shorts || C.cloth)}" stroke="${C.clothLn}" stroke-width="0.9"/>`;
  s += `<path d="${smooth([[14, 79], [26, 75], [30, 82], [18, 86]])}" fill="${sk}" stroke="${sl}" stroke-width="0.8"/><path d="${smooth([[14, 109], [26, 113], [30, 106], [18, 102]])}" fill="${sk}" stroke="${sl}" stroke-width="0.8"/>`;
  s += leg(82, true) + leg(106, false);
  s += `<ellipse cx="84" cy="94" rx="19" ry="23" fill="${C.shorts || C.cloth}" stroke="${C.clothLn}" stroke-width="0.9"/>`;
  const tor = [[90, 74], [118, 66], [146, 52], [164, 48], [170, 62], [160, 80], [132, 98], [100, 114], [88, 104]];
  const td = smooth(tor);
  s += `<clipPath id="c2t"><path d="${td}"/></clipPath><path d="${td}" fill="${sk}"/>`;
  s += `<g clip-path="url(#c2t)"><path d="M80 60 L130 40 L136 120 L80 130Z" fill="${cl}"/><path d="M140 30 L170 30 L174 90 L144 100Z" fill="${cl}"/>`;
  const lat = [[108, 104], [132, 94], [156, 78], [164, 70], [150, 74], [126, 86], [104, 96]];
  s += `<path d="${smooth(lat)}" fill="${C.mus}" stroke="${C.musLn}" stroke-width="0.7"/>`;
  for (let k = 0; k < 6; k++) s += `<path d="M${108 + k * 9} ${104 - k * 5} L${116 + k * 9} ${92 - k * 5}" stroke="${C.musFib}" stroke-width="0.55"/>`;
  s += `<path d="${smooth([[96, 96], [120, 86], [138, 76], [136, 70], [118, 80], [96, 88]])}" fill="${C.mus2}" stroke="${C.mus2Ln}" stroke-width="0.6"/>`;
  s += `</g><path d="${td}" fill="none" stroke="${C.clothLn}" stroke-width="0.9"/>`;
  const arm = (a, b, far) => { const sh = limb(a, b, [[0, 5], [0.4, 4.4], [1, 3]], [[0, 5], [0.4, 4.4], [1, 3]]); return `<path d="${sh.d}" fill="${far ? C.skinF : sk}" stroke="${sl}" stroke-width="0.85"/>`; };
  s += arm([150, 50], [200, 26], true) + `<ellipse cx="203" cy="24" rx="5" ry="3.4" transform="rotate(-25 203 24)" fill="${C.skinF}" stroke="${sl}" stroke-width="0.8"/>`;
  s += arm([164, 74], [214, 50], false) + `<ellipse cx="217" cy="48" rx="5" ry="3.4" transform="rotate(-25 217 48)" fill="${sk}" stroke="${sl}" stroke-width="0.8"/>`;
  if (C.cloth && !C.shorts) s += `<path d="${ribbon(bezPts([170, 62], [160, 66], [150, 70], [138, 72], 8), 3.4, 1.2)}" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.8"/>`;
  s += `<ellipse cx="176" cy="60" rx="11" ry="10" fill="${C.hair}" stroke="${C.hairLn}" stroke-width="0.9"/><path d="${smooth([[170, 53], [178, 52], [184, 58]], false)}" stroke="${C.hairHi}" stroke-width="1" fill="none"/>`;
  if (!C.shorts) s += braid(bezPts([184, 54], [180, 60], [174, 62], [168, 62], 6), 1.1, C.hairHi);
  return s + `</g>`;
}
// dependientes de IK (se resuelven con el propio cuerpo)
function hipFlexor(hold) {
  const legF = { th: 2, sh: 92, ft: 0 };
  const A0 = [F + 4, AY], K = sub(A0, mul(D(legF.sh), 36)), H = sub(K, mul(D(legF.th), 37));
  const p = {
    anchor: { hip: H }, floor: MAT, legF,
    leg: hold ? { th: 96, sh: -128, ft: -140, fl: 0.9 } : { th: 100, sh: 179, ft: 182, fl: 0.95 },
    torso: { a: hold ? -88 : -90 }, head: { a: -90 },
    mus: [M('psoas', 'torso'), M('rectus', 'thigh', 1, 'n'), M('quads', 'thigh', 2, 'n')],
  };
  const J = solve({ ...p, arm: { ua: 90, fa: 90 } });
  p.armF = { to: add(J.f.K, [-2, -8]), bend: 1 };
  p.arm = hold ? { to: add(J.n.A, [1, 1]), bend: -1, grip: true } : { to: add(J.f.K, [-6, -9]), bend: 1 };
  return p;
}
function figure4(pull) {
  const p = pull ? {
    anchor: { hip: [128, G - 10] }, floor: MAT,
    torso: { a: 176 }, head: { a: 194 },
    leg: { th: -116, sh: -18, shS: 0.38, ft: -50, fl: 0.9 },
    legF: { th: -96, sh: 6, ft: -20 },
    mus: [M('glute'), M('piriformis', 'torso')],
  } : {
    anchor: { hip: [128, G - 10] }, floor: MAT,
    torso: { a: 176 }, head: { a: 186 },
    leg: { th: -74, sh: 26, shS: 0.46, ft: -50, fl: 0.9 },
    legF: { th: -48, sh: 82, ft: 0 },
    arm: { ua: 6, fa: 3 }, armF: { ua: 6, fa: 3, off: 1 },
    mus: [M('glute'), M('piriformis', 'torso')],
  };
  if (pull) { const J = solve({ ...p, arm: { ua: 6, fa: 3 } }); const t = lerp(J.f.hip, J.f.K, 0.72); p.arm = { to: add(t, [0, 2]), bend: -1 }; p.armF = { to: add(t, [-1, 1]), bend: -1, off: 0 }; }
  return p;
}

export const RIG = {
  'cat-cow': { keys: () => [catCow(false), catCow(true)] },
  'shoulder-circles': { keys: () => [shoulders(false), shoulders(true)] },
  'good-morning': { keys: () => [goodMorning(false), goodMorning(true)] },
  'glute-bridge-iso': { keys: () => [bridge(false), bridge(true)] },
  'goblet-squat': { keys: () => [goblet(false), goblet(true)] },
  'b-stance-rdl': { keys: () => [bStance(false), bStance(true)] },
  'monster-walk': { keys: () => [monster(false), monster(true)] },
  'face-pull': { keys: () => [facePull(false), facePullVia, facePull(true)], via: [1] },
  'floor-press': { keys: () => [floorPress(false), floorPress(true)] },
  'band-external-rotation': { keys: () => [extRot(false), extRot(true)] },
  'dead-bug': { keys: () => [deadBug(false), deadBug(true)] },
  'ring-adductor-lift': { keys: () => [ringLift(false), ringLift(true)] },
  'ring-legs-side': { keys: () => [ringLegsUp, ringSide], morph: false },
  'doorway-pec': { keys: () => [doorway(false), doorway(true)] },
  'child-pose-lateral': { keys: () => [childCenter, { custom: childTop }], morph: false },
  'kneeling-hip-flexor': { keys: () => [hipFlexor(false), hipFlexor(true)] },
  'figure-4': { keys: () => [figure4(false), figure4(true)] },
};
