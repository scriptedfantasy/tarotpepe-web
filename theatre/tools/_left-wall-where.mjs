#!/usr/bin/env node
// WHAT IS ON THE STAGE-LEFT WALL, in world metres, and where each resting plate stops on it.
//
// That wall is the plane x = -2.6 and it is seen at a RAKE — it recedes to the left edge of the
// picture as it comes downstage — so the only question that matters about it is WHERE THE PICTURE
// STOPS ALONG Z, and the answer is a different z for every window shape. This prints:
//
//   · every mesh whose box touches the wall, sorted along z, so nothing can be put there that goes
//     through something else (the press door, the duct, the skirting, the frame on its nail);
//   · where the left edge of each plate crosses the wall plane, in z, at each window shape — the
//     line past which a thing hung on this wall is a thing nobody sees;
//   · and, for a rectangle given in z, what it measures on the glass at each of them.
//
//   BASE=http://127.0.0.1:8739 node tools/_left-wall-where.mjs
//   Z0=-2.42 Z1=-0.6 BASE=... node tools/_left-wall-where.mjs   # try a window there
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const TRY = { z0: +(process.env.Z0 ?? -2.42), z1: +(process.env.Z1 ?? -0.6), y0: +(process.env.Y0 ?? 1.04), y1: +(process.env.Y1 ?? 2.45) };
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

// ---- 1. what stands on the wall ----------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(180000);
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  const u = new URL(BASE);
  u.searchParams.set('shot', '1');
  u.searchParams.set('t', '2');
  await page.goto(u.toString(), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__theatreReady === true, null, { timeout: 180000 });
  const rows = await page.evaluate(() => {
    const T = window.__theatre.THREE;
    const f3 = (n) => +n.toFixed(3);
    const out = [];
    window.__theatre.scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const b = new T.Box3().setFromObject(o);
      if (!isFinite(b.min.x)) return;
      if (b.min.x > -2.0) return; // not near the stage-left plaster
      if (b.max.z < -2.6 || b.min.z > 2.0) return;
      out.push({
        name: o.name || o.parent?.name || o.material?.name || o.geometry?.type || '?',
        x: [f3(b.min.x), f3(b.max.x)],
        y: [f3(b.min.y), f3(b.max.y)],
        z: [f3(b.min.z), f3(b.max.z)],
      });
    });
    // fold the thousands of wall/moulding slivers into one line per name
    const by = new Map();
    for (const r of out) {
      const k = r.name;
      const p = by.get(k);
      if (!p) by.set(k, { ...r, n: 1 });
      else {
        p.n++;
        p.x = [Math.min(p.x[0], r.x[0]), Math.max(p.x[1], r.x[1])];
        p.y = [Math.min(p.y[0], r.y[0]), Math.max(p.y[1], r.y[1])];
        p.z = [Math.min(p.z[0], r.z[0]), Math.max(p.z[1], r.z[1])];
      }
    }
    return [...by.values()].sort((a, b) => a.z[0] - b.z[0]);
  });
  console.log('---- on the stage-left plaster (x < -2.0), folded by name, along z ----');
  for (const r of rows) {
    console.log(
      `${String(r.name).slice(0, 26).padEnd(27)} x ${String(r.x[0]).padStart(7)}..${String(r.x[1]).padEnd(7)} y ${String(r.y[0]).padStart(6)}..${String(r.y[1]).padEnd(6)} z ${String(r.z[0]).padStart(7)}..${String(r.z[1]).padEnd(7)} (${r.n})`,
    );
  }
  await page.close();
}

// ---- 2. where each plate stops on the wall, and what a rectangle on it measures -----------------
console.log('\n---- where the plates cross the plane x = -2.6, and what Z0..Z1 measures there ----');
for (const [W, H] of [[1280, 800], [1600, 900], [1920, 1080], [390, 844]]) {
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.setDefaultNavigationTimeout(180000);
  p.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  const u = new URL(BASE);
  u.searchParams.set('shot', '1');
  u.searchParams.set('t', '2');
  await p.goto(u.toString(), { waitUntil: 'load' });
  await p.waitForFunction(() => window.__theatreReady === true, null, { timeout: 180000 });
  for (const shot of ['home', 'wide', 'pepe']) {
    const m = await p.evaluate(([s, R]) => {
      const T = window.__theatre.THREE;
      const cam = window.__theatre.camera;
      window.__theatre.pieces.camera.cut(s);
      cam.updateMatrixWorld(true);
      const W2 = window.innerWidth, H2 = window.innerHeight;
      // where a ray through an NDC point crosses x = -2.6
      const at = (nx, ny) => {
        const v = new T.Vector3(nx, ny, 0.5).unproject(cam);
        const d = v.sub(cam.position).normalize();
        if (Math.abs(d.x) < 1e-9) return null;
        const t = (-2.6 - cam.position.x) / d.x;
        if (t <= 0) return null;
        const q = cam.position.clone().addScaledVector(d, t);
        return [+q.z.toFixed(3), +q.y.toFixed(3)];
      };
      // the rectangle on the glass
      const proj = (x, y, z) => {
        const v = new T.Vector3(x, y, z).project(cam);
        return [((v.x + 1) / 2) * W2, ((1 - v.y) / 2) * H2];
      };
      const xs = [], ys = [];
      for (const z of [R.z0, R.z1]) for (const y of [R.y0, R.y1]) {
        const [sx, sy] = proj(-2.6, y, z);
        xs.push(sx);
        ys.push(sy);
      }
      return {
        leftMid: at(-1, 0),
        leftTop: at(-1, 1),
        leftBot: at(-1, -1),
        box: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) },
        W2,
      };
    }, [shot, TRY]);
    const b = m.box;
    const right = b.x + b.w;
    const say = m.leftMid ? `z ${String(m.leftMid[0]).padStart(7)} (top ${String(m.leftTop?.[0] ?? '-').padStart(7)}, bottom ${String(m.leftBot?.[0] ?? '-').padStart(7)})` : 'the wall is behind the lens';
    console.log(
      `${String(W + 'x' + H).padEnd(10)} ${shot.padEnd(5)}  left edge crosses at ${say}   ` +
        `rect ${b.w.toFixed(0)} x ${b.h.toFixed(0)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}  ` +
        (right < 0 ? `OFF THE LEFT by ${(-right).toFixed(0)} px` : b.x < 0 ? `cut: ${right.toFixed(0)} px of it shows` : 'whole'),
    );
  }
  await p.close();
}
await browser.close();
