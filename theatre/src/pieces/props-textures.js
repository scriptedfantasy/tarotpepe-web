// PIECE: props — the drawn patterns that live on the props' surfaces: bottle labels, book
// spines, the tiny ink pictures inside the frames, the rug's woven border, the curtain print,
// the radio's dial, the clock face, the signs' lettering. Patterns only — the ink pass adds
// outlines and tone. Everything is drawn with strokes.js so it shares one hand.
import * as THREE from 'three';
import { INK, PAPER, drawTexture, paper, inkLine, inkRect, hatch, crossHatch, dashes, letter } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

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
// quadratic bezier sample
function quad(p0, c, p1, n = 10) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * p0[0] + 2 * s * t * c[0] + t * t * p1[0], s * s * p0[1] + 2 * s * t * c[1] + t * t * p1[1]]);
  }
  return out;
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
function sparkle(g, cx, cy, r, opts) {
  inkLine(g, cx - r, cy, cx + r, cy, opts);
  inkLine(g, cx, cy - r, cx, cy + r, opts);
  inkLine(g, cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy + r * 0.5, { ...opts, width: opts.width * 0.7 });
  inkLine(g, cx + r * 0.5, cy - r * 0.5, cx - r * 0.5, cy + r * 0.5, { ...opts, width: opts.width * 0.7 });
}

// ---- emblems for labels ---------------------------------------------------------------------
const EMBLEMS = {
  star: (g, x, y, s, o) => star(g, x, y, s, o),
  crescent: (g, x, y, s, o) => {
    stroke(g, [...arc_(x, y, s, -1.2, 1.2), ...quad([x + Math.cos(1.2) * s, y + Math.sin(1.2) * s], [x - s * 0.4, y], [x + Math.cos(-1.2) * s, y + Math.sin(-1.2) * s], 8)], { ...o, close: true });
  },
  crest: (g, x, y, s, o) => {
    stroke(g, [[x - s, y - s], [x + s, y - s], [x + s, y + s * 0.3], [x, y + s * 1.1], [x - s, y + s * 0.3]], { ...o, close: true });
    inkLine(g, x, y - s, x, y + s * 1.05, { ...o, width: o.width * 0.7 });
    inkLine(g, x - s, y, x + s, y, { ...o, width: o.width * 0.7 });
  },
  sun: (g, x, y, s, o) => {
    ring(g, x, y, s * 0.55, o);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      inkLine(g, x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.7, x + Math.cos(a) * s * 1.1, y + Math.sin(a) * s * 1.1, o);
    }
  },
  grapes: (g, x, y, s, o) => {
    const rows = [[0], [-0.5, 0.5], [-1, 0, 1], [-0.5, 0.5], [0]];
    rows.forEach((r, j) => r.forEach((dx) => ring(g, x + dx * s * 0.45, y - s * 0.9 + j * s * 0.42, s * 0.22, { ...o, n: 8 })));
    inkLine(g, x, y - s * 1.1, x + s * 0.3, y - s * 1.5, o);
  },
  anchor: (g, x, y, s, o) => {
    inkLine(g, x, y - s, x, y + s, o);
    ring(g, x, y - s * 1.1, s * 0.22, { ...o, n: 8 });
    inkLine(g, x - s * 0.6, y - s * 0.4, x + s * 0.6, y - s * 0.4, o);
    arc(g, x, y + s * 0.2, s * 0.8, 0.3, Math.PI - 0.3, o);
  },
  leaf: (g, x, y, s, o) => {
    stroke(g, [...quad([x, y - s], [x + s * 0.9, y - s * 0.2], [x, y + s], 8), ...quad([x, y + s], [x - s * 0.9, y - s * 0.2], [x, y - s], 8)], o);
    inkLine(g, x, y - s * 0.9, x, y + s * 0.9, { ...o, width: o.width * 0.6 });
  },
  bell: (g, x, y, s, o) => {
    stroke(g, [[x - s * 0.7, y + s * 0.6], ...quad([x - s * 0.6, y + s * 0.2], [x - s * 0.7, y - s * 1.1], [x, y - s]), ...quad([x, y - s], [x + s * 0.7, y - s * 1.1], [x + s * 0.6, y + s * 0.2]), [x + s * 0.7, y + s * 0.6]], { ...o, close: true });
    dot(g, x, y + s * 0.85, s * 0.18, o.color);
  },
};
function arc_(cx, cy, r, a0, a1, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// ---- bottle / jar labels ----------------------------------------------------------------------
// A wrap-around texture for a lathe: the label sits at u in [u0,u1] (front = u 0.5) and
// v in [v0,v1] (v = 0 at the bottom). `shape`: 'rect' | 'oval' | 'shield' | 'band'.
export function labelTexture({ name, sub = '', emblem = 'star', shape = 'rect', uRange = [0.3, 0.7], vRange = [0.25, 0.65], seed = 1, w = 256, h = 256, cap = false, glass = PAPER }) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, glass, { grain: 0.02, seed });
      const x0 = uRange[0] * W, x1 = uRange[1] * W;
      const y0 = (1 - vRange[1]) * H, y1 = (1 - vRange[0]) * H;
      const lw = x1 - x0, lh = y1 - y0;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const o = { width: 1.6, wobble: 0.6, rng };
      g.fillStyle = LABEL_PAPER;
      if (shape === 'oval') {
        g.beginPath();
        g.ellipse(cx, cy, lw / 2, lh / 2, 0, 0, Math.PI * 2);
        g.fill();
        ring(g, cx, cy, lw / 2, { ...o, squash: lh / lw, n: 40 });
        ring(g, cx, cy, lw / 2 - 5, { ...o, squash: (lh - 10) / (lw - 10), n: 40, width: 1 });
      } else if (shape === 'shield') {
        const pts = [[x0, y0], [x1, y0], [x1, y1 - lh * 0.3], [cx, y1], [x0, y1 - lh * 0.3]];
        fillPoly(g, pts, LABEL_PAPER);
        stroke(g, pts, { ...o, close: true });
      } else if (shape === 'band') {
        g.fillRect(0, y0, W, lh);
        inkLine(g, 0, y0, W, y0, o);
        inkLine(g, 0, y1, W, y1, o);
        inkLine(g, 0, y0 + 5, W, y0 + 5, { ...o, width: 0.9 });
        inkLine(g, 0, y1 - 5, W, y1 - 5, { ...o, width: 0.9 });
      } else {
        g.fillRect(x0, y0, lw, lh);
        inkRect(g, x0, y0, lw, lh, o);
        inkRect(g, x0 + 6, y0 + 6, lw - 12, lh - 12, { ...o, width: 0.9 });
      }
      // emblem + name + small print
      const em = EMBLEMS[emblem] ?? EMBLEMS.star;
      const es = Math.min(lw, lh) * 0.13;
      em(g, cx, y0 + lh * 0.3, es, { ...o, width: 1.2 });
      const size = Math.min((lw * 0.85) / Math.max(4, name.length * 0.62), lh * 0.2);
      letter(g, name, cx, y0 + lh * 0.56, { size, rng, tracking: 0.12, jitter: 0.8, weight: 700 });
      if (sub) letter(g, sub, cx, y0 + lh * 0.72, { size: size * 0.5, rng, tracking: 0.2, jitter: 0.6, weight: 500 });
      // a line of fine print
      const py = y0 + lh * 0.85;
      for (let i = 0; i < 3; i++) inkLine(g, cx - lw * 0.28 + i * 2, py + i * 4 - 4, cx + lw * 0.28 - i * 3, py + i * 4 - 4, { width: 0.8, wobble: 0.4, rng, alpha: 0.7 });
      // a cap band at the top of the texture (foil)
      if (cap) {
        const ch = H * 0.06;
        g.fillStyle = LABEL_PAPER;
        g.fillRect(0, 0, W, ch);
        hatch(g, 0, 0, W, ch, { angle: Math.PI / 2, spacing: 4, width: 1, wobble: 0.3, broken: 0, rng, alpha: 0.8 });
      }
    },
    { seed },
  );
}

