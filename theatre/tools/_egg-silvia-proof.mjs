#!/usr/bin/env node
// PEPE SILVIA, DRIVEN LIKE A VISITOR (the egg in src/pieces/egg-silvia.js).
//
// The right frame on the back wall — the framed circuit diagram beside the clock — is a cabinet
// door. Click it and it swings open on the 12 fps clock; behind it eighteen drawn sheets go up
// across the plaster, one every three drawings, each with a tack; then thirty lengths of red string
// are run pin to pin until the wall is a web. A second click, on the frame or on any card, takes the
// whole thing down and puts the room back.
//
// Nothing here asks the piece whether it thinks it worked. It puts a real pointer on the leaf's own
// projected box, clicks it, and asks six independent witnesses:
//
//   the DRAWING   frames at the home plate: at rest, mid-swing, the board half up, the string half
//                 run, the board complete, the take-down halfway, and the room as it was — plus 3x
//                 crops of the big card's lettering, a small card's, and the middle of the web
//   the STATE     props.silvia.phase / .open / .progress, and the sheets' own visibility
//   the EVENT     what came out of ctx.emit('props:silvia', …) on the page's own bus
//   the SOUND     sound.timeline, which is what the audio graph was actually given, plus a stub
//                 over play() so a cue that never reached the graph is still caught
//   the PIXELS    the room after the take-down, against the room before the click; and the count of
//                 string-red inside the clock's dial and inside his face, which must be nought
//   the WIRE      a second server with PEPE_FAKE: the `silvia` beat on the POST, his line up on the
//                 placard, and the visitor's field open again underneath it
//
// THE STILLS OF THE MIDDLE OF THE MOVE ARE HELD, NOT RACED, and that is not a convenience. This
// machine renders the room in software: one drawn frame can take a fifth of a second, so the 12 fps
// clock walks through three or four drawings between two of them and a tool waiting for "nine
// sheets up" is shown eighteen. `?silvia=<n>` / props.silvia.hold(n) poses the run at its nth
// drawing with the clock's hand off it, which is the same hatch every other egg in this room has.
// The EVENTS, the CUES and the timing are taken off a real pointer and a real run, which is the
// other half and the half that cannot be faked.
//
//   BASE=http://127.0.0.1:8732 FAKE=http://127.0.0.1:8733 node tools/_egg-silvia-proof.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { situation } from '../server/pepe.mjs';

