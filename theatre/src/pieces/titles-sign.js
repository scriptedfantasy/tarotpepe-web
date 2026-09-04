// titles-sign — THE SIGN HAND: the small hand-cut alphabet.
//
// The marquee face in titles-draw.js is cut for cap heights of 100 px and up; below about 60 px its
// wobble and overshoot eat the word. This is the secondary alphabet for everything else in the
// drawn world — corner captions, the door's fanlight, shop signage, the placard's speaker name —
// cut the same way the film letters a shopfront (COIFFEUR, OPTIQUE in
// reference/fd-anim-fountain-square-wide.png): upright monoline caps drawn with the contour pen,
// generously tracked, every letter a little different.
//
// Nothing here is a typeset glyph. Each letter is a set of centre-lines on a 100-unit cap; the pen
// drifts across every stroke, no two stems weigh the same, letters lean ±2°, the baseline wanders,
// round counters do not quite close, and the whole word is re-cut when `boil` changes (the caller
// passes `Math.floor(frame / 2)` so it shivers on the 12 fps clock's every second frame).
//
// For other pieces (entrance, dialogue, props) this is a drop-in for `letter()` in core/strokes.js:
//
//   import { signCaps } from './titles-sign.js';
//   signCaps(g, 'TAROT PEPE', cx, cy, { size: 34, tracking: 0.16, weight: 700, rng });
//
// `size` is the font-size letter() took (cap height = size × 0.72), `x, y` the same anchor
// (`align` 'center' | 'left' | 'right', `y` the middle of the cap band), so only the call changes.
// Pass `capH` instead of `size` to set a cap height directly. Measure with signWidth(), size a word
// to a measure with signFit(), and take the raw polylines with signGlyphs() if you need geometry.
//
// Options: capH | size · tracking (fraction of the em, like letter()'s; 0.14 default, 0.24–0.34 for
// signage) · pen (the pen's width in px; `weight` is the same thing, except that a round hundred is
// read as a CSS font-weight for letter()'s sake) · color · alpha · align · baseline
// ('middle' | 'top' | 'alphabetic') · seed | rng · boil (an integer: pass Math.floor(frame / 2) and
// the word is re-cut on every second frame of the 12 fps clock) · lean, drift (0 turns the lean and
// the baseline wander off; 1 is the hand).
//
// The hand is cut for cap heights of about 20–40 px and holds down to 14; below that the counters
// close up and it is better to draw the sense of a word (two ruled lines) than the word. NOTE for
// props-textures.js, whose own penText() takes `size` AS THE CAP HEIGHT: swap it for
// `signCaps(g, t, x, y, { capH: size, pen: weight, rng, tracking })`, not `size:`.
// The case holds A–Z, 0–9, the accented caps (É È Ê Ë À Á Â Ä Ç Î Ï Ì Í Ô Ò Ó Ö Û Ù Ú Ü Ñ) and
// & · • — – - : ; , . ° ' ! ? « » / ( ) + = ×. SIGN_HAS(text) says whether a string is all in it.
import { mulberry32 } from '../core/rng.js';

export const INK = '#0d0e0d';

// ---------------------------------------------------------------------------------------------
// The pen. A polyline is resampled and given a slow drift across its length — a hand's wander,
// not a jitter — plus a hair of pen noise, and it runs a little past both ends.
function drift(pts, { wobble = 1, rng = Math.random, step = 5, period = 34, noise = 0.22 } = {}) {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const lens = [];
  let total = 0;
  for (let i = 0; i < n - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(l);
    total += l;
  }
  const knots = Math.max(2, Math.ceil(total / period) + 1);
  const K = [];
  for (let i = 0; i < knots; i++) K.push((rng() - 0.5) * 2 * wobble);
  const offAt = (d) => {
    const u = Math.min(knots - 1, Math.max(0, (d / (total || 1)) * (knots - 1)));
    const i = Math.min(knots - 2, Math.floor(u));
    const f = u - i;
    const c = (1 - Math.cos(f * Math.PI)) / 2;
    return K[i] * (1 - c) + K[i + 1] * c;
  };
  const out = [];
  let d = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = lens[i];
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
  const a = pts[n - 2], b = pts[n - 1], l = lens[n - 2] || 1;
  const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
  const o = offAt(total);
  out.push([b[0] + nx * o, b[1] + ny * o]);
  return out;
}

