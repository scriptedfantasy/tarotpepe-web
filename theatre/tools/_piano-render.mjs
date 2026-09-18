#!/usr/bin/env node
// LISTEN TO THE PIANO WITHOUT A ROOM, A SPEAKER OR A PAIR OF EARS.
//
// Nobody working on this file can hear it, so the spinet is rendered OFFLINE through the very code
// the page plays it with — src/pieces/sound-tune.js's `pianoNote`, at the level and the durations
// sound.js's `key()` gives it, over the notes src/pieces/piano-song.js holds — into an
// OfflineAudioContext inside a real browser, and written out as a WAV somebody can play.
//
//   node tools/_piano-render.mjs                  # bars 1–16 → /tmp/piano/gymnopedie-1-16.wav
//   node tools/_piano-render.mjs --bars 5-20      # …those bars instead
//   node tools/_piano-render.mjs --notes          # one note at a time: the envelope of each
//
// WHAT IT PRINTS, and why those numbers. A piano is three things a sine is not, and each of them
// is measurable without ears:
//   THE ATTACK. Time from the note's start to its loudest sample. A hammer is at level in a few
//   milliseconds; an organ takes tens of them.
//   THE DECAY. Time to −20 dB and to −40 dB below that peak. Satie's accompaniment is pedalled:
//   the chord on the second beat has to be still there under the melody at the end of the bar,
//   which at ♩ = 66 is 1.8 s after it is struck, and a bass has to hum under the whole of it.
//   THE BODY. The spectral centroid, in Hz and as a multiple of the note's own fundamental. A pure
//   sine sits at 1.0; a struck string carries most of its energy in the first six partials and
//   lands between two and four, dropping as the note dies and the partials go first.
// And the one number that is not about the piano at all: its RMS against the RECORD on the radio
// (public/radio/record.mp3 through sound.js's own high pass, low pass and 0.42), which is the level
// the brief says the piano must not be louder than. Both are rendered here, the same way, so the
// comparison is a ratio of two numbers and not an opinion.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:8742';
const OUT = args.out ?? '/tmp/piano';
const RATE = +(args.rate ?? 44100);
const [FROM, TO] = String(args.bars ?? '1-16').split('-').map(Number);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
await page.goto(`${BASE}/?nosound=1`, { waitUntil: 'domcontentloaded' });

