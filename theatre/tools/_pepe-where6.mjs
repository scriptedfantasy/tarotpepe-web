#!/usr/bin/env node
// scratch (pepe r6): where is he in the frame? bounding box of the green (the only colour on him).
import sharp from 'sharp';
const file = process.argv[2];
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: C } = info;
let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const o = (y * w + x) * C;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    if (g > r + 16 && g > b + 16) {
      n++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
console.log(JSON.stringify({ frame: [w, h], green: n, box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] }));
