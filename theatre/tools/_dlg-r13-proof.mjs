#!/usr/bin/env node
// ROUND 13 — THE CARD IS FOUR LINES, AND HIS TAKES FILL IT. The proof frames, and the count that
// says the round was worth doing.
//
// The user, looking at his phone at a card carrying two lines of his and two lines of nothing: "I
// think Pepe should use all four lines in the chat box to speak because with only two lines the
// user has to click too often. The user's cursor can pop up on an empty chatbox after pepe spoke if
// the chatbox is full. if it isn't full the user can type into the line below pepe."
//
// This drives the card for real — say(), skip(), ask(), a keyboard in the field — on a laptop and
// on a phone, and saves the five frames the change has to be judged on:
//
//   a-full      a take of four lines, lettered out, with the arrow waiting in its own corner
//   b-next      the take behind it
//   c-under     a SHORT final take with the field open on the line below his words
//   d-cleared   a take that filled all four lines, and the field on the empty card it left
//   e-dock      the pick prompt, at the head of the frame, with the spread under it
//
// Then it measures, at both windows:
//   · the card's height, and that it is the four-line height and the same object in every frame;
//   · that no lettered line is clipped by the register it stands in (the cap band, against the
//     visible box — the pen's bleed above and below the grid is allowed to be cut, it always was);
//   · the arrow's corner: the last line of a full take against the drawn mark, in px of daylight;
//   · THE ARROWS A SIX-SENTENCE REPLY COSTS, before and after. "Before" is this same build with
//     BODY_LINES patched back to 2 on the wire (page.route rewrites the module), so the two counts
//     come off one tree and one afternoon and differ in exactly the constant this round changed.
//
//   BASE=http://127.0.0.1:8730 node tools/_dlg-r13-proof.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = `${ROOT}/public/progress`;
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';

const NO_HMR =
  'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});' +
  'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

// One long sentence of his, the kind the model actually writes: 205 characters, which is four full
// lines of a phone's card and rather more than one of a laptop's.
const LONG =
  'You keep treating the first step as evidence that you must already know the whole route, and meanwhile the dog has spotted the edge of the table while you are busy inspecting the stick you brought in from the garden.';
const SHORT = 'The deck is face down and it can stay that way as long as you like.';
const TYPED = 'I keep starting things and not finishing them.';
// A six-sentence reply, which is twice what a turn is capped at (flow, MAX_SENTENCES = 3) and so
// the honest worst case for how often the visitor is asked to click.
const SIX = [
  'You have said the same sentence twice now, and the second time it was a good deal quieter than the first.',
  'A person who keeps starting things is not lazy; he is somebody who enjoys the first hour and has no use for the fourth.',
  'The shed at the end of your garden has four unfinished jobs in it and every one of them was a good idea in June.',
  'I am not going to tell you to finish them, because you would not, and then you would have lied to a frog.',
  'Pick one of the four, the smallest one, and put it on the kitchen table where it is in the way of dinner.',
  'That is the whole of the advice, and it is worth exactly what you paid for it, which was nothing at all.',
];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});

