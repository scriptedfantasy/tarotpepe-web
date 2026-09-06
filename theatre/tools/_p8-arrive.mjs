// r8: drive the real thing. Calls pepeAnim.arrive() the way flow would, waits for its promise, and
// reports how long it took, what was on the stage while it ran, and what is on the stage after —
// which is the only test that matters for the hand-off: he must be back on his bench, in the rest
// pose, with the can still where he put it.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE ERROR', m.text());
});
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });

const res = await page.evaluate(async () => {
  const T = window.__theatre;
  T.pieces.camera?.cut?.('wide');
  const A = T.pieces.pepe.arrival;
  const t0 = performance.now();
  const seen = new Set();
  const tick = setInterval(() => {
    for (const c of A.group.children) if (c.visible) seen.add(c.name);
  }, 40);
  await T.pieces.pepeAnim.arrive();
  clearInterval(tick);
  return {
    seconds: +((performance.now() - t0) / 1000).toFixed(2),
    declared: T.pieces.pepeAnim.arriveSeconds,
    phases: T.pieces.pepeAnim.arrivePhases,
    shown: [...seen].sort(),
    after: {
      arriveGroupVisible: A.group.visible,
      platesVisible: A.group.children.filter((c) => c.visible).map((c) => c.name),
      seated: T.pieces.pepe.parts.torso.visible,
      torsoRot: +T.pieces.pepe.parts.torso.rotation.z.toFixed(4),
      torsoPos: T.pieces.pepe.parts.torso.position.toArray().map((v) => +v.toFixed(4)),
      canAt: A.can.position.toArray().map((v) => +v.toFixed(3)),
    },
  };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
