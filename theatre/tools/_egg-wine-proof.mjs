#!/usr/bin/env node
// THE WINE BOTTLE, POURED BY A REAL POINTER, AND WHAT THREE FINGERS DO TO THE ROOM.
//
//   BASE=http://127.0.0.1:8702 node tools/_egg-wine-proof.mjs
//
// Five sections, and nothing in any of them reads the piece's own idea of what it did except where
// the question IS a number the piece publishes (the multiplier, the level):
//   1. the pours       five real clicks on the glass at 1280x800, the home plate. 2x crops of the
//                      bottle at 5, 4, 3, 2 fingers, the props:wine events, and what the sound
//                      piece's timeline says it played.
//   2. the boil        the same contour's position over twelve consecutive frames — six strikes of
//                      the pen, because the boil is on twos — sober and drunk, in px. The plate is
//                      held still for this (wine.sway = 0) so what is measured is the pen alone.
//   3. the roll        the plate at the top of its sway, and the angle between the sober and drunk
//                      cameras, measured off the quaternions.
//   4. the 30 seconds  the multiplier at 0, 10, 25, 30 and 31 s, with time driven through the
//                      piece's own clock, and the pen's numbers checked back to the byte at the end.
//   5. the windows    where the bottle lands, and how big it is, in every window the film is judged
//                      at — including the two portrait ones, which crop the cart out of the picture.
// A sixth click, on an empty bottle, is part of section 1 and must do nothing at all.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT ?? '/tmp/egg-wine';
const [W, H] = [1280, 800];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;',
  });
// THE LOOP IS THE CLOCK, and in this browser it is slow. The ink pass is six fullscreen shaders on
// software WebGL, so a frame takes the better part of a second: waiting 500 ms after a click and
// reading the room reads a room from before the click. So every page counts its own ticks and
// nothing is read until the loop has actually gone round.
async function open(query) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text().slice(0, 200)));
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.evaluate(() => {
    const c = window.__theatre.clock;
    const orig = c.tick.bind(c);
    window.__ticks = 0;
    c.tick = () => {
      orig();
      window.__ticks++;
    };
  });
  return page;
}
async function pump(page, n = 3) {
  const from = await page.evaluate(() => window.__ticks);
  await page.waitForFunction((s) => window.__ticks >= s, from + n, { timeout: 120000 });
}
// 2x crop about a box on the glass, with a margin, so a bottle 15 px wide can be looked at
async function crop(png, box, out, pad = 26) {
  const x = Math.max(0, Math.round(box.x - pad)), y = Math.max(0, Math.round(box.y - pad));
  const w = Math.min(W - x, Math.round(box.w + pad * 2)), h = Math.min(H - y, Math.round(box.h + pad * 2));
  await sharp(png).extract({ left: x, top: y, width: w, height: h }).resize({ width: w * 2, kernel: 'nearest' }).toFile(out);
  return out;
}

