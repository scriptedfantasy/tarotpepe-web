#!/usr/bin/env node
// Crop regions of a shot at 2x so the pen work can be judged at 1:1.
//   node tools/_crop-room.mjs <in.png> <out.png> <x> <y> <w> <h>
import sharp from 'sharp';
const [inp, out, x, y, w, h] = process.argv.slice(2);
await sharp(inp)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize(+w * 2, +h * 2, { kernel: 'nearest' })
  .png()
  .toFile(out);
console.log('wrote', out);
