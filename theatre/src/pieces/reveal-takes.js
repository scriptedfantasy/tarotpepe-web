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
export function dealTrack(mesh, from, to, { cues = {}, faceUp = false } = {}) {
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
  const spin = to.ry + (dist > 0.4 ? 0.42 : 0.26) * (u.x < 0 ? 1 : -1); // the flick, more on a long throw
  const midRy = lerp(from.ry, spin, 0.55);
  return [
    at(0, 0, 0, from.ry), // on the deck
    at(0.05, 0.016, -0.12, from.ry + 0.04, cues.lift), // pinched: the hand's edge comes up first
    at(0.4, 0.07, 0.17, midRy), // apex, banked into the travel
    at(0.4, 0.07, 0.17, midRy), // the apex held one frame
    at(0.82, 0.028, 0.07, spin),
    at(1, 0.001, 0, to.ry + 0.05 * (u.x < 0 ? 1 : -1), cues.land), // lands a millimetre proud, over-spun
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

// slot: { p, ry } the dealt pose; landed: { p, ry } where it ends up face up (a hand moved it a mm).
export function turnTrack(mesh, slot, landed, H, { cues = {} } = {}) {
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
  return [
    at(0, slot.ry), // as dealt
    at(1.2, slot.ry, cues.touch, 0.0008, 0.003), // fingers under the near edge: a hair up, slid toward the visitor
    at(28, slot.ry, cues.lift),
    at(64, slot.ry + 0.02),
    at(90, slot.ry + 0.03), // on edge: the face shown to the visitor
    at(90, slot.ry + 0.03), // held one frame
    at(138, slot.ry + 0.02),
    at(176, landed.ry + 0.02, cues.land, 0.005), // the bounce: 5 mm up, almost flat
    settled,
  ];
}
