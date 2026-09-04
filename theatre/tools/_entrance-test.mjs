#!/usr/bin/env node
// The entrance, for real: open the page as a visitor (no params — the flow autoplays), photograph
// the closed door, click it, photograph every 200 ms through the swing and the walk-through, and
// prove that the parlour arrives and Pepe starts talking. Fails on any page error or a stall.
//   node tools/_entrance-test.mjs [--out /abs/dir] [--prefix entrance-r1]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
const prefix = args.prefix ?? 'entrance-r1';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
// keep Vite's HMR client out of the way: a reload mid-shot is a black frame
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
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const shot = async (n) => page.screenshot({ path: `${outDir}/${prefix}-${n}.png` });
const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    return {
      beat: T.pieces.flow?.beat,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      up: !!T.pieces.entrance?.showing,
      caption: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 70) : null,
      title: !!document.querySelector('#titles .card'),
    };
  });
async function until(label, fn, seconds = 40) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(100);
  }
}

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
  while (Date.now() - t0 < 150000) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  log('ready');

  // 1. the film opens on the closed door, and waits there
  const shut = await until('the closed door', (s) => s.up && s.door === 'closed', 30);
  log('closed', JSON.stringify(shut));
  if (shut.title) throw new Error('a title card is up: the door should have replaced it');
  await page.waitForTimeout(500);
  await shot('shut');
  const held = await state();
  if (held.door !== 'closed') throw new Error(`the door did not wait for the visitor (now ${held.door})`);

  // 2. the visitor knocks
  const tClick = Date.now();
  await page.mouse.click(800, 470);
  log('clicked');
  for (let i = 0; i < 16; i++) {
    await shot(`swing-${String(i).padStart(2, '0')}`);
    const s = await state();
    if (!s.up) {
      log(`inside after ${((Date.now() - tClick) / 1000).toFixed(1)}s of wall time`, JSON.stringify(s));
      break;
    }
    await page.waitForTimeout(200);
  }

  // 3. the parlour arrives, and he starts talking
  const inside = await until('the parlour', (s) => !s.up, 30);
  log('the layer is down', JSON.stringify(inside));
  if (inside.shot !== 'home' && inside.shot !== 'pepe') throw new Error(`the camera is at ${inside.shot}, not in the parlour`);
  await shot('arrived');
  const greet = await until('the greeting', (s) => s.beat === 'greeting' || s.beat === 'talk' || !!s.caption, 60);
  log('greeting', JSON.stringify(greet));
  await page.waitForTimeout(400);
  await shot('greeting');
  if (!greet.caption && greet.beat !== 'greeting') throw new Error('Pepe never began');
} catch (e) {
  errors.push(`TEST: ${e.message}`);
  await shot('FAILED').catch(() => {});
}

await browser.close();
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log(`ok in ${((Date.now() - t0) / 1000).toFixed(0)}s; shots in ${outDir} as ${prefix}-*.png`);
