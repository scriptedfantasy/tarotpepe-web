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
  // The arm runs back to the exact spot where the puppet's own right hand sits — the one that
  // steps out while this one is on the cloth — so the drawing meets his body where his hand was
  // and the join is under his own cuff.
  anchor: [0.291, 0.828, -0.82],
};

// ── THE ARM (round 9) ──────────────────────────────────────────────────────────────────────────
// What was here was ONE QUAD, 0.11 m wide, run from the cuff to a point 0.68 m upstage with a
// fixed canvas stretched over it. At 16:9 the frame's top edge cut it at a tenth of the picture and
// nobody looked; in a portrait window — where this same shot rakes to 78° and the frame is three
// times deeper than the row — it ran 348 px straight down the middle, 46% of the frame's height,
// parallel-sided, and then STOPPED IN MID-AIR seventy pixels short of his own wrist, because
// 0.68 m does not reach him from the near half of the cloth. A white pipe laid across the drawing.
// (Filed twice by the camera builder; tools/_rv9-sleeve.mjs is the measurement.)
//
// It is drawn as an arm now, and three things make it one:
//   · IT IS A RIBBON, not a quad. The spine is a curve from the wrist to his own wrist with an
//     ELBOW in it, pushed OUTBOARD of the straight line, so the silhouette bends where an arm
//     bends and neither half of it is a long parallel tube. The strip is rebuilt along that curve
//     on every drawing (28 segments, 58 vertices — nothing).
//   · ITS CANVAS IS MEASURED IN METRES. The drawing is `texM` metres of arm at `px` pixels to the
//     metre, and v is the arc length so far divided by texM — so the cuff, the folds, the elbow's
//     creases and the rain-strokes are the size they were drawn WHATEVER the reach is. The old
//     quad's marks grew with the arm, which is the only reason round 4 capped it at 0.68 m, and
//     that cap is what left it hanging in the air. Both are gone together.
//   · IT RUNS TO HIM AND PAST HIM. The far end is `past` beyond his body's plane, so it is either
//     off the top of the frame or behind his own cut-out; the drawing never ends inside the
//     picture. The ribbon is a constant width and the TAPER is drawn into the canvas — a turned
//     -back cuff at the wrist, 7 cm of sleeve under it, the swell at the elbow, and 15.6 cm at the
//     far end, which is the width of his own drawn sleeve where this one arrives.
const ARM = {
  w: 0.128, // the ribbon's width. The drawn arm inside it is 0.062–0.116, so the taper is a drawing
  texM: 1.40, // how much arm the canvas holds (the longest reach on the cloth is 1.31)
  px: 800, // canvas pixels to the metre, the same across and along: the ribbon is a constant width
  head: 0.030, // how far the ribbon starts INSIDE the hand, so the cuff covers the cut wrist
  elbowAt: 0.39, // where the elbow falls along the arm, from the head of the ribbon
  bow: 0.115, // how far the elbow is pushed outboard of the straight line: the bend, in metres
  elbowY: 0.155, // and how high it is carried over the cloth — the arm passes OVER the still life
  rise: 0.34, // how far along the arm is up to that height: early, so it clears the near clutter
  lane: 0.315, // how far off the room's axis the curve may swing before the bow is taken the other
  // way. The candle-in-a-bottle's near face is at x = 0.395 and the arm is 0.052 across the half:
  // 0.315 puts the middle of the arm 28 mm clear of it. The same number on the other side keeps the
  // left arm inside a portrait frame, whose side edge falls at about 0.40 at that depth.
  past: 0.06, // how far the far end runs beyond his body's plane, so nothing ends in the picture
};
// The drawn half-width, in metres along the arm → metres across it. The two steps at 0.015 and
// 0.055 are the turned-back cuff's lip: it stands out from the sleeve it is turned over. The
// widths are the frame's, not anatomy's: at the portrait `turn` the cloth runs about 500 screen
// pixels to the metre, so a 0.07 m sleeve is 35 px — a tenth of a phone's width, which is a sleeve
// in the picture. The first cut of this was half as wide again and filled the right-hand quarter.
const ARM_PROF = [
  [0.000, 0.031], [0.012, 0.033],
  [0.015, 0.044], [0.052, 0.045], [0.055, 0.033], // the cuff, and the sleeve out from under it
  [0.160, 0.037], [0.280, 0.043],
  [0.390, 0.049], [0.460, 0.049], // the elbow, fullest
  [0.600, 0.046], [0.850, 0.049], [1.400, 0.052], // …and then level: see the note below
];
// Why the upper arm does not go on widening. A sleeve does, but this one is drawn on a ribbon
// that runs AWAY from a lens raked 68–78° above it, so the far end is the more distant end and
// perspective is already shrinking it: drawn wider as well, the two cancelled and the arm came out
// as a parallel tube — the exact reading the round was called to fix. Held level past the elbow it
// recedes, which is what an arm going away from you does.
function armHalf(s) {
  const A = ARM_PROF;
  if (s <= A[0][0]) return A[0][1];
  for (let i = 1; i < A.length; i++) {
    if (s <= A[i][0]) return A[i - 1][1] + ((A[i][1] - A[i - 1][1]) * (s - A[i - 1][0])) / (A[i][0] - A[i - 1][0]);
  }
  return A[A.length - 1][1];
}

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

