// piano-song — WHAT HIS HANDS PLAY. Note data and nothing else: no audio, no DOM, no THREE.
//
// GYMNOPÉDIE No. 1, Erik Satie, 1888, "Lent et douloureux" — the WHOLE of it, 78 bars in 3/4, and
// this time it really is the piece. The user, on the last cut: "he's not really playing Gymnopédie
// — it's a very broken-down version that is unrecognisable." It was: the left hand rocked G–D under
// a Gmaj7 and a Dmaj7 for twenty-four bars while the right hand played an ARC somebody had drawn
// from the shape of the piece. The arc is gone. Every note below is Satie's.
//
// WHERE IT CAME FROM, because on a claim like that the source is half the work. The table is parsed
// — by tools/_piano-score.mjs, which will do it again on demand — out of the Mutopia Project's
// LilyPond engraving of the piece, https://www.mutopiaproject.org/ftp/SatieE/gymnopedie_1/, which
// carries `license = "Public Domain"`, `date = "1888"` and `source = "Dover Edition"`, a
// reproduction of the original Rouart engraving. Its three voices are the three things on the page:
// the melody, the accompaniment's chords, the bass. AND IT IS CHECKED AGAINST A SECOND READING OF
// THE SAME ENGRAVING: LilyPond's own MIDI of that file is parsed too, and all 282 note-ons over the
// 47 written bars — every pitch on every beat — agree with this table, or the tool fails.
//
// THE VOLTA, which is where the 78 bars come from. The engraving is 47 bars on the page: a body of
// 31, then a first ending of 8 and a second of 8. Played, that is body, first ending, body, second
// ending: 31 + 8 + 31 + 8 = 78. `PLAY`, below, is that sentence as a list of bar numbers, and it is
// the only place the repeat exists.
//
// WHAT IS ACTUALLY IN IT, since the old header got this wrong in a way worth naming:
//   THE HARMONY MOVES. Gmaj7 ↔ Dmaj7 is the first SIXTEEN bars and no more. Bar 17 goes to F♯,
//   bar 18 to B, bars 19–21 to E and D, and from bar 22 the piece is somewhere else entirely — the
//   chords come down onto the bass staff, four notes wide, over an A, and walk through C, F and G
//   naturals that the two sharps of the key signature never had.
//   THE MELODY ENTERS ON THE SECOND BEAT of bar 5, not the first, and it does not hold the bar: it
//   is F♯–A, G–F♯–C♯, B–C♯–D in quarters, then a dotted-half A, and then ONE F♯ tied across four
//   bars. The tie is the whole character of the thing and there was not a single one of them here.
//   IT ENDS IN D MINOR. The first ending closes on D–F♯–A–D and turns back for the repeat; the
//   second, which is the end of the piece, closes on D–F–A–D. The F is natural. (The brief for this
//   round said D major, and the engraving says otherwise: `<d a f d>`, with `f` and not `fis`.)
//
// HOW IT IS WRITTEN. `{ m, at, len, hold, hand }`: m is the MIDI number (A4 = 69 = 440 Hz), `at` is
// the beat it starts on counting from 0, `len` is how long the note SOUNDS — the score's own value,
// which is what the audio is given — `hold` is how long a finger stays on the key, and `hand` is
// 'L' or 'R'. Beats, not seconds, so the tempo is one number.
//
// WHY `hold` IS NOT `len`, and it is the one thing here that is not on the page. Satie's
// accompaniment is a dotted-half bass on the first beat and a chord on the second, and the bass
// lasts the bar: on a real instrument the SUSTAINING PEDAL holds it while the left hand jumps an
// octave and a half up to the chord. No hand holds both — G2 to F♯4 is thirteen and a half white
// keys and this one reaches seven and a half (piano-hands.js: 180 mm of stretch over a 23.5 mm
// white key, which is what `REACH` below is). So a note's key is released at the first moment its
// own hand is asked for something it cannot hold with it, and the string goes on sounding, which is
// what a pedal is. Everything else is held for
// its written length — including the melody's F♯ across bars 9 to 12, which is one finger on one
// key for twelve beats while the left hand rocks underneath it.
//
// A NOTE ALREADY DOWN IS NOT STRUCK TWICE. Satie doubles the melody's long F♯ at the top of the
// accompanying chord: bars 9–12 hold F♯4 in the right hand and put F♯4 in the left hand's chord as
// well. That is one key. A finger coming down on a key another finger is holding sounds nothing at
// all, so the chord's copy is dropped and the melody keeps the note — which is exactly what happens
// under a pair of hands, and is the only kind of note in the engraving this file does not play.
export const TEMPO = 66; // ♩ per minute
// "Lent et douloureux" and no metronome mark: Satie left the tempo to whoever is at the keyboard,
// and the piece is played anywhere between about ♩ = 60 and ♩ = 76. 66 is the middle of that, it
// puts the whole thing at 3 minutes 33, and it leaves the shortest note in the piece — there is
// nothing quicker than a quarter anywhere in it, in either hand — 0.909 s, which is ELEVEN drawings
// at twelve a second: a hand can be seen to arrive, press and leave on every note of it.
export const BEAT = 60 / TEMPO; // 0.909 s
export const METRE = 3;
export const BARS = 78;
export const LOOP = BARS * METRE * BEAT; // 212.7 s — the piece, and then it begins again

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE TABLE. 47 written bars, in the order they are printed: 1–31 the body, then the two endings.
// Everything is a MIDI number.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// THE BASS: what stands on the first beat of the bar and lasts it, one dotted half — except at the
// close of either ending, where it is two notes and then three.
const BASS = [
  [43], [38], [43], [38], [43], [38], [43], [38],           // 1–8    G2 D2, the rocking fifth
  [43], [38], [43], [38], [43], [38], [43], [38],           // 9–16   …and again, under the long F♯
  [42], [35], [40], [40], [38],                             // 17–21  F♯2 B1 E2 E2 D2
  [33], [38], [38], [38], [38],                             // 22–26  A1, then D2 for ten bars
  [38], [38], [38], [38], [38],                             // 27–31
  [40], [42], [35], [40], [40], null, [45, 55], [38, 45, 50], // 32–39  the first ending
  [40], [40], [40], [40], [40], null, [45, 55], [38, 45, 50], // 71–78  the second
];
// THE CHORDS: what comes in on the second beat and lasts two. `[]` is a bar with none; `null` is
// the bar that breaks the pattern (see WALK).
const CHORD = [
  [59, 62, 66], [57, 61, 66], [59, 62, 66], [57, 61, 66],   // 1–4    Gmaj7 ↔ Dmaj7: B D F♯ / A C♯ F♯
  [59, 62, 66], [57, 61, 66], [59, 62, 66], [57, 61, 66],   // 5–8
  [59, 62, 66], [57, 61, 66], [59, 62, 66], [57, 61, 66],   // 9–12
  [59, 62, 66], [57, 61, 66], [59, 62, 66], [57, 61, 66],   // 13–16
  [57, 61, 66], [59, 62, 66],                               // 17–18  and here the pair breaks step
  [55, 59], [59, 62, 67], [53, 57, 62],                     // 19–21  down onto the bass staff
  [57, 60, 64], [55, 59, 64], [50, 55, 59, 64],             // 22–24  A C E / G B E / D G B E
  [48, 52, 57, 62], [48, 54, 57, 62],                       // 25–26  C E A D / C F♯ A D
  [57, 60, 65], [57, 60, 64], [50, 55, 59, 64],             // 27–29
  [48, 52, 57, 62], [48, 54, 57, 62],                       // 30–31
  [59, 64, 67], [57, 61, 66], [59, 62, 66], [61, 64, 69],   // 32–35  the first ending
  [57, 61, 66, 69], null, [], [],                           // 36–39
  [59, 64, 67], [57, 62, 65, 69], [57, 60, 65], [60, 64, 69], // 71–74 the second, with F naturals
  [57, 60, 65, 69], null, [], [],                           // 75–78
];
// THE MELODY, bar by bar, as [beat in the bar, how long, …pitches]. A length may run past the bar
// line: that is a tie, and there are four of them — the F♯ over bars 9–12, the E over 19–21 and the
// D over 25–26 and 30–31.
const MELODY = [
  [], [], [], [],                                           // 1–4    the accompaniment alone
  [[1, 1, 78], [2, 1, 81]],                                 // 5      F♯5 A5, off the second beat
  [[0, 1, 79], [1, 1, 78], [2, 1, 73]],                     // 6      G5 F♯5 C♯5
  [[0, 1, 71], [1, 1, 73], [2, 1, 74]],                     // 7      B4 C♯5 D5
  [[0, 3, 69]],                                             // 8      A4
  [[0, 12, 66]], [], [], [],                                // 9–12   F♯4, tied across all four
  [[1, 1, 78], [2, 1, 81]],                                 // 13     and the phrase again
  [[0, 1, 79], [1, 1, 78], [2, 1, 73]],                     // 14
  [[0, 1, 71], [1, 1, 73], [2, 1, 74]],                     // 15
  [[0, 3, 69]],                                             // 16
  [[0, 3, 73]],                                             // 17     C♯5
  [[0, 3, 78]],                                             // 18     F♯5
  [[0, 9, 64]], [], [],                                     // 19–21  E4, tied across three
  [[0, 1, 69], [1, 1, 71], [2, 1, 72]],                     // 22     A4 B4 C5 — the C is natural
  [[0, 1, 76], [1, 1, 74], [2, 1, 71]],                     // 23     E5 D5 B4
  [[0, 1, 74], [1, 1, 72], [2, 1, 71]],                     // 24     D5 C5 B4
  [[0, 5, 74]], [[2, 1, 74]],                               // 25–26  D5 tied over the bar, then D5
  [[0, 1, 76], [1, 1, 77], [2, 1, 79]],                     // 27     E5 F5 G5
  [[0, 1, 81], [1, 1, 72], [2, 1, 74]],                     // 28     A5 C5 D5 — the top of the piece
  [[0, 1, 76], [1, 1, 74], [2, 1, 71]],                     // 29     E5 D5 B4
  [[0, 5, 74]], [[2, 1, 74]],                               // 30–31
  [[0, 3, 79]],                                             // 32     the first ending: G5
  [[0, 3, 78]],                                             // 33     F♯5
  [[0, 1, 71], [1, 1, 69], [2, 1, 71]],                     // 34     B4 A4 B4
  [[0, 1, 73], [1, 1, 74], [2, 1, 76]],                     // 35     C♯5 D5 E5
  [[0, 1, 73], [1, 1, 74], [2, 1, 76]],                     // 36
  [[0, 3, 66]],                                             // 37     F♯4 held over the walking bass
  [[0, 3, 72, 69, 64, 60]],                                 // 38     C5 A4 E4 C4
  [[0, 3, 74, 69, 66, 62]],                                 // 39     D5 A4 F♯4 D4 — D major, and back
  [[0, 3, 79]],                                             // 71     the second ending: G5
  [[0, 3, 77]],                                             // 72     F5, where the first had F♯5
  [[0, 1, 71], [1, 1, 72], [2, 1, 77]],                     // 73     B4 C5 F5
  [[0, 1, 76], [1, 1, 74], [2, 1, 72]],                     // 74     E5 D5 C5
  [[0, 1, 76], [1, 1, 74], [2, 1, 72]],                     // 75
  [[0, 3, 65]],                                             // 76     F4
  [[0, 3, 72, 69, 64, 60]],                                 // 77     C5 A4 E4 C4
  [[0, 3, 74, 69, 65, 62]],                                 // 78     D5 A4 F4 D4 — D minor, and out
];
// THE ONE BAR THAT BREAKS THE PATTERN, the sixth of either ending (the 37th written bar and the
// 45th, which are the same bar twice): the bass walks E2–B2–E3 in quarters and two quarter chords
// come in over it. It is also the one place in the piece where the chords cannot be the left
// hand's — it is busy walking — so they go to the right, which is holding one long F♯ and has three
// fingers free. That is how it is fingered on a real keyboard and it is what `CHORDS_RIGHT` says.
const WALK = {
  bass: [[0, 3, 40], [1, 1, 47], [2, 1, 52]],
  chords: [[1, 1, 57, 62], [2, 1, 59, 62, 67]],
};
// the written bars, in the order they are PLAYED: body, first ending, body again, second ending
const BODY = 31, END = 8;
const PLAY = [];
for (let i = 0; i < BODY; i++) PLAY.push(i);
for (let i = 0; i < END; i++) PLAY.push(BODY + i);
for (let i = 0; i < BODY; i++) PLAY.push(i);
for (let i = 0; i < END; i++) PLAY.push(BODY + END + i);
// …and the two played bars whose chords belong to the right hand, in the unfolded numbering
const CHORDS_RIGHT = new Set([37, 76]);

