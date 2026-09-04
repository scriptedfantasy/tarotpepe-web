#!/usr/bin/env node
// node tools/_ink-crop5.mjs <src> <x> <y> <w> <h> <out> [zoom] [resizeWidthFirst]
import sharp from 'sharp';
const [src, x, y, w, h, out, zoom = '4', pre = '0'] = process.argv.slice(2);
let img = sharp(src).removeAlpha();
if (+pre > 0) img = img.resize({ width: +pre, kernel: 'lanczos3' });
const buf = await img.toBuffer();
const z = +zoom;
await sharp(buf)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize({ width: +w * z, height: +h * z, kernel: 'nearest' })
  .png()
  .toFile(out);
console.log('wrote', out, +w * z, 'x', +h * z);
