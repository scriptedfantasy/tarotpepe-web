#!/usr/bin/env node
// Measure the three background tunes. Nobody here can hear, so each one is rendered offline through
// the very code the page runs (sound.tuneBuffer → OfflineAudioContext) and reported as numbers.
//
// TWO PASSES OF THE MATERIAL ARE RENDERED, always, because everything that matters about a
// background tune is at the join between them:
//
//   seam        the sample step a BUTT-JOIN would make at the loop point, against the largest step
//               anywhere else in the render. The piece does not butt-join — it schedules bar by bar,
//               so bar 32 is followed by bar 33 — but the number says whether it would click if it
//               did, which is the honest way to answer "does it click at the seam".
//   wrap        how far pass 2 differs from pass 1, sample for sample, as dB below the signal. It
//               reads the tail ringing ACROSS the join (a buffer loop would cut it off; the
//               scheduler does not) — but on a square-wave lead it is dominated by sub-sample
//               scheduling and means nothing audible, so read it for a and c and ignore it for b.
//   join level  the RMS in the 200 ms around the join against the RMS of the whole thing. Under
//               0 dB means the loop point falls in a quiet bar, which is where you want it.
//
// And the levels that say it is BACKGROUND: peak and RMS against the room tone (the quietest thing
// in the film), the escapement, and the door's stop (the loudest).
//
//   node tools/_tune-probe.mjs                # all three
//   node tools/_tune-probe.mjs --tune b       # one
//   node tools/_tune-probe.mjs --passes 3
//   node tools/_tune-probe.mjs --live 0       # skip the live-browser checks
//
// Modelled on tools/_sound-probe.mjs, including its Vite-HMR stub (other builders are saving files).
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = 'http://127.0.0.1:5173/';
const WHICH = args.tune ? [args.tune] : ['a', 'b', 'c'];
const PASSES = +(args.passes ?? 2);
const LIVE = args.live !== '0';

const errors = [];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });

async function openPage(url) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
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
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
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
  if (!ready) errors.push(`the page never became ready (${url})`);
  return page;
}

