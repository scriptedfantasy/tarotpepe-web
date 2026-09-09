#!/usr/bin/env node
// The six sheets, flat, off the page's own canvases — how the drawing is judged before the wall
// rakes it. One strip, each sheet at 2x with its name under it.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/mirror-sheets';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }),
);
await page.goto(`${BASE}?view=props&state=default&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
const sheets = await page.evaluate(() => {
  const m = window.__theatre.pieces.props.mirror;
  const out = [];
  for (const f of m.faces) {
    m.set(f);
    const t = window.__theatre.scene.getObjectByName('barometer').children.find((c) => c.geometry?.type === 'CircleGeometry').material.map;
    out.push([f, t.image.toDataURL('image/png')]);
  }
  m.set('glass');
  return out;
});
const tiles = [];
for (const [name, url] of sheets) {
  const buf = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(`${OUT}/sheet-${name}.png`, buf);
  tiles.push(await sharp(buf).resize({ width: 512, height: 512, kernel: 'nearest' }).png().toBuffer());
}
await sharp({ create: { width: 512 * tiles.length, height: 512, channels: 3, background: '#ffffff' } })
  .composite(tiles.map((input, i) => ({ input, left: i * 512, top: 0 })))
  .png()
  .toFile(`${OUT}/sheets-strip.png`);
console.log(`${OUT}/sheets-strip.png  (${sheets.map(([n]) => n).join(' | ')})`);
await browser.close();