// ---- book spines ------------------------------------------------------------------------------
export function spineTexture({ title, seed = 1, bands = 2, vertical = true, w = 64, h = 256 }) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0.02, seed });
      const o = { width: 1.4, wobble: 0.5, rng };
      const L = vertical ? H : W;
      // raised bands top and bottom, like a bound spine
      for (let i = 0; i < bands; i++) {
        const t = 0.09 + i * 0.07;
        for (const u of [t, 1 - t]) {
          if (vertical) {
            inkLine(g, 3, u * L, W - 3, u * L, o);
            inkLine(g, 3, u * L + 4, W - 3, u * L + 4, { ...o, width: 0.9 });
          } else {
            inkLine(g, u * L, 3, u * L, H - 3, o);
            inkLine(g, u * L + 4, 3, u * L + 4, H - 3, { ...o, width: 0.9 });
          }
        }
      }
      g.save();
      if (vertical) {
        g.translate(W / 2, H / 2);
        g.rotate(-Math.PI / 2);
        letter(g, title, 0, 0, { size: Math.min(W * 0.55, (H * 0.5) / Math.max(3, title.length * 0.6)), rng, tracking: 0.14, jitter: 0.6, weight: 700 });
      } else {
        letter(g, title, W / 2, H / 2, { size: Math.min(H * 0.55, (W * 0.5) / Math.max(3, title.length * 0.6)), rng, tracking: 0.14, jitter: 0.6, weight: 700 });
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
      paper(g, W, H, '#f8f5ee', { grain: 0.01, seed });
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
      paper(g, W, H, PAPER, { grain: 0.02, seed });
      hatch(g, 0, 0, W, H, { angle: Math.PI / 4, spacing: 9, width: 0.7, wobble: 0.4, broken: 0.4, rng, alpha: 0.28 });
    },
    { repeat: [3, 3], seed },
  );
}
export function woodTexture(seed = 4) {
  return drawTexture(
    256,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0.02, seed });
      for (let i = 0; i < 9; i++) {
        const y = 10 + i * 27 + rng() * 8;
        inkLine(g, 0, y, W, y + (rng() - 0.5) * 10, { width: 0.8, wobble: 1.4, rng, alpha: 0.22 });
      }
    },
    { repeat: [2, 2], seed },
  );
}

