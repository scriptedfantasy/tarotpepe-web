#!/usr/bin/env node
// round 8 scratch: the fan plate with the reading row OCCUPIED — the composition the visitor
// actually sees for most of the pick, and the answer to "we're losing a lot of space on the table"
// (the empty band across the middle is the row, and it fills).
//   node tools/_rv8-full.mjs <out.png> [width] [height]
import { chromium } from 'playwright';

const out = process.argv[2];
const W = +(process.argv[3] ?? 390), H = +(process.argv[4] ?? 760);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const f = window.__theatre.pieces.reveal._fan;
  f.fakePicks([2, 40, 70]);
  f.liftIndex(f.keystoneIndex);
});
await page.waitForTimeout(900);
await page.screenshot({ path: out });
console.log('wrote', out);
await browser.close();
