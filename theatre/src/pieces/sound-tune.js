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
// (a struck music box has 20 dB of crest; a reed drone has 15). It ducks to 0.34 under Pepe's
// spoken voice, it goes behind the door with the room tone until the leaf arrives, and it never
// fades — it is cut in and cut out, like everything else here.
//
// ONE DEPARTURE FROM `nothing fades in`, stated out loud: a struck tine is at level on its first
// sample and this file keeps that, but a sustained voice (the reed, the mains hum, the dial tone)
// takes a 6–30 ms ramp. That is a de-click, not a swell. There are no crossfades and no phrase ever
// swells or dies away under another one.
import { mulberry32 } from '../core/rng.js';
import { noise, shaper } from './sound-core.js';

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

// ---- the workshop: what the instruments are made of ------------------------------------------------
// A real instrument is three things at once, and the old bank had only the first: a vibrating
// thing (a tine, a string, a reed), the body it is fixed to (a box, a soundboard), and the noise of
// the mechanism that sets it going (a pin, a hammer, a bellows). Everything below builds one of
// the three, and every one of them is deterministic: a tine is mistuned the same way every time
// it is struck, because the comb was cut once.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const nyq = (ac) => ac.sampleRate * 0.45;
function zg(ac, v = 0) {
  const g = ac.createGain();
  g.gain.value = v;
  return g;
}
function bq(ac, type, freq, q = 0.7, gain = 0) {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = Math.min(freq, nyq(ac));
  f.Q.value = q;
  if (gain) f.gain.value = gain;
  return f;
}

// A sine at a fixed amplitude, as a PeriodicWave: the second and third strings of a note can then be
// quieter than the first without a gain node each. And a pulse at a given duty, for the line.
const waveCache = new WeakMap();
function wavesOf(ac) {
  let m = waveCache.get(ac);
  if (!m) waveCache.set(ac, (m = new Map()));
  return m;
}
function sineAt(ac, amp) {
  const q = Math.round(clamp(amp, 0.05, 1) * 40) / 40;
  const m = wavesOf(ac);
  const k = 's' + q;
  if (!m.has(k)) m.set(k, ac.createPeriodicWave(new Float32Array([0, 0]), new Float32Array([0, q]), { disableNormalization: true }));
  return m.get(k);
}
function pulseWave(ac, duty) {
  const m = wavesOf(ac);
  const k = 'p' + duty;
  if (!m.has(k)) {
    const N = 40;
    const re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) re[n] = (2 * Math.sin(n * Math.PI * duty)) / (n * Math.PI);
    m.set(k, ac.createPeriodicWave(re, im));
  }
  return m.get(k);
}

