#!/usr/bin/env node
// Is the puppet actually stepped on twos? Freeze the scene clock at a ladder of t values inside
// two 12 fps steps and diff consecutive frames. Within a step the frame must be identical; across
// a step boundary it must change. Also reports whether anything on Pepe moves at all.
//   node tools/_critic-twos.mjs [--view pepeAnim] [--state talk]
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const view = args.view ?? 'pepeAnim';
const state = args.state ?? 'talk';
// two full 12fps steps, sampled 3x each
const TS = [5.0, 5.03, 5.06, 5.09, 5.12, 5.15, 5.18, 5.21];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay {}`,
  }),
);
const raw = [];
for (const t of TS) {
  const u = `http://127.0.0.1:5173/?view=${view}&state=${state}&shot=1&t=${t}`;
  await page.goto(u, { waitUntil: 'load', timeout: 60000 });
  const t0 = Date.now();
  for (;;) {
    const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
    if (ok || Date.now() - t0 > 120000) break;
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1200);
  const buf = await page.screenshot();
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  raw.push({ t, data, info });
  process.stdout.write(`t=${t.toFixed(2)} `);
}
console.log('');
const diff = (a, b) => {
  let sum = 0, n = 0, changed = 0;
  for (let i = 0; i < a.data.length; i++) {
    const d = Math.abs(a.data[i] - b.data[i]);
    sum += d; n++;
    if (d > 8) changed++;
  }
  return { mean: sum / n, changedPct: (100 * changed) / n };
};
console.log('\nconsecutive frame diffs (mean abs grey, % of pixels changed > 8):');
for (let i = 1; i < raw.length; i++) {
  const d = diff(raw[i - 1], raw[i]);
  const sameStep = Math.floor(raw[i - 1].t * 12) === Math.floor(raw[i].t * 12);
  console.log(
    `  ${raw[i - 1].t.toFixed(2)} -> ${raw[i].t.toFixed(2)}  ${sameStep ? 'same step ' : 'STEP EDGE'}  mean ${d.mean.toFixed(3)}  changed ${d.changedPct.toFixed(3)}%`,
  );
}
const first = diff(raw[0], raw[raw.length - 1]);
console.log(`\n  overall ${raw[0].t} -> ${raw[raw.length - 1].t}: mean ${first.mean.toFixed(3)}, changed ${first.changedPct.toFixed(3)}%`);
await browser.close();
