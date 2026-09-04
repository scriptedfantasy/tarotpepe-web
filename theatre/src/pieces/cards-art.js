// cards-art — everything drawn onto the card: the front (the supplied plate printed on card stock,
// a paper margin, one keyline, a little wear), the back (a milled edge band, a diaper field, one
// medallion) and the deck's cut edge. All pen work goes through strokes.js so the cards share one
// hand with the rest of the world.
//
// Everything here is ink or paper — never a grey, never a fill standing in for tone.
//
// The back is designed at TWO sizes at once, and they are not the same drawing:
//
//   * THE STRIP. Twenty-one backs overlap in the fan for a third of the film and only a 2.7 cm
//     strip of one long edge is ever seen of twenty of them. A pattern designed for the whole card
//     becomes a picket fence in that strip — the same fragment of the same diamond, twenty-one
//     times. So the edge carries a drawing of its own, made to be read in a row: a milled band, the
//     way a banknote's edge or a shelf of book spines is milled. Cut rule, a comb of ticks, a fine
//     rule, a braid of two crossing waves with a pip at each crossing, the field's rule, and a
//     lozenge capping each corner. Twenty-one of those side by side read as one plaited ribbon.
//   * THE WHOLE CARD. The medallion and the diaper field are reserved for the times the card is
//     seen whole: the close-up, the top of the deck, the last card of the fan.
//
// What keeps both legible is BARE PAPER. Ink covers about a seventh of the surface; the rest is the
// world's paper. (The mip chain that stops the ink greying out under minification is in
// cards-mips.js — an averaging filter is what turns a sparse pen drawing into a grey tile.)
//
// Nothing here uses a canvas clip: in the headless judging browser a stroke under a complex clip
// costs a full-canvas mask each time (round 1 spent 12 s in one hatch pass). Hatching is clipped
// analytically (hatchPoly) and shapes are covered with paper fills instead.
import { INK, PAPER, inkLine, letter } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const STOCK = PAPER; // the card is cut from the world's paper; the ink pass adds the grain
// The back is drawn at 1024 x 1792 — 7.88 px per mm of a 130 x 227.5 mm card.
// The plate is inset by M on every side of a canvas cut to the card's own aspect; the one printed
// rule is a keyline laid keyPad px outside the plate, where the print ends and the stock begins.
export const FRONT = { M: 42, keyW: 7.5, keyPad: 5 };

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

