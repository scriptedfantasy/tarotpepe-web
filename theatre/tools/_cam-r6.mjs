// throwaway (camera round 6): what each plate actually covers ON THE CLOTH, at every window shape.
//   node tools/_cam-r6.mjs [shot …]
import { buildShots } from '../src/pieces/camera-shots.js';
import { place } from '../src/pieces/camera-frame.js';
import { LAYOUT as L } from '../src/core/layout.js';

const SIZES = [[1600, 900], [1200, 1100], [390, 760]];
const Y = L.spread.y;
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['spread', 'fan', 'turn', 'riffle', 'card1'];
const solve = (f, lo, hi) => {
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (f(m) < 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};
for (const [W, H] of SIZES) {
  const A = W / H;
  const shots = buildShots(L, A);
  console.log(`\n#### ${W}x${H}`);
  for (const n of names) {
    const sh = shots[n];
    if (!sh) continue;
    const at = (x, z) => place(sh, A, [x, Y, z]);
    const zc = sh.look[2];
    const xR = solve((x) => at(x, zc).u - 1, 0, 4);
    const zB = solve((z) => -at(0, z).v - 1, zc, zc + 6);
    const zT = solve((z) => at(0, z).v - 1, zc, zc - 6);
    const fan = (0.6916 / (2 * xR)) * 100;
    const row = (0.85 / (2 * xR)) * 100;
    const pitch = ((0.6916 / (2 * xR)) * W) / 21;
    // how much of the frame's height the business on the cloth (row far → ribbon near) fills
    const vTop = at(0, 0.0263).v, vBot = at(0, 0.5711).v;
    const fill = ((vTop - vBot) / 2) * 100;
    console.log(
      `${n.padEnd(7)} fov ${sh.fov.toFixed(1).padStart(5)}  cloth x ±${xR.toFixed(3)}  z ${zT.toFixed(3)}..${zB.toFixed(3)}` +
        `  | fan ${fan.toFixed(0)}% row ${row.toFixed(0)}% of width · pitch ${pitch.toFixed(1)}px · business fills ${fill.toFixed(0)}% of height`,
    );
  }
}
