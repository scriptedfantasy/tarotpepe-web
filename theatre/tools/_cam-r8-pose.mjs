// throwaway (camera round 8): screenshot a judging state with the camera forced onto an arbitrary
// pose, so a plate solved by the committed solver can be photographed in the current build.
//   SHOT='{"pos":[…],"look":[…],"up":[…],"fov":n}' node tools/_cam-r8-pose.mjs <view> <state> <w> <h> <out>
import { chromium } from 'playwright';

const [view, state, W, H, out] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=${view}&state=${state}&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1200);
if (process.env.SHOT) {
  await page.evaluate((s) => {
    const T = window.__theatre, THREE = T.THREE, c = T.camera;
    const put = () => {
      c.position.fromArray(s.pos);
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3().fromArray(s.pos), new THREE.Vector3().fromArray(s.look), new THREE.Vector3().fromArray(s.up ?? [0, 1, 0]));
      c.quaternion.setFromRotationMatrix(m);
      c.up.set(0, 1, 0).applyQuaternion(c.quaternion);
      c.fov = s.fov;
      c.clearViewOffset?.();
      c.aspect = window.innerWidth / window.innerHeight;
      c.updateProjectionMatrix();
    };
    put();
    // the camera piece re-applies its own pose every frame only when moving; pin it anyway
    setInterval(put, 16);
  }, JSON.parse(process.env.SHOT));
  await page.waitForTimeout(900);
}
await page.screenshot({ path: out });
console.log('wrote', out);
await browser.close();