// A quadratic through p0 → (toward p1) → p2. The pen's natural stroke: one sweep, one curvature.
export function qbez(p0, p1, p2, n = 14) {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

export function inkRounded(g, x, y, w, h, r, opts = {}) {
  // a long printed rule bends slowly; jitter every 9 px and it reads as a shaky hand, not a
  // confident one, so the step is the wobble's wavelength
  inkPath(g, roundedRectPts(x, y, w, h, r, { step: opts.step ?? 9 }), { ...opts, closed: true });
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

// a small solid lozenge: the one mark that is still a MARK when the card is ninety pixels wide
export function lozenge(g, x, y, r, k = 1.45) {
  fillPath(g, [[x, y - r * k], [x + r, y], [x, y + r * k], [x - r, y]], INK);
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

// An ellipse arc, rotated about its own centre.
export function ellArc(cx, cy, rx, ry, rot, a0, a1, n = 20) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    const x = rx * Math.cos(a), y = ry * Math.sin(a);
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

// Tarot Pepe's face in a few pen lines, drawn from public/pepe/pepe-meditation.webp. His tells, in
// the order that makes him him and not a smiley:
//   1. He is WIDE, and his CROWN IS TWO DOMES — one bulging over each eye, with a dip between
//      them. The eyes are set into those domes, not stuck on top of a ball.
//   2. The eyes are long horizontal ALMONDS, the outer end dropping, closed over by one heavy
//      upper lid with a crease line above it. A big round pupil sits low and centre, resting on
//      the lower lid, with one pin-hole of paper left in it (STYLE.md §2.2).
//   3. The SNOUT: a line from between the eyes down the left of the muzzle to the corner of the
//      mouth. Take it away and he is a frog-shaped emoji.
//   4. The mouth is a long, lazy, CLOSED band — two lines meeting at both ends, its left corner
//      well inside the cheek and low, its right corner high and almost at the cheek. Not a smile.
// Everything is drawn at contour weight so it survives at 12 px across in the field's diaper.
export function frogGlyph(g, cx, cy, s, rng, { tone = false, width = 2, simple = false, stock = STOCK } = {}) {
  const o = { rng, width, wobble: Math.max(0.3, s * 0.012) };
  const EX = s * 0.4, EY = -s * 0.34, RX = s * 0.36, RY = s * 0.2; // the eyes
  const dy = 0;

  // the head: much wider than it is tall (in the reference, half again), the chin short and
  // tucked, the crown raised into a brow dome over each eye with a soft valley between
  const dome = (u) => Math.exp(-(((Math.abs(u) - 0.4) / 0.44) ** 2));
  const head = [];
  for (let k = 0; k < 84; k++) {
    const a = (k / 84) * Math.PI * 2;
    let x = Math.cos(a) * s, y = Math.sin(a);
    if (y < 0) y = y * s * 0.46 - s * 0.3 * dome(x / s);
    else {
      y *= s * 0.7;
      x *= 1 - 0.28 * (y / (s * 0.7)) ** 1.5;
    }
    head.push([cx + x, cy + y + dy]);
  }
  // A face in this world is pure contour — in every Aline frame the faces carry no hatching at
  // all, only hair and coats are masses. `tone` is a thin band under the jaw and nothing else.
  if (tone) hatchPoly(g, head, { angle: 0.1, spacing: s * 0.1, width: width * 0.7, rng, bounds: [cx - s * 0.9, cy + s * 0.6, s * 1.8, s * 0.3], inset: 4 });
  inkPath(g, head, { ...o, closed: true, width: width * 1.1 });

  for (const sx of [-1, 1]) {
    const ex = cx + sx * EX, ey = cy + EY + dy, rot = sx * 0.16; // the outer end drops
    fillPath(g, ellArc(ex, ey, RX * 1.06, RY * 1.12, rot, 0, Math.PI * 2, 26), stock);
    inkPath(g, ellArc(ex, ey, RX, RY, rot, 0, Math.PI * 2, 30), { ...o, closed: true });
    // the lid: a crescent of solid ink hugging the top of the almond. A heavier stroke would do
    // it at this size and vanish at the next one down; a filled shape holds at both.
    fillPath(g, [...ellArc(ex, ey, RX, RY, rot, Math.PI, Math.PI * 2, 18), ...ellArc(ex, ey, RX * 0.99, RY * 0.32, rot, Math.PI * 2, Math.PI, 18)], INK);
    // the pupil, low and centre, resting on the lower lid, with one pin-hole of paper in it
    const pr = RY * 0.7;
    dot(g, ex - sx * s * 0.03, ey + RY * 0.2, pr);
    if (!simple) {
      dot(g, ex - sx * s * 0.03 - pr * 0.3, ey + RY * 0.2 - pr * 0.36, pr * 0.26, stock);
      inkPath(g, ellArc(ex, ey + RY * 0.2, RX * 0.92, RY * 1.6, rot, Math.PI * 1.14, Math.PI * 1.86, 12), { ...o, width: width * 0.75 }); // the fold above the lid
    }
  }

  // the snout, then the long lazy band of the mouth: left corner low and inside the cheek, right
  // corner high and nearly at it
  const mL = [cx - s * 0.34, cy + s * 0.3];
  const mR = [cx + s * 0.82, cy + s * 0.16];
  inkPath(g, [...qbez([cx - s * 0.04, cy - s * 0.08], [cx - s * 0.24, cy + s * 0.12], mL, 8), ...qbez(mL, [cx + s * 0.08, cy + s * 0.6], mR, 16)], { ...o, width: width * 1.25 });
  inkPath(g, qbez(mL, [cx + s * 0.12, cy + s * 0.88], mR, 16), { ...o, width: width * 1.02 }); // the lower lip
  if (!simple) {
    inkPath(g, qbez(mR, [cx + s * 0.9, cy + s * 0.04], [cx + s * 0.72, cy - s * 0.06], 6), { ...o, width: width * 0.85 }); // the corner, turned up
    inkPath(g, qbez([cx - s * 0.46, cy + s * 0.36], [cx - s * 0.4, cy + s * 0.58], [cx - s * 0.22, cy + s * 0.64], 9), { ...o, width: width * 0.8 }); // the jowl
  }
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

// ---------- the milled edge ----------
//
// All of it in "band coordinates": t runs along a side, s runs in from the cut. Every side is
// drawn symmetric about its own middle, which makes the whole card symmetric under a half turn —
// as a printed card must be, since it is dealt either way up.
export const BAND = {
  out: 28, // the cut rule
  comb0: 38, combL: 32, combS: 18, combP: 84, // the comb of ticks
  rule: 82, // the fine rule
  // the braid: two waves crossing about brdC. brdP is a TARGET — each side nudges it so an odd
  // number of half-periods fits the run exactly. 260 is the value at which the long side (11 half
  // periods) and the short side (5) land within 2 % of the same unit, so the ornament is one size
  // all the way round the card instead of two.
  brdC: 126, brdA: 34, brdP: 260,
  in: 170, // the field's rule
  corner: 182, // the runs stop here; a lozenge caps each corner
  field: 200,
};

function drawEdgeBand(g, W, H, rng) {
  const B = BAND;
  const sides = [
    { L: H, m: (t, s) => [s, t] },
    { L: H, m: (t, s) => [W - s, t] },
    { L: W, m: (t, s) => [t, s] },
    { L: W, m: (t, s) => [t, H - s] },
  ];
  for (const { L, m } of sides) {
    const t0 = B.corner, t1 = L - B.corner, tc = L / 2, span = t1 - t0;
    // the comb: short ticks off the cut rule, long and short alternating
    let n = 2 * Math.round(span / B.combP / 2);
    for (let k = 0; k <= n; k++) {
      const t = tc + (k - n / 2) * (span / n);
      const a = m(t, B.comb0), b = m(t, B.comb0 + (k % 2 ? B.combS : B.combL));
      inkLine(g, a[0], a[1], b[0], b[1], { width: 4.4, wobble: 0.7, rng, segments: 3 });
    }
    // the braid. The period is nudged so an odd number of half-periods fits the run: then the two
    // waves cross exactly at both ends and the braid closes into the corner lozenge.
    let m2 = Math.round(span / (B.brdP / 2));
    if (m2 % 2 === 0) m2 += 1;
    const P = (2 * span) / m2;
    const steps = Math.max(30, Math.round(span / 7));
    for (const sgn of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= steps; k++) {
        const t = t0 + (span * k) / steps;
        pts.push(m(t, B.brdC + sgn * B.brdA * Math.cos((2 * Math.PI * (t - tc)) / P)));
      }
      inkPath(g, pts, { width: 5, wobble: 1.1, rng });
    }
    for (let k = -(m2 + 1) / 2; k <= (m2 + 1) / 2; k++) {
      const t = tc + P / 4 + (k * P) / 2;
      if (t < t0 - 2 || t > t1 + 2) continue;
      const [x, y] = m(t, B.brdC);
      lozenge(g, x, y, 10, 1.3);
    }
  }
  // the corner: a lozenge in the middle of the band, with a solid pip in it
  const cc = (B.out + B.in) / 2;
  for (const [x, y] of [[cc, cc], [W - cc, cc], [cc, H - cc], [W - cc, H - cc]]) {
    const r = 46;
    inkPath(g, [[x, y - r], [x + r, y], [x, y + r], [x - r, y]], { closed: true, width: 4.6, wobble: 1.2, rng });
    lozenge(g, x, y, 13, 1.3);
  }
}

// ---------- the back ----------
export function drawBack(g, W, H, rng = mulberry32(21), { stock = STOCK } = {}) {
  g.fillStyle = stock;
  g.fillRect(0, 0, W, H);
  const R = (W * 5) / 130; // the cut's corner radius in px (the card is 130 mm wide)
  const cx = W / 2, cy = H / 2;
  const B = BAND;
  const F = B.field;
  const fx = F, fy = F, fw = W - 2 * F, fh = H - 2 * F;

  // ---- the field: a diaper of diamonds, one motif in every other cell, the medallion on top ----
  const D = 157; // four across the field
  const cellCentre = (i, j) => [cx + ((i + j + 1) * D) / 2, cy + ((i - j) * D) / 2];
  const N = Math.ceil(Math.hypot(fw, fh) / D) + 2;
  const RX = 192, RY = 284; // the medallion
  const inMedallion = (x, y, pad) => ((x - cx) / (RX + pad)) ** 2 + ((y - cy) / (RY + pad)) ** 2 < 1;

  const half = Math.hypot(fw, fh);
  for (let k = -N; k <= N; k++) {
    const c = (k * D) / 2;
    for (const s of [1, -1]) {
      const seg = clipSegRect(cx + c - half, cy + s * (c + half), cx + c + half, cy + s * (c - half), [fx, fy, fw, fh]);
      // a stub in a corner is a mistake, not a drawing
      if (seg && Math.hypot(seg[2] - seg[0], seg[3] - seg[1]) > 70) inkLine(g, ...seg, { width: 4.6, wobble: 1.8, rng, segments: 22 });
    }
  }
  // a solid pip where the lines cross: the one element small enough to still be a mark when the
  // whole card is ninety pixels wide
  for (let a = -N; a <= N; a++) {
    for (let b = -N; b <= N; b++) {
      if ((a + b) % 2 !== 0) continue;
      const x = cx + ((a + b) * D) / 2, y = cy + ((a - b) * D) / 2;
      if (x < fx + 10 || x > fx + fw - 10 || y < fy + 10 || y > fy + fh - 10) continue;
      if (inMedallion(x, y, 52)) continue; // clear of the medallion's paper by more than its own size
      lozenge(g, x, y, 8);
    }
  }
  // one motif in every other diamond, in ordered rows: a frog, a star, a moon — folded about the
  // card's centre so the back reads the same either way up
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      if ((i + j) % 2 === 0) continue;
      const [x, y] = cellCentre(i, j);
      if (x < fx + 42 || x > fx + fw - 42 || y < fy + 42 || y > fy + fh - 42) continue;
      if (inMedallion(x, y, 78)) continue; // a motif is never half-eaten by the medallion's paper
      const n = (i - j - 1) / 2;
      const mo = ((n >= 0 ? n : -n - 1) + 1) % 3;
      if (mo === 0) frogGlyph(g, x, y, D * 0.21, rng, { width: 3.1, simple: true, stock });
      else if (mo === 1) starGlyph(g, x, y, D * 0.15, rng, { width: 4.4 });
      else moonGlyph(g, x, y, D * 0.115, rng, { width: 3.8, stock });
    }
  }

  // the margin: paper over whatever bled out of the field
  g.fillStyle = stock;
  g.fillRect(0, 0, W, fy);
  g.fillRect(0, fy + fh, W, H - fy - fh);
  g.fillRect(0, 0, fx, H);
  g.fillRect(fx + fw, 0, W - fx - fw, H);

  // ---- the medallion: bare paper punched out of the field, a milled ring, the emblem, the name.
  // This is the one dark thing on the card, so that a card seen small is paper with a badge on it.
  fillPath(g, ellipsePts(cx, cy, RX + 36, RY + 36), stock);
  rays(g, cx, cy, RX + 8, RY + 8, RX + 34, RY + 34, { every: 7.5, rng, width: 3.8, alt: true });
  inkEllipse(g, cx, cy, RX, RY, { width: 8, wobble: 2.2, rng });
  inkEllipse(g, cx, cy, RX - 15, RY - 15, { width: 3.2, wobble: 1.3, rng });
  const hy = cy - 78, hs = 116;
  {
    const sh = hy + hs * 0.8; // the shoulder line, just under the chin
    const left = [], right = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const x = hs * (0.3 + 0.98 * u);
      const y = sh + hs * 0.06 + u ** 1.7 * hs * 0.34;
      left.push([cx - x, y]);
      right.push([cx + x, y]);
    }
    inkPath(g, left, { width: 4, wobble: 1.3, rng });
    inkPath(g, right, { width: 4, wobble: 1.3, rng });
    // the robe: a plain white one, so the neck is one scooped line with the hem just inside it
    const nk = sh + hs * 0.08;
    inkPath(g, qbez([cx - hs * 0.36, nk - hs * 0.04], [cx, nk + hs * 0.34], [cx + hs * 0.36, nk - hs * 0.04], 16), { width: 3.6, wobble: 1.1, rng });
    inkPath(g, qbez([cx - hs * 0.44, nk + hs * 0.06], [cx, nk + hs * 0.46], [cx + hs * 0.44, nk + hs * 0.06], 16), { width: 2.8, wobble: 1, rng });
    // a paper gap so the head sits in front of the collar
    fillPath(g, ellipsePts(cx, hy - hs * 0.03, hs * 1.06, hs * 0.8), stock);
  }
  frogGlyph(g, cx, hy, hs, rng, { width: 4.6, stock });
  // a crown: a moon and two stars over the head
  moonGlyph(g, cx, cy - 216, 18, rng, { width: 3.2, stock });
  starGlyph(g, cx - 70, cy - 200, 12, rng, { width: 3 });
  starGlyph(g, cx + 70, cy - 200, 12, rng, { width: 3 });
  // the name, between two rules
  const ny = cy + 138;
  inkLine(g, cx - 112, ny - 30, cx + 112, ny - 30, { width: 3.2, wobble: 1.1, rng, segments: 8 });
  letter(g, 'TAROT PEPE', cx, ny + 2, { size: 36, weight: 700, tracking: 0.12, jitter: 1.4, rng });
  inkLine(g, cx - 112, ny + 34, cx + 112, ny + 34, { width: 3.2, wobble: 1.1, rng, segments: 8 });
  letter(g, '78 CARTES', cx, ny + 62, { size: 23, weight: 600, tracking: 0.28, jitter: 1, rng });

  // ---- the edge: the three rules and the milled band between them ----
  drawEdgeBand(g, W, H, rng);
  inkRounded(g, B.in, B.in, W - 2 * B.in, H - 2 * B.in, 10, { width: 4.4, wobble: 1.2, rng, step: 26 });
  inkRounded(g, B.rule, B.rule, W - 2 * B.rule, H - 2 * B.rule, 12, { width: 3, wobble: 1.1, rng, step: 24 });
  inkRounded(g, B.out, B.out, W - 2 * B.out, H - 2 * B.out, Math.max(8, R - B.out + 6), { width: 8, wobble: 1.8, rng, step: 30 });
}

