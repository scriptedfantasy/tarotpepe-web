#!/usr/bin/env node
// round 7 scratch: what is actually on the cloth and where the plates fall.
//   node tools/_rv7-probe.mjs [state] [width] [height]
import { chromium } from 'playwright';

const state = process.argv[2] ?? 'fan';
const W = +(process.argv[3] ?? 1600), H = +(process.argv[4] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=${state}&shot=1&t=2.4`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);

const out = await page.evaluate(({ W, H }) => {
  const T = window.__theatre;
  const cam = T.camera;
  const L = T.layout;
  T.scene.updateMatrixWorld(true);
  const r = { view: [W, H], shot: T.pieces.camera?.current, camPos: cam.position.toArray().map((n) => +n.toFixed(3)), fov: +cam.fov.toFixed(2) };
  // world AABB of a subtree, without THREE: apply matrixWorld to each geometry's 8 bbox corners
  const boxOf = (root) => {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    root.traverse((o) => {
      if (!o.isMesh || o.visible === false || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox, e = o.matrixWorld.elements;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const p = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
        for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
      }
    });
    if (mn[0] === Infinity) return null;
    const f = (v) => +v.toFixed(3);
    return { x: [f(mn[0]), f(mx[0])], y: [f(mn[1]), f(mx[1])], z: [f(mn[2]), f(mx[2])] };
  };
  const still = T.scene.getObjectByName('still-life');
  if (still) r.still = still.children.map((c, i) => ({ i, name: c.name || c.type, box: boxOf(c) }));
  const deck = T.pieces.cards?.deck;
  if (deck) {
    r.deck = { pos: deck.position.toArray().map((n) => +n.toFixed(3)), rotY: +deck.rotation.y.toFixed(3), box: boxOf(deck) };
    r.deckChildren = deck.children.filter((c) => c.isMesh).map((c) => ({ name: c.name, visible: c.visible, box: boxOf(c) }));
  }
  const V3 = cam.position.constructor;
  const edge = (nx, ny) => {
    const p = new V3(nx, ny, 0.5).unproject(cam);
    const d = p.clone().sub(cam.position).normalize();
    const t = (L.spread.y - cam.position.y) / d.y;
    return t > 0 ? [+(cam.position.x + d.x * t).toFixed(3), +(cam.position.z + d.z * t).toFixed(3)] : null;
  };
  r.frameOnCloth = { TL: edge(-1, 1), TR: edge(1, 1), BL: edge(-1, -1), BR: edge(1, -1), CL: edge(-1, 0), CR: edge(1, 0) };
  const cl = edge(-1, 0), cr = edge(1, 0);
  if (cl && cr) r.pxPerM_x = +(W / Math.hypot(cr[0] - cl[0], cr[1] - cl[1])).toFixed(1);
  const tc = edge(0, 1), bc = edge(0, -1);
  if (tc && bc) r.clothDepthInFrame = +Math.hypot(bc[0] - tc[0], bc[1] - tc[1]).toFixed(3);
  // a metre of cloth in z, in px, at the middle of the frame (for a raked plate)
  const px = (x, z) => { const v = new V3(x, L.spread.y, z).project(cam); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]; };
  const a = px(0, 0.3), b = px(0, 0.4);
  r.pxPerM_z_at035 = +(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1).toFixed(1);
  const c2 = px(0, 0.3), d2 = px(0.1, 0.3);
  r.pxPerM_x_at03 = +(Math.hypot(d2[0] - c2[0], d2[1] - c2[1]) / 0.1).toFixed(1);
  r.slots = T.pieces.reveal?.slots;
  return r;
}, { W, H });
console.log(JSON.stringify(out, null, 1));
await browser.close();
