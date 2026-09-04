// reveal-takes.js — the drawings of the deal and the turn, frame by frame, on twos.
//
// A "track" is an array of drawings, one per 12 fps frame; each drawing is a function that sets the
// whole pose of its card absolutely (so any frame can be shown on its own, and a hold is the same
// drawing repeated). Tracks are composed into one timeline with `compose`, which lets the three
// cards run their own tracks at their own offsets while every frame of the master stays a pure
// function of the frame index (deterministic under `?t=`).
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';

export const FPS = 12;
const PI = Math.PI;
const rad = (deg) => (deg * PI) / 180;
const sin = (deg) => Math.sin(rad(deg));
const lerp = (a, b, u) => a + (b - a) * u;

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();

// ---- THE ROW ------------------------------------------------------------------------------------
// The layout's slots stand 36 cm apart: the three cards straddle 85 cm of a table 124 cm across,
// which is not a spread a hand lays, it is three cards abandoned in different parts of the county.
// It also empties the insert. That frame holds the card at 87 % of its height, so it is 46 cm wide
// on the cloth — and a neighbour 36 cm away has its near edge 6 cm OUTSIDE it. One card, alone, on
// bare paper.
//
// Pulled to 22.5 cm the row is what a hand lays, and the insert carries a slice of the card on
// either side of it, cut by the frame edge, the way the film's tabletop always carries its
// neighbours (fd-anim-kitchen-table-cards-hires: nothing on that table is ever alone in its frame).
//
// 22.5 is not a taste: it is the frame. An insert that holds the whole card in 16:9 cannot be
// narrower than 0.2023 m either side of it (the card's own height, 0.2275, at the 16:9 ratio), and
// wants ~0.225 with the card at 90 % of the frame's height. A neighbour at 22.5 cm therefore has
// its near edge 7.5 cm inside the frame and its far edge 9 cm outside it: half a card, cut by the
// edge. At 36 it was 6 cm outside the frame altogether; at 19 the whole of it was inside and the
// insert had stopped being an insert. In a portrait window the same row leaves the frame entirely,
// which is right — a phone gets the single card.
export const ROW_X = 0.225;
// Never wider than the row; if the layout ever comes in on its own, this follows it and does
// nothing. Reveal publishes the answer as `reveal.slots` so the camera can aim its inserts at the
// cards rather than at the layout's idea of where they would be.
export function stagedRow(layout) {
  return layout.spread.slots.map(([x, y, z]) => [Math.sign(x) * Math.min(Math.abs(x), ROW_X), y, z]);
}

// How far a card is turned as it is laid: a hand does not put a card down square, and at this
// spacing the little turn is what keeps the row from reading as a printed strip. Deterministic.
export const LAY_YAW = [0.075, -0.055, 0.098];

// Where card k lies once it is in the row: the slot, a couple of millimetres off, and turned.
// One function for every way a card gets there (dealt from his packet, carried out of the fan,
// posed for a judging state) so the row is the same row in all of them.
export function laidPose(slots, k, seed = 0) {
  const rng = mulberry32(1013 + seed + k * 7);
  const s = slots[Math.min(k, slots.length - 1)];
  return {
    x: s[0] + (rng() - 0.5) * 0.004,
    y: s[1],
    z: s[2] + (rng() - 0.5) * 0.004,
    ry: LAY_YAW[k % LAY_YAW.length] + (rng() - 0.5) * 0.018,
  };
}

// Which of his hands reaches a thing at x on the cloth: the near one, so no arm ever crosses the
// whole spread. One rule, used by every take and told to pepeAnim so his puppet body agrees with
// the drawing on the cloth (pepeAnim.deal(i, side) / turn(i, side)).
export const handSide = (x) => (x < -0.08 ? 'L' : 'R');

// Repeat the last drawing n more frames (a hold).
export function hold(frames, n) {
  const last = frames[frames.length - 1];
  for (let i = 0; i < n; i++) frames.push(last);
  return frames;
}

// tracks: [{ offset, frames }]. Returns the master frames; frame k draws every track at its own
// clamped frame, so a track holds its first drawing before it starts and its last after it ends.
export function compose(tracks) {
  const length = Math.max(1, ...tracks.map((t) => t.offset + t.frames.length));
  const frames = [];
  for (let k = 0; k < length; k++) {
    frames.push(() => {
      for (const t of tracks) {
        const j = Math.min(Math.max(k - t.offset, 0), t.frames.length - 1);
        t.frames[j]();
      }
    });
  }
  return frames;
}

