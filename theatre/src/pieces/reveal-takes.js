// reveal-takes.js — the drawings of the deal and the turn, frame by frame, on twos.
//
// A "track" is an array of drawings, one per 12 fps frame; each drawing is a function that sets the
// whole pose of its card absolutely (so any frame can be shown on its own, and a hold is the same
// drawing repeated). Tracks are composed into one timeline with `compose`, which lets the three
// cards run their own tracks at their own offsets while every frame of the master stays a pure
// function of the frame index (deterministic under `?t=`).
import * as THREE from 'three';

export const FPS = 12;
const PI = Math.PI;
const rad = (deg) => (deg * PI) / 180;
const sin = (deg) => Math.sin(rad(deg));
const lerp = (a, b, u) => a + (b - a) * u;

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();

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
export function dealTrack(mesh, from, to, { cues = {}, faceUp = false, spin: spinAmt = null, apex = 0.07, bank = 0.17 } = {}) {
  const d = to.p.clone().sub(from.p);
  d.y = 0;
  const dist = d.length();
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
    const draw = !s || s.off ? () => hand.off() : () => hand.at(s.x, s.y ?? 0, s.z, { yaw: s.yaw ?? 0, pose: s.pose ?? 'splay', side: s.side ?? 'R' });
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
export function turnTrack(mesh, slot, landed, H, { cues = {}, hand = null, dx = 0.02, yaw = -0.3 } = {}) {
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
    at(1.2, slot.ry, cues.touch, 0.0008, 0.003), // the fingers land: a hair up, slid toward the visitor
    at(1.2, slot.ry, null, 0.0008, 0.003), // and hold
    at(28, slot.ry, cues.lift),
    at(64, slot.ry + 0.02),
    at(90, slot.ry + 0.03), // on edge: the face shown to the visitor
    at(90, slot.ry + 0.03), // held one frame
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
  // the fingers on the near edge, drawing it up; they let go at 90° and come back to the cloth
  const on = (phi) => {
    const e = turnEdge(phi, H);
    return { ...base, x: X, y: Math.min(e.y, 0.9 * hand.HAND.reach) + 0.002, z: slot.p.z + e.z };
  };
  const near = slot.p.z + H / 2;
  return compose([
    { offset: 0, frames: card },
    {
      offset: 0,
      frames: handFrames(hand, [
        { off: true }, // before this card's turn: another card's hand may be on the cloth
        { ...base, x: X, y: 0.06, z: near - 0.26 }, // in from the top of the frame
        { ...base, x: X, y: 0.02, z: near - 0.09 },
        on(1.2), // the fingers land on the near edge
        on(1.2), // and hold
        on(28),
        on(64),
        on(90),
        on(90),
        { ...base, x: X, y: 0.012, z: slot.p.z + 0.02 }, // let go
        { ...base, x: X + s * 0.01, y: 0.03, z: near - 0.14 }, // drawn back
        { ...base, x: X + s * 0.02, y: 0.06, z: near - 0.28 },
        { off: true },
      ]),
    },
  ]);
}
