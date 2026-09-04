// dialogue-ink.js — the pen for everything the dialogue draws:
//
//   drawPlacard  the card every line arrives on — a hand-cut sheet with a deckled edge, four
//                strokes that cross at every corner, and the ink rules across it
//   drawName     a name LETTERED in the sign hand (titles-sign.js) rather than set in a font
//   drawCaret    the visitor's caret: a short ink dash on the baseline
//   drawMic      the carbon microphone that stands on the table beside the ashtray
//
// The caret and the microphone are drawn twice — once wide in paper, so the hatching behind them
// is knocked out the way an inker leaves a gap around a drawn object, and once in ink at the pen's
// own weight. Nothing here is a box, a band or a background. Everything is a stroke.
import { INK, PAPER } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signGlyphs, SIGN_ASCENT, SIGN_DESCENT, SIGN_HAS } from './titles-sign.js';

export const SVGNS = 'http://www.w3.org/2000/svg';

// The name on the card — the speaker above the rule, the card's own name in an intertitle — is
// LETTERED, not set: the small hand-cut alphabet the titles piece cut for exactly this (its note
// in titles-sign.js names the placard). Nothing inside the drawing is allowed to be a system font.
// Drawn into a canvas at the display's own resolution (times two, so the pen keeps its edge when
// the browser scales it), sized from the same measurement the letters are cut from.
export function drawName(canvas, text, capH, { seed = 5, tracking = 0.3, pen = null, boil = 0 } = {}) {
  const opts = { capH, tracking, seed, boil, ...(pen ? { pen } : {}) };
  const m = signGlyphs(text, opts);
  const pad = Math.max(2, capH * 0.3);
  const w = Math.ceil(m.width + pad * 2);
  const h = Math.ceil(capH * (1 + SIGN_ASCENT + SIGN_DESCENT)) + 2;
  const dpr = Math.min(4, Math.max(2, (window.devicePixelRatio || 1) * 2));
  if (canvas.dataset.k !== `${text}|${w}|${h}|${seed}`) {
    canvas.dataset.k = `${text}|${w}|${h}|${seed}`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    signCaps(g, text, w / 2, capH * SIGN_ASCENT + 1, { ...opts, align: 'center', baseline: 'top' });
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  return { w, h };
}
export const CAN_LETTER = SIGN_HAS;

// One pen stroke: points every ~10 units, drifting off the straight line by a slow random walk,
// the ends a little past the corners.
export function stroke(x1, y1, x2, y2, rng, { wobble = 1.1, overshoot = 1.2 } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
  const nx = -dy, ny = dx;
  const o1 = overshoot * (0.3 + rng()), o2 = overshoot * (0.3 + rng());
  const n = Math.max(2, Math.round(len / 9));
  const pts = [];
  let off = (rng() - 0.5) * wobble;
  for (let i = 0; i <= n; i++) {
    off = Math.max(-wobble * 1.5, Math.min(wobble * 1.5, off + (rng() - 0.5) * wobble));
    const s = -o1 + (len + o1 + o2) * (i / n);
    pts.push([x1 + dx * s + nx * off, y1 + dy * s + ny * off]);
  }
  return pts;
}

// An arc / a closed ring, drawn point by point with the same shake.
export function arc(cx, cy, rx, ry, rng, { from = 0, to = Math.PI * 2, wobble = 0.6, n = 0 } = {}) {
  const steps = n || Math.max(8, Math.round((Math.abs(to - from) / (Math.PI * 2)) * 34));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const j = (rng() - 0.5) * wobble;
    pts.push([cx + Math.cos(a) * (rx + j), cy + Math.sin(a) * (ry + j)]);
  }
  return pts;
}

export const pathD = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

// Parallel chords inside a circle, at `angle`, `gap` apart: a hatched grille.
function chords(cx, cy, r, angle, gap, rng) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const out = [];
  for (let d = -r + gap * 0.6; d < r - gap * 0.4; d += gap) {
    const half = Math.sqrt(Math.max(0, r * r - d * d)) - 0.6;
    if (half < 0.8) continue;
    const mx = cx - sa * d, my = cy + ca * d;
    out.push(stroke(mx - ca * half, my - sa * half, mx + ca * half, my + sa * half, rng, { wobble: 0.35, overshoot: 0.3 }));
  }
  return out;
}

