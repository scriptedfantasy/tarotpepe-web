#!/usr/bin/env node
// THE WEATHER, DRIVEN LIKE A VISITOR (the egg in src/pieces/egg-rain.js).
//
// Frames at the home plate of the dry room, of the rain starting, and of full rain; a 2x crop of the
// panes in each; the phone frame and what it can actually see of the window. Then a real pointer is
// put on the glass and clicked twice, and nothing here reads the piece's own idea of what happened:
// the questions are what `props:rain` said, what the lighting piece calls its state and what its key
// is worth, and whether the bed is running on the audio graph.
//
// Two measurements the eye cannot make:
//   THE SPILL. The same frame twice — rain off and rain on — with the LIGHT HELD, so the only thing
//   that can differ is the drawing of the weather. Every changed pixel is then counted inside the
//   four panes and outside them. Outside must be zero: a stroke on a shutter, on the architrave or
//   in the room is the one way this egg can be wrong and not look wrong.
//   THE PROTECTED SURFACES. Ink coverage in eight boxes — the panes, the back wall, a shutter, the
//   door, three patches of rug and Pepe — dry, half filled, full, and at EVENING, which is here only
//   as the scale: "one shade" has to be read against the shade the room already had. The room is
//   meant to move. The boards, the rug's printed field and the puppet are not.
//
//   BASE=http://127.0.0.1:8711/ node tools/_egg-rain-proof.mjs [outdir] [--sound]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith('--')) ?? '/tmp/egg-rain';
const SOUND = args.includes('--sound');
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800];
const PHONE = [390, 844];

const launch = () =>
  chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
  });
// software WebGL drawing this room can take a browser down after a dozen contexts; a proof that
// falls over on the eleventh page has proved nothing, so it simply starts another one
let browser = await launch();
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;',
  });
