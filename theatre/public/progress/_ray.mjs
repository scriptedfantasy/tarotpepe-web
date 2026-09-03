// What is under a given pixel? Raycast through the live scene after it settles.
//   node public/progress/_ray.mjs "<url>" x,y[;x,y...]
import { chromium } from 'playwright';
const url = process.argv[2];
const pts = (process.argv[3] ?? '800,775').split(';').map((s) => s.split(',').map(Number));
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e)));
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(4000);
try {
  await page.waitForFunction(() => window.__theatre && window.__theatre.assets.pendingCount === 0, { timeout: 60000 });
} catch {}
const out = await page.evaluate((pts) => {
  const ctx = window.__theatre;
  const THREE = ctx.THREE;
  const ray = new THREE.Raycaster();
  // see back faces too: a plane facing away from the camera still writes depth in the ink pass
  ctx.scene.traverse((o) => {
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) m.side = THREE.DoubleSide;
  });
  const res = [];
  for (const [x, y] of pts) {
    const ndc = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    const hits = ray.intersectObjects(ctx.scene.children, true).slice(0, 4);
    res.push({
      px: [x, y],
      hits: hits.map((h) => {
        const chain = [];
        let o = h.object;
        while (o) {
          chain.push(o.name || o.type);
          o = o.parent;
        }
        return { d: +h.distance.toFixed(3), p: h.point.toArray().map((v) => +v.toFixed(3)), chain: chain.join(' < ') };
      }),
    });
  }
  return { cam: ctx.camera.position.toArray(), res };
}, pts);
console.log(JSON.stringify(out, null, 1));
await browser.close();
