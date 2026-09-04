#!/usr/bin/env node
// A critic's visit, round 2. A visitor who wants to TALK first: land on the door, look at it,
// knock, say hello, say something real, refuse the cards once, talk twice more, then ask for a
// reading and check that is the first time any card has moved. Pick two by clicking the fan and
// the third by naming it. Watch the turns. Ask about the middle card and check the evening does
// not end. Then say good night.
//
//   node tools/_critic-visit2.mjs [--out /abs/dir] [--prefix whole-r2]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
const prefix = args.prefix ?? 'whole-r2';
mkdirSync(outDir, { recursive: true });
const url = 'http://127.0.0.1:5173/';
const W = 1600, H = 900;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
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
async function sheet(name, frames = 8, interval = 170) {
  const bufs = [];
  for (let i = 0; i < frames; i++) {
    bufs.push(await page.screenshot());
    if (i < frames - 1) await page.waitForTimeout(interval);
  }
  const cols = 4, rows = 2, cw = Math.round(W / 2), ch = Math.round(H / 2);
  const tiles = await Promise.all(bufs.map((b) => sharp(b).resize(cw, ch).png().toBuffer()));
  await sharp({ create: { width: cw * cols, height: ch * rows, channels: 3, background: '#111' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cw, top: Math.floor(i / cols) * ch })))
    .png()
    .toFile(`${outDir}/${prefix}-${name}.png`);
  log('sheet', name);
}

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
while (el() < 150) {
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
    return {
      beat: T.pieces.flow?.beat,
      intent: T.pieces.flow?.intent,
      readings: T.pieces.flow?.readings,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      caption: capText ? capText.slice(0, 160) : null,
      inter: !!(cap && !cap.hidden && cap.classList.contains('inter')),
      field: !!document.querySelector('#dialogue input.keys'),
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
const field = (label, seconds = 90) => until(label, (s) => s.field && s.beat === 'talk', seconds);
async function types(text) {
  await page.keyboard.type(text, { delay: 12 });
  await page.keyboard.press('Enter');
  log('typed', JSON.stringify(text));
}
// every caption we ever see, in order — the transcript as the visitor experienced it
const seen = [];
async function watchCaptions(ms, everyMs = 150) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await state();
    if (s.caption && seen[seen.length - 1] !== s.caption) seen.push(s.caption);
    await page.waitForTimeout(everyMs);
  }
}

let firstCardMove = null;

