// throwaway (camera round 8): WHAT IS THAT AT THE FOOT OF THE PLATE? Raycasts a row of pixels
// across the bottom of the frame and names the mesh each one lands on, so "the rug is in the
// picture" is a reading of the scene graph and not of a thumbnail.
//   node tools/_cam-r8-hit.mjs [view] [state] [w] [h] [yFraction …]
import { chromium } from 'playwright';

const view = process.argv[2] ?? 'camera', state = process.argv[3] ?? 'fan';
const W = +(process.argv[4] ?? 390), H = +(process.argv[5] ?? 760);
const ys = (process.argv.slice(6).length ? process.argv.slice(6) : ['0.92', '0.95', '0.98']).map(Number);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=${view}&state=${state}&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(900);
// SHOT={"pos":[…],"look":[…],"up":[…],"fov":n} puts the camera on an arbitrary pose first, so a
// plate solved by another version of the solver can be raycast in this one's scene.
if (process.env.SHOT) {
  await page.evaluate((s) => {
    const T = window.__theatre, THREE = T.THREE, c = T.camera;
    c.position.fromArray(s.pos);
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3().fromArray(s.pos), new THREE.Vector3().fromArray(s.look), new THREE.Vector3().fromArray(s.up ?? [0, 1, 0]));
    c.quaternion.setFromRotationMatrix(m);
    c.up.set(0, 1, 0).applyQuaternion(c.quaternion);
    c.fov = s.fov;
    c.clearViewOffset?.();
    c.aspect = window.innerWidth / window.innerHeight;
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    T.pieces.camera.current = 'frozen';
  }, JSON.parse(process.env.SHOT));
  await page.waitForTimeout(400);
}
const out = await page.evaluate(({ ys }) => {
  const T = window.__theatre, THREE = T.THREE;
  const rc = new THREE.Raycaster();
  const lines = [];
  const name = (o) => {
    const chain = [];
    for (let p = o; p; p = p.parent) if (p.name) chain.push(p.name);
    return chain.join(' < ') || o.type;
  };
  for (const yf of ys) {
    const row = [];
    for (const xf of [0.05, 0.2, 0.5, 0.8, 0.95]) {
      rc.setFromCamera(new THREE.Vector2(xf * 2 - 1, 1 - yf * 2), T.camera);
      const hit = rc.intersectObjects(T.scene.children, true).filter((h) => h.object.visible)[0];
      row.push(hit ? `${xf}:${name(hit.object)}@z${hit.point.z.toFixed(3)}` : `${xf}:—`);
    }
    lines.push(`y=${yf}  ` + row.join('  '));
  }
  return lines.join('\n');
}, { ys });
console.log(out);
await browser.close();