// THE ARM of his robe, drawn once, from the cuff (canvas top) to his shoulder (canvas bottom).
// The green stops at the wrist, where it belongs: the rest is a white sleeve on a white cloth,
// which is precisely how the film draws one (fd-anim-kitchen-table-cards-hires: the man's white
// cuff and shirt against the boards) — paper, its own contour, a cuff, folds where the cloth
// gathers, creases at the elbow, and rain-strokes down the shaded edge.
//
// The canvas is ISOTROPIC and its y is METRES: `ARM.px` pixels to the metre in both directions,
// because the ribbon that wears it is a constant `ARM.w` across and every mark's place is an arc
// length, not a fraction. So a 4 mm pen line is 4 mm of sleeve wherever the arm reaches to, and a
// fold is a fold rather than the 6 cm chevron the old stretched quad drew.
function drawArm(g, w, h) {
  const rng = mulberry32(77);
  g.clearRect(0, 0, w, h);
  const P = ARM.px;
  const cx = w / 2;
  const yOf = (s) => s * P; // metres along the arm → canvas y
  const half = (s) => armHalf(s) * P; // …and the drawn half-width there, in canvas px

  // The two edges. The samples are a 10 mm grid with the profile's own knots merged in, so the
  // cuff's lip comes out as a step and not as a ramp.
  const ss = [];
  for (let i = 0; i * 0.01 <= ARM.texM; i++) ss.push(i * 0.01);
  for (const [s] of ARM_PROF) if (s > 0 && s < ARM.texM) ss.push(s);
  ss.sort((a, b) => a - b);
  const j = () => (rng() - 0.5) * 1.7;
  const L = [], R = [];
  for (const s of ss) {
    const y = yOf(s), hw = half(s);
    L.push([cx - hw + j(), y]);
    R.push([cx + hw + j(), y]);
  }
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
  const run = (pts, width, alpha = 1, wobble = 1.5) => {
    for (let i = 1; i < pts.length; i++) inkLine(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { width, wobble, rng, alpha });
  };
  // the silhouette, at the hand's own pen: OUT is 11 px on a canvas of 2743 to the metre, which is
  // 4.0 mm of contour, and 3.2 px here is the same 4.0 mm. Hand and arm are one drawing.
  // (wobble 1.0, the entrance door's own range: at 1.6 the contour came out as a visible zigzag
  // rather than as a hand's line — see BRIEF.md on the door being the benchmark for the pen)
  run(L, 3.2, 1, 1.0);
  run(R, 3.2, 1, 1.0);

  g.save();
  outline();
  g.clip();

  // THE CUFF, turned back over the sleeve: two rules across the arm and a band of hatch between
  // them. It is the mark that says the hand belongs to a body in a white robe, and — being an arc
  // length like everything else here — it is the same 3.7 cm of cuff at every reach.
  const across = (s, k, width, alpha = 1) => {
    const hw = half(s) * k, y = yOf(s);
    inkLine(g, cx - hw, y + (rng() - 0.5) * 2, cx + hw, y + (rng() - 0.5) * 2, { width, wobble: 2, rng, alpha });
  };
  // …the rules kept OFF the two steps in the profile: struck on the lip they landed on the corner
  // the contour turns there and the three marks together made a black bracket round the wrist.
  across(0.0205, 0.99, 2.6);
  across(0.0475, 0.99, 2.4);
  hatch(g, cx - half(0.03) * 0.9, yOf(0.021), half(0.03) * 1.8, yOf(0.027), { angle: rad(84), spacing: 10, width: 1.8, wobble: 1.1, broken: 0.42, rng, alpha: 0.72 });

  // The cloth's FOLDS: creases across the sleeve, each a stroke that drops and flattens with a
  // shorter one answering it a few millimetres on — which is what a fold in cloth is, and what the
  // folios draw. They are gathered where a sleeve gathers (above the cuff, at the crook, past the
  // elbow) and never at one pitch down the whole length, which is what turned the old drawing into
  // a length of bamboo.
  for (const [s, span, d] of [
    [0.082, 0.88, 0.011], [0.112, 0.58, -0.008], [0.150, 0.44, 0.006],
    [0.212, 0.66, 0.010], [0.262, 0.40, -0.006], [0.305, 0.52, -0.008],
    [0.520, 0.76, 0.012], [0.575, 0.42, -0.006], [0.700, 0.58, -0.010],
    [0.830, 0.46, 0.008], [0.960, 0.64, 0.011], [1.090, 0.40, -0.006], [1.210, 0.54, -0.009],
  ]) {
    if (s > ARM.texM) continue;
    const hw = half(s) * span, y = yOf(s), dy = d * P;
    inkLine(g, cx - hw, y, cx - hw * 0.1, y + dy, { width: 2.3, wobble: 1.6, rng, alpha: 0.95 });
    inkLine(g, cx - hw * 0.1, y + dy, cx + hw, y + dy * 0.25, { width: 2.3, wobble: 1.6, rng, alpha: 0.95 });
    // the answering tick, a few millimetres along and half as long
    inkLine(g, cx - hw * 0.55, y + dy * 1.9 + 6, cx + hw * 0.2, y + dy * 1.5 + 7, { width: 1.7, wobble: 1.4, rng, alpha: 0.6 });
  }

  // THE ELBOW. The ribbon bows toward the canvas' RIGHT edge, so the INSIDE of the bend is the
  // left one: that is where the cloth is compressed, and a fan of creases off that contour is what
  // makes the bend read as a joint rather than as a kink in a hose. (When the lane sends the bow
  // the other way the drawing is flipped with it — see the uv in buildArm.)
  for (const [s, len, tilt] of [[0.328, 0.030, 0.015], [0.366, 0.062, 0.008], [0.404, 0.070, -0.001], [0.446, 0.044, -0.012]]) {
    const y = yOf(s), x0 = cx - half(s) * 0.97;
    inkLine(g, x0, y, x0 + len * P, y + tilt * P, { width: 2.4, wobble: 1.6, rng, alpha: 0.95 });
  }
  // and one long fold riding the outside of the bend, where the sleeve is pulled tight
  run([[cx + half(0.15) * 0.42, yOf(0.15)], [cx + half(0.30) * 0.52, yOf(0.30)], [cx + half(0.44) * 0.62, yOf(0.44)], [cx + half(0.62) * 0.50, yOf(0.62)]], 2.4, 0.62, 1.8);
  run([[cx - half(0.62) * 0.30, yOf(0.62)], [cx - half(0.86) * 0.40, yOf(0.86)], [cx - half(1.10) * 0.34, yOf(1.10)]], 2.2, 0.5, 1.8);

  // Rain-strokes down the shaded edge — the outside of the bend — and a thinner run down the
  // inside. They keep OFF the contour: run up against it they thickened the silhouette into a
  // serrated band instead of leaving it one line. A white sleeve on a white cloth with nothing but
  // a contour round it is a plank of paper; the tone is the whole of what makes it cloth.
  const rain = (s0, n, side, dense, alpha, width) => {
    for (let k = 0; k < n; k++) {
      const s = s0 + (k / n) * (ARM.texM - s0) + (rng() - 0.5) * 0.006;
      const hw = half(s);
      const x0 = cx + side * hw * (dense[0] + rng() * dense[1]);
      inkLine(g, x0, yOf(s), x0 + (rng() - 0.5) * 3, yOf(s) + 5 + rng() * 5, { width, wobble: 0.8, rng, alpha });
    }
  };
  rain(0.06, 104, 1, [0.42, 0.44], 0.78, 2.0);
  rain(0.06, 40, -1, [0.46, 0.34], 0.45, 1.7);
  // …and a denser patch in the crook of the elbow, where the cloth is doubled
  hatch(g, cx - half(0.40) * 0.95, yOf(0.33), half(0.40) * 0.7, yOf(0.17), { angle: rad(72), spacing: 9, width: 2.0, wobble: 1.2, broken: 0.42, rng, alpha: 0.62 });
  g.restore();
}

