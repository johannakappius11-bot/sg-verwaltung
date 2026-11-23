// Baut eine Demo-Vorschau als EINE HTML-Datei (alles eingebettet, Demo-Modus, ohne Server).
// Aufruf: node scripts/build-artifact.mjs <Zieldatei.html>
// Vereinsnamen und Logos werden in dieser Vorschau neutralisiert.
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist-artifact', 'platzplan-demo.html');
const outDir = join(root, 'dist-artifact');

process.env.VITE_ROUTER = 'memory';
process.env.VITE_DEMO = 'true';
delete process.env.VITE_SUPABASE_URL; delete process.env.VITE_SUPABASE_ANON_KEY;
await build({
  root, base: './', logLevel: 'warn', plugins: [react()], esbuild: { charset: 'utf8' },
  envDir: join(root, 'scripts'), // keine .env laden -> Demo-Modus
  build: { outDir, emptyOutDir: true, target: ['es2019', 'safari13'], assetsInlineLimit: 100000 },
});

const assets = join(outDir, 'assets');
const files = readdirSync(assets);
let js = readFileSync(join(assets, files.find((f) => f.endsWith('.js'))), 'utf8');
const css = readFileSync(join(assets, files.find((f) => f.endsWith('.css'))), 'utf8');

const logo = (letter) => 'data:image/svg+xml;base64,' + Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#e6e6e6" stroke="#555" stroke-width="4"/><text x="50" y="62" font-family="Arial,sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="#333">${letter}</text></svg>`,
).toString('base64');

const replacements = [
  ['/logos/scharmede.svg', logo('A')], ['/logos/thuele.svg', logo('B')],
  ['SC Concordia Scharmede', 'Verein A (Demo)'], ['VfL Thüle', 'Verein B (Demo)'],
  ['SG Scharmede/Thüle', 'SG Demo'],
];
for (const [a, b] of replacements) js = js.split(a).join(b);
js = js.replace(/<\/script/gi, '<\\/script');

const html = `<title>Platzplan Demo</title>
<meta name="theme-color" content="#f2f2f2">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(out, html);
console.log(`Geschrieben: ${out} (${Math.round(html.length / 1024)} KB)`);
