// WHAT IS UNDER THE PARLOUR: A HATCH IN THE BOARDS, A STAIR, AND A RED LIGHT COMING UP IT.
//
// The user, on the cross over the door: "I'm not really happy with the animation of the door. When
// we click the cross over the door, going outside and choosing this meme, I don't think that's
// really fun. What would be more interesting: if you hit the cross, it falls down at the top, turns
// around, and switches into a Satanist's cross, and a floorboard opens and you see this kind of red
// stairway down into a basement."
//
// So the cross's own click no longer lets the weather in. It lets go at the top, hangs itself upside
// down (egg-cross.js), and a beat later THIS happens: three boards in front of the visitor come up
// on a hinge and there is a stair going down into a red light. The storm, the lightning, the
// thunder, the walk out through the door and the two roads are all gone from that click; the door
// itself is not, because the visitor can still walk over and open it by hand in the afternoon
// (walk.js, and egg-cross.js's `day` phases), and the crossroads is still what is behind it.
//
// ------------------------------------------------------------------------------------------------
// WHERE THE HATCH IS, AND IT IS A MEASUREMENT AND NOT A TASTE.
//
// Three things had to hold at once and only one rectangle in this room holds all three: the
// visitor's half, OFF THE RUG (you cannot saw a trapdoor through a carpet), and cut WHERE THE BOARDS
// ALREADY RUN. The rug is 3.2 m across and reaches z 1.66, its fringe-comb 90 mm past that (props.js,
// props-objects.js); the boards run along x and their seams stack in z, ten to the 2.6 m tile
// (room-textures.js, floorTexture). So the hatch is the three boards downstage of the fringe:
//
//   z 1.9128 .. 2.6000    three whole boards — 251, 229 and 207 mm — between two real seams
//   x -0.45 .. +0.45      900 mm, two saw cuts across the boards
//
// The seams are not typed in: SEAMS below runs floorTexture's own widths loop, so if that floor is
// ever re-laid these two numbers move with it.
//
// AND THE HINGE IS ON A JOIST, which decides which edge it is. Joists run across the boards; the
// boards run along x; so the joists run along z and the hinge is the CONSTANT-X cut at x -0.45. The
// lid therefore falls to stage left, onto the bare boards at x -1.35 .. -0.45, and never lies
// between the lens and the hole.
//
// ------------------------------------------------------------------------------------------------
// THE ROOM LEANS IN, AND THIS IS THE ONE THING THE BRIEF DID NOT ASK FOR.
//
// It was asked for a hatch "inside a 390x844 phone's frame". Measured on the live page, at both
// plates: at 1280x800 the `home` frame's bottom edge crosses the floor at z 1.6 and `wide` at 1.9;
// at 390x844 `home` crosses at 1.83 and the frame is only x +/-0.44 wide down there. The rug's
// fringe ends at 1.75. So the whole of the bare board a hatch could be cut in, on a phone, is a
// strip 80 mm deep in the last fifteen pixels of the frame. There is no rectangle that is off the
// rug, in the visitor's half, and in a phone's frame, and there never was.
//
// So the LENS moves instead, which is also the only way the brief's own "a camera looking down sees
// depth" can be true of anything. When the lid goes over, the room leans forward and looks down at
// the hole — `cellar`, a shot of this piece's own — and it sits back up when the hatch shuts.
//
// AND IT LEANS STEEPER THAN THE FLIGHT FALLS, WHICH IS THE ONE NUMBER DOWN HERE THE PICTURE DECIDED
// AND IT TOOK THREE WRONG ANSWERS TO FIND. A cellar stair is 190 mm risers on 230 mm goings, which
// is 39.6 degrees, and this one is. A lens SHALLOWER than that sees no stair at all: every tread is
// hidden behind the riser in front of it, and the ray grazing the foot of one riser meets the next
// 133 mm down its own 190, so the top seven tenths of every riser after the first goes too — at 30
// degrees, six honest steps came out as a ribbed red RAMP with the steps gone. Laying the FLIGHT
// shallower instead (155 on 300, 27.3 degrees) put the treads back and foreshortened the whole
// staircase into a band across the top eighth of the opening, with the rest of the hole looking
// under it. So the lens goes steeper than the stair rather than the stair shallower than the lens:
// 44 degrees, which clears 39.6 by four and a half and puts three treads and four risers on the
// glass before the floor's own far edge cuts the flight off — which is the turning out of sight the
// brief asked for, had for nothing. The eye is 1.82 m up and 1.88 m downstage of the middle of the
// hole, which is a person getting up out of that chair to look into it. The shot is INJECTED into camera.js's own table on every drawing it is missing
// from, which is egg-cross.js's arrangement with lighting.js's states and for the same reason:
// camera.js empties and refills `shots` whenever the window changes shape.
//
// ------------------------------------------------------------------------------------------------
// THE HOLE IN THE FLOOR IS A REAL HOLE.
//
// room.js lays the floor as one plane (`P.plane(W, D + overrun, …, M.floor)`) and room-build.js
// merges it into a single mesh, `room:floor` — and M.floor is used at exactly one call site, so that
// buffer is the floor and nothing else. It is 52 x 64 quads at 100 x 143.75 mm, warped by up to
// 22 mm after the merge. The hole is cut by dropping triangles OUT OF THE INDEX — every triangle all
// three of whose corners lie inside the cut rectangle, with 30 mm of slack for the warp, which is
// safe because the next grid line out is 100 mm away and 100 - 30 - 22 is still 48. Positions,
// normals and UVs are untouched, the original index is kept, and shutting the hatch puts it back.
// Nothing else in the room owns that mesh and nothing else looks it up by name.
//
// The cut is on the floor's OWN GRID (x -0.5..0.5, z 1.8125..2.675) and is therefore bigger than the
// hatch by 50 mm at the sides and 100 and 75 mm at the ends. That gap is closed by the MOUTH sheet,
// which is the boards drawn again over the top of them with the opening punched out of its middle —
// so the cut edge the visitor sees is the seam, to the millimetre, and not the mesh's own grid.
//
// ------------------------------------------------------------------------------------------------
// THE RED, AND IT IS ONE RED.
//
//   CELLAR_R  #b4241d
//
// Hue 3 degrees, lightness 41%, saturation (max-min of the sRGB channels) 0.59. Three numbers and
// each of them is doing a job. The SATURATION is against the ink pass's own gate: ink-shaders.js
// ramps `achromatic` over 0.20..0.42 and above 0.42 refuses to re-state a fragment as a black mark,
// so 0.59 survives the pass exactly as painted, which is how the fire's #f2b829 and #e0561d survive
// it (egg-fine.js). The HUE is against the fire: #e0561d is at 17 degrees and 50% and the two would
// be the same colour at a glance; at 3 degrees and 41% this is a red and that is an orange, and a
// frame with both in it reads them apart. The LIGHTNESS is against the paper, #f8f9f4 at 97%: a red
// at 41% is a hole in the sheet and not a stain on it.
//
// It is carried by MATERIALS and never by a light, because a coloured light cannot show here: the
// ink pass renders the lit buffer through a white override material and then takes its LUMINANCE
// (ink-shaders.js, `litL`), so hue is thrown away before the composite ever sees it. Every red
// surface below carries `{ hatch: 0.02, lineWeight: 0, colorful: true }` — egg-fine.js's three
// numbers, for egg-fine.js's reasons: no wash, no lit tone, no second contour, pigment verbatim.
//
// And it is on THREE things and nothing else: the light up the well (its walls, its risers and the
// nose of every tread), the glow on the UNDERSIDE of the open lid, and the spill on the NEAR BOARDS
// round the mouth. The proof looks for it by the test that keeps both of its tones and throws away
// every other colour in the room — red is the largest channel, saturation at or over 0.55, and green
// and blue within a quarter of the spread of each other — and finds none of it anywhere in the
// parlour: not on the rug, not on the walls, and not on him.
//
// EVERYTHING HERE BOILS, on egg-fine.js's arrangement and not on a canvas redrawn per drawing: every
// sheet is struck TWICE from two seeds at build time and one of the two is shown on each 12 fps
// step. A fire of twelve flames does it that way because a canvas re-cut twelve times a second is a
// canvas re-cut twelve times a second; a cellar of thirty sheets has the same arithmetic.
//
// ------------------------------------------------------------------------------------------------
// FOR LATER: THE ROOM DOWN THERE. Not built, and deliberately not started. What is left for it:
//   props.cross.open   the room's own answer to "is the hatch open"
//   api.bottom         [x, y, z] of the landing at the foot of the flight, in world metres
//   api.turn           the direction the flight goes when it turns off the landing
// and the comment marked THE WAY DOWN, at the foot of the stair below, is where a walk into the
// cellar would begin.
import * as THREE from 'three';
import { INK, PAPER, makeCanvas, canvasTexture, inkLine, hatch as hatchRect } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { poly, loop, frame } from './egg-cross-draw.js';

// ---- THE ONE RED ---------------------------------------------------------------------------------
export const CELLAR_R = '#b4241d';
// …and ONE mix of it against the paper, for the parts of the drawing the light only just reaches. It
// is not a second colour: it is this one laid thin, and it is written out as a flat plate rather
// than made with globalAlpha so that what the ink pass is handed is a known saturation.
//
// AND THERE ARE TWO OF THEM AND NOT THREE, WHICH IS A THING HIS MOUTH DECIDED. The first cut had a
// third and palest tone for the last of the spill on the boards, at 0.42 of the red over the paper.
// Measured, that is saturation 0.30 — and his lips (pepe.js, LIPS #d37a6c) measure 0.49. There is no
// saturation gate that keeps a pale wash of this red and throws away a frog's mouth, which means no
// proof could ever say "the red is here and nowhere else" and be checking anything. So the palest
// reach is done by AREA instead: the band simply STOPS, on bare paper, which is what the fire's own
// flames do (egg-fine.js: a contour, two plates, and paper). Weight is spacing, not opacity.
const RED_MID = '#c14f48'; // CELLAR_R at 0.80 over the paper: saturation 0.63, hue 3.3 degrees

// ---- …AND THE HEAT UNDER IT: THE ONE RED WITH A HOT END AND A COLD END ---------------------------
// The owner, looking down the open hatch: "If anything we should rework the red glow here. I think
// this could be more beautiful and more menacing. After all, we're insinuating that the devil lives
// down there." What was there was a diagram of a light: one flat mid red, evenly spaced strokes, a
// round halo, and nothing moving. A fire below is not one red. It is HOT where it comes out — a
// vermilion at the lip and down the well — and it goes to BLOOD where it gives out on the boards,
// and in the deepest part of the well it is blood crossed with the pen, which is the nearest this
// drawing comes to black that is still red.
//
//   HOT     #d92a17   hue 6 degrees, 47%: the source. Still a red and not the fire's orange (17 deg).
//   CELLAR_R#b4241d   the one red, now the middle of the ramp.
//   BLOOD   #84121a   hue 356, 30%: the cold end. Its sRGB spread is 0.45, over ink-shaders.js's
//                     0.42 gate, so the pass keeps it as colour and never re-states it as a black mark.
//
// All three pass the proof's own red test (red the largest channel, saturation over 0.55, green
// and blue level) and none of them is his mouth, the fire, or the paper. Which of the three a mark
// is decided by how far it is from the hole, never by chance per drawing — a colour that changed
// on every boil would be a twinkle and not a light. And the FALLOFF is still spacing and length,
// not alpha: every mark here is laid at full strength, and the light thins out because the marks do.
export const HOT = '#d92a17';
export const BLOOD = '#84121a';
const RAMP = [HOT, CELLAR_R, BLOOD];
const heatOf = (k) => RAMP[Math.max(0, Math.min(2, Math.floor(k * 3)))];

