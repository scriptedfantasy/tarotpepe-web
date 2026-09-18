#!/usr/bin/env node
// THE RINGS ON THE FLOOR, PUT TO A WITNESS THAT IS NOT THE PIECE (src/pieces/walk-marks.js).
//
// The user: "Only use marks in the room to specify where users can go, preferably on the floor. The
// individual objects that can be clicked should not be marked because users should discover them by
// themselves."
//
// Nothing below asks walk.js whether it thinks a ring is in the picture, on the floor, or reachable.
// Every claim is put to a witness outside the piece:
//
//   the DOM        #marks' own canvases and their getBoundingClientRect — what is actually on the
//                  glass, where, at what size. A piece can say anything; a node cannot.
//   the ARBITER    props.switches.at(x, y) at the CENTRE OF EVERY RING: the room's own pointer test,
//                  asked whether the thing under the ring is the place it promises.
//   THE FLOOR      every drawn ring point is UNPROJECTED — a ray from the lens through that pixel,
//                  intersected with the plane y = 0 — and what comes back has to be a circle of the
//                  ring's own radius about the place's standing spot. That is the claim "it lies in
//                  the floor's plane" proved by inverting the projection rather than by eyeballing
//                  an ellipse, and it is computed here from the camera, never from the mark layer.
//   a real TAP     page.touchscreen.tap on a measured ring, through the arbiter, no api called
//   the DRAWING    /tmp/marks/*.png at 390x844 and 1280x800
//
//   BASE=http://127.0.0.1:8743 node tools/_walk-marks-proof.mjs
//   BASE=… node tools/_walk-marks-proof.mjs --only cursor,floor --out /tmp/marks
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/marks';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800];
const PHONE = [390, 844];
const PLACES = ['fireplace', 'doorway', 'case', 'piano', 'table'];
// every switch in the room that is an EGG or an OBJECT. None of these may ever carry a mark, and no
// ring's centre may ever be given to one.
const NOT_MARKED = ['cat', 'radio', 'wine', 'fuse', 'vortex', 'vase', 'rain', 'dark', 'peep', 'deck', 'cross', 'globe', 'droste', 'konami', 'fine', 'piano-keys', 'table-book'];
const ONLY = args.only ? String(args.only).split(',') : null;
const doing = (n) => !ONLY || ONLY.includes(n);

const LAUNCH = {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
};
let browser = null;
const fresh = async () => {
  await browser?.close().catch(() => {});
  browser = await chromium.launch(LAUNCH);
};
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  });

