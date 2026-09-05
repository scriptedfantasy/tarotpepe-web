// PIECE: props — the drawn patterns that live on the props' surfaces: bottle labels, book
// spines, the pictures inside the frames, the rug's border, the curtain lines, the radio's
// grille and dial, the clock face, the signs' lettering. Every letter in this file is drawn
// stroke by stroke with the pen (penText); no system font enters the drawn world. Tone is
// either solid ink (a black bottle, a mat, a coat) or bare paper; the ink pass adds outlines.
import * as THREE from 'three';
import { INK, PAPER, drawTexture, paper, inkLine, inkRect, hatch, crossHatch, dashes } from '../core/strokes.js';
import { signCaps, signWidth, signFit } from './titles-sign.js';

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

// ---- the hand ------------------------------------------------------------------------------
// Everything lettered on a prop — a bottle's label, a book's spine, the clock's numerals, the
// signs, the mat — is cut in the SAME hand the titles piece cuts its signage in (titles-sign.js).
// This file used to carry a second, smaller alphabet of its own; it had no accents (POÉSIES came
// out POESIES, THÉ came out THE) and its own idea of a wobble. penText/penWidth/penFit are kept as
// the names the rest of the piece calls, and are now three lines of adapter over signCaps:
//   penText's `size` IS the cap height (signCaps calls that `capH`; its own `size` is the em),
//   `weight` is the pen in px (signCaps calls that `pen`),
//   and penText's `tracking` was a fraction of the CAP where signCaps' is a fraction of the em,
//   so it is multiplied by 0.72 on the way through and every existing call keeps its spacing.
const trk = (t) => (t ?? 0.18) * 0.72;
const BASE = { middle: 'middle', top: 'top', bottom: 'alphabetic' };
export function penWidth(text, size, tracking = 0.18) {
  return signWidth(text, { capH: size, tracking: trk(tracking) });
}
export function penText(g, text, x, y, { size = 20, weight = null, rng = Math.random, tracking = 0.18, align = 'center', color = INK, alpha = 1, baseline = 'middle' } = {}) {
  return signCaps(g, text, x, y, {
    capH: size,
    pen: weight ?? Math.max(1.1, size * 0.15),
    tracking: trk(tracking),
    align,
    color,
    alpha,
    baseline: BASE[baseline] ?? 'middle',
    seed: Math.floor((rng ?? Math.random)() * 1e6),
  });
}
// Fit a size so `text` spans at most maxW.
export function penFit(text, size, maxW, tracking = 0.18) {
  return signFit(text, maxW, { capH: size, tracking: trk(tracking) });
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
// A wrap-around texture for a lathe (front = u 0.5, v = 0 at the bottom).
//
// Round 4. How the film actually draws a shelf of bottles — see the two shelves and the sideboard
// in reference/fd-anim-kitchen-table-cards-hires.jpg, and the three on the stand in the same
// folio's right-hand corner. Almost every bottle is BARE PAPER inside a contour. Dark glass is
// stated by a solid CAPSULE over the neck and shoulder, not by filling the body; the body keeps a
// diagonal glass stroke or two and an outlined label. In a group of three or four exactly ONE is
// filled solid, and that one carries a big paper label with the name in it ("Poivenchon" on the
// sideboard). Filling them all — which is what this file did until now — is correct for a black
// object and wrong for a row of them: at 13 px a side they became a picket of blots.
//   dark:false → paper body, ink capsule down to `capsuleV`, an outlined label
//   dark:true  → solid ink body, a big paper label, a paper collar rule at the shoulder
export function labelTexture({ lines = ['VIN'], uRange = [0.3, 0.7], vRange = [0.3, 0.6], bodyV = null, seed = 1, w = 128, h = 256, dark = false, shape = 'rect', glassStroke = true, lidV = null, capsuleV = null, collarV = null }) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, PAPER, { grain: 0, seed });
      if (dark) {
        g.fillStyle = INK;
        g.fillRect(0, 0, W, H);
        // the paper collar the film leaves where the shoulder turns into the neck: one bright
        // rule that keeps a filled bottle from reading as a rectangle
        if (collarV != null) {
          const y = (1 - collarV) * H;
          inkLine(g, 0, y, W, y, { width: Math.max(2, H * 0.012), wobble: 1, rng, color: LABEL_PAPER });
        }
      }
      // the capsule: solid ink over the neck (and, on a wine bottle, the top of the shoulder).
      // On a paper bottle this is its one black area — the mark that says "dark glass" without
      // the body having to be black.
      const capV = capsuleV ?? lidV;
      if (!dark && capV != null) {
        g.fillStyle = INK;
        g.fillRect(0, 0, W, (1 - capV) * H + 1);
      } else if (dark && lidV != null) {
        g.fillStyle = INK;
        g.fillRect(0, 0, W, (1 - lidV) * H + 2);
      }
      if (!dark && glassStroke && bodyV) {
        // the two strokes the film gives a glass bottle, left of centre and nothing else
        const yt = (1 - bodyV[1]) * H, yb = (1 - bodyV[0]) * H;
        inkLine(g, W * 0.38, yt + (yb - yt) * 0.06, W * 0.405, yb - (yb - yt) * 0.14, { width: Math.max(2.4, W * 0.022), wobble: 1.2, rng });
        inkLine(g, W * 0.44, yt + (yb - yt) * 0.1, W * 0.455, yt + (yb - yt) * 0.34, { width: Math.max(2, W * 0.018), wobble: 1, rng });
      }
      const x0 = uRange[0] * W, x1 = uRange[1] * W;
      const y0 = (1 - vRange[1]) * H, y1 = (1 - vRange[0]) * H;
      const lw = x1 - x0, lh = y1 - y0;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const rule = Math.max(1.8, lw * 0.035);
      const o = { width: rule, wobble: 0.9, rng };
      if (shape === 'oval') {
        g.fillStyle = LABEL_PAPER;
        g.beginPath();
        g.ellipse(cx, cy, lw / 2, lh / 2, 0, 0, Math.PI * 2);
        g.fill();
        // two rings, the outer one heavy: on a paper bottle an oval label has no fill to state it
        // and a single thin ring at this size arrives as a dotted smudge
        ring(g, cx, cy, lw / 2 - rule, { ...o, width: rule * 1.6, squash: (lh - 2 * rule) / (lw - 2 * rule), n: 40 });
        ring(g, cx, cy, lw / 2 - rule * 3.4, { ...o, width: rule * 0.8, squash: (lh - 6.8 * rule) / (lw - 6.8 * rule), n: 34 });
      } else if (shape === 'band') {
        g.fillStyle = LABEL_PAPER;
        g.fillRect(0, y0, W, lh);
        inkLine(g, 0, y0 + rule, W, y0 + rule, o);
        inkLine(g, 0, y1 - rule, W, y1 - rule, o);
      } else {
        g.fillStyle = LABEL_PAPER;
        g.fillRect(x0, y0, lw, lh);
        inkRect(g, x0 + rule, y0 + rule, lw - 2 * rule, lh - 2 * rule, { ...o, overshoot: 1 });
      }
      // the name: 3–6 caps in the sign hand, filling the label, with a rule under it
      const n = lines.length;
      let size = lh * (n === 1 ? 0.46 : 0.32);
      for (const t of lines) size = penFit(t, size, lw * 0.76, 0.14);
      const weight = Math.max(1.5, size * 0.16);
      if (n === 1) {
        penText(g, lines[0], cx, cy - (lh > size * 2.6 ? size * 0.24 : 0), { size, weight, rng, tracking: 0.14 });
        if (lh > size * 2.6) inkLine(g, cx - lw * 0.24, cy + size * 0.8, cx + lw * 0.24, cy + size * 0.8, { width: weight * 0.8, wobble: 0.6, rng });
      } else {
        penText(g, lines[0], cx, cy - size * 0.72, { size, weight, rng, tracking: 0.14 });
        penText(g, lines[1], cx, cy + size * 0.72, { size, weight, rng, tracking: 0.14 });
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
  // ROUND 6. The framed circuit diagram, in the place the palmistry hand hung. Eight heavy
  // verticals, eight heavy horizontals, a black dot at every crossing: a jack field on paper,
  // which is what the position under it is, and the picture a man keeps who thinks a grid of
  // pictures tells you something. Drawn BOLD on purpose — the frame is 78 px across in `home`
  // and a fine line there is a grey.
  diagram(g, rng, s) {
    const o = { width: 2, wobble: 0.7, rng };
    const N = 8, x0 = 13, x1 = 87, p = (x1 - x0) / (N - 1);
    // the two heavy bus bars a real diagram carries top and bottom, so it is a circuit and not
    // a chessboard. Drawn first; the grid crosses them.
    inkLine(g, (x0 - 5) * s, (x0 - 5) * s, (x1 + 5) * s, (x0 - 5) * s, { ...o, width: 3.4 });
    inkLine(g, (x0 - 5) * s, (x1 + 5) * s, (x1 + 5) * s, (x1 + 5) * s, { ...o, width: 3.4 });
    for (let i = 0; i < N; i++) {
      const v = (x0 + i * p) * s;
      inkLine(g, v, (x0 - 5) * s, v, (x1 + 5) * s, o);
      inkLine(g, (x0 - 5) * s, v, (x1 + 5) * s, v, o);
    }
    // a black dot at every crossing, half again the weight of the line so a junction is a
    // junction and the plate is not a chequer
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) dot(g, (x0 + i * p) * s, (x0 + j * p) * s, 2.1 * s);
  },
  // ROUND 6. The photograph that was on the wall when he took the room: a woman seated side-on
  // at this board, in a headband, thirty years of it. She is drawn as one solid mass against the
  // board's solid mass with the paper of the room between them — at 78 px that is a person at a
  // machine, and nothing smaller than that would survive.
  operator(g, rng, s) {
    const o = { width: 2.2, wobble: 0.8, rng };
    const P = (a) => a.map(([x, y]) => [x * s, y * s]);
    // the board she faces: a solid panel, stopped ten units short of the plate's edge so a rule
    // of paper stands between it and the black mat. Without that the right half of the picture
    // runs into the mat and it stops being a photograph of anything.
    fillPoly(g, P([[61, 8], [92, 8], [92, 76], [61, 76]]), INK);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) dot(g, (67 + c * 10) * s, (16 + r * 9) * s, 2.6 * s, LABEL_PAPER);
    inkLine(g, 62 * s, 58 * s, 91 * s, 58 * s, { width: 2.6, wobble: 0.8, rng, color: LABEL_PAPER });
    for (let c = 0; c < 5; c++) inkLine(g, (65 + c * 6) * s, 62 * s, (65 + c * 6) * s, 70 * s, { width: 2.2, wobble: 0.6, rng, color: LABEL_PAPER });
    // her, seated side-on: four solid masses that each say one thing at 55 px — the back, the
    // lap, the shin, the stool. A seated figure drawn as one outline arrives as a blot.
    fillPoly(g, P([[25, 68], [22, 54], [26, 42], [33, 37], [39, 40], [40, 52], [38, 66]]), INK);
    fillPoly(g, P([[26, 59], [52, 57], [54, 66], [27, 68]]), INK);
    fillPoly(g, P([[46, 63], [55, 62], [57, 88], [48, 88]]), INK);
    fillPoly(g, P([[17, 65], [31, 65], [31, 70], [17, 70]]), INK);
    fillPoly(g, P([[19, 70], [24, 70], [23, 88], [18, 88]]), INK);
    inkLine(g, 6 * s, 90 * s, 60 * s, 90 * s, { ...o, width: 3 });
    // the arm into the board, and a paper plug where her hand meets it: two black masses that
    // touch need one bright mark at the join or they read as one mass
    stroke(g, quad([36 * s, 45 * s], [48 * s, 42 * s], [62 * s, 33 * s]), { ...o, width: 4.4 });
    dot(g, 62 * s, 33 * s, 2.8 * s, LABEL_PAPER);
    // the head. It has to survive at 9 px, so the hair is a CAP that stops above the face rather
    // than a shape around it, the bun sits clear of the head's outline, and the headband is drawn
    // in PAPER across the black of the hair — a white band on a black crown reads at a size where
    // a black band on black hair does not.
    const head = [];
    for (let i = 0; i <= 22; i++) {
      const t = (i / 22) * Math.PI * 2;
      head.push([38 * s + Math.cos(t) * 9.5 * s, 29 * s + Math.sin(t) * 10.5 * s]);
    }
    fillPoly(g, head, LABEL_PAPER);
    stroke(g, head, { ...o, close: true, width: 2.6 });
    fillPoly(g, P([[29, 28], [29, 22], [34, 17], [43, 18], [47, 24], [47, 28], [43, 22], [35, 21], [31, 25]]), INK);
    dot(g, 26 * s, 25 * s, 4.5 * s); // the bun
    stroke(g, quad([30 * s, 24 * s], [38 * s, 17 * s], [47 * s, 25 * s]), { ...o, width: 2.6, color: LABEL_PAPER });
    dot(g, 30 * s, 31 * s, 3.2 * s); // the receiver at her ear
    dot(g, 44 * s, 30 * s, 1.9 * s); // the eye
  },
  // ROUND 6. The barometer, where the zodiac disc hung. A ring, four numerals, one needle: an
  // instrument that claims to tell you what is coming and is wrong about twice a month.
  barometer(g, rng, s) {
    const o = { width: 2.2, wobble: 0.6, rng };
    const cx = 50 * s, cy = 50 * s;
    ring(g, cx, cy, 45 * s, { ...o, width: 2.6, n: 44, wob: 0.02 });
    ring(g, cx, cy, 39 * s, { ...o, width: 1.4, n: 40, wob: 0.02 });
    ring(g, cx, cy, 26 * s, { ...o, width: 1.4, n: 32, wob: 0.02 });
    // the scale stops short of the bottom, the way an instrument's does and a clock's never
    // does: the one mark that keeps this off the wall as a second clock
    for (let i = 0; i < 24; i++) {
      if (i >= 11 && i <= 13) continue;
      const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
      const long = i % 3 === 0;
      inkLine(g, cx + Math.cos(a) * 39 * s, cy + Math.sin(a) * 39 * s, cx + Math.cos(a) * (long ? 29 : 34) * s, cy + Math.sin(a) * (long ? 29 : 34) * s, { ...o, width: long ? 2.6 : 1.4 });
    }
    // a French barometer is graduated in centimetres of mercury; four numerals, two digits each,
    // set inside the scale on the diagonals where the needle never lies
    for (const [t, x, y] of [['72', 34, 66], ['74', 32, 38], ['76', 68, 38], ['78', 66, 66]]) {
      penText(g, t, x * s, y * s, { size: 12 * s, weight: 2.4 * s, rng, tracking: 0.1 });
    }
    // one needle, and the brass set-hand kept short so that at 12 px only the needle reads
    inkLine(g, cx, cy, cx + 13 * s, cy - 8 * s, { ...o, width: 1.4 });
    fillPoly(g, [[50, 50], [32, 30], [28, 24], [34, 30], [54, 46]].map(([x, y]) => [x * s, y * s]), INK);
    dot(g, cx, cy, 4 * s);
    dot(g, cx, cy, 1.6 * s, LABEL_PAPER);
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
      (PICTURES[kind] ?? PICTURES.diagram)(g, rng, inner / 100 / k);
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

// ---- the doormat -------------------------------------------------------------------------------
// Round 4. The mat lies on a floor the camera rakes at about 6°, so it arrives as a strip a dozen
// pixels deep. The old drawing was a 512x300 sheet — a square drawing squeezed 25:1 on one axis,
// which is 27 texels of pattern per screen pixel: nothing a pen can draw, and the ink pass
// correctly threw the whole thing away and stated a tone. Two things fix that and they are both
// drawing decisions, not shader ones.
//   1. The SHEET is cut to the shape the mat projects to (640 x 96 for a 0.92 x 0.56 mat), so a
//      texel is about as wide on screen as it is tall and every mark on it survives at its drawn
//      weight. Nothing here is squeezed.
//   2. The mat is drawn the way the film draws a rug seen almost edge-on — the runner across the
//      bottom of reference/fd-anim-staircase-guitar-room.jpg: a heavy bound border top and bottom,
//      a bare field between them, and the pattern reduced to what fits in that band. There is no
//      fine coir texture, because at this rake there is no room for one; the mat is three
//      horizontal decisions and a word.
// What is NOT here is the word. The mat now measures 149 x 17.9 px on the wide shot and 198 x 21.7
// on home, and the band between the bindings takes a cap of about 11 px — nine letters of it, each
// one 3 px of pen wide. That is a black smear, the same failure as a row of filled bottles. So the
// greeting moved to a board on the wall under the picture rail, where it is cut at an 18 px cap and
// can be read; the mat carries what the film puts on a rug at this rake instead — a running scroll
// between two bindings, one continuous wave that survives being eleven pixels tall.
export function matTexture({ w = 640, h = 96, seed = 41 } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, '#f4efe6', { grain: 0, seed });
      const bind = Math.round(H * 0.15); // the bound edge, solid
      g.fillStyle = INK;
      g.fillRect(0, 0, W, bind);
      g.fillRect(0, H - bind, W, bind);
      g.fillRect(0, 0, Math.round(W * 0.02), H);
      g.fillRect(W - Math.round(W * 0.02), 0, Math.round(W * 0.02), H);
      // a rule a stroke in from each binding, the way a mat is stitched
      const o = { width: Math.max(2.2, H * 0.032), wobble: 1.2, rng };
      inkLine(g, W * 0.03, bind * 1.9, W * 0.97, bind * 1.9, o);
      inkLine(g, W * 0.03, H - bind * 1.9, W * 0.97, H - bind * 1.9, o);
      // the scroll: one wave down the length with a curl at every crest, and a second, fainter
      // wave a half period out of step, so the band reads as pattern and not as a rule
      // The wave has to be big enough to survive: at eleven periods and a sixteenth of the sheet's
      // height it measured out at 13 px per period and 3 px of swing on screen, which is a texture,
      // not a pattern. Seven periods, a fifth of the height, and the curls a third bigger.
      const y0 = H / 2, amp = H * 0.2, per = W / 7;
      for (const [ph, wd] of [[0, o.width * 1.2], [Math.PI, o.width * 0.8]]) {
        const pts = [];
        for (let x = W * 0.05; x <= W * 0.95; x += per / 12) pts.push([x, y0 + Math.sin((x / per) * Math.PI * 2 + ph) * amp]);
        stroke(g, pts, { width: wd, wobble: 0.8, rng });
      }
      for (let i = 0; i < 7; i++) {
        const x = W * 0.05 + (i + 0.25) * per;
        if (x > W * 0.92) break;
        ring(g, x, y0 + (i % 2 ? amp : -amp) * 0.5, H * 0.15, { width: o.width, wobble: 0.6, rng, n: 11 });
      }
    },
    { seed },
  );
}
// The bristle strip along the mat's near edge, seen end-on: a row of short vertical dashes, the
// only thing that gives the mat a thickness from this angle.
export function matEdgeTexture(seed = 42) {
  return drawTexture(
    512,
    32,
    (g, W, H, rng) => {
      paper(g, W, H, '#f4efe6', { grain: 0, seed });
      inkLine(g, 0, 3, W, 4, { width: 4, wobble: 1.2, rng });
      for (let x = 4; x < W - 4; x += 7 + rng() * 5) {
        inkLine(g, x, 6, x + (rng() - 0.5) * 3, H - 3 - rng() * 8, { width: 3, wobble: 0.6, rng });
      }
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
      // Round 4: twelve numerals on a face 90 px across came out as a ring of grey specks. Four
      // numerals at half again the size read as numerals, and the other eight hours keep their
      // ticks — which is how a clock this small is drawn.
      const nums = { 0: 'XII', 3: 'III', 6: 'VI', 9: 'IX' };
      for (const k of Object.keys(nums)) {
        const a = (+k / 12) * Math.PI * 2 - Math.PI / 2;
        penText(g, nums[k], cx + Math.cos(a) * 72, cy + Math.sin(a) * 72, { size: 30, weight: 4.6, rng, tracking: 0.1 });
      }
      dot(g, cx, cy, 7);
    },
    { seed },
  );
}

