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
const PLACES = ['fireplace', 'doorway', 'case', 'piano', 'table'];
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
      // WHICH SHOT THE PLACE STANDS ON IS ASKED, NOT ASSUMED. Four of the five name their shot
      // after themselves and this read `a1.shot === n` for three rounds; the reading table cannot,
      // because camera-shots.js already has a shot called `table` — his own, the one the whole
      // reading is played on — so the table's is `reading`. Asking the piece for `shots[n]` is
      // right whatever a later round renames.
      const want = await p.evaluate((k) => window.__theatre.pieces.walk.shots?.[k] ?? k, n);
      claim(a1.at === n && a1.shot === want, `${w}x${h} ${n}: ${hit ? `clicked at ${hit[0].toFixed(0)},${hit[1].toFixed(0)}` : 'called (off the frame — a phone cannot reach it from the chair)'} → walk.at=${a1.at} camera=${a1.shot} (its shot is ${want})`);
      claim(a1.zoomable === false, `${w}x${h} ${n}: the scroll is refused at the place (zoomable=${a1.zoomable})`);
      claim(a1.resting === 'home', `${w}x${h} ${n}: the resting plate is still home (${a1.resting})`);
      await shot(p, `${n}-${w}x${h}`);
      // A CLICK ON THE PLACE'S OWN OBJECT DOES NOT WALK BACK. At its own shot the hotspot is
      // switched off (a switch that would do nothing is not a switch), so this point is found from
      // the box rather than from the arbiter — which is exactly the case the rule is written for.
      // The DOOR is the one place whose own object is not inert: step 3 makes it open, so what is
      // asked of it is that it opens and that the visitor is still standing there, and then it is
      // shut again and they walk back to it before the two ways out are tried.
      // …and ONE of the five does not hold its own click at all (walk.js, `holds`): the reading
      // table's shot is a plan of the reading table, so the table IS the picture — 100 % of a
      // 390x844 frame — and a click anywhere on it that is not the BOOK is the way out. The piece
      // is asked which rule it is under rather than this file assuming it.
      const ownRule = await p.evaluate((k) => window.__theatre.pieces.walk.owns(k), n);
      if (!ownRule) claim(true, `${w}x${h} ${n}: this place's own object is the whole picture, so a click on it IS the way out`);
      const b2 = ownRule ? (await boxes(p))[n] : null;
      if (b2) {
        const cx = Math.min(w - 2, Math.max(2, b2.x + b2.w / 2)), cy = Math.min(h - 2, Math.max(2, b2.y + b2.h / 2));
        await p.mouse.click(cx, cy);
        await frames(p, 4);
        const held = await at(p);
        if (n === 'doorway') {
          const phase = await p.evaluate(() => window.__theatre.pieces.props.cross.phase);
          claim(held.at === n && phase === 'day', `${w}x${h} ${n}: a click on the leaf opens the door instead of leaving (phase ${phase}, still at ${held.at})`);
          await p.evaluate(() => window.__theatre.pieces.props.cross.shutByDay());
          await p.waitForFunction(() => window.__theatre.pieces.props.cross.phase === 'shut', null, { timeout: 400000, polling: 300 }).catch(() => {});
          await settle(p);
          await p.evaluate(() => window.__theatre.pieces.walk.go('doorway'));
          await settle(p);
        } else claim(held.at === n, `${w}x${h} ${n}: a click on the place's own object leaves the visitor there (${held.at})`);
      }
      // …AND A CLICK ON NOTHING WALKS THEM HOME, and «nothing» has to be FOUND rather than assumed.
      // The top-left corner was plaster in the first three frames and is the FIREPLACE's own hotspot
      // in the piano's (they stand on the same wall and the piano shot looks along it), so a click
      // there walks to the fireplace — which is right, and is not what this claim is about. So the
      // proof sweeps the frame for a point that is nobody's TWICE OVER: no switch answers for it,
      // and it is not inside the box of the thing the visitor is standing at where that box holds
      // its own click. That second half is the whole reason the sweep exists: at the piano the
      // carcase covers 95.8 % of a laptop frame and 99.4 % of a phone's, and a point picked by hand
      // would as likely as not land on it.
      const nowhere = await p.evaluate(([W, H, k]) => {
        const S = window.__theatre.pieces.props.switches, Wk = window.__theatre.pieces.walk;
        const held = Wk.owns(k) ? Wk.box(k) : null;
        const on = (b, x, y) => !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
        for (const y of [6, H - 3, H - 6, H / 2, H * 0.25, H * 0.75]) for (let i = 0; i <= 48; i++) {
          const x = (W * i) / 48;
          if (!S.at(x, y) && !on(held, x, y)) return [Math.round(Math.min(W - 2, Math.max(2, x))), Math.round(y)];
        }
        return null;
      }, [w, h, n]);
      claim(!!nowhere, `${w}x${h} ${n}: there is somewhere on the glass that belongs to nobody (${nowhere})`);
      await p.mouse.click(nowhere ? nowhere[0] : 4, nowhere ? nowhere[1] : 4);
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
  // THE CROSS STANDS DOWN AT THE DOORWAY, on purpose (egg-cross.js: the door is worked by the door
  // while somebody is standing at it, or the storm would take the camera out from under the walk).
  // So what is asked here is the opposite of the other two: nobody answers where the cross is.
  {
    await p.evaluate(() => window.__theatre.pieces.walk.go('doorway'));
    await settle(p);
    const b = await p.evaluate(() => window.__theatre.pieces.props.cross.tapBox());
    const said = b ? await asks(p, b.x + b.w / 2, b.y + b.h / 2) : 'no box';
    claim(said === null, `doorway: the cross on the frieze stands down while somebody is at the door (${said})`);
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
    const home = await p.evaluate(() => {
      const c = window.__theatre.pieces.props.cross.tapBox();
      return c ? window.__theatre.pieces.props.switches.at(c.x + c.w / 2, c.y + c.h / 2) : null;
    });
    claim(home === 'cross', `…and it answers again from the chair (${home})`);
  }
  // …and the four spines answer at the case, each to its own name
  {
    await p.evaluate(() => window.__theatre.pieces.walk.go('case'));
    await settle(p);
    // AND NOW NOT ONE OF THE FOUR OPENS. Three of them stopped being switches the round the cards
    // went into the book ("for now it should be the only clickable one") and have no box at all;
    // TAROT stopped being one this round, when the book came off the shelf and went onto the
    // reading table, so the case is thirty-three books on a shelf and nothing else.
    //
    // TAROT IS ASKED DIFFERENTLY FROM THE OTHER THREE, and the difference is the point: it is still
    // CUT and still re-lettered, so walk-book can still project a box for it, and a proof that only
    // asked for the absence of a box would pass for the wrong reason. What is asked is the ARBITER
    // — over the spine's own middle, nobody answers.
    {
      const b = await p.evaluate(() => window.__theatre.pieces.walk.books.tapBox('TAROT'));
      const said = b ? await asks(p, b.x + b.w / 2, b.y + b.h / 2) : 'no box';
      claim(said !== 'book-TAROT', `case: the TAROT spine is a book on a shelf again — the arbiter answers "${said}" over it`);
    }
    for (const t of ['MARSEILLE', 'CHIROMANCIE', 'LE DESTIN']) {
      const b = await p.evaluate((k) => window.__theatre.pieces.walk.books.tapBox(k), t);
      claim(!b, `case: ${t} is a book on a shelf and has no thumb box (${b ? 'HAS ONE' : 'none'})`);
    }
    // …and the PIANO is a place now, so the fourth one answers from the chair as the other three do
    {
      await p.evaluate(() => window.__theatre.pieces.walk.back());
      await settle(p);
      const b = await p.evaluate(() => window.__theatre.pieces.walk.box('piano'));
      const [W, H] = PLATE; // this section runs at 1280x800 only
      if (b) {
        let mine = 0;
        for (let j = 1; j < 6; j++) for (let i = 1; i < 6; i++) {
          const x = b.x + (b.w * i) / 6, y = b.y + (b.h * j) / 6;
          if (x < 2 || x > W - 2 || y < 2 || y > H - 2) continue;
          if ((await asks(p, x, y)) === 'walk-piano') mine++;
        }
        claim(mine > 0, `the piano can be clicked from the chair (${mine} of a 5 x 5 grid inside its box answer walk-piano)`);
      }
      await p.evaluate(() => window.__theatre.pieces.walk.go('case'));
      await settle(p);
    }
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
  }
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

