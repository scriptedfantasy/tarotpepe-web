// reveal-wash.js — WHERE THE SEVENTY-EIGHT LIE WHEN THE VISITOR PICKS FROM THEM, and which one is
// under the finger. Pure geometry, no Three.js, so the arrangement is measured on its own
// (tools/_rv12-band.mjs, tools/_rv8-point.mjs) instead of eyeballed.
//
// ROUND 12, AND IT IS THE USER'S NOTE: "i see you did a swoosh shuffle, then pepe stacks the cards,
// then the users picks from the cleanly layed out set. what if the users picks directly from the
// swoosh, with all cards layed out messily?" That is how a reading actually works — a reader washes
// the deck and has you take three out of the wash — so the mass IS the pick surface and the neat arc
// is gone. reveal-spread.js's six nested bows are retired with it.
//
// THE ONE THING A SCATTER OWES THE REST OF THE SHOW IS AN ORDER. The visitor may say "the third
// from the left" (flow-lines.js → parsePick → reveal.pickByOrdinal), and a heap has no ranks. So
// after the swirl he does not square the cards, he PUSHES THEM OUT: the churned mass opens into a
// BAND across the near half of the cloth — still flat, still at every angle, still overlapping
// heavily with bare gaps and a ragged outline, but spread left to right, so a card's rank across
// the picture is a real thing and the ordinal still resolves. The band is laid so its
// seventy-eight x's are ranked and reasonably even (see `even` below), which is what makes the
// third from the left the card a person would point at.
//
// WHAT THE BAND OWES THE PHOTOGRAPH (BRIEF.md's five checks, which round 11 met and this may not
// regress): the cards lie FLAT; they are at EVERY angle; they overlap heavily and irregularly, with
// stacks of three and four and gaps of bare cloth and a ragged outline; the mass is several cards
// across each way; both hands are in it while it is being pushed. The first four are this file's
// job and tools/_rv12-band.mjs measures every one of them.
//
// WHAT THE CLOTH LEAVES (measured, and unchanged since round 7):
//   · the rim is at r = 0.62 and a card's corner is kept inside r = 0.60;
//   · the three reading slots are a bar right across the middle of the near half — |x| ≤ 0.29,
//     z ≤ 0.256 — and a picked card lands in it, so nothing in the band may LIE in it. The hovered
//     card is allowed over it: it rides 20 mm proud of the cloth for the two drawings it is up, and
//     the fan did the same (its own box ran to z 0.230, inside the bar). See `confine`;
//   · the window's own cap on how wide the mass may run, which is the whole of the phone argument
//     below.
//
// TWO SHAPES, THE WAY THE SPREAD HAD TWO NESTINGS (round 10, and the argument survives the fan):
// a phone is bound by the mass's WIDTH and nothing else, so a band as wide as the 16:9 one gets
// 78 cards on a 390 px frame at 600 px to the metre and a tap target no thumb can use. The phone
// therefore gets a narrow, deep band and the wide window a broad, shallow one; both are ragged,
// both are clumped, and every take, pose and hit test is derived from `WASH.poses`, so nothing else
// in the piece knows which is out.
import { mulberry32 } from '../core/rng.js';

const CARD = { w: 0.13, h: 0.2275 };
const TOTAL = 78;
// the bar the three reading slots occupy, plus the 4 mm of jitter a hand puts in a laid card
const ROW = { x: 0.29, z: 0.256 };
const ROW_CLEAR = 0.004;
const RIM = 0.60; // no corner past this radius (the table's rim is 0.62)

// The hover: the card under the pointer slides UP THE FRAME — the user's rule, never down — and
// rides clear of the whole heap, so the whole of it is drawn over everything it was lying under.
// `y` is measured from the top of the heap (DEEP), not from the cloth: on a scatter a card that
// only rises five thicknesses is still buried under three of its neighbours.
export const LIFT = { z: 0.032, y: 0.004 };
// how proud of the cloth the heap itself rides: 78 cards of 0.8 mm would be 62 mm, which is a
// tower, so the pile is drawn at a quarter of that and the ranks are 0.2 mm apart
export const DEEP = 0.016;

