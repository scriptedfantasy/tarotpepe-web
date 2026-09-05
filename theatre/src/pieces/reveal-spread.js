// reveal-spread.js — WHERE THE SEVENTY-EIGHT CARDS LIE. Pure geometry, no Three.js, so the
// arrangement can be measured on its own (tools/_rv7-geom.mjs) instead of eyeballed.
//
// THE USER'S RULE: "tarot is pulled from all 78 cards, not a sub section". So the whole deck goes
// on the cloth. The staging problem is that the cloth is a disc of 0.62 m with a row of three
// reading slots already standing in the middle of it, and 78 cards are 2.3 m² of card.
//
// WHAT THE CLOTH ACTUALLY LEAVES (all measured, round 7):
//   · the table's rim is at r = 0.62; a card's corner is kept inside r = 0.60.
//   · the three reading slots occupy x ∈ [-0.29, 0.29], z ∈ [0.026, 0.256] — a bar right across
//     the middle of the near half. Nothing in the spread may enter it: a picked card lands there.
//   · the fan plate (camera round 6) frames x ≤ 0.503, z ∈ [0.01, 0.577] at 16:9 and x ≤ 0.438 on
//     a phone, so |x| ≤ 0.425 and z ≤ 0.568 is what survives both.
// That leaves a CRESCENT — bounded outside by the rim, inside by the slot row — which is 0.344 m
// deep on the axis and shallower at the ends. A rectangle of ranks cannot live in it (at z = 0.454
// the table is only 0.19 m wide), so the spread is CONCENTRIC WITH THE TABLE: six nested bows of
// cards, each card turned to point out of the table's centre, so the composition curves the way
// the object it lies on curves.
//
// AND THE BOWS GET SHORTER AS THEY GO IN, because the slot row does: a bow may only run to the
// angle at which its own inner corner still clears that bar, which is solved here as a rectangle
// against a rectangle. The arithmetic hands us a stepped pediment — 19 · 17 · 15 · 13 · 9 · 5 —
// which is also the composition a film would build: a shell of cards opening around the three
// slots, symmetric about the frame's axis.
//
// ROUND 8, THE USER, ON A PHONE: "on a very vertical screen format the cards are very much at the
// edge of the table and we're losing a lot of space on the table. maybe we can make them more
// central?" Round 7's bows ran to |x| = 0.340 and brought their furthest corner to 0.5695, five
// centimetres off a rim of 0.62 — and on a 390 px frame that is 8.1 px of each card showing, in a
// band jammed against the near edge of the cloth. The bow cannot come in and stay as wide: reach()
// is governed by the reading row, so a smaller radius is always a shorter bow. So the spread was
// re-nested for WIDTH rather than depth (tools/_rv8-fit4.mjs sweeps every nesting): SIX bows a
// centimetre and a fifth apart instead of four bows nearly two centimetres apart. Same 78 cards,
// same crescent, but
//   · |x| 0.340 → 0.317 and the furthest corner 0.5695 → 0.5595: 60 mm inside the rim, not 51;
//   · the pitch along a bow 18.3 → 23.8 mm, so each card shows a fifth of itself instead of a
//     seventh, and the spread reads as cards rather than as a comb;
//   · a portrait plate cut to the spread + the reading row can now give 616 px/m instead of 445,
//     which is the other half of the user's note and belongs to the camera.
// SIX bows and not four: the step between bows and the pitch along them trade against each other
// (the crescent's depth beyond one card's length is fixed at about 0.11 m), and the picture wants
// the pitch — the step is only ever seen as the head of the card behind. 12 mm between bows is
// 7.4 px on a phone at the plate above, which is what 18.5 mm was at round 7's.
//
// ROUND 10: THE SPREAD IS LAID DIFFERENTLY ON A PORTRAIT WINDOW, and it has to be, because no lens
// can do it. Camera round 9 got the 16:9 plate from 33.3 % of the frame to 58.4 % and then proved
// the phone shut: "the spread is 0.634 m wide and 0.33 m deep — a landscape box. A 390x760 frame
// that holds its width is 1.36 m deep, against a table 1.24 m across… the subject's depth never
// binds below aspect ~1.15, so the row costs the plate nothing there and there is nothing to buy.
// If this frame is to improve, the spread has to be laid less wide and deeper on a portrait
// window — that is a reveal-side change, not a lens."
//
// Measured, live, at 390x760: the plate is 0.696 m of cloth across and 1.356 m deep, the spread is
// 0.634 x 0.330 in it, and so the cards get 560 px to the metre — a card 74 px wide — while 78 % of
// the frame's height is bare cloth. The spread uses all of one axis and a fifth of the other.
//
// The lever round 8 never pulled is a CAP ON |x| tighter than the reading row's own limit. Round 8
// took every bow as wide as `reach()` would allow, and `reach()` is governed by that row; capping
// the bow instead makes every bow shorter, which needs more bows, which is exactly the "narrower
// and deeper" being asked for. tools/_rv10-fit.mjs sweeps cap × bows × step × inner radius against
// the plate the camera actually gives (it holds the spread's width with a 1.098 margin), and the
// answer for a phone is EIGHT bows nine millimetres apart, capped at |x| = 0.196:
//   · |x| 0.3168 → 0.196, so the plate is 0.430 m across instead of 0.696 and gives 907 px/m;
//   · the raised card's tap box 74 x 129 px → 121 x 209 (round 8's own probe, tools/_rv7-pick.mjs,
//     driving a real pointer: 120.8 x 209.1);
//   · the spread's box 20.5 % → 34.1 % of a 390x760 frame, and its depth 22 % → 37 % of the
//     frame's height, which is the axis the picture was wasting;
//   · the furthest corner still 55 mm inside the rim — round 8 had 60 — and the inner bow still
//     clears the reading row by the same 4 mm;
//   · the step is 9 mm and not 12, because the sliver each bow shows of the one behind it is a
//     number of PIXELS, not of millimetres: 9 mm at 907 px/m is 8.2 px, where round 8's 12 mm at
//     its own plate was 7.4. Every bow is still an odd bow with a keystone on the frame's axis.
// The pitch along a bow goes 23.8 → 21 mm, which is the one thing this costs.
//
// The two nestings are BOTH kept and the window chooses, because the tall one is only right on a
// tall window: at 16:9 it leaves two fifths of the frame's width bare and the plate falls from
// 53.8 % of the frame to 33.1 % for a card the same size. Both were measured at four shapes with
// tools/_rv10-frame.mjs, the spread's box as a share of the frame and the raised card's tap box:
//   aspect 1.78   wide 53.8 %, 265 px   ·  tall 33.1 %, 264 px      → wide
//   aspect 1.40   wide 58.7 %, 273 px   ·  tall 42.1 %, 294 px      → wide
//   aspect 1.20   wide 49.2 %, 231 px   ·  tall 49.1 %, 294 px      → tall (same frame, +27 % card)
//   aspect 1.09   wide 44.0 %, 229 px   ·  tall 54.0 %, 323 px      → tall
// so the line is drawn at 1.25, between the shape where they fill the frame equally and the one
// where the wide nesting pulls ahead. Nothing else in the piece knows which is out — every bow,
// keystone, pointer, pose and take is derived from `SPREAD.tiers`.
//
// ONE THING THIS HANDS THE CAMERA, and it is not ours to solve. camera.js says "a phone never sees
// [the reframe] — there the frame is bound by the spread's width and the row costs it nothing".
// That was true of a spread 0.634 m wide; it is not true of one 0.392 m wide. The reading row is
// 0.602 m across its cards (reveal-takes.js → ROW_X = 0.225, a number solved for the 16:9 card
// insert and not ours to move), so the first card landing in slot 0 now opens the phone's plate
// from x ±0.215 to ±0.331 — measured, tools/_rv10-frame.mjs with PICKS=1 — where before it opened
// from ±0.348 to ±0.348 and did nothing. The card itself does not shrink (74 px before at every
// stage; 122 px while choosing from 78, 87 px after) and the destination frame is the one the
// camera already composes, but that beat is now a 0.34 s move on a phone where it used to be none.

