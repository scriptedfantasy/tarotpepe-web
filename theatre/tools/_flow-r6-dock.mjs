#!/usr/bin/env node
// flow round 6: WHERE THE CAPTION CARD STANDS THROUGH THE DRAW BEAT. The user's exception is that
// the placard docks to the TOP while the visitor is choosing and drops back to the foot the moment
// the third card lands. This round moved the wash into the same frame the choosing happens in, so
// the dock now covers the wash as well — which is what it is for, since a card at the foot covers
// the near half of the mass. Measured rather than asserted: the card's top edge as a fraction of
// the frame, sampled through the whole beat.
//   node tools/_flow-r6-dock.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay {}' }));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const card = document.querySelector('#dialogue .cap');
    const box = card && !card.hidden ? card.getBoundingClientRect() : null;
    return {
      beat: T.pieces.flow?.beat,
      shot: T.pieces.camera?.current,
      field: !!document.querySelector('#dialogue input.keys'),
      picks: (T.pieces.reveal?.picks ?? []).length,
      fan: T.pieces.reveal?.fanCount ?? 0,
      top: box && box.height ? +(box.top / window.innerHeight).toFixed(3) : null,
      bottom: box && box.height ? +(box.bottom / window.innerHeight).toFixed(3) : null,
      text: box && box.height ? card.textContent.replace(/\s+/g, ' ').trim().slice(0, 44) : null,
    };
  });
async function until(label, fn, seconds = 120) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(70);
  }
}
await until('the door', (s) => s.beat === 'door' || s.beat === 'greeting' || s.beat === 'talk', 60);
for (let k = 0; k < 20; k++) {
  const s = await state();
  if (s.beat !== 'door' && s.beat !== 'idle') break;
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(900);
}
await until('the greeting and the open field', (s) => s.field && s.beat === 'talk', 150);
await page.keyboard.type('can you read my cards', { delay: 8 });
await page.keyboard.press('Enter');

const seen = [];
const note = (s) => {
  const key = `${s.beat}|${s.picks}|${s.top}`;
  if (s.top == null) return;
  if (seen.length && seen[seen.length - 1].key === key) return;
  seen.push({ key, ...s });
};
(async () => {
  for (let k = 0; k < 3; k++) {
    await until(`prompt ${k + 1}`, (s) => s.field && s.picks === k && s.fan > 3, 90);
    await page.waitForTimeout(900);
    await page.evaluate((n) => window.__theatre.pieces.reveal.pickByOrdinal(n), 4 + k * 9);
    await until(`pick ${k + 1}`, (s) => s.picks === k + 1, 40);
  }
})().catch((e) => console.log('picking stopped:', e.message));
const t0 = Date.now();
for (;;) {
  const s = await state();
  note(s);
  if (s.beat === 'reading' || s.beat === 'talk' || Date.now() - t0 > 120000) break;
  await page.waitForTimeout(90);
}
// and a few samples after the third card, when the placard must be back at the foot
for (let i = 0; i < 40; i++) {
  note(await state());
  await page.waitForTimeout(250);
}
const HEAD = 0.35; // anything whose top edge is above this third of the frame is docked
for (const s of seen) console.log(`beat=${s.beat.padEnd(8)} shot=${String(s.shot).padEnd(6)} picks=${s.picks}  top ${String(s.top).padEnd(6)} bottom ${String(s.bottom).padEnd(6)}  ${s.top < HEAD ? 'DOCKED (head)' : 'at the foot  '}  ${JSON.stringify(s.text)}`);
console.log(errors.length ? `PAGE ERRORS: ${errors.slice(0, 3).join(' | ')}` : 'no page errors');
await browser.close();
