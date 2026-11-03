const { renderAll } = require('./poses2');
const { fit } = require('./fit');
const { chromium } = require('playwright');
const fs = require('fs');
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
(async () => {
  const ex = renderAll();
  const vb = await fit(ex, 1.25);
  const out = 'gallery'; fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1250, height: 1000 } });
  const css = fs.readFileSync('fonts/fonts.css','utf8').replace(/url\((.*?)\)/g,(m,u)=>`url(file://${process.cwd()}/fonts/${u})`);
  let n = 0; const list = [];
  for (const e of ex) for (let i = 0; i < e.svgs.length; i++) {
    n++;
    const v = vb[e.id + '#' + i] || vb[e.id];
    const name = `${String(n).padStart(2,'0')}_${e.id.replace('.','-')}_${slug(e.name)}_pos${i+1}-${slug(e.lab[i])}.png`;
    const svg = e.svgs[i].replace(/__K__/g, (v[2]/240*1.3).toFixed(3));
    await pg.setContent(`<html><head><style>${css} body{margin:0;background:#fff}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(' ')}" width="1250" height="1000">${svg}</svg></body></html>`);
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: `${out}/${name}`, clip: { x: 0, y: 0, width: 1250, height: 1000 } });
    list.push(name);
  }
  // portada y mapa muscular desde la guía
  await pg.setViewportSize({ width: 1240, height: 1754 });
  await pg.goto('file://' + process.cwd() + '/guia.html'); await pg.evaluate(() => document.fonts.ready);
  const cf = await pg.$('.cfig svg'); await cf.screenshot({ path: `${out}/00_portada_anita.png` });
  const mm = await pg.$('.mmap'); await mm.screenshot({ path: `${out}/00_mapa_musculos.png` });
  // hoja de contacto
  let h = `<html><head><style>${css} body{margin:0;font-family:Nunito;background:#fff} .g{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:10px} .g div{border:1px solid #e3e6ef;border-radius:8px;overflow:hidden} .g img{width:100%;display:block} .g p{margin:0;padding:3px 6px;font-size:11px;font-weight:700}</style></head><body><div class="g">${list.map(f=>`<div><img src="file://${process.cwd()}/${out}/${f}"><p>${f.replace('.png','')}</p></div>`).join('')}</div></body></html>`;
  fs.writeFileSync('contact.html', h);
  await pg.setViewportSize({ width: 1800, height: 1000 });
  await pg.goto('file://' + process.cwd() + '/contact.html'); await pg.waitForTimeout(500);
  await pg.screenshot({ path: `${out}/00_hoja_de_contacto.png`, fullPage: true });
  await b.close();
  console.log(list.length);
})();
