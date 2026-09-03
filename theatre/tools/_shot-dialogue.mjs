#!/usr/bin/env node
// Same as tools/shot.mjs but with a patient screenshot timeout (the composite renders slowly under
// software GL while every piece is being built at once). Dialogue builder's private tool.
//   node tools/_shot-dialogue.mjs --state greeting --out /abs/out.png [--url ...] [--timeout 180000]
import { chromium } from 'playwright';
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
const timeout = +(args.timeout ?? 240000);
const out = args.out ?? `/tmp/shot-dialogue.png`;
mkdirSync(dirname(out), { recursive: true });

let url = args.url;
if (!url) {
  const u = new URL('http://127.0.0.1:5173/');
  u.searchParams.set('view', args.view ?? 'dialogue');
  if (args.state) u.searchParams.set('state', args.state);
  if (args.seed) u.searchParams.set('seed', args.seed);
  if (args.t) u.searchParams.set('t', args.t);
  if (args.card) u.searchParams.set('card', args.card);
  if (args.pos) u.searchParams.set('pos', args.pos);
  if (args.line) u.searchParams.set('line', args.line);
  if (args.only) u.searchParams.set('only', args.only);
  u.searchParams.set('shot', '1');
  url = u.toString();
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(wait);
try {
  await page.waitForFunction(() => window.__theatreReady !== false, { timeout: timeout });
} catch (e) {
  console.error('not ready after', Date.now() - t0, 'ms');
}
console.error('ready after', Date.now() - t0, 'ms');
await page.screenshot({ path: out, timeout });
await browser.close();
if (errors.length && args['allow-errors'] !== 'true') {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  console.error('wrote (with errors):', out);
  process.exit(2);
}
console.log('wrote', out, `(${Date.now() - t0} ms)`, errors.length ? `(with ${errors.length} console errors, allowed)` : '');
