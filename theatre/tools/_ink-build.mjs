#!/usr/bin/env node
// scratch: load the page once and print every console line plus the network timing of /baked/*,
// so the ink build's seconds can be split into "the browser served nothing for 4 s" and real work.
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5173/?view=camera&state=home&shot=1';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};}\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay{}' }));
const t0 = Date.now();
const t = () => ((Date.now() - t0) / 1000).toFixed(2).padStart(6);
page.on('console', (m) => {
  const s = m.text();
  if (/theatre|bake|ink/i.test(s)) console.log(`${t()}s  ${s}`);
});
page.on('request', (r) => { if (/baked|\.glb|cards\//.test(r.url())) console.log(`${t()}s  → ${r.url().split('/').slice(3).join('/')}`); });
page.on('response', (r) => { if (/baked|\.glb|cards\//.test(r.url())) console.log(`${t()}s  ← ${r.status()} ${r.url().split('/').slice(3).join('/')}`); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
console.log(`${t()}s  load event`);
while (Date.now() - t0 < +(process.env.LIMIT ?? 120000)) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
console.log(`${t()}s  ready`);
await browser.close();
