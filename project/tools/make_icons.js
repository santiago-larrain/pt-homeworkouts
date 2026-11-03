const { chromium } = require('playwright');
const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F27FA6"/><stop offset="1" stop-color="#D63A6F"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)" fill="#fff">
<rect x="150" y="238" width="212" height="36" rx="18"/>
<rect x="104" y="170" width="52" height="172" rx="22"/><rect x="356" y="170" width="52" height="172" rx="22"/>
<rect x="62" y="206" width="44" height="100" rx="18"/><rect x="406" y="206" width="44" height="100" rx="18"/>
<path d="M256 132c-14-24-56-22-56 10 0 26 40 46 56 58 16-12 56-32 56-58 0-32-42-34-56-10z" opacity=".95"/>
</g></svg>`;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  for (const [n, size, pad] of [['icon-180', 180, 1], ['icon-192', 192, 1], ['icon-512', 512, 1], ['icon-maskable-512', 512, .78]]) {
    await pg.setViewportSize({ width: size, height: size });
    await pg.setContent(`<html><body style="margin:0">${icon(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await pg.screenshot({ path: `/home/user/pt-homeworkouts/docs/icons/${n}.png` });
  }
  await b.close();
})();
