// AN EGG, inside props: THE NAKAMOTO CARD, framed, on the back wall over his left shoulder.
//
// The user: "the framed image behind pepe should be a nakamoto card."
//
// WHAT IT IS. The Nakamoto Card is the first Rare Pepe — Series 1, Card 1, issued on Counterparty
// in 2016 and the reason every card after it is called rare. It is a trading card: a title band
// reading NAKAMOTO CARD, a portrait of a grey-haired frog in spectacles and a suit standing in
// front of falling code, a stats line (a heart at 15, Atk 3, Spd 1, Ele Fire), two lines of body
// text — the creator of Bitcoin, one of the most rare Pepes in existence — and, at its foot, a
// RARENESS SCORE of 97.
//
// IT IS REDRAWN, NOT REPRODUCED. The deck in public/cards is the user's and is never redrawn; this
// card is ours, so it is cut with the room's own pen: contours with a hand's wobble, tone from
// separated strokes, the lettering in the sign hand that letters the shop board and the placard
// (titles-sign.js), and no grey anywhere. One thing carries colour — the frog's face, in Pepe's own
// SKIN green, because a Pepe is green and because the card is a picture OF him in all but name.
// Everything else on the sheet is ink on paper, the falling code included: the code on the card is
// a drawing of code, and the only green code in this room is the code that runs when you touch it.
//
// WHERE IT HANGS. In the left frame of the row under the picture rail — the same nail, the same
// 0.4 x 0.46 m frame, the same hanging cords, so the wall's symmetry against the clock and the
// circuit diagram is untouched. The card is mounted PORTRAIT inside it at a trading card's own
// 5:7, in a black mount. (What used to hang there was the operator's photograph. It is off the
// wall now — see the note at the foot of this file.)
//
// AND THE MOUNT IS NOT CENTRED, WHICH IS A MEASUREMENT AND NOT A TASTE. The window's downstage
// shutter leaf folds flat onto this same wall and its outer edge stands at x = -0.50 (room.js says
// so in its own comment, and tools/_egg-nakamoto-proof.mjs raycasts the boundary and confirms it):
// the frame runs -0.66 to -0.26, so its left THIRD has been behind that leaf since the day the row
// was hung. The operator's photograph could live with it — a photograph half behind a shutter is
// still a photograph. A card cannot: a title band whose first three letters are behind a louvre is
// not a title. So the card is mounted to the RIGHT of its mount, sized to the aperture the shutter
// actually leaves (0.208 m of the sheet's 0.356), and every millimetre of it is in the picture.
// What is hidden is black mount, which is what a mount is for. The title is set on two lines for
// the same reason: NAKAMOTO across the width the shutter leaves reads at the plate; NAKAMOTO CARD
// across it does not.
//
// WHAT IT DOES. Click the glass and the code comes down it: six columns of drawn glyphs in Pepe's
// green, falling a whole cell per 12 fps drawing for three seconds, each column at its own speed
// and its own phase, with its own head struck heavier than its tail. Nothing fades and nothing tweens — a
// glyph is in one cell and then it is in the next, which is the only kind of movement this film
// has. When the code has run out the bottom of the frame the card's RARENESS SCORE ticks up by
// one, on the card itself, in the same hand it was lettered in, and the new number is kept in
// localStorage: the score a visitor leaves is the score the next visit opens on. It starts at 97.
//
// THE JOKE, WHICH IS NOT EXPLAINED ANYWHERE. Rareness is supposed to be a property of the object.
// This one goes up every time somebody looks at it.
//
// NOTHING ANNOUNCES IT. No label, no glow, no tag. The cursor becomes a pointer over the frame and
// that is the whole affordance, exactly as it is for the cat, the radio and the mains lever. A
// visitor who never touches it sees a card on a wall with a number on it, which is what it is.
import * as THREE from 'three';
import { INK, PAPER, makeCanvas, canvasTexture, inkMaterial } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signFit } from './titles-sign.js';
import * as O from './props-objects.js';
import { SKIN } from './pepe.js';
import { colorFilter } from './cards-mips.js';

// ---- the numbers ---------------------------------------------------------------------------------
const START = 97; // the score printed on the real card
const STORE = 'tarot-pepe.nakamoto.score';
const RAIN_STEPS = 36; // three seconds on the 12 fps clock
const FROZEN = 18; // the drawing the `nakamoto-rain` judging state holds: the code mid-fall
const MIN_TAP = 44; // px: what a thumb needs, whatever the frame measures on the glass

