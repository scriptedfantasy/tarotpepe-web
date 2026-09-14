#!/usr/bin/env node
// THE CROSS OVER THE DOOR, DRIVEN LIKE A VISITOR (the egg in src/pieces/egg-cross.js).
//
// Nothing here reads the egg's own idea of what happened. Every question is put to the piece that
// owns the answer: what the lighting piece calls its state and what its key is worth; what the rain
// egg says about its own layers and its own bed; what dialogue was handed; what went out on the
// wire to /api/pepe. The egg is asked only for the boxes on the glass and for `phase`, because
// those are its own facts.
//
//   THE CROSS          its box at the home plate and on a 390-wide phone, with a 2x crop of it, so
//                      that "in frame" is a measurement and not an opinion.
//   THE STORM          a real pointer, on the cross's own box, and then the storm released ONE
//                      DRAWING AT A TIME through a gate on props.update — which is the piece's own
//                      update on the piece's own clock, with only the renderer skipped. Frames of
//                      the strike (the panes white), of the swing, of the door open on WEATHER AND
//                      NOTHING ELSE, and then of the cut through it; the events, the cues, the
//                      pendant and the light at each step.
//   THE PICTURE        round 4's whole brief, and it is two questions and not one. THE FRAME IS
//                      FULL: the sheet's own box is measured against the glass at 1280x800,
//                      1920x1080, 2560x1080 and 390x844 and must run off all four edges of each,
//                      and the bare rows and columns at those edges are counted. THE ORIGINAL IS
//                      WHOLE: its four corners are on the glass in every one of them, and every
//                      named thing in it — both castles, the sun, the signpost, the child's shoes —
//                      is asked by projecting the picture's own geography rather than by reading a
//                      rectangle off a screenshot. Both seams are cropped at 2x and WEIGHED: the
//                      ink in a strip outside the original against the same strip inside it.
//   THE TWO CASTLES    real clicks on each castle, each box cropped at 2x with the box ruled on it;
//                      and the two roads, which were the switches until this round, are pointed at
//                      and clicked and must do nothing at all. After the BRIGHT castle the storm
//                      lifts off the country in three drawings while the room is still looking out,
//                      and the room is then pixel-compared against the room before the storm, on a
//                      frozen clock, so that the boil cannot differ and the only thing that can is
//                      the weather. After the DARK one: a strike, the walk back, a later strike.
//   THE TIMEOUT        sixty seconds of drawings with nothing chosen: the room comes back in.
//   HIS LINE           a whole evening, no ?view: the door, the greeting, then the cross. What is
//                      asked is that `Choose your path, anon.` went up EXACTLY ONCE, that it was
//                      handed to dialogue.ASK and not to dialogue.say (so the field is open under
//                      it), and that the same event over a reading puts up nothing at all.
//   THE WIRE           the POST bodies to /api/pepe, read off the network, carrying `path`.
//   THE THUNDER        rendered offline through the very code the room plays it with.
//
//   BASE=http://127.0.0.1:8721 node tools/_egg-cross-proof.mjs [--out DIR] [--only storm,light]
//   sections: cross · storm · frames · light · dark · timeout · line · wire · sound
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
const LAUNCH = {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
};
const ONLY = args.only ? String(args.only).split(',') : null;
const doing = (n) => !ONLY || ONLY.includes(n);
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
  await page.goto(`${BASE}/?view=props&state=default${query}`, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 240000 });
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
  await page.goto(`${BASE}/?now=21:12${query}`, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 400000 });
  page.__errors = errors;
  page.__posts = posts;
  return page;
}

// THE GATE. Software WebGL renders this room at rather less than a frame a second, so a storm that
// runs sixty seconds of film is sixty seconds of nothing followed by everything at once. props.update
// is put behind a gate and released a counted number of drawings at a time inside ONE rendered
// frame: it is the piece's own update, called by main's own loop, and the drawings that are skipped
// are skipped by the RENDERER and not by the storm. It works because the storm counts drawings it
// has been given and not seconds off the wall.
// ROUND 3 — AND THE CAMERA IS INSIDE THE GATE NOW. The room no longer cuts through its own door, it
// WALKS, and the walk is stepped on the same twelve the storm is (camera.js's dolly counts drawings
// it has been given, not seconds). Gating props alone would have released thirty drawings of storm
// inside one rendered frame while the camera advanced exactly one of them, and every frame of the
// move would have been measured against a camera two and a half seconds behind the door. So the two
// pieces are stepped together, in the order main.js steps them, and the drawings that are skipped
// are still skipped by the RENDERER and not by either piece.
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
  await page.waitForFunction(() => window.__go === 0, null, { timeout: 1500000, polling: 300 });
};
const settle = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
// RELEASE UNTIL THE ROOM IS OUT THERE AND STANDING STILL, and count the drawings it took. Round 2
// could say "release 23" and know exactly where it was, because the room cut; round 3 walks, and the
// number of drawings between the click and the arrival is the storm's schedule plus the swing plus
// the length of the move — three numbers this file has no business hard-coding. The piece is asked.
async function untilOut(page, cap = 200) {
  let n = 0;
  for (; n < cap; n += 2) {
    if (await page.evaluate(() => window.__theatre.pieces.props.cross.arrived)) return n;
    await release(page, 2);
  }
  return n;
}

