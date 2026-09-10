// THE DRAWINGS THE CROSS EGG NEEDS, and nothing else lives in here: the little cross on the frieze,
// the door leaf as a sheet (because the room's own leaf is merged into the wall and cannot swing),
// the weather that stands in the opening once the leaf is off the jamb, and the crossroads — which
// after round 2 is not in the doorway at all but a plate in the open air that the room cuts to.
//
// ONE PEN FOR ALL OF THEM. Every drawing here is cut at a canvas scale of its own — the cross is
// 0.2 m across and the crossroads is 6 m wide — so a nib measured in canvas pixels would be half a
// dozen different nibs. The nib is passed in METRES and multiplied by that sheet's own px/m, which
// makes the cross's stroke and the castle's contour the same width on the glass. The number for the
// sheets that hang on the back wall is the room's own contour, 0.013 m there (the width at which the
// ink pass stops throwing a mark away as a stray dark pixel — room-textures.js measured it for the
// wallpaper's ghost sprigs), and each is struck one notch under it, as egg-rain's weather is. The
// crossroads plate stands 6.28 m out instead of 5, and its own nib is set from the same rule at that
// distance (egg-cross.js, PEN_PLATE).
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
// 3. THE DOORWAY, AND WHAT IS THROUGH IT NOW.
//
// ROUND 2, AND THE ROUND'S WHOLE POINT. Round 1 stood the crossroads IN the opening and the user
// looked at it once: "naw, this looks terrible - this doesn't work." The meme is a wide landscape
// and the doorway is a tall slot two and a half times higher than it is wide; squashed into it the
// horizon becomes a stripe and every figure in it is drawn at a quarter of the size the frame the
// film is actually shown in could carry. The fix is his: CUT THROUGH THE DOOR. So the opening
// carries nothing but weather now, and the picture is a plate in the open air two drawings later.
//
// WHAT THE OPENING CARRIES, and it is three sheets and no drawing of a place:
//
//   THE OUTSIDE is one sheet cut to the opening: bare paper with a single level of the room's own
//     rain-strokes over it, widely spaced. It is not a landscape and it is not a wall. It is the
//     tone the afternoon has gone to, and it is also the thing that HIDES THE MERGED LEAF — room.js
//     builds the real door into the same buffer as the skirting and there is no object to move, so
//     something opaque has to stand in the opening whenever the drawn leaf is off the jamb.
//   THE RAIN is egg-rain's own drawing, at egg-rain's own nib and slant, dealt off the same kind of
//     stratified grid, and re-struck on every 12 fps drawing — four independent throws in one
//     atlas, the sheet's UVs re-pointed at the step's column. Hand-drawn rain is re-struck each
//     frame, which is why it flickers and why it is alive.
//   THE FLASH is bare paper, cut to the same opening, on for ONE drawing with the rain taken off
//     it: the whole doorway goes white while the room's own tone jumps. A flash that lasted two
//     drawings would be a lamp.
// =================================================================================================

// egg-rain.js's own stroke, in egg-rain.js's own words: "one straight dash at 17 deg off the
// vertical, a pen's width, a hand's wobble, no head, no splash, no ellipse."
export const RAIN_SLANT = 0.3;
const RAIN_LEN = [0.055, 0.115]; // metres: a dash, not a streak

// The outside in the rain: paper, and one level of strokes leaning the way the weather does.
export function drawOutside({ w, h, ppm, penM, seed = 5501 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed);
  const pen = penM * ppm;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  // ONE level, and widely spaced. Two levels in an opening 147 px wide at the home plate is a black
  // rectangle in the wall, which is a hole and not weather; one at this spacing is the tone an
  // overcast doorway goes to, built out of marks the pen actually made.
  hatchRect(g, 0, 0, W, H, { angle: Math.PI / 2, spacing: pen * 6.2, width: pen * 0.45, wobble: pen * 0.4, broken: 0.9, rng, jitter: pen * 2.2, alpha: 0.4 });
  // …and the ground outside it, which is the one line that says a road is out there at all: a
  // single stroke low across the opening, where a threshold gives onto it.
  inkLine(g, 0, H * 0.9, W, H * 0.9 - pen * 0.6, { width: pen * 0.8, wobble: pen * 0.5, rng, segments: 4, alpha: 0.8 });
  return c;
}

// The rain itself, four throws in one atlas. The deal is stratified for egg-rain's reason: a field
// generated on a grid and handed out every fourth drop divides the OPENING and not the rain.
export function drawRain({ w, h, ppm, penM, cols = 4, seed = 8123 }) {
  const TW = Math.round(w * ppm), TH = Math.round(h * ppm);
  const c = makeCanvas(TW * cols, TH);
  const g = c.getContext('2d');
  const pen = penM * ppm;
  // cells about 75 mm across and 105 down, which is egg-rain's density on a pane of its casement
  const gx = Math.max(3, Math.round(w / 0.115)), gy = Math.max(4, Math.round(h / 0.16));
  const cw = TW / gx, ch = TH / (gy - 1);
  for (let col = 0; col < cols; col++) {
    const rng = mulberry32(seed + col * 7919);
    g.save();
    g.beginPath();
    g.rect(col * TW, 0, TW, TH);
    g.clip();
    for (let j = 0; j < gy; j++)
      for (let i = 0; i < gx; i++) {
        // the first row starts ABOVE the sheet, so rain crosses the head of the opening instead of
        // beginning at it: a doorway whose rain starts tidily at its head is a pattern, not weather
        const x = col * TW + (i + 0.5) * cw + (rng() - 0.5) * cw * 0.9;
        const y = (j - 1 + 0.5) * ch + (rng() - 0.5) * ch * 0.8;
        const len = (RAIN_LEN[0] + rng() * (RAIN_LEN[1] - RAIN_LEN[0])) * ppm;
        const a = RAIN_SLANT + (rng() - 0.5) * 0.09;
        inkLine(g, x, y, x + Math.sin(a) * len, y + Math.cos(a) * len, {
          width: pen * (0.82 + rng() * 0.36), wobble: pen * 0.16, rng, segments: 2,
        });
      }
    g.restore();
  }
  return c;
}

