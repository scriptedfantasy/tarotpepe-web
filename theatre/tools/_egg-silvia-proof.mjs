#!/usr/bin/env node
// PEPE SILVIA, DRIVEN LIKE A VISITOR (the egg in src/pieces/egg-silvia.js).
//
// The framed circuit diagram on the STAGE-LEFT wall — where the round frame hung, and the mirror
// after it — is a cabinet door. Click it and it swings right back on the 12 fps clock; round it
// eighteen drawn sheets go up across the plaster, one every three drawings, each with a tack; then
// thirty lengths of red string are run pin to pin until the wall is a web. A second click, on the
// frame or on any card, takes the whole thing down and puts the room back.
//
// THAT WALL IS SEEN AT A RAKE, which is what this tool is really measuring. It is 67 degrees off
// the picture plane at the home plate, so it is cropped by the WINDOW'S ASPECT and not by the shot:
// 1600 x 900 and 1920 x 1080 hold the frame and the whole board, 1280 x 800 crops the wall at
// z -0.10 and keeps a 24 px sliver of it with the frame out of shot, and a 390 x 844 phone does not
// see one pixel of that wall. The phone section below measures that and prints it as a fact; it is
// not a failure and there is nothing this egg can do about it. The plate this tool drives is
// therefore 1600 x 900 and not the 1280 x 800 the back-wall version used.
//
// Nothing here asks the piece whether it thinks it worked. It puts a real pointer on the leaf's own
// projected box, clicks it, and asks six independent witnesses:
//
//   the DRAWING   frames at the home plate: at rest, mid-swing, the board half up, the string half
//                 run, the board complete, the take-down halfway, and the room as it was — plus 3x
//                 crops of the PEPE SILVIA card at both landscape plates, and the middle of the web
//   the STATE     props.silvia.phase / .open / .progress, and the sheets' own visibility
//   the EVENT     what came out of ctx.emit('props:silvia', …) on the page's own bus
//   the SOUND     sound.timeline, which is what the audio graph was actually given, plus a stub
//                 over play() so a cue that never reached the graph is still caught
//   the PIXELS    the room after the take-down, against the room before the click; the count of
//                 string-red inside the shelf of jars; and the LETTERING, measured in screen pixels
//                 per sort, which is the number the whole layout was built around
//   the WIRE      a second server with PEPE_FAKE: the `silvia` beat on the POST, his line up on the
//                 placard, and the visitor's field open again underneath it
//
// WHAT MAY NOT BE COVERED, AND WHY IT IS RAYCAST AND NOT COUNTED. The switchboard, the wall shelf
// and its two jars are on this same wall. A count of dark pixels inside the switchboard's box would
// prove nothing — the switchboard IS a black japanned case — and its box on the glass runs right up
// to the strip of plaster the board is pinned on, so a card beside it lands inside that box without
// covering a millimetre of it. So the claim is made the only way it can be: rays are fired through
// the box, and for each ray that actually strikes the switchboard the depth of the nearest thing of
// the board's is compared with it. A board hit that is NEARER is a board covering it. The shelf and
// the jars are far enough upstage that a pixel count works there as well, and both are done.
//
// THE STILLS OF THE MIDDLE OF THE MOVE ARE HELD, NOT RACED, and that is not a convenience. This
// machine renders the room in software: one drawn frame can take a fifth of a second, so the 12 fps
// clock walks through three or four drawings between two of them and a tool waiting for "nine
// sheets up" is shown eighteen. `?silvia=<n>` / props.silvia.hold(n) poses the run at its nth
// drawing with the clock's hand off it, which is the same hatch every other egg in this room has.
// The EVENTS, the CUES and the timing are taken off a real pointer and a real run, which is the
// other half and the half that cannot be faked.
//
//   BASE=http://127.0.0.1:8734 FAKE=http://127.0.0.1:8735 node tools/_egg-silvia-proof.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { situation } from '../server/pepe.mjs';

const BASE = (process.env.BASE ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const FAKE = (process.env.FAKE ?? BASE).replace(/\/$/, '');
const OUT = process.env.OUT ?? '/tmp/egg-silvia-left';
mkdirSync(OUT, { recursive: true });

const PLATE = [1600, 900]; // the smallest home plate that holds the frame at all
const BIG = [1920, 1080];
const NARROW = [1280, 800]; // …which crops this wall at z -0.10
const PHONE = [390, 844];

// the longest line on each of the five sheets that carry words, and how many sorts are in it.
// px-per-sort is the card's inner width on the glass divided by this, and eight is the figure the
// NAKAMOTO card in the frame on the back wall is set at and reads at.
const WORDS = { silvia: ['SILVIA', 6], carol: ['CAROL', 5], who: ['WHO IS', 6], mail: ['MAIL FOR', 8], nosuch: ['NO SUCH', 7] };
// …measured the same way at either plate: the card's inner width projected, in screen px, over the
// sorts in its longest line. With one cap height a card (egg-silvia.js, sheetCanvas) the longest
// line fills that width, so this is the lettering's own figure and not an upper bound on it.
const LETTERING = (WORDS) => {
  const t = window.__theatre;
  t.camera.updateMatrixWorld(true);
  const THREE = t.THREE;
  const W = window.innerWidth, H = window.innerHeight;
  const proj = (v) => {
    const p = v.clone().project(t.camera);
    return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
  };
  const g = t.scene.getObjectByName('silvia-board');
  const out = [];
  for (const id of Object.keys(WORDS)) {
    const [word, sorts] = WORDS[id];
    const m = g.children.find((o) => o.name === 'silvia-sheet-' + id);
    if (!m) continue;
    // the paper's inner width: the plane carries 10 px of margin at 660 px/m either side, and the
    // lettering is set inside a further 22 mm of card
    const inner = m.geometry.parameters.width - 20 / 660 - 0.044;
    const a = proj(m.localToWorld(new THREE.Vector3(-inner / 2, 0, 0)));
    const b = proj(m.localToWorld(new THREE.Vector3(inner / 2, 0, 0)));
    const wide = Math.hypot(b[0] - a[0], b[1] - a[1]);
    out.push({ id, word, sorts, px: +wide.toFixed(1), per: +(wide / sorts).toFixed(1) });
  }
  return out;
};

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  });

