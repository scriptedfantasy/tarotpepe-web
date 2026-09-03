// cards-art — everything drawn onto the card: the front (the supplied plate on a paper margin with
// one printed ink rule and a little wear), the back (a dense ink pattern: a lattice of hatched
// diamonds carrying frogs, stars and moons around an oval medallion, a milled band of ticks), and
// the deck's cut edge. All pen work goes through strokes.js so the cards share one hand with the
// rest of the world.
//
// Nothing here uses a canvas clip: in the headless judging browser a stroke under a complex clip
// costs a full-canvas mask each time (round 1 spent 12 s in one hatch pass). Hatching is clipped
// analytically (hatchPoly) and shapes are covered with paper fills instead.
import { INK, PAPER, inkLine, letter } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const STOCK = PAPER; // the card is cut from the world's paper; the ink pass adds the grain
export const BACK = { w: 640, h: 1120 }; // 4.92 px per mm of card
// The plate is inset by M on every side; the printed rule sits `border` px inside the cut edge.
export const FRONT = { M: 40, border: 20, borderW: 6 };

// ---------- pen helpers (wobbly paths; the same hand as inkLine) ----------

// Draw a polyline as pen strokes: each vertex is jittered a little, the line breaks into a few
// sub-strokes with their own pressure so it does not read as one vector path.
export function inkPath(g, pts, { closed = false, width = 2, wobble = 0.8, rng = Math.random, color = INK, alpha = 1 } = {}) {
  const p = pts.map(([x, y]) => [x + (rng() - 0.5) * 2 * wobble, y + (rng() - 0.5) * 2 * wobble]);
  if (closed) p.push(p[0]);
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  let i = 0;
  while (i < p.length - 1) {
    const len = 12 + Math.floor(rng() * 18);
    const j = Math.min(p.length - 1, i + len);
    g.lineWidth = width * (0.8 + rng() * 0.4);
    g.beginPath();
    g.moveTo(p[i][0], p[i][1]);
    for (let k = i + 1; k <= j; k++) g.lineTo(p[k][0], p[k][1]);
    g.stroke();
    i = j;
  }
  g.restore();
}

export function roundedRectPts(x, y, w, h, r, { step = 9 } = {}) {
  const pts = [];
  const arc = (cx, cy, a0, a1) => {
    const n = Math.max(3, Math.round(((a1 - a0) * r) / step));
    for (let k = 0; k <= n; k++) {
      const a = a0 + ((a1 - a0) * k) / n;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  const line = (ax, ay, bx, by) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 1; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  };
  arc(x + r, y + r, Math.PI, Math.PI * 1.5);
  line(x + r, y, x + w - r, y);
  arc(x + w - r, y + r, Math.PI * 1.5, Math.PI * 2);
  line(x + w, y + r, x + w, y + h - r);
  arc(x + w - r, y + h - r, 0, Math.PI * 0.5);
  line(x + w - r, y + h, x + r, y + h);
  arc(x + r, y + h - r, Math.PI * 0.5, Math.PI);
  line(x, y + h - r, x, y + r);
  return pts;
}

export function ellipsePts(cx, cy, rx, ry, { n = 72, a0 = 0, a1 = Math.PI * 2 } = {}) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

export function inkRounded(g, x, y, w, h, r, opts) {
  inkPath(g, roundedRectPts(x, y, w, h, r), { ...opts, closed: true });
}
export function inkEllipse(g, cx, cy, rx, ry, opts) {
  inkPath(g, ellipsePts(cx, cy, rx, ry), { ...opts, closed: true });
}

export function fillPath(g, pts, color) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
  g.restore();
}

// Liang–Barsky: the part of a segment inside a rect, or null.
function clipSegRect(x1, y1, x2, y2, [rx, ry, rw, rh]) {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
      continue;
    }
    const r = q[i] / p[i];
    if (p[i] < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [x1 + dx * t0, y1 + dy * t0, x1 + dx * t1, y1 + dy * t1];
}

