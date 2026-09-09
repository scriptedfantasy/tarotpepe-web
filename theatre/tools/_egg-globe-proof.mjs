#!/usr/bin/env node
// THE GLOBE, DRIVEN LIKE A VISITOR (egg-globe).
//
// Six things, in order:
//   1. the sphere's box on the glass, in every shot and window the film is judged at
//   2. three stills at the home plate — at rest, mid-spin (a 2x crop of the map), stopped
//   3. a phone frame, with its framing measured
//   4. a REAL pointer: a drag across the sphere, and then a tap, both on the glass
//   5. the country for three seeds, twice each, to show it is the seed and not the weather
//   6. the whole road, on a server with PEPE_FAKE: the event, the `globe` beat on the wire with
//      the country in it, his line up on the placard, and the field open under it
//
//   BASE=http://127.0.0.1:8704 FAKE=http://127.0.0.1:8744 node tools/_egg-globe-proof.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { situation } from '../server/pepe.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:5173';
const FAKE = process.env.FAKE || BASE;
const OUT = process.env.OUT || '/tmp/egg-globe';
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
async function open(url, { width, height, dpr = 1 }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true });
  page.on('pageerror', (e) => console.log('  PAGE ERROR', String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && console.log('  CONSOLE ERROR', m.text().slice(0, 300)));
  await page.route('**/@vite/client', stub);
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  return page;
}
const num = (n, d = 1) => (n == null ? '—' : (+n).toFixed(d));

// ---- 1. the box a hand has to hit ---------------------------------------------------------------
console.log('=== 1. the sphere on the glass ===');
for (const [W, H] of [[1600, 900], [1280, 800], [390, 760], [360, 800]]) {
  const page = await open(`${BASE}/?view=props&state=default&shot=1`, { width: W, height: H });
  for (const shot of ['wide', 'home']) {
    const m = await page.evaluate((s) => {
      window.__theatre.pieces.camera.cut(s);
      const g = window.__theatre.pieces.props.globe;
      return { hit: g.hitBox(), tap: g.tapBox() };
    }, shot);
    const b = m.hit, t = m.tap;
    if (!b) { console.log(`${W}x${H} ${shot}: no globe`); continue; }
    const inFrame = b.x + b.w > 0 && b.x < W && b.y + b.h > 0 && b.y < H;
    console.log(
      `${String(W + 'x' + H).padEnd(9)} ${shot.padEnd(5)}  sphere ${num(b.w)} x ${num(b.h)} px at ${num(b.x, 0)},${num(b.y, 0)}` +
        `   thumb ${num(t.w, 0)} x ${num(t.h, 0)}${t.grown ? ' (GROWN)' : ' (the sphere itself)'}   ${inFrame ? 'IN FRAME' : 'OUT OF FRAME'}`,
    );
  }
  await page.close();
}

// ---- 2. three stills at the home plate ----------------------------------------------------------
console.log('\n=== 2. the home plate, 1280x800 ===');
{
  const page = await open(`${BASE}/?view=props&state=default&shot=1`, { width: 1280, height: 800, dpr: 2 });
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.waitForTimeout(600);
  const box = await page.evaluate(() => window.__theatre.pieces.props.globe.hitBox());
  const pad = 26;
  const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + pad * 2, height: box.h + pad * 2 };

  await page.screenshot({ path: `${OUT}/globe-rest.png`, timeout: 240000 });
  await page.screenshot({ path: `${OUT}/globe-rest-crop.png`, clip, timeout: 240000 });
  console.log(`at rest        ${OUT}/globe-rest.png  (crop ${num(clip.width, 0)}x${num(clip.height, 0)} css px at 2x)`);

  // mid-spin: the judging state, which pins a definite step of a definite throw
  await page.evaluate(() => window.__theatre.pieces.props.setState('globe-spinning'));
  await page.waitForTimeout(700);
  const spun = await page.evaluate(() => {
    const g = window.__theatre.pieces.props.globe;
    const s = window.__theatre.scene.getObjectByName('globe').children.find((c) => c.isMesh && c.geometry.type === 'SphereGeometry');
    return { spinning: g.spinning, y: +s.rotation.y.toFixed(3), z: +s.rotation.z.toFixed(3) };
  });
    await page.screenshot({ path: `${OUT}/globe-spinning-crop.png`, clip, timeout: 240000 });
  console.log(`mid-spin       ${OUT}/globe-spinning-crop.png  axis y ${spun.y} rad, cradle z ${spun.z} rad (rest is 0.400)`);

  // and stopped, with a real throw run to its end on the 12 fps clock
  const landed = await page.evaluate(async () => {
    const T = window.__theatre;
    T.pieces.props.setState('default');
    const g = T.pieces.props.globe;
    const seen = [];
    T.on('props:globe', (d) => seen.push(d));
    g.spin(0.55, 0.35);
    const t0 = Date.now();
    while (g.spinning && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 60));
    await new Promise((r) => setTimeout(r, 400));
    return { country: g.country, seen };
  });
  await page.screenshot({ path: `${OUT}/globe-stopped.png`, timeout: 240000 });
  await page.screenshot({ path: `${OUT}/globe-stopped-crop.png`, clip, timeout: 240000 });
  console.log(`stopped on     ${landed.country}   event: ${JSON.stringify(landed.seen)}`);
  console.log(`               ${OUT}/globe-stopped.png`);
  await page.close();
}

