// PIECE: sound (wood family) — see sound-core.js for the room and the primitives.
// Each voice: (ac, dest, t, { level, seed, rng, pan, gain }) => seconds. `level` is already
// LEVEL[name] * gain * TRIM[name]. Connect through place(ac, dest, { pan, room }) so it is in the room.
//
// Everything here is a struck or rubbed piece of wood, and some of it has a bit of brass or iron
// screwed to it. Wood is a few low modes that die fast, so every body below is three or four
// resonances and none of them rings past a fifth of a second; the metal on it (the clock's
// movement, the door's latch, the trapdoor's strap hinges) is the only thing allowed to ring.
// A struck thing is at level on its first sample; only the rubbed ones (creak, hinge, hatch) take
// a de-click ramp, because stick-slip has no instant at which it begins.
import { place, hiss, modal, resonate, grains, friction, mulberry32 } from './sound-core.js';

export const VOICES = {};
export const TRIM = {};
export const LENGTH = {};

// ---- local helpers ---------------------------------------------------------------------------------
// a contact: a few milliseconds of noise, the hard edge of anything meeting anything
function click(ac, dest, t, { level, freq = 3000, q = 0.9, dur = 0.004, hp = 0, seed = 1, kind = 'white' }) {
  const filters = [{ type: 'bandpass', freq, q }];
  if (hp) filters.unshift({ type: 'highpass', freq: hp, q: 0.7 });
  return hiss(ac, dest, { t, dur, level, kind, filters, seed });
}
// a body knocked: a short noise excitation through a bank of resonances (a board, a case, a floor).
// Noise through bandpasses rather than sines, because a knocked board is not a note: every strike
// excites its modes with a different phase and a different grain.
function knockBody(ac, dest, t, { level, body, dur = 0.012, lp = 1800, seed = 1, kind = 'pink' }) {
  const input = resonate(ac, dest, body);
  hiss(ac, input, { t, dur, level, kind, filters: [{ type: 'lowpass', freq: lp, q: 0.7 }], seed });
  return t + dur;
}
// A single mechanical impulse, for a thing that must answer the same way every time it is struck
// (the clock): the derivative of a gaussian, which is broadband and has no DC. `soft` (0.15 ms)
// peaks near 1 kHz, for a wooden body; `sharp` (0.034 ms) near 4.7 kHz, for a steel click.
const pulses = new WeakMap();
function pulse(ac, sharp) {
  let m = pulses.get(ac);
  if (!m) pulses.set(ac, (m = {}));
  const k = sharp ? 'sharp' : 'soft';
  if (m[k]) return m[k];
  // (both smooth over several samples, so a start between two sample frames, which the live graph
  // always has, interpolates them without changing their shape)
  const sr = ac.sampleRate, n = Math.ceil(sr * 0.002), s = (sharp ? 0.000034 : 0.00015) * sr, c = 4 * s + 1;
  const b = ac.createBuffer(1, n, sr);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (-(i - c) / s) * Math.exp(-0.5 * ((i - c) / s) ** 2);
  return (m[k] = b);
}
// that impulse into `to` (a body's input, or a filter chain) at `level`
function strike(ac, to, t, level, sharp = false) {
  const src = ac.createBufferSource();
  src.buffer = pulse(ac, sharp);
  const g = ac.createGain();
  g.gain.value = level;
  src.connect(g);
  g.connect(to);
  src.start(t);
}
function strikeBody(ac, dest, t, { level, body }) {
  strike(ac, resonate(ac, dest, body), t, level);
  return t;
}
// a steel click that is the same click every time: the sharp impulse through a bandpass
function tickClick(ac, dest, t, { level, freq, q = 0.8 }) {
  const b = ac.createBiquadFilter();
  b.type = 'bandpass';
  b.frequency.value = freq;
  b.Q.value = q;
  b.connect(dest);
  strike(ac, b, t, level, true);
}
// jitter a value by ±frac with the voice's own rng
const j = (rng, v, frac) => v * (1 + (rng() * 2 - 1) * frac);