try {
  // ---- 1. the door -------------------------------------------------------------------------
  const d = await until('the door on its sheet', (s) => s.door === 'closed' || s.beat !== 'door', 40);
  mark('door up', JSON.stringify({ door: d.door, beat: d.beat, shot: d.shot }));
  await page.waitForTimeout(1200);
  await shot('01-door');
  // a visitor looks at it before touching it: does the cursor say it can be clicked?
  const doorProbe = await page.evaluate(() => {
    const e = document.querySelector('#entrance');
    const cs = e ? getComputedStyle(e) : null;
    const el = document.elementFromPoint(800, 450);
    return { cursor: cs?.cursor, pointer: cs?.pointerEvents, elAtCentre: el ? (el.id || el.className || el.tagName) : null };
  });
  log('door probe', JSON.stringify(doorProbe));
  await page.mouse.move(800, 450, { steps: 4 });
  await page.waitForTimeout(600);
  await shot('02-door-hover');

  // ---- 2. the swing ------------------------------------------------------------------------
  const clickAt = el();
  await page.mouse.click(800, 450);
  mark('knocked');
  await sheet('sheet-door');
  const inside = await until('the film inside the parlour', (s) => s.door !== 'closed' && s.beat !== 'door', 60);
  mark('inside', JSON.stringify({ beat: inside.beat, shot: inside.shot, door: inside.door }));
  console.log(`door→inside ${(el() - clickAt).toFixed(1)}s`);
  await shot('03-inside');

  // ---- 3. the greeting ---------------------------------------------------------------------
  const g = await field('the greeting and an open field', 120);
  mark('greeting + field', JSON.stringify({ caption: g.caption, mind: g.mind }));
  await shot('04-greeting');
  if (g.fan > 0 || g.drawn > 0) firstCardMove = firstCardMove ?? 'at the greeting';

  // ---- 4. hello ----------------------------------------------------------------------------
  const helloAt = el();
  await types('hello');
  const r1 = await until('an answer to hello', (s) => s.beat === 'reply' || s.turns > g.turns, 45);
  mark('reply to hello', JSON.stringify({ caption: r1.caption }));
  await watchCaptions(2500);
  await shot('05-hello');
  const f1 = await field('the field back after hello', 90);
  mark('field back', `hello round-trip ${(el() - helloAt).toFixed(1)}s`);
  if (f1.fan > 0 || f1.drawn > 0) firstCardMove = firstCardMove ?? 'after "hello"';

  // ---- 5. something real -------------------------------------------------------------------
  const realAt = el();
  await types('I keep starting things and not finishing them');
  const r2 = await until('an answer', (s) => s.beat === 'reply', 45).catch(() => null);
  if (r2) mark('reply to the real thing', JSON.stringify({ caption: r2.caption }));
  await watchCaptions(4000);
  await shot('06-the-real-thing');
  const f2 = await field('the field back', 120);
  mark('field back', `round-trip ${(el() - realAt).toFixed(1)}s`);
  console.log('what he said, so far:\n' + seen.map((c) => '   · ' + c).join('\n'));
  if (f2.fan > 0 || f2.drawn > 0) firstCardMove = firstCardMove ?? 'after the second line';

  // ---- 6. refusing the cards ---------------------------------------------------------------
  await types("not yet, I'd rather talk");
  const r3 = await until('his answer to the refusal', (s) => s.beat === 'reply', 45).catch(() => null);
  if (r3) mark('reply to the refusal', JSON.stringify({ intent: r3.intent, caption: r3.caption }));
  await watchCaptions(3500);
  await shot('07-not-yet');
  const f3 = await field('the field back after the refusal', 120);
  mark('field back after refusal', JSON.stringify({ intent: f3.intent, fan: f3.fan, drawn: f3.drawn }));
  if (f3.fan > 0 || f3.drawn > 0) firstCardMove = firstCardMove ?? 'after "not yet, I\'d rather talk" — HE DEALT ANYWAY';
  if (f3.intent === 'draw') console.log('!! the refusal was read as a request for cards');

  // ---- 7. two more turns -------------------------------------------------------------------
  await types('what do you do when nobody comes in');
  await until('an answer', (s) => s.beat === 'reply', 45).catch(() => null);
  await watchCaptions(3500);
  await shot('08-talk3');
  const f4 = await field('the field back', 120);
  if (f4.fan > 0 || f4.drawn > 0) firstCardMove = firstCardMove ?? 'in the middle of the conversation';
  await types('do you ever get tired of being asked about the future');
  const talking = await until('an answer', (s) => s.beat === 'reply', 45).catch(() => null);
  if (talking) await sheet('sheet-talk');
  await watchCaptions(2500);
  await shot('09-talk4');
  const f5 = await field('the field back', 120);
  mark('four turns of talk done', JSON.stringify({ fan: f5.fan, drawn: f5.drawn, readings: f5.readings }));
  if (f5.fan > 0 || f5.drawn > 0) firstCardMove = firstCardMove ?? 'before any reading was asked for';
  if (!firstCardMove) console.log('GOOD: nothing on the table moved through four turns of talk');

  // ---- 8. now the cards --------------------------------------------------------------------
  const askAt = el();
  await types('can you read my cards');
  const moved = await until('the first card movement', (s) => s.title || s.beat === 'shuffle' || s.fan > 0 || s.drawn > 0, 90);
  firstCardMove = firstCardMove ?? 'only after the visitor asked (correct)';
  mark('asked for the cards', JSON.stringify({ beat: moved.beat, title: moved.titleText }));
  if (moved.title) {
    await shot('10-story-card');
    log('story card', JSON.stringify(moved.titleText));
  }
  const sh = await until('the shuffle', (s) => s.beat === 'shuffle' || s.beat === 'fan' || s.fan > 0, 90);
  if (sh.beat === 'shuffle') {
    mark('shuffle', `${(el() - askAt).toFixed(1)}s after asking`);
    await shot('11-shuffle');
  }
  const laid = await until('the fan laid', (s) => (s.beat === 'fan' && s.fan >= 21) || s.picks.length > 0, 120);
  mark('fan laid', JSON.stringify({ fan: laid.fan, shot: laid.shot }));
  await shot('12-fan');

  // ---- 9. three picks ----------------------------------------------------------------------
  await until('the pick prompt', (s) => s.field, 60);
  let pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  log('fan on screen:', pos.length, 'cards, x from', Math.round(pos[0]?.x), 'to', Math.round(pos[pos.length - 1]?.x));
  await page.mouse.move(pos[5].x, pos[5].y, { steps: 6 });
  await page.waitForTimeout(420);
  await shot('13-hover');
  await page.mouse.down();
  await page.mouse.up();
  const p1 = await until('pick 1', (s) => s.picks.length === 1, 30);
  mark('pick 1 (clicked)', JSON.stringify(p1.picks));
  await shot('14-pick1');
  const react = await until('the cut back to him between picks', (s) => s.shot !== 'fan', 12).catch(() => null);
  if (react) {
    log('reaction cut to', react.shot);
    await shot('15-react');
  } else log('NOTE: no reaction cut after pick 1');

  await until('the second prompt', (s) => s.field && s.picks.length === 1, 60);
  pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  const mid = pos[Math.floor(pos.length * 0.7)];
  await page.mouse.move(mid.x, mid.y, { steps: 6 });
  await page.waitForTimeout(420);
  await page.mouse.down();
  await page.mouse.up();
  const p2 = await until('pick 2', (s) => s.picks.length === 2, 30);
  mark('pick 2 (clicked)', JSON.stringify(p2.picks));
  await shot('16-pick2');

  await until('the third prompt', (s) => s.field && s.picks.length === 2, 60);
  await page.keyboard.type('the second from the right', { delay: 14 });
  await page.waitForTimeout(400);
  await shot('17-pick3-typed');
  await page.keyboard.press('Enter');
  const p3 = await until('pick 3', (s) => s.picks.length === 3, 40);
  mark('pick 3 (named)', JSON.stringify(p3.picks));

  // ---- 10. the turns -----------------------------------------------------------------------
  const turning = await until('the first turn', (s) => s.beat === 'reading' || String(s.shot).startsWith('card'), 90);
  mark('first turn', JSON.stringify({ shot: turning.shot }));
  await sheet('sheet-turn');
  for (let i = 0; i < 3; i++) {
    const ins = await until(`insert ${i}`, (s) => s.shot === `card${i}` || s.shot === `card${i + 1}` || s.beat === 'talk', 150);
    if (ins.shot !== `card${i}`) {
      log(`card ${i}: the insert had passed (now ${ins.shot} / ${ins.beat})`);
      continue;
    }
    mark(`card ${i} insert`, JSON.stringify({ caption: ins.caption, inter: ins.inter }));
    await shot(`18-reading${i}`);
    await watchCaptions(4000);
    await until(`reading ${i} over`, (s) => s.shot !== `card${i}`, 120);
  }

  // ---- 11. the conversation carries on -----------------------------------------------------
  const f6 = await field('the field after the reading', 150);
  mark('back to the talk', JSON.stringify({ readings: f6.readings, caption: f6.caption }));
  await shot('19-after-reading');
  const fuAt = el();
  await types('what does the middle one mean');
  const a = await until('an answer about the card', (s) => s.beat === 'reply', 60).catch(() => null);
  if (a) mark('answered the follow-up', JSON.stringify({ intent: a.intent, caption: a.caption }));
  await watchCaptions(4000);
  await shot('20-followup');
  const f7 = await field('the field again', 120);
  mark('still talking', `round-trip ${(el() - fuAt).toFixed(1)}s; intent=${f7.intent}; readings=${f7.readings}`);
  if (f7.intent !== 'talk') console.log(`!! "what does the middle one mean" was read as ${f7.intent}`);

  // the frame for the blind pair: mid-conversation, the whole room, his line up, the visitor typing
  await page.keyboard.type('and the last one', { delay: 22 });
  await page.waitForTimeout(700);
  await shot('21-conversation');
  await page.evaluate(() => window.__theatre.pieces.camera?.cut?.('home')).catch(() => {});
  await page.waitForTimeout(900);
  await shot('22-home');

  // ---- 12. good night ----------------------------------------------------------------------
  for (let i = 0; i < 24; i++) await page.keyboard.press('Backspace');
  await types('thank you, goodbye');
  const bye = await until('the farewell', (s) => s.beat === 'farewell' || s.beat === 'closing', 90);
  mark('farewell', JSON.stringify({ caption: bye.caption }));
  if (bye.beat === 'farewell') await shot('23-farewell');
  await watchCaptions(4000);
  const end = await until('the sign-off card', (s) => s.beat === 'closing' && s.title, 90);
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
if (warnings.length) console.log('\nwarnings:\n' + warnings.slice(0, 40).map((w) => ' - ' + w).join('\n'));
if (errors.length) {
  console.error('\nPAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log(`\nok in ${el().toFixed(0)}s; shots in ${outDir} as ${prefix}-*.png`);
