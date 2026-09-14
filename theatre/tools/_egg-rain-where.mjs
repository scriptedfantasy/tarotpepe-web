#!/usr/bin/env node
// COULD THE RAIN HAVE GONE SOMEWHERE ELSE? This is the measurement that decided it could not, and it
// is kept so the next person does not have to take the answer on trust.
//
// The rain was drawn on the back wall's casement. The user had that window taken out of the room,
// and the obvious repair is to hang the weather on the one window that is left — the stage-right
// wall's. So: how much of the frame does each window's GLAZED AREA actually take, at every judged
// window shape and at both resting plates? Printed as the screen box of each, in px.
//
// What it said (and `back` is now gone, so it prints `side` alone):
//     window       back wall            stage-right wall
//     1280x800     142 x 233 px         56.9 x 281 px, at x 1173-1230 of 1280
//     1600x900     160 x 262 px         64.0 x 316 px, at x 1400-1464 of 1600
//     390x844      off the frame        off the frame, at x 774-836 of 390
// 57 px holding four panes is about 13 px to a light, and a rain stroke at the room's own 0.0115 m
// nib measures 0.8 px on it — under the width at which the ink pass keeps a mark, so the pass would
// delete the weather. On a phone it is off the right-hand edge as the old one was off the left.
// Hence src/pieces/egg-rain.js: the storm and the sound kept, the drawing and the switch retired.
//
//   BASE=http://127.0.0.1:8737 node tools/_egg-rain-where.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8737/';
const SHAPES = [[1280, 800], [1600, 900], [390, 844]];
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

for (const [w, h] of SHAPES) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(180000);
  const u = new URL(BASE);
  u.searchParams.set('shot', '1');
  u.searchParams.set('t', '2');
  u.searchParams.set('seed', '1');
  await page.goto(u.toString(), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__theatreReady === true, null, { timeout: 180000 });
  const out = await page.evaluate(({ w, h }) => {
    const T = window.__theatre.THREE;
    const C = window.__theatre.pieces.camera;
    const R = window.__theatre.pieces.room;
    const zb = -window.__theatre.layout.room.depth / 2;
    const hx = window.__theatre.layout.room.width / 2;
    const probe = new T.PerspectiveCamera(30, 1, 0.03, 60);
    // the glazed area of a casement: the frame ring f=0.05 taken off each side
    const glaze = (win) => ({ x0: win.x0 + 0.05, x1: win.x1 - 0.05, y0: win.y0 + 0.05, y1: win.y1 - 0.05 });
    const res = {};
    for (const shot of ['home', 'wide']) {
      try { C.place(shot, probe); } catch { continue; }
      const px = (p) => { const v = p.clone().project(probe); return [(v.x * 0.5 + 0.5) * w, (0.5 - v.y * 0.5) * h, v.z]; };
      const boxOf = (pts) => {
        const ps = pts.map(px);
        if (ps.some((p) => p[2] > 1)) return 'behind the lens';
        const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
        return { x: [+Math.min(...xs).toFixed(1), +Math.max(...xs).toFixed(1)], y: [+Math.min(...ys).toFixed(1), +Math.max(...ys).toFixed(1)], wpx: +(Math.max(...xs) - Math.min(...xs)).toFixed(1), hpx: +(Math.max(...ys) - Math.min(...ys)).toFixed(1) };
      };
      // `R.window` is not published any more: the back wall has none. If a later round puts one
      // back, this is where its box would be measured alongside the side window's.
      const side = R?.sideWindow ? glaze(R.sideWindow) : null;
      const zr = (win) => zb - win.depth + 0.055; // the glass
      if (side) {
        // room.js's rightFrame: local (u, y, z) -> world (-z + 0.1, y, u). the glass at local z = zr
        const g = side, z = zr(R.sideWindow), wx = -z + (hx - Math.abs(zb));
        res[`${shot}.side`] = boxOf([new T.Vector3(wx, g.y0, g.x0), new T.Vector3(wx, g.y0, g.x1), new T.Vector3(wx, g.y1, g.x0), new T.Vector3(wx, g.y1, g.x1)]);
      }
    }
    return res;
  }, { w, h });
  console.log(`\n=== ${w}x${h}`);
  for (const [k, v] of Object.entries(out)) console.log(' ', k.padEnd(12), typeof v === 'string' ? v : `x ${String(v.x[0]).padStart(8)} .. ${String(v.x[1]).padStart(8)}   ${String(v.wpx).padStart(7)} x ${String(v.hpx).padStart(6)} px`);
  await page.close();
}
await browser.close();
