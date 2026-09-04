#!/usr/bin/env node
// scratch (pepe builder): where does his cast shadow actually land? Loads the page, puts the ink
// pass in debug-lit (the raw light buffer, before any hatching), takes the wide shot, and then
// takes it again with the whole figure hidden. The difference IS his shadow: every pixel the room
// loses when he is taken out of it. Writes three pngs and prints the bounding box.
//   node tools/_pepe-shadow.mjs [shot] [out dir]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'wide';
const DIR = process.argv[3] ?? '/tmp/p5/shadow';
mkdirSync(DIR, { recursive: true });
const W = 1600, H = 900;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},send(){},data:{}});export function injectQuery(u){return u}export function removeStyle(){}\n' }));
await page.goto(`http://127.0.0.1:5173/?view=camera&state=${SHOT}&shot=1`, { waitUntil: 'commit', timeout: 120000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(2500);

const DZ = +(process.argv[4] ?? 0); // try him this much further upstage (−) or downstage (+)
const setup = async (hide) =>
  page.evaluate(
    ({ h, dz }) => {
      const t = window.__theatre;
      t.pieces.ink.setMode('debug-lit');
      const p = t.pieces.pepe.group;
      if (p.userData.z0 === undefined) p.userData.z0 = p.position.z;
      p.position.z = p.userData.z0 + dz;
      p.visible = !h;
      return true;
    },
    { h: hide, dz: DZ },
  );

await setup(false);
await page.waitForTimeout(900);
await page.screenshot({ path: `${DIR}/lit-with.png` });
await setup(true);
await page.waitForTimeout(900);
await page.screenshot({ path: `${DIR}/lit-without.png` });
await browser.close();

const a = await sharp(`${DIR}/lit-with.png`).greyscale().raw().toBuffer();
const b = await sharp(`${DIR}/lit-without.png`).greyscale().raw().toBuffer();
const diff = Buffer.alloc(W * H);
let n = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let i = 0; i < W * H; i++) {
  const d = b[i] - a[i]; // the room got DARKER with him in it → that is his shadow
  diff[i] = d > 10 ? 255 : 0;
  if (d > 10) {
    n++;
    const x = i % W, y = (i - x) / W;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}
await sharp(diff, { raw: { width: W, height: H, channels: 1 } }).png().toFile(`${DIR}/shadow-${SHOT}.png`);
console.log(n ? `${SHOT}: ${n} px of cast shadow, box x ${x0}..${x1} y ${y0}..${y1}` : `${SHOT}: he casts nothing the camera can see`);
