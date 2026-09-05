#!/usr/bin/env node
// scratch (pepe r7): does the silhouette CRAWL? Split a contact sheet into its frames and, over a
// box, count how many pixels flip between ink and paper from one frame to the next AFTER the
// figure's own movement is taken out (the best whole-pixel shift between the two frames is found
// first, so a lean or a breath is not counted as crawl). A drawn line that travels with him flips
// only where it genuinely moved; a line the pass re-derives every frame from a 1-bit stencil
// flickers all along its length.
//   node tools/_p7-crawl.mjs <sheet.png> <cols> <rows> <fw> <fh> <bx> <by> <bw> <bh> [label]
import sharp from 'sharp';

const [, , file, COLS, ROWS, FW, FH, BX, BY, BW, BH, label = ''] = process.argv;
const cols = +COLS, rows = +ROWS, fw = +FW, fh = +FH;
const bx = +BX, by = +BY, bw = +BW, bh = +BH;

const frames = [];
for (let r = 0; r < rows; r++)
  for (let c = 0; c < cols; c++) {
    const { data, info } = await sharp(file)
      .extract({ left: c * fw + bx, top: r * fh + by, width: bw, height: bh })
      .removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    const l = new Float32Array(bw * bh);
    for (let i = 0; i < bw * bh; i++) l[i] = 0.299 * data[i * ch] + 0.587 * data[i * ch + 1] + 0.114 * data[i * ch + 2];
    frames.push(l);
  }

const INK = 128, PAPER = 200;
// bilinear, so the alignment below can be sub-pixel: a breath moves him a fraction of a pixel and
// a two-pixel line then changes half its pixels, which is movement, not crawl.
const shifted = (l, dx, dy, x, y) => {
  const fx = x + dx, fy = y + dy;
  const xi = Math.floor(fx), yi = Math.floor(fy);
  if (xi < 0 || yi < 0 || xi >= bw - 1 || yi >= bh - 1) return 255;
  const ax = fx - xi, ay = fy - yi;
  return (
    l[yi * bw + xi] * (1 - ax) * (1 - ay) + l[yi * bw + xi + 1] * ax * (1 - ay) +
    l[(yi + 1) * bw + xi] * (1 - ax) * ay + l[(yi + 1) * bw + xi + 1] * ax * ay
  );
};
let tot = 0, n = 0, inkPx = 0;
for (let f = 1; f < frames.length; f++) {
  const a = frames[f - 1], b = frames[f];
  // best sub-pixel alignment in ±3 px, quarter-pixel steps
  let best = Infinity, bdx = 0, bdy = 0;
  for (let sy = -12; sy <= 12; sy++) for (let sx = -12; sx <= 12; sx++) {
    const dx = sx / 4, dy = sy / 4;
    let e = 0;
    for (let y = 4; y < bh - 4; y += 2) for (let x = 4; x < bw - 4; x += 2) {
      const d = b[y * bw + x] - shifted(a, dx, dy, x, y);
      e += d * d;
    }
    if (e < best) { best = e; bdx = dx; bdy = dy; }
  }
  let flip = 0, ink = 0;
  for (let y = 2; y < bh - 2; y++) for (let x = 2; x < bw - 2; x++) {
    const va = shifted(a, bdx, bdy, x, y), vb = b[y * bw + x];
    if (va < INK) ink++;
    if ((va < INK && vb > PAPER) || (va > PAPER && vb < INK)) flip++;
  }
  tot += flip;
  inkPx += ink;
  n++;
}
console.log(`${label.padEnd(16)} ${n} frame pairs  flips ${(tot / n).toFixed(0)}/frame = ${((100 * tot) / Math.max(1, inkPx)).toFixed(1)}% of the ink, ${((1000 * tot) / (n * bw * bh)).toFixed(2)}/kpx`);
