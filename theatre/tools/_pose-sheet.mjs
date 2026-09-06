// Lay the new pose drawings side by side at one scale, so registration can be judged in a single
// look: do the figures stand on the same baseline, are they the same height, is the line the same
// weight? A cut-out is sliced by pixel coordinates, so a pose that is 6% taller than its neighbour
// is a puppet that grows as it walks.
//   node tools/_pose-sheet.mjs            → every pepe-*.png
//   node tools/_pose-sheet.mjs hand       → the hands
import sharp from 'sharp';
import { readdirSync } from 'node:fs';

const DIR = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/public/';
const OUT = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/poses.png';
const want = process.argv[2] ?? 'pepe-';
const files = readdirSync(DIR)
  .filter((f) => f.startsWith(want) && f.endsWith('.png') && !f.includes('meditation'))
  .sort();

const H = 420; // every drawing scaled to this height, so proportions are comparable
const tiles = [];
let x = 0;
for (const f of files) {
  const md = await sharp(DIR + f).metadata();
  const w = Math.round((md.width / md.height) * H);
  // trim() finds the drawn figure inside the white page — that is what has to register, not the page
  const t = await sharp(DIR + f).trim({ threshold: 12 }).metadata().catch(() => null);
  const buf = await sharp(DIR + f).resize(w, H, { fit: 'fill' }).flatten({ background: '#ffffff' }).toBuffer();
  tiles.push({ input: buf, left: x, top: 0 });
  console.log(
    f.padEnd(34),
    `page ${md.width}x${md.height}`.padEnd(18),
    t ? `figure ${t.trimOffsetLeft != null ? '' : ''}${t.width}x${t.height} (${((t.height / md.height) * 100).toFixed(1)}% of page)` : 'figure ?',
  );
  x += w + 8;
}
await sharp({ create: { width: x, height: H, channels: 3, background: '#e9e9e4' } })
  .composite(tiles)
  .png()
  .toFile(OUT);
console.log(`\n${files.length} drawings → ${OUT}`);