// ---- the operator's position -----------------------------------------------------------------
// ROUND 6. Two drawn strips on the switchboard that stands where the chest stood.
//
// THE JACK FIELD. What survived when the tall multiple over the position was unbolted: a strip
// 0.98 x 0.12 m of black plate with the jacks left in paper. Sized off the frame it is read in —
// the plate is 206 px across in `home` and 316 in `pepe`, so a 512-wide sheet puts 2.5 texels
// under a screen pixel and every hole is drawn as drawn. TWO ranks, not the six a real field has:
// at 25 px of plate a third rank is 8 px tall and its holes arrive as a grey. Two ranks of
// eighteen, with the paper mounting rules every sixth jack, is a grid at any size the room is
// looked at from.
export function jackFieldTexture({ w = 512, h = 64, cols = 18, rows = 2, seed = 61 } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      g.fillStyle = INK;
      g.fillRect(0, 0, W, H);
      const px = W / (cols + 1), py = H / (rows + 1);
      // the plate's own mounting rules, in paper: three verticals and a rule under the top edge
      inkLine(g, 0, 3.5, W, 3.5, { width: 4, wobble: 0.9, rng, color: LABEL_PAPER });
      for (let c = 6; c < cols; c += 6) inkLine(g, c * px + px / 2, 6, c * px + px / 2, H - 3, { width: 4, wobble: 0.8, rng, color: LABEL_PAPER });
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = px * (c + 1) + (rng() - 0.5) * 1.2;
          const y = py * (r + 1) + 3 + (rng() - 0.5) * 1.2;
          dot(g, x, y, 6.5, LABEL_PAPER);
          dot(g, x, y, 2.6, INK);
        }
      }
      // two jacks with a cord in them, so the board is a board somebody worked and not a stencil
      for (const c of [3, 11]) dot(g, px * (c + 1), py + 3, 5.5, INK);
    },
    { seed },
  );
}
// THE DESIGNATION STRIP over the keys: paper, a heavy rule top and bottom, one division a key.
// No numerals — a figure on this strip measures 2 px in `home` and the pen does not draw at 2 px.
// The divisions do the same job: it is a strip that was filled in, and it is ordered.
export function keyStripTexture({ w = 512, h = 28, cells = 13, seed = 62 } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      paper(g, W, H, LABEL_PAPER, { grain: 0, seed });
      inkLine(g, 0, 3, W, 3, { width: 5, wobble: 1, rng });
      inkLine(g, 0, H - 3, W, H - 3, { width: 5, wobble: 1, rng });
      for (let i = 1; i < cells; i++) {
        const x = (W * i) / cells;
        inkLine(g, x, 7, x, H - 7, { width: 3, wobble: 0.8, rng });
      }
    },
    { seed },
  );
}

