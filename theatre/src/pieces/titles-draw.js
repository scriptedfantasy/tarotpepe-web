// titles-draw — the pen work on the title cards: paper grain, drawn rules and borders, the
// small ink ornaments (a star, a frog). Everything here is drawn with a wobbling hand on a 2D
// canvas; nothing is a gradient or a filter.
import { inkLine, inkRect, hatch } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const INK = '#1c1a17';

// A transparent noise tile. Used as a CSS background over the flat card colour so the colour
// reads as printed ink on paper rather than a screen fill.
let grainUrl = null;
export function grainTile(seed = 11) {
  if (grainUrl) return grainUrl;
  const s = 192;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const img = g.createImageData(s, s);
  const d = img.data;
  const rng = mulberry32(seed);
  for (let i = 0; i < d.length; i += 4) {
    const v = rng();
    const dark = v < 0.5;
    d[i] = d[i + 1] = d[i + 2] = dark ? 20 : 255;
    // mostly nothing, a scatter of pale flecks and darker specks
    const a = v < 0.06 ? 26 + rng() * 30 : v > 0.94 ? 18 + rng() * 26 : 0;
    d[i + 3] = a;
  }
  g.putImageData(img, 0, 0);
  grainUrl = c.toDataURL('image/png');
  return grainUrl;
}

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

// A wobbly polyline / closed shape through points, like one continuous pen stroke.
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
  // straight-sided star: draw as a plain path with small jitter, no smoothing
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
// hand with overshoots at the corners, plus tiny corner ticks like a printer's registration.
export function border(g, w, h, inset, { color = INK, seed = 9 } = {}) {
  const rng = mulberry32(seed);
  inkRect(g, inset, inset, w - inset * 2, h - inset * 2, { width: 1.6, wobble: 0.5, rng, color, overshoot: 3 });
  const i2 = inset + 7;
  inkRect(g, i2, i2, w - i2 * 2, h - i2 * 2, { width: 0.7, wobble: 0.4, rng, color, overshoot: 1.5 });
}

