#!/usr/bin/env node
// HOW MUCH DOES THE PEN WANDER, and over what length. Traces near-vertical strokes down the frame
// — for each row, the sub-pixel centroid of the darkest run inside a narrow window — and reports
// the standing deviation of that centre from a straight line, and the mean distance between the
// times it crosses that line, which is half a wavelength. The door's own numbers are the target.
//   node tools/_ink-r7-wander.mjs <img> <x0> <x1> <y0> <y1>
import sharp from 'sharp';
const [file, X0, X1, Y0, Y1] = process.argv.slice(2);
const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const devs = [], waves = [];
let traced = 0;
for (let sx = +X0; sx <= +X1; sx++) {
  // is there a stroke at sx running the whole span?
  const xs = [];
  let ok = true;
  let cx = sx;
  for (let y = +Y0; y <= +Y1; y++) {
    let best = 255, bx = -1;
    for (let x = Math.max(1, cx - 3); x <= Math.min(w - 2, cx + 3); x++) {
      const v = data[y * w + x];
      if (v < best) { best = v; bx = x; }
    }
    if (best > 110 || bx < 0) { ok = false; break; }
    // sub-pixel centroid of darkness over the 3 px about the minimum
    const a = 255 - data[y * w + bx - 1], b = 255 - data[y * w + bx], c = 255 - data[y * w + bx + 1];
    const s = a + b + c;
    xs.push(bx + (c - a) / Math.max(s, 1));
    cx = bx;
  }
  if (!ok || xs.length < 20) continue;
  // straight-line fit, then the residual
  const n = xs.length;
  let sy = 0, sxx = 0, syy = 0, sxy = 0;
  xs.forEach((v, i) => { sy += i; sxx += v; sxy += i * v; syy += i * i; });
  const slope = (n * sxy - sy * sxx) / Math.max(1e-6, n * syy - sy * sy);
  const inter = (sxx - slope * sy) / n;
  const res = xs.map((v, i) => v - (inter + slope * i));
  const sd = Math.sqrt(res.reduce((a2, r) => a2 + r * r, 0) / n);
  if (sd > 3) continue;                      // not one stroke: the trace jumped to a neighbour
  devs.push(sd);
  let last = null, gaps = [];
  res.forEach((r, i) => { if (last !== null && Math.sign(r) !== Math.sign(last) && r !== 0) gaps.push(i); last = r || last; });
  for (let i = 1; i < gaps.length; i++) waves.push(gaps[i] - gaps[i - 1]);
  traced++;
  sx += 2;                                   // do not trace the same stroke twice
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
console.log(`${file.split('/').pop()}: ${traced} strokes traced over ${+Y1 - +Y0} px`);
console.log(`  wander (sd of the centre off a straight line) ${mean(devs).toFixed(2)} px`);
console.log(`  half-wavelength (mean px between crossings)   ${mean(waves).toFixed(1)} px  → period ~${(2 * mean(waves)).toFixed(0)} px`);
