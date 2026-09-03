// PIECE: props — the drawn patterns that live on the props' surfaces: bottle labels, book
// spines, the pictures inside the frames, the rug's border, the curtain lines, the radio's
// grille and dial, the clock face, the signs' lettering. Every letter in this file is drawn
// stroke by stroke with the pen (penText); no system font enters the drawn world. Tone is
// either solid ink (a black bottle, a mat, a coat) or bare paper; the ink pass adds outlines.
import * as THREE from 'three';
import { INK, PAPER, drawTexture, paper, inkLine, inkRect, hatch, crossHatch, dashes } from '../core/strokes.js';

const LABEL_PAPER = '#f9f6ee';

// ---- small pen helpers ---------------------------------------------------------------------
export function stroke(g, pts, { width = 2, wobble = 0.8, rng = Math.random, color = INK, alpha = 1, close = false } = {}) {
  const p = close ? [...pts, pts[0]] : pts;
  for (let i = 0; i < p.length - 1; i++) inkLine(g, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], { width, wobble, rng, color, alpha });
}
export function ring(g, cx, cy, r, opts = {}) {
  const rng = opts.rng ?? Math.random;
  const n = opts.n ?? Math.max(10, Math.round(r / 2.5));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (opts.start ?? 0);
    const rr = r * (1 + (rng() - 0.5) * (opts.wob ?? 0.04));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (opts.squash ?? 1)]);
  }
  stroke(g, pts, { ...opts, close: true, wobble: opts.wobble ?? 0.5 });
}
export function arc(g, cx, cy, r, a0, a1, opts = {}) {
  const n = opts.n ?? Math.max(6, Math.round((Math.abs(a1 - a0) * r) / 4));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (opts.squash ?? 1)]);
  }
  stroke(g, pts, { ...opts, wobble: opts.wobble ?? 0.5 });
}
export function dot(g, cx, cy, r, color = INK) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
export function fillPoly(g, pts, color) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
  g.restore();
}
function quad(p0, c, p1, n = 10) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * p0[0] + 2 * s * t * c[0] + t * t * p1[0], s * s * p0[1] + 2 * s * t * c[1] + t * t * p1[1]]);
  }
  return out;
}
function arc_(cx, cy, r, a0, a1, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
function star(g, cx, cy, r, opts) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  stroke(g, pts, { ...opts, close: true });
}
function starPoly(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}
function sparkle(g, cx, cy, r, opts) {
  inkLine(g, cx - r, cy, cx + r, cy, opts);
  inkLine(g, cx, cy - r, cx, cy + r, opts);
}

// ---- the pen alphabet ----------------------------------------------------------------------
// Upright sans caps, each glyph a few polylines in a cell 14 tall (0 = cap line, 14 = baseline).
const ell = (cx, cy, rx, ry, n = 14) => {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return p;
};
const GLYPHS = {
  A: [10, [[[0, 14], [5, 0], [10, 14]], [[2, 9.5], [8, 9.5]]]],
  B: [9, [[[0, 14], [0, 0], [6, 0], [8, 1.5], [8, 5], [6, 7], [0, 7]], [[0, 7], [7, 7], [9, 9], [9, 12], [7, 14], [0, 14]]]],
  C: [10, [[[10, 3], [8, 0.5], [5, 0], [2, 1.5], [0, 5], [0, 9], [2, 12.5], [5, 14], [8, 13.5], [10, 11]]]],
  D: [10, [[[0, 14], [0, 0], [5, 0], [9, 2.5], [10, 7], [9, 11.5], [5, 14], [0, 14]]]],
  E: [9, [[[9, 0], [0, 0], [0, 14], [9, 14]], [[0, 7], [7, 7]]]],
  F: [9, [[[9, 0], [0, 0], [0, 14]], [[0, 7], [7, 7]]]],
  G: [10, [[[10, 3], [8, 0.5], [5, 0], [2, 1.5], [0, 5], [0, 9], [2, 12.5], [5, 14], [8, 13.5], [10, 11], [10, 8], [6, 8]]]],
  H: [10, [[[0, 0], [0, 14]], [[10, 0], [10, 14]], [[0, 7], [10, 7]]]],
  I: [3, [[[1.5, 0], [1.5, 14]]]],
  J: [8, [[[8, 0], [8, 10], [7, 13], [4, 14], [1, 13], [0, 10]]]],
  K: [10, [[[0, 0], [0, 14]], [[10, 0], [0, 8.5]], [[3.5, 6], [10, 14]]]],
  L: [9, [[[0, 0], [0, 14], [9, 14]]]],
  M: [12, [[[0, 14], [0, 0], [6, 10], [12, 0], [12, 14]]]],
  N: [10, [[[0, 14], [0, 0], [10, 14], [10, 0]]]],
  O: [11, [ell(5.5, 7, 5.5, 7)]],
  P: [9, [[[0, 14], [0, 0], [6, 0], [9, 2], [9, 5], [6, 7.5], [0, 7.5]]]],
  Q: [11, [ell(5.5, 7, 5.5, 7), [[7, 10], [11.5, 15]]]],
  R: [10, [[[0, 14], [0, 0], [6, 0], [9, 2], [9, 5], [6, 7.5], [0, 7.5]], [[4, 7.5], [10, 14]]]],
  S: [9, [[[9, 3], [7, 0.5], [4, 0], [1, 1.5], [0.5, 4], [2, 6.5], [7, 8], [9, 10], [8.5, 12.5], [5, 14], [2, 13.5], [0, 11]]]],
  T: [10, [[[0, 0], [10, 0]], [[5, 0], [5, 14]]]],
  U: [10, [[[0, 0], [0, 10], [1.5, 13], [5, 14], [8.5, 13], [10, 10], [10, 0]]]],
  V: [10, [[[0, 0], [5, 14], [10, 0]]]],
  W: [14, [[[0, 0], [3.5, 14], [7, 3], [10.5, 14], [14, 0]]]],
  X: [10, [[[0, 0], [10, 14]], [[10, 0], [0, 14]]]],
  Y: [10, [[[0, 0], [5, 7.5], [10, 0]], [[5, 7.5], [5, 14]]]],
  Z: [10, [[[0, 0], [10, 0], [0, 14], [10, 14]]]],
  0: [9, [ell(4.5, 7, 4.5, 7)]],
  1: [6, [[[1, 3], [4, 0], [4, 14]]]],
  2: [9, [[[0, 3], [2, 0.5], [6, 0], [9, 2.5], [9, 5], [0, 14], [9, 14]]]],
  3: [9, [[[0, 1], [4, 0], [8, 1], [9, 3.5], [7, 6.5], [4, 7]], [[4, 7], [8, 7.5], [9, 10.5], [8, 13], [4, 14], [0, 12.5]]]],
  4: [10, [[[7, 14], [7, 0], [0, 10], [10, 10]]]],
  5: [9, [[[9, 0], [1, 0], [0, 6.5], [5, 5.5], [9, 8], [9, 11], [7, 14], [2, 14], [0, 12]]]],
  6: [9, [[[8, 1], [5, 0], [1.5, 2.5], [0, 8], [1, 12.5], [4.5, 14], [8, 12.5], [9, 9.5], [7, 7], [3, 7], [0.5, 9]]]],
  7: [9, [[[0, 0], [9, 0], [3, 14]]]],
  8: [9, [ell(4.5, 3.5, 3.5, 3.5, 10), ell(4.5, 10, 4.5, 4, 12)]],
  9: [9, [[[1, 13], [4, 14], [7.5, 11.5], [9, 6], [8, 1.5], [4.5, 0], [1, 1.5], [0, 4.5], [2, 7], [6, 7], [8.5, 5]]]],
  ' ': [5, []],
  '.': [3, [[[1.5, 12.5], [1.5, 14]]]],
  ',': [3, [[[1.8, 12.5], [1, 16]]]],
  '·': [3, [[[1.5, 6.5], [1.5, 8]]]],
  '-': [7, [[[1, 7], [6, 7]]]],
  '—': [12, [[[0, 7], [12, 7]]]],
  "'": [3, [[[1.8, 0], [1.2, 3]]]],
  '!': [3, [[[1.5, 0], [1.5, 10]], [[1.5, 12.5], [1.5, 14]]]],
  '&': [11, [[[10, 14], [2, 5], [2, 2], [4, 0], [6, 2], [5, 5], [0, 10], [1, 13], [4, 14], [7, 12], [10, 8]]]],
  '/': [8, [[[0, 14], [8, 0]]]],
  ':': [3, [[[1.5, 4], [1.5, 5.5]], [[1.5, 11], [1.5, 12.5]]]],
  '°': [4, [ell(2, 1.5, 1.5, 1.5, 8)]],
  '(': [5, [[[4, 0], [1.5, 3], [1, 7], [1.5, 11], [4, 14]]]],
  ')': [5, [[[1, 0], [3.5, 3], [4, 7], [3.5, 11], [1, 14]]]],
  '?': [8, [[[0, 3], [2, 0.5], [6, 0], [8, 2.5], [7, 5], [4, 7], [4, 10]], [[4, 12.5], [4, 14]]]],
};
const normalize = (text) =>
  String(text)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
