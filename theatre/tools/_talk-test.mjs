#!/usr/bin/env node
// The evening as a CONVERSATION, for real: open the page as a visitor (no ?shot — the flow
// autoplays), knock at the door, say hello, say something that is not a request for cards and
// check that no cards come out, ask for a reading and only then expect the shuffle and the fan,
// pick three, sit through the readings, ask about a card and check the evening does NOT end, and
// only then say good night. Screenshots each stage. Fails on any page error or a stall.
//   node tools/_talk-test.mjs [--out /abs/dir] [--prefix flow-r3]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
const prefix = args.prefix ?? 'flow-r3';
mkdirSync(outDir, { recursive: true });
const url = 'http://127.0.0.1:5173/';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
const warnings = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning' && /\[flow\]|\[mind\]/.test(m.text())) warnings.push(m.text());
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
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${prefix}-${name}.png` });
  log('shot', name);
};
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 150000) {
  const ready = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ready) break;
  await page.waitForTimeout(250);
}
log('ready');

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    return {
      beat: T.pieces.flow?.beat,
      intent: T.pieces.flow?.intent,
      readings: T.pieces.flow?.readings,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      caption: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : null,
      inter: !!(cap && !cap.hidden && cap.classList.contains('inter')),
      field: !!document.querySelector('#dialogue input.keys'),
      title: !!document.querySelector('#titles .card'),
      fan: T.pieces.reveal?.fanCount ?? 0,
      picks: (T.pieces.reveal?.picks ?? []).map((p) => `${p.ordinal}:${p.slug}`),
      turns: (T.pieces.mind?.history ?? []).length,
      mind: T.pieces.mind?.provider,
    };
  });
// poll until fn(state) is true: throws after `seconds` (a stall)
async function until(label, fn, seconds = 60) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(120);
  }
}
// the field, open, with his line over it — the visitor's move
const field = (label, seconds = 90) => until(label, (s) => s.field && s.beat === 'talk', seconds);
async function types(text) {
  await page.keyboard.type(text, { delay: 12 });
  await page.keyboard.press('Enter');
  log('typed', JSON.stringify(text));
}

try {
  // 1. the door
  // `beat !== 'door'` used to be enough to say the film had begun inside; flow's beat is 'idle'
  // until the evening starts, so that resolved on the first sample, the knock never happened and
  // the test sat in front of a door it had decided was not there. Wait for the sheet, or for a
  // beat that only happens once we are past it.
  const d = await until('the door', (s) => s.door === 'closed' || s.beat === 'greeting' || s.beat === 'talk', 40);
  if (d.door === 'closed') {
    await shot('door');
    await page.mouse.click(800, 450);
    log('knocked');
  } else log('no door piece; the film began inside');

  // 2. the greeting, and the field under his last sentence
  const g = await field('the greeting and the open field', 90);
  log('greeting', JSON.stringify(g));
  await shot('greeting');

  // 3. a silence first: Escape at the open field must not end anything
  await page.keyboard.press('Escape');
  await until('the field to close on Escape', (s) => !s.field, 8).catch(() => log('NOTE: the field never closed on Escape'));
  const q = await field('a line and the field again after a silence', 40);
  log('after the silence', JSON.stringify(q));
  if (!q.caption) throw new Error('a silence left a dead screen');

  // 4. hello — a conversation, not a script
  await types('hello');
  const r1 = await until('his answer to hello', (s) => s.beat === 'reply' || s.turns > g.turns, 40);
  log('reply 1', JSON.stringify(r1));
  const f1 = await field('the field again after hello', 60);
  await shot('talk1');
  if (f1.fan > 0 || f1.readings > 0) throw new Error('the cards came out on their own after "hello"');

  // 4. something to talk about — still no cards
  await types('I keep starting things and not finishing them');
  await until('his answer', (s) => s.beat === 'reply', 40).catch(() => null);
  const f2 = await field('the field again', 90);
  log('talk 2', JSON.stringify(f2));
  await shot('talk2');
  if (f2.fan > 0 || f2.readings > 0) throw new Error('the cards came out without being asked for');

  // 5. and now: the cards. The one story card belongs here, not on a timer
  await types('can you read my cards');
  const card = await until('the story card or the shuffle', (s) => s.title || s.beat === 'shuffle' || s.fan > 0, 60);
  if (card.title) {
    await shot('story-card');
    log('the story card', JSON.stringify(card));
  } else log('NOTE: no story card at the cards');
  const sh = await until('the shuffle', (s) => s.beat === 'shuffle' || s.beat === 'fan' || s.fan > 0, 60);
  log('asked for the cards →', JSON.stringify(sh));
  if (sh.beat === 'shuffle') await shot('shuffle');
  const laid = await until('the fan laid', (s) => (s.beat === 'fan' && s.fan >= 21) || s.picks.length > 0, 90);
  log('fan', JSON.stringify(laid));
  await shot('fan');

  // 6. three picks: a click, a spoken ordinal, a click
  await until('the pick prompt', (s) => s.field, 40);
  let pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  await page.mouse.move(pos[6].x, pos[6].y, { steps: 5 });
  await page.waitForTimeout(300);
  await page.mouse.down();
  await page.mouse.up();
  log('pick 1', JSON.stringify(await until('pick 1', (s) => s.picks.length === 1, 25)));
  await until('the second prompt', (s) => s.field && s.picks.length === 1, 40);
  await types('the third from the left');
  log('pick 2', JSON.stringify(await until('pick 2', (s) => s.picks.length === 2, 25)));
  await until('the third prompt', (s) => s.field && s.picks.length === 2, 40);
  pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  const last = pos[pos.length - 1];
  await page.mouse.move(last.x, last.y, { steps: 5 });
  await page.waitForTimeout(300);
  await page.mouse.down();
  await page.mouse.up();
  log('pick 3', JSON.stringify(await until('pick 3', (s) => s.picks.length === 3, 25)));

  // 7. the readings
  for (let i = 0; i < 3; i++) {
    const ins = await until(`insert ${i}`, (s) => s.shot === `card${i}` || s.beat === 'talk' || s.shot === `card${i + 1}`, 120);
    if (ins.shot !== `card${i}`) {
      log(`card ${i}: the insert had passed (now ${ins.shot}/${ins.beat})`);
      continue;
    }
    await shot(`reading${i}`);
    log(`card ${i}`, JSON.stringify(ins));
    await until(`reading ${i} done`, (s) => s.shot !== `card${i}`, 90);
  }

  // 8. the conversation carries on, with the cards on the table
  const f3 = await field('the field after the reading', 120);
  log('back to the table talk', JSON.stringify(f3));
  await shot('after-reading');
  if (f3.readings !== 1) throw new Error(`readings should be 1, is ${f3.readings}`);
  await types('what does the middle one mean');
  const a3 = await until('his answer about the card', (s) => s.beat === 'reply', 40).catch(() => null);
  if (a3) await shot('followup');
  const f4 = await field('the field again after the follow-up', 90);
  log('still talking', JSON.stringify(f4));
  if (f4.intent !== 'talk') throw new Error(`"what does the middle one mean" was read as ${f4.intent}, not talk`);

  // the shot for the progress page: mid-conversation, his line and the visitor typing
  await page.keyboard.type('and the last one', { delay: 25 });
  await page.waitForTimeout(500);
  await shot('conversation');

  // 9. good night
  await page.keyboard.press('Backspace');
  for (let i = 0; i < 20; i++) await page.keyboard.press('Backspace');
  await types('thank you, goodbye');
  const bye = await until('the farewell', (s) => s.beat === 'farewell' || s.beat === 'closing', 60);
  log('farewell', JSON.stringify(bye));
  if (bye.beat === 'farewell') await shot('farewell');
  const end = await until('the sign-off card', (s) => s.beat === 'closing' && s.title, 60);
  log('closing', JSON.stringify(end));
  await shot('closing');

  const transcript = await page.evaluate(() => (window.__theatre.pieces.mind?.history ?? []).map((h) => `${h.role}: ${h.text}`));
  console.log('\nTRANSCRIPT\n' + (transcript.length ? transcript.map((l) => '  ' + l).join('\n') : '  (empty)'));
} catch (e) {
  errors.push(`TEST: ${e.message}`);
  await shot('FAILED').catch(() => {});
}

await browser.close();
if (warnings.length) console.log('warnings:\n' + warnings.map((w) => ' - ' + w).join('\n'));
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log(`ok in ${((Date.now() - t0) / 1000).toFixed(0)}s; shots in ${outDir} as ${prefix}-*.png`);
