#!/usr/bin/env node
// hand-cutout — HIS HANDS ON THE CLOTH, cut from the user's own drawings.
//
// 2026-09-06 the user drew the two hands the tabletop beats need, from directly overhead, on the
// same plate size as the body poses: public/hand-full.png (palm down, fingers spread — the hand
// that washes, sweeps and squares) and public/hand-pinch.png (thumb and forefinger closed on a
// card's corner). Until now reveal-hand.js DREW those hands in code, which made them the only
// figure in the film that was not the user's; this cuts them instead.
//
//   node tools/hand-cutout.mjs                    # writes public/pepe/hand-*.png + hands.json
//   node tools/hand-cutout.mjs --preview /tmp/h   # …and a contact sheet
//
// It is the SAME MILL as tools/pepe-cutout.mjs --poses, deliberately, and for the same reason: a
// plate that misses any of the room's ink is a second drawing pasted into the first.
//   · the page is keyed (alpha where the drawing has it, a white flood in from the border where it
//     does not — hand-pinch.png is exported over a checker) and everything not the page is him;
//   · the pen is RE-CUT about its own centre line to the weight the room draws at, in either
//     direction, so his line thins or thickens to the door's rather than being resampled;
//   · the fills are re-flattened to the SEATED PALETTE in public/pepe/cutout.json — his greens and
//     his paper, and no others;
//   · the silhouette is COVERAGE with a margin of bare paper outside the contour, so the alpha
//     test's one hard edge falls on paper and never through a mark.
//
// REGISTRATION. Both plates are printed so the drawn hand is `HAND_W` metres across the knuckles,
// which is what puts it just under a card wide on the cloth, and each carries the point of the
// drawing that TOUCHES — the middle fingertip of the splay, the nip of the pinch — because
// reveal-hand.js poses the hand by its contact point and works the wrist and the arm back from it.
import sharp from 'sharp';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? (args[i + 1] ?? true) : null;
};
const PREVIEW = typeof opt('preview') === 'string' ? opt('preview') : null;

const PAGES = {
  // name        page                 how the page is keyed      what touches
  splay: { file: 'hand-full', key: 'alpha', grip: 'tip' },
  pinch: { file: 'hand-pinch', key: 'flood', grip: 'tip' },
};

// The plate, printed at the size it is shown. The hand lies 0.140 m across on the cloth and the
// overhead frame runs about 2000 screen px to the metre at 1600x900, so the drawing is 281 px in
// the widest picture it is ever seen in: 384 px of plate is a third more than that and no more.
const WORK_W = 384;
// The pen, in plate pixels at WORK_W — that is, in the same units the old code-drawn hand used, so
// the cut hand carries exactly the weight the round already accepted for it (reveal-hand.js OUT).
const PEN_CONTOUR = 10.5;
const PEN_INTERIOR = 6.4;
const MISREG = [0.34, -0.26]; // the colour plate under the line, in contour widths (§1.4)
const CELL = 32;

