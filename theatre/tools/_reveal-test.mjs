#!/usr/bin/env node
// The fan, for real: open the fan state, hover a card (it should slide out), click it (it should
// fly to slot 0), then pick "the third from the left" by ordinal and a random one, wait for the
// gather, and screenshot each beat. Prints what the piece reports at every step.
//   node tools/_reveal-test.mjs [--out /abs/dir] [--seed n]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? '/tmp/reveal-test';
mkdirSync(outDir, { recursive: true });
const url = `http://127.0.0.1:5173/?view=reveal&state=fan&shot=1${args.seed ? '&seed=' + args.seed : ''}`;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
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
while (Date.now() - t0 < 150000) {
  const ready = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ready) break;
  await page.waitForTimeout(250);
}
console.log('ready in', ((Date.now() - t0) / 1000).toFixed(1), 's');
await page.waitForTimeout(800);

const state = () =>
  page.evaluate(() => {
    const r = window.__theatre.pieces.reveal;
    const f = r._fan;
    return {
      armed: f.armed,
      picking: f.picking,
      hover: f.hover ? f.hover.i : null,
      fan: r.fanCount,
      picks: r.picks.map((p) => ({ index: p.index, ordinal: p.ordinal, slug: p.slug, slot: p.slot })),
      drawn: window.__theatre.pieces.cards.drawn.children.map((m) => m.name),
      lifts: f.entries.filter((e) => e.lift > 0).map((e) => [e.i, e.lift]),
    };
  });
const positions = () => page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());

console.log('start', JSON.stringify(await state()));
let pos = await positions();
console.log('fan on screen:', pos.length, 'cards; first', JSON.stringify(pos[0]), 'last', JSON.stringify(pos[pos.length - 1]));

// 1. hover the 6th card from the left
const target = pos[5];
await page.mouse.move(target.x, target.y, { steps: 4 });
await page.waitForTimeout(400);
console.log('hover', JSON.stringify(await state()));
await page.screenshot({ path: `${outDir}/1-hover.png` });

// 2. click it
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(350);
console.log('mid-pick', JSON.stringify(await state()));
await page.screenshot({ path: `${outDir}/2-mid-pick.png` });
await page.waitForTimeout(1500);
console.log('after pick 1', JSON.stringify(await state()));
await page.screenshot({ path: `${outDir}/3-picked.png` });

// 3. "the third from the left"
const p2 = await page.evaluate(() => window.__theatre.pieces.reveal.pickByOrdinal(3).then((r) => ({ index: r.index, ordinal: r.ordinal, slug: r.slug, slot: r.slot })));
console.log('pickByOrdinal(3) →', JSON.stringify(p2));
await page.screenshot({ path: `${outDir}/4-ordinal.png` });

// 4. a random one; the fan state then gathers the rest on its own
const p3 = await page.evaluate(() => window.__theatre.pieces.reveal.pickRandom().then((r) => ({ index: r.index, ordinal: r.ordinal, slug: r.slug, slot: r.slot })));
console.log('pickRandom() →', JSON.stringify(p3));
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/5-gathering.png` });
await page.waitForTimeout(1600);
console.log('after gather', JSON.stringify(await state()));
await page.screenshot({ path: `${outDir}/6-gathered.png` });

// 5. turn the three
await page.evaluate(() => {
  const r = window.__theatre.pieces.reveal;
  r.turn(0);
  r.turn(1, 0.6);
  r.turn(2, 1.2);
});
await page.waitForTimeout(2600);
await page.screenshot({ path: `${outDir}/7-turned.png` });
console.log('end', JSON.stringify(await state()));

await browser.close();
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log('ok; shots in', outDir);
