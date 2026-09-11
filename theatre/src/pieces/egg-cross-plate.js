// WHERE THE CROSSROADS STANDS, AND WHERE THE CAMERA STANDS TO SEE IT.
//
// Round 1 hung the crossroads IN the doorway and the user threw it out in four words: "naw, this
// looks terrible - this doesn't work." He was right, and the fault was not the drawing. The meme is
// a picture and a doorway is a tall slot 0.81 m by 2.07. He chose the fix himself: go outside.
//
// Round 2 stood a drawn crossroads on a plate in the open air and CUT to it. He threw that out too,
// and named both faults in one sentence: "naw it still doesnt work - rather than a hard cut it
// should be a consistent camera pan towards the outside, but the meme doesnt work if you redraw it,
// it only works as an original. maybe you can just trace the outlines of the actual meme with our
// ink rather than trying to redraw it?"
//
// So round 3: the room WALKS out through its own door (src/pieces/egg-cross.js, and camera.js gained
// a dolly to do it with), and what it walks out to is HIS OWN COPY OF THE PICTURE, put through the
// room's pen by tools/trace-plate.mjs. Round 3 stood that traced square on a field of bare paper and
// opened the lens until the picture just FITTED, because a square picture in a 16:9 window either
// has paper round it or is cropped, and cropping this one takes both castles out of the corners.
//
// ------------------------------------------------------------------------------------------------
// ROUND 4 — THE PAPER IS GONE AND THE PICTURE IS THE MIDDLE OF A LANDSCAPE. The user, on round 3's
// frame: "can you make this actually full width so it fills the whole screen and is not just a
// square?" There is no third option between cropping and paper unless the drawing itself is bigger,
// so the drawing is bigger: tools/extend-plate.mjs carries the original's own country out to the
// edges of a sheet two and a half picture-widths across and two and a half deep, in the same pen,
// from six bands measured off the original's own edges. The lens then does BOTH things at once:
//
//   IT COVERS THE SHEET, so there is never paper at an edge at any window shape. That is the whole
//     of what the user asked for and it is the binding constraint at the extremes.
//   AND IT HOLDS THE WHOLE ORIGINAL, with a hold of 1.5 % of the frame, so the part somebody else
//     drew is never cut. That is the binding constraint everywhere a person actually watches this.
//
// The lens takes the SMALLER of the two, which means the picture is as large as it can be while
// whole, and if a window is ever so wide or so tall that the two cannot both be had, the frame stays
// full and the original gives up a little at the sides — because a picture with paper round it is
// the thing that was thrown out, and a window of 2.5:1 is not a thing anybody is watching this in.
//
//   at 1280x800  (A = 1.600)   fov 30.7 deg. The original's square stands centred at full height —
//                              97 % of it — with the country running on either side to the edges.
//   at 1920x1080 (A = 1.778)   fov 30.7 deg, the square 55 % of the width.
//   at 2560x1080 (A = 2.370)   fov 30.7 deg, the square 41 % of the width, and the sheet still
//                              covers: 12.22 m of frame inside a 12.60 m sheet.
//   at 390x844   (A = 0.462)   fov 61.6 deg. The square stands at full WIDTH with the sky carried on
//                              above it and the ground below, and the boy at 71 % down the frame.
//
// A WIDE LENS COSTS NOTHING HERE, which is why the phone's number is allowed to be what it is. A
// plane at right angles to the lens axis projects through a pinhole as a pure scale: there is no
// keystone, no stretch and no barrel in a flat sheet however wide the lens is, and a flat sheet is
// the only thing in this frame. What a wide lens WOULD distort is the parlour — so the walk out
// holds the room's own lens until it is through the doorway and opens to this one over the last
// stride (camera.js, the dolly's `fovEase`).
//
// THE DISTANCE, 9.40 m, is what makes the laptop's number 30.7 and not 48: at 6.28 m the same fit
// needed 48.6 deg on a laptop and 88.6 on a phone. 30.7 is within a degree of the lens the room
// itself is shot on, so the walk out barely changes focal length at all in the window most of this
// film is watched in.
//
// THE EYE stands at x 1.5 (the doorway's own centre line: room.js cuts the opening 1.05 to 1.95), at
// z −4.10 — a stride and a half OUTSIDE the wall. A dolly brakes into its mark, so wherever it stops
// is where it spends most of its drawings; stopping in the doorway spent five of them within half a
// metre of the sheet of weather standing in it, and a drawn sheet magnified twenty times is a smear.
// Stopping a metre and a half OUTSIDE, the camera crosses the threshold at full cruise — one
// drawing, the way a doorframe passes a lens — and does all its braking in the open air. 1.45 m is
// the height every other frontal shot of this door is taken from (camera-shots.js `door`).
//
// THE RESOLUTION. The sheet is 3628 px across and the original 1440 of them; at 1920 wide the
// original takes about 1050 px of glass, a third again fewer than it carries. That is the margin
// tools/trace-plate.mjs measures its nib against and the reason a diagonal on it is not a staircase.
//
// This file is READ by two pieces and owned by neither's drawing: src/pieces/egg-cross.js stands the
// plate here, and src/pieces/camera-shots.js stands the camera here. It holds numbers and two
// solvers, and the one thing it imports is the little module of numbers the trace tool writes — so
// the SHEET's shape and the ORIGINAL'S PLACE ON IT both follow the file, and a re-run of the tool
// with a different picture or a wider country re-frames the shot with no edit here at all.
import TRACE from './egg-cross-land.js';