// ---- the clock on the back wall ------------------------------------------------------------------
// A pendulum wall clock with an anchor escapement, three metres away on plaster. Each beat is the
// escape wheel's brass tooth dropping onto a steel pallet (a hard, bright contact that rings the
// movement's brass plates for a few tens of milliseconds) and, a few ms later, the tooth locking
// on the pallet face (a second, smaller click). Both are heard mostly through the case: a thin
// wooden box that turns every click into a short hollow knock. The entry and exit pallets are not
// the same piece of steel at the same angle, so the tock is the same event a little lower, a
// little duller and a hair later to lock. It runs all evening, so it is small and mostly room.
VOICES.clock = (ac, dest, t, { level, seed = 1, rng, pan = 0, tock = false }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.55 });
  const p = (tock ? 0.87 : 1) * j(r, 1, 0.004); // the brass
  const pc = (tock ? 0.92 : 1) * j(r, 1, 0.01); // the case
  const lv = level * (tock ? 0.9 : 1) * j(r, 1, 0.06);
  // An escapement is the most repeatable thing in the room: the same tooth, the same pallet, the
  // same box. So it is struck by an impulse and not by noise (noise would make every beat a
  // different loudness); what varies per beat is the few cents, the few percent and the fraction
  // of a millisecond that a real movement varies by.
  // the drop: steel on brass
  tickClick(ac, out, t, { level: lv * 0.55, freq: 4600 * p, q: 0.8 });
  // the movement's plates and wheel, inharmonic and brief
  modal(ac, out, {
    t,
    level: lv * 0.15,
    pitch: p,
    seed: seed * 5 + 2,
    modes: [
      [2870, 0.9, 0.05],
      [4130, 1, 0.042],
      [5390, 0.7, 0.034],
      [6980, 0.45, 0.026],
      [8650, 0.3, 0.02],
    ],
  });
  // the lock, a few ms after the drop
  tickClick(ac, out, t + (tock ? 0.0085 : 0.0065) + r() * 0.001, { level: lv * 0.28, freq: 3500 * p, q: 1.2 });
  // the case: a thin hollow box answering both
  strikeBody(ac, out, t, {
    level: lv * 1.5,
    body: [
      [330 * pc, 9, 1],
      [560 * pc, 11, 0.62],
      [940 * pc, 13, 0.4],
    ],
  });
  return LENGTH.clock;
};
TRIM.clock = 1.772;
LENGTH.clock = 0.06;

// ---- the chair under him ---------------------------------------------------------------------------
// Pepe's wooden chair when he shifts his weight. A chair creak is a joint (a tenon in a mortise,
// dried out) sticking and slipping under load: a pulse train at 40–120 slips a second, rising as
// the load comes on and slowing as it lets go, heard through the seat board and the rails. So it
// is two stick-slip runs through the same body — the weight going on, then the joint settling —
// and the tiny knock of the weight arriving in front of them.
VOICES.creak = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.18 });
  const s = j(r, 1, 0.08); // no two chairs, no two joints
  const body = [
    [j(r, 360, 0.08), 8, 1],
    [j(r, 710, 0.08), 11, 0.75],
    [j(r, 1220, 0.08), 14, 0.45],
    [j(r, 1980, 0.08), 16, 0.25],
  ];
  // the weight arriving on the seat
  knockBody(ac, out, t, { level: level * 0.35, dur: 0.008, lp: 1400, seed: seed * 3 + 1, body: [[body[0][0] * 0.5, 5, 1], [body[0][0], 8, 0.5]] });
  // the joint taking it: slips speeding up under load, then slowing
  const d1 = 0.2 + r() * 0.08;
  friction(ac, out, {
    t: t + 0.01,
    dur: d1,
    level: level * 0.8,
    rate: [[0, 42 * s], [0.35, (78 + r() * 25) * s], [0.75, (92 + r() * 20) * s], [1, 64 * s]],
    body,
    jitter: 0.1,
    grit: 0.18,
    attack: 0.01,
    seed: seed * 5 + 2,
  });
  // …and settling: fewer, slower slips, a little higher up the body
  const t2 = t + 0.01 + d1 * (0.7 + r() * 0.15);
  friction(ac, out, {
    t: t2,
    dur: 0.12 + r() * 0.05,
    level: level * (0.4 + r() * 0.2),
    rate: [[0, (70 + r() * 20) * s], [1, 38 * s]],
    body: body.map(([f, q, g]) => [f * 1.12, q, g]),
    jitter: 0.16,
    grit: 0.25,
    attack: 0.008,
    seed: seed * 7 + 3,
  });
  return LENGTH.creak;
};
TRIM.creak = 1.468;
LENGTH.creak = 0.44;

