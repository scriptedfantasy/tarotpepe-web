#!/usr/bin/env node
// what the notice costs: how long cutting the two plates takes, and how long a frame of it takes
// to blit. Run at each frame we ship to.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
for (const [W, H] of [[1600, 900], [1200, 1100], [390, 760]]) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 200)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
  await page.goto('http://127.0.0.1:5173/?view=help&state=closed&shot=1', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
  console.log(`${W}x${H}`.padEnd(10), await page.evaluate(async () => {
    const m = await import('/src/pieces/help-bill.js');
    const dpr = Math.min(2, devicePixelRatio || 1);
    const t0 = performance.now();
    const b = m.cutBill(innerWidth, innerHeight, dpr);
    const cut = performance.now() - t0;
    const c = document.createElement('canvas');
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext('2d');
    const t1 = performance.now();
    for (let i = 0; i < 30; i++) { g.clearRect(0, 0, c.width, c.height); g.drawImage(b.plates[i % 2], 0, 0, b.sheet.w + 2 * b.bleed, b.sheet.h + 2 * b.bleed); }
    const blit = (performance.now() - t1) / 30;
    return `cut ${cut.toFixed(0)} ms   one strike blitted ${blit.toFixed(2)} ms   sheet ${b.sheet.w}x${b.sheet.h}`;
  }));
  await page.close();
}
await browser.close();