// The sheet the card is drawn on. The art inside the frame is 0.356 x 0.416 m and measures 64 px
// across at the home plate, 98 at `pepe` and 110 at `pepe` on a 1600 px window — so 288 px of
// texture is between 2.6 and 4.5 texels to the pixel, which is where cards-mips.js's chain was
// written to live. Bigger buys nothing the frame can show and costs the build a canvas a level.
const TEX_W = 288, TEX_H = 336;
const RAIN_W = 120, RAIN_H = 168; // the glass over the card: the card's own 5:7, and no lettering

// The card's own field, in card units: 100 wide by 140 tall, which is 5:7, which is a trading card.
const CARD = { w: 100, h: 140 };
// room.js's own number for the downstage shutter leaf's outer edge, quoted and never written to.
// Everything left of this, on this wall, is behind a louvred panel.
const SHUTTER_X = -0.5;
// How far clear of that edge the card's own left border stands. Ten millimetres, and the number is
// measured, not chosen: the leaf stands 13 mm PROUD of this sheet, so at the home plate its shadow
// line falls a few millimetres to the right of its own x — tools/_egg-nakamoto-proof.mjs raycasts
// it at -0.4921 against the leaf's -0.50. Five millimetres put the card's border rule inside that
// parallax; ten clears it at every plate the film is judged at and costs the card 2% of its width.
const CLEAR = 0.01;
const INSET = 0.006; // the mount left standing between the card and the frame's rebate

// ---- the pen -------------------------------------------------------------------------------------
// A polyline with a hand's wander on it. Local, because everything this file draws is drawn at the
// size of a postage stamp and wants a shorter step than props-textures' own stroke().
function pen(g, pts, { width = 2, wobble = 0.7, rng = Math.random, color = INK, alpha = 1, close = false } = {}) {
  if (pts.length < 2) return;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = width * (0.88 + rng() * 0.24);
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const w = i === 0 || i === pts.length - 1 ? wobble * 0.4 : wobble;
    const px = x + (rng() - 0.5) * w, py = y + (rng() - 0.5) * w;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  });
  if (close) g.closePath();
  g.stroke();
  g.restore();
}
const line = (g, x0, y0, x1, y1, o) => pen(g, [[x0, y0], [x1, y1]], o);
function rect(g, x, y, w, h, o) {
  pen(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { ...o, close: true });
}
function fill(g, pts, color = INK, { rng = Math.random, wobble = 0.6 } = {}) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const px = x + (rng() - 0.5) * wobble, py = y + (rng() - 0.5) * wobble;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  });
  g.closePath();
  g.fill();
  g.restore();
}
function blob(g, cx, cy, rx, ry, color = INK, { rng = Math.random, n = 18, wob = 0.06 } = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rng() - 0.5) * wob * 2;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  fill(g, pts, color, { rng, wobble: 0 });
  return pts;
}

// ---- the card, drawn ------------------------------------------------------------------------------
// Every number below is in card units (100 x 140) and every band is ruled, because a trading card
// is a stack of ruled bands and that is the first thing the eye reads at 60 px.
const BANDS = {
  title: [5.5, 26],
  art: [28, 92],
  stats: [94, 103],
  text: [105, 116],
  score: [118, 136.5],
};
// where the frog was drawn, before the title band took two lines. The panel below is shorter than
// this, so he is scaled into it whole rather than re-tuned mark by mark.
const FROG_PANEL = [22, 96];

// the drawing of code BEHIND the frog: ink, fine, and not legible as anything. It is the card's
// backdrop, and it is what tells the eye that the green code, when it comes, is the same code.
function drawnCode(g, rng, x0, y0, x1, y1) {
  const cols = 13, cw = (x1 - x0) / cols;
  for (let c = 0; c < cols; c++) {
    const cx = x0 + (c + 0.5) * cw;
    let y = y0 + rng() * 8;
    while (y < y1 - 3) {
      const n = 2 + Math.floor(rng() * 4);
      for (let i = 0; i < n && y < y1 - 3; i++) {
        const w = cw * (0.3 + rng() * 0.34);
        line(g, cx - w, y, cx + w, y, { width: 1.05, wobble: 0.5, rng, alpha: 0.5 });
        y += 3.4;
      }
      y += 3 + rng() * 7;
    }
  }
}