// ---- the door the film opens on ----------------------------------------------------------------
// It is a foot from the lens: the nearest, driest, loudest thing in the picture. A ledged pine
// door with a brass thumb latch and two iron butt hinges.

// the latch: the thumb presses the brass thumb-piece (a click and a short ring of the bar), and
// ~20 ms later the latch bar clears the keeper — a harder brass-on-iron snap that goes into the
// door, whose leaf answers low — and the bar chatters twice in the keeper as it comes to rest.
VOICES.latch = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.12 });
  const p = j(r, 1, 0.012);
  const brass = [
    [2240, 1, 0.09],
    [3650, 0.8, 0.07],
    [5180, 0.6, 0.055],
    [6720, 0.4, 0.04],
    [8930, 0.25, 0.03],
  ];
  // the thumb-piece
  click(ac, out, t, { level: level * 0.45, freq: 4200, q: 1, hp: 1800, dur: 0.003, seed: seed * 3 + 1 });
  modal(ac, out, { t, level: level * 0.1, pitch: p * 1.18, seed: seed * 5 + 2, modes: brass.slice(0, 4) });
  // the bar off the keeper
  const t2 = t + 0.017 + r() * 0.006;
  click(ac, out, t2, { level: level * 0.8, freq: 3200, q: 0.8, hp: 1200, dur: 0.004, seed: seed * 7 + 3 });
  modal(ac, out, { t: t2, level: level * 0.2, pitch: p, seed: seed * 11 + 4, modes: brass });
  knockBody(ac, out, t2, { level: level * 0.55, dur: 0.01, lp: 1200, seed: seed * 13 + 5, body: [[j(r, 190, 0.05), 5, 1], [j(r, 410, 0.05), 7, 0.55], [j(r, 760, 0.05), 9, 0.3]] });
  // the chatter
  const t3 = t2 + 0.022 + r() * 0.008;
  click(ac, out, t3, { level: level * 0.22, freq: 3800, q: 1.2, dur: 0.0025, seed: seed * 17 + 6 });
  click(ac, out, t3 + 0.011 + r() * 0.005, { level: level * 0.1, freq: 4100, q: 1.2, dur: 0.002, seed: seed * 19 + 7 });
  return LENGTH.latch;
};
TRIM.latch = 1.301;
LENGTH.latch = 0.1;

// the hinges: two dry iron butts under the weight of a leaf. A hinge squeak is stick-slip at a
// much higher rate than a chair's (the pin is small and hard), so it is heard as a PITCH — a
// squeal that wanders and chirps as the speed of the leaf changes — over a short low groan where
// the pin breaks loose, with the big board moving air under both.
VOICES.hinge = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.14 });
  // breaking loose: a short groan through the leaf
  friction(ac, out, {
    t,
    dur: 0.07 + r() * 0.03,
    level: level * 0.55,
    rate: [[0, 60 + r() * 15], [1, 120 + r() * 40]],
    body: [[j(r, 260, 0.06), 6, 1], [j(r, 540, 0.06), 8, 0.6], [j(r, 980, 0.06), 10, 0.35]],
    jitter: 0.12,
    grit: 0.2,
    attack: 0.006,
    seed: seed * 3 + 1,
  });
  // the squeal, in two chirps: the pin grabs and lets go as the leaf's speed changes, so a hinge
  // says "eee-eeh", each run on its own wandering contour and never the same twice
  const body = [[j(r, 820, 0.06), 10, 1], [j(r, 1640, 0.06), 12, 0.75], [j(r, 2750, 0.06), 14, 0.4]];
  const base = 300 + r() * 120;
  const d1 = 0.19 + r() * 0.05;
  const t1 = t + 0.045 + r() * 0.02;
  friction(ac, out, {
    t: t1,
    dur: d1,
    level,
    rate: [[0, base * 0.8], [0.3, base * (1.15 + r() * 0.3)], [0.7, base * (1.3 + r() * 0.4)], [1, base * (1.1 + r() * 0.2)]],
    body,
    jitter: 0.035,
    grit: 0.12,
    attack: 0.012,
    seed: seed * 5 + 2,
  });
  const t2 = t1 + d1 * 0.82;
  const b2 = base * (0.85 + r() * 0.5);
  friction(ac, out, {
    t: t2,
    dur: Math.min(0.14 + r() * 0.05, t + 0.4 - t2),
    level: level * (0.55 + r() * 0.3),
    rate: [[0, b2 * 1.2], [0.5, b2 * (0.95 + r() * 0.3)], [1, b2 * 0.75]],
    body,
    jitter: 0.05,
    grit: 0.1,
    attack: 0.01,
    seed: seed * 11 + 4,
  });
  // the leaf moving air
  hiss(ac, out, { t, dur: 0.34, level: level * 0.18, kind: 'brown', attack: 0.03, hold: 0.1, filters: [{ type: 'lowpass', freq: 180, q: 0.7 }], seed: seed * 7 + 3 });
  return LENGTH.hinge;
};
TRIM.hinge = 1.391;
LENGTH.hinge = 0.42;

