#!/usr/bin/env node
// Dump every console message from a judging view (used to time the cards build).
import { chromium } from 'playwright';
const view = process.argv[2] || 'cards';
const state = process.argv[3] || 'back';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log(`[${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', String(e)));
await page.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}' }),
);
const t0 = Date.now();
await page.goto(`http://127.0.0.1:5173/?view=${view}&state=${state}&shot=1`, { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 120000) {
  let r = false;
  try { r = await page.evaluate(() => window.__theatreReady === true); } catch {}
  if (r) break;
  await page.waitForTimeout(200);
}
await page.waitForTimeout(1500);
await browser.close();
console.log('total', Date.now() - t0, 'ms');
