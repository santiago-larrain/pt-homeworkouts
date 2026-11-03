const { chromium } = require('playwright');
const fs = require('fs');
const NEAR = '#1E5BD8', FAR = '#9AA0B2', BODY = '#3A3F55';
const L = (pts, c, w) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const T = (x, y, s, c = '#262A40', size = 15, a = 'middle') => `<text x="${x}" y="${y}" font-family="Nunito, Arial" font-weight="800" font-size="${size}" fill="${c}" text-anchor="${a}">${s}</text>`;
const panel = (inner, title) => `<g>${inner}${T(250, 34, title, '#262A40', 20)}</g>`;
// DEAD BUG (lateral, cabeza a la izquierda)
function deadbug(ext) {
  const G = 300, hip = [270, 268], sh = [150, 270], head = [112, 262];
  let s = `<rect x="20" y="${G}" width="460" height="12" rx="6" fill="#D7CBF3"/>`;
  // lado lejano primero
  s += ext ? L([sh, [95, 245], [45, 232]], FAR, 12) : L([sh, [150, 200], [150, 130]], FAR, 12);
  s += L([hip, [270, 190], [345, 190]], FAR, 14);
  s += L([hip, sh], BODY, 34) + `<circle cx="${head[0]}" cy="${head[1]}" r="26" fill="${BODY}"/>`;
  s += ext ? L([hip, [350, 262], [440, 258]], NEAR, 16) : L([hip, [270, 190], [345, 190]], NEAR, 16);
  s += L([sh, [150, 200], [150, 130]], NEAR, 13);
  s += `<path d="M215 228 v24" stroke="#D9541A" stroke-width="5"/><path d="M205 242 l10 13 l10 -13" fill="none" stroke="#D9541A" stroke-width="5"/>`;
  s += T(215, 340, 'lower back pressed into the mat', '#D9541A', 13);
  if (ext) { s += T(70, 205, 'FAR arm', FAR, 13) + T(70, 221, 'reaches back over head', FAR, 12) + T(415, 225, 'NEAR leg', NEAR, 13) + T(415, 241, 'straight, hovering', NEAR, 12) + T(150, 100, 'NEAR arm', NEAR, 13) + T(150, 116, 'stays up', NEAR, 12) + T(390, 160, 'FAR leg', FAR, 13) + T(390, 176, 'stays at 90°', FAR, 12); }
  else s += T(150, 110, 'both arms to the ceiling', NEAR, 13) + T(390, 170, 'both legs 90° / 90°', NEAR, 13);
  return s;
}
// ROTACIÓN EXTERNA (de frente: su brazo DERECHO aparece a la IZQUIERDA de la imagen)
function rot(out) {
  let s = `<rect x="440" y="80" width="14" height="230" rx="5" fill="#CFC8E4"/><circle cx="447" cy="190" r="7" fill="#fff" stroke="#E6399B" stroke-width="3"/>`;
  s += `<circle cx="250" cy="70" r="24" fill="${BODY}"/>` + L([[250, 100], [250, 220]], BODY, 50);
  s += L([[278, 112], [282, 175], [286, 225]], FAR, 12);
  const sh = [222, 112], el = [216, 190];
  const w = out ? [140, 182] : [292, 196];
  s += L([sh, el, w], NEAR, 13) + `<rect x="${el[0] + 5}" y="${el[1] - 16}" width="12" height="18" rx="4" fill="#fff" stroke="#888" stroke-width="2"/>`;
  s += `<path d="M447 190 L${w[0]} ${w[1]}" stroke="#E6399B" stroke-width="5"/>`;
  s += L([[226, 225], [222, 300]], BODY, 18) + L([[274, 225], [278, 300]], BODY, 18) + `<line x1="20" y1="305" x2="480" y2="305" stroke="#C6CCDC" stroke-width="3"/>`;
  s += T(110, 95, 'her RIGHT arm', NEAR, 13) + T(110, 111, '(LEFT side of the image)', NEAR, 11);
  s += T(440, 60, 'band anchor', '#E6399B', 12) + T(440, 75, 'at elbow height', '#E6399B', 12);
  s += T(220, 250 + 2, '', NEAR);
  s += out ? T(130, 215, 'forearm rotated OUT', NEAR, 12) : T(340, 225, 'forearm across belly', NEAR, 12);
  s += T(250, 340, 'elbow glued to ribs (small towel)', '#666', 12);
  return s;
}
const sheet = (a, b, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 380" width="2000" height="760"><rect width="1000" height="380" fill="#fff"/>${T(500, 22, title, '#262A40', 16)}<g transform="translate(0 20)">${panel(a, 'POSITION 1')}</g><line x1="500" y1="40" x2="500" y2="370" stroke="#ccc" stroke-width="3"/><g transform="translate(500 20)">${panel(b, 'POSITION 2')}</g></svg>`;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 2000, height: 760 } });
  for (const [n, svg] of [['diagrama_dead_bug.png', sheet(deadbug(false), deadbug(true), 'DEAD BUG  ·  BLUE = side NEAREST the viewer  ·  GREY = FAR side (behind her body)')], ['diagrama_rotacion_externa.png', sheet(rot(false), rot(true), 'BAND EXTERNAL ROTATION  ·  FRONT VIEW (she faces the viewer)')]]) {
    await pg.setContent(`<html><body style="margin:0">${svg}</body></html>`); await pg.screenshot({ path: n });
  }
  await b.close();
})();
