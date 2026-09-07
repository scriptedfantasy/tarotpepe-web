#!/usr/bin/env node
// scratch: cut the thinking mark out of each cell of a shot.mjs contact sheet and stack the ten of
// them, so the dots can be counted frame by frame at the size they were drawn.
//   node tools/_dlg-r8-sheet.mjs <sheet.png> <out.png> [cols] [cellW] [cellH]
import sharp from 'sharp';

const [inp, outp, colsA, cwA, chA] = process.argv.slice(2);
const cols = +(colsA ?? 5), cw = +(cwA ?? 800), ch = +(chA ?? 450);
const S = 6; // how much to blow each crop up
const box = { left: 370, top: 370, width: 90, height: 24 }; // where the mark sits inside a cell
const meta = await sharp(inp).metadata();
const rows = Math.round(meta.height / ch);
const tiles = [];
for (let r = 0; r < rows; r++)
  for (let c = 0; c < cols; c++)
    tiles.push(
      await sharp(inp)
        .extract({ left: c * cw + box.left, top: r * ch + box.top, width: box.width, height: box.height })
        .resize(box.width * S, box.height * S, { kernel: 'nearest' })
        .toBuffer(),
    );
const W = box.width * S, H = box.height * S;
await sharp({ create: { width: W, height: H * tiles.length, channels: 3, background: '#ffffff' } })
  .composite(tiles.map((b, i) => ({ input: b, left: 0, top: i * H })))
  .png()
  .toFile(outp);
console.log('wrote', outp, `${tiles.length} frames`);
