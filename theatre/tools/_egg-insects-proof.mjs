#!/usr/bin/env node
// THE INSECTS, DRIVEN LIKE A VISITOR (egg-insects.js).
//
// Six paper cut-outs on the plaster under the clock. Click one and it flies to the MIEL jar on the
// press. This tool does not ask the piece whether it thinks that worked. It puts a real pointer on
// a sheet's own projected box, clicks it, and then asks four independent witnesses:
//
//   the DRAWING   frames at the home plate, and 2x crops of them, and a strip of the flight
//   the WALL      the same frame with ?bugs=0, differenced pixel by pixel: the six sheets are the
//                 only thing that changed, and the wallpaper behind them is where it was
//   the EVENTS    what came out of ctx.emit('props:insect', …) on the page's own bus
//   the SOUND     sound.timeline, which is what the audio graph was actually given, plus a stub
//                 laid over play() so a cue that never reached the graph is still caught
//
// It also measures the framing on a 390x844 phone — where the insects are, and where the jar they
// fly to is, which is not the same answer.
//
//   BASE=http://127.0.0.1:8705 node tools/_egg-insects-proof.mjs
//   BASE=… node tools/_egg-insects-proof.mjs --out /abs/dir
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
// the progress page's own shelf, found from this file so it works in whichever worktree it is run in
const OUT = args.out ?? resolve(dirname(fileURLToPath(import.meta.url)), '../public/progress/shots');
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
  // ?view=props boots on the WIDE plate. The cut to home has to be given a frame before anything
  // is projected: `project()` reads the camera's matrixWorldInverse, main.js updates it in the
  // loop, and a box measured in the same tick as the cut is a box measured through the old lens.
  // (It was, for one round, and every sheet came out 15 px below where the frame has it.)
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(() => window.__theatre.camera.updateMatrixWorld(true));
  page.__errors = errors;
  return page;
}

// a 2x crop round a box on the glass, so the pen can be judged at something like 1:1
async function crop(buf, box, out, { pad = 24, scale = 2 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.min(meta.width - left, Math.round(box.w + pad * 2));
  const height = Math.min(meta.height - top, Math.round(box.h + pad * 2));
  await sharp(buf)
    .extract({ left, top, width, height })
    .resize({ width: width * scale, height: height * scale, kernel: 'nearest' })
    .png()
    .toFile(out);
  return { left, top, width, height };
}
const union = (boxes) => {
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
};

const fails = [];
const ok = (cond, line) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};

// ---- 1. the six on the glass, in every window the film is judged at --------------------------------
console.log('\nTHE SIX ON THE GLASS  (home plate; "in frame" means the whole sheet is inside the picture)');
for (const [W, H] of [PLATE, [1600, 900], PHONE, [390, 760], [360, 800]]) {
  const page = await open(W, H, '&shot=1');
  const m = await page.evaluate(() => {
    const ins = window.__theatre.pieces.props.insects;
    const box = [], tap = [];
    for (let i = 0; i < ins.count; i++) {
      box.push(ins.hitBox(i));
      tap.push(ins.tapBox(i));
    }
    ins.set('jar');
    const seat = [];
    for (let i = 0; i < ins.count; i++) seat.push(ins.hitBox(i));
    ins.set('wall');
    return { box, tap, seat, kinds: ins.kinds };
  });
  const inFrame = (b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
  const n = m.box.filter(inFrame).length, ns = m.seat.filter(inFrame).length;
  const b0 = m.box[0], t0 = m.tap[0];
  // the closest pair of tap boxes: if two of them overlap, one tap answers for two insects
  let worst = Infinity;
  for (let i = 0; i < m.tap.length; i++)
    for (let j = i + 1; j < m.tap.length; j++) {
      const a = m.tap[i], b = m.tap[j];
      const gx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)), gy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h));
      worst = Math.min(worst, Math.max(gx, gy));
    }
  console.log(
    `  ${String(W + 'x' + H).padEnd(9)} sheet ${b0.w.toFixed(1)} x ${b0.h.toFixed(1)} px   tap ${t0.w.toFixed(0)} x ${t0.h.toFixed(0)}${t0.grown ? ' (GROWN)' : ''}` +
      `   on the wall ${n}/6 in frame   at the jar ${ns}/6 in frame   closest tap boxes ${worst.toFixed(0)} px apart`,
  );
  if (W === PLATE[0] && H === PLATE[1]) {
    ok(n === 6, 'all six are wholly inside the home frame on the plate');
    ok(t0.w >= 44 && t0.h >= 44, 'the box a thumb is given is at least 44 px each way');
    ok(worst > 0, 'no two tap boxes overlap: one tap can only ever mean one insect');
  }
  if (W === PHONE[0] && H === PHONE[1]) {
    ok(n === 6, 'all six are wholly inside the frame on a 390x844 phone');
    ok(worst > 0, 'no two tap boxes overlap on a phone either, where they are grown most');
  }
  await page.close();
}

