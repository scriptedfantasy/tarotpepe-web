#!/usr/bin/env node
// WHAT IS ON THE SHELF END OF THE BACK WALL, in world metres, and where each resting plate stops on
// that wall. The stretch the window left bare runs from the stage-left corner (x -2.6) to the
// clock's box (x -0.89), and what stands in it is the TALL CASE, floor to head line on its own
// plinth, and the clock on the plaster beside it. (A radiator stood under the case while the case
// stood on legs; both have gone.) This prints every mesh whose
// box touches the stretch, so nothing can be put there that goes through anything else, and then the
// two switches in the case — the radio and the VIN bottle — measured on the glass window by window.
//
//   BASE=http://127.0.0.1:8739 node tools/_shelf-where.mjs
//   W=390 H=844 BASE=... node tools/_shelf-where.mjs     # the frame that binds
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 800) }, deviceScaleFactor: 1 });
page.setDefaultNavigationTimeout(180000);
page.setDefaultTimeout(180000);
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
const u = new URL(BASE);
u.searchParams.set('shot', '1');
u.searchParams.set('t', '2');
await page.goto(u.toString(), { waitUntil: 'load' });
await page.waitForFunction(() => window.__theatreReady === true, null, { timeout: 180000 });

const out = await page.evaluate(() => {
  const T = window.__theatre.THREE;
  const scene = window.__theatre.scene;
  const P = window.__theatre.pieces.props;
  const f4 = (n) => +n.toFixed(4);
  const box = (o) => {
    if (!o) return null;
    const b = new T.Box3().setFromObject(o);
    if (!isFinite(b.min.x)) return null;
    return { x: [f4(b.min.x), f4(b.max.x)], y: [f4(b.min.y), f4(b.max.y)], z: [f4(b.min.z), f4(b.max.z)] };
  };
  // every mesh that touches the stretch and stands anywhere near the wall
  const rows = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const b = new T.Box3().setFromObject(o);
    if (!isFinite(b.min.x)) return;
    if (b.max.x < -2.62 || b.min.x > -0.8) return;
    if (b.min.z > -1.6) return;
    rows.push({ name: o.name || o.parent?.name || o.geometry?.type || '?', x: [f4(b.min.x), f4(b.max.x)], y: [f4(b.min.y), f4(b.max.y)], z: [f4(b.min.z), f4(b.max.z)] });
  });
  rows.sort((a, b) => a.x[0] - b.x[0]);
  const named = {
    clock: box(P.group?.userData?.wallClock),
    radio: box(scene.getObjectByName('radio')),
    shelf: box(scene.getObjectByName('tall-case')),
    wine: box(scene.getObjectByName('vin-bottle')),
  };
  // where each plate's edges land on the back wall plane (z = -2.5)
  const cam = window.__theatre.camera;
  const plates = {};
  for (const s of ['home', 'wide', 'shelf']) {
    window.__theatre.pieces.camera.cut(s);
    cam.updateMatrixWorld(true);
    const edge = (ndcx, ndcy) => {
      const v = new T.Vector3(ndcx, ndcy, 0.5).unproject(cam);
      const d = v.sub(cam.position).normalize();
      const t = (-2.5 - cam.position.z) / d.z;
      const p = cam.position.clone().addScaledVector(d, t);
      return [f4(p.x), f4(p.y)];
    };
    plates[s] = { left: edge(-1, 0), right: edge(1, 0), top: edge(0, 1), bottom: edge(0, -1), pos: [f4(cam.position.x), f4(cam.position.y), f4(cam.position.z)] };
  }
  return { rows, named, plates };
});
console.log(JSON.stringify(out, null, 1));
await page.close();

// ---- what the two switches in the case measure on the glass, window by window --------------------
// The set and the bottle are the only things on this wall a pointer answers. Their boxes are the
// projection of the object's own corners; the tap box is that grown about its centre to 44 px, and
// the last column says whether the two of them are anywhere near each other, because the arbiter
// (props.js SWITCHES) hands an overlapping pair to the snuggest box and a pair that never overlaps
// is a pair that can never be confused.
for (const [W, H] of [[1280, 800], [1600, 900], [390, 844]]) {
  const p2 = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p2.setDefaultNavigationTimeout(180000);
  p2.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  const u2 = new URL(BASE);
  u2.searchParams.set('view', 'props');
  u2.searchParams.set('state', 'default');
  u2.searchParams.set('shot', '1');
  await p2.goto(u2.toString(), { waitUntil: 'load' });
  await p2.waitForFunction(() => window.__theatreReady === true, null, { timeout: 180000 });
  for (const shot of ['home', 'wide', 'shelf']) {
    const m = await p2.evaluate((s) => {
      window.__theatre.pieces.camera.cut(s);
      const P = window.__theatre.pieces.props;
      const f = (b) => (b ? { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.w.toFixed(1), h: +b.h.toFixed(1), grown: !!b.grown } : null);
      // …and the case itself, projected the same way, because the question "what does a phone see of
      // it" is answered in px and not in metres: a right edge at a negative x is a case off the
      // side of the picture.
      const T = window.__theatre.THREE;
      const cam = window.__theatre.camera;
      cam.updateMatrixWorld(true);
      const o = window.__theatre.scene.getObjectByName('tall-case');
      let shelf = null;
      if (o) {
        const bb = new T.Box3().setFromObject(o);
        const W2 = window.__theatre.ctx?.size?.w || window.innerWidth, H2 = window.__theatre.ctx?.size?.h || window.innerHeight;
        const xs = [], ys = [];
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
          const v = new T.Vector3(x, y, z).project(cam);
          xs.push(((v.x + 1) / 2) * W2);
          ys.push(((1 - v.y) / 2) * H2);
        }
        shelf = f({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
      }
      return { radio: f(P.radio.hitBox()), radioTap: f(P.radio.tapBox()), wine: f(P.wine.hitBox()), wineTap: f(P.wine.tapBox()), shelf };
    }, shot);
    const over = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const say = (b) => (b ? `${String(b.w).padStart(5)} x ${String(b.h).padEnd(5)} at ${String(Math.round(b.x)).padStart(5)},${String(Math.round(b.y)).padStart(4)}` : 'none');
    console.log(
      `${String(W + 'x' + H).padEnd(9)} ${shot.padEnd(5)}  set ${say(m.radio)}  tap ${say(m.radioTap)}${m.radioTap?.grown ? ' GROWN' : ''}`.padEnd(96) +
        `  bottle ${say(m.wine)}  tap ${say(m.wineTap)}${m.wineTap?.grown ? ' GROWN' : ''}` +
        (over(m.radioTap, m.wineTap) ? '   THE TWO TAP BOXES OVERLAP' : ''),
    );
    if (m.shelf) {
      const right = m.shelf.x + m.shelf.w;
      console.log(`${''.padEnd(16)}case ${say(m.shelf)}   ${right < 0 ? `ENTIRELY OFF THE LEFT OF THE FRAME by ${Math.abs(right).toFixed(0)} px` : m.shelf.x < 0 ? `cut by the left edge: ${right.toFixed(0)} px of it is in the picture` : 'whole'}`);
    }
  }
  await p2.close();
}
await browser.close();
