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
// room's pen by tools/trace-plate.mjs. Everything in this file that changed, changed because of the
// second half of that sentence.
//
// ------------------------------------------------------------------------------------------------
// THE LENS NOW CONTAINS THE PICTURE INSTEAD OF BEING COVERED BY IT, and that is the round's one real
// decision. Round 2's drawn plate was 6.00 by 5.22 m and the lens opened until the SHEET just
// covered the window — a cover fit — so no edge of it could ever appear at any window shape, and
// whatever fell outside the frame was landscape drawn on purpose to be lost. That worked because the
// drawing was made to the frame's shape and had spare country at every edge.
//
// The original is 416 by 416. It is SQUARE, it is somebody else's, and it has no spare country
// anywhere: the sun's crown is at the top of it, the child's shoes are at the bottom, and the two
// castles are in the corners. A cover fit on a square picture in a 16:9 window keeps the middle 55 %
// of its height — which beheads both castles, loses the sun and the lightning, and cuts the child
// off at the knee. That is not a crop, it is a different picture, and the whole of what the user
// asked for is that this one arrive whole.
//
// So the lens opens until the PICTURE just FITS, with a hand's breadth of margin, and what fills the
// rest of the window is PAPER — a plain sheet standing behind it, big enough that no edge of it can
// reach any frame at any shape. A drawing standing on bare paper with room around it is what this
// film is made of; it is what the notice, the placard and every title card in it already are.
//
//   at 1920x1080 (A = 1.778)   fov 29.8 deg — the room's own lens. The picture takes the whole
//                              height of the frame and 56 % of its width, with paper either side.
//   at 1280x800  (A = 1.600)   fov 29.8 deg, 63 % of the width.
//   at 390x844   (A = 0.462)   fov 63.0 deg. The picture takes 94 % of the frame's WIDTH, with paper
//                              above and below — where the placard stands anyway.
//
// A WIDE LENS COSTS NOTHING HERE, which is why the phone's number is allowed to be what it is. A
// plane at right angles to the lens axis projects through a pinhole as a pure scale: there is no
// keystone, no stretch and no barrel in a flat sheet however wide the lens is, and a flat sheet and
// the paper behind it are the only two things in this frame. What a wide lens WOULD distort is the
// parlour — so the walk out holds the room's own lens until it is through the doorway and opens to
// this one over the last stride (camera.js, the dolly's `fovEase`).
//
// THE DISTANCE, 9.40 m, is what makes the laptop's number 29.8 and not 48: at 6.28 m the same fit
// needed 48.6 deg on a laptop and 88.6 on a phone. 29.8 is the lens the room itself is shot on, to a
// tenth of a degree, so the walk out barely changes focal length at all in the window most of this
// film is watched in. Further out again would be longer still and would start reading as a zoom on
// the way out; this is the middle of that.
//
// THE EYE stands at x 1.5 (the doorway's own centre line: room.js cuts the opening 1.05 to 1.95), at
// z −4.10 — a stride and a half OUTSIDE the wall, where round 2 stopped two centimetres past the
// lining. It moved this round for the walk's sake and not the frame's, and the reason is worth the
// three lines. A dolly brakes into its mark, so wherever it stops is where it spends most of its
// drawings; stopping in the doorway spent five of them within half a metre of the sheet of weather
// standing in it, and a drawn sheet magnified twenty times is a smear, not a picture. Stopping a
// metre and a half OUTSIDE, the camera crosses the threshold at full cruise — one drawing, the way a
// doorframe passes a lens — and does all its braking in the open air with nothing in the frame but
// the picture. 1.45 m is the height every other frontal shot of this door is taken from
// (camera-shots.js `door`).
//
// THE RESOLUTION. At 1920 wide the picture is about 950 px of glass and the traced sheet is 1800 px
// across — a two-thirds oversample, which is the margin tools/trace-plate.mjs measures its nib
// against (4.83 sheet px for 2.9 px of glass) and the reason a diagonal on it is not a staircase.
//
// This file is READ by two pieces and owned by neither's drawing: src/pieces/egg-cross.js stands the
// plate here, and src/pieces/camera-shots.js stands the camera here. It holds numbers and two
// solvers, and the one thing it imports is the little module of numbers the trace tool writes — so
// the picture's own SHAPE follows the file on the sheet, and a squarer or wider original re-frames
// the shot with no edit here at all.
import TRACE from './egg-cross-land.js';