// A small frontal frog head in ink — calm half-lidded eyes, the long flat mouth — with a flat
// green fill under the line and a little hatching for tone. Fits a box of about 200 x 150.
export function frog(g, w, h, { seed = 21, green = '#5dbb63', color = INK, lips = '#b5322f', hatched = true } = {}) {
  const rng = mulberry32(seed);
  const cx = w / 2;
  const sy = h / 150, sx = w / 200;
  const S = (x, y) => [cx + (x - 100) * sx, y * sy];
  // head: broad, low, chin a little wider than the crown
  const head = [
    S(100, 38), S(124, 40), S(146, 48), S(164, 62), S(174, 80), S(172, 100), S(160, 118), S(138, 130), S(100, 134),
    S(62, 130), S(40, 118), S(28, 100), S(26, 80), S(36, 62), S(54, 48), S(76, 40),
  ];
  // eyes bulge above the crown
  const eyeL = ellipsePts(...S(66, 46), 27 * sx, 21 * sy, 26);
  const eyeR = ellipsePts(...S(134, 46), 27 * sx, 21 * sy, 26);
  // flat fills first (colour under the line, as everywhere in this world)
  stroke(g, head, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true, alpha: 1 });
  stroke(g, eyeL, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true });
  stroke(g, eyeR, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true });
  // tone: hatching on the right/lower side of the head, and under the eye domes
  if (hatched) {
    hatchIn(g, head, [0, 0, w, h], { angle: Math.PI / 2 + 0.25, spacing: 4.2 * sx, width: 0.75, wobble: 0.5, broken: 0.35, rng, color, alpha: 0.7, jitter: 1 });
  }
  // eyes: whites
  const whiteL = ellipsePts(...S(66, 47), 24 * sx, 17 * sy, 24);
  const whiteR = ellipsePts(...S(134, 47), 24 * sx, 17 * sy, 24);
  stroke(g, whiteL, { rng, width: 0.01, wobble: 0, color: '#f6f2ea', fill: '#f6f2ea', close: true });
  stroke(g, whiteR, { rng, width: 0.01, wobble: 0, color: '#f6f2ea', fill: '#f6f2ea', close: true });
  // pupils, low and inward (the calm look)
  const pupL = ellipsePts(...S(72, 53), 6 * sx, 6.5 * sy, 14);
  const pupR = ellipsePts(...S(128, 53), 6 * sx, 6.5 * sy, 14);
  stroke(g, pupL, { rng, width: 0.8, wobble: 0.2, color, fill: color, close: true });
  stroke(g, pupR, { rng, width: 0.8, wobble: 0.2, color, fill: color, close: true });
  // half-closed lids: a green lid covering the top of each eye, with its own ink edge
  const lidL = [S(41, 46), S(46, 38), S(58, 31), S(74, 30), S(86, 36), S(91, 46), S(80, 47), S(66, 48), S(52, 47)];
  const lidR = [S(109, 46), S(114, 36), S(126, 30), S(142, 31), S(154, 38), S(159, 46), S(148, 47), S(134, 48), S(120, 47)];
  stroke(g, lidL, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true });
  stroke(g, lidR, { rng, width: 0.01, wobble: 0, color: green, fill: green, close: true });
  if (hatched) {
    hatchIn(g, lidL, [0, 0, w, h], { angle: 0.3, spacing: 3.5 * sx, width: 0.6, wobble: 0.4, broken: 0.2, rng, color, alpha: 0.6, jitter: 0.8 });
    hatchIn(g, lidR, [0, 0, w, h], { angle: 0.3, spacing: 3.5 * sx, width: 0.6, wobble: 0.4, broken: 0.2, rng, color, alpha: 0.6, jitter: 0.8 });
  }
  // ink lines over everything
  stroke(g, head, { rng, width: 1.9 * sx, wobble: 0.6, color, close: true });
  stroke(g, eyeL, { rng, width: 1.6 * sx, wobble: 0.5, color, close: true });
  stroke(g, eyeR, { rng, width: 1.6 * sx, wobble: 0.5, color, close: true });
  // lid edges
  stroke(g, [S(42, 46), S(54, 47), S(66, 48), S(80, 47), S(90, 46)], { rng, width: 1.7 * sx, wobble: 0.35, color });
  stroke(g, [S(110, 46), S(120, 47), S(134, 48), S(148, 47), S(158, 46)], { rng, width: 1.7 * sx, wobble: 0.35, color });
  // brow creases between the eyes
  stroke(g, [S(94, 56), S(100, 60), S(106, 56)], { rng, width: 0.9 * sx, wobble: 0.3, color });
  // nostrils
  stroke(g, ellipsePts(...S(92, 78), 1.6 * sx, 1.2 * sy, 8), { rng, width: 0.8, wobble: 0.1, color, fill: color, close: true });
  stroke(g, ellipsePts(...S(108, 78), 1.6 * sx, 1.2 * sy, 8), { rng, width: 0.8, wobble: 0.1, color, fill: color, close: true });
  // mouth: wide, flat, turned down a hair at the corners; red lips as a flat fill under the lines
  const lipTop = [S(38, 98), S(56, 96), S(80, 95), S(100, 95), S(120, 95), S(144, 96), S(162, 98)];
  const lipBot = [S(162, 98), S(150, 104), S(126, 108), S(100, 109), S(74, 108), S(50, 104), S(38, 98)];
  stroke(g, [...lipTop, ...lipBot], { rng, width: 0.01, wobble: 0, color: lips, fill: lips, close: true });
  stroke(g, lipTop, { rng, width: 1.7 * sx, wobble: 0.45, color });
  stroke(g, lipBot, { rng, width: 1.4 * sx, wobble: 0.45, color });
  stroke(g, [S(44, 98), S(60, 101), S(100, 102), S(140, 101), S(156, 98)], { rng, width: 1.0 * sx, wobble: 0.3, color, alpha: 0.9 });
  // chin fold
  stroke(g, [S(70, 122), S(100, 126), S(130, 122)], { rng, width: 1.0 * sx, wobble: 0.3, color, alpha: 0.85 });
  // cheek strokes
  stroke(g, [S(34, 88), S(31, 96)], { rng, width: 0.9 * sx, wobble: 0.2, color, alpha: 0.8 });
  stroke(g, [S(166, 88), S(169, 96)], { rng, width: 0.9 * sx, wobble: 0.2, color, alpha: 0.8 });
}