export function penWidth(text, size, tracking = 0.18) {
  const chars = [...normalize(text)];
  const s = size / 14;
  let w = 0;
  chars.forEach((ch, i) => {
    w += (GLYPHS[ch] ?? GLYPHS['?'])[0] * s + (i < chars.length - 1 ? tracking * size : 0);
  });
  return w;
}
// Hand-lettered caps: `size` is the cap height in px; the pen's weight follows the size unless
// given; each letter drifts a pixel or two and leans a hair so no two are alike.
export function penText(g, text, x, y, { size = 20, weight = null, rng = Math.random, tracking = 0.18, align = 'center', color = INK, drift = 0.06, alpha = 1, baseline = 'middle' } = {}) {
  const chars = [...normalize(text)];
  const s = size / 14;
  const w = weight ?? Math.max(1.1, size * 0.15);
  const total = penWidth(text, size, tracking);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const top = baseline === 'middle' ? y - size / 2 : baseline === 'top' ? y : y - size;
  const wob = Math.max(0.3, size * 0.035);
  for (const ch of chars) {
    const [adv, lines] = GLYPHS[ch] ?? GLYPHS['?'];
    const dx = (rng() - 0.5) * 2 * drift * size, dy = (rng() - 0.5) * 2 * drift * size;
    const sc = s * (0.96 + rng() * 0.08);
    const lean = (rng() - 0.5) * 0.06;
    for (const pl of lines) {
      for (let i = 0; i < pl.length - 1; i++) {
        const [ax, ay] = pl[i], [bx, by] = pl[i + 1];
        inkLine(g, cx + dx + (ax + lean * (14 - ay)) * sc, top + dy + ay * sc, cx + dx + (bx + lean * (14 - by)) * sc, top + dy + by * sc, { width: w, wobble: wob, rng, color, alpha });
      }
    }
    cx += adv * s + tracking * size;
  }
}
// Fit a size so `text` spans at most maxW.
export function penFit(text, size, maxW, tracking = 0.18) {
  const w = penWidth(text, size, tracking);
  return w > maxW ? size * (maxW / w) : size;
}

// ---- solid ink (a 1-colour texture for black masses) --------------------------------------
let _solid = null;
export function solidTexture() {
  if (_solid) return _solid;
  _solid = drawTexture(
    8,
    8,
    (g, W, H) => {
      g.fillStyle = INK;
      g.fillRect(0, 0, W, H);
    },
    { seed: 1 },
  );
  return _solid;
}
export function darkFill(g, x, y, w, h, rng, spacing = 5) {
  hatch(g, x, y, w, h, { angle: Math.PI / 4, spacing, width: 2, wobble: 0.5, broken: 0, rng, alpha: 0.95, jitter: 0.8 });
  hatch(g, x, y, w, h, { angle: -Math.PI / 4, spacing, width: 2, wobble: 0.5, broken: 0, rng, alpha: 0.9, jitter: 0.8 });
}
export function darkTexture(seed = 27) {
  return drawTexture(
    128,
    128,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      darkFill(g, -4, -4, W + 8, H + 8, rng, 5);
    },
    { repeat: [3, 3], seed },
  );
}