// ---- 3d. THE READING TABLE, AND THE BOOK ON IT -------------------------------------------------
// The book left the tall case this round and came to the table: "the viewer basically moves to the
// table and looks down on the book and can look through it." What is asked is that the walk works
// by a real click, that the plan shot holds the book, that the book opens FROM THE TABLE and turns,
// that the spine on the case is refused, and that the palm that stood here is gone.
if (doing('table')) {
  console.log('\nTABLE — the reading table where the palm stood, and his own book on it');
  for (const [w, h] of [PLATE, PHONE]) {
    await fresh();
    const p = await room(w, h);
    // the palm is out of the room
    const plant = await p.evaluate(() => {
      let n = 0;
      window.__theatre.scene.traverse((o) => {
        if (/palm|plant/i.test(o.name ?? '')) n++;
      });
      return n;
    });
    claim(plant === 0, `${w}x${h}: the potted palm and its stool are out of the room (${plant} objects named for one)`);
    const T = await p.evaluate(() => ({ box: window.__theatre.pieces.props.table.box, chair: window.__theatre.pieces.props.table.chair, book: window.__theatre.pieces.props.table.book }));
    console.log(`   the table x ${T.box.x0} .. ${T.box.x1}, z ${T.box.z0} .. ${T.box.z1}, top ${T.box.y1}; the chair to x ${T.chair.x0}; the book ${T.book.w} x ${T.book.h}`);
    claim(T.chair.x0 >= 1.62, `and nothing of it is on the rug: the chair's front legs stand at x ${T.chair.x0} against the border at 1.60`);
    // …and the room as the visitor actually sits in it, with the table standing where the palm did
    if (w === PLATE[0]) await shot(p, 'table-from-chair-1280x800');

    // the walk, by a real click
    const hit = await pointOn(p, 'table', w, h);
    if (hit) await p.mouse.click(hit[0], hit[1]);
    else await p.evaluate(() => window.__theatre.pieces.walk.go('table'));
    await settle(p);
    const a = await at(p);
    // the PLACE is `table` and the SHOT it stands on is `reading` — camera-shots.js already has a
    // shot called `table`, which is his own table and the one the whole reading is played on
    claim(a.at === 'table' && a.shot === 'reading', `${w}x${h}: ${hit ? `a real click at ${hit[0].toFixed(0)},${hit[1].toFixed(0)}` : 'called (off the frame from the chair)'} walks to the table (${a.at}, camera ${a.shot})`);
    if (w === PLATE[0]) await shot(p, 'table-closed-1280x800');
    else await shot(p, 'table-closed-390x844');

    // the book is in the frame, and it is the book that answers
    const bb = await p.evaluate(() => window.__theatre.pieces.props.table.hitBox());
    const on = bb && bb.x + bb.w > 0 && bb.x < w && bb.y + bb.h > 0 && bb.y < h;
    const who = bb ? await asks(p, bb.x + bb.w / 2, bb.y + bb.h / 2) : null;
    console.log(`   the book is ${bb ? `${bb.w.toFixed(0)}x${bb.h.toFixed(0)} px at ${bb.x.toFixed(0)},${bb.y.toFixed(0)}` : 'not on the glass'} — ${((bb.w * bb.h) / (w * h) * 100).toFixed(1)}% of the frame`);
    claim(on && who === 'table-book', `${w}x${h}: the whole of it is in the plan shot and the arbiter gives it to '${who}'`);

    // …AND A REAL CLICK ON IT SWINGS IT OPEN. The book stopped being a sheet over the room this round
    // and became an object on the table (src/pieces/walk-book.js), so `showing` is true on the drawing
    // of the click and the board then takes eight more to go over; everything after that waits for
    // the piece to say it has stopped moving rather than counting frames.
    const bookRest = () => p.waitForFunction(() => !window.__theatre.pieces.walk.books.busy && !window.__theatre.pieces.camera.moving, null, { timeout: 120000 }).catch(() => {});
    await p.mouse.click(bb.x + bb.w / 2, bb.y + bb.h / 2);
    const open = await p.evaluate(() => ({ showing: window.__theatre.pieces.walk.books.showing, title: window.__theatre.pieces.walk.books.title, leaf: window.__theatre.pieces.walk.books.leaf, leaves: window.__theatre.pieces.walk.books.leaves }));
    claim(open.showing && open.title === 'TAROT', `${w}x${h}: a click on the book opens TAROT BY PEPE on the table (${open.title}, ${open.leaves} pages)`);
    await bookRest();
    await frames(p, 3);
    if (w === PLATE[0]) await shot(p, 'table-open-1280x800');
    else await shot(p, 'table-open-390x844');
    // it turns: on a spread that is the right page, on one leaf the right half of the page in front
    const leafBox = await p.evaluate(() => window.__theatre.pieces.walk.books.leafBox());
    const spread = await p.evaluate(() => window.__theatre.pieces.walk.books.spread);
    await p.mouse.click(leafBox.x + leafBox.w * (spread ? 0.5 : 0.8), leafBox.y + leafBox.h * 0.62);
    await bookRest();
    await frames(p, 2);
    const turned = await p.evaluate(() => window.__theatre.pieces.walk.books.leaf);
    claim(turned > open.leaf, `${w}x${h}: and a click on the right page turns it (${open.leaf + 1} → ${turned + 1})`);
    // closing leaves the visitor at the table
    await p.keyboard.press('Escape');
    await bookRest();
    await frames(p, 2);
    const shut2 = await at(p);
    const showing = await p.evaluate(() => window.__theatre.pieces.walk.books.showing);
    claim(!showing && shut2.at === 'table', `${w}x${h}: closing it leaves the visitor at the table (${shut2.at})`);
    // …and a click off the book walks them back
    await p.mouse.click(4, 4);
    await settle(p);
    const home = await at(p);
    claim(home.at === null && home.shot === 'home', `${w}x${h}: a click off the book walks back to the chair (${home.at}, camera ${home.shot})`);

    // THE SPINE ON THE CASE IS REFUSED. It is still cut, still re-lettered, and it is not a switch.
    await p.evaluate(() => window.__theatre.pieces.walk.go('case'));
    await settle(p);
    // THE SPINE IS STILL CUT AND STILL RE-LETTERED — it is the same book and it says so on its back
    // — and it is no longer a SWITCH. So the witness is the arbiter and not the box: the box is
    // still computable (walk-book keeps the spine it found), and nobody answers for it.
    const spine = await p.evaluate(() => {
      const B = window.__theatre.pieces.walk.books, S = window.__theatre.pieces.props.switches;
      const b = B.tapBox('TAROT');
      return { title: B.spines[0]?.title ?? null, said: b ? S.at(b.x + b.w / 2, b.y + b.h / 2) : 'no box' };
    });
    claim(spine.said !== 'book-TAROT', `${w}x${h}: the ${spine.title} spine on the tall case is a book on a shelf again — the arbiter answers '${spine.said}' over it`);
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
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

// ---- 5. THE PAN, AND WHAT IT PUTS WITHIN REACH -------------------------------------------------
// A narrow window looks round the room, and the two places a phone could not click from the chair
// become clickable. Driven with a real touch drag and with a real tap on the drawn chevron.
if (doing('pan')) {
  console.log('\nPAN — a narrow window looks round the room');
  for (const [w, h] of [PLATE, [1200, 1100], PHONE]) {
    await fresh();
    const p = await room(w, h);
    const armed = await p.evaluate(() => ({ needed: window.__theatre.pieces.camera.panNeeded, able: window.__theatre.pieces.camera.panable, boxes: window.__theatre.pieces.camera.panBoxes, max: window.__theatre.pieces.camera.panMax }));
    await frames(p, 3);
    const boxes2 = await p.evaluate(() => window.__theatre.pieces.camera.panBoxes);
    console.log(`  ${w}x${h}  the room ${armed.needed ? 'does NOT fit the frame — the pan is armed' : 'fits the frame — no pan, no chevrons'}; chevrons ${boxes2 ? `at ${boxes2.l.x.toFixed(0)},${boxes2.l.y.toFixed(0)} and ${boxes2.r.x.toFixed(0)},${boxes2.r.y.toFixed(0)} (${boxes2.l.w.toFixed(0)}x${boxes2.l.h.toFixed(0)} px)` : 'not drawn'}`);
    if (w === PLATE[0]) {
      claim(!armed.needed && !boxes2, `${w}x${h}: a laptop holds the room and gets no control at all`);
      await p.close();
      continue;
    }
    claim(armed.needed && !!boxes2, `${w}x${h}: the pan is armed and the two chevrons are drawn`);
    // a real TAP on the left chevron — twice, which is the whole range
    await p.mouse.click(boxes2.l.x + boxes2.l.w / 2, boxes2.l.y + boxes2.l.h / 2);
    await p.mouse.click(boxes2.l.x + boxes2.l.w / 2, boxes2.l.y + boxes2.l.h / 2);
    await p.waitForFunction(() => Math.abs(window.__theatre.pieces.camera.pan - window.__theatre.pieces.camera.panTarget) < 1e-3, null, { timeout: 120000, polling: 200 }).catch(() => {});
    const left = await p.evaluate(() => ({ pan: window.__theatre.pieces.camera.pan, deg: window.__theatre.pieces.camera.panDegrees, zoomable: window.__theatre.pieces.camera.zoomable, shot: window.__theatre.pieces.camera.current }));
    claim(Math.abs(left.pan + 1) < 0.01, `${w}x${h}: two taps on the left chevron turn the room hard over (pan ${left.pan.toFixed(2)}, ${left.deg}°)`);
    claim(left.zoomable === false, `${w}x${h}: and the scroll is disarmed while the room is turned`);
    claim(left.shot === 'home', `${w}x${h}: the camera is still standing on the resting plate (${left.shot})`);
    if (w === PHONE[0]) await shot(p, 'pan-left-390x844');
    // WHAT IS NOW WITHIN REACH: the two places a phone could not click from the chair
    const reach = await p.evaluate(() => {
      const W = window.__theatre.pieces.walk, S = window.__theatre.pieces.props.switches;
      const out = {};
      for (const n of W.places) {
        const b = W.box(n);
        if (!b) {
          out[n] = null;
          continue;
        }
        let hit = null;
        for (let j = 1; j < 10 && !hit; j++) for (let i = 1; i < 10 && !hit; i++) {
          const x = b.x + (b.w * i) / 10, y = b.y + (b.h * j) / 10;
          if (x < 2 || x > innerWidth - 2 || y < 2 || y > innerHeight - 2) continue;
          if (S.at(x, y) === `walk-${n}`) hit = [Math.round(x), Math.round(y)];
        }
        out[n] = hit;
      }
      return out;
    });
    console.log(`   panned left, the arbiter answers for: ${Object.entries(reach).filter(([, v]) => v).map(([k, v]) => `${k} at ${v[0]},${v[1]}`).join(' · ') || 'nothing'}`);
    claim(!!reach.fireplace, `${w}x${h}: panned left, the FIREPLACE can be clicked (${reach.fireplace})`);
    // …and clicking it really walks
    await p.mouse.click(reach.fireplace[0], reach.fireplace[1]);
    await settle(p);
    const stood = await at(p);
    claim(stood.at === 'fireplace', `${w}x${h}: a phone reaches the fireplace by panning and tapping (walk.at=${stood.at})`);
    const panAfter = await p.evaluate(() => window.__theatre.pieces.camera.pan);
    claim(panAfter === 0, `${w}x${h}: and the walk put the pan back to nought (${panAfter})`);
    await p.evaluate(() => window.__theatre.pieces.walk.back());
    await settle(p);
    // the CASE, the other way about: one tap left, then find it
    const bx = await p.evaluate(() => window.__theatre.pieces.camera.panBoxes);
    await p.mouse.click(bx.l.x + bx.l.w / 2, bx.l.y + bx.l.h / 2);
    await p.waitForFunction(() => Math.abs(window.__theatre.pieces.camera.pan - window.__theatre.pieces.camera.panTarget) < 1e-3, null, { timeout: 120000, polling: 200 }).catch(() => {});
    const caseHit = await p.evaluate(() => {
      const W = window.__theatre.pieces.walk, S = window.__theatre.pieces.props.switches;
      const b = W.box('case');
      if (!b) return null;
      for (let j = 1; j < 10; j++) for (let i = 1; i < 10; i++) {
        const x = b.x + (b.w * i) / 10, y = b.y + (b.h * j) / 10;
        if (x < 2 || x > innerWidth - 2 || y < 2 || y > innerHeight - 2) continue;
        if (S.at(x, y) === 'walk-case') return [Math.round(x), Math.round(y)];
      }
      return null;
    });
    claim(!!caseHit, `${w}x${h}: one tap left puts the TALL CASE within reach (${caseHit})`);
    if (caseHit) {
      await p.mouse.click(caseHit[0], caseHit[1]);
      await settle(p);
      const s2 = await at(p);
      claim(s2.at === 'case', `${w}x${h}: and tapping it walks there (${s2.at})`);
      await p.evaluate(() => window.__theatre.pieces.walk.back());
      await settle(p);
    }
    // the other way: the right chevron, and the drag. Square the room up first — the tests above
    // leave it turned when one of them does not reach, and two taps from −0.5 is only +0.5.
    await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
    await frames(p, 2);
    const bx2 = await p.evaluate(() => window.__theatre.pieces.camera.panBoxes);
    await p.mouse.click(bx2.r.x + bx2.r.w / 2, bx2.r.y + bx2.r.h / 2);
    await p.mouse.click(bx2.r.x + bx2.r.w / 2, bx2.r.y + bx2.r.h / 2);
    await p.waitForFunction(() => Math.abs(window.__theatre.pieces.camera.pan - window.__theatre.pieces.camera.panTarget) < 1e-3, null, { timeout: 120000, polling: 200 }).catch(() => {});
    const right = await p.evaluate(() => window.__theatre.pieces.camera.pan);
    claim(Math.abs(right - 1) < 0.01, `${w}x${h}: the right chevron turns it the other way (${right.toFixed(2)})`);
    if (w === PHONE[0]) await shot(p, 'pan-right-390x844');
    // A REAL ONE-FINGER DRAG, and the axis split. Horizontal pans; vertical is still the scroll.
    await p.evaluate(() => window.__theatre.pieces.camera.setPan(0, { hold: true }));
    await frames(p, 2);
    const cx = Math.round(w / 2), cy = Math.round(h / 2);
    await p.touchscreen.tap(cx, cy).catch(() => {});
    const dragged = await p.evaluate(async ([x, y]) => {
      const el = window.__theatre.renderer.domElement;
      const t = (id, X, Y) => new Touch({ identifier: id, target: el, clientX: X, clientY: Y });
      const fire = (type, X, Y) => {
        const touch = t(1, X, Y);
        el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [touch], targetTouches: type === 'touchend' ? [] : [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
      };
      fire('touchstart', x, y);
      for (let k = 1; k <= 8; k++) fire('touchmove', x + k * 18, y);
      fire('touchend', x + 144, y);
      await new Promise((r) => requestAnimationFrame(r));
      return { panTarget: window.__theatre.pieces.camera.panTarget, zoomTarget: window.__theatre.pieces.camera.zoomTarget };
    }, [cx, cy]);
    claim(dragged.panTarget < -0.05 && dragged.zoomTarget === 0, `${w}x${h}: a sideways one-finger drag pans and does not scroll (pan ${dragged.panTarget.toFixed(3)}, zoom ${dragged.zoomTarget})`);
    // …and a wheel while turned squares the room up before it zooms
    await p.mouse.move(cx, cy);
    await p.mouse.wheel(0, 240);
    await frames(p, 2);
    const wheeled = await p.evaluate(() => ({ pan: window.__theatre.pieces.camera.panTarget, zoom: window.__theatre.pieces.camera.zoomTarget }));
    claim(wheeled.pan === 0 && wheeled.zoom === 0, `${w}x${h}: a wheel while turned eases the pan back to centre and does not zoom (pan ${wheeled.pan}, zoom ${wheeled.zoom})`);
    if (p.__errors.length) {
      console.log(`   errors: ${p.__errors.join(' | ')}`);
      bad++;
    }
    await p.close();
  }
}

console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser?.close().catch(() => {});
process.exit(bad ? 1 : 0);