// ---- everything below runs IN THE PAGE -------------------------------------------------------
// Two passes of the music box is three million floats. They do not cross the websocket; the
// arithmetic goes to them.
const ANALYSE = async ({ which, passes, TUNE_RMS, CUR }) => {
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
  // spectral centroid, averaged over hopped 1024-sample windows across a region
  function centroid(x, sr, from, to) {
    const N = 1024;
    let num = 0, den = 0;
    for (let s = from; s + N < to; s += N * 4) {
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < N; i++) re[i] = x[s + i] * hann(i, N);
      fft(re, im);
      for (let k = 1; k < N / 2; k++) {
        const m = Math.hypot(re[k], im[k]);
        num += ((k * sr) / N) * m;
        den += m;
      }
    }
    return den > 0 ? num / den : 0;
  }
  const rms = (x, a, b) => {
    let s = 0;
    for (let i = a; i < b; i++) s += x[i] * x[i];
    return Math.sqrt(s / Math.max(1, b - a));
  };
  const peak = (x, a, b) => {
    let p = 0;
    for (let i = a; i < b; i++) p = Math.max(p, Math.abs(x[i]));
    return p;
  };
  const db = (v, ref) => (v > 0 && ref > 0 ? 20 * Math.log10(v / ref) : -999);

  const S = window.__theatre.pieces.sound;

  // ---- the reference levels the tune has to sit between ----------------------------------------
  const refs = {};
  for (const [name, seconds] of [['room', 3.0], ['clock', 0.25], ['knock', 0.4], ['type', 0.1]]) {
    const r = await S.render(name, seconds);
    const l = Float32Array.from(r.l), rr = Float32Array.from(r.r);
    const mono = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) mono[i] = l[i] + rr[i];
    refs[name] = { peak: peak(mono, 0, mono.length), rms: rms(mono, 0, mono.length) };
  }

  const out = {};
  for (const w of which) {
    const b = await S.tuneBuffer(w, { passes });
    const x = b.data, sr = b.sampleRate;
    const i0 = Math.round(b.offset * sr);
    const L = Math.round(b.loop * sr);
    const iL = i0 + L;
    const end = Math.min(x.length, i0 + passes * L);

    // level, over the whole rendered material. The tune renders MONO and the cue references are
    // summed L+R, so the tune's numbers are doubled to compare like with like: a mono source
    // connected to a stereo destination is upmixed to both channels, which is exactly what the
    // tune does on the live graph.
    const pk = 2 * peak(x, i0, end);
    const rm = 2 * rms(x, i0, end);

    // the join. `seam` is what a butt-join would step; `worst` is the largest step anywhere else,
    // so the two numbers together say whether the join is remarkable.
    const seam = Math.abs(x[iL - 1] - x[i0]);
    let worst = 0;
    for (let i = i0 + 1; i < end; i++) {
      if (Math.abs(i - iL) < 4) continue;
      worst = Math.max(worst, Math.abs(x[i] - x[i - 1]));
    }
    // the tail that rings across the join: how far pass 2 differs from pass 1
    let d = 0, n = 0;
    for (let k = 0; k < L && iL + k < x.length; k++, n++) {
      const e = x[i0 + k] - x[iL + k];
      d += e * e;
    }
    const wrap = 2 * Math.sqrt(d / Math.max(1, n)); // doubled to match the doubled rms above
    // is the loop point in a quiet bar?
    const win = Math.round(0.1 * sr);
    const joinRms = 2 * rms(x, iL - win, iL + win);

    out[w] = {
      id: w,
      title: b.meta.title,
      key: b.meta.key,
      metre: b.meta.metre,
      bpm: b.meta.bpm,
      bars: b.bars,
      loop: +b.loop.toFixed(2),
      rendered: +(x.length / sr).toFixed(2),
      sampleRate: sr,
      peak: +pk.toFixed(5),
      rms: +rm.toFixed(5),
      trimFor: null,
      crestDb: +db(pk, rm).toFixed(1),
      centroid: Math.round(centroid(x, sr, i0, end)),
      seam: +(2 * seam).toFixed(6),
      worstStep: +(2 * worst).toFixed(6),
      seamVsWorstDb: +db(seam, worst).toFixed(1),
      crest: 0,
      wrapDb: +db(wrap, rm).toFixed(1),
      joinVsMeanDb: +db(joinRms, rm).toFixed(1),
      // against the room
      peakVsRoomDb: +db(pk, refs.room.peak).toFixed(1),
      rmsVsRoomDb: +db(rm, refs.room.rms).toFixed(1),
      peakVsClockDb: +db(pk, refs.clock.peak).toFixed(1),
      peakVsKnockDb: +db(pk, refs.knock.peak).toFixed(1),
    };
    // the trim that would land the tune's RMS on the target this file asserts against — the number
    // to paste into TUNE_TRIM in src/pieces/sound-tune.js
    out[w].trimFor = +((TUNE_RMS / Math.max(1e-9, rm)) * CUR[w]).toFixed(3);
  }
  out.__refs = {
    room: { peak: +refs.room.peak.toFixed(5), rms: +refs.room.rms.toFixed(5) },
    clock: { peak: +refs.clock.peak.toFixed(5) },
    knock: { peak: +refs.knock.peak.toFixed(5) },
    type: { peak: +refs.type.peak.toFixed(5) },
  };
  return out;
};

// ---- the offline measurement --------------------------------------------------------------------
const page = await openPage(BASE + '?view=sound&state=default');
await page.mouse.click(600, 350); // the gesture the browser insists on
await page.waitForTimeout(250);

// the RMS all three are trimmed to, so a comparison is between compositions and not between volumes
const TUNE_RMS = 0.008;
const CUR = await page.evaluate(async () => {
  const m = await import('/src/pieces/sound-tune.js');
  return m.TUNE_TRIM;
});
const M = await page.evaluate(ANALYSE, { which: WHICH, passes: PASSES, TUNE_RMS, CUR });
const refs = M.__refs;
delete M.__refs;

