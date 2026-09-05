// throwaway (camera round 8): how much of the fan the caption's placard covers, in pixels, and
// where the reading row sits in the plate.
//   node tools/_cam-r8-placard.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 760);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=flow&state=fan&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1500);
console.log(
  await page.evaluate(() => {
    const T = window.__theatre, THREE = T.THREE, cam = T.camera;
    const w = window.innerWidth, h = window.innerHeight;
    const P = (v) => {
      const p = v.clone().project(cam);
      return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h];
    };
    // the spread's cards, as drawn
    const f = T.pieces.reveal._fan;
    let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
    const cw = T.layout.spread.card.w / 2, ch = T.layout.spread.card.h / 2;
    for (const e of f.entries) {
      if (!e.mesh?.visible) continue;
      for (const a of [-1, 1]) for (const b of [-1, 1]) {
        const q = e.mesh.localToWorld(new THREE.Vector3(b * cw, 0, a * ch));
        const [px, py] = P(q);
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
    }
    // the three reading slots, as boxes
    const Y = T.layout.spread.y;
    const slots = T.pieces.reveal.slots.map(([sx, , sz]) => {
      const c = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) c.push(P(new THREE.Vector3(sx + b * cw, Y, sz + a * ch)));
      return c;
    }).flat();
    const rowY0 = Math.min(...slots.map((p) => p[1])), rowY1 = Math.max(...slots.map((p) => p[1]));
    const rowX0 = Math.min(...slots.map((p) => p[0])), rowX1 = Math.max(...slots.map((p) => p[0]));
    // the placard
    const el = document.querySelector('#dialogue .placard, #dialogue .card, #dialogue > *') ?? document.getElementById('dialogue');
    const boxes = [...document.querySelectorAll('#dialogue .cap')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 40 && r.height > 12);
    const top = boxes.length ? Math.min(...boxes.map((r) => r.top)) : null;
    const bot = boxes.length ? Math.max(...boxes.map((r) => r.bottom)) : null;
    const cover = top == null ? null : Math.max(0, y1 - Math.max(top, y0));
    return [
      `frame ${w}x${h}`,
      `spread on screen  x ${x0.toFixed(0)}…${x1.toFixed(0)}  y ${y0.toFixed(0)}…${y1.toFixed(0)}   ${(x1 - x0).toFixed(0)}x${(y1 - y0).toFixed(0)} px`,
      `reading row       x ${rowX0.toFixed(0)}…${rowX1.toFixed(0)}  y ${rowY0.toFixed(0)}…${rowY1.toFixed(0)}`,
      `placard           y ${top?.toFixed(0)}…${bot?.toFixed(0)}  (${el?.tagName}.${el?.className})`,
      `placard covers    ${cover?.toFixed(0)} px of the fan's ${(y1 - y0).toFixed(0)} px  (${((cover / (y1 - y0)) * 100).toFixed(0)}%)`,
      `margins           left ${x0.toFixed(0)}px  right ${(w - x1).toFixed(0)}px`,
    ].join('\n');
  }),
);
await browser.close();
