#!/usr/bin/env node
// scratch (pepe builder, r6): the same measurement as _pepe-shadow.mjs, but it separates the two
// casters. Pass `figure` to hide only the cut-out (body, head, hands) and leave the bench standing,
// or `bench` to hide only the bench. The difference in the raw light buffer IS that thing's shadow.
//   node tools/_pepe-bench-shadow.mjs <shot> <figure|bench|both> [outdir]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'wide';
const WHAT = process.argv[3] ?? 'figure';
const DIR = process.argv[4] ?? '/tmp/p6/shadow';
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

const setup = async (hide) =>
  page.evaluate(
    ({ h, what }) => {
      const t = window.__theatre;
      t.pieces.ink.setMode('debug-lit');
      const p = t.pieces.pepe;
      const figure = [p.parts.body, p.parts.head, p.parts.handL, p.parts.handR];
      const bench = [p.parts.bench];
      const set = what === 'bench' ? bench : what === 'both' ? figure.concat(bench) : figure;
      for (const o of set) if (o) o.visible = !h;
      return set.length;
    },
    { h: hide, what: WHAT },
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
  const d = b[i] - a[i]; // the room got DARKER with it in → that is its cast shadow
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
await sharp(diff, { raw: { width: W, height: H, channels: 1 } }).png().toFile(`${DIR}/shadow-${SHOT}-${WHAT}.png`);
console.log(n ? `${SHOT}/${WHAT}: ${n} px of cast shadow, box x ${x0}..${x1} y ${y0}..${y1}` : `${SHOT}/${WHAT}: casts nothing the camera can see`);