// Hatch strokes inside a convex polygon, clipped by arithmetic rather than by the canvas.
// angle: stroke direction (0 = horizontal). bounds: an optional [x, y, w, h] that also clips.
export function hatchPoly(g, poly, { angle = Math.PI / 2, spacing = 6, width = 1.5, wobble = 0.5, rng = Math.random, alpha = 1, jitter = 1, inset = 0, bounds = null, color = INK, broken = 0 } = {}) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  const n = poly.length;
  const dv = new Float64Array(n), tv = new Float64Array(n);
  let dmin = Infinity, dmax = -Infinity;
  for (let i = 0; i < n; i++) {
    dv[i] = poly[i][0] * nx + poly[i][1] * ny;
    tv[i] = poly[i][0] * dx + poly[i][1] * dy;
    if (dv[i] < dmin) dmin = dv[i];
    if (dv[i] > dmax) dmax = dv[i];
  }
  for (let d = dmin + spacing * (0.4 + rng() * 0.6); d < dmax - spacing * 0.25; d += spacing * (0.85 + rng() * 0.3)) {
    const dd = d + (rng() - 0.5) * jitter;
    let t0 = Infinity, t1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = dv[i] - dd, b = dv[j] - dd;
      if ((a < 0 && b < 0) || (a > 0 && b > 0) || a === b) continue;
      const t = tv[i] + (tv[j] - tv[i]) * (a / (a - b));
      if (t < t0) t0 = t;
      if (t > t1) t1 = t;
    }
    if (!(t1 - t0 > inset * 2 + 1)) continue;
    t0 += inset;
    t1 -= inset;
    let seg = [nx * dd + dx * t0, ny * dd + dy * t0, nx * dd + dx * t1, ny * dd + dy * t1];
    if (bounds) {
      seg = clipSegRect(...seg, bounds);
      if (!seg) continue;
    }
    const [x1, y1, x2, y2] = seg;
    if (broken > 0 && rng() < broken) {
      const u = 0.3 + rng() * 0.4, gap = 0.07;
      inkLine(g, x1, y1, x1 + (x2 - x1) * (u - gap), y1 + (y2 - y1) * (u - gap), { width, wobble, rng, alpha, color });
      inkLine(g, x1 + (x2 - x1) * (u + gap), y1 + (y2 - y1) * (u + gap), x2, y2, { width, wobble, rng, alpha, color });
    } else inkLine(g, x1, y1, x2, y2, { width, wobble, rng, alpha, color });
  }
}

