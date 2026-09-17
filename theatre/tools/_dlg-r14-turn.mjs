#!/usr/bin/env node
// ROUND 14 — A FULL CARD IS TURNED BY THE VISITOR AND BY NOTHING ELSE.
//
// The user, watching a four-line card go past while they were still in the second line of it: "make
// sure the text never auto switches to the next chatbox when its full. display an arrow, the user
// has to click to switch a full chatbox."
//
// This drives the card for real — say(), ask(), and a MOUSE, never skip() where a click will do —
// and answers the only question the round asks: does a card he filled ever turn without a hand on
// it? The clock is running the whole time; nothing here is frozen or stubbed.
//
//   1  a reply cut into three takes, the first two of them four lines deep:
//        · the mark comes up when the last word lands, and the card is STILL the same take
//          fifteen seconds later — TAKE_WAIT was 6, so the old build had turned it twice over;
//        · a click on the card turns it, and only then;
//        · take two, the same: fifteen seconds standing, then a click on the mark itself;
//        · take three, ROUND 16, and this is the line of this tool that the user's second report
//          turned round: it used to end the line on the CLOCK because it was short of the fourth
//          line, and settling it settled `say` and let flow play the next four-line card straight
//          over the reading. The last take of a cut line waits like the rest of it now, and their
//          third click is what ends the line and opens the field;
//   2  a short reply, one take, no mark: said, held and resolved on the clock, hands off;
//   3  a take that FILLS the card with nothing behind it: the mark is up, the line does not
//      resolve, and the field opens on the cleared card only after the visitor has turned it;
//   4  all of it again at 390x844, where a phone's card fills on far less of his sentence.
//
// The frames the round is judged on go to /tmp/dlg-turn/ (a full card with the mark, both windows).
//
//   BASE=http://127.0.0.1:8740 node tools/_dlg-r14-turn.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/dlg-turn';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? 'http://127.0.0.1:8740';
// How long a card the visitor is owed is watched. The stopwatch round 16 deleted was 6 s and the
// hold at the end of a line is ~1.2, so fifteen seconds is the old build turning it twice over.
const DWELL = +(process.env.DWELL ?? 15);

const NO_HMR =
  'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});' +
  'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

// A paragraph of his, long enough that a laptop's card takes three bites of it and a phone rather
// more. The tool cuts it down to the length that gives EXACTLY three takes at the window it is
// driving, so the same round is proved on both windows with the same words.
const LONG =
  'You keep treating the first step as evidence that you must already know the whole route, and meanwhile the dog has spotted the edge of the table while you are busy inspecting the stick you brought in from the garden. ' +
  'A person who keeps starting things is not lazy; he is somebody who enjoys the first hour and has no use for the fourth, and the shed at the end of your garden has four unfinished jobs in it that were every one of them a good idea in June. ' +
  'I am not going to tell you to finish them, because you would not, and then you would have lied to a frog, which is worse for you than it is for me. ' +
  'Pick one of the four, the smallest one, and put it on the kitchen table where it is in the way of dinner, and leave it there until somebody complains about it twice.';
const SHORT = 'The deck is face down and it can stay that way as long as you like.';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});

