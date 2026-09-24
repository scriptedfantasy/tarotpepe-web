// PIECE: sound (metal family): metal, glass, electric and the toy. See sound-core.js for the room.
// Each voice: (ac, dest, t, { level, seed, rng, pan, gain }) => seconds. `level` is already
// LEVEL[name] * gain * TRIM[name]. Every voice goes out through place(), so it is in the room.
//
// HOW THIS FAMILY IS MADE. A spring snapping over, a nail on glass or a bubble pinching off is
// a matter of a few hundred microseconds, and a bubble's pitch rises as it lives. Scheduling
// that as dozens of oscillators and gain ramps costs nodes and gets the physics wrong. So each
// voice here computes its own waveform sample by sample in a mono AudioBuffer (modes as damped
// sines, driven resonators, Minnaert bubbles, a chip's sample-and-hold) at the context's own
// rate, and plays it at `t` through one gain and place(). That is four or five audio nodes a
// cue, and it renders identically in an OfflineAudioContext. Each buffer is normalised and then
// scaled by a seeded few per cent, so TRIM is simply the ratio LEVEL wants. The exception is
// the fly: its level is absolute, because consecutive buzzes must join up (see `buzz`).
import { place, mulberry32 } from './sound-core.js';

const TAU = Math.PI * 2;

// ---- the little DSP kit ------------------------------------------------------------------------
function frame(ac, seconds) {
  const sr = ac.sampleRate;
  return { sr, d: new Float64Array(Math.max(2, Math.ceil(seconds * sr))) };
}

// Normalise, taper the last 3 ms so nothing ends on a step, and play at `t` into the room.
function ship(ac, dest, t, d, { level, pan = 0, room = 0.2, vary = 1, norm = true }) {
  const sr = ac.sampleRate, n = d.length;
  let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
  const k = norm ? (pk > 0 ? vary / pk : 0) : 1;
  const tail = Math.min(n, Math.floor(0.003 * sr));
  const b = ac.createBuffer(1, n, sr);
  const ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = d[i] * k;
  for (let j = 0; j < tail; j++) ch[n - 1 - j] *= j / tail;
  const s = ac.createBufferSource();
  s.buffer = b;
  const g = ac.createGain();
  g.gain.value = level;
  s.connect(g);
  g.connect(place(ac, dest, { pan, room }));
  s.start(t);
  return n / sr;
}

// A mode: a damped sine added from `at` seconds. `t60` is its 60 dB ring time. `rise` bends the
// pitch upward by that fraction per second (a bubble), `drop` bends it down (a spring settling).
function ring(d, sr, at, f, amp, t60, { rise = 0, drop = 0, dropT = 0.02, phase = 0 } = {}) {
  const i0 = Math.max(0, Math.round(at * sr));
  const n = Math.min(d.length - i0, Math.ceil(t60 * 1.05 * sr));
  if (n <= 0 || amp === 0) return;
  const dec = Math.exp(-6.91 / (t60 * sr));
  let e = amp, ph = phase;
  for (let k = 0; k < n; k++) {
    const s = k / sr;
    let fk = f;
    if (rise) fk *= 1 + rise * s;
    if (drop) fk *= 1 + drop * Math.exp(-s / dropT);
    if (fk >= sr * 0.47) break;
    d[i0 + k] += e * Math.sin(ph);
    ph += (TAU * fk) / sr;
    e *= dec;
  }
}

// A contact: a few samples of shaped noise. `ms` is how long the surfaces touch. A hard short
// contact is bright, a soft long one is dull, and that is the whole difference between metal
// meeting metal and a thumb meeting plastic.
function click(d, sr, at, amp, ms, rng, { hp = 0 } = {}) {
  const i0 = Math.max(0, Math.round(at * sr));
  const n = Math.max(2, Math.ceil((ms / 1000) * sr * 4));
  const tau = (ms / 1000) * sr;
  let prev = 0;
  for (let k = 0; k < n && i0 + k < d.length; k++) {
    let x = (rng() * 2 - 1) * Math.exp(-k / tau);
    if (k === 0) x = amp > 0 ? 1 : -1; // the first sample is the hit itself
    // a one-zero highpass tilts the contact toward its top end when asked
    const y = hp ? x - hp * prev : x;
    prev = x;
    d[i0 + k] += amp * y;
  }
}

// RBJ biquad, in place, direct form I. type: lp hp bp peak.
function biquad(d, sr, type, f, q = 0.707, db = 0) {
  f = Math.min(f, sr * 0.45);
  const w = (TAU * f) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q), A = Math.pow(10, db / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') [b0, b1, b2, a0, a1, a2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2, 1 + al, -2 * cw, 1 - al];
  else if (type === 'hp') [b0, b1, b2, a0, a1, a2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al];
  else if (type === 'bp') [b0, b1, b2, a0, a1, a2] = [al, 0, -al, 1 + al, -2 * cw, 1 - al];
  else [b0, b1, b2, a0, a1, a2] = [1 + al * A, -2 * cw, 1 - al * A, 1 + al / A, -2 * cw, 1 - al / A];
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const x = d[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    d[i] = y;
  }
  return d;
}

// A bank of two-pole resonators driven by `x`, summed into `d`. modes: [[hz, amp, t60]].
// This is a struck object that can be struck again while it is still ringing, which is what a
// bell's clapper does forty times a second.
function resonators(d, x, sr, modes) {
  for (const [f, amp, t60] of modes) {
    if (f >= sr * 0.47) continue;
    const r = Math.exp(-6.91 / (t60 * sr)), th = (TAU * f) / sr;
    const c1 = 2 * r * Math.cos(th), c2 = -r * r, g = amp * Math.sin(th);
    let y1 = 0, y2 = 0;
    for (let i = 0; i < d.length; i++) {
      const y = x[i] + c1 * y1 + c2 * y2;
      y2 = y1; y1 = y;
      d[i] += g * y;
    }
  }
}

const rc = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u))); // 0 → 1, raised cosine

// ================================================================================================
export const VOICES = {};
export const TRIM = {};
export const LENGTH = {};

