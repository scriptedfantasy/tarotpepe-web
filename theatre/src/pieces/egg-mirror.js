// AN EGG, inside props: THE MIRROR ON THE LEFT WALL, and the five frogs in it.
//
// The user: "The mirror on the left wall. Each click, his reflection is a different classic
// variant drawn in ink: Feels Good Man, Sad Frog, Smug Frog, Angry Pepe, Nu Pepe with the crossed
// arms. He himself never changes; only the glass does."
//
// THE OBJECT IS ALREADY THERE. props.js hangs a round frame on the stage-left wall and calls it a
// barometer; egg-switchboard.js moved it downstage to z 0.3 to get it out from under the board.
// Nothing here moves it, resizes it or re-hangs it. What changes is what is INSIDE the frame:
//   · the barometer's dial — a picture on a black mount — comes off, because a mount is what a
//     PICTURE has. A mirror's glass runs to the frame's rebate, and that mount was costing the
//     drawing 32% of its diameter, which at this size is most of what there is;
//   · the frame's ring and body go to solid ink, because with the mount gone the object had no
//     black area left in it. A solid bezel round a bare face is the wall clock's own rule and the
//     round-1 critic's: one solid black area, one bare white area, from across the room.
// The frame's geometry, radius, height and place on the wall are untouched.
//
// WHAT IS IN THE GLASS. Six drawings on one sheet each, at the mirror's own size:
//   glass  the room, reflected: a picture rail, a dado, the doorway opposite, the pendant, and a
//          shower of window light. This is what the mirror is when nobody has touched it.
//   feels-good  2008. The lids down over half of each eye, the wide contented mouth.
//   sad         2009. The brows up at their inner ends, the mouth turned down, one wet eye.
//   smug        The eyes narrowed to slits and thrown sideways, the mouth up at one corner only.
//   angry       The brows driven down into a V, the eyes small under them, the teeth showing.
//   nu          2015. The arms crossed in a long-sleeved shirt, the mouth dead flat.
//
// THEY ARE ONE FROG, NOT FIVE. Every face is struck off the same skull — one outline, one pair of
// eye sockets, one mouth band — with the numbers taken off the user's own cut-out sheets
// (public/pepe/cutout.json, measured on cutout-head.png at 444 x 329):
//     the head is 1.35 wide to 1 tall, with two brow crowns on top and a dip between them;
//     each eye is a third of the head's width and they TOUCH at its centre line;
//     the eye band sits a quarter to two fifths of the way down the head;
//     the mouth spans two thirds of the head's width, between 0.56 and 0.88 of its height.
// A mood may move a lid, a brow, a corner or an arm. It may not move any of those four numbers.
//
// HOW IT CUTS. One drawing on the 12 fps clock — a reflection does not dissolve — with a fingernail
// on the glass ('chink', sound-voices.js) fired on the CLICK, because that is when the hand is on
// it. Pepe at the table is not touched by any of this: this file owns one material on one mesh.
//
// NOTHING ANNOUNCES IT. No label, no halo, no glow. The cursor over the glass is the whole
// affordance, exactly as it is for the cat, the radio and the lever.
//
// WHAT IT MEASURES, SO NOBODY HAS TO GUESS (tools/_egg-mirror-proof.mjs, the glass's own disc
// projected). The wall is raked about 67 degrees off every frontal plate, so the glass is a tall
// narrow ellipse and it is the WINDOW'S ASPECT, not the shot, that decides whether it is in the
// picture at all:
//     home 1280x800    33 x 79 px, at x -52   OUT OF FRAME
//     home 1600x900    37 x 89 px, at x  21   in frame
//     home 1920x1080   45 x 107 px, at x  25  in frame
//     wide 1280x800    27 x 64 px, at x  83   in frame
//     wide 1920x1080   36 x 86 px, at x 208   in frame
//     390 x 844        36 x 86 px, at x -557  OUT OF FRAME, either shot
// So it is there on any window wider than about 1.6:1 and on the piece's own `wide` plate, and it
// is not there at 1280 x 800 `home` or on a phone. That is not this egg's decision: the left wall
// is cropped at z -0.15 in `home` and egg-switchboard.js hung this frame at z 0.3 on purpose,
// because the board takes every centimetre upstage of it. Whether the wall should be reframed is
// the camera's call, or the user's.
//
// Every mood is therefore carried by a VERTICAL difference — a lid's height, a brow's fall, a
// mouth's turn, a bar of forearms — because at 2.5 : 1 of foreshortening vertical is the only axis
// the rake leaves alone, and everything is kept inside the middle three fifths of the sheet.
import * as THREE from 'three';
import { INK, PAPER, drawTexture } from '../core/strokes.js';
import * as O from './props-objects.js';
import { stroke, dot, fillPoly } from './props-textures.js';

