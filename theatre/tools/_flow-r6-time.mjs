#!/usr/bin/env node
// flow round 6: HOW LONG "DRAW CARDS" TAKES, from the intent landing to the first card turning.
// Drives a real evening with the scripted brain (no key), asks for the cards, picks three the
// instant it is allowed to, and stamps every beat on the way.
//   node tools/_flow-r6-time.mjs [width] [height]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay {}' }));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    return {
      beat: T.pieces.flow?.beat,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      field: !!document.querySelector('#dialogue input.keys'),
      title: !!document.querySelector('#titles .card'),
      fan: T.pieces.reveal?.fanCount ?? 0,
      picks: (T.pieces.reveal?.picks ?? []).length,
      caption: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : null,
      faceUp: (T.pieces.cards?.drawn?.children ?? []).filter((m) => Math.abs(m.rotation.x) < 0.5).length,
      provider: T.pieces.mind?.provider ?? 'none',
    };
  });
let t0 = Date.now();
const el = () => (Date.now() - t0) / 1000;
const stamps = [];
const mark = (label, extra = '') => {
  stamps.push({ label, at: el(), extra });
  console.log(`  +${el().toFixed(2)}s  ${label} ${extra}`);
};
async function until(label, fn, seconds = 90) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(60);
  }
}

await until('the door', (s) => s.door === 'closed' || s.beat === 'greeting' || s.beat === 'talk', 60);
for (let k = 0; k < 20; k++) {
  const s = await state();
  if (s.beat !== 'door' && s.beat !== 'idle') break;
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(900);
}
await until('the greeting and the open field', (s) => s.field && s.beat === 'talk', 150);
await page.keyboard.type('hello', { delay: 8 });
await page.keyboard.press('Enter');
await until('the field again', (s) => s.field && s.beat === 'talk', 90);

// ---- the clock starts the instant the request is sent -------------------------------------------
t0 = Date.now();
await page.keyboard.type('can you read my cards', { delay: 8 });
await page.keyboard.press('Enter');
mark('asked for the cards');
const seen = new Set();
const overWash = []; // every caption that goes up while the deck is being washed
const watch = (async () => {
  for (;;) {
    const s = await state().catch(() => null);
    if (!s) return;
    if (s.beat === 'shuffle' && s.caption) {
      const k = overWash.length - 1;
      if (k >= 0 && (s.caption.startsWith(overWash[k]) || overWash[k].startsWith(s.caption))) overWash[k] = s.caption.length > overWash[k].length ? s.caption : overWash[k];
      else overWash.push(s.caption);
    }
    if (s.title && !seen.has('title')) { seen.add('title'); mark('the story card is up'); }
    if (s.beat === 'shuffle' && !seen.has('shuffle')) { seen.add('shuffle'); mark('the shuffle starts'); }
    if (s.beat === 'fan' && !seen.has('fan')) { seen.add('fan'); mark('the fan/push beat starts'); }
    if (s.fan >= 78 && !seen.has('cloth')) { seen.add('cloth'); mark('78 on the cloth'); }
    if (s.picks >= 3 && !seen.has('three')) { seen.add('three'); mark('three chosen'); }
    if (s.faceUp >= 1 && !seen.has('turn')) { seen.add('turn'); mark('THE FIRST CARD TURNS'); return; }
    await page.waitForTimeout(50);
  }
})();
// pick three the moment each is allowed: by ordinal, so no pointer timing is in the number
await until('the mass ready and the pick prompt', (s) => s.fan >= 70 && s.field, 120);
mark('ready to pick');
for (let k = 0; k < 3; k++) {
  await until(`prompt ${k + 1}`, (s) => s.field && s.picks === k, 60);
  await page.evaluate((n) => window.__theatre.pieces.reveal.pickByOrdinal(n), 3 + k * 7);
  await until(`pick ${k + 1}`, (s) => s.picks === k + 1, 40);
}
await watch;
const prov = (await state()).provider;
console.log(`\nwhat went up while the deck was being washed (provider '${prov}'):`);
if (!overWash.length) console.log('  nothing — he worked in silence');
for (const l of overWash) console.log(`  ${l}`);
console.log(errors.length ? `PAGE ERRORS: ${errors.slice(0, 3).join(' | ')}` : 'no page errors');
const at = (l) => stamps.find((s) => s.label === l)?.at ?? null;
console.log(
  `\nintent → the cards ready to pick: ${at('ready to pick')?.toFixed(2)}s` +
    `   intent → the first card turns: ${at('THE FIRST CARD TURNS')?.toFixed(2)}s` +
    `   (three picks taken as fast as the flow allows)`,
);
await browser.close();