// ax/cz/az   the nominal band of card CENTRES: |x| ≤ ax, z ∈ cz ± az
// xcap       how far a card's CORNER may run across the picture — the frame's own limit
// zcap       …and how far DOWN the frame it may run — which is NOT the rim, and this is the whole
//            of the staging argument. The choosing plate is composed on this mass with the caption's
//            placard docked over the top 22 % of the frame (camera-plan.js → CAP_BAND), its bottom
//            edge pinned inside the rim and the rug line under that; those rules fight, and past a
//            near edge of about z 0.565 the lens runs away — swept with the camera's own solver in
//            tools/_rv12-sweep.mjs, a card goes from 288 px to 114 px in a 1600 px frame between
//            0.560 and 0.575. So the mass stops at 0.556 (0.570 on a phone, where the width binds
//            instead and the cliff is at 0.590), and what it costs is depth: the band is 0.68 x 0.29
//            rather than the 0.68 x 0.32 the cloth would allow.
// knots      how many clumps the cards are dealt to (an even fill is a pavement, not a wash)
// sig        how far a card scatters from its knot, across and along
// voids      discs of bare cloth cleared through the mass afterwards
// even       how far the x-ranks are pulled toward an even spacing: 0 leaves clumps that no one
//            could count, 1 is a comb. See `evenOut`.
const BANDS = {
  wide: { ax: 0.222, cz: 0.400, az: 0.070, xcap: 0.340, zcap: 0.558, knots: 16, sig: [0.044, 0.038], voids: 4, even: 0.6 },
  tall: { ax: 0.070, cz: 0.400, az: 0.082, xcap: 0.197, zcap: 0.558, knots: 11, sig: [0.028, 0.050], voids: 3, even: 0.55 },
};
const TALL_BELOW = 1.25; // the window shape at which the band re-lays, as the spread's nesting did

// how far a card at this angle reaches from its own centre, across the frame and up it
export function extentOf(ang) {
  const s = Math.abs(Math.sin(ang)), c = Math.abs(Math.cos(ang));
  return { x: (CARD.h * s + CARD.w * c) / 2, z: (CARD.h * c + CARD.w * s) / 2 };
}

// the four corners of a card at a pose, in the cloth's own (x, z) — `ang` is the direction it
// points, measured from +z (down the frame, toward the visitor)
export function cardCorners(p, card = CARD) {
  const s = Math.sin(p.ang), c = Math.cos(p.ang);
  const u = [s, c], tg = [c, -s];
  const out = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) out.push([p.x + (a * card.h * u[0] + b * card.w * tg[0]) / 2, p.z + (a * card.h * u[1] + b * card.w * tg[1]) / 2]);
  return [out[0], out[1], out[3], out[2]]; // wound
}

