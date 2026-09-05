#!/usr/bin/env node
// WHERE THE SLIVERS ARE. tools/_ink-r6-runs.mjs counts paper trapped between two marks in runs of
// one or two pixels; this paints them, so the objects responsible can be named instead of guessed.
//   node tools/_ink-r7-sliver.mjs <img> <out.png>
import sharp from 'sharp';
const [file, out] = process.argv.slice(2);
const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
const rgb = Buffer.alloc(w * h * 3);
for (let i = 0; i < w * h; i++) { const v = data[i] < 128 ? 190 : 255; rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = v; }
// count per 32x32 cell as well, so the worst regions can be listed
const cw = Math.ceil(w / 32), chh = Math.ceil(h / 32);
const cell = new Int32Array(cw * chh);
let sliver = 0, paperRuns = 0;
for (let y = 0; y < h; y++) {
  let prun = 0;
  for (let x = 0; x <= w; x++) {
    const d = x < w && data[y * w + x] < 128;
    if (d || x === w) {
      if (prun > 0) {
        paperRuns++;
        if (prun <= 2) {
          sliver++;
          for (let k = x - prun; k < x; k++) { rgb[(y * w + k) * 3] = 220; rgb[(y * w + k) * 3 + 1] = 0; rgb[(y * w + k) * 3 + 2] = 0; }
          cell[Math.floor(y / 32) * cw + Math.floor((x - 1) / 32)]++;
        }
      }
      prun = 0;
    } else prun++;
  }
}
console.log(`sliver ${((sliver / paperRuns) * 100).toFixed(1)}% of ${paperRuns} paper runs`);
const top = [...cell].map((v, i) => [v, (i % cw) * 32, Math.floor(i / cw) * 32]).sort((a, b) => b[0] - a[0]).slice(0, 12);
console.log('worst 32px cells (count, x, y): ' + top.map(([v, x, y]) => `${v}@${x},${y}`).join('  '));
if (out) { await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).png().toFile(out); console.log('wrote', out); }
