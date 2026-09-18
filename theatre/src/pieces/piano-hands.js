// piano-hands — HIS TWO HANDS ON THE KEYBOARD, DRAWN FOR THE SHOT THAT SEES THEM.
//
// The user, on the first cut: "review the hands on the piano, they could be a lot better."
//
// WHAT WAS THERE, and why it could not be made to work. The piano borrowed the two rigs out of
// reveal-hand.js — the drawing that comes over the tablecloth for the shuffle — and gave them a
// shoulder off the bottom edge of the piano frame. On the cloth that rig is right: a lens 70° or
// more above the table sees the BACK of a flat hand and an arm running away to his own wrist, and
// the arm is 0.128 m of ribbon with a cuff, folds, an elbow and rain-strokes drawn into it. Over
// this keyboard the same two things came out as, measured on /tmp/walk/piano-hands-3x.png:
//   · TWO WHITE TUBES, 0.128 m wide, bowed at an elbow carried 0.155 m over the keys, arching from
//     the bottom of the frame up ACROSS the keyboard — the brightest, largest thing in the picture,
//     and the ink pass's own edge round it besides.
//   · and under them, his hand at 0.14 m, which is the right size for a hand on a CLOTH 0.66 m
//     from the lens and is 100 px at a keyboard 2.2 m away: three green slivers between the tubes.
// So this file is one drawing and not two borrowed ones, and nothing in reveal-hand.js is touched:
// the shuffle keeps its hands exactly as they are.
//
// ---- WHAT A HAND ON A KEYBOARD IS, FROM ABOVE ------------------------------------------------
// The piano shot looks down at 46° from 2.20 m out (camera-shots.js, `piano`). From there a
// pianist's hands show their BACKS and nothing else: no palm, no arm — a forearm at that rake is
// two centimetres of sleeve behind the wrist and then it is out of the picture. So the drawing is
// the back of a hand, four fingers spread over the keys and the thumb turned in, the knuckles as
// small marks, and a short white cuff where the wrist leaves. THE CUFF IS THE WHOLE SLEEVE.
//
// ---- IT IS THE SAME HAND AS THE ONE ON THE CLOTH ---------------------------------------------
// His hand is the user's own drawing (public/pepe/hand-splay.png, cut by tools/hand-cutout.mjs):
// a frog's hand, four fingers and a thumb off the heel of the palm, fat round tips, ONE contour,
// the green (pepe.js SKIN) printed flat and a hair out of register under the line, a white cuff at
// the wrist. Every one of those is kept here. What cannot be kept is the PLATE: a plate is one
// pose, and this hand has to put a named finger on a named key twelve times a second. So the same
// hand is drawn with the pen instead — the palm, the five digits and the cuff struck onto a small
// canvas whenever the pose changes, which is the film's own arrangement for anything that has to
// be re-cut (dialogue-ink.js does it for every word on the placard).
//
// MEASURED AGAINST THE KEYS, which is the only scale that matters here. The keys are drawn at
// their real width (23.5 mm a white), so an octave of them is 7 × 23.5 = 164.2 mm. A hand that can
// play this piece spans an octave. The drawing below is 139 mm from the thumb's tip to the little
// finger's at rest — a sixth — and reaches 180 mm with both swung as far as they go, which is what
// a hand does to play an octave and is why it looks like a hand and not like a rake. An octave of
// keyboard is 142 px on the glass at 1280×800 (the board runs 111 → 1169 px there), 178 px at
// 1600×900, and 90 px on a 390×844 phone, where the frame turns on its side and the board runs DOWN
// the screen; the hand measures 0.93 of that at 1280×800 with the chord under it. The old plate was
// 121 px across the same frame with two 0.128 m tubes over it.
//
// ---- AND THEN IT WAS GIVEN THE REAL PIECE TO PLAY --------------------------------------------
// Nothing about the drawing changes below. What changed is that piano-song.js stopped holding an
// invented Gymnopédie and started holding Satie's, and the real one asks two things of these hands
// that the invented one never did — so two things in here had to learn about the keyboard's OTHER
// dimension, the one that runs from the player into the instrument:
//   THE FINGERING IS CHOSEN IN BOTH DIRECTIONS NOW. It was chosen along the board alone, which put
//   the thumb — a digit whose tip lies 54 mm out from the wrist where the middle finger's lies 146 —
//   on the F♯ at the top of Satie's own B–D–F♯, a BLACK key met 45 mm further in. It came out a
//   whole white key short. See «AND THE FOURTH TERM», below.
//   AND A KEY IS MET WHERE THE FINGER REACHES IT. A white key is 150 mm long and every millimetre
//   of it sounds the same note; the hand used to meet all of them on one line 100 mm back. Bars
//   24–31 are four-note chords a NINTH wide — 188 mm against the 180 this hand can reach — and a
//   hand stretched like that plays nearer the player, which is most of how it covers them at all.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { INK, PAPER, makeCanvas, canvasTexture, inkLine, inkMaterial } from '../core/strokes.js';
import { SKIN } from './pepe.js';

const PI = Math.PI;
const rad = (d) => (d * PI) / 180;

