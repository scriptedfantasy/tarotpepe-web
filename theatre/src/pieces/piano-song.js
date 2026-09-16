// piano-song — WHAT HIS HANDS PLAY. Note data and nothing else: no audio, no DOM, no THREE.
//
// GYMNOPÉDIE No. 1, Erik Satie, 1888. Long out of copyright everywhere, which is the first reason
// it is this and not something else; the second is that it is the only famous piano piece a frog
// could plausibly be playing in a room above a post office at nine in the evening, and the third is
// that it moves slowly enough to be DRAWN. A film on twelves gets twelve positions a second: a
// piece at ♩ = 60 in 3/4 gives a whole second — twelve drawings — to the shortest note in it, so a
// hand can be seen to arrive, press and leave. Anything quicker would be a blur of green.
//
// WHAT IS HERE, and it is worth being exact about which part is Satie's:
//   THE LEFT HAND IS HIS, and it is the engine of the piece: a low bass on the first beat and a
//   seventh chord on the second, rocking G — D — G — D for the whole of it. Over the G the chord is
//   B D F♯ A and over the D it is F♯ A C♯ E, which is the Gmaj7 ↔ Dmaj7 that the piece is known by.
//   THE RIGHT HAND IS THE MELODY'S ARC over that, set from the shape of the piece rather than
//   lifted off a plate: the long notes, the rise to the C♯ and the fall back to the D. It is
//   recognisably the Gymnopédie and it is not an urtext, and this note is here so that nobody has
//   to guess which.
//
// HOW IT IS WRITTEN. `{ m, at, len, hand }`: m is the MIDI number (A4 = 69 = 440 Hz), `at` is the
// beat it starts on counting from 0, `len` is how many beats it is held, and `hand` is 'L' or 'R'.
// Beats, not seconds, so the tempo is one number. 24 bars of 3 beats at ♩ = 60 is 72 seconds, and
// then it starts again — the first four bars are the accompaniment alone, which is Satie's own
// opening and is also the four seconds the hands need to come into the frame.

export const TEMPO = 60; // ♩ per minute: "lent et douloureux", and the slowest thing this room does
export const BEAT = 60 / TEMPO; // one second
export const METRE = 3;
export const BARS = 24;
export const LOOP = BARS * METRE * BEAT; // 72 s

// the two chords, as MIDI numbers. The bass is an octave and a half below them, where Satie put it.
const G_BASS = 43; // G2
const G_CHORD = [59, 62, 66, 69]; // B3 D4 F♯4 A4
const D_BASS = 38; // D2
const D_CHORD = [54, 57, 61, 64]; // F♯3 A3 C♯4 E4

// the melody, bar by bar from bar 5 (the first four are the accompaniment alone), as
// [MIDI, beats] pairs filling each 3-beat bar. 78 is F♯5.
const MELODY = [
  [[78, 3]],            // 5   F♯5
  [[81, 3]],            // 6   A5
  [[80, 2], [78, 1]],   // 7   G♯5 F♯5
  [[76, 3]],            // 8   E5
  [[78, 3]],            // 9   F♯5
  [[81, 3]],            // 10  A5
  [[83, 2], [81, 1]],   // 11  B5 A5
  [[78, 3]],            // 12  F♯5
  [[81, 2], [83, 1]],   // 13  A5 B5
  [[85, 3]],            // 14  C♯6 — the top of the arch
  [[83, 2], [81, 1]],   // 15  B5 A5
  [[78, 3]],            // 16  F♯5
  [[76, 2], [74, 1]],   // 17  E5 D5
  [[73, 3]],            // 18  C♯5
  [[74, 3]],            // 19  D5
  [[74, 3]],            // 20  D5, and four bars of the left hand alone close the round
];

function build() {
  const out = [];
  for (let bar = 0; bar < BARS; bar++) {
    const b0 = bar * METRE;
    // THE LEFT HAND, every bar of the piece: the bass on one, the chord on two, and the chord held
    // for the two beats that are left — which is what makes the rock rather than a pulse.
    const odd = bar % 2 === 0;
    out.push({ m: odd ? G_BASS : D_BASS, at: b0, len: 1, hand: 'L' });
    for (const m of odd ? G_CHORD : D_CHORD) out.push({ m, at: b0 + 1, len: 2, hand: 'L' });
    // THE RIGHT HAND, from bar 5 to bar 20
    const line = MELODY[bar - 4];
    if (!line) continue;
    let at = b0;
    for (const [m, len] of line) {
      out.push({ m, at, len, hand: 'R' });
      at += len;
    }
  }
  return out.sort((a, b) => a.at - b.at || a.m - b.m);
}

/** Every note in the round, sorted by the beat it starts on. */
export const NOTES = build();

/** Middle A is 440; everything else is twelve equal steps from it. */
export const freqOf = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** What is sounding at beat `b`, as MIDI numbers, one list per hand. */
export function soundingAt(b, held = 0.02) {
  const L = [], R = [];
  for (const n of NOTES) {
    if (b < n.at - 1e-6 || b >= n.at + n.len - held) continue;
    (n.hand === 'L' ? L : R).push(n.m);
  }
  return { L, R };
}

/** …and which notes START in [from, to) — what a drawing has to strike. */
export function struckIn(from, to) {
  return NOTES.filter((n) => n.at >= from - 1e-6 && n.at < to - 1e-6);
}
