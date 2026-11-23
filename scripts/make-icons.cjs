// Erzeugt die App-Icons (PNG) aus dem SG-Logo. Aufruf: node scripts/make-icons.cjs
// Für schärfere Icons: public/logos/sg.png durch eine größere Datei (mind. 512 x 512) ersetzen.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/logos/sg.png')).toString('base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const out = [['icon-512.png', 512, 0.06], ['icon-192.png', 192, 0.06], ['apple-touch-icon.png', 180, 0.08], ['icon-maskable-512.png', 512, 0.16]];
  for (const [name, size, pad] of out) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px"><img src="${logo}" style="width:${Math.round(size * (1 - 2 * pad))}px;height:auto;image-rendering:auto"></body></html>`);
    await p.waitForTimeout(100);
    await p.screenshot({ path: path.join(__dirname, '../public/icons/', name) });
  }
  await b.close(); console.log('Icons erzeugt');
})();
