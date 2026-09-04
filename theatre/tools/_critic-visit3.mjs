#!/usr/bin/env node
// Critic's visit, round 3. A visitor who wants to TALK first.
//   node tools/_critic-visit3.mjs [--out /abs/dir] [--prefix whole-r3] [--width 1600] [--height 900]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
const prefix = args.prefix ?? 'whole-r3';
const W = +(args.width ?? 1600), H = +(args.height ?? 900);
mkdirSync(outDir, { recursive: true });
const url = 'http://127.0.0.1:5173/';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: false });
const errors = [];
const warnings = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning') warnings.push(m.text());
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
const t0 = Date.now();
const el = () => (Date.now() - t0) / 1000;
const log = (...a) => console.log(`[${el().toFixed(1)}s]`, ...a);
const marks = [];
const mark = (label, extra = '') => {
  const last = marks.length ? marks[marks.length - 1].at : 0;
  marks.push({ label, at: el(), dt: el() - last, extra });
  log(`MARK ${label} (+${(el() - last).toFixed(1)}s) ${extra}`);
};
const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${prefix}-${name}.png` });
  log('shot', name);
};

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
while (el() < 180) {
  const ready = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ready) break;
  await page.waitForTimeout(250);
}
mark('ready');

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    const capText = cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim() : null;
    const r = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
    const inp = document.querySelector('#dialogue input.keys');
    const ir = inp ? inp.getBoundingClientRect() : null;
    return {
      beat: T.pieces.flow?.beat,
      intent: T.pieces.flow?.intent,
      readings: T.pieces.flow?.readings,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      caption: capText ? capText.slice(0, 200) : null,
      capBox: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      capFont: cap && !cap.hidden ? getComputedStyle(cap.querySelector('.line') ?? cap).fontSize : null,
      inter: !!(cap && !cap.hidden && cap.classList.contains('inter')),
      field: !!inp,
      fieldBox: ir ? { x: Math.round(ir.x), y: Math.round(ir.y), w: Math.round(ir.width), h: Math.round(ir.height) } : null,
      title: !!document.querySelector('#titles .card'),
      titleText: (document.querySelector('#titles .card')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
      fan: T.pieces.reveal?.fanCount ?? 0,
      picks: (T.pieces.reveal?.picks ?? []).map((p) => `${p.ordinal}:${p.slug}`),
      drawn: (T.pieces.cards?.drawn?.children ?? []).length,
      turns: (T.pieces.mind?.history ?? []).length,
      mind: T.pieces.mind?.provider,
    };
  });
async function until(label, fn, seconds = 60) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`STALL ${((Date.now() - start) / 1000).toFixed(0)}s waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(120);
  }
}
const field = (label, seconds = 120) => until(label, (s) => s.field && s.beat === 'talk', seconds);
async function types(text) {
  await page.keyboard.type(text, { delay: 10 });
  await page.keyboard.press('Enter');
  log('typed', JSON.stringify(text));
}
const seen = [];
async function watchCaptions(ms, everyMs = 140) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await state();
    if (s.caption && seen[seen.length - 1] !== s.caption) seen.push(s.caption);
    await page.waitForTimeout(everyMs);
  }
}
let firstCardMove = null;

