#!/usr/bin/env node
// WHERE THE WHOLE DECK MAY BE LAID, measured rather than guessed. Projects the four corners of the
// overhead plates (`fan` and `spread`) onto the cloth plane and reports the window each frames, at
// a laptop and at a phone — plus what the still life and the reading row take out of it.
//
//   BASE=http://127.0.0.1:8725 node tools/_egg-deck-where.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const viteStub = (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
  });

async function open(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGE ERROR', String(e)));
  await page.route('**/@vite/client', viteStub);
  await page.goto(`${BASE}/?t=2&seed=1&shot=1`, { waitUntil: 'load', timeout: 180000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(200);
  }
  return page;
}

const probe = (shot) =>
  ((s) => {
    const ctx = window.__theatre;
    ctx.pieces.camera.cut(s);
    ctx.camera.updateMatrixWorld(true);
    ctx.camera.updateProjectionMatrix();
    const Y = ctx.layout.spread.y;
    const T = window.__three ?? null;
    const out = [];
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      // unproject the frame corner onto the cloth plane
      const p = new ctx.THREE.Vector3(u, v, 0.5).unproject(ctx.camera);
      const d = p.clone().sub(ctx.camera.position).normalize();
      const t = (Y - ctx.camera.position.y) / d.y;
      out.push([+(ctx.camera.position.x + d.x * t).toFixed(4), +(ctx.camera.position.z + d.z * t).toFixed(4)]);
    }
    const xs = out.map((o) => o[0]), zs = out.map((o) => o[1]);
    return {
      shot: s,
      corners: out,
      x: [Math.min(...xs), Math.max(...xs)],
      z: [Math.min(...zs), Math.max(...zs)],
      wash: ctx.pieces.reveal?.tableBounds ?? null,
      pxPerM: window.innerWidth / (Math.max(...xs) - Math.min(...xs)),
    };
  })(shot);

for (const [w, h] of [[1600, 900], [390, 760]]) {
  const page = await open(w, h);
  for (const s of ['fan', 'spread']) {
    const r = await page.evaluate(probe, s);
    console.log(
      `${w}x${h} ${s.padEnd(6)} x ${r.x[0].toFixed(3)}..${r.x[1].toFixed(3)} (${(r.x[1] - r.x[0]).toFixed(3)} m) · z ${r.z[0].toFixed(3)}..${r.z[1].toFixed(3)} (${(r.z[1] - r.z[0]).toFixed(3)} m) · ${r.pxPerM.toFixed(0)} px/m`,
    );
    console.log(`        corners ${JSON.stringify(r.corners)}`);
  }
  const wash = await page.evaluate(() => window.__theatre.pieces.reveal?.tableBounds);
  console.log(`        wash bounds ${JSON.stringify(wash)}`);
  await page.close();
}
await browser.close();
