#!/usr/bin/env node
// WHAT IS ON THAT WALL, in world metres, so the picture beside the clock can be made as large as the
// plaster allows without covering any of it. Reports the world AABB of everything the frame has to
// live between, and then the largest box that clears them all.
//
//   BASE=http://127.0.0.1:8736 node tools/_droste-where.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8736/';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 800) }, deviceScaleFactor: 1 });
page.setDefaultNavigationTimeout(180000);
page.setDefaultTimeout(180000);
const u = new URL(BASE);
u.searchParams.set('shot', '1');
u.searchParams.set('t', '2');
await page.goto(u.toString(), { waitUntil: 'load' });
await page.waitForFunction(() => window.__theatreReady === true, null, { timeout: 180000 });

const out = await page.evaluate(() => {
  const T = window.__theatre.THREE;
  const scene = window.__theatre.scene;
  const P = window.__theatre.pieces.props;
  const H = window.__theatre.pieces.help;
  const box = (o) => {
    if (!o) return null;
    const b = new T.Box3().setFromObject(o);
    if (!isFinite(b.min.x)) return null;
    return { x: [+b.min.x.toFixed(4), +b.max.x.toFixed(4)], y: [+b.min.y.toFixed(4), +b.max.y.toFixed(4)], z: [+b.min.z.toFixed(4), +b.max.z.toFixed(4)] };
  };
  const named = {};
  for (const n of ['sign-board', 'vase', 'droste-frame', 'help-card', 'mushroom-lamp']) named[n] = box(scene.getObjectByName(n));
  named.clock = box(P.group.userData.wallClock);
  named.tag = box(H?.tag);
  named.sign = box(P.sign?.mesh);
  named.__sheet = P.droste?.geometry ?? null;
  named.__frame = P.droste?.frame ?? null;
  named.signPivot = box(P.sign?.pivot);

  // EVERY MESH THAT STANDS ON OR NEAR THE BACK WALL in the band the frame could occupy. The wall
  // plane is at z = -2.5; anything whose box reaches past z = -2.1 is furniture in the room and not
  // something hung on the plaster, but it is still in front of the frame and still counts.
  const WALLZ = -window.__theatre.layout.room.depth / 2;
  const obstacles = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const b = new T.Box3().setFromObject(o);
    if (!isFinite(b.min.x)) return;
    if (b.min.z > -1.9) return; // out in the room: the table, the rug, him
    if (b.max.x < -0.05 || b.min.x > 1.35) return; // not over this stretch of wall
    if (b.max.y < 0.9 || b.min.y > 2.85) return; // not in the band a picture could hang in
    const w = b.max.x - b.min.x, h = b.max.y - b.min.y;
    if (w > 4 || h > 2.5) return; // the wall itself, the wallpaper, the cornice run
    let name = o.name;
    let p = o.parent;
    while (!name && p) {
      name = p.name;
      p = p.parent;
    }
    obstacles.push({ name: name || '(unnamed)', x: [+b.min.x.toFixed(3), +b.max.x.toFixed(3)], y: [+b.min.y.toFixed(3), +b.max.y.toFixed(3)], z: [+b.min.z.toFixed(3), +b.max.z.toFixed(3)] });
  });
  obstacles.sort((a, b) => a.x[0] - b.x[0]);

  // WHAT PEPE HIDES. He sits a metre and a half in front of the back wall, so from any shot his
  // silhouette covers a rectangle of plaster bigger than he is — and a picture hung inside that
  // rectangle is a picture behind his head. Every corner of his own box is carried along the ray
  // from the camera through it until it meets the wall, and the four give the patch.
  const shadow = {};
  const puppet = window.__theatre.pieces.pepe;
  const root = puppet?.group ?? puppet?.root ?? window.__theatre.scene.getObjectByName('pepe');
  const C = window.__theatre.pieces.camera;
  if (root && C) {
    const b = new T.Box3().setFromObject(root);
    const probe = new T.PerspectiveCamera(30, 1, 0.03, 60);
    for (const name of ['home', 'wide', 'pepe']) {
      try {
        C.place(name, probe);
      } catch {
        continue;
      }
      const eye = probe.position;
      const xs = [], ys = [];
      for (const cx of [b.min.x, b.max.x])
        for (const cy of [b.min.y, b.max.y])
          for (const cz of [b.min.z, b.max.z]) {
            const dz = cz - eye.z;
            if (Math.abs(dz) < 1e-6) continue;
            const t = (WALLZ - eye.z) / dz; // how far along the ray the wall is
            if (t < 1) continue; // the wall is nearer than he is: he hides nothing there
            xs.push(eye.x + (cx - eye.x) * t);
            ys.push(eye.y + (cy - eye.y) * t);
          }
      if (xs.length) shadow[name] = { x: [+Math.min(...xs).toFixed(4), +Math.max(...xs).toFixed(4)], y: [+Math.min(...ys).toFixed(4), +Math.max(...ys).toFixed(4)] };
    }
    shadow.__box = { x: [+b.min.x.toFixed(4), +b.max.x.toFixed(4)], y: [+b.min.y.toFixed(4), +b.max.y.toFixed(4)], z: [+b.min.z.toFixed(4), +b.max.z.toFixed(4)] };
  }
  return { WALLZ, named, shadow, obstacles };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