// ---- what a hand can hold ------------------------------------------------------------------------
// A white key is 23.5 mm and the drawing reaches 180 mm with both outer digits swung as far as they
// go (piano-hands.js, HAND.span and SWING), which is seven and a half white keys. Five digits, and
// no more.
const WHITE = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
const white = (m) => Math.floor(m / 12) * 7 + WHITE[m % 12];
const REACH = 180 / 23.5;
const holdable = (ms) => ms.length <= 5 && Math.max(...ms.map(white)) - Math.min(...ms.map(white)) <= REACH;

function build() {
  const out = [];
  const put = (hand, m, at, len) => out.push({ m, at, len, hold: len, hand });
  for (let i = 0; i < PLAY.length; i++) {
    const w = PLAY[i], b0 = i * METRE, odd = BASS[w] === null;
    for (const [at, len, ...ms] of odd ? WALK.bass : BASS[w].map((m) => [0, 3, m])) {
      for (const m of ms) put('L', m, b0 + at, len);
    }
    const chordHand = CHORDS_RIGHT.has(i + 1) ? 'R' : 'L';
    for (const [at, len, ...ms] of odd ? WALK.chords : (CHORD[w].length ? [[1, 2, ...CHORD[w]]] : [])) {
      for (const m of ms) put(chordHand, m, b0 + at, len);
    }
    for (const [at, len, ...ms] of MELODY[w]) for (const m of ms) put('R', m, b0 + at, len);
  }
  out.sort((a, b) => a.at - b.at || a.m - b.m);

  // …and then the two things a pair of hands does to a page of music (see the header): a key is let
  // go when its own hand is asked for something it cannot hold with it, and a key that is already
  // down is not struck again.
  const holds = () => {
    for (const n of out) {
      n.hold = n.len;
      const mine = out.filter((o) => o.hand === n.hand && o.at > n.at + 1e-9 && o.at < n.at + n.len - 1e-9);
      for (const t of [...new Set(mine.map((o) => o.at))].sort((a, b) => a - b)) {
        const together = [n.m, ...mine.filter((o) => o.at === t).map((o) => o.m)];
        if (!holdable(together)) { n.hold = +(t - n.at).toFixed(6); break; }
      }
    }
  };
  holds();
  const doubled = out.filter((n) =>
    out.some((o) => o.hand !== n.hand && o.m === n.m && o.at < n.at - 1e-9 && o.at + o.hold > n.at + 1e-9));
  for (const n of doubled) out.splice(out.indexOf(n), 1);
  holds();
  return out;
}

/** Every note of the piece, sorted by the beat it starts on. */
export const NOTES = build();

/** Middle A is 440; everything else is twelve equal steps from it. */
export const freqOf = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * WHOSE KEYS ARE DOWN at beat `b`, as MIDI numbers, one list per hand — which is `hold` and not
 * `len`: a string still ringing under the pedal is not a finger on a key, and this is what the
 * drawing is made of.
 */
export function soundingAt(b, held = 0.02) {
  const L = [], R = [];
  for (const n of NOTES) {
    if (b < n.at - 1e-6 || b >= n.at + n.hold - held) continue;
    (n.hand === 'L' ? L : R).push(n.m);
  }
  return { L, R };
}

/** …and which notes START in [from, to) — what a drawing has to strike. */
export function struckIn(from, to) {
  return NOTES.filter((n) => n.at >= from - 1e-6 && n.at < to - 1e-6);
}