const dir = new URL('../public/', import.meta.url).pathname;
const out = new URL('../public/pepe/', import.meta.url).pathname;
const seated = JSON.parse(readFileSync(out + 'cutout.json', 'utf8'));
const PAL = seated.palette;
const INKC = [13, 14, 13];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---- read a page and key it -------------------------------------------------------------------
// THE PAGE IS KEYED ONCE, AT ITS OWN RESOLUTION, and only then resized. Keying a resized page is
// what turned hand-pinch.png into a 812x840 rectangle on the first cut: lanczos rings along the
// border, the flood found no page to start from, and the whole sheet came through as drawing.
// So: key → keep only the largest connected island (hand-full.png carries a faint rectangular
// frame in its alpha, which came out as a box round the plate) → paint everything else the page's
// own white → resize the flattened page and its mask together.
async function keyPage(file, key) {
  const { data, info } = await sharp(dir + file + '.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const fig = new Uint8Array(N);
  if (key === 'alpha') {
    for (let i = 0; i < N; i++) fig[i] = data[i * 4 + 3] > 96 ? 1 : 0;
  } else {
    // the page is bright and grey (this export's checker is 241 and 247, both of them); the drawing
    // is not, and it is not connected to the border either, which is why this is a flood
    const lum = (i) => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    const pageish = (i) => {
      const o = i * 4;
      const mx = Math.max(data[o], data[o + 1], data[o + 2]), mn = Math.min(data[o], data[o + 1], data[o + 2]);
      return lum(i) > 218 && mx - mn < 20;
    };
    const outside = new Uint8Array(N);
    const st = [];
    for (let x = 0; x < W; x++) { st.push(x, 0); st.push(x, H - 1); }
    for (let y = 0; y < H; y++) { st.push(0, y); st.push(W - 1, y); }
    while (st.length) {
      const y = st.pop(), x = st.pop();
      const i = y * W + x;
      if (outside[i] || !pageish(i)) continue;
      outside[i] = 1;
      if (x > 0) st.push(x - 1, y);
      if (x < W - 1) st.push(x + 1, y);
      if (y > 0) st.push(x, y - 1);
      if (y < H - 1) st.push(x, y + 1);
    }
    for (let i = 0; i < N; i++) fig[i] = outside[i] ? 0 : 1;
  }
  // the largest island, and nothing else
  const lab = new Int32Array(N).fill(-1);
  let best = -1, bestN = 0, next = 0;
  for (let s = 0; s < N; s++) {
    if (!fig[s] || lab[s] >= 0) continue;
    const id = next++;
    const st = [s];
    lab[s] = id;
    let n = 0;
    while (st.length) {
      const i = st.pop();
      n++;
      const x = i % W, y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (fig[q] && lab[q] < 0) { lab[q] = id; st.push(q); }
      }
    }
    if (n > bestN) { bestN = n; best = id; }
  }
  const rgb = new Uint8Array(N * 3);
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const keep = fig[i] && lab[i] === best;
    mask[i] = keep ? 255 : 0;
    const o = i * 4, q = i * 3;
    rgb[q] = keep ? data[o] : 255;
    rgb[q + 1] = keep ? data[o + 1] : 255;
    rgb[q + 2] = keep ? data[o + 2] : 255;
  }
  return { rgb, mask, W, H, N };
}

// how much bare page is laid round every plate before it is measured. The user's hands are drawn
// to the very edge of their sheets — the middle finger is clipped by the top of hand-full.png and
// the cuff runs off the bottom of both — and every distance in the cut is taken from a boundary,
// so there has to be somewhere for "outside" to be.
const PAD = 18;

