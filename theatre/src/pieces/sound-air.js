// PIECE: sound (air family) — see sound-core.js for the room and the primitives.
// Each voice: (ac, dest, t, { level, seed, rng, pan, gain }) => seconds. `level` is already
// LEVEL[name] * gain * TRIM[name]. Connect through place(ac, dest, { pan, room }) so it is in the room.
//
// The air family is everything that is not a thing being handled: the room itself, the weather,
// the street, the fire, the title bells and the three sounds of Pepe coming apart and back.
//
// Most of these are TEXTURES — thousands of tiny events (fibres parting, sap bursting, drops on a
// pane) — and a texture made of Web Audio nodes costs a node per event. So the textures here are
// computed sample by sample into one buffer per firing (a few thousand multiply-adds, well under a
// millisecond) and played through a single source. That is the same thing `noise()` in the core
// does, only with the physics in it, and it keeps the fire, which re-fires three times a second,
// at five nodes instead of fifty.
import { place, hiss, modal, mulberry32 } from './sound-core.js';

export const VOICES = {};
export const TRIM = {};
export const LENGTH = {};

// ---- a tiny DSP kit for the computed textures -------------------------------------------------
// An RBJ biquad run per sample. `set` re-tunes it mid-buffer (a sweep).
function biquad(type, f, q, sr) {
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const set = (hz, qq = q) => {
    const w = (2 * Math.PI * Math.min(hz, sr * 0.45)) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * qq);
    let B0, B1, B2;
    if (type === 'lp') (B0 = (1 - c) / 2), (B1 = 1 - c), (B2 = (1 - c) / 2);
    else if (type === 'hp') (B0 = (1 + c) / 2), (B1 = -(1 + c)), (B2 = (1 + c) / 2);
    else (B0 = al), (B1 = 0), (B2 = -al); // bandpass, 0 dB at the centre
    const A0 = 1 + al;
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = (-2 * c) / A0; a2 = (1 - al) / A0;
  };
  set(f, q);
  const run = (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
  run.set = set;
  return run;
}
const rms = (a) => {
  let e = 0;
  for (let i = 0; i < a.length; i++) e += a[i] * a[i];
  return Math.sqrt(e / Math.max(1, a.length)) || 1e-9;
};
// one computed buffer, out through a gain at `level`, placed in the room. 3–5 nodes.
function playData(ac, dest, t, chans, level, { pan = 0, room = 0.2 } = {}) {
  const b = ac.createBuffer(chans.length, chans[0].length, ac.sampleRate);
  chans.forEach((d, i) => b.getChannelData(i).set(d));
  const src = ac.createBufferSource();
  src.buffer = b;
  const g = ac.createGain();
  g.gain.value = level; // nothing reaches it before start(t): the buffer's own first sample is the onset
  src.connect(g);
  g.connect(place(ac, dest, { pan, room }));
  src.start(t);
  src.stop(t + b.duration + 0.01);
  return b.duration;
}

// ---- long loopable noise for the beds ---------------------------------------------------------
// The core's noise is two seconds long, and two seconds of filtered noise on a loop is a rhythm the
// ear finds within a minute. The beds get their own, 11–17 s each and of different lengths, made at
// 22.05 kHz (nothing in a bed lives above 4 kHz, and it halves the memory on a phone), with the
// loop point cross-faded so the join is not a click.
const BED_SR = 22050;
const bedCache = new WeakMap();
function loopNoise(ac, kind, seconds, seed) {
  let m = bedCache.get(ac);
  if (!m) bedCache.set(ac, (m = {}));
  const key = `${kind}:${seconds}`;
  if (m[key]) return m[key];
  const n = Math.floor(BED_SR * seconds), F = Math.floor(BED_SR * 0.4);
  const x = new Float32Array(n + F);
  const rng = mulberry32(seed);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < n + F; i++) {
    const w = rng() * 2 - 1;
    if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      x[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    } else if (kind === 'brown') x[i] = last = 0.997 * last + 0.06 * w;
    else x[i] = w;
  }
  const k = 0.25 / rms(x);
  const buf = ac.createBuffer(1, n, BED_SR);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = x[i + F] * k;
  // the join: the last 0.4 s turns, equal-power, into the 0.4 s that precedes the first sample
  for (let i = 0; i < F; i++) {
    const w = (i / F) * (Math.PI / 2);
    d[n - F + i] = (x[n + i] * Math.cos(w) + x[i] * Math.sin(w)) * k;
  }
  m[key] = buf;
  return buf;
}
function loopSrc(ac, buf, t, offset = 0) {
  const s = ac.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start(t, offset % buf.duration);
  return s;
}
function filt(ac, type, hz, q = 0.7, gain) {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  f.Q.value = q;
  if (gain != null) f.gain.value = gain;
  return f;
}
function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}
// a slow drift: a sine at `hz` swinging `param` by ±depth around wherever it is set
function drift(ac, param, hz, depth, t, phase = 0) {
  const o = ac.createOscillator();
  // start part-way through a cycle (`phase` in turns) so the drifts are not all rising together
  const a = phase * 2 * Math.PI;
  o.setPeriodicWave(ac.createPeriodicWave(new Float32Array([0, Math.sin(a)]), new Float32Array([0, Math.cos(a)]), { disableNormalization: true }));
  o.frequency.value = hz;
  const g = ac.createGain();
  g.gain.value = depth;
  o.connect(g);
  g.connect(param);
  o.start(t);
  return o;
}

