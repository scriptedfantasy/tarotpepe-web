#!/usr/bin/env node
// How long the sheet takes to make, and where the time goes. Software canvas, which is the slowest
// thing this will ever run on.  node tools/_keep-r1-time.mjs
import { chromium } from 'playwright';

const b = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on('pageerror', (e) => console.log('ERR', String(e)));
await p.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}}} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u} export class ErrorOverlay{}' }),
);
await p.goto('http://127.0.0.1:8711/?shot=1', { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });

const out = await p.evaluate(async () => {
  const K = window.__theatre.pieces.help.keep;
  const r = K.sampleReading();
  const t = [];
  for (const scale of [2, 3]) {
    let t0 = performance.now();
    const pages = await K.renderPages(r, { scale });
    const draw = performance.now() - t0;
    t0 = performance.now();
    const blob = await K.pdfFrom(pages);
    t.push({ scale, pages: pages.length, px: `${pages[0].width}x${pages[0].height}`, draw: Math.round(draw), pdf: Math.round(performance.now() - t0), kb: Math.round(blob.size / 1024) });
  }
  return t;
});
for (const r of out) console.log(`scale ${r.scale}  ${r.px}  ${r.pages} pages  draw ${r.draw} ms  jpeg+pdf ${r.pdf} ms  ${r.kb} KB`);
await b.close();
