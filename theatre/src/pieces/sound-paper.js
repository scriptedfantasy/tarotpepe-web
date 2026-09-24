// PIECE: sound (paper family) — see sound-core.js for the room and the primitives.
// Each voice: (ac, dest, t, { level, seed, rng, pan, gain }) => seconds. `level` is already
// LEVEL[name] * gain * TRIM[name]. Connect through place(ac, dest, { pan, room }) so it is in the room.
//
// THE CARDS ARE CARD STOCK. A tarot card is 300 g laminated board, 70 x 120 mm: stiff enough to
// spring, smooth enough to slide, and it lives on a cloth over a round wooden table. So nothing in
// this family is "a band of noise": it is built out of the four things that stock actually does.
//
//   A CONTACT. An edge striking an edge. Under a millisecond of broadband impulse, and the card
//   itself ringing for a millisecond or two up where a small stiff plate rings (1.5–4 kHz), with a
//   low flap under it where the sheet pushes air.
//   A CRACKLE. The laminate flexing: sparse micro-fractures, a tenth of a millisecond each, very
//   high, clumped. It is what makes stock sound like stock and not like newsprint.
//   A SLIDE. Friction of a smooth face on a face: a hiss whose grain is its micro-contacts (sparse
//   impulses at a rate that rises with speed) and whose loudness and brightness follow the speed.
//   A LANDING. The cloth. A card coming down flat squeezes out a cushion of air (a dark "fwup") and
//   the felt takes the weight as a thump; the table's wood is under the cloth and only its lowest
//   modes get through, damped.
//
// Every cue is drawn sample by sample into one AudioBuffer and played through a single source, a
// gain and place(): five nodes a cue, whatever is in it. That is what lets a riffle be fifty
// separate card flicks each with its own pitch, and the deal in a fan of twenty-one cost nothing.
// Everything is laid at absolute time `t`, varied by `rng`, and the same code renders offline.
import { place, mulberry32 } from "./sound-core.js";

const PI2 = Math.PI * 2;

// ---- the sheet: a buffer being drawn -----------------------------------------------------------
function sheet(ac, dur, stereo = false) {
  const sr = ac.sampleRate,
    n = Math.max(2, Math.ceil(dur * sr));
  return {
    sr,
    n,
    dur,
    L: new Float32Array(n),
    R: stereo ? new Float32Array(n) : null,
  };
}
// equal-power gains for a stereo sheet, unity at centre so the mono sum reads the same
function gains(S, pan = 0) {
  if (!S.R) return [1, 0];
  const a = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2];
}
// Normalise to the mono peak, vary a little per firing, de-click the tail, and play it.
function emit(ac, dest, t, S, { level, pan = 0, room = 0.15, vary = 1 }) {
  const { L, R, n, sr } = S;
  let pk = 1e-9;
  for (let i = 0; i < n; i++)
    pk = Math.max(pk, Math.abs(R ? (L[i] + R[i]) / 2 : L[i]));
  const k = vary / pk;
  const tail = Math.min(n, Math.round(0.004 * sr));
  for (let i = 0; i < n; i++) {
    const f = i >= n - tail ? (n - 1 - i) / tail : 1;
    L[i] *= k * f;
    if (R) R[i] *= k * f;
  }
  const b = ac.createBuffer(R ? 2 : 1, n, sr);
  b.getChannelData(0).set(L);
  if (R) b.getChannelData(1).set(R);
  const src = ac.createBufferSource();
  src.buffer = b;
  const g = ac.createGain();
  g.gain.value = level;
  src.connect(g);
  g.connect(place(ac, dest, { pan, room }));
  src.start(t);
  src.stop(t + S.dur + 0.01);
  return S.dur;
}