const errs = [];
async function open(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errs.push(`${viewport.width}x${viewport.height} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`${viewport.width}x${viewport.height} ${m.text()}`));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: NO_HMR }));
  await page.goto(`${BASE}/?view=dialogue&state=greeting`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
  await page.waitForTimeout(900);
  return { context, page };
}

// What the card is right now, measured off the live card. `rows` is counted the way the card counts
// it — the canvas the take was struck on is exactly as tall as the lines it occupies, plus the
// pen's bleed above and below — so "full" here is the placard's own answer and not a character
// count. `take` is the screen reader's copy of the words, which is the same string that was set.
const card = (page) =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    if (!cap || cap.hidden) return null;
    const r = cap.getBoundingClientRect();
    const em = +getComputedStyle(cap).fontSize.replace('px', '');
    const lead = em * 1.25, bleed = Math.ceil(em * 0.72 * 0.5);
    const rows = (sel) => {
      const can = document.querySelector(sel);
      if (!can || !can.width) return 0;
      const g = can.getContext('2d');
      const d = g.getImageData(0, 0, can.width, can.height).data;
      let any = false;
      for (let i = 3; i < d.length; i += 4)
        if (d[i] > 40) {
          any = true;
          break;
        }
      if (!any) return 0;
      return Math.max(1, Math.round((can.getBoundingClientRect().height - 2 * bleed) / lead));
    };
    const arrow = cap.querySelector('.next');
    const box = arrow && !arrow.hidden ? arrow.getBoundingClientRect() : null;
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      take: (cap.querySelector('.well .sr')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      rows: rows('#dialogue .well canvas'),
      replyRows: rows('#dialogue .reply canvas'),
      arrow: !!box,
      arrowAt: box ? { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) } : null,
      caret: !!cap.querySelector('.caret'),
      caretTop: cap.querySelector('.caret') ? Math.round(cap.querySelector('.caret').getBoundingClientRect().top - r.top) : null,
      asking: cap.classList.contains('asking'),
    };
  });

const shot = async (page, name, pad = 26) => {
  const c = await card(page);
  const vp = page.viewportSize();
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    clip: c
      ? {
          x: Math.max(0, c.x - pad), y: Math.max(0, c.y - pad),
          width: Math.min(vp.width, c.w + 2 * pad),
          height: Math.min(vp.height - Math.max(0, c.y - pad), c.h + 2 * pad),
        }
      : undefined,
  });
  return c;
};

const wait = async (page, test, ms = 80, n = 400) => {
  for (let i = 0; i < n; i++) {
    if (await page.evaluate(test)) return true;
    await page.waitForTimeout(ms);
  }
  return false;
};
const arrowUp = () => !!document.querySelector('#dialogue .next:not([hidden])');

// THE PREFIX OF HIS PARAGRAPH THAT THIS WINDOW CUTS INTO EXACTLY THREE TAKES. The card's own
// splitTakes decides where the cuts fall, so the tool asks it rather than guessing: the line is said
// and the number of takes comes back on `dialogue:say`. The SHORTEST prefix that makes three takes
// is the one taken, which leaves the first two full and the third a scrap — the case the round needs
// (two gates, then a short last take the clock may still finish).
async function threeTakes(page, text) {
  return page.evaluate(async (t) => {
    const D = window.__theatre.pieces.dialogue;
    const words = t.split(' ');
    const takesOf = async (s) => {
      let n = 0;
      const off = (d) => (n = d.takes);
      window.__theatre.on('dialogue:say', off);
      D.clear();
      D.say(s, { hold: 0.1 });
      await new Promise((r) => setTimeout(r, 15));
      return n;
    };
    let lo = 8, hi = words.length;
    // the first n whose line takes three cards; the count only ever grows with n, so it bisects
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const n = await takesOf(words.slice(0, mid).join(' '));
      if (n >= 3) hi = mid;
      else lo = mid + 1;
    }
    D.clear();
    const out = words.slice(0, Math.min(words.length, lo + 1)).join(' ').replace(/[,;:]$/, '') + '.';
    return { text: out, takes: await takesOf(out) };
  }, text);
}

const log = [];
const fails = [];
const check = (ok, line) => {
  log.push(`${ok ? 'PASS' : 'FAIL'}  ${line}`);
  if (!ok) fails.push(line);
  return ok;
};

async function pass(label, viewport) {
  const { context, page } = await open(viewport);
  const three = await threeTakes(page, LONG);

  // ---- 1. three takes, the first two of them full ------------------------------------------------
  // Said exactly as flow says it, with the field asked for on the end of it, as `ask` does with a
  // prompt it has already spoken.
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    window.__done = null;
    window.__t0 = performance.now();
    D.say(t, { hold: 1.2 }).then(() => {
      window.__done = performance.now() - window.__t0;
      D.ask('', {});
    });
  }, three.text);

  await wait(page, arrowUp);
  const a = await shot(page, `${label}-1-take1`);
  const took = [];
  for (const [k, c] of [[1, a]]) took.push([k, c]);

  // ... and now nothing happens, for as long as the visitor takes.
  const t0 = Date.now();
  await page.waitForTimeout(DWELL * 1000);
  const held1 = await card(page);
  const dwell1 = (Date.now() - t0) / 1000;
  check(
    held1 && held1.take === a.take && held1.arrow && !held1.caret,
    `${label} take 1 stands ${dwell1.toFixed(1)} s with the mark up and the same words on it (rows ${a.rows}; the old stopwatch was 6 s)`,
  );
  check(a.rows === 4, `${label} take 1 fills the card (${a.rows} of 4 lines)`);
  check((await page.evaluate(() => window.__done)) === null, `${label} the line has not resolved while take 1 waits`);

  // A CLICK ON THE CARD, anywhere on it: the whole placard is the target while it waits.
  await page.mouse.click(held1.x + Math.round(held1.w / 2), held1.y + Math.round(held1.h * 0.35));
  await page
    .waitForFunction((prev) => (document.querySelector('#dialogue .well .sr')?.textContent ?? '').trim() !== prev, a.take, { timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  await wait(page, arrowUp);
  const b = await card(page);
  check(b.take !== a.take, `${label} a click on the card turns take 1 → take 2`);
  check(b.rows === 4, `${label} take 2 fills the card (${b.rows} of 4 lines)`);
  took.push([2, b]);

  const t1 = Date.now();
  await page.waitForTimeout(DWELL * 1000);
  const held2 = await card(page);
  check(
    held2.take === b.take && held2.arrow,
    `${label} take 2 stands ${((Date.now() - t1) / 1000).toFixed(1)} s with the mark up and the same words on it`,
  );

  // ... and this one is turned by the MARK itself, which is the gesture the user asked for.
  await page.mouse.click(held2.arrowAt.x, held2.arrowAt.y);
  await page
    .waitForFunction((prev) => (document.querySelector('#dialogue .well .sr')?.textContent ?? '').trim() !== prev, b.take, { timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(500);
  const c = await card(page);
  check(c.take !== b.take && c.rows > 0, `${label} a click on the mark turns take 2 → take 3 (${c.rows} of 4 lines)`);

  // ROUND 16 TURNED THIS CLAIM ROUND, and it is the fault the user came back with. It used to read:
  // "the short last take ends the line on the clock", and the field opened under his words with no
  // click at all — which is exactly what handed the next four-line card up unasked, since settling
  // the line settles `say` and flow plays the next sentence off that promise. So the LAST take of a
  // line that had to be cut waits for the visitor like every other take of it: the mark is up on it,
  // nothing resolves, and their third click is what ends the line and opens the field.
  const t3 = Date.now();
  await page.waitForTimeout(DWELL * 1000);
  const held3 = await card(page);
  check(
    held3.take === c.take && held3.arrow && !held3.caret && (await page.evaluate(() => window.__done)) === null,
    `${label} the short LAST take of a cut line stands ${((Date.now() - t3) / 1000).toFixed(1)} s with the mark up, unresolved and with no field under it (round 16)`,
  );
  await page.mouse.click(held3.arrowAt.x, held3.arrowAt.y);
  const turned = await wait(page, () => window.__done !== null, 120, 100);
  await page.waitForTimeout(500);
  const d = await card(page);
  check(turned, `${label} their third click ends the line, and nothing else did`);
  check(d.caret && d.caretTop != null, `${label} the field opens on the line under his words (caret at ${d.caretTop} px of the card)`);
  await shot(page, `${label}-2-take3-field`);
  took.push([3, c]);

  // ---- 2. a short reply behaves as it always did --------------------------------------------------
  const shortMs = await page.evaluate(async (t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    const t0 = performance.now();
    await D.say(t, { hold: 1.2 });
    return performance.now() - t0;
  }, SHORT);
  const s = await card(page);
  check(
    shortMs < 12000 && !s.arrow,
    `${label} a short reply is said, held and resolved on the clock in ${(shortMs / 1000).toFixed(2)} s, with no mark and no hand`,
  );

  // ---- 3. a take that FILLS the card with nothing behind it ---------------------------------------
  // The card the user was actually looking at: four lines, the end of his sentence, and the field
  // owed to them. It may not open until they have turned past it.
  const filled = await page.evaluate(async (t) => {
    const D = window.__theatre.pieces.dialogue;
    const em = +getComputedStyle(document.querySelector('#dialogue .cap')).fontSize.replace('px', '');
    const words = t.split(' ');
    const rows = () => {
      const can = document.querySelector('#dialogue .well canvas');
      if (!can) return 0;
      return Math.max(1, Math.round((can.getBoundingClientRect().height - 2 * Math.ceil(em * 0.72 * 0.5)) / (em * 1.25)));
    };
    for (let n = words.length; n > 4; n--) {
      const text = words.slice(0, n).join(' ').replace(/[,;:]$/, '') + '.';
      let takes = 0;
      const off = (d) => (takes = d.takes);
      window.__theatre.on('dialogue:say', off);
      D.clear();
      D.say(text, { hold: 0.1 });
      D.skip();
      D.skip();
      await new Promise((r) => setTimeout(r, 20));
      if (takes === 1 && rows() >= 4) return text;
    }
    return null;
  }, three.text);
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    window.__done2 = null;
    D.say(t, { hold: 1.2 }).then(() => {
      window.__done2 = true;
      D.ask('', {});
    });
  }, filled ?? three.text);
  await wait(page, arrowUp);
  const f = await shot(page, `${label}-3-full-arrow`);
  const t2 = Date.now();
  await page.waitForTimeout(DWELL * 1000);
  const heldF = await card(page);
  check(
    f.rows === 4 && heldF.take === f.take && heldF.arrow && !heldF.caret && !(await page.evaluate(() => window.__done2)),
    `${label} a full LAST take stands ${((Date.now() - t2) / 1000).toFixed(1)} s with the mark up, unresolved, and no field under it`,
  );
  await page.mouse.click(heldF.x + Math.round(heldF.w / 2), heldF.y + Math.round(heldF.h * 0.35));
  const opened = await wait(page, () => !!document.querySelector('#dialogue .caret'), 80, 120);
  await page.waitForTimeout(400);
  const g = await shot(page, `${label}-4-cleared-field`);
  check(opened && !g.take, `${label} their field opens on the cleared card after they turn past it (his words: ${g.take ? 'still there' : 'off the paper'})`);

  await context.close();
  return { three, took, filled: f };
}

const laptop = { width: 1280, height: 800 }, phone = { width: 390, height: 844 };
const L = await pass('laptop', laptop);
const P = await pass('phone', phone);

console.log('=== the takes this window cuts his paragraph into ===');
for (const [label, vp, r] of [['laptop', laptop, L], ['phone', phone, P]]) {
  console.log(`${label} ${vp.width}x${vp.height}  ${r.three.takes} takes of ${r.three.text.length} characters   ` + r.took.map(([k, c]) => `take ${k}: ${c.rows} line(s)`).join(', '));
  console.log(`  a full last take, with the mark: card ${r.filled.w} x ${r.filled.h} px, ${r.filled.rows} lines, mark at ${r.filled.arrowAt?.x},${r.filled.arrowAt?.y}`);
}

console.log('\n=== what was watched ===');
for (const l of log) console.log(' ', l);

await browser.close();
console.log('');
console.log(errs.length ? `PAGE ERRORS\n  ${errs.join('\n  ')}` : 'no page errors');
console.log(`frames in ${OUT}`);
console.log(fails.length ? `FAIL — ${fails.length} of ${log.length}` : `PASS — ${log.length} checks, and a full card never turned on its own`);
process.exit(fails.length || errs.length ? 1 : 0);
