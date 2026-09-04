// reveal-hand.js — Tarot Pepe's hand on the tablecloth.
//
// The tabletop beats (the fan dealt, the visitor's card carried to its slot, the ribbon gathered,
// a card turned) are shot from above, and until now nothing touched a card: the cards moved by
// themselves while the protagonist sat off the top of the frame. This is his hand, drawn for those
// beats only and owned by the reveal piece: a flat paper cut-out that lies IN the tablecloth, the
// way a paper-theatre hand is laid on a set, entering from the top edge of the frame — his side of
// the table — with a white sleeve running back off-frame toward his shoulder.
//
// It is his and not the visitor's because (a) the visitor is the camera in this film and has never
// had a body, (b) he sits upstage so the top edge is geometrically his, and (c) green is the only
// colour on the cloth, so a green hand entering IS the protagonist arriving.
//
// The drawing is made here with the pen, in the language of the supplied Pepe: a heavy ink contour
// round a flat green silhouette, a few creases, a little hatch. Three replacement drawings, the way
// the puppet has three mouths:
//   splay — five fingers apart, the hand that deals and sweeps (STYLE.md §1.6: splayed, separated)
//   point — index and middle out together, the two fingers that land on a card's near edge
//   pinch — thumb and forefinger closed, the hand that takes one card out of the ribbon
//
// Posing is by the FINGERTIP: `at(x, y, z, {yaw, pose})` puts the contact point of the drawing on
// that spot on the cloth and works the wrist and the sleeve back from it, tilting the hand up about
// the wrist when the fingertip is above the cloth (a card being reared up on its edge). While the
// hand is out, the puppet's own hand on that side is LENT to it — asked for through pepe's own api
// (`pepe.handOff(side)` / `handOn(side)`, see "lending a hand" in pepe.js), so his shoulder holds
// still and the hand comes back exactly where it left, and he never has three.
//
// THE DRAWING BELONGS TO THE OVERHEAD SHOTS. It is a flat cut-out lying IN the plane of the cloth:
// from `fan` or `spread`, whose lens is 70° or more above the table, it reads as a hand on the
// table; from `pepe` or `table`, whose lens is at the height of the table, the same drawing
// foreshortens to a fifth of its length and lies there as a green blade. So the hand watches the
// camera, and when the shot is not an overhead one it WITHDRAWS — two drawings back along its own
// arm, off the top edge of the picture, then gone, and his own cut-out hand comes back on his
// body. When an overhead shot returns the same drawings play backwards. `hide()` / `show()` let
// another piece ask for the same withdrawal directly.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { INK, PAPER, makeCanvas, canvasTexture, inkLine, hatch, inkMaterial } from '../core/strokes.js';
import { SKIN } from './pepe.js';

const PI = Math.PI;
const rad = (d) => (d * PI) / 180;

// The drawing's scale on the cloth. It was drawn 0.204 m across, which put a hand and a half of
// green across one card and made a sticker of it; a card is 0.13 × 0.2275, so the hand is now
// slightly UNDER one card wide and its longest finger is a third of a card — the proportion the
// film draws (fd-anim-kitchen-table-cards-hires: the woman's hand against the cards she holds).
export const HAND = {
  w: 0.140, // the drawing's full width; the hand inside it spans about 0.115 m, just under a card
  l: 0.182, // wrist to fingertip
  reach: 0.155, // nominal wrist-to-fingertip; the real contact per pose is GRIP, below
  y: 0.0042, // how far the paper floats over the cloth
  sleeveW: 0.110, // the sleeve of his robe; drawn 0.056 at the cuff, swelling to 0.088 at the elbow
  cuffW: 0.078, // the turned-back cuff, wider than the wrist under it
  cuffL: 0.05,
  // The sleeve runs back to the exact spot where the puppet's own right hand sits — the one that
  // steps out while this one is on the cloth — and lifts as it goes, so the forearm passes over
  // the clutter instead of through it and meets his body where his hand was. From over the cloth
  // it simply runs off the top of the frame.
  anchor: [0.291, 0.828, -0.82],
  sleeveMax: 1.05,
};