// ==== THE ROOM TONE ===============================================================================
// A quiet parlour at night, a floor or two above a city. Three things, none of them a hiss:
//   the city — traffic a long way off, which is almost all below 200 Hz and comes and goes in slow
//     swells as the lights change streets away (brown noise, two drifts at 41 s and 17 s);
//   the air — the draught under the door and round the casement, a soft band in the low mids that
//     wanders (pink noise, a band near 400 Hz that drifts over 29 s, nothing over 1 kHz);
//   the mains — the house's own 50 Hz and the transformer's 100 Hz, a whisper under everything, the
//     sort of thing you only hear when it stops. It wanders by a few cents as the grid does.
// No two of the drifts or loops share a period, so it does not come round again within an evening.
// Contract (sound.js): { gain, base, veil(on, when), stop() }. sound.js owns `gain.gain`.
export function roomTone(ac, dest, { level = 0.009, VEIL = { hz: 250, gain: 0.5, open: 18000 } } = {}) {
  const t = ac.currentTime;
  const sum = ac.createGain();
  sum.gain.value = 1;
  const door = filt(ac, 'lowpass', VEIL.open, 0.6); // the leaf, when there is one between us and the parlour
  const g = ac.createGain();
  g.gain.value = 0; // never let the default 1 reach a sample
  g.gain.setValueAtTime(level, t); // cut in, no fade
  chain(sum, door, g).connect(dest);

  // the city
  const city = loopSrc(ac, loopNoise(ac, 'brown', 17.3, 4101), t, 3.1);
  const cg = ac.createGain();
  cg.gain.value = 1;
  chain(city, filt(ac, 'highpass', 42, 0.6), filt(ac, 'lowpass', 210, 0.5), cg, sum);
  // the air
  const air = loopSrc(ac, loopNoise(ac, 'pink', 11.9, 5303), t, 7.7);
  const bp = filt(ac, 'bandpass', 420, 0.55);
  const ag = ac.createGain();
  ag.gain.value = 0.55;
  chain(air, bp, filt(ac, 'lowpass', 950, 0.5), ag, sum);
  // the mains: 50 Hz and its first harmonics, the transformer's 100 Hz strongest
  const hum = ac.createOscillator();
  const N = 8, re = new Float32Array(N), im = new Float32Array(N);
  [0, 0.55, 1, 0.42, 0.22, 0.12, 0.07, 0.04].forEach((a, k) => (im[k] = a));
  hum.setPeriodicWave(ac.createPeriodicWave(re, im, { disableNormalization: true }));
  hum.frequency.value = 50;
  const hg = ac.createGain();
  hg.gain.value = 0.028;
  chain(hum, hg, sum);
  hum.start(t);

  const drifts = [
    drift(ac, cg.gain, 1 / 41, 0.24, t, 0.3), // a far street swelling and emptying
    drift(ac, cg.gain, 1 / 17.3, 0.14, t, 0.55),
    drift(ac, bp.frequency, 1 / 29, 140, t, 0.1), // the draught finding a different gap
    drift(ac, ag.gain, 1 / 23.7, 0.09, t, 0.7),
    drift(ac, hg.gain, 1 / 67, 0.009, t, 0.2), // the house's load changing
    drift(ac, hum.detune, 1 / 53, 4, t, 0.4), // and the grid's frequency
  ];
  const srcs = [city, air, hum, ...drifts];

  return {
    gain: g,
    base: level,
    // put the door in front of the room, or take it away, at an absolute time on the audio clock
    veil(on, when = ac.currentTime) {
      door.frequency.setValueAtTime(on ? VEIL.hz : VEIL.open, Math.max(when, ac.currentTime));
    },
    stop() {
      for (const s of srcs) {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      }
    },
  };
}
TRIM.room = 1.46; // taken over 30 s, not 2.5: the city's swells are 5 dB and the peak is on the top of one

