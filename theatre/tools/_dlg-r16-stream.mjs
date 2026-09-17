#!/usr/bin/env node
// ROUND 16 — A CARD THE VISITOR HAS NOT TURNED STANDS THERE WHILE THE REST OF HIS REPLY ARRIVES.
//
// The user, on the live site, after round 14 had closed every path it could see: "pepe's text still
// switches from one full text box to the next without the user having to click — full text boxes
// should not auto change, not all users have the same reading speed."
//
// Round 14's proofs all drove the card through `D.say()`, or through a canned upstream that handed
// its whole paragraph over in one breath. Neither is the evening: a real turn of his arrives over
// five or ten seconds, and the placard is given its first sentence while the fourth is still being
// written. So this tool drives the WIRE — a six-sentence reply streamed a word and a half at a time
// through the real route, the real parser and the real flow — with a real mouse and nothing else,
// and it reads the card's own logbook (`window.__dlg`, dialogue.js) to name the cause of every
// change of what is in the well.
//
// What it answers:
//
//   1  THE CARD STANDS. The first card he fills stands untouched for twenty seconds — the same
//      words, the mark up, no field under it, nothing behind it — while the rest of the reply is
//      still coming down the wire. The wire's own close is timed against the moment the mark came
//      up, so "the rest arrived behind it" is a measurement and not a hope — which is what PEPE_PACE
//      is for: at sixty milliseconds a word and a half, his paragraph outlasts a headless room's
//      typing, and the stream is still open while the visitor sits in front of the first card;
//   2  A CLICK TURNS IT, one card to the click, and the logbook says the visitor's hand did it;
//   3  NOTHING ELSE TURNS IT. Every change of the well over the whole turn is scored against the
//      gesture in front of it, and a card of a CUT line that changed with no hand on it is a
//      failure. Short single-take cards are left to their clock, which is the rule the user kept;
//   4  THE FIELD IS LAST. The caret does not come up until the last take of his last sentence has
//      been turned;
//   5  NO SCRAPS. A take of a cut line is worth the card it stands on — no two-word cards, which is
//      what round 14's refill left behind and what made the fault visible: a click bought a word and
//      a half nobody could read, and then the clock handed the next four-line card up unasked;
//   6  and all of it again at 390x844, where a phone's card fills on half a sentence.
//
// The frames go to /tmp/dlg-stream/.
//
//   PEPE_FAKE=1 PEPE_PACE=60 npx vite --host 127.0.0.1 --port 8740 --strictPort
//   BASE=http://127.0.0.1:8740 node tools/_dlg-r16-stream.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/dlg-stream';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? 'http://127.0.0.1:8740';
// How long the first full card is left alone. The old build's stopwatch was six seconds and the
// hold at the end of a line about 1.2, so twenty is that build turning the card three times over.
const DWELL = +(process.env.DWELL ?? 20);

const NO_HMR =
  'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});' +
  'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

// The words that ask the canned upstream for its six-sentence paragraph (server/pepe.mjs, FAKES.long
// — asked for in the visitor's own sentence so that the greeting before it can still be short
// enough to open the field). Everything after that is the room's own business.
const ASK = 'I keep starting projects and never finishing them. Answer me at length.';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});

const errs = [];
const log = [];
const fails = [];
const check = (ok, line) => {
  log.push(`${ok ? 'PASS' : 'FAIL'}  ${line}`);
  if (!ok) fails.push(line);
  return ok;
};

// What is in the well right now, measured the way the card measures it: the canvas a take is struck
// on is exactly as tall as the lines it occupies plus the pen's bleed, so `rows` is the placard's
// own answer to "is this card full" and never a character count.
const card = (page) =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    if (!cap || cap.hidden) return { hidden: true, well: '', rows: 0, arrow: false, caret: false };
    const r = cap.getBoundingClientRect();
    const em = +getComputedStyle(cap).fontSize.replace('px', '');
    const lead = em * 1.25, bleed = Math.ceil(em * 0.72 * 0.5);
    const can = document.querySelector('#dialogue .well canvas');
    const rows = can && can.width ? Math.max(1, Math.round((can.getBoundingClientRect().height - 2 * bleed) / lead)) : 0;
    const a = cap.querySelector('.next');
    const box = a && !a.hidden ? a.getBoundingClientRect() : null;
    return {
      hidden: false,
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      well: (cap.querySelector('.well .sr')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      rows,
      arrow: !!box,
      arrowAt: box ? { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) } : null,
      caret: !!cap.querySelector('.caret'),
      field: !!document.querySelector('#dialogue input.keys'),
    };
  });