// ---- the tiny pictures in the frames ----------------------------------------------------------
const PICTURES = {
  hand(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    const P = [[34, 95], [30, 72], [22, 58], [13, 50], [10, 43], [16, 39], [27, 47], [32, 42], [33, 20], [38, 15], [43, 21], [44, 40], [46, 12], [51, 8], [56, 13], [57, 38], [60, 17], [65, 14], [69, 20], [68, 42], [73, 31], [78, 30], [80, 36], [74, 52], [70, 70], [66, 95]];
    stroke(g, P.map(([x, y]) => [x * s, y * s]), { ...o, close: true });
    stroke(g, quad([30 * s, 60 * s], [40 * s, 80 * s], [46 * s, 95 * s]), { ...o, width: 1.4 });
    stroke(g, quad([27 * s, 55 * s], [50 * s, 62 * s], [72 * s, 58 * s]), { ...o, width: 1.4 });
    stroke(g, quad([35 * s, 48 * s], [55 * s, 50 * s], [70 * s, 68 * s]), { ...o, width: 1.4 });
    for (const [x, y] of [[18, 22], [85, 18], [88, 70]]) sparkle(g, x * s, y * s, 4 * s, { width: 1.2, wobble: 0.3, rng });
  },
  moon(g, rng, s) {
    const o = { width: 2.2, wobble: 0.8, rng };
    const cx = 50 * s, cy = 50 * s, r = 34 * s;
    const a = 1.25;
    const tipA = [cx + Math.cos(-a) * r, cy + Math.sin(-a) * r], tipB = [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    stroke(g, [...arc_(cx, cy, r, -a, a, 16), ...quad(tipB, [cx - r * 0.55, cy], tipA, 12)], { ...o, close: true });
    dot(g, cx + 12 * s, cy - 10 * s, 2 * s);
    stroke(g, quad([cx + 8 * s, cy - 2 * s], [cx + 16 * s, cy + 4 * s], [cx + 6 * s, cy + 8 * s]), { ...o, width: 1.4 });
    stroke(g, quad([cx + 10 * s, cy + 16 * s], [cx + 18 * s, cy + 16 * s], [cx + 20 * s, cy + 11 * s]), { ...o, width: 1.4 });
    hatch(g, cx + 18 * s, cy - 30 * s, 20 * s, 60 * s, { angle: Math.PI / 2, spacing: 4 * s, width: 1, wobble: 0.5, broken: 0.3, rng, alpha: 0.6 });
    for (const [x, y] of [[18, 20], [22, 78], [12, 50]]) star(g, x * s, y * s, 4 * s, { width: 1.2, wobble: 0.3, rng });
  },
  eye(g, rng, s) {
    const o = { width: 2.2, wobble: 0.8, rng };
    const cx = 50 * s, cy = 52 * s;
    stroke(g, [[cx - 36 * s, cy], ...quad([cx - 36 * s, cy], [cx, cy - 34 * s], [cx + 36 * s, cy]), ...quad([cx + 36 * s, cy], [cx, cy + 30 * s], [cx - 36 * s, cy])], o);
    ring(g, cx, cy, 13 * s, o);
    dot(g, cx, cy, 6 * s);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      inkLine(g, cx + Math.cos(a) * 30 * s, cy + Math.sin(a) * 25 * s, cx + Math.cos(a) * 38 * s, cy + Math.sin(a) * 33 * s, { ...o, width: 1.4 });
    }
    stroke(g, [[cx, 8 * s], [cx + 44 * s, 90 * s], [cx - 44 * s, 90 * s]], { ...o, width: 1.6, close: true });
    hatch(g, cx - 44 * s, 60 * s, 88 * s, 30 * s, { angle: Math.PI / 4, spacing: 5 * s, width: 1, wobble: 0.5, broken: 0.4, rng, alpha: 0.5 });
  },
  sun(g, rng, s) {
    const o = { width: 2.2, wobble: 0.8, rng };
    const cx = 50 * s, cy = 50 * s;
    ring(g, cx, cy, 22 * s, o);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r0 = 26 * s, r1 = i % 2 ? 40 * s : 34 * s;
      if (i % 2) inkLine(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, { ...o, width: 1.6 });
      else stroke(g, [[cx + Math.cos(a - 0.12) * r0, cy + Math.sin(a - 0.12) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(a + 0.12) * r0, cy + Math.sin(a + 0.12) * r0]], { ...o, width: 1.6 });
    }
    dot(g, cx - 7 * s, cy - 5 * s, 2 * s);
    dot(g, cx + 7 * s, cy - 5 * s, 2 * s);
    stroke(g, quad([cx - 8 * s, cy + 5 * s], [cx, cy + 14 * s], [cx + 8 * s, cy + 5 * s]), { ...o, width: 1.4 });
  },
  ship(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    stroke(g, [[18 * s, 62 * s], [26 * s, 78 * s], [74 * s, 78 * s], [84 * s, 60 * s]], o);
    inkLine(g, 18 * s, 62 * s, 84 * s, 60 * s, o);
    inkLine(g, 50 * s, 60 * s, 50 * s, 14 * s, o);
    stroke(g, [[52 * s, 16 * s], [78 * s, 52 * s], [52 * s, 52 * s]], { ...o, close: true });
    stroke(g, [[48 * s, 22 * s], [28 * s, 52 * s], [48 * s, 52 * s]], { ...o, close: true });
    hatch(g, 28 * s, 22 * s, 20 * s, 30 * s, { angle: Math.PI / 2, spacing: 4 * s, width: 1, wobble: 0.5, broken: 0.3, rng, alpha: 0.5 });
    inkLine(g, 50 * s, 14 * s, 60 * s, 18 * s, { ...o, width: 1.4 });
    inkLine(g, 60 * s, 18 * s, 50 * s, 22 * s, { ...o, width: 1.4 });
    for (let j = 0; j < 3; j++) {
      const pts = [];
      for (let x = 8; x <= 92; x += 4) pts.push([x * s, (82 + j * 5 + Math.sin(x / 4 + j) * 2) * s]);
      stroke(g, pts, { ...o, width: 1.4 });
    }
    ring(g, 78 * s, 20 * s, 7 * s, { ...o, width: 1.4 });
  },
  bust(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    ring(g, 50 * s, 40 * s, 20 * s, { ...o, squash: 1.2, n: 28 });
    stroke(g, [[44 * s, 62 * s], [42 * s, 72 * s], [18 * s, 84 * s], [14 * s, 95 * s]], o);
    stroke(g, [[56 * s, 62 * s], [58 * s, 72 * s], [82 * s, 84 * s], [86 * s, 95 * s]], o);
    stroke(g, quad([30 * s, 34 * s], [40 * s, 8 * s], [70 * s, 22 * s]), o);
    stroke(g, quad([70 * s, 22 * s], [76 * s, 30 * s], [70 * s, 44 * s]), o);
    hatch(g, 30 * s, 12 * s, 40 * s, 18 * s, { angle: Math.PI / 3, spacing: 3 * s, width: 1, wobble: 0.6, broken: 0.2, rng, alpha: 0.7 });
    dot(g, 43 * s, 40 * s, 1.6 * s);
    dot(g, 57 * s, 40 * s, 1.6 * s);
    stroke(g, [[50 * s, 40 * s], [47 * s, 50 * s], [52 * s, 51 * s]], { ...o, width: 1.4 });
    inkLine(g, 45 * s, 57 * s, 55 * s, 57 * s, { ...o, width: 1.4 });
    hatch(g, 8 * s, 8 * s, 40 * s, 86 * s, { angle: Math.PI / 2, spacing: 5 * s, width: 1, wobble: 0.6, broken: 0.4, rng, alpha: 0.35 });
  },
  mountains(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    stroke(g, [[6 * s, 84 * s], [34 * s, 30 * s], [50 * s, 58 * s], [66 * s, 22 * s], [94 * s, 84 * s]], o);
    inkLine(g, 6 * s, 84 * s, 94 * s, 84 * s, o);
    stroke(g, [[26 * s, 44 * s], [32 * s, 40 * s], [36 * s, 44 * s], [40 * s, 40 * s]], { ...o, width: 1.4 });
    stroke(g, [[58 * s, 36 * s], [63 * s, 32 * s], [67 * s, 36 * s], [72 * s, 32 * s]], { ...o, width: 1.4 });
    hatch(g, 50 * s, 30 * s, 44 * s, 54 * s, { angle: Math.PI / 3, spacing: 5 * s, width: 1, wobble: 0.6, broken: 0.4, rng, alpha: 0.5 });
    ring(g, 20 * s, 22 * s, 8 * s, { ...o, width: 1.4 });
    for (let i = 0; i < 4; i++) {
      const x = 12 + i * 22;
      stroke(g, [[x * s, 84 * s], [(x + 4) * s, 74 * s], [(x + 8) * s, 84 * s]], { ...o, width: 1.4 });
    }
  },
  bird(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    ring(g, 52 * s, 48 * s, 16 * s, { ...o, squash: 0.75, n: 24 });
    ring(g, 68 * s, 36 * s, 8 * s, { ...o, n: 14 });
    stroke(g, [[75 * s, 35 * s], [84 * s, 37 * s], [75 * s, 39 * s]], { ...o, width: 1.6 });
    dot(g, 70 * s, 34 * s, 1.6 * s);
    stroke(g, [[38 * s, 46 * s], [22 * s, 40 * s], [24 * s, 50 * s]], { ...o, close: true });
    stroke(g, quad([44 * s, 40 * s], [52 * s, 30 * s], [64 * s, 44 * s]), { ...o, width: 1.6 });
    inkLine(g, 48 * s, 60 * s, 46 * s, 70 * s, { ...o, width: 1.4 });
    inkLine(g, 56 * s, 60 * s, 56 * s, 70 * s, { ...o, width: 1.4 });
    stroke(g, [[8 * s, 76 * s], [40 * s, 70 * s], [70 * s, 72 * s], [92 * s, 66 * s]], o);
    for (const [x, y, f] of [[20, 72, 1], [34, 70, -1], [80, 68, 1]]) {
      stroke(g, [...quad([x * s, y * s], [(x + 6) * s, (y - 10 * f) * s], [(x + 12) * s, (y - 2) * s]), ...quad([(x + 12) * s, (y - 2) * s], [(x + 6) * s, (y - 2 * f) * s], [x * s, y * s])], { ...o, width: 1.4 });
    }
  },
  house(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    stroke(g, [[26 * s, 50 * s], [26 * s, 84 * s], [74 * s, 84 * s], [74 * s, 50 * s]], o);
    stroke(g, [[18 * s, 52 * s], [50 * s, 20 * s], [82 * s, 52 * s]], o);
    inkRect(g, 44 * s, 60 * s, 12 * s, 24 * s, { ...o, width: 1.6 });
    inkRect(g, 30 * s, 58 * s, 10 * s, 10 * s, { ...o, width: 1.4 });
    inkRect(g, 60 * s, 58 * s, 10 * s, 10 * s, { ...o, width: 1.4 });
    inkLine(g, 35 * s, 58 * s, 35 * s, 68 * s, { ...o, width: 1 });
    inkLine(g, 30 * s, 63 * s, 40 * s, 63 * s, { ...o, width: 1 });
    inkLine(g, 65 * s, 58 * s, 65 * s, 68 * s, { ...o, width: 1 });
    inkLine(g, 60 * s, 63 * s, 70 * s, 63 * s, { ...o, width: 1 });
    stroke(g, [[62 * s, 36 * s], [62 * s, 24 * s], [69 * s, 24 * s], [69 * s, 42 * s]], { ...o, width: 1.6 });
    stroke(g, quad([66 * s, 22 * s], [60 * s, 12 * s], [70 * s, 6 * s]), { ...o, width: 1.2 });
    hatch(g, 20 * s, 22 * s, 30 * s, 28 * s, { angle: -Math.PI / 4, spacing: 5 * s, width: 1, wobble: 0.5, broken: 0.3, rng, alpha: 0.5 });
    stroke(g, quad([50 * s, 84 * s], [40 * s, 90 * s], [12 * s, 94 * s]), { ...o, width: 1.4 });
    stroke(g, quad([50 * s, 84 * s], [60 * s, 90 * s], [24 * s, 94 * s]), { ...o, width: 1.4 });
  },
  zodiac(g, rng, s) {
    const o = { width: 2, wobble: 0.7, rng };
    const cx = 50 * s, cy = 50 * s;
    ring(g, cx, cy, 40 * s, { ...o, n: 40 });
    ring(g, cx, cy, 30 * s, { ...o, n: 36, width: 1.4 });
    ring(g, cx, cy, 10 * s, { ...o, n: 16, width: 1.4 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      inkLine(g, cx + Math.cos(a) * 30 * s, cy + Math.sin(a) * 30 * s, cx + Math.cos(a) * 40 * s, cy + Math.sin(a) * 40 * s, { ...o, width: 1.2 });
      const gx = cx + Math.cos(a + 0.26) * 35 * s, gy = cy + Math.sin(a + 0.26) * 35 * s;
      if (i % 3 === 0) ring(g, gx, gy, 2.5 * s, { ...o, n: 8, width: 1 });
      else if (i % 3 === 1) inkLine(g, gx - 2.5 * s, gy - 2 * s, gx + 2.5 * s, gy + 2 * s, { ...o, width: 1 });
      else stroke(g, [[gx - 2.5 * s, gy + 2 * s], [gx, gy - 2.5 * s], [gx + 2.5 * s, gy + 2 * s]], { ...o, width: 1 });
    }
    star(g, cx, cy, 6 * s, { ...o, width: 1.4 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.2;
      inkLine(g, cx + Math.cos(a) * 12 * s, cy + Math.sin(a) * 12 * s, cx + Math.cos(a) * 28 * s, cy + Math.sin(a) * 28 * s, { ...o, width: 1, alpha: 0.7 });
    }
  },
  teacup(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    stroke(g, [[28 * s, 46 * s], [32 * s, 70 * s], [64 * s, 70 * s], [70 * s, 46 * s]], o);
    ring(g, 49 * s, 46 * s, 21 * s, { ...o, squash: 0.3, n: 24 });
    stroke(g, quad([70 * s, 50 * s], [88 * s, 52 * s], [66 * s, 66 * s]), o);
    ring(g, 49 * s, 74 * s, 32 * s, { ...o, squash: 0.22, n: 30 });
    for (let j = 0; j < 3; j++) stroke(g, quad([(40 + j * 8) * s, 40 * s], [(46 + j * 8) * s, 28 * s], [(38 + j * 8) * s, 16 * s]), { ...o, width: 1.2 });
    dashes(g, 34 * s, 50 * s, 30 * s, 16 * s, { count: 14, len: 3 * s, width: 1.2, rng });
  },
  key(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    ring(g, 30 * s, 40 * s, 14 * s, { ...o, n: 20 });
    ring(g, 30 * s, 40 * s, 6 * s, { ...o, n: 12, width: 1.4 });
    inkLine(g, 43 * s, 44 * s, 84 * s, 66 * s, o);
    inkLine(g, 43 * s, 38 * s, 86 * s, 60 * s, o);
    stroke(g, [[84 * s, 66 * s], [80 * s, 76 * s], [76 * s, 74 * s], [74 * s, 66 * s], [70 * s, 70 * s], [67 * s, 62 * s]], { ...o, width: 1.8 });
    hatch(g, 10 * s, 10 * s, 80 * s, 80 * s, { angle: Math.PI / 2, spacing: 6 * s, width: 0.9, wobble: 0.6, broken: 0.5, rng, alpha: 0.2 });
  },
  cat(g, rng, s) {
    const o = { width: 2.2, wobble: 0.9, rng };
    ring(g, 50 * s, 60 * s, 30 * s, { ...o, squash: 0.7, n: 30 });
    ring(g, 66 * s, 40 * s, 13 * s, { ...o, n: 18 });
    stroke(g, [[57 * s, 32 * s], [58 * s, 20 * s], [66 * s, 28 * s]], { ...o, width: 1.6 });
    stroke(g, [[72 * s, 28 * s], [78 * s, 20 * s], [77 * s, 32 * s]], { ...o, width: 1.6 });
    inkLine(g, 62 * s, 38 * s, 65 * s, 38 * s, { ...o, width: 1.4 });
    inkLine(g, 69 * s, 38 * s, 72 * s, 38 * s, { ...o, width: 1.4 });
    stroke(g, quad([22 * s, 66 * s], [8 * s, 50 * s], [20 * s, 40 * s]), o);
    hatch(g, 30 * s, 48 * s, 30 * s, 24 * s, { angle: Math.PI / 2, spacing: 4 * s, width: 1, wobble: 0.6, broken: 0.5, rng, alpha: 0.5 });
  },
};
export const PICTURE_KINDS = Object.keys(PICTURES);

export function pictureTexture(kind, { seed = 1, w = 256, h = 256, mat = true } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, '#f9f6ef', { grain: 0.02, seed });
      // a mat with a fine ruled border, then the drawing in the middle
      const m = mat ? Math.round(Math.min(W, H) * 0.12) : 6;
      if (mat) {
        inkRect(g, m, m, W - 2 * m, H - 2 * m, { width: 1.2, wobble: 0.5, rng });
        inkRect(g, m + 5, m + 5, W - 2 * m - 10, H - 2 * m - 10, { width: 0.8, wobble: 0.4, rng, alpha: 0.7 });
      }
      const inner = Math.min(W, H) - 2 * m - 14;
      // the drawings are pen sketches: scale the context so the strokes stay bold at the frame's size
      const k = 1.9;
      g.save();
      g.translate((W - inner) / 2, (H - inner) / 2);
      g.scale(k, k);
      (PICTURES[kind] ?? PICTURES.zodiac)(g, rng, inner / 100 / k);
      g.restore();
    },
    { seed },
  );
}

