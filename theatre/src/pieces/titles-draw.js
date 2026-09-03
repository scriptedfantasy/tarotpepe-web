// titles-draw — the pen work on the title cards: drawn rules and borders, the small ink
// ornaments (a star, a frog, a manicule), the zig-zag spine, and the hand-cut marquee lettering
// of the masthead. Everything here is drawn with a wobbling hand on a 2D canvas; nothing is a
// gradient, a filter or a typeset glyph.
import { inkLine, inkRect, hatch } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const INK = '#0d0e0d';

// Size a canvas to its CSS box at device resolution and return a 2D context scaled to CSS px.
export function fit(canvas, w, h, dpr = Math.min(2, window.devicePixelRatio || 1)) {
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return g;
}

// A wobbly polyline / closed shape through points, like one continuous pen stroke (smoothed —
// for organic shapes: the frog, the hand).
export function stroke(g, pts, { width = 1.6, wobble = 0.7, rng = Math.random, color = INK, close = false, alpha = 1, fill = null } = {}) {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.beginPath();
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    out.push([x + (rng() - 0.5) * 2 * wobble, y + (rng() - 0.5) * 2 * wobble]);
  }
  // Catmull-Rom through the jittered points so it reads as a hand curve, not a polygon.
  const P = (i) => out[((i % n) + n) % n];
  const last = close ? n : n - 1;
  g.moveTo(out[0][0], out[0][1]);
  for (let i = 0; i < last; i++) {
    const p0 = close ? P(i - 1) : out[Math.max(0, i - 1)];
    const p1 = out[i];
    const p2 = close ? P(i + 1) : out[Math.min(n - 1, i + 1)];
    const p3 = close ? P(i + 2) : out[Math.min(n - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    g.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (close) g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  g.lineWidth = width * (0.9 + rng() * 0.25);
  g.stroke();
  g.restore();
}

export function ellipsePts(cx, cy, rx, ry, n = 24, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

// Hatch inside an arbitrary closed path (tone on the shadow side of a shape).
export function hatchIn(g, pts, box, opts) {
  g.save();
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.clip();
  hatch(g, box[0], box[1], box[2], box[3], opts);
  g.restore();
}

// ---------------------------------------------------------------------------------------------
// Straight-edged pen work. A polygon is resampled every few px and given a slow drift across its
// edges (a hand's wander, not a jitter), plus a hair of pen noise. Corners stay corners.
function drift(pts, closed, { wobble = 1.5, rng = Math.random, step = 5, period = 30, noise = 0.25 } = {}) {
  const n = pts.length;
  const segs = closed ? n : n - 1;
  const lens = [];
  let total = 0;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lens.push(l);
    total += l;
  }
  const knots = Math.max(2, Math.ceil(total / period) + 1);
  const K = [];
  for (let i = 0; i < knots; i++) K.push((rng() - 0.5) * 2 * wobble);
  if (closed) K[knots - 1] = K[0];
  const offAt = (d) => {
    const u = Math.min(knots - 1, Math.max(0, (d / (total || 1)) * (knots - 1)));
    const i = Math.min(knots - 2, Math.floor(u));
    const f = u - i;
    const c = (1 - Math.cos(f * Math.PI)) / 2;
    return K[i] * (1 - c) + K[i + 1] * c;
  };
  const out = [];
  let d = 0;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const l = lens[i];
    if (l < 1e-6) continue;
    const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    const m = Math.max(1, Math.round(l / step));
    for (let j = 0; j < m; j++) {
      const u = j / m;
      const o = offAt(d + l * u) + (rng() - 0.5) * 2 * noise;
      out.push([a[0] + (b[0] - a[0]) * u + nx * o, a[1] + (b[1] - a[1]) * u + ny * o]);
    }
    d += l;
  }
  if (!closed) {
    const a = pts[n - 2], b = pts[n - 1];
    const l = lens[n - 2] || 1;
    const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    const o = offAt(total);
    out.push([b[0] + nx * o, b[1] + ny * o]);
  }
  return out;
}

function tracePath(g, pts, closed) {
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (closed) g.closePath();
}

// Fill a set of closed polygons (even-odd, so holes work) with the ink, then re-stroke each
// outline by hand. The fill and the line drift independently so the colour sits a hair off
// the contour, like a cheap print. Sharp corners get a small overshoot.
export function inkPoly(g, polys, { fill = null, color = INK, width = 2, wobble = 1.6, fillWobble = null, rng = Math.random, alpha = 1, overshoot = 2.5, period = 30 } = {}) {
  g.save();
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const paths = polys.map((p) => drift(p, true, { wobble, rng, period }));
  if (fill) {
    g.beginPath();
    // fillWobble != null → the colour is laid down separately and sits a hair off the line
    for (let i = 0; i < polys.length; i++) tracePath(g, fillWobble != null ? drift(polys[i], true, { wobble: fillWobble, rng, period: period * 1.3, noise: 0.15 }) : paths[i], true);
    g.fillStyle = fill;
    g.fill('evenodd');
  }
  g.strokeStyle = color;
  for (let i = 0; i < polys.length; i++) {
    g.beginPath();
    tracePath(g, paths[i], true);
    g.lineWidth = width * (0.9 + rng() * 0.2);
    g.stroke();
    if (overshoot > 0) cornerTicks(g, polys[i], { rng, overshoot, width });
  }
  g.restore();
}

// At a sharp corner the pen runs past the join by a couple of px, on one or both edges.
function cornerTicks(g, pts, { rng, overshoot, width }) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const v = pts[i];
    if (v.sharp === false) continue;
    const p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
    // skip corners that are really arc samples (nearly straight)
    const ax = v[0] - p[0], ay = v[1] - p[1], bx = q[0] - v[0], by = q[1] - v[1];
    const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
    const cos = (ax * bx + ay * by) / (la * lb);
    if (cos > 0.6) continue;
    if (rng() < 0.35) continue;
    const o = overshoot * (0.6 + rng() * 0.9);
    g.lineWidth = width * (0.75 + rng() * 0.25);
    if (rng() < 0.7) {
      g.beginPath();
      g.moveTo(v[0] - (ax / la) * 1.5, v[1] - (ay / la) * 1.5);
      g.lineTo(v[0] + (ax / la) * o + (rng() - 0.5), v[1] + (ay / la) * o + (rng() - 0.5));
      g.stroke();
    }
    if (rng() < 0.5) {
      g.beginPath();
      g.moveTo(v[0] + (bx / lb) * 1.5, v[1] + (by / lb) * 1.5);
      g.lineTo(v[0] - (bx / lb) * o + (rng() - 0.5), v[1] - (by / lb) * o + (rng() - 0.5));
      g.stroke();
    }
  }
}

