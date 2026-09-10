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
//                      the strike (the panes white), of the swing, and of the door open on the
//                      crossroads; the events, the cues, the pendant and the light at each step.
//   THE TWO PATHS      real clicks on each half of the picture. After the LIGHT path the room is
//                      pixel-compared against the room before the storm, on a frozen clock, so that
//                      the boil cannot differ and the only thing that can is the weather. After the
//                      DARK path the storm is run on for a later strike.
//   THE TIMEOUT        sixty seconds of drawings with nothing chosen: the door shuts on its own.
//   HIS LINE           a whole evening, no ?view: the door, the greeting, then the cross. What is
//                      asked is that `Choose your path, anon.` went up EXACTLY ONCE, that it was
//                      handed to dialogue.ASK and not to dialogue.say (so the field is open under
//                      it), and that the same event over a reading puts up nothing at all.
//   THE WIRE           the POST bodies to /api/pepe, read off the network, carrying `path`.
//   THE THUNDER        rendered offline through the very code the room plays it with.
//
//   BASE=http://127.0.0.1:8721 node tools/_egg-cross-proof.mjs [--out DIR] [--only storm,light]
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
const gate = (page) =>
  page.evaluate(() => {
    const p = window.__theatre.pieces.props;
    const real = p.update.bind(p);
    window.__go = 0;
    window.__ungate = () => {
      p.update = real;
    };
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
  await page.waitForFunction(() => window.__go === 0, null, { timeout: 1500000, polling: 300 });
};
const settle = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

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
      picture: !!T.scene.getObjectByName('crossroads')?.visible,
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
async function crop(buf, box, out, { pad = 16, scale = 2 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.max(8, Math.min(meta.width - left, Math.round(box.w + pad * 2)));
  const height = Math.max(8, Math.min(meta.height - top, Math.round(box.h + pad * 2)));
  await sharp(buf).extract({ left, top, width, height }).resize({ width: width * scale, height: height * scale, kernel: 'nearest' }).png().toFile(out);
  return { left, top, width, height };
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
  await snap(page, `${OUT}/egg-cross-r1-room.png`);
  await crop(buf, b.hit, `${OUT}/egg-cross-r1-cross-2x.png`, { pad: 22, scale: 4 });
  const img = await rawOf(buf);
  const ink = coverage(img, b.hit);
  console.log(`  ink inside its box    ${ink}%   →  ${OUT}/egg-cross-r1-cross-2x.png`);
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
    return { tap: C.tapBox(), door: C.doorBox() };
  });
  const buf2 = await shot(p2);
  await snap(p2, `${OUT}/egg-cross-r1-phone.png`);
  console.log(`  ON A 390-WIDE PHONE   the cross ${box1(b2.tap)} — ${inFrame(b2.tap, ...PHONE) ? 'in frame' : 'OUTSIDE THE FRAME'}`);
  console.log(`                        the doorway ${box1(b2.door)} — ${inFrame(b2.door, ...PHONE) ? 'in frame' : 'OUTSIDE THE FRAME'}`);
  console.log('  (this is a fact about the ROOM and not about the egg: at 390 px the home plate holds');
  console.log('   about x -1.1 to +1.1 m of the back wall, and the door runs 1.05 to 1.95. The window');
  console.log('   egg-rain lives behind is outside the same frame on the other side.)');
  console.log(`  →  ${OUT}/egg-cross-r1-room.png · ${OUT}/egg-cross-r1-phone.png`);
  ok((page.__errors ?? []).length === 0 && (p2.__errors ?? []).length === 0, `no page errors (${[...page.__errors, ...p2.__errors].slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 2. THE STORM: a real click, then one drawing at a time
// =================================================================================================
if (doing('storm')) {
  console.log('\nTHE STORM  (a real pointer on the cross, then the storm released a drawing at a time)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);
  await page.evaluate(() => {
    window.__ev = [];
    window.__theatre.on('props:cross', (d) => window.__ev.push({ ...d }));
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
  const bufStrike = await shot(page);
  await snap(page, `${OUT}/egg-cross-r1-strike.png`);
  ok(strike.flashing, `on the first drawing the panes are white: a strike (stormFrame ${strike.stormFrame})`);
  ok(strike.light.state === 'cross-flash', `and the whole room's tone jumps with it — the light is "${strike.light.state}", key ${strike.light.key}`);
  ok(strike.rain.on, `the rain started on its own, by egg-rain's own api (${strike.rain.layers} layer(s))`);

  // and it is gone on the next one
  await release(page, 1);
  await settle(page);
  const after1 = await world(page);
  ok(!after1.flashing && after1.light.state === 'cross-storm', `one drawing later it is over: flash ${after1.flashing}, light "${after1.light.state}", key ${after1.light.key}`);
  ok(after1.light.key < before.light.key && !after1.light.night, `the storm sits between the rain and the night: key ${after1.light.key} against ${before.light.key} dry, and the panes are not solid`);

  // the swing. The leaf is off the jamb at drawing 8 and open at 20.
  await release(page, 6); // …to drawing 7: the last one before it moves
  const preSwing = await world(page);
  ok(!preSwing.doorShown, `at drawing ${preSwing.stormFrame} the door has not moved yet`);
  await release(page, 1);
  await settle(page);
  const swing0 = await world(page);
  const bufSwing = await shot(page);
  await snap(page, `${OUT}/egg-cross-r1-swing.png`);
  ok(swing0.doorShown && swing0.picture, `at drawing ${swing0.stormFrame} the leaf comes off the jamb at ${swing0.leaf.degrees} deg and the picture is behind it`);
  const poses = [swing0.leaf.degrees];
  for (let i = 0; i < 5; i++) {
    await release(page, 2);
    poses.push((await world(page)).leaf.degrees);
  }
  console.log(`  the swing, drawing by drawing: ${poses.join(' → ')} degrees, held two drawings each`);
  ok(poses.length === 6 && poses[4] > poses[5] && poses[5] > 90, 'six poses, over quickly, past itself and back onto the stop');

  await release(page, 2);
  await settle(page);
  const open1 = await world(page);
  const bufOpen = await shot(page);
  await snap(page, `${OUT}/egg-cross-r1-open.png`);
  const doorBox = await page.evaluate(() => window.__theatre.pieces.props.cross.doorBox());
  await crop(bufOpen, doorBox, `${OUT}/egg-cross-r1-doorway-2x.png`, { pad: 20, scale: 2 });
  ok(open1.phase === 'open', `the door is open on the crossroads (phase "${open1.phase}" at drawing ${open1.stormFrame}, ${open1.leaf.degrees} deg)`);
  console.log(`  the doorway on the glass: ${box1(doorBox)}   →  ${OUT}/egg-cross-r1-doorway-2x.png`);

  const imgOpen = await rawOf(bufOpen);
  const imgBefore = await rawOf(bufBefore);
  const inkOpen = coverage(imgOpen, doorBox), inkShut = coverage(imgBefore, doorBox);
  const sunBox = { x: doorBox.x + doorBox.w * 0.08, y: doorBox.y + doorBox.h * 0.04, w: doorBox.w * 0.32, h: doorBox.h * 0.14 };
  const y1 = yellow(imgOpen, sunBox), y0 = yellow(imgBefore, sunBox);
  console.log(`  ink in the doorway: ${inkShut}% with the door shut → ${inkOpen}% with the picture in it`);
  console.log(`  the fire's yellow in the sun's corner: ${y0}% before → ${y1}% now`);
  // NOT "more ink than before": the door that was there is a panelled leaf with three fielded
  // panels, a letter plate, three black strap hinges and an enamel notice on it, and it carries MORE
  // ink than a landscape does. What is asked is that the doorway is carrying a drawing at all and
  // that it is a DIFFERENT one.
  ok(inkOpen > 6 && Math.abs(inkOpen - inkShut) > 2, 'the doorway is carrying a drawing, and not the drawing that was there');
  ok(y1 > 1 && y0 < 0.2, "and the sun is the picture's one plate of colour — the fire's own #f2b829");

  // the two paths, and the cursor over each of them. The hit test runs from props.update (one a
  // frame, not one a pointermove), and props.update is behind the gate — so each move is followed
  // by one drawing, which is what a pointer resting on the picture would get anyway.
  const paths = {};
  for (const side of ['left', 'right']) {
    const b = await page.evaluate((s) => {
      const T = window.__theatre, g = T.renderer.domElement, r = g.getBoundingClientRect();
      const box = T.pieces.props.cross.pathBox(s);
      g.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + box.x + box.w / 2, clientY: r.top + box.y + box.h / 2, bubbles: true, pointerType: 'mouse' }));
      return box;
    }, side);
    await release(page, 1);
    paths[side] = {
      box: b,
      ...(await page.evaluate(() => ({ hovered: window.__theatre.pieces.props.switches.hovered, cursor: window.__theatre.renderer.domElement.style.cursor }))),
    };
  }
  console.log(`  the left path   ${box1(paths.left.box)}  → the arbiter says "${paths.left.hovered}", cursor "${paths.left.cursor}"`);
  console.log(`  the right path  ${box1(paths.right.box)} → the arbiter says "${paths.right.hovered}", cursor "${paths.right.cursor}"`);
  ok(paths.left.hovered === 'cross-left' && paths.right.hovered === 'cross-right', 'each half of the picture answers the pointer, and nothing else announces them');
  ok(paths.left.box.x + paths.left.box.w <= paths.right.box.x + 0.5, 'the two boxes cannot overlap: they are grown outward from the split, not about their own centres');

  // the pendant, and the cues
  console.log(`  the pendant over the table: ${before.pendant} at rest → ${open1.pendant} rad mid-storm`);
  ok(Math.abs(open1.pendant) > 0.001 && Math.abs(open1.pendant) < 0.09, 'the chandelier is swinging a few degrees on the 12 fps clock');
  console.log(`  the rain bed: ${JSON.stringify(open1.rain.bed)}`);
  console.log(`  the thunder's own fader: ${JSON.stringify(open1.thunderBus)}`);
  ok(open1.rain.bed.running === true, 'egg-rain\'s bed is running on the graph');
  ok(open1.thunderBus.fader === true, 'and the thunder has been fired at least once: its fader is on the destination');

  const ev = await page.evaluate(() => window.__ev);
  console.log(`  the bus: ${JSON.stringify(ev)}`);
  ok(ev[0]?.phase === 'storm' && ev.some((e) => e.phase === 'open'), 'props:cross went up for the storm and again for the open door');
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
  console.log(`  →  ${OUT}/egg-cross-r1-strike.png · ${OUT}/egg-cross-r1-swing.png · ${OUT}/egg-cross-r1-open.png`);
}