// ---- THE HAND, in metres of keyboard -----------------------------------------------------------
// The drawing's own frame: the WRIST is the origin, +y runs to the fingertips (into the keyboard,
// away from the player) and +x runs toward the THUMB. Both hands are drawn in this frame and it is
// the world that mirrors them: the right hand's thumb points at the bass, the left hand's at the
// treble, so `side` is nothing but the sign on z when the drawing is hung in the room.
export const HAND = {
  px: 1600, // canvas pixels to the metre, the same across and along. The frame gives the hand 870
  // px to the metre at 1280×800, so the canvas is sampled at about 1:1.8 where it is biggest.
  palm: 0.074, // the wrist to the knuckle line
  cuff: 0.034, // …and the white band below the wrist, where the drawing ends
  press: 0.030, // how high the drawing lies over the white keys with a finger down. The black keys
  // stand 25 mm proud of them, so this is 5 mm of air over the highest thing the hand crosses.
  rest: 0.043, // …and between notes: a finger's height higher, which is what a hand at rest is
  span: 0.1642, // an octave of white keys: what the stretch below is measured against
};

// The five digits: where each comes off the palm, which way it lies at rest (degrees from +y,
// turning toward the thumb), how long it is and how thick at the base. No two fingers are the same
// length — the middle is longest, the index and ring differ by half a knuckle, the little one stops
// well short — and the thumb comes off the SIDE of the hand, low and turned in, which is the whole
// difference between a hand and a mitten. The numbers are the user's plate measured: his index is
// 0.84 of his middle, his little 0.71, and the palm is as long as the middle finger.
const DIGITS = [
  { name: 'thumb', base: [0.037, 0.022], ang: 62, len: 0.052, w: 0.0195 },
  { name: 'index', base: [0.030, 0.070], ang: 13, len: 0.063, w: 0.0175 },
  { name: 'middle', base: [0.010, 0.077], ang: 1, len: 0.069, w: 0.0180 },
  { name: 'ring', base: [-0.012, 0.073], ang: -11, len: 0.062, w: 0.0165 },
  { name: 'little', base: [-0.032, 0.062], ang: -24, len: 0.049, w: 0.0145 },
];
// HOW FAR A DIGIT MAY BE SENT FROM ITS REST. A finger BENDS, it does not grow: it may be drawn down
// to 0.52 of its length (which from over the keyboard is a finger curled onto a key) and 12 mm past
// it (which is the last of the straightening), and it may swing 26 degrees either side of where it
// lies. Everything further is the HAND's business, and the hand moves instead.
const CURLED = 0.52, STRETCH = 0.012, SWING = rad(26);
// where each tip lies when nobody is asking anything of it
const REST = DIGITS.map((d) => [d.base[0] + Math.sin(rad(d.ang)) * d.len, d.base[1] + Math.cos(rad(d.ang)) * d.len]);
// What the drawing SPANS, which is the number this round is measured by: thumb tip to little tip at
// rest, the same with both digits swung and straightened as far as they go, and the octave of white
// keys it has to be able to lie across. 139 → 180 mm against 164: a sixth at rest, and an octave and
// a semitone when it reaches, which is a hand that can play this piece and not a rake.
const far = (i, sgn) => DIGITS[i].base[0] + Math.sin(rad(DIGITS[i].ang) + sgn * SWING) * (DIGITS[i].len + STRETCH);
export const SPREAD = { rest: REST[0][0] - REST[4][0], reach: far(0, 1) - far(4, -1), octave: HAND.span };

// The back of the hand: a slab that swells at the thumb's mound, widest across the knuckles, and
// narrows to a real wrist where the cuff comes over it. The digit bases all lie inside it, so every
// finger's contour is stroked OPEN and stops where it meets the hand — stroked closed, the edge
// across a finger's root lands on the palm's own line and the two together put a black bar there
// (reveal-hand.js found the same thing on the cloth).
const PALM = [
  [0.030, -0.002], [0.041, 0.014], [0.046, 0.036], [0.040, 0.058], [0.038, 0.074],
  [0.020, 0.081], [0.000, 0.084], [-0.020, 0.080], [-0.038, 0.069],
  [-0.043, 0.048], [-0.037, 0.018], [-0.028, -0.002],
];
// The cuff, turned back over the wrist: the drawing ends at its cut edge, 34 mm below the wrist.
// It is the only white in the drawing and the only sleeve in the frame.
const CUFF = [
  [0.030, -0.002], [0.033, -0.012], [0.032, -0.034],
  [-0.030, -0.034], [-0.031, -0.012], [-0.028, -0.002],
];

// The canvas, in the drawing's own metres. It has to hold the thumb taken to the limit of its swing
// (0.101 across, from 0.088 at rest) and the little finger the other way (−0.079), the fingertips at
// full stretch (0.157), the cuff's cut edge at −0.034, and a couple of millimetres of contour and
// misregistration past all of it.
const BOX = { x0: -0.10, x1: 0.13, y0: -0.046, y1: 0.186 };
const TEX = { w: Math.round((BOX.x1 - BOX.x0) * HAND.px), h: Math.round((BOX.y1 - BOX.y0) * HAND.px) };