// His own colours, off his own sheet: pepe.js SKIN, and the lip red from cutout.json's palette.
// They are the only colour in this drawing and the only colour this egg puts in the room.
const GREEN = '#69b964';
const LIP = '#d57d6e';
const WHITE = '#fbfcfd'; // cutout.json palette.eyeWhite

// The sheet the glass is drawn on. CircleGeometry inscribes its disc in the unit square, so the
// texture's inscribed circle IS the glass and the corners are never seen.
const S = 256;
const R = S / 2;

// THE SKULL. Every face is built on this and none of them may move it.
const H = { cx: 128, cy: 100, hw: 104, hh: 72 };
const HEAD_TOP = H.cy - H.hh; // 28
const HEAD_H = H.hh * 2; // 144
// the eye band and the mouth band, as fractions of the head, off the cut-out sheet
const EYE = { rx: 35, ry: 17, dx: 35, y: HEAD_TOP + 0.31 * HEAD_H }; // 73
const MOUTH = { half: 68, y0: HEAD_TOP + 0.56 * HEAD_H, y1: HEAD_TOP + 0.88 * HEAD_H }; // 109 .. 155

// the head's silhouette in head units (u across, v down), from cutout-head.png and made symmetric:
// two brow crowns at a third out either side, a shallow dip between them on the centre line, the
// widest point just below the eyes, a broad jaw. 1.44 wide to 1 tall, which is his own head.
const SKULL = [
  [-1.0, -0.06], [-0.99, -0.38], [-0.92, -0.64], [-0.78, -0.84], [-0.6, -0.96], [-0.4, -1.0],
  [-0.22, -0.93], [-0.1, -0.83], [0.0, -0.79], [0.1, -0.83], [0.22, -0.93], [0.4, -1.0],
  [0.6, -0.96], [0.78, -0.84], [0.92, -0.64], [0.99, -0.38], [1.0, -0.06], [1.0, 0.26],
  [0.95, 0.56], [0.84, 0.8], [0.66, 0.96], [0.4, 1.05], [0.12, 1.08], [-0.16, 1.07],
  [-0.44, 1.0], [-0.68, 0.9], [-0.86, 0.72], [-0.96, 0.48], [-1.0, 0.22],
];

// ---- the pen's own small change ---------------------------------------------------------------
// A closed Catmull-Rom through a hand-set polygon, so the outline is a curve and not a shape with
// corners in it. The pen (stroke, props-textures.js) puts the wobble on afterwards.
function smooth(pts, n = 4) {
  const out = [];
  const N = pts.length;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}
// a quadratic, as a polyline
function bez(p0, c, p1, n = 14) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * p0[0] + 2 * s * t * c[0] + t * t * p1[0], s * s * p0[1] + 2 * s * t * c[1] + t * t * p1[1]]);
  }
  return out;
}
function ellipse(cx, cy, rx, ry, n = 26, a0 = 0, a1 = Math.PI * 2) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

// ---- the parts, each drawn once and posed by its arguments -------------------------------------