// the sheet's own shape and where the original stands on it, from the tool that made both
const SHEET = Array.isArray(TRACE?.size) && TRACE.size.length === 2 ? TRACE.size : [1800, 1800];
const PIC = Array.isArray(TRACE?.picture) && TRACE.picture.length === 2 ? TRACE.picture : SHEET;
// …and its frame, in the sheet's own 0..1. A tool run with --no-extend writes the whole sheet here,
// so a plate with no country round it still solves: the original simply IS the sheet.
const F = TRACE?.frame ?? { u0: 0, v0: 0, u1: 1, v1: 1 };
const PIC_W = 5.0; // the ORIGINAL, in metres. Only its ratio to the distance matters; this sets both.
const PIC_H = PIC_W / (PIC[0] / PIC[1]);
const SHEET_W = PIC_W / Math.max(1e-6, F.u1 - F.u0);
const SHEET_H = PIC_H / Math.max(1e-6, F.v1 - F.v0);

export const PLATE = {
  eye: [1.5, 1.45, -4.1], // the camera, a stride and a half outside the wall on the doorway's centre line
  centre: [1.5, 1.45, -13.5], // …and the SHEET's own centre, 9.40 m straight out along the axis
  // the whole sheet, which is what the mesh is cut to
  w: SHEET_W,
  h: SHEET_H,
  ppm: SHEET[0] / SHEET_W, // px per metre the sheet carries: 288 on this one
  // the ORIGINAL inside it: its size in metres, and where its centre falls in the world. The two
  // are not the same point unless the tool put the picture dead centre, and nothing here assumes it.
  pic: {
    w: PIC_W,
    h: PIC_H,
    u0: F.u0, v0: F.v0, u1: F.u1, v1: F.v1,
    // the offset of the picture's centre from the sheet's, in metres (x right, y UP)
    dx: ((F.u0 + F.u1) / 2 - 0.5) * SHEET_W,
    dy: -((F.v0 + F.v1) / 2 - 0.5) * SHEET_H,
  },
  // THE HOLD: how much of the binding axis is left to the country either side of the original, so
  // that "the whole of it" is a measurement with a pixel or two in hand rather than an exact
  // tangency a rounding error can break. At 1280x800 it is 12 px at the top and 12 at the foot, and
  // what stands in them is the continued sky and the continued road — which is the point.
  hold: 0.015,
  // what both named windows keep of the ORIGINAL, in its own u,v: the whole of it, at every shape a
  // person watches this in.
  safe: { u0: 0, u1: 1, v0: 0, v1: 1 },
};

const RAD = 180 / Math.PI;
export const plateDist = () => PLATE.eye[2] - PLATE.centre[2];

// THE LENS, and it is the smaller of two openings:
//   `hold` — wide enough that the whole ORIGINAL is in the frame with a hold to spare, which is the
//     one that binds at every ordinary window shape;
//   `cover` — no wider than the SHEET, so the frame is full of drawing and never of paper.
const halfAngle = (aspect) => {
  const A = Math.max(0.05, aspect);
  const d = plateDist();
  const whole = Math.max(PLATE.pic.h / (2 * d), PLATE.pic.w / (2 * A * d)) / (1 - 2 * PLATE.hold);
  const cover = Math.min(PLATE.w / (2 * A * d), PLATE.h / (2 * d));
  return Math.min(whole, cover);
};

// The shot itself, solved for the window we are being shown in. Same shape as anything
// camera-frame.js returns — {pos, look, fov, shift} — so camera.js does not care who made it.
// THE LENS LOOKS AT THE ORIGINAL'S OWN CENTRE and not the sheet's, because the sheet is scenery and
// the picture is the subject; on this plate the two are the same point to a millimetre, and on the
// next one they will not be.
export function crossroadsShot(aspect) {
  const look = [PLATE.centre[0] + PLATE.pic.dx, PLATE.centre[1] + PLATE.pic.dy, PLATE.centre[2]];
  return { pos: [PLATE.eye[0] + PLATE.pic.dx, PLATE.eye[1] + PLATE.pic.dy, PLATE.eye[2]], look, fov: 2 * Math.atan(halfAngle(aspect)) * RAD, shift: [0, 0] };
}

// …and what that window actually makes of it: how much of the FRAME the original fills, how much of
// it the sheet fills (which must be all of it, or there is paper showing), and where each of their
// corners falls in it (0..1 across the frame). What a tool measures the composition against instead
// of taking somebody's word for it.
export function plateView(aspect) {
  const A = Math.max(0.05, aspect);
  const d = plateDist();
  const t = halfAngle(aspect);
  const fw = 2 * t * A * d, fh = 2 * t * d; // the frame, in metres, at the sheet's own depth
  const box = (w, h) => ({ w: w / fw, h: h / fh, x0: 0.5 - w / fw / 2, x1: 0.5 + w / fw / 2, y0: 0.5 - h / fh / 2, y1: 0.5 + h / fh / 2 });
  return { ...box(PLATE.pic.w, PLATE.pic.h), sheet: box(PLATE.w, PLATE.h), fov: 2 * Math.atan(t) * RAD, frame: [fw, fh] };
}