// ---- THE PEN, in MILLIMETRES of hand -----------------------------------------------------------
// Millimetres and not pixels, so HAND.px can move without redrawing the hand — reveal-hand.js's
// round 12 learned that one the hard way. The contour is 2.6 mm, which is his own plate's line
// (3.6 mm at the scale that plate is printed at) brought down to what the piano frame can hold: at
// 1280×800 a millimetre of keyboard is 0.87 px, so the contour lands at 2.3 px against the room's
// own 2.0–2.4 px on a card, and on a phone at 1.4 px. Everything inside the silhouette is thinner
// than half of it and drawn at a lower alpha, because only the edge is a line — and there is NO
// HATCHING ON THE SKIN at all. A hand this size on a frame this far away has room for a contour,
// four knuckles and two tendons, and a fifth mark would be dirt.
const PEN = {
  contour: 2.6,
  knuckle: 1.1, // the four small marks across the knuckle line
  joint: 1.0, // …and one at the middle joint of a finger that is out straight
  tendon: 1.0, // the two lines running down the back of the hand
  cuff: 1.3, // the rule across the cuff, and the wrist under it
};
// The flat colour is printed a hair off the line, the way a cheap plate slips (STYLE.md §1.4) and
// the way his own hand is cut: 2.9 mm across and 2.2 mm up the drawing, which is the offset
// tools/hand-cutout.mjs left in the plate. The paper is filled at the TRUE outline first, so what
// the slip leaves is a sliver of white inside the line — never a transparent slit in the hand,
// which is what an alpha-cut material makes of a fill that has walked off its own silhouette.
const MIS = [2.9, -2.2];

// ---- the drawing --------------------------------------------------------------------------------
// the boil, in MILLIMETRES of hand — everything else in this file is metres, and a line shaken by
// half a metre is a wedge across the keyboard (measured by looking at it)
const wob = (rng, mm) => ((rng() - 0.5) * 2 * mm) / 1000;

// A digit: a tapered shape from its base to wherever its tip has been sent, with a lateral bow in
// it. THE BOW IS THE CURL. A finger pressing a key bends at both joints, and from directly over the
// keyboard a bent finger is a SHORT one — so a digit sent to a target nearer than its own length is
// drawn at that length with the slack pushed out sideways, which is what the eye reads as a knuckle
// standing up. Nothing else about a press is drawable from above; the key going down under it does
// the rest.
function digitPoly(base, tip, w, bow, rng) {
  const N = 4;
  const dx = tip[0] - base[0], dy = tip[1] - base[1];
  const L = Math.hypot(dx, dy) || 1e-4;
  const ux = dx / L, uy = dy / L;
  const nx = -uy, ny = ux;
  const spine = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const b = bow * Math.sin(PI * u);
    spine.push([base[0] + ux * L * u + nx * b, base[1] + uy * L * u + ny * b, (w / 2) * (1 - 0.2 * u)]);
  }
  const j = () => wob(rng, 0.5);
  const left = [], right = [];
  for (let i = 0; i < spine.length; i++) {
    const [px, py, r] = spine[i];
    const p0 = spine[Math.max(0, i - 1)], p1 = spine[Math.min(spine.length - 1, i + 1)];
    const ex = p1[0] - p0[0], ey = p1[1] - p0[1];
    const e = Math.hypot(ex, ey) || 1e-4;
    left.push([px - (ey / e) * r + j(), py + (ex / e) * r + j()]);
    right.push([px + (ey / e) * r + j(), py - (ex / e) * r + j()]);
  }
  // The tip: a half-turn round the last station, in three points so it is not a true circle. It
  // runs from the LEFT side round to the right — the way the two sides were walked — because a cap
  // written the other way about crosses the outline at the tip, and a polygon with a bow-tie in it
  // fills black and strokes twice. (Every fingertip in the first cut had a dark blot on it.)
  const [tx, ty, tr] = spine[N];
  const a0 = Math.atan2(ty - spine[N - 1][1], tx - spine[N - 1][0]);
  const cap = [];
  for (let k = 1; k <= 3; k++) {
    const th = a0 + PI / 2 - (PI * k) / 4;
    cap.push([tx + Math.cos(th) * tr + j(), ty + Math.sin(th) * tr + j()]);
  }
  return [...left, ...cap, ...right.reverse()];
}

function wobbly(points, rng, mm) {
  return points.map(([x, y]) => [x + wob(rng, mm), y + wob(rng, mm)]);
}