// ==== THE RAIN ====================================================================================
// Rain heard from inside, through a closed casement. Glass is a lowpass, so the steady part is dark:
//   the wash — the whole street being rained on, pink noise between 180 Hz and 2 kHz with the one
//     lift near 900 Hz that says water and not air;
//   the far roar — rain on roofs and road further off, a low band that only thickens the wash;
//   the pane — now and then a gust throws a handful of drops at the glass: a few soft taps in a
//     cluster, each a tiny pitched tick with the pane's own dull thud under it, spread across the
//     width of the window. Between the gusts, the odd single drop. These are computed once into a
//     24 s loop (stereo, at 22.05 kHz) and never line up with the wash's 13 s.
// Two slow drifts (23 s and 37 s) on its colour and weight so it never settles into a fault in the
// playback. Contract (egg-rain.js): { gain, base, stop(when) }. Cut in and cut out; nothing fades.
function dropLoop(ac) {
  let m = bedCache.get(ac);
  if (!m) bedCache.set(ac, (m = {}));
  if (m.drops) return m.drops;
  const sr = BED_SR, S = 23.7, n = Math.floor(sr * S);
  const L = new Float32Array(n), R = new Float32Array(n);
  const rng = mulberry32(8111);
  const drop = (at, a, pan) => {
    const i0 = Math.floor(at * sr);
    const f = 1100 + rng() * 1600, tau = 0.0018 + rng() * 0.0028; // the tick, a small bead meeting glass
    const fb = 170 + rng() * 150, taub = 0.009 + rng() * 0.008; // the pane answering, dull
    const ph = rng() * 6.28;
    const gl = Math.cos((pan + 1) * (Math.PI / 4)), gr = Math.sin((pan + 1) * (Math.PI / 4));
    const len = Math.floor(sr * 0.06);
    for (let j = 0; j < len && i0 + j < n; j++) {
      const s = j / sr;
      let v = 0.62 * Math.exp(-s / tau) * Math.sin(2 * Math.PI * f * s + ph) + 0.4 * Math.exp(-s / taub) * Math.sin(2 * Math.PI * fb * s);
      if (j < 3) v += (rng() * 2 - 1) * 0.35; // the contact itself
      L[i0 + j] += v * a * gl;
      R[i0 + j] += v * a * gr;
    }
  };
  // gusts: a handful at the glass every few seconds
  for (let at = 0.9 + rng() * 1.5; at < S - 1.2; at += 1.6 + rng() * 3.6) {
    const c = 3 + Math.floor(rng() * 7), spread = 0.12 + rng() * 0.55, where = rng() * 1.2 - 0.6;
    for (let k = 0; k < c; k++) drop(at + Math.pow(rng(), 1.6) * spread, (0.35 + 0.65 * rng()) * (k === 0 ? 1 : 0.8), Math.max(-1, Math.min(1, where + (rng() - 0.5) * 0.35)));
  }
  // and between them, the odd drop on its own
  for (let at = rng(); at < S - 0.3; at += 0.25 + rng() * 1.2) drop(at, 0.1 + 0.28 * rng(), rng() * 1.6 - 0.8);
  // through the glass: two poles at 3 kHz
  for (const d of [L, R]) {
    const lp = biquad('lp', 3000, 0.6, sr);
    for (let i = 0; i < n; i++) d[i] = lp(d[i]);
  }
  let pk = 1e-9;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const buf = ac.createBuffer(2, n, sr);
  buf.getChannelData(0).set(L.map((v) => v / pk));
  buf.getChannelData(1).set(R.map((v) => v / pk));
  return (m.drops = buf);
}
export function rainBed(ac, dest, { level = 0.006 } = {}) {
  const t = ac.currentTime;
  const g = ac.createGain();
  g.gain.value = 0; // never let the default 1 reach a sample
  g.gain.setValueAtTime(level, t); // cut in, no fade
  g.connect(dest);
  const body = ac.createGain(); // the weight of the rain, which the gusts move
  body.gain.value = 1;
  body.connect(g);

  // the wash
  const wash = loopSrc(ac, loopNoise(ac, 'pink', 13.1, 6007), t, 2.3);
  const lp = filt(ac, 'lowpass', 1500, 0.6);
  const wg = ac.createGain();
  wg.gain.value = 1;
  chain(wash, filt(ac, 'highpass', 180, 0.6), lp, filt(ac, 'lowpass', 2600, 0.6), filt(ac, 'peaking', 900, 1.1, 4.5), wg, body);
  // the far roar
  const far = loopSrc(ac, loopNoise(ac, 'brown', 17.3, 4101), t, 11.4);
  const fg = ac.createGain();
  fg.gain.value = 0.55;
  chain(far, filt(ac, 'bandpass', 300, 0.6), fg, body);
  // the pane
  const pane = loopSrc(ac, dropLoop(ac), t, 0);
  const pg = ac.createGain();
  pg.gain.value = 1.7;
  chain(pane, pg, g);

  const drifts = [drift(ac, lp.frequency, 1 / 23, 260, t, 0.25), drift(ac, body.gain, 1 / 37, 0.18, t, 0.6)];
  const srcs = [wash, far, pane, ...drifts];
  return {
    gain: g,
    base: level,
    stop(when = ac.currentTime) {
      const at = Math.max(when, ac.currentTime);
      try {
        g.gain.cancelScheduledValues(at);
        g.gain.setValueAtTime(0, at); // cut, not faded
      } catch {
        /* already gone */
      }
      for (const s of srcs) {
        try {
          s.stop(at);
        } catch {
          /* already stopped */
        }
      }
      try {
        g.disconnect();
      } catch {
        /* already gone */
      }
    },
  };
}
TRIM.rain = 0.595; // over 30 s; the peak is a gust of drops on the pane, the wash sits about 9 dB under it

