// diagnostic: load a view, report readiness, frame timing, context loss, console output
import { chromium } from 'playwright';
const view = process.argv[2] ?? 'table';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 300));
});
const t0 = Date.now();
await page.goto(`http://127.0.0.1:5173/?view=${view}&state=default&shot=1`, { waitUntil: 'load', timeout: 60000 });
console.log('loaded in', Date.now() - t0, 'ms');
await page.evaluate(() => {
  const c = document.querySelector('canvas');
  window.__ctxLost = false;
  c?.addEventListener('webglcontextlost', () => (window.__ctxLost = true));
});
try {
  await page.waitForFunction(() => window.__theatreReady === true, { timeout: 60000 });
  console.log('ready after', Date.now() - t0, 'ms');
} catch {
  console.log('NOT READY after 60s');
}
const info = await page.evaluate(async () => {
  const ctx = window.__theatre;
  if (!ctx) return { noCtx: true };
  const r = ctx.renderer;
  const gl = r.getContext();
  const t0 = performance.now();
  await new Promise((res) => requestAnimationFrame(res));
  const t1 = performance.now();
  await new Promise((res) => requestAnimationFrame(res));
  const t2 = performance.now();
  const c = r.domElement;
  const px = new Uint8Array(4);
  gl.readPixels(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return {
    frameMs: [t1 - t0, t2 - t1],
    ctxLost: gl.isContextLost() || window.__ctxLost,
    centrePixel: Array.from(px),
    calls: r.info.render.calls,
    tris: r.info.render.triangles,
    geometries: r.info.memory.geometries,
    textures: r.info.memory.textures,
    failed: Object.entries(ctx.pieces)
      .filter(([k, v]) => v.failed)
      .map(([k]) => k),
    letterbox: ctx.pieces.ink?.params?.letterbox,
    canvasStyle: getComputedStyle(c).visibility + ' ' + getComputedStyle(c).opacity + ' ' + c.width + 'x' + c.height,
    overlayHtml: (document.getElementById('titles')?.innerHTML || '').slice(0, 200),
  };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: `/tmp/probe-${view}.png` });
console.log('logs:', logs.slice(0, 20));
await browser.close();