// A hairline drawn with the same drifting hand (for construction lines and rails).
export function hairline(g, x1, y1, x2, y2, { color = INK, width = 0.9, wobble = 0.6, alpha = 1, rng = Math.random } = {}) {
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineWidth = width * (0.85 + rng() * 0.3);
  g.beginPath();
  tracePath(g, drift([[x1, y1], [x2, y2]], false, { wobble, rng, period: 60, noise: 0.15 }), false);
  g.stroke();
  g.restore();
}

// Expand [x, y, r] vertices (r = corner radius) into arc samples. Arc samples are marked
// `sharp = false` so the overshoot pass leaves them alone.
function roundVerts(verts, closed = true, per = 6) {
  const n = verts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = verts[i];
    if (!r || (!closed && (i === 0 || i === n - 1))) {
      out.push([x, y]);
      continue;
    }
    const [px, py] = verts[(i - 1 + n) % n];
    const [nx, ny] = verts[(i + 1) % n];
    let d1x = px - x, d1y = py - y;
    const l1 = Math.hypot(d1x, d1y) || 1;
    d1x /= l1;
    d1y /= l1;
    let d2x = nx - x, d2y = ny - y;
    const l2 = Math.hypot(d2x, d2y) || 1;
    d2x /= l2;
    d2y /= l2;
    const ang = Math.acos(Math.max(-1, Math.min(1, d1x * d2x + d1y * d2y)));
    if (ang < 0.05 || ang > Math.PI - 0.05) {
      out.push([x, y]);
      continue;
    }
    const rr = Math.min(r, (l1 * 0.5) * Math.tan(ang / 2), (l2 * 0.5) * Math.tan(ang / 2));
    const t = rr / Math.tan(ang / 2);
    const ax = x + d1x * t, ay = y + d1y * t;
    const bx = x + d2x * t, by = y + d2y * t;
    const bxn = d1x + d2x, byn = d1y + d2y;
    const bl = Math.hypot(bxn, byn) || 1;
    const cd = rr / Math.sin(ang / 2);
    const cx = x + (bxn / bl) * cd, cy = y + (byn / bl) * cd;
    const a0 = Math.atan2(ay - cy, ax - cx), a1 = Math.atan2(by - cy, bx - cx);
    let da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    for (let j = 0; j <= per; j++) {
      const a = a0 + da * (j / per);
      const p = [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
      p.sharp = false;
      out.push(p);
    }
  }
  return out;
}

