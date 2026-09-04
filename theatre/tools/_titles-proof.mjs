#!/usr/bin/env node
// scratch: build the titles piece on its own against a stub ctx, so the cards can be looked at
// while another piece's file is mid-edit and the whole page will not boot.
//   node tools/_titles-proof.mjs <state> <out.png> [frame]
import { chromium } from 'playwright';

const state = process.argv[2] ?? 'chapter';
const out = process.argv[3] ?? `/tmp/titles-proof-${state}.png`;
const frame = +(process.argv[4] ?? 36);
const font = process.argv[5] ?? '';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto('http://127.0.0.1:5173/?view=none&shot=1' + (font ? '&font=' + font : ''), { waitUntil: 'domcontentloaded' });
await page.evaluate(
  async ({ state, frame }) => {
    const m = await import('/src/pieces/titles.js');
    document.body.innerHTML =
      '<div id="proof" style="position:fixed;inset:0;overflow:hidden"><div id="letterbox"></div><div id="titles" style="position:absolute;inset:0"></div></div>';
    const ctx = {
      dom: { titles: document.getElementById('titles'), letterbox: document.getElementById('letterbox') },
      params: new URLSearchParams(location.search),
      size: { w: 1600, h: 900 },
      pieces: {},
      clock: { frame, stepped: true, t: frame / 12 },
      on: () => {},
    };
    const api = await m.build(ctx);
    api.setState(state);
    api.update(ctx);
    window.__proofApi = api;
  },
  { state, frame },
);
await page.waitForTimeout(400);
await page.locator('#proof').screenshot({ path: out });
await browser.close();
if (errs.length) console.log('ERRORS:', errs.join('\n'));
console.log('wrote', out);
