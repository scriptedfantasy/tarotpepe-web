#!/usr/bin/env node
// scratch: mean ink coverage of a rectangle. node tools/_ink-rect.mjs <png> x y w h
// prints both the threshold measure (_cover.mjs: % darker than 0.6 luma) and the continuous one
// (_bare.mjs: mean (238 - grey)/238), which is what the eye reads as tone.
import sharp from 'sharp';
const [inp, x, y, w, h] = process.argv.slice(2);
const { data, info } = await sharp(inp).extract({ left: +x, top: +y, width: +w, height: +h }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
let dark = 0, ink = 0, n = info.width * info.height;
for (let i = 0; i < n; i++) {
  const o = i * C;
  const l = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
  if (l / 255 < 0.6) dark++;
  ink += Math.max(0, (238 - l) / 238);
}
console.log(`${inp.split('/').pop()} [${x},${y} ${w}x${h}]  dark<0.6: ${((dark / n) * 100).toFixed(1)}%   ink: ${((ink / n) * 100).toFixed(1)}%`);