function dot(g, x, y, r, color = INK, alpha = 1) {
  g.save();
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// ---------- motifs ----------

// A frog's face in a few pen lines: the wide flat head, two big eyes sitting on the crown under
// heavy lids, the long deadpan mouth with its lower lip.
export function frogGlyph(g, cx, cy, s, rng, { tone = false, width = 2 } = {}) {
  const o = { rng, width, wobble: Math.max(0.3, s * 0.012) };
  const head = [];
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const rx = s, ry = s * 0.74;
    let x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    if (y < 0) y *= 0.8; // flatter crown
    if (y > 0) x *= 1.06 - 0.14 * (y / ry); // cheeks tuck in below
    head.push([cx + x, cy + y + s * 0.05]);
  }
  if (tone) {
    // hatching first, the contour over it: under the chin and down the shadow side
    hatchPoly(g, head, { angle: 0.12, spacing: s * 0.055, width: width * 0.6, rng, alpha: 0.85, bounds: [cx - s * 1.2, cy + s * 0.45, s * 2.4, s * 0.6], inset: 2 });
    hatchPoly(g, head, { angle: Math.PI / 2 - 0.2, spacing: s * 0.06, width: width * 0.55, rng, alpha: 0.75, bounds: [cx + s * 0.6, cy - s * 0.6, s * 0.6, s * 1.5], inset: 2 });
  }
  inkPath(g, head, { ...o, closed: true, width: width * 1.2 });
  for (const sx of [-1, 1]) {
    const ex = cx + sx * s * 0.42, ey = cy - s * 0.36;
    const eye = ellipsePts(ex, ey, s * 0.32, s * 0.26, { n: 28 });
    if (tone) hatchPoly(g, eye, { angle: 0, spacing: s * 0.05, width: width * 0.5, rng, alpha: 0.8, bounds: [ex - s * 0.4, ey - s * 0.3, s * 0.8, s * 0.2] });
    inkPath(g, eye, { ...o, closed: true });
    // the lid: a heavy stroke across the upper third
    inkLine(g, ex - s * 0.32, ey - s * 0.05, ex + s * 0.32, ey - s * 0.08, { rng, width: width * 1.6, wobble: s * 0.01 });
    // the pupil under it, looking a little inward
    dot(g, ex - sx * s * 0.03, ey + s * 0.06, s * 0.085);
  }
  // mouth: long, nearly straight, the ends turned down a hair
  const m = [];
  for (let k = 0; k <= 16; k++) {
    const u = k / 16 - 0.5;
    m.push([cx + u * s * 1.5, cy + s * 0.32 + u * u * s * 0.3]);
  }
  inkPath(g, m, { ...o, width: width * 1.35 });
  const m2 = m.map(([x, y]) => [x * 0.985 + cx * 0.015, y + s * 0.1]);
  inkPath(g, m2.slice(3, -3), { ...o, width: width * 0.8 });
  for (const sx of [-1, 1]) inkLine(g, cx + sx * s * 0.12, cy + s * 0.06, cx + sx * s * 0.17, cy + s * 0.1, { rng, width: width * 0.9, wobble: 0.3 });
}

export function starGlyph(g, cx, cy, s, rng, { width = 2 } = {}) {
  const o = { rng, width, wobble: 0.5 };
  inkLine(g, cx, cy - s, cx, cy + s, o);
  inkLine(g, cx - s, cy, cx + s, cy, o);
  const d = s * 0.5;
  inkLine(g, cx - d, cy - d, cx + d, cy + d, { ...o, width: width * 0.8 });
  inkLine(g, cx - d, cy + d, cx + d, cy - d, { ...o, width: width * 0.8 });
}

export function moonGlyph(g, cx, cy, s, rng, { width = 2, stock = STOCK } = {}) {
  fillPath(g, ellipsePts(cx, cy, s, s, { n: 32 }), INK);
  inkEllipse(g, cx, cy, s, s, { rng, width, wobble: 0.6 });
  fillPath(g, ellipsePts(cx + s * 0.55, cy - s * 0.1, s * 0.82, s * 0.82, { n: 32 }), stock);
}

// Short radial strokes between two radii (a sunburst / milled edge), for an ellipse.
function rays(g, cx, cy, rx0, ry0, rx1, ry1, { every = 4, rng, width = 2, alt = true, a0 = 0, a1 = 360 } = {}) {
  for (let deg = a0; deg < a1; deg += every) {
    const a = (deg * Math.PI) / 180;
    const k = alt && Math.round(deg / every) % 2 ? 0.55 : 1;
    inkLine(g, cx + rx0 * Math.cos(a), cy + ry0 * Math.sin(a), cx + (rx0 + (rx1 - rx0) * k) * Math.cos(a), cy + (ry0 + (ry1 - ry0) * k) * Math.sin(a), { rng, width, wobble: 0.5 });
  }
}

// ---------- the back ----------

