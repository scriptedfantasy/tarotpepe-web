#!/usr/bin/env node
// tools/_flip-proof.mjs — THE READING, FLIPPED, END TO END.
//
// The user: "We have to be able to flip the reading so the user can pull a tarot for pepe." This
// drives the whole of it in a real browser against a dev server whose upstream is canned, so no key
// is needed and nothing here is guessed:
//
//   PEPE_FAKE=1 npx vite --host 127.0.0.1 --port 8722 --strictPort
//   node tools/_flip-proof.mjs [--port 8722] [--out /abs/dir]
//
// What it proves, in the order the evening does it:
//   0. the GATE, in the pure function the server decides with: `let_them_read` is not within his
//      reach on an ordinary line and is on "let me read for you" and on "your turn";
//   1. the offer in the visitor's own words, and the lever firing;
//   2. the wash, and three cards taken out of it BY CLICKING ON THEM, as a visitor does;
//   3. each card turned, its intertitle up, and the FIELD OPEN under it — his flip-ask line, or the
//      card's own name when nothing was written — with the beat and the body on the wire checked;
//   4. the visitor's typed reading going out as `flip-hear` with their words in it, and his answer
//      played on his own plate;
//   5. the close, and the conversation open again;
//   6. "show me the cards" still recalling three cards that are HIS (the wire says so);
//   7. the sheet the visitor takes away, built from the real reading: the exchange in it and the
//      head naming whose reading it was.
//
// Every POST to /api/pepe is read off the wire and the room's own note for it is rendered here with
// the server's `situation`, so the notes that actually went up are printed verbatim rather than
// described.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { situation, toolsFor } from '../server/pepe.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const port = +(args.port ?? 8722);
const outDir = args.out ?? path.join(here, '..', 'public', 'progress');
mkdirSync(outDir, { recursive: true });
const width = 1600, height = 900;
let bad = 0;
const fail = (m) => {
  bad++;
  console.log('  ✗ ' + m);
};
const ok = (m) => console.log('  ✓ ' + m);
const shots = [];

// ---- 0. THE GATE, before a browser is opened at all ---------------------------------------------
// The server is the authority on which levers a turn carries; this is the very function it decides
// with, asked directly. The client always proposes all three.
console.log('\nTHE LEVER IS OFFERED ONLY WHEN THEY OFFER');
const PROPOSED = ['deal_cards', 'show_cards', 'let_them_read'];
const levers = (user, spread = []) => toolsFor({ user, tools: PROPOSED, spread, history: [] });
for (const line of ['I keep starting things and not finishing them.', 'my grandmother used to read the cards after supper', 'all right, read my cards']) {
  const got = levers(line);
  if (got.includes('let_them_read')) fail(`"${line}" put let_them_read within reach`);
  else ok(`not offered: "${line}"  → ${got.join(', ') || 'nothing'}`);
}
for (const line of ['let me read for you', 'your turn', "I'll read your cards", 'can i pull a card for you']) {
  const got = levers(line);
  if (!got.includes('let_them_read')) fail(`"${line}" did NOT put let_them_read within reach (got ${got.join(', ') || 'nothing'})`);
  else ok(`offered: "${line}"  → ${got.join(', ')}`);
}

// ---- the browser ---------------------------------------------------------------------------------
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e?.stack ?? e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
// every turn that went out, as the server received it
const wire = [];
page.on('request', (r) => {
  if (r.method() !== 'POST' || !r.url().includes('/api/pepe')) return;
  try {
    wire.push(JSON.parse(r.postData() ?? '{}'));
  } catch {}
});
await page.route('**/@vite/client', (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  }),
);

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    return {
      provider: T.pieces.mind.provider,
      beat: T.pieces.flow.beat,
      intent: T.pieces.flow.intent,
      flips: T.pieces.flow.flips,
      readings: T.pieces.flow.readings,
      shot: T.pieces.camera.current,
      picks: T.pieces.reveal.picks?.filter(Boolean).length ?? 0,
      left: T.pieces.reveal.fanCount ?? 0,
      asking: !!T.pieces.dialogue.asking,
      flipped: !!T.pieces.mind.flipped,
      caption: (document.querySelector('#dialogue')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
    };
  });
