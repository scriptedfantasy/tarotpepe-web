// props-piano — A SPINET UNDER THE WINDOW, AND HIS HANDS ON IT.
//
// The user: "can we squeeze a piano between the fireplace and the wall under the window? i think
// it'd be funny if we see a piano from above and see pepe's hand play a song."
//
// ---- WHERE IT SQUEEZES, AND EVERY EDGE OF IT IS SOMEBODY ELSE'S -------------------------------
// The stage-left wall runs x −2.60 with its skirting and dado 36 mm proud of that. What is already
// on it, and what each of them leaves:
//   z  −0.60   THE CHIMNEY BREAST's upstage face (room.js: the breast stands z −0.60 .. 0.50 with
//              its face 240 mm proud at x −2.36). The piano stops at −0.72, which leaves 120 mm of
//              plaster between the two — a hand's width, and enough that the breast's own return
//              reads as a corner rather than as the end of the piano.
//   z  −2.34 .. −0.86   THE WIDE WINDOW, sill at y 1.04, its cap moulding ending at z −0.75. The
//              piano's top is at 0.98: SIXTY MILLIMETRES UNDER THE SILL, which is the whole of why
//              it is a spinet and not an upright. An upright is 1.20 to 1.32 tall and would stand
//              through the glass.
//   z  −2.20   THE TALL CASE's front boards. It stands x −2.10 .. −1.06 at z −2.46 .. −2.20, so the
//              corner of this wall is not free at all: the piano stops at −2.10, a hundred
//              millimetres downstage of the case, and its own depth (to x −2.14) stops 40 mm short
//              of the case's side.
//   x  −1.60   THE RUG's edge (props.js lays it 3.2 m wide about the room's axis). The stool stands
//              x −1.98 .. −1.66, which is 60 mm of bare board between its legs and the border.
//
// So the case is z −2.10 .. −0.72 — 1.38 m — by x −2.564 .. −2.144, 0.42 deep, 0.98 tall. The
// keyboard is 1.22 m of that (88 keys: 52 whites at 23.5 mm), inset 80 mm at each end for the
// cheeks, and it stands at 0.66, which is a spinet's height and a frog's.
//
// ---- AND IT IS SEEN FROM ABOVE --------------------------------------------------------------
// The walk piece has a fourth place (src/pieces/walk.js) and its shot is a steep one down onto the
// keys, because that is what the user asked to see and because it is the only angle from which 88
// keys are 88 keys rather than a grey band. camera-shots.js, `piano`.
//
// ---- HIS HANDS -------------------------------------------------------------------------------
// Two rigs out of src/pieces/reveal-hand.js — the same cut plates, the same thin-lined sleeve, the
// same drawing that comes over the cloth for the shuffle. Nothing is redrawn here. Three things are
// different and each of them is one option on `buildHand`:
//   THE SHOULDER. The cloth rig runs each sleeve back to the puppet's own wrist at the table. This
//     one runs them back to a point just off the bottom edge of the piano frame — where a player's
//     shoulders would be, on the stool — so the hands come INTO the picture from below and the
//     sleeves leave it, which is what the user asked for and what a rostrum camera over a keyboard
//     sees.
//   THE FLOOR. The cloth rig measures its heights from the cloth at 0.7625; this one from the white
//     keys at 0.66.
//   AND PEPE DOES NOT MOVE. The cloth rig lends itself the puppet's own hand on that side and takes
//     his drawn one off. Here `onShown` is given and does nothing: he sits at the table with both
//     hands on it while these play, which is the joke and is also the only way a frog reaches a
//     piano a metre and a half behind him.
import { buildHand, HAND } from './reveal-hand.js';
import { NOTES, BEAT, METRE, BARS, LOOP, freqOf, soundingAt } from './piano-song.js';

// ---- the joinery, in world metres ---------------------------------------------------------------
export const PIANO = {
  wall: -2.6,
  back: -2.564, // the case's back, a hair off the dado
  front: -2.144, // …and its front, where the keyslip starts
  keysOut: -1.994, // how far the white keys reach into the room
  z0: -2.1,
  z1: -0.72,
  top: 0.98, // 60 mm under the window's sill at 1.04
  keyY: 0.66, // the white keys' playing surface
  cheek: 0.08, // the block at each end of the keyboard
  whiteW: 0.0235,
  whiteL: 0.14,
  blackL: 0.089,
  blackH: 0.014,
  lowest: 21, // A0 — the 88 run 21..108
  highest: 108,
  stool: { x0: -1.98, x1: -1.66, z0: -1.66, z1: -1.16, seat: 0.52 },
};
// the keyboard's own span: the case less a cheek at each end
PIANO.kz0 = PIANO.z0 + PIANO.cheek;
PIANO.kz1 = PIANO.z1 - PIANO.cheek;

