// THUNDER, and it is the only voice this egg adds to the room.
//
// It lives here and not in sound-voices.js for one reason: that file is shared with every other
// builder in the room this week, and a cue added to the middle of its table, its trim table, its
// length table and its switch is four edits in four places. sound-voices.js is still where the
// vocabulary comes from — `noiseBuffer` is imported from it, and the shape of the envelope and the
// no-fade rule are its own — but the cue is scheduled straight onto the sound piece's context,
// exactly as egg-rain.js schedules the rain bed.
//
// WHAT A ROLL OF THUNDER IS, AS A DRAWING WOULD DRAW IT. Not a bang. Three overlapping bodies of
// low noise at slightly different heights, each one arriving after the last and each one longer
// and lower than the one before, with the whole thing running four seconds and never once
// swelling. The near strike gets a crack in front of it — a short, dry, high burst, the sound of
// the air splitting — and the far ones do not, because a distant strike has had its transient eaten
// by two miles of air before it reaches a window.
//
// AND IT IS THE LOUDEST THING IN THE ROOM. LEVEL 0.105 against the toad's fall at 0.096 and the
// mains lever's clack at 0.138: over everything the paper makes and under the one thing the room
// does with its own hands. That is the right place for weather heard through glass — present, and
// still not the subject.
import { noiseBuffer } from './sound-voices.js';
import { mulberry32 } from '../core/rng.js';

export const THUNDER = {
  level: 0.105,
  length: 4.2, // the whole roll, from the crack to the last of it
};

// The same decay sound-voices.js uses, and for its reason: a GainNode's value before its first
// scheduled event is 1, and one sample of unity noise is a click on a cue whose level is a tenth.
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

function body(ac, dest, { t, dur, level, freq, q = 0.7, type = 'lowpass', sweep = 0, hold = 0, attack = 0, seed = 1 }) {
  const rng = mulberry32(seed);
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.linearRampToValueAtTime(Math.max(28, freq + sweep), t + dur);
  const g = ac.createGain();
  decay(g, t, dur, level, hold, attack);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t, rng() * (2 - Math.min(dur, 1.8) - 0.05));
  src.stop(t + dur + 0.02);
}

// `near` is 1 for a strike over the roof and 0 for one across the valley: it decides whether there
// is a crack in front of the roll and how much top there is in the roll itself.
export function thunder(ac, dest, t = ac.currentTime, { level = THUNDER.level, near = 1, seed = 7 } = {}) {
  const n = Math.max(0, Math.min(1, near));
  const L = level;
  // the crack: dry, short, and gone before the roll has properly started
  if (n > 0.45) {
    body(ac, dest, { t, dur: 0.16, level: L * 0.62 * n, freq: 900, q: 0.5, type: 'highpass', hold: 0.012, seed });
    body(ac, dest, { t: t + 0.004, dur: 0.3, level: L * 0.8 * n, freq: 320, q: 0.8, type: 'bandpass', hold: 0.02, seed: seed + 1 });
  }
  // the roll: three bodies, each later, lower and longer than the last. The attack on the first is
  // a de-click and nothing else — 25 ms against a four-second cue — and the other two ride in
  // under it, which is why the whole thing reads as one sound arriving and not as three.
  const t0 = t + (n > 0.45 ? 0.05 : 0);
  body(ac, dest, { t: t0, dur: 1.5, level: L * (0.55 + 0.35 * n), freq: 260, q: 0.6, sweep: -130, hold: 0.18, attack: 0.025, seed: seed + 2 });
  body(ac, dest, { t: t0 + 0.28, dur: 2.4, level: L * (0.5 + 0.3 * n), freq: 150, q: 0.7, sweep: -70, hold: 0.4, attack: 0.05, seed: seed + 3 });
  body(ac, dest, { t: t0 + 0.85, dur: 3.1, level: L * (0.42 + 0.22 * n), freq: 92, q: 0.8, sweep: -40, hold: 0.5, attack: 0.08, seed: seed + 4 });
  // …and one last shoulder of it, a second and a half in, which is the roll coming back off the
  // far side of the town. It is what makes the cue LONG rather than merely slow to die.
  body(ac, dest, { t: t0 + 1.55, dur: 2.6, level: L * 0.34, freq: 118, q: 0.9, sweep: -50, hold: 0.45, attack: 0.09, seed: seed + 5 });
  return THUNDER.length;
}