// Draw a set of paths twice into an svg: a wide paper underlay, then the ink line over it.
// `groups` is [{ d, cls, fill }] — cls goes on the ink copy only, so CSS can hide parts of it.
function twice(groups, lw) {
  const under = groups
    .map((g) => `<path d="${g.d}" fill="none" stroke="${PAPER}" stroke-width="${(lw * 4.2).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  const over = groups
    .map((g) => `<path class="${g.cls ?? ''}" d="${g.d}" fill="${g.fill ?? 'none'}" stroke="${INK}" stroke-width="${(g.w ?? lw).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  return `<g class="under">${under}</g><g class="over">${over}</g>`;
}

// The caret: a short dash sitting on the baseline, about the width of a letter.
// viewBox is 0 0 20 26; the dash lies at y ≈ 20, which is where the baseline falls.
export function drawCaret(svg, seed = 5) {
  const rng = mulberry32(seed);
  svg.setAttribute('viewBox', '0 0 20 26');
  const d = pathD(stroke(1.6, 20, 18.4, 20, rng, { wobble: 0.7, overshoot: 0.9 }));
  svg.innerHTML =
    `<path class="u" d="${d}" fill="none" stroke="${PAPER}" stroke-width="7.5" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.1" stroke-linecap="round"/>`;
}

// The microphone: a carbon ball head on a yoke, a stem, a turned foot. A ring is drawn on the
// table around the foot while it is listening. viewBox 0 0 56 66, the foot at (28, 56).
export function drawMic(svg, seed = 31) {
  const rng = mulberry32(seed);
  svg.setAttribute('viewBox', '0 0 56 66');
  const cx = 28, cy = 19, r = 12.6;
  const lw = 1.6;

  const head = pathD(arc(cx, cy, r, r, rng, { wobble: 0.7, n: 40 }));
  const grille = [...chords(cx, cy, r - 1.6, Math.PI / 4, 3.1, rng), ...chords(cx, cy, r - 1.6, -Math.PI / 4, 3.1, rng)].map(pathD);
  const band = pathD(stroke(cx - r + 1.4, cy + 0.6, cx + r - 1.4, cy + 0.6, rng, { wobble: 0.5, overshoot: 0.6 }));
  // the yoke: two arms from the sides of the head down to the collar
  const armL = pathD(arc(cx, cy + 2.4, r + 3.4, r + 5.6, rng, { from: Math.PI * 0.98, to: Math.PI * 0.52, wobble: 0.5 }));
  const armR = pathD(arc(cx, cy + 2.4, r + 3.4, r + 5.6, rng, { from: Math.PI * 0.02, to: Math.PI * 0.48, wobble: 0.5 }));
  const collar = pathD(stroke(cx - 4.4, 38.4, cx + 4.4, 38.4, rng, { wobble: 0.35, overshoot: 0.5 }));
  const stemL = pathD(stroke(cx - 2.1, 38.6, cx - 2.1, 54.4, rng, { wobble: 0.3, overshoot: 0.4 }));
  const stemR = pathD(stroke(cx + 2.1, 38.6, cx + 2.1, 54.4, rng, { wobble: 0.3, overshoot: 0.4 }));
  const footTop = pathD(arc(cx, 55.2, 9.6, 2.8, rng, { wobble: 0.4, n: 26 }));
  const footRim = pathD(arc(cx, 57.0, 11.4, 3.3, rng, { wobble: 0.45, n: 26 }));
  const ring = pathD(arc(cx, 58.2, 26.5, 8.8, rng, { wobble: 1.0, n: 44 }));

  const groups = [
    { d: head, cls: 'ball', w: lw },
    ...grille.map((d) => ({ d, cls: 'grille', w: lw * 0.62 })),
    { d: band, cls: 'grille', w: lw * 0.8 },
    { d: armL, w: lw },
    { d: armR, w: lw },
    { d: collar, w: lw },
    { d: stemL, w: lw },
    { d: stemR, w: lw },
    { d: footTop, w: lw },
    { d: footRim, w: lw },
  ];
  svg.innerHTML = twice(groups, lw) + `<path class="ring" d="${ring}" fill="none" stroke="${INK}" stroke-width="${lw}" stroke-linecap="round"/>`;
}


// ---------------------------------------------------------------------------------------------
// THE PLACARD — the card the line brings with it into the picture, like the sign the passenger
// holds up in the metro carriage of the Aline sequence (reference/fd-anim-metro-carriage.png):
// a hand-cut card of the same paper as the drawing, framed in one pen.
//
// Three things make it a drawn object rather than a rectangle with a border:
//
//   1. DECKLE. Every side is a torn/hand-cut paper edge, not a ruled line: a slow bow across the
//      whole side (a card is never flat), a random walk over it, and now and then a bite where a
//      fibre came away. The paper fill follows exactly that outline, so the shape you see IS the
//      cut of the card.
//   2. CORNERS THAT CROSS. The frame is four separate strokes, each drawn a good few pixels past
//      both corners, the way a hand rules a box and does not stop on the mark. No corner closes.
//   3. THE RULE. A wobbly ink rule under the speaker's name, as the brief asks, and a shorter one
//      dividing his line from the visitor's own words. Drawn with the same pen as the frame.
//
// The user asked for this card back after a critic had it removed in favour of free-floating type;
// see BRIEF.md. It is not a web element with a border: it is a drawn object.
export const PLACARD_BLEED = 15; // px the svg extends past the box, for the overshooting corners

// A hand-cut paper edge from (x1,y1) to (x2,y2). Positive offsets go INWARD (the normal (-dy,dx)
// points into the box for a clockwise traversal), so the same points serve the fill and the rule.
function deckle(x1, y1, x2, y2, rng, { amp = 0.9, bow = 1.5 } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
  const nx = -dy, ny = dx;
  const n = Math.max(8, Math.min(80, Math.round(len / 9)));
  const b = (rng() - 0.5) * 2 * bow; // the whole side bows one way
  const pts = [];
  let slow = (rng() - 0.5) * amp;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    slow = Math.max(-amp * 1.5, Math.min(amp * 1.5, slow + (rng() - 0.5) * amp * 0.62));
    // a fibre came away: a short bite out of the edge, or a whisker left on it
    const bite = rng() < 0.05 ? (rng() - 0.4) * amp * 2.2 : 0;
    const off = b * Math.sin(u * Math.PI) + slow + bite;
    pts.push([x1 + dx * len * u + nx * off, y1 + dy * len * u + ny * off]);
  }
  return pts;
}