// the drawings, exposed so tools/_rv-hand-sheet.mjs can look at them on their own
export const __draw = { hand: drawHand, arm: drawArm, sleeve: drawArm };

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

  // THE ARM: a ribbon rebuilt every drawing along a curve from the wrist to his own wrist, with
  // the elbow bowed out of the straight line (see "THE ARM" at the head of this file). The mesh is
  // a child of the group with no transform of its own — its vertices are written in the group's
  // local frame, so the group's mirror (scale.x = ±1) turns the right arm into the left, drawing
  // and all. v = 1 is the wrist, at the top of the canvas.
  // NOTHING here casts a shadow: an offset dark copy of the hand on the cloth is a drop shadow, and
  // STYLE.md §1.1 forbids one outright — the tone under the palm is drawn.
  const armSegs = 28;
  const armGeo = new THREE.BufferGeometry();
  const armPos = new Float32Array((armSegs + 1) * 6);
  const armNrm = new Float32Array((armSegs + 1) * 6);
  const armUv = new Float32Array((armSegs + 1) * 4);
  const armIdx = [];
  for (let i = 0; i < armSegs; i++) {
    const a = i * 2;
    armIdx.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  armGeo.setAttribute('position', new THREE.BufferAttribute(armPos, 3).setUsage(THREE.DynamicDrawUsage));
  armGeo.setAttribute('normal', new THREE.BufferAttribute(armNrm, 3).setUsage(THREE.DynamicDrawUsage));
  armGeo.setAttribute('uv', new THREE.BufferAttribute(armUv, 2).setUsage(THREE.DynamicDrawUsage));
  armGeo.setIndex(armIdx);
  armGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -0.7), 1.8); // the arm is rebuilt, never culled
  const arm = new THREE.Mesh(armGeo, mat(tex(Math.round(ARM.w * ARM.px), Math.round(ARM.texM * ARM.px), drawArm), true));
  arm.name = 'reveal-hand-sleeve';
  arm.frustumCulled = false;
  group.add(arm);
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

  // ── the arm, rebuilt ──────────────────────────────────────────────────────────────────────────
  // The route is worked out in WORLD metres, because the two things it has to answer to — where he
  // is sitting and what is standing on the cloth — are world facts; the finished spine is then put
  // through the group's inverse, so the mirror that turns the right hand into the left turns the
  // arm and its drawing with it.
  const _A = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _q = new THREE.Vector3();
  const _inv = new THREE.Matrix4(); // the group's inverse, taken once a drawing and not 58 times
  function buildArm(A, wx, wy, wz) {
    group.updateMatrixWorld(true);
    _inv.copy(group.matrixWorld).invert();
    // the far end runs PAST his body's plane, so it ends behind his own cut-out or off the top edge
    const chord = Math.hypot(A.x - wx, A.z - wz) || 1e-4;
    const ext = 1 + ARM.past / chord;
    const Fx = wx + (A.x - wx) * ext, Fz = wz + (A.z - wz) * ext, Fy = A.y;
    // the head of the ribbon sits INSIDE the hand, so the cuff covers its cut wrist
    const Hx = wx - ((A.x - wx) / chord) * ARM.head, Hz = wz - ((A.z - wz) / chord) * ARM.head;
    const dx = Fx - Hx, dz = Fz - Hz;
    const len = Math.hypot(dx, dz) || 1e-4;
    const t = Math.min(0.5, Math.max(0.26, ARM.elbowAt / len));
    // OUTBOARD: the horizontal normal on the same side of the room as the hand doing the reaching.
    const m = group.scale.x < 0 ? -1 : 1;
    let px = -dz / len, pz = dx / len;
    if (px * m < 0) {
      px = -px;
      pz = -pz;
    }
    // THE LANE — how far off the room's axis the curve may swing. Bowed outboard from either of
    // the two outer cards the arm leaves the table: on his right it goes through the candle in the
    // wine bottle, which stands 35 cm high at (0.44, −0.34) with the glass just past it (measured
    // 36 mm inside it, tools/_rv9-clear.mjs), and on his left it goes clean out of the side of a
    // portrait frame and leaves the hand on the cloth with no arm at all. So the bow is TRIED
    // outboard and taken inboard when it would cross the lane — an elbow tucked in at his side,
    // which a reaching arm does as readily as the other, and which the drawing follows (uIn).
    const b0 = ARM.bow * Math.min(1, len / 0.72);
    const cxOf = (b) => 2 * (Hx + dx * t + px * b) - 0.5 * (Hx + Fx);
    const swing = (b) => {
      const C = cxOf(b);
      let mx = 0;
      for (let i = 0; i <= 8; i++) {
        const u = i / 8, a = (1 - u) * (1 - u), c = 2 * (1 - u) * u, e = u * u;
        mx = Math.max(mx, Math.abs(a * Hx + c * C + e * Fx));
      }
      return mx;
    };
    const b = swing(b0) > ARM.lane && swing(-b0) < swing(b0) ? -b0 : b0;
    const uIn = b < 0 ? 1 : 0; // which edge of the canvas is the inside of the bend
    const Ex = Hx + dx * t + px * b, Ez = Hz + dz * t + pz * b;
    const Ey = wy + Math.max(0.03, ARM.elbowY - (wy - Y - HAND.y));
    // the quadratic whose midpoint IS that elbow: B(½) = ¼H + ½C + ¼F
    const Cx = cxOf(b), Cz = 2 * Ez - 0.5 * (Hz + Fz);
    // …but the HEIGHT is its own curve, and it is not symmetric. The arm has to be up over the
    // still life within the first hand's breadth — the newspaper and its saucer stand 55 mm proud
    // of the cloth ten centimetres from where the left hand works — and then it is simply carried
    // there until it comes down onto his own wrist. Which is also how an arm reaches across a
    // table: the wrist is down on the cloth, the elbow goes up at once and stays up.
    const y0 = wy + 0.0012;
    const yAt = (u) => (u <= ARM.rise ? y0 + (Ey - y0) * Math.pow(u / ARM.rise, 0.62) : Ey + (Fy - Ey) * Math.pow((u - ARM.rise) / (1 - ARM.rise), 1.25));
    const at = (u, o) => {
      const a = (1 - u) * (1 - u), c = 2 * (1 - u) * u, e = u * u;
      o.set(a * Hx + c * Cx + e * Fx, yAt(u), a * Hz + c * Cz + e * Fz).applyMatrix4(_inv);
    };
    const half = ARM.w / 2;
    let s = 0, pnx = 1, pnz = 0;
    for (let i = 0; i <= armSegs; i++) {
      const u = i / armSegs;
      at(u, _p);
      if (i) s += _p.distanceTo(_q);
      _q.copy(_p);
      // the tangent, for the cross-section's normal (the section itself stays horizontal: this is
      // a flat cut-out laid on a ramp, not a tube)
      at(Math.min(1, u + 0.01), _A);
      let tx = _A.x - _p.x, ty = _A.y - _p.y, tz = _A.z - _p.z;
      if (u >= 1) {
        at(0.98, _A);
        tx = _p.x - _A.x;
        ty = _p.y - _A.y;
        tz = _p.z - _A.z;
      }
      const tl = Math.hypot(tx, tz) || 1e-4;
      let nx = -tz / tl, nz = tx / tl; // the horizontal normal of the spine, at this station…
      // …kept on the same side all the way up the arm. In the group's own frame outboard is +x on
      // both hands (the mirror sees to that), so the first station takes that side and every one
      // after it agrees with the one before: a section that flipped would turn the ribbon inside out.
      if ((i === 0 ? nx : nx * pnx + nz * pnz) < 0) {
        nx = -nx;
        nz = -nz;
      }
      pnx = nx;
      pnz = nz;
      const ox = nx * half, oz = nz * half;
      const k = i * 6, j2 = i * 4;
      armPos[k] = _p.x - ox;
      armPos[k + 1] = _p.y;
      armPos[k + 2] = _p.z - oz;
      armPos[k + 3] = _p.x + ox;
      armPos[k + 4] = _p.y;
      armPos[k + 5] = _p.z + oz;
      // the face normal — up, tilted with the ramp: the cross of the section and the tangent
      const T = Math.hypot(tx, ty, tz) || 1e-4, d = tl * T;
      for (const o of [k, k + 3]) {
        armNrm[o] = (-tx * ty) / d;
        armNrm[o + 1] = (tl * tl) / d;
        armNrm[o + 2] = (-tz * ty) / d;
      }
      // …and the drawing turns over with the bow, so the elbow's creases stay on the INSIDE of the
      // bend whichever way the lane sent it
      const v = 1 - Math.min(1, s / ARM.texM);
      armUv[j2] = uIn;
      armUv[j2 + 1] = v;
      armUv[j2 + 2] = 1 - uIn;
      armUv[j2 + 3] = v;
    }
    armGeo.attributes.position.needsUpdate = true;
    armGeo.attributes.normal.needsUpdate = true;
    armGeo.attributes.uv.needsUpdate = true;
  }

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
    // `floor` is the height of whatever the hand is lying ON — a packet of cards he is holding,
    // say. The drawing is raised bodily by it and keeps its own flat pose, because a cut-out that
    // stays pinned to the cloth is drawn OVER by anything thicker than the 4 mm it floats: a hand
    // holding twenty-one cards came out as three green fingertips under a slab.
    const floor = Math.max(0, w.floor ?? 0);
    const floatY = Math.max(0, lift - G.z * Math.sin(pitch)) + floor;
    group.position.set(wx, Y + HAND.y + floatY, wz);
    group.rotation.set(0, Yaw, 0);
    group.scale.x = m;
    wrist.rotation.set(-pitch, 0, 0);
    // the arm, rebuilt along its curve: it starts inside the hand, bends at an elbow bowed out of
    // the straight line, and runs to that wrist of his and past it
    buildArm(ANCH[m < 0 ? 'L' : 'R'], wx, Y + HAND.y + floatY, wz);
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
    // `floor` raises the whole drawing: the height of the thing it is lying on (a packet of cards
    // in his hand), so the hand is drawn over it instead of under it. `y` stays the fingertip's
    // height above that floor.
    at(x, y, z, { yaw = 0, pose = 'splay', side = 'R', floor = 0 } = {}) {
      claimed = true;
      want = { x, y, z, yaw, pose, side, floor };
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
      for (const m of [arm]) {
        m.geometry.dispose();
        m.material.map?.dispose();
        m.material.dispose();
      }
    },
  };
  return api;
}
