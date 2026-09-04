#!/usr/bin/env node
// scratch, round 5: where the moved deck sits, where the ribbon sits, and where both fall in the
// camera piece's named frames. Prints world extents AND the frame fractions, so "even margin" is
// a number rather than an impression.
//   node tools/_rv-probe5.mjs [state]
import { chromium } from 'playwright';

const state = process.argv[2] ?? 'fan';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=${state}&shot=1&t=2.4`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1500);

const out = await page.evaluate(() => {
  const T = window.__theatre;
  const V3 = T.camera.position.constructor;
  const cam = T.camera;
  const px = (p) => {
    const v = p.clone().project(cam);
    return [Math.round(((v.x + 1) / 2) * 1600), Math.round(((1 - v.y) / 2) * 900)];
  };
  const r = { shot: T.pieces.camera?.current, camPos: cam.position.toArray().map((n) => +n.toFixed(3)), fov: +cam.fov.toFixed(1) };
  const L = T.layout;
  r.tableR = L.table.radius;
  r.deckPos = L.deck.pos;
  r.deckRadiusFromTableCentre = +Math.hypot(L.deck.pos[0], L.deck.pos[2]).toFixed(3);
  // the deck's own footprint corners against the rim
  const deck = T.pieces.cards?.deck;
  if (deck) {
    deck.updateMatrixWorld(true);
    const corners = [];
    for (const dx of [-0.065, 0.065]) for (const dz of [-0.11375, 0.11375]) {
      const p = new V3(dx, 0, dz);
      deck.localToWorld(p);
      corners.push(p);
    }
    r.deckCornerRadii = corners.map((p) => +Math.hypot(p.x, p.z).toFixed(3));
    r.deckPx = corners.map(px);
    r.deckWorldZ = [+Math.min(...corners.map((p) => p.z)).toFixed(3), +Math.max(...corners.map((p) => p.z)).toFixed(3)];
    r.deckWorldX = [+Math.min(...corners.map((p) => p.x)).toFixed(3), +Math.max(...corners.map((p) => p.x)).toFixed(3)];
  }
  // the fan's footprint
  const fan = T.scene.getObjectByName('fan');
  if (fan && fan.children.some((m) => m.visible)) {
    const xs = [], ys = [], wx = [], wz = [], rr = [];
    for (const m of fan.children) {
      if (!m.visible) continue;
      m.updateMatrixWorld(true);
      for (const dx of [-0.065, 0.065]) for (const dz of [-0.11375, 0.11375]) {
        const p = new V3(dx, 0, dz);
        m.localToWorld(p);
        wx.push(p.x);
        wz.push(p.z);
        rr.push(Math.hypot(p.x, p.z));
        const q = px(p);
        xs.push(q[0]);
        ys.push(q[1]);
      }
    }
    r.fan = {
      worldX: [+Math.min(...wx).toFixed(3), +Math.max(...wx).toFixed(3)],
      worldZ: [+Math.min(...wz).toFixed(3), +Math.max(...wz).toFixed(3)],
      maxRadius: +Math.max(...rr).toFixed(3),
      px: { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] },
    };
  }
  // the slot row
  const S = L.spread.slots, H = L.spread.card.h, W = L.spread.card.w;
  const sx = [], sy = [];
  for (const s of S) for (const dx of [-W / 2, W / 2]) for (const dz of [-H / 2, H / 2]) {
    const q = px(new V3(s[0] + dx, s[1], s[2] + dz));
    sx.push(q[0]);
    sy.push(q[1]);
  }
  r.slotRowPx = { x: [Math.min(...sx), Math.max(...sx)], y: [Math.min(...sy), Math.max(...sy)] };
  r.slotRowCentreFrac = +((r.slotRowPx.y[0] + r.slotRowPx.y[1]) / 2 / 900).toFixed(3);
  if (r.fan) r.fanCentreFrac = +((r.fan.px.y[0] + r.fan.px.y[1]) / 2 / 900).toFixed(3);
  // where the frame's edges fall on the cloth (for a straight-down shot this is exact)
  const edge = (nx, ny) => {
    // unproject a point on the near plane and march to y = spread.y
    const p = new V3(nx, ny, 0.5).unproject(cam);
    const d = p.clone().sub(cam.position).normalize();
    const t = (L.spread.y - cam.position.y) / d.y;
    return t > 0 ? [+(cam.position.x + d.x * t).toFixed(3), +(cam.position.z + d.z * t).toFixed(3)] : null;
  };
  r.frameOnCloth = { topLeft: edge(-1, 1), topRight: edge(1, 1), bottomLeft: edge(-1, -1), bottomRight: edge(1, -1) };
  // the drawn hand
  const g = T.scene.getObjectByName('reveal-hand');
  r.handShown = !!g?.visible;
  if (g?.visible) r.handWristPx = px(g.getWorldPosition(new V3()));
  return r;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