// WHICH KEYS ARE BLACK. The pattern repeats every octave and it is the only thing about a keyboard
// that cannot be got by dividing: C D E F G A B are white and the five between them are not.
const BLACK = new Set([1, 3, 6, 8, 10]);
const isBlack = (m) => BLACK.has(((m % 12) + 12) % 12);
// how many WHITE keys there are below m, counting from A0 — which is what places a key along the
// board, because the blacks sit between the whites and take none of the width.
function whiteIndex(m) {
  let n = 0;
  for (let k = PIANO.lowest; k < m; k++) if (!isBlack(k)) n++;
  return n;
}
const WHITES = whiteIndex(PIANO.highest + 1); // 52

// WHERE A KEY IS, along the board. THE BASS IS DOWNSTAGE. A player sits in front of this instrument
// facing the wall (−x); facing −x with the room's own up, their right hand points to −z. So their
// left — the bass — is +z, which is the end nearer the chimney. It is worth writing down because it
// is the opposite of the way a keyboard is drawn on paper and it decides which hand plays where.
export function keyZ(m) {
  const w = PIANO.kz1 - PIANO.kz0;
  const unit = w / WHITES;
  if (!isBlack(m)) return PIANO.kz1 - (whiteIndex(m) + 0.5) * unit;
  // a black key sits on the joint between the two whites it is between
  return PIANO.kz1 - whiteIndex(m) * unit;
}

