#!/usr/bin/env node
// scratch: print the page's console lines (with timestamps) until it is ready.
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://127.0.0.1:5173/?view=camera&state=home&shot=1';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const t0 = Date.now();
const t = () => ((Date.now() - t0) / 1000).toFixed(2).padStart(6);
page.on('console', (m) => process.stdout.write(`${t()}s ${m.type()} ${m.text()}\n`));
page.on('pageerror', (e) => process.stdout.write(`${t()}s PAGEERROR ${e}\n`));
page.on('request', (r) => { if (/baked/.test(r.url())) process.stdout.write(`${t()}s REQ ${r.url().split('/').pop()}\n`); });
page.on('response', (r) => { if (/baked/.test(r.url())) process.stdout.write(`${t()}s RES ${r.status()} ${r.url().split('/').pop()}\n`); });
page.on('requestfinished', (r) => { if (/baked/.test(r.url())) process.stdout.write(`${t()}s FIN ${r.url().split('/').pop()}\n`); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
for (let i = 0; i < 600; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(250);
}
process.stdout.write(`${t()}s ready\n`);
await browser.close();