// ---- a biquad, in JS (RBJ) -------------------------------------------------------------------------
class Bq {
  constructor(kind, f, q, sr) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.kind = kind;
    this.sr = sr;
    this.set(f, q);
  }
  set(f, q) {
    const w = (PI2 * Math.min(f, this.sr * 0.45)) / this.sr,
      cw = Math.cos(w),
      al = Math.sin(w) / (2 * q),
      a0 = 1 + al;
    if (this.kind === "lp")
      ((this.b0 = (1 - cw) / 2 / a0),
        (this.b1 = (1 - cw) / a0),
        (this.b2 = this.b0));
    else if (this.kind === "hp")
      ((this.b0 = (1 + cw) / 2 / a0),
        (this.b1 = -(1 + cw) / a0),
        (this.b2 = this.b0));
    else ((this.b0 = al / a0), (this.b1 = 0), (this.b2 = -al / a0));
    this.a1 = (-2 * cw) / a0;
    this.a2 = (1 - al) / a0;
  }
  run(x) {
    const y =
      this.b0 * x +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// the gain that brings uniform white noise through a band-pass back to unit rms
const bpNorm = (f, q, sr) =>
  Math.sqrt((3 * q * sr) / (Math.PI * Math.min(f, sr * 0.45)));
const lpNorm = (f, sr) =>
  Math.sqrt((3 * sr) / (Math.PI * Math.min(f, sr * 0.45)));

// ---- the four things card stock does --------------------------------------------------------------
// A MODE: a damped cosine, at level on its first sample. `tau` is the 1/e time in seconds. A body
// with several modes passes `ph` so they do not all peak together on the first sample.
function ring(S, at, f, a, tau, pan = 0, ph = 0) {
  const { sr, L, R } = S,
    i0 = Math.round(at * sr);
  if (f >= sr * 0.45 || i0 >= S.n) return;
  const [gl, gr] = gains(S, pan),
    m = Math.min(S.n - i0, Math.ceil(tau * sr * 7)),
    w = (PI2 * f) / sr,
    k = Math.exp(-1 / (tau * sr));
  let e = a;
  for (let j = 0; j < m; j++, e *= k) {
    const v = e * Math.cos(w * j + ph);
    L[i0 + j] += v * gl;
    if (R) R[i0 + j] += v * gr;
  }
}
// A CONTACT: an edge on an edge. A sharp impulse and a millisecond or two of noise behind it,
// through a high-pass (or a band), dying exponentially over `len`.
function contact(
  S,
  at,
  a,
  len,
  rng,
  { hp = 1500, bp = 0, q = 0.8, pan = 0, order = 1 } = {},
) {
  const { sr, L, R } = S,
    i0 = Math.round(at * sr);
  if (i0 >= S.n) return;
  const [gl, gr] = gains(S, pan),
    f = bp ? new Bq("bp", bp, q, sr) : new Bq("hp", hp, 0.7, sr),
    f2 = bp && order > 1 ? new Bq("bp", bp, q, sr) : null;
  const m = Math.min(S.n - i0, Math.ceil(len * sr)),
    k = Math.exp(-4 / Math.max(1, len * sr));
  // `a` is the burst's rms, whatever the filter: a narrow band passes less of the noise
  const nk = bp ? bpNorm(bp, q, sr) * (f2 ? 1.44 : 1) : 1.75;
  let e = a * nk;
  for (let j = 0; j < m; j++, e *= k) {
    let v = f.run(j === 0 ? (rng() < 0.5 ? -1.2 : 1.2) : rng() * 2 - 1);
    if (f2) v = f2.run(v);
    v *= e;
    L[i0 + j] += v * gl;
    if (R) R[i0 + j] += v * gr;
  }
}
// A CRACKLE: the laminate flexing. Micro-fractures at `rate(u)` a second, clumped, each a spike
// and a tenth of a millisecond of very high ring.
function crackle(
  S,
  at,
  dur,
  rate,
  a,
  rng,
  { f = [4200, 9500], pan = 0, width = 0 } = {},
) {
  let time = at;
  const end = at + dur;
  while (time < end) {
    const u = (time - at) / dur,
      r = Math.max(1, typeof rate === "function" ? rate(u) : rate);
    // clumps: a fracture often runs on into two or three more within a millisecond
    time +=
      rng() < 0.45 ? 0.0003 + rng() * 0.0012 : -Math.log(1 - rng() * 0.999) / r;
    if (time >= end) break;
    const lv = a * (0.25 + 0.75 * rng() * rng());
    const p = pan + (rng() * 2 - 1) * width;
    const fr = f[0] * Math.pow(f[1] / f[0], rng());
    ring(S, time, fr, lv, 0.00012 + rng() * 0.0003, p);
    contact(S, time, lv * 0.35, 0.0004, rng, { hp: 3500, pan: p });
  }
}
// A SLIDE: a face on a face. Excitation is hiss plus micro-contacts at `grain` density, through a
// band that follows `f(u)`, under `amp(u)`. `rough` is the stick-slip: a slow wobble on the level.
function slide(
  S,
  at,
  dur,
  rng,
  {
    amp = () => 1,
    f = () => 3000,
    q = 0.9,
    grain = 0.5,
    rate = 2500,
    rough = 0.4,
    pan = 0,
    sheen = 0,
    lo = 0,
    order = 1,
  },
) {
  const { sr, L, R } = S,
    i0 = Math.round(at * sr);
  const m = Math.min(S.n - i0, Math.ceil(dur * sr));
  if (m <= 0) return;
  const [gl, gr] = gains(S, pan);
  const bp = new Bq("bp", f(0), q, sr),
    bp2 = order > 1 ? new Bq("bp", f(0), q, sr) : null,
    hi = sheen ? new Bq("hp", 6500, 0.7, sr) : null,
    lw = lo ? new Bq("lp", 700, 0.7, sr) : null;
  // the noise comes off shared tables at random places (a slide is thousands of samples, and
  // a wash is fifty slides: rng() three times a sample was most of the cost)
  const T = tables(sr),
    W = T.W,
    B = T.B;
  const G = T.G.reduce((a, b) =>
    Math.abs(Math.log(b.rate / rate)) < Math.abs(Math.log(a.rate / rate))
      ? b
      : a,
  ).g;
  const o1 = (rng() * TN) | 0,
    o2 = (rng() * TN) | 0,
    o3 = (rng() * TN) | 0;
  let A = amp(0),
    nk = 1;
  const hk = 1.75,
    lk = lpNorm(700, sr),
    gw = 1 - grain;
  for (let j = 0; j < m; j++) {
    if ((j & 31) === 0) {
      const u = j / m,
        fu = f(u);
      bp.set(fu, q);
      if (bp2) bp2.set(fu, q);
      nk = bpNorm(fu, q, sr) * 1.6 * (bp2 ? 1.44 : 1);
      A = amp(u);
    }
    const w = W[(o1 + j) & TM];
    const x = gw * w + grain * G[(o2 + j) & TM];
    const g = A * Math.max(0, 1 + rough * B[(o3 + j) & TM]);
    let v = (bp2 ? bp2.run(bp.run(x)) : bp.run(x)) * g * nk;
    if (hi) v += hi.run(w) * g * sheen * hk;
    if (lw) v += lw.run(w) * g * lo * lk;
    L[i0 + j] += v * gl;
    if (R) R[i0 + j] += v * gr;
  }
}
// The tables: white noise, micro-contact trains at three densities (unit-ish rms, like the white),
// and the stick-slip wobble (noise under a 90 Hz lowpass, twice, bounded at ±1.3).
const TN = 1 << 17,
  TM = TN - 1,
  TABLES = new Map();
function tables(sr) {
  let T = TABLES.get(sr);
  if (T) return T;
  const r = mulberry32(90210 + sr);
  const W = new Float32Array(TN);
  for (let i = 0; i < TN; i++) W[i] = r() * 2 - 1;
  const G = [1200, 2500, 4000].map((rate) => {
    const p = rate / sr,
      k = Math.sqrt(1 / p) * 0.7,
      g = new Float32Array(TN);
    for (let i = 0; i < TN; i++) g[i] = r() < p ? (r() * 2 - 1) * k : 0;
    return { rate, g };
  });
  const B = new Float32Array(TN),
    wk = 1 - Math.exp((-PI2 * 90) / sr);
  let a = 0,
    b = 0,
    e = 0;
  for (let i = 0; i < TN + 4000; i++) {
    a += wk * (r() * 2 - 1 - a);
    b += wk * (a - b);
    if (i >= 4000) ((B[i - 4000] = b), (e += b * b));
  }
  // unit deviation, then bent over so a slip never more than doubles the level
  const k = 1 / Math.sqrt(e / TN);
  for (let i = 0; i < TN; i++) B[i] = Math.tanh(B[i] * k * 0.9) * 1.3;
  T = { W, G, B };
  TABLES.set(sr, T);
  return T;
}
// A LANDING on the cloth: the felt taking the weight (a sine sagging in pitch) and the cushion of
// air squeezed out from under the sheet (dark noise, at level on the first sample).
function felt(
  S,
  at,
  a,
  rng,
  {
    hz = 105,
    drop = 0.7,
    tau = 0.022,
    air = 0.6,
    airF = 420,
    airTau,
    pan = 0,
  } = {},
) {
  const { sr, L, R } = S,
    i0 = Math.round(at * sr);
  if (i0 >= S.n) return;
  const [gl, gr] = gains(S, pan);
  const m = Math.min(S.n - i0, Math.ceil(tau * sr * 7));
  const k = Math.exp(-1 / (tau * sr)),
    ka = Math.exp(-1 / ((airTau ?? tau * 0.55) * sr));
  const lp1 = new Bq("lp", airF, 0.6, sr),
    lp2 = new Bq("lp", airF * 1.3, 0.6, sr);
  let e = a,
    ea = a * air * lpNorm(airF, sr) * 0.8,
    ph = 0;
  const fall = Math.log(drop) / (tau * 4 * sr);
  for (let j = 0; j < m; j++, e *= k, ea *= ka) {
    const fq = hz * Math.exp(Math.max(fall * j, Math.log(drop)));
    ph += (PI2 * fq) / sr;
    const v = e * Math.sin(ph) + lp2.run(lp1.run(rng() * 2 - 1)) * ea;
    L[i0 + j] += v * gl;
    if (R) R[i0 + j] += v * gr;
  }
}
const R_ = (rng, a, b) => a + (b - a) * rng();
const bell = (u, p = 1) =>
  Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, u)))), p);
