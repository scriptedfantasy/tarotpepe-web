#!/usr/bin/env node
// scratch (pepe r7): shot.mjs plus an --eval that runs against window.__theatre before the frame.
//   node tools/_p7-shot.mjs --view camera --state home --eval "ctx.pieces.ink.params.colorInk=0" --out /tmp/x.png
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
const width = +(args.width ?? 1600);
const height = +(args.height ?? 900);
const out = args.out ?? '/tmp/p7-shot.png';
const frames = +(args.frames ?? 1);
const interval = +(args.interval ?? 170);
mkdirSync(dirname(out), { recursive: true });

const u = new URL('http://127.0.0.1:5173/');
if (args.view) u.searchParams.set('view', args.view);
if (args.state) u.searchParams.set('state', args.state);
if (args.t) u.searchParams.set('t', args.t);
u.searchParams.set('shot', '1');

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
  }),
);
await page.goto(u.toString(), { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
if (args.eval) {
  await page.evaluate((src) => {
    const ctx = window.__theatre;
    // eslint-disable-next-line no-new-func
    new Function('ctx', src)(ctx);
  }, args.eval);
}
await page.waitForTimeout(+(args.wait ?? 900));
if (frames > 1) {
  const shots = [];
  for (let i = 0; i < frames; i++) {
    shots.push(await page.locator('#stage').screenshot());
    if (i < frames - 1) await page.waitForTimeout(interval);
  }
  const cols = Math.ceil(frames / 2), rows = Math.min(2, frames);
  const per = Math.ceil(frames / rows);
  const canvas = sharp({ create: { width: width * per, height: height * rows, channels: 3, background: '#fff' } });
  const comp = shots.map((b, i) => ({ input: b, left: (i % per) * width, top: Math.floor(i / per) * height }));
  await canvas.composite(comp).png().toFile(out);
} else {
  await page.locator('#stage').screenshot({ path: out });
}
await browser.close();
if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); }
console.log('wrote', out);
