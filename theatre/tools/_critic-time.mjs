#!/usr/bin/env node
// The same visit with no screenshots at all, so the per-beat times are the film's and not the
// software renderer's. Prints a timings table.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay {}`,
  }),
);
const t0 = Date.now();
const el = () => (Date.now() - t0) / 1000;
const marks = [];
let last = 0;
const mark = (label, extra = '') => {
  marks.push({ label, at: el(), dt: el() - last, extra });
  last = el();
  console.log(`[${el().toFixed(1)}s] +${(marks[marks.length - 1].dt).toFixed(1)}s ${label} ${extra}`);
};
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
while (el() < 150) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
mark('boot to the door');
const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    return {
      beat: T.pieces.flow?.beat,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      field: !!document.querySelector('#dialogue input.keys'),
      title: !!document.querySelector('#titles .card'),
      cap: cap && !cap.hidden,
      fan: T.pieces.reveal?.fanCount ?? 0,
      picks: (T.pieces.reveal?.picks ?? []).length,
      readings: T.pieces.flow?.readings,
    };
  });
async function until(label, fn, seconds = 90) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`STALL >${seconds}s: ${label} ${JSON.stringify(s)}`);
    await page.waitForTimeout(60);
  }
}
const field = (l, s = 90) => until(l, (x) => x.field && x.beat === 'talk', s);
const types = async (t) => {
  await page.keyboard.type(t, { delay: 8 });
  await page.keyboard.press('Enter');
};
try {
  await until('door', (s) => s.door === 'closed', 30);
  await page.waitForTimeout(500);
  const c = el();
  await page.mouse.click(800, 450);
  await until('the cut into the room', (s) => s.door === 'hidden' || s.beat !== 'door', 30);
  mark('click → inside the parlour', `${(el() - c).toFixed(2)}s`);
  await until('his first line', (s) => s.cap, 60);
  mark('first line on the placard');
  await field('the field under his line');
  mark('field open (visitor may type)');
  let a = el();
  await types('hello');
  await until('his reply', (s) => s.cap && !s.field, 40);
  mark('typed → first word back', `${(el() - a).toFixed(2)}s`);
  await field('field back');
  mark('his turn spoken, field back');
  a = el();
  await types('I keep starting things and not finishing them');
  await until('his reply', (s) => s.cap && !s.field, 40);
  mark('typed → first word back', `${(el() - a).toFixed(2)}s`);
  await field('field back');
  mark('his turn spoken, field back');
  a = el();
  await types('can you read my cards');
  await until('the story card', (s) => s.title, 40);
  mark('asked → the chapter card up', `${(el() - a).toFixed(2)}s`);
  await until('the card gone', (s) => !s.title, 40);
  mark('the chapter card held');
  await until('the shuffle', (s) => s.beat === 'shuffle', 40);
  mark('the shuffle begins');
  await until('the fan', (s) => s.beat === 'fan', 60);
  mark('the shuffle');
  await until('the pick prompt', (s) => s.field, 60);
  mark('the fan laid, choose');
  const pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  await page.mouse.move(pos[5].x, pos[5].y, { steps: 4 });
  await page.waitForTimeout(250);
  a = el();
  await page.mouse.click(pos[5].x, pos[5].y);
  await until('pick 1 landed', (s) => s.picks === 1, 30);
  mark('click → the card in its slot', `${(el() - a).toFixed(2)}s`);
  const off = await until('the cut off the fan', (s) => s.shot !== 'fan', 12).catch(() => null);
  if (off) {
    mark('the cut back to him between picks', off.shot);
    await until('back on the fan', (s) => s.shot === 'fan', 20).catch(() => null);
    mark('held on him, back to the fan');
  } else console.log('  (no cut back to him after pick 1)');
  await until('prompt 2', (s) => s.field && s.picks === 1, 40);
  const p2 = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  await page.mouse.click(p2[10].x, p2[10].y);
  await until('pick 2', (s) => s.picks === 2, 30);
  mark('pick 2');
  await until('prompt 3', (s) => s.field && s.picks === 2, 40);
  a = el();
  await types('the second from the right');
  await until('pick 3', (s) => s.picks === 3, 30);
  mark('named → the card in its slot', `${(el() - a).toFixed(2)}s`);
  await until('turn 1', (s) => s.beat === 'reading', 60);
  mark('the last pick → the first turn');
  for (let i = 0; i < 3; i++) {
    await until(`insert ${i}`, (s) => s.shot === `card${i}`, 90);
    mark(`cut to card ${i}`);
    await until(`off ${i}`, (s) => s.shot !== `card${i}`, 90);
    mark(`held on card ${i}`);
  }
  await field('the field after the reading', 120);
  mark('the reading over, talking again');
  a = el();
  await types('what does the middle one mean');
  await until('his reply', (s) => s.cap && !s.field, 40);
  mark('typed → first word back', `${(el() - a).toFixed(2)}s`);
  await field('field back');
  mark('his answer spoken');
  await types('thank you, goodbye');
  await until('the farewell', (s) => s.beat === 'farewell' || s.beat === 'closing', 60);
  mark('goodbye → the farewell');
  await until('the closing card', (s) => s.beat === 'closing' && s.title, 60);
  mark('the farewell spoken → the sign-off card');
} catch (e) {
  console.log('FAILED:', e.message);
}
console.log('\nTIMINGS (no screenshots)');
for (const m of marks) console.log(`  ${m.at.toFixed(1).padStart(6)}s  +${m.dt.toFixed(1).padStart(5)}s  ${m.label}  ${m.extra}`);
const stalls = marks.filter((m) => m.dt > 15);
console.log(stalls.length ? '\nOVER 15s:\n' + stalls.map((m) => `  ${m.label}: ${m.dt.toFixed(1)}s`).join('\n') : '\nno beat over 15s');
await browser.close();
if (errors.length) console.error('PAGE ERRORS:\n' + errors.slice(0, 12).map((e) => ' - ' + e).join('\n'));
