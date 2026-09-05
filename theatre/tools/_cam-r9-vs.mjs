// throwaway (camera round 9): EVERY named shot, round 8's solver against round 9's, at four window
// shapes. Round 9 must change the fan plate while the reading row is filling and NOTHING ELSE.
//   node tools/_cam-r9-vs.mjs [laid]
import { LAYOUT as L } from '../src/core/layout.js';
import { SPREAD } from '../src/pieces/reveal-spread.js';
import { stagedRow } from '../src/pieces/reveal-takes.js';
import { buildShots as now } from '../src/pieces/camera-shots.js';
import { buildShots as was } from '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/old/camera-shots.js';

const LAID = +(process.argv[2] ?? 3);
const reveal = { slots: stagedRow(L), _fan: { SPREAD } };
const props = { rug: { plainFrom: 1.216 } };
const r4 = (v) => +v.toFixed(4);
for (const [W, H] of [[390, 760], [360, 800], [1200, 1100], [1600, 900]]) {
  const A = W / H;
  const a = was(L, A, reveal);
  const b = now(L, A, reveal, { laid: LAID, props });
  const moved = [];
  for (const k of Object.keys(b)) {
    const x = a[k], y = b[k];
    if (!x || !y) continue;
    const dp = Math.hypot(...x.pos.map((v, i) => v - y.pos[i]));
    const df = Math.abs((x.fov ?? 30) - (y.fov ?? 30));
    if (dp > 5e-5 || df > 5e-4) moved.push(`  ${k.padEnd(10)} Δpos ${r4(dp)} m  fov ${r4(x.fov)} → ${r4(y.fov)}`);
  }
  console.log(`${W}x${H} (laid=${LAID}): ${moved.length ? moved.length + ' shot(s) moved' : 'NOTHING MOVED — every shot byte-identical to round 8'}`);
  for (const m of moved) console.log(m);
}