// ---- rug -----------------------------------------------------------------------------------------
// ROUND 5 — THE ORNAMENT IS DRAWN IN METRES, AND IT SITS IN THE OUTER 44 CM OF THE RUG.
//
// The camera builder measured what the tabletop plates land on, twice, and was right the second
// time: a plan view of the cloth sees past the table's 0.62 m rim, and past the rim the ray carries
// on to the FLOOR 0.76 m below, so a plate's bottom edge lands at z 0.98 (390x760) to 1.07 (a 320 px
// phone) — a good half-metre outside the rim, and every centimetre of that used to be this rug's
// scroll border and fringe, which then printed across the bottom corners of every portrait plate.
// The rug is not the fault; the rug was simply drawn to end at 1.1. So the rectangle grows
// downstage instead — near edge 1.10 → 1.66 — and the border, unchanged in every dimension it is
// drawn at, goes out there with it. What that leaves between the table's foot and the first printed
// mark is 60 cm of plain ground (measured off the sheet itself: the field begins at z 1.219) —
// the plates land on bare rug at every phone shape, with 14 cm of margin past the deepest of them.
//
// So this draws in METRES at `ppm` texels each, and the sheet is cut to the rug it is going on —
// the border bands, the scroll's pitch and amplitude, the corner rosettes and the medallion are all
// quoted in metres and are the same size on the floor whatever rug is asked for. (They used to be
// px on a 1024x800 sheet, which meant that resizing the rug at all resized every mark on it.)
const RUG_M = {
  ppm: 320, // texels per metre — 1024 px across the old 3.2 m rug, kept
  b0: 0.056, // the outer plain margin, edge to the solid band
  band: 0.038, // the solid band itself
  gap: 0.025, // plain, then the rule the scroll's ground starts at
  ground: 0.281, // the dashed ground the running scroll sits on
  rule: 0.038, // the double rule that closes the border: field begins after it
  amp: 0.075, // the scroll loop's radius
  pitch: 0.172, // one loop of the scroll
  inset: 0.1375, // how far short of the corner rosette a run of scroll stops
  rosette: 0.075, // the corner rosette's radius
};
// where the field begins, measured in from the rug's edge: everything printed is outside this
export const rugBorder = RUG_M.b0 + RUG_M.band + RUG_M.gap + RUG_M.ground + RUG_M.rule;

