#!/usr/bin/env node
// The same strip of the sheet at 2x and at 3x, both printed back at the same size, so the choice
// of raster is made by looking rather than by arguing.  node tools/_keep-r1-scale.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const b = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on('pageerror', (e) => console.log('ERR', String(e)));
await p.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}}} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u} export class ErrorOverlay{}' }));
await p.goto('http://127.0.0.1:8711/?shot=1', { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });

// the strip with the card names and the first lines of the transcript, in page points
const STRIP = { x: 34, y: 300, w: 190, h: 90 };
for (const scale of [2, 3]) {
  const url = await p.evaluate(
    async ([scale, S]) => {
      const K = window.__theatre.pieces.help.keep;
      const pages = await K.renderPages(K.sampleReading(), { scale });
      const c = document.createElement('canvas');
      c.width = S.w * 6;
      c.height = S.h * 6; // both blown up to the same size: 6 page-points to the pixel
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(pages[0], S.x * scale, S.y * scale, S.w * scale, S.h * scale, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    },
    [scale, STRIP],
  );
  writeFileSync(`/tmp/keep-scale-${scale}x.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`/tmp/keep-scale-${scale}x.png`);
}
await b.close();