// A slim drawn hand pointing (the manicule of old printed matter), for the chapter cards.
export function manicule(g, w, h, { seed = 31, color = INK } = {}) {
  const rng = mulberry32(seed);
  const k = w / 60;
  const S = (x, y) => [x * (w / 60), y * (h / 30)];
  const W = (n) => n * Math.max(1, k * 0.8);
  // cuff: a plain sleeve end with a fold line and one button
  stroke(g, [S(2, 8), S(12.5, 8), S(12.5, 24.5), S(2, 24.5)], { rng, width: W(1.3), wobble: 0.3, color, close: true });
  inkLine(g, ...S(5.5, 8.4), ...S(5.5, 24.2), { width: W(0.7), wobble: 0.25, rng, color });
  stroke(g, ellipsePts(...S(9.2, 16.2), 1.1 * k, 1.1 * k, 10), { rng, width: W(0.6), wobble: 0.1, color, fill: color, close: true });
  // the fist with the index finger out: one continuous outline
  const hand = [
    S(12.5, 9), S(17, 7), S(23, 6.2), S(28, 7.5), S(31, 10.2), // back of the hand up to the base of the finger
    S(40, 10.4), S(50, 10.6), S(56.5, 10.9), S(58.6, 12.5), S(56.5, 14.3), S(50, 14.6), S(40, 14.8), S(32.5, 15.2), // the finger
    S(34.5, 17), S(34.5, 19.3), S(32.5, 20.2), S(34.2, 22.2), S(32.5, 23.6), S(31, 25.2), S(24, 26), S(17, 25.6), S(12.5, 24.5), // the curled fingers, bumping out
  ];
  stroke(g, hand, { rng, width: W(1.3), wobble: 0.35, color, close: true });
  // thumb lying across the knuckles
  stroke(g, [S(18.5, 7.2), S(22.5, 9.4), S(25.5, 12.4), S(25.2, 15.4), S(23, 16.4)], { rng, width: W(1.0), wobble: 0.3, color });
  // the three curled fingers: one line each, following the bumps
  stroke(g, [S(23, 16.6), S(29, 16.8), S(33.5, 17.2)], { rng, width: W(0.85), wobble: 0.25, color });
  stroke(g, [S(23.5, 19.6), S(29, 19.8), S(33.2, 20.2)], { rng, width: W(0.85), wobble: 0.25, color });
  stroke(g, [S(24, 22.6), S(29, 22.8), S(33, 23.4)], { rng, width: W(0.85), wobble: 0.25, color });
  // index finger: two knuckle creases and a nail
  stroke(g, [S(39, 11.2), S(39.3, 14.2)], { rng, width: W(0.6), wobble: 0.15, color, alpha: 0.85 });
  stroke(g, [S(47, 11.2), S(47.3, 14.3)], { rng, width: W(0.6), wobble: 0.15, color, alpha: 0.85 });
  stroke(g, [S(54, 11.5), S(56.8, 12.5), S(54, 13.9)], { rng, width: W(0.7), wobble: 0.12, color });
  // a little tone under the curled fingers only
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
    // a small inner frame like a card back
    inkRect(g, x + cw * 0.16, y + ch * 0.12, cw * 0.68, ch * 0.76, { width: Math.max(0.6, ch * 0.028), wobble: 0.25, rng, color, overshoot: 0.5 });
    if (i === current) hatch(g, x + cw * 0.16, y + ch * 0.12, cw * 0.68, ch * 0.76, { angle: Math.PI / 4, spacing: Math.max(2, ch * 0.1), width: Math.max(0.7, ch * 0.04), wobble: 0.25, broken: 0, rng, color, alpha: 1, jitter: 0.4 });
    x += cw + gap;
  }
}

