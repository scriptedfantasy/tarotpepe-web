// throwaway (camera round 9): for which window shapes does the reading row actually cost the fan
// plate anything? Sweeps the aspect and prints the plate with the row empty and with it full.
//   node tools/_cam-r9-sweep.mjs
import { LAYOUT as L } from '../src/core/layout.js';
import { SPREAD } from '../src/pieces/reveal-spread.js';
import { stagedRow } from '../src/pieces/reveal-takes.js';
import { buildShots } from '../src/pieces/camera-shots.js';

const reveal = { slots: stagedRow(L), _fan: { SPREAD } };
const props = { rug: { plainFrom: 1.216 } };
const r2 = (v) => v.toFixed(2);
console.log('aspect   fov k=0   fov k=3   depth0  depth3   zTop/zBottom k=0        what changes');
for (const A of [0.4, 0.45, 0.513, 0.6, 0.7, 0.8, 0.9, 1.0, 1.091, 1.15, 1.2, 1.35, 1.5, 1.6, 1.778, 2.0, 2.35]) {
  const a = buildShots(L, A, reveal, { laid: 0, props }).fan;
  const b = buildShots(L, A, reveal, { laid: 3, props }).fan;
  const t0 = Math.tan((a.fov * Math.PI) / 360), t3 = Math.tan((b.fov * Math.PI) / 360);
  console.log(
    `${r2(A).padStart(5)}   ${r2(a.fov).padStart(6)}   ${r2(b.fov).padStart(6)}   ${r2(a.zBottom - a.zTop)}    ${r2(b.zBottom - b.zTop)}   ${r2(a.zTop)}..${r2(a.zBottom)}   ` +
    (Math.abs(a.fov - b.fov) < 0.05 ? 'width-bound: no move' : `${r2((1 - t0 / t3) * 100)}% tighter while choosing`),
  );
}
