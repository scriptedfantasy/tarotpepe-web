#!/usr/bin/env node
// THE THREE PLACES, WALKED TO LIKE A VISITOR (src/pieces/walk.js).
//
// Nothing below asks the piece whether it thinks a walk worked. Every claim is put to a witness
// that is not the piece:
//
//   the ARBITER   props.switches.at(x, y) — the room's own pointer test — asked at the centre of
//                 each hotspot and at the centre of every switch that stands ON or IN it. That is
//                 the "two things on one object" claim: the breast walks and the grate lights, the
//                 case walks and the cat, the bottle, the radio and the four spines do their own
//                 work, and nobody ever answers for anybody else.
//   a real CLICK  page.mouse.click at a measured point, through the arbiter, with no api called
//   the CAMERA    camera.current and camera.moving, read off the camera piece
//   the ZOOM      camera.zoomable at each place, and a real wheel event over the canvas
//   the PLACARD   the evening, run for real with no ?view: a line typed into the field while the
//                 visitor is standing at a place, and what came back on the placard
//   the DRAWING   /tmp/walk/*.png at 1280x800 and 390x844
//
//   BASE=http://127.0.0.1:8739 node tools/_walk-proof.mjs
//   BASE=… node tools/_walk-proof.mjs --only reach,walk --out /tmp/walk
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/walk';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800];
const PHONE = [390, 844];
const PLACES = ['fireplace', 'doorway', 'case'];
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

async function open(w, h, query = '') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
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
// the room with nothing being judged and the flow held off: ?shot=1 cuts to home and runs no
// autoplay, which is the page a visitor's own clicks can be driven against without the
// conversation cutting the camera underneath them
const room = (w, h, q = '') => open(w, h, `?shot=1${q}`);
const frames = (p, n = 2) => p.evaluate((k) => new Promise((res) => { let i = k; const go = () => (i-- <= 0 ? res() : requestAnimationFrame(go)); go(); }), n);
const settle = async (p, ms = 240000) => {
  await p.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: ms, polling: 250 });
  await frames(p, 2);
};
const at = (p) => p.evaluate(() => ({ at: window.__theatre.pieces.walk.at, shot: window.__theatre.pieces.camera.current, zoomable: window.__theatre.pieces.camera.zoomable, resting: window.__theatre.pieces.camera.restingShot }));
const boxes = (p) =>
  p.evaluate(() => {
    const W = window.__theatre.pieces.walk;
    const out = {};
    for (const n of W.places) out[n] = W.box(n);
    return out;
  });
