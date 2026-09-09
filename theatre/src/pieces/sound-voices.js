// PIECE: sound (the voices) — every noise the parlour makes, built from noise bursts and struck
// tones. Nothing here is a file and nothing here is a beep: a card is paper on cloth, the clock is
// a dry escapement, the title figure is two struck notes.
//
// Every voice is scheduled onto an AudioContext-like at an absolute time, so the same code runs on
// the live context and on the OfflineAudioContext that tools/_sound-probe.mjs measures.
//
// The one rule the pictures keep, kept here: nothing fades in. A voice is at its level on its first
// sample and decays or is cut. No swells, no crossfades, no compressor pumping.
import { mulberry32 } from '../core/rng.js';

// ---- the noise the whole world is made of --------------------------------------------------------
const NOISE_S = 2;
const cache = new WeakMap();
export function noiseBuffer(ac) {
  let b = cache.get(ac);
  if (b && b.sampleRate === ac.sampleRate) return b;
  const n = Math.floor(ac.sampleRate * NOISE_S);
  b = ac.createBuffer(1, n, ac.sampleRate);
  const d = b.getChannelData(0);
  const rng = mulberry32(20250904);
  for (let i = 0; i < n; i++) d[i] = rng() * 2 - 1;
  cache.set(ac, b);
  return b;
}

// ---- peak levels, at the master input. The whole balance of the piece lives in this table. -------
// room tone is a tenth of the quietest cue; the clock sits under every card.
export const LEVEL = {
  room: 0.009,
  clock: 0.034,
  cut: 0.022,
  snap: 0.1,
  deal: 0.052,
  settle: 0.115,
  pick: 0.062,
  flip: 0.085,
  riffle: 0.135,
  tap: 0.108,
  // the smoosh (reveal round 11 asked for these and had been falling back on riffle/deal/tap).
  // A wash is not a riffle: it is long, dry, soft-topped and it has no snap anywhere in it, so it
  // sits well under the riffle it replaced.
  wash: 0.072,
  smoosh: 0.04,
  rake: 0.078,
  square: 0.058,
  title: 0.088,
  closing: 0.088,
  creak: 0.045,
  street: 0.024,
  type: 0.02,
  // the radio's knob, between two stations. Under the escapement's own level: the visitor has just
  // touched something and must hear that they did, and nothing more than that.
  static: 0.03,
  // the cat lamp's tumbler, thrown. The same job as the static and the same manners: under the
  // clock, over the room tone, and gone before anyone can consider it.
  switch: 0.028,
  // the door, which is nearer the lens than anything else in the film and louder for it
  latch: 0.072,
  hinge: 0.058,
  knock: 0.122,
  footfall: 0.05,
};

// A filter eats most of a noise burst, and how much depends on its Q, so LEVEL above is a wish and
// this is what it takes to get it. Measured, not guessed: `node tools/_sound-probe.mjs` renders every
// cue and prints the trims that make the rendered peak match LEVEL. Paste them back here.
export const TRIM = {
  room: 1.62,
  clock: 1.854,
  cut: 2.983,
  snap: 1.493,
  deal: 2.236,
  settle: 1.691,
  pick: 1.838,
  flip: 1.752,
  riffle: 3.07,
  tap: 1.897,
  wash: 0.683,
  smoosh: 0.86,
  rake: 1.258,
  square: 1.461,
  title: 0.748,
  closing: 0.748,
  creak: 24.194,
  street: 1.3,
  type: 4.621,
  static: 1.697,
  // measured with tools/_props-r9-switch.mjs, which reproduces the probe's own figures for static,
  // latch and clock to the third decimal before it reports this one
  switch: 2.645,
  latch: 2.241,
  hinge: 29.544,
  knock: 1.569,
  footfall: 1.599,
};

