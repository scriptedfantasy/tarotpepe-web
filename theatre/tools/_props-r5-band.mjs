// throwaway (props round 5): WHAT DOES THE BOTTOM OF EVERY PORTRAIT PLATE LAND ON?
// Raycasts a grid over the bottom band of a plate and names each hit, and reports the largest |z|
// any of those rays reaches on the floor plane — the plain field the rug has to give the plates.
//   node tools/_props-r5-band.mjs [states] [sizes]
import { chromium } from 'playwright';

const states = (process.argv[2] ?? 'fan,turn,dealt').split(',');
const sizes = (process.argv[3] ?? '390x760,360x800').split(',').map((s) => s.split('x').map(Number));
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
    const out = await page.evaluate(async ({ st }) => {
      const T = window.__theatre, THREE = T.THREE;
      T.pieces.camera.setState(st, T.ctx ?? {});
      await new Promise((r) => setTimeout(r, 500));
      const cam = T.camera;
      const rc = new THREE.Raycaster();
      const name = (o) => {
        const chain = [];
        for (let p = o; p; p = p.parent) if (p.name) chain.push(p.name);
        return chain[0] ?? o.type;
      };
      // the floor plane, for the geometric reach of the bottom band
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPlane = new THREE.Vector3();
      const lines = [];
      let maxFloorZ = -Infinity, propsMaxZ = -Infinity, propsMinZ = Infinity, propsN = 0;
      const ys = [0.88, 0.91, 0.94, 0.97, 0.995];
      const xs = [0.005, 0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95, 0.995];
      for (const yf of ys) {
        const row = [];
        for (const xf of xs) {
          const ndc = new THREE.Vector2(xf * 2 - 1, 1 - yf * 2);
          rc.setFromCamera(ndc, cam);
          if (rc.ray.intersectPlane(plane, hitPlane)) maxFloorZ = Math.max(maxFloorZ, hitPlane.z);
          const hit = rc.intersectObjects(T.scene.children, true).filter((h) => h.object.visible)[0];
          if (hit) {
            const n = name(hit.object);
            if (n === 'props') {
              propsN++;
              propsMaxZ = Math.max(propsMaxZ, hit.point.z);
              propsMinZ = Math.min(propsMinZ, hit.point.z);
            }
            row.push(`${xf}:${n}@${hit.point.z.toFixed(3)}`);
          } else row.push(`${xf}:-`);
        }
        lines.push(`  y=${yf} ` + row.join(' '));
      }
      const sh = T.pieces.camera.shots?.[st];
      return {
        lines: lines.join('\n'),
        maxFloorZ, propsN,
        propsMaxZ: propsN ? propsMaxZ : null,
        propsMinZ: propsN ? propsMinZ : null,
        zBottom: sh?.zBottom ?? null, zTop: sh?.zTop ?? null, fov: sh?.fov ?? null,
      };
    }, { st });
    console.log(`== ${st} ${W}x${H}  fov ${out.fov?.toFixed?.(2)}  zBottom(cloth) ${out.zBottom?.toFixed?.(3)}  FLOOR REACH z ${out.maxFloorZ.toFixed(3)}  props hits ${out.propsN}${out.propsN ? ` z ${out.propsMinZ.toFixed(3)}..${out.propsMaxZ.toFixed(3)}` : ''}`);
    console.log(out.lines);
  }
  await page.close();
}
await browser.close();
