#!/usr/bin/env node
// Screenshot the running dev server with headless Chromium (software WebGL).
//
//   node tools/shot.mjs --view room --out /abs/out.png
//   node tools/shot.mjs --view reveal --frames 8 --interval 250 --out /abs/sheet.png   (contact sheet)
//   node tools/shot.mjs --url "http://127.0.0.1:5173/?view=titles&state=chapter" --out /abs/x.png
//
// Options: --view <name>  --state <str>  --seed <n>  --t <seconds: freeze the scene clock at t>
//          --width 1600 --height 900  --wait <ms before shot, default 2500>
//          --frames <n> --interval <ms>   (captures n frames into one horizontal strip, 2 rows)
//          --out <abs path>  --url <full url override>  --allow-errors
// Exits non-zero and prints console errors if the page throws (unless --allow-errors).
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
const wait = +(args.wait ?? 2500);
const frames = +(args.frames ?? 1);
const interval = +(args.interval ?? 250);
const out = args.out ?? `/tmp/shot-${args.view ?? 'scene'}.png`;
mkdirSync(dirname(out), { recursive: true });

let url = args.url;
if (!url) {
  const u = new URL('http://127.0.0.1:5173/');
  if (args.view) u.searchParams.set('view', args.view);
  if (args.state) u.searchParams.set('state', args.state);
  if (args.seed) u.searchParams.set('seed', args.seed);
  if (args.t) u.searchParams.set('t', args.t);
  u.searchParams.set('shot', '1');
  url = u.toString();
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
const builds = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  const b = /\[theatre\] built (\w+) in (\d+)ms/.exec(m.text());
  if (b) builds.push([b[1], +b[2]]);
});
// Disable Vite's HMR client for the screenshot page: other builders edit files constantly and a full
// reload mid-shot yields a black frame. The stub keeps import.meta.hot and CSS injection working.
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(id, css){ let s = document.querySelector('style[data-vite-dev-id="' + id + '"]'); if (!s) { s = document.createElement('style'); s.setAttribute('data-vite-dev-id', id); document.head.appendChild(s); } s.textContent = css; }
export function removeStyle(id){ document.querySelector('style[data-vite-dev-id="' + id + '"]')?.remove(); }
export function injectQuery(url){ return url; }
export class ErrorOverlay {}`,
  }),
);
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
// Wait for the app's ready flag (set after the first frames render). Builds can be slow in software
// WebGL; poll manually so a Vite reload mid-load does not abort the wait.
const readyTimeout = +(args['ready-timeout'] ?? 150000);
let ready = false;
while (Date.now() - t0 < readyTimeout) {
  try {
    ready = await page.evaluate(() => window.__theatreReady === true);
  } catch {
    ready = false;
  }
  if (ready) break;
  await page.waitForTimeout(250);
}
const readyMs = Date.now() - t0;
if (!ready) errors.push(`page never became ready within ${readyTimeout}ms (window.__theatreReady stayed false) — a piece build is hanging or throwing`);
await page.waitForTimeout(wait);

if (frames <= 1) {
  await page.screenshot({ path: out });
  let stillReady = false;
  try { stillReady = await page.evaluate(() => window.__theatreReady === true); } catch {}
  if (ready && !stillReady) errors.push('the page reloaded or broke while the frame was being captured; retry');
} else {
  const bufs = [];
  for (let i = 0; i < frames; i++) {
    bufs.push(await page.screenshot());
    await page.waitForTimeout(interval);
  }
  const cols = Math.ceil(frames / 2);
  const rows = frames > 1 ? 2 : 1;
  const cw = Math.round(width / 2), ch = Math.round(height / 2);
  const tiles = await Promise.all(bufs.map((b) => sharp(b).resize(cw, ch).png().toBuffer()));
  await sharp({ create: { width: cw * cols, height: ch * rows, channels: 3, background: '#111' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cw, top: Math.floor(i / cols) * ch })))
    .png()
    .toFile(out);
}
await browser.close();

const slow = builds.filter(([, ms]) => ms > 1500);
console.log(`ready in ${(readyMs / 1000).toFixed(1)}s; builds: ${builds.map(([n, ms]) => n + ' ' + ms + 'ms').join(', ')}`);
if (slow.length) console.log('SLOW BUILDS (> 1500ms each; the budget in BRIEF.md): ' + slow.map(([n, ms]) => n + ' ' + ms + 'ms').join(', '));

if (errors.length && args['allow-errors'] !== 'true') {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  console.error('wrote (with errors):', out);
  process.exit(2);
}
console.log('wrote', out, errors.length ? `(with ${errors.length} console errors, allowed)` : '');