// A short hairline rule with a four-point star in the middle: rule — ✦ — rule.
export function starRule(g, w, h, { color = INK, seed = 5, star = true, width = 1.1 } = {}) {
  const rng = mulberry32(seed);
  const cy = h / 2;
  const gap = star ? 16 : 0;
  inkLine(g, 0, cy, w / 2 - gap, cy, { width, wobble: 0.35, rng, color });
  inkLine(g, w / 2 + gap, cy, w, cy, { width, wobble: 0.35, rng, color });
  if (star) drawStar(g, w / 2, cy, 7, { color, rng });
}

export function drawStar(g, cx, cy, r, { color = INK, rng = Math.random, points = 4 } = {}) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.32;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  g.save();
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineJoin = 'round';
  g.lineWidth = 0.9;
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = x + (rng() - 0.5) * 0.5, jy = y + (rng() - 0.5) * 0.5;
    i ? g.lineTo(jx, jy) : g.moveTo(jx, jy);
  });
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

// The printed border of a card: a heavier outer rule and a hairline inside it, both drawn by
// hand with overshoots at the corners.
export function border(g, w, h, inset, { color = INK, seed = 9 } = {}) {
  const rng = mulberry32(seed);
  inkRect(g, inset, inset, w - inset * 2, h - inset * 2, { width: 1.6, wobble: 0.5, rng, color, overshoot: 3 });
  const i2 = inset + 7;
  inkRect(g, i2, i2, w - i2 * 2, h - i2 * 2, { width: 0.7, wobble: 0.4, rng, color, overshoot: 1.5 });
}

// The signwriter's bracket that a kicker hangs from: a hairline with two drop ticks and one
// diagonal brace, like the little scaffold around "THE" on the magazine's masthead.
export function bracket(g, w, h, { color = INK, seed = 13 } = {}) {
  const rng = mulberry32(seed);
  const y = h * 0.3;
  hairline(g, 2, y, w - 2, y, { color, rng, width: 0.9, wobble: 0.5 });
  hairline(g, 2, y - 3, 2, h - 2, { color, rng, width: 1.1, wobble: 0.3 });
  hairline(g, w - 2, y - 3, w - 2, h - 2, { color, rng, width: 1.1, wobble: 0.3 });
  hairline(g, 2, y, w * 0.14, h - 3, { color, rng, width: 0.7, wobble: 0.4, alpha: 0.8 });
  hairline(g, w - 2, y, w - w * 0.14, h - 3, { color, rng, width: 0.7, wobble: 0.4, alpha: 0.8 });
}

