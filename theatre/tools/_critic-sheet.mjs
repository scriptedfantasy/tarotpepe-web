#!/usr/bin/env node
// A true contact sheet: N frames exactly `interval` ms apart, taken by FREEZING the scene clock at
// t = t0 + k*interval and reloading. In software WebGL a live screenshot costs ~6 s, so a live
// "170 ms apart" sheet is a lie; this one is not.
//
//   node tools/_critic-sheet.mjs --view entrance --state opening --t0 0.25 --interval 0.17 --frames 8 --out /abs/sheet.png
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const W = +(args.width ?? 1600), H = +(args.height ?? 900);
const frames = +(args.frames ?? 8);
const t0 = +(args.t0 ?? 0);
const interval = +(args.interval ?? 0.17);
const out = args.out;
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
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

const bufs = [];
for (let k = 0; k < frames; k++) {
  const t = (t0 + k * interval).toFixed(3);
  const u = new URL('http://127.0.0.1:5173/');
  if (args.view) u.searchParams.set('view', args.view);
  if (args.state) u.searchParams.set('state', args.state);
  u.searchParams.set('t', t);
  u.searchParams.set('shot', '1');
  await page.goto(u.toString(), { waitUntil: 'load', timeout: 60000 });
  const start = Date.now();
  while (Date.now() - start < 90000) {
    const ready = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
    if (ready) break;
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(900);
  bufs.push(await page.screenshot());
  console.log(`frame ${k} at t=${t}`);
}
const cols = 4, rows = Math.ceil(frames / 4), cw = Math.round(W / 2), ch = Math.round(H / 2);
const tiles = await Promise.all(bufs.map((b) => sharp(b).resize(cw, ch).png().toBuffer()));
await sharp({ create: { width: cw * cols, height: ch * rows, channels: 3, background: '#111' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cw, top: Math.floor(i / cols) * ch })))
  .png()
  .toFile(out);
await browser.close();
if (errors.length) console.error('PAGE ERRORS:\n' + errors.slice(0, 10).map((e) => ' - ' + e).join('\n'));
console.log('wrote', out);