// THE KICK, and without it none of this measures anything: a headless page stops calling
// requestAnimationFrame once the load settles, the theatre's loop stops with it, and a click is
// answered in state while the drawing never moves. One CSS animation on a 1 px div keeps the frame
// pipeline turning, which is what a real browser on a real desk does anyway. It is injected by the
// TOOL and is no part of the page.
async function kick(page) {
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;animation:k 1s linear infinite';
    const st = document.createElement('style');
    st.textContent = '@keyframes k{from{transform:translateX(0)}to{transform:translateX(1px)}}';
    document.head.appendChild(st);
    document.body.appendChild(d);
  });
}

async function open(base, w, h, query = '') {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${base}/${query}`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 900000 });
  await kick(page);
  page.__errors = errors;
  return page;
}

// WAIT BY COUNTING DRAWINGS, NEVER BY COUNTING SECONDS: this page renders at about one frame a
// second under a software rasteriser, and a sleep long enough to be safe there is a minute here.
async function frames(page, n = 6) {
  const to = (await page.evaluate(() => window.__theatre.clock.frame)) + n;
  await page.waitForFunction((f) => window.__theatre.clock.frame >= f, to, { timeout: 300000, polling: 'raf' });
}

async function crop(buf, box, out, { pad = 8, scale = 3 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.min(meta.width - left, Math.round(box.w + pad * 2));
  const height = Math.min(meta.height - top, Math.round(box.h + pad * 2));
  if (width < 2 || height < 2) return false;
  await sharp(buf).extract({ left, top, width, height }).resize({ width: width * scale, height: height * scale, kernel: 'nearest' }).png().toFile(out);
  return true;
}

const raw = (buf) => sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// WHAT COUNTS AS THE STRING'S RED, and it is narrow on purpose: HIS MOUTH IS RED TOO. Sampled off
// the frames themselves — his lip is (208,120,104) and a length of string is (200,32,40), so the
// test is on the GREEN: the string has almost none and the mouth has plenty.
function isRed(r, g, b) {
  return r > 120 && g < 90 && b < 110 && r - g > 70 && r - b > 55;
}
async function redPixels(buf, inside = null) {
  const { data, info } = await raw(buf);
  let n = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      if (inside && !inside(x, y)) continue;
      const i = (y * info.width + x) * info.channels;
      if (isRed(data[i], data[i + 1], data[i + 2])) n++;
    }
  return n;
}
async function diffPixels(a, b, tol = 18, inside = null) {
  const A = await raw(a), B = await raw(b);
  let n = 0, total = 0;
  for (let y = 0; y < A.info.height; y++)
    for (let x = 0; x < A.info.width; x++) {
      if (inside && !inside(x, y)) continue;
      total++;
      const i = (y * A.info.width + x) * A.info.channels;
      if (Math.abs(A.data[i] - B.data[i]) > tol || Math.abs(A.data[i + 1] - B.data[i + 1]) > tol || Math.abs(A.data[i + 2] - B.data[i + 2]) > tol) n++;
    }
  return { n, total, pct: total ? (n / total) * 100 : 0 };
}

const fails = [];
const ok = (cond, line) => {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};

// The page-side helper both the sweep and the geometry use: everything on the stage-left wall that
// may not be covered, found where it stands rather than by a name it may not have.
const PROTECTED = `(function () {
  const t = window.__theatre;
  const THREE = t.THREE;
  const props = t.scene.getObjectByName('props');
  const board = t.scene.getObjectByName('switchboard');
  const shelfSet = new Set();
  props.traverse((o) => {
    if (!o.isMesh) return;
    const p = new THREE.Vector3();
    o.getWorldPosition(p);
    // the wall shelf and the two jars on it: against the stage-left plaster, upstage of z -1.9
    if (p.x < -2.30 && p.z < -1.90 && p.z > -2.70 && p.y > 1.05 && p.y < 1.75) shelfSet.add(o);
  });
  return { t, board, shelfSet };
})()`;

// =================================================================================================
// 1. the frame on the glass, in every window the film is judged at
// =================================================================================================
console.log('\nTHE FRAME ON THE GLASS  ("in frame" means the whole box is inside the picture)');
{
  const page = await open(BASE, ...PLATE, '?view=props&state=default&shot=1');
  for (const [W, H] of [NARROW, PLATE, BIG, PHONE]) {
    await page.setViewportSize({ width: W, height: H });
    await frames(page, 2); // a new window shape is a new set of frames; let the camera re-solve
    const m = await page.evaluate(() => {
      const t = window.__theatre;
      t.pieces.camera.cut('home');
      t.camera.updateMatrixWorld(true);
      const s = t.pieces.props.silvia;
      return { box: s.hitBox(), tap: s.tapBox() };
    });
    const b = m.box, tp = m.tap;
    const inFrame = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
    const seen = b.x + b.w > 0 && b.x < W;
    console.log(
      `  ${String(W + 'x' + H).padEnd(9)} frame ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
        `   tap ${tp.w.toFixed(0)} x ${tp.h.toFixed(0)}${tp.grown ? ' (GROWN)' : ' (the frame itself)'}   ${inFrame ? 'IN FRAME' : seen ? 'PART IN FRAME' : 'OUT OF FRAME'}`,
    );
    if (W === PLATE[0]) ok(inFrame, 'the whole frame is inside a 1600x900 picture');
    if (W === BIG[0]) ok(inFrame, 'the whole frame is inside a 1920x1080 picture');
    if (W === PHONE[0]) ok(!seen, 'a 390x844 phone sees none of this wall — measured, and stated as a fact, not a failure');
  }
  await page.close();
}

