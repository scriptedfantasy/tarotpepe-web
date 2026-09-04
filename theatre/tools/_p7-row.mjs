#!/usr/bin/env node
// scratch (pepe r7): print the grey values along one row (or column) of a frame, so a contour's
// cross-section can be read as numbers.
//   node tools/_p7-row.mjs <png> row <y> <x0> <x1>
//   node tools/_p7-row.mjs <png> col <x> <y0> <y1>
import sharp from 'sharp';
const [, , file, kind, A, B, C] = process.argv;
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, ch = info.channels;
const at = (x, y) => {
  const o = (y * W + x) * ch;
  return [Math.round(0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]), data[o], data[o + 1], data[o + 2]];
};
const out = [];
if (kind === 'row') {
  const y = +A;
  for (let x = +B; x <= +C; x++) out.push(at(x, y));
} else {
  const x = +A;
  for (let y = +B; y <= +C; y++) out.push(at(x, y));
}
console.log(`${kind} ${A}  lum: ` + out.map((v) => String(v[0]).padStart(4)).join(''));
console.log(`${' '.repeat(String(kind).length + 1 + String(A).length)}  rgb: ` + out.map((v) => `${v[1]},${v[2]},${v[3]}`).join(' '));