// A PEN STROKE WITH A HAND IN IT: a gentle bend, round caps, and a nib that lifts toward the end,
// struck in three runs that share their joints so it is one line. `broke` leaves the middle run out,
// which is a pen skipping on a board and the only way a hatch of these stops reading as ruled.
function lick(g, x0, y0, x1, y1, { w, color, rng, bend = 0, taper = 0.45, broke = false, wobble = 0.35 }) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const cx = (x0 + x1) / 2 + nx * bend * len, cy = (y0 + y1) / 2 + ny * bend * len;
  const at = (t) => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
  g.save();
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const steps = Math.max(2, Math.min(6, Math.round(len / (w * 6))));
  for (let p = 0; p < 3; p++) {
    if (broke && p === 1) continue;
    const t0 = p / 3, t1 = (p + 1) / 3;
    g.beginPath();
    for (let s = 0; s <= steps; s++) {
      const [x, y] = at(t0 + ((t1 - t0) * s) / steps);
      const j = s === 0 || s === steps ? 0 : (rng() - 0.5) * 2 * w * wobble;
      if (s === 0) g.moveTo(x + nx * j, y + ny * j);
      else g.lineTo(x + nx * j, y + ny * j);
    }
    g.lineWidth = w * (1 - (taper * p) / 2) * (0.9 + rng() * 0.2);
    g.stroke();
  }
  g.restore();
}
// a nail head, and the light catching the side of it that faces the hole
function nail(g, x, y, r, { rng, tick = null, towards = 0 }) {
  g.save();
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(x + (rng() - 0.5) * r * 0.3, y + (rng() - 0.5) * r * 0.3, r, r * 0.82, 0, 0, Math.PI * 2);
  g.fill();
  if (tick) {
    g.strokeStyle = tick;
    g.lineCap = 'round';
    g.lineWidth = r * 0.75;
    g.beginPath();
    g.arc(x, y, r * 1.7, towards - 0.9, towards + 0.9);
    g.stroke();
  }
  g.restore();
}
// a plan is a list of marks in the drawing's own metres, laid out ONCE from a fixed seed so that
// both boils and every level of the breath strike the same marks with a different hand
function strike(g, plan, { layer, X, Y, pen, rng }) {
  for (const s of plan) {
    if (s.layer !== layer) continue;
    const o = { w: pen * s.w, color: s.color, rng, bend: s.bend + (rng() - 0.5) * 0.02, broke: s.broke, taper: s.taper ?? 0.45 };
    if (!s.dash) {
      lick(g, X(s.a[0], s.a[1]), Y(s.a[0], s.a[1]), X(s.b[0], s.b[1]), Y(s.b[0], s.b[1]), o);
      continue;
    }
    // WHERE THE LIGHT IS GIVING OUT IT IS DASHES, which is the floor's own grammar (the brief: dash-
    // strokes for floors): a line that is continuous at the lip breaks into dashes further out and
    // into flecks at the end of it, and the gaps are the hand's and change on every boil
    const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    const ux = (s.b[0] - s.a[0]) / L, uz = (s.b[1] - s.a[1]) / L;
    for (let t = rng() * 0.02 * s.dash; t < L; ) {
      const len = Math.min(L - t, (0.06 - 0.04 * s.dash) * (0.35 + 1.3 * rng()));
      const p = [s.a[0] + ux * t, s.a[1] + uz * t], q = [s.a[0] + ux * (t + len), s.a[1] + uz * (t + len)];
      lick(g, X(p[0], p[1]), Y(p[0], p[1]), X(q[0], q[1]), Y(q[0], q[1]), { ...o, broke: false, taper: 0.3 });
      t += len + (0.008 + 0.045 * s.dash) * (0.5 + rng());
    }
  }
}