// ---- 3. the phone -------------------------------------------------------------------------------
console.log('\n=== 3. a phone, 390x760 ===');
{
  const page = await open(`${BASE}/?view=props&state=default&shot=1`, { width: 390, height: 760, dpr: 2 });
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.waitForTimeout(600);
  const b = await page.evaluate(() => ({ hit: window.__theatre.pieces.props.globe.hitBox(), tap: window.__theatre.pieces.props.globe.tapBox() }));
  const inFrame = b.hit.x + b.hit.w > 0 && b.hit.x < 390 && b.hit.y + b.hit.h > 0 && b.hit.y < 760;
  console.log(`sphere ${num(b.hit.w)} x ${num(b.hit.h)} px at ${num(b.hit.x, 0)},${num(b.hit.y, 0)}   thumb ${num(b.tap.w, 0)} x ${num(b.tap.h, 0)}   ${inFrame ? 'IN FRAME' : 'OUT OF FRAME'}`);
  await page.evaluate(() => window.__theatre.pieces.props.setState('globe-spinning'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/globe-phone.png`, timeout: 240000 });
  console.log(`${OUT}/globe-phone.png`);
  await page.close();
}

// ---- 4. a real pointer: a drag, and a tap -------------------------------------------------------
console.log('\n=== 4. a hand on the glass ===');
{
  const page = await open(`${BASE}/?view=props&state=default`, { width: 1280, height: 800 });
  await page.evaluate(() => {
    window.__globe = [];
    window.__theatre.on('props:globe', (d) => window.__globe.push(d));
    window.__theatre.pieces.camera.cut('home');
  });
  await page.waitForTimeout(700);
  const t = await page.evaluate(() => window.__theatre.pieces.props.globe.tapBox());
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
  console.log(`the target on the glass  x ${num(cx, 0)} y ${num(cy, 0)}  (${num(t.w, 0)} x ${num(t.h, 0)} px)`);

  await page.mouse.move(cx, cy);
  await page.waitForTimeout(300);
  console.log('under the pointer        ', JSON.stringify(await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor }))));

  // a drag: 90 px east and 30 px north, in six steps, like a thumb
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(cx + (90 * i) / 6, cy - (30 * i) / 6);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  const drag = await page.evaluate(async () => {
    const g = window.__theatre.pieces.props.globe;
    const spinningAtOnce = g.spinning;
    const t0 = Date.now();
    while (g.spinning && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 60));
    const secs = (Date.now() - t0) / 1000;
    await new Promise((r) => setTimeout(r, 400));
    return { spinningAtOnce, secs: +secs.toFixed(2), country: g.country, events: window.__globe.length };
  });
  console.log(`a drag (90 px east, 30 north)  spun at once ${drag.spinningAtOnce}, ran ${drag.secs}s, stopped on ${drag.country}`);

  // and a tap, which is the phone's whole gesture
  await page.touchscreen.tap(cx, cy);
  const tap = await page.evaluate(async () => {
    const g = window.__theatre.pieces.props.globe;
    const t0 = Date.now();
    while (g.spinning && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 60));
    await new Promise((r) => setTimeout(r, 400));
    return { country: g.country, events: window.__globe };
  });
  console.log(`a tap (touch, no hover)        stopped on ${tap.country}`);
  console.log('props:globe events             ', JSON.stringify(tap.events));

  // and a pointer nowhere near it does nothing
  await page.mouse.click(40, 40);
  await page.waitForTimeout(400);
  console.log('a click on bare wall           ', JSON.stringify(await page.evaluate(() => ({ spinning: window.__theatre.pieces.props.globe.spinning, events: window.__globe.length }))));
  await page.close();
}

// ---- 4b. the switchboard: the radio still answers and the globe declines its pixels ------------
console.log('\n=== 4b. the radio, beside it ===');
{
  const page = await open(`${BASE}/?view=props&state=default`, { width: 1600, height: 900 });
  await page.evaluate(() => {
    window.__globe = [];
    window.__theatre.on('props:globe', (d) => window.__globe.push(d));
    window.__theatre.pieces.camera.cut('home');
  });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => window.__theatre.pieces.props.radio.tapBox());
  const rx = r.x + r.w / 2, ry = r.y + r.h / 2;
  await page.mouse.move(rx, ry);
  await page.waitForTimeout(300);
  console.log('the pointer on the radio  ', JSON.stringify(await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor }))));
  await page.mouse.click(rx, ry);
  await page.waitForTimeout(2400);
  console.log('one click on the radio    ', JSON.stringify(await page.evaluate(() => ({
    station: window.__theatre.pieces.props.radio.station,
    tune: window.__theatre.pieces.sound.tune?.id ?? null,
    globeSpinning: window.__theatre.pieces.props.globe.spinning,
    globeEvents: window.__globe.length,
  }))));
  await page.close();
}

// ---- 5. the country, by seed --------------------------------------------------------------------
console.log('\n=== 5. the country for three seeds (a tap has no direction of its own) ===');
for (const seed of [1, 2, 3]) {
  const runs = [];
  for (const pass of [0, 1]) {
    const page = await open(`${BASE}/?view=props&state=default&shot=1&seed=${seed}`, { width: 800, height: 600 });
    const got = await page.evaluate(async () => {
      const g = window.__theatre.pieces.props.globe;
      const out = [];
      for (let i = 0; i < 3; i++) {
        g.spin(0);
        const t0 = Date.now();
        while (g.spinning && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 50));
        await new Promise((r) => setTimeout(r, 200));
        out.push(g.country);
      }
      return out;
    });
    runs.push(got);
    await page.close();
  }
  const same = JSON.stringify(runs[0]) === JSON.stringify(runs[1]);
  console.log(`seed=${seed}  ${runs[0].join(' · ')}   ${same ? 'same again on a second load' : 'DIFFERENT ON A SECOND LOAD'}`);
}

// ---- 6. the whole road, with PEPE_FAKE at the other end -----------------------------------------
console.log('\n=== 6. the beat on the wire (PEPE_FAKE) ===');
console.log('situation({beat:"globe", country:"Portugal"}):');
console.log('  ' + situation({ beat: 'globe', country: 'Portugal' }));
{
  const page = await open(`${FAKE}/`, { width: 1280, height: 800 });
  const posts = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/pepe')) {
      try {
        posts.push(JSON.parse(r.postData() ?? '{}'));
      } catch {}
    }
  });
  await page.evaluate(() => {
    window.__globe = [];
    window.__theatre.on('props:globe', (d) => window.__globe.push(d));
  });
  // the door
  await page.mouse.click(640, 400);
  // wait for the field to open under his greeting
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 90000 });
  const before = await page.evaluate(() => ({
    asking: window.__theatre.pieces.dialogue.asking,
    placard: document.querySelector('#dialogue .well')?.getAttribute('data-text') ?? (document.querySelector('#dialogue')?.innerText ?? '').trim().slice(0, 120),
  }));
  console.log(`the field is open before the spin: ${before.asking}`);
  const n0 = posts.length;

  // spin it — the same call the drag makes
  await page.evaluate(async () => {
    const g = window.__theatre.pieces.props.globe;
    g.spin(0.5, 0.35);
    const t0 = Date.now();
    while (g.spinning && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 60));
  });
  await page.waitForFunction(() => window.__globe.length > 0, null, { timeout: 40000 });
  const ev = (await page.evaluate(() => window.__globe))[0];
  console.log(`props:globe  ${JSON.stringify(ev)}`);
  // his line, then the field again
  await page.waitForTimeout(6000);
  const globePost = posts.slice(n0).find((p) => p.beat === 'globe');
  console.log(`the request   beat=${globePost?.beat ?? '(none)'}  country=${JSON.stringify(globePost?.country ?? null)}`);
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 60000 });
  const after = await page.evaluate(() => ({
    asking: window.__theatre.pieces.dialogue.asking,
    said: (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
    lines: window.__theatre.pieces.mind.history?.length ?? null,
  }));
  console.log(`his line on the placard: "${after.said}"`);
  console.log(`the field is open under it: ${after.asking}`);
  await page.screenshot({ path: `${OUT}/globe-said.png` });
  console.log(`${OUT}/globe-said.png`);
  await page.close();
}

// ---- 6b. spun again while he is talking: the country waits -------------------------------------
console.log('\n=== 6b. spun while he is talking ===');
{
  const page = await open(`${FAKE}/`, { width: 1280, height: 800 });
  await page.evaluate(() => {
    window.__globe = [];
    window.__theatre.on('props:globe', (d) => window.__globe.push(d));
  });
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 90000 });
  // the visitor writes a line and presses return: the field shuts and he begins to answer
  await page.evaluate(() => {
    const i = document.querySelector('#dialogue input.keys');
    i.value = 'good evening';
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  const trace = await page.evaluate(async () => {
    const T = window.__theatre;
    const g = T.pieces.props.globe;
    g.spin(0.5, 0.35);
    const seen = [];
    for (let i = 0; i < 600; i++) {
      seen.push({ ask: T.pieces.dialogue.asking, held: g.held, ev: window.__globe.length, spin: g.spinning, f: T.clock.frame });
      if (seen.length > 8 && window.__globe.length) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    return seen;
  });
  // The handing over SHUTS the field again — flow aborts the open ask to put his line up — so
  // "was the field open at the instant it fired" cannot be read from outside the event. What can:
  // how long the country sat in hand with the field shut, and how many samples the field had been
  // open for before it went. One 12 fps frame is 83 ms, so at 50 ms a sample the answer should be
  // one or two.
  const stopped = trace.findIndex((s) => s.held);
  const fired = trace.findIndex((s) => s.ev > 0);
  const held_ = stopped >= 0 && fired > stopped ? trace.slice(stopped, fired) : [];
  const shut = held_.filter((s) => !s.ask).length;
  const wasOpen = held_.filter((s) => s.ask).length;
  console.log(`it came to rest with the country in hand: ${stopped >= 0 ? `"${trace[stopped].held}"` : 'never came to rest'}`);
  console.log(`it sat in hand with the field SHUT for ${shut} samples of 50 ms (${(shut * 0.05).toFixed(2)} s), unsaid`);
  const opened = held_.findIndex((s) => s.ask);
  const frames = opened >= 0 && fired >= 0 ? trace[fired].f - held_[opened].f : null;
  console.log(`the field had been open for ${wasOpen} samples when it went — ${frames} frames of the 12 fps clock`);
  console.log(`props:globe ${JSON.stringify(await page.evaluate(() => window.__globe))}`);
  await page.close();
}

// ---- 7. and with no key at all, nothing is said --------------------------------------------------
console.log('\n=== 7. keyless: the globe just stops ===');
{
  const page = await open(`${BASE}/`, { width: 1280, height: 800 });
  await page.evaluate(() => {
    window.__globe = [];
    window.__theatre.on('props:globe', (d) => window.__globe.push(d));
  });
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => window.__theatre.pieces.dialogue.asking === true, null, { timeout: 90000 });
  const said0 = await page.evaluate(() => (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim());
  await page.evaluate(async () => {
    const g = window.__theatre.pieces.props.globe;
    g.spin(0.5, 0.35);
    const t0 = Date.now();
    while (g.spinning && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 60));
  });
  await page.waitForTimeout(5000);
  const out = await page.evaluate(() => ({
    events: window.__globe,
    asking: window.__theatre.pieces.dialogue.asking,
    said: (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim(),
    live: window.__theatre.pieces.mind.available,
  }));
  console.log(`mind.available ${out.live}   props:globe ${JSON.stringify(out.events)}`);
  console.log(`the placard is unchanged: ${out.said === said0}   the field is still open: ${out.asking}`);
  await page.close();
}

await browser.close();