// =================================================================================================
// 2. a real pointer on the frame: the swing, the board, the string, and the room put back
// =================================================================================================
console.log('\nA POINTER ON THE FRAME  (1600x900, home; the sound piece is live — no ?shot=1)');
let restBuf = null, backBuf = null, geom = null;
{
  const page = await open(BASE, ...PLATE, '?view=props&state=default');
  await page.evaluate(() => {
    window.__sil = [];
    window.__theatre.on('props:silvia', (d) => window.__sil.push(d));
    const s = window.__theatre.pieces.sound;
    window.__cues = [];
    const real = s.play.bind(s);
    s.play = (name, opts) => {
      window.__cues.push(name);
      return real(name, opts);
    };
  });
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await frames(page, 6);

  const read = () =>
    page.evaluate(() => {
      const t = window.__theatre;
      const s = t.pieces.props.silvia;
      const board = t.scene.getObjectByName('silvia-board');
      const string = t.scene.getObjectByName('silvia-string');
      return {
        phase: s.phase,
        open: s.open,
        progress: s.progress,
        up: board ? board.children.filter((o) => o.name.startsWith('silvia-sheet-') && o.visible).length : -1,
        string: !!string?.visible,
        cursor: t.renderer.domElement.style.cursor || '(none)',
        cues: window.__cues.slice(),
        timeline: (t.pieces.sound.timeline ?? []).map((x) => x.name).slice(-8),
        events: window.__sil.slice(),
      };
    });

  // WHERE EVERYTHING IS, taken off the scene itself so that nothing here is a number copied out of
  // the piece: his face, the switchboard, the shelf of jars, and the board's own extent on the wall.
  geom = await page.evaluate(
    (P) => {
      const t = window.__theatre;
      t.camera.updateMatrixWorld(true);
      const THREE = t.THREE;
      const W = window.innerWidth, H = window.innerHeight;
      const proj = (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(t.camera);
        return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
      };
      const boxOf = (o) => {
        const b = new THREE.Box3().setFromObject(o);
        const xs = [], ys = [];
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
          const [a, c] = proj(x, y, z);
          xs.push(a);
          ys.push(c);
        }
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), world: { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) } };
      };
      const { board, shelfSet } = eval(P);
      const shelfBox = (() => {
        const b = new THREE.Box3();
        for (const o of shelfSet) b.expandByObject(o);
        const xs = [], ys = [];
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
          const [a, c] = proj(x, y, z);
          xs.push(a);
          ys.push(c);
        }
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), world: { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) } };
      })();
      const s = t.pieces.props.silvia;
      // the web's middle, for the 3x crop: the mean of the tacks, projected through a sheet's mesh
      const g = t.scene.getObjectByName('silvia-board');
      const any = g.children.find((o) => o.name === 'silvia-sheet-silvia');
      const c = new THREE.Vector3(0, 0, 0);
      any.localToWorld(c);
      const [wx, wy] = proj(c.x, c.y, c.z);
      return {
        head: boxOf(t.pieces.pepe.headPivot),
        switchboard: boxOf(board),
        shelf: shelfBox,
        web: { x: wx - 60, y: wy - 55, w: 120, h: 110 },
        sheets: s.sheets,
        schedule: s.schedule,
      };
    },
    PROTECTED,
  );
  console.log(`  his face on the glass   ${geom.head.w.toFixed(0)} x ${geom.head.h.toFixed(0)} px at ${geom.head.x.toFixed(0)},${geom.head.y.toFixed(0)}`);
  console.log(`  the switchboard         ${geom.switchboard.w.toFixed(0)} x ${geom.switchboard.h.toFixed(0)} px at ${geom.switchboard.x.toFixed(0)},${geom.switchboard.y.toFixed(0)}   world ${JSON.stringify(geom.switchboard.world)}`);
  console.log(`  the shelf and its jars  ${geom.shelf.w.toFixed(0)} x ${geom.shelf.h.toFixed(0)} px at ${geom.shelf.x.toFixed(0)},${geom.shelf.y.toFixed(0)}   world ${JSON.stringify(geom.shelf.world)}`);
  console.log(`  the schedule, in drawings: ${JSON.stringify(geom.schedule)}`);

  const box0 = await page.evaluate(() => window.__theatre.pieces.props.silvia.hitBox());
  const cx = box0.x + box0.w / 2, cy = box0.y + box0.h / 2;
  console.log(`  the frame's own box     x ${box0.x.toFixed(0)} y ${box0.y.toFixed(0)}  ${box0.w.toFixed(0)} x ${box0.h.toFixed(0)} px  →  clicking ${cx.toFixed(0)},${cy.toFixed(0)}`);

  const before = await read();
  console.log('  before                  ', JSON.stringify({ phase: before.phase, up: before.up, string: before.string, cursor: before.cursor }));
  ok(before.phase === 'shut' && before.up === 0 && !before.string, 'a reload finds a picture on a wall: nothing pinned, no string');
  ok(before.cursor === '(none)', 'nothing announces it: no cursor before a pointer goes near it');

  restBuf = await page.screenshot({ timeout: 180000 });
  await sharp(restBuf).png().toFile(`${OUT}/silvia-1-rest-1600x900.png`);
  await crop(restBuf, box0, `${OUT}/silvia-1-rest-3x.png`, { scale: 3 });
  const redRest = await redPixels(restBuf);
  console.log(`  string-red in the room before it is touched: ${redRest} px`);
  ok(redRest === 0, 'there is no string red anywhere in the room before it is touched');

  await page.mouse.move(PLATE[0] - 40, PLATE[1] - 40);
  await frames(page, 4);
  ok((await read()).cursor === '(none)', "the cursor is the page's own away from the frame");
  await page.mouse.move(cx, cy);
  await frames(page, 4);
  ok((await read()).cursor === 'pointer', 'hover over the frame makes the cursor a pointer, and that is the whole affordance');

  // ---- the click, and the whole run, in real time -------------------------------------------------
  const t0 = Date.now();
  await page.mouse.click(cx, cy);
  await page.waitForFunction(() => window.__theatre.pieces.props.silvia.phase === 'opening', null, { timeout: 120000, polling: 'raf' });
  const hit = await read();
  console.log('  the moment it is clicked', JSON.stringify({ phase: hit.phase, cues: hit.cues }));
  ok(hit.cues.includes('latch'), "the catch ('latch') was asked for on the pointer");
  ok(hit.timeline.includes('latch'), "the 'latch' cue reached the audio graph (sound.timeline)");
  ok(hit.progress.cards === 0, 'nothing is pinned yet: the door goes first');

  await page.waitForFunction(() => window.__theatre.pieces.props.silvia.open, null, { timeout: 600000, polling: 'raf' });
  await frames(page, 2);
  const up = await read();
  const upBuf = await page.screenshot({ timeout: 180000 });
  await sharp(upBuf).png().toFile(`${OUT}/silvia-5-board-1600x900.png`);
  console.log('  the board complete      ', JSON.stringify({ phase: up.phase, up: up.up, segments: up.progress.segments, degrees: up.progress.degrees, events: up.events }));
  ok(up.up === 18, 'all eighteen sheets are pinned');
  ok(up.progress.segments === 30, 'all thirty lengths of string are run');
  ok(up.cues.filter((c) => c === 'tap').length === 18, 'eighteen tacks went in, one a sheet, and every one of them reached the room');
  ok(up.events.length === 1 && up.events[0].open === true, "ctx.emit('props:silvia', { open: true }) fired once, when the last length was tied");
  ok(Math.abs(up.progress.degrees - 140) < 1, 'the leaf came to rest at 140 degrees, which is where the sweep put it');
  const redUp = await redPixels(upBuf);
  console.log(`  string-red on the glass  ${redUp} px`);
  ok(redUp > 200, 'the string is really there and really red');

  // ---- the LETTERING, in screen pixels per sort ---------------------------------------------------
  console.log('\nTHE LETTERING AT THE RAKE  (a card\'s inner width on the glass, divided by the sorts in its longest line)');
  const letters = await page.evaluate(LETTERING, WORDS);
  for (const l of letters) console.log(`  ${l.id.padEnd(8)} "${l.word}"${' '.repeat(Math.max(0, 10 - l.word.length))} ${String(l.px).padStart(6)} px across the card   ${String(l.per).padStart(5)} px a sort`);
  const silviaPer = letters.find((l) => l.id === 'silvia')?.per ?? 0;
  ok(silviaPer >= 8, `PEPE SILVIA reads on a 1600x900 home plate: ${silviaPer} px a sort, against the NAKAMOTO card's eight`);

  // the crops the eye is meant to judge
  const cardBox = await page.evaluate(() => window.__theatre.pieces.props.silvia.sheetBox('silvia'));
  await crop(upBuf, cardBox, `${OUT}/silvia-5-card-pepe-silvia-3x-1600x900.png`, { scale: 3 });
  const carolBox = await page.evaluate(() => window.__theatre.pieces.props.silvia.sheetBox('carol'));
  await crop(upBuf, carolBox, `${OUT}/silvia-5-card-carol-3x-1600x900.png`, { scale: 3 });
  await crop(upBuf, geom.web, `${OUT}/silvia-5-web-3x-1600x900.png`, { scale: 3, pad: 0 });

  // ---- 3. what is never covered -------------------------------------------------------------------
  console.log('\nWHAT IS NEVER COVERED  (his face, the switchboard, the shelf and its two jars)');
  const cover = await page.evaluate(
    ([P, sb, sh, head]) => {
      const { t, board, shelfSet } = eval(P);
      const THREE = t.THREE;
      t.camera.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const W = window.innerWidth, H = window.innerHeight;
      const nameOf = (o) => {
        for (let q = o; q; q = q.parent) if (q.name) return q.name;
        return o.type;
      };
      const shown = (o) => {
        for (let q = o; q; q = q.parent) if (q.visible === false) return false;
        return true;
      };
      const under = (o, root) => {
        for (let q = o; q; q = q.parent) if (q === root) return true;
        return false;
      };
      // A SHEET AND THE STRING ARE CUT-OUTS, AND THE RAYCASTER DOES NOT KNOW THAT. Both are drawn on
      // a transparent canvas and cut with alphaTest, so their PLANES are whole rectangles of wall
      // and a ray through the clear part of one is not a ray through anything. Untested, the
      // string's sheet — one plane over the whole board — read as forty rays lying across the
      // switchboard's downstage edge, where in the drawing there is nothing at all. So a hit is
      // only a hit where the canvas is actually inked, read at the hit's own uv.
      const inked = (h) => {
        const img = h.object.material && h.object.material.map && h.object.material.map.image;
        if (!img || !h.uv || !img.getContext) return true;
        const cw = img.width, ch = img.height;
        const px = Math.min(cw - 1, Math.max(0, Math.floor(h.uv.x * cw)));
        const py = Math.min(ch - 1, Math.max(0, Math.floor((1 - h.uv.y) * ch)));
        return img.getContext('2d', { willReadFrequently: true }).getImageData(px, py, 1, 1).data[3] > 127;
      };
      const sweep = (bx, isTarget, n = 40) => {
        const out = { n: 0, onTarget: 0, covered: 0, worst: null };
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            const x = bx.x + (bx.w * (i + 0.5)) / n, y = bx.y + (bx.h * (j + 0.5)) / n;
            if (x < 0 || x > W || y < 0 || y > H) continue;
            out.n++;
            ray.setFromCamera(new THREE.Vector2((x / W) * 2 - 1, -(y / H) * 2 + 1), t.camera);
            const hits = ray.intersectObjects(t.scene.children, true).filter((q) => shown(q.object));
            const mine = hits.find((q) => /^silvia-/.test(nameOf(q.object)) && inked(q));
            const target = hits.find((q) => isTarget(q.object));
            if (!target) continue;
            out.onTarget++;
            if (mine && mine.distance < target.distance) {
              out.covered++;
              out.worst = nameOf(mine.object);
            }
          }
        return out;
      };
      const pepeRoot = t.pieces.pepe.group ?? t.pieces.pepe.root ?? t.pieces.pepe.headPivot;
      return {
        face: sweep(head, (o) => under(o, t.pieces.pepe.headPivot) || under(o, pepeRoot), 20),
        board: sweep(sb, (o) => under(o, board)),
        shelf: sweep(sh, (o) => shelfSet.has(o)),
      };
    },
    [PROTECTED, geom.switchboard, geom.shelf, geom.head],
  );
  console.log(`  his face        ${String(cover.face.onTarget).padStart(4)} of ${String(cover.face.n).padStart(4)} rays strike him;           ${cover.face.covered} have a sheet or a string in front${cover.face.worst ? ' (' + cover.face.worst + ')' : ''}`);
  console.log(`  the switchboard ${String(cover.board.onTarget).padStart(4)} of ${String(cover.board.n).padStart(4)} rays strike it;            ${cover.board.covered} have a sheet or a string in front${cover.board.worst ? ' (' + cover.board.worst + ')' : ''}`);
  console.log(`  the shelf/jars  ${String(cover.shelf.onTarget).padStart(4)} of ${String(cover.shelf.n).padStart(4)} rays strike them;          ${cover.shelf.covered} have a sheet or a string in front${cover.shelf.worst ? ' (' + cover.shelf.worst + ')' : ''}`);
  ok(cover.face.covered === 0, 'nothing of the board is in front of his face');
  ok(cover.board.onTarget > 200 && cover.board.covered === 0, 'nothing of the board is in front of the switchboard, on any of sixteen hundred rays');
  ok(cover.shelf.onTarget > 50 && cover.shelf.covered === 0, 'nothing of the board is in front of the shelf or its jars');

  const inShelf = (x, y) => x >= geom.shelf.x && x <= geom.shelf.x + geom.shelf.w && y >= geom.shelf.y && y <= geom.shelf.y + geom.shelf.h;
  const redShelf = await redPixels(upBuf, inShelf);
  const dShelf = await diffPixels(restBuf, upBuf, 18, inShelf);
  const control = (x, y) => x > 1100 && x < 1300 && y > 200 && y < 500; // the back wall, untouched: the boil
  const dCtl = await diffPixels(restBuf, upBuf, 18, control);
  console.log(`  string-red inside the shelf's box: ${redShelf} px; its pixels differ by ${dShelf.pct.toFixed(2)}% with the board up, against ${dCtl.pct.toFixed(2)}% on untouched wall — the boil`);
  ok(redShelf === 0, 'not one pixel of string is on the shelf or the jars');
  ok(dShelf.pct < dCtl.pct * 2 + 2, 'the shelf is the same drawing with the board up as without it');

  // …and the same claim in metres, off the sheets' own rectangles against the two world boxes
  const clash = geom.sheets.filter((s) => {
    // a sheet is at world x -2.594, z = 0.3 - s.x, y = s.y; its rectangle runs s.w along z, s.h in y
    const z0 = 0.3 - s.x - s.w / 2, z1 = 0.3 - s.x + s.w / 2;
    const y0 = s.y - s.h / 2, y1 = s.y + s.h / 2;
    const hit = (b) => z0 < b.max[2] && z1 > b.min[2] && y0 < b.max[1] && y1 > b.min[1];
    return hit(geom.switchboard.world) || hit(geom.shelf.world);
  });
  console.log(`  sheets whose rectangle reaches the switchboard or the shelf, in metres: ${clash.length ? clash.map((s) => s.id).join(', ') : 'none'}`);
  ok(clash.length === 0, 'no sheet is pinned within reach of either, in metres, whatever the camera does');
  const band = geom.sheets.reduce(
    (a, s) => ({ x0: Math.min(a.x0, s.x - s.w / 2), x1: Math.max(a.x1, s.x + s.w / 2), y0: Math.min(a.y0, s.y - s.h / 2), y1: Math.max(a.y1, s.y + s.h / 2) }),
    { x0: 9, x1: -9, y0: 9, y1: -9 },
  );
  console.log(`  the board's own extent on the wall: x ${band.x0.toFixed(3)} .. ${band.x1.toFixed(3)} upstage, y ${band.y0.toFixed(3)} .. ${band.y1.toFixed(3)}`);
  // the band's downstage limit is the press door's architrave at x -0.66, not the edge of the
  // picture: two clippings run off the left of the frame on purpose, and a board that stopped where
  // the picture stops would be a board the size of the picture
  ok(band.x1 <= 0.635 && band.x0 >= -0.6 && band.y0 >= 0.965 && band.y1 <= 2.30, 'every sheet is inside the band: above the dado, below the duct, downstage of the switchboard, short of the press door');

  // ---- 4. the second click, on a CARD -------------------------------------------------------------
  console.log('\nTHE SECOND CLICK  (on a pinned CARD this time, which the piece has to answer as well)');
  const cardHit = await page.evaluate(() => window.__theatre.pieces.props.silvia.sheetBox('silvia'));
  await page.mouse.click(cardHit.x + cardHit.w / 2, cardHit.y + cardHit.h / 2);
  await page.waitForFunction(() => window.__theatre.pieces.props.silvia.phase === 'closing', null, { timeout: 120000, polling: 'raf' });
  ok(true, 'a click on a pinned card takes the board down, not only a click on the frame');

  await page.waitForFunction(() => window.__theatre.pieces.props.silvia.phase === 'shut', null, { timeout: 600000, polling: 'raf' });
  await frames(page, 4);
  const back = await read();
  backBuf = await page.screenshot({ timeout: 180000 });
  await sharp(backBuf).png().toFile(`${OUT}/silvia-7-back-1600x900.png`);
  console.log(`  the whole of it, click to click to shut: ${((Date.now() - t0) / 1000).toFixed(1)} s of wall clock on a software renderer`);
  console.log('\nTHE ROOM AS IT WAS  (pixel-compared against the frame before the click)');
  console.log('  after                   ', JSON.stringify({ phase: back.phase, up: back.up, string: back.string, degrees: back.progress.degrees, events: back.events }));
  ok(back.up === 0 && !back.string && back.progress.degrees === 0, 'nothing pinned, no string, the leaf back on the wall');
  ok(back.events.length === 2 && back.events[1].open === false, "ctx.emit('props:silvia', { open: false }) fired when it was down");
  ok((await redPixels(backBuf)) === 0, 'there is no string red left anywhere in the room');
  // A COUNT OF A CUE HUNG ON A CROSSING IS A FLOOR AND NOT A NUMBER on this machine: the take-down
  // fires a rustle every fourth sheet, and a software renderer that walks nine drawings between two
  // frames crosses four multiples of four in one step and fires once. So the claim is the one that
  // is actually being made — paper coming off, and not a tack going in.
  const downRustle = back.cues.filter((c) => c === 'rustle').length;
  const downTaps = back.cues.filter((c) => c === 'tap').length - up.cues.filter((c) => c === 'tap').length;
  console.log(`  coming down it asked for ${downRustle} rustle(s) and ${downTaps} tack(s)`);
  ok(downRustle >= 2 && downTaps === 0, 'the sheets came off with paper cues, and not one tack went in on the way down');
  const wall = (x, y) => x >= 0 && x < 140 && y > 120 && y < 700; // the strip of stage-left wall the board is on
  const dw = await diffPixels(restBuf, backBuf, 18, wall);
  const dc2 = await diffPixels(restBuf, backBuf, 18, control);
  console.log(`  the wall the board was on differs by ${dw.pct.toFixed(2)}% of its pixels (${dw.n}/${dw.total})`);
  console.log(`  the back wall, never touched,        ${dc2.pct.toFixed(2)}% (${dc2.n}/${dc2.total})  — this is the boil`);
  ok(dw.pct < dc2.pct * 2.5 + 1.5, 'the wall is back: it differs no more than the boil differs anywhere else');

  // ---- 5. the stills of the middle of the move, held ----------------------------------------------
  console.log('\nTHE DRAWINGS IN BETWEEN  (held with props.silvia.hold(n), which is what ?silvia=<n> does)');
  const holds = [
    [3, false, '2-swing', 'the leaf off the wall, nothing pinned'],
    [28, false, '3-half', 'the board half up, no string yet'],
    [73, false, '4-string', 'the string half run'],
    [12, true, '6-taking-down', 'the string gone, the sheets coming off'],
  ];
  for (const [f, closing, tag, what] of holds) {
    await page.evaluate(([n, c]) => window.__theatre.pieces.props.silvia.hold(n, c), [f, closing]);
    await frames(page, 2);
    const r = await read();
    const buf = await page.screenshot({ timeout: 180000 });
    await sharp(buf).png().toFile(`${OUT}/silvia-${tag}-1600x900.png`);
    const red = await redPixels(buf);
    console.log(`  drawing ${String(closing ? 'down' + f : f).padEnd(6)} ${what.padEnd(38)} leaf ${String(r.progress.degrees).padStart(5)}°  sheets ${String(r.up).padStart(2)}  string ${String(r.progress.segments).padStart(2)}  red ${red}`);
    if (tag === '2-swing') ok(r.progress.degrees > 10 && r.progress.degrees < 130 && r.up === 0, 'mid-swing: the leaf is off the wall and nothing is pinned');
    if (tag === '3-half') ok(r.up >= 8 && r.up <= 11 && r.progress.segments === 0 && red === 0, 'half up: nine or so sheets, and not a length of string yet');
    if (tag === '4-string') ok(r.up === 18 && r.progress.segments > 8 && r.progress.segments < 30 && red > 60, 'the string half run: every card up, some of the web');
    if (tag === '6-taking-down') ok(r.up > 3 && r.up < 16 && r.progress.segments === 0 && red === 0, 'the take-down: the string went first, the sheets are coming off');
  }
  await page.evaluate(() => window.__theatre.pieces.props.silvia.set(false));

  console.log('\n  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors');
  await page.close();
}