// ---- the render, in the page ---------------------------------------------------------------------
const measured = await page.evaluate(async ([from, to, rate, single]) => {
  const tune = await import('/src/pieces/sound-tune.js');
  const song = await import('/src/pieces/piano-song.js');
  const { pianoNote, TUNE_LEVEL } = tune;
  const { NOTES, BEAT, METRE, freqOf } = song;
  // sound.js, key(): the tune bus carries the piano at TUNE_LEVEL × its own level × TRIM, the left
  // hand at 0.5 and the right at 0.8, and a key is held for 0.92 of its written length. (TRIM is
  // the one number here that is copied rather than imported — it is written into sound.js's own
  // call — so if that call changes and this does not, the levels below are of nothing.)
  const TRIM = 3.2;
  const LEVEL = { L: 0.5, R: 0.8 };
  const b0 = (from - 1) * METRE, b1 = to * METRE;
  const notes = NOTES.filter((n) => n.at >= b0 - 1e-6 && n.at < b1 - 1e-6);
  const seconds = (b1 - b0) * BEAT + 6;

  async function render(lay) {
    const oc = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
    const bus = oc.createGain(); // sound.js's tuneBus, which sits at 1 and ducks only under speech
    bus.gain.value = 1;
    bus.connect(oc.destination);
    lay(oc, bus);
    const buf = await oc.startRendering();
    return buf.getChannelData(0);
  }

  const lay = (oc, bus) => {
    for (const n of notes) {
      pianoNote(oc, bus, {
        t: (n.at - b0) * BEAT + 0.01,
        freq: freqOf(n.m),
        dur: n.len * BEAT * 0.92,
        level: TUNE_LEVEL * LEVEL[n.hand] * TRIM,
      });
    }
  };
  const x = await render(lay);

  // ---- the numbers ------------------------------------------------------------------------------
  const rms = (a, i0 = 0, i1 = a.length) => {
    let s = 0;
    for (let i = i0; i < i1; i++) s += a[i] * a[i];
    return Math.sqrt(s / Math.max(1, i1 - i0));
  };
  const peak = (a, i0 = 0, i1 = a.length) => {
    let p = 0;
    for (let i = i0; i < i1; i++) p = Math.max(p, Math.abs(a[i]));
    return p;
  };
  // THE LOUDNESS A PIECE OF MUSIC IS JUDGED BY is not the RMS of the whole file: a sparse piano
  // with four bars of nothing in it and six seconds of tail loses to any continuous recording on
  // that measure, whatever it sounds like. So the level is taken over 300 ms windows and read at
  // the 90th percentile — how loud it is when it is playing — and both things are measured that way.
  const loud = (a, win = 0.3, pc = 0.9) => {
    const n = Math.round(win * rate), out = [];
    for (let i = 0; i + n <= a.length; i += n) out.push(rms(a, i, i + n));
    out.sort((p, q) => p - q);
    return +out[Math.min(out.length - 1, Math.floor(out.length * pc))].toFixed(5);
  };
  // the centroid, off a plain DFT of one window (slow but honest, and this runs once). The band
  // goes to 8 kHz: cut at two, every note above A4 comes out looking like a sine because its own
  // partials are outside the measurement.
  const centroid = (a, i0, n = 8192) => {
    const N = Math.min(n, a.length - i0);
    let num = 0, den = 0;
    for (let k = 1; k < 1500; k++) {
      let re = 0, im = 0;
      const w = (2 * Math.PI * k) / N;
      for (let i = 0; i < N; i++) {
        const v = a[i0 + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
        re += v * Math.cos(w * i);
        im -= v * Math.sin(w * i);
      }
      const mag = Math.hypot(re, im);
      num += mag * ((k * rate) / N);
      den += mag;
    }
    return den ? num / den : 0;
  };

  // one note at a time, for the envelope
  const env = [];
  for (const [name, m, hand, len] of single) {
    const f = freqOf(m);
    const oc = new OfflineAudioContext(1, Math.ceil(8 * rate), rate);
    const bus = oc.createGain();
    bus.gain.value = 1;
    bus.connect(oc.destination);
    pianoNote(oc, bus, { t: 0.01, freq: f, dur: len * BEAT * 0.92, level: TUNE_LEVEL * LEVEL[hand] * TRIM });
    const b = await oc.startRendering();
    const a = b.getChannelData(0);
    let pi = 0, pv = 0;
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i]) > pv) { pv = Math.abs(a[i]); pi = i; }
    const win = Math.round(0.03 * rate);
    const at = (db) => {
      const want = pv * Math.pow(10, db / 20);
      for (let i = pi; i < a.length - win; i += win) if (peak(a, i, i + win) < want) return i / rate;
      return null;
    };
    env.push({
      name, m, f: +f.toFixed(1), held: +(len * BEAT * 0.92).toFixed(2),
      peak: +pv.toFixed(4), attack: +((pi / rate) - 0.01).toFixed(4),
      d20: at(-20), d40: at(-40),
      c0: +(centroid(a, Math.round(0.02 * rate)) / f).toFixed(2),
      c1: +(centroid(a, Math.round(1.0 * rate)) / f).toFixed(2),
      tail: +(rms(a, Math.round(1.8 * rate), Math.round(2.0 * rate)) / (rms(a, Math.round(0.02 * rate), Math.round(0.22 * rate)) || 1e-9)).toFixed(4),
    });
  }

  // ---- and the record on the radio, rendered the same way ---------------------------------------
  let record = null;
  try {
    const res = await fetch('/radio/record.mp3');
    const raw = await res.arrayBuffer();
    const oc = new OfflineAudioContext(1, Math.ceil(30 * rate), rate);
    const decoded = await oc.decodeAudioData(raw);
    const src = oc.createBufferSource();
    src.buffer = decoded;
    const hp = oc.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 240; hp.Q.value = 0.7;
    const lp = oc.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3600; lp.Q.value = 0.8;
    const g = oc.createGain();
    g.gain.value = 0.42;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(oc.destination);
    src.start(0);
    const b = await oc.startRendering();
    const a = b.getChannelData(0);
    record = { seconds: +decoded.duration.toFixed(1), rms: +rms(a).toFixed(5), peak: +peak(a).toFixed(4), loud: loud(a) };
  } catch (e) { record = { error: String(e?.message ?? e) }; }

  // ---- the WAV, encoded here so a million floats do not cross the wire as JSON -------------------
  const pcm = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767)));
  const head = new DataView(new ArrayBuffer(44));
  const tag = (o, s) => { for (let i = 0; i < s.length; i++) head.setUint8(o + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); head.setUint32(4, 36 + pcm.byteLength, true); tag(8, 'WAVEfmt ');
  head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true);
  head.setUint32(24, rate, true); head.setUint32(28, rate * 2, true); head.setUint16(32, 2, true);
  head.setUint16(34, 16, true); tag(36, 'data'); head.setUint32(40, pcm.byteLength, true);
  const bytes = new Uint8Array(44 + pcm.byteLength);
  bytes.set(new Uint8Array(head.buffer), 0);
  bytes.set(new Uint8Array(pcm.buffer), 44);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  window.__wav = btoa(bin);

  // where the chord sits under the melody: the RMS of the last 200 ms of each bar against the
  // 200 ms after its chord was struck, over the bars that have a melody over them
  const bar = (i) => Math.round(i * METRE * BEAT * rate);
  const under = [];
  for (let i = 4; i < Math.min(16, to - from + 1); i++) {
    const a0 = bar(i) + Math.round(BEAT * rate), a1 = a0 + Math.round(0.2 * rate);
    const b2 = bar(i + 1) - Math.round(0.2 * rate), b3 = bar(i + 1);
    if (b3 > x.length) break;
    under.push(+(20 * Math.log10((rms(x, b2, b3) || 1e-9) / (rms(x, a0, a1) || 1e-9))).toFixed(1));
  }

  return {
    notes: notes.length, seconds: +seconds.toFixed(2), samples: x.length,
    peak: +peak(x).toFixed(4), rms: +rms(x).toFixed(5), loud: loud(x),
    crest: +(20 * Math.log10(peak(x) / (rms(x) || 1e-9))).toFixed(1),
    centroid: +centroid(x, Math.round(4 * BEAT * rate)).toFixed(0),
    env, record, under,
    wavBytes: bytes.length,
  };
}, [FROM, TO, RATE, [['bass G2', 43, 'L', 3], ['chord B3', 59, 'L', 2], ['melody F♯5', 78, 'R', 1], ['melody A5', 81, 'R', 1]]]);

