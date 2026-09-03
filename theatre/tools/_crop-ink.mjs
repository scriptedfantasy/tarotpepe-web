#!/usr/bin/env node
// Crop regions of a frame at 2x for close inspection. node tools/_crop-ink.mjs <in.png> <out.png> x y w h [scale]
import sharp from 'sharp';
const [inp, out, x, y, w, h, scale = '2'] = process.argv.slice(2);
await sharp(inp)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize(Math.round(+w * +scale), Math.round(+h * +scale), { kernel: 'nearest' })
  .png()
  .toFile(out);
console.log('wrote', out);
