#!/usr/bin/env node
// reveal round 11: WHAT WINDOW IS THE SMOOSH ACTUALLY PLAYED IN?
// The raft is solved against the frame, so the frame has to be measured in the state the raft is
// played in — not on the `fan` plate with a fan on it, which is a different picture. Unprojects
// the four corners of the picture onto the cloth and prints the world rectangle, at both nestings,
// and how much of it the raft and the two hands fill.
//
//   node tools/_rv11-win.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
for (const [W, H] of [[1600, 900], [390, 760]]) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
  await page.goto('http://127.0.0.1:5173/?view=reveal&state=shuffle', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    const T = window.__theatre, THREE = T.THREE;
    const cam = T.camera;
    const Y = T.layout.spread.y;
    const hit = (nx, ny) => {
      const v = new THREE.Vector3(nx, ny, 0.5).unproject(cam);
      const d = v.sub(cam.position).normalize();
      const t = (Y - cam.position.y) / d.y;
      return [cam.position.x + d.x * t, cam.position.z + d.z * t];
    };
    const c = [hit(-1, 1), hit(1, 1), hit(1, -1), hit(-1, -1)];
    const xs = c.map((p) => p[0]), zs = c.map((p) => p[1]);
    const R = T.pieces.reveal._shuffle?.raft ?? null;
    const sh = T.pieces.reveal._shuffle;
    // the raft's own extent, at the drawing the wash finishes on
    // EVERY DRAWING, not just the one the wash finishes on: "nothing bisected by an edge" is a
    // rule about the worst frame of the take, and the raft is worked about for fifty-eight of them.
    let raft = null;
    if (sh) {
      const card = T.layout.spread.card;
      let x = 0, z0 = 9, z1 = -9, atX = 0, atZ = 0;
      for (let k = 0; k < sh.frames.length; k++) {
        T.pieces.reveal.hand.begin();
        sh.frames[k]();
        T.pieces.reveal.hand.end();
        for (const m of sh.meshes) {
          if (!m.visible) continue;
          const a = -m.rotation.y, s = Math.sin(a), co = Math.cos(a);
          for (const p of [-1, 1]) for (const q of [-1, 1]) {
            const gx = m.position.x + (p * card.h * s + q * card.w * co) / 2;
            const gz = m.position.z + (p * card.h * co - q * card.w * s) / 2;
            if (Math.abs(gx) > x) { x = Math.abs(gx); atX = k; }
            if (gz < z0) { z0 = gz; atZ = k; }
            if (gz > z1) { z1 = gz; atZ = k; }
          }
        }
      }
      raft = { x, z0, z1, atX, atZ, frames: sh.frames.length };
      sh.frames[0]();
    }
    return { shot: T.pieces.camera?.current ?? '?', win: { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) }, R, raft };
  });
  const w = out.win;
  console.log(`${W}x${H}  shot '${out.shot}'  window ${(w.x1 - w.x0).toFixed(3)} x ${(w.z1 - w.z0).toFixed(3)} m   x ${w.x0.toFixed(3)}..${w.x1.toFixed(3)}  z ${w.z0.toFixed(3)}..${w.z1.toFixed(3)}`);
  if (out.raft)
    console.log(
      `   raft over all ${out.raft.frames} drawings: ${(2 * out.raft.x).toFixed(3)} x ${(out.raft.z1 - out.raft.z0).toFixed(3)} m = ` +
        `${((100 * 2 * out.raft.x) / (w.x1 - w.x0)).toFixed(0)}% of the width, ${((100 * (out.raft.z1 - out.raft.z0)) / (w.z1 - w.z0)).toFixed(0)}% of the height   ` +
        `worst margins: sides ${(1000 * (w.x1 - out.raft.x)).toFixed(0)} mm (drawing ${out.raft.atX}), near ${(1000 * (w.z1 - out.raft.z1)).toFixed(0)}, far ${(1000 * (out.raft.z0 - w.z0)).toFixed(0)} (drawing ${out.raft.atZ})`,
    );
  if (errs.length) console.log('   PAGE ERRORS:', errs.slice(0, 3).join(' | '));
  await page.close();
}
await browser.close();
