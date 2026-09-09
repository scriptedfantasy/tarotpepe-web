#!/usr/bin/env node
// THE NAKAMOTO CARD, DRIVEN LIKE A VISITOR (the egg in src/pieces/egg-nakamoto.js).
//
// The left frame on the back wall holds the first Rare Pepe, redrawn in the room's pen. Click the
// glass and green code runs down it for three seconds; when it has run out the bottom the card's
// RARENESS SCORE goes up by one, and the new number is still there on the next visit.
//
// Nothing here asks the piece whether it thinks it worked. It puts a real pointer on the frame's
// own projected box, clicks it, and asks five independent witnesses:
//
//   the DRAWING     a frame at the home plate, a 2x and 3x crop at the `pepe` plate, mid-rain, after
//   the STATE       props.nakamoto.score / .raining, and the rain plane's own visibility
//   the EVENT       what came out of ctx.emit('props:nakamoto', …) on the page's own bus
//   the SOUND       sound.timeline, which is what the audio graph was actually given, plus a stub
//                   laid over play() so a cue that never reached the graph is still caught
//   the MEMORY      a SECOND page in the same browser profile, reloaded: 98 has to still be there
//
// It also measures the two things the wall does to this frame: how much of it is behind the
// window's downstage shutter leaf (a third — which is why the card is mounted to the right of its
// mount), and whether the whole frame is in the picture on a 390 px phone (it is; the radio is not).
//
//   node tools/_egg-nakamoto-proof.mjs
//   node tools/_egg-nakamoto-proof.mjs --out /abs/dir
//   node tools/_egg-nakamoto-proof.mjs --sound      # render the blip offline and print its TRIM
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = (process.env.BASE ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const OUT = args.out ?? '/tmp/egg-nakamoto';
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

async function open(ctx, w, h, query = '') {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: h });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/?view=props&state=default${query}`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 240000 });
  await kick(page);
  page.__errors = errors;
  return page;
}

// THE KICK, and without it none of this measures anything. A headless page produces frames only
// while something asks the compositor for one: after the load settles, this browser stops calling
// requestAnimationFrame altogether, the theatre's loop stops with it, and update() is never called
// again — so a click is answered in state but the drawing never moves and the clock stands still.
// (Playwright's own raf polling does not restart it; a screenshot does, one frame at a time.) One
// CSS animation running for ever on a 1 px div keeps the frame pipeline turning, which is what a
// real browser on a real desk does anyway. It is injected by the TOOL and is no part of the page.
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
const context = () => browser.newContext({ viewport: { width: PLATE[0], height: PLATE[1] }, deviceScaleFactor: 1, hasTouch: true });

// PUT N DRAWINGS THROUGH THE LOOP. With the kick above running, the loop turns; this waits for the
// DRAWING to have advanced rather than for a stopwatch, which matters on a machine where a frame
// can take a second.
async function frames(page, n = 6) {
  const to = await page.evaluate((k) => window.__theatre.clock.frame + k, n);
  await page.waitForFunction((f) => window.__theatre.clock.frame >= f, to, { timeout: 120000, polling: 'raf' });
}
// A cut, and then the frame's own box: the camera is posed at once, and the drawing catches up on
// the next turn of the loop.
async function settled(page, shot) {
  await page.evaluate((s) => window.__theatre.pieces.camera.cut(s), shot);
  await frames(page, 6);
  return page.evaluate(() => window.__theatre.pieces.props.nakamoto.hitBox());
}

// a crop round a box on the glass, blown up with nearest so the pen is judged and not a resampler
async function crop(buf, box, out, { pad = 8, scale = 2 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.min(meta.width - left, Math.round(box.w + pad * 2));
  const height = Math.min(meta.height - top, Math.round(box.h + pad * 2));
  await sharp(buf).extract({ left, top, width, height }).resize({ width: width * scale, height: height * scale, kernel: 'nearest' }).png().toFile(out);
  return { left, top, width, height };
}

const fails = [];
const ok = (cond, line) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};

// ---- 1. the frame on the glass, in every window the film is judged at ------------------------------
console.log('\nTHE FRAME ON THE GLASS  ("in frame" means the whole box is inside the picture)');
{
  const c = await context();
  const page = await open(c, ...PLATE, '&shot=1');
  for (const [W, H] of [PLATE, [1600, 900], PHONE, [390, 760], [360, 800]]) {
    await page.setViewportSize({ width: W, height: H });
    await frames(page, 2); // a new window shape is a new set of frames; let the camera re-solve
    const m = await page.evaluate(() => {
      const t = window.__theatre;
      t.pieces.camera.cut('home');
      const n = t.pieces.props.nakamoto;
      return { box: n.hitBox(), tap: n.tapBox(), mount: n.mount };
    });
    const b = m.box, t = m.tap;
    const inFrame = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
    console.log(
      `  ${String(W + 'x' + H).padEnd(9)} frame ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
        `   tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ' (the frame itself)'}   ${inFrame ? 'IN FRAME' : 'NOT WHOLLY IN FRAME'}`,
    );
    if (W === PHONE[0] && H === PHONE[1]) ok(inFrame, 'the whole frame is inside a 390x844 phone picture');
    if (W === PLATE[0] && H === PLATE[1]) console.log(`  the card in its mount: ${m.mount.w} x ${m.mount.h} m, from x ${m.mount.left} to ${m.mount.right}`);
  }
  await page.close();
  await c.close();
}

