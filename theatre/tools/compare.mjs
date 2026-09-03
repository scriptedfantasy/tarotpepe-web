#!/usr/bin/env node
// Compose two images side by side, labelled A and B, in a random-but-seeded order so a critic
// can judge blind. Writes the composite PNG and a sibling .key.json saying which label is which.
//
//   node tools/compare.mjs --ours /abs/ours.png --ref /abs/ref.jpg --seed 7 --out /abs/cmp.png
//
// Both images are letterboxed to the same height (default 900). Read the composite, judge,
// THEN read the .key.json to learn which side was ours.
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
if (!args.ours || !args.ref || !args.out) {
  console.error('usage: --ours <png> --ref <img> --out <png> [--seed n] [--height 900]');
  process.exit(1);
}
const H = +(args.height ?? 900);
const seed = +(args.seed ?? 1);
const oursFirst = ((seed * 9301 + 49297) % 233280) / 233280 < 0.5;

async function tile(path) {
  const img = sharp(path).rotate();
  const meta = await img.metadata();
  const w = Math.round((meta.width / meta.height) * H);
  return { buf: await img.resize(w, H).png().toBuffer(), w };
}
const a = await tile(oursFirst ? args.ours : args.ref);
const b = await tile(oursFirst ? args.ref : args.ours);
const gap = 24, pad = 24, labelH = 64;
const W = pad + a.w + gap + b.w + pad;
const label = (t, x) =>
  Buffer.from(
    `<svg width="${W}" height="${labelH}"><text x="${x}" y="46" font-family="Helvetica, Arial" font-size="40" font-weight="bold" fill="#fff">${t}</text></svg>`,
  );
mkdirSync(dirname(args.out), { recursive: true });
await sharp({ create: { width: W, height: labelH + H + pad, channels: 3, background: '#181818' } })
  .composite([
    { input: label('A', pad + Math.round(a.w / 2) - 14), left: 0, top: 0 },
    { input: label('B', pad + a.w + gap + Math.round(b.w / 2) - 14), left: 0, top: 0 },
    { input: a.buf, left: pad, top: labelH },
    { input: b.buf, left: pad + a.w + gap, top: labelH },
  ])
  .png()
  .toFile(args.out);
const key = { A: oursFirst ? 'ours' : 'reference', B: oursFirst ? 'reference' : 'ours', ours: args.ours, ref: args.ref, seed };
writeFileSync(args.out.replace(/\.png$/, '') + '.key.json', JSON.stringify(key, null, 2));
console.log('wrote', args.out, 'and key');
