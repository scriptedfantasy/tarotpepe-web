#!/usr/bin/env node
// THE ARROW, DRIVEN FOR REAL. A long line is said into the standing card; the first take fills its
// two lines and stops; the arrow comes up at the corner and NOTHING moves until the visitor acts.
// Then: a real mouse click on the arrow, a real Space, a real tap on the card — one take each — and
// say() resolves only when the last take has been read.
//   node tools/_dlg-r9-arrow.mjs [--w 1600 --h 900] [--shot /abs/out.png]
import { chromium } from 'playwright';

// The dev server to drive. A builder running a server of their own passes BASE; the default is the
// user's own on 5173, so nothing that ran before this line runs differently.
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1] ?? 'true']] : a), []),
);
const W = +(args.w ?? 1600), H = +(args.h ?? 900);

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto(`${BASE}/?view=dialogue&state=greeting`, { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 500; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}

const LONG =
  args.line ??
  'you keep treating the first step as evidence that you must already know the whole route, anon. meanwhile the dog has spotted the edge and you are busy inspecting the stick; nothing has failed yet, so stop rehearsing the postmortem and put one unfinished thing back in your hands.';

const state = () =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    const a = cap?.querySelector('.next');
    const box = a && !a.hidden ? a.getBoundingClientRect() : null;
    const cbox = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
    return {
      well: (cap?.querySelector('.well')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      arrow: !!box,
      box: box ? { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) } : null,
      card: cbox ? { r: Math.round(cbox.right), b: Math.round(cbox.bottom), w: Math.round(cbox.width) } : null,
      marks: a ? (a.querySelector('svg').querySelector('path')?.getAttribute('d') ?? '') : '',
      resolved: window.__saidDone === true,
      caret: !!cap?.querySelector('.caret'),
      mic: (() => {
        const m = document.querySelector('#dialogue .mic');
        if (!m || m.hidden) return null;
        const r = m.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })(),
    };
  });

await page.evaluate((t) => {
  const D = window.__theatre.pieces.dialogue;
  window.__saidDone = false;
  window.__t0 = performance.now();
  D.clear();
  D.say(t, { hold: 1.2 }).then(() => {
    window.__saidDone = true;
    window.__saidAt = Math.round(performance.now() - window.__t0);
  });
}, LONG);

const log = [];
await page.waitForTimeout(1500);
let s = await state();
log.push(['1.5 s in — still typing', s]);
// wait out the arrow appearing, then sit on it well past the old 0.55 s hold
for (let i = 0; i < 120 && !(await state()).arrow; i++) await page.waitForTimeout(100);
s = await state();
log.push(['the arrow is up', s]);
const firstTake = s.well;
await page.waitForTimeout(3000);
const after3 = await state();
log.push(['3 s later, nobody has clicked', { same: after3.well === firstTake, arrow: after3.arrow, boiled: after3.marks !== s.marks }]);

// a real mouse click on the arrow
await page.mouse.click(s.box.x + s.box.w / 2, s.box.y + s.box.h / 2);
await page.waitForTimeout(250);
const t2 = await state();
log.push(['after a click on the arrow', { turned: t2.well !== firstTake, well: t2.well.slice(0, 46) }]);

// wait for the second take to fill, then a real Space
for (let i = 0; i < 120 && !(await state()).arrow; i++) await page.waitForTimeout(100);
const s2 = await state();
if (s2.arrow) {
  const w2 = s2.well;
  await page.keyboard.press(' ');
  await page.waitForTimeout(250);
  const t3 = await state();
  log.push(['after Space', { turned: t3.well !== w2, well: t3.well.slice(0, 46) }]);
}
// and a tap on the card itself, if there is another take
for (let i = 0; i < 60 && !(await state()).arrow; i++) await page.waitForTimeout(100);
const s3 = await state();
if (s3.arrow) {
  const w3 = s3.well;
  await page.mouse.click(s3.card.r - s3.card.w / 2, s3.box.y - 4);
  await page.waitForTimeout(250);
  const t4 = await state();
  log.push(['after a tap on the card', { turned: t4.well !== w3, well: t4.well.slice(0, 46) }]);
}
for (let i = 0; i < 200; i++) {
  if ((await state()).resolved) break;
  await page.keyboard.press(' ');
  await page.waitForTimeout(150);
}
const end = await page.evaluate(() => ({ resolved: window.__saidDone, at: window.__saidAt }));
log.push(['say() resolved', end]);
const last = await state();
log.push(['what stands at the end', { well: last.well.slice(-46), arrow: last.arrow }]);
log.push(['it is the end of the line', LONG.toLowerCase().replace(/\s+/g, ' ').endsWith(last.well.toLowerCase().slice(-30))]);

for (const [k, v] of log) console.log(' ', k, '::', JSON.stringify(v));

// the shot: put a fresh long line up and catch it with the arrow waiting
if (args.shot) {
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    D.say(t, { hold: 1.2 });
  }, LONG);
  for (let i = 0; i < 200 && !(await state()).arrow; i++) await page.waitForTimeout(100);
  const sh = await state();
  console.log('  shot state ::', JSON.stringify({ arrow: sh.arrow, box: sh.box, card: sh.card, mic: sh.mic }));
  await page.screenshot({ path: args.shot });
  console.log('  wrote', args.shot);
}
console.log('page errors:', errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
