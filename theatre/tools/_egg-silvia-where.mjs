#!/usr/bin/env node
// What the home plate can see of the back wall, and where his face and the clock are on the glass.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:8732';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const stub = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });

for (const [W, H] of [[1280, 800], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 200)));
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/?view=props&state=default&shot=1&bugs=0`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  const m = await page.evaluate(([W, H]) => {
    const t = window.__theatre;
    t.pieces.camera.cut('home');
    t.camera.updateMatrixWorld(true);
    t.scene.updateMatrixWorld(true);
    const THREE = t.THREE;
    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    const proj = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z).project(t.camera);
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    };
    const rows = [];
    const ys = [];
    for (let y = 2.75; y >= 0.95; y -= 0.05) ys.push(+y.toFixed(2));
    for (const y of ys) {
      let line = `${y.toFixed(2)} `;
      for (let xi = 0; xi <= 48; xi++) {
        const x = -2.4 + xi * 0.1;
        const p = new THREE.Vector3(x, y, -2.488);
        const [px, py] = proj(x, y, -2.488);
        if (px < 0 || px > W || py < 0 || py > H) { line += ' '; continue; }
        dir.copy(p).sub(t.camera.position).normalize();
        ray.set(t.camera.position, dir);
        const d0 = t.camera.position.distanceTo(p);
        const shown = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false) return false; return true; };
        const hits = ray.intersectObjects(t.scene.children, true).filter((h) => h.distance < d0 - 0.004 && shown(h.object));
        let ch = '.';
        if (hits.length) {
          const o = hits[0].object;
          let n = '';
          for (let q = o; q; q = q.parent) if (q.name) { n = q.name; break; }
          ch = (n || o.type).replace(/^room:/, '')[0].toUpperCase();
        }
        line += ch;
      }
      rows.push(line);
    }
    // the head, the clock, and the frame slots on the glass
    const boxOf = (obj) => {
      if (!obj) return null;
      const b = new THREE.Box3().setFromObject(obj);
      const xs = [], py = [];
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const [a, c] = proj(x, y, z);
        xs.push(a); py.push(c);
      }
      return { x: +Math.min(...xs).toFixed(1), y: +Math.min(...py).toFixed(1), w: +(Math.max(...xs) - Math.min(...xs)).toFixed(1), h: +(Math.max(...py) - Math.min(...py)).toFixed(1), world: { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) } };
    };
    const P = t.pieces.pepe;
    return {
      rows,
      head: boxOf(P?.headPivot),
      clock: boxOf(t.scene.getObjectByName('props')?.userData?.wallClock ?? null),
      wallCorners: { tl: proj(-2.4, 2.75, -2.488), br: proj(2.4, 0.95, -2.488) },
      // where a wall point lands on the glass, for a handful of x at y 1.5
      scale: { at1m: (() => { const a = proj(0, 1.5, -2.488), b = proj(1, 1.5, -2.488); return +(b[0] - a[0]).toFixed(1); })() },
    };
  }, [W, H]);
  console.log(`\n===== ${W}x${H} home =====`);
  console.log('      ' + [-2.4, -1.4, -0.4, 0.6, 1.6].map((v) => String(v).padEnd(10)).join(''));
  for (const r of m.rows) console.log(r);
  console.log('head  ', JSON.stringify(m.head));
  console.log('clock ', JSON.stringify(m.clock));
  console.log('px per metre on the wall:', m.scale.at1m);
  await page.close();
}
await browser.close();