// =================================================================================================
// 4. THE CROSSROADS, ON A PLATE IN THE OPEN AIR.
//
// The sheet is 6.00 x 5.22 m and stands 6.28 m from the lens (src/pieces/egg-cross-plate.js holds
// those numbers and the cover fit that solves the lens for whatever window we are in). It fills the
// frame at every aspect, and the two named windows keep different parts of it:
//
//   a laptop  (1920x1080)  its WHOLE WIDTH and the middle 64 % of its height
//   a phone   (390x844)    its WHOLE HEIGHT and the middle 40 % of its width
//
// so the part BOTH of them see is u 0.302..0.698 by v 0.1815..0.8185 — PLATE.safe. Everything the
// picture is about is drawn inside that box: the fork, the signpost with two arms, the child from
// behind, the bright castle under its sun, the dark castle under its lightning. Outside it is not
// margin and is not blank — it is the rest of the country, which is what a laptop is given more of,
// and the sky and the road, which is what a phone is given more of.
//
// THE SECOND RULE, and it is the one the round-1 drawing never had to think about: THE PLACARD
// STANDS ON THE ROAD. His line goes up on the drawn card at the foot of this frame like every other
// line in the film, and the card is opaque. So the child's soles are at v 0.667 — three quarters of
// the way down a laptop's frame — and everything under him is open road, which is what a caption
// should stand on and what a picture about two paths can most afford to have more of.
//
// THE SKY IS A SHEET OF ITS OWN, STANDING BEHIND THIS ONE, and that is why this drawing's sky is
// left BARE PAPER-LESS — transparent — down to the skyline. Choose the left-hand road and the storm
// has to clear while the visitor is still looking out at the country, and a bank of cloud drawn
// into the landscape cannot lift off it. Everything below the skyline is filled with paper here;
// everything above it is a hole, and the weather sheet is what is seen through the hole. The hills
// and the two castles therefore occlude the cloud exactly as they should.
//
// EVERYTHING IS IN THE PEN, and the two ends of the picture are the same three things drawn with
// and without tone: the bright end is bare paper and contour, the dark end is contour with hatch
// inside it. That is the difference the film itself uses — a lit face is a contour, a shadowed one
// is strokes — and it is the whole of what separates the two roads.
//
// ONE COLOUR: the sun, in the fire's yellow #f2b829 (egg-fine.js). Nothing else on the sheet is
// anything but ink on paper.
// =================================================================================================

// The picture's own geography, in the plate's u,v. Read by the landscape, by the weather sheet that
// lifts off behind it, and by the strike that blanks the lot for one drawing — so the three
// drawings are the same country and not three guesses at it.
export const LAND = {
  hz: 0.455, // the horizon, at the height of the lens: the visitor is standing on this road
  fork: 0.5, // where the near road splits
  apex: [0.51, 0.484], // …and the nose of the wedge of grass between the two branches
  sun: [0.34, 0.25, 0.034], // u, v, radius as a fraction of the sheet's WIDTH (the pixels are square)
  bright: 0.394, // the bright castle's own centre line, on the crest of the left hill
  dark: 0.596, // the dark castle's, on the flat of the crag
  child: [0.445, 0.52, 0.667], // u, the top of his head, the soles of his shoes
  skyV: 0.4, // how far down the sheet the weather sheet behind it reaches
};

// The left-hand hill: one long round crest with a slow left flank and a short right one, so it
// comes out of the far distance and drops behind the fork rather than sitting on the sheet like a
// loaf. The castle is stood ON it block by block, each block on its own foot.
export const hillAt = (u) => {
  const c = LAND.bright - 0.014;
  return LAND.hz + 0.006 - 0.092 * Math.exp(-Math.pow((u - c) / (u < c ? 0.26 : 0.115), 2));
};
export const hillLine = (n = 20) => {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const u = -0.05 + (0.6 * i) / n;
    p.push([u, hillAt(u)]);
  }
  return p;
};
// The right-hand crag: jagged where the hill is round, and flat across the top between u 0.556 and
// 0.636, because a castle has to stand on something.
export const CRAG = [
  [0.49, 0.462], [0.528, 0.422], [0.548, 0.434], [0.556, 0.358], [0.596, 0.35], [0.636, 0.36],
  [0.664, 0.4], [0.706, 0.384], [0.752, 0.418], [0.808, 0.404], [0.87, 0.436], [0.936, 0.426], [1.05, 0.462],
];
// the bolt, out of the cloud and down behind the crag's right shoulder, kept clear of the dark
// castle's own spire: struck through it, the bolt and the spire read as one lance stuck in the roof
export const BOLT = [[0.666, 0.262], [0.648, 0.306], [0.68, 0.316], [0.654, 0.356], [0.686, 0.366], [0.664, 0.412]];
// the two roads, as the ground the visitor points at: the near kerbs, and the branch each way
const ROADS = {
  nearL: [[0.01, 1.02], [0.145, 0.8], [0.29, 0.635], [0.408, 0.5]],
  nearR: [[0.99, 1.02], [0.855, 0.8], [0.71, 0.635], [0.612, 0.5]],
  leftOut: [[0.408, 0.5], [0.352, 0.47], [0.278, 0.442], [0.196, 0.46]],
  leftIn: [[0.51, 0.484], [0.43, 0.467], [0.352, 0.44], [0.268, 0.46]],
  rightIn: [[0.51, 0.484], [0.59, 0.467], [0.668, 0.44], [0.752, 0.46]],
  rightOut: [[0.612, 0.5], [0.668, 0.47], [0.742, 0.442], [0.824, 0.46]],
  noseL: [[0.408, 0.5], [0.462, 0.494], [0.51, 0.484]],
  noseR: [[0.612, 0.5], [0.558, 0.494], [0.51, 0.484]],
};
// the signpost, standing in the fork
const POST = { u: 0.515, foot: 0.5, head: 0.338, aw: 0.068, ah: 0.013, arms: [[-1, 0.378], [1, 0.414]] };

