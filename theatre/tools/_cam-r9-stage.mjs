// throwaway (camera round 9): the fan plate at each stage of the picking beat, in the arithmetic
// alone — no page. Pass a rug line to see what the floor clamp costs.
//   node tools/_cam-r9-stage.mjs [plainFrom]
import { LAYOUT as L } from '../src/core/layout.js';
import { SPREAD } from '../src/pieces/reveal-spread.js';
import { stagedRow } from '../src/pieces/reveal-takes.js';
import { tableSubject, buildShots } from '../src/pieces/camera-shots.js';

const props = { rug: { plainFrom: +(process.argv[2] ?? 1.216) } };
const reveal = { slots: stagedRow(L), _fan: { SPREAD } };
const SUB = tableSubject(L, reveal);
const RAD = Math.PI / 180;
function place(shot, aspect, p) {
  const t = Math.tan((shot.fov * RAD) / 2);
  const up = shot.up, c = up[1], s = -up[2];
  const F = [0, -s, -c];
  const d = [p[0] - shot.pos[0], p[1] - shot.pos[1], p[2] - shot.pos[2]];
  const depth = d[0] * F[0] + d[1] * F[1] + d[2] * F[2];
  return { u: d[0] / depth / (t * aspect), v: (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / depth / t };
}
const boxIn = (shot, aspect, pts) => {
  const qs = pts.map((p) => place(shot, aspect, [p[0], L.spread.y, p[1]]));
  const u0 = Math.min(...qs.map((q) => q.u)), u1 = Math.max(...qs.map((q) => q.u));
  const v0 = Math.min(...qs.map((q) => q.v)), v1 = Math.max(...qs.map((q) => q.v));
  return { x0: (u0 + 1) / 2, x1: (u1 + 1) / 2, y0: (1 - v1) / 2, y1: (1 - v0) / 2, area: ((u1 - u0) / 2) * ((v1 - v0) / 2) };
};
const r3 = (v) => +v.toFixed(3);
console.log(`rug plain line ${props.rug.plainFrom}`);
for (const [W, H] of [[390, 760], [360, 800], [1200, 1100], [1600, 900]]) {
  const A = W / H;
  console.log(`\n=== ${W}x${H} (aspect ${r3(A)}) ===`);
  for (let k = 0; k <= 3; k++) {
    const s = buildShots(L, A, reveal, { laid: k, props }).fan;
    const sp = boxIn(s, A, SUB.spread.pts);
    const rw = boxIn(s, A, SUB.rows.slice(0, Math.max(1, k)).flat());
    console.log(
      `k=${k} fov ${String(r3(s.fov)).padEnd(6)} zc ${String(r3(s.look[2])).padEnd(6)} z ${r3(s.zTop)}..${r3(s.zBottom)}` +
      `  spread y ${(sp.y0 * H).toFixed(0)}..${(sp.y1 * H).toFixed(0)} (${(sp.area * 100).toFixed(1)}% of frame, x ${(sp.x0 * W).toFixed(0)}..${(sp.x1 * W).toFixed(0)})` +
      `  row y ${(rw.y0 * H).toFixed(0)}..${(rw.y1 * H).toFixed(0)}`,
    );
  }
}
