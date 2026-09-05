// throwaway (props round 5): where a line of floor lands in the frontal shots, and how far down
// the floor the bottom edge of each frame reaches. Tells the rug how far downstage it may grow
// before its near border leaves the picture.
//   node tools/_props-r5-proj.mjs [states] [sizes] [zs]
import { chromium } from 'playwright';

const states = (process.argv[2] ?? 'home,wide').split(',');
const sizes = (process.argv[3] ?? '1600x900,390x760').split(',').map((s) => s.split('x').map(Number));
const zs = (process.argv[4] ?? '1.10,1.19,1.30,1.45,1.60,1.75,1.90').split(',').map(Number);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
for (const [W, H] of sizes) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('ERR', String(e)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
  await page.goto(`http://127.0.0.1:5173/?view=camera&state=${states[0]}&shot=1`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
  await page.waitForTimeout(700);
  for (const st of states) {
    const out = await page.evaluate(async ({ st, zs, W, H }) => {
      const T = window.__theatre, THREE = T.THREE;
      T.pieces.camera.setState(st, T.ctx ?? {});
      await new Promise((r) => setTimeout(r, 450));
      const cam = T.camera;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const rc = new THREE.Raycaster();
      const hit = new THREE.Vector3();
      const reach = (xf, yf) => {
        rc.setFromCamera(new THREE.Vector2(xf * 2 - 1, 1 - yf * 2), cam);
        return rc.ray.intersectPlane(plane, hit) ? hit.z : NaN;
      };
      const proj = (x, z) => {
        const v = new THREE.Vector3(x, 0, z).project(cam);
        return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
      };
      const rows = zs.map((z) => {
        const [, py] = proj(0, z);
        const [pxL] = proj(-1.6, z);
        return `  z=${z.toFixed(2)}  y=${py.toFixed(0)}px (${(py / H * 100).toFixed(1)}%)  x=-1.6 at ${pxL.toFixed(0)}px`;
      });
      return {
        bot: [reach(0.5, 0.999), reach(0.02, 0.999), reach(0.98, 0.999)],
        rows: rows.join('\n'),
      };
    }, { st, zs, W, H });
    console.log(`== ${st} ${W}x${H}  bottom edge reaches floor z: centre ${out.bot[0].toFixed(3)}  corners ${out.bot[1].toFixed(3)} / ${out.bot[2].toFixed(3)}`);
    console.log(out.rows);
  }
  await page.close();
}
await browser.close();