// the traced sheet's own shape, from the tool that made it; a square, until it is not
const SRC = Array.isArray(TRACE?.size) && TRACE.size.length === 2 ? TRACE.size : [1800, 1800];
const ASPECT = SRC[0] / SRC[1];
const PIC_W = 5.0; // the picture, in metres. Only its RATIO to the distance matters; this sets both.

export const PLATE = {
  eye: [1.5, 1.45, -4.1], // the camera, a stride and a half outside the wall on the doorway's centre line
  centre: [1.5, 1.45, -13.5], // …and the picture's own centre, 9.40 m straight out along the axis
  w: PIC_W,
  h: PIC_W / ASPECT,
  ppm: SRC[0] / PIC_W, // px per metre the sheet carries: 360 on a 1800 px square
  // THE PAPER THE PICTURE STANDS ON. Big enough to reach past any frame this shot can solve, at any
  // window shape from a very wide desktop to a very tall phone: at 9.40 m the tallest frame the fit
  // asks for is about 16 m and the widest about 14, so 20 by 24 clears both with a metre to spare and
  // costs one quad. It is bare paper — no tone, no contour — so it is the same sheet the picture is
  // printed on, continued.
  ground: [20, 24],
  margin: 0.03, // the hand's breadth of paper between the picture and the nearest edge of the frame
  // AND THE MARGIN IS GIVEN BACK ON THE BOUND AXIS, which is what `bleed` is for. In a window wider
  // than the picture the height is what binds, and the margin above would then hold a square picture
  // 6 % clear of the top and foot of a 16:9 frame that already only gives it half its width. `bleed`
  // is allowed to run the picture's height that far the other way, so at 2 × margin the two cancel
  // exactly and the picture stands edge to edge in the frame's height with NOTHING lost off either
  // end — measured: at 1280x800 it is 800 px tall in an 800 px frame, and the child's shoes at
  // v 0.955 and the sun's crown at v 0.04 are both inside it. Any larger a bleed than this WOULD
  // start cutting, so it is the ceiling and not a dial. It is applied to the HEIGHT only: the width
  // is what a phone binds on and the two castles are in the corners.
  bleed: 0.06,
  // what both named windows keep, in the picture's own u,v. The whole of it, now, at every shape —
  // which is the round's point, and the reason this is no longer a box somebody had to draw inside.
  safe: { u0: 0, u1: 1, v0: 0, v1: 1 },
};

const RAD = 180 / Math.PI;
export const plateDist = () => PLATE.eye[2] - PLATE.centre[2];

// The half-angle: the lens opens until the picture FITS — its height in a wide window, its width in
// a tall one — with `margin` of the frame's half-size left as paper on the binding side.
const halfAngle = (aspect) => {
  const A = Math.max(0.05, aspect);
  const d = plateDist();
  return Math.max((PLATE.h * (1 - PLATE.bleed)) / (2 * d), PLATE.w / (2 * A * d)) / (1 - 2 * PLATE.margin);
};

// The shot itself, solved for the window we are being shown in. Same shape as anything
// camera-frame.js returns — {pos, look, fov, shift} — so camera.js does not care who made it.
export function crossroadsShot(aspect) {
  return { pos: [...PLATE.eye], look: [...PLATE.centre], fov: 2 * Math.atan(halfAngle(aspect)) * RAD, shift: [0, 0] };
}

// …and what that window actually makes of the picture: how much of the FRAME the picture fills, and
// where its corners fall in it (0..1 across the frame). What a tool measures the composition against
// instead of taking somebody's word for it.
export function plateView(aspect) {
  const A = Math.max(0.05, aspect);
  const d = plateDist();
  const t = halfAngle(aspect);
  const fw = 2 * t * A * d, fh = 2 * t * d; // the frame, in metres, at the picture's own depth
  const w = PLATE.w / fw, h = PLATE.h / fh;
  return { w, h, x0: 0.5 - w / 2, x1: 0.5 + w / 2, y0: 0.5 - h / 2, y1: 0.5 + h / 2, fov: 2 * Math.atan(t) * RAD, frame: [fw, fh] };
}
