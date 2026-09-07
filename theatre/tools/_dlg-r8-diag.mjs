#!/usr/bin/env node
// why is the evening not starting under the probe?
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)));
page.on('console', (m) => console.log('console:', m.type(), m.text().slice(0, 200)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
console.log('ready. state:', JSON.stringify(await page.evaluate(() => ({ keys: Object.keys(window.__theatre?.pieces ?? {}), beat: window.__theatre?.pieces?.flow?.beat, entrance: window.__theatre?.pieces?.entrance?.mode }))));
await page.mouse.click(800, 450);
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1500);
  console.log(
    i,
    JSON.stringify(
      await page.evaluate(() => ({
        beat: window.__theatre?.pieces?.flow?.beat,
        ent: window.__theatre?.pieces?.entrance?.mode,
        shot: window.__theatre?.pieces?.camera?.current,
        capUp: !!document.querySelector('#dialogue .cap') && !document.querySelector('#dialogue .cap').hidden,
        text: (document.querySelector('#dialogue .cap')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
        asking: window.__theatre?.pieces?.dialogue?.asking,
      })),
    ),
  );
}
await browser.close();
