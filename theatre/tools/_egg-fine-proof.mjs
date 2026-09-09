#!/usr/bin/env node
// THE FIRE, DRIVEN LIKE A VISITOR (the egg in src/pieces/egg-fine.js).
//
// A real pointer is put on the mushroom lamp and left there. Nothing below asks the piece whether
// it thinks that worked; every claim is put to a witness that is not the piece:
//
//   the DRAWING    frames at the home plate at 2.92 s (a room that is fine), 3.00 s (the first
//                  flame, alone), 3.50 s (the second), 8.00 s (eleven) and 8.50 s (the dozen), a 2x
//                  crop of the lot and a 4x of the lamp, then the pointer taken away and the six
//                  drawings of the going-out
//   the ROOM       the same frame with the fire and without it, struck at the SAME instant of the
//                  drawing (?t=2.5 freezes the boil) and differenced: the only pixels that changed
//                  are inside the twelve flames. Pepe's own region is counted separately, which is
//                  the user's claim — "he does not react at all" — put as a number
//   the PUPPET     his hip, his head, his hands, his mouth and what pepeAnim thinks he is doing,
//                  read before the fire, at the height of it and after. He BREATHES throughout —
//                  pepeAnim's blink and breath run on the absolute frame count and never stop — so
//                  what is asked of him live is that he is doing the same thing and that nothing of
//                  him went further than that breath; the pixel claim is the ROOM's, above
//   the PLACARD    the dialogue layer's own text, same three moments
//   the LIGHT      lighting.state and every practical's intensity, same three moments
//   the EVENTS     what came out of ctx.emit('props:fine', …) on the page's own bus
//   the SOUND      sound.timeline, which is what the audio graph was actually given, and the cue
//                  rendered offline through the code the room plays it with
//
// It also measures the framing on a 390x844 phone, where the lamp is worked by a held touch and
// not by a hover, and drives one.
//
//   BASE=http://127.0.0.1:8713/ node tools/_egg-fine-proof.mjs
//   BASE=… node tools/_egg-fine-proof.mjs --out /abs/dir
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? resolve(dirname(fileURLToPath(import.meta.url)), '../public/progress/shots');
mkdirSync(OUT, { recursive: true });

const PLATE = [1280, 800];
const PHONE = [390, 844];

