#!/usr/bin/env node
// THE MARK probe (round 5). Three numbers, on every image resampled to 1600 px wide, greyscale:
//   ink%     dark coverage: pixels below DARK (default 128) as a fraction of the frame
//   mid%     mid-tone coverage: pixels between DARK and PAPER (default 128..225) — in a real pen
//            drawing this is the anti-aliased shoulder of every stroke plus hatch the frame has
//            shrunk; a hard-thresholded raster has almost none
//   pepper%  isolated dark pixels: a dark pixel whose four orthogonal neighbours are all light,
//            as a fraction of the dark pixels. A pen cannot make one. 0.0% in the folios.
// Also prints a coarse grey histogram so the bands can be re-cut.
//   node tools/_ink-r5.mjs <img> [more...]
import sharp from 'sharp';

const W = +(process.env.W ?? 1600);
const DARK = +(process.env.DARK ?? 64);
const PAPER = +(process.env.PAPER ?? 224);

console.log(`W=${W} dark<${DARK} mid ${DARK}..${PAPER}`);
console.log(
  'file'.padEnd(40) + '  ink%   mid%  pepper%   hist 0-31 32-63 .. 224-255',
);
for (const file of process.argv.slice(2)) {
  const { data, info } = await sharp(file).removeAlpha().resize({ width: W, kernel: 'lanczos3' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, n = w * h;
  let ink = 0, mid = 0, pepper = 0, pdark = 0;
  const hist = new Float64Array(8);
  for (let i = 0; i < n; i++) hist[data[i] >> 5]++;
  const PD = +(process.env.PEPD ?? 128), PL = +(process.env.PEPL ?? PAPER);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, v = data[i];
      if (v < DARK) ink++;
      else if (v < PAPER) mid++;
      if (v < PD) {
        pdark++;
        if (data[i - 1] >= PL && data[i + 1] >= PL && data[i - w] >= PL && data[i + w] >= PL) pepper++;
      }
    }
  }
  const pct = (a, b) => ((a / b) * 100).toFixed(2).padStart(6);
  console.log(
    `${file.split('/').pop().padEnd(40)}${pct(ink, n)}${pct(mid, n)}${pct(pepper, pdark)}   ` +
      Array.from(hist, (v) => ((v / n) * 100).toFixed(1).padStart(5)).join(''),
  );
}