// ---- bottle / jar labels ----------------------------------------------------------------------
// A wrap-around texture for a lathe (front = u 0.5, v = 0 at the bottom). A dark bottle is solid
// ink with the label left as a paper rectangle; a glass bottle is paper with one diagonal stroke.
export function labelTexture({ lines = ['VIN'], uRange = [0.3, 0.7], vRange = [0.3, 0.6], bodyV = null, seed = 1, w = 256, h = 512, dark = false, shape = 'rect', glassStroke = true, lidV = null }) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      if (dark) {
        g.fillStyle = INK;
        g.fillRect(0, 0, W, H);
      }
      if (lidV != null) {
        g.fillStyle = INK;
        g.fillRect(0, 0, W, (1 - lidV) * H + 2);
      }
      if (!dark && glassStroke && bodyV) {
        // the one highlight stroke the film gives a glass bottle, left of centre
        const yt = (1 - bodyV[1]) * H, yb = (1 - bodyV[0]) * H;
        inkLine(g, W * 0.39, yt + (yb - yt) * 0.08, W * 0.415, yb - (yb - yt) * 0.12, { width: Math.max(3, W * 0.014), wobble: 1.2, rng });
      }
      const x0 = uRange[0] * W, x1 = uRange[1] * W;
      const y0 = (1 - vRange[1]) * H, y1 = (1 - vRange[0]) * H;
      const lw = x1 - x0, lh = y1 - y0;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const o = { width: Math.max(2, lw * 0.022), wobble: 0.9, rng };
      if (shape === 'oval') {
        g.fillStyle = LABEL_PAPER;
        g.beginPath();
        g.ellipse(cx, cy, lw / 2, lh / 2, 0, 0, Math.PI * 2);
        g.fill();
        ring(g, cx, cy, lw / 2 - 4, { ...o, squash: (lh - 8) / (lw - 8), n: 40 });
      } else if (shape === 'band') {
        g.fillStyle = LABEL_PAPER;
        g.fillRect(0, y0, W, lh);
        inkLine(g, 0, y0 + 3, W, y0 + 3, o);
        inkLine(g, 0, y1 - 3, W, y1 - 3, o);
      } else {
        g.fillStyle = LABEL_PAPER;
        g.fillRect(x0, y0, lw, lh);
        inkRect(g, x0 + 4, y0 + 4, lw - 8, lh - 8, { ...o, overshoot: 1 });
      }
      // the name: 3–6 caps drawn with the pen, filling the label
      const n = lines.length;
      let size = lh * (n === 1 ? 0.44 : 0.3);
      for (const t of lines) size = penFit(t, size, lw * 0.78, 0.14);
      const weight = Math.max(1.6, size * 0.17);
      if (n === 1) {
        penText(g, lines[0], cx, cy - (lh > size * 3 ? size * 0.2 : 0), { size, weight, rng, tracking: 0.14 });
        if (lh > size * 3) inkLine(g, cx - lw * 0.22, cy + size * 0.75, cx + lw * 0.22, cy + size * 0.75, { width: weight * 0.8, wobble: 0.6, rng });
      } else {
        penText(g, lines[0], cx, cy - size * 0.7, { size, weight, rng, tracking: 0.14 });
        penText(g, lines[1], cx, cy + size * 0.7, { size, weight, rng, tracking: 0.14 });
      }
    },
    { seed },
  );
}

// ---- book spines ------------------------------------------------------------------------------
export function spineTexture({ title, seed = 1, vertical = true, w = 64, h = 256, dark = false }) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      const L = vertical ? H : W, T = vertical ? W : H;
      // draw in "spine space": x along the spine, y across it
      g.save();
      if (vertical) {
        g.translate(W, 0);
        g.rotate(Math.PI / 2);
      }
      if (dark) {
        g.fillStyle = INK;
        g.fillRect(-2, -2, L + 4, T + 4);
        // a paper label band with the title, and two paper rules for the raised bands
        g.fillStyle = LABEL_PAPER;
        g.fillRect(L * 0.34, T * 0.14, L * 0.32, T * 0.72);
        for (const u of [0.1, 0.9]) inkLine(g, u * L, 2, u * L, T - 2, { width: 2.2, wobble: 0.5, rng, color: LABEL_PAPER });
        const size = penFit(title, T * 0.42, L * 0.28, 0.1);
        penText(g, title, L * 0.5, T * 0.5, { size, weight: Math.max(1.4, size * 0.16), rng, tracking: 0.1 });
      } else {
        const o = { width: 2, wobble: 0.5, rng };
        for (const u of [0.08, 0.15, 0.85, 0.92]) inkLine(g, u * L, 3, u * L, T - 3, o);
        const size = penFit(title, T * 0.5, L * 0.6, 0.12);
        penText(g, title, L * 0.5, T * 0.5, { size, weight: Math.max(1.4, size * 0.16), rng, tracking: 0.12 });
      }
      g.restore();
    },
    { seed },
  );
}
export function pagesTexture(seed = 2) {
  return drawTexture(
    128,
    128,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f5ee', { grain: 0, seed });
      hatch(g, 0, 0, W, H, { angle: 0, spacing: 3.2, width: 0.8, wobble: 0.3, broken: 0, rng, alpha: 0.55, jitter: 0.6 });
    },
    { repeat: [2, 1], seed },
  );
}
export function clothTexture(seed = 3) {
  return drawTexture(
    128,
    128,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      hatch(g, 0, 0, W, H, { angle: Math.PI / 4, spacing: 9, width: 0.7, wobble: 0.4, broken: 0.4, rng, alpha: 0.28 });
    },
    { repeat: [3, 3], seed },
  );
}
export function stripeTexture(seed = 33) {
  return drawTexture(
    64,
    128,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      g.fillStyle = INK;
      for (let y = 0; y < H; y += 32) g.fillRect(0, y + 8 + (rng() - 0.5) * 3, W, 14);
    },
    { repeat: [1, 3], seed },
  );
}
export function woodTexture(seed = 4) {
  return drawTexture(
    256,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      for (let i = 0; i < 9; i++) {
        const y = 10 + i * 27 + rng() * 8;
        inkLine(g, 0, y, W, y + (rng() - 0.5) * 10, { width: 0.8, wobble: 1.4, rng, alpha: 0.22 });
      }
    },
    { repeat: [2, 2], seed },
  );
}

