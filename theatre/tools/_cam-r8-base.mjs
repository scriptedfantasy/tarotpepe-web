// throwaway (camera round 8): the SAME margin report, run against the committed (round 7) solver,
// so "what the margin cost" is a difference and not an assertion.
//   node tools/_cam-r8-base.mjs
const BASE = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/base';
const { buildShots, tableSubject } = await import(`${BASE}/camera-shots.js`);
const { place } = await import(`${BASE}/camera-frame.js`);
const { LAYOUT: L } = await import('../src/core/layout.js');
const { SPREAD } = await import('../src/pieces/reveal-spread.js');
const { stagedRow } = await import('../src/pieces/reveal-takes.js');

const REVEAL = { slots: stagedRow(L), _fan: { SPREAD } };
const SIZES = [[1600, 900], [1200, 1100], [390, 760], [360, 800]];
const Y = L.spread.y;
const SUB = tableSubject(L, REVEAL);
const RISE = L.spread.card.h * Math.sin((78 * Math.PI) / 180);
const PTS = {
  spread: () => SUB.row.pts.map(([x, z]) => [x, Y, z]),
  fan: () => SUB.all.pts.map(([x, z]) => [x, Y, z]),
  turn: () => SUB.row.pts.map(([x, z]) => [x, Y, z]).concat(SUB.slots.flatMap(([sx, sy, sz]) => [[sx - L.spread.card.w / 2, sy + RISE, sz - 0.06], [sx + L.spread.card.w / 2, sy + RISE, sz - 0.06]])),
};
for (const [W, H] of SIZES) {
  const A = W / H, S = Math.min(W, H);
  const shots = buildShots(L, A, REVEAL);
  console.log(`\n#### ${W}x${H}`);
  for (const n of ['spread', 'fan', 'turn']) {
    const sh = shots[n];
    const q = PTS[n]().map((p) => place(sh, A, p));
    const u0 = Math.min(...q.map((p) => p.u)), u1 = Math.max(...q.map((p) => p.u));
    const v0 = Math.min(...q.map((p) => p.v)), v1 = Math.max(...q.map((p) => p.v));
    const px = (u) => ((u + 1) / 2) * W, py = (v) => ((1 - v) / 2) * H;
    const x0 = px(u0), x1 = px(u1), yTop = py(v1), yBot = py(v0);
    const m = (v) => `${v.toFixed(0)}px (${((v / S) * 100).toFixed(1)}%)`;
    console.log(
      `${n.padEnd(7)} fov ${sh.fov.toFixed(1).padStart(5)}  ${(x1 - x0).toFixed(0)}x${(yBot - yTop).toFixed(0)} · short axis ${((Math.min(x1 - x0, W) / S) * 100).toFixed(0)}%` +
        `\n        margins  left ${m(x0)}  right ${m(W - x1)}  top ${m(yTop)}  foot ${m(H - yBot)}` +
        `\n        frame z ${sh.zTop?.toFixed(3)}..${sh.zBottom?.toFixed(3)} (depth ${(sh.zBottom - sh.zTop).toFixed(3)})` +
        `  ${sh.zTop < -0.781 ? 'PAST THE AXIS LIMIT' : 'axis ok'}  ${sh.zBottom > 0.643 ? 'ON THE RUG' : 'rug ok'}`,
    );
  }
}
