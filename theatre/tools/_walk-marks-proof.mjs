#!/usr/bin/env node
// THE DRAWN MARK, PUT TO A WITNESS THAT IS NOT THE PIECE (src/pieces/walk-marks.js).
//
// The user: "choosing the fireplace, piano and book section on mobile is quite hard to do … it's
// actually where to tap on the phone. I think a drawn mark would be good."
//
// Nothing below asks walk.js whether it thinks a mark is in the picture. Every claim is put to a
// witness outside the piece:
//
//   the DOM       #marks' own canvases and their getBoundingClientRect — what is actually on the
//                 glass, at what size, in what position. A piece can say anything; a node cannot.
//   the ARBITER   props.switches.at(x, y) at the CENTRE OF EVERY MARK: the room's own pointer test,
//                 asked whether the thing under the mark is the thing the mark promises. This is
//                 the claim that matters — a mark that lies about what is under it is worse than
//                 no mark at all.
//   a real TAP    page.touchscreen.tap at a measured mark, through the arbiter, with no api called
//   the CAMERA    camera.current / camera.moving / camera.pan
//   the DRAWING   /tmp/marks/*.png at 390x844 and 1280x800
//
//   BASE=http://127.0.0.1:8743 node tools/_walk-marks-proof.mjs
//   BASE=… node tools/_walk-marks-proof.mjs --only cursor,frame --out /tmp/marks
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

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
// what each mark's key is allowed to be answered by, when the arbiter is asked at its centre. The
// door leaf is the one mark with no switch of its own: standing at the doorway the place's hotspot
// is disabled and walk.js's own window listener opens the leaf, so the arbiter rightly says nobody.
const PROMISES = { fireplace: 'walk-fireplace', doorway: 'walk-doorway', case: 'walk-case', piano: 'walk-piano', table: 'walk-table', grate: 'fine', keys: 'piano-keys', book: 'table-book', door: null };
// every switch in the room that is an EGG. None of these may ever carry a mark.
const EGGS = ['cat', 'radio', 'wine', 'fuse', 'vortex', 'vase', 'rain', 'dark', 'peep', 'deck', 'cross', 'globe', 'droste', 'konami'];
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

