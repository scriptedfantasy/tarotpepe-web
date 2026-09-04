#!/usr/bin/env node
// scratch (pepe r7): one browser, one frozen frame, several renders of it — so the pen's wobble
// seed is identical in every one and the passes can be subtracted from each other.
//   node tools/_p7-set.mjs <view> <state> <t> <prefix> "name=js" "name=js" ...
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [, , view, state, t, prefix, ...jobs] = process.argv;
mkdirSync('/tmp/p7', { recursive: true });
const u = new URL('http://127.0.0.1:5173/');
u.searchParams.set('view', view);
if (state && state !== '-') u.searchParams.set('state', state);
if (t && t !== '-') u.searchParams.set('t', t);
u.searchParams.set('shot', '1');

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}` }),
);
await page.goto(u.toString(), { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
for (const job of jobs) {
  const i = job.indexOf('=');
  const name = job.slice(0, i), src = job.slice(i + 1);
  await page.evaluate((s) => { const ctx = window.__theatre; new Function('ctx', s)(ctx); }, src);
  await page.waitForTimeout(500);
  const out = `${prefix}-${name}.png`;
  await page.locator('#stage').screenshot({ path: out });
  console.log('wrote', out);
}
await browser.close();
if (errors.length) console.error('PAGE ERRORS:\n' + errors.join('\n'));
