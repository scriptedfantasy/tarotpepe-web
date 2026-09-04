#!/usr/bin/env node
// scratch: the handover between the drawn hand on the cloth and Pepe's own cut-out hand.
// Lays the fan with his hand waiting, then takes the 12 fps clock by hand and cuts the camera to
// `pepe` (and to `table` and back), shooting EVERY drawing of the withdrawal and the return and
// printing what each piece thinks is true. There must never be three hands, never a green blade
// lying across the cloth, and never a missing hand on his body while the camera is on him.
//   node tools/_reveal-hand.mjs [outdir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const dir = process.argv[2] ?? '/tmp/handover';
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));

await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan&shot=1', { waitUntil: 'load' });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 30000 });
await page.waitForTimeout(2600); // the ribbon is dealt and his hand has settled into the wait

// take the clock: from here every frame is stepped by hand, so each drawing can be shot
await page.evaluate(() => {
  const c = window.__theatre.clock;
  let f = c.frame + 1;
  c.tick = () => {
    c.raw = f / c.fps;
    c.t = f / c.fps;
    c.frame = f;
    c.dt = 1 / c.fps;
    c.stepped = true;
  };
  window.__adv = (n = 1) => {
    f += n;
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
});

const probe = () =>
  page.evaluate(() => {
    const P = window.__theatre.pieces, h = P.reveal?.hand;
    return {
      shot: P.camera?.current,
      drawn: !!h?.shown,
      out: h?.out,
      overhead: !!h?.overhead,
      bodyL: !!P.pepe?.parts?.handL?.visible,
      bodyR: !!P.pepe?.parts?.handR?.visible,
      hands: (h?.shown ? 1 : 0) + (P.pepe?.parts?.handL?.visible ? 1 : 0) + (P.pepe?.parts?.handR?.visible ? 1 : 0),
    };
  });
const shoot = async (name) => {
  console.log(name.padEnd(18), JSON.stringify(await probe()));
  await page.screenshot({ path: `${dir}/${name}.png` });
};
const cut = (shot) => page.evaluate((s) => window.__theatre.pieces.camera.cut(s), shot);
const adv = async (n = 1) => {
  for (let i = 0; i < n; i++) await page.evaluate(() => window.__adv(1)); // one drawing at a time, as the clock does
};

await adv();
await shoot('1-fan-waiting');
await cut('pepe');
for (let k = 0; k <= 3; k++) {
  await adv();
  await shoot(`2-pepe-drawing${k}`);
}
await adv(4);
await shoot('3-pepe-held');
await cut('fan');
for (let k = 0; k <= 3; k++) {
  await adv();
  await shoot(`4-fan-drawing${k}`);
}
await adv(4);
await shoot('5-fan-back');
await cut('table');
await adv(6);
await shoot('6-table');
await cut('fan');
await adv(6);
await shoot('7-fan-again');

if (errors.length) {
  console.log('PAGE ERRORS:');
  for (const e of errors.slice(0, 6)) console.log(' ', e.split('\n')[0]);
}
await browser.close();