export function rugTexture({ w = 3.2, d = 3.16, seed = 14 } = {}) {
  const M = RUG_M;
  const P = (m) => m * M.ppm;
  return drawTexture(
    Math.round(P(w)),
    Math.round(P(d)),
    (g, W, H, rng) => {
      paper(g, W, H, '#f3eee4', { grain: 0, seed });
      const o = { width: 2.6, wobble: 0.9, rng };
      // a solid outer band, then the scroll border on a dashed ground, then a double rule
      const b0 = P(M.b0), band = P(M.band), b1 = P(M.b0 + M.band + M.gap + M.ground);
      const r0 = P(M.b0 + M.band + M.gap); // the rule the dashed ground starts at
      g.fillStyle = INK;
      g.fillRect(b0, b0, W - 2 * b0, band);
      g.fillRect(b0, H - b0 - band, W - 2 * b0, band);
      g.fillRect(b0, b0, band, H - 2 * b0);
      g.fillRect(W - b0 - band, b0, band, H - 2 * b0);
      inkRect(g, r0, r0, W - 2 * r0, H - 2 * r0, { ...o, width: 1.8, overshoot: 0 });
      g.save();
      g.beginPath();
      g.rect(r0, r0, W - 2 * r0, H - 2 * r0);
      g.rect(b1, b1, W - 2 * b1, H - 2 * b1);
      g.clip('evenodd');
      // the dash count is a DENSITY: the same rain of little strokes per square metre of ground
      // whatever the rug's size (1200 on the old 3.2 x 2.6 sheet)
      dashes(g, 0, 0, W, H, { count: Math.round((1200 / (1024 * 800)) * W * H), len: 5, width: 1.3, angle: Math.PI / 4, angleJitter: 0.3, rng, alpha: 0.4 });
      g.restore();
      inkRect(g, b1, b1, W - 2 * b1, H - 2 * b1, { ...o, width: 3, overshoot: 0 });
      const rule = P(M.rule); // the pair is a hand's breadth apart — 12 px on the old sheet
      inkRect(g, b1 + rule, b1 + rule, W - 2 * b1 - 2 * rule, H - 2 * b1 - 2 * rule, { ...o, width: 1.4, overshoot: 0 });
      // the border: a running scroll — loops that curl alternately up and down, a leaf in each
      const amp = P(M.amp);
      const scroll = (x0, y0, x1, y1, n) => {
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;
        const pitch = len / n;
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
          const lw = P(0.0437), lh = P(0.025); // the leaf: 14 x 8 px on the old sheet
          const leaf = [...quad([lx, ly], [lx + ux * lw + nx * s * -lh, ly + uy * lw + ny * s * -lh], tip), ...quad(tip, [lx - ux * lw + nx * s * -lh, ly - uy * lw + ny * s * -lh], [lx, ly])];
          fillPoly(g, leaf, INK);
        }
      };
      const mid = (r0 + b1) / 2, inset = P(M.inset);
      const runs = (len) => Math.max(4, Math.round((len - 2 * inset) / P(M.pitch)));
      scroll(mid + inset, mid, W - mid - inset, mid, runs(W - 2 * mid));
      scroll(mid + inset, H - mid, W - mid - inset, H - mid, runs(W - 2 * mid));
      scroll(mid, mid + inset, mid, H - mid - inset, runs(H - 2 * mid));
      scroll(W - mid, mid + inset, W - mid, H - mid - inset, runs(H - 2 * mid));
      for (const [x, y] of [[mid, mid], [W - mid, mid], [mid, H - mid], [W - mid, H - mid]]) {
        dot(g, x, y, P(M.rosette));
        fillPoly(g, starPoly(x, y, P(M.rosette * 0.54)), LABEL_PAPER);
      }
      // a quiet field with one small central medallion (under the table, and the same size on the
      // floor whatever the rug's size: it is a thing woven into it, not a share of it)
      const cx = W / 2, cy = H / 2;
      for (const [rx, ry, ww] of [[0.406, 0.256, 2.6], [0.338, 0.206, 1.4]]) stroke(g, [[cx, cy - P(ry)], [cx + P(rx), cy], [cx, cy + P(ry)], [cx - P(rx), cy]], { ...o, width: ww, close: true });
      fillPoly(g, starPoly(cx, cy, P(0.069)), INK);
      for (const [ddx, ddy] of [[-0.269, 0], [0.269, 0], [0, -0.1625], [0, 0.1625]]) dot(g, cx + P(ddx), cy + P(ddy), P(0.022));
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
      // Round 3: six fold lines instead of eleven, and no vertical repeat — the curtain is cloth
      // hanging in a few big folds, not a field of rain-hatch beside an already-louvred window.
      for (let v = 0; v < 6; v++) {
        const x0 = 14 + v * 43 + (rng() - 0.5) * 8;
        const pts = [];
        const ph = rng() * 6, fq = 40 + rng() * 30, am = 3 + rng() * 5;
        for (let y = -8; y <= H + 8; y += 10) pts.push([x0 + Math.sin(y / fq + ph) * am, y]);
        stroke(g, pts, { width: v % 3 === 1 ? 3 : 1.8, wobble: 0.6, rng, alpha: 0.95 });
      }
    },
    { repeat: [1, 1], seed },
  );
}