// the frog: shoulders in solid ink, a paper shirt, a green face, spectacles, and the hair that
// makes him the old man of the story. At 80 px each of these has to be one mass saying one thing.
function drawnFrog(g, rng) {
  const o = { width: 1.9, wobble: 0.7, rng };
  // the suit — one black mass, and the card's biggest solid area
  fill(g, [[20, 96], [26, 82], [38, 76], [50, 80], [62, 76], [74, 82], [80, 96]], INK, { rng, wobble: 0.7 });
  // …with the shirt cut out of it in paper, and a black tie down the middle: a black mass needs
  // one bright mark in it or it is a blot
  fill(g, [[42, 76], [50, 84], [58, 76], [55, 74], [45, 74]], PAPER, { rng, wobble: 0.4 });
  fill(g, [[47.5, 79], [52.5, 79], [53.5, 93], [46.5, 93]], INK, { rng, wobble: 0.4 });
  line(g, 42, 76, 47, 82, { ...o, width: 1.3 });
  line(g, 58, 76, 53, 82, { ...o, width: 1.3 });

  // the head, in his own green, contoured with the room's pen
  const head = blob(g, 50, 55, 22.5, 20.5, SKIN, { rng, n: 26, wob: 0.035 });
  pen(g, head, { ...o, width: 2.1, close: true });
  // the jaw line and the neck, so the head sits ON the collar instead of floating over it
  pen(g, [[38, 72], [44, 76], [56, 76], [62, 72]], { ...o, width: 1.5 });

  // the eyes: two paper domes riding high on the skull, the way a frog's do, each with a pupil
  for (const sx of [-1, 1]) {
    const cx = 50 + sx * 11.5;
    const e = blob(g, cx, 44.5, 9.4, 8.8, PAPER, { rng, n: 20, wob: 0.04 });
    pen(g, e, { ...o, width: 1.9, close: true });
    blob(g, cx + sx * 1.4, 45.5, 3.1, 3.3, INK, { rng, n: 12, wob: 0.12 });
  }
  // the spectacles, over the eyes, wired: two rings, a bridge, one temple running back into the hair
  for (const sx of [-1, 1]) {
    const cx = 50 + sx * 11.5;
    const ring = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      ring.push([cx + Math.cos(a) * 11.6, 45 + Math.sin(a) * 10.8]);
    }
    pen(g, ring, { ...o, width: 1.7, close: true });
    pen(g, [[cx + sx * 11.4, 43], [cx + sx * 17, 41.5], [cx + sx * 20, 44]], { ...o, width: 1.4 });
  }
  line(g, 42.6, 44.5, 57.4, 44.5, { ...o, width: 1.5 });

  // THE MOUTH: Pepe's, and it is the one line on this card that everybody already knows. Drawn
  // heavier than anything else on the face, because at 45 px the face is two rings and this line,
  // and if it goes the card is a green oval in spectacles.
  pen(g, [[32, 62.5], [40, 67.5], [50, 68.8], [60, 67.5], [68, 62.5]], { ...o, width: 3 });
  line(g, 32, 62.5, 33.8, 59.5, { ...o, width: 2 });
  line(g, 68, 62.5, 66.2, 59.5, { ...o, width: 2 });
  // the nostrils, two ticks, because without them the middle of the face is empty paper
  line(g, 47, 56, 47.6, 57.8, { ...o, width: 1.6 });
  line(g, 53, 56, 52.4, 57.8, { ...o, width: 1.6 });

  // THE GREY HAIR, in a room that has no grey. It is drawn as SEPARATED STROKES — paper showing
  // between them — where a black head of hair would be a filled mass. That is the whole of the
  // difference, and it is the film's own answer: value comes from how many marks there are, never
  // from how hard they are pressed. Two TUFTS at the temples do the work at a distance (an old
  // man is a silhouette before he is a texture) and the crown carries the rest.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const y = 38 + i * 2.9 + (rng() - 0.5) * 1.4;
      const x = 50 + sx * (20 + rng() * 1.2);
      line(g, x, y, x + sx * (6 + rng() * 6), y - 2 - rng() * 4, { width: 2, wobble: 0.9, rng });
    }
  }
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const a = Math.PI * (1.1 + t * 0.8);
    const x = 50 + Math.cos(a) * 21, y = 55 + Math.sin(a) * 19.5;
    const l = 5 + rng() * 5;
    line(g, x, y, x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l, { width: 1.9, wobble: 0.9, rng });
  }
}

