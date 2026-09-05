// throwaway (reveal round 9): DOES THE ARM PASS OVER THE STILL LIFE OR THROUGH IT? Plays a beat
// and, on every rendered frame, measures every vertex of the arm ribbon (and the hand's own quad)
// against every prop standing on the cloth. Negative = inside the prop.
//   node tools/_rv9-clear.mjs [state] [seconds]
import { chromium } from 'playwright';

const state = process.argv[2] ?? 'turn';
const secs = +(process.argv[3] ?? 9);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=${state}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
console.log(await page.evaluate(async ({ secs }) => {
  const T = window.__theatre, THREE = T.THREE, scene = T.scene;
  const boxOf = (root) => {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox, e = o.matrixWorld.elements;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const p = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
        for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
      }
    });
    return mn[0] === Infinity ? null : { mn, mx };
  };
  // Each object of the still life is measured MESH BY MESH, not as one hull: still#6 is a folded
  // newspaper with a saucer, a cup and a spoon on it, and its group box claims a 15 cm square
  // 55 mm deep that only the cup actually fills.
  const props = [];
  const still = scene.getObjectByName('still-life');
  if (still) still.children.forEach((c, i) => c.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const b = boxOf(o);
    if (b && b.mx[1] > 0.765) props.push({ name: `still#${i}/${o.name || o.type}`, ...b });
  }));
  const dist = (p, b) => {
    let d2 = 0;
    for (let i = 0; i < 3; i++) { const v = p[i] < b.mn[i] ? b.mn[i] - p[i] : p[i] > b.mx[i] ? p[i] - b.mx[i] : 0; d2 += v * v; }
    if (d2 > 0) return Math.sqrt(d2);
    let inside = Infinity;
    for (let i = 0; i < 3; i++) inside = Math.min(inside, p[i] - b.mn[i], b.mx[i] - p[i]);
    return -inside;
  };
  const worst = {};
  const v = new THREE.Vector3();
  const sample = () => {
    const g = scene.getObjectByName('reveal-hand');
    if (!g || !g.visible) return;
    g.updateMatrixWorld(true);
    g.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry?.attributes?.position) return;
      const a = o.geometry.attributes.position;
      // the ribbon is 0.128 wide and the DRAWING inside it is 0.062–0.116, so its edge vertices are
      // transparent: sample the pairs pulled in toward the spine instead, or every arm is reported
      // as being inside a prop it is nowhere near.
      const ribbon = o.name === 'reveal-hand-sleeve';
      const put = (key) => {
        for (const b of props) {
          const d = dist([v.x, v.y, v.z], b);
          const k = `${key}|${b.name}`;
          if (!(k in worst) || d < worst[k].d) worst[k] = { d, at: [v.x, v.y, v.z] };
        }
      };
      if (ribbon) {
        const L = new THREE.Vector3(), R = new THREE.Vector3();
        for (let i = 0; i + 1 < a.count; i += 2) {
          L.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld);
          R.fromBufferAttribute(a, i + 1).applyMatrix4(o.matrixWorld);
          for (const f of [0.09, 0.3, 0.5, 0.7, 0.91]) {
            v.copy(L).lerp(R, f);
            put(o.name);
          }
        }
      } else {
        for (let i = 0; i < a.count; i++) {
          v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld);
          put(o.name);
        }
      }
    });
  };
  const t0 = performance.now();
  while (performance.now() - t0 < secs * 1000) {
    sample();
    await new Promise((r) => requestAnimationFrame(r));
  }
  const rows = Object.entries(worst).filter(([, w]) => w.d < 0.05).sort((a, b) => a[1].d - b[1].d);
  return rows.length ? rows.map(([k, w]) => `${(w.d * 1000).toFixed(0)} mm  ${k}  at (${w.at.map((n) => n.toFixed(3)).join(', ')})`).join('\n') : `clear: nothing within 50 mm of a prop across ${secs}s of ${'' + location.search}`;
}, { secs }));
await browser.close();
