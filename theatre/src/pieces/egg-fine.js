// AN EGG, inside props: THE ROOM CATCHES FIRE AND NOBODY MINDS.
//
// The user: "Hold the pointer on the mushroom lamp beside him for three seconds: small drawn flames
// start along the shelves, he does not react at all, and the placard says nothing. Move the pointer
// and they go out."
//
// ROUND 2, AND IT IS THE PANEL NOW. The user, with the "this is fine" panel in front of him: "the
// flames on this is fine should be much larger. they should also be orange yellow - and pepe should
// say this is fine." Three changes and nothing else:
//
//   THE FLAMES ARE THE PANEL'S. Not small drawn flames along a shelf edge — great tongues as tall
//   as a seated frog and taller, standing on the floor either side of the frame, along the cabinets
//   left and right of him, in the doorway, off the near edge of the table. Twelve, and the two on
//   the floor are 485 px of the home plate's 800.
//
//   THEY ARE YELLOW WITH AN ORANGE TONGUE INSIDE. Until this round the room had one colour, his
//   green, and this file's own comment said a fire in orange would be the second-loudest thing in
//   the film. It is now the second colour, because the user asked for it: PLATE_Y #f2b829 and
//   PLATE_O #e0561d, laid flat under the line and printed a hair out of register the way his skin
//   is (pepe.js; STYLE §1.4, the mustard suit in fd-anim-courtyard-three-figures). The contour is
//   the room's own pen at the room's own width, in ink, never a coloured line.
//
//   AND HE SAYS ONE THING. When the last tongue catches, `props:fine` goes up with `full`, flow.js
//   takes it exactly where it takes the globe's country, and the placard says `This is fine.` —
//   once per burning, and never while a reading is on, when the room burns silently. That is the
//   whole of his reaction: he does not look up, he does not move, the light does not change.
//
// Everything that would normally be the point of a fire is still withheld:
//
//   THE LIGHT DOES NOT CHANGE. Not one lamp is added, moved or brightened. A fire that lit the room
//   would be a fire the room had noticed. The flames are DRAWN — paper cut-outs standing on the
//   floor, on the shelf boards and on the cloth — and drawing is all they are. The colour is
//   pigment on the plate, not light in the room: `noShadow`, no emissive, no practical.
//
//   PEPE DOES NOTHING WHATSOEVER. This file never touches pepe or pepeAnim. It emits one event and
//   the flow decides what to do with it; nothing here reads his state, sets a mood or moves a bone.
//   tools/_egg-fine-proof.mjs pixel-compares his own region across the fire going up and puts the
//   number in the report, and it is nought.
//
//   NOTHING ANNOUNCES IT. No label, no glow, no outline, no tag. The cursor becomes a pointer over
//   the lamp and that is the entire affordance — the radio's manners, the cat's manners, the
//   lever's manners. A visitor who never holds still on the lamp never finds out.
//
// HOW IT IS WORKED. The lamp is a CLICK, like every other switch in this room (it was a hover-and-hold until the user said the hover sucks), and the
// difference is the point: you do not click a lamp into flames, you linger on it until something
// goes wrong. Three seconds of the pointer resting on the mushroom lamp; then one flame every half
// second until a dozen are burning, in the order a fire would actually take the room —
//
//   the lamp's own shade, because that is where the hand was;
//   the shelf boards either side of him, because that is what is nearest and it is full of paper;
//   the cabinets outboard of those, then the curtain and the doorway, which are the room's two
//     openings and the two tallest paper things in it;
//   the floor either side of the table, which is where a fire this size actually stands;
//   and the near edge of the cloth, the last thing between the fire and the lens.
//
// The moment the pointer leaves the lamp — or, on a phone, the moment the finger lifts or slides
// off it — every flame shrinks over half a second to a last wisp and is gone, and the cue stops.
//
// HOW A FLAME IS DRAWN. Two sheets each, and exactly one of them is shown at a time, swapped on
// every 12 fps step: that is the room's own boil doing the flickering, so a flame is alive for the
// same reason a held line is. Each sheet is FOUR MARKS and no more —
//
//   the paper the contour encloses (a tongue in front of a bookcase hides the bookcase);
//   the YELLOW plate over it, and the ORANGE tongue inside that, both shifted by a fraction of a
//     nib: colour under the line, off register, flat, no shading anywhere in it;
//   the contour struck round the lot at the room's nib, in ink;
//   and one stroke along the foot, which is the thing the flame is standing on.
//
// The orange is the dark area the round-1 critic asks of every prop in this room; the yellow body
// is its bare white one. Three hands are cut, not one, each with a second drawing that throws its
// tip the other way and grows its side lick, and the twelve are dealt hands and PHASES off the
// table below, so no two of them lick together.
//
// api (published as props.fine):
//   burning        true while anything is alight (the flag `props:fine` carries)
//   full           the LAST tongue has caught — what flow.js's one line hangs off
//   lit            how many of the twelve are alight just now
//   count          twelve
//   colours        { yellow, orange }: the two plates, for a proof that wants to name them
//   metres         how tall each of the twelve is, for the same reason
//   set(on)        for a still: all of them, or none, with no hold, no cue and nothing to wait for
//   hitBox()       the lamp's box on the glass, in px
//   tapBox()       the box a thumb is actually given (≥ 44 px, grown about the same centre)
//   held           how long the pointer has rested on the lamp, in seconds
//   setState(name) `fine-burning` is the dozen alight; every other name is a room that is fine
//   update(ctx)    called from props.update on the stepped clock
// events:
//   props:fine { burning, n, full }   caught · the last tongue caught (full) · out
import * as THREE from 'three';
import { INK, PAPER, makeCanvas, canvasTexture, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

// ---- the numbers the fire is timed by, AND THEY ARE COUNTED IN DRAWINGS ------------------------
// Three seconds is thirty-six drawings, half a second is six, and it is the drawings that are the
// unit, not the seconds. That is not a convenience for the tools: everything hand-animated in this
// film is a count of drawings on the twelve — an insect's flight is 8 to 14 of them, the lever is
// one, the smoosh is twenty-four — and a beat measured in wall seconds would be the only thing in
// the room that ran on a different clock from the paper. On a machine that holds sixty frames a
// second the two are the same number; on one that does not, the fire takes as long as the rest of
// the drawing does, which is the correct answer and the one a stop-motion camera would give.
const HOLD_F = 36; // drawings of the pointer resting on the lamp before the first flame (3.0 s)
const EVERY_F = 6; // drawings between one flame and the next (0.5 s)
const OUT_F = 6; // drawings to shrink the lot to nothing (0.5 s)
const CRACKLE_EVERY = 4; // drawings between one firing of the cue and the next (see LENGTH.crackle)
const MIN_TAP = 44; // px: what a thumb needs, whatever the lamp measures on the glass

// ---- THE SECOND COLOUR IN THE ROOM ---------------------------------------------------------------
// Until this round there was one: his skin, SKIN #69b964 in pepe.js, with the card faces beside it.
// The user has asked for the fire's, so here are two, and they are chosen to stand with the other
// two and not to shout over them.
//
//   PLATE_Y #f2b829 is a printer's yellow with ochre in it, not a lemon. Against the paper #f8f9f4
//   it is a clear step down in value (74% to 97%), so a tongue reads as a shape and not as a glow;
//   beside his green it is the warm quarter of the wheel and the two never sit on the same object.
//   PLATE_O #e0561d is a red-orange at 47% — the DARK AREA of the drawing. Every prop in this room
//   owes the round-1 critic one solid dark and one bare light; a flame's orange tongue is its dark
//   and its yellow body is its light, which is why there is no ink lobe in a flame any more.
//
// Both are far off the grey axis (saturation 0.79 and 0.76 against the ink pass's 0.42 gate), so
// the pass leaves them exactly as painted and inks only the black contour drawn over them — see
// ink-shaders.js, the `colorful && uColorInk` branch. Neither is emissive and neither is a light.
const PLATE_Y = '#f2b829';
const PLATE_O = '#e0561d';
// how far the colour plate slips under the line, as a fraction of the nib. A hair: about a pen's
// width and a half on the canvas, which is 1.4 screen px wherever a flame stands, since the nib is
// solved to arrive at the room's own width on the glass.
const SLIP = [0.62, -0.42];

// ---- the drawing --------------------------------------------------------------------------------
// THE SHEET IS CUT TO THE FLAME, NOT TO A CONSTANT. Round 1 drew every flame on one 80 px square
// whatever it measured in metres, which was right when the biggest of them was 22 screen pixels.
// The two on the floor are 485 px now — six times the sheet they would have been drawn on — and a
// tongue magnified six times is a blur with a soft yellow edge. So the sheet is sized off what the
// flame actually measures at the home plate, rounded to one of four heights, and the nib is solved
// per sheet to come out at the room's own 2.4 px on the glass. Four buckets is nine or ten canvases
// for the twelve flames and their two drawings each, which is a few milliseconds of pen.
const TIP_V = 0.035, BASE_V = 0.965; // where the foot and the tip sit in the sheet, top-down
const TALL = BASE_V - TIP_V;
const ASPECT = 0.5; // the sheet is twice as tall as it is wide; a slender hand uses 0.7 of the width
const PEN_PX = 2.4; // the room's own contour on the glass (egg-insects.js's measurement)
const SHEET_OVER = 1.35; // canvas px per screen px before rounding: a sheet is drawn a third over size
const CH_STEP = 64, CH_MIN = 128, CH_MAX = 448;
const sheetH = (px) => Math.max(CH_MIN, Math.min(CH_MAX, Math.round((px * SHEET_OVER) / CH_STEP) * CH_STEP));

// a closed wobbly loop through the points, filled and/or stroked: a flame's own silhouette
function loop(g, pts, { width = 0, wobble = 0.5, rng = Math.random, fill = null, dx = 0, dy = 0 }) {
  g.save();
  g.translate(dx, dy);
  g.beginPath();
  const n = pts.length;
  for (let i = 0; i <= n; i++) {
    const [x, y] = pts[i % n];
    const [nx, ny] = pts[(i + 1) % n];
    const mx = (x + nx) / 2 + (rng() - 0.5) * wobble, my = (y + ny) / 2 + (rng() - 0.5) * wobble;
    if (i === 0) g.moveTo(mx, my);
    else g.quadraticCurveTo(x, y, mx, my);
  }
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (width > 0) {
    g.strokeStyle = INK;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
  g.restore();
}

// ---- THE THREE HANDS, WHICH ARE LOBES AND NOT A LIST OF POINTS -------------------------------------
// A tongue this size cannot be a base, a shoulder, a waist and a tip any more: at 485 px those four
// numbers draw a cone, and the first pass of this round was twelve traffic cones standing in a
// parlour. A flame is LOBES — one tall one and one or two shorter ones beside it, each a rounded
// tongue that swells low, pinches at the neck and throws its tip over, and each pair of them joined
// at a NOTCH that cuts most of the way back down to the foot. That is what the eye reads as fire
// and it is the one thing a triangle cannot do.
//
// A lobe is { c: where it stands across the sheet, w: its half-width, h: how high it reaches, l:
// how far its tip is thrown off its own centre }, and `n` is how deep the notches between them cut.
// u runs ±1 across the sheet and v 0 (the foot) to 1 (the tip); a slender hand simply does not use
// the whole width, which is how three drawings of one sheet size come out three different widths.
//
// Pose 1 is the same flame a twelfth of a second later, and the rule for it is round 1's rule for
// the small ones: the tip throws the OTHER way and drops a little, and the side lick grows into the
// space it left. A pair alternating at 6 Hz licks; a pair that only wobbles flickers.
const HANDS = [
  // 0 — three lobes: a small lick, the tall one just left of centre, a middling one on the right
  [
    { n: [0.3, 0.38], lobes: [{ c: -0.62, w: 0.38, h: 0.42, l: -0.08 }, { c: -0.05, w: 0.52, h: 1, l: 0.12 }, { c: 0.62, w: 0.38, h: 0.56, l: 0.1 }] },
    { n: [0.26, 0.44], lobes: [{ c: -0.64, w: 0.36, h: 0.35, l: -0.12 }, { c: -0.08, w: 0.5, h: 0.9, l: 0.26 }, { c: 0.6, w: 0.4, h: 0.68, l: 0.14 }] },
  ],
  // 1 — two lobes, the tall one on the right, and a deep notch between them
  [
    { n: [0.42], lobes: [{ c: -0.44, w: 0.5, h: 0.6, l: -0.14 }, { c: 0.36, w: 0.6, h: 1, l: 0.16 }] },
    { n: [0.5], lobes: [{ c: -0.46, w: 0.48, h: 0.74, l: -0.22 }, { c: 0.34, w: 0.58, h: 0.88, l: 0.02 }] },
  ],
  // 2 — one slender tongue with a small lick low on its right: the narrowest of the three
  [
    { n: [0.22], lobes: [{ c: -0.02, w: 0.72, h: 1, l: -0.14 }, { c: 0.66, w: 0.3, h: 0.33, l: 0.1 }] },
    { n: [0.3], lobes: [{ c: 0, w: 0.7, h: 0.92, l: 0.18 }, { c: 0.64, w: 0.32, h: 0.46, l: 0.04 }] },
  ],
];
// THE TONGUE INSIDE is the same drawing at 0.6 across and 0.55 up, so a three-lobed flame has three
// orange licks in it and not one blob in the middle of three. Nested, never drawn on its own.
const INNER_W = 0.54, INNER_H = 0.58;

// ONE SIDE OF ONE LOBE, as a cubic sampled into points: from an anchor at (x0, v0) up to the tip
// at (xt, vt). `out` throws the low control point OUTBOARD — the swell just above the foot — and
// the high one back INBOARD, past the tip's own line, which is the neck and the hook at the top.
// Those two together are the whole S of a flame's edge, and the reason a flame is not a triangle.
const K = 8; // samples a side. Enough that loop()'s own smoothing keeps the curve and not the chord
function side(pts, x0, v0, xt, vt, out, lean) {
  const dv = vt - v0;
  const p1 = [x0 + out, v0 + dv * 0.3];
  const p2 = [xt - out * 0.3 + lean * 0.85, v0 + dv * 0.76];
  for (let i = 1; i <= K; i++) {
    const t = i / K, m = 1 - t;
    pts.push([
      m * m * m * x0 + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * xt,
      m * m * m * v0 + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * vt,
    ]);
  }
}
const FOOT = 0.78; // a lobe's foot is narrower than its swell: a tongue stands, it does not squat
const SWELL = 0.34; // …and the swell above it, as a fraction of the lobe's half-width
// …and the whole silhouette: out of the foot, up the outside of the first lobe, over its tip, down
// into the NOTCH IT SHARES WITH THE NEXT — one point, walked into and out of, or the two lobes
// overlap and the contour ties itself in a knot on the way past (it did) — up the next, and down to
// the foot on the far side. Scaled by (sx, sy) about the foot, so the orange inside is this same
// drawing and not a second one standing behind it.
function tongue({ lobes, n }, sx = 1, sy = 1) {
  const joint = [];
  for (let i = 0; i < lobes.length - 1; i++) {
    joint.push([((lobes[i].c + lobes[i].w + (lobes[i + 1].c - lobes[i + 1].w)) / 2) * sx, n[i] * sy]);
  }
  const first = [(lobes[0].c - lobes[0].w * FOOT) * sx, 0];
  const last = [(lobes[lobes.length - 1].c + lobes[lobes.length - 1].w * FOOT) * sx, 0];
  const pts = [first];
  for (let i = 0; i < lobes.length; i++) {
    const L = lobes[i];
    const a = i === 0 ? first : joint[i - 1];
    const b = i === lobes.length - 1 ? last : joint[i];
    const tx = (L.c + L.l) * sx, ty = L.h * sy, lean = L.l * sx;
    side(pts, a[0], a[1], tx, ty, -L.w * sx * SWELL, lean);
    const down = [];
    side(down, b[0], b[1], tx, ty, L.w * sx * SWELL, lean);
    down.pop(); // the tip is already in: the right side is walked back down from it
    for (let k = down.length - 1; k >= 0; k--) pts.push(down[k]);
    pts.push(b);
  }
  return pts;
}

// One sheet. `hand` is which of the three, `pose` is 0 or 1, `ch` the canvas height in px and `pen`
// the nib in canvas px (both solved from what the flame measures on the glass — see `buildFine`).
export function drawFlame(hand, pose, ch, pen) {
  const H = HANDS[hand % HANDS.length][pose % 2];
  const cw = Math.round(ch * ASPECT);
  const c = makeCanvas(cw, ch);
  const g = c.getContext('2d');
  const rng = mulberry32(hand * 7717 + pose * 613 + ch * 17 + Math.round(pen * 100) * 31 + 5);
  const cx = cw / 2;
  const by = BASE_V * ch, ty = TIP_V * ch;
  const hw = cw * 0.5 - pen * 0.7; // the widest the drawing goes, with the nib kept inside the sheet
  const up = by - ty;
  const at = ([u, v]) => [cx + u * hw, by - v * up];
  const pts = tongue(H).map(at);
  const wob = Math.max(0.4, pen * 0.3);

  // 1. THE PAPER INSIDE THE CONTOUR. A tongue standing in front of a bookcase hides the bookcase,
  // and it is what shows on the side the colour plate falls short of.
  loop(g, pts, { width: 0, wobble: wob, rng, fill: PAPER });

  // 2. THE COLOUR, OFF REGISTER. Both plates move together and by the same hair — a press slips
  // once, not twice — so the orange keeps its place inside the yellow and the pair together sit a
  // little up and to the right of the line drawn over them.
  const dx = pen * SLIP[0], dy = pen * SLIP[1];
  loop(g, pts, { width: 0, wobble: wob, rng, fill: PLATE_Y, dx, dy });
  const inner = tongue(H, INNER_W, INNER_H).map(at);
  loop(g, inner, { width: 0, wobble: wob * 0.8, rng, fill: PLATE_O, dx, dy });

  // 3. THE CONTOUR, in the room's pen and at the room's width, drawn over the lot and never
  // coloured. This is the mark the ink pass re-states at its own nib (ink-shaders.js): it is
  // achromatic and it stands clear of its field, which is the two things that branch asks for.
  loop(g, pts, { width: pen, wobble: wob, rng });

  // 4. and the foot: one stroke along the bottom, which is what the flame is standing on. It is the
  // mark that stops a cut-out floating a pixel above its board.
  // The foot is where the drawing itself comes down to v = 0, not the width of the sheet: a
  // slender hand stands on a slender foot.
  const l0 = H.lobes[0], ln = H.lobes[H.lobes.length - 1];
  const fx0 = at([l0.c - l0.w, 0])[0], fx1 = at([ln.c + ln.w, 0])[0];
  inkLine(g, fx0 + pen * 0.4, by, fx1 - pen * 0.4, by, { width: pen * 0.8, wobble: pen * 0.2, rng, segments: 4 });
  return c;
}

// ---- where the twelve stand -----------------------------------------------------------------------
// THE ORDER IS THE FIRE'S OWN, and it starts under the hand. `at` says which frame the position is
// in ('lamp' is an offset from the lamp's own origin, so those follow it; the rest are room
// coordinates), `h` how tall the tongue is IN METRES, `ppm` how many pixels a metre measures at
// that depth on the home plate (measured off the plate itself; the sheet and the nib are solved
// off it and nothing else, and tools/_egg-fine-proof.mjs prints the same table back), and `hand`/`phase` which of the three drawings it was dealt and
// which of the two it starts on.
//
// THE SIZES ARE THE PANEL'S, and they are the round's whole point. A seated frog is 1.37 m of this
// room; the two on the floor are 1.95 and stand a head above him, the doorway's is 1.7, the
// curtain's 1.15. Nothing here is a shelf ornament any more: the smallest of the twelve is the one
// on the lampshade at 0.30 m, and even that is 60 px of the home plate.
//
// WHAT THEY MAY NOT DO. Not one of them comes near his face. He measures px 535–745 across and
// 307–623 down on the home plate and his HEAD is about 590–700; the two floor tongues measure 242 px
// across and stop at 548 and start again at 736, so there is 42 px of clear paper between the
// nearest tongue and his head on either side and nothing at all over it. They stand in FRONT of the
// furniture and BEHIND the table (the cloth's rim is at z 0.62 and the floor pair at z −0.55, so
// the table crops their feet, which is what a table does); the one on the cloth is the only thing
// in the room downstage of it. The placard is DOM and is over all of it whatever happens.
const SEATS = [
  // THE LAMP'S OWN SHADE — an offset from the lamp's origin, standing on the dome's CROWN (a
  // hemisphere of r 0.115 about y 0.19) and not on its face, so the shade's arc comes out unbroken
  // and the fire sits on it. Round 1 stood three here and they erased a 43 x 23 px lamp; one tongue
  // twice the height of the shade is the same joke with the lamp still in the drawing, and it is
  // the one the hand is actually resting on.
  { at: 'lamp', p: [-0.01, 0.3046, 0.0], h: 0.3, ppm: 187, hand: 1, phase: 0 },
  // THE SHELF BOARDS, left and right and left and right: a fire crosses a room, it does not finish
  // one bookcase before it starts the other. The top boards run -1.035 to -0.665 and 0.665 to
  // 1.035; the globe's own box on the left one is -0.972 to -0.745 and the cat's on the right is
  // 0.762 to 0.970 (read off the objects with tools/_egg-fine-where.mjs), so the inboard tongue
  // stands between each of them and Pepe and the outboard one past it, and neither is planted in a
  // sleeping cat.
  { at: 'room', p: [-0.7, 1.02, -2.17], h: 0.52, ppm: 187, hand: 2, phase: 1 },
  { at: 'room', p: [0.72, 1.02, -2.17], h: 0.52, ppm: 187, hand: 0, phase: 0 },
  { at: 'room', p: [-1.02, 1.02, -2.17], h: 0.62, ppm: 187, hand: 0, phase: 1 },
  { at: 'room', p: [1.02, 1.02, -2.17], h: 0.62, ppm: 187, hand: 1, phase: 0 },
  // THE TWO CABINETS OUTBOARD OF THEM. The bar cart on the window side (props.js: 0.96 x 0.42,
  // top 0.8, at the window's own centre x -1.5, z WALL + 0.48, so it runs -1.98 to -1.02) and the
  // PTT's spares press on the door side (0.54 wide, 1.5 tall, at x W/2 - 0.31 = 2.29, running 2.02
  // to 2.56). The cart's tongue stands at its far left end, well clear of the radio at cart-local
  // x 0.25; the press's stands on its top board inboard of the jar the insects use, which is at
  // unit-local 0.13. Both are set as far out as their furniture goes, because those two thirds of
  // the home plate are the only ones the floor pair does not already fill.
  { at: 'room', p: [-1.9, 0.8, -2.02], h: 1.0, ppm: 191, hand: 2, phase: 0 },
  { at: 'room', p: [2.32, 1.5, -2.34], h: 0.9, ppm: 184, hand: 1, phase: 1 },
  // THE ROOM'S TWO OPENINGS, which are the two tallest paper things in it. The curtain inside the
  // window architrave (x -1.95 to -1.05, sill 1.04) stands above the cart, which is the only reason
  // it can be seen at all; the doorway's is the whole height of a person and stands in the opening
  // (x 1.05 to 1.95), set to the far side of it so the floor tongue in front does not swallow it.
  { at: 'room', p: [-1.58, 1.04, -2.44], h: 1.15, ppm: 186, hand: 0, phase: 1 },
  { at: 'room', p: [1.72, 0.0, -2.42], h: 1.7, ppm: 183, hand: 2, phase: 0 },
  // THE FLOOR, EITHER SIDE OF THE TABLE, and these are the panel. 1.95 m of tongue standing on the
  // rug at z -0.55, which is 485 px of the home plate's 800 and reaches to y 160 — a head above him
  // and a third of the frame above the table.
  //
  // WHY NOT FURTHER OUT, WHICH IS WHAT "EITHER SIDE OF THE FRAME" WOULD MEAN ON A LAPTOP. The two
  // frames this film is judged in do not agree about where the sides are. At this depth 1280x800
  // holds 5.5 m of room and 390x844 holds 1.47, so a tongue at the laptop's own edge (x ±2.4) is
  // three metres outside the phone's picture and a tongue at the phone's edge (±0.74) stands over
  // his shoulder on the laptop. These two are put at the PHONE's edges, where they are cut in half
  // by the frame and read as a fire bigger than the picture; on the laptop they flank the table
  // instead, and the cart, the press and the doorway carry the outer thirds. A fire that fits
  // reads as a candle, and that is the frame that had to be chosen for.
  { at: 'room', p: [-0.92, 0.0, -0.55], h: 1.95, ppm: 231, hand: 1, phase: 0 },
  { at: 'room', p: [0.94, 0.0, -0.55], h: 1.95, ppm: 231, hand: 0, phase: 1 },
  // and the cloth's near edge, the last thing between the fire and the lens. Set left of the axis:
  // the deck stands at layout `deck.pos` [0, 0.7625, 0.44] and a tongue drawn on top of the cards
  // would be two drawings in one place, and dead centre it would stand under his chin.
  { at: 'table', p: [-0.4, 0.762, 0.57], h: 0.5, ppm: 267, hand: 2, phase: 1 },
];

// The lamp's own box, in its own frame, off props-objects.js `mushroomLamp`: a lathed base under a
// hemisphere of radius 0.115 whose centre is at y 0.19, so the whole fitting is 0.23 across and
// 0.305 tall. Read, never written: if that lamp is ever redrawn these move with it.
const LAMP = { r: 0.115, top: 0.305 };

export function buildFine(ctx, { group, switches, lamp }) {
  const root = new THREE.Group();
  root.name = 'fine';
  root.userData.noShadow = true; // a drawn flame throws nothing: the light does not change

  // ONE PEN FOR THE WHOLE ROOM, WHICH IS A DIFFERENT NIB ON EVERY SHEET. A sheet is cut to the size
  // its flame comes out at on the glass, so the canvas is 1.35 screen pixels to the pixel wherever
  // the flame stands and the nib is the same 2.4 screen px everywhere — the room's own contour.
  // Both fall out of one number, the flame's projected height, and that is the only reason a 56 px
  // tongue on the lampshade and a 485 px one on the floor are drawn by the same hand.
  const geo = new THREE.PlaneGeometry(1, 1);
  const cache = new Map();
  const sheetMat = (hand, pose, ch, nib) => {
    const key = `${hand}-${pose}-${ch}-${nib.toFixed(1)}`;
    let m = cache.get(key);
    if (m) return m;
    // pepe.js's three numbers, for pepe.js's three reasons: `colorful` so the ink pass shows the
    // drawing verbatim — which is what keeps the yellow and the orange pigment and not paper — and
    // re-states its achromatic marks at the room's nib; `lineWeight` 0 so the pass draws no second
    // contour round a card; `hatch` 0.02 so a flat sheet facing the visitor takes no wash. A flame
    // is a coloured cut-out exactly as he is.
    m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
    m.userData.ink = { hatch: 0.02, lineWeight: 0, colorful: true };
    m.alphaTest = 0.5;
    m.transparent = false;
    m.name = `flame-${key}`;
    const tex = canvasTexture(drawFlame(hand, pose, ch, +nib.toFixed(1)));
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
    m.map = tex;
    cache.set(key, m);
    return m;
  };

  // WHERE THE LAMP IS. props.js stands it on the operator's position and never turns it, so its
  // own frame and the room's are the same frame; if it is not in the set at all (a stripped room)
  // the fire falls back to where that position has always been and nothing throws.
  lamp?.updateWorldMatrix(true, true);
  const lampAt = lamp ? lamp.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(-0.44, 0.82, -2.25);

  const flames = SEATS.map((s, i) => {
    const g = new THREE.Group();
    g.name = `flame-${i}`;
    const px = s.h * s.ppm; // what the tongue measures on the home plate
    const ch = sheetH(px);
    const nib = (PEN_PX * ch * TALL) / px; // …so the contour comes out at the room's own width
    const sheets = [0, 1].map((pose) => {
      const m = new THREE.Mesh(geo, sheetMat(s.hand, pose, ch, nib));
      m.castShadow = false;
      m.receiveShadow = false;
      m.visible = false;
      g.add(m);
      return m;
    });
    const foot = s.at === 'lamp' ? new THREE.Vector3(...s.p).add(lampAt) : new THREE.Vector3(...s.p);
    const sheet = s.h / TALL; // the sheet is taller than the flame: see BASE_V / TIP_V
    g.position.copy(foot);
    g.visible = false;
    root.add(g);
    return { i, group: g, sheets, foot, sheet, phase: s.phase, at: s.at, lit: false, from: 0 };
  });
  group.add(root);

  // ---- the fire ---------------------------------------------------------------------------------
  let want = false; // the pointer is resting on the lamp (or a finger is down on it)
  let hovering = false, pressing = false;
  let drawn = 0; // drawings this piece has been given, ever: what the flicker and the wisps run on
  let steps = 0; // …and how many of them the pointer has rested on the lamp for. Zero when it has not.
  let lit = 0; // how many are alight
  let outFrom = -1; // the drawing they started going out on, -1 while nothing is going out
  let burning = false;
  let full = false; // the LAST tongue has caught: the one thing he is told about (see `say`)
  let crackleAt = -99;
  // LIT BY HAND, WHICH IS NOT THE SAME AS BURNING. `set(true)` is for a still — the `fine-burning`
  // judging state, a tool's control frame — and a still has to HOLD. Without this latch the very
  // next drawing sees that no pointer is on the lamp, starts the going-out and has the frame bare
  // six drawings later, which is exactly what ?view=props&state=fine-burning did until it was
  // caught. A real pointer arriving takes the fire off the hand and puts it back on the hold.
  let byHand = false;

  const setSize = (f, u) => {
    // scaled about its FOOT, not its middle: a flame shrinking to a wisp keeps standing on the
    // board it is standing on. The sheet is a tall rectangle now, not a square, so x carries the
    // drawing's own aspect.
    f.group.scale.set(f.sheet * u * ASPECT, f.sheet * u, 1);
    f.group.position.set(f.foot.x, f.foot.y + f.sheet * u * (BASE_V - 0.5), f.foot.z);
  };
  const show = (f, which) => {
    for (let s = 0; s < f.sheets.length; s++) f.sheets[s].visible = s === which;
  };
  const douse = () => {
    for (const f of flames) {
      f.lit = false;
      f.group.visible = false;
    }
    lit = 0;
    outFrom = -1;
    full = false;
  };
  // WHAT GOES ON THE BUS, AND IT IS THREE THINGS AND NOT TWO. It caught; the LAST tongue caught;
  // it went out. The middle one is the round's addition and it is the only one anybody acts on:
  // flow.js takes `full` where it takes the globe's country and puts `This is fine.` on the
  // placard. It is fired once per burning — a pointer that leaves at eleven and comes back does not
  // fire it again, because the fire never went out and `full` is only cleared by `douse` — and the
  // fire itself does not care whether anybody is listening.
  function say(next) {
    if (next === burning) return;
    burning = next;
    ctx.emit?.('props:fine', { burning, n: lit, full: false });
  }
  // where the fire is on the glass, as a pan: the shelf on the right of the room crackles on the
  // right. Taken off the flames that are actually alight, so it walks across as the fire spreads.
  function pan() {
    const W = ctx.size?.w || window.innerWidth;
    if (!W) return 0;
    const v = new THREE.Vector3();
    let sum = 0, n = 0;
    for (const f of flames) {
      if (!f.lit) continue;
      v.copy(f.foot).project(ctx.camera);
      sum += v.x;
      n++;
    }
    return n ? Math.max(-1, Math.min(1, sum / n)) : 0;
  }

  // ---- the lamp on the glass ---------------------------------------------------------------------
  function hitBox() {
    if (!lamp) return null;
    lamp.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const x of [-LAMP.r, LAMP.r]) for (const y of [0, LAMP.top]) for (const z of [-LAMP.r, LAMP.r]) {
      v.set(x, y, z);
      lamp.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to a thumb's 44 px. The lamp stands at the far end of the operator's
  // position with the doily under it and bare plaster over it, and the nearest other switch (the
  // globe on the left bookcase) is 0.4 m away, so the margin costs nothing.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  const inside = (px, py) => {
    const b = tapBox();
    return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  };
  // A CLICK ON THE LAMP, like every other switch in the room (round 2 of this egg; the user: "the
  // hover sucks, lets make it a click on the lamp — if the user clicks on the lamp, the fire
  // starts"). One click and the first tongue catches on the next drawing, the rest one every half
  // second; a second click puts them out. The old three-second hold is kept as the number the
  // catching counts from, so nothing else here had to move.
  const toggle = () => {
    want = !want;
    byHand = false; // a hand on the glass takes the fire off a tool and puts it back on the clock
    steps = want ? HOLD_F : 0; // no hold: the first tongue is on the next drawing
    hovering = pressing = want;
  };
  switches?.add?.({
    name: 'fine',
    object: () => lamp,
    tapBox,
    // the arbiter has already stopped the event reaching flow.js (which would read it as the
    // visitor skipping Pepe's line) and opened the audio context by hand, which is the only reason
    // a phone hears the crackle at all
    onDown: () => toggle(),
  });

  const api = {
    count: flames.length,
    get burning() {
      return burning;
    },
    get lit() {
      return lit;
    },
    // the last tongue has caught. What flow.js's line hangs off, and what a tool asks instead of
    // counting flames itself.
    get full() {
      return full;
    },
    // how long the pointer has rested on the lamp — in drawings, and in the seconds those drawings
    // are worth at 12 fps. What a tool needs to say the hold is three seconds and not two or four.
    get steps() {
      return want ? steps : 0;
    },
    get held() {
      return (want ? steps : 0) / (ctx.clock.fps || 12);
    },
    // the drawing this piece is on, ever: a tool releasing one at a time counts with this
    get drawn() {
      return drawn;
    },
    // the two plates, for a proof that wants to say what colour it is looking at
    colours: { yellow: PLATE_Y, orange: PLATE_O },
    // where each of the twelve stands, for the tools
    seats: flames.map((f) => f.foot.toArray().map((n) => +n.toFixed(3))),
    where: flames.map((f, i) => SEATS[i].at),
    metres: SEATS.map((s) => s.h),
    hitBox,
    tapBox,
    // a flame's own box on the glass, so a proof can look at one at 2x instead of hunting for it
    flameBox(i) {
      const f = flames[i];
      if (!f || !f.lit) return null;
      f.group.updateMatrixWorld(true);
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      const xs = [], ys = [];
      const v = new THREE.Vector3();
      for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) {
        v.set(x, y, 0);
        f.group.localToWorld(v).project(ctx.camera);
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    },
    // for the tools and for setState: the whole dozen, or none of them, with no hold and no cue.
    // It says nothing on the bus either — a still is not an event, and the line on the placard
    // belongs to a visitor who held the lamp, not to a screenshot.
    set(on = true) {
      hovering = pressing = want = false;
      steps = 0;
      outFrom = -1;
      crackleAt = -99;
      byHand = !!on;
      if (on) {
        lit = flames.length;
        for (const f of flames) {
          f.lit = true;
          f.from = -1e9; // lit long ago: no catching beat in a still
          f.group.visible = true;
          setSize(f, 1);
          show(f, (ctx.clock.frame + f.phase) % 2);
        }
      } else douse();
      burning = !!on;
      full = !!on;
    },
    // `fine-burning` is the dozen alight for a still; every other name is a room that is fine
    setState(name = 'default') {
      api.set(name === 'fine-burning');
    },
    // Called from props.update, which only calls anything on a stepped frame — so the flicker, the
    // catching, the going out and the crackle are all on the same 12 fps grid as the pendulum.
    update() {
      drawn++;
      if (want) {
        // came back before the last wisp had gone: it simply catches again where it was
        outFrom = -1;
        steps++;
        const n = steps < HOLD_F ? 0 : Math.min(flames.length, 1 + Math.floor((steps - HOLD_F) / EVERY_F));
        for (let i = lit; i < n; i++) {
          flames[i].lit = true;
          flames[i].from = drawn;
          flames[i].group.visible = true;
        }
        if (n > lit) lit = n;
        if (lit > 0) say(true);
        // …and the one drawing anybody else in the building is told about: the last tongue has
        // caught, the room is entirely alight, and somebody may now have something to say.
        if (lit >= flames.length && !full) {
          full = true;
          ctx.emit?.('props:fine', { burning: true, n: lit, full: true });
        }
      } else if (!byHand) {
        steps = 0;
        if (lit > 0) {
          if (outFrom < 0) outFrom = drawn;
          // …and gone on the sixth. Five drawings of wisp and a bare frame is half a second, and it
          // is counted so that the FIRST drawing after the pointer left is already smaller: a frame
          // that shows exactly what the last one showed is a frame in which nothing happened, and
          // the visitor has just taken their hand away and is looking for something to happen.
          if (drawn - outFrom >= OUT_F - 1) {
            douse();
            say(false);
            return;
          }
        }
      }
      if (!lit) return;
      // the going-out, as a row of drawings and not a tween: the sheet is a size, held for a
      // twelfth of a second, and the last one is a wisp
      const u = outFrom < 0 ? 1 : Math.max(0, 1 - (drawn - outFrom + 1) / OUT_F);
      for (const fl of flames) {
        if (!fl.lit) continue;
        // A FLAME CATCHES BEFORE IT BURNS. Its first drawing is two thirds the size, held one step,
        // then it is up. One drawing, not a ramp: a thing that grows smoothly is the only
        // continuous thing in the film and this is not going to be it.
        const caught = drawn - fl.from === 0 ? 0.64 : 1;
        setSize(fl, u * caught);
        // THE FLICKER IS ON THE ROOM'S OWN CLOCK, not on this piece's count of drawings, and the
        // difference matters in exactly one place: a frozen frame. `?t=2.5` holds clock.frame still
        // and calls every piece's update on every tick, so a private counter would flip the sheet
        // sixty times a second in a still that is supposed to be one drawing. On the room's frame
        // the boil, the pendulum and the fire are the same drawing, held, which is the point.
        show(fl, (ctx.clock.frame + fl.phase) % 2);
      }
      // THE CRACKLE, and it runs while anything is alight and not a drawing longer. Every fourth
      // drawing, which is one firing every third of a second against a cue that is audible for a
      // little over that — the buzz's own arithmetic (sound-voices.js, LENGTH.crackle). It grows
      // with the fire because twelve of them are more than one, and it stops on the frame the last
      // wisp goes, because that is when there is nothing burning.
      if (!byHand && outFrom < 0 && drawn - crackleAt >= CRACKLE_EVERY) {
        crackleAt = drawn;
        ctx.pieces.sound?.play?.('crackle', { gain: 0.55 + (0.45 * lit) / flames.length, pan: pan() });
      }
    },
  };
  return api;
}