const CARD = { w: 0.13, h: 0.2275 };

// the row of reading slots, as the bar it is: nothing may enter this
const ROW = { x: 0.29, z: 0.256 };
const ROW_CLEAR = 0.004; // …plus four millimetres, for the jitter a hand puts in both

// r: the radius of the bow's card centres, from the TABLE's centre. phi: its half-angle, derived.
// n: how many cards it carries. Tier 0 is the outermost — nearest the visitor, laid last, on top.
// `x` is the cap on how wide a bow may run; `r0` the outer bow, `step` the gap in to the next.
const NESTS = {
  // round 8, and unchanged: as wide as the reading row allows, six bows, 19/17/15/13/9/5
  wide: { bows: 6, r0: 0.442, step: 0.012, x: 0.425 },
  // round 10, for a window taller than about 1.15:1 — eight bows, capped, 9/11/11/11/11/11/9/5
  tall: { bows: 8, r0: 0.448, step: 0.009, x: 0.196 },
};
// which nesting a window shape gets: the shape at which the two fill the frame equally, measured
// (see the table above). Under it the tall nesting is the better picture, over it the wide one.
const TALL_BELOW = 1.25;
const TOTAL = 78;

// the corner of a card at angle `a` on radius `r` that comes nearest the slot row, and whether it
// is clear of it. The row is a BAR (|x| ≤ 0.29, z ≤ 0.256), not a circle, so this is a rectangle
// against a rectangle and it is solved as one — the inner edge of a raked card dips a good
// centimetre below its own midpoint, which is exactly what a first pass of this got wrong.
function clearsRow(r, a) {
  const p = { x: r * Math.sin(a), z: r * Math.cos(a), ang: a };
  for (const c of cardCorners(p)) {
    if (Math.abs(c[0]) <= ROW.x + CARD.w / 2 && c[1] < ROW.z + ROW_CLEAR) {
      // inside the bar's x span and below its near edge — but the bar has gaps between its three
      // cards, and a corner there is over bare cloth. Treated as solid: a card whose corner sits
      // in a 9 cm gap between two reading slots is a card in the way of the reading.
      return false;
    }
  }
  return true;
}
// how far a bow may run: the row on the inside, the nesting's own cap on the outside (`x` — 0.425
// keeps every corner inside a phone's frame at the wide nesting; 0.196 is the tall one's whole
// point), and the rim (every corner inside r = 0.60)
function reach(r, X = 0.425) {
  let lo = 0, hi = 1.35;
  for (let i = 0; i < 44; i++) {
    const m = (lo + hi) / 2;
    const p = { x: r * Math.sin(m), z: r * Math.cos(m), ang: m };
    const cs = cardCorners(p);
    const ok = clearsRow(r, m) && cs.every((c) => Math.abs(c[0]) <= X && Math.hypot(c[0], c[1]) <= 0.60);
    if (ok) lo = m;
    else hi = m;
  }
  return lo;
}
// 78 cards shared between the bows in proportion to how much bow there is — and EVERY BOW GETS AN
// ODD COUNT, which is the whole of the user's second note. A bow of an even number of cards has no
// middle card: the frame's axis falls in the JOIN between two of them and the picture is cut down
// its own centre line. An odd bow has a keystone, laid last, lying whole and square on the axis
// with its neighbours tucked under it either side. 19 + 17 + 15 + 13 + 9 + 5 = 78.
function share(arcs) {
  const sum = arcs.reduce((a, b) => a + b, 0);
  const n = arcs.map((L) => Math.max(5, Math.round((TOTAL * L) / sum)));
  for (let i = 0; i < n.length; i++) if (n[i] % 2 === 0) n[i] += 1;
  // the remainder goes on and comes off in TWOS, longest bow first, so the parity survives
  let d = TOTAL - n.reduce((a, b) => a + b, 0);
  const byArc = n.map((_, i) => i).sort((a, b) => arcs[b] - arcs[a]);
  for (let k = 0, guard = 0; d !== 0 && guard < 400; k++, guard++) {
    const i = byArc[k % byArc.length];
    if (d >= 2) {
      n[i] += 2;
      d -= 2;
    } else if (d <= -2 && n[i] > 7) {
      n[i] -= 2;
      d += 2;
    } else break;
  }
  // an odd total cannot be made of odd bows: the shortest bow wears the odd one out. (78 is even
  // and the sweep is chosen so this never fires; it is here so a future radius cannot silently
  // hand a bow an even count.)
  if (d !== 0) n[n.length - 1] += d;
  return n;
}