// ONE BROWSER PER SECTION, AND THE SECTIONS CAN BE RUN ONE AT A TIME (`--only hold`). Software
// WebGL renders this room at rather less than a frame a second, so the hold alone is a hundred
// drawings and twenty minutes, and a chromium that has carried five of these WebGL contexts through
// one process falls over somewhere in the middle of it (it did, twice, taking the whole run with
// it). A browser a section is cheap — a launch is two seconds against the twenty minutes — and a
// section that dies now costs only itself.
const LAUNCH = {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
};
const ONLY = args.only ? String(args.only).split(',') : null;
const doing = (name) => !ONLY || ONLY.includes(name);
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
  await page.goto(`${BASE}/?view=props&state=default${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  // ?view=props boots on the WIDE plate, and the cut to home has to be given a frame before
  // anything is projected: a box measured in the same tick as the cut is measured through the old
  // lens (egg-insects.js's proof learnt this the expensive way).
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(() => window.__theatre.camera.updateMatrixWorld(true));
  page.__errors = errors;
  return page;
}

// everything that is NOT the fire, asked of the pieces that own it and never of the egg
const world = (p) =>
  p.evaluate(() => {
    const T = window.__theatre, P = T.pieces.pepe, A = T.pieces.pepeAnim, L = T.pieces.lighting, F = T.pieces.props.fine;
    const r3 = (v) => [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];
    const practicals = {};
    for (const [k, v] of Object.entries(L?.practicals ?? {})) practicals[k] = +(v?.intensity ?? 0).toFixed(3);
    return {
      fire: { burning: F.burning, lit: F.lit, held: +F.held.toFixed(2) },
      pepe: {
        hip: r3(P.torso.position),
        head: r3(P.head.position),
        headRot: r3(P.headPivot.rotation),
        handL: r3(P.hands[0].position),
        handR: r3(P.hands[1].position),
        mouth: ['rest', 'o', 'flat'].filter((m) => P.parts?.[`mouth${m[0].toUpperCase()}${m.slice(1)}`]?.visible ?? false),
        anim: A?.mode ?? A?.state ?? null,
      },
      placard: (document.querySelector('#dialogue')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      light: { state: L.state, key: +L.key.intensity.toFixed(3), practicals },
    };
  });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function crop(buf, box, out, { pad = 24, scale = 2 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.min(meta.width - left, Math.round(box.w + pad * 2));
  const height = Math.min(meta.height - top, Math.round(box.h + pad * 2));
  await sharp(buf).extract({ left, top, width, height }).resize({ width: width * scale, height: height * scale, kernel: 'nearest' }).png().toFile(out);
  return { left, top, width, height };
}
const union = (list) => {
  const b = list.filter(Boolean);
  const x = Math.min(...b.map((v) => v.x)), y = Math.min(...b.map((v) => v.y));
  return { x, y, w: Math.max(...b.map((v) => v.x + v.w)) - x, h: Math.max(...b.map((v) => v.y + v.h)) - y };
};

const fails = [];
const ok = (cond, line) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};

// ---- 1. the lamp on the glass, in every window the film is judged at --------------------------------
if (doing('lamp')) {
console.log('\nTHE LAMP, WHICH IS THE WHOLE AFFORDANCE  (home plate; the flames are not touchable, only it is)');
await fresh();
for (const [W, H] of [PLATE, [1600, 900], PHONE, [360, 800]]) {
  const page = await open(W, H, '&shot=1');
  const m = await page.evaluate(() => {
    const F = window.__theatre.pieces.props.fine;
    return { hit: F.hitBox(), tap: F.tapBox() };
  });
  const b = m.hit, t = m.tap;
  const inside = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
  console.log(
    `  ${String(W + 'x' + H).padEnd(9)} lamp ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
      `  tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ' (the lamp itself)'}  ${inside ? 'IN SHOT' : 'OUT OF FRAME'}`,
  );
  if (W === PLATE[0] && H === PLATE[1]) ok(inside, 'the lamp is whole inside the home plate, which is where the pointer has to find it');
  if (W === PHONE[0]) ok(inside && t.w >= 44 && t.h >= 44, 'and whole on a 390x844 phone, with a thumb-sized box round it');
  await page.close();
}
}

