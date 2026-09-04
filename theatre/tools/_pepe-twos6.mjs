#!/usr/bin/env node
// scratch (pepe r6): does the BODY move, or only the mouth?
//
// The frames are the ANIMATOR'S OWN: one page load, then the 12 fps clock is driven by hand from
// frame to frame through window.__theatre, so frame f is frame f of the state and not whatever the
// machine happened to render. (Sampling a live page was tried first; with five builders' headless
// browsers on this machine a screenshot took forty seconds, so "eight frames 170 ms apart" were
// five minutes apart. Reloading with ?t= per frame is exact but costs a full build each time.)
// tools/_pepe-diff6.mjs reads the result.
//
//   node tools/_pepe-twos6.mjs <state> <frames> <outdir> [step-in-12ths]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const state = process.argv[2] ?? 'talk';
const nFrames = +(process.argv[3] ?? 8);
const outdir = process.argv[4] ?? '/tmp/pepe-twos';
const step = +(process.argv[5] ?? 2);
mkdirSync(outdir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
  }),
);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.goto(`http://127.0.0.1:5173/?view=pepe&state=${state}&shot=1`, { waitUntil: 'load', timeout: 90000 });
const t0 = Date.now();
let ready = false;
while (Date.now() - t0 < 240000) {
  ready = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ready) break;
  await page.waitForTimeout(300);
}
if (!ready) errors.push('page never became ready');
// take the clock off the wall and put it in my hand, then restart the state from frame 0
await page.evaluate((s) => {
  const ctx = window.__theatre;
  const c = ctx.clock;
  c.tick = () => { c.stepped = true; };
  c.frozen = true;
  ctx.pieces.pepe?.setState?.(s, ctx);
}, state);
for (let i = 0; i < nFrames; i++) {
  const f = i * step;
  await page.evaluate((fr) => {
    const c = window.__theatre.clock;
    c.frame = fr;
    c.t = fr / 12;
    c.raw = fr / 12;
    c.dt = 1 / 12;
    c.stepped = true;
  }, f);
  await page.waitForTimeout(220); // a few animation frames, so update() and the ink pass both run
  const buf = await page.screenshot({ timeout: 180000 });
  await sharp(buf).png().toFile(`${outdir}/${state}-${String(f).padStart(2, '0')}.png`);
  process.stdout.write(`f${f} `);
}
await browser.close();
console.log(`\n${nFrames} frames of "${state}", every ${step}/12 s → ${outdir}`);
if (errors.length) console.log('PAGE ERRORS: ' + errors.slice(0, 4).join(' | '));