// A small frontal frog head in ink — calm half-lidded eyes, the long flat mouth — with a flat
// green fill under the line and a little hatching for tone. Fits a box of about 200 x 150.
export function frog(g, w, h, { seed = 21, green = '#5dbb63', color = INK, lips = '#b5322f', hatched = true } = {}) {
  const rng = mulberry32(seed);
  const cx = w / 2;
  const sy = h / 150, sx = w / 200;
  const S = (x, y) => [cx + (x - 100) * sx, y * sy];
  const head = [
    S(100, 38), S(124, 40), S(146, 48), S(164, 62), S(174, 80), S(172, 100), S(160, 118), S(138, 130), S(100, 134),
    S(62, 130), S(40, 118), S(28, 100), S(26, 80), S(36, 62), S(54, 48), S(76, 40),
  ];
  const eyeL = ellipsePts(...S(66, 46), 27 * sx, 21 * sy, 26);
  const eyeR = ellipsePts(...S(134, 46), 27 * sx, 21 * sy, 26);
  stroke(g, head, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true, alpha: 1 });
  stroke(g, eyeL, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true });
  stroke(g, eyeR, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true });
  if (hatched) {
    hatchIn(g, head, [0, 0, w, h], { angle: Math.PI / 2 + 0.25, spacing: 4.2 * sx, width: 0.75, wobble: 0.5, broken: 0.35, rng, color, alpha: 0.7, jitter: 1 });
  }
  const whiteL = ellipsePts(...S(66, 47), 24 * sx, 17 * sy, 24);
  const whiteR = ellipsePts(...S(134, 47), 24 * sx, 17 * sy, 24);
  stroke(g, whiteL, { rng, width: 0.01, wobble: 0, color: '#f8f9f4', fill: '#f8f9f4', close: true });
  stroke(g, whiteR, { rng, width: 0.01, wobble: 0, color: '#f8f9f4', fill: '#f8f9f4', close: true });
  const pupL = ellipsePts(...S(72, 53), 6 * sx, 6.5 * sy, 14);
  const pupR = ellipsePts(...S(128, 53), 6 * sx, 6.5 * sy, 14);
  stroke(g, pupL, { rng, width: 0.8, wobble: 0.2, color, fill: color, close: true });
  stroke(g, pupR, { rng, width: 0.8, wobble: 0.2, color, fill: color, close: true });
  const lidL = [S(41, 46), S(46, 38), S(58, 31), S(74, 30), S(86, 36), S(91, 46), S(80, 47), S(66, 48), S(52, 47)];
  const lidR = [S(109, 46), S(114, 36), S(126, 30), S(142, 31), S(154, 38), S(159, 46), S(148, 47), S(134, 48), S(120, 47)];
  stroke(g, lidL, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true });
  stroke(g, lidR, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true });
  if (hatched) {
    hatchIn(g, lidL, [0, 0, w, h], { angle: 0.3, spacing: 3.5 * sx, width: 0.6, wobble: 0.4, broken: 0.2, rng, color, alpha: 0.6, jitter: 0.8 });
    hatchIn(g, lidR, [0, 0, w, h], { angle: 0.3, spacing: 3.5 * sx, width: 0.6, wobble: 0.4, broken: 0.2, rng, color, alpha: 0.6, jitter: 0.8 });
  }
  stroke(g, head, { rng, width: 1.9 * sx, wobble: 0.6, color, close: true });
  stroke(g, eyeL, { rng, width: 1.6 * sx, wobble: 0.5, color, close: true });
  stroke(g, eyeR, { rng, width: 1.6 * sx, wobble: 0.5, color, close: true });
  stroke(g, [S(42, 46), S(54, 47), S(66, 48), S(80, 47), S(90, 46)], { rng, width: 1.7 * sx, wobble: 0.35, color });
  stroke(g, [S(110, 46), S(120, 47), S(134, 48), S(148, 47), S(158, 46)], { rng, width: 1.7 * sx, wobble: 0.35, color });
  stroke(g, [S(94, 56), S(100, 60), S(106, 56)], { rng, width: 0.9 * sx, wobble: 0.3, color });
  stroke(g, ellipsePts(...S(92, 78), 1.6 * sx, 1.2 * sy, 8), { rng, width: 0.8, wobble: 0.1, color, fill: color, close: true });
  stroke(g, ellipsePts(...S(108, 78), 1.6 * sx, 1.2 * sy, 8), { rng, width: 0.8, wobble: 0.1, color, fill: color, close: true });
  const lipTop = [S(38, 98), S(56, 96), S(80, 95), S(100, 95), S(120, 95), S(144, 96), S(162, 98)];
  const lipBot = [S(162, 98), S(150, 104), S(126, 108), S(100, 109), S(74, 108), S(50, 104), S(38, 98)];
  stroke(g, [...lipTop, ...lipBot], { rng, width: 0.01, wobble: 0, color: lips, fill: lips, close: true });
  stroke(g, lipTop, { rng, width: 1.7 * sx, wobble: 0.45, color });
  stroke(g, lipBot, { rng, width: 1.4 * sx, wobble: 0.45, color });
  stroke(g, [S(44, 98), S(60, 101), S(100, 102), S(140, 101), S(156, 98)], { rng, width: 1.0 * sx, wobble: 0.3, color, alpha: 0.9 });
  stroke(g, [S(70, 122), S(100, 126), S(130, 122)], { rng, width: 1.0 * sx, wobble: 0.3, color, alpha: 0.85 });
  stroke(g, [S(34, 88), S(31, 96)], { rng, width: 0.9 * sx, wobble: 0.2, color, alpha: 0.8 });
  stroke(g, [S(166, 88), S(169, 96)], { rng, width: 0.9 * sx, wobble: 0.2, color, alpha: 0.8 });
}