// ---- bodies: impulse responses made once per context ------------------------------------------------
// A body is a convolution with a short impulse response built here out of decaying modes and a
// little decaying noise — the same way sound-core builds the room, but a few centimetres across.
function addRing(d, sr, hz, amp, t60, phase = 0) {
  if (hz <= 0 || hz >= sr * 0.45) return;
  const w = (2 * Math.PI * hz) / sr, c = Math.cos(w), s = Math.sin(w);
  const r = Math.exp(-6.9078 / (t60 * sr));
  let x = Math.cos(phase) * amp, y = Math.sin(phase) * amp;
  const n = Math.min(d.length, Math.ceil(t60 * 1.15 * sr));
  for (let i = 0; i < n; i++) {
    d[i] += y;
    const nx = (x * c - y * s) * r;
    y = (x * s + y * c) * r;
    x = nx;
  }
}
function addHiss(d, sr, amp, t60, lpHz, rng) {
  const r = Math.exp(-6.9078 / (t60 * sr));
  const a = 1 - Math.exp((-2 * Math.PI * lpHz) / sr);
  let e = amp, y = 0;
  const n = Math.min(d.length, Math.ceil(t60 * 1.15 * sr));
  for (let i = 0; i < n; i++, e *= r) {
    y += a * ((rng() * 2 - 1) - y);
    d[i] += y * e * 2;
  }
}
const IR = {
  // THE MUSIC BOX'S CASE: a walnut box about 12 × 8 × 6 cm with a spruce floor the comb is screwed
  // to. The tine barely moves air on its own; what you hear is this floor. Plate modes from 350 Hz
  // up, short (a few tens of ms), and almost nothing below 300 Hz, which a box that size cannot make.
  box: { seconds: 0.3, seed: 12, direct: 0.35, build(d, sr, rng) {
    for (const [f, a, t60] of [[352, 0.7, 0.085], [521, 1, 0.07], [786, 0.9, 0.06], [1118, 0.85, 0.05], [1537, 0.6, 0.045], [2090, 0.5, 0.036], [2870, 0.42, 0.03], [3720, 0.28, 0.022], [5150, 0.16, 0.016]])
      addRing(d, sr, f * (0.98 + 0.04 * rng()), a, t60, rng() * 6.283);
    addHiss(d, sr, 0.35, 0.045, 6500, rng);
  } },
  // THE SPINET'S SOUNDBOARD AND CASE: a small board, dense in modes, ringing a quarter of a second at
  // the bottom and a few hundredths at the top, with the case's own boom near 165 and 290 Hz — the
  // boxy low-mid that says upright and not grand.
  board: { seconds: 0.55, seed: 1888, direct: 0.5, build(d, sr, rng) {
    for (let i = 0; i < 40; i++) {
      const f = 85 * Math.pow(5200 / 85, (i + rng()) / 40);
      addRing(d, sr, f, (0.45 + 0.55 * rng()) / (1 + f / 2400), clamp(0.07 * Math.sqrt(200 / f), 0.015, 0.08), rng() * 6.283);
    }
    addRing(d, sr, 166, 0.7, 0.06, 0.3);
    addRing(d, sr, 291, 0.5, 0.05, 1.9);
    addHiss(d, sr, 0.25, 0.07, 3800, rng);
  } },
  // THE ZITHER'S BODY for the mechanism's plucked string: a shallow wooden box, a little bigger than
  // the music box's, so its modes start lower and ring a little longer.
  zither: { seconds: 0.35, seed: 77, direct: 0.45, build(d, sr, rng) {
    for (const [f, a, t60] of [[212, 1, 0.12], [334, 0.8, 0.1], [471, 0.9, 0.085], [693, 0.7, 0.065], [987, 0.6, 0.05], [1410, 0.45, 0.04], [2080, 0.3, 0.03], [3010, 0.2, 0.02]])
      addRing(d, sr, f * (0.98 + 0.04 * rng()), a, t60, rng() * 6.283);
    addHiss(d, sr, 0.3, 0.05, 5000, rng);
  } },
  // THE PEDAL, as the rest of the piano: with the dampers off, every string on the frame is free to
  // answer whatever is played. This is that frame — a narrow decaying resonance at every key's
  // first two partials, tuned exactly as the keys are (spinetKey, below), so a struck note sets
  // ringing its octaves and fifths, a little out of tune with it, which is the halo a pedalled
  // upright has. Not normalised: each resonance peaks at unity gain, and the send sets the level.
  sym: { seconds: 1.5, seed: 5, raw: true, build(d, sr, rng) {
    for (let key = 28; key <= 100; key++) {
      const K = spinetKey(440 * Math.pow(2, (key - 69) / 12));
      for (const n of [1, 2]) {
        const fn = n * K.f * Math.sqrt(1 + K.B * n * n);
        const t60 = Math.min(1.2, K.T1 * 0.3) / n;
        const tau = t60 / 6.9078;
        addRing(d, sr, fn, (2 / (tau * sr)) * (n === 1 ? 1 : 0.6), t60, rng() * 6.283);
      }
    }
  } },
};
const irCache = new WeakMap();
function irOf(ac, name) {
  let m = irCache.get(ac);
  if (!m) irCache.set(ac, (m = {}));
  if (m[name]) return m[name];
  const spec = IR[name], sr = ac.sampleRate;
  const n = Math.ceil(spec.seconds * sr);
  const b = ac.createBuffer(1, n, sr);
  const d = b.getChannelData(0);
  spec.build(d, sr, mulberry32(spec.seed));
  const fade = Math.floor(n * 0.15);
  for (let i = 0; i < fade; i++) d[n - 1 - i] *= i / fade;
  if (!spec.raw) {
    let e = 0;
    for (let i = 0; i < n; i++) e += d[i] * d[i];
    const k = Math.sqrt(1 - spec.direct * spec.direct) / Math.sqrt(e || 1);
    for (let i = 0; i < n; i++) d[i] *= k;
    d[0] += spec.direct;
  }
  return (m[name] = b);
}
// a body: the dry path and the convolved path, summed, into `dest`; returns the input
function body(ac, dest, name, { dry = 0.5, wet = 0.8, hp = 0 } = {}) {
  const input = zg(ac, 1);
  const d = zg(ac, dry), w = zg(ac, wet);
  const c = ac.createConvolver();
  c.normalize = false;
  c.buffer = irOf(ac, name);
  input.connect(d);
  input.connect(c);
  c.connect(w);
  let out = dest;
  if (hp) {
    out = bq(ac, 'highpass', hp, 0.6);
    out.connect(dest);
  }
  d.connect(out);
  w.connect(out);
  return input;
}

