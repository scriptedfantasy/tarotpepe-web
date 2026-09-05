// throwaway (reveal round 9): WHAT DOES THE ARM OCCUPY? Raycasts a grid over the frame and reports,
// for every mesh whose name starts with `reveal-hand`, how many pixels it owns, its screen box and
// its widest run. Also prints where the sleeve's own corners and the puppet's wrists project to, so
// "a tube ending in mid-air" is a measurement and not a squint.
//   node tools/_rv9-sleeve.mjs [view] [state] [w] [h] [t]
import { chromium } from 'playwright';

const view = process.argv[2] ?? 'reveal', state = process.argv[3] ?? 'turning';
const W = +(process.argv[4] ?? 390), H = +(process.argv[5] ?? 760);
const t = process.argv[6];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=${view}&state=${state}&shot=1${t ? `&t=${t}` : ''}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(900);
const out = await page.evaluate(({ W, H }) => {
  const T = window.__theatre, THREE = T.THREE;
  const rc = new THREE.Raycaster();
  const N = 96;
  const stats = {};
  const rowsFor = {};
  const name = (o) => {
    for (let p = o; p; p = p.parent) if (p.name && p.name.startsWith('reveal-hand')) return p.name;
    return null;
  };
  for (let iy = 0; iy < N; iy++) {
    const yf = (iy + 0.5) / N;
    for (let ix = 0; ix < N; ix++) {
      const xf = (ix + 0.5) / N;
      rc.setFromCamera(new THREE.Vector2(xf * 2 - 1, 1 - yf * 2), T.camera);
      const hit = rc.intersectObjects(T.scene.children, true).filter((h) => h.object.visible)[0];
      if (!hit) continue;
      const n = name(hit.object);
      if (!n) continue;
      const s = (stats[n] ??= { n: 0, x0: 9, x1: -9, y0: 9, y1: -9 });
      s.n++;
      s.x0 = Math.min(s.x0, xf); s.x1 = Math.max(s.x1, xf);
      s.y0 = Math.min(s.y0, yf); s.y1 = Math.max(s.y1, yf);
      (rowsFor[n] ??= {})[iy] = (rowsFor[n][iy] ?? 0) + 1;
    }
  }
  const lines = [];
  for (const k in stats) {
    const s = stats[k];
    const rows = rowsFor[k];
    const widest = Math.max(...Object.values(rows));
    lines.push(`${k}: ${s.n} of ${N * N} samples | x ${s.x0.toFixed(3)}–${s.x1.toFixed(3)} (${Math.round((s.x1 - s.x0) * W)} px) | y ${s.y0.toFixed(3)}–${s.y1.toFixed(3)} (${Math.round((s.y1 - s.y0) * H)} px, ${((s.y1 - s.y0) * 100).toFixed(0)}% of frame) | widest row ${Math.round((widest / N) * W)} px | rows ${Object.keys(rows).length}`);
  }
  if (!lines.length) lines.push('(no reveal-hand pixels)');
  // where things project
  const proj = (v) => {
    const p = v.clone().project(T.camera);
    return `(${(((p.x + 1) / 2) * W).toFixed(0)}, ${(((1 - p.y) / 2) * H).toFixed(0)})${p.z > 1 ? ' BEHIND' : ''}`;
  };
  const g = T.scene.getObjectByName('reveal-hand');
  const info = [];
  if (g) {
    info.push(`hand group visible=${g.visible} pos=${g.position.toArray().map((v) => v.toFixed(3)).join(',')}`);
    const sl = T.scene.getObjectByName('reveal-hand-sleeve');
    if (sl) {
      const m = sl.children.find((c) => c.isMesh);
      if (m) {
        m.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(m);
        info.push(`sleeve world box y ${box.min.y.toFixed(3)}–${box.max.y.toFixed(3)} z ${box.min.z.toFixed(3)}–${box.max.z.toFixed(3)} x ${box.min.x.toFixed(3)}–${box.max.x.toFixed(3)}`);
        info.push(`sleeve far end (local 0,0,-1 scaled): ${proj(m.localToWorld(new THREE.Vector3(0, 0, -1)))}  near end: ${proj(m.localToWorld(new THREE.Vector3(0, 0, 0.01)))}`);
      }
    }
  }
  const pep = T.pieces.pepe;
  for (const s of ['L', 'R']) {
    const h = pep?.parts?.['hand' + s];
    if (h) { h.updateMatrixWorld(true); info.push(`pepe hand${s} visible=${h.visible} world=${h.getWorldPosition(new THREE.Vector3()).toArray().map((v) => v.toFixed(3)).join(',')} → ${proj(h.getWorldPosition(new THREE.Vector3()))}`); }
  }
  const d = T.camera.getWorldDirection(new THREE.Vector3());
  info.push(`camera ${T.pieces.camera?.current} dir.y=${d.y.toFixed(3)} rake=${((Math.asin(-d.y) * 180) / Math.PI).toFixed(1)}° pos=${T.camera.position.toArray().map((v) => v.toFixed(2)).join(',')}`);
  return lines.concat(info).join('\n');
}, { W, H });
console.log(`${view}/${state} ${W}x${H}${t ? ` t=${t}` : ''}`);
console.log(out);
await browser.close();