// one nesting solved: the bows, in and outwards from `r0`, each as long as `reach` allows under
// the cap, the 78 shared between them in proportion to how much bow there is
function solve(cfg) {
  const rs = Array.from({ length: cfg.bows }, (_, k) => cfg.r0 - k * cfg.step);
  const phis = rs.map((r) => reach(r, cfg.x));
  const ns = share(rs.map((r, k) => 2 * phis[k] * r));
  return rs.map((r, k) => ({ k, r, phi: phis[k], n: ns[k], pitch: ns[k] > 1 ? (2 * phis[k] * r) / (ns[k] - 1) : 0 }));
}
const SOLVED = {};
const nestFor = (name) => (SOLVED[name] ??= solve(NESTS[name]));

export const SPREAD = {
  card: CARD,
  // which nesting is out and what it is made of. Both are set by `layoutFor` below; they start on
  // the wide one so anything that reads the spread before a window has been measured gets round 8's.
  nest: 'wide',
  step: NESTS.wide.step,
  // HOW THE SHINGLE STACKS, in half-thicknesses of card — the one number both the drawing
  // (reveal-fan.js → restPose) and the pointer (stackOrder below) are built from, so what stands up
  // under a finger can never drift from what is drawn there. A bow rides three half-thicknesses
  // over the bow behind it; along a bow, a card rides one per card it was laid over.
  tierLift: 3,
  // the hover: the card under the pointer slides UP THE FRAME (the user's rule — never down) and
  // rides a hair over its neighbours so the whole of it is drawn. The whole card it uncovers is the
  // tap target: measured with a real pointer at both sizes (tools/_rv7-pick.mjs) it is never smaller
  // than 315 x 487 px at 1600x900 or 121 x 209 on a 390 px phone — round 7's was 58 x 101 there, and
  // the phone's was 74 x 129 before the tall nesting came in (round 10).
  lift: { z: 0.030, y: 0.0055 },
  // and the two cards either side of it step apart along their bow, so a gap opens where it was.
  // Conservative: the push dies away by the sixth neighbour, so no bow ever grows at its ends.
  open: { amp: 0.015, fall: [0, 1, 0.6, 0.33, 0.15, 0.05] },
  tiers: nestFor('wide'),
  total: TOTAL,
};

