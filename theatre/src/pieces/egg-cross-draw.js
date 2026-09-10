// THE THREE DRAWINGS THE CROSS EGG NEEDS, and nothing else lives in here: the little cross on the
// frieze, the door leaf as a sheet (because the room's own leaf is merged into the wall and cannot
// swing), and the crossroads plate that stands in the opening.
//
// ONE PEN FOR ALL THREE. Every drawing here is cut at a canvas scale of its own — the cross is
// 0.2 m across and the picture is 2.1 m tall — so a nib measured in canvas pixels would be three
// different nibs. The nib is passed in METRES and multiplied by that sheet's own px/m, which makes
// the cross's stroke and the castle's contour the same width on the glass. The number is the room's
// own contour, 0.013 m on the back wall (the width at which the ink pass stops throwing a mark away
// as a stray dark pixel — room-textures.js measured it for the wallpaper's ghost sprigs), and every
// drawing here is struck one notch under it, as egg-rain's weather is.
//
// AND ONE COLOUR. The sun, in the fire's yellow #f2b829 (egg-fine.js; the user asked for that
// yellow and the room has carried it since). Everything else on all three sheets is ink on paper:
// the dark castle is hatch, the lightning is a stroke, the child is six marks. A second colour in
// a doorway would be the loudest thing in the film, and the picture does not need it.
//
// TWO HANDS, AND KNOWING WHICH ONE A THING WANTS IS THE WHOLE OF THE CRAFT HERE. `poly` smooths a
// run of points through their midpoints, which rounds every corner the way a nib rounds one — right
// for a hill, a cloud, a head, the sun. `frame` strikes each edge separately with inkLine, so the
// corners stay CORNERS — right for a door panel, a castle wall, a signboard, a coat. The first pass
// drew everything with the first hand and the result was a doorway full of lozenges: the signpost's
// two boards came out as one lens, the door's three fielded panels as rounded rectangles, and the
// child's coat as an egg. Anything built by a carpenter gets `frame`.
import { INK, PAPER, makeCanvas, inkLine, hatch as hatchRect } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const SUN_Y = '#f2b829'; // egg-fine.js's PLATE_Y: the room's second colour, already spent once

// ---- the two hands ---------------------------------------------------------------------------------
// A run of points drawn as one line, smoothed through the midpoints, every midpoint thrown by a
// hair. Open; `loop` is the same thing closed.
export function poly(g, pts, { width = 2, wobble = 0.6, rng = Math.random, color = INK, close = false, fill = null, alpha = 1 } = {}) {
  if (pts.length < 2) return;
  g.save();
  g.globalAlpha = alpha;
  g.beginPath();
  const n = pts.length;
  const last = close ? n : n - 1;
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < last; i++) {
    const [x, y] = pts[i % n];
    const [nx, ny] = pts[(i + 1) % n];
    const mx = (x + nx) / 2 + (rng() - 0.5) * wobble, my = (y + ny) / 2 + (rng() - 0.5) * wobble;
    if (i === 0) g.lineTo(mx, my);
    else g.quadraticCurveTo(x, y, mx, my);
  }
  if (!close) g.lineTo(pts[n - 1][0], pts[n - 1][1]);
  else g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (width > 0) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
  g.restore();
}
export const loop = (g, pts, o = {}) => poly(g, pts, { ...o, close: true });

// …and the carpenter's hand: the fill is a flat polygon and each edge is struck on its own, so a
// corner is a corner and the lines that meet at it overrun each other slightly, as drawn ones do.
export function frame(g, pts, { width = 2, wobble = 0.6, rng = Math.random, color = INK, fill = null, close = true, alpha = 1, segments = 2 } = {}) {
  if (pts.length < 2) return;
  if (fill) {
    g.save();
    g.globalAlpha = alpha;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.restore();
  }
  if (width <= 0) return;
  const n = close ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    inkLine(g, a[0], a[1], b[0], b[1], { width, wobble, rng, color, alpha, segments });
  }
}

// hatch a shape rather than a rectangle: a crag and a dark castle are not rectangles, and a
// rectangle of strokes behind them is a stain and not a shadow
export function hatchIn(g, pts, box, opts) {
  g.save();
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
  g.closePath();
  g.clip();
  hatchRect(g, box[0], box[1], box[2], box[3], opts);
  g.restore();
}

// an ellipse as a run of points, so it goes through poly() and gets the hand
export function ring(cx, cy, rx, ry, n = 14) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return p;
}

