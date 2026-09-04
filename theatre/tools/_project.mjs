// throwaway (camera round 2): where does a world point land in the frame, for a given shot?
//   node tools/_project.mjs /abs/config.json
// config: { view, state, points: {name: [x,y,z]}, variants: [{name, cut, shot}] }
// prints, per variant, the screen fraction (0..1 from the left / the top) of every point.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: cfg.width ?? 1600, height: cfg.height ?? 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, dispose(){}, on(){}, send(){}, data:{} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}' }));
const u = new URL('http://127.0.0.1:5173/');
if (cfg.view) u.searchParams.set('view', cfg.view);
if (cfg.state) u.searchParams.set('state', cfg.state);
u.searchParams.set('shot', '1');
await page.goto(u.toString(), { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
for (;;) {
  const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ok || Date.now() - t0 > 150000) break;
  await page.waitForTimeout(250);
}
for (const v of cfg.variants ?? [{ name: cfg.state, cut: cfg.state }]) {
  const res = await page.evaluate(
    ({ v, points }) => {
      const T = window.__theatre, C = T.pieces.camera, cam = T.camera;
      const name = v.cut ?? v.name;
      if (v.shot) {
        const base = C.shots[v.base ?? name] ?? {};
        const s = { ...base, ...v.shot };
        if (v.shot.pos && !v.shot.look) s.look = [v.shot.pos[0], v.shot.pos[1], -T.layout.room.depth / 2];
        C.shots[name] = s;
      }
      C.cut(name);
      cam.updateMatrixWorld(true);
      const P = cam.projectionMatrix.elements, V = cam.matrixWorldInverse.elements;
      const mul = (m, p) => [0, 1, 2, 3].map((r) => m[r] * p[0] + m[r + 4] * p[1] + m[r + 8] * p[2] + m[r + 12] * p[3]);
      const out = {};
      for (const [k, p] of Object.entries(points)) {
        const c = mul(P, mul(V, [p[0], p[1], p[2], 1]));
        out[k] = [(c[0] / c[3] + 1) / 2, (1 - c[1] / c[3]) / 2];
      }
      const canvas = document.querySelector('canvas');
      return { out, shot: C.shots[name], fov: cam.fov, aspect: cam.aspect, view: cam.view && { ...cam.view }, size: { w: T.size.w, h: T.size.h }, canvas: canvas && { w: canvas.clientWidth, h: canvas.clientHeight }, letterbox: T.pieces.ink?.params?.letterbox };
    },
    { v, points: cfg.points },
  );
  console.log(`== ${v.name}  fov=${res.fov} aspect=${res.aspect?.toFixed(3)} view=${JSON.stringify(res.view)} size=${JSON.stringify(res.size)} canvas=${JSON.stringify(res.canvas)} letterbox=${res.letterbox}`);
  for (const [k, [x, y]] of Object.entries(res.out)) console.log(`   ${k.padEnd(14)} x=${x.toFixed(3)} y=${y.toFixed(3)}`);
}
await browser.close();
if (errors.length) console.error('PAGE ERRORS:\n' + errors.join('\n'));
