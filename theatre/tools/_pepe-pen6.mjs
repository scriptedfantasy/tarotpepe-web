#!/usr/bin/env node
// scratch (pepe r6): measure the PEN. For a rect of a frame, find every dark run along horizontal
// and vertical scanlines (a stroke crossed square-on) and report how black its core is and how wide
// it is — the two numbers the critic used ("a soft ~2 px mid-grey line" vs "hard black contour").
//
//   node tools/_pepe-pen6.mjs <png> <x> <y> <w> <h> [label]
import sharp from 'sharp';

const [, , file, X, Y, W, H, label = ''] = process.argv;
const img = sharp(file);
const meta = await img.metadata();
const x0 = +X, y0 = +Y, w = +W, h = +H;
const raw = await img.extract({ left: x0, top: y0, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
const { data, info } = raw;
const C = info.channels;
const lum = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) lum[i] = 0.299 * data[i * C] + 0.587 * data[i * C + 1] + 0.114 * data[i * C + 2];

const DARK = 150; // anything under this is a mark; paper is ~247, mid-grey ~150-190
const runs = [];
const scan = (n, m, at) => {
  for (let a = 0; a < n; a++) {
    let b = 0;
    while (b < m) {
      if (at(a, b) >= DARK) { b++; continue; }
      let e = b, min = 255;
      while (e < m && at(a, e) < DARK) { min = Math.min(min, at(a, e)); e++; }
      // only isolated strokes: paper either side within 3 px
      const before = b > 0 ? at(a, b - 1) : 255;
      const after = e < m ? at(a, e) : 255;
      if (before > 200 && after > 200 && e - b <= 12) runs.push({ len: e - b, min });
      b = e + 1;
    }
  }
};
scan(h, w, (r, c) => lum[r * w + c]);
scan(w, h, (c, r) => lum[r * w + c]);

if (!runs.length) { console.log(`${label} ${file}: no runs`); process.exit(0); }
const lens = runs.map((r) => r.len).sort((a, b) => a - b);
const mins = runs.map((r) => r.min).sort((a, b) => a - b);
const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
const mode = (() => {
  const c = {};
  for (const l of lens) c[l] = (c[l] ?? 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0];
})();
// how many strokes are GREY (core never gets near ink) — the critic's word
const grey = runs.filter((r) => r.min > 90).length;
const black = runs.filter((r) => r.min <= 45).length;
const one = runs.filter((r) => r.len === 1).length;
// pepper: a dark pixel with light paper on all four sides — an isolated speck, not a stroke
let pep = 0;
for (let y = 1; y < h - 1; y++)
  for (let x = 1; x < w - 1; x++)
    if (lum[y * w + x] < DARK && lum[y * w + x - 1] > 200 && lum[y * w + x + 1] > 200 && lum[(y - 1) * w + x] > 200 && lum[(y + 1) * w + x] > 200) pep++;
console.log(
  `${label.padEnd(14)} n=${String(runs.length).padStart(5)}  width med ${q(lens, 0.5)} mode ${mode[0]} (${((100 * mode[1]) / runs.length).toFixed(0)}%) p90 ${q(lens, 0.9)}` +
    `  core lum med ${q(mins, 0.5).toFixed(0)} p10 ${q(mins, 0.1).toFixed(0)} p90 ${q(mins, 0.9).toFixed(0)}` +
    `  1px ${((100 * one) / runs.length).toFixed(0)}%  grey(>90) ${((100 * grey) / runs.length).toFixed(0)}%  black(<=45) ${((100 * black) / runs.length).toFixed(0)}%` +
    `  pepper ${((1000 * pep) / (w * h)).toFixed(2)}/kpx`,
);
void meta;
