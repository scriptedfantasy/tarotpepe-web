// PIECE: sound (the core) — the room every voice is heard in, and the primitives voices are made of.
//
// The owner, 2026-09-24: "i like the radio, i like the footsteps - the rest should improve
// significantly", and it stays procedural (no sample files). What made the first bank thin was
// not its levels: it was that every voice was a band of white noise and a sine or two, played
// bone-dry straight into the speakers. Real things are not like that, and neither is a room.
//
//   THE ROOM. A parlour about 4.5 x 5 x 2.9 m, furnished: books, a rug, a cloth on the table,
//   plaster walls. That is a short, dark tail (RT60 near 0.45 s) with a handful of early
//   reflections off the walls a few metres away. It is a convolution with an impulse response
//   generated here, so every voice that goes through it lives in the same room. A voice says how
//   far away it is (`room` 0..1): the pen in his hand is almost dry, the clock on the back wall
//   is mostly room.
//
//   THE PRIMITIVES. `modal` is a struck object: a handful of modes, each with its own frequency,
//   level and ring time. Wood has few modes that die fast; brass has many that ring. `resonate`
//   runs any source through such a body. `grains` is a cloud of tiny contacts, which is what
//   paper, cloth, fire and dry stems actually are. `friction` is stick-slip: a pulse train at a
//   wandering rate through a body, which is what a creak actually is.
//
// Nothing here fades in unless a voice asks for an attack. Gain nodes are zeroed before their
// first event, because a GainNode's default is 1 and one sample of it is a click.
import { mulberry32 } from '../core/rng.js';

export { mulberry32 };

// ---- noise, three colours ----------------------------------------------------------------------
const NOISE_S = 2;
export const NOISE_SECONDS = NOISE_S;
const noiseCache = new WeakMap();
export function noise(ac, kind = 'white') {
  let m = noiseCache.get(ac);
  if (!m) noiseCache.set(ac, (m = {}));
  if (m[kind]) return m[kind];
  const n = Math.floor(ac.sampleRate * NOISE_S);
  const b = ac.createBuffer(1, n, ac.sampleRate);
  const d = b.getChannelData(0);
  const rng = mulberry32(kind === 'white' ? 20250904 : kind === 'pink' ? 777 : 4242);
  if (kind === 'pink') {
    // Paul Kellet's refined pink filter
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rng() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (kind === 'brown') {
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = (last + 0.02 * (rng() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
  } else for (let i = 0; i < n; i++) d[i] = rng() * 2 - 1;
  m[kind] = b;
  return b;
}

// ---- the room ------------------------------------------------------------------------------------
// The impulse response, made once per context. Stereo, decorrelated between the ears, a pre-delay
// of the nearest wall, eleven early reflections, then a tail whose top end dies faster than its
// bottom (plaster, books and a rug eat the highs first).
export const ROOM = { rt60: 0.46, seconds: 1.1, predelay: 0.007, damp: 5200, dampEnd: 900, early: 0.55, wet: 0.34 };
const spaceCache = new WeakMap();
function impulse(ac) {
  const sr = ac.sampleRate, n = Math.floor(sr * ROOM.seconds);
  const b = ac.createBuffer(2, n, sr);
  const pre = Math.floor(sr * ROOM.predelay);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    const rng = mulberry32(9001 + ch * 17);
    // the tail: noise under an exponential, through a one-pole lowpass that closes as it decays
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const s = (i - pre) / sr;
      const env = Math.exp((-6.91 * s) / ROOM.rt60);
      const fc = ROOM.dampEnd + (ROOM.damp - ROOM.dampEnd) * Math.exp(-s / 0.18);
      const a = 1 - Math.exp((-2 * Math.PI * fc) / sr);
      lp += a * (rng() * 2 - 1 - lp);
      // the tail builds over the first 25 ms rather than starting at full density
      const build = Math.min(1, s / 0.025);
      d[i] = lp * env * (0.35 + 0.65 * build) * 0.9;
    }
    // the early reflections: the table top, the floor, the four walls, the ceiling, and a few of
    // their second bounces, at distances this room actually has
    const taps = [3.1, 5.4, 7.9, 9.6, 12.2, 14.8, 17.3, 21.5, 26.0, 31.2, 37.9];
    taps.forEach((ms, k) => {
      const i = pre + Math.floor(((ms + (ch ? 0.37 * (k % 3) : 0)) / 1000) * sr);
      if (i >= n) return;
      const g = ROOM.early * Math.pow(0.8, k) * (rng() < 0.5 ? -1 : 1) * (k % 2 === ch ? 1 : 0.6);
      // each reflection is a short, dulled click, not a single sample
      for (let j = 0; j < 12 && i + j < n; j++) d[i + j] += g * Math.exp(-j / 3);
    });
  }
  // normalise to unit energy so ROOM.wet means the same thing on every sample rate
  let e = 0;
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) e += d[i] * d[i];
  }
  const k = 1 / Math.sqrt(e / 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] *= k;
  }
  return b;
}
// The room, hung on a destination. `bus` is where dry voices go; `bus.__room` is the convolver's
// input, which `place()` sends to. Call it once per context with the node the room should end in.
export function space(ac, dest) {
  let s = spaceCache.get(ac);
  if (s) return s;
  const bus = ac.createGain();
  bus.gain.value = 1;
  bus.connect(dest);
  const conv = ac.createConvolver();
  conv.normalize = false;
  conv.buffer = impulse(ac);
  const wet = ac.createGain();
  wet.gain.value = ROOM.wet;
  // the room is warmer than the things in it: a shelf off the top of the return
  const shelf = ac.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 3500;
  shelf.gain.value = -4;
  const send = ac.createGain();
  send.gain.value = 1;
  send.connect(conv);
  conv.connect(shelf);
  shelf.connect(wet);
  wet.connect(dest);
  bus.__room = send;
  s = { bus, send, wet, conv };
  spaceCache.set(ac, s);
  return s;
}