// ---- signs -------------------------------------------------------------------------------------
export function measureLetters(g, text, size, tracking = 0.08, weight = 600, family = "'Futura', 'Jost', sans-serif") {
  g.save();
  g.font = `${weight} ${size}px ${family}`;
  const total = [...text].reduce((a, ch) => a + g.measureText(ch).width + size * tracking, 0) - size * tracking;
  g.restore();
  return total;
}
export function signTexture({ lines, w = 1024, h = 160, seed = 9, border = 'double', sizes = null }) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, '#f9f6ef', { grain: 0.02, seed });
      const o = { width: 2.4, wobble: 0.9, rng, overshoot: 4 };
      if (border === 'double') {
        inkRect(g, 10, 10, W - 20, H - 20, o);
        inkRect(g, 20, 20, W - 40, H - 40, { ...o, width: 1.4 });
      } else if (border === 'single') inkRect(g, 8, 8, W - 16, H - 16, { ...o, width: 3 });
      const n = lines.length;
      lines.forEach((t, i) => {
        let size = sizes?.[i] ?? (i === 0 ? H * (n === 1 ? 0.55 : 0.42) : H * 0.18);
        const tracking = i === 0 ? 0.18 : 0.22, weight = i === 0 ? 700 : 500;
        // fit the line inside the border
        for (let k = 0; k < 4; k++) {
          const tw = measureLetters(g, t, size, tracking, weight);
          if (tw <= W * 0.86) break;
          size *= (W * 0.86) / tw;
        }
        const y = n === 1 ? H / 2 : i === 0 ? H * 0.4 : H * 0.4 + size * 0.5 + (H * 0.42) / 2 + (i - 1) * size * 1.4 + size * 0.5;
        letter(g, t, W / 2, y, { size, rng, tracking, jitter: 1.6, weight });
      });
      // corner flourishes
      for (const [x, y] of [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]]) star(g, x, y, 7, { width: 1.4, wobble: 0.4, rng });
    },
    { seed },
  );
}