// THE WINDOW CHOOSES THE NESTING (round 10). Called by reveal.js at build and again whenever the
// window changes shape, BEFORE the camera re-solves its plates off `SPREAD.tiers` — the reveal
// piece is built first, so its resize listener runs first. Returns true when the spread actually
// changed and the cards on the cloth have to be laid again.
export function layoutFor(aspect) {
  const want = aspect < TALL_BELOW ? 'tall' : 'wide';
  if (want === SPREAD.nest) return false;
  SPREAD.nest = want;
  SPREAD.step = NESTS[want].step;
  SPREAD.tiers = nestFor(want);
  return true;
}

// THE KEYSTONE: the middle card of a bow, the one the frame's axis runs through. It is laid last,
// it lies flat (no roll — both its neighbours are under it, symmetrically), and it is the only
// card of its bow that shows the whole of itself.
export const keystone = (t) => (t.n - 1) / 2;
export const isKeystone = (t, j) => j * 2 === t.n - 1;

// How many cards a card was laid over — which is how far along its bow it is from the END it was
// laid from — and which half of the bow it belongs to. The overlap runs inwards from both ends, so
// this rises to the keystone and falls away again.
export const under = (t, j) => Math.min(j, t.n - 1 - j);
export const leftHalf = (t, j) => j * 2 < t.n - 1;
// Where a card sits in the pile, in half-thicknesses of card. Higher is nearer the lens. The right
// half of a bow rides half a thickness over the left half so that no two cards are ever coplanar —
// without it the mirror pair either side of a keystone fight for the pixel the moment the keystone
// is taken.
export const stackOrder = (t, j) => (SPREAD.tiers.length - 1 - t.k) * SPREAD.tierLift + under(t, j) + (leftHalf(t, j) ? 0 : 0.5);

// The bow a card belongs to, and where along it. `j` runs left to right.
export const tierOf = (i) => {
  let n = 0;
  for (const t of SPREAD.tiers) {
    if (i < n + t.n) return { tier: t, j: i - n };
    n += t.n;
  }
  return { tier: SPREAD.tiers[SPREAD.tiers.length - 1], j: 0 };
};

// the angle of card j on bow t, plus however far the hover has pushed it along
export const angleAt = (t, j, push = 0) => (t.n > 1 ? -t.phi + (j * 2 * t.phi) / (t.n - 1) : 0) + push / t.r;

// Where a card lies: on its bow, turned to point out of the table's centre.
// Returns { x, z, ang } — `ang` is the direction it points, measured from +z (up the frame).
export function poseAt(t, j, push = 0, jx = 0, jz = 0, ja = 0) {
  const a = angleAt(t, j, push);
  return { x: t.r * Math.sin(a) + jx, z: t.r * Math.cos(a) + jz, ang: a + ja, tier: t.k, j };
}

