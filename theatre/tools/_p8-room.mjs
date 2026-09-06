// r8 scratch: what is in the room, where, and where a walking figure would be in the frame.
// Dumps every prop/room object's world AABB and projects a set of candidate stations into the
// solved `wide` frame at whatever window shape is asked for.
//   node tools/_p8-room.mjs [w] [h] [shot]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const SHOT = process.argv[4] ?? 'wide';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=props&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });

const out = await page.evaluate(({ SHOT }) => {
  const T = window.__theatre;
  const THREE = T.THREE;
  T.pieces.camera?.cut?.(SHOT);
  T.camera.updateMatrixWorld(true);
  T.camera.updateProjectionMatrix();
  const boxOf = (root) => {
    const b = new THREE.Box3();
    root.updateMatrixWorld(true);
    b.setFromObject(root);
    return b.isEmpty() ? null : { mn: b.min.toArray().map((v) => +v.toFixed(3)), mx: b.max.toArray().map((v) => +v.toFixed(3)) };
  };
  const rows = [];
  for (const name of ['props', 'room', 'table', 'pepe']) {
    const g = T.scene.getObjectByName(name);
    if (!g) continue;
    g.children.forEach((c, i) => {
      const bx = boxOf(c);
      if (!bx) return;
      rows.push({ g: name, i, n: c.name || c.type, ...bx });
    });
  }
  // project some candidate stations
  const proj = (p) => {
    const v = new THREE.Vector3(...p).project(T.camera);
    return [+v.x.toFixed(3), +v.y.toFixed(3)];
  };
  const stations = {};
  for (const x of [-2.1, -1.9, -1.7, -1.5, -1.0, -0.5, 0]) {
    stations['x' + x] = { foot: proj([x, 0, -1.15]), head: proj([x, 1.05, -1.15]) };
  }
  const cam = T.pieces.camera?.pose?.(SHOT) ?? null;
  return { rows, stations, cam, aspect: +(window.innerWidth / window.innerHeight).toFixed(3) };
}, { SHOT });

console.log(`# ${SHOT} at ${W}x${H} aspect ${out.aspect}`);
console.log('cam', JSON.stringify(out.cam));
console.log('\n# stations (ndc x,y; |x|<1 and |y|<1 is in frame)');
for (const [k, v] of Object.entries(out.stations)) console.log(k.padEnd(8), 'foot', JSON.stringify(v.foot), 'head', JSON.stringify(v.head));
console.log('\n# world boxes');
for (const r of out.rows) console.log(`${r.g}#${String(r.i).padEnd(3)} ${String(r.n).padEnd(18)} x ${r.mn[0].toFixed(2)}..${r.mx[0].toFixed(2)}  y ${r.mn[1].toFixed(2)}..${r.mx[1].toFixed(2)}  z ${r.mn[2].toFixed(2)}..${r.mx[2].toFixed(2)}`);
await browser.close();
