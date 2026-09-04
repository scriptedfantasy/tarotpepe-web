// throwaway (props round 4): project named world points into each camera state.
//   node tools/_props-r4.mjs '{"a":[x,y,z],...}' [state...]
import { chromium } from 'playwright';

const pts = JSON.parse(process.argv[2]);
const states = process.argv.slice(3).length ? process.argv.slice(3) : ['home', 'wide'];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, dispose(){}, on(){}, send(){}, data:{} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}' }));
await page.goto('http://127.0.0.1:5173/?view=camera&state=wide&shot=1', { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
for (;;) {
  const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ok || Date.now() - t0 > 150000) break;
  await page.waitForTimeout(250);
}

for (const st of states) {
  const out = await page.evaluate(async ({ st, pts }) => {
    const ctx = window.__theatre;
    ctx.pieces.camera?.setState?.(st, ctx);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cam = ctx.camera;
    cam.updateMatrixWorld(true);
    const W = ctx.renderer.domElement.clientWidth, H = ctx.renderer.domElement.clientHeight;
    const vi = cam.matrixWorldInverse.elements, p = cam.projectionMatrix.elements;
    const mul = (m, v) => [
      m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
      m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
      m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
      m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3],
    ];
    const res = {};
    for (const [k, v] of Object.entries(pts)) {
      const e = mul(p, mul(vi, [v[0], v[1], v[2], 1]));
      res[k] = [+(((e[0] / e[3] + 1) / 2) * W).toFixed(1), +(((1 - e[1] / e[3]) / 2) * H).toFixed(1)];
    }
    return { W, H, res };
  }, { st, pts });
  console.log(st, out.W + 'x' + out.H, JSON.stringify(out.res));
}
if (errors.length) console.log('PAGE ERRORS', errors.slice(0, 3));
await browser.close();