// ---- the string -----------------------------------------------------------------------------------
// One vibrating string, or a unison of two or three, as its partials. Each partial is a sine per
// string (so the strings of a unison BEAT, on the partials where they are listed), under an envelope
// of its own, and the envelope has two stages when there is more than one string: the PROMPT sound,
// while the strings move together and hand their energy to the board quickly, and the AFTERSOUND,
// once they have drifted out of phase and the board can no longer drain them. That knee, ten dB or
// so down in the first half-second, is most of why a piano note is not a bell.
//   parts:  [{ n, fn, a, T }] — partial number, frequency, amplitude, T60 of the aftersound
//   unison: cents of each string (strings after the first are quieter, via sineAt)
//   beatN:  the partials that get the whole unison; the rest are one sine
//   after:  the aftersound's share of the level (1 = one stage)
//   cut:    audio time a damper lands, or Infinity
function strike(ac, out, { t, parts, unison = [0], beatN = 2, after = 1, cut = Infinity, seed = 1 }) {
  // each partial is already moving when the string is struck — started a random fraction of a cycle
  // early under a shut gain — so the note is at level on its first sample with no spike in it
  const ph = mulberry32((seed * 40503) >>> 0);
  // a partial is let go once it is 50 dB under the LOUDEST partial, not under itself: a quiet
  // upper partial needs a fraction of the time, and the oscillator count under a pedalled chord
  // is what a phone pays for
  let amax = 0;
  for (const p of parts) amax = Math.max(amax, p.a);
  let last = t;
  for (const { n, fn, a, T } of parts) {
    if (a < amax * 0.02) continue;
    const D = Math.max(15, 50 - 20 * Math.log10(amax / a));
    const early = Math.max(0, t - ph() / fn);
    const S = n <= beatN ? unison.length : 1;
    let sum = 0;
    for (let s = 0; s < S; s++) sum += s === 0 ? 1 : Math.round(clamp(0.8 - 0.12 * s, 0.05, 1) * 40) / 40;
    const A = a / sum;
    const g = zg(ac);
    g.gain.setValueAtTime(A, t);
    let tEnd;
    if (after < 1) {
      const tau = Math.min(0.35, T * 0.035);
      const plateau = A * after;
      const t2 = t + 3 * tau;
      g.gain.setTargetAtTime(plateau, t, tau);
      g.gain.setValueAtTime(plateau + (A - plateau) * Math.exp(-3), t2);
      tEnd = t2 + (T * Math.max(5, D + 20 * Math.log10(after))) / 60;
    } else tEnd = t + (T * D) / 60;
    g.gain.exponentialRampToValueAtTime(A * Math.pow(10, -D / 20), tEnd);
    const stop = Math.min(tEnd, cut + 0.3) + 0.02;
    g.connect(out);
    for (let s = 0; s < S; s++) {
      const o = ac.createOscillator();
      if (s > 0) o.setPeriodicWave(sineAt(ac, 0.8 - 0.12 * s));
      o.frequency.value = fn;
      if (S > 1 && unison[s]) o.detune.value = unison[s];
      o.connect(g);
      o.start(early);
      o.stop(stop);
    }
    last = Math.max(last, stop);
  }
  return last;
}

// A burst from the shared noise buffer through a filter: a pin, a hammer, a finger. At level on its
// first sample, gone in `dur`.
function knock(ac, dest, { t, level, dur, type = 'bandpass', freq, q = 0.8, seed = 1 }) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac, 'white');
  const f = bq(ac, type, freq, q);
  const g = zg(ac);
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(Math.max(1e-7, level * 0.001), t + dur);
  g.gain.setValueAtTime(0, t + dur + 0.002);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  const r = mulberry32((seed * 2654435761) >>> 0);
  src.start(t, r() * 1.8, dur + 0.01);
  return g;
}

