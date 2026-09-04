#!/usr/bin/env node
// scratch (pepe r6): open a judging view and print every console line matching a pattern.
//   node tools/_pepe-log6.mjs "?view=pepe&state=talk&shot=1" "\\[pepe\\]"
import { chromium } from 'playwright';
const q = process.argv[2] ?? '?view=pepe&state=talk&shot=1';
const re = new RegExp(process.argv[3] ?? '\\[pepe\\]|\\[theatre\\]');
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => { if (re.test(m.text())) console.log(m.type() === 'error' ? 'ERR ' : '    ', m.text()); });
page.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 300)));
const t0 = Date.now();
await page.goto('http://127.0.0.1:5173/' + q, { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 120000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close();
