#!/usr/bin/env node
// node tools/_room-crop.mjs <in> <x> <y> <w> <h> <out> [scale]   (pixels)
import sharp from 'sharp';
const [, , inp, x, y, w, h, out, scale = '1'] = process.argv;
const s = +scale;
await sharp(inp)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize({ width: Math.round(+w * s), kernel: 'nearest' })
  .toFile(out);
console.log('wrote', out);
