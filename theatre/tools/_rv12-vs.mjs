#!/usr/bin/env node
// reveal round 12: THE OLD FAN'S PLATE AGAINST THE NEW MASS'S, solved by the camera's own solver.
// No browser and no guessing: it imports camera-shots.js and hands it two fake reveal pieces — the
// six/eight nested bows as HEAD left them (read out of git into a scratch file) and the band this
// round lays — and prints the frame each one makes at both window shapes.
//
//   node tools/_rv12-vs.mjs <path to the old reveal-spread.js>
import { buildShots, tableSubject } from '../src/pieces/camera-shots.js';
import { LAYOUT } from '../src/core/layout.js';
import { WASH, bandFor } from '../src/pieces/reveal-wash.js';

const oldPath = process.argv[2];
const OLD = oldPath ? await import(oldPath) : null;
const ROW = LAYOUT.spread.slots.map(([x, y, z]) => [Math.sign(x) * Math.min(Math.abs(x), 0.225), y, z]);

function frameOf(reveal, aspect, laid = 0) {
  const shots = buildShots(LAYOUT, aspect, reveal, { laid });
  const s = shots.fan;
  const d = Math.hypot(s.pos[0] - s.look[0], s.pos[1] - s.look[1], s.pos[2] - s.look[2]);
  const t = Math.tan(((s.fov ?? 30) * Math.PI) / 360);
  const h = 2 * t * d, w = h * aspect;
  const SUB = tableSubject(LAYOUT, reveal);
  return { w, h, dist: d, fov: s.fov, look: s.look, pos: s.pos, sub: SUB.spread, src: SUB.src };
}

const shapes = [[1600, 900], [390, 760], [1200, 1100]];
for (const [W, H] of shapes) {
  const A = W / H;
  console.log(`\n${W}x${H}  (aspect ${A.toFixed(2)})`);
  if (OLD) {
    OLD.layoutFor(A);
    const fake = { slots: ROW, _fan: { SPREAD: OLD.SPREAD } };
    const f = frameOf(fake, A);
    console.log(`  the fan   frame ${f.w.toFixed(3)} x ${f.h.toFixed(3)} m of cloth   ${(W / f.w).toFixed(0)} px/m   a card 0.13 m wide is ${((0.13 * W) / f.w).toFixed(0)} px   [${f.src}]`);
    console.log(`            its box |x| ≤ ${f.sub.x.toFixed(3)}  z ${f.sub.z0.toFixed(3)}..${f.sub.z1.toFixed(3)}   = ${(100 * ((2 * f.sub.x) / f.w) * ((f.sub.z1 - f.sub.z0) / f.h)).toFixed(1)}% of the frame   fov ${f.fov.toFixed(1)} dist ${f.dist.toFixed(3)} look ${f.look.map((v)=>v.toFixed(3)).join(',')}`);
  }
  bandFor(A, 0);
  const mine = { slots: ROW, tableBounds: WASH.bounds.pts };
  const g = frameOf(mine, A);
  console.log(`  the mass  frame ${g.w.toFixed(3)} x ${g.h.toFixed(3)} m of cloth   ${(W / g.w).toFixed(0)} px/m   a card 0.13 m wide is ${((0.13 * W) / g.w).toFixed(0)} px   [${g.src}]`);
  console.log(`            its box |x| ≤ ${g.sub.x.toFixed(3)}  z ${g.sub.z0.toFixed(3)}..${g.sub.z1.toFixed(3)}   = ${(100 * ((2 * g.sub.x) / g.w) * ((g.sub.z1 - g.sub.z0) / g.h)).toFixed(1)}% of the frame   fov ${g.fov.toFixed(1)} dist ${g.dist.toFixed(3)} look ${g.look.map((v)=>v.toFixed(3)).join(',')}`);
}
