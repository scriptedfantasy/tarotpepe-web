#!/usr/bin/env node
// Proof for the clock's ten seconds (src/pieces/egg-vortex.js).
//
//   BASE=http://127.0.0.1:8706 node tools/_egg-vortex-proof.mjs [--part frames|crop|phone|cost|click|strip]
//
// frames  the home plate at 1280x800 at vortex t = 0, 2, 4, 6, 8, 9.5, 10.3, 11, and a pixel
//         comparison of t = 11 (settled) against t = 0 (nothing has happened yet)
// crop    a 2x crop at t = 6: are the spiral strokes drawn, and are the lines still lines
// phone   390x760 at t = 6
// cost    ms per rendered frame of ink.render(), the pass active and idle, on the laptop frame
// click   a real pointer click on the dial: does it start, what phases are emitted, what the
//         escapement's rate does, and does a second click during the run do nothing
// strip   a contact sheet of the whole run, for looking at the shape of it
// live    the same click in a running evening (no ?shot=1): flow, sound and the DOM placard
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/egg-vortex';
const part = args.part ?? 'all';
const has = (p) => part === 'all' || part === p;
mkdirSync(OUT, { recursive: true });

// every still is taken with the scene clock frozen and the dial pinned, so two frames differ only
// where the vortex made them differ
const FREEZE = 't=2&now=10:10&seed=1';
const url = (q) => `${BASE}/?${q}&shot=1`;

