#!/usr/bin/env node
// scratch: print a class map of the source drawing over a box, in source pixels.
// node tools/_pepe-probe.mjs x0 y0 x1 y1   →  '.' paper  '#' ink  'g' green  'r' red  ' ' clear
import sharp from 'sharp';
const SRC = new URL('../public/pepe/pepe-meditation.webp', import.meta.url).pathname;
const [x0, y0, x1, y1] = process.argv.slice(2).map(Number);
const { width: W, height: H } = await sharp(SRC).metadata();
const buf = await sharp(SRC).ensureAlpha().raw().toBuffer();
let head = '    ';
for (let x = x0; x < x1; x++) head += x % 10 === 0 ? String(Math.floor(x / 10) % 10) : ' ';
console.log(head);
for (let y = y0; y < y1; y++) {
  let row = String(y).padStart(3) + ' ';
  for (let x = x0; x < x1; x++) {
    const o = (y * W + x) * 4;
    const r = buf[o], g = buf[o + 1], b = buf[o + 2], a = buf[o + 3];
    if (a < 8) { row += ' '; continue; }
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 100) row += '#';
    else if (g > r + 16 && g > b + 16) row += 'g';
    else if (r > g + 34 && r > b + 24 && r > 110) row += 'r';
    else row += '.';
  }
  console.log(row);
}