// THE HEAD. A flat green plate with the room's contour round it — the same two-part construction
// the cards and the puppet use: colour is a fill, never a shade, and the line is drawn over it.
function head(g, o, { scale = 1, cy = H.cy } = {}) {
  const pts = smooth(SKULL.map(([u, v]) => [H.cx + u * H.hw * scale, cy + v * H.hh * scale]));
  fillPoly(g, pts, GREEN);
  stroke(g, pts, { ...o, width: 4.4, close: true });
  return pts;
}

// AN EYE. `lid` is how much of the socket the upper lid has come down over, 0 (wide) to 1 (shut);
// `look` throws the pupil across it, -1 to 1. The white is a plate, the lid is the head's own
// green brought down over it, and the line between them is the heaviest mark on the face.
function eye(g, o, side, { lid = 0.3, look = 0, pupil = 1, rx = EYE.rx, ry = EYE.ry, cy = EYE.y } = {}) {
  const cx = H.cx + side * EYE.dx;
  const ring = ellipse(cx, cy, rx, ry, 30);
  fillPoly(g, ring, WHITE);
  if (lid > 0.02) {
    // the lid: the socket's own top, cut across at the lid line and filled with the head's green
    const yl = cy - ry + 2 * ry * lid;
    fillPoly(g, [[cx - rx, cy - ry - 2], [cx + rx, cy - ry - 2], [cx + rx, yl], [cx - rx, yl]], GREEN);
    stroke(g, bez([cx - rx, yl - ry * 0.1], [cx, yl + ry * 0.24], [cx + rx, yl - ry * 0.1]), { ...o, width: 4 });
  }
  if (pupil > 0) {
    const py = Math.min(cy + ry * 0.28, cy - ry + 2 * ry * lid + ry * 0.42);
    dot(g, cx + look * rx * 0.44, py, Math.max(2.6, ry * 0.42 * pupil), INK);
  }
  stroke(g, ring, { ...o, width: 3.4, close: true });
  return { cx, cy, rx, ry };
}

// A BROW. Two of the five moods are carried by this and nothing else, so it is a solid wedge and
// not a line: a line at this size is a scratch, a wedge is a decision.
function brow(g, o, side, { inner = 0, outer = 0, thick = 8 } = {}) {
  const xi = H.cx + side * 6, xo = H.cx + side * (EYE.dx + EYE.rx * 0.96);
  const yi = EYE.y - EYE.ry - 6 + inner, yo = EYE.y - EYE.ry - 6 + outer;
  fillPoly(g, [[xi, yi], [xo, yo], [xo, yo + thick], [xi, yi + thick * 1.15]], INK);
}

// THE MOUTH. One lens between two corners, thickened in the middle and tapering to a point at each
// end, which is what the lip mass on his own sheet is (cutout-mouthRest.png). `my` above the
// corners is a frown, below them a smile, level is Nu Pepe.
function lip(g, o, { lx, ly, mx, my, rx, ry, up = 8, down = 9, fill = LIP, teeth = 0 } = {}) {
  const mid = bez([lx, ly], [mx, my], [rx, ry], 20);
  const taper = (i) => Math.sin((i / (mid.length - 1)) * Math.PI);
  const top = mid.map(([x, y], i) => [x, y - up * taper(i)]);
  const bot = mid.map(([x, y], i) => [x, y + down * taper(i)]);
  const band = [...top, ...bot.slice().reverse()];
  fillPoly(g, band, teeth ? INK : fill);
  if (teeth) {
    // the teeth: paper cut out of the cavity along its upper edge, four up and two down, which is
    // as many as survive at this size
    for (let i = 0; i < 4; i++) {
      const u = 0.16 + i * 0.22, k = Math.round(u * (mid.length - 1));
      const [x, y] = top[k];
      fillPoly(g, [[x - 5, y], [x + 5, y], [x + 4, y + 8], [x - 4, y + 8]], PAPER);
    }
    for (let i = 0; i < 2; i++) {
      const u = 0.34 + i * 0.3, k = Math.round(u * (mid.length - 1));
      const [x, y] = bot[k];
      fillPoly(g, [[x - 4.5, y], [x + 4.5, y], [x + 3.5, y - 7], [x - 3.5, y - 7]], PAPER);
    }
  }
  stroke(g, band, { ...o, width: 3.6, close: true });
  if (!teeth) stroke(g, mid, { ...o, width: 2.4 }); // the line where the lips meet
}

