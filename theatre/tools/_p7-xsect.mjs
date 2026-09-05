#!/usr/bin/env node
// scratch (pepe r7): the two cross-sections, measured in ONE frame.
//
//  A) HIS SILHOUETTE. A matte of the figure is taken from the depth render (his cards sit on one
//     depth plateau), its boundary is walked, and the composite is sampled along the outward
//     normal from +5 px of paper to -4 px inside him. Reported as the mean grey at each offset.
//  B) THE ROOM'S PEN. Every isolated dark run (paper either side within a pixel) in boxes that
//     hold no part of him, centred on its darkest pixel and averaged the same way.
//
//   node tools/_p7-xsect.mjs <composite.png> <depth.png> [--box x,y,w,h ...] [--room x,y,w,h ...]
import sharp from 'sharp';

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--') && /\.png$/.test(a));
const listOf = (flag) => {
  const out = [];
  for (let i = 0; i < args.length; i++) if (args[i] === flag) out.push(args[i + 1].split(',').map(Number));
  return out;
};
const boxes = listOf('--box');
const rooms = listOf('--room');
const [comp, depth] = files;

const load = async (f) => {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, c = info.channels;
  const l = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) l[i] = 0.299 * data[i * c] + 0.587 * data[i * c + 1] + 0.114 * data[i * c + 2];
  return { l, W, H };
};
const C = await load(comp);
const D = await load(depth);
const { W, H } = C;

// ── A) his silhouette ────────────────────────────────────────────────────────────────────────
// the depth render paints him as one bright plateau; take the mode of the depth inside the boxes
const inBox = (x, y) => boxes.some(([bx, by, bw, bh]) => x >= bx && y >= by && x < bx + bw && y < by + bh);
const hist = new Float64Array(256);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBox(x, y)) hist[Math.round(D.l[y * W + x])]++;
let dm = 0;
for (let i = 1; i < 256; i++) if (hist[i] > hist[dm]) dm = i;
const mask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBox(x, y) && Math.abs(D.l[y * W + x] - dm) <= 12) mask[y * W + x] = 1;

// signed distance by two chamfer passes over the mask, so the normal is smooth
const big = 1e5;
const din = new Float32Array(W * H).fill(big), dout = new Float32Array(W * H).fill(big);
const chamfer = (d, seedIs1) => {
  for (let i = 0; i < W * H; i++) d[i] = (mask[i] === (seedIs1 ? 0 : 1)) ? 0 : big;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (!d[k]) continue;
    let v = d[k];
    if (x > 0) v = Math.min(v, d[k - 1] + 1);
    if (y > 0) v = Math.min(v, d[k - W] + 1, x > 0 ? d[k - W - 1] + 1.414 : big, x < W - 1 ? d[k - W + 1] + 1.414 : big);
    d[k] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const k = y * W + x; if (!d[k]) continue;
    let v = d[k];
    if (x < W - 1) v = Math.min(v, d[k + 1] + 1);
    if (y < H - 1) v = Math.min(v, d[k + W] + 1, x < W - 1 ? d[k + W + 1] + 1.414 : big, x > 0 ? d[k + W - 1] + 1.414 : big);
    d[k] = v;
  }
};
chamfer(din, true);   // distance inside the mask to the outside
chamfer(dout, false); // distance outside the mask to him
const sdf = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) sdf[i] = mask[i] ? -din[i] : dout[i];
const sAt = (x, y) => sdf[Math.max(0, Math.min(H - 1, y | 0)) * W + Math.max(0, Math.min(W - 1, x | 0))];
const cAt = (x, y) => {
  const xi = Math.max(0, Math.min(W - 2, Math.floor(x))), yi = Math.max(0, Math.min(H - 2, Math.floor(y)));
  const fx = x - xi, fy = y - yi;
  const g = (a, b) => C.l[b * W + a];
  return g(xi, yi) * (1 - fx) * (1 - fy) + g(xi + 1, yi) * fx * (1 - fy) + g(xi, yi + 1) * (1 - fx) * fy + g(xi + 1, yi + 1) * fx * fy;
};

