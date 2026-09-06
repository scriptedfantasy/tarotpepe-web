#!/usr/bin/env node
// reveal round 12: THE WINDOW DRAGGED FROM ONE SHAPE TO THE OTHER while the mass is out. This is the
// round-10 resize probe (tools/_rv10-resize.mjs) with the bows taken out of it: the band is laid
// narrower and deeper on a portrait window, so every card on the cloth has to be re-laid when the
// shape crosses the line — and a card already taken into a reading slot must stay taken.
// Loads at 1600x900, resizes to 390x760 and back, and checks after each: no page error, 78 cards
// accounted for, every card lying exactly where reveal-wash.js says, the picks kept.
//   node tools/_rv12-resize.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1500);

const probe = () =>
  page.evaluate(() => {
    const T = window.__theatre, f = T.pieces.reveal._fan, W = f.WASH;
    let laid = 0, off = 0, lost = 0, worst = 0;
    for (const e of f.entries) {
      if (e.removed || e.flying) { lost++; continue; }
      const p = W.poses[e.i];
      // the hovered card is lifted up the frame; everything else is exactly where the band says
      const d = Math.hypot(e.mesh.position.x - p.x, e.mesh.position.z - p.z);
      if (d < 0.0005 || (f.hover === e && Math.abs(d - W.lift.z) < 0.0005)) laid++;
      else {
        off++;
        worst = Math.max(worst, d);
      }
    }
    const box = T.pieces.reveal.tableBounds;
    return {
      shape: W.shape, seed: W.seed, entries: f.entries.length, total: W.poses.length,
      laid, off, worst: +(1000 * worst).toFixed(1), lost,
      middle: f.middleIndex, picks: T.pieces.reveal.picks.length,
      box: `|x| ≤ ${Math.max(...box.map((q) => Math.abs(q[0]))).toFixed(3)}  z ${box[0][1].toFixed(3)}..${box[3][1].toFixed(3)}`,
      w: window.innerWidth, h: window.innerHeight,
    };
  });

const say = (tag, p) => console.log(`${tag.padEnd(20)} ${p.w}x${p.h}  band=${p.shape} seed ${p.seed}  ${p.entries} cards (${p.total} poses)  where the band says: ${p.laid}, elsewhere ${p.off}${p.off ? ` (worst ${p.worst} mm)` : ''}, in a slot/flying ${p.lost}  middle ${p.middle}  picks ${p.picks}   ${p.box}`);

say('as loaded', await probe());
await page.setViewportSize({ width: 390, height: 760 });
await page.evaluate(() => window.dispatchEvent(new Event('resize'))); // headless Chromium does not fire one for setViewportSize
await page.waitForTimeout(1200);
say('→ 390x760', await probe());
await page.evaluate(async () => {
  const f = window.__theatre.pieces.reveal._fan;
  await f.doPick(f.entries[f.middleIndex]);
});
await page.waitForTimeout(1200);
say('  after one pick', await probe());
await page.setViewportSize({ width: 1600, height: 900 });
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await page.waitForTimeout(1200);
say('→ 1600x900', await probe());
console.log(errs.length ? `PAGE ERRORS: ${errs.slice(0, 4).join(' | ')}` : 'no page errors');
await browser.close();
