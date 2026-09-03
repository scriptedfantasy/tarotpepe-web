// titles-vignette — the little drawn room on the title card, like the cast windows on the
// magazine's poster: the proprietor behind his table, a fan of three cards in one hand, a lamp
// above, a shelf of bottles, a picture on the wall. Ink on the card's flat colour, paper-white
// fills for the robe and the table, green only on the frog.
import { inkLine, inkRect, hatch } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { stroke, ellipsePts, hatchIn, frog, INK } from './titles-draw.js';

const PAPER = '#f3e7c9';
const GREEN = '#5dbb63';
const W = 560, H = 240; // design units

export function vignette(g, w, h, { seed = 51, color = INK, paper = PAPER } = {}) {
  const rng = mulberry32(seed);
  const k = w / W;
  g.save();
  g.scale(k, k);
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();

  // --- the wall: rain-hatch at the edges and under the top rule, a sprig motif in rows
  hatch(g, 10, 10, 46, 220, { angle: Math.PI / 2 + 0.03, spacing: 4.5, width: 0.8, wobble: 0.6, broken: 0.55, rng, color, alpha: 0.45, jitter: 1.5 });
  hatch(g, 504, 10, 46, 220, { angle: Math.PI / 2 - 0.03, spacing: 4.5, width: 0.8, wobble: 0.6, broken: 0.55, rng, color, alpha: 0.45, jitter: 1.5 });
  hatch(g, 10, 10, 540, 18, { angle: Math.PI / 2, spacing: 5.5, width: 0.8, wobble: 0.5, broken: 0.6, rng, color, alpha: 0.4, jitter: 1.5 });
  for (let row = 0; row < 4; row++) {
    const y = 44 + row * 36;
    for (let i = 0; i < 12; i++) {
      const x = 44 + i * 44 + (row % 2 ? 22 : 0) + (rng() - 0.5) * 4;
      if (x > 196 && x < 364) continue; // behind the figure
      if (rng() < 0.12) continue;
      sprig(g, x, y + (rng() - 0.5) * 3, rng, color);
    }
  }

  // --- the lamp: a cord from the top rule, a cone shade, the bulb
  inkLine(g, 280, 10, 281, 34, { width: 1.1, wobble: 0.4, rng, color });
  stroke(g, [[256, 34], [304, 34], [318, 56], [242, 56]], { rng, width: 1.5, wobble: 0.5, color, close: true, fill: paper });
  hatch(g, 244, 36, 22, 19, { angle: Math.PI / 2 + 0.2, spacing: 3.2, width: 0.7, wobble: 0.3, broken: 0.2, rng, color, alpha: 0.7, jitter: 0.6 });
  stroke(g, ellipsePts(280, 60, 5, 5.5, 12), { rng, width: 1.1, wobble: 0.25, color, close: true, fill: color });

  // --- the wall dressing: a shelf of bottles on the left, a picture and a small clock on the right
  shelf(g, 34, 118, 150, rng, color, paper);
  picture(g, 420, 54, 86, 66, rng, color, paper);
  clock(g, 520, 74, 16, rng, color, paper);
  plant(g, 500, 170, rng, color);

  // --- the table: the far edge of a round table cutting the bottom of the window
  const table = ellipsePts(280, 254, 262, 44, 48);
  stroke(g, table, { rng, width: 0.01, wobble: 0, color: paper, fill: paper, close: true });
  const arc = table.filter(([, y]) => y < 254);
  stroke(g, arc.sort((a, b) => a[0] - b[0]), { rng, width: 1.7, wobble: 0.5, color });
  // a cloth hem, and the fringe as short ticks
  const hem = ellipsePts(280, 262, 262, 44, 48).filter(([, y]) => y < 262 && y > 214).sort((a, b) => a[0] - b[0]);
  stroke(g, hem, { rng, width: 0.9, wobble: 0.4, color, alpha: 0.7 });
  for (let i = 0; i < 26; i++) {
    const x = 40 + i * 19 + (rng() - 0.5) * 4;
    if (x > 190 && x < 370) continue;
    const yy = 262 - 44 * Math.sqrt(Math.max(0, 1 - ((x - 280) / 262) ** 2));
    inkLine(g, x, yy + 1, x + (rng() - 0.5) * 2, yy + 5 + rng() * 2, { width: 0.8, wobble: 0.2, rng, color, alpha: 0.8 });
  }
  // a wine glass with its puddle, and a candle in a saucer
  glass(g, 118, 214, rng, color);
  candle(g, 446, 214, rng, color, paper);

  // --- the proprietor: robe, hands, head
  robe(g, rng, color, paper);
  handFlat(g, 222, 213, rng, color);
  cardFan(g, 350, 186, rng, color, paper);
  handGrip(g, 336, 206, rng, color);
  g.save();
  g.translate(206, 52);
  frog(g, 148, 110, { seed: 21, color });
  g.restore();

  // --- the window frame, drawn last so it sits over everything
  g.restore();
  g.save();
  g.scale(k, k);
  inkRect(g, 4, 4, W - 8, H - 8, { width: 1.7, wobble: 0.6, rng, color, overshoot: 3 });
  inkRect(g, 10, 10, W - 20, H - 20, { width: 0.8, wobble: 0.4, rng, color, overshoot: 1.5 });
  g.restore();
}