// Where a voice is heard from: a panner, and a send into the room if the destination has one.
// `room` 0 is in your ear, 1 is across the parlour. Returns the node the voice should connect to.
export function place(ac, dest, { pan = 0, room = 0.25 } = {}) {
  const input = ac.createGain();
  input.gain.value = 1;
  let to = dest;
  if (pan && ac.createStereoPanner) {
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(dest);
    to = p;
  }
  input.connect(to);
  const r = dest.__room;
  if (r && room > 0) {
    const s = ac.createGain();
    s.gain.value = room;
    input.connect(s);
    s.connect(r);
  }
  return input;
}

// ---- envelopes -----------------------------------------------------------------------------------
// Full level on the first sample (or after `attack`), held for `hold`, then an exponential fall to
// silence at `t + dur`. The param is zeroed first: see the header.
export function env(param, t, { level, dur, attack = 0, hold = 0 }) {
  const floor = Math.max(1e-6, Math.abs(level) * 0.0005);
  param.value = 0;
  param.setValueAtTime(0, Math.max(0, t - 0.001));
  const a = Math.max(0, Math.min(attack, dur * 0.7));
  if (a > 0) {
    param.setValueAtTime(floor, t);
    param.linearRampToValueAtTime(level, t + a);
  } else param.setValueAtTime(level, t);
  if (hold > 0) param.setValueAtTime(level, t + a + hold);
  param.exponentialRampToValueAtTime(floor, t + Math.max(a + hold + 0.001, dur));
  param.setValueAtTime(0, t + dur + 0.002);
}

