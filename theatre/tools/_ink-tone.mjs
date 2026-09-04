#!/usr/bin/env node
// The tone-distribution probe the round-3 critic used.
//   node tools/_ink-tone.mjs <png|jpg> [more...]
// Every image is resized to 1600 px wide, then blurred (sigma 6 reproduces the round-3 critic's
// numbers on both references: kitchen 52.9% paper, metro 17.0% mass; they reported 54 / 19).
//   paper  = % of the blurred frame above 225   (clean sheet — target > 50%)
//   mass   = % of the blurred frame below 70    (solid ink — the reference sits ~19%)
//   ink    = % of the UNBLURRED frame below 70  (total ink laid down — must not grow)
//   big    = largest contiguous blurred-mass blob, in px and as a fraction of the frame
import sharp from 'sharp';

const W = 1600;
const SIGMA = +(process.env.SIGMA ?? 6);

async function grey(file, blur) {
  let p = sharp(file).removeAlpha().resize({ width: W }).greyscale();
  if (blur) p = p.blur(SIGMA);
  const { data, info } = await p.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function largestBlob(g, thr) {
  const { data, w, h } = g;
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let best = 0, bestBox = null;
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || data[i] >= thr) continue;
    let sp = 0, n = 0;
    stack[sp++] = i;
    seen[i] = 1;
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    while (sp) {
      const j = stack[--sp];
      n++;
      const x = j % w, y = (j / w) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x > 0 && !seen[j - 1] && data[j - 1] < thr) { seen[j - 1] = 1; stack[sp++] = j - 1; }
      if (x < w - 1 && !seen[j + 1] && data[j + 1] < thr) { seen[j + 1] = 1; stack[sp++] = j + 1; }
      if (y > 0 && !seen[j - w] && data[j - w] < thr) { seen[j - w] = 1; stack[sp++] = j - w; }
      if (y < h - 1 && !seen[j + w] && data[j + w] < thr) { seen[j + w] = 1; stack[sp++] = j + w; }
    }
    if (n > best) { best = n; bestBox = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; }
  }
  return { best, bestBox };
}

for (const file of process.argv.slice(2)) {
  const b = await grey(file, true);
  const s = await grey(file, false);
  const n = b.w * b.h;
  let paper = 0, mass = 0;
  for (let i = 0; i < n; i++) {
    if (b.data[i] > 225) paper++;
    if (b.data[i] < 70) mass++;
  }
  let ink = 0;
  const ns = s.w * s.h;
  for (let i = 0; i < ns; i++) if (s.data[i] < 70) ink++;
  const { best, bestBox } = largestBlob(b, 70);
  const name = file.split('/').pop();
  console.log(
    `${name.padEnd(38)} ${b.w}x${b.h}  paper>225 ${((paper / n) * 100).toFixed(1).padStart(5)}%   mass<70 ${((mass / n) * 100).toFixed(1).padStart(5)}%   ink<70 ${((ink / ns) * 100).toFixed(1).padStart(5)}%   biggest blob ${String(best).padStart(7)} px (${((best / n) * 100).toFixed(2)}% of frame)${bestBox ? `  box ${bestBox.join(',')}` : ''}`,
  );
}
