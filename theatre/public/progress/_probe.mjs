import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://127.0.0.1:5173/?view=cards&state=default&shot=1';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[console:' + m.type() + ']', m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', String(e)));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
console.log('loaded', Date.now() - t0, 'ms');
for (let i = 0; i < 45; i++) {
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    const ov=[...document.querySelectorAll('#overlay > *')].map(e=>e.id+':'+e.children.length+':'+(e.textContent||'').trim().slice(0,40)).join(' | '); return { ov, ready: window.__theatreReady, lost: gl ? gl.isContextLost() : 'no-gl', t: window.__theatre?.clock?.raw, frame: window.__theatre?.clock?.frame, pending: window.__theatre?.assets?.pendingCount };
  });
  console.log(Date.now() - t0, 'ms', JSON.stringify(info));
  if (info.ready && i >= 2) break;
}
await page.screenshot({ path: process.argv[3] ?? '/tmp/probe.png', timeout: 120000 });
console.log('shot written');
await browser.close();
