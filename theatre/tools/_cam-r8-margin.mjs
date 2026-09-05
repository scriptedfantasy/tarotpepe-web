// throwaway (camera round 8): the subject's box IN PIXELS, and the cloth left outside it on each
// of the four edges — which is what "leave 4–5% of the short axis as margin" is a rule about.
//   node tools/_cam-r8-margin.mjs [shot …]
import { buildShots, tableSubject } from '../src/pieces/camera-shots.js';
import { place } from '../src/pieces/camera-frame.js';
import { LAYOUT as L } from '../src/core/layout.js';
import { SPREAD } from '../src/pieces/reveal-spread.js';
import { stagedRow } from '../src/pieces/reveal-takes.js';

const REVEAL = { slots: stagedRow(L), _fan: { SPREAD } };
const SIZES = [[1600, 900], [1200, 1100], [390, 760], [360, 800]];
const Y = L.spread.y;
const SUB = tableSubject(L, REVEAL);
const RISE = L.spread.card.h * Math.sin((78 * Math.PI) / 180);

console.log(`subject from: ${SUB.src}`);
const say = (n, b) => console.log(`  ${n.padEnd(7)} |x| <= ${b.x.toFixed(4)}  z ${b.z0.toFixed(4)}..${b.z1.toFixed(4)}   ${(2 * b.x).toFixed(4)} x ${(b.z1 - b.z0).toFixed(4)}`);
say('row', SUB.row);
say('spread', SUB.spread);
say('whole', SUB.all);

// the points of each plate's own subject, in world
const PTS = {
  spread: () => SUB.row.pts.map(([x, z]) => [x, Y, z]),
  fan: () => SUB.all.pts.map(([x, z]) => [x, Y, z]),
  turn: () => SUB.row.pts.map(([x, z]) => [x, Y, z]).concat(SUB.slots.flatMap(([sx, sy, sz]) => [[sx - L.spread.card.w / 2, sy + RISE, sz - 0.06], [sx + L.spread.card.w / 2, sy + RISE, sz - 0.06]])),
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['spread', 'fan', 'turn'];

for (const [W, H] of SIZES) {
  const A = W / H, S = Math.min(W, H);
  const shots = buildShots(L, A, REVEAL);
  console.log(`\n#### ${W}x${H}  (aspect ${A.toFixed(3)}, short axis ${S})`);
  for (const n of names) {
    const sh = shots[n];
    if (!sh || !PTS[n]) continue;
    const q = PTS[n]().map((p) => place(sh, A, p));
    const u0 = Math.min(...q.map((p) => p.u)), u1 = Math.max(...q.map((p) => p.u));
    const v0 = Math.min(...q.map((p) => p.v)), v1 = Math.max(...q.map((p) => p.v));
    const px = (u) => ((u + 1) / 2) * W, py = (v) => ((1 - v) / 2) * H;
    const x0 = px(u0), x1 = px(u1), yTop = py(v1), yBot = py(v0);
    const m = (v) => `${v.toFixed(0)}px (${((v / S) * 100).toFixed(1)}%)`;
    console.log(
      `${n.padEnd(7)} fov ${sh.fov.toFixed(1).padStart(5)}  box x ${x0.toFixed(0)}…${x1.toFixed(0)} y ${yTop.toFixed(0)}…${yBot.toFixed(0)}` +
        `  ${(x1 - x0).toFixed(0)}x${(yBot - yTop).toFixed(0)} · short axis ${((Math.min(x1 - x0, W) / S) * 100).toFixed(0)}%` +
        `\n        margins  left ${m(x0)}  right ${m(W - x1)}  top ${m(yTop)}  foot ${m(H - yBot)}` +
        `\n        frame z ${sh.zTop?.toFixed(3)}..${sh.zBottom?.toFixed(3)} (depth ${(sh.zBottom - sh.zTop).toFixed(3)})` +
        `  ${sh.zTop < -0.78 ? 'PAST THE AXIS LIMIT' : 'axis ok'}  ${sh.zBottom > 0.642 ? 'ON THE RUG' : 'rug ok'}` +
        `  rims: near ${(((0.62 - sh.zBottom) / (sh.zTop - sh.zBottom)) * 100).toFixed(1)}% far ${(((-0.62 - sh.zBottom) / (sh.zTop - sh.zBottom)) * 100).toFixed(1)}% of the frame's depth`,
    );
  }
}
