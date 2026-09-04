#!/usr/bin/env node
// scratch: ink coverage of a rect, and how much of it is in marks longer than N px (a thread) vs
// shorter (a fleck). node tools/_rv-cover.mjs <png> x0 y0 x1 y1
import sharp from 'sharp';
const [, , inp, x0, y0, x1, y1] = process.argv;
const { data, info } = await sharp(inp).greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
let ink = 0, n = 0;
// longest connected vertical/horizontal run of ink through each ink pixel: a thread is long
let longV = 0, longH = 0;
const isInk = (x, y) => data[y * W + x] < 110;
for (let y = +y0; y <= +y1; y++)
  for (let x = +x0; x <= +x1; x++) {
    n++;
    if (!isInk(x, y)) continue;
    ink++;
    let v = 1, h = 1;
    for (let k = 1; k < 200 && isInk(x, y - k) && y - k >= 0; k++) v++;
    for (let k = 1; k < 200 && isInk(x, y + k) && y + k <= +y1 + 200; k++) v++;
    for (let k = 1; k < 200 && isInk(x - k, y) && x - k >= 0; k++) h++;
    for (let k = 1; k < 200 && isInk(x + k, y); k++) h++;
    if (Math.max(v, h) >= 24) (v > h ? longV++ : longH++);
  }
console.log(`${inp} ${x0},${y0}-${x1},${y1}: ink ${((100 * ink) / n).toFixed(2)}% of ${n}px; in marks >=24px long: ${((100 * (longV + longH)) / Math.max(1, ink)).toFixed(1)}% of the ink (v ${longV} h ${longH})`);