// the bright castle's four blocks and the dark one's three, so the strike sheet stands the same
// castles in the same places with the tone left off them
const brightBlocks = () => {
  const u0 = LAND.bright - 0.038;
  return { tower1: [u0, u0 + 0.024, 0.082], hall: [u0 + 0.024, u0 + 0.06, 0.048], tower2: [u0 + 0.06, u0 + 0.082, 0.064] };
};
const darkBlocks = () => {
  const d = LAND.dark, b = 0.352;
  return {
    keep: [[d - 0.038, b + 0.006], [d - 0.038, b - 0.052], [d + 0.038, b - 0.052], [d + 0.038, b + 0.006]],
    tower: [[d + 0.004, b - 0.052], [d + 0.004, b - 0.094], [d + 0.038, b - 0.094], [d + 0.038, b - 0.052]],
    spire: [[d - 0.004, b - 0.094], [d + 0.021, b - 0.13], [d + 0.046, b - 0.094]],
  };
};

export function drawLandscape({ w, h, ppm, penM, seed = 20260910 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed);
  const pen = penM * ppm;
  const fine = pen * 0.62;
  const wob = pen * 0.34;
  const X = (u) => u * W, Y = (v) => v * H;
  const P = (u, v) => [X(u), Y(v)];
  const L = (pts) => pts.map(([u, v]) => P(u, v));
  const HZ = LAND.hz;

  // ---- the ground: paper below the skyline, and a HOLE above it -----------------------------------
  // Everything the eye reads as land is filled with paper here. The sky is left transparent so the
  // weather sheet standing a centimetre behind shows through it — and so the hills and the castles
  // occlude the cloud rather than being drawn over by it.
  const hill = hillLine();
  const far = [];
  for (let i = 0; i <= 14; i++) {
    const u = -0.05 + (0.44 * i) / 14;
    far.push([u, HZ + 0.004 - 0.03 * Math.exp(-Math.pow((u - 0.115) / 0.17, 2))]);
  }
  const farR = [[0.83, HZ + 0.002], [0.9, HZ - 0.022], [0.955, HZ - 0.012], [1.05, HZ + 0.004]];
  const fill = (pts) => {
    g.save();
    g.fillStyle = PAPER;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
    g.closePath();
    g.fill();
    g.restore();
  };
  g.fillStyle = PAPER;
  g.fillRect(0, Y(HZ - 0.002), W, H - Y(HZ - 0.002) + 2);

  // ---- the sun: the one plate of colour in the whole business ------------------------------------
  // It sits in the clear quarter of the sky, west of the cloud bank, and it is inside the phone's
  // own band — which is the reason it is where it is and not out at the edge where the meme puts
  // it. A phone must see it. (The sheet's pixels are square, so one radius in px is a round sun.)
  {
    const [su, sv, sr] = LAND.sun;
    const r = X(sr) - X(0), cx = X(su), cy = Y(sv);
    const disc = ring(cx, cy, r, r, 22);
    loop(g, disc, { width: 0, wobble: wob, rng, fill: SUN_Y });
    loop(g, disc, { width: pen * 0.9, wobble: wob, rng });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.22;
      const r0 = r * 1.16, r1 = r * (1.3 + rng() * 0.13);
      inkLine(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, {
        width: fine * 1.15, wobble: wob * 0.6, rng, segments: 1,
      });
    }
  }

  // ---- the country, BACK TO FRONT ------------------------------------------------------------------
  // Each ridge is FILLED and then struck, in order of distance, so the one in front simply covers
  // the one behind it. The first pass filled all four at the top and struck them afterwards, and
  // every line in the picture crossed every other: the horizon ran through the hill, the far ridge
  // ran through the horizon, and the whole middle distance came out as a lattice. A draughtsman
  // draws the far thing, then paints the near thing over it.
  fill(L([...far, [0.44, HZ + 0.02], [-0.05, HZ + 0.02]]));
  poly(g, L(far), { width: fine * 1.15, wobble: wob, rng, alpha: 0.65 });
  fill(L([...farR, [1.05, HZ + 0.02], [0.83, HZ + 0.02]]));
  poly(g, L(farR), { width: fine * 1.15, wobble: wob, rng, alpha: 0.65 });
  poly(g, [P(-0.03, HZ + 0.006), P(0.5, HZ - 0.001), P(1.03, HZ + 0.005)], { width: pen * 0.9, wobble: wob, rng });

  // ---- the LEFT hill, and the bright castle standing on it -----------------------------------------
  fill(L([...hill, [0.55, HZ + 0.02], [-0.05, HZ + 0.02]]));
  poly(g, L(hill), { width: pen * 0.95, wobble: wob, rng });
  // three trees down the flank, small and on the far side of it: the one thing that gives the hill
  // a size. Two marks each — a trunk and a round head — because at this distance that is two marks.
  for (const [tu, ts] of [[0.128, 0.9], [0.196, 1.1], [0.262, 0.8]]) {
    const tv = hillAt(tu), th = (0.019 * ts * W) / H; // a height in v that is the same length in u
    inkLine(g, X(tu), Y(tv + 0.002), X(tu), Y(tv - th * 0.5), { width: fine, wobble: wob * 0.4, rng, segments: 1 });
    const rr = X(0.0085 * ts) - X(0);
    loop(g, ring(X(tu), Y(tv - th * 0.7), rr, rr, 10), { width: fine * 1.15, wobble: wob * 0.7, rng, fill: PAPER });
  }
  {
    const foot = (u) => hillAt(u) + 0.003;
    const block = (a, b, ht) => {
      const base = Math.min(foot(a), foot(b));
      frame(g, [P(a, foot(a)), P(a, base - ht), P(b, base - ht), P(b, foot(b))], { width: pen * 0.85, wobble: wob, rng, fill: PAPER });
      return base - ht;
    };
    const cap = (a, b, top) => frame(g, [P(a - 0.008, top), P((a + b) / 2, top - 0.026), P(b + 0.008, top)], { width: pen * 0.85, wobble: wob, rng, fill: PAPER });
    const B = brightBlocks();
    const hallTop = block(...B.hall);
    // five crenellations along the hall's parapet — merlons, not a comb: each is its own little box
    for (let i = 0; i < 5; i++) {
      const uu = B.hall[0] + 0.004 + i * 0.0068;
      frame(g, [P(uu, hallTop), P(uu, hallTop - 0.009), P(uu + 0.004, hallTop - 0.009), P(uu + 0.004, hallTop)], { width: fine, wobble: wob * 0.6, rng, fill: PAPER, segments: 1 });
    }
    // two towers with conical caps and NO PENNANTS: a mast with a flag on it at this size draws a
    // capital P on the hill. The caps alone say castle and say nothing else.
    for (const t of [B.tower1, B.tower2]) cap(t[0], t[1], block(...t));
    // windows: single strokes, and there are four of them
    const u0 = LAND.bright - 0.038;
    for (const [wu, wv, tall] of [[u0 + 0.011, -0.052, 0.012], [u0 + 0.07, -0.04, 0.011], [u0 + 0.034, -0.022, 0.01], [u0 + 0.05, -0.022, 0.01]])
      inkLine(g, X(wu), Y(hillAt(wu) + wv), X(wu), Y(hillAt(wu) + wv + tall), { width: fine * 1.3, wobble: wob * 0.4, rng, segments: 1 });
  }

  // ---- the RIGHT crag, and the dark castle on it ---------------------------------------------------
  // The same three things — a hill, a keep, a tower — and every one of them full of strokes. The
  // crag is jagged where the hill is round and the castle is spiked where the other one is capped.
  fill(L([...CRAG, [1.05, HZ + 0.02], [0.49, HZ + 0.02]]));
  poly(g, L(CRAG), { width: pen * 0.95, wobble: wob, rng });
  hatchIn(g, L([...CRAG, [1.05, HZ + 0.02], [0.49, HZ + 0.02]]), [X(0.48), Y(0.33), X(0.58) - X(0), Y(0.15) - Y(0)], {
    angle: 1.15, spacing: pen * 2.0, width: fine * 0.7, wobble: wob * 0.8, broken: 0.25, rng, alpha: 0.8,
  });
  {
    const D = darkBlocks();
    for (const k of ['keep', 'tower', 'spire']) frame(g, L(D[k]), { width: pen * 0.9, wobble: wob, rng, fill: PAPER });
    const base = 0.352, du = LAND.dark;
    const box = [X(du - 0.05), Y(base - 0.14), X(0.1) - X(0), Y(0.16) - Y(0)];
    for (const k of ['keep', 'tower', 'spire'])
      hatchIn(g, L(D[k]), box, { angle: Math.PI / 2 + 0.12, spacing: pen * 1.5, width: fine * 0.7, wobble: wob * 0.9, broken: 0.35, rng, alpha: 0.9 });
    for (const k of ['keep', 'tower'])
      hatchIn(g, L(D[k]), box, { angle: 0.42, spacing: pen * 2.6, width: fine * 0.6, wobble: wob * 0.9, broken: 0.55, rng, alpha: 0.8 });
    // the windows: PAPER, not ink. In a tower this full of strokes the one white mark is the lit one.
    g.fillStyle = PAPER;
    for (const [wu, wv] of [[du + 0.016, base - 0.082], [du + 0.016, base - 0.07], [du - 0.026, base - 0.038], [du - 0.008, base - 0.038]])
      g.fillRect(X(wu), Y(wv), Math.max(1.6, pen * 0.9), Math.max(2, Y(0.009) - Y(0)));
  }
  // …and one band of strokes low on the dark side of the country: the only tone below the horizon,
  // and the storm's own shadow lying across the fields under the crag
  hatchRect(g, X(0.7), Y(HZ + 0.008), X(0.32) - X(0), Y(0.05) - Y(0), {
    angle: 1.25, spacing: pen * 3.6, width: fine * 0.5, wobble: wob, broken: 0.4, rng, alpha: 0.42,
  });

  // ---- the road, forking away from the foreground ---------------------------------------------------
  // The two near kerbs run off the bottom corners of the sheet — a phone stands the visitor on this
  // road — and close to a road's width at the fork. Then a branch each way, to the horizon.
  for (const k of ['nearL', 'nearR']) poly(g, L(ROADS[k]), { width: pen * 0.95, wobble: wob, rng });
  for (const k of ['leftOut', 'leftIn', 'rightIn', 'rightOut']) poly(g, L(ROADS[k]), { width: pen * 0.85, wobble: wob, rng });
  for (const k of ['noseL', 'noseR']) poly(g, L(ROADS[k]), { width: fine, wobble: wob * 0.8, rng });

  // THE ROAD SURFACE, AND IT LIES ALONG THE ROAD. The first pass scattered short strokes straight
  // down the near road and the whole foreground read as rain falling on it — which is a thing this
  // picture is already doing on the other side of the wall. A mark on a road in perspective runs
  // AWAY FROM THE VANISHING POINT, so every dash here is struck along the ray from the fork through
  // where it lies, and lengthens with the square of how near it is.
  {
    const [vu, vv] = LAND.apex;
    for (let i = 0; i < 44; i++) {
      const t = rng();
      const v = LAND.fork + (1 - LAND.fork) * (t * t * 0.92 + 0.05);
      const k = (v - LAND.fork) / (1 - LAND.fork);
      const u0 = 0.408 - k * 0.398, u1 = 0.612 + k * 0.378;
      const u = u0 + 0.06 + rng() * (u1 - u0 - 0.12);
      const dx = (u - vu) * W, dy = (v - vv) * H, d = Math.hypot(dx, dy) || 1;
      const len = (0.008 + 0.05 * k * k) * (0.6 + rng() * 0.8) * H;
      inkLine(g, X(u), Y(v), X(u) + (dx / d) * len, Y(v) + (dy / d) * len, { width: fine * 0.75, wobble: wob * 0.4, rng, alpha: 0.3 + rng() * 0.28, segments: 1 });
    }
  }

  // THE VERGES. Grass grows at the edge of a road, and the first pass sowed it across both whole
  // fields, where at this scale it came out as more rain. It is clumped along the kerbs now — five
  // blades to a tuft, upright on the bright side and leaning off the crag on the dark one — and the
  // open country either side of the two roads is left as bare paper, which is what a field of it is.
  const tuft = (u, v, n, lean, scale) => {
    for (let i = 0; i < n; i++) {
      const uu = u + (rng() - 0.5) * 0.012 * scale, vv = v + (rng() - 0.5) * 0.005 * scale;
      const hgt = (0.005 + rng() * 0.012) * scale;
      inkLine(g, X(uu), Y(vv), X(uu + lean * hgt * 1.4), Y(vv - hgt), { width: fine * 0.7, wobble: wob * 0.4, rng, segments: 1 });
    }
  };
  // along a kerb: `at` walks the polyline and drops a tuft a little to one side of it
  const alongside = (line, side, n, lean) => {
    for (let i = 0; i < n; i++) {
      const t = rng();
      const a = line[Math.min(line.length - 2, Math.floor(t * (line.length - 1)))];
      const b = line[Math.min(line.length - 1, Math.floor(t * (line.length - 1)) + 1)];
      const s = t * (line.length - 1) - Math.floor(t * (line.length - 1));
      const u = a[0] + (b[0] - a[0]) * s, v = a[1] + (b[1] - a[1]) * s;
      const near = Math.max(0.18, (v - HZ) / (1 - HZ)); // how big a blade of grass is at that depth
      tuft(u + side * (0.006 + rng() * 0.03) * near, v, 5, lean, 0.35 + near * 1.5);
    }
  };
  alongside(ROADS.nearL, -1, 10, 0.3);
  alongside(ROADS.nearR, 1, 10, -0.55);
  alongside(ROADS.leftOut, -1, 4, 0.3);
  alongside(ROADS.rightOut, 1, 4, -0.55);
  // the wedge of grass between the two branches, which is the one piece of ground the fork itself has
  for (let i = 0; i < 5; i++) tuft(0.46 + rng() * 0.1, LAND.apex[1] + 0.008 + rng() * 0.014, 4, 0.25, 0.5);

  // A HEDGEROW along the bright road's outer verge, running away towards the horizon: the one
  // grown thing in the middle distance, and the mark that gives the left half of a laptop's frame
  // something to be. A drystone wall was tried first and drawn bay by bay it read as a ladder lying
  // in the field — a row of little boxes at that size is a row of little boxes. A hedge is a run of
  // overlapping round masses getting smaller, which is a shape nothing else in this picture has.
  {
    const N = 22;
    const foot = [], crest = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const u = 0.345 - t * 0.212, vv = 0.518 - t * 0.05;
      const hgt = (0.026 - t * 0.019) * (0.78 + 0.28 * Math.sin(i * 1.9 + 0.6) + rng() * 0.14);
      foot.push([u, vv]);
      crest.push([u, vv - hgt]);
    }
    const shape = [...crest, ...foot.slice().reverse()];
    fill(L(shape));
    poly(g, L(crest), { width: fine * 1.15, wobble: wob * 0.9, rng });
    inkLine(g, X(foot[0][0]), Y(foot[0][1]), X(foot[N][0]), Y(foot[N][1]), { width: fine * 0.85, wobble: wob * 0.6, rng, alpha: 0.7, segments: 5 });
    hatchIn(g, L(shape), [X(0.12), Y(0.44), X(0.24) - X(0), Y(0.09) - Y(0)], {
      angle: Math.PI / 2 - 0.25, spacing: pen * 1.5, width: fine * 0.6, wobble: wob * 0.8, broken: 0.45, rng, alpha: 0.75,
    });
  }

  // …and two wheel ruts down the near road, converging on the fork: the thing that says a cart has
  // been along it, and the only marks in the empty foot of the frame that a caption will not cover.
  for (const s of [-1, 1])
    poly(g, [P(0.5 + s * 0.3, 1.02), P(0.5 + s * 0.2, 0.79), P(0.5 + s * 0.11, 0.63), P(0.5 + s * 0.05, LAND.fork + 0.02)],
      { width: fine * 0.75, wobble: wob * 0.7, rng, alpha: 0.45 });

  // ---- the signpost, standing in the fork ------------------------------------------------------
  // Drawn over the country because after the child it is the nearest thing in the picture, and
  // filled with paper so the right-hand board reads against the hatched crag behind it. Its boards
  // are struck edge by edge and their points are POINTS. And they are at DIFFERENT HEIGHTS, which
  // is the whole of what makes it a signpost: level with each other they meet at the post and read
  // as one long box with a pole through it. They carry no lettering — nothing in this room is
  // labelled, and a signpost that named the two paths would be the first thing in it that was.
  postInto(g, { X, Y, P, pen, wob, rng });

  // ---- the child, from behind, standing where the road opens ------------------------------------
  childInto(g, { X, Y, P, W, H, pen, fine, wob, rng, tone: true });
  return c;
}

