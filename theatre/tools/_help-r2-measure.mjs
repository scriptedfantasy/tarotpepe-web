#!/usr/bin/env node
// Measure the notice at both window shapes: the sheet, the controls, and (once it exists) the
// credit's box. Reads the module straight out of the running dev server — no scene needed.
//   node tools/_help-r2-measure.mjs
import { chromium } from 'playwright';

const SHAPES = JSON.parse(process.argv[2] ?? '[[1600,900],[390,760]]');
const browser = await chromium.launch({ headless: true });
for (const [W, H] of SHAPES) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 400)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
  await page.goto('http://127.0.0.1:5173/?view=help&state=open&shot=0', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const m = await page.evaluate(async () => {
    const mod = await import('/src/pieces/help-bill.js?v=' + Date.now());
    const b = mod.cutBill(window.innerWidth, window.innerHeight, Math.min(2, devicePixelRatio || 1));
    return {
      sheet: b.sheet, controls: b.controls, credit: b.credit ?? null,
      capBody: b.capBody, capFoot: b.capFoot, capCtrl: b.capCtrl, capCredit: b.capCredit ?? null,
      win: [window.innerWidth, window.innerHeight],
    };
  });
  console.log(`\n=== ${W}x${H} (win ${m.win.join('x')}) ===`);
  console.log(`sheet   ${m.sheet.w} x ${m.sheet.h} px at ${m.sheet.x},${m.sheet.y}   bottom edge y=${m.sheet.y + m.sheet.h}   ${(100 * m.sheet.h / H).toFixed(1)}% of frame height`);
  console.log(`caps    body ${m.capBody.toFixed(1)}  foot ${m.capFoot.toFixed(1)}  ctrl ${m.capCtrl.toFixed(1)}  credit ${m.capCredit ? m.capCredit.toFixed(1) : '—'}`);
  for (const c of m.controls) console.log(`control ${c.key.padEnd(6)} x ${c.x.toFixed(0)} y ${c.y.toFixed(0)}  ${c.w.toFixed(0)} x ${c.h.toFixed(0)}   bottom ${(c.y + c.h).toFixed(0)}`);
  if (m.credit) console.log(`credit  x ${m.credit.x.toFixed(0)} y ${m.credit.y.toFixed(0)}  ${m.credit.w.toFixed(0)} x ${m.credit.h.toFixed(0)}   bottom ${(m.credit.y + m.credit.h).toFixed(0)}`);
  await page.close();
}
await browser.close();