// the leaf arriving against its stop: hard pine on pine, and a big thin panel ringing low behind
// it for a tenth of a second; the latch bar rattles in its staple from the jolt.
VOICES.knock = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.14 });
  const p = j(r, 1, 0.04);
  click(ac, out, t, { level: level * 0.9, freq: 2100, q: 0.8, dur: 0.006, seed: seed * 3 + 1 });
  knockBody(ac, out, t, {
    level,
    dur: 0.016,
    lp: 2600,
    seed: seed * 5 + 2,
    body: [
      [118 * p, 5, 1],
      [262 * p, 7, 0.8],
      [445 * p, 8, 0.7],
      [730 * p, 9, 0.55],
      [1180 * p, 10, 0.35],
    ],
  });
  modal(ac, out, {
    t,
    level: level * 0.4,
    pitch: p,
    bend: 0.02,
    seed: seed * 7 + 3,
    modes: [
      [104, 1, 0.2],
      [231, 0.55, 0.13],
      [398, 0.32, 0.08],
      [642, 0.18, 0.05],
    ],
  });
  // the latch rattling from the jolt
  const b = j(r, 1, 0.02);
  modal(ac, out, { t: t + 0.011 + r() * 0.004, level: level * 0.05, pitch: b, seed: seed * 11 + 4, modes: [[2650, 1, 0.05], [3980, 0.6, 0.04], [5720, 0.4, 0.03]] });
  click(ac, out, t + 0.028 + r() * 0.008, { level: level * 0.05, freq: 3700, q: 1.3, dur: 0.002, seed: seed * 13 + 5 });
  return LENGTH.knock;
};
TRIM.knock = 1.25;
LENGTH.knock = 0.16;

// ---- Peep the toad hitting the boards (egg-peep.js; walk-book.js borrows it for a board landing) --
// A hundred grams of hollow pressed plastic dropped a foot onto floorboards: a hard bright tick of
// the shell (plastic is stiff and damped, so its modes are high and gone in 20 ms), the cavity and
// the board under it answering in a short low knock, then the toad going over onto its side 50-odd
// ms later and rocking once.
VOICES.thud = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.24 });
  const p = j(r, 1, 0.05);
  const shell = [
    [1180, 1, 0.03],
    [1790, 0.7, 0.024],
    [2640, 0.45, 0.018],
  ];
  const board = [
    [j(r, 165, 0.05), 5, 1],
    [j(r, 340, 0.05), 7, 0.5],
    [1150 * p, 9, 0.35],
  ];
  click(ac, out, t, { level: level * 0.5, freq: 3000, q: 1, dur: 0.004, seed: seed * 3 + 1 });
  modal(ac, out, { t, level: level * 0.22, pitch: p, seed: seed * 5 + 2, modes: shell });
  knockBody(ac, out, t, { level, dur: 0.01, lp: 1500, seed: seed * 7 + 3, body: board });
  // over onto its side
  const t2 = t + 0.05 + r() * 0.012;
  click(ac, out, t2, { level: level * 0.2, freq: 2600, q: 1, dur: 0.003, seed: seed * 11 + 4 });
  modal(ac, out, { t: t2, level: level * 0.1, pitch: p * 1.13, seed: seed * 13 + 5, modes: shell });
  knockBody(ac, out, t2, { level: level * 0.4, dur: 0.008, lp: 1200, seed: seed * 17 + 6, body: board.slice(0, 2) });
  // one rock
  click(ac, out, t2 + 0.035 + r() * 0.01, { level: level * 0.08, freq: 2200, q: 1.2, dur: 0.003, seed: seed * 19 + 7 });
  return LENGTH.thud;
};
TRIM.thud = 2.166;
LENGTH.thud = 0.12;

