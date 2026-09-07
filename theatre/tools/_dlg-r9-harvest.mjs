#!/usr/bin/env node
// Harvest REAL lines out of the live model: run the mind's own transcript view and keep every
// sentence Pepe said, so the take-splitter is measured against what he actually writes.
//   node tools/_dlg-r9-harvest.mjs > /abs/lines.json
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/?view=mind&state=transcript', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 900; i++) {
  const done = await page.evaluate(() => window.__mindDone === true).catch(() => false);
  if (done) break;
  await page.waitForTimeout(300);
}
const text = await page.evaluate(() => document.querySelector('#transcript')?.innerText ?? '');
console.error('transcript chars:', text.length, 'errors:', errs.length);
console.log(JSON.stringify({ text }, null, 1));
await browser.close();
