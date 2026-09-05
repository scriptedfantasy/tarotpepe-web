#!/usr/bin/env node
// round 8: the hover, measured on the card that ACTUALLY stands up (round 7's probe measured a
// card it had aimed at, which is no longer the same card now the pointer names what is drawn under
// it). Reports which way that card moves, in metres of cloth and in pixels of picture.
//   node tools/_rv8-lift.mjs [width] [height]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);

// three places on the spread: the middle, a third of the way out, and near the left end
for (const frac of [0, 0.4, 0.85]) {
  const p = await page.evaluate((frac) => {
    const T = window.__theatre;
    const f = T.pieces.reveal._fan;
    f.lay();
    const t = f.SPREAD.tiers[0];
    const j = Math.round(((t.n - 1) / 2) * (1 - frac));
    const e = f.entries[j];
    e.mesh.updateMatrixWorld(true);
    const V3 = T.camera.position.constructor;
    const v = e.mesh.getWorldPosition(new V3()).project(T.camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight, aimed: j };
  }, frac);
  await page.evaluate(() => window.__theatre.pieces.reveal._fan.lay());
  const before = await page.evaluate(() => window.__theatre.pieces.reveal._fan.entries.map((e) => ({ z: e.mesh.position.z, y: e.mesh.position.y })));
  await page.evaluate(() => { window.__theatre.pieces.reveal.awaitPick(); });
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => {
    const f = window.__theatre.pieces.reveal._fan;
    const e = f.hover;
    if (!e) return null;
    e.mesh.updateMatrixWorld(true);
    const V3 = window.__theatre.camera.position.constructor;
    const v = e.mesh.getWorldPosition(new V3()).project(window.__theatre.camera);
    return { i: e.i, tier: e.t.k, j: e.j, lift: e.lift, z: e.mesh.position.z, y: e.mesh.position.y, sy: ((1 - v.y) / 2) * window.innerHeight };
  });
  if (!after) { console.log(`aimed at card ${p.aimed}: nothing stood up`); continue; }
  const b = before[after.i];
  console.log(
    `pointer on card ${p.aimed}'s centre → card ${after.i} (bow ${after.tier}, j ${after.j}) stands up, lift ${after.lift}: ` +
      `dz ${((after.z - b.z) * 1000).toFixed(1)} mm (negative = up the frame), dy ${((after.y - b.y) * 1000).toFixed(1)} mm proud`,
  );
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
  await page.waitForTimeout(900);
}
await browser.close();