// ---- 2. the wall behind them is untouched ----------------------------------------------------------
// There were never any insects in the wall plate to lose (the marks under the clock are the
// wallpaper's own faded sprigs — see the head of egg-insects.js). What can be proved instead, and
// is the same claim, is that adding them changed the wall NOWHERE ELSE: the same frame with and
// without, differenced, has to be blank outside the six sheets.
// The pair has to be struck at the SAME MOMENT of the drawing, or the comparison is a comparison
// of the boil: the room is re-struck on every 12 fps step, so two independent loads differ in
// 83 000 pixels before anything is added to the wall. `&t=2.5` freezes the stepped clock at the
// same instant on both, `&now=10:10` pins the clock's hands, and what is left over is the insects.
console.log('\nTHE WALL, WITH THEM AND WITHOUT  (1280x800, home, ?t=2.5 frozen, ?bugs=0 is the control)');
{
  const [W, H] = PLATE;
  const FROZEN = '&shot=1&t=2.5&now=10:10';
  const withPage = await open(W, H, FROZEN);
  const boxes = await withPage.evaluate(() => {
    const ins = window.__theatre.pieces.props.insects;
    return { box: Array.from({ length: ins.count }, (_, i) => ins.hitBox(i)), spots: ins.spots, kinds: ins.kinds };
  });
  const withShot = await withPage.locator('#stage').screenshot();
  await sharp(withShot).png().toFile(`${OUT}/egg-insects-wall.png`);
  const band = union(boxes.box);
  await crop(withShot, band, `${OUT}/egg-insects-wall-2x.png`, { pad: 30 });
  await withPage.close();

  const noPage = await open(W, H, `${FROZEN}&bugs=0`);
  const noShot = await noPage.locator('#stage').screenshot();
  await sharp(noShot).png().toFile(`${OUT}/egg-insects-wall-none.png`);
  await crop(noShot, band, `${OUT}/egg-insects-wall-none-2x.png`, { pad: 30 });
  ok(noPage.__errors.length === 0, '?bugs=0 renders the room with no insects and no page errors');
  await noPage.close();

  const A = await sharp(withShot).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(noShot).raw().toBuffer({ resolveWithObject: true });
  const { width: PW, height: PH, channels: ch } = A.info;
  // the band of wall the six live on, taken off their own boxes: this is the claim that matters
  const wallBand = union(boxes.box);
  const pad = 44;
  const changed = Buffer.alloc(PW * PH);
  let inside = 0, onWall = 0, elsewhere = 0;
  const per = boxes.box.map(() => 0);
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      const o = (y * PW + x) * ch;
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[o + c] - B.data[o + c]));
      if (d <= 8) continue;
      changed[y * PW + x] = 1;
      let hit = -1;
      for (let i = 0; i < boxes.box.length; i++) {
        const b = boxes.box[i];
        if (x >= b.x - 1 && x <= b.x + b.w + 1 && y >= b.y - 1 && y <= b.y + b.h + 1) {
          hit = i;
          break;
        }
      }
      if (hit >= 0) {
        inside++;
        per[hit]++;
      } else if (x >= wallBand.x - pad && x <= wallBand.x + wallBand.w + pad && y >= wallBand.y - pad && y <= wallBand.y + wallBand.h + pad) onWall++;
      else elsewhere++;
    }
  // a mark gained or lost is a BLOCK of changed pixels; a threshold flipping on the edge of an
  // existing line is a scatter of single ones. Counting 2x2 blocks tells the two apart.
  let blocks = 0;
  for (let y = 0; y < PH - 1; y++)
    for (let x = 0; x < PW - 1; x++) {
      const i = y * PW + x;
      if (!changed[i] || !changed[i + 1] || !changed[i + PW] || !changed[i + PW + 1]) continue;
      const b = boxes.box.find((b) => x >= b.x - 1 && x <= b.x + b.w + 1 && y >= b.y - 1 && y <= b.y + b.h + 1);
      if (!b) blocks++;
    }
  console.log(`  pixels changed inside the six sheets   ${inside}   (${per.map((p, i) => `${boxes.kinds[i]}:${p}`).join('  ')})`);
  console.log(`  …on the rest of that band of wall      ${onWall}`);
  console.log(`  …anywhere else in the room             ${elsewhere}   in ${blocks} solid 2x2 blocks`);
  ok(onWall === 0, 'the wall the six are hung on is pixel-identical outside their own sheets: nothing was taken off it');
  ok(
    per.every((p) => p > 40),
    'every one of the six actually drew something where the spots say it is',
  );
  // The control has to BUILD the insects and hide them, not skip them — see the head of
  // egg-insects.js. Skipped, the twenty-four sheets are never made, every object after them is
  // renumbered, and the ink pass (which seeds a boundary off object.id) re-strikes the tablecloth's
  // folds in 1345 pixels at the other end of the room. Hidden, the two frames are the same frame.
  ok(elsewhere === 0 && blocks === 0, 'and the rest of the room is the same frame to the pixel');
  // and the sheets land where the drawing says: the projected centre against the wall coordinate
  console.log('  where each one sits (wall metres → glass px):');
  boxes.box.forEach((b, i) =>
    console.log(`    ${i} ${boxes.kinds[i].padEnd(7)} wall ${JSON.stringify(boxes.spots[i])}  →  ${(b.x + b.w / 2).toFixed(0)}, ${(b.y + b.h / 2).toFixed(0)}  (${b.w.toFixed(1)} px)`),
  );
}

