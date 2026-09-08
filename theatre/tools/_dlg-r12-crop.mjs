#!/usr/bin/env node
// Cut a rectangle out of a frame and blow it up, so the lettering can be read at 1:1 or better.
//   node tools/_dlg-r12-crop.mjs <src> <out> <x> <y> <w> <h> [scale]
import sharp from 'sharp';

const [, , src, out, x, y, w, h, scale] = process.argv;
const m = await sharp(src).metadata();
const X = Math.max(0, +x), Y = Math.max(0, +y);
const W = Math.min(+w, m.width - X), H = Math.min(+h, m.height - Y);
await sharp(src)
  .extract({ left: X, top: Y, width: W, height: H })
  .resize({ width: Math.round(W * (+scale || 1)), kernel: 'nearest' })
  .toFile(out);
console.log(out, W, H);