// the heart in the stats line. The sign hand has never cut one, so it is drawn.
function heart(g, cx, cy, r, rng) {
  const p = [];
  for (let i = 0; i <= 26; i++) {
    const t = (i / 26) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    p.push([cx + (x / 16) * r, cy + (y / 13) * r]);
  }
  fill(g, p, INK, { rng, wobble: 0.2 });
}

// The whole sheet: the black mat, the card mounted portrait in it, and everything on the card.
// `score` is the only thing that ever changes, and the drawing is otherwise seeded so that a
// re-strike after a click is the SAME card with a different number on it.
function drawCard(g, W, H, score, mount) {
  const rng = mulberry32(9713);
  // the mount: solid ink, the way every other picture on this wall is mounted
  g.fillStyle = INK;
  g.fillRect(0, 0, W, H);
  const { cx, cy, cw, ch } = mount;
  const ox = cx - cw / 2, oy = cy - ch / 2;
  const s = ch / CARD.h; // card units → texels
  g.save();
  g.translate(ox, oy);
  g.scale(s, s);
  // the card stock
  g.fillStyle = PAPER;
  g.fillRect(-1, -1, CARD.w + 2, CARD.h + 2);
  const o = { width: 1.9, wobble: 0.8, rng };
  // the border: a card's double rule
  rect(g, 2.2, 2.2, CARD.w - 4.4, CARD.h - 4.4, { ...o, width: 2.4 });
  rect(g, 4.4, 4.4, CARD.w - 8.8, CARD.h - 8.8, { ...o, width: 1.1 });

  // ---- the title band ---------------------------------------------------------------------------
  // NAKAMOTO on its own line and CARD under it. One line would be thirteen sorts across a card the
  // shutter has left 57 px of, which is a row of ticks; eight sorts across the same measure is a
  // word. The real card's band is one line and this is the one place the drawing gives that up.
  const [t0, t1] = BANDS.title;
  line(g, 6, t1, CARD.w - 6, t1, { ...o, width: 1.6 });
  {
    const capH = signFit('NAKAMOTO', CARD.w - 14, { capH: 11.5, tracking: 0.09, pen: 2.1 });
    signCaps(g, 'NAKAMOTO', CARD.w / 2, t0 + 7.7, { capH, tracking: 0.09, pen: 2.1, rng, seed: 41 });
    // CARD is tracked wide on purpose: at this size a tightly set four-letter word closes into one
    // smudge, and four separate ticks in a row still read as a word under a word
    signCaps(g, 'CARD', CARD.w / 2, t0 + 16.8, { capH: 6, tracking: 0.36, pen: 1.6, rng, seed: 43 });
  }

  // ---- the art panel: the code, then the frog on it ---------------------------------------------
  const [a0, a1] = BANDS.art;
  g.save();
  g.beginPath();
  g.rect(6, a0, CARD.w - 12, a1 - a0);
  g.clip();
  drawnCode(g, rng, 6, a0, CARD.w - 6, a1);
  // he was cut for a taller panel; he is scaled into this one whole, about its centre, so nothing
  // in the drawing is squashed and the panel keeps its own margins
  const k = (a1 - a0) / (FROG_PANEL[1] - FROG_PANEL[0]);
  g.save();
  g.translate(CARD.w / 2, (a0 + a1) / 2);
  g.scale(k, k);
  g.translate(-CARD.w / 2, -(FROG_PANEL[0] + FROG_PANEL[1]) / 2);
  drawnFrog(g, rng);
  g.restore();
  g.restore();
  rect(g, 6, a0, CARD.w - 12, a1 - a0, { ...o, width: 1.7 });

  // ---- the stats band ---------------------------------------------------------------------------
  const [s0, s1] = BANDS.stats;
  const sy = (s0 + s1) / 2;
  rect(g, 6, s0, CARD.w - 12, s1 - s0, { ...o, width: 1.2 });
  {
    const cap = 5.2, o2 = { capH: cap, tracking: 0.12, pen: 1.5, rng, seed: 55, align: 'left' };
    heart(g, 11.5, sy, 3.4, rng);
    let x = 15;
    x += signCaps(g, '15', x, sy, o2) + 4;
    for (const t of ['ATK 3', 'SPD 1', 'ELE FIRE']) {
      line(g, x - 2, s0 + 2, x - 2, s1 - 2, { width: 0.9, wobble: 0.5, rng });
      x += signCaps(g, t, x, sy, o2) + 4;
    }
  }

  // ---- the body text ----------------------------------------------------------------------------
  // Two lines, and they are meant to be READ at three inches and SUGGESTED at three feet — which is
  // what the film does with small signage: a row of black ticks in a white plaque, in order, at
  // full pressure. Nothing here is set at half weight to make it fit.
  {
    const [x0, x1] = [8, CARD.w - 8];
    const lines = ['THE CREATOR OF BITCOIN. ONE OF', 'THE MOST RARE PEPES IN EXISTENCE.'];
    let y = BANDS.text[0] + 2.8;
    for (const t of lines) {
      const capH = signFit(t, x1 - x0, { capH: 4.2, tracking: 0.08, pen: 1.3 });
      signCaps(g, t, CARD.w / 2, y, { capH, tracking: 0.08, pen: 1.3, rng, seed: 63 });
      y += 6.2;
    }
  }

  // ---- the rareness score, which is the thing that moves ----------------------------------------
  // The label is small and the NUMBER is large, because the number is the only mark on this card
  // that ever changes and a change nobody can see is not one. Set on one line, at the size the rest
  // of the card is set at, 97 arrives as two ticks and 98 arrives as the same two ticks.
  const [r0, r1] = BANDS.score;
  line(g, 6, r0 - 1.5, CARD.w - 6, r0 - 1.5, { ...o, width: 1.2 });
  {
    signCaps(g, 'RARENESS SCORE', CARD.w / 2, r0 + 3.4, { capH: 4.2, tracking: 0.26, pen: 1.3, rng, seed: 77 });
    const n = String(score);
    const capH = signFit(n, CARD.w - 30, { capH: 11.5, tracking: 0.12, pen: 3 });
    signCaps(g, n, CARD.w / 2, r0 + 11.8, { capH, tracking: 0.12, pen: 3, rng, seed: 79 + score });
  }
  g.restore();
}