// ---- radio front ---------------------------------------------------------------------------------
export function radioTexture(seed = 12) {
  return drawTexture(
    512,
    320,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0.02, seed });
      const o = { width: 2, wobble: 0.7, rng };
      // speaker grille: a circle filled with a woven grid
      const gx = 128, gy = 150, gr = 96;
      g.save();
      g.beginPath();
      g.arc(gx, gy, gr - 4, 0, Math.PI * 2);
      g.clip();
      hatch(g, gx - gr, gy - gr, gr * 2, gr * 2, { angle: 0, spacing: 11, width: 1.4, wobble: 0.5, broken: 0, rng, alpha: 0.85, jitter: 0.5 });
      hatch(g, gx - gr, gy - gr, gr * 2, gr * 2, { angle: Math.PI / 2, spacing: 11, width: 1.4, wobble: 0.5, broken: 0, rng, alpha: 0.85, jitter: 0.5 });
      g.restore();
      ring(g, gx, gy, gr, { ...o, n: 48, width: 2.4 });
      ring(g, gx, gy, gr + 8, { ...o, n: 48, width: 1.4 });
      // dial window with a scale
      const dx = 262, dy = 96, dw = 220, dh = 70;
      inkRect(g, dx, dy, dw, dh, o);
      inkRect(g, dx + 5, dy + 5, dw - 10, dh - 10, { ...o, width: 1 });
      inkLine(g, dx + 14, dy + dh * 0.55, dx + dw - 14, dy + dh * 0.55, { ...o, width: 1.6 });
      const marks = ['54', '60', '70', '80', '100', '120', '160'];
      marks.forEach((m, i) => {
        const x = dx + 20 + (i / (marks.length - 1)) * (dw - 40);
        inkLine(g, x, dy + dh * 0.55 - 8, x, dy + dh * 0.55 + 6, { ...o, width: 1.4 });
        letter(g, m, x, dy + 20, { size: 13, rng, tracking: 0.04, jitter: 0.6, weight: 600 });
      });
      for (let i = 0; i < 25; i++) {
        const x = dx + 20 + (i / 24) * (dw - 40);
        inkLine(g, x, dy + dh * 0.55 - 3, x, dy + dh * 0.55 + 3, { ...o, width: 1 });
      }
      // the needle, sitting on a station
      inkLine(g, dx + 96, dy + 10, dx + 96, dy + dh - 10, { ...o, width: 2.4 });
      letter(g, 'PARIS · INTER', dx + dw / 2, dy + dh - 12, { size: 11, rng, tracking: 0.18, jitter: 0.5, weight: 500 });
      // knob rings (the knobs themselves are geometry)
      for (const kx of [300, 360, 420]) ring(g, kx, 228, 22, { ...o, n: 24 });
      letter(g, 'RADIOLA', 372, 282, { size: 20, rng, tracking: 0.28, jitter: 0.8, weight: 700 });
      inkLine(g, 300, 296, 444, 296, { ...o, width: 1.2 });
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
      paper(g, W, H, '#f9f6ef', { grain: 0.02, seed });
      const o = { width: 1.8, wobble: 0.6, rng };
      const cx = 128, cy = 128;
      ring(g, cx, cy, 112, { ...o, n: 60, width: 2.2 });
      ring(g, cx, cy, 104, { ...o, n: 60, width: 1.2 });
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const r0 = i % 5 ? 96 : 88, r1 = 102;
        inkLine(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, { ...o, width: i % 5 ? 1 : 2 });
      }
      const nums = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      nums.forEach((n, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        letter(g, n, cx + Math.cos(a) * 72, cy + Math.sin(a) * 72, { size: 18, rng, tracking: 0.02, jitter: 0.6, weight: 600 });
      });
      letter(g, 'BRILLAT', cx, cy - 34, { size: 10, rng, tracking: 0.3, jitter: 0.4, weight: 500 });
      letter(g, 'PARIS', cx, cy + 40, { size: 9, rng, tracking: 0.3, jitter: 0.4, weight: 500 });
      dot(g, cx, cy, 5);
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
      paper(g, W, H, '#f3eee4', { grain: 0.02, seed });
      const o = { width: 2.2, wobble: 0.9, rng };
      // bands: a heavy outer rule, a fine inner one, and the border between them
      const b0 = 22, b1 = 118;
      inkRect(g, b0, b0, W - 2 * b0, H - 2 * b0, { ...o, width: 3.2, overshoot: 0 });
      inkRect(g, b0 + 10, b0 + 10, W - 2 * b0 - 20, H - 2 * b0 - 20, { ...o, width: 1.4, overshoot: 0 });
      inkRect(g, b1, b1, W - 2 * b1, H - 2 * b1, { ...o, width: 2.4, overshoot: 0 });
      inkRect(g, b1 + 10, b1 + 10, W - 2 * b1 - 20, H - 2 * b1 - 20, { ...o, width: 1.2, overshoot: 0 });
      // the border: a running scroll — loops that curl alternately up and down, with a leaf in each
      const scroll = (x0, y0, x1, y1, n) => {
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len; // along
        const nx = -uy, ny = ux; // across
        const pitch = len / n;
        const amp = 22;
        for (let i = 0; i < n; i++) {
          const s = i % 2 ? 1 : -1;
          const cxp = x0 + ux * pitch * (i + 0.5), cyp = y0 + uy * pitch * (i + 0.5);
          const pts = [];
          // a spiral: 1.5 turns in, drawn as a polyline
          for (let k = 0; k <= 18; k++) {
            const a = (k / 18) * Math.PI * 2.4;
            const r = amp * (1 - k / 22);
            const px = Math.cos(a) * r, py = Math.sin(a) * r * s;
            pts.push([cxp + ux * px + nx * py, cyp + uy * px + ny * py]);
          }
          stroke(g, pts, { ...o, width: 2 });
          // a small leaf off the loop
          const lx = cxp + ux * pitch * 0.5, ly = cyp + uy * pitch * 0.5;
          const tip = [lx + nx * s * -amp * 0.9, ly + ny * s * -amp * 0.9];
          stroke(g, [...quad([lx, ly], [lx + ux * 14 + nx * s * -8, ly + uy * 14 + ny * s * -8], tip), ...quad(tip, [lx - ux * 14 + nx * s * -8, ly - uy * 14 + ny * s * -8], [lx, ly])], { ...o, width: 1.5 });
        }
      };
      const mid = (b0 + b1) / 2 + 5;
      scroll(mid + 40, mid, W - mid - 40, mid, 14);
      scroll(mid + 40, H - mid, W - mid - 40, H - mid, 14);
      scroll(mid, mid + 40, mid, H - mid - 40, 10);
      scroll(W - mid, mid + 40, W - mid, H - mid - 40, 10);
      // corner rosettes
      for (const [x, y] of [[mid, mid], [W - mid, mid], [mid, H - mid], [W - mid, H - mid]]) {
        ring(g, x, y, 22, { ...o, n: 18, width: 2 });
        star(g, x, y, 12, { ...o, width: 1.4 });
      }
      // a quiet field with one small central medallion
      const cx = W / 2, cy = H / 2;
      for (const [rx, ry, w] of [[120, 76, 2.2], [100, 62, 1.2]]) stroke(g, [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]], { ...o, width: w, close: true });
      star(g, cx, cy, 18, { ...o, width: 1.6 });
      for (const [ddx, ddy] of [[-80, 0], [80, 0], [0, -48], [0, 48]]) ring(g, cx + ddx, cy + ddy, 8, { ...o, n: 10, width: 1.4 });
    },
    { seed },
  );
}