// =================================================================================================
// 3. THE LIGHT PATH: the room as it was, pixel-compared
// =================================================================================================
if (doing('light')) {
  console.log('\nTHE LIGHT PATH  (a real click on the left half, then the room compared with itself)');
  await fresh();
  const [W, H] = PLATE;
  // THE CLOCK IS FROZEN for this one, and it has to be. The line boils: the drawing is re-struck on
  // every 12 fps step, so two live frames of the same room differ everywhere by the hand. Held at
  // one drawing, the only thing that can differ between before and after is the weather.
  const page = await open(W, H, '&t=6');
  const before = await world(page);
  const bufBefore = await shot(page);
  await snap(page, `${OUT}/egg-cross-r1-before.png`);
  await page.evaluate(() => window.__theatre.pieces.props.cross.set('open'));
  await settle(page);
  const open1 = await world(page);
  ok(open1.phase === 'open' && open1.picture, 'the door is open on the picture');
  const b = await page.evaluate(() => window.__theatre.pieces.props.cross.pathBox('left'));
  await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
  await settle(page);
  const chose = await world(page);
  ok(chose.path === 'light' && chose.phase === 'closing', `the left path is taken (path "${chose.path}", phase "${chose.phase}")`);
  // …and then the three seconds. A frozen clock reports `stepped` on every tick (clock.js: a still
  // has to keep being drawn), so the storm clears on its own, at the renderer's pace, and there is
  // nothing to hand over — only the phase to wait for.
  await page.waitForFunction(() => window.__theatre.pieces.props.cross.phase === 'shut', null, { timeout: 300000, polling: 200 });
  await settle(page);
  const after = await world(page);
  const bufAfter = await shot(page);
  await snap(page, `${OUT}/egg-cross-r1-after-light.png`);
  console.log(`  before: ${JSON.stringify({ ...before.light, phase: before.phase, rain: before.rain.on, pendant: before.pendant })}`);
  console.log(`  after:  ${JSON.stringify({ ...after.light, phase: after.phase, rain: after.rain.on, pendant: after.pendant })}`);
  ok(after.phase === 'shut' && after.path === 'light', `the storm cleared and the choice is remembered (phase "${after.phase}", path "${after.path}")`);
  ok(after.light.state === before.light.state && after.light.key === before.light.key, 'the light is back where it was, and it is the lighting piece that says so');
  ok(after.rain.on === false && after.rain.layers === 0, 'the rain stopped');
  ok(after.doorShown === false && after.picture === false, 'the door is shut on the picture');
  ok(after.pendant === 0, 'and the pendant is hanging still');
  const d = diff(await rawOf(bufBefore), await rawOf(bufAfter));
  console.log(`  the two frames, pixel for pixel: ${d.n} differ${d.box ? ` (inside ${box1(d.box)})` : ''}`);
  ok(d.n === 0, `the room is EXACTLY as it was (${d.n} pixels changed)`);
  console.log(`  →  ${OUT}/egg-cross-r1-before.png · ${OUT}/egg-cross-r1-after-light.png`);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 4. THE DARK PATH: the storm stays for the rest of the evening
// =================================================================================================
if (doing('dark')) {
  console.log('\nTHE DARK PATH  (a real click on the right half, then a later strike)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);
  await page.evaluate(() => {
    window.__ev = [];
    window.__theatre.on('props:cross', (d) => window.__ev.push({ ...d }));
  });
  await gate(page);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.cross.tapBox());
  await page.mouse.click(tap.x + tap.w / 2, tap.y + tap.h / 2);
  await release(page, 21); // the strikes, the swing, the door open
  await settle(page);
  ok((await world(page)).phase === 'open', 'the door is open');
  const b = await page.evaluate(() => window.__theatre.pieces.props.cross.pathBox('right'));
  await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
  await settle(page);
  await release(page, 13); // the leaf swings shut on the picture
  await settle(page);
  const shutOn = await world(page);
  await snap(page, `${OUT}/egg-cross-r1-after-dark.png`);
  console.log(`  after the choice: ${JSON.stringify({ phase: shutOn.phase, path: shutOn.path, light: shutOn.light.state, key: shutOn.light.key, rain: shutOn.rain.layers })}`);
  ok(shutOn.phase === 'dark' && shutOn.path === 'dark', `the door shut on the picture and the storm stayed (phase "${shutOn.phase}")`);
  ok(shutOn.doorShown === false && shutOn.picture === false, 'the doorway is a door again');
  ok(shutOn.light.state === 'cross-storm', `the room is still under the storm's light ("${shutOn.light.state}", key ${shutOn.light.key})`);
  ok(shutOn.rain.on && shutOn.rain.layers === 4, `and it is still raining behind the window (${shutOn.rain.layers} layers)`);

  // …and a strike, thirty to ninety seconds later. The room is asked when the next one is due and
  // then walked to the drawing BEFORE it, so that both halves are proved: nothing on that one, and
  // the whole flash on the next.
  const sched = await page.evaluate(() => window.__theatre.pieces.props.cross.schedule.far);
  const due = await page.evaluate(() => ({ at: window.__theatre.pieces.props.cross.nextStrike, f: window.__theatre.pieces.props.cross.frame }));
  console.log(`  the next strike is due on drawing ${due.at} of the standing storm — ${(due.at / 12).toFixed(1)} s (the schedule allows ${sched[0] / 12} to ${sched[1] / 12} s)`);
  ok(due.at >= sched[0] && due.at <= sched[1], `the thunder stays for the rest of the evening: a strike every ${sched[0] / 12}–${sched[1] / 12} s`);
  // `frame` is the drawing the NEXT update will be given (the counter goes up at the end of one),
  // so walking to the drawing before the strike is `due.at - frame` drawings and not one fewer.
  await release(page, due.at - due.f);
  const justBefore = await world(page);
  ok(!justBefore.flashing, `on the drawing before it, nothing (the storm has had ${justBefore.frame} drawings)`);
  await release(page, 1);
  await settle(page);
  const later = await world(page);
  const bufLater = await shot(page);
  await snap(page, `${OUT}/egg-cross-r1-dark-strike.png`);
  ok(later.flashing && later.light.state === 'cross-flash', `and on the next, the whole flash again — panes white, the room a shade up (light "${later.light.state}", key ${later.light.key})`);
  const img = await rawOf(bufLater);
  console.log(`  →  ${OUT}/egg-cross-r1-after-dark.png · ${OUT}/egg-cross-r1-dark-strike.png (${img.w}x${img.h})`);
  console.log(`  the bus: ${JSON.stringify(await page.evaluate(() => window.__ev))}`);
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 5. NOBODY CHOOSES
// =================================================================================================
if (doing('timeout')) {
  console.log('\nNOBODY CHOOSES  (sixty seconds of drawings, and the door shuts by itself)');
  await fresh();
  const [W, H] = PLATE;
  const page = await open(W, H);
  await gate(page);
  const tap = await page.evaluate(() => window.__theatre.pieces.props.cross.tapBox());
  await page.mouse.click(tap.x + tap.w / 2, tap.y + tap.h / 2);
  await release(page, 21);
  const openAt = await world(page);
  ok(openAt.phase === 'open', 'the door is open and the offer is standing');
  const wait = await page.evaluate(() => window.__theatre.pieces.props.cross.schedule.choice);
  await release(page, wait - 4);
  const nearly = await world(page);
  ok(nearly.phase === 'open', `four drawings short of the minute it is still open (drawing ${nearly.frame} of ${wait})`);
  await release(page, 5);
  const closing = await world(page);
  ok(closing.phase === 'closing' && closing.path === null, `on the minute it starts to shut, and nothing was chosen (phase "${closing.phase}", path ${closing.path})`);
  await release(page, 40);
  await settle(page);
  const done = await world(page);
  console.log(`  after it: ${JSON.stringify({ phase: done.phase, path: done.path, light: done.light.state, rain: done.rain.on })}`);
  ok(done.phase === 'shut' && done.path === null && done.light.state === 'default' && !done.rain.on, 'the door shut, the storm cleared, and the room kept nothing: an offer nobody took is not an answer');
  ok((page.__errors ?? []).length === 0, `no page errors (${(page.__errors ?? []).slice(0, 2).join(' | ') || 'none'})`);
}

// =================================================================================================
// 6. HIS LINE — a whole evening
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
  await release(page, 2);
  await page.waitForFunction(() => (window.__asks ?? []).includes('Choose your path, anon.'), null, { timeout: 200000 }).catch(() => {});
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 200000 }).catch(() => {});
  const said = await placardText(page);
  const state = await page.evaluate(() => ({
    asking: window.__theatre.pieces.dialogue.asking,
    field: !!document.querySelector('#dialogue input'),
    asks: window.__asks,
    says: window.__says,
    shot: window.__theatre.pieces.camera.current,
    beat: window.__theatre.pieces.flow.beat,
    phase: window.__theatre.pieces.props.cross.phase,
  }));
  await snap(page, `${OUT}/egg-cross-r1-said.png`);
  console.log(`  the placard, with the door open: "${said}"`);
  console.log(`  every prompt the placard was handed all evening: ${JSON.stringify(state.asks)}`);
  console.log(`  …and everything dialogue.say was told to cut: ${JSON.stringify(state.says)}`);
  // the sign hand sets the card in small caps, so the placard's own text comes back shouted
  ok(said.toUpperCase().includes('CHOOSE YOUR PATH, ANON.'), `he says it, in those words (${JSON.stringify(said.slice(0, 60))})`);
  ok(state.asking && state.field, 'and the FIELD IS OPEN UNDERNEATH IT: the visitor can answer a door that has just blown open');
  ok(state.asks[state.asks.length - 1] === 'Choose your path, anon.', 'it went to dialogue.ask and not to dialogue.say — the line OVER an open field, which is what keepLast makes it');
  ok(state.shot === 'home' || state.shot === 'wide', `the camera did not cut to the door — he does not turn round (${state.shot})`);
  const once = state.asks.filter((a) => a === 'Choose your path, anon.').length;
  ok(once === 1, `and exactly once (${once})`);
  await release(page, 60);
  const again = await page.evaluate(() => window.__asks.filter((a) => a === 'Choose your path, anon.').length);
  ok(again === 1, `sixty more drawings of the same open door and he says it once, not twice (${again})`);

  // ---- AND THE SAME EVENT OVER A READING -------------------------------------------------------
  // The hardest case for the guard in flow.js: while the visitor is choosing three cards the field
  // IS open — the room has asked them to pick — and a remark about the weather there would cut the
  // placard they are answering. The event is put on the bus by hand, at the real beat, because at
  // the plates a reading is played in the cross is not in the picture and a visitor cannot reach it.
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
  console.log(`  →  ${OUT}/egg-cross-r1-said.png`);
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

  // the storm, and the dark path, driven through the api the way a click does
  await page.evaluate(() => window.__theatre.pieces.props.cross.click());
  await page.waitForFunction(() => window.__theatre.pieces.props.cross.phase === 'open', null, { timeout: 300000 });
  await page.evaluate(() => window.__theatre.pieces.props.cross.choose('dark'));
  await page.waitForFunction(() => window.__theatre.pieces.props.cross.path === 'dark', null, { timeout: 60000 });
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
    // "still going" is measured against the cue's OWN peak — a hundredth of it, 40 dB down — and
    // not against an absolute number, so it says the same thing at any level the table is set to
    let lastLoud = 0;
    for (let i = 0; i < out.l.length; i++) if (Math.abs(out.l[i]) > peak * 0.01) lastLoud = i;
    // where the energy sits: a roll of thunder is nearly all under 200 Hz
    let low = 0, all = 0;
    let prev = 0, lp = 0;
    for (let i = 0; i < out.l.length; i++) {
      lp += (out.l[i] - lp) * 0.05; // a crude one-pole at about 175 Hz
      low += lp * lp;
      all += out.l[i] * out.l[i];
      prev = out.l[i];
    }
    return { peak, seconds: lastLoud / out.sampleRate, level: out.level, length: out.length, lowShare: low / (all || 1) };
  });
  if (!r) ok(false, 'the browser has no OfflineAudioContext');
  else {
    console.log(`  peak ${r.peak.toFixed(4)} (${(20 * Math.log10(r.peak)).toFixed(1)} dBFS) against a wanted level of ${r.level}`);
    console.log(`  it runs ${r.seconds.toFixed(2)} s of the ${r.length} s the cue claims, and ${(100 * r.lowShare).toFixed(0)}% of its energy is under about 175 Hz`);
    ok(r.peak > 0.02 && r.peak < 0.3, 'it is the loudest thing in the room and it is not clipping');
    ok(r.seconds > 2.5, 'a LONG cue, rolled: it is still going seconds after the flash (every other voice in this room is over inside half a second)');
    ok(r.lowShare > 0.5, 'and it is low — a roll of thunder heard through two panes of glass');
  }
  // …and the bed the weather runs under it. A STILL GETS NO BED, by egg-rain's own design (`set()`
  // is the silent door: full rain, no cue, nothing to wait for), so what this line reports is that
  // the still is silent. The running bed is proved in the storm section above, where the visitor's
  // own click starts it.
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
