#!/usr/bin/env node
// scratch (dialogue r7): where the caption card stands, and how much of the spread it covers.
//   node tools/_dlg-r7.mjs --view flow --state fan --width 390 --height 760
// Prints the card's box, the fan's on-screen extent (reveal.fanScreenPositions), the overlap in px
// and as a percentage of the spread, and the camera shot the card thinks it is in.
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const width = +(args.width ?? 390);
const height = +(args.height ?? 760);
const wait = +(args.wait ?? 3000);
const u = new URL('http://127.0.0.1:5173/');
if (args.view) u.searchParams.set('view', args.view);
if (args.state) u.searchParams.set('state', args.state);
u.searchParams.set('shot', '1');

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}` }),
);
const t0 = Date.now();
await page.goto(u.toString(), { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 150000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(250);
}
await page.waitForTimeout(wait);

// --under <abs.png>: the same frame with the caption card taken off, so what it covers can be seen
if (args.under) {
  await page.evaluate(() => (document.getElementById('dialogue').style.visibility = 'hidden'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: args.under, timeout: 120000 });
  await page.evaluate(() => (document.getElementById('dialogue').style.visibility = ''));
  await page.waitForTimeout(400);
  console.error('wrote', args.under);
}

const out = await page.evaluate(() => {
  const P = window.__theatre?.pieces ?? {};
  const cap = document.querySelector('#dialogue .cap:not(.ruler)');
  const r = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
  const box = r ? { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1) } : null;
  // the spread's real extent: every corner of every card still in the fan, projected
  let fan = null;
  try {
    const T = window.__theatre?.THREE;
    const canvas = document.querySelector('#stage canvas') ?? document.querySelector('canvas');
    const rc = canvas.getBoundingClientRect();
    const rem = P.reveal?._fan?.remaining?.() ?? [];
    if (rem.length && T) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      const v = new T.Vector3();
      for (const e of rem) {
        e.mesh.updateMatrixWorld(true);
        const g = e.mesh.geometry;
        g.computeBoundingBox?.();
        const b = g.boundingBox;
        for (let i = 0; i < 8; i++) {
          v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)
            .applyMatrix4(e.mesh.matrixWorld)
            .project(window.__theatre.camera);
          const sx = rc.left + ((v.x + 1) / 2) * rc.width, sy = rc.top + ((1 - v.y) / 2) * rc.height;
          if (sx < x0) x0 = sx; if (sx > x1) x1 = sx;
          if (sy < y0) y0 = sy; if (sy > y1) y1 = sy;
        }
      }
      fan = { n: rem.length, left: +x0.toFixed(1), right: +x1.toFixed(1), top: +y0.toFixed(1), bottom: +y1.toFixed(1) };
    }
  } catch (e) { fan = { err: String(e) }; }
  let overlapPx = 0, spreadPx = 0;
  if (fan && !fan.err && box) {
    spreadPx = fan.bottom - fan.top;
    overlapPx = Math.max(0, Math.min(box.bottom, fan.bottom) - Math.max(box.y, fan.top));
  }
  return {
    shot: P.camera?.current, beat: P.flow?.beat, picks: P.reveal?.picks?.length, fanCount: P.reveal?.fanCount,
    size: { w: innerWidth, h: innerHeight }, box, fan,
    overlap: { px: +overlapPx.toFixed(1), spreadPx: +spreadPx.toFixed(1), pct: spreadPx ? +((overlapPx / spreadPx) * 100).toFixed(1) : 0 },
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
if (errors.length) console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
