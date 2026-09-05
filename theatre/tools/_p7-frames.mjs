#!/usr/bin/env node
// scratch (pepe r7): per-frame stability of a contact sheet. For every frame, over a box: how much
// of it is ink, how many isolated specks (a dark pixel with paper on all four sides — a pen cannot
// make one) and how many 1-px-wide runs. A line the pass re-derives from a 1-bit stencil every
// frame throws a different scatter of both each time; a line drawn on the card does not.
//   node tools/_p7-frames.mjs <sheet.png> <cols> <rows> <fw> <fh> <bx> <by> <bw> <bh> [label]
import sharp from 'sharp';
const [, , file, COLS, ROWS, FW, FH, BX, BY, BW, BH, label = ''] = process.argv;
const cols = +COLS, rows = +ROWS, fw = +FW, fh = +FH, bx = +BX, by = +BY, bw = +BW, bh = +BH;
const stats = [];
for (let r = 0; r < rows; r++)
  for (let c = 0; c < cols; c++) {
    const { data, info } = await sharp(file).extract({ left: c * fw + bx, top: r * fh + by, width: bw, height: bh }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    const l = new Float32Array(bw * bh);
    for (let i = 0; i < bw * bh; i++) l[i] = 0.299 * data[i * ch] + 0.587 * data[i * ch + 1] + 0.114 * data[i * ch + 2];
    let ink = 0, pep = 0, one = 0, runs = 0;
    for (let y = 1; y < bh - 1; y++)
      for (let x = 1; x < bw - 1; x++) {
        const v = l[y * bw + x];
        if (v < 150) ink++;
        if (v < 150 && l[y * bw + x - 1] > 200 && l[y * bw + x + 1] > 200 && l[(y - 1) * bw + x] > 200 && l[(y + 1) * bw + x] > 200) pep++;
      }
    for (let y = 0; y < bh; y++) {
      let x = 0;
      while (x < bw) {
        if (l[y * bw + x] >= 150) { x++; continue; }
        let e = x;
        while (e < bw && l[y * bw + e] < 150) e++;
        const before = x > 0 ? l[y * bw + x - 1] : 255, after = e < bw ? l[y * bw + e] : 255;
        if (before > 200 && after > 200) { runs++; if (e - x === 1) one++; }
        x = e + 1;
      }
    }
    stats.push({ ink: (100 * ink) / (bw * bh), pep: (1000 * pep) / (bw * bh), one: (100 * one) / Math.max(1, runs) });
  }
const f = (k) => stats.map((s) => s[k]);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => Math.sqrt(mean(a.map((v) => (v - mean(a)) ** 2)));
console.log(
  `${label.padEnd(16)} ink ${mean(f('ink')).toFixed(1)}%±${sd(f('ink')).toFixed(2)}   ` +
  `specks ${mean(f('pep')).toFixed(2)}±${sd(f('pep')).toFixed(2)}/kpx   ` +
  `1px runs ${mean(f('one')).toFixed(0)}%±${sd(f('one')).toFixed(1)}`,
);