// A slim drawn hand pointing (the manicule of old printed matter), for the chapter cards.
export function manicule(g, w, h, { seed = 31, color = INK } = {}) {
  const rng = mulberry32(seed);
  const k = w / 60;
  const S = (x, y) => [x * (w / 60), y * (h / 30)];
  const W = (n) => n * Math.max(1, k * 0.8);
  stroke(g, [S(2, 8), S(12.5, 8), S(12.5, 24.5), S(2, 24.5)], { rng, width: W(1.3), wobble: 0.3, color, close: true });
  inkLine(g, ...S(5.5, 8.4), ...S(5.5, 24.2), { width: W(0.7), wobble: 0.25, rng, color });
  stroke(g, ellipsePts(...S(9.2, 16.2), 1.1 * k, 1.1 * k, 10), { rng, width: W(0.6), wobble: 0.1, color, fill: color, close: true });
  const hand = [
    S(12.5, 9), S(17, 7), S(23, 6.2), S(28, 7.5), S(31, 10.2),
    S(40, 10.4), S(50, 10.6), S(56.5, 10.9), S(58.6, 12.5), S(56.5, 14.3), S(50, 14.6), S(40, 14.8), S(32.5, 15.2),
    S(34.5, 17), S(34.5, 19.3), S(32.5, 20.2), S(34.2, 22.2), S(32.5, 23.6), S(31, 25.2), S(24, 26), S(17, 25.6), S(12.5, 24.5),
  ];
  stroke(g, hand, { rng, width: W(1.3), wobble: 0.35, color, close: true });
  stroke(g, [S(18.5, 7.2), S(22.5, 9.4), S(25.5, 12.4), S(25.2, 15.4), S(23, 16.4)], { rng, width: W(1.0), wobble: 0.3, color });
  stroke(g, [S(23, 16.6), S(29, 16.8), S(33.5, 17.2)], { rng, width: W(0.85), wobble: 0.25, color });
  stroke(g, [S(23.5, 19.6), S(29, 19.8), S(33.2, 20.2)], { rng, width: W(0.85), wobble: 0.25, color });
  stroke(g, [S(24, 22.6), S(29, 22.8), S(33, 23.4)], { rng, width: W(0.85), wobble: 0.25, color });
  stroke(g, [S(39, 11.2), S(39.3, 14.2)], { rng, width: W(0.6), wobble: 0.15, color, alpha: 0.85 });
  stroke(g, [S(47, 11.2), S(47.3, 14.3)], { rng, width: W(0.6), wobble: 0.15, color, alpha: 0.85 });
  stroke(g, [S(54, 11.5), S(56.8, 12.5), S(54, 13.9)], { rng, width: W(0.7), wobble: 0.12, color });
  hatch(g, ...S(14, 20), 10 * k, 5.2 * (h / 30), { angle: Math.PI / 2 + 0.35, spacing: Math.max(2, 1.9 * k), width: W(0.5), wobble: 0.25, broken: 0.2, rng, color, alpha: 0.6, jitter: 0.5 });
}

// A row of three small drawn cards (a page indicator): the current one is filled with ink.
export function cardRow(g, w, h, current = 0, { seed = 41, color = INK, count = 3 } = {}) {
  const rng = mulberry32(seed);
  const ch = h * 0.8, cw = ch * 0.64, gap = cw * 0.7;
  const total = count * cw + (count - 1) * gap;
  let x = (w - total) / 2;
  const y = (h - ch) / 2;
  for (let i = 0; i < count; i++) {
    inkRect(g, x, y, cw, ch, { width: Math.max(1, ch * 0.05), wobble: 0.35, rng, color, overshoot: 1.2 });
    inkRect(g, x + cw * 0.16, y + ch * 0.12, cw * 0.68, ch * 0.76, { width: Math.max(0.6, ch * 0.028), wobble: 0.25, rng, color, overshoot: 0.5 });
    if (i === current) hatch(g, x + cw * 0.16, y + ch * 0.12, cw * 0.68, ch * 0.76, { angle: Math.PI / 4, spacing: Math.max(2, ch * 0.1), width: Math.max(0.7, ch * 0.04), wobble: 0.25, broken: 0, rng, color, alpha: 1, jitter: 0.4 });
    x += cw + gap;
  }
}

// The zig-zag spine: one bold band of triangles down one edge of the card, like the red and
// yellow stripe on the magazine's cover. A dark ground with flat-coloured triangles cut into it,
// each one stroked by hand.
export function zigzag(g, x, y0, y1, bw, { colors = ['#7a2e2a', '#697791', '#e0a526'], ground = INK, ink = INK, seed = 17 } = {}) {
  const rng = mulberry32(seed);
  const n = Math.max(3, Math.round((y1 - y0) / (bw * 1.9)));
  const base = (y1 - y0) / n;
  inkPoly(g, [[[x, y0], [x + bw, y0], [x + bw, y1], [x, y1]]], { fill: ground, color: ink, width: 1.2, wobble: 0.7, rng, overshoot: 2 });
  for (let i = 0; i < n; i++) {
    const y = y0 + i * base;
    const tri = [[x + bw, y], [x, y + base / 2], [x + bw, y + base]];
    inkPoly(g, [tri], { fill: colors[i % colors.length], color: ink, width: 1, wobble: 0.8, fillWobble: 0.6, rng, overshoot: 1.5, period: 22 });
  }
}

