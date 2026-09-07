#!/usr/bin/env node
// A VISITOR WHO NEVER CLICKS MUST NOT HANG THE EVENING. Say a line in three takes and touch
// nothing: every take must take itself off after TAKE_WAIT, say() must resolve, and the arrow must
// not be up on the last take, where there is nothing to go on to.
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 500; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
const out = await page.evaluate(async () => {
  const D = window.__theatre.pieces.dialogue;
  const cap = document.querySelector('#dialogue .cap');
  const LONG =
    'you keep treating the first step as evidence that you must already know the whole route, anon. meanwhile the dog has spotted the edge and you are busy inspecting the stick; nothing has failed yet, so stop rehearsing the postmortem and put one unfinished thing back in your hands.';
  D.clear();
  const t0 = performance.now();
  let resolved = null;
  D.say(LONG, { hold: 1.2 }).then(() => (resolved = Math.round(performance.now() - t0)));
  const marks = [];
  let last = null;
  const arrow = () => !cap.querySelector('.next')?.hidden;
  for (let i = 0; i < 400; i++) {
    const t = (cap.querySelector('.well')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (t !== last) {
      marks.push({ at: Math.round(performance.now() - t0), take: t.slice(0, 34) });
      last = t;
    }
    if (resolved != null && performance.now() - t0 > resolved + 1200) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const arrowAtEnd = arrow();
  D.clear();
  return { marks, resolved, arrowAtEnd };
});
console.log('takes, unattended:');
for (const m of out.marks) console.log(`   ${String(m.at).padStart(6)} ms  “${m.take}…”`);
const gaps = out.marks.slice(1).map((m, i) => m.at - out.marks[i].at);
console.log('gaps between takes (ms):', gaps.join(' '));
console.log('say() resolved at', out.resolved, 'ms with nobody touching anything');
console.log('the arrow on the LAST take:', out.arrowAtEnd, '(must be false)');
console.log('page errors:', errs.length, errs.slice(0, 2).join(' | '));
await browser.close();
