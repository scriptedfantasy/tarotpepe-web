// entrance-door — the pen work of the opening shot: one door, drawn, dead centre on a bare sheet.
//
// It is the parlour's OWN door (room.js `buildDoor`), turned round and seen from the landing: the
// same case — plinth blocks, architrave, a cornice cap, a transom light over the head — and the
// same three raised-and-fielded panels, letter plate, spyhole and big key left in the lock. The
// ironmongery is mirrored, because from outside the knob is on the right and the door hangs on the
// left. The name is on a board screwed to the top panel and cut in the masthead's own alphabet
// (titles-draw.js) — painted, not lit: at door scale the marquee's bulbs close up into a grey
// weave, so the sorts are set solid, two lines, no rails. A signwriter's plate, not a title card.
//
// Everything is drawn in metres (the room's own numbers) and mapped to the sheet by `placement`.
// The leaf swings about its left edge into the room, so its FRONT face — the name, the knob, the
// key — stays towards us and foreshortens: every point (u, v) on the face goes through a real
// one-point projection, so verticals stay vertical, the panels compress, and the pen keeps one
// weight at every angle. The doorway behind the leaf is punched out of the sheet, which is how
// the parlour (the live drawing under this layer) is seen through it.
import { INK, PAPER, inkLine, hatch, letter } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { marquee, marqueeFit, marqueeSize } from './titles-draw.js';
// the small hand-cut face, so nothing on the door is set in a system font (STYLE.md checklist 7)
import { signCaps } from './titles-sign.js';

// ---- the case, in metres, lifted from room.js buildDoor -------------------------------------------
export const D = {
  opening: 0.9, // x1 - x0 of the structural opening
  head: 2.45, // y1
  leafTop: 2.12, // top (the head of the leaf)
  lining: 0.035,
  transomBar: 0.05,
  arch: 0.1, // architrave band
  archHead: 0.1,
  cap: 0.035, // the cornice over the head
  capOver: 0.02,
  plinth: 0.2,
  stile: 0.11,
  mat: 0.34, // the doormat, out on the landing
};
D.totalH = D.head + D.archHead + D.cap; // 2.585
D.totalW = D.opening + 2 * (D.arch + D.capOver); // 1.14, cornice to cornice
D.leafX0 = D.lining + 0.004;
D.leafX1 = D.opening - D.lining - 0.004;
D.leafW = D.leafX1 - D.leafX0; // 0.822
D.leafY0 = 0.006;
D.leafY1 = D.leafTop - 0.004; // 2.116
D.leafH = D.leafY1 - D.leafY0; // 2.110

// the four rails of the leaf, bottom of each to top of each, in absolute y
const RAILS = [
  [D.leafY1 - 0.12, D.leafY1],
  [D.leafY1 - 0.96, D.leafY1 - 0.86],
  [D.leafY0 + 0.66, D.leafY0 + 0.76],
  [D.leafY0, D.leafY0 + 0.2],
];
const PANELS = [
  [RAILS[1][1], RAILS[0][0]], // top: the name board is screwed to this one
  [RAILS[2][1], RAILS[1][0]], // middle
  [RAILS[3][1], RAILS[2][0]], // bottom
];
const KNOB_Y = 1.02;
const BOARD_INSET = 0.03; // the name board overruns the panel and sits on the stiles
const BOARD_PAD = 0.026;

// how far the eye stands from the sheet, in leaf widths: the recession of the swinging leaf
const EYE = 2.55;

// ---- where the drawing sits on the sheet -----------------------------------------------------------
// Two numbers decide the whole composition. The case and its mat stand in `span` of the frame's
// height with its cornice at `top`; everything else — all that bare paper — follows.
// `zoom` trucks the whole sheet in about the middle of the doorway, which is where the visitor is
// walking: the drawing swells past the frame while the room behind it stays exactly where it is,
// which is what going through a door looks like.
export function placement(w, h, { span = 0.815, top = 0.082, zoom = 1 } = {}) {
  const s0 = (h * span) / (D.totalH + D.mat);
  const fx = w / 2, fy = h * top + D.totalH * s0 - ((D.leafY0 + D.leafY1) / 2) * s0; // the doorway's middle
  const s = s0 * zoom;
  return { s, s0, zoom, ox: fx - (D.opening / 2) * s, oy: fy + ((D.leafY0 + D.leafY1) / 2) * s, w, h };
}