// everything that is NOT the egg, asked of the pieces that own it
const world = (p) =>
  p.evaluate(() => {
    const T = window.__theatre, L = T.pieces.lighting, R = T.pieces.props.rain, C = T.pieces.props.cross;
    const practicals = {};
    for (const [k, v] of Object.entries(L?.practicals ?? {})) practicals[k] = +(v?.intensity ?? 0).toFixed(3);
    const door = T.scene.getObjectByName('cross-door');
    return {
      phase: C.phase,
      path: C.path,
      frame: C.frame,
      stormFrame: C.stormFrame,
      flashing: C.flashing,
      leaf: C.leaf,
      pendant: C.pendant,
      weather: !!T.scene.getObjectByName('cross-weather')?.visible,
      out: C.out,
      sky: C.sky,
      striking: C.striking,
      shot: T.pieces.camera.current,
      // round 3: the room WALKS out and back, so "where is the camera" is three questions now
      walking: T.pieces.camera.moving,
      arrived: C.arrived,
      eye: T.camera.position.toArray().map((v) => +v.toFixed(3)),
      fov: +T.camera.fov.toFixed(2),
      traced: C.traced,
      doorShown: !!door?.visible,
      light: { state: L.state, key: +L.key.intensity.toFixed(3), night: !!L.night?.visible, practicals },
      rain: { on: R.on, layers: R.layers, bed: R.audible },
      thunderBus: C.audible,
      ink: T.pieces.ink?.params ? { tone: [...T.pieces.ink.params.tone], levels: [...T.pieces.ink.params.levels] } : null,
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
// how deep the bare margin is at each edge of a frame: the number of rows or columns at the very
// edge with NO mark in them at all. This is the measurement round 4 exists for — the user looked at
// round 3 and said "make this actually full width so it fills the whole screen and is not just a
// square", and what he was looking at was two hundred and forty blank columns down each side.
const bareEdges = (img, thresh = 210) => {
  const lit = (x, y) => {
    const i = (y * img.w + x) * img.ch;
    return img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11 < thresh;
  };
  const rowLit = (y) => {
    for (let x = 0; x < img.w; x++) if (lit(x, y)) return true;
    return false;
  };
  const colLit = (x) => {
    for (let y = 0; y < img.h; y++) if (lit(x, y)) return true;
    return false;
  };
  const walk = (n, f) => {
    let k = 0;
    while (k < n && !f(k)) k++;
    return k;
  };
  return {
    top: walk(img.h, (k) => rowLit(k)),
    bottom: walk(img.h, (k) => rowLit(img.h - 1 - k)),
    left: walk(img.w, (k) => colLit(k)),
    right: walk(img.w, (k) => colLit(img.w - 1 - k)),
  };
};
// a crop with a box ruled on it, so that "the switch is on the castle" is a thing a person can see
async function cropWithBox(buf, view, box, out, { scale = 2 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(view.x));
  const top = Math.max(0, Math.round(view.y));
  const width = Math.max(8, Math.min(meta.width - left, Math.round(view.w)));
  const height = Math.max(8, Math.min(meta.height - top, Math.round(view.h)));
  const r = { x: (box.x - left) * scale, y: (box.y - top) * scale, w: box.w * scale, h: box.h * scale };
  const svg = Buffer.from(
    `<svg width="${width * scale}" height="${height * scale}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="#d03a2a" stroke-width="3" stroke-dasharray="9 6"/></svg>`,
  );
  await sharp(buf)
    .extract({ left, top, width, height })
    .resize({ width: width * scale, height: height * scale, kernel: 'nearest' })
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toFile(out);
  return { left, top, width, height };
}
async function crop(buf, box, out, { pad = 16, scale = 2 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.max(8, Math.min(meta.width - left, Math.round(box.w + pad * 2)));
  const height = Math.max(8, Math.min(meta.height - top, Math.round(box.h + pad * 2)));
  await sharp(buf).extract({ left, top, width, height }).resize({ width: width * scale, height: height * scale, kernel: 'nearest' }).png().toFile(out);
  return { left, top, width, height };
}
// A STRIP OF A MOVE, which is the only way to look at one. Round 2 had nothing like this because
// round 2 had a cut, and a cut is two stills. Every frame is labelled with where on the walk it was
// taken, quarter-second by quarter-second, and they are laid out four to a row at a quarter size so
// the whole excursion fits on one page and can be read left to right as a strip of drawings.
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
const coverage = (img, b) => {
  let dark = 0, n = 0;
  const x0 = Math.max(0, Math.floor(b.x)), x1 = Math.min(img.w, Math.ceil(b.x + b.w));
  const y0 = Math.max(0, Math.floor(b.y)), y1 = Math.min(img.h, Math.ceil(b.y + b.h));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * img.w + x) * img.ch;
      if (img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11 < 160) dark++;
      n++;
    }
  return n ? +((100 * dark) / n).toFixed(2) : 0;
};
// how much of a box is the fire's yellow (the sun is the picture's one plate of colour)
const yellow = (img, b) => {
  let hit = 0, n = 0;
  const x0 = Math.max(0, Math.floor(b.x)), x1 = Math.min(img.w, Math.ceil(b.x + b.w));
  const y0 = Math.max(0, Math.floor(b.y)), y1 = Math.min(img.h, Math.ceil(b.y + b.h));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * img.w + x) * img.ch;
      const r = img.data[i], g = img.data[i + 1], bl = img.data[i + 2];
      if (r > 190 && g > 130 && g < 210 && bl < 110) hit++;
      n++;
    }
  return n ? +((100 * hit) / n).toFixed(2) : 0;
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
  const b = await page.evaluate(() => ({ hit: window.__theatre.pieces.props.cross.hitBox(), tap: window.__theatre.pieces.props.cross.tapBox() }));
  console.log(`  the cross itself      ${box1(b.hit)}`);
  console.log(`  the box a thumb gets  ${box1(b.tap)}${b.tap?.grown ? '  (grown to 44 px)' : ''}`);
  ok(wholly(b.hit, W, H), 'it is WHOLLY inside the home plate — nothing of it is cut by the frame');
  const buf = await shot(page);
  await snap(page, `${OUT}/egg-cross-r4-room.png`);
  await crop(buf, b.hit, `${OUT}/egg-cross-r4-cross-2x.png`, { pad: 22, scale: 4 });
  const img = await rawOf(buf);
  const ink = coverage(img, b.hit);
  console.log(`  ink inside its box    ${ink}%   →  ${OUT}/egg-cross-r4-cross-2x.png`);
  ok(ink > 4 && ink < 40, `it is two strokes and a nail and not a blot (${ink}% of its box is ink)`);
  // …and it answers a pointer where it is drawn, which is what makes it a switch and not a picture
  const hovered = await page.evaluate(async (t) => {
    const g = window.__theatre.renderer.domElement, r = g.getBoundingClientRect();
    g.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + t.x + t.w / 2, clientY: r.top + t.y + t.h / 2, bubbles: true, pointerType: 'mouse' }));
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return { name: window.__theatre.pieces.props.switches.hovered, cursor: g.style.cursor };
  }, b.tap);
  ok(hovered.name === 'cross' && hovered.cursor === 'pointer', `the pointer over it is the whole affordance: the arbiter says "${hovered.name}", cursor "${hovered.cursor}"`);

  // the phone
  const p2 = await open(...PHONE);
  const b2 = await p2.evaluate(() => {
    const C = window.__theatre.pieces.props.cross;
    return { tap: C.tapBox(), door: C.doorBox(), plate: C.plate };
  });
  await snap(p2, `${OUT}/egg-cross-r4-phone.png`);
  console.log(`  ON A 390-WIDE PHONE   the cross ${box1(b2.tap)} — ${inFrame(b2.tap, ...PHONE) ? 'in frame' : 'OUTSIDE THE FRAME'}`);
  console.log(`                        the doorway ${box1(b2.door)} — ${inFrame(b2.door, ...PHONE) ? 'in frame' : 'OUTSIDE THE FRAME'}`);
  console.log('  (this is a fact about the ROOM and not about the egg: at 390 px the home plate holds');
  console.log('   x -0.9944 to +0.9944 of the back wall, and the door runs 1.05 to 1.95, so the doorway');
  console.log('   is just outside it. The window egg-rain used to be drawn on was outside the same frame');
  console.log('   on the other side, and has since been taken out of the room altogether.)');
  console.log(`  THE SHEET ITSELF      ${b2.plate.w.toFixed(2)} x ${b2.plate.h.toFixed(2)} m, its centre at [${b2.plate.at.join(', ')}], the eye at [${b2.plate.eye.join(', ')}]`);
  console.log(`                        cut at ${b2.plate.ppm.toFixed(1)} px/m (${b2.plate.sheet.join(' x ')} px), nib ${b2.plate.pen} m`);
  console.log(`  THE ORIGINAL ON IT    ${b2.plate.pic.w.toFixed(2)} x ${b2.plate.pic.h.toFixed(2)} m, standing at u ${b2.plate.pic.u0}..${b2.plate.pic.u1}, v ${b2.plate.pic.v0}..${b2.plate.pic.v1} of the sheet`);
  console.log(`                        what EVERY window keeps of it: u ${b2.plate.safe.u0}..${b2.plate.safe.u1}, v ${b2.plate.safe.v0}..${b2.plate.safe.v1}, with a hold of ${(100 * b2.plate.hold).toFixed(1)}%`);
  console.log(`  →  ${OUT}/egg-cross-r4-room.png · ${OUT}/egg-cross-r4-phone.png`);
  ok((page.__errors ?? []).length === 0 && (p2.__errors ?? []).length === 0, `no page errors (${[...page.__errors, ...p2.__errors].slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 2. THE STORM, THE OPEN DOOR, AND THE CUT THROUGH IT
//    a real click, then the storm released one drawing at a time
// =================================================================================================
if (doing('storm')) {
  console.log('\nTHE STORM  (a real pointer on the cross, then the storm released a drawing at a time)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);
  await page.evaluate(() => {
    window.__ev = [];
    window.__theatre.on('props:cross', (d) => window.__ev.push({ ...d, shot: window.__theatre.pieces.camera.current }));
  });
  const before = await world(page);
  const bufBefore = await shot(page);
  await gate(page);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.cross.tapBox());
  await page.mouse.click(tap.x + tap.w / 2, tap.y + tap.h / 2);
  await settle(page);
  const clicked = await world(page);
  ok(clicked.phase === 'storm', `the click landed and the weather came in (phase "${clicked.phase}")`);
  ok(before.light.state === 'default' && before.rain.on === false, `before it, the room was a dry afternoon (light "${before.light.state}", rain ${before.rain.on})`);

  // drawing 0: the first strike. The panes go white and the room's tone jumps for this ONE drawing.
  await release(page, 1);
  await settle(page);
  const strike = await world(page);
  await snap(page, `${OUT}/egg-cross-r4-strike.png`);
  ok(strike.flashing, `on the first drawing the doorway goes white: a strike (stormFrame ${strike.stormFrame})`);
  ok(strike.light.state === 'cross-flash', `and the whole room's tone jumps with it — the light is "${strike.light.state}", key ${strike.light.key}`);
  // …which since the back wall's window came out is the room's tone and the sound of it, and no
  // strokes: the rain a visitor SEES during a storm is this egg's own, cut to the doorway.
  ok(strike.rain.on, `the weather came on by egg-rain's own api (${strike.rain.layers} layer(s))`);

  await release(page, 1);
  await settle(page);
  const after1 = await world(page);
  ok(!after1.flashing && after1.light.state === 'cross-storm', `one drawing later it is over: flash ${after1.flashing}, light "${after1.light.state}", key ${after1.light.key}`);
  ok(after1.light.key < before.light.key && !after1.light.night, `the storm sits between the rain and the night: key ${after1.light.key} against ${before.light.key} dry, and it is not night`);

  // the swing. The leaf is off the jamb at drawing 8 and open at 20.
  await release(page, 6);
  const preSwing = await world(page);
  ok(!preSwing.doorShown, `at drawing ${preSwing.stormFrame} the door has not moved yet`);
  await release(page, 1);
  await settle(page);
  const swing0 = await world(page);
  await snap(page, `${OUT}/egg-cross-r4-swing.png`);
  ok(swing0.doorShown && swing0.weather, `at drawing ${swing0.stormFrame} the leaf comes off the jamb at ${swing0.leaf.degrees} deg and the weather is behind it`);
  const poses = [swing0.leaf.degrees];
  for (let i = 0; i < 5; i++) {
    await release(page, 2);
    poses.push((await world(page)).leaf.degrees);
  }
  console.log(`  the swing, drawing by drawing: ${poses.join(' → ')} degrees, held two drawings each`);
  ok(poses.length === 6 && poses[4] > poses[5] && poses[5] > 90, 'six poses, over quickly, past itself and back onto the stop');

  // ---- WEATHER, AND NOTHING ELSE, IN THE OPENING -------------------------------------------------
  await release(page, 2);
  await settle(page);
  const open1 = await world(page);
  const bufOpen = await shot(page);
  await snap(page, `${OUT}/egg-cross-r4-open.png`);
  const doorBox = await page.evaluate(() => window.__theatre.pieces.props.cross.doorBox());
  await crop(bufOpen, doorBox, `${OUT}/egg-cross-r4-doorway-2x.png`, { pad: 20, scale: 3 });
  ok(open1.phase === 'open', `the door is open (phase "${open1.phase}" at drawing ${open1.stormFrame}, ${open1.leaf.degrees} deg)`);
  ok(open1.shot !== 'crossroads' && !open1.out, `and the room has NOT cut yet — it is still on "${open1.shot}", two drawings short of it`);
  console.log(`  the doorway on the glass: ${box1(doorBox)}   →  ${OUT}/egg-cross-r4-doorway-2x.png`);

  const imgOpen = await rawOf(bufOpen);
  const imgBefore = await rawOf(bufBefore);
  const inkOpen = coverage(imgOpen, doorBox), inkShut = coverage(imgBefore, doorBox);
  const sunBox = { x: doorBox.x + doorBox.w * 0.08, y: doorBox.y + doorBox.h * 0.04, w: doorBox.w * 0.84, h: doorBox.h * 0.5 };
  const yDoor = yellow(imgOpen, sunBox);
  console.log(`  ink in the doorway: ${inkShut}% with the door shut → ${inkOpen}% with the weather in it`);
  ok(inkOpen > 4 && Math.abs(inkOpen - inkShut) > 2, 'the doorway is carrying a drawing, and not the drawing that was there');
  ok(yDoor < 0.2, `and NOT a picture: there is no colour of any kind in the opening (${yDoor}% of it is the fire's yellow)`);

  // ---- AND TWO DRAWINGS LATER THE ROOM WALKS OUT THROUGH THE DOOR --------------------------------
  // ROUND 3. There is no cut. A frame is taken every three drawings — a quarter of a second — from
  // the drawing the camera leaves on to the drawing it comes to rest, and the strip is the proof:
  // it has to read as one walk to the door, and every position on it has to be a NEW one, because a
  // dolly that stands still for two drawings is a dolly that dropped a frame.
  await release(page, 2); // the two drawings a cutter leaves on a stop, and then the room goes
  await settle(page);
  const leaves = await world(page);
  ok(leaves.walking?.kind === 'dolly' && leaves.walking.to === 'crossroads', `two drawings after the leaf comes to rest the room LEAVES: a ${leaves.walking?.kind} to "${leaves.walking?.to}" over ${leaves.walking?.drawings} drawings`);
  ok(leaves.out, 'and the picture is standing out there from the first drawing of it, behind the weather in the doorway');
  const strip = [];
  const zs = [];
  strip.push({ buf: bufOpen, at: 'the door, open' });
  for (let i = 0; i < 11; i++) {
    const s = await world(page);
    zs.push(s.eye[2]);
    strip.push({ buf: await shot(page), at: `${(i * 0.25).toFixed(2)}s` });
    await release(page, 3);
    await settle(page);
  }
  const arrival = await world(page);
  strip.push({ buf: await shot(page), at: 'arrived' });
  await sheet(strip, `${OUT}/egg-cross-r4-walk-out.png`, 4, W, H);
  console.log(`  the walk out, z metre by metre: ${zs.map((z) => z.toFixed(2)).join(' → ')} → ${arrival.eye[2].toFixed(2)}`);
  console.log(`  →  ${OUT}/egg-cross-r4-walk-out.png`);
  ok(new Set(zs.map((z) => z.toFixed(3))).size === zs.length, 'every drawing of it is a NEW position: the camera never stands still on the way');
  ok(zs[0] > zs[zs.length - 1] && zs.every((z, i) => i === 0 || z < zs[i - 1]), 'and it only ever goes one way — forward, across the room and out');
  // …and no DRAWING of it moves further than half a metre, which is the difference between a walk
  // and a cut with steps in it. The strip is sampled every three drawings, so the gap between two
  // frames of it is three drawings of travel and has to be divided back down.
  const perDrawing = Math.max(...zs.slice(1).map((z, i) => zs[i] - z)) / 3;
  ok(perDrawing < 0.55, `no drawing of it moves further than half a metre (the longest is ${perDrawing.toFixed(2)} m)`);
  ok(arrival.shot === 'crossroads' && arrival.out && !arrival.walking, `and it comes to rest at the crossroads (camera "${arrival.shot}", eye [${arrival.eye.join(', ')}], fov ${arrival.fov})`);
  ok(arrival.arrived, 'the room is out there and standing still, which is when the two roads become a choice');
  const out1 = arrival;
  const bufPlate = await shot(page);
  await snap(page, `${OUT}/egg-cross-r4-crossroads.png`);
  console.log(`  the picture on the sheet: ${out1.traced ? `${out1.traced.file} — traced from ${out1.traced.source} on ${out1.traced.when}` : 'THE DRAWING IS STANDING IN (no traced original loaded)'}`);
  ok(!!out1.traced, "the plate carries the USER'S OWN PICTURE, put through the mill — not a redrawing of it");
  const geom = await page.evaluate(() => {
    const C = window.__theatre.pieces.props.cross, T = window.__theatre;
    const s = T.pieces.camera.shots.crossroads;
    return { fov: +s.fov.toFixed(2), pos: s.pos, look: s.look, sheet: C.plateBox(), pic: C.pictureBox(), plate: C.plate, size: T.size ?? { w: innerWidth, h: innerHeight } };
  });
  console.log(`  the shot: fov ${geom.fov} deg from [${geom.pos.join(', ')}] looking at [${geom.look.join(', ')}]`);
  console.log(`  the SHEET on the glass:    ${box1(geom.sheet)} for a ${geom.size.w}x${geom.size.h} frame`);
  console.log(`  the ORIGINAL inside it:    ${box1(geom.pic)}`);
  // ROUND 4 ASKS THE OPPOSITE OF ROUND 3 ON ONE COUNT AND THE SAME ON THE OTHER. Round 3 held the
  // picture INSIDE the frame on a field of paper; the user asked for the frame to be full. So the
  // SHEET must cover the glass — the drawing runs off every edge — and the ORIGINAL must still be
  // whole inside it, which is what the country either side of it is for.
  ok(geom.sheet.x <= 0.5 && geom.sheet.y <= 0.5 && geom.sheet.x + geom.sheet.w >= geom.size.w - 0.5 && geom.sheet.y + geom.sheet.h >= geom.size.h - 0.5,
    'the drawing runs off all four edges of the frame: there is no paper margin anywhere on this glass');
  ok(wholly(geom.pic, geom.size.w, geom.size.h), 'and the ORIGINAL is whole inside it — both castles, the sun, the signpost and the boy');
  console.log(`  the original fills ${(100 * geom.pic.w / geom.size.w).toFixed(0)}% of the frame's width and ${(100 * geom.pic.h / geom.size.h).toFixed(0)}% of its height, the hold is ${(100 * geom.plate.hold).toFixed(1)}%`);
  const imgPlate = await rawOf(bufPlate);
  const bare = bareEdges(imgPlate);
  console.log(`  bare rows and columns at the frame's own edges: top ${bare.top}, bottom ${bare.bottom}, left ${bare.left}, right ${bare.right}`);
  ok(Math.max(bare.left, bare.right) <= 2, `nothing of the sides is bare paper (${bare.left} px left, ${bare.right} right)`);
  ok(Math.max(bare.top, bare.bottom) <= geom.size.h * 0.08, `and neither the top nor the foot carries a margin (${bare.top} px, ${bare.bottom} px — what is there is the drawing's own sky and its own road)`);
  const inkPlate = coverage(imgPlate, { x: 0, y: 0, w: geom.size.w, h: geom.size.h });
  console.log(`  ink over the whole frame: ${inkPlate}%`);
  ok(inkPlate > 3 && inkPlate < 34, `it is a drawing and not a wash (${inkPlate}% of the frame is ink)`);

  // ---- THE TWO SEAMS, AT 2x --------------------------------------------------------------------
  // Either side of the traced original there is a join between somebody else's drawing and ours,
  // and a person has to be able to look at it. A strip 160 px wide centred on each, doubled.
  for (const [side, x] of [['left', geom.pic.x], ['right', geom.pic.x + geom.pic.w]]) {
    const view = { x: x - 80, y: geom.size.h * 0.06, w: 160, h: Math.min(geom.size.h * 0.82, 420) };
    await crop(bufPlate, { x: view.x, y: view.y, w: view.w, h: view.h }, `${OUT}/egg-cross-r4-seam-${side}-2x.png`, { pad: 0, scale: 2 });
    console.log(`  the ${side} seam, at 2x: the original's edge stands at x ${x.toFixed(0)}  →  ${OUT}/egg-cross-r4-seam-${side}-2x.png`);
  }
  // …and it is WEIGHED as well as looked at: the ink in a strip just outside the original against
  // the ink in the same strip just inside it. A continuation lighter or heavier than the picture it
  // joins reads as a join whatever else is right about it.
  const seamW = Math.round(geom.pic.w * 0.06);
  const band = (x0) => coverage(imgPlate, { x: x0, y: geom.pic.y + geom.pic.h * 0.02, w: seamW, h: geom.pic.h * 0.96 });
  const seamL = [band(geom.pic.x), band(geom.pic.x - seamW)];
  const seamR = [band(geom.pic.x + geom.pic.w - seamW), band(geom.pic.x + geom.pic.w)];
  console.log(`  the ink either side of the left seam:  ${seamL[0]}% inside · ${seamL[1]}% outside  (${(seamL[1] / Math.max(0.01, seamL[0])).toFixed(2)}x)`);
  console.log(`  the ink either side of the right seam: ${seamR[0]}% inside · ${seamR[1]}% outside  (${(seamR[1] / Math.max(0.01, seamR[0])).toFixed(2)}x)`);
  for (const [k, v] of [['left', seamL], ['right', seamR]])
    ok(v[1] / Math.max(0.01, v[0]) > 0.45 && v[1] / Math.max(0.01, v[0]) < 2.2, `  the ${k} seam does not step: the country either side carries the same weight of ink to within a half`);

  // THE CHILD AND THE SIGNPOST, cropped at 2x out of the frame the picture is actually in — and
  // asked for BY THE PICTURE'S OWN GEOGRAPHY, which since round 3 is measured off the traced file by
  // tools/trace-plate.mjs and not typed in by anybody. The child stands on the near road under the
  // fork; the signpost stands in it. Both boxes are derived from the two numbers the tool found.
  const parts = await page.evaluate(() => {
    const C = window.__theatre.pieces.props.cross, L = C.land;
    const at = (u, v) => C.at(u, v);
    const b = (u0, v0, u1, v1) => {
      const a = at(u0, v0), c = at(u1, v1);
      return { x: Math.min(a.x, c.x), y: Math.min(a.y, c.y), w: Math.abs(c.x - a.x), h: Math.abs(c.y - a.y) };
    };
    return {
      land: { ...L },
      castles: { ...C.castles },
      child: b(L.fork - 0.1, 0.68, L.fork + 0.1, 0.985),
      post: b(L.fork - 0.11, L.hz - 0.23, L.fork + 0.11, L.hz + 0.02),
      bright: b(0.08, 0.05, 0.44, 0.38), // the sun-lit half above the skyline
      dark: b(0.56, 0.03, 0.96, 0.36), // …and the storm's
    };
  });
  console.log(`  the picture's own geography, measured off the file: ${JSON.stringify(parts.land)}`);
  await crop(bufPlate, parts.child, `${OUT}/egg-cross-r4-child-2x.png`, { pad: 10, scale: 2 });
  await crop(bufPlate, parts.post, `${OUT}/egg-cross-r4-signpost-2x.png`, { pad: 10, scale: 2 });
  console.log(`  the child    ${box1(parts.child)}  →  ${OUT}/egg-cross-r4-child-2x.png`);
  console.log(`  the signpost ${box1(parts.post)}  →  ${OUT}/egg-cross-r4-signpost-2x.png`);
  ok(wholly(parts.child, geom.size.w, geom.size.h), 'the child is wholly inside the laptop frame, feet and all — which a cover fit could not do');
  ok(coverage(imgPlate, parts.child) > 3, `and he is DRAWN and not implied (${coverage(imgPlate, parts.child)}% of his box is ink)`);
  const ySun = yellow(imgPlate, parts.bright);
  console.log(`  the fire's yellow in the bright half: ${ySun}% · in the storm half: ${yellow(imgPlate, parts.dark)}%`);
  ok(ySun > 0.5, "the sun is the picture's one plate of colour — the fire's own #f2b829, keyed off the original's own yellow");
  ok(yellow(imgPlate, parts.dark) < 0.2, 'and there is none of it on the storm side: one colour, in one place');
  const bright = coverage(imgPlate, parts.bright), dark = coverage(imgPlate, parts.dark);
  console.log(`  the two ends of the country: the bright half is ${bright}% ink, the storm half ${dark}%`);
  ok(dark > bright * 1.5, 'the storm side is hatched where the original is dark and the sun-lit hill is left paper, and it measures so');

  // A STRIKE, WHILE THE ROOM IS STANDING OUT IN IT. Driven by hand: the four scheduled ones are
  // over by drawing 65 and the door only opens at 20, so the last of them lands while the visitor
  // is out at the picture in the live evening. Here the storm is stepped, so it is asked directly.
  const strikeShot = await page.evaluate(async () => {
    const C = window.__theatre.pieces.props.cross;
    // the fourth strike is due on drawing 65 of the storm; walk to the drawing before it
    return { due: C.schedule.strike[3], now: C.stormFrame };
  });
  await release(page, Math.max(1, strikeShot.due - strikeShot.now + 1));
  await settle(page);
  const lit = await world(page);
  const bufLit = await shot(page);
  await snap(page, `${OUT}/egg-cross-r4-crossroads-strike.png`);
  console.log(`  the storm's fourth strike is due on drawing ${strikeShot.due}; the storm is on ${lit.stormFrame}`);
  ok(lit.flashing && lit.striking, 'a strike lights the plate too: the country goes to bare paper with a fork of light down it');
  const imgLit = await rawOf(bufLit);
  const inkLit = coverage(imgLit, geom.pic);
  console.log(`  ink inside the picture on the strike: ${inkLit}% against ${inkPlate}% a moment before`);
  ok(inkLit < inkPlate, 'and it is a FLASH: every stroke of tone is gone for the one drawing');
  await release(page, 1);
  await settle(page);
  ok(!(await world(page)).striking, 'one drawing, and one only: a flash that lasted two would be a lamp');

  // ---- THE TWO CASTLES, WHICH ARE THE SWITCHES ---------------------------------------------------
  // The user: "and can you make the castles the place where the user should click to decide what way
  // to go?" So what is asked here is four things: that each castle answers a pointer, that the box
  // sits ON the castle (cropped at 2x with the box ruled on it, so a person can see it), that it is
  // big enough for a thumb, and that the ROADS — which were the switches for three rounds — now do
  // nothing at all.
  const paths = {};
  for (const side of ['light', 'dark']) {
    const b = await page.evaluate((s) => {
      const T = window.__theatre, g = T.renderer.domElement, r = g.getBoundingClientRect();
      const box = T.pieces.props.cross.castleBox(s);
      g.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + box.x + box.w / 2, clientY: r.top + box.y + box.h / 2, bubbles: true, pointerType: 'mouse' }));
      return box;
    }, side);
    await release(page, 1);
    paths[side] = {
      box: b,
      ...(await page.evaluate(() => ({ hovered: window.__theatre.pieces.props.switches.hovered, cursor: window.__theatre.renderer.domElement.style.cursor }))),
    };
  }
  console.log(`  the bright castle  ${box1(paths.light.box)} → the arbiter says "${paths.light.hovered}", cursor "${paths.light.cursor}"`);
  console.log(`  the dark castle    ${box1(paths.dark.box)} → the arbiter says "${paths.dark.hovered}", cursor "${paths.dark.cursor}"`);
  console.log(`  where they are DRAWN, measured off the file: ${JSON.stringify(parts.castles)}`);
  ok(paths.light.hovered === 'cross-light' && paths.dark.hovered === 'cross-dark', 'each castle answers the pointer, and nothing announces either of them');
  ok(paths.light.cursor === 'pointer' && paths.dark.cursor === 'pointer', 'the cursor over each of them is a pointer');
  ok(paths.light.box.x + paths.light.box.w <= paths.dark.box.x + 0.5, 'and the two cannot overlap: the country between them belongs to neither');
  ok(Math.min(paths.light.box.w, paths.light.box.h, paths.dark.box.w, paths.dark.box.h) >= 120,
    `both are at least 120 px on a laptop (the smallest side of either is ${Math.min(paths.light.box.w, paths.light.box.h, paths.dark.box.w, paths.dark.box.h).toFixed(0)} px)`);
  // …and the box is ON the castle: the crop shows both, ruled.
  for (const [k, name] of [['light', 'bright'], ['dark', 'dark']]) {
    const b = paths[k].box;
    const view = { x: b.x - b.w * 0.35, y: b.y - b.h * 0.35, w: b.w * 1.7, h: b.h * 1.7 };
    await cropWithBox(bufPlate, view, b, `${OUT}/egg-cross-r4-castle-${k}-2x.png`, { scale: 2 });
    console.log(`  the ${name} castle with its box on it  →  ${OUT}/egg-cross-r4-castle-${k}-2x.png`);
    ok(coverage(imgPlate, b) > 3, `  and there is a castle inside the ${name} box (${coverage(imgPlate, b)}% of it is ink)`);
  }
  // ---- AND THE ROADS ARE NOT SWITCHES ANY MORE ---------------------------------------------------
  // Three points on the near ground that were the LEFT road's own box in round 3 — the middle of the
  // left field, the middle of the right field, and the fork itself — are pointed at and then
  // clicked. Nothing may happen at any of them: no hover, no pointer, and no path taken.
  // …and the pointer is moved and then A DRAWING IS RELEASED before the arbiter is asked, because
  // the hit test runs once a frame out of props.update and props.update is behind this file's gate.
  // Without the release the answer is whatever the last released drawing decided, which here was the
  // dark castle, and the test would fail on its own machinery.
  const roads = {};
  for (const [k, uv] of [['the left road', [-0.28, 0.86]], ['the right road', [0.28, 0.86]], ['the fork itself', [0, null]]]) {
    const at = await page.evaluate(([du, v]) => {
      const C = window.__theatre.pieces.props.cross, L = C.land;
      const p = C.at(L.fork + du, v == null ? L.hz + 0.06 : v);
      const g = window.__theatre.renderer.domElement, r = g.getBoundingClientRect();
      g.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + p.x, clientY: r.top + p.y, bubbles: true, pointerType: 'mouse' }));
      return p;
    }, uv);
    await release(page, 1);
    await settle(page);
    roads[k] = {
      at: [Math.round(at.x), Math.round(at.y)],
      ...(await page.evaluate(() => ({ hovered: window.__theatre.pieces.props.switches.hovered, cursor: window.__theatre.renderer.domElement.style.cursor }))),
    };
  }
  for (const [k, v] of Object.entries(roads)) console.log(`  ${k.padEnd(16)} at ${v.at.join(',')} → the arbiter says "${v.hovered}", cursor "${v.cursor}"`);
  ok(Object.values(roads).every((v) => v.hovered == null && v.cursor !== 'pointer'), 'the roads are not switches any more: a pointer over either of them, or over the fork, is an arrow over a picture');
  const roadClick = await page.evaluate(async () => {
    const T = window.__theatre, C = T.pieces.props.cross, g = T.renderer.domElement, r = g.getBoundingClientRect();
    const p = C.at(C.land.fork - 0.28, 0.86);
    for (const type of ['pointerdown', 'pointerup', 'click'])
      g.dispatchEvent(new PointerEvent(type, { clientX: r.left + p.x, clientY: r.top + p.y, bubbles: true, pointerType: 'mouse', button: 0 }));
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return { phase: C.phase, path: C.path };
  });
  await release(page, 2);
  const afterRoad = await world(page);
  console.log(`  a real click on the left road: phase "${afterRoad.phase}", path ${JSON.stringify(afterRoad.path)}`);
  ok(afterRoad.phase === 'open' && afterRoad.path === null, 'and a click on one does NOTHING: the offer is still standing and nothing was chosen');

  // the pendant, and the cues
  console.log(`  the pendant over the table: ${before.pendant} at rest → ${open1.pendant} rad mid-storm`);
  ok(Math.abs(open1.pendant) > 0.001 && Math.abs(open1.pendant) < 0.09, 'the chandelier is swinging a few degrees on the 12 fps clock');
  console.log(`  the rain bed: ${JSON.stringify(open1.rain.bed)}`);
  console.log(`  the thunder's own fader: ${JSON.stringify(open1.thunderBus)}`);
  ok(open1.rain.bed.running === true, "egg-rain's bed is running on the graph");
  ok(open1.thunderBus.fader === true, 'and the thunder has been fired at least once: its fader is on the destination');

  const ev = await page.evaluate(() => window.__ev);
  console.log(`  the bus: ${JSON.stringify(ev)}`);
  ok(ev[0]?.phase === 'storm' && ev.some((e) => e.phase === 'open'), 'props:cross went up for the storm and again for the open door');
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
  console.log(`  →  ${OUT}/egg-cross-r4-strike.png · ${OUT}/egg-cross-r4-swing.png · ${OUT}/egg-cross-r4-open.png · ${OUT}/egg-cross-r4-crossroads.png · ${OUT}/egg-cross-r4-crossroads-strike.png`);
}

