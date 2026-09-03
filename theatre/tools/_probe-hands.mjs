import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto('http://127.0.0.1:5173/?view=table&state=default&shot=1', { waitUntil: 'load', timeout: 60000 });
try {
  await page.waitForFunction(() => window.__theatreReady === true, { timeout: 40000 });
} catch {
  console.log('not ready after 40s');
}
console.log('errors:', errors);
const info = await page.evaluate(() => {
  const ctx = window.__theatre;
  const T = ctx.THREE;
  const out = {};
  ctx.scene.updateMatrixWorld(true);
  for (const n of ['handL', 'handR', 'pepe', 'deck', 'wristL', 'wristR']) {
    const o = ctx.scene.getObjectByName(n);
    if (!o) {
      out[n] = null;
      continue;
    }
    const b = new T.Box3().setFromObject(o);
    out[n] = { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) };
  }
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
