#!/usr/bin/env node
// Frozen frames of a reveal motion state at given times, cropped to a region, tiled into one sheet.
//   node tools/_reveal-crops.mjs --state shuffle --times 0.17,0.25,0.33,0.5 --crop 900,420,700,400 --cols 4 --out /abs/x.png
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const state = args.state ?? 'shuffle';
const times = (args.times ?? '0').split(',').map(Number);
const [cx, cy, cw, ch] = (args.crop ?? '0,0,1600,900').split(',').map(Number);
const cols = +(args.cols ?? 4);
const out = args.out ?? `/tmp/reveal-${state}-crops.png`;
mkdirSync(dirname(out), { recursive: true });
const tiles = [];
const here = new URL('.', import.meta.url).pathname;
for (const t of times) {
  const file = `/tmp/reveal-${state}-${t}.png`;
  const r = spawnSync('node', [here + 'shot.mjs', '--view', 'reveal', '--state', state, '--t', String(t), '--wait', '800', '--out', file], { encoding: 'utf8' });
  const text = (r.stdout + r.stderr).split('\n').filter((l) => l.includes('PAGE ERRORS') || l.includes(' - '));
  if (r.status !== 0) console.log(`t=${t}: exit ${r.status}\n${text.join('\n')}`);
  tiles.push(await sharp(file).extract({ left: cx, top: cy, width: cw, height: ch }).png().toBuffer());
}
const rows = Math.ceil(tiles.length / cols);
const label = (i) =>
  Buffer.from(`<svg width="${cw}" height="${ch}"><text x="8" y="22" font-size="20" font-family="monospace" fill="#c00">t=${times[i]}</text></svg>`);
const comps = [];
tiles.forEach((input, i) => {
  comps.push({ input, left: (i % cols) * cw, top: Math.floor(i / cols) * ch });
  comps.push({ input: label(i), left: (i % cols) * cw, top: Math.floor(i / cols) * ch });
});
await sharp({ create: { width: cw * cols, height: ch * rows, channels: 3, background: '#222' } })
  .composite(comps)
  .png()
  .toFile(out);
console.log('wrote', out);
