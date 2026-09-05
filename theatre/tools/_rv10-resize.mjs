#!/usr/bin/env node
// reveal round 10: THE WINDOW DRAGGED FROM ONE SHAPE TO THE OTHER while the spread is out. The two
// nestings carry different numbers of cards on different bows, so every card on the cloth has to be
// re-seated when the shape crosses the line — and a card that is already in a reading slot must
// stay in it. Loads at 1600x900, resizes to 390x760 and back, and checks after each: no page error,
// 78 cards accounted for, the nesting the shape asks for, every mesh on its bow, and the picks kept.
//   node tools/_rv10-resize.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1500);

const probe = () =>
  page.evaluate(() => {
    const T = window.__theatre, f = T.pieces.reveal._fan, S = f.SPREAD;
    let onBow = 0, off = 0, lost = 0;
    for (const e of f.entries) {
      if (e.removed || e.flying) { lost++; continue; }
      const r = Math.hypot(e.mesh.position.x, e.mesh.position.z);
      // the card's centre should be within a couple of millimetres of its bow's radius
      if (Math.abs(r - e.t.r) < 0.006) onBow++; else off++;
    }
    return {
      nest: S.nest,
      bows: S.tiers.map((t) => t.n),
      entries: f.entries.length,
      total: S.tiers.reduce((a, t) => a + t.n, 0),
      onBow, off, lost,
      keystone: f.keystoneIndex,
      picks: T.pieces.reveal.picks.length,
      w: window.innerWidth, h: window.innerHeight,
    };
  });

const say = (tag, p) => console.log(`${tag.padEnd(22)} ${p.w}x${p.h} nest=${p.nest} bows ${p.bows.join('/')} (${p.total}) entries ${p.entries}  on their bow ${p.onBow}, off ${p.off}, in a slot/flying ${p.lost}  keystone ${p.keystone}  picks ${p.picks}`);

say('as loaded', await probe());
await page.setViewportSize({ width: 390, height: 760 });
await page.evaluate(() => window.dispatchEvent(new Event('resize'))); // headless Chromium does not fire one for setViewportSize
await page.waitForTimeout(1200);
say('→ 390x760', await probe());
// take one card, then drag the window back to landscape: the taken card must stay taken
await page.evaluate(async () => {
  const f = window.__theatre.pieces.reveal._fan;
  await f.doPick(f.entries[f.keystoneIndex]);
});
await page.waitForTimeout(1200);
say('  after one pick', await probe());
await page.setViewportSize({ width: 1600, height: 900 });
await page.evaluate(() => window.dispatchEvent(new Event('resize'))); // headless Chromium does not fire one for setViewportSize
await page.waitForTimeout(1200);
say('→ 1600x900', await probe());
await page.setViewportSize({ width: 390, height: 760 });
await page.evaluate(() => window.dispatchEvent(new Event('resize'))); // headless Chromium does not fire one for setViewportSize
await page.waitForTimeout(1200);
say('→ 390x760 again', await probe());
console.log(errs.length ? `PAGE ERRORS: ${errs.slice(0, 4).join(' | ')}` : 'no page errors');
await browser.close();
