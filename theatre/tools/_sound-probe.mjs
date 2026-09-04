#!/usr/bin/env node
// Measure the sound piece. Nobody here can hear, so every cue is rendered offline through the very
// code the page runs (sound.render → OfflineAudioContext) and reported as numbers: peak, length,
// spectral centroid, attack, decay, and for the riffle a transient count. Then the assertions say
// whether those numbers describe what the piece intends, and a waveform sheet is drawn so the
// envelopes can be LOOKED at: a card thump must look like a thump, not a beep.
//
//   node tools/_sound-probe.mjs                       # measure, assert, plot
//   node tools/_sound-probe.mjs --plot /abs/out.png   # where the waveform sheet goes
//
// Modelled on tools/shot.mjs, including its Vite-HMR stub (other builders are editing files).
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const PLOT = args.plot ?? '/tmp/sound-waveforms.png';
const BASE = 'http://127.0.0.1:5173/';
const INK = '#0d0e0d';
const PAPER = '#f8f9f4';
const MUSTARD = '#c4c059';

// ---- signal maths ---------------------------------------------------------------------------------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
      }
    }
  }
}

const hann = (i, N) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
const at = (x, i, to) => (i < to && i < x.length && i >= 0 ? x[i] : 0);

// Spectral centroid over a region, zero-padded: most of these events are shorter than one window.
function centroid(x, sr, from, to) {
  const N = 1024;
  if (to - from < 24) return 0;
  const frames = Math.max(1, Math.ceil((to - from) / (N / 2)));
  let num = 0, den = 0;
  for (let f = 0; f < frames; f++) {
    const s = from + f * (N / 2);
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = at(x, s + i, to) * hann(i, N);
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const m = Math.hypot(re[k], im[k]);
      num += ((k * sr) / N) * m;
      den += m;
    }
  }
  return den > 0 ? num / den : 0;
}

// The loudest partial in a window, for reading the two-note figures back as notes.
function dominant(x, sr, from, N = 4096) {
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = at(x, from + i, x.length) * hann(i, N);
  fft(re, im);
  let best = 2, bm = 0;
  for (let k = 3; k < N / 2; k++) {
    const m = Math.hypot(re[k], im[k]);
    if (m > bm) {
      bm = m;
      best = k;
    }
  }
  const m0 = Math.hypot(re[best - 1], im[best - 1]), m1 = bm, m2 = Math.hypot(re[best + 1], im[best + 1]);
  const den = m0 - 2 * m1 + m2;
  const d = den ? (0.5 * (m0 - m2)) / den : 0;
  return ((best + d) * sr) / N;
}

