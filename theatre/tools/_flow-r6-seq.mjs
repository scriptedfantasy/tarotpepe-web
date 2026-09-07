#!/usr/bin/env node
// flow round 6: THE DRAW BEAT, PLAYED AND SHOT IN ORDER. Drives a real evening, asks for the cards
// and screenshots every `--every` ms from the moment the request is sent until the third card is
// chosen, so the whole piece of business can be read as a strip instead of guessed at from stills.
//   node tools/_flow-r6-seq.mjs [w] [h] [--out DIR] [--prefix name] [--every 500] [--frames 18]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const outDir = arg('out', '/tmp');
const prefix = arg('prefix', `flow-r6-${W}x${H}`);
const every = +arg('every', 500);
const nFrames = +arg('frames', 18);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay {}' }));
// --nomind: the evening most of this project's testing runs on — no key, so the scripted brain
// answers and nothing is generated. What the wash sounds like then is a decision of this round's.
if (process.argv.includes('--nomind')) {
  await page.route('**/api/pepe/health', (r) => r.fulfill({ contentType: 'application/json', body: '{"ok":false,"provider":"none","reason":"forced off by tools/_flow-r6-seq.mjs"}' }));
  await page.route('**/api/pepe', (r) => r.abort());
}
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    return {
      beat: T.pieces.flow?.beat,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      field: !!document.querySelector('#dialogue input.keys'),
      title: !!document.querySelector('#titles .card'),
      fan: T.pieces.reveal?.fanCount ?? 0,
      picks: (T.pieces.reveal?.picks ?? []).length,
      caption: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 70) : null,
    };
  });
async function until(label, fn, seconds = 120) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(80);
  }
}
await until('the door', (s) => s.door === 'closed' || s.beat === 'greeting' || s.beat === 'talk', 60);
for (let k = 0; k < 20; k++) {
  const s = await state();
  if (s.beat !== 'door' && s.beat !== 'idle') break;
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(900);
}
await until('the greeting and the open field', (s) => s.field && s.beat === 'talk', 150);
await page.keyboard.type('hello', { delay: 8 });
await page.keyboard.press('Enter');
await until('the field again', (s) => s.field && s.beat === 'talk', 90);

const t0 = Date.now();
await page.keyboard.type('can you read my cards', { delay: 8 });
await page.keyboard.press('Enter');
// pick three as soon as each is offered, in the background, so the strip runs to the end of the beat
(async () => {
  try {
    for (let k = 0; k < 3; k++) {
      await until(`prompt ${k + 1}`, (s) => s.field && s.picks === k && s.fan > 3, 90);
      await page.waitForTimeout(1400);
      await page.evaluate((n) => window.__theatre.pieces.reveal.pickByOrdinal(n), 6 + k * 11);
      await until(`pick ${k + 1}`, (s) => s.picks === k + 1, 40);
    }
  } catch (e) {
    console.log('picking stopped:', e.message);
  }
})();
for (let i = 0; i < nFrames; i++) {
  const s = await state();
  const at = ((Date.now() - t0) / 1000).toFixed(1);
  const name = `${outDir}/${prefix}-${String(i).padStart(2, '0')}.png`;
  await page.screenshot({ path: name });
  console.log(`${at}s  beat=${s.beat} shot=${s.shot} cloth=${s.fan} picks=${s.picks} title=${s.title} cap=${JSON.stringify(s.caption)}`);
  await page.waitForTimeout(every);
}
console.log(errors.length ? `PAGE ERRORS: ${errors.slice(0, 3).join(' | ')}` : 'no page errors');
await browser.close();