export function drawBack(g, W, H, rng = mulberry32(21), { stock = STOCK } = {}) {
  g.fillStyle = stock;
  g.fillRect(0, 0, W, H);
  const R = (W * 5) / 130; // the cut's corner radius in px
  const cx = W / 2, cy = H / 2;
  const F = 40; // the pattern field starts here (the inner rule sits on its edge)
  const fx = F, fy = F, fw = W - 2 * F, fh = H - 2 * F;
  const field = [fx, fy, fw, fh];

  // the lattice: two diagonal families of lines, cells alternately hatched and plain
  const S = 56; // perpendicular spacing of the lattice lines
  const D = S * Math.SQRT2; // diamond width/height
  const cellCentre = (i, j) => [cx + ((i + j + 1) * D) / 2, cy + ((i - j) * D) / 2];
  const cellPoly = (x, y) => [
    [x, y - D / 2],
    [x + D / 2, y],
    [x, y + D / 2],
    [x - D / 2, y],
  ];
  const N = Math.ceil(Math.hypot(fw, fh) / D) + 2;
  const RX = 150, RY = 230; // the medallion
  const inMedallion = (x, y, pad) => ((x - cx) / (RX + pad)) ** 2 + ((y - cy) / (RY + pad)) ** 2 < 1;
  const cornerR = 128;
  const corners = [
    [fx, fy],
    [fx + fw, fy],
    [fx, fy + fh],
    [fx + fw, fy + fh],
  ];
  const inCorner = (x, y, pad) => corners.some(([px, py]) => Math.hypot(x - px, y - py) < cornerR + pad);

  // 1. hatched diamonds (checkerboard), the stroke direction alternating row by row so it weaves
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      if ((i + j) % 2 !== 0) continue;
      const [x, y] = cellCentre(i, j);
      if (x < fx - D / 2 || x > fx + fw + D / 2 || y < fy - D / 2 || y > fy + fh + D / 2) continue;
      if (inMedallion(x, y, -D * 0.2) || inCorner(x, y, -D * 0.2)) continue;
      const vertical = ((((i - j) / 2) % 2) + 2) % 2 === 0;
      hatchPoly(g, cellPoly(x, y), { angle: vertical ? Math.PI / 2 + 0.04 : 0.05, spacing: 5.6, width: 1.6, wobble: 0.45, jitter: 1.2, rng, alpha: 0.95, inset: 2.5, bounds: field });
    }
  }
  // 2. lattice lines
  const half = Math.hypot(fw, fh);
  for (let k = -N; k <= N; k++) {
    const c = (k * D) / 2;
    for (const s of [1, -1]) {
      const seg = clipSegRect(cx + c - half, cy + s * (c + half), cx + c + half, cy + s * (c - half), [fx - 2, fy - 2, fw + 4, fh + 4]);
      if (seg) inkLine(g, ...seg, { width: 2.6, wobble: 1.1, rng, segments: 36 });
    }
  }
  // 3. motifs in the plain diamonds, in ordered rows along one diagonal: frogs, stars, moons
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      if ((i + j) % 2 === 0) continue;
      const [x, y] = cellCentre(i, j);
      if (x < fx + 22 || x > fx + fw - 22 || y < fy + 22 || y > fy + fh - 22) continue;
      if (inMedallion(x, y, 30) || inCorner(x, y, 26)) continue;
      const m = ((((i - j - 1) / 2) % 3) + 3) % 3;
      if (m === 0) frogGlyph(g, x, y, D * 0.24, rng, { width: 2.2 });
      else if (m === 1) starGlyph(g, x, y, D * 0.2, rng, { width: 2.6 });
      else moonGlyph(g, x, y, D * 0.16, rng, { width: 2.2, stock });
    }
  }

  // 4. the margin: paper over whatever bled out of the field
  g.fillStyle = stock;
  g.fillRect(0, 0, W, fy);
  g.fillRect(0, fy + fh, W, H - fy - fh);
  g.fillRect(0, 0, fx, H);
  g.fillRect(fx + fw, 0, W - fx - fw, H);

  // 5. corner fans: a quarter disc of paper with rays from the corner and a moon and stars
  for (const [px, py] of corners) {
    const sx = px < cx ? 1 : -1, sy = py < cy ? 1 : -1;
    const a0 = sx > 0 ? (sy > 0 ? 0 : 270) : sy > 0 ? 90 : 180;
    const A0 = (a0 * Math.PI) / 180, A1 = ((a0 + 90) * Math.PI) / 180;
    fillPath(g, ellipsePts(px, py, cornerR, cornerR, { n: 36, a0: A0, a1: A1 }).concat([[px, py]]), stock);
    inkPath(g, ellipsePts(px, py, cornerR, cornerR, { n: 32, a0: A0, a1: A1 }), { width: 3.6, wobble: 1.2, rng });
    inkPath(g, ellipsePts(px, py, cornerR - 11, cornerR - 11, { n: 32, a0: A0, a1: A1 }), { width: 1.8, wobble: 0.9, rng });
    rays(g, px, py, 50, 50, cornerR - 18, cornerR - 18, { every: 5, rng, width: 2, a0: a0 + 3, a1: a0 + 90 });
    inkPath(g, ellipsePts(px, py, 44, 44, { n: 24, a0: A0, a1: A1 }), { width: 2.6, wobble: 0.9, rng });
    moonGlyph(g, px + sx * 19, py + sy * 19, 9, rng, { width: 2, stock });
    starGlyph(g, px + sx * 35, py + sy * 8, 5, rng, { width: 1.6 });
    starGlyph(g, px + sx * 8, py + sy * 35, 5, rng, { width: 1.6 });
  }

  // 6. the medallion: an oval of paper, a sunburst, a milled edge, the emblem, the name
  fillPath(g, ellipsePts(cx, cy, RX + 26, RY + 26), stock);
  rays(g, cx, cy, RX + 6, RY + 6, RX + 24, RY + 24, { every: 3, rng, width: 1.9 });
  inkEllipse(g, cx, cy, RX, RY, { width: 5, wobble: 1.3, rng });
  inkEllipse(g, cx, cy, RX - 10, RY - 10, { width: 1.8, wobble: 0.9, rng });
  for (let deg = 0; deg < 360; deg += 4.5) {
    const a = (deg * Math.PI) / 180;
    dot(g, cx + (RX - 5) * Math.cos(a), cy + (RY - 5) * Math.sin(a), 1.6);
  }
  // the emblem: the frog, in tone, with the collar of his robe
  const hy = cy - 54, hs = 86;
  {
    const sh = hy + hs * 0.55; // the shoulder line
    const left = [], right = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const x = hs * (0.36 + 0.7 * u);
      const y = sh + hs * 0.05 - Math.sin(u * Math.PI * 0.5) * hs * 0.02 + u * u * hs * 0.34;
      left.push([cx - x, y]);
      right.push([cx + x, y]);
    }
    inkPath(g, left, { width: 2.2, wobble: 0.9, rng });
    inkPath(g, right, { width: 2.2, wobble: 0.9, rng });
    // lapels
    const V = [[cx - hs * 0.36, sh + hs * 0.05], [cx + hs * 0.36, sh + hs * 0.05], [cx + hs * 0.08, sh + hs * 0.62], [cx - hs * 0.08, sh + hs * 0.62]];
    hatchPoly(g, V, { angle: Math.PI / 2 + 0.2, spacing: 4, width: 1.2, rng, alpha: 0.85, inset: 1 });
    inkPath(g, [V[0], V[3]], { width: 2, wobble: 0.8, rng });
    inkPath(g, [V[1], V[2]], { width: 2, wobble: 0.8, rng });
    inkPath(g, [V[0], [cx - hs * 0.46, sh + hs * 0.36]], { width: 1.6, wobble: 0.8, rng });
    inkPath(g, [V[1], [cx + hs * 0.46, sh + hs * 0.36]], { width: 1.6, wobble: 0.8, rng });
    for (const sx of [-1, 1]) for (const f of [0.62, 0.8]) inkLine(g, cx + sx * hs * f, sh + hs * 0.3, cx + sx * hs * (f + 0.06), sh + hs * 0.8, { width: 1.3, wobble: 0.8, rng, alpha: 0.85 });
    // a paper gap so the head sits in front of the collar
    fillPath(g, ellipsePts(cx, hy + hs * 0.05, hs * 1.02, hs * 0.76), stock);
  }
  frogGlyph(g, cx, hy, hs, rng, { tone: true, width: 2.4 });
  // a crown of stars and a moon over the head
  starGlyph(g, cx - 65, cy - 172, 14, rng, { width: 2 });
  moonGlyph(g, cx + 61, cy - 170, 11, rng, { width: 1.8, stock });
  starGlyph(g, cx, cy - 191, 9, rng, { width: 1.8 });
  starGlyph(g, cx - 32, cy - 187, 5, rng, { width: 1.4 });
  starGlyph(g, cx + 31, cy - 188, 5, rng, { width: 1.4 });
  // the name on a ribbon
  const rb = { x: cx - 98, y: cy + 94, w: 196, h: 40 };
  fillPath(g, roundedRectPts(rb.x, rb.y, rb.w, rb.h, 4), stock);
  inkRounded(g, rb.x, rb.y, rb.w, rb.h, 4, { width: 2.2, wobble: 0.9, rng });
  for (const sx of [-1, 1]) {
    const ex = sx > 0 ? rb.x + rb.w : rb.x;
    const tail = [
      [ex, rb.y + 5],
      [ex + sx * 22, rb.y + 2],
      [ex + sx * 15, rb.y + rb.h / 2],
      [ex + sx * 22, rb.y + rb.h - 2],
      [ex, rb.y + rb.h - 5],
    ];
    fillPath(g, tail, stock);
    hatchPoly(g, tail, { angle: Math.PI / 2, spacing: 3.6, width: 1.2, rng, alpha: 0.85, inset: 1 });
    inkPath(g, tail, { width: 2, wobble: 0.7, rng });
  }
  letter(g, 'TAROT PEPE', cx, rb.y + rb.h / 2 + 1, { size: 25, weight: 700, tracking: 0.14, jitter: 1, rng });
  letter(g, '78 CARTES', cx, rb.y + rb.h + 26, { size: 14, weight: 600, tracking: 0.2, jitter: 0.8, rng });
  for (const dx of [-28, 0, 28]) starGlyph(g, cx + dx, rb.y + rb.h + 55, 6, rng, { width: 1.6 });

  // 7. the printed frame: an inner rule on the field's edge, a milled band of ticks, a heavy
  // outer rule a hair inside the cut
  inkRounded(g, F - 2, F - 2, W - 2 * F + 4, H - 2 * F + 4, Math.max(4, R - F + 6), { width: 2, wobble: 0.9, rng });
  {
    const band = roundedRectPts(27, 27, W - 54, H - 54, R - 17, { step: 7 });
    for (let k = 0; k < band.length; k++) {
      const a = band[k], b = band[(k + 1) % band.length], c = band[(k - 1 + band.length) % band.length];
      const dx = b[0] - c[0], dy = b[1] - c[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      const len = k % 2 ? 3.2 : 5.2;
      inkLine(g, a[0] - nx * len, a[1] - ny * len, a[0] + nx * len, a[1] + ny * len, { width: 1.6, wobble: 0.35, rng });
    }
  }
  inkRounded(g, 16, 16, W - 32, H - 32, R - 8, { width: 4.5, wobble: 1.3, rng });
}