// a de-click for the sustained ones only (the brief allows 5–30 ms on a slither)
const ramp = (u, dur, s) => Math.min(1, (u * dur) / s);

export const VOICES = {
  // THE CAMERA CUT. Barely there: one corner of one card flicked by a thumbnail, dry, in the ear.
  // A card's stiff plate ringing for two milliseconds and a dull little body under it — no nib, no
  // scratch, which is what keeps it apart from `type`.
  cut(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.cut);
    const f = R_(rng, 1650, 2150);
    contact(S, 0, 0.55, 0.0012, rng, { hp: 1100 });
    ring(S, 0, f, 0.6, R_(rng, 0.0012, 0.0018));
    ring(S, 0, f * R_(rng, 1.68, 1.84), 0.3, 0.0008);
    ring(S, 0, R_(rng, 520, 680), 0.28, 0.0026);
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.03,
      vary: R_(rng, 0.85, 1),
    });
  },

  // A TITLE CARD SLAPPED DOWN. Stock smacked flat on the cloth, harder than any deal: the laminate
  // cracks on contact, the air under it goes out in one "pap", the far edge lands a few ms after
  // the near one, the felt and the table take the blow, and the card crackles flat again.
  snap(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.snap);
    const fl = R_(rng, 0.006, 0.012);
    contact(S, 0, 0.8, 0.0014, rng, { hp: 2200 });
    ring(S, 0, R_(rng, 2400, 2900), 0.42, 0.0013);
    ring(S, 0, R_(rng, 4100, 4700), 0.24, 0.0008);
    contact(S, 0, 1.3, 0.014, rng, {
      bp: R_(rng, 900, 1400),
      q: 0.7,
      order: 2,
    });
    felt(S, 0, 0.85, rng, {
      hz: R_(rng, 110, 130),
      drop: 0.65,
      tau: 0.017,
      air: 0.5,
      airF: 520,
    });
    ring(S, 0, R_(rng, 175, 195), 0.22, 0.016, 0, rng() * PI2);
    ring(S, 0, R_(rng, 390, 430), 0.12, 0.009, 0, rng() * PI2);
    contact(S, fl, 0.42, 0.004, rng, { bp: 1900, q: 0.7 });
    ring(S, fl, R_(rng, 2200, 2700), 0.2, 0.001);
    crackle(S, 0.004, 0.04, (u) => 260 * (1 - u), 0.14, rng);
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.16,
      vary: R_(rng, 0.88, 1),
    });
  },

  // A CARD LEAVING THE DECK. The thumb breaks the top card loose (a tick), it slides off the face of
  // the next one — a smooth laminated hiss that falls in pitch as the contact shrinks — and its tail
  // edge flicks off the corner of the deck. Fired twenty-one times in a fan, so it is short.
  deal(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.deal);
    const D = R_(rng, 0.06, 0.075),
      f0 = R_(rng, 3400, 4200);
    contact(S, 0, 0.8, 0.001, rng, { hp: 2400 });
    slide(S, 0, D, rng, {
      amp: (u) =>
        0.7 *
        ramp(u, D, 0.004) *
        Math.pow(1 - u, 1.4) *
        (0.75 + 0.25 * bell(u)),
      f: (u) => f0 * (1 - 0.35 * u),
      q: 0.85,
      grain: 0.45,
      rate: 3000,
      rough: 0.3,
      sheen: 0.3,
      lo: 0.12,
    });
    const e = D + R_(rng, -0.004, 0.006);
    contact(S, e, 0.32, 0.0006, rng, { hp: 1800 });
    ring(S, e, R_(rng, 2000, 2500), 0.32, 0.0012);
    ring(S, e, R_(rng, 480, 600), 0.1, 0.003);
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.12,
      vary: R_(rng, 0.84, 1),
    });
  },

  // A CARD LANDING ON THE CLOTH. The heaviest thing a single card does and most of it is low: the air
  // cushion goes out from under it, the felt thumps, the wood under the felt answers faintly, one
  // corner touches first with the smallest tick the cloth lets through, and it skids a centimetre.
  settle(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.settle);
    felt(S, 0, 0.55, rng, {
      hz: R_(rng, 150, 185),
      drop: 0.75,
      tau: R_(rng, 0.011, 0.014),
      air: 1.1,
      airF: R_(rng, 700, 950),
      airTau: 0.007,
    });
    ring(S, 0, R_(rng, 230, 260), 0.15, 0.01);
    contact(S, 0, 0.35, 0.005, rng, {
      bp: R_(rng, 1300, 1800),
      q: 0.8,
      order: 2,
    });
    ring(S, 0, R_(rng, 2900, 3500), 0.07, 0.0009);
    slide(S, 0.006, 0.035, rng, {
      amp: (u) => 0.1 * Math.pow(1 - u, 1.5),
      f: () => 1100,
      q: 0.6,
      grain: 0.6,
      rate: 1500,
      rough: 0.5,
    });
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.15,
      vary: R_(rng, 0.86, 1),
    });
  },

  // THE VISITOR'S CARD DRAWN FROM THE FAN. Pinched (the stock crackles under the fingers), pulled out
  // from between its two neighbours — friction on both faces, speeding up so the band rises, their
  // edges catching as it goes — and the tick when its end clears them and it springs flat.
  pick(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.pick);
    const D = R_(rng, 0.1, 0.115);
    crackle(S, 0, 0.022, 380, 0.3, rng, { f: [3500, 8500] });
    contact(S, 0, 0.3, 0.0008, rng, { hp: 2000 });
    slide(S, 0.004, D, rng, {
      amp: (u) => ramp(u, D, 0.008) * (0.45 + 0.55 * bell(u * 0.85, 0.8)),
      f: (u) => 1500 + 1300 * u,
      q: 0.7,
      grain: 0.6,
      rate: 2500,
      rough: 0.5,
      lo: 0.15,
      order: 2,
    });
    let x = 0.01;
    while ((x += -Math.log(1 - rng() * 0.99) / 70) < D)
      contact(S, x, R_(rng, 0.06, 0.14), 0.0005, rng, {
        bp: R_(rng, 2200, 3600),
        q: 1.2,
      });
    const e = D + 0.004;
    contact(S, e, 0.55, 0.0008, rng, { hp: 1600 });
    ring(S, e, R_(rng, 2200, 2700), 0.4, 0.0014);
    ring(S, e, R_(rng, 480, 580), 0.16, 0.004);
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.12,
      vary: R_(rng, 0.85, 1),
    });
  },

  // A CARD TURNED FACE UP. Lifted by an edge it bends, and lets go: a crisp release snap that rings
  // high in the stock, then a "fwip" of air as the sheet whips over (the band climbs with the spin),
  // and the laminate crackling as it straightens. The landing is `settle`, on its own beat.
  flip(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.flip);
    contact(S, 0, 1, 0.0015, rng, { hp: 1800 });
    ring(S, 0, R_(rng, 2700, 3200), 0.45, 0.0011);
    ring(S, 0, R_(rng, 1550, 1850), 0.28, 0.0016);
    ring(S, 0, R_(rng, 5200, 6000), 0.18, 0.0006);
    const w0 = R_(rng, 0.004, 0.008),
      W = R_(rng, 0.04, 0.05),
      fa = R_(rng, 420, 560);
    slide(S, w0, W, rng, {
      amp: (u) => 0.16 * bell(u, 0.7),
      f: (u) => fa * Math.pow(3.2, u),
      q: 0.9,
      grain: 0.1,
      rate: 4000,
      rough: 0.2,
      lo: 0.25,
      order: 2,
    });
    crackle(S, 0.006, 0.035, (u) => 340 * (1 - u), 0.16, rng);
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.12,
      vary: R_(rng, 0.86, 1),
    });
  },

  // THE RIFFLE. The two halves bent up under the thumbs and let go: a clump of cards at the thumb's
  // first release, then about fifty separate flicks, the halves interleaving left and right, each
  // card its own contact, its own ring and its own little flap of air. The ring rides a contour —
  // rising on some riffles, falling on others — as the bent length under the thumb changes. Under
  // the flicks, faces sliding past the thumbs; at the end the cascade closes up and the pack drops
  // together onto the cloth. The book's page-riffle (walk-book.js) fires the same thing.
  riffle(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.riffle, true);
    const up = rng() < 0.55,
      fA = up ? R_(rng, 1600, 1900) : R_(rng, 2800, 3300),
      fB = up ? fA * R_(rng, 1.6, 1.85) : fA * R_(rng, 0.55, 0.64);
    const contour = (u) => fA * Math.pow(fB / fA, u);
    const T0 = 0.012,
      T1 = R_(rng, 0.33, 0.35),
      N = 44 + Math.floor(rng() * 8);
    // the thumbs let go: a clump of three or four cards at once, the loudest moment of it
    for (let k = 0; k < 4; k++) {
      const at = k * R_(rng, 0.0012, 0.0025),
        p = k % 2 ? 0.3 : -0.3;
      contact(S, at, 0.6 - 0.1 * k, 0.0009, rng, { hp: 1500, pan: p });
      ring(S, at, contour(0) * R_(rng, 0.9, 1.1), 0.45 - 0.07 * k, 0.0014, p);
      ring(S, at, R_(rng, 420, 560), 0.3, 0.003, p);
    }
    crackle(S, 0, 0.02, 500, 0.2, rng, { width: 0.3 });
    // the faces going past the thumbs: a faint burr under everything
    slide(S, 0.004, T1, rng, {
      amp: (u) => 0.1 * ramp(u, T1, 0.01) * (1 - 0.4 * u),
      f: (u) => contour(u) * 1.4,
      q: 0.9,
      grain: 0.7,
      rate: 1800,
      rough: 0.5,
      pan: 0,
    });
    let side = rng() < 0.5 ? 1 : 0;
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1);
      const at = T0 + (T1 - T0) * Math.pow(u, 0.93) + (rng() - 0.5) * 0.0024;
      // the halves interleave, but not perfectly: now and then two drop from the same side
      if (rng() < 0.8) side = 1 - side;
      const p = side ? R_(rng, 0.2, 0.4) : -R_(rng, 0.2, 0.4);
      const fc = contour(u) * (side ? 1.05 : 0.95) * R_(rng, 0.93, 1.07);
      const a = R_(rng, 0.5, 0.8) * (1 - 0.3 * u);
      contact(S, at, a * 0.5, R_(rng, 0.0004, 0.0008), rng, {
        hp: 1800,
        pan: p,
      });
      ring(S, at, fc, a * 0.6, R_(rng, 0.0008, 0.0014), p);
      ring(S, at, fc * R_(rng, 1.52, 1.66), a * 0.26, 0.0006, p);
      ring(S, at, fc * R_(rng, 0.2, 0.26), a * 0.22, 0.0024, p);
    }
    // the cascade closing up: five fast, soft flicks as the last of both halves meet…
    for (let k = 0; k < 5; k++) {
      const at = T1 + 0.004 + k * R_(rng, 0.0028, 0.0042),
        p = k % 2 ? 0.15 : -0.15;
      contact(S, at, 0.28 * (1 - 0.12 * k), 0.0006, rng, { hp: 1600, pan: p });
      ring(
        S,
        at,
        contour(1) * R_(rng, 0.9, 1.05),
        0.25 * (1 - 0.12 * k),
        0.001,
        p,
      );
    }
    // …and the pack dropping together on the cloth
    const land = T1 + 0.026;
    felt(S, land, 0.45, rng, {
      hz: R_(rng, 125, 145),
      drop: 0.7,
      tau: 0.01,
      air: 0.5,
      airF: 520,
    });
    slide(S, land, 0.03, rng, {
      amp: (u) => 0.12 * (1 - u),
      f: () => 2600,
      q: 0.7,
      grain: 0.8,
      rate: 3000,
      rough: 0.4,
    });
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.15,
      vary: R_(rng, 0.88, 1),
    });
  },

  // THE WHOLE DECK LAID OUT (egg-deck.js). The owner, on the first cut of the second bank: "everything
  // is better except when i click the deck and all the cards lay out" — it was four riffles back to
  // back, and a riffle ends on the pack dropping, so the lay-out was four shuffles and four thuds.
  // What actually happens is seventy-eight cards, one after another, slid off the top of the pile,
  // turned over in the air and put down face up in their bow. So that is what this is, on the
  // lay-out's own exposure sheet (egg-deck.js: `depart(k) = k / N * (T.laid - FLY)`, FLY 0.62):
  // each card's lift off the pile in the middle of the cloth, a breath of air as it turns, and its
  // landing — a light felt tap, an edge tick, a centimetre of skid — out in its bow, left to right.
  // One buffer, five nodes, fired once on the click.
  spread(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.spread, true);
    const N = 78, LAID = 3.0, FLY = 0.62, BOWS = [22, 14, 14, 14, 14];
    const bowOf = [];
    BOWS.forEach((n, b) => { for (let i = 0; i < n; i++) bowOf.push([b, n > 1 ? i / (n - 1) : 0.5]); });
    for (let k = 0; k < N; k++) {
      const d = (k / N) * (LAID - FLY) + (rng() - 0.5) * 0.008;
      // off the top of the pile: the thumb's tick and the face sliding off the one under it
      const pl = (rng() - 0.5) * 0.12;
      // (the first is the thumb breaking the squared pack, so it is the crispest of them)
      contact(S, d, (k ? 1 : 1.8) * R_(rng, 0.17, 0.26), 0.0006, rng, { hp: 2200, pan: pl });
      slide(S, d + 0.001, R_(rng, 0.018, 0.028), rng, {
        amp: (u) => 0.15 * (1 - u),
        f: (u) => R_(rng, 1800, 2400) * (1 + 0.4 * u),
        q: 0.8,
        grain: 0.5,
        rate: 2500,
        rough: 0.4,
        pan: pl,
      });
      // the turn in the air: barely a breath
      const [b, x] = bowOf[k];
      const pp = (x * 2 - 1) * (0.75 - 0.08 * b);
      if (rng() < 0.5)
        slide(S, d + FLY * 0.45, 0.03, rng, { amp: (u) => 0.03 * bell(u, 0.7), f: (u) => 500 * Math.pow(2.5, u), q: 0.9, grain: 0.1, rate: 4000, rough: 0.2, lo: 0.3, pan: pp * 0.5 });
      // down, face up, in its bow
      const L = d + FLY + (rng() - 0.5) * 0.01, a = R_(rng, 0.32, 0.5);
      felt(S, L, a, rng, { hz: R_(rng, 170, 210), drop: 0.8, tau: R_(rng, 0.006, 0.009), air: 1.2, airF: R_(rng, 800, 1100), airTau: 0.005, pan: pp });
      contact(S, L, a * 0.45, 0.003, rng, { bp: R_(rng, 1500, 2200), q: 0.8, pan: pp });
      ring(S, L, R_(rng, 2600, 3300), a * 0.1, 0.0008, pp);
      slide(S, L + 0.003, R_(rng, 0.012, 0.02), rng, { amp: (u) => 0.06 * (1 - u), f: () => 1300, q: 0.6, grain: 0.6, rate: 1500, rough: 0.5, pan: pp });
    }
    return emit(ac, dest, t, S, { level, pan, room: 0.14, vary: R_(rng, 0.9, 1) });
  },

  // THE DECK'S EDGE KNOCKED ON THE TABLE. Seventy-eight edges come down together through the cloth
  // onto the wood: a dense crunch of edges sliding into line, the wood's lowest modes (the cloth
  // eats the rest) and the block of the deck thumping, then its other corner a few ms later as it
  // rocks. walk-crossing.js also plays this, quietly, as the accent when Pepe re-forms.
  tap(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.tap);
    const knock = (at, a) => {
      contact(S, at, 0.6 * a, 0.006, rng, { bp: R_(rng, 2400, 3200), q: 0.6 });
      ring(S, at, R_(rng, 165, 185), 0.7 * a, 0.016, 0, R_(rng, -1.2, 1.2));
      ring(S, at, R_(rng, 340, 380), 0.45 * a, 0.01, 0, rng() * PI2);
      ring(S, at, R_(rng, 720, 800), 0.26 * a, 0.005, 0, rng() * PI2);
      ring(S, at, R_(rng, 1300, 1500), 0.1 * a, 0.0025, 0, rng() * PI2);
      felt(S, at, 0.35 * a, rng, {
        hz: R_(rng, 100, 115),
        drop: 0.75,
        tau: 0.013,
        air: 0.5,
        airF: 450,
      });
    };
    knock(0, 1);
    crackle(S, 0, 0.014, 900, 0.14, rng, { f: [2800, 7000] });
    knock(R_(rng, 0.007, 0.013), R_(rng, 0.35, 0.5));
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.18,
      vary: R_(rng, 0.86, 1),
    });
  },

  // THE WASH: the whole deck spilled face down on the cloth and pushed about under two flat palms.
  // A continuous slither of many cards: some fifty separate slides, each a card moving over another
  // with its own band and its own start and stop, crowded at the front where the deck comes apart;
  // the card backs dragging on the felt under them; the palms going round (a slow swell in it); and
  // now and then two edges butting. Stereo, because there are two hands.
  wash(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.wash, true);
    const D = 0.93,
      palm = R_(rng, 2.1, 2.7),
      ph = rng() * PI2;
    const env = (u) =>
      ramp(u, D, 0.02) *
      Math.pow(1 - u, 0.9) *
      (0.8 + 0.2 * Math.sin(PI2 * palm * u * D + ph));
    // the backs on the felt: a dark continuous drag under everything
    slide(S, 0, D, rng, {
      amp: (u) => 0.22 * env(u),
      f: (u) => 900 + 250 * Math.sin(PI2 * palm * u * D + ph),
      q: 0.6,
      grain: 0.55,
      rate: 2000,
      rough: 0.6,
      order: 2,
      pan: -0.25,
    });
    slide(S, 0, D, rng, {
      amp: (u) => 0.22 * env(u),
      f: (u) => 950 + 250 * Math.cos(PI2 * palm * u * D + ph),
      q: 0.6,
      grain: 0.55,
      rate: 2000,
      rough: 0.6,
      order: 2,
      pan: 0.25,
    });
    // the cards over each other
    const N = 46;
    for (let k = 0; k < N; k++) {
      const u0 = Math.pow(rng(), 1.35) * 0.9,
        at = u0 * D,
        d = R_(rng, 0.05, 0.17),
        f0 = R_(rng, 2000, 5200),
        sw = R_(rng, 0.7, 1.15);
      const a = (R_(rng, 0.14, 0.3) * env(u0 + 0.02)) / 0.9;
      slide(S, at, d, rng, {
        amp: (u) => a * bell(u, 0.8),
        f: (u) => f0 * Math.pow(sw, u),
        q: R_(rng, 0.8, 1.4),
        grain: 0.5,
        rate: 2800,
        rough: 0.35,
        pan: R_(rng, -0.7, 0.7),
      });
    }
    let x = 0.02;
    while ((x += -Math.log(1 - rng() * 0.99) / 22) < D - 0.1) {
      const p = R_(rng, -0.6, 0.6),
        a = R_(rng, 0.08, 0.2) * env(x / D);
      contact(S, x, a, 0.0006, rng, { hp: 1800, pan: p });
      ring(S, x, R_(rng, 1900, 3200), a * 0.8, 0.001, p);
    }
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.16,
      vary: R_(rng, 0.9, 1),
    });
  },

  // ONE PUSH OF THE PALMS THROUGH THE MASS. Fired every fifth drawing (0.417 s) while the smoosh
  // runs, so it LAYERS: one soft swell with no edge in it anywhere. Darker and smoother than the
  // wash — the mass moves together under the palm, so it is a dozen long slides rather than fifty
  // short ones, and the skin on the card backs is most of it.
  smoosh(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.smoosh, true);
    const D = R_(rng, 0.56, 0.62),
      pk = R_(rng, 0.35, 0.5);
    const env = (u) =>
      ramp(u, D, 0.025) *
      (u < pk
        ? Math.sin((Math.PI / 2) * (u / pk))
        : Math.pow(Math.cos((Math.PI / 2) * ((u - pk) / (1 - pk))), 1.4));
    slide(S, 0, D, rng, {
      amp: (u) => 0.5 * env(u),
      f: (u) => 650 + 350 * env(u),
      q: 0.6,
      grain: 0.35,
      rate: 1800,
      rough: 0.45,
      order: 2,
      pan: -0.15,
    });
    slide(S, 0, D, rng, {
      amp: (u) => 0.45 * env(u),
      f: (u) => 720 + 300 * env(u),
      q: 0.6,
      grain: 0.35,
      rate: 1800,
      rough: 0.45,
      order: 2,
      pan: 0.15,
    });
    for (let k = 0; k < 12; k++) {
      const u0 = R_(rng, 0, 0.6),
        d = R_(rng, 0.18, 0.34),
        f0 = R_(rng, 1400, 2800);
      const a = R_(rng, 0.12, 0.22) * env(u0 + 0.1);
      slide(S, u0 * D, d, rng, {
        amp: (u) => a * ramp(u, d, 0.02) * bell(u, 1.2),
        f: (u) => f0 * (1 - 0.2 * u),
        q: R_(rng, 0.7, 1.1),
        grain: 0.4,
        rate: 2400,
        rough: 0.35,
        pan: R_(rng, -0.5, 0.5),
      });
    }
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.16,
      vary: R_(rng, 0.88, 1),
    });
  },

  // THE GATHER: both palms dragging the spread mass in from the two ends of the cloth. The drag
  // grows as the palms collect more cards; the edges start butting into each other faster and
  // faster as the heap forms (tk… tk. tk tktktk), the two hands closing from the sides to the
  // middle; and it ends on the heap arriving — a soft felt landing with the crunch of edges in it.
  rake(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.rake, true);
    const E = R_(rng, 0.54, 0.6);
    const grow = (u) =>
      ramp(u, E, 0.02) *
      (0.3 + 0.7 * Math.pow(u, 0.8)) *
      (u > 0.94 ? (1 - u) / 0.06 : 1);
    slide(S, 0, E, rng, {
      amp: (u) => 0.28 * grow(u),
      f: (u) => 1100 + 700 * u,
      q: 0.6,
      grain: 0.6,
      rate: 2200,
      rough: 0.55,
      order: 2,
      pan: -0.5,
    });
    slide(S, 0, E, rng, {
      amp: (u) => 0.28 * grow(u),
      f: (u) => 1150 + 650 * u,
      q: 0.6,
      grain: 0.6,
      rate: 2200,
      rough: 0.55,
      order: 2,
      pan: 0.5,
    });
    for (let k = 0; k < 18; k++) {
      const u0 = Math.pow(rng(), 0.7) * 0.85,
        d = R_(rng, 0.05, 0.14),
        f0 = R_(rng, 2200, 4400),
        side = k % 2 ? 1 : -1;
      const a = R_(rng, 0.1, 0.2) * grow(u0);
      slide(S, u0 * E, d, rng, {
        amp: (u) => a * bell(u, 0.8),
        f: (u) => f0 * (1 - 0.25 * u),
        q: 1,
        grain: 0.5,
        rate: 2800,
        rough: 0.35,
        pan: side * 0.6 * (1 - u0),
      });
    }
    // the edges butting, closing in from both sides and coming faster as the heap builds
    let x = 0.03;
    while (
      (x += -Math.log(1 - rng() * 0.99) / (10 + 95 * Math.pow(x / E, 1.6))) < E
    ) {
      const u = x / E,
        p = (rng() < 0.5 ? -1 : 1) * 0.65 * (1 - u),
        a = R_(rng, 0.14, 0.32) * (0.5 + 0.5 * u);
      contact(S, x, a, 0.0007, rng, { hp: 1600, pan: p });
      ring(S, x, R_(rng, 1700, 2900), a * 0.7, R_(rng, 0.0008, 0.0014), p);
      ring(S, x, R_(rng, 420, 600), a * 0.2, 0.0025, p);
    }
    felt(S, E, 0.4, rng, {
      hz: R_(rng, 110, 130),
      drop: 0.7,
      tau: 0.02,
      air: 0.6,
      airF: 450,
    });
    contact(S, E, 0.3, 0.012, rng, { bp: 2600, q: 0.6 });
    crackle(S, E, 0.03, 700, 0.12, rng, { f: [2800, 7000], width: 0.2 });
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.16,
      vary: R_(rng, 0.88, 1),
    });
  },

  // THE PILE PRESSED SQUARE between two palms. No wood and no strike — that is `tap` — just a press:
  // seventy-eight edges sliding into line against each other, a dense crunch that thins out as they
  // settle, the faces slipping a millimetre over each other under it, and the palms' weight.
  square(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.square);
    const D = R_(rng, 0.1, 0.13),
      fe = R_(rng, 2600, 3200);
    slide(S, 0, D, rng, {
      amp: (u) => ramp(u, D, 0.006) * Math.pow(1 - u, 1.4),
      f: (u) => fe * (1 - 0.2 * u),
      q: 0.7,
      grain: 0.6,
      rate: 2500,
      rough: 0.5,
    });
    slide(S, 0, D * 1.2, rng, {
      amp: (u) => 0.6 * ramp(u, D, 0.01) * Math.pow(1 - u, 1.2),
      f: () => 850,
      q: 0.7,
      order: 2,
      grain: 0.4,
      rate: 1500,
      rough: 0.5,
      lo: 0.3,
    });
    crackle(S, 0.001, D, (u) => 1600 * Math.pow(1 - u, 1.5), 0.15, rng, {
      f: [2400, 6500],
    });
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.12,
      vary: R_(rng, 0.86, 1),
    });
  },

  // THE CAPTION'S NIB, one tick a word (and, quieter, a letter for the visitor). A steel dip pen
  // touching paper: the tines ring very high for half a millisecond, the paper under it ticks, and
  // the point scratches a few ms of fibre as it moves off; about a third of the strokes touch twice.
  // Metal and scratch are what keep it from being the camera's `cut`.
  type(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.type);
    const touch = (at, a) => {
      const f = R_(rng, 5200, 7600);
      ring(S, at, f, 0.45 * a, R_(rng, 0.0004, 0.0007));
      ring(S, at, R_(rng, 3000, 3600), 0.3 * a, 0.0008);
      contact(S, at, 0.5 * a, 0.0008, rng, { bp: R_(rng, 2600, 3600), q: 0.9 });
      ring(S, at, R_(rng, 280, 380), 0.14 * a, 0.0025);
      const d = R_(rng, 0.006, 0.012),
        fs = R_(rng, 4200, 5600);
      slide(S, at + 0.0005, d, rng, {
        amp: (u) => 0.22 * a * Math.pow(1 - u, 1.3),
        f: () => fs,
        q: 1,
        grain: 0.85,
        rate: 3500,
        rough: 0.6,
      });
    };
    touch(0, 1);
    if (rng() < 0.34) touch(R_(rng, 0.012, 0.017), R_(rng, 0.4, 0.6));
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.03,
      vary: R_(rng, 0.8, 1),
    });
  },

  // THIN DRY PAPER, MOVING. Two things fire it and they are the same physics: a book's leaf being
  // lifted, turned and laid (walk-book.js, at a fifth of this up to a half) and a vase of dried stems
  // wilting (egg-vase.js, every half second for two seconds, so each runs into the next). What both
  // are is thin brittle sheet moving against itself: a husky surface swish, soft-topped so it has
  // no moment of beginning, and on top of it crinkles — the fibres creasing, a heads-and-husks
  // crackle — in clumps, crowded at the front and straggling after. A breath of air under it for
  // the leaf moving, and no body at all: the moment a rustle has a bottom it is a bag of shopping.
  rustle(ac, dest, t, { level, rng, pan }) {
    const S = sheet(ac, LENGTH.rustle);
    const D = R_(rng, 0.45, 0.55),
      f0 = R_(rng, 2600, 3400);
    const env = (u) =>
      ramp(u, D, 0.03) * Math.pow(1 - u, 0.8) * (0.75 + 0.25 * bell(u * 2));
    slide(S, 0, D, rng, {
      amp: (u) => 0.5 * env(u),
      f: (u) => f0 * (1 - 0.3 * u),
      q: 0.8,
      grain: 0.4,
      rate: 2500,
      rough: 0.7,
      sheen: 0.2,
    });
    slide(S, 0, 0.22, rng, {
      amp: (u) => 0.08 * ramp(u, 0.22, 0.03) * bell(u),
      f: (u) => 520 + 300 * u,
      q: 0.6,
      grain: 0,
      rate: 1000,
      rough: 0.3,
    });
    // the crinkles: clumps of three to eight within a few ms, crowding the first third
    let x = 0.008;
    while (x < D) {
      const u = x / D,
        n = 2 + Math.floor(rng() * 6),
        a = R_(rng, 0.1, 0.26) * Math.pow(1 - u, 1.1);
      crackle(S, x, R_(rng, 0.004, 0.014), n / 0.008, a, rng, {
        f: [2600, 8500],
      });
      x += -Math.log(1 - rng() * 0.99) / (60 * Math.pow(1 - u, 1.6) + 6);
    }
    return emit(ac, dest, t, S, {
      level,
      pan,
      room: 0.28,
      vary: R_(rng, 0.86, 1),
    });
  },
};

// Every voice is normalised to its own peak (times a per-firing 0.8–1), so these are close to 1: they
// are measured (snd/measure.mjs, dry, four seeds, the cue started off the sample grid as it is live)
// and make the rendered peak equal LEVEL. The riffle's is the largest because its peak is the
// single-sample edge of the thumbs' first release, which playback off the sample grid rounds down.
export const TRIM = {
  cut: 1.145,
  snap: 1.061,
  deal: 1.112,
  settle: 1.048,
  pick: 1.109,
  flip: 1.193,
  riffle: 1.332,
  tap: 1.176,
  wash: 1.061,
  smoosh: 1.018,
  rake: 1.066,
  square: 1.087,
  type: 1.112,
  rustle: 1.082,
  spread: 1.026,
};
// the caps are the old bank's, and for smoosh and rustle they are the re-fire cadence (see
// the first bank in git history): each is built to finish inside its cap
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
  smoosh: 0.66,
  rake: 0.74,
  square: 0.19,
  type: 0.03,
  rustle: 0.62,
  // the lay-out's own three seconds: the last card lands at T.laid
  spread: 3.1,
};