function postInto(g, { X, Y, P, pen, wob, rng }) {
  const { u, foot, head, aw, ah, arms } = POST;
  inkLine(g, X(u + 0.002), Y(foot), X(u), Y(head), { width: pen * 1.5, wobble: wob * 0.4, rng, segments: 3 });
  for (const [dir, av] of arms)
    frame(g, [P(u, av - ah), P(u + dir * (aw - 0.018), av - ah), P(u + dir * aw, av), P(u + dir * (aw - 0.018), av + ah), P(u, av + ah)],
      { width: pen * 0.95, wobble: wob * 0.5, rng, fill: PAPER, segments: 1 });
  inkLine(g, X(u - 0.013), Y(head), X(u + 0.013), Y(head - 0.001), { width: pen, wobble: wob * 0.4, rng, segments: 1 });
}

// THE CHILD, from behind, standing where the road opens. His back is to the room and there is no
// face to draw, which is the whole of the picture's joke. He is properly built for once — a head
// with hair on it, a shirt with short sleeves, shorts, bare legs and two shoes — because at 23 % of
// a laptop's frame he is 250 px tall, and a lozenge with legs at that size is a lozenge with legs.
// Pulled out of the landscape so the sheet that blanks the picture for a strike can stand the same
// boy in the same place with the tone left off him.
//
// TWO THINGS THE FIRST PASSES GOT WRONG AND WHY THE ORDER BELOW IS THE ORDER:
//
//   THE ARMS ARE DRAWN LAST, OVER THE SHORTS. Drawn between the shirt and the shorts they were
//   painted out from the elbow down by the shorts' own paper fill, and what was left was a short
//   box at each shoulder — two epaulettes. A hanging arm crosses the hip, so it goes on top.
//   THE HEAD IS HATCHED TO ITS OWN EDGE. Stopping the hair at half the head's height left a bare
//   crescent under it, and a white crescent at the bottom of a head is a chin: the boy appeared to
//   have turned round. From behind, the whole of a head is hair, and the nape is one line struck
//   across it afterwards.
function childInto(g, { X, Y, P, W, H, pen, fine, wob, rng, tone }) {
  const [cu, top, feet] = LAND.child;
  const hgt = feet - top;
  const headRv = hgt * 0.115; // in v
  const headRu = (headRv * H) / W / 1.1; // …and a head a little taller than it is wide, in u
  const headV = top + headRv;
  const sh = top + headRv * 2.45; // the shoulders
  const hem = top + hgt * 0.585; // the shirt's hem
  const kn = top + hgt * 0.775; // where the shorts end
  const hw = hgt * 0.146; // his half-width across the shoulders

  // the neck, drawn first and covered at both ends: without it the head floated a finger's width
  // over the collar and the boy read as a balloon on a string
  frame(g, [P(cu - headRu * 0.4, headV + headRv * 0.5), P(cu + headRu * 0.4, headV + headRv * 0.5), P(cu + headRu * 0.36, sh + hgt * 0.01), P(cu - headRu * 0.36, sh + hgt * 0.01)],
    { width: pen * 0.8, wobble: wob * 0.4, rng, fill: PAPER, segments: 1 });
  // the shirt: sloped shoulders, a collar between them, and a hem a little wider than the chest
  frame(g, [
    P(cu - hw * 0.9, sh + hgt * 0.012), P(cu - hw * 0.34, sh - hgt * 0.016), P(cu + hw * 0.34, sh - hgt * 0.016),
    P(cu + hw * 0.9, sh + hgt * 0.012), P(cu + hw * 0.96, hem), P(cu - hw * 0.96, hem),
  ], { width: pen * 0.95, wobble: wob * 0.5, rng, fill: PAPER, segments: 2 });

  // THE SHORTS, AND WHAT MAKES THEM SHORTS AND NOT A SKIRT: the notch. A box the width of the shirt
  // with a short line down the middle of it is a skirt with a crease in it, which is what the first
  // pass drew. Two legs of cloth with a V cut up between them, drawn as one outline, is a pair of
  // shorts at any size — and they are cut a little wider than the shirt's hem, as a child's are.
  frame(g, [
    P(cu - hw * 1.0, hem - hgt * 0.012), P(cu + hw * 1.0, hem - hgt * 0.012),
    P(cu + hw * 0.96, kn), P(cu + hw * 0.24, kn), P(cu, kn - hgt * 0.085), P(cu - hw * 0.24, kn), P(cu - hw * 0.96, kn),
  ], { width: pen * 0.9, wobble: wob * 0.5, rng, fill: PAPER, segments: 1 });

  // legs and shoes: bare legs, and the shoes seen from behind — a heel, a sole, and that is all
  for (const s of [-1, 1]) {
    frame(g, [P(cu + s * hw * 0.24, kn - hgt * 0.005), P(cu + s * hw * 0.7, kn - hgt * 0.005), P(cu + s * hw * 0.64, feet - hgt * 0.05), P(cu + s * hw * 0.3, feet - hgt * 0.05)],
      { width: pen * 0.85, wobble: wob * 0.4, rng, fill: PAPER, segments: 1 });
    frame(g, [P(cu + s * hw * 0.22, feet - hgt * 0.052), P(cu + s * hw * 0.76, feet - hgt * 0.052), P(cu + s * hw * 0.84, feet), P(cu + s * hw * 0.16, feet)],
      { width: pen * 0.9, wobble: wob * 0.4, rng, fill: PAPER, segments: 1 });
    inkLine(g, X(cu + s * hw * 0.24), Y(feet - hgt * 0.024), X(cu + s * hw * 0.79), Y(feet - hgt * 0.024), { width: fine * 0.9, wobble: wob * 0.3, rng, segments: 1 });
  }

  // the short sleeves, and the bare arms hanging out of them past the hip
  for (const s of [-1, 1]) {
    frame(g, [P(cu + s * hw * 0.86, sh + hgt * 0.006), P(cu + s * hw * 1.16, sh + hgt * 0.05), P(cu + s * hw * 1.04, sh + hgt * 0.122), P(cu + s * hw * 0.8, sh + hgt * 0.078)],
      { width: fine * 1.3, wobble: wob * 0.4, rng, fill: PAPER, segments: 1 });
    frame(g, [P(cu + s * hw * 1.06, sh + hgt * 0.118), P(cu + s * hw * 0.88, sh + hgt * 0.09), P(cu + s * hw * 0.94, hem + hgt * 0.05), P(cu + s * hw * 1.13, hem + hgt * 0.058)],
      { width: pen * 0.8, wobble: wob * 0.4, rng, fill: PAPER, segments: 1 });
    // the hand: one closed shape, three quarters the width of the wrist, and no fingers at all
    loop(g, ring(X(cu + s * hw * 1.04), Y(hem + hgt * 0.088), X(hw * 0.1) - X(0), Y(hgt * 0.036) - Y(0), 10),
      { width: pen * 0.8, wobble: wob * 0.4, rng, fill: PAPER });
  }

  // the head, and the HAIR, which is the one mark that says he is facing away
  const head = ring(X(cu), Y(headV), X(headRu) - X(0), Y(headRv) - Y(0), 18);
  loop(g, head, { width: pen * 0.9, wobble: wob * 0.5, rng, fill: PAPER });
  if (tone)
    hatchIn(g, head, [X(cu - headRu * 1.3), Y(top) - 2, X(headRu * 2.6) - X(0), Y(headV + headRv * 1.2) - Y(top) + 2],
      { angle: Math.PI / 2 - 0.16, spacing: pen * 1.15, width: fine * 0.8, wobble: wob * 0.5, broken: 0.1, rng });
  // the nape, struck across the hair, and three ticks of it over the collar
  poly(g, [P(cu - headRu * 0.78, headV + headRv * 0.44), P(cu, headV + headRv * 0.86), P(cu + headRu * 0.78, headV + headRv * 0.44)], { width: pen * 0.85, wobble: wob * 0.4, rng });
  for (let i = 0; i < 3; i++)
    inkLine(g, X(cu - headRu * 0.5 + i * headRu * 0.5), Y(headV + headRv * 0.7), X(cu - headRu * 0.42 + i * headRu * 0.5), Y(headV + headRv * 1.04), { width: fine * 0.95, wobble: wob * 0.3, rng, segments: 1 });
  // and the ground he stands on: three ticks under the shoes, which is a shadow in this film
  for (let i = 0; i < 3; i++)
    inkLine(g, X(cu - hw * 0.9 + i * hw * 0.72), Y(feet + 0.003), X(cu - hw * 0.4 + i * hw * 0.72), Y(feet + 0.004), { width: fine * 0.8, wobble: wob * 0.4, rng, alpha: 0.65, segments: 1 });
}

