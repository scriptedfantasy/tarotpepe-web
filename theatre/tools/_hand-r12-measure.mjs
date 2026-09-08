#!/usr/bin/env node
// hand r12 — how wide is a line on screen, in css px.
//
// A contour is measured the way ink.js measures its own: the run of pixels at or below HALF
// coverage between paper (#f8f9f4, luma ~247) and ink (#0d0e0d, luma ~14) — luma <= 130 — plus the
// solid core, luma <= 64. Runs are found along one scanline so the number is the stroke's width
// across itself only where the stroke is square to the scan; obliquely cut strokes read wider, and
// that is why the sleeve and the card are always measured on the SAME line of the SAME frame.
//
//   node tools/_hand-r12-measure.mjs <png> row <y> [x0] [x1]
//   node tools/_hand-r12-measure.mjs <png> col <x> [y0] [y1]
//
// `perp` is the honest one: given a seed anywhere ON a stroke it walks out from that seed at 36
// angles and keeps the NARROWEST crossing, which is the stroke's width across itself whatever
// direction the stroke happens to run in. A row or column scan of the same stroke reads wider
// wherever the stroke is oblique to the scan.
//
//   node tools/_hand-r12-measure.mjs <png> perp <x> <y>
//   node tools/_hand-r12-measure.mjs <png> perpscan <x0> <y0> <x1> <y1>   (every stroke on a line)
import sharp from 'sharp';

const [file, axis, idxS, aS, bS] = process.argv.slice(2);
const idx = Number(idxS);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
const luma = (x, y) => {
  const i = (y * info.width + x) * C;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};
// bilinear luma, for walking a stroke at an angle
const lumaAt = (x, y) => {
  if (x < 0 || y < 0 || x > info.width - 1 || y > info.height - 1) return 255;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const x1 = Math.min(info.width - 1, x0 + 1), y1 = Math.min(info.height - 1, y0 + 1);
  const L = (px, py) => luma(px, py);
  return (
    L(x0, y0) * (1 - fx) * (1 - fy) + L(x1, y0) * fx * (1 - fy) + L(x0, y1) * (1 - fx) * fy + L(x1, y1) * fx * fy
  );
};
// how far the ink runs from (x,y) in direction (dx,dy) before the paper comes back
const reach = (x, y, dx, dy, thr) => {
  const STEP = 0.2;
  for (let d = 0; d < 60; d += STEP) if (lumaAt(x + dx * d, y + dy * d) > thr) return d;
  return 60;
};
const perpAt = (x, y) => {
  let best = null;
  for (let k = 0; k < 36; k++) {
    const a = (k * Math.PI) / 36, dx = Math.cos(a), dy = Math.sin(a);
    const half = reach(x, y, dx, dy, 130) + reach(x, y, -dx, -dy, 130);
    const core = reach(x, y, dx, dy, 64) + reach(x, y, -dx, -dy, 64);
    if (!best || half < best.half) best = { half, core, deg: Math.round((a * 180) / Math.PI) };
  }
  return best;
};

if (axis === 'perp' || axis === 'perpscan') {
  const seeds = [];
  if (axis === 'perp') seeds.push([Number(idxS), Number(aS)]);
  else {
    // walk the segment and seed once per stroke crossed
    const [x0, y0, x1, y1] = [idxS, aS, bS, process.argv[7]].map(Number);
    const L = Math.hypot(x1 - x0, y1 - y0);
    let inside = false;
    let run = [];
    for (let d = 0; d <= L; d += 0.25) {
      const x = x0 + ((x1 - x0) * d) / L, y = y0 + ((y1 - y0) * d) / L;
      const dark = lumaAt(x, y) <= 130;
      if (dark) run.push([x, y]);
      if (!dark && inside) {
        seeds.push(run[Math.floor(run.length / 2)]);
        run = [];
      }
      inside = dark;
    }
    if (inside && run.length) seeds.push(run[Math.floor(run.length / 2)]);
  }
  console.log(`${file.split('/').pop()}  perpendicular widths, css px  (half coverage / solid core)`);
  for (const [x, y] of seeds) {
    const r = perpAt(x, y);
    console.log(`  at (${x.toFixed(1)}, ${y.toFixed(1)})  half=${r.half.toFixed(2)}px core=${r.core.toFixed(2)}px  normal ${r.deg}deg`);
  }
  process.exit(0);
}

const N = axis === 'row' ? info.width : info.height;
const a = Math.max(0, Number(aS ?? 0));
const b = Math.min(N - 1, Number(bS ?? N - 1));
const at = (k) => (axis === 'row' ? luma(k, idx) : luma(idx, k));

const runs = [];
let s = -1;
for (let k = a; k <= b; k++) {
  const dark = at(k) <= 130;
  if (dark && s < 0) s = k;
  if ((!dark || k === b) && s >= 0) {
    const e = dark ? k : k - 1;
    let core = 0, min = 255;
    for (let j = s; j <= e; j++) {
      const L = at(j);
      if (L <= 64) core++;
      if (L < min) min = L;
    }
    runs.push({ at: s, to: e, half: e - s + 1, core, min: Math.round(min) });
    s = -1;
  }
}
console.log(`${file.split('/').pop()}  ${axis} ${idx}  [${a}..${b}]  ${info.width}x${info.height}`);
for (const r of runs) console.log(`  ${String(r.at).padStart(5)}..${String(r.to).padEnd(5)} half=${r.half}px core=${r.core}px min=${r.min}`);
if (!runs.length) console.log('  (no ink on this line)');
