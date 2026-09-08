#!/usr/bin/env node
// which probe frames actually have a hand in them: count skin-green pixels
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const DIR = new URL('../public/progress/', import.meta.url).pathname;
const files = readdirSync(DIR).filter((f) => f.startsWith(process.argv[2] ?? 'hand-r12-probe') && f.endsWith('.png')).sort();
for (const f of files) {
  const { data, info } = await sharp(DIR + f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let green = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (g > 110 && g < 215 && r < g - 35 && b < g - 35) green++;
  }
  console.log(f.padEnd(46), green, (100 * green / (info.width * info.height)).toFixed(2) + '%');
}
