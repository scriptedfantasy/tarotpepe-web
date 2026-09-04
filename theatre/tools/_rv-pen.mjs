#!/usr/bin/env node
// scratch: the width of the pen along a vertical line of a frame — every horizontal run of ink
// crossed by rows y0..y1 at columns x0..x1, as a histogram of run widths.
// node tools/_rv-pen.mjs <png> x0 y0 x1 y1
import sharp from 'sharp';
const [, , inp, x0, y0, x1, y1] = process.argv;
const { data, info } = await sharp(inp).greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const hist = new Map();
let n = 0, sum = 0;
for (let y = +y0; y <= +y1; y++) {
  let run = 0;
  for (let x = +x0; x <= +x1; x++) {
    const v = data[y * W + x];
    if (v < 110) run++;
    else if (run) {
      hist.set(run, (hist.get(run) || 0) + 1);
      n++; sum += run;
      run = 0;
    }
  }
  if (run) { hist.set(run, (hist.get(run) || 0) + 1); n++; sum += run; }
}
const rows = [...hist.entries()].sort((a, b) => a[0] - b[0]);
const mode = rows.reduce((a, b) => (b[1] > a[1] ? b : a), [0, 0])[0];
console.log(`${inp} ${x0},${y0}-${x1},${y1}: ${n} runs, mean ${(sum / n).toFixed(2)} px, mode ${mode} px`);
console.log(rows.map(([k, v]) => `${k}px:${((100 * v) / n).toFixed(1)}%`).join(' '));
