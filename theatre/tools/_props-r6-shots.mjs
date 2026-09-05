#!/usr/bin/env node
// throwaway (props round 6): the round's own contact sheet — four states at two window shapes in
// one browser, so a cycle costs one launch instead of eight.
//   node tools/_props-r6-shots.mjs <outdir> <tag>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const dir = process.argv[2];
const tag = process.argv[3] ?? 'x';
mkdirSync(dir, { recursive: true });
const SIZES = [[1600, 900, 'd'], [390, 760, 'p']];
const STATES = ['home', 'wide', 'pepe', 'table'];
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
let errs = 0;
for (const [w, h, sz] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
  for (const st of STATES) {
    const errors = [];
    page.removeAllListeners('pageerror');
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:5173/?view=camera&state=${st}&shot=1`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
    await page.waitForTimeout(600);
    const out = `${dir}/${tag}-${st}-${sz}.png`;
    await page.screenshot({ path: out });
    if (errors.length) { errs++; console.log('ERRORS', st, sz, errors.slice(0, 2)); }
    console.log('wrote', out);
  }
  await page.close();
}
await browser.close();
console.log(errs ? `${errs} states with page errors` : 'no page errors');
