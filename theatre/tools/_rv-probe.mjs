#!/usr/bin/env node
// scratch probe: where the drawn hand and its sleeve actually are, and how big they read on screen.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan&shot=1&t=1.5', { waitUntil: 'load' });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 60000 });
await page.waitForTimeout(1500);

const out = await page.evaluate(() => {
  const T = window.__theatre;
  const V3 = T.camera.position.constructor;
  const THREE = { Vector3: V3, Box3: class {} };
  const cam = T.camera;
  const g = T.scene.getObjectByName('reveal-hand');
  const proj = (o, local) => {
    o.updateMatrixWorld(true);
    const v = local.clone();
    o.localToWorld(v);
    const w = v.clone();
    v.project(cam);
    return { world: [+w.x.toFixed(3), +w.y.toFixed(3), +w.z.toFixed(3)], px: [Math.round(((v.x + 1) / 2) * 1600), Math.round(((1 - v.y) / 2) * 900)] };
  };
  const r = { shot: T.pieces.camera?.current, handVisible: !!g?.visible, children: [] };
  if (!g) return r;
  g.traverse((o) => {
    if (o.isMesh) r.children.push({ name: o.name, visible: o.visible, castShadow: o.castShadow, scale: [o.scale.x, o.scale.y, o.scale.z].map((n) => +n.toFixed(3)) });
  });
  const sleeve = g.getObjectByName('reveal-hand-sleeve')?.children?.[0];
  if (sleeve) {
    r.sleeveWrist = proj(sleeve, new THREE.Vector3(0, 0, 0.014));
    r.sleeveFar = proj(sleeve, new THREE.Vector3(0, 0, -1));
  }
  const pose = g.getObjectByName('reveal-hand-splay');
  if (pose) {
    r.handWrist = proj(pose, new THREE.Vector3(0, 0, 0));
    r.handTip = proj(pose, new THREE.Vector3(0, 0, 1));
    r.handL = proj(pose, new THREE.Vector3(-0.5, 0, 0.5));
    r.handR = proj(pose, new THREE.Vector3(0.5, 0, 0.5));
  }
  // a card in the fan, for scale
  const fan = T.scene.getObjectByName('fan');
  const c = fan?.children?.find((m) => m.visible);
  if (c) {
    const L = proj(c, new THREE.Vector3(-0.065, 0, 0));
    const R2 = proj(c, new THREE.Vector3(0.065, 0, 0));
    r.cardWidthPx = Math.round(Math.hypot(R2.px[0] - L.px[0], R2.px[1] - L.px[1]));
  }
  // fan extents on screen: the four corners of every visible card
  if (fan && fan.children.length) {
    const W2 = 0.065, H2 = 0.11375;
    const xs = [], ys = [], wx = [], wz = [];
    for (const m of fan.children) {
      if (!m.visible) continue;
      m.updateMatrixWorld(true);
      for (const dx of [-W2, W2]) for (const dz of [-H2, H2]) {
        const p = new THREE.Vector3(dx, 0, dz);
        m.localToWorld(p);
        wx.push(p.x);
        wz.push(p.z);
        const v = p.clone().project(cam);
        xs.push(Math.round(((v.x + 1) / 2) * 1600));
        ys.push(Math.round(((1 - v.y) / 2) * 900));
      }
    }
    r.fanBox = { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)], worldX: [+Math.min(...wx).toFixed(3), +Math.max(...wx).toFixed(3)], worldZ: [+Math.min(...wz).toFixed(3), +Math.max(...wz).toFixed(3)] };
  }
  const slots = T.layout.spread.slots;
  r.slotPx = slots.map((s) => {
    const v = new THREE.Vector3(s[0], s[1], s[2]).project(cam);
    return [Math.round(((v.x + 1) / 2) * 1600), Math.round(((1 - v.y) / 2) * 900)];
  });
  const sh = T.layout.shots;
  r.shots = { fan: sh.fan, spread: sh.spread, card1: sh.card1 };
  r.camPos = cam.position.toArray().map((n) => +n.toFixed(3));
  r.camFov = cam.fov;
  return r;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