function analyse(name, r) {
  const x = r.l, sr = r.sampleRate;
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  const gate = peak * 0.012;
  let first = -1, lastI = -1;
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(x[i]) > gate) {
      if (first < 0) first = i;
      lastI = i;
    }
  }
  if (first < 0) return { name, peak: 0, dur: 0, rms: 0, centroid: 0, attack: 0, decay: 0, transients: 0, empty: true, first: 0, lastI: 0, sr };
  const dur = (lastI - first) / sr;
  let sum = 0;
  for (let i = first; i <= lastI; i++) sum += x[i] * x[i];
  const rms = Math.sqrt(sum / Math.max(1, lastI - first + 1));
  const c = centroid(x, sr, first, Math.min(x.length, lastI + 1));
  let peakAt = first;
  for (let i = first; i <= lastI; i++)
    if (Math.abs(x[i]) >= peak * 0.999) {
      peakAt = i;
      break;
    }
  const attack = (peakAt - first) / sr; // 0 = at level on the first sample: a cut, not a fade
  // how loud the first 12 ms already is, as a fraction of the peak: the real "no fade in" test,
  // which a grainy cue (the riffle, the creak) can pass without its loudest grain being the first
  let onset = 0;
  for (let i = first; i < Math.min(lastI, first + Math.round(sr * 0.012)); i++) onset = Math.max(onset, Math.abs(x[i]));
  onset = onset / Math.max(1e-9, peak);
  const third = Math.max(1, Math.floor((lastI - first) / 3));
  const mean = (a, b) => {
    let s = 0;
    for (let i = a; i < b; i++) s += Math.abs(x[i]);
    return s / Math.max(1, b - a);
  };
  const decay = mean(lastI - third, lastI) / Math.max(1e-9, mean(first, first + third));
  // transients: rising crossings of a fifth of the peak, 8 ms apart at the closest
  const w = Math.max(2, Math.round(sr * 0.0005));
  const env = [];
  for (let i = 0; i < x.length; i += w) {
    let m = 0;
    for (let j = i; j < Math.min(x.length, i + w); j++) m = Math.max(m, Math.abs(x[j]));
    env.push(m);
  }
  let transients = 0, refractory = 0;
  for (let i = 1; i < env.length; i++) {
    refractory -= w / sr;
    if (refractory <= 0 && env[i] > peak * 0.2 && env[i - 1] <= peak * 0.2) {
      transients++;
      refractory = 0.008;
    }
  }
  const half = Math.floor((first + lastI) / 2);
  return {
    name,
    peak,
    dur,
    rms,
    centroid: c,
    attack,
    onset,
    decay,
    transients,
    cFirstHalf: centroid(x, sr, first, half),
    cSecondHalf: centroid(x, sr, half, lastI),
    first,
    lastI,
    sr,
  };
}

