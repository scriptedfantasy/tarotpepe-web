#!/usr/bin/env node
// THE 'buzz' CUE, MEASURED (egg-insects). An insect crossing the room, rendered offline through the
// very code the page runs (sound.render → OfflineAudioContext), the way tools/_sound-probe.mjs and
// tools/_props-r9-switch.mjs do it. Prints the peak, the length and the trim that would make the
// rendered peak match LEVEL.buzz, and puts the room tone, the escapement and the cat's switch
// beside it so the new cue can be read against what it has to sit under: quieter than the clock,
// louder than the room.
//
//   BASE=http://127.0.0.1:8705 node tools/_egg-insects-buzz.mjs
import { chromium } from 'playwright';

const NAMES = ['buzz', 'switch', 'static', 'clock'];
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  }),
);
await page.goto(`${BASE}/?view=sound&state=default`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });

const rows = await page.evaluate(async (names) => {
  const s = window.__theatre.pieces.sound;
  const out = [];
  for (const name of names) {
    const r = await s.render(name, 1.4);
    if (!r) continue;
    let peak = 0, last = 0;
    for (let i = 0; i < r.l.length; i++) {
      const v = Math.max(Math.abs(r.l[i]), Math.abs(r.r[i]));
      if (v > peak) peak = v;
      if (v > 1e-4) last = i;
    }
    out.push({ name, peak, dur: (last - Math.round(0.02 * r.sampleRate)) / r.sampleRate, level: s.levels[name], length: s.lengths[name], trim: s.trims[name] ?? 1 });
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
      (r.dur > r.length + 0.02 ? '   OVER ITS LENGTH' : ''),
  );
}
// and the figure the piece actually fires: one every third drawing of a 12 fps flight
console.log('\nthe cadence egg-insects.js fires it at: one buzz every 3 drawings at 12 fps = every 0.250 s');
const b = rows.find((r) => r.name === 'buzz');
if (b) console.log(`the cue runs ${b.dur.toFixed(3)} s, so each one overlaps the next by ${(b.dur - 0.25).toFixed(3)} s — no bare room tone between them`);
await browser.close();