// ---------------------------------------------------------------------------------------------
// Marquee lettering. The film's masthead is a row of wide, dark, hand-cut slab caps carrying a
// single line of light bulbs down every stroke, hung on a signwriter's rails with diagonal
// braces. Each glyph here is a hand-defined polygon (100 units = cap height, stem width `s`
// varies letter to letter), filled with ink and re-stroked with a drifting pen; the bulbs walk
// the skeleton of every stroke and turn its corners.
// The dots sit on a lattice of pitch `g` (0.44 of the stem) in two rows either side of every
// stroke's centre line; `e` is how far the first dot sits from a letter's edge and `j` is where a
// bar's dots begin after a stem, so that every corner closes as a 2 x 2 block of dots.
const DOT_PITCH = 0.44;
const GLYPHS = {
  T: (s, g) => {
    const e = s / 2 - g / 2, j = s / 2 + g / 2 + g;
    return {
      w: 82,
      polys: [[[0, 0], [82, 0], [82, s], [41 + s / 2, s], [41 + s / 2, 100], [41 - s / 2, 100], [41 - s / 2, s], [0, s]]],
      skel: [
        { pts: [[e, s / 2], [82 - e, s / 2]] },
        { pts: [[41, j], [41, 100 - e]] },
      ],
      post: 41,
    };
  },
  E: (s, g) => {
    const e = s / 2 - g / 2, j = s / 2 + g / 2 + g;
    return {
      w: 74,
      polys: [[[0, 0], [74, 0], [74, s], [s, s], [s, 50 - s / 2], [67, 50 - s / 2], [67, 50 + s / 2], [s, 50 + s / 2], [s, 100 - s], [74, 100 - s], [74, 100], [0, 100]]],
      skel: [
        { pts: [[s / 2, e], [s / 2, 100 - e]] },
        { pts: [[j, s / 2], [74 - e, s / 2]] },
        { pts: [[j, 50], [67 - e, 50]] },
        { pts: [[j, 100 - s / 2], [74 - e, 100 - s / 2]] },
      ],
      post: s / 2,
    };
  },
  P: (s, g) => {
    const e = s / 2 - g / 2, j = s / 2 + g / 2 + g;
    const B = 64, R = 26, r = 9;
    return {
      w: 76,
      polys: [
        roundVerts([[0, 0], [76, 0, R], [76, B, R], [s, B], [s, 100], [0, 100]]),
        roundVerts([[s, s], [76 - s, s, r], [76 - s, B - s, r], [s, B - s]]),
      ],
      skel: [
        { pts: [[s / 2, e], [s / 2, 100 - e]] },
        { pts: roundVerts([[j, s / 2], [76 - s / 2, s / 2, R - s / 2], [76 - s / 2, B - s / 2, R - s / 2], [j, B - s / 2]], false) },
      ],
      post: s / 2,
    };
  },
  R: (s, g) => {
    const e = s / 2 - g / 2, j = s / 2 + g / 2 + g;
    const B = 64, R = 26, r = 9;
    // the leg: a slab of the stem's weight running from under the bowl to the bottom right
    const legX = (y) => 48 + ((y - B) / (100 - B)) * 24;
    return {
      w: 84,
      polys: [
        roundVerts([[0, 0], [82, 0, R], [82, B, 14], [62, B], [86, 100], [58, 100], [34, B], [s, B], [s, 100], [0, 100]]),
        roundVerts([[s, s], [82 - s, s, r], [82 - s, B - s, r], [s, B - s]]),
      ],
      skel: [
        { pts: [[s / 2, e], [s / 2, 100 - e]] },
        { pts: roundVerts([[j, s / 2], [82 - s / 2, s / 2, R - s / 2], [82 - s / 2, B - s / 2, 14 - s / 2], [j, B - s / 2]], false) },
        { pts: [[legX(B + g * 0.55), B + g * 0.55], [legX(100 - e), 100 - e]] },
      ],
      post: s / 2,
    };
  },
  O: (s, g) => ({
    w: 84,
    polys: [
      roundVerts([[0, 0, 32], [84, 0, 32], [84, 100, 32], [0, 100, 32]]),
      roundVerts([[s + 1.5, s - 1, 13], [84 - s + 1, s + 0.5, 15], [84 - s - 0.5, 100 - s + 1, 14], [s + 0.5, 100 - s - 1, 12]]),
    ],
    skel: [{ pts: roundVerts([[s / 2, s / 2, 32 - s / 2], [84 - s / 2, s / 2, 32 - s / 2], [84 - s / 2, 100 - s / 2, 32 - s / 2], [s / 2, 100 - s / 2, 32 - s / 2]]), closed: true }],
    post: null,
  }),
  A: (s, g) => {
    const e = s / 2 - g / 2, j = s / 2 + g / 2 + g;
    const hw = s * 1.04;
    const xL = (y) => 30 + hw - 0.3 * y, xR = (y) => 60 - hw + 0.3 * y;
    const xLc = (y) => 30 + hw / 2 - 0.3 * y, xRc = (y) => 60 - hw / 2 + 0.3 * y;
    const yA = (2 * hw - 30) / 0.6;
    const cb = 56;
    const yT = s - e + g; // where the legs' dots begin, under the flat top's two rows
    return {
      w: 90,
      polys: [
        [[0, 100], [30, 0], [60, 0], [90, 100], [xR(100), 100], [xR(cb + s), cb + s], [xL(cb + s), cb + s], [xL(100), 100]],
        [[45, yA], [xR(cb), cb], [xL(cb), cb]],
      ],
      skel: [
        { pts: [[30 + e, s / 2], [60 - e, s / 2]] },
        { pts: [[xLc(100 - e), 100 - e], [xLc(yT), yT]] },
        { pts: [[xRc(yT), yT], [xRc(100 - e), 100 - e]] },
        { pts: [[xL(cb + s / 2) + (j - s / 2) * 0.9, cb + s / 2], [xR(cb + s / 2) - (j - s / 2) * 0.9, cb + s / 2]] },
      ],
      post: xLc(100),
    };
  },
};
const SPACE_W = 50;

