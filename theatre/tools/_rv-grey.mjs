#!/usr/bin/env node
// scratch: find pixels in a rect whose luminance is neither paper (>=244) nor ink (<=60):
// mid-grey = soft tone. node tools/_rv-grey.mjs <png> x0 y0 x1 y1
import sharp from 'sharp';
const [, , inp, x0, y0, x1, y1] = process.argv;
const { data, info } = await sharp(inp).raw().toBuffer({ resolveWithObject: true });
const { width, channels } = info;
const lum = (x, y) => {
  const i = (y * width + x) * channels;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};
const hist = new Map();
let n = 0, mid = 0;
const bbox = [1e9, 1e9, -1, -1];
for (let y = +y0; y <= +y1; y++)
  for (let x = +x0; x <= +x1; x++) {
    const v = lum(x, y);
    n++;
    const b = Math.floor(v / 16) * 16;
    hist.set(b, (hist.get(b) || 0) + 1);
    if (v > 90 && v < 238) {
      mid++;
      bbox[0] = Math.min(bbox[0], x); bbox[1] = Math.min(bbox[1], y);
      bbox[2] = Math.max(bbox[2], x); bbox[3] = Math.max(bbox[3], y);
    }
  }
console.log(inp, `rect ${x0},${y0}-${x1},${y1}  n=${n}  mid-grey(90..238)=${mid} (${((100 * mid) / n).toFixed(2)}%)`, mid ? `bbox ${bbox.join(',')}` : '');
console.log([...hist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' '));