// ---- the pictures in the frames: each one subject, solid where the film would be solid ------
const PICTURES = {
  hand(g, rng, s) {
    const o = { width: 2.4, wobble: 0.9, rng };
    hatch(g, 0, 0, 100 * s, 100 * s, { angle: Math.PI / 2, spacing: 5 * s, width: 1.2, wobble: 0.6, broken: 0.35, rng, alpha: 0.75 });
    const P = [[34, 98], [30, 72], [22, 58], [11, 50], [8, 43], [15, 39], [27, 47], [32, 42], [31, 18], [37, 12], [43, 19], [44, 40], [46, 10], [52, 5], [58, 11], [57, 38], [61, 15], [67, 12], [71, 18], [69, 42], [75, 30], [81, 29], [83, 36], [76, 54], [70, 72], [66, 98]];
    const pts = P.map(([x, y]) => [x * s, y * s]);
    fillPoly(g, pts, LABEL_PAPER);
    stroke(g, pts, { ...o, close: true });
    stroke(g, quad([31 * s, 62 * s], [40 * s, 80 * s], [46 * s, 98 * s]), { ...o, width: 1.6 });
    stroke(g, quad([28 * s, 56 * s], [50 * s, 62 * s], [72 * s, 60 * s]), { ...o, width: 1.6 });
    stroke(g, quad([36 * s, 49 * s], [55 * s, 51 * s], [70 * s, 70 * s]), { ...o, width: 1.6 });
    for (const [x, y] of [[16, 22], [86, 16], [88, 74]]) sparkle(g, x * s, y * s, 4 * s, { width: 1.6, wobble: 0.3, rng });
  },
  moon(g, rng, s) {
    // a paper crescent and paper stars cut out of a solid night
    g.fillStyle = INK;
    g.fillRect(0, 0, 100 * s, 100 * s);
    const cx = 52 * s, cy = 50 * s, r = 34 * s;
    const a = 1.25;
    const tipA = [cx + Math.cos(-a) * r, cy + Math.sin(-a) * r], tipB = [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const cres = [...arc_(cx, cy, r, -a, a, 18), ...quad(tipB, [cx - r * 0.5, cy], tipA, 12)];
    fillPoly(g, cres, LABEL_PAPER);
    dot(g, cx + 12 * s, cy - 8 * s, 2.2 * s);
    stroke(g, quad([cx + 6 * s, cy + 4 * s], [cx + 16 * s, cy + 8 * s], [cx + 6 * s, cy + 12 * s]), { width: 1.8, wobble: 0.6, rng });
    for (const [x, y, r2] of [[18, 18, 5], [24, 80, 4], [10, 50, 3.5], [82, 12, 3], [88, 84, 4]]) fillPoly(g, starPoly(x * s, y * s, r2 * s), LABEL_PAPER);
    for (const [x, y] of [[40, 8], [90, 40], [70, 92], [6, 90]]) dot(g, x * s, y * s, 1.4 * s, LABEL_PAPER);
  },
  portrait(g, rng, s) {
    const o = { width: 2.4, wobble: 0.9, rng };
    hatch(g, 0, 0, 100 * s, 100 * s, { angle: Math.PI / 2, spacing: 6 * s, width: 1, wobble: 0.6, broken: 0.4, rng, alpha: 0.4 });
    // shoulders: a solid jacket with a paper collar
    const jacket = [[6, 100], [14, 74], [34, 64], [50, 68], [66, 64], [86, 74], [94, 100]];
    fillPoly(g, jacket.map(([x, y]) => [x * s, y * s]), INK);
    fillPoly(g, [[40, 66], [50, 84], [60, 66], [50, 62]].map(([x, y]) => [x * s, y * s]), LABEL_PAPER);
    // the face
    const face = [];
    for (let i = 0; i <= 24; i++) {
      const t = -Math.PI / 2 + (i / 24) * Math.PI * 2;
      face.push([50 * s + Math.cos(t) * 19 * s, 40 * s + Math.sin(t) * 24 * s]);
    }
    fillPoly(g, face, LABEL_PAPER);
    stroke(g, face, { ...o, close: true });
    // solid hair
    fillPoly(g, [[30, 34], [32, 20], [40, 12], [52, 10], [64, 13], [70, 22], [70, 34], [64, 26], [52, 22], [40, 26], [34, 36]].map(([x, y]) => [x * s, y * s]), INK);
    dot(g, 43 * s, 40 * s, 2 * s);
    dot(g, 57 * s, 40 * s, 2 * s);
    stroke(g, [[50 * s, 40 * s], [47 * s, 50 * s], [52 * s, 51 * s]], { ...o, width: 1.6 });
    inkLine(g, 45 * s, 57 * s, 55 * s, 57 * s, { ...o, width: 1.8 });
    stroke(g, [[44 * s, 62 * s], [46 * s, 70 * s], [54 * s, 70 * s], [56 * s, 62 * s]], { ...o, width: 1.6 });
  },
  eye(g, rng, s) {
    const o = { width: 2.4, wobble: 0.8, rng };
    const cx = 50 * s, cy = 54 * s;
    // the all-seeing eye in a triangle, rays solid
    const tri = [[cx, 6 * s], [cx + 46 * s, 92 * s], [cx - 46 * s, 92 * s]];
    hatch(g, 0, 0, 100 * s, 100 * s, { angle: -Math.PI / 4, spacing: 5 * s, width: 1.2, wobble: 0.6, broken: 0.3, rng, alpha: 0.7 });
    fillPoly(g, tri, LABEL_PAPER);
    stroke(g, tri, { ...o, width: 2.6, close: true });
    const lid = [...quad([cx - 30 * s, cy], [cx, cy - 30 * s], [cx + 30 * s, cy]), ...quad([cx + 30 * s, cy], [cx, cy + 26 * s], [cx - 30 * s, cy])];
    stroke(g, lid, o);
    dot(g, cx, cy, 11 * s);
    dot(g, cx - 4 * s, cy - 4 * s, 2.5 * s, LABEL_PAPER);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      inkLine(g, cx + Math.cos(a) * 26 * s, cy + Math.sin(a) * 22 * s, cx + Math.cos(a) * 34 * s, cy + Math.sin(a) * 30 * s, { ...o, width: 1.6 });
    }
  },
  sun(g, rng, s) {
    const o = { width: 2.4, wobble: 0.8, rng };
    const cx = 50 * s, cy = 50 * s;
    crossHatch(g, 0, 0, 100 * s, 100 * s, { spacing: 6 * s, width: 1, wobble: 0.6, broken: 0.3, rng, alpha: 0.5 });
    // solid rays around a paper face
    const rays = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const r = i % 2 ? 46 * s : 28 * s;
      rays.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    fillPoly(g, rays, INK);
    const face = [];
    for (let i = 0; i < 24; i++) face.push([cx + Math.cos((i / 24) * Math.PI * 2) * 22 * s, cy + Math.sin((i / 24) * Math.PI * 2) * 22 * s]);
    fillPoly(g, face, LABEL_PAPER);
    ring(g, cx, cy, 22 * s, o);
    dot(g, cx - 7 * s, cy - 5 * s, 2.2 * s);
    dot(g, cx + 7 * s, cy - 5 * s, 2.2 * s);
    stroke(g, quad([cx - 8 * s, cy + 5 * s], [cx, cy + 14 * s], [cx + 8 * s, cy + 5 * s]), { ...o, width: 1.6 });
  },
  ship(g, rng, s) {
    const o = { width: 2.4, wobble: 0.9, rng };
    // a solid sea with paper wave lines, a paper hull and sails
    g.fillStyle = INK;
    g.fillRect(0, 66 * s, 100 * s, 34 * s);
    for (let j = 0; j < 4; j++) {
      const pts = [];
      for (let x = 2; x <= 98; x += 4) pts.push([x * s, (72 + j * 7 + Math.sin(x / 5 + j) * 2) * s]);
      stroke(g, pts, { width: 1.6, wobble: 0.5, rng, color: LABEL_PAPER });
    }
    const hull = [[14, 60], [22, 76], [78, 76], [88, 58]].map(([x, y]) => [x * s, y * s]);
    fillPoly(g, hull, LABEL_PAPER);
    stroke(g, hull, { ...o, close: true });
    inkLine(g, 50 * s, 60 * s, 50 * s, 10 * s, o);
    const sail1 = [[52, 12], [80, 52], [52, 52]].map(([x, y]) => [x * s, y * s]);
    const sail2 = [[48, 18], [26, 52], [48, 52]].map(([x, y]) => [x * s, y * s]);
    fillPoly(g, sail1, LABEL_PAPER);
    fillPoly(g, sail2, INK);
    stroke(g, sail1, { ...o, close: true });
    stroke(g, sail2, { ...o, close: true });
    stroke(g, [[50 * s, 10 * s], [60 * s, 14 * s], [50 * s, 18 * s]], { ...o, width: 1.6, close: true });
    fillPoly(g, [[50, 10], [60, 14], [50, 18]].map(([x, y]) => [x * s, y * s]), INK);
    dot(g, 82 * s, 18 * s, 6 * s);
  },
  house(g, rng, s) {
    const o = { width: 2.4, wobble: 0.9, rng };
    hatch(g, 0, 0, 100 * s, 100 * s, { angle: Math.PI / 2, spacing: 6 * s, width: 1, wobble: 0.6, broken: 0.4, rng, alpha: 0.35 });
    fillPoly(g, [[24, 50], [24, 86], [76, 86], [76, 50]].map(([x, y]) => [x * s, y * s]), LABEL_PAPER);
    stroke(g, [[24 * s, 50 * s], [24 * s, 86 * s], [76 * s, 86 * s], [76 * s, 50 * s]], o);
    fillPoly(g, [[16, 52], [50, 18], [84, 52]].map(([x, y]) => [x * s, y * s]), INK);
    fillPoly(g, [[44, 62], [56, 62], [56, 86], [44, 86]].map(([x, y]) => [x * s, y * s]), INK);
    inkRect(g, 30 * s, 58 * s, 10 * s, 10 * s, { ...o, width: 1.6 });
    inkRect(g, 60 * s, 58 * s, 10 * s, 10 * s, { ...o, width: 1.6 });
    inkLine(g, 35 * s, 58 * s, 35 * s, 68 * s, { ...o, width: 1 });
    inkLine(g, 65 * s, 58 * s, 65 * s, 68 * s, { ...o, width: 1 });
    fillPoly(g, [[62, 34], [62, 22], [69, 22], [69, 41]].map(([x, y]) => [x * s, y * s]), INK);
    stroke(g, quad([66 * s, 20 * s], [60 * s, 10 * s], [70 * s, 4 * s]), { ...o, width: 1.4 });
    inkLine(g, 10 * s, 88 * s, 90 * s, 88 * s, o);
  },
  zodiac(g, rng, s) {
    const o = { width: 2.2, wobble: 0.7, rng };
    const cx = 50 * s, cy = 50 * s;
    hatch(g, 0, 0, 100 * s, 100 * s, { angle: Math.PI / 4, spacing: 5 * s, width: 1.2, wobble: 0.6, broken: 0.2, rng, alpha: 0.8 });
    const disc = [];
    for (let i = 0; i < 40; i++) disc.push([cx + Math.cos((i / 40) * Math.PI * 2) * 42 * s, cy + Math.sin((i / 40) * Math.PI * 2) * 42 * s]);
    fillPoly(g, disc, LABEL_PAPER);
    ring(g, cx, cy, 42 * s, { ...o, n: 40 });
    ring(g, cx, cy, 31 * s, { ...o, n: 36, width: 1.6 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      inkLine(g, cx + Math.cos(a) * 31 * s, cy + Math.sin(a) * 31 * s, cx + Math.cos(a) * 42 * s, cy + Math.sin(a) * 42 * s, { ...o, width: 1.4 });
      const gx = cx + Math.cos(a + 0.26) * 36.5 * s, gy = cy + Math.sin(a + 0.26) * 36.5 * s;
      if (i % 3 === 0) dot(g, gx, gy, 2.4 * s);
      else if (i % 3 === 1) inkLine(g, gx - 3 * s, gy - 2 * s, gx + 3 * s, gy + 2 * s, { ...o, width: 1.6 });
      else stroke(g, [[gx - 3 * s, gy + 2.5 * s], [gx, gy - 3 * s], [gx + 3 * s, gy + 2.5 * s]], { ...o, width: 1.6 });
    }
    fillPoly(g, starPoly(cx, cy, 9 * s), INK);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.2;
      inkLine(g, cx + Math.cos(a) * 12 * s, cy + Math.sin(a) * 12 * s, cx + Math.cos(a) * 29 * s, cy + Math.sin(a) * 29 * s, { ...o, width: 1.2 });
    }
  },
  key(g, rng, s) {
    const o = { width: 2.6, wobble: 0.9, rng };
    hatch(g, 0, 0, 100 * s, 100 * s, { angle: Math.PI / 2, spacing: 5 * s, width: 1.2, wobble: 0.6, broken: 0.3, rng, alpha: 0.6 });
    const bow = [];
    for (let i = 0; i < 20; i++) bow.push([30 * s + Math.cos((i / 20) * Math.PI * 2) * 15 * s, 40 * s + Math.sin((i / 20) * Math.PI * 2) * 15 * s]);
    fillPoly(g, bow, INK);
    dot(g, 30 * s, 40 * s, 6 * s, LABEL_PAPER);
    fillPoly(g, [[42, 36], [88, 60], [86, 68], [80, 66], [78, 74], [72, 72], [70, 64], [64, 62], [40, 46]].map(([x, y]) => [x * s, y * s]), INK);
    stroke(g, bow, { ...o, close: true, color: LABEL_PAPER, width: 1.2 });
  },
};
export const PICTURE_KINDS = Object.keys(PICTURES);