// ==== THE STREET ==================================================================================
// A car horn two streets away, heard through the shutters. A horn is two electromagnetic
// diaphragms a major third apart (about 420 and 525 Hz), buzzing — so a rich, slightly driven
// sawtooth pair, a touch flat for the first 40 ms while the diaphragm gets going. The shutters take
// the top off it and their slats comb it; the street's facades throw it back a few times, duller
// each time. A toot and a longer lean, or one long lean; never the same car twice.
VOICES.street = (ac, dest, t, { level, seed, pan = 0 }) => {
  const R = mulberry32(seed * 9277 + 1);
  const out = place(ac, dest, { pan: Math.max(-1, Math.min(1, pan + (R() - 0.5) * 0.3)), room: 0.08 });
  const f = 395 + R() * 60, ratio = 1.24 + R() * 0.04;
  const gate = ac.createGain();
  gate.gain.value = 0;
  const pattern = R() < 0.3 ? [[0, 0.55 + R() * 0.2]] : [[0, 0.13 + R() * 0.08], [0.3 + R() * 0.08, 0.38 + R() * 0.25]];
  const oscs = [f, f * ratio].map((hz, k) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    for (const [s, d] of pattern) {
      o.frequency.setValueAtTime(hz * 0.975, t + s);
      o.frequency.exponentialRampToValueAtTime(hz, t + s + 0.04);
      o.frequency.setValueAtTime(hz, t + s + d - 0.02);
      o.frequency.linearRampToValueAtTime(hz * 0.99, t + s + d);
    }
    const og = ac.createGain();
    og.gain.value = k ? 0.5 : 0.62;
    o.connect(og);
    og.connect(gate);
    return o;
  });
  let end = 0;
  for (const [s, d] of pattern) {
    gate.gain.setValueAtTime(0, t + s);
    gate.gain.linearRampToValueAtTime(1, t + s + 0.012); // a de-click; a horn is sustained
    gate.gain.setValueAtTime(1, t + s + d - 0.035);
    gate.gain.linearRampToValueAtTime(0, t + s + d);
    end = s + d;
  }
  // the horn's own drive, then the shutters: a slat comb and two dull poles
  const drive = ac.createWaveShaper();
  const c = new Float32Array(512);
  for (let i = 0; i < 512; i++) c[i] = Math.tanh(2.2 * ((i / 511) * 2 - 1)) / Math.tanh(2.2);
  drive.curve = c;
  const hp = filt(ac, 'highpass', 190, 0.7);
  const comb = ac.createDelay(0.01);
  comb.delayTime.value = 0.0011 + R() * 0.0006;
  const cg = ac.createGain();
  cg.gain.value = 0.55;
  const lp1 = filt(ac, 'lowpass', 900, 0.7);
  chain(gate, drive, hp);
  hp.connect(lp1);
  hp.connect(comb);
  chain(comb, cg, lp1);
  const lp2 = filt(ac, 'lowpass', 1500, 0.6);
  const g = ac.createGain();
  g.gain.value = level;
  chain(lp1, lp2, g, out);
  // the street throwing it back: a flutter between facades, darker each bounce
  const echo = ac.createDelay(1);
  echo.delayTime.value = 0.17 + R() * 0.08;
  const eLp = filt(ac, 'lowpass', 650, 0.5);
  const fb = ac.createGain();
  fb.gain.value = 0.28;
  const eg = ac.createGain();
  eg.gain.value = 0.42;
  g.connect(echo);
  chain(echo, eLp, fb, echo);
  chain(eLp, eg, out);
  for (const o of oscs) {
    o.start(t);
    o.stop(t + end + 0.02);
  }
  return LENGTH.street;
};
TRIM.street = 0.57;
LENGTH.street = 1.9;

