#!/usr/bin/env node
// Can the visit be heard? Hook sound.play and count the cues that actually reach a running
// AudioContext during the door, the greeting and one exchange.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
await page.evaluate(() => {
  const s = window.__theatre.pieces.sound;
  window.__cues = [];
  const orig = s.play.bind(s);
  s.play = (n) => {
    window.__cues.push([Math.round(performance.now()), n, !!s.running, !!s.muted]);
    return orig(n);
  };
});
console.log('before the click:', await page.evaluate(() => ({ running: !!window.__theatre.pieces.sound.running, muted: !!window.__theatre.pieces.sound.muted })));
await page.mouse.click(800, 450);
await page.waitForTimeout(9000);
console.log('after the door:', await page.evaluate(() => ({ running: !!window.__theatre.pieces.sound.running, cues: window.__cues })));
await page.keyboard.type('hello');
await page.keyboard.press('Enter');
await page.waitForTimeout(9000);
console.log('after a line:', await page.evaluate(() => window.__cues.map((c) => c[1]).join(' ')));
await browser.close();