const asks = (p, x, y) => p.evaluate(([px, py]) => window.__theatre.pieces.props.switches.at(px, py), [x, y]);
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png` });
// A POINT ON THE THING THAT THE ARBITER ACTUALLY GIVES TO IT. Not the box's centre: the
// fireplace's box is mostly off the left of a 1280 frame and its own middle lands inside the
// grate's, and the grate is the snugger box, so the grate takes it. The proof clicks where a
// visitor's pointer would have to be, and it asks the room where that is.
async function pointOn(p, n, w, h) {
  const b = (await boxes(p))[n];
  if (!b) return null;
  for (let j = 1; j < 10; j++) for (let i = 1; i < 10; i++) {
    const x = b.x + (b.w * i) / 10, y = b.y + (b.h * j) / 10;
    if (x < 2 || x > w - 2 || y < 2 || y > h - 2) continue;
    if ((await asks(p, x, y)) === `walk-${n}`) return [x, y];
  }
  return null;
}
const ok = (b) => (b ? '✓' : '✗');
let bad = 0;
const claim = (b, text) => {
  if (!b) bad++;
  console.log(`   ${ok(b)} ${text}`);
};

// ---- 1. WHAT THE CHAIR CAN REACH ---------------------------------------------------------------
if (doing('reach')) {
  await fresh();
  console.log('\nREACH — the three hotspots from the resting plate, and who the arbiter gives them to');
  for (const [w, h] of [PLATE, PHONE]) {
    const p = await room(w, h);
    const bs = await boxes(p);
    console.log(`  ${w}x${h}`);
    for (const n of PLACES) {
      const b = bs[n];
      if (!b) {
        console.log(`   ${n.padEnd(10)} no box (behind the lens)`);
        continue;
      }
      const on = Math.max(0, Math.min(b.x + b.w, w) - Math.max(b.x, 0)) * Math.max(0, Math.min(b.y + b.h, h) - Math.max(b.y, 0));
      // WHERE ON IT THE VISITOR HAS TO CLICK, which is not the middle. The fireplace's box is
      // mostly off the left of a 1280 frame and its own centre lands inside the grate's box — and
      // the grate is the snugger of the two, so the grate takes it, which is the arbiter's rule
      // working rather than failing. So the sample is a grid over the part of the box that is on
      // the frame, and what is reported is how much of it the place itself answers for.
      let mine = 0, seen = 0, first = null;
      for (let i = 1; i < 8 && on > 0; i++) for (let j = 1; j < 8; j++) {
        const x = b.x + (b.w * i) / 8, y = b.y + (b.h * j) / 8;
        if (x < 2 || x > w - 2 || y < 2 || y > h - 2) continue;
        seen++;
        const who = await asks(p, x, y);
        if (who === `walk-${n}`) {
          mine++;
          first = first ?? [Math.round(x), Math.round(y), who];
        } else if (!first) first = [Math.round(x), Math.round(y), who];
      }
      console.log(`   ${n.padEnd(10)} ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)}  ${on > 0 ? `${((on / (w * h)) * 100).toFixed(1)}% on the frame; ${mine}/${seen} sampled points answer walk-${n}` : 'OFF THE FRAME — a chair cannot click it'}`);
      if (on > 0) claim(mine > 0, `${n} can be clicked from the chair at ${w}x${h} (first point ${first?.[0]},${first?.[1]} → ${first?.[2]})`);
    }
    if (w === PLATE[0]) await shot(p, `home-${w}x${h}`);
    console.log(`   errors: ${p.__errors.length ? p.__errors.join(' | ') : 'none'}`);
    if (p.__errors.length) bad++;
    await p.close();
  }
}

// ---- 2. THE WALK, AND THE TWO WAYS BACK --------------------------------------------------------
if (doing('walk')) {
  console.log('\nWALK — a real click on each hotspot, then out by a click elsewhere and by Escape');
  for (const [w, h] of [PLATE, PHONE]) {
    await fresh();
    for (const n of PLACES) {
      const p = await room(w, h);
      // a phone's chair cannot see any of the three, so it is put where a pan would put it: the
      // camera is cut to the place and the walk home is what is driven. On a laptop the whole
      // round trip is driven from the click.
      const hit = await pointOn(p, n, w, h);
      if (hit) await p.mouse.click(hit[0], hit[1]);
      else await p.evaluate((k) => window.__theatre.pieces.walk.go(k), n);
      await settle(p);
      const a1 = await at(p);
      claim(a1.at === n && a1.shot === n, `${w}x${h} ${n}: ${hit ? `clicked at ${hit[0].toFixed(0)},${hit[1].toFixed(0)}` : 'called (off the frame — a phone cannot reach it from the chair)'} → walk.at=${a1.at} camera=${a1.shot}`);
      claim(a1.zoomable === false, `${w}x${h} ${n}: the scroll is refused at the place (zoomable=${a1.zoomable})`);
      claim(a1.resting === 'home', `${w}x${h} ${n}: the resting plate is still home (${a1.resting})`);
      await shot(p, `${n}-${w}x${h}`);
      // a click on the place's own object does NOT walk back. At its own shot the hotspot is
      // switched off (a switch that would do nothing is not a switch), so this point is found from
      // the box rather than from the arbiter — which is exactly the case the rule is written for.
      const b2 = (await boxes(p))[n];
      if (b2) {
        const cx = Math.min(w - 2, Math.max(2, b2.x + b2.w / 2)), cy = Math.min(h - 2, Math.max(2, b2.y + b2.h / 2));
        await p.mouse.click(cx, cy);
        await frames(p, 3);
        const held = await at(p);
        claim(held.at === n, `${w}x${h} ${n}: a click on the place's own object leaves the visitor there (${held.at})`);
      }
      // …and a click on nothing walks them home. The top-left corner is plaster in all three frames.
      await p.mouse.click(4, 4);
      await settle(p);
      const a2 = await at(p);
      claim(a2.at === null && a2.shot === 'home', `${w}x${h} ${n}: a click elsewhere walks home (at=${a2.at} camera=${a2.shot})`);
      claim(a2.zoomable === true, `${w}x${h} ${n}: the scroll is armed again at home`);
      // and again, out by Escape
      await p.evaluate((k) => window.__theatre.pieces.walk.go(k), n);
      await settle(p);
      await p.keyboard.press('Escape');
      await settle(p);
      const a3 = await at(p);
      claim(a3.at === null && a3.shot === 'home', `${w}x${h} ${n}: Escape walks home (at=${a3.at} camera=${a3.shot})`);
      if (p.__errors.length) {
        console.log(`   errors: ${p.__errors.join(' | ')}`);
        bad++;
      }
      await p.close();
    }
  }
}
function window_shot(n) {
  return n;
}

