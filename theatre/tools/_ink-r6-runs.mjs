#!/usr/bin/env node
// BLOBBINESS. The round-6 fault is not "how much ink" — round 5 matched the folio on that — it is
// that the ink arrives in LUMPS: a bottle's label as one black mass instead of six letters, a
// louvred grille as bars instead of strokes, two edges 3 px apart as one bar. A drawing of separate
// marks and a drawing of blots can carry the SAME ink percentage, so the three round-5 numbers
// cannot see this at all. These can:
//
//   run>=N%   share of dark pixels lying in a horizontal dark run of N px or more. A pen stroke
//             crossed by a scanline is 2-4 px; a filled mass is 20. The folio's own value is the
//             budget for how much of the frame is legitimately a black AREA (a coat, a doorway).
//   meanrun   mean length of a horizontal dark run.
//   sliver%   share of PAPER runs that are 1 or 2 px — paper trapped between two marks the pen can
//             no longer hold apart. This is the doubled contour, counted.
//
//   node tools/_ink-r6-runs.mjs <img> [more...]   (each resampled to W=1600 wide first)
import sharp from 'sharp';

const W = +(process.env.W ?? 1600);
const DARK = +(process.env.DARK ?? 128);
const N = +(process.env.N ?? 6);

console.log(`W=${W} dark<${DARK}`);
console.log('file'.padEnd(38) + `  run>=${N}%  meanrun  sliver%  runhist 1 2 3 4 5 6-9 10-19 20+`);
for (const file of process.argv.slice(2)) {
  const { data, info } = await sharp(file).removeAlpha().resize({ width: W, kernel: 'lanczos3' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const hist = new Float64Array(8);
  const bin = (L) => (L <= 5 ? L - 1 : L <= 9 ? 5 : L <= 19 ? 6 : 7);
  let dark = 0, longDark = 0, runs = 0, sliver = 0, paperRuns = 0;
  for (let y = 0; y < h; y++) {
    let run = 0, prun = 0;
    for (let x = 0; x <= w; x++) {
      const d = x < w && data[y * w + x] < DARK;
      if (d) {
        run++;
        if (prun > 0) { paperRuns++; if (prun <= 2) sliver++; prun = 0; }
      } else {
        if (run > 0) { dark += run; runs++; hist[bin(run)] += run; if (run >= N) longDark += run; run = 0; }
        if (x < w) prun++;
      }
    }
    if (run > 0) { dark += run; runs++; hist[bin(run)] += run; if (run >= N) longDark += run; }
  }
  const p = (a, b) => ((a / b) * 100).toFixed(1).padStart(6);
  console.log(
    `${file.split('/').pop().padEnd(38)}${p(longDark, dark)}${(dark / runs).toFixed(2).padStart(9)}${p(sliver, paperRuns)}   ` +
      Array.from(hist, (v) => ((v / dark) * 100).toFixed(1).padStart(6)).join(''),
  );
}
