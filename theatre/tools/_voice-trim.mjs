#!/usr/bin/env node
// Calibrate one or more cues without the rest of the theatre: import sound-voices.js straight off
// the dev server and render each voice into an OfflineAudioContext. Prints the peak against LEVEL
// and the TRIM that would make them agree, plus length / onset / centroid.
//
//   node tools/_voice-trim.mjs latch hinge knock footfall type
import { chromium } from 'playwright';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const plotAt = argv.indexOf('--plot');
const PLOT = plotAt >= 0 ? argv[plotAt + 1] : null;
const names = argv.filter((a, i) => !a.startsWith('--') && i !== plotAt + 1);
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){return{accept(){},on(){},off(){},send(){},dispose(){},prune(){},decline(){},invalidate(){},acceptExports(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}' }));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
const out = await page.evaluate(async (cues) => {
  const V = await import('/src/pieces/sound-voices.js');
  const res = [];
  for (const name of cues) {
    const sr = 22050;
    const seconds = name === 'hinge' || name === 'creak' ? 0.9 : name === 'title' || name === 'closing' ? 2 : 0.5;
    const oc = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
    const bus = oc.createGain();
    bus.gain.value = 1;
    bus.connect(oc.destination);
    V.play(oc, bus, name, 0.02, { seed: 7 });
    const buf = await oc.startRendering();
    res.push({ name, sr: buf.sampleRate, l: Array.from(buf.getChannelData(0)), level: V.LEVEL[name], trim: V.TRIM[name] });
  }
  return res;
}, names);
await browser.close();

const stats = [];
for (const r of out) {
  const x = r.l;
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const gate = peak * 0.012;
  let first = -1, lastI = -1;
  for (let i = 0; i < x.length; i++)
    if (Math.abs(x[i]) > gate) {
      if (first < 0) first = i;
      lastI = i;
    }
  let onset = 0;
  for (let i = first; i < Math.min(lastI, first + Math.round(r.sr * 0.012)); i++) onset = Math.max(onset, Math.abs(x[i]));
  const dur = (lastI - first) / r.sr;
  const suggest = Math.round(r.trim * (r.level / peak) * 1000) / 1000;
  console.log(
    `${r.name.padEnd(9)} peak ${peak.toFixed(4)}  want ${r.level.toFixed(4)}  dur ${dur.toFixed(3)}s  onset ${((onset / peak) * 100).toFixed(0)}%   TRIM ${suggest}`,
  );
  stats.push({ ...r, peak, dur, first });
}

if (PLOT) {
  const INK = '#0d0e0d', PAPER = '#f8f9f4';
  const COLS = Math.min(4, stats.length), ROWS = Math.ceil(stats.length / COLS);
  const PW = 380, PH = 240, W = 40 + COLS * PW, H = 70 + ROWS * PH;
  const SCALE = 0.15;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>`;
  svg += `<text x="24" y="40" font-family="Futura, Jost, sans-serif" font-size="20" letter-spacing="2.4" fill="${INK}">VOICES — RENDERED OFFLINE, ONE SCALE (±0.15)</text>`;
  stats.forEach((r, i) => {
    const cx = 24 + (i % COLS) * PW, cy = 62 + Math.floor(i / COLS) * PH;
    const iw = PW - 26, ih = PH - 50, mid = cy + ih / 2;
    const from = Math.max(0, r.first - Math.round(r.sr * 0.004));
    const n = Math.min(r.l.length - from, Math.round(r.sr * (r.dur + 0.06)));
    const cols = Math.min(iw, 340);
    let d = '';
    for (let c = 0; c < cols; c++) {
      const a = from + Math.floor((c * n) / cols), b = from + Math.floor(((c + 1) * n) / cols);
      let lo = 0, hi = 0;
      for (let j = a; j < Math.min(b, r.l.length); j++) {
        lo = Math.min(lo, r.l[j]);
        hi = Math.max(hi, r.l[j]);
      }
      const x = (cx + (c * iw) / cols).toFixed(1);
      const y1 = (mid - (Math.max(-SCALE, Math.min(SCALE, hi)) / SCALE) * (ih / 2)).toFixed(1);
      const y2 = (mid - (Math.max(-SCALE, Math.min(SCALE, lo)) / SCALE) * (ih / 2)).toFixed(1);
      d += `M${x} ${y1}L${x} ${Math.max(+y2, +y1 + 0.6).toFixed(1)}`;
    }
    svg += `<rect x="${cx}" y="${cy}" width="${iw}" height="${ih}" fill="none" stroke="${INK}" stroke-width="1" opacity="0.35"/>`;
    svg += `<line x1="${cx}" y1="${mid}" x2="${cx + iw}" y2="${mid}" stroke="${INK}" stroke-width="0.6" opacity="0.3"/>`;
    svg += `<path d="${d}" stroke="${INK}" stroke-width="1.1" fill="none"/>`;
    svg += `<text x="${cx}" y="${cy + ih + 18}" font-family="Futura, Jost, sans-serif" font-size="13" letter-spacing="1.2" fill="${INK}">${r.name.toUpperCase()} · ${(r.dur * 1000).toFixed(0)} MS · PEAK ${r.peak.toFixed(3)}</text>`;
  });
  svg += '</svg>';
  await sharp(Buffer.from(svg)).png().toFile(PLOT);
  console.log(`wrote ${PLOT}`);
}
