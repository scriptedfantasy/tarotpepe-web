#!/usr/bin/env node
// THE VASE OF DRIED STEMS, WILTED BY A REAL POINTER, AND WHAT COMES BACK IN IT.
//
//   BASE=http://127.0.0.1:8716 node tools/_egg-vase-proof.mjs
//
// Six sections. Nothing in any of them reads the piece's own opinion of what it did except where
// the question IS a number the piece publishes (its box on the glass, the level it asks the sound
// piece for):
//   1. the nine drawings   the whole egg walked one cut at a time on a driven 12 fps clock, cropped
//                          about the vase and blown up 3x: dried → four wilting (the fourth is the
//                          empty pot) → four in leaf. One tile per drawing, in order.
//   2. a real click        a live page, a real pointerdown on the glass at the vase, and what came
//                          out of it: the cursor, the props:vase events with the wall clock beside
//                          them, and the rustles the sound piece actually scheduled.
//   3. 1 s, 2.5 s, 4 s     the three frames the brief asks for, struck exactly on the piece's own
//                          clock so they are reproducible: mid-wilt, the empty beat, in leaf.
//   4. the cue             `rustle` rendered offline through the very code the room plays it with,
//                          the way tools/_sound-probe.mjs measures every other voice.
//   5. a phone             390x760 portrait: where the vase lands, how big it is, whether a thumb
//                          can reach it, and the frame itself with the plant in leaf.
//   6. it puts itself back a second click, run to the end, and the vase region compared BYTE FOR
//                          BYTE against the same struck frame from before the first click.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT ?? '/tmp/egg-vase';
const [W, H] = [1280, 800];
// `node tools/_egg-vase-proof.mjs 4 6` runs just those sections; no arguments runs all six
const ONLY = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= 6);
const want = (n) => !ONLY.length || ONLY.includes(n);
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
// THE LOOP IS THE CLOCK, and in this browser it is slow: the ink pass is six fullscreen shaders on
// software WebGL. Waiting a fixed number of milliseconds after a click reads a room from before the
// click, so every page counts its own ticks and nothing is read until the loop has gone round.
async function open(query, size = { width: W, height: H }) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1, hasTouch: true });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text().slice(0, 200)));
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.evaluate(() => {
    const c = window.__theatre.clock;
    const orig = c.tick.bind(c);
    window.__ticks = 0;
    window.__live = () => {
      c.tick = () => {
        orig();
        window.__ticks++;
      };
    };
    window.__live();
  });
  return page;
}
async function pump(page, n = 3) {
  const from = await page.evaluate(() => window.__ticks);
  await page.waitForFunction((s) => window.__ticks >= s, from + n, { timeout: 120000 });
}
// PIN THE CLOCK TO ONE FRAME. `ctx.clock.t` is what every piece in the film reads, this one
// included, so striking a frame drives the egg's own timeline exactly as the wall clock would —
// and the boil, which is a function of the frame number, re-strikes the same pen every time.
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
  await pump(page, 3);
}
async function crop(png, box, out, pad = 10, scale = 3, w = W, h = H) {
  const x = Math.max(0, Math.round(box.x - pad)), y = Math.max(0, Math.round(box.y - pad));
  const cw = Math.min(w - x, Math.round(box.w + pad * 2)), ch = Math.min(h - y, Math.round(box.h + pad * 2));
  await sharp(png).extract({ left: x, top: y, width: cw, height: ch }).resize({ width: cw * scale, kernel: 'nearest' }).toFile(out);
  return { x, y, w: cw, h: ch };
}