// =================================================================================================
// 5. THE WEATHER ON THE PLATE, AND THE STRIKE THAT BLANKS IT.
//
// THE SKY IS ITS OWN SHEET and it stands BEHIND the landscape, which is why the landscape's sky is
// a hole. Take the left-hand road and the storm has to clear while the visitor is still looking out
// at the country; a bank of cloud drawn into the picture cannot lift off it. So the bank and the
// bolt are drawn in THREE drawings on one atlas — the bank whole, the bank broken into three
// masses, a last pair of wisps — and then the sheet is taken off and the sky is the paper the sun
// is already standing in. Three drawings over three seconds is a cloud lifting the way this film
// would draw one: cut, cut, cut, gone. Not a fade.
//
// The bank runs off the TOP of the sheet and its underside is SCALLOPED: a row of half-circles of
// different depths, because that is how a pen draws cloud and nothing else does. A single long wave
// comes out as a torn edge of paper with hatching behind it, which puts a second mountain in the
// sky. And nothing here is drawn under full alpha: the sheet is a cut-out, so a stroke at half
// strength is a stroke the alpha test throws away. Weight is spacing, not opacity.
// =================================================================================================
// ROUND 3 — `solid` and `skyV`, and both of them are the traced picture arriving. Behind the DRAWN
// landscape (whose sky is a hole) this bank has to be filled with paper or the alpha test eats its
// strokes on a phone; in FRONT of a TRACED one — which is opaque and has a sky of its own — that
// same fill would paint a paper slab over the best corner of the meme. `solid: false` leaves the
// bank as strokes on nothing: a storm laid OVER the picture rather than seen through it, and one
// that lifts off it in the same three drawings. `skyV` is how far down the sheet reaches, which is
// the traced original's own skyline when there is one (tools/trace-plate.mjs measures it).
export function drawSky({ w, h, ppm, penM, cols = 3, seed = 3307, solid = true, skyV = LAND.skyV }) {
  const TW = Math.round(w * ppm), TH = Math.round(h * ppm);
  const c = makeCanvas(TW * cols, TH);
  const g = c.getContext('2d');
  const pen = penM * ppm;
  const fine = pen * 0.62;
  const wob = pen * 0.34;
  const S = skyV; // the sheet covers the top S of the plate: a plate v is v/S of this canvas
  const X = (u) => u * TW, Y = (v) => (v / S) * TH;
  const P = (u, v) => [X(u), Y(v)];
  const stages = [
    { runs: [[0.4, 1.07]], depth: 1, spacing: 2.6, broken: 0.12, bolt: true },
    { runs: [[0.45, 0.66], [0.73, 0.9], [0.97, 1.09]], depth: 0.66, spacing: 3.7, broken: 0.3, bolt: false },
    { runs: [[0.55, 0.67], [0.83, 0.93]], depth: 0.36, spacing: 5.2, broken: 0.5, bolt: false },
  ];
  for (let col = 0; col < cols; col++) {
    const st = stages[Math.min(col, stages.length - 1)];
    const rng = mulberry32(seed + col * 613);
    g.save();
    g.translate(col * TW, 0);
    g.beginPath();
    g.rect(0, 0, TW, TH);
    g.clip();
    for (const [u0, u1] of st.runs) {
      const bumps = Math.max(2, Math.round((u1 - u0) / 0.075));
      const step = (u1 - u0) / bumps;
      const v0 = 0.24;
      const under = [];
      for (let b = 0; b < bumps; b++) {
        const cu = u0 + step * (b + 0.5);
        const r = step * 0.56;
        const dp = 0.062 * st.depth * (0.55 + 0.45 * Math.sin(b * 2.31 + 1.1));
        for (let i = 0; i <= 7; i++) {
          const a = Math.PI * (i / 7);
          under.push(P(cu - r * Math.cos(a), v0 + b * 0.004 + dp * Math.sin(a)));
        }
      }
      // it runs off the top of the sheet: two corners above the frame close it, so there is no
      // upper contour to read as the edge of an object
      const pts = [P(u0 - 0.03, -0.1), ...under, P(u1, -0.1)];
      // AND THE BANK IS FILLED WITH PAPER BEFORE IT IS HATCHED, which is a fact about the alpha
      // test rather than about the drawing. This sheet is a CUT-OUT — a pixel under half alpha is
      // a pixel the test throws away — and a minified mipmap turns a thin stroke into a row of
      // dots exactly there: on a 390-wide phone the whole bank came out as drizzle. Filled, the
      // only cut edge in the cloud is its own silhouette and every stroke inside it lands on solid
      // paper. (The paper is the same paper the sky behind it is, so nothing shows.)
      if (solid) {
        g.save();
        g.fillStyle = PAPER;
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
        g.closePath();
        g.fill();
        g.restore();
      }
      poly(g, under, { width: pen * 0.7, wobble: wob, rng });
      hatchIn(g, pts, [X(u0 - 0.04), Y(-0.12), X(u1 - u0 + 0.08) - X(0), Y(0.44) - Y(-0.12)], {
        angle: 1.2, spacing: pen * st.spacing, width: fine * 0.62, wobble: wob * 0.9, broken: st.broken, rng, alpha: 0.85,
      });
    }
    // THE LIGHTNING, out of the cloud and down behind the crag's right shoulder, struck with the
    // CARPENTER'S hand: a zig-zag smoothed through its midpoints is not a zig-zag, it is a ribbon.
    if (st.bolt) {
      frame(g, BOLT.map(([u, v]) => P(u, v)), { width: pen * 1.9, wobble: wob * 0.4, rng, close: false, segments: 1 });
      frame(g, [P(0.686, 0.366), P(0.73, 0.402)], { width: pen * 1.1, wobble: wob * 0.4, rng, close: false, segments: 1 });
    }
    g.restore();
  }
  return c;
}

