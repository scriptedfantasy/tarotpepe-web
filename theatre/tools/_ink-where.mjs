#!/usr/bin/env node
// Where does the ink actually go? Divide the frame into a grid and report the cells that hold the
// most ink, so an overdrawn region can be NAMED instead of guessed at.
//   node tools/_ink-where.mjs <img> [cols=10] [rows=6] [top=12]
import sharp from 'sharp';
const [file, C = 10, R = 6, TOP = 12] = process.argv.slice(2);
const cols = +C, rows = +R;
const { data, info } = await sharp(file).removeAlpha().resize({ width: 1600 }).greyscale().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const cells = [];
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const x0 = Math.round((c * w) / cols), x1 = Math.round(((c + 1) * w) / cols);
  const y0 = Math.round((r * h) / rows), y1 = Math.round(((r + 1) * h) / rows);
  let ink = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { n++; if (data[y * w + x] < 150) ink++; }
  cells.push({ c, r, x0, y0, w: x1 - x0, h: y1 - y0, pct: (ink / n) * 100 });
}
console.log(file.split('/').pop());
for (let r = 0; r < rows; r++)
  console.log(cells.filter((k) => k.r === r).map((k) => k.pct.toFixed(0).padStart(4)).join(''));
console.log('worst cells (x y w h  ink%):');
for (const k of cells.sort((a, b) => b.pct - a.pct).slice(0, +TOP))
  console.log(`  ${String(k.x0).padStart(4)} ${String(k.y0).padStart(3)} ${k.w} ${k.h}   ${k.pct.toFixed(1)}%`);
