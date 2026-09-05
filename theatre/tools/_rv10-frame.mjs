#!/usr/bin/env node
// reveal round 10: WHAT THE SPREAD IS WORTH IN THE FRAME. One run reports, for a given window:
//   · the spread's box on the cloth (|x|, z, rim margin, slot clearance) — geometry, from the meshes
//   · the spread's box ON SCREEN as a share of the frame (both the box's area and the ink it covers)
//   · the raised card's tap box in px (the keystone stood up, projected)
//   · what fraction of the frame his hand + sleeve take (a raycast grid, like _cam-r9-cover)
//   node tools/_rv10-frame.mjs [state] [w] [h]
import { chromium } from 'playwright';

const state = process.argv[2] ?? 'fan';
const W = +(process.argv[3] ?? 390), H = +(process.argv[4] ?? 760);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=${state}&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1400);
// PICKS=n lays n cards in the reading row first, so the plate that follows the beat can be measured
if (process.env.PICKS) {
  await page.evaluate((n) => {
    const R = window.__theatre.pieces.reveal, f = R._fan;
    const idx = [f.keystoneIndex, f.keystoneIndex + 4, f.keystoneIndex - 4].slice(0, n);
    f.fakePicks(idx);
    for (let i = R.picks.length; i < n; i++) R.picks.push({ index: idx[i], ordinal: i + 1, slug: 'x', slot: i, mesh: null });
  }, +process.env.PICKS);
  await page.waitForTimeout(6000);
}

