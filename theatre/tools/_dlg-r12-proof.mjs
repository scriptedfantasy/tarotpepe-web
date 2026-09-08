#!/usr/bin/env node
// ROUND 12 — THE CARD, LETTERED. The proof frames, and what a strike of it costs.
//
// The user, on the notice: "i love this font - can you we use this in the chat box as well?" So
// every word on the placard is cut in the sign hand now. This drives the card for real — say(),
// ask(), a keyboard typing into the field — and saves the frames the change has to be judged on,
// on a laptop and on a phone:
//
//   a-typing    a take of his, half struck
//   a-whole     the same take, struck out, with the arrow waiting at the corner
//   b-visitor   the visitor writing, their line in ink under his in green, the caret standing
//   c-exchange  both registers carrying words at once
//   d-dock      the pick prompt, at the head of the frame, with the spread under it
//
// Then it measures the redraw: a full two-line take, re-cut at a fresh boil tick, fifty times, on
// the very canvas the card uses. That number has to stay well inside a 12 fps frame (83 ms), and
// well inside the ~8 ms this piece is allowed of it.
//
//   node tools/_dlg-r12-proof.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = `${ROOT}/public/progress`;
mkdirSync(OUT, { recursive: true });

const NO_HMR =
  'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});' +
  'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

const LONG =
  'You keep treating the first step as evidence that you must already know the whole route. ' +
  'Nothing has failed yet, so stop rehearsing the postmortem and put one unfinished thing back in your hands.';
const SHORT = 'The deck is face down and it can stay that way as long as you like.';
const TYPED = 'I keep starting things and not finishing them, and I would like to know why.';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});

const errs = [];
async function open(viewport, url) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errs.push(`${viewport.width}x${viewport.height} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`${viewport.width}x${viewport.height} ${m.text()}`));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: NO_HMR }));
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
  await page.waitForTimeout(900);
  return { context, page };
}

const card = (page) =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    if (!cap || cap.hidden) return null;
    const r = cap.getBoundingClientRect();
    const arrow = cap.querySelector('.next');
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      em: +getComputedStyle(cap).fontSize.replace('px', ''),
      well: (cap.querySelector('.well')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      reply: (cap.querySelector('.reply')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      arrow: !!(arrow && !arrow.hidden),
      caret: !!cap.querySelector('.caret'),
      canvases: [...cap.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height}`),
    };
  });

// the card and a hand's breadth of the picture round it, so the frame is about the card
async function shotCard(page, name, pad = 26) {
  const c = await card(page);
  const vp = page.viewportSize();
  const clip = c
    ? {
        x: Math.max(0, c.x - pad),
        y: Math.max(0, c.y - pad),
        width: Math.min(vp.width, c.w + 2 * pad),
        height: Math.min(vp.height - Math.max(0, c.y - pad), c.h + 2 * pad),
      }
    : undefined;
  await page.screenshot({ path: `${OUT}/${name}.png`, clip });
  return c;
}

