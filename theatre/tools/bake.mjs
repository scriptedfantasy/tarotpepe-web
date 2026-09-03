#!/usr/bin/env node
// Bake every deterministic drawn asset to public/baked/ so the page builds in a blink.
// Loads the scene with ?bake=1 (forces live drawing, registers results on window.__bake),
// then writes each PNG/JSON and a manifest. Run after changing any baked drawing code:
//
//   node tools/bake.mjs            # bakes; prints what changed
//
// Files are named <name>-<hash of the drawing source>.<ext>; stale files are removed.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../public/baked/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const url = 'http://127.0.0.1:5173/?shot=1&bake=1&view=camera&state=home';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(id, css){ let s = document.querySelector('style[data-vite-dev-id="' + id + '"]'); if (!s) { s = document.createElement('style'); s.setAttribute('data-vite-dev-id', id); document.head.appendChild(s); } s.textContent = css; }
export function removeStyle(id){ document.querySelector('style[data-vite-dev-id="' + id + '"]')?.remove(); }
export function injectQuery(url){ return url; }
export class ErrorOverlay {}`,
  }),
);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
let ready = false;
while (Date.now() - t0 < 400000) {
  try {
    ready = await page.evaluate(() => window.__theatreReady === true);
  } catch {}
  if (ready) break;
  await page.waitForTimeout(300);
}
if (!ready) {
  console.error('page never became ready; not baking');
  await browser.close();
  process.exit(2);
}
const reg = (await page.evaluate(() => window.__bake || {})) ?? {};
await browser.close();

const manifest = {};
const keep = new Set(['manifest.json']);
for (const [key, { kind, payload }] of Object.entries(reg)) {
  const file = kind === 'png' ? `${key}.png` : `${key}.json`;
  const buf = kind === 'png' ? Buffer.from(payload.split(',')[1], 'base64') : Buffer.from(payload);
  writeFileSync(join(DIR, file), buf);
  manifest[key] = { kind, file };
  keep.add(file);
  console.log(`baked ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
}
for (const f of readdirSync(DIR)) if (!keep.has(f)) {
  unlinkSync(join(DIR, f));
  console.log('removed stale', f);
}
writeFileSync(join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`manifest: ${Object.keys(manifest).length} entries; page built in ${((Date.now() - t0) / 1000).toFixed(1)}s (live)`);
if (errors.length) console.log('page errors during bake:\n - ' + errors.join('\n - '));
