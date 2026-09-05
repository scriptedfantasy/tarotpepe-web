#!/usr/bin/env node
// Does the arrival land ON the solved `home`, or near it? Plays the walk in, then reads the live
// camera's pose and projection out of the page and holds them against the pose the camera piece
// solves for `home` in the same window.  node tools/_ent-land.mjs [--width 1600 --height 900]
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const width = +(args.width ?? 1600), height = +(args.height ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`http://127.0.0.1:5173/?view=entrance&state=arrived&shot=1`, { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
while (Date.now() - t0 < 150000) {
  let ok = false;
  try { ok = await page.evaluate(() => window.__theatreReady === true); } catch {}
  if (ok) break;
  await page.waitForTimeout(200);
}
await page.waitForTimeout(7000);
const r = await page.evaluate(() => {
  const T = window.__theatre;
  const cam = T.camera, C = T.pieces.camera;
  const solved = C.shots.home;
  const m = cam.projectionMatrix.elements.slice();
  return {
    current: C.current,
    pos: cam.position.toArray(),
    solvedPos: solved.pos,
    fov: cam.fov,
    solvedFov: solved.fov,
    quat: cam.quaternion.toArray(),
    view: cam.view ? { enabled: cam.view.enabled, offsetX: cam.view.offsetX, offsetY: cam.view.offsetY } : null,
    solvedShift: solved.shift,
    proj: m,
    entranceMode: T.pieces.entrance.mode,
    sheetUp: !!document.querySelector('#entrance.up'),
  };
});
// and the projection the camera piece would produce from a plain cut('home'), for the same window
const r2 = await page.evaluate(() => {
  const T = window.__theatre;
  T.pieces.camera.cut('home');
  T.camera.updateMatrixWorld();
  return { pos: T.camera.position.toArray(), fov: T.camera.fov, proj: T.camera.projectionMatrix.elements.slice(), quat: T.camera.quaternion.toArray() };
});
await browser.close();
const d = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
console.log(`window ${width}x${height}`);
console.log(`  camera.current after the arrival: ${r.current}   entrance.mode: ${r.entranceMode}   sheet up: ${r.sheetUp}`);
console.log(`  position  ${r.pos.map((v) => v.toFixed(6))}   solved home ${r.solvedPos}`);
console.log(`  fov ${r.fov} / solved ${r.solvedFov}   view offset ${JSON.stringify(r.view)}  solved shift ${JSON.stringify(r.solvedShift)}`);
console.log(`  max |Δ| against a plain cut('home'):  position ${d(r.pos, r2.pos).toExponential(2)}  quaternion ${d(r.quat, r2.quat).toExponential(2)}  projection matrix ${d(r.proj, r2.proj).toExponential(2)}`);
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
