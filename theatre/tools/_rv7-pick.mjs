#!/usr/bin/env node
// round 7: the pick, driven like a visitor. Moves a real pointer over the spread, checks that the
// card under it stands UP the frame (never down), taps it, and then checks that speaking a
// position still lands on the right card. Prints the tap strip it measured, in px.
//   node tools/_rv7-pick.mjs [width] [height] [touch]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const touch = process.argv.includes('touch');
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1500);

const log = (...a) => console.log(...a);
// where a card of the spread is on screen
const where = async (i) =>
  page.evaluate((i) => {
    const T = window.__theatre;
    const f = T.pieces.reveal._fan;
    const e = f.entries[i];
    if (!e) return null;
    e.mesh.updateMatrixWorld(true);
    const V3 = T.camera.position.constructor;
    const v = e.mesh.getWorldPosition(new V3()).project(T.camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight, z: e.mesh.position.z, tier: e.t.k, j: e.j };
  }, i);

log('count      ', await page.evaluate(() => window.__theatre.pieces.reveal.fanCount));
log('left→right ', await page.evaluate(() => {
  const r = window.__theatre.pieces.reveal._fan.remaining();
  const xs = r.map((e) => +e.mesh.position.x.toFixed(4));
  let mono = true;
  for (let i = 1; i < xs.length; i++) if (xs[i] < xs[i - 1] - 1e-6) mono = false;
  return { n: r.length, monotonicInX: mono, first: xs[0], last: xs[xs.length - 1] };
}));

// ---- the hover: point at a card and see which way it goes ------------------------------------
const target = +(process.env.RV7_TARGET ?? 13); // near the middle of the outer bow
const before = await where(target);
const p = await page.evaluate((i) => {
  // where that card is on screen, before anything is hovered
  const T = window.__theatre;
  const e = T.pieces.reveal._fan.entries[i];
  e.mesh.updateMatrixWorld(true);
  const V3 = T.camera.position.constructor;
  const v = e.mesh.getWorldPosition(new V3()).project(T.camera);
  return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
}, target);
await page.evaluate(() => { window.__theatre.pieces.reveal.awaitPick(); });
if (touch) await page.touchscreen.tap(p.x, p.y); // a thumb has no hover: the first tap stands one up
else await page.mouse.move(p.x, p.y);
await page.waitForTimeout(1800);
if (touch) log('first tap  ', await page.evaluate(() => ({ picks: window.__theatre.pieces.reveal.picks.length, standing: window.__theatre.pieces.reveal._fan.hover?.i ?? null })));
const after = await where(target);
const hover = await page.evaluate(() => {
  const f = window.__theatre.pieces.reveal._fan;
  return f.hover ? { i: f.hover.i, lift: f.hover.lift, tier: f.hover.t.k } : null;
});
log('pointer at ', JSON.stringify(p), '→ hover', JSON.stringify(hover));
log('moves      ', `dz ${(1000 * (after.z - before.z)).toFixed(1)} mm (negative = up the frame)  dy_screen ${(after.y - before.y).toFixed(1)} px (negative = up the picture)`);

// ---- the tap strip: how big the standing card is on screen -------------------------------------
const strip = await page.evaluate(() => {
  const T = window.__theatre;
  const f = T.pieces.reveal._fan;
  const e = f.hover;
  if (!e) return null;
  const V3 = T.camera.position.constructor;
  e.mesh.updateMatrixWorld(true);
  const xs = [], ys = [];
  for (const dx of [-0.065, 0.065]) for (const dz of [-0.11375, 0.11375]) {
    const v = e.mesh.localToWorld(new V3(dx, 0, dz)).project(T.camera);
    xs.push(((v.x + 1) / 2) * window.innerWidth);
    ys.push(((1 - v.y) / 2) * window.innerHeight);
  }
  return { w: +(Math.max(...xs) - Math.min(...xs)).toFixed(1), h: +(Math.max(...ys) - Math.min(...ys)).toFixed(1) };
});
log('tap strip  ', JSON.stringify(strip), `px in a ${W}x${H} window`);

// ---- and the tap itself ------------------------------------------------------------------------
if (touch) await page.touchscreen.tap(p.x, p.y);
else await page.mouse.click(p.x, p.y);
await page.waitForTimeout(2600);
log('after tap  ', await page.evaluate(() => {
  const R = window.__theatre.pieces.reveal;
  return { picks: R.picks.length, first: R.picks[0] ? { index: R.picks[0].index, ordinal: R.picks[0].ordinal, slug: R.picks[0].slug, slot: R.picks[0].slot } : null, left: R.fanCount };
}));

// ---- "the third from the left", and "the second from the right" --------------------------------
log('spoken     ', await page.evaluate(async () => {
  const R = window.__theatre.pieces.reveal;
  const n = R.fanCount;
  const want3 = R._fan.remaining()[2];
  await R.pickByOrdinal(3);
  const got3 = R.picks[R.picks.length - 1];
  const wantEnd = R._fan.remaining()[R.fanCount - 2];
  await R.pickByOrdinal(R.fanCount - 1); // "the second from the right", as flow's parsePick maps it
  const gotEnd = R.picks[R.picks.length - 1];
  return {
    fanCountSeenByFlow: n,
    thirdFromLeft: { asked: want3.i, got: got3.index, ok: want3.i === got3.index },
    secondFromRight: { asked: wantEnd.i, got: gotEnd.index, ok: wantEnd.i === gotEnd.index },
    picks: R.picks.length,
  };
}));
await browser.close();