// =================================================================================================
// 2b. THE ARRIVAL FRAME AT FOUR SHAPES, AND THE WALK ON A PHONE
//     Round 2 asked whether a phone kept the fork, the signpost and both castles, because a cover
//     fit threw away whatever the window's shape did not want. Round 3 held the WHOLE picture at
//     every shape, on paper. Round 4 has to do both at once — the user: "make this actually full
//     width so it fills the whole screen and is not just a square" — so every frame is asked TWO
//     questions that used to be one: is the frame FULL (no paper at any edge, and the drawing's own
//     sheet running off all four of them), and is the ORIGINAL WHOLE inside it (its four corners on
//     the glass, and every named thing in it).
// =================================================================================================
if (doing('frames')) {
  console.log('\nTHE ARRIVAL FRAME AT FOUR SHAPES  (1280x800 · 1920x1080 · 2560x1080 · 390x844)');
  await fresh();
  const SHAPES = [[1280, 800, 'laptop'], [1920, 1080, 'sixteen-nine'], [2560, 1080, 'twentyone-nine'], [390, 844, 'phone']];
  for (const [w, h, name] of SHAPES) {
    // A BROWSER EACH. Software WebGL takes a chromium down somewhere around its sixth context and
    // this sheet is fifty megabytes of texture a page; four shapes in one browser killed the fourth.
    await fresh();
    // NOT `?cross=out`: `open()` boots a judged page, and `?view=props&state=default` puts every egg
    // in the room back to its resting state a moment after the parameter has been read. The still is
    // asked for through the api, which is the same call the judging state makes.
    const page = await open(w, h);
    await page.evaluate(() => window.__theatre.pieces.props.cross.set('out'));
    await settle(page);
    await settle(page);
    const st = await page.evaluate(() => {
      const C = window.__theatre.pieces.props.cross, L = C.land, T = window.__theatre;
      const at = (u, v) => C.at(u, v);
      return {
        out: C.out,
        traced: !!C.traced,
        fov: +T.pieces.camera.shots.crossroads.fov.toFixed(2),
        sheet: C.plateBox(),
        pic: C.pictureBox(),
        castles: { light: C.castleBox('light'), dark: C.castleBox('dark') },
        size: { w: innerWidth, h: innerHeight },
        plate: C.plate,
        // WHAT MUST BE IN THE FRAME, named. The two things nearest an edge are the ones a cover fit
        // ate first — the sun's crown at the top and the child's shoes at the foot — and the two
        // castles are what a side crop would take.
        marks: {
          'the left edge, mid-height': at(0.01, 0.5),
          'the right edge, mid-height': at(0.99, 0.5),
          'the top of the sky': at(0.5, 0.01),
          'the foot of the road': at(0.5, 0.99),
          'the fork': at(L.fork, L.hz),
          'the signpost': at(L.fork, L.hz - 0.12),
          'the bright castle': at(0.24, 0.17),
          'the dark castle': at(0.81, 0.19),
          'the sun': at(0.22, 0.12),
          "the child's shoes": at(L.fork, 0.985),
        },
      };
    });
    const buf = await shot(page);
    await snap(page, `${OUT}/egg-cross-r4-frame-${name}.png`);
    const img = await rawOf(buf);
    const bare = bareEdges(img);
    console.log(`  ${name.padEnd(15)} ${st.size.w}x${st.size.h}  fov ${st.fov}`);
    console.log(`     the sheet on the glass ${box1(st.sheet)} · the original ${box1(st.pic)} — ${(100 * st.pic.w / st.size.w).toFixed(0)}% of the width, ${(100 * st.pic.h / st.size.h).toFixed(0)}% of the height`);
    console.log(`     bare rows/columns at the edges: top ${bare.top}, bottom ${bare.bottom}, left ${bare.left}, right ${bare.right}`);
    ok(st.out && st.traced, `  the traced original is on the sheet`);
    ok(st.sheet.x <= 0.5 && st.sheet.y <= 0.5 && st.sheet.x + st.sheet.w >= st.size.w - 0.5 && st.sheet.y + st.sheet.h >= st.size.h - 0.5,
      `  THE FRAME IS FULL: the drawing runs off all four edges of a ${st.size.w}x${st.size.h} window`);
    ok(Math.max(bare.left, bare.right) <= 2 && Math.max(bare.top, bare.bottom) <= st.size.h * 0.08,
      `  and there is no margin of paper at any of them (${bare.top}/${bare.bottom}/${bare.left}/${bare.right} px, and what there is is the drawing's own sky and road)`);
    ok(wholly(st.pic, st.size.w, st.size.h), `  THE ORIGINAL IS WHOLE: all four of its corners are on the glass`);
    // BRIEF: the named subject fills at least 70 % of the short axis on a phone. The short axis of
    // a phone is its width, and the original is what the visitor is being asked to look at.
    const short = Math.min(st.size.w, st.size.h);
    const fills = Math.max(st.pic.w, st.pic.h) / short;
    ok(fills >= 0.7, `  and it fills ${(100 * fills).toFixed(0)}% of the short axis (the film's own rule is 70)`);
    const missing = [];
    for (const [k, p] of Object.entries(st.marks)) {
      const inside = !!p && p.x > 1 && p.x < st.size.w - 1 && p.y > 1 && p.y < st.size.h - 1;
      console.log(`     ${inside ? 'in ' : 'OUT'}  ${k.padEnd(24)} ${p ? `at ${p.x.toFixed(0)},${p.y.toFixed(0)}` : 'nowhere: the plate is not up'}`);
      if (!inside) missing.push(k);
    }
    ok(missing.length === 0, `  every named thing in the picture is in the ${name} frame${missing.length ? ` — missing ${missing.join(', ')}` : ''}`);
    // the two switches, at this shape
    const min = Math.min(st.size.w, st.size.h) < 520 ? 80 : 120;
    for (const k of ['light', 'dark']) {
      const b = st.castles[k];
      console.log(`     the ${k} castle's box ${box1(b)}`);
      ok(b && Math.min(b.w, b.h) >= min - 0.5 && wholly(b, st.size.w, st.size.h), `  the ${k} castle is at least ${min} px square here and wholly on the glass`);
    }
    ok(st.castles.light.x + st.castles.light.w <= st.castles.dark.x + 0.5, '  and the two do not touch');
    console.log(`  →  ${OUT}/egg-cross-r4-frame-${name}.png`);
    ok((page.__errors ?? []).length === 0, `  no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
  }

  // ---- AND THE WALK ITSELF, ON A PHONE ------------------------------------------------------------
  // The lens on a phone opens much wider at the crossroads than in the parlour — the picture is held
  // by its WIDTH there and a phone is a narrow window — so this is the frame where the dolly's late
  // lens change earns its keep: it must still read as a walk and not as a zoom, and no drawing of it
  // may put a wide-angle parlour on the glass.
  await fresh();
  const ph = await open(...PHONE);
  await gate(ph);
  // …STARTED THROUGH THE API AND NOT WITH A POINTER, and the reason is a fact about the phone frame
  // rather than about this test. `home` on a window narrower than it is tall gives up the room and
  // hangs from the plaster over the TAROT board (camera-shots.js, `tall`), and the cross is on the
  // frieze ABOVE that — so on a 390-wide phone it is off the top of the frame and there is nothing
  // there to tap. `cross.click()` is the documented way to work it as a pointer does. (Whether a
  // phone visitor can find the cross at all is a question for the egg's own round, not this one; the
  // `cross` section measures its box at both sizes and says so.)
  await ph.evaluate(() => window.__theatre.pieces.props.cross.click());
  await release(ph, 23);
  await settle(ph);
  const pstrip = [];
  const pfov = [];
  for (let i = 0; i < 11; i++) {
    const s = await world(ph);
    pfov.push(s.fov);
    pstrip.push({ buf: await shot(ph), at: `${(i * 0.25).toFixed(2)}s fov ${s.fov}` });
    await release(ph, 3);
    await settle(ph);
  }
  const parrive = await world(ph);
  pstrip.push({ buf: await shot(ph), at: `arrived fov ${parrive.fov}` });
  await sheet(pstrip, `${OUT}/egg-cross-r4-walk-phone.png`, 4, PHONE[0], PHONE[1]);
  console.log(`  the phone's lens through the walk: ${pfov.join(' → ')} → ${parrive.fov}`);
  ok(parrive.shot === 'crossroads' && !parrive.walking, `  it arrives (camera "${parrive.shot}", eye [${parrive.eye.join(', ')}])`);
  ok(pfov.slice(0, 7).every((f) => Math.abs(f - pfov[0]) < 0.5), '  and the lens is the parlour’s own for the first two thirds of it: no wide-angle room on the glass');
  ok(parrive.fov > pfov[0] + 10, `  the whole lens change is in the last stride (${pfov[0]} → ${parrive.fov} deg)`);
  console.log(`  →  ${OUT}/egg-cross-r4-walk-phone.png`);
  ok((ph.__errors ?? []).length === 0, `  no page errors (${(ph.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 3. THE BRIGHT CASTLE — the light path: the storm clears while the visitor is still looking out,
//    and then the room is exactly as it was — pixel for pixel
// =================================================================================================
if (doing('light')) {
  console.log('\nTHE BRIGHT CASTLE  (a real click on it, the clearing, the walk home, and the room compared with itself)');
  await fresh();
  const [W, H] = PLATE;
  // THE CLOCK IS FROZEN for this one, and it has to be. The line boils: the drawing is re-struck on
  // every 12 fps step, so two live frames of the same room differ everywhere by the hand. Held at
  // one drawing, the only thing that can differ between before and after is the weather.
  //
  // …AND SO IS THE TIME OF DAY, which is a different clock and cost this test a false failure. `?t=`
  // stops the FILM's clock; the wall clock on the back wall is told the hour by `new Date()` (props.js,
  // `tellTheTime`), and a run that happens to straddle a minute moves its minute hand — 123 pixels
  // inside a 32 x 18 box dead centre of the wall, which is exactly the size of that hand. `?now=`
  // pins it, and props.js reads that parameter for precisely this reason.
  const page = await open(W, H, '&t=6&now=21:12');
  const before = await world(page);
  const bufBefore = await shot(page);
  await snap(page, `${OUT}/egg-cross-r4-before.png`);
  await page.evaluate(() => window.__theatre.pieces.props.cross.set('out'));
  await settle(page);
  const out1 = await world(page);
  ok(out1.phase === 'open' && out1.out && out1.shot === 'crossroads', `the room is standing out at the crossroads (camera "${out1.shot}", sky drawing ${out1.sky})`);
  const b = await page.evaluate(() => window.__theatre.pieces.props.cross.castleBox('light'));
  await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
  await settle(page);
  const chose = await world(page);
  ok(chose.path === 'light' && chose.phase === 'closing', `the bright castle is taken and it is the light path (path "${chose.path}", phase "${chose.phase}")`);
  ok(chose.shot === 'crossroads', 'and the room is STILL LOOKING OUT: the clearing is something the visitor watches');
  // the three drawings of the cloud lifting, caught one at a time
  const lift = [];
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction((k) => window.__theatre.pieces.props.cross.sky !== k, lift[lift.length - 1] ?? 0, { timeout: 300000, polling: 100 }).catch(() => {});
    const s = await world(page);
    lift.push(s.sky);
    if (s.sky >= 0 && s.out) await snap(page, `${OUT}/egg-cross-r4-clearing-${i + 1}.png`);
    if (s.sky < 0) break;
  }
  console.log(`  the cloud lifting, drawing by drawing: ${[0, ...lift].join(' → ')}  (-1 is the sheet taken off)`);
  ok(lift.includes(-1), 'the bank breaks up and goes in three drawings over three seconds — the beat, and its schedule, unchanged');
  // …AND IT IS NOT DRAWN OVER A TRACED ORIGINAL, which this proof says out loud rather than letting
  // a passing state assertion imply otherwise. Behind the drawn landscape the bank was visible, out
  // there, breaking up over the country. A traced picture is opaque and has weather of its own, so
  // the bank could only be laid IN FRONT — our cloud over his picture — which is the thing the user
  // threw round 2 out for. src/pieces/egg-cross.js does not hang it. The three seconds are the ROOM
  // clearing, watched from outside: the light handed back, the rain stopped, the pendant coming down.
  if (chose.traced) console.log('  (the bank is not hung over a traced original: what clears in those three seconds is the room behind, not the picture)');
  // …and then the three seconds, and the walk home. A frozen clock reports `stepped` on every tick
  // (clock.js: a still has to keep being drawn), so the rest runs on its own at the renderer's pace
  // — and so does the DOLLY, which counts drawings it has been given rather than seconds off the
  // wall for exactly this reason. What is waited for is therefore both things: the phase is shut AND
  // the camera has come to rest at home. The phase turns over three drawings before the walk ends —
  // the leaf is on its stop with a third of the move still to run — and a frame taken between the
  // two would be the parlour seen from halfway across it, which is not what "exactly as it was"
  // means.
  await page.waitForFunction(() => {
    const T = window.__theatre;
    return T.pieces.props.cross.phase === 'shut' && T.pieces.camera.current === 'home' && !T.pieces.camera.moving;
  }, null, { timeout: 300000, polling: 200 });
  await settle(page);
  const after = await world(page);
  const bufAfter = await shot(page);
  await snap(page, `${OUT}/egg-cross-r4-after-light.png`);
  console.log(`  before: ${JSON.stringify({ ...before.light, phase: before.phase, rain: before.rain.on, pendant: before.pendant, shot: before.shot })}`);
  console.log(`  after:  ${JSON.stringify({ ...after.light, phase: after.phase, rain: after.rain.on, pendant: after.pendant, shot: after.shot })}`);
  ok(after.phase === 'shut' && after.path === 'light', `the storm cleared and the choice is remembered (phase "${after.phase}", path "${after.path}")`);
  ok(after.shot === 'home', `the room cut back through the door (camera "${after.shot}")`);
  ok(after.light.state === before.light.state && after.light.key === before.light.key, 'the light is back where it was, and it is the lighting piece that says so');
  ok(after.rain.on === false && after.rain.layers === 0, 'the rain stopped');
  ok(after.doorShown === false && after.weather === false && after.out === false, 'the door is shut and there is nothing beyond it again');
  ok(after.pendant === 0, 'and the pendant is hanging still');
  const d = diff(await rawOf(bufBefore), await rawOf(bufAfter));
  console.log(`  the two frames, pixel for pixel: ${d.n} differ${d.box ? ` (inside ${box1(d.box)})` : ''}`);
  ok(d.n === 0, `the room is EXACTLY as it was (${d.n} pixels changed)`);
  console.log(`  →  ${OUT}/egg-cross-r4-before.png · ${OUT}/egg-cross-r4-after-light.png · ${OUT}/egg-cross-r4-clearing-*.png`);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 4. THE DARK CASTLE — the dark path: a strike, the walk back, and the storm stays for the evening
// =================================================================================================
if (doing('dark')) {
  console.log('\nTHE DARK CASTLE  (a real click on it, then a later strike)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);
  await page.evaluate(() => {
    window.__ev = [];
    window.__theatre.on('props:cross', (d) => window.__ev.push({ ...d, shot: window.__theatre.pieces.camera.current }));
  });
  await gate(page);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.cross.tapBox());
  await page.mouse.click(tap.x + tap.w / 2, tap.y + tap.h / 2);
  const took = await untilOut(page); // the strikes, the swing, the door open, and the walk out through it
  await settle(page);
  const out1 = await world(page);
  ok(out1.phase === 'open' && out1.arrived, `the room walked out and is standing at the crossroads (camera "${out1.shot}", ${took} drawings after the click)`);
  const b = await page.evaluate(() => window.__theatre.pieces.props.cross.castleBox('dark'));
  await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
  await release(page, 1); // the drawing the road is taken ON: the strike is on it
  await settle(page);
  const struck = await world(page);
  await snap(page, `${OUT}/egg-cross-r4-dark-answer.png`);
  ok(struck.path === 'dark' && struck.striking, 'the dark castle is answered by a strike, on the drawing it is taken');

  // ---- AND THE WALK HOME, WHICH IS THE SAME ROAD IN A SECOND AND A HALF ---------------------------
  // Eighteen drawings, and the door shuts three drawings into it — as the lens clears the opening,
  // not before it and not after the room has arrived. The strip is taken every three drawings, the
  // same quarter-second as the way out, so the two can be laid side by side.
  const back = [];
  const bz = [];
  const leafAt = [];
  for (let i = 0; i < 8; i++) {
    const s = await world(page);
    bz.push(s.eye[2]);
    leafAt.push(s.leaf.shown ? s.leaf.degrees : null);
    back.push({ buf: await shot(page), at: `${(i * 0.25).toFixed(2)}s  z ${s.eye[2].toFixed(2)}  leaf ${s.leaf.shown ? s.leaf.degrees + '°' : '—'}` });
    await release(page, 3);
    await settle(page);
  }
  await sheet(back, `${OUT}/egg-cross-r4-walk-back.png`, 4, W, H);
  console.log(`  the walk home, z drawing by drawing: ${bz.map((z) => z.toFixed(2)).join(' → ')}`);
  console.log(`  the leaf through it: ${leafAt.map((d) => (d == null ? '—' : d + '°')).join(' → ')}`);
  console.log(`  →  ${OUT}/egg-cross-r4-walk-back.png`);
  ok(bz.every((z, i) => i === 0 || z >= bz[i - 1]), 'it only ever goes one way — back through the door and across the room');
  ok(bz[bz.length - 1] > bz[0] + 8, `and it gets the whole way home (${bz[0].toFixed(2)} → ${bz[bz.length - 1].toFixed(2)} m)`);
  ok(leafAt[0] == null || leafAt[0] > 90, 'the door is still standing wide open on the drawing the room leaves');
  ok(leafAt.some((d) => d != null && d < 90) && bz[leafAt.findIndex((d) => d != null && d < 90)] > -2.6,
    'and it shuts once the lens has cleared the opening, not across it');
  await release(page, 14); // whatever is left of the walk and the leaf coming onto its stop
  await settle(page);
  const shutOn = await world(page);
  await snap(page, `${OUT}/egg-cross-r4-after-dark.png`);
  console.log(`  after the choice: ${JSON.stringify({ phase: shutOn.phase, path: shutOn.path, shot: shutOn.shot, light: shutOn.light.state, key: shutOn.light.key, rain: shutOn.rain.layers })}`);
  ok(shutOn.phase === 'dark' && shutOn.path === 'dark', `the door shut on the weather and the storm stayed (phase "${shutOn.phase}")`);
  ok(shutOn.shot === 'home' && !shutOn.out, `the room cut back through the door first (camera "${shutOn.shot}")`);
  ok(shutOn.doorShown === false && shutOn.weather === false, 'the doorway is a door again');
  ok(shutOn.light.state === 'cross-storm', `the room is still under the storm's light ("${shutOn.light.state}", key ${shutOn.light.key})`);
  ok(shutOn.rain.on && shutOn.rain.layers === 4, `and it is still raining outside — the room's tone and the bed (${shutOn.rain.layers} layers)`);

  const sched = await page.evaluate(() => window.__theatre.pieces.props.cross.schedule.far);
  const due = await page.evaluate(() => ({ at: window.__theatre.pieces.props.cross.nextStrike, f: window.__theatre.pieces.props.cross.frame }));
  console.log(`  the next strike is due on drawing ${due.at} of the standing storm — ${(due.at / 12).toFixed(1)} s (the schedule allows ${sched[0] / 12} to ${sched[1] / 12} s)`);
  ok(due.at >= sched[0] && due.at <= sched[1], `the thunder stays for the rest of the evening: a strike every ${sched[0] / 12}–${sched[1] / 12} s`);
  await release(page, due.at - due.f);
  const justBefore = await world(page);
  ok(!justBefore.flashing, `on the drawing before it, nothing (the storm has had ${justBefore.frame} drawings)`);
  await release(page, 1);
  await settle(page);
  const later = await world(page);
  const bufLater = await shot(page);
  await snap(page, `${OUT}/egg-cross-r4-dark-strike.png`);
  ok(later.flashing && later.light.state === 'cross-flash', `and on the next, the whole flash again — panes white, the room a shade up (light "${later.light.state}", key ${later.light.key})`);
  const img = await rawOf(bufLater);
  console.log(`  →  ${OUT}/egg-cross-r4-dark-answer.png · ${OUT}/egg-cross-r4-after-dark.png · ${OUT}/egg-cross-r4-dark-strike.png (${img.w}x${img.h})`);
  console.log(`  the bus: ${JSON.stringify(await page.evaluate(() => window.__ev))}`);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 5. NOBODY CHOOSES
// =================================================================================================
if (doing('timeout')) {
  console.log('\nNOBODY CHOOSES  (sixty seconds of drawings, and the room comes back in by itself)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);
  await gate(page);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.cross.tapBox());
  await page.mouse.click(tap.x + tap.w / 2, tap.y + tap.h / 2);
  await untilOut(page);
  const openAt = await world(page);
  ok(openAt.phase === 'open' && openAt.arrived, 'the room walked out and the offer is standing');
  // …and the minute is counted from the piece's own frame, not from a number added up here: the walk
  // out is thirty drawings long and a fixed count that was right in round 2 overshoots it by half.
  const wait = await page.evaluate(() => window.__theatre.pieces.props.cross.schedule.choice);
  const at = await page.evaluate(() => window.__theatre.pieces.props.cross.frame);
  await release(page, wait - at - 4);
  const nearly = await world(page);
  ok(nearly.phase === 'open', `four drawings short of the minute it is still open (drawing ${nearly.frame} of ${wait})`);
  await release(page, 6);
  const closing = await world(page);
  ok(closing.phase === 'closing' && closing.path === null, `on the minute it starts to shut, and nothing was chosen (phase "${closing.phase}", path ${closing.path})`);
  ok(closing.shot === 'home', `and the room starts straight home — an offer nobody took is not worth three seconds out there (camera "${closing.shot}")`);
  await release(page, 40);
  await settle(page);
  const done = await world(page);
  await snap(page, `${OUT}/egg-cross-r4-timeout.png`);
  console.log(`  after it: ${JSON.stringify({ phase: done.phase, path: done.path, shot: done.shot, light: done.light.state, rain: done.rain.on })}`);
  ok(done.phase === 'shut' && done.path === null && done.light.state === 'default' && !done.rain.on, 'the door shut, the storm cleared, and the room kept nothing');
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 6. HIS LINE — a whole evening, and it goes up at the plate
// =================================================================================================
if (doing('line')) {
  console.log('\nHIS LINE  (1280x800, a whole evening, no ?view: the door, the greeting, then the cross)');
  await fresh();
  const [W, H] = PLATE;
  const page = await evening(W, H);
  await page.evaluate(() => {
    window.__ev = [];
    window.__theatre.on('props:cross', (d) => window.__ev.push({ ...d, beat: window.__theatre.pieces.flow.beat }));
    const D = window.__theatre.pieces.dialogue;
    window.__asks = [];
    window.__says = [];
    const realAsk = D.ask.bind(D);
    D.ask = (p, o) => {
      window.__asks.push(String(p ?? ''));
      return realAsk(p, o);
    };
    const realSay = D.say.bind(D);
    D.say = (t, o) => {
      window.__says.push(String(t ?? ''));
      return realSay(t, o);
    };
  });
  await page.mouse.click(W / 2, H / 2); // the front door
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 400000 });
  console.log(`  the field is open under his greeting: "${(await placardText(page)).slice(0, 90)}"`);

  await gate(page);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.cross.tapBox());
  await page.mouse.click(tap.x + tap.w / 2, tap.y + tap.h / 2);
  await release(page, 19); // through the strikes and the swing, one short of the open door
  const before = await page.evaluate(() => ({ asks: window.__asks.filter((a) => a === 'Choose your path, anon.').length, phase: window.__theatre.pieces.props.cross.phase }));
  ok(before.asks === 0, `while the door is still swinging he has said nothing (phase "${before.phase}")`);
  await release(page, 4); // the door comes to rest, and two drawings later the room leaves
  await untilOut(page); // …and the walk out: he says it at the picture, not on the way to it
  await page.waitForFunction(() => (window.__asks ?? []).includes('Choose your path, anon.'), null, { timeout: 200000 }).catch(() => {});
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 200000 }).catch(() => {});
  const said = await placardText(page);
  const state = await page.evaluate(() => ({
    asking: window.__theatre.pieces.dialogue.asking,
    field: !!document.querySelector('#dialogue input'),
    asks: window.__asks,
    says: window.__says,
    shot: window.__theatre.pieces.camera.current,
    out: window.__theatre.pieces.props.cross.out,
    beat: window.__theatre.pieces.flow.beat,
    phase: window.__theatre.pieces.props.cross.phase,
  }));
  await snap(page, `${OUT}/egg-cross-r4-said.png`);
  console.log(`  the placard, at the crossroads: "${said}"`);
  console.log(`  every prompt the placard was handed all evening: ${JSON.stringify(state.asks)}`);
  console.log(`  …and everything dialogue.say was told to cut: ${JSON.stringify(state.says)}`);
  // the sign hand sets the card in small caps, so the placard's own text comes back shouted
  ok(said.toUpperCase().includes('CHOOSE YOUR PATH, ANON.'), `he says it, in those words (${JSON.stringify(said.slice(0, 60))})`);
  ok(state.asking && state.field, 'and the FIELD IS OPEN UNDERNEATH IT: the visitor can answer a door that has just blown open');
  ok(state.asks[state.asks.length - 1] === 'Choose your path, anon.', 'it went to dialogue.ask and not to dialogue.say — the line OVER an open field, which is what keepLast makes it');
  ok(state.shot === 'crossroads' && state.out, `and it stands on the picture: the room has walked out through the door (camera "${state.shot}")`);
  const once = state.asks.filter((a) => a === 'Choose your path, anon.').length;
  ok(once === 1, `and exactly once (${once})`);
  await release(page, 60);
  const again = await page.evaluate(() => window.__asks.filter((a) => a === 'Choose your path, anon.').length);
  ok(again === 1, `sixty more drawings of the same open door and he says it once, not twice (${again})`);

  // ---- AND THE SAME EVENT OVER A READING -------------------------------------------------------
  // The hardest case for the guard in flow.js: while the visitor is choosing three cards the field
  // IS open — the room has asked them to pick — and a remark about the weather there would cut the
  // placard they are answering.
  await page.evaluate(() => window.__theatre.pieces.props.cross.set('shut'));
  await page.evaluate(() => window.__ungate()); // the room runs on its own again: the flow needs it to deal
  await page.evaluate(() => {
    const i = document.querySelector('#dialogue input');
    i.value = 'read my cards';
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  const gotToCards = await page
    .waitForFunction(() => window.__theatre.pieces.flow.beat === 'fan' && window.__theatre.pieces.dialogue.asking === true, null, { timeout: 600000, polling: 500 })
    .then(() => true)
    .catch(() => false);
  const beat = await page.evaluate(() => window.__theatre.pieces.flow.beat);
  ok(gotToCards, `the cloth is out with three to choose, which is what this half of the test needs (beat "${beat}")`);
  if (gotToCards) {
    const n0 = await page.evaluate(() => window.__asks.length);
    const text0 = await placardText(page);
    await page.evaluate(() => window.__theatre.emit('props:cross', { phase: 'open', path: null }));
    await settle(page);
    await page.waitForTimeout(1800);
    const during = await page.evaluate(() => ({
      beat: window.__theatre.pieces.flow.beat,
      asking: window.__theatre.pieces.dialogue.asking,
      asks: window.__asks.length,
      cross: window.__asks.filter((a) => a === 'Choose your path, anon.').length,
    }));
    const text1 = await placardText(page);
    ok(during.cross === 1, `over a reading the door opens and he says NOTHING (${during.cross} time(s) all evening, still the one from before)`);
    ok(during.asks === n0 && text1 === text0, 'the placard the visitor is answering is not cut short');
    console.log(`  the placard through it: "${text1.slice(0, 70)}"`);
  }
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
  console.log(`  →  ${OUT}/egg-cross-r4-said.png`);
}

// =================================================================================================
// 7. THE WIRE — `path` on every turn from then on
// =================================================================================================
if (doing('wire')) {
  console.log('\nTHE FACT THE ROOM KEEPS  (the POST bodies to /api/pepe, read off the network)');
  await fresh();
  const [W, H] = PLATE;
  const page = await evening(W, H);
  const health = await page.evaluate(async () => (await fetch('/api/pepe/health').then((r) => r.json())).provider);
  console.log(`  the provider at the other end of the wire: ${health}`);
  await page.mouse.click(W / 2, H / 2);
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 400000 });
  const say = async (text) => {
    await page.waitForFunction(() => !!document.querySelector('#dialogue input'), null, { timeout: 400000 });
    await page.evaluate((t) => {
      const i = document.querySelector('#dialogue input');
      i.value = t;
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }, text);
    await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 400000 }).catch(() => {});
    await page.waitForTimeout(600);
  };
  await say('good evening');
  const nBefore = page.__posts.length;
  const pathBefore = page.__posts[nBefore - 1]?.path;
  console.log(`  before the door: ${nBefore} turn(s) on the wire, the last carrying path = ${JSON.stringify(pathBefore)}`);
  ok(pathBefore === null, 'until the visitor chooses, the room tells him nothing: path is null and not missing');

  // the storm, and the dark road, driven through the api the way a click does
  await page.evaluate(() => window.__theatre.pieces.props.cross.click());
  await page.waitForFunction(() => window.__theatre.pieces.props.cross.phase === 'open', null, { timeout: 300000 });
  await page.evaluate(() => window.__theatre.pieces.props.cross.choose('dark'));
  await page.waitForFunction(() => window.__theatre.pieces.props.cross.path === 'dark', null, { timeout: 60000 });
  await page.waitForFunction(() => window.__theatre.pieces.camera.current !== 'crossroads', null, { timeout: 300000 }).catch(() => {});
  await say('what do you make of that');
  const last = page.__posts[page.__posts.length - 1];
  console.log(`  after it: ${page.__posts.length} turn(s), the last carrying path = ${JSON.stringify(last?.path)}, beat "${last?.beat}"`);
  ok(last?.path === 'dark', 'the choice is on the wire with every turn from then on, like the cards on the cloth');
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);

  // …and the sentence the server makes of it, asked of the server's own code
  const mod = await import('../server/pepe.mjs');
  const msgs = mod.buildMessages({ beat: 'talk', user: 'go on', path: 'dark', history: [] });
  const note = msgs[msgs.length - 1]?.content ?? '';
  console.log(`  the room's note for that turn, from server/pepe.mjs itself:\n    ${note.replace(/\n+/g, ' ').slice(0, 400)}`);
  ok(/chose the dark path at the door/.test(note), 'and one sentence of it reaches him, with no instruction attached to it');
  const light = mod.buildMessages({ beat: 'talk', user: 'go on', path: 'light', history: [] });
  ok(/chose the light path at the door/.test(light[light.length - 1].content), 'the other path says the other thing');
  const none = mod.buildMessages({ beat: 'talk', user: 'go on', history: [] });
  ok(!/path at the door/.test(none[none.length - 1].content), 'and a visitor who never touched the cross is told nothing about a door');
}

