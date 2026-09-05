#!/usr/bin/env node
// DO THE CORNERS OVERSHOOT. Two contour-only frames, one with the pen's run-on and one without.
// Everything the pen adds past the end of a line is exactly the difference, so this counts the
// run-on directly: how much ink it is, and how long the runs are.
//   node tools/_ink-r7-over.mjs <with.png> <without.png> [out.png]
// The optional third argument writes the difference as a picture — the overshoots alone, in black
// on paper, which is the fastest way to see whether they land at corners or scattered in the field.
import sharp from 'sharp';
const [fa, fb, out] = process.argv.slice(2);
const A = await sharp(fa).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const B = await sharp(fb).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const w = A.info.width, h = A.info.height, n = w * h;
const diff = Buffer.alloc(n, 255);
let added = 0, darkA = 0, darkB = 0;
for (let i = 0; i < n; i++) {
  if (A.data[i] < 128) darkA++;
  if (B.data[i] < 128) darkB++;
  const d = B.data[i] - A.data[i]; // with-overshoot is darker where the pen ran on
  if (d > 40) { added++; diff[i] = 0; }
}
// run lengths of the added ink, horizontally and vertically, to say how far it runs on
const runs = [];
for (let y = 0; y < h; y++) { let r = 0; for (let x = 0; x <= w; x++) { const d = x < w && diff[y * w + x] === 0; if (d) r++; else { if (r) runs.push(r); r = 0; } } }
for (let x = 0; x < w; x++) { let r = 0; for (let y = 0; y <= h; y++) { const d = y < h && diff[y * w + x] === 0; if (d) r++; else { if (r) runs.push(r); r = 0; } } }
runs.sort((a, b) => a - b);
const q = (p) => runs[Math.floor(runs.length * p)] ?? 0;
console.log(`dark px: with ${((darkA / n) * 100).toFixed(2)}%  without ${((darkB / n) * 100).toFixed(2)}%`);
console.log(`overshoot ink ${((added / n) * 100).toFixed(3)}% of frame, ${((added / darkA) * 100).toFixed(2)}% of the drawing's ink`);
console.log(`run-on length px: median ${q(0.5)}  p75 ${q(0.75)}  p95 ${q(0.95)}  max ${runs[runs.length - 1] ?? 0}  (${runs.length} runs)`);
if (out) { await sharp(diff, { raw: { width: w, height: h, channels: 1 } }).png().toFile(out); console.log('wrote', out); }
