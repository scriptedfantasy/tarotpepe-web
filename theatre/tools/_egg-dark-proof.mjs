#!/usr/bin/env node
// THE ROOM GOES OUT, DRIVEN LIKE A VISITOR (the egg in src/pieces/egg-dark.js).
//
// The user: "clicking the light behind Pepe should lead to the whole room turning black — the only
// thing the user should see is Pepe's eyes and his mouth." Nothing below asks the piece whether it
// thinks it has done that. A real pointer is put on the mushroom lamp and clicked, and what is
// measured is THE PIXELS OF THE FRAME.
//
//   1  THE LAMP ON THE GLASS, at every window this film is judged in. It is the whole affordance,
//      it is the only thing on the operator's position a pointer answers, and — unlike the
//      fireplace the fire moved onto — it IS in a phone's picture, so this egg is the one on that
//      wall a thumb can work.
//   2  THE CUT. A real click, and then the frame counted: how many of its pixels are the ink
//      value, where the ones that are not are, and whether they are his face. Three numbers decide
//      it — the room is over 99 % ink; every non-ink pixel is inside the mask's own box; and the
//      box holds an eye, an eye and a mouth, which is asserted as three separate blobs of paper
//      with black inside them and not as "some pixels changed".
//   3  NOTHING IS SAID AND NOTHING MOVES. The placard, the field, the beat, the camera, the lights
//      and the puppet across the cut — every one of them the same before and after, and the field
//      still typed into WHILE the room is out, because a visitor may be mid-sentence.
//   4  A CLICK ANYWHERE PUTS IT BACK, and it does not also throw the switch it lands on. The
//      pointer is put on the CAT — which is a lamp, and the loudest switch in the room to hit by
//      accident — and clicked. The room comes back; the cat does not come on.
//   5  TWENTY SECONDS. Counted in drawings through the same gate the fire's proof uses: at 239 the
//      room is still out, at 240 it is back, and nothing had to be clicked.
//   6  AND THE FRAME COMES BACK TO THE PIXEL. The room before and the room after, compared. A cut
//      that left one mark different would be a cut that had drawn something.
//
//   BASE=http://127.0.0.1:8739 node tools/_egg-dark-proof.mjs
//   BASE=... node tools/_egg-dark-proof.mjs --only cut,back
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const INK = [0x0d, 0x0e, 0x0d];

