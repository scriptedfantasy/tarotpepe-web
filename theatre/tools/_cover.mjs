#!/usr/bin/env node
// node tools/_cover.mjs <png> [cols] [rows]  → per-cell % of pixels darker than 60% luma, plus total
import sharp from 'sharp';
const [, , inp, colsA = '8', rowsA = '6'] = process.argv;
const cols = +colsA, rows = +rowsA;
const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
const cnt = Array.from({ length: rows }, () => new Array(cols).fill(0));
let dark = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const l = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    const c = Math.min(cols - 1, Math.floor((x / W) * cols));
    const r = Math.min(rows - 1, Math.floor((y / H) * rows));
    cnt[r][c]++;
    if (l < 0.6) {
      grid[r][c]++;
      dark++;
    }
  }
}
console.log(inp, `${W}x${H}  total dark: ${((dark / (W * H)) * 100).toFixed(1)}%`);
for (let r = 0; r < rows; r++) console.log(grid[r].map((v, c) => ((v / cnt[r][c]) * 100).toFixed(0).padStart(4)).join(''));
