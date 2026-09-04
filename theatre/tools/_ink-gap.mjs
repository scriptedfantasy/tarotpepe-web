#!/usr/bin/env node
// Doubled-contour probe. node tools/_ink-gap.mjs <img> [more...]
// Resize to 1600, threshold <150 = ink, then along rows and columns histogram the length of every
// PAPER gap that sits BETWEEN two ink runs. A pen's width is ~3 px; two strokes closer than about
// 6 px make one bar after a heavy blur. So:
//   touching  % of enclosed gaps <= 6 px  — ink laid twice where the film lays it once
//   clear     % of enclosed gaps >= 14 px — marks that read as separate strokes
import sharp from 'sharp';
const W = 1600, THR = +(process.env.THR ?? 150);
for (const file of process.argv.slice(2)) {
  const { data, info } = await sharp(file).removeAlpha().resize({ width: W }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const hist = new Float64Array(400);
  let n = 0;
  const scan = (get, len, lines) => {
    for (let l = 0; l < lines; l++) {
      let seenInk = false, gap = 0;
      for (let k = 0; k < len; k++) {
        const ink = get(l, k) < THR;
        if (ink) {
          if (seenInk && gap > 0) { hist[Math.min(399, gap)]++; n++; }
          gap = 0; seenInk = true;
        } else if (seenInk) gap++;
      }
    }
  };
  scan((y, x) => data[y * w + x], w, h);
  scan((x, y) => data[y * w + x], h, w);
  let touch = 0, clear = 0, med = 0, acc = 0;
  for (let k = 1; k < 400; k++) { if (k <= 6) touch += hist[k]; if (k >= 14) clear += hist[k]; }
  for (let k = 1; k < 400; k++) { acc += hist[k]; if (acc >= n * 0.5) { med = k; break; } }
  const top = [];
  for (let k = 1; k <= 10; k++) top.push(`${k}:${((hist[k] / n) * 100).toFixed(0)}`);
  console.log(
    `${file.split('/').pop().padEnd(38)} gaps ${String(n).padStart(8)}  touching<=6px ${((touch / n) * 100).toFixed(1).padStart(5)}%   clear>=14px ${((clear / n) * 100).toFixed(1).padStart(5)}%   median gap ${String(med).padStart(3)}px  [${top.join(' ')}]`,
  );
}