// The drawing itself. `pose` is five tips and how far each digit is curled; everything else about
// the hand is fixed, because a hand is.
function drawHand(g, pose, seed) {
  const rng = mulberry32(seed);
  const P = HAND.px;
  const X = (lx) => (lx - BOX.x0) * P; // the drawing's metres → canvas px
  const Y = (ly) => (BOX.y1 - ly) * P;
  const mm = (v) => (v * P) / 1000;
  const path = (poly) => {
    g.beginPath();
    g.moveTo(X(poly[0][0]), Y(poly[0][1]));
    for (let i = 1; i < poly.length; i++) g.lineTo(X(poly[i][0]), Y(poly[i][1]));
    g.closePath();
  };
  const open = (poly) => {
    g.beginPath();
    g.moveTo(X(poly[0][0]), Y(poly[0][1]));
    for (let i = 1; i < poly.length; i++) g.lineTo(X(poly[i][0]), Y(poly[i][1]));
    g.stroke();
  };
  const line = (x1, y1, x2, y2, o = {}) =>
    inkLine(g, X(x1), Y(y1), X(x2), Y(y2), { rng, wobble: mm(0.5), segments: Math.max(2, Math.round((Math.hypot(x2 - x1, y2 - y1) * 1000) / 6)), ...o });

  g.clearRect(0, 0, TEX.w, TEX.h);
  const palm = wobbly(PALM, rng, 0.45);
  const cuff = wobbly(CUFF, rng, 0.4);
  const digits = DIGITS.map((d, i) => digitPoly(d.base, pose.tips[i], d.w * (1 + 0.14 * pose.curl[i]), pose.bow[i], rng));

  // 1. THE PAPER, at the true outline: the cut-out's own silhouette, and what the alpha test sees
  g.save();
  g.fillStyle = PAPER;
  for (const p of [palm, cuff, ...digits]) {
    path(p);
    g.fill();
  }
  g.restore();

  // 2. THE GREEN, printed off the line — one slip for the whole drawing, so it reads as a bad plate
  g.save();
  g.translate(mm(MIS[0]), mm(MIS[1]));
  g.fillStyle = SKIN;
  for (const p of [palm, ...digits]) {
    path(p);
    g.fill();
  }
  g.restore();

  // 3. THE CONTOUR, and it is the one line in the drawing. Two rules about where it is NOT:
  //   A LINE STOPS WHERE THE THING IN FRONT OF IT BEGINS. The palm's contour is struck with every
  //     finger CUT OUT of the canvas, so it never crosses the root of one — stroked whole, it laid a
  //     black bar across all four, which is the fault reveal-hand.js found on the cloth and fixed
  //     another way. A finger is cut out of the ones drawn before it for the same reason: fingers
  //     converging on a chord overlap on a flat drawing, and two contours crossing inside a green
  //     shape is a tangle, not a hand.
  //   AND A FINGER IS STROKED OPEN — up one side, round the tip, down the other — so the edge across
  //     its base is never drawn at all.
  // (The cut-out is an even-odd clip: the whole canvas, less the shapes that stand in front.)
  const cutOut = (shapes) => {
    g.beginPath();
    g.rect(0, 0, TEX.w, TEX.h);
    for (const p of shapes) {
      g.moveTo(X(p[0][0]), Y(p[0][1]));
      for (let i = 1; i < p.length; i++) g.lineTo(X(p[i][0]), Y(p[i][1]));
      g.closePath();
    }
    g.clip('evenodd');
  };
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = INK;
  g.lineWidth = mm(PEN.contour);
  g.save();
  cutOut(digits);
  path(palm);
  g.stroke();
  path(cuff);
  g.stroke();
  g.restore();
  for (let i = 0; i < digits.length; i++) {
    g.save();
    cutOut(digits.slice(i + 1));
    open(digits[i]);
    g.restore();
  }

  // 4. THE KNUCKLES. One stroke across the root of each finger, a little wider than the finger, so
  // that its ends meet the palm's own line: it is what tells a finger from the back of the hand now
  // that the palm's contour is cut out of the fingers and no longer runs across them. (Struck at
  // 0.40 of the width and a lower alpha, which is what it was for one pass, the hand came out a
  // mitten with slots in it — measured by looking at it.) The thumb has none: it is turned in and
  // its own web crease says the same thing.
  for (let i = 1; i < DIGITS.length; i++) {
    const d = DIGITS[i];
    const t = pose.tips[i];
    const a = Math.atan2(t[1] - d.base[1], t[0] - d.base[0]);
    const nx = Math.sin(a) * d.w * 0.56, ny = Math.cos(a) * d.w * 0.56;
    const k = 0.006; // back down the finger from its base, into the hand
    const bx = d.base[0] - Math.cos(a) * k, by = d.base[1] - Math.sin(a) * k;
    line(bx - nx, by + ny, bx + nx, by - ny, { width: mm(PEN.knuckle), alpha: 0.8 });
    // and one at the middle joint of a finger that is standing out straight
    if (pose.curl[i] < 0.35) {
      const L = Math.hypot(t[0] - d.base[0], t[1] - d.base[1]);
      const jx = d.base[0] + Math.cos(a) * L * 0.62, jy = d.base[1] + Math.sin(a) * L * 0.62;
      const r = d.w * 0.34;
      line(jx - Math.sin(a) * r, jy - Math.cos(a) * r, jx + Math.sin(a) * r, jy + Math.cos(a) * r, { width: mm(PEN.joint), alpha: 0.6 });
    }
  }
  // the crease out of the thumb's web, and two tendons down the back of the hand — under the
  // fingers like the palm's own contour, so a digit curled back over the hand covers them
  g.save();
  cutOut(digits);
  line(0.036, 0.030, 0.020, 0.052, { width: mm(PEN.knuckle), alpha: 0.7 });
  line(0.022, 0.066, 0.012, 0.028, { width: mm(PEN.tendon), alpha: 0.45 });
  line(-0.004, 0.070, -0.008, 0.030, { width: mm(PEN.tendon), alpha: 0.4 });
  g.restore();

  // 5. THE CUFF: the wrist under it and one rule across it. Two marks, because at this size the
  // cuff is 20 px of white and a third line would close it up.
  line(-0.027, -0.003, 0.029, -0.003, { width: mm(PEN.cuff), alpha: 0.8 });
  line(-0.030, -0.021, 0.031, -0.022, { width: mm(PEN.cuff * 0.85), alpha: 0.6 });
}