// ---- THE CAT LAMP'S TUMBLER ----------------------------------------------------------------------
// A bakelite tumbler in the base of a hollow china cat. The thumb loads the spring (a faint dry
// tick as the toggle starts to move), then 10-17 ms later it goes over centre and hits its stop:
// one hard contact, a bounce 3 ms after it, the brass contact leaf closing with a tiny bright
// ting, and the porcelain answering thinly because it is hollow. The porcelain's modes are
// inharmonic and die in under a tenth of a second, so there is no pitch in it to hum while Pepe
// talks.
VOICES.switch = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 7717 + 1);
  const { sr, d } = frame(ac, LENGTH.switch);
  // bakelite toggle and base: stiff, lossy, few modes
  const bake = [[2480, 0.5, 0.012], [3910, 0.35, 0.009], [5870, 0.22, 0.006], [880, 0.18, 0.015]];
  // the hollow china cat, about 12 cm: thin shell, quiet, short
  const china = [[1270, 0.14, 0.055], [2140, 0.12, 0.045], [3380, 0.1, 0.038], [4960, 0.07, 0.03]];
  const tick = 0.2 + rng() * 0.1;
  click(d, sr, 0, tick, 0.25, rng, { hp: 0.6 });
  for (const [f, a, r] of bake) ring(d, sr, 0, f * (1 + (rng() - 0.5) * 0.02), a * tick, r);
  const at = 0.010 + rng() * 0.007;
  click(d, sr, at, 1, 0.12, rng, { hp: 0.8 });
  const pos = 0.6 + rng() * 0.4; // where the thumb is on the toggle changes the mix of modes
  for (const [f, a, r] of bake) ring(d, sr, at, f * (1 + (rng() - 0.5) * 0.015), a * (0.6 + 0.4 * pos), r);
  for (const [f, a, r] of china) ring(d, sr, at, f * (1 + (rng() - 0.5) * 0.01), a * (1.4 - pos * 0.6), r);
  ring(d, sr, at + 0.0004, 7350 + rng() * 300, 0.14, 0.022); // the contact leaf
  ring(d, sr, at, 240, 0.12, 0.02); // the base on the table
  const bounce = at + 0.0026 + rng() * 0.0014;
  click(d, sr, bounce, 0.34, 0.08, rng, { hp: 0.8 });
  for (const [f, a, r] of bake.slice(0, 2)) ring(d, sr, bounce, f, a * 0.3, r, { phase: 1.3 });
  return ship(ac, dest, t, d, { level, pan, room: 0.18, vary: 0.9 + rng() * 0.1 });
};
TRIM.switch = 1.107;
LENGTH.switch = 0.06;

// ---- THE MAINS LEVER ------------------------------------------------------------------------------
// A cast-iron fuse box on the plaster, a steel lever on an over-centre spring, copper knife blades
// in brass jaws, and the load is the chandelier. Order of events, as it happens: the spring throws
// the lever, and the blades leave the jaws with a short bright scrape. The contacts break under
// load, so there is a small arc: a crackle chopped by the mains half-cycles. About 30 ms later the
// lever slams its stop. That is the heavy part: a low thump of box and wall, and cast iron's few
// damped plate modes (grey iron is lossy, so it clunks and does not ring). A second contact
// follows as the lever bounces. Last, the spring: a coil shocked at the end of its travel keeps
// singing for a quarter of a second, a little flat as it settles, with a dispersive "zwip" as the
// shock runs down its coils.
VOICES.clack = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 9173 + 2);
  const { sr, d } = frame(ac, LENGTH.clack);
  // the blades leaving the jaws: 12 ms of metal on metal, chattering
  const scrape = new Float64Array(d.length);
  const sN = Math.floor(0.013 * sr);
  for (let i = 0; i < sN; i++) {
    const u = i / sN;
    const chatter = rng() < 0.08 ? 2.2 : 1;
    scrape[i] = (rng() * 2 - 1) * (1 - u) * chatter;
  }
  biquad(scrape, sr, 'bp', 4200 + rng() * 800, 1.1);
  biquad(scrape, sr, 'peak', 6800, 3, 6);
  // the arc: bursts of crackle on the 100 Hz half-cycles, dying as the gap widens
  const arcN = Math.floor((0.008 + rng() * 0.006) * sr);
  for (let i = 0; i < arcN; i++) {
    const s = i / sr, half = Math.abs(Math.sin(TAU * 50 * s + 0.4));
    if (rng() < 0.35) scrape[i] += (rng() * 2 - 1) * Math.pow(half, 3) * 1.6 * (1 - i / arcN);
  }
  for (let i = 0; i < d.length; i++) d[i] += scrape[i] * 0.5;
  click(d, sr, 0, 0.3, 0.05, rng, { hp: 0.9 });

  // the slam
  const at = 0.026 + rng() * 0.009;
  const hard = 0.9 + rng() * 0.1;
  click(d, sr, at, 0.55 * hard, 0.35, rng);
  // the box and the wall behind it: a thump that sags as the plaster takes it
  ring(d, sr, at, 74 + rng() * 10, 0.6 * hard, 0.11, { drop: 0.25, dropT: 0.015 });
  ring(d, sr, at, 121 + rng() * 12, 0.45 * hard, 0.08, { drop: 0.15 });
  // cast-iron plate modes, lossy
  const iron = [[212, 0.62, 0.15], [388, 0.62, 0.13], [617, 0.5, 0.11], [934, 0.42, 0.09], [1372, 0.3, 0.07], [2058, 0.19, 0.05], [2985, 0.12, 0.035]];
  for (const [f, a, r] of iron) ring(d, sr, at, f * (1 + (rng() - 0.5) * 0.03), a * hard * (0.7 + rng() * 0.3), r);
  // the steel lever as a clamped bar: 1 : 6.27
  const bar = 455 + rng() * 40;
  ring(d, sr, at, bar, 0.2, 0.2);
  ring(d, sr, at, bar * 6.27, 0.08, 0.1);
  // the bounce
  const bo = at + 0.008 + rng() * 0.006;
  click(d, sr, bo, 0.2, 0.25, rng);
  ring(d, sr, bo, 96, 0.3, 0.06);
  for (const [f, a, r] of iron.slice(1, 5)) ring(d, sr, bo, f * 1.004, a * 0.3, r * 0.8, { phase: 2 });
  // the spring: stretched harmonics, a little sharp at the shock and settling flat
  const sp = 158 + rng() * 26;
  for (let k = 1; k <= 7; k++) {
    const f = sp * k * (1 + 0.0035 * k * k);
    ring(d, sr, at + 0.002, f, (0.16 / Math.pow(k, 0.6)) * (0.7 + rng() * 0.6), 0.32 / Math.pow(k, 0.35), { drop: 0.03, dropT: 0.03 });
  }
  // the shock running down the coils: a falling chirp, dispersion's signature
  const zN = Math.floor(0.045 * sr), zi = Math.round((at + 0.003) * sr);
  let zp = 0;
  for (let k = 0; k < zN && zi + k < d.length; k++) {
    const u = k / zN;
    const f = 3600 * Math.pow(600 / 3600, Math.sqrt(u));
    zp += (TAU * f) / sr;
    d[zi + k] += 0.05 * Math.sin(zp) * (1 - u) * (1 - u);
  }
  return ship(ac, dest, t, d, { level, pan, room: 0.42, vary: 0.9 + rng() * 0.1 });
};
TRIM.clack = 1.026;
LENGTH.clack = 0.26;

