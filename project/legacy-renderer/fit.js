// mide los bbox de cada ilustración y calcula un viewBox compartido por ejercicio
const { chromium } = require('playwright');
async function fit1(pg, svgs, aspect, pad) {
  const boxes = [];
  for (const s of svgs) {
    await pg.setContent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170" width="240" height="170">${s}</svg>`);
    boxes.push(await pg.evaluate(() => { const r = document.querySelector('.fig').getBBox(); return [r.x, r.y, r.x + r.width, r.y + r.height]; }));
  }
  let x0 = Math.min(...boxes.map(r => r[0])), y0 = Math.min(...boxes.map(r => r[1])), x1 = Math.max(...boxes.map(r => r[2])), y1 = Math.max(...boxes.map(r => r[3]));
  if (!svgs.some(s => s.includes('id="c2t"'))) y1 = Math.max(y1, 152 + 7);
  let w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  return [(x0 + x1) / 2 - w / 2, y1 + pad - h, w, h];
}
async function fit(exs, aspect = 1.43, pad = 9) {
  const b = await chromium.launch(); const pg = await b.newPage();
  const out = {};
  for (const e of exs) {
    if (e.fitEach) { for (let i = 0; i < e.svgs.length; i++) { const sub = await fit1(pg, [e.svgs[i]], aspect, pad); out[e.id + '#' + i] = sub; } }
    const boxes = [];
    for (const s of e.svgs) {
      await pg.setContent(`<svg id="s" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170" width="240" height="170">${s}</svg>`);
      boxes.push(await pg.evaluate(() => { const g = [...document.querySelectorAll('.fig')]; let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for (const el of g){const r=el.getBBox(); x0=Math.min(x0,r.x);y0=Math.min(y0,r.y);x1=Math.max(x1,r.x+r.width);y1=Math.max(y1,r.y+r.height);} return [x0,y0,x1,y1]; }));
    }
    let x0 = Math.min(...boxes.map(r => r[0])), y0 = Math.min(...boxes.map(r => r[1])), x1 = Math.max(...boxes.map(r => r[2])), y1 = Math.max(...boxes.map(r => r[3]));
    const top = e.svgs.some(s => s.includes('id="c2t"'));
    if (!top) y1 = Math.max(y1, 152 + 7);
    let w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    const cx = (x0 + x1) / 2, bottom = y1 + pad;
    out[e.id] = [cx - w / 2, bottom - h, w, h];
  }
  await b.close(); return out;
}
module.exports = { fit };
