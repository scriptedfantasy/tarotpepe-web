#!/usr/bin/env node
// Is the drawn card EVER on screen with no word inked on it? The critic caught it in 2 of ~24
// stills; a 150 ms probe found no blank stretch, which said it was the ONE frame between the card
// being drawn and the clock's first tick.
//
// So the proof is synchronous rather than statistical: call say() / ask() / intertitle() and, in
// the same task — before any frame can be painted — ask whether the card is drawn AND a word is
// inked on it. If both are true at that instant there is no frame in which one is true and the
// other is not.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
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
const out = await page.evaluate(async () => {
  const D = window.__theatre.pieces.dialogue;
  const look = (what) => {
    const cap = document.querySelector('#dialogue .cap');
    const up = !!(cap && !cap.hidden);
    const svg = cap?.querySelector('svg.placard');
    const drawn = !!(svg && svg.querySelectorAll('path').length >= 4);
    const words = cap ? [...cap.querySelectorAll('.line .w')] : [];
    const inked = words.filter((w) => !w.classList.contains('hid')).length;
    const text = (cap?.textContent || '').replace(/\s+/g, ' ').trim();
    const lettered = cap ? cap.querySelectorAll('canvas').length : 0;
    return { what, up, drawn, words: words.length, inked, lettered, text: text.slice(0, 46), rules: svg ? svg.querySelectorAll('path').length - 5 : 0 };
  };
  const rows = [];
  const lines = [
    'Good evening.',
    'You do not have to have a question.',
    'The worst part has passed. You have not noticed, because the worst part left no card.',
  ];
  for (const l of lines) {
    D.say(l, { hold: 9, who: true });
    rows.push(look('say:' + l.slice(0, 14)));
  }
  D.clear();
  D.intertitle('the-moon', 1, { hold: 9 });
  rows.push(look('intertitle'));
  D.clear();
  D.ask('What brings you in tonight?', { instant: true, value: '' });
  rows.push(look('ask (the instant it is said)'));
  await new Promise((r) => setTimeout(r, 60));
  rows.push(look('ask (block open, nothing typed)'));
  const cap = document.querySelector('#dialogue .cap');
  rows.push({ what: 'ask: labels on card', labels: [...cap.querySelectorAll('div')].map((d) => d.className).join(','), answer: cap.querySelector('.answer')?.textContent ?? null });
  D.clear();
  return rows;
});
for (const r of out) console.log(JSON.stringify(r));
const bad = out.filter((r) => r.up !== undefined && (!r.up || !r.drawn || (r.words > 0 && r.inked < 1)));
console.log(bad.length ? `FAIL: ${bad.length} card(s) drawn without a word` : 'PASS: the card and its first word arrive together');
console.log('page errors:', errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