// ---- leaves (alpha cut) ----------------------------------------------------------------------------
export function leafTexture({ kind = 'palm', seed = 16, dark = false } = {}) {
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
      // half the fronds of a plant in the folios are inked solid, the other half left as paper with
      // a hatched underside; a bush of outlined leaves alone is a wire scribble at four metres
      fillPoly(g, outline, dark ? INK : PAPER);
      stroke(g, outline, { ...o, width: 3.6, close: true });
      inkLine(g, cx, 10, cx, H - 10, { ...o, width: dark ? 4.5 : 2.6, color: dark ? PAPER : INK });
      for (let y = 30; y < H - 20; y += 22) {
        const w = Math.sin(((y - 8) / (H - 16)) * Math.PI) * W * 0.36;
        const vo = { ...o, width: dark ? 2.4 : 1.4, color: dark ? PAPER : INK };
        inkLine(g, cx, y, cx + w, y - 14, vo);
        inkLine(g, cx, y + 8, cx - w, y - 6, vo);
      }
      if (dark) return;
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
      // Round 3: a lamp shade in the folios is bare paper with a few long strokes turning the form
      // at its two silhouette edges. 400 strokes made a black scribble at four metres; 150 thinner
      // ones leave the middle of the shade white, which is the point.
      let n = 0, guard = 0;
      while (n < 150 && guard++ < 6000) {
        const x = rng() * W;
        const d = Math.pow(Math.abs(Math.sin((x / W) * Math.PI * 2)), 3.4);
        if (rng() > d) continue;
        const y = rng() * H;
        const len = 40 + rng() * 90;
        inkLine(g, x, y, x + (rng() - 0.5) * 4, Math.min(H, y + len), { width: 2.6, wobble: 1.2, rng, alpha: 0.9 });
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

// ---- the overcoat on the hat stand: an alpha cut-out, solid ink, three paper fold lines --------
export function coatCutTexture(seed = 30) {
  return drawTexture(
    256,
    512,
    (g, W, H, rng) => {
      g.clearRect(0, 0, W, H);
      const j = (v) => v + (rng() - 0.5) * 5;
      // the silhouette: shoulders, sleeves hanging at the sides, a body that flares at the hem
      const shape = [
        [110, 16], [128, 6], [146, 16], [176, 30], [214, 44], [228, 120], [236, 300], [200, 306], [198, 330], [204, 500], [52, 500], [58, 330], [56, 306], [20, 300], [28, 120], [42, 44], [80, 30],
      ].map(([x, y]) => [j(x), j(y)]);
      fillPoly(g, shape, INK);
      const o = { width: 4.5, wobble: 1.8, rng, color: LABEL_PAPER };
      // three fold lines down the body
      for (const u of [98, 128, 158]) inkLine(g, u + (rng() - 0.5) * 4, 70, u + (rng() - 0.5) * 12, 486, o);
      // the collar: a paper V with two lapel strokes
      inkLine(g, 128, 84, 104, 30, o);
      inkLine(g, 128, 84, 152, 30, o);
      inkLine(g, 104, 30, 88, 62, { ...o, width: 3.5 });
      inkLine(g, 152, 30, 168, 62, { ...o, width: 3.5 });
      // sleeve seams and cuffs
      inkLine(g, 58, 60, 52, 296, { ...o, width: 3.5 });
      inkLine(g, 198, 60, 204, 296, { ...o, width: 3.5 });
      inkLine(g, 22, 282, 56, 284, { ...o, width: 3.5 });
      inkLine(g, 200, 284, 234, 282, { ...o, width: 3.5 });
      // buttons
      for (const y of [120, 190, 260]) dot(g, 118, y, 6, LABEL_PAPER);
    },
    { seed },
  );
}

// ---- the cat's head: solid ink, two paper eye slits and whiskers where the sphere faces the room
// (a SphereGeometry's u = 0.25 faces +z), drawn in the texture so no outline swallows them.
export function catHeadTexture(seed = 31) {
  return drawTexture(
    256,
    128,
    (g, W, H, rng) => {
      g.fillStyle = INK;
      g.fillRect(0, 0, W, H);
      const cx = W * 0.25, cy = H * 0.47;
      for (const s of [-1, 1]) {
        // a closed eye: a paper crescent
        g.save();
        g.fillStyle = LABEL_PAPER;
        g.beginPath();
        g.ellipse(cx + s * 17, cy, 11, 4.5, s * 0.18, 0, Math.PI * 2);
        g.fill();
        g.restore();
        // three whiskers
        for (let i = 0; i < 3; i++) inkLine(g, cx + s * 22, cy + 12 + i * 5, cx + s * 58, cy + 6 + i * 9, { width: 2.2, wobble: 0.6, rng, color: LABEL_PAPER });
      }
      dot(g, cx, cy + 10, 3, LABEL_PAPER);
    },
    { seed },
  );
}

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