export function buildPiano(ctx, { group, switches, O, M }) {
  const THREE = ctx.THREE;
  const P = PIANO;
  const root = new THREE.Group();
  root.name = 'piano';
  group.add(root);

  const box = (w, h, d, mat, x, y, z, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    if (name) m.name = name;
    root.add(m);
    return m;
  };
  const cx = (P.back + P.front) / 2, cw = P.front - P.back;
  const mz = (P.z0 + P.z1) / 2, mw = P.z1 - P.z0;

  // ---- 1. THE CASE. A plinth, the body, and a lid down over the strings ------------------------
  // The lid is DOWN and it stays down: the user asked to see the keys, and a raised lid on an
  // upright is a lid standing up through a window sill.
  // WHICH SURFACES ARE PAPER AND WHICH ARE INK, and it is a decision this shot forced. Every big
  // face of this instrument points UP at a lens two metres over it and away from the pendant, and
  // `M.wood` at that rake comes back as a solid mass of cross-hatch: the first cut of this piano was
  // a black slab with a keyboard laid on it. So the LID, the FALL and the DESK — the three planes
  // the shot actually sees — are the trim's bare paper, and the ink in the drawing is where the
  // round-1 critic asks every prop to put it: a plinth at the foot, the keyslip under the keys, and
  // the thirty-six black keys themselves.
  box(cw, 0.07, mw, M.solid, cx, 0.035, mz, 'piano-plinth'); // the one solid dark at the foot
  box(cw, P.top - 0.09, mw, M.paper, cx, (0.07 + P.top) / 2, mz, 'piano-case');
  box(cw + 0.03, 0.022, mw + 0.03, M.paper, cx, P.top - 0.011, mz, 'piano-lid');
  // the two end cheeks of the keyboard, standing proud of the case front
  for (const z of [P.z0 + P.cheek / 2, P.z1 - P.cheek / 2]) {
    box(P.keysOut - P.front + 0.02, 0.09, P.cheek, M.paper, (P.front + P.keysOut) / 2 + 0.01, P.keyY - 0.02, z, 'piano-cheek');
  }
  // the keyslip: the narrow board the keys lie on, and the fascia under it
  box(P.keysOut - P.front, 0.018, P.kz1 - P.kz0, M.paper, (P.front + P.keysOut) / 2, P.keyY - 0.009, (P.kz0 + P.kz1) / 2, 'piano-keybed');
  box(0.016, 0.05, P.kz1 - P.kz0, M.solid, P.keysOut - 0.008, P.keyY - 0.04, (P.kz0 + P.kz1) / 2, 'piano-keyslip');
  // THE FALL, standing open behind the keys: the hinged board that shuts over them, laid back
  // against the case, which is the one plane in this drawing that says the instrument is IN USE.
  const fall = box(0.026, 0.2, mw - 0.02, M.paper, P.front + 0.012, P.keyY + 0.12, mz, 'piano-fall');
  fall.rotation.z = -0.16;
  // the music desk over it, a plain board with a lip — and nothing standing on it
  box(0.02, 0.19, mw - 0.16, M.paper, P.front + 0.03, P.keyY + 0.3, mz, 'piano-desk');
  // the pedal lyre at the foot, two stalks and a rail
  for (const dz of [-0.05, 0.05]) box(0.012, 0.2, 0.012, M.solid, P.front - 0.05, 0.16, mz + dz, 'piano-lyre');
  box(0.05, 0.012, 0.16, M.solid, P.front - 0.05, 0.062, mz, 'piano-pedals');

  // ---- 2. THE EIGHTY-EIGHT ----------------------------------------------------------------------
  // Every key is its own mesh, because every key has to be able to go down on its own. 88 boxes is
  // nothing beside the 33 spines in the tall case, and the room's props are not merged (room.js
  // merges the SET; this is furniture).
  const keys = new Map();
  const unit = (P.kz1 - P.kz0) / WHITES;
  for (let m = P.lowest; m <= P.highest; m++) {
    const black = isBlack(m);
    const z = keyZ(m);
    const w = black ? P.blackL : P.whiteL;
    const x = black ? P.front + 0.012 + w / 2 : P.front + 0.005 + w / 2;
    const y = black ? P.keyY + P.blackH / 2 + 0.011 : P.keyY;
    const k = box(w, black ? P.blackH : 0.022, black ? unit * 0.58 : unit * 0.86, black ? M.solid : M.pages, x, y, z, `piano-key-${m}`);
    k.userData.rest = y;
    k.userData.black = black;
    keys.set(m, k);
  }
  // …and a thin dark line down the back of the whites, which is what reads as the gaps between them
  box(0.01, 0.024, P.kz1 - P.kz0, M.solid, P.front + 0.006, P.keyY + 0.001, (P.kz0 + P.kz1) / 2, 'piano-keyback');

  // ---- 3. THE STOOL -----------------------------------------------------------------------------
  const S = P.stool;
  const sx = (S.x0 + S.x1) / 2, sz = (S.z0 + S.z1) / 2;
  box(S.x1 - S.x0, 0.03, S.z1 - S.z0, M.paper, sx, S.seat - 0.015, sz, 'piano-stool');
  box(S.x1 - S.x0 - 0.05, 0.035, S.z1 - S.z0 - 0.05, M.solid, sx, S.seat - 0.05, sz, 'piano-stool-rail');
  for (const ox of [-1, 1]) for (const oz of [-1, 1]) {
    const lx = sx + ox * (S.x1 - S.x0) * 0.42, lz = sz + oz * (S.z1 - S.z0) * 0.42;
    root.add(O.rod([lx, S.seat - 0.05, lz], [lx + ox * 0.02, 0, lz + oz * 0.02], 0.014, M.solid));
  }

  // ---- 4. HIS HANDS -----------------------------------------------------------------------------
  // The shoulders: just off the bottom edge of the piano frame, at the height a player's would be
  // over this stool, one either side of the keyboard's middle. `L` is the bass hand and stands
  // downstage of `R`, because the bass is downstage (see keyZ, above).
  // WHERE THEY COME FROM, and it is worked out from the FRAME and not from anatomy. The piano shot
  // looks down at 46 degrees from (−0.73, 2.29), so the frame's own «up» is the world vector
  // (−0.72, +0.69, 0) — away from the room and upward — and its DOWN is (+0.72, −0.69): toward the
  // room and toward the floor. A sleeve that is to leave by the bottom edge has to run that way, so
  // each shoulder is set at a LARGER x and a LOWER y than the keys it serves: 0.68 m of forearm out
  // to (−1.45, 0.42), which is where a player's elbows would be over this stool.
  // (The first cut put them at (−1.72, 1.00), level with the keyboard and only 0.42 m out. The arm
  // rig bows an elbow out of the straight line, and over that distance the bow was the whole sleeve:
  // two white loops curling back INTO the picture. Measured by looking at it.)
  const SHOULDER = { L: [-1.45, 0.42, mz + 0.3], R: [-1.45, 0.42, mz - 0.3] };
  // TWO RIGS, one locked to each side, because the two hands are on the keyboard at the same time
  // and a single rig holds one `want`. This is the arrangement `buildHands` makes over the cloth
  // for the smoosh, made here without the part of it that borrows the puppet's own hands.
  const hands = {
    L: buildHand(ctx, { name: 'piano-hand-L', lockSide: 'L', onShown: () => {}, anchors: SHOULDER, floorY: P.keyY }),
    R: buildHand(ctx, { name: 'piano-hand-R', lockSide: 'R', onShown: () => {}, anchors: SHOULDER, floorY: P.keyY }),
  };

  // ---- 5. THE SONG ------------------------------------------------------------------------------
  // It runs on the TWELVES like everything else drawn in this room, and on the AUDIO CLOCK for the
  // notes, because those are the two clocks that exist here and a note laid on a browser's frame
  // timer arrives late. `beat` is where the drawing is; the sound for a bar is scheduled a bar
  // ahead of it and never twice.
  let playing = false;
  let startFrame = 0;
  let scheduledTo = -1; // the last beat the audio has been given
  let pressed = new Map(); // m → the drawing it was struck on
  const struck = []; // every note this playing has actually put a key down for (the proof counts it)

  let heldBeat = null; // a still: the song stopped on one beat of it and staying there
  const beatNow = () => (heldBeat != null ? heldBeat : ((ctx.clock.frame - startFrame) / (ctx.clock.fps || 12) / BEAT) % (BARS * METRE));
  const laps = () => Math.floor((ctx.clock.frame - startFrame) / (ctx.clock.fps || 12) / BEAT / (BARS * METRE));

  function allKeysUp() {
    for (const k of keys.values()) {
      k.position.y = k.userData.rest;
      k.rotation.z = 0;
    }
    pressed.clear();
  }

  function start() {
    if (playing) return false;
    playing = true;
    heldBeat = null;
    startFrame = ctx.clock.frame;
    scheduledTo = -1;
    struck.length = 0;
    ctx.emit?.('piano', { playing: true });
    return true;
  }
  function stop() {
    if (!playing) return false;
    playing = false;
    heldBeat = null;
    allKeysUp();
    hands.L.clear();
    hands.R.clear();
    ctx.emit?.('piano', { playing: false });
    return true;
  }

  // ---- 6. THE SWITCHES --------------------------------------------------------------------------
  // TWO THINGS ON ONE OBJECT, the fireplace's own arrangement: the CASE walks the visitor to the
  // piano (walk.js registers that one, because a place is the walk piece's business) and the KEYS
  // start and stop the song. The keys' box is subtracted from the case's there, so the two can
  // never both answer a point.
  function keysBox() {
    if (!ctx.camera) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const v = new THREE.Vector3();
    const xs = [], ys = [];
    ctx.camera.updateMatrixWorld();
    for (const x of [P.front, P.keysOut]) for (const y of [P.keyY - 0.02, P.keyY + 0.03]) for (const z of [P.kz0, P.kz1]) {
      v.set(x, y, z).applyMatrix4(ctx.camera.matrixWorldInverse);
      if (v.z > -ctx.camera.near) return null;
      v.set(x, y, z).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  function keysTap() {
    const b = keysBox();
    if (!b) return null;
    const w = Math.max(b.w, 44), h = Math.max(b.h, 44);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  const atPiano = () => ctx.pieces?.walk?.at === 'piano';
  switches?.add?.({
    name: 'piano-keys',
    object: () => root,
    tapBox: keysTap,
    // the keys answer ONLY from the piano's own shot. From the chair they are 40 px of grey under a
    // window across the room, and a song started from over there is a song nobody can see played.
    hit: (px, py) => {
      const b = keysTap();
      return !!b && atPiano() && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
    },
    enabled: () => atPiano(),
    onDown: () => (playing ? stop() : start()),
  });

  const api = {
    group: root,
    box: { x0: P.back, x1: P.keysOut, y0: 0, y1: P.top, z0: P.z0, z1: P.z1 },
    keyboard: { z0: P.kz0, z1: P.kz1, y: P.keyY, keys: keys.size, whites: WHITES },
    song: { bars: BARS, metre: METRE, beat: BEAT, seconds: LOOP, notes: NOTES.length },
    keyZ,
    keysBox,
    tapBox: keysTap,
    get playing() {
      return playing;
    },
    get beat() {
      return playing ? beatNow() : 0;
    },
    // which keys are DOWN in this drawing, as MIDI numbers — what a proof counts against the notes
    get down() {
      return [...pressed.keys()].sort((a, b) => a - b);
    },
    get struck() {
      return struck.slice();
    },
    get hands() {
      return { L: { shown: hands.L.shown, out: hands.L.out }, R: { shown: hands.R.shown, out: hands.R.out }, shown: hands.L.shown || hands.R.shown };
    },
    start,
    stop,
    toggle: () => (playing ? stop() : start()),
    // for a still: the song held at a beat, with the keys down and the hands on them and no sound
    // A STILL IS ONE BEAT, HELD. Not the song started a few seconds ago — the clock goes on running
    // under a screenshot and the piece would be four bars further along by the time the shutter
    // opened, which is how the first cut of this came out with both hands playing in bar 3, where
    // the right hand has not entered yet. `heldBeat` stops the counter dead and `scheduledTo` past
    // the end of time stops the audio: a still makes no sound and does not move.
    hold(b = 14) {
      playing = true;
      heldBeat = ((b % (BARS * METRE)) + BARS * METRE) % (BARS * METRE);
      scheduledTo = 1e9;
      api.update(ctx);
      return heldBeat;
    },
    setState(name = 'default') {
      if (name === 'piano-playing') api.hold(14.5); // bar 5, where both hands are on the keys
      else stop();
    },
    update(c) {
      if (!playing) return;
      // WALKING AWAY STOPS IT. The keys are only a switch from the piano's own shot, so a visitor
      // who has left has no way to stop the song from wherever they went — and a piano playing
      // itself in an empty corner is a different film. A still holds (`heldBeat`), because a
      // judging state is nobody standing anywhere.
      if (heldBeat == null && ctx.pieces?.walk?.at !== 'piano') {
        stop();
        return;
      }
      if (!c.clock.stepped) return;
      const b = beatNow();
      // ---- the keys, and the hands on them --------------------------------------------------
      const now = soundingAt(b);
      const want = new Set([...now.L, ...now.R]);
      for (const m of want) if (!pressed.has(m)) {
        pressed.set(m, c.clock.frame);
        struck.push({ m, beat: +b.toFixed(3) });
      }
      for (const m of [...pressed.keys()]) if (!want.has(m)) pressed.delete(m);
      for (const [m, k] of keys) {
        const dn = pressed.has(m);
        // A KEY GOES DOWN BY 8 MM AT THE FRONT, which is a piano's own dip, and it goes down on the
        // drawing it sounds on. There is no travel and no tween: a key is up or it is down, which
        // is the rule every other moving thing in this film is drawn to.
        // A KEY DIPS AT THE FRONT. The lever's own pivot is at its back end under the fall, so the
        // drawing is a translation of 6 mm and a tilt of 3.2 degrees about the room's z, which puts
        // the front edge 12 mm down and the back edge where it was. At the piano shot that is 9 px
        // of white key moving, which is what makes a struck note legible at all.
        k.position.y = k.userData.rest - (dn ? 0.006 : 0);
        k.rotation.z = dn ? -0.056 : 0;
      }
      // THE HANDS. Each takes the MIDDLE of what its own side is holding — a hand covers a chord,
      // it does not stand on one note of it — and if that side is silent it stays where it was, so
      // the left hand does not jump off the keyboard between the bass and the chord.
      for (const side of ['L', 'R']) {
        const ms = side === 'L' ? now.L : now.R;
        if (ms.length) {
          const z = ms.reduce((acc, m) => acc + keyZ(m), 0) / ms.length;
          const black = ms.some((m) => isBlack(m));
          hands[side].at(P.front + (black ? 0.055 : 0.085), 0.012, z, { side, pose: ms.length > 1 ? 'splay' : 'point', by: 'tip' });
        }
        hands[side].step();
      }
      // ---- the sound, laid a bar ahead on the audio clock ------------------------------------
      const S2 = ctx.pieces?.sound;
      if (!S2?.key || scheduledTo > 1e8) return;
      const ahead = b + METRE; // one bar of lookahead
      const from = scheduledTo < 0 ? b - 0.001 : scheduledTo;
      const lap = laps();
      for (const n of NOTES) {
        const at = n.at;
        const due = at >= from && at < ahead;
        const wrapped = ahead > BARS * METRE && at < ahead - BARS * METRE && at >= 0 && from > at;
        if (!due && !wrapped) continue;
        const when = ((wrapped ? at + BARS * METRE : at) - b) * BEAT;
        if (when < -0.05) continue;
        S2.key(n.m, { at: Math.max(0, when), dur: n.len * BEAT * 0.92, level: n.hand === 'L' ? 0.5 : 0.8 });
      }
      scheduledTo = Math.min(ahead, BARS * METRE);
      if (ahead >= BARS * METRE) scheduledTo = -1; // the round has come back to the top
      void lap;
      void HAND;
      void freqOf;
    },
  };
  // ?piano=<beat> holds the song at that beat for a still — the keys down, his hands on them and no
  // sound at all. Parked and spent on the first update, for main.js's own reason: it cuts the camera
  // after every piece is built and a cut clears the room.
  const asked = ctx.params?.get?.('piano');
  if (asked != null && asked !== '' && Number.isFinite(+asked)) {
    let spent = false;
    const real = api.update;
    api.update = (c) => {
      if (!spent) {
        spent = true;
        api.hold(+asked);
      }
      real(c);
    };
  }
  return api;
}
