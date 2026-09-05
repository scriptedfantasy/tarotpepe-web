// throwaway (camera round 9): the fan plate at each stage of the picking beat, in the arithmetic
// alone — no page. What box does the subject make with 0,1,2,3 cards in the reading row, what lens
// does the plate then take, and what share of the frame does the SPREAD occupy in it?
//   node tools/_cam-r9-geom.mjs
import { LAYOUT as L } from '../src/core/layout.js';
import { SPREAD } from '../src/pieces/reveal-spread.js';
import { stagedRow } from '../src/pieces/reveal-takes.js';
import { tableSubject, buildShots } from '../src/pieces/camera-shots.js';
import { plate } from '../src/pieces/camera-plan.js';

const reveal = { slots: stagedRow(L), _fan: { SPREAD } };
const r3 = (v) => +v.toFixed(3);
const SUB = tableSubject(L, reveal);
console.log('src        ', SUB.src);
console.log('row        ', 'x±' + r3(SUB.row.x), 'z', r3(SUB.row.z0), '..', r3(SUB.row.z1));
console.log('spread     ', 'x±' + r3(SUB.spread.x), 'z', r3(SUB.spread.z0), '..', r3(SUB.spread.z1));
console.log('all        ', 'x±' + r3(SUB.all.x), 'z', r3(SUB.all.z0), '..', r3(SUB.all.z1));
console.log('slots      ', SUB.slots.map((s) => s.map(r3).join(',')).join(' | '));

// where a cloth point lands in a plate (plan axes, no lens rise)
const RAD = Math.PI / 180;
function place(shot, aspect, p) {
  const t = Math.tan((shot.fov * RAD) / 2);
  const up = shot.up, f = [0, -Math.sqrt(1 - up[2] * up[2] - up[1] * up[1] + 0) || 0, 0];
  // plan axes from `up` = (0, c, -s): f = (0, -s, -c)
  const c = up[1], s = -up[2];
  const F = [0, -s, -c];
  const d = [p[0] - shot.pos[0], p[1] - shot.pos[1], p[2] - shot.pos[2]];
  const depth = d[0] * F[0] + d[1] * F[1] + d[2] * F[2];
  const a = (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / depth;
  const b = d[0] / depth;
  return { u: b / (t * aspect), v: a / t };
}
const shareOf = (shot, aspect, pts) => {
  const qs = pts.map((p) => place(shot, aspect, [p[0], L.spread.y, p[1]]));
  const u0 = Math.min(...qs.map((q) => q.u)), u1 = Math.max(...qs.map((q) => q.u));
  const v0 = Math.min(...qs.map((q) => q.v)), v1 = Math.max(...qs.map((q) => q.v));
  return { w: (u1 - u0) / 2, h: (v1 - v0) / 2, x0: (u0 + 1) / 2, x1: (u1 + 1) / 2, y0: (1 - v1) / 2, y1: (1 - v0) / 2 };
};

for (const [W, H] of [[390, 760], [360, 800], [1200, 1100], [1600, 900]]) {
  const aspect = W / H;
  const shots = buildShots(L, aspect, reveal);
  const s = shots.fan;
  const sp = shareOf(s, aspect, SUB.spread.pts);
  const rw = shareOf(s, aspect, SUB.row.pts);
  console.log(
    `\n${W}x${H} fov ${r3(s.fov)} pos z ${r3(s.pos[2])} zBottom ${r3(s.zBottom)} zTop ${r3(s.zTop)}`,
  );
  console.log(`   spread box  x ${(sp.x0 * W).toFixed(0)}..${(sp.x1 * W).toFixed(0)} of ${W}   y ${(sp.y0 * H).toFixed(0)}..${(sp.y1 * H).toFixed(0)} of ${H}   area ${(sp.w * sp.h * 100).toFixed(1)}%`);
  console.log(`   row box     x ${(rw.x0 * W).toFixed(0)}..${(rw.x1 * W).toFixed(0)}   y ${(rw.y0 * H).toFixed(0)}..${(rw.y1 * H).toFixed(0)}`);
}