// THE ROBE. Paper with the room's contour on it — his own white robe, cropped by the glass.
function shoulders(g, o, { y = 176, spread = 114, neck = 48 } = {}) {
  const pts = [
    [H.cx - neck, y - 8], [H.cx - neck - 10, y + 6], [H.cx - spread, y + 30], [H.cx - spread - 26, S + 8],
    [H.cx + spread + 26, S + 8], [H.cx + spread, y + 30], [H.cx + neck + 10, y + 6], [H.cx + neck, y - 8],
  ];
  fillPoly(g, pts, PAPER);
  stroke(g, [[H.cx - neck, y - 8], [H.cx - neck - 10, y + 6], [H.cx - spread, y + 30], [H.cx - spread - 26, S + 8]], { ...o, width: 3.6 });
  stroke(g, [[H.cx + neck, y - 8], [H.cx + neck + 10, y + 6], [H.cx + spread, y + 30], [H.cx + spread + 26, S + 8]], { ...o, width: 3.6 });
  // two folds, because a white robe with nothing on it is a white shape
  stroke(g, bez([H.cx - 52, y + 44], [H.cx - 40, y + 62], [H.cx - 30, S], 8), { ...o, width: 2 });
  stroke(g, bez([H.cx + 48, y + 40], [H.cx + 38, y + 60], [H.cx + 30, S], 8), { ...o, width: 2 });
}

// THE GLASS ITSELF, over everything: two bare slashes across the top-left corner, which is what a
// pen means by glass. Kept clear of the eyes so a mood is never read through a highlight.
function highlight(g, o) {
  for (const [w, dx] of [[10, 0], [4.5, 22]]) {
    fillPoly(g, [[6 + dx, 92], [6 + dx + w, 92], [76 + dx + w, -6], [76 + dx, -6]], PAPER);
    stroke(g, [[6 + dx, 92], [76 + dx, -6]], { ...o, width: 1.2, alpha: 0.5, color: INK });
  }
}

// ---- the six sheets ----------------------------------------------------------------------------
const FACES = ['glass', 'feels-good', 'sad', 'smug', 'angry', 'nu'];

function drawGlass(g, rng) {
  const o = { wobble: 0.7, rng, alpha: 0.85 };
  // the room, reflected: a rail, a dado, a skirting, the doorway opposite, the pendant, and the
  // window's light coming in as rain-strokes. Six marks; a mirror this size cannot hold seven.
  stroke(g, [[-4, 70], [S + 4, 88]], { ...o, width: 2.4 });
  stroke(g, [[-4, 168], [S + 4, 188]], { ...o, width: 2.8 });
  stroke(g, [[-4, 202], [S + 4, 222]], { ...o, width: 2.2 });
  stroke(g, [[150, 190], [152, 80], [212, 86], [210, 196]], { ...o, width: 2.6 });
  stroke(g, [[168, 186], [170, 92]], { ...o, width: 1.8, alpha: 0.6 });
  // the pendant over the table, reflected: a drop, a boss, and its three petals hanging off it
  stroke(g, [[112, 6], [112, 40]], { ...o, width: 2.2 });
  dot(g, 112, 42, 4, INK);
  for (const [dx, dy] of [[-22, 60], [0, 64], [22, 60]]) stroke(g, bez([112, 44], [112 + dx * 0.7, dy - 6], [112 + dx, dy], 8), { ...o, width: 2.4 });
  for (let i = 0; i < 9; i++) {
    const x = 16 + i * 12;
    stroke(g, [[x, 96 + (i % 3) * 9], [x - 3, 152 - (i % 2) * 12]], { ...o, width: 1.5, alpha: 0.45 });
  }
}

