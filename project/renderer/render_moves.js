// Renderiza movimientos con el dibujo vectorial (estilo parecido a las imágenes de ChatGPT),
// con fotogramas intermedios interpolados para animaciones suaves.
// Uso: node render_moves.js <carpeta_salida>
const path = require('path');
const fs = require('fs');
const R = require('./rig2');
const { EX, C2b } = require('./poses2');
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'out';
fs.mkdirSync(OUT, { recursive: true });

// interpola dos poses (números y arreglos numéricos); funciones/strings: toma la más cercana
function lerpAngle(a, b, t) { let d = ((b - a + 540) % 360) - 180; return a + d * t; }
const ANG = new Set(['a', 'th', 'sh', 'ft', 'ua', 'fa']);
function blend(p, q, t, key = '') {
  if (typeof p === 'number' && typeof q === 'number') return ANG.has(key) ? lerpAngle(p, q, t) : p + (q - p) * t;
  if (Array.isArray(p) && Array.isArray(q) && p.length === q.length && p.every(x => typeof x === 'number')) return p.map((x, i) => x + (q[i] - x) * t);
  if (p && q && typeof p === 'object' && typeof q === 'object' && !Array.isArray(p)) {
    const o = {}; for (const k of new Set([...Object.keys(p), ...Object.keys(q)])) {
      if (!(k in p)) o[k] = q[k]; else if (!(k in q)) o[k] = p[k]; else o[k] = blend(p[k], q[k], t, k);
    } return o;
  }
  return t < 0.5 ? p : q;
}

// qué renderizar: id de la app -> { ex: id en poses2, frames: [t...] }
const JOBS = {
  'dead-bug': { ex: '3.1', frames: [0, 0.5, 1] },
  'band-external-rotation': { ex: '2.3', frames: [0, 0.5, 1] },
  'doorway-pec': { ex: 'C1', frames: [0, 1] },
  'child-pose-lateral': { ex: 'C2', frames: [0, 1], custom: [null, () => C2b().svg], each: true },
};
const strip = svg => svg.replace(/<g class="anns">[\s\S]*?<\/g><\/g>|<g class="anns"><\/g>/g, '').replace(/<g class="ann"[^>]*>.*?<\/g>/g, '');

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 1000 } });
  for (const [id, job] of Object.entries(JOBS)) {
    const e = EX.find(x => x.id === job.ex);
    const [p1, p2] = e.poses;
    const svgs = job.frames.map((t, fi) => {
      if (job.custom && job.custom[fi]) return R.DEFS + strip(job.custom[fi]());
      const pose = t === 0 ? p1 : t === 1 ? p2 : Object.assign(blend(p1, p2, t), { props: null, overlay: t < .5 ? p1.overlay : p2.overlay });
      if (t > 0 && t < 1 && p2.props) pose.props = J => (p2.props(J) || '').replace(/<g fill="none" stroke-linecap="round"[\s\S]*?<\/g>/g, m => /stroke="#2B4C9B"/.test(m) ? '' : m);
      return strip(R.renderPose(pose).svg);
    });
    // encuadre común
    const boxes = [];
    for (const s of svgs) { await pg.setContent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170" width="240" height="170">${s}</svg>`); boxes.push(await pg.evaluate(() => { const g = [...document.querySelectorAll('.fig')]; const ov = document.querySelector('.ovl circle'); let a = [1e9, 1e9, -1e9, -1e9]; g.forEach(el => { const r = el.getBBox(); if (!r.width) return; a = [Math.min(a[0], r.x), Math.min(a[1], r.y), Math.max(a[2], r.x + r.width), Math.max(a[3], r.y + r.height)]; }); if (ov) { const r = ov.getBBox(); a = [Math.min(a[0], r.x), Math.min(a[1], r.y), Math.max(a[2], r.x + r.width), Math.max(a[3], r.y + r.height)]; } return a; })); }
    let x0 = Math.min(...boxes.map(r => r[0])) - 10, y0 = Math.min(...boxes.map(r => r[1])) - 10, x1 = Math.max(...boxes.map(r => r[2])) + 10, y1 = Math.max(...boxes.map(r => r[3])) + 8;
    y1 = Math.max(y1, 152 + 9);
    let w = x1 - x0, h = y1 - y0; const asp = 1.3; if (w / h < asp) { const nw = h * asp; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / asp; y0 -= (nh - h); h = nh; }
    for (let i = 0; i < svgs.length; i++) {
      if (job.each) { const bx = boxes[i]; let X0 = bx[0] - 10, Y0 = bx[1] - 10, W = bx[2] - bx[0] + 20, Hh = Math.max(bx[3] + 8, svgs[i].includes('c2t') ? 0 : 161) - Y0; if (W / Hh < 1.3) { const nw = Hh * 1.3; X0 -= (nw - W) / 2; W = nw; } else { const nh = W / 1.3; Y0 -= (nh - Hh); Hh = nh; } [x0, y0, w, h] = [X0, Y0, W, Hh]; }
      await pg.setContent(`<html><body style="margin:0;background:#fff"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="900" height="${Math.round(900 * h / w)}">${svgs[i]}</svg></body></html>`);
      await pg.screenshot({ path: path.join(OUT, `${id}-${i + 1}.png`), clip: { x: 0, y: 0, width: 900, height: Math.round(900 * h / w) } });
    }
    console.log(id, svgs.length, 'frames');
  }
  await b.close();
})();