// ---- THE RADIO'S KNOB, BETWEEN STATIONS ------------------------------------------------------------
// A valve superhet tuned off its station. The knob itself is bakelite with a dry tick under the
// thumb; everything else comes OUT OF THE SPEAKER. As the carrier goes, the AGC opens up and the
// hiss rises into the gap. Atmospherics crack through it: impulses with a heavy-tailed size,
// rung by the IF so each one is a little "krk", not a digital tick. One station is swept past on
// the way. Its carrier beats against the set's oscillator as a whistle, which swoops down to zero
// beat and up again, and at the bottom of the swoop a snatch of the programme murmurs through.
// All of it is limited to the band a 1940s set has (about 250 Hz to 4 kHz), coloured by the
// cone, and softly clipped by the output valve.
VOICES.static = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 6007 + 3);
  const L = LENGTH.static;
  const { sr, d } = frame(ac, L);
  const n = d.length;
  const rad = new Float64Array(n);
  const t0 = 0.11 + rng() * 0.14; // where the passing station sits
  const K = 15000 + rng() * 9000; // how fast the knob sweeps it, in Hz of beat per second
  const up = 0.05, down = L - 0.13;
  let wp = 0, mur = 0;
  const mRate = 4 + rng() * 3, mPh = rng() * TAU;
  for (let i = 0; i < n; i++) {
    const s = i / sr;
    // the AGC: the hiss is half up already (the old carrier going) and fully open by 50 ms
    let e = s < up ? 0.55 + 0.45 * rc(s / up) : 1;
    if (s > down) e *= 1 - rc((s - down) / (L - down));
    // the carrier of the passing station pulls the AGC down around it
    const near = Math.exp(-Math.pow((s - t0) / 0.06, 2));
    let x = 0.7 * (rng() * 2 - 1) * e * (1 - 0.45 * near);
    // atmospherics: a spark somewhere, arriving as a burst a fraction of a millisecond long
    if (rng() < 75 / sr) {
      const a = (rng() < 0.5 ? -1 : 1) * Math.min(9, 1.4 * Math.pow(rng(), -0.7)) * e;
      const tau = 6 + rng() * 40;
      for (let k = 0; k < tau * 4 && i + k < n; k++) rad[i + k] += a * Math.exp(-k / tau) * (k ? rng() * 2 - 1 : 1);
    }
    // the heterodyne
    const f = 90 + K * Math.abs(s - t0);
    wp += (TAU * f) / sr;
    const wAmp = 0.55 * Math.exp(-Math.pow((s - t0) / 0.085, 2)) * e;
    x += wAmp * (Math.sin(wp) + 0.22 * Math.sin(2 * wp));
    // the programme, just at zero beat: dull, syllabic, gone at once
    mur = mur * 0.93 + (rng() * 2 - 1) * 0.07;
    const syl = 0.5 + 0.5 * Math.sin(TAU * mRate * s + mPh);
    x += 3.2 * mur * syl * Math.exp(-Math.pow((s - t0) / 0.04, 2));
    rad[i] += x;
  }
  // the set: audio band, cone, output valve
  biquad(rad, sr, 'hp', 250, 0.7);
  biquad(rad, sr, 'hp', 200, 0.6);
  biquad(rad, sr, 'lp', 3900, 0.8);
  biquad(rad, sr, 'lp', 4600, 0.6);
  biquad(rad, sr, 'peak', 980, 1.3, 4);
  biquad(rad, sr, 'peak', 2600, 2, 2.5);
  // the output valve: driven by level, not by the loudest spark, so a big crack clips and the
  // hiss under it does not duck
  let ms = 0;
  for (let i = 0; i < n; i++) ms += rad[i] * rad[i];
  const drive = 1 / (3.2 * Math.sqrt(ms / n));
  for (let i = 0; i < n; i++) d[i] += Math.tanh(drive * rad[i]) * 0.62;
  // the knob, in the room, under the thumb
  click(d, sr, 0, 0.6, 0.15, rng, { hp: 0.7 });
  ring(d, sr, 0, 2350 + rng() * 150, 0.4, 0.014);
  ring(d, sr, 0, 3950 + rng() * 200, 0.25, 0.009);
  ring(d, sr, 0, 910, 0.22, 0.02);
  return ship(ac, dest, t, d, { level, pan, room: 0.3, vary: 0.92 + rng() * 0.08 });
};
TRIM.static = 1.124;
LENGTH.static = 0.44;