// Where every glyph sits, and its particular stem width, lean and drop — so both the size
// measurement and the drawing agree.
function layoutWord(text, capH, { gap = 0.15, seed = 3 } = {}) {
  const rng = mulberry32(seed * 7919 + 1);
  const k = capH / 100;
  const out = [];
  let x = 0;
  for (const ch of [...text]) {
    if (ch === ' ') {
      x += SPACE_W * k - gap * capH;
      continue;
    }
    // heavy slab stems, a quarter of the cap height, no two alike
    const s = 24 * (0.94 + rng() * 0.12);
    const g = s * DOT_PITCH;
    const sx = 0.97 + rng() * 0.06;
    const make = GLYPHS[ch.toUpperCase()] ?? GLYPHS.E;
    const glyph = make(s, g);
    const w = glyph.w * sx * k;
    out.push({ ch, glyph, x, w, s, g, sx, k, rot: (rng() - 0.5) * 0.02, dy: (rng() - 0.5) * 3, seed: Math.floor(rng() * 1e6) });
    x += w + gap * capH;
  }
  return { letters: out, total: x - gap * capH };
}

export function marqueeSize(text, capH, { gap = 0.15, seed = 3 } = {}) {
  const { total } = layoutWord(text, capH, { gap, seed });
  const padX = Math.max(capH * 0.32, total * 0.075);
  return { w: Math.ceil(total + padX * 2), h: Math.ceil(capH * 1.52), textW: total, padX };
}

