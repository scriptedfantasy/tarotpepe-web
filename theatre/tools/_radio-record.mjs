// _radio-record — does the set play the record? Headless Chromium with autoplay allowed, the
// record served from a two-second tone (the real file is the user's and is not in the repo), the
// radio turned by its own api, and the sound piece asked what is playing.
//
//   node tools/_radio-record.mjs        (dev server on 5173)
import { chromium } from 'playwright';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';

// a 2 s 440 Hz WAV, mono, 22050 Hz, 16-bit — the <audio> element sniffs the bytes, not the name
function tone() {
  const sr = 22050, n = sr * 2;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sr) * 12000), 44 + i * 2);
  return buf;
}
// The tone is put on the shelf for the length of the probe and taken off again: a media element
// wants a real file with ranges, which a fulfilled route does not give it.
const shelf = new URL('../public/radio/record.mp3', import.meta.url).pathname;
const had = existsSync(shelf);
if (!had) writeFileSync(shelf, tone());
process.on('exit', () => {
  if (!had) unlinkSync(shelf);
});

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (/\[sound\]/.test(m.text())) console.log('console:', m.text()); });
await page.goto(`${BASE}/?view=props&state=default`, { waitUntil: 'load', timeout: 120000 });
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
// the first gesture starts the sound piece; then the set is turned by its own api
await page.mouse.click(640, 400);
await page.waitForTimeout(300);
const r = await page.evaluate(async () => {
  const ctx = window.__theatre;
  const props = ctx?.pieces?.props;
  const radio = props?.radio ?? props?.api?.radio ?? null;
  const sound = ctx?.pieces?.sound;
  const before = { station: radio?.station, tune: sound?.tune ?? null, running: sound?.running };
  radio?.turn?.();
  await new Promise((r) => setTimeout(r, 3000));
  const on = { station: radio?.station, tune: sound?.tune ?? null };
  const el = sound?.tune?.el ?? null;
  const file = await fetch('/radio/record.mp3').then((r) => `${r.status} ${r.headers.get('content-type')} ${r.headers.get('content-length')}`).catch((e) => String(e));
  const els = [{ file, el: el ? { src: el.currentSrc.split('/').slice(-2).join('/'), readyState: el.readyState, networkState: el.networkState, error: el.error?.code ?? null, paused: el.paused, t: el.currentTime.toFixed(2), duration: el.duration } : null }];
  on.tune = on.tune && { ...on.tune, el: undefined };
  radio?.turn?.();
  await new Promise((r) => setTimeout(r, 300));
  const off = { station: radio?.station, tune: sound?.tune ?? null };
  const elsOff = [...document.querySelectorAll('audio')].map((a) => ({ paused: a.paused, t: a.currentTime.toFixed(2) }));
  return { keys: Object.keys(props ?? {}), before, on, els, off, elsOff };
});
console.log(JSON.stringify(r, null, 1));
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