// How far the lens must be tilted down before the drawing may lie on the cloth: the y of the
// camera's own forward vector. The named shots fall either side of it by a mile — spread and the
// card inserts are straight down (-1.0), `fan` is -0.95, while `table`, `pepe`, `home`, `wide` and
// `door` are all level (0.0) — and a shot the camera piece adds later, or the middle of a move
// between two of them, answers for itself without a list of names to keep in step.
const OVERHEAD_Y = -0.6;
// The withdrawal, one drawing per stepped frame: metres back along the hand's own arm, and metres
// up off the cloth. The frame of the cut, ONE drawing of the hand taken back and up — 0.34 m is
// half the overhead frame, and the lift tilts the cut-out up about the wrist so it reads as a
// hand leaving a table and not as a plank lying on it — and it is off the picture. Two drawings,
// because the shot it is caught in is the shot it does not belong in: any longer and the arm is
// seen lying across the cloth, any shorter and the hand goes out like a light. The return is the
// same two drawings backwards.
const RETREAT = [0, 0.34];
const LIFT = [0, 0.12];
const RAMP = RETREAT.length;

// A flat cut-out cannot be stood up. Posing puts the fingertips at a height (a card reared on its
// edge), and the wrist hinge used to follow it all the way, so at 90° the drawing turned edge-on
// to an overhead lens and lay in the picture as a green blade. The hinge is capped here instead:
// the hand stays nearly flat on the cloth and its fingers keep their plan position, which is the
// only thing an overhead frame reads. sin of the steepest tilt the drawing may take.
const PITCH_SIN = 0.44;

const TEX = { w: 384, h: 512 }; // 384 px ↔ HAND.w, 512 px ↔ HAND.l
// The contour, at the pen weight of the room: roughly 3 px on screen at the overhead frame, not
// the 19 px halo the old half-stroke left. STYLE.md §1.2 — one pen, one pressure, everywhere.
const OUT = 11;
// The flat colour is printed a hair off the line, the way the Aline frames are (§1.4: "fills are
// flat, slightly misregistered from the line, 1–3 px off the contour, like a cheap print"). In
// texture pixels, which are about 0.45 of a screen pixel at the fan's lens: the colour sits down
// the frame and to the right of the ink, and the same offset runs through the whole drawing —
// palm, fingers and thumb — so it reads as one bad plate, never as an outline.
const MIS = [8, -6];

