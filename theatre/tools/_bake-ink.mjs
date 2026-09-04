#!/usr/bin/env node
// Bake ONLY the ink piece's assets (the two hatch tile sets and the paper grain) and merge them
// into public/baked/manifest.json, leaving every other piece's bake alone. tools/bake.mjs draws
// every baked asset in the page live and no longer fits inside its own 400 s budget on this
// machine; this loads `?only=ink&bake=1`, which builds ink and nothing else.
//
//   node tools/_bake-ink.mjs
import { chromium } from 'playwright';
import { writeFileSync, readdirSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../public/baked/', import.meta.url).pathname;
const MAN = join(DIR, 'manifest.json');
const url = 'http://127.0.0.1:5173/?shot=1&bake=1&only=ink';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.route('**/@vite/client', (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};}\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay{}',
  }),
);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
let reg = null;
while (Date.now() - t0 < 540000) {
  reg = await page
    .evaluate(() => {
      const b = window.__bake || {};
      const ink = Object.keys(b).filter((k) => k.startsWith('ink-'));
      return ink.length >= 2 ? b : null;
    })
    .catch(() => null);
  if (reg) break;
  await page.waitForTimeout(500);
}
await browser.close();
if (!reg) {
  console.error(`no ink bake registered in ${((Date.now() - t0) / 1000).toFixed(0)}s`, errors);
  process.exit(2);
}

const manifest = existsSync(MAN) ? JSON.parse(readFileSync(MAN, 'utf8')) : {};
const fresh = new Set();
for (const [key, { kind, payload }] of Object.entries(reg)) {
  if (!key.startsWith('ink-')) continue;
  const file = kind === 'png' ? `${key}.png` : `${key}.json`;
  writeFileSync(join(DIR, file), kind === 'png' ? Buffer.from(payload.split(',')[1], 'base64') : Buffer.from(payload));
  manifest[key] = { kind, file };
  fresh.add(key);
  console.log(`baked ${file}`);
}
for (const key of Object.keys(manifest)) {
  if (key.startsWith('ink-') && !fresh.has(key)) {
    const f = join(DIR, manifest[key].file);
    if (existsSync(f)) unlinkSync(f);
    delete manifest[key];
    console.log('removed stale', key);
  }
}
writeFileSync(MAN, JSON.stringify(manifest, null, 2));
console.log(`ink baked in ${((Date.now() - t0) / 1000).toFixed(1)}s; manifest has ${Object.keys(manifest).length} entries`);
if (errors.length) console.log('page errors:\n - ' + errors.join('\n - '));