// A picture in a solid-ink mat: the mat is black, the picture paper, the drawing fills it.
export function pictureTexture(kind, { seed = 1, w = 256, h = 256, round = false } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      g.fillStyle = INK;
      g.fillRect(0, 0, W, H);
      const m = Math.round(Math.min(W, H) * (round ? 0.16 : 0.13));
      const inner = Math.min(W, H) - 2 * m;
      g.save();
      if (round) {
        g.beginPath();
        g.arc(W / 2, H / 2, inner / 2, 0, Math.PI * 2);
        g.clip();
      } else {
        g.beginPath();
        g.rect((W - inner) / 2, (H - inner) / 2, inner, inner);
        g.clip();
      }
      g.fillStyle = LABEL_PAPER;
      g.fillRect(0, 0, W, H);
      // pen sketches: scale the context so the strokes stay bold at the frame's size on screen
      const k = 3;
      g.translate((W - inner) / 2, (H - inner) / 2);
      g.scale(k, k);
      (PICTURES[kind] ?? PICTURES.zodiac)(g, rng, inner / 100 / k);
      g.restore();
    },
    { seed },
  );
}

// ---- signs -------------------------------------------------------------------------------------
// Hand-lettered caps inside a wobbly single-rule rectangle, the way the film letters a fascia.
export function signTexture({ lines, w = 1024, h = 160, seed = 9, border = 'single', sizes = null, tint = '#f9f6ef' }) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, tint, { grain: 0, seed });
      const rule = Math.max(2.5, H * 0.022);
      const inset = Math.max(6, H * 0.05);
      if (border !== 'none') inkRect(g, inset, inset, W - 2 * inset, H - 2 * inset, { width: rule, wobble: 1.4, rng, overshoot: 6 });
      if (border === 'double') inkRect(g, inset + rule * 3, inset + rule * 3, W - 2 * (inset + rule * 3), H - 2 * (inset + rule * 3), { width: rule * 0.6, wobble: 1.2, rng, overshoot: 4 });
      const n = lines.length;
      const tracking = 0.2;
      const fitted = lines.map((t, i) => penFit(t, sizes?.[i] ?? (n === 1 ? H * 0.5 : i === 0 ? H * 0.36 : H * 0.2), W * 0.84, tracking));
      const total = fitted.reduce((a, b) => a + b, 0) + (n - 1) * fitted[0] * 0.45;
      let y = H / 2 - total / 2;
      lines.forEach((t, i) => {
        const size = fitted[i];
        penText(g, t, W / 2, y + size / 2, { size, weight: Math.max(2, size * 0.15), rng, tracking, drift: 0.05 });
        y += size + fitted[0] * 0.45;
      });
    },
    { seed },
  );
}

