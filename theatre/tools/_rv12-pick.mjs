#!/usr/bin/env node
// reveal round 12: THE PICK, DRIVEN LIKE A VISITOR — the round-7 probe (tools/_rv7-pick.mjs) with
// the bows taken out of it, because there are none: that tool reads `entry.t.k`, the number of the
// bow a card lay on, and the visitor now picks out of a wash. Everything it measured is measured
// here, on the same terms, so the numbers are comparable round to round:
//   · the card under the pointer moves UP the frame and never down (the user's rule);
//   · how big the raised card is on screen — the tap target, which is what a thumb has to hit;
//   · a tap on it takes it;
//   · and "the third from the left" / "the second from the right" still land on the card the
//     ordinal names (flow-lines.js → parsePick hands reveal.pickByOrdinal a 1-based rank).
//   node tools/_rv12-pick.mjs [width] [height] [touch]
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
const where = async (i) =>
  page.evaluate((i) => {
    const T = window.__theatre;
    const e = T.pieces.reveal._fan.entries[i];
    if (!e) return null;
    e.mesh.updateMatrixWorld(true);
    const V3 = T.camera.position.constructor;
    const v = e.mesh.getWorldPosition(new V3()).project(T.camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight, z: e.mesh.position.z, rank: e.i };
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
// the judging still leaves one card already standing up; the mass is closed again first, so the
// hover is measured from rest
await page.evaluate(() => window.__theatre.pieces.reveal._fan.lay());
const target = +(process.env.RV_TARGET ?? await page.evaluate(() => window.__theatre.pieces.reveal._fan.middleIndex));
const before = await where(target);
const p = { x: before.x, y: before.y };
await page.evaluate(() => { window.__theatre.pieces.reveal.awaitPick(); });
if (touch) await page.touchscreen.tap(p.x, p.y); // a thumb has no hover: the first tap stands one up
else await page.mouse.move(p.x, p.y);
await page.waitForTimeout(1800);
if (touch) log('first tap  ', await page.evaluate(() => ({ picks: window.__theatre.pieces.reveal.picks.length, standing: window.__theatre.pieces.reveal._fan.hover?.i ?? null })));
const hover = await page.evaluate(async () => {
  const T = window.__theatre;
  const f = T.pieces.reveal._fan;
  if (!f.hover) return null;
  const w = await import('/src/pieces/reveal-wash.js');
  const rest = w.WASH.poses[f.hover.i];
  const V3 = T.camera.position.constructor;
  f.hover.mesh.updateMatrixWorld(true);
  const at = (x, z) => {
    const v = new V3(x, T.layout.spread.y, z).project(T.camera);
    return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
  };
  const a = at(rest.x, rest.z), b = at(f.hover.mesh.position.x, f.hover.mesh.position.z);
  return { i: f.hover.i, lift: f.hover.lift, dz: 1000 * (f.hover.mesh.position.z - rest.z), dy: b[1] - a[1], dy2: 1000 * (f.hover.mesh.position.y - rest.y ?? 0) };
});
log('pointer at ', JSON.stringify(p), '→ hover', JSON.stringify({ i: hover?.i, lift: hover?.lift }));
log('moves      ', `dz ${hover ? hover.dz.toFixed(1) : '—'} mm (negative = up the frame)  dy_screen ${hover ? hover.dy.toFixed(1) : '—'} px (negative = up the picture)`);

// ---- the tap strip: how big the standing card is on screen -------------------------------------
const strip = await page.evaluate(() => {
  const T = window.__theatre;
  const e = T.pieces.reveal._fan.hover;
  if (!e) return null;
  const V3 = T.camera.position.constructor;
  e.mesh.updateMatrixWorld(true);
  const xs = [], ys = [];
  for (const dx of [-0.065, 0.065]) for (const dz of [-0.11375, 0.11375]) {
    const v = e.mesh.localToWorld(new V3(dx, 0, dz)).project(T.camera);
    xs.push(((v.x + 1) / 2) * window.innerWidth);
    ys.push(((1 - v.y) / 2) * window.innerHeight);
  }
  // the card's OWN edges on screen — what a thumb actually has to hit — as well as the axis-aligned
  // box round it, which is bigger for a card lying at an angle
  const P = (dx, dz) => {
    const v = e.mesh.localToWorld(new V3(dx, 0, dz)).project(T.camera);
    return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
  };
  const a = P(-0.065, -0.11375), b = P(0.065, -0.11375), c = P(-0.065, 0.11375);
  return {
    across: +Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(1),
    along: +Math.hypot(c[0] - a[0], c[1] - a[1]).toFixed(1),
    box: [+(Math.max(...xs) - Math.min(...xs)).toFixed(1), +(Math.max(...ys) - Math.min(...ys)).toFixed(1)],
  };
});
log('tap target ', JSON.stringify(strip), `px in a ${W}x${H} window — the raised card's own edges, and the box round it`);

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
  const x3 = +want3.mesh.position.x.toFixed(4);
  await R.pickByOrdinal(3);
  const got3 = R.picks[R.picks.length - 1];
  const wantEnd = R._fan.remaining()[R.fanCount - 2];
  const xEnd = +wantEnd.mesh.position.x.toFixed(4);
  await R.pickByOrdinal(R.fanCount - 1); // "the second from the right", as flow's parsePick maps it
  const gotEnd = R.picks[R.picks.length - 1];
  return {
    fanCountSeenByFlow: n,
    thirdFromLeft: { asked: want3.i, atX: x3, got: got3.index, ok: want3.i === got3.index },
    secondFromRight: { asked: wantEnd.i, atX: xEnd, got: gotEnd.index, ok: wantEnd.i === gotEnd.index },
    picks: R.picks.length,
  };
}));
await browser.close();
