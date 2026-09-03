#!/usr/bin/env node
// The evening, for real: open the page as a visitor (no ?shot — the flow autoplays), press a key
// past the title, answer the question, click / name three cards at the fan, sit through the three
// readings, ask the follow-up, and screenshot each stage. Fails on any page error or a stall.
// The software renderer is slow (a screenshot costs ~3 s), so the stills are taken when a beat is
// reached and skipped, with a note, when the film has already moved on.
//   node tools/_flow-test.mjs [--out /abs/dir] [--prefix flow-r1]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
const prefix = args.prefix ?? 'flow-r1';
mkdirSync(outDir, { recursive: true });
const url = 'http://127.0.0.1:5173/';
const BEATS = ['idle', 'title', 'greeting', 'question', 'answer', 'shuffle', 'fan', 'dealt', 'reading', 'followup', 'farewell', 'closing'];
const at = (s) => BEATS.indexOf(s.beat);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
const warnings = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning' && /\[flow\]/.test(m.text())) warnings.push(m.text());
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
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${prefix}-${name}.png` });
  log('shot', name);
};
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 150000) {
  const ready = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ready) break;
  await page.waitForTimeout(250);
}
log('ready');

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    return {
      beat: T.pieces.flow?.beat,
      shot: T.pieces.camera?.current,
      caption: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : null,
      inter: !!(cap && !cap.hidden && cap.classList.contains('inter')),
      field: !!document.querySelector('#dialogue input.field'),
      mic: !!document.querySelector('#dialogue button.mic'),
      title: !!document.querySelector('#titles .card'),
      fan: T.pieces.reveal?.fanCount ?? 0,
      picks: (T.pieces.reveal?.picks ?? []).map((p) => `${p.ordinal}:${p.slug}`),
      drawn: (T.pieces.cards?.drawn?.children ?? []).length,
      mind: T.pieces.mind?.provider,
    };
  });
// poll until fn(state) is true: throws after `seconds` (a stall)
async function until(label, fn, seconds = 60) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(120);
  }
}
// wait for a beat (or anything past it); a still if the film is still on it
async function reach(beat, name = beat, extra = () => true, seconds = 90) {
  const idx = BEATS.indexOf(beat);
  const s = await until(beat, (s) => at(s) > idx || (at(s) === idx && extra(s)), seconds);
  if (at(s) === idx) {
    await shot(name);
    log(beat, JSON.stringify(s));
  } else log(`${beat}: already past (now ${s.beat}), no still`);
  return s;
}

try {
  // 1. the title, held; a key passes it
  await until('the title card', (s) => s.title && s.beat === 'title', 30);
  await page.waitForTimeout(600);
  await shot('title');
  await page.keyboard.press('Enter');
  const ch1 = await until('chapter one', (s) => (s.title && s.beat === 'title') || at(s) > 1, 12);
  if (ch1.title) await shot('chapter1');

  // 2. the greeting; the question; the answer
  await reach('greeting', 'greeting', (s) => !!s.caption);
  const q = await until('the question field', (s) => s.beat === 'question' && s.field, 60);
  log('question', JSON.stringify(q));
  if (!q.mic) log('NOTE: no mic button (SpeechRecognition / speechSynthesis missing in this browser)');
  await page.keyboard.type('I keep starting things and not finishing them.', { delay: 20 });
  await shot('question');
  await page.keyboard.press('Enter');
  await reach('answer', 'answer', (s) => !!s.caption);

  // 3. chapter two; the shuffle; the fan
  const ch2 = await until('chapter two', (s) => (s.title && s.beat === 'answer') || at(s) > 4, 60);
  if (ch2.title) await shot('chapter2');
  await reach('shuffle');
  const f = await until('the fan laid', (s) => (s.beat === 'fan' && s.fan >= 21) || at(s) > 6, 60);
  log('fan', JSON.stringify(f));
  await shot('fan-laid');

  // the first pick: a hover, then a click
  await until('the pick prompt', (s) => s.field, 40);
  let pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  log('fan on screen', pos.length, 'cards');
  await page.mouse.move(pos[6].x, pos[6].y, { steps: 5 });
  await page.waitForTimeout(400);
  await shot('fan');
  await page.mouse.down();
  await page.mouse.up();
  const p1 = await until('pick 1', (s) => s.picks.length === 1, 20);
  log('pick 1', JSON.stringify(p1));
  await shot('pick1');

  // the second: named
  await until('the second prompt', (s) => s.field && s.picks.length === 1, 30);
  await page.keyboard.type('the third from the left', { delay: 20 });
  await shot('pick2-typed');
  await page.keyboard.press('Enter');
  const p2 = await until('pick 2', (s) => s.picks.length === 2, 20);
  log('pick 2', JSON.stringify(p2));

  // the third: a click on the far right
  await until('the third prompt', (s) => s.field && s.picks.length === 2, 30);
  pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  const last = pos[pos.length - 1];
  await page.mouse.move(last.x, last.y, { steps: 5 });
  await page.waitForTimeout(300);
  await page.mouse.down();
  await page.mouse.up();
  const p3 = await until('pick 3', (s) => s.picks.length === 3, 20);
  log('pick 3', JSON.stringify(p3));
  await reach('dealt', 'dealt', (s) => s.shot === 'table');

  // 4. chapter three; the readings
  const ch3 = await until('chapter three', (s) => (s.title && s.beat === 'dealt') || at(s) > 7, 60);
  if (ch3.title) await shot('chapter3');
  for (let i = 0; i < 3; i++) {
    const ins = await until(`insert ${i}`, (s) => s.shot === `card${i}` || at(s) > 8 || (s.shot === `card${i + 1}`), 90);
    if (ins.shot !== `card${i}`) {
      log(`card ${i}: the insert had passed (now ${ins.shot}/${ins.beat})`);
      continue;
    }
    log(`card ${i} insert`, JSON.stringify(ins));
    await shot(`reading${i}-insert`);
    const line = await until(`reading ${i} line`, (s) => s.shot !== `card${i}` || (s.caption && !s.inter), 60);
    if (line.shot === `card${i}`) {
      await shot(`reading${i}-line`);
      log(`card ${i} line`, JSON.stringify(line));
    }
    const back = await until(`reading ${i} back`, (s) => s.shot === 'pepe' || s.shot === 'table' || at(s) > 8, 60);
    if (back.shot === 'pepe') await shot(`reading${i}-pepe`);
  }

  // 5. the follow-up, the farewell, the door, the end
  const fu = await until('the follow-up field', (s) => s.beat === 'followup' && s.field, 120);
  log('followup', JSON.stringify(fu));
  await page.keyboard.type('Which one is the important one?', { delay: 20 });
  await shot('followup-typed');
  await page.keyboard.press('Enter');
  const fr = await until('the follow-up reply', (s) => (s.beat === 'followup' && s.caption && !s.field) || at(s) > 9, 30);
  if (fr.beat === 'followup') {
    log('followup reply', JSON.stringify(fr));
    await shot('followup');
  }
  await reach('farewell', 'farewell', (s) => !!s.caption);
  const ep = await until('the epilogue card', (s) => (s.title && s.beat === 'farewell') || at(s) > 10, 60);
  if (ep.title) await shot('epilogue');
  const door = await until('the door', (s) => (!s.title && s.shot === 'door') || at(s) > 10, 30);
  if (door.shot === 'door' && !door.title) await shot('door');
  const end = await until('the closing card', (s) => s.beat === 'closing' && s.title, 30);
  log('closing', JSON.stringify(end));
  await shot('closing');

  // 6. a click starts again
  await page.mouse.click(800, 450);
  const again = await until('the title again', (s) => s.beat === 'title' && s.title && s.drawn === 0, 30);
  log('again', JSON.stringify(again));
  await shot('again');
  const transcript = await page.evaluate(() => (window.__theatre.pieces.mind?.history ?? []).map((h) => `${h.role}: ${h.text}`));
  console.log('\nTRANSCRIPT (the mind, before the restart cleared it)\n' + (transcript.length ? transcript.map((l) => '  ' + l).join('\n') : '  (cleared by the restart)'));
} catch (e) {
  errors.push(`TEST: ${e.message}`);
  await shot('FAILED').catch(() => {});
}

await browser.close();
if (warnings.length) console.log('flow warnings:\n' + warnings.map((w) => ' - ' + w).join('\n'));
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log(`ok in ${((Date.now() - t0) / 1000).toFixed(0)}s; shots in ${outDir} as ${prefix}-*.png`);
