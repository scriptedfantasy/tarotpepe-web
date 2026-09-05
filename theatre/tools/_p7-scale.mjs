#!/usr/bin/env node
// scratch (pepe r7): how many hi-res texels of the cut-out sheet the frame puts in one screen
// pixel. The head's GREEN is measured in the sheet and in the frame; their ratio is the
// minification, and the pen has to be cut for it.
//   node tools/_p7-scale.mjs <frame.png> [more frames...]
import sharp from 'sharp';

const green = (r, g, b) => g > r + 16 && g > b + 16 && g > 80;
const widthOf = async (file, box) => {
  const img = sharp(file);
  const { data, info } = await (box ? img.extract(box) : img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, c = info.channels;
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * c;
    if (c === 4 && data[o + 3] < 128) continue;
    if (!green(data[o], data[o + 1], data[o + 2])) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0 };
};
const sheet = await widthOf(new URL('../public/pepe/cutout-head.png', import.meta.url).pathname);
console.log(`sheet head green ${sheet.w} x ${sheet.h} hi texels`);
for (const f of process.argv.slice(2)) {
  // the head only: the top half of the figure, above the hands
  const s = await widthOf(f, { left: 600, top: 250, width: 400, height: 260 });
  console.log(`${f}  head green ${s.w} x ${s.h} px  →  ${(sheet.w / s.w).toFixed(2)} hi texels per screen px (head scale ${(0.88).toFixed(2)} already in it)`);
}