// 2008. The lids down over half the socket and the mouth at its widest: the whole of Feels Good
// Man is that the eyes are nearly shut while the mouth is nearly ear to ear.
function drawFeelsGood(g, rng) {
  const o = { wobble: 0.7, rng };
  shoulders(g, o, {});
  head(g, o, {});
  eye(g, o, -1, { lid: 0.52, look: 0.1 });
  eye(g, o, 1, { lid: 0.52, look: 0.1 });
  dot(g, H.cx - 7, MOUTH.y0 - 12, 2.4, INK);
  dot(g, H.cx + 7, MOUTH.y0 - 12, 2.4, INK);
  lip(g, o, { lx: H.cx - MOUTH.half, ly: MOUTH.y0 - 8, mx: H.cx, my: MOUTH.y1 + 28, rx: H.cx + MOUTH.half, ry: MOUTH.y0 - 8, up: 8, down: 10 });
}

// 2009. The brows up at their inner ends, the mouth turned down and pulled in, and one wet eye —
// a bare gleam in the pupil and a drop on the cheek under it, which is the only mark on any of
// these five that is not a line the face already had.
function drawSad(g, rng) {
  const o = { wobble: 0.7, rng };
  shoulders(g, o, {});
  head(g, o, {});
  const l = eye(g, o, -1, { lid: 0.16, look: -0.15, ry: EYE.ry * 1.05 });
  eye(g, o, 1, { lid: 0.16, look: -0.15, ry: EYE.ry * 1.05 });
  dot(g, l.cx - l.rx * 0.34, l.cy - 4, 3, WHITE); // the wet gleam, in the eye
  brow(g, o, -1, { inner: -12, outer: 2, thick: 6 });
  brow(g, o, 1, { inner: -12, outer: 2, thick: 6 });
  // …and the drop, on the CHEEK and clear of the socket by a good six pixels. Drawn against the
  // lid it read as a tooth: at this size two white shapes that touch are one white shape.
  {
    const dx = l.cx - l.rx * 0.86, dy = l.cy + l.ry + 27;
    const drop = [...bez([dx, dy - 15], [dx + 9.5, dy + 3], [dx, dy + 11], 8), ...bez([dx, dy + 11], [dx - 9.5, dy + 3], [dx, dy - 15], 8)];
    fillPoly(g, drop, PAPER);
    stroke(g, drop, { ...o, width: 2.4, close: true });
  }
  dot(g, H.cx - 7, MOUTH.y0 - 6, 2.4, INK);
  dot(g, H.cx + 7, MOUTH.y0 - 6, 2.4, INK);
  lip(g, o, { lx: H.cx - MOUTH.half * 0.82, ly: MOUTH.y1 + 4, mx: H.cx, my: MOUTH.y0 - 12, rx: H.cx + MOUTH.half * 0.82, ry: MOUTH.y1 + 4, up: 8, down: 9 });
}

// The eyes to slits and thrown to one side, the mouth up at one corner and level at the other, and
// a crease running up the cheek from the corner that went up. Asymmetry is the whole joke.
function drawSmug(g, rng) {
  const o = { wobble: 0.7, rng };
  shoulders(g, o, {});
  head(g, o, {});
  eye(g, o, -1, { lid: 0.62, look: 0.6, ry: EYE.ry * 0.94 });
  eye(g, o, 1, { lid: 0.6, look: 0.6, ry: EYE.ry * 0.94 });
  dot(g, H.cx - 7, MOUTH.y0 - 10, 2.4, INK);
  dot(g, H.cx + 7, MOUTH.y0 - 10, 2.4, INK);
  lip(g, o, { lx: H.cx - MOUTH.half * 0.92, ly: MOUTH.y1 + 2, mx: H.cx - 4, my: MOUTH.y1 + 14, rx: H.cx + MOUTH.half * 0.98, ry: MOUTH.y0 - 4, up: 7, down: 8 });
  stroke(g, bez([H.cx + MOUTH.half * 0.96, MOUTH.y0 - 10], [H.cx + MOUTH.half * 1.0, MOUTH.y0 - 21], [H.cx + MOUTH.half * 0.86, MOUTH.y0 - 29], 8), { ...o, width: 2.6 });
}

