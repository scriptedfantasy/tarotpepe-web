#!/usr/bin/env node
// crop a region of a shot and upscale, so a critic can look at the pen
//   node tools/_critic-crop3.mjs <in.png> <x> <y> <w> <h> <scale> <out.png>
import sharp from 'sharp';
const [, , inp, x, y, w, h, scale, out] = process.argv;
const s = +(scale ?? 2);
await sharp(inp)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize({ width: Math.round(+w * s), kernel: 'nearest' })
  .png()
  .toFile(out);
console.log('wrote', out);