// ---------- the front ----------
//
// The plate is supplied and is never redrawn. What is drawn here is the OBJECT it is printed on:
// stock all round it, the plate laid down a hair off register the way a cheap press lays it, one
// keyline where the print stops, and the wear of a deck that has been handled.
export function drawFront(g, W, H, img, rng = mulberry32(5), { wear = 1 } = {}) {
  const { M, keyW, keyPad } = FRONT;
  g.fillStyle = STOCK;
  g.fillRect(0, 0, W, H);
  // off register by a millimetre — the tell of a printed card (STYLE.md §1.4)
  const ox = (rng() - 0.5) * 9, oy = (rng() - 0.5) * 9;
  const px = M + ox, py = M + oy, pw = W - 2 * M, ph = H - 2 * M;
  if (img) g.drawImage(img, px, py, pw, ph);
  // the one printed rule: a keyline round the plate, where the ink ends and the stock begins
  inkRounded(g, px - keyPad, py - keyPad, pw + 2 * keyPad, ph + 2 * keyPad, 9, { width: keyW, wobble: 1.2, rng, step: 11 });
  if (wear > 0) cornerWear(g, W, H, px, py, pw, ph, rng, wear);
  return STOCK;
}

// A used deck: the keyline rubbed thin at the corners where thumbs go, a few specks on the stock,
// a nick or two on the cut. Small, or the critic reads it as noise.
function cornerWear(g, W, H, px, py, pw, ph, rng, amount) {
  const { keyW, keyPad } = FRONT;
  const corners = [
    [px - keyPad, py - keyPad, 1, 1],
    [px + pw + keyPad, py - keyPad, -1, 1],
    [px - keyPad, py + ph + keyPad, 1, -1],
    [px + pw + keyPad, py + ph + keyPad, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    if (rng() > 0.85 * amount) continue;
    // the rub: a scumble of paper strokes crossing the rule at a slant, so the ink thins to flecks
    // rather than breaking cleanly
    const spots = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < spots; k++) {
      const along = 10 + rng() * 70;
      const horiz = rng() < 0.5;
      const qx = horiz ? x + sx * along : x;
      const qy = horiz ? y : y + sy * along;
      const n = 4 + Math.floor(rng() * 4);
      for (let q = 0; q < n; q++) {
        const dx = (rng() - 0.5) * 18, dy = (rng() - 0.5) * 18;
        const a = (horiz ? Math.PI / 2 : 0) + (rng() - 0.5) * 0.9;
        const l = keyW * 1.6 + rng() * 6;
        inkLine(g, qx + dx - Math.cos(a) * l, qy + dy - Math.sin(a) * l, qx + dx + Math.cos(a) * l, qy + dy + Math.sin(a) * l, { width: 1.6 + rng() * 1.6, wobble: 0.4, rng, color: STOCK, alpha: 0.9 });
      }
    }
    // a couple of specks on the margin
    for (let k = 0; k < 4; k++) {
      if (rng() > 0.55) continue;
      dot(g, x + sx * rng() * 44, y + sy * rng() * 44, 1 + rng() * 1.4, INK, 0.2 + rng() * 0.3);
    }
  }
  // hairline nicks on the cut edge, somewhere along the long sides
  for (let k = 0; k < 2; k++) {
    const y = H * (0.15 + rng() * 0.7), x = rng() < 0.5 ? 2 : W - 2;
    inkLine(g, x, y, x + (x < W / 2 ? 9 : -9), y + 3, { width: 2, wobble: 0.3, rng, alpha: 0.5 });
  }
}