// Draw the word onto `g` (a context already scaled to CSS px), in a box w x h.
export function marquee(g, w, h, text, { capH, ink = INK, bulb = '#f1e0a6', count = Infinity, seed = 3, gap = 0.15, rails = true } = {}) {
  const rng = mulberry32(seed);
  const { letters, total } = layoutWord(text, capH, { gap, seed });
  const x0 = (w - total) / 2;
  const top = capH * 0.2;
  const k = capH / 100;
  const sAvg = letters.reduce((a, l) => a + l.s, 0) / (letters.length || 1);

  // the rails: two double hairlines behind the word, at the height of the top bars and just
  // above the feet, running past the word on both sides; diagonal braces between them; a few
  // short posts hanging below the baseline
  if (rails) {
    const ext = total * 0.045 + capH * 0.05;
    const y1 = top + sAvg * 0.62 * k, y2 = top + (100 - sAvg * 0.85) * k;
    // no two rails are the same length: each end runs out a little differently
    const ends = [y1, y2].map(() => [x0 - ext * (0.8 + rng() * 0.4), x0 + total + ext * (0.8 + rng() * 0.4)]);
    [y1, y2].forEach((y, i) => {
      const [xa, xb] = ends[i];
      hairline(g, xa, y, xb, y, { color: ink, rng, width: 0.9, wobble: 0.55, alpha: 0.85 });
      hairline(g, xa + 3, y + 2.6, xb - 2 + rng() * 6, y + 2.6, { color: ink, rng, width: 0.8, wobble: 0.55, alpha: 0.7 });
      // rail ends: a little hook at each end
      for (const px of [xa, xb]) {
        hairline(g, px, y - capH * (0.04 + rng() * 0.02), px, y + capH * (0.05 + rng() * 0.03), { color: ink, rng, width: 1.1, wobble: 0.3 });
      }
    });
    // diagonal braces across the word, top rail to bottom rail, each about two letters wide
    const n = letters.length;
    const picks = n >= 6 ? [0, Math.floor(n * 0.42), n - 3] : [0, Math.max(1, n - 2)];
    for (const i of picks) {
      const L = letters[i];
      const xs = x0 + L.x - L.w * 0.04, xe = xs + L.w * (2.1 + rng() * 0.3) + 2 * gap * capH;
      hairline(g, xs, y1 + 1.3, xe, y2 + 1.3, { color: ink, rng, width: 0.9, wobble: 0.5, alpha: 0.8 });
    }
    // a third, mid-height hairline that only runs part of the way
    const ym = top + 50 * k + (rng() - 0.5) * 6;
    const xm0 = x0 + total * (0.28 + rng() * 0.1), xm1 = x0 + total + ext * (0.6 + rng() * 0.5);
    hairline(g, xm0, ym, xm1, ym, { color: ink, rng, width: 0.8, wobble: 0.5, alpha: 0.6 });
    // posts below the baseline, at the stem of two or three letters
    const withPost = letters.filter((L) => L.glyph.post != null);
    const chosen = [withPost[0], withPost[Math.floor(withPost.length / 2)], withPost[withPost.length - 1]].filter(Boolean);
    for (const L of chosen) {
      const px = x0 + L.x + L.glyph.post * L.sx * k;
      const by = top + 100 * k + L.dy;
      hairline(g, px, by - 2, px, by + capH * (0.08 + rng() * 0.06), { color: ink, rng, width: 1.1, wobble: 0.3, alpha: 0.9 });
    }
  }

  // the letters
  letters.forEach((L, i) => {
    if (i >= count) return;
    const { glyph, s, sx, rot, dy } = L;
    const lrng = mulberry32(L.seed);
    const cx = x0 + L.x + L.w / 2, cy = top + 50 * k + dy;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const T = (p) => {
      const ux = (p[0] * sx - glyph.w * sx / 2) * k, uy = (p[1] - 50) * k;
      const q = [cx + ux * cos - uy * sin, cy + ux * sin + uy * cos];
      if (p.sharp === false) q.sharp = false;
      return q;
    };
    const polys = glyph.polys.map((poly) => poly.map(T));
    inkPoly(g, polys, { fill: ink, color: ink, width: Math.max(1.6, capH * 0.017), wobble: Math.max(1.2, capH * 0.016), rng: lrng, overshoot: Math.max(2, capH * 0.022), period: capH * 0.28 });
    // the dotted fill: two rows of small pale dots down every stroke, on a lattice that turns
    // each corner as a 2 x 2 block, every dot placed a hair off its mark
    const gpx = L.g * k;
    const r0 = s * 0.12 * k;
    g.save();
    g.fillStyle = bulb;
    g.strokeStyle = bulb;
    g.lineWidth = 0.5;
    for (const line of glyph.skel) {
      const pts = line.pts.map(T);
      const closed = !!line.closed;
      const segs = closed ? pts.length : pts.length - 1;
      let len = 0;
      const cum = [0];
      for (let j = 0; j < segs; j++) {
        const a = pts[j], b = pts[(j + 1) % pts.length];
        len += Math.hypot(b[0] - a[0], b[1] - a[1]);
        cum.push(len);
      }
      const n = Math.max(1, Math.round(len / gpx));
      const nb = closed ? n : n + 1;
      const step = len / n;
      const at = (d) => {
        d = Math.max(0, Math.min(len, d));
        let j = 0;
        while (j < segs - 1 && cum[j + 1] < d) j++;
        const a = pts[j], b = pts[(j + 1) % pts.length];
        const sl = cum[j + 1] - cum[j] || 1;
        const u = (d - cum[j]) / sl;
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (b[0] - a[0]) / sl, (b[1] - a[1]) / sl];
      };
      for (let j = 0; j < nb; j++) {
        const d = j * step;
        const [bx, by, tx, ty] = at(d);
        const nx = -ty, ny = tx;
        for (const side of [-1, 1]) {
          if (lrng() < 0.02) continue; // a dot missed
          const o = (gpx / 2) * side * (0.94 + lrng() * 0.12);
          const rr = r0 * (0.86 + lrng() * 0.28);
          const jx = (lrng() - 0.5) * gpx * 0.12, jy = (lrng() - 0.5) * gpx * 0.12;
          drawBulb(g, bx + nx * o + jx, by + ny * o + jy, rr, lrng);
        }
      }
    }
    g.restore();
  });
}

function drawBulb(g, x, y, r, rng) {
  const pts = ellipsePts(x, y, r * (0.92 + rng() * 0.16), r * (0.92 + rng() * 0.16), 9, rng() * Math.PI);
  g.beginPath();
  pts.forEach(([px, py], i) => {
    const jx = px + (rng() - 0.5) * 0.5, jy = py + (rng() - 0.5) * 0.5;
    i ? g.lineTo(jx, jy) : g.moveTo(jx, jy);
  });
  g.closePath();
  g.fill();
  g.stroke();
}