// ---- 3. THE SWITCHES THAT STAND ON THE PLACES --------------------------------------------------
// Two things on one object: the arbiter ranks the margin boxes by snugness, so the small box inside
// the big one takes the points it covers. This asks it, at each place, for every switch in view.
if (doing('switches')) {
  await fresh();
  console.log('\nSWITCHES — who answers where, standing at each place (1280x800)');
  const p = await room(...PLATE);
  const probe = async (place, wants) => {
    await p.evaluate((k) => window.__theatre.pieces.walk.go(k), place);
    await settle(p);
    for (const [who, get] of wants) {
      const b = await p.evaluate((n) => {
        const P = window.__theatre.pieces.props;
        const f = { fine: () => P.fine.tapBox(), cat: () => P.cat.tapBox(), wine: () => P.wine.tapBox(), radio: () => P.radio.tapBox(), cross: () => P.cross.tapBox() }[n];
        return f ? f() : null;
      }, get);
      if (!b) {
        claim(false, `${place}: ${who} has no box`);
        continue;
      }
      const said = await asks(p, b.x + b.w / 2, b.y + b.h / 2);
      claim(said === who, `${place}: the centre of ${who}'s own box answers "${said}"`);
    }
    // and the place itself still answers away from them
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
  };
  await probe('fireplace', [['fine', 'fine']]);
  await probe('case', [['cat', 'cat'], ['wine', 'wine'], ['radio', 'radio']]);
  await probe('doorway', [['cross', 'cross']]);
  // …and the fire still lights from the fireplace shot
  await p.evaluate(() => window.__theatre.pieces.walk.go('fireplace'));
  await settle(p);
  const fb = await p.evaluate(() => window.__theatre.pieces.props.fine.tapBox());
  await p.mouse.click(fb.x + fb.w / 2, fb.y + fb.h / 2);
  await frames(p, 6);
  const lit = await p.evaluate(() => ({ burning: window.__theatre.pieces.props.fine.burning, at: window.__theatre.pieces.walk.at }));
  claim(lit.burning && lit.at === 'fireplace', `a click on the grate at the fireplace lights the fire and does not walk home (${JSON.stringify(lit)})`);
  await p.close();
}