// ---- A FINGERNAIL ON THE MIRROR ----------------------------------------------------------------------
// 5 mm float glass, silvered and painted behind, clipped to the plaster. A nail is keratin: light
// and hard, a contact of a fraction of a millisecond, so it is a bright tick with almost no low
// end. What rings after it is the glass: a few sparse, very pure high modes that go on for a
// quarter of a second. Where on the pane the nail lands changes which modes speak, so each tap
// has its own mix. Under that is the pane's own mass in its clips, a small dead low "tock". The
// nail flexes and touches twice, a millisecond or two apart.
VOICES.chink = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 4481 + 4);
  const { sr, d } = frame(ac, LENGTH.chink);
  click(d, sr, 0, 1, 0.05, rng, { hp: 0.95 });
  const glass = [[2870, 0.42, 0.34], [4610, 0.34, 0.27], [6930, 0.26, 0.2], [9340, 0.16, 0.14], [3790, 0.2, 0.3], [12100, 0.08, 0.09]];
  for (const [f, a, r] of glass) {
    const x = rng();
    ring(d, sr, 0, f * (1 + (rng() - 0.5) * 0.004), a * Math.abs(Math.sin(Math.PI * (0.2 + 0.8 * x))), r);
  }
  ring(d, sr, 0, 186 + rng() * 20, 0.2, 0.05);
  ring(d, sr, 0, 318 + rng() * 30, 0.12, 0.035);
  const b = 0.0011 + rng() * 0.0012;
  click(d, sr, b, 0.3, 0.04, rng, { hp: 0.95 });
  for (const [f, a, r] of glass.slice(0, 3)) ring(d, sr, b, f, a * 0.25, r * 0.8, { phase: 0.9 });
  return ship(ac, dest, t, d, { level, pan, room: 0.45, vary: 0.88 + rng() * 0.12 });
};
TRIM.chink = 1.187;
LENGTH.chink = 0.3;

// ---- WINE, POURED ---------------------------------------------------------------------------------
// Two places make the sound. In the bottle, air comes up the neck in slugs to replace the wine
// going out. Each slug pinches off as a big bubble (8-12 mm) that rings at its Minnaert frequency,
// 3.26 kHz / radius in mm, so 270-420 Hz. The pitch rises as the bubble rises and the cavity
// closes. The bottle's own neck-and-body Helmholtz resonance answers under it. That is the glug.
// In the glass, each glug sends a surge down the stream, and the stream entrains small bubbles:
// hundreds of them, 0.4-3.5 mm, each a damped rising chirp at 1-8 kHz. The damping and the rise
// follow van den Doel's liquid model (damping 0.043f + 0.0014f^1.5, rise 0.1 x damping). The
// splash under them excites the air column left in the glass, whose pitch climbs a little as
// the wine comes up. When the stream stops, a drop or two falls after it.
VOICES.glug = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 3389 + 5);
  const L = LENGTH.glug;
  const { sr, d } = frame(ac, L);
  const n = d.length;
  // the glugs
  const glugs = [0];
  glugs.push(glugs[0] + 0.115 + rng() * 0.04);
  glugs.push(glugs[1] + 0.12 + rng() * 0.05);
  if (rng() < 0.4) glugs.push(glugs[2] + 0.11 + rng() * 0.03);
  const stop = glugs[glugs.length - 1] + 0.085 + rng() * 0.02;
  glugs.forEach((g, j) => {
    const f0 = 300 - 18 * j + rng() * 90;
    const a = (1 - 0.13 * j) * (0.8 + rng() * 0.2);
    click(d, sr, g, 0.18 * a, 1.2, rng); // the slug through the neck
    ring(d, sr, g, f0, a, 0.085 + rng() * 0.03, { rise: 4 + rng() * 2.5 });
    ring(d, sr, g, f0 * 2.02, a * 0.14, 0.05, { rise: 4 });
    ring(d, sr, g + 0.002, 148 + rng() * 22, a * 0.4, 0.06); // the bottle's cavity
  });
  // the stream's flow: a surge after every glug, nothing after `stop`
  const flow = (s) => {
    if (s > stop + 0.03) return 0;
    let q = s < 0.02 ? s / 0.02 * 0.3 : 0.3;
    for (const g of glugs) if (s > g + 0.012) q += 0.9 * Math.exp(-(s - g - 0.012) / 0.05);
    return s > stop ? q * (1 - (s - stop) / 0.03) : q;
  };
  // the small bubbles, laid millisecond by millisecond
  const dt = 0.001;
  for (let s = 0; s < stop + 0.03; s += dt) {
    const lam = 420 * flow(s) * dt;
    const k = rng() < lam ? 1 : 0;
    for (let j = 0; j < k; j++) {
      const r = Math.min(3.5, 0.42 * Math.pow(1 - rng() * 0.98, -1 / 1.6));
      const f = 3260 / r;
      if (f > sr * 0.45) continue;
      const damp = 0.043 * f + 0.0014 * Math.pow(f, 1.5);
      const amp = 0.075 * Math.pow(r / 1.5, 0.9) * (0.4 + rng() * 0.9);
      ring(d, sr, s + rng() * dt, f, amp, Math.min(0.12, 6.91 / damp), { rise: 0.1 * damp });
    }
  }
  // the splash and the air column in the glass above it
  const spl = new Float64Array(n);
  for (let i = 0; i < n; i++) spl[i] = (rng() * 2 - 1) * flow(i / sr);
  const col = new Float64Array(n);
  {
    let y1 = 0, y2 = 0;
    const r = Math.exp(-6.91 / (0.05 * sr));
    const fa = 930 + rng() * 60;
    for (let i = 0; i < n; i++) {
      const s = i / sr, f = fa * (1 + 0.1 * Math.min(1, s / stop));
      const y = spl[i] + 2 * r * Math.cos((TAU * f) / sr) * y1 - r * r * y2;
      y2 = y1; y1 = y;
      col[i] = y;
    }
  }
  biquad(spl, sr, 'bp', 2600, 0.6);
  let cp = 0;
  for (let i = 0; i < n; i++) cp = Math.max(cp, Math.abs(col[i]));
  for (let i = 0; i < n; i++) d[i] += spl[i] * 0.07 + (col[i] / cp) * 0.08;
  // a drop or two after the stream: the classic plink, a single bubble with its rise
  const drops = 1 + (rng() < 0.5 ? 1 : 0);
  for (let j = 0; j < drops; j++) {
    const at = stop + 0.04 + j * (0.05 + rng() * 0.05);
    if (at > L - 0.06) break;
    const f = 1300 + rng() * 900;
    const damp = 0.043 * f + 0.0014 * Math.pow(f, 1.5);
    ring(d, sr, at, f, 0.18 / (j + 1), 6.91 / damp, { rise: 0.1 * damp * 1.5 });
  }
  return ship(ac, dest, t, d, { level, pan, room: 0.4, vary: 0.9 + rng() * 0.1 });
};
TRIM.glug = 1.007;
LENGTH.glug = 0.6;