// ---- the cross's top fixing lets go (egg-cross.js) --------------------------------------------------
// A 40 mm panel pin drawn out of forty-year-old lime plaster, three metres away. It is grit: lime
// crumbling off the shank in a short rising rip, a thin squeak of steel in the lath, and a tick of
// the head clearing the wood, with a couple of crumbs after it. It is over before the cross has
// moved its first drawing.
VOICES.nail = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = ac.createBiquadFilter();
  out.type = 'highpass';
  out.frequency.value = 800;
  out.Q.value = 0.7;
  out.connect(place(ac, dest, { pan, room: 0.4 }));
  const d = 0.06 + r() * 0.015;
  grains(ac, out, {
    t,
    dur: d,
    count: 11,
    level: level * 0.9,
    freq: [1300, 5200],
    q: [1.2, 3],
    len: [0.002, 0.008],
    shape: (u) => 0.4 + 0.6 * u,
    clump: 0.4,
    seed: seed * 3 + 1,
  });
  // steel dragging through the lath
  friction(ac, out, {
    t: t + 0.008,
    dur: d * 0.8,
    level: level * 0.3,
    rate: [[0, 480 + r() * 120], [1, 780 + r() * 200]],
    body: [[j(r, 2300, 0.06), 9, 1], [j(r, 3900, 0.06), 11, 0.5]],
    jitter: 0.08,
    grit: 0,
    attack: 0.005,
    seed: seed * 5 + 2,
  });
  // the head clears
  const t2 = t + d + 0.004;
  click(ac, out, t2, { level: level * 0.8, freq: 4600, q: 1.2, hp: 2500, dur: 0.003, seed: seed * 7 + 3 });
  modal(ac, out, { t: t2, level: level * 0.2, pitch: j(r, 1, 0.03), seed: seed * 11 + 4, modes: [[4150, 1, 0.045], [6320, 0.55, 0.032], [8870, 0.3, 0.022]] });
  // crumbs
  click(ac, out, t2 + 0.018 + r() * 0.01, { level: level * 0.14, freq: 3400, q: 1.5, dur: 0.002, seed: seed * 13 + 5 });
  click(ac, out, t2 + 0.036 + r() * 0.012, { level: level * 0.09, freq: 2900, q: 1.5, dur: 0.002, seed: seed * 17 + 6 });
  return LENGTH.nail;
};
TRIM.nail = 2.001;
LENGTH.nail = 0.14;

