#!/usr/bin/env node
// A long line is still cut into takes inside the standing card, and the LAST take is the one that
// holds — for as long as it takes, with nothing coming to clear it.
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
const out = await page.evaluate(async () => {
  const D = window.__theatre.pieces.dialogue;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cap = () => document.querySelector('#dialogue .cap');
  const well = () => (cap().querySelector('.well')?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const LONG =
    'The worst part has passed, and you have not noticed, because the worst part left no card behind it and no bill; it simply stopped happening one Tuesday while you were doing something else entirely.';
  D.clear();
  const t0 = performance.now();
  const seen = [];
  const said = D.say(LONG, { hold: 1.2 });
  const poll = setInterval(() => {
    const w = well();
    if (!seen.length || seen[seen.length - 1].text !== w) seen.push({ at: Math.round(performance.now() - t0), text: w });
  }, 60);
  await said;
  const resolvedAt = Math.round(performance.now() - t0);
  await sleep(4000); // four seconds of nothing at all following it
  clearInterval(poll);
  const out = {
    resolvedAt,
    stillUp: !cap().hidden,
    holding: well(),
    fourSecondsOn: well(),
    takes: seen.filter((s) => s.text).map((s) => `${s.at}ms “${s.text.slice(0, 40)}…”`),
    endsTheLine: LONG.toUpperCase().endsWith(well().slice(-30)),
  };
  D.clear();
  return out;
});
console.log('takes seen:');
for (const t of out.takes) console.log('   ', t);
console.log('say() resolved at', out.resolvedAt, 'ms');
console.log('four seconds later the card is still up:', out.stillUp);
console.log('what is holding:', JSON.stringify(out.fourSecondsOn.slice(0, 70)));
console.log('and it is the LAST take of the line:', out.endsTheLine);
console.log('page errors:', errs.length, errs.slice(0, 2).join(' | '));
await browser.close();
