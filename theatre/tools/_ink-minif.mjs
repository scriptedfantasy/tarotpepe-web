#!/usr/bin/env node
// Read the ink pass's minification channel (view=ink&state=debug-minif) as texels per screen pixel.
//   node tools/_ink-minif.mjs <minif.png> <x> <y> <w> <h> [label...]
// Prints the median and the 10th/90th percentile over the rectangle.
import sharp from 'sharp';
const [file, ...rest] = process.argv.slice(2);
const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < rest.length; i += 5) {
  const [x, y, w, h] = rest.slice(i, i + 4).map(Number);
  const label = rest[i + 4] ?? `${x},${y}`;
  const vals = [];
  for (let yy = y; yy < Math.min(y + h, info.height); yy++)
    for (let xx = x; xx < Math.min(x + w, info.width); xx++) vals.push(2 ** ((data[yy * info.width + xx] / 255 - 0.25) * 8));
  vals.sort((a, b) => a - b);
  const q = (p) => vals[Math.floor(vals.length * p)];
  console.log(`${label.padEnd(26)} texels/px  p10 ${q(0.1).toFixed(2).padStart(7)}  median ${q(0.5).toFixed(2).padStart(7)}  p90 ${q(0.9).toFixed(2).padStart(7)}`);
}