// ---- the page -------------------------------------------------------------------------------------
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--disable-gpu-sandbox',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const errors = [];
async function openPage(url) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(() => {
    window.__acCount = 0;
    for (const k of ['AudioContext', 'webkitAudioContext']) {
      const C = window[k];
      if (!C) continue;
      const W = new Proxy(C, {
        construct(target, a) {
          window.__acCount++;
          return new target(...a);
        },
      });
      Object.defineProperty(window, k, { value: W, writable: true, configurable: true });
    }
  });
  await page.route('**/@vite/client', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(id, css){ let s = document.querySelector('style[data-vite-dev-id="' + id + '"]'); if (!s) { s = document.createElement('style'); s.setAttribute('data-vite-dev-id', id); document.head.appendChild(s); } s.textContent = css; }
export function removeStyle(id){ document.querySelector('style[data-vite-dev-id="' + id + '"]')?.remove(); }
export function injectQuery(url){ return url; }
export class ErrorOverlay {}`,
    }),
  );
  // other builders are saving files constantly; a Vite restart mid-load just means: go again
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.log(`  (the dev server did not answer; retrying ${url})`);
      await page.waitForTimeout(3000);
    }
  }
  const t0 = Date.now();
  let ready = false;
  while (Date.now() - t0 < 150000) {
    try {
      ready = await page.evaluate(() => window.__theatreReady === true);
    } catch {
      ready = false;
    }
    if (ready) break;
    await page.waitForTimeout(250);
  }
  if (!ready) errors.push('the page never became ready');
  return page;
}

const CUES = ['cut', 'snap', 'deal', 'settle', 'pick', 'flip', 'riffle', 'tap', 'title', 'closing', 'creak', 'street', 'type'];
const SECONDS = (n) => (n === 'title' || n === 'closing' ? 2.0 : n === 'street' ? 1.0 : n === 'riffle' || n === 'creak' ? 0.8 : 0.4);

const page = await openPage(BASE + '?view=sound&state=default');
await page.mouse.click(600, 350); // the gesture the browser insists on
await page.waitForTimeout(300);
const live = await page.evaluate(() => {
  const s = window.__theatre?.pieces?.sound;
  return { running: !!s?.running, muted: !!s?.muted, contexts: window.__acCount, cues: s?.cues ?? [], levels: { ...(s?.levels ?? {}) }, trims: { ...(s?.trims ?? {}) } };
});

const RAW = {}, M = {};
for (const name of CUES) {
  RAW[name] = await page.evaluate(([n, s]) => window.__theatre.pieces.sound.render(n, s), [name, SECONDS(name)]);
  M[name] = analyse(name, RAW[name]);
}
RAW.room = await page.evaluate(() => window.__theatre.pieces.sound.render('room', 3.0));
const room = analyse('room', RAW.room);
{
  const x = RAW.room.l, sr = RAW.room.sampleRate;
  let s = 0, n = 0, pk = 0;
  for (let i = Math.floor(sr * 1.0); i < x.length; i++, n++) {
    s += x[i] * x[i];
    pk = Math.max(pk, Math.abs(x[i]));
  }
  room.steadyRms = Math.sqrt(s / n);
  room.peak = pk;
}
RAW.clock = await page.evaluate(() => window.__theatre.pieces.sound.render('clock', 0.25));
const clock = analyse('clock', RAW.clock);
const clockPan = await page.evaluate(() => window.__theatre.pieces.sound.render('clock', 0.25, { pan: -0.5 }));
// the escapement as it runs: onsets a second apart, tick and tock alternating in pitch
const run = await page.evaluate(() => window.__theatre.pieces.sound.render('clock-run', 4.2));
const runOnsets = [];
{
  const x = run.l, sr = run.sampleRate;
  let pk = 0;
  for (const v of x) pk = Math.max(pk, Math.abs(v));
  let refractory = 0;
  for (let i = 1; i < x.length; i++) {
    refractory--;
    if (refractory <= 0 && Math.abs(x[i]) > pk * 0.35) {
      runOnsets.push(i / sr);
      refractory = sr * 0.4;
    }
  }
}
const runGaps = runOnsets.slice(1).map((t, i) => t - runOnsets[i]);
const tickC = centroid(run.l, run.sampleRate, Math.round(run.sampleRate * 0.1), Math.round(run.sampleRate * 0.16));
const tockC = centroid(run.l, run.sampleRate, Math.round(run.sampleRate * 1.1), Math.round(run.sampleRate * 1.16));
const rmsOf = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
clock.panL = rmsOf(clockPan.l);
clock.panR = rmsOf(clockPan.r);

// fire every cue on the real graph, to be sure nothing throws where it matters
const liveStats = await page.evaluate((cues) => {
  const s = window.__theatre.pieces.sound;
  for (const c of cues) s.play(c);
  s.play('clock');
  return { ...s.stats, running: s.running };
}, CUES);
// and let the clock run: the escapement is scheduled from update(), a second at a time
const t0ctx = await page.evaluate(() => window.__theatre.pieces.sound.context?.currentTime ?? -1);
await page.waitForTimeout(2600);
const liveAfter = await page.evaluate((t0) => {
  const s = window.__theatre.pieces.sound;
  const ctxAdvanced = (s.context?.currentTime ?? 0) - t0;
  const before = s.stats.played;
  s.mute(true);
  s.play('settle');
  const mutedPlayed = s.stats.played - before;
  s.mute(false);
  return { ticks: s.stats.ticks, mutedPlayed, muted: s.muted, ctxAdvanced };
}, t0ctx);

// ---- an actual visit, if asked: the evening plays and the cues arrive from the other pieces --------
let visit = null;
if (args.visit) {
  const vp = await openPage(BASE);
  await vp.mouse.click(600, 350);
  await vp.waitForTimeout(+(args.seconds ?? 30) * 1000);
  visit = await vp.evaluate(() => {
    const s = window.__theatre.pieces.sound;
    return { ...s.stats, beat: window.__theatre.pieces.flow?.beat, running: s.running };
  });
  console.log(`visit: beat=${visit.beat} played=${visit.played} ticks=${visit.ticks} dropped=${visit.dropped}`);
  await vp.close();
}

// ---- the same page in shot mode: it must be stone dead ---------------------------------------------
const shotPage = await openPage(BASE + '?view=sound&state=default&shot=1');
await shotPage.mouse.click(600, 350);
await shotPage.waitForTimeout(200);
const shot = await shotPage.evaluate(async (cues) => {
  const s = window.__theatre.pieces.sound;
  s.start();
  for (const c of cues) s.play(c);
  const r = await s.render('settle', 0.3);
  return { contexts: window.__acCount, played: s.stats?.played ?? -1, rendered: r == null ? 'null' : 'SOMETHING', running: !!s.running };
}, CUES);
await browser.close();

// ---- the report -------------------------------------------------------------------------------------
const dB = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf');
const rows = [['cue', 'peak', 'dBFS', 'length s', 'onset %', 'decay', 'centroid Hz', 'hits']];
const row = (n, m, len) => rows.push([n, m.peak.toFixed(4), dB(m.peak), len, (m.onset * 100).toFixed(0), m.decay.toFixed(2), m.centroid.toFixed(0), String(m.transients)]);
row('room tone', room, 'continuous');
row('clock', clock, clock.dur.toFixed(3));
for (const n of CUES) row(n, M[n], M[n].dur.toFixed(3));
const wcol = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
for (const r of rows) console.log(r.map((c, i) => String(c).padEnd(wcol[i])).join('  '));
console.log(`\nroom steady rms ${room.steadyRms.toFixed(5)} (${dB(room.steadyRms)} dBFS)   clock panned -0.5 → L/R rms ${clock.panL.toFixed(4)}/${clock.panR.toFixed(4)}`);
console.log(`live: running=${live.running} contexts=${live.contexts} played=${liveStats.played} dropped=${liveStats.dropped}`);
console.log(`shot mode: contexts=${shot.contexts} played=${shot.played} render=${shot.rendered} running=${shot.running}`);

// the two-note figures, read back as notes
const noteOf = (key, tSec) => dominant(RAW[key].l, RAW[key].sampleRate, Math.round(RAW[key].sampleRate * tSec));
const notes = {
  title: [noteOf('title', 0.05), noteOf('title', 0.47)],
  closing: [noteOf('closing', 0.05), noteOf('closing', 0.47)],
};
console.log(
  `figure: title ${notes.title[0].toFixed(1)} → ${notes.title[1].toFixed(1)} Hz (×${(notes.title[1] / notes.title[0]).toFixed(3)})   ` +
    `closing ${notes.closing[0].toFixed(1)} → ${notes.closing[1].toFixed(1)} Hz (×${(notes.closing[1] / notes.closing[0]).toFixed(3)})`,
);

// what the LEVEL table asked for, against what came out: paste these back into sound-voices.js
const want = live.levels ?? {};
const has = live.trims ?? {};
const measured = { room: room.peak, clock: clock.peak, ...Object.fromEntries(CUES.map((n) => [n, M[n].peak])) };
const suggest = {};
let offBy = 0;
for (const k of Object.keys(measured)) {
  if (!want[k]) continue;
  const t = (has[k] ?? 1) * (want[k] / measured[k]);
  suggest[k] = Math.round(t * 1000) / 1000;
  offBy = Math.max(offBy, Math.abs(measured[k] / want[k] - 1));
}
console.log(`\nTRIM (measured; worst cue is ${(offBy * 100).toFixed(0)}% off its LEVEL):`);
console.log('export const TRIM = {\n' + Object.entries(suggest).map(([k, v]) => `  ${k}: ${v},`).join('\n') + '\n};\n');

// ---- assertions -------------------------------------------------------------------------------------
const MAXLEN = { cut: 0.03, snap: 0.13, deal: 0.11, settle: 0.15, pick: 0.15, flip: 0.09, riffle: 0.47, tap: 0.12, title: 1.5, closing: 1.5, creak: 0.44, street: 0.62, type: 0.02, clock: 0.055 };
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) fails.push(msg);
};
for (const n of CUES) {
  const m = M[n];
  ok(m.dur > 0.003, `${n}: makes a sound (${m.dur.toFixed(3)}s)`);
  ok(m.dur <= MAXLEN[n] + 0.03, `${n}: no longer than ${MAXLEN[n]}s (${m.dur.toFixed(3)}s)`);
  ok(m.peak >= 0.012 && m.peak <= 0.26, `${n}: peak in range (${m.peak.toFixed(4)})`);
  ok(m.onset > 0.35, `${n}: loud on its first 12 ms, not faded in (onset ${(m.onset * 100).toFixed(0)}% of peak)`);
  ok(Math.abs(m.peak / (live.levels[n] ?? m.peak) - 1) < 0.08, `${n}: hits the level the table asks for (${m.peak.toFixed(4)} vs ${(live.levels[n] ?? 0).toFixed(4)})`);
}
ok(clock.dur <= MAXLEN.clock + 0.02, `clock: dry (${clock.dur.toFixed(3)}s)`);
const cardCues = ['deal', 'settle', 'flip', 'tap', 'riffle', 'pick'];
const minCard = Math.min(...cardCues.map((c) => M[c].peak));
const minCue = Math.min(...CUES.map((c) => M[c].peak));
ok(room.peak < minCue, `room tone under even the quietest cue (${room.peak.toFixed(4)} < ${minCue.toFixed(4)})`);
ok(room.steadyRms < 0.1 * minCard, `room tone far under the cards (rms ${room.steadyRms.toFixed(5)} vs ${minCard.toFixed(4)})`);
ok(room.steadyRms < 0.006, `room tone quiet enough to forget (rms ${room.steadyRms.toFixed(5)})`);
ok(room.centroid < 500, `room tone band-limited and low (centroid ${room.centroid.toFixed(0)} Hz)`);
ok(clock.peak < M.settle.peak && clock.peak < M.tap.peak && clock.peak < M.riffle.peak, `the clock sits under the cards (${clock.peak.toFixed(3)} < settle ${M.settle.peak.toFixed(3)})`);
ok(clock.peak > room.peak * 2, `the clock is above the room tone (${clock.peak.toFixed(3)} vs ${room.peak.toFixed(4)})`);
ok(clock.panL > clock.panR * 1.5, `the clock pans to where it is drawn (L ${clock.panL.toFixed(4)} > R ${clock.panR.toFixed(4)})`);
ok(runOnsets.length === 4 && runGaps.every((g) => Math.abs(g - 1) < 0.003), `the escapement keeps the second (${runGaps.map((g) => g.toFixed(3)).join(', ')})`);
ok(tockC < tickC * 0.95, `tock is lower than tick (${tockC.toFixed(0)} < ${tickC.toFixed(0)} Hz)`);
ok(M.settle.centroid < M.deal.centroid, `a landing is duller than a slide (${M.settle.centroid.toFixed(0)} < ${M.deal.centroid.toFixed(0)} Hz)`);
ok(M.deal.centroid < M.riffle.centroid, `a slide is duller than a riffle (${M.deal.centroid.toFixed(0)} < ${M.riffle.centroid.toFixed(0)} Hz)`);
ok(M.settle.centroid < 1700, `the card landing is a thump, not a beep (centroid ${M.settle.centroid.toFixed(0)} Hz)`);
ok(M.settle.decay < 0.25, `the thump decays like a thump (last third ${(M.settle.decay * 100).toFixed(0)}% of the first)`);
ok(M.riffle.transients >= 14, `the riffle is a burst of transients (${M.riffle.transients} counted)`);
ok(M.creak.transients >= 6, `the creak is stick-slip, not a tone (${M.creak.transients} grains)`);
ok(M.title.centroid < 1200 && M.closing.centroid < 1200, `the figure is a struck tone, low (${M.title.centroid.toFixed(0)} / ${M.closing.centroid.toFixed(0)} Hz)`);
ok(Math.abs(M.title.peak - M.closing.peak) < 0.12 * M.title.peak, `title and closing: the same instrument at the same level`);
ok(Math.abs(notes.title[1] / notes.title[0] - 1.5) < 0.05, `the title figure is a fifth up (${notes.title[0].toFixed(1)} → ${notes.title[1].toFixed(1)} Hz)`);
ok(Math.abs(notes.closing[1] / notes.closing[0] - 1 / 1.5) < 0.03, `the closing figure is its inversion, a fifth down (${notes.closing[0].toFixed(1)} → ${notes.closing[1].toFixed(1)} Hz)`);
ok(Math.abs(notes.title[0] - notes.closing[0]) < 4, `both figures start on the same note (${notes.title[0].toFixed(1)} / ${notes.closing[0].toFixed(1)} Hz)`);
ok(M.type.peak < clock.peak, `the caption's pen is under the clock (${M.type.peak.toFixed(4)} < ${clock.peak.toFixed(4)})`);
ok(M.street.peak < M.deal.peak, `the street is distant (${M.street.peak.toFixed(4)} < ${M.deal.peak.toFixed(4)})`);
ok(live.running && live.contexts === 1, `one AudioContext, opened by the gesture (${live.contexts})`);
ok(liveStats.played >= CUES.length, `every cue fired on the live graph (${liveStats.played} played, ${liveStats.dropped} dropped)`);
if (liveAfter.ctxAdvanced > 1.5) ok(liveAfter.ticks >= 2, `the clock keeps time on the live graph (${liveAfter.ticks} ticks scheduled in 2.6 s)`);
else console.log(`SKIP  the clock on the live graph: this headless browser has no audio clock (currentTime moved ${liveAfter.ctxAdvanced.toFixed(2)}s in 2.6s; ${liveAfter.ticks} tick(s) armed)`);
ok(liveAfter.mutedPlayed === 0 && !liveAfter.muted, `mute stops everything and unmutes again (${liveAfter.mutedPlayed} played while muted)`);
ok(shot.contexts === 0, `shot mode never builds an AudioContext (${shot.contexts})`);
ok(shot.played === 0 && shot.rendered === 'null' && !shot.running, `shot mode is silent (played ${shot.played}, render ${shot.rendered})`);
ok(errors.length === 0, `no page errors${errors.length ? ':\n  ' + errors.slice(0, 6).join('\n  ') : ''}`);

// ---- the waveform sheet -------------------------------------------------------------------------------
const W = 1600, H = 900, COLS = 4, ROWS = 3;
const PAD = { l: 46, t: 96, r: 30, b: 34 };
const PW = Math.floor((W - PAD.l - PAD.r) / COLS), PH = Math.floor((H - PAD.t - PAD.b) / ROWS);
const SCALE = 0.15; // one vertical scale for every panel, so the balance is visible
const sheet = [
  ['room tone (x10)', 'room', 3.0, 10],
  ['clock tick', 'clock', 0.06, 1],
  ['settle — the card lands', 'settle', 0.2, 1],
  ['deal — the card slides', 'deal', 0.2, 1],
  ['riffle', 'riffle', 0.55, 1],
  ['tap — the deck squared', 'tap', 0.2, 1],
  ['flip — turned face up', 'flip', 0.2, 1],
  ['snap — a title card', 'snap', 0.2, 1],
  ['pick — out of the fan', 'pick', 0.25, 1],
  ['creak — the chair', 'creak', 0.6, 1],
  ['title — two notes, up a fifth', 'title', 1.7, 1],
  ['closing — the inversion, down', 'closing', 1.7, 1],
];
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>`;
svg += `<text x="${PAD.l}" y="46" font-family="Futura, Jost, sans-serif" font-size="26" letter-spacing="3" fill="${INK}">TAROT PEPE — THE SOUND OF THE PARLOUR</text>`;
svg += `<text x="${PAD.l}" y="70" font-family="Futura, Jost, sans-serif" font-size="14" letter-spacing="1.4" fill="${INK}">EVERY CUE RENDERED OFFLINE THROUGH THE PAGE'S OWN CODE · ONE VERTICAL SCALE (±0.15) FOR EVERY PANEL · ROOM TONE MAGNIFIED ×10</text>`;
sheet.forEach(([label, key, seconds, mag], i) => {
  const cx = PAD.l + (i % COLS) * PW, cy = PAD.t + Math.floor(i / COLS) * PH;
  const iw = PW - 22, ih = PH - 40;
  const r = RAW[key];
  const m = key === 'room' ? room : key === 'clock' ? clock : M[key];
  const from = key === 'room' ? Math.floor(r.sampleRate * 0.5) : Math.max(0, m.first - Math.round(r.sampleRate * 0.004));
  const n = Math.min(r.l.length - from, Math.round(r.sampleRate * seconds));
  const cols = Math.min(iw, 360);
  const mid = cy + ih / 2;
  let d = '';
  for (let c = 0; c < cols; c++) {
    const a = from + Math.floor((c * n) / cols), b = from + Math.floor(((c + 1) * n) / cols);
    let lo = 0, hi = 0;
    for (let j = a; j < Math.min(b, r.l.length); j++) {
      lo = Math.min(lo, r.l[j]);
      hi = Math.max(hi, r.l[j]);
    }
    const x = (cx + (c * iw) / cols).toFixed(1);
    const y1 = (mid - (Math.max(-SCALE, Math.min(SCALE, hi * mag)) / SCALE) * (ih / 2)).toFixed(1);
    const y2 = (mid - (Math.max(-SCALE, Math.min(SCALE, lo * mag)) / SCALE) * (ih / 2)).toFixed(1);
    d += `M${x} ${y1}L${x} ${Math.max(+y2, +y1 + 0.6).toFixed(1)}`;
  }
  svg += `<rect x="${cx}" y="${cy}" width="${iw}" height="${ih}" fill="none" stroke="${INK}" stroke-width="1" opacity="0.35"/>`;
  svg += `<line x1="${cx}" y1="${mid}" x2="${cx + iw}" y2="${mid}" stroke="${INK}" stroke-width="0.6" opacity="0.3"/>`;
  svg += `<path d="${d}" stroke="${key === 'room' ? MUSTARD : INK}" stroke-width="1.1" fill="none"/>`;
  svg += `<text x="${cx}" y="${cy + ih + 16}" font-family="Futura, Jost, sans-serif" font-size="13" letter-spacing="1.2" fill="${INK}">${label.toUpperCase()}</text>`;
  const nums = key === 'room' ? `PEAK ${room.peak.toFixed(4)} · RMS ${room.steadyRms.toFixed(4)} · ${room.centroid.toFixed(0)} HZ` : `PEAK ${m.peak.toFixed(3)} · ${(m.dur * 1000).toFixed(0)} MS · ${m.centroid.toFixed(0)} HZ`;
  svg += `<text x="${cx}" y="${cy + ih + 31}" font-family="Futura, Jost, sans-serif" font-size="11" letter-spacing="1" fill="${INK}" opacity="0.65">${nums}</text>`;
  svg += `<text x="${cx + iw}" y="${cy - 5}" text-anchor="end" font-family="Futura, Jost, sans-serif" font-size="10" letter-spacing="1" fill="${INK}" opacity="0.5">${seconds}s</text>`;
});
svg += '</svg>';
mkdirSync(dirname(PLOT), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(PLOT);
console.log(`\nwrote ${PLOT}`);
console.log(fails.length ? `${fails.length} assertion(s) failed` : 'every assertion holds');
process.exit(fails.length ? 1 : 0);
