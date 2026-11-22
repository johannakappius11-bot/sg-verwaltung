// Erzeugt die App-Icons (PNG) aus einer SVG-Vorlage. Aufruf: node scripts/make-icons.cjs
// Eigenes Icon? public/icons/icon.svg ersetzen und Skript erneut ausführen.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const svg = fs.readFileSync(path.join(__dirname, '../public/icons/icon.svg'), 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const out = [['icon-512.png', 512, 0], ['icon-192.png', 192, 0], ['apple-touch-icon.png', 180, 0], ['icon-maskable-512.png', 512, 0.12]];
  for (const [name, size, pad] of out) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:#4a4a4a"><div style="padding:${size * pad}px;width:${size}px;height:${size}px;box-sizing:border-box">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div></body></html>`);
    await p.screenshot({ path: path.join(__dirname, '../public/icons/', name), omitBackground: false });
  }
  await b.close(); console.log('Icons erzeugt');
})();