// …and the wood raps the plaster (egg-cross.js). A 230 mm lath swinging on one pin strikes the wall
// with its edge, then lands flat 26 ms later. The lath is small, so its own modes are high and
// short (a dry "tak"); the wall is lime on lath and absorbs, so under it there is only a dead low
// bump and nothing rings behind it.
VOICES.rap = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.4 });
  const p = j(r, 1, 0.05);
  const lath = [
    [720, 1, 0.05],
    [1980, 0.5, 0.034],
    [3850, 0.25, 0.02],
  ];
  // the edge
  click(ac, out, t, { level: level * 0.55, freq: 2800, q: 1, dur: 0.003, seed: seed * 3 + 1 });
  modal(ac, out, { t, level: level * 0.3, pitch: p, seed: seed * 5 + 2, modes: lath });
  knockBody(ac, out, t, { level: level * 0.7, dur: 0.014, lp: 700, kind: 'brown', seed: seed * 7 + 3, body: [[j(r, 240, 0.05), 3, 1], [j(r, 520, 0.05), 4, 0.4]] });
  // flat against the wall
  const t2 = t + 0.024 + r() * 0.006;
  click(ac, out, t2, { level: level * 0.3, freq: 2200, q: 1, dur: 0.004, seed: seed * 11 + 4 });
  modal(ac, out, { t: t2, level: level * 0.16, pitch: p * 0.94, seed: seed * 13 + 5, modes: lath.slice(0, 2) });
  knockBody(ac, out, t2, { level: level * 0.5, dur: 0.016, lp: 600, kind: 'brown', seed: seed * 17 + 6, body: [[j(r, 210, 0.05), 3, 1], [j(r, 470, 0.05), 4, 0.35]] });
  return LENGTH.rap;
};
TRIM.rap = 2.253;
LENGTH.rap = 0.16;

// ---- the boards come up (egg-cellar.js) ---------------------------------------------------------
// The first third of a 1.42 s lift: forty years of paint along three edges parting in a crackle,
// the lid freeing itself with a low pop of the board, then two 900 mm strap hinges taking the whole
// weight — a slow, heavy stick-slip groan through the lid and the joists, loudest in the middle —
// over a bed of air drawn up out of the hole. After that the lid is falling and silent.
VOICES.hatch = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.25 });
  // the paint seal
  grains(ac, out, {
    t,
    dur: 0.13,
    count: 12,
    level: level * 0.55,
    freq: [900, 4800],
    q: [1, 2.5],
    len: [0.002, 0.01],
    shape: (u) => 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.2)),
    clump: 0.35,
    seed: seed * 3 + 1,
  });
  // the lid lets go of its rebate
  const tp = t + 0.09 + r() * 0.03;
  knockBody(ac, out, tp, { level: level * 0.55, dur: 0.014, lp: 900, seed: seed * 5 + 2, body: [[j(r, 96, 0.05), 4, 1], [j(r, 215, 0.05), 6, 0.6], [j(r, 390, 0.05), 7, 0.35]] });
  // the strap hinges taking the weight: a heavy groan, loudest in the middle
  const tg = t + 0.07;
  const s = j(r, 1, 0.1);
  friction(ac, out, {
    t: tg,
    dur: 0.34,
    level,
    rate: [[0, 26 * s], [0.3, (52 + r() * 12) * s], [0.6, (66 + r() * 14) * s], [1, 40 * s]],
    body: [[j(r, 190, 0.05), 6, 1], [j(r, 380, 0.05), 9, 0.75], [j(r, 640, 0.05), 11, 0.5], [j(r, 1120, 0.05), 14, 0.3]],
    jitter: 0.14,
    grit: 0.22,
    attack: 0.06,
    seed: seed * 7 + 3,
  });
  // air drawn up out of the hole
  hiss(ac, out, { t, dur: 0.4, level: level * 0.22, kind: 'brown', attack: 0.04, hold: 0.14, filters: [{ type: 'lowpass', freq: 200, q: 0.7 }], seed: seed * 11 + 4 });
  return LENGTH.hatch;
};
TRIM.hatch = 1.181;
LENGTH.hatch = 0.42;

