// PIECE: sound (the tune) — a background piece for the parlour, composed here, in code.
//
// The user: "we have to review sound design, we have to improve that. we need a background tune,
// something that would fit tarotpepe." There are no audio files in this project and there will be
// none, so the tune is written the way every other noise in this room is written: notes, a small
// instrument or two, and a scheduler that lays them on the AudioContext's clock.
//
// THREE CANDIDATES, AND THE USER PICKS. BRIEF.md's rule is that whether a thing is any good is the
// user's call, so this file does not choose. It offers three that are different IN KIND, not three
// versions of one idea, and the numbers that describe them are in tools/_tune-probe.mjs.
//
//   ?tune=a   THE MUSIC BOX          the film's own register. A comb-tine music box, D minor, slow
//                                    waltz, 84 bpm, thirty-two bars, and a little out of tune in a
//                                    fixed way — a real box is. 68.6 s of material.
//   ?tune=b   THE LINE               his. He is a dial-up child in the town's old telephone
//                                    exchange, so this is hold music: a pulse lead down a
//                                    300–3000 Hz telephone band, a plucked bass, 50 Hz mains hum
//                                    off the exchange's own iron, and the French dial tone (a
//                                    continuous 440) sitting under it as the tonic. A minor,
//                                    76 bpm, sixteen bars, 50.5 s.
//   ?tune=c   THE MECHANISM          the room's. No beat you can tap: a reed drone on open fifths
//                                    that changes every 11.2 s, and one plucked string on a cycle
//                                    of a different length, so the two only line up again after
//                                    112 s. 112 s of material.
//   ?tune=0 / ?tune=off              no tune at all.
//
// THE LOOP HAS NO SEAM BECAUSE IT IS NOT A LOOP. Nothing here is a buffer played end to end: the
// scheduler lays down one BAR at a time, seconds ahead of the render loop (the same trick the
// escapement uses), and bar 32 is followed by bar 33, which happens to be bar 0's notes again. A
// note struck in the last bar rings across the join because it is the same note it always was. The
// probe still measures the join both ways — the sample step you WOULD get from a butt-join, and how
// far the second pass differs from the first — because the numbers are what says so.
//
// IT IS BACKGROUND, AND ALL THREE ARE THE SAME LOUDNESS. Every one is trimmed to an RMS of 0.0080,
// which is +4 dB on the room tone and 8–17 dB under the door's stop, so what the user is choosing
// between is three compositions and not three volumes. Peak is left where each instrument puts it
// (a struck music box has 21 dB of crest; a reed drone has 14). It ducks to 0.34 under Pepe's
// spoken voice, it goes behind the door with the room tone until the leaf arrives, and it never
// fades — it is cut in and cut out, like everything else here.
//
// ONE DEPARTURE FROM `nothing fades in`, stated out loud: a struck tine is at level on its first
// sample and this file keeps that, but a sustained voice (the reed, the mains hum, the dial tone)
// takes a 6–30 ms ramp. That is a de-click, not a swell. There are no crossfades and no phrase ever
// swells or dies away under another one.
import { mulberry32 } from '../core/rng.js';

// ---- pitch ---------------------------------------------------------------------------------------
// Everything is written in semitones from the tune's own reference pitch, so a melody reads as a
// line of numbers and not as a table of frequencies.
const hz = (ref, semis, cents = 0) => ref * Math.pow(2, (semis + cents / 100) / 12);

// A real music box is out of tune, and it is out of tune the SAME WAY every time: the comb was cut
// once and the tines are where they are. So the offset is per pitch-class and fixed, never random.
const BOX_CENTS = [-7, 4, -3, 9, -5, 2, -8, 6, 0, -4, 7, -2];
const boxCents = (s) => BOX_CENTS[((s % 12) + 12) % 12];