// ---- the deal: one card from the top of the deck to its slot -----------------------------------
// from/to: { p: Vector3 (card centre), ry } — `from` on the deck, `to` the hand-laid slot pose.
// Four drawings of flight with the apex held one frame, a landing a millimetre proud, a settle.
// The card is flicked: it spins a little in the air, banks into its travel (leading edge up),
// lands a touch over-spun and squares itself as it settles.
// Options: spin — the over-spin of the flick in radians (default: more on a long throw); apex — the
// height of the flight (a card drawn from the fan to its slot is carried lower than one flicked
// from the deck); bank — how far it banks into its travel.
export function dealTrack(mesh, from, to, { cues = {}, faceUp = false, spin: spinAmt = null, apex: apexIn = null, bank = 0.17 } = {}) {
  const d = to.p.clone().sub(from.p);
  d.y = 0;
  const dist = d.length();
  // The apex now follows the throw. The deck moved upstage-right in round 5 and the far slot is a
  // metre away from it: a fixed 7 cm arc over that distance is a card skimming the cloth like a
  // stone, which is not how a card is dealt. A short carry keeps its old low arc.
  const apex = apexIn ?? 0.05 + 0.065 * Math.min(1, dist / 1.05);
  const u = d.normalize();
  const axis = new THREE.Vector3(-u.z, 0, u.x); // rotating about this by +a lifts the leading edge
  const base = faceUp ? 0 : PI;
  const at = (s, lift, bank, ry, cue) => () => {
    mesh.visible = true;
    mesh.position.copy(from.p).lerp(to.p, s);
    mesh.position.y = lerp(from.p.y, to.p.y, s) + lift;
    _e.set(base, ry, 0);
    _q.setFromEuler(_e);
    _q2.setFromAxisAngle(axis, bank);
    mesh.quaternion.copy(_q2.multiply(_q));
    cue?.();
  };
  const dir = u.x < 0 ? 1 : -1;
  const over = spinAmt ?? (dist > 0.4 ? 0.42 : 0.26); // the flick, more on a long throw
  const spin = to.ry + over * dir;
  const midRy = lerp(from.ry, spin, 0.55);
  const k = apex / 0.07;
  return [
    at(0, 0, 0, from.ry), // on the deck
    at(0.05, 0.016, -0.12 * k, from.ry + 0.04, cues.lift), // pinched: the hand's edge comes up first
    at(0.4, apex, bank, midRy), // apex, banked into the travel
    at(0.4, apex, bank, midRy), // the apex held one frame
    at(0.82, 0.4 * apex, 0.4 * bank, spin),
    at(1, 0.001, 0, to.ry + Math.min(0.05, over * 0.2) * dir, cues.land), // lands a millimetre proud, over-spun
    at(1, 0, 0, to.ry), // settles
  ];
}

// Where a card is during the turn, for a lift angle phi (0 = flat face down, 180 = flat face up).
// The card is lifted by the edge nearest the visitor and carried up and over; it stands on edge
// at 90° facing the visitor, then comes down and lands on its far edge. y and z are offsets from
// the slot centre. The pivot drifts upstage as the card stands and comes back as it lands, the
// way a hand carries it, so the card lands where it lay.
export function turnPose(phi, H) {
  const R = H / 2;
  const s = Math.abs(sin(phi));
  const y = R * s + 0.004 * Math.min(1, s * 4); // a hair of air under the low edge while it moves
  const dz = -0.036 * Math.sin(rad(Math.min(phi, 90))) * (phi <= 90 ? 1 : 1 - (phi - 90) / 90) - 0.0;
  return { rx: PI - rad(phi), y, dz };
}

// ---- the hand -----------------------------------------------------------------------------------
// A list of drawings for the hand alone (reveal-hand.js), so a hand track composes with a card
// track and the two stay in lockstep. Each spec is { n (a hold), x, y, z, yaw, pose } or null /
// { off: true } for the hand off the cloth. y is metres above the cloth.
export function handFrames(hand, specs) {
  const out = [];
  for (const s of specs) {
    const draw = !s || s.off ? () => hand.off() : () => hand.at(s.x, s.y ?? 0, s.z, { yaw: s.yaw ?? 0, pose: s.pose ?? 'splay', side: s.side ?? 'R', floor: s.floor ?? 0 });
    for (let i = 0; i < (s?.n ?? 1); i++) out.push(draw);
  }
  return out;
}

// Where the card's near edge — the one the fingers hold — is at lift angle phi. The card is face
// down, so the edge that rises is the one toward the visitor (+z); it swings up and over the far
// edge, which stays on the cloth. Offsets from the slot centre.
export function turnEdge(phi, H) {
  const p = rad(phi);
  const { dz } = turnPose(phi, H);
  return { y: H * Math.sin(p), z: dz + (H / 2) * Math.cos(p) };
}