// A card pushed where it is allowed to lie: inside the frame's caps, clear of the reading row, and
// with every corner inside the rim. Each card carries a few millimetres of slack of its own in each
// limit so the mass does not acquire a clean straight edge where one of them bites — the outline is
// supposed to be ragged — but never more slack than the room between two limits allows, because on
// this cloth there is very little room. The crescent between the reading row and the near rim is
// 0.30 m deep and a card lying at 35 degrees is 0.26 m deep: cards across the frame can go almost
// anywhere in it, cards pointing up it have 68 mm of freedom, cards on the diagonal have 34.
//
// THE ROW IS CLEARED AT REST, NOT AT THE LIFT. A picked card lands in that bar and nothing may lie
// under one, but the hovered card rides 20 mm proud of the cloth for the two drawings it is up, and
// a card held over the row while the visitor looks at it passes 19 mm above anything already lying
// there. The fan did exactly this (its own box ran to z 0.230, inside the bar), and taking those
// 32 mm off every card instead closes the window for a card on the diagonal completely.
function confine(p, cfg, slack) {
  const e = extentOf(p.ang);
  const xr = Math.max(0.02, cfg.xcap - e.x);
  const zlo0 = ROW.z + ROW_CLEAR + e.z, zhi0 = cfg.zcap - e.z;
  const room = Math.max(0, zhi0 - zlo0);
  const xcap = xr - Math.min(slack.x, xr * 0.1);
  const zlo = zlo0 + Math.min(slack.z, room * 0.3), zhi = zhi0 - Math.min(slack.r, room * 0.3);
  const rim = RIM - slack.r;
  const clamp = () => {
    p.x = Math.max(-xcap, Math.min(xcap, p.x));
    p.z = Math.min(p.z, Math.max(zhi, zlo0));
    // …and only cards whose span actually crosses the reading row's bar are held off it
    if (Math.abs(p.x) - e.x <= ROW.x + CARD.w / 2) p.z = Math.max(p.z, Math.min(zlo, zhi0));
  };
  clamp();
  for (let k = 0; k < 24; k++) {
    let worst = null, wr = 0;
    for (const c of cardCorners(p)) {
      const r = Math.hypot(c[0], c[1]);
      if (r > wr) {
        wr = r;
        worst = c;
      }
    }
    if (wr <= rim) break;
    // pushed straight in along the offending corner's own bearing, and held off the row again: at
    // x = 0 the near limit always clears the rim, so this always has somewhere to go
    const over = wr - rim;
    p.x -= (over * worst[0]) / wr;
    p.z -= (over * worst[1]) / wr;
    clamp();
  }
  return p;
}

// THE RANKS, MADE COUNTABLE. Clumps are what makes a wash look like a wash, and they are also what
// makes "the third from the left" meaningless: four cards in one knot can share a centimetre of the
// picture between them. So after the mass is laid, the x's are pulled part of the way toward an even
// spacing across the band — a MONOTONE map, so no card overtakes another and the mass keeps every
// knot it had in z and in overlap; only the left-to-right pitch is evened out.
function evenOut(list, amt) {
  const order = list.slice().sort((a, b) => a.x - b.x);
  const x0 = order[0].x, x1 = order[order.length - 1].x;
  const span = x1 - x0;
  if (span < 1e-6) return;
  order.forEach((p, k) => {
    const want = x0 + (span * k) / (order.length - 1);
    p.x += (want - p.x) * amt;
  });
}

