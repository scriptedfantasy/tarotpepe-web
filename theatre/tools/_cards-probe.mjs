#!/usr/bin/env node
// Probe: load a judging URL headless (same flags as shot.mjs) and print every console line that
// mentions cards / timings, so drawBack/drawDeckSide/front costs show up.
import { chromium } from 'playwright';

const state = process.argv[2] ?? 'default';
const extra = process.argv[3] ?? '';
const url = `http://127.0.0.1:5173/?view=cards&state=${state}&shot=1${extra}`;
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => {
  const t = m.text();
  if (/cards|built|error|Error/i.test(t)) console.log(`[${m.type()}] ${t.slice(0, 300)}`);
});
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 120000) {
  const ready = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ready) break;
  await page.waitForTimeout(250);
}
console.log('ready in', ((Date.now() - t0) / 1000).toFixed(1), 's');
await browser.close();