// pull the WAV across in slices
const CH = 4 << 20;
let b64 = '';
for (let i = 0; ; i += CH) {
  const part = await page.evaluate(([o, n]) => window.__wav.slice(o, o + n), [i, CH]);
  b64 += part;
  if (part.length < CH) break;
}
const file = `${OUT}/gymnopedie-${FROM}-${TO}.wav`;
writeFileSync(file, Buffer.from(b64, 'base64'));

const dB = (a, b) => `${(20 * Math.log10(a / b)).toFixed(1)} dB`;
console.log(`bars ${FROM}–${TO}: ${measured.notes} notes, ${measured.seconds}s at ${RATE} Hz → ${file} (${(measured.wavBytes / 1e6).toFixed(1)} MB)`);
console.log(`  peak ${measured.peak}  rms ${measured.rms}  playing ${measured.loud}  crest ${measured.crest} dB  centroid ${measured.centroid} Hz`);
if (measured.record?.rms) {
  console.log(`  the record on the radio: rms ${measured.record.rms}, playing ${measured.record.loud}, peak ${measured.record.peak} over ${measured.record.seconds}s`);
  console.log(`  the piano against it: ${dB(measured.loud, measured.record.loud)} while each is playing, ${dB(measured.peak, measured.record.peak)} peak`);
} else console.log(`  the record: ${measured.record?.error}`);
console.log('  one note at a time:');
for (const e of measured.env) {
  console.log(`    ${e.name.padEnd(11)} ${String(e.f).padStart(6)} Hz  held ${e.held}s  peak ${e.peak}  attack ${(e.attack * 1000).toFixed(1)} ms  −20 dB at ${e.d20?.toFixed(2) ?? '—'}s  −40 dB at ${e.d40?.toFixed(2) ?? '—'}s  centroid ${e.c0}× f at the strike, ${e.c1}× at one second  tail@1.9s ${e.tail}`);
}
console.log(`  the end of each bar against its own chord, bar by bar: ${measured.under.join(' ')} dB`);
if (errors.length) console.log('  errors: ' + errors.join(' | '));
await browser.close();