// ---- 2. what the shutter takes ----------------------------------------------------------------------
console.log('\nTHE SHUTTER LEAF  (room.js folds the window\'s downstage leaf onto this wall)');
{
  const c = await context();
  const page = await open(c, ...PLATE, '&shot=1');
  const m = await page.evaluate(() => {
    const t = window.__theatre;
    t.pieces.camera.cut('home');
    t.camera.updateMatrixWorld(true);
    const THREE = t.THREE;
    const box = t.pieces.props.nakamoto.hitBox();
    const ray = new THREE.Raycaster();
    const W = window.innerWidth, H = window.innerHeight;
    const frame = t.scene.getObjectByName('nakamoto-frame');
    // walk across the frame and find the last column the shutter is still in front of
    // The frame's own left rim juts 28 mm off the wall and is struck at a graze even where the
    // leaf covers the sheet behind it, so the boundary is the LAST column the shutter still wins,
    // not the first the frame is seen at.
    let lastBlocked = null, cardHit = 0, n = 0;
    for (let i = 0; i <= 240; i++) {
      const px = box.x + 1 + ((box.w - 2) * i) / 240, py = box.y + box.h / 2;
      ray.setFromCamera(new THREE.Vector2((px / W) * 2 - 1, -(py / H) * 2 + 1), t.camera);
      const hit = ray.intersectObjects(t.scene.children, true)[0];
      const mine = hit && (hit.object === frame || frame.getObjectById(hit.object.id));
      n++;
      if (mine) cardHit++;
      else lastBlocked = px;
    }
    const firstClear = lastBlocked == null ? box.x : lastBlocked + (box.w - 2) / 240;
    // and where that boundary is on the wall, in metres
    const world = (px) => {
      ray.setFromCamera(new THREE.Vector2((px / W) * 2 - 1, -(box.y + box.h / 2) / H * 2 + 1), t.camera);
      const p = new THREE.Vector3();
      ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), t.layout.room.depth / 2 - 0.029), p);
      return +p.x.toFixed(4);
    };
    return { box, lastBlocked, firstClear, clear: cardHit / n, edgeX: firstClear == null ? null : world(firstClear), mount: t.pieces.props.nakamoto.mount };
  });
  console.log(`  the frame runs ${m.box.x.toFixed(0)} to ${(m.box.x + m.box.w).toFixed(0)} px; the shutter's edge crosses it at x = ${m.edgeX} m`);
  console.log(`  ${((1 - m.clear) * 100).toFixed(0)}% of the frame's width is behind the leaf — which is why the card is mounted right`);
  ok(m.mount.left >= m.edgeX - 0.002, `the card's left edge (${m.mount.left}) stands clear of the leaf (${m.edgeX})`);
  await page.close();
  await c.close();
}

