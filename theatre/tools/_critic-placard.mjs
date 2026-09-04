#!/usr/bin/env node
// Is the drawn placard ever on screen with nothing written on it? Sample it every 150 ms from the
// door to the end of the fan and report every stretch where it is visible and empty.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
const t0 = Date.now();
const probe = () =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    const vis = !!(cap && !cap.hidden && getComputedStyle(cap).display !== 'none' && getComputedStyle(cap).opacity !== '0');
    const line = cap?.querySelector('.line, .said, .text');
    return {
      beat: window.__theatre.pieces.flow?.beat,
      shot: window.__theatre.pieces.camera?.current,
      vis,
      box: vis ? Math.round(cap.getBoundingClientRect().width) + 'x' + Math.round(cap.getBoundingClientRect().height) : null,
      words: vis ? (cap.textContent || '').replace(/\s+/g, ' ').trim() : '',
      lineWords: line ? (line.textContent || '').replace(/\s+/g, ' ').trim() : null,
      field: !!document.querySelector('#dialogue input.keys'),
    };
  });
const samples = [];
await page.mouse.click(800, 450);
let typed = 0;
const end = Date.now() + 150000;
while (Date.now() < end) {
  const s = await probe();
  samples.push({ t: (Date.now() - t0) / 1000, ...s });
  if (s.field && typed < 3) {
    typed++;
    await page.keyboard.type(typed === 1 ? 'hello' : typed === 2 ? 'I keep starting things' : 'read my cards', { delay: 6 });
    await page.keyboard.press('Enter');
  }
  if (s.beat === 'fan' && samples.filter((x) => x.beat === 'fan').length > 120) break;
  await page.waitForTimeout(150);
}
// blank stretches: visible, box drawn, nothing written
let run = null;
const blanks = [];
for (const s of samples) {
  const blank = s.vis && (!s.words || s.words.replace(/tarot pepe|you/gi, '').trim() === '');
  if (blank && !run) run = { from: s.t, beat: s.beat, shot: s.shot, box: s.box };
  if (!blank && run) {
    run.to = s.t;
    if (run.to - run.from > 0.001) blanks.push(run);
    run = null;
  }
}
if (run) {
  run.to = samples[samples.length - 1].t;
  if (run.to - run.from > 0.001) blanks.push(run);
}
console.log('blank-placard stretches at any length:');
for (const b of blanks) console.log(`  ${b.from.toFixed(1)}s → ${b.to.toFixed(1)}s  (${(b.to - b.from).toFixed(1)}s)  beat=${b.beat} shot=${b.shot} box=${b.box}`);
if (!blanks.length) console.log('  none');
console.log('\nbeats seen:', [...new Set(samples.map((s) => s.beat))].join(', '));
await browser.close();
if (errs.length) console.error('PAGE ERRORS:\n' + errs.slice(0, 8).join('\n'));