// ---- the code on the glass -------------------------------------------------------------------------
// Eight columns, each with its own speed, its own length and its own head. A column advances a
// WHOLE CELL on a step and is redrawn from nothing every time, so the glyphs boil exactly as the
// rest of the room's lines do, and there is no interpolation anywhere in it.
const GLYPHS = [
  [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
  [[[0, 0], [1, 1]], [[1, 0], [0, 1]]],
  [[[0, 0], [1, 0], [1, 1]], [[0, 0.55], [0.7, 0.55]]],
  [[[0.5, 0], [0.5, 1]], [[0, 0.3], [1, 0.3]]],
  [[[0, 0], [0, 1], [1, 1]]],
  [[[0, 0.5], [1, 0.5]], [[0.3, 0], [0.3, 1]], [[0.75, 0.2], [0.75, 0.9]]],
  [[[0, 0], [1, 0]], [[0, 1], [1, 1]], [[0.5, 0.15], [0.5, 0.85]]],
  [[[1, 0], [0, 0.5], [1, 1]]],
  [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  [[[0.5, 0], [0.5, 1]]],
];

const RAIN_COLS = 6; // six columns on a card 57 px wide: fewer and bigger marks, so each one reads
const RAIN_ROWS = 9;

function makeColumns(rng, cols) {
  const out = [];
  for (let i = 0; i < cols; i++) {
    const len = 3 + Math.floor(rng() * 4);
    const gap = 2 + Math.floor(rng() * 4); // bare glass behind a run before the next comes through
    out.push({
      speed: rng() < 0.42 ? 2 : 1, // cells a drawing: two speeds, so it is rain and not a curtain
      // EVERY COLUMN AT ITS OWN PHASE, anywhere in its own cycle. The first version started all six
      // above the top edge so the code would arrive falling — and because five of them then moved
      // at the same speed from nearly the same place, what fell was a CURTAIN: one band of glyphs
      // crossing the card, with an empty glass in front of it and an empty glass behind. Phased
      // across the cycle, the card carries about thirteen marks at every one of the thirty-six
      // drawings, at different heights, which is rain.
      start: -Math.floor(rng() * (RAIN_ROWS + len + gap)),
      len,
      gap,
      seed: 1000 + i * 37,
    });
  }
  return out;
}

function drawRain(g, W, H, step, cols) {
  g.clearRect(0, 0, W, H);
  const cw = W / cols.length;
  const cell = H / RAIN_ROWS;
  const gw = cw * 0.62, gh = cell * 0.6;
  for (let c = 0; c < cols.length; c++) {
    const col = cols[c];
    const rng = mulberry32(col.seed + step * 131);
    // …and a column that has run off the bottom comes round again. Three seconds is thirty-six
    // drawings and a fast column crosses the card in five, so without this the code falls once and
    // the glass is empty for two and a half of those seconds.
    const cycle = RAIN_ROWS + col.len + col.gap;
    let head = col.start + step * col.speed;
    while (head - col.len > RAIN_ROWS) head -= cycle; // …and it comes round again from the top
    const cx = (c + 0.5) * cw;
    for (let k = 0; k < col.len; k++) {
      const y = (head - k + 0.5) * cell;
      if (y < -cell || y > H + cell) continue;
      const G = GLYPHS[Math.floor(rng() * GLYPHS.length)];
      // the head of a column is struck twice and the tail once: in a world with no grey a mark is
      // brighter because there is more of it, never because it is paler
      const w = k === 0 ? 4.6 : 3.2;
      for (const strokePts of G) {
        const pts = strokePts.map(([u, v]) => [cx - gw / 2 + u * gw, y - gh / 2 + v * gh]);
        pen(g, pts, { width: w, wobble: 0.9, rng, color: SKIN });
        if (k === 0) pen(g, pts, { width: w * 0.6, wobble: 1.2, rng, color: SKIN });
      }
    }
  }
}

// ---- the build --------------------------------------------------------------------------------------
export function eggNakamoto(ctx, { group, switches, slot }) {
  const M = O.materials();
  const { x, y, w, h, z, hookY } = slot;
  const rim = 0.022, depth = 0.028;

  // THE FRAME. The same frame props.js hangs everything else on this wall in — same rim, same
  // depth, same ornate corner blocks — built here rather than borrowed from O.pictureFrame only
  // because the sheet inside it is ours and O.pictureFrame would draw a picture first and throw it
  // away. If that function's numbers ever change, these are the numbers to change with them.
  const g = new THREE.Group();
  g.name = 'nakamoto-frame';
  g.position.set(x, y, z);
  const fm = M.frame;
  const top = O.box(w, rim, depth, fm);
  top.position.set(0, h / 2 - rim / 2, 0);
  const bot = O.box(w, rim, depth, fm);
  bot.position.set(0, -h / 2 + rim / 2, 0);
  const left = O.box(rim, h - rim * 2, depth, fm);
  left.position.set(-w / 2 + rim / 2, 0, 0);
  const right = O.box(rim, h - rim * 2, depth, fm);
  right.position.set(w / 2 - rim / 2, 0, 0);
  g.add(top, bot, left, right);
  for (const [cx, cy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const c = O.box(rim * 1.7, rim * 1.7, depth * 1.2, fm);
    c.position.set(cx * (w / 2 - rim / 2), cy * (h / 2 - rim / 2), 0);
    g.add(c);
  }

  // THE SHEET. `colorful` is what makes the green survive: the ink pass shows a colorful surface
  // verbatim and re-states its ACHROMATIC marks at the room's own nib, so the card's pen lines are
  // drawn by the room while the face stays the flat green it was painted (ink-shaders.js, the
  // colorful branch). hatch 0.12 and the frame's own lineWeight are the numbers the picture that
  // used to hang here was mounted with — a print under glass takes almost no tone.
  const canvas = makeCanvas(TEX_W, TEX_H);
  const g2d = canvas.getContext('2d', { willReadFrequently: true });
  const tex = canvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const artW = w - rim * 2, artH = h - rim * 2;

  // WHERE THE CARD SITS IN ITS MOUNT, worked in metres on the wall and then handed to the drawing
  // in texels. The right-hand edge is a hair inside the frame's rebate; the left-hand edge is
  // whichever is further right of the rebate and the shutter leaf's outer edge — which, at this
  // nail, is always the shutter. What that leaves is 0.208 m of a 0.356 m sheet, and the card is
  // 5:7 of it. If this frame is ever moved out from behind the leaf the arithmetic simply gives
  // the card the whole aperture back and nothing here has to change.
  const MOUNT = (() => {
    const x0Sheet = x - artW / 2, x1Sheet = x + artW / 2;
    const right = x1Sheet - INSET;
    const left = Math.max(x0Sheet + INSET, SHUTTER_X + CLEAR);
    let cwM = Math.max(0.02, right - left);
    let chM = cwM * (CARD.h / CARD.w);
    if (chM > artH - INSET * 2) {
      chM = artH - INSET * 2;
      cwM = chM * (CARD.w / CARD.h);
    }
    const centre = (left + right) / 2;
    return {
      cx: ((centre - x0Sheet) / artW) * TEX_W,
      cy: TEX_H / 2,
      cw: (cwM / artW) * TEX_W,
      ch: (chM / artH) * TEX_H,
      metres: { w: +cwM.toFixed(4), h: +chM.toFixed(4), left: +left.toFixed(4), right: +right.toFixed(4) },
    };
  })();
  const art = O.plane(artW, artH, inkMaterial({ map: tex, hatch: 0.12, colorful: true }));
  art.position.z = depth / 2 - 0.008;
  g.add(art);

  // THE GLASS, which is a second sheet a millimetre in front of the card and empty until it is
  // touched. alphaTest and no mip chain: the code is six columns of chunky marks on a plane that is
  // never minified past three to one, and an averaging filter on a cut-out would eat the glyphs at
  // their edges before it did anything useful.
  const rainCanvas = makeCanvas(RAIN_W, RAIN_H);
  const rain2d = rainCanvas.getContext('2d');
  const rainTex = new THREE.CanvasTexture(rainCanvas);
  rainTex.colorSpace = THREE.SRGBColorSpace;
  rainTex.generateMipmaps = false;
  rainTex.minFilter = THREE.LinearFilter;
  rainTex.magFilter = THREE.LinearFilter;
  rainTex.wrapS = rainTex.wrapT = THREE.ClampToEdgeWrapping;
  rainTex.anisotropy = Math.max(1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
  const rainMat = inkMaterial({ color: '#ffffff', map: rainTex, hatch: 0, lineWeight: 0, colorful: true });
  rainMat.alphaTest = 0.5;
  rainMat.transparent = false;
  // …and it is the size of THE CARD, not of the whole aperture. Two reasons, and the second one is
  // a measurement. The code belongs to the card — it is the card's own falling code coming off the
  // plate and onto the glass — so a column of it landing on bare mount is a column landing on
  // nothing. And the mount's left third is behind the shutter leaf, where a cut-out plane a
  // centimetre off the wall is close enough to the louvres for the pen to put its green on the
  // wrong side of them. Inside the card there is no leaf and no argument.
  const glass = O.plane(MOUNT.metres.w, MOUNT.metres.h, rainMat);
  glass.position.set((MOUNT.metres.left + MOUNT.metres.right) / 2 - x, 0, depth / 2 - 0.006);
  glass.visible = false;
  g.add(glass);

  group.add(g);
  O.hangCords(group, x, y + h / 2, w / 2 - 0.02, hookY, z - 0.003);

  // ---- the score, and the fact that the room remembers it ----------------------------------------
  // localStorage is the only place in this build that outlives a visit, and it is guarded twice:
  // a browser with storage switched off, or a value somebody has edited by hand, both fall back to
  // the number that is actually printed on the card.
  const read = () => {
    try {
      const v = parseInt(window.localStorage?.getItem(STORE) ?? '', 10);
      return Number.isFinite(v) && v >= START && v <= 9999 ? v : START;
    } catch {
      return START;
    }
  };
  const write = (v) => {
    try {
      window.localStorage?.setItem(STORE, String(v));
    } catch {
      /* a browser that will not keep it is a browser that opens on 97 every time, which is fine */
    }
  };

  let score = read();
  function paint() {
    drawCard(g2d, TEX_W, TEX_H, score, MOUNT);
    tex.needsUpdate = true;
    // …and the chain is rebuilt with it. cards-mips.js's colour filter carries PIGMENT and COVERAGE
    // apart, which is what keeps a colorful sheet's pen from averaging into a mid grey as the frame
    // minifies it — the same reason Pepe has a chain of his own. It costs a canvas a level, once
    // here and once on a click, and nothing per frame.
    colorFilter(tex, ctx.renderer);
  }
  paint();

  // ---- the rain -----------------------------------------------------------------------------------
  // THE RUN IS COUNTED IN THE ROOM'S OWN FRAMES, not in how many drawings this machine managed.
  // `frame0` is the 12 fps frame the glass was touched on and the cell a column stands in is
  // `clock.frame - frame0`, so three seconds is three seconds on a laptop at sixty and on a
  // software renderer at four — the code simply skips cells when frames are dropped, which is
  // exactly what a film projected at twelve does. The radio's needle and the fuse's lever are
  // timed the same way, off the same clock.
  const cols = makeColumns(mulberry32(20160901), RAIN_COLS);
  let running = false, frame0 = 0, shown = -1;
  function showRain(k) {
    if (k === shown) return;
    shown = k;
    drawRain(rain2d, RAIN_W, RAIN_H, k, cols);
    rainTex.needsUpdate = true;
    glass.visible = true;
  }
  function stopRain() {
    glass.visible = false;
    running = false;
    shown = -1;
  }

  function click() {
    if (running) return; // it is already running; a second click is not a second run
    running = true;
    frame0 = ctx.clock.frame;
    showRain(0);
    // the blip goes on the POINTER and not on the arrival: the visitor's hand is on the glass now
    ctx.pieces.sound?.play?.('blip');
  }

  // ---- the box on the glass ------------------------------------------------------------------------
  function hitBox() {
    g.updateMatrixWorld(true);
    // …and the CAMERA's, which is not a formality. camera.cut() poses the camera and leaves the
    // render loop to fold that into matrixWorldInverse on the next frame; a tool that cuts and
    // asks for the box in the same breath — and the headless browser throttles its frames hard —
    // is otherwise told where this frame was in the shot BEFORE the cut. One matrix invert.
    ctx.camera.updateMatrixWorld();
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const dx of [-w / 2, w / 2]) for (const dy of [-h / 2, h / 2]) for (const dz of [-depth / 2, depth / 2]) {
      v.set(dx, dy, dz);
      g.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to a thumb's 44 px if it ever needs it. Measured, it never does: the
  // frame is 72 px across at the home plate and 79 on a 390 px phone, where — unlike the radio —
  // the whole of it is inside the picture. The margin is kept for a window nobody has tried yet.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const bw = Math.max(b.w, MIN_TAP), bh = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - bw / 2, y: b.y + b.h / 2 - bh / 2, w: bw, h: bh, grown: bw > b.w || bh > b.h };
  }

  switches?.add?.({
    name: 'nakamoto',
    object: () => g,
    tapBox,
    enabled: () => !running, // while the code is falling there is nothing to press
    onDown: () => click(),
  });

  return {
    get score() {
      return score;
    },
    get raining() {
      return running;
    },
    // what the shutter left the card, in metres, for the tools
    mount: MOUNT.metres,
    click,
    hitBox,
    tapBox,
    // for the tools and for setState: put a number on the card with no rain and no cue, and keep it
    set(v) {
      // never below the number the card was printed with: a rareness score does not go down
      score = Math.max(START, Math.min(9999, Math.round(v)));
      write(score);
      paint();
    },
    // `nakamoto-rain` holds the drawing halfway down: the code mid-fall, deterministic, on the
    // score the card is actually printed with. Every other name is the card at rest, on whatever
    // number this browser has been left on — which is what "remembered between visits" means.
    setState(name = 'default') {
      if (name === 'nakamoto-rain') {
        if (score !== START) {
          score = START;
          paint();
        }
        running = false; // held, not running: the tools get a still and the clock is not touched
        showRain(FROZEN);
        return;
      }
      stopRain();
      const kept = read();
      if (kept !== score) {
        score = kept;
        paint();
      }
    },
    update(ctx2) {
      if (!ctx2.clock.stepped || !running) return;
      const k = ctx2.clock.frame - frame0;
      if (k <= RAIN_STEPS) {
        showRain(k);
        return;
      }
      // the code has run out of the bottom of the frame; the card counts itself one rarer
      stopRain();
      score = Math.min(9999, score + 1);
      write(score);
      paint();
      ctx.emit?.('props:nakamoto', { score });
    },
  };
}

// WHAT CAME OFF THE WALL, and the one thing left for the user to settle. The left frame held the
// operator's photograph — the woman who worked this board for thirty years, whose story is in
// mind-room.js under `photograph` and is the reason the room is the room. The user asked for the
// framed image behind him to be the Nakamoto card and this is that frame, so she is down. Her
// story is still in his mouth: ask him about the photograph and he tells it, about a picture that
// is no longer on the nail. Either she is re-hung somewhere (the stage-left wall has the room for
// her) or that story comes out; both are the user's call, not a builder's.