const errs = [];
// `lines` patches BODY_LINES on the wire: 4 is the build as it stands, 2 is the card as it was
// before this round. Everything else about the page is identical.
async function open(viewport, url, lines = 4) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errs.push(`${viewport.width}x${viewport.height} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`${viewport.width}x${viewport.height} ${m.text()}`));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: NO_HMR }));
  if (lines !== 4)
    await page.route('**/src/pieces/dialogue.js*', async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replace('const BODY_LINES = 4', `const BODY_LINES = ${lines}`);
      await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'application/javascript' } });
    });
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
  await page.waitForTimeout(900);
  return { context, page };
}

// What the card is, right now — and where its ink actually falls. Everything reported here is
// measured off the live card: the registers' boxes, each canvas's box, and the ink inside it.
const card = (page) =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    if (!cap || cap.hidden) return null;
    const r = cap.getBoundingClientRect();
    const em = +getComputedStyle(cap).fontSize.replace('px', '');
    const capH = em * 0.72, lead = em * 1.25, bleed = Math.ceil(capH * 0.5);
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), top: b.top, bottom: b.bottom };
    };
    // the ink in a block canvas: its bounds, and the bounds of its last row on its own
    const ink = (can) => {
      if (!can || !can.width) return null;
      const b = can.getBoundingClientRect();
      const s = b.width / can.width;
      const g = can.getContext('2d');
      const d = g.getImageData(0, 0, can.width, can.height).data;
      const rows = Math.max(1, Math.round((b.height - 2 * bleed) / lead));
      const lastY = Math.round(((bleed + (rows - 1) * lead) / b.height) * can.height);
      let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1, lastMaxX = -1;
      for (let y = 0; y < can.height; y++)
        for (let x = 0; x < can.width; x++) {
          if (d[(y * can.width + x) * 4 + 3] <= 40) continue;
          if (x < minx) minx = x;
          if (x > maxx) maxx = x;
          if (y < miny) miny = y;
          if (y > maxy) maxy = y;
          if (y >= lastY && x > lastMaxX) lastMaxX = x;
        }
      if (maxx < 0) return { rows, empty: true, box: b };
      return {
        rows,
        empty: false,
        top: b.top + miny * s,
        bottom: b.top + maxy * s,
        right: b.left + maxx * s,
        lastRight: b.left + lastMaxX * s,
      };
    };
    const wellEl = cap.querySelector('.well'), replyEl = cap.querySelector('.reply');
    const wellCan = cap.querySelector('.well canvas'), replyCan = cap.querySelector('.reply canvas');
    const arrow = cap.querySelector('.next');
    const svg = arrow && !arrow.hidden ? arrow.querySelector('svg') : null;
    const caret = cap.querySelector('.caret');
    // How much of the block's ink the register's own box cuts off, top and bottom, in px. The
    // registers clip (overflow: hidden) and always have: the pen's overshoot above the first cap
    // and below the last may be shaved, which is the bleed and is invisible. A CAP may not: the cap
    // band of the top row begins `pad` below the register's top, so anything cut deeper than that
    // is a clipped letter and the frame is wrong.
    const clip = (reg, k) => {
      if (!reg || !k || k.empty) return null;
      const pad = (lead - capH) / 2;
      const top = Math.max(0, reg.top - k.top), bottom = Math.max(0, k.bottom - reg.bottom);
      return { top: +top.toFixed(1), bottom: +bottom.toFixed(1), cap: top > pad || bottom > pad };
    };
    const wellBox = box(wellEl), replyBox = box(replyEl);
    const wellInk = ink(wellCan), replyInk = ink(replyCan);
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      em: +em.toFixed(2), cap: +capH.toFixed(1),
      inner: box(cap.querySelector('.inner'))?.h ?? null,
      well: (wellEl?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      reply: (replyEl?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      wellRows: wellInk?.empty === false ? wellInk.rows : 0,
      replyRows: replyInk?.empty === false ? replyInk.rows : 0,
      wellH: wellBox?.h ?? null,
      replyH: replyBox?.h ?? null,
      clipWell: clip(wellBox, wellInk),
      clipReply: clip(replyBox, replyInk),
      arrow: !!(arrow && !arrow.hidden),
      // daylight between the last line of the take and the drawn mark
      daylight: svg && wellInk && !wellInk.empty ? Math.round(svg.getBoundingClientRect().left - wellInk.lastRight) : null,
      caret: !!caret,
      caretTop: caret ? Math.round(caret.getBoundingClientRect().top - r.top) : null,
      docked: r.y < window.innerHeight / 2,
    };
  });

async function shotCard(page, name, pad = 26) {
  const c = await card(page);
  const vp = page.viewportSize();
  const clip = c
    ? {
        x: Math.max(0, c.x - pad),
        y: Math.max(0, c.y - pad),
        width: Math.min(vp.width, c.w + 2 * pad),
        height: Math.min(vp.height - Math.max(0, c.y - pad), c.h + 2 * pad),
      }
    : undefined;
  await page.screenshot({ path: `${OUT}/${name}.png`, clip });
  return c;
}

const wait = async (page, test, ms = 100, n = 200) => {
  for (let i = 0; i < n; i++) {
    if (await page.evaluate(test)) return true;
    await page.waitForTimeout(ms);
  }
  return false;
};

const log = [];
const brief = (c) => ({
  card: `${c.w}x${c.h}`, rows: `${c.wellRows}+${c.replyRows}`, arrow: c.arrow, caret: c.caret,
  clipped: c.clipWell ?? c.clipReply,
});

async function pass(label, viewport) {
  const { context, page } = await open(viewport, `${BASE}/?view=dialogue&state=greeting`);

  // ---- (a) a four-line take, lettered out, with the arrow ---------------------------------------
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    window.__takes = null;
    window.__theatre.on('dialogue:say', (d) => (window.__takes = d.takes));
    D.say(t, { hold: 1.2 });
  }, LONG);
  await wait(page, () => !!document.querySelector('#dialogue .next:not([hidden])'));
  const a = await shotCard(page, `dlg-r13-${label}-a-full`);
  const takes = await page.evaluate(() => window.__takes);
  log.push([`${label} (a) a full take`, { ...brief(a), takes, daylight: a.daylight, take: a.well.slice(0, 46) + '…' }]);

  // ---- (b) the take behind it -------------------------------------------------------------------
  const first = a.well;
  await page.evaluate(() => window.__theatre.pieces.dialogue.skip());
  await page.waitForTimeout(1800); // the take behind it, typed out at the card's own pace
  const b = await shotCard(page, `dlg-r13-${label}-b-next`);
  log.push([`${label} (b) the next take`, { ...brief(b), turned: b.well !== first, take: b.well.slice(0, 46) + '…' }]);

  // ---- (c) a short final take, with the field open on the line below it --------------------------
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    D.say(t, { hold: 0.2 }).then(() => D.ask('', {}));
  }, SHORT);
  await wait(page, () => !!document.querySelector('#dialogue .caret'));
  await page.focus('#dialogue input.keys');
  await page.keyboard.type(TYPED, { delay: 6 });
  await page.waitForTimeout(300);
  const c = await shotCard(page, `dlg-r13-${label}-c-under`);
  log.push([`${label} (c) the field under him`, { ...brief(c), his: c.well.slice(0, 30) + '…', theirs: c.reply.slice(0, 30) + '…', caretTop: c.caretTop }]);

  // ---- (d) a take that fills all four lines, and the field on the card it left --------------------
  // A take is only the LAST one if nothing follows it, so the text is cut down word by word until
  // the whole of it is one take — and that one take is four lines deep.
  const filled = await page.evaluate(async (t) => {
    const D = window.__theatre.pieces.dialogue;
    const em = +getComputedStyle(document.querySelector('#dialogue .cap')).fontSize.replace('px', '');
    const words = t.split(' ');
    const rows = () => {
      const can = document.querySelector('#dialogue .well canvas');
      if (!can) return 0;
      const b = can.getBoundingClientRect();
      return Math.max(1, Math.round((b.height - 2 * Math.ceil(em * 0.72 * 0.5)) / (em * 1.25)));
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
  }, LONG);
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    D.say(t, { hold: 0.2 }).then(() => D.ask('', {}));
  }, filled ?? LONG);
  await wait(page, () => {
    const D = window.__theatre.pieces.dialogue;
    if (!document.querySelector('#dialogue .caret')) {
      D.skip();
      return false;
    }
    return true;
  });
  await page.waitForTimeout(300);
  const d = await shotCard(page, `dlg-r13-${label}-d-cleared`);
  log.push([`${label} (d) four lines, then the field`, { ...brief(d), his: d.well || '(the card is clear)', caretTop: d.caretTop, chars: (filled ?? '').length }]);

  await context.close();
  return { a, b, c, d };
}

// ---- the arrows a six-sentence reply costs ------------------------------------------------------
// Six sentences, said one after another exactly as flow says them, with the visitor turning every
// take the moment the mark comes up. What is counted is the MARK: every time the arrow is put on
// the card is one click the visitor is asked for.
async function arrows(label, viewport, lines) {
  const { context, page } = await open(viewport, `${BASE}/?view=dialogue&state=greeting`, lines);
  const n = await page.evaluate(async (six) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    let marks = 0, takes = 0;
    const cap = document.querySelector('#dialogue .cap');
    const obs = new MutationObserver((recs) => {
      for (const r of recs)
        if (r.attributeName === 'hidden' && !r.target.hidden) marks++;
    });
    window.__theatre.on('dialogue:say', (d) => (takes += d.takes));
    const arrow = () => document.querySelector('#dialogue .next');
    for (const s of six) {
      const a = arrow();
      if (a) obs.observe(a, { attributes: true, attributeFilter: ['hidden'] });
      let done = false;
      const said = D.say(s, { hold: 0.2 }).then(() => (done = true));
      // THE VISITOR WAITS FOR THE MARK. A take that is still being lettered is not a click the
      // round is about — `skip` on one of those only finishes the typing — so this turns the take
      // only once the arrow is actually up, which is exactly the gesture the user was counting.
      for (let i = 0; i < 600 && !done; i++) {
        await new Promise((r) => setTimeout(r, 25));
        const a2 = arrow();
        if (a2) obs.observe(a2, { attributes: true, attributeFilter: ['hidden'] });
        if (a2 && !a2.hidden) D.skip();
      }
      await said;
    }
    obs.disconnect();
    return { marks, takes };
  }, SIX);
  await context.close();
  return n;
}

const laptop = { width: 1280, height: 800 }, phone = { width: 390, height: 844 };
const L = await pass('laptop', laptop);
const P = await pass('phone', phone);

console.log('=== the frames ===');
for (const [k, v] of log) console.log(k.padEnd(40), JSON.stringify(v));

console.log('\n=== the card ===');
for (const [label, vp, r] of [['laptop', laptop, L], ['phone', phone, P]]) {
  const h = r.a.h;
  const same = [r.a, r.b, r.c, r.d].every((c) => c.h === h && c.w === r.a.w);
  console.log(
    `${label} ${vp.width}x${vp.height}  card ${r.a.w} x ${h} px  (cap ${r.a.cap} px, em ${r.a.em}, body ${r.a.inner} px = ${(r.a.inner / (r.a.em * 1.25)).toFixed(2)} lines)  one object in every frame: ${same}`,
  );
}

// ---- (e) the pick prompt, docked at the head, with the spread under it -------------------------
// Unchanged by this round and measured because of it: the card is the same object at the head of
// the frame as at its foot, four lines deep, and the prompt stands in the top line of it.
console.log('\n=== (e) the dock ===');
const docks = [];
for (const [label, vp] of [['laptop', laptop], ['phone', phone]]) {
  const { context, page } = await open(vp, `${BASE}/?view=flow&state=fan`);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/dlg-r13-${label}-e-dock.png` });
  const c = await card(page);
  docks.push(c);
  console.log(`${label}  ${c ? JSON.stringify({ top: c.y, card: `${c.w}x${c.h}`, at: c.docked ? 'head' : 'foot', rows: `${c.wellRows}+${c.replyRows}`, prompt: c.well.slice(0, 40) }) : 'no card'}`);
  await context.close();
}

