#!/usr/bin/env node
// scratch (pepe r6): given a directory of frames of one state, report for every consecutive pair
// how many pixels changed inside his figure, and how many changed OUTSIDE the mouth band — the
// critic's test ("across eight frames of one speech only the mouth changes").
//   node tools/_pepe-diff6.mjs <dir> [glob-prefix]
import sharp from 'sharp';
import { readdirSync } from 'node:fs';

const dir = process.argv[2];
const pre = process.argv[3] ?? '';
const files = readdirSync(dir).filter((f) => f.endsWith('.png') && f.startsWith(pre)).sort();
const shots = [];
for (const f of files) {
  const s = await sharp(`${dir}/${f}`).raw().toBuffer({ resolveWithObject: true });
  if (s.info.width < 100) continue;
  shots.push({ f, ...s });
}
const { width: W, height: H, channels: C } = shots[0].info;
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (const s of shots)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * C;
      if (s.data[o + 1] > s.data[o] + 16 && s.data[o + 1] > s.data[o + 2] + 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
x0 = Math.max(0, x0 - 14); y0 = Math.max(0, y0 - 20); x1 = Math.min(W - 1, x1 + 14); y1 = Math.min(H - 1, y1 + 30);
const hy0 = y0 + Math.round((y1 - y0) * 0.10), hy1 = y0 + Math.round((y1 - y0) * 0.36);
const hx0 = x0 + Math.round((x1 - x0) * 0.34), hx1 = x0 + Math.round((x1 - x0) * 0.72);
console.log(`${shots.length} frames; figure box ${x0},${y0} ${x1 - x0}x${y1 - y0}; mouth band ${hx0},${hy0} ${hx1 - hx0}x${hy1 - hy0}`);
// WHERE HE IS, frame by frame. The pixel-diff above counts the ink pass's own boil as motion (every
// contour in the room shivers by a pixel every frame, by design), so it cannot say whether the
// PUPPET moved. These can: the centroid of his green (the head, the hands) and the top and the
// sides of his silhouette. A lean shows up as the head centroid sliding; a breath as the top edge
// rising; a hand as the green centroid swinging out.
{
  const green = [];
  for (const s of shots) {
    let sx = 0, sy = 0, n = 0, top = H, left = W, right = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const o = (y * W + x) * C;
        if (!(s.data[o + 1] > s.data[o] + 16 && s.data[o + 1] > s.data[o + 2] + 16)) continue;
        sx += x; sy += y; n++;
        if (y < top) top = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    green.push({ x: sx / n, y: sy / n, n, top, left, right });
  }
  console.log('frame   green cx      cy     px   headtop  left  right');
  green.forEach((g, i) => console.log(`${String(i).padStart(3)}   ${g.x.toFixed(2)}  ${g.y.toFixed(2)}  ${g.n}   ${g.top}   ${g.left}  ${g.right}`));
  let sum = 0, big = 0;
  for (let i = 1; i < green.length; i++) {
    const d = Math.hypot(green[i].x - green[i - 1].x, green[i].y - green[i - 1].y);
    sum += d;
    if (d > 0.35) big++;
  }
  console.log(`green centroid moves ${(sum / (green.length - 1)).toFixed(2)} px per step on average; a real move on ${big} of ${green.length - 1} steps`);
}
const lum = (d, o) => 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
let moved = 0;
for (let i = 1; i < shots.length; i++) {
  const a = shots[i - 1].data, b = shots[i].data;
  let all = 0, body = 0, n = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const o = (y * W + x) * C;
      n++;
      if (Math.abs(lum(a, o) - lum(b, o)) < 24) continue;
      all++;
      if (x >= hx0 && x <= hx1 && y >= hy0 && y <= hy1) continue;
      body++;
    }
  if (body > 60) moved++;
  console.log(`${shots[i - 1].f} → ${shots[i].f}  changed ${String(all).padStart(5)} (${((100 * all) / n).toFixed(2)}%)   outside the mouth ${String(body).padStart(5)} (${((100 * body) / n).toFixed(2)}%)`);
}
console.log(`the body changes on ${moved} of ${shots.length - 1} steps`);