// The brows driven down into a V, the eyes small and hard under them, the mouth open on its teeth.
// Every one of those is a vertical difference, which is the only kind the raked wall keeps.
function drawAngry(g, rng) {
  const o = { wobble: 0.7, rng };
  shoulders(g, o, {});
  head(g, o, {});
  eye(g, o, -1, { lid: 0.44, look: 0.22, rx: EYE.rx * 0.92, ry: EYE.ry * 0.9 });
  eye(g, o, 1, { lid: 0.44, look: -0.22, rx: EYE.rx * 0.92, ry: EYE.ry * 0.9 });
  brow(g, o, -1, { inner: 12, outer: -12, thick: 11 });
  brow(g, o, 1, { inner: 12, outer: -12, thick: 11 });
  lip(g, o, { lx: H.cx - MOUTH.half * 0.94, ly: MOUTH.y0 + 8, mx: H.cx, my: MOUTH.y1 + 18, rx: H.cx + MOUTH.half * 0.94, ry: MOUTH.y0 + 8, up: 13, down: 15, teeth: 1 });
}

// 2015. The arms come up and the head goes back a little, so the head is drawn smaller and higher
// — the one mood where the FIGURE changes and not only the face. The shirt is paper with the
// room's contour on it, a collar at the neck, and two green hands laid on the folded sleeves.
function drawNu(g, rng) {
  const o = { wobble: 0.7, rng };
  const sc = 0.84, cy = 74;
  // the shirt: shoulders wide, because folded arms make a man wider
  const body = [[18, S + 8], [28, 184], [62, 152], [128, 144], [194, 152], [228, 184], [238, S + 8]];
  fillPoly(g, [...body, [238, S + 8], [18, S + 8]], PAPER);
  stroke(g, body, { ...o, width: 3.8 });
  stroke(g, [[92, 146], [110, 168]], { ...o, width: 2.6 }); // the collar: it is a shirt, not a robe
  stroke(g, [[164, 146], [146, 168]], { ...o, width: 2.6 });
  head(g, o, { scale: sc, cy });
  eye(g, o, -1, { lid: 0.34, look: 0, rx: EYE.rx * sc, ry: EYE.ry * sc, cy: cy + (EYE.y - H.cy) * sc });
  eye(g, o, 1, { lid: 0.34, look: 0, rx: EYE.rx * sc, ry: EYE.ry * sc, cy: cy + (EYE.y - H.cy) * sc });
  const my = cy + (MOUTH.y1 - H.cy) * sc;
  dot(g, H.cx - 6, my - 20, 2.2, INK);
  dot(g, H.cx + 6, my - 20, 2.2, INK);
  lip(g, o, { lx: H.cx - MOUTH.half * sc, ly: my, mx: H.cx, my: my + 1, rx: H.cx + MOUTH.half * sc, ry: my, up: 6, down: 7 });
  // THE CROSSED ARMS, AS ONE MASS AND NOT AS TWO BARS. Two tapered sleeves laid over each other
  // were tried twice and read both times as a first-aid box: at the mirror's size two shapes of
  // the same value with a line between them are one shape with a scratch on it. So the fold is
  // drawn the way it is SEEN — one broad band across the chest with a single seam through it where
  // the near forearm goes behind the far one, and a hand a quarter and three quarters across it.
  // And all of it is kept inside the middle three fifths of the sheet: the wall is raked 67
  // degrees, so the disc's outer thirds are squeezed into a few pixels of bezel and a hand drawn
  // at x 46 is a hand nobody sees. Measured off the wide plate, not guessed.
  const mass = [
    ...bez([58, 194], [128, 174], [200, 188], 14),
    ...bez([200, 188], [210, 210], [194, 228], 8),
    ...bez([194, 228], [128, 246], [60, 228], 14),
    ...bez([60, 228], [48, 212], [58, 194], 8),
  ];
  fillPoly(g, mass, PAPER);
  stroke(g, mass, { ...o, width: 3.8, close: true });
  stroke(g, bez([128, 214], [140, 228], [136, 244], 6), { ...o, width: 1.6, alpha: 0.8 }); // where the near forearm goes behind the far one
  // THE HANDS, AND THIS IS THE MARK THAT SAYS "FOLDED". Each one straddles the band's own upper
  // edge with three green fingers HANGING OVER it: a palm laid on a sleeve. Drawn as flat blobs
  // beside the band they read as two weights on a bar, and drawn on its ends as a dumbbell. A hand
  // gripping an arm is a hand whose fingers cross the arm's outline, and at this size that
  // crossing is the whole of the information.
  const hand = (hx, hy) => {
    const palm = [
      ...bez([hx - 20, hy - 1], [hx - 18, hy - 13], [hx - 3, hy - 12], 8),
      ...bez([hx - 3, hy - 12], [hx + 15, hy - 11], [hx + 19, hy + 1], 8),
      ...bez([hx + 19, hy + 1], [hx + 15, hy + 9], [hx - 5, hy + 8], 8),
      ...bez([hx - 5, hy + 8], [hx - 20, hy + 7], [hx - 20, hy - 1], 8),
    ];
    fillPoly(g, palm, GREEN);
    stroke(g, palm, { ...o, width: 3, close: true });
    for (let i = 0; i < 3; i++) {
      const x = hx - 11 + i * 11;
      const f = [...bez([x - 4.5, hy + 2], [x - 6, hy + 16], [x + 0.5, hy + 19], 7), ...bez([x + 0.5, hy + 19], [x + 7, hy + 16], [x + 5.5, hy + 2], 7)];
      fillPoly(g, f, GREEN);
      stroke(g, f, { ...o, width: 2.2, close: true });
    }
  };
  hand(86, 194);
  hand(174, 190);
}