// Push the two ends of a polyline out along their own direction: the pen ran past the corner.
function runOn(pts, d0, d1) {
  const out = pts.map((p) => p.slice());
  const n = pts.length;
  if (n < 2) return out;
  const ext = (a, b, d) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [b[0] + ((b[0] - a[0]) / l) * d, b[1] + ((b[1] - a[1]) / l) * d];
  };
  out[0] = ext(pts[1], pts[0], d0);
  out[n - 1] = ext(pts[n - 2], pts[n - 1], d1);
  return out;
}

const shift = (pts, x1, y1, x2, y2, d) => {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -((y2 - y1) / len) * d, ny = ((x2 - x1) / len) * d;
  return pts.map(([px, py]) => [px + nx, py + ny]);
};

/**
 * Draw the card. `rules` are the ink rules across it — {y} in box pixels (0 = the top of the
 * caption's box), with an optional `inset` (px from each side, default the card's own margin),
 * `w` (pen width, default a hair under the frame's) and `short` (a fraction of the measure, for a
 * centred divider). Returns nothing; the svg is replaced.
 */
export function drawPlacard(svg, w, h, seed = 7, lw = 2.4, rules = []) {
  const rng = mulberry32(seed);
  const B = PLACARD_BLEED;
  const W = w + 2 * B, H = h + 2 * B;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  const x0 = B, y0 = B, x1 = B + w, y1 = B + h;
  // the cut of the paper, clockwise from the top-left corner
  const amp = Math.max(1.0, Math.min(2.2, w * 0.0028));
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const cut = corners.map((a, i) => {
    const b = corners[(i + 1) % 4];
    // a long edge bows more than a short one, as a sheet of card does
    const bow = Math.min(7, Math.max(1.2, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.009));
    return deckle(a[0], a[1], b[0], b[1], rng, { amp, bow });
  });
  const fill = cut.flat();
  // the pen frames the card just inside its edge, each side run well past both corners
  const frame = cut.map((pts, i) => {
    const a = corners[i], b = corners[(i + 1) % 4];
    const inked = shift(pts, a[0], a[1], b[0], b[1], lw * 0.75 + 0.6);
    return runOn(inked, 3.5 + rng() * 6.5, 3.5 + rng() * 6.5);
  });

  const pad = Math.max(10, Math.min(30, w * 0.045));
  const ruleD = rules.map((r) => {
    const ins = r.inset ?? pad;
    const span = (w - 2 * ins) * (r.short ?? 1);
    const cx = B + w / 2;
    const ry = B + r.y;
    // ruled with the same hand as the card's own edge: a slow bow, not a straight line
    const a = amp * (r.short ? 0.5 : 0.8);
    const pts = deckle(cx - span / 2, ry, cx + span / 2, ry, rng, { amp: a * 0.55, bow: a * 2.4 });
    return { d: pathD(runOn(pts, 1 + rng() * 2.5, 1 + rng() * 2.5)), w: r.w ?? lw * 0.72 };
  });

  svg.innerHTML =
    `<path d="${pathD(fill)}Z" fill="${PAPER}" stroke="none"/>` +
    frame.map((pts) => `<path d="${pathD(pts)}" fill="none" stroke="${INK}" stroke-width="${lw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
    ruleD.map((r) => `<path d="${r.d}" fill="none" stroke="${INK}" stroke-width="${r.w.toFixed(2)}" stroke-linecap="round"/>`).join('');
}