// ── THE BAND ──────────────────────────────────────────────────────────────────────────────────────
// Not a fill: KNOTS of uneven weight, stratified across the width so no half of the band is bald,
// with the cards scattered round the one they were dealt to. Between the knots is bare cloth; in
// them are three and four cards on top of one another. Then a few discs of cloth are cleared
// through it, the ranks are evened, and every card is confined to what the cloth and the frame
// allow. The stacking order is a shuffle: a wash has no layers, and what is on top at a point is
// what the eye sees there and what the finger picks.
function layout(cfg, seed) {
  const rng = mulberry32(7300 + (seed | 0));
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const knots = [];
  for (let k = 0; k < cfg.knots; k++) {
    const u = (k + 0.5 + (rng() - 0.5) * 0.9) / cfg.knots;
    knots.push({ x: cfg.ax * (2 * u - 1) * 0.92, z: cfg.cz + (rng() - 0.5) * 1.4 * cfg.az, w: 0.5 + rng() * rng() * 2.4 });
  }
  const wsum = knots.reduce((s, k) => s + k.w, 0);
  const list = [];
  for (let i = 0; i < TOTAL; i++) {
    let t = rng() * wsum, c = 0;
    while (c < knots.length - 1 && (t -= knots[c].w) > 0) c++;
    list.push({
      x: knots[c].x + gauss() * cfg.sig[0],
      z: knots[c].z + gauss() * cfg.sig[1],
      ang: (rng() - 0.5) * 2 * Math.PI, // every angle, and no two alike
      slack: { x: rng() * 0.018, z: rng() * 0.022, r: rng() * 0.020 },
    });
  }
  // The ranks first, then the cloth's own limits, and THEN the holes — in that order, because
  // anything done after a void fills it in again. `evenOut` is a monotone map in x and `confine`
  // only ever pushes a card in off an edge, so neither can undo the clumping; a void moved before
  // them would simply be paved over.
  evenOut(list, cfg.even);
  for (const p of list) confine(p, cfg, p.slack);
  // THE BAYS. A heap pushed about by two hands has cloth showing through it, and knots alone will
  // not make one — fifteen gaussians over a band this size overlap into a pavement. So a few discs
  // are cleared: every card whose centre falls inside one is pushed out to its rim, which opens the
  // hole without moving anything else and without changing how many cards lie anywhere near it.
  // Seventy-eight cards are 2.31 m² on a cloth of 1.21, so an interior hole cannot be BARE — a card
  // reaches 131 mm from its own centre and the cards around a hole still lie over it — and these
  // read where they can read: as deep bays bitten out of the mass's outline.
  for (let v = 0; v < cfg.voids; v++) {
    const vx = cfg.ax * (rng() * 1.8 - 0.9), vz = cfg.cz + (rng() - 0.5) * 1.7 * cfg.az;
    const vr = 0.048 + rng() * 0.034;
    for (const p of list) {
      const d = Math.hypot(p.x - vx, (p.z - vz) * 1.15);
      if (d > vr || d < 1e-5) continue;
      const k = vr / d;
      p.x = vx + (p.x - vx) * k;
      p.z = vz + (p.z - vz) * k;
    }
  }
  // and the ranks settled once more, gently: the bays and the confining both shove cards sideways,
  // and a rank that no one could count is the one thing this band exists to avoid
  evenOut(list, cfg.even * 0.45);
  for (const p of list) confine(p, cfg, p.slack);
  // LEFT TO RIGHT IS THE INDEX. `i` is the card's rank across the picture, so entry i is the
  // (i+1)-th from the left and pickByOrdinal is a subscript. Height is a shuffle of its own.
  list.sort((a, b) => a.x - b.x);
  const rank = Array.from({ length: TOTAL }, (_, k) => k);
  for (let k = TOTAL - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [rank[k], rank[j]] = [rank[j], rank[k]];
  }
  return list.map((p, i) => ({ i, x: p.x, z: p.z, ang: p.ang, rank: rank[i] }));
}

// the box the mass occupies, corners and all, at rest and with one card lifted up the frame: what
// the camera composes its tabletop plates on (published as `reveal.tableBounds`)
function boundsOf(poses) {
  let x = 0, z0 = Infinity, z1 = -Infinity;
  for (const p of poses) {
    for (const c of cardCorners(p)) {
      x = Math.max(x, Math.abs(c[0]));
      z0 = Math.min(z0, c[1] - LIFT.z);
      z1 = Math.max(z1, c[1]);
    }
  }
  return { x, z0, z1, pts: [[-x, z0], [x, z0], [-x, z1], [x, z1]] };
}

// ONE BAND, HOWEVER MANY TIMES THIS FILE IS LOADED. The dev server hands the app its modules with a
// version query and a probe's own `import('/src/pieces/reveal-wash.js')` without one, so the two get
// SEPARATE instances of this module — and a probe measuring a band that is not the band on the cloth
// is worse than no probe at all (it is how round 12 nearly published a 54 mm hover: the tool was
// reading a second, differently-seeded scatter). The state therefore lives on the realm, once.
export const WASH = (globalThis.__tarotWash ??= (() => {
  const w = {
    card: CARD,
    total: TOTAL,
    lift: LIFT,
    deep: DEEP,
    // there are no bows any more, and anything that asks for them is told so rather than thrown at
    // (camera-shots.js falls straight through to `reveal.tableBounds`, which is the box below)
    tiers: [],
    shape: 'wide',
    seed: 0,
    poses: null,
    bounds: null,
  };
  w.poses = layout(BANDS.wide, 0);
  w.bounds = boundsOf(w.poses);
  return w;
})());