// ---- 3. a real pointer on an insect ----------------------------------------------------------------
console.log('\nA POINTER ON AN INSECT  (1280x800, home; the sound piece is live — no ?shot=1)');
{
  const [W, H] = PLATE;
  const page = await open(W, H);
  await page.evaluate(() => {
    window.__ins = [];
    window.__theatre.on('props:insect', (d) => window.__ins.push(d));
    const s = window.__theatre.pieces.sound;
    window.__cues = [];
    const real = s.play.bind(s);
    s.play = (name, opts) => {
      window.__cues.push(name);
      return real(name, opts);
    };
  });
  await page.waitForTimeout(700);
  const read = () =>
    page.evaluate(() => {
      const t = window.__theatre;
      const ins = t.pieces.props.insects;
      return {
        state: ins.state,
        cursor: t.renderer.domElement.style.cursor || '(none)',
        cues: window.__cues.slice(),
        timeline: (t.pieces.sound.timeline ?? []).map((x) => x.name),
        events: window.__ins.slice(),
        played: t.pieces.sound.stats.played,
      };
    });

  const before = await read();
  console.log('  before                  ', JSON.stringify({ state: before.state, cursor: before.cursor }));
  ok(before.state.every((s) => s === 'wall'), 'a fresh page has all six on the wall');
  ok(before.cursor === '(none)', 'nothing announces them: no cursor until a pointer is over one');

  const boxOf = (i) => page.evaluate((k) => window.__theatre.pieces.props.insects.hitBox(k), i);
  const b2 = await boxOf(2);
  const cx = b2.x + b2.w / 2, cy = b2.y + b2.h / 2;
  await page.mouse.move(40, H - 40);
  await page.waitForTimeout(280);
  ok((await read()).cursor === '(none)', "the cursor is the page's own away from them");
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(400);
  const hover = await read();
  console.log(`  hovering over insect 2   box ${b2.x.toFixed(0)},${b2.y.toFixed(0)} ${b2.w.toFixed(0)}x${b2.h.toFixed(0)}  cursor ${hover.cursor}`);
  ok(hover.cursor === 'pointer', 'a pointer over an insect turns the cursor, and that is the whole affordance');

  // ---- the click, and the flight ------------------------------------------------------------------
  // THE STRIP IS TAKEN A DRAWING AT A TIME, and it has to be: this headless browser renders at
  // about 0.7 frames a second, so a flight that takes a second on a laptop takes seventeen here and
  // a screenshot loop catches two of its twelve drawings. So props.update is put behind a gate and
  // released once per frame wanted. It is the piece's own update, called by main's own loop, on the
  // piece's own stepped clock — nothing about the flight is simulated, it is only let through one
  // drawing at a time.
  await page.evaluate(() => {
    const p = window.__theatre.pieces.props;
    const real = p.update.bind(p);
    window.__go = 0;
    p.update = (c) => {
      if (window.__go > 0 && c.clock.stepped) {
        window.__go--;
        real(c);
      }
    };
  });
  const step1 = async () => {
    await page.evaluate(() => {
      window.__go = 1;
    });
    await page.waitForFunction(() => window.__go === 0, null, { timeout: 30000 });
  };
  const sample = () =>
    page.evaluate(() => {
      const ins = window.__theatre.pieces.props.insects;
      const o = window.__theatre.scene.getObjectByName('insect-2');
      return { at: ins.at(2), k: ins.progress(2), box: ins.hitBox(2), pos: o.position.toArray().map((v) => +v.toFixed(3)), tilt: +o.rotation.z.toFixed(2) };
    });

  const t0 = Date.now();
  await page.mouse.click(cx, cy);
  const flying = await read();
  ok(flying.state[2] === 'air', 'one click sends it off the wall');
  ok(flying.events.length === 1 && flying.events[0].i === 2 && flying.events[0].at === 'air', "ctx.emit('props:insect', { i: 2, at: 'air' }) fired on the click");
  ok(flying.cues.includes('buzz'), "the 'buzz' cue was asked for as it left");

  const strip = [];
  const track = [];
  for (let n = 0; n < 40; n++) {
    await step1();
    const p = await sample();
    track.push(p);
    if (p.at !== 'air') break;
    if (strip.length < 6) strip.push({ shot: await page.locator('#stage').screenshot(), ...p });
  }
  const landed = await read();
  const ms = Date.now() - t0;
  console.log(`  the flight               ${strip.length} frames caught, drawings ${strip.map((s) => s.k?.k).join(',')} of ${track[0]?.k?.n ?? '?'}, ${ms} ms door to door`);
  console.log(`  it moved                 ${strip.map((s) => `${(s.box.x + s.box.w / 2).toFixed(0)},${(s.box.y + s.box.h / 2).toFixed(0)}`).join('  ')}`);
  const air = track.filter((t) => t.at === 'air');
  console.log(`  in the room (world z)    ${air.map((t) => t.pos[2].toFixed(2)).join(' ')}   (the wall is -2.49, the jar -2.27)`);
  console.log(`  and it leans             ${air.map((t) => t.tilt.toFixed(2)).join(' ')} rad`);
  ok(strip.length === 6, 'the flight is a row of separate drawings, not one move');
  ok(track[0].k.n >= 8 && track[0].k.n <= 14, `the flight is 8 to 14 drawings long (this one is ${track[0].k.n})`);
  ok(
    new Set(strip.map((s) => `${s.box.x.toFixed(0)},${s.box.y.toFixed(0)}`)).size === strip.length,
    'no two drawings of the flight are in the same place',
  );
  ok(Math.max(...air.map((t) => t.pos[2])) > -2.2, 'it comes out INTO the room on the way, and does not slide along the plaster');
  ok(Math.max(...air.map((t) => Math.abs(t.tilt))) < 0.6, 'and it leans into its turns without ever turning over');
  if (strip.length) {
    // the band follows the flight itself, at 2x, so the drawing can be judged rather than found
    const seatBox = await boxOf(2);
    const xs = strip.map((s) => s.box.x).concat([b2.x, seatBox.x]);
    const ys = strip.map((s) => s.box.y).concat([b2.y, seatBox.y]);
    const band = {
      x: Math.max(0, Math.round(Math.min(...xs) - 34)),
      y: Math.max(0, Math.round(Math.min(...ys) - 34)),
      w: 0,
      h: 0,
    };
    band.w = Math.min(W - band.x, Math.round(Math.max(...xs) + 34 + 24 - band.x));
    band.h = Math.min(H - band.y, Math.round(Math.max(...ys) + 34 + 24 - band.y));
    const pieces = [];
    for (let i = 0; i < strip.length; i++)
      pieces.push(
        await sharp(strip[i].shot)
          .extract({ left: band.x, top: band.y, width: band.w, height: band.h })
          .resize({ width: band.w * 2, height: band.h * 2, kernel: 'nearest' })
          .toBuffer(),
      );
    const gap = 6;
    await sharp({ create: { width: band.w * 2, height: (band.h * 2 + gap) * pieces.length - gap, channels: 3, background: '#8a8a80' } })
      .composite(pieces.map((input, i) => ({ input, top: i * (band.h * 2 + gap), left: 0 })))
      .png()
      .toFile(`${OUT}/egg-insects-flight.png`);
  }

  console.log('  after it landed         ', JSON.stringify({ state: landed.state, events: landed.events }));
  ok(landed.state[2] === 'jar', 'it lands at the jar and stays there');
  ok(landed.events.length === 2 && landed.events[1].at === 'jar', "ctx.emit('props:insect', { i: 2, at: 'jar' }) fired on the landing");
  ok(landed.timeline.includes('buzz'), "the 'buzz' cue reached the audio graph (sound.timeline)");
  const buzzes = landed.cues.filter((c) => c === 'buzz').length;
  console.log(`  the buzz                 ${buzzes} firings over ${track[0]?.k?.n ?? '?'} drawings  (one every second drawing: 0.257 s of cue against a 0.167 s gap)`);
  ok(buzzes >= 2, 'the buzz runs the length of the flight rather than being one chirp at the start');
  ok(landed.played > before.played, 'the sound piece counted them (stats.played)');

  // ---- clicked again: a short loop, back to its own place ------------------------------------------
  const seat = await boxOf(2);
  await page.mouse.click(seat.x + seat.w / 2, seat.y + seat.h / 2);
  const loop = [];
  for (let n = 0; n < 40; n++) {
    await step1();
    const p = await sample();
    loop.push(p);
    if (p.at !== 'air') break;
  }
  const away = loop.reduce((best, p) => (Math.hypot(p.box.x - seat.x, p.box.y - seat.y) > Math.hypot(best.box.x - seat.x, best.box.y - seat.y) ? p : best), loop[0]);
  const backAt = loop[loop.length - 1].box;
  console.log(
    `  clicked where it landed  seat ${seat.x.toFixed(0)},${seat.y.toFixed(0)}  →  ${loop.length - 1} drawings, furthest ${away.box.x.toFixed(0)},${away.box.y.toFixed(0)}  →  back ${backAt.x.toFixed(0)},${backAt.y.toFixed(0)}`,
  );
  ok(Math.hypot(backAt.x - seat.x, backAt.y - seat.y) < 0.6, 'it comes back to its own place at the jar, not to a new one');
  ok(Math.hypot(away.box.x - seat.x, away.box.y - seat.y) > 12, 'and it really left it: the loop is a loop');

  // ---- the other switches are not disturbed --------------------------------------------------------
  await page.evaluate(() => {
    window.__go = 1e9; // the gate off again: the room runs as it runs
  });
  const st0 = await page.evaluate(() => ({ station: window.__theatre.pieces.props.radio.station, lit: window.__theatre.pieces.props.cat.lit }));
  const cbox = await page.evaluate(() => window.__theatre.pieces.props.cat.hitBox());
  await page.mouse.click(cbox.x + cbox.w / 2, cbox.y + cbox.h / 2);
  await page
    .waitForFunction((was) => window.__theatre.pieces.props.cat.lit !== was, st0.lit, { timeout: 30000 })
    .catch(() => {});
  const st1 = await page.evaluate(() => ({
    station: window.__theatre.pieces.props.radio.station,
    lit: window.__theatre.pieces.props.cat.lit,
    state: window.__theatre.pieces.props.insects.state,
  }));
  console.log(`  a click on the cat       ${JSON.stringify(st0)} → ${JSON.stringify({ station: st1.station, lit: st1.lit })}`);
  ok(st1.lit !== st0.lit, 'the cat still answers its own tap with six more switches in the room');
  ok(st1.state.filter((s) => s === 'jar').length === 1, 'and nothing else moved');

  console.log('  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors');
  await page.close();
}