const BASE = (process.env.BASE ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const FAKE = (process.env.FAKE ?? BASE).replace(/\/$/, '');
const OUT = process.env.OUT ?? '/tmp/egg-silvia';
mkdirSync(OUT, { recursive: true });

const PLATE = [1280, 800]; // the home plate the user looks at
const PHONE = [390, 844];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
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
    if (document.getElementById('_kick')) return;
    const st = document.createElement('style');
    st.textContent = '@keyframes _kick{from{opacity:0.999}to{opacity:1}} #_kick{position:fixed;left:0;top:0;width:1px;height:1px;animation:_kick 1s linear infinite;pointer-events:none}';
    document.head.appendChild(st);
    const d = document.createElement('div');
    d.id = '_kick';
    document.body.appendChild(d);
  });
}
async function open(base, w, h, query = '') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${base}/${query}`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 240000 });
  await kick(page);
  page.__errors = errors;
  return page;
}
async function frames(page, n = 6) {
  const to = await page.evaluate((k) => window.__theatre.clock.frame + k, n);
  await page.waitForFunction((f) => window.__theatre.clock.frame >= f, to, { timeout: 180000, polling: 'raf' });
}
async function crop(buf, box, out, { pad = 8, scale = 3 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.max(4, Math.min(meta.width - left, Math.round(box.w + pad * 2)));
  const height = Math.max(4, Math.min(meta.height - top, Math.round(box.h + pad * 2)));
  await sharp(buf).extract({ left, top, width, height }).resize({ width: width * scale, height: height * scale, kernel: 'nearest' }).png().toFile(out);
  return { left, top, width, height };
}
const raw = (buf) => sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// WHAT COUNTS AS THE STRING'S RED, and it is narrow on purpose: HIS MOUTH IS RED TOO. Sampled off
// the frames themselves — his lip is (208,120,104) and a length of string is (200,32,40), so the
// test is on the GREEN: the string has almost none and the mouth has plenty. A window that only
// asked "is it reddish" counted his lip 149 times and called it a string across his face.
function isRed(r, g, b) {
  return r > 110 && g < 95 && b < 105 && r - g > 95 && r - b > 85;
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
  const { width, height, channels } = A.info;
  let n = 0, total = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (inside && !inside(x, y)) continue;
      total++;
      const i = (y * width + x) * channels;
      if (Math.abs(A.data[i] - B.data[i]) > tol || Math.abs(A.data[i + 1] - B.data[i + 1]) > tol || Math.abs(A.data[i + 2] - B.data[i + 2]) > tol) n++;
    }
  return { n, total, pct: total ? (n / total) * 100 : 0 };
}

const fails = [];
const ok = (cond, line) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};

// =================================================================================================
// 1. the frame on the glass, in every window the film is judged at
// =================================================================================================
console.log('\nTHE FRAME ON THE GLASS  ("in frame" means the whole box is inside the picture)');
{
  const page = await open(BASE, ...PLATE, '?view=props&state=default&shot=1');
  for (const [W, H] of [PLATE, [1600, 900], PHONE, [390, 760], [360, 800]]) {
    await page.setViewportSize({ width: W, height: H });
    await frames(page, 2); // a new window shape is a new set of frames; let the camera re-solve
    const m = await page.evaluate(() => {
      const t = window.__theatre;
      t.pieces.camera.cut('home');
      t.camera.updateMatrixWorld(true);
      const THREE = t.THREE;
      const s = t.pieces.props.silvia;
      const clock = t.scene.getObjectByName('props')?.userData?.wallClock ?? null;
      const W = window.innerWidth, H = window.innerHeight;
      const proj = (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(t.camera);
        return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
      };
      let dial = null;
      if (clock) {
        const b = new THREE.Box3().setFromObject(clock);
        const a = proj(b.min.x, b.max.y, b.max.z), c = proj(b.max.x, b.min.y, b.max.z);
        dial = { x: a[0], y: a[1], w: c[0] - a[0], h: c[1] - a[1] };
      }
      return { box: s.hitBox(), tap: s.tapBox(), dial };
    });
    const b = m.box, t = m.tap;
    const inFrame = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
    const side = m.dial ? (b.x > m.dial.x + m.dial.w ? `${(b.x - (m.dial.x + m.dial.w)).toFixed(0)} px right of the clock` : 'NOT right of the clock') : '—';
    console.log(
      `  ${String(W + 'x' + H).padEnd(9)} frame ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
        `   tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ' (the frame itself)'}   ${inFrame ? 'IN FRAME' : 'NOT WHOLLY IN FRAME'}   ${side}`,
    );
    if (W === PHONE[0] && H === PHONE[1]) {
      ok(inFrame, 'the whole frame is inside a 390x844 phone picture');
      ok(Math.max(t.w, t.h) >= 44, 'a thumb has at least 44 px to hit on a phone');
    }
  }
  await page.close();
}

