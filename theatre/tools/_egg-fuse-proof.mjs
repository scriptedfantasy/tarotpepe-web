#!/usr/bin/env node
// THE MAINS LEVER, DRIVEN LIKE A VISITOR (the egg in src/pieces/egg-fuse.js).
//
// Four frames at the home plate — the mains on, the mains out, and both of those with the one lamp
// that is not on the mains lit and out — a 2x crop of the box in each, and the phone frame. Then a
// real pointer is put on the box, hovered, and clicked twice; nothing here reads the piece's own
// idea of what happened: the questions are what `props:fuse` said, what the lighting piece calls
// its state, what the chandelier's intensity is, and which cue landed on the sound timeline.
//
//   BASE=http://127.0.0.1:8701/ node tools/_egg-fuse-proof.mjs [outdir]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const OUT = process.argv[2] ?? '/tmp/egg-fuse';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800];
const PHONE = [390, 844];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;',
  });
const open = async (w, h, q) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  p.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  await p.route('**/@vite/client', stub);
  await p.goto(new URL(q, BASE).toString(), { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  return p;
};
// what the room says about itself, asked of the lighting and sound pieces and not of the egg
const state = (p) =>
  p.evaluate(() => {
    const T = window.__theatre, L = T.pieces.lighting, F = T.pieces.props.fuse;
    const arm = T.scene.getObjectByName('fuse-lever')?.children.find((c) => c.type === 'Group');
    return {
      out: F.out,
      lever: arm ? (arm.rotation.x > 1 ? 'down' : 'up') : '?',
      lighting: L.state,
      chandelier: +(L.practicals.pendant.intensity ?? 0).toFixed(2),
      lamp: +(L.practicals.cat?.intensity ?? L.practicals.table.intensity ?? 0).toFixed(2),
      key: +L.key.intensity.toFixed(2),
      cues: (T.pieces.sound.timeline ?? []).slice(-3).map((c) => c.name),
    };
  });

// ---- 1. the four frames, and a 2x crop of the box in each -----------------------------------------
{
  const page = await open(...PLATE, '/?view=props&state=default&shot=1&now=21:12');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  // on / on-with-the-lamp-lit / out / out-with-the-lamp-out. The second is the control: with the
  // mains on, the one lamp that survives them changes nothing, because the day is doing the work.
  const shots = [
    ['on', 'default', 0],
    ['on-lit', 'default', 1],
    ['out', 'fuse-out', 0],
    ['out-dark', 'fuse-dark', 0],
  ];
  for (const [name, st, lampByHand] of shots) {
    await page.evaluate((s) => window.__theatre.pieces.props.setState(s), st);
    if (lampByHand) {
      await page.evaluate(() => {
        const p = window.__theatre.pieces.lighting.practicals;
        const s = p.cat ?? p.table;
        s.intensity = 3.4;
        s.distance = 3.0;
        s.visible = true;
      });
    }
    await page.waitForTimeout(900);
    const png = `${OUT}/fuse-${name}.png`;
    await page.screenshot({ path: png });
    const b = await page.evaluate(() => window.__theatre.pieces.props.fuse.hitBox());
    const pad = 90;
    const x = Math.max(0, Math.round(b.x - pad)), y = Math.max(0, Math.round(b.y - pad));
    const w = Math.min(PLATE[0] - x, Math.round(b.w + pad * 2)), h = Math.min(PLATE[1] - y, Math.round(b.h + pad * 2));
    await sharp(png).extract({ left: x, top: y, width: w, height: h }).resize(w * 2, h * 2, { kernel: 'nearest' }).toFile(`${OUT}/fuse-${name}-crop2x.png`);
    console.log(`${name.padEnd(9)} ${JSON.stringify(await state(page))}`);
    console.log(`          lever on the glass ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}  →  ${png}`);
  }
  // and the mains on again, so the pair is a pair
  await page.evaluate(() => window.__theatre.pieces.props.setState('default'));
  await page.close();
}

// ---- 2. is it in the picture on a phone? -----------------------------------------------------------
for (const [W, H] of [PLATE, PHONE, [1600, 900]]) {
  const page = await open(W, H, '/?view=props&state=default&shot=1&now=21:12');
  for (const cut of ['home', 'wide']) {
    const m = await page.evaluate((c) => {
      window.__theatre.pieces.camera.cut(c);
      const f = window.__theatre.pieces.props.fuse;
      return { hit: f.hitBox(), tap: f.tapBox() };
    }, cut);
    const b = m.hit, t = m.tap;
    const inside = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
    console.log(
      `${String(W + 'x' + H).padEnd(9)} ${cut.padEnd(5)} lever ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
        `  tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ' (the lever itself)'}  ${inside ? 'IN SHOT' : 'OUT OF FRAME'}`,
    );
  }
  if (W === 1600) {
    // the same two frames at the window the pieces are judged at, where the box is whole
    await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
    for (const [name, st] of [['on', 'default'], ['out', 'fuse-out']]) {
      await page.evaluate((s) => window.__theatre.pieces.props.setState(s), st);
      await page.waitForTimeout(900);
      const png = `${OUT}/fuse-1600-${name}.png`;
      await page.screenshot({ path: png });
      const b = await page.evaluate(() => window.__theatre.pieces.props.fuse.hitBox());
      const pad = 110;
      const x = Math.max(0, Math.round(b.x - pad)), y = Math.max(0, Math.round(b.y - pad));
      const w = Math.min(1600 - x, Math.round(b.w + pad * 2)), h = Math.min(900 - y, Math.round(b.h + pad * 2));
      await sharp(png).extract({ left: x, top: y, width: w, height: h }).resize(w * 2, h * 2, { kernel: 'nearest' }).toFile(`${OUT}/fuse-1600-${name}-crop2x.png`);
    }
    console.log(`          ${OUT}/fuse-1600-on.png · fuse-1600-out.png (+ -crop2x)`);
  }
  if (W === PHONE[0]) {
    await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/fuse-phone-on.png` });
    await page.evaluate(() => window.__theatre.pieces.props.setState('fuse-out'));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/fuse-phone-out.png` });
    console.log(`          ${OUT}/fuse-phone-on.png · fuse-phone-out.png`);
  }
  await page.close();
}

// ---- 3. a real pointer on the glass: hover, click, click ------------------------------------------
{
  // no ?shot=1, so the sound piece is live and the clack can be caught on its own timeline
  const page = await open(...PLATE, '/?view=props&state=default');
  await page.evaluate(() => {
    window.__fuse = [];
    window.__theatre.on('props:fuse', (d) => window.__fuse.push(d));
    window.__theatre.pieces.camera.cut('home');
  });
  await page.waitForTimeout(700);
  console.log('\nbefore a hand goes near it  ', JSON.stringify(await state(page)));
  const box = await page.evaluate(() => window.__theatre.pieces.props.fuse.tapBox());
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  console.log(`the target on the glass     x ${cx.toFixed(0)} y ${cy.toFixed(0)}  (${box.w.toFixed(0)} x ${box.h.toFixed(0)} px)`);
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(400);
  console.log('under the pointer           ', JSON.stringify(await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor }))));
  await page.mouse.move(cx - 300, cy);
  await page.waitForTimeout(400);
  console.log('and off it again            ', JSON.stringify(await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor || '(none)' }))));
  const events = () => page.evaluate(() => JSON.stringify(window.__fuse));
  // The lever throws on the next 12 fps drawing, but the render loop under software WebGL can stall
  // for seconds on a busy machine, so wait for the room to change rather than for a stopwatch.
  const settle = (n) => page.waitForFunction((k) => window.__fuse.length >= k, n, { timeout: 30000 });
  for (let i = 1; i <= 2; i++) {
    await page.mouse.move(cx, cy);
    await page.mouse.click(cx, cy);
    await settle(i);
    console.log(`click ${i}                     `, JSON.stringify(await state(page)), ' props:fuse so far', await events());
    await page.mouse.move(cx - 400, cy); // off it again, so the next click is a fresh approach
    await page.waitForTimeout(300);
  }
  // and a thumb, which is what a phone has
  await page.touchscreen.tap(cx, cy);
  await settle(3);
  console.log('a tap (touch, no hover)     ', JSON.stringify(await state(page)), ' props:fuse so far', await events());
  console.log('the whole sound timeline    ', JSON.stringify(await page.evaluate(() => (window.__theatre.pieces.sound.timeline ?? []).map((c) => c.name))));

  // ---- is it a CUT? Sample the handle and the room on EVERY drawn frame across a pull. If the
  // lever travelled, or if the room changed on a different drawing from the handle, there would be
  // a third pair in this list. There are two: the room before, and the room after.
  const strobe = await page.evaluate(async () => {
    const T = window.__theatre;
    const arm = T.scene.getObjectByName('fuse-lever').children.find((c) => c.type === 'Group');
    const seen = [];
    const look = () => `${arm.rotation.x > 1 ? 'down' : 'up'} + ${T.pieces.lighting.state}`;
    const first = look();
    const t0 = performance.now();
    T.pieces.props.fuse.pull();
    while (performance.now() - t0 < 6000) {
      seen.push([look(), T.clock.frame]);
      if (seen.length > 6 && seen[seen.length - 1][0] !== first) break;
      await new Promise((r) => requestAnimationFrame(r));
    }
    const drawings = [...new Set(seen.map((s) => s[0]))];
    const at = seen.findIndex((s) => s[0] !== first);
    return { drawings, drawingsBetween: drawings.length - 2, frameOfPull: seen[0][1], frameOfCut: at < 0 ? null : seen[at][1] };
  });
  console.log('the pull, drawing by drawing', JSON.stringify(strobe));
  await page.close();
}

await browser.close();
