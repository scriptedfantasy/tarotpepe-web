// throwaway (camera round 7): what is ACTUALLY on the cloth, and what each plate does with it.
// Everything is measured IN THE PICTURE (v from -1 at the foot to +1 at the top), not in cloth
// metres, so a raked plate is measured the way it is seen. The subject comes from the reveal
// modules — the same numbers the camera reads off ctx.pieces.reveal at runtime.
//   node tools/_cam-r7.mjs [shot …]
import { buildShots, tableSubject } from '../src/pieces/camera-shots.js';
import { place } from '../src/pieces/camera-frame.js';
import { LAYOUT as L } from '../src/core/layout.js';
import { SPREAD } from '../src/pieces/reveal-spread.js';
import { stagedRow } from '../src/pieces/reveal-takes.js';

// the reveal piece as the camera sees it at runtime
const REVEAL = { slots: stagedRow(L), _fan: { SPREAD } };
const SIZES = [[1600, 900], [1200, 1100], [390, 760], [360, 800]];
const Y = L.spread.y;
const RIM = L.table.radius;

const SUB = tableSubject(L, REVEAL);
console.log(`subject from: ${SUB.src}`);
console.log(`  row     |x| ≤ ${SUB.row.x.toFixed(4)}  z ${SUB.row.z0.toFixed(4)}..${SUB.row.z1.toFixed(4)}`);
console.log(`  spread  |x| ≤ ${SUB.spread.x.toFixed(4)}  z ${SUB.spread.z0.toFixed(4)}..${SUB.spread.z1.toFixed(4)}`);
console.log(`  both    |x| ≤ ${SUB.all.x.toFixed(4)}  z ${SUB.all.z0.toFixed(4)}..${SUB.all.z1.toFixed(4)}`);

// which box each plate is meant to hold
const BOX = { spread: SUB.row, turn: SUB.row, fan: SUB.all, card0: null, card1: null, card2: null };
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['spread', 'fan', 'turn', 'riffle', 'deck', 'card1'];

for (const [W, H] of SIZES) {
  const A = W / H;
  const shots = buildShots(L, A, REVEAL);
  console.log(`\n#### ${W}x${H}  (aspect ${A.toFixed(3)})`);
  for (const n of names) {
    const sh = shots[n];
    if (!sh) continue;
    const at = (x, z) => place(sh, A, [x, Y, z]);
    // the table's rim, in the picture: where its near and far points sit, and its width on the axis
    const near = at(0, RIM).v, far = at(0, -RIM).v;
    const left = at(-RIM, sh.look[2]).u, right = at(RIM, sh.look[2]).u;
    const belowNear = Math.max(0, (near + 1) / 2) * 100; // share of the frame's HEIGHT below the near rim
    const aboveFar = Math.max(0, (1 - far) / 2) * 100;   // (0 = the rim is off the frame: no floor)
    const diaV = ((far - near) / 2) * 100;      // the disc's height as a share of the frame's height
    const diaU = ((right - left) / 2) * 100;    // …and its width as a share of the frame's width
    const shortIsW = W < H;
    const diaShort = shortIsW ? (diaU * W) / Math.min(W, H) : (diaV * H) / Math.min(W, H);
    // the plate's own subject, as a box in px
    let sub = '';
    const b = BOX[n];
    if (b) {
      // the turn's subject stands up off the cloth: measure to the top of the reared card
      const rise = n === 'turn' ? place(sh, A, [0, Y + L.spread.card.h * Math.sin((78 * Math.PI) / 180), b.z0 - 0.06]).v : null;
      const px = ((at(b.x, sh.look[2]).u - at(-b.x, sh.look[2]).u) / 2) * W;
      const py = (((rise ?? at(0, b.z0).v) - at(0, b.z1).v) / 2) * H;
      const shortFill = shortIsW ? (px / W) * 100 : (py / H) * 100;
      sub = `\n        subject ${px.toFixed(0)}x${py.toFixed(0)} px of ${W}x${H} · ${((px / W) * 100).toFixed(0)}% of width, ${((py / H) * 100).toFixed(0)}% of height · SHORT AXIS ${shortFill.toFixed(0)}%`;
    }
    // symmetry of the rim's arc about the frame's vertical axis
    const sym = Math.abs(left + right) < 1e-6 ? 'symmetric' : `OFF AXIS by ${(((left + right) / 2) * 100).toFixed(1)}%`;
    console.log(
      `${n.padEnd(7)} fov ${sh.fov.toFixed(1).padStart(5)}  centre z ${sh.look[2].toFixed(3)}  rim arc ${sym}` + sub +
        `\n        table disc ${diaShort.toFixed(0)}% of the short axis (${diaU.toFixed(0)}% of width, ${diaV.toFixed(0)}% of height)` +
        `\n        beyond the near rim ${belowNear.toFixed(1)}% of height · beyond the far rim ${aboveFar.toFixed(1)}%`,
    );
  }
}