// ---- THE NAKAMOTO CARD, TOUCHED ------------------------------------------------------------------
// The one sound in the room that no wood, wire or spring made, so it is the one PURE tone. A sine
// that lands a whisker flat and settles on pitch in 6 ms, with a trace of second harmonic so it has
// a surface. It is held for 20 ms and gone by 80. Almost no room on it: it comes from nowhere in
// particular.
VOICES.blip = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 2551 + 6);
  const { sr, d } = frame(ac, LENGTH.blip);
  const f = 1568 * (1 + (rng() - 0.5) * 0.008);
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const s = i / sr;
    const fi = s < 0.006 ? f * (0.94 + 0.06 * rc(s / 0.006)) : f;
    ph += (TAU * fi) / sr;
    const e = s < 0.0015 ? s / 0.0015 : s < 0.022 ? 1 : Math.exp((-6.91 * (s - 0.022)) / 0.058);
    d[i] = e * (Math.sin(ph) + 0.06 * Math.sin(2 * ph) + 0.015 * Math.sin(3 * ph));
  }
  return ship(ac, dest, t, d, { level, pan, room: 0.1, vary: 0.95 + rng() * 0.05 });
};
TRIM.blip = 1.008;
LENGTH.blip = 0.09;

// ---- PEEP THE TOAD -------------------------------------------------------------------------------
// A pressed-plastic toad with a sound chip and a piezo disc. First the press: a thin plastic
// shell clicking in over its microswitch. Then the chip wakes with a pop on the piezo and plays
// its ROM. The ROM is a recording of a real toad's two-pulse "rib-bit": each syllable is a train
// of pulses (60-75 a second) ringing a vocal sac's two formants. It is stored at about 8 kHz,
// 4 bits, clocked a few per cent off by a tired battery, and played out through one transistor
// into the piezo. Everything that makes a toy sound cheap follows from that. The low end
// is gone, because a piezo cannot move air below about 700 Hz. The piezo's own resonance near
// 3 kHz shrieks through. Quantisation grit sits on every pulse, and sample-and-hold images sit
// above 4 kHz. It is over in under a quarter of a second, well inside the figurine's rock.
VOICES.croak = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 1223 + 7);
  const { sr, d } = frame(ac, LENGTH.croak);
  const n = d.length;
  // the ROM, at the chip's rate
  const CR = 8000 * (0.96 + rng() * 0.07);
  const romS = 0.2;
  const rom = new Float64Array(Math.ceil(romS * CR));
  const syll = [
    { at: 0, dur: 0.078, pr: 74, f: [760, 1880] },
    { at: 0.1, dur: 0.092, pr: 61, f: [650, 1720] },
  ];
  for (const sy of syll) {
    let tp = sy.at;
    let odd = 0;
    while (tp < sy.at + sy.dur) {
      const u = (tp - sy.at) / sy.dur;
      const e = Math.min(1, u / 0.12) * Math.pow(1 - u, 0.6) * (odd++ % 2 ? 0.82 : 1);
      const i0 = Math.round(tp * CR);
      for (let k = 0; k < 0.012 * CR && i0 + k < rom.length; k++) {
        const s = k / CR;
        rom[i0 + k] += e * (Math.sin(TAU * sy.f[0] * s) * Math.exp(-s / 0.0028) + 0.55 * Math.sin(TAU * sy.f[1] * s) * Math.exp(-s / 0.0013));
      }
      tp += (1 / sy.pr) * (0.96 + rng() * 0.08);
    }
  }
  let rp = 0;
  for (const v of rom) rp = Math.max(rp, Math.abs(v));
  // 4 bits, and a transistor driving a disc
  for (let i = 0; i < rom.length; i++) rom[i] = Math.tanh(2.2 * (Math.round((rom[i] / rp) * 7) / 7));
  const chip = 0.011 + rng() * 0.004;
  const pz = new Float64Array(n);
  pz[Math.round(chip * sr)] += 0.8; // the pop as the chip powers the disc
  for (let i = Math.round(chip * sr); i < n; i++) {
    const j = Math.max(0, Math.floor((i / sr - chip) * CR)); // sample and hold
    if (j >= rom.length) break;
    pz[i] += rom[j];
  }
  // the piezo
  biquad(pz, sr, 'hp', 1050, 0.8);
  biquad(pz, sr, 'hp', 900, 0.7);
  biquad(pz, sr, 'hp', 700, 0.6);
  biquad(pz, sr, 'peak', 3050 + rng() * 200, 2.6, 12);
  biquad(pz, sr, 'peak', 1350, 3, 4);
  biquad(pz, sr, 'lp', 7500, 0.7);
  for (let i = 0; i < n; i++) d[i] += pz[i];
  // the press: the shell
  let pp = 0;
  for (let i = 0; i < n; i++) pp = Math.max(pp, Math.abs(d[i]));
  click(d, sr, 0, 0.55 * pp, 0.1, rng, { hp: 0.7 });
  ring(d, sr, 0, 1880 + rng() * 120, 0.35 * pp, 0.02);
  ring(d, sr, 0, 3320 + rng() * 150, 0.25 * pp, 0.014);
  ring(d, sr, 0, 5100, 0.12 * pp, 0.008);
  return ship(ac, dest, t, d, { level, pan, room: 0.28, vary: 0.93 + rng() * 0.07 });
};
TRIM.croak = 1.063;
LENGTH.croak = 0.22;

