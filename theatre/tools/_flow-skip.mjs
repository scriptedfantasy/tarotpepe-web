#!/usr/bin/env node
// The evening at a run: a visitor who presses Escape at every line and answers every field at
// once. Exercises the skip paths (space / Return / Escape / click), the "Pepe chooses" pick, the
// empty follow-up, the restart from the closing card, and checks that nothing stalls.
//   node tools/_flow-skip.mjs [--out /abs/dir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') && acc.push([a.slice(2), arr[i + 1] ?? 'true']), acc), []));
const outDir = args.out ?? '/tmp/flow-skip';
mkdirSync(outDir, { recursive: true });
const BEATS = ['idle', 'title', 'greeting', 'question', 'answer', 'shuffle', 'fan', 'dealt', 'reading', 'followup', 'farewell', 'closing'];

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(url){ return url; } export class ErrorOverlay {}` }));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 120000 && !(await page.evaluate(() => window.__theatreReady === true).catch(() => false))) await page.waitForTimeout(250);
log('ready');

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    return {
      beat: T.pieces.flow?.beat,
      shot: T.pieces.camera?.current,
      caption: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 70) : null,
      field: !!document.querySelector('#dialogue input.field'),
      title: !!document.querySelector('#titles .card'),
      picks: (T.pieces.reveal?.picks ?? []).length,
      fan: T.pieces.reveal?.fanCount ?? 0,
    };
  });

// the impatient visitor: Escape at every caption, Return in every field (with a word or nothing)
let lastBeat = '', lastCaption = '', answered = 0, closings = 0, lastChange = Date.now();
const answers = ['nothing much', '', 'which one matters?', ''];
while (Date.now() - t0 < 420000) {
  const s = await state();
  if (s.beat !== lastBeat) {
    log('beat', s.beat, '| shot', s.shot);
    lastBeat = s.beat;
    lastChange = Date.now();
    if (s.beat === 'closing') {
      closings++;
      await page.screenshot({ path: `${outDir}/closing-${closings}.png` });
      if (closings >= 2) break;
      await page.mouse.click(800, 450); // again
      await page.waitForTimeout(500);
      continue;
    }
  }
  if (s.caption !== lastCaption) {
    if (s.caption) log('  caption', JSON.stringify(s.caption), s.field ? '[field]' : '');
    lastCaption = s.caption;
    lastChange = Date.now();
  }
  if (s.field) {
    const a = answers[answered++ % answers.length];
    if (a) await page.keyboard.type(a, { delay: 5 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    continue;
  }
  if (s.title) await page.keyboard.press('Enter');
  else if (s.caption) await page.keyboard.press('Escape');
  if (Date.now() - lastChange > 45000) {
    const diag = await page.evaluate(
      () =>
        new Promise((res) => {
          const c = window.__theatre.clock;
          const raw0 = c.raw, f0 = c.frame;
          let rafs = 0;
          const tick = () => rafs++;
          const id = setInterval(() => requestAnimationFrame(tick), 50);
          setTimeout(() => {
            clearInterval(id);
            res({ raw0, raw1: c.raw, frame0: f0, frame1: c.frame, rafsIn1s: rafs, hidden: document.hidden });
          }, 1000);
        }),
    );
    errors.push(`STALL: nothing changed for 45 s at ${JSON.stringify(s)} clock ${JSON.stringify(diag)}`);
    await page.screenshot({ path: `${outDir}/stall.png` });
    break;
  }
  await page.waitForTimeout(250);
}
if (closings < 2) errors.push(`the evening did not come round twice (closings=${closings})`);
await browser.close();
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
log('ok: two evenings at a run, no stall, no errors');
