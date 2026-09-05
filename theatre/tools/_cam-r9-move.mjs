// throwaway (camera round 9): THE REFRAME AS A SHEET. The headless renderer draws about one frame a
// second in software WebGL, so a third-of-a-second move cannot be caught by screenshotting the page
// on a timer — every tile would land after it. This drives the camera through the move itself, at
// EQUAL TIME STEPS, with the same motor camera.js uses, and shoots a tile at each: the spacing of
// the tiles IS the velocity curve, so a move that decelerates shows the last tiles bunched.
//   node tools/_cam-r9-move.mjs [w] [h] [tiles]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { LAYOUT as L } from '../src/core/layout.js';
import { SPREAD } from '../src/pieces/reveal-spread.js';
import { stagedRow } from '../src/pieces/reveal-takes.js';
import { buildShots } from '../src/pieces/camera-shots.js';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900), N = +(process.argv[4] ?? 8);
const OUT = process.argv[5] ?? `/tmp/c9-move-${W}x${H}.png`;
// camera.js's motor, with the open move's ramps
const motor = (u, ramp, brake) => {
  const v = 1 / (1 - (ramp + brake) / 2);
  if (u < ramp) return (v * u * u) / (2 * ramp);
  if (u > 1 - brake) return 1 - (v * (1 - u) * (1 - u)) / (2 * brake);
  return v * (u - ramp / 2);
};
const props = { rug: { plainFrom: 1.216 } };
const reveal = { slots: stagedRow(L), _fan: { SPREAD } };
const A = W / H;
const a = buildShots(L, A, reveal, { laid: 0, props }).fan;
const b = buildShots(L, A, reveal, { laid: 1, props }).fan;
console.log(`from fov ${a.fov.toFixed(3)} z ${a.pos[2].toFixed(4)}  →  to fov ${b.fov.toFixed(3)} z ${b.pos[2].toFixed(4)}`);

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1500);
// the card that motivates the move is already in its slot: the move is the answer to it
await page.evaluate(() => {
  const R = window.__theatre.pieces.reveal, f = R._fan;
  f.fakePicks([f.keystoneIndex]);
  R.picks.push({ index: f.keystoneIndex, ordinal: 1, slug: 'x', slot: 0, mesh: null });
});
await page.waitForTimeout(4000);

const bufs = [];
const zs = [];
for (let i = 0; i < N; i++) {
  const u = motor(i / (N - 1), 0.08, 0.62);
  const z = a.pos[2] + (b.pos[2] - a.pos[2]) * u;
  const fov = a.fov + (b.fov - a.fov) * u;
  zs.push(`u=${(i / (N - 1)).toFixed(2)}→${u.toFixed(3)} fov ${fov.toFixed(2)}`);
  await page.evaluate((s) => {
    const T = window.__theatre, THREE = T.THREE, c = T.camera;
    c.position.set(0, s.y, s.z);
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, s.y, s.z), new THREE.Vector3(0, s.ly, s.z), new THREE.Vector3(0, 0, -1));
    c.quaternion.setFromRotationMatrix(m);
    c.up.set(0, 1, 0).applyQuaternion(c.quaternion);
    c.fov = s.fov;
    c.clearViewOffset?.();
    c.aspect = window.innerWidth / window.innerHeight;
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
  }, { y: a.pos[1], ly: L.spread.y, z, fov });
  await page.waitForTimeout(700);
  bufs.push(await page.screenshot({ timeout: 120000 }));
}
console.log(zs.join('\n'));
const cols = Math.ceil(N / 2), cw = Math.round(W / 2), ch = Math.round(H / 2);
const tiles = await Promise.all(bufs.map((x) => sharp(x).resize(cw, ch).png().toBuffer()));
await sharp({ create: { width: cw * cols, height: ch * 2, channels: 3, background: '#111' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cw, top: Math.floor(i / cols) * ch })))
  .png().toFile(OUT);
console.log('wrote', OUT);
await browser.close();
