#!/usr/bin/env node
// Measure the placard and its field in a judging still: node tools/_flow-probe.mjs [--state question]
import { chromium } from 'playwright';
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') && acc.push([a.slice(2), arr[i + 1] ?? 'true']), acc), []));
const url = `http://127.0.0.1:5173/?view=flow&state=${args.state ?? 'question'}&shot=1`;
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(url){ return url; } export class ErrorOverlay {}` }));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 120000 && !(await page.evaluate(() => window.__theatreReady === true).catch(() => false))) await page.waitForTimeout(250);
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => (el ? (({ x, y, width, height }) => ({ x: +x.toFixed(1), y: +y.toFixed(1), w: +width.toFixed(1), h: +height.toFixed(1) }))(el.getBoundingClientRect()) : null);
  const placard = q('#dialogue .cap > svg.placard');
  return {
    cap: box(q('#dialogue .cap')),
    placard: box(placard),
    placardAttr: placard && { w: placard.getAttribute('width'), h: placard.getAttribute('height'), vb: placard.getAttribute('viewBox') },
    line: box(q('#dialogue .cap .line')),
    fieldbox: box(q('#dialogue .fieldbox')),
    input: box(q('#dialogue input.field')),
    rule: box(q('#dialogue .fieldbox > svg')),
    mic: box(q('#dialogue .mic')),
    inputStyle: (() => { const i = q('#dialogue input.field'); if (!i) return null; const cs = getComputedStyle(i); return { font: cs.font, padding: cs.padding, lineHeight: cs.lineHeight, height: cs.height }; })(),
  };
});
console.log(JSON.stringify(r, null, 1));
await page.screenshot({ path: '/tmp/flow-look/probe.png', clip: { x: 500, y: 650, width: 600, height: 250 } });
await browser.close();
if (errors.length) { console.error('PAGE ERRORS', errors); process.exit(2); }
