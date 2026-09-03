// scratch: time the page load and dump console + stats
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://127.0.0.1:5173/?view=props&state=default&shot=1';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', String(e.stack ?? e).slice(0, 500)));
page.on('load', () => console.log('[event] load at', Date.now() - t0));
page.on('framenavigated', () => console.log('[event] navigated at', Date.now() - t0));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
console.log('load', Date.now() - t0, 'ms');
try {
  await page.waitForFunction(() => !!window.__theatre, { timeout: 60000, polling: 100 });
  console.log('built', Date.now() - t0, 'ms');
  await page.waitForFunction(() => window.__theatreReady === true, { timeout: 60000, polling: 100 });
  console.log('ready', Date.now() - t0, 'ms');
} catch (e) {
  console.log('not ready after 60s');
}
const info = await page.evaluate(() => {
  const r = window.__theatre?.renderer;
  const g = window.__theatre?.scene?.getObjectByName('props');
  let meshes = 0, tris = 0;
  g?.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      const idx = o.geometry.index;
      tris += idx ? idx.count / 3 : o.geometry.attributes.position.count / 3;
    }
  });
  return { meshes, tris, calls: r?.info.render.calls, textures: r?.info.memory.textures, geometries: r?.info.memory.geometries, frame: r?.info.render.frame };
});
console.log(info);
const tA = Date.now();
await page.screenshot({ path: process.argv[3] ?? '/tmp/props-dbg.png' });
console.log('shot took', Date.now() - tA, 'ms');
const info2 = await page.evaluate(() => ({ frame: window.__theatre?.renderer.info.render.frame }));
console.log(info2);
await browser.close();
