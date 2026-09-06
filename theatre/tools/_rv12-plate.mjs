#!/usr/bin/env node
// reveal round 12: WHAT THE CAMERA IS COMPOSING ON, and how big a card is in the picture.
// Drives the live page, reads the camera's own subject solve, and measures the mass in the frame.
//   node tools/_rv12-plate.mjs [w] [h] [state]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const state = process.argv[4] ?? 'fan';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=${state}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1200);

const out = await page.evaluate(async () => {
  const T = window.__theatre;
  const R = T.pieces.reveal, C = T.pieces.camera;
  const cs = await import('/src/pieces/camera-shots.js');
  const SUB = cs.tableSubject(T.layout, R);
  const V3 = T.camera.position.constructor;
  const proj = (x, z) => {
    const v = new V3(x, T.layout.spread.y, z).project(T.camera);
    return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
  };
  // the mass on screen
  const f = R._fan;
  const xs = [], ys = [];
  for (const e of f.entries) {
    if (e.removed) continue;
    e.mesh.updateMatrixWorld(true);
    for (const dx of [-0.065, 0.065]) for (const dz of [-0.11375, 0.11375]) {
      const v = e.mesh.localToWorld(new V3(dx, 0, dz)).project(T.camera);
      xs.push(((v.x + 1) / 2) * window.innerWidth);
      ys.push(((1 - v.y) / 2) * window.innerHeight);
    }
  }
  // one card's width on screen, at the middle of the mass
  const mid = f.entries[f.middleIndex];
  let cardW = null, cardH = null;
  if (mid) {
    const cx = [], cy = [];
    for (const dx of [-0.065, 0.065]) for (const dz of [-0.11375, 0.11375]) {
      const v = mid.mesh.localToWorld(new V3(dx, 0, dz)).project(T.camera);
      cx.push(((v.x + 1) / 2) * window.innerWidth);
      cy.push(((1 - v.y) / 2) * window.innerHeight);
    }
    cardW = Math.max(...cx) - Math.min(...cx);
    cardH = Math.max(...cy) - Math.min(...cy);
  }
  const a = proj(0, 0), b = proj(0.1, 0);
  return {
    shot: C?.current,
    src: SUB.src,
    subject: { x: +SUB.all.x.toFixed(4), z0: +SUB.all.z0.toFixed(4), z1: +SUB.all.z1.toFixed(4) },
    spread: { x: +SUB.spread.x.toFixed(4), z0: +SUB.spread.z0.toFixed(4), z1: +SUB.spread.z1.toFixed(4) },
    bounds: R.tableBounds,
    pxPerM: +(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1).toFixed(1),
    massPx: { x0: +Math.min(...xs).toFixed(0), x1: +Math.max(...xs).toFixed(0), y0: +Math.min(...ys).toFixed(0), y1: +Math.max(...ys).toFixed(0) },
    cardPx: cardW ? { w: +cardW.toFixed(1), h: +cardH.toFixed(1) } : null,
    win: [window.innerWidth, window.innerHeight],
  };
});
console.log(`reveal/${state} ${W}x${H}   shot ${out.shot}   subject from: ${out.src}`);
console.log(`  published box   |x| ≤ ${out.bounds ? Math.max(...out.bounds.map((p) => Math.abs(p[0]))).toFixed(3) : '—'}  z ${out.bounds ? out.bounds[0][1].toFixed(3) + '..' + out.bounds[3][1].toFixed(3) : '—'}`);
console.log(`  camera subject  |x| ≤ ${out.subject.x}  z ${out.subject.z0}..${out.subject.z1}   (the mass alone: ${out.spread.x} / ${out.spread.z0}..${out.spread.z1})`);
console.log(`  scale           ${out.pxPerM} px per metre of cloth   the frame holds ${(out.win[0] / out.pxPerM).toFixed(3)} x ${(out.win[1] / out.pxPerM).toFixed(3)} m`);
console.log(`  the mass on screen  x ${out.massPx.x0}..${out.massPx.x1} of ${out.win[0]}   y ${out.massPx.y0}..${out.massPx.y1} of ${out.win[1]}   = ${(((out.massPx.x1 - out.massPx.x0) * (out.massPx.y1 - out.massPx.y0)) / (out.win[0] * out.win[1]) * 100).toFixed(1)}% of the frame`);
console.log(`  a card at rest  ${out.cardPx ? `${out.cardPx.w} x ${out.cardPx.h} px` : '—'}`);
if (errs.length) console.log('PAGE ERRORS:', errs.slice(0, 4).join(' | '));
await browser.close();
