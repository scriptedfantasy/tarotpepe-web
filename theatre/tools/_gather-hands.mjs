// _gather-hands — frames of the rake: are his hands drawn OVER the pile as it comes up?
// Opens the reveal piece's motion state `gather` and takes a frame every 0.6 s.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = new URL('../public/progress/', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`${BASE}/?view=reveal&state=gather`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__ready === true || document.body.dataset.ready === '1', null, { timeout: 60000 }).catch(() => {});
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}gather-hands-${i}.png` });
}
console.log('saved gather-hands-0..5');
await browser.close();