let bad = 0;
const ok = (cond, msg) => {
  if (!cond) bad++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${msg}`);
};
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

async function open(w, h, url) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/${url}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  page.__errors = errors;
  return page;
}
// the same gate the fire's proof runs on, and for the same reason: software WebGL draws this room
// at rather less than a frame a second, so twenty seconds of film would be twenty minutes of wall
// clock. props.update is released a counted number of drawings at a time, inside one rendered frame.
const gate = (page) =>
  page.evaluate(() => {
    const p = window.__theatre.pieces.props;
    const real = p.update.bind(p);
    window.__go = 0;
    p.update = (c) => {
      if (window.__go > 0 && c.clock.stepped) {
        while (window.__go > 0) {
          window.__go--;
          real(c);
        }
      }
    };
  });
const release = async (page, n) => {
  await page.evaluate((k) => {
    window.__go = k;
  }, n);
  await page.waitForFunction(() => window.__go === 0, null, { timeout: 1500000, polling: 400 });
};
// A FRAME, COUNTED. `ink` is how many pixels are the pen's own value (within a hair — the despeckle
// pass averages a lone pixel with its neighbours, so pure black is not quite universal), `out` how
// many non-ink pixels fall OUTSIDE the mask's box, and `blobs` how many separate runs of paper the
// box holds, which is the test that says "an eye, an eye and a mouth" rather than "some pixels".
async function count(buf, box) {
  const raw = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = raw.info;
  const near = (o, c, t) => Math.abs(raw.data[o] - c[0]) <= t && Math.abs(raw.data[o + 1] - c[1]) <= t && Math.abs(raw.data[o + 2] - c[2]) <= t;
  const bx0 = Math.floor(box[0] * W), bx1 = Math.ceil(box[2] * W);
  const by0 = Math.floor((1 - box[3]) * H), by1 = Math.ceil((1 - box[1]) * H);
  let ink = 0, out = 0, inside = 0;
  const paper = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * ch;
      if (near(o, INK, 10)) {
        ink++;
        continue;
      }
      // not ink: is it his face, or is it a piece of parlour that survived?
      const inBox = x >= bx0 && x <= bx1 && y >= by0 && y <= by1;
      if (inBox) inside++;
      else out++;
      // …and PAPER-bright pixels are what a blob is counted from: the whites of the eyes and the
      // pale of the mouth. The green of his skin and the red of his lip are not counted, so a
      // fringe of either cannot join two blobs into one.
      if (raw.data[o] > 215 && raw.data[o + 1] > 215 && raw.data[o + 2] > 210) paper[y * W + x] = 1;
    }
  // flood the paper pixels into blobs, four-connected, ignoring anything under 12 px
  const seen = new Uint8Array(W * H);
  const blobs = [];
  const stack = [];
  for (let y = by0; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++) {
      const i = y * W + x;
      if (!paper[i] || seen[i]) continue;
      let n = 0, minX = x, maxX = x, minY = y, maxY = y;
      stack.length = 0;
      stack.push(i);
      seen[i] = 1;
      while (stack.length) {
        const k = stack.pop();
        const kx = k % W, ky = (k / W) | 0;
        n++;
        if (kx < minX) minX = kx;
        if (kx > maxX) maxX = kx;
        if (ky < minY) minY = ky;
        if (ky > maxY) maxY = ky;
        for (const j of [k - 1, k + 1, k - W, k + W]) {
          if (j < 0 || j >= W * H || seen[j] || !paper[j]) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
      if (n >= 12) blobs.push({ n, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
    }
  blobs.sort((a, b) => b.n - a.n);
  return { W, H, ink, out, inside, pct: (100 * ink) / (W * H), blobs, box: [bx0, by0, bx1 - bx0, by1 - by0] };
}

// ---- 1. the lamp on the glass ------------------------------------------------------------------
if (doing('lamp')) {
  await fresh();
  console.log('\nTHE LAMP, WHICH IS THE WHOLE AFFORDANCE  (and unlike the fireplace, a phone has it)');
  for (const [W, H] of [PLATE, [1600, 900], PHONE]) {
    const page = await open(W, H, '?view=props&state=default&shot=1');
    await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(() => {
      const D = window.__theatre.pieces.props.dark;
      return { hit: D.hitBox(), tap: D.tapBox() };
    });
    const b = m.hit, t = m.tap;
    const whole = t.x >= 0 && t.y >= 0 && t.x + t.w <= W && t.y + t.h <= H;
    console.log(
      `  ${String(W + 'x' + H).padEnd(9)} lamp ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
        `  tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ''}  ${whole ? 'IN SHOT' : 'OUT OF FRAME'}`,
    );
    ok(whole && t.w >= 44 && t.h >= 44, `the lamp is whole in the picture at ${W}x${H}, with a thumb's box round it`);
    await page.close();
  }
}