// ---- 1. the nine drawings ------------------------------------------------------------------------
if (want(1)) {
  console.log('== 1. the nine drawings, one cut at a time ========================================');
  const page = await open('?view=props&state=default&shot=1');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await pump(page, 3);
  const box = await page.evaluate(() => window.__theatre.pieces.props.vase.hitBox());
  console.log(`the vase on the home plate  ${box.w.toFixed(1)} x ${box.h.toFixed(1)} px at ${box.x.toFixed(0)},${box.y.toFixed(0)}`);

  // frame 24 is t = 2 s: the click. Every cut after it is that plus the piece's own schedule.
  const F0 = 24;
  const CUTS = [
    ['dried', null],
    ['drooping', 0],
    ['dropping', 0.5],
    ['a last stem', 1.0],
    ['bare / the empty beat', 1.5],
    ['a shoot or two', 3.0],
    ['four shoots, first leaves', 3.5],
    ['six, leaves open', 4.0],
    ['seven, in full leaf', 4.5],
  ];
  const tiles = [], geom = [];
  for (const [name, at] of CUTS) {
    if (at == null) await strike(page, F0);
    else {
      if (at === 0) await page.evaluate(() => window.__theatre.pieces.props.vase.click());
      await strike(page, F0 + Math.round(at * 12));
    }
    const s = await page.evaluate(() => {
      const v = window.__theatre.pieces.props.vase;
      const g = window.__theatre.scene.getObjectByName('vase');
      const holder = g.getObjectByName('vase-drawings');
      const on = holder.children.find((c) => c.visible);
      return { state: v.state, busy: v.busy, drawing: on ? on.name.replace('vase-', '') : 'the original stems' };
    });
    const png = `${OUT}/draw-${geom.length}.png`;
    await page.screenshot({ path: png });
    const g = await crop(png, box, `${OUT}/tile-${geom.length}.png`, 10, 3);
    geom.push(g);
    tiles.push(await sharp(`${OUT}/tile-${geom.length - 1}.png`).toBuffer());
    console.log(`  ${String(at == null ? '—' : at.toFixed(1) + ' s').padStart(6)}  ${name.padEnd(26)} drawing ${s.drawing.padEnd(6)} state ${s.state}`);
  }
  const m = await sharp(tiles[0]).metadata();
  await sharp({ create: { width: (m.width + 10) * tiles.length, height: m.height, channels: 3, background: '#f8f9f4' } })
    .composite(tiles.map((input, i) => ({ input, left: i * (m.width + 10), top: 0 })))
    .toFile(`${OUT}/nine-drawings.png`);
  console.log(`the nine, at 3x           ${OUT}/nine-drawings.png`);
  await page.close();
}

// ---- 2. a real click on the glass ----------------------------------------------------------------
if (want(2)) {
  console.log('\n== 2. a real pointer, on a live page =============================================');
  // no ?shot=1: the sound piece is live, and the pointerdown on the vase is its first gesture
  const page = await open('?view=props&state=default');
  await page.evaluate(() => {
    window.__vase = [];
    window.__t0 = performance.now();
    window.__theatre.on('props:vase', (d) => window.__vase.push({ ...d, at: +((performance.now() - window.__t0) / 1000).toFixed(2) }));
    window.__theatre.pieces.camera.cut('home');
  });
  await pump(page, 3);
  const b = await page.evaluate(() => {
    const v = window.__theatre.pieces.props.vase;
    return { hit: v.hitBox(), tap: v.tapBox(), state: v.state };
  });
  console.log(`the vase on the glass     ${b.hit.w.toFixed(1)} x ${b.hit.h.toFixed(1)} px at ${b.hit.x.toFixed(0)},${b.hit.y.toFixed(0)}`);
  console.log(`what a thumb is given     ${b.tap.w.toFixed(0)} x ${b.tap.h.toFixed(0)} px${b.tap.grown ? '   (GROWN: the margin is the target)' : '   (the drawing itself)'}`);
  const cx = b.hit.x + b.hit.w / 2, cy = b.hit.y + b.hit.h * 0.3; // up among the stems, not on the pot
  await page.mouse.move(cx, cy);
  await pump(page, 3);
  console.log('the cursor over it        ', JSON.stringify(await page.evaluate(() => window.__theatre.renderer.domElement.style.cursor)),
    ' the arbiter says the pointer is on', JSON.stringify(await page.evaluate(() => window.__theatre.pieces.props.switches.hovered)));
  console.log(`before anyone touches it   state ${b.state}`);

  await page.evaluate(() => (window.__t0 = performance.now()));
  await page.mouse.click(cx, cy);
  // …and then wait for the egg to finish, on its own wall clock, however slow this browser is
  await page.waitForFunction(() => window.__theatre.pieces.props.vase.state === 'leaf' && !window.__theatre.pieces.props.vase.busy, null, { timeout: 120000 });
  const ev = await page.evaluate(() => window.__vase);
  console.log('props:vase events         ', JSON.stringify(ev));
  console.log('the rustles the sound piece scheduled',
    JSON.stringify(await page.evaluate(() => window.__theatre.pieces.sound.timeline.filter((c) => c.name === 'rustle').map((c) => +c.at.toFixed(3)))));
  // a click while it is running must do nothing: the arbiter is told the switch is not a switch
  const mid = await page.evaluate(async () => {
    const v = window.__theatre.pieces.props.vase;
    v.click(); // it is settled in leaf, so this starts the way home
    const busy = v.busy;
    const before = v.state;
    v.click(); // …and this one lands in the middle of it
    return { busy, before, after: v.state };
  });
  console.log(`a second click mid-flight  busy ${mid.busy} · state ${mid.before} → ${mid.after}  (nothing restarted)`);
  await page.waitForFunction(() => window.__theatre.pieces.props.vase.state === 'dried' && !window.__theatre.pieces.props.vase.busy, null, { timeout: 120000 });
  console.log('and back where it started ', JSON.stringify(await page.evaluate(() => window.__vase)));
  await page.close();
}