// ---- the two primitives the tunes are built from ---------------------------------------------------
// A plucked/struck voice: the fundamental with a few partials, each with its own decay, at level on
// its first sample. `inharm` bends the partials sharp, which is what a struck metal tine does and
// is most of the difference between a music box and a sine.
//
// EVERY GAIN NODE HERE IS ZEROED BEFORE IT IS SCHEDULED, and that is not a style. A GainNode's
// default value is 1, and `setValueAtTime(v, t)` takes effect at the first sample frame at or after
// t while `start(t)` can begin inside the frame that CONTAINS t. When those disagree by one sample
// the source's first sample goes out at unity: a single-sample impulse at full scale. Measured, on
// the music box, at 0.374 against a piece whose whole level is 0.034 — one sample, twenty-two times
// louder than the tune, i.e. a click at a note onset. tools/_tune-probe.mjs is what found it and
// the `worstStep` figure is what would find it again.
function pluck(ac, dest, { t, freq, dur, level, partials, type = 'sine', click = 0, seed = 1 }) {
  const g = ac.createGain();
  const floor = Math.max(1e-6, level * 0.0006);
  g.gain.value = 0;
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(floor, t + dur);
  g.gain.setValueAtTime(0, t + dur + 0.002);
  g.connect(dest);
  for (const [ratio, amp, frac] of partials) {
    const o = ac.createOscillator();
    o.type = ratio === 1 ? type : 'sine';
    o.frequency.setValueAtTime(freq * ratio, t);
    const og = ac.createGain();
    og.gain.value = 0;
    og.gain.setValueAtTime(amp, t);
    // the fundamental rides the outer envelope alone; only the partials get a decay of their own,
    // because two exponentials multiplied is a much faster decay than either of them
    if (frac < 0.999) og.gain.exponentialRampToValueAtTime(Math.max(1e-6, amp * 0.0008), t + Math.max(0.02, frac * dur));
    o.connect(og);
    og.connect(g);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  // the pin catching the tine, or the nail on the string: 3 ms of bright noise, almost subliminal
  if (click > 0) {
    const rng = mulberry32(seed * 2654435761);
    const src = ac.createBufferSource();
    const n = Math.max(8, Math.floor(ac.sampleRate * 0.004));
    const b = ac.createBuffer(1, n, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (rng() * 2 - 1) * (1 - i / n);
    src.buffer = b;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = Math.min(6200, freq * 5 + 1400);
    f.Q.value = 1.1;
    const cg = ac.createGain();
    cg.gain.value = 0;
    cg.gain.setValueAtTime(level * click, t);
    cg.gain.exponentialRampToValueAtTime(Math.max(1e-6, level * click * 0.001), t + 0.02);
    src.connect(f);
    f.connect(cg);
    cg.connect(dest);
    src.start(t);
    src.stop(t + 0.03);
  }
  return t + dur;
}

// A blown / bowed voice: a sustained tone with a body, a de-click on and a cut off. Used by the
// reed drone and by the mains hum; never by anything that is supposed to be struck.
function held(ac, dest, { t, freq, dur, level, type = 'sawtooth', cut = 900, q = 0.7, attack = 0.03, detune = 0 }) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (detune) o.detune.setValueAtTime(detune, t);
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(cut, t);
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.value = 0;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + attack);
  g.gain.setValueAtTime(level, t + Math.max(attack, dur - attack));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(f);
  f.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
  return t + dur;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// A — THE MUSIC BOX
// The film's register: something small, struck, in three, in a minor key, and slightly wrong. It
// is the kind of object that would have been left in a telephone exchange and wound by a frog who
// has nothing else to do between visitors.
//
// D minor. 84 bpm in 3/4, so a beat is 0.714 s and a bar is 2.143 s. Thirty-two bars: an eight-bar
// phrase, the same phrase lifting to the relative major's third, an eight-bar phrase in F, and the
// first phrase again ending on a two-bar hold — which is what makes the join quiet.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const A_REF = 293.665; // D4
const A_BEAT = 60 / 84;
const A_BARS = 32;
// [beat from the top of the loop, semitones from D4, length in beats]
const A_MELODY = [
  // phrase 1 — down from the fifth to the tonic, twice
  [0, 7, 2], [2, 5, 1], [3, 3, 2], [5, 2, 1], [6, 0, 3],
  [9, 3, 2], [11, 7, 1], [12, 8, 2], [14, 7, 1], [15, 5, 3],
  [18, 2, 2], [20, 5, 1], [21, 3, 3],
  // phrase 2 — the same opening, and it goes up instead of down
  [24, 7, 2], [26, 5, 1], [27, 3, 2], [29, 2, 1], [30, 0, 3],
  [33, 3, 2], [35, 5, 1], [36, 7, 2], [38, 8, 1], [39, 10, 3],
  [42, 8, 2], [44, 7, 1], [45, 7, 3],
  // phrase 3 — in F, an octave up, the brightest eight bars in the piece
  [48, 15, 1], [49, 14, 1], [50, 12, 1], [51, 10, 3],
  [54, 12, 2], [56, 15, 1], [57, 14, 2], [59, 10, 1],
  [60, 12, 3], [63, 8, 2], [65, 10, 1], [66, 7, 3], [69, 5, 2], [71, 3, 1],
  // phrase 4 — home, and then it thins to two notes so the join lands in a quiet bar
  [72, 7, 2], [74, 5, 1], [75, 3, 2], [77, 2, 1], [78, 0, 3],
  [81, 3, 2], [83, 2, 1], [84, 0, 6],
  [90, -5, 3], [93, 0, 3],
];
// one root a bar, in the box's low comb (D3–A3)
const A_BASS = [
  -12, -12, -16, -16, -9, -9, -7, -5,
  -12, -12, -16, -16, -9, -9, -7, -5,
  -9, -9, -14, -14, -16, -16, -9, -14,
  -12, -12, -16, -16, -9, -7, -5, -12,
];

function tuneA(ac, dest, bar, t0, level) {
  const beat = A_BEAT;
  const k = ((bar % A_BARS) + A_BARS) % A_BARS;
  const b0 = k * 3; // the loop's beat index at the top of this bar
  const note = (semis, at, len, lv, dur) =>
    pluck(ac, dest, {
      t: t0 + (at - b0) * beat,
      freq: hz(A_REF, semis + 12, boxCents(semis)), // the comb sounds an octave above the written line
      dur,
      level: level * lv,
      type: 'sine',
      click: 0.16,
      seed: 31 + at * 7 + semis,
      partials: [
        [1, 1, 1],
        [3.02, 0.24, 0.42],
        [5.41, 0.09, 0.24],
        [8.23, 0.035, 0.14],
      ],
    });
  for (const [at, semis, len] of A_MELODY) {
    if (at < b0 || at >= b0 + 3) continue;
    note(semis, at, len, 0.62, Math.min(2.6, 0.5 + len * 0.42));
  }
  // the left hand: a root on the downbeat and one inner note on the third beat — the waltz's lilt
  const root = A_BASS[k];
  note(root, b0, 1, 0.5, 2.0);
  note(root + 7, b0 + 2, 1, 0.2, 1.15);
  // every eighth bar the wooden case answers, one note, almost under the room tone
  if (k % 8 === 0)
    pluck(ac, dest, {
      t: t0,
      freq: hz(A_REF, -12),
      dur: 3.4,
      level: level * 0.15,
      type: 'sine',
      partials: [[1, 1, 1], [2.01, 0.18, 0.3], [3.04, 0.06, 0.2]],
      seed: 500 + k,
    });
  return 3 * beat;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// B — THE LINE
// His. A dial-up child raised on the imageboards, sitting in the room where the town's calls were
// put through by hand. So: hold music. A pulse lead squeezed into the telephone band (300–3000 Hz,
// which is the band a subscriber line actually passes), a plucked bass under it, the exchange's own
// 50 Hz mains hum off the iron, and — continuous, barely there — the French dial tone, which is a
// single 440. The tune is in A minor for that reason: the dial tone IS the tonic, so the room's
// electrical noise and the music are the same note.
//
// A minor. 76 bpm in 4/4 — a beat is 0.789 s, a bar 3.158 s. Sixteen bars, 50.5 s.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const B_REF = 440; // A4, and the dial tone
const B_BEAT = 60 / 76;
const B_BARS = 16;
const B_MELODY = [
  [0, 7, 2], [2, 5, 1], [3, 3, 1],
  [4, 2, 3], [7, 3, 1],
  [8, 5, 2], [10, 3, 2],
  [12, 2, 4],
  [16, 0, 2], [18, 3, 1], [19, 5, 1],
  [20, 7, 3], [23, 10, 1],
  [24, 12, 2], [26, 10, 2],
  [28, 7, 4],
  [32, 8, 2], [34, 7, 1], [35, 5, 1],
  [36, 3, 3], [39, 5, 1],
  [40, 7, 2], [42, 5, 2],
  [44, 3, 4],
  [48, 5, 2], [50, 7, 1], [51, 8, 1],
  [52, 10, 3], [55, 8, 1],
  [56, 7, 2], [58, 5, 2],
  [60, 0, 4],
];
// one root a bar: Am Em Dm Em | Am C F E | Dm Am Em Am | Dm G E Am
const B_BASS = [-24, -17, -19, -17, -24, -21, -16, -17, -19, -24, -17, -24, -19, -14, -17, -24];

function tuneB(ac, dest, bar, t0, level, lines) {
  const beat = B_BEAT;
  const k = ((bar % B_BARS) + B_BARS) % B_BARS;
  const b0 = k * 4;
  // the lead goes down the line — the band-pass pair is built once, in makeTune, and lives in
  // `lines.wire`; the bass and the hum do not, because they are in the room and not on the wire
  for (const [at, semis, len] of B_MELODY) {
    if (at < b0 || at >= b0 + 4) continue;
    const t = t0 + (at - b0) * beat;
    const dur = len * beat * 0.92;
    const o = ac.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(hz(B_REF, semis), t);
    const g = ac.createGain();
    const lv = level * 0.30;
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lv, t + 0.006); // a de-click, not a swell
    g.gain.setValueAtTime(lv, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(Math.max(1e-6, lv * 0.25), t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.012);
    o.connect(g);
    g.connect(lines.wire);
    o.start(t);
    o.stop(t + dur + 0.03);
    // the tape the hold music is on: a slow, small drift, fixed per note so it does not warble
    o.detune.setValueAtTime(Math.sin(at * 0.37) * 7 + Math.sin(at * 0.11) * 5, t);
  }
  // the bass: plucked, in the room, one on the downbeat and the fifth halfway through the bar
  const root = B_BASS[k];
  const bass = (semis, at, dur, lv) =>
    pluck(ac, dest, {
      t: t0 + at * beat,
      freq: hz(B_REF, semis),
      dur,
      level: level * lv,
      type: 'triangle',
      click: 0.1,
      seed: 77 + k * 13 + semis,
      partials: [[1, 1, 1], [2, 0.3, 0.45], [3, 0.1, 0.25], [4.02, 0.04, 0.15]],
    });
  bass(root, 0, 1.5, 0.42);
  bass(root + 7, 2, 1.1, 0.24);
  // and a chord chip on the off-beats of every other bar: the hold-music comp, quiet, on the wire
  if (k % 2 === 1)
    for (const off of [1.5, 3.5]) {
      const t = t0 + off * beat;
      for (const s of [root + 12, root + 15, root + 19]) {
        const o = ac.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(hz(B_REF, s), t);
        const g = ac.createGain();
        const lv = level * 0.055;
        g.gain.value = 0;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(lv, t + 0.005);
        g.gain.exponentialRampToValueAtTime(Math.max(1e-6, lv * 0.02), t + 0.22);
        g.gain.linearRampToValueAtTime(0, t + 0.24);
        o.connect(g);
        g.connect(lines.wire);
        o.start(t);
        o.stop(t + 0.26);
      }
    }
  return 4 * beat;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// C — THE MECHANISM
// The room's, and the only one of the three with no tune in it. A reed drone on open fifths — the
// harmonium end of a music box, or a switchboard's own ringing generator held down — moving through
// five chords, each 11.2 s long. Over it, one plucked string, on a cycle of a DIFFERENT length, so
// the two do not line up again for 112 s. Nothing here is on a beat you can tap, which is the point:
// it is furniture, and it is meant to be forgotten in the way the room tone is meant to be forgotten.
//
// D minor, open fifths only (no thirds, so it is neither major nor minor for long). The unit is
// 0.7 s; a chord is 16 units, the whole chord cycle 80 units (56 s), the pluck cycle 32 units
// (22.4 s), and the two agree again at 160 units — 112 s.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const C_REF = 293.665; // D4
const C_UNIT = 0.7;
const C_BARS = 160; // "bar" here is one unit; the loop is 160 of them
const C_CHORD_UNITS = 16;
// five chords: D, Bb, F, G, D — roots and the fifth above, an octave and a fifth down from D4
const C_CHORDS = [-24, -28, -21, -19, -24];
// the plucked string, on its own 32-unit cycle: [unit, semitones from D4]
const C_PLUCKS = [
  [0, 12], [5, 7], [11, 15], [14, 10],
  [19, 5], [23, 12], [28, 3],
];

function tuneC(ac, dest, bar, t0, level) {
  const u = ((bar % C_BARS) + C_BARS) % C_BARS;
  // the reed: a new pair of tones every 16 units, cut in, cut out, no crossfade — the chord
  // CHANGES, it does not dissolve into the next one
  if (u % C_CHORD_UNITS === 0) {
    const root = C_CHORDS[(u / C_CHORD_UNITS) % C_CHORDS.length];
    const dur = C_CHORD_UNITS * C_UNIT;
    held(ac, dest, { t: t0, freq: hz(C_REF, root), dur, level: level * 0.30, type: 'sawtooth', cut: 380, q: 0.6, attack: 0.35, detune: -4 });
    held(ac, dest, { t: t0, freq: hz(C_REF, root + 7), dur, level: level * 0.20, type: 'sawtooth', cut: 460, q: 0.6, attack: 0.42, detune: 5 });
    held(ac, dest, { t: t0, freq: hz(C_REF, root + 12), dur, level: level * 0.10, type: 'triangle', cut: 700, q: 0.5, attack: 0.5 });
  }
  // the string, on the other cycle
  const p = u % 32;
  for (const [at, semis] of C_PLUCKS) {
    if (at !== p) continue;
    pluck(ac, dest, {
      t: t0,
      freq: hz(C_REF, semis),
      dur: 2.6,
      level: level * 0.34,
      type: 'triangle',
      click: 0.22,
      seed: 900 + u * 3 + semis,
      partials: [[1, 1, 1], [2.001, 0.32, 0.4], [3.01, 0.12, 0.22], [4.98, 0.05, 0.12]],
    });
  }
  return C_UNIT;
}

// ---- the three, described ----------------------------------------------------------------------
export const TUNES = {
  a: {
    id: 'a',
    title: 'the music box',
    what: 'a comb-tine music box, left in the exchange and wound between visitors',
    key: 'D minor',
    metre: '3/4',
    bpm: 84,
    bars: A_BARS,
    barSeconds: 3 * A_BEAT,
    loop: A_BARS * 3 * A_BEAT,
    voices: ['comb tine (struck sine + three inharmonic partials + a pin click)', 'the case, one low note every eight bars'],
    play: tuneA,
  },
  b: {
    id: 'b',
    title: 'the line',
    what: 'hold music, down a subscriber line, in the key of the dial tone',
    key: 'A minor (440 = the French dial tone = the tonic)',
    metre: '4/4',
    bpm: 76,
    bars: B_BARS,
    barSeconds: 4 * B_BEAT,
    loop: B_BARS * 4 * B_BEAT,
    voices: ['pulse lead through a 300–3000 Hz telephone band', 'plucked triangle bass, in the room', '50 Hz mains hum', 'a continuous 440 dial tone'],
    play: tuneB,
    beds: true,
  },
  c: {
    id: 'c',
    title: 'the mechanism',
    what: 'a reed drone on open fifths and one plucked string, on cycles that do not agree',
    key: 'D, open fifths',
    metre: 'none',
    bpm: null,
    bars: C_BARS,
    barSeconds: C_UNIT,
    loop: C_BARS * C_UNIT,
    voices: ['reed, three tones, changing every 11.2 s', 'one plucked string on a 22.4 s cycle'],
    play: tuneC,
  },
};
export const TUNE_IDS = ['a', 'b', 'c'];
export const DEFAULT_TUNE = 'a';

// The nominal level the three are written against, before their trims. What actually lands, measured
// (peak and RMS, summed L+R, against the same references the cue table uses):
//
//              peak     rms      crest    centroid   vs room tone     vs escapement   vs door stop
//   a  box     0.0920   0.0080   21.2 dB    796 Hz   +14.2 / +4 dB      +2.6 dB          -8.5 dB
//   b  line    0.0359   0.0080   13.1 dB    940 Hz    +6.0 / +4 dB      -5.5 dB         -16.6 dB
//   c  mech    0.0389   0.0080   13.7 dB    320 Hz    +6.7 / +4 dB      -4.8 dB         -15.9 dB
//
// (room tone peak 0.018 / rms 0.0050; escapement 0.068; the pen 0.040; the door's stop 0.244.)
export const TUNE_LEVEL = 0.034;
// Measured, and EQUALISED BY RMS, not by peak: the user is choosing between three compositions and
// must not be choosing between three volumes. Each trim lands the tune's RMS on 0.0080 (about
// +4 dB on the room tone, which is what a bed under a conversation wants), and the peaks fall where
// the instrument puts them — a struck music box has 20 dB of crest and a reed drone has 13, and
// flattening that would be flattening the instruments. `node tools/_tune-probe.mjs` prints the trim
// each one needs; paste it back here.
export const TUNE_TRIM = { a: 0.775, b: 0.444, c: 0.621 };

// ---- the instrument ------------------------------------------------------------------------------
// Builds the graph for one tune and hands back a bar-at-a-time scheduler. `pump(now)` lays down
// every bar that starts before `now + ahead` and returns how many it laid; nothing is ever
// scheduled twice, and a bar that has already been laid is never revisited, so the join between the
// last bar of a pass and the first bar of the next is simply the join between two adjacent bars.
export function makeTune(ac, dest, { which = DEFAULT_TUNE, level = TUNE_LEVEL, veiled = false, veil: VEIL = { hz: 250, gain: 0.5, open: 18000 } } = {}) {
  const T = TUNES[which] ?? TUNES[DEFAULT_TUNE];
  const lv = level * (TUNE_TRIM[T.id] ?? 1);
  const t0 = ac.currentTime;

  // the door, in front of the tune exactly as it is in front of the room tone
  const door = ac.createBiquadFilter();
  door.type = 'lowpass';
  door.frequency.setValueAtTime(veiled ? VEIL.hz : VEIL.open, t0);
  door.Q.value = 0.6;
  const bus = ac.createGain();
  bus.gain.setValueAtTime(veiled ? VEIL.gain : 1, t0);
  door.connect(bus);
  bus.connect(dest);

  // B's lead is on a wire and the rest of B is in the room, so the wire is its own path
  const lines = {};
  if (T.id === 'b') {
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 300;
    hp.Q.value = 0.7;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    lp.Q.value = 0.9;
    hp.connect(lp);
    lp.connect(door);
    lines.wire = hp;
  }

  // B's two beds: the exchange's mains hum and the dial tone. Both continuous, both so far under
  // the tune that they read as the room being electrically alive rather than as notes.
  const beds = [];
  if (T.beds) {
    const hum = ac.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 50;
    const hg = ac.createGain();
    hg.gain.value = 0;
    hg.gain.setValueAtTime(0, t0);
    hg.gain.linearRampToValueAtTime(lv * 0.16, t0 + 0.08);
    hum.connect(hg);
    hg.connect(door);
    hum.start(t0);
    const buzz = ac.createOscillator(); // the third harmonic, which is what makes hum sound like iron
    buzz.type = 'sine';
    buzz.frequency.value = 150;
    const bg = ac.createGain();
    bg.gain.value = 0;
    bg.gain.setValueAtTime(0, t0);
    bg.gain.linearRampToValueAtTime(lv * 0.035, t0 + 0.08);
    buzz.connect(bg);
    bg.connect(door);
    buzz.start(t0);
    const dial = ac.createOscillator();
    dial.type = 'sine';
    dial.frequency.value = 440;
    const dg = ac.createGain();
    dg.gain.value = 0;
    dg.gain.setValueAtTime(0, t0);
    dg.gain.linearRampToValueAtTime(lv * 0.035, t0 + 0.3);
    dial.connect(dg);
    dg.connect(lines.wire ?? door);
    dial.start(t0);
    beds.push(hum, buzz, dial);
  }

  let bar = 0; // absolute bar index; bar % T.bars is where it is in the material
  let nextAt = 0; // audio time of the top of `bar`
  let started = false;

  return {
    meta: T,
    bus,
    level: lv,
    get bar() {
      return bar;
    },
    get bars() {
      return bar;
    },
    // put the door in front of the tune, or take it away, at an absolute time on the audio clock
    veil(on, when = ac.currentTime) {
      const t = Math.max(when, ac.currentTime);
      door.frequency.setValueAtTime(on ? VEIL.hz : VEIL.open, t);
      bus.gain.setValueAtTime(on ? VEIL.gain : 1, t);
    },
    // lay down every bar that begins before now + ahead
    pump(now = ac.currentTime, ahead = 2.0) {
      if (!started) {
        started = true;
        nextAt = now + 0.12;
      }
      // the tab was away, or the context was suspended: pick the grid up again rather than
      // scheduling four hundred bars into the past
      if (nextAt < now - 0.5) {
        const skip = Math.ceil((now - nextAt) / T.barSeconds);
        bar += skip;
        nextAt += skip * T.barSeconds;
      }
      let laid = 0;
      while (nextAt < now + ahead && laid < 2048) {
        const step = T.play(ac, door, bar, nextAt, lv, lines);
        nextAt += step || T.barSeconds;
        bar++;
        laid++;
      }
      return laid;
    },
    stop() {
      for (const o of beds) {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      }
      try {
        bus.disconnect();
      } catch {
        /* gone */
      }
    },
  };
}

// ---- the probe's hook -------------------------------------------------------------------------
// Render `bars` bars of one tune into an OfflineAudioContext, through the very code the page runs,
// and hand back the samples. tools/_tune-probe.mjs measures peak, RMS, spectral centroid and the
// join from this; sound.js wraps it with an in-page measurement so nobody has to move a million
// floats across a websocket.
export async function renderTune(OfflineCtx, which, bars, { sampleRate = 22050, level = TUNE_LEVEL, tail = 3 } = {}) {
  const T = TUNES[which] ?? TUNES[DEFAULT_TUNE];
  const seconds = bars * T.barSeconds + tail;
  const oc = new OfflineCtx(1, Math.ceil(seconds * sampleRate), sampleRate);
  const bus = oc.createGain();
  bus.gain.value = 1;
  bus.connect(oc.destination);
  const inst = makeTune(oc, bus, { which });
  // an offline context's currentTime never advances, so the pump is driven by hand
  inst.pump(0, bars * T.barSeconds + 0.001);
  const buf = await oc.startRendering();
  return { buf, meta: T, seconds, offset: 0.12 };
}
