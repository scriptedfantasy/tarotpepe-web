#!/usr/bin/env node
// scratch: crop + zoom a region of a png. node tools/_crop.mjs <in> <out> x y w h [scale]
import sharp from 'sharp';
const [, , inp, outp, x, y, w, h, sc = 3] = process.argv;
const S = Number(sc);
await sharp(inp)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize(Math.round(+w * S), Math.round(+h * S), { kernel: 'nearest' })
  .png()
  .toFile(outp);
console.log('wrote', outp);