// The masthead's sawtooth edge: a narrow band of triangles down the sides of the card, like
// the red zigzag spine on the magazine's cover.
export function sawtooth(g, x, y0, y1, bw, { color = '#7a2e2a', ink = INK, seed = 17, flip = false, rule = true } = {}) {
  const rng = mulberry32(seed);
  const step = bw * 1.15;
  g.save();
  g.fillStyle = color;
  g.strokeStyle = ink;
  g.lineWidth = 0.6;
  g.lineJoin = 'round';
  for (let y = y0; y + step <= y1 + 0.5; y += step) {
    const j = () => (rng() - 0.5) * 0.9;
    g.beginPath();
    if (!flip) {
      g.moveTo(x + j(), y + j());
      g.lineTo(x + bw + j(), y + step / 2 + j());
      g.lineTo(x + j(), y + step + j());
    } else {
      g.moveTo(x + bw + j(), y + j());
      g.lineTo(x + j(), y + step / 2 + j());
      g.lineTo(x + bw + j(), y + step + j());
    }
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.restore();
  if (rule) {
    const rx = flip ? x - bw * 0.35 : x + bw * 1.35;
    inkLine(g, rx, y0, rx, y1, { width: 0.9, wobble: 0.35, rng, color: ink, alpha: 0.9 });
  }
}

// ---------------------------------------------------------------------------------------------
// Marquee lettering: the film's masthead is a row of dark letters carrying a line of light
// bulbs down the middle of every stroke, mounted on two thin rails. We set the word in Futura
// Bold, take a distance field of the glyphs, and drop one bulb per cell on the ridge of each
// stroke — so the bulbs follow the letterforms the way a signwriter would place them.
function measureWord(g, text, size, tracking, family) {
  g.font = `700 ${size}px ${family}`;
  const widths = [...text].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * size * (text.length - 1);
  return { widths, total };
}

function paintWord(g, text, x, y, size, tracking, family, color, { count = Infinity, lineWidth = 0 } = {}) {
  g.save();
  g.font = `700 ${size}px ${family}`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineJoin = 'round';
  let cx = x;
  [...text].forEach((ch, i) => {
    if (i < count) {
      g.fillText(ch, cx, y);
      if (lineWidth > 0) {
        g.lineWidth = lineWidth;
        g.strokeText(ch, cx, y);
      }
    }
    cx += g.measureText(ch).width + tracking * size;
  });
  g.restore();
}

// Chamfer (3-4) distance transform of an alpha mask. Returns Float32Array of distances (px).
function distanceField(alpha, w, h) {
  const INF = 1e6;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = alpha[i] > 127 ? INF : 0;
  const A = 1, B = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + A);
      if (y > 0) {
        v = Math.min(v, d[i - w] + A);
        if (x > 0) v = Math.min(v, d[i - w - 1] + B);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + B);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + A);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + A);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + B);
        if (x > 0) v = Math.min(v, d[i + w - 1] + B);
      }
      d[i] = v;
    }
  }
  return d;
}

