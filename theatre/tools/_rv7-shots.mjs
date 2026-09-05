#!/usr/bin/env node
// round 7 scratch: every named shot's frame ON THE CLOTH, and its corner radii against the rim.
//   node tools/_rv7-shots.mjs [width] [height]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan&shot=1&t=2.4', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(800);

const out = await page.evaluate(({ W, H }) => {
  const T = window.__theatre;
  const cam = T.camera.clone();
  const L = T.layout;
  const shots = T.pieces.camera?.shots ?? {};
  const V3 = T.camera.position.constructor;
  const res = {};
  for (const [name, s] of Object.entries(shots)) {
    if (!s?.pos || !s?.look) continue;
    cam.position.set(...s.pos);
    cam.up.set(...(s.up ?? [0, 1, 0]));
    cam.lookAt(new V3(...s.look));
    cam.fov = s.fov;
    cam.aspect = W / H;
    if (s.shift) { cam.setViewOffset?.(1, 1, 0, 0, 1, 1); cam.clearViewOffset?.(); }
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    const edge = (nx, ny) => {
      const p = new V3(nx, ny, 0.5).unproject(cam);
      const d = p.clone().sub(cam.position).normalize();
      const t = (L.spread.y - cam.position.y) / d.y;
      if (!(t > 0)) return null;
      const x = cam.position.x + d.x * t, z = cam.position.z + d.z * t;
      return [+x.toFixed(3), +z.toFixed(3), +Math.hypot(x, z).toFixed(3)];
    };
    res[name] = { pos: s.pos.map((n) => +n.toFixed(3)), fov: +s.fov.toFixed(1), TL: edge(-1, 1), TR: edge(1, 1), BL: edge(-1, -1), BR: edge(1, -1) };
  }
  return res;
}, { W, H });
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(10), JSON.stringify(v));
await browser.close();
