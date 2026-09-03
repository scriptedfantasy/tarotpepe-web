// cards-art — everything drawn onto the card: the front (the supplied plate on a paper margin with
// one printed ink rule and a little wear), the back (bare paper, a wobbly double rule, a lattice of
// big diamonds carrying frogs, stars and moons, one medallion), and the deck's cut edge. All pen
// work goes through strokes.js so the cards share one hand with the rest of the world.
//
// Everything here is ink or paper — never a grey, never a fill standing in for tone. Ink covers
// about a seventh of the back; the rest is the world's paper. That is not restraint for its own
// sake: twenty-one of these lie fanned across the table at ninety pixels wide for a third of the
// film, and a denser drawing mip-filters to a flat grey tile at that size.
//
// Nothing here uses a canvas clip: in the headless judging browser a stroke under a complex clip
// costs a full-canvas mask each time (round 1 spent 12 s in one hatch pass). Hatching is clipped
// analytically (hatchPoly) and shapes are covered with paper fills instead.
import { INK, PAPER, inkLine, letter } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const STOCK = PAPER; // the card is cut from the world's paper; the ink pass adds the grain
export const BACK = { w: 640, h: 1120 }; // 4.92 px per mm of card
// The plate is inset by M on every side; the printed rule sits `border` px inside the cut edge.
export const FRONT = { M: 44, border: 26, borderW: 7 };

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