// ---- 3. the three frames -------------------------------------------------------------------------
if (want(3)) {
  console.log('\n== 3. at 1 s, 2.5 s and 4 s =====================================================');
  const page = await open('?view=props&state=default&shot=1');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await pump(page, 3);
  const box = await page.evaluate(() => window.__theatre.pieces.props.vase.hitBox());
  const F0 = 24;
  await strike(page, F0);
  await page.evaluate(() => window.__theatre.pieces.props.vase.click());
  for (const s of [1.0, 2.5, 4.0]) {
    await strike(page, F0 + Math.round(s * 12));
    const st = await page.evaluate(() => window.__theatre.pieces.props.vase.state);
    const png = `${OUT}/at-${String(s).replace('.', 'p')}s.png`;
    await page.screenshot({ path: png });
    await crop(png, box, `${OUT}/at-${String(s).replace('.', 'p')}s-3x.png`, 10, 3);
    console.log(`  ${s.toFixed(1)} s   state ${st.padEnd(8)} ${png}`);
  }
  await page.close();
}

// ---- 4. the cue ----------------------------------------------------------------------------------
if (want(4)) {
  console.log('\n== 4. the rustle, rendered offline ==============================================');
  // NOT ?shot=1: in screenshot mode the sound piece is a stub with no context and render() is null
  const page = await open('?view=props&state=default');
  const r = await page.evaluate(async () => {
    const s = window.__theatre.pieces.sound;
    const b = await s.render('rustle', 1.4, { seed: 7, at: 0.02 });
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
    // the same 12 ms window tools/_sound-probe.mjs uses, from the cue's FIRST audible sample
    let onset = 0;
    for (let i = first; i < Math.min(last, first + Math.round(sr * 0.012)); i++) onset = Math.max(onset, Math.abs(l[i]));
    return { peak, length: (last - first) / sr, onset, want: s.levels.rustle, trim: s.trims.rustle, cap: s.lengths.rustle, known: s.cues.includes('rustle') };
  });
  console.log(
    `rustle  peak ${r.peak.toFixed(4)} (${(20 * Math.log10(r.peak)).toFixed(1)} dBFS) · ${r.length.toFixed(3)} s of ${r.cap} allowed · ` +
      `on its first 12 ms it is at ${((100 * r.onset) / r.peak).toFixed(0)}% of peak · in CUES ${r.known}`,
  );
  // the probe's own arithmetic (tools/_sound-probe.mjs): the render already went through the trim
  // that is in the table, so the new one is the standing one scaled by how far off the level it came
  console.log(`it wants LEVEL ${r.want}, it stands at TRIM ${r.trim} → TRIM ${(r.trim * (r.want / r.peak)).toFixed(3)}`);
  await page.close();
}

