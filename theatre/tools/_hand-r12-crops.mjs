#!/usr/bin/env node
// hand r12 — the same patch of every frame, before and after, at 3x nearest-neighbour: a sleeve's
// edge with a card's edge beside it, so the two pens are compared in one look.
import sharp from 'sharp';
const DIR = new URL('../public/progress/', import.meta.url).pathname;
// state → [x, y, w, h] of a patch that holds a sleeve edge AND a card edge
const PATCH = {
  shuffle: [290, 200, 220, 150],
  pick: [790, 0, 220, 150],
  gather: [470, 90, 220, 150],
};
const S = 3;
for (const [state, [x, y, w, h]] of Object.entries(PATCH)) {
  for (const tag of ['before', 'after']) {
    const inp = `${DIR}hand-r12-${tag}-${state}-laptop.png`;
    const out = `${DIR}hand-r12-${tag}-crop-${state}.png`;
    await sharp(inp).extract({ left: x, top: y, width: w, height: h }).resize(w * S, h * S, { kernel: 'nearest' }).png().toFile(out);
    console.log('wrote', out);
  }
}
