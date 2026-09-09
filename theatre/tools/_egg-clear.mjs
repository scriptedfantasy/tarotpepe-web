#!/usr/bin/env node
// Scratch probe: which points on the back wall are actually SEEN from the home plate — i.e. which
// have nothing standing in front of them. Prints a map: '.' clear plaster, a letter for whatever
// is in the way.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:8705';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 200)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
await page.goto(`${BASE}/?view=props&state=default&shot=1&bugs=0`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
const rows = await page.evaluate(() => {
  const t = window.__theatre;
  t.pieces.camera.cut('home');
  t.camera.updateMatrixWorld(true);
  t.scene.updateMatrixWorld(true);
  const THREE = t.THREE;
  const ray = new THREE.Raycaster();
  const out = [];
  const dir = new THREE.Vector3();
  for (let yi = 0; yi <= 10; yi++) {
    const y = 1.85 - yi * 0.05;
    let line = `${y.toFixed(2)} `;
    for (let xi = 0; xi <= 40; xi++) {
      const x = -1.0 + xi * 0.05;
      const p = new THREE.Vector3(x, y, -2.488);
      dir.copy(p).sub(t.camera.position).normalize();
      ray.set(t.camera.position, dir);
      const d0 = t.camera.position.distanceTo(p);
      const hits = ray.intersectObjects(t.scene.children, true).filter((h) => h.distance < d0 - 0.004);
      let ch = '.';
      if (hits.length) {
        const o = hits[0].object;
        let n = '';
        for (let q = o; q; q = q.parent) if (q.name) { n = q.name; break; }
        ch = (n || o.type).replace(/^room:/, '')[0].toUpperCase();
      }
      line += ch;
    }
    out.push(line);
  }
  return out;
});
console.log('      ' + '-1.0'.padEnd(10) + '-0.5'.padEnd(10) + '0.0'.padEnd(10) + '0.5'.padEnd(10) + '1.0');
for (const r of rows) console.log(r);
await browser.close();