// ── the drawing ────────────────────────────────────────────────────────────────────────────────
// A finger is a chain of four segments from its knuckle, turning by `bend` over its length and
// tapering; the polygon is its left side, a cap round the tip, and its right side back.
function fingerPoly(base, ang, len, w, bend, rng, wob = 2.2) {
  const N = 4;
  const spine = [];
  let a = ang, x = base[0], y = base[1];
  spine.push([x, y, w / 2]);
  for (let i = 1; i <= N; i++) {
    a += bend / N;
    x += Math.cos(rad(a)) * (len / N);
    y -= Math.sin(rad(a)) * (len / N);
    spine.push([x, y, (w / 2) * (1 - 0.22 * (i / N))]);
  }
  const j = () => (rng() - 0.5) * 2 * wob;
  const left = [], right = [];
  for (let i = 0; i < spine.length; i++) {
    const [px, py, r] = spine[i];
    const p0 = spine[Math.max(0, i - 1)], p1 = spine[Math.min(spine.length - 1, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    left.push([px + nx * r + j(), py + ny * r + j()]);
    right.push([px - nx * r + j(), py - ny * r + j()]);
  }
  // the tip: a half-turn round the last centre, drawn as five points so it is not a true circle
  const [tx, ty, tr] = spine[spine.length - 1];
  const tipAng = Math.atan2(ty - spine[spine.length - 2][1], tx - spine[spine.length - 2][0]);
  const cap = [];
  for (let k = 1; k <= 4; k++) {
    const th = tipAng - PI / 2 + (PI * k) / 5;
    cap.push([tx + Math.cos(th) * tr + j(), ty + Math.sin(th) * tr + j()]);
  }
  return [...left, ...cap, ...right.reverse()];
}

function wobbly(points, rng, wob = 2.6) {
  return points.map(([x, y]) => [x + (rng() - 0.5) * 2 * wob, y + (rng() - 0.5) * 2 * wob]);
}

function polyPath(g, poly) {
  g.beginPath();
  g.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
  g.closePath();
}

// A finger's contour is stroked OPEN — up one side, round the tip, down the other — so the closing
// edge across its base is never drawn. Stroked closed, that edge landed on the palm's own contour
// and the two together put a heavy black bar across the root of every finger. The film stops a
// finger's lines where they meet the hand and lets a small knuckle tick do the rest.
function polyStrokeOpen(g, poly) {
  g.beginPath();
  g.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
  g.stroke();
}

// The five fingers of each drawing: [base, angle from +x with the canvas' y flipped, length,
// width, bend]. The palm is the same in all three; only the fingers are re-drawn. No two fingers
// are the same length — the middle is longest, the index and ring differ by half a knuckle, the
// little one stops well short and the thumb is short and thick and comes off the side of the
// hand, not off the top (fd-anim-courtyard-three-figures: the yellow suit's splayed hand).
const FINGERS = {
  splay: [
    [[136, 364], 150, 118, 46, -14], // thumb, out to the left off the heel of the palm
    [[126, 264], 96, 218, 42, 6], // index
    [[180, 250], 93, 214, 44, 2], // middle, the longest
    [[232, 254], 88, 206, 42, -4], // ring
    [[276, 280], 80, 158, 38, -10], // little, well short of the rest
  ],
  point: [
    [[140, 366], 148, 70, 44, -24], // thumb tucked flat against the palm
    [[152, 260], 94, 218, 42, 4], // index and middle out together: the two that land on an edge
    [[198, 250], 90, 210, 44, 1],
    [[240, 258], 80, 64, 42, -44], // ring and little, folded away
    [[280, 282], 66, 48, 38, -48],
  ],
  pinch: [
    [[130, 300], 114, 126, 44, 12], // thumb, up the palm's left flank
    [[158, 260], 124, 138, 40, 18], // the forefinger curls over to meet it
    [[198, 250], 88, 132, 44, -32], // the middle finger trails on the card
    [[240, 260], 78, 82, 42, -42], // ring and little, folded away
    [[280, 284], 64, 60, 38, -46],
  ],
};

// Where the drawing TOUCHES, in canvas pixels: the fingertips of the two hands that lay and press
// cards, the nip of the thumb and forefinger of the one that takes a card out of the ribbon. The
// pinch's contact is nowhere near the middle of the drawing, so `at()` cannot simply put the
// centre line of the hand on the spot — place() works the wrist back from THIS point instead.
const GRIP = { splay: [175, 78], point: [152, 50], pinch: [64, 174] };
// the same, in metres from the wrist (x across the hand, z toward the fingertips)
const GRIP_M = Object.fromEntries(Object.entries(GRIP).map(([k, [x, y]]) => [k, { x: (x / TEX.w - 0.5) * HAND.w, z: (1 - y / TEX.h) * HAND.l }]));

// The palm: a slab that narrows to a real wrist at the bottom edge of the drawing, where the
// cuff of his robe comes over it. Palm and fingers are near enough the same length, which is what
// stops a hand reading as a mitten.
const PALM = [
  [118, 264], [104, 318], [102, 372], [114, 420], [134, 452], [140, 512],
  [252, 512], [258, 450], [276, 416], [286, 366], [290, 312], [284, 262],
  [248, 248], [190, 242], [144, 250],
];

// A small dense patch of hatch on the cloth beside the palm's shaded flank. This is what a cast
// shadow is in this world (STYLE.md §1.3: "a small dense patch directly under an object") and it
// is the whole of the answer to a drop shadow, which §1.1 forbids outright.
function underHatch(g, rng) {
  g.save();
  // a crescent hugging the palm's lower-right edge; most of it ends up under the colour, so what
  // is left on the paper is a rim of tone a few millimetres wide, not a shape of its own
  polyPath(g, wobbly([[290, 306], [322, 352], [330, 412], [312, 462], [282, 500], [244, 512], [240, 486], [272, 462], [288, 410], [284, 348]], rng, 3.2));
  g.clip();
  hatch(g, 234, 296, 100, 220, { angle: rad(58), spacing: 7, width: 2, wobble: 1.1, broken: 0.24, rng, alpha: 0.9 });
  hatch(g, 234, 296, 100, 220, { angle: rad(116), spacing: 10, width: 1.8, wobble: 1.1, broken: 0.4, rng, alpha: 0.72 });
  g.restore();
}

// the nail: one short stroke across the finger a little back from the tip, and a shorter one under it
function nailLines(g, f, rng) {
  const [base, ang, len, wdt, bend] = f;
  if (len < 140) return; // a folded finger shows no nail
  const a = rad(ang + bend * 0.8);
  const along = (d) => [base[0] + Math.cos(a) * d, base[1] - Math.sin(a) * d];
  const nx = Math.sin(a), ny = Math.cos(a); // across the finger
  const draw = (d, r, wdth) => {
    const [cx, cy] = along(d);
    inkLine(g, cx - nx * r, cy - ny * r, cx + nx * r, cy + ny * r, { width: wdth, wobble: 1.1, rng });
  };
  draw(len - wdt * 1.55, wdt * 0.30, 2.8);
  draw(len - wdt * 0.95, wdt * 0.22, 2.2);
}

function drawHand(g, w, h, pose) {
  const rng = mulberry32(pose === 'splay' ? 91 : pose === 'point' ? 92 : 93);
  g.clearRect(0, 0, w, h);
  const F = FINGERS[pose];
  const polys = [wobbly(PALM, rng, 2.2), ...F.map((f) => fingerPoly(f[0], f[1], f[2], f[3], f[4], rng, 1.4))];

  // 1. the tone under the hand, laid on the paper before anything covers it
  underHatch(g, rng);

  // 2. the flat colour, printed off the line: one offset for the whole drawing
  g.save();
  g.translate(MIS[0], MIS[1]);
  g.fillStyle = SKIN;
  for (const p of polys) {
    polyPath(g, p);
    g.fill();
  }
  g.restore();

  // 3. the contour at the room's weight. Each part is stroked and none is filled, so the union
  // reads as one silhouette and the seams — a finger against the palm, a finger against its
  // neighbour — stay as drawn lines, which is how the supplied Pepe's own hands are drawn.
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = INK;
  g.lineWidth = OUT;
  polyPath(g, polys[0]);
  g.stroke();
  for (let i = 1; i < polys.length; i++) polyStrokeOpen(g, polys[i]);
  g.restore();

  // 4. the knuckles and the nails
  for (let i = 1; i < F.length; i++) {
    if (F[i][2] < 140) continue; // a folded finger shows neither
    const [bx, by] = F[i][0];
    const a = rad(F[i][1]);
    const k = 30 + rng() * 8;
    const nx = Math.sin(a) * 11, ny = Math.cos(a) * 11;
    inkLine(g, bx - nx - Math.cos(a) * k, by - ny + Math.sin(a) * k, bx + nx - Math.cos(a) * k, by + ny + Math.sin(a) * k, { width: 2.6, wobble: 1.1, rng, alpha: 0.85 });
    nailLines(g, F[i], rng);
  }
  // the crease out of the thumb's web, and two lines across the palm
  inkLine(g, F[0][0][0] + 10, F[0][0][1] - 46, F[0][0][0] + 58, F[0][0][1] + 20, { width: 3, wobble: 2.2, rng });
  inkLine(g, 132, 338, 240, 316, { width: 2.8, wobble: 2.4, rng, alpha: 0.9 });
  inkLine(g, 140, 384, 258, 368, { width: 2.4, wobble: 2.4, rng, alpha: 0.75 });
  // the wrist, where the cuff will come over it
  inkLine(g, 142, 476, 254, 470, { width: 2.4, wobble: 1.8, rng, alpha: 0.7 });

  // 5. a little tone drawn over the colour: rain-strokes down the shaded side of the palm
  g.save();
  polyPath(g, polys[0]);
  g.clip();
  hatch(g, 248, 300, 46, 190, { angle: rad(82), spacing: 10, width: 2.4, wobble: 1.2, broken: 0.45, rng, alpha: 0.75 });
  g.restore();
}

// The SLEEVE of his robe, running back from the cuff (canvas top) to his shoulder off the top of
// the frame (canvas bottom). It was a bare green forearm, on the reasoning that a white sleeve on
// a white cloth is two papers with a line between them; but that is precisely how the film draws
// a white sleeve on a white table (fd-anim-kitchen-table-cards-hires: the man's white cuff and
// shirt against the boards), and a green arm running the length of the cloth with no cuff and no
// wrist is what made the hand read as a sticker. So: paper, its own contour, folds along its
// length and rain-strokes down the shaded edge. The green stops at the wrist, where it belongs.
//
// The quad is stretched over up to a metre of arm, so the canvas is wildly anisotropic: only
// LENGTHWISE marks may be drawn here, or a 3 px rule becomes a 3 cm band. The cuff, which is a
// mark ACROSS the arm, is its own small quad of fixed size (drawCuff).
function drawSleeve(g, w, h) {
  const rng = mulberry32(77);
  g.clearRect(0, 0, w, h);
  const inset = 6;
  const side = (dir) => {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const v = i / 8;
      // narrow at the cuff, swelling toward the elbow
      const half = (w / 2 - inset) * (0.56 + 0.42 * v - 0.10 * v * v);
      pts.push([w / 2 + dir * half + (rng() - 0.5) * 4, v * (h - 6) + dir * v * 5]);
    }
    return pts;
  };
  const L = side(-1), R = side(1);
  const outline = () => {
    g.beginPath();
    g.moveTo(L[0][0], 0);
    for (const p of L) g.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.lineTo(R[0][0], 0);
    g.closePath();
  };
  g.save();
  g.fillStyle = PAPER;
  outline();
  g.fill();
  g.restore();
  // its two contour lines, drawn down the length with the pen's wobble
  const run = (pts, width, alpha = 1) => {
    for (let i = 1; i < pts.length; i++) inkLine(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { width, wobble: 1.6, rng, alpha });
  };
  run(L, 6);
  run(R, 6);
  // two folds running along the sleeve, and rain-strokes down its shaded edge. The strokes are
  // drawn one at a time and kept SHORT in canvas y: this canvas is stretched over most of a metre
  // of arm, so a hatch region tall enough to look right here would draw 40 cm rain.
  g.save();
  outline();
  g.clip();
  run(L.map(([x, y]) => [x + 26 + (rng() - 0.5) * 6, y]), 3.5, 0.65);
  // the cloth's folds: shallow chevrons ACROSS the sleeve. Across is the narrow axis of this
  // canvas, so a mark drawn here 100 px wide is 6 cm of sleeve — the right size for a fold — while
  // the same mark drawn down the length would be half a metre.
  for (const [fy, d] of [[42, 15], [104, -12], [168, 14], [238, -11], [312, 13], [396, -12], [470, 12]]) {
    const l0 = w / 2 - (w / 2 - inset) * 0.86, r0 = w / 2 + (w / 2 - inset) * 0.86;
    inkLine(g, l0 + 5, fy, (l0 + r0) / 2, fy + d, { width: 1.8, wobble: 1.4, rng, alpha: 0.8 });
    inkLine(g, (l0 + r0) / 2, fy + d, r0 - 5, fy + d * 0.2, { width: 1.8, wobble: 1.4, rng, alpha: 0.8 });
  }
  // Rain-strokes down BOTH edges, dense on the shaded one. A white sleeve on a white cloth with
  // nothing but a contour round it is a plank of paper; the tone is what makes it cloth.
  for (let k = 0; k < 64; k++) {
    const y0 = 6 + k * 8 + (rng() - 0.5) * 7;
    const x0 = w / 2 + (w / 2 - inset) * (0.30 + rng() * 0.56);
    inkLine(g, x0, y0, x0 + (rng() - 0.5) * 3, y0 + 5 + rng() * 4, { width: 2.4, wobble: 0.8, rng, alpha: 0.8 });
  }
  for (let k = 0; k < 30; k++) {
    const y0 = 10 + k * 17 + (rng() - 0.5) * 9;
    const x0 = w / 2 - (w / 2 - inset) * (0.42 + rng() * 0.42);
    inkLine(g, x0, y0, x0 + (rng() - 0.5) * 3, y0 + 4 + rng() * 4, { width: 2.2, wobble: 0.8, rng, alpha: 0.55 });
  }
  g.restore();
}

// The turned-back cuff of the robe, a fixed-size band across the wrist: this is the mark that
// says the hand belongs to a body wearing a white robe and not to a sticker. Its own quad, so it
// keeps its proportions however long the sleeve behind it is drawn.
function drawCuff(g, w, h) {
  const rng = mulberry32(79);
  g.clearRect(0, 0, w, h);
  const inset = 10;
  const edge = (dir) => {
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const v = i / 4;
      pts.push([w / 2 + dir * (w / 2 - inset) * (1 - 0.1 * v) + (rng() - 0.5) * 4, 4 + v * (h - 10)]);
    }
    return pts;
  };
  const L = edge(-1), R = edge(1);
  const outline = () => {
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    for (const p of L) g.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath();
  };
  g.save();
  g.fillStyle = PAPER;
  outline();
  g.fill();
  g.restore();
  const run = (pts, width, alpha = 1) => {
    for (let i = 1; i < pts.length; i++) inkLine(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { width, wobble: 1.4, rng, alpha });
  };
  run(L, 7);
  run(R, 7);
  // the two rules of the turned-back cuff, across the arm, and a row of short strokes between them
  inkLine(g, L[0][0] - 3, L[0][1] + 3, R[0][0] + 3, R[0][1] - 2, { width: 7, wobble: 2, rng });
  inkLine(g, L[3][0] - 2, L[3][1], R[3][0] + 2, R[3][1] - 3, { width: 6, wobble: 2.2, rng });
  g.save();
  outline();
  g.clip();
  hatch(g, inset, h * 0.16, w - 2 * inset, h * 0.5, { angle: rad(78), spacing: 11, width: 2.6, wobble: 1.2, broken: 0.45, rng, alpha: 0.8 });
  g.restore();
}