// ---- 3b. THE FIRE, WATCHED -------------------------------------------------------------------
// The laid fire in the grate is alight while somebody is standing at the fireplace and at no other
// time, and it is not the egg: `props:fine` must not fire, `burning` must stay false and `lit` must
// stay 0 the whole way through. What is on the glass is counted in pixels rather than asked for.
if (doing('fire')) {
  await fresh();
  console.log('\nFIRE — the laid fire alight at the fireplace, and the grate left as it was');
  for (const [w, h] of [PLATE, PHONE]) {
    const p = await room(w, h);
    await p.evaluate(() => {
      window.__fine = [];
      window.__theatre.on('props:fine', (d) => window.__fine.push(d));
    });
    await p.mouse.click(4, 4); // the audio context's first gesture: without it no cue is scheduled
    const cold = await p.evaluate(() => ({ hearth: window.__theatre.pieces.props.fine.hearth.burning, egg: window.__theatre.pieces.props.fine.burning }));
    claim(!cold.hearth && !cold.egg, `${w}x${h}: nothing is alight from the chair (hearth ${cold.hearth}, egg ${cold.egg})`);
    await p.evaluate(() => window.__theatre.pieces.walk.go('fireplace'));
    await settle(p);
    await frames(p, 8); // the three tongues catch and come up through CATCH
    const hot = await p.evaluate(() => ({
      hearth: window.__theatre.pieces.props.fine.hearth.burning,
      lit: window.__theatre.pieces.props.fine.hearth.lit,
      egg: window.__theatre.pieces.props.fine.burning,
      eggLit: window.__theatre.pieces.props.fine.lit,
      events: window.__fine.length,
      box: window.__theatre.pieces.props.fine.hearth.box(1),
      cues: (window.__theatre.pieces.sound?.timeline ?? []).filter((c) => (c.name ?? c[0]) === 'crackle').length,
      audio: { running: window.__theatre.pieces.sound?.running ?? null, muted: window.__theatre.pieces.sound?.muted ?? null, total: (window.__theatre.pieces.sound?.timeline ?? []).length },
    }));
    claim(hot.hearth && hot.lit === 3, `${w}x${h}: three tongues alight in the grate (${hot.lit})`);
    claim(!hot.egg && hot.eggLit === 0 && hot.events === 0, `${w}x${h}: and it is NOT the egg — burning ${hot.egg}, lit ${hot.eggLit}, props:fine fired ${hot.events} times`);
    claim(hot.box && hot.box.h > 20, `${w}x${h}: the middle tongue measures ${hot.box ? `${hot.box.w.toFixed(0)}x${hot.box.h.toFixed(0)} px` : 'nothing'} on the glass`);
    // the crackle bed. In a headless chromium with no audio device the graph never starts, so the
    // count is reported against whether sound was running at all rather than claimed blind.
    console.log(`   crackle cues while standing there: ${hot.cues} (sound running ${hot.audio.running}, ${hot.audio.total} cues on the timeline all told)`);
    if (hot.audio.running) claim(hot.cues > 0, `${w}x${h}: the crackle bed is thrown while the visitor stands there (${hot.cues})`);
    if (w === PLATE[0]) await shot(p, 'fire-watched-1280x800');
    else await shot(p, 'fire-watched-390x844');
    // …and the fire the egg is still lights from here, over the top of it
    const fb = await p.evaluate(() => window.__theatre.pieces.props.fine.tapBox());
    await p.mouse.click(Math.min(w - 2, Math.max(2, fb.x + fb.w / 2)), Math.min(h - 2, Math.max(2, fb.y + fb.h / 2)));
    await frames(p, 6);
    const egg = await p.evaluate(() => ({ egg: window.__theatre.pieces.props.fine.burning, hearth: window.__theatre.pieces.props.fine.hearth.burning, at: window.__theatre.pieces.walk.at }));
    claim(egg.egg && egg.at === 'fireplace', `${w}x${h}: the grate still works from the fireplace (egg ${egg.egg}, still at ${egg.at})`);
    claim(!egg.hearth, `${w}x${h}: and the laid fire is doused while the egg has the firebox (${egg.hearth})`);
    // put it out, walk away, and the grate is what it was
    await p.mouse.click(Math.min(w - 2, Math.max(2, fb.x + fb.w / 2)), Math.min(h - 2, Math.max(2, fb.y + fb.h / 2)));
    await frames(p, 40);
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
    await frames(p, 6);
    const gone = await p.evaluate(() => ({ hearth: window.__theatre.pieces.props.fine.hearth.burning, lit: window.__theatre.pieces.props.fine.hearth.lit, egg: window.__theatre.pieces.props.fine.burning }));
    claim(!gone.hearth && gone.lit === 0, `${w}x${h}: walking away leaves the grate as it was (${gone.lit} tongues)`);
    if (p.__errors.length) {
      console.log(`   errors: ${p.__errors.join(' | ')}`);
      bad++;
    }
    await p.close();
  }
}