const out = await page.evaluate(() => {
  const T = window.__theatre, THREE = T.THREE;
  const R = T.pieces.reveal, f = R._fan;
  const S = f.SPREAD;
  const cam = T.camera;
  const w = window.innerWidth, h = window.innerHeight;
  const proj = (v) => {
    const p = v.clone().project(cam);
    return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h];
  };
  // ---- geometry on the cloth ------------------------------------------------------------------
  const C = S.card;
  const corners = (x, z, ang) => {
    const s = Math.sin(ang), c = Math.cos(ang), o = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) o.push([x + (a * C.h * s + b * C.w * c) / 2, z + (a * C.h * c - b * C.w * s) / 2]);
    return o;
  };
  let maxX = 0, maxR = 0, minZ = 9, maxZ = -9, slotClear = 9;
  const ROWX = 0.29 + C.w / 2, ROWZ = 0.256;
  for (const t of S.tiers) {
    for (let j = 0; j < t.n; j++) {
      const a = t.n > 1 ? -t.phi + (j * 2 * t.phi) / (t.n - 1) : 0;
      for (const c of corners(t.r * Math.sin(a), t.r * Math.cos(a), a)) {
        maxX = Math.max(maxX, Math.abs(c[0]));
        maxR = Math.max(maxR, Math.hypot(c[0], c[1]));
        minZ = Math.min(minZ, c[1]);
        maxZ = Math.max(maxZ, c[1]);
        if (Math.abs(c[0]) <= ROWX) slotClear = Math.min(slotClear, c[1] - ROWZ);
      }
    }
  }
  // ---- the cloth the cards actually cover ------------------------------------------------------
  const inside = (q, px, pz) => { let s = false; for (let i = 0, k = q.length - 1; i < q.length; k = i++) if ((q[i][1] > pz) !== (q[k][1] > pz) && px < ((q[k][0] - q[i][0]) * (pz - q[i][1])) / (q[k][1] - q[i][1]) + q[i][0]) s = !s; return s; };
  const quads = [];
  for (const t of S.tiers) for (let j = 0; j < t.n; j++) { const a = t.n > 1 ? -t.phi + (j * 2 * t.phi) / (t.n - 1) : 0; quads.push(corners(t.r * Math.sin(a), t.r * Math.cos(a), a)); }
  let on = 0, tot = 0;
  for (let x = -0.62; x <= 0.62; x += 0.004) for (let z = -0.62; z <= 0.62; z += 0.004) { if (Math.hypot(x, z) > 0.62) continue; tot++; if (quads.some((q) => inside(q, x, z))) on++; }
  const cloth = (100 * on) / Math.max(1, tot);

  // ---- the spread on screen --------------------------------------------------------------------
  const live = f.entries.filter((e) => !e.removed && e.mesh.visible);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const box = new THREE.Box3();
  for (const e of live) {
    e.mesh.updateMatrixWorld(true);
    box.setFromObject(e.mesh);
    for (const X of [box.min.x, box.max.x]) for (const Y of [box.min.y, box.max.y]) for (const Z of [box.min.z, box.max.z]) {
      const [px, py] = proj(new THREE.Vector3(X, Y, Z));
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
  }
  const spreadBox = { w: x1 - x0, h: y1 - y0, x0, x1, y0, y1, pct: (100 * (x1 - x0) * (y1 - y0)) / (w * h) };

  // ---- the tap target: the keystone stood up ----------------------------------------------------
  f.liftIndex(f.keystoneIndex);
  const hv = f.hover ?? f.entries[f.keystoneIndex];
  hv.mesh.updateMatrixWorld(true);
  box.setFromObject(hv.mesh);
  let tx0 = 1e9, tx1 = -1e9, ty0 = 1e9, ty1 = -1e9;
  for (const X of [box.min.x, box.max.x]) for (const Y of [box.min.y, box.max.y]) for (const Z of [box.min.z, box.max.z]) {
    const [px, py] = proj(new THREE.Vector3(X, Y, Z));
    tx0 = Math.min(tx0, px); tx1 = Math.max(tx1, px); ty0 = Math.min(ty0, py); ty1 = Math.max(ty1, py);
  }
  const tap = { w: tx1 - tx0, h: ty1 - ty0 };

  // ---- what is in the picture, by area ----------------------------------------------------------
  const rc = new THREE.Raycaster();
  const N = 48, M = 84;
  const tally = {};
  let handLo = -1, handHi = -1;
  for (let j = 0; j < M; j++) {
    let sawHand = false;
    for (let i = 0; i < N; i++) {
      rc.setFromCamera(new THREE.Vector2(((i + 0.5) / N) * 2 - 1, 1 - ((j + 0.5) / M) * 2), cam);
      const hit = rc.intersectObjects(T.scene.children, true).filter((o) => o.object.visible && o.object.type === 'Mesh')[0];
      const nm = hit ? (() => { for (let p = hit.object; p; p = p.parent) if (p.name) return p.name; return hit.object.type; })() : 'nothing';
      const k = /^fan-card-/.test(nm) ? 'spread' : /^reveal-hand/.test(nm) ? 'hand' : /card-/.test(nm) ? 'row' : /cloth|table/.test(nm) ? 'cloth' : /floor|rug|board/.test(nm) ? 'floor' : /bench|pepe/.test(nm) ? 'him' : 'other';
      tally[k] = (tally[k] ?? 0) + 1;
      if (k === 'hand') sawHand = true;
    }
    if (sawHand) { if (handLo < 0) handLo = j; handHi = j; }
  }
  const total = N * M;
  const pcts = {};
  for (const [k, v] of Object.entries(tally)) pcts[k] = +((100 * v) / total).toFixed(1);
  // frame footprint on the cloth (where the four corners of the picture land on the cloth plane)
  const Y = T.layout.spread.y;
  const clothAt = (nx, ny) => {
    const p = new THREE.Vector3(nx, ny, 0.5).unproject(cam);
    const d = p.clone().sub(cam.position).normalize();
    if (Math.abs(d.y) < 1e-6) return null;
    const t = (Y - cam.position.y) / d.y;
    return t > 0 ? [cam.position.x + d.x * t, cam.position.z + d.z * t] : null;
  };
  const fp = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([a, b]) => clothAt(a, b));
  return {
    bows: S.tiers.map((t) => ({ r: +t.r.toFixed(4), phi: +t.phi.toFixed(4), n: t.n, pitch: +(t.pitch * 1000).toFixed(1) })),
    geom: { maxX: +maxX.toFixed(4), minZ: +minZ.toFixed(4), maxZ: +maxZ.toFixed(4), rimMargin: +((0.62 - maxR) * 1000).toFixed(1), slotClear: +(slotClear * 1000).toFixed(1), cloth: +cloth.toFixed(1) },
    spreadBox: { w: +spreadBox.w.toFixed(0), h: +spreadBox.h.toFixed(0), pct: +spreadBox.pct.toFixed(1) },
    tap: { w: +tap.w.toFixed(0), h: +tap.h.toFixed(0) },
    pcts,
    handBand: handLo < 0 ? null : [+((100 * handLo) / M).toFixed(0), +((100 * (handHi + 1)) / M).toFixed(0)],
    footprint: fp,
    fov: +cam.fov.toFixed(2),
  };
});
if (process.env.OUT) {
  await page.evaluate(() => window.__theatre?.pieces?.reveal?._fan?.liftIndex?.(window.__theatre.pieces.reveal._fan.keystoneIndex));
  await page.waitForTimeout(300);
  await page.screenshot({ path: process.env.OUT });
}
await browser.close();
const f = out.footprint.filter(Boolean);
console.log(`reveal/${state} ${W}x${H}   fov ${out.fov}`);
console.log(`  bows: ${out.bows.map((b) => `r${b.r} n${b.n} p${b.pitch}mm`).join(' | ')}`);
console.log(`  cloth geometry: |x| ${out.geom.maxX}  z ${out.geom.minZ}..${out.geom.maxZ}  rim margin ${out.geom.rimMargin} mm  slot clearance ${out.geom.slotClear} mm  cloth covered ${out.geom.cloth}%`);
console.log(`  spread box on screen: ${out.spreadBox.w} x ${out.spreadBox.h} px = ${out.spreadBox.pct}% of the frame`);
console.log(`  raised card tap box: ${out.tap.w} x ${out.tap.h} px`);
console.log(`  by area: ${Object.entries(out.pcts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}%`).join('  ')}`);
if (out.handBand) console.log(`  his hand + sleeve band: y ${out.handBand[0]}%..${out.handBand[1]}% of the frame`);
if (f.length === 4) console.log(`  frame on the cloth: x ${f[0][0].toFixed(3)}..${f[1][0].toFixed(3)} (top)  ${f[2][0].toFixed(3)}..${f[3][0].toFixed(3)} (bottom)   z ${f[0][1].toFixed(3)}..${f[2][1].toFixed(3)}`);
if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 3));