// ---------- the deck's cut edge ----------

// A stack of paper, drawn the way the folios draw one: NOT a line per card — seventy-eight
// hairlines squeezed into sixty pixels of screen is a grey slab, which is exactly what the pen
// never does. A few full-weight wobbly lines, well apart, with bare paper between them, and the
// stack reads as cards. `lines` is how many the whole deck gets, whatever n is.
export function drawDeckSide(g, W, H, n, rng = mulberry32(31), { stock = STOCK, lines = 7 } = {}) {
  g.fillStyle = stock;
  g.fillRect(0, 0, W, H);
  const pitch = H / (lines + 1);
  for (let i = 0; i < lines; i++) {
    const y = (i + 1) * pitch + (rng() - 0.5) * pitch * 0.42;
    const amp = (0.1 + rng() * 0.22) * pitch, ph = rng() * Math.PI * 2;
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const x = (W * k) / 40;
      pts.push([x, y + amp * Math.sin((2 * Math.PI * x) / W + ph)]);
    }
    inkPath(g, pts, { width: (rng() < 0.3 ? 0.65 : 1) * pitch * 0.22, wobble: pitch * 0.05, rng });
  }
  // two or three cards sitting proud: a short heavy dash where a corner sticks out of the stack
  for (let k = 0; k < 3; k++) {
    const y = pitch * 0.5 + rng() * (H - pitch), x = rng() * W * 0.8;
    inkLine(g, x, y, x + W * (0.06 + rng() * 0.1), y + (rng() - 0.5) * pitch * 0.2, { width: pitch * 0.2, wobble: 1, rng });
  }
}

export { PAPER };
