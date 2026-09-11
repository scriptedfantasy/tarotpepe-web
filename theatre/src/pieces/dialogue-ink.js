// dialogue-ink.js — the pen for everything the dialogue draws:
//
//   drawPlacard  the card every line arrives on — a hand-cut sheet with a deckled edge, four
//                strokes that cross at every corner, and the ink rules across it
//   drawName     a name LETTERED in the sign hand (titles-sign.js) rather than set in a font
//   drawCaret    the visitor's caret: an upright pen stroke standing on the baseline
//   drawDots     the thinking mark: three dots struck one at a time while he writes
//   drawArrow    the mark at the card's corner: there is more of this sentence, and it waits for you
//
// ROUND 7 took the speaker's dashes out. Round 6 opened each register with one — his laid in his
// green and contoured in ink, the visitor's a single stroke — because green TYPE at #69b964 could
// not be read. The user's answer was to make the type readable rather than to mark it: "just make
// pepes font green - and users font black, lines not needed". So the colour moved into the words
// (a darker shade of his own green; see PEPE_GREEN in dialogue.js) and drawDash is gone.
//
// The caret is drawn twice — once wide in paper, so the hatching behind it is knocked out the way
// an inker leaves a gap around a drawn object, and once in ink at the pen's own weight. Nothing
// here is a box, a band or a background. Everything is a stroke.
import { INK, PAPER } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signGlyphs, signFold, signFit, SIGN_ASCENT, SIGN_DESCENT, SIGN_HAS } from './titles-sign.js';

export const SVGNS = 'http://www.w3.org/2000/svg';

// The resolution the card's lettering is cut at: the display's own, doubled, so the pen keeps its
// edge when the browser scales the canvas — the same rule drawName has always used.
export const inkDpr = () => Math.min(3, Math.max(2, (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1) * 2));

// ---------------------------------------------------------------------------------------------
// ROUND 12 — EVERY WORD ON THE CARD IS LETTERED.
//
// The user, having read the notice on the wall: "i love this font - can you we use this in the chat
// box as well?" So the typewriter face is off the placard altogether and the whole card is cut in
// the sign hand, exactly as help-bill.js cuts the notice: wrapped to the measure with signWidth,
// struck with the contour pen, re-cut on every second frame of the 12 fps clock so the words boil
// with the drawing they are standing on.
//
// One canvas per register (his, the visitor's, and each row of an intertitle). A canvas is re-cut
// only when something about it changed — the text, the measure, the cap, the colour, how much of it
// has been typed, or the boil tick — so a held line costs one strike every second frame and a
// blitted canvas the rest of the time.
//
// `lines` are ALREADY WRAPPED: [{ text, start }], where `start` is the character offset of the
// line's first sort inside the block's own string. That offset is what lets a caption type itself
// out: `shown` characters of the block are inked and the rest are not there yet, while the line is
// measured and centred WHOLE, so the rag never moves and no word ever shifts under another.
//
// `bleed` is drawn room above and below the line grid — accents and commas reach past the cap band,
// and the pen runs past the end of a stroke — and the caller takes it back with a negative margin,
// so the block occupies exactly `lines.length × lead` of the card.
export function drawBlock(canvas, lines, opts = {}) {
  const {
    width,
    capH,
    lead,
    tracking = 0.14,
    pen = null,
    color = INK,
    boil = 0,
    seed = 3,
    shown = Infinity,
    bleed = 0,
    alpha = 1,
    // px kept clear at the RIGHT of the LAST row and of no other: the corner the take's arrow
    // stands in (dialogue.js, THE MARK'S OWN CORNER). That row is centred in what is left, so the
    // words walk away from the mark instead of being lettered through it. The caller has already
    // wrapped the row to the same reduced measure, so nothing here re-measures anything.
    inset = 0,
  } = opts;
  const rows = lines.length ? lines : [{ text: '', start: 0 }];
  const h = Math.max(1, Math.round(rows.length * lead + 2 * bleed));
  const w = Math.max(1, Math.round(width));
  const key = `${rows.map((l) => l.text).join('')}|${w}|${h}|${capH.toFixed(2)}|${lead.toFixed(2)}|${color}|${alpha}|${shown}|${boil}|${seed}|${tracking}|${Math.round(inset)}`;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  if (bleed) canvas.style.margin = `${-bleed}px 0`;
  if (canvas.dataset.k === key) return;
  canvas.dataset.k = key;
  const dpr = inkDpr();
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const nib = pen ?? Math.max(1.25, capH * 0.125);
  rows.forEach((L, i) => {
    if (!L.text) return;
    const upto = shown === Infinity ? null : Math.max(0, Math.min(L.text.length, shown - L.start));
    if (upto === 0) return;
    // the cap band sits centred in its line box, so the leading is even above and below
    const top = bleed + i * lead + (lead - capH) / 2;
    // ... and the last row is centred in the measure LESS the mark's corner, when there is one
    const room = inset && i === rows.length - 1 ? Math.max(1, w - inset) : w;
    signCaps(g, L.text, room / 2, top, {
      capH,
      tracking,
      pen: nib,
      color,
      alpha,
      align: 'center',
      baseline: 'top',
      seed: seed + i * 17,
      boil,
      upto,
    });
  });
}

