#!/usr/bin/env node
// Where the shop's board lands on screen, in px, at every size we ship to — and how big a thumb's
// target it makes. Run with no arguments; it does the three frames the brief names.
//   node tools/_help-box.mjs [view] [state]
import { chromium } from 'playwright';

const view = process.argv[2] ?? '';
const state = process.argv[3] ?? 'default';
const SIZES = [[1600, 900], [1200, 1100], [390, 760]];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
for (const [W, H] of SIZES) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  page.on('pageerror', (e) => console.log('  ERR', String(e).slice(0, 200)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
  const u = new URL('http://127.0.0.1:5173/');
  if (view) u.searchParams.set('view', view);
  if (view) u.searchParams.set('state', state);
  u.searchParams.set('shot', '1');
  await page.goto(u.toString(), { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
  await page.waitForTimeout(900);
  const box = await page.evaluate(() => {
    const T = window.__theatre;
    const s = T.pieces.props?.sign;
    if (!s?.mesh) return { err: 'no sign published' };
    const V3 = T.camera.position.constructor;
    const proj = (o, hw, hh, hd) => {
      o.updateMatrixWorld(true);
      const xs = [], ys = [];
      for (const dx of [-hw, hw]) for (const dy of [-hh, hh]) for (const dz of [-hd, hd]) {
        const v = o.localToWorld(new V3(dx, dy, dz)).project(T.camera);
        xs.push(((v.x + 1) / 2) * window.innerWidth);
        ys.push(((1 - v.y) / 2) * window.innerHeight);
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    };
    const out = { board: proj(s.mesh, s.w / 2, s.h / 2, 0.01) };
    const tag = T.pieces.help?.tag;
    if (tag) out.tag = proj(tag, (tag.userData.w ?? 0.5) / 2, (tag.userData.h ?? 0.1) / 2, 0.006);
    const hit = T.pieces.help?.hitBox?.();
    if (hit) out.hit = hit;
    return out;
  });
  const f = (b) => b && `x ${b.x.toFixed(0)} y ${b.y.toFixed(0)}  ${b.w.toFixed(0)} x ${b.h.toFixed(0)} px`;
  console.log(`${W}x${H}`.padEnd(10), 'board', f(box.board), box.tag ? ` | tag ${f(box.tag)}` : '', box.hit ? ` | hit ${f(box.hit)}` : '', box.err ?? '');
  await page.close();
}
await browser.close();