// ---- curtains: a printed vine, repeated ------------------------------------------------------------
export function curtainTexture(seed = 15) {
  return drawTexture(
    256,
    512,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f4ec', { grain: 0.02, seed });
      const o = { width: 1.5, wobble: 0.8, rng };
      // three wavering vines with leaves either side
      for (let v = 0; v < 3; v++) {
        const x0 = 40 + v * 88;
        const pts = [];
        for (let y = -10; y <= H + 10; y += 12) pts.push([x0 + Math.sin(y / 60 + v) * 14, y]);
        stroke(g, pts, { ...o, width: 1.2 });
        for (let y = 20; y < H; y += 46) {
          const x = x0 + Math.sin(y / 60 + v) * 14;
          const side = ((y / 46) | 0) % 2 ? 1 : -1;
          const tip = [x + side * 26, y - 14];
          stroke(g, [...quad([x, y], [x + side * 8, y - 22], tip), ...quad(tip, [x + side * 24, y + 2], [x, y])], o);
          inkLine(g, x, y, tip[0] - side * 4, tip[1] + 3, { ...o, width: 0.8 });
          if (rng() < 0.5) {
            const bx = x - side * 12, by = y + 16;
            ring(g, bx, by, 4, { ...o, n: 8, width: 1 });
            ring(g, bx + 6, by + 5, 3.5, { ...o, n: 8, width: 1 });
            ring(g, bx - 4, by + 7, 3, { ...o, n: 8, width: 1 });
          }
        }
      }
    },
    { repeat: [1, 2], seed },
  );
}

