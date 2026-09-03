#!/usr/bin/env node
// Read the mind's canned visit against the real endpoint as a scene.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay {}` }),
);
await page.goto('http://127.0.0.1:5173/?view=mind&state=transcript', { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
for (;;) {
  const d = await page.evaluate(() => window.__mindDone === true).catch(() => false);
  if (d || Date.now() - t0 > 240000) break;
  await page.waitForTimeout(500);
}
const out = await page.evaluate(() => ({
  provider: window.__theatre?.pieces?.mind?.provider,
  model: window.__theatre?.pieces?.mind?.model,
  text: document.querySelector('#transcript')?.innerText ?? '(no #transcript)',
}));
console.log('provider:', out.provider, 'model:', out.model, `(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
console.log(out.text);
if (errs.length) console.log('\nERRORS:\n' + errs.map((e) => ' - ' + e).join('\n'));
await browser.close();
