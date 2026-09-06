#!/usr/bin/env node
// reveal round 12: WHAT BOX THE CHOOSING PLATE CAN ACTUALLY HOLD. The tabletop plates are composed
// on whatever the reveal piece publishes as `tableBounds` (camera-shots.js → tableSubject), with the
// caption's placard docked over the top 22 % of the frame while the visitor is choosing, the bottom
// edge pinned inside the rim and the rug line under that. Those rules fight each other, and a box
// only a little deeper than the fan's used to be sends the lens running away — the first cut of
// this round's band put 2.28 m of cloth in a 1600 px frame.
//
// So this sweeps the box the mass is allowed to occupy against the camera's own solver, in node,
// and prints how big a card comes out in the picture. It is how the band's `xcap` and `zcap` were
// chosen (reveal-wash.js → BANDS).
//
//   node tools/_rv12-sweep.mjs [w] [h]
import { buildShots } from '../src/pieces/camera-shots.js';
import { LAYOUT } from '../src/core/layout.js';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const A = W / H;
const ROW = LAYOUT.spread.slots.map(([x, y, z]) => [Math.sign(x) * Math.min(Math.abs(x), 0.225), y, z]);

const frame = (x, z0, z1) => {
  const reveal = { slots: ROW, tableBounds: [[-x, z0], [x, z0], [-x, z1], [x, z1]] };
  const s = buildShots(LAYOUT, A, reveal, { laid: 0 }).fan;
  const d = Math.hypot(s.pos[0] - s.look[0], s.pos[1] - s.look[1], s.pos[2] - s.look[2]);
  const t = Math.tan(((s.fov ?? 30) * Math.PI) / 360);
  const h = 2 * t * d;
  return { w: h * A, h, look: s.look[2] };
};

console.log(`the choosing plate at ${W}x${H} (aspect ${A.toFixed(2)}) — a card 0.13 m wide, in px, for a mass of this box`);
for (const z0 of [0.230, 0.262]) {
  console.log(`\n  the mass's far edge at z ${z0.toFixed(3)}`);
  const z1s = [0.50, 0.52, 0.54, 0.56, 0.575, 0.59];
  process.stdout.write('    near edge →  ');
  for (const z1 of z1s) process.stdout.write(String(z1.toFixed(3)).padStart(8));
  console.log();
  for (const x of [0.20, 0.25, 0.28, 0.31, 0.34, 0.366, 0.40, 0.44]) {
    process.stdout.write(`    |x| <= ${x.toFixed(3)} `);
    for (const z1 of z1s) {
      const f = frame(x, z0, z1);
      process.stdout.write(String(((0.13 * W) / f.w).toFixed(0)).padStart(8));
    }
    console.log();
  }
}