async function readPage(page, scale) {
  const iW = Math.max(1, Math.round(page.W * scale)), iH = Math.max(1, Math.round(page.H * scale));
  const W = iW + PAD * 2, H = iH + PAD * 2;
  const N = W * H;
  // sharp PROMOTES A ONE-CHANNEL RAW BUFFER TO THREE on the way out, so the stride is read back off
  // the result rather than assumed. Assuming it printed the plate in horizontal stripes — every
  // third row of the mask landing where the fill expected the first.
  const rz = async (buf, ch) => {
    const r = await sharp(Buffer.from(buf.buffer, buf.byteOffset, buf.length), { raw: { width: page.W, height: page.H, channels: ch } })
      .resize(iW, iH, { kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { d: r.data, s: r.info.channels };
  };
  const [rgb, mk] = scale === 1 ? [{ d: page.rgb, s: 3 }, { d: page.mask, s: 1 }] : [await rz(page.rgb, 3), await rz(page.mask, 1)];
  const data = new Uint8Array(N * 4);
  const lum = new Float32Array(N);
  const fig = new Uint8Array(N);
  data.fill(255);
  lum.fill(255);
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let iy = 0; iy < iH; iy++)
    for (let ix = 0; ix < iW; ix++) {
      const j = iy * iW + ix, i = (iy + PAD) * W + (ix + PAD);
      data[i * 4] = rgb.d[j * rgb.s];
      data[i * 4 + 1] = rgb.d[j * rgb.s + 1];
      data[i * 4 + 2] = rgb.d[j * rgb.s + 2];
      lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      fig[i] = mk.d[j * mk.s] > 128 ? 1 : 0;
      if (!fig[i]) continue;
      const x = ix + PAD, y = iy + PAD;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return { data, lum, fig, W, H, N, box: [x0, y0, x1, y1] };
}

// the drawn pen: the median run of dark pixels across a row, inside the figure
function drawnPenOf(p) {
  const runs = [];
  for (let y = p.box[1]; y <= p.box[3]; y += 2) {
    let n = 0;
    for (let x = p.box[0]; x <= p.box[2]; x++) {
      const i = y * p.W + x;
      const dark = p.fig[i] && p.lum[i] < 112;
      if (dark) n++;
      else {
        if (n > 1 && n < 60) runs.push(n);
        n = 0;
      }
    }
  }
  runs.sort((a, b) => a - b);
  return runs.length ? runs[Math.floor(runs.length / 2)] : 6;
}

// A chamfer distance transform: for every pixel where `mask` is 1, how far it is from the nearest
// pixel where it is 0. `oob` is what lies off the edge of the buffer, and it is not one answer for
// both directions. Measuring DEPTH INSIDE something, the page's edge is a real boundary and cuts
// it (oob 0). Measuring how far a pixel is FROM the drawing, it is not: an edge that answers 0
// makes the whole margin of the sheet read as "just outside the drawing", and the plate prints as
// a paper rectangle with a hand somewhere in it — which is what the first cut of these two did,
// alpha 255 in all four corners, and then as a six-pixel frame round the page when it was padded.
const distOf = (mask, W, H, oob = 0) => {
  const N = W * H, d = new Float32Array(N);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? oob : d[x + y * W]);
  for (let i = 0; i < N; i++) d[i] = mask[i] ? 1e6 : 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = x + y * W;
      if (!d[k]) continue;
      d[k] = Math.min(d[k], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const k = x + y * W;
      if (!d[k]) continue;
      d[k] = Math.min(d[k], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  return d;
};
const maxOf = (src, r, W, H) => {
  const N = W * H, tmp = new Float32Array(N), dst = new Float32Array(N);
  const run = (get, set, n) => {
    const q = new Int32Array(n);
    let h = 0, t = 0;
    for (let i = 0; i < n; i++) {
      while (t > h && get(q[t - 1]) <= get(i)) t--;
      q[t++] = i;
      if (q[h] < i - 2 * r) h++;
      if (i >= r) set(i - r, get(q[h]));
    }
    for (let i = n; i < n + r; i++) {
      if (q[h] < i - 2 * r) h++;
      set(i - r, get(q[h]));
    }
  };
  for (let y = 0; y < H; y++) run((i) => src[y * W + i], (i, v) => (tmp[y * W + i] = v), W);
  for (let x = 0; x < W; x++) run((i) => tmp[i * W + x], (i, v) => (dst[i * W + x] = v), H);
  return dst;
};
const blurF = (src, r, W, H) => {
  const N = W * H, tmp = new Float32Array(N), dst = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let a = 0, n = 0;
      for (let k = -r; k <= r; k++) { const xx = x + k; if (xx < 0 || xx >= W) continue; a += src[y * W + xx]; n++; }
      tmp[y * W + x] = a / n;
    }
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      let a = 0, n = 0;
      for (let k = -r; k <= r; k++) { const yy = y + k; if (yy < 0 || yy >= H) continue; a += tmp[yy * W + x]; n++; }
      dst[y * W + x] = a / n;
    }
  return dst;
};
// bleed the colour outward so bilinear never pulls a transparent fringe into the silhouette
function bleed(buf, W, H) {
  const src = buf.slice();
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        if (buf[o + 3] > 4) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const q = (yy * W + xx) * 4;
            if (src[q + 3] <= 4) continue;
            r += src[q];
            g += src[q + 1];
            b += src[q + 2];
            n++;
          }
        if (!n) continue;
        buf[o] = r / n;
        buf[o + 1] = g / n;
        buf[o + 2] = b / n;
      }
    src.set(buf);
  }
}