const open = async (w, h, q) => {
  if (!browser.isConnected()) browser = await launch();
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  // software WebGL on a busy machine draws a frame in seconds, and every screenshot waits for one
  p.setDefaultTimeout(180000);
  p.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  await p.route('**/@vite/client', stub);
  await p.goto(new URL(q, BASE).toString(), { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  return p;
};

// what the room says about itself, asked of the lighting and sound pieces and not of the egg
const state = (p) =>
  p.evaluate(() => {
    const T = window.__theatre, L = T.pieces.lighting, R = T.pieces.props.rain;
    return {
      on: R.on,
      layers: R.layers,
      lighting: L.state,
      key: +L.key.intensity.toFixed(2),
      pendant: +(L.practicals.pendant.intensity ?? 0).toFixed(2),
      nightPanes: !!L.night?.visible,
      sheets: T.scene.getObjectByName('rain')?.children.filter((c) => c.visible).length ?? 0,
      bed: T.pieces.props.rain.audible,
    };
  });

// the four panes on the glass, from the egg's own geometry — used for the crops and for the spill
const panes = (p) =>
  p.evaluate(() => {
    const T = window.__theatre, THREE = T.THREE;
    const root = T.scene.getObjectByName('rain');
    const W = window.innerWidth, H = window.innerHeight;
    const v = new THREE.Vector3();
    const seen = new Map();
    for (const m of root.children) {
      m.updateMatrixWorld(true);
      const g = m.geometry.parameters;
      const xs = [], ys = [];
      for (const dx of [-g.width / 2, g.width / 2])
        for (const dy of [-g.height / 2, g.height / 2]) {
          v.set(dx, dy, 0);
          m.localToWorld(v).project(T.camera);
          xs.push(((v.x + 1) / 2) * W);
          ys.push(((1 - v.y) / 2) * H);
        }
      const key = m.name.replace(/-\d+$/, '') + '|' + Math.round(Math.min(...ys));
      if (!seen.has(key)) seen.set(key, { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
    }
    return [...seen.values()];
  });

// This machine runs several builders' headless browsers at once and the load average is routinely
// over fifty; a software-WebGL frame can take minutes. Every screenshot is therefore patient and is
// tried three times before it is called a failure.
const snap = async (page, path) => {
  for (let i = 0; i < 3; i++) {
    try {
      await page.screenshot({ path, timeout: 240000 });
      return path;
    } catch (e) {
      console.log(`   (the frame did not arrive, try ${i + 1}/3: ${String(e).split('\n')[0]})`);
      await page.waitForTimeout(3000);
    }
  }
  throw new Error(`no frame for ${path}`);
};

const raw = async (png) => {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
};
// how much of a box is ink: the film's paper is #f8f9f4, so anything under 160 is a mark
const coverage = (img, b) => {
  let dark = 0, n = 0;
  const x0 = Math.max(0, Math.floor(b.x)), x1 = Math.min(img.w, Math.ceil(b.x + b.w));
  const y0 = Math.max(0, Math.floor(b.y)), y1 = Math.min(img.h, Math.ceil(b.y + b.h));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * img.w + x) * img.ch;
      const l = (img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11);
      if (l < 160) dark++;
      n++;
    }
  return n ? +(dark / n).toFixed(4) : 0;
};
const crop2x = async (png, boxes, out, pad = 26) => {
  const x = Math.max(0, Math.round(Math.min(...boxes.map((b) => b.x)) - pad));
  const y = Math.max(0, Math.round(Math.min(...boxes.map((b) => b.y)) - pad));
  const x1 = Math.round(Math.max(...boxes.map((b) => b.x + b.w)) + pad);
  const y1 = Math.round(Math.max(...boxes.map((b) => b.y + b.h)) + pad);
  const meta = await sharp(png).metadata();
  const w = Math.min(meta.width - x, x1 - x), h = Math.min(meta.height - y, y1 - y);
  await sharp(png).extract({ left: x, top: y, width: w, height: h }).resize(w * 2, h * 2, { kernel: 'nearest' }).toFile(out);
  return `${w}x${h}`;
};

// ---- 1. the frames, and the ramp counted in drawings ------------------------------------------------
let BOXES = null;
{
  // the clock frozen (?t=), so the four frames below are the same drawing of the room with only the
  // weather and the light between them — and so the half-filled frame HOLDS at one layer instead of
  // going on filling while the shutter is open
  const page = await open(...PLATE, '/?view=props&state=default&shot=1&t=3&now=16:20');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.waitForTimeout(400);
  BOXES = await panes(page);
  console.log('the four panes on the glass (home, 1280x800)');
  for (const b of BOXES) console.log(`   ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}`);
  // the boxes the coverage is measured in: the weather, and the four things it must not change
  const CHECK = await page.evaluate(() => {
    const T = window.__theatre, THREE = T.THREE;
    const W = window.innerWidth, H = window.innerHeight;
    const v = new THREE.Vector3();
    const at = (x, y, z) => { v.set(x, y, z).project(T.camera); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]; };
    const box = (a, b) => { const p = at(...a), q = at(...b); return { x: Math.min(p[0], q[0]), y: Math.min(p[1], q[1]), w: Math.abs(q[0] - p[0]), h: Math.abs(q[1] - p[1]) }; };
    return {
      'back wall': box([-0.5, 1.35, -2.5], [0.85, 1.8, -2.5]), // the bare plaster the insects sit on
      shutter: box([-1.05, 1.1, -2.46], [-0.6, 2.4, -2.46]), // the leaf folded flat beside the window
      door: box([1.1, 0.5, -2.5], [1.9, 2.05, -2.5]),
      'rug (plain)': box([-1.2, 0.001, 0.45], [0.2, 0.001, 1.15]), // its printed field, downstage of everything
      'rug (band)': box([-1.5, 0.001, -1.3], [-0.75, 0.001, -0.3]), // the hatched band along its upstage edge
      'rug (pool)': box([-0.5, 0.001, -0.2], [0.6, 0.001, 0.5]), // …and the shadow the table stands in
      boards: box([-2.0, 0.001, 1.75], [2.0, 0.001, 2.2]),
      pepe: box([-0.34, 0.95, -0.82], [0.34, 1.42, -0.82]),
    };
  });

  // dry · the fall half filled · full · and EVENING, which is not part of the egg and is here only
  // as the scale: "one shade" has to be read against the shade the room already had.
  const shots = [];
  for (const [name, how] of [
    ['dry', () => window.__theatre.pieces.props.setState('default')],
    ['starting', () => window.__theatre.pieces.props.rain.set(true, 1)], // the first drawing of the fall
    ['full', () => window.__theatre.pieces.props.setState('rain')],
    ['evening', () => { const T = window.__theatre; T.pieces.props.setState('default'); T.pieces.lighting.setState('evening'); }],
  ]) {
    await page.evaluate(how);
    await page.waitForTimeout(900);
    const png = `${OUT}/rain-${name}.png`;
    await snap(page, png);
    shots.push([name, png]);
    console.log(`${name.padEnd(9)} ${JSON.stringify(await state(page))}`);
    console.log(`          ${await crop2x(png, BOXES, `${OUT}/rain-${name}-panes2x.png`)} crop  ->  ${png}`);
  }
  // ---- what moved, and what was not allowed to -----------------------------------------------------
  const PANE = { x: Math.min(...BOXES.map((b) => b.x)), y: Math.min(...BOXES.map((b) => b.y)) };
  PANE.w = Math.max(...BOXES.map((b) => b.x + b.w)) - PANE.x;
  PANE.h = Math.max(...BOXES.map((b) => b.y + b.h)) - PANE.y;
  const imgs = [];
  for (const [name, png] of shots) imgs.push([name, await raw(png)]);
  console.log('\nink coverage, per cent of the box that is a mark');
  console.log(`   ${'box'.padEnd(11)}${shots.map(([n]) => n.padStart(9)).join('')}     rain - dry`);
  for (const [name, b] of Object.entries({ 'the panes': PANE, ...CHECK })) {
    const c = imgs.map(([, img]) => coverage(img, b) * 100);
    console.log(`   ${name.padEnd(11)}${c.map((v) => v.toFixed(2).padStart(9)).join('')}   ${c[2] > c[0] ? '+' : ''}${(c[2] - c[0]).toFixed(2)} pts`);
  }
  await page.close();
}

// ---- 2. THE SPILL: the light held, so only the weather can differ ------------------------------------
{
  // …with the CLOCK FROZEN (?t=), or the two frames could not be compared at all: the line boils, so
  // every stroke in the room is re-struck on every 12 fps drawing and a plain diff of two live frames
  // is the whole set.
  const page = await open(...PLATE, '/?view=props&state=default&shot=1&t=3&now=16:20');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.waitForTimeout(400);
  const boxes = await panes(page);
  await page.waitForTimeout(500);
  await snap(page, `${OUT}/spill-off.png`);
  // the sheets on, and the lighting piece put straight back to the state it was in: the ONLY thing
  // that can be different between these two frames is the drawing of the rain
  await page.evaluate(() => {
    const T = window.__theatre;
    T.pieces.props.rain.set(true);
    T.pieces.lighting.setState('default');
  });
  await page.waitForTimeout(900);
  await snap(page, `${OUT}/spill-on.png`);
  const A = await raw(`${OUT}/spill-off.png`), B = await raw(`${OUT}/spill-on.png`);
  const inPane = (x, y) => boxes.some((b) => x >= b.x - 1.5 && x <= b.x + b.w + 1.5 && y >= b.y - 1.5 && y <= b.y + b.h + 1.5);
  let inside = 0, outside = 0;
  const bb = [1e9, 1e9, -1e9, -1e9];
  for (let y = 0; y < A.h; y++)
    for (let x = 0; x < A.w; x++) {
      const i = (y * A.w + x) * A.ch;
      if (Math.abs(A.data[i] - B.data[i]) < 12 && Math.abs(A.data[i + 1] - B.data[i + 1]) < 12 && Math.abs(A.data[i + 2] - B.data[i + 2]) < 12) continue;
      if (inPane(x, y)) inside++;
      else {
        outside++;
        bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y);
      }
    }
  console.log(
    `\nthe spill test (clock frozen, light held): ${inside} px changed inside the panes, ${outside} outside` +
      (outside ? `  — all of it inside x ${bb[0]}..${bb[2]}, y ${bb[1]}..${bb[3]}` : '  — nothing on a shutter, an architrave or in the room'),
  );
  await page.close();
}