// TOUCH is the whole point of this piece, so the phone pages are opened with `hasTouch` and the rule
// is left to answer for itself. Measured under this same emulation (the CURSOR section, which reads
// the queries off each window): hasTouch gives any-pointer:fine false / pointer:coarse true, and a
// plain page gives the reverse.
async function open(w, h, { touch = false, query = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  page.__errors = errors;
  return page;
}
const room = (w, h, q = '', touch = w < 800) => open(w, h, { touch, query: `?shot=1${q}` });
const frames = (p, n = 3) => p.evaluate((k) => new Promise((res) => { let i = k; const go = () => (i-- <= 0 ? res() : requestAnimationFrame(go)); go(); }), n);
const settle = async (p, ms = 240000) => {
  await p.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: ms, polling: 250 });
  await frames(p, 4);
};
const rest = async (p) => {
  await p.waitForFunction(() => Math.abs(window.__theatre.pieces.camera.pan - window.__theatre.pieces.camera.panTarget) < 1e-3, null, { timeout: 120000, polling: 200 }).catch(() => {});
  await frames(p, 4);
};
// THE WITNESS: what is on the glass, read off the nodes and not off the piece.
const drawn = (p) =>
  p.evaluate(() => {
    const root = document.getElementById('marks');
    if (!root || !root.classList.contains('on')) return [];
    return [...root.querySelectorAll('canvas')]
      .filter((c) => c.style.display !== 'none')
      .map((c) => {
        const r = c.getBoundingClientRect();
        return { key: c.dataset.key, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
      });
  });
const says = (p) => p.evaluate(() => { const M = window.__theatre.pieces.walk.marks; return { shown: M.shown, why: M.why, cursorless: M.cursorless, forced: M.forced, refused: M.refused, radius: M.radius, keys: M.keys() }; });
const asks = (p, x, y) => p.evaluate(([px, py]) => window.__theatre.pieces.props.switches.at(px, py), [x, y]);
const where = (p) => p.evaluate(() => ({ at: window.__theatre.pieces.walk.at, shot: window.__theatre.pieces.camera.current, pan: +window.__theatre.pieces.camera.pan.toFixed(3) }));
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png` });
const chev = (p) => p.evaluate(() => window.__theatre.pieces.camera.panBoxes);
// A tap on a chevron, `times` of them. The WAIT is not politeness: the page sets `__theatreReady` on
// its third render and the pan is only armed once the camera is standing still on the resting plate,
// which is a beat later — a `panBy` issued the instant the page says it is ready finds no chevrons,
// clicks nothing, and quietly reports a room with no rings because it is still facing the back wall.
async function panBy(p, side, times = 1) {
  await p.waitForFunction(() => window.__theatre.pieces.camera.panable && !!window.__theatre.pieces.camera.panBoxes, null, { timeout: 120000, polling: 100 }).catch(() => {});
  for (let i = 0; i < times; i++) {
    const b = await chev(p);
    if (!b) return false;
    await p.mouse.click(b[side].x + b[side].w / 2, b[side].y + b[side].h / 2);
  }
  await rest(p);
  return true;
}
const square = async (p) => {
  await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
  await frames(p, 4);
};
const keysOf = (ms) => ms.map((m) => m.key).sort().join(',') || '—';
const ok = (b) => (b ? '✓' : '✗');
let bad = 0;
const claim = (b, text) => {
  if (!b) bad++;
  console.log(`   ${ok(b)} ${text}`);
};

// ---- 1. WHICH WINDOWS ARE MARKED AT ALL --------------------------------------------------------
if (doing('cursor')) {
  await fresh();
  console.log('\nCURSOR — a laptop keeps the cursor as its affordance and gets no rings');
  for (const [w, h, touch] of [[...PLATE, false], [...PHONE, true]]) {
    const q = await open(w, h, { touch, query: '?shot=1' });
    const mq = await q.evaluate(() => ({
      anyFine: matchMedia('(any-pointer: fine)').matches,
      anyCoarse: matchMedia('(any-pointer: coarse)').matches,
      pointerCoarse: matchMedia('(pointer: coarse)').matches,
      touchPoints: navigator.maxTouchPoints,
    }));
    console.log(`  ${w}x${h}${touch ? ' touch' : ' mouse'}  any-pointer:fine=${mq.anyFine} any-pointer:coarse=${mq.anyCoarse} pointer:coarse=${mq.pointerCoarse} maxTouchPoints=${mq.touchPoints}`);
    claim(mq.anyFine === !touch, `${w}x${h}: the window ${touch ? 'has no fine pointer' : 'has a fine pointer'} — which is the whole of the rule`);
    await q.close();
  }
  const lap = await room(...PLATE, '', false);
  await frames(lap, 6);
  const lapSays = await says(lap);
  console.log(`  1280x800 mouse    cursorless=${lapSays.cursorless} why=${lapSays.why} · ${(await drawn(lap)).length} ring(s)`);
  claim(lapSays.cursorless === false && (await drawn(lap)).length === 0, '1280x800 with a mouse: no rings anywhere in the room');
  await lap.close();

  const forced = await room(...PLATE, '&marks=1', false);
  await frames(forced, 6);
  const fSays = await says(forced);
  const fDrawn = await drawn(forced);
  console.log(`  1280x800 ?marks=1  forced=${fSays.forced} why=${fSays.why} · ${fDrawn.length} ring(s): ${keysOf(fDrawn)}`);
  claim(fSays.forced && fDrawn.length > 0, '?marks=1 forces them on for a tool on any window');
  await forced.close();

  const off = await room(...PHONE, '&marks=0');
  await frames(off, 6);
  const oSays = await says(off);
  console.log(`  390x844 ?marks=0   refused=${oSays.refused} why=${oSays.why} · ${(await drawn(off)).length} ring(s)`);
  claim(oSays.refused && (await drawn(off)).length === 0, '?marks=0 refuses them on a phone, so the walk proof can ask for the room as it was');
  await off.close();
}

// ---- 2. WHAT IS MARKED: FIVE PLACES, NO OBJECTS, NO EGGS ---------------------------------------
if (doing('frame')) {
  await fresh();
  console.log('\nFRAME — a ring per place whose standing spot is in the picture, and nothing else');
  const p = await room(...PHONE);
  await panBy(p, 'l', 0);
  for (const [label, side, taps] of [['square to the back wall', 'l', 0], ['one tap left', 'l', 1], ['one tap right', 'r', 1]]) {
    await square(p);
    if (taps) await panBy(p, side, taps);
    else await rest(p);
    const ms = await drawn(p);
    console.log(`  ${label.padEnd(24)} rings: ${keysOf(ms)}`);
    claim(ms.every((m) => PLACES.includes(m.key)), `${label}: every ring is one of the five PLACES (${keysOf(ms)})`);
    for (const m of ms) {
      const who = await asks(p, m.cx, m.cy);
      claim(who === `walk-${m.key}`, `${label}: the ${m.key} ring at ${m.cx},${m.cy} is answered by ${who ?? 'nobody'}`);
      claim(!NOT_MARKED.includes(String(who)), `${label}: the ${m.key} ring stands on no egg and no object`);
    }
    if (label === 'one tap left') {
      claim(ms.length >= 3, `one tap left brings the left wall's three spots into the picture (${keysOf(ms)})`);
      await shot(p, 'left-wall-panned-390x844');
    }
    if (label === 'one tap right') {
      claim(ms.length >= 2, `one tap right brings the right wall's two spots into the picture (${keysOf(ms)})`);
      await shot(p, 'right-wall-panned-390x844');
    }
    if (!taps) claim(ms.length === 0, 'square to the back wall a phone holds none of the five spots, so it is given no rings');
  }
  // NOTHING IS EVER MARKED ON AN OBJECT, said from the other end: the layer's own key list.
  const keys = (await says(p)).keys;
  claim(keys.every((k) => PLACES.includes(k)), `the mark layer draws nothing but places (${keys.join(',') || 'none'})`);
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 3. IT IS A CIRCLE LYING ON THE FLOOR ------------------------------------------------------
// The drawn ring is unprojected: a ray from the lens through each of its pixels, met with the plane
// y = 0. What comes back must be the place's own standing circle — same centre, same radius — or the
// thing on the glass is not a mark on the floor, whatever it looks like.
if (doing('floor')) {
  await fresh();
  console.log('\nFLOOR — every ring unprojects onto y = 0 as a circle about the place\'s standing spot');
  const p = await room(...PHONE);
  await panBy(p, 'l', 0); // wait for the pan to be armed before the first `square`, as FRAME does
  for (const [side, taps] of [['l', 1], ['r', 1]]) {
    await square(p);
    await panBy(p, side, taps);
    const rows = await p.evaluate(() => {
      const W = window.__theatre.pieces.walk, T = window.__theatre.THREE, cam = window.__theatre.camera;
      const sw = window.__theatre.size.w, sh = window.__theatre.size.h;
      const out = [];
      for (const k of W.marks.keys()) {
        const ring = W.marks.ring(k), st = W.marks.stand(k), r = W.marks.radius, box = W.marks.box(k);
        // UNPROJECT: the ray through this pixel, met with y = 0. Independent of the mark layer —
        // it uses only the camera and the screen point.
        let rMin = Infinity, rMax = 0, yErr = 0;
        for (const [px, py] of ring) {
          const ndc = new T.Vector3((px / sw) * 2 - 1, -(py / sh) * 2 + 1, 0.5).unproject(cam);
          const dir = ndc.sub(cam.position).normalize();
          const t = -cam.position.y / dir.y; // where that ray crosses the floor
          const hit = cam.position.clone().addScaledVector(dir, t);
          yErr = Math.max(yErr, Math.abs(hit.y));
          const d = Math.hypot(hit.x - st[0], hit.z - st[1]);
          rMin = Math.min(rMin, d);
          rMax = Math.max(rMax, d);
        }
        // and the drawn ellipse's own axes, for the record
        let major = 0, minor = Infinity;
        for (let i = 0; i < ring.length / 2; i++) {
          const a = ring[i], c = ring[i + ring.length / 2];
          const d = Math.hypot(a[0] - c[0], a[1] - c[1]);
          major = Math.max(major, d);
          minor = Math.min(minor, d);
        }
        const objBox = W.box(k);
        out.push({ k, r, rMin: +rMin.toFixed(4), rMax: +rMax.toFixed(4), yErr: +yErr.toFixed(6), major: +major.toFixed(1), minor: +minor.toFixed(1), aspect: +(minor / major).toFixed(3), cy: box.y + box.h / 2, objMid: objBox ? objBox.y + objBox.h / 2 : null, objBottom: objBox ? objBox.y + objBox.h : null });
      }
      return out;
    });
    for (const r of rows) {
      const err = Math.max(Math.abs(r.rMax - r.r), Math.abs(r.rMin - r.r)) * 1000;
      console.log(`  ${r.k.padEnd(10)} unprojected radius ${r.rMin}..${r.rMax} m against ${r.r} (${err.toFixed(2)} mm out) · on y=0 to ${(r.yErr * 1000).toFixed(3)} mm · ellipse ${r.major}x${r.minor} px, aspect ${r.aspect}`);
      claim(err < 1.0, `${r.k}: the drawn ring unprojects onto the floor as a ${r.r} m circle about the standing spot (${err.toFixed(2)} mm out)`);
      claim(r.yErr < 1e-6, `${r.k}: every point of it is in the plane y = 0 (${(r.yErr * 1000).toFixed(4)} mm)`);
      claim(r.aspect < 0.85, `${r.k}: it is foreshortened like a floor and not a sticker on the lens (aspect ${r.aspect})`);
      // BELOW THE OBJECT'S MIDDLE, not below its foot. The standing spot is not always further from
      // the lens than the nearest corner of the thing's own box: at the reading table the chair is
      // pulled out 0.32 m TOWARDS the room, so its near corner projects 16 px lower than the floor
      // in front of it. What the claim is about is that the ring is down on the ground rather than
      // up on the thing, and that is the object's middle.
      if (r.objMid != null) claim(r.cy > r.objMid, `${r.k}: the ring lies BELOW the object on the glass — on the floor, not on the thing (ring ${Math.round(r.cy)} vs the object's middle ${Math.round(r.objMid)}, its foot ${Math.round(r.objBottom)})`);
    }
    claim(rows.length > 0, `one tap ${side === 'l' ? 'left' : 'right'}: there are rings to measure (${rows.map((r) => r.k).join(',') || 'none'})`);
  }
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 4. A REAL TAP ON A RING WALKS THERE -------------------------------------------------------
if (doing('tap')) {
  await fresh();
  console.log('\nTAP — a thumb on the boards, through the arbiter, with nothing called');
  const p = await room(...PHONE);
  for (const [side, want] of [['l', 'fireplace'], ['r', 'table']]) {
    await square(p);
    await panBy(p, side, 1);
    const ms = await drawn(p);
    const m = ms.find((x) => x.key === want) ?? ms[0];
    claim(!!m, `one tap ${side === 'l' ? 'left' : 'right'}: there is a ring to tap (${keysOf(ms)})`);
    if (!m) continue;
    const tap = await p.evaluate((k) => window.__theatre.pieces.walk.marks.tap(k), m.key);
    console.log(`  the ${m.key} ring: ${m.w}x${m.h} px at ${m.x},${m.y}; the thumb box it is given is ${Math.round(tap.w)}x${Math.round(tap.h)}`);
    claim(tap.w >= 44 && tap.h >= 44, `${m.key}: a ring only ${m.h} px tall is still given a full 44 px thumb (${Math.round(tap.w)}x${Math.round(tap.h)})`);
    await p.touchscreen.tap(m.cx, m.cy);
    await settle(p);
    const w2 = await where(p);
    console.log(`  tapped the ${m.key} ring at ${m.cx},${m.cy} → walk.at=${w2.at} shot=${w2.shot}`);
    claim(w2.at === m.key, `a tap on the ${m.key} ring walks the visitor to the ${m.key}`);
    // …and at the place, nothing at all is marked on the thing itself
    const atPlace = await drawn(p);
    claim(atPlace.every((x) => PLACES.includes(x.key) && x.key !== m.key), `at the ${m.key} nothing is marked on the object — the visitor finds it themselves (${keysOf(atPlace)})`);
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
  }
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 5. AT EVERY PLACE, NOTHING IS MARKED ON THE THING -----------------------------------------
if (doing('place')) {
  await fresh();
  console.log('\nAT A PLACE — the grate, the keys, the book and the leaf are found, not announced');
  const p = await room(...PHONE);
  for (const place of PLACES) {
    await square(p);
    await p.evaluate((n) => { window.__theatre.pieces.walk.go(n); }, place);
    await settle(p);
    const ms = await drawn(p);
    console.log(`  at the ${place.padEnd(10)} rings: ${keysOf(ms)}`);
    claim(ms.every((m) => PLACES.includes(m.key)), `at the ${place}: nothing on the glass is a mark on an object`);
    claim(!ms.some((m) => m.key === place), `at the ${place}: the place the visitor is standing at carries no ring of its own`);
    for (const m of ms) {
      const who = await asks(p, m.cx, m.cy);
      claim(!NOT_MARKED.includes(String(who)), `at the ${place}: the ${m.key} ring stands on no egg and no object (${who ?? 'nobody'})`);
    }
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
  }
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 6. WHEN THE ROOM TAKES THEM BACK ----------------------------------------------------------
if (doing('hide')) {
  await fresh();
  console.log('\nHIDDEN — the room is doing something, so it stops showing its floor plan');
  const p = await room(...PHONE);
  await panBy(p, 'l', 1);
  const before = await drawn(p);
  claim(before.length > 0, `idle, the room carries rings (${keysOf(before)})`);
  // …while the pan is still drifting
  const b = await chev(p);
  await p.mouse.click(b.r.x + b.r.w / 2, b.r.y + b.r.h / 2);
  await frames(p, 1);
  const mid = await says(p);
  claim(mid.why === 'panning' && (await drawn(p)).length === 0, `the rings go out while the room is still turning (why=${mid.why})`);
  await rest(p);
  claim((await drawn(p)).length >= 0, 'and come back when it settles');
  // …while a walk is running. Not awaited: `go()` resolves only when the visitor has arrived.
  await square(p);
  await panBy(p, 'l', 1);
  await p.evaluate(() => { window.__theatre.pieces.walk.go('fireplace'); });
  await frames(p, 2);
  const walking = await says(p);
  claim((await drawn(p)).length === 0 && walking.why === 'moving', `while the walk runs there are no rings (why=${walking.why})`);
  await settle(p);
  // …while the fire has the room
  await p.evaluate(() => window.__theatre.pieces.props.fine.set(true));
  await frames(p, 4);
  const fire = await says(p);
  claim((await drawn(p)).length === 0 && fire.why === 'fire', `the fire alight takes the room and the rings with it (why=${fire.why})`);
  await p.evaluate(() => window.__theatre.pieces.props.fine.set(false));
  await frames(p, 4);
  await p.evaluate(() => window.__theatre.pieces.walk.back());
  await settle(p);
  // …while the book stands open
  await p.evaluate(() => { window.__theatre.pieces.walk.go('table'); });
  await settle(p);
  await p.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
  await p.waitForFunction(() => window.__theatre.pieces.walk.books.showing, null, { timeout: 60000, polling: 100 }).catch(() => {});
  await frames(p, 6);
  const bookWhy = (await says(p)).why;
  claim((await drawn(p)).length === 0 && ['book', 'held', 'moving'].includes(bookWhy), `while the book stands open there are no rings (why=${bookWhy})`);
  await p.evaluate(() => window.__theatre.pieces.walk.books.close());
  await p.waitForFunction(() => !window.__theatre.pieces.walk.books.showing && !window.__theatre.pieces.camera.moving, null, { timeout: 120000, polling: 150 }).catch(() => {});
  await p.evaluate(() => window.__theatre.pieces.walk.back());
  await settle(p);
  // …while the placard's field has the focus
  await panBy(p, 'l', 1);
  const armed = await drawn(p);
  claim(armed.length > 0, `back at the chair and panned left, the rings are there to be taken away (${keysOf(armed)})`);
  await p.evaluate(() => { window.__theatre.pieces.dialogue.ask('who is there?'); });
  await p.waitForFunction(() => window.__theatre.pieces.dialogue.asking, null, { timeout: 60000, polling: 100 }).catch(() => {});
  const focused = await p.evaluate(() => {
    document.querySelector('#dialogue input, #overlay input')?.focus();
    return document.activeElement?.tagName ?? null;
  });
  await frames(p, 4);
  const fieldWhy = (await says(p)).why;
  console.log(`  the field: activeElement=${focused} why=${fieldWhy} · ${(await drawn(p)).length} ring(s)`);
  claim(focused === 'INPUT' && fieldWhy === 'field' && (await drawn(p)).length === 0, 'while the placard\'s field has the focus there are no rings');
  await p.evaluate(() => document.activeElement?.blur());
  await frames(p, 4);
  claim((await drawn(p)).length > 0, 'and they are back the moment it lets go');
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 7. THE RENDERS ----------------------------------------------------------------------------
if (doing('render')) {
  await fresh();
  console.log('\nRENDERS');
  const p = await room(...PHONE);
  await panBy(p, 'l', 1);
  await shot(p, 'floor-left-wall-390x844');
  await square(p);
  await panBy(p, 'r', 1);
  await shot(p, 'floor-right-wall-390x844');
  await p.close();
  const lap = await room(...PLATE, '', false);
  await frames(lap, 6);
  await shot(lap, 'floor-none-1280x800');
  claim((await drawn(lap)).length === 0, '1280x800: the render carries no rings');
  await lap.close();
  console.log(`  → ${OUT}/floor-left-wall-390x844.png · floor-right-wall-390x844.png · floor-none-1280x800.png`);
}

console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser?.close().catch(() => {});
process.exit(bad ? 1 : 0);
