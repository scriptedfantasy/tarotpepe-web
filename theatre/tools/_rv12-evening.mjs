#!/usr/bin/env node
// reveal round 12: THE EVENING, AS FAR AS THE CARDS GO. tools/_flow-test.mjs stalls at the door —
// the entrance waits there for the visitor's CLICK (flow.js → P.entrance.open()) and that tool
// never clicks, so it times out before the title card and never reaches the cloth at all. This one
// clicks the door, presses past the title, asks him for a reading in words, and then takes three
// cards out of the wash by ordinal — the spoken path, end to end, through the real flow.
//   node tools/_rv12-evening.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1000), H = +(process.argv[3] ?? 620);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre, R = T.pieces.reveal, D = T.pieces.dialogue;
    return { beat: T.pieces.flow?.beat, title: !!document.querySelector('#titles .card'), asking: !!D?.asking, cloth: R?.fanCount ?? 0, picks: R?.picks?.length ?? 0, drawn: T.pieces.cards?.drawn?.children?.length ?? 0 };
  });
const t0 = Date.now();
const say = async (tag) => {
  const s = await state();
  console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s ${tag.padEnd(24)} beat=${String(s.beat).padEnd(9)} cards on the cloth=${String(s.cloth).padEnd(3)} picks=${s.picks} drawn=${s.drawn}`);
  return s;
};
const until = async (label, ok, secs) => {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (ok(s)) return s;
    if (Date.now() - start > secs * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(400);
  }
};

await say('loaded');
// the door waits for a knock, and it only starts listening once the flow has reached that beat —
// so knock until it opens rather than once, at the top
for (let i = 0; i < 12; i++) {
  const s = await state();
  if (s.title || s.beat !== 'idle' && s.beat !== 'door') break;
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(2500);
  if ((await state()).beat !== 'door') break;
}
await until('the title card', (s) => s.title, 120);
await say('title');
await page.keyboard.press('Space');
await until('his question', (s) => s.asking, 120);
await say('he asks');
await page.keyboard.type('please read my cards');
await page.keyboard.press('Enter');
const fan = await until('the cards on the cloth', (s) => s.cloth > 0, 240);
await say('the wash is out');
if (fan.cloth !== 78) console.log(`  NOTE: ${fan.cloth} cards on the cloth, not 78`);
// "the third from the left", three times — the spoken path, through the piece the flow drives
for (let k = 0; k < 3; k++) {
  await page.evaluate(() => window.__theatre.pieces.reveal.pickByOrdinal(3));
  await until(`pick ${k + 1}`, (s) => s.picks > k, 60);
  await say(`picked the third from the left`);
}
const end = await until('the three read', (s) => s.drawn >= 3, 240);
await say('three cards in the row');
console.log(errs.length ? `PAGE ERRORS: ${errs.slice(0, 3).join(' | ')}` : 'no page errors');
await browser.close();