// ---- THE BOARDS, READ OFF THE FLOOR'S OWN TEXTURE -------------------------------------------------
// room-textures.js lays ten boards to a 2.6 m tile with no two the same width, normalised so the
// last seam lands on the tile edge. This is that loop, run again, so that "cut where the boards
// already run" is a fact and not a claim. The canvas's y runs the other way from the world's v, so
// a seam `e` metres down that sheet is at 2.6 - e metres of world z, plus whole tiles.
const TILE = 2.6;
export const SEAMS = (() => {
  const w = [];
  for (let r = 0; r < 10; r++) w.push(0.78 + (((r * 7919) % 100) / 100) * 0.44);
  const sum = w.reduce((p, q) => p + q, 0);
  const out = [0];
  for (let r = 0; r < 10; r++) out.push(out[r] + (TILE * w[r]) / sum);
  return out.map((e) => +(TILE - e).toFixed(4)).reverse(); // ascending world z, within one tile
})();
// every seam between two z, across as many tiles as it takes
function seamsBetween(z0, z1) {
  const out = [];
  const k0 = Math.floor(z0 / TILE) - 1, k1 = Math.ceil(z1 / TILE) + 1;
  for (let k = k0; k <= k1; k++) for (const s of SEAMS) {
    const z = s + k * TILE;
    if (z > z0 + 1e-4 && z < z1 - 1e-4) out.push(+z.toFixed(4));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

// ---- THE HATCH -----------------------------------------------------------------------------------
const Z0 = SEAMS.find((z) => z > 1.85); // 1.9128 — the first seam clear of the rug's fringe at 1.75
const Z1 = TILE; // 2.6000 — three boards further downstage
export const HATCH = {
  x0: -0.45,
  x1: 0.45,
  z0: Z0,
  z1: Z1,
  hinge: -0.45, // the joist the lid is hung on: the constant-x cut at its stage-left edge
  thick: 0.024, // 24 mm of board and the ledges under it
};
const HW = HATCH.x1 - HATCH.x0;
const HD = HATCH.z1 - HATCH.z0;
// …and the cut in the floor's own grid, which is bigger. The floor is 52 quads over 5.2 m from
// x -2.6, and 64 over 9.2 m from z -2.5.
const GRID = { x: 5.2 / 52, z: 9.2 / 64, x0: -2.6, z0: -2.5 };
const snapTo = (v, o, p, up) => +(o + (up ? Math.ceil((v - o) / p) : Math.floor((v - o) / p)) * p).toFixed(5);
const CUT = {
  x0: snapTo(HATCH.x0, GRID.x0, GRID.x, false),
  x1: snapTo(HATCH.x1, GRID.x0, GRID.x, true),
  z0: snapTo(HATCH.z0, GRID.z0, GRID.z, false),
  z1: snapTo(HATCH.z1, GRID.z0, GRID.z, true),
};
const WARP = 0.03; // the slack the room's own warp field needs (amplitude 22 mm, and a whisker)

// ---- THE WELL, AND THE FLIGHT IN IT ---------------------------------------------------------------
// A stair, not a shaft: the well's downstage wall stands under the hatch's near seam and the well
// runs UPSTAGE under the parlour floor, which is where the flight goes and why anything of it can be
// seen at all. 190 mm risers on 230 mm goings is 39.6 degrees, which is what a cellar stair is: the
// treads are narrow because the run has to get down a storey under a room only five metres deep, and
// the LENS is what was laid to suit it rather than the other way about (see the head of this file).
// Eight of them get 1.52 m down over 1.84 m of run, all of it upstage under the parlour's own
// boards, where there is nothing to be in the way.
const STAIR = { rise: 0.19, going: 0.23, steps: 8, width: 0.78 };
const LANDING = 0.55; // …and the floor of the cellar runs this much further upstage past its foot
export const WELL = {
  x0: HATCH.x0,
  x1: HATCH.x1,
  z1: HATCH.z1, // the downstage wall, under the near seam
  z0: +(HATCH.z0 - STAIR.steps * STAIR.going - LANDING).toFixed(4), // the far wall
  y: +(-(STAIR.steps * STAIR.rise)).toFixed(4), // -1.52: the floor of the cellar
};

// ---- THE LID'S TWO POSE TABLES ---------------------------------------------------------------------
// A LIFT AND THEN A FALL, AND THEY ARE NOT THE SAME DRAWING.
// Nothing lifts a trapdoor evenly. The first two drawings are the seal: forty years of paint and dust
// round three sides of it, and the lid moves three degrees while it lets go. Then it comes up under
// whatever is lifting it — and at 96 degrees it is past its own balance and NOBODY IS LIFTING IT ANY
// MORE. The last seven drawings are a 0.9 m board falling about its hinge, integrated at 3g/2L with a
// little damping, which is where 99, 108, 121, 138, 157, 175 comes from: three degrees on the first
// drawing of the fall and nineteen on the fifth. It meets the boards on drawing 13 and rebounds NINE
// AND A HALF DEGREES, which is walk-book.js's own number for a board landing on a table and is here
// for the same reason — a board that lands dead is a board that was placed.
const LID_OPEN = [0, 3, 12, 30, 55, 78, 96, 99, 108, 121, 138, 157, 175, 180, 170.5, 177, 180];
const LID_LAND = 13; // the drawing it meets the boards
// …AND SHUTTING IT IS NOT THAT LIST READ BACKWARDS, which is the frieze's own lesson (egg-cross.js,
// the door's CLOSE). Backwards, the first drawing of the close is the rebound — a lid bouncing UPWARD
// on its way to being shut. A close is a hand under the edge: it comes off the boards, goes over at
// speed where gravity is helping, and is EASED into the frame over the last four drawings, because a
// trapdoor dropped the last ten degrees onto its own rebate is a noise the room would hear twice.
const LID_SHUT = [173, 160, 140, 118, 96, 74, 54, 36, 21, 10, 3, 0];

// ---- what the drawings are struck at ---------------------------------------------------------------
// The room's own contour on a surface this near the lens is 0.013 m, and everything here is struck
// one notch under it, as the weather was.
const PEN_M = 0.0118;
const PPM_LID = 460; // the lid is 0.9 x 0.687 m and the lens gets within 2.8 m of it
const PPM_WELL = 420; // the walls of the well: the nearest drawing in the film after the lid
const PPM_MOUTH = 260; // the boards round the hole: no fine marks in it
const PPM_SPILL = 420; // the light on those boards: pen strokes, struck at the well's own density

// ---- THE BREATH ---------------------------------------------------------------------------------
// Three levels, and the fire is at the middle one most of the time: 0 is the light drawn back into
// the hole, 1 is how it sits, 2 is a SURGE, when it comes further along the boards, the wall down the
// well takes more of it, and something comes up out of it. Written out by hand and not drawn from a
// noise, because menace is timing: long holds, a surge of two drawings and then of five, a dip before
// the next one. 110 drawings is nine seconds of film, long enough that nobody watching counts it.
const BREATH = [
  [1, 14], [2, 2], [1, 2], [2, 5], [1, 11], [0, 3], [1, 4], [0, 1], [1, 16],
  [2, 3], [1, 1], [2, 2], [1, 13], [0, 2], [1, 7], [2, 6], [1, 10], [0, 2], [1, 6],
];
const BREATH_N = BREATH.reduce((s, [, n]) => s + n, 0);
const BREATH_AT = (() => {
  const out = [];
  for (const [lv, n] of BREATH) for (let i = 0; i < n; i++) out.push(lv);
  return out;
})();
export const breathAt = (frame) => BREATH_AT[((frame % BREATH_N) + BREATH_N) % BREATH_N];

// how far the light reaches, at each level of the breath, in metres from the edge of the opening
const REACH = {
  // UPSTAGE IT IS HELD TO ONE BOARD, AT EVERY LEVEL. That board ends at the rug's fringe, and from
  // the visitor's own chair (the `wide` plate) the proof projects this reach and asks that no red
  // sits above it: 0.24 is inside its 0.26 with the pulse included.
  up: [0.07, 0.16, 0.24],
  down: [0.1, 0.26, 0.55], // toward the lens: a hand, one board, two boards
  side: [0.1, 0.3, 0.72], // along the three cut boards, out of the side of the hole
  rake: [0.05, 0.2, 0.55], // …and along the boards up- and downstage, past the ends of the hole
};

// ====================================================================================================
// THE DRAWINGS
// ====================================================================================================

// ====================================================================================================
// THE RED IS LIGHT AND NOT PAINT, which is the user's own correction and the round's second one. The
// first cut laid it as FLAT PLATES — a solid halo on the boards round the hole, solid bands up the
// walls, solid risers — and what that reads as is a red blob on the floor and a red box under it,
// because a plate of colour in this film is a thing that has been PAINTED (the fire's own tongues
// are painted, and they are objects). Light is not an object. So every red surface below is now
// HATCH: strokes of the one red laid over the paper at a spacing that opens with distance from the
// source, with every ink line of the drawing still under them and bare paper showing between them.
// It is the same grammar the room uses for shade — weight is spacing, not opacity — in the one
// colour this egg is allowed.
//
// `lit` lays that: a run of hatch bands from `tight` to `open` nibs apart across the box, so the end
// nearest the light is nearly solid with strokes and the far end is three marks and paper. `turn`
// is which way the strokes lie, and they lie ALONG the surface they are on — across a tread, down a
// wall — because a stroke that runs the way the thing runs is shading and a stroke that cuts across
// it is a texture.
function lit(g, x, y, w, h, { pen, rng, from = 0, to = 1, tight = 1.5, open = 7, bands = 5, angle = 0, color = CELLAR_R, alpha = 0.95, ramp = false, wobble = 0.55 }) {
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands, t1 = (i + 1) / bands;
    const k = from + (to - from) * ((t0 + t1) / 2); // 0 at the light, 1 at the far end
    const sp = pen * (tight + (open - tight) * k * k);
    const a = alpha * (1 - 0.45 * k);
    hatchRect(g, x + w * (angle === 0 ? 0 : t0), y + h * (angle === 0 ? t0 : 0), angle === 0 ? w : w / bands, angle === 0 ? h / bands : h, {
      angle,
      spacing: sp,
      width: pen * (0.95 - 0.25 * k),
      wobble: pen * wobble,
      broken: 0.12 + 0.3 * k,
      rng,
      color: ramp ? heatOf(k) : color, // the ramp: HOT at the light, BLOOD at the far end
      alpha: ramp ? alpha : a,
    });
  }
}

// the boards, on a sheet of a given size, so that anything cut out of this floor reads as this floor.
// `seams` are where the real ones fall, in the sheet's own v, 0 at the top of the canvas.
function boards(g, W, H, pen, rng, { seams = [], alpha = 1 } = {}) {
  g.save();
  g.globalAlpha = alpha;
  for (const v of seams) {
    const y = v * H;
    inkLine(g, -6, y, W + 6, y + (rng() - 0.5) * 4, { width: pen * 0.95, wobble: pen * 0.5, rng, alpha: 0.95, segments: 24 });
  }
  // one end joint and one length of grain, which is about what a square metre of this floor carries
  const jx = W * (0.34 + rng() * 0.2);
  const band = seams.length > 1 ? [seams[0] * H, seams[1] * H] : [H * 0.1, H * 0.6];
  inkLine(g, jx, band[0] + 2, jx + (rng() - 0.5) * 4, band[1] - 2, { width: pen * 0.85, wobble: pen * 0.3, rng, alpha: 0.9, segments: 5 });
  const gy = H * (0.62 + rng() * 0.2);
  inkLine(g, W * 0.1, gy, W * 0.6, gy + (rng() - 0.5) * 5, { width: pen * 0.45, wobble: pen * 0.4, rng, alpha: 0.2, segments: 8 });
  g.restore();
}

// 1. THE LID, FROM ABOVE. Shut, this is the only drawing of the hatch there is — three boards with
// the saw cut round them — and it is never seen, because while the hatch is shut the hatch is not in
// the room at all. It is what the lid shows the ceiling for the first six drawings of the lift.
export function drawLidTop({ w, h, ppm, penM, seams, seed = 6201, boil = 0 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 977);
  const pen = penM * ppm;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  boards(g, W, H, pen, rng, { seams });
  // the saw cut: a line all round, a whisker inside the edge, heavier than a seam because it is a
  // cut and not a joint
  frame(g, [[pen, pen], [W - pen, pen], [W - pen, H - pen], [pen, H - pen]], { width: pen * 1.15, wobble: pen * 0.45, rng });
  return c;
}

// THE RAKE ACROSS IT, laid out once: a line of light every centimetre or so down the hinge edge, each
// running out along the lid's own boards in three lengths — one for each level of the breath — so a
// surge is the SAME lines reaching further over the board, and not a new set of lines.
const LID_STEP = [0.13, 0.13, 0.24]; // metres added at each level, before the hand shortens them
function lidPlan(w, h) {
  const lay = mulberry32(6329);
  const out = [];
  const far = LID_STEP.reduce((p, q) => p + q, 0);
  for (let y = 0.007; y < h - 0.004; y += 0.0105 + lay() * 0.011) {
    let x = 0.004;
    for (let L = 0; L < 3; L++) {
      const len = LID_STEP[L] * (0.3 + 0.7 * lay()) * (L === 0 ? 1 : 0.6 + 0.4 * lay());
      if (L > 0 && lay() < 0.18) { x += len; continue; } // a line that stops, and a gap on the board
      const k = (x + len / 2) / far;
      out.push({ a: [x, y], b: [x + len, y + (lay() - 0.5) * 0.004], w: 0.85 - 0.25 * k, color: heatOf(k * 1.5), layer: L, bend: 0, broke: false, dash: L > 0 ? Math.min(1, 0.15 + k) : 0 });
      x += len + 0.006 + lay() * 0.01;
    }
  }
  return out;
}
const LID_NAILS = [0.16, 0.5, 0.84];

// 2. THE LID, FROM UNDERNEATH, WITH THE LIGHT ON IT. This is the face the room sees for the whole of
// the second half of the swing and for as long as the hatch is open, and it is where the red does its
// plainest work: the glow comes out of the mouth, so it rakes across this board FROM THE HINGE EDGE
// (u = 0), HOT against the hole and going to BLOOD as it gives out. Under that, the two ledges and
// their clout nails, which are the whole of what is on the back of a trapdoor, and the nail nearest
// the hole catches the light on its near side.
// `layer` 0 is the board itself with the light at its lowest; 1 and 2 are the SAME board's light
// reaching further on the breath, drawn on clear sheets laid over it (see THE BREATH).
export function drawLidUnder({ w, h, ppm, penM, seams, seed = 6317, boil = 0, layer = 0 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 1361 + layer * 53);
  const pen = penM * ppm;
  const X = (x) => x * ppm, Y = (x, y) => y * ppm;
  if (layer === 0) {
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
  }
  // THE LIGHT, HATCHED, raking from the hinge edge — which is the edge against the hole — and struck
  // ALONG the lid, so the strokes run the way its boards do.
  strike(g, lidPlan(w, h), { layer, X, Y, pen, rng });
  const reach = LID_STEP.slice(0, layer + 1).reduce((p, q) => p + q, 0) * 0.8;
  for (const v of [0.26, 0.74]) {
    const y = v * H, t = pen * 2.6;
    if (layer === 0) frame(g, [[pen * 1.5, y - t], [W - pen * 1.5, y - t], [W - pen * 1.5, y + t], [pen * 1.5, y + t]], { width: pen * 0.8, wobble: pen * 0.35, rng });
    for (const u of LID_NAILS) {
      const lit = u * w < reach && (layer === 0 || u * w >= LID_STEP.slice(0, layer).reduce((p, q) => p + q, 0) * 0.8);
      if (layer === 0) nail(g, W * u, y, pen * 0.42, { rng, tick: lit ? HOT : null, towards: Math.PI });
      else if (lit) nail(g, W * u, y, pen * 0.42, { rng, tick: heatOf(u * 1.4), towards: Math.PI });
    }
  }
  if (layer > 0) return c;
  boards(g, W, H, pen, rng, { seams, alpha: 0.9 });
  frame(g, [[pen, pen], [W - pen, pen], [W - pen, H - pen], [pen, H - pen]], { width: pen * 1.15, wobble: pen * 0.45, rng });
  return c;
}

// 3. THE MOUTH: the boards round the hole. One sheet, standing over the floor with the opening
// alpha-tested out of the middle of it, and it does one job: it closes the 50 and 100 mm of grid the
// floor's own hole is bigger by, in the floor's own drawing. It used to carry the light as well; the
// light is on sheets of its own now (drawSpill), because it breathes and the boards do not.
export function drawMouth({ w, h, ppm, penM, hole, seams, seed = 6449, boil = 0 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 1543);
  const pen = penM * ppm;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  boards(g, W, H, pen, rng, { seams });
  // …and the hole itself, punched out. Everything inside it is the well, and the well is geometry.
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  g.fillRect(hole.u0 * W, hole.v0 * H, (hole.u1 - hole.u0) * W, (hole.v1 - hole.v0) * H);
  g.restore();
  // the rebate the lid sits in: a line round the inside of the opening
  frame(g, [[hole.u0 * W, hole.v0 * H], [hole.u1 * W, hole.v0 * H], [hole.u1 * W, hole.v1 * H], [hole.u0 * W, hole.v1 * H]], {
    width: pen * 1.15, wobble: pen * 0.4, rng,
  });
  return c;
}

// 3b. THE LIGHT ON THE BOARDS, AND IT FOLLOWS THE BOARDS. The halo this replaces was a disc of even
// wavy strokes, and a hole in a boarded floor does not throw a disc: light coming up past a lip
// RAKES, and a raking light on boards is picked up by the boards — along each plank, stopping at its
// seams, catching the edge of the next one and the heads of the nails. So:
//   · the LIP: the two sides of the opening, which are cut ends of board on the trimmer joists, get
//     three tight HOT strokes each, running UP the edge of the frame;
//   · the three CUT BOARDS carry the light straight out of the sides of the hole along their own
//     length, each line HOT at the lip, going through the one red to BLOOD, and each board's lines
//     stopping short of its seams so the board is what shapes the light;
//   · the boards UP- and DOWNSTAGE carry it across the hole's width, densest against the edge and
//     opening out away from it, and past the ends of the hole along the plank — the rake;
//   · the NAIL HEADS on the trimmers catch it on the side that faces the hole.
// Every line is laid out once in metres (spillPlan) and cut into three runs, one per level of the
// breath, so a surge is the same lines reaching further along the same boards.
function spillPlan(rect) {
  const lay = mulberry32(7307);
  const segs = [], nails = [];
  const cx = (HATCH.x0 + HATCH.x1) / 2, hw = HW / 2;
  const cum = (arr, L) => arr.slice(0, L + 1).reduce((p, q) => p + q, 0);
  const seams = [...new Set([...seamsBetween(rect.z0 - 0.5, rect.z1 + 0.5), HATCH.z0, HATCH.z1])].sort((a, b) => a - b);
  const bandOf = (z) => {
    for (let i = 0; i < seams.length - 1; i++) if (z >= seams[i] && z <= seams[i + 1]) return [seams[i], seams[i + 1]];
    return null;
  };
  const clearOfSeam = (z) => {
    const b = bandOf(z);
    return b && z - b[0] > 0.011 && b[1] - z > 0.011;
  };
  const inX = (x) => Math.max(rect.x0 + 0.01, Math.min(rect.x1 - 0.01, x));
  // up- and downstage: lines across the hole's width, then out along the plank past its ends
  for (const [edge, dir, reach] of [[HATCH.z0, -1, REACH.up], [HATCH.z1, 1, REACH.down]]) {
    const far = reach[2];
    for (let d = 0.005; d < far; d += 0.011 + 0.1 * Math.pow(d / 0.55, 1.2) + lay() * 0.012) {
      const z = edge + dir * d;
      if (z < rect.z0 + 0.008 || z > rect.z1 - 0.008 || !clearOfSeam(z)) continue;
      const L = d < reach[0] ? 0 : d < reach[1] ? 1 : 2;
      const k = d / 0.55;
      const half = hw * (1.0 - 0.45 * Math.pow(k, 1.1)) * (k < 0.15 ? 0.95 + 0.08 * lay() : 0.7 + 0.4 * lay());
      const off = (lay() - 0.5) * 0.06 * k;
      const zz = () => z + (lay() - 0.5) * 0.003;
      const w = 0.88 - 0.3 * Math.min(1, k);
      segs.push({ a: [cx - half + off, zz()], b: [cx + half + off, zz()], w, color: heatOf(k * 1.7), layer: L, bend: 0, broke: k > 0.2 && k < 0.35 && lay() < 0.4, dash: k > 0.35 ? Math.min(1, (k - 0.35) * 2.2) : 0 });
      // …and on out along the plank, in runs that belong to this level and the ones after it
      for (const side of [-1, 1]) {
        let x = half + 0.006 + lay() * 0.01;
        for (let Lx = L; Lx < 3; Lx++) {
          const len = REACH.rake[Lx] * Math.pow(Math.max(0, 1 - k * 1.3), 1.4) * (0.35 + 0.65 * lay());
          if (len < 0.015) break;
          const kk = Math.min(1, k + (x + len / 2 - hw) / 0.9);
          const x0 = inX(cx + off + side * x), x1 = inX(cx + off + side * (x + len));
          if (Math.abs(x1 - x0) > 0.012) segs.push({ a: [x0, zz()], b: [x1, zz()], w: w * (1 - 0.2 * kk), color: heatOf(kk * 1.6), layer: Lx, bend: 0, broke: false, dash: kk > 0.25 ? Math.min(1, (kk - 0.25) * 1.8) : 0 });
          x += len + 0.008 + lay() * 0.02;
        }
      }
    }
  }
  // the three cut boards: out of each side of the hole along their own length
  for (let z = HATCH.z0 + 0.013; z < HATCH.z1 - 0.01; z += 0.013 + lay() * 0.016) {
    if (!clearOfSeam(z)) continue;
    for (const side of [-1, 1]) {
      const start = side < 0 ? HATCH.x0 : HATCH.x1;
      let x = 0.022 + lay() * 0.008; // clear of the three strokes up the lip
      const far = cum(REACH.side, 2);
      for (let L = 0; L < 3; L++) {
        // stage left of the hole the open lid is lying on these three boards, so past the lip there
        // is nothing there to see
        if (side < 0 && L > 0) break;
        const len = REACH.side[L] * (0.3 + 0.7 * lay());
        if (L > 0 && lay() < 0.2) { x += len; continue; }
        const k = (x + len / 2) / far;
        const zz = z + (lay() - 0.5) * 0.003;
        segs.push({ a: [inX(start + side * x), zz], b: [inX(start + side * (x + len)), zz + (lay() - 0.5) * 0.004], w: 0.88 - 0.3 * k, color: heatOf(k * 1.5), layer: L, bend: 0, broke: false, dash: L > 0 ? Math.min(1, 0.2 + k * 1.3) : 0 });
        x += len + 0.007 + lay() * 0.014;
      }
    }
  }
  // the lip: three strokes up each cut end, tight against the opening, and the hottest thing on the floor
  for (const [x, side] of [[HATCH.x0, -1], [HATCH.x1, 1]])
    for (const o of [0.004, 0.0105, 0.017]) {
      const xx = x + side * (o + (lay() - 0.5) * 0.002);
      segs.push({ a: [xx, HATCH.z0 + 0.006 + lay() * 0.01], b: [xx, HATCH.z1 - 0.006 - lay() * 0.01], w: o < 0.01 ? 0.95 : 0.8, color: o < 0.015 ? HOT : CELLAR_R, layer: 0, bend: 0, broke: o > 0.015 });
    }
  // the nails in the trimmers, two to a board, lit on the side toward the hole if the light gets there
  for (let i = 0; i < seams.length - 1; i++) {
    const [za, zb] = [seams[i], seams[i + 1]];
    for (const z of [za + 0.034, zb - 0.034]) {
      if (z < rect.z0 + 0.01 || z > rect.z1 - 0.01) continue;
      for (const [x, side] of [[HATCH.x0 - 0.036, -1], [HATCH.x1 + 0.036, 1]]) {
        const inside = z > HATCH.z0 && z < HATCH.z1;
        const d = inside ? 0 : z < HATCH.z0 ? HATCH.z0 - z : z - HATCH.z1;
        const reach = z < HATCH.z0 ? REACH.up : REACH.down;
        const L = inside || d < reach[0] ? 0 : d < reach[1] ? 1 : d < reach[2] ? 2 : -1;
        // the side of the head that faces the hole: across it for the cut boards, along it for the rest
        const towards = inside ? (side < 0 ? 0 : Math.PI) : z < HATCH.z0 ? Math.PI / 2 : -Math.PI / 2;
        nails.push({ x, z, layer: L, color: heatOf(inside ? 0 : d / 0.4), towards });
      }
    }
  }
  return { segs, nails };
}

// `rect` is the whole reach the plan is laid out in; `clip` is the part of it this sheet covers
const plans = new Map();
export function drawSpill({ rect, clip = rect, ppm, penM, layer, seed = 7309, boil = 0 }) {
  const c = makeCanvas(Math.round((clip.x1 - clip.x0) * ppm), Math.round((clip.z1 - clip.z0) * ppm));
  const g = c.getContext('2d');
  const rng = mulberry32(seed + boil * 1543 + layer * 71);
  const pen = penM * ppm;
  const X = (x) => (x - clip.x0) * ppm, Y = (x, z) => (z - clip.z0) * ppm;
  const key = `${rect.x0},${rect.x1},${rect.z0},${rect.z1}`;
  if (!plans.has(key)) plans.set(key, spillPlan(rect));
  const plan = plans.get(key);
  strike(g, plan.segs, { layer, X, Y, pen, rng });
  for (const n of plan.nails) {
    // the heads are on the first sheet whatever the breath is doing; the light on them comes and goes
    if (layer === 0) nail(g, X(n.x), Y(0, n.z), pen * 0.5, { rng, tick: n.layer === 0 ? n.color : null, towards: n.towards });
    else if (n.layer === layer) nail(g, X(n.x), Y(0, n.z), pen * 0.5, { rng, tick: n.color, towards: n.towards });
  }
  return c;
}

// 4. THE WALLS OF THE WELL. Rubble stone laid in courses, and the light on it — and the two side walls
// are NOT the same drawing any more, because the light is not in the middle of the cellar. It is off
// to stage left, where the cellar goes (api.turn), low down at the foot of the flight. So the RIGHT
// wall faces it and is lit: hot at the foot, the licks of it going up the stone, the course-hatch
// deepening from vermilion to blood as it climbs, and a timber trimmer at the top whose face is the
// brightest thing down there, because it is the lip. The LEFT wall has its back to the fire and is the
// deepest thing in the well: blood crossed with the pen, which is the nearest this drawing comes to a
// black that is still red, and it is what makes the other wall look hot. The near and far walls are
// never on the glass (one faces away from the lens, the other is past where any ray through the
// mouth can reach) and are drawn as the dark one, cheaply.
//
// `zAt` turns a distance along the canvas into world z, so the marks go only where a ray through the
// opening can land: z 0.25 .. 2.6, and bare stone past it. `u0 .. u1` is the part of the wall this
// canvas covers, which for the clear sheets the breath lays over the lit wall is only that part.
const TRIM = 0.075; // the trimmer joist at the head of the wall: 75 mm of timber under the boards
function hotWallPlan(w, h, zAt) {
  const lay = mulberry32(6581);
  const segs = [];
  const seen = (u) => { const z = zAt(u); return z > 0.25 && z < 2.61; };
  let ua = 0, ub = w;
  while (ua < w && !seen(ua)) ua += 0.01;
  while (ub > 0 && !seen(ub)) ub -= 0.01;
  const runs = (y, L, color, wt, gapP = 0.35) => {
    let u = ua + lay() * 0.05;
    while (u < ub) {
      const len = 0.08 + lay() * 0.3;
      const e = Math.min(ub, u + len);
      if (lay() > gapP * 0.4) segs.push({ a: [u, y + (lay() - 0.5) * 0.004], b: [e, y + (lay() - 0.5) * 0.006], w: wt, color, layer: L, bend: 0, broke: lay() < gapP * 0.5 });
      u = e + 0.01 + lay() * 0.05 * (1 + gapP * 3);
    }
  };
  // the trimmer's face, hot and tight: the lip, from underneath
  for (let y = 0.007; y < TRIM - 0.004; y += 0.0085 + lay() * 0.002) runs(y, 0, HOT, 0.85, 0.05);
  // the course-hatch, from the foot up: tight and hot at the bottom, opening and cooling as it climbs,
  // and the breath takes it further up the wall
  // (the part of this wall the lens can see through the mouth is its top metre, so the light has to
  // be there at its lowest level too: what the breath adds is the top of the wall, not the middle)
  for (let y = h - 0.008; y > TRIM + 0.012; ) {
    const t = (h - y) / (h - TRIM); // 0 at the foot, 1 at the trimmer
    const L = t < 0.88 ? 0 : t < 0.95 ? 1 : 2;
    runs(y, L, heatOf(t * 1.1), 1.15 - 0.25 * t, 0.1 + t * 0.3);
    y -= 0.0085 + 0.012 * Math.pow(t, 1.3) + lay() * 0.005;
  }
  // THE LICKS: strokes going UP the stone from the foot with a lean and a curl in them, which is what
  // turns a lit wall into a wall with a fire under it. They cluster, as flames do, and the tall ones
  // only reach on the breath.
  for (let u = ua + lay() * 0.03; u < ub; u += 0.022 + lay() * 0.05 * (lay() < 0.3 ? 3 : 1)) {
    const tall = Math.pow(lay(), 1.3) * 0.62 + 0.3; // fraction of the wall's height
    const L = tall < 0.68 ? 0 : tall < 0.8 ? 1 : 2;
    const y0 = h - 0.004 - lay() * 0.03, y1 = h - (h - TRIM) * tall;
    const lean = (lay() - 0.5) * 0.08;
    const mid = y0 + (y1 - y0) * 0.45;
    segs.push({ a: [u, y0], b: [u + lean * 0.4, mid], w: 0.9, color: HOT, layer: L, bend: (lay() - 0.5) * 0.3, taper: 0.2 });
    segs.push({ a: [u + lean * 0.4, mid], b: [u + lean, y1], w: 0.8, color: heatOf(tall * 1.5), layer: L, bend: (lay() - 0.5) * 0.5, taper: 0.7, broke: lay() < 0.3 });
  }
  return segs;
}
export function drawWell({ w, h, ppm, penM, seed = 6577, boil = 0, mode = 'dark', zAt = (u) => u, layer = 0, u0 = 0, u1 = w }) {
  const c = makeCanvas(Math.round((u1 - u0) * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 1721 + layer * 29);
  const pen = penM * ppm;
  const X = (u) => (u - u0) * ppm, Y = (u, y) => y * ppm;
  if (layer === 0) {
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
  }
  if (mode === 'hot') {
    strike(g, hotWallPlan(w, h, zAt), { layer, X, Y, pen, rng });
    if (layer > 0) return c;
  } else {
    // THE DARK WALL: blood laid one way and the pen the other, tight, and a single hot thread along
    // the lip where the light going up past it catches the edge of the trimmer
    hatchRect(g, 0, 0, W, H, { angle: -0.55, spacing: pen * 1.5, width: pen * 0.8, wobble: pen * 0.4, broken: 0.15, rng, color: BLOOD, alpha: 1 });
    hatchRect(g, 0, 0, W, H, { angle: 0.75, spacing: pen * 4.2, width: pen * 0.55, wobble: pen * 0.6, broken: 0.35, rng, alpha: 0.9 });
    hatchRect(g, 0, 0, W, TRIM * ppm, { angle: 0, spacing: pen * 1.5, width: pen * 0.6, wobble: pen * 0.3, broken: 0.1, rng, color: BLOOD, alpha: 1 });
    inkLine(g, -4, pen * 0.9, W + 4, pen * 0.9 + (rng() - 0.5) * pen, { width: pen * 0.62, wobble: pen * 0.4, rng, color: HOT, segments: 12 });
  }
  // the trimmer's lower edge, and the coursing: rubble, so the beds wander and the perpends do not
  // line up. It is struck at the full nib and not under it, because a wall of stone seen through a
  // hole a metre away is the NEAREST drawing in the film and a wall whose lines are a contour wide
  // reads as a wall in fog.
  inkLine(g, -4, TRIM * ppm, W + 4, TRIM * ppm + (rng() - 0.5) * pen, { width: pen * 1.0, wobble: pen * 0.5, rng, segments: 14 });
  const courses = Math.max(4, Math.round(h / 0.19));
  for (let r = 1; r < courses; r++) {
    const y = TRIM * ppm + ((H - TRIM * ppm) * r) / courses;
    inkLine(g, -4, y + (rng() - 0.5) * pen, W + 4, y + (rng() - 0.5) * pen * 2, { width: pen * 1.0, wobble: pen * 0.7, rng, alpha: 0.95, segments: 14 });
    let x = -rng() * W * 0.1;
    while (x < W) {
      x += ppm * (0.18 + rng() * 0.26);
      if (x > 0 && x < W) inkLine(g, x, y, x + (rng() - 0.5) * pen * 2.4, y + (H - TRIM * ppm) / courses, { width: pen * 0.9, wobble: pen * 0.6, rng, alpha: 0.85, segments: 3 });
    }
  }
  return c;
}

// 5. A TREAD, and a RISER, and the FLOOR OF THE CELLAR. The light is under the flight and off to
// stage left, so a riser faces it square on and is the hottest thing in the well; a tread has it only
// round the nose; and the floor is where the light actually IS.
export function drawTread({ w, h, ppm, penM, seed = 6701, boil = 0, riser = false, floor = false }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 1867);
  const pen = penM * ppm;
  if (floor) {
    // THE FLOOR OF THE CELLAR. What the lens sees of it through the mouth is the stretch 0.3 .. 1.05 m
    // of world z — UNDER THE FLIGHT, 1.5 m down — and that is the deepest thing in the picture, so it
    // is drawn as the two things a fire in a cellar does to a floor. It POOLS: strokes going out from
    // a source off the stage-left edge, hot and tight where they start and running out in blood,
    // which is light and not a surface pattern because every one of them points back at the fire.
    // And the stair THROWS ITS SHADOW across it: one bar of blood crossed with the pen under every
    // riser, which is the long shadow of the flight and the thing that says the light is low. The
    // upstage end of it, furthest under the stair, is crossed over again and is the near-black crimson
    // at the bottom of the well.
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
    const lay = mulberry32(seed + 5);
    const Vz = (z) => (z - WELL.z0) * ppm; // the canvas's top is upstage
    // the whole floor first takes the light at its thinnest — blood, laid across, open — because a
    // cellar with a fire in it has no bare paper on its floor
    hatchRect(g, 0, 0, W, H, { angle: 0.12, spacing: pen * 4.6, width: pen * 0.7, wobble: pen * 0.3, broken: 0.5, rng, color: BLOOD, alpha: 1 });
    // the pool: rays out of a point off the stage-left edge, level with the middle of what is seen
    const sx = -0.1 * ppm, sy = Vz(0.7);
    for (let i = 0; i < 64; i++) {
      const a = -1.2 + (2.4 * i) / 63 + (lay() - 0.5) * 0.04;
      const r0 = (0.06 + lay() * 0.1) * ppm;
      const r1 = r0 + (0.4 + Math.pow(lay(), 0.6) * 0.65) * Math.cos(a * 0.6) * ppm;
      const rm = r0 + (r1 - r0) * (0.4 + lay() * 0.2);
      const ca = Math.cos(a), sa = Math.sin(a);
      lick(g, sx + ca * r0, sy + sa * r0, sx + ca * rm, sy + sa * rm, { w: pen * 0.9, color: HOT, rng, taper: 0.15, wobble: 0.2 });
      lick(g, sx + ca * (rm + pen * 1.5), sy + sa * (rm + pen * 1.5), sx + ca * r1, sy + sa * r1, { w: pen * 0.75, color: heatOf(0.4 + (r1 - r0) / (1.1 * ppm)), rng, taper: 0.6, broke: lay() < 0.3, wobble: 0.2 });
    }
    // the shadow of the flight: a bar under every riser, blood struck tight along it and the pen
    // struck along it more openly — both ALONG the bar, because a crossed pair at this depth knits
    // into a chain-link and reads as a fence and not as a shadow
    for (let n = 1; n <= STAIR.steps; n++) {
      const z = HATCH.z0 - (n - 1) * STAIR.going;
      const y0 = Vz(z - 0.03), y1 = Vz(z + 0.06);
      hatchRect(g, 0, y0, W, y1 - y0, { angle: 0.04, spacing: pen * 1.25, width: pen * 0.8, wobble: pen * 0.2, broken: 0.1, rng, color: BLOOD, alpha: 1 });
      hatchRect(g, 0, y0 + (y1 - y0) * 0.3, W, (y1 - y0) * 0.7, { angle: -0.03, spacing: pen * 2.3, width: pen * 0.7, wobble: pen * 0.2, broken: 0.25, rng, alpha: 0.95 });
    }
    // …and the far end, furthest under the stair and furthest from the fire: blood and the pen
    // together, the near-black crimson at the bottom of the well
    const deep = Vz(0.5);
    hatchRect(g, 0, 0, W, deep, { angle: 0.04, spacing: pen * 1.3, width: pen * 0.8, wobble: pen * 0.2, broken: 0.1, rng, color: BLOOD, alpha: 1 });
    hatchRect(g, 0, 0, W, deep, { angle: 1.3, spacing: pen * 2.4, width: pen * 0.65, wobble: pen * 0.4, broken: 0.2, rng, alpha: 0.95 });
    hatchRect(g, W * 0.62, 0, W * 0.38, Vz(0.85), { angle: 1.3, spacing: pen * 2.8, width: pen * 0.6, wobble: pen * 0.4, broken: 0.3, rng, alpha: 0.9 });
    // flags and not boards: joints struck heavy, because a cellar floor is stone and the only thing
    // that says so at this distance is the size of what it is laid in
    for (let i = 1; i <= 4; i++) {
      const y = (H * i) / 5;
      inkLine(g, -4, y + (rng() - 0.5) * pen, W + 4, y + (rng() - 0.5) * pen * 2, { width: pen * 1.0, wobble: pen * 0.8, rng, alpha: 0.9, segments: 12 });
    }
    for (const u of [0.34, 0.68]) {
      const x = W * u + (rng() - 0.5) * pen * 2;
      inkLine(g, x, -4, x + (rng() - 0.5) * pen * 3, H + 4, { width: pen * 1.0, wobble: pen * 0.9, rng, alpha: 0.85, segments: 14 });
    }
    return c;
  }
  if (riser) {
    // A RISER FACES THE LIGHT SQUARE ON and is the hottest thing in the well, and it carries the
    // NOSING of the tread above it: top to bottom, nine per cent of bare paper, which is the nosing
    // seen edge-on; then a band of blood crossed with the pen, which is the shadow that nosing throws
    // on the riser under it; and then the riser itself, hatched hot from its foot — where the light is
    // — and cooling to the one red under the shadow. Hatched and not filled: paper still shows
    // between the strokes, which keeps it a drawn surface with light on it rather than a red card.
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
    lit(g, 0, H * 0.26, W, H * 0.74, { pen, rng, from: 0.5, to: 0, tight: 1.05, open: 2.1, bands: 4, angle: 0, ramp: true, alpha: 1, wobble: 0.14 });
    hatchRect(g, 0, H * 0.09, W, H * 0.17, { angle: 0, spacing: pen * 1.4, width: pen * 0.65, wobble: pen * 0.4, broken: 0.12, rng, color: BLOOD, alpha: 1 });
    hatchRect(g, 0, H * 0.09, W, H * 0.17, { angle: 0.02, spacing: pen * 2.2, width: pen * 0.6, wobble: pen * 0.2, broken: 0.2, rng, alpha: 0.9 });
    inkLine(g, 0, H * 0.09, W, H * 0.09 + (rng() - 0.5) * pen, { width: pen * 1.0, wobble: pen * 0.4, rng, segments: 11 });
    inkLine(g, 0, H * 0.26, W, H * 0.26 + (rng() - 0.5) * pen, { width: pen * 0.7, wobble: pen * 0.6, rng, alpha: 0.6, segments: 9 });
    inkLine(g, 0, pen * 0.5, W, pen * 0.5 + (rng() - 0.5) * pen * 0.6, { width: pen * 0.8, wobble: pen * 0.3, rng, segments: 11 });
    inkLine(g, 0, H - pen * 0.7, W, H - pen * 0.7 + (rng() - 0.5) * pen, { width: pen * 0.8, wobble: pen * 0.5, rng, alpha: 0.8, segments: 10 });
    return c;
  }
  // A TREAD IS IN ITS OWN SHADOW, which is the whole reason this drawing exists and is not bare
  // paper with a line round it. The light is BELOW the flight: every tread has the one above it
  // between itself and the parlour, so what the lens sees looking down the well is a stack of DARK
  // bars with a hot edge on each. The first cut of this left them white and the stair came out as
  // five floating shelves; the second had them grey, and the pen alone down there read as soot. So
  // the shadow is the pen crossed with BLOOD — the dark of a place lit red.
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  hatchRect(g, 0, 0, W, H, { angle: 0, spacing: pen * 2.1, width: pen * 0.7, wobble: pen * 0.6, broken: 0.2, rng, alpha: 0.95 });
  hatchRect(g, 0, 0, W, H * 0.7, { angle: 0.05, spacing: pen * 1.9, width: pen * 0.7, wobble: pen * 0.3, broken: 0.2, rng, color: BLOOD, alpha: 1 });
  // …and the NOSE, which is the only lit thing on it: the light comes round the front edge from
  // underneath and stops a nib and a half in.
  lit(g, 0, H - pen * 1.6, W, pen * 1.6, { pen, rng, from: 0, to: 0, tight: 1.1, open: 1.4, bands: 1, angle: 0, color: HOT });
  inkLine(g, 0, H - pen * 1.4, W, H - pen * 1.4 + (rng() - 0.5) * pen, { width: pen * 0.9, wobble: pen * 0.5, rng, segments: 10 });
  frame(g, [[pen * 0.5, pen * 0.5], [W - pen * 0.5, pen * 0.5], [W - pen * 0.5, H - pen * 0.5], [pen * 0.5, H - pen * 0.5]], { width: pen * 0.85, wobble: pen * 0.4, rng });
  return c;
}

// 6. WHAT COMES UP OUT OF IT. Now and then — on a surge, and once in a long while on a hold — a
// spark or a curl of heat comes up the well, over the lip, and dies a hand's breadth over the boards.
// Each is a handful of drawings on a scrap of paper the size of the mark, struck in the one pen and
// the three reds: a SPARK is a hot fleck with a tail that goes to a blood cross and a speck; a CURL is
// the wavering line hot air draws, standing up, then breaking, then a fragment. They are laid out in
// advance against THE BREATH so that the same drawing always has the same sparks in it.
export const EMBER = { spark: { w: 0.05, h: 0.08, n: 5 }, curl: { w: 0.07, h: 0.17, n: 6 } };
export function drawEmber(kind, f, { ppm, penM, seed = 7411 }) {
  const K = EMBER[kind];
  const c = makeCanvas(Math.round(K.w * ppm), Math.round(K.h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + f * 131 + (kind === 'curl' ? 7 : 0));
  const pen = penM * ppm;
  if (kind === 'spark') {
    const x = W * 0.5, y = H * 0.3;
    if (f === 0) {
      lick(g, x - pen * 0.3, y - pen * 1.2, x + pen * 0.3, y + pen * 1.2, { w: pen * 1.0, color: HOT, rng, taper: 0.1 });
      lick(g, x + pen * 0.2, y + pen * 2.4, x - pen * 0.6, y + pen * 5.5, { w: pen * 0.5, color: CELLAR_R, rng, bend: 0.2 });
    } else if (f === 1) {
      lick(g, x - pen * 0.2, y - pen * 0.8, x + pen * 0.2, y + pen * 0.8, { w: pen * 0.9, color: HOT, rng, taper: 0.1 });
      lick(g, x + pen * 0.2, y + pen * 2, x + pen * 0.8, y + pen * 5, { w: pen * 0.45, color: CELLAR_R, rng, bend: -0.3, broke: true });
    } else if (f === 2) {
      lick(g, x, y - pen * 0.4, x, y + pen * 0.4, { w: pen * 0.85, color: CELLAR_R, rng, taper: 0 });
      lick(g, x - pen * 0.2, y + pen * 2, x - pen * 0.5, y + pen * 3.4, { w: pen * 0.4, color: BLOOD, rng });
    } else if (f === 3) {
      lick(g, x - pen * 0.8, y - pen * 0.8, x + pen * 0.8, y + pen * 0.8, { w: pen * 0.45, color: BLOOD, rng, taper: 0 });
      lick(g, x + pen * 0.8, y - pen * 0.8, x - pen * 0.8, y + pen * 0.8, { w: pen * 0.45, color: BLOOD, rng, taper: 0 });
    } else {
      lick(g, x, y, x + pen * 0.2, y + pen * 0.2, { w: pen * 0.5, color: BLOOD, rng, taper: 0 });
    }
    return c;
  }
  // a curl: an upright S of two or three bends, from the foot of the scrap to its head
  const pts = (y0, y1, ph, amp) => {
    const out = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      out.push([W / 2 + Math.sin(ph + t * Math.PI * 2.2) * amp * (0.4 + t * 0.6), H - pen - (H - 2 * pen) * (y0 + (y1 - y0) * t)]);
    }
    return out;
  };
  const run = (p, i0, i1, wt, color) => {
    for (let i = i0; i < i1; i++) lick(g, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], { w: pen * wt * (1 - (0.35 * (i - i0)) / Math.max(1, i1 - i0)), color, rng, taper: 0.15, wobble: 0.2 });
  };
  const amp = W * 0.28;
  if (f === 0) run(pts(0, 0.45, 0.3, amp * 0.6), 0, 8, 0.7, HOT);
  else if (f === 1) run(pts(0.05, 0.85, 0.6, amp), 0, 8, 0.65, CELLAR_R);
  else if (f === 2) {
    const p = pts(0.15, 1, 1.0, amp);
    run(p, 0, 3, 0.6, CELLAR_R);
    run(p, 4, 8, 0.55, CELLAR_R);
  } else if (f === 3) {
    const p = pts(0.35, 1, 1.5, amp * 1.1);
    run(p, 1, 3, 0.5, BLOOD);
    run(p, 5, 7, 0.45, BLOOD);
  } else if (f === 4) run(pts(0.6, 1, 2.0, amp * 1.2), 3, 6, 0.45, BLOOD);
  return c; // f 5: nothing — it has gone
}