// The profile is taken along the outward normal and then RE-CENTRED on its own darkest sample, so
// the mean is a cross-section of the stroke and not a smear of a stroke that wanders a pixel either
// side of the matte's edge. Offsets are then in the room's own convention: 0 = the stroke's core,
// negative = out toward the paper, positive = in toward the fill.
const OFF = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const sum = new Float64Array(OFF.length), cnt = new Float64Array(OFF.length);
let widths = [], cores = [];
for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
  const k = y * W + x;
  if (!mask[k]) continue;
  if (din[k] > 1.5) continue;              // a boundary pixel of the matte
  // outward normal from the gradient of the sdf
  const gx = sAt(x + 1, y) - sAt(x - 1, y), gy = sAt(x, y + 1) - sAt(x, y - 1);
  const len = Math.hypot(gx, gy);
  if (len < 0.4) continue;
  const nx = gx / len, ny = gy / len;      // points OUT of him
  // ignore boundaries that are not against paper: five px out must be light
  if (cAt(x + nx * 5, y + ny * 5) < 200) continue;
  // find the core: the darkest sample within 3 px of the matte's edge
  let best = 1e9, arg = 0;
  for (let t = -30; t <= 30; t++) {
    const s = t / 10;
    const v = cAt(x - nx * s, y - ny * s);
    if (v < best) { best = v; arg = s; }
  }
  if (best > 150) continue;                // no stroke here at all
  const prof = OFF.map((t) => cAt(x - nx * (arg + t), y - ny * (arg + t)));
  for (let i = 0; i < OFF.length; i++) { sum[i] += prof[i]; cnt[i]++; }
  widths.push(prof.filter((v) => v < 150).length);
  cores.push(best);
}
const q = (a, p) => { const s = a.slice().sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
console.log(`HIS SILHOUETTE   n=${cnt[0]}   depth mode ${dm}`);
console.log('  offset  ' + OFF.map((t) => String(t).padStart(6)).join(''));
console.log('  grey    ' + OFF.map((t, i) => (sum[i] / cnt[i]).toFixed(0).padStart(6)).join(''));
console.log(`  dark(<150) width med ${q(widths, 0.5)} p90 ${q(widths, 0.9)}   core lum med ${q(cores, 0.5).toFixed(0)} p90 ${q(cores, 0.9).toFixed(0)}`);

// ── B) the room's pen, same frame ────────────────────────────────────────────────────────────
const rsum = new Float64Array(9), rcnt = new Float64Array(9);
let rw = [], rc = [];
const inRoom = (x, y) => rooms.some(([bx, by, bw, bh]) => x >= bx && y >= by && x < bx + bw && y < by + bh);
const scanLine = (get, n, fixedIsRow, fixed) => {
  let b = 0;
  while (b < n) {
    if (get(b) >= 150) { b++; continue; }
    let e = b, min = 255, arg = b;
    while (e < n && get(e) < 150) { if (get(e) < min) { min = get(e); arg = e; } e++; }
    const before = b > 0 ? get(b - 1) : 255, after = e < n ? get(e) : 255;
    if (before > 200 && after > 200 && e - b <= 8) {
      for (let t = -4; t <= 4; t++) {
        const p = arg + t;
        const v = p < 0 || p >= n ? 248 : get(p);
        rsum[t + 4] += v; rcnt[t + 4]++;
      }
      rw.push(e - b); rc.push(min);
    }
    b = e + 1;
  }
  void fixedIsRow; void fixed;
};
for (const [bx, by, bw, bh] of rooms) {
  for (let y = by; y < by + bh; y++) scanLine((x) => (inRoom(bx + x, y) ? C.l[y * W + bx + x] : 255), bw, true, y);
  for (let x = bx; x < bx + bw; x++) scanLine((y) => (inRoom(x, by + y) ? C.l[(by + y) * W + x] : 255), bh, false, x);
}
console.log(`THE ROOM'S PEN   n=${rcnt[4]}`);
console.log('  offset  ' + [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((t) => String(t).padStart(6)).join(''));
console.log('  grey    ' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (rsum[i] / rcnt[i]).toFixed(0).padStart(6)).join(''));
console.log(`  dark(<150) width med ${q(rw, 0.5)} p90 ${q(rw, 0.9)}   core lum med ${q(rc, 0.5).toFixed(0)} p90 ${q(rc, 0.9).toFixed(0)}`);
