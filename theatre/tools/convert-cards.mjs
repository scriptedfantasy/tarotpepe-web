// One-off: convert the source tarot PNGs (1024x1792) into webp with slug names.
// Usage: node tools/convert-cards.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC = '/Users/workbook2024/Development/tarotpepe/Tarotcards';
const OUT = new URL('../public/cards/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.png'));
let n = 0;
for (const f of files) {
  const slug = basename(f, '.png').toLowerCase().replace(/_+$/, '').replace(/_+/g, '-');
  const out = join(OUT, `${slug}.webp`);
  await sharp(join(SRC, f)).webp({ quality: 86, effort: 4 }).toFile(out);
  n++;
}
console.log(`converted ${n} cards -> ${OUT}`);