// ---- the doormat: a dark coir field with the greeting left in paper ---------------------------
export function matTexture({ text = 'BIENVENUE', w = 512, h = 300, seed = 41 } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, '#f3eee4', { grain: 0, seed });
      hatch(g, 0, 0, W, H, { angle: 0, spacing: 4, width: 2.6, wobble: 0.5, broken: 0.05, rng, alpha: 0.95, jitter: 0.6 });
      inkRect(g, 14, 14, W - 28, H - 28, { width: 5, wobble: 1, rng, color: LABEL_PAPER, overshoot: 0 });
      const size = penFit(text, H * 0.34, W * 0.8, 0.2);
      penText(g, text, W / 2, H / 2, { size, weight: size * 0.22, rng, tracking: 0.2, color: LABEL_PAPER });
    },
    { seed },
  );
}

// ---- radio front: a solid grille with paper slots, a paper dial with one needle ------------------
export function radioTexture(seed = 12) {
  return drawTexture(
    512,
    312,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      const o = { width: 2.6, wobble: 0.8, rng };
      // grille: solid ink, six paper slots left in it
      const gx = 26, gy = 30, gw = 214, gh = 252;
      g.fillStyle = INK;
      g.fillRect(gx, gy, gw, gh);
      for (let i = 0; i < 6; i++) {
        const y = gy + 22 + i * 38;
        inkLine(g, gx + 16, y, gx + gw - 16, y + (rng() - 0.5) * 3, { width: 9, wobble: 1.2, rng, color: LABEL_PAPER });
      }
      // dial window
      const dx = 268, dy = 38, dw = 218, dh = 108;
      g.fillStyle = LABEL_PAPER;
      g.fillRect(dx, dy, dw, dh);
      inkRect(g, dx, dy, dw, dh, { ...o, width: 3 });
      inkLine(g, dx + 16, dy + dh * 0.62, dx + dw - 16, dy + dh * 0.62, { ...o, width: 2 });
      for (let i = 0; i < 17; i++) {
        const x = dx + 20 + (i / 16) * (dw - 40);
        inkLine(g, x, dy + dh * 0.62 - (i % 4 ? 5 : 11), x, dy + dh * 0.62 + 5, { ...o, width: i % 4 ? 1.6 : 2.4 });
      }
      // the needle, one stroke, on a station
      inkLine(g, dx + 84, dy + 14, dx + 96, dy + dh - 14, { ...o, width: 3.4 });
      penText(g, 'PARIS INTER', dx + dw / 2, dy + 26, { size: 15, weight: 2.2, rng, tracking: 0.22 });
      // two solid knobs under the dial (geometry doubles them; the drawing gives them mass)
      for (const kx of [326, 428]) {
        dot(g, kx, 214, 34);
        inkLine(g, kx, 186, kx, 200, { width: 4, wobble: 0.4, rng, color: LABEL_PAPER });
      }
      penText(g, 'RADIOLA', 377, 282, { size: 22, weight: 3.2, rng, tracking: 0.3 });
    },
    { seed },
  );
}

// ---- clock face ----------------------------------------------------------------------------------
export function clockTexture(seed = 13) {
  return drawTexture(
    256,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, '#f9f6ef', { grain: 0, seed });
      const o = { width: 2.2, wobble: 0.6, rng };
      const cx = 128, cy = 128;
      ring(g, cx, cy, 116, { ...o, n: 60, width: 3 });
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const r0 = i % 5 ? 100 : 92, r1 = 108;
        inkLine(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, { ...o, width: i % 5 ? 1.4 : 3 });
      }
      const nums = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      nums.forEach((n, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        penText(g, n, cx + Math.cos(a) * 74, cy + Math.sin(a) * 74, { size: 20, weight: 3, rng, tracking: 0.08 });
      });
      dot(g, cx, cy, 7);
    },
    { seed },
  );
}

// ---- rug -----------------------------------------------------------------------------------------
export function rugTexture(seed = 14) {
  return drawTexture(
    1024,
    800,
    (g, W, H, rng) => {
      paper(g, W, H, '#f3eee4', { grain: 0, seed });
      const o = { width: 2.6, wobble: 0.9, rng };
      // a solid outer band, then the scroll border on a dashed ground, then a double rule
      const b0 = 18, b1 = 128;
      g.fillStyle = INK;
      g.fillRect(b0, b0, W - 2 * b0, 12);
      g.fillRect(b0, H - b0 - 12, W - 2 * b0, 12);
      g.fillRect(b0, b0, 12, H - 2 * b0);
      g.fillRect(W - b0 - 12, b0, 12, H - 2 * b0);
      inkRect(g, b0 + 20, b0 + 20, W - 2 * b0 - 40, H - 2 * b0 - 40, { ...o, width: 1.8, overshoot: 0 });
      g.save();
      g.beginPath();
      g.rect(b0 + 20, b0 + 20, W - 2 * b0 - 40, H - 2 * b0 - 40);
      g.rect(b1, b1, W - 2 * b1, H - 2 * b1);
      g.clip('evenodd');
      dashes(g, 0, 0, W, H, { count: 2600, len: 5, width: 1.4, angle: Math.PI / 4, angleJitter: 0.3, rng, alpha: 0.45 });
      g.restore();
      inkRect(g, b1, b1, W - 2 * b1, H - 2 * b1, { ...o, width: 3, overshoot: 0 });
      inkRect(g, b1 + 12, b1 + 12, W - 2 * b1 - 24, H - 2 * b1 - 24, { ...o, width: 1.4, overshoot: 0 });
      // the border: a running scroll — loops that curl alternately up and down, a leaf in each
      const scroll = (x0, y0, x1, y1, n) => {
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;
        const pitch = len / n;
        const amp = 24;
        for (let i = 0; i < n; i++) {
          const s = i % 2 ? 1 : -1;
          const cxp = x0 + ux * pitch * (i + 0.5), cyp = y0 + uy * pitch * (i + 0.5);
          const pts = [];
          for (let k = 0; k <= 18; k++) {
            const a = (k / 18) * Math.PI * 2.4;
            const r = amp * (1 - k / 22);
            const px = Math.cos(a) * r, py = Math.sin(a) * r * s;
            pts.push([cxp + ux * px + nx * py, cyp + uy * px + ny * py]);
          }
          stroke(g, pts, { ...o, width: 3 });
          const lx = cxp + ux * pitch * 0.5, ly = cyp + uy * pitch * 0.5;
          const tip = [lx + nx * s * -amp * 0.9, ly + ny * s * -amp * 0.9];
          const leaf = [...quad([lx, ly], [lx + ux * 14 + nx * s * -8, ly + uy * 14 + ny * s * -8], tip), ...quad(tip, [lx - ux * 14 + nx * s * -8, ly - uy * 14 + ny * s * -8], [lx, ly])];
          fillPoly(g, leaf, INK);
        }
      };
      const mid = (b0 + 20 + b1) / 2;
      scroll(mid + 44, mid, W - mid - 44, mid, 14);
      scroll(mid + 44, H - mid, W - mid - 44, H - mid, 14);
      scroll(mid, mid + 44, mid, H - mid - 44, 10);
      scroll(W - mid, mid + 44, W - mid, H - mid - 44, 10);
      for (const [x, y] of [[mid, mid], [W - mid, mid], [mid, H - mid], [W - mid, H - mid]]) {
        dot(g, x, y, 24);
        fillPoly(g, starPoly(x, y, 13), LABEL_PAPER);
      }
      // a quiet field with one small central medallion
      const cx = W / 2, cy = H / 2;
      for (const [rx, ry, w] of [[130, 82, 2.6], [108, 66, 1.4]]) stroke(g, [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]], { ...o, width: w, close: true });
      fillPoly(g, starPoly(cx, cy, 22), INK);
      for (const [ddx, ddy] of [[-86, 0], [86, 0], [0, -52], [0, 52]]) dot(g, cx + ddx, cy + ddy, 7);
    },
    { seed },
  );
}

