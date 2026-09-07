#!/usr/bin/env node
// HOW LONG IS THE CARD BLANK? — round 8's measurement, before and after.
//
// Drives a real evening against the live model (the dev server's key), answers as a visitor would,
// and samples every 40 ms whether anything of HIS is on the card: an inked word in his register, a
// lettered card name, or (after this round) the thinking mark. A "blank stretch" is any run of
// samples with none of those, and the number that matters is the one that begins the moment the
// visitor presses Return.
//
//   node tools/_dlg-r8-blank.mjs [turns]
import { chromium } from 'playwright';

const TURNS = +(process.argv[2] ?? 3);
const LINES = [
  'good evening. i came in out of the rain.',
  'i keep starting things and not finishing them.',
  'does the room always smell of tobacco?',
  'what do you do when nobody comes in?',
];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}`,
  }),
);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}

// the sampler and the automatic visitor, both inside the page
await page.evaluate((lines) => {
  const T = window.__theatre;
  const t0 = performance.now();
  window.__probe = { rows: [], events: [] };
  const cap = () => document.querySelector('#dialogue .cap');
  window.__look = () => {
    const c = cap();
    const up = !!(c && !c.hidden);
    const words = c ? [...c.querySelectorAll('.line .w')].filter((w) => !w.classList.contains('hid')).length : 0;
    const lettered = c ? c.querySelectorAll('canvas').length : 0;
    const dots = c ? c.querySelectorAll('.think').length : 0;
    const answer = c ? (c.querySelector('.answer')?.textContent ?? '').trim().length : 0;
    return { up, words, lettered, dots, answer, his: up && (words > 0 || lettered > 0 || dots > 0) };
  };
  setInterval(() => {
    const l = window.__look();
    const c = cap();
    const well = c?.querySelector('.well');
    const text = (well?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 34);
    window.__probe.rows.push({
      t: Math.round(performance.now() - t0),
      his: l.his ? 1 : 0,
      up: l.up ? 1 : 0,
      dots: l.dots ? 1 : 0,
      words: l.words,
      answer: l.answer,
      text,
      beat: T.pieces.flow?.beat ?? '?',
    });
  }, 40);

  // the visitor: answers each open field once, 700 ms after it opens
  let n = 0;
  let armed = false;
  setInterval(() => {
    const D = T.pieces.dialogue;
    const input = document.querySelector('#dialogue .cap .keys');
    if (!D?.asking || !input) {
      armed = false;
      return;
    }
    if (armed) return;
    armed = true;
    const line = lines[n % lines.length];
    n++;
    setTimeout(() => {
      if (!document.body.contains(input)) return;
      input.value = line;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        window.__probe.events.push({ t: Math.round(performance.now() - t0), what: 'return', line });
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }, 260);
    }, 700);
  }, 120);
}, LINES);

// the door: it only listens once `open()` is standing behind it
for (let i = 0; i < 60; i++) {
  const at = await page.evaluate(() => ({ beat: window.__theatre?.pieces?.flow?.beat, ent: window.__theatre?.pieces?.entrance?.mode }));
  if (at.beat === 'door' && at.ent === 'closed') break;
  await page.waitForTimeout(250);
}
await page.waitForTimeout(300);
for (let i = 0; i < 6; i++) {
  await page.mouse.click(800, 450);
  await page.waitForTimeout(400);
  if ((await page.evaluate(() => window.__theatre?.pieces?.entrance?.mode)) !== 'closed') break;
}

// let the evening run: the landing hold, the greeting, and `turns` exchanges
await page.waitForTimeout(9000 + TURNS * 14000);

const out = await page.evaluate(() => window.__probe);
await browser.close();

const rows = out.rows;
const runs = [];
let start = null;
for (const r of rows) {
  if (!r.his && start == null) start = r;
  if (r.his && start != null) {
    runs.push({ from: start.t, ms: r.t - start.t, beat: start.beat });
    start = null;
  }
}
if (start) runs.push({ from: start.t, ms: rows[rows.length - 1].t - start.t, beat: start.beat, open: true });

// the stretch that begins with a Return: the visitor has spoken and the card has nothing of his
const afterReturn = [];
for (const e of out.events) {
  const r = runs.find((x) => x.from >= e.t - 400 && x.from <= e.t + 1200);
  if (r) afterReturn.push({ return: e.t, blank: r.ms, beat: r.beat, line: e.line.slice(0, 28) });
}
if (process.env.TIMELINE) {
  console.log('--- the card, every time it changes ---');
  let prev = '';
  for (const r of rows) {
    const sig = `${r.up ? (r.dots ? 'DOTS' : r.text ? 'line' : 'bare') : 'off '} beat=${r.beat} ans=${r.answer} “${r.text}”`;
    if (sig === prev) continue;
    prev = sig;
    console.log(`  ${String(r.t).padStart(6)} ms  ${sig}`);
  }
  for (const e of out.events) console.log(`  ${String(e.t).padStart(6)} ms  RETURN “${e.line.slice(0, 30)}”`);
}
// what stands in the card between the Return and his first sentence
console.log('--- from the visitor pressing Return to his first sentence ---');
for (const e of out.events) {
  const i0 = rows.findIndex((r) => r.t >= e.t);
  if (i0 < 0) continue;
  let i = i0;
  while (i < rows.length && !rows[i].dots) i++; // his line is still standing until here
  const dotsAt = i < rows.length ? rows[i].t - e.t : null;
  while (i < rows.length && rows[i].dots) i++; // the mark stands until he writes
  const dotsOff = dotsAt != null && i < rows.length ? rows[i].t - e.t : null;
  const words = rows.slice(i).find((r) => r.words > 0);
  const blank = rows.slice(i0).findIndex((r) => !r.his);
  console.log(
    `  return @${String(e.t).padStart(6)} ms → his line held ${dotsAt ?? '—'} ms → dots for ${dotsAt != null && dotsOff != null ? dotsOff - dotsAt : '—'} ms → his first sentence at ${words ? words.t - e.t : '?'} ms; blank card at any point: ${blank < 0 ? 'never' : `${rows[i0 + blank].t - e.t} ms in`}`,
  );
}
console.log('--- every blank stretch over 150 ms ---');
for (const r of runs.filter((r) => r.ms > 150)) console.log(`  ${String(r.from).padStart(6)} ms  blank ${String(r.ms).padStart(5)} ms  beat=${r.beat}${r.open ? ' (still blank at the end)' : ''}`);
console.log('--- the blank that follows the visitor pressing Return ---');
for (const r of afterReturn) console.log(`  return @${r.return} ms → blank ${r.blank} ms  beat=${r.beat}  "${r.line}"`);
const ns = afterReturn.map((r) => r.blank);
const total = runs.reduce((a, r) => a + r.ms, 0);
const span = rows.length ? rows[rows.length - 1].t - rows[0].t : 0;
console.log(
  `turns answered: ${out.events.length}; blank after Return: ${ns.length ? `${Math.min(...ns)}–${Math.max(...ns)} ms, mean ${Math.round(ns.reduce((a, b) => a + b, 0) / ns.length)} ms` : 'none seen'}`,
);
console.log(`blank in all: ${total} ms of ${span} ms (${((total / Math.max(1, span)) * 100).toFixed(1)}%)`);
console.log('page errors:', errs.length, errs.slice(0, 3).join(' | '));
