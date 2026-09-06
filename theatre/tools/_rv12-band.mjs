#!/usr/bin/env node
// reveal round 12: THE PICK SURFACE, MEASURED. The band the wash is pushed out into is pure
// geometry (src/pieces/reveal-wash.js), so this needs no browser: it imports the module and checks
// BRIEF.md's five photograph tests plus the two things the interaction needs.
//
//   node tools/_rv12-band.mjs [wide|tall] [seed]
import { WASH, bandFor, cardCorners, extentOf, LIFT } from '../src/pieces/reveal-wash.js';

const want = process.argv[2] === 'tall' ? 'tall' : 'wide';
const seed = +(process.argv[3] ?? 0);
bandFor(want === 'tall' ? 0.51 : 1.78, seed);
const P = WASH.poses;
const C = WASH.card;
const MEAN = (C.w + C.h) / 2;

// ---- the footprint -------------------------------------------------------------------------------
const b = WASH.bounds;
console.log(`band ${WASH.shape} seed ${seed}   ${P.length} cards`);
console.log(`  footprint  ${(2 * b.x).toFixed(3)} x ${(b.z1 - b.z0).toFixed(3)} m   = ${((2 * b.x) / MEAN).toFixed(1)} x ${((b.z1 - b.z0) / MEAN).toFixed(1)} mean cards   z ${b.z0.toFixed(3)}..${b.z1.toFixed(3)}`);

// ---- the constraints -----------------------------------------------------------------------------
let maxR = 0, rowHits = 0, rowLift = 0, xMax = 0;
for (const p of P) {
  for (const c of cardCorners(p)) {
    maxR = Math.max(maxR, Math.hypot(c[0], c[1]));
    xMax = Math.max(xMax, Math.abs(c[0]));
    if (Math.abs(c[0]) <= 0.29 + C.w / 2 && c[1] < 0.256 + 0.004) rowHits++;
  }
  for (const c of cardCorners({ ...p, z: p.z - LIFT.z })) if (Math.abs(c[0]) <= 0.29 + C.w / 2 && c[1] < 0.256 + 0.004) rowLift++;
}
console.log(`  rim        furthest corner ${(1000 * maxR).toFixed(1)} mm (limit 600, the table's rim is 620)   widest corner |x| ${(1000 * xMax).toFixed(1)} mm`);
console.log(`  reading row  corners inside the bar at rest: ${rowHits} (must be 0)   with the card lifted up-frame: ${rowLift} of 312 (allowed: the raised card rides 20 mm proud and passes over)`);

// ---- flat, every angle ---------------------------------------------------------------------------
const angs = P.map((p) => ((p.ang % Math.PI) + Math.PI) % Math.PI).sort((a, b) => a - b);
let minGap = Infinity;
for (let i = 1; i < angs.length; i++) minGap = Math.min(minGap, angs[i] - angs[i - 1]);
const buckets = new Array(6).fill(0);
for (const a of angs) buckets[Math.min(5, Math.floor((a / Math.PI) * 6))]++;
console.log(`  angles     ${buckets.join('/')} cards per 30 degrees   closest pair ${((minGap * 180) / Math.PI).toFixed(2)}°`);

// ---- overlap, gaps, ragged outline ---------------------------------------------------------------
const pip = (q, px, pz) => {
  let s = false;
  for (let i = 0, k = q.length - 1; i < q.length; k = i++) if (q[i][1] > pz !== q[k][1] > pz && px < ((q[k][0] - q[i][0]) * (pz - q[i][1])) / (q[k][1] - q[i][1]) + q[i][0]) s = !s;
  return s;
};
const quads = P.map((p) => cardCorners(p));
const G = 0.002;
const depth = [];
let cells = 0, covered = 0;
const grid = [];
for (let x = -b.x - 0.01; x <= b.x + 0.01; x += G) {
  const col = [];
  for (let z = b.z0 - 0.01; z <= b.z1 + 0.01; z += G) {
    let n = 0;
    for (const q of quads) if (pip(q, x, z)) n++;
    cells++;
    if (n > 0) covered++;
    depth[n] = (depth[n] ?? 0) + 1;
    col.push(n);
  }
  grid.push(col);
}
const shown = depth.map((n, k) => [k, n]).filter(([k]) => k > 0);
const deep = shown.reduce((s, [k, n]) => s + (k >= 3 ? n : 0), 0);
console.log(`  overlap    ${(100 * (covered / cells)).toFixed(1)}% of the mass's box is card, ${(100 * (1 - covered / cells)).toFixed(1)}% bare cloth`);
console.log(`             cards deep: ${shown.slice(0, 8).map(([k, n]) => `${k}×${((100 * n) / covered).toFixed(0)}%`).join('  ')}   three or more: ${((100 * deep) / covered).toFixed(0)}%`);
// RAGGED, OR A DISC? The bare cloth that counts is the cloth INSIDE the mass's own convex hull —
// the bays bitten out of its outline and the holes in it. A disc or an arc scores near zero here
// however lumpy it looks; the photograph's wash is full of it.
const pts = [];
for (let i = 0; i < grid.length; i++) for (let j = 0; j < grid[i].length; j++) if (grid[i][j] > 0) pts.push([i, j]);
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const lower = [], upper = [];
for (const p of pts) {
  while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
  lower.push(p);
}
for (let i = pts.length - 1; i >= 0; i--) {
  const p = pts[i];
  while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
  upper.push(p);
}
const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
let A2 = 0;
for (let i = 0; i < hull.length; i++) {
  const a = hull[i], b = hull[(i + 1) % hull.length];
  A2 += a[0] * b[1] - b[0] * a[1];
}
const hullCells = Math.abs(A2) / 2;
console.log(`             bare cloth inside the mass's own outline: ${(100 * (1 - covered / hullCells)).toFixed(1)}% of its convex hull — a disc or an arc would be ~0`);

// ---- the ranks: is "the third from the left" a real thing? ---------------------------------------
const xs = P.map((p) => p.x);
let mono = true;
for (let i = 1; i < xs.length; i++) if (xs[i] < xs[i - 1] - 1e-9) mono = false;
const gaps = [];
for (let i = 1; i < xs.length; i++) gaps.push(xs[i] - xs[i - 1]);
const s = gaps.slice().sort((a, b) => a - b);
console.log(`  ranks      monotonic in x: ${mono}   gap between neighbours min ${(1000 * s[0]).toFixed(1)} median ${(1000 * s[s.length >> 1]).toFixed(1)} max ${(1000 * s[s.length - 1]).toFixed(1)} mm`);
console.log(`             the three at each end sit at x ${xs.slice(0, 3).map((v) => v.toFixed(3)).join(', ')} … ${xs.slice(-3).map((v) => v.toFixed(3)).join(', ')}`);

// ---- does the pointer name the card that is drawn there? (the same test as tools/_rv8-point) -----
const { indexAt } = await import('../src/pieces/reveal-wash.js');
let n = 0, ok = 0, off = [];
for (let x = -b.x; x <= b.x; x += G)
  for (let z = b.z0; z <= b.z1; z += G) {
    let top = null;
    for (const p of P) if (pip(cardCorners(p), x, z) && (!top || p.rank > top.rank)) top = p;
    if (!top) continue;
    n++;
    const got = indexAt(x, z);
    if (got === top.i) ok++;
    else off.push(Math.abs((got ?? -99) - top.i));
  }
console.log(`  pointer    names the card actually drawn there ${((100 * ok) / n).toFixed(1)}% of ${n} points on a card${off.length ? ` (worst ${Math.max(...off)} ranks away)` : ''}`);
