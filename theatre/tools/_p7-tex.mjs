#!/usr/bin/env node
// scratch (pepe r7): dump RGBA along a row/col of a cut-out layer PNG.
//   node tools/_p7-tex.mjs <png> row <y> <x0> <x1>
import sharp from 'sharp';
const [, , file, kind, A, B, C] = process.argv;
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
console.log(`${file} ${W}x${H}`);
const at = (x, y) => { const o = (y * W + x) * 4; return [data[o], data[o + 1], data[o + 2], data[o + 3]]; };
const list = [];
if (kind === 'row') { const y = +A; for (let x = +B; x <= +C; x++) list.push([x, at(x, y)]); }
else { const x = +A; for (let y = +B; y <= +C; y++) list.push([y, at(x, y)]); }
console.log(list.map(([i, v]) => `${i}:${v[0]},${v[1]},${v[2]}/${v[3]}`).join('  '));
