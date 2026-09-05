#!/usr/bin/env node
// round 8: WHAT IS ON THE FRAME'S AXIS, and how much of the visible table the spread uses.
// Projects every card of the spread to screen, reports which cards the vertical axis of the
// picture crosses and in what draw order, plus the spread's share of the table's visible disc.
//   node tools/_rv8-axis.mjs [width] [height]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 760);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const T = window.__theatre;
  const f = T.pieces.reveal._fan;
  const V3 = T.camera.position.constructor;
  const cam = T.camera;
  const w = window.innerWidth, h = window.innerHeight;
  const proj = (v3) => {
    const v = v3.clone().project(cam);
    return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
  };
  // the table's centre and rim, on the cloth plane
  const Y = T.layout.spread.y;
  const centre = proj(new V3(0, Y, 0));
  const rimPts = [];
  for (let k = 0; k < 180; k++) {
    const a = (k / 180) * Math.PI * 2;
    rimPts.push(proj(new V3(0.62 * Math.sin(a), Y, 0.62 * Math.cos(a))));
  }
  // each card's screen quad
  const cw = T.layout.spread.card.w / 2, ch = T.layout.spread.card.h / 2;
  const cards = f.entries.map((e) => {
    e.mesh.updateMatrixWorld(true);
    const q = [];
    for (const [dx, dz] of [[-cw, -ch], [cw, -ch], [cw, ch], [-cw, ch]]) q.push(proj(e.mesh.localToWorld(new V3(dx, 0, dz))));
    return { i: e.i, tier: e.t.k, j: e.j, y: e.mesh.position.y, quad: q, cx: e.mesh.position.x, cz: e.mesh.position.z };
  });
  return { centre, rimPts, cards, w, h };
});
await browser.close();

const { centre, rimPts, cards, w, h } = out;
const inside = (q, px, py) => {
  let s = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    if ((q[i][1] > py) !== (q[j][1] > py) && px < ((q[j][0] - q[i][0]) * (py - q[i][1])) / (q[j][1] - q[i][1]) + q[i][0]) s = !s;
  }
  return s;
};
console.log(`viewport ${w}x${h}   table centre projects to x=${centre[0].toFixed(1)} y=${centre[1].toFixed(1)}`);
const AX = centre[0];
// the cards the axis crosses, top to bottom on screen
const crossed = cards.filter((c) => {
  const ys = c.quad.map((p) => p[1]);
  const yy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return inside(c.quad, AX, yy);
});
console.log('cards the table-axis passes through:');
for (const c of crossed.sort((a, b) => b.y - a.y)) {
  const xs = c.quad.map((p) => p[0]);
  console.log(`   tier ${c.tier} j ${String(c.j).padStart(2)}  y=${c.y.toFixed(5)}  screen x ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)}  (axis at ${AX.toFixed(1)})`);
}
// keystones
console.log('keystone of each bow:');
const tiers = [...new Set(cards.map((c) => c.tier))];
for (const t of tiers) {
  const cs = cards.filter((c) => c.tier === t);
  const n = cs.length;
  const mid = cs.find((c) => c.j === (n - 1) / 2);
  if (!mid) { console.log(`   tier ${t} n=${n} EVEN — no middle card`); continue; }
  const xs = mid.quad.map((p) => p[0]);
  const others = cs.filter((c) => Math.abs(c.j - mid.j) <= 1);
  console.log(`   tier ${t} n=${n} j=${mid.j} cloth x=${mid.cx.toFixed(4)} screen ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)} y=${mid.y.toFixed(5)}  neighbours y=${others.map((o) => o.y.toFixed(5)).join(',')}`);
}
// area share: spread's screen footprint vs table's visible screen area, both clipped to the viewport
const px = (x, y) => [Math.round(x), Math.round(y)];
const grid = 2;
let tableN = 0, spreadN = 0;
// point-in-polygon over the rim
for (let y = 0; y < h; y += grid)
  for (let x = 0; x < w; x += grid) {
    if (!inside(rimPts, x, y)) continue;
    tableN++;
    for (const c of cards) if (inside(c.quad, x, y)) { spreadN++; break; }
  }
console.log(`table visible in frame ${(tableN * grid * grid)} px²   spread ${(spreadN * grid * grid)} px²   share ${(100 * spreadN / Math.max(1, tableN)).toFixed(1)}%`);
// the spread's bounding box on screen
const allx = cards.flatMap((c) => c.quad.map((p) => p[0])), ally = cards.flatMap((c) => c.quad.map((p) => p[1]));
const rimx = rimPts.map((p) => p[0]), rimy = rimPts.map((p) => p[1]);
console.log(`spread bbox x ${Math.min(...allx).toFixed(0)}..${Math.max(...allx).toFixed(0)}  y ${Math.min(...ally).toFixed(0)}..${Math.max(...ally).toFixed(0)}`);
console.log(`table  bbox x ${Math.min(...rimx).toFixed(0)}..${Math.max(...rimx).toFixed(0)}  y ${Math.min(...rimy).toFixed(0)}..${Math.max(...rimy).toFixed(0)}`);
void px;