// ---- curtains: dense wavering vertical lines, the way the film draws a drape ----------------------
export function curtainTexture(seed = 15) {
  return drawTexture(
    256,
    512,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f4ec', { grain: 0, seed });
      for (let v = 0; v < 11; v++) {
        const x0 = 8 + v * 23.5 + (rng() - 0.5) * 6;
        const pts = [];
        const ph = rng() * 6, fq = 40 + rng() * 30, am = 3 + rng() * 5;
        for (let y = -8; y <= H + 8; y += 10) pts.push([x0 + Math.sin(y / fq + ph) * am, y]);
        stroke(g, pts, { width: v % 3 === 1 ? 3 : 1.8, wobble: 0.6, rng, alpha: 0.95 });
      }
    },
    { repeat: [1, 2], seed },
  );
}

// ---- leaves (alpha cut) ----------------------------------------------------------------------------
export function leafTexture({ kind = 'palm', seed = 16 } = {}) {
  return drawTexture(
    128,
    256,
    (g, W, H, rng) => {
      g.clearRect(0, 0, W, H);
      const o = { width: 2.4, wobble: 0.8, rng };
      const cx = W / 2;
      let outline;
      if (kind === 'palm') {
        outline = [];
        for (let i = 0; i <= 14; i++) {
          const u = i / 14;
          const y = 8 + u * (H - 16);
          const w = Math.sin(u * Math.PI) * (W * 0.42) * (i % 2 ? 1 : 0.7);
          outline.push([cx + w, y]);
        }
        for (let i = 14; i >= 0; i--) {
          const u = i / 14;
          const y = 8 + u * (H - 16);
          const w = Math.sin(u * Math.PI) * (W * 0.42) * (i % 2 ? 1 : 0.7);
          outline.push([cx - w, y]);
        }
      } else {
        outline = [...quad([cx, 8], [W * 0.98, H * 0.45], [cx, H - 8], 14), ...quad([cx, H - 8], [W * 0.02, H * 0.45], [cx, 8], 14)];
      }
      fillPoly(g, outline, PAPER);
      stroke(g, outline, { ...o, width: 3.6, close: true });
      inkLine(g, cx, 10, cx, H - 10, { ...o, width: 2.6 });
      for (let y = 30; y < H - 20; y += 22) {
        const w = Math.sin(((y - 8) / (H - 16)) * Math.PI) * W * 0.36;
        inkLine(g, cx, y, cx + w, y - 14, { ...o, width: 1.4 });
        inkLine(g, cx, y + 8, cx - w, y - 6, { ...o, width: 1.4 });
      }
      // one solid half-leaf in shadow, as the film would ink the underside
      if (kind === 'palm') {
        g.save();
        g.beginPath();
        outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.clip();
        hatch(g, 0, H * 0.55, cx, H * 0.45, { angle: Math.PI / 3, spacing: 5, width: 1.6, wobble: 0.5, broken: 0.1, rng, alpha: 0.9 });
        g.restore();
      }
    },
    { seed },
  );
}

