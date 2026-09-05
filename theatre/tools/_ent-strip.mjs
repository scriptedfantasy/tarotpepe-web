#!/usr/bin/env node
// The arrival, drawing by drawing, at EXACT clock times: one page load per frame is too slow, so
// this drives ?t itself and stitches the frames into a strip in the order they are played.
//   node tools/_ent-strip.mjs --state opening --times 1.7,2.45,2.62,2.79,2.95,3.15 --out /abs.png
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const width = +(args.width ?? 1600);
const height = +(args.height ?? 900);
const state = args.state ?? 'opening';
const view = args.view ?? 'entrance';
const cols = +(args.cols ?? 0);
const times = String(args.times ?? '').split(',').filter(Boolean).map(Number);
const out = args.out ?? '/tmp/ent-strip.png';
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){ return u; }\nexport class ErrorOverlay {}' }),
);
const bufs = [];
for (const t of times) {
  const u = new URL('http://127.0.0.1:5173/');
  u.searchParams.set('view', view);
  u.searchParams.set('state', state);
  u.searchParams.set('t', String(t));
  u.searchParams.set('shot', '1');
  await page.goto(u.toString(), { waitUntil: 'load', timeout: 60000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    let ok = false;
    try { ok = await page.evaluate(() => window.__theatreReady === true); } catch {}
    if (ok) break;
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(900);
  bufs.push(await page.screenshot({ timeout: 120000 }));
  console.log('t=' + t);
}
await browser.close();
const n = bufs.length;
const c = cols || Math.min(n, Math.ceil(n / 2));
const rows = Math.ceil(n / c);
const cw = Math.round(width / 2), ch = Math.round(height / 2);
const tiles = await Promise.all(bufs.map((b) => sharp(b).resize(cw, ch).png().toBuffer()));
await sharp({ create: { width: cw * c, height: ch * rows, channels: 3, background: '#111' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % c) * cw, top: Math.floor(i / c) * ch })))
  .png()
  .toFile(out);
console.log('wrote', out, errors.length ? 'ERRORS:\n' + errors.join('\n') : '');