// ---- A FLY CROSSING THE ROOM ------------------------------------------------------------------------
// A housefly's wings beat about 200 times a second, and what you hear is the pressure pulse of
// each stroke. That is a harmonic buzz, strongest around its third and fourth harmonics, and
// never quite steady: the beat rate wanders a few per cent as the fly turns, each stroke is a
// little different, and the tone brightens as it comes nearer.
// It is re-fired every 1/6 s while something flies, each cue 0.34 s long, so consecutive cues
// overlap, and a crossing has to be ONE sound. So the waveform is not per-cue: the wingbeat
// phase, its wander, its loudness swell and its stroke-to-stroke jitter are all functions of the
// ABSOLUTE audio time, and every cue in a crossing computes the same fly. A cue that arrives while
// the previous one is still sounding fades in over exactly the window the previous one is fading
// out in, with complementary raised-cosine gains. Because the two are phase-identical, the sum is
// the same fly, uninterrupted, and a change of pan between cues becomes a glide. A cue that finds
// no fly sounding starts a new crossing (a new fly: its own beat rate and wander) with a 30 ms
// de-click. After the last re-fire it dies away over 0.14 s.
const FLY = new WeakMap();
let flyTab = null;
function flyTables() {
  if (flyTab) return flyTab;
  const N = 2048, r = mulberry32(5150);
  const ph = Array.from({ length: 25 }, () => r() * TAU);
  const make = (amp) => {
    const tb = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) for (let k = 1; k <= 24; k++) tb[i] += amp(k) * Math.sin((TAU * k * i) / N + ph[k]);
    let pk = 0;
    for (const v of tb) pk = Math.max(pk, Math.abs(v));
    for (let i = 0; i <= N; i++) tb[i] /= pk;
    return tb;
  };
  flyTab = {
    N,
    bright: make((k) => Math.pow(k, -0.7) * (1 + 1.1 * Math.exp(-Math.pow((k - 4) / 2.2, 2)))),
    dull: make((k) => Math.pow(k, -1.35) * (1 + 0.5 * Math.exp(-Math.pow((k - 2) / 1.2, 2)))),
  };
  return flyTab;
}
const hash = (n) => {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (((x ^ (x >>> 16)) >>> 0) / 4294967296) * 2 - 1;
};
VOICES.buzz = (ac, dest, t, { level, seed, pan }) => {
  const sr = ac.sampleRate;
  const H = 0.2, L = LENGTH.buzz;
  let S = FLY.get(ac);
  const cont = !!S && t < S.fadeTo - 0.004;
  const oldFrom = cont ? S.fadeFrom : 0, oldTo = cont ? S.fadeTo : 0;
  if (!cont) {
    const r = mulberry32(seed * 8123 + 8);
    // a new fly: its beat rate, the rates and phases of its wander, and its stroke-jitter salt
    S = {
      F0: 186 + r() * 34,
      w: [[0.63 + r() * 0.2, 0.034, r() * TAU], [1.7 + r() * 0.5, 0.02, r() * TAU], [5.3 + r() * 1.5, 0.007, r() * TAU]],
      a: [[0.8 + r() * 0.4, 0.22, r() * TAU], [2.3 + r() * 0.8, 0.1, r() * TAU]],
      salt: (r() * 1e6) | 0,
    };
  }
  const inFrom = cont ? Math.max(t, oldFrom) : t;
  const inTo = cont ? oldTo : t + 0.03;
  const outFrom = Math.max(t + H, inTo);
  const outTo = Math.max(t + L, outFrom + 0.05);
  S.fadeFrom = outFrom;
  S.fadeTo = outTo;
  FLY.set(ac, S);

  const { N, bright, dull } = flyTables();
  const n = Math.ceil((outTo - t) * sr) + 1;
  const b = ac.createBuffer(1, n, sr);
  const ch = b.getChannelData(0);
  const late = cont && t > oldFrom;
  // the fly's slow parts (phase, swell, nearness) at a control rate of 32 samples, exact at every
  // block edge and linear between: well under a thousandth of a cycle from the exact phase, so
  // two cues on different sample grids still agree
  const ctl = (tau) => {
    let cyc = S.F0 * tau;
    for (const [hz, m, p] of S.w) cyc += ((S.F0 * m) / (TAU * hz)) * (Math.cos(p) - Math.cos(TAU * hz * tau + p));
    let amp = 1;
    for (const [hz, m, p] of S.a) amp += m * Math.sin(TAU * hz * tau + p);
    const near = 0.5 + 0.5 * Math.sin(TAU * S.a[0][0] * tau + S.a[0][2]); // nearer is louder and brighter
    return [cyc, amp, near];
  };
  const CR = 32;
  let A = ctl(t), B = ctl(t + CR / sr);
  for (let i = 0; i < n; i++) {
    const u = (i % CR) / CR;
    if (i && !u) (A = B), (B = ctl(t + (i + CR) / sr));
    const tau = t + i / sr;
    // this cue's gain
    let g;
    if (tau < inFrom) g = 0;
    else if (cont) {
      g = rc((tau - oldFrom) / (oldTo - oldFrom)); // = 1 - the old cue's fade-out, at every sample
      if (late) g *= Math.min(1, (tau - t) / 0.008);
    } else g = rc((tau - t) / (inTo - t));
    if (tau > outFrom) g *= 1 - rc((tau - outFrom) / (outTo - outFrom));
    if (g <= 0) continue;
    // the fly, as a function of absolute time only
    const cyc = A[0] + (B[0] - A[0]) * u, amp = A[1] + (B[1] - A[1]) * u, near = A[2] + (B[2] - A[2]) * u;
    const whole = Math.floor(cyc), frac = cyc - whole;
    const jit = 1 + 0.13 * (hash(whole + S.salt) * (1 - frac) + hash(whole + 1 + S.salt) * frac);
    const x = frac * N, ix = x | 0, fx = x - ix;
    const vb = bright[ix] + (bright[ix + 1] - bright[ix]) * fx;
    const vd = dull[ix] + (dull[ix + 1] - dull[ix]) * fx;
    ch[i] = g * amp * jit * (vd + (vb - vd) * (0.35 + 0.5 * near)) * 0.62;
  }
  const s = ac.createBufferSource();
  s.buffer = b;
  const gn = ac.createGain();
  gn.gain.value = level;
  s.connect(gn);
  gn.connect(place(ac, dest, { pan, room: 0.4 }));
  s.start(t);
  return L;
};
TRIM.buzz = 1.278;
LENGTH.buzz = 0.34;

