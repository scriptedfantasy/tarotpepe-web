#!/usr/bin/env node
// Measure the dialogue card across beats and frame sizes: the outer box of .cap, the caret's drawn
// box, the type sizes, and whether the speaker is named. Prints a table.
//
//   node tools/_dlg-r6-box.mjs
import { chromium } from 'playwright';

const SIZES = [
  [1600, 900],
  [1200, 1100],
  [390, 760],
];
const CASES = [
  ['dialogue', 'greeting'],
  ['dialogue', 'greeting', 'line=1'],
  ['dialogue', 'question'],
  ['dialogue', 'answer'],
  ['dialogue', 'reading'],
  ['dialogue', 'reading', 'inter=1'],
  ['dialogue', 'farewell'],
  ['flow', 'talk'],
  ['flow', 'fan'],
];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}`,
  });

const probe = () =>
  // eslint-disable-next-line no-undef
  ({
    ...(() => {
      const cap = document.querySelector('#dialogue .cap:not(.ruler)');
      if (!cap || cap.hidden) return { box: null };
      const r = cap.getBoundingClientRect();
      const caret = cap.querySelector('.caret');
      const cr = caret?.getBoundingClientRect();
      const who = cap.querySelector('.who');
      const youWho = cap.querySelector('.you-who');
      const cs = getComputedStyle(cap);
      const ans = cap.querySelector('.answer');
      return {
        box: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`,
        pos: `${r.left.toFixed(0)},${r.top.toFixed(0)}`,
        font: cs.fontSize,
        who: who ? (who.getAttribute('aria-label') || who.textContent).trim() : '',
        youWho: youWho ? (youWho.getAttribute('aria-label') || youWho.textContent).trim() : '',
        caret: cr && cr.width ? `${cr.width.toFixed(1)}x${cr.height.toFixed(1)}` : null,
        answer: ans ? (ans.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) : null,
        text: (cap.querySelector('.well')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      };
    })(),
  });

const rows = [];
const errs = [];
for (const [w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errs.push(`${w}x${h} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`${w}x${h} ${m.text()}`));
  await page.route('**/@vite/client', stub);
  for (const [view, state, extra] of CASES) {
    const u = new URL('http://127.0.0.1:5173/');
    u.searchParams.set('view', view);
    u.searchParams.set('state', state);
    u.searchParams.set('shot', '1');
    if (extra) for (const kv of extra.split('&')) u.searchParams.set(kv.split('=')[0], kv.split('=')[1]);
    await page.goto(u.toString(), { waitUntil: 'load' });
    for (let i = 0; i < 400; i++) {
      if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(700);
    const r = await page.evaluate(probe);
    rows.push({ size: `${w}x${h}`, case: `${view}/${state}${extra ? '?' + extra : ''}`, ...r });
  }
  await page.close();
}
const pad = (s, n) => String(s ?? '').padEnd(n);
console.log(pad('size', 10) + pad('case', 26) + pad('box', 16) + pad('at', 12) + pad('font', 7) + pad('who', 12) + pad('you', 12) + pad('caret', 12) + 'text');
for (const r of rows)
  console.log(pad(r.size, 10) + pad(r.case, 26) + pad(r.box, 16) + pad(r.pos, 12) + pad(r.font, 7) + pad(r.who, 12) + pad(r.youWho, 12) + pad(r.caret, 12) + (r.text || ''));
if (errs.length) console.error('\nPAGE ERRORS:\n' + [...new Set(errs)].slice(0, 10).join('\n'));
await browser.close();