// ---- 3. a real pointer on the frame: hover, click, three seconds of code, 97 → 98 --------------------
console.log('\nA POINTER ON THE FRAME  (1280x800, home; the sound piece is live — no ?shot=1)');
let afterScore = null;
{
  const c = await context();
  const page = await open(c, ...PLATE);
  await page.evaluate(() => {
    window.__nak = [];
    window.__theatre.on('props:nakamoto', (d) => window.__nak.push(d));
    const s = window.__theatre.pieces.sound;
    window.__cues = [];
    const real = s.play.bind(s);
    s.play = (name, opts) => {
      window.__cues.push(name);
      return real(name, opts);
    };
  });
  const box = await settled(page, 'home');
  const read = () =>
    page.evaluate(() => {
      const t = window.__theatre;
      const g = t.scene.getObjectByName('nakamoto-frame');
      const glass = g.children.find((o) => o.material?.alphaTest === 0.5);
      return {
        score: t.pieces.props.nakamoto.score,
        raining: t.pieces.props.nakamoto.raining,
        glass: !!glass?.visible,
        cursor: t.renderer.domElement.style.cursor || '(none)',
        cues: window.__cues.slice(),
        timeline: (t.pieces.sound.timeline ?? []).map((x) => x.name).slice(-4),
        events: window.__nak.slice(),
        played: t.pieces.sound.stats.played,
      };
    });
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  console.log(`  the frame's own box     x ${box.x.toFixed(0)} y ${box.y.toFixed(0)}  ${box.w.toFixed(0)} x ${box.h.toFixed(0)} px  →  clicking ${cx.toFixed(0)},${cy.toFixed(0)}`);

  const before = await read();
  console.log('  before                  ', JSON.stringify(before));
  ok(before.score === 97, 'a browser that has never seen the card opens on 97, which is what is printed on it');
  ok(before.glass === false && before.raining === false, 'nothing is running and the glass is empty');
  ok(before.cursor === '(none)', 'nothing announces it: no cursor before a pointer goes near it');

  // the frame at rest, at the home plate, and the `pepe` plate's crops
  const rest = await page.screenshot({ timeout: 120000 });
  await sharp(rest).png().toFile(`${OUT}/nakamoto-home.png`);
  await crop(rest, box, `${OUT}/nakamoto-home-2x.png`);

  await page.mouse.move(40, PLATE[1] - 40);
  await frames(page, 4);
  ok((await read()).cursor === '(none)', "the cursor is the page's own away from the frame");
  await page.mouse.move(cx, cy);
  await frames(page, 4);
  ok((await read()).cursor === 'pointer', 'hover over the frame makes the cursor a pointer, and that is the whole affordance');

  // ---- the click -----------------------------------------------------------------------------------
  await page.mouse.click(cx, cy);
  await page.waitForFunction(() => window.__theatre.pieces.props.nakamoto.raining, null, { timeout: 60000, polling: 'raf' });
  const mid = await read();
  console.log('  the moment it is clicked', JSON.stringify({ raining: mid.raining, glass: mid.glass, cues: mid.cues, score: mid.score }));
  ok(mid.raining === true && mid.glass === true, 'the code is on the glass');
  ok(mid.cues.includes('blip'), "the 'blip' cue was asked for");
  ok(mid.timeline.includes('blip'), "the 'blip' cue reached the audio graph (sound.timeline)");
  ok(mid.played > before.played, 'the sound piece counted it (stats.played)');
  ok(mid.score === 97, 'the score has not moved yet: the code runs first');

  await frames(page, 10); // ten drawings into the fall, which is where the code is halfway down
  const rain = await page.screenshot({ timeout: 120000 });
  await sharp(rain).png().toFile(`${OUT}/nakamoto-home-rain.png`);
  await crop(rain, box, `${OUT}/nakamoto-home-rain-2x.png`);

  // three seconds of it, and then the number
  await page.waitForFunction(() => !window.__theatre.pieces.props.nakamoto.raining, null, { timeout: 180000, polling: 'raf' });
  const after = await read();
  afterScore = after.score;
  console.log('  after the code has run  ', JSON.stringify({ score: after.score, glass: after.glass, events: after.events }));
  ok(after.score === 98, 'the RARENESS SCORE has ticked up by one, to 98');
  ok(after.glass === false, 'the glass is clear again');
  ok(after.events.length === 1 && after.events[0].score === 98, "ctx.emit('props:nakamoto', { score: 98 }) fired once");
  const done = await page.screenshot({ timeout: 120000 });
  await sharp(done).png().toFile(`${OUT}/nakamoto-home-98.png`);
  await crop(done, box, `${OUT}/nakamoto-home-98-2x.png`);

  // A THUMB, which is the phone — and a second touch while the code is still falling, which must
  // do nothing at all. The second one is asked for in the same breath as the first is read, with
  // no waiting in between: `raining` is checked and click() is called inside ONE evaluate, so the
  // run cannot have ended underneath the test on a slow machine.
  await page.touchscreen.tap(cx, cy);
  const during = await page.evaluate(() => {
    const n = window.__theatre.pieces.props.nakamoto;
    const was = n.raining;
    n.click(); // …and again, and again: none of these may start a second run
    n.click();
    return { was, still: n.raining };
  });
  console.log('  a tap, and two more during it', JSON.stringify(during));
  ok(during.was === true, 'a touch tap works with no hover in front of it');
  await page.waitForFunction(() => !window.__theatre.pieces.props.nakamoto.raining, null, { timeout: 180000, polling: 'raf' });
  const twice = await read();
  console.log('  when that run ended     ', JSON.stringify({ score: twice.score, events: twice.events.length }));
  ok(twice.score === 99, 'the tap ran the code once and the score is 99: the touches during the fall were not runs');
  ok(twice.events.length === 2, 'two runs, two events');

  console.log('  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors');

  // ---- 4. and the room remembers it ---------------------------------------------------------------
  // The same tab, reloaded: a second visit to the room, with nothing carried over but what was
  // written down. The piece is rebuilt from nothing and reads the number back off the browser.
  await page.reload({ waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  const kept = await page.evaluate(() => ({ score: window.__theatre.pieces.props.nakamoto.score, stored: window.localStorage.getItem('tarot-pepe.nakamoto.score') }));
  console.log('\nTHE MEMORY  (the same room, revisited)');
  console.log('  reloaded                ', JSON.stringify(kept));
  ok(kept.score === 99 && kept.stored === '99', 'the score a visitor left is the score the next visit opens on');
  await page.close();
  await c.close();
}

// ---- 5. the `pepe` plate, where the title is read ---------------------------------------------------
console.log('\nTHE PEPE PLATE  (2x and 3x crops of the frame; the title has to read here)');
{
  const c = await context();
  const page = await open(c, ...PLATE, `&shot=1`);
  for (const [state, tag] of [['default', 'rest'], ['nakamoto-rain', 'rain']]) {
    await page.evaluate((s) => window.__theatre.pieces.props.setState(s), state);
    const box = await settled(page, 'pepe');
    const buf = await page.screenshot({ timeout: 120000 });
    await sharp(buf).png().toFile(`${OUT}/nakamoto-pepe-${tag}.png`);
    await crop(buf, box, `${OUT}/nakamoto-pepe-${tag}-2x.png`, { scale: 2 });
    await crop(buf, box, `${OUT}/nakamoto-pepe-${tag}-3x.png`, { scale: 3 });
    console.log(`  ${tag.padEnd(5)} frame ${box.w.toFixed(0)} x ${box.h.toFixed(0)} px at ${box.x.toFixed(0)},${box.y.toFixed(0)}   ${page.__errors.length ? page.__errors : 'no errors'}`);
    ok(page.__errors.length === 0, `no page errors on the pepe plate (${state})`);
  }
  await page.close();
  await c.close();
}

// ---- 6. the phone ------------------------------------------------------------------------------------
console.log('\nTHE PHONE  (390x844, home; at rest, mid-fall, and the frame\'s share of the picture)');
{
  const c = await browser.newContext({ viewport: { width: PHONE[0], height: PHONE[1] }, deviceScaleFactor: 1, hasTouch: true });
  const page = await open(c, ...PHONE, '&shot=1');
  for (const [state, tag] of [['default', 'rest'], ['nakamoto-rain', 'rain']]) {
    await page.evaluate((s) => window.__theatre.pieces.props.setState(s), state);
    const box = await settled(page, 'home');
    const buf = await page.screenshot({ timeout: 120000 });
    await sharp(buf).png().toFile(`${OUT}/nakamoto-phone-${tag}.png`);
    await crop(buf, box, `${OUT}/nakamoto-phone-${tag}-2x.png`);
    console.log(`  ${tag.padEnd(5)} frame ${box.w.toFixed(0)} x ${box.h.toFixed(0)} px at ${box.x.toFixed(0)},${box.y.toFixed(0)}  (${((box.w / PHONE[0]) * 100).toFixed(0)}% of the short axis)`);
  }
  console.log('  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors on a phone');
  await page.close();
  await c.close();
}

// ---- 7. the cue, rendered offline --------------------------------------------------------------------
if (args.sound) {
  console.log('\nTHE BLIP, RENDERED  (through sound.render → OfflineAudioContext, as the probe does)');
  const c = await context();
  const page = await open(c, ...PLATE);
  const m = await page.evaluate(async () => {
    const s = window.__theatre.pieces.sound;
    const r = await s.render('blip', 0.4);
    let peak = 0, last = 0;
    for (let i = 0; i < r.l.length; i++) {
      const v = Math.abs(r.l[i]);
      if (v > peak) peak = v;
      if (v > 1e-4) last = i;
    }
    return { peak, seconds: last / r.sampleRate, level: s.levels?.blip ?? null, trim: s.trims?.blip ?? null };
  });
  const suggest = Math.round((m.trim ?? 1) * (m.level / m.peak) * 1000) / 1000;
  console.log(`  peak ${m.peak.toFixed(5)} against LEVEL ${m.level}   audible for ${m.seconds.toFixed(3)} s`);
  console.log(`  TRIM should be ${suggest} (it is ${m.trim})`);
  ok(Math.abs(m.peak / m.level - 1) < 0.08, 'the rendered blip is within 8% of the level it asks for');
  ok(m.seconds <= 0.09 + 0.02, 'it is over in ninety milliseconds, like a machine and not a bell');
  await page.close();
  await c.close();
}

await browser.close();
console.log(`\nframes in ${OUT}`);
console.log(fails.length ? `\n${fails.length} check(s) FAILED:\n  ${fails.join('\n  ')}` : '\nevery check holds');
process.exit(fails.length ? 1 : 0);
