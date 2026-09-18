#!/usr/bin/env node
// THE CROSS OVER THE DOOR AND THE FLOOR UNDER IT, DRIVEN LIKE A VISITOR.
// (src/pieces/egg-cross.js round 5, src/pieces/egg-cellar.js)
//
// Nothing here reads the egg's own idea of what happened. Every question is put to the piece that
// owns the answer — what the camera calls its shot, what the switch arbiter says is under a pointer,
// what dialogue was handed, what went out on the wire — or to the PIXELS, which is where the whole
// of this round's brief actually lives: a cross that is upside down, a hole with a stair in it, a
// red that is in the hole and nowhere else in the room.
//
//   THE CROSS       its box at the home plate and on a 390-wide phone, the ink inside it, and the
//                   arbiter answering a pointer on it.
//   THE FALL        a real click, and then the whole thing released ONE DRAWING AT A TIME through a
//                   gate on props.update — the piece's own update on the piece's own clock, with
//                   only the renderer skipped. The cross is measured on the GLASS, twice: its ink
//                   above and below the pin it swings on, and the ink in the top half of its own box
//                   against the bottom half, which is the arm moving from a third of the way down to
//                   a third of the way up. One says it fell; the other says it turned.
//   THE HATCH       the hole open with the stair in it (the ink inside the mouth), the floor mesh
//                   with a real hole in its index, and a 3x crop of the flight.
//   THE RED         found by a test that keeps both of this egg's tones and throws away the fire's
//                   yellow, the fire's orange and his own mouth: counted inside the hatch, counted
//                   in the room beyond it, and counted in a whole `wide` frame with the hatch open.
//   HIS LINE        a whole evening, no ?view: the door, the greeting, then the cross. The event,
//                   the beat on the wire, and what stood on the placard.
//   BACK            the second click, and the room compared with itself pixel for pixel on a frozen
//                   clock, so the boil cannot differ and the only thing that can is the floor.
//   THE DAY         the doorway place still opens the door by hand onto the crossroads.
//   THE CUES        the four new voices rendered offline through the code the room plays them with.
//
//   BASE=http://127.0.0.1:8745 node tools/_egg-cross-proof.mjs [--out DIR] [--only fall,red]
//   sections: cross · fall · hatch · red · line · back · day · sound
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = resolve(args.out ?? '/tmp/cellar');
mkdirSync(OUT, { recursive: true });