function sprig(g, x, y, rng, color) {
  stroke(g, [[x, y + 7], [x + 0.5, y], [x + 1, y - 7]], { rng, width: 0.9, wobble: 0.3, color, alpha: 0.75 });
  stroke(g, [[x + 0.6, y - 2], [x + 5, y - 5], [x + 7, y - 1], [x + 3, y + 0.5]], { rng, width: 0.8, wobble: 0.3, color, alpha: 0.75, close: true });
  stroke(g, [[x + 0.2, y + 2], [x - 4, y - 1], [x - 6, y + 3], [x - 2, y + 4]], { rng, width: 0.8, wobble: 0.3, color, alpha: 0.75, close: true });
}

function shelf(g, x, y, w, rng, color, paper) {
  inkLine(g, x, y, x + w, y, { width: 1.6, wobble: 0.5, rng, color });
  inkLine(g, x + 2, y + 4, x + w - 2, y + 4, { width: 0.8, wobble: 0.4, rng, color, alpha: 0.8 });
  // brackets under the shelf
  for (const bx of [x + 14, x + w - 14]) stroke(g, [[bx, y + 5], [bx, y + 16], [bx + 8, y + 5]], { rng, width: 0.9, wobble: 0.3, color, close: true });
  // the bottles: no two alike, most of them solid ink with a paper label
  const kinds = [
    { w: 13, h: 40, neck: 5, solid: true },
    { w: 18, h: 30, neck: 6, solid: false },
    { w: 12, h: 46, neck: 4, solid: true },
    { w: 16, h: 34, neck: 7, solid: true, cork: true },
    { w: 20, h: 26, neck: 8, solid: false },
    { w: 11, h: 42, neck: 4, solid: true },
  ];
  let bx = x + 8;
  for (const b of kinds) {
    const x0 = bx, y0 = y - b.h;
    const nw = b.neck, nh = b.h * 0.3;
    const pts = [[x0, y], [x0, y0 + nh], [x0 + (b.w - nw) / 2, y0 + nh - 4], [x0 + (b.w - nw) / 2, y0], [x0 + (b.w + nw) / 2, y0], [x0 + (b.w + nw) / 2, y0 + nh - 4], [x0 + b.w, y0 + nh], [x0 + b.w, y]];
    stroke(g, pts, { rng, width: 1.2, wobble: 0.4, color, close: true, fill: b.solid ? color : null });
    if (b.solid) {
      const lh = b.h * 0.24, ly = y - b.h * 0.42;
      stroke(g, [[x0 + 2, ly], [x0 + b.w - 2, ly], [x0 + b.w - 2, ly + lh], [x0 + 2, ly + lh]], { rng, width: 0.01, wobble: 0, color: paper, fill: paper, close: true });
      inkLine(g, x0 + 4, ly + lh * 0.5, x0 + b.w - 4, ly + lh * 0.5, { width: 1, wobble: 0.2, rng, color, alpha: 0.9 });
    } else {
      inkLine(g, x0 + 3, y0 + nh + 2, x0 + 3, y - 4, { width: 0.8, wobble: 0.3, rng, color, alpha: 0.7 });
    }
    if (b.cork) stroke(g, [[x0 + (b.w - nw) / 2 - 1, y0], [x0 + (b.w + nw) / 2 + 1, y0], [x0 + (b.w + nw) / 2 + 1, y0 - 4], [x0 + (b.w - nw) / 2 - 1, y0 - 4]], { rng, width: 0.9, wobble: 0.3, color, close: true });
    bx += b.w + 6 + rng() * 4;
  }
}