// ====================================================================================================
// THE PIECE
// ====================================================================================================
export function eggCellar(ctx, { group, switches }) {
  const root = new THREE.Group();
  root.name = 'cellar';
  root.userData.noShadow = true; // nothing here throws one: it is all drawing
  root.visible = false;
  group.add(root);

  // egg-fine.js's three numbers, for egg-fine.js's reasons: the pigment is shown verbatim, no wash,
  // no lit tone, and no second contour round a drawing that has its own.
  // A canvas struck once is a texture uploaded once: the near and far walls are the same drawing, and
  // are handed the same texture rather than two copies of it.
  const texOf = new Map();
  const sheet = (canvas, name, { side = THREE.FrontSide, cut = true, hatch = 0.02, clear = false } = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0, side });
    m.userData.ink = { hatch, lineWeight: 0, colorful: true };
    let tex = texOf.get(canvas);
    if (!tex) {
      tex = canvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
      texOf.set(canvas, tex);
    }
    m.map = tex;
    if (cut || clear) {
      m.alphaTest = 0.5;
      m.transparent = false;
    }
    // a CLEAR sheet is strokes and nothing else, laid a couple of millimetres over the surface it
    // lights; the offset is there so the two never fight over a pixel at any distance the lens takes
    if (clear) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -2;
    }
    m.name = name;
    return m;
  };
  const struck = new Map();
  const once = (key, make) => {
    if (!struck.has(key)) struck.set(key, make());
    return struck.get(key);
  };
  // THE BOIL. Two drawings of the same thing struck from two seeds, one of them visible on each
  // 12 fps step — egg-fine.js's arrangement, and the reason is its reason: a canvas re-cut twelve
  // times a second is a canvas re-cut twelve times a second, and there are thirty sheets down here.
  // …AND THE BREATH, which rides the same arrangement: a sheet with a `layer` is shown only while the
  // breath is at that level or over it (THE BREATH, at the head of this file). Layer 0 is the light
  // at its lowest and is always there; 1 and 2 are clear sheets over it with the rest of the reach.
  const twos = [];
  function pair(parent, name, make, geo, place, opts = {}) {
    const out = [0, 1].map((b) => {
      const m = new THREE.Mesh(geo(), sheet(make(b), `${name}-${b}`, opts));
      m.name = `${name}-${b}`;
      m.castShadow = m.receiveShadow = false;
      place(m);
      parent.add(m);
      return m;
    });
    out.layer = opts.layer ?? 0;
    twos.push(out);
    return out;
  }

  // ---- 1. THE HOLE IN THE FLOOR ------------------------------------------------------------------
  // Index surgery on the room's own merged floor: the triangles inside the cut come out of the index
  // and are kept, and go back when the hatch shuts. Positions, normals and UVs are never touched.
  let floorMesh = null, wholeIndex = null, holedIndex = null, cutStats = null;
  function findFloor() {
    if (floorMesh) return floorMesh;
    const m = ctx.scene?.getObjectByName('room:floor') ?? null;
    if (!m?.geometry?.index) return null;
    floorMesh = m;
    wholeIndex = m.geometry.index;
    const pos = m.geometry.attributes.position;
    const keep = [];
    let dropped = 0;
    const inCut = (i) => {
      const x = pos.getX(i), z = pos.getZ(i);
      return x >= CUT.x0 - WARP && x <= CUT.x1 + WARP && z >= CUT.z0 - WARP && z <= CUT.z1 + WARP;
    };
    for (let t = 0; t < wholeIndex.count; t += 3) {
      const a = wholeIndex.getX(t), b = wholeIndex.getX(t + 1), c = wholeIndex.getX(t + 2);
      if (inCut(a) && inCut(b) && inCut(c)) {
        dropped++;
        continue;
      }
      keep.push(a, b, c);
    }
    holedIndex = new THREE.BufferAttribute(new Uint32Array(keep), 1);
    cutStats = { dropped, kept: keep.length / 3, rect: { ...CUT } };
    return floorMesh;
  }
  function holeOpen(want) {
    const m = findFloor();
    if (!m) return false;
    const wanted = want ? holedIndex : wholeIndex;
    if (m.geometry.index !== wanted) {
      m.geometry.setIndex(wanted);
      m.geometry.index.needsUpdate = true;
    }
    return true;
  }

  // ---- 2. THE MOUTH ------------------------------------------------------------------------------
  // HOW FAR THE SHEET REACHES OVER THE BOARDS, and it is as little as it can be. The light itself
  // reaches ONE BOARD past the opening — 260 mm, room-textures.js's own mean board — so the sheet has
  // to carry that, plus the 50 and 100 mm of grid the floor's own hole is bigger by, and then stop:
  // its rim is a SEAM between two drawings of the same boards, and every millimetre past the light is
  // a millimetre of that seam in the open. 215 mm from the grid is 265 in x and 315 in z, which puts
  // the join five millimetres outside the last hatch stroke on one axis and a board's width on the
  // other, and that is where a join belongs.
  const MOUTH_PAD = 0.215;
  const MO = { x0: CUT.x0 - MOUTH_PAD, x1: CUT.x1 + MOUTH_PAD, z0: CUT.z0 - MOUTH_PAD, z1: CUT.z1 + MOUTH_PAD };
  const MW = MO.x1 - MO.x0, MD = MO.z1 - MO.z0;
  // A SHEET LYING ON THE FLOOR has its canvas top at the UPSTAGE edge: rotated -90 about x, the
  // plane's own +y goes to world -z, and a canvas's first row is the texture's v = 1. So a z turned
  // into (z - z0) / depth is already the right way up, and nothing here is flipped.
  const vOf = (z0, d) => (z) => (z - z0) / d;
  const holeUV = { u0: (HATCH.x0 - MO.x0) / MW, u1: (HATCH.x1 - MO.x0) / MW, v0: vOf(MO.z0, MD)(HATCH.z0), v1: vOf(MO.z0, MD)(HATCH.z1) };
  const mouth = pair(
    root,
    'cellar-mouth',
    (b) => drawMouth({ w: MW, h: MD, ppm: PPM_MOUTH, penM: PEN_M, hole: holeUV, seams: seamsBetween(MO.z0, MO.z1).map(vOf(MO.z0, MD)), boil: b }),
    () => new THREE.PlaneGeometry(MW, MD),
    (m) => {
      m.rotation.x = -Math.PI / 2;
      // …AND IT STANDS 9 mm OVER THE BOARDS AND NOT 1.5. room-build.js warps every vertex of the set
      // after merging it, and on the floor that is +/- 6.6 mm of vertical wander: a sheet laid a
      // millimetre and a half over nominal is UNDER the boards wherever they bulge, and comes and
      // goes in patches. Nine clears the warp everywhere.
      m.position.set((MO.x0 + MO.x1) / 2, 0.009, (MO.z0 + MO.z1) / 2);
    },
    // …and it takes the room's own LIT TONE, which every other sheet in this egg refuses. A drawing
    // flagged `hatch: 0.02` is below ink-shaders.js's own 0.11 cut and takes none at all — right for
    // a wall down a hole the parlour's light never reaches, and wrong for a board lying in the
    // parlour beside five square metres of identical board at `hatch: 0.3`, where it came out as a
    // pale rectangle somebody had laid on the floor. 0.12 is the first step over that cut: the
    // lightest level of tone there is, which is what the boards round it are carrying.
    { hatch: 0.12 },
  );
  // …AND THE LIGHT ON THEM, on three clear sheets over the mouth: layer 0 the lip and the first of
  // it, always there; 1 and 2 the rest of the reach, shown as the breath comes up (drawSpill). Each
  // is cut to what its own layer can reach, so the far one is the only big one, and it is struck a
  // little coarser because its marks are the few, long, blood-dark ones at the end of the light.
  const SPILL = [
    { x0: HATCH.x0 - 0.22, x1: HATCH.x1 + 0.22, z0: HATCH.z0 - 0.09, z1: HATCH.z1 + 0.15, ppm: PPM_SPILL },
    { x0: HATCH.x0 - 0.55, x1: HATCH.x1 + 0.55, z0: HATCH.z0 - 0.18, z1: HATCH.z1 + 0.32, ppm: PPM_SPILL },
    { x0: HATCH.x0 - 0.95, x1: HATCH.x1 + 1.2, z0: HATCH.z0 - 0.25, z1: HATCH.z1 + 0.58, ppm: 340 },
  ];
  SPILL.forEach((R, L) =>
    pair(
      root,
      `cellar-spill-${L}`,
      (b) => drawSpill({ rect: SPILL[2], clip: R, ppm: R.ppm, penM: PEN_M, layer: L, boil: b }),
      () => new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0),
      (m) => {
        m.rotation.x = -Math.PI / 2;
        m.position.set((R.x0 + R.x1) / 2, 0.011, (R.z0 + R.z1) / 2);
      },
      { clear: true, cut: false, layer: L },
    ),
  );

  // ---- 3. THE LID --------------------------------------------------------------------------------
  // Two sheets back to back on a pivot at the hinge, because past the vertical the room is looking at
  // the other face of it — the door's own arrangement (egg-cross-draw.js), for the door's own reason.
  // THE PIVOT IS AT THE BOARDS' OWN SURFACE, y = 0, and the lid hangs UNDER it: shut, its top is
  // flush with the floor and its 24 mm is in the rebate; turned over, the same 24 mm is standing on
  // the boards and the underside is the face looking at the ceiling. A pivot at the lid's middle
  // would have left it half sunk in the floor at the end of the swing.
  const lid = new THREE.Group();
  lid.name = 'cellar-lid';
  lid.position.set(HATCH.hinge, 0, (HATCH.z0 + HATCH.z1) / 2);
  root.add(lid);
  const lidV = vOf(HATCH.z0, HD);
  const lidSeams = seamsBetween(HATCH.z0, HATCH.z1).map(lidV);
  const lidTop = pair(
    lid,
    'cellar-lid-top',
    (b) => drawLidTop({ w: HW, h: HD, ppm: PPM_LID, penM: PEN_M, seams: lidSeams, boil: b }),
    () => new THREE.PlaneGeometry(HW, HD),
    (m) => {
      m.rotation.x = -Math.PI / 2;
      m.position.set(HW / 2, 0, 0);
    },
  );
  // …and the underside, whose canvas top lands DOWNSTAGE (rotated +90 about x, the plane's own +y
  // goes to world +z), so its seams are the lid's read the other way round.
  pair(
    lid,
    'cellar-lid-under',
    (b) => drawLidUnder({ w: HW, h: HD, ppm: PPM_LID, penM: PEN_M, seams: lidSeams.map((v) => 1 - v), boil: b }),
    () => new THREE.PlaneGeometry(HW, HD),
    (m) => {
      m.rotation.x = Math.PI / 2;
      m.position.set(HW / 2, -HATCH.thick, 0);
    },
  );
  // …and the breath across it: the same rake reaching further over the board, on two clear sheets
  // a couple of millimetres off its face
  for (const L of [1, 2])
    pair(
      lid,
      `cellar-lid-glow-${L}`,
      (b) => drawLidUnder({ w: HW, h: HD, ppm: PPM_LID, penM: PEN_M, seams: lidSeams.map((v) => 1 - v), boil: b, layer: L }),
      () => new THREE.PlaneGeometry(HW, HD),
      (m) => {
        m.rotation.x = Math.PI / 2;
        m.position.set(HW / 2, -HATCH.thick - 0.002, 0);
      },
      { clear: true, cut: false, layer: L },
    );
  // the EDGE of it, which is the one thing a pair of flat sheets cannot say: 24 mm of board, so that
  // at the top of the swing the lid is a board and not a leaf of paper. Seen edge-on only, so it
  // carries no drawing and takes the room's own tone.
  const lidEdge = new THREE.Mesh(
    new THREE.PlaneGeometry(HW, HATCH.thick),
    (() => {
      const m = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, metalness: 0, side: THREE.DoubleSide });
      m.userData.ink = { hatch: 0.5, lineWeight: 1, colorful: false };
      m.name = 'cellar-lid-edge';
      return m;
    })(),
  );
  lidEdge.name = 'cellar-lid-edge';
  lidEdge.position.set(HW / 2, -HATCH.thick / 2, HD / 2);
  lidEdge.castShadow = lidEdge.receiveShadow = false;
  lid.add(lidEdge);

  // ---- 4. THE WELL AND THE FLIGHT ----------------------------------------------------------------
  // Real quads standing in real space below the floor, so a lens looking into the hole is looking at
  // depth and not at a picture of depth.
  const well = new THREE.Group();
  well.name = 'cellar-well';
  root.add(well);
  const DEEP = 0 - WELL.y; // 1.52 m from the boards to the cellar's floor
  const wallGeo = (w) => () => new THREE.PlaneGeometry(w, DEEP);
  // the near and far walls are never on the glass and are one drawing between them; the left has its
  // back to the fire; the right faces it (drawWell)
  const wall = (name, w, place, mode = 'dark', zAt) =>
    pair(well, name, (b) => (mode === 'dark' && w === HW ? once(`end-${b}`, () => drawWell({ w, h: DEEP, ppm: PPM_WELL, penM: PEN_M, boil: b })) : drawWell({ w, h: DEEP, ppm: PPM_WELL, penM: PEN_M, boil: b, mode, zAt, seed: mode === 'hot' ? 6599 : 6577 })), wallGeo(w), place, { cut: false });
  const MIDX = (HATCH.x0 + HATCH.x1) / 2;
  wall('cellar-wall-near', HW, (m) => {
    m.rotation.y = Math.PI;
    m.position.set(MIDX, WELL.y + DEEP / 2, WELL.z1);
  });
  wall('cellar-wall-far', HW, (m) => m.position.set(MIDX, WELL.y + DEEP / 2, WELL.z0));
  wall('cellar-wall-left', WELL.z1 - WELL.z0, (m) => {
    m.rotation.y = Math.PI / 2;
    m.position.set(WELL.x0, WELL.y + DEEP / 2, (WELL.z0 + WELL.z1) / 2);
  });
  // the right wall's canvas runs upstage to downstage (rotated -90 about y, the plane's own +x goes to
  // world +z), and the left wall's the other way
  const LEN = WELL.z1 - WELL.z0;
  const zRight = (u) => WELL.z0 + u;
  wall('cellar-wall-right', LEN, (m) => {
    m.rotation.y = -Math.PI / 2;
    m.position.set(WELL.x1, WELL.y + DEEP / 2, (WELL.z0 + WELL.z1) / 2);
  }, 'hot', zRight);
  // …and the breath on it: two clear sheets over the part of it a ray through the mouth can reach,
  // with the course-hatch and the licks that climb higher up the stone on a surge
  const U0 = 0.25 - WELL.z0, U1 = LEN;
  for (const L of [1, 2])
    pair(
      well,
      `cellar-wall-glow-${L}`,
      (b) => drawWell({ w: LEN, h: DEEP, ppm: 300, penM: PEN_M, boil: b, mode: 'hot', zAt: zRight, seed: 6599, layer: L, u0: U0, u1: U1 }),
      () => new THREE.PlaneGeometry(U1 - U0, DEEP),
      (m) => {
        m.rotation.y = -Math.PI / 2;
        m.position.set(WELL.x1 - 0.002, WELL.y + DEEP / 2, WELL.z0 + (U0 + U1) / 2);
      },
      { clear: true, cut: false, layer: L },
    );
  // THE FLOOR OF THE CELLAR, and it runs the WHOLE length of the well rather than being a landing at
  // the end of it. The first cut laid a 550 mm landing at the foot of the flight and left everything
  // downstage of it open, which was a hole in the drawing and not in the floor: the steepest ray
  // through the mouth — the one that enters at the near seam — passes UNDER the whole flight without
  // meeting a tread or a riser, and a good third of what the lens sees through the opening is that
  // ray and its neighbours. They found nothing and came back as bare paper, so the bottom of the hole
  // was a white gap under the stair. A cellar has a floor, the stair stands on it, and that ray lands
  // on it 1.52 m down and a metre upstage.
  pair(
    well,
    'cellar-floor',
    // wall to wall, and not the stair's width: a floor 780 mm wide in a 900 mm well left a white slot
    // down each side of the picture where the rays found nothing at all
    (b) => drawTread({ w: HW, h: WELL.z1 - WELL.z0, ppm: PPM_WELL, penM: PEN_M, boil: b, seed: 7001, floor: true }),
    () => new THREE.PlaneGeometry(HW, WELL.z1 - WELL.z0),
    (m) => {
      m.rotation.x = -Math.PI / 2;
      m.position.set(MIDX, WELL.y, (WELL.z0 + WELL.z1) / 2);
    },
  );
  // THE FLIGHT. Six treads and six risers going upstage and down from the hatch's far seam. The
  // treads are 780 mm wide in a 900 mm well, so there is a hand's width of wall either side of them,
  // which is what says the well is masonry and the stair is joinery standing in it.
  for (let n = 1; n <= STAIR.steps; n++) {
    const y = -n * STAIR.rise;
    const z = HATCH.z0 - n * STAIR.going;
    pair(
      well,
      `cellar-tread-${n}`,
      (b) => drawTread({ w: STAIR.width, h: STAIR.going, ppm: PPM_WELL, penM: PEN_M, boil: b, seed: 6701 + n * 37 }),
      () => new THREE.PlaneGeometry(STAIR.width, STAIR.going),
      (m) => {
        m.rotation.x = -Math.PI / 2;
        m.position.set(MIDX, y, z + STAIR.going / 2);
      },
    );
    // A RISER FACES THE ROOM, WHICH IS NOT WHAT IT DID FIRST. A PlaneGeometry faces +z and this one
    // was turned a half turn about y to "face into the well" — which pointed it at the far wall and
    // let the renderer cull it, so the whole flight came out as a stack of pale treads with nothing
    // between them and read as four shelves rather than as a stair going down. It is also the wrong
    // way round on the arithmetic: at the lean's 30 degrees a 190 mm riser projects 165 mm of glass
    // and a 230 mm tread projects 115, so the RISERS are most of what there is to see down there —
    // and they are the surfaces the light is square on to, which is why the hole is red.
    pair(
      well,
      `cellar-riser-${n}`,
      (b) => drawTread({ w: STAIR.width, h: STAIR.rise, ppm: PPM_WELL, penM: PEN_M, boil: b, riser: true, seed: 6803 + n * 41 }),
      () => new THREE.PlaneGeometry(STAIR.width, STAIR.rise),
      (m) => m.position.set(MIDX, y + STAIR.rise / 2, z + STAIR.going),
    );
  }
  // THE WAY DOWN. The flight lands on that floor 1.24 m under the parlour and the cellar goes on from
  // there, off to stage left through the wall the well's own side stands in — and none of that is
  // drawn, because none of it can be seen: the floor's far edge cuts the sight line off four treads
  // down, which is the turning out of sight the brief asked for and is had for nothing. Everything
  // past the fourth tread is the room the user said we could think about building down here, and it
  // is not built and not started: a walk into the cellar begins HERE, at `api.bottom`, which is the
  // foot of the flight on the cellar's own floor, heading `api.turn`.

  // ---- 5. THE SHOT THE ROOM LOOKS DOWN IT FROM ---------------------------------------------------
  // 30.1 degrees below the horizontal, 3.63 m out; see the head of this file for why it is 30 and not
  // 20 or 60. The fov is solved for the window so the mouth is WHOLLY in the frame with a margin at
  // every shape, which on a phone held upright means fitting the width and letting the room stand
  // above and below it.
  // …AND IT TAKES IN THE OPEN LID AS WELL AS THE HOLE, which the first cut of it did not and should
  // have: the lid lands on the boards to stage left with the light raking across its underside, and
  // a frame fitted to the hole alone put that entirely off the left of the glass. The fit is the
  // hole plus the near 56% of the lid — the half the rake is on, since the rake comes from the hinge
  // edge and that edge is the one against the hole — so the lens leans forward and 250 mm to the
  // left, which is also simply where a person leans to look down a hole beside their own feet.
  // …AND A PHONE HELD UPRIGHT GETS THE HOLE ALONE. Solved on the same fit, a 1.40 m subject in a
  // frame 0.46 wide as it is tall opens the lens to 67 degrees and leaves the hatch 172 px across the
  // bottom third of a 390 px glass — in frame, and too small to see a stair in. A portrait frame has
  // no room for the lid AND the hole, so it is given the hole: 0.90 m, which is 69% of its width. The
  // lens shifts with the fit, so on a phone it leans straight down its own centre line and on a
  // laptop it leans 250 mm to the left, which is where the lid is.
  const fitFor = (A) => ({ x0: A < 1 ? HATCH.x0 : HATCH.hinge - HW * 0.56, x1: HATCH.x1, z0: Z0, z1: Z1 });
  // AND IT LEANS FROM A LONG WAY BACK, which the first two cuts of this got wrong twice. A pose
  // 2.4 m off the hole with the hatch filling four fifths of the glass puts 1100 px of drawing on
  // every metre of it — four times the 250 the rest of this room is drawn at — and every mark in the
  // cellar came out four times its own size: the coursing read as brickwork in a cartoon, the tone
  // on a tread read as static, and the spill on the boards read as a rug. THE PEN HAS A SIZE AND IT
  // IS THE ROOM'S. From 3.63 m with the fit 45% wider than the hatch, the hole is 43% of a 1280 frame
  // and the cellar is drawn at about 600 px to the metre — still the nearest thing in the film, and
  // near enough to the room's own hand that it is the same hand. It also puts the PARLOUR back round
  // the hole, which is the better picture anyway: a hole in a floor is only frightening if you can
  // see the floor.
  // AND IT AIMS AT THE HOLE'S OWN MIDDLE, ON THE FLOOR. Aiming at a point below the boards — which
  // is what "look down it" first meant here — drags the whole frame down and leaves the hatch riding
  // in the top third of the glass with three fifths of the picture bare floor. The lens looks at the
  // middle of the opening, the frame is solved round that, and what is over and under it is the
  // parlour, evenly.
  // 44 degrees, solved rather than typed: the eye stands EYE_Y up and the arithmetic puts it where
  // that is 44 degrees over the middle of the opening. Move the hatch and the lens follows it.
  const LEAN_DEG = 44;
  const EYE_Y = 1.82;
  const LOOK_Z = +((Z0 + Z1) / 2).toFixed(4);
  const EYE_Z = +(LOOK_Z + EYE_Y / Math.tan((LEAN_DEG * Math.PI) / 180)).toFixed(4);
  const MARGIN = 1.45; // …and the fit is 45% wider than the thing fitted
  const _f = new THREE.Vector3(), _r = new THREE.Vector3(1, 0, 0), _u = new THREE.Vector3(), _p = new THREE.Vector3();
  function cellarShot(aspect) {
    const A = Math.max(0.05, aspect);
    const fit = fitFor(A);
    const fx = (fit.x0 + fit.x1) / 2;
    const EYE = [fx, EYE_Y, EYE_Z];
    const LOOK = [fx, 0, LOOK_Z];
    const eye = new THREE.Vector3(...EYE);
    _f.set(...LOOK).sub(eye).normalize();
    _u.crossVectors(_r, _f).normalize();
    let tw = 0, th = 0;
    for (const x of [fit.x0, fit.x1])
      for (const z of [fit.z0, fit.z1]) {
        _p.set(x, 0, z).sub(eye);
        const d = _p.dot(_f);
        if (d <= 0.01) continue;
        tw = Math.max(tw, Math.abs(_p.dot(_r)) / d);
        th = Math.max(th, Math.abs(_p.dot(_u)) / d);
      }
    const t = Math.max(th, tw / A) * MARGIN;
    return { pos: [...EYE], look: [...LOOK], fov: 2 * Math.atan(t) * (180 / Math.PI), shift: [0, 0] };
  }
  // camera.js empties and refills its own `shots` table whenever the window changes shape, so the
  // shot is re-injected on every drawing it is missing from. That is egg-cross.js's arrangement with
  // lighting.js's states, and it is here for the same reason: a piece that owns a frame has to go on
  // owning it across a resize.
  let shotAt = null;
  function injectShot() {
    const C = ctx.pieces.camera;
    if (!C?.shots) return false;
    const a = (ctx.size?.w || window.innerWidth) / (ctx.size?.h || window.innerHeight);
    if (!C.shots.cellar || shotAt == null || Math.abs(a - shotAt) > 0.002) {
      C.shots.cellar = cellarShot(a);
      shotAt = a;
    }
    return true;
  }

  // ---- 5b. WHAT COMES UP OUT OF IT ----------------------------------------------------------------
  // A handful of scraps with a spark or a curl drawn on them (drawEmber), laid out against THE BREATH
  // once: two to four go up on every surge, and one on a long hold now and then. Each starts down the
  // well where the lens can see it — upstage, against the far seam, since the near boards hide the
  // deep part of the near side — goes up past the lip on the twelves, easing as it goes, and dies a
  // hand's breadth over the boards. AND NO HIGHER, which is a measurement and not a taste: from the
  // visitor's own chair the proof asks that no red sits above the line the spill reaches on the
  // boards, and the top of a curl's scrap 0.2 m over the far seam is over it; at 0.14 it is under it.
  const EMBER_PPM = 420;
  const emberTex = {};
  for (const kind of Object.keys(EMBER))
    emberTex[kind] = Array.from({ length: EMBER[kind].n }, (_, f) => {
      const t = canvasTexture(drawEmber(kind, f, { ppm: EMBER_PPM, penM: PEN_M }));
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    });
  const SPARKS = (() => {
    const lay = mulberry32(7433);
    const out = [];
    // the deepest a mark at this z can start and still be seen past the near seam from the lean
    const floorOf = (z) => Math.max(-0.72, EYE_Y - ((EYE_Y - 0) * (EYE_Z - z)) / (EYE_Z - (HATCH.z1 - 0.05)) + 0.06);
    const one = (born, lone) => {
      const kind = lay() < (lone ? 0.65 : 0.4) ? 'curl' : 'spark';
      const z = HATCH.z0 + 0.05 + lay() * 0.26;
      return {
        born, kind, z,
        life: kind === 'curl' ? 12 + Math.floor(lay() * 6) : 9 + Math.floor(lay() * 5),
        x: MIDX + (lay() - 0.5) * 0.6,
        y0: floorOf(z) + lay() * 0.12,
        y1: 0.005 + lay() * 0.05,
        sway: (lay() - 0.5) * 0.06,
        ph: lay() * 6.28,
      };
    };
    let t = 0;
    for (const [lv, n] of BREATH) {
      if (lv === 2) {
        const k = 2 + Math.floor(lay() * 3);
        for (let i = 0; i < k; i++) out.push(one(t + Math.floor(lay() * Math.min(n, 3)), false));
      } else if (lv === 1 && n >= 10 && lay() < 0.7) out.push(one(t + 3 + Math.floor(lay() * (n - 6)), true));
      t += n;
    }
    return out;
  })();
  const ageOf = (n, e) => (((n - e.born) % BREATH_N) + BREATH_N) % BREATH_N;
  let POOL = 0;
  for (let n = 0; n < BREATH_N; n++) POOL = Math.max(POOL, SPARKS.filter((e) => ageOf(n, e) < e.life).length);
  const embers = new THREE.Group();
  embers.name = 'cellar-embers';
  root.add(embers);
  const pool = Array.from({ length: POOL }, (_, i) => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5 });
    m.userData.ink = { hatch: 0.02, lineWeight: 0, colorful: true };
    m.name = `cellar-ember-${i}`;
    const geos = Object.fromEntries(Object.entries(EMBER).map(([k, K]) => [k, new THREE.PlaneGeometry(K.w, K.h)]));
    const mesh = new THREE.Mesh(geos.spark, m);
    mesh.userData.geos = geos;
    mesh.name = `cellar-ember-${i}`;
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.visible = false;
    embers.add(mesh);
    return mesh;
  });
  const _q = new THREE.Quaternion();
  let risen = 0;
  function rise(n) {
    const live = SPARKS.filter((e) => ageOf(n, e) < e.life);
    risen = live.length;
    // a scrap always faces the lens, whatever the room is doing with it
    if (ctx.camera) {
      embers.parent?.updateMatrixWorld?.();
      embers.parent?.getWorldQuaternion?.(_q);
      _q.invert().multiply(ctx.camera.quaternion);
    }
    pool.forEach((mesh, i) => {
      const e = live[i];
      mesh.visible = !!e;
      if (!e) return;
      const age = ageOf(n, e), t = age / e.life;
      const K = EMBER[e.kind];
      mesh.geometry = mesh.userData.geos[e.kind];
      const tex = emberTex[e.kind][Math.min(K.n - 1, Math.floor(t * K.n))];
      if (mesh.material.map !== tex) {
        mesh.material.map = tex;
        mesh.material.needsUpdate = true;
      }
      mesh.position.set(e.x + e.sway * Math.sin(e.ph + age * 0.55), e.y0 + (e.y1 - e.y0) * (1 - Math.pow(1 - t, 1.5)), e.z);
      mesh.quaternion.copy(_q);
    });
  }

  // ---- 6. the boxes on the glass -----------------------------------------------------------------
  const _v = new THREE.Vector3();
  function boxOfRect({ x0, x1, z0, z1 }, y = 0) {
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    for (const x of [x0, x1])
      for (const z of [z0, z1]) {
        _v.set(x, y, z).project(ctx.camera);
        if (_v.z > 1) return null;
        xs.push(((_v.x + 1) / 2) * W);
        ys.push(((1 - _v.y) / 2) * H);
      }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  const MIN_TAP = 44;
  const hitBox = () => (root.visible ? boxOfRect(HATCH) : null);
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w2 = Math.max(b.w, MIN_TAP), h2 = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w2 / 2, y: b.y + b.h / 2 - h2 / 2, w: w2, h: h2, grown: w2 > b.w || h2 > b.h };
  }
  // …and the box the whole thing occupies, lid and all, which is what a proof counts red inside and
  // outside of. The open lid lies a metre to stage left of the hole and the spill is on the boards
  // round it, so neither is inside `hitBox`.
  // …AND THE LIGHT NOW REACHES FURTHER THAN THE MOUTH SHEET, along the boards and on the breath, so
  // the box is the mouth and the lid OR the furthest the spill can reach, whichever is bigger
  const seenBox = () => boxOfRect({ x0: Math.min(MO.x0 - HW, SPILL[2].x0), x1: Math.max(MO.x1, SPILL[2].x1), z0: Math.min(MO.z0, SPILL[2].z0), z1: Math.max(MO.z1, SPILL[2].z1) });

  // ---- 7. the drawing, and the state ---------------------------------------------------------------
  let shown = false;
  let theta = 0;
  let boil = 0;
  let level = 1;
  let drawing = 0;
  // one call a drawing (egg-cross.js hands it the clock's frame): which of the two boils, how far the
  // breath has the light reaching, and where everything coming up out of it has got to
  function showBoil(n) {
    drawing = n | 0;
    boil = drawing & 1;
    level = breathAt(drawing);
    for (const two of twos) {
      const on = level >= two.layer;
      two[0].visible = on && boil === 0;
      two[1].visible = on && boil === 1;
    }
    rise(drawing);
  }
  function setLid(deg) {
    theta = (deg * Math.PI) / 180;
    lid.rotation.z = theta; // about the hinge, which is the constant-x cut at its stage-left edge
  }
  function show(on) {
    if (shown === on) return;
    shown = on;
    root.visible = on;
    holeOpen(on);
  }
  showBoil(0);
  setLid(0);

  const api = {
    hatch: { ...HATCH },
    well: { ...WELL },
    stair: { ...STAIR, run: +(STAIR.steps * STAIR.going).toFixed(3), pitch: +((Math.atan(STAIR.rise / STAIR.going) * 180) / Math.PI).toFixed(1), beyond: LANDING },
    mouth: { ...MO },
    // WHAT IS DOWN THERE, for the room that is not built yet
    bottom: [MIDX, WELL.y, +(HATCH.z0 - STAIR.steps * STAIR.going - 0.2).toFixed(4)],
    turn: [-1, 0, 0], // the cellar goes off the foot of the flight to stage left
    red: { one: CELLAR_R, mid: RED_MID, hot: HOT, blood: BLOOD },
    // the breath: [level, drawings] on a loop, and where it is now; and how many sparks are up
    breath: { script: BREATH.map((r) => [...r]), length: BREATH_N, at: breathAt },
    get level() {
      return level;
    },
    get sparks() {
      return root.visible ? risen : 0;
    },
    spill: SPILL.map((R) => ({ ...R })),
    seams: [...SEAMS],
    poses: { open: [...LID_OPEN], shut: [...LID_SHUT], land: LID_LAND },
    shot: () => cellarShot((ctx.size?.w || window.innerWidth) / (ctx.size?.h || window.innerHeight)),
    get open() {
      return shown;
    },
    get lid() {
      return +((theta * 180) / Math.PI).toFixed(1);
    },
    get holed() {
      return !!floorMesh && floorMesh.geometry.index === holedIndex;
    },
    get cut() {
      findFloor();
      return cutStats ? { ...cutStats } : null;
    },
    hitBox,
    tapBox,
    seenBox,
    show,
    setLid,
    boil: showBoil,
    injectShot,
    // the hatch is a switch of its own once it is open: a tap on it puts the whole thing back, which
    // is the second half of the user's own "a second click puts it back". egg-cross.js owns what that
    // click DOES, because it owns the cross that has to right itself with it.
    switchOn: (onDown, enabled) =>
      switches?.add?.({
        name: 'cellar',
        object: () => mouth[boil],
        tapBox,
        hit: (px, py) => {
          const b = tapBox();
          return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
        },
        enabled,
        onDown,
      }),
  };
  return api;
}
