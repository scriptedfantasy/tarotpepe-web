#!/usr/bin/env node
// The board, driven like a visitor. Moves a real pointer over it (does it shiver?), clicks it
// (does the notice come up?), reads the notice's control boxes, clicks I AM LEAVING (does
// help:leave go out?) and checks VERY WELL and a click on the paper's outside as well.
//   node tools/_help-click.mjs [width] [height] [touch]
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
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=help&state=closed&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);

// listen for what the piece emits
await page.evaluate(() => {
  window.__heard = [];
  for (const n of ['help:open', 'help:close', 'help:leave']) window.__theatre.on(n, () => window.__heard.push(n));
});

const box = await page.evaluate(() => window.__theatre.pieces.help.hitBox());
console.log(`frame ${W}x${H}  board hit box  x ${box.x.toFixed(0)} y ${box.y.toFixed(0)}  ${box.w.toFixed(0)} x ${box.h.toFixed(0)} px`);
const cx = box.x + box.w * 0.5, cy = box.y + box.h * 0.5;
const qx = box.x + box.w * 0.94, qy = box.y + box.h * 0.5; // the «?» card's end of the board

// ---- the shiver -------------------------------------------------------------------------------
if (!touch) {
  const before = await page.evaluate(() => window.__theatre.pieces.props.sign.pivot.rotation.x);
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ tip: window.__theatre.pieces.props.sign.pivot.rotation.x, cursor: window.__theatre.renderer.domElement.style.cursor }));
  console.log('hover      ', `tip ${before.toFixed(4)} → ${after.tip.toFixed(4)} rad   cursor "${after.cursor}"`);
}

// ---- a click on the «?» card ------------------------------------------------------------------
if (touch) await page.touchscreen.tap(qx, qy);
else await page.mouse.click(qx, qy);
await page.waitForTimeout(1200);
const open = await page.evaluate(() => ({ showing: window.__theatre.pieces.help.showing, heard: window.__heard.slice() }));
console.log('click «?»  ', JSON.stringify(open));

// ---- the notice's controls ---------------------------------------------------------------------
const ctrls = await page.evaluate(() => {
  const c = document.querySelector('#help');
  const b = window.__theatre.pieces.help;
  return { up: c.classList.contains('up'), pe: getComputedStyle(c).pointerEvents };
});
console.log('notice     ', JSON.stringify(ctrls));
const boxes = await page.evaluate(() => {
  // the piece keeps them privately; re-cut the same layout to read them back
  return window.__helpControls ?? null;
});
// read them off the module instead
const ctrlBoxes = await page.evaluate(async () => {
  const m = await import('/src/pieces/help-bill.js');
  const b = m.cutBill(window.innerWidth, window.innerHeight, Math.min(2, devicePixelRatio || 1));
  return { sheet: b.sheet, controls: b.controls, capBody: b.capBody, capFoot: b.capFoot, capCtrl: b.capCtrl };
});
console.log('sheet      ', `${ctrlBoxes.sheet.w} x ${ctrlBoxes.sheet.h} px at ${ctrlBoxes.sheet.x},${ctrlBoxes.sheet.y}`, `caps body ${ctrlBoxes.capBody.toFixed(1)} foot ${ctrlBoxes.capFoot.toFixed(1)} ctrl ${ctrlBoxes.capCtrl.toFixed(1)}`);
for (const c of ctrlBoxes.controls) console.log('  control  ', c.key.padEnd(6), `x ${c.x.toFixed(0)} y ${c.y.toFixed(0)}  ${c.w.toFixed(0)} x ${c.h.toFixed(0)} px`);

// ---- VERY WELL closes it -----------------------------------------------------------------------
const well = ctrlBoxes.controls.find((c) => c.key === 'close');
for (let i = 0; i < 2; i++) {
  if (touch) await page.touchscreen.tap(well.x + well.w / 2, well.y + well.h / 2);
  else await page.mouse.click(well.x + well.w / 2, well.y + well.h / 2);
  await page.waitForTimeout(1200);
}
console.log('VERY WELL  ', JSON.stringify(await page.evaluate(() => ({ showing: window.__theatre.pieces.help.showing, heard: window.__heard.slice() }))));

// ---- and I AM LEAVING emits help:leave ----------------------------------------------------------
if (touch) await page.touchscreen.tap(cx, cy);
else await page.mouse.click(cx, cy);
await page.waitForTimeout(1200);
const go = ctrlBoxes.controls.find((c) => c.key === 'leave');
// twice: this browser renders at well under a frame a second, so the first click is often the one
// that brings the notice the rest of the way up. In a real browser it is up in half a second.
for (let i = 0; i < 2; i++) {
  if (touch) await page.touchscreen.tap(go.x + go.w / 2, go.y + go.h / 2);
  else await page.mouse.click(go.x + go.w / 2, go.y + go.h / 2);
  await page.waitForTimeout(1200);
}
console.log('I AM LEAVING', JSON.stringify(await page.evaluate(() => ({ showing: window.__theatre.pieces.help.showing, heard: window.__heard.slice() }))));
await browser.close();
