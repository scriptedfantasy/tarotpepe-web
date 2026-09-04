#!/usr/bin/env node
// scratch: a type specimen of the small hand-cut alphabet (src/pieces/titles-sign.js), drawn
// straight onto a canvas in the dev server's origin so it does not depend on the whole page
// building. node tools/_sign-proof.mjs [out.png] [bg] [fg]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '/tmp/sign-proof.png';
const bg = process.argv[3] ?? '#7fbfb9';
const fg = process.argv[4] ?? '#0d0e0d';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1020 }, deviceScaleFactor: 2 });
page.on('pageerror', () => {});
page.on('console', () => {});
await page.goto('http://127.0.0.1:5173/?view=none&shot=1', { waitUntil: 'domcontentloaded' });
const err = await page.evaluate(
  async ({ bg, fg }) => {
    const m = await import('/src/pieces/titles-sign.js');
    document.body.innerHTML = '<canvas id="proof"></canvas>';
    document.body.style.margin = '0';
    const c = document.getElementById('proof');
    const W = 1400, H = 1020, dpr = 2;
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = W + 'px';
    c.style.height = H + 'px';
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    let y = 46;
    const line = (t, capH, tracking, opts = {}) => {
      m.signCaps(g, t, W / 2, y, { capH, tracking, color: fg, seed: 5, ...opts });
      y += capH * 1.9 + 10;
    };
    line('ABCDEFGHIJKLM', 40, 0.2);
    line('NOPQRSTUVWXYZ', 40, 0.2);
    line('0123456789 & · — : , . ° ! ? « »', 34, 0.2);
    line('SÉRIE I — N° 1', 26, 0.26);
    line('ADMISSION: ONE QUESTION', 26, 0.26);
    line('ARCANA & DIVINATION', 30, 0.44);
    line('SEVENTY-EIGHT CARDS · THREE WILL BE ENOUGH', 24, 0.3);
    line('IN WHICH THREE ARE DRAWN, AND NONE RETURNED', 22, 0.17);
    line('TAROT PEPE', 38, 0.3, { weight: 4.2 });
    line('TAROT PEPE', 20, 0.3);
    line('TAROT PEPE', 16, 0.3);
    line('PLEASE COME IN · FIN DE LA SÉANCE', 18, 0.3);
    line('PP. 4–9 · COIFFEUR · OPTIQUE', 22, 0.24);
    line('COIFFEUR', 22, 0.34);
    return null;
  },
  { bg, fg },
);
if (err) console.log(err);
await page.locator('#proof').screenshot({ path: out });
await browser.close();
console.log('wrote', out);