// ---- leaves (alpha cut) ----------------------------------------------------------------------------
export function leafTexture({ kind = 'palm', seed = 16 } = {}) {
  const t = drawTexture(
    128,
    256,
    (g, W, H, rng) => {
      g.clearRect(0, 0, W, H);
      const o = { width: 2, wobble: 0.8, rng };
      const cx = W / 2;
      let outline;
      if (kind === 'palm') {
        // a long frond with notched edges
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
      } else if (kind === 'monstera') {
        outline = [];
        for (let i = 0; i <= 16; i++) {
          const u = i / 16;
          const y = 8 + u * (H - 16);
          const w = Math.sin(u * Math.PI * 0.9 + 0.2) * (W * 0.46) * (i % 3 === 1 ? 0.55 : 1);
          outline.push([cx + w, y]);
        }
        for (let i = 16; i >= 0; i--) {
          const u = i / 16;
          const y = 8 + u * (H - 16);
          const w = Math.sin(u * Math.PI * 0.9 + 0.2) * (W * 0.46) * (i % 3 === 2 ? 0.55 : 1);
          outline.push([cx - w, y]);
        }
      } else {
        outline = [...quad([cx, 8], [W * 0.98, H * 0.45], [cx, H - 8], 14), ...quad([cx, H - 8], [W * 0.02, H * 0.45], [cx, 8], 14)];
      }
      fillPoly(g, outline, PAPER);
      stroke(g, outline, { ...o, close: true });
      inkLine(g, cx, 10, cx, H - 10, { ...o, width: 1.6 });
      for (let y = 30; y < H - 20; y += 22) {
        const w = Math.sin(((y - 8) / (H - 16)) * Math.PI) * W * 0.36;
        inkLine(g, cx, y, cx + w, y - 14, { ...o, width: 1 });
        inkLine(g, cx, y + 8, cx - w, y - 6, { ...o, width: 1 });
      }
    },
    { seed },
  );
  return t;
}