// ---- the name, cut once and kept --------------------------------------------------------------------
// The masthead's hand-cut slab caps, TAROT over PEPE, fitted to the board. Baked into its own canvas
// at pen resolution so the swing can warp it without re-cutting the letters.
export function cutName(place, dpr = 2) {
  const inner = (D.leafW - 2 * BOARD_INSET - 2 * BOARD_PAD) * place.s;
  // 0.86 of what the board could take: the letters want air round them, and the board wants to sit
  // inside the top panel rather than fill it edge to edge
  const capH = Math.max(9, marqueeFit('TAROT', 300, inner).capH * 0.86);
  // The sorts are cut large and set down small. marquee's hand is tuned for a title card — at a
  // 36 px cap its wobble, overshoot and corner ticks are a third of a stroke wide and the word
  // erodes into porridge. Cut at ~130 px and let the board scale it: the same hand, finer.
  const over = Math.max(1, Math.min(8, 130 / capH));
  const big = Math.round(capH * over);
  const words = ['TAROT', 'PEPE'].map((t) => ({ t, ...marqueeSize(t, big) }));
  const lead = Math.round(big * 0.06);
  const cw = Math.ceil(Math.max(...words.map((x) => x.w)));
  const ch = Math.ceil(words.reduce((a, x) => a + x.h, 0) + lead);
  const c = document.createElement('canvas');
  c.width = Math.max(2, cw);
  c.height = Math.max(2, ch);
  const g = c.getContext('2d');
  let y = 0;
  words.forEach((x, i) => {
    g.save();
    g.translate((cw - x.w) / 2, y);
    // bulb = ink: the sorts are painted solid. At door size the marquee's bulbs would close up
    // into a grey weave and the name would stop being a word.
    marquee(g, x.w, x.h, x.t, { capH: x.capH, ink: INK, bulb: INK, rails: false, seed: 3 + i * 4 });
    g.restore();
    y += x.h + lead;
  });
  return { canvas: c, w: cw / over, h: ch / over, mh: ch / over / place.s, dpr };
}

