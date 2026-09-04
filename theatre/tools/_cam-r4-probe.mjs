// probe: world bounding boxes of named objects in the scene (manual, no THREE import)
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data:{} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}' }));
await page.goto('http://127.0.0.1:5173/?view=camera&state=wide&shot=1', { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
for (;;) { const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false); if (ok || Date.now() - t0 > 150000) break; await page.waitForTimeout(250); }
const res = await page.evaluate(() => {
  const T = window.__theatre;
  T.scene.updateMatrixWorld(true);
  const apply = (m, p) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
  function boxOf(root) {
    let mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9], any = false;
    root.traverse((o) => {
      const g = o.geometry;
      if (!g) return;
      if (!g.boundingBox) g.computeBoundingBox?.();
      const bb = g.boundingBox; if (!bb) return;
      const m = o.matrixWorld.elements;
      for (let i = 0; i < 8; i++) {
        const p = [ (i&1)?bb.max.x:bb.min.x, (i&2)?bb.max.y:bb.min.y, (i&4)?bb.max.z:bb.min.z ];
        const w = apply(m, p);
        for (let k = 0; k < 3; k++) { if (w[k] < mn[k]) mn[k] = w[k]; if (w[k] > mx[k]) mx[k] = w[k]; }
        any = true;
      }
    });
    return any ? { min: mn.map(n=>+n.toFixed(3)), max: mx.map(n=>+n.toFixed(3)) } : null;
  }
  const out = [];
  const walk = (o, depth, path) => {
    const nm = o.name || `(${o.type})`;
    if (depth >= 1 && depth <= 4 && o.name) {
      const b = boxOf(o);
      if (b) out.push({ path: path + '/' + nm, y: [b.min[1], b.max[1]], x: [b.min[0], b.max[0]], z: [b.min[2], b.max[2]] });
    }
    if (depth > 4) return;
    for (const c of o.children) walk(c, depth + 1, path + '/' + nm);
  };
  walk(T.scene, 0, '');
  return out;
});
for (const r of res) console.log(r.path.padEnd(50), 'y', r.y.map(n=>n.toFixed(2)).join('..'), ' x', r.x.map(n=>n.toFixed(2)).join('..'), ' z', r.z.map(n=>n.toFixed(2)).join('..'));
await browser.close();
if (errors.length) console.error('PAGE ERRORS:\n' + errors.join('\n'));
