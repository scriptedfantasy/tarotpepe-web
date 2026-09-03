// diagnostic: load the table view, report frame time and any errors
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text());
});
const t0 = Date.now();
await page.goto('http://127.0.0.1:5173/?view=table&state=default&shot=1', { waitUntil: 'load', timeout: 60000 });
console.log('loaded in', Date.now() - t0, 'ms');
await page.waitForTimeout(4000);
try {
  const info = await page.evaluate(() => {
    const ctx = window.__theatre;
    if (!ctx) return { noCtx: true };
    const r = ctx.renderer;
    const t0 = performance.now();
    r.render(ctx.scene, ctx.camera);
    const t1 = performance.now();
    let meshes = 0, tris = 0;
    ctx.scene.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        const g = o.geometry;
        tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      }
    });
    return { renderMs: t1 - t0, meshes, tris, calls: r.info.render.calls, triangles: r.info.render.triangles, ready: window.__theatreReady, failed: Object.entries(ctx.pieces).filter(([k, v]) => v.failed).map(([k]) => k) };
  });
  console.log(JSON.stringify(info));
} catch (e) {
  console.log('evaluate failed', String(e));
}
console.log('errors:', errors);
await browser.close();