// The turn, twelve drawings. His hand comes in from the top of the frame, two fingers land on the
// near edge of the card and HOLD, and only then does the card move; it goes flat — on edge — flat,
// the fingers riding the edge up, and lets go as it falls over. The card never moves on its own.
// hand: the reveal-hand api, or null (then the card turns alone, as before).
// dx / yaw: where on the near edge the fingers land, and how far his arm is turned across.
// dx / yaw: his fingers land on the OUTER corner of the near edge, not in the middle of it, and
// the hand is turned across so its arm runs up past the side of the card. Reaching for the middle
// of the near edge means reaching over the whole card, and a hand that lies over the card it is
// about to turn is a hand you cannot see: the card rears up in front of it and swallows it.
export function turnTrack(mesh, slot, landed, H, { cues = {}, hand = null, dx = 0.058, yaw = -0.46 } = {}) {
  const at = (phi, ry, cue, extraY = 0, extraZ = 0) => () => {
    const { rx, y, dz } = turnPose(phi, H);
    mesh.visible = true;
    mesh.position.set(slot.p.x, slot.p.y + y + extraY, slot.p.z + dz + extraZ);
    mesh.rotation.set(rx, ry, 0);
    cue?.();
  };
  const settled = () => {
    mesh.visible = true;
    mesh.position.copy(landed.p);
    mesh.rotation.set(0, landed.ry, 0);
  };
  const card = [
    at(0, slot.ry), // as dealt
    at(0, slot.ry), // still as dealt: the hand is on its way
    at(0, slot.ry),
    at(0, slot.ry, cues.touch, 0.0006, 0.003), // the fingertip lands on the near edge: a hair up, slid over
    // THE FIRST DRAWING OF THE TURN. The card does not rise off the cloth by itself: the near edge
    // rides up and upstage OVER the fingertip that landed under it, so the last few millimetres of
    // the finger go under the card and the rest of it stays in the picture. Everything after this
    // is that same edge climbing the same finger.
    at(12, slot.ry, cues.lift),
    at(34, slot.ry),
    at(62, slot.ry + 0.02),
    // On edge — but 78°, not 90°. Straight up, the card is a plane containing the lens axis of any
    // near-overhead frame and vanishes to a hairline in the very drawing the whole beat exists
    // for. Tipped twelve degrees back toward the visitor it still reads as a card stood on its
    // edge from a level lens and shows its face from a steep one.
    at(78, slot.ry + 0.03), // on edge: the face shown to the visitor
    at(78, slot.ry + 0.03), // held one frame
    at(138, slot.ry + 0.02),
    at(176, landed.ry + 0.02, cues.land, 0.005), // the bounce: 5 mm up, almost flat
    settled,
    settled,
  ];
  if (!hand) return card;
  // the hand nearest this card, so no arm crosses the whole cloth
  const side = handSide(slot.p.x);
  const s = side === 'L' ? -1 : 1;
  const X = slot.p.x + s * dx;
  const base = { yaw, side, pose: 'point' };
  // The fingers on the near edge, drawing it up. `tuck` is how far UPSTAGE of the edge the
  // fingertip sits — that is, how much of the fingertip the card overhangs. It is what makes the
  // turn read as a hand lifting a card rather than a card levitating next to a hand.
  // `ride` is how far up the edge the finger has come. It starts near nought: the finger slides
  // UNDER the near edge and stays on the cloth while the card tips over it, which is what puts the
  // last few millimetres of the fingertip behind the card instead of on top of it — a cut-out at
  // the edge's own height draws over the card and reads as a hand lying on it.
  const on = (phi, tuck = 0, ride = 1) => {
    const e = turnEdge(phi, H);
    return { ...base, x: X, y: Math.min(e.y * ride, 0.9 * hand.HAND.reach) + 0.002, z: slot.p.z + e.z - tuck };
  };
  // Past halfway the fingers leave the edge and go to the card's FOOT, where a hand steadying a
  // card that is standing up actually is. Riding the top edge to 78° floats the whole drawing
  // 15 cm above the cloth (the tilt is capped, so what cannot be got by tilting is got by rising),
  // and a cut-out hovering in mid-air beside a card, half of it behind the card, is the green
  // blade this piece spent round 4 getting rid of.
  const foot = (phi, out) => {
    const { dz } = turnPose(phi, H);
    return { ...base, x: X, y: 0.006, z: slot.p.z + dz + out };
  };
  const near = slot.p.z + H / 2;
  return compose([
    { offset: 0, frames: card },
    {
      offset: 0,
      frames: handFrames(hand, [
        { off: true }, // before this card's turn: another card's hand may be on the cloth
        { ...base, x: X, y: 0.055, z: near - 0.24 }, // in from the top of the frame
        { ...base, x: X, y: 0.018, z: near - 0.08 },
        on(0), // the fingertip lands on the near edge
        on(12, 0.009, 0.12), // and the edge comes up OVER it: the finger is still on the cloth
        on(34, 0.007, 0.42),
        foot(62, 0.034), // the fingers slide down to the foot of the card as it comes up
        foot(78, 0.026),
        foot(78, 0.026),
        { ...base, x: X, y: 0.010, z: slot.p.z + 0.02 }, // let go
        { ...base, x: X + s * 0.01, y: 0.028, z: near - 0.13 }, // drawn back
        { ...base, x: X + s * 0.02, y: 0.055, z: near - 0.26 },
        { off: true },
      ]),
    },
  ]);
}
