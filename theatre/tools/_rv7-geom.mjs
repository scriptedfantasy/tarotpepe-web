#!/usr/bin/env node
// round 7: the 78-card spread, measured. Imports the piece's own geometry so the numbers below are
// the numbers the drawing uses. Prints, for every card: its corners' radius against the table's
// rim, its clearance to the three slot cards, and its extents against the two frames.
//   node tools/_rv7-geom.mjs
import { SPREAD, tierOf, cardCorners, entryPoses } from '../src/pieces/reveal-spread.js';

const RIM = 0.62;
const CARD = { w: 0.13, h: 0.2275 };
const SLOTS = [-0.225, 0, 0.225].map((x) => ({ x0: x - CARD.w / 2 - 0.002, x1: x + CARD.w / 2 + 0.002, z0: 0.14 - CARD.h / 2 - 0.002, z1: 0.14 + CARD.h / 2 + 0.002 }));
// the fan plate's frame on the cloth, measured in the page (tools/_rv7-shots.mjs)
const FRAME = { wide: { x: 0.503, z: [0.01, 0.577] }, phone: { x: 0.438, z: [-0.78, 0.928] } };

const poses = entryPoses();
let maxR = 0, maxX = 0, minZ = 9, maxZ = -9, worstSlot = 9, worstCard = null;
const pitches = [];
for (const p of poses) {
  for (const c of cardCorners(p, CARD)) {
    const r = Math.hypot(c[0], c[1]);
    if (r > maxR) { maxR = r; worstCard = p; }
    maxX = Math.max(maxX, Math.abs(c[0]));
    minZ = Math.min(minZ, c[1]);
    maxZ = Math.max(maxZ, c[1]);
  }
  // clearance to each slot rectangle: negative = overlap
  for (const s of SLOTS) {
    const cs = cardCorners(p, CARD);
    // separating-axis on the card's own axes and the world axes (both are rectangles)
    const d = rectGap(cs, [[s.x0, s.z0], [s.x1, s.z0], [s.x1, s.z1], [s.x0, s.z1]]);
    if (d < worstSlot) worstSlot = d;
  }
}
for (const t of SPREAD.tiers) pitches.push(+((2 * t.phi * t.r) / (t.n - 1) * 1000).toFixed(1));

// gap between two convex polygons along the separating axes (positive = apart)
function rectGap(A, B) {
  let best = -Infinity;
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const L = Math.hypot(nx, ny) || 1;
      const ax = nx / L, ay = ny / L;
      const pa = A.map((p) => p[0] * ax + p[1] * ay), pb = B.map((p) => p[0] * ax + p[1] * ay);
      const gap = Math.max(Math.min(...pa) - Math.max(...pb), Math.min(...pb) - Math.max(...pa));
      if (gap > best) best = gap;
    }
  }
  return best;
}

const mm = (v) => +(v * 1000).toFixed(1);
console.log('cards           ', poses.length);
console.log('tiers r/phi/n   ', SPREAD.tiers.map((t) => `${t.r} / ${((t.phi * 180) / Math.PI).toFixed(1)}deg / ${t.n}`).join('   '));
console.log('pitch per tier  ', pitches.join(' '), 'mm');
console.log('tier step       ', mm(SPREAD.step), 'mm');
console.log('max corner r    ', maxR.toFixed(4), ' rim', RIM, ' margin', mm(RIM - maxR), 'mm');
console.log('extent |x|      ', maxX.toFixed(4), ' phone frame', FRAME.phone.x, ' margin', mm(FRAME.phone.x - maxX), 'mm');
console.log('extent z        ', minZ.toFixed(4), '..', maxZ.toFixed(4), ' 16:9 frame', FRAME.wide.z, ' margins', mm(minZ - FRAME.wide.z[0]), mm(FRAME.wide.z[1] - maxZ), 'mm');
console.log('worst slot gap  ', mm(worstSlot), 'mm  (negative = a card overlaps a reading slot)');
// what a card is worth on screen: px per metre measured in the page (1590 at 1600x900, 445 at 390x760)
for (const [name, ppm, w] of [['1600x900', 1590, 1600], ['390x760', 445, 390]]) {
  console.log(`${name}: pitch ${(pitches[0] / 1000 * ppm).toFixed(1)} px   tier step ${(SPREAD.step * ppm).toFixed(1)} px   a raised card ${(CARD.w * ppm).toFixed(0)} x ${(CARD.h * ppm).toFixed(0)} px   spread ${(2 * maxX * ppm).toFixed(0)} px of ${w}`);
}