export function marqueeSize(text, size, { tracking = 0.16, family = "'Futura', 'Jost', sans-serif", pad = 0.35 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const { total } = measureWord(g, text, size, tracking, family);
  return { w: Math.ceil(total + size * pad * 2), h: Math.ceil(size * 1.3), textW: total };
}

// Draw the word onto `g` (a context already scaled to CSS px), in a box w x h.
export function marquee(g, w, h, text, { size, tracking = 0.16, family = "'Futura', 'Jost', sans-serif", ink = INK, bulb = '#e0a526', count = Infinity, seed = 3, rails = true } = {}) {
  const rng = mulberry32(seed);
  const { total } = measureWord(g, text, size, tracking, family);
  const x0 = (w - total) / 2;
  const capH = size * 0.72; // Futura cap height
  const base = h / 2 + capH / 2;
  // rails behind the letters: two hairlines through the word, with short posts at the ends
  if (rails) {
    const y1 = base - capH * 0.78, y2 = base - capH * 0.22;
    const ext = size * 0.28;
    inkLine(g, x0 - ext, y1, x0 + total + ext, y1, { width: 1.1, wobble: 0.35, rng, color: ink });
    inkLine(g, x0 - ext, y2, x0 + total + ext, y2, { width: 1.1, wobble: 0.35, rng, color: ink });
    for (const px of [x0 - ext, x0 + total + ext]) {
      inkLine(g, px, y1 - size * 0.06, px, y2 + size * 0.06, { width: 1.3, wobble: 0.3, rng, color: ink });
    }
    // a few hanging posts between letters
    let cx = x0;
    g.font = `700 ${size}px ${family}`;
    const letters = [...text];
    for (let i = 0; i < letters.length - 1; i++) {
      cx += g.measureText(letters[i]).width + tracking * size;
      if (letters[i] === ' ' || letters[i + 1] === ' ') continue;
      const px = cx - (tracking * size) / 2;
      inkLine(g, px, y1 - size * 0.03, px, y2 + size * 0.03, { width: 0.8, wobble: 0.25, rng, color: ink, alpha: 0.85 });
    }
  }
  // the letters
  paintWord(g, text, x0, base, size, tracking, family, ink, { count, lineWidth: Math.max(1, size * 0.012) });
  // bulbs: distance field of the letters at 1 css px
  const mc = document.createElement('canvas');
  mc.width = Math.ceil(w);
  mc.height = Math.ceil(h);
  const mg = mc.getContext('2d');
  paintWord(mg, text, x0, base, size, tracking, family, '#000', { count });
  const img = mg.getImageData(0, 0, mc.width, mc.height).data;
  const alpha = new Uint8Array(mc.width * mc.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = img[i * 4 + 3];
  const D = distanceField(alpha, mc.width, mc.height);
  const cell = Math.max(6, Math.round(size * 0.1));
  const minD = size * 0.05;
  const r = size * 0.023;
  g.save();
  g.fillStyle = bulb;
  // one bulb per cell: the ridge pixel (deepest inside the stroke) nearest the cell centre, so
  // along a straight stem the bulbs sit in an even row and at junctions they double up
  for (let gy = 0; gy < mc.height; gy += cell) {
    for (let gx = 0; gx < mc.width; gx += cell) {
      let best = 0;
      const ye = Math.min(mc.height, gy + cell), xe = Math.min(mc.width, gx + cell);
      for (let y = gy; y < ye; y++) for (let x = gx; x < xe; x++) best = Math.max(best, D[y * mc.width + x]);
      if (best < minD) continue;
      const ccx = gx + cell / 2, ccy = gy + cell / 2;
      let bx = -1, by = -1, bd = Infinity;
      for (let y = gy; y < ye; y++) {
        for (let x = gx; x < xe; x++) {
          if (D[y * mc.width + x] < best - 0.8) continue;
          const dd = (x - ccx) ** 2 + (y - ccy) ** 2;
          if (dd < bd) {
            bd = dd;
            bx = x;
            by = y;
          }
        }
      }
      const rr = Math.min(r, best * 0.5) * (0.94 + rng() * 0.12);
      g.beginPath();
      g.arc(bx + 0.5 + (rng() - 0.5) * 0.5, by + 0.5 + (rng() - 0.5) * 0.5, rr, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}
