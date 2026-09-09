#!/usr/bin/env node
// scratch (props r9): the lit cat's head at a range of `hatch` values, in one strip.
import { chromium } from 'playwright';
import sharp from 'sharp';
const S = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad';
const VALUES = (process.env.VALUES ?? '0.5,0.65,0.8,0.95').split(',');
const Z = 8;
const box = { left: 770, top: 312, width: 60, height: 84 };
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const shots = [];
for (const v of VALUES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
  await page.goto(`http://127.0.0.1:5173/?view=props&state=cat-lit&shot=1&cathatch=${v}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.waitForTimeout(600);
  const buf = await page.locator('#stage').screenshot();
  shots.push(await sharp(buf).extract(box).resize({ width: box.width * Z, height: box.height * Z, kernel: 'nearest' }).png().toBuffer());
  await page.close();
}
const w = box.width * Z, h = box.height * Z;
await sharp({ create: { width: (w + 12) * shots.length, height: h, channels: 3, background: '#c8c8c8' } })
  .composite(shots.map((input, i) => ({ input, left: i * (w + 12), top: 0 })))
  .png()
  .toFile(`${S}/cat-sweep.png`);
await browser.close();
console.log(VALUES.join('  |  '), '->', `${S}/cat-sweep.png`);
