#!/usr/bin/env node
// scratch (props r9): the cat off and on at the home plate, cropped 5x, side by side.
import { chromium } from 'playwright';
import sharp from 'sharp';
const Z = +(process.env.Z ?? 5);
const S = process.argv[2] ?? '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
await page.goto('http://127.0.0.1:5173/?view=props&state=default&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
await page.waitForTimeout(500);
const box = JSON.parse(process.env.BOX ?? '{"left":756,"top":296,"width":92,"height":120}');
const shots = [];
for (const on of [false, true]) {
  await page.evaluate((v) => window.__theatre.pieces.props.cat.set(v), on);
  await page.waitForTimeout(500);
  const buf = await page.locator('#stage').screenshot();
  shots.push(await sharp(buf).extract(box).resize({ width: box.width * Z, height: box.height * Z, kernel: 'nearest' }).png().toBuffer());
}
await sharp({ create: { width: box.width * Z * 2 + 20, height: box.height * Z, channels: 3, background: '#c8c8c8' } })
  .composite([{ input: shots[0], left: 0, top: 0 }, { input: shots[1], left: box.width * Z + 20, top: 0 }])
  .png()
  .toFile(`${S}/cat-pair.png`);
await browser.close();
console.log(`${S}/cat-pair.png`);
