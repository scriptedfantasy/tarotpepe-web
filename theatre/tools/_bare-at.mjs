// throwaway: the ink under one exact caption block.
//   node tools/_bare-at.mjs <png> <cx> <cy> <w> <h>   (all fractions of the frame; cx,cy = centre)
import sharp from 'sharp';
const [file, cx, cy, wf = '0.3', hf = '0.11'] = process.argv.slice(2);
const { data, info } = await sharp(file).greyscale().resize(256, null, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
const x0 = Math.max(0, Math.round((+cx - +wf / 2) * w)), x1 = Math.min(w, Math.round((+cx + +wf / 2) * w));
const y0 = Math.max(0, Math.round((+cy - +hf / 2) * h)), y1 = Math.min(h, Math.round((+cy + +hf / 2) * h));
let s = 0, n = 0, peak = 0;
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
  const v = Math.max(0, (238 - data[y * w + x]) / 238);
  s += v;
  peak = Math.max(peak, v);
  n++;
}
console.log(`${file.split('/').pop()} block (${cx},${cy}) ${wf}x${hf}: ink=${((s / n) * 100).toFixed(1)}%  peak=${(peak * 100).toFixed(0)}%`);