function picture(g, x, y, w, h, rng, color, paper) {
  inkRect(g, x, y, w, h, { width: 1.8, wobble: 0.5, rng, color, overshoot: 3 });
  inkRect(g, x + 5, y + 5, w - 10, h - 10, { width: 0.8, wobble: 0.4, rng, color, overshoot: 1 });
  // a solid ink mat with a paper-white moon and three stars cut out of it
  stroke(g, [[x + 9, y + 9], [x + w - 9, y + 9], [x + w - 9, y + h - 9], [x + 9, y + h - 9]], { rng, width: 0.01, wobble: 0, color, fill: color, close: true });
  const cx = x + w * 0.42, cy = y + h * 0.5;
  stroke(g, ellipsePts(cx, cy, 14, 14, 24), { rng, width: 0.01, wobble: 0, color: paper, fill: paper, close: true });
  stroke(g, ellipsePts(cx + 7, cy - 3, 12, 12, 24), { rng, width: 0.01, wobble: 0, color, fill: color, close: true });
  for (const [sx, sy] of [[x + w * 0.72, y + h * 0.3], [x + w * 0.8, y + h * 0.62], [x + w * 0.62, y + h * 0.78]]) {
    inkLine(g, sx - 3, sy, sx + 3, sy, { width: 1, wobble: 0.1, rng, color: paper });
    inkLine(g, sx, sy - 3, sx, sy + 3, { width: 1, wobble: 0.1, rng, color: paper });
  }
  // the wire it hangs from
  stroke(g, [[x + 6, y], [x + w / 2, y - 14], [x + w - 6, y]], { rng, width: 0.8, wobble: 0.3, color, alpha: 0.85 });
  inkLine(g, x + w / 2, y - 14, x + w / 2, 10, { width: 0.8, wobble: 0.3, rng, color, alpha: 0.85 });
}

function clock(g, cx, cy, r, rng, color, paper) {
  stroke(g, ellipsePts(cx, cy, r, r, 24), { rng, width: 1.6, wobble: 0.4, color, close: true, fill: paper });
  stroke(g, ellipsePts(cx, cy, r - 3, r - 3, 24), { rng, width: 0.7, wobble: 0.3, color, close: true });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    inkLine(g, cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5), cx + Math.cos(a) * (r - 7.5), cy + Math.sin(a) * (r - 7.5), { width: 0.8, wobble: 0.1, rng, color });
  }
  inkLine(g, cx, cy, cx + 1, cy - r * 0.62, { width: 1.2, wobble: 0.2, rng, color });
  inkLine(g, cx, cy, cx + r * 0.45, cy + 2, { width: 1.2, wobble: 0.2, rng, color });
  inkLine(g, cx, cy - r, cx, 10, { width: 0.8, wobble: 0.3, rng, color, alpha: 0.85 });
}

function plant(g, x, y, rng, color) {
  // a pot on a slim stand, a few long leaves
  stroke(g, [[x - 11, y - 2], [x + 11, y - 2], [x + 8, y + 16], [x - 8, y + 16]], { rng, width: 1.3, wobble: 0.4, color, close: true });
  hatch(g, x - 10, y, 8, 15, { angle: Math.PI / 2, spacing: 2.6, width: 0.6, wobble: 0.3, broken: 0.1, rng, color, alpha: 0.7, jitter: 0.5 });
  for (const [dx, tip] of [[-6, [-24, -22]], [-2, [-10, -32]], [3, [8, -30]], [7, [22, -20]], [0, [2, -15]]]) {
    stroke(g, [[x + dx, y - 2], [x + dx + tip[0] * 0.45, y + tip[1] * 0.7], [x + tip[0], y + tip[1]]], { rng, width: 1.2, wobble: 0.5, color });
    stroke(g, [[x + dx + tip[0] * 0.2, y + tip[1] * 0.35], [x + dx + tip[0] * 0.55, y + tip[1] * 0.62], [x + tip[0], y + tip[1]]], { rng, width: 0.8, wobble: 0.4, color, alpha: 0.8 });
  }
  inkLine(g, x, y + 16, x, y + 34, { width: 1.3, wobble: 0.3, rng, color });
  inkLine(g, x - 12, y + 34, x + 12, y + 34, { width: 1.3, wobble: 0.3, rng, color });
  inkLine(g, x - 9, y + 34, x - 11, y + 44, { width: 1.1, wobble: 0.3, rng, color });
  inkLine(g, x + 9, y + 34, x + 11, y + 44, { width: 1.1, wobble: 0.3, rng, color });
}

function glass(g, x, y, rng, color) {
  stroke(g, [[x - 7, y - 26], [x - 5, y - 12], [x, y - 9], [x + 5, y - 12], [x + 7, y - 26]], { rng, width: 1.2, wobble: 0.35, color, close: true });
  stroke(g, [[x - 6, y - 16], [x - 3, y - 11], [x + 3, y - 11], [x + 6, y - 16]], { rng, width: 0.01, wobble: 0, color, fill: color, close: true });
  inkLine(g, x, y - 9, x, y - 1, { width: 1.1, wobble: 0.2, rng, color });
  inkLine(g, x - 6, y, x + 6, y, { width: 1.2, wobble: 0.3, rng, color });
}