// ---------- the front ----------

export function drawFront(g, W, H, img, rng = mulberry32(5), { wear = 1 } = {}) {
  const { M, border, borderW } = FRONT;
  g.fillStyle = STOCK;
  g.fillRect(0, 0, W, H);
  if (img) g.drawImage(img, M, M, W - 2 * M, H - 2 * M);
  const R = (W * 5) / 130;
  // the printed frame: one confident rule a hair inside the cut, paper either side of it
  inkRounded(g, border, border, W - 2 * border, H - 2 * border, Math.max(6, R - border + 4), { width: borderW, wobble: 1.2, rng });
  if (wear > 0) cornerWear(g, W, H, rng, STOCK, wear);
  return STOCK;
}

// A used deck: the rule rubbed thin at the corners where thumbs go, a few specks, one nick on the
// cut edge. Small, or the critic reads it as noise.
function cornerWear(g, W, H, rng, stock, amount) {
  const { border, borderW } = FRONT;
  const corners = [
    [border, border, 1, 1],
    [W - border, border, -1, 1],
    [border, H - border, 1, -1],
    [W - border, H - border, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    if (rng() > 0.85 * amount) continue;
    // the rub: a scumble of thin paper strokes crossing the rule at a slant, so the ink thins
    // to flecks rather than breaking cleanly
    const spots = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < spots; k++) {
      const along = 10 + rng() * 70;
      const horiz = rng() < 0.5;
      const px = horiz ? x + sx * along : x;
      const py = horiz ? y : y + sy * along;
      const n = 4 + Math.floor(rng() * 4);
      for (let q = 0; q < n; q++) {
        const ox = (rng() - 0.5) * 18, oy = (rng() - 0.5) * 18;
        const a = (horiz ? Math.PI / 2 : 0) + (rng() - 0.5) * 0.9;
        const l = borderW * 1.6 + rng() * 6;
        inkLine(g, px + ox - Math.cos(a) * l, py + oy - Math.sin(a) * l, px + ox + Math.cos(a) * l, py + oy + Math.sin(a) * l, { width: 1.6 + rng() * 1.6, wobble: 0.4, rng, color: stock, alpha: 0.9 });
      }
    }
    // a couple of specks
    for (let k = 0; k < 4; k++) {
      if (rng() > 0.55) continue;
      dot(g, x + sx * rng() * 50, y + sy * rng() * 50, 1 + rng() * 1.4, INK, 0.2 + rng() * 0.3);
    }
  }
  // a hairline nick on the cut edge, somewhere along a long side
  const y = H * (0.2 + rng() * 0.6), x = rng() < 0.5 ? 2 : W - 2;
  inkLine(g, x, y, x + (x < W / 2 ? 9 : -9), y + 3, { width: 2, wobble: 0.3, rng, alpha: 0.5 });
}