console.log('\n=== the arrows a six-sentence reply costs ===');
const counts = {};
for (const [label, vp] of [['laptop', laptop], ['phone', phone]])
  for (const lines of [2, 4]) {
    const r = await arrows(label, vp, lines);
    counts[`${label}-${lines}`] = r;
    console.log(`${label}  ${lines} lines to a take   ${String(r.marks).padStart(2)} arrows   ${r.takes} cards for six sentences`);
  }

await browser.close();
console.log('');
console.log(errs.length ? `PAGE ERRORS\n  ${errs.join('\n  ')}` : 'no page errors');
const clipped = [L, P].flatMap((r) => [r.a, r.b, r.c, r.d]).filter((c) => c.clipWell?.cap || c.clipReply?.cap);
const dark = [L.a, P.a].filter((c) => c.arrow && c.daylight != null && c.daylight < 4);
const fewer = counts['laptop-4'].marks <= counts['laptop-2'].marks && counts['phone-4'].marks < counts['phone-2'].marks;
const ok = !errs.length && !clipped.length && !dark.length && fewer;
console.log(clipped.length ? `FAIL — ${clipped.length} frame(s) with a clipped cap` : 'no lettered line is clipped');
console.log(dark.length ? `FAIL — the arrow stands in the take's last line` : `the arrow keeps its corner (${L.a.daylight} px laptop, ${P.a.daylight} px phone)`);
console.log(fewer ? 'PASS — fewer arrows after' : 'FAIL — the arrows did not fall');
process.exit(ok ? 0 : 1);