// ---- WHICH FINGER PLAYS WHICH NOTE --------------------------------------------------------------
// Not «always the index»: the fingering is WORKED OUT from the notes, every drawing, the way a
// player works it out — because the one thing an audience over a keyboard can see is whether the
// hand is lying on the notes it is sounding.
//
// In the drawing's own frame the digits run thumb → little across the hand. In the ROOM the bass is
// downstage (+z: see keyZ in props-piano.js), so the right hand, whose thumb points at the bass,
// takes an ascending run thumb → little, and the left hand, whose thumb points at the treble, takes
// it little → thumb. That is the whole of the difference between the two, and it is also exactly
// how the two hands are fingered on a real instrument: the left thumb takes the TOP of its chord.
//
// The choice is made by trying every way of laying n digits on n keys IN ORDER (there are at most
// ten of them) at every hand position on a millimetre grid, and taking the cheapest. What the cost
// is made of, and every term of it is a thing a player does:
//   A FINGER REACHES, UP TO A POINT. Anything inside COMFORT of where the digit lies costs almost
//     nothing — that is the finger swinging, and 12 mm of it is ten degrees. Past that the cost
//     climbs steeply and it is the HAND that has to go, which is the slide.
//   THE RIGHT HAND IS RELUCTANT TO MOVE and the LEFT HAND IS NOT. The melody is a line and the hand
//     walks it; the left hand has a bass on the first beat and a four-note chord on the second, an
//     octave and a half above it, and it JUMPS between them. One weight, two values.
//   AND A SINGLE NOTE HAS A FINGER IT WANTS. Under the right hand a single note is the MELODY, and
//     a melody is carried on the three long fingers: the thumb and the little one cost something.
//     Under the left hand a single note is the BASS, and a bass is taken by the little finger — the
//     one at the bottom end of that hand — so the costs run the other way. It is what makes the
//     tune come out fingered 2–3–4 with the hand walking up to the C♯ and back, instead of a hand
//     standing still and picking notes off with whichever finger happens to be over them.
// (The three were TUNED against the tune, on the tune: at COMFORT 20 mm and no preference the hand
// moved 57 mm over an octave of melody and played almost all of it with one finger where it stood;
// at 8 mm with a strong preference it moved 151 mm and used nothing but the middle finger. These
// numbers give 95 mm of travel, three fingers, and r = −0.83 against the pitch.)
const ORDER = { R: [0, 1, 2, 3, 4], L: [4, 3, 2, 1, 0] };
const MOVE_COST = { R: 1.0, L: 0.03 };
const COMFORT = 0.012; // how far a digit reaches on its own before the hand goes with it
const PICK = {
  R: [0.004, 0.0006, 0, 0.0006, 0.004], // the melody: the three long fingers
  L: [0.004, 0.002, 0.001, 0.0003, 0], // the bass: the little finger
};
function combinations(order, n) {
  const out = [];
  const walk = (i, acc) => {
    if (acc.length === n) return out.push(acc.slice());
    if (i >= order.length) return;
    walk(i + 1, [...acc, order[i]]);
    walk(i + 1, acc);
  };
  walk(0, []);
  return out;
}
const COMBOS = {
  R: [1, 2, 3, 4, 5].map((n) => combinations(ORDER.R, n)),
  L: [1, 2, 3, 4, 5].map((n) => combinations(ORDER.L, n)),
};

// WHERE A DIGIT'S TIP STANDS RELATIVE TO ITS WRIST, in the room and not in the drawing — because
// the hand is TOED OUT (`yaw`, below: a forearm coming from the middle of the keyboard leaves it at
// an angle) and a tenth of a radian turns 146 mm of finger into 15 mm of keyboard. Solving the
// fingering in the drawing's own frame and hanging it in the room at an angle is what put the first
// cut's melody finger a key and a half off the note it was sounding, measured at 29 px on the glass.
// So the offsets the solver works with are the turned ones: `z` along the keyboard, `x` into it.
function offsets(side, yaw) {
  const s = side === 'R' ? 1 : -1;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  return REST.map(([lx, ly]) => ({ z: ly * sin + s * lx * cos, x: -(-ly * cos + s * lx * sin) }));
}

// AND THE FOURTH TERM, WHICH IS HOW DEEP A KEY IS AND NOT WHERE IT IS ALONG THE BOARD. The three
// above choose a fingering by the keyboard's length alone, and for sixteen months of this file's
// life that was enough, because the chord it was tuned against — the invented B–D–F♯–A — happened
// to put a LONG finger on its black key and the thumb on a white one. Satie's own chord is B–D–F♯,
// three notes, and the left hand takes its top note with the thumb: a short digit, whose tip lies
// 54 mm out from the wrist where the middle finger's lies 146, sent to a key that is met 45 mm
// FURTHER INTO the instrument than the white one the middle finger is on. Nothing in the drawing can
// do that — a finger bends, and bending brings the tip nearer, not further — and the thumb came out
// a whole white key short of the F♯ it was sounding (22 mm, measured; the claim is half a key).
//   So the cost now also asks WHERE EACH DIGIT WOULD PUT THE WRIST, into the keyboard, and pays for
// the disagreement between them. A finger's curl and its stretch together make up about 45 mm of it;
// past that the chord has to be fingered another way, and it is: B–D–F♯ comes out little–ring–index
// with the thumb kept off the black key altogether, which is where a hand with this thumb has to
// put it.
//
// `zs` are the notes' own z on the keyboard, ASCENDING IN PITCH (so descending in z: the treble is
// upstage) and `xs` their own x, which is 45 mm deeper for a black key than a white one. `zw` is
// where the wrist stands now, `off` what `offsets` worked out for this hand. Returns the digits, in
// the same order as the notes, and where the wrist has to stand for them.
const DEPTH_GIVE = 0.045; // what a finger's curl and stretch make up, into the keyboard
const DEPTH_COST = 8;
function fingering(side, zs, zw, off, xs = null) {
  const n = Math.min(5, zs.length);
  const combos = COMBOS[side][n - 1];
  const pick = n === 1 ? PICK[side] : null;
  let best = null;
  for (const S of combos) {
    // the wrist position each digit would want if it alone were playing, and the span of those
    const want = S.map((d, i) => zs[i] - off[d].z);
    const lo = Math.min(...want), hi = Math.max(...want);
    // …and the same question asked into the keyboard, where the answer is not a hand position but
    // whether these digits can be on these keys at all
    let deep = 0;
    if (xs && n > 1) {
      const wx = S.map((d, i) => xs[i] + off[d].x);
      const over = Math.max(0, Math.max(...wx) - Math.min(...wx) - DEPTH_GIVE);
      deep = DEPTH_COST * over * over;
    }
    for (let z = lo - 0.03; z <= hi + 0.0301; z += 0.001) {
      let cost = MOVE_COST[side] * (z - zw) * (z - zw) + (pick ? pick[S[0]] : 0) + deep;
      for (let i = 0; i < n; i++) {
        const dev = want[i] - z; // how far this digit has to reach for its own note
        const over = Math.max(0, Math.abs(dev) - COMFORT);
        cost += 0.02 * dev * dev + 200 * over * over; // past its reach the hand goes instead
      }
      if (!best || cost < best.cost) best = { cost, z, S };
    }
  }
  return { z: best.z, digits: best.S };
}

