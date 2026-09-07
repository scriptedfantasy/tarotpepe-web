#!/usr/bin/env node
// The dial's four stops, side by side, at 3x nearest-neighbour — off, a, b, c — shot off the live
// page in the `home` frame and cropped to the set's own box.
//   node tools/_props-r8-dial.mjs [out.png] [width] [height] [shot]
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = process.argv[2] ?? '/tmp/props-r8-radio.png';
const W = +(process.argv[3] ?? 1600), H = +(process.argv[4] ?? 900);
const SHOT = process.argv[5] ?? 'home';
const S = 3, PAD = 12;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;',
  }),
);
await page.goto(`http://127.0.0.1:5173/?view=props&state=default&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
await page.evaluate((s) => window.__theatre.pieces.camera.cut(s), SHOT);
await page.waitForTimeout(900);

const b = await page.evaluate(() => window.__theatre.pieces.props.radio.hitBox());
const box = {
  left: Math.max(0, Math.round(b.x - PAD)),
  top: Math.max(0, Math.round(b.y - PAD)),
  width: Math.round(b.w + PAD * 2),
  height: Math.round(b.h + PAD * 2),
};
console.log(`${SHOT} at ${W}x${H}: the set is ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px; cropping ${box.width} x ${box.height} at ${S}x`);

const tiles = [];
for (const [i, name] of ['off', 'a', 'b', 'c'].entries()) {
  await page.evaluate((n) => window.__theatre.pieces.props.radio.set(n), i);
  await page.waitForTimeout(700);
  const png = await page.screenshot({ type: 'png' });
  tiles.push(
    await sharp(png)
      .extract(box)
      .resize(box.width * S, box.height * S, { kernel: 'nearest' })
      .png()
      .toBuffer(),
  );
  console.log(`  ${name}: needle at`, await page.evaluate(() => +window.__theatre.scene.getObjectByName('radio').userData.needle.position.x.toFixed(4)));
}
await browser.close();

const tw = box.width * S, th = box.height * S, gap = 10;
await sharp({ create: { width: tw * 4 + gap * 5, height: th + gap * 2, channels: 3, background: '#f8f9f4' } })
  .composite(tiles.map((input, i) => ({ input, left: gap + i * (tw + gap), top: gap })))
  .png()
  .toFile(OUT);
console.log('wrote', OUT, `${tw * 4 + gap * 5} x ${th + gap * 2}`);
