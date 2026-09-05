#!/usr/bin/env node
// DOES IT BOIL, AND WHERE. Two strikes of the same held drawing, compared. A boil is contours
// re-struck: the line moves a pixel, the ink total does not, and the TONE stays exactly where it
// was. A fizz is the tone moving too, which reads as crawling noise.
//
//   node tools/_ink-r7-boil.mjs <a.png> <b.png>
//
// Prints: how many pixels changed at all, how much of the frame changed by more than half a level,
// the mean absolute change, and — the number that separates a boil from a fizz — the same figures
// restricted to pixels that are MID grey in both frames (tone/hatch) versus pixels adjacent to a
// contour. A clean boil moves the contour band and leaves the flat tone alone.
import sharp from 'sharp';
const [fa, fb] = process.argv.slice(2);
const A = await sharp(fa).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const B = await sharp(fb).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const w = A.info.width, h = A.info.height, n = w * h;
let changed = 0, big = 0, sum = 0;
// a pixel is "tone" if it is neither solid ink nor clean paper in both frames and has no solid
// neighbour: the inside of a hatched patch rather than the shoulder of a stroke
let toneN = 0, toneChanged = 0, toneSum = 0;
let inkA = 0, inkB = 0;
for (let y = 1; y < h - 1; y++) {
  for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const a = A.data[i], b = B.data[i];
    const d = Math.abs(a - b);
    if (d > 2) changed++;
    if (d > 24) big++;
    sum += d;
    if (a < 128) inkA++;
    if (b < 128) inkB++;
    const nearInk =
      Math.min(A.data[i - 1], A.data[i + 1], A.data[i - w], A.data[i + w], a) < 90;
    if (!nearInk && a > 96 && a < 232 && b > 96 && b < 232) {
      toneN++;
      if (d > 8) toneChanged++;
      toneSum += d;
    }
  }
}
const pc = (a, b) => ((a / b) * 100).toFixed(2);
console.log(`changed >2   ${pc(changed, n)}%   changed >24  ${pc(big, n)}%   mean |d| ${(sum / n).toFixed(2)}`);
console.log(`ink%  A ${pc(inkA, n)}  B ${pc(inkB, n)}   (a boil moves the line, not the ink budget)`);
console.log(`tone field ${pc(toneN, n)}% of frame; of it ${pc(toneChanged, toneN)}% moved >8, mean |d| ${(toneSum / Math.max(1, toneN)).toFixed(2)}`);