// =================================================================================================
// 1. THE CROSS ON THE WALL. Two strokes and a nail, and the user's own brief for it is that
// sentence. It is a plain wooden cross of the sort that hangs over a door in a rented room: an
// upright, an arm across it a third of the way down, and the nail it hangs from showing above the
// upright's head, because whoever put it there did not sink it.
//
// The strokes are the room's nib at two and a half, which is what makes them read as a piece of
// wood and not as a pen line: a mark that is only a contour wide is a scratch on the plaster.
// =================================================================================================
export function drawCross({ w, h, ppm, penM, seed = 4471 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed);
  const pen = penM * ppm;
  // A LATH, AND NOT A LOG. At two and a half nibs the two strokes came out 6 px wide on a cross
  // 24 px across, and 29% of its box was solid ink: a black plus sign on the frieze, which is a
  // stencil and not a drawing. At one and three quarters it is 4 px against the room's own 2.4 px
  // contour — still plainly a piece of wood, and still a line somebody drew.
  const bar = pen * 1.75;
  const x = W / 2, top = H * 0.16, foot = H * 0.955;
  const armY = top + (foot - top) * 0.32;
  inkLine(g, x, top, x + pen * 0.25, foot, { width: bar, wobble: pen * 0.3, rng, segments: 4 });
  inkLine(g, W * 0.09, armY, W * 0.91, armY - pen * 0.2, { width: bar * 0.9, wobble: pen * 0.28, rng, segments: 3 });
  // …and the nail it hangs from, which is above the wood and not in it
  const ny = top - pen * 1.9;
  inkLine(g, x - pen * 0.1, ny + pen * 0.3, x, top - pen * 0.15, { width: pen * 0.7, wobble: pen * 0.12, rng, segments: 2 });
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(x - pen * 0.1, ny, pen * 0.55, pen * 0.38, 0, 0, Math.PI * 2);
  g.fill();
  return c;
}

// =================================================================================================
// 2. THE DOOR LEAF, AS A SHEET.
//
// WHY IT IS DRAWN AT ALL. room.js builds the back-wall door as real joinery — stiles, rails, three
// raised-and-fielded panels, a knob, a key in the lock, the PTT's enamel plate — and then Parts
// merges every part in the room into ONE MESH PER MATERIAL. The leaf is therefore inside the same
// buffer as the skirting; there is no object to turn and no way to give it one without changing the
// file every other builder is standing in. So the swing is a SHEET: the same leaf, drawn, standing
// a hand's width in front of the merged one and hiding it.
//
// What is drawn is the leaf's ROOM SIDE — the face the visitor is looking at when it is shut — and
// the numbers are room.js's own, read out of it. `back` draws the landing side, which has none of
// the room's furniture on it.
//
// It is drawn WHITE, with the tone the room's own pass would have given it left off: the sheet is
// `colorful`, so what is drawn is what is shown, and a door that arrived with its shading baked in
// would be the only object in the room whose light never changes.
// =================================================================================================

// room.js's own leaf, in fractions of the leaf. Read, never written: change the door and these
// change with it. (u across from the knob stile, v down from the head.)
const LEAF = {
  stile: 0.1338,
  rails: [[0, 0.0569], [0.4076, 0.455], [0.6398, 0.6872], [0.9052, 1]],
  panels: [[0.0569, 0.4076], [0.455, 0.6398], [0.6872, 0.9052]],
  knob: [0.0791, 0.5194],
  key: [0.0791, 0.5668],
  slot: [0.5, 0.6635, 0.292, 0.0237], // the letter plate: u, v, w, h
  spy: [0.5, 0.1896],
  plate: [0.3175, 0.4128, 0.365, 0.037], // the PTT's enamel notice on the middle rail
  card: [0.4209, 0.4972, 0.1582, 0.037], // his visiting card, pinned to the panel under it
  hinges: [0.8419, [0.1327, 0.5, 0.8673], 0.3163, 0.0218],
};