try {
  // 1. the door -----------------------------------------------------------------------------
  const d = await until('the door on its sheet', (s) => s.door === 'closed' || s.beat !== 'door', 60);
  mark('door up', JSON.stringify({ door: d.door, beat: d.beat, shot: d.shot }));
  await page.waitForTimeout(1500);
  await shot('01-door');
  const probe = await page.evaluate(() => {
    const e = document.querySelector('#entrance');
    const cs = e ? getComputedStyle(e) : null;
    const at = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return { cursor: cs?.cursor, pointer: cs?.pointerEvents, at: at ? (at.id || at.className || at.tagName) : null,
      hint: (document.querySelector('#entrance')?.textContent ?? '').replace(/\s+/g,' ').trim().slice(0,120) };
  });
  log('door probe', JSON.stringify(probe));
  await page.mouse.move(W / 2, H / 2, { steps: 4 });
  await page.waitForTimeout(700);
  await shot('02-door-hover');

  // 2. the swing ----------------------------------------------------------------------------
  const clickAt = el();
  await page.mouse.click(W / 2, H / 2);
  mark('knocked');
  await page.waitForTimeout(450); await shot('03-swing-a');
  await page.waitForTimeout(700); await shot('03-swing-b');
  const inside = await until('the film inside the parlour', (s) => s.door !== 'closed' && s.beat !== 'door', 90);
  mark('inside', JSON.stringify({ beat: inside.beat, shot: inside.shot, door: inside.door }) + ` door→inside ${(el() - clickAt).toFixed(1)}s`);
  await shot('04-inside');

  // 3. greeting -----------------------------------------------------------------------------
  const g = await field('the greeting and an open field', 150);
  mark('greeting + field', JSON.stringify({ caption: g.caption, mind: g.mind, capBox: g.capBox, fieldBox: g.fieldBox }));
  await shot('05-greeting');
  if (g.fan > 0 || g.drawn > 0) firstCardMove = firstCardMove ?? 'at the greeting';

  // 4. hello --------------------------------------------------------------------------------
  const helloAt = el();
  await types('hello');
  const r1 = await until('an answer to hello', (s) => s.beat === 'reply' || s.turns > g.turns, 60);
  mark('reply to hello', JSON.stringify({ caption: r1.caption }));
  await watchCaptions(3000);
  await shot('06-hello');
  const f1 = await field('the field back after hello', 120);
  mark('field back', `hello round-trip ${(el() - helloAt).toFixed(1)}s`);
  if (f1.fan > 0 || f1.drawn > 0) firstCardMove = firstCardMove ?? 'after "hello"';

  // 5. something real -----------------------------------------------------------------------
  const realAt = el();
  await types('I keep starting things and not finishing them');
  const r2 = await until('an answer', (s) => s.beat === 'reply', 60).catch(() => null);
  if (r2) mark('reply to the real thing', JSON.stringify({ caption: r2.caption }));
  await watchCaptions(5000);
  await shot('07-the-real-thing');
  const f2 = await field('the field back', 150);
  mark('field back', `round-trip ${(el() - realAt).toFixed(1)}s`);
  if (f2.fan > 0 || f2.drawn > 0) firstCardMove = firstCardMove ?? 'after the second line';

  // 6. declining ----------------------------------------------------------------------------
  await types("not yet, I'd rather talk");
  const r3 = await until('his answer to the refusal', (s) => s.beat === 'reply', 60).catch(() => null);
  if (r3) mark('reply to the refusal', JSON.stringify({ intent: r3.intent, caption: r3.caption }));
  await watchCaptions(4000);
  await shot('08-not-yet');
  const f3 = await field('the field back after the refusal', 150);
  mark('field back after refusal', JSON.stringify({ intent: f3.intent, fan: f3.fan, drawn: f3.drawn }));
  if (f3.fan > 0 || f3.drawn > 0) firstCardMove = firstCardMove ?? 'after "not yet, I would rather talk" — HE DEALT ANYWAY';
  if (f3.intent === 'draw') console.log('!! the refusal was read as a request for cards');

  // 7. two more turns -----------------------------------------------------------------------
  await types('what do you do when nobody comes in');
  await until('an answer', (s) => s.beat === 'reply', 60).catch(() => null);
  await watchCaptions(4000);
  await shot('09-talk3');
  const f4 = await field('the field back', 150);
  if (f4.fan > 0 || f4.drawn > 0) firstCardMove = firstCardMove ?? 'in the middle of the conversation';
  await types('do you ever get tired of being asked about the future');
  await until('an answer', (s) => s.beat === 'reply', 60).catch(() => null);
  await watchCaptions(4000);
  await shot('10-talk4');
  const f5 = await field('the field back', 150);
  mark('four turns of talk done', JSON.stringify({ fan: f5.fan, drawn: f5.drawn, readings: f5.readings }));
  if (f5.fan > 0 || f5.drawn > 0) firstCardMove = firstCardMove ?? 'before any reading was asked for';
  if (!firstCardMove) console.log('GOOD: nothing on the table moved through four turns of talk');

  // 8. now the cards ------------------------------------------------------------------------
  const askAt = el();
  await types('can you read my cards');
  const moved = await until('the first card movement', (s) => s.title || s.beat === 'shuffle' || s.fan > 0 || s.drawn > 0, 120);
  firstCardMove = firstCardMove ?? 'only after the visitor asked (correct)';
  mark('asked for the cards', JSON.stringify({ beat: moved.beat, title: moved.titleText }));
  if (moved.title) await shot('11-story-card');
  const sh = await until('the shuffle', (s) => s.beat === 'shuffle' || s.beat === 'fan' || s.fan > 0, 120);
  if (sh.beat === 'shuffle') { mark('shuffle', `${(el() - askAt).toFixed(1)}s after asking`); await shot('12-shuffle'); }
  const laid = await until('the fan laid', (s) => (s.beat === 'fan' && s.fan >= 21) || s.picks.length > 0, 150);
  mark('fan laid', JSON.stringify({ fan: laid.fan, shot: laid.shot, caption: laid.caption }));
  await shot('13-fan');

  // 9. three picks --------------------------------------------------------------------------
  await until('the pick prompt', (s) => s.field, 90);
  let pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  log('fan on screen:', pos.length, 'cards, x', Math.round(pos[0]?.x), '→', Math.round(pos[pos.length - 1]?.x), 'y', Math.round(pos[0]?.y));
  const offscreen = pos.filter((p) => p.x < 0 || p.x > W || p.y < 0 || p.y > H).length;
  if (offscreen) console.log(`!! ${offscreen} of ${pos.length} fan cards are OFF SCREEN at ${W}x${H}`);
  await page.mouse.move(pos[5].x, pos[5].y, { steps: 6 });
  await page.waitForTimeout(500);
  await shot('14-hover');
  await page.mouse.down(); await page.mouse.up();
  const p1 = await until('pick 1', (s) => s.picks.length === 1, 40);
  mark('pick 1 (clicked)', JSON.stringify(p1.picks));
  await shot('15-pick1');

  await until('the second prompt', (s) => s.field && s.picks.length === 1, 90);
  pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  const mid = pos[Math.floor(pos.length * 0.72)];
  await page.mouse.move(mid.x, mid.y, { steps: 6 });
  await page.waitForTimeout(500);
  await page.mouse.down(); await page.mouse.up();
  const p2 = await until('pick 2', (s) => s.picks.length === 2, 40);
  mark('pick 2 (clicked)', JSON.stringify(p2.picks));
  await shot('16-pick2');

  await until('the third prompt', (s) => s.field && s.picks.length === 2, 90);
  await page.keyboard.type('the second from the right', { delay: 12 });
  await page.waitForTimeout(500);
  await shot('17-pick3-typed');
  await page.keyboard.press('Enter');
  const p3 = await until('pick 3', (s) => s.picks.length === 3, 60);
  mark('pick 3 (named)', JSON.stringify(p3.picks));

  // 10. the turns ---------------------------------------------------------------------------
  const turning = await until('the first turn', (s) => s.beat === 'reading' || String(s.shot).startsWith('card'), 120);
  mark('first turn', JSON.stringify({ shot: turning.shot }));
  for (let i = 0; i < 3; i++) {
    const ins = await until(`insert ${i}`, (s) => s.shot === `card${i}` || s.shot === `card${i + 1}` || s.beat === 'talk', 180);
    if (ins.shot !== `card${i}`) { log(`card ${i}: the insert had passed (now ${ins.shot} / ${ins.beat})`); continue; }
    mark(`card ${i} insert`, JSON.stringify({ caption: ins.caption, inter: ins.inter }));
    await shot(`18-reading${i}`);
    await watchCaptions(5000);
    await until(`reading ${i} over`, (s) => s.shot !== `card${i}`, 150);
  }

  // 11. carrying on -------------------------------------------------------------------------
  const f6 = await field('the field after the reading', 180);
  mark('back to the talk', JSON.stringify({ readings: f6.readings, caption: f6.caption }));
  await shot('19-after-reading');
  const fuAt = el();
  await types('what does the middle one mean');
  const a = await until('an answer about the card', (s) => s.beat === 'reply', 90).catch(() => null);
  if (a) mark('answered the follow-up', JSON.stringify({ intent: a.intent, caption: a.caption }));
  await watchCaptions(5000);
  await shot('20-followup');
  const f7 = await field('the field again', 150);
  mark('still talking', `round-trip ${(el() - fuAt).toFixed(1)}s; intent=${f7.intent}; readings=${f7.readings}`);
  if (f7.intent !== 'talk') console.log(`!! "what does the middle one mean" was read as ${f7.intent}`);

  await page.keyboard.type('and the last one', { delay: 20 });
  await page.waitForTimeout(800);
  await shot('21-conversation');
  await page.evaluate(() => window.__theatre.pieces.camera?.cut?.('home')).catch(() => {});
  await page.waitForTimeout(1200);
  await shot('22-home');

  // 12. good night --------------------------------------------------------------------------
  for (let i = 0; i < 24; i++) await page.keyboard.press('Backspace');
  await types('thank you, goodbye');
  const bye = await until('the farewell', (s) => s.beat === 'farewell' || s.beat === 'closing', 120);
  mark('farewell', JSON.stringify({ caption: bye.caption }));
  if (bye.beat === 'farewell') await shot('23-farewell');
  await watchCaptions(5000);
  const end = await until('the sign-off card', (s) => s.beat === 'closing' && s.title, 120);
  mark('closing card', JSON.stringify(end.titleText));
  await shot('24-closing');

  const transcript = await page.evaluate(() => (window.__theatre.pieces.mind?.history ?? []).map((h) => `${h.role}: ${h.text}`));
  console.log('\nMIND HISTORY\n' + (transcript.length ? transcript.map((l) => '  ' + l).join('\n') : '  (empty)'));
} catch (e) {
  errors.push(`TEST: ${e.message}`);
  log('FAILED:', e.message);
  await shot('FAILED').catch(() => {});
}

console.log('\nEVERY CAPTION SEEN, IN ORDER');
console.log(seen.map((c, i) => `  ${i + 1}. ${c}`).join('\n'));
console.log('\nTIMINGS');
for (const m of marks) console.log(`  ${m.at.toFixed(1).padStart(6)}s  +${m.dt.toFixed(1).padStart(5)}s  ${m.label}  ${m.extra}`);
console.log('\nfirst card movement: ' + (firstCardMove ?? 'never'));
const stalls = marks.filter((m) => m.dt > 15);
if (stalls.length) console.log('STALLS > 15s:\n' + stalls.map((m) => `  ${m.label}: ${m.dt.toFixed(1)}s`).join('\n'));

await browser.close();
if (warnings.length) console.log('\nwarnings:\n' + warnings.slice(0, 30).map((w) => ' - ' + w).join('\n'));
if (errors.length) { console.error('\nPAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n')); process.exit(2); }
console.log(`\nok in ${el().toFixed(0)}s; shots in ${outDir} as ${prefix}-*.png`);
