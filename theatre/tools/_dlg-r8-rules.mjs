#!/usr/bin/env node
// ROUND 8's DON'T-BREAK LIST, measured rather than eyeballed.
//
//   1 the card is ONE object: the same box for a line, a long line in takes, an intertitle, the
//     thinking mark and an open field — at three window sizes
//   2 it is bottom-centred (the dock is checked in the live visit probe, where there is a spread)
//   3 his words #3a7736, the visitor's ink, both at ONE weight, both in the caption face
//   4 nobody is named on the card
//   5 the visitor's register empties the moment they press Return
//   6 the caret is in their register and nowhere else
//   7 nothing lettered under 13 px
//   8 say() calls pepeAnim.say(text, seconds) ONCE per sentence, with the whole text
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}

const LONG =
  'The worst part has passed, and you have not noticed, because the worst part left no card behind it and no bill; it simply stopped happening one Tuesday while you were doing something else entirely.';

async function measure(label) {
  return await page.evaluate(
    async ([label, LONG]) => {
      const T = window.__theatre;
      const D = T.pieces.dialogue;
      const cap = () => document.querySelector('#dialogue .cap');
      const box = () => {
        const r = cap().getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      };
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const out = { label, w: window.innerWidth, h: window.innerHeight, boxes: {}, type: {}, notes: [] };

      // 8: every call pepeAnim.say takes while one line is said
      const anim = T.pieces.pepeAnim;
      const calls = [];
      const realSay = anim.say.bind(anim);
      anim.say = (text, seconds) => {
        calls.push({ text, seconds });
        return realSay(text, seconds);
      };

      D.clear();
      D.say('Good evening. Come closer; there is nowhere to sit, which keeps the visits honest.', { hold: 9 });
      await sleep(120);
      out.boxes.line = box();
      const line = cap().querySelector('.line');
      const cs = getComputedStyle(line);
      out.type.pepe = { color: cs.color, weight: cs.fontWeight, size: cs.fontSize, family: cs.fontFamily.split(',')[0], transform: cs.textTransform };
      out.notes.push(`pepeAnim.say calls for one sentence: ${calls.length} — ${JSON.stringify(calls.map((c) => [c.text.length, Math.round(c.seconds * 100) / 100]))}`);
      out.notes.push(`the text handed to pepeAnim is whole: ${calls[0]?.text === 'Good evening. Come closer; there is nowhere to sit, which keeps the visits honest.'}`);

      // a line long enough to be cut into takes: the card must not grow by a pixel
      calls.length = 0;
      D.say(LONG, { hold: 9 });
      await sleep(120);
      out.boxes.takes = box();
      out.notes.push(`pepeAnim.say calls for a line cut into takes: ${calls.length}`);

      // an intertitle
      D.clear();
      D.intertitle('the-moon', 1, { hold: 9 });
      await sleep(120);
      out.boxes.intertitle = box();

      // the thinking mark
      D.clear();
      D.setState('thinking');
      await sleep(200);
      out.boxes.thinking = box();
      out.notes.push(`the mark is drawn, not typed: ${cap().querySelectorAll('.think > svg path').length} pen paths, text “${cap().textContent.trim()}”`);

      // an open field, with the visitor typing
      D.clear();
      D.ask('What brings you in tonight?', { instant: true, value: '' });
      await sleep(200);
      const input = cap().querySelector('.keys');
      input.value = 'i keep starting things and not finishing them';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(120);
      out.boxes.asking = box();
      const answer = cap().querySelector('.answer');
      const ca = getComputedStyle(answer);
      out.type.visitor = { color: ca.color, weight: ca.fontWeight, size: ca.fontSize, family: ca.fontFamily.split(',')[0], transform: ca.textTransform };
      out.notes.push(`the caret is in the visitor's register only: reply=${cap().querySelectorAll('.reply .caret').length} well=${cap().querySelectorAll('.well .caret').length}`);
      out.notes.push(`the caret is an upright stroke: viewBox ${cap().querySelector('.caret svg')?.getAttribute('viewBox')}`);
      out.notes.push(`nobody is named: ${!/TAROT PEPE|VISITOR|YOU:/i.test(cap().textContent)}`);

      // 5: Return empties their register and leaves his line standing
      const before = cap().querySelector('.well').textContent.trim().slice(0, 24);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await sleep(120);
      out.boxes.afterReturn = box();
      out.notes.push(`Return: their register “${cap().querySelector('.answer')?.textContent ?? '(gone)'}”, his line still “${cap().querySelector('.well').textContent.trim().slice(0, 24)}” (was “${before}”), card up: ${!cap().hidden}`);

      // 7: the type floor
      out.notes.push(`caption ${cs.fontSize}, speaker face ${getComputedStyle(cap()).fontSize}`);
      anim.say = realSay;
      D.clear();
      return out;
    },
    [label, LONG],
  );
}

const sizes = [
  [1600, 900],
  [1100, 700],
  [390, 760],
];
for (const [w, h] of sizes) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(2000);
  const r = await measure(`${w}x${h}`);
  const boxes = Object.entries(r.boxes);
  const same = boxes.every(([, b]) => b.w === boxes[0][1].w && b.h === boxes[0][1].h && b.x === boxes[0][1].x && b.y === boxes[0][1].y);
  console.log(`\n=== ${r.label} ===`);
  for (const [k, b] of boxes) console.log(`  ${k.padEnd(12)} x=${b.x} y=${b.y} w=${b.w} h=${b.h}`);
  console.log(`  ONE OBJECT: ${same ? 'yes — every beat is the same box' : 'NO — the card changed'}`);
  console.log(`  his:     ${JSON.stringify(r.type.pepe)}`);
  console.log(`  visitor: ${JSON.stringify(r.type.visitor)}`);
  for (const n of r.notes) console.log(`  · ${n}`);
}
console.log('\npage errors:', errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
