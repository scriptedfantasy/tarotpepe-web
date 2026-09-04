#!/usr/bin/env node
// Which sound cues actually reach the graph across a real visit: wait for the door to be UP,
// knock, listen; then a line, the shuffle, the fan, a pick, a turn.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
for (let i = 0; i < 600; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
await page.evaluate(() => {
  const s = window.__theatre.pieces.sound;
  window.__cues = [];
  const orig = s.play.bind(s);
  s.play = (n, o) => { window.__cues.push(n); return orig(n, o); };
});
// wait for the door to actually be up before knocking
for (let i = 0; i < 200; i++) {
  const m = await page.evaluate(() => window.__theatre.pieces.entrance?.mode);
  if (m === 'closed') break;
  await page.waitForTimeout(150);
}
console.log('door mode before the knock:', await page.evaluate(() => window.__theatre.pieces.entrance?.mode));
const grab = async (label) => {
  const c = await page.evaluate(() => { const c = window.__cues.slice(); window.__cues.length = 0; return c; });
  console.log(label.padEnd(22), c.length ? c.join(' ') : '(silence)');
};
await page.mouse.click(800, 450);
await page.waitForTimeout(6000);
await grab('the door swing');
console.log('running:', await page.evaluate(() => !!window.__theatre.pieces.sound.running));
await page.waitForTimeout(6000);
await grab('inside, before a line');
await page.keyboard.type('hello');
await page.keyboard.press('Enter');
await page.waitForTimeout(9000);
await grab('a line typed + reply');
await page.keyboard.type('can you read my cards');
await page.keyboard.press('Enter');
await page.waitForTimeout(14000);
await grab('shuffle + fan');
const pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions?.() ?? []);
if (pos.length) { await page.mouse.click(pos[5].x, pos[5].y); await page.waitForTimeout(6000); await grab('one pick'); }
await browser.close();
if (errs.length) console.log('ERRORS', errs.slice(0, 5));