// ---- lamp fringe (alpha cut): short vertical dashes under a shade -----------------------------------
export function fringeTexture(seed = 17) {
  return drawTexture(
    512,
    64,
    (g, W, H, rng) => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, 12);
      inkLine(g, 0, 6, W, 6, { width: 4, wobble: 0.5, rng });
      for (let x = 5; x < W; x += 13) inkLine(g, x, 12, x + (rng() - 0.5) * 4, 34 + rng() * 22, { width: 4.5, wobble: 0.8, rng });
    },
    { repeat: [4, 1], seed },
  );
}
// A shade: vertical rain-strokes dense at the silhouette edges (u = 0.25 and 0.75 on a cylinder),
// thinning to bare paper in the middle, so the shade reads as a rounded form.
export function shadeTexture(seed = 18) {
  return drawTexture(
    512,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, '#faf7f0', { grain: 0, seed });
      let n = 0, guard = 0;
      while (n < 620 && guard++ < 6000) {
        const x = rng() * W;
        const d = Math.pow(Math.abs(Math.sin((x / W) * Math.PI * 2)), 1.6);
        if (rng() > d) continue;
        const y = rng() * H;
        const len = 26 + rng() * 60;
        inkLine(g, x, y, x + (rng() - 0.5) * 4, Math.min(H, y + len), { width: 3.6, wobble: 1.2, rng, alpha: 0.95 });
        n++;
      }
      inkLine(g, 0, 6, W, 6, { width: 4, wobble: 0.8, rng });
      inkLine(g, 0, H - 6, W, H - 6, { width: 4, wobble: 0.8, rng });
    },
    { seed },
  );
}
// A hanging coat: a solid black silhouette with three paper fold lines and a paper collar.
export function coatTexture(seed = 28) {
  return drawTexture(
    256,
    256,
    (g, W, H, rng) => {
      g.fillStyle = INK;
      g.fillRect(0, 0, W, H);
      const o = { width: 5, wobble: 2, rng, color: LABEL_PAPER };
      for (const u of [0.44, 0.5, 0.565]) inkLine(g, u * W + (rng() - 0.5) * 6, H * 0.16, u * W + (rng() - 0.5) * 10, H * 0.96, o);
      inkLine(g, W * 0.5, H * 0.2, W * 0.42, H * 0.02, o);
      inkLine(g, W * 0.5, H * 0.2, W * 0.58, H * 0.02, o);
      for (const y of [0.34, 0.5, 0.66]) dot(g, W * 0.455, H * y, 5, LABEL_PAPER);
    },
    { seed },
  );
}
export function potTexture(seed = 20) {
  return drawTexture(
    512,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      const o = { width: 2.2, wobble: 0.7, rng };
      // a solid rim band, a row of drawn chevrons, a rule lower down
      g.fillStyle = INK;
      g.fillRect(0, 0, W, 34);
      inkLine(g, 0, 50, W, 50, o);
      for (let x = 0; x < W; x += 32) {
        stroke(g, [[x, 92], [x + 16, 58], [x + 32, 92]], { ...o, width: 2 });
        dot(g, x + 16, 78, 3);
      }
      inkLine(g, 0, 100, W, 100, o);
      inkLine(g, 0, 214, W, 214, { ...o, width: 1.6 });
    },
    { repeat: [2, 1], seed },
  );
}
export function paperStackTexture(seed = 21) {
  return drawTexture(
    256,
    128,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f5ee', { grain: 0, seed });
      hatch(g, 0, 0, W, H, { angle: 0, spacing: 4, width: 1, wobble: 0.5, broken: 0.35, rng, alpha: 0.8, jitter: 0.5 });
    },
    { repeat: [2, 1], seed },
  );
}
export function newspaperTexture(seed = 22) {
  return drawTexture(
    256,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f5ee', { grain: 0, seed });
      penText(g, 'LE SOIR', W / 2, 30, { size: 34, weight: 5, rng, tracking: 0.16 });
      inkLine(g, 14, 54, W - 14, 54, { width: 2.4, wobble: 0.6, rng });
      for (let c = 0; c < 3; c++) {
        const x = 16 + c * 78;
        for (let y = 72; y < H - 10; y += 8) inkLine(g, x, y, x + 60 - rng() * 14, y, { width: 1.4, wobble: 0.5, rng, alpha: 0.8 });
      }
      g.fillStyle = INK;
      g.fillRect(96, 72, 64, 50);
      dot(g, 128, 97, 12, '#f8f5ee');
    },
    { seed },
  );
}
export function globeTexture(seed = 23) {
  return drawTexture(
    512,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f5ee', { grain: 0, seed });
      const o = { width: 1.6, wobble: 0.8, rng };
      for (let i = 0; i <= 12; i++) inkLine(g, (i / 12) * W, 0, (i / 12) * W, H, { ...o, alpha: 0.7 });
      for (let j = 1; j < 6; j++) inkLine(g, 0, (j / 6) * H, W, (j / 6) * H, { ...o, alpha: 0.7, width: j === 3 ? 2.4 : 1.4 });
      // continents as solid ink
      const blobs = [[70, 90, 40, 60], [150, 150, 36, 40], [270, 80, 90, 50], [300, 140, 40, 40], [420, 170, 40, 26], [380, 100, 50, 32]];
      for (const [x, y, rx, ry] of blobs) {
        const pts = [];
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          const k = 1 + (rng() - 0.5) * 0.4;
          pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
        }
        fillPoly(g, pts, INK);
      }
    },
    { seed },
  );
}
export function noteTexture({ seed = 25, w = 128, h = 96, kind = 'lines', tint = '#f8f5ee' } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, tint, { grain: 0, seed });
      const o = { width: 1.8, wobble: 0.6, rng };
      if (kind === 'lines') {
        for (let y = 18; y < H - 8; y += 12) inkLine(g, 10, y, W - 10 - rng() * 40, y + (rng() - 0.5) * 3, { ...o, width: 1.6, alpha: 0.9 });
      } else if (kind === 'card') {
        inkRect(g, 8, 8, W - 16, H - 16, o);
        fillPoly(g, starPoly(W / 2, H / 2, Math.min(W, H) * 0.24), INK);
      } else if (kind === 'number') {
        penText(g, String(3 + Math.floor(rng() * 20)), W / 2, H / 2, { size: H * 0.6, weight: H * 0.09, rng });
      } else {
        dot(g, W / 2, H * 0.42, Math.min(W, H) * 0.26);
        for (let y = H * 0.78; y < H - 4; y += 8) inkLine(g, 12, y, W - 12, y, { ...o, width: 1.4 });
      }
    },
    { seed },
  );
}
export function corkTexture(seed = 26) {
  return drawTexture(
    256,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, '#f4efe4', { grain: 0, seed });
      dashes(g, 0, 0, W, H, { count: 420, len: 4, width: 1.2, angle: 0, angleJitter: 3, rng, alpha: 0.35 });
    },
    { repeat: [2, 2], seed },
  );
}
export function doilyTexture(seed = 24) {
  return drawTexture(
    256,
    256,
    (g, W, H, rng) => {
      g.clearRect(0, 0, W, H);
      const cx = 128, cy = 128;
      g.fillStyle = PAPER;
      g.beginPath();
      g.arc(cx, cy, 118, 0, Math.PI * 2);
      g.fill();
      const o = { width: 1.6, wobble: 0.5, rng };
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        ring(g, cx + Math.cos(a) * 110, cy + Math.sin(a) * 110, 9, { ...o, n: 10 });
      }
      ring(g, cx, cy, 96, { ...o, n: 48 });
      ring(g, cx, cy, 40, { ...o, n: 24 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        stroke(g, [[cx + Math.cos(a) * 44, cy + Math.sin(a) * 44], [cx + Math.cos(a + 0.13) * 70, cy + Math.sin(a + 0.13) * 70], [cx + Math.cos(a) * 92, cy + Math.sin(a) * 92], [cx + Math.cos(a - 0.13) * 70, cy + Math.sin(a - 0.13) * 70]], { ...o, close: true });
      }
    },
    { seed },
  );
}

export { PAPER, INK };

// ---- the cat asleep on the bookcase: a solid ink silhouette with one white eye slit -----------
export function catTexture(seed = 29) {
  return drawTexture(
    256,
    128,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      // the body: solid ink, a stroke of paper for the closed eye and the curl of the tail
      g.fillStyle = INK;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = PAPER;
      g.lineCap = 'round';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(W * 0.62, H * 0.42);
      g.quadraticCurveTo(W * 0.68, H * 0.5, W * 0.74, H * 0.42);
      g.stroke();
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(W * 0.08, H * 0.7);
      g.quadraticCurveTo(W * 0.2, H * 0.95, W * 0.42, H * 0.78);
      g.stroke();
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(W * 0.78 + rng() * 4, H * (0.5 + i * 0.06));
        g.lineTo(W * 0.9 + rng() * 6, H * (0.46 + i * 0.08));
        g.stroke();
      }
    },
    { repeat: [1, 1], seed },
  );
}
