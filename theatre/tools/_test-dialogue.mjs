#!/usr/bin/env node
// Exercises the live dialogue API (typing on the 12fps clock, ask() with the field, reply()).
// Writes three frames to /tmp/dialogue-live-*.png. Dialogue builder's private tool.
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:5173/?only=camera,dialogue&shot=1';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__theatreReady !== false, { timeout: 60000 });

// 1. typing, caught mid-line
await page.evaluate(() => {
  const d = window.__theatre.pieces.dialogue;
  d.folio('greeting');
  window.__p = d.say(d.script.greeting[0]);
});
await page.waitForTimeout(1100);
const typed1 = await page.evaluate(() => document.querySelectorAll('#dialogue .text .c:not(.hid)').length);
await page.screenshot({ path: '/tmp/dialogue-live-typing.png' });
const t0 = Date.now();
await page.evaluate(() => window.__p);
console.log('typed after 1.1s:', typed1, 'chars; line resolved after', Date.now() - t0, 'ms more');

// 2. ask(): the field appears after the prompt; type an answer; Return resolves
await page.evaluate(() => {
  const d = window.__theatre.pieces.dialogue;
  d.folio('question');
  window.__a = d.ask();
});
await page.waitForSelector('#dialogue .field', { timeout: 20000 });
await page.waitForTimeout(300);
await page.focus('#dialogue .field');
await page.keyboard.type('my brother has not called since March', { delay: 20 });
await page.screenshot({ path: '/tmp/dialogue-live-field.png' });
await page.keyboard.press('Enter');
const answer = await page.evaluate(() => window.__a);
console.log('answer:', JSON.stringify(answer));
const fieldGone = await page.evaluate(() => !document.querySelector('#dialogue .field'));
console.log('field removed:', fieldGone);

// 3. the reply, folded back verbatim
await page.evaluate((a) => {
  const d = window.__theatre.pieces.dialogue;
  window.__r = d.say(d.reply(a));
}, answer);
await page.waitForTimeout(4200);
await page.screenshot({ path: '/tmp/dialogue-live-reply.png' });
const replyText = await page.evaluate(() => document.querySelector('#dialogue .text').textContent);
console.log('reply:', replyText);

// 4. read(): two captions for a card position, with the reference line
await page.evaluate(() => {
  const d = window.__theatre.pieces.dialogue;
  d.folio('reading');
  window.__rd = d.read('ten-of-wands', 2, { hold: 0.2 });
});
await page.waitForTimeout(2500);
console.log('read ref:', await page.evaluate(() => document.querySelector('#dialogue .who').textContent));
await page.evaluate(() => window.__rd);
console.log('read done:', await page.evaluate(() => document.querySelector('#dialogue .text').textContent));

await browser.close();
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log('ok');