// A plucked string (the line's bass, the mechanism's zither). The pluck point sets the spectrum —
// a string pulled at a fifth of its length has no fifth partial — and a pulled string's partials
// fall as 1/n², where a hammered one's fall nearer 1/n.
function stringPluck(ac, dest, { t, freq, level, T60, beta = 0.2, tilt = 1.8, B = 0.0002, unison = [0], nMax = 10, knockAt = 0.1, seed = 1 }) {
  const top = Math.min(nyq(ac), 9000);
  const parts = [];
  let e = 0;
  for (let n = 1; n <= nMax; n++) {
    const fn = n * freq * Math.sqrt(1 + B * n * n);
    if (fn >= top) break;
    const a = Math.abs(Math.sin(n * Math.PI * beta)) / Math.pow(n, tilt);
    if (a < 0.002) continue;
    parts.push({ n, fn, a, T: T60 / (1 + 0.35 * (n - 1) + (fn / 3000) ** 2) });
    e += a * a;
  }
  const out = zg(ac);
  out.gain.setValueAtTime(level / Math.sqrt(e || 1), t);
  out.connect(dest);
  if (knockAt) knock(ac, dest, { t, level: level * knockAt, dur: 0.012, freq: Math.min(4200, freq * 6 + 900), q: 0.9, seed });
  return strike(ac, out, { t, parts, unison, beatN: 2, after: unison.length > 1 ? 0.55 : 1, seed });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE TINE. A comb tooth is a steel cantilever, clamped at the root and free at the tip, and a
// cantilever's modes are not harmonic: the second bending mode sits 6.27 times above the first and
// the third 17.5 times (a real tine, filed and weighted with lead, lands near those and never on
// them — fixed per tine, below). The pin lifts the tip and lets go, which is a click with the tine
// already at full swing: level on the first sample. The upper modes die in tenths of a second, the
// fundamental rings for seconds (longer at the bass end of the comb, where the teeth are long and
// weighted), and on a good box each note has TWO teeth cut to the same pitch and not quite, so it
// beats slowly, once or twice a second — the shimmer a music box has and a sine does not.
// The tine is heard through the box (lines.box, built in makeTune), which is where its wood is.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function tine(ac, dest, { t, freq, level, dur = 0, seed = 1 }) {
  const r = mulberry32(Math.round(freq * 13) + 7); // per TOOTH: the comb was cut once
  const top = nyq(ac);
  const T = Math.max(clamp(3.8 * Math.pow(620 / freq, 0.62), 1.2, 5.5), dur * 0.9);
  const end = t + T;
  // the pair: two teeth for one note, the second a little quieter and a fraction of a hertz away
  const beat = 0.35 + 1.9 * r();
  const second = 0.45 + 0.35 * r();
  const lv = level / (1 + second);
  const g = zg(ac);
  g.gain.setValueAtTime(lv, t);
  g.gain.exponentialRampToValueAtTime(lv * 0.001, end);
  g.gain.setValueAtTime(0, end + 0.01);
  g.connect(dest);
  const o1 = ac.createOscillator();
  o1.frequency.value = freq;
  o1.connect(g);
  const o2 = ac.createOscillator();
  o2.frequency.value = freq + beat;
  const g2 = zg(ac, second);
  o2.connect(g2);
  g2.connect(g);
  // released from full swing: the tine is at the top of its travel when the pin lets it go, so it
  // speaks at full level on its first sample (started a quarter-cycle early under a shut gain)
  for (const o of [o1, o2]) {
    o.start(Math.max(0, t - 0.25 / freq));
    o.stop(end + 0.02);
  }
  // the upper modes: [ratio, level, T60]. The bass teeth carry lead weights and clang more.
  const clang = freq < 520 ? 1.35 : 1;
  for (const [ratio, amp, t60] of [
    [6.02 + 0.5 * r(), 0.3 * clang, Math.min(0.55, T * 0.14)], // the second bending mode
    [16.8 + 1.4 * r(), 0.1 * clang, 0.09], // the third
    [2.85 + 0.9 * r(), 0.04, T * 0.3], // a twisting mode, faint: the steel's sheen
  ]) {
    const fm = freq * ratio;
    if (fm >= top) continue;
    const o = ac.createOscillator();
    o.frequency.value = fm;
    const og = zg(ac);
    og.gain.setValueAtTime(amp * (1 + second), t);
    og.gain.exponentialRampToValueAtTime(amp * 0.001, t + t60);
    o.connect(og);
    og.connect(g);
    o.start(t);
    o.stop(t + t60 + 0.02);
  }
  // the pin slipping off the tip
  knock(ac, dest, { t, level: level * 0.2, dur: 0.01, freq: Math.min(top * 0.9, 3400 + freq * 1.2), q: 0.9, seed });
  return end;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE PIANO — an old upright spinet, in the corner, and nobody has tuned it for a while.
//   THE KEY. Every key is out by a few cents of its own (fixed, per key), the octaves are stretched
//   the way every piano's are and a short-stringed one's more, and the two or three strings of one
//   note disagree by a cent or three — more than a tuner would leave, which is the character.
//   THE STRING IS STIFF: partial n lands at n·f·√(1+Bn²), and B climbs up the keyboard (short
//   treble wire) and again at the very bottom (a spinet's stubby wound bass), so the top rings
//   glassy and the bass a little clangy.
//   THE HAMMER. Felt, striking an eighth of the way along: the partials fall off as 1/n in the bass
//   and faster up the top (a harder, smaller hammer on a shorter string gives fewer of them), the
//   partial at the strike point is missing, and there is a knock — the felt on the wire and the key
//   on its bed — that is relatively louder in the treble, where the tone is thin.
//   THE UNISON. Bichords in the bass, trichords above: the strings beat on the lower partials, and
//   the note decays in two stages (prompt, then aftersound — see `strike`).
//   THE BOARD. A spinet's soundboard is small, so it barely radiates the bottom octave: the bass
//   fundamentals are thin and the second and third partials carry the pitch. Everything goes out
//   through the board's own impulse response (IR.board), with its boxy case resonance.
//   THE PEDAL. Down, as Satie needs it: the ring is set by the string's own pitch (8 s at the
//   bottom, 1.1 s at the top), not by how long the key is held, and the rest of the strings answer
//   sympathetically (IR.sym). `pedal: false` drops the damper at the note's own length.
// `dur` is how long the key is held; with the pedal down that is a fact about the hands.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function spinetKey(freq) {
  const m = 69 + 12 * Math.log2(freq / 440);
  const key = Math.round(m);
  const r = mulberry32(key * 9173 + 71);
  const cents = (r() - 0.5) * 9 + (m - 60) * 0.13;
  const f = freq * Math.pow(2, cents / 1200);
  const spread = 0.7 + 2.6 * r();
  const strings = key < 34 ? 1 : key < 48 ? 2 : 3;
  const unison = strings === 1 ? [0] : strings === 2 ? [-spread / 2, spread / 2] : [-spread / 2, (r() - 0.5) * spread * 0.5, spread / 2];
  const B = 0.00022 * Math.pow(2, (m - 48) / 13) + 0.0012 * Math.pow(Math.max(0, (46 - m) / 16), 1.6);
  const T1 = clamp(7.1 * Math.pow(98 / f, 0.36), 1.1, 8) * 1.4; // the aftersound's T60 at the fundamental
  return { m, key, f, unison, strings, B, T1, r };
}
// The piano's gain into the tune bus, trimmed so the Gymnopédie measures what it did before this
// instrument was rebuilt (tools/_piano-render.mjs: 0.028 while playing).
const PIANO_GAIN = 0.297;
const SYM_SEND = 0.1;
const pianoRooms = new WeakMap();
function pianoRoom(ac, dest) {
  const p = pianoRooms.get(dest);
  if (p && p.ac === ac) return p;
  const input = body(ac, dest, 'board', { dry: 0.9, wet: 0.4 });
  const sym = zg(ac, SYM_SEND);
  const c = ac.createConvolver();
  c.normalize = false;
  c.buffer = irOf(ac, 'sym');
  sym.connect(c);
  c.connect(input);
  const room = { ac, input, sym };
  pianoRooms.set(dest, room);
  return room;
}
export function pianoNote(ac, dest, { t, freq, dur, level = 0.5, pedal = true }) {
  const K = spinetKey(Math.max(27.5, freq));
  const { m, f } = K;
  const top = Math.min(nyq(ac), 9000);
  const room = pianoRoom(ac, dest);
  const hi = clamp((m - 36) / 60, 0, 1); // 0 at C2, 1 at C7
  const beta = 0.125 - 0.03 * hi + (K.r() - 0.5) * 0.01;
  const tilt = 0.85 + 0.7 * hi;
  const felt = 1250 * Math.pow(2, (m - 40) / 24);
  const nMax = Math.round(clamp(14 - 0.17 * (m - 30), 3, 12));
  const parts = [];
  let e = 0;
  for (let n = 1; n <= nMax; n++) {
    const fn = n * f * Math.sqrt(1 + K.B * n * n);
    if (fn >= top) break;
    const rad = (fn * fn) / (fn * fn + 140 * 140);
    const a = (Math.abs(Math.sin(n * Math.PI * beta)) / Math.pow(n, tilt) / (1 + (fn / felt) ** 2)) * rad;
    if (a < 1e-3) continue;
    parts.push({ n, fn, a, T: K.T1 / (1 + 0.28 * (n - 1) + (fn / 2600) ** 2) });
    e += a * a;
  }
  const lv = level * PIANO_GAIN;
  const out = zg(ac);
  out.gain.setValueAtTime(lv / Math.sqrt(e || 1), t);
  const cut = pedal ? Infinity : t + Math.max(0.08, dur);
  if (!pedal) {
    out.gain.setValueAtTime(lv / Math.sqrt(e || 1), cut);
    out.gain.setTargetAtTime(0, cut, 0.035);
  }
  out.connect(room.input);
  if (pedal) out.connect(room.sym);
  // the hammer and the key: felt on wire, and wood on the key bed, both through the board
  const seed = K.key * 131 + Math.round(t * 997);
  knock(ac, room.input, { t, level: lv * (0.1 + 0.22 * hi), dur: 0.014 + 0.03 * (1 - hi), freq: Math.min(top, 380 + f * 1.4), q: 0.7, seed });
  knock(ac, room.input, { t, level: lv * 0.3, dur: 0.04, type: 'lowpass', freq: 170, q: 0.9, seed: seed + 1 });
  const after = K.strings === 1 ? 0.6 : K.strings === 2 ? 0.5 : 0.45;
  return strike(ac, out, { t, parts, unison: K.unison, beatN: 2, after, cut, seed: K.key });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE REED — the mechanism's harmonium. A free reed is a brass tongue swinging through a slot: its
// wave is a narrow, lopsided pulse, rich to the top, and the reed cell it sits in puts a broad
// formant under it. A harmonium's celeste stop sounds two reeds per note, tuned a hertz apart so
// the note beats slowly; and the bellows are pumped by feet, so the whole chord breathes. Sustained,
// so it takes a de-click ramp; never a swell.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function reed(ac, dest, { t, freq, dur, level, cut = 900, attack = 0.03, detune = 0 }) {
  const cel = 1200 * Math.log2(1 + 0.8 / freq);
  const o1 = ac.createOscillator();
  o1.type = 'sawtooth';
  const o2 = ac.createOscillator();
  o2.setPeriodicWave(pulseWave(ac, 0.28));
  const lp = bq(ac, 'lowpass', cut * 1.7, 0.5);
  const cell = bq(ac, 'peaking', 900, 1.1, 5);
  const g = zg(ac);
  const lv = level * 0.55;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(lv, t + attack);
  g.gain.setValueAtTime(lv, t + Math.max(attack, dur - attack));
  g.gain.linearRampToValueAtTime(0, t + dur);
  for (const [o, c] of [[o1, detune], [o2, detune + cel]]) {
    o.frequency.value = freq;
    if (c) o.detune.value = c;
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  lp.connect(cell);
  cell.connect(g);
  g.connect(dest);
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

function tuneA(ac, dest, bar, t0, level, lines = {}) {
  const beat = A_BEAT;
  const k = ((bar % A_BARS) + A_BARS) % A_BARS;
  const b0 = k * 3; // the loop's beat index at the top of this bar
  // every tooth of the comb goes out through the box's floor (built once, in makeTune)
  const note = (semis, at, len, lv, dur) =>
    tine(ac, lines.box ?? dest, {
      t: t0 + (at - b0) * beat,
      freq: hz(A_REF, semis + 12, boxCents(semis)), // the comb sounds an octave above the written line
      dur,
      level: level * lv,
      seed: 31 + at * 7 + semis,
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
    // a quarter-duty pulse, the hold-music chip's own voice, with a little vibrato that comes in
    // after the note has spoken (the 1.15 keeps it where the old full square sat over the bass)
    const o = ac.createOscillator();
    o.setPeriodicWave(pulseWave(ac, 0.25));
    o.frequency.setValueAtTime(hz(B_REF, semis), t);
    const vib = ac.createOscillator();
    vib.frequency.value = 5.1;
    const vg = zg(ac);
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(9, t + Math.min(0.35, dur * 0.6));
    vib.connect(vg);
    vg.connect(o.detune);
    vib.start(t);
    vib.stop(t + dur + 0.03);
    const g = ac.createGain();
    const lv = level * 0.30 * 1.15;
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
  // a gut string pulled a quarter of the way along, with the finger's own snap on it
  const bass = (semis, at, dur, lv) =>
    stringPluck(ac, dest, {
      t: t0 + at * beat,
      freq: hz(B_REF, semis),
      T60: dur * 1.4,
      level: level * lv,
      beta: 0.24,
      tilt: 1.5,
      B: 0.00012,
      nMax: 9,
      knockAt: 0.15,
      seed: 77 + k * 13 + semis,
    });
  bass(root, 0, 1.5, 0.42);
  bass(root + 7, 2, 1.1, 0.24);
  // and a chord chip on the off-beats of every other bar: the hold-music comp, quiet, on the wire
  if (k % 2 === 1)
    for (const off of [1.5, 3.5]) {
      const t = t0 + off * beat;
      for (const s of [root + 12, root + 15, root + 19]) {
        const o = ac.createOscillator();
        o.setPeriodicWave(pulseWave(ac, 0.125));
        o.frequency.setValueAtTime(hz(B_REF, s), t);
        const g = ac.createGain();
        const lv = level * 0.055 * 2.2;
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

function tuneC(ac, dest, bar, t0, level, lines = {}) {
  const u = ((bar % C_BARS) + C_BARS) % C_BARS;
  // the reed: a new pair of tones every 16 units, cut in, cut out, no crossfade — the chord
  // CHANGES, it does not dissolve into the next one
  if (u % C_CHORD_UNITS === 0) {
    const root = C_CHORDS[(u / C_CHORD_UNITS) % C_CHORDS.length];
    const dur = C_CHORD_UNITS * C_UNIT;
    // the bellows the three reeds share: pumped by feet, so the chord breathes a few percent, and
    // the air through the reed pans hisses a little under it
    const bel = zg(ac, 1);
    bel.connect(dest);
    const pump = ac.createOscillator();
    pump.frequency.value = 0.21 + 0.03 * ((u / C_CHORD_UNITS) % 3);
    const pg = zg(ac, 0.07);
    pump.connect(pg);
    pg.connect(bel.gain);
    pump.start(t0);
    pump.stop(t0 + dur + 0.05);
    const air = ac.createBufferSource();
    air.buffer = noise(ac, 'pink');
    air.loop = true;
    const af = bq(ac, 'bandpass', 1500, 0.6);
    const ag = zg(ac);
    ag.gain.setValueAtTime(0, t0);
    ag.gain.linearRampToValueAtTime(level * 0.03, t0 + 0.4);
    ag.gain.setValueAtTime(level * 0.03, t0 + dur - 0.4);
    ag.gain.linearRampToValueAtTime(0, t0 + dur);
    air.connect(af);
    af.connect(ag);
    ag.connect(bel);
    air.start(t0, (u * 0.37) % 1.5);
    air.stop(t0 + dur + 0.02);
    reed(ac, bel, { t: t0, freq: hz(C_REF, root), dur, level: level * 0.30, cut: 380, attack: 0.35, detune: -4 });
    reed(ac, bel, { t: t0, freq: hz(C_REF, root + 7), dur, level: level * 0.20, cut: 460, attack: 0.42, detune: 5 });
    reed(ac, bel, { t: t0, freq: hz(C_REF, root + 12), dur, level: level * 0.10, cut: 700, attack: 0.5 });
  }
  // the string, on the other cycle
  const p = u % 32;
  for (const [at, semis] of C_PLUCKS) {
    if (at !== p) continue;
    // a zither course: two steel strings to the note, pulled near the bridge, through its box. It
    // rings longer and fuller than the old triangle did, so it is played softer (× 0.34) to sit
    // where that one sat under the reeds, 12 dB down
    stringPluck(ac, lines.body ?? dest, {
      t: t0,
      freq: hz(C_REF, semis),
      T60: 3.2,
      level: level * 0.34 * 0.34,
      beta: 0.17,
      tilt: 1.7,
      B: 0.00015,
      unison: [-0.9, 0.9],
      nMax: 10,
      knockAt: 0.14,
      seed: 900 + u * 3 + semis,
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
    voices: ['comb tine: paired, beating steel teeth with cantilever modes and a pin click, through the box floor', 'the motor’s governor whirr, far under', 'the case, one low note every eight bars'],
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
    voices: ['quarter-pulse lead with late vibrato, through a 300–3000 Hz band and a carbon mic', 'plucked gut bass, in the room', '50 Hz mains hum', 'a continuous 440 dial tone', 'line hiss'],
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
    voices: ['harmonium: celeste reed pairs on shared, breathing bellows, changing every 11.2 s', 'one zither course on a 22.4 s cycle'],
    play: tuneC,
  },
};
export const TUNE_IDS = ['a', 'b', 'c'];
export const DEFAULT_TUNE = 'a';

// The nominal level the three are written against, before their trims. What actually lands, measured
// (peak and RMS, summed L+R, against the same references the cue table uses):
//
//              peak     rms      crest    centroid   vs room tone     vs escapement   vs door stop
//   a  box     0.0796   0.0080   20.0 dB    690 Hz   +14.8 / +6 dB      -0.9 dB         -12.0 dB
//   b  line    0.0359   0.0080   13.0 dB   1206 Hz    +7.9 / +6 dB      -7.9 dB         -18.9 dB
//   c  mech    0.0473   0.0080   15.4 dB    543 Hz   +10.3 / +6 dB      -5.4 dB         -16.5 dB
//
// (room tone peak 0.0145 / rms 0.0040; escapement 0.089; the pen 0.164; the door's stop 0.315 —
// the rebuilt bank, 2026-09-24, re-measured when the instruments were rebuilt.)
export const TUNE_LEVEL = 0.034;
// Measured, and EQUALISED BY RMS, not by peak: the user is choosing between three compositions and
// must not be choosing between three volumes. Each trim lands the tune's RMS on 0.0080 (about
// +4 dB on the room tone, which is what a bed under a conversation wants), and the peaks fall where
// the instrument puts them — a struck music box has 20 dB of crest and a reed drone has 15, and
// flattening that would be flattening the instruments. `node tools/_tune-probe.mjs` prints the trim
// each one needs; paste it back here.
export const TUNE_TRIM = { a: 0.183, b: 0.349, c: 0.715 };
// the music box's motor and the line's hiss, as fractions of the tune's own level
const WHIRR = 0.15;
const LINE_HISS = 0.02;

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
    // …and a carbon microphone at the far end: a presence peak and a soft clip that only the
    // loudest notes of the lead reach
    const mic = bq(ac, 'peaking', 1700, 1, 4);
    const pre = zg(ac, 60);
    const clip = shaper(ac, 1.6);
    const post = zg(ac, 1 / 60);
    lp.connect(mic);
    mic.connect(pre);
    pre.connect(clip);
    clip.connect(post);
    post.connect(door);
    lines.wire = hp;
  }
  // A's comb is screwed to the floor of a small box, and the box is what you hear (IR.box)
  if (T.id === 'a') lines.box = body(ac, door, 'box', { dry: 0.45, wet: 0.9, hp: 190 });
  // C's string is on a zither, and the zither has a body too
  if (T.id === 'c') lines.body = body(ac, door, 'zither', { dry: 0.5, wet: 0.8, hp: 90 });

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
    // and the line itself: a faint hiss down the wire, under everything
    const line = ac.createBufferSource();
    line.buffer = noise(ac, 'pink');
    line.loop = true;
    const lg = zg(ac);
    lg.gain.setValueAtTime(0, t0);
    lg.gain.linearRampToValueAtTime(lv * LINE_HISS, t0 + 0.3);
    line.connect(lg);
    lg.connect(lines.wire ?? door);
    line.start(t0);
    beds.push(line);
  }
  // A's motor: the spring barrel, the gear train and the governor's air-brake fan, which spins at
  // about thirty turns a second — a soft whirr fluttering at the fan's rate, inside the box, just
  // under the tune. Continuous, so it takes a de-click ramp.
  if (T.id === 'a' && WHIRR > 0) {
    const w = ac.createBufferSource();
    w.buffer = noise(ac, 'pink');
    w.loop = true;
    w.playbackRate.value = 0.93;
    const wf = bq(ac, 'bandpass', 1150, 0.9);
    const wg = zg(ac);
    wg.gain.setValueAtTime(0, t0);
    wg.gain.linearRampToValueAtTime(lv * WHIRR, t0 + 0.03);
    const fan = ac.createOscillator();
    fan.frequency.value = 31;
    const fg = zg(ac);
    fg.gain.setValueAtTime(0, t0);
    fg.gain.linearRampToValueAtTime(lv * WHIRR * 0.6, t0 + 0.03);
    fan.connect(fg);
    fg.connect(wg.gain);
    w.connect(wf);
    wf.connect(wg);
    wg.connect(lines.box);
    w.start(t0);
    fan.start(t0);
    beds.push(w, fan);
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