// ---- 1. five clicks ------------------------------------------------------------------------------
{
  console.log('== 1. the pours, driven by a real pointer =========================================');
  // no ?shot=1: the sound piece is live, and the pointerdown on the bottle is its first gesture
  const page = await open('?view=props&state=default');
  await page.evaluate(() => {
    window.__wine = [];
    window.__theatre.on('props:wine', (d) => window.__wine.push(d));
    window.__theatre.pieces.camera.cut('home');
    window.__theatre.pieces.props.wine.sway = 0; // the crops are about the DRAWING; hold the plate
  });
  await pump(page, 3);
  const box = await page.evaluate(() => {
    const w = window.__theatre.pieces.props.wine;
    return { hit: w.hitBox(), tap: w.tapBox() };
  });
  console.log(`the bottle on the glass   set ${box.hit.w.toFixed(1)} x ${box.hit.h.toFixed(1)} px at ${box.hit.x.toFixed(0)},${box.hit.y.toFixed(0)}`);
  console.log(`what a thumb is given     ${box.tap.w.toFixed(0)} x ${box.tap.h.toFixed(0)} px${box.tap.grown ? '   (GROWN: the margin is the target)' : '   (the set itself)'}`);

  const cx = box.hit.x + box.hit.w / 2, cy = box.hit.y + box.hit.h / 2;
  const read = () =>
    page.evaluate(() => {
      const w = window.__theatre.pieces.props.wine;
      const s = window.__theatre.pieces.sound;
      const p = window.__theatre.pieces.ink.params;
      return { fingers: w.fingers, drunk: w.drunk, boil: +w.boil.toFixed(3), wobble: +p.wobble.toFixed(4), penWob: +p.penWob.toFixed(4), cues: s.timeline.slice(-2).map((c) => c.name) };
    });

  await page.mouse.move(cx, cy);
  await pump(page, 3);
  console.log('the cursor over it        ', JSON.stringify(await page.evaluate(() => window.__theatre.renderer.domElement.style.cursor)));
  console.log('before a hand goes near it', JSON.stringify(await read()));
  await page.screenshot({ path: `${OUT}/pour-5.png` });
  await crop(`${OUT}/pour-5.png`, box.hit, `${OUT}/bottle-5-fingers.png`);

  for (let i = 1; i <= 5; i++) {
    await page.mouse.click(cx, cy);
    await pump(page, 3);
    const r = await read();
    console.log(`click ${i} → ${r.fingers} finger(s) left `, JSON.stringify(r));
    await page.screenshot({ path: `${OUT}/pour-${r.fingers}.png` });
    await crop(`${OUT}/pour-${r.fingers}.png`, box.hit, `${OUT}/bottle-${r.fingers}-fingers.png`);
  }
  console.log('a sixth click, on an empty bottle');
  const before = await read();
  await page.mouse.click(cx, cy);
  await pump(page, 3);
  const after = await read();
  console.log(`  fingers ${before.fingers} → ${after.fingers}${after.fingers === before.fingers ? '  (nothing poured, as it should)' : '  *** IT POURED ***'}`);
  console.log('  the cursor over an empty bottle', JSON.stringify(await page.evaluate(() => window.__theatre.renderer.domElement.style.cursor)));
  console.log('props:wine events         ', JSON.stringify(await page.evaluate(() => window.__wine)));
  console.log('the glugs the sound piece scheduled',
    JSON.stringify(await page.evaluate(() => window.__theatre.pieces.sound.timeline.filter((c) => c.name === 'glug').map((c) => +c.at.toFixed(3)))));
  // THE CUE ITSELF, rendered offline through the very code the room plays it with — the way
  // tools/_sound-probe.mjs measures every other voice. A filter eats most of a noise burst, so
  // LEVEL is a wish and TRIM is what it takes: the last number is the one to paste back.
  {
    const r = await page.evaluate(async () => {
      const s = window.__theatre.pieces.sound;
      const b = await s.render('glug', 1.2, { seed: 7, at: 0.02 });
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
      // the same window tools/_sound-probe.mjs uses: 12 ms from the cue's FIRST audible sample,
      // not from the top of the buffer (the cue is laid on at 0.02 s)
      let onset = 0;
      for (let i = first; i < Math.min(last, first + Math.round(sr * 0.012)); i++) onset = Math.max(onset, Math.abs(l[i]));
      return { peak, length: (last - first) / sr, onset, want: s.levels.glug, cap: s.lengths.glug, known: s.cues.includes('glug') };
    });
    console.log(
      `the glug, rendered offline  peak ${r.peak.toFixed(4)} (${(20 * Math.log10(r.peak)).toFixed(1)} dBFS) · ${r.length.toFixed(3)} s of ${r.cap} allowed · ` +
        `on its first 12 ms it is at ${((100 * r.onset) / r.peak).toFixed(0)}% of peak · in CUES ${r.known}`,
    );
    console.log(`it wants LEVEL ${r.want} → TRIM ${(r.want / r.peak).toFixed(3)}`);
  }
  // every level side by side at 4x, which is the only way to look at a bottle 17 px wide
  {
    const tiles = [];
    for (const n of [5, 4, 3, 2, 1, 0]) {
      const b = box.hit;
      const x = Math.round(b.x - 14), y = Math.round(b.y - 16), w = Math.round(b.w + 28), h = Math.round(b.h + 30);
      tiles.push(await sharp(`${OUT}/pour-${n}.png`).extract({ left: x, top: y, width: w, height: h }).resize({ width: w * 4, kernel: 'nearest' }).toBuffer());
    }
    const meta = await sharp(tiles[0]).metadata();
    await sharp({ create: { width: (meta.width + 12) * tiles.length, height: meta.height, channels: 3, background: '#f8f9f4' } })
      .composite(tiles.map((input, i) => ({ input, left: i * (meta.width + 12), top: 0 })))
      .toFile(`${OUT}/levels.png`);
    console.log(`every level at 4x         ${OUT}/levels.png`);
  }
  await page.close();
}