// ---- 4. all of them gathered -----------------------------------------------------------------------
console.log('\nALL SIX AT THE JAR  (1280x800, home)');
{
  const [W, H] = PLATE;
  const page = await open(W, H, '&shot=1');
  const m = await page.evaluate(() => {
    const p = window.__theatre.pieces.props;
    p.insects.set('jar');
    const jar = window.__theatre.scene.getObjectByName('miel-jar');
    jar.updateWorldMatrix(true, true);
    const b = new window.__theatre.THREE.Box3().setFromObject(jar);
    return {
      state: p.insects.state,
      gathered: p.insects.gathered,
      boxes: Array.from({ length: p.insects.count }, (_, i) => p.insects.hitBox(i)),
      jar: { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) },
      seats: p.insects.seats.map((s) => s.map((v) => +v.toFixed(3))),
    };
  });
  await page.waitForTimeout(500);
  const shot = await page.locator('#stage').screenshot();
  await sharp(shot).png().toFile(`${OUT}/egg-insects-jar.png`);
  const c = await crop(shot, union(m.boxes), `${OUT}/egg-insects-jar-2x.png`, { pad: 26 });
  console.log(`  the jar's own box in metres  ${JSON.stringify(m.jar.min)} → ${JSON.stringify(m.jar.max)}`);
  console.log(`  their six places             ${m.seats.map((s) => `[${s[0]},${s[1]}]`).join(' ')}`);
  console.log(`  the crowd on the glass       ${union(m.boxes).w.toFixed(0)} x ${union(m.boxes).h.toFixed(0)} px at ${union(m.boxes).x.toFixed(0)},${union(m.boxes).y.toFixed(0)}   (crop ${c.width}x${c.height} at 2x)`);
  ok(m.gathered, 'all six report themselves at the jar');
  // none of them may be under the press's top board, which is where the jar's foot is
  ok(
    m.seats.every((s) => s[1] >= m.jar.min[1]),
    'not one of them is hanging below the top board the jar stands on',
  );
  ok(
    m.seats.every((s) => s[0] < 2.6 && s[0] > 2.0),
    'and none of them is inside the stage-right wall or off the end of the press',
  );
  ok(page.__errors.length === 0, 'no page errors with all six gathered');
  await page.close();
}
// the judging state, which is the same thing said through setState
{
  const page = await open(...PLATE, '&shot=1');
  await page.evaluate(() => window.__theatre.pieces.props.setState('insects-gathered'));
  await page.waitForTimeout(400);
  const g = await page.evaluate(() => window.__theatre.pieces.props.insects.gathered);
  ok(g, "?view=props&state=insects-gathered puts them at the jar (check-views has the state)");
  await page.close();
}

