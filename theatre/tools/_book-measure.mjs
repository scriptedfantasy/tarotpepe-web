#!/usr/bin/env node
// What the open book measures at each window, with no page and no browser: the reading shot is
// solved by camera-frame.js's own arithmetic, the leaf is projected through it, and the book is then
// cut into leaves by walk-book-page.js exactly as the piece cuts it.
//   node tools/_book-measure.mjs
import { fit, place } from '../src/pieces/camera-frame.js';
import { sheetOf, paginate, plateBox } from '../src/pieces/walk-book-page.js';
import { TAROT_BY_PEPE } from '../src/pieces/book-tarot.js';

const READING = { x0: 1.98, x1: 2.52, z0: -0.62, z1: 0.02, top: 0.72, bx: 0.17, bz: 0.24 };
READING.cx = (READING.x0 + READING.x1) / 2;
READING.cz = (READING.z0 + READING.z1) / 2;
const BOARD = { w: 0.17, h: 0.24, t: 0.0025 };
const LEAF = { w: 0.16, h: 0.226 };
const BLOCK = 0.04;
const yaw = -0.09, cy = Math.cos(yaw), sy = Math.sin(yaw);
const rot = (x, z) => [x * cy + z * sy, -x * sy + z * cy];
const g = rot(0.075, 0);
const gx = READING.cx + 0.01 + g[0], gz = READING.cz - 0.01 + g[1];
const spine = -READING.bx / 2;
const plane = READING.top + 0.0225;
const plan = (aspect, at, halfX, m) => {
  const [px, pz] = rot(at, 0);
  const c = [gx + px, gz + pz];
  const keep = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const [dx, dz] = rot(sx * (halfX + m), sz * (READING.bz / 2 + m));
    keep.push([c[0] + dx, plane, c[1] + dz]);
  }
  return fit({ pos: [c[0], READING.top + 1.53, c[1]], look: [c[0], plane, c[1]], up: [-sy, 0, -cy], keep, pad: 0.05 }, aspect);
};

const MS = (process.env.MS ?? '0.02,0.01').split(',').map(Number);
for (const [w, h] of [[1280, 800], [1600, 900], [1200, 1100], [390, 844], [390, 760]]) {
  const A = w / h;
  const wide = A >= 1.05;
  const shot = wide ? plan(A, spine, READING.bx, MS[0]) : plan(A, spine + READING.bx / 2, READING.bx / 2, MS[1]);
  // the recto's own two corners, in the book's frame, at the leaves' mid-height
  const wp = (lx, lz) => {
    const [dx, dz] = rot(lx, lz);
    return [gx + dx, plane, gz + dz];
  };
  const a = place(shot, A, wp(spine, -LEAF.h / 2));
  const b = place(shot, A, wp(spine + LEAF.w, LEAF.h / 2));
  const pw = Math.abs(b.x - a.x) * w, ph = Math.abs(b.y - a.y) * h;
  const S = sheetOf(pw, ph);
  const cut = paginate(TAROT_BY_PEPE, S);
  const P = plateBox(S);
  const nLeaves = Math.ceil((cut.leaves.length + 1) / 2);
  const kinds = cut.leaves.map((L) => (L.plate ? 'plate' : L.blank ? 'blank' : L.index ? 'index' : 'text'));
  const n = (k) => kinds.filter((x) => x === k).length;
  console.log(`${w}x${h}  ${wide ? 'the spread' : 'one leaf'}, ${shot.fov.toFixed(2)} deg`);
  console.log(`   a leaf is ${pw.toFixed(0)} x ${ph.toFixed(0)} px on the glass, set at a ${cut.cap} px cap`);
  console.log(`   ${cut.leaves.length} pages on ${nLeaves} leaves of ${((BLOCK / nLeaves) * 1000).toFixed(3)} mm — ${n('plate')} plates, ${n('index')} of contents, ${n('blank')} printer's blanks, ${n('text')} of text`);
  console.log(`   the plate on a card page is ${P.w.toFixed(0)} x ${P.h.toFixed(0)} px`);
}
void BOARD;