// THE TWO DRAWINGS ARE ONE PAIR OF HANDS, so they cannot both be printed the same width across:
// a closed hand IS narrower than a spread one, and scaling them to a common width would make the
// pinch a giant. They are registered on the CUFF instead — the white band at the wrist, the one
// thing both drawings have and the one thing that does not change when the fingers move.
function cuffWidth(p) {
  const y0 = p.box[3] - Math.round((p.box[3] - p.box[1]) * 0.09);
  let w = 0;
  for (let y = y0; y <= p.box[3]; y++) {
    let a = p.W, b = -1;
    for (let x = 0; x < p.W; x++) if (p.fig[y * p.W + x]) { if (x < a) a = x; if (x > b) b = x; }
    if (b >= 0 && b - a + 1 > w) w = b - a + 1;
  }
  return w;
}

// ---- pass 1: key and measure every page at its own resolution ----------------------------------
const M = {};
for (const [name, spec] of Object.entries(PAGES)) {
  const page = await keyPage(spec.file, spec.key);
  const p0 = await readPage(page, 1);
  M[name] = { page, w: p0.box[2] - p0.box[0] + 1, h: p0.box[3] - p0.box[1] + 1, cuff: cuffWidth(p0), pen: drawnPenOf(p0) };
  console.log(`page ${spec.file.padEnd(12)} ${p0.W}x${p0.H} figure ${M[name].w}x${M[name].h} cuff ${M[name].cuff} pen ${M[name].pen}`);
}
const K0 = WORK_W / M.splay.w; // the splay hand sets the scale: HAND.w metres across the drawing
const scaleOf = (n) => (n === 'splay' ? K0 : K0 * (M.splay.cuff / M[n].cuff));