// =================================================================================================
// 6. WHAT EACH WINDOW SHAPE KEEPS OF THE BOARD, which on this wall is the whole question
// =================================================================================================
console.log('\nWHAT THE HOME PLATE SEES OF THE BOARD, per window shape');
{
  for (const [W, H] of [NARROW, PLATE, BIG, PHONE]) {
    const page = await open(BASE, W, H, '?view=props&state=silvia-open&shot=1');
    await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
    await frames(page, 6);
    const buf = await page.screenshot({ timeout: 180000 });
    await sharp(buf).png().toFile(`${OUT}/silvia-home-${W}x${H}.png`);
    const m = await page.evaluate(() => {
      const t = window.__theatre;
      const s = t.pieces.props.silvia;
      const W = window.innerWidth, H = window.innerHeight;
      const whole = [], part = [], gone = [];
      let x0 = 1e9, x1 = -1e9;
      for (const q of s.sheets) {
        const b = s.sheetBox(q.id);
        if (!b) continue;
        if (b.x + b.w <= 0 || b.x >= W || b.y + b.h <= 0 || b.y >= H) gone.push(q.id);
        else {
          (b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H ? whole : part).push(q.id);
          x0 = Math.min(x0, Math.max(0, b.x));
          x1 = Math.max(x1, Math.min(W, b.x + b.w));
        }
      }
      return { frame: s.hitBox(), whole, part, gone, n: s.sheets.length, strip: x1 > x0 ? [Math.round(x0), Math.round(x1)] : null };
    });
    const red = await redPixels(buf);
    console.log(
      `  ${String(W + 'x' + H).padEnd(9)} ${String(m.whole.length).padStart(2)} sheets whole, ${String(m.part.length).padStart(2)} part, ${String(m.gone.length).padStart(2)} out of the picture` +
        `   the board occupies screen x ${m.strip ? m.strip.join('..') : '— none of it'}   string-red ${red} px`,
    );
    if (m.gone.length) console.log(`             out of the picture: ${m.gone.join(', ')}`);
    if (W === PLATE[0]) {
      ok(m.whole.length + m.part.length === 18, 'every one of the eighteen sheets is in a 1600x900 picture');
      ok(red > 200, 'the red string reads at 1600x900');
      // the 3x crop of the big card at this plate is taken in section 2
    }
    if (W === BIG[0]) {
      ok(m.whole.length + m.part.length === 18, 'every one of the eighteen sheets is in a 1920x1080 picture');
      const cardBox = await page.evaluate(() => window.__theatre.pieces.props.silvia.sheetBox('silvia'));
      await crop(buf, cardBox, `${OUT}/silvia-5-card-pepe-silvia-3x-1920x1080.png`, { scale: 3 });
      const big = await page.evaluate(LETTERING, WORDS);
      for (const l of big) console.log(`             ${l.id.padEnd(8)} "${l.word}"${' '.repeat(Math.max(0, 10 - l.word.length))} ${String(l.px).padStart(6)} px across the card   ${String(l.per).padStart(5)} px a sort`);
      ok((big.find((l) => l.id === 'silvia')?.per ?? 0) >= 10, 'PEPE SILVIA is ten pixels a sort or better at 1920x1080');
    }
    if (W === NARROW[0]) {
      console.log('             1280x800 crops this wall at z -0.10: the frame is out of shot and the board is a sliver. Measured, not a failure.');
      ok(m.gone.length + m.part.length > 0, 'the 1280x800 crop is real and is documented');
    }
    if (W === PHONE[0]) {
      ok(m.gone.length === 18, 'a 390x844 phone sees none of the board, because it sees none of that wall');
      ok(red === 0, 'and therefore no string on a phone: the crop, not the drawing');
    }
    ok(page.__errors.length === 0, `no page errors at ${W}x${H}`);
    await page.close();
  }
}

