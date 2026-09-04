#!/usr/bin/env node
// The three title cards side by side at 390x760, on paper, for the progress page.
//   node tools/_titles-strip.mjs <dir with sw-*-390x760.png> <out.png>
import sharp from 'sharp';

const [dir, out] = process.argv.slice(2);
const names = ['title', 'chapter', 'closing'].map((s) => `${dir}/sw-${s}-390x760.png`);
const gap = 18, pad = 18, W = 390, H = 760;
const parts = await Promise.all(names.map((f) => sharp(f).png().toBuffer()));
await sharp({
  create: { width: pad * 2 + W * 3 + gap * 2, height: pad * 2 + H, channels: 3, background: '#f8f9f4' },
})
  .composite(parts.map((input, i) => ({ input, left: pad + i * (W + gap), top: pad })))
  .png()
  .toFile(out);
console.log('wrote', out);