// =================================================================================================
// 2. a real pointer on the frame: the swing, the board, the string, and the room put back
// =================================================================================================
console.log('\nA POINTER ON THE FRAME  (1280x800, home; the sound piece is live — no ?shot=1)');
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

  // WHERE HIS FACE AND THE CLOCK'S DIAL ARE ON THE GLASS, and where the sheets are on the wall:
  // taken off the scene itself, so nothing here is a number copied out of the piece.
  geom = await page.evaluate(() => {
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
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    };
    const clock = t.scene.getObjectByName('props')?.userData?.wallClock ?? null;
    const s = t.pieces.props.silvia;
    const cx = s.sheets.reduce((a, q) => a + q.x, 0) / s.sheets.length;
    const cy = s.sheets.reduce((a, q) => a + q.y, 0) / s.sheets.length;
    const [wx, wy] = proj(cx, cy, -2.4895);
    return {
      head: boxOf(t.pieces.pepe.headPivot),
      clock: clock ? boxOf(clock) : null,
      web: { x: wx - 100, y: wy - 70, w: 200, h: 140 },
      sheets: s.sheets,
      schedule: s.schedule,
    };
  });
  console.log(`  his face on the glass   ${geom.head.w.toFixed(0)} x ${geom.head.h.toFixed(0)} px at ${geom.head.x.toFixed(0)},${geom.head.y.toFixed(0)}`);
  console.log(`  the clock's dial        ${geom.clock.w.toFixed(0)} x ${geom.clock.h.toFixed(0)} px at ${geom.clock.x.toFixed(0)},${geom.clock.y.toFixed(0)}`);
  console.log(`  the schedule, in drawings: ${JSON.stringify(geom.schedule)}`);

  const box0 = await page.evaluate(() => window.__theatre.pieces.props.silvia.hitBox());
  const cx = box0.x + box0.w / 2, cy = box0.y + box0.h / 2;
  console.log(`  the frame's own box     x ${box0.x.toFixed(0)} y ${box0.y.toFixed(0)}  ${box0.w.toFixed(0)} x ${box0.h.toFixed(0)} px  →  clicking ${cx.toFixed(0)},${cy.toFixed(0)}`);

  const before = await read();
  console.log('  before                  ', JSON.stringify({ phase: before.phase, up: before.up, string: before.string, cursor: before.cursor }));
  ok(before.phase === 'shut' && before.up === 0 && !before.string, 'a reload finds a picture on a wall: nothing pinned, no string');
  ok(before.cursor === '(none)', 'nothing announces it: no cursor before a pointer goes near it');

  restBuf = await page.screenshot({ timeout: 120000 });
  await sharp(restBuf).png().toFile(`${OUT}/silvia-1-rest.png`);
  await crop(restBuf, box0, `${OUT}/silvia-1-rest-3x.png`, { scale: 3 });
  const redRest = await redPixels(restBuf);
  console.log(`  string-red in the room before it is touched: ${redRest} px`);
  ok(redRest === 0, 'there is no string red anywhere in the room before it is touched');

  await page.mouse.move(40, PLATE[1] - 40);
  await frames(page, 4);
  ok((await read()).cursor === '(none)', "the cursor is the page's own away from the frame");
  await page.mouse.move(cx, cy);
  await frames(page, 4);
  ok((await read()).cursor === 'pointer', 'hover over the frame makes the cursor a pointer, and that is the whole affordance');

  // ---- the click, and the whole run, in real time -------------------------------------------------
  const t0 = Date.now();
  await page.mouse.click(cx, cy);
  await page.waitForFunction(() => window.__theatre.pieces.props.silvia.phase === 'opening', null, { timeout: 60000, polling: 'raf' });
  const hit = await read();
  console.log('  the moment it is clicked', JSON.stringify({ phase: hit.phase, cues: hit.cues }));
  ok(hit.cues.includes('latch'), "the catch ('latch') was asked for on the pointer");
  ok(hit.timeline.includes('latch'), "the 'latch' cue reached the audio graph (sound.timeline)");
  ok(hit.progress.cards === 0, 'nothing is pinned yet: the door goes first');

  await page.waitForFunction(() => window.__theatre.pieces.props.silvia.open, null, { timeout: 300000, polling: 'raf' });
  await frames(page, 2);
  const up = await read();
  const upBuf = await page.screenshot({ timeout: 120000 });
  await sharp(upBuf).png().toFile(`${OUT}/silvia-5-board.png`);
  console.log('  the board complete      ', JSON.stringify({ phase: up.phase, up: up.up, segments: up.progress.segments, degrees: up.progress.degrees, events: up.events }));
  ok(up.up === 18, 'all eighteen sheets are pinned');
  ok(up.progress.segments === 30, 'all thirty lengths of string are run');
  ok(up.cues.filter((c) => c === 'tap').length === 18, 'eighteen tacks went in, one a sheet, and every one of them reached the room');
  ok(up.events.length === 1 && up.events[0].open === true, "ctx.emit('props:silvia', { open: true }) fired once, when the last length was tied");
  const redUp = await redPixels(upBuf);
  console.log(`  string-red on the glass  ${redUp} px`);
  ok(redUp > 400, 'the string is really there and really red');

  // the three crops the eye is meant to judge: the big card, a small one, the middle of the web
  const cardBox = await page.evaluate(() => window.__theatre.pieces.props.silvia.sheetBox('silvia'));
  await crop(upBuf, cardBox, `${OUT}/silvia-5-card-pepe-silvia-3x.png`, { scale: 3 });
  const smallBox = await page.evaluate(() => window.__theatre.pieces.props.silvia.sheetBox('carol'));
  await crop(upBuf, smallBox, `${OUT}/silvia-5-card-carol-3x.png`, { scale: 3 });
  await crop(upBuf, geom.web, `${OUT}/silvia-5-web-3x.png`, { scale: 3, pad: 0 });

  // ---- 3. what is never covered -------------------------------------------------------------------
  console.log('\nWHAT IS NEVER COVERED  (his face, and the clock)');
  const head = geom.head, dial = geom.clock;
  const inHead = (x, y) => x >= head.x && x <= head.x + head.w && y >= head.y && y <= head.y + head.h;
  // the dial is a DISC and the box round it is not: the corners of that box are plaster a length of
  // string is entitled to cross, so the test is the circle the clock actually is
  const dc = { x: dial.x + dial.w / 2, y: dial.y + dial.h / 2, r: Math.min(dial.w, dial.h) / 2 };
  const inDial = (x, y) => (x - dc.x) ** 2 + (y - dc.y) ** 2 <= dc.r ** 2;
  const redHead = await redPixels(upBuf, inHead);
  const redDial = await redPixels(upBuf, inDial);
  console.log(`  his face   ${head.w.toFixed(0)} x ${head.h.toFixed(0)} px at ${head.x.toFixed(0)},${head.y.toFixed(0)}   string-red inside it: ${redHead}`);
  console.log(`  the dial   r ${dc.r.toFixed(0)} px at ${dc.x.toFixed(0)},${dc.y.toFixed(0)}                 string-red inside it: ${redDial}`);
  ok(redHead === 0, 'not one pixel of string is on his face');
  ok(redDial === 0, 'not one pixel of string is on the clock');
  const control = (x, y) => x > 860 && x < 1000 && y > 100 && y < 500;
  // AND NOT A MARK OF THE BOARD IS IN FRONT OF EITHER OF THEM, which is the claim the red count
  // cannot make on its own (a card is black on white and would not show as red at all). Four hundred
  // rays are fired through his face and four hundred through the dial, and for each one two
  // distances are read: how far to the first thing of the BOARD's, and how far to the thing being
  // protected. A ray whose board hit is NEARER is a ray on which the board is covering it.
  //
  // The two traps this walked into first, both of them the tool's and not the drawing's:
  //   · a bounding BOX round his head is mostly not his head — the corners are bare plaster, and a
  //     ray through one of them strikes the wall behind him, which is where the board is. Fourteen
  //     of four hundred. So the test is a comparison of depths and not of names;
  //   · the clock's bounding box includes its PENDULUM, which hangs half a dial below the dial, so a
  //     "disc" taken from that box is centred 17 px too low and half of it is bare wall. The dial is
  //     therefore taken in METRES off the clock itself — a circle of r 0.185 about (0, 2.06) — and
  //     projected.
  const cover = await page.evaluate(
    ([head]) => {
      const t = window.__theatre;
      t.camera.updateMatrixWorld(true);
      const THREE = t.THREE;
      const ray = new THREE.Raycaster();
      const W = window.innerWidth, H = window.innerHeight;
      const clock = t.scene.getObjectByName('props')?.userData?.wallClock ?? null;
      const proj = (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(t.camera);
        return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
      };
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
      const sweep = (pick, isTarget) => {
        const out = { n: 0, onTarget: 0, covered: 0, worst: null };
        for (let i = 0; i < 20; i++)
          for (let j = 0; j < 20; j++) {
            const p = pick(i / 19, j / 19);
            if (!p) continue;
            out.n++;
            ray.setFromCamera(new THREE.Vector2((p[0] / W) * 2 - 1, -(p[1] / H) * 2 + 1), t.camera);
            const hits = ray.intersectObjects(t.scene.children, true).filter((q) => shown(q.object));
            const board = hits.find((q) => /^silvia-/.test(nameOf(q.object)));
            const target = hits.find((q) => isTarget(q.object));
            if (!target) continue; // the ray missed the thing itself: nothing to cover
            out.onTarget++;
            if (board && board.distance < target.distance) {
              out.covered++;
              out.worst = nameOf(board.object);
            }
          }
        return out;
      };
      const pepeRoot = t.pieces.pepe.group ?? t.pieces.pepe.root ?? t.pieces.pepe.headPivot;
      const face = sweep(
        (u, v) => [head.x + head.w * u, head.y + head.h * v],
        (o) => under(o, t.pieces.pepe.headPivot) || under(o, pepeRoot),
      );
      // the dial in metres, projected: r 0.185 about (0, 2.06) on the clock's own face
      const c0 = proj(0, 2.06, -2.444), c1 = proj(0.185, 2.06, -2.444);
      const R = Math.abs(c1[0] - c0[0]);
      const dial = clock
        ? sweep(
            (u, v) => {
              const a = u * Math.PI * 2, r = Math.sqrt(v) * R * 0.96;
              return [c0[0] + Math.cos(a) * r, c0[1] + Math.sin(a) * r];
            },
            (o) => under(o, clock),
          )
        : { n: 0, onTarget: 0, covered: 0 };
      return { face, dial, dialPx: { x: c0[0], y: c0[1], r: R } };
    },
    [head],
  );
  console.log(`  ${cover.face.onTarget} of ${cover.face.n} rays through his face-box actually strike him; of those, ${cover.face.covered} have a sheet or a string in front${cover.face.worst ? ' (' + cover.face.worst + ')' : ''}`);
  console.log(`  ${cover.dial.onTarget} of ${cover.dial.n} rays through the dial (r ${cover.dialPx.r.toFixed(0)} px at ${cover.dialPx.x.toFixed(0)},${cover.dialPx.y.toFixed(0)}) strike the clock; of those, ${cover.dial.covered} have a sheet or a string in front`);
  ok(cover.face.covered === 0, 'nothing of the board is in front of his face, on any of four hundred rays');
  ok(cover.dial.covered === 0, 'nothing of the board is in front of the clock, on any of four hundred rays');
  const dDial = await diffPixels(restBuf, upBuf, 18, inDial);
  const dCtl = await diffPixels(restBuf, upBuf, 18, control);
  console.log(`  the dial's own pixels differ by ${dDial.pct.toFixed(2)}% with the board up; the door, untouched, by ${dCtl.pct.toFixed(2)}% — the boil`);
  ok(dDial.pct < dCtl.pct * 2 + 2, 'the clock is the same drawing with the board up as without it');
  // …and the same claim in metres, off the sheets' own rectangles
  const clash = geom.sheets.filter((s) => {
    const nx = Math.max(Math.abs(s.x) - s.w / 2, 0), ny = Math.max(Math.abs(s.y - 2.06) - s.h / 2, 0);
    return Math.hypot(nx, ny) < 0.185;
  });
  console.log(`  sheets whose rectangle reaches the dial (r 0.185 at x 0, y 2.06): ${clash.length ? clash.map((s) => s.id).join(', ') : 'none'}`);
  ok(clash.length === 0, 'no sheet is pinned within reach of the dial, in metres, whatever the camera does');
  const zs = await page.evaluate(() => {
    const t = window.__theatre;
    const b = t.scene.getObjectByName('silvia-board');
    const zz = b.children.map((o) => +o.position.z.toFixed(4));
    return { board: { min: Math.min(...zz), max: Math.max(...zz) }, head: +t.pieces.pepe.headPivot.getWorldPosition(new t.THREE.Vector3()).z.toFixed(3) };
  });
  console.log(`  the board hangs at z ${zs.board.min} .. ${zs.board.max}; his head is at z ${zs.head}`);
  ok(zs.board.max < zs.head - 1, 'the whole board is more than a metre upstage of his head: it is behind him, always');

  // ---- 4. the second click, on a CARD -------------------------------------------------------------
  console.log('\nTHE SECOND CLICK  (on a pinned CARD this time, which the piece has to answer as well)');
  const cardHit = await page.evaluate(() => window.__theatre.pieces.props.silvia.sheetBox('nosuch'));
  await page.mouse.click(cardHit.x + cardHit.w / 2, cardHit.y + cardHit.h / 2);
  await page.waitForFunction(() => window.__theatre.pieces.props.silvia.phase === 'closing', null, { timeout: 60000, polling: 'raf' });
  ok(true, 'a click on a pinned card takes the board down, not only a click on the frame');

  await page.waitForFunction(() => window.__theatre.pieces.props.silvia.phase === 'shut', null, { timeout: 300000, polling: 'raf' });
  await frames(page, 4);
  const back = await read();
  backBuf = await page.screenshot({ timeout: 120000 });
  await sharp(backBuf).png().toFile(`${OUT}/silvia-7-back.png`);
  console.log(`  the whole of it, click to click to shut: ${((Date.now() - t0) / 1000).toFixed(1)} s of wall clock on a software renderer`);
  console.log('\nTHE ROOM AS IT WAS  (pixel-compared against the frame before the click)');
  console.log('  after                   ', JSON.stringify({ phase: back.phase, up: back.up, string: back.string, degrees: back.progress.degrees, events: back.events }));
  ok(back.up === 0 && !back.string && back.progress.degrees === 0, 'nothing pinned, no string, the leaf back on the wall');
  ok(back.events.length === 2 && back.events[1].open === false, "ctx.emit('props:silvia', { open: false }) fired when it was down");
  ok((await redPixels(backBuf)) === 0, 'there is no string red left anywhere in the room');
  ok(back.cues.filter((c) => c === 'rustle').length >= 4, 'the sheets came off with paper cues, not with tacks');
  const wall = (x, y) => x > 480 && x < 820 && y > 80 && y < 320;
  const dw = await diffPixels(restBuf, backBuf, 18, wall);
  const dc2 = await diffPixels(restBuf, backBuf, 18, control);
  console.log(`  the wall the board was on differs by ${dw.pct.toFixed(2)}% of its pixels (${dw.n}/${dw.total})`);
  console.log(`  the door, which was never touched,   ${dc2.pct.toFixed(2)}% (${dc2.n}/${dc2.total})  — this is the boil`);
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
    const p = await page.evaluate(([n, c]) => window.__theatre.pieces.props.silvia.hold(n, c), [f, closing]);
    await frames(page, 2);
    const r = await read();
    const buf = await page.screenshot({ timeout: 120000 });
    await sharp(buf).png().toFile(`${OUT}/silvia-${tag}.png`);
    const red = await redPixels(buf);
    console.log(`  drawing ${String(closing ? 'down' + f : f).padEnd(6)} ${what.padEnd(38)} leaf ${String(r.progress.degrees).padStart(4)}°  sheets ${String(r.up).padStart(2)}  string ${String(r.progress.segments).padStart(2)}  red ${red}`);
    if (tag === '2-swing') {
      await crop(buf, { x: geom.head.x - 120, y: 90, w: 300, h: 200 }, `${OUT}/silvia-2-swing-3x.png`, { scale: 3, pad: 0 });
      ok(r.progress.degrees > 10 && r.progress.degrees < 90 && r.up === 0, 'mid-swing: the leaf is off the wall and nothing is pinned');
    }
    if (tag === '3-half') ok(r.up >= 8 && r.up <= 11 && r.progress.segments === 0 && red === 0, 'half up: nine or so sheets, and not a length of string yet');
    if (tag === '4-string') ok(r.up === 18 && r.progress.segments > 8 && r.progress.segments < 30 && red > 100, 'the string half run: every card up, some of the web');
    if (tag === '6-taking-down') ok(r.up > 3 && r.up < 16 && r.progress.segments === 0 && red === 0, 'the take-down: the string went first, the sheets are coming off');
  }
  await page.evaluate(() => window.__theatre.pieces.props.silvia.set(false));

  console.log('\n  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors');
  await page.close();
}