const until = async (fn, ms, what) => {
  const t0 = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what} (beat=${s.beat} intent=${s.intent} shot=${s.shot} picks=${s.picks})`);
    await page.waitForTimeout(250);
  }
};
const field = '#dialogue input.keys';
async function type(text) {
  await page.waitForSelector(field, { timeout: 90000, state: 'attached' });
  await page.waitForTimeout(300);
  await page.fill(field, text);
  await page.keyboard.press('Enter');
  console.log(`     visitor: "${text}"`);
}
async function frame(name) {
  const p = path.join(outDir, name);
  await page.screenshot({ path: p });
  shots.push(p);
  return p;
}
// A card taken out of the wash the way a visitor takes one: a click on the card itself. The wash
// overlaps heavily, so the points are tried in turn until one of them lands on something.
async function clickOne(k) {
  const before = (await state()).picks;
  const pts = await page.evaluate(() => {
    const R = window.__theatre.pieces.reveal;
    const card = document.querySelector('#dialogue .cap');
    const box = card && !card.hidden ? card.getBoundingClientRect() : null;
    return (R.fanScreenPositions?.() ?? [])
      .filter((p) => !box || p.x < box.left - 8 || p.x > box.right + 8 || p.y < box.top - 8 || p.y > box.bottom + 8)
      .map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  });
  // from the middle of the mass outward: the middle is where the cards are deepest
  const order = pts.map((p, i) => [Math.abs(i - pts.length / 2), p]).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
  for (const p of order.slice(0, 12)) {
    await page.mouse.click(p.x, p.y);
    const t0 = Date.now();
    while (Date.now() - t0 < 3500) {
      if ((await state()).picks > before) return p;
      await page.waitForTimeout(200);
    }
  }
  throw new Error(`no click took card ${k + 1} out of the wash`);
}
const note = (b) => situation(b, []);

const READINGS = [
  'a frog with a stick over his shoulder, and nobody has told him where the road goes',
  'this is the one about the thing you built that fell over, and you already know which one',
  'you are being asked to sit still for once, which you will hate',
];

try {
  console.log('\nTHE EVENING');
  await page.goto(`http://127.0.0.1:${port}/?mute=1`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.waitForFunction("window.__theatre?.pieces?.entrance?.mode === 'closed'", null, { timeout: 120000 });
  await page.mouse.click(width / 2, height / 2);
  const first = await until((s) => s.asking, 120000, 'the first open field');
  console.log(`  provider: ${first.provider}`);
  if (first.provider === 'none') fail('the dev server on this port has no provider: start it with PEPE_FAKE=1');
  ok(`the greeting is said and the field is open (shot=${first.shot})`);

  // 1. an ordinary line: nothing moves, and no reading of anybody's begins
  await type('I keep starting things and not finishing them.');
  await page.waitForTimeout(3500);
  const talk = await until((s) => s.asking, 90000, 'the field again');
  if (talk.flips > 0 || talk.picks > 0) fail(`the room flipped at an ordinary line (intent=${talk.intent})`);
  else ok(`he talked and nothing moved (intent=${talk.intent}, flips=${talk.flips})`);

  // 2. the offer, in their own words
  await type('let me read for you');
  const fired = await until((s) => s.intent === 'flip' || s.beat === 'shuffle' || s.beat === 'fan', 90000, 'the lever');
  ok(`the lever fired: intent=${fired.intent}, beat=${fired.beat}, flips=${fired.flips}`);
  if (fired.intent !== 'flip') fail(`the intent came back as ${fired.intent}, not flip`);
  const washed = await until((s) => s.beat === 'fan' && s.left > 0, 120000, 'the wash');
  ok(`the deck is washed out over the cloth: ${washed.left} cards, shot=${washed.shot}`);
  if (!washed.flipped) fail('the mind does not know the cards are his (mind.flipped is false)');
  else ok('the cards are his from the wash on (mind.flipped)');
  await frame('flip-r1-wash.png');

  // 3. three cards, taken by clicking on them
  for (let k = 0; k < 3; k++) {
    const p = await clickOne(k);
    ok(`card ${k + 1} taken by a click at ${p.x},${p.y}`);
    await page.waitForTimeout(500);
  }
  await until((s) => s.picks === 3, 60000, 'three cards in the slots');

  // 4. each card: his ask, the open field, their reading, his answer
  for (let i = 0; i < 3; i++) {
    const asked = await until((s) => s.asking && s.beat === 'flip', 180000, `the field under card ${i + 1}`);
    ok(`card ${i + 1}: ${asked.shot} with the field open — «${asked.caption.slice(0, 90)}»`);
    if (!/^card\d$/.test(asked.shot)) fail(`the field opened at ${asked.shot}, not at the card's own insert`);
    if (i === 0) await frame('flip-r1-ask.png');
    await type(READINGS[i]);
    const answered = await until((s) => s.beat === 'reply' && s.shot === 'pepe', 120000, `his answer to card ${i + 1}`);
    if (i === 0) {
      await page.waitForTimeout(1200);
      await frame('flip-r1-answer.png');
    }
    ok(`card ${i + 1}: read to him, and he answered on ${answered.shot}`);
  }

  // 5. the close, and the conversation open again
  const closed = await until((s) => s.asking && s.beat !== 'flip', 180000, 'the close and the open field');
  ok(`the evening is handed back: beat=${closed.beat}, shot=${closed.shot} — «${closed.caption.slice(0, 90)}»`);
  await frame('flip-r1-close.png');

  // 6. the cards are still his, and can still be looked at
  await type('show me the cards');
  const recalled = await until((s) => s.beat === 'recall' || s.shot === 'spread' || /^card\d$/.test(s.shot), 120000, 'the recall');
  ok(`the three are shown again (beat=${recalled.beat}, shot=${recalled.shot})`);
  await frame('flip-r1-recall.png');
  await until((s) => s.asking, 180000, 'the field after the recall');

  // ---- what actually went out on the wire ------------------------------------------------------
  console.log('\nON THE WIRE');
  const beats = wire.map((b) => b.beat);
  console.log(`  beats: ${beats.join(' · ')}`);
  const asks = wire.filter((b) => b.beat === 'flip-ask');
  const hears = wire.filter((b) => b.beat === 'flip-hear');
  const close = wire.find((b) => b.beat === 'flip-close');
  if (asks.length !== 3) fail(`${asks.length} flip-ask turns, not three`);
  else ok('three flip-ask turns, one for each card: ' + asks.map((b) => b.cardName).join(', '));
  if (hears.length !== 3) fail(`${hears.length} flip-hear turns, not three`);
  else {
    const wrong = hears.filter((b, i) => String(b.user ?? '') !== READINGS[i]);
    if (wrong.length) fail(`${wrong.length} flip-hear turns did not carry the visitor's own words`);
    else ok("all three flip-hear turns carry the visitor's reading, verbatim");
  }
  if (!close) fail('no flip-close turn went out');
  else ok('the close went out');
  const notFlagged = wire.filter((b) => /^flip-/.test(String(b.beat)) && !b.flipped);
  if (notFlagged.length) fail(`${notFlagged.length} flip turns went out without the flipped flag`);
  else ok('every flip turn told the room whose cards these are');
  const recall = [...wire].reverse().find((b) => b.beat === 'recall' || (b.beat === 'talk' && (b.dealt ?? 0) > 0));
  if (recall && !recall.flipped) fail('the turn after the reading forgot the cards were his');
  else if (recall) ok(`the talk after it still says so (beat=${recall.beat})`);

  console.log("\nTHE ROOM'S OWN NOTES, as the server built them");
  for (const b of [asks[0], hears[0], close, recall].filter(Boolean)) console.log(`\n  [${b.beat}]\n  ${note(b)}`);

  // ---- 7. the sheet ----------------------------------------------------------------------------
  console.log('\nTHE SHEET THE VISITOR TAKES AWAY');
  const sheet = await page.evaluate(async () => {
    const T = window.__theatre;
    const K = T.pieces.help.keep;
    const r = K.readingNow(T);
    const pages = await K.renderPages(r, { scale: 2 });
    return {
      flipped: r.flipped,
      cards: r.cards.map((c) => c.name),
      turns: r.transcript.length,
      text: r.transcript.map((t) => `${t.role}: ${t.text}`),
      pages: pages.length,
      png: pages.map((c) => c.toDataURL('image/png')),
    };
  });
  if (!sheet.flipped) fail('the sheet does not know it was his reading');
  else ok('the sheet knows whose reading it was: HIS READING stands under the name');
  if (sheet.cards.length !== 3) fail(`${sheet.cards.length} cards on the sheet, not three`);
  else ok(`the cards on it: ${sheet.cards.join(', ')}`);
  const carried = READINGS.filter((r) => sheet.text.some((t) => t.includes(r)));
  if (carried.length !== 3) fail(`${carried.length} of the visitor's three readings are in the transcript`);
  else ok(`the exchange is on it: ${sheet.turns} turns, all three of the visitor's readings among them`);
  sheet.png.forEach((data, i) => {
    const p = path.join(outDir, `flip-r1-sheet${i ? `-${i + 1}` : ''}.png`);
    writeFileSync(p, Buffer.from(data.split(',')[1], 'base64'));
    shots.push(p);
  });
  console.log(`  ${sheet.pages} page(s), all written`);
} catch (e) {
  fail(String(e?.message ?? e));
}

if (errors.length) {
  bad += errors.length;
  console.log('\nPAGE ERRORS');
  for (const e of errors.slice(0, 6)) console.log('  ' + e.split('\n')[0]);
}
await browser.close();
console.log('\nFRAMES');
for (const s of shots) console.log('  ' + s);
console.log(`\n${bad ? `${bad} WRONG` : 'the visitor read his cards to him, and the room remembered whose they were'}`);
process.exit(bad ? 1 : 0);
