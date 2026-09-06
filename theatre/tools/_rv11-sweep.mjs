#!/usr/bin/env node
// reveal round 11: THE COLLISION SWEEP, FOR THE SMOOSH. tools/_rv7-sweep.mjs samples the groups
// that existed when it was written — 'fan', 'drawn', 'deck' — and the seventy-eight washed cards
// are a group of their own ('smoosh'), so that tool reports two frames of the deck and misses the
// beat entirely. This is the same measurement over the same still life, driven a DRAWING AT A TIME
// through the whole take rather than sampled off the clock, so nothing is missed between frames.
//
//   node tools/_rv11-sweep.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=shuffle&shot=1', { waitUntil: 'load', timeout: 180000 });
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
  const R = T.pieces.reveal;
  const sh = R._shuffle;
  if (!sh) return { err: 'no shuffle take' };
  // THE CARDS, and not his arms. The two sleeves run back over the still life on purpose — the
  // ribbon is carried 155 mm above the cloth precisely so it clears the clutter (reveal-hand.js →
  // ARM.elbowY) — and they run off the table to his shoulder, so both of this tool's questions are
  // meaningless for them. tools/_rv9-clear.mjs and _rv9-sleeve.mjs are the arm's own measurements.
  const groups = ['smoosh', 'fan', 'drawn', 'deck'];
  let worst = { d: Infinity, prop: null, card: null, k: -1 };
  let over = { r: 0, card: null, k: -1 };
  let n = 0;
  const rim = T.layout.table.radius;
  for (let k = 0; k < sh.frames.length; k++) {
    R.hand.begin();
    sh.frames[k]();
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
    n = Math.max(n, pts.length);
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
  sh.frames[0]();
  return { drawings: sh.frames.length, props: props.length, samples: n, worst, over, rim };
});

if (out.err) console.log('ERR', out.err);
else {
  console.log(`reveal/shuffle ${W}x${H}   ${out.drawings} drawings, ${out.props} props, up to ${out.samples} samples a drawing`);
  console.log(`  nearest approach to a prop: ${(out.worst.d * 1000).toFixed(1)} mm — ${out.worst.card} vs ${out.worst.prop}, drawing ${out.worst.k}   ${out.worst.d < 0 ? 'INSIDE IT' : 'clear'}`);
  console.log(`  furthest anything on the cloth gets from the middle: ${(out.over.r * 1000).toFixed(1)} mm (${out.over.card}, drawing ${out.over.k}) — the rim is ${(out.rim * 1000).toFixed(0)}, margin ${((out.rim - out.over.r) * 1000).toFixed(1)} mm`);
}
if (errs.length) console.log('PAGE ERRORS:', errs.slice(0, 4).join(' | '));
await browser.close();
