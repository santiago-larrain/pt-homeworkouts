const { renderAll, renderPose, G, AY } = require('./poses2');
const R2 = require('./rig2');
const { fit } = require('./fit');
const { chromium } = require('playwright');
const fs = require('fs');

const SEC = {
  A: { key: 'A', badge: 'A', title: 'Activación', sub: 'Articulaciones y sistema nervioso listos · sin saltos', col: '#129FB5', soft: '#E7F6F9', chips: [['clock', '3 min'], ['timer', '45 s c/u'], ['list', 'en orden 1 → 4']] },
  B1: { key: 'B1', badge: '1', title: 'Tren inferior', sub: 'Glúteos y muslos', col: '#1E9E57', soft: '#E8F6EE', tri: true, chips: [['clock', '≈ 9 min'], ['loop', '3 rondas'], ['pause', '45–60 s']] },
  B2: { key: 'B2', badge: '2', title: 'Torso postural', sub: 'Espalda, pecho y hombro protegido', col: '#3566E8', soft: '#EBF0FD', tri: true, chips: [['clock', '≈ 9 min'], ['loop', '3 rondas'], ['pause', '45–60 s']] },
  B3: { key: 'B3', badge: '3', title: 'Core & Pilates con aro', sub: 'Core profundo y piernas', col: '#8452EE', soft: '#F2ECFE', tri: true, chips: [['clock', '≈ 9 min'], ['loop', '3 rondas'], ['pause', '45–60 s']] },
  C: { key: 'C', badge: 'C', title: 'Descompresión', sub: 'Elongación para compensar las horas de estudio', col: '#D9558F', soft: '#FCEBF3', chips: [['clock', '4 min'], ['timer', 'mantén, sin rebotes'], ['list', 'en orden 1 → 4']] },
};