// ---- the object ---------------------------------------------------------------------------------
// One of these is a hand: a quad lying flat in the plane the drawing floats in, a canvas that is
// re-struck whenever the pose changes, and the small state machine that brings it into the frame
// and takes it out again.
//
// THEY COME IN FROM THE BOTTOM OF THE FRAME. A player's hands arrive from the player, which in this
// shot is toward the room and downward — the frame's own «down» at 1280×800, and its right-hand
// edge when the window is narrow enough to turn the shot on its side. Three drawings out and three
// back: 0.26 m of it is past the bottom edge of a 1280×800 frame (the x that the edge cuts at the
// key plane is −1.60; the wrist stands at −1.87), and further still on a phone.
const RAMP = [
  [0, 0],
  [0.12, -0.05],
  [0.26, -0.12],
];
const OUT = RAMP.length - 1;

export function buildPianoHands(ctx, { parent, keyY, keyZ, isBlack, front, home, yaw = 0.10 }) {
  const THREE_ = ctx.THREE ?? THREE;
  // WHERE A FINGER TOUCHES A KEY, in metres back from the front of the key block. A black key is
  // 89 mm long and stands 25 mm over the whites, so it is met well back; a white key is met on the
  // 49 mm of it that is in front of the blacks, which is where a hand can reach it at all.
  const touchX = (m) => front + (isBlack(m) ? 0.055 : 0.100);

  const hands = {};
  for (const side of ['L', 'R']) {
    const s = side === 'R' ? 1 : -1;
    const group = new THREE_.Group();
    group.name = 'piano-hand-' + side;
    group.visible = false;
    // THE QUAD. The drawing lies FLAT, in the plane of the keyboard and not facing the lens: a hand
    // over a keyboard is seen from 46° above it and foreshortens, and so must its drawing. The
    // vertices are written in the drawing's own frame — (lx, ly) → (−ly, 0, s·lx) — so the two
    // hands are the same drawing hung with opposite signs on z and neither is a mirrored mesh.
    const geo = new THREE_.BufferGeometry();
    const pos = [], uv = [], nrm = [];
    for (const [lx, ly, u, v] of [
      [BOX.x0, BOX.y0, 0, 0], [BOX.x1, BOX.y0, 1, 0], [BOX.x1, BOX.y1, 1, 1], [BOX.x0, BOX.y1, 0, 1],
    ]) {
      pos.push(-ly, 0, s * lx);
      uv.push(u, v);
      nrm.push(0, 1, 0);
    }
    geo.setAttribute('position', new THREE_.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE_.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE_.Float32BufferAttribute(nrm, 3));
    geo.setIndex(s > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
    geo.computeBoundingSphere();
    const canvas = makeCanvas(TEX.w, TEX.h);
    const g2 = canvas.getContext('2d');
    const tex = canvasTexture(canvas, { anisotropy: 8 });
    // ONE CONTOUR, AND IT IS THE DRAWN ONE. `lineWeight` 0: the contour is struck into the canvas
    // at the room's pen and the ink pass is asked for nothing on top of it. A quarter of a second
    // line round a drawing that already has one is how the cloth's sleeve came to measure three
    // times the room's pen (reveal-hand.js, round 12).
    const mat = inkMaterial({ color: '#ffffff', map: tex, colorful: true, hatch: 0.3, lineWeight: 0, roughness: 1 });
    mat.alphaTest = 0.5;
    mat.side = THREE_.DoubleSide;
    const mesh = new THREE_.Mesh(geo, mat);
    mesh.name = 'piano-hand-' + side + '-plate';
    mesh.frustumCulled = false;
    group.add(mesh);
    // …parked off the bottom of the frame until something asks for it. A group that is made at the
    // room's origin and shown before its first drawing is a hand in the middle of the parlour floor.
    group.position.set(front + 0.4, keyY - 0.2, keyZ(60));
    (parent ?? ctx.scene).add(group);
    const turn = -s * yaw; // the hand toes outward, the way a forearm coming from the middle leaves it
    hands[side] = {
      side, s, group, mesh, mat, tex, g2,
      yaw: turn,
      off: offsets(side, turn), // where each digit's tip stands from the wrist, in the room
      z: null, // where the wrist stands, along the keyboard
      x: null, // …and how far out over the keys
      out: OUT, // how far through the entrance the drawing is: 0 on the keys, OUT off the frame
      key: '', // the pose the canvas is holding
      tips: REST.map((p) => p.slice()),
      curl: [0, 0, 0, 0, 0],
      bow: [0, 0, 0, 0, 0],
      down: 0, // how many of its fingers are on a key in this drawing
    };
  }

  // WHERE A KEY IS IN THE PLANE THE HAND LIES IN, which is the one piece of arithmetic this file
  // could not do without. The drawing floats 30–43 mm over the keys; from a lens 46° above them,
  // anything at that height appears about 30 mm DEEPER into the keyboard than it stands. Drawn at
  // the key's own place, every fingertip would sit a key and a half short of the note it is
  // sounding. So a key is first carried up the camera's own ray to the height the hand is lying at:
  // put there, the fingertip is over its key ON THE GLASS, which is the only place it can be.
  const _k = new THREE_.Vector3();
  function apparent(m, h) {
    const C = ctx.camera.position;
    const t = (C.y - (keyY + h)) / (C.y - keyY || 1e-4);
    _k.set(touchX(m), keyY, keyZ(m));
    return { x: C.x + (_k.x - C.x) * t, z: C.z + (_k.z - C.z) * t };
  }

  // one drawing for one hand: the fingering, the tips, and the canvas if the pose has changed
  function pose(H, ms, tick) {
    const rng = mulberry32(tick * 977 + (H.side === 'R' ? 13 : 71));
    const playing = ms.length > 0;
    const h = playing ? HAND.press : HAND.rest;
    let targets = null;
    if (playing) {
      const sorted = ms.slice().sort((a, b) => a - b);
      const ap = sorted.map((m) => apparent(m, h));
      const fing = fingering(H.side, ap.map((p) => p.z), H.z ?? ap[0].z, H.off, ap.map((p) => p.x));
      H.z = fing.z;
      // HOW FAR OUT OVER THE KEYS THE WRIST STANDS. Each playing digit would like the wrist at its
      // own key plus its own length; a chord of three whites and a black wants two places 45 mm
      // apart, because a black key is met 45 mm further into the keyboard than a white one. The
      // wrist goes near the DEEPEST of them and the shallower fingers curl, which is what a hand
      // playing B–D–F♯–A does: the finger on the F♯ is out straight between the black keys and the
      // other three are bent onto the front of the whites. Not the mean — at the mean the black-key
      // finger has to grow, and a finger that grows is a drawing nobody believes.
      const want = ap.map((p, i) => p.x + H.off[fing.digits[i]].x);
      const lo = Math.min(...want), hi = Math.max(...want);
      H.x = hi - 0.3 * (hi - lo);
      targets = fing.digits.map((d, i) => ({ d, m: sorted[i], p: ap[i] }));
    } else if (H.z == null) {
      // NOTHING HAS BEEN ASKED OF THIS HAND YET, and it still comes in with the other one: the
      // Gymnopédie gives the left hand four bars alone before the melody enters, and a right hand
      // that waited off the bottom of the frame for four seconds would be a hand nobody saw arrive.
      // So it is parked over the note it is going to play first — the same fingering arithmetic,
      // asked about a note that is not sounding yet.
      const ap = apparent(home[H.side], HAND.rest);
      const f = fingering(H.side, [ap.z], ap.z, H.off);
      H.z = f.z;
      H.x = ap.x + H.off[f.digits[0]].x;
    }
    // the breath: on the twelves, the resting hand lifts and settles a millimetre or two. A hand
    // with a finger down does not — it is planted, and a wrist that wandered while it played would
    // take the fingertip off its key.
    const br = playing ? 0.0008 : 0.0025;
    const y = keyY + h + (rng() - 0.5) * 2 * br;
    const zb = playing ? 0 : (rng() - 0.5) * 0.0025;
    const [ox, oy] = RAMP[H.out];
    H.group.position.set(H.x + ox, y + oy, H.z + zb);
    H.group.rotation.set(0, H.yaw, 0);

    // the tips, in the drawing's own frame. Everything not playing goes back to its rest position;
    // everything playing is sent to its key and clamped to the hand's reach, which is what keeps
    // the drawing inside its own canvas and the hand inside its own anatomy.
    const cos = Math.cos(H.yaw), sin = Math.sin(H.yaw);
    const tips = REST.map((p) => p.slice());
    const curl = [0, 0, 0, 0, 0], bow = [0, 0, 0, 0, 0];
    const on = [];
    H.down = 0;
    for (const t of targets ?? []) {
      const D = DIGITS[t.d];
      // A KEY IS MET WHERE THE FINGER REACHES IT, ALONG THE KEY'S OWN LENGTH. `touchX` says where a
      // key is met when nothing is asking anything of the hand: 100 mm back along a white, 55 along
      // a black. But a white key is 150 mm long and the whole of it sounds the same note, so a
      // finger stretched to the edge of what it can do meets its key NEARER THE PLAYER — which is
      // what a hand spread to a ninth does, and the reason it can play one at all. The slide is the
      // smallest that brings the key inside the digit's reach, and it stops at the key's own front
      // edge (48 mm of white, 28 of black, off props-piano.js's own key boxes: a white key is 150 mm
      // long and is met at 100, a black is 89 and is met at 55).
      const local = (px) => {
        const a = px - H.group.position.x, c = t.p.z - H.group.position.z;
        return [H.s * (a * sin + c * cos), -(a * cos - c * sin)];
      };
      const slack = isBlack(t.m) ? 0.028 : 0.048;
      let px = t.p.x;
      for (let s = 0; s <= slack + 1e-9; s += 0.006) {
        px = t.p.x + Math.min(s, slack);
        const [qx, qy] = local(px);
        if (Math.hypot(qx - D.base[0], qy - D.base[1]) <= D.len + STRETCH) break;
      }
      const [lx, ly] = local(px);
      // …and the key is met by a DIGIT, which can only bend and swing so far (CURLED / STRETCH /
      // SWING, at the head of the file). What the joint cannot give, it does not give.
      const ax = lx - D.base[0], ay = ly - D.base[1];
      const rest = rad(D.ang);
      let th = Math.atan2(ax, ay) - rest; // the swing off where this digit lies, toward the thumb
      th = Math.max(-SWING, Math.min(SWING, ((th + PI) % (2 * PI)) - PI)) + rest;
      const len = Math.max(D.len * CURLED, Math.min(D.len + STRETCH, Math.hypot(ax, ay)));
      tips[t.d] = [D.base[0] + Math.sin(th) * len, D.base[1] + Math.cos(th) * len];
      H.down++;
      // …and where that fingertip ends up in the room, which is the one claim a proof can hold this
      // drawing to: the tip of the finger that is sounding a note has to be ON that note's key.
      const [lx2, ly2] = tips[t.d];
      on.push({
        d: DIGITS[t.d].name,
        m: t.m,
        tip: [
          H.group.position.x - ly2 * cos + H.s * lx2 * sin,
          H.group.position.y,
          H.group.position.z + ly2 * sin + H.s * lx2 * cos,
        ],
      });
    }
    for (let i = 0; i < 5; i++) {
      const D = DIGITS[i];
      const reach = Math.hypot(tips[i][0] - D.base[0], tips[i][1] - D.base[1]);
      curl[i] = Math.max(0, Math.min(1, (D.len - reach) / (D.len * 0.45)));
      // the slack goes out sideways, AWAY from the middle of the hand — a positive bow pushes a
      // finger toward the little one, so the sign is the digit's own side — and a little of it boils
      bow[i] = curl[i] * D.len * 0.10 * (D.base[0] >= 0 ? -1 : 1) + (rng() - 0.5) * 0.0006;
    }
    H.tips = tips;
    H.curl = curl;
    H.bow = bow;
    H.on = on;
    // …and the canvas is only struck again when the drawing on it would be a different drawing:
    // the tips to the millimetre, the curls, and the boil tick. A held chord costs nothing.
    const key = `${tick}|${tips.map((p) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`).join(';')}|${curl.map((c) => c.toFixed(1)).join(',')}`;
    if (key !== H.key) {
      H.key = key;
      drawHand(H.g2, { tips, curl, bow }, tick * 31 + (H.side === 'R' ? 5 : 41));
      H.tex.needsUpdate = true;
    }
    return true;
  }

  let want = { L: [], R: [] };
  let going = false; // the song is on: the hands are wanted in the frame

  const api = {
    hands,
    HAND,
    /** what this hand is sounding in this drawing, as MIDI numbers ([] holds it where it is) */
    play(side, ms) {
      want[side] = ms;
    },
    /** the song started: the hands come in from the bottom of the frame over three drawings */
    // Nothing is made VISIBLE here. The hand is put where it belongs by `step`, on the next drawing
    // of the 12 fps clock, and shown there: switched on a tick early it is drawn for one frame at
    // wherever it was last left, which on the first playing is off the foot of the picture and on
    // the second is the last note of the first.
    enter(now = false) {
      going = true;
      if (now) for (const side of ['L', 'R']) hands[side].out = 0;
    },
    /** …and go back down when it stops. `now` takes them at once — nobody is at the piano to look */
    leave(now = false) {
      going = false;
      if (!now) return;
      for (const side of ['L', 'R']) {
        hands[side].out = OUT;
        hands[side].group.visible = false;
        hands[side].key = '';
      }
    },
    /** ONE DRAWING. The entrance, the pose, the boil — called on every stepped frame, playing or not */
    step() {
      const frame = ctx.clock?.frame ?? 0;
      const tick = Math.floor(frame / 2); // the boil: the pen is re-struck every second drawing
      for (const side of ['L', 'R']) {
        const H = hands[side];
        H.out = Math.max(0, Math.min(OUT, H.out + (going ? -1 : 1)));
        if (!going && H.out >= OUT) {
          H.group.visible = false;
          continue;
        }
        H.group.visible = true;
        pose(H, going ? want[side] : [], tick);
      }
    },
    /** which of his hands are in the picture, and how far in (the proof, and a still) */
    get shown() {
      return hands.L.group.visible || hands.R.group.visible;
    },
    // `on` is which digit is on which note, and where its tip stands in the room — what a proof
    // measures a fingertip against its own key with.
    get state() {
      const one = (H) => ({ shown: H.group.visible, out: H.out, down: H.down, z: H.z, x: H.x, on: H.on ?? [] });
      return { L: one(hands.L), R: one(hands.R), shown: api.shown };
    },
    dispose() {
      for (const side of ['L', 'R']) {
        hands[side].mesh.geometry.dispose();
        hands[side].mat.map?.dispose();
        hands[side].mat.dispose();
        hands[side].group.parent?.remove(hands[side].group);
      }
    },
  };
  return api;
}