// …and the lid lands flat on the boards beyond the hole: 2 kg of board off 900 mm. The loudest
// event in the film. A hard slap along its edge, the air trapped under a flat board punched out in
// a low whump, the lid's own few modes, the floor and its joists answering at 57 Hz for a third of
// a second, the iron strap hinges clanking at the end of their travel, and the rebound coming back
// down 165 ms later (egg-cellar.js's own pose table read as a sound).
VOICES.lid = (ac, dest, t, { level, seed = 1, rng, pan = 0 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.25 });
  const p = j(r, 1, 0.04);
  const board = [
    [128 * p, 4, 1],
    [285 * p, 6, 0.85],
    [470 * p, 7, 0.7],
    [800 * p, 8, 0.5],
    [1260 * p, 9, 0.3],
  ];
  // the edge
  click(ac, out, t, { level: level * 0.9, freq: 1700, q: 0.7, dur: 0.008, seed: seed * 3 + 1 });
  // the whump of the flat board and its modes
  knockBody(ac, out, t, { level, dur: 0.03, lp: 2200, seed: seed * 5 + 2, body: board });
  modal(ac, out, {
    t,
    level: level * 0.35,
    pitch: p,
    bend: 0.025,
    seed: seed * 7 + 3,
    modes: [
      [142, 1, 0.14],
      [312, 0.5, 0.09],
      [524, 0.3, 0.06],
      [884, 0.18, 0.04],
    ],
  });
  // the floor under it
  modal(ac, out, { t, level: level * 0.5, bend: 0.03, seed: seed * 11 + 4, modes: [[j(r, 57, 0.04), 1, 0.3], [j(r, 93, 0.04), 0.45, 0.2]] });
  // the strap hinges at the end of their travel
  modal(ac, out, { t: t + 0.004 + r() * 0.004, level: level * 0.045, pitch: j(r, 1, 0.03), seed: seed * 13 + 5, modes: [[1320, 1, 0.07], [2110, 0.7, 0.055], [3470, 0.4, 0.04]] });
  // the rebound
  const t2 = t + 0.165;
  click(ac, out, t2, { level: level * 0.3, freq: 1600, q: 1, dur: 0.005, seed: seed * 17 + 6 });
  knockBody(ac, out, t2, { level: level * 0.5, dur: 0.018, lp: 1400, seed: seed * 19 + 7, body: board.slice(0, 3) });
  return LENGTH.lid;
};
TRIM.lid = 1.039;
LENGTH.lid = 0.34;

// ---- a hardback's board landing on the reading table (walk-book.js) --------------------------------
// Cloth-covered millboard slapping down onto the paper block and the wooden top under it. Cloth
// over card has no hard edge, so the contact is a soft papery slap and not a click; under it the
// tabletop gives a short woody knock, and the pages breathe out a brief puff of air. It fires twice
// in a reading: the cover swinging open (gain 0.42) and the book being shut (0.62). The shut is the
// heavier event — the whole block closing on itself pushes air out from between two hundred leaves
// — so the character follows the gain: the nearer it is to a shut, the lower the knock, the more
// of it and the longer and lower the puff. TRIM is taken at gain 1, i.e. as a shut.
VOICES.board = (ac, dest, t, { level, seed = 1, rng, pan = 0, gain = 1 }) => {
  const r = rng ?? mulberry32(seed);
  const out = place(ac, dest, { pan, room: 0.16 });
  const h = Math.max(0, Math.min(1, (gain - 0.42) / 0.2)); // 0 = the cover opening, 1 = the shut
  const p = j(r, 1, 0.04) * (1 - 0.12 * h); // a shut is the whole block landing: lower
  // the slap: cloth on paper, soft-edged, papery
  hiss(ac, out, { t, dur: 0.012 + r() * 0.004, level: level * 0.55, kind: 'white', filters: [{ type: 'bandpass', freq: j(r, 2100, 0.1), q: 0.7 }, { type: 'lowpass', freq: 5200, q: 0.7 }], seed: seed * 3 + 1 });
  // the table and the block under it
  knockBody(ac, out, t, {
    level: level * (0.7 + 0.3 * h),
    dur: 0.012,
    lp: 1300,
    seed: seed * 5 + 2,
    body: [
      [165 * p, 4, 1],
      [330 * p, 6, 0.65],
      [610 * p, 7, 0.35],
      [1040 * p, 8, 0.2],
    ],
  });
  // the puff: air out from between the leaves, falling as it empties
  const pd = 0.045 + 0.035 * h + r() * 0.01;
  hiss(ac, out, {
    t,
    dur: pd,
    level: level * (0.22 + 0.2 * h),
    kind: 'pink',
    attack: 0.004,
    filters: [{ type: 'bandpass', freq: 900 - 250 * h, to: 380 - 120 * h, q: 0.9 }],
    seed: seed * 7 + 3,
  });
  return LENGTH.board;
};
TRIM.board = 2.969;
LENGTH.board = 0.14;
