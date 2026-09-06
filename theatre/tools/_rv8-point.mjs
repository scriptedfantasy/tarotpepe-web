#!/usr/bin/env node
// round 8: DOES THE CARD THAT STANDS UP LIE UNDER THE FINGER? Samples the cloth on a 2 mm grid.
// At each point it works out which card is actually DRAWN there — the one whose footprint covers
// the point and rides highest, which is exactly what the eye sees, the spread being flat — and
// asks the pick's own mapping (reveal-spread.js → indexAt) which card it would stand up.
//   node tools/_rv8-point.mjs [w] [h]   — the window shape chooses the nesting (round 10)
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: +(process.argv[2] ?? 900), height: +(process.argv[3] ?? 600) }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1000);

const res = await page.evaluate(async () => {
  const T = window.__theatre;
  const f = T.pieces.reveal._fan;
  const sp = await import('/src/pieces/reveal-spread.js');
  f.lay(); // the closed spread, nothing lifted
  // every card's footprint on the cloth and how high it rides — straight off the live meshes
  const cards = f.entries
    .filter((e) => !e.removed && !e.flying)
    // round 12: the bows are gone (the visitor picks out of a wash), so every card is on the same
    // "bow 0" and the per-bow breakdown below has one line. Everything else is unchanged, and
    // reveal-spread.js now re-exports the wash's own geometry, so this measures the surface that is
    // actually out.
    .map((e) => ({ i: e.i, tier: e.t?.k ?? 0, y: e.mesh.position.y, quad: sp.cardCorners({ x: e.mesh.position.x, z: e.mesh.position.z, ang: -e.mesh.rotation.y }) }));
  const inside = (q, px, pz) => {
    let s = false;
    for (let i = 0, k = q.length - 1; i < q.length; k = i++) if ((q[i][1] > pz) !== (q[k][1] > pz) && px < ((q[k][0] - q[i][0]) * (pz - q[i][1])) / (q[k][1] - q[i][1]) + q[i][0]) s = !s;
    return s;
  };
  const G = 0.002;
  let n = 0, agree = 0;
  const off = [], byTier = {};
  for (let x = -0.45; x <= 0.45; x += G)
    for (let z = 0.2; z <= 0.6; z += G) {
      let top = null;
      for (const c of cards) if (inside(c.quad, x, z) && (!top || c.y > top.y)) top = c;
      if (!top) continue;
      n++;
      const chosen = sp.indexAt(x, z);
      byTier[top.tier] ??= { n: 0, ok: 0 };
      byTier[top.tier].n++;
      if (chosen === top.i) {
        agree++;
        byTier[top.tier].ok++;
      } else off.push(Math.abs((chosen ?? -99) - top.i));
    }
  off.sort((a, b) => a - b);
  return { n, agree, pct: (100 * agree) / Math.max(1, n), median: off.length ? off[off.length >> 1] : 0, worst: off.length ? off[off.length - 1] : 0, byTier };
});
await browser.close();
console.log(`points on a card ${res.n}  the mapping names the card actually drawn there ${res.pct.toFixed(1)}%  (when it does not: median ${res.median} ranks away, worst ${res.worst})`);
for (const [k, v] of Object.entries(res.byTier)) console.log(`  bow ${k}: ${((100 * v.ok) / v.n).toFixed(1)}% of ${v.n} points`);