// ---- a burst of filtered noise, with a chain of filters rather than one ----------------------------
// filters: [{ type, freq, q, gain, to }] — `to` sweeps the frequency to that value over the burst.
export function hiss(ac, dest, { t, dur, level, kind = 'white', filters = [{ type: 'bandpass', freq: 1000, q: 1 }], attack = 0, hold = 0, seed = 1, rate = 1 }) {
  const rng = mulberry32(seed * 7919 + 13);
  const src = ac.createBufferSource();
  src.buffer = noise(ac, kind);
  src.playbackRate.value = rate;
  let node = src;
  for (const f of filters) {
    const b = ac.createBiquadFilter();
    b.type = f.type ?? 'bandpass';
    b.Q.value = f.q ?? 1;
    if (f.gain != null) b.gain.value = f.gain;
    b.frequency.setValueAtTime(f.freq, t);
    if (f.to) b.frequency.exponentialRampToValueAtTime(Math.max(30, f.to), t + dur);
    node.connect(b);
    node = b;
  }
  const g = ac.createGain();
  env(g.gain, t, { level, dur, attack, hold });
  node.connect(g);
  g.connect(dest);
  src.start(t, rng() * Math.max(0.01, NOISE_S - dur * rate - 0.05));
  src.stop(t + dur + 0.02);
  return t + dur;
}

// ---- a struck object: its modes ------------------------------------------------------------------
// modes: [[hz, amp, ring]] — `ring` is the seconds that mode takes to fall 60 dB. Each mode is its
// own sine with its own exponential, so a low mode can outlive the bright ones as it does in wood.
// `pitch` scales every mode (a smaller copy of the same object), `spread` detunes each one by a
// little per seed so no two strikes are the same object to the cent.
export function modal(ac, dest, { t, level, modes, pitch = 1, spread = 0.006, seed = 1, attack = 0, bend = 0 }) {
  const rng = mulberry32(seed * 104729 + 7);
  let end = t;
  for (const [hz, amp, ring] of modes) {
    const f = hz * pitch * (1 + (rng() * 2 - 1) * spread);
    if (f >= ac.sampleRate / 2 - 100) continue;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    // a struck thing is sharp for an instant and settles (tension, then release): `bend` in ratio
    if (bend) {
      o.frequency.setValueAtTime(f * (1 + bend), t);
      o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.05, ring * 0.3));
    }
    const g = ac.createGain();
    env(g.gain, t, { level: level * amp, dur: ring, attack });
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + ring + 0.02);
    end = Math.max(end, t + ring);
  }
  return end;
}

// ---- any source through a body: a bank of resonant bandpasses in parallel ------------------------
// modes: [[hz, q, gain]]. Returns the node to feed; the body's sum goes on to `dest`.
export function resonate(ac, dest, modes, { dry = 0 } = {}) {
  const input = ac.createGain();
  input.gain.value = 1;
  for (const [hz, q, gain] of modes) {
    if (hz >= ac.sampleRate / 2 - 100) continue;
    const b = ac.createBiquadFilter();
    b.type = 'bandpass';
    b.frequency.value = hz;
    b.Q.value = q;
    const g = ac.createGain();
    // a high-Q bandpass passes only a sliver of broadband energy, so its gain carries Q back
    g.gain.value = gain * Math.sqrt(q);
    input.connect(b);
    b.connect(g);
    g.connect(dest);
  }
  if (dry) {
    const d = ac.createGain();
    d.gain.value = dry;
    input.connect(d);
    d.connect(dest);
  }
  return input;
}

// ---- a cloud of tiny contacts ----------------------------------------------------------------------
// Paper, cloth, dry stems, fire. `count` grains laid between t and t + dur; `shape(u)` is the
// density/level over the cloud (0..1 in, 0..1 out); each grain is a few ms of noise through a
// bandpass picked from `freq` at a Q from `q`, panned within `width`.
export function grains(ac, dest, { t, dur, count, level, freq = [1500, 6000], q = [0.8, 2.5], len = [0.002, 0.012], shape = () => 1, width = 0, seed = 1, kind = 'white', clump = 0 }) {
  const rng = mulberry32(seed * 6151 + 3);
  const buf = noise(ac, kind);
  // one shared filter per grain would be hundreds of nodes; a few banks is enough for the ear
  const banks = [];
  const nb = 4;
  for (let k = 0; k < nb; k++) {
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq[0] * Math.pow(freq[1] / freq[0], (k + 0.5) / nb);
    f.Q.value = q[0] + (q[1] - q[0]) * rng();
    let to = dest;
    if (width && ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = (rng() * 2 - 1) * width;
      p.connect(dest);
      to = p;
    }
    f.connect(to);
    banks.push(f);
  }
  let when = t;
  for (let i = 0; i < count; i++) {
    // times: uniform with some clumping (contacts come in little runs)
    const u = clump && i > 0 && rng() < clump ? Math.min(1, (when - t) / dur + rng() * 0.02) : rng();
    when = t + u * dur;
    const lv = level * shape(u) * (0.35 + 0.65 * rng());
    if (lv <= 1e-5) continue;
    const L = len[0] + (len[1] - len[0]) * rng();
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    env(g.gain, when, { level: lv, dur: L });
    src.connect(g);
    g.connect(banks[Math.floor(rng() * nb)]);
    src.start(when, rng() * (NOISE_S - 0.05));
    src.stop(when + L + 0.01);
  }
  return t + dur;
}

