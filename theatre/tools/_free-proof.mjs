#!/usr/bin/env node
// THE FREE WALK, WALKED (src/pieces/camera-free.js, behind `?free=1`).
//
// Nothing below asks the prototype whether it thinks it worked. Every claim is put to a witness
// that is not the piece that made it:
//
//   the LIVE CAMERA   ctx.camera.position / .quaternion / .fov, read off the three.js object the
//                     ink pass is about to draw through — not the free piece's own numbers
//   the DRAWING COUNT ctx.clock.frame beside the pose, on every rendered tick, so that "on the
//                     twelves" is a measurement and not a promise. The exact version runs on a
//                     FROZEN clock, where the room gives one drawing per rendered frame (camera.js
//                     says why at length in THE DOLLY), and compares the station after N drawings
//                     against the closed form of the ease — a sum with no wall clock in it
//   the ARBITER       props.switches.at(x, y), asked at a measured point from a free station
//   a real CLICK      page.mouse.click and page.touchscreen.tap, through the arbiter, no api called
//   the PLACARD       the whole evening, no ?view, a line typed while the visitor is walking
//   the G-BUFFER's own rule  ink.js's texPen, in texels of a surface's drawing per screen pixel
//   the DRAWING       /tmp/free/*.png, and a webm of ten seconds of walking
//
//   BASE=http://127.0.0.1:8744 node tools/_free-proof.mjs
//   BASE=… node tools/_free-proof.mjs --only twelves,region --out /tmp/free
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/free';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800];
const PHONE = [390, 844];
const BIG = [1600, 900];
const ONLY = args.only ? String(args.only).split(',') : null;
const doing = (n) => !ONLY || ONLY.includes(n);
const T_OUT = +(process.env.FREE_TIMEOUT ?? 600000);

const LAUNCH = {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
};
let browser = null;
const fresh = async (opts = {}) => {
  await browser?.close().catch(() => {});
  browser = await chromium.launch({ ...LAUNCH, ...opts });
};
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  });

async function open(w, h, query = '', { dpr = 1, ctxOpts = {} } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true, ...ctxOpts });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load', timeout: T_OUT });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: T_OUT });
  page.__errors = errors;
  page.__ctx = context;
  return page;
}
// the room with nothing being judged and no autoplay: ?shot=1 cuts to home, which is the cut that
// seeds the free station, and runs no conversation to cut the camera out from under a walk
const room = (w, h, q = '', o = {}) => open(w, h, `?shot=1&free=1${q}`, o);
const frames = (p, n = 2) => p.evaluate((k) => new Promise((res) => { let i = k; const go = () => (i-- <= 0 ? res() : requestAnimationFrame(go)); go(); }), n);
const settle = async (p, ms = T_OUT) => {
  await p.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: ms, polling: 250 });
  await frames(p, 2);
};
// WHAT THE LENS IS ACTUALLY DOING, off the three.js camera and not off the piece
const live = (p) =>
  p.evaluate(() => {
    const T = window.__theatre, c = T.camera, C = T.pieces.camera;
    const d = new T.THREE.Vector3();
    c.getWorldDirection(d);
    return {
      pos: c.position.toArray().map((v) => +v.toFixed(4)),
      dir: d.toArray().map((v) => +v.toFixed(4)),
      yaw: +((Math.atan2(-d.x, -d.z) * 180) / Math.PI).toFixed(3),
      pitch: +((Math.asin(Math.max(-1, Math.min(1, d.y))) * 180) / Math.PI).toFixed(3),
      fov: +c.fov.toFixed(3),
      aspect: +c.aspect.toFixed(4),
      current: C.current,
      free: C.free,
      at: T.pieces.walk?.at ?? null,
      pepeYaw: +((T.pieces.pepe.root.rotation.y * 180) / Math.PI).toFixed(3),
    };
  });
const key = (p, code, down) => p.evaluate(([c, d]) => window.__theatre.pieces.camera.freeApi().key(c, d), [code, down]);
// …and a station put by hand is not ON THE GLASS until a drawing has been struck: camera.js applies
// the free pose from its own update, on a stepped frame, so every `put` here waits for one. Without
// that wait a tool measures the pose the room had a moment ago, which is how the first cut of this
// file decided the pitch limit did not work.
const put = async (p, x, z, yaw = null, pitch = null) => {
  const r = await p.evaluate(([a, b, c, d]) => window.__theatre.pieces.camera.freeApi().put(a, b, c, d), [x, z, yaw, pitch]);
  await frames(p, 2);
  return r;
};
const drawings = (p) => p.evaluate(() => window.__theatre.pieces.camera.freeApi().drawings);
// HOLD A KEY FOR A MEASURED NUMBER OF DRAWINGS. The count is the piece's own — see `drawn` in
// camera-free.js — because a tool on the other end of a socket cannot count the room's drawings by
// counting its own round trips: the page goes on rendering between them, and on a frozen clock every
// rendered frame is a drawing. So the key is held, the wait is generous, and what is compared is the
// station against the closed form of the ease over exactly the number of drawings that were taken.
// It all happens INSIDE the page, in one call, because the count and the pose have to be read in
// the same synchronous breath: camera.js steps the station and strikes the pose in one update, so a
// reading taken between them would be a reading of neither.
const hold = (p, code, want) =>
  p.evaluate(
    ([c, k]) =>
      new Promise((res) => {
        const T = window.__theatre, F = T.pieces.camera.freeApi();
        const start = F.drawings;
        const read = () => {
          const cam = T.camera, d = new T.THREE.Vector3();
          cam.getWorldDirection(d);
          return { n: F.drawings - start, pos: cam.position.toArray(), yaw: (Math.atan2(-d.x, -d.z) * 180) / Math.PI, pitch: (Math.asin(Math.max(-1, Math.min(1, d.y))) * 180) / Math.PI };
        };
        const from = read();
        F.key(c, true);
        const go = () => {
          if (F.drawings - start >= k) {
            F.key(c, false);
            return res({ from, to: read() });
          }
          requestAnimationFrame(go);
        };
        requestAnimationFrame(go);
      }),
    [code, want]
  );
const asks = (p, x, y) => p.evaluate(([px, py]) => window.__theatre.pieces.props.switches.at(px, py), [x, y]);
// A screenshot may not take the whole run down with it. A software rasteriser drawing this room at
// 1600x900 dpr 2 on a machine already carrying eight other headless browsers does sometimes lose
// its page, and a picture is the one claim here that can be taken again by hand.
const shot = async (p, name) => {
  try {
    await p.screenshot({ path: `${OUT}/${name}.png` });
    return true;
  } catch (e) {
    console.log(`   (no ${name}.png: ${String(e.message).split('\n')[0]})`);
    bad++;
    return false;
  }
};

const ok = (b) => (b ? '✓' : '✗');
let bad = 0;
const claim = (b, text) => {
  if (!b) bad++;
  console.log(`   ${ok(b)} ${text}`);
};

// The ease, in closed form, so that "one new station per DRAWING" can be checked against arithmetic
// that has no wall clock in it: velocity closes EASE of the gap on each drawing, and the station is
// the sum of what that velocity carried.
const EASE = 0.55, SPEED = 1.1, TURN = 60, FPS = 12;
function walkedAfter(n, speed = SPEED) {
  let v = 0, d = 0;
  for (let k = 0; k < n; k++) {
    v += (1 - v) * EASE;
    d += (v * speed) / FPS;
  }
  return d;
}