// The name on the card — the speaker above the rule, the card's own name in an intertitle — is
// LETTERED, not set: the small hand-cut alphabet the titles piece cut for exactly this (its note
// in titles-sign.js names the placard). Nothing inside the drawing is allowed to be a system font.
// Drawn into a canvas at the display's own resolution (times two, so the pen keeps its edge when
// the browser scales it), sized from the same measurement the letters are cut from.
export function drawName(canvas, text, capH, { seed = 5, tracking = 0.3, pen = null, boil = 0, maxW = 0, color = INK } = {}) {
  // Into the case first: a card name, like everything else on the placard, may carry a sort the
  // hand has not got. Then down to the measure, if there is one, rather than out of the card.
  const t = signFold(text);
  const cap = maxW > 0 ? signFit(t, maxW, { capH, tracking }) : capH;
  const opts = { capH: cap, tracking, seed, boil, color, ...(pen ? { pen: pen * (cap / capH) } : {}) };
  const m = signGlyphs(t, opts);
  const pad = Math.max(2, cap * 0.3);
  const w = Math.ceil(m.width + pad * 2);
  const h = Math.ceil(cap * (1 + SIGN_ASCENT + SIGN_DESCENT)) + 2;
  const dpr = inkDpr();
  const key = `${t}|${w}|${h}|${seed}|${boil}|${color}`;
  if (canvas.dataset.k !== key) {
    canvas.dataset.k = key;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    signCaps(g, t, w / 2, cap * SIGN_ASCENT + 1, { ...opts, align: 'center', baseline: 'top' });
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  return { w, h, capH: cap };
}
export const CAN_LETTER = SIGN_HAS;

// The height of the box a name cut at `capH` occupies, in px — the same arithmetic drawName does.
// The card reserves its rows from this BEFORE anything is lettered into them, so a caption with a
// speaker over it and one without are the same object, the same size, in the same place.
export const nameBoxHeight = (capH) => Math.ceil(capH * (1 + SIGN_ASCENT + SIGN_DESCENT)) + 2;

// One pen stroke: points every ~10 units, drifting off the straight line by a slow random walk,
// the ends a little past the corners.
export function stroke(x1, y1, x2, y2, rng, { wobble = 1.1, overshoot = 1.2 } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
  const nx = -dy, ny = dx;
  const o1 = overshoot * (0.3 + rng()), o2 = overshoot * (0.3 + rng());
  const n = Math.max(2, Math.round(len / 9));
  const pts = [];
  let off = (rng() - 0.5) * wobble;
  for (let i = 0; i <= n; i++) {
    off = Math.max(-wobble * 1.5, Math.min(wobble * 1.5, off + (rng() - 0.5) * wobble));
    const s = -o1 + (len + o1 + o2) * (i / n);
    pts.push([x1 + dx * s + nx * off, y1 + dy * s + ny * off]);
  }
  return pts;
}

// An arc / a closed ring, drawn point by point with the same shake.
export function arc(cx, cy, rx, ry, rng, { from = 0, to = Math.PI * 2, wobble = 0.6, n = 0 } = {}) {
  const steps = n || Math.max(8, Math.round((Math.abs(to - from) / (Math.PI * 2)) * 34));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const j = (rng() - 0.5) * wobble;
    pts.push([cx + Math.cos(a) * (rx + j), cy + Math.sin(a) * (ry + j)]);
  }
  return pts;
}