const DRAW = {
  glass: drawGlass,
  'feels-good': drawFeelsGood,
  sad: drawSad,
  smug: drawSmug,
  angry: drawAngry,
  nu: drawNu,
};

// One sheet. The field is paper (the glass), the drawing goes on it, and the highlight goes over
// the drawing, because a highlight is on the near face of the glass and everything else is behind.
function sheet(face) {
  return drawTexture(
    S,
    S,
    (g, W, HGT, rng) => {
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, HGT);
      (DRAW[face] ?? drawGlass)(g, rng);
      highlight(g, { wobble: 0.6, rng });
      // the glass's own edge, just inside the frame's rebate: one turn of the pen, so the drawing
      // is cropped by a circle and not by a square nobody can see
      stroke(g, ellipse(R, R, R - 3, R - 3, 60), { width: 3, wobble: 0.8, rng, close: true });
    },
    { seed: 2100 + FACES.indexOf(face) * 7 },
  );
}

// ---- the egg ------------------------------------------------------------------------------------
export function eggMirror(ctx, { object, switches } = {}) {
  const MIN_TAP = 44; // px: what a thumb needs, whatever the glass measures on the glass
  const M = O.materials();
  if (!object) return null;

  // the three meshes roundFrame built: the torus, the body behind it, and the face
  const meshes = object.children.filter((c) => c.isMesh);
  const faceMesh = meshes.find((m) => m.geometry?.type === 'CircleGeometry');
  if (!faceMesh) return null;
  // the bezel goes to solid ink; the frame's geometry is not touched
  for (const m of meshes) if (m !== faceMesh) m.material = M.solid;

  // the glass. `colorful` so the ink pass shows the drawing verbatim and re-states its achromatic
  // marks at the room's own nib (the insects' and the puppet's rule); lineWeight 0, because a
  // second contour round a disc that already has a bezel is a doubled line; hatch low, because a
  // sheet of glass facing the room does not take a wash.
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
  mat.userData.ink = { hatch: 0.06, lineWeight: 0, colorful: true };
  mat.name = 'mirror-glass';
  // props.js still builds the frame with `kind: 'barometer'`, so the dial is drawn once and then
  // thrown away here. That is one canvas out of props' 57 ms and it is left alone ON PURPOSE: the
  // name 'barometer' is what egg-switchboard.js finds the object by, and what mind-room.js still
  // has him talking about. Whether he should now be talking about a mirror is the user's call.
  faceMesh.material?.map?.dispose?.();
  faceMesh.material = mat;
  faceMesh.userData.mirror = true;

  // ONE SHEET IS DRAWN AT BUILD AND THE OTHER FIVE ON THE CLICK THAT ASKS FOR THEM. Six canvases
  // in props' build would be six canvases nobody has looked at yet, and props has 1500 ms for the
  // whole of the set dressing.
  const cache = new Map();
  const texture = (face) => {
    let t = cache.get(face);
    if (!t) {
      t = sheet(face);
      t.anisotropy = Math.max(t.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
      cache.set(face, t);
    }
    return t;
  };

  let face = 'glass';
  let want = 'glass';
  const paint = () => {
    mat.map = texture(face);
    mat.needsUpdate = true;
    object.userData.mirrorFace = face;
  };
  // ?mirror=<face> hangs a still on one of the six, so a screenshot of the room is reproducible.
  // It survives setState('default') the way ?tune= survives it for the radio: a URL that asked for
  // a face has done what the click does, and main.js calls setState AFTER every build.
  const param = (ctx.params ?? new URLSearchParams(location.search)).get('mirror');
  const asked = param && FACES.includes(param) ? param : null;
  if (asked) face = want = asked;
  paint();

  // ---- the box on the glass ----------------------------------------------------------------------
  const v = new THREE.Vector3();
  function hitBox() {
    object.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, HGT = ctx.size?.h || window.innerHeight;
    const r = faceMesh.geometry?.parameters?.radius ?? 0.15;
    const xs = [], ys = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      v.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      faceMesh.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * HGT);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to a thumb's 44 px. The glass is 26 px across at the wide plate, so on
  // every window this margin FIRES, and the extra falls on bare plaster: the nearest other switch
  // on this wall is the switchboard, two metres upstage.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }

  // ---- the click -----------------------------------------------------------------------------------
  // The cue goes now, because the fingernail is on the glass now; the drawing changes on the next
  // 12 fps step, and the news goes with the drawing and not with the hand.
  function next(to = FACES[(FACES.indexOf(want) + 1) % FACES.length]) {
    want = FACES.includes(to) ? to : 'glass';
    ctx.pieces.sound?.play?.('chink', { pan: -0.55 }); // the mirror is on the stage-left wall
  }

  switches?.add?.({ name: 'mirror', object: () => object, tapBox, onDown: () => next() });

  return {
    get face() {
      return face;
    },
    faces: FACES,
    next,
    // for the tools and for a still: put a face in the glass with no cue and no waiting
    set(to) {
      face = want = FACES.includes(to) ? to : 'glass';
      paint();
    },
    hitBox,
    tapBox,
    // `mirror-sad` and `mirror-smug` are the two the piece is judged on; every other name is the
    // glass, which is what a reload always shows.
    setState(name = 'default') {
      const m = /^mirror-(.+)$/.exec(name ?? '');
      this.set(m && FACES.includes(m[1]) ? m[1] : asked ?? 'glass');
    },
    update(ctx2) {
      if (!ctx2.clock.stepped || want === face) return;
      face = want; // one drawing: the reflection is one thing and then it is the other
      paint();
      ctx.emit?.('props:mirror', { face });
    },
  };
}
