#!/usr/bin/env node
// The visitor really typing: open the page as a visitor (the flow autoplays), skip to the question,
// type a long answer one key at a time, and screenshot it. Proves the drawn block takes real
// keystrokes, wraps to as many lines as it needs and stays legible over the drawing.
//   node tools/_dialogue-type.mjs [--out /abs/dir] [--prefix dialogue-r3]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
const prefix = args.prefix ?? 'dialogue-r3';
mkdirSync(outDir, { recursive: true });

const ANSWER =
  'I keep starting things and not finishing them, and lately I have begun to suspect that the starting is the part I actually enjoy.';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
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

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 150000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(250);
}
log('ready');

// skip forward until the visitor is asked something
let asking = false;
for (let i = 0; i < 220 && !asking; i++) {
  asking = await page.evaluate(() => !!window.__theatre?.pieces?.dialogue?.asking).catch(() => false);
  if (asking) break;
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
}
if (!asking) {
  console.error('never reached a question');
  await page.screenshot({ path: `${outDir}/${prefix}-stuck.png` });
  await browser.close();
  process.exit(2);
}
log('asked; typing');

await page.keyboard.type(ANSWER.slice(0, 46), { delay: 18 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/${prefix}-typing-half.png` });
await page.keyboard.type(ANSWER.slice(46), { delay: 18 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/${prefix}-typing-full.png` });
log('typed', ANSWER.length, 'characters');

const seen = await page.evaluate(() => {
  const cap = document.querySelector('#dialogue .cap');
  const ink = cap?.querySelector('.layer.ink .answer');
  const r = cap?.getBoundingClientRect();
  return {
    text: ink?.textContent ?? null,
    lines: ink ? Math.round(ink.getBoundingClientRect().height / parseFloat(getComputedStyle(ink).lineHeight)) : 0,
    box: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) } : null,
    caret: !!cap?.querySelector('.layer.ink .caret'),
    mic: !!document.querySelector('#dialogue .mic:not([hidden])'),
    inputs: document.querySelectorAll('#dialogue input').length,
  };
});
console.log('block:', JSON.stringify(seen));
if (seen.text?.replace(/\s+/g, ' ').trim() !== ANSWER) console.error('MISMATCH: the drawn block does not hold what was typed');

// and the key that submits it
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/${prefix}-after-enter.png` });
const gone = await page.evaluate(() => !window.__theatre?.pieces?.dialogue?.asking);
log('after Return, asking =', !gone);

await browser.close();
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log('ok');