// ---- the sheet ---------------------------------------------------------------------------------------
// theta: the swing, in radians (0 = shut). jolt: px of latch-shiver on the whole case. seed: the boil.
export function drawEntrance(g, w, h, { theta = 0, jolt = 0, seed = 1, name = null, marks = true, zoom = 1 } = {}) {
  const P = placement(w, h, { zoom });
  const rng = mulberry32(seed);
  const mx = (x) => P.ox + x * P.s + jolt;
  const my = (y) => P.oy - y * P.s;
  const px = (m) => m * P.s; // a length in metres → px
  // Hatch spacing does not truck in with the drawing past a point: an animator retones a cell when
  // he enlarges it, and tone that thins out as the camera approaches is tone that stops being tone.
  const hs = (m) => m * P.s0 * Math.min(P.zoom, 2.1);
  const pen = Math.max(1.4, h / 560); // one pen, one pressure, whatever the frame

  // the sheet
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w * 4, h * 4);
  g.restore();
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);

  // ---- the leaf's projection ------------------------------------------------------------------------
  const ct = Math.cos(theta), st = Math.sin(theta);
  const Vx = mx(D.opening / 2), Vy = my((D.leafY0 + D.leafY1) / 2);
  const Dpx = px(D.leafW) * EYE;
  // (u, v) on the leaf's front face → the sheet. u = 0 at the hinge, v = 0 at the head.
  function L(u, v) {
    const k = 1 / (1 + (u * px(D.leafW) * st) / Dpx);
    const x = mx(D.leafX0 + u * D.leafW * ct);
    const y = my(D.leafY1 - v * D.leafH);
    return [Vx + (x - Vx) * k, Vy + (y - Vy) * k];
  }
  const uOf = (x) => (x - D.leafX0) / D.leafW;
  const vOf = (y) => (D.leafY1 - y) / D.leafH;
  const quad = (u0, v0, u1, v1) => [L(u0, v0), L(u1, v0), L(u1, v1), L(u0, v1)];
  const traceQ = (q) => {
    g.beginPath();
    q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };
  const bboxOf = (q) => {
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  };
  // A truck-in throws most of the drawing off the sheet; nothing off the sheet is drawn, and no
  // stroke is ever asked to run further than the sheet is wide.
  const onScreen = (q) => {
    const b = bboxOf(q);
    return b[0] < w + 40 && b[1] < h + 40 && b[0] + b[2] > -40 && b[1] + b[3] > -40;
  };
  const edges = (q, wd = pen, wob = 1.0) => {
    if (!onScreen(q)) return;
    for (let i = 0; i < 4; i++) inkLine(g, q[i][0], q[i][1], q[(i + 1) % 4][0], q[(i + 1) % 4][1], { width: wd, wobble: wob, rng });
  };
  const shade = (q, { spacing, alpha = 0.75, angle = Math.PI / 2, broken = 0.4, width = pen * 0.5 } = {}) => {
    if (!onScreen(q)) return;
    const b = bboxOf(q);
    const x0 = Math.max(-8, b[0]), y0 = Math.max(-8, b[1]);
    const x1 = Math.min(w + 8, b[0] + b[2]), y1 = Math.min(h + 8, b[1] + b[3]);
    if (x1 <= x0 || y1 <= y0) return;
    g.save();
    traceQ(q);
    g.clip();
    hatch(g, x0, y0, x1 - x0, y1 - y0, { angle, spacing, width, wobble: 0.5, broken, rng, alpha, jitter: spacing * 0.4 });
    g.restore();
  };

  // ---- the wall: bare paper, and a tight skirt of rain-hatch where it meets the case -----------------
  // Short strokes, dense against the architrave and gone within a hand's breadth: the wall reads
  // as plaster and the sheet stays empty, which is the whole point of this frame.
  const wallY0 = my(D.totalH) + px(0.02), wallY1 = my(0) + px(0.01);
  const near = mx(-D.arch - D.capOver) > -60 || mx(D.opening + D.arch + D.capOver) < w + 60; // the case still on the sheet
  if (near)
  for (const side of [-1, 1]) {
    const edge = side < 0 ? mx(-D.arch - D.capOver) : mx(D.opening + D.arch + D.capOver);
    for (let i = 0; i < 340; i++) {
      const t = rng() ** 1.7; // crowded at the case, gone within a hand's breadth
      if (rng() < t * 0.75) continue;
      const x = edge + side * (px(0.022) + t * px(0.3));
      const y0 = wallY0 + rng() * (wallY1 - wallY0);
      inkLine(g, x, y0, x + (rng() - 0.5) * 1.4, y0 + px(0.03 + rng() * 0.055), { width: pen * 0.55, wobble: 0.45, rng, alpha: 0.62 - t * 0.3 });
    }
  }
  if (near && my(D.totalH) > -40)
    for (let i = 0; i < 110; i++) {
      const t = rng() ** 1.7;
      if (rng() < t * 0.75) continue;
      const x = mx(-D.arch - D.capOver - 0.05) + rng() * px(D.totalW + 0.1);
      const y = my(D.totalH) - px(0.02) - t * px(0.22);
      inkLine(g, x, y, x + (rng() - 0.5) * 1.4, y + px(0.024 + rng() * 0.04), { width: pen * 0.55, wobble: 0.45, rng, alpha: 0.58 - t * 0.3 });
    }

  // ---- punch the doorway out of the sheet: the parlour is under this layer -----------------------------
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(mx(D.lining), my(D.leafY0));
  g.lineTo(mx(D.opening - D.lining), my(D.leafY0));
  g.lineTo(mx(D.opening - D.lining), my(D.leafTop - 0.004));
  g.lineTo(mx(D.lining), my(D.leafTop - 0.004));
  g.closePath();
  g.fill();
  g.restore();

  // ---- the leaf ----------------------------------------------------------------------------------------
  const face = quad(0, 0, 1, 1);
  traceQ(face);
  g.fillStyle = PAPER;
  g.fill();

  // tone. A painted door is nearly bare paper; what tone there is comes up with the angle, because
  // the face is turning away from whatever light there is on the landing.
  const dark = Math.min(1, theta / 1.3);
  const stileU = D.stile / D.leafW;
  shade(face, { spacing: hs(0.3) * (1 - 0.6 * dark), alpha: 0.2 + 0.42 * dark, broken: 0.8, width: pen * 0.45 });
  // Swung in, the face turns away from whatever light is on the landing and goes over to cross-hatch
  // — a dark mass, the way the film draws anything edge-on to the light. Its spacing is measured on
  // the sheet, not in metres, so the tone holds while the drawing trucks past.
  if (dark > 0.25) {
    const b = bboxOf(face);
    const sp = Math.max(11, Math.min(b[2], w) / (11 + 20 * dark));
    shade(face, { spacing: sp, alpha: 0.34 * dark, broken: 0.45, width: pen * 0.45 });
    shade(face, { spacing: sp * 1.4, angle: Math.PI / 2 + 0.44, alpha: 0.24 * dark, broken: 0.55, width: pen * 0.45 });
  }
  shade(quad(0, 0, stileU, 1), { spacing: hs(0.055) * (1 - 0.4 * dark), alpha: 0.26 + 0.4 * dark, broken: 0.72, width: pen * 0.45 });
  shade(quad(1 - stileU, 0, 1, 1), { spacing: hs(0.055) * (1 - 0.4 * dark), alpha: 0.26 + 0.4 * dark, broken: 0.72, width: pen * 0.45 });
  for (const [r0, r1] of RAILS)
    shade(quad(stileU, vOf(r1), 1 - stileU, vOf(r0)), { spacing: hs(0.05), angle: 0, alpha: 0.24 + 0.4 * dark, broken: 0.75, width: pen * 0.45 });

  // panels: one bolection line and one field line, and a shadow tucked under the head of each
  for (const [p0, p1] of PANELS) {
    const u0 = stileU, u1 = 1 - stileU, v0 = vOf(p1), v1 = vOf(p0);
    const bu = 0.034 / D.leafW, bv = 0.034 / D.leafH;
    shade(quad(u0, v0, u1, v0 + bv * 1.1), { spacing: hs(0.015), alpha: 0.8, broken: 0.12, angle: 0, width: pen * 0.5 });
    shade(quad(u0, v0, u0 + bu * 1.1, v1), { spacing: hs(0.018), alpha: 0.55, broken: 0.3, width: pen * 0.5 });
    edges(quad(u0, v0, u1, v1), pen, 1.1);
    edges(quad(u0 + bu, v0 + bv, u1 - bu, v1 - bv), pen * 0.72, 1.0);
  }

  // stiles and rails over their own tone
  const line = (u0, v0, u1, v1, wd = pen) => {
    const a = L(u0, v0), b = L(u1, v1);
    inkLine(g, a[0], a[1], b[0], b[1], { width: wd, wobble: 1.0, rng });
  };
  line(stileU, 0, stileU, 1);
  line(1 - stileU, 0, 1 - stileU, 1);
  for (const [r0, r1] of RAILS) {
    line(stileU, vOf(r0), 1 - stileU, vOf(r0));
    line(stileU, vOf(r1), 1 - stileU, vOf(r1));
  }
  edges(face, pen * 1.1, 1.1);

  // ---- the name board, screwed to the top panel ---------------------------------------------------------
  if (name && false) {
    // the name board is off the door: the fanlight carries the name now (one term, not two).
    const bh = name.mh + 2 * BOARD_PAD; // metres (the sorts were cut at zoom 1 and keep their size)
    const [p0, p1] = PANELS[0];
    const cy = (p0 + p1) / 2;
    const bu0 = uOf(D.leafX0 + BOARD_INSET), bu1 = uOf(D.leafX1 - BOARD_INSET);
    const bv0 = vOf(cy + bh / 2), bv1 = vOf(cy - bh / 2);
    const board = quad(bu0, bv0, bu1, bv1);
    if (onScreen(board)) {
    traceQ(board);
    g.fillStyle = PAPER;
    g.fill();
    edges(board, pen * 1.05, 1.2);
    edges(quad(bu0 + 0.009 / D.leafW, bv0 + 0.009 / D.leafH, bu1 - 0.009 / D.leafW, bv1 - 0.009 / D.leafH), pen * 0.6, 1.0);
    // four screws
    for (const [uu, vv] of [
      [bu0 + 0.017 / D.leafW, bv0 + 0.017 / D.leafH],
      [bu1 - 0.017 / D.leafW, bv0 + 0.017 / D.leafH],
      [bu1 - 0.017 / D.leafW, bv1 - 0.017 / D.leafH],
      [bu0 + 0.017 / D.leafW, bv1 - 0.017 / D.leafH],
    ]) {
      const c = L(uu, vv);
      const r = Math.max(1.1, px(0.007));
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(c[0], c[1], r * (1 - 0.7 * st), r, 0, 0, Math.PI * 2);
      g.fill();
    }
    const nu0 = uOf(D.leafX0 + BOARD_INSET + BOARD_PAD), nu1 = uOf(D.leafX1 - BOARD_INSET - BOARD_PAD);
    const nv0 = vOf(cy + (bh / 2 - BOARD_PAD)), nv1 = vOf(cy - (bh / 2 - BOARD_PAD));
    drawWarped(g, name, (u, v) => L(nu0 + (nu1 - nu0) * u, nv0 + (nv1 - nv0) * v), 64);
    }
  }

  // ---- ironmongery, mirrored: from the landing the knob is on the right, the hinges on the left ------
  const ring = (u, v, r, wd = pen * 0.8, alpha = 1, fill = null) => {
    const c = L(u, v);
    const rx = Math.abs(L(u + r / D.leafW, v)[0] - c[0]) || 1;
    const ry = Math.abs(L(u, v + r / D.leafH)[1] - c[1]) || 1;
    const pts = [];
    for (let i = 0; i <= 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      pts.push([c[0] + Math.cos(a) * rx * (1 + (rng() - 0.5) * 0.05), c[1] + Math.sin(a) * ry * (1 + (rng() - 0.5) * 0.05)]);
    }
    if (fill) {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fillStyle = fill;
      g.fill();
    }
    for (let i = 0; i < 22; i++) inkLine(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], { width: wd, wobble: 0.3, rng, alpha, segments: 2 });
    return { c, rx, ry };
  };
  const knobU = uOf(D.leafX1 - D.stile / 2 - 0.006), knobV = vOf(KNOB_Y);
  ring(knobU, knobV, 0.044, pen * 0.7, 0.9, PAPER); // the rose
  const kn = ring(knobU, knobV, 0.032, pen * 1.0, 1, PAPER); // the knob
  // the knob is a turned thing: half of it goes solid, the way a small dark object does in the film
  g.save();
  g.beginPath();
  g.ellipse(kn.c[0], kn.c[1], kn.rx, kn.ry, 0, Math.PI * 0.15, Math.PI * 0.95);
  g.closePath();
  g.clip();
  hatch(g, kn.c[0] - kn.rx - 2, kn.c[1] - kn.ry - 2, kn.rx * 2 + 4, kn.ry * 2 + 4, { angle: Math.PI / 4, spacing: Math.max(1.5, hs(0.006)), width: pen * 0.5, wobble: 0.3, broken: 0.1, rng, alpha: 0.9 });
  g.restore();
  // the big key left in the lock: a shaft out of the keyhole, a bit near the door, a bow at the end
  {
    const kv = vOf(KNOB_Y - 0.1);
    ring(knobU, kv, 0.012, pen * 0.8, 1, INK); // the keyhole
    const a = L(knobU, kv), b = L(knobU, vOf(KNOB_Y - 0.195));
    inkLine(g, a[0], a[1], b[0], b[1], { width: pen * 1.1, wobble: 0.35, rng }); // the shaft
    ring(knobU, vOf(KNOB_Y - 0.238), 0.03, pen * 1.0, 1, PAPER); // the bow
    const c1 = L(knobU, vOf(KNOB_Y - 0.152)), c2 = L(knobU - 0.03 / D.leafW, vOf(KNOB_Y - 0.152));
    inkLine(g, c1[0], c1[1], c2[0], c2[1], { width: pen * 1.1, wobble: 0.3, rng }); // the bit
    const c3 = L(knobU - 0.03 / D.leafW, vOf(KNOB_Y - 0.152)), c4 = L(knobU - 0.03 / D.leafW, vOf(KNOB_Y - 0.185));
    inkLine(g, c3[0], c3[1], c4[0], c4[1], { width: pen * 1.0, wobble: 0.3, rng });
  }
  // the letter plate in the lock rail, and the spyhole above the middle panel
  {
    const [r0, r1] = RAILS[2];
    const v = vOf((r0 + r1) / 2);
    const q = quad(uOf(0.45 - 0.13), v - 0.028 / D.leafH, uOf(0.45 + 0.13), v + 0.028 / D.leafH);
    traceQ(q);
    g.fillStyle = PAPER;
    g.fill();
    edges(q, pen * 0.85, 0.8);
    const a = L(uOf(0.45 - 0.108), v), b = L(uOf(0.45 + 0.108), v);
    inkLine(g, a[0], a[1], b[0], b[1], { width: pen * 0.8, wobble: 0.4, rng });
    shade(q, { spacing: Math.max(1.6, hs(0.011)), alpha: 0.55, angle: Math.PI / 4, broken: 0.15, width: pen * 0.45 });
  }
  // the spyhole. room.js puts it high in the top panel; here the name board has that panel, so it
  // drops to the rail between the top and middle panels, where it still reads as an eye's height.
  ring(uOf(0.45), vOf((RAILS[1][0] + RAILS[1][1]) / 2), 0.018, pen * 0.85, 1, PAPER);
  // three hinge knuckles down the hanging edge
  for (const y of [D.leafY0 + 0.3, (D.leafY0 + D.leafY1) / 2, D.leafY1 - 0.3]) {
    const v = vOf(y);
    const q = quad(-0.008 / D.leafW, v - 0.05 / D.leafH, 0.02 / D.leafW, v + 0.05 / D.leafH);
    traceQ(q);
    g.fillStyle = INK;
    g.globalAlpha = 0.9;
    g.fill();
    g.globalAlpha = 1;
  }

  // ---- the case: lining, transom light, architrave, cornice, plinths, threshold ------------------------
  const rect = (x0, y0, x1, y1, wd = pen, { fill = null, wob = 1.0 } = {}) => {
    const q = [
      [mx(x0), my(y1)],
      [mx(x1), my(y1)],
      [mx(x1), my(y0)],
      [mx(x0), my(y0)],
    ];
    if (fill) {
      traceQ(q);
      g.fillStyle = fill;
      g.fill();
    }
    edges(q, wd, wob);
    return q;
  };
  // the lining round the opening (paper again: it stands in front of the punched hole)
  const linL = rect(0, 0, D.lining, D.leafTop, pen * 0.85, { fill: PAPER });
  const linR = rect(D.opening - D.lining, 0, D.opening, D.leafTop, pen * 0.85, { fill: PAPER });
  shade(linL, { spacing: hs(0.026), alpha: 0.5, broken: 0.4, width: pen * 0.5 });
  shade(linR, { spacing: hs(0.026), alpha: 0.5, broken: 0.4, width: pen * 0.5 });
  // the transom bar and the light over it, with the parlour's own board lettered in the glass
  rect(0, D.leafTop, D.opening, D.leafTop + D.transomBar, pen * 0.9, { fill: PAPER });
  {
    const ty0 = D.leafTop + D.transomBar, ty1 = D.head - D.lining, ff = 0.03;
    rect(D.lining, ty0, D.opening - D.lining, ty1, pen * 0.95, { fill: PAPER });
    rect(D.lining + ff, ty0 + ff, D.opening - D.lining - ff, ty1 - ff, pen * 0.62);
    // the glass: two strokes at the near end and nothing else, clear of the lettering
    for (const u of [0.03, 0.1]) {
      inkLine(g, mx(D.lining + ff + u), my(ty0 + ff + 0.012), mx(D.lining + ff + u + 0.07), my(ty1 - ff - 0.012), { width: pen * 0.5, wobble: 0.7, rng, alpha: 0.55 });
    }
    // his name, and only his name: one term on the door. It stands in the glass of the fanlight
    // where the trade word used to be, so the visitor reads it once, above the handle.
    signCaps(g, 'TAROT PEPE', mx(D.opening / 2), my((ty0 + ty1) / 2), { size: px(0.086), rng, tracking: 0.18, weight: 700 });
  }
  // architrave, plinth blocks, the cap over the head
  const archL = rect(-D.arch, D.plinth, 0, D.head + D.archHead, pen, { fill: PAPER });
  const archR = rect(D.opening, D.plinth, D.opening + D.arch, D.head + D.archHead, pen, { fill: PAPER });
  const archT = rect(-D.arch, D.head, D.opening + D.arch, D.head + D.archHead, pen, { fill: PAPER });
  rect(-D.arch - 0.014, 0, 0, D.plinth, pen, { fill: PAPER });
  rect(D.opening, 0, D.opening + D.arch + 0.014, D.plinth, pen, { fill: PAPER });
  rect(-D.arch - D.capOver, D.head + D.archHead, D.opening + D.arch + D.capOver, D.totalH, pen, { fill: PAPER });
  shade(archL, { spacing: hs(0.026), alpha: 0.55, broken: 0.5, width: pen * 0.5 });
  shade(archR, { spacing: hs(0.026), alpha: 0.55, broken: 0.5, width: pen * 0.5 });
  shade(archT, { spacing: hs(0.03), angle: 0, alpha: 0.5, broken: 0.55, width: pen * 0.5 });
  // the bead: one line run inside each band
  inkLine(g, mx(-0.016), my(D.plinth), mx(-0.016), my(D.head + D.archHead - 0.016), { width: pen * 0.62, wobble: 0.9, rng, alpha: 0.9 });
  inkLine(g, mx(D.opening + 0.016), my(D.plinth), mx(D.opening + 0.016), my(D.head + D.archHead - 0.016), { width: pen * 0.62, wobble: 0.9, rng, alpha: 0.9 });
  inkLine(g, mx(-D.arch + 0.016), my(D.head + 0.016), mx(D.opening + D.arch - 0.016), my(D.head + 0.016), { width: pen * 0.62, wobble: 0.9, rng, alpha: 0.9 });
  // a bell push on the architrave, and its little enamel plate: the second invitation
  {
    const bx = D.opening + D.arch / 2, by = 1.2;
    const plate = rect(bx - 0.044, by - 0.056, bx + 0.044, by - 0.006, pen * 0.7, { fill: PAPER, wob: 0.7 });
    // whatever is engraved on it is too small to read from the landing, so it is drawn the way the
    // film draws small signage: two ruled lines and the sense of a word
    for (const dy of [-0.022, -0.04]) inkLine(g, mx(bx - 0.031), my(by + dy), mx(bx + 0.031), my(by + dy), { width: pen * 0.6, wobble: 0.5, rng, alpha: 0.8 });
    const c = [mx(bx), my(by + 0.03)], r = px(0.022);
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
    }
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = PAPER;
    g.fill();
    for (let i = 0; i < 18; i++) inkLine(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], { width: pen * 0.7, wobble: 0.3, rng, segments: 2 });
    g.beginPath();
    g.arc(c[0], c[1], Math.max(1.1, r * 0.42), 0, Math.PI * 2);
    g.fillStyle = INK;
    g.fill();
    if (plate) shade(plate, { spacing: hs(0.012), alpha: 0.3, broken: 0.35, width: pen * 0.45 });
  }
  // the threshold, and a doormat on the landing
  rect(-0.012, 0, D.opening + 0.012, 0.026, pen * 0.9, { fill: PAPER });
  if (my(0) < h + 60 && my(-D.mat) > -60) {
    const mat = [
      [mx(0.09), my(-0.03)],
      [mx(D.opening - 0.09), my(-0.03)],
      [mx(D.opening + 0.07), my(-D.mat)],
      [mx(-0.07), my(-D.mat)],
    ];
    traceQ(mat);
    g.fillStyle = PAPER;
    g.fill();
    edges(mat, pen * 0.9, 1.2);
    // a bristle mat: rows of short strokes, not a scatter
    g.save();
    traceQ(mat);
    g.clip();
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows;
      const y = my(-0.03) + t * px(D.mat - 0.03);
      const x0 = mx(0.09 - 0.16 * t), x1 = mx(D.opening - 0.09 + 0.16 * t);
      for (let x = x0; x < x1; x += px(0.026) * (0.7 + rng() * 0.7)) {
        inkLine(g, x, y - px(0.012), x + (rng() - 0.5) * 2, y + px(0.012), { width: pen * 0.5, wobble: 0.35, rng, alpha: 0.75 });
      }
    }
    g.restore();
    // the one dense patch this drawing gets: under the mat, where a shadow would sit
    for (let i = 0; i < 110; i++) {
      const t = rng() ** 1.8;
      const x = mx(-0.1) + rng() * px(D.opening + 0.2);
      const y = my(-D.mat) + t * px(0.075);
      inkLine(g, x, y, x + px(0.018 + rng() * 0.022), y + (rng() - 0.5) * 1.4, { width: pen * 0.55, wobble: 0.35, rng, alpha: 0.7 - t * 0.45 });
    }
  }

  // ---- one line under the mat, and nothing else ---------------------------------------------------------
  // The corner captions (a series number and an admission line) came off at the user's request: the
  // first thing anyone sees is a door on a bare sheet, and the invitation under it. It is also what
  // survives a phone, where a caption in each top corner would crowd the frame.
  if (marks && P.zoom < 1.04) {
    signCaps(g, 'PLEASE COME IN', w / 2, my(-D.mat) + h * 0.058, { capH: Math.max(14, h * 0.02), rng, tracking: 0.34 });
  }
}

// Draw a baked bitmap through an arbitrary (u, v) → sheet map, in vertical slices. The letters keep
// their weight because they are filled shapes, and the slices carry the perspective.
function drawWarped(g, bake, map, slices = 48) {
  const sw = bake.canvas.width, sh = bake.canvas.height;
  for (let i = 0; i < slices; i++) {
    const u0 = i / slices, u1 = (i + 1) / slices;
    const a = map(u0, 0), b = map(u1, 0), c = map(u0, 1);
    const dx = b[0] - a[0];
    if (Math.abs(dx) < 0.04) continue;
    g.save();
    g.beginPath();
    g.rect(Math.min(a[0], b[0]) - 0.6, Math.min(a[1], c[1]) - 1, Math.abs(dx) + 1.2, Math.abs(c[1] - a[1]) + 2);
    g.clip();
    g.drawImage(bake.canvas, u0 * sw, 0, (u1 - u0) * sw, sh, a[0], a[1], dx, c[1] - a[1]);
    g.restore();
  }
}
