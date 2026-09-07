#!/usr/bin/env node
// The sheet before the credit and after it, at every shape we care about. The notice must not have
// grown by so much as a pixel.  node tools/_help-r2-vs.mjs
// It takes the baseline out of git itself, so the claim can be checked again at any time.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const WAS = new URL('../src/pieces/_help-bill-was.js', import.meta.url).pathname;
writeFileSync(WAS, execFileSync('git', ['show', 'HEAD:theatre/src/pieces/help-bill.js'], { encoding: 'utf8' }));
process.on('exit', () => rmSync(WAS, { force: true }));

const SHAPES =[[1600, 900], [390, 760], [375, 667], [430, 932], [1280, 600], [1024, 768], [1920, 1080], [360, 640], [768, 1024]];
const browser = await chromium.launch({ headless: true });
let bad = 0;
for (const [W, H] of SHAPES) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
  await page.goto('http://127.0.0.1:5173/?view=help&state=open&shot=0', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const m = await page.evaluate(async () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const now = await import('/src/pieces/help-bill.js');
    const was = await import('/src/pieces/_help-bill-was.js');
    const a = was.cutBill(window.innerWidth, window.innerHeight, dpr);
    const b = now.cutBill(window.innerWidth, window.innerHeight, dpr);
    return {
      was: a.sheet, now: b.sheet,
      ctrlWas: a.controls.map((c) => [Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h)]),
      ctrlNow: b.controls.map((c) => [Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h)]),
      credit: b.credit, cap: b.capCredit,
    };
  });
  const grew = m.now.w > m.was.w || m.now.h > m.was.h;
  const ctrlBot = Math.max(...m.ctrlNow.map((c) => c[1] + c[3]));
  const clash = m.credit.y < ctrlBot;
  const spill = m.credit.y + m.credit.h > m.now.y + m.now.h || m.credit.x < m.now.x || m.credit.x + m.credit.w > m.now.x + m.now.w;
  if (grew || clash || spill) bad++;
  console.log(
    `${String(W).padStart(4)}x${String(H).padEnd(4)} sheet ${m.was.w}x${m.was.h} → ${m.now.w}x${m.now.h} ${grew ? 'GREW' : 'same'}` +
    `   credit ${Math.round(m.credit.w)}x${Math.round(m.credit.h)} cap ${m.cap.toFixed(1)}` +
    `   gap over ${(m.credit.y - ctrlBot).toFixed(0)}px   under ${(m.now.y + m.now.h - (m.credit.y + m.credit.h)).toFixed(0)}px` +
    `${clash ? '  CLASHES WITH CONTROLS' : ''}${spill ? '  OFF THE SHEET' : ''}` +
    (m.credit.h < 32 ? '  TAP BOX UNDER 32px' : ''),
  );
  await page.close();
}
await browser.close();
console.log(bad ? `${bad} shape(s) wrong` : 'every shape: the sheet is the size it was, the credit is on it and clear of the controls');
process.exit(bad ? 1 : 0);
