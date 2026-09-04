#!/usr/bin/env node
// scratch: measure the supplied drawing's own pen — how wide is its contour, in source pixels,
// and how wide are its interior lines. Run: node tools/_pepe-contour.mjs
import sharp from 'sharp';
const SRC = new URL('../public/pepe/pepe-meditation.webp', import.meta.url).pathname;
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const lum = (i) => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
const A = (i) => data[i * 4 + 3];
// dark = the pen (whatever colour it sits on)
const ink = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) ink[i] = A(i) > 128 && lum(i) < 128 ? 1 : 0;

// horizontal run lengths of ink, bucketed
const runs = [];
for (let y = 0; y < H; y++) {
  let c = 0;
  for (let x = 0; x <= W; x++) {
    const on = x < W && ink[x + y * W];
    if (on) c++;
    else {
      if (c) runs.push(c);
      c = 0;
    }
  }
}
runs.sort((a, b) => a - b);
const q = (p) => runs[Math.floor(runs.length * p)];
console.log(`ink runs: n=${runs.length} p25=${q(0.25)} median=${q(0.5)} p75=${q(0.75)} p90=${q(0.9)} max=${runs[runs.length - 1]}`);

// the outer contour specifically: walk in from the alpha edge along scanlines
const prof = [];
for (let y = 0; y < H; y++) {
  let x0 = -1;
  for (let x = 0; x < W; x++) if (A(x + y * W) > 128) { x0 = x; break; }
  if (x0 < 0) continue;
  let c = 0;
  while (x0 + c < W && ink[x0 + c + y * W]) c++;
  if (c) prof.push(c);
}
prof.sort((a, b) => a - b);
console.log(`contour thickness on the left edge (source px): median=${prof[Math.floor(prof.length / 2)]} p90=${prof[Math.floor(prof.length * 0.9)]} n=${prof.length}`);

// colour of the contour where it crosses green: sample a few
let dark = 0, n = 0;
for (let i = 0; i < W * H; i++)
  if (ink[i]) { dark += lum(i); n++; }
console.log(`mean pen luminance ${(dark / n).toFixed(1)}`);