// ==== THE FIRE ====================================================================================
// Twelve small fires on the shelves (egg-fine.js), re-fired every fourth drawing (1/3 s) and 0.42 s
// long, so each firing overlaps the next by 87 ms. The steady parts — the low roar of the flames and
// the thin hiss of sap boiling out of the ends — cross-fade equal-power over exactly that overlap,
// so a burning shelf is one continuous sound and not a row of little ones. On top of it, the events:
// a fizz of tiny cracks in little runs (fibres splitting as they dry), and now and then a pop — a
// pocket of steam bursting a chip of wood, a hard click with the chip ringing for a few ms.
const FIRE_GAP = 1 / 3;
// The steady part — flames' roar with its flicker, and the sap's hiss coming and going — is computed
// once per context as three and a half seconds of fire, and each firing takes a random 0.42 s of it. Only the
// cracks and pops, which are sparse, are computed per firing: a fraction of a millisecond.
function fireBed(ac) {
  let m = bedCache.get(ac);
  if (!m) bedCache.set(ac, (m = {}));
  if (m.fire) return m.fire;
  const sr = ac.sampleRate, n = Math.floor(sr * 3.5), R = mulberry32(3319);
  const roar = new Float32Array(n), hissA = new Float32Array(n);
  const lpA = biquad('lp', 210, 0.7, sr), lpB = biquad('lp', 360, 0.6, sr), lick = biquad('bp', 560, 1.1, sr), hp = biquad('hp', 5200, 0.7, sr), top = biquad('lp', 8500, 0.7, sr);
  let fl = 0.75, flT = 0.75, hz = 0.6, hzT = 0.6;
  const step = Math.floor(sr / 13);
  for (let i = 0; i < n; i++) {
    if (i % step === 0) (flT = 0.45 + R() * 0.55), (hzT = R() < 0.3 ? 0.15 + R() * 0.9 : hzT * 0.8);
    fl += (flT - fl) * (40 / sr); // the flames' flicker, a dozen times a second
    hz += (hzT - hz) * (25 / sr);
    if (i % 4096 === 0) lick.set(420 + R() * 320, 1.1); // the tongues changing shape
    const w = R() * 2 - 1;
    roar[i] = (lpB(lpA(w)) + 0.35 * lick(w)) * fl;
    hissA[i] = hp(w) * hz;
  }
  const kr = 0.075 / rms(roar), kh = 0.014 / rms(hissA);
  for (let i = 0; i < n; i++) roar[i] = top(roar[i] * kr + hissA[i] * kh);
  return (m.fire = roar);
}
VOICES.crackle = (ac, dest, t, { level, seed, pan = 0 }) => {
  const R = mulberry32(seed * 7717 + 29);
  const sr = ac.sampleRate, len = LENGTH.crackle, n = Math.ceil(len * sr), xf = Math.floor((len - FIRE_GAP) * sr);
  const bed = fireBed(ac), off = Math.floor(R() * (bed.length - n - 1));
  const ev = new Float32Array(n), out = new Float32Array(n);
  // the fizz: tiny cracks in runs, their sizes heavy-tailed (most small, one or two not)
  const cracks = 14 + Math.floor(R() * 18);
  let at = R() * 0.03;
  for (let k = 0; k < cracks; k++) {
    at = R() < 0.55 ? at + 0.003 + R() * 0.02 : R() * (len - 0.03);
    const i0 = Math.floor(at * sr), a = 0.08 + 0.4 * Math.pow(R(), 3), w = 2 + Math.floor(R() * 10), d = Math.exp(-1 / w);
    for (let j = 0, e = a; j < w * 4 && i0 + j < n; j++, e *= d) ev[i0 + j] += (R() * 2 - 1) * e;
  }
  const crisp = biquad('bp', 2600, 0.55, sr);
  for (let i = 0; i < n; i++) ev[i] = crisp(ev[i]) * 1.8;
  // the pops: none, one, or two, somewhere in this third of a second
  const pops = R() < 0.35 ? 0 : R() < 0.75 ? 1 : 2;
  for (let p = 0; p < pops; p++) {
    const i0 = Math.floor((0.01 + R() * (FIRE_GAP - 0.02)) * sr), a = 0.45 + 0.55 * R();
    const chip = biquad('bp', 800 + R() * 1600, 5 + R() * 5, sr), body = biquad('bp', 220 + R() * 120, 2, sr);
    const L = Math.floor(0.03 * sr);
    for (let j = 0; j < L && i0 + j < n; j++) {
      const x = j < 12 ? (R() * 2 - 1) * Math.exp(-j / 4) : 0;
      ev[i0 + j] += a * (x * 0.4 + chip(x) * 2.6 + body(x) * 1.4);
    }
    // and the steam it let out, a short spit after it
    const S = Math.floor(0.025 * sr), d = Math.exp(-1 / (0.008 * sr));
    for (let j = 0, e = a * 0.05; j < S && i0 + j < n; j++, e *= d) ev[i0 + j] += (R() * 2 - 1) * e;
  }
  for (let i = 0; i < n; i++) {
    // equal-power over the overlap at each end, so consecutive firings sum to a steady fire
    const x = i < xf ? Math.sin((i / xf) * (Math.PI / 2)) : i > n - xf ? Math.cos(((i - (n - xf)) / xf) * (Math.PI / 2)) : 1;
    out[i] = bed[off + i] * x + ev[i];
  }
  return playData(ac, dest, t, [out], level, { pan, room: 0.45 });
};
TRIM.crackle = 3.1;
LENGTH.crackle = 0.42; // cadence-bound: one every 1/3 s, overlapping the next by 87 ms

