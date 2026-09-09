#!/usr/bin/env node
// THE 'switch' CUE, MEASURED (props round 9). The cat lamp's tumbler, rendered offline through the
// very code the page runs (sound.render → OfflineAudioContext), the way tools/_sound-probe.mjs does
// it. Prints the peak, the length and the trim that would make the rendered peak match LEVEL.switch,
// and puts 'static' and 'latch' beside it so the new cue can be read against the two it has to sit
// between: quieter than the door's brass latch, and about as loud as the radio's detent.
import { chromium } from 'playwright';

const NAMES = ['switch', 'static', 'latch', 'clock'];
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
await page.goto('http://127.0.0.1:5173/?view=sound&state=default', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });

const rows = await page.evaluate(async (names) => {
  const s = window.__theatre.pieces.sound;
  const out = [];
  for (const name of names) {
    // exactly the call tools/_sound-probe.mjs makes — same default seed, same at — so the trim this
    // prints can be pasted into the same table the probe's trims came from
    const takes = [];
    for (const at of [0.02]) {
      const r = await s.render(name, 1.0);
      if (!r) continue;
      let peak = 0, last = 0;
      for (let i = 0; i < r.l.length; i++) {
        const v = Math.max(Math.abs(r.l[i]), Math.abs(r.r[i]));
        if (v > peak) peak = v;
        if (v > 1e-4) last = i;
      }
      takes.push({ peak, dur: (last - Math.round(at * r.sampleRate)) / r.sampleRate });
    }
    const peak = Math.max(...takes.map((t) => t.peak));
    const dur = Math.max(...takes.map((t) => t.dur));
    out.push({ name, peak, dur, level: s.levels[name], length: s.lengths[name], trim: s.trims[name] ?? 1 });
  }
  return out;
}, NAMES);

console.log('cue       peak     LEVEL    off by    length   LENGTH   trim now   trim measured');
for (const r of rows) {
  const off = ((r.peak / r.level - 1) * 100).toFixed(1);
  const want = +(r.trim * (r.level / r.peak)).toFixed(3);
  console.log(
    `${r.name.padEnd(9)} ${r.peak.toFixed(4)}  ${String(r.level).padEnd(8)} ${(off + '%').padStart(7)}   ` +
      `${r.dur.toFixed(3)}s   ${String(r.length).padEnd(7)}  ${String(r.trim).padEnd(9)}  ${want}` +
      (r.dur > r.length + 0.005 ? '   OVER ITS LENGTH' : ''),
  );
}
await browser.close();
