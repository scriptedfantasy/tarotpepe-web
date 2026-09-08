#!/usr/bin/env node
// What the sheet weighs, page by page, at a few JPEG qualities — a share sheet has to carry it.
//   node tools/_keep-r1-bytes.mjs
import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on('pageerror', (e) => console.log('ERR', String(e)));
await p.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}}} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u} export class ErrorOverlay{}' }));
await p.goto('http://127.0.0.1:8711/?shot=1', { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });

const rows = await p.evaluate(async () => {
  const K = window.__theatre.pieces.help.keep;
  const pages = await K.renderPages(K.sampleReading());
  const out = [];
  for (const q of [0.94, 0.9, 0.86, 0.8]) {
    const each = [];
    for (const c of pages) {
      const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', q));
      each.push(Math.round(blob.size / 1024));
    }
    out.push({ q, each, total: each.reduce((a, x) => a + x, 0) });
  }
  return out;
});
for (const r of rows) console.log(`q ${r.q}   pages ${r.each.join(' + ')} KB   = ${r.total} KB`);
await b.close();
