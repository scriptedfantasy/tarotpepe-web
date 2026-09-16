#!/usr/bin/env node
// The three places' frames, solved without a page: the lens, the rise, and where the thing the
// frame is named for lands in it. No browser — camera-shots.js is pure arithmetic over the layout.
//   node tools/_walk-geom.mjs
import { LAYOUT } from '../src/core/layout.js';
import { buildShots } from '../src/pieces/camera-shots.js';
import { place } from '../src/pieces/camera-frame.js';

const WINS = [[1280, 800], [390, 844], [1600, 900], [1200, 1100]];
const box = (xs, ys, zs) => { const o = []; for (const x of xs) for (const y of ys) for (const z of zs) o.push([x, y, z]); return o; };
for (const [w, h] of WINS) {
  const A = w / h;
  const S = buildShots(LAYOUT, A, null, { laid: 0, props: { rug: { plainFrom: 1.216 } } });
  const row = (n) => `${n.padEnd(10)} pos ${S[n].pos.map((v) => v.toFixed(2)).join(',')}  fov ${S[n].fov.toFixed(1)}  rise ${(S[n].shift?.[1] ?? 0).toFixed(3)}`;
  console.log(`--- ${w}x${h} (${A.toFixed(3)})`);
  for (const n of ['fireplace', 'doorway', 'case', 'home', 'door']) console.log('  ' + row(n));
  const p = (n, pt) => {
    const q = place(S[n], A, pt);
    return `u ${q.u.toFixed(2)} v ${q.v.toFixed(2)} @ ${(q.x * w).toFixed(0)},${(q.y * h).toFixed(0)}`;
  };
  console.log('   grate floor', p('fireplace', [-2.36, 0.2, -0.05]), ' flame tip', p('fireplace', [-2.36, 0.6, -0.05]));
  console.log('   mantel L|R ', p('fireplace', [-2.36, 1.22, -0.66]), '|', p('fireplace', [-2.36, 1.22, 0.56]));
  console.log('   door head  ', p('doorway', [1.5, 2.45, -2.5]), ' sill', p('doorway', [1.5, 0.06, -2.5]));
  console.log('   case TL|BR ', p('case', [-2.1, 2.45, -2.2]), '|', p('case', [-1.06, 0.07, -2.2]));
  const ppm = ((place(S.case, A, [-1.58, 0.07, -2.2]).y - place(S.case, A, [-1.58, 2.45, -2.2]).y) * h) / 2.38;
  console.log(`   case scale  ${ppm.toFixed(0)} px/m  → a 60 mm spine is ${(ppm * 0.06).toFixed(0)} px across`);
  // …AND WHAT THE RESTING PLATE CAN REACH. The three hotspots' own corners, projected through
  // `home`, as a box on the glass: a place whose box is wholly off the frame cannot be clicked
  // from where the evening is watched, which is the phone's whole question.
  const CORNERS = {
    // walk.js's own bounds, to the metre: the whole eight corners, not the front face
    fireplace: box([-2.6, -2.36], [0, 1.26], [-0.66, 0.56]),
    doorway: box([1.05, 1.95], [0, 2.45], [-2.5, -2.4]),
    case: box([-2.1, -1.06], [0, 2.45], [-2.46, -2.2]),
  };
  for (const [n, pts] of Object.entries(CORNERS)) {
    const q = pts.map((p) => place(S.home, A, p));
    const xs = q.map((k) => k.x * w), ys = q.map((k) => k.y * h);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const on = Math.max(0, Math.min(x1, w) - Math.max(x0, 0)) * Math.max(0, Math.min(y1, h) - Math.max(y0, 0));
    console.log(`   from home: ${n.padEnd(9)} box ${x0.toFixed(0)},${y0.toFixed(0)} ${(x1 - x0).toFixed(0)}x${(y1 - y0).toFixed(0)} — ${on > 0 ? `${((on / (w * h)) * 100).toFixed(1)}% of the frame` : 'OFF THE FRAME'}`);
  }
}