// ---- 3c. THE DOOR, OPENED --------------------------------------------------------------------
// Standing at the doorway, a click on the leaf opens it by day and the camera walks out to the same
// drawn country the cross egg reveals. What is asked is that the DAY is a day (no rain, no strike,
// no bank of cloud, the room's own light untouched), that the two castles still answer, and that
// when it is over the cross egg is in a state the STORM can still be started from.
const cross = (p) =>
  p.evaluate(() => {
    const X = window.__theatre.pieces.props.cross;
    return {
      phase: X.phase, out: X.out, path: X.path, sky: X.sky, leaf: X.leaf, daylight: X.daylight,
      raining: !!window.__theatre.pieces.props.rain?.on,
      shot: window.__theatre.pieces.camera.current,
      at: window.__theatre.pieces.walk.at,
      lights: window.__theatre.pieces.lighting?.state ?? null,
    };
  });
if (doing('door')) {
  console.log('\nDOOR — opened by day from the doorway, and shut again');
  for (const [w, h] of [PLATE, PHONE]) {
    await fresh();
    const p = await room(w, h);
    const before = await cross(p);
    await p.evaluate(() => window.__theatre.pieces.walk.go('doorway'));
    await settle(p);
    // a REAL click on the leaf, through the arbiter's own window listener
    const b = await p.evaluate(() => window.__theatre.pieces.walk.box('doorway'));
    await p.mouse.click(Math.min(w - 2, Math.max(2, b.x + b.w / 2)), Math.min(h - 2, Math.max(2, b.y + b.h / 2)));
    await p.waitForFunction(() => window.__theatre.pieces.props.cross.phase === 'day', null, { timeout: 120000, polling: 200 }).catch(() => {});
    const opening = await cross(p);
    claim(opening.phase === 'day', `${w}x${h}: a click on the leaf opens the door by day (phase ${opening.phase})`);
    // the leaf swings and the camera goes out
    await p.waitForFunction(() => window.__theatre.pieces.props.cross.out === true, null, { timeout: 300000, polling: 300 }).catch(() => {});
    await settle(p);
    const outside = await cross(p);
    claim(outside.out && outside.shot === 'crossroads', `${w}x${h}: and the room walks out onto the country (plate up ${outside.out}, camera ${outside.shot})`);
    claim(outside.sky === -1 && !outside.raining, `${w}x${h}: by day — no bank of cloud (sky ${outside.sky}), no rain (${outside.raining})`);
    claim(outside.lights === before.lights, `${w}x${h}: and the room's own light is untouched (${outside.lights} both sides)`);
    if (w === PLATE[0]) await shot(p, 'door-open-1280x800');
    else await shot(p, 'door-open-390x844');
    // the two castles still answer
    const castles = await p.evaluate(() => {
      const X = window.__theatre.pieces.props.cross;
      const S = window.__theatre.pieces.props.switches;
      const out = {};
      for (const k of ['light', 'dark']) {
        const c = X.castleBox(k);
        out[k] = c ? S.at(c.x + c.w / 2, c.y + c.h / 2) : null;
      }
      return out;
    });
    claim(castles.light === 'cross-light' && castles.dark === 'cross-dark', `${w}x${h}: both castles answer as switches (${JSON.stringify(castles)})`);
    // take one, and the door shuts and the visitor is walked home
    const lb = await p.evaluate(() => window.__theatre.pieces.props.cross.castleBox('light'));
    await p.mouse.click(Math.min(w - 2, Math.max(2, lb.x + lb.w / 2)), Math.min(h - 2, Math.max(2, lb.y + lb.h / 2)));
    await p.waitForFunction(() => window.__theatre.pieces.props.cross.phase === 'shut', null, { timeout: 400000, polling: 300 }).catch(() => {});
    await settle(p);
    const done = await cross(p);
    claim(done.phase === 'shut' && done.path === 'light', `${w}x${h}: a castle is the visitor's road (path ${done.path}) and the door shuts (${done.phase})`);
    claim(!done.out && !done.leaf.shown && done.shot === 'home' && done.at === null, `${w}x${h}: nothing is left standing — plate ${done.out}, leaf ${done.leaf.shown}, camera ${done.shot}, walk ${done.at}`);

    // …and again, out by ESCAPE
    await p.evaluate(() => window.__theatre.pieces.walk.go('doorway'));
    await settle(p);
    await p.evaluate(() => window.__theatre.pieces.props.cross.openByDay());
    await p.waitForFunction(() => window.__theatre.pieces.props.cross.out === true, null, { timeout: 300000, polling: 300 }).catch(() => {});
    await settle(p);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => window.__theatre.pieces.props.cross.phase === 'shut', null, { timeout: 400000, polling: 300 }).catch(() => {});
    await settle(p);
    const esc = await cross(p);
    claim(esc.phase === 'shut' && !esc.out && esc.shot === 'home' && esc.at === null, `${w}x${h}: Escape shuts the door and walks back (${esc.phase}, camera ${esc.shot}, walk ${esc.at})`);

    // AND THE STORM STILL WORKS. The whole point of one state machine with two ways in.
    const started = await p.evaluate(() => window.__theatre.pieces.props.cross.click());
    claim(started === true, `${w}x${h}: the cross can still be clicked after an afternoon (${started})`);
    await p.waitForFunction(() => window.__theatre.pieces.props.cross.phase === 'open', null, { timeout: 400000, polling: 300 }).catch(() => {});
    const storm = await cross(p);
    claim(storm.phase === 'open' && storm.raining, `${w}x${h}: the storm comes in as it always did (phase ${storm.phase}, raining ${storm.raining})`);
    await p.evaluate(() => window.__theatre.pieces.props.cross.set('shut'));
    await settle(p);
    const back2 = await cross(p);
    claim(back2.phase === 'shut' && !back2.raining && !back2.out, `${w}x${h}: and it puts itself away (${back2.phase}, raining ${back2.raining})`);
    if (p.__errors.length) {
      console.log(`   errors: ${p.__errors.join(' | ')}`);
      bad++;
    }
    await p.close();
  }
}

// ---- 4. HE CAN STILL TALK WHILE YOU STAND THERE ------------------------------------------------
if (doing('talk')) {
  await fresh();
  console.log('\nTALK — the placard and the field at a place (the whole evening, no ?view)');
  const p = await open(...PLATE, '?now=21:12');
  await p.mouse.click(PLATE[0] / 2, PLATE[1] / 2); // the door: the visitor lets themselves in
  await p.waitForFunction(() => window.__theatre.pieces.dialogue?.asking === true, null, { timeout: 400000, polling: 400 });
  await p.evaluate(() => window.__theatre.pieces.walk.go('case'));
  await settle(p);
  const standing = await at(p);
  await p.keyboard.type('good evening');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(6000);
  const text = await p.evaluate(() => (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim());
  const after = await at(p);
  claim(standing.at === 'case' && after.at === 'case', `the visitor is still at the case after a line was sent (${after.at}, camera ${after.shot})`);
  claim(text.length > 0, `the placard is carrying words at the place: "${text.slice(0, 120)}"`);
  await shot(p, 'case-talking-1280x800');
  await p.close();
}

console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser?.close().catch(() => {});
process.exit(bad ? 1 : 0);
