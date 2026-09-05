#!/usr/bin/env node
// round 7: THE COLLISION SWEEP. Runs a beat live and, on every rendered frame, measures the
// distance from every card on the table to every prop standing on it. Nothing is judged by eye:
// a card's box is sampled at its corners, edge middles and face centres, and each sample is
// measured against each prop's world box. Negative = the card is inside the prop.
//   node tools/_rv7-sweep.mjs <state> [seconds]
import { chromium } from 'playwright';

const state = process.argv[2] ?? 'shuffle';
const secs = +(process.argv[3] ?? 8);
const old = process.argv.includes('--old'); // put the deck back where the layout has it, to measure the bug
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=${state}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });

const out = await page.evaluate(async ({ secs, old }) => {
  const T = window.__theatre;
  const scene = T.scene;
  if (old) T.pieces.cards?.deck?.position.set(...T.layout.deck.pos);
  // ---- the props that stand on the cloth, as world boxes -------------------------------------
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
  // the still life's boxes are axis-aligned hulls of lathes, so they slightly over-claim at the
  // corners of a round object; a card grazing a corner of one of these is reported as closer than
  // it is, which is the direction to err in.
  const dist = (p, b) => {
    let d2 = 0;
    for (let i = 0; i < 3; i++) {
      const v = p[i] < b.mn[i] ? b.mn[i] - p[i] : p[i] > b.mx[i] ? p[i] - b.mx[i] : 0;
      d2 += v * v;
    }
    if (d2 > 0) return Math.sqrt(d2);
    // inside: minus the distance to the nearest face
    let inside = Infinity;
    for (let i = 0; i < 3; i++) inside = Math.min(inside, p[i] - b.mn[i], b.mx[i] - p[i]);
    return -inside;
  };
  // ---- the cards, as sampled boxes -------------------------------------------------------------
  const S = [-0.5, -0.25, 0, 0.25, 0.5];
  const cardGroups = ['fan', 'drawn', 'deck'];
  function samples(mesh, into) {
    if (!mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox, e = mesh.matrixWorld.elements;
    const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, cz = (b.min.z + b.max.z) / 2;
    const sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
    for (const a of S) for (const c of S) for (const h of [-0.5, 0, 0.5]) {
      const x = cx + a * sx, y = cy + h * sy, z = cz + c * sz;
      into.push([e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]);
    }
  }
  let worst = { d: Infinity, prop: null, card: null, t: 0 };
  let over = { r: 0, card: null, t: 0 }; // the furthest any card corner gets from the table's centre
  const hist = [];
  const frame = () => {
    const pts = [];
    const names = [];
    for (const gname of cardGroups) {
      const g = scene.getObjectByName(gname);
      if (!g) continue;
      g.updateMatrixWorld(true);
      g.traverse((m) => {
        if (!m.isMesh || m.visible === false) return;
        let p = m;
        let vis = true;
        while (p) { if (p.visible === false) vis = false; p = p.parent; }
        if (!vis) return;
        const before = pts.length;
        samples(m, pts);
        for (let i = before; i < pts.length; i++) names.push(m.name || gname);
      });
    }
    for (const b of props) {
      for (let i = 0; i < pts.length; i++) {
        const d = dist(pts[i], b);
        if (d < worst.d) worst = { d, prop: b.name, card: names[i], t: T.clock.t };
      }
    }
    for (let i = 0; i < pts.length; i++) {
      // only what is ON the cloth: a card in his hand may pass over the rim
      if (pts[i][1] > T.layout.table.top + 0.02) continue;
      const r = Math.hypot(pts[i][0], pts[i][2]);
      if (r > over.r) over = { r, card: names[i], t: T.clock.t };
    }
    hist.push(pts.length);
  };
  const t0 = performance.now();
  await new Promise((res) => {
    const tick = () => {
      frame();
      if (performance.now() - t0 > secs * 1000) res();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return { worst: { ...worst, mm: +(worst.d * 1000).toFixed(1) }, overhang: { ...over, r: +over.r.toFixed(4), rimMarginMm: +((T.layout.table.radius - over.r) * 1000).toFixed(1) }, props: props.length, frames: hist.length, maxCardSamples: Math.max(...hist) };
}, { secs, old });
console.log(state.padEnd(9), JSON.stringify(out));
await browser.close();