// ---- pass 2: cut --------------------------------------------------------------------------------
const plates = {};
const tiles = [];
for (const [name, spec] of Object.entries(PAGES)) {
  const page = M[name].page;
  const pen0 = M[name].pen;
  const k = scaleOf(name);
  const p = await readPage(page, k);
  const W = p.W, H = p.H, N = p.N;
  const drawnPen = Math.max(1.6, pen0 * k);
  const HALF_IN = PEN_INTERIOR / 2;
  const HALF_OUT = PEN_CONTOUR / 2;
  const OUTER = drawnPen * 1.1;
  const ALPHA_AA = Math.max(1.0, drawnPen * 0.43);
  const DILATE = HALF_OUT - drawnPen / 2 + drawnPen * 0.38;
  console.log(`cut  ${spec.file.padEnd(12)} k=${k.toFixed(4)} drawn pen ${pen0} → ${drawnPen.toFixed(2)} plate px, re-cut to ${PEN_CONTOUR}/${PEN_INTERIOR}`);

  const CLS = new Uint8Array(N), penMask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!p.fig[i]) continue;
    const o = i * 4, r = p.data[o], gg = p.data[o + 1], b = p.data[o + 2];
    penMask[i] = p.lum[i] < 112 ? 1 : 0;
    if (gg > r + 16 && gg > b + 16) CLS[i] = 2; // his green
    else if (r > gg + 34 && r > b + 24 && r > 110) CLS[i] = 3; // the red of the lips — never here
    else CLS[i] = 1; // paper: the cuff
  }
  // the pen, re-cut about its own centre line, in either direction
  const dIn = distOf(penMask, W, H);
  const notPen = new Uint8Array(N);
  for (let i = 0; i < N; i++) notPen[i] = 1 - penMask[i];
  const dOutPen = distOf(notPen, W, H, 1e6);
  const R = maxOf(dIn, Math.ceil(drawnPen * 0.85), W, H);
  const notFig = new Uint8Array(N);
  for (let i = 0; i < N; i++) notFig[i] = 1 - p.fig[i];
  const dA = distOf(p.fig, W, H);
  const dOutFig = distOf(notFig, W, H, 1e6);
  const sdRaw = new Float32Array(N);
  for (let i = 0; i < N; i++) sdRaw[i] = p.fig[i] ? dA[i] : -dOutFig[i];
  const sd = blurF(sdRaw, 1, W, H);
  const ALPHA = new Float32Array(N), INKA = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    ALPHA[i] = clamp01((sd[i] + DILATE) / ALPHA_AA + 0.5);
    if (ALPHA[i] <= 0) continue;
    const t = penMask[i] ? dIn[i] : -dOutPen[i];
    const Rl = R[i] > 0 ? R[i] : drawnPen / 2;
    const c = Rl - t;
    const hw = dA[i] < OUTER ? HALF_OUT : HALF_IN;
    INKA[i] = clamp01((hw - c) / 1.4 + 0.5);
  }

  const MDX = Math.max(1, Math.round(MISREG[0] * PEN_CONTOUR)), MDY = Math.round(MISREG[1] * PEN_CONTOUR);
  const fillAt = (i) => {
    const x = i % W, y = (i - x) / W;
    const sx = Math.min(W - 1, Math.max(0, x - MDX)), sy = Math.min(H - 1, Math.max(0, y - MDY));
    const j = sx + sy * W;
    const c = p.fig[j] ? CLS[j] : CLS[i];
    return c === 2 ? PAL.green[0] : c === 3 ? PAL.red : PAL.paper;
  };
  const buf = new Uint8Array(N * 4);
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let i = 0; i < N; i++) {
    const a = ALPHA[i];
    if (a <= 0.002) continue;
    const f = fillAt(i), c = INKA[i], o = i * 4;
    buf[o] = f[0] + (INKC[0] - f[0]) * c;
    buf[o + 1] = f[1] + (INKC[1] - f[1]) * c;
    buf[o + 2] = f[2] + (INKC[2] - f[2]) * c;
    buf[o + 3] = Math.round(a * 255);
    const x = i % W, y = (i - x) / W;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const cx0 = Math.max(0, x0 - 2), cy0 = Math.max(0, y0 - 2), cw = Math.min(W, x1 + 3) - cx0, ch = Math.min(H, y1 + 3) - cy0;
  const crop = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) crop.set(buf.subarray(((y + cy0) * W + cx0) * 4, ((y + cy0) * W + cx0 + cw) * 4), y * cw * 4);
  bleed(crop, cw, ch);

  // THE CONTACT POINT, in the finished plate's own pixels: the tip of whatever reaches furthest up
  // the page — the middle finger of the splay, the closed nip of the pinch — brought back down the
  // finger by a fourteenth of the plate so it lands on the PAD and not on the extreme edge of the
  // line, which is where a fingertip actually touches a table.
  let tipY = ch;
  for (let y = 0; y < ch && tipY === ch; y++) for (let x = 0; x < cw; x++) if (crop[(y * cw + x) * 4 + 3] > 140) { tipY = y; break; }
  const band = Math.max(2, Math.round(ch * 0.045));
  let sx = 0, sn = 0;
  for (let y = tipY; y < Math.min(ch, tipY + band); y++) for (let x = 0; x < cw; x++) if (crop[(y * cw + x) * 4 + 3] > 140) { sx += x; sn++; }
  const grip = [Math.round(sn ? sx / sn : cw / 2), Math.round(tipY + ch * 0.072)];
  // AND THE MIDDLE OF THE PALM, which is what a hand pushing cards about a table is posed by: the
  // deepest point inside the silhouette, above the cuff. On a splayed hand that is squarely in the
  // middle of the back of the hand — the fingers and the thumb are all too narrow to win it.
  const solid = new Uint8Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) solid[i] = crop[i * 4 + 3] > 140 ? 1 : 0;
  const dp = distOf(solid, cw, ch);
  let pd = -1, palm = [Math.round(cw / 2), Math.round(ch / 2)];
  for (let y = 0; y < Math.round(ch * 0.86); y++)
    for (let x = 0; x < cw; x++) if (dp[y * cw + x] > pd) { pd = dp[y * cw + x]; palm = [x, y]; }

  // the cells the mesh is built from — the plate is a silhouette, not a card
  const cols = Math.ceil(cw / CELL), rows = Math.ceil(ch / CELL);
  const occ = new Uint8Array(cols * rows);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (crop[(y * cw + x) * 4 + 3] > 8) occ[Math.floor(y / CELL) * cols + Math.floor(x / CELL)] = 1;
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let any = 0;
      for (let dr = -1; dr <= 1 && !any; dr++) for (let dc = -1; dc <= 1 && !any; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && occ[rr * cols + cc]) any = 1;
      }
      if (any) cells.push(c, r);
    }

  const info = await sharp(Buffer.from(crop.buffer, crop.byteOffset, crop.length), { raw: { width: cw, height: ch, channels: 4 } })
    .png({ compressionLevel: 9, effort: 8 })
    .toFile(out + `hand-${name}.png`);
  let inkPx = 0, figPx = 0;
  for (let i = 0; i < N; i++) if (ALPHA[i] > 0.8) { figPx++; if (INKA[i] > 0.8) inkPx++; }
  plates[name] = { file: `hand-${name}.png`, page: spec.file, w: cw, h: ch, grip, palm, cell: CELL, cells, scale: +k.toFixed(5), drawnPen: +drawnPen.toFixed(2) };
  console.log(`plate ${name.padEnd(6)} ${cw}x${ch} tip ${JSON.stringify(grip)} palm ${JSON.stringify(palm)} (r=${pd.toFixed(0)}px)  ink ${((100 * inkPx) / figPx).toFixed(1)}%  ${(info.size / 1024).toFixed(0)}KB`);
  if (PREVIEW) tiles.push({ name, crop, cw, ch, grip, palm });
}