// THE STRIKE. One drawing, and the country is blown to bare paper: everything that was tone is
// gone, everything that was contour stands, and a great fork of light comes down the middle of the
// sky. It is the same thing the window in the parlour already does with its four panes — the room's
// own flash is one drawing of white glass — and it is what the frame does when a strike lands while
// the visitor is standing outside looking at the picture.
//
// It is cut at a coarser scale than the landscape on purpose. The nib is passed in METRES, so the
// lines come out at the same width on the glass whatever the sheet's own resolution, and one
// drawing at 12 fps has nobody measuring its rasterisation.
export function drawStrike({ w, h, ppm, penM, seed = 6151 }) {
  const c = makeCanvas(Math.round(w * ppm), Math.round(h * ppm));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const rng = mulberry32(seed);
  const pen = penM * ppm;
  const fine = pen * 0.62;
  const wob = pen * 0.34;
  const X = (u) => u * W, Y = (v) => v * H;
  const P = (u, v) => [X(u), Y(v)];
  const L = (pts) => pts.map(([u, v]) => P(u, v));
  const HZ = LAND.hz;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);

  // the great bolt: three forks out of the top of the sheet, the middle one down onto the crag. It
  // is struck FIRST and the country is filled over it, so the far end of it goes behind the ridge —
  // lightning that stopped tidily on a skyline would be a decal.
  frame(g, [P(0.585, -0.06), P(0.64, 0.1), P(0.588, 0.14), P(0.66, 0.29), P(0.606, 0.32), P(0.672, 0.44)], { width: pen * 3.4, wobble: wob * 0.5, rng, close: false, segments: 1 });
  frame(g, [P(0.66, 0.29), P(0.762, 0.386)], { width: pen * 2.1, wobble: wob * 0.5, rng, close: false, segments: 1 });
  frame(g, [P(0.588, 0.14), P(0.496, 0.262), P(0.54, 0.3)], { width: pen * 1.8, wobble: wob * 0.5, rng, close: false, segments: 1 });

  // the country, in contour and nothing else — and BACK TO FRONT, each ridge filled and then
  // struck, so the horizon does not run through the hill and the roads do not run through both
  const fill = (pts) => {
    g.save();
    g.fillStyle = PAPER;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
    g.closePath();
    g.fill();
    g.restore();
  };
  const hill = hillLine(16);
  g.fillStyle = PAPER;
  g.fillRect(0, Y(HZ - 0.002), W, H - Y(HZ - 0.002) + 2);
  poly(g, [P(-0.03, HZ + 0.006), P(0.5, HZ - 0.001), P(1.03, HZ + 0.005)], { width: pen * 0.9, wobble: wob, rng });
  fill(L([...hill, [0.55, HZ + 0.02], [-0.05, HZ + 0.02]]));
  poly(g, L(hill), { width: pen * 0.95, wobble: wob, rng });
  fill(L([...CRAG, [1.05, HZ + 0.02], [0.49, HZ + 0.02]]));
  poly(g, L(CRAG), { width: pen * 0.95, wobble: wob, rng });
  {
    const foot = (u) => hillAt(u) + 0.003;
    const blk = (a, b, ht) => {
      const base = Math.min(foot(a), foot(b));
      frame(g, [P(a, foot(a)), P(a, base - ht), P(b, base - ht), P(b, foot(b))], { width: pen * 0.85, wobble: wob, rng, fill: PAPER });
      return base - ht;
    };
    const B = brightBlocks();
    blk(...B.hall);
    for (const t of [B.tower1, B.tower2]) {
      const top = blk(...t);
      frame(g, [P(t[0] - 0.008, top), P((t[0] + t[1]) / 2, top - 0.026), P(t[1] + 0.008, top)], { width: pen * 0.85, wobble: wob, rng, fill: PAPER });
    }
    const D = darkBlocks();
    for (const k of ['keep', 'tower', 'spire']) frame(g, L(D[k]), { width: pen * 0.9, wobble: wob, rng, fill: PAPER });
  }
  for (const k of ['nearL', 'nearR']) poly(g, L(ROADS[k]), { width: pen * 0.95, wobble: wob, rng });
  for (const k of ['leftOut', 'leftIn', 'rightIn', 'rightOut']) poly(g, L(ROADS[k]), { width: pen * 0.85, wobble: wob, rng });
  for (const k of ['noseL', 'noseR']) poly(g, L(ROADS[k]), { width: fine, wobble: wob * 0.8, rng });
  postInto(g, { X, Y, P, pen, wob, rng });
  childInto(g, { X, Y, P, W, H, pen, fine, wob, rng, tone: false });
  return c;
}