// ---- 3. is it in the picture, and how big is the target? --------------------------------------------
console.log('\nframing');
for (const [W, H] of [PLATE, [1600, 900], PHONE, [844, 390]]) {
  const page = await open(W, H, '/?view=props&state=default&shot=1');
  for (const cut of ['home', 'wide', 'door']) {
    const m = await page.evaluate((c) => {
      window.__theatre.pieces.camera.cut(c);
      const r = window.__theatre.pieces.props.rain;
      return { hit: r.hitBox(), tap: r.tapBox() };
    }, cut);
    if (!m.hit) {
      console.log(`   ${String(W + 'x' + H).padEnd(9)} ${cut.padEnd(5)} the window is behind the lens`);
      continue;
    }
    const b = m.hit, t = m.tap;
    const clipped = b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H;
    const gone = b.x + b.w <= 0 || b.x >= W || b.y + b.h <= 0 || b.y >= H;
    console.log(
      `   ${String(W + 'x' + H).padEnd(9)} ${cut.padEnd(5)} glass ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
        `  tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ' (the glass itself)'}  ${gone ? 'OUT OF FRAME' : clipped ? 'CLIPPED' : 'IN SHOT'}`,
    );
  }
  if (W === PHONE[0]) {
    // the phone held upright, dry and raining, so the framing claim can be checked by eye and not
    // only by the numbers above
    await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
    await page.evaluate(() => window.__theatre.pieces.props.setState('default'));
    await page.waitForTimeout(900);
    await snap(page, `${OUT}/rain-phone-dry.png`);
    await page.evaluate(() => window.__theatre.pieces.props.setState('rain'));
    await page.waitForTimeout(900);
    await snap(page, `${OUT}/rain-phone.png`);
    await page.evaluate(() => { window.__theatre.pieces.camera.cut('door'); window.__theatre.pieces.props.setState('rain'); });
    await page.waitForTimeout(900);
    await snap(page, `${OUT}/rain-phone-door.png`);
    console.log(`             ${OUT}/rain-phone-dry.png · rain-phone.png (home) · rain-phone-door.png (the opening shot)`);
  }
  if (W === 844) {
    // …and turned on its side, where the window is back in the picture
    await page.evaluate(() => { window.__theatre.pieces.camera.cut('home'); window.__theatre.pieces.props.setState('rain'); });
    await page.waitForTimeout(900);
    await snap(page, `${OUT}/rain-phone-landscape.png`);
    const b = await page.evaluate(() => window.__theatre.pieces.props.rain.hitBox());
    const pad = 40;
    const x = Math.max(0, Math.round(b.x - pad)), y = Math.max(0, Math.round(b.y - pad));
    const w = Math.min(844 - x, Math.round(b.w + pad * 2)), h = Math.min(390 - y, Math.round(b.h + pad * 2));
    await sharp(`${OUT}/rain-phone-landscape.png`).extract({ left: x, top: y, width: w, height: h }).resize(w * 3, h * 3, { kernel: 'nearest' }).toFile(`${OUT}/rain-phone-landscape-panes3x.png`);
    console.log(`             ${OUT}/rain-phone-landscape.png (+ -panes3x)`);
  }
  await page.close();
}

// ---- 4. a real pointer on the glass: hover, click, click ---------------------------------------------
{
  // no ?shot=1, so the sound piece is live and the bed can be caught on the audio graph
  const page = await open(...PLATE, '/?view=props&state=default');
  await page.evaluate(() => {
    window.__rain = [];
    window.__theatre.on('props:rain', (d) => window.__rain.push(d));
    window.__theatre.pieces.camera.cut('home');
  });
  await page.waitForTimeout(700);
  console.log('\nbefore a hand goes near it  ', JSON.stringify(await state(page)));
  const box = await page.evaluate(() => window.__theatre.pieces.props.rain.tapBox());
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  console.log(`the target on the glass     x ${cx.toFixed(0)} y ${cy.toFixed(0)}  (${box.w.toFixed(0)} x ${box.h.toFixed(0)} px)`);
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(400);
  console.log('under the pointer           ', JSON.stringify(await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor, switch: window.__theatre.pieces.props.switches.hovered }))));
  await page.mouse.move(cx, cy + 320); // down onto the cart under the window: whose switch is that?
  await page.waitForTimeout(400);
  console.log('a foot lower, on the cart   ', JSON.stringify(await page.evaluate(() => ({ switch: window.__theatre.pieces.props.switches.hovered || '(none)' }))));
  await page.mouse.move(cx + 520, cy);
  await page.waitForTimeout(400);
  console.log('and off it again            ', JSON.stringify(await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor || '(none)' }))));

  const events = () => page.evaluate(() => JSON.stringify(window.__rain));
  const settle = (n) => page.waitForFunction((k) => window.__rain.length >= k, n, { timeout: 40000 });
  // the ramp, counted in drawings rather than in milliseconds: the render loop under software WebGL
  // stalls for whole seconds, so the questions are how many layers and on which frame, not when
  await page.mouse.move(cx, cy);
  await page.mouse.click(cx, cy);
  await settle(1);
  console.log('click 1 (the fall begins)   ', JSON.stringify(await state(page)), ' props:rain', await events());
  const ramp = await page.evaluate(async () => {
    const T = window.__theatre, seen = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 20000) {
      const l = T.pieces.props.rain.layers;
      if (!seen.length || seen[seen.length - 1][0] !== l) seen.push([l, +T.clock.t.toFixed(2), T.clock.frame]);
      if (l >= T.pieces.props.rain.steps) break;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return seen;
  });
  console.log('the fall fills, layer by layer', JSON.stringify(ramp));
  await snap(page, `${OUT}/rain-live-full.png`);
  console.log(`       ${await crop2x(`${OUT}/rain-live-full.png`, BOXES, `${OUT}/rain-live-full-panes2x.png`)} crop  ->  ${OUT}/rain-live-full.png`);
  console.log('full                        ', JSON.stringify(await state(page)));

  await page.mouse.move(cx + 520, cy);
  await page.waitForTimeout(300);
  await page.mouse.move(cx, cy);
  await page.mouse.click(cx, cy);
  const fade = await page.evaluate(async () => {
    const T = window.__theatre, seen = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 20000) {
      const l = T.pieces.props.rain.layers;
      if (!seen.length || seen[seen.length - 1][0] !== l) seen.push([l, +T.clock.t.toFixed(2), T.clock.frame]);
      if (l === 0) break;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return seen;
  });
  await settle(2);
  console.log('click 2 (it thins and stops)', JSON.stringify(fade));
  console.log('after                       ', JSON.stringify(await state(page)), ' props:rain', await events());

  // and a thumb, which is what a phone has
  await page.touchscreen.tap(cx, cy);
  await settle(3);
  console.log('a tap (touch, no hover)     ', JSON.stringify(await state(page)), ' props:rain', await events());
  await page.evaluate(() => window.__theatre.pieces.props.rain.toggle(false));
  await settle(4);

  // ---- the bed, rendered through the very code the page runs ----------------------------------
  if (SOUND) {
    const m = await page.evaluate(async () => {
      const r = await window.__theatre.pieces.props.rain.render(2.0);
      if (!r) return null;
      const d = r.l;
      let peak = 0, sum = 0, zc = 0;
      // the first 0.15 s is the filters settling; measure the steady bed
      const from = Math.floor(r.sampleRate * 0.15);
      for (let i = from; i < d.length; i++) {
        peak = Math.max(peak, Math.abs(d[i]));
        sum += d[i] * d[i];
        if (i > from && (d[i] >= 0) !== (d[i - 1] >= 0)) zc++;
      }
      const n = d.length - from;
      return { peak, rms: Math.sqrt(sum / n), hz: (zc / 2) * (r.sampleRate / n), level: r.level, first: Math.abs(d[from]) };
    });
    if (m)
      console.log(
        `\nthe bed, rendered offline   peak ${m.peak.toFixed(5)}  rms ${m.rms.toFixed(5)}  zero-crossing rate ${m.hz.toFixed(0)} Hz` +
          `\n                            LEVEL.rain ${m.level}  ->  TRIM.rain should be ${(m.level / m.peak).toFixed(3)}` +
          `\n                            the room tone's own rendered peak is 0.009 — the bed is ${(m.peak / 0.009).toFixed(2)}x that`,
      );
  }
  await page.close();
}

await browser.close();