// ---- the pen, over twelve consecutive frames -----------------------------------------------------
// One page, the clock driven by hand: `ctx.clock.tick` is replaced with a function that pins the
// frame, so twelve frames of the drawing cost one page load and are exactly reproducible.
async function strike(page, frame) {
  await page.evaluate((f) => {
    const c = window.__theatre.clock;
    c.tick = () => {
      c.raw = f / 12;
      c.frame = f;
      c.t = f / 12;
      c.dt = 1 / 12;
      c.stepped = true;
      window.__ticks++;
    };
  }, frame);
  await pump(page, 3); // the pinned frame has to go round the loop before it is on the glass
}
// the intensity-weighted centre of the darkest thing in a window, per row band, in px
async function lineAt(png, xa, xb, y0, y1) {
  const { data, info } = await sharp(png).extract({ left: xa, top: y0, width: xb - xa, height: y1 - y0 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let num = 0, den = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const ink = Math.max(0, 235 - data[y * info.width + x]);
      num += ink * x;
      den += ink;
    }
  }
  return den > 0 ? xa + num / den : NaN;
}
// pick a window holding ONE strong near-vertical contour with bare paper either side of it
async function findLine(png, y0, y1) {
  const { data, info } = await sharp(png).extract({ left: 0, top: y0, width: W, height: y1 - y0 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const col = new Float64Array(info.width);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) col[x] += Math.max(0, 235 - data[y * info.width + x]) / info.height;
  let best = -1, bestScore = 0;
  for (let x = 40; x < W - 40; x++) {
    if (col[x] < 60) continue;
    let peak = true, quiet = 0;
    for (let d = -3; d <= 3; d++) if (col[x + d] > col[x]) peak = false;
    for (let d = 7; d <= 14; d++) quiet += col[x - d] + col[x + d];
    const score = col[x] - quiet / 8;
    if (peak && score > bestScore) { bestScore = score; best = x; }
  }
  return best;
}

let SOBER = null, DRUNK = null;
{
  console.log('\n== 2. the boil, sober and drunk ===================================================');
  const FRAMES = 12; // = six strikes of the pen: it re-seeds on twos
  const runs = {};
  for (const state of ['default', 'wine-drunk']) {
    const page = await open(`?view=props&state=${state}&shot=1`);
    await page.evaluate(() => {
      window.__theatre.pieces.camera.cut('home');
      window.__theatre.pieces.props.wine.sway = 0; // the pen alone: no lean in the measurement
    });
    const info = await page.evaluate(() => {
      const p = window.__theatre.pieces.ink.params;
      const w = window.__theatre.pieces.props.wine;
      return { wobble: p.wobble, penWob: p.penWob, boil: w.boil, fingers: w.fingers, drunk: w.drunk };
    });
    const shots = [];
    for (let f = 24; f < 24 + FRAMES; f++) {
      await strike(page, f);
      const path = `${OUT}/boil-${state}-${f}.png`;
      await page.screenshot({ path });
      shots.push(path);
    }
    runs[state] = { info, shots };
    await page.close();
  }
  // the contour is chosen on the SOBER sheet and the same window is measured on both
  const band = [300, 430];
  const x = await findLine(runs.default.shots[0], band[0], band[1]);
  console.log(`the contour measured: x ≈ ${x}, rows ${band[0]}–${band[1]}, a ±7 px window round it`);
  // …and what it is, at 4x, so whoever reads these numbers can see the line they are about
  await sharp(runs.default.shots[0]).extract({ left: x - 30, top: band[0], width: 60, height: band[1] - band[0] }).resize({ width: 240, kernel: 'nearest' }).toFile(`${OUT}/boil-what-is-measured.png`);
  for (const state of ['default', 'wine-drunk']) {
    const xs = [];
    for (const s of runs[state].shots) xs.push(await lineAt(s, x - 7, x + 8, band[0], band[1]));
    const strikes = xs.filter((_, i) => i % 2 === 0); // one position per strike of the pen
    const mean = strikes.reduce((a, b) => a + b, 0) / strikes.length;
    const sd = Math.sqrt(strikes.reduce((a, b) => a + (b - mean) ** 2, 0) / strikes.length);
    const p2p = Math.max(...strikes) - Math.min(...strikes);
    const row = { sd: +sd.toFixed(3), peakToPeak: +p2p.toFixed(3), at: strikes.map((v) => +v.toFixed(2)) };
    if (state === 'default') SOBER = row; else DRUNK = row;
    const i = runs[state].info;
    console.log(`${state.padEnd(11)} wobble ${i.wobble.toFixed(3)}  penWob ${i.penWob.toFixed(3)}  boil ×${i.boil.toFixed(2)}  drunk ${i.drunk}`);
    console.log(`            the line stands at ${row.at.join(', ')}`);
    console.log(`            sd ${row.sd.toFixed(3)} px   peak-to-peak ${row.peakToPeak.toFixed(3)} px`);
  }
  console.log(`the pen wanders ×${(DRUNK.sd / SOBER.sd).toFixed(2)} as far when the room is drunk (sd), ×${(DRUNK.peakToPeak / SOBER.peakToPeak).toFixed(2)} peak-to-peak`);

  // …and the same question asked of the WHOLE PICTURE rather than of one line, because a fitted
  // contour has a threshold in it and a share of the frame does not: how much of the drawing is
  // actually different from one strike of the pen to the next.
  console.log('\nhow much of the drawing changes between one strike and the next (whole frame):');
  for (const state of ['default', 'wine-drunk']) {
    const strikes = runs[state].shots.filter((_, i) => i % 2 === 0);
    const bufs = [];
    for (const s of strikes) bufs.push((await sharp(s).greyscale().raw().toBuffer({ resolveWithObject: true })).data);
    let moved = 0, pairs = 0;
    for (let i = 0; i + 1 < bufs.length; i++) {
      let n = 0;
      for (let p = 0; p < bufs[i].length; p++) if (Math.abs(bufs[i][p] - bufs[i + 1][p]) > 32) n++;
      moved += (n / bufs[i].length) * 100;
      pairs++;
    }
    const pc = moved / pairs;
    if (state === 'default') SOBER.frame = pc; else DRUNK.frame = pc;
    console.log(`  ${state.padEnd(11)} ${pc.toFixed(3)}% of the frame is re-drawn somewhere else`);
  }
  console.log(`  ×${(DRUNK.frame / SOBER.frame).toFixed(2)} as much of the picture moves between strikes`);
  console.log(
    '\nthe two numbers disagree and both are right. The pen\'s parameters are ×2.4, and the SHARE OF\n' +
      'THE FRAME that lands somewhere else follows them at ×1.8. One long contour moves ×10, because\n' +
      'the composite FITS a line through seeds that sit on the pixel lattice: a 0.6 px slide of the\n' +
      'seed map moves no seed into a different pixel and the fit lands back where it was, and a 1.44 px\n' +
      'slide does. The threshold is in the ruler, not in the wine — quote the frame number for how\n' +
      'much drunker the room is, and the line number for what a single stroke does when it crosses it.',
  );
}

// ---- 3. the plate at the top of its sway ---------------------------------------------------------
{
  console.log('\n== 3. the roll ===================================================================');
  // frame 20 is t = 1.667 s, and sin(2π · 0.15 · 1.667) = 1: the top of the lean, exactly
  const page = await open('?view=props&state=wine-drunk&shot=1');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await strike(page, 20);
  const q = await page.evaluate(() => {
    const w = window.__theatre.pieces.props.wine;
    return { roll: w.roll, deg: (w.roll * 180) / Math.PI, q: window.__theatre.camera.quaternion.toArray() };
  });
  await page.screenshot({ path: `${OUT}/roll-extreme.png` });
  // …and the same frame with the lean taken off, so the angle can be measured off the two cameras
  await page.evaluate(() => (window.__theatre.pieces.props.wine.sway = 0));
  await strike(page, 20);
  const q0 = await page.evaluate(() => window.__theatre.camera.quaternion.toArray());
  await page.screenshot({ path: `${OUT}/roll-none.png` });
  const dot = Math.abs(q.q.reduce((a, v, i) => a + v * q0[i], 0));
  const between = (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
  console.log(`the piece says the plate is leaning ${q.deg.toFixed(3)}°`);
  console.log(`the two cameras are ${between.toFixed(3)}° apart  (measured off the quaternions)`);
  console.log(`${OUT}/roll-extreme.png  ${OUT}/roll-none.png`);
  await page.close();
}

// ---- 4. the thirty seconds -----------------------------------------------------------------------
{
  console.log('\n== 4. it wears off ===============================================================');
  const page = await open('?view=props&state=default&shot=1');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await strike(page, 24);
  const shipped = await page.evaluate(() => {
    const p = window.__theatre.pieces.ink.params;
    return { wobble: p.wobble, penWob: p.penWob };
  });
  await page.evaluate(() => {
    const w = window.__theatre.pieces.props.wine;
    w.pour();
    w.pour();
    w.pour();
  });
  console.log(`the pen ships at wobble ${shipped.wobble} · penWob ${shipped.penWob}; three fingers are gone`);
  for (const s of [0, 1, 2, 5, 10, 25, 27.5, 30, 31]) {
    const r = await page.evaluate((age) => {
      const w = window.__theatre.pieces.props.wine;
      w.setAge(age);
      return null;
    }, s);
    await pump(page, 3);
    const m = await page.evaluate(() => {
      const w = window.__theatre.pieces.props.wine;
      const p = window.__theatre.pieces.ink.params;
      return { boil: +w.boil.toFixed(3), drunk: w.drunk, roll: +((w.roll * 180) / Math.PI).toFixed(3), wobble: +p.wobble.toFixed(4), penWob: +p.penWob.toFixed(4) };
    });
    const back = m.wobble === shipped.wobble && m.penWob === shipped.penWob;
    console.log(`  ${String(s + ' s').padStart(7)}  boil ×${m.boil.toFixed(3)}  roll ${m.roll.toFixed(3)}°  wobble ${m.wobble}  penWob ${m.penWob}${back ? '   ← exactly as it was' : ''}`);
  }
  const level = await page.evaluate(() => window.__theatre.pieces.props.wine.fingers);
  console.log(`and the bottle is still ${level} fingers down: the wine wears off, it does not come back`);
  await page.close();
}

// ---- 5. and where the bottle is in every window the film is judged at ----------------------------
{
  console.log('\n== 5. the bottle on the glass, window by window ===================================');
  for (const [w, h] of [[1600, 900], [1280, 800], [390, 760], [360, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
    page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
    await page.route('**/@vite/client', stub);
    await page.goto(`${BASE}/?view=props&state=default&shot=1`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
    for (const shot of ['home', 'wide']) {
      const m = await page.evaluate((s) => {
        window.__theatre.pieces.camera.cut(s);
        const b = window.__theatre.pieces.props.wine;
        return { hit: b.hitBox(), tap: b.tapBox() };
      }, shot);
      const b = m.hit, t = m.tap;
      const off = b.x + b.w < 0 || b.x > w || b.y + b.h < 0 || b.y > h;
      console.log(
        `${String(w + 'x' + h).padEnd(9)} ${shot.padEnd(5)}  bottle ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
          `   tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${off ? '   OUTSIDE THE FRAME: there is nothing to click, and no hotspot at the edge' : ''}`,
      );
    }
    await page.close();
  }
}

await browser.close();
console.log(`\nframes in ${OUT}`);
