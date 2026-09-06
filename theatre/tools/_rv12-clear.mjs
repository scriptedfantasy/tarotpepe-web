#!/usr/bin/env node
// reveal round 12: THE COLLISION SWEEP FOR THE NEW BEATS. tools/_rv11-sweep.mjs walks the smoosh;
// this walks everything that happens after it — the PUSH-OUT (the wash opened into the band the
// visitor picks from), a PICK carried to its slot, and the GATHER (both hands raking the mass back
// into a squared deck) — a drawing at a time, so nothing is missed between frames.
//
// Two questions, the same two: does anything on the cloth get inside a prop of the still life, and
// does anything go past the table's rim.
//
//   node tools/_rv12-clear.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const T = window.__theatre, scene = T.scene;
  const boxOf = (root) => {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox, e = o.matrixWorld.elements;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const p = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
        for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
      }
    });
    return mn[0] === Infinity ? null : { mn, mx };
  };
  const still = scene.getObjectByName('still-life');
  const props = [];
  if (still) still.children.forEach((c, i) => {
    const b = boxOf(c);
    if (b) props.push({ name: `still#${i}`, ...b });
  });
  const dist = (p, b) => {
    let d2 = 0;
    for (let i = 0; i < 3; i++) {
      const v = p[i] < b.mn[i] ? b.mn[i] - p[i] : p[i] > b.mx[i] ? p[i] - b.mx[i] : 0;
      d2 += v * v;
    }
    if (d2 > 0) return Math.sqrt(d2);
    let inside = Infinity;
    for (let i = 0; i < 3; i++) inside = Math.min(inside, p[i] - b.mn[i], b.mx[i] - p[i]);
    return -inside;
  };
  const S = [-0.5, -0.25, 0, 0.25, 0.5];
  const samples = (mesh, into) => {
    if (!mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox, e = mesh.matrixWorld.elements;
    const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, cz = (b.min.z + b.max.z) / 2;
    const sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
    for (const a of S) for (const c of S) for (const h of [-0.5, 0.5]) {
      const x = cx + a * sx, y = cy + h * sy, z = cz + c * sz;
      into.push([e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]);
    }
  };
  const R = T.pieces.reveal, F = R._fan;
  const groups = ['smoosh', 'fan', 'drawn', 'deck'];
  const rim = T.layout.table.radius;
  const walk = (name, frames) => {
    let worst = { d: Infinity, prop: null, card: null, k: -1 };
    let over = { r: 0, card: null, k: -1 };
    for (let k = 0; k < frames.length; k++) {
      R.hand.begin();
      frames[k]();
      R.hand.end();
      const pts = [], names = [];
      for (const gname of groups) {
        const g = scene.getObjectByName(gname);
        if (!g) continue;
        g.updateMatrixWorld(true);
        g.traverse((m) => {
          if (!m.isMesh) return;
          for (let p = m; p; p = p.parent) if (p.visible === false) return;
          const before = pts.length;
          samples(m, pts);
          for (let i = before; i < pts.length; i++) names.push(m.name || gname);
        });
      }
      for (const b of props)
        for (let i = 0; i < pts.length; i++) {
          const d = dist(pts[i], b);
          if (d < worst.d) worst = { d, prop: b.name, card: names[i], k };
        }
      for (let i = 0; i < pts.length; i++) {
        if (pts[i][1] > T.layout.table.top + 0.02) continue; // in a hand, over the rim: not on the cloth
        const r = Math.hypot(pts[i][0], pts[i][2]);
        if (r > over.r) over = { r, card: names[i], k };
      }
    }
    return { name, drawings: frames.length, worst, over };
  };

  const res = [];
  res.push(walk('the push-out', F.pushFrames()));
  F.lay();
  res.push(walk('a pick, carried to slot 0', F.pickFrames(F.entries[F.middleIndex], 0)));
  F.lay();
  F.fakePicks([5, 34, 60]);
  res.push(walk('the gather', F.gatherFrames()));
  F.lay();
  return { props: props.length, rim, res };
});

console.log(`reveal round 12 ${W}x${H} — ${out.props} props on the cloth, the rim at ${(out.rim * 1000).toFixed(0)} mm`);
for (const r of out.res) {
  console.log(`  ${r.name} (${r.drawings} drawings)`);
  console.log(`    nearest approach to a prop: ${(r.worst.d * 1000).toFixed(1)} mm — ${r.worst.card} vs ${r.worst.prop}, drawing ${r.worst.k}   ${r.worst.d < 0 ? 'INSIDE IT' : 'clear'}`);
  console.log(`    furthest anything on the cloth gets from the middle: ${(r.over.r * 1000).toFixed(1)} mm (${r.over.card}, drawing ${r.over.k}) — margin ${((out.rim - r.over.r) * 1000).toFixed(1)} mm`);
}
if (errs.length) console.log('PAGE ERRORS:', errs.slice(0, 4).join(' | '));
await browser.close();
