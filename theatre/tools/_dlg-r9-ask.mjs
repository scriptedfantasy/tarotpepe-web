#!/usr/bin/env node
// THE PACING CONTRACT. `ask` says its prompt and opens the visitor's block under it — so a prompt
// too long for the well must NOT open the field under take one of three. Watched frame by frame:
// the field may appear only after the last take of the prompt is up, and the arrow may never be up
// at the same time as the field (or as the caret, or as the microphone, which stands only with it).
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
  const PROMPT =
    'that is rarely a time problem, anon; it is usually a negotiation with the self, and the self has terrible project management, so tell me which of the unfinished things you would miss if somebody quietly took it away tonight.';
  D.clear();
  const t0 = performance.now();
  let answered = false;
  D.ask(PROMPT, { hold: 0.3 }).then(() => (answered = true));
  const frames = [];
  let takes = 0, last = '';
  let clash = 0, fieldUnderTake = 0;
  for (let i = 0; i < 400; i++) {
    const well = (cap.querySelector('.well')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const field = !!cap.querySelector('input.keys');
    const arrow = !!cap.querySelector('.next') && !cap.querySelector('.next').hidden;
    const caret = !!cap.querySelector('.caret');
    // round 10 took the microphone off the card; `!undefined` was reading TRUE on every frame and
    // the clash counter below has been counting every frame the arrow was up ever since
    const micEl = document.querySelector('#dialogue .mic');
    const mic = !!micEl && !micEl.hidden;
    if (well !== last) {
      takes++;
      last = well;
      frames.push({ at: Math.round(performance.now() - t0), take: takes, field, well: well.slice(0, 30) });
    }
    if (arrow && (field || caret || mic)) clash++;
    if (field && !answered) {
      // the field is open: nothing of the prompt may still be waiting
      const moreComing = arrow;
      if (moreComing) fieldUnderTake++;
    }
    if (field) break;
    // nobody clicks: the fallback carries it
    await new Promise((r) => setTimeout(r, 100));
  }
  const openedAt = Math.round(performance.now() - t0);
  const wellAtOpen = (cap.querySelector('.well')?.textContent ?? '').replace(/\s+/g, ' ').trim();
  D.clear();
  return {
    takesBeforeTheField: takes,
    frames,
    openedAt,
    fieldOpenedOnTheLastTake: PROMPT.toLowerCase().endsWith(wellAtOpen.toLowerCase().slice(-28)),
    arrowClashWithFieldOrCaretOrMic: clash,
    fieldUnderATakeStillWaiting: fieldUnderTake,
  };
});
console.log('the prompt, take by take, with nobody clicking:');
for (const f of out.frames) console.log(`   ${String(f.at).padStart(6)} ms  take ${f.take}  field:${f.field}  “${f.well}…”`);
console.log('the field opened at', out.openedAt, 'ms, on the LAST take:', out.fieldOpenedOnTheLastTake);
console.log('the field ever opened under a take still waiting:', out.fieldUnderATakeStillWaiting, '(must be 0)');
console.log('the arrow ever up beside the field / caret / microphone:', out.arrowClashWithFieldOrCaretOrMic, '(must be 0)');
console.log('page errors:', errs.length, errs.slice(0, 2).join(' | '));
await browser.close();
