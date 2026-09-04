#!/usr/bin/env node
// The pen probe: how WIDE is the stroke, and how MUCH line is drawn?
//   node tools/_ink-pen.mjs <img> [more...]
// Every image is resized to 1600 px wide and thresholded at <THR (default 150) = ink.
// For every ink pixel, thickness = min(horizontal run, vertical run, the two diagonal runs) through
// it — for a stroke of any orientation the run across it is the narrow one, so the MODE of that
// distribution over the ink is the pen's width in px.
//   ink%     fraction of the frame that is ink
//   width    median / mode thickness in px over ink pixels
//   length   ink area / mode width, as a multiple of the frame width (how much line was drawn)
import sharp from 'sharp';

const W = 1600;
const THR = +(process.env.THR ?? 150);

async function mask(file) {
  const { data, info } = await sharp(file).removeAlpha().resize({ width: W }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = data[i] < THR ? 1 : 0;
  return { m, w, h };
}

// run length through pixel i along direction (dx,dy)
function runs(m, w, h, dx, dy) {
  const out = new Uint16Array(w * h);
  // walk every line of the lattice in this direction
  const seen = new Uint8Array(w * h);
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const si = sy * w + sx;
      if (seen[si]) continue;
      // only start where the previous cell in -d is outside or a different run start
      const px = sx - dx, py = sy - dy;
      if (px >= 0 && px < w && py >= 0 && py < h) continue; // not a line start
      let x = sx, y = sy;
      const idx = [];
      while (x >= 0 && x < w && y >= 0 && y < h) {
        idx.push(y * w + x);
        seen[y * w + x] = 1;
        x += dx; y += dy;
      }
      let s = 0;
      while (s < idx.length) {
        if (!m[idx[s]]) { s++; continue; }
        let e = s;
        while (e < idx.length && m[idx[e]]) e++;
        const L = e - s;
        for (let k = s; k < e; k++) out[idx[k]] = L;
        s = e;
      }
    }
  }
  return out;
}

for (const file of process.argv.slice(2)) {
  const { m, w, h } = await mask(file);
  const rH = runs(m, w, h, 1, 0);
  const rV = runs(m, w, h, 0, 1);
  const rA = runs(m, w, h, 1, 1);
  const rB = runs(m, w, h, 1, -1);
  const S = Math.SQRT2;
  const hist = new Float64Array(64);
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    if (!m[i]) continue;
    const t = Math.min(rH[i], rV[i], rA[i] * S, rB[i] * S);
    hist[Math.min(63, Math.round(t))]++;
    n++;
  }
  // median
  let acc = 0, med = 0;
  for (let k = 0; k < 64; k++) { acc += hist[k]; if (acc >= n * 0.5) { med = k; break; } }
  let mode = 1, mv = 0;
  for (let k = 1; k < 64; k++) if (hist[k] > mv) { mv = hist[k]; mode = k; }
  const inkPct = (n / (w * h)) * 100;
  const lengthFrames = n / mode / w;
  const top = [];
  for (let k = 1; k <= 8; k++) top.push(`${k}:${((hist[k] / n) * 100).toFixed(0)}%`);
  console.log(
    `${file.split('/').pop().padEnd(38)} ${w}x${h}  ink ${inkPct.toFixed(1).padStart(5)}%  width mode ${String(mode).padStart(2)} med ${String(med).padStart(2)}  line length ${lengthFrames.toFixed(0).padStart(4)} × frame width   [${top.join(' ')}]`,
  );
}