// ───────── iconos
const IC = {
  clock: c => `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="13" r="8" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M12 9v4l3 2M9 3h6" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  timer: c => `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="13" r="8" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M12 13V8.5" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M12 5a8 8 0 0 1 8 8h-8z" fill="${c}" opacity=".25"/><path d="M10 2.5h4M19 5.5l1.5-1.5" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  loop: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6" fill="none" stroke="${c}" stroke-width="2.3" stroke-linecap="round"/><path d="M18.5 2.5v4.2h-4.2M5.5 21.5v-4.2h4.2" fill="none" stroke="${c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pause: c => `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M10 8.5v7M14 8.5v7" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  list: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M9 6h11M9 12h11M9 18h11" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><circle cx="4.5" cy="6" r="1.7" fill="${c}"/><circle cx="4.5" cy="12" r="1.7" fill="${c}"/><circle cx="4.5" cy="18" r="1.7" fill="${c}"/></svg>`,
  reps: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M5 12a7 7 0 0 1 12-4.9" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M17.5 3v4.5H13" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 12a7 7 0 0 1-12 4.9" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M6.5 21v-4.5H11" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  sides: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" fill="none" stroke="${c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  db: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M7 12h10" stroke="${c}" stroke-width="2.4"/><rect x="3" y="7" width="4.5" height="10" rx="1.5" fill="${c}"/><rect x="16.5" y="7" width="4.5" height="10" rx="1.5" fill="${c}"/></svg>`,
  band: c => `<svg viewBox="0 0 24 24" class="ic"><ellipse cx="12" cy="12" rx="9" ry="5" fill="none" stroke="${c}" stroke-width="3"/></svg>`,
  ring: c => `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="7.5" fill="none" stroke="${c}" stroke-width="2.6"/><rect x="9.5" y="1.8" width="5" height="4" rx="1.5" fill="${c}"/><rect x="9.5" y="18.2" width="5" height="4" rx="1.5" fill="${c}"/></svg>`,
  mat: c => `<svg viewBox="0 0 24 24" class="ic"><rect x="2.5" y="9" width="19" height="7" rx="3.5" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="18" cy="12.5" r="2" fill="${c}"/></svg>`,
  door: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M6 21V3h12v18" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/><path d="M3 21h18" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  none: c => `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="5" r="2.6" fill="${c}"/><path d="M12 8v7M8 11h8M12 15l-3 6M12 15l3 6" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  inhale: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M3 8h9a3 3 0 1 0-3-3M3 13h14a3 3 0 1 1-3 3M3 18h6" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  check: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  heart: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="${c}"/></svg>`,
  cal: c => `<svg viewBox="0 0 24 24" class="ic"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  shield: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  spine: c => `<svg viewBox="0 0 24 24" class="ic">${[4, 8.5, 13, 17.5].map(y => `<rect x="8" y="${y}" width="8" height="3.2" rx="1.4" fill="${c}"/>`).join('')}<path d="M12 2v20" stroke="${c}" stroke-width="1" opacity=".5"/></svg>`,
  flame: c => `<svg viewBox="0 0 24 24" class="ic"><path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.3 2.4-5.2 3.6-8.3 1.6 1.4 2.2 3 2.2 4.4 1.2-.8 2-2.4 2-4.4 2.8 2.2 5.2 5.2 5.2 8.5 0 3.4-2.6 6-6.5 6z" fill="${c}"/></svg>`,
};
const BRC = { in: { w: 'INHALA', c: '#2E64D8', bg: '#E4ECFC' }, ex: { w: 'EXHALA', c: '#D9541A', bg: '#FDE8DC' } };
const EQ = { mat: ['mat', 'mat'], none: ['none', 'sin peso'], db: ['db', ''], 'db+band': ['db', ''], band: ['band', ''], ring: ['ring', 'aro de Pilates'], door: ['door', 'marco de puerta'] };

function doseHTML(e, col) {
  const d = e.dose;
  if (d.r) {
    return `<div class="dose"><div class="big" style="color:${col}">${d.r.replace('–', '<span class="dash">–</span>')}</div><div class="unit">${IC.reps(col)}<span>${/pasos/.test(d.r) ? '' : 'reps'}</span>${d.side ? `<span class="pill" style="border-color:${col};color:${col}">${IC.sides(col)}c/lado</span>` : ''}${d.alt ? `<span class="pill" style="border-color:${col};color:${col}">${IC.sides(col)}alternado</span>` : ''}</div></div>`;
  }
  const t2 = d.t2 ? `<span class="plus">+</span><span class="big2" style="color:${col}">${d.t2}</span>` : '';
  return `<div class="dose">${IC.timer(col)}<div class="big" style="color:${col}">${d.t}</div>${t2}<div class="unit">${d.hold ? `<span class="pill" style="border-color:${col};color:${col}">sostén ${d.hold}</span>` : ''}${d.side ? `<span class="pill" style="border-color:${col};color:${col}">${IC.sides(col)}c/lado</span>` : ''}${d.side2 ? `<span class="pill" style="border-color:${col};color:${col}">${IC.sides(col)}lateral c/lado</span>` : ''}</div></div>`;
}

function rowHTML(e, S, vb, idx, n) {
  const col = S.col;
  const eq = EQ[e.eq];
  const eqTxt = e.eqTxt || eq[1];
  const figs = e.svgs.map((s, i) => {
    const v = vb[e.id + '#' + i] || vb[e.id];
    const [t, verb] = e.br[i], b = BRC[t];
    return `<div class="fig"><div class="card"><svg viewBox="${v.map(x => x.toFixed(1)).join(' ')}" preserveAspectRatio="xMidYMid meet">${s.replace(/__K__/g, (v[2] / 240 * 1.45).toFixed(3))}</svg>
      <div class="lab"><span class="stp" style="background:${col}">${i + 1}</span>${e.lab[i]}</div></div>
      <div class="breath" style="background:${b.bg};color:${b.c}">${IC.inhale(b.c)}<b>${b.w}</b><i>${verb}</i></div></div>`;
  });
  const mid = `<div class="mid">${e.dose.r ? `<svg viewBox="0 0 24 40"><path d="M4 14 C 8 6, 16 6, 20 14" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/><path d="M16.5 13.5 L20 14 L20.6 10.3" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 26 C 16 34, 8 34, 4 26" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/><path d="M7.5 26.5 L4 26 L3.4 29.7" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` : `<svg viewBox="0 0 24 40"><path d="M4 20 H19" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/><path d="M14 14.5 L20 20 L14 25.5" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`}</div>`;
  const rail = S.tri ? `<div class="rail"><div class="node" style="background:${col}">${idx + 1}</div>${idx < n - 1 ? `<div class="line" style="background:${col}"></div><div class="down" style="border-top-color:${col}"></div>` : `<div class="line end" style="background:${col}"></div>`}</div>` : '';
  return `<section class="row">${rail}<div class="info">
      <div class="num" style="background:${col}">${e.num}</div>
      <h3>${e.name}</h3>${e.sub ? `<div class="sub">${e.sub}</div>` : ''}
      ${doseHTML(e, col)}
      <div class="eq">${IC[eq[0]]('#4A5068')}<span>${eqTxt}</span></div>
      <div class="focus">${e.focus.map((f, k) => `<span><u class="${k ? 's' : ''}"></u>${f}</span>`).join('')}</div>
      <div class="cue">${IC.check(col)}<span>${e.cue}</span></div>
    </div>${figs[0]}${mid}${figs[1]}</section>`;
}

function roundsStrip(S, ids) {
  const col = S.col;
  const r = k => `<div class="rnd"><div class="rlab">Ronda ${k}</div><div class="boxes">${ids.map(i => `<div class="bx" style="border-color:${col}"><span>${i}</span></div>`).join('')}</div></div>`;
  const rest = `<div class="rest">${IC.pause(col)}<span>45–60 s</span></div>`;
  return `<div class="rounds" style="border-color:${col}"><div class="rtitle" style="color:${col}">${IC.loop(col)}<div><b>Tri-set</b><small>sin pausa entre ejercicios</small></div></div>${r(1)}${rest}${r(2)}${rest}${r(3)}<div class="done" style="background:${col}">${IC.check('#fff')}<span>siguiente bloque</span></div></div>`;
}

function legend() {
  return `<footer><span><u></u>músculo en foco</span><span><u class="s"></u>apoyo</span><span><b class="bi">INHALA</b> / <b class="be">EXHALA</b> para llegar a esa posición</span><span class="ar"><svg viewBox="0 0 30 10"><path d="M2 5h22" stroke="#2B4C9B" stroke-width="2.4" stroke-linecap="round"/><path d="M20 1.5L25 5l-5 3.5" fill="none" stroke="#2B4C9B" stroke-width="2.4" stroke-linecap="round"/></svg>movimiento</span></footer>`;
}

function sectionPage(S, exs, vb, pageNo) {
  const rows = exs.map((e, i) => rowHTML(e, S, vb, i, exs.length)).join('');
  return `<div class="page secp ${S.tri ? 'tri' : 'flat'}" style="--c:${S.col};--soft:${S.soft}">
    <header><div class="hb">${S.badge}</div><div class="ht"><small>DYNAMIC RESET 3×3 · ${S.tri ? 'BLOQUE PRINCIPAL' : (S.key === 'A' ? 'INICIO' : 'CIERRE')}</small><h1>${S.title}</h1><p>${S.sub}</p></div>
      <div class="hc">${S.chips.map(([i, t]) => `<span>${IC[i]('#fff')}${t}</span>`).join('')}</div></header>
    <div class="rows">${rows}</div>
    ${S.tri ? roundsStrip(S, exs.map(e => e.num)) : ''}
    ${legend()}<div class="pno">${pageNo}</div></div>`;
}

// ───────── PORTADA
function coverFigure() {
  const o = R2.renderPose({ view: 'front', hairDown: true, anchor: { ankle: [120, AY] }, l1: { th: 95, sh: 91 }, l2: { th: 85, sh: 89 }, leg: { th: 90, sh: 90 }, a1: { to: [107, 73], bend: 1, grip: true }, a2: { to: [133, 73], bend: -1, grip: true }, order: ['hairback', 'legf', 'legn', 'neck', 'torso', 'necklace', 'head', 'armf', 'armn'] });
  return `<ellipse cx="120" cy="${G + 1}" rx="26" ry="3.4" fill="#1B2A55" opacity="0.12"/>` + o.svg;
}
function leaf(x, y, s, rot, col) {
  let p = `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round"><path d="M0 0 C 30 -10, 70 -6, 100 10"/>`;
  for (let i = 1; i < 9; i++) { const t = i / 9, px = t * 100, py = -8 * Math.sin(t * Math.PI) + t * 10; p += `<path d="M${px} ${py} q ${8 - t * 4} ${-18 + t * 6}, ${16 - t * 6} ${-24 + t * 10}"/><path d="M${px} ${py} q ${10 - t * 4} ${14 - t * 4}, ${20 - t * 6} ${18 - t * 6}"/>`; }
  return p + '</g>';
}
function coverPage() {
  const fig = coverFigure();
  return `<div class="page cover">
    <svg class="bgdeco" viewBox="0 0 210 297" preserveAspectRatio="none">
      <circle cx="170" cy="70" r="70" fill="#FBE3D2"/><circle cx="30" cy="250" r="60" fill="#E7E0FB"/><circle cx="190" cy="250" r="34" fill="#DDF3EC"/>
      ${leaf(150, 20, 0.42, 20, '#9CC9B4')}${leaf(-10, 205, 0.38, -15, '#B9AEE8')}
    </svg>
    <div class="ctop"><div class="kick">Programa personal de entrenamiento</div>
      <h1>Dynamic<br>Reset <span>3×3</span></h1>
      <div class="hand">la guía de Anita</div>
      <p class="obj">Postura sana · hombro protegido · cuerpo fuerte y constante</p></div>
    <div class="cfig"><svg viewBox="78 4 84 156">${fig}</svg></div>
    <div class="cstats">
      <div>${IC.cal('#2B2F4A')}<b>2×</b><span>por semana</span></div>
      <div>${IC.clock('#2B2F4A')}<b>35–40</b><span>minutos</span></div>
      <div>${IC.loop('#2B2F4A')}<b>3 × 3</b><span>bloques × rondas</span></div>
    </div>
    <div class="cblocks">
      ${['A', 'B1', 'B2', 'B3', 'C'].map(k => `<div style="--c:${SEC[k].col}"><i>${SEC[k].badge}</i><span>${SEC[k].title}</span></div>`).join('<em>›</em>')}
    </div>
  </div>`;
}


function muscleMap() {
  const M = (m, on, lvl = 1) => ({ m, on, lvl });
  const base = { anchor: { ankle: [0, AY] }, l1: { th: 94, sh: 91 }, l2: { th: 86, sh: 89 }, leg: { th: 90, sh: 90 }, a1: { ua: 100, fa: 94 }, a2: { ua: 80, fa: 86 } };
  const fp = Object.assign({}, base, { view: 'front', anchor: { ankle: [78, AY] }, mus: [M('pec'), M('transverse'), M('delt', 'ua'), M('quads', 'thigh'), M('adductors', 'thigh', 2)] });
  const bp = Object.assign({}, base, { view: 'back', anchor: { ankle: [196, AY] }, mus: [M('traps'), M('rhomboids', 'torso', 2), M('infra'), M('lats', 'torso', 2), M('erectors'), M('gluteMed', 'torso', 2), M('gluteMax'), M('hams', 'thigh'), M('calf', 'shin', 2), M('deltPost', 'ua', 2)] });
  const F = R2.renderPose(fp), Bk = R2.renderPose(bp);
  const J = F.J, K = Bk.J, L = R2.lerp;
  const lab = (pt, x, y, t, anchor) => `<path d="M${pt[0].toFixed(1)} ${pt[1].toFixed(1)} L${(x + (anchor === 'end' ? 2 : -2)).toFixed(1)} ${(y - 2).toFixed(1)}" stroke="#59607F" stroke-width="0.5"/><circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="1" fill="#262A40"/><text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Nunito" font-weight="800" font-size="5.6" fill="#262A40">${t}</text>`;
  let s = F.svg + Bk.svg;
  s += lab(J.torso.map(0.78, 0.45), 104, 36, 'Pectoral', 'start');
  s += lab(L(J.armn.S, J.armn.E, 0.15), 104, 26, 'Deltoides', 'start');
  s += lab(J.torso.map(0.35, -0.5), 50, 64, 'Transverso (core)', 'end');
  s += lab(L(J.n.hip, J.n.K, 0.55), 104, 128, 'Cuádriceps', 'start');
  s += lab(add2(L(J.f.hip, J.f.K, 0.3), [3, 0]), 50, 94, 'Aductores', 'end');
  s += lab(K.torso.map(0.95, 0.35), 222, 30, 'Trapecio', 'start');
  s += lab(K.torso.map(0.85, -0.25), 168, 32, 'Romboides', 'end');
  s += lab(K.torso.map(0.78, 0.62), 222, 42, 'Manguito rotador', 'start');
  s += lab(K.torso.map(0.55, -0.75), 168, 54, 'Dorsal ancho', 'end');
  s += lab(K.torso.map(0.4, 0.18), 222, 60, 'Erectores', 'start');
  s += lab(K.torso.map(0.22, -0.78), 168, 74, 'Glúteo medio', 'end');
  s += lab(K.torso.map(0.08, 0.5), 222, 82, 'Glúteo mayor', 'start');
  s += lab(L(K.f.hip, K.f.K, 0.55), 168, 104, 'Isquiotibiales', 'end');
  s += lab(L(K.n.K, K.n.A, 0.3), 222, 120, 'Gemelos', 'start');
  s += `<text x="78" y="166" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="7" fill="#9AA0B8">DE FRENTE</text><text x="196" y="166" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="7" fill="#9AA0B8">DE ESPALDA</text>`;
  return `<svg viewBox="0 0 270 170" class="mmap">${s.replace(/__K__/g, '1')}</svg>`;
}
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];

// ───────── CÓMO USAR
function howPage(sample, vbs) {
  const seg = [['A', 3, 'Activación'], ['B1', 9, 'Bloque 1'], ['B2', 9, 'Bloque 2'], ['B3', 9, 'Bloque 3'], ['C', 4, 'Elongar']];
  const tot = seg.reduce((a, s) => a + s[1], 0);
  const v = vbs;
  return `<div class="page how">
    <header class="hh"><small>ANTES DE EMPEZAR</small><h1>Cómo usar tu guía</h1></header>
    <h2>Tu sesión de un vistazo</h2>
    <div class="timeline">${seg.map(([k, m, t], i) => `<div style="flex:${m};--c:${SEC[k].col}"><b>${SEC[k].badge}</b><span>${t}</span><small>${m === 9 ? '≈ 9' : m} min</small><em>pág. ${i + 3}</em></div>`).join('')}</div>
    <div class="howgrid">
      <div class="anat">
        <h2>Cómo leer cada ejercicio</h2>
        <div class="demo">
          <div class="dcard"><svg viewBox="${v.map(x => x.toFixed(1)).join(' ')}">${sample.replace(/__K__/g, (v[2] / 240 * 1.45).toFixed(3))}</svg></div>
          <div class="call c1"><i>1</i><span><b>Número = orden.</b> 1 → 2 son las dos posiciones del movimiento.</span></div>
          <div class="call c2"><i>2</i><span><b>Naranja</b> = el músculo que debes sentir trabajar. <b>Amarillo</b> = músculo de apoyo.</span></div>
          <div class="call c3"><i>3</i><span><b>Flechas azules</b> = hacia dónde te mueves.</span></div>
          <div class="call c4"><i>4</i><span><b>Etiqueta blanca</b> = la clave técnica más importante.</span></div>
        </div>
        <div class="breathrow"><div class="breath" style="background:${BRC.in.bg};color:${BRC.in.c}">${IC.inhale(BRC.in.c)}<b>INHALA</b><i>baja</i></div><span>La etiqueta bajo cada dibujo te dice cómo respirar <b>para llegar a esa posición</b>. Regla simple: <b>exhala en el esfuerzo</b>, inhala al volver.</span></div>
      </div>
      <div class="tri">
        <h2>Así funcionan los tri-sets</h2>
        <svg viewBox="0 0 200 170" class="loopsvg">
          <circle cx="100" cy="82" r="52" fill="none" stroke="#D5DAE8" stroke-width="10"/>
          ${[[-90, '1'], [30, '2'], [150, '3']].map(([a, t], i) => { const x = 100 + 52 * Math.cos(a * Math.PI / 180), y = 82 + 52 * Math.sin(a * Math.PI / 180); return `<circle cx="${x}" cy="${y}" r="17" fill="#1E9E57"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="19" fill="#fff">${t}</text>`; }).join('')}
          ${[[-55, -5], [65, 115], [185, 235]].map(([a0, a1]) => { const p = a => [100 + 52 * Math.cos(a * Math.PI / 180), 82 + 52 * Math.sin(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `<path d="M${x0} ${y0} A52 52 0 0 1 ${x1} ${y1}" fill="none" stroke="#1E9E57" stroke-width="3" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="3.5" fill="#1E9E57"/>`; }).join('')}
          <text x="100" y="78" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="22" fill="#2B2F4A">×3</text>
          <text x="100" y="96" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="10" fill="#59607F">rondas</text>
          <g transform="translate(150 140)"><rect x="-40" y="-12" width="80" height="24" rx="12" fill="#fff" stroke="#59607F" stroke-width="1.5"/><text x="0" y="5" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="10" fill="#59607F">pausa 45–60 s</text></g>
          <path d="M120 128 Q 130 140 112 136" fill="none" stroke="#59607F" stroke-width="1.5"/>
        </svg>
        <ol class="steps"><li>Haz <b>1 → 2 → 3</b> seguidos, sin pausa.</li><li>Descansa <b>45–60 s</b> y marca la ronda ☑.</li><li>Repite hasta <b>3 rondas</b>. Luego pasa al siguiente bloque.</li></ol>
      </div>
    </div>
    <div class="lower">
      <div><h2>Los músculos de tu programa</h2>${muscleMap()}</div>
      <div><h2>Reglas de oro</h2><div class="rules">
      <div>${IC.shield('#3566E8')}<p><b>Hombro sin dolor</b><span>Rango cómodo siempre. Si aparece dolor agudo, para y achica el movimiento.</span></p></div>
      <div>${IC.spine('#129FB5')}<p><b>Calidad &gt; velocidad</b><span>Lento y controlado, columna larga, abdomen activo.</span></p></div>
      <div>${IC.flame('#D9541A')}<p><b>Progresa</b><span>¿12 reps fáciles en las 3 rondas? Sube el peso o usa una banda más dura.</span></p></div>
      <div>${IC.heart('#D9558F')}<p><b>Constancia</b><span>2 sesiones por semana, todas las semanas. Eso es lo que transforma.</span></p></div>
      </div></div>
    </div>
    <div class="pno">2</div>
  </div>`;
}

// ───────── REGISTRO
function trackerPage() {
  const weeks = 12;
  const head = `<tr><th>Semana</th><th>Sesión</th><th>Fecha</th><th class="cA">A</th><th class="c1">1</th><th class="c2">2</th><th class="c3">3</th><th class="cC">C</th><th>Peso / banda</th><th>¿Cómo me sentí?</th></tr>`;
  let rows = '';
  for (let w = 1; w <= weeks; w++) for (let s = 1; s <= 2; s++) {
    rows += `<tr class="${s === 2 ? 'b' : ''}">${s === 1 ? `<td rowspan="2" class="wk">${w}</td>` : ''}<td class="ss">${s}</td><td class="dt">___ / ___</td>${['A', '1', '2', '3', 'C'].map(k => `<td><span class="cb"></span></td>`).join('')}<td class="ln"></td><td class="mood">😣 😐 🙂 😄</td></tr>`;
  }
  return `<div class="page track"><header class="hh"><small>TU PROGRESO</small><h1>Registro de sesiones</h1></header>
    <p class="tp">Marca cada bloque al terminarlo. Anota el peso o la banda que usaste para ver cómo avanzas.</p>
    <table>${head}${rows}</table>
    <div class="pno">8</div></div>`;
}

const CSS = `
@page{size:210mm 297mm;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:Nunito,sans-serif;color:#262A40;-webkit-print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:9mm 9mm 7mm;position:relative;page-break-after:always;background:#fff;overflow:hidden;display:flex;flex-direction:column;gap:2.6mm}
.ic{width:1em;height:1em;flex:none}
.pno{position:absolute;bottom:4.2mm;right:9mm;font:700 7pt Nunito;color:#9AA0B8}
/* header secciones */
.secp header{display:flex;align-items:center;gap:4mm;background:var(--c);color:#fff;border-radius:6mm;padding:3.2mm 5mm;flex:none}
.hb{width:15mm;height:15mm;border-radius:50%;background:#fff;color:var(--c);font:600 24pt/15mm Fredoka;text-align:center;flex:none}
.ht small{font:800 6.5pt Nunito;letter-spacing:.16em;opacity:.85}.ht h1{margin:.3mm 0 0;font:600 21pt/1 Fredoka}.ht p{margin:1mm 0 0;font-size:8.5pt;font-weight:600;opacity:.92}
.hc{margin-left:auto;display:flex;flex-direction:column;gap:1.2mm}.hc span{display:flex;align-items:center;gap:1.6mm;background:rgba(255,255,255,.18);border-radius:99px;padding:1mm 3mm;font:800 8pt Nunito;white-space:nowrap}.hc .ic{width:3.6mm;height:3.6mm}
.rows{flex:1;display:flex;flex-direction:column;gap:2.4mm;min-height:0}
.row{flex:1;min-height:0;display:flex;align-items:stretch;gap:2mm;background:var(--soft);border-radius:5mm;padding:2.4mm}
.rail{width:7mm;flex:none;display:flex;flex-direction:column;align-items:center;position:relative}
.rail .node{width:7mm;height:7mm;border-radius:50%;color:#fff;font:600 11pt/7mm Fredoka;text-align:center;margin-top:1mm}
.rail .line{width:.8mm;flex:1;margin-bottom:-4mm;border-radius:1mm;opacity:.55}.rail .line.end{flex:1;opacity:.25}
.rail .down{width:0;height:0;border-left:2mm solid transparent;border-right:2mm solid transparent;border-top:2.4mm solid;position:absolute;bottom:-3.6mm}
.info{width:44mm;flex:none;display:flex;flex-direction:column;gap:1.3mm;padding:.5mm 0}
.num{align-self:flex-start;color:#fff;font:600 11pt Fredoka;border-radius:99px;padding:.3mm 3mm}
.info h3{margin:0;font:600 12.5pt/1.08 Fredoka;color:#23263A}.info .sub{font-size:7.5pt;color:#6B7290;font-weight:700;margin-top:-1mm}
.dose{display:flex;align-items:center;flex-wrap:wrap;gap:1mm 1.5mm}.dose>.ic{width:6mm;height:6mm}
.dose .big{font:600 21pt/1 Fredoka;letter-spacing:-.01em}.dose .big .dash{font-weight:400;margin:0 .3mm}.dose .big2{font:600 15pt/1 Fredoka}.dose .plus{font:600 12pt Fredoka;color:#9AA0B8}
.dose .unit{display:flex;align-items:center;gap:1.2mm;font:800 7.5pt Nunito;color:#59607F;flex-wrap:wrap}.dose .unit .ic{width:3.6mm;height:3.6mm}
.pill{display:inline-flex;align-items:center;gap:.8mm;border:.35mm solid;border-radius:99px;padding:.1mm 1.8mm;background:#fff;font:800 7pt Nunito}
.eq{display:flex;align-items:center;gap:1.4mm;font:700 7.6pt Nunito;color:#4A5068}.eq .ic{width:4.2mm;height:4.2mm}
.focus{display:flex;flex-wrap:wrap;gap:1mm}.focus span{display:flex;align-items:center;gap:1mm;background:#fff;border-radius:99px;padding:.5mm 2mm;font:800 7pt Nunito}
u{display:inline-block;width:2.8mm;height:2.8mm;border-radius:50%;background:#F26A1F;border:.3mm solid #A9400D;text-decoration:none;flex:none}u.s{background:#F6B23A;border-color:#B9800F}
.cue{display:flex;gap:1.2mm;align-items:flex-start;font:700 7.6pt/1.25 Nunito;color:#3A3F58;margin-top:auto}.cue .ic{width:3.8mm;height:3.8mm;margin-top:.2mm}
.fig{flex:1;min-width:0;display:flex;flex-direction:column;gap:1.2mm}
.card{position:relative;background:#fff;border-radius:4mm;flex:1;min-height:0;overflow:hidden;box-shadow:0 .3mm 1mm rgba(30,40,80,.08)}
.card svg{position:absolute;inset:0;width:100%;height:100%}
.lab{position:absolute;top:1.6mm;left:1.6mm;display:flex;align-items:center;gap:1.2mm;font:800 7pt Nunito;color:#4A5068;background:rgba(255,255,255,.85);border-radius:99px;padding:.3mm 2mm .3mm .3mm}
.stp{width:4.6mm;height:4.6mm;border-radius:50%;color:#fff;font:600 8pt/4.6mm Fredoka;text-align:center}
.breath{border-radius:99px;padding:1mm 3mm;display:flex;align-items:center;justify-content:center;gap:1.4mm;flex:none}
.breath .ic{width:4mm;height:4mm}.breath b{font:600 9.5pt Fredoka;letter-spacing:.06em}.breath i{font:700 7.5pt Nunito;font-style:normal;opacity:.9}
.mid{width:5mm;flex:none;display:flex;align-items:center;margin-bottom:8mm}.mid svg{width:5mm}
.rounds{flex:none;display:flex;align-items:center;gap:2.6mm;border:.5mm dashed;border-radius:5mm;padding:2.4mm 3.5mm;background:#fff}
.rtitle{display:flex;align-items:center;gap:1.5mm}.rtitle .ic{width:7mm;height:7mm}.rtitle b{display:block;font:600 11pt/1 Fredoka}.rtitle small{font:700 6.5pt Nunito;color:#6B7290}
.rnd{text-align:center}.rlab{font:800 7pt Nunito;color:#59607F;margin-bottom:.8mm}.boxes{display:flex;gap:1mm}
.bx{width:7.5mm;height:7.5mm;border:.45mm solid;border-radius:1.6mm;display:flex;align-items:flex-end;justify-content:center}.bx span{font:800 5pt Nunito;color:#9AA0B8;margin-bottom:.4mm}
.rest{display:flex;flex-direction:column;align-items:center;font:800 6.5pt Nunito;color:#59607F;gap:.4mm}.rest .ic{width:4.5mm;height:4.5mm}
.done{margin-left:auto;color:#fff;border-radius:99px;padding:1.4mm 3mm;display:flex;align-items:center;gap:1.2mm;font:800 7.5pt Nunito}.done .ic{width:4mm;height:4mm}
footer{flex:none;display:flex;gap:4.5mm;align-items:center;font:700 7pt Nunito;color:#6B7290}footer span{display:flex;align-items:center;gap:1.4mm}
footer .bi{color:#2E64D8;font-family:Fredoka;font-weight:600}footer .be{color:#D9541A;font-family:Fredoka;font-weight:600}footer svg{width:7mm}
/* portada */
.cover{padding:0;background:linear-gradient(165deg,#FFF6EE 0%,#FDF1F5 55%,#F1EEFD 100%)}
.bgdeco{position:absolute;inset:0;width:100%;height:100%}
.ctop{position:relative;padding:20mm 14mm 0;z-index:2}
.kick{font:800 8.5pt Nunito;letter-spacing:.2em;text-transform:uppercase;color:#D9558F}
.cover h1{margin:3mm 0 0;font:700 46pt/0.95 Fredoka;color:#262A40}.cover h1 span{color:#3566E8}
.hand{font:700 30pt Caveat;color:#D9541A;margin-top:2mm;transform:rotate(-3deg);transform-origin:left}
.obj{font:700 10pt Nunito;color:#4A5068;max-width:80mm;margin-top:3mm}
.cfig{position:absolute;right:6mm;top:48mm;width:112mm;height:208mm;z-index:1}.cfig svg{width:100%;height:100%}
.cstats{position:absolute;left:14mm;top:132mm;display:flex;flex-direction:column;gap:4mm;z-index:2}
.cstats div{display:grid;grid-template-columns:10mm auto;grid-template-rows:auto auto;column-gap:2.5mm;align-items:center}
.cstats .ic{width:9mm;height:9mm;grid-row:span 2;background:#fff;border-radius:50%;padding:1.8mm;box-shadow:0 .5mm 2mm rgba(0,0,0,.08)}
.cstats b{font:600 20pt/1 Fredoka}.cstats span{font:800 7.5pt Nunito;color:#6B7290;text-transform:uppercase;letter-spacing:.08em}
.cblocks{position:absolute;left:10mm;right:10mm;bottom:12mm;display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:99px;padding:3mm 5mm;box-shadow:0 1mm 4mm rgba(40,40,80,.1);z-index:3}
.cblocks div{display:flex;align-items:center;gap:1.6mm;font:800 7.5pt Nunito;color:#262A40}.cblocks i{font:600 10pt/6.5mm Fredoka;width:6.5mm;height:6.5mm;border-radius:50%;background:var(--c);color:#fff;text-align:center;font-style:normal}
.cblocks em{color:#B8BDD0;font-style:normal;font-weight:800}
/* cómo usar */
.hh small{font:800 7pt Nunito;letter-spacing:.18em;color:#D9558F}.hh h1{margin:.5mm 0 0;font:600 26pt Fredoka}
.how h2,.track h2{font:600 13pt Fredoka;margin:2mm 0 1mm;color:#262A40}
.timeline{display:flex;gap:1.2mm}.timeline div{background:var(--c);color:#fff;border-radius:3.5mm;padding:2.4mm 3mm;display:flex;flex-direction:column;min-width:0;position:relative}
.timeline b{font:600 15pt/1 Fredoka}.timeline span{font:800 7.5pt Nunito;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.timeline small{font:700 7pt Nunito;opacity:.9}.timeline em{position:absolute;right:2mm;top:2mm;font:800 6pt Nunito;font-style:normal;opacity:.85}
.howgrid{display:grid;grid-template-columns:1.25fr 1fr;gap:5mm}
.demo{position:relative;height:60mm}.dcard{position:absolute;left:0;top:0;width:66mm;height:48mm;background:#E8F6EE;border-radius:4mm;overflow:hidden}.dcard svg{width:100%;height:100%}
.call{position:absolute;display:flex;gap:1.5mm;align-items:flex-start;font:600 7.5pt/1.25 Nunito;color:#3A3F58;width:40mm}.call i{flex:none;width:5mm;height:5mm;border-radius:50%;background:#262A40;color:#fff;font:600 8pt/5mm Fredoka;text-align:center;font-style:normal}
.call.c1{left:69mm;top:0}.call.c2{left:69mm;top:15mm}.call.c3{left:69mm;top:31mm}.call.c4{left:0;top:52mm;width:100mm}
.breathrow{display:flex;gap:3mm;align-items:center;font:600 8pt/1.3 Nunito;color:#3A3F58;margin-top:1mm}.breathrow .breath{flex:none}
.loopsvg{width:100%;height:56mm}
.steps{margin:1mm 0 0;padding-left:5mm;font:600 8.5pt/1.45 Nunito;color:#3A3F58}
.lower{display:grid;grid-template-columns:1.75fr 1fr;gap:5mm;flex:1;min-height:0}.mmap{width:100%;background:#F6F7FB;border-radius:4mm}
.rules{display:flex;flex-direction:column;gap:2.4mm}.rules>div{background:#F6F7FB;border-radius:4mm;padding:3mm;display:flex;gap:3mm;align-items:center}.rules .ic{width:9mm;height:9mm}.rules p{margin:0;display:flex;flex-direction:column;gap:.6mm}.rules b{font:600 10.5pt Fredoka}.rules span{font:600 7.5pt/1.35 Nunito;color:#59607F}
/* registro */
.tp{font:600 9pt Nunito;color:#59607F;margin:0}
table{width:100%;border-collapse:separate;border-spacing:0;font:700 7.5pt Nunito;color:#3A3F58}
th{font:600 8.5pt Fredoka;color:#fff;background:#262A40;padding:1.8mm 1mm}th:first-child{border-radius:2.5mm 0 0 0}th:last-child{border-radius:0 2.5mm 0 0}
th.cA{background:#129FB5}th.c1{background:#1E9E57}th.c2{background:#3566E8}th.c3{background:#8452EE}th.cC{background:#D9558F}
td{border-bottom:.25mm solid #E6E8F0;padding:1.05mm 1mm;text-align:center;height:9.4mm}tr.b td{border-bottom:.45mm solid #C9CEDD}
td.wk{font:600 12pt Fredoka;background:#F6F7FB;border-bottom:.45mm solid #C9CEDD}td.dt{color:#B0B5C8;letter-spacing:.05em}td.ln{width:30mm}td.mood{font-size:9pt;letter-spacing:.6mm;white-space:nowrap}
.cb{display:inline-block;width:4.2mm;height:4.2mm;border:.4mm solid #9AA0B8;border-radius:1.2mm}
`;

(async () => {
  const ex = renderAll();
  const vbA = await fit(ex.filter(e => e.sec === 'A' || e.sec === 'C'), 1.38);
  const vbB = await fit(ex.filter(e => e.sec.startsWith('B')), 1.2);
  const vb = Object.assign({}, vbA, vbB);
  const sample = ex.find(e => e.id === '1.1');
  const vbS = (await fit([Object.assign({}, sample, { svgs: [sample.svgs[1]] })], 1.375))['1.1'];
  const pages = [coverPage(), howPage(sample.svgs[1], vbS)];
  ['A', 'B1', 'B2', 'B3', 'C'].forEach((k, i) => pages.push(sectionPage(SEC[k], ex.filter(e => e.sec === k), vb, i + 3)));
  pages.push(trackerPage());
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="fonts/fonts.css"><style>${CSS}</style></head><body>${pages.join('')}</body></html>`;
  fs.writeFileSync('guia.html', html);
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto('file://' + process.cwd() + '/guia.html'); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
  await pg.pdf({ path: 'Dynamic_Reset_3x3_Anita.pdf', width: '210mm', height: '297mm', printBackground: true });
  await b.close();
})();
