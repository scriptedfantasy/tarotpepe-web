// throwaway (camera round 9): every named shot, old rug line against the measured one, at four
// window shapes — what moved and what did not.
//   node tools/_cam-r9-diff.mjs
import { LAYOUT as L } from '../src/core/layout.js';
import { SPREAD } from '../src/pieces/reveal-spread.js';
import { stagedRow } from '../src/pieces/reveal-takes.js';
import { buildShots } from '../src/pieces/camera-shots.js';

const reveal = { slots: stagedRow(L), _fan: { SPREAD } };
const r4 = (v) => +v.toFixed(4);
for (const [W, H] of [[390, 760], [360, 800], [1200, 1100], [1600, 900]]) {
  const A = W / H;
  const old = buildShots(L, A, reveal, { laid: 3, props: { rug: { plainFrom: 0.642 } } });
  const now = buildShots(L, A, reveal, { laid: 3, props: { rug: { plainFrom: 1.216 } } });
  const lines = [];
  for (const k of Object.keys(now)) {
    const a = old[k], b = now[k];
    if (!a || !b) continue;
    const dp = Math.hypot(...a.pos.map((v, i) => v - b.pos[i]));
    const df = Math.abs((a.fov ?? 30) - (b.fov ?? 30));
    if (dp > 1e-6 || df > 1e-6) lines.push(`    ${k.padEnd(10)} pos ${a.pos.map(r4)} fov ${r4(a.fov)}  →  pos ${b.pos.map(r4)} fov ${r4(b.fov)}   (zTop ${r4(a.zTop ?? NaN)}→${r4(b.zTop ?? NaN)}, zBottom ${r4(a.zBottom ?? NaN)}→${r4(b.zBottom ?? NaN)})`);
  }
  console.log(`${W}x${H}: ${lines.length ? lines.length + ' shot(s) moved by the rug line' : 'NOTHING MOVED'}`);
  for (const l of lines) console.log(l);
}