// ---- A JACK GOING HOME (unused) ---------------------------------------------------------------------
// A brass exchange plug into a jack on a wooden board. The tip meets the bushing (a small brass
// tick), then the springs ride up the shank: a short scrape with a bump where the tip insulator
// passes. The tip spring drops into its groove with a clear brass snap that rings for a few tens
// of milliseconds, and in the same instant the plug's ebonite shoulder seats against the panel,
// a dull wooden knock under it.
VOICES.plug = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 5231 + 9);
  const { sr, d } = frame(ac, LENGTH.plug);
  const brass = [[3980, 0.4, 0.05], [6120, 0.3, 0.04], [8750, 0.18, 0.03], [2410, 0.2, 0.06]];
  click(d, sr, 0, 0.45, 0.08, rng, { hp: 0.8 });
  for (const [f, a, r] of brass) ring(d, sr, 0, f * 1.03, a * 0.35, r * 0.5);
  const slide = 0.026 + rng() * 0.01;
  const sc = new Float64Array(d.length);
  const i0 = Math.round(0.002 * sr), i1 = Math.round(slide * sr);
  for (let i = i0; i < i1; i++) sc[i] = (rng() * 2 - 1) * (rng() < 0.1 ? 2 : 1) * (0.5 + 0.5 * Math.sin((Math.PI * (i - i0)) / (i1 - i0)));
  biquad(sc, sr, 'bp', 3600, 1.4);
  for (let i = 0; i < d.length; i++) d[i] += sc[i] * 0.22;
  click(d, sr, slide * 0.5, 0.25, 0.1, rng, { hp: 0.8 });
  click(d, sr, slide, 1, 0.07, rng, { hp: 0.85 });
  for (const [f, a, r] of brass) ring(d, sr, slide, f * (1 + (rng() - 0.5) * 0.01), a, r);
  ring(d, sr, slide, 310 + rng() * 40, 0.4, 0.03); // the shoulder on the board
  ring(d, sr, slide, 720, 0.18, 0.02);
  return ship(ac, dest, t, d, { level, pan, room: 0.35, vary: 0.9 + rng() * 0.1 });
};
TRIM.plug = 1.02;
LENGTH.plug = 0.1;

// ---- THE EXCHANGE'S DIAL TONE (unused) ---------------------------------------------------------------
// The line's relay closing (a click), then the French continuous 440, as a real exchange's tone
// generator makes it: a whisker of second and third harmonic from its transformer, a slow wobble
// in level, the mains' odd harmonics humming under it, and the hiss of a long open pair. All of it
// is held to the band a telephone line passes (300-3400 Hz), and at the end it is cut as the
// cord comes out, with a small click. It is meant to be played `through: 'set'`, whose own filters
// are the radio's box. A little cone colour and a valve's soft clip are put on here as well.
VOICES.dialtone = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 3907 + 10);
  const L = LENGTH.dialtone;
  const { sr, d } = frame(ac, L);
  const n = d.length;
  const on = 0.012 + rng() * 0.008, off = L - 0.012;
  const wob = rng() * TAU;
  let hiss = 0;
  for (let i = 0; i < n; i++) {
    const s = i / sr;
    let x = 0;
    if (s >= on && s < off) {
      const u = s - on;
      const e = Math.min(1, u / 0.004) * Math.min(1, (off - s) / 0.004) * (1 + 0.012 * Math.sin(TAU * 0.35 * s + wob));
      x += e * (Math.sin(TAU * 440 * u) + 0.045 * Math.sin(TAU * 880 * u + 0.5) + 0.03 * Math.sin(TAU * 1320 * u + 1.1));
      x += 0.025 * (Math.sin(TAU * 150 * s) + 0.6 * Math.sin(TAU * 250 * s + 0.7));
    }
    hiss = hiss * 0.6 + (rng() * 2 - 1) * 0.4;
    x += hiss * (s < off ? 0.03 : 0.01);
    d[i] = x;
  }
  click(d, sr, 0, 0.7, 0.3, rng); // the relay
  click(d, sr, off, 0.4, 0.2, rng); // the cord out
  biquad(d, sr, 'hp', 300, 0.7);
  biquad(d, sr, 'hp', 280, 0.6);
  biquad(d, sr, 'lp', 3400, 0.7);
  biquad(d, sr, 'lp', 3600, 0.6);
  biquad(d, sr, 'peak', 1100, 2, 3);
  let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
  for (let i = 0; i < n; i++) d[i] = Math.tanh((1.4 * d[i]) / pk);
  return ship(ac, dest, t, d, { level, pan, room: 0.15, vary: 0.96 + rng() * 0.04 });
};
TRIM.dialtone = 1.005;
LENGTH.dialtone = 1.0;