// how long each cue is allowed to be, in seconds; the probe asserts the rendered length against it
export const LENGTH = {
  cut: 0.03,
  snap: 0.13,
  deal: 0.11,
  settle: 0.15,
  pick: 0.15,
  flip: 0.09,
  riffle: 0.47,
  tap: 0.12,
  wash: 0.98,
  // 0.66, and the number is not a taste. reveal-shuffle.js fires this every FIFTH drawing of the
  // 24-drawing swirl, and the take runs at 12 fps: that is one push every 5/12 = 0.417 s. A cue
  // shorter than the gap leaves bare room tone between the pushes and the swirl reads as five
  // separate shoves instead of one continuous movement of paper — which is the whole difference
  // between a wash and five deals. Each push now runs a quarter of a second into the next one.
  // Change the cadence in reveal-shuffle and this number changes with it.
  smoosh: 0.66,
  rake: 0.74,
  square: 0.19,
  title: 1.5,
  closing: 1.5,
  creak: 0.44,
  street: 0.62,
  type: 0.03,
  static: 0.3,
  switch: 0.05,
  clock: 0.055,
  latch: 0.06,
  hinge: 0.42,
  knock: 0.14,
  footfall: 0.17,
};

// ---- the two primitives --------------------------------------------------------------------------
function out(ac, dest, pan) {
  if (!pan || !ac.createStereoPanner) return dest;
  const p = ac.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(dest);
  return p;
}

// a decaying envelope: full level on the first sample, then down. `hold` keeps it flat first.
//
// `attack` is the one exception to "nothing fades in", and it exists for exactly one family of
// sounds: a flat palm pushing a heap of cards around. A card that is STRUCK — dealt, landed,
// tapped, knocked — has a transient on its first sample and keeps it. A card that is SLITHERING
// under a hand does not: there is no moment at which the slither begins, and a 30 ms ramp is what
// makes a wash read as a wash instead of as a burst of noise. It is a de-click, not a swell.
//
// AND IT STARTS AT ZERO, NOT AT ONE. A GainNode's value before its first scheduled event is its
// default, which is 1. `setValueAtTime(v, t)` takes effect on the first sample frame at or after t;
// `start(t)` begins inside the frame that CONTAINS t. When those two round the other way — which
// happens for some fractions of a frame and not others, and every cue in the live graph is fired at
// `currentTime + 0.005 + ahead`, a fraction of a frame every time — the source's first sample goes
// out at unity. One sample of raw noise at full scale, i.e. a click, on a cue whose whole level is
// 0.02. Zeroing the param first removes the window entirely. It changes nothing about a cue
// rendered on a whole frame, which is why every trim in the table above still stands.
function decay(g, t, dur, level, hold = 0, attack = 0) {
  const floor = Math.max(1e-5, level * 0.0008);
  g.gain.value = 0;
  const a = Math.max(0, Math.min(attack, dur * 0.6));
  if (a > 0) {
    g.gain.setValueAtTime(floor, t);
    g.gain.linearRampToValueAtTime(level, t + a);
  } else g.gain.setValueAtTime(level, t);
  if (hold > 0) g.gain.setValueAtTime(level, t + a + hold);
  g.gain.exponentialRampToValueAtTime(floor, t + dur);
  g.gain.setValueAtTime(0, t + dur + 0.002);
}

// a filtered burst of noise: the whole paper vocabulary is this with different numbers
function burst(ac, dest, { t, dur, level, freq, q = 1, type = 'bandpass', sweep = 0, hold = 0, attack = 0, pan = 0, seed = 1 }) {
  const rng = mulberry32(seed);
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.linearRampToValueAtTime(Math.max(40, freq + sweep), t + dur);
  const g = ac.createGain();
  decay(g, t, dur, level, hold, attack);
  src.connect(f);
  f.connect(g);
  g.connect(out(ac, dest, pan));
  src.start(t, rng() * (NOISE_S - dur - 0.05));
  src.stop(t + dur + 0.01);
  return t + dur;
}

// a struck tone: a fundamental with a couple of partials, no vibrato, no glide
function struck(ac, dest, { t, dur, level, freq, type = 'sine', partials = [], pan = 0 }) {
  const g = ac.createGain();
  decay(g, t, dur, level);
  g.connect(out(ac, dest, pan));
  const one = (f, amp, ty, d) => {
    const o = ac.createOscillator();
    o.type = ty;
    o.frequency.setValueAtTime(f, t);
    const og = ac.createGain();
    og.gain.value = 0; // see decay(): a gain node's default is 1, and one sample of it is a click
    og.gain.setValueAtTime(amp, t);
    if (d < dur) og.gain.exponentialRampToValueAtTime(Math.max(1e-5, amp * 0.001), t + d);
    o.connect(og);
    og.connect(g);
    o.start(t);
    o.stop(t + dur + 0.01);
  };
  one(freq, 1, type, dur);
  for (const [ratio, amp, d] of partials) one(freq * ratio, amp, 'sine', (d ?? 0.5) * dur);
  return t + dur;
}