// ---- stick-slip: a creak ---------------------------------------------------------------------------
// A pulse train whose rate wanders through `rate` ([[u, hz]] breakpoints across the duration),
// with jitter, through a wooden body. That is a chair joint, a hinge, a board: the same physics.
export function friction(ac, dest, { t, dur, level, rate = [[0, 40], [1, 60]], body = [[420, 9, 1], [960, 12, 0.6], [1850, 14, 0.35]], jitter = 0.15, seed = 1, grit = 0.2, attack = 0.012 }) {
  const rng = mulberry32(seed * 3301 + 5);
  const o = ac.createOscillator();
  // a narrow pulse, rich in harmonics, is a train of slips
  const N = 24, re = new Float32Array(N), im = new Float32Array(N);
  for (let k = 1; k < N; k++) im[k] = 1 / Math.pow(k, 0.35);
  o.setPeriodicWave(ac.createPeriodicWave(re, im, { disableNormalization: false }));
  const [r0] = rate;
  o.frequency.setValueAtTime(r0[1], t);
  for (const [u, hz] of rate.slice(1)) o.frequency.linearRampToValueAtTime(hz, t + u * dur);
  // the jitter: the slips are never quite regular
  const steps = Math.max(2, Math.floor(dur / 0.03));
  for (let i = 1; i < steps; i++) o.detune.setValueAtTime((rng() * 2 - 1) * jitter * 1200, t + (i / steps) * dur);
  const g = ac.createGain();
  env(g.gain, t, { level, dur, attack, hold: dur * 0.55 });
  const bodyIn = resonate(ac, g, body);
  o.connect(bodyIn);
  g.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
  // and the fibres: a little noise riding the same envelope
  if (grit > 0) hiss(ac, dest, { t, dur, level: level * grit, filters: [{ type: 'bandpass', freq: body[0][0] * 3, q: 1.2 }], attack, hold: dur * 0.5, seed: seed + 11 });
  return t + dur;
}

// ---- a soft clip, for anything that should sound driven (a speaker, a spring) ----------------------
const curves = new Map();
export function shaper(ac, amount = 2) {
  const w = ac.createWaveShaper();
  let c = curves.get(amount);
  if (!c) {
    c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      c[i] = Math.tanh(amount * x) / Math.tanh(amount);
    }
    curves.set(amount, c);
  }
  w.curve = c;
  w.oversample = '2x';
  return w;
}

// ---- a thump: the body of a thing landing on something soft (cloth, rug, felt) --------------------
// A sine dropping in pitch under a very short envelope, with a little low noise. The floor of every
// landing in this room.
export function thump(ac, dest, { t, level, hz = 110, drop = 0.6, dur = 0.09, seed = 1 }) {
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(hz, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, hz * drop), t + dur);
  const g = ac.createGain();
  env(g.gain, t, { level, dur });
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
  hiss(ac, dest, { t, dur: dur * 0.7, level: level * 0.5, kind: 'brown', filters: [{ type: 'lowpass', freq: hz * 3, q: 0.7 }], seed });
  return t + dur;
}
