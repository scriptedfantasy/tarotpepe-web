#!/usr/bin/env node
// THE RADIO, DRIVEN LIKE A VISITOR (props round 8).
//
// Measures the set's box on the glass in every shot that shows it and at every window the film is
// judged at; then puts a real pointer on it and clicks it four times, asking the sound piece after
// each click what it is playing. Nothing here reads the props piece's own idea of what it did —
// the question is always what `sound.tune` says.
//
//   node tools/_props-r8-radio.mjs               # measure + drive
//   node tools/_props-r8-radio.mjs 390 760       # one window
import { chromium } from 'playwright';

const only = process.argv.slice(2).map(Number).filter(Number.isFinite);
const WINDOWS = only.length === 2 ? [only] : [[1600, 900], [390, 760], [360, 800]];
const SHOTS = ['wide', 'home'];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;',
  });

// ---- 1. the box a thumb has to hit, in every window ----------------------------------------------
for (const [W, H] of WINDOWS) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  await page.route('**/@vite/client', stub);
  await page.goto('http://127.0.0.1:5173/?view=props&state=default&shot=1', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  for (const shot of SHOTS) {
    const m = await page.evaluate((s) => {
      window.__theatre.pieces.camera.cut(s);
      const r = window.__theatre.pieces.props.radio;
      return { hit: r.hitBox(), tap: r.tapBox() };
    }, shot);
    const b = m.hit, t = m.tap;
    if (!b) { console.log(`${W}x${H} ${shot}: no radio`); continue; }
    console.log(
      `${String(W + 'x' + H).padEnd(9)} ${shot.padEnd(5)}  set ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
        `   tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? '  (GROWN: the margin is the target)' : '  (the set itself)'}`,
    );
  }
  await page.close();
}

// ---- 2. a real pointer, four clicks, and what the sound piece says --------------------------------
{
  const [W, H] = [1600, 900];
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  await page.route('**/@vite/client', stub);
  // ?view=props runs the room without the flow, and WITHOUT ?shot=1 the sound piece is live
  await page.goto('http://127.0.0.1:5173/?view=props&state=default', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.evaluate(() => {
    window.__radio = [];
    window.__theatre.on('props:radio', (d) => window.__radio.push(d));
    window.__theatre.pieces.camera.cut('home');
  });
  await page.waitForTimeout(800);

  const read = () =>
    page.evaluate(() => {
      const s = window.__theatre.pieces.sound;
      const p = window.__theatre.pieces.props.radio;
      return {
        tune: s.tune?.id ?? null,
        playing: s.tune?.playing ?? false,
        running: s.running,
        station: p.station,
        needle: +window.__theatre.scene.getObjectByName('radio').userData.needle.position.x.toFixed(4),
        knob: +window.__theatre.scene.getObjectByName('radio').userData.knob.rotation.z.toFixed(3),
        cues: s.timeline.slice(-3).map((t) => t.name),
      };
    });

  console.log('\nbefore a finger goes near it   ', JSON.stringify(await read()));
  const box = await page.evaluate(() => window.__theatre.pieces.props.radio.tapBox());
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  console.log(`the target on the glass        x ${cx.toFixed(0)} y ${cy.toFixed(0)}  (${box.w.toFixed(0)} x ${box.h.toFixed(0)} px)`);

  await page.mouse.move(cx, cy);
  await page.waitForTimeout(500);
  console.log('under the pointer              ', JSON.stringify(await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor, knob: +window.__theatre.scene.getObjectByName('radio').userData.knob.rotation.z.toFixed(3) }))));

  for (let i = 1; i <= 5; i++) {
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(2600);
    console.log(`click ${i}                        `, JSON.stringify(await read()));
  }
  // and a thumb, which is the phone
  await page.touchscreen.tap(cx, cy);
  await page.waitForTimeout(2600);
  console.log('a tap (touch, no hover)        ', JSON.stringify(await read()));
  console.log('props:radio events             ', JSON.stringify(await page.evaluate(() => window.__radio)));
  // the `t` key belongs to sound.js and the dial has to follow it
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('t');
    await page.waitForTimeout(2600);
    console.log(`the t key ${i + 1}                    `, JSON.stringify(await read()));
  }
  await page.close();
}

// ---- 3. ?tune= still says what it always said ----------------------------------------------------
for (const q of ['', '&tune=a', '&tune=c', '&tune=0', '&tune=nonsense']) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  await page.route('**/@vite/client', stub);
  await page.goto(`http://127.0.0.1:5173/?view=props&state=default${q}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => ({ station: window.__theatre.pieces.props.radio.station, tune: window.__theatre.pieces.sound.tune?.id ?? null }));
  await page.mouse.click(600, 600); // the visitor's first gesture, nowhere near the radio
  await page.waitForTimeout(2200);
  const after = await page.evaluate(() => ({
    station: window.__theatre.pieces.props.radio.station,
    tune: window.__theatre.pieces.sound.tune?.id ?? null,
    playing: window.__theatre.pieces.sound.tune?.playing ?? false,
    needle: +window.__theatre.scene.getObjectByName('radio').userData.needle.position.x.toFixed(4),
  }));
  console.log(`?${q.slice(1) || '(bare)'}`.padEnd(18), 'before the gesture', JSON.stringify(before), ' after', JSON.stringify(after));
  await page.close();
}

await browser.close();
