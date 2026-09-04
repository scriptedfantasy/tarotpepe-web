#!/usr/bin/env node
// scratch (pepe r6): tile a run of frames, cropped to him, at 1:1 — the sheet a stop-motion
// animator reads. node tools/_pepe-sheet6.mjs <dir> <prefix> <out.png> [x y w h] [cols]
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const [, , dir, pre, out, X = 609, Y = 409, W = 374, H = 339, COLS = 4] = process.argv;
const files = readdirSync(dir).filter((f) => f.startsWith(pre) && f.endsWith('.png')).sort();
const w = +W, h = +H, cols = +COLS, rows = Math.ceil(files.length / cols);
const tiles = [];
for (let i = 0; i < files.length; i++) {
  const buf = await sharp(`${dir}/${files[i]}`).extract({ left: +X, top: +Y, width: w, height: h }).png().toBuffer();
  tiles.push({ input: buf, left: (i % cols) * (w + 4), top: Math.floor(i / cols) * (h + 4) });
}
await sharp({ create: { width: cols * (w + 4), height: rows * (h + 4), channels: 3, background: '#b03030' } })
  .composite(tiles).png().toFile(out);
console.log('wrote', out, files.length, 'frames');