const manifest = {
  source: "the user's overhead hand drawings, public/hand-full.png and public/hand-pinch.png",
  workW: WORK_W,
  pen: { contour: PEN_CONTOUR, interior: PEN_INTERIOR },
  note: 'reveal-hand.js carries these numbers as PLATES; re-run this tool and paste them if a drawing changes',
  plates,
};
writeFileSync(out + 'hands.json', JSON.stringify(manifest, null, 1));
console.log('wrote hands.json');
console.log('\nfor reveal-hand.js:');
for (const [n, p] of Object.entries(plates)) console.log(`  ${n}: { file: '/pepe/${p.file}', w: ${p.w}, h: ${p.h}, tip: [${p.grip}], palm: [${p.palm}] },`);

if (PREVIEW) {
  mkdirSync(PREVIEW, { recursive: true });
  const HH = Math.max(...tiles.map((t) => t.ch)) + 40;
  let x = 20;
  const comps = [];
  for (const t of tiles) {
    // a cross on the contact point, so the registration is looked at rather than trusted
    for (const [pt, col] of [[t.grip, [220, 30, 30]], [t.palm, [30, 60, 220]]])
      for (let d = -7; d <= 7; d++)
        for (const [px, py] of [[pt[0] + d, pt[1]], [pt[0], pt[1] + d]]) {
          if (px < 0 || py < 0 || px >= t.cw || py >= t.ch) continue;
          const o = (py * t.cw + px) * 4;
          t.crop[o] = col[0]; t.crop[o + 1] = col[1]; t.crop[o + 2] = col[2]; t.crop[o + 3] = 255;
        }
    comps.push({ input: Buffer.from(t.crop.buffer, t.crop.byteOffset, t.crop.length), raw: { width: t.cw, height: t.ch, channels: 4 }, left: x, top: 20 });
    x += t.cw + 30;
  }
  await sharp({ create: { width: x + 20, height: HH, channels: 4, background: '#f4f0e4' } }).composite(comps).png().toFile(PREVIEW + '/hands.png');
  console.log('preview → ' + PREVIEW + '/hands.png');
}
