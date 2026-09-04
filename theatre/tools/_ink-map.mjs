#!/usr/bin/env node
// Where is the paper NOT clean? node tools/_ink-map.mjs <in> <out.png>
// Resize to 1600, blur sigma 6, then paint: white = paper (>225), mid grey = 70..225 (the smear
// that costs us the number), black = mass (<70). Also prints the worst 8 rows and columns.
import sharp from 'sharp';
const [inp, out] = process.argv.slice(2);
const W = 1600;
const { data, info } = await sharp(inp).removeAlpha().resize({ width: W }).greyscale().blur(6).raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
const rgb = new Uint8Array(w * h * 3);
let paper = 0;
const colBad = new Float64Array(w), rowBad = new Float64Array(h);
for (let i = 0; i < w * h; i++) {
  const v = data[i];
  let c;
  if (v > 225) { c = [255, 255, 255]; paper++; }
  else if (v < 70) c = [20, 20, 20];
  else { const t = Math.round(((v - 70) / 155) * 130 + 90); c = [t, Math.round(t * 0.72), Math.round(t * 0.55)]; }
  rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2];
  if (v <= 225) { colBad[i % w]++; rowBad[(i / w) | 0]++; }
}
await sharp(Buffer.from(rgb), { raw: { width: w, height: h, channels: 3 } }).png().toFile(out);
// band report: 8x8 grid of paper%
const gx = 8, gy = 6;
let s = '';
for (let by = 0; by < gy; by++) {
  const row = [];
  for (let bx = 0; bx < gx; bx++) {
    let p = 0, n = 0;
    for (let y = Math.floor((by * h) / gy); y < Math.floor(((by + 1) * h) / gy); y++)
      for (let x = Math.floor((bx * w) / gx); x < Math.floor(((bx + 1) * w) / gx); x++) { n++; if (data[y * w + x] > 225) p++; }
    row.push(String(Math.round((p / n) * 100)).padStart(4));
  }
  s += row.join('') + '\n';
}
console.log(`${inp.split('/').pop()} paper ${((paper / (w * h)) * 100).toFixed(1)}%  — paper% by cell (${gx}x${gy}):\n${s}`);