// --gpu drops the swiftshader flags and lets headless Chromium use the machine's real GPU, which
// is the only way to quote a cost in the milliseconds a visitor's laptop would spend. Every other
// part runs on swiftshader, like the rest of the tools, so the drawing is the drawing.
const browser = await chromium.launch({
  headless: true,
  args: args.gpu
    ? ['--ignore-gpu-blocklist', '--enable-webgl', '--enable-gpu-rasterization', '--use-angle=metal']
    : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const viteStub = (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
  });

async function open(width, height, q) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/@vite/client', viteStub);
  await page.goto(url(q), { waitUntil: 'load', timeout: 60000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(200);
  }
  return { page, errors };
}

const log = [];
const say = (s) => { log.push(s); console.log(s); };

// ── frames ────────────────────────────────────────────────────────────────────────────────────
const TS = [0, 2, 4, 6, 8, 9.5, 10.3, 11];
if (has('frames') || has('strip') || has('crop')) {
  const shots = new Map();
  for (const t of TS) {
    const { page, errors } = await open(1280, 800, `vortex=${t}&${FREEZE}`);
    await page.waitForTimeout(900);
    const state = await page.evaluate(() => {
      const v = window.__theatre.pieces.props.vortex, i = window.__theatre.pieces.ink.vortex;
      return { t: v.t, active: v.active, reach: i.reach, twist: i.twist, pull: i.pull, arms: i.arms, inkActive: i.active };
    });
    const buf = await page.screenshot();
    shots.set(t, buf);
    if (has('frames')) writeFileSync(`${OUT}/t${String(t).replace('.', '_')}.png`, buf);
    say(`t=${t}  active=${state.active}  pass=${state.inkActive}  reach=${state.reach.toFixed(0)}px twist=${state.twist.toFixed(2)}rad pull=${state.pull.toFixed(2)} arms=${state.arms.toFixed(2)}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
    await page.close();
  }
  if (has('frames')) {
    // settled == untouched? t = 11 against t = 0, same boil, same dial
    const a = await sharp(shots.get(0)).raw().toBuffer();
    const b = await sharp(shots.get(11)).raw().toBuffer();
    let diff = 0, worst = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      if (d > 2) diff++;
      if (d > worst) worst = d;
    }
    say(`settled: t=11 vs t=0 — ${diff} of ${a.length} subpixels differ by more than 2/255 (${((diff / a.length) * 100).toFixed(4)}%), worst ${worst}/255`);
  }
  if (has('strip')) {
    const w = 320, h = 200;
    const tiles = await Promise.all(TS.map((t) => sharp(shots.get(t)).resize(w, h).png().toBuffer()));
    await sharp({ create: { width: w * 4, height: h * 2, channels: 3, background: '#888' } })
      .composite(tiles.map((input, i) => ({ input, left: (i % 4) * w, top: Math.floor(i / 4) * h })))
      .png()
      .toFile(`${OUT}/strip.png`);
    say(`strip: ${OUT}/strip.png (${TS.join(', ')})`);
  }
  if (has('crop')) {
    // 2x, about the clock, where the arms and the wound-up room are both in the frame
    await sharp(shots.get(6))
      .extract({ left: 340, top: 40, width: 600, height: 400 })
      .resize(1200, 800, { kernel: 'nearest' })
      .png()
      .toFile(`${OUT}/crop-t6-2x.png`);
    say(`crop: ${OUT}/crop-t6-2x.png (2x of 600x400 at 340,40 of the t=6 frame)`);
  }
}

// ── the phone ─────────────────────────────────────────────────────────────────────────────────
if (has('phone')) {
  const { page, errors } = await open(390, 760, `vortex=6&${FREEZE}`);
  await page.waitForTimeout(900);
  const box = await page.evaluate(() => window.__theatre.pieces.props.vortex.tapBox());
  await page.screenshot({ path: `${OUT}/phone-t6.png` });
  say(`phone 390x760 t=6: tapBox ${box ? `${box.w.toFixed(0)}x${box.h.toFixed(0)} at ${box.x.toFixed(0)},${box.y.toFixed(0)}${box.grown ? ' (grown to the thumb)' : ''}` : 'none'}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await page.close();
}

// ── what the pass costs ───────────────────────────────────────────────────────────────────────
if (has('cost')) {
  const { page, errors } = await open(1280, 800, `now=10:10`);
  await page.waitForTimeout(600);
  const cost = await page.evaluate(async () => {
    const ctx = window.__theatre, ink = ctx.pieces.ink, v = ink.vortex;
    const gl = ctx.renderer.getContext();
    const px = new Uint8Array(4);
    // gl.finish() returns before the GPU process has drawn anything and reports 2.6 ms for a
    // pipeline that cannot run in 2.6 ms; a 1-px readPixels is synchronous and is the only honest
    // stopwatch here. Its own cost is in both numbers, so the difference is still the pass.
    const one = () => {
      const t0 = performance.now();
      ink.render(ctx);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return performance.now() - t0;
    };
    // the pass at its most expensive: the reach past the corners, the gather at full stretch, four
    // arms — which is the frame at t ≈ 9
    const ON = { active: true, centre: [0.5, 0.69], reach: 1400, twist: 3.3, pull: 1.8, twistFall: 1.8, pullFall: 1.9, gather: 3.2, arms: 1, armCount: 4, armTurns: 1.25, armReach: 830, armPhase: 3.1 };
    const was = { ...v, centre: [...v.centre] };
    // A/B/A/B, not all of A then all of B: the machine's own load drifts by 3 ms over a few seconds
    // and a block measurement charges that drift to whichever half it fell in.
    const idles = [], ons = [];
    for (let i = 0; i < 45; i++) {
      v.active = false;
      const a = one();
      Object.assign(v, ON);
      const b = one();
      if (i >= 5) { idles.push(a); ons.push(b); }
    }
    Object.assign(v, was);
    v.active = false;
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return { idle: med(idles), on: med(ons), n: ons.length, dpr: ctx.renderer.getPixelRatio(), w: ctx.size.w, h: ctx.size.h, gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
  });
  say(`cost (${cost.gpu}, ${cost.w}x${cost.h} dpr ${cost.dpr}): ink.render idle ${cost.idle.toFixed(1)} ms/frame, with the vortex ${cost.on.toFixed(1)} ms/frame (medians of ${cost.n} interleaved pairs) — the pass costs ${(cost.on - cost.idle).toFixed(1)} ms (${(((cost.on - cost.idle) / cost.idle) * 100).toFixed(1)}%)${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await page.close();
}

// ── a real click, the phases, the escapement ──────────────────────────────────────────────────
if (has('click')) {
  const { page, errors } = await open(1280, 800, `now=10:10`);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.__eggPhases = [];
    window.__theatre.on('props:vortex', (d) => window.__eggPhases.push({ ...d, at: performance.now() }));
    // the escapement without a speaker: the rate the sound piece is being told to run at
    window.__eggRates = [];
    const s = window.__theatre.pieces.sound;
    if (s && s.setTickRate) {
      const real = s.setTickRate.bind(s);
      s.setTickRate = (r) => { window.__eggRates.push(+r.toFixed(2)); return real(r); };
    }
  });
  const before = await page.evaluate(() => {
    const b = window.__theatre.pieces.props.vortex.hitBox();
    const glass = window.__theatre.renderer.domElement.getBoundingClientRect();
    return { b, glass: { x: glass.x, y: glass.y }, cursor: window.__theatre.renderer.domElement.style.cursor };
  });
  const cx = before.glass.x + before.b.x + before.b.w / 2;
  const cy = before.glass.y + before.b.y + before.b.h / 2;
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(200);
  const hovering = await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor, sw: window.__theatre.pieces.props.switches.hovered }));
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(120);
  const started = await page.evaluate(() => ({ active: window.__theatre.pieces.props.vortex.active, t: window.__theatre.pieces.props.vortex.t }));
  // a second click while it runs must do nothing
  await page.waitForTimeout(1500);
  const t1 = await page.evaluate(() => window.__theatre.pieces.props.vortex.t);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(60);
  const t2 = await page.evaluate(() => ({ t: window.__theatre.pieces.props.vortex.t, cursor: window.__theatre.renderer.domElement.style.cursor }));
  const mid = await page.evaluate(() => ({ pass: window.__theatre.pieces.ink.vortex.active, rate: window.__theatre.pieces.sound?.tickRate ?? null }));
  // ON TWOS, LIKE EVERYTHING ELSE: sample the twist on every animation frame for two seconds and
  // count how many DIFFERENT values it took. A twist that glided would show one per rendered frame.
  const steps = await page.evaluate(() => new Promise((res) => {
    const seen = [], v = window.__theatre.pieces.ink.vortex;
    let frames = 0;
    const t0 = performance.now();
    const tick = () => {
      frames++;
      seen.push(v.twist);
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else res({ frames, distinct: new Set(seen.map((x) => x.toFixed(6))).size, secs: (performance.now() - t0) / 1000 });
    };
    requestAnimationFrame(tick);
  }));
  say(`click: on twos — the twist took ${steps.distinct} values over ${steps.frames} rendered frames in ${steps.secs.toFixed(2)} s (${(steps.distinct / steps.secs).toFixed(1)} a second against the clock's 12 and the screen's ${(steps.frames / steps.secs).toFixed(0)})`);
  // watch it out
  const seen = [];
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(400);
    seen.push(await page.evaluate(() => ({ t: +window.__theatre.pieces.props.vortex.t.toFixed(2), pass: window.__theatre.pieces.ink.vortex.active, rate: +(window.__theatre.pieces.sound?.tickRate ?? 1).toFixed(2) })));
    if (!seen[seen.length - 1].pass && seen.length > 6) break;
  }
  const end = await page.evaluate(() => ({
    active: window.__theatre.pieces.props.vortex.active,
    pass: window.__theatre.pieces.ink.vortex.active,
    rate: window.__theatre.pieces.sound?.tickRate ?? null,
    phases: window.__eggPhases.map((p) => `${p.phase}@${p.t.toFixed(2)}s`),
    rates: window.__eggRates,
    cursor: window.__theatre.renderer.domElement.style.cursor,
  }));
  say(`click: hover cursor "${hovering.cursor}" (switch "${hovering.sw}"), dial box ${before.b.w.toFixed(0)}x${before.b.h.toFixed(0)} at ${before.b.x.toFixed(0)},${before.b.y.toFixed(0)}`);
  say(`click: started=${started.active} at t=${started.t.toFixed(2)}; the pass is on mid-run (${mid.pass}); a second click at t=${t1.toFixed(2)} left t=${t2.t.toFixed(2)} (no restart) and the cursor "${t2.cursor}"`);
  say(`click: phases ${end.phases.join(' → ')}`);
  say(`click: escapement ${Math.min(...end.rates).toFixed(2)} → ${Math.max(...end.rates).toFixed(2)} ticks/s, home at ${end.rate}; ${end.rates.length} rate changes`);
  say(`click: ended active=${end.active} pass=${end.pass} cursor "${end.cursor}"${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  say(`click: watched ${seen.map((s) => `${s.t}${s.pass ? '*' : ''}`).join(' ')}`);
  await page.close();
}

// ── the evening as a visitor gets it: no ?shot=1, flow running, sound unlocked ─────────────────
if (has('live')) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/@vite/client', viteStub);
  await page.goto(`${BASE}/?now=10:10`, { waitUntil: 'load', timeout: 60000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(200);
  }
  // Let the visitor get INSIDE. While the entrance runs, its own canvas (#entrance) is over the
  // stage — the door plate, the walk in — and it takes the pointer, correctly: there is no clock to
  // click while you are still on the step. Wait for the room, do not guess at it.
  // the visitor's own first click, at the door — entrance.js takes it and lets them in
  await page.waitForTimeout(1500);
  await page.mouse.click(640, 400);
  const inside = Date.now();
  while (Date.now() - inside < 60000) {
    const at = await page.evaluate(() => {
      const g = window.__theatre.renderer.domElement.getBoundingClientRect();
      const b = window.__theatre.pieces.props.vortex.hitBox();
      const el = document.elementFromPoint(g.x + b.x + b.w / 2, g.y + b.y + b.h / 2);
      return el === window.__theatre.renderer.domElement;
    }).catch(() => false);
    if (at) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => {
    const b = window.__theatre.pieces.props.vortex.hitBox();
    const g = window.__theatre.renderer.domElement.getBoundingClientRect();
    const el = document.elementFromPoint(g.x + b.x + b.w / 2, g.y + b.y + b.h / 2);
    return { b, g: { x: g.x, y: g.y }, on: el ? `${el.tagName}#${el.id || ''}` : 'nothing', cam: window.__theatre.pieces.camera?.current ?? null };
  });
  await page.mouse.click(before.g.x + before.b.x + before.b.w / 2, before.g.y + before.b.y + before.b.h / 2);
  await page.waitForTimeout(6200); // let it get to the middle of the ten seconds before looking
  const during = await page.evaluate(() => {
    // the placard is DOM and above the canvas: whatever it was doing, it is still doing it
    const dlg = document.getElementById('dialogue');
    let card = null;
    for (const el of dlg ? dlg.querySelectorAll('*') : []) {
      const r = el.getBoundingClientRect();
      if (r.width > 60 && r.height > 20 && el.textContent.trim()) card = { el, r };
    }
    return {
      t: window.__theatre.pieces.props.vortex.t,
      pass: window.__theatre.pieces.ink.vortex.active,
      placard: card ? { x: Math.round(card.r.x), y: Math.round(card.r.y), w: Math.round(card.r.width), h: Math.round(card.r.height) } : null,
      text: (card ? card.el.textContent : '').trim().replace(/\s+/g, ' ').slice(0, 70),
    };
  });
  await page.screenshot({ path: `${OUT}/live-mid.png` });
  say(`live: at the dial, ${before.on}, camera ${before.cam}, box ${before.b.w.toFixed(0)}x${before.b.h.toFixed(0)} at ${before.b.x.toFixed(0)},${before.b.y.toFixed(0)}`);
  say(`live: clicked the dial in a running evening — t=${during.t.toFixed(2)}, pass=${during.pass}, placard ${during.placard ? `${during.placard.w}x${during.placard.h} at ${during.placard.x},${during.placard.y}` : 'none'} reading "${during.text}"`);
  say(`live: ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}`);
  await page.close();
}

await browser.close();
writeFileSync(`${OUT}/proof.txt`, log.join('\n') + '\n');
console.log('\nwrote', OUT);