export function drawLeaf({ w, h, ppm, penM, seed = 9137, back = false }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed + (back ? 811 : 0));
  if (back) {
    // the same door from the other side: the drawing is simply turned over
    g.translate(W, 0);
    g.scale(-1, 1);
  }
  const pen = penM * ppm;
  const fine = pen * 0.72; // a moulding step is a thinner line than a silhouette
  const wob = pen * 0.28;
  const X = (u) => u * W, Y = (v) => v * H;
  const box = (u0, v0, u1, v1, width, opts = {}) =>
    frame(g, [[X(u0), Y(v0)], [X(u1), Y(v0)], [X(u1), Y(v1)], [X(u0), Y(v1)]], { width, wobble: wob, rng, ...opts });

  // the paper the leaf is: it hides the merged door behind it, and everything else is struck on it
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  const m = (pen * 0.6) / W, mv = (pen * 0.6) / H;
  box(m, mv, 1 - m, 1 - mv, pen);
  // A SHEET IS SHOWN VERBATIM, so what is not drawn on it is bare paper — and the door this one
  // stands in front of is never seen in daylight. It only exists during the storm, when the room's
  // own pass is putting a level of rain-strokes on every painted surface in the picture, and a leaf
  // that arrived blank white in the middle of that read as a hole where the door had been. One
  // level of the room's own vertical rain-strokes, widely spaced, is what the pass would have given
  // it; the recesses below take a second level, as they would.
  hatchRect(g, 0, 0, W, H, { angle: Math.PI / 2, spacing: pen * 3.4, width: fine * 0.5, wobble: wob, broken: 0.45, rng, alpha: 0.5 });

  // stiles and rails: the carcase of the leaf
  const s = LEAF.stile;
  inkLine(g, X(s), Y(mv), X(s), Y(1 - mv), { width: fine, wobble: wob, rng, segments: 5 });
  inkLine(g, X(1 - s), Y(mv), X(1 - s), Y(1 - mv), { width: fine, wobble: wob, rng, segments: 5 });
  for (const [v0, v1] of LEAF.rails)
    for (const v of [v0, v1]) {
      if (v <= 0 || v >= 1) continue;
      inkLine(g, X(s), Y(v), X(1 - s), Y(v), { width: fine, wobble: wob, rng, segments: 4 });
    }

  // the three panels: the field, its bolection in two steps, and the raised centre. Six lines round
  // a panel is what the pen sees on the doors of the Cadazio street.
  for (const [v0, v1] of LEAF.panels) {
    const bu = 0.0365, bv = bu * (W / H); // a bolection is a physical width, so it is not square in v
    box(s, v0, 1 - s, v1, fine);
    box(s + bu, v0 + bv, 1 - s - bu, v1 - bv, fine * 0.9);
    box(s + bu * 1.35, v0 + bv * 1.35, 1 - s - bu * 1.35, v1 - bv * 1.35, fine * 0.8);
    const iu = 0.1034, iv = iu * (W / H);
    box(s + iu, v0 + iv, 1 - s - iu, v1 - iv, fine * 0.85);
    // the one piece of tone on the leaf: the rebate under the bolection's top edge
    hatchRect(g, X(s + bu * 1.4), Y(v0 + bv * 1.4), X(1 - 2 * s - bu * 2.8) - X(0), Y(bv * 0.75) - Y(0), {
      angle: Math.PI / 2, spacing: pen * 1.6, width: fine * 0.55, wobble: wob * 0.6, broken: 0.35, rng, alpha: 0.7,
    });
  }

  // the landing side stops here: a plain knob, a keyhole, and the boards. Everything below belongs
  // to the room — the PTT's notice does not hang on the outside of the door.
  if (back) {
    const [bu, bv] = LEAF.knob;
    loop(g, ring(X(bu), Y(bv), pen * 1.9, pen * 1.9), { width: fine, wobble: wob * 0.7, rng, fill: PAPER });
    loop(g, ring(X(bu), Y(LEAF.key[1]), pen * 0.9, pen * 1.5), { width: fine, wobble: wob * 0.6, rng, fill: PAPER });
    return c;
  }

  // the ironmongery. Only the plate and the hinges are solid: they are the two things on this door
  // that are drawn black in the room, and they are what makes it read as THIS door and not a door.
  const [ku, kv] = LEAF.knob;
  const rose = pen * 2.2;
  loop(g, ring(X(ku), Y(kv), rose, rose), { width: fine, wobble: wob * 0.7, rng, fill: PAPER });
  loop(g, ring(X(ku), Y(kv), rose * 0.6, rose * 0.6), { width: fine, wobble: wob * 0.6, rng, fill: PAPER });
  const kyv = LEAF.key[1];
  loop(g, ring(X(ku), Y(kyv), pen, pen * 1.7), { width: fine, wobble: wob * 0.6, rng, fill: PAPER });
  inkLine(g, X(ku), Y(kyv) + pen * 1.2, X(ku), Y(kyv) + pen * 4.2, { width: fine, wobble: wob * 0.4, rng, segments: 2 });
  loop(g, ring(X(ku), Y(kyv) + pen * 5.2, pen * 1.5, pen * 1.5), { width: fine, wobble: wob * 0.6, rng });
  const [su, sv, sw, sh] = LEAF.slot;
  box(su - sw / 2, sv - sh / 2, su + sw / 2, sv + sh / 2, fine);
  inkLine(g, X(su - sw * 0.4), Y(sv), X(su + sw * 0.4), Y(sv), { width: fine * 0.8, wobble: wob * 0.4, rng, segments: 2 });
  loop(g, ring(X(LEAF.spy[0]), Y(LEAF.spy[1]), pen * 0.9, pen * 0.9), { width: fine, wobble: wob * 0.5, rng });
  const [hu, hvs, hw, hh] = LEAF.hinges;
  for (const hv of hvs) {
    g.fillStyle = INK;
    g.fillRect(X(hu - hw / 2), Y(hv - hh / 2), X(hw) - X(0), Y(hh) - Y(0));
    g.fillRect(X(hu + hw / 2) - pen * 0.3, Y(hv) - pen * 1.6, pen * 1.1, pen * 3.2);
  }
  // THE ENAMEL PLATE, the one object in the set drawn white on black. Its lettering is three marks,
  // because at this size it is three marks: nothing here tries to letter P.T.T. at four pixels.
  const [pu, pv, pw, ph] = LEAF.plate;
  g.fillStyle = INK;
  g.fillRect(X(pu), Y(pv), X(pw) - X(0), Y(ph) - Y(0));
  g.fillStyle = PAPER;
  for (let i = 0; i < 3; i++)
    g.fillRect(X(pu + pw * (0.2 + i * 0.24)), Y(pv + ph * 0.3), Math.max(1, pen * 0.5), Math.max(1, Y(ph * 0.42) - Y(0)));
  // …and his visiting card pinned to the panel below it, with the pin
  const [cu, cv, cw2, ch2] = LEAF.card;
  box(cu, cv, cu + cw2, cv + ch2, fine * 0.85, { fill: PAPER });
  hatchRect(g, X(cu + cw2 * 0.12), Y(cv + ch2 * 0.35), X(cw2 * 0.76) - X(0), Y(ch2 * 0.3) - Y(0), {
    angle: 0, spacing: Math.max(1.4, pen * 0.8), width: fine * 0.5, wobble: wob * 0.4, broken: 0.5, rng, alpha: 0.8,
  });
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(X(cu + cw2 / 2), Y(cv) + pen * 0.4, pen * 0.5, pen * 0.4, 0, 0, Math.PI * 2);
  g.fill();
  return c;
}