// ==== THE TITLE BELLS =============================================================================
// Two notes a fifth apart, five drawings apart, on the title card (D5 then A5) and inverted on the
// closing card (D5 then G4). Each is a celesta's steel bar over its wooden resonator: the resonator
// makes the fundamental pure and long; the bar adds its own inharmonic partials (2.76, 5.40, 8.93 of
// a free bar), which are what make it a bell and not a sine, and they die much faster than the
// fundamental. Two modes a hair apart on the fundamental beat slowly, which is the shimmer a real
// bar has. The felt hammer is a soft tick at the start. It is played across the room.
function bell(ac, out, t, f, lv, seed) {
  const r = Math.pow(587.33 / f, 0.35); // a longer bar rings longer
  modal(ac, out, {
    t,
    level: lv,
    seed,
    spread: 0.0008,
    modes: [
      [f, 1, 2.6 * r],
      [f * 1.0027, 0.32, 2.1 * r],
      [f * 2.0, 0.08, 1.0 * r],
      [f * 2.76, 0.2, 0.75 * r],
      [f * 5.4, 0.09, 0.3 * r],
      [f * 8.93, 0.045, 0.13],
    ],
  });
  hiss(ac, out, { t, dur: 0.014, level: lv * 0.16, filters: [{ type: 'bandpass', freq: Math.min(7000, f * 4.4), q: 1.3 }], seed });
}
function bells(up) {
  return (ac, dest, t, { level, seed, pan = 0 }) => {
    const out = place(ac, dest, { pan, room: 0.42 });
    const root = 587.33; // D5
    bell(ac, out, t, root, level, seed);
    bell(ac, out, t + 5 / 12, up ? root * 1.5 : root / 1.5, level * 0.9, seed + 1);
    return LENGTH.title;
  };
}
VOICES.title = bells(true);
VOICES.closing = bells(false);
TRIM.title = 0.55;
TRIM.closing = 0.556;
LENGTH.title = 2.5;
LENGTH.closing = 2.5;

// ==== HIS CROSSING (walk-crossing.js) =============================================================
// Beside his footprints — dry, close, a wet slap and two peels — so all three are near and nearly
// dry too, panned where he sits, and all three are paper and air: never a pitch that would argue
// with the prints.