// ---- 0. THE FLAG IS THE WHOLE OF IT ------------------------------------------------------------
// The room as shipped, opened without the flag, is asked whether anything moved.
if (doing('flag')) {
  await fresh();
  console.log('\nFLAG — nothing happens without ?free=1');
  const p = await open(...PLATE, '?shot=1');
  const a = await live(p);
  await key(p, 'KeyW', true).catch(() => {});
  await p.keyboard.down('KeyW');
  await frames(p, 24);
  await p.keyboard.up('KeyW');
  const b = await live(p);
  claim(a.current === 'home' && b.current === 'home', `the camera is on 'home' before and after a key is held (${a.current} → ${b.current})`);
  claim(JSON.stringify(a.pos) === JSON.stringify(b.pos), `the lens has not moved: ${JSON.stringify(b.pos)}`);
  claim(a.free.armed === false, 'camera.free reports itself unarmed');
  claim(b.pepeYaw === 0, `the puppet is square to the room (${b.pepeYaw}°)`);
  const z = await p.evaluate(() => ({ zoomable: window.__theatre.pieces.camera.zoomable, panNeeded: window.__theatre.pieces.camera.panNeeded }));
  claim(z.zoomable === true, 'the walk into the picture is still armed on the shipped page');
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 1. THE LENS, AND THE HATCH THAT FOLLOWS IT -------------------------------------------------
if (doing('lens')) {
  await fresh();
  console.log('\nLENS — the walking lens, against the frames the film already has');
  for (const [w, h] of [PLATE, BIG, PHONE, [1200, 1100]]) {
    const p = await room(w, h);
    const a = await live(p);
    const named = await p.evaluate(() => {
      const S = window.__theatre.pieces.camera.shots, out = {};
      for (const k of ['home', 'wide', 'door']) out[k] = +(S[k]?.fov ?? 0).toFixed(2);
      return out;
    });
    const across = (v) => +((2 * Math.atan(Math.tan(((v / 2) * Math.PI) / 180) * (w / h)) * 180) / Math.PI).toFixed(2);
    console.log(`  ${w}x${h}  free ${a.fov}° vertical = ${across(a.fov)}° across   home ${named.home}° = ${across(named.home)}°   wide ${named.wide}° = ${across(named.wide)}°   door ${named.door}° = ${across(named.door)}°`);
    claim(a.fov >= 36 - 1e-6 && a.fov <= 50 + 1e-6, `${w}x${h}: the vertical field is inside its own clamp (${a.fov}°)`);
    const hatch = await p.evaluate(() => {
      // ink.js sets this off the LIVE camera every frame: cssH / (1024 * tan(fov/2))
      const T = window.__theatre, c = T.camera;
      return +((T.size.h / (1024 * Math.tan((c.fov * Math.PI) / 360))).toFixed(5));
    });
    const atHome = await p.evaluate(([f]) => +((window.__theatre.size.h / (1024 * Math.tan((f * Math.PI) / 360))).toFixed(5)), [named.home]);
    console.log(`            uHatchK  free ${hatch}  home ${atHome}  (the hatch is ${(atHome / hatch).toFixed(2)}× coarser on the glass while walking)`);
    claim(hatch > 0 && hatch < atHome, `${w}x${h}: the hatch scale followed the lens without anybody telling it to`);
    await p.close();
  }
}

// ---- 2. ON THE TWELVES -------------------------------------------------------------------------
// Two witnesses, because one of them can be made vacuous by a slow machine.
//   THE EXACT ONE, on a FROZEN clock (?t=), where the room hands out one drawing per rendered frame.
//   N rendered frames of a held key must put the station exactly where the closed form of the ease
//   puts it — a sum over DRAWINGS with no seconds anywhere in it.
//   THE LIVE ONE, on a running clock: every rendered tick is sampled with the drawing number beside
//   it, and no two ticks that share a drawing may differ in the pose. On a machine rendering under
//   twelve a second no two ticks ever share one, and the claim says so rather than passing quietly.
if (doing('twelves')) {
  await fresh();
  console.log('\nTWELVES — the station takes one new value per drawing, and per drawing only');
  {
    const p = await room(...PLATE, '&t=3');
    await put(p, 0, 6.05, 0, 0);
    const N = 18;
    const r = await hold(p, 'KeyW', N);
    const walked = Math.hypot(r.to.pos[0] - r.from.pos[0], r.to.pos[2] - r.from.pos[2]);
    const want = walkedAfter(r.to.n);
    console.log(`   ${r.to.n} drawings of W: walked ${walked.toFixed(5)} m, the ease over ${r.to.n} drawings says ${want.toFixed(5)} m`);
    claim(Math.abs(walked - want) < 5e-4, `the station is the closed form of the ease and nothing else (${(walked - want).toExponential(2)} m out)`);
    claim(Math.abs(r.to.pos[1] - 1.55) < 1e-9, `the eye stayed at 1.55 m (${r.to.pos[1]})`);
    // …and the first four drawings ARE the ease: one drawing at a time, read in the page
    await put(p, 0, 6.05, 0, 0);
    const steps = await p.evaluate(
      () =>
        new Promise((res) => {
          const T = window.__theatre, F = T.pieces.camera.freeApi();
          const out = [];
          let last = T.camera.position.clone();
          let seen = F.drawings;
          F.key('KeyW', true);
          const go = () => {
            if (F.drawings > seen) {
              seen = F.drawings;
              const now = T.camera.position;
              out.push(+(last.distanceTo(now) * 1000).toFixed(2));
              last = now.clone();
              if (out.length >= 5) {
                F.key('KeyW', false);
                return res(out);
              }
            }
            requestAnimationFrame(go);
          };
          requestAnimationFrame(go);
        })
    );
    const ideal = [1, 2, 3, 4, 5].map((k) => +((walkedAfter(k) - walkedAfter(k - 1)) * 1000).toFixed(2));
    console.log(`   the first five drawings travel ${steps.join(', ')} mm — the ease says ${ideal.join(', ')} (full pace is ${((SPEED / FPS) * 1000).toFixed(1)} mm)`);
    claim(steps.every((v, i) => Math.abs(v - ideal[i]) < 0.2), 'a step eases in over its first drawings instead of snapping to pace');
    await p.close();
  }
  {
    const p = await room(...PLATE);
    await key(p, 'KeyW', true);
    const trace = await p.evaluate(
      (ticks) =>
        new Promise((res) => {
          const T = window.__theatre, out = [];
          let i = ticks;
          const go = () => {
            const c = T.camera;
            out.push([T.clock.frame, +c.position.x.toFixed(7), +c.position.z.toFixed(7), +c.quaternion.y.toFixed(7)]);
            if (i-- <= 0) return res(out);
            requestAnimationFrame(go);
          };
          go();
        }),
      120
    );
    await key(p, 'KeyW', false);
    let shared = 0, broke = 0;
    for (let i = 1; i < trace.length; i++) {
      if (trace[i][0] !== trace[i - 1][0]) continue;
      shared++;
      if (trace[i][1] !== trace[i - 1][1] || trace[i][2] !== trace[i - 1][2] || trace[i][3] !== trace[i - 1][3]) broke++;
    }
    const frames0 = new Set(trace.map((t) => t[0])).size;
    const poses = new Set(trace.map((t) => `${t[1]},${t[2]},${t[3]}`)).size;
    console.log(`   ${trace.length} rendered ticks carried ${frames0} drawings and ${poses} distinct poses; ${shared} pairs of ticks shared a drawing`);
    if (shared === 0) console.log('   (the machine rendered under twelve a second, so no two ticks shared a drawing: the live witness is not exercised)');
    claim(broke === 0, `no pose changed on a tick the paper did not turn over (${broke} of ${shared})`);
    claim(poses <= frames0, `there are no more poses than there are drawings (${poses} ≤ ${frames0})`);
    await p.close();
  }
}

// ---- 3. THE TURN -------------------------------------------------------------------------------
if (doing('turn')) {
  await fresh();
  console.log('\nTURN — 60 degrees a second, on the twelves, with the same ease');
  const p = await room(...PLATE, '&t=3');
  await put(p, 0, 5.0, 0, 0);
  const r = await hold(p, 'KeyQ', 18);
  const turned = r.to.yaw - r.from.yaw;
  const want = walkedAfter(r.to.n, TURN); // the same sum, in degrees a second instead of metres
  console.log(`   ${r.to.n} drawings of Q: turned ${turned.toFixed(3)}°, the ease over ${r.to.n} drawings says ${want.toFixed(3)}°`);
  claim(Math.abs(turned - want) < 0.02, `the yaw is the same closed form (${(turned - want).toFixed(4)}° out)`);
  claim(Math.abs(r.to.pos[0] - r.from.pos[0]) < 1e-9 && Math.abs(r.to.pos[2] - r.from.pos[2]) < 1e-9, 'the station did not move while the lens turned');
  // the pitch, and its limit
  await put(p, 0, 5.0, 0, 90);
  const up = await live(p);
  await put(p, 0, 5.0, 0, -90);
  const dn = await live(p);
  claim(Math.abs(up.pitch - 25) < 0.01 && Math.abs(dn.pitch + 25) < 0.01, `the pitch is held to ±25° whatever is asked for (${up.pitch}° / ${dn.pitch}°)`);
  await p.close();
}

// ---- 4. THE REGION -----------------------------------------------------------------------------
// The polygon is printed, and then it is walked INTO at three places: at his table, at a side wall,
// and at the corner that faces the tall case. Nothing here asks whether a point is inside; it holds
// a key down until the station stops changing and reports where it stopped.
if (doing('region')) {
  await fresh();
  console.log('\nREGION — the polygon, and what happens when a visitor walks into its edges');
  const p = await room(...PLATE, '&t=3');
  const R = await p.evaluate(() => ({ region: window.__theatre.pieces.camera.free.region, limits: window.__theatre.pieces.camera.free.limits }));
  console.log('   vertices (x, z):', R.region.map(([x, z]) => `(${x.toFixed(3)}, ${z.toFixed(3)})`).join('  '));
  console.log(`   the stop line z ${R.limits.stop}  ·  the wedge's half width there ${R.limits.apex}  ·  the wall margin |x| ${R.limits.side}  ·  the chair's edge z ${R.limits.back}`);
  // every vertex, and the bearing it puts the lens on off his own seat
  const worst = R.region.map(([x, z]) => Math.abs((Math.atan2(x, z + 0.82) * 180) / Math.PI));
  console.log('   off his front at each vertex: ' + worst.map((v) => `${v.toFixed(2)}°`).join(', '));
  claim(Math.max(...worst) <= 35.01, `no station in the region sees him from more than 35° off his front (worst ${Math.max(...worst).toFixed(2)}°)`);

  const push = async (x, z, yawDeg, code, drawings = 90) => {
    await put(p, x, z, yawDeg, 0);
    await key(p, code, true);
    await frames(p, drawings);
    const a = await live(p);
    await key(p, code, false);
    await frames(p, 6);
    return a;
  };
  // HIS TABLE. Standing on the room's axis, facing him, and walking at him for seven and a half
  // seconds. The stop is the line 1.20 m in front of the rim.
  const atTable = await push(0, 4.0, 0, 'KeyW');
  console.log(`   walking straight at him from (0, 4.00) stops at (${atTable.pos[0].toFixed(3)}, ${atTable.pos[2].toFixed(3)})`);
  claim(Math.abs(atTable.pos[2] - R.limits.stop) < 0.002 && Math.abs(atTable.pos[0]) < 0.002, `it stops on the 1.20 m line and not a centimetre past it (z ${atTable.pos[2].toFixed(4)})`);
  // A WALL. Facing him, strafing stage right into the plaster.
  const atWall = await push(0, 5.0, 0, 'KeyD');
  console.log(`   strafing into the stage-right wall from (0, 5.00) stops at (${atWall.pos[0].toFixed(3)}, ${atWall.pos[2].toFixed(3)})`);
  claim(Math.abs(atWall.pos[0] - R.limits.side) < 0.002, `it stops 0.35 m off the plaster at x ${atWall.pos[0].toFixed(4)}`);
  // THE CASE. Facing the tall case in the upstage-left corner and walking at it: the wedge is
  // oblique there, so the visitor does not stop, they SLIDE along it.
  const bearing = (Math.atan2(-(-1.58 - 0), -(-2.33 - 5.2)) * 180) / Math.PI;
  const slid = await push(0, 5.2, bearing, 'KeyW', 140);
  console.log(`   walking at the tall case from (0, 5.20) on a bearing of ${bearing.toFixed(1)}° ends at (${slid.pos[0].toFixed(3)}, ${slid.pos[2].toFixed(3)})`);
  const onEdge = Math.abs(Math.abs(slid.pos[0]) - 0.700208 * (slid.pos[2] + 0.82)) < 0.01 || Math.abs(slid.pos[0] + R.limits.side) < 0.01;
  claim(onEdge, 'it did not stick: the walk slid along the edge it met until it ran out of edge');
  claim(slid.pos[0] < -1.0 && slid.pos[2] < 4.0, `it travelled along the edge rather than stopping where it touched (${slid.pos[0].toFixed(3)}, ${slid.pos[2].toFixed(3)})`);
  // A CORNER is not a trap: stand in one, push into it, then push along an edge out of it.
  await put(p, -2.4, 6.4, 0, 0); // outside on both counts; the clip puts it on the vertex
  const corner = await live(p);
  claim(Math.abs(corner.pos[0] + R.limits.side) < 1e-3 && Math.abs(corner.pos[2] - R.limits.back) < 1e-3, `a station asked for outside two edges lands on the vertex (${corner.pos[0].toFixed(3)}, ${corner.pos[2].toFixed(3)})`);
  const out = await push(-2.4, 6.4, 0, 'KeyW', 40);
  claim(out.pos[2] < R.limits.back - 0.2, `and walks out of it again (z ${corner.pos[2].toFixed(3)} → ${out.pos[2].toFixed(3)})`);
  await p.close();
}

// ---- 5. A TAP ON THE FLOOR, ON A PHONE ---------------------------------------------------------
if (doing('tap')) {
  await fresh();
  console.log('\nTAP — a thumb on the floorboards, on a 390x844 touch page');
  const p = await room(...PHONE);
  const before = await live(p);
  // a point low in the frame is floor: the ray is taken by the piece itself, so the tap is put
  // where the room says the boards are rather than where this file guesses
  const target = await p.evaluate(() => window.__theatre.pieces.camera.freeApi().floorAt(195, 700));
  console.log(`   the boards under (195, 700) are at x ${target[0].toFixed(3)}, z ${target[1].toFixed(3)}`);
  const who = await asks(p, 195, 700);
  claim(who === null, `nothing in the room answers that point, so it is the floor's (${who})`);
  await p.touchscreen.tap(195, 700);
  await frames(p, 6);
  const goal = (await live(p)).free.goal;
  claim(!!goal, `the tap set a goal on the boards (${goal ? `${goal.x.toFixed(3)}, ${goal.z.toFixed(3)}` : 'none'})`);
  await p.waitForFunction(() => !window.__theatre.pieces.camera.free.goal, null, { timeout: T_OUT, polling: 200 }).catch(() => {});
  await frames(p, 4);
  const after = await live(p);
  const err = goal ? Math.hypot(after.pos[0] - goal.x, after.pos[2] - goal.z) : 9;
  console.log(`   the visitor walked from (${before.pos[0].toFixed(3)}, ${before.pos[2].toFixed(3)}) to (${after.pos[0].toFixed(3)}, ${after.pos[2].toFixed(3)})`);
  claim(err < 0.01, `and arrived on the point they touched (${(err * 1000).toFixed(1)} mm out)`);
  // …and a sideways drag turns, while an up-and-down one does nothing
  const y0 = (await live(p)).yaw;
  await p.touchscreen.tap(195, 300); // clear the goal
  await frames(p, 2);
  const swipe = (pts) =>
    p.evaluate((list) => {
      const g = window.__theatre.renderer.domElement;
      const t = (x, y) => new Touch({ identifier: 1, target: g, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y });
      const ev = (n, ts) => g.dispatchEvent(new TouchEvent(n, { touches: ts, targetTouches: ts, changedTouches: ts, bubbles: true, cancelable: true }));
      const first = t(list[0][0], list[0][1]);
      ev('touchstart', [first]);
      for (let i = 1; i < list.length; i++) ev('touchmove', [t(list[i][0], list[i][1])]);
      ev('touchend', []);
    }, pts);
  await swipe([[200, 400], [260, 404], [330, 408]]);
  await frames(p, 6);
  const y1 = (await live(p)).yaw;
  claim(Math.abs(y1 - y0) > 5, `a sideways one-finger drag turned the lens (${y0.toFixed(2)}° → ${y1.toFixed(2)}°)`);
  await swipe([[200, 400], [202, 330], [204, 250]]);
  await frames(p, 6);
  const y2 = (await live(p)).yaw;
  const p2 = await live(p);
  claim(Math.abs(y2 - y1) < 0.01 && !p2.free.goal, `an up-and-down drag did nothing at all (${(y2 - y1).toFixed(4)}°, no goal)`);
  await shot(p, 'phone-390x844');
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 6. THE EGGS STILL ANSWER ------------------------------------------------------------------
if (doing('eggs')) {
  await fresh();
  console.log('\nEGGS — the arbiter from a free station');
  const p = await room(...PLATE);
  // standing off the room's axis and TURNED to the tall case, which is where the cat sits: a
  // station nobody composed, on a bearing nobody drew
  await put(p, -0.9, 3.4, (Math.atan2(-(-1.58 + 0.9), -(-2.33 - 3.4)) * 180) / Math.PI, 0);
  await frames(p, 4);
  const found = await p.evaluate(() => {
    // walk the frame on a coarse grid and ask the room who owns each point
    const S = window.__theatre.pieces.props.switches, out = {};
    for (let y = 8; y < 800; y += 8) for (let x = 8; x < 1280; x += 8) {
      const n = S.at(x, y);
      if (n && !out[n]) out[n] = [x, y];
    }
    return out;
  });
  const names = Object.keys(found).sort();
  console.log(`   from (-0.90, 3.40) the arbiter answers for: ${names.join(', ') || 'nothing'}`);
  claim(names.length > 0, 'the room still has switches in it from a station nobody composed');
  if (found.cat) {
    const wasLit = await p.evaluate(() => !!window.__theatre.pieces.props.cat?.lit);
    await p.mouse.click(found.cat[0], found.cat[1]);
    await frames(p, 8);
    const lit = await p.evaluate(() => !!window.__theatre.pieces.props.cat?.lit);
    claim(lit !== wasLit, `a real click on the cat at ${found.cat.join(',')} worked it (lit ${wasLit} → ${lit})`);
  } else claim(false, 'the cat was not on the frame from this station');
  // AND THE DIVE IS REFUSED
  const answer = await p.evaluate(() => window.__theatre.pieces.camera.dive());
  claim(answer === 'refused', `a click on the photograph is refused while the visitor is on their feet ('${answer}')`);
  const mods = await p.evaluate(() => ({ zoomable: window.__theatre.pieces.camera.zoomable, panable: window.__theatre.pieces.camera.panable, panBoxes: window.__theatre.pieces.camera.panBoxes }));
  claim(mods.zoomable === false && mods.panable === false && mods.panBoxes === null, 'the pan and the zoom are off, and the chevrons are not drawn');
  await p.close();
}

// ---- 7. A PLACE, FROM A FREE STATION AND BACK TO IT ---------------------------------------------
if (doing('place')) {
  await fresh();
  console.log('\nPLACE — entered from where the visitor was standing, and left back to it');
  const p = await room(...PLATE);
  await put(p, 1.6, 4.2, 14, -6);
  await frames(p, 4);
  const stood = await live(p);
  console.log(`   standing at (${stood.pos[0].toFixed(3)}, ${stood.pos[2].toFixed(3)}) yaw ${stood.yaw}° pitch ${stood.pitch}°`);
  const went = await p.evaluate(() => window.__theatre.pieces.walk.go('fireplace'));
  await settle(p);
  const there = await live(p);
  claim(went === true && there.at === 'fireplace' && there.current === 'fireplace', `the visitor walked to the fireplace from a free station (${there.current})`);
  claim(there.free.on === false, 'free mode let go of the pose while they stood at the place');
  await shot(p, 'place-fireplace-1280x800');
  await p.evaluate(() => window.__theatre.pieces.walk.back());
  await settle(p);
  await frames(p, 8);
  const home = await live(p);
  const err = Math.hypot(home.pos[0] - stood.pos[0], home.pos[2] - stood.pos[2]);
  console.log(`   and came back to (${home.pos[0].toFixed(3)}, ${home.pos[2].toFixed(3)}) yaw ${home.yaw}° pitch ${home.pitch}°`);
  claim(err < 1e-3, `back to the station they left from and not to the chair (${(err * 1000).toFixed(2)} mm out)`);
  claim(Math.abs(home.yaw - stood.yaw) < 1e-2 && Math.abs(home.pitch - stood.pitch) < 1e-2, 'and looking the way they were looking');
  claim(home.free.on === true, 'and back on their feet');
  // …and the walk can be done again, which is what a hold released badly would break
  const again = await p.evaluate(() => window.__theatre.pieces.walk.go('case'));
  await settle(p);
  claim(again === true && (await live(p)).at === 'case', 'a second place works after the first was left');
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 8. THE PUPPET ------------------------------------------------------------------------------
if (doing('puppet')) {
  await fresh();
  console.log('\nPUPPET — he turns to face the lens, and squares up when anything else takes it');
  const p = await room(...PLATE, '&t=3');
  const R = await p.evaluate(() => window.__theatre.pieces.camera.free.region);
  for (const [x, z] of [[0, 6.05], [0, 1.82], R[0], R[1], [2.25, 3.0]]) {
    await put(p, x, z, 0, 0);
    await frames(p, 40);
    const a = await live(p);
    const want = (Math.atan2(x, z + 0.82) * 180) / Math.PI;
    console.log(`   at (${x.toFixed(3)}, ${z.toFixed(3)}) the bearing off his front is ${want.toFixed(2)}° and he is turned ${a.pepeYaw}°`);
    claim(Math.abs(a.pepeYaw - want) < 0.05, `he faces the lens (${(a.pepeYaw - want).toFixed(3)}° out)`);
    claim(Math.abs(a.pepeYaw) <= 35.001, `and never past 35° (${a.pepeYaw}°)`);
  }
  // HOW HE READS OFF AXIS. His width on the glass, square on and at the region's limit, from the
  // same station — the puppet is a sheet and the whole question is what the yaw buys. The two
  // measurements at the corner are taken in ONE call with the yaw put back between them, because
  // the next stepped frame would turn him again and a screenshot cannot be asked to wait.
  const widths = [];
  for (const [x, z, tag] of [[0, 1.82, 'square on, from the stop line'], [R[0][0], R[0][1], 'the wedge corner, 35° off his front']]) {
    await put(p, x, z, (Math.atan2(-(0 - x), -(-0.82 - z)) * 180) / Math.PI, 0);
    await frames(p, 40);
    const w = await p.evaluate(() => {
      const T = window.__theatre, THREE = T.THREE, c = T.camera, R = T.pieces.pepe.root;
      const span = () => {
        T.scene.updateMatrixWorld(true);
        c.updateMatrixWorld();
        const bb = new THREE.Box3().setFromObject(T.pieces.pepe.parts.body);
        const xs = [], ys = [];
        for (const X of [bb.min.x, bb.max.x]) for (const Y of [bb.min.y, bb.max.y]) for (const Z of [bb.min.z, bb.max.z]) {
          const v = new THREE.Vector3(X, Y, Z).project(c);
          xs.push(((v.x + 1) / 2) * T.size.w);
          ys.push(((1 - v.y) / 2) * T.size.h);
        }
        return { w: +(Math.max(...xs) - Math.min(...xs)).toFixed(1), h: +(Math.max(...ys) - Math.min(...ys)).toFixed(1) };
      };
      const y0 = R.rotation.y;
      const turned = span();
      R.rotation.y = 0;
      const flat = span();
      R.rotation.y = y0;
      return { turned, flat, yaw: +((y0 * 180) / Math.PI).toFixed(2) };
    });
    widths.push([tag, w]);
    console.log(`   ${tag}: turned ${w.turned.w} x ${w.turned.h} px · the same sheet left square ${w.flat.w} x ${w.flat.h} px  (he is at ${w.yaw}°)`);
  }
  const turned = widths[1][1].turned.w, flat = widths[1][1].flat.w;
  console.log(`   the yaw is worth ${(turned - flat).toFixed(1)} px of him, ${(((turned - flat) / flat) * 100).toFixed(1)} % of his width at 35° off`);
  claim(turned > flat, 'turning him keeps his full width where a fixed sheet would have foreshortened');
  // AND WHAT THE STACKING IS ACTUALLY WORTH, which is the question the brief asks and which a
  // distance from the lens to each group's ORIGIN cannot answer: those origins are a neck and two
  // wrists, and they differ by half a metre of HEIGHT. The sheets are 0.5 mm apart (pepe.js,
  // Z_STEP): the head rides +1 mm and the hands -0.5 mm of the robe. What that buys on the glass is
  // the LATERAL throw the stack gets from being seen off its own normal — Δz · sin(the angle between
  // the sheet's normal and the lens) — and the yaw's whole job is to drive that angle to nought.
  const depth = await p.evaluate(() => {
    const T = window.__theatre, THREE = T.THREE, c = T.camera, R = T.pieces.pepe.root, P = T.pieces.pepe.parts;
    T.scene.updateMatrixWorld(true);
    const at = (o) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    const head = at(P.head), hand = at(P.handL);
    const d = c.position.distanceTo(at(P.body));
    const pxPerM = T.size.h / (2 * d * Math.tan((c.fov * Math.PI) / 360));
    // the angle between the sheets' normal (his local +z, turned by the root) and the lens axis
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(R.quaternion);
    const toLens = c.position.clone().sub(at(P.body)).setY(0).normalize();
    const off = (Math.acos(Math.max(-1, Math.min(1, n.setY(0).normalize().dot(toLens)))) * 180) / Math.PI;
    return { d: +d.toFixed(3), pxPerM: +pxPerM.toFixed(1), off: +off.toFixed(2), stack: 1.5, headAboveHand: +((head.y - hand.y) * 1000).toFixed(0) };
  });
  const throwTurned = 1.5e-3 * Math.sin((depth.off * Math.PI) / 180) * depth.pxPerM;
  const throwFlat = 1.5e-3 * Math.sin((35 * Math.PI) / 180) * depth.pxPerM;
  console.log(`   the stack is 1.5 mm head-to-hands; at ${depth.d} m the glass carries ${depth.pxPerM} px a metre`);
  console.log(`   turned, the sheets stand ${depth.off}° off the lens and throw ${throwTurned.toFixed(3)} px sideways; left square at 35° they would throw ${throwFlat.toFixed(3)} px`);
  claim(depth.off < 0.5, `the yaw puts the sheets square to the lens (${depth.off}° off)`);
  claim(throwFlat < 0.5, `the z-stacking is worth under half a pixel either way — it keeps the drawing ORDER and buys no depth (${throwFlat.toFixed(3)} px at its worst)`);
  // and he squares up when a place takes the camera
  await p.close();
  const q = await room(...PLATE);
  await put(q, -2.2, 3.0, 0, 0);
  await frames(q, 30);
  const off = (await live(q)).pepeYaw;
  await q.evaluate(() => window.__theatre.pieces.walk.go('piano'));
  await settle(q);
  await frames(q, 30);
  const sq = (await live(q)).pepeYaw;
  claim(Math.abs(off) > 5 && Math.abs(sq) < 0.05, `he was turned ${off}° while they walked and is square again at the place (${sq}°)`);
  await q.close();
}

// ---- 9. THE FLAT THINGS ------------------------------------------------------------------------
if (doing('flat')) {
  await fresh();
  console.log('\nFLAT — which sheets are drawn while the visitor is on their feet');
  const p = await room(...PLATE);
  const readAll = () =>
    p.evaluate(() => {
      const T = window.__theatre;
      const vis = (n) => {
        const o = T.scene.getObjectByName(n);
        if (!o) return null;
        let v = o.visible, q = o.parent;
        while (q) {
          v = v && q.visible;
          q = q.parent;
        }
        return v;
      };
      const d = new T.THREE.Vector3();
      T.camera.getWorldDirection(d);
      return {
        flame0: vis('flame-0'),
        flame5: vis('flame-5'),
        hearth0: vis('hearth-0'),
        revealHand: vis('reveal-hand'),
        overheadY: +d.y.toFixed(3),
        pianoHandL: vis('piano-hand-L'),
        crossDoor: vis('cross-door'),
        crossroads: vis('crossroads'),
        droste: !!T.pieces.props.droste?.mesh?.visible,
        burning: !!T.pieces.props.fine?.burning,
      };
    });
  // light the fire from a free station, then look
  await p.evaluate(() => window.__theatre.pieces.props.fine.set(true));
  await frames(p, 20);
  const walking = await readAll();
  console.log('   while walking:', JSON.stringify(walking));
  claim(walking.burning === true && walking.flame0 === false && walking.flame5 === false, 'the fire is alight and none of its twelve tongues is drawn');
  claim(walking.hearth0 !== true, 'and neither are the hearth’s three');
  claim(walking.revealHand !== true, `his hand on the cloth withdrew on its own (the lens looks ${walking.overheadY >= -0.6 ? 'level, so the hand is out' : 'down'}: dir.y ${walking.overheadY})`);
  claim(walking.pianoHandL !== true, 'the piano hands are not out (they need the piano place)');
  claim(walking.crossDoor !== true && walking.crossroads !== true, 'the door leaf and the crossroads plate are put away');
  claim(walking.droste === true, 'the picture of the room is still hanging, and still drawn from the resting plate');
  const plate = await p.evaluate(() => ({ resting: window.__theatre.pieces.camera.restingShot, current: window.__theatre.pieces.camera.current, atRest: window.__theatre.pieces.camera.atRest }));
  claim(plate.resting === 'home' && plate.current === 'free' && plate.atRest === false, `the photograph is drawn from '${plate.resting}' while the lens is on '${plate.current}'`);
  // …and they come back at the place
  await p.evaluate(() => window.__theatre.pieces.walk.go('fireplace'));
  await settle(p);
  await frames(p, 20);
  const there = await readAll();
  console.log('   at the fireplace:', JSON.stringify(there));
  claim(there.flame0 === true || there.flame5 === true, 'the tongues are drawn again the moment the place owns the camera');
  await shot(p, 'fire-at-the-place-1280x800');
  await p.close();
}

// ---- 10. THE EVENING GOES ON WHILE THEY WALK -----------------------------------------------------
if (doing('talk')) {
  await fresh();
  console.log('\nTALK — the placard takes a line mid-walk (the whole evening, no ?view)');
  const p = await open(...PLATE, '?free=1&now=21:12');
  await p.mouse.click(PLATE[0] / 2, PLATE[1] / 2); // the door: the visitor lets themselves in
  await p.waitForFunction(() => window.__theatre.pieces.dialogue?.asking === true, null, { timeout: T_OUT, polling: 400 });
  const arrived = await live(p);
  claim(arrived.current === 'free' && arrived.free.on === true, `the arrival through the door lands the visitor on their feet (${arrived.current}, at ${arrived.pos[0].toFixed(2)}, ${arrived.pos[2].toFixed(2)})`);
  // THE FIELD HOLDS THE KEYBOARD, AND THE ROOM HAS A CONTROL FOR THAT ALREADY. dialogue.js keeps
  // the focus in its hidden input on every mousedown anywhere (`e.preventDefault()`, THE FIELD, ON
  // A PHONE), so a click on the glass cannot take it away — which is right, and it means W/A/S/D
  // are dead all the time a question is open. What is NOT dead is the placard's own fold tab: the
  // card goes out of the frame, the field is blurred, and the visitor has their keyboard. So that is
  // what is tested, because that is what a visitor would do.
  const held = await p.evaluate(async () => {
    const x = window.__theatre.camera.position.x;
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true }));
    return x;
  });
  await p.keyboard.down('KeyA');
  await frames(p, 24);
  await p.keyboard.up('KeyA');
  const eaten = await live(p);
  claim(Math.abs(eaten.pos[0] - held) < 1e-6, `with the field open the A key is the field's and not the room's (x ${eaten.pos[0].toFixed(3)})`);
  await p.evaluate(() => window.__theatre.pieces.dialogue.fold(true));
  await frames(p, 6);
  await p.keyboard.down('KeyA');
  await frames(p, 30);
  await p.keyboard.up('KeyA');
  // …and the reading is taken once he has STOPPED. A key-up is not a handbrake: the velocity closes
  // 55 % of the gap to nought on each drawing, so he coasts for three more, and a reading taken on
  // the drawing of the key-up is a reading of a man still walking. (This is how the first cut of
  // this file convinced itself that typing a line moved him.)
  await p.waitForFunction(() => !window.__theatre.pieces.camera.free.walking, null, { timeout: T_OUT, polling: 100 });
  await frames(p, 2);
  const moved = await live(p);
  claim(Math.abs(moved.pos[0] - eaten.pos[0]) > 0.1, `and with the card folded away it walks them (x ${eaten.pos[0].toFixed(3)} → ${moved.pos[0].toFixed(3)})`);
  // …and then the card comes back and a line is typed, which needs the keyboard back in the field
  await p.evaluate(() => window.__theatre.pieces.dialogue.fold(false));
  await frames(p, 8);
  await p.keyboard.type('good evening');
  const typed = await live(p);
  claim(Math.abs(typed.pos[0] - moved.pos[0]) < 1e-6, 'and typing the letters of that line did not walk him anywhere');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(8000);
  const text = await p.evaluate(() => (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim());
  const after = await live(p);
  claim(text.length > 0, `the placard is carrying words while the visitor is standing on the floor: "${text.slice(0, 110)}"`);
  claim(after.current === 'free' || after.current === 'pepe', `and the camera is still the walk's or the turn's own (${after.current})`);
  await shot(p, 'talking-while-walking-1280x800');
  await p.close();
}

// ---- 11. TEXELS UP CLOSE -------------------------------------------------------------------------
// ink.js measures a surface's own drawing in TEXELS PER SCREEN PIXEL (params.texPen) and its pen is
// 0.52 px of nib radius, which measures 2.00 px at half coverage (ink.js says so, at length). So the
// question "does this drawing survive being walked up to" is: how many screen pixels does ONE TEXEL
// cover, and is that more than a pen's width.
if (doing('texels')) {
  await fresh();
  console.log('\nTEXELS — what the drawn surfaces measure at 0.80 m, at 1280x800');
  const p = await room(...PLATE);
  // Three stations, each 0.80 m off the face of the thing, looking square at it. NONE of them is
  // inside the walkable region — the 35° rule keeps a visitor downstage of z 1.82 — so the camera is
  // put there by hand for the measurement, and what a visitor can ACTUALLY reach is measured after.
  const AT = [
    ['the tall case', -1.58, -1.40, 0, 'x -2.10..-1.06, front face z -2.20'],
    ['the press', 2.29, -1.42, 0, 'x 2.02..2.56, front face z -2.22'],
    ['the switch plate on the door', 1.48, -1.74, 0, 'room:plate, x 1.33..1.63 at z -2.537'],
    // …AND THE ONE SURFACE A VISITOR CAN ACTUALLY GET CLOSER TO THAN THAT. The region's only edge
    // that is a real wall is the 0.35 m margin off the plaster, so a visitor standing hard against
    // it is 0.35 m off the stage-right wall — nearer than the 0.80 m the brief asks about, and the
    // only place in this prototype where the question is not hypothetical.
    ['the stage-right wall, from the region’s own edge', 2.25, 4.0, -90, 'the plaster at x 2.60, 0.35 m away — a station a visitor can stand on'],
  ];
  const rows = [];
  for (const [name, x, z, yaw, where] of AT) {
    const got = await p.evaluate(
      ([px, pz, pyaw]) => {
        const T = window.__theatre, THREE = T.THREE, c = T.camera;
        // stand the live camera there with the walking lens, without going through the region
        c.position.set(px, 1.55, pz);
        c.up.set(0, 1, 0);
        c.lookAt(px - Math.sin((pyaw * Math.PI) / 180), 1.35, pz - Math.cos((pyaw * Math.PI) / 180));
        c.updateMatrixWorld();
        c.updateProjectionMatrix();
        const H = T.size.h;
        const ray = new THREE.Raycaster();
        const seen = new Map();
        for (let sy = 40; sy < H; sy += 24) for (let sx = 40; sx < T.size.w; sx += 40) {
          ray.setFromCamera(new THREE.Vector2((sx / T.size.w) * 2 - 1, -(sy / H) * 2 + 1), c);
          const hit = ray.intersectObject(T.scene, true).find((h) => h.object.isMesh && h.object.visible && h.object.material?.map);
          if (!hit) continue;
          const m = hit.object.material;
          const img = m.map.image;
          const tw = img?.width ?? img?.videoWidth ?? 0;
          if (!tw) continue;
          const tile = m.userData?.uvRect ? Math.abs(m.userData.uvRect.u1 - m.userData.uvRect.u0) : (m.userData?.tile ?? 1);
          const mPerTexel = tile / tw;
          // screen pixels per world metre at this distance, at this lens
          const pxPerM = H / (2 * hit.distance * Math.tan((c.fov * Math.PI) / 360));
          const texelPx = mPerTexel * pxPerM;
          const key = `${m.name || 'mat'}`;
          const prev = seen.get(key);
          if (!prev || texelPx > prev.texelPx) seen.set(key, { mat: key, tex: tw, tile: +tile.toFixed(3), d: +hit.distance.toFixed(3), texelPx: +texelPx.toFixed(3), perPx: +(1 / texelPx).toFixed(2) });
        }
        return [...seen.values()].sort((a, b) => b.texelPx - a.texelPx);
      },
      [x, z, yaw]
    );
    rows.push([name, where, got]);
  }
  const PEN = 2.0; // px: ink.js's contour at half coverage, from lineBase 0.52
  for (const [name, where, got] of rows) {
    console.log(`  ${name}  (${where}), lens 0.80 m off it`);
    for (const g of got.slice(0, 7)) console.log(`     ${String(g.mat).padEnd(14)} ${String(g.tex).padStart(5)} texels / ${String(g.tile).padStart(6)} m tile  at ${String(g.d).padStart(5)} m  →  ${g.texelPx.toFixed(2)} px a texel  (${g.perPx} texels a pixel)${g.texelPx > PEN ? '   ← over a pen’s width' : ''}`);
    const over = got.filter((g) => g.texelPx > PEN);
    claim(true, `${name}: ${over.length} of ${got.length} drawn surfaces are over a pen’s width per texel${over.length ? ' — ' + over.map((g) => `${g.mat} ${g.texelPx.toFixed(2)} px` ).join(', ') : ''}`);
  }
  // …AND WHAT A VISITOR CAN ACTUALLY WALK UP TO. The nearest station in the region to each of the
  // three, and the same measurement from there.
  const near = await p.evaluate(() => {
    const F = window.__theatre.pieces.camera.freeApi();
    const out = {};
    for (const [n, x, z] of [['the tall case', -1.58, -2.2], ['the press', 2.29, -2.22], ['the switch plate', 1.48, -2.537]]) {
      const [cx, cz] = F.clip(x, z);
      out[n] = { x: +cx.toFixed(3), z: +cz.toFixed(3), d: +Math.hypot(cx - x, cz - z).toFixed(3) };
    }
    return out;
  });
  for (const [n, v] of Object.entries(near)) console.log(`   the nearest station in the region to ${n} is (${v.x}, ${v.z}) — ${v.d} m off it, not 0.80`);
  // …AND THE BOARDS UNDER THE VISITOR'S OWN FEET, which are 1.55 m away wherever they stand and are
  // therefore the nearest drawn surface in the film at every moment of the walk.
  const floor = await p.evaluate(() => {
    const T = window.__theatre, c = T.camera;
    const m = T.scene.getObjectByName('room:floor')?.material;
    const tw = m?.map?.image?.width ?? 0;
    if (!tw) return null;
    const tile = m.userData?.tile ?? 1;
    const pxPerM = T.size.h / (2 * 1.55 * Math.tan((c.fov * Math.PI) / 360));
    return { tex: tw, tile, texelPx: +((tile / tw) * pxPerM).toFixed(3), perPx: +(1 / ((tile / tw) * pxPerM)).toFixed(2) };
  });
  if (floor) {
    console.log(`   the floorboards under the visitor's feet: ${floor.tex} texels / ${floor.tile} m tile at 1.55 m → ${floor.texelPx} px a texel (${floor.perPx} texels a pixel)${floor.texelPx > PEN ? '   ← over a pen’s width' : ''}`);
    claim(true, `the boards at the visitor's own feet measure ${floor.texelPx} px a texel`);
  }
  await p.close();
}

// ---- 12. WHAT IT COSTS ---------------------------------------------------------------------------
if (doing('perf')) {
  await fresh();
  console.log('\nPERF — 1600x900 at dpr 2, walking against standing still');
  // WHAT FREE MODE ACTUALLY COSTS IS STRUCTURAL AND IT CAN BE COUNTED RATHER THAN TIMED. ink.js
  // draws ONE scene pass when the camera is standing on the resting plate to the float, and TWO
  // everywhere else — the visitor's frame, plus the photograph on the bookcase drawn from `home`.
  // Free mode is never on that plate, so it is always the two. What matters is how big the second
  // one is: at rest the plate carries the whole drawing buffer's height, and anywhere else it drops
  // to the picture's own box on the glass rounded up to a power of two. That number is the cost, and
  // it is the same cost the room already pays at every place and every cut of a reading.
  {
    const q = await room(...PLATE);
    const walking = await q.evaluate(() => {
      const C = window.__theatre.pieces.camera, D = window.__theatre.pieces.props.droste;
      const b = D?.hitBox?.();
      return { current: C.current, atRest: C.atRest, onPlate: C.current === C.restingShot, box: b ? { w: +b.w.toFixed(0), h: +b.h.toFixed(0) } : null };
    });
    console.log(`   in free mode the camera reports current '${walking.current}', atRest ${walking.atRest} — so ink.js draws two passes, and the photograph's plate is sized from its own box on the glass (${walking.box ? `${walking.box.w}x${walking.box.h} px` : 'off frame'})`);
    claim(walking.atRest === false && walking.onPlate === false, 'the second pass is the small one, not a second full-size drawing of the room');
    await q.close();
  }
  const p = await room(...BIG, '', { dpr: 2 });
  const sample = (secs) =>
    p.evaluate(
      (s) =>
        new Promise((res) => {
          const out = [];
          let last = performance.now();
          const end = last + s * 1000;
          const go = () => {
            const now = performance.now();
            out.push(now - last);
            last = now;
            if (now < end) requestAnimationFrame(go);
            else {
              out.sort((a, b) => a - b);
              res({ n: out.length, med: +out[Math.floor(out.length / 2)].toFixed(2), p90: +out[Math.floor(out.length * 0.9)].toFixed(2), worst: +out[out.length - 1].toFixed(2) });
            }
          };
          requestAnimationFrame(go);
        }),
      secs
    );
  await frames(p, 12);
  const still = await sample(5);
  await key(p, 'KeyW', true);
  await key(p, 'KeyQ', true);
  await frames(p, 6);
  const moving = await sample(5);
  await key(p, 'KeyW', false);
  await key(p, 'KeyQ', false);
  console.log(`   at rest   ${still.med} ms median, ${still.p90} ms at the ninetieth, ${still.worst} ms worst  (${still.n} frames)`);
  console.log(`   walking   ${moving.med} ms median, ${moving.p90} ms at the ninetieth, ${moving.worst} ms worst  (${moving.n} frames)`);
  console.log(`   walking costs ${(moving.med - still.med).toFixed(2)} ms a frame, ${((moving.med / still.med - 1) * 100).toFixed(0)} %`);
  claim(moving.med < still.med * 1.6 + 4, `walking is not a different order of cost from standing (${moving.med} vs ${still.med} ms)`);
  console.log('   (a software rasteriser on a shared machine: the RATIO is the measurement, not the milliseconds — and at 3200x1800 it hands back so few frames that even the ratio is thin)');
  await p.close();
  // …so the same pair again at 1280x800 dpr 1, where there are enough frames for a median to mean
  // something. This is the honest one.
  {
    const q = await room(...PLATE);
    const take = (secs) =>
      q.evaluate(
        (s) =>
          new Promise((res) => {
            const out = [];
            let last = performance.now();
            const end = last + s * 1000;
            const go = () => {
              const now = performance.now();
              out.push(now - last);
              last = now;
              if (now < end) requestAnimationFrame(go);
              else {
                out.sort((a, b) => a - b);
                res({ n: out.length, med: +out[Math.floor(out.length / 2)].toFixed(2), p90: +out[Math.floor(out.length * 0.9)].toFixed(2) });
              }
            };
            requestAnimationFrame(go);
          }),
        secs
      );
    await frames(q, 12);
    const s2 = await take(6);
    await key(q, 'KeyW', true);
    await key(q, 'KeyQ', true);
    await frames(q, 6);
    const m2 = await take(6);
    await key(q, 'KeyW', false);
    await key(q, 'KeyQ', false);
    console.log(`   1280x800 dpr 1   at rest ${s2.med} ms median (${s2.n} frames) · walking ${m2.med} ms median (${m2.n} frames) · ${((m2.med / s2.med - 1) * 100).toFixed(0)} %`);
    claim(m2.med < s2.med * 1.35, `walking costs under a third more than standing still at 1280x800 (${m2.med} vs ${s2.med} ms)`);
    await q.close();
  }
}

// ---- 13. THE DRAWINGS ----------------------------------------------------------------------------
if (doing('draw')) {
  await fresh();
  console.log('\nDRAW — the sheets');
  // ON A FROZEN CLOCK, so that the only thing moving between the eight cells is the CAMERA. The
  // room hands out one drawing per rendered frame when the clock is pinned (camera.js, THE DOLLY),
  // so the seven-drawing gaps below are seven drawings and not seven of whatever this machine
  // managed; and the boil, the puppet and the pendulum hold, which is what a camera sheet is for.
  const p = await room(...PLATE, '&t=3');
  const R = await p.evaluate(() => window.__theatre.pieces.camera.free.region);
  const corner = R[5]; // the upstage-left vertex: the one that faces the fireplace and the case
  // EIGHT DRAWINGS OF THE WALK, from the chair to that corner, evenly through it
  const bearing = (Math.atan2(-(corner[0] - 0), -(corner[1] - 6.05)) * 180) / Math.PI;
  // THE WALK IS WALKED FIRST AND PHOTOGRAPHED AFTERWARDS, and it has to be: a screenshot off a
  // software rasteriser costs the better part of a second, the clock is pinned so that every
  // rendered frame is a drawing, and a sheet shot as the walk runs spaces its cells by how long the
  // MACHINE took — the first cut of this sheet put the arrival in cell four and then stood still for
  // three more. So the whole walk is run inside the page with nothing interrupting it, every
  // drawing's station is kept, and the eight cells are then struck at eight of those stations by
  // name. Same walk, same clip, same slide along the wall; only the shutter has moved.
  await put(p, 0, 6.05, bearing, 0);
  const path = await p.evaluate(
    () =>
      new Promise((res) => {
        const T = window.__theatre, F = T.pieces.camera.freeApi();
        const out = [];
        let seen = F.drawings;
        F.key('KeyW', true);
        const go = () => {
          if (F.drawings > seen) {
            seen = F.drawings;
            const s = F.pose;
            out.push([s.x, s.z, s.yaw]);
            if (out.length >= 64) {
              F.key('KeyW', false);
              return res(out);
            }
          }
          requestAnimationFrame(go);
        };
        requestAnimationFrame(go);
      })
  );
  // the drawing the walk stops travelling on, so the sheet ends where the walk does rather than
  // spending its last cells on a man standing against a wall
  let last = path.length - 1;
  while (last > 1 && Math.hypot(path[last][0] - path[last - 1][0], path[last][1] - path[last - 1][1]) < 1e-4) last--;
  const cells = [];
  for (let i = 0; i < 8; i++) {
    const k = Math.round((i * last) / 7);
    const [x, z, yaw] = path[k];
    await put(p, x, z, yaw, 0);
    await frames(p, 2);
    cells.push({ buf: await p.screenshot(), n: `${k}  ${x.toFixed(2)},${z.toFixed(2)}` });
  }
  console.log(`   the walk ran ${last} drawings from the chair to (${path[last][0].toFixed(3)}, ${path[last][1].toFixed(3)}), sampled at eight of them`);
  await sheet(cells, `${OUT}/walk-to-the-left-corner-1280x800.png`, 4, 0.4);
  // THE ROOM FROM THAT CORNER
  await put(p, corner[0], corner[1], (Math.atan2(-(0 - corner[0]), -(-0.82 - corner[1])) * 180) / Math.PI, 0);
  await frames(p, 8);
  const c1 = await live(p);
  console.log(`   the left corner: (${c1.pos[0].toFixed(3)}, ${c1.pos[2].toFixed(3)}) yaw ${c1.yaw}° — ${Math.abs((Math.atan2(c1.pos[0], c1.pos[2] + 0.82) * 180) / Math.PI).toFixed(2)}° off his front`);
  await shot(p, 'from-the-left-corner-1280x800');
  // FROM NEAR THE DOOR, LOOKING BACK AT HIM — the yaw at work
  await put(p, 2.0, 5.6, (Math.atan2(-(0 - 2.0), -(-0.82 - 5.6)) * 180) / Math.PI, 0);
  await frames(p, 40);
  const c2 = await live(p);
  console.log(`   from near the door: (${c2.pos[0].toFixed(3)}, ${c2.pos[2].toFixed(3)}) and he is turned ${c2.pepeYaw}°`);
  await shot(p, 'from-the-door-looking-back-1280x800');
  // AND WHAT A TURN ROUND AT THE CHAIR SHOWS, which is this prototype's own confession
  await put(p, 0, 6.05, 180, 0);
  await frames(p, 8);
  await shot(p, 'looking-downstage-from-the-chair-1280x800');
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
  // THE TALL CASE AT 0.80 m, and it is taken on a page with the FLAG OFF. The station is outside the
  // region — the 35° rule keeps a visitor 4.02 m off that case — so `put` cannot reach it, and a
  // camera set by hand on a free page is overwritten on the very next drawing by the free pose,
  // which is how the first cut of this sheet filed the door's own frame under the case's name. With
  // no free mode running, nothing re-applies a pose and the lens stays where it is put; the walking
  // lens is set on it by hand so the picture is the one a visitor WOULD get if the region ever let
  // them stand there.
  {
    const q = await open(...PLATE, '?shot=1');
    const where = await q.evaluate(() => {
      const T = window.__theatre, c = T.camera;
      const A = T.size.w / T.size.h;
      const fov = Math.min(50, Math.max(36, (2 * Math.atan(Math.tan((62 / 2) * (Math.PI / 180)) / A) * 180) / Math.PI));
      c.position.set(-1.58, 1.55, -1.4);
      c.up.set(0, 1, 0);
      c.lookAt(-1.58, 1.35, -2.2);
      c.fov = fov;
      c.updateMatrixWorld();
      c.updateProjectionMatrix();
      return { fov: +fov.toFixed(2), d: +Math.abs(-1.4 - -2.2).toFixed(2) };
    });
    await q.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await shot(q, 'case-at-0m80-1280x800');
    console.log(`   the tall case from ${where.d} m off its face, on the walking lens (${where.fov}°) — a station the region refuses`);
    await q.close();
  }
}

// ---- 14. TEN SECONDS OF IT, AS A FILM -------------------------------------------------------------
// TWO FILMS, and the reason is the machine. Playwright's recorder writes what the browser actually
// painted, and a software rasteriser drawing this room paints well under twelve frames a second —
// so that webm is an honest record of this MACHINE and a dishonest record of the MOTION. The second
// one is the motion: the clock is pinned, the room hands out one drawing per rendered frame, every
// drawing is screenshotted, and the 120 of them are laid down at twelve a second. That is the film
// a visitor on a real machine would see, and it is the one to watch.
const SCRIPT = [
  ['KeyW', 26],
  ['KeyQ', 14],
  ['KeyW', 22],
  ['KeyE', 18],
  ['KeyW', 20],
  ['KeyA', 20],
];
if (doing('video')) {
  await fresh();
  console.log('\nVIDEO — ten seconds of walking');
  {
    const p = await room(...PLATE, '', { ctxOpts: { recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } } });
    await put(p, 0, 6.05, 0, 0);
    await frames(p, 12);
    for (const [code, n] of SCRIPT) {
      await key(p, code, true);
      await frames(p, n);
      await key(p, code, false);
      await frames(p, 3);
    }
    await frames(p, 14);
    const end = await live(p);
    console.log(`   recorder: ended at (${end.pos[0].toFixed(3)}, ${end.pos[2].toFixed(3)}) yaw ${end.yaw}°`);
    const vid = p.video();
    await p.close();
    await p.__ctx.close(); // the file is not finished until the context is
    const path = vid ? await vid.path() : null;
    console.log(`   ${path}   (what this machine painted)`);
    claim(!!path, 'a webm came off Playwright’s recorder');
  }
  {
    const p = await room(...PLATE, '&t=3');
    await put(p, 0, 6.05, 0, 0);
    await frames(p, 4);
    const dir = `${OUT}/drawings`;
    mkdirSync(dir, { recursive: true });
    let k = 0;
    const take = async () => {
      await p.screenshot({ path: `${dir}/${String(k).padStart(4, '0')}.png` });
      k++;
    };
    for (let i = 0; i < 6; i++) await take();
    for (const [code, n] of SCRIPT) {
      await key(p, code, true);
      for (let i = 0; i < n; i++) {
        await frames(p, 1);
        await take();
      }
      await key(p, code, false);
      for (let i = 0; i < 3; i++) {
        await frames(p, 1);
        await take();
      }
    }
    for (let i = 0; i < 14; i++) {
      await frames(p, 1);
      await take();
    }
    const end = await live(p);
    console.log(`   stepped: ${k} drawings, ended at (${end.pos[0].toFixed(3)}, ${end.pos[2].toFixed(3)}) yaw ${end.yaw}°  = ${(k / 12).toFixed(1)} s at twelve a second`);
    await p.close();
    const file = `${OUT}/free-walk-12fps.webm`;
    const r = spawnSync('ffmpeg', ['-y', '-framerate', '12', '-i', `${dir}/%04d.png`, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-pix_fmt', 'yuv420p', file], { encoding: 'utf8' });
    console.log(`   ${file}   (the motion, one drawing a frame at twelve a second)`);
    claim(r.status === 0, `the stepped film was laid down${r.status === 0 ? '' : ': ' + String(r.stderr).split('\n').slice(-3).join(' ')}`);
  }
}

// THE CONTACT SHEET, the book proof's own arrangement (tools/_book-anim.mjs) copied rather than
// shared: that file is about a loop being stepped and this one is about a camera being walked.
async function sheet(shots, file, cols = 4, scale = 0.4) {
  if (!shots.length) return;
  const meta = await sharp(shots[0].buf).metadata();
  const cw = Math.round(meta.width * scale), ch = Math.round(meta.height * scale);
  const rows = Math.ceil(shots.length / cols);
  const PAD = 6;
  const W = cols * (cw + PAD) + PAD, H = rows * (ch + PAD) + PAD;
  const cells = [];
  for (let i = 0; i < shots.length; i++) {
    const x = PAD + (i % cols) * (cw + PAD), y = PAD + Math.floor(i / cols) * (ch + PAD);
    cells.push({ input: await sharp(shots[i].buf).resize(cw, ch).toBuffer(), left: x, top: y });
    const tag = `<svg width="${cw}" height="22"><rect width="${cw}" height="22" fill="#fff" opacity="0.86"/><text x="5" y="16" font-family="monospace" font-size="14" fill="#111">${shots[i].n}</text></svg>`;
    cells.push({ input: Buffer.from(tag), left: x, top: y + ch - 22 });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 34, g: 34, b: 34 } } }).composite(cells).png().toFile(file);
  console.log(`   ${file} — ${shots.length} drawings, ${cols} to a row, ${W}x${H}`);
}

console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser?.close().catch(() => {});
process.exit(bad ? 1 : 0);