function candle(g, x, y, rng, color, paper) {
  stroke(g, ellipsePts(x, y - 2, 12, 3.5, 20), { rng, width: 1.1, wobble: 0.3, color, close: true });
  stroke(g, [[x - 4, y - 4], [x + 4, y - 4], [x + 3.5, y - 30], [x - 3.5, y - 30]], { rng, width: 1.2, wobble: 0.35, color, close: true, fill: paper });
  inkLine(g, x, y - 30, x, y - 35, { width: 0.9, wobble: 0.2, rng, color });
  stroke(g, [[x, y - 35], [x + 3, y - 41], [x, y - 48], [x - 3, y - 41]], { rng, width: 0.9, wobble: 0.3, color, close: true, fill: color });
}

function robe(g, rng, color, paper) {
  const body = [[268, 146], [292, 146], [336, 152], [352, 178], [358, 222], [202, 222], [208, 178], [224, 152]];
  stroke(g, body, { rng, width: 1.8, wobble: 0.6, color, close: true, fill: paper });
  // the collar, the sleeves' seams, a few folds; tone on the far side
  stroke(g, [[264, 148], [280, 174], [296, 148]], { rng, width: 1.5, wobble: 0.4, color });
  stroke(g, [[228, 156], [222, 190], [216, 220]], { rng, width: 1.1, wobble: 0.5, color, alpha: 0.85 });
  stroke(g, [[332, 156], [340, 190], [346, 220]], { rng, width: 1.1, wobble: 0.5, color, alpha: 0.85 });
  stroke(g, [[280, 176], [279, 210]], { rng, width: 0.9, wobble: 0.5, color, alpha: 0.7 });
  hatchIn(g, body, [200, 146, 60, 80], { angle: Math.PI / 2 + 0.15, spacing: 3.6, width: 0.7, wobble: 0.4, broken: 0.35, rng, color, alpha: 0.55, jitter: 0.8 });
}

function handFlat(g, x, y, rng, color) {
  // palm down on the cloth, fingers splayed towards us
  const palm = ellipsePts(x, y, 17, 7, 20);
  stroke(g, palm, { rng, width: 0.01, wobble: 0, color: GREEN, fill: GREEN, close: true });
  for (let i = 0; i < 4; i++) {
    const fx = x - 12 + i * 8, fy = y + 5;
    const f = [[fx - 3, fy], [fx - 3.5, fy + 9], [fx + 3.5, fy + 9], [fx + 3, fy]];
    stroke(g, f, { rng, width: 1.2, wobble: 0.35, color, close: true, fill: GREEN });
  }
  stroke(g, [[x + 17, y - 2], [x + 25, y + 3], [x + 19, y + 6]], { rng, width: 1.2, wobble: 0.35, color, close: true, fill: GREEN });
  stroke(g, palm, { rng, width: 1.4, wobble: 0.4, color, close: true });
  stroke(g, [[x - 18, y - 6], [x - 10, y - 12], [x - 2, y - 8]], { rng, width: 1.2, wobble: 0.4, color }); // the cuff
}

function cardFan(g, x, y, rng, color, paper) {
  const cw = 24, ch = 36;
  for (const rot of [-0.42, -0.12, 0.2]) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (px, py) => [x + (px * c - py * s), y + (px * s + py * c)];
    const box = [P(-cw / 2, -ch), P(cw / 2, -ch), P(cw / 2, 0), P(-cw / 2, 0)];
    stroke(g, box, { rng, width: 1.3, wobble: 0.4, color, close: true, fill: paper });
    const inner = [P(-cw / 2 + 3, -ch + 3), P(cw / 2 - 3, -ch + 3), P(cw / 2 - 3, -3), P(-cw / 2 + 3, -3)];
    stroke(g, inner, { rng, width: 0.7, wobble: 0.3, color, close: true });
    const [mx, my] = P(0, -ch * 0.6);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      inkLine(g, mx - Math.cos(a) * 4, my - Math.sin(a) * 4, mx + Math.cos(a) * 4, my + Math.sin(a) * 4, { width: 1, wobble: 0.1, rng, color });
    }
  }
}

function handGrip(g, x, y, rng, color) {
  const palm = ellipsePts(x, y, 15, 10, 20, 0.5);
  stroke(g, palm, { rng, width: 1.4, wobble: 0.4, color, close: true, fill: GREEN });
  for (let i = 0; i < 3; i++) {
    const fx = x + 4 + i * 6, fy = y - 8 + i * 2;
    stroke(g, [[fx - 2, fy + 4], [fx, fy - 6], [fx + 4, fy - 5], [fx + 4, fy + 4]], { rng, width: 1.2, wobble: 0.35, color, close: true, fill: GREEN });
  }
  stroke(g, [[x - 16, y + 2], [x - 10, y - 10], [x - 2, y - 8]], { rng, width: 1.2, wobble: 0.4, color }); // the cuff
}
