#!/usr/bin/env node
// why a click on the notice did or did not land: what is under the pointer, and what the piece
// thinks its own state is.
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=help&state=open&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1500);

const b = await page.evaluate(async () => {
  const m = await import('/src/pieces/help-bill.js');
  return m.cutBill(window.innerWidth, window.innerHeight, Math.min(2, devicePixelRatio || 1)).controls;
});
const c = b.find((x) => x.key === 'close');
const p = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
console.log('clock fps in this browser:', await page.evaluate(async () => {
  const t0 = window.__theatre.clock.frame; const r0 = performance.now();
  await new Promise((r) => setTimeout(r, 1000));
  return { framesOfClock: window.__theatre.clock.frame - t0, ms: Math.round(performance.now() - r0) };
}).then(JSON.stringify));
console.log('under the pointer:', await page.evaluate((p) => {
  const el = document.elementFromPoint(p.x, p.y);
  return { id: el?.id, tag: el?.tagName, parent: el?.parentElement?.id, showing: window.__theatre.pieces.help.showing };
}, p).then(JSON.stringify));
await page.evaluate(() => { window.__heard = []; for (const n of ['help:open', 'help:close', 'help:leave']) window.__theatre.on(n, () => window.__heard.push(n)); });
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(1500);
console.log('after click:', await page.evaluate(() => ({ showing: window.__theatre.pieces.help.showing, heard: window.__heard })).then(JSON.stringify));
await browser.close();