const PLATE = [1280, 800];
const PHONE = [390, 844];
const LAUNCH = {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
};
const ONLY = args.only ? String(args.only).split(',') : null;
const doing = (n) => !ONLY || ONLY.includes(n);
// HOW LONG A PAGE IS GIVEN TO BE READY, and it is a machine fact and not a claim about this room.
// tools/check-views.mjs carries the same knob and says why: this machine is shared with several
// builders' headless browsers, and a page that takes three minutes to load under a load average of
// two hundred has not thrown anything, it has been waiting for a CPU. The first run of this file
// died exactly there — the phone page, at 240 s, with the room drawing perfectly on the laptop page
// beside it. Ten minutes by default, and PROOF_TIMEOUT for a machine that wants more.
const T_LOAD = +(process.env.PROOF_TIMEOUT ?? 600000);
// one browser a section: software WebGL takes a chromium down somewhere around the sixth context,
// and a section that dies then should cost only itself (egg-fine.js's proof paid for this)
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
  await page.goto(`${BASE}/?view=props&state=default${query}`, { waitUntil: 'load', timeout: T_LOAD });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: T_LOAD });
  // ?view=props boots on the WIDE plate; the cut to home needs a frame before anything is projected
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(() => window.__theatre.camera.updateMatrixWorld(true));
  page.__errors = errors;
  return page;
}
// …and the same page with NO ?view and NO ?shot: the whole evening, which is the only way the
// placard says anything at all (main.js starts the flow only when nothing is being judged)
async function evening(w, h, query = '') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const errors = [];
  const posts = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/pepe')) {
      try {
        posts.push(JSON.parse(r.postData() ?? '{}'));
      } catch {
        posts.push(null);
      }
    }
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/?now=21:12${query}`, { waitUntil: 'load', timeout: T_LOAD });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: T_LOAD });
  page.__errors = errors;
  page.__posts = posts;
  return page;
}

// THE GATE. Software WebGL renders this room at rather less than a frame a second, so a fall that
// runs four seconds of film is four seconds of nothing followed by everything at once. props.update
// is put behind a gate and released a counted number of drawings at a time inside ONE rendered
// frame: it is the piece's own update, called by main's own loop, and the drawings that are skipped
// are skipped by the RENDERER and not by the cross. It works because the cross counts drawings it
// has been given and not seconds off the wall.
//
// AND THE CAMERA IS INSIDE THE GATE, because the room LEANS IN while the boards are still moving and
// the lean is stepped on the same twelve the lid is (camera.js's dolly counts drawings it has been
// given, not seconds). Gating props alone would have released the whole of the hatch inside one
// rendered frame while the camera advanced exactly one drawing of its move.
const gate = (page) =>
  page.evaluate(() => {
    const T = window.__theatre;
    const p = T.pieces.props, k = T.pieces.camera;
    const realP = p.update.bind(p), realK = k.update.bind(k);
    window.__go = 0;
    window.__ungate = () => {
      p.update = realP;
      k.update = realK;
    };
    k.update = () => {}; // main.js's own call to it becomes a no-op: the gate drives it
    p.update = (c) => {
      if (window.__go > 0 && c.clock.stepped) {
        while (window.__go > 0) {
          window.__go--;
          realP(c);
          realK(c);
        }
      }
    };
  });
const release = async (page, n) => {
  await page.evaluate((k) => {
    window.__go = k;
  }, n);
  await page.waitForFunction(() => window.__go === 0, null, { timeout: 1500000, polling: 200 });
};
const settle = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
// release until the piece says it has arrived somewhere, and count the drawings it took. The number
// of drawings between the click and the hatch standing open is the fall plus a beat plus the lid,
// which is three numbers this file has no business hard-coding. The piece is asked.
async function until(page, test, cap = 160) {
  let n = 0;
  for (; n < cap; n += 1) {
    if (await page.evaluate(test)) return n;
    await release(page, 1);
  }
  return n;
}

// everything that is NOT the egg, asked of the pieces that own it
const world = (p) =>
  p.evaluate(() => {
    const T = window.__theatre, L = T.pieces.lighting, C = T.pieces.props.cross;
    return {
      phase: C.phase,
      open: C.open,
      frame: C.frame,
      cross: C.cross,
      leaf: C.leaf,
      pendant: C.pendant,
      out: C.out,
      sky: C.sky,
      leaning: C.leaning,
      lid: C.cellar.lid,
      holed: C.cellar.holed,
      hatchOpen: C.cellar.open,
      shot: T.pieces.camera.current,
      moving: T.pieces.camera.moving,
      eye: T.camera.position.toArray().map((v) => +v.toFixed(3)),
      fov: +T.camera.fov.toFixed(2),
      light: { state: L.state, key: +L.key.intensity.toFixed(3), night: !!L.night?.visible },
      rain: T.pieces.props.rain?.on ?? null,
    };
  });

const snap = async (page, path) => {
  for (let i = 0; i < 3; i++) {
    try {
      await page.screenshot({ path, timeout: 300000 });
      return path;
    } catch (e) {
      console.log(`   (no frame, try ${i + 1}/3: ${String(e).split('\n')[0]})`);
      await page.waitForTimeout(2500);
    }
  }
  throw new Error(`no frame for ${path}`);
};
const shot = async (page) => {
  for (let i = 0; i < 3; i++) {
    try {
      return await page.screenshot({ timeout: 300000 });
    } catch {
      await page.waitForTimeout(2500);
    }
  }
  throw new Error('no frame');
};
async function crop(buf, box, out, { pad = 16, scale = 2 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.max(8, Math.min(meta.width - left, Math.round(box.w + pad * 2)));
  const height = Math.max(8, Math.min(meta.height - top, Math.round(box.h + pad * 2)));
  await sharp(buf).extract({ left, top, width, height }).resize({ width: width * scale, height: height * scale, kernel: 'nearest' }).png().toFile(out);
  return { left, top, width, height };
}
// A STRIP OF A MOVE, which is the only way to look at one: every drawing labelled with where in the
// fall it was taken, laid out four to a row at a quarter size so the whole thing reads left to right
// as a strip of drawings.
async function sheet(frames, file, cols, W, H) {
  const tw = Math.round(W / 4), th = Math.round(H / 4), gap = 6, lab = 15;
  const rows = Math.ceil(frames.length / cols);
  const comps = [];
  for (let i = 0; i < frames.length; i++) {
    comps.push({
      input: await sharp(frames[i].buf).resize(tw, th).png().toBuffer(),
      left: (i % cols) * (tw + gap) + gap,
      top: Math.floor(i / cols) * (th + gap + lab) + gap,
    });
    const txt = `<svg width="${tw}" height="${lab}"><text x="2" y="${lab - 4}" font-family="monospace" font-size="11" fill="#f8f9f4">${frames[i].at}</text></svg>`;
    comps.push({ input: Buffer.from(txt), left: (i % cols) * (tw + gap) + gap, top: Math.floor(i / cols) * (th + gap + lab) + gap + th });
  }
  await sharp({ create: { width: cols * (tw + gap) + gap, height: rows * (th + gap + lab) + gap, channels: 3, background: '#2b2b2b' } })
    .composite(comps)
    .png()
    .toFile(file);
  return file;
}
const rawOf = async (buf) => {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
};
// how many pixels differ between two frames, and where
const diff = (a, b, thresh = 10) => {
  let n = 0;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < a.h; y++)
    for (let x = 0; x < a.w; x++) {
      const i = (y * a.w + x) * a.ch;
      if (Math.abs(a.data[i] - b.data[i]) > thresh || Math.abs(a.data[i + 1] - b.data[i + 1]) > thresh || Math.abs(a.data[i + 2] - b.data[i + 2]) > thresh) {
        n++;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  return { n, box: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
};
// how much of a box is ink: the film's paper is #f8f9f4, so anything under 160 is a mark
const inkIn = (img, b) => {
  let dark = 0, n = 0;
  const x0 = Math.max(0, Math.floor(b.x)), x1 = Math.min(img.w, Math.ceil(b.x + b.w));
  const y0 = Math.max(0, Math.floor(b.y)), y1 = Math.min(img.h, Math.ceil(b.y + b.h));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * img.w + x) * img.ch;
      if (img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11 < 160) dark++;
      n++;
    }
  return { pct: n ? +((100 * dark) / n).toFixed(2) : 0, px: dark, of: n };
};
// ---- THE RED TEST, AND IT IS THE WHOLE OF SECTION 4 --------------------------------------------
// Three clauses, and each one throws away a colour this room already has.
//   r is the largest channel            throws away his skin, #69b964, where green is.
//   saturation (max-min)/max >= 0.55    throws away his MOUTH, #d37a6c, which measures 0.49 — the
//                                       one colour in the film a pale red could be confused with,
//                                       and the reason egg-cellar.js carries two tones and not the
//                                       three it started with.
//   |g - b| <= 0.25 * (r - min)         throws away the FIRE, both of it: #f2b829 is 143 against a
//                                       bound of 50 and #e0561d is 57 against 49. A red has green
//                                       and blue nearly level; an orange does not, and a yellow is
//                                       not close.
// What it keeps: #b4241d at saturation 0.84 and #c14f48 at 0.63, which are the two tones the cellar
// is drawn in and the only two.
const isRed = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (r !== max || max < 60) return false;
  if ((max - min) / max < 0.55) return false;
  return Math.abs(g - b) <= 0.25 * (r - min);
};
const redIn = (img, b = null) => {
  const x0 = b ? Math.max(0, Math.floor(b.x)) : 0, x1 = b ? Math.min(img.w, Math.ceil(b.x + b.w)) : img.w;
  const y0 = b ? Math.max(0, Math.floor(b.y)) : 0, y1 = b ? Math.min(img.h, Math.ceil(b.y + b.h)) : img.h;
  let n = 0;
  let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * img.w + x) * img.ch;
      if (!isRed(img.data[i], img.data[i + 1], img.data[i + 2])) continue;
      n++;
      if (x < bx0) bx0 = x;
      if (y < by0) by0 = y;
      if (x > bx1) bx1 = x;
      if (y > by1) by1 = y;
    }
  return { n, box: bx1 < 0 ? null : { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 } };
};
// …and the same count with one rectangle cut OUT of it, which is how "and nowhere else" is weighed
const redOutside = (img, keep) => {
  let n = 0;
  const at = [];
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (keep && x >= keep.x && x <= keep.x + keep.w && y >= keep.y && y <= keep.y + keep.h) continue;
      const i = (y * img.w + x) * img.ch;
      if (!isRed(img.data[i], img.data[i + 1], img.data[i + 2])) continue;
      n++;
      if (at.length < 6) at.push(`${x},${y}`);
    }
  return { n, at };
};
const placardText = (p) => p.evaluate(() => (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim());

const fails = [];
const ok = (cond, line) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};
const box1 = (b) => (b ? `${b.w.toFixed(0)} x ${b.h.toFixed(0)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` : 'nowhere');
const inFrame = (b, w, h) => !!b && b.x + b.w > 0 && b.x < w && b.y + b.h > 0 && b.y < h;
const wholly = (b, w, h) => !!b && b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h;

// =================================================================================================
// 1. THE CROSS, WHICH IS THE WHOLE AFFORDANCE
// =================================================================================================
if (doing('cross')) {
  console.log('\nTHE CROSS ON THE FRIEZE  (home plate 1280x800, and a 390-wide phone)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);
  const b = await page.evaluate(() => ({
    hit: window.__theatre.pieces.props.cross.hitBox(),
    tap: window.__theatre.pieces.props.cross.tapBox(),
    cross: window.__theatre.pieces.props.cross.cross,
  }));
  console.log(`  the cross itself      ${box1(b.hit)}`);
  console.log(`  the box a thumb gets  ${box1(b.tap)}${b.tap?.grown ? '  (grown to 44 px)' : ''}`);
  console.log(`  it hangs at           ${b.cross.degrees} deg, on a pin at [${b.cross.pin.join(', ')}]`);
  ok(wholly(b.hit, W, H), 'it is WHOLLY inside the home plate — nothing of it is cut by the frame');
  ok(b.cross.degrees === 0 && !b.cross.inverted, 'and it is the right way up until somebody touches it');
  const buf = await shot(page);
  await snap(page, `${OUT}/cross-r5-room-1280x800.png`);
  await crop(buf, b.hit, `${OUT}/cross-r5-cross-4x.png`, { pad: 22, scale: 4 });
  const img = await rawOf(buf);
  const ink = inkIn(img, b.hit);
  console.log(`  ink inside its box    ${ink.pct}%   →  ${OUT}/cross-r5-cross-4x.png`);
  ok(ink.pct > 4 && ink.pct < 40, `it is two strokes, a nail and a pin, and not a blot (${ink.pct}% of its box is ink)`);
  // …and it answers a pointer where it is drawn, which is what makes it a switch and not a picture
  const hovered = await page.evaluate(async (t) => {
    const g = window.__theatre.renderer.domElement, r = g.getBoundingClientRect();
    g.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + t.x + t.w / 2, clientY: r.top + t.y + t.h / 2, bubbles: true, pointerType: 'mouse' }));
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return { name: window.__theatre.pieces.props.switches.hovered, cursor: g.style.cursor };
  }, b.tap);
  ok(hovered.name === 'cross' && hovered.cursor === 'pointer', `the pointer over it is the whole affordance: the arbiter says "${hovered.name}", cursor "${hovered.cursor}"`);
  // NOTHING ANNOUNCES THE FLOOR. The hatch is not in the room until the cross has been touched, so
  // there is nothing on the boards to point at and the arbiter has nothing to answer.
  const quiet = await page.evaluate(() => ({ hatch: window.__theatre.pieces.props.cross.cellar.hitBox(), holed: window.__theatre.pieces.props.cross.cellar.holed }));
  ok(quiet.hatch === null && !quiet.holed, 'and the floor is a floor: no hatch on the glass, no hole in the mesh');

  const p2 = await open(...PHONE);
  const b2 = await p2.evaluate(() => ({ tap: window.__theatre.pieces.props.cross.tapBox(), door: window.__theatre.pieces.props.cross.doorBox() }));
  await snap(p2, `${OUT}/cross-r5-room-390x844.png`);
  console.log(`  ON A 390-WIDE PHONE   the cross ${box1(b2.tap)} — ${inFrame(b2.tap, ...PHONE) ? 'in frame' : 'OUTSIDE THE FRAME'}`);
  console.log('  (this is a fact about the ROOM and not about the egg: at 390 px the home plate holds');
  console.log('   x -0.9944 to +0.9944 of the back wall, and the door runs 1.05 to 1.95, so the doorway');
  console.log('   is just outside it.)');
  // …AND THE SAME CROSS UPSIDE DOWN ON A PHONE, SEEN FROM THE CHAIR, which is the only frame the two
  // can be compared in — and it is DRIVEN and not set, for a reason worth writing down. `set('open')`
  // is a still, and a still in this piece re-asserts its own frame on every drawing (egg-cross.js:
  // props.setState runs the eggs in order and a judging state that takes the lens can have it taken
  // back by one further down the list), so cutting the camera home after it lasts exactly one drawing
  // before the piece puts it on the cellar again. Released one drawing at a time instead, the cross
  // is over by drawing nine and the lens has not moved yet: the lean does not start until the boards
  // do, six drawings later.
  await gate(p2);
  await p2.evaluate(() => window.__theatre.pieces.props.cross.click());
  const nInv = await until(p2, () => window.__theatre.pieces.props.cross.cross.inverted);
  await settle(p2);
  const inv2 = await p2.evaluate(() => {
    const C = window.__theatre.pieces.props.cross;
    return { deg: C.cross.degrees, box: C.hitBox(), phase: C.phase, shot: window.__theatre.pieces.camera.current };
  });
  await snap(p2, `${OUT}/cross-r5-inverted-390x844.png`);
  console.log(`  ON A 390-WIDE PHONE   inverted at ${inv2.deg} deg after ${nInv} drawings, ${box1(inv2.box)} — ${inFrame(inv2.box, ...PHONE) ? 'in frame' : 'outside the frame'}, camera still "${inv2.shot}"`);
  ok(inv2.shot === 'home' && inv2.phase === 'falling', 'and the lens has not moved yet: the room does not lean in until the boards do');
  await p2.evaluate(() => {
    window.__ungate?.();
    window.__theatre.pieces.props.cross.set('shut');
  });
  ok((page.__errors ?? []).length === 0 && (p2.__errors ?? []).length === 0, `no page errors (${[...page.__errors, ...p2.__errors].slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 2. THE FALL: A REAL CLICK, AND THE CROSS ENDS UP UPSIDE DOWN
// =================================================================================================
if (doing('fall')) {
  console.log('\nTHE FALL  (a real pointer on the cross, then one drawing at a time)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);
  await gate(page);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.cross.tapBox());

  // BEFORE. The cross's box, and the pin it will swing on, both on the glass.
  const before = await shot(page);
  const beforeImg = await rawOf(before);
  // the pin, projected BY HAND off the camera's own two matrices — it is the one point in the room
  // this whole egg turns about, and the arithmetic is four lines rather than a reach into THREE
  const PIN_ON_GLASS = `(() => {
    const T = window.__theatre, C = T.pieces.props.cross;
    T.camera.updateMatrixWorld(true);
    const e = T.camera.projectionMatrix.clone().multiply(T.camera.matrixWorldInverse).elements;
    const [x, y, z] = C.cross.pin;
    const cx = e[0]*x + e[4]*y + e[8]*z + e[12];
    const cy = e[1]*x + e[5]*y + e[9]*z + e[13];
    const cw = e[3]*x + e[7]*y + e[11]*z + e[15];
    return { box: C.hitBox(), pin: { x: ((cx/cw + 1) / 2) * T.size.w, y: ((1 - cy/cw) / 2) * T.size.h } };
  })()`;
  const b0 = await page.evaluate(PIN_ON_GLASS);
  const half = (box, pinY, top) => (top ? { x: box.x, y: box.y, w: box.w, h: Math.max(1, pinY - box.y) } : { x: box.x, y: pinY, w: box.w, h: Math.max(1, box.y + box.h - pinY) });
  const midOf = (box, top) => (top ? { ...box, h: box.h / 2 } : { ...box, y: box.y + box.h / 2, h: box.h / 2 });
  const upBefore = inkIn(beforeImg, half(b0.box, b0.pin.y, true)).px;
  const downBefore = inkIn(beforeImg, half(b0.box, b0.pin.y, false)).px;
  const topBefore = inkIn(beforeImg, midOf(b0.box, true)).px;
  const botBefore = inkIn(beforeImg, midOf(b0.box, false)).px;

  // a real pointer, on the cross's own box
  const started = await page.evaluate(async (t) => {
    const g = window.__theatre.renderer.domElement, r = g.getBoundingClientRect();
    const o = { clientX: r.left + t.x + t.w / 2, clientY: r.top + t.y + t.h / 2, bubbles: true, pointerType: 'mouse', button: 0 };
    g.dispatchEvent(new PointerEvent('pointermove', o));
    g.dispatchEvent(new PointerEvent('pointerdown', o));
    g.dispatchEvent(new PointerEvent('pointerup', o));
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return window.__theatre.pieces.props.cross.phase;
  }, tap);
  ok(started === 'falling', `a real click on the drawing starts it (phase "${started}")`);

  // the strip: every second drawing of the fall, labelled with the angle the piece says it is at
  const strip = [];
  const table = await page.evaluate(() => window.__theatre.pieces.props.cross.schedule.fall);
  console.log(`  the pose table        ${table.join(', ')}  (${table.length} drawings, one pose each)`);
  for (let i = 0; i <= 12; i += 2) {
    const w = await world(page);
    strip.push({ at: `dr ${i} — ${w.cross.degrees} deg`, buf: await shot(page) });
    if (i === 4) await snap(page, `${OUT}/cross-r5-mid-swing-1280x800.png`);
    await release(page, 2);
  }
  await sheet(strip, `${OUT}/cross-r5-fall-sheet.png`, 4, W, H);
  console.log(`  every second drawing of it  →  ${OUT}/cross-r5-fall-sheet.png`);

  // let it settle where the cross is over and the boards have not started
  const n = await until(page, () => window.__theatre.pieces.props.cross.cross.inverted && window.__theatre.pieces.props.cross.phase === 'falling');
  await settle(page);
  const w1 = await world(page);
  const after = await shot(page);
  await snap(page, `${OUT}/cross-r5-inverted-1280x800.png`);
  const afterImg = await rawOf(after);
  const b1 = await page.evaluate(PIN_ON_GLASS);
  await crop(after, b1.box, `${OUT}/cross-r5-inverted-4x.png`, { pad: 22, scale: 4 });
  const upAfter = inkIn(afterImg, half(b1.box, b1.pin.y, true)).px;
  const downAfter = inkIn(afterImg, half(b1.box, b1.pin.y, false)).px;
  const topAfter = inkIn(afterImg, midOf(b1.box, true)).px;
  const botAfter = inkIn(afterImg, midOf(b1.box, false)).px;

  console.log(`  it is at ${w1.cross.degrees} deg after ${n} drawings of release`);
  console.log(`  ITS BOX MOVED         ${box1(b0.box)}  →  ${box1(b1.box)}`);
  console.log(`  ABOUT THE PIN, in ink px above / below the fixing on the glass (pin at y ${b0.pin.y.toFixed(1)} → ${b1.pin.y.toFixed(1)}):`);
  console.log(`      before   ${upBefore} above, ${downBefore} below`);
  console.log(`      after    ${upAfter} above, ${downAfter} below`);
  ok(upBefore > downBefore * 4, `before, the cross hangs ABOVE its lower fixing (${upBefore} against ${downBefore})`);
  ok(downAfter > upAfter * 4, `after, it hangs BELOW it (${downAfter} against ${upAfter})`);
  console.log('  AND THE SHAPE IS INVERTED, which is the other half of it and the half that is about the');
  console.log('  drawing rather than the drop: the arm is a third of the way DOWN the cross, so the top');
  console.log('  half of its own box carries the arm and the head, and the bottom half carries a stick.');
  console.log(`      before   ${topBefore} in the top half, ${botBefore} in the bottom  (ratio ${(topBefore / Math.max(1, botBefore)).toFixed(2)})`);
  console.log(`      after    ${topAfter} in the top half, ${botAfter} in the bottom  (ratio ${(topAfter / Math.max(1, botAfter)).toFixed(2)})`);
  ok(topBefore > botBefore * 1.25, `the arm is in the top half before (${topBefore} against ${botBefore})`);
  ok(botAfter > topAfter * 1.25, `and in the bottom half after (${botAfter} against ${topAfter})`);
  console.log(`  →  ${OUT}/cross-r5-inverted-4x.png`);

  // THE ROOM'S OWN BEAT: no storm, and the pendant moved
  ok(w1.light.state !== 'cross-storm' && w1.light.state !== 'cross-flash', `no storm state is ever set (the lighting says "${w1.light.state}")`);
  ok(w1.rain === false || w1.rain === null, `and no rain (${w1.rain})`);
  ok(Math.abs(w1.pendant ?? 0) > 0.0004, `the pendant is swinging: ${w1.pendant} rad off plumb`);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 3. THE HATCH, AND THE STAIR IN IT
// =================================================================================================
if (doing('hatch')) {
  console.log('\nTHE FLOOR OPENS  (the same click, released on to the boards)');
  await fresh();
  for (const [W, H] of [PLATE, PHONE]) {
    const tagged = `${W}x${H}`;
    const page = await open(W, H);
    await gate(page);
    const geom = await page.evaluate(() => {
      const C = window.__theatre.pieces.props.cross.cellar;
      return { hatch: C.hatch, well: C.well, stair: C.stair, cut: C.cut, seams: C.seams, bottom: C.bottom, red: C.red, poses: C.poses };
    });
    if (W === 1280) {
      console.log(`  THE HATCH             x ${geom.hatch.x0} .. ${geom.hatch.x1}, z ${geom.hatch.z0} .. ${geom.hatch.z1} m — ${((geom.hatch.x1 - geom.hatch.x0) * 1000).toFixed(0)} by ${((geom.hatch.z1 - geom.hatch.z0) * 1000).toFixed(0)} mm`);
      console.log(`  ON THE BOARDS' OWN SEAMS  the floor's seams within a tile: ${geom.seams.join(', ')}`);
      const on0 = geom.seams.some((z) => Math.abs(z - geom.hatch.z0) < 1e-3);
      const on1 = geom.seams.some((z) => Math.abs(z - geom.hatch.z1) < 1e-3) || Math.abs(geom.hatch.z1 - 2.6) < 1e-3;
      ok(on0 && on1, `both long edges are real seams (${geom.hatch.z0} and ${geom.hatch.z1}), so the cut is three whole boards`);
      console.log(`  THE HOLE IN THE MESH  ${geom.cut.dropped} triangles dropped of ${geom.cut.dropped + geom.cut.kept}, on the floor's own grid x ${geom.cut.rect.x0}..${geom.cut.rect.x1}, z ${geom.cut.rect.z0}..${geom.cut.rect.z1}`);
      console.log(`  THE WELL              x ${geom.well.x0}..${geom.well.x1}, z ${geom.well.z0}..${geom.well.z1}, landing at y ${geom.well.y}`);
      console.log(`  THE FLIGHT            ${geom.stair.steps} treads of ${geom.stair.going * 1000} mm on ${geom.stair.rise * 1000} mm risers — ${geom.stair.pitch} deg, ${geom.stair.run} m of run — standing on a cellar floor that goes ${geom.stair.beyond * 1000} mm further upstage`);
      console.log(`  FOR THE ROOM DOWN THERE  api.bottom = [${geom.bottom.join(', ')}]`);
      console.log(`  THE LID               ${geom.poses.open.length} drawings open (lands on ${geom.poses.land}), ${geom.poses.shut.length} shut`);
      console.log(`      open   ${geom.poses.open.join(', ')}`);
      console.log(`      shut   ${geom.poses.shut.join(', ')}`);
      console.log(`  THE RED               ${geom.red.one} and ${geom.red.mid}, and nothing else`);
    }

    await page.evaluate(() => window.__theatre.pieces.props.cross.click());
    // …caught while the boards are still coming up
    const nOpening = await until(page, () => window.__theatre.pieces.props.cross.phase === 'opening');
    await release(page, 6);
    await settle(page);
    const mid = await world(page);
    await snap(page, `${OUT}/cellar-r5-opening-${tagged}.png`);
    console.log(`  ${tagged}: the boards start lifting ${nOpening} drawings after the click; caught at ${mid.lid} deg, camera "${mid.shot}"${mid.moving ? ' (leaning in)' : ''}`);

    const nOpen = await until(page, () => window.__theatre.pieces.props.cross.open && !window.__theatre.pieces.camera.moving);
    await settle(page);
    const w = await world(page);
    const buf = await shot(page);
    await snap(page, `${OUT}/cellar-r5-open-${tagged}.png`);
    const img = await rawOf(buf);
    const boxes = await page.evaluate(() => {
      const C = window.__theatre.pieces.props.cross.cellar;
      return { hole: C.hitBox(), seen: C.seenBox() };
    });
    console.log(`  ${tagged}: open after ${nOpening + nOpen} more drawings — lid ${w.lid} deg, camera "${w.shot}" at [${w.eye.join(', ')}], fov ${w.fov}`);
    console.log(`  ${tagged}: the mouth on the glass ${box1(boxes.hole)}`);
    ok(inFrame(boxes.hole, W, H), `${tagged}: the hatch is IN THE FRAME`);
    ok(w.holed, `${tagged}: and the floor mesh genuinely has a hole in it`);
    const ink = inkIn(img, boxes.hole);
    console.log(`  ${tagged}: ink inside the mouth ${ink.pct}% (${ink.px} px of ${ink.of})`);
    ok(ink.pct > 8, `${tagged}: there is a STAIR down there and not an empty box (${ink.pct}% of the mouth is drawn)`);
    await crop(buf, boxes.hole, `${OUT}/cellar-r5-stair-3x-${tagged}.png`, { pad: 10, scale: 3 });
    console.log(`  ${tagged}: →  ${OUT}/cellar-r5-open-${tagged}.png · ${OUT}/cellar-r5-stair-3x-${tagged}.png`);
    ok((page.__errors ?? []).length === 0, `${tagged}: no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
    await page.close();
  }
}

// =================================================================================================
// 4. THE RED: IN THE HOLE, AND NOWHERE ELSE
// =================================================================================================
if (doing('red')) {
  console.log('\nTHE RED  (#b4241d and its one mix, found by the test at the head of this file)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);

  // …and first, that the test itself is honest about the room it is looking at. A shut room has the
  // fire's two colours in it and his own face, and none of that may read as this egg's red.
  const shutBuf = await shot(page);
  const shutImg = await rawOf(shutBuf);
  const shutRed = redIn(shutImg);
  ok(shutRed.n === 0, `a room with the cross untouched has NO red in it at all (${shutRed.n} px of ${W * H})`);
  console.log('  (that frame has his FACE in the middle of it, so the count above is also the whole of');
  console.log('   what the test has to say about #d37a6c, which is the one colour in this room a pale');
  console.log('   red could be mistaken for.)');
  // …and the rest of the palette, put to the test as arithmetic rather than as a render, because a
  // fireplace two and a half metres off the room's axis is half outside the home frame and a claim
  // that rests on where it happens to fall is not a claim about the test.
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rows = [
    ['#b4241d', 'the cellar', true],
    ['#c14f48', 'its one mix', true],
    ['#f2b829', "the fire's yellow", false],
    ['#e0561d', "the fire's orange", false],
    ['#d37a6c', 'his mouth', false],
    ['#69b964', 'his skin', false],
    ['#0d0e0d', 'the pen', false],
    ['#f8f9f4', 'the paper', false],
  ];
  for (const [h, what, want] of rows) {
    const [r, g, b] = hex(h);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const got = isRed(r, g, b);
    console.log(`    ${h}  ${what.padEnd(18)} saturation ${((max - min) / max).toFixed(3)}, |g-b| ${Math.abs(g - b)} against ${(0.25 * (r - min)).toFixed(1)}  →  ${got ? 'RED' : 'not red'}`);
    ok(got === want, `${h} (${what}) is ${want ? '' : 'not '}this egg's red`);
  }

  // now open the floor and look down it
  await page.evaluate(() => window.__theatre.pieces.props.cross.set('open'));
  await settle(page);
  await settle(page);
  const buf = await shot(page);
  await snap(page, `${OUT}/cellar-r5-red-1280x800.png`);
  const img = await rawOf(buf);
  const boxes = await page.evaluate(() => {
    const C = window.__theatre.pieces.props.cross.cellar;
    return { hole: C.hitBox(), seen: C.seenBox(), lid: C.lid };
  });
  const inHole = redIn(img, boxes.hole);
  const all = redIn(img);
  console.log(`  down the hole         ${inHole.n} red px inside the mouth's own box (${((100 * inHole.n) / Math.max(1, boxes.hole.w * boxes.hole.h)).toFixed(1)}% of it)`);
  console.log(`  in the whole frame    ${all.n} red px, all of it inside ${box1(all.box)}`);
  ok(inHole.n > 1500, `there is a red light up the stair (${inHole.n} px of it)`);

  // AND NOWHERE ELSE, weighed the only way that means anything at this shot: the lens is leaning in
  // and the hatch and its lid fill most of the glass, so "outside the hatch's box" is measured
  // against the box that holds everything this egg DREW — the hole, the lid lying open beside it and
  // the spill on the boards round both (`seenBox`). Every red pixel must be inside it.
  const outside = redOutside(img, boxes.seen);
  console.log(`  everything it drew    ${box1(boxes.seen)}`);
  console.log(`  red outside that      ${outside.n} px${outside.at.length ? ` (first at ${outside.at.join(' ')})` : ''}`);
  ok(outside.n === 0, 'not one red pixel falls outside the hatch, its lid and the boards round them');

  // …and the plainest statement of the same thing: the room from its own plate, with the floor open.
  // The hatch is downstage of every frontal shot's bottom edge (the `wide` frame crosses the floor at
  // z 1.9 and the hatch starts at 1.91), so a wide of a room with a hole in its floor has no red in
  // it whatsoever — which is what "the red is down the cellar" means.
  const wideRed = await page.evaluate(async () => {
    const T = window.__theatre;
    T.pieces.camera.release?.(T.pieces.camera.holding);
    T.pieces.camera.cut('wide');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { shot: T.pieces.camera.current, open: T.pieces.props.cross.open, holed: T.pieces.props.cross.cellar.holed };
  });
  await settle(page);
  const wbuf = await shot(page);
  await snap(page, `${OUT}/cellar-r5-red-wide-1280x800.png`);
  const wimg = await rawOf(wbuf);
  const wred = redIn(wimg);
  console.log(`  from the WIDE plate, with the hatch still open (${JSON.stringify(wideRed)}): ${wred.n} red px in the whole frame`);
  ok(wred.n === 0, 'and from where the visitor sits, the room is a room: no red on the rug, the walls or him');
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 5. HIS LINE
// =================================================================================================
if (doing('line')) {
  console.log('\nHIS LINE  (a whole evening, PEPE_FAKE=1, no ?view)');
  await fresh();
  const page = await evening(...PLATE);
  await page.waitForFunction(() => window.__theatre.pieces.dialogue?.asking === true, null, { timeout: 400000 }).catch(() => {});
  const before = await placardText(page);
  console.log(`  the placard, before   "${before.slice(0, 110)}"`);
  const seen = [];
  await page.evaluate(() => {
    window.__crossEvents = [];
    window.__theatre.on?.('props:cross', (e) => window.__crossEvents.push({ phase: e.phase, open: !!e.open }));
  });
  await page.evaluate(() => window.__theatre.pieces.props.cross.click());
  await page.waitForFunction(() => window.__theatre.pieces.props.cross.open === true, null, { timeout: 400000 }).catch(() => {});
  await page.waitForTimeout(6000);
  const after = await placardText(page);
  const evs = await page.evaluate(() => window.__crossEvents);
  seen.push(...evs);
  const opened = evs.filter((e) => e.open);
  console.log(`  props:cross           ${evs.map((e) => e.phase + (e.open ? ' {open}' : '')).join(' → ')}`);
  ok(opened.length === 1 && opened[0].phase === 'open', `the room says the floor is open EXACTLY ONCE, on the phase named for it (${opened.length})`);
  console.log(`  the placard, after    "${after.slice(0, 200)}"`);
  ok(after !== before && after.length > 0, 'he says something when the floor opens');
  // …and it is HIS line and not the written one: PEPE_FAKE routes the `cross` beat to its own stub
  // (server/pepe.mjs FAKES.cross) and the written PROMPTS.cross is what a keyless room would say.
  const posts = page.__posts ?? [];
  const beats = posts.map((p) => p?.beat);
  console.log(`  what went out on the wire: ${beats.join(', ') || 'nothing'}`);
  ok(beats.includes('cross'), `the cross beat reached /api/pepe (${beats.join(', ')})`);
  const last = posts[posts.length - 1] ?? {};
  console.log(`  and every turn from then on carries  cellar: ${last.cellar}`);
  ok(last.cellar === true, 'the standing fact rides with it while the hatch is open');
  ok(!/Choose your path/i.test(after), 'and `Choose your path, anon.` is nowhere in the evening any more');
  await snap(page, `${OUT}/cellar-r5-line-1280x800.png`);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);

  // THE NOTE ITSELF, out of the server's own module rather than off the wire
  const mod = await import('../server/pepe.mjs');
  const msgs = mod.buildMessages({ beat: 'cross', user: '', history: [] });
  const note = msgs[msgs.length - 1]?.content ?? '';
  console.log(`  the room's note for that beat, from server/pepe.mjs itself:\n    ${note.replace(/\n+/g, ' ').slice(0, 420)}`);
  ok(/upside down on the frieze/.test(note) && /cellar/.test(note), 'it tells him what happened in his own room and gives him no words to say');
  const standing = mod.buildMessages({ beat: 'talk', user: 'go on', cellar: true, history: [] });
  ok(/hatch in the floor is still standing open/.test(standing[standing.length - 1].content), 'and while it is open, every turn is told so');
  const shut = mod.buildMessages({ beat: 'talk', user: 'go on', history: [] });
  ok(!/hatch in the floor/.test(shut[shut.length - 1].content), 'and once it is shut, nothing is');
}

// =================================================================================================
// 6. THE SECOND CLICK PUTS IT BACK
// =================================================================================================
if (doing('back')) {
  console.log('\nTHE SECOND CLICK  (and the room compared with itself, pixel for pixel)');
  await fresh();
  const [W, H] = PLATE;
  // THE CLOCK IS FROZEN for this one, and it has to be. The line boils: the drawing is re-struck on
  // every 12 fps step, so two live frames of the same room differ everywhere by the hand. Held at one
  // drawing, the only thing that can differ between before and after is the floor.
  //
  // …AND SO IS THE TIME OF DAY, which is a different clock and cost the last round of this file a
  // false failure. `?t=` stops the FILM's clock; the wall clock on the back wall is told the hour by
  // `new Date()` (props.js, `tellTheTime`), and a run that happens to straddle a minute moves its
  // minute hand — 123 pixels inside a 32 x 18 box dead centre of the wall, which is exactly the size
  // of that hand. `?now=` pins it, and props.js reads that parameter for precisely this reason.
  //
  // A frozen clock still reports `stepped` on every tick (clock.js: a still has to keep being drawn),
  // so the fall and the lid run on at the renderer's pace — and so does the LEAN, which counts
  // drawings it has been given rather than seconds off the wall, for exactly this reason.
  const page = await open(W, H, '&t=6&now=21:12');
  await settle(page);
  const a = await rawOf(await shot(page));
  await snap(page, `${OUT}/cellar-r5-before-1280x800.png`);

  await page.evaluate(() => window.__theatre.pieces.props.cross.click());
  await page.waitForFunction(() => window.__theatre.pieces.props.cross.open === true, null, { timeout: 400000 }).catch(() => {});
  await settle(page);
  const mid = await world(page);
  ok(mid.open && mid.holed, `the floor is open (phase "${mid.phase}", lid ${mid.lid} deg, hole in the mesh ${mid.holed})`);

  // …and a second click on the cross puts it all back
  const put = await page.evaluate(() => window.__theatre.pieces.props.cross.click());
  ok(put === true, 'a second click on the cross is taken');
  // …and what is waited for is BOTH things: the phase turns over while the lens is still sitting
  // back up, and a frame taken between the two is the parlour seen from halfway out of a chair,
  // which is not what "exactly as it was" means.
  await page.waitForFunction(() => {
    const T = window.__theatre;
    return T.pieces.props.cross.phase === 'shut' && T.pieces.camera.current === 'home' && !T.pieces.camera.moving;
  }, null, { timeout: 400000, polling: 200 }).catch(() => {});
  await settle(page);
  await settle(page);
  const back = await world(page);
  console.log(`  after it              phase "${back.phase}", cross ${back.cross.degrees} deg, lid ${back.lid} deg, hole ${back.holed}, camera "${back.shot}"`);
  ok(back.phase === 'shut' && back.cross.degrees === 0 && !back.holed && back.shot === 'home', 'everything is where it was: the cross upright, the boards whole, the lens back in its chair');
  const b = await rawOf(await shot(page));
  await snap(page, `${OUT}/cellar-r5-after-1280x800.png`);
  const d = diff(a, b);
  console.log(`  the two frames differ in ${d.n} px of ${W * H}${d.box ? `, inside ${box1(d.box)}` : ''}`);
  ok(d.n < 400, `the room is the same room to within the boil (${d.n} px, ${((100 * d.n) / (W * H)).toFixed(3)}%)`);

  // AND THE HATCH IS A SWITCH TOO: the same second click, from the other end of the room.
  await page.evaluate(() => window.__theatre.pieces.props.cross.click());
  await page.waitForFunction(() => window.__theatre.pieces.props.cross.open === true, null, { timeout: 400000 }).catch(() => {});
  await settle(page);
  const onHatch = await page.evaluate(async () => {
    const T = window.__theatre, g = T.renderer.domElement, r = g.getBoundingClientRect();
    const t = T.pieces.props.cross.cellar.tapBox();
    const o = { clientX: r.left + t.x + t.w / 2, clientY: r.top + t.y + t.h / 2, bubbles: true, pointerType: 'mouse', button: 0 };
    g.dispatchEvent(new PointerEvent('pointermove', o));
    const named = T.pieces.props.switches.hovered;
    g.dispatchEvent(new PointerEvent('pointerdown', o));
    g.dispatchEvent(new PointerEvent('pointerup', o));
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return { named, phase: T.pieces.props.cross.phase };
  });
  ok(onHatch.named === 'cellar', `a pointer on the open hatch is answered by the arbiter ("${onHatch.named}")`);
  ok(onHatch.phase === 'closing', `and a click on it shuts the whole thing (phase "${onHatch.phase}")`);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 7. THE DOOR, BY DAY, STILL WORKS — which is the half of this egg round 5 did not touch
// =================================================================================================
if (doing('day')) {
  console.log('\nTHE DOORWAY BY DAY  (walk.js opens the door by hand; the crossroads is still behind it)');
  await fresh();
  const page = await open(...PLATE);
  const day = await page.evaluate(async () => {
    const C = window.__theatre.pieces.props.cross;
    const opened = C.openByDay();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { opened, phase: C.phase, daylight: C.daylight, leaf: C.leaf };
  });
  ok(day.opened === true && day.phase === 'day' && day.daylight, `the door opens by hand (phase "${day.phase}", leaf ${day.leaf.degrees} deg)`);
  const out = await page.evaluate(async () => {
    const C = window.__theatre.pieces.props.cross;
    C.set('day-out');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { out: C.out, shot: window.__theatre.pieces.camera.current, sky: C.sky, light: C.pathBox('light'), dark: C.pathBox('dark'), traced: !!C.traced };
  });
  await settle(page);
  await snap(page, `${OUT}/cellar-r5-day-out-1280x800.png`);
  console.log(`  the plate is up (${out.out}) at the "${out.shot}" shot, traced original on it: ${out.traced}`);
  console.log(`  the two castles       light ${box1(out.light)} · dark ${box1(out.dark)}`);
  ok(out.out && out.shot === 'crossroads', 'the room still walks out through its own door');
  ok(!!out.light && !!out.dark, 'and the two roads are still the two roads');
  ok(out.sky === -1, `no weather on the country (sky ${out.sky}) — there is no weather left in this egg`);
  const road = await page.evaluate(async () => {
    const C = window.__theatre.pieces.props.cross;
    const took = C.choose('dark');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { took, path: C.path, phase: C.phase };
  });
  ok(road.took && road.path === 'dark', `a road is still taken and kept (path "${road.path}")`);
  await page.evaluate(() => window.__theatre.pieces.props.cross.set('shut'));
  await settle(page);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 8. THE FOUR NEW CUES, rendered offline through the code the room plays them with
// =================================================================================================
if (doing('sound')) {
  console.log('\nTHE CUES  (rendered offline through sound.render, the same OfflineAudioContext the probe uses)');
  await fresh();
  const page = await open(...PLATE);
  const known = await page.evaluate(() => ['nail', 'rap', 'hatch', 'lid'].map((n) => ({ n, known: window.__theatre.pieces.sound.cues.includes(n) })));
  ok(known.every((k) => k.known), `all four are in the room's own list of cues (${known.map((k) => k.n).join(', ')})`);
  for (const name of ['nail', 'rap', 'hatch', 'lid']) {
    const r = await page.evaluate(async (n) => {
      const out = await window.__theatre.pieces.sound.render(n, 1.2, 22050);
      if (!out) return null;
      let peak = 0, lastLoud = 0;
      for (let i = 0; i < out.l.length; i++) {
        const v = Math.abs(out.l[i]);
        if (v > peak) peak = v;
      }
      for (let i = 0; i < out.l.length; i++) if (Math.abs(out.l[i]) > peak * 0.02) lastLoud = i;
      // is it faded in? a struck thing has its transient in the first two milliseconds
      let early = 0;
      for (let i = 0; i < Math.round(out.sampleRate * 0.004); i++) early = Math.max(early, Math.abs(out.l[i]));
      return { peak, seconds: lastLoud / out.sampleRate, early };
    }, name);
    if (!r) {
      ok(false, `${name}: the browser has no OfflineAudioContext`);
      continue;
    }
    const want = await page.evaluate((n) => ({ level: window.__theatre.pieces.sound.levels?.[n] ?? null }), name).catch(() => ({ level: null }));
    console.log(`  ${name.padEnd(6)} peak ${r.peak.toFixed(4)} (${(20 * Math.log10(Math.max(1e-6, r.peak))).toFixed(1)} dBFS), audible for ${r.seconds.toFixed(3)} s, first 4 ms at ${r.early.toFixed(4)}${want.level ? `, wanted level ${want.level}` : ''}`);
    ok(r.peak > 0.002 && r.peak < 0.35, `${name}: it makes a sound and it is not clipping`);
    ok(r.seconds > 0.02, `${name}: it has a length (${r.seconds.toFixed(3)} s)`);
  }
  console.log('  (the TRIM table in sound-voices.js is set to 1 for all four: paste the ratios above');
  console.log('   back into it if the rendered peaks want pulling onto their LEVELs.)');
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

await browser?.close().catch(() => {});
console.log(fails.length ? `\n${fails.length} FAILING:\n - ${fails.join('\n - ')}` : '\nall of it holds.');
process.exit(fails.length ? 1 : 0);
