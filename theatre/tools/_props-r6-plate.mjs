#!/usr/bin/env node
// throwaway (props round 6): dump one pictureTexture as a PNG so the plate can be looked at at
// the size it is drawn, before the ink pass and the frame get at it.
//   node tools/_props-r6-plate.mjs operator /abs/out.png [round]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const kind = process.argv[2] ?? 'operator';
const out = process.argv[3] ?? '/tmp/plate.png';
const round = process.argv[4] === 'round';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
page.on('pageerror', (e) => console.error('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?shot=1&view=props', { waitUntil: 'load', timeout: 120000 });
const data = await page.evaluate(async ({ kind, round }) => {
  const T = await import('/src/pieces/props-textures.js');
  const tex = T.pictureTexture(kind, { seed: 100, round });
  return tex.image.toDataURL('image/png');
}, { kind, round });
writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log('wrote', out);
await browser.close();
