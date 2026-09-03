// scratch: time texture generation in the browser
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 400)));
page.on('pageerror', (e) => console.log('[pageerror]', String(e.stack ?? e).slice(0, 800)));
await page.goto('http://127.0.0.1:5173/?only=camera&shot=1', { waitUntil: 'load', timeout: 60000 });
const res = await page.evaluate(async () => {
  const T = await import('/src/pieces/props-textures.js');
  const O = await import('/src/pieces/props-objects.js');
  const out = {};
  const time = (name, fn, n = 1) => {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn(i);
    out[name] = +((performance.now() - t0) / n).toFixed(1);
  };
  time('materials()', () => O.materials());
  time('label cap', (i) => T.labelTexture({ name: 'ANIS', seed: i + 1, w: 256, h: 512, cap: true }), 3);
  time('label nocap', (i) => T.labelTexture({ name: 'ANIS', seed: i + 1, w: 256, h: 512, cap: false }), 3);
  time('bottle default', (i) => O.bottle({ name: 'ANIS', seed: i }), 3);
  time('bottle nocap', (i) => O.bottle({ name: 'ANIS', seed: i, cap: false }), 3);
  time('bottle small', (i) => O.bottle({ name: 'ANIS', seed: i, bodyH: 0.12 }), 3);
  time('lathe only', (i) => O.lathe([[0, 0], [0.03, 0], [0.036, 0.012], [0.036, 0.1], [0.036, 0.19], [0.033, 0.2], [0.022, 0.22], [0.013, 0.24], [0.013, 0.3], [0.017, 0.3], [0.017, 0.31], [0.009, 0.31], [0, 0.31]], O.materials().paper, 18), 3);
  time('jar', (i) => O.jar({ name: 'SEL', seed: i }), 3);
  time('flask', (i) => O.flask({ seed: i }), 3);
  return out;
});
console.log(res);
await browser.close();
