// throwaway (camera round 8): THE LIVE APP, no view and no shot=1 — what pose is the camera
// actually on, beat by beat, and is it the pose the judging still shows?
//   node tools/_cam-r8-live.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 760);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });

const read = (label) =>
  page.evaluate((l) => {
    const T = window.__theatre, C = T.pieces.camera;
    const r4 = (v) => +v.toFixed(4);
    const named = Object.entries(C.shots).find(([, s]) => s && Math.abs(s.pos[2] - T.camera.position.z) < 1e-3 && Math.abs((s.fov ?? 30) - T.camera.fov) < 1e-3);
    return `${l.padEnd(14)} current=${String(C.current).padEnd(8)} entrance=${T.pieces.entrance?.mode} flow=${T.pieces.flow?.beat} cam pos ${T.camera.position.toArray().map(r4)} fov ${r4(T.camera.fov)} matches "${named?.[0] ?? 'NO NAMED SHOT'}"`;
  }, label);

console.log(await read('on load'));
await page.waitForFunction("window.__theatre.pieces.entrance?.mode === 'closed'", null, { timeout: 60000 });
console.log(await read('door up'));
await page.mouse.click(W / 2, H / 2); // the knock
await page.waitForTimeout(1000);
console.log(await read('knocked +1s'));
await page.waitForTimeout(2500);
console.log(await read('landed +3.5s'));
await page.waitForTimeout(4000);
console.log(await read('+7.5s'));
// and the same plate the judging still shows
console.log(
  await page.evaluate(() => {
    const C = window.__theatre.pieces.camera;
    const r4 = (v) => +v.toFixed(4);
    const s = (n) => `${n}: pos ${C.shots[n].pos.map(r4)} fov ${r4(C.shots[n].fov)}`;
    return ['home', 'wide', 'fan', 'turn'].map(s).join('\n');
  }),
);
await browser.close();