// Run the pen a hair past each end of an open stroke, the way a hand does not stop on the mark.
function overrun(pts, d0, d1) {
  if (pts.length < 2 || (d0 <= 0 && d1 <= 0)) return pts;
  const out = pts.map((p) => p.slice());
  if (d0 > 0) {
    const [a, b] = [pts[0], pts[1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    out[0] = [a[0] - ((b[0] - a[0]) / l) * d0, a[1] - ((b[1] - a[1]) / l) * d0];
  }
  if (d1 > 0) {
    const n = pts.length;
    const [a, b] = [pts[n - 2], pts[n - 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    out[n - 1] = [b[0] + ((b[0] - a[0]) / l) * d1, b[1] + ((b[1] - a[1]) / l) * d1];
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The case. Cap height is 100 units, 0 at the cap line, 100 at the baseline; accents go above 0,
// commas and the cedilla below 100. Each entry is [advance, strokes]; a stroke is a polyline, or
// { ring } for a bowl the pen closes badly, or { dot } for a point.
const P = Math.PI;
const arc = (cx, cy, rx, ry, a0, a1, n = 12) => {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return o;
};
const ring = (cx, cy, rx, ry) => ({ ring: [cx, cy, rx, ry] });
const dot = (x, y, r = 5.5) => ({ dot: [x, y, r] });

const GLYPHS = {
  A: [66, [[[3, 100], [18, 51], [33, 2]], [[33, 2], [48, 51], [63, 100]], [[14, 70], [52, 70]]]],
  B: [61, [
    [[7, 1], [7, 99]],
    [[7, 2], ...arc(30, 26, 21, 24, -P / 2, P / 2, 8), [8, 50]],
    [[7, 50], ...arc(29, 74, 25, 24, -P / 2, P / 2, 8), [8, 98]],
  ]],
  C: [68, [arc(35, 50, 30, 48, -0.34 * P, -1.66 * P, 18)]],
  D: [68, [[[7, 1], [7, 99]], [[7, 2], ...arc(30, 50, 32, 48, -P / 2, P / 2, 12), [8, 98]]]],
  E: [57, [[[7, 1], [7, 99]], [[7, 2], [53, 2]], [[7, 50], [45, 50]], [[7, 98], [55, 98]]]],
  F: [54, [[[7, 1], [7, 99]], [[7, 2], [52, 2]], [[7, 50], [44, 50]]]],
  G: [71, [arc(35, 50, 30, 48, -0.34 * P, -1.78 * P, 18), [[60, 79], [65, 70], [65, 52], [48, 52]]]],
  H: [63, [[[7, 1], [7, 99]], [[56, 1], [56, 99]], [[7, 50], [56, 50]]]],
  I: [15, [[[7, 1], [7, 99]]]],
  J: [50, [[[39, 1], [39, 68], ...arc(23, 68, 16, 27, 0, P, 8), [5, 60]]]],
  K: [61, [[[7, 1], [7, 99]], [[55, 2], [9, 55]], [[24, 41], [58, 99]]]],
  L: [53, [[[7, 1], [7, 98]], [[7, 98], [51, 98]]]],
  M: [79, [[[6, 99], [6, 3], [39, 68], [72, 3], [72, 99]]]],
  N: [65, [[[7, 99], [7, 2]], [[7, 3], [57, 95]], [[57, 98], [57, 2]]]],
  O: [74, [ring(37, 50, 33, 48)]],
  P: [59, [[[7, 1], [7, 99]], [[7, 2], ...arc(28, 28, 24, 26, -P / 2, P / 2, 10), [8, 54]]]],
  Q: [74, [ring(37, 50, 33, 48), [[46, 73], [69, 104]]]],
  R: [61, [[[7, 1], [7, 99]], [[7, 2], ...arc(27, 27, 23, 25, -P / 2, P / 2, 10), [8, 52]], [[29, 52], [57, 99]]]],
  S: [59, [[[53, 19], [47, 7], [31, 2], [15, 8], [11, 21], [17, 32], [31, 41], [45, 53], [51, 65], [49, 83], [37, 96], [19, 98], [8, 89], [5, 78]]]],
  T: [59, [[[2, 2], [57, 2]], [[29, 3], [29, 99]]]],
  U: [65, [[[6, 1], ...arc(31, 66, 25, 32, P, 0, 12), [57, 1]]]],
  V: [64, [[[3, 2], [32, 98], [61, 2]]]],
  W: [86, [[[3, 2], [22, 98], [43, 22], [64, 98], [83, 2]]]],
  X: [63, [[[5, 2], [58, 99]], [[58, 2], [5, 99]]]],
  Y: [62, [[[4, 2], [31, 51], [58, 2]], [[31, 49], [31, 99]]]],
  Z: [59, [[[4, 2], [55, 2]], [[54, 3], [5, 97]], [[4, 97], [56, 97]]]],
  0: [65, [ring(32, 50, 27, 48)]],
  1: [40, [[[9, 18], [24, 3], [24, 99]]]],
  2: [58, [[[7, 22], [14, 8], [29, 2], [45, 8], [50, 21], [45, 35], [8, 96], [55, 96]]]],
  3: [58, [[[8, 15], [21, 3], [38, 3], [50, 13], [47, 30], [31, 45]], [[31, 45], [48, 53], [54, 69], [45, 89], [27, 97], [10, 91], [5, 79]]]],
  4: [63, [[[42, 3], [4, 73], [57, 73]], [[42, 32], [42, 99]]]],
  5: [57, [[[51, 3], [13, 3], [9, 43], [25, 36], [43, 41], [52, 57], [47, 81], [29, 96], [12, 91], [5, 79]]]],
  6: [61, [[[47, 7], [31, 2], [15, 15], [9, 45], [10, 73], [21, 92], [39, 96], [52, 84], [52, 65], [38, 54], [20, 57], [10, 69]]]],
  7: [57, [[[3, 3], [54, 3], [24, 99]]]],
  8: [61, [ring(30, 26, 21, 24), ring(31, 74, 25, 24)]],
  9: [61, [[[14, 93], [30, 98], [46, 85], [52, 55], [51, 27], [40, 8], [22, 4], [9, 16], [9, 35], [23, 46], [41, 43], [51, 31]]]],
  ' ': [34, []],
  '.': [24, [dot(11, 95, 7)]],
  ',': [25, [[[13, 91], [12, 102], [5, 112]]]],
  ':': [24, [dot(11, 33, 7), dot(11, 95, 7)]],
  ';': [26, [dot(12, 33, 7), [[14, 91], [13, 102], [6, 112]]]],
  '-': [40, [[[6, 54], [34, 54]]]],
  '–': [50, [[[5, 53], [45, 53]]]],
  '—': [68, [[[4, 53], [64, 53]]]],
  '·': [30, [dot(14, 52, 9)]],
  '•': [32, [dot(15, 52, 10)]],
  '&': [74, [[[68, 99], [30, 57], [17, 43], [16, 24], [27, 9], [43, 8], [53, 19], [50, 33], [37, 45], [16, 62], [10, 77], [17, 93], [33, 98], [51, 91], [62, 76]]]],
  '°': [32, [ring(15, 16, 10, 10)]],
  "'": [20, [[[10, 2], [7, 27]]]],
  '’': [20, [[[10, 2], [7, 27]]]],
  '!': [23, [[[10, 2], [9, 68]], dot(9, 95, 7)]],
  '?': [53, [[[7, 21], [15, 7], [31, 3], [45, 11], [47, 26], [37, 38], [26, 48], [26, 66]], dot(26, 95, 7)]],
  '«': [46, [[[23, 31], [8, 52], [23, 73]], [[40, 31], [25, 52], [40, 73]]]],
  '»': [46, [[[7, 31], [22, 52], [7, 73]], [[24, 31], [39, 52], [24, 73]]]],
  '/': [46, [[[6, 100], [40, 1]]]],
  '(': [30, [[[22, -2], [9, 24], [7, 52], [9, 80], [22, 106]]]],
  ')': [30, [[[8, -2], [21, 24], [23, 52], [21, 80], [8, 106]]]],
  '+': [50, [[[8, 52], [42, 52]], [[25, 35], [25, 69]]]],
  '=': [50, [[[8, 40], [42, 40]], [[8, 64], [42, 64]]]],
  '×': [46, [[[9, 32], [37, 70]], [[37, 32], [9, 70]]]],
};

// A letter carrying a mark: the base sort plus the accent the signwriter brushed over it.
const MARKS = {
  acute: (w) => [[[w / 2 - 7, -14], [w / 2 + 11, -32]]],
  grave: (w) => [[[w / 2 - 11, -32], [w / 2 + 7, -14]]],
  circ: (w) => [[[w / 2 - 13, -14], [w / 2, -32], [w / 2 + 13, -14]]],
  trema: (w) => [dot(w / 2 - 11, -22, 4.5), dot(w / 2 + 11, -22, 4.5)],
  tilde: (w) => [[[w / 2 - 14, -18], [w / 2 - 4, -28], [w / 2 + 4, -18], [w / 2 + 14, -28]]],
  cedilla: (w) => [[[w / 2 - 2, 99], [w / 2 + 5, 110], [w / 2 - 8, 117]]],
};
const ACCENTED = {
  'É': ['E', 'acute'], 'È': ['E', 'grave'], 'Ê': ['E', 'circ'], 'Ë': ['E', 'trema'],
  'À': ['A', 'grave'], 'Á': ['A', 'acute'], 'Â': ['A', 'circ'], 'Ä': ['A', 'trema'],
  'Ç': ['C', 'cedilla'],
  'Î': ['I', 'circ'], 'Ï': ['I', 'trema'], 'Ì': ['I', 'grave'], 'Í': ['I', 'acute'],
  'Ô': ['O', 'circ'], 'Ò': ['O', 'grave'], 'Ó': ['O', 'acute'], 'Ö': ['O', 'trema'],
  'Û': ['U', 'circ'], 'Ù': ['U', 'grave'], 'Ú': ['U', 'acute'], 'Ü': ['U', 'trema'],
  'Ñ': ['N', 'tilde'],
};

// How far the case reaches past the cap band, in cap units: accents above, commas below.
export const SIGN_ASCENT = 0.36;
export const SIGN_DESCENT = 0.2;

const sortFor = (ch) => {
  if (GLYPHS[ch]) return [GLYPHS[ch], null];
  const acc = ACCENTED[ch];
  if (acc && GLYPHS[acc[0]]) return [GLYPHS[acc[0]], acc[1]];
  return [null, null];
};
export const SIGN_HAS = (text) => [...String(text).toUpperCase()].every((c) => sortFor(c)[0]);

// ---------------------------------------------------------------------------------------------
// Cutting a word. Every letter gets its own stem weight, its own lean (±2°), a slow baseline
// drift down the line and a hair of its own, and — for the bowls — a gap where the pen did not
// quite close the counter. The geometry and the drawing agree because both come from here.
function capOf({ capH, size }) {
  return capH != null ? capH : (size ?? 28) * 0.72;
}

/**
 * The word's polylines, in px, with the cap line at y = 0 and the baseline at y = capH.
 * Returns { width, capH, above, below, glyphs: [{ ch, x, advance, strokes: [[[x,y],…]], pen }] }.
 * `strokes` are already leaned, drifted in position and opened at the counters — draw them with a
 * pen of `pen` px (or your own) and they are the letters you see on the cards.
 */
export function signGlyphs(text, opts = {}) {
  const {
    tracking = 0.14,
    seed = 0,
    boil = 0,
    lean = 1,
    drift: driftAmt = 1,
    weight = null,
    ringGap = 1,
  } = opts;
  const capH = capOf(opts);
  const size = capH / 0.72;
  const k = capH / 100;
  const chars = [...String(text).toUpperCase()];
  const base = mulberry32((seed * 2654435761 + boil * 40503 + chars.length * 97) >>> 0);
  const phase = base() * Math.PI * 2;
  const wOK = typeof weight === 'number' && weight > 0 && !(weight >= 100 && weight % 100 === 0);
  const pen = wOK ? weight : Math.max(1.15, capH * (capH < 26 ? 0.112 : 0.128));
  const out = [];
  let x = 0;
  chars.forEach((ch, i) => {
    const [sort, mark] = sortFor(ch);
    if (!sort) {
      x += 34 * k + tracking * size;
      return;
    }
    const [adv, strokes] = sort;
    const rng = mulberry32((seed * 374761393 + boil * 668265263 + i * 2246822519 + ch.charCodeAt(0) * 3266489917) >>> 0);
    const sx = 0.97 + rng() * 0.07; // no two sorts are the same width
    const rot = (rng() - 0.5) * 0.07 * lean; // ±2°
    // the baseline wanders down the line, and each letter sits a hair off it
    const dy = (Math.sin(phase + i * 0.83) * 0.022 + (rng() - 0.5) * 0.024) * capH * driftAmt;
    const w = adv * sx * k;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const cx = adv * sx * 0.5, cy = 50;
    const T = ([px, py]) => {
      const ux = (px * sx - cx) * k, uy = (py - cy) * k;
      return [x + w / 2 + ux * cos - uy * sin, capH / 2 + dy + ux * sin + uy * cos];
    };
    const list = [];
    const add = (pts) => list.push(pts.map(T));
    for (const st of strokes) {
      if (Array.isArray(st)) add(st);
      else if (st.ring) {
        // the counter the pen does not quite close: a gap of 6–16°, somewhere different each time
        const [rx0, ry0, rr, rry] = st.ring;
        const g0 = rng() * Math.PI * 2;
        const gap = (0.1 + rng() * 0.17) * ringGap;
        add(arc(rx0, ry0, rr, rry, g0 + gap, g0 + Math.PI * 2, Math.max(14, Math.round(rr / 2.2))));
      } else if (st.dot) {
        const [dx0, dy0, dr] = st.dot;
        list.push({ dot: [...T([dx0, dy0]), Math.max(0.7, dr * k * (0.85 + rng() * 0.3))] });
      }
    }
    if (mark) for (const st of MARKS[mark](adv)) (Array.isArray(st) ? add(st) : list.push({ dot: [...T(st.dot.slice(0, 2)), Math.max(0.7, st.dot[2] * k)] }));
    out.push({ ch, x, advance: w + tracking * size, w, strokes: list, pen: pen * (0.9 + rng() * 0.22), seedN: (rng() * 1e9) >>> 0 });
    x += w + tracking * size;
  });
  const width = Math.max(0, x - (chars.length ? tracking * size : 0));
  return { width, capH, above: capH * SIGN_ASCENT, below: capH * SIGN_DESCENT, glyphs: out, pen };
}

/** The measure of a word set in this hand, in px. */
export function signWidth(text, opts = {}) {
  return signGlyphs(text, opts).width;
}

/** The cap height at which `text` spans at most `maxW` (never larger than the one asked for). */
export function signFit(text, maxW, opts = {}) {
  const capH = capOf(opts);
  const w = signWidth(text, { ...opts, capH });
  return w > maxW ? Math.max(6, capH * (maxW / w)) : capH;
}

/** The box a line occupies: width, and the height including accents and descenders. */
export function signBox(text, opts = {}) {
  const m = signGlyphs(text, opts);
  return { w: Math.ceil(m.width) + 4, h: Math.ceil(m.capH * (1 + SIGN_ASCENT + SIGN_DESCENT)), capH: m.capH, above: m.above };
}

/**
 * Draw `text` in the sign hand. Drop-in for core/strokes.js `letter()`:
 *   signCaps(g, 'TAROT PEPE', cx, cy, { size: 34, tracking: 0.16, weight: 700, rng })
 * `x` is the anchor for `align` ('center' | 'left' | 'right'); `y` is the middle of the cap band
 * ('middle', the default), or the cap line ('top'), or the baseline ('alphabetic').
 * Pass `capH` to set a cap height directly, `weight` in px for the pen (a number > 8 is read as a
 * CSS font-weight and ignored), `boil` = Math.floor(frame / 2) to re-cut it every second frame.
 * Returns the width drawn.
 */
export function signCaps(g, text, x, y, opts = {}) {
  const {
    color = INK,
    alpha = 1,
    align = 'center',
    baseline = 'middle',
    seed = null,
    rng: outerRng = null,
    boil = 0,
  } = opts;
  // `weight` is the pen's width in px — except that letter() took a CSS font-weight there, so a
  // round hundred (100…900) is read as one and only makes the hand a little heavier. `pen` is
  // always px, for a caller who wants no ambiguity.
  const w0 = opts.pen != null ? opts.pen : opts.weight;
  const css = opts.pen == null && typeof w0 === 'number' && w0 >= 100 && w0 % 100 === 0;
  const penW = typeof w0 === 'number' && w0 > 0 && !css ? w0 : null;
  const bolder = css && w0 >= 600 ? 1.16 : 1;
  const s = seed != null ? seed : outerRng ? Math.floor(outerRng() * 1e6) : 7;
  const m = signGlyphs(text, { ...opts, weight: penW, seed: s, boil });
  const capH = m.capH;
  const x0 = align === 'center' ? x - m.width / 2 : align === 'right' ? x - m.width : x;
  const y0 = baseline === 'middle' ? y - capH / 2 : baseline === 'alphabetic' ? y - capH : y;
  const wob = Math.max(0.26, capH * 0.021);
  const over = Math.max(0.5, capH * 0.026);
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const L of m.glyphs) {
    const lrng = mulberry32((L.seedN + boil * 7919) >>> 0);
    const pw = L.pen * bolder;
    for (const st of L.strokes) {
      if (st.dot) {
        const dx = x0 + st.dot[0], dy = y0 + st.dot[1], dr = st.dot[2];
        g.beginPath();
        const rr = Math.max(pw * 0.52, dr);
        const n = 8;
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2 + lrng();
          const px = dx + Math.cos(a) * rr * (0.86 + lrng() * 0.28) + (lrng() - 0.5) * 0.4;
          const py = dy + Math.sin(a) * rr * (0.86 + lrng() * 0.28) + (lrng() - 0.5) * 0.4;
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath();
        g.fill();
        continue;
      }
      const src = overrun(st, lrng() < 0.62 ? over * lrng() : 0, lrng() < 0.62 ? over * lrng() : 0);
      const pts = drift(src.map(([px, py]) => [x0 + px, y0 + py]), {
        wobble: wob,
        rng: lrng,
        step: Math.max(3, capH * 0.16),
        period: Math.max(10, capH * 0.6),
        noise: wob * 0.3,
      });
      g.lineWidth = pw * (0.86 + lrng() * 0.3); // no two stems weigh the same
      g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
      // now and then the hand goes back over a stroke and the line thickens where it was retraced
      if (lrng() < 0.17) {
        const again = drift(src.map(([px, py]) => [x0 + px, y0 + py]), {
          wobble: wob * 0.8,
          rng: lrng,
          step: Math.max(3, capH * 0.16),
          period: Math.max(10, capH * 0.6),
          noise: wob * 0.3,
        });
        g.lineWidth = pw * 0.72;
        g.beginPath();
        again.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
        g.stroke();
      }
    }
  }
  g.restore();
  return m.width;
}

/** Draw a line already fitted to a measure; returns the cap height used. */
export function signCapsFit(g, text, x, y, maxW, opts = {}) {
  const capH = signFit(text, maxW, opts);
  signCaps(g, text, x, y, { ...opts, capH, size: undefined });
  return capH;
}
