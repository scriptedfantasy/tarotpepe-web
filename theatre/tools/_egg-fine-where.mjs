#!/usr/bin/env node
// WHERE THE FIRE CAN STAND. The three places the user named — the lamp's own shade, the shelf
// edges either side of him, the table's edge nearest the lens — measured on the glass at the home
// plate and on a phone, so a flame is put where the camera can actually see one.
//   BASE=http://127.0.0.1:8713/ node tools/_egg-fine-where.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const OUT = process.argv[2] ?? '/tmp/egg-fine';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  });
const open = async (w, h, q) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  p.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  await p.route('**/@vite/client', stub);
  await p.goto(new URL(q, BASE).toString(), { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  return p;
};
for (const [W, H] of [[1280, 800], [390, 844]]) {
  const page = await open(W, H, '/?view=props&state=default&shot=1&now=21:12');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.waitForTimeout(900);
  const info = await page.evaluate(
    ({ W, H }) => {
      const T = window.__theatre;
      const THREE = T.THREE;
      const cam = T.camera;
      const v = new THREE.Vector3();
      const pt = (x, y, z) => {
        v.set(x, y, z).project(cam);
        return [+(((v.x + 1) / 2) * W).toFixed(1), +(((1 - v.y) / 2) * H).toFixed(1)];
      };
      let dome = null;
      T.scene.traverse((o) => {
        if (!dome && o.geometry?.type === 'SphereGeometry' && Math.abs((o.geometry.parameters.radius ?? 0) - 0.115) < 1e-6) dome = o;
      });
      dome?.updateWorldMatrix(true, false);
      const dw = dome ? dome.getWorldPosition(new THREE.Vector3()).toArray().map((n) => +n.toFixed(3)) : null;
      const cases = [];
      T.scene.traverse((o) => {
        if (o.userData?.inner && o.children.length > 4) {
          o.updateWorldMatrix(true, false);
          cases.push(o.getWorldPosition(new THREE.Vector3()).toArray().map((n) => +n.toFixed(3)));
        }
      });
      const table = T.pieces.table?.group;
      table?.updateMatrixWorld(true);
      const tb = table ? new THREE.Box3().setFromObject(table) : null;
      // what stands on the two top boards, and how much of them it takes: a flame has to clear it
      const box = (o) => {
        if (!o) return null;
        o.updateWorldMatrix(true, true);
        const b = new THREE.Box3().setFromObject(o);
        return [b.min.toArray().map((n) => +n.toFixed(3)), b.max.toArray().map((n) => +n.toFixed(3))];
      };
      let globe = null;
      T.scene.traverse((o) => {
        if (!globe && o.geometry?.type === 'SphereGeometry' && Math.abs((o.geometry.parameters.radius ?? 0) - 0.08) < 1e-6) globe = o.parent;
      });
      return {
        cam: { cur: T.pieces.camera.current, pos: cam.position.toArray().map((n) => +n.toFixed(2)), fov: +cam.fov.toFixed(1), home: T.pieces.camera.shots.home },
        globeBox: box(globe),
        catBox: box(T.scene.getObjectByName('cat')),
        domeWorld: dw,
        cases,
        tableBox: tb ? [tb.min.toArray().map((n) => +n.toFixed(3)), tb.max.toArray().map((n) => +n.toFixed(3))] : null,
        px: {
          domeL: pt(dw[0] - 0.115, dw[1], dw[2]),
          domeR: pt(dw[0] + 0.115, dw[1], dw[2]),
          domeTop: pt(dw[0], dw[1] + 0.115, dw[2]),
          domeFront: pt(dw[0], dw[1], dw[2] + 0.115),
          caseL_top: pt(-0.85, 1.02, -2.18),
          caseL_b57: pt(-0.85, 0.57, -2.185),
          caseL_b15: pt(-0.85, 0.15, -2.185),
          caseR_top: pt(0.85, 1.02, -2.18),
          caseR_b57: pt(0.85, 0.57, -2.185),
          caseR_b15: pt(0.85, 0.15, -2.185),
          tableNear: pt(0, 0.76, 0.62),
          tableNearL: pt(-0.42, 0.76, 0.45),
          tableNearR: pt(0.42, 0.76, 0.45),
        },
      };
    },
    { W, H },
  );
  console.log(W + 'x' + H, JSON.stringify(info, null, 1));
  await page.screenshot({ path: `${OUT}/where-${W}x${H}.png` });
  await page.close();
}
await browser.close();
