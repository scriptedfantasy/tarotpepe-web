#!/usr/bin/env node
// WHERE THE PICTURE OF THIS ROOM STANDS, AND WHAT THE WALK INTO IT PASSES ON THE WAY.
//
// The user: "we should keep the clock centered on the wall over pepe - the room image instead
// should be in a photo frame where the cat now stands." So this tool has two jobs it did not have
// while the picture was on the plaster, and one it has kept.
//
//   1  THE FRAME ON ITS SHELF. Its world box against the bookcase it stands on, the vase and the
//      door's architrave it must not touch, and — the number the whole solve is pinned to — where
//      each resting plate STOPS at the frame's own depth. The frame is 140 mm nearer the lens than
//      the plaster ever was, and a nearer thing runs off the side of a picture sooner: the brief is
//      that a phone must see it WHOLE, so this is the measurement that says whether it does.
//   2  THE WALK. The picture used to sit on the room's own axis at x 0, so `zoomShot` was very
//      nearly a straight dolly down -z and nothing could be in the way of it. On a bookcase at
//      x 0.817 the camera SWINGS SIDEWAYS as it goes in, past Pepe's right shoulder and over the
//      corner of the table. This samples the real pose at forty values of t and reports the closest
//      approach to every solid thing that could be clipped — him, the table, the vase, the
//      operator's position, the bookcase itself — so "it does not clip" is a number and not a hope.
//      It also checks the two things the zoom's own arithmetic promises: the picture's rectangle
//      grows monotonically, and no edge of it leaves the window before t = 1.
//   3  AND THE CLOCK, which is back on the room's axis at x 0 and no longer hangs off the picture's
//      corner at all.
//
//   BASE=http://127.0.0.1:8739 node tools/_droste-where.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8739/';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