// ---- A FRENCH TELEPHONE BELL, RUNG ONCE (unused) --------------------------------------------------------
// Two steel cup gongs, a minor third apart, and a clapper on a polarised armature, driven by
// the 50 Hz ringing current. The clapper swings between the gongs and strikes each about 25 times
// a second, alternately. Each strike is a real strike: a hard metal contact into a bank of
// resonators, so a gong still ringing is struck again with whatever phase it has. That is the
// shimmer of a real bell and the thing a tremolo cannot fake. The French cadence is 1.5 s of
// current, then the gongs run down. Heard from the far wall: the room takes the top off.
VOICES.bell = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 6451 + 11);
  const L = LENGTH.bell;
  const { sr, d } = frame(ac, L);
  const n = d.length;
  const ringFor = 1.5;
  const rate = 23 + rng() * 3;
  const xa = new Float64Array(n), xb = new Float64Array(n), tk = new Float64Array(n);
  for (let k = 0; k * (1 / rate) < ringFor; k++) {
    const ta = k / rate, tb = ta + 0.5 / rate + (rng() - 0.5) * 0.002;
    // the armature takes a few strokes to reach full swing, then holds, a little uneven
    const build = k === 0 ? 1 : Math.min(1, 0.6 + 0.15 * k);
    const sa = build * (0.85 + rng() * 0.15), sb = build * (0.8 + rng() * 0.15);
    const ia = Math.round(ta * sr), ib = Math.round(tb * sr);
    if (ia < n) { xa[ia] += sa; tk[ia] += sa * (rng() < 0.5 ? 1 : -1); }
    if (ib < n && tb < ringFor) { xb[ib] += sb; tk[ib] += sb * (rng() < 0.5 ? 1 : -1); }
  }
  const fa = 1036 * (1 + (rng() - 0.5) * 0.01), fb = fa * 1.199;
  const gong = (f) => [[f, 1, 1.5], [f * 2.32, 0.5, 1.0], [f * 2.93, 0.32, 0.8], [f * 4.3, 0.26, 0.55], [f * 5.66, 0.14, 0.4], [f * 7.18, 0.08, 0.3]];
  resonators(d, xa, sr, gong(fa));
  resonators(d, xb, sr, gong(fb).map(([f, a, r], i) => [f * (i ? 1.012 : 1), a * 0.9, r]));
  // the clapper's contact, bright and dry
  let prev = 0;
  for (let i = 0; i < n; i++) {
    if (tk[i]) for (let k = 0; k < 24 && i + k < n; k++) d[i + k] += 0.35 * tk[i] * Math.exp(-k / 3) * (k ? (rng() * 2 - 1) : 1);
  }
  // the armature buzzing in its frame, under the ring, only while the current is on
  for (let i = 0; i < Math.min(n, ringFor * sr); i++) {
    const s = i / sr;
    const v = Math.sign(Math.sin(TAU * 50 * s)) * 0.02;
    d[i] += v - prev * 0.9;
    prev = v;
  }
  biquad(d, sr, 'lp', 5200, 0.6);
  return ship(ac, dest, t, d, { level, pan, room: 0.5, vary: 0.93 + rng() * 0.07 });
};
TRIM.bell = 1.026;
LENGTH.bell = 2.0;

// ---- A NAIL SCORING THE PLASTER (tally.js) ----------------------------------------------------------
// The visitor's own mark going onto the chimney breast: the point of a nail dragged down through
// lime plaster, a hand's length of it. Plaster is not glass and it does not ring; what a point in
// it makes is GRIT — the steel catching on a crumb, slipping, catching on the next, several hundred
// times a second, each catch a contact a fraction of a millisecond long, heard through the wall as
// a dry rasp high up where the crumbs are small. The first catch is the bite and it is the loudest
// thing in it (nothing here fades in); a few crumbs break off on the way down and tick a little
// louder than the rasp; the point lifts off at the end and the rasp stops inside a few
// milliseconds. The nail itself hums a very little, two thin short steel modes, and the breast
// answers each catch low and dead — it is a column of brick in a wall, which is why this is quiet:
// LEVEL 0.03, under the switch and the radio's static. It is something small happening on a wall
// three metres away. It lasts as long as the drawing does: five drawings at 12 fps, 0.42 s.
VOICES.scratch = (ac, dest, t, { level, seed, pan }) => {
  const rng = mulberry32(seed * 6353 + 7);
  const { sr, d } = frame(ac, LENGTH.scratch);
  const n = d.length;
  const drag = 0.36 + rng() * 0.04; // how long the point is on the wall
  const x = new Float64Array(n); // the catches
  const lift = (u) => 1 - rc((u - 0.86) / 0.14); // the point coming away
  // the stick-slip: 450..900 catches a second, clumped where the plaster is rougher
  let at = 0.006;
  const wander = rng() * 6;
  while (at < drag) {
    const u = at / drag;
    const press = (0.62 + 0.22 * Math.sin(u * 7.3 + wander) + 0.1 * Math.sin(u * 23 + wander * 2)) * lift(u);
    const i = Math.round(at * sr);
    if (i < n) x[i] += press * (0.35 + 0.65 * rng()) * (rng() < 0.5 ? 1 : -1);
    at += (1 / (450 + 450 * rng())) * (rng() < 0.12 ? 2.6 : 1);
  }
  // …and the dust between the catches, riding the same pressure
  for (let i = 0; i < Math.min(n, drag * sr); i++) x[i] += (rng() * 2 - 1) * 0.07 * lift(i / sr / drag);
  // the grit is high and narrow-ish; the wall under it is low and dead
  const grit = Float64Array.from(x);
  biquad(grit, sr, 'bp', 3400 + rng() * 500, 1.1);
  const fine = Float64Array.from(x);
  biquad(fine, sr, 'bp', 6800 + rng() * 800, 1.6);
  for (let i = 0; i < n; i++) d[i] += grit[i] + fine[i] * 0.55;
  resonators(d, x, sr, [[640 + rng() * 60, 0.05, 0.018], [1480 + rng() * 120, 0.04, 0.012]]);
  // the nail's own shank, barely: two thin steel modes excited by the catches
  resonators(d, x, sr, [[5230 + rng() * 200, 0.012, 0.03], [8110 + rng() * 300, 0.008, 0.02]]);
  // the bite: the point going in
  click(d, sr, 0, 1.3, 0.12, rng, { hp: 0.85 });
  ring(d, sr, 0, 700 + rng() * 80, 0.25, 0.025);
  // crumbs breaking off on the way down
  const chips = 2 + Math.floor(rng() * 3);
  for (let k = 0; k < chips; k++) click(d, sr, 0.05 + rng() * (drag - 0.1), 0.55 + rng() * 0.3, 0.06, rng, { hp: 0.9 });
  biquad(d, sr, 'hp', 380, 0.7);
  return ship(ac, dest, t, d, { level, pan, room: 0.35, vary: 0.9 + rng() * 0.1 });
};
TRIM.scratch = 1.832;
LENGTH.scratch = 0.46;
