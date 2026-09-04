#!/usr/bin/env node
// scratch (pepe r6): print a row (or column) of pixels across a contour, as lum and rgb.
//   node tools/_pepe-scan6.mjs <png> row <y> <x0> <x1>
//   node tools/_pepe-scan6.mjs <png> col <x> <y0> <y1>
import sharp from 'sharp';
const [, , file, dir, a, b, c] = process.argv;
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const { width: w, channels: C } = info;
const out = [];
for (let k = +b; k <= +c; k++) {
  const x = dir === 'row' ? k : +a;
  const y = dir === 'row' ? +a : k;
  const o = (y * w + x) * C;
  const r = data[o], g = data[o + 1], bl = data[o + 2];
  out.push(`${k}:${Math.round(0.299 * r + 0.587 * g + 0.114 * bl)}(${r},${g},${bl})`);
}
console.log(out.join(' '));