// =================================================================================================
// 3. THE CROSSROADS. The picture the door opens on.
//
// THE FRAME IS THE PROBLEM AND THE FRAME IS THE ANSWER. The meme is a landscape: a child at the
// bottom middle, a fork, a castle at each end of a wide horizon. The doorway is 0.81 m by 2.07 m —
// a frame two and a half times taller than it is wide — and the landscape has to be RE-STAGED
// inside it rather than letter-boxed into it. So the horizon sits high, at four and a half tenths
// down; the two hills are pushed in until they nearly meet over the signpost; the sky above them
// takes the top third, which is where the sun and the lightning go, one at each side and as far
// apart as the sheet allows; and the whole bottom half is the road, opening out towards the sill
// with the child standing on it, his back to the room. A tall frame makes the road longer, which is
// the one thing a picture about two paths can afford to have more of.
//
// EVERYTHING IS IN THE PEN. The bright end is bare paper and outline; the dark end is the same
// three things with hatch inside them. That is the whole difference between the two halves, and it
// is the difference the film itself uses: a lit face is a contour, a shadowed one is strokes.
// =================================================================================================
const HZ = 0.452; // the horizon, down from the head of the plate
const FORK = 0.6; // where the road splits
const APEX = 0.5; // …and the wedge of grass between the two branches begins here

// The surface of the left-hand hill as a function of u: one long round crest. The castle is stood
// ON it block by block — the first pass squared it off at a single height and it floated at both
// ends, which is what a castle drawn on a ruler does to a hill drawn by hand.
const hillAt = (u) => (u < -0.02 || u > 0.48 ? HZ + 0.006 : HZ + 0.008 - 0.125 * Math.exp(-Math.pow((u - 0.175) / 0.175, 2)));

