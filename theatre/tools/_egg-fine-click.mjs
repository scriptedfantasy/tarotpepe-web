// _egg-fine-click — the lamp is a click (round 2 of egg-fine.js): one real click starts the fire,
// the tongues catch one every half second, a second click puts them out. Proved with the piece's
// own api read back off the page.
//
//   BASE=… node tools/_egg-fine-click.mjs        (dev server; default 5173)
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
  }),
);
await page.goto(`${BASE}/?view=props&state=default`, { waitUntil: 'domcontentloaded', timeout: 120000 });
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
const state = () => page.evaluate(() => {
  const f = window.__theatre.pieces.props.fine;
  return { burning: f.burning, lit: f.lit ?? f.n ?? null, cursor: window.__theatre.renderer.domElement.style.cursor };
});
const box = await page.evaluate(() => {
  const b = window.__theatre.pieces.props.fine.hitBox();
  const r = window.__theatre.renderer.domElement.getBoundingClientRect();
  return { x: r.x + b.x + b.w / 2, y: r.y + b.y + b.h / 2 };
});
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? 'ok ' : 'BAD'}  ${m}`); if (!c) bad++; };
await page.mouse.move(box.x, box.y);
await page.waitForTimeout(400);
const hov = await state();
ok(hov.cursor === 'pointer', `hover gives a pointer (${hov.cursor})`);
await page.waitForTimeout(3500);
ok(!(await state()).burning, 'and three and a half seconds of hover light nothing');
await page.mouse.click(box.x, box.y);
await page.waitForTimeout(700);
const a = await state();
ok(a.burning, `one click and the fire is going (burning=${a.burning})`);
await page.waitForTimeout(6500);
const b = await state();
ok(b.burning, `still going seven seconds on with the pointer resting (burning=${b.burning})`);
await page.mouse.move(box.x - 400, box.y + 150);
await page.waitForTimeout(1500);
const c = await state();
ok(c.burning, `the pointer leaving does not put it out (burning=${c.burning})`);
await page.mouse.click(box.x, box.y);
// the going-out is six DRAWINGS, and a headless GPU-less browser draws this room at about a frame a
// second, so it is waited for by drawings, not by the clock
const t1 = Date.now();
let d = await state();
while (d.burning && Date.now() - t1 < 30000) {
  await page.waitForTimeout(500);
  d = await state();
}
ok(!d.burning, `a second click puts it out (burning=${d.burning}, after ${((Date.now() - t1) / 1000).toFixed(1)} s of a slow browser)`);
ok(errors.length === 0, `no page errors (${errors.length})`);
console.log(bad ? `${bad} check(s) failed` : 'every check holds');
await browser.close();
process.exit(bad ? 1 : 0);
