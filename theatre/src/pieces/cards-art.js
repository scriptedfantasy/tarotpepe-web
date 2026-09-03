// cards-art — everything drawn onto the card: the front (the supplied plate on a paper margin with
// a printed ink frame and a little wear), the back (a dense ink pattern: a lattice of hatched
// diamonds carrying frogs, stars and moons around an oval medallion), and the deck's cut edge.
// All pen work goes through strokes.js so the cards share one hand with the rest of the world.
import { INK, PAPER, paper, inkLine, hatch, letter, makeCanvas } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const STOCK = '#f0e9d8'; // card stock: a shade creamier than the world's paper

// ---------- pen helpers (wobbly paths; the same hand as inkLine) ----------

// Draw a polyline as pen strokes: each vertex is jittered a little, the line breaks into a few
// sub-strokes with their own pressure so it does not read as one vector path.
export function inkPath(g, pts, { closed = false, width = 2, wobble = 0.8, rng = Math.random, color = INK, alpha = 1 } = {}) {
  const n = pts.length;
  const p = pts.map(([x, y]) => [x + (rng() - 0.5) * 2 * wobble, y + (rng() - 0.5) * 2 * wobble]);
  if (closed) p.push(p[0]);
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // sub-strokes of 12..30 points with slightly different widths
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
  return n;
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

export function ellipsePts(cx, cy, rx, ry, { n = 96, a0 = 0, a1 = Math.PI * 2 } = {}) {
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

function fillPath(g, pts, color) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
  g.restore();
}

function clipPath(g, pts) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.clip();
}

// ---------- motifs ----------

