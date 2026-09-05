#!/usr/bin/env node
// props round 6: prints the WORLD position of every direct child of the props group, plus the
// published lamps, so "everything standing on the chest kept its coordinates" is a diff of two
// runs of this and not a promise.
//   node tools/_props-r6-chest.mjs > /path/before.json
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=props&state=default&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
const out = await page.evaluate(() => {
  const T = window.__theatre;
  const V = T.THREE.Vector3;
  let props = null;
  T.scene.traverse((o) => { if (o.name === 'props') props = o; });
  if (!props) return { err: 'no props group' };
  const f = (n) => Number(n.toFixed(4));
  const sig = (o) => {
    let meshes = 0, verts = 0;
    o.traverse((c) => { if (c.isMesh) { meshes++; verts += c.geometry?.attributes?.position?.count ?? 0; } });
    return `${meshes}m/${verts}v`;
  };
  // everything whose world y is above 0.80 and below 1.30 and within the chest's footprint is
  // "standing on the chest"; listed separately and exactly.
  const rows = props.children.map((c, i) => {
    const w = c.getWorldPosition(new V());
    return { i, type: c.type, name: c.name || '', pos: [f(w.x), f(w.y), f(w.z)], ry: f(c.rotation.y), sig: sig(c) };
  });
  const onChest = rows.filter((r) => r.pos[1] >= 0.79 && r.pos[1] <= 1.35 && Math.abs(r.pos[0]) <= 0.55 && r.pos[2] < -1.9);
  const p = T.pieces.props;
  return {
    lamps: Object.fromEntries(Object.entries(p.lamps).map(([k, v]) => [k, [f(v.x), f(v.y), f(v.z)]])),
    rug: { near: p.rug.near, far: p.rug.far, w: p.rug.w, plainFrom: f(p.rug.plainFrom) },
    sign: { w: p.sign.w, h: p.sign.h, pivot: p.sign.pivot ? p.sign.pivot.position.toArray().map(f) : null },
    onChest,
    children: rows,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
