#!/usr/bin/env node
// The conversation as a transcript: type a line, wait until the field is back, and print every
// sentence he said in between. No screenshots, so nothing is missed.
import { chromium } from 'playwright';
const LINES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'hello',
      'I keep starting things and not finishing them',
      "not yet, I'd rather talk",
      'what do you do when nobody comes in',
      'do you ever get tired of being asked about the future',
      'can you read my cards',
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
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
const st = () =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    const line = cap && !cap.hidden ? (cap.textContent || '').replace(/\s+/g, ' ').trim() : null;
    return {
      beat: window.__theatre.pieces.flow?.beat,
      intent: window.__theatre.pieces.flow?.intent,
      field: !!document.querySelector('#dialogue input.keys'),
      line,
      fan: window.__theatre.pieces.reveal?.fanCount ?? 0,
    };
  });
const seen = [];
async function collectUntil(fn, seconds) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const s = await st();
    if (s.line && seen[seen.length - 1] !== s.line) seen.push(s.line);
    if (fn(s)) return s;
    await page.waitForTimeout(100);
  }
  return null;
}
await page.mouse.click(800, 450);
await collectUntil((s) => s.field && s.beat === 'talk', 90);
console.log('— he opens —');
seen.splice(0).forEach((l) => console.log('   PEPE:', l));
for (const line of LINES) {
  await page.keyboard.type(line, { delay: 6 });
  await page.keyboard.press('Enter');
  console.log(`\n   YOU: ${line}`);
  const done = await collectUntil((s) => s.field && s.beat === 'talk', 60);
  const said = seen.splice(0);
  said.forEach((l) => console.log('   PEPE:', l));
  const s = await st();
  console.log(`   [intent=${s.intent} fan=${s.fan} sentences=${said.length}]`);
  if (!done) {
    console.log('   (the field did not come back — the cards must be coming out)');
    break;
  }
}
await browser.close();
if (errs.length) console.error('PAGE ERRORS:\n' + errs.slice(0, 8).join('\n'));