// =================================================================================================
// 6. the phone
// =================================================================================================
console.log('\nTHE PHONE  (390x844, home; at rest and with the board up)');
{
  const page = await open(BASE, ...PHONE, '?view=props&state=default&shot=1');
  for (const [state, tag] of [['default', 'rest'], ['silvia-open', 'board']]) {
    await page.evaluate((s) => {
      window.__theatre.pieces.props.setState(s);
      window.__theatre.pieces.camera.cut('home');
    }, state);
    await frames(page, 6);
    const buf = await page.screenshot({ timeout: 120000 });
    await sharp(buf).png().toFile(`${OUT}/silvia-phone-${tag}.png`);
    const m = await page.evaluate(() => {
      const t = window.__theatre;
      const s = t.pieces.props.silvia;
      const W = window.innerWidth, H = window.innerHeight;
      const seen = [], whole = [], gone = [];
      for (const q of s.sheets) {
        const b = s.sheetBox(q.id);
        if (!b) continue;
        if (b.x + b.w <= 0 || b.x >= W || b.y + b.h <= 0 || b.y >= H) gone.push(q.id);
        else if (b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H) {
          seen.push(q.id);
          whole.push(q.id);
        } else seen.push(q.id);
      }
      return { box: s.hitBox(), seen, whole, gone, n: s.sheets.length };
    });
    const b = m.box;
    const inFrame = b.x >= 0 && b.y >= 0 && b.x + b.w <= PHONE[0] && b.y + b.h <= PHONE[1];
    console.log(`  ${tag.padEnd(5)} the frame ${b.w.toFixed(0)} x ${b.h.toFixed(0)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}  ${inFrame ? 'IN FRAME' : 'NOT WHOLLY IN FRAME'}`);
    if (tag === 'board') {
      console.log(`  the board on a phone: ${m.seen.length} of ${m.n} sheets in the picture, ${m.whole.length} of them whole`);
      console.log(`  cut off at the edge:  ${m.seen.filter((i) => !m.whole.includes(i)).join(', ') || 'none'}`);
      console.log(`  out of the picture:   ${m.gone.join(', ') || 'none'}`);
      ok(m.seen.length >= 12, 'twelve sheets or more of the board are inside a phone picture');
      ok(m.seen.includes('silvia'), 'the PEPE SILVIA card — the one the frame was hiding — is one of them');
      const red = await redPixels(buf);
      console.log(`  string-red on a phone: ${red} px`);
      ok(red > 150, 'the red string reads on a phone too');
    }
  }
  console.log('  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors on a phone');
  await page.close();
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
  // the door, and then wait for the field to open under his greeting
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 240000 });
  console.log(`  the field is open before the frame is touched: ${await page.evaluate(() => window.__theatre.pieces.dialogue.asking)}`);
  const n0 = posts.length;

  // work the frame exactly as a pointer does, and let the whole six seconds run
  await page.evaluate(() => window.__theatre.pieces.props.silvia.toggle());
  await page.waitForFunction(() => window.__sil.length > 0, null, { timeout: 300000, polling: 'raf' });
  const ev = (await page.evaluate(() => window.__sil))[0];
  console.log(`  props:silvia  ${JSON.stringify(ev)}`);
  ok(ev?.open === true, 'the event the room fires is { open: true }');

  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 180000 });
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
  await page.screenshot({ path: `${OUT}/silvia-8-said.png`, timeout: 120000 });
  console.log('  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors on the fake server');
  await page.close();
}

await browser.close();
console.log(`\nframes in ${OUT}`);
console.log(fails.length ? `\n${fails.length} check(s) FAILED:\n  ${fails.join('\n  ')}` : '\nevery check holds');
process.exit(fails.length ? 1 : 0);