// THE WINDOW CHOOSES THE BAND, and the seed lays it. reveal-fan.js calls this at build and again
// whenever the window changes shape, before the camera re-solves its plates off `reveal.tableBounds`
// (the reveal piece is built first, so its resize listener runs first). Returns true when the band
// actually changed and the cards on the cloth have to be laid again.
export function bandFor(aspect, seed = 0) {
  const want = aspect < TALL_BELOW ? 'tall' : 'wide';
  if (want === WASH.shape && (seed | 0) === WASH.seed) return false;
  WASH.shape = want;
  WASH.seed = seed | 0;
  WASH.poses = layout(BANDS[want], seed);
  WASH.bounds = boundsOf(WASH.poses);
  return true;
}

// where card i lies, and how high it rides in the heap (0 = on the cloth, total−1 = on top)
export const poseOf = (i) => WASH.poses[i] ?? WASH.poses[0];
export const heightOf = (i) => (WASH.poses[i]?.rank ?? 0) / TOTAL;

const _pip = (q, px, pz) => {
  let s = false;
  for (let i = 0, k = q.length - 1; i < q.length; k = i++) if (q[i][1] > pz !== q[k][1] > pz && px < ((q[k][0] - q[i][0]) * (pz - q[i][1])) / (q[k][1] - q[i][1]) + q[i][0]) s = !s;
  return s;
};
const REACH = Math.hypot(CARD.h, CARD.w) / 2; // no card can cover a point further than this away

// THE POINTER, in cloth metres, to the card under it — and on a scatter this is the whole of the
// interaction. It is worked out the way the eye works it out: of the cards whose footprint covers
// the point, the one lying highest in the heap. It is done on the CLOSED mass, never on the one
// with a card standing out of it, so the mapping is a fixed function of where the finger is and
// cannot chase the animation it causes. Measured over the whole mass on a 2 mm grid by the round-8
// probe, tools/_rv8-point.mjs, which still runs: the poses here are the poses the cards are drawn
// at, with no jitter in between, so what stands up is what is drawn under the finger.
export function indexAt(x, z, has = () => true) {
  let best = null, bestRank = -Infinity;
  for (const p of WASH.poses) {
    if (p.rank <= bestRank) continue; // already covered by something higher: nothing to learn
    if (Math.hypot(p.x - x, p.z - z) > REACH) continue;
    if (!_pip(cardCorners(p), x, z)) continue;
    bestRank = p.rank;
    best = p.i;
  }
  if (best == null) {
    // off the cards altogether — in one of the mass's own gaps, or a centimetre past its edge: the
    // nearest card of all, so a finger that wanders never chooses nothing
    let bestD = Infinity;
    for (const p of WASH.poses) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) {
        bestD = d;
        best = p.i;
      }
    }
  }
  if (best == null || has(best)) return best;
  // the card there has been taken already: the nearest one still on the cloth
  const from = WASH.poses[best];
  let bestD = Infinity, out = null;
  for (const p of WASH.poses) {
    if (!has(p.i)) continue;
    const d = Math.hypot(p.x - from.x, p.z - from.z);
    if (d < bestD) {
      bestD = d;
      out = p.i;
    }
  }
  return out;
}

// is the point anywhere near the mass at all? (the pointer is ignored past this)
export function nearBand(x, z, pad = 0.05) {
  const b = WASH.bounds;
  return Math.abs(x) <= b.x + pad && z >= b.z0 - pad && z <= b.z1 + pad;
}