// ---- 5. the phone ----------------------------------------------------------------------------------
console.log('\nTHE PHONE  (390x844, home)');
{
  const [W, H] = PHONE;
  const page = await open(W, H, '&shot=1');
  const m = await page.evaluate(() => {
    const t = window.__theatre;
    const p = t.pieces.props;
    const THREE = t.THREE;
    t.camera.updateMatrixWorld(true);
    const W = window.innerWidth, H = window.innerHeight;
    const px = (v) => {
      const q = v.clone().project(t.camera);
      return [((q.x + 1) / 2) * W, ((1 - q.y) / 2) * H];
    };
    const jar = t.scene.getObjectByName('miel-jar');
    jar.updateWorldMatrix(true, true);
    const jb = new THREE.Box3().setFromObject(jar);
    return {
      wall: Array.from({ length: p.insects.count }, (_, i) => p.insects.hitBox(i)),
      tap: Array.from({ length: p.insects.count }, (_, i) => p.insects.tapBox(i)),
      jarPx: px(jb.getCenter(new THREE.Vector3())),
      radioPx: p.radio.hitBox(),
      catPx: p.cat.hitBox(),
      W,
      H,
    };
  });
  await page.locator('#stage').screenshot({ path: `${OUT}/egg-insects-phone.png` });
  const inFrame = (b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
  console.log(`  the six sheets      ${m.wall.map((b) => `${(b.x + b.w / 2).toFixed(0)}`).join(' ')} px across a ${W} px frame   ${m.wall.filter(inFrame).length}/6 wholly in frame`);
  console.log(`  a sheet measures    ${m.wall[0].w.toFixed(1)} px; the box a thumb gets is ${m.tap[0].w.toFixed(0)} x ${m.tap[0].h.toFixed(0)}`);
  console.log(`  the MIEL jar        x ${m.jarPx[0].toFixed(0)}  — ${m.jarPx[0] > W ? 'OUTSIDE the frame' : 'in frame'}`);
  console.log(`  for comparison      the radio at x ${m.radioPx.x.toFixed(0)}, the cat at x ${m.catPx.x.toFixed(0)}`);
  ok(m.wall.every(inFrame), 'every insect is in the picture on a phone — which the radio is not');
  ok(m.tap[0].w >= 44 && m.tap[0].h >= 44, 'and every one of them has a 44 px box under the thumb');
  await page.close();
}

await browser.close();
console.log(`\nframes in ${OUT}`);
console.log(fails.length ? `\n${fails.length} check(s) FAILED:\n  ${fails.join('\n  ')}` : '\nevery check holds');
process.exit(fails.length ? 1 : 0);