// ---- the clock on the back wall -------------------------------------------------------------------
// A dry escapement: a hard little noise click with a short wooden body under it. The tock is a
// tone lower than the tick, as a real one is; both are over in 40 ms.
export function tick(ac, dest, t, { level = LEVEL.clock, pan = 0, tock = false, seed = 1 } = {}) {
  const b = tock ? 0.86 : 1;
  const lv = level * TRIM.clock;
  burst(ac, dest, { t, dur: 0.012, level: lv, freq: 2350 * b, q: 1.1, pan, seed });
  burst(ac, dest, { t: t + 0.001, dur: 0.03, level: lv * 0.5, freq: 720 * b, q: 2.4, pan, seed: seed + 1 });
  struck(ac, dest, { t, dur: 0.035, level: lv * 0.34, freq: 1180 * b, type: 'triangle', pan });
  return 0.05;
}

// ---- the room itself ------------------------------------------------------------------------------
// Band-limited noise, cut in at level and left there, with two slow drifts on it: the filter opens
// and closes over 40 s, the level breathes over 90 s. It is meant to be forgotten.
//
// One thing in front of it: a door. The evening begins outside the parlour, on the landing, and
// until the leaf reaches its stop the room is heard through two inches of wood — the same tone
// behind a lowpass at 250 Hz and half the level. It does not fade open; it is cut open, at the
// exact audio time the door arrives (`veil(false, when)`).
export const VEIL = { hz: 250, gain: 0.5, open: 18000 };
export function roomTone(ac, dest, { level: want = LEVEL.room } = {}) {
  const level = want * TRIM.room;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 58;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 440;
  lp.Q.value = 0.5;
  const lp2 = ac.createBiquadFilter();
  lp2.type = 'lowpass';
  lp2.frequency.value = 900;
  const door = ac.createBiquadFilter(); // the leaf, when there is one between us and the parlour
  door.type = 'lowpass';
  door.frequency.setValueAtTime(VEIL.open, t);
  door.Q.value = 0.6;
  const g = ac.createGain();
  g.gain.value = 0; // see decay(): never let the default 1 reach a sample
  g.gain.setValueAtTime(level, t); // cut in, no fade
  src.connect(hp);
  hp.connect(lp);
  lp.connect(lp2);
  lp2.connect(door);
  door.connect(g);
  g.connect(dest);
  src.start(t);

  // the drifts
  const drift = ac.createOscillator();
  drift.frequency.value = 1 / 40;
  const dg = ac.createGain();
  dg.gain.value = 120;
  drift.connect(dg);
  dg.connect(lp.frequency);
  drift.start(t);
  const breath = ac.createOscillator();
  breath.frequency.value = 1 / 90;
  const bg = ac.createGain();
  bg.gain.value = level * 0.16;
  breath.connect(bg);
  bg.connect(g.gain);
  breath.start(t);

  return {
    gain: g,
    base: level,
    // put the door in front of the room, or take it away, at an absolute time on the audio clock
    veil(on, when = ac.currentTime) {
      door.frequency.setValueAtTime(on ? VEIL.hz : VEIL.open, Math.max(when, ac.currentTime));
    },
    stop() {
      try {
        src.stop();
        drift.stop();
        breath.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

// ---- the cues -------------------------------------------------------------------------------------
// Each returns its length in seconds. `seed` makes a firing deterministic (the probe) and varied
// (the live piece bumps it every time, because no two cards land alike).
export function play(ac, dest, name, t, { seed = 1, gain = 1, pan = 0 } = {}) {
  const rng = mulberry32(seed * 2654435761);
  const trim = TRIM[name] ?? 1;
  const L = (k) => LEVEL[k] * gain * trim;
  switch (name) {
    // the camera cut: a dry paper tick, barely there, the frame changing
    case 'cut': {
      burst(ac, dest, { t, dur: 0.013, level: L('cut'), freq: 1100, q: 0.9, pan, seed });
      burst(ac, dest, { t, dur: 0.022, level: L('cut') * 0.45, freq: 330, q: 1.2, type: 'lowpass', pan, seed: seed + 3 });
      return LENGTH.cut;
    }

    // a title / chapter card arriving: card stock slapped down on the table, harder than a deal
    case 'snap': {
      burst(ac, dest, { t, dur: 0.02, level: L('snap'), freq: 2600, q: 0.8, pan, seed });
      burst(ac, dest, { t, dur: 0.095, level: L('snap') * 0.8, freq: 260, q: 0.9, type: 'lowpass', pan, seed: seed + 1 });
      struck(ac, dest, { t, dur: 0.075, level: L('snap') * 0.3, freq: 128, type: 'sine', pan });
      burst(ac, dest, { t: t + 0.016, dur: 0.05, level: L('snap') * 0.25, freq: 1500, q: 1.4, pan, seed: seed + 2 });
      return LENGTH.snap;
    }

    // a card leaving the deck: paper sliding on paper, a short swish that starts at its loudest
    case 'deal': {
      const f = 1250 + rng() * 400;
      burst(ac, dest, { t, dur: 0.085, level: L('deal'), freq: f, q: 1.15, sweep: 500, pan, seed });
      burst(ac, dest, { t, dur: 0.012, level: L('deal') * 0.35, freq: 2400, q: 1.2, pan, seed: seed + 1 });
      return LENGTH.deal;
    }

    // a card landing on the cloth: a soft thump with a click on top of it
    case 'settle': {
      const f = 190 + rng() * 60;
      burst(ac, dest, { t, dur: 0.105, level: L('settle') * 0.9, freq: f, q: 0.8, type: 'lowpass', pan, seed });
      struck(ac, dest, { t, dur: 0.085, level: L('settle') * 0.42, freq: 88 + rng() * 14, type: 'sine', pan });
      burst(ac, dest, { t, dur: 0.011, level: L('settle') * 0.5, freq: 3000 + rng() * 700, q: 1.2, pan, seed: seed + 1 });
      burst(ac, dest, { t: t + 0.012, dur: 0.055, level: L('settle') * 0.18, freq: 1100, q: 1.6, pan, seed: seed + 2 });
      return LENGTH.settle;
    }

    // the visitor's card drawn out of the fan: a longer, softer slide, in his fingers
    case 'pick': {
      burst(ac, dest, { t, dur: 0.115, level: L('pick'), freq: 880 + rng() * 220, q: 1.1, sweep: 700, pan, seed });
      burst(ac, dest, { t: t + 0.004, dur: 0.05, level: L('pick') * 0.6, freq: 420, q: 0.8, type: 'lowpass', pan, seed: seed + 1 });
      return LENGTH.pick;
    }

    // a card turned face up: one crisp flick of stock
    case 'flip': {
      burst(ac, dest, { t, dur: 0.045, level: L('flip'), freq: 1250, q: 0.9, sweep: 1400, pan, seed });
      burst(ac, dest, { t, dur: 0.01, level: L('flip') * 0.55, freq: 3600, q: 1.1, pan, seed: seed + 1 });
      return LENGTH.flip;
    }

    // the riffle: twenty short transients over 400 ms, the release loudest, then the cascade
    case 'riffle': {
      const n = 20;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const at = t + 0.4 * Math.pow(u, 0.86) + (rng() - 0.5) * 0.008;
        const lv = L('riffle') * (i === 0 ? 1 : 0.34 + rng() * 0.36);
        burst(ac, dest, { t: at, dur: 0.006 + rng() * 0.008, level: lv, freq: 1900 + rng() * 1900, q: 0.9 + rng(), pan, seed: seed + i });
      }
      // the pack coming back together at the end
      burst(ac, dest, { t: t + 0.4, dur: 0.05, level: L('riffle') * 0.4, freq: 420, q: 0.8, type: 'lowpass', pan, seed: seed + 41 });
      return LENGTH.riffle;
    }

    // the deck squared: the edges knocked on the table twice over, wood under paper
    case 'tap': {
      burst(ac, dest, { t, dur: 0.018, level: L('tap') * 0.5, freq: 2000, q: 1.2, pan, seed });
      burst(ac, dest, { t, dur: 0.055, level: L('tap'), freq: 300, q: 1.0, type: 'lowpass', pan, seed: seed + 1 });
      struck(ac, dest, { t, dur: 0.05, level: L('tap') * 0.45, freq: 168, type: 'triangle', pan });
      burst(ac, dest, { t: t + 0.022, dur: 0.03, level: L('tap') * 0.18, freq: 2500, q: 1.4, pan, seed: seed + 2 });
      return LENGTH.tap;
    }

    // ---- THE SMOOSH. A wash is not a riffle and must not sound like one. A riffle is a spring
    // and a snap: twenty edges released in 400 ms. A wash is seventy-eight cards lying flat under
    // two flat palms being pushed around each other, and it is a long DRY SLITHER — broad, soft at
    // the top, no transient, no cascade, no pack coming together at the end. Round 11 of reveal
    // asked for these four by name and has been playing riffle/deal/tap until they existed.

    // the deck spilling out from under his palms and becoming a mass: six slithers laid over each
    // other, staggered, each sweeping down, so that no single one of them can be heard as an event
    // and the whole thing reads as one continuous movement of paper
    case 'wash': {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const at = t + 0.5 * u * u; // they crowd the beginning, where the deck is coming apart
        const dur = 0.34 + rng() * 0.22;
        const f = 2600 - 900 * u + rng() * 500;
        burst(ac, dest, {
          t: at,
          dur,
          level: L('wash') * (0.5 + 0.5 * (1 - u)) * (0.7 + rng() * 0.5),
          freq: f,
          q: 0.55 + rng() * 0.4,
          sweep: -(500 + rng() * 500),
          attack: 0.03 + rng() * 0.03,
          hold: 0.04 + rng() * 0.07,
          pan,
          seed: seed + i * 7,
        });
      }
      // the heap itself, spreading on the cloth: no pitch, just a low body under the slither
      burst(ac, dest, { t, dur: 0.9, level: L('wash') * 0.34, freq: 380, q: 0.5, type: 'lowpass', attack: 0.08, hold: 0.24, pan, seed: seed + 61 });
      return LENGTH.wash;
    }

    // one push of the palms through the mass. It is fired every five drawings while the smoosh
    // runs, so it has to LAYER: short, soft-topped, no click, and a third of the wash's level.
    case 'smoosh': {
      const f = 1500 + rng() * 900;
      burst(ac, dest, { t, dur: 0.52 + rng() * 0.08, level: L('smoosh'), freq: f, q: 0.6, sweep: -(300 + rng() * 400), attack: 0.05, hold: 0.16, pan, seed });
      burst(ac, dest, { t: t + 0.03 + rng() * 0.05, dur: 0.44, level: L('smoosh') * 0.55, freq: 2500 + rng() * 700, q: 0.75, sweep: -600, attack: 0.045, hold: 0.1, pan, seed: seed + 1 });
      // the palm on the cloth under it
      burst(ac, dest, { t, dur: 0.62, level: L('smoosh') * 0.3, freq: 300, q: 0.5, type: 'lowpass', attack: 0.07, hold: 0.22, pan, seed: seed + 2 });
      return LENGTH.smoosh;
    }

    // the gather: both palms dragging the mass in from the two ends of the cloth. Unlike the wash
    // it GATHERS — the grains thicken as the cards pile up instead of thinning — and it ends on the
    // pile arriving, not on a snap.
    case 'rake': {
      burst(ac, dest, { t, dur: 0.62, level: L('rake') * 0.8, freq: 1700, q: 0.5, sweep: -700, attack: 0.05, hold: 0.16, pan, seed });
      const n = 11;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        // the spacing closes up as the heap does
        const at = t + 0.58 * (1 - Math.pow(1 - u, 1.7)) + (rng() - 0.5) * 0.02;
        burst(ac, dest, {
          t: Math.max(t, at),
          dur: 0.03 + rng() * 0.05,
          level: L('rake') * (0.22 + 0.5 * u) * (0.6 + rng() * 0.6),
          freq: 1300 + rng() * 1600,
          q: 0.9 + rng(),
          attack: 0.006,
          pan,
          seed: seed + i,
        });
      }
      // the pile landing on the deck's own square
      burst(ac, dest, { t: t + 0.58, dur: 0.14, level: L('rake') * 0.5, freq: 260, q: 0.8, type: 'lowpass', pan, seed: seed + 40 });
      return LENGTH.rake;
    }

    // the pile pressed square between two palms. From straight above this is a hairline, so it is
    // the quietest event on the table: paper edges shifting against each other, a hand's weight
    // behind them, and no wood at all — the wooden knock is `tap`, which is edges on a table.
    case 'square': {
      // no struck tone anywhere in it: two palms coming together on a pile of paper is a PRESS,
      // and the moment it becomes a strike it is `tap` — which is the wooden one, and is a
      // different event on a different beat.
      burst(ac, dest, { t, dur: 0.12, level: L('square'), freq: 1250 + rng() * 500, q: 0.7, sweep: -450, attack: 0.024, pan, seed });
      burst(ac, dest, { t, dur: 0.17, level: L('square') * 0.62, freq: 240, q: 0.7, type: 'lowpass', attack: 0.032, hold: 0.03, pan, seed: seed + 1 });
      burst(ac, dest, { t, dur: 0.15, level: L('square') * 0.34, freq: 132, q: 0.6, type: 'lowpass', attack: 0.03, pan, seed: seed + 2 });
      return LENGTH.square;
    }

    // the title figure: two struck notes, a fifth apart, on the 12 fps grid. Deadpan.
    // and its inversion for the closing card: the same first note, the same interval, downwards.
    case 'title':
    case 'closing': {
      const up = name === 'title';
      const root = 293.66; // D4
      const second = up ? root * 1.5 : root / 1.5; // A4, or G3
      const partials = [
        [2.0, 0.22, 0.4],
        [2.76, 0.1, 0.28],
        [5.4, 0.035, 0.18],
      ];
      const lvl = L(up ? 'title' : 'closing');
      struck(ac, dest, { t, dur: 0.62, level: lvl, freq: root, partials, pan });
      struck(ac, dest, { t: t + 5 / 12, dur: 1.05, level: lvl * 0.92, freq: second, partials, pan });
      return LENGTH.title;
    }

    // the chair under him: stick-slip, a dozen irregular little grains of wood
    case 'creak': {
      const dull = ac.createBiquadFilter();
      dull.type = 'lowpass';
      dull.frequency.value = 820;
      dull.Q.value = 0.7;
      dull.connect(out(ac, dest, pan)); // the pan is applied once, here, not on every grain
      let at = t;
      for (let i = 0; i < 13; i++) {
        const f = 250 + rng() * 260;
        // the first slip is the weight going on; the rest is the wood letting go of it
        burst(ac, dull, { t: at, dur: 0.02 + rng() * 0.02, level: L('creak') * (i === 0 ? 1 : 0.4 + rng() * 0.5), freq: f, q: 7 + rng() * 5, seed: seed + i });
        at += 0.014 + rng() * 0.026;
      }
      return LENGTH.creak;
    }

    // the street, through the shutters: a horn, two blats, a long way off
    case 'street': {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 780;
      lp.Q.value = 0.6;
      lp.connect(out(ac, dest, pan));
      struck(ac, lp, { t, dur: 0.2, level: L('street'), freq: 366, type: 'sawtooth' });
      struck(ac, lp, { t: t + 0.3, dur: 0.24, level: L('street') * 0.9, freq: 366, type: 'sawtooth' });
      return LENGTH.street;
    }

    // THE RADIO'S KNOB, turned one stop. Three things in 300 ms and no music in any of them: the
    // detent — a small dry bakelite click, which is the visitor's own hand and is the loudest
    // moment here — then the carrier, a band of hiss that opens as the needle leaves the station it
    // was on and closes onto the next, and half a dozen grains of atmospheric crackle scattered
    // through it. There is no whistle: a heterodyne squeal is the one sound a radio makes that has
    // PITCH in it, and pitch is what the tune has and what Pepe's voice has, so a squeal would be
    // the crackle arguing with both of them across the whole width of the placard.
    case 'static': {
      // the detent
      burst(ac, dest, { t, dur: 0.007, level: L('static'), freq: 2400, q: 1.2, pan, seed });
      burst(ac, dest, { t, dur: 0.026, level: L('static') * 0.4, freq: 420, q: 1.4, type: 'lowpass', pan, seed: seed + 1 });
      // the carrier, opening and closing: two bands crossing, so neither reads as a note
      burst(ac, dest, { t: t + 0.01, dur: 0.2, level: L('static') * 0.5, freq: 1500, q: 0.7, sweep: 900, attack: 0.02, hold: 0.05, pan, seed: seed + 2 });
      burst(ac, dest, { t: t + 0.03, dur: 0.22, level: L('static') * 0.34, freq: 3000, q: 0.6, sweep: -1400, attack: 0.03, hold: 0.04, pan, seed: seed + 3 });
      // and the air on it: grains, irregular, thinning out as the needle arrives
      for (let i = 0; i < 7; i++) {
        const u = i / 6;
        const at = t + 0.02 + 0.24 * Math.pow(u, 0.9) + (rng() - 0.5) * 0.03;
        burst(ac, dest, {
          t: Math.max(t, at),
          dur: 0.004 + rng() * 0.009,
          level: L('static') * (0.55 - 0.36 * u) * (0.5 + rng() * 0.8),
          freq: 1200 + rng() * 2800,
          q: 1.4 + rng() * 2,
          pan,
          seed: seed + 10 + i,
        });
      }
      return LENGTH.static;
    }

    // THE CAT LAMP'S SWITCH, thrown. A tumbler in a bakelite base, and the whole event is two hard
    // little grains 14 ms apart: the thumb loading the spring, then the spring going over. Under
    // them a short dry body, because the thing the switch is screwed to is a hollow china cat.
    // Drier and shorter than the door's latch — brass rings, bakelite does not — and quieter than
    // the escapement, because switching a lamp on is not an event a room notices. Measured at 34 ms
    // end to end (tools/_props-r9-switch.mjs) and there is no pitch in it anyone could hum: this
    // fires while Pepe may be talking.
    case 'switch': {
      burst(ac, dest, { t, dur: 0.004, level: L('switch'), freq: 2950, q: 1.6, pan, seed });
      burst(ac, dest, { t, dur: 0.017, level: L('switch') * 0.32, freq: 380, q: 1.2, type: 'lowpass', pan, seed: seed + 1 });
      burst(ac, dest, { t: t + 0.014, dur: 0.006, level: L('switch') * 0.76, freq: 2050, q: 1.4, pan, seed: seed + 2 });
      struck(ac, dest, { t: t + 0.014, dur: 0.03, level: L('switch') * 0.18, freq: 930, type: 'triangle', partials: [[1.87, 0.34, 0.3]], pan });
      return LENGTH.switch;
    }

    // ---- the door the film opens on. It is a foot from the lens, so it is the nearest, driest,
    // loudest thing in the picture, and it is all wood and one small piece of brass.

    // the latch: the thumb-piece drops, then the tongue clears the strike plate 18 ms later.
    // Brass, so it is the brightest thing in the film, and it is over in a twentieth of a second.
    case 'latch': {
      burst(ac, dest, { t, dur: 0.006, level: L('latch'), freq: 3500, q: 1.5, pan, seed });
      struck(ac, dest, { t, dur: 0.03, level: L('latch') * 0.26, freq: 2240, type: 'triangle', partials: [[1.63, 0.5, 0.4], [2.41, 0.26, 0.24]], pan });
      burst(ac, dest, { t: t + 0.018, dur: 0.009, level: L('latch') * 0.72, freq: 2700, q: 1.3, pan, seed: seed + 1 });
      burst(ac, dest, { t: t + 0.018, dur: 0.03, level: L('latch') * 0.3, freq: 430, q: 1.1, type: 'lowpass', pan, seed: seed + 2 });
      return LENGTH.latch;
    }

    // the hinges: an unoiled pin under the weight of the leaf. Stick-slip like the chair, but the
    // resonance climbs as the door swings — the grains thin out because the pin is breaking loose
    // hardest at the first inch and is only turning after that.
    case 'hinge': {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        // the grains crowd the first inch, where the pin is breaking loose, and thin out as it
        // turns; the spacing is scattered because stick-slip is not a rhythm
        const at = t + 0.36 * Math.pow(u, 1.25) + (rng() - 0.5) * 0.022;
        const f = 470 + 760 * u + rng() * 220;
        const lv = L('hinge') * (i === 0 ? 1 : (0.2 + 0.46 * Math.pow(1 - u, 1.4)) * (0.55 + rng() * 0.6));
        burst(ac, dest, { t: Math.max(t, at), dur: 0.012 + rng() * 0.017, level: lv, freq: f, q: 9 + rng() * 7, pan, seed: seed + i });
      }
      // the leaf itself, a wide board moving air
      burst(ac, dest, { t, dur: 0.22, level: L('hinge') * 0.2, freq: 210, q: 0.7, type: 'lowpass', pan, seed: seed + 60 });
      return LENGTH.hinge;
    }

    // a knuckle on a door panel — and the same voice for the leaf arriving against its stop, which
    // is the identical event: hard wood struck once, a big thin panel ringing low behind it.
    case 'knock': {
      burst(ac, dest, { t, dur: 0.008, level: L('knock') * 0.5, freq: 1750, q: 1.1, pan, seed });
      burst(ac, dest, { t, dur: 0.07, level: L('knock'), freq: 250, q: 0.9, type: 'lowpass', pan, seed: seed + 1 });
      struck(ac, dest, { t, dur: 0.12, level: L('knock') * 0.46, freq: 128 + rng() * 12, type: 'sine', partials: [[2.42, 0.26, 0.35]], pan });
      return LENGTH.knock;
    }

    // a board under the visitor: soft, low, and then the board letting go of the weight in two
    // little grains. Quieter than anything else the door does — he is not stamping.
    case 'footfall': {
      burst(ac, dest, { t, dur: 0.1, level: L('footfall'), freq: 150 + rng() * 40, q: 0.8, type: 'lowpass', pan, seed });
      struck(ac, dest, { t, dur: 0.16, level: L('footfall') * 0.5, freq: 68 + rng() * 12, type: 'sine', pan });
      burst(ac, dest, { t: t + 0.045, dur: 0.035, level: L('footfall') * 0.34, freq: 340 + rng() * 90, q: 6.5, pan, seed: seed + 1 });
      burst(ac, dest, { t: t + 0.095, dur: 0.04, level: L('footfall') * 0.24, freq: 270, q: 7.5, pan, seed: seed + 2 });
      return LENGTH.footfall;
    }

    // the caption's pen, one tick a word. Now that the evening is a conversation this is the sound
    // the film mostly makes, so it is a nib and not a typewriter: the pitch moves letter to letter,
    // there is a little paper under it, and about a third of the strokes have a second touch.
    case 'type': {
      const f = 1900 + rng() * 1700;
      burst(ac, dest, { t, dur: 0.006 + rng() * 0.004, level: L('type'), freq: f, q: 1.1 + rng() * 0.8, pan, seed });
      burst(ac, dest, { t, dur: 0.014, level: L('type') * 0.3, freq: 640, q: 1, type: 'lowpass', pan, seed: seed + 1 });
      if (rng() < 0.34) burst(ac, dest, { t: t + 0.012 + rng() * 0.008, dur: 0.005, level: L('type') * 0.55, freq: f * 0.82, q: 1.4, pan, seed: seed + 2 });
      return LENGTH.type;
    }

    default:
      return 0;
  }
}

export const CUES = ['cut', 'snap', 'deal', 'settle', 'pick', 'flip', 'riffle', 'tap', 'wash', 'smoosh', 'rake', 'square', 'title', 'closing', 'creak', 'street', 'type', 'latch', 'hinge', 'knock', 'footfall', 'static', 'switch'];