// A frog's face in a few pen lines: the wide head, two big lidded eyes, the long deadpan mouth.
export function frogGlyph(g, cx, cy, s, rng, { tone = false, width = 2 } = {}) {
  const o = { rng, width, wobble: s * 0.012 };
  // head: wider than tall, a little flat on top where the eyes sit
  const head = [];
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const rx = s, ry = s * 0.74;
    let x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    if (y < 0) y *= 0.82; // flatter crown
    if (y > 0) x *= 1.06 - 0.12 * (y / ry); // cheeks tuck in below
    head.push([cx + x, cy + y + s * 0.05]);
  }
  inkPath(g, head, { ...o, closed: true, width: width * 1.2 });
  // eyes: two ovals sitting on the crown, heavy upper lids
  for (const sx of [-1, 1]) {
    const ex = cx + sx * s * 0.42, ey = cy - s * 0.36;
    inkEllipse(g, ex, ey, s * 0.3, s * 0.24, { ...o, width });
    // lid: a heavy stroke across the upper third
    inkLine(g, ex - s * 0.3, ey - s * 0.06, ex + s * 0.3, ey - s * 0.08, { rng, width: width * 1.5, wobble: s * 0.01 });
    // pupil under the lid, looking slightly inward
    g.save();
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(ex - sx * s * 0.04, ey + s * 0.05, s * 0.075, s * 0.085, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  // mouth: long, nearly straight, the ends turned down a hair
  const m = [];
  for (let k = 0; k <= 16; k++) {
    const u = k / 16 - 0.5;
    m.push([cx + u * s * 1.5, cy + s * 0.32 + Math.abs(u) * Math.abs(u) * s * 0.28]);
  }
  inkPath(g, m, { ...o, width: width * 1.35 });
  // the lip below the mouth line (a thinner echo)
  const m2 = m.map(([x, y]) => [x * 0.985 + cx * 0.015, y + s * 0.09]);
  inkPath(g, m2.slice(2, -2), { ...o, width: width * 0.8 });
  // nostrils
  for (const sx of [-1, 1]) inkLine(g, cx + sx * s * 0.12, cy + s * 0.06, cx + sx * s * 0.17, cy + s * 0.1, { rng, width: width * 0.9, wobble: 0.3 });
  if (tone) {
    // hatching: under the chin, in the eye sockets, down the side away from the light
    g.save();
    clipPath(g, head);
    hatch(g, cx - s, cy + s * 0.42, s * 2, s * 0.5, { angle: 0.1, spacing: s * 0.05, width: width * 0.7, broken: 0.15, rng, alpha: 0.85 });
    hatch(g, cx + s * 0.55, cy - s * 0.4, s * 0.55, s * 1.2, { angle: Math.PI / 2 - 0.15, spacing: s * 0.055, width: width * 0.65, broken: 0.2, rng, alpha: 0.75 });
    g.restore();
    for (const sx of [-1, 1]) {
      const ex = cx + sx * s * 0.42, ey = cy - s * 0.36;
      g.save();
      clipPath(g, ellipsePts(ex, ey, s * 0.3, s * 0.24));
      hatch(g, ex - s * 0.3, ey - s * 0.24, s * 0.6, s * 0.18, { angle: 0, spacing: s * 0.045, width: width * 0.6, broken: 0, rng, alpha: 0.8 });
      g.restore();
    }
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
  fillPath(g, ellipsePts(cx, cy, s, s, { n: 40 }), INK);
  inkEllipse(g, cx, cy, s, s, { rng, width, wobble: 0.6 });
  fillPath(g, ellipsePts(cx + s * 0.55, cy - s * 0.1, s * 0.82, s * 0.82, { n: 40 }), stock);
}

export function ringGlyph(g, cx, cy, s, rng, { width = 2 } = {}) {
  inkEllipse(g, cx, cy, s, s, { rng, width, wobble: 0.6 });
  g.save();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
  g.fill();
  g.restore();
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

// ---------- the back ----------

export function drawBack(g, W, H, rng = mulberry32(21), { stock = STOCK } = {}) {
  paper(g, W, H, stock, { grain: 0.028, seed: 11 });
  const R = Math.round((W * 0.005) / 0.13); // geometry corner radius in px
  // outer printed frame: a heavy line, a milled band of ticks, a hairline inside it
  inkRounded(g, 24, 24, W - 48, H - 48, R - 10, { width: 9, wobble: 1.4, rng });
  inkRounded(g, 52, 52, W - 104, H - 104, R - 36, { width: 3.2, wobble: 1.1, rng });
  {
    // ticks between the two lines, all the way round
    const band = roundedRectPts(38, 38, W - 76, H - 76, R - 24, { step: 11 });
    for (let k = 0; k < band.length; k++) {
      const a = band[k], b = band[(k + 1) % band.length], c = band[(k - 1 + band.length) % band.length];
      const dx = b[0] - c[0], dy = b[1] - c[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      const len = k % 2 ? 5 : 8;
      inkLine(g, a[0] - nx * len, a[1] - ny * len, a[0] + nx * len, a[1] + ny * len, { width: 2.2, wobble: 0.4, rng });
    }
  }
  // the field
  const fx = 70, fy = 70, fw = W - 140, fh = H - 140;
  const cx = W / 2, cy = H / 2;
  const S = 92; // perpendicular spacing of the lattice lines
  const D = S * Math.SQRT2; // diamond width/height
  const fieldPts = roundedRectPts(fx, fy, fw, fh, 10);
  g.save();
  clipPath(g, fieldPts);

  // lattice cells: (i, j) indexes along the two diagonal families
  const cellCentre = (i, j) => [cx + ((i + 0.5 + j + 0.5) * D) / 2, cy + ((i + 0.5 - (j + 0.5)) * D) / 2];
  const cellPoly = (i, j) => {
    const [x, y] = cellCentre(i, j);
    return [
      [x, y - D / 2],
      [x + D / 2, y],
      [x, y + D / 2],
      [x - D / 2, y],
    ];
  };
  const N = Math.ceil(Math.hypot(fw, fh) / D) + 2;
  const RX = 236, RY = 364;
  const inMedallion = (x, y) => ((x - cx) / (RX + 60)) ** 2 + ((y - cy) / (RY + 60)) ** 2 < 1;
  const cornerR = 210;
  const corners = [
    [fx, fy],
    [fx + fw, fy],
    [fx, fy + fh],
    [fx + fw, fy + fh],
  ];
  const inCorner = (x, y) => corners.some(([px, py]) => Math.hypot(x - px, y - py) < cornerR + 36);

  // 1. hatched diamonds (checkerboard): one clip path of many diamonds, one hatch pass
  g.save();
  g.beginPath();
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      if ((i + j) % 2 !== 0) continue;
      const [x, y] = cellCentre(i, j);
      if (x < fx - D || x > fx + fw + D || y < fy - D || y > fy + fh + D) continue;
      const poly = cellPoly(i, j);
      poly.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.closePath();
    }
  }
  g.clip();
  hatch(g, fx, fy, fw, fh, { angle: Math.PI / 2, spacing: 7, width: 2.4, wobble: 0.5, broken: 0, jitter: 1.4, rng, alpha: 0.95 });
  // a second, sparser pass at a slant so the diamonds read as woven, not ruled
  hatch(g, fx, fy, fw, fh, { angle: Math.PI / 2 + 0.45, spacing: 15, width: 1.6, wobble: 0.5, broken: 0.3, jitter: 1.2, rng, alpha: 0.7 });
  g.restore();

  // 2. lattice lines
  const half = Math.hypot(fw, fh);
  for (let k = -N; k <= N; k++) {
    const cA = k * D;
    inkLine(g, cx + cA / 2 - half, cy + cA / 2 + half, cx + cA / 2 + half, cy + cA / 2 - half, { width: 3.2, wobble: 1, rng, segments: 70 });
    inkLine(g, cx + cA / 2 - half, cy - cA / 2 - half, cx + cA / 2 + half, cy - cA / 2 + half, { width: 3.2, wobble: 1, rng, segments: 70 });
  }

  // 3. motifs in the plain diamonds: ordered rows of frogs, stars, moons
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      if ((i + j) % 2 === 0) continue;
      const [x, y] = cellCentre(i, j);
      if (x < fx + 14 || x > fx + fw - 14 || y < fy + 14 || y > fy + fh - 14) continue;
      if (inMedallion(x, y) || inCorner(x, y)) continue;
      const m = (((i - j) % 4) + 4) % 4; // constant along the / diagonals → ordered rows
      if (m === 1) frogGlyph(g, x, y, D * 0.24, rng, { width: 2.4 });
      else if (m === 3) moonGlyph(g, x, y, D * 0.17, rng, { width: 2.4, stock });
      else starGlyph(g, x, y, D * 0.21, rng, { width: 2.8 });
    }
  }

  // 4. corner fans: a quarter disc of paper with rays from the corner and a star
  for (const [px, py] of corners) {
    const sx = px < cx ? 1 : -1, sy = py < cy ? 1 : -1;
    const a0 = sx > 0 ? (sy > 0 ? 0 : 270) : sy > 0 ? 90 : 180;
    const A0 = (a0 * Math.PI) / 180, A1 = ((a0 + 90) * Math.PI) / 180;
    fillPath(g, ellipsePts(px, py, cornerR, cornerR, { n: 40, a0: A0, a1: A1 }).concat([[px, py]]), stock);
    inkPath(g, ellipsePts(px, py, cornerR, cornerR, { n: 36, a0: A0, a1: A1 }), { width: 5, wobble: 1.3, rng });
    inkPath(g, ellipsePts(px, py, cornerR - 18, cornerR - 18, { n: 36, a0: A0, a1: A1 }), { width: 2.4, wobble: 1, rng });
    rays(g, px, py, 82, 82, cornerR - 28, cornerR - 28, { every: 5, rng, width: 2.6, a0: a0 + 3, a1: a0 + 90 });
    inkPath(g, ellipsePts(px, py, 70, 70, { n: 30, a0: A0, a1: A1 }), { width: 3.6, wobble: 1, rng });
    // a small crescent and star tucked in the corner
    moonGlyph(g, px + sx * 30, py + sy * 30, 14, rng, { width: 2.4, stock });
    starGlyph(g, px + sx * 56, py + sy * 12, 8, rng, { width: 2 });
    starGlyph(g, px + sx * 12, py + sy * 56, 8, rng, { width: 2 });
  }

  // 5. the medallion: an oval of paper, a sunburst, a milled edge, the emblem, the name
  fillPath(g, ellipsePts(cx, cy, RX + 40, RY + 40), stock);
  rays(g, cx, cy, RX + 10, RY + 10, RX + 38, RY + 38, { every: 3, rng, width: 2.6 });
  inkEllipse(g, cx, cy, RX, RY, { width: 8, wobble: 1.4, rng });
  inkEllipse(g, cx, cy, RX - 16, RY - 16, { width: 2.8, wobble: 1, rng });
  g.save();
  g.fillStyle = INK;
  for (let deg = 0; deg < 360; deg += 4.5) {
    const a = (deg * Math.PI) / 180;
    g.beginPath();
    g.arc(cx + (RX - 8) * Math.cos(a), cy + (RY - 8) * Math.sin(a), 2.6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // the emblem: the frog, in tone, with the collar of his robe
  const hy = cy - 86, hs = 138;
  {
    // the robe: round shoulders sloping to the medallion's edge, a V of lapels under the chin,
    // a few fold strokes; paper-white like Pepe's robe in the world
    const sh = cy + hs * 0.55; // shoulder line
    const left = [], right = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const x = hs * (0.36 + 0.7 * u);
      const y = sh + hs * 0.05 - Math.sin(u * Math.PI * 0.5) * hs * 0.02 + u * u * hs * 0.34;
      left.push([cx - x, y]);
      right.push([cx + x, y]);
    }
    inkPath(g, left, { width: 3.4, wobble: 1.1, rng });
    inkPath(g, right, { width: 3.4, wobble: 1.1, rng });
    // lapels
    inkPath(g, [[cx - hs * 0.36, sh + hs * 0.05], [cx - hs * 0.08, sh + hs * 0.62]], { width: 3, wobble: 0.9, rng });
    inkPath(g, [[cx + hs * 0.36, sh + hs * 0.05], [cx + hs * 0.08, sh + hs * 0.62]], { width: 3, wobble: 0.9, rng });
    inkPath(g, [[cx - hs * 0.36, sh + hs * 0.05], [cx - hs * 0.46, sh + hs * 0.36]], { width: 2.4, wobble: 0.9, rng });
    inkPath(g, [[cx + hs * 0.36, sh + hs * 0.05], [cx + hs * 0.46, sh + hs * 0.36]], { width: 2.4, wobble: 0.9, rng });
    // folds
    for (const sx of [-1, 1]) for (const f of [0.62, 0.8]) inkLine(g, cx + sx * hs * f, sh + hs * 0.3, cx + sx * hs * (f + 0.06), sh + hs * 0.8, { width: 2, wobble: 0.8, rng, alpha: 0.85 });
    // the chest in shadow: hatching inside the V
    g.save();
    clipPath(g, [[cx - hs * 0.36, sh + hs * 0.05], [cx + hs * 0.36, sh + hs * 0.05], [cx + hs * 0.08, sh + hs * 0.62], [cx - hs * 0.08, sh + hs * 0.62]]);
    hatch(g, cx - hs * 0.4, sh, hs * 0.8, hs * 0.7, { angle: Math.PI / 2 + 0.2, spacing: 6, width: 1.8, broken: 0.1, rng, alpha: 0.85 });
    g.restore();
    // a paper gap so the head sits in front of the collar
    fillPath(g, ellipsePts(cx, hy + hs * 0.05, hs * 1.02, hs * 0.76), stock);
  }
  frogGlyph(g, cx, hy, hs, rng, { tone: true, width: 3.6 });
  // a small crown of stars and a moon over the head
  starGlyph(g, cx - 104, cy - 276, 22, rng, { width: 3 });
  moonGlyph(g, cx + 98, cy - 272, 18, rng, { width: 2.8, stock });
  starGlyph(g, cx, cy - 306, 15, rng, { width: 2.6 });
  starGlyph(g, cx - 52, cy - 300, 8, rng, { width: 2 });
  starGlyph(g, cx + 50, cy - 302, 8, rng, { width: 2 });
  // the name on a ribbon
  const rb = { x: cx - 156, y: cy + 150, w: 312, h: 64 };
  fillPath(g, roundedRectPts(rb.x, rb.y, rb.w, rb.h, 6), stock);
  inkRounded(g, rb.x, rb.y, rb.w, rb.h, 6, { width: 3.4, wobble: 1, rng });
  for (const sx of [-1, 1]) {
    const ex = sx > 0 ? rb.x + rb.w : rb.x;
    const tail = [
      [ex, rb.y + 8],
      [ex + sx * 36, rb.y + 4],
      [ex + sx * 24, rb.y + rb.h / 2],
      [ex + sx * 36, rb.y + rb.h - 4],
      [ex, rb.y + rb.h - 8],
    ];
    fillPath(g, tail, stock);
    inkPath(g, tail, { width: 3.2, wobble: 0.8, rng });
    g.save();
    clipPath(g, tail);
    hatch(g, sx > 0 ? ex : ex - 36, rb.y + 4, 36, rb.h - 8, { angle: Math.PI / 2, spacing: 5.5, width: 1.8, broken: 0, rng, alpha: 0.85 });
    g.restore();
  }
  letter(g, 'TAROT PEPE', cx, rb.y + rb.h / 2 + 2, { size: 40, weight: 700, tracking: 0.14, jitter: 1.4, rng });
  letter(g, '78 CARTES', cx, rb.y + rb.h + 42, { size: 22, weight: 600, tracking: 0.2, jitter: 1, rng });
  for (const dx of [-44, 0, 44]) starGlyph(g, cx + dx, rb.y + rb.h + 88, 10, rng, { width: 2.4 });

  g.restore(); // field clip
}

// ---------- the front ----------

// Reads the plate's own margin colour so the card stock matches the printed sheet.
function sampleStock(img) {
  try {
    const c = makeCanvas(8, 8);
    const g2 = c.getContext('2d');
    g2.drawImage(img, 0, 0, 8, 8);
    const d = g2.getImageData(0, 0, 8, 8).data;
    const px = [0, 7, 56, 63].map((i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    const avg = px.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]).map((v) => Math.round(v / px.length));
    // lift towards paper a touch so the plate reads as printed on lighter stock
    const lift = (v, p) => Math.round(v * 0.7 + p * 0.3);
    return `rgb(${lift(avg[0], 0xf6)},${lift(avg[1], 0xf2)},${lift(avg[2], 0xea)})`;
  } catch {
    return STOCK;
  }
}

// Layout constants shared with the piece: the plate is inset by M on every side.
export const FRONT = { M: 44, border: 22, borderW: 5.5 };

export function drawFront(g, W, H, img, rng = mulberry32(5), { wear = 1 } = {}) {
  const { M, border, borderW } = FRONT;
  const stock = img ? sampleStock(img) : STOCK;
  paper(g, W, H, stock, { grain: 0.03, seed: 13 });
  if (img) g.drawImage(img, M, M, W - 2 * M, H - 2 * M);
  const R = Math.round((W * 0.005) / 0.13);
  // the printed frame: one confident line just inside the cut
  inkRounded(g, border, border, W - 2 * border, H - 2 * border, Math.max(4, R - border + 6), { width: borderW, wobble: 1.1, rng });
  if (wear > 0) cornerWear(g, W, H, rng, stock, wear);
  return stock;
}

// A used deck: the frame rubbed through at the corners, a few specks, one faint fingerprint of
// dirt along an edge. Small, or the critic reads it as noise.
function cornerWear(g, W, H, rng, stock, amount) {
  const { border } = FRONT;
  const corners = [
    [border, border, 1, 1],
    [W - border, border, -1, 1],
    [border, H - border, 1, -1],
    [W - border, H - border, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    if (rng() > 0.8 * amount) continue;
    // rub: paper-coloured dashes across the frame line near the corner, where thumbs go
    const n = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const along = 14 + rng() * 80;
      const horiz = rng() < 0.5;
      const px = horiz ? x + sx * along : x;
      const py = horiz ? y : y + sy * along;
      const len = 8 + rng() * 12;
      inkLine(g, px - (horiz ? len / 2 : 0), py - (horiz ? 0 : len / 2), px + (horiz ? len / 2 : 0), py + (horiz ? 0 : len / 2), {
        width: 6 + rng() * 5,
        wobble: 0.6,
        rng,
        color: stock,
        alpha: 0.85 + rng() * 0.15,
      });
    }
    // a couple of specks
    g.save();
    g.fillStyle = INK;
    for (let k = 0; k < 4; k++) {
      if (rng() > 0.6) continue;
      g.globalAlpha = 0.18 + rng() * 0.3;
      g.beginPath();
      g.arc(x + sx * rng() * 60, y + sy * rng() * 60, 1 + rng() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // a hairline nick on the cut edge, somewhere along a long side
  const y = H * (0.2 + rng() * 0.6), x = rng() < 0.5 ? 2 : W - 2;
  inkLine(g, x, y, x + (x < W / 2 ? 9 : -9), y + 3, { width: 2, wobble: 0.3, rng, alpha: 0.5 });
}

// ---------- the deck's cut edge ----------

// n stacked cards seen from the side: a hairline for each card, none exactly like its neighbour.
export function drawDeckSide(g, W, H, n, rng = mulberry32(31), { stock = STOCK } = {}) {
  paper(g, W, H, stock, { grain: 0.03, seed: 17 });
  const pitch = H / n;
  for (let i = 0; i < n; i++) {
    const y = (i + 0.5) * pitch + (rng() - 0.5) * pitch * 0.25;
    const thick = rng() < 0.12;
    inkLine(g, -4, y, W + 4, y, { width: thick ? 2.6 : 1.5 + rng() * 0.6, wobble: 0.45, rng, alpha: thick ? 0.9 : 0.55 + rng() * 0.3, segments: 48 });
  }
  // a few short darker dashes where cards sit proud of the stack
  for (let k = 0; k < 14; k++) {
    const y = rng() * H, x = rng() * W;
    inkLine(g, x, y, x + 20 + rng() * 40, y, { width: 2.2, wobble: 0.4, rng, alpha: 0.9 });
  }
}

export { PAPER };
