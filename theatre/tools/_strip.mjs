#!/usr/bin/env node
// scratch: lay N pngs side by side (2 rows) into one strip.
//   node tools/_strip.mjs out.png a.png b.png c.png d.png
import sharp from 'sharp';
const [, , out, ...ins] = process.argv;
const W = 800, H = 450;
const cols = Math.ceil(ins.length / 2), rows = ins.length > cols ? 2 : 1;
const tiles = await Promise.all(
  ins.map(async (f, i) => ({
    input: await sharp(f).resize(W, H).png().toBuffer(),
    left: (i % cols) * W,
    top: Math.floor(i / cols) * H,
  })),
);
await sharp({ create: { width: cols * W, height: rows * H, channels: 3, background: '#f8f9f4' } })
  .composite(tiles)
  .png()
  .toFile(out);
console.log('wrote', out);