// =================================================================================================
// 7. the beat on the wire, with PEPE_FAKE at the other end
// =================================================================================================
console.log('\nTHE BEAT ON THE WIRE  (PEPE_FAKE)');
console.log('situation({beat:"silvia"}):');
console.log('  ' + situation({ beat: 'silvia' }));
if (FAKE === BASE) {
  console.log('  (no FAKE server given — start one with PEPE_FAKE=1 on its own port and pass FAKE=)');
} else {
  const page = await open(FAKE, ...PLATE, '');
  const posts = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/pepe')) {
      try {
        posts.push(JSON.parse(r.postData() ?? '{}'));
      } catch {}
    }
  });
  await page.evaluate(() => {
    window.__sil = [];
    window.__theatre.on('props:silvia', (d) => window.__sil.push(d));
  });
  await page.mouse.click(800, 450);
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 300000 });
  console.log(`  the field is open before the frame is touched: ${await page.evaluate(() => window.__theatre.pieces.dialogue.asking)}`);
  const n0 = posts.length;

  await page.evaluate(() => window.__theatre.pieces.props.silvia.toggle());
  await page.waitForFunction(() => window.__sil.length > 0, null, { timeout: 600000, polling: 'raf' });
  const ev = (await page.evaluate(() => window.__sil))[0];
  console.log(`  props:silvia  ${JSON.stringify(ev)}`);
  ok(ev?.open === true, 'the event the room fires is { open: true }');

  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 300000 });
  await page.waitForTimeout(1500);
  const post = posts.slice(n0).find((p) => p.beat === 'silvia');
  console.log(`  the request   beat=${post?.beat ?? '(none)'}`);
  ok(!!post, "the POST to /api/pepe carried beat='silvia'");
  const after = await page.evaluate(() => {
    const h = window.__theatre.pieces.mind.history ?? [];
    const last = [...h].reverse().find((x) => x.role === 'pepe');
    return {
      asking: window.__theatre.pieces.dialogue.asking,
      turn: (last?.text ?? '').replace(/\s+/g, ' ').trim(),
      placard: (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
    };
  });
  console.log(`  his whole turn:          "${after.turn}"`);
  console.log(`  what stands on the placard: "${after.placard}"`);
  console.log(`  the field is open under it: ${after.asking}`);
  ok(/silvia/i.test(after.turn), 'he answered about Pepe Silvia');
  ok(after.placard.length > 0, 'his last sentence is standing on the placard');
  ok(after.asking === true, "the visitor's field is open again underneath it");
  await page.screenshot({ path: `${OUT}/silvia-8-said.png`, timeout: 180000 });
  console.log('  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors on the fake server');
  await page.close();
}

await browser.close();
console.log(`\nframes in ${OUT}`);
console.log(fails.length ? `\n${fails.length} check(s) FAILED:\n  ${fails.join('\n  ')}` : '\nevery check holds');
process.exit(fails.length ? 1 : 0);