export const pathD = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

// THE CARET: the nib standing on the line where the visitor's next letter will go — an upright pen
// stroke from the baseline to a little over the cap height, with the hand's own wobble in it.
//
// It was a short dash on the baseline until round 6 stood it up, and it stays standing now that the
// dashes are gone: it is the one mark left on the card, so it has to be unmistakably a caret at
// 390 px and not a rule. viewBox 0 0 12 26; the stroke runs from y = 25.6, the baseline, to y = 7.
export function drawCaret(svg, seed = 5) {
  const rng = mulberry32(seed);
  svg.setAttribute('viewBox', '0 0 12 26');
  const d = pathD(stroke(6, 25.6, 6.1, 7, rng, { wobble: 0.55, overshoot: 0.35 }));
  svg.innerHTML =
    `<path class="u" d="${d}" fill="none" stroke="${PAPER}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
}

// THE THINKING MARK — three dots, struck one at a time, on the line his words will be set on.
//
// ROUND 8. Time to his first sentence is about three seconds on the live model, and for all of it
// the card stood empty: not a man thinking, a page that has stopped. The puppet already thinks
// (pepeAnim.consider — the pin back, the head tilted, the eyes up and away); this is the CARD's
// half of the same beat, and it is drawn with the same pen as everything else on the placard.
//
// It is not three full stops out of the case. A dot from a pen is the nib PUT DOWN and
// lifted: two short overlapping strokes with the hand's wobble in them, so the mark has an edge
// that is not a circle. They are re-struck on every 12 fps step, so they boil exactly as the rest
// of the drawing does — a held dot is never the same dot twice.
//
// They are laid in HIS green, not in ink, because the colour of a mark is the only thing on this
// card that says whose it is (dialogue.js, PEPE_GREEN): three black dots in his register would
// read as the visitor's own.
//
// viewBox 0 0 34 12 — the baseline at y = 7.6, the three at x = 6, 17, 28.
export function drawDots(svg, n = 3, seed = 0, { color = INK, weight = 2.7 } = {}) {
  const rng = mulberry32(101 + (((seed % 1009) + 1009) % 1009) * 7);
  svg.setAttribute('viewBox', '0 0 34 12');
  const xs = [6, 17, 28];
  const ds = [];
  for (let i = 0; i < Math.max(0, Math.min(n, xs.length)); i++) {
    const x = xs[i] + (rng() - 0.5) * 0.55;
    const y = 7.6 + (rng() - 0.5) * 0.55;
    ds.push(pathD(stroke(x - 0.5, y - 0.1, x + 0.5, y - 0.3, rng, { wobble: 0.3, overshoot: 0.12 })));
    ds.push(pathD(stroke(x - 0.3, y + 0.3, x + 0.4, y + 0.15, rng, { wobble: 0.24, overshoot: 0.1 })));
  }
  const d = ds.join('');
  if (!d) {
    svg.innerHTML = '';
    return;
  }
  // the paper underlay first, the way an inker leaves a gap round a drawn object, then the mark
  svg.innerHTML =
    `<path d="${d}" fill="none" stroke="${PAPER}" stroke-width="${(weight * 2.1).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${weight.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// THE ARROW — the mark at the corner of the card that says there is more of this sentence, and
// that it waits for the visitor.
//
// ROUND 9, the user: "at the end, when he has filled the second line, add a little arrow for the
// user to click next when he's ready". Before it, a take that would not fit the well was replaced
// on a stopwatch (0.55 s after the last word landed) whether the visitor had finished reading it
// or not — "he switches over a bit too fast". So the clock is gone and this mark takes its place.
//
// It is drawn with the same pen as everything else on the card and it is NOT a glyph: a shaft with
// a slight bow in it, and a two-stroke head whose barbs cross past the point the way a hand's do —
// the hand does not stop on the mark. Re-struck on every 12 fps step from a frame-keyed seed, so it
// boils exactly as the dots, the caret and the card's own edge do.
//
// Laid in HIS green (dialogue.js, PEPE_GREEN), because what waits behind it is the rest of HIS
// sentence: an ink arrow in the corner of the card would read as the visitor's own mark.
//
// viewBox 0 0 26 18 — the shaft on the middle line, the point at x = 22.
export function drawArrow(svg, seed = 0, { color = INK, weight = 2.6 } = {}) {
  const rng = mulberry32(211 + (((seed % 1009) + 1009) % 1009) * 13);
  svg.setAttribute('viewBox', '0 0 26 18');
  const y = 9 + (rng() - 0.5) * 0.5;
  const tip = 20.9 + (rng() - 0.5) * 0.5;
  const ds = [
    pathD(stroke(3.4, y + (rng() - 0.5) * 0.4, tip, y, rng, { wobble: 0.45, overshoot: 0.6 })),
    // the barbs, drawn as two separate strokes that run a little PAST the point rather than meeting
    // it — the same corner the card's own frame has, where the pen does not stop on the mark
    pathD(stroke(13.2, 2.7, tip + 0.9, y - 0.35, rng, { wobble: 0.38, overshoot: 0.55 })),
    pathD(stroke(13.2, 15.3, tip + 0.9, y + 0.35, rng, { wobble: 0.38, overshoot: 0.55 })),
  ];
  const d = ds.join('');
  // the paper underlay first, so the mark keeps its own gap in whatever is behind it
  svg.innerHTML =
    `<path d="${d}" fill="none" stroke="${PAPER}" stroke-width="${(weight * 2.4).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${weight.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}


// ---------------------------------------------------------------------------------------------
// THE PLACARD — the card the line brings with it into the picture, like the sign the passenger
// holds up in the metro carriage of the Aline sequence (reference/fd-anim-metro-carriage.png):
// a hand-cut card of the same paper as the drawing, framed in one pen.
//
// Three things make it a drawn object rather than a rectangle with a border:
//
//   1. DECKLE. Every side is a torn/hand-cut paper edge, not a ruled line: a slow bow across the
//      whole side (a card is never flat), a random walk over it, and now and then a bite where a
//      fibre came away. The paper fill follows exactly that outline, so the shape you see IS the
//      cut of the card.
//   2. CORNERS THAT CROSS. The frame is four separate strokes, each drawn a good few pixels past
//      both corners, the way a hand rules a box and does not stop on the mark. No corner closes.
//   3. THE RULE. A wobbly ink rule under the speaker's name, as the brief asks, and a shorter one
//      dividing his line from the visitor's own words. Drawn with the same pen as the frame.
//
// The user asked for this card back after a critic had it removed in favour of free-floating type;
// see BRIEF.md. It is not a web element with a border: it is a drawn object.
export const PLACARD_BLEED = 15; // px the svg extends past the box, for the overshooting corners

// A hand-cut paper edge from (x1,y1) to (x2,y2). Positive offsets go INWARD (the normal (-dy,dx)
// points into the box for a clockwise traversal), so the same points serve the fill and the rule.
function deckle(x1, y1, x2, y2, rng, { amp = 0.9, bow = 1.5 } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
  const nx = -dy, ny = dx;
  const n = Math.max(8, Math.min(80, Math.round(len / 9)));
  const b = (rng() - 0.5) * 2 * bow; // the whole side bows one way
  const pts = [];
  let slow = (rng() - 0.5) * amp;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    slow = Math.max(-amp * 1.5, Math.min(amp * 1.5, slow + (rng() - 0.5) * amp * 0.62));
    // a fibre came away: a short bite out of the edge, or a whisker left on it
    const bite = rng() < 0.05 ? (rng() - 0.4) * amp * 2.2 : 0;
    const off = b * Math.sin(u * Math.PI) + slow + bite;
    pts.push([x1 + dx * len * u + nx * off, y1 + dy * len * u + ny * off]);
  }
  return pts;
}

// Push the two ends of a polyline out along their own direction: the pen ran past the corner.
function runOn(pts, d0, d1) {
  const out = pts.map((p) => p.slice());
  const n = pts.length;
  if (n < 2) return out;
  const ext = (a, b, d) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [b[0] + ((b[0] - a[0]) / l) * d, b[1] + ((b[1] - a[1]) / l) * d];
  };
  out[0] = ext(pts[1], pts[0], d0);
  out[n - 1] = ext(pts[n - 2], pts[n - 1], d1);
  return out;
}

const shift = (pts, x1, y1, x2, y2, d) => {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -((y2 - y1) / len) * d, ny = ((x2 - x1) / len) * d;
  return pts.map(([px, py]) => [px + nx, py + ny]);
};

/**
 * Draw the card. `rules` are the ink rules across it — {y} in box pixels (0 = the top of the
 * caption's box), with an optional `inset` (px from each side, default the card's own margin),
 * `w` (pen width, default a hair under the frame's) and `short` (a fraction of the measure, for a
 * centred divider). Returns nothing; the svg is replaced.
 */
export function drawPlacard(svg, w, h, seed = 7, lw = 2.4, rules = []) {
  const rng = mulberry32(seed);
  const B = PLACARD_BLEED;
  const W = w + 2 * B, H = h + 2 * B;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  const x0 = B, y0 = B, x1 = B + w, y1 = B + h;
  // the cut of the paper, clockwise from the top-left corner
  const amp = Math.max(1.0, Math.min(2.2, w * 0.0028));
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const cut = corners.map((a, i) => {
    const b = corners[(i + 1) % 4];
    // a long edge bows more than a short one, as a sheet of card does
    const bow = Math.min(7, Math.max(1.2, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.009));
    return deckle(a[0], a[1], b[0], b[1], rng, { amp, bow });
  });
  const fill = cut.flat();
  // the pen frames the card just inside its edge, each side run well past both corners
  const frame = cut.map((pts, i) => {
    const a = corners[i], b = corners[(i + 1) % 4];
    const inked = shift(pts, a[0], a[1], b[0], b[1], lw * 0.75 + 0.6);
    return runOn(inked, 3.5 + rng() * 6.5, 3.5 + rng() * 6.5);
  });

  const pad = Math.max(10, Math.min(30, w * 0.045));
  const ruleD = rules.map((r) => {
    const ins = r.inset ?? pad;
    const span = (w - 2 * ins) * (r.short ?? 1);
    const cx = B + w / 2;
    const ry = B + r.y;
    // ruled with the same hand as the card's own edge: a slow bow, not a straight line
    const a = amp * (r.short ? 0.5 : 0.8);
    const pts = deckle(cx - span / 2, ry, cx + span / 2, ry, rng, { amp: a * 0.55, bow: a * 2.4 });
    return { d: pathD(runOn(pts, 1 + rng() * 2.5, 1 + rng() * 2.5)), w: r.w ?? lw * 0.72 };
  });

  svg.innerHTML =
    `<path d="${pathD(fill)}Z" fill="${PAPER}" stroke="none"/>` +
    frame.map((pts) => `<path d="${pathD(pts)}" fill="none" stroke="${INK}" stroke-width="${lw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
    ruleD.map((r) => `<path d="${r.d}" fill="none" stroke="${INK}" stroke-width="${r.w.toFixed(2)}" stroke-linecap="round"/>`).join('');
}