// the three drawings, exposed so tools/_rv-hand-sheet.mjs can look at them on their own
export const __draw = { hand: drawHand, sleeve: drawSleeve, cuff: drawCuff };

// ── the object ─────────────────────────────────────────────────────────────────────────────────
function quadXZ(w, l, { z0 = 0, z1 = 1, flipV = false } = {}) {
  const g = new THREE.BufferGeometry();
  const x = w / 2;
  const za = z0, zb = z1 * l;
  const v0 = flipV ? 1 : 0, v1 = flipV ? 0 : 1;
  g.setAttribute('position', new THREE.Float32BufferAttribute([-x, 0, za, x, 0, za, x, 0, zb, -x, 0, zb], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, 1, v0, 1, v1, 0, v1], 2));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeBoundingSphere();
  return g;
}

export function buildHand(ctx) {
  const Y = ctx.layout.spread.y;
  const group = new THREE.Group();
  group.name = 'reveal-hand';
  group.visible = false;
  ctx.scene.add(group);

  // the puppet's own hand on that side steps out while this one is on the cloth (he never has three)
  const puppetHand = (side) => ctx.pieces.pepe?.parts?.['hand' + side] ?? null;

  // lineWeight 0.25: the contour is DRAWN into the map, so the ink pass adds only a whisper of
  // its own and never a second, heavier edge round the silhouette.
  const mat = (map, colorful) => {
    const m = inkMaterial({ color: '#ffffff', map, colorful, hatch: 0.3, lineWeight: 0.25, roughness: 1 });
    m.alphaTest = 0.5;
    m.side = THREE.DoubleSide;
    return m;
  };
  const tex = (w, h, draw) => {
    const c = makeCanvas(w, h);
    draw(c.getContext('2d'), w, h);
    return canvasTexture(c, { anisotropy: 8 });
  };

  // the sleeve: a yaw pivot at the wrist (it points back at his shoulder however the hand turns)
  // holding a quad that runs toward -z and lifts a little, so the forearm passes over the clutter
  // on the cloth instead of lying across it. Its length is a z-scale.
  const sleevePivot = new THREE.Group();
  sleevePivot.name = 'reveal-hand-sleeve';
  sleevePivot.position.y = 0.0012; // the cuff sits over the cut end of the hand
  group.add(sleevePivot);
  // v = 1 is the wrist, drawn at the top of the canvas; the quad's wrist end is z = +0.010, which
  // the cuff covers. NOTHING here casts a shadow: an offset dark copy of the hand on the cloth is
  // a drop shadow, and STYLE.md §1.1 forbids one outright — the tone under the palm is drawn.
  const sleeve = new THREE.Mesh(quadXZ(HAND.sleeveW, 1, { z0: 0.01, z1: -1, flipV: true }), mat(tex(128, 512, drawSleeve), true));
  sleevePivot.add(sleeve);
  // the cuff: a fixed-size band across the wrist, drawn over the join
  const cuff = new THREE.Mesh(quadXZ(HAND.cuffW, HAND.cuffL, { z0: 0.030, z1: -1, flipV: true }), mat(tex(192, 136, drawCuff), true));
  cuff.name = 'reveal-hand-cuff';
  cuff.position.y = 0.0009;
  sleevePivot.add(cuff);
  // where each arm goes: the puppet's own wrists at rest, read off him if he built
  const ANCH = { R: new THREE.Vector3(...HAND.anchor), L: new THREE.Vector3(-HAND.anchor[0], HAND.anchor[1], HAND.anchor[2]) };
  ctx.pieces.pepe?.root?.updateMatrixWorld(true);
  for (const s of ['L', 'R']) {
    const h0 = puppetHand(s);
    if (h0?.matrixWorld) h0.getWorldPosition(ANCH[s]);
  }

  // the hand, hinged at the wrist so it can tilt up off the cloth
  const wrist = new THREE.Group();
  wrist.name = 'reveal-hand-wrist';
  group.add(wrist);
  const poses = {};
  for (const name of ['splay', 'point', 'pinch']) {
    const m = new THREE.Mesh(quadXZ(HAND.w, HAND.l), mat(tex(TEX.w, TEX.h, (g, w, h) => drawHand(g, w, h, name)), true));
    m.name = 'reveal-hand-' + name;
    m.visible = false;
    wrist.add(m);
    poses[name] = m;
  }

  let shown = false, sideShown = 'R';
  function setShown(v, side = sideShown) {
    if (shown === v && sideShown === side) return;
    shown = v;
    sideShown = side;
    group.visible = v;
    // his own cut-out hand on that side steps out of the drawing while this one is on the cloth,
    // and comes back the moment it leaves: his business, so it is asked for, never reached into
    for (const s of ['L', 'R']) ctx.pieces.pepe?.[v && s === side ? 'handOff' : 'handOn']?.(s);
  }

  // ── the camera watch ──────────────────────────────────────────────────────────────────────────
  // `out` is how far through the withdrawal the drawing is (0 on the cloth … RAMP off the
  // picture). It is a function of the frame count since the answer last changed, not a counter, so
  // a frozen clock (?t=) shows the settled pose and every frame of a take stays deterministic.
  const _dir = new THREE.Vector3();
  const overhead = () => ctx.camera.getWorldDirection(_dir).y <= OVERHEAD_Y;
  let forced = false; // another piece asked for the hand off the cloth (hide / show)
  let allowed = true, sinceFrame = -99, out = 0;
  let want = null, wantFrame = -99; // the last pose asked for, and when: replayed as it withdraws

  // Several tracks are composed into ONE drawing (three cards turning, a card carried while the
  // ribbon closes), and `compose` holds a finished track's last drawing for ever after. So the
  // hand is CLAIMED rather than set: the player brackets every drawing with begin()/end(), any
  // track that puts the hand somewhere in that drawing wins, and the hand only leaves the cloth
  // when no track wanted it at all.
  let claimed = false;

  // The drawing, put where `w` asks and slid back along its own arm by however far the withdrawal
  // has got. Past the last step of the withdrawal it is not drawn at all and his own hand is back.
  function place(w) {
    if (out >= RAMP) {
      setShown(false);
      return;
    }
    const m = w.side === 'L' ? -1 : 1;
    const Yaw = m * w.yaw;
    setShown(true, m < 0 ? 'L' : 'R');
    const pose = poses[w.pose] ? w.pose : 'splay';
    for (const k in poses) poses[k].visible = k === pose;
    const G = GRIP_M[pose];
    const lift = Math.max(0, w.y) + LIFT[out];
    // the tilt is capped (PITCH_SIN): past that the flat cut-out turns edge-on to an overhead
    // lens and lies in the picture as a green blade. The PLAN position of the fingers is what an
    // overhead frame reads, so that is kept exact and the height is allowed to lie.
    const pitch = Math.asin(Math.min(PITCH_SIN, lift / G.z));
    // the wrist is worked back from the point of the drawing that TOUCHES — the fingertips of the
    // splay and the point, the nip of the pinch, which is nowhere near the middle of the hand
    const gz = G.z * Math.cos(pitch) + RETREAT[out]; // …plus the withdrawal, straight back up the arm
    const gx = m * G.x;
    const wx = w.x - (gx * Math.cos(Yaw) + gz * Math.sin(Yaw));
    const wz = w.z - (gz * Math.cos(Yaw) - gx * Math.sin(Yaw));
    // Whatever the capped tilt cannot reach, the whole drawing FLOATS to reach: asked for a
    // fingertip 13 cm up (over a riffle bridge, or on the edge of a card standing on end) the hand
    // rises bodily instead of pinning its wrist to the cloth and pointing its fingers at the sky.
    // Pinned, the palm ended up under the very cards the fingers were working and vanished.
    const floatY = Math.max(0, lift - G.z * Math.sin(pitch));
    group.position.set(wx, Y + HAND.y + floatY, wz);
    group.rotation.set(0, Yaw, 0);
    group.scale.x = m;
    wrist.rotation.set(-pitch, 0, 0);
    // the arm keeps to the cloth and points back at that wrist of his, however the hand is turned
    const A = ANCH[m < 0 ? 'L' : 'R'];
    const dx = A.x - wx, dz = A.z - wz;
    const len = Math.min(HAND.sleeveMax, Math.max(0.3, Math.hypot(dx, dz)));
    sleevePivot.rotation.set(0, m < 0 ? Math.atan2(dx, -dz) + Yaw : Math.atan2(-dx, -dz) - Yaw, 0);
    sleeve.rotation.x = Math.asin(Math.max(-0.55, Math.min(0.5, (A.y - (Y + HAND.y + floatY + 0.0012)) / len)));
    sleeve.scale.z = len;
  }

  const api = {
    group,
    HAND,
    begin() {
      claimed = false;
    },
    end() {
      if (!claimed) setShown(false);
    },
    // Put the drawing's contact point (the fingertips) on (x, y, z); the wrist and the sleeve
    // follow. `y` is metres above the cloth: above zero the hand tilts up about the wrist, the way
    // a hand rears a card up on its edge. `yaw` turns the hand about the contact point; 0 points
    // straight downstage, at the visitor.
    // `side` says which of his hands this is: 'R' (default) reaches from the visitor's right,
    // 'L' is the same drawing mirrored and anchored to his other wrist, so a card on the left of
    // the spread is turned by the hand that is nearest it and no arm crosses the whole cloth.
    // `yaw` is always given as if for the right hand; the left mirrors it.
    at(x, y, z, { yaw = 0, pose = 'splay', side = 'R' } = {}) {
      claimed = true;
      want = { x, y, z, yaw, pose, side };
      wantFrame = ctx.clock.frame;
      place(want);
    },
    // this track has no use for the hand in this drawing; another one may still claim it, so
    // nothing happens here — end() decides
    off() {},
    // One drawing of the withdrawal, or of the return: reveal.update calls it on every stepped
    // frame, after the takes have drawn, so it sees what they asked for and where the camera is.
    step() {
      const a = !forced && overhead();
      const first = sinceFrame === -99;
      if (first || a !== allowed) {
        allowed = a;
        sinceFrame = first ? ctx.clock.frame - RAMP : ctx.clock.frame; // the first answer is not animated
      }
      const k = Math.max(0, ctx.clock.frame - sinceFrame);
      const o = allowed ? Math.max(0, RAMP - k) : Math.min(RAMP, k);
      if (o === out) return;
      out = o;
      if (want && wantFrame >= ctx.clock.frame) place(want); // still wanted: redraw it at its new remove
      else if (out >= RAMP) setShown(false);
    },
    // Another piece asking for the cloth to itself: the hand withdraws over the next two drawings
    // and stays off until show() is called. The camera watch does this by itself for every shot
    // that is not overhead, so a cut away needs no call at all.
    hide() {
      forced = true;
      api.step();
    },
    show() {
      forced = false;
      api.step();
    },
    // the hand off the cloth at once, whatever anyone claimed (a take stopped, the fan cleared)
    clear() {
      claimed = false;
      want = null;
      setShown(false);
    },
    get shown() {
      return shown;
    },
    // whether the hand may be on the cloth at all: the camera is overhead and nobody asked it off
    get overhead() {
      return allowed;
    },
    // how far through the withdrawal the drawing is: 0 on the cloth … RAMP off the picture (tests)
    get out() {
      return out;
    },
    dispose() {
      for (const k in poses) {
        poses[k].geometry.dispose();
        poses[k].material.map?.dispose();
        poses[k].material.dispose();
      }
      for (const m of [sleeve, cuff]) {
        m.geometry.dispose();
        m.material.map?.dispose();
        m.material.dispose();
      }
    },
  };
  return api;
}