// =================================================================================================
// 8. THE THUNDER, rendered offline through the code the room plays it with
// =================================================================================================
if (doing('sound')) {
  console.log('\nTHE THUNDER  (rendered offline, by the very code the page fires)');
  await fresh();
  const page = await open(...PLATE);
  const r = await page.evaluate(async () => {
    const out = await window.__theatre.pieces.props.cross.render(5.0, 22050);
    if (!out) return null;
    let peak = 0;
    for (const s of out.l) if (Math.abs(s) > peak) peak = Math.abs(s);
    let lastLoud = 0;
    for (let i = 0; i < out.l.length; i++) if (Math.abs(out.l[i]) > peak * 0.01) lastLoud = i;
    let low = 0, all = 0, lp = 0;
    for (let i = 0; i < out.l.length; i++) {
      lp += (out.l[i] - lp) * 0.05; // a crude one-pole at about 175 Hz
      low += lp * lp;
      all += out.l[i] * out.l[i];
    }
    return { peak, seconds: lastLoud / out.sampleRate, level: out.level, length: out.length, lowShare: low / (all || 1) };
  });
  if (!r) ok(false, 'the browser has no OfflineAudioContext');
  else {
    console.log(`  peak ${r.peak.toFixed(4)} (${(20 * Math.log10(r.peak)).toFixed(1)} dBFS) against a wanted level of ${r.level}`);
    console.log(`  it runs ${r.seconds.toFixed(2)} s of the ${r.length} s the cue claims, and ${(100 * r.lowShare).toFixed(0)}% of its energy is under about 175 Hz`);
    ok(r.peak > 0.02 && r.peak < 0.3, 'it is the loudest thing in the room and it is not clipping');
    ok(r.seconds > 2.5, 'a LONG cue, rolled: it is still going seconds after the flash');
    ok(r.lowShare > 0.5, 'and it is low — a roll of thunder heard through two panes of glass');
  }
  const bed = await page.evaluate(async () => {
    window.__theatre.pieces.props.cross.set('dark');
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return { rain: window.__theatre.pieces.props.rain.audible, cross: window.__theatre.pieces.props.cross.audible };
  });
  console.log(`  the rain bed under a STILL: ${JSON.stringify(bed.rain)} — egg-rain's set() is silent by design; the live bed is proved in THE STORM above`);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

await browser?.close().catch(() => {});
console.log(fails.length ? `\n${fails.length} FAILING:\n - ${fails.join('\n - ')}` : '\nall of it holds.');
process.exit(fails.length ? 1 : 0);
