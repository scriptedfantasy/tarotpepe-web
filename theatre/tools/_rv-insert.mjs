#!/usr/bin/env node
// scratch, round 6: the card insert as the film actually plays it — reveal lays its row, the
// camera cuts to one of the three inserts, and the frame is saved and measured (where every
// card's corners fall in the frame, in fractions of the width, so "the neighbour is in frame"
// is a number).
//   node tools/_rv-insert.mjs <state> <shot> <out.png> [width] [height] [t]
import { chromium } from 'playwright';

const [, , state = 'revealed', shot = 'card1', out = '/tmp/insert.png', W = 1600, H = 900, t = 2.4] = process.argv;
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=${state}&shot=1&t=${t}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(600);
await page.evaluate((s) => window.__theatre.pieces.camera?.cut?.(s), shot);
await page.waitForTimeout(900);

const info = await page.evaluate(({ w, h }) => {
  const T = window.__theatre, cam = T.camera;
  const V3 = cam.position.constructor;
  const px = (p) => {
    const v = p.clone().project(cam);
    return [+(((v.x + 1) / 2) * w).toFixed(0), +(((1 - v.y) / 2) * h).toFixed(0)];
  };
  const r = { shot: T.pieces.camera?.current, camPos: cam.position.toArray().map((n) => +n.toFixed(3)), fov: +cam.fov.toFixed(1) };
  r.revealSlots = T.pieces.reveal?.slots;
  r.layoutSlots = T.layout.spread.slots;
  const drawn = T.pieces.cards?.drawn;
  const W2 = T.layout.spread.card.w / 2, H2 = T.layout.spread.card.h / 2;
  r.cards = (drawn?.children ?? []).map((m) => {
    m.updateMatrixWorld(true);
    const c = [];
    for (const dx of [-W2, W2]) for (const dz of [-H2, H2]) c.push(px(m.localToWorld(new V3(dx, 0, dz))));
    return { name: m.name, x: [Math.min(...c.map((p) => p[0])), Math.max(...c.map((p) => p[0]))], y: [Math.min(...c.map((p) => p[1])), Math.max(...c.map((p) => p[1]))] };
  });
  const g = T.scene.getObjectByName('reveal-ground');
  r.patches = (g?.children ?? []).map((m) => (m.visible ? px(m.position) : null));
  return r;
}, { w: +W, h: +H });

await page.screenshot({ path: out });
await browser.close();
if (errs.length) console.log('PAGE ERRORS:\n - ' + errs.join('\n - '));
console.log(JSON.stringify(info, null, 1));
console.log('wrote', out);
