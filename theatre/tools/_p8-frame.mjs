// r8: is he IN THE PICTURE at every beat, on every frame shape? Projects each beat's station
// (the sole under his head axis, and his crown) into the solved shot and prints the NDC, so
// "he is off the left edge on a phone" is a number rather than a surprise.
//   node tools/_p8-frame.mjs [w] [h] [shot]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const SHOT = process.argv[4] ?? 'wide';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=pepe&state=cross&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });

const out = await page.evaluate(({ SHOT }) => {
  const T = window.__theatre;
  const THREE = T.THREE;
  T.pieces.camera?.cut?.(SHOT);
  T.camera.updateMatrixWorld(true);
  T.camera.updateProjectionMatrix();
  const A = T.pieces.pepe.arrival;
  const seen = new Map();
  const proj = (x, y, z) => {
    const v = new THREE.Vector3(x, y, z).project(T.camera);
    return [+v.x.toFixed(3), +v.y.toFixed(3)];
  };
  for (const b of A.beats) {
    const mesh = A.plates[b.plate];
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    const sx = b.mirror ? -1 : 1;
    const x0 = b.x + Math.min(bb.min.x * sx, bb.max.x * sx), x1 = b.x + Math.max(bb.min.x * sx, bb.max.x * sx);
    const key = `${b.plate}@${b.x.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      foot: proj(b.x, 0, b.z),
      crown: proj(b.x, bb.max.y, b.z),
      left: proj(x0, bb.max.y * 0.5, b.z)[0],
      right: proj(x1, bb.max.y * 0.5, b.z)[0],
    });
  }
  return { rows: [...seen.entries()], can: A.canFloor && proj(A.canFloor.x, 0.16, A.canFloor.z), aspect: +(window.innerWidth / window.innerHeight).toFixed(3) };
}, { SHOT });
console.log(`# ${SHOT} at ${W}x${H}  aspect ${out.aspect}   (|ndc| < 1 is inside the frame)`);
for (const [k, v] of out.rows) {
  const inside = v.left > -1 && v.right < 1 && v.crown[1] < 1 && v.foot[1] > -1;
  console.log(`${inside ? ' ' : '!'} ${k.padEnd(18)} x ${String(v.left).padStart(7)} .. ${String(v.right).padStart(7)}   foot y ${String(v.foot[1]).padStart(7)}  crown y ${String(v.crown[1]).padStart(7)}`);
}
console.log(`  can              x ${out.can?.[0]}  y ${out.can?.[1]}`);
await browser.close();
