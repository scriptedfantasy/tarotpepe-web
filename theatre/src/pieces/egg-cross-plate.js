// WHERE THE CROSSROADS STANDS, AND WHERE THE CAMERA STANDS TO SEE IT.
//
// Round 1 hung the crossroads IN the doorway and the user threw it out in four words: "naw, this
// looks terrible - this doesn't work." He was right, and the fault was not the drawing. The meme is
// a wide landscape and a doorway is a tall slot 0.81 m by 2.07 — two and a half times taller than
// it is wide. Restaged inside that the horizon becomes a stripe, the two castles are pushed in
// until they nearly touch, and every figure in it is drawn at a quarter of the size the frame it is
// actually shown in could carry. He chose the fix himself: CUT THROUGH THE DOOR.
//
// So the doorway now holds nothing but weather, and two drawings after the leaf comes to rest the
// room CUTS: the camera steps into the opening, turns its back on the parlour and looks out, and
// the picture is a plate standing in the open air with nothing else in the frame. It is the same
// answer a matte painting is on a real set — a flat drawing, hung where the camera says — only this
// time the camera is standing at the drawing rather than at the door.
//
// THE NUMBERS, AND WHY EACH OF THEM IS THAT NUMBER.
//
//   THE EYE stands at x 1.5 (the doorway's own centre line: room.js cuts the opening 1.05 to 1.95),
//   at z −2.62. The door lining runs −2.60 to −2.50, so −2.62 is two centimetres OUTSIDE it: the
//   jambs, the head and the leaf are all behind the lens and no part of the parlour can crop into
//   the frame at any aspect. 1.45 m is the height every other frontal shot of this door is taken
//   from (camera-shots.js `door`), and it is where the horizon of the plate is drawn, so the
//   visitor is standing on the road looking along it.
//
//   THE PLATE is 6.00 m by 5.22 m and its centre is on the lens axis at z −8.90 — 6.28 m out. It
//   is sized so that it FILLS THE FRAME AT EVERY ASPECT and never shows an edge, and the arithmetic
//   for that is a cover fit rather than a contain fit: the lens opens until the plate just covers,
//   which is t = min(w / (2·A·d), h / (2·d)), so a wide window is bound by the plate's width and a
//   tall one by its height. `bleed` takes 1.5 % off that, which is the margin against a rounding
//   error putting a paper edge on the screen.
//
//     at 1920x1080 (A = 1.778)   fov 29.7 deg, and the frame holds 5.91 x 3.33 m of the plate:
//                                its whole width, and the middle 64 % of its height.
//     at 390x844   (A = 0.462)   fov 44.7 deg, and the frame holds 2.38 x 5.14 m:
//                                its whole height, and the middle 40 % of its width.
//
//   WHAT FOLLOWS FROM THOSE TWO, and it is the whole brief for the drawing: the part of the plate
//   BOTH of them keep is u 0.30..0.70 and v 0.18..0.82 — the SAFE box below. The fork, the
//   signpost, the child and BOTH castles are drawn inside it, so a phone sees the picture; the
//   landscape either side of them and the sky and the road above and below are what a laptop and a
//   phone respectively get MORE of. Nothing important is drawn outside the safe box and nothing
//   outside it is left blank.
//
//   THE RESOLUTION. At 1920 wide the frame carries 5.91 m across 1920 px — 325 px to the metre —
//   so the sheet is cut at 300, which is 1:1 to within a twelfth and the ink pass re-states every
//   achromatic mark at the room's own nib anyway (ink-shaders.js: a `colorful` surface's drawn
//   marks are inked with the same pen as its neighbours). 1800 x 1566 px.
//
// This file is READ by two pieces and owned by neither's drawing: src/pieces/egg-cross.js stands
// the plate here, and src/pieces/camera-shots.js stands the camera here. It holds numbers and one
// solver and imports nothing, so the camera does not pull a canvas full of strokes in behind it.

export const PLATE = {
  eye: [1.5, 1.45, -2.62], // the camera, in the doorway and two centimetres outside the lining
  centre: [1.5, 1.45, -8.9], // …and the plate's own centre, straight out along the lens axis
  w: 6.0,
  h: 5.22,
  ppm: 300, // px per metre the sheet is cut at: 1800 x 1566
  bleed: 0.985, // the lens takes 98.5 % of what it could: no edge, at any window shape
  // what both named windows keep, in the plate's own u,v (0..1 from its top-left corner). The
  // drawing puts everything that must be seen inside this and fills the rest with landscape.
  safe: { u0: 0.302, u1: 0.698, v0: 0.1815, v1: 0.8185 },
};

const RAD = 180 / Math.PI;
export const plateDist = () => PLATE.eye[2] - PLATE.centre[2];

// The shot itself: a cover fit, solved for the window we are being shown in. Same shape as anything
// camera-frame.js returns — {pos, look, fov, shift} — so camera.js does not care who made it.
export function crossroadsShot(aspect) {
  const A = Math.max(0.05, aspect);
  const d = plateDist();
  const t = PLATE.bleed * Math.min(PLATE.w / (2 * A * d), PLATE.h / (2 * d));
  return { pos: [...PLATE.eye], look: [...PLATE.centre], fov: 2 * Math.atan(t) * RAD, shift: [0, 0] };
}

// …and what that window actually sees of the sheet, in u,v — what a tool measures the composition
// against instead of taking somebody's word for it.
export function plateView(aspect) {
  const A = Math.max(0.05, aspect);
  const d = plateDist();
  const t = PLATE.bleed * Math.min(PLATE.w / (2 * A * d), PLATE.h / (2 * d));
  const w = (2 * t * A * d) / PLATE.w, h = (2 * t * d) / PLATE.h;
  return { u0: 0.5 - w / 2, u1: 0.5 + w / 2, v0: 0.5 - h / 2, v1: 0.5 + h / 2, fov: 2 * Math.atan(t) * RAD };
}