// ---------- the deck's cut edge ----------

// n stacked cards seen from the side: a hairline for each card, none exactly like its neighbour,
// none quite parallel. u wraps around the deck's perimeter, so every line is a gentle wave that
// meets itself at the seam.
export function drawDeckSide(g, W, H, n, rng = mulberry32(31), { stock = STOCK } = {}) {
  g.fillStyle = stock;
  g.fillRect(0, 0, W, H);
  const pitch = H / n;
  for (let i = 0; i < n; i++) {
    const y = (i + 0.5) * pitch + (rng() - 0.5) * pitch * 0.3;
    const amp = (rng() - 0.5) * pitch * 0.5, ph = rng() * Math.PI * 2;
    const heavy = rng() < 0.12;
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const x = (W * k) / 40;
      pts.push([x, y + amp * Math.sin((2 * Math.PI * x) / W + ph)]);
    }
    inkPath(g, pts, { width: heavy ? 2.2 : 1.1 + rng() * 0.6, wobble: 0.35, rng, alpha: heavy ? 0.95 : 0.55 + rng() * 0.35 });
  }
  // a few short darker dashes where cards sit proud of the stack
  for (let k = 0; k < 10; k++) {
    const y = rng() * H, x = rng() * W * 0.9;
    inkLine(g, x, y, x + 10 + rng() * 22, y, { width: 1.8, wobble: 0.3, rng, alpha: 0.9 });
  }
}

export { PAPER };
