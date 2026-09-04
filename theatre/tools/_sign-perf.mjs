#!/usr/bin/env node
// scratch: what the sign hand costs — the first draw of a card, one boil (a re-cut of every small
// line on it), and one fanlight-sized word drawn into a texture.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on('pageerror', () => {});
await p.goto('http://127.0.0.1:5173/?view=none&shot=1', { waitUntil: 'domcontentloaded' });
const r = await p.evaluate(async () => {
  const m = await import('/src/pieces/titles.js');
  const sg = await import('/src/pieces/titles-sign.js');
  document.body.innerHTML = '<div id="letterbox"></div><div id="titles" style="position:absolute;inset:0"></div>';
  const ctx = {
    dom: { titles: document.getElementById('titles'), letterbox: document.getElementById('letterbox') },
    params: new URLSearchParams(),
    size: { w: 1600, h: 900 },
    pieces: {},
    clock: { frame: 0, stepped: true },
    on: () => {},
  };
  const api = await m.build(ctx);
  const t0 = performance.now();
  api.setState('closing');
  const t1 = performance.now();
  let f = 0;
  const t2 = performance.now();
  for (let i = 0; i < 60; i++) {
    ctx.clock.frame = f += 2;
    api.update(ctx);
  }
  const t3 = performance.now();
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  const t4 = performance.now();
  for (let i = 0; i < 20; i++) sg.signCaps(g, 'TAROT PEPE', 512, 128, { size: 88, tracking: 0.1, weight: 700, rng: Math.random });
  const t5 = performance.now();
  return { firstCardMs: +(t1 - t0).toFixed(1), perBoilMs: +((t3 - t2) / 60).toFixed(2), perFanlightMs: +((t5 - t4) / 20).toFixed(2) };
});
console.log(r);
await b.close();
