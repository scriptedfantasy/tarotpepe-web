#!/usr/bin/env node
// A proof sheet for the lettering: the frame at the top, and under it the places the round-3 gate
// had emptied — the placard, the plate, the spines, the labels — magnified so a reader can see
// that what is there is INK AND PAPER, not a grey smudge and not a blank box.
//   node tools/_ink-proof.mjs <frame.png> <out.png> x y w h label [x y w h label...]
import sharp from 'sharp';
const [inp, outp, ...rest] = process.argv.slice(2);
const W = 1600;
const src = sharp(inp);
const meta = await src.metadata();
const top = await sharp(inp).resize({ width: W }).toBuffer();
const topH = Math.round((meta.height * W) / meta.width);

const cells = [];
for (let i = 0; i < rest.length; i += 5) {
  const [x, y, w, h] = rest.slice(i, i + 4).map(Number);
  cells.push({ x, y, w, h, label: rest[i + 4] });
}
const cols = cells.length;
const cellW = Math.floor(W / cols);
const tiles = [];
let maxH = 0;
for (const c of cells) {
  const s = cellW / c.w;
  const h = Math.round(c.h * s);
  maxH = Math.max(maxH, h);
  tiles.push(
    await sharp(inp).extract({ left: c.x, top: c.y, width: c.w, height: c.h })
      .resize(cellW, h, { kernel: 'nearest' }).png().toBuffer(),
  );
}
const out = sharp({ create: { width: W, height: topH + maxH + 6, channels: 3, background: '#0d0e0d' } });
const comp = [{ input: top, left: 0, top: 0 }];
tiles.forEach((t, i) => comp.push({ input: t, left: i * cellW, top: topH + 6 }));
await out.composite(comp).png().toFile(outp);
console.log('wrote', outp, cells.map((c) => c.label).join(' | '));
