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
// the table is only 0.19 m wide), so the spread is CONCENTRIC WITH THE TABLE: four nested bows of
// cards, each card turned to point out of the table's centre, so the composition curves the way
// the object it lies on curves.
//
// AND THE BOWS GET SHORTER AS THEY GO IN, because the slot row does: a bow may only run to the
// angle at which its own inner corner still clears that bar, which is solved here as a rectangle
// against a rectangle. The arithmetic hands us a stepped pediment — 27 · 23 · 17 · 11 — which is
// also the composition a film would build: a shell of cards opening around the three slots,
// symmetric about the frame's axis. Measured (tools/_rv7-geom.mjs): the furthest corner of the
// spread is 0.5695 from the table's centre, 50 mm inside the rim, and the nearest card clears a
// reading slot by 4.3 mm.
//
// FOUR bows and not two or six: the step between bows and the pitch along them trade against each
// other (the crescent's depth beyond one card's length is fixed at about 0.11 m), and a pointer
// wants the SMALLEST of the two to be as big as possible. Solved: 18.3 mm along a bow, 18.5 mm
// between them — a nearly square cell of cloth per card, 29 px at 1600 and 8 px on a phone. Which
// is why the pick does not depend on hitting one (see reveal-fan.js).

const CARD = { w: 0.13, h: 0.2275 };

// the row of reading slots, as the bar it is: nothing may enter this
const ROW = { x: 0.29, z: 0.256 };
const ROW_CLEAR = 0.004; // …plus four millimetres, for the jitter a hand puts in both

// r: the radius of the bow's card centres, from the TABLE's centre. phi: its half-angle, derived.
// n: how many cards it carries. Tier 0 is the outermost — nearest the visitor, laid last, on top.
const R0 = 0.452; // outer bow: its outer edge reaches 0.5665, which is 53 mm inside the rim
const STEP = 0.0185; // between bows: what each of the three inner bows shows of itself
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
// how far a bow may run: the row on the inside, the frame on the outside (|x| ≤ 0.425 keeps every
// corner inside a phone's 0.438), and the rim (every corner inside r = 0.60)
function reach(r) {
  let lo = 0, hi = 1.35;
  for (let i = 0; i < 44; i++) {
    const m = (lo + hi) / 2;
    const p = { x: r * Math.sin(m), z: r * Math.cos(m), ang: m };
    const cs = cardCorners(p);
    const ok = clearsRow(r, m) && cs.every((c) => Math.abs(c[0]) <= 0.425 && Math.hypot(c[0], c[1]) <= 0.60);
    if (ok) lo = m;
    else hi = m;
  }
  return lo;
}
// 78 cards shared between the bows in proportion to how much bow there is
function share(arcs) {
  const sum = arcs.reduce((a, b) => a + b, 0);
  const raw = arcs.map((L) => (TOTAL * L) / sum);
  const n = raw.map((v) => Math.max(6, Math.round(v)));
  let d = TOTAL - n.reduce((a, b) => a + b, 0);
  for (let i = 0; d !== 0; i = (i + 1) % n.length) {
    const j = d > 0 ? arcs.indexOf(Math.max(...arcs.map((L, k) => (k === i ? L : -1)))) : i;
    n[i] += Math.sign(d);
    d -= Math.sign(d);
  }
  return n;
}

export const SPREAD = {
  card: CARD,
  step: STEP,
  // the hover: the card under the pointer slides UP THE FRAME (the user's rule — never down) and
  // rides a hair over its neighbours so the whole of it is drawn. 30 mm is 24 px at 1600 and 13 px
  // on a phone, and the whole card it uncovers measures 213 x 367 px there and 60 x 103 on a phone
  // (tools/_rv7-pick.mjs, which drives a real pointer at both sizes).
  lift: { z: 0.030, y: 0.0055 },
  // and the two cards either side of it step apart along their bow, so a gap opens where it was.
  // Conservative: the push dies away by the sixth neighbour, so no bow ever grows at its ends.
  open: { amp: 0.013, fall: [0, 1, 0.6, 0.33, 0.15, 0.05] },
  tiers: (() => {
    const rs = [0, 1, 2, 3].map((k) => R0 - k * STEP);
    const phis = rs.map(reach);
    const ns = share(rs.map((r, k) => 2 * phis[k] * r));
    return rs.map((r, k) => ({ k, r, phi: phis[k], n: ns[k], pitch: ns[k] > 1 ? (2 * phis[k] * r) / (ns[k] - 1) : 0 }));
  })(),
  total: TOTAL,
};

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

// The pointer, in cloth metres, to the card under it. The bow is chosen by RADIUS (the outer and
// inner bows own everything beyond them, so only the two middle bands are narrow) and the card
// along it by ANGLE. Done on the closed spread, never on the opened one, so the mapping is a fixed
// function of where the finger is and cannot chase itself.
export function indexAt(x, z, has = () => true) {
  const r = Math.hypot(x, z), a = Math.atan2(x, z);
  let best = null, bestD = Infinity;
  let base = 0;
  for (const t of SPREAD.tiers) {
    // a bow only owns the angles it covers; past its end the bows outside it do
    const aa = Math.max(-t.phi, Math.min(t.phi, a));
    const j = t.n > 1 ? Math.round(((aa + t.phi) / (2 * t.phi)) * (t.n - 1)) : 0;
    const p = poseAt(t, j);
    // radius counts double: the bows are 24 mm apart and their cards 23.5 mm, so an even weighting
    // would let a finger a bow away win on angle alone
    const d = Math.hypot((r - t.r) * 1.0, (a - angleAt(t, j)) * t.r) + (Math.abs(a) > t.phi ? 0.05 : 0);
    if (d < bestD) {
      bestD = d;
      best = base + j;
    }
    base += t.n;
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