// TOUCH is the whole point of this piece, so the phone pages are opened with `hasTouch` and the
// rule is left to answer for itself. Measured under this same emulation (tools/_probe-pointer.mjs):
// hasTouch gives any-pointer:fine false / pointer:coarse true, and a plain page gives the reverse.
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
  await frames(p, 3);
};
const rest = async (p) => {
  await p.waitForFunction(() => Math.abs(window.__theatre.pieces.camera.pan - window.__theatre.pieces.camera.panTarget) < 1e-3, null, { timeout: 120000, polling: 200 }).catch(() => {});
  await frames(p, 3);
};
// THE WITNESS: what is actually on the glass, read off the nodes and not off the piece.
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
const says = (p) => p.evaluate(() => { const M = window.__theatre.pieces.walk.marks; return { shown: M.shown, why: M.why, kind: M.kind, size: M.size, cursorless: M.cursorless, forced: M.forced }; });
const asks = (p, x, y) => p.evaluate(([px, py]) => window.__theatre.pieces.props.switches.at(px, py), [x, y]);
const placeBox = (p, n) => p.evaluate((k) => window.__theatre.pieces.walk.box(k), n);
const where = (p) => p.evaluate(() => ({ at: window.__theatre.pieces.walk.at, shot: window.__theatre.pieces.camera.current, pan: +window.__theatre.pieces.camera.pan.toFixed(3) }));
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png` });
const chev = (p) => p.evaluate(() => window.__theatre.pieces.camera.panBoxes);
// A tap on a chevron, `times` of them. The WAIT at the head of it is not politeness: the page sets
// `__theatreReady` on its third render and the pan is only armed once the camera is standing still
// on the resting plate with nobody holding it, which is a beat later — so a `panBy` issued the
// instant the page says it is ready finds no chevrons, clicks nothing, and quietly reports a room
// with no marks in it because it is still looking at the back wall.
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
const keysOf = (ms) => ms.map((m) => m.key).sort().join(',') || '—';
const ok = (b) => (b ? '✓' : '✗');
let bad = 0;
const claim = (b, text) => {
  if (!b) bad++;
  console.log(`   ${ok(b)} ${text}`);
};

// ---- 1. WHICH WINDOWS ARE MARKED AT ALL --------------------------------------------------------
// The rule is «no fine pointer anywhere in this window», not «the primary pointer is coarse»: a
// touchscreen laptop and a tablet with a trackpad both have a cursor doing the telling already.
if (doing('cursor')) {
  await fresh();
  console.log('\nCURSOR — a laptop keeps the cursor as its affordance and gets no marks');
  // the four media queries themselves, read off each window, so the rule can be checked against
  // what the browser actually says rather than against what the piece concluded from it
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
  await panBy(lap, 'l', 0);
  const lapSays = await says(lap);
  const lapDrawn = await drawn(lap);
  console.log(`  1280x800 mouse   cursorless=${lapSays.cursorless} why=${lapSays.why} · ${lapDrawn.length} mark(s) on the glass`);
  claim(lapSays.cursorless === false && lapDrawn.length === 0, '1280x800 with a mouse: no marks anywhere in the room');
  await shot(lap, 'laptop-none-1280x800');
  await lap.close();

  const forced = await room(...PLATE, '&marks=1', false);
  const fSays = await says(forced);
  const fDrawn = await drawn(forced);
  console.log(`  1280x800 ?marks=1  forced=${fSays.forced} why=${fSays.why} · ${fDrawn.length} mark(s): ${keysOf(fDrawn)}`);
  claim(fSays.forced && fDrawn.length > 0, '?marks=1 forces them on for a tool on any window');
  await forced.close();

  const ph = await room(...PHONE);
  const pSays = await says(ph);
  console.log(`  390x844 touch    cursorless=${pSays.cursorless} kind=${pSays.kind} size=${pSays.size?.d}px pen=${pSays.size?.pen?.toFixed(2)}`);
  claim(pSays.cursorless === true, '390x844 with touch and no mouse: the room marks itself');
  claim(pSays.size?.d >= 28 && pSays.size?.d <= 36, `the mark is ${pSays.size?.d} css px, inside the 28–36 a thumb wants`);
  await ph.close();
}

// ---- 2. WHAT IS MARKED, AND WHAT THE ARBITER SAYS IS UNDER IT ----------------------------------
if (doing('frame')) {
  await fresh();
  console.log('\nFRAME — one mark per place whose object is in the picture, and nothing else');
  const p = await room(...PHONE);
  for (const [label, side, taps] of [['square to the back wall', 'l', 0], ['panned hard left', 'l', 2], ['one tap left', 'l', 1], ['panned hard right', 'r', 2]]) {
    await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
    await frames(p, 3);
    if (taps) await panBy(p, side, taps);
    else await rest(p);
    const ms = await drawn(p);
    const boxes = {};
    for (const n of PLACES) boxes[n] = await placeBox(p, n);
    const onFrame = PLACES.filter((n) => {
      const b = boxes[n];
      if (!b) return false;
      return Math.min(b.x + b.w, 390) - Math.max(b.x, 0) > 0 && Math.min(b.y + b.h, 844) - Math.max(b.y, 0) > 0;
    });
    console.log(`  ${label.padEnd(24)} on the frame: ${onFrame.join(' ') || 'nothing'}  ·  marked: ${keysOf(ms)}`);
    // every mark is answered by the thing it promises
    for (const m of ms) {
      const who = await asks(p, m.cx, m.cy);
      claim(who === PROMISES[m.key], `${label}: the ${m.key} mark at ${m.cx},${m.cy} is answered by ${who ?? 'nobody'} (promised ${PROMISES[m.key] ?? 'nobody'})`);
      claim(!EGGS.includes(String(who)), `${label}: the ${m.key} mark does not stand on an egg`);
    }
    // …and nothing is marked that is not on the frame
    for (const m of ms) claim(onFrame.includes(m.key) || !PLACES.includes(m.key), `${label}: ${m.key} is marked and its object is on the frame`);
    const missed = PLACES.filter((n) => !onFrame.includes(n) && ms.some((m) => m.key === n));
    claim(missed.length === 0, `${label}: no place off the frame carries a mark (${missed.join(',') || 'none'})`);
    if (taps === 2 && side === 'l') {
      claim(ms.some((m) => m.key === 'fireplace'), 'panned hard left the FIREPLACE is marked');
      await shot(p, 'left-wall-panned-390x844');
    }
    if (taps === 2 && side === 'r') await shot(p, 'right-wall-panned-390x844');
  }
  // NO EGG IS EVER MARKED, said the other way about: the keys the layer will ever draw.
  const keys = await p.evaluate(() => window.__theatre.pieces.walk.marks.keys());
  claim(keys.every((k) => k in PROMISES), `every mark key belongs to a place or to the one thing to act on there (${keys.join(',') || 'none'})`);
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 3. THE MARK FOLLOWS THE OBJECT THROUGH A PAN ----------------------------------------------
// Struck at the place's LIVE box every drawing, so what is proved is where it sits INSIDE that box
// — which must not move when the room turns under it.
if (doing('pan')) {
  await fresh();
  console.log('\nPAN — the mark is struck on the object, not on the window');
  const p = await room(...PHONE);
  const seen = [];
  for (const taps of [1, 2]) {
    await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
    await frames(p, 3);
    await panBy(p, 'l', taps);
    const ms = await drawn(p);
    for (const m of ms.filter((x) => PLACES.includes(x.key))) {
      const b = await placeBox(p, m.key);
      if (!b) continue;
      const u = (m.cx - b.x) / b.w, v = (m.cy - b.y) / b.h;
      seen.push({ taps, key: m.key, u, v, pan: (await where(p)).pan });
      console.log(`  pan ${(await where(p)).pan.toFixed(2)}  ${m.key.padEnd(10)} mark at ${m.cx},${m.cy} · box ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)} · inside it at u=${u.toFixed(3)} v=${v.toFixed(3)}`);
      claim(u >= 0 && u <= 1 && v >= 0 && v <= 1, `${m.key}: the mark is inside the place's own projected box after the pan`);
    }
  }
  claim(seen.length > 0, 'at least one place carried a mark through the pan');
  // and the marks are OFF while the pan is still drifting
  await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
  await frames(p, 3);
  const b = await chev(p);
  await p.mouse.click(b.l.x + b.l.w / 2, b.l.y + b.l.h / 2);
  await frames(p, 1);
  const mid = await says(p);
  const midDrawn = await drawn(p);
  console.log(`  one drawing after the chevron: why=${mid.why} · ${midDrawn.length} mark(s)`);
  claim(mid.why === 'panning' && midDrawn.length === 0, 'the marks go out while the room is still turning');
  await rest(p);
  const after = await drawn(p);
  claim(after.length > 0, `and come back when it settles (${keysOf(after)})`);
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 4. A REAL TAP ON A MARK WALKS THERE -------------------------------------------------------
if (doing('tap')) {
  await fresh();
  console.log('\nTAP — a thumb on the mark, through the arbiter, with nothing called');
  const p = await room(...PHONE);
  await panBy(p, 'l', 2);
  const ms = await drawn(p);
  const fire = ms.find((m) => m.key === 'fireplace') ?? ms.find((m) => PLACES.includes(m.key));
  claim(!!fire, `there is a mark to tap (${keysOf(ms)})`);
  if (fire) {
    await p.touchscreen.tap(fire.cx, fire.cy);
    await settle(p);
    const w = await where(p);
    console.log(`  tapped the ${fire.key} mark at ${fire.cx},${fire.cy} → walk.at=${w.at} shot=${w.shot}`);
    claim(w.at === fire.key, `a tap on the ${fire.key} mark walks the visitor to the ${fire.key}`);
    // AND THE MARK'S OWN 44 px THUMB BOX, not just its middle: the corner of it, 15 px out
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
    await panBy(p, 'l', 2);
    const ms2 = await drawn(p);
    const f2 = ms2.find((m) => m.key === fire.key);
    if (f2) {
      const tap = await p.evaluate((k) => window.__theatre.pieces.walk.marks.tap(k), fire.key);
      console.log(`  the mark's thumb box: ${tap.w}x${tap.h} at ${tap.x.toFixed(0)},${tap.y.toFixed(0)} (the 32 px mark grown to 44)`);
      claim(tap.w >= 44 && tap.h >= 44, `the mark's tap target is a full thumb (${tap.w}x${tap.h})`);
      const ex = Math.round(tap.x + 4), ey = Math.round(tap.y + 4);
      const who = await asks(p, ex, ey);
      claim(who === `walk-${fire.key}`, `a thumb landing on the corner of the mark (${ex},${ey}) is still the ${fire.key} (${who ?? 'nobody'})`);
    }
  }
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 5. AT A PLACE: THE ONE THING TO DO THERE --------------------------------------------------
if (doing('place')) {
  await fresh();
  console.log('\nAT A PLACE — the mark moves to the one thing there is to act on');
  for (const [place, key, thing] of [['table', 'book', 'the book on the reading table'], ['piano', 'keys', 'the keys'], ['doorway', 'door', 'the door leaf'], ['fireplace', 'grate', 'the grate'], ['case', null, 'nothing — the TAROT spine is the table\'s book now']]) {
    const p = await room(...PHONE);
    await p.evaluate((n) => window.__theatre.pieces.walk.go(n), place);
    await settle(p);
    const ms = await drawn(p);
    const mine = ms.find((m) => m.key === key);
    console.log(`  at the ${place.padEnd(10)} marks: ${keysOf(ms)}`);
    if (key) {
      claim(!!mine, `at the ${place}: ${thing} is marked`);
      if (mine) {
        const who = await asks(p, mine.cx, mine.cy);
        claim(who === PROMISES[key], `at the ${place}: the arbiter answers ${who ?? 'nobody'} under the mark (promised ${PROMISES[key] ?? 'nobody'})`);
      }
      claim(!ms.some((m) => m.key === place), `at the ${place}: the place itself is no longer marked`);
    } else {
      claim(!ms.some((m) => !PLACES.includes(m.key)), `at the ${place}: ${thing}`);
    }
    // the two the brief asks to see worked
    if (place === 'table' && mine) {
      await shot(p, 'table-book-390x844');
      await p.touchscreen.tap(mine.cx, mine.cy);
      await p.waitForFunction(() => window.__theatre.pieces.walk.books.showing, null, { timeout: 60000, polling: 100 }).catch(() => {});
      const open = await p.evaluate(() => window.__theatre.pieces.walk.books.showing);
      claim(!!open, 'a tap on the book mark opens the book');
      await frames(p, 6); // the mark layer is redrawn from update(); the wait above lands mid-frame
      const gone = await drawn(p);
      const why = (await says(p)).why;
      // THE WORD IS `held` AND NOT `book`, AND THAT IS THE ROOM ANSWERING HONESTLY. The book takes
      // the camera as it opens (its own hold, walk-book.js), and `blocked()` asks about the camera
      // before it asks whether a book is up — so the first true thing it finds is the hold. What the
      // claim is about is the marks, and they are gone for either reason.
      claim(gone.length === 0 && ['book', 'held', 'moving'].includes(why), `and the marks go out while it stands open (why=${why}, ${gone.length} on the glass)`);
      await p.evaluate(() => window.__theatre.pieces.walk.books.close());
      await p.waitForFunction(() => !window.__theatre.pieces.walk.books.showing && !window.__theatre.pieces.camera.moving && window.__theatre.pieces.camera.holding === 'reading', null, { timeout: 120000, polling: 150 }).catch(() => {});
      await frames(p, 6);
      const backAgain = await drawn(p);
      claim(backAgain.length > 0, `…and come back when it is shut (${keysOf(backAgain)})`);
    }
    if (place === 'piano' && mine) await shot(p, 'piano-keys-390x844');
    if (p.__errors.length) {
      console.log(`   errors: ${p.__errors.join(' | ')}`);
      bad++;
    }
    await p.close();
  }
}

// ---- 6. WHEN THE ROOM TAKES THEM BACK ----------------------------------------------------------
if (doing('hide')) {
  await fresh();
  console.log('\nHIDDEN — the room is doing something, so it stops pointing at itself');
  const p = await room(...PHONE);
  await frames(p, 6); // the chevrons are mounted on the first update; `panBy` needs them to exist
  await panBy(p, 'l', 2);
  const before = await drawn(p);
  claim(before.length > 0, `idle, the room carries marks (${keysOf(before)})`);
  // …while a walk is running. The call is NOT awaited: `go()` returns the promise of the whole
  // 1.5 s dolly, and an evaluate that returns it would not come back until the visitor had arrived.
  await p.evaluate(() => {
    window.__theatre.pieces.walk.go('fireplace');
  });
  await frames(p, 2);
  const mid = await drawn(p);
  const midWhy = (await says(p)).why;
  claim(mid.length === 0 && (midWhy === 'moving' || midWhy === 'panning'), `while the walk runs there are no marks (why=${midWhy})`);
  await settle(p);
  const atPlace = await drawn(p);
  claim(atPlace.length > 0, `and they are back when the visitor arrives (${keysOf(atPlace)})`);
  // …while the fire has the room (the grate's own click, which is what its mark promises)
  const grate = atPlace.find((m) => m.key === 'grate');
  if (grate) {
    await p.touchscreen.tap(grate.cx, grate.cy);
    await p.waitForFunction(() => window.__theatre.pieces.props.fine.burning, null, { timeout: 60000, polling: 100 }).catch(() => {});
    const lit = await p.evaluate(() => window.__theatre.pieces.props.fine.burning);
    const gone = await drawn(p);
    const why = (await says(p)).why;
    claim(lit && gone.length === 0 && why === 'fire', `a tap on the grate mark lights the fire, and the fire takes the room (burning=${lit}, why=${why})`);
    await p.evaluate(() => window.__theatre.pieces.props.fine.set(false));
    await frames(p, 4);
    claim((await drawn(p)).length > 0, 'and the marks come back when it is out');
  }
  await p.evaluate(() => window.__theatre.pieces.walk.back());
  await settle(p);
  // …while the placard's field has the focus. The room is turned hard left again first: at the
  // chair, square to the back wall, a phone has NO place on its frame and therefore no marks, so a
  // field test from there would prove nothing by finding none.
  await panBy(p, 'l', 2);
  const armed = await drawn(p);
  claim(armed.length > 0, `back at the chair and panned left, the marks are there to be taken away (${keysOf(armed)})`);
  await p.evaluate(() => { window.__theatre.pieces.dialogue.ask('who is there?'); });
  await p.waitForFunction(() => window.__theatre.pieces.dialogue.asking, null, { timeout: 60000, polling: 100 }).catch(() => {});
  const focused = await p.evaluate(() => {
    const el = document.querySelector('#dialogue input, #overlay input');
    el?.focus();
    return { tag: document.activeElement?.tagName ?? null, asking: window.__theatre.pieces.dialogue.asking };
  });
  await frames(p, 3);
  const fieldWhy = (await says(p)).why;
  const fieldDrawn = await drawn(p);
  console.log(`  the field: asking=${focused.asking} activeElement=${focused.tag} why=${fieldWhy} · ${fieldDrawn.length} mark(s)`);
  claim(focused.tag === 'INPUT' && fieldWhy === 'field' && fieldDrawn.length === 0, 'while the placard\'s field has the focus there are no marks');
  await p.evaluate(() => document.activeElement?.blur());
  await frames(p, 3);
  claim((await drawn(p)).length > 0, 'and they are back the moment it lets go');
  if (p.__errors.length) {
    console.log(`   errors: ${p.__errors.join(' | ')}`);
    bad++;
  }
  await p.close();
}

// ---- 7. THE THREE VARIANTS, SIDE BY SIDE -------------------------------------------------------
// The same two frames at 390x844, drawn three times with `?mark=`, and the crops cut round the same
// mark each time so the three can be looked at over identical ink.
//
// TWO frames and not one, because the thing that separates them only shows on one of them. Over the
// chimney breast every variant is legible — it is white plaster, and a paper pip on paper is no pip
// at all. The TALL CASE panned one tap left is the busiest drawing in the room (forty spines, their
// shadows and the boards between them) and it is where camera-pan.js's chevrons failed the same
// test last round. A control is judged at its worst frame, not its best.
if (doing('variants')) {
  await fresh();
  console.log('\nVARIANTS — ring · caret · bare, over the plaster and over the case');
  const crops = { fireplace: [], case: [] };
  for (const kind of ['ring', 'caret', 'bare']) {
    const p = await room(...PHONE, `&mark=${kind}`);
    for (const [key, taps] of [['fireplace', 2], ['case', 1]]) {
      await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
      await frames(p, 3);
      await panBy(p, 'l', taps);
      const ms = await drawn(p);
      const m = ms.find((x) => x.key === key);
      if (key === 'fireplace') await shot(p, `variant-${kind}-390x844`);
      console.log(`  ${kind.padEnd(6)} ${taps} tap(s) left · ${ms.length} mark(s): ${keysOf(ms)}${m ? ` · ${key} at ${m.cx},${m.cy}` : ` · no ${key} mark`}`);
      claim(!!m, `${kind}: the variant draws over the ${key}`);
      if (!m) continue;
      const half = 110;
      const x = Math.max(0, Math.min(390 - half * 2, m.cx - half)), y = Math.max(0, Math.min(844 - half * 2, m.cy - half));
      crops[key].push({ kind, buf: await p.screenshot({ clip: { x, y, width: half * 2, height: half * 2 } }) });
    }
    await p.close();
  }
  for (const [key, list] of Object.entries(crops)) {
    if (list.length !== 3) continue;
    const W = 220, H = 220, GAP = 12;
    await sharp({ create: { width: W * 3 + GAP * 4, height: H + GAP * 2, channels: 3, background: { r: 13, g: 10, b: 8 } } })
      .composite(list.map((c, i) => ({ input: c.buf, left: GAP + i * (W + GAP), top: GAP })))
      .png()
      .toFile(`${OUT}/variants-${key}.png`);
    console.log(`  → ${OUT}/variants-${key}.png  (${list.map((c) => c.kind).join(' · ')}, left to right)`);
  }
}

// ---- 8. THE RENDERS THE BRIEF ASKS FOR ---------------------------------------------------------
if (doing('render')) {
  await fresh();
  console.log('\nRENDERS');
  const p = await room(...PHONE);
  await panBy(p, 'l', 2);
  await shot(p, 'chosen-left-wall-390x844');
  await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
  await frames(p, 3);
  await panBy(p, 'r', 2);
  await shot(p, 'chosen-right-wall-390x844');
  for (const place of ['table', 'piano']) {
    await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
    await p.evaluate((n) => window.__theatre.pieces.walk.go(n), place);
    await settle(p);
    await shot(p, `chosen-${place}-390x844`);
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
  }
  await p.close();
  const lap = await room(...PLATE, '', false);
  await shot(lap, 'chosen-none-1280x800');
  claim((await drawn(lap)).length === 0, '1280x800: the render carries no marks');
  await lap.close();
  console.log(`  → ${OUT}/`);
}

console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser?.close().catch(() => {});
process.exit(bad ? 1 : 0);