const shot = async (page, name, pad = 26) => {
  const c = await card(page);
  const vp = page.viewportSize();
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    clip: c.hidden
      ? undefined
      : {
          x: Math.max(0, c.x - pad), y: Math.max(0, c.y - pad),
          width: Math.min(vp.width, c.w + 2 * pad),
          height: Math.min(vp.height - Math.max(0, c.y - pad), c.h + 2 * pad),
        },
  });
  return c;
};

// The card's logbook, which is the whole of this round's evidence: every event that changed what is
// in the well and who asked for it. A change is the VISITOR's when the gesture that reached skip()
// is in front of it — `card-tap` (a click anywhere on the waiting card, the mark included) or
// `arrow-key` (Return or Space on the mark with a keyboard). A change with no gesture in front of it
// came off a clock, and for a cut line that is the fault.
const HAND = new Set(['card-tap', 'arrow-key']);
const logbook = (page) => page.evaluate(() => (window.__dlg ?? []).slice());
function clockTurns(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.what !== 'nextTake' && r.what !== 'show') continue;
    const byHand = HAND.has(String(r.why).replace(/^(skip|finish):/, '')) || rows.slice(Math.max(0, i - 3), i).some((b) => b.what === 'skip' && HAND.has(b.why));
    // a `show` is a fresh sentence: it is only a fault if the card it replaced was one of his cut
    // ones standing with the mark up, which the gate makes impossible and `say-over-gate` records
    if (!byHand && r.what === 'nextTake') out.push(r);
  }
  return out;
}

