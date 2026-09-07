#!/usr/bin/env node
// Measure the radio's crackle: peak, length, centroid, and the TRIM that makes it hit its LEVEL.
// tools/_sound-probe.mjs has its own hard-coded list of cues and `static` is not on it (nor are
// wash / smoosh / rake / square), so this renders it through the same sound.render() hook and does
// the same arithmetic. `cut` and `type` are rendered alongside it as controls: both are known to
// land exactly on their LEVEL, which is how the peak convention here is checked against the
// probe's — per channel, not the sum of the two.
//   node tools/_props-r8-static.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?shot=0&mute=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
const r = await page.evaluate(async () => {
  const s = window.__theatre.pieces.sound;
  const out = {};
  for (const at of ['static', 'cut', 'type']) {
    const b = await s.render(at, 0.6, { seed: 7, at: 0.02 });
    const l = b.l, sr = b.sampleRate;
    let peak = 0, last = 0;
    for (let i = 0; i < l.length; i++) { const a = Math.max(Math.abs(l[i]), Math.abs(b.r[i])); if (a > peak) peak = a; if (a > peak * 0.0001) last = i; }
    // length: from onset to the last sample over 1% of peak
    let first = 0, end = 0;
    for (let i = 0; i < l.length; i++) { const a = Math.max(Math.abs(l[i]), Math.abs(b.r[i])); if (a > peak * 0.02) { if (!first) first = i; end = i; } }
    // onset level in the first 12 ms
    let onset = 0;
    for (let i = 0; i < Math.min(l.length, Math.round(sr * 0.012)); i++) { const a = Math.max(Math.abs(l[i]), Math.abs(b.r[i])); if (a > onset) onset = a; }
    // spectral centroid, crude
    let num = 0, den = 0;
    const N = 4096;
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N && i < l.length; i++) re[i] = (l[i] + b.r[i]) * 0.5 * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    // naive DFT on 256 bins is enough for a centroid
    for (let k = 1; k < 512; k++) {
      let sre = 0, sim = 0;
      for (let i = 0; i < N; i += 4) { const a = (-2 * Math.PI * k * i) / N; sre += re[i] * Math.cos(a); sim += re[i] * Math.sin(a); }
      const mag = Math.hypot(sre, sim);
      num += mag * ((k * sr) / N); den += mag;
    }
    out[at] = { peak: +peak.toFixed(5), onsetPct: Math.round((onset / peak) * 100), secs: +((end - first) / sr).toFixed(4), centroid: Math.round(num / den), sr };
  }
  out.level = s.levels.static; out.length = s.lengths.static; out.trim = s.trims.static;
  return out;
});
console.log(JSON.stringify(r, null, 2));
console.log('TRIM needed for static:', (r.level / (r.static.peak / r.trim)).toFixed(3), ' | cut peak vs LEVEL.cut 0.022, type peak vs 0.02');
await browser.close();
