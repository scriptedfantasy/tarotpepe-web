#!/usr/bin/env node
// scratch: crop + zoom a region of a png, nearest-neighbour, so a mark can be looked at at the size
// it was drawn. Takes either argument order — the original
//   node tools/_crop.mjs <in> <out> x y w h [scale]
// or the shorter one, which writes to the scratchpad unless told otherwise
//   node tools/_crop.mjs <in> x y w h [scale] [out]
import sharp from 'sharp';

const SCRATCH = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/crop.png';
const a = process.argv.slice(2);
const inp = a[0];
// the second positional is a number in the short order and a path in the original one
const short = Number.isFinite(Number(a[1]));
const [x, y, w, h] = (short ? a.slice(1, 5) : a.slice(2, 6)).map(Number);
const S = Number(short ? (a[5] ?? 3) : (a[6] ?? 3));
const outp = short ? (a[6] ?? SCRATCH) : a[1];

await sharp(inp)
  .extract({ left: x, top: y, width: w, height: h })
  .resize(Math.round(w * S), Math.round(h * S), { kernel: 'nearest' })
  .png()
  .toFile(outp);
console.log('wrote', outp, `${w}x${h} at ${S}x`);