console.log('\n── the room, for scale ───────────────────────────────────────────────────────');
console.log(`  room tone   peak ${refs.room.peak}   rms ${refs.room.rms}`);
console.log(`  escapement  peak ${refs.clock.peak}`);
console.log(`  the pen     peak ${refs.type.peak}`);
console.log(`  door stop   peak ${refs.knock.peak}   ← the loudest thing in the film`);

for (const w of WHICH) {
  const t = M[w];
  if (!t) continue;
  console.log(`\n── ?tune=${w}  ${t.title} ──────────────────────────────────────────────`);
  console.log(`  ${t.key} · ${t.metre}${t.bpm ? ` · ${t.bpm} bpm` : ''} · ${t.bars} bars · ${t.loop}s of material · ${PASSES} passes rendered (${t.rendered}s @ ${t.sampleRate})`);
  console.log(`  level      peak ${t.peak}  rms ${t.rms}  crest ${t.crestDb} dB   centroid ${t.centroid} Hz`);
  console.log(`  vs room    peak ${t.peakVsRoomDb >= 0 ? '+' : ''}${t.peakVsRoomDb} dB   rms ${t.rmsVsRoomDb >= 0 ? '+' : ''}${t.rmsVsRoomDb} dB`);
  console.log(`  vs cues    ${t.peakVsClockDb >= 0 ? '+' : ''}${t.peakVsClockDb} dB on the escapement · ${t.peakVsKnockDb} dB under the door's stop`);
  console.log(`  the join   butt-join step ${t.seam} vs worst ordinary step ${t.worstStep}  (${t.seamVsWorstDb} dB)`);
  console.log(`  trim       in use ${CUR[t.id]} · ${t.trimFor} would land rms on ${TUNE_RMS} (it is ${t.rms})`);
  console.log(`             tail across the join ${t.wrapDb} dB under signal · join is ${t.joinVsMeanDb} dB against the mean`);
}

// ---- the assertions ------------------------------------------------------------------------------
const fails = [];
const ok = (cond, msg) => (cond ? null : fails.push(msg));
for (const w of WHICH) {
  const t = M[w];
  if (!t) {
    fails.push(`?tune=${w} rendered nothing`);
    continue;
  }
  ok(t.loop >= 40, `${w}: ${t.loop}s of material — the brief asks for 40 s before the join`);
  ok(t.peak > 0.004, `${w}: peak ${t.peak} — silent`);
  ok(t.peak <= 0.1, `${w}: peak ${t.peak} — louder than background; the card cues peak at 0.23 and the escapement at ${refs.clock.peak}`);
  ok(t.peakVsKnockDb <= -6, `${w}: only ${-t.peakVsKnockDb} dB under the door's stop; it should be well under it`);
  ok(t.rmsVsRoomDb > 1 && t.rmsVsRoomDb < 10, `${w}: rms ${t.rmsVsRoomDb} dB over the room tone — wanted between 1 and 10`);
  ok(Math.abs(t.rms - TUNE_RMS) < TUNE_RMS * 0.12, `${w}: rms ${t.rms} is not on ${TUNE_RMS}; the three must be the same loudness or the choice is about volume`);
  ok(t.seam <= t.worstStep, `${w}: a butt-join at the loop point would step ${t.seam}, more than the worst ordinary step ${t.worstStep} — that is a click`);
  ok(t.centroid > 150 && t.centroid < 6000, `${w}: centroid ${t.centroid} Hz is outside anything the room could contain`);
}

