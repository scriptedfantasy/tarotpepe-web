#!/usr/bin/env node
// hand r12 — the luma across a line of a frame, so a stroke that has gone GREY rather than gone
// away can be told apart from one that is simply narrow.
//   node tools/_hand-r12-profile.mjs <png> row <y> <x0> <x1>
import sharp from 'sharp';
const [file, axis, idxS, aS, bS] = process.argv.slice(2);
const idx = Number(idxS);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
const luma = (x, y) => {
  const i = (y * info.width + x) * C;
  return Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
};
const out = [];
for (let k = Number(aS); k <= Number(bS); k++) out.push(`${k}:${axis === 'row' ? luma(k, idx) : luma(idx, k)}`);
console.log(file.split('/').pop(), axis, idx);
console.log(out.join(' '));