for (const [W, H] of [[1280, 800], [1600, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(180000);
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 200)));
  const u = new URL(BASE);
  u.searchParams.set('shot', '1');
  u.searchParams.set('t', '2');
  await page.goto(u.toString(), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__theatreReady === true, null, { timeout: 180000 });

  const out = await page.evaluate(() => {
    const T = window.__theatre.THREE;
    const scene = window.__theatre.scene;
    const P = window.__theatre.pieces.props;
    const C = window.__theatre.pieces.camera;
    const cam = window.__theatre.camera;
    const f4 = (n) => +n.toFixed(4);
    const box = (o) => {
      if (!o) return null;
      const b = new T.Box3().setFromObject(o);
      if (!isFinite(b.min.x)) return null;
      return b;
    };
    const say = (b) => (b ? { x: [f4(b.min.x), f4(b.max.x)], y: [f4(b.min.y), f4(b.max.y)], z: [f4(b.min.z), f4(b.max.z)] } : null);

    C.cut('home');
    cam.updateMatrixWorld(true);
    const gm = P.droste.geometry, fr = P.droste.frame;
    const hit = P.droste.hitBox();

    // ---- 1. the frame on its shelf -------------------------------------------------------------
    const named = {};
    for (const n of ['droste-frame', 'vase', 'sign-board', 'cat']) named[n] = say(box(scene.getObjectByName(n)));
    named.clock = say(box(P.group.userData.wallClock));

    // where a plate stops, at the frame's own depth and at the plaster
    const edgeAt = (nx, k) => {
      const v = new T.Vector3(nx, 0, 0.5).unproject(cam);
      const d = v.sub(cam.position).normalize();
      const t = (k - cam.position.z) / d.z;
      return f4(cam.position.clone().addScaledVector(d, t).x);
    };

    // ---- 2. the walk ---------------------------------------------------------------------------
    // the solids the lens could run into, as world boxes, each grown by the near plane
    const solids = {};
    for (const [name, o] of [
      ['pepe', window.__theatre.pieces.pepe?.group],
      ['table', window.__theatre.pieces.table?.group],
      ['vase', scene.getObjectByName('vase')],
      ['droste-frame', scene.getObjectByName('droste-frame')],
    ]) {
      const b = box(o);
      if (b) solids[name] = b;
    }
    const near = cam.near;
    const walk = [];
    let worst = {};
    let lastW = -1, lastH = -1, monotone = true, inside = true;
    // t runs to 0.975 and not to 1: `fract(1) === 0` and camera.js short-circuits t = 0 to the
    // resting plate itself, which is the whole of the wrap. Sampling t = 1 would report the picture
    // shrinking back to 39 px, which is not the walk failing — it is the walk having finished.
    for (let k = 0; k <= 39; k++) {
      const t = k / 40;
      const s = C.zoomShotAt(t);
      if (!s) break;
      const p = new T.Vector3(...s.pos);
      const row = { t: +t.toFixed(3), pos: [f4(p.x), f4(p.y), f4(p.z)] };
      for (const [name, b] of Object.entries(solids)) {
        if (name === 'droste-frame' && t > 0.995) continue; // it is supposed to fill the window
        const d = f4(b.distanceToPoint(p));
        row[name] = d;
        if (worst[name] == null || d < worst[name].d) worst[name] = { d, t: row.t };
      }
      // …and what the SHEET measures on the glass at this t. The sheet and not the moulding: the
      // promise the zoom makes is that the PICTURE fills the window at t = 1, and the frame round it
      // is 22 mm of rim on every side that is supposed to have left the window before then.
      C.setZoom(t, { hold: true });
      cam.updateMatrixWorld(true);
      const gm2 = P.droste.geometry;
      const xs = [], ys = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const v = new T.Vector3(gm2.centre[0] + sx * gm2.halfW, gm2.centre[1] + sy * gm2.halfH, gm2.centre[2]).project(cam);
        xs.push(((v.x + 1) / 2) * innerWidth);
        ys.push(((1 - v.y) / 2) * innerHeight);
      }
      const hb = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      {
        if (hb.w < lastW - 0.5 || hb.h < lastH - 0.5) monotone = false;
        lastW = hb.w;
        lastH = hb.h;
        // ON A PORTRAIT WINDOW ONLY THE HEIGHT IS PROMISED. The sheet is landscape on a phone
        // (props.js, ROW.landscape) and camera.js's end pose lets its WIDTH run off both sides
        // equally — the phone's live frame is the centre crop of it. So the width is checked only
        // where the sheet and the window are the same shape.
        const wide = innerWidth >= innerHeight;
        if (hb.y < -0.5 || hb.y + hb.h > innerHeight + 0.5) inside = false;
        if (wide && (hb.x < -0.5 || hb.x + hb.w > innerWidth + 0.5)) inside = false;
        row.px = [+hb.w.toFixed(1), +hb.h.toFixed(1)];
      }
      walk.push(row);
    }
    C.setZoom(0, { hold: true });
    C.cut('home');
    cam.updateMatrixWorld(true);

    return {
      viewport: [innerWidth, innerHeight],
      sheet: [f4(gm.w), f4(gm.h)],
      frame: [f4(fr.w), f4(fr.h)],
      centre: gm.centre.map(f4),
      aspect: f4(gm.aspect),
      hit: hit ? { x: +hit.x.toFixed(1), y: +hit.y.toFixed(1), w: +hit.w.toFixed(1), h: +hit.h.toFixed(1) } : null,
      plateAtFrame: [edgeAt(-1, gm.centre[2]), edgeAt(1, gm.centre[2])],
      plateAtWall: [edgeAt(-1, -2.5), edgeAt(1, -2.5)],
      named,
      span: C.zoomSpan,
      worst,
      walk,
      monotone,
      inside,
      solids: Object.fromEntries(Object.entries(solids).map(([k2, v]) => [k2, say(v)])),
    };
  });

  const b = out.hit;
  console.log(`\n================ ${W}x${H} ================`);
  console.log(`  the sheet          ${out.sheet[0]} x ${out.sheet[1]} m   (aspect ${out.aspect})`);
  console.log(`  the frame          ${out.frame[0]} x ${out.frame[1]} m, centred ${JSON.stringify(out.centre)}`);
  console.log(`  on the glass       ${b.w} x ${b.h} px at ${b.x},${b.y}`);
  const whole = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
  console.log(`  the plate stops    x ${out.plateAtFrame[1]} at the frame's own depth, ${out.plateAtWall[1]} at the plaster`);
  console.log(`  …so the frame is   ${whole ? 'WHOLE in the picture' : 'CUT BY THE FRAME'}   (its right edge is at x ${out.named['droste-frame'].x[1]}, the plate's line is ${out.plateAtFrame[1]})`);
  console.log(`  the clock          x ${out.named.clock.x[0]}..${out.named.clock.x[1]}, y ${out.named.clock.y[0]}..${out.named.clock.y[1]}`);
  console.log(`  the cat            ${out.named.cat ? `x ${out.named.cat.x[0]}..${out.named.cat.x[1]}, y ${out.named.cat.y[0]}..${out.named.cat.y[1]}` : 'not in the set'}`);
  console.log(`  the zoom           D0 ${out.span ? out.span.D0.toFixed(3) : '?'} m → D1 ${out.span ? out.span.D1.toFixed(3) : '?'} m`);
  console.log('  the walk, closest approach to each solid:');
  for (const [name, w] of Object.entries(out.worst)) console.log(`    ${name.padEnd(14)} ${w.d.toFixed(3)} m at t ${w.t}`);
  console.log(`  the rectangle grows monotonically: ${out.monotone ? 'yes' : 'NO'};  every edge stays in the window until t = 1: ${out.inside ? 'yes' : 'NO'}`);
  if (process.env.WALK) for (const r of out.walk) console.log('   ', JSON.stringify(r));
  await page.close();
}
await browser.close();
