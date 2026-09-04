#!/usr/bin/env node
// Same crop out of several frames, side by side at a zoom, for a look at pen resolution.
//   node tools/_ink-r5-side.mjs <x> <y> <w> <h> <zoom> <out> <img...>
import sharp from 'sharp';
const [x, y, w, h, z, out, ...imgs] = process.argv.slice(2);
const W = +w * +z, H = +h * +z;
const tiles = [];
for (const f of imgs) {
  tiles.push(await sharp(f).removeAlpha().extract({ left: +x, top: +y, width: +w, height: +h })
    .resize(W, H, { kernel: 'nearest' }).png().toBuffer());
}
const gap = 8;
await sharp({ create: { width: (W + gap) * tiles.length - gap, height: H, channels: 3, background: '#c81428' } })
  .composite(tiles.map((t, i) => ({ input: t, left: i * (W + gap), top: 0 })))
  .png().toFile(out);
console.log('wrote', out, imgs.map((f) => f.split('/').pop()).join(' | '));
