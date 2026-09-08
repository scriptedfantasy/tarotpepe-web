// _bill-credit — the notice open, laptop and phone, to look at the room the credit line has.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = new URL('../public/progress/', import.meta.url).pathname;
const browser = await chromium.launch();
for (const [label, w, h] of [['desk', 1280, 800], ['phone', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/?view=help&state=open`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}bill-credit-${label}.png` });
  console.log(label, 'saved');
  await page.close();
}
await browser.close();