// ---- 2. the cut, and what is left of the room ---------------------------------------------------
let darkShot = null;
if (doing('cut')) {
  await fresh();
  console.log('\nTHE CUT  (1280x800, home, a real click on the lamp)');
  const [W, H] = PLATE;
  const page = await open(W, H, '?view=props&state=default');
  await page.evaluate(() => {
    window.__dark = [];
    window.__theatre.on('props:dark', (d) => window.__dark.push(d));
  });
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const before = await page.screenshot({ timeout: 400000 });
  // …AND THE SAME ROOM AGAIN, a drawing later, with nothing touched. This is the BOIL'S OWN SHARE
  // of a frame — the pen re-rolls on twos (ink.js, `seed`), so a held line is never the same line
  // twice and two frames of the same parlour never agree to the pixel. It is measured here, in
  // this run, on this machine, and the coming-back test below is asked against it rather than
  // against a number somebody wrote down once.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const before2 = await page.screenshot({ timeout: 400000 });
  const tap = await page.evaluate(() => window.__theatre.pieces.props.dark.tapBox());
  const cx = tap.x + tap.w / 2, cy = tap.y + tap.h / 2;
  console.log(`  the target on the glass  x ${cx.toFixed(0)} y ${cy.toFixed(0)}  (${tap.w.toFixed(0)} x ${tap.h.toFixed(0)} px)`);
  await page.mouse.click(cx, cy);
  await page.waitForFunction(() => window.__theatre.pieces.props.dark.on === true, null, { timeout: 120000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  darkShot = await page.screenshot({ timeout: 400000 });
  await sharp(darkShot).png().toFile(`${OUT}/egg-dark-out.png`);
  await sharp(before).png().toFile(`${OUT}/egg-dark-lit.png`);
  const box = await page.evaluate(() => window.__theatre.pieces.props.dark.box);
  const grow = await page.evaluate(() => window.__theatre.pieces.props.dark.grow);
  const c = await count(darkShot, box);
  console.log(`  the mask's box    ${c.box[2]} x ${c.box[3]} px at ${c.box[0]},${c.box[1]}   dilated ${grow.toFixed(1)} css px`);
  console.log(`  the frame         ${c.pct.toFixed(2)}% of it is the pen's own ink`);
  console.log(`  not ink           ${c.inside} px inside the mask's box, ${c.out} px anywhere else`);
  console.log(`  blobs of paper    ${c.blobs.slice(0, 5).map((b) => `${b.w}x${b.h} (${b.n} px)`).join(' · ')}`);
  console.log(`  →  ${OUT}/egg-dark-lit.png · egg-dark-out.png`);
  ok(c.pct > 99, `the room is out: ${c.pct.toFixed(2)}% of the frame is solid ink`);
  ok(c.out === 0, `and not one pixel of parlour survives outside his face (${c.out} px)`);
  ok(c.inside > 200, `his face is still drawn, and it is drawn and not merely lit (${c.inside} px of it)`);
  ok(c.blobs.length >= 3, `THREE things are left on the black and not one: ${c.blobs.length} separate blobs of paper — an eye, an eye and a mouth`);
  ok(
    c.blobs.slice(0, 3).every((b) => b.w >= 4 && b.h >= 3),
    `and every one of the three is a SHAPE and not a speck (${c.blobs.slice(0, 3).map((b) => b.w + 'x' + b.h).join(', ')})`,
  );
  ok((await page.evaluate(() => window.__dark)).length === 1, 'one `props:dark` on the bus, and nothing in the room listens to it');
  ok(page.__errors.length === 0, `the cut threw nothing${page.__errors.length ? ': ' + page.__errors[0] : ''}`);

  // ---- 6. and it comes back to the pixel --------------------------------------------------------
  await page.evaluate(() => window.__theatre.pieces.props.dark.toggle());
  await page.waitForFunction(() => window.__theatre.pieces.props.dark.on === false, null, { timeout: 120000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const after = await page.screenshot({ timeout: 400000 });
  const differ = async (p, q) => {
    const A = await sharp(p).raw().toBuffer({ resolveWithObject: true });
    const B = await sharp(q).raw().toBuffer({ resolveWithObject: true });
    let n = 0;
    for (let i = 0; i < A.data.length; i += A.info.channels) if (Math.abs(A.data[i] - B.data[i]) > 24) n++;
    return (100 * n) / (A.info.width * A.info.height);
  };
  const boil = await differ(before, before2);
  const back = await differ(before, after);
  console.log(`  two frames of the same lit room    ${boil.toFixed(3)}% of pixels differ — the pen's own boil`);
  console.log(`  the room before and the room after ${back.toFixed(3)}%`);
  // NOT ZERO, AND IT MUST NOT BE: a frame that agreed to the pixel would be a frame in which the
  // pen had stopped re-rolling. What is asserted is that going out and coming back costs NO MORE
  // than two drawings of the same room already cost — no mark missing, none new, nothing moved.
  ok(back <= boil * 1.35 + 0.5, `and the room came back as it was: ${back.toFixed(3)}% differ against the boil's own ${boil.toFixed(3)}%`);
  await page.close();
}

// ---- 3. nothing is said, and the field stays usable ---------------------------------------------
if (doing('quiet')) {
  await fresh();
  console.log('\nNOTHING IS SAID  (1280x800, a whole evening: the door, the greeting, then the lamp)');
  const [W, H] = PLATE;
  const page = await open(W, H, '?now=21:12');
  await page.mouse.click(W / 2, H / 2); // the door
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 300000 });
  const say = (p) => p.evaluate(() => (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim());
  const state = (p) =>
    p.evaluate(() => ({
      placard: (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim(),
      field: !!document.querySelector('#dialogue input'),
      asking: window.__theatre.pieces.dialogue.asking,
      beat: window.__theatre.pieces.flow.beat,
      shot: window.__theatre.pieces.camera.current,
      key: +window.__theatre.pieces.lighting.key.intensity.toFixed(3),
      head: window.__theatre.pieces.pepe.head.position.toArray().map((n) => +n.toFixed(4)),
    }));
  // THE VISITOR IS HALF-WAY THROUGH A SENTENCE when they try the lamp, and the snapshot is taken
  // WITH those words in the field: the placard's own text is read out of the DOM and the field is
  // part of that DOM, so a baseline taken before the typing would be a baseline of a different
  // placard and this test would fail on the visitor rather than on the egg.
  await page.evaluate(() => {
    const i = document.querySelector('#dialogue input');
    i.value = 'i was going to say';
    i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const was = await state(page);
  console.log(`  the field is open under his greeting, with a half-typed line in it: "${was.placard.slice(0, 80)}"`);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.dark.tapBox());
  await page.mouse.click(tap.x + tap.w / 2, tap.y + tap.h / 2);
  await page.waitForFunction(() => window.__theatre.pieces.props.dark.on === true, null, { timeout: 120000 });
  const now = await state(page);
  const typed = await page.evaluate(() => document.querySelector('#dialogue input')?.value ?? null);
  console.log(`  with the room out: beat "${now.beat}", shot "${now.shot}", the placard "${now.placard.slice(0, 50)}"`);
  ok(now.placard === was.placard, 'the placard says exactly what it said: no line, no remark, nothing announced');
  ok(now.asking && now.field, 'and the field is still there and still open: a visitor may be mid-sentence');
  ok(typed === 'i was going to say', `…with what they had typed still in it (${JSON.stringify(typed)})`);
  ok(now.beat === was.beat, `the flow did not take a turn on it (${now.beat})`);
  ok(now.shot === was.shot, `the camera did not move (${now.shot})`);
  ok(now.key === was.key && JSON.stringify(now.head) === JSON.stringify(was.head), 'and not one light was touched and not one bone of him moved: the room is not dark, it is DRAWN dark');
  // …and the field still takes a keystroke while the room is out
  await page.evaluate(() => {
    const i = document.querySelector('#dialogue input');
    i.focus();
    i.value = i.value + ' something';
    i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const typed2 = await page.evaluate(() => document.querySelector('#dialogue input')?.value ?? null);
  ok(typed2 === 'i was going to say something', `and it still takes a keystroke in the dark (${JSON.stringify(typed2)})`);
  ok(page.__errors.length === 0, `the evening threw nothing${page.__errors.length ? ': ' + page.__errors[0] : ''}`);
  await page.close();
}

// ---- 4. a click anywhere puts it back, and throws nothing ---------------------------------------
if (doing('back')) {
  await fresh();
  console.log('\nA CLICK ANYWHERE  (1280x800, home: the room is put out, and then the CAT is clicked)');
  const [W, H] = PLATE;
  const page = await open(W, H, '?view=props&state=default');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const boxes = await page.evaluate(() => ({
    lamp: window.__theatre.pieces.props.dark.tapBox(),
    cat: window.__theatre.pieces.props.cat.tapBox(),
    lit: window.__theatre.pieces.props.cat.lit,
  }));
  console.log(`  the cat's own box  ${boxes.cat.w.toFixed(0)} x ${boxes.cat.h.toFixed(0)} px at ${boxes.cat.x.toFixed(0)},${boxes.cat.y.toFixed(0)}  (its lamp is ${boxes.lit ? 'ON' : 'off'})`);
  await page.mouse.click(boxes.lamp.x + boxes.lamp.w / 2, boxes.lamp.y + boxes.lamp.h / 2);
  await page.waitForFunction(() => window.__theatre.pieces.props.dark.on === true, null, { timeout: 120000 });
  // …and now a click on the cat, which in a lit room would switch it on
  await page.mouse.click(boxes.cat.x + boxes.cat.w / 2, boxes.cat.y + boxes.cat.h / 2);
  await page.waitForFunction(() => window.__theatre.pieces.props.dark.on === false, null, { timeout: 120000 });
  const after = await page.evaluate(() => ({ dark: window.__theatre.pieces.props.dark.on, cat: window.__theatre.pieces.props.cat.lit }));
  ok(after.dark === false, 'a click anywhere on the glass brings the room back');
  ok(after.cat === false, 'and it does NOT also throw the switch it landed on: you cannot work a room you cannot see');
  // …and the cat still works once the room is back
  await page.mouse.click(boxes.cat.x + boxes.cat.w / 2, boxes.cat.y + boxes.cat.h / 2);
  await page.waitForFunction(() => window.__theatre.pieces.props.cat.lit === true, null, { timeout: 120000 }).catch(() => {});
  ok(await page.evaluate(() => window.__theatre.pieces.props.cat.lit), 'and the next click after that works the cat exactly as it always did');
  ok(page.__errors.length === 0, `the clicks threw nothing${page.__errors.length ? ': ' + page.__errors[0] : ''}`);
  await page.close();
}

// ---- 5. twenty seconds -------------------------------------------------------------------------
if (doing('life')) {
  await fresh();
  console.log('\nTWENTY SECONDS  (1280x800, home, counted in drawings through the gate)');
  const page = await open(PLATE[0], PLATE[1], '?view=props&state=default');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const life = await page.evaluate(() => window.__theatre.pieces.props.dark.life);
  await gate(page);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.dark.tapBox());
  await page.mouse.click(tap.x + tap.w / 2, tap.y + tap.h / 2);
  await release(page, 1); // the cut lands on the next drawing
  const cut = await page.evaluate(() => ({ on: window.__theatre.pieces.props.dark.on, steps: window.__theatre.pieces.props.dark.steps }));
  ok(cut.on, `the cut lands on the NEXT drawing and not on the click (drawing ${cut.steps})`);
  await release(page, life - 1);
  const nearly = await page.evaluate(() => ({ on: window.__theatre.pieces.props.dark.on, held: +window.__theatre.pieces.props.dark.held.toFixed(2) }));
  console.log(`  at drawing ${life - 1} (${nearly.held.toFixed(2)} s): the room is ${nearly.on ? 'still out' : 'back'}`);
  ok(nearly.on, `one drawing short of the twentieth second the room is still out (${nearly.held.toFixed(2)} s)`);
  await release(page, 1);
  const done = await page.evaluate(() => window.__theatre.pieces.props.dark.on);
  console.log(`  at drawing ${life} (${(life / 12).toFixed(2)} s): the room is ${done ? 'still out' : 'back'}`);
  ok(!done, `and on the ${life}th it comes back on its own, with nothing clicked (${(life / 12).toFixed(2)} s at twelve)`);
  ok(page.__errors.length === 0, `the twenty seconds threw nothing${page.__errors.length ? ': ' + page.__errors[0] : ''}`);
  await page.close();
}

await browser?.close().catch(() => {});
console.log(bad ? `\n${bad} FAILED` : '\nevery check holds');
process.exit(bad ? 1 : 0);
