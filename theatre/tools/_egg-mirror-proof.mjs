#!/usr/bin/env node
// THE MIRROR ON THE LEFT WALL, DRIVEN LIKE A VISITOR (egg-mirror.js).
//
// The round frame on the stage-left wall is a mirror. Click it and the reflection in the glass is
// one of five classic frogs, then plain glass again. This tool does not ask the props piece whether
// it thinks that worked. It puts a real pointer on the glass's own projected box, clicks it six
// times, and asks four independent witnesses:
//
//   the DRAWING   the material's own map, and a frame, and a 3x crop of the glass in each state
//   the EVENT     what came out of ctx.emit('props:mirror', …) on the page's own bus
//   the SOUND     sound.timeline, which is what the audio graph was actually given, plus a stub
//                 laid over play() so a cue that never reached the graph is still caught
//   PEPE          his own region of the frame, pixel by pixel, across all six states. He is
//                 protected: only the glass may change. The boil re-strikes every line at 12 fps,
//                 so the frames are taken under ?shot=1 at a pinned t, where the drawing is frozen.
//
// It also measures where the glass IS on the glass, in every window the film is judged at, and
// says plainly when the left wall is outside the picture.
//
//   BASE=http://127.0.0.1:8715/ node tools/_egg-mirror-proof.mjs
//   BASE=… node tools/_egg-mirror-proof.mjs --out /abs/dir
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const OUT = args.out ?? new URL('../public/progress/shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const PLATE = [1280, 800]; // the home plate the user looks at
const PHONE = [390, 844];
const FACES = ['glass', 'feels-good', 'sad', 'smug', 'angry', 'nu'];

// A BROWSER THAT COMES BACK. This machine carries several builders at once and the software-WebGL
// browser is the first thing the kernel reaps: two runs of this tool died on `browser.newPage:
// Target page, context or browser has been closed`. So the launch is a function and every page is
// opened through it.
const LAUNCH = {
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
};
let browser = await chromium.launch(LAUNCH);
const SHOT = { timeout: 120000 }; // 30 s is the default and 30 s is not enough at load 100
// …and a block of work is retried on a fresh browser when the old one is taken out from under it
// mid-screenshot, which is the other way this dies. Nothing here is stateful across a retry: every
// block opens its own page and reads what it needs off it.
async function attempt(what, fn, tries = 4) {
  for (let i = 1; ; i++) {
    const mark = fails.length;
    try {
      return await fn();
    } catch (e) {
      fails.length = mark; // a half-finished block's results are not results
      const msg = String(e && e.message ? e.message : e).split('\n')[0];
      if (i >= tries) throw e;
      console.log(`  ..  ${what}: ${msg} — retrying on a fresh browser (${i}/${tries - 1})`);
      try {
        await browser.close();
      } catch {}
      browser = await chromium.launch(LAUNCH);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  });

async function open(w, h, query = '') {
  let page;
  try {
    page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  } catch {
    browser = await chromium.launch(LAUNCH); // it was reaped; start another one and carry on
    page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}?view=props&state=default${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  page.__errors = errors;
  return page;
}

// a 3x crop round a box on the glass, so the pen can be judged at something like 1:1
async function crop(buf, box, { pad = 12, scale = 3 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.max(1, Math.min(meta.width - left, Math.round(box.w + pad * 2)));
  const height = Math.max(1, Math.min(meta.height - top, Math.round(box.h + pad * 2)));
  return sharp(buf).extract({ left, top, width, height }).resize({ width: width * scale, height: height * scale, kernel: 'nearest' }).png().toBuffer();
}

const fails = [];
const ok = (cond, line) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};

// ---- 1 and 2. ONE PAGE PER WINDOW, AND THE STRIP TAKEN FROM THE SAME PAGE -------------------------
// A page per window, because setViewportSize does NOT re-lay the room out: ctx.size is taken at
// build and every row came back identical when it was tried. So each window is its own load, and
// where a strip is wanted it is taken off that same page before it is closed — which is also why
// the strip is exactly the frame the row above it measured.
console.log('\nTHE MIRROR ON THE GLASS  ("in frame" means the whole disc is inside the picture)');
const STRIPS = new Set(['home 1280x800', 'home 1600x900', 'wide 1280x800', 'wide 1920x1080']);
for (const shot of ['home', 'wide']) {
  for (const [W, H] of [PLATE, [1600, 900], [1920, 1080], PHONE, [390, 760]]) {
    await attempt(`${shot} ${W}x${H}`, async () => {
    const page = await open(W, H, '&shot=1');
    const m = await page.evaluate((s) => {
      window.__theatre.pieces.camera.cut(s);
      const mi = window.__theatre.pieces.props.mirror;
      return { hit: mi.hitBox(), tap: mi.tapBox() };
    }, shot);
    const b = m.hit, t = m.tap;
    const inFrame = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
    const anyOf = b.x + b.w > 0 && b.x < W && b.y + b.h > 0 && b.y < H;
    console.log(
      `  ${shot.padEnd(5)} ${String(W + 'x' + H).padEnd(10)} glass ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
        `   tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ''}` +
        `   ${inFrame ? 'IN FRAME' : anyOf ? 'PART IN FRAME' : 'OUT OF FRAME'}`,
    );
    if (STRIPS.has(`${shot} ${W}x${H}`)) {
      const tiles = [];
      let box = null;
      for (const f of FACES) {
        box = await page.evaluate((face) => {
          window.__theatre.pieces.props.mirror.set(face);
          return window.__theatre.pieces.props.mirror.hitBox();
        }, f);
        await page.waitForTimeout(260);
        // page.screenshot, not locator('#stage').screenshot: the locator waits for the element to
        // be "stable" and on a loaded machine that wait never returns. The canvas fills the window.
        tiles.push(await crop(await page.screenshot(SHOT), box));
      }
      const meta = await sharp(tiles[0]).metadata();
      const out = `${OUT}/egg-mirror-strip-${shot}-${W}x${H}.png`;
      await sharp({ create: { width: (meta.width + 8) * tiles.length, height: meta.height, channels: 3, background: '#e8e8e2' } })
        .composite(tiles.map((input, i) => ({ input, left: i * (meta.width + 8), top: 0 })))
        .png()
        .toFile(out);
      console.log(`        strip at 3x → ${out}\n        (${FACES.join(' | ')})`);
      ok(page.__errors.length === 0, `no page errors walking all six faces at ${shot} ${W}x${H}`);
    }
    await page.close();
    });
  }
}

// ---- 3. a real pointer on the glass: hover, then six clicks round the cycle ------------------------
console.log('\nA POINTER ON THE MIRROR  (1280x800, the wide plate; the sound piece is live — no ?shot=1)');
await attempt('the pointer', async () => {
  const [W, H] = PLATE;
  const page = await open(W, H);
  await page.evaluate(() => {
    window.__mirror = [];
    window.__theatre.on('props:mirror', (d) => window.__mirror.push(d));
    const s = window.__theatre.pieces.sound;
    window.__cues = [];
    const real = s.play.bind(s);
    s.play = (name, opts) => {
      window.__cues.push(name);
      return real(name, opts);
    };
    window.__theatre.pieces.camera.cut('wide');
  });
  await page.waitForTimeout(900);

  const read = () =>
    page.evaluate(() => {
      const t = window.__theatre;
      const o = t.scene.getObjectByName('barometer');
      const face = o.children.find((c) => c.geometry?.type === 'CircleGeometry');
      return {
        face: t.pieces.props.mirror.face,
        drawn: o.userData.mirrorFace,
        colorful: face.material.userData.ink.colorful,
        bezel: o.children.filter((c) => c.isMesh && c !== face).every((c) => !!c.material.map),
        cursor: t.renderer.domElement.style.cursor || '(none)',
        cues: window.__cues.slice(),
        timeline: (t.pieces.sound.timeline ?? []).map((x) => x.name).slice(-3),
        events: window.__mirror.slice(),
        played: t.pieces.sound.stats.played,
      };
    });
  const settle = (want) =>
    page.waitForFunction((w) => window.__theatre.pieces.props.mirror.face === w && window.__theatre.scene.getObjectByName('barometer').userData.mirrorFace === w, want, { timeout: 20000 });

  const box = await page.evaluate(() => window.__theatre.pieces.props.mirror.hitBox());
  const tap = await page.evaluate(() => window.__theatre.pieces.props.mirror.tapBox());
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  console.log(`  the glass's own box     x ${box.x.toFixed(0)} y ${box.y.toFixed(0)}  ${box.w.toFixed(1)} x ${box.h.toFixed(1)} px  →  clicking ${cx.toFixed(0)},${cy.toFixed(0)}`);
  console.log(`  the box a thumb is given ${tap.w.toFixed(0)} x ${tap.h.toFixed(0)} px${tap.grown ? ' (GROWN to 44)' : ''}`);

  const before = await read();
  console.log('  before                  ', JSON.stringify({ face: before.face, cursor: before.cursor, colorful: before.colorful, bezel: before.bezel }));
  ok(before.face === 'glass', 'the mirror starts as plain glass, and nothing announced it');
  ok(before.cursor === '(none)', 'no cursor before a pointer goes near it');
  ok(before.colorful === true, "the glass is a `colorful` material: the pass shows the drawing verbatim");
  ok(before.bezel === true, 'the frame kept its geometry and went to solid ink');

  await page.mouse.move(40, H - 40);
  await page.waitForTimeout(280);
  ok((await read()).cursor === '(none)', "the cursor is the page's own away from the mirror");
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(420);
  ok((await read()).cursor === 'pointer', 'hover over the glass makes the cursor a pointer, and that is the whole affordance');

  console.log('\n  SIX CLICKS ROUND THE CYCLE');
  for (let i = 1; i <= 6; i++) {
    const want = FACES[i % FACES.length];
    await page.mouse.click(cx, cy);
    await settle(want);
    const r = await read();
    console.log(`   click ${i}  → ${String(r.face).padEnd(11)} event ${JSON.stringify(r.events[r.events.length - 1])}  cues ${r.cues.length}`);
    ok(r.face === want && r.drawn === want, `click ${i} puts '${want}' in the glass and the drawing says so`);
    ok(r.events.length === i && r.events[i - 1].face === want, `ctx.emit('props:mirror', { face: '${want}' }) fired once, on the drawing`);
    ok(r.cues.filter((c) => c === 'chink').length === i, `the 'chink' cue was asked for on click ${i}`);
    ok(r.timeline.includes('chink'), "the 'chink' cue reached the audio graph (sound.timeline)");
  }
  const done = await read();
  ok(done.face === 'glass', 'the sixth click brings it back to plain glass: it is a cycle, not a ladder');
  ok(done.played > before.played, 'the sound piece counted them (stats.played)');

  // a thumb, which is the phone
  await page.touchscreen.tap(cx, cy);
  await settle('feels-good');
  ok((await read()).face === 'feels-good', 'a touch tap works with no hover in front of it');

  // the switchboard is on the same wall: a click on the mirror must not reach it
  const plugged = await page.evaluate(() => window.__theatre.pieces.props.switchboard.plugged?.length ?? -1);
  ok(plugged === 0, 'a click on the mirror leaves the switchboard on the same wall alone');

  console.log('  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors');
  await page.close();
});

// ---- 4. PEPE IS PROTECTED ------------------------------------------------------------------------
// Frozen at a pinned t under ?shot=1, so the boil is not re-struck between frames, and compared
// pixel for pixel over his own projected box. ONE page, the face set between frames: six separate
// pages would have compared six separate strikes of the pen; this compares one strike to itself.
console.log('\nPEPE ACROSS THE SIX  (?shot=1&t=2, his own region, pixel for pixel)');
await attempt('pepe', async () => {
  const [W, H] = PLATE;
  const frames = [];
  const mirrorFrames = [];
  const p = await open(W, H, '&shot=1&t=2');
  await p.evaluate(() => window.__theatre.pieces.camera.cut('wide'));
  const pepeBox = await p.evaluate(() => {
    const t = window.__theatre;
    const THREE = t.THREE;
    const pe = t.scene.getObjectByName('pepe') ?? t.pieces.pepe?.group;
    const bb = new THREE.Box3().setFromObject(pe);
    const W2 = t.size.w, H2 = t.size.h;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
      v.set(x, y, z).project(t.camera);
      xs.push(((v.x + 1) / 2) * W2);
      ys.push(((1 - v.y) / 2) * H2);
    }
    return { x: Math.max(0, Math.floor(Math.min(...xs))), y: Math.max(0, Math.floor(Math.min(...ys))), w: Math.ceil(Math.max(...xs) - Math.min(...xs)), h: Math.ceil(Math.max(...ys) - Math.min(...ys)) };
  });
  const mbox = await p.evaluate(() => window.__theatre.pieces.props.mirror.hitBox());
  for (const f of FACES) {
    await p.evaluate((face) => window.__theatre.pieces.props.mirror.set(face), f);
    await p.waitForTimeout(360);
    const buf = await p.screenshot(SHOT);
    frames.push(await sharp(buf).extract({ left: pepeBox.x, top: pepeBox.y, width: pepeBox.w, height: pepeBox.h }).raw().toBuffer());
    mirrorFrames.push(
      await sharp(buf)
        .extract({ left: Math.max(0, Math.round(mbox.x)), top: Math.max(0, Math.round(mbox.y)), width: Math.round(mbox.w), height: Math.round(mbox.h) })
        .raw()
        .toBuffer(),
    );
  }
  await p.close();
  console.log(`  his box  ${pepeBox.w} x ${pepeBox.h} px at ${pepeBox.x},${pepeBox.y}  (${frames[0].length} bytes a frame)`);
  for (let i = 1; i < frames.length; i++) {
    let diff = 0;
    for (let k = 0; k < frames[0].length; k++) if (frames[0][k] !== frames[i][k]) diff++;
    ok(diff === 0, `Pepe is pixel-identical between 'glass' and '${FACES[i]}' (${diff} bytes differ)`);
  }
  // …and the same frames prove the test is not vacuous: the GLASS did change every time.
  for (let i = 1; i < mirrorFrames.length; i++) {
    let diff = 0;
    for (let k = 0; k < mirrorFrames[0].length; k++) if (mirrorFrames[0][k] !== mirrorFrames[i][k]) diff++;
    const pct = ((diff / mirrorFrames[0].length) * 100).toFixed(1);
    ok(diff > mirrorFrames[0].length * 0.05, `the glass itself DID change between 'glass' and '${FACES[i]}' (${pct}% of its bytes)`);
  }
});

// ---- 4b. THE CUE, RENDERED --------------------------------------------------------------------
// sound.js's own offline render, the same one tools/_sound-probe.mjs uses: the trim in
// sound-voices.js is what it takes to make the rendered peak match LEVEL, and this is where that
// number comes from. Also printed against the cue nearest it in the room, so a new cue cannot
// arrive louder than the pour or the switch it sits beside.
console.log('\nTHE CHINK, RENDERED  (sound.render, offline, 0.4 s)');
await attempt('the chink', async () => {
  const page = await open(900, 600);
  await page.mouse.click(600, 350); // the gesture the browser insists on
  await page.waitForTimeout(400);
  const m = await page.evaluate(async () => {
    const s = window.__theatre.pieces.sound;
    const peak = (r) => {
      let p = 0;
      for (const x of r.l) p = Math.max(p, Math.abs(x));
      return p;
    };
    // render() schedules the cue at t = 0.02, so that offset comes back off the length
    const secs = (r) => {
      let last = 0;
      for (let i = 0; i < r.l.length; i++) if (Math.abs(r.l[i]) > 2e-4) last = i;
      return Math.max(0, last / r.sampleRate - 0.02);
    };
    const out = {};
    for (const n of ['chink', 'glug', 'switch']) {
      const r = await s.render(n, 0.4);
      out[n] = { peak: +peak(r).toFixed(5), dur: +secs(r).toFixed(3) };
    }
    out.levels = { chink: s.levels.chink, glug: s.levels.glug, switch: s.levels.switch };
    out.trims = { chink: s.trims.chink };
    return out;
  });
  for (const n of ['chink', 'glug', 'switch']) console.log(`  ${n.padEnd(7)} peak ${m[n].peak}  audible for ${m[n].dur}s  (LEVEL ${m.levels[n]})`);
  const want = m.levels.chink;
  const suggest = ((m.trims.chink * want) / (m.chink.peak || 1e-9)).toFixed(3);
  console.log(`  the trim that makes the rendered peak match LEVEL: ${suggest}  (sound-voices.js TRIM.chink is ${m.trims.chink})`);
  ok(m.chink.dur <= 0.17, `the chink is over inside its LENGTH (0.16 s); measured ${m.chink.dur}s`);
  ok(m.chink.peak <= m.switch.peak * 1.35, 'the chink is no louder than the cat’s switch');
  await page.close();
});

// ---- 5. the phone, and whether the left wall is in the picture at all ------------------------------
console.log('\nTHE PHONE  (390x844)');
{
  const [W, H] = PHONE;
  for (const shot of ['home', 'wide']) await attempt(`phone ${shot}`, async () => {
    const page = await open(W, H, '&shot=1&mirror=smug');
    const b = await page.evaluate((s) => {
      window.__theatre.pieces.camera.cut(s);
      return window.__theatre.pieces.props.mirror.hitBox();
    }, shot);
    await page.waitForTimeout(400);
    await page.screenshot({ ...SHOT, path: `${OUT}/egg-mirror-phone-${shot}.png` });
    const anyOf = b.x + b.w > 0 && b.x < W;
    console.log(`  ${shot.padEnd(5)} glass at x ${b.x.toFixed(0)}..${(b.x + b.w).toFixed(0)}  →  ${anyOf ? 'in the picture' : 'OUT OF FRAME: the left wall is not in a portrait window'}`);
    await page.close();
  });
}

await browser.close();
console.log(`\nframes in ${OUT}`);
console.log(fails.length ? `\n${fails.length} check(s) FAILED:\n  ${fails.join('\n  ')}` : '\nevery check holds');
process.exit(fails.length ? 1 : 0);
