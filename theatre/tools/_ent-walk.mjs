// The walk's eight drawings, per window shape, and where the leaf's edge stands on each.
//   node tools/_ent-walk.mjs
import { coverZooms, D, placement } from '../src/pieces/entrance-door.js';
const OPEN = 75 * (Math.PI / 180);
const APPROACH = [1.16, 1.6, 2.5, 4.2, 7.4];
for (const [w, h] of [[1600, 900], [390, 760], [1200, 1100], [1600, 600]]) {
  const { hole, leaf, s0 } = coverZooms(w, h, OPEN);
  const swallow = hole * 1.04;
  const clear = Math.max(leaf * 1.04, swallow * 1.03);
  const p = Math.log(APPROACH[APPROACH.length - 1]);
  const up = APPROACH.map((z) => Math.pow(swallow, Math.log(z) / p));
  const out = [1, 2, 3].map((i) => swallow + ((clear - swallow) * i) / 3);
  const T = up.concat(out);
  const k = 1 / (1 + Math.sin(OPEN) / 2.55);
  const edge = D.opening / 2 + (D.leafX0 + D.leafW * Math.cos(OPEN) - D.opening / 2) * k;
  const coef = (D.opening / 2 - edge) * s0;
  console.log(`${w}x${h}  hole ${hole.toFixed(2)}  leaf ${leaf.toFixed(2)}`);
  console.log('  truck ' + T.map((z) => z.toFixed(2)).join(' '));
  console.log('  leaf covers (px from left edge) ' + T.map((z) => Math.max(0, Math.round(w / 2 - coef * z))).join(' '));
  console.log('  paper at the right edge (px) ' + T.map((z) => Math.max(0, Math.round(w / 2 - (D.opening / 2 - D.lining) * s0 * z))).join(' '));
}