async function pass(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (e) => errs.push(`${label} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`${label} ${m.text()}`));
  // THE WIRE, TIMED. One POST per turn of his; the reply is a stream, so `requestfinished` is the
  // moment the last word of the paragraph reached the page.
  const wire = [];
  page.on('request', (r) => r.url().includes('/api/pepe') && r.method() === 'POST' && wire.push({ at: Date.now(), done: 0 }));
  page.on('requestfinished', (r) => {
    if (!r.url().includes('/api/pepe') || r.method() !== 'POST') return;
    const w = wire[wire.length - 1];
    if (w && !w.done) w.done = Date.now();
  });
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: NO_HMR }));
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
  await page.waitForTimeout(700);

  // into the room, and wait at the visitor's own field: the greeting is three short sentences and
  // takes itself off on its own clock, which is the behaviour this round deliberately leaves alone.
  await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
  const atField = await (async () => {
    for (let i = 0; i < 500; i++) {
      const c = await card(page);
      if (c.field) return true;
      await page.waitForTimeout(200);
    }
    return false;
  })();
  check(atField, `${label} the greeting plays on its own clock and the visitor's field opens under it`);
  await page.evaluate(() => (window.__dlg = []));
  wire.length = 0;

  // ---- the turn ----------------------------------------------------------------------------------
  await page.keyboard.type(ASK, { delay: 3 });
  await page.keyboard.press('Enter');
  const asked = Date.now();

  // the first card he FILLS, with the mark up on it — and the moment his words went onto it, which
  // is when the visitor started reading and the only moment "behind the card" can be measured from
  let first = null, wordsAt = 0;
  for (let i = 0; i < 400; i++) {
    const c = await card(page);
    if (!wordsAt && c.well) wordsAt = Date.now();
    if (c.rows >= 4 && c.arrow) {
      first = c;
      break;
    }
    await page.waitForTimeout(150);
  }
  if (!check(!!first, `${label} his reply fills a card and the mark comes up on it`)) {
    await context.close();
    return null;
  }
  const upAt = Date.now();
  await shot(page, `${label}-1-full-mark`);

  // ---- 1. IT STANDS, and the rest of the reply arrives behind it ---------------------------------
  const seen = new Set();
  for (let i = 0; i < Math.round((DWELL * 1000) / 250); i++) {
    const c = await card(page);
    seen.add(`${c.well}|${c.rows}|${c.arrow}|${c.caret}`);
    await page.waitForTimeout(250);
  }
  const stood = (Date.now() - upAt) / 1000;
  const held = await card(page);
  check(seen.size === 1, `${label} the card does not change for ${stood.toFixed(1)} s (${seen.size} state of the well, and one is right)`);
  check(
    held.well === first.well && held.rows >= 4 && held.arrow && !held.caret && !held.field,
    `${label} the same words stand with the mark up, no caret and no field after ${stood.toFixed(1)} s`,
  );
  const mid = await logbook(page);
  const standing = mid.filter((r) => r.t !== undefined && (r.what === 'nextTake' || r.what === 'show')).length;
  const w = wire[wire.length - 1];
  const wireS = w?.done ? (w.done - w.at) / 1000 : null;
  const behind = !!w?.done && w.done > upAt;
  check(
    wireS != null && wireS > 3,
    `${label} his reply is STREAMED, not handed over whole: the wire ran ${wireS == null ? 'and had not closed' : wireS.toFixed(1) + ' s'} (set PEPE_PACE if this fails)`,
  );
  check(
    behind,
    `${label} the rest of it arrived BEHIND the standing card: the wire was still open when the mark came up and closed ` +
      `${w?.done ? ((w.done - upAt) / 1000).toFixed(1) : '—'} s into the dwell, ${w?.done ? ((w.done - wordsAt) / 1000).toFixed(1) : '—'} s after his words went up`,
  );
  check(!mid.some((r) => r.what === 'say-over-gate'), `${label} nothing was said over the card while it stood (say-over-gate: none)`);

  // ---- 2. A CLICK TURNS IT ------------------------------------------------------------------------
  const before = held.well;
  await page.mouse.click(held.arrowAt.x, held.arrowAt.y);
  await page.waitForFunction((p) => (document.querySelector('#dialogue .well .sr')?.textContent ?? '').replace(/\s+/g, ' ').trim() !== p, before, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const turned = await card(page);
  check(turned.well !== before && !turned.hidden, `${label} a click on the mark turns it, and only then`);
  const after = await logbook(page);
  const turns = after.slice(mid.length).filter((r) => r.what === 'nextTake' || r.what === 'show');
  check(turns.length === 1 && turns[0].what === 'nextTake', `${label} one click is one card (${turns.length} change of the well, by ${turns.map((r) => r.why).join(', ')})`);
  await shot(page, `${label}-2-turned`);

  // ---- 3 & 4. the rest of the turn, clicking the mark and nothing else ---------------------------
  // The visitor reads at their own pace: every mark is left standing a beat before it is clicked, so
  // any card that turns on its own turns while the tool is watching and not while it is clicking.
  let clicks = 1, caretAt = null, guard = 0;
  while (guard++ < 200) {
    const c = await card(page);
    if (c.field || c.caret) {
      caretAt = c;
      break;
    }
    if (c.arrow && c.arrowAt) {
      await page.waitForTimeout(1200);
      const still = await card(page);
      if (!still.arrow || !still.arrowAt) continue;
      clicks++;
      await page.mouse.click(still.arrowAt.x, still.arrowAt.y);
      await page.waitForTimeout(500);
      continue;
    }
    await page.waitForTimeout(250);
  }
  const rows = await logbook(page);
  const auto = clockTurns(rows);
  check(auto.length === 0, `${label} no card of a cut line turned without a hand on it (${auto.length} clock turn${auto.length === 1 ? '' : 's'}${auto.length ? ': ' + auto.map((r) => `${r.what}<-${r.why}`).join(', ') : ''})`);
  // AND NO CUT LINE WAS ENDED BY THE CLOCK, which is the round's claim stated the other way round
  // and the one row the old build would have left in the logbook: `finish <- hold` on a line of more
  // than one take is the settle that let the next sentence up over the reading.
  const byClock = rows.filter((r) => r.what === 'finish' && r.why === 'hold' && r.of > 1);
  check(byClock.length === 0, `${label} no cut line was ended by the clock (finish<-hold on a line of ${byClock.length ? byClock.map((r) => `${r.of} takes`).join(', ') : 'more than one take'}: ${byClock.length})`);
  check(!rows.some((r) => r.what === 'say-over-gate'), `${label} and nothing was ever said over a standing gate`);
  check(!!caretAt, `${label} the turn ends with the visitor's field open again (after ${clicks} clicks of theirs)`);
  // THE FIELD IS LAST: the caret comes up after the final take was turned, never beside a mark.
  const lastTurn = [...rows].reverse().find((r) => r.what === 'nextTake' || r.what === 'show');
  const opened = rows.filter((r) => r.what === 'clearWell' || r.what === 'closeField');
  check(caretAt ? !caretAt.arrow : false, `${label} the field is open with no mark beside it — the last take was turned first`);
  await shot(page, `${label}-3-field`);

  // ---- 5. NO SCRAPS ------------------------------------------------------------------------------
  // Every take set on the card this turn, and how many words it was given. A take of a line that was
  // cut is worth the card it stands on; round 14 left two-word tails, which is the card that made
  // the fault visible.
  // The logbook's order inside one sentence is: `show`, the first `setTake`, `say` (which is where
  // the take count is written down), then a `nextTake`/`setTake` pair per card the visitor turns. So
  // a take belongs to the line whose `show` precedes it, and that line's count is on the `say` after
  // that show — reading it off the last `say` seen would hand sentence N+1's first take to sentence
  // N's count, which is how a one-take line came to be counted as a scrap.
  const takes = rows.filter((r) => r.what === 'setTake');
  const cutTakes = [];
  let live = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.what === 'show') live = rows.slice(i + 1).find((x) => x.what === 'say')?.takes ?? 0;
    if (r.what === 'setTake' && live > 1) cutTakes.push(r.words);
  }
  const scraps = cutTakes.filter((n) => n < 3);
  check(scraps.length === 0, `${label} no take of a cut line is a scrap (smallest of ${cutTakes.length}: ${cutTakes.length ? Math.min(...cutTakes) : '—'} words; scraps: ${scraps.length})`);

  const sums = {
    label, viewport,
    firstCard: { w: first.w, h: first.h, rows: first.rows },
    stood: +stood.toFixed(1),
    wireS,
    typedS: +((upAt - wordsAt) / 1000).toFixed(1),
    behindS: w?.done ? +((w.done - upAt) / 1000).toFixed(1) : null,
    standingChanges: standing,
    clicks,
    takes: takes.length,
    cutTakes,
  };
  await context.close();
  return sums;
}

