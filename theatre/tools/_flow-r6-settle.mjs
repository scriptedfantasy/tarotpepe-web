#!/usr/bin/env node
// flow round 6: DOES THE WASH COME TO REST WITHOUT LURCHING, AND DOES IT LAND ON THE POSES THE
// VISITOR PICKS FROM? Walks every drawing of the smoosh, measures how far a card moves from one to
// the next (a settle nobody notices is one that moves no faster than the swirl already does), and
// then checks the last drawing against reveal-wash's own poses, card for card — which is the whole
// contract that lets the push-out be deleted.
//   node tools/_flow-r6-settle.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=shuffle', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);

const out = await page.evaluate(async () => {
  const T = window.__theatre;
  const R = T.pieces.reveal;
  const sh = R._shuffle;
  if (!sh) return { err: 'no shuffle take' };
  const N = sh.meshes.length;
  const per = [];
  let prev = null;
  for (let k = 0; k < sh.frames.length; k++) {
    R.hand.begin();
    sh.frames[k]();
    R.hand.end();
    const now = sh.meshes.map((m) => ({ x: m.position.x, z: m.position.z, a: m.rotation.y, v: m.visible }));
    if (prev) {
      let d = 0, da = 0;
      for (let i = 0; i < N; i++) {
        if (!now[i].v || !prev[i].v) continue;
        d = Math.max(d, Math.hypot(now[i].x - prev[i].x, now[i].z - prev[i].z));
        let t = Math.abs(now[i].a - prev[i].a) % (2 * Math.PI);
        if (t > Math.PI) t = 2 * Math.PI - t;
        da = Math.max(da, t);
      }
      per.push({ k, mm: +(1000 * d).toFixed(1), deg: +((180 / Math.PI) * da).toFixed(1) });
    }
    prev = now;
  }
  // the last drawing against the poses the visitor picks from
  const w = await import('/src/pieces/reveal-wash.js');
  const P = w.WASH.poses;
  const last = sh.meshes.map((m) => ({ x: m.position.x, z: m.position.z, y: m.position.y }));
  const used = new Set();
  let worst = 0;
  for (const c of last) {
    let bd = Infinity, bj = -1;
    for (let j = 0; j < P.length; j++) {
      if (used.has(j)) continue;
      const d = Math.hypot(P[j].x - c.x, P[j].z - c.z);
      if (d < bd) { bd = d; bj = j; }
    }
    used.add(bj);
    worst = Math.max(worst, bd);
  }
  // and the heights: the pick piece draws a card at Y + T/2 + (rank/78)*DEEP
  R.setState && null;
  return { frames: sh.frames.length, per, restOffMm: +(1000 * worst).toFixed(3), marks: sh.marks };
});
if (out.err) { console.log(out.err); await browser.close(); process.exit(1); }
const swirlEnd = out.marks.swirled;
const settleFrom = swirlEnd - 12;
const seg = (a, b) => {
  const s = out.per.filter((p) => p.k > a && p.k <= b);
  return `${s.length} drawings, worst ${Math.max(...s.map((p) => p.mm)).toFixed(1)} mm and ${Math.max(...s.map((p) => p.deg)).toFixed(1)}° a drawing, median ${s.map((p) => p.mm).sort((x, y) => x - y)[s.length >> 1].toFixed(1)} mm`;
};
console.log(`${W}x${H}  ${out.frames} drawings   marks ${JSON.stringify(out.marks)}`);
console.log(`  the splay     ${seg(0, out.marks.washed)}`);
console.log(`  the swirl     ${seg(out.marks.washed, settleFrom)}`);
console.log(`  THE SETTLE    ${seg(settleFrom, swirlEnd)}`);
console.log(`  hands off     ${seg(swirlEnd, out.frames)}`);
console.log(`  the wash comes to rest ${out.restOffMm} mm off the poses the visitor picks from (must be 0.0)`);
await browser.close();
