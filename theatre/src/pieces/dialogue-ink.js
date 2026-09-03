// dialogue-ink.js — the pen for the two drawn objects the dialogue owns: the visitor's caret
// (a short ink dash under the last letter) and the microphone that stands on the table beside the
// ashtray. Both are drawn twice: once wide in paper (so the hatching behind them is knocked out
// the way an inker leaves a gap around a drawn object) and once in ink at the pen's own weight.
//
// Nothing here is a box, a band or a background. Everything is a stroke.
import { INK, PAPER } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const SVGNS = 'http://www.w3.org/2000/svg';

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
