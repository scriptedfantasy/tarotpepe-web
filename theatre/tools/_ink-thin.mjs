#!/usr/bin/env node
// What would a thinner pen buy? node tools/_ink-thin.mjs <img> <erodePx> <out.png>
// Erodes the ink of a rendered frame by n px (a cheap stand-in for lifting the line threshold) and
// writes the result, so tools/_ink-tone.mjs can measure it with exactly the critic's pipeline.
import sharp from 'sharp';
const W = 1600, THR = 150;
const [file, sArg, out] = process.argv.slice(2);
const s = +sArg;
const { data, info } = await sharp(file).removeAlpha().resize({ width: W }).greyscale().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
let cur = Uint8Array.from(data);
for (let k = 0; k < s; k++) {
  const nx = Uint8Array.from(cur);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (cur[i] >= THR) continue;
      let m = cur[i];
      if (x > 0) m = Math.max(m, cur[i - 1]);
      if (x < w - 1) m = Math.max(m, cur[i + 1]);
      if (y > 0) m = Math.max(m, cur[i - w]);
      if (y < h - 1) m = Math.max(m, cur[i + w]);
      nx[i] = m;
    }
  cur = nx;
}
await sharp(Buffer.from(cur), { raw: { width: w, height: h, channels: 1 } }).png().toFile(out);
console.log('wrote', out);
