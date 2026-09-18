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
const PPM_MOUTH = 260; // the spill on the boards: a wash with no fine marks in it

// ====================================================================================================
// THE DRAWINGS
// ====================================================================================================

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

// 2. THE LID, FROM UNDERNEATH, WITH THE LIGHT ON IT. This is the face the room sees for the whole of
// the second half of the swing and for as long as the hatch is open, and it is where the red does its
// plainest work: the glow comes out of the mouth, so it rakes across this board FROM THE HINGE EDGE
// (u = 0) and dies two thirds of the way over. Under that, the two ledges and their clout nails,
// which are the whole of what is on the back of a trapdoor.
export function drawLidUnder({ w, h, ppm, penM, seams, seed = 6317, boil = 0 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 1361);
  const pen = penM * ppm;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  // the light: three plates of the one red laid from the hinge edge, each thinner than the last, and
  // they are SHORT. A lid lying flat on the boards a hand's width from the hole gets a rake and not
  // a wash: the first cut of this reached three quarters of the way across and the whole board came
  // out red, which is a painted trapdoor and not a lit one. The strong plate is a fifth of the width
  // and the last of it is gone by half. The edge of each BOWS — furthest across the middle of the
  // lid, falling back at the head and the foot — which is what a beam through a rectangular hole
  // does to a board leaning past it.
  const plate = (reach, col) => {
    const edge = [];
    const n = 11;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bow = Math.sin(Math.PI * t);
      edge.push([W * reach * (0.46 + 0.54 * bow) + (rng() - 0.5) * pen * 1.2, H * t]);
    }
    poly(g, [[0, 0], ...edge, [0, H]], { width: 0, rng, close: true, fill: col });
  };
  plate(0.28, RED_MID);
  plate(0.13, CELLAR_R);
  boards(g, W, H, pen, rng, { seams, alpha: 0.9 });
  for (const v of [0.26, 0.74]) {
    const y = v * H, t = pen * 2.6;
    frame(g, [[pen * 1.5, y - t], [W - pen * 1.5, y - t], [W - pen * 1.5, y + t], [pen * 1.5, y + t]], { width: pen * 0.8, wobble: pen * 0.35, rng });
    for (let i = 0; i < 3; i++) {
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(W * (0.16 + i * 0.34), y, pen * 0.42, pen * 0.34, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  frame(g, [[pen, pen], [W - pen, pen], [W - pen, H - pen], [pen, H - pen]], { width: pen * 1.15, wobble: pen * 0.45, rng });
  return c;
}

// 3. THE MOUTH: the boards round the hole, and the light lying on them. One sheet, standing 1.5 mm
// over the floor — under the warp's own amplitude, so it never shows an edge against the boards it
// lies on — with the opening alpha-tested out of the middle of it. It does two jobs and the second is
// the reason it is a sheet at all: it closes the 50 and 100 mm of grid the floor's own hole is bigger
// by, in the floor's own drawing.
export function drawMouth({ w, h, ppm, penM, hole, seams, seed = 6449, boil = 0 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 1543);
  const pen = penM * ppm;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  boards(g, W, H, pen, rng, { seams });
  // THE LIGHT LYING ON THE BOARDS, and it is a BAND ROUND THE OPENING and not a pool under it. Two
  // things decide that and both were learnt by looking at the first cut of this: a hole throws the
  // shape it IS, so an ellipse round a rectangle is a stain and a rounded rectangle is a spill; and
  // the reach is 90 and 210 mm, because at 1.3 and 1.6 of the hole — which is what it was — a
  // 900 by 687 mm opening lays a metre and a half of red across the middle of the room and the
  // parlour has a red carpet in it. The saturated plate is not on the boards at all. It is down the
  // well where the light is, and what reaches the floor is the two thin mixes.
  const band = (out, col) => {
    const x0 = hole.u0 * W - out, x1 = hole.u1 * W + out;
    const y0 = hole.v0 * H - out, y1 = hole.v1 * H + out;
    const r = out * 1.6; // the corners of a spill are round: light does not have corners
    const pts = [];
    const n = 11;
    const corner = (cx2, cy2, a0) => {
      for (let i = 0; i <= n; i++) {
        const a = a0 + (i / n) * (Math.PI / 2);
        pts.push([cx2 + Math.cos(a) * r * (1 + (rng() - 0.5) * 0.07), cy2 + Math.sin(a) * r * (1 + (rng() - 0.5) * 0.07)]);
      }
    };
    corner(x1 - r, y1 - r, 0);
    corner(x0 + r, y1 - r, Math.PI / 2);
    corner(x0 + r, y0 + r, Math.PI);
    corner(x1 - r, y0 + r, -Math.PI / 2);
    loop(g, pts, { width: 0, rng, fill: col });
  };
  const perM = W / w; // sheet pixels to the metre
  band(0.085 * perM, RED_MID);
  band(0.032 * perM, CELLAR_R);
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

// 4. THE WALL OF THE WELL. Rubble stone laid in courses, and the light on it: the red is strongest at
// the FOOT, because the light is down there, and the top of the wall — the course nearest the parlour
// — is nearly bare paper.
export function drawWell({ w, h, ppm, penM, seed = 6577, boil = 0 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 1721);
  const pen = penM * ppm;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  // the light, in bands from the foot up: the bottom fifth is the red itself and it is gone by two
  // thirds of the way to the boards
  const band = (v0, col) => {
    const pts = [];
    const n = 11;
    for (let i = 0; i <= n; i++) pts.push([(W * i) / n, H * v0 + (rng() - 0.5) * pen * 2.4]);
    poly(g, [...pts, [W, H], [0, H]], { width: 0, rng, close: true, fill: col });
  };
  band(0.62, RED_MID);
  band(0.85, CELLAR_R);
  // the coursing: rubble, so the beds wander and the perpends do not line up. It is struck at the
  // full nib and not under it, because a wall of stone seen through a hole a metre away is the
  // NEAREST drawing in the film and a wall whose lines are a contour wide reads as a wall in fog.
  const courses = Math.max(4, Math.round(h / 0.19));
  for (let r = 1; r < courses; r++) {
    const y = (H * r) / courses;
    inkLine(g, -4, y + (rng() - 0.5) * pen, W + 4, y + (rng() - 0.5) * pen * 2, { width: pen * 1.1, wobble: pen * 0.7, rng, alpha: 0.95, segments: 14 });
    let x = -rng() * W * 0.3;
    while (x < W) {
      x += W * (0.13 + rng() * 0.17);
      if (x > 0 && x < W) inkLine(g, x, y, x + (rng() - 0.5) * pen * 2.4, y + H / courses, { width: pen * 0.95, wobble: pen * 0.6, rng, alpha: 0.85, segments: 3 });
    }
  }
  // the damp: the two corners and the head of the wall, which is the part of it the light does not
  // reach at all. A wall with tone only at its edges is a wall with a hole in the middle of it.
  for (const x0 of [0, W * 0.82])
    hatchRect(g, x0, 0, W * 0.18, H, { angle: Math.PI / 2, spacing: pen * 3.6, width: pen * 0.5, wobble: pen * 0.7, broken: 0.5, rng, alpha: 0.32 });
  hatchRect(g, 0, 0, W, H * 0.3, { angle: Math.PI / 2, spacing: pen * 4.2, width: pen * 0.5, wobble: pen * 0.8, broken: 0.55, rng, alpha: 0.3 });
  return c;
}

// 5. A TREAD, and a RISER. The light is under the flight, so a riser faces it square on and is the
// reddest thing in the well; a tread has it only round the nose. The top of a tread is a board worn
// hollow in the middle by however many people have gone down it.
export function drawTread({ w, h, ppm, penM, seed = 6701, boil = 0, riser = false, floor = false }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + boil * 1867);
  const pen = penM * ppm;
  if (floor) {
    // THE FLOOR OF THE CELLAR, and at the lens's 44 degrees it is two thirds of what is down the
    // hole: the rays through the NEAR half of the mouth go furthest and land on it, so the flight
    // occupies the top of the opening and this occupies the rest. It is the room the light is IN, so
    // it is the mix laid flat rather than tone on paper — with the one red washed along the stage-
    // left edge, which is the way the cellar goes and therefore where the light is coming from, and
    // the far corner hatched over, because a lamp in one corner of a cellar does not reach the other.
    // Flags and not boards: four joints across and two along, struck heavy, because a cellar floor is
    // stone and the only thing that says so at this distance is the size of what it is laid in.
    g.fillStyle = RED_MID;
    g.fillRect(0, 0, W, H);
    const lit = [];
    const n = 9;
    for (let i = 0; i <= n; i++) lit.push([W * (0.30 + 0.16 * Math.sin((Math.PI * i) / n)) + (rng() - 0.5) * pen, (H * i) / n]);
    poly(g, [[0, 0], ...lit, [0, H]], { width: 0, rng, close: true, fill: CELLAR_R });
    hatchRect(g, 0, 0, W, H * 0.34, { angle: 0, spacing: pen * 2.4, width: pen * 0.65, wobble: pen * 0.7, broken: 0.35, rng, alpha: 0.75 });
    hatchRect(g, W * 0.72, 0, W * 0.28, H, { angle: 0, spacing: pen * 3.2, width: pen * 0.6, wobble: pen * 0.8, broken: 0.45, rng, alpha: 0.5 });
    for (let i = 1; i <= 4; i++) {
      const y = (H * i) / 5;
      inkLine(g, -4, y + (rng() - 0.5) * pen, W + 4, y + (rng() - 0.5) * pen * 2, { width: pen * 1.1, wobble: pen * 0.8, rng, alpha: 0.9, segments: 12 });
    }
    for (const u of [0.34, 0.68]) {
      const x = W * u + (rng() - 0.5) * pen * 2;
      inkLine(g, x, -4, x + (rng() - 0.5) * pen * 3, H + 4, { width: pen * 1.05, wobble: pen * 0.9, rng, alpha: 0.85, segments: 14 });
    }
    return c;
  }
  if (riser) {
    // A RISER FACES THE LIGHT SQUARE ON and is the reddest thing in the well, and it carries the
    // NOSING of the tread above it, which is the brightest: top to bottom, nine per cent of bare
    // paper, which is the nosing seen edge-on and lit from below; then a band of heavy hatch, which
    // is the shadow that nosing throws on the riser under it; and then the riser itself in the one
    // red. Bright line, dark band, red field, with a tread in shadow between each pair — which is
    // what a lit cellar stair looks like from the top of it, and only reads at all because the lens
    // is steeper than the flight (see the head of this file).
    g.fillStyle = CELLAR_R;
    g.fillRect(0, 0, W, H);
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H * 0.09);
    hatchRect(g, 0, H * 0.09, W, H * 0.17, { angle: 0, spacing: pen * 1.5, width: pen * 0.7, wobble: pen * 0.4, broken: 0.12, rng, alpha: 0.95 });
    inkLine(g, 0, H * 0.09, W, H * 0.09 + (rng() - 0.5) * pen, { width: pen * 1.1, wobble: pen * 0.4, rng, segments: 11 });
    inkLine(g, 0, H * 0.26, W, H * 0.26 + (rng() - 0.5) * pen, { width: pen * 0.7, wobble: pen * 0.6, rng, alpha: 0.6, segments: 9 });
    inkLine(g, 0, pen * 0.5, W, pen * 0.5 + (rng() - 0.5) * pen * 0.6, { width: pen * 0.8, wobble: pen * 0.3, rng, segments: 11 });
    inkLine(g, 0, H - pen * 0.7, W, H - pen * 0.7 + (rng() - 0.5) * pen, { width: pen * 0.8, wobble: pen * 0.5, rng, alpha: 0.8, segments: 10 });
    return c;
  }
  // A TREAD IS IN ITS OWN SHADOW, which is the whole reason this drawing exists and is not bare
  // paper with a line round it. The light is BELOW the flight: every tread has the one above it
  // between itself and the parlour and the one below it lighting nothing but its own underside, so
  // what the lens sees looking down the well is a stack of DARK bars with a red edge on each. The
  // first cut of this left them white and the stair came out as five floating shelves.
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  // ONE LEVEL OF TONE AND IT LIES ALONG THE TREAD, which is two corrections in one line. Two levels
  // of vertical hatch at a nib and a half apart came out, at this magnification, as a field of
  // static: the strokes were closer together than the eye could tell apart and the flight read as
  // interference. One level at four nibs, laid the way the board runs, reads as a board in shadow —
  // which is what it is, because the light is under the flight and every tread has the one above it
  // between itself and the parlour.
  hatchRect(g, 0, 0, W, H, { angle: 0, spacing: pen * 2.1, width: pen * 0.7, wobble: pen * 0.6, broken: 0.2, rng, alpha: 0.95 });
  hatchRect(g, 0, 0, W, H * 0.62, { angle: 0, spacing: pen * 2.6, width: pen * 0.65, wobble: pen * 0.7, broken: 0.3, rng, alpha: 0.8 });
  // …and the NOSE, which is the only lit thing on it: the light comes round the front edge from
  // underneath and stops a nib and a half in.
  poly(g, [[0, H - pen * 1.4], [W, H - pen * 1.4 + (rng() - 0.5) * pen], [W, H], [0, H]], { width: 0, rng, close: true, fill: CELLAR_R });
  inkLine(g, 0, H - pen * 1.4, W, H - pen * 1.4 + (rng() - 0.5) * pen, { width: pen * 0.9, wobble: pen * 0.5, rng, segments: 10 });
  frame(g, [[pen * 0.5, pen * 0.5], [W - pen * 0.5, pen * 0.5], [W - pen * 0.5, H - pen * 0.5], [pen * 0.5, H - pen * 0.5]], { width: pen * 0.85, wobble: pen * 0.4, rng });
  return c;
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
  const sheet = (canvas, name, { side = THREE.FrontSide, cut = true, hatch = 0.02 } = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0, side });
    m.userData.ink = { hatch, lineWeight: 0, colorful: true };
    const tex = canvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
    m.map = tex;
    if (cut) {
      m.alphaTest = 0.5;
      m.transparent = false;
    }
    m.name = name;
    return m;
  };
  // THE BOIL. Two drawings of the same thing struck from two seeds, one of them visible on each
  // 12 fps step — egg-fine.js's arrangement, and the reason is its reason: a canvas re-cut twelve
  // times a second is a canvas re-cut twelve times a second, and there are thirty sheets down here.
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
  // HOW FAR THE SHEET REACHES OVER THE BOARDS, and it is as little as it can be. The spill itself
  // reaches 85 mm past the hole; the sheet has to cover the 50 and 100 mm of grid the floor's own
  // hole is bigger by, and then stop — because its rim is a SEAM between two drawings of the same
  // boards and every millimetre past the light is a millimetre of that seam in the open. 120 mm
  // leaves 35 mm of it outside the spill's own falloff, which is where a join belongs.
  const MOUTH_PAD = 0.12;
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
  const wall = (name, w, place) => pair(well, name, (b) => drawWell({ w, h: DEEP, ppm: PPM_WELL, penM: PEN_M, boil: b }), wallGeo(w), place, { cut: false });
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
  wall('cellar-wall-right', WELL.z1 - WELL.z0, (m) => {
    m.rotation.y = -Math.PI / 2;
    m.position.set(WELL.x1, WELL.y + DEEP / 2, (WELL.z0 + WELL.z1) / 2);
  });
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
    (b) => drawTread({ w: STAIR.width, h: WELL.z1 - WELL.z0, ppm: PPM_WELL, penM: PEN_M, boil: b, seed: 7001, floor: true }),
    () => new THREE.PlaneGeometry(STAIR.width, WELL.z1 - WELL.z0),
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
  const seenBox = () => boxOfRect({ x0: MO.x0 - HW, x1: MO.x1, z0: MO.z0, z1: MO.z1 });

  // ---- 7. the drawing, and the state ---------------------------------------------------------------
  let shown = false;
  let theta = 0;
  let boil = 0;
  function showBoil(n) {
    boil = n & 1;
    for (const two of twos) {
      two[0].visible = boil === 0;
      two[1].visible = boil === 1;
    }
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
    red: { one: CELLAR_R, mid: RED_MID },
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