// ---- 5. a phone ----------------------------------------------------------------------------------
if (want(5)) {
  console.log('\n== 5. the vase on a phone =======================================================');
  for (const [w, h] of [[1600, 900], [1280, 800], [390, 760], [360, 800]]) {
    const page = await open('?view=props&state=vase-leaf&shot=1', { width: w, height: h });
    for (const shot of ['home', 'wide']) {
      const m = await page.evaluate((s) => {
        window.__theatre.pieces.camera.cut(s);
        const v = window.__theatre.pieces.props.vase;
        return { hit: v.hitBox(), tap: v.tapBox() };
      }, shot);
      await pump(page, 3);
      const b = m.hit, t = m.tap;
      const off = b.x + b.w < 0 || b.x > w || b.y + b.h < 0 || b.y > h;
      const clipped = b.x < 0 || b.y < 0 || b.x + b.w > w || b.y + b.h > h;
      console.log(
        `${String(w + 'x' + h).padEnd(9)} ${shot.padEnd(5)}  vase ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
          `   tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}` +
          (off ? '   OUTSIDE THE FRAME: nothing to click, and no hotspot at the edge' : clipped ? '   (clipped by the frame)' : ''),
      );
      if (w === 390) {
        const png = `${OUT}/phone-${shot}-leaf.png`;
        await page.screenshot({ path: png });
        await crop(png, b, `${OUT}/phone-${shot}-leaf-3x.png`, 12, 3, w, h);
        console.log(`            ${png}`);
      }
    }
    await page.close();
  }
}

// ---- 6. it puts itself back ----------------------------------------------------------------------
if (want(6)) {
  console.log('\n== 6. a second click, and the dried stems back ===================================');
  const page = await open('?view=props&state=default&shot=1');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await pump(page, 3);
  const box = await page.evaluate(() => window.__theatre.pieces.props.vase.hitBox());
  const F = 36; // one frame, struck before and after, so the boil is the same pen both times
  await strike(page, F);
  await page.screenshot({ path: `${OUT}/before.png` });
  const g = await crop(`${OUT}/before.png`, box, `${OUT}/before-3x.png`, 10, 3);

  // the whole egg, driven on its own clock: out through the wilt, the beat and the leaf…
  await strike(page, 120);
  await page.evaluate(() => window.__theatre.pieces.props.vase.click());
  for (const s of [0, 0.5, 1, 1.5, 3, 3.5, 4, 4.5, 5]) await strike(page, 120 + Math.round(s * 12));
  console.log(`  after the first click   state ${await page.evaluate(() => window.__theatre.pieces.props.vase.state)}`);
  // …and back
  await page.evaluate(() => window.__theatre.pieces.props.vase.click());
  for (const s of [0, 0.5, 1, 1.5, 2, 2.5]) await strike(page, 180 + Math.round(s * 12));
  console.log(`  after the second click  state ${await page.evaluate(() => window.__theatre.pieces.props.vase.state)}`);

  await strike(page, F); // the same frame again: same seed, same pen, same drawing
  await page.screenshot({ path: `${OUT}/after.png` });
  await crop(`${OUT}/after.png`, box, `${OUT}/after-3x.png`, 10, 3);

  const A = await sharp(`${OUT}/before.png`).extract({ left: g.x, top: g.y, width: g.w, height: g.h }).raw().toBuffer();
  const B = await sharp(`${OUT}/after.png`).extract({ left: g.x, top: g.y, width: g.w, height: g.h }).raw().toBuffer();
  let diff = 0, worst = 0;
  for (let i = 0; i < A.length; i++) {
    const d = Math.abs(A[i] - B[i]);
    if (d) diff++;
    if (d > worst) worst = d;
  }
  const px = g.w * g.h;
  console.log(`the vase region  ${g.w} x ${g.h} px at ${g.x},${g.y}  (${px} pixels, ${A.length} channel samples)`);
  console.log(`  channel samples that differ  ${diff}${diff === 0 ? '   — the drawing came back to the byte' : `   worst ${worst}/255`}`);
  console.log(`  ${OUT}/before-3x.png   ${OUT}/after-3x.png`);
  await page.close();
}

await browser.close();
console.log(`\nframes in ${OUT}`);
