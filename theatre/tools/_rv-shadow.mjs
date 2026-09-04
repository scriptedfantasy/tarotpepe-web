#!/usr/bin/env node
// scratch: report the luminance profile in a horizontal / vertical band of a png, to find soft tone.
// node tools/_rv-shadow.mjs <png> <mode:row|col> <fixed> <from> <to>
import sharp from 'sharp';
const [, , inp, mode, fixed, from, to] = process.argv;
const { data, info } = await sharp(inp).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const lum = (x, y) => {
  const i = (y * width + x) * channels;
  return Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
};
const out = [];
for (let k = +from; k <= +to; k++) {
  const v = mode === 'row' ? lum(k, +fixed) : lum(+fixed, k);
  out.push(`${k}:${v}`);
}
console.log(`${inp} ${width}x${height}`);
console.log(out.join(' '));
