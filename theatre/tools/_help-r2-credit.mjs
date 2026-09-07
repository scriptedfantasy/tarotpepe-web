#!/usr/bin/env node
// The credit at the foot of the notice, driven like a visitor: open the notice off the board, tap
// «CONJURED BY @SCRPTDFNTSY», and check that a window was asked for with the right address and that
// the notice is still standing afterwards. Then tap VERY WELL to prove the controls still work.
//   node tools/_help-r2-credit.mjs [width] [height] [touch]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const touch = process.argv.includes('touch');
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
// the real window.open would go to the network; record what was asked for instead
await page.addInitScript(() => {
  window.__opened = [];
  const real = window.open;
  window.open = (...a) => { window.__opened.push(a); return null; };
  window.__realOpen = real;
});
await page.goto('http://127.0.0.1:5173/?view=help&state=closed&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__heard = [];
  for (const n of ['help:open', 'help:close', 'help:leave', 'help:credit']) window.__theatre.on(n, () => window.__heard.push(n));
});

const box = await page.evaluate(() => window.__theatre.pieces.help.hitBox());
const cx = box.x + box.w * 0.5, cy = box.y + box.h * 0.5;
const tap = async (x, y) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));

// open the notice off the board (twice: this browser draws at well under a frame a second, so the
// first click is often spent bringing the sheet the rest of the way up)
await tap(cx, cy);
await page.waitForTimeout(1200);
const bill = await page.evaluate(async () => {
  const m = await import('/src/pieces/help-bill.js');
  const b = m.cutBill(window.innerWidth, window.innerHeight, Math.min(2, devicePixelRatio || 1));
  return { sheet: b.sheet, controls: b.controls, credit: b.credit, capCredit: b.capCredit };
});
console.log(`frame ${W}x${H}`);
console.log(`sheet    ${bill.sheet.w} x ${bill.sheet.h} at ${bill.sheet.x},${bill.sheet.y}`);
console.log(`credit   x ${bill.credit.x.toFixed(0)} y ${bill.credit.y.toFixed(0)}  ${bill.credit.w.toFixed(0)} x ${bill.credit.h.toFixed(0)} px  cap ${bill.capCredit.toFixed(1)}  href ${bill.credit.href}`);
console.log('open     ', JSON.stringify(await page.evaluate(() => ({ showing: window.__theatre.pieces.help.showing }))));

// ---- the credit ---------------------------------------------------------------------------------
const cr = bill.credit;
for (let i = 0; i < 2; i++) {
  await tap(cr.x + cr.w / 2, cr.y + cr.h / 2);
  await page.waitForTimeout(900);
}
console.log('tap credit', JSON.stringify(await page.evaluate(() => ({
  showing: window.__theatre.pieces.help.showing,
  up: document.querySelector('#help').classList.contains('up'),
  opened: window.__opened,
  heard: window.__heard.slice(),
}))));

// the four corners of the box, and a point just above it (which must belong to nothing but paper)
const pts = [
  ['top-left    ', cr.x + 3, cr.y + 3],
  ['bottom-right', cr.x + cr.w - 3, cr.y + cr.h - 3],
  ['above it    ', cr.x + cr.w / 2, cr.y - 6],
];
for (const [name, x, y] of pts) {
  await page.evaluate(() => { window.__opened.length = 0; });
  await tap(x, y);
  await page.waitForTimeout(600);
  console.log(`  ${name}`, JSON.stringify(await page.evaluate(() => ({ showing: window.__theatre.pieces.help.showing, opened: window.__opened.length }))));
}

// ---- and the controls still close it -------------------------------------------------------------
const well = bill.controls.find((c) => c.key === 'close');
await tap(well.x + well.w / 2, well.y + well.h / 2);
await page.waitForTimeout(1200);
console.log('VERY WELL', JSON.stringify(await page.evaluate(() => ({ showing: window.__theatre.pieces.help.showing, heard: window.__heard.slice() }))));
await browser.close();
