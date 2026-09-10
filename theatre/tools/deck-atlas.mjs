#!/usr/bin/env node
// THE WHOLE DECK ON ONE SHEET, for the egg that lays all 78 face up on the cloth
// (src/pieces/egg-deck.js). Written once, here, and read at run time as a single file.
//
// WHY THERE IS AN ATLAS AT ALL. BRIEF.md rule 4: "never load more than a handful of card textures
// up front (the deck is 78 x 500 KB; load faces on demand)". The lay-out needs every face at once
// and the faces are 44 MB of 1024x1792 plates — 39 MB of download and 140 megapixels of canvas
// work if each one went through cards.js's own drawFront. At the overhead plate a laid card is
// about 100 px tall, so a 128 px cell is the plate it actually needs: 78 of them on one 1024x2240
// sheet is under a megabyte, one request, one upload to the GPU, and every card's own material is
// a clone of the same texture with its cell's offset on it.
//
// THE CELL IS CUT TO THE CARD, not to the plate: cards.js lays the 1024x1792 art into a canvas of
// the CARD's aspect with a paper margin of FRONT.M = 42 px each side (cards-art.js), so the same
// margin is put here — 5 px of paper at 128 — and a laid card carries the same white edge as one
// in a reading. The paper is the world's own (#f8f9f4, src/core/strokes.js), never plain white.
//
//   node tools/deck-atlas.mjs            # writes public/cards/deck-atlas.webp + .json
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const { DECK } = await import(join(ROOT, 'src/core/deck.js'));

const PAPER = { r: 0xf8, g: 0xf9, b: 0xf4 };
const COLS = 8, ROWS = 10; // 80 cells for 78 cards
const CELL_W = 128, CELL_H = 224; // 0.13 : 0.2275, the card's own measure
const M = 5; // the paper margin, FRONT.M scaled: 42/1108 of the cell's width
const PLATE_W = CELL_W - 2 * M; // 118
const PLATE_H = Math.round((PLATE_W * 1792) / 1024); // 207
const TOP = Math.round((CELL_H - PLATE_H) / 2);

const sheet = sharp({
  create: { width: COLS * CELL_W, height: ROWS * CELL_H, channels: 3, background: PAPER },
});
const layers = [];
for (let i = 0; i < DECK.length; i++) {
  const buf = await sharp(join(ROOT, 'public/cards', `${DECK[i].slug}.webp`))
    .resize(PLATE_W, PLATE_H, { fit: 'fill' })
    .toBuffer();
  layers.push({ input: buf, left: (i % COLS) * CELL_W + M, top: Math.floor(i / COLS) * CELL_H + TOP });
}
const out = join(ROOT, 'public/cards/deck-atlas.webp');
const info = await sheet.composite(layers).webp({ quality: 82 }).toFile(out);
writeFileSync(
  join(ROOT, 'public/cards/deck-atlas.json'),
  JSON.stringify({ cols: COLS, rows: ROWS, cell: [CELL_W, CELL_H], count: DECK.length, slugs: DECK.map((c) => c.slug) }, null, 1),
);
console.log(`deck-atlas.webp  ${COLS}x${ROWS} cells of ${CELL_W}x${CELL_H} · ${info.width}x${info.height} · ${(info.size / 1024).toFixed(0)} KB · ${DECK.length} cards`);