// ---- lamp fringe (alpha cut): dangling threads under a shade ---------------------------------------
export function fringeTexture(seed = 17) {
  return drawTexture(
    512,
    64,
    (g, W, H, rng) => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, 8);
      inkLine(g, 0, 4, W, 4, { width: 2, wobble: 0.4, rng });
      for (let x = 3; x < W; x += 7) inkLine(g, x, 8, x + (rng() - 0.5) * 4, H - 4 - rng() * 10, { width: 1.6, wobble: 1, rng });
    },
    { repeat: [6, 1], seed },
  );
}
export function shadeTexture(seed = 18) {
  return drawTexture(
    512,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, '#faf7f0', { grain: 0.02, seed });
      // pleats
      hatch(g, 0, 0, W, H, { angle: Math.PI / 2, spacing: 16, width: 1.2, wobble: 0.5, broken: 0, rng, alpha: 0.7, jitter: 0.6 });
      inkLine(g, 0, 10, W, 10, { width: 1.6, wobble: 0.6, rng });
      inkLine(g, 0, H - 10, W, H - 10, { width: 1.6, wobble: 0.6, rng });
    },
    { repeat: [3, 1], seed },
  );
}
export function catTexture(seed = 19) {
  return drawTexture(
    256,
    128,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0.02, seed });
      for (let i = 0; i < 9; i++) {
        const x = 12 + i * 28;
        for (let k = 0; k < 4; k++) inkLine(g, x + k * 3, 6 + k * 3, x + 8 + (rng() - 0.5) * 6, 40 + k * 6, { width: 2.2, wobble: 1.2, rng, alpha: 0.85 });
      }
      dashes(g, 0, 60, W, 60, { count: 60, len: 6, width: 1.2, angle: Math.PI / 2, angleJitter: 0.3, rng, alpha: 0.5 });
    },
    { repeat: [2, 1], seed },
  );
}
export function potTexture(seed = 20) {
  return drawTexture(
    512,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0.02, seed });
      const o = { width: 1.8, wobble: 0.7, rng };
      inkLine(g, 0, 40, W, 40, o);
      inkLine(g, 0, 84, W, 84, o);
      for (let x = 0; x < W; x += 32) {
        stroke(g, [[x, 82], [x + 16, 46], [x + 32, 82]], { ...o, width: 1.4 });
        dot(g, x + 16, 66, 2.4);
      }
      inkLine(g, 0, 200, W, 200, { ...o, width: 1.2 });
      for (let x = 8; x < W; x += 24) ring(g, x, 216, 5, { ...o, n: 8, width: 1 });
    },
    { repeat: [2, 1], seed },
  );
}
export function paperStackTexture(seed = 21) {
  return drawTexture(
    256,
    128,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f5ee', { grain: 0.02, seed });
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
      paper(g, W, H, '#f8f5ee', { grain: 0.02, seed });
      letter(g, 'LE SOIR', W / 2, 30, { size: 34, rng, tracking: 0.12, jitter: 1, weight: 700 });
      inkLine(g, 14, 52, W - 14, 52, { width: 2, wobble: 0.6, rng });
      inkLine(g, 14, 56, W - 14, 56, { width: 1, wobble: 0.6, rng });
      for (let c = 0; c < 3; c++) {
        const x = 16 + c * 78;
        for (let y = 70; y < H - 10; y += 7) inkLine(g, x, y, x + 60 - rng() * 14, y, { width: 1.1, wobble: 0.5, rng, alpha: 0.75 });
      }
      inkRect(g, 96, 70, 64, 50, { width: 1.4, wobble: 0.5, rng });
      crossHatch(g, 98, 72, 60, 46, { spacing: 5, width: 0.8, wobble: 0.4, broken: 0.2, rng, alpha: 0.5 });
    },
    { seed },
  );
}
export function globeTexture(seed = 23) {
  return drawTexture(
    512,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f5ee', { grain: 0.02, seed });
      const o = { width: 1.4, wobble: 0.8, rng };
      for (let i = 0; i <= 12; i++) inkLine(g, (i / 12) * W, 0, (i / 12) * W, H, { ...o, alpha: 0.7 });
      for (let j = 1; j < 6; j++) inkLine(g, 0, (j / 6) * H, W, (j / 6) * H, { ...o, alpha: 0.7, width: j === 3 ? 2 : 1.2 });
      // some continents, scribbled
      const blobs = [[70, 90, 40, 60], [150, 150, 36, 40], [270, 80, 90, 50], [300, 140, 40, 40], [420, 170, 40, 26], [380, 100, 50, 32]];
      for (const [x, y, rx, ry] of blobs) {
        ring(g, x, y, rx, { ...o, squash: ry / rx, n: 24, wob: 0.25, width: 1.8 });
        hatch(g, x - rx, y - ry, rx * 2, ry * 2, { angle: Math.PI / 3, spacing: 5, width: 0.8, wobble: 0.5, broken: 0.4, rng, alpha: 0.5 });
      }
    },
    { seed },
  );
}
// a pinned note: a few lines of scribbled writing, sometimes a small sketch
export function noteTexture({ seed = 25, w = 128, h = 96, kind = 'lines', tint = '#f8f5ee' } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, tint, { grain: 0.02, seed });
      const o = { width: 1.6, wobble: 0.6, rng };
      if (kind === 'lines') {
        for (let y = 18; y < H - 8; y += 12) inkLine(g, 10, y, W - 10 - rng() * 40, y + (rng() - 0.5) * 3, { ...o, width: 1.4, alpha: 0.85 });
      } else if (kind === 'card') {
        inkRect(g, 8, 8, W - 16, H - 16, o);
        inkRect(g, 14, 14, W - 28, H - 28, { ...o, width: 0.9 });
        star(g, W / 2, H / 2, Math.min(W, H) * 0.22, o);
      } else if (kind === 'number') {
        letter(g, String(3 + Math.floor(rng() * 20)), W / 2, H / 2, { size: H * 0.6, rng, weight: 700, jitter: 1 });
      } else {
        ring(g, W / 2, H * 0.45, Math.min(W, H) * 0.28, { ...o, n: 20 });
        for (let y = H * 0.8; y < H - 4; y += 8) inkLine(g, 12, y, W - 12, y, { ...o, width: 1.2 });
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
      paper(g, W, H, '#f4efe4', { grain: 0.02, seed });
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
      const o = { width: 1.4, wobble: 0.5, rng };
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
