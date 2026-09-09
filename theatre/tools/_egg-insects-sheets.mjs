#!/usr/bin/env node
// THE SIXTEEN SHEETS, LOOKED AT. Draws every insect drawing in the page's own canvas — the same
// code the piece calls — and lays them out as a contact sheet at 6x, so the pen can be judged
// before it is 18 pixels wide on a wall. Also prints how long the sixteen take to draw.
//
//   BASE=http://127.0.0.1:8705 node tools/_egg-insects-sheets.mjs --out /abs/sheet.png
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/egg/insect-sheets.png';
const SCALE = +(args.scale ?? 6);
mkdirSync(dirname(OUT), { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  }),
);
await page.goto(`${BASE}/?view=props&state=default&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });

const { url, ms } = await page.evaluate(
  async (scale) => {
    const mod = await import('/src/pieces/egg-insects.js');
    const kinds = ['fly', 'bee', 'wasp', 'beetle'];
    const poses = [
      ['rest', 0],
      ['rest', 1],
      ['up', 0],
      ['down', 0],
    ];
    const t0 = performance.now();
    const grid = kinds.map((k) => poses.map(([p, s]) => mod.drawInsect(k, p, s)));
    const ms = performance.now() - t0;
    const S = grid[0][0].width;
    const pad = 6;
    const c = document.createElement('canvas');
    c.width = (S * scale + pad) * poses.length + pad;
    c.height = (S * scale + pad) * kinds.length + pad;
    const g = c.getContext('2d');
    g.fillStyle = '#c8c8bd';
    g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    grid.forEach((row, r) =>
      row.forEach((cv, q) => {
        const x = pad + q * (S * scale + pad), y = pad + r * (S * scale + pad);
        g.fillStyle = '#f8f9f4';
        g.fillRect(x, y, S * scale, S * scale);
        g.drawImage(cv, x, y, S * scale, S * scale);
      }),
    );
    return { url: c.toDataURL('image/png'), ms };
  },
  SCALE,
);

writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64'));
console.log(`sixteen sheets drawn in ${ms.toFixed(0)} ms   (rows: fly, bee, wasp, beetle; columns: rest a, rest b, wings up, wings down)`);
console.log(`wrote ${OUT}`);
await browser.close();