const log = [];
async function pass(label, viewport) {
  const { context, page } = await open(viewport, 'http://127.0.0.1:5173/?view=dialogue&state=greeting');

  // ---- (a) a take of his, mid-strike and struck out -------------------------------------------
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    window.__done = false;
    D.say(t, { hold: 1.2 }).then(() => (window.__done = true));
  }, LONG);
  await page.waitForTimeout(1100);
  const a1 = await shotCard(page, `dlg-r12-${label}-a-typing`);
  for (let i = 0; i < 150 && !(await card(page))?.arrow; i++) await page.waitForTimeout(100);
  const a2 = await shotCard(page, `dlg-r12-${label}-a-whole`);
  log.push([`${label} (a) mid-strike`, { chars: a1.well.length, card: `${a1.w}x${a1.h}`, cap: +(a1.em * 0.72).toFixed(1) }]);
  log.push([`${label} (a) struck out`, { take: a2.well.slice(0, 54), arrow: a2.arrow }]);

  // ---- (b) and (c) the visitor writing, under a line of his ------------------------------------
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    window.__answer = null;
    D.say(t, { hold: 0.2 }).then(() => D.ask('', {}).then((v) => (window.__answer = v)));
  }, SHORT);
  for (let i = 0; i < 200 && !(await card(page))?.caret; i++) await page.waitForTimeout(100);
  const half = Math.round(TYPED.length * 0.45);
  await page.focus('#dialogue input.keys');
  await page.keyboard.type(TYPED.slice(0, half), { delay: 8 });
  await page.waitForTimeout(300);
  const b = await shotCard(page, `dlg-r12-${label}-b-visitor`);
  await page.keyboard.type(TYPED.slice(half), { delay: 8 });
  await page.waitForTimeout(300);
  const c = await shotCard(page, `dlg-r12-${label}-c-exchange`);
  log.push([`${label} (b) visitor typing`, { his: b.well.slice(0, 34), theirs: b.reply.slice(-30), caret: b.caret }]);
  log.push([`${label} (c) both registers`, { his: c.well.length, theirs: c.reply.length, card: `${c.w}x${c.h}` }]);

  // ---- (e) sorts the case has not got, and the boil -------------------------------------------
  // He answers in the visitor's language now. A line comes back with a lowercase ø, a curly quote,
  // a script the case has never held: it must letter, in this hand, with a short low dash standing
  // for what it cannot cut — never a blank and never a system font.
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    D.say(t, { hold: 0.2 }).then(() => D.ask('', { value: 'Ich möchte wissen «warum» — привет, 日本' }));
  }, 'Straße, Ø, Å, Ł — “quoted”, café, naïve, 3 × 5 = 15.');
  for (let i = 0; i < 200 && !(await card(page))?.caret; i++) await page.waitForTimeout(100);
  await page.waitForTimeout(400);
  const e = await shotCard(page, `dlg-r12-${label}-e-outside-the-case`);
  log.push([`${label} (e) outside the case`, { his: e.well.slice(0, 40), theirs: e.reply.slice(0, 40) }]);

  // THE BOIL. Two strikes of the same held line, two stepped frames apart: the words must not be
  // the same words twice, and they must still be the same words.
  const boil = await page.evaluate(async () => {
    const shot = () => document.querySelector('#dialogue .well canvas')?.toDataURL() ?? '';
    const a = shot();
    await new Promise((r) => setTimeout(r, 200));
    const b = shot();
    const cap = document.querySelector('#dialogue .cap');
    return { differs: !!a && a !== b, text: (cap.querySelector('.well')?.textContent ?? '').length };
  });
  log.push([`${label} the line boils`, boil]);

  // ---- the cost of a strike ---------------------------------------------------------------------
  const cost = await page.evaluate(async () => {
    const ink = await import('/src/pieces/dialogue-ink.js');
    const sign = await import('/src/pieces/titles-sign.js');
    const cap = document.querySelector('#dialogue .cap');
    const em = +getComputedStyle(cap).fontSize.replace('px', '');
    const capH = em * 0.72, lead = em * 1.25;
    const live = cap.querySelector('.well canvas');
    const width = live ? live.getBoundingClientRect().width : 600;
    // a take that fills both lines of his register, wrapped the way the card wraps it
    const text = sign.signFold('You keep treating the first step as evidence that you must already know the route.');
    const words = text.split(' ');
    const lines = [];
    let line = [], at = 0;
    for (const w of words) {
      const next = [...line, w].join(' ');
      if (line.length && sign.signWidth(next, { capH, tracking: 0.14 }) > width - capH * 0.3) {
        lines.push({ text: line.join(' '), start: at });
        at += line.join(' ').length + 1;
        line = [w];
      } else line.push(w);
    }
    if (line.length) lines.push({ text: line.join(' '), start: at });
    const two = lines.slice(0, 2);
    const scratch = document.createElement('canvas');
    const opts = { width, capH, lead, tracking: 0.14, pen: Math.max(1.3, capH * 0.125), color: '#3a7736', bleed: Math.ceil(capH * 0.5) };
    for (let i = 0; i < 8; i++) ink.drawBlock(scratch, two, { ...opts, boil: 900 + i }); // warm
    const ts = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      ink.drawBlock(scratch, two, { ...opts, boil: i });
      ts.push(performance.now() - t0);
    }
    ts.sort((a, b) => a - b);
    return {
      chars: two.reduce((n, l) => n + l.text.length, 0),
      lines: two.length,
      canvas: `${scratch.width}x${scratch.height}`,
      median: +ts[25].toFixed(2),
      p95: +ts[47].toFixed(2),
      max: +ts[49].toFixed(2),
    };
  });
  log.push([`${label} redraw of a full two-line take`, cost]);
  await context.close();
  return cost;
}

const laptop = await pass('laptop', { width: 1600, height: 900 });
const phone = await pass('phone', { width: 390, height: 844 });

// ---- (d) the pick prompt, docked at the head, with the spread under it --------------------------
for (const [label, viewport] of [['laptop', { width: 1600, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const { context, page } = await open(viewport, 'http://127.0.0.1:5173/?view=flow&state=fan');
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/dlg-r12-${label}-d-dock.png` });
  const c = await card(page);
  log.push([`${label} (d) the dock`, c ? { top: c.y, h: c.h, prompt: c.well.slice(0, 44) } : 'no card']);
  await context.close();
}

await browser.close();
for (const [k, v] of log) console.log(k.padEnd(38), typeof v === 'string' ? v : JSON.stringify(v));
console.log('');
const worst = Math.max(laptop.max, phone.max);
console.log(errs.length ? `PAGE ERRORS\n  ${errs.join('\n  ')}` : 'no page errors');
console.log(worst < 8 ? `PASS — the worst strike of a two-line take was ${worst} ms, inside the 8 ms budget` : `FAIL — a strike cost ${worst} ms`);
process.exit(errs.length || worst >= 8 ? 1 : 0);