// the four corners of a card at a pose, in the cloth's own (x, z)
export function cardCorners(p, card = CARD) {
  const s = Math.sin(p.ang), c = Math.cos(p.ang);
  const u = [s, c], tg = [c, -s]; // outward along the card, and across it
  const out = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) out.push([p.x + (a * card.h * u[0] + b * card.w * tg[0]) / 2, p.z + (a * card.h * u[1] + b * card.w * tg[1]) / 2]);
  return [out[0], out[1], out[3], out[2]]; // wound
}

// every card's rest pose, in laying order (the innermost bow first: it goes down first and the
// bows in front of it come down on top, so the outer bow shows whole cards)
export function entryPoses() {
  const out = [];
  for (const t of SPREAD.tiers) for (let j = 0; j < t.n; j++) out.push(poseAt(t, j));
  return out;
}

// The pointer, in cloth metres, to the card under it. Done on the CLOSED spread, never on the
// opened one, so the mapping is a fixed function of where the finger is and cannot chase itself.
//
// IT IS THE CARD THE EYE SEES THERE, worked out the way the eye works it out: of the cards whose
// footprint covers the point, the one lying highest in the pile (stackOrder). Nothing is
// approximated — no nearest bow, no nearest centre, no partition of the angle.
//
// Rounds 6 and 7 chose the bow by whose CENTRE LINE was nearest, and that is wrong by more than a
// hundred millimetres: a bow's centre is at r, but the cloth it SHOWS is the twelve-millimetre
// strip at r − h/2. Nearest-centre handed the whole lower half of the visible fan to the innermost
// bow — a finger on the big card in front of you stood up a card sixty ranks behind it — and, along
// a bow, named a card two or three ranks from the one it was on, because what a card shows is the
// strip along the edge facing the end it was laid from, not the strip around its own middle.
// Measured over the whole spread on a 2 mm grid (tools/_rv8-point.mjs): 12.5 % right before,
// 94.4 % after, and what is left is the millimetre and a half of jitter a hand puts in each card,
// which this cannot know about — when it is wrong now it is wrong by one rank.
const _pip = (q, px, pz) => {
  let s = false;
  for (let i = 0, k = q.length - 1; i < q.length; k = i++) if (q[i][1] > pz !== q[k][1] > pz && px < ((q[k][0] - q[i][0]) * (pz - q[i][1])) / (q[k][1] - q[i][1]) + q[i][0]) s = !s;
  return s;
};
const REACHES = Math.hypot(CARD.h, CARD.w) / 2; // no card can cover a point further than this away
export function indexAt(x, z, has = () => true) {
  const r = Math.hypot(x, z), a = Math.atan2(x, z);
  let best = null, bestRank = -Infinity, base = 0;
  for (const t of SPREAD.tiers) {
    for (let j = 0; j < t.n; j++) {
      const rank = stackOrder(t, j);
      if (rank <= bestRank) continue; // already covered by something higher: nothing to learn
      const p = poseAt(t, j);
      if (Math.hypot(p.x - x, p.z - z) > REACHES) continue;
      if (!_pip(cardCorners(p), x, z)) continue;
      bestRank = rank;
      best = base + j;
    }
    base += t.n;
  }
  if (best == null) {
    // off the cards altogether (inside the innermost bow, or past every bow's end): the nearest
    // card of all, so a finger that wanders a centimetre never chooses nothing
    let bestD = Infinity;
    base = 0;
    for (const t of SPREAD.tiers) {
      const j = t.n > 1 ? Math.round(((Math.max(-t.phi, Math.min(t.phi, a)) + t.phi) / (2 * t.phi)) * (t.n - 1)) : 0;
      const d = Math.hypot(r - t.r, (a - angleAt(t, j)) * t.r) + (Math.abs(a) > t.phi ? 0.05 : 0);
      if (d < bestD) {
        bestD = d;
        best = base + j;
      }
      base += t.n;
    }
  }
  if (best == null) return null;
  if (has(best)) return best;
  // the card there has already been taken: the nearest one still on the cloth, along the bow
  const total = SPREAD.total;
  for (let d = 1; d < total; d++) {
    if (best - d >= 0 && has(best - d)) return best - d;
    if (best + d < total && has(best + d)) return best + d;
  }
  return null;
}
