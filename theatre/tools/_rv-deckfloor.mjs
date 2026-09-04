#!/usr/bin/env node
// scratch, round 5: what is UNDER the deck. Raycasts straight down from above the deck's four
// corners and its centre and reports the first thing hit and at what height, so "the deck is on the
// cloth" is a measurement and not an impression.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=dealt&shot=1&t=2.4', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(800);

const out = await page.evaluate(() => {
  const T = window.__theatre;
  const THREE = T.THREE;
  const L = T.layout;
  const deck = T.pieces.cards?.deck;
  deck.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const probe = (dx, dz) => {
    const p = new THREE.Vector3(dx, 0, dz);
    deck.localToWorld(p);
    ray.set(new THREE.Vector3(p.x, 1.4, p.z), down);
    const hits = ray.intersectObject(T.scene, true).filter((h) => h.object.visible && !h.object.name.startsWith('deck') && !h.object.name.startsWith('tmp:') && !h.object.name.startsWith('card') && !h.object.name.startsWith('fan-'));
    const h = hits[0];
    return {
      at: [+p.x.toFixed(3), +p.z.toFixed(3)],
      r: +Math.hypot(p.x, p.z).toFixed(3),
      under: h ? h.object.name || h.object.type : null,
      y: h ? +h.point.y.toFixed(4) : null,
    };
  };
  const W = 0.065, H = 0.11375;
  return {
    deckPos: L.deck.pos,
    tableRadius: L.table.radius,
    tableTop: L.table.top,
    corners: [probe(0, 0), probe(-W, -H), probe(W, -H), probe(-W, H), probe(W, H)],
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
