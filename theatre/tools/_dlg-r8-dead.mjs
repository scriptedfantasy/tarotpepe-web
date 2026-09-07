#!/usr/bin/env node
// THE MODEL DIES AND THE SCRIPT ANSWERS INSTEAD. The health check passes, so the room believes it
// has a live voice; the turn itself hangs for three seconds and then fails, and `mind` falls back
// to the written brain. The card must behave exactly as it does on a good turn: his question
// holds, the thinking mark takes the register, the script's line replaces the mark, and at no
// point is there a blank card.
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
// the turn hangs and then dies; the health endpoint is left alone
await page.route('**/api/pepe', async (route) => {
  await new Promise((r) => setTimeout(r, 3000));
  await route.abort('failed');
});
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
const out = await page.evaluate(async () => {
  const T = window.__theatre;
  const D = T.pieces.dialogue, M = T.pieces.mind, F = T.pieces.flow;
  const cap = () => document.querySelector('#dialogue .cap');
  const rows = [];
  const t0 = performance.now();
  const sample = setInterval(() => {
    const c = cap();
    const up = !!(c && !c.hidden);
    const words = c ? [...c.querySelectorAll('.line .w')].filter((w) => !w.classList.contains('hid')).length : 0;
    const dots = c ? c.querySelectorAll('.think').length : 0;
    rows.push({ t: Math.round(performance.now() - t0), up: up ? 1 : 0, dots, words, his: up && (words > 0 || dots > 0) ? 1 : 0, text: (c?.querySelector('.well')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 30) });
  }, 40);
  if (M.ready) await M.ready;
  const live = M.available;
  D.clear();
  // stand a question up, and pretend flow is inside listen(): the beat it publishes is 'reply'
  const asked = D.ask('What brings you in tonight?', { instant: true, value: 'i keep starting things and not finishing them' });
  await new Promise((r) => setTimeout(r, 800));
  document.querySelector('#dialogue .cap .keys').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await asked;
  F.beat = 'reply';
  const turn = await M.turn('i keep starting things and not finishing them');
  const lines = [];
  const src = turn.sentences;
  if (src && typeof src[Symbol.asyncIterator] === 'function') {
    for await (const s of src) lines.push(s);
  } else if (Array.isArray(src)) lines.push(...src);
  for (const s of lines.slice(0, 2)) await D.say(s, { hold: 1.2 });
  F.beat = 'talk';
  await new Promise((r) => setTimeout(r, 400));
  clearInterval(sample);
  D.clear();
  return { live, lines, rows };
});
console.log('the room believed it had a live voice:', out.live);
console.log('the script answered:', JSON.stringify(out.lines.slice(0, 2)));
let prev = '';
for (const r of out.rows) {
  const sig = `${r.up ? (r.dots ? 'DOTS' : r.text ? 'line' : 'bare') : 'off '} “${r.text}”`;
  if (sig === prev) continue;
  prev = sig;
  console.log(`  ${String(r.t).padStart(6)} ms  ${sig}`);
}
const blank = out.rows.filter((r) => !r.his);
console.log(`samples with nothing of his on the card: ${blank.length} of ${out.rows.length}${blank.length ? ` (first at ${blank[0].t} ms)` : ''}`);
console.log('page errors:', errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