export function drawCrossroads({ w, h, ppm, penM, seed = 20260910 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed);
  const pen = penM * ppm;
  const fine = pen * 0.62;
  const wob = pen * 0.34;
  const X = (u) => u * W, Y = (v) => v * H;
  const P = (u, v) => [X(u), Y(v)];

  // the sheet. Not paper() — its grain is a wash, and this picture is meant to be as bare as the
  // plaster the door is cut into.
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);

  // ---- the weather in the picture, which is only over one half of it -----------------------------
  // A bank of cloud coming in from the right and running off the top of the sheet, so that it reads
  // as sky and not as three objects hanging in it. (The first pass ruled bands of broken hatch
  // across the head of the plate; at 22 px to the metre a broken stroke is a BLOB, and five rows of
  // blobs at the top of a tall picture is a page of type. The second drew three separate lozenges,
  // which floated. A cloud bank is one mass with a lumpy underside and no top at all.)
  //
  // The underside is SCALLOPED — a row of half-circles of different depths — because that is how a
  // pen draws cloud and nothing else does. A single long wave (the third pass) came out as a torn
  // edge of paper with hatching behind it, which put a second mountain in the sky.
  {
    const u0 = 0.315, u1 = 1.06, v0 = 0.072;
    const bumps = 6, step = (u1 - u0) / bumps;
    const under = [];
    for (let b = 0; b < bumps; b++) {
      const cu = u0 + step * (b + 0.5);
      const r = step * 0.56;
      const dp = 0.052 * (0.55 + 0.45 * Math.sin(b * 2.31 + 1.1));
      for (let i = 0; i <= 7; i++) {
        const a = Math.PI * (i / 7);
        under.push(P(cu - r * Math.cos(a), v0 + b * 0.012 + dp * Math.sin(a)));
      }
    }
    // it runs off the top of the sheet: two corners above the frame close it, so there is no upper
    // contour to read as the edge of an object
    const pts = [P(u0 - 0.03, -0.05), ...under, P(u1, -0.05)];
    poly(g, under, { width: pen * 0.8, wobble: wob, rng });
    hatchIn(g, pts, [X(u0 - 0.04), Y(-0.05), X(u1 - u0 + 0.08) - X(0), Y(0.24) - Y(0)], {
      angle: 1.2, spacing: pen * 2.4, width: fine * 0.5, wobble: wob * 0.9, broken: 0.12, rng, alpha: 0.55,
    });
  }

  // ---- the sun: the one plate of colour in the doorway ------------------------------------------
  const sun = P(0.2, 0.135), sr = W * 0.079;
  const disc = ring(sun[0], sun[1], sr, sr, 20);
  loop(g, disc, { width: 0, wobble: wob, rng, fill: SUN_Y });
  loop(g, disc, { width: pen * 0.85, wobble: wob, rng });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const r0 = sr * 1.3, r1 = sr * (1.55 + rng() * 0.35);
    inkLine(g, sun[0] + Math.cos(a) * r0, sun[1] + Math.sin(a) * r0, sun[0] + Math.cos(a) * r1, sun[1] + Math.sin(a) * r1, {
      width: fine, wobble: wob * 0.6, rng, segments: 1,
    });
  }

  // ---- the lightning, in ink, out of the cloud and down the far side of the crag -----------------
  // It is kept clear of the dark castle's own spire on purpose: struck through it, the bolt and the
  // spire read as one long lance stuck in the roof. And it is struck with the CARPENTER'S hand: a
  // zig-zag smoothed through its midpoints is not a zig-zag, it is a ribbon, and the third pass put
  // a length of tape down the sky instead of a bolt.
  frame(g, [P(0.955, 0.152), P(0.888, 0.232), P(0.933, 0.246), P(0.868, 0.332), P(0.912, 0.344), P(0.852, 0.43)], { width: pen * 1.35, wobble: wob * 0.4, rng, close: false, segments: 1 });
  frame(g, [P(0.912, 0.344), P(0.972, 0.398)], { width: pen * 0.85, wobble: wob * 0.4, rng, close: false, segments: 1 });

  // ---- the horizon --------------------------------------------------------------------------------
  poly(g, [P(0, HZ + 0.008), P(0.5, HZ - 0.001), P(1, HZ + 0.007)], { width: pen * 0.9, wobble: wob, rng });

  // ---- the LEFT hill and the bright castle standing on it -------------------------------------------
  const hill = [];
  for (let i = 0; i <= 14; i++) {
    const u = -0.01 + (0.49 * i) / 14;
    hill.push(P(u, hillAt(u)));
  }
  poly(g, hill, { width: pen * 0.95, wobble: wob, rng });
  {
    const u0 = 0.075, u1 = 0.295;
    const foot = (u) => hillAt(u) + 0.004;
    const block = (a, b, ht) => {
      const base = Math.min(foot(a), foot(b));
      frame(g, [P(a, foot(a)), P(a, base - ht), P(b, base - ht), P(b, foot(b))], { width: pen * 0.85, wobble: wob, rng, fill: PAPER });
      return base - ht;
    };
    const hallTop = block(u0 + 0.038, u0 + 0.148, 0.062);
    block(u0 + 0.148, u0 + 0.205, 0.104);
    for (let i = 0; i < 5; i++) {
      const uu = u0 + 0.044 + i * 0.0215;
      frame(g, [P(uu, hallTop), P(uu, hallTop - 0.013), P(uu + 0.0125, hallTop - 0.013), P(uu + 0.0125, hallTop)], { width: fine, wobble: wob * 0.7, rng, fill: PAPER, segments: 1 });
    }
    // two towers with conical caps and NO PENNANTS. A mast with a flag on it, at thirty pixels a
    // tower, drew a capital P on the hill twice over; the caps alone say castle and say nothing else.
    for (const [tu, th] of [[u0, 0.128], [u1 - 0.036, 0.094]]) {
      const tw = 0.036;
      const top = block(tu, tu + tw, th);
      frame(g, [P(tu - 0.017, top), P(tu + tw / 2, top - 0.037), P(tu + tw + 0.017, top)], { width: pen * 0.85, wobble: wob, rng, fill: PAPER });
    }
    for (const [wu, wv, tall] of [[u0 + 0.014, -0.09, 0.02], [u0 + 0.176, -0.07, 0.018], [u0 + 0.062, -0.03, 0.016], [u0 + 0.112, -0.03, 0.016]])
      inkLine(g, X(wu), Y(hillAt(wu) + wv), X(wu), Y(hillAt(wu) + wv + tall), { width: fine * 1.2, wobble: wob * 0.4, rng, segments: 1 });
  }

  // ---- the RIGHT crag and the dark castle on it -------------------------------------------------
  // The same three things — a hill, a keep, a tower — and every one of them full of strokes. The
  // crag is jagged where the hill is round and the castle is spiked where the other is capped.
  const crag = [P(1.005, HZ + 0.006), P(0.955, HZ - 0.042), P(0.905, HZ - 0.026), P(0.845, HZ - 0.122), P(0.79, HZ - 0.096), P(0.72, HZ - 0.148), P(0.655, HZ - 0.066), P(0.6, HZ - 0.044), P(0.535, HZ + 0.006)];
  poly(g, crag, { width: pen * 0.95, wobble: wob, rng });
  hatchIn(g, [...crag, P(1.005, HZ + 0.03), P(0.535, HZ + 0.03)], [X(0.53), Y(HZ - 0.16), X(0.48) - X(0), Y(0.2) - Y(0)], {
    angle: 1.15, spacing: pen * 1.5, width: fine * 0.7, wobble: wob * 0.8, broken: 0.25, rng, alpha: 0.85,
  });
  {
    const base = HZ - 0.142, u0 = 0.688;
    const keep = [P(u0, base + 0.014), P(u0, base - 0.068), P(u0 + 0.148, base - 0.068), P(u0 + 0.148, base + 0.014)];
    frame(g, keep, { width: pen * 0.9, wobble: wob, rng, fill: PAPER });
    const tower = [P(u0 + 0.094, base - 0.068), P(u0 + 0.094, base - 0.15), P(u0 + 0.148, base - 0.15), P(u0 + 0.148, base - 0.068)];
    frame(g, tower, { width: pen * 0.9, wobble: wob, rng, fill: PAPER });
    frame(g, [P(u0 + 0.086, base - 0.15), P(u0 + 0.121, base - 0.208), P(u0 + 0.156, base - 0.15)], { width: pen * 0.9, wobble: wob, rng, fill: PAPER });
    const box = [X(u0 - 0.012), Y(base - 0.22), X(0.18) - X(0), Y(0.26) - Y(0)];
    for (const shape of [keep, tower])
      hatchIn(g, shape, box, { angle: Math.PI / 2, spacing: pen * 1.3, width: fine * 0.65, wobble: wob * 0.7, broken: 0.15, rng, alpha: 0.9 });
    for (const shape of [keep, tower])
      hatchIn(g, shape, box, { angle: 0, spacing: pen * 1.9, width: fine * 0.55, wobble: wob * 0.7, broken: 0.4, rng, alpha: 0.7 });
    // the windows: PAPER, not ink. In a tower this full of strokes, the one white mark is the lit one.
    g.fillStyle = PAPER;
    for (const [wu, wv] of [[u0 + 0.11, base - 0.13], [u0 + 0.11, base - 0.1], [u0 + 0.028, base - 0.048], [u0 + 0.058, base - 0.048]])
      g.fillRect(X(wu), Y(wv), Math.max(1.4, pen * 0.9), Math.max(2, Y(0.019) - Y(0)));
  }

  // ---- the road, opening out towards the sill ---------------------------------------------------
  poly(g, [P(0.1, 1.0), P(0.235, 0.83), P(0.318, 0.695), P(0.358, FORK)], { width: pen * 0.95, wobble: wob, rng });
  poly(g, [P(0.9, 1.0), P(0.765, 0.83), P(0.682, 0.695), P(0.642, FORK)], { width: pen * 0.95, wobble: wob, rng });
  poly(g, [P(0.358, FORK), P(0.295, 0.538), P(0.238, 0.487), P(0.2, HZ + 0.008)], { width: pen * 0.85, wobble: wob, rng });
  poly(g, [P(APEX, 0.588), P(0.398, 0.538), P(0.315, 0.487), P(0.262, HZ + 0.008)], { width: pen * 0.85, wobble: wob, rng });
  poly(g, [P(APEX, 0.588), P(0.602, 0.538), P(0.688, 0.487), P(0.742, HZ + 0.008)], { width: pen * 0.85, wobble: wob, rng });
  poly(g, [P(0.642, FORK), P(0.706, 0.538), P(0.766, 0.487), P(0.806, HZ + 0.008)], { width: pen * 0.85, wobble: wob, rng });
  poly(g, [P(0.358, FORK), P(0.428, 0.621), P(APEX, 0.588)], { width: fine, wobble: wob * 0.8, rng });
  poly(g, [P(0.642, FORK), P(0.574, 0.621), P(APEX, 0.588)], { width: fine, wobble: wob * 0.8, rng });

  // the road surface: short dashes lying ALONG the road, tighter at the fork and longer at the sill.
  // Forty, and short: at a hundred and thirty, and at twice this length, they came out as rain
  // falling on the road, which is a thing this picture is already doing outside the window.
  for (let i = 0; i < 40; i++) {
    const t = rng();
    const v = FORK + (1 - FORK) * (t * t * 0.88 + 0.06);
    const k = (v - FORK) / (1 - FORK);
    const u0 = 0.358 - k * 0.258, u1 = 0.642 + k * 0.258;
    const u = u0 + 0.08 + rng() * (u1 - u0 - 0.16);
    const len = (0.007 + 0.012 * k) * (0.6 + rng() * 0.7);
    inkLine(g, X(u), Y(v), X(u + (u - 0.5) * 0.8 * len), Y(v + len), { width: fine * 0.7, wobble: wob * 0.4, rng, alpha: 0.4 + rng() * 0.3, segments: 1 });
  }

  // the ground either side: grass. Sparse and upright on the left, denser and leaning on the right,
  // because the wind in this picture comes off the crag.
  const tuft = (u, v, n, lean, alpha) => {
    for (let i = 0; i < n; i++) {
      const uu = u + (rng() - 0.5) * 0.022, vv = v + (rng() - 0.5) * 0.008;
      const hgt = 0.006 + rng() * 0.01;
      inkLine(g, X(uu), Y(vv), X(uu + lean * hgt * 1.5), Y(vv - hgt), { width: fine * 0.6, wobble: wob * 0.4, rng, alpha, segments: 1 });
    }
  };
  for (let i = 0; i < 20; i++) {
    const v = HZ + 0.03 + rng() * (0.97 - HZ);
    tuft(0.025 + rng() * (0.26 - ((v - HZ) / (1 - HZ)) * 0.02), v, 3, 0.28, 0.55);
  }
  for (let i = 0; i < 20; i++) {
    const v = HZ + 0.03 + rng() * (0.97 - HZ);
    tuft(0.73 + ((v - HZ) / (1 - HZ)) * 0.05 + rng() * 0.24, v, 3, -0.6, 0.7);
  }
  // …and one band of strokes low on the dark side, the only tone below the horizon
  hatchRect(g, X(0.82), Y(HZ + 0.03), X(0.18) - X(0), Y(0.12) - Y(0), {
    angle: 1.25, spacing: pen * 3.2, width: fine * 0.5, wobble: wob, broken: 0.4, rng, alpha: 0.4,
  });

  // ---- the signpost, standing in the fork -------------------------------------------------------
  // Drawn LAST, over the hills, because after the child it is the nearest thing in the picture; and
  // filled with paper, so the right-hand board reads against the hatched crag behind it. Its boards
  // are struck edge by edge and their points are POINTS: smoothed through their midpoints, the two
  // of them came out as a single lens lying across the middle of the sheet, which is the shape of
  // an eye and not of a signpost. They carry no lettering — nothing in this room is labelled, and a
  // signpost that named the two paths would be the first thing in it that was.
  {
    const pu = 0.492, foot = 0.582, head = 0.362, armV = 0.404, aw = 0.168, ah = 0.028;
    inkLine(g, X(pu + 0.005), Y(foot), X(pu), Y(head), { width: pen * 2.1, wobble: wob * 0.4, rng, segments: 3 });
    // the two boards are at DIFFERENT HEIGHTS, and that is the whole of what makes it a signpost.
    // Level with each other they meet at the post and read as ONE long box with a pole through it,
    // which is what the fourth pass drew; nailed one above the other they are two boards pointing
    // opposite ways, which is what a fork in a road has.
    for (const [dir, dv] of [[-1, -0.031], [1, 0.037]])
      frame(g, [P(pu, armV + dv - ah), P(pu + dir * (aw - 0.034), armV + dv - ah), P(pu + dir * aw, armV + dv), P(pu + dir * (aw - 0.034), armV + dv + ah), P(pu, armV + dv + ah)],
        { width: pen * 1.0, wobble: wob * 0.5, rng, fill: PAPER, segments: 1 });
    inkLine(g, X(pu - 0.026), Y(head), X(pu + 0.026), Y(head - 0.002), { width: pen * 1.1, wobble: wob * 0.4, rng, segments: 1 });
  }

  // ---- the child, from behind, standing where the road opens ------------------------------------
  // A fifth of the plate, with his back to the room: there is no face to draw, and that is the whole
  // of the picture's joke. He stands a little left of the signpost's line so the two do not touch.
  {
    const cu = 0.425, feet = 0.945, top = 0.735, hgt = feet - top;
    const hw = 0.06;
    const headR = hgt * 0.185;
    const headV = top + headR;
    const shoulder = top + headR * 2.15, hem = feet - hgt * 0.26;
    // the coat first and the head over it: a head drawn first shows its own chin through the collar
    frame(g, [P(cu - hw * 0.66, shoulder), P(cu - hw * 0.52, shoulder - hgt * 0.05), P(cu + hw * 0.52, shoulder - hgt * 0.05), P(cu + hw * 0.66, shoulder), P(cu + hw, hem), P(cu - hw, hem)],
      { width: pen * 0.95, wobble: wob * 0.5, rng, fill: PAPER, segments: 2 });
    const head = ring(X(cu), Y(headV), X(headR * 0.62) - X(0), Y(headR) - Y(0), 16);
    loop(g, head, { width: pen * 0.9, wobble: wob * 0.5, rng, fill: PAPER });
    // the back of his head, in strokes: the one mark that says he is facing away
    hatchIn(g, head, [X(cu - hw), Y(top - 0.004), X(hw * 2) - X(0), Y(headR * 1.5) - Y(0)],
      { angle: Math.PI / 2, spacing: pen * 1.15, width: fine * 0.6, wobble: wob * 0.5, broken: 0.15, rng, alpha: 0.95 });
    inkLine(g, X(cu - hw * 0.74), Y(shoulder + hgt * 0.02), X(cu - hw * 1.0), Y(hem - hgt * 0.01), { width: pen * 0.8, wobble: wob * 0.4, rng, segments: 2 });
    inkLine(g, X(cu + hw * 0.74), Y(shoulder + hgt * 0.02), X(cu + hw * 1.03), Y(hem - hgt * 0.01), { width: pen * 0.8, wobble: wob * 0.4, rng, segments: 2 });
    for (const s of [-1, 1]) {
      inkLine(g, X(cu + s * hw * 0.4), Y(hem - hgt * 0.01), X(cu + s * hw * 0.46), Y(feet), { width: pen * 0.9, wobble: wob * 0.4, rng, segments: 2 });
      inkLine(g, X(cu + s * hw * 0.46), Y(feet), X(cu + s * hw * 0.94), Y(feet), { width: pen * 0.9, wobble: wob * 0.35, rng, segments: 1 });
    }
    for (let i = 0; i < 3; i++)
      inkLine(g, X(cu - hw * 0.75 + i * hw * 0.55), Y(feet + 0.005), X(cu - hw * 0.2 + i * hw * 0.55), Y(feet + 0.007), { width: fine * 0.8, wobble: wob * 0.4, rng, alpha: 0.7, segments: 1 });
  }
  return c;
}