const laptop = { width: 1280, height: 800 }, phone = { width: 390, height: 844 };
const L = await pass('laptop', laptop);
const P = await pass('phone', phone);

console.log('=== the turn, as it arrived ===');
for (const s of [L, P].filter(Boolean)) {
  console.log(
    `${s.label} ${s.viewport.width}x${s.viewport.height}  card ${s.firstCard.w}x${s.firstCard.h} px, ${s.firstCard.rows} lines` +
      `   stood ${s.stood} s with ${s.standingChanges} change(s) of the well` +
      `   wire ${s.wireS == null ? 'open' : s.wireS + ' s'}, closed ${s.behindS} s into the dwell (his words typed for ${s.typedS} s before the mark)` +
      `   ${s.clicks} clicks, ${s.takes} takes (cut-line takes: ${s.cutTakes.join(', ')} words)`,
  );
}

console.log('\n=== what was watched ===');
for (const l of log) console.log(' ', l);

await browser.close();
console.log('');
console.log(errs.length ? `PAGE ERRORS\n  ${errs.join('\n  ')}` : 'no page errors');
console.log(`frames in ${OUT}`);
console.log(fails.length ? `FAIL — ${fails.length} of ${log.length}` : `PASS — ${log.length} checks, and a streamed reply never turned a card the visitor had not`);
process.exit(fails.length || errs.length ? 1 : 0);