// ---- 2. the hold, driven with a real pointer -------------------------------------------------------
// No ?shot=1: the sound piece is live, so the crackle can be caught on the graph's own timeline.
let boxesAt8 = null;
if (doing('hold')) {
console.log('\nTHE HOLD  (1280x800, home, a real pointer put on the lamp and left there)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H, '&now=21:12');
  await page.evaluate(() => {
    window.__fine = [];
    window.__theatre.on('props:fine', (d) => window.__fine.push({ ...d, at: +window.__theatre.clock.t.toFixed(2) }));
  });
  await page.waitForTimeout(700);
  const lamp = await page.evaluate(() => window.__theatre.pieces.props.fine.tapBox());
  const cx = lamp.x + lamp.w / 2, cy = lamp.y + lamp.h / 2;
  console.log(`  the target on the glass  x ${cx.toFixed(0)} y ${cy.toFixed(0)}  (${lamp.w.toFixed(0)} x ${lamp.h.toFixed(0)} px)`);

  // A BROWSER WILL NOT MAKE A SOUND UNTIL IT HAS BEEN TOUCHED, and hovering is not touching. So the
  // visitor's first gesture is a click on the lamp — which does nothing at all to the fire, and the
  // line below proves it — and only then is the pointer rested on it. On a phone the press IS the
  // gesture and this step does not exist.
  await page.mouse.move(cx, cy);
  // the hit test runs once a drawing, and a drawing here is a second or two, so wait for the room
  // to have noticed rather than for a stopwatch
  const cursor = await page
    .waitForFunction(() => window.__theatre.renderer.domElement.style.cursor || null, null, { timeout: 60000, polling: 500 })
    .then((h) => h.jsonValue())
    .catch(() => '(none)');
  ok(cursor === 'pointer', `a pointer resting on the lamp turns the cursor, and that is the whole affordance (${JSON.stringify(cursor)})`);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(500);
  const afterClick = await world(page);
  ok(!afterClick.fire.burning && afterClick.fire.lit === 0, 'a CLICK on the lamp lights nothing: this is a hold, not a switch');
  await page.mouse.move(cx - 420, cy + 160);
  await page.waitForTimeout(800);
  const before = await world(page);
  const cuesBefore = await page.evaluate(() => (window.__theatre.pieces.sound.timeline ?? []).length);

  // THE HOLD IS TAKEN A DRAWING AT A TIME, and it has to be: this headless browser renders at
  // something under a frame a second, so three seconds of film is three seconds of nothing and then
  // the whole fire at once, and a screenshot in the middle of it takes four seconds of its own. So
  // props.update is put behind a gate and released once per drawing wanted. It is the piece's own
  // update, called by main's own loop, on the piece's own stepped clock — nothing about the hold is
  // simulated, it is only let through one drawing at a time. This is also why the piece counts
  // DRAWINGS and not wall seconds (egg-fine.js, HOLD_F): thirty-six of them is three seconds of
  // film wherever the film is played.
  // THE HOLD IS TAKEN A DRAWING AT A TIME, and it has to be: this headless browser renders at
  // something under a frame a second, so three seconds of film is three seconds of nothing followed
  // by the whole fire at once, and a screenshot in the middle of it takes four seconds of its own.
  // So props.update is put behind a gate, released a counted number of drawings at a time, and made
  // to write down what the fire looked like after each one. It is the piece's own update, called by
  // main's own loop, on the piece's own stepped clock — nothing about the hold is simulated, it is
  // only let through one drawing at a time and written down. This is also why the piece counts
  // DRAWINGS and not wall seconds (egg-fine.js, HOLD_F): thirty-six of them is three seconds of
  // film wherever the film is played.
  await page.evaluate(() => {
    const p = window.__theatre.pieces.props;
    const real = p.update.bind(p);
    window.__go = 0;
    window.__trace = [];
    p.update = (c) => {
      // THE COUNTED DRAWINGS ARE TAKEN IN ONE RENDERED FRAME. `real(c)` is the props piece's own
      // update, called the piece's own number of times, each on a stepped clock — the drawings that
      // are skipped are skipped by the RENDERER, not by the fire. Releasing one a frame was the
      // first cut of this and it is honest too, but it needs a hundred rendered frames of a room
      // that takes several seconds each on software WebGL, and a chromium sharing this Mac with
      // five other builders' proofs fell over in the middle of it three times running. The frames
      // that are looked at are drawn; the ones in between were only ever counted.
      if (window.__go > 0 && c.clock.stepped) {
        while (window.__go > 0) {
          window.__go--;
          real(c);
          window.__trace.push([p.fine.steps, p.fine.lit]);
        }
      }
    };
  });
  await page.mouse.move(cx, cy);
  const run = async (n) => {
    await page.evaluate((k) => {
      window.__go = k;
    }, n);
    await page.waitForFunction(() => window.__go === 0, null, { timeout: 1500000, polling: 500 });
  };
  const read = () =>
    page.evaluate(() => {
      const F = window.__theatre.pieces.props.fine;
      return { lit: F.lit, steps: F.steps, held: +F.held.toFixed(2) };
    });
  const shot = async (name) => {
    const buf = await page.screenshot({ timeout: 400000 });
    await sharp(buf).png().toFile(`${OUT}/egg-fine-${name}.png`);
    return buf;
  };
  // …and the pointer is put back on the lamp only after two drawings with it AWAY, so the hold
  // starts from a clean nought. The room notices a pointer once a drawing, and on a machine this
  // slow the move off the lamp above can still be sitting unread when the gate goes in — which
  // is one drawing of hold already counted before the tool has asked for any.
  await page.mouse.move(cx - 420, cy + 160);
  await run(2);
  await page.mouse.move(cx, cy);
  const frames = {};
  let during = null;
  // the drawings the user asked to see, in the seconds they are worth at 12 fps. Asked for by the
  // COUNT the fire itself is on, not by how many the tool thinks it has released.
  const runTo = async (target) => {
    for (let guard = 0; guard < 8; guard++) {
      const m = await read();
      if (m.steps >= target) return m;
      await run(target - m.steps);
    }
    return read();
  };
  for (const [n, name, what] of [
    [35, 'hold-2s92', 'a room that is fine'],
    [36, 'hold-3s00', 'the first flame'],
    [42, 'hold-3s50', 'the second'],
    [96, 'hold-8s00', 'eleven of them'],
    [102, 'hold-8s50', 'the dozen'],
  ]) {
    const m = await runTo(n);
    if (m.steps >= 96 && !during) during = await world(page);
    frames[name] = { buf: await shot(name), ...m };
    console.log(`  drawing ${String(m.steps).padStart(3)}  =  ${(m.steps / 12).toFixed(2)} s  ${String(m.lit).padStart(2)} of 12 alight  ${what.padEnd(20)} →  ${OUT}/egg-fine-${name}.png`);
  }
  if (!during) during = await world(page);
  // and the whole hold, drawing by drawing, off the trace the gate kept
  const trace = await page.evaluate(() => window.__trace);
  const caught = [];
  let last = 0;
  for (const [steps, lit] of trace) {
    for (let k = last; k < lit; k++) caught.push(steps);
    last = lit;
  }
  console.log(`  each flame caught on drawing  ${JSON.stringify(caught)}`);
  console.log(`  …which is, in seconds         ${JSON.stringify(caught.map((c) => +(c / 12).toFixed(2)))}`);
  const gaps = caught.slice(1).map((v, i) => v - caught[i]);
  ok(caught[0] === 36, `the first flame catches on the 36th drawing the pointer rests there — three seconds exactly (this one: ${caught[0]})`);
  ok(
    gaps.every((g) => g === 6),
    `and one every sixth drawing after it — half a second exactly (gaps: ${JSON.stringify(gaps)})`,
  );
  ok(caught.length === 12, `a dozen of them and no more (${caught.length})`);
  ok(frames['hold-2s92'].lit === 0, 'at 2.92 s the room is fine: nothing is alight');
  ok(frames['hold-3s00'].lit === 1, 'at 3.00 s exactly one flame has caught');
  ok(frames['hold-8s50'].lit === 12, 'and at 8.50 s the whole dozen is burning');
  const f90 = frames['hold-8s50'];

  // the crops: the whole fire at 2x, and the lamp — the smallest flames in the room — at 4x
  boxesAt8 = await page.evaluate(() => {
    const F = window.__theatre.pieces.props.fine;
    return { boxes: Array.from({ length: F.count }, (_, i) => F.flameBox(i)), where: F.where, seats: F.seats, lamp: F.hitBox() };
  });
  await crop(f90.buf, union(boxesAt8.boxes), `${OUT}/egg-fine-all-2x.png`, { pad: 20, scale: 2 });
  await crop(f90.buf, union(boxesAt8.boxes.slice(0, 3)), `${OUT}/egg-fine-lamp-4x.png`, { pad: 22, scale: 4 });
  console.log(`  ${OUT}/egg-fine-all-2x.png · egg-fine-lamp-4x.png`);
  console.log('  where the twelve stand (metres → glass px):');
  boxesAt8.boxes.forEach((b, i) =>
    console.log(`    ${String(i).padStart(2)} ${boxesAt8.where[i].padEnd(6)} ${JSON.stringify(boxesAt8.seats[i])}  →  ${b.w.toFixed(1)} px at ${(b.x + b.w / 2).toFixed(0)}, ${(b.y + b.h / 2).toFixed(0)}`),
  );

  // ---- and the pointer taken away -------------------------------------------------------------
  // Six drawings — half a second — and the sheets shrink to a last wisp and are gone. The first of
  // the six is the drawing on which the room NOTICES the pointer has gone: the hit test runs once a
  // drawing and not once a pointermove (props.js, THE SWITCHES), so leaving and the first wisp are
  // the same drawing. Sizes are taken off the sheet's own box on the glass.
  await page.mouse.move(cx - 420, cy + 160);
  const wisps = [];
  for (let n = 1; n <= 8; n++) {
    await run(1);
    const m = await page.evaluate(() => {
      const F = window.__theatre.pieces.props.fine;
      const b = F.flameBox(11);
      return { lit: F.lit, w: b ? +b.w.toFixed(1) : 0 };
    });
    wisps.push(m);
    if (n <= 3 || m.lit === 0) await shot(`out-${n}`);
    if (m.lit === 0) break;
  }
  console.log(`  going out, drawing by drawing  ${wisps.map((w, i) => `${i + 1}:${w.lit}@${w.w}px`).join('  ')}`);
  console.log(`  →  ${OUT}/egg-fine-out-1.png … out-${wisps.length}.png`);
  ok(wisps.length === 6 && wisps[5].lit === 0, `the fire is out on the sixth drawing after the pointer left — half a second (it took ${wisps.length})`);
  ok(
    wisps.slice(0, 5).every((w, i) => i === 0 || w.w < wisps[i - 1].w),
    `and every drawing of it is smaller than the last: ${wisps.slice(0, 5).map((w) => w.w).join(' → ')} px, then gone`,
  );
  const after = await world(page);

  // ---- the puppet, the placard and the light, before / during / after --------------------------
  console.log('\nWHAT ELSE MOVED  (his own pieces asked directly, three times over)');
  console.log('  before ', JSON.stringify(before.pepe), JSON.stringify(before.light));
  console.log('  during ', JSON.stringify(during.pepe), JSON.stringify(during.light), `(${during.fire.lit} alight)`);
  console.log('  after  ', JSON.stringify(after.pepe), JSON.stringify(after.light));
  // HE IS NOT STILL, AND THAT IS NOT A REACTION. pepeAnim breathes and blinks on the absolute frame
  // count and never stops (its own words), so his hip and his head are a few millimetres from where
  // they were between any two moments of the evening, fire or no fire. Reading the same numbers
  // twice would prove the puppet had died, not that it had ignored the room. What can be asked of
  // him live is that he is doing THE SAME THING — same mode, same mouth — and that nothing has
  // moved further than his own breath; the pixel claim is put at the same instant of the drawing,
  // with the fire on and off, in THE ROOM section above, and it comes back at nought.
  const away = (a, b) =>
    Math.max(
      ...['hip', 'head', 'handL', 'handR'].flatMap((k) => a[k].map((v, i) => Math.abs(v - b[k][i]))),
    );
  const swayed = Math.max(Math.abs(before.pepe.headRot[2] - during.pepe.headRot[2]), Math.abs(before.pepe.headRot[2] - after.pepe.headRot[2]));
  const moved = Math.max(away(before.pepe, during.pepe), away(before.pepe, after.pepe));
  console.log(`  the furthest anything of his went  ${(moved * 1000).toFixed(1)} mm, and his head swayed ${swayed.toFixed(4)} rad — his breath, which never stops`);
  ok(
    same(before.pepe.mouth, during.pepe.mouth) && same(before.pepe.mouth, after.pepe.mouth) && before.pepe.anim === during.pepe.anim && before.pepe.anim === after.pepe.anim,
    'Pepe: same mode, same mouth, before the fire, at the height of it and after — he is not doing anything different',
  );
  ok(moved < 0.01 && swayed < 0.12, `and nothing of him went further than his own breath (${(moved * 1000).toFixed(1)} mm, ${swayed.toFixed(4)} rad)`);
  ok(same(before.light, during.light) && same(before.light, after.light), 'the light: the lighting state, the key and every practical are untouched — the fire is drawn, not lit');
  ok(before.placard === '' && during.placard === '' && after.placard === '', `the placard says nothing (${JSON.stringify(during.placard)})`);

  // ---- the events and the cue ------------------------------------------------------------------
  const events = await page.evaluate(() => window.__fine);
  console.log('\nprops:fine                ', JSON.stringify(events));
  ok(events.length === 2 && events[0].burning === true && events[1].burning === false, 'the bus carried exactly two: it caught, and it went out');
  const cues = await page.evaluate(() => (window.__theatre.pieces.sound.timeline ?? []).map((c) => ({ n: c.name, at: c.at })));
  // The cue is fired every FOURTH drawing (egg-fine.js, CRACKLE_EVERY), so the count is arithmetic:
  // 66 drawings from the first flame to the twelfth, plus the six the fire spends going out, is
  // about eighteen firings. The wall times between them mean nothing here — the drawings were
  // released one at a time through the gate — so what is asked of the timeline is how many there
  // were and whether any of them landed after the fire was out.
  const crackles = cues.slice(cuesBefore).filter((c) => c.n === 'crackle');
  const lastPlayed = await page.evaluate(() => window.__theatre.pieces.sound.timeline.filter((c) => c.name === 'crackle').length);
  console.log(`the crackle               ${crackles.length} firings under a fire that took 66 drawings to catch (one every 4th drawing)`);
  ok(crackles.length >= 15 && crackles.length <= 22, `the cue ran under the fire and only under it (${crackles.length} firings)`);
  const nBefore = await page.evaluate(() => window.__theatre.pieces.sound.timeline.filter((c) => c.name === 'crackle').length);
  await run(12); // a dozen more drawings with nothing alight
  const afterOut = (await page.evaluate(() => window.__theatre.pieces.sound.timeline.filter((c) => c.name === 'crackle').length)) - nBefore;
  ok(afterOut === 0, `and it stopped when they went out: ${afterOut} crackles on the graph over the twelve drawings after the last wisp (of ${lastPlayed} in all)`);
  console.log('the whole sound timeline  ', JSON.stringify([...new Set(cues.map((c) => c.n))]));

  // THE CUE ITSELF, rendered offline through the very code the room plays it with — the way
  // tools/_sound-probe.mjs measures every other voice. A filter eats most of a noise burst, so
  // LEVEL is a wish and TRIM is what it takes: the last number is the one to paste back.
  const r = await page.evaluate(async () => {
    const s = window.__theatre.pieces.sound;
    const b = await s.render('crackle', 1.0, { seed: 7, at: 0.02 });
    if (!b) return null;
    const l = b.l, sr = b.sampleRate;
    let peak = 0, first = -1, last = 0;
    for (let i = 0; i < l.length; i++) {
      const v = Math.abs(l[i]);
      if (v > peak) peak = v;
      if (v > 1e-4) {
        if (first < 0) first = i;
        last = i;
      }
    }
    let onset = 0;
    for (let i = first; i < Math.min(last, first + Math.round(sr * 0.012)); i++) onset = Math.max(onset, Math.abs(l[i]));
    return { peak, length: (last - first) / sr, onset, want: s.levels.crackle, cap: s.lengths.crackle, trim: s.trims.crackle, known: s.cues.includes('crackle') };
  });
  if (r) {
    console.log(
      `the crackle, rendered offline  peak ${r.peak.toFixed(4)} (${(20 * Math.log10(r.peak)).toFixed(1)} dBFS) · ${r.length.toFixed(3)} s of ${r.cap} allowed · ` +
        `on its first 12 ms it is at ${((100 * r.onset) / r.peak).toFixed(0)}% of peak · in CUES ${r.known}`,
    );
    // rendered THROUGH the trim that is in the table, so the number to paste back is the one it is
    // carrying scaled by however far off LEVEL it came out
    const wants = (r.trim * r.want) / r.peak;
    console.log(`it wants LEVEL ${r.want} at TRIM ${r.trim} → TRIM ${wants.toFixed(3)}`);
    ok(Math.abs(wants - r.trim) / r.trim < 0.05, `and TRIM ${r.trim} in the table is the trim that gets it there (it asks for ${wants.toFixed(3)})`);
    ok(r.length <= r.cap + 0.02, 'the cue is no longer than LENGTH.crackle says it may be');
  }
  ok(page.__errors.length === 0, `the page threw nothing all the way through${page.__errors.length ? ': ' + page.__errors[0] : ''}`);
  await page.close();
}

// ---- 3. the room, with the fire and without it, at the same instant of the drawing ------------------
// The room is re-struck on every 12 fps step, so two frames taken a moment apart differ in tens of
// thousands of pixels before anything is set alight. `&t=2.5` freezes the boil and `&now=21:12`
// pins the clock's hands; the piece is then lit and doused with `set()`, which does no cue and no
// waiting, and what is left over is the fire and nothing else.
if (doing('room')) {
console.log('\nTHE ROOM, ALIGHT AND NOT  (1280x800, home, ?t=2.5 frozen; the same frame twice)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H, '&shot=1&t=2.5&now=21:12');
  const geom = await page.evaluate(() => {
    const T = window.__theatre, THREE = T.THREE, F = T.pieces.props.fine;
    F.set(true);
    const W2 = T.size?.w || window.innerWidth, H2 = T.size?.h || window.innerHeight;
    const P = T.pieces.pepe.group;
    P.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(P);
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
      v.set(x, y, z).project(T.camera);
      xs.push(((v.x + 1) / 2) * W2);
      ys.push(((1 - v.y) / 2) * H2);
    }
    return {
      flames: Array.from({ length: F.count }, (_, i) => F.flameBox(i)),
      where: F.where,
      pepe: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) },
    };
  });
  await page.waitForTimeout(700);
  const lit = await page.screenshot({ timeout: 400000 });
  await sharp(lit).png().toFile(`${OUT}/egg-fine-frozen-alight.png`);
  await page.evaluate(() => window.__theatre.pieces.props.fine.set(false));
  await page.waitForTimeout(700);
  const cold = await page.screenshot({ timeout: 400000 });
  await sharp(cold).png().toFile(`${OUT}/egg-fine-frozen-fine.png`);

  const A = await sharp(lit).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(cold).raw().toBuffer({ resolveWithObject: true });
  const { width: PW, height: PH, channels: ch } = A.info;
  // A FLAME'S BOX PLUS THE PEN'S OWN REACH. The ink pass derives a contour from its neighbours, so
  // a sheet standing in front of the cloth moves the cloth's line by a nib on the way past. Three
  // pixels of margin is that nib; anything outside it is a mark that was not there before.
  const PEN = 3;
  const inBox = (b, x, y, m = PEN) => x >= b.x - m && x <= b.x + b.w + m && y >= b.y - m && y <= b.y + b.h + m;
  const per = geom.flames.map(() => 0);
  let inside = 0, onPepe = 0, elsewhere = 0;
  const changed = Buffer.alloc(PW * PH);
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      const o = (y * PW + x) * ch;
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[o + c] - B.data[o + c]));
      if (d <= 8) continue;
      changed[y * PW + x] = 1;
      const hit = geom.flames.findIndex((b) => inBox(b, x, y));
      if (hit >= 0) {
        inside++;
        per[hit]++;
      } else if (inBox(geom.pepe, x, y, 0)) onPepe++;
      else elsewhere++;
    }
  // A MARK GAINED OR LOST IS A BLOCK of changed pixels; a threshold flipping on the edge of a line
  // that was already there is a scatter of single ones. Counting 2x2 blocks tells the two apart,
  // and it is the test egg-insects.js's proof settled on for the same question.
  let blocks = 0, pepeBlocks = 0;
  for (let y = 0; y < PH - 1; y++)
    for (let x = 0; x < PW - 1; x++) {
      const i = y * PW + x;
      if (!changed[i] || !changed[i + 1] || !changed[i + PW] || !changed[i + PW + 1]) continue;
      if (geom.flames.some((b) => inBox(b, x, y))) continue;
      if (inBox(geom.pepe, x, y, 0)) pepeBlocks++;
      else blocks++;
    }
  console.log(`  Pepe's own region on the glass         ${geom.pepe.w.toFixed(0)} x ${geom.pepe.h.toFixed(0)} px at ${geom.pepe.x.toFixed(0)},${geom.pepe.y.toFixed(0)}`);
  console.log(`  pixels changed inside the twelve       ${inside}   (${per.join(' ')})`);
  console.log(`  …inside Pepe and not inside a flame    ${onPepe}   in ${pepeBlocks} solid 2x2 blocks`);
  console.log(`  …anywhere else in the room             ${elsewhere}   in ${blocks} solid 2x2 blocks`);
  ok(
    per.every((p) => p > 40),
    `every one of the twelve actually drew something where the table of seats says it is (least: ${Math.min(...per)})`,
  );
  ok(pepeBlocks === 0, `HE DOES NOT REACT AT ALL: not one MARK of Pepe is different with the room alight (${onPepe} loose pixels, 0 blocks)`);
  ok(blocks === 0, `and the rest of the room is the same drawing: ${elsewhere} loose pixels, not one solid block of new mark`);
  await crop(lit, union(geom.flames), `${OUT}/egg-fine-frozen-2x.png`, { pad: 24, scale: 2 });
  ok(page.__errors.length === 0, 'the frozen frames threw nothing');
  await page.close();
}