// UNMAKE. His drawing tears. A tear is a run of fibre breaks, hundreds a second, crisp and
// broadband, with the sheet's own stiffness ringing under them; it goes in two or three pulls, and
// each pull runs faster as the tear gets going. It starts with the sheet giving (a soft low buckle,
// at level on the first sample), ends with the last fibres parting, and what was him scatters as
// fine grains of ink, spreading out and thinning. Over it, a soft breath going out of him.
VOICES.unmake = (ac, dest, t, { level, seed, pan = 0 }) => {
  const R = mulberry32(seed * 5923 + 17);
  const sr = ac.sampleRate, len = LENGTH.unmake, n = Math.ceil(len * sr);
  const L = new Float32Array(n), Rr = new Float32Array(n), ev = new Float32Array(n), rasp = new Float32Array(n);
  const T0 = 0.018, T1 = 0.3 + R() * 0.04;
  // the pulls: two or three spurts of tearing, each with its own swell
  const pulls = 2 + Math.floor(R() * 2), bounds = [0];
  for (let k = 1; k < pulls; k++) bounds.push(k / pulls + (R() - 0.5) * 0.15);
  bounds.push(1);
  const pullAmp = (p) => {
    let k = 0;
    while (k < pulls - 1 && p > bounds[k + 1]) k++;
    const u = (p - bounds[k]) / (bounds[k + 1] - bounds[k]);
    return (0.45 + 0.2 * k) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.2)));
  };
  let at = T0;
  while (at < T1) {
    const p = (at - T0) / (T1 - T0);
    const rate = 280 * Math.pow(6, Math.pow(p, 1.4)); // faster as it goes
    const i0 = Math.floor(at * sr), a = pullAmp(p) * (0.12 + 0.88 * Math.pow(R(), 2.5)) * (R() < 0.5 ? -1 : 1), w = 1 + R() * 3;
    for (let j = 0; j < w * 5 && i0 + j < n; j++) ev[i0 + j] += a * (R() * 0.6 + 0.4) * Math.exp(-j / w);
    for (let j = Math.floor(at * sr); j < Math.floor((at + 1 / rate) * sr) && j < n; j++) rasp[j] = pullAmp(p) * (0.5 + p * 0.5);
    at += (1 / rate) * (0.4 + R() * 1.2);
  }
  // the last fibres: one hard snap
  {
    const i0 = Math.floor(T1 * sr);
    for (let j = 0; j < 30 && i0 + j < n; j++) ev[i0 + j] += (R() * 2 - 1) * 0.6 * Math.exp(-j / 5);
  }
  const f1 = biquad('bp', 2900, 0.8, sr), f2 = biquad('bp', 1150, 1.6, sr), f3 = biquad('bp', 380 + R() * 80, 3, sr), f4 = biquad('bp', 4200, 0.7, sr);
  const lpG = biquad('lp', 260, 0.7, sr), bLp = biquad('lp', 2600, 0.7, sr), bF1 = biquad('bp', 760, 1.2, sr), bF2 = biquad('bp', 1500, 1.5, sr);
  const g0 = 115 + R() * 20;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / sr, w = R() * 2 - 1;
    let c = (ev[i] * 0.4 + f1(ev[i]) * 3.2 + f2(ev[i]) * 2 + f3(ev[i]) * 1.4) + f4(w) * rasp[i] * 0.2;
    // the sheet giving: a buckle, low and short, at level on the first sample
    if (s < 0.09) {
      ph += (2 * Math.PI * g0 * (1 - 0.4 * (s / 0.09))) / sr;
      c += Math.exp(-s / 0.025) * (0.3 * Math.sin(ph) + 0.5 * lpG(w));
    }
    // the breath going out of him: a soft 'haa', a 20 ms de-click then a slow fall
    const bEnv = (s < 0.05 ? 0 : Math.min(1, (s - 0.05) / 0.02) * Math.exp(-(s - 0.07) / 0.16)) * 0.3;
    const bw = bLp(w);
    c += (bF1(bw) * 1.6 + bF2(bw)) * bEnv;
    L[i] = Rr[i] = c;
  }
  // the ink: what was him scattering, fine grains spreading outwards and thinning
  const inkF = [biquad('bp', 5200, 1.2, sr), biquad('bp', 5200, 1.2, sr)];
  const ink = [new Float32Array(n), new Float32Array(n)];
  for (let at2 = T1 + 0.005; at2 < len - 0.02; at2 += 0.002 + R() * 0.012 * (1 + (at2 - T1) * 12)) {
    const u = (at2 - T1) / (len - T1), i0 = Math.floor(at2 * sr), a = 0.5 * Math.exp(-u * 3.2) * (0.3 + 0.7 * R());
    const side = (R() - 0.5) * 2 * Math.min(1, 0.2 + u * 1.6), gl = Math.cos((side + 1) * (Math.PI / 4)), gr = Math.sin((side + 1) * (Math.PI / 4));
    for (let j = 0; j < 24 && i0 + j < n; j++) {
      const v = (R() * 2 - 1) * a * Math.exp(-j / 4);
      ink[0][i0 + j] += v * gl;
      ink[1][i0 + j] += v * gr;
    }
  }
  for (let i = 0; i < n; i++) {
    L[i] += inkF[0](ink[0][i]) * 3.4;
    Rr[i] += inkF[1](ink[1][i]) * 3.4;
  }
  return playData(ac, dest, t, [L, Rr], level, { pan, room: 0.18 });
};
TRIM.unmake = 0.888;
LENGTH.unmake = 0.55;

// GUTTER. The lamp failing one step, four times a drawing apart. An incandescent lamp on a bad
// contact: the contact arcs on the peaks of the mains, so a short spitting buzz locked to 100 Hz;
// the filament, shocked, gives a tiny high tink; and the supply sags under it — the transformer's
// 100 Hz hum dropping a few percent in pitch and falling away. At level on the first sample.
VOICES.gutter = (ac, dest, t, { level, seed, pan = 0 }) => {
  const R = mulberry32(seed * 3907 + 5);
  const sr = ac.sampleRate, len = LENGTH.gutter, n = Math.ceil(len * sr);
  const out = new Float32Array(n), arc = new Float32Array(n);
  // the arcs, on the mains peaks, jittered, thinning
  for (let k = 0; k < 7; k++) {
    const at = k * 0.01 + (R() - 0.5) * 0.0016 + (k ? 0 : 0.0008);
    if (k && R() > 0.78 - k * 0.05) continue;
    const i0 = Math.max(0, Math.floor(at * sr)), a = (k ? 0.35 + 0.5 * R() : 1) * Math.exp(-k / 3.2), w = 4 + R() * 14;
    for (let j = 0; j < w * 5 && i0 + j < n; j++) arc[i0 + j] += (R() * 2 - 1) * a * Math.exp(-j / w);
  }
  const hp = biquad('hp', 1400, 0.7, sr), bp = biquad('bp', 3400, 0.9, sr);
  const tf = 3800 + R() * 1800, sag = 0.03 + R() * 0.03;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / sr;
    ph += (2 * Math.PI * 100 * (1 - sag * Math.min(1, s / 0.06))) / sr;
    const hum = (Math.sin(ph) + 0.6 * Math.sin(2 * ph) + 0.4 * Math.sin(3 * ph) + 0.22 * Math.sin(4 * ph) + 0.12 * Math.sin(5 * ph)) * 0.3 * Math.exp(-s / 0.04);
    const tink = 0.16 * Math.exp(-s / 0.007) * Math.sin(2 * Math.PI * tf * s);
    out[i] = hp(arc[i]) * 0.9 + bp(arc[i]) * 0.9 + hum + tink;
  }
  return playData(ac, dest, t, [out], level, { pan, room: 0.25 });
};
TRIM.gutter = 0.977;
LENGTH.gutter = 0.12; // a drawing (1/12 s) apart, each running a little into the next

