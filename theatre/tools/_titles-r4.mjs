#!/usr/bin/env node
// Measure the title cards against the frame, at a size. Not an eyeball: every canvas in #titles
// is measured by its client rect, and the screenshot itself is scanned for ink that touches an
// edge, so a drawing that spills past its own canvas is caught too.
//
//   node tools/_titles-r4.mjs 390x760 title [outpath.png]
//
// The piece is built ON ITS OWN — the page's DOM layers and CSS come from index.html, then
// /src/pieces/titles.js is imported and handed a stub ctx. Nothing else in the theatre is loaded,
// so another builder's half-saved file cannot hide this one's frame.
import { chromium } from 'playwright';
import sharp from 'sharp';

const argv = process.argv.slice(2);
// sweep mode: node tools/_titles-r4.mjs sweep <dir>   — every state at every size, one browser
if (argv[0] === 'sweep') {
  const dir = argv[1] || '/tmp';
  const { spawnSync } = await import('node:child_process');
  let bad = 0;
  for (const size of ['390x760', '360x640', '1200x1100', '1600x900'])
    for (const st of ['title', 'chapter', 'closing']) {
      const r = spawnSync(process.execPath, [process.argv[1], size, st, `${dir}/sw-${st}-${size}.png`], { stdio: 'inherit' });
      if (r.status) bad++;
    }
  process.exit(bad ? 2 : 0);
}
const [size = '390x760', state = 'title', out = ''] = argv;
const [W, H] = size.split('x').map(Number);

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
// The theatre's own boot is not wanted here: only this piece is under the lamp.
await page.route('**/src/main.js', (r) => r.fulfill({ contentType: 'application/javascript', body: '/* the rest of the theatre is not loaded for this measurement */' }));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}}}\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u}\nexport class ErrorOverlay{}' }),
);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);

const built = await page.evaluate(async (state) => {
  const mod = await import('/src/pieces/titles.js');
  const ctx = {
    dom: { titles: document.getElementById('titles'), letterbox: document.getElementById('letterbox') },
    size: { w: window.innerWidth, h: window.innerHeight },
    pieces: {},
    params: new URLSearchParams(location.search),
    clock: { t: 0, raw: 0, frame: 0, stepped: false },
    shotMode: true,
    on() {},
    emit() {},
  };
  const api = await mod.build(ctx);
  api.setState(state, ctx);
  for (let f = 0; f < 6; f++) {
    ctx.clock.frame = f;
    ctx.clock.t = f / 12;
    ctx.clock.stepped = true;
    api.update?.(ctx);
  }
  window.__titles = api;
  return true;
}, state);
await page.waitForTimeout(400);

const info = await page.evaluate(() => {
  const card = document.querySelector('#titles .card');
  if (!card) return { rows: [], empty: true };
  const rows = [];
  for (const el of card.querySelectorAll('canvas')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || el.classList.contains('frame')) continue; // the frame is full bleed by design
    rows.push({
      what: el.dataset.draw || 'canvas',
      cap: el.dataset.cap ? Math.round(+el.dataset.cap * 10) / 10 : null,
      runs: el.dataset.runs ? JSON.parse(el.dataset.runs).map((x) => x.t).join(' ') : '',
      l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom),
    });
  }
  const corners = card.querySelector('.corners');
  const stack = card.querySelector('.stack');
  const sr = stack?.getBoundingClientRect();
  return {
    stacked: !!corners?.classList.contains('stacked'),
    transform: stack ? getComputedStyle(stack).transform : 'none',
    stackBox: sr ? { t: Math.round(sr.top), b: Math.round(sr.bottom), h: Math.round(sr.height) } : null,
    rows,
  };
});

const buf = await page.screenshot({ type: 'png' });
if (out) await sharp(buf).toFile(out);
const { data, info: meta } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
const ch = meta.channels;
const g0 = [data[0], data[1], data[2]];
const far = (i) => Math.abs(data[i] - g0[0]) + Math.abs(data[i + 1] - g0[1]) + Math.abs(data[i + 2] - g0[2]) > 90;
let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
for (let y = 0; y < meta.height; y++)
  for (let x = 0; x < meta.width; x++) {
    if (!far((y * meta.width + x) * ch)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
const touch = { L: 0, R: 0, T: 0, B: 0 };
for (let y = 0; y < meta.height; y++) {
  if (far(y * meta.width * ch)) touch.L++;
  if (far((y * meta.width + meta.width - 1) * ch)) touch.R++;
}
for (let x = 0; x < meta.width; x++) {
  if (far(x * ch)) touch.T++;
  if (far(((meta.height - 1) * meta.width + x) * ch)) touch.B++;
}

console.log(`\n=== ${state} @ ${W}x${H} ===`);
if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 4).join(' / '));
console.log(`header stacked: ${info.stacked}   stack transform: ${info.transform}   stack box: ${JSON.stringify(info.stackBox)}`);
let worstL = 1e9, worstR = 1e9, minCap = 1e9;
for (const r of info.rows) {
  worstL = Math.min(worstL, r.l);
  worstR = Math.min(worstR, W - r.r);
  if (r.cap) minCap = Math.min(minCap, r.cap);
  const flag = r.l < 0 || r.r > W ? '   <<< OUT OF FRAME' : '';
  console.log(`  ${String(r.what).padEnd(9)} x ${String(r.l).padStart(5)}..${String(r.r).padStart(5)}  y ${String(r.t).padStart(4)}..${String(r.b).padStart(4)}  cap ${String(r.cap ?? '-').padStart(5)}  ${r.runs.slice(0, 44)}${flag}`);
}
console.log(`narrowest element margin: left ${worstL}px  right ${worstR}px   smallest cap ${minCap === 1e9 ? '-' : minCap}px`);
console.log(`ink box: x ${minX}..${maxX} (margins ${minX} / ${meta.width - 1 - maxX})  y ${minY}..${maxY} (margins ${minY} / ${meta.height - 1 - maxY})`);
console.log(`edge ink rows: L${touch.L} R${touch.R} T${touch.T} B${touch.B}  ${Object.values(touch).some((v) => v > 0) ? '<<< SOMETHING IS CUT' : 'nothing touches the edge'}`);
if (out) console.log(`wrote ${out}`);
await browser.close();
process.exit(errors.length ? 2 : 0);