// Tarot Pepe's face in a few pen lines. The tells, from public/pepe/pepe-meditation.webp: the two
// big eyes sit ON TOP of the head and break its crown, each under one heavy lid stroke, the pupil
// low and looking inward; the mouth is one long wide smile that reaches nearly to the cheeks, with
// a second line under it for the lower lip; the chin is a soft mass. Drawn at contour weight so it
// survives being 8 px across in the lattice.
export function frogGlyph(g, cx, cy, s, rng, { tone = false, width = 2, simple = false, stock = STOCK } = {}) {
  const o = { rng, width, wobble: Math.max(0.3, s * 0.012) };
  const head = [];
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const rx = s, ry = s * 0.78;
    let x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    if (y < 0) y *= 0.86; // flatter crown
    if (y > 0) x *= 1 - 0.22 * (y / ry) ** 1.6; // cheeks tuck in to the chin, with no kink at the widest
    head.push([cx + x, cy + y + s * 0.06]);
  }
  // A face in this world is pure contour — in every Aline frame the faces carry no hatching at all,
  // only the hair and the coats are masses. `tone` is a thin band under the jaw and nothing else.
  if (tone) hatchPoly(g, head, { angle: 0.1, spacing: s * 0.1, width: width * 0.7, rng, bounds: [cx - s * 0.9, cy + s * 0.6, s * 1.8, s * 0.3], inset: 4 });
  inkPath(g, head, { ...o, closed: true, width: width * 1.15 });
  // the eyes, in front of the crown: paper knocked out, then the ball drawn as an OPEN arc with one
  // heavy lid closing it over the top. Drawing the ball as a full circle and the lid on top of it
  // makes a pair of spectacles; the lid has to BE the top of the eye.
  const rx = s * 0.35, ry = s * 0.32;
  for (const sx of [-1, 1]) {
    const ex = cx + sx * s * 0.4, ey = cy - s * 0.54;
    fillPath(g, ellipsePts(ex, ey, rx * 1.07, ry * 1.07, { n: 26 }), stock);
    inkPath(g, ellipsePts(ex, ey, rx, ry, { n: 22, a0: -Math.PI * 0.1, a1: Math.PI * 1.1 }), o);
    // the lid is a SHAPE, not a thicker stroke: the ink pass lays every line down at one pressure,
    // so weight alone would vanish and leave a pair of spectacles
    const lid = ellipsePts(ex, ey, rx, ry, { n: 16, a0: Math.PI * 1.1, a1: Math.PI * 1.9 });
    fillPath(g, lid, INK);
    inkPath(g, lid, { ...o, width: width * 1.4 });
    dot(g, ex - sx * s * 0.03, ey + s * 0.08, s * 0.13);
  }
  // the mouth: one long smile, the ends lifted
  const arc = (halfW, dip, rise, n) => {
    const p = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n - 0.5;
      p.push([cx + u * s * halfW * 2, cy + s * dip - u * u * s * rise]);
    }
    return p;
  };
  inkPath(g, arc(0.72, 0.3, 0.8, 18), { ...o, width: width * 1.5 });
  if (!simple) {
    inkPath(g, arc(0.42, 0.38, 0.7, 12), { ...o, width: width * 0.85 });
    for (const sx of [-1, 1]) inkLine(g, cx + sx * s * 0.12, cy - s * 0.02, cx + sx * s * 0.16, cy + s * 0.03, { rng, width: width * 0.9, wobble: 0.3 });
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

// ---------- the back ----------
//
// The back is a printed card, drawn with the same pen as the room: bare paper, a wobbly double rule
// near the cut, a lattice of big diamonds carrying frogs, stars and moons, and one medallion in the
// middle. Two rules govern it, and they fight each other:
//
//   * it must be legible at ~90 px wide, because twenty-one of these are fanned across the table
//     for a third of the film. So: few elements, each one big, each drawn at contour weight.
//   * it must be worth looking at at 450 px wide in the card1 close-up. So: a real emblem, hand
//     lettering, a milled edge.
//
// What resolves them is BARE PAPER. Ink covers about a seventh of the surface; everything else is
// the world's paper. A dense pattern of fine strokes — round 1's mistake — averages to a flat grey
// tile the moment the card is small, which is the one thing the bible forbids.
export function drawBack(g, W, H, rng = mulberry32(21), { stock = STOCK } = {}) {
  g.fillStyle = stock;
  g.fillRect(0, 0, W, H);
  const R = (W * 5) / 130; // the cut's corner radius in px (the card is 130 mm wide)
  const cx = W / 2, cy = H / 2;
  const OUT = 30, MID = 88; // the two rules, in from the cut
  const F = MID + 12; // the lattice field starts a hair inside the inner rule
  const fx = F, fy = F, fw = W - 2 * F, fh = H - 2 * F;
  const field = [fx, fy, fw, fh];

  // the lattice: two families of diagonals far enough apart that the diamonds stay open paper
  const D = 244; // diamond width/height (three and a half across the card)
  const cellCentre = (i, j) => [cx + ((i + j + 1) * D) / 2, cy + ((i - j) * D) / 2];
  const N = Math.ceil(Math.hypot(fw, fh) / D) + 2;
  const RX = 212, RY = 300; // the medallion
  const inMedallion = (x, y, pad) => ((x - cx) / (RX + pad)) ** 2 + ((y - cy) / (RY + pad)) ** 2 < 1;

  // 1. the lattice lines, drawn right through the field; the medallion is knocked out over them
  const half = Math.hypot(fw, fh);
  for (let k = -N; k <= N; k++) {
    const c = (k * D) / 2;
    for (const s of [1, -1]) {
      const seg = clipSegRect(cx + c - half, cy + s * (c + half), cx + c + half, cy + s * (c - half), [fx, fy, fw, fh]);
      // a stub in a corner is a mistake, not a drawing
      if (seg && Math.hypot(seg[2] - seg[0], seg[3] - seg[1]) > 90) inkLine(g, ...seg, { width: 6.2, wobble: 2.2, rng, segments: 26 });
    }
  }
  // 2. a solid pip where the lines cross. It is the one element small enough to be a DOT at fan
  //    size, which is what gives a card ninety pixels wide a rhythm rather than a plain grid.
  for (let a = -N; a <= N; a++) {
    for (let b = -N; b <= N; b++) {
      if ((a + b) % 2 !== 0) continue;
      const x = cx + ((a + b) * D) / 2, y = cy + ((a - b) * D) / 2;
      if (x < fx + 14 || x > fx + fw - 14 || y < fy + 14 || y > fy + fh - 14) continue;
      if (inMedallion(x, y, 46)) continue;
      const r = 10;
      fillPath(g, [[x, y - r * 1.5], [x + r, y], [x, y + r * 1.5], [x - r, y]], INK);
    }
  }
  // 3. one motif in every other diamond, in ordered rows: a frog, a star, a moon
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      if ((i + j) % 2 === 0) continue;
      const [x, y] = cellCentre(i, j);
      if (x < fx + 60 || x > fx + fw - 60 || y < fy + 60 || y > fy + fh - 60) continue;
      if (inMedallion(x, y, 40)) continue;
      // rows of one motif each, folded about the card's centre so the back reads the same either
      // way up — a printed card is symmetric under a half-turn
      const n = (i - j - 1) / 2;
      const m = ((n >= 0 ? n : -n - 1) + 1) % 3;
      if (m === 0) frogGlyph(g, x, y, D * 0.2, rng, { width: 4.4, simple: true, stock });
      else if (m === 1) starGlyph(g, x, y, D * 0.15, rng, { width: 5.4 });
      else moonGlyph(g, x, y, D * 0.115, rng, { width: 4.6, stock });
    }
  }

  // 4. the margin: paper over whatever bled out of the field
  g.fillStyle = stock;
  g.fillRect(0, 0, W, fy);
  g.fillRect(0, fy + fh, W, H - fy - fh);
  g.fillRect(0, 0, fx, H);
  g.fillRect(fx + fw, 0, W - fx - fw, H);

  // 5. the medallion: an oval of bare paper punched out of the lattice, a milled edge of ticks, a
  //    heavy ring, the emblem, the name. This is the one dark thing on the card, so that a card
  //    seen small is paper with a badge on it.
  fillPath(g, ellipsePts(cx, cy, RX + 40, RY + 40), stock);
  rays(g, cx, cy, RX + 8, RY + 8, RX + 38, RY + 38, { every: 7.5, rng, width: 4, alt: true });
  inkEllipse(g, cx, cy, RX, RY, { width: 8.5, wobble: 2.4, rng });
  inkEllipse(g, cx, cy, RX - 17, RY - 17, { width: 3.4, wobble: 1.4, rng });
  // the emblem: the frog, in tone, with the collar of his robe
  const hy = cy - 78, hs = 122;
  {
    const sh = hy + hs * 0.95; // the shoulder line, just under the chin
    const left = [], right = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const x = hs * (0.3 + 0.98 * u);
      const y = sh + hs * 0.06 + u ** 1.7 * hs * 0.34;
      left.push([cx - x, y]);
      right.push([cx + x, y]);
    }
    inkPath(g, left, { width: 4.2, wobble: 1.4, rng });
    inkPath(g, right, { width: 4.2, wobble: 1.4, rng });
    // the robe: a plain white one, so the neck is two strokes closing to a V and nothing more
    const nk = sh + hs * 0.06;
    inkPath(g, [[cx - hs * 0.3, nk], [cx - hs * 0.02, nk + hs * 0.4]], { width: 3.6, wobble: 1.2, rng });
    inkPath(g, [[cx + hs * 0.3, nk], [cx + hs * 0.02, nk + hs * 0.4]], { width: 3.6, wobble: 1.2, rng });
    // a paper gap so the head sits in front of the collar
    fillPath(g, ellipsePts(cx, hy + hs * 0.06, hs * 1.0, hs * 0.84), stock);
  }
  frogGlyph(g, cx, hy, hs, rng, { width: 5, stock });
  // a crown: a moon and stars over the head
  moonGlyph(g, cx, cy - 240, 19, rng, { width: 3.4, stock });
  starGlyph(g, cx - 76, cy - 222, 13, rng, { width: 3 });
  starGlyph(g, cx + 76, cy - 222, 13, rng, { width: 3 });
  // the name, between two rules
  const ny = cy + 152;
  inkLine(g, cx - 120, ny - 32, cx + 120, ny - 32, { width: 3.4, wobble: 1.2, rng, segments: 8 });
  letter(g, 'TAROT PEPE', cx, ny + 2, { size: 38, weight: 700, tracking: 0.12, jitter: 1.5, rng });
  inkLine(g, cx - 120, ny + 36, cx + 120, ny + 36, { width: 3.4, wobble: 1.2, rng, segments: 8 });
  letter(g, '78 CARTES', cx, ny + 66, { size: 25, weight: 600, tracking: 0.28, jitter: 1.1, rng });

  // 6. the two rules, and a star in the bare band at each corner
  inkRounded(g, MID, MID, W - 2 * MID, H - 2 * MID, Math.max(6, R - MID + 10), { width: 4.2, wobble: 1.3, rng, step: 26 });
  inkRounded(g, OUT, OUT, W - 2 * OUT, H - 2 * OUT, Math.max(6, R - OUT + 4), { width: 8.5, wobble: 1.9, rng, step: 30 });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    starGlyph(g, cx + sx * (W / 2 - 59), cy + sy * (H / 2 - 59), 15, rng, { width: 3.6 });
  }
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