// REFORM. The unmaking run backwards. His ink gathers: grains coming in from the width of the room
// and converging on where he sits, closer and closer together — and each grain is itself backwards,
// swelling and cut off rather than struck and dying, which is what makes it read as reversed. Under
// them the breath drawn back in, rising to the moment he is whole. Then he lands: a soft buckle of
// paper on the bench and the edges of him settling.
VOICES.reform = (ac, dest, t, { level, seed, pan = 0 }) => {
  const R = mulberry32(seed * 6421 + 3);
  const sr = ac.sampleRate, len = LENGTH.reform, n = Math.ceil(len * sr), LAND = 0.33;
  const gL = new Float32Array(n), gR = new Float32Array(n), L = new Float32Array(n), Rr = new Float32Array(n);
  for (let at = 0.004; at < LAND - 0.004; ) {
    const u = at / LAND;
    const i1 = Math.floor(at * sr), w = 3 + R() * 6, a = (0.1 + 0.6 * Math.pow(u, 1.3)) * (0.35 + 0.65 * R());
    const side = (R() - 0.5) * 2 * (1 - u) * 0.95, gl = Math.cos((side + 1) * (Math.PI / 4)), gr = Math.sin((side + 1) * (Math.PI / 4));
    for (let j = 0; j < w * 5 && i1 - j >= 0; j++) {
      const v = (R() * 2 - 1) * a * Math.exp(-j / w); // a grain, reversed: it grows into its end
      gL[i1 - j] += v * gl;
      gR[i1 - j] += v * gr;
    }
    at += 1 / (70 * Math.pow(22, Math.pow(u, 1.2))) * (0.5 + R());
  }
  const fl = [biquad('bp', 3000, 0.9, sr), biquad('bp', 3000, 0.9, sr)], fl2 = [biquad('bp', 1300, 1.4, sr), biquad('bp', 1300, 1.4, sr)];
  const br = biquad('bp', 700, 1.1, sr), bLp = biquad('lp', 2600, 0.7, sr), tLp = biquad('lp', 240, 0.7, sr), pat = biquad('bp', 1800, 0.8, sr);
  const g0 = 100 + R() * 15;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / sr, w = R() * 2 - 1;
    // the breath drawn in, rising to the landing and cut there (20 ms)
    const bEnv = s < LAND ? Math.pow(s / LAND, 2.2) * 0.45 : Math.max(0, 1 - (s - LAND) / 0.02) * 0.45;
    if ((i & 31) === 0) br.set(700 + 1100 * Math.min(1, s / LAND), 1.1);
    let c = br(bLp(w)) * 1.6 * bEnv;
    // he lands: the paper of him on the bench
    if (s >= LAND) {
      const d = s - LAND;
      ph += (2 * Math.PI * g0 * (1 - 0.38 * Math.min(1, d / 0.08))) / sr;
      c += Math.exp(-d / 0.028) * (0.4 * Math.sin(ph) + 0.5 * tLp(w)) + pat(w) * 0.6 * Math.exp(-d / 0.006);
    }
    L[i] = c + fl[0](gL[i]) * 4.5 + fl2[0](gL[i]) * 2.2;
    Rr[i] = c + fl[1](gR[i]) * 4.5 + fl2[1](gR[i]) * 2.2;
  }
  // the edges settling after it: two or three tiny ticks
  const ticks = 2 + Math.floor(R() * 2), tb = biquad('bp', 2600, 1.2, sr);
  const tk = new Float32Array(n);
  for (let k = 0; k < ticks; k++) {
    const i0 = Math.floor((LAND + 0.025 + R() * 0.07) * sr), a = 0.18 + 0.15 * R();
    for (let j = 0; j < 20 && i0 + j < n; j++) tk[i0 + j] += (R() * 2 - 1) * a * Math.exp(-j / 3);
  }
  for (let i = 0; i < n; i++) {
    const v = tb(tk[i]) * 2;
    L[i] += v;
    Rr[i] += v;
  }
  return playData(ac, dest, t, [L, Rr], level, { pan, room: 0.18 });
};
TRIM.reform = 1.048;
LENGTH.reform = 0.46;