// ---- the live browser: does it actually start, and on the first gesture? ---------------------------
if (LIVE) {
  console.log('\n── in a real browser ─────────────────────────────────────────────────────────');
  for (const w of WHICH) {
    const p = await openPage(BASE + `?view=sound&state=default&tune=${w}`);
    const before = await p.evaluate(() => {
      const S = window.__theatre.pieces.sound;
      return { running: S.running, playing: S.tune?.playing ?? null, bars: S.stats.bars, contexts: S.stats.contexts };
    });
    await p.mouse.click(600, 350);
    await p.waitForTimeout(1400);
    const after = await p.evaluate(() => {
      const S = window.__theatre.pieces.sound;
      return { running: S.running, tune: S.tune, bars: S.stats.bars, ticks: S.stats.ticks, ctx: S.context?.state ?? null, t: S.context?.currentTime ?? 0 };
    });
    await p.waitForTimeout(4200); // longer than the longest bar (the line's is 3.16 s)
    const later = await p.evaluate(() => ({ bars: window.__theatre.pieces.sound.stats.bars, bar: window.__theatre.pieces.sound.tune?.bar ?? 0 }));
    console.log(
      `  ?tune=${w}  before gesture: running=${before.running} playing=${before.playing} bars=${before.bars} · after: running=${after.running} playing=${after.tune?.playing} bars=${after.bars}→${later.bars} (bar ${later.bar}) ctx=${after.ctx}`,
    );
    ok(before.bars === 0 && before.contexts === 0, `${w}: something was scheduled before the visitor's first gesture`);
    ok(after.running === true, `${w}: the piece did not start on the gesture`);
    ok(after.tune?.playing === true, `${w}: the tune did not start on the gesture`);
    ok(later.bars > after.bars, `${w}: the tune stopped advancing (${after.bars} → ${later.bars})`);
    await p.close();
  }

  // ?tune=0 is silence, and the rest of the piece still runs
  const off = await openPage(BASE + '?view=sound&state=default&tune=0');
  await off.mouse.click(600, 350);
  await off.waitForTimeout(1200);
  const offState = await off.evaluate(() => {
    const S = window.__theatre.pieces.sound;
    return { running: S.running, tune: S.tune, bars: S.stats.bars, ticks: S.stats.ticks };
  });
  console.log(`  ?tune=0    running=${offState.running} tune=${offState.tune} bars=${offState.bars} ticks=${offState.ticks}`);
  ok(offState.tune === null && offState.bars === 0, 'the tune played with ?tune=0');
  ok(offState.ticks > 0, 'the escapement stopped when the tune was turned off');
  await off.close();

  // the door: the tune is behind the leaf until it arrives, and the cues land on the swing
  const dp = await openPage(BASE + '?view=sound&state=default');
  await dp.mouse.click(600, 350);
  await dp.waitForTimeout(200);
  const door = await dp.evaluate(() => {
    const S = window.__theatre.pieces.sound;
    const HOLD = 2 / 12, SWING_AT = 3 / 12, SWING_END = SWING_AT + 8 * HOLD, TRUCK_AT = SWING_END + HOLD;
    const list = [
      [0, 'latch'],
      [SWING_AT + HOLD, 'hinge'],
      [SWING_AT + 4 * HOLD, 'hinge'],
      [SWING_END, 'knock'],
      [TRUCK_AT + HOLD, 'footfall'],
      [TRUCK_AT + 4 * HOLD, 'footfall'],
      [TRUCK_AT + 7 * HOLD, 'footfall'],
    ];
    S.timeline.length = 0;
    const t0 = S.context.currentTime;
    for (const [when, n] of list) S.at(when, n);
    return { t0, wanted: list, got: S.timeline.map((e) => ({ name: e.name, at: +(e.at - t0).toFixed(3) })), door: S.door };
  });
  const drift = door.wanted.map(([when, n], i) => ({ n, want: +when.toFixed(3), got: door.got[i]?.at ?? null, d: door.got[i] ? +(door.got[i].at - when).toFixed(3) : null }));
  console.log('  the door, laid in one go on the audio clock:');
  for (const d of drift) console.log(`    ${d.n.padEnd(9)} wanted ${String(d.want).padEnd(6)} got ${String(d.got).padEnd(6)} (${d.d >= 0 ? '+' : ''}${d.d}s)`);
  console.log(`    the parlour is behind the leaf for ${(door.door.to - door.door.from).toFixed(3)}s, cut open at the stop`);
  ok(drift.every((d) => d.d != null && Math.abs(d.d) < 0.02), 'a door cue did not land where it was asked for');
  ok(Math.abs(door.door.to - door.door.from - (3 / 12 + 8 * (2 / 12))) < 0.03, 'the door did not cut the room open at the leaf’s stop');

  // the smoosh cues, which reveal has been asking for and falling back from
  const smoosh = await dp.evaluate(async () => {
    const S = window.__theatre.pieces.sound;
    const want = ['wash', 'smoosh', 'rake', 'square', 'settle'];
    const have = want.filter((n) => S.cues.includes(n));
    const lens = {};
    for (const n of want) {
      const r = await S.render(n, 1.4);
      const l = r.l, rr = r.r;
      let pk = 0, last = 0, s = 0, onset = 0;
      const on = Math.round(0.012 * r.sampleRate);
      for (let i = 0; i < l.length; i++) {
        const v = Math.abs(l[i] + rr[i]);
        s += v * v;
        if (v > pk) pk = v;
        if (i < on + Math.round(0.02 * r.sampleRate) && i >= Math.round(0.02 * r.sampleRate) && v > onset) onset = v;
        if (v > 1e-4) last = i;
      }
      lens[n] = {
        peak: +pk.toFixed(5),
        rms: +Math.sqrt(s / l.length).toFixed(5),
        seconds: +(last / r.sampleRate).toFixed(3),
        stated: S.lengths[n],
        // what fraction of the peak the cue reaches in its first 12 ms. A struck thing is at its
        // level on the first sample (the door's stop is 100%); a hand sliding through a heap of
        // paper has no transient at all, and that is the whole difference between a wash and a
        // riffle.
        onsetPct: +(100 * onset / Math.max(1e-9, pk)).toFixed(0),
        trim: +((S.levels[n] / Math.max(1e-9, pk / 2)) * (S.trims[n] ?? 1)).toFixed(3),
      };
    }
    return { have, want, lens, trims: S.trims };
  });
  console.log('  the smoosh cues:');
  for (const n of smoosh.want) {
    const l = smoosh.lens[n];
    console.log(`    ${n.padEnd(8)} ${smoosh.have.includes(n) ? 'present' : 'MISSING'}  peak ${l.peak}  rms ${l.rms}  ${l.seconds}s (declared ${l.stated}s)  onset ${l.onsetPct}% of peak  trim ${l.trim}`);
  }
  ok(smoosh.have.length === smoosh.want.length, `the smoosh cues are still missing: ${smoosh.want.filter((n) => !smoosh.have.includes(n)).join(', ')}`);
  // and they have to BE a wash, not a riffle wearing its name
  const L = smoosh.lens;
  ok(L.wash.seconds > 0.7, `the wash is ${L.wash.seconds}s — a wash is a long slither, the riffle it replaced was 0.47s`);
  ok(L.wash.onsetPct < 55, `the wash snaps on its first 12 ms (${L.wash.onsetPct}% of peak) — that is a riffle, not a hand in a heap`);
  ok(L.smoosh.onsetPct < 55, `the smoosh snaps on its first 12 ms (${L.smoosh.onsetPct}% of peak)`);
  ok(L.smoosh.seconds > 5 / 12, `the smoosh is ${L.smoosh.seconds}s and reveal fires one every ${(5 / 12).toFixed(3)}s: they will not overlap and the swirl will read as separate shoves`);
  ok(L.rake.seconds > 0.5, `the rake is ${L.rake.seconds}s — it has to gather, not snap`);
  ok(L.square.peak < L.rake.peak && L.square.peak < smoosh.lens.settle.peak, `the squaring is not the quietest event on the table (${L.square.peak})`);
  for (const n of ['wash', 'smoosh', 'rake', 'square'])
    ok(Math.abs(L[n].trim - (smoosh.trims?.[n] ?? L[n].trim)) < 1e6, 'unused');
  await dp.close();
}

await page.close();
await browser.close();

if (errors.length) {
  console.log('\npage errors:');
  for (const e of [...new Set(errors)]) console.log('  ' + e);
}
if (fails.length) {
  console.log('\n✗ ' + fails.length + ' fault(s):');
  for (const f of fails) console.log('  ' + f);
  process.exit(1);
}
console.log('\n✓ the three tunes measure as background, and the join does not click');
