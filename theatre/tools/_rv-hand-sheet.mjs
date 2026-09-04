#!/usr/bin/env node
// scratch: the drawn hand ALONE, at the size it is read on the cloth, beside a card for scale.
// It loads reveal-hand.js's own drawing functions in a page of its own, so the drawing can be
// looked at without waiting on the rest of the theatre to build.
//   node tools/_rv-hand-sheet.mjs /abs/out.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const out = process.argv[2] ?? '/tmp/rv/hand-sheet.png';
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
page.on('console', (m) => console.log(m.type().toUpperCase(), m.text()));
await page.route('http://127.0.0.1:5173/', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset=utf-8><body style="margin:0;background:#f8f9f4"><canvas id=c width=1500 height=900></canvas>' }));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });

await page.evaluate(async () => {
  const M = await import('/src/pieces/reveal-hand.js');
  const draws = M.__draw;
  const g = document.getElementById('c').getContext('2d');
  g.fillStyle = '#f8f9f4';
  g.fillRect(0, 0, 1500, 900);
  const H = M.HAND;
  // 1377 px per metre: the scale the hand is read at from the `fan` lens on a 1600 px frame
  const S = 1377;
  const hw = H.w * S, hl = H.l * S;
  const poses = ['splay', 'point', 'pinch'];
  poses.forEach((p, i) => {
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 512;
    draws.hand(c.getContext('2d'), 384, 512, p);
    g.drawImage(c, 40 + i * (hw + 60), 40, hw, hl);
    g.fillStyle = '#0d0e0d';
    g.font = '13px sans-serif';
    g.fillText(p, 40 + i * (hw + 60), 36);
  });
  // the cuff and a length of sleeve, at the same scale, under the first hand
  const cu = document.createElement('canvas');
  cu.width = 192;
  cu.height = 136;
  draws.cuff(cu.getContext('2d'), 192, 136);
  const sl = document.createElement('canvas');
  sl.width = 128;
  sl.height = 512;
  draws.sleeve(sl.getContext('2d'), 128, 512);
  const x0 = 40 + (hw - H.sleeveW * S) / 2;
  g.drawImage(sl, x0, 40 + hl + 30, H.sleeveW * S, 0.34 * S);
  g.drawImage(cu, 40 + (hw - H.cuffW * S) / 2, 40 + hl + 24, H.cuffW * S, H.cuffL * S);
  g.fillText('cuff + sleeve (at 0.34 m of arm)', 40, 40 + hl + 20);
  // a tarot card at the same scale, for size
  const cx = 1500 - 0.13 * S - 60, cy = 60;
  g.strokeStyle = '#0d0e0d';
  g.lineWidth = 2.5;
  g.strokeRect(cx, cy, 0.13 * S, 0.2275 * S);
  g.fillText('a card, 0.13 × 0.2275 m', cx, cy - 8);
  g.fillText(`hand ${H.w} × ${H.l} m — ${(H.w / 0.13).toFixed(2)} card widths`, cx, cy + 0.2275 * S + 22);
});
await page.locator('#c').screenshot({ path: out });
console.log('wrote', out);
await browser.close();
