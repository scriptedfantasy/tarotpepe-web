#!/usr/bin/env node
// Does the REAL entrance still fire the door on the audio clock, with the tune wired in? The
// synthetic half of tools/_tune-probe.mjs lays the seven cues through sound.at() and measures them;
// this walks the evening instead — open the page, wait for the shut door, knock, and read back what
// landed on sound.timeline and what the tune was doing while it happened.
//
// It exists because tools/_sound-probe.mjs's own door assertion reports "none" on this machine and
// the question that has to be answered is whether that is the loaded box or a fault in the piece.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1200, height: 760 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.type() + ': ' + m.text()));
await p.route('**/@vite/client', (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};}\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}',
  }),
);
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 400; i++) {
  if (await p.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await p.waitForTimeout(250);
}
let mode = null;
for (let i = 0; i < 240; i++) {
  mode = await p.evaluate(() => window.__theatre?.pieces?.entrance?.mode ?? null).catch(() => null);
  if (mode === 'closed') break;
  await p.waitForTimeout(250);
}
console.log('entrance mode before the knock:', mode);
// WHAT IS ACTUALLY UNDER THE POINTER. If the knock never lands, the first question is whether the
// click reached the door's own sheet or was swallowed by a layer over the picture.
const hit = await p.evaluate(() => {
  const e = document.elementFromPoint(600, 350);
  const chain = [];
  for (let n = e; n && chain.length < 6; n = n.parentElement) chain.push(`${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''}`);
  return chain;
});
console.log('under the pointer at (600,350):', hit.join(' < '));
// and whether the door is actually WAITING for a knock, or whether open() stopped before it got there
const waiting = await p.evaluate(() => {
  const el = document.getElementById('entrance');
  return { hasRoot: !!el, classes: el?.className ?? null, beat: window.__theatre.pieces.flow?.beat ?? null };
});
console.log('entrance root:', JSON.stringify(waiting));
await p.mouse.click(600, 350);
let fired = [];
for (let i = 0; i < 320; i++) {
  fired = await p.evaluate(() => (window.__theatre.pieces.sound.timeline ?? []).map((e) => [e.name, e.at])).catch(() => []);
  if (fired.some((e) => e[0] === 'latch')) break;
  await p.waitForTimeout(250);
}
await p.waitForTimeout(1500);
const out = await p.evaluate(() => {
  const S = window.__theatre.pieces.sound;
  return {
    timeline: (S.timeline ?? []).map((e) => [e.name, e.at]),
    door: S.door,
    running: S.running,
    tune: S.tune,
    bars: S.stats.bars,
    mode: window.__theatre.pieces.entrance?.mode ?? null,
  };
});
const i0 = out.timeline.findIndex((e) => e[0] === 'latch');
if (i0 < 0) console.log('NO LATCH. timeline:', JSON.stringify(out.timeline));
else {
  const t0 = out.timeline[i0][1];
  console.log('the door, on the audio clock:');
  for (const [n, at] of out.timeline.slice(i0, i0 + 7)) console.log(`  ${n.padEnd(9)} +${(at - t0).toFixed(3)}s`);
  console.log(`  the parlour was behind the leaf for ${((out.door.to - out.door.from) * 1000).toFixed(0)} ms`);
}
console.log('sound.running', out.running, '· tune', out.tune && `${out.tune.id} ${out.tune.title} playing=${out.tune.playing} bar=${out.tune.bar}`, '· bars laid', out.bars, '· entrance', out.mode);
if (errors.length) console.log('errors:\n  ' + [...new Set(errors)].join('\n  '));
await b.close();
process.exit(i0 < 0 ? 1 : 0);