// ---- 4. a phone, where there is no hover and the lamp is pressed and held ---------------------------
if (doing('phone')) {
console.log('\nA PHONE  (390x844, home, a finger held on the lamp)');
  await fresh();
  const [W, H] = PHONE;
  const page = await open(W, H, '&now=21:12');
  await page.evaluate(() => {
    window.__fine = [];
    window.__theatre.on('props:fine', (d) => window.__fine.push(d));
  });
  await page.waitForTimeout(700);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.fine.tapBox());
  const cx = tap.x + tap.w / 2, cy = tap.y + tap.h / 2;
  console.log(`  the target on the glass  x ${cx.toFixed(0)} y ${cy.toFixed(0)}  (${tap.w.toFixed(0)} x ${tap.h.toFixed(0)} px, a thumb's own box)`);
  await page.screenshot({ path: `${OUT}/egg-fine-phone-fine.png`, timeout: 400000 });
  await page.evaluate(() => {
    const p = window.__theatre.pieces.props;
    const real = p.update.bind(p);
    window.__go = 0;
    p.update = (c) => {
      // the same gate as the hold's, and for the same reason: the counted drawings are taken in one
      // rendered frame, and the frames that are looked at are drawn
      if (window.__go > 0 && c.clock.stepped) {
        while (window.__go > 0) {
          window.__go--;
          real(c);
        }
      }
    };
  });
  const run = async (n) => {
    await page.evaluate((k) => {
      window.__go = k;
    }, n);
    await page.waitForFunction(() => window.__go === 0, null, { timeout: 1500000, polling: 500 });
  };
  const lit = () => page.evaluate(() => ({ lit: window.__theatre.pieces.props.fine.lit, steps: window.__theatre.pieces.props.fine.steps }));
  // a HELD touch: down, hold, up — which is the only way a phone has of resting on something
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', cx, cy);
  await run(35);
  const p29 = await lit();
  await page.screenshot({ path: `${OUT}/egg-fine-phone-2s92.png`, timeout: 400000 });
  await run(1);
  await page.screenshot({ path: `${OUT}/egg-fine-phone-3s00.png`, timeout: 400000 });
  await run(66);
  const p90 = await lit();
  await page.screenshot({ path: `${OUT}/egg-fine-phone-8s50.png`, timeout: 400000 });
  console.log(`  a held finger: drawing ${p29.steps} (${(p29.steps / 12).toFixed(2)} s) → ${p29.lit} alight, drawing ${p90.steps} (${(p90.steps / 12).toFixed(2)} s) → ${p90.lit} alight`);
  console.log(`  →  ${OUT}/egg-fine-phone-2s92.png · -3s00 · -8s50 · -fine.png · -out.png`);
  ok(p29.lit === 0 && p90.lit === 12, `a held finger works the lamp exactly as a resting pointer does (2.92 s: ${p29.lit}, 8.50 s: ${p90.lit})`);
  await touch('touchEnd', cx, cy);
  await run(8);
  const gone = await page.evaluate(() => window.__theatre.pieces.props.fine.lit);
  await page.screenshot({ path: `${OUT}/egg-fine-phone-out.png`, timeout: 400000 });
  ok(gone === 0, 'and the finger lifting puts them out');
  const world2 = await world(page);
  ok(world2.placard === '', 'the placard on a phone says nothing either');
  console.log('  props:fine on the phone  ', JSON.stringify(await page.evaluate(() => window.__fine)));
  ok(page.__errors.length === 0, `the phone threw nothing${page.__errors.length ? ': ' + page.__errors[0] : ''}`);
  await page.close();
}

await browser?.close().catch(() => {});
console.log(fails.length ? `\n${fails.length} FAILED:\n  ${fails.join('\n  ')}` : '\nall of it holds');
process.exit(fails.length ? 1 : 0);
