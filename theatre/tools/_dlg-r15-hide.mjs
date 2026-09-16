#!/usr/bin/env node
// ROUND 15 — THE PLACARD FOLDS AWAY, AND A TAB BRINGS IT BACK.
//
// The user: "i think the placard should be hidable."
//
// This drives the card for real — a live page, the clock running, a MOUSE on the drawn tab and
// never an API call where a click will do — and answers the five questions the round asks:
//
//   1  IS THE TAB THERE, and is it drawn rather than written? The flap on the card's edge, in the
//      card's own pen: its box against the card's, its paper and its ink, and no word on it;
//   2  DOES A CLICK ON IT TAKE THE CARD OUT OF THE FRAME — the card, the words, the mark and the
//      FIELD with them — in a short stepped move, leaving only the tab at the frame's edge? The
//      move's own drawings are recorded off the card's style as it goes;
//   3  IS THE ROOM UNCOVERED? Measured in PIXELS, in the band the card stood in: the same strip
//      photographed with the card up, with the card folded away, and with no card at all, and the
//      third compared to the second against the film's own boil as a noise floor;
//   4  DOES THE TAB BRING IT BACK, and does HIS NEXT LINE bring it back with no hand on it at all?
//   5  IS ROUND 14'S GATE INTACT? A card he has filled waits for the visitor's click on the CARD;
//      the tab's click is not that click — it folds the card with the take and the mark still
//      standing on it and turns nothing.
//
// All of it at 1280x800 and at 390x844, and then once more with the card DOCKED at the head of the
// frame (the spread out, which is where a phone puts the card while the deck is on the cloth): the
// tab changes edges with the dock and the card folds UP instead of down.
//
// The frames go to /tmp/dlg-hide/ — the card shown, folding, and folded away, on both windows.
//
//   BASE=http://127.0.0.1:8740 node tools/_dlg-r15-hide.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const OUT = '/tmp/dlg-hide';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? 'http://127.0.0.1:8740';

const NO_HMR =
  'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});' +
  'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

// A long line of his: it is cut into takes at every window, so the first take fills the card and
// the mark comes up on it — which is the card round 14's gate is about and the card this round has
// to fold without turning.
const LONG =
  'You keep treating the first step as evidence that you must already know the whole route, and meanwhile the dog has spotted the edge of the table while you are busy inspecting the stick you brought in from the garden. ' +
  'A person who keeps starting things is not lazy; he is somebody who enjoys the first hour and has no use for the fourth, and the shed at the end of your garden has four unfinished jobs in it.';
const SHORT = 'The deck is face down and it can stay that way as long as you like.';
const NEXT = 'I had not finished, as it happens, and the cat has opinions about the second card.';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});

const errs = [];
async function open(viewport, url = `${BASE}/?view=dialogue&state=greeting`) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(60000); // nothing here waits on the page for ever; the steps say where
  page.on('pageerror', (e) => errs.push(`${viewport.width}x${viewport.height} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`${viewport.width}x${viewport.height} ${m.text()}`));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: NO_HMR }));
  await page.goto(url, { waitUntil: 'load', timeout: 300000 });
  // READY_TIMEOUT, and why it is a variable. This machine carries several builders' headless
  // browsers at once and a page that takes two minutes to stand up under a load average of four has
  // not thrown anything — it has been waiting for a CPU. The same flag check-views.mjs keeps.
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: +(process.env.READY_TIMEOUT ?? 300000) });
  await page.waitForTimeout(900);
  // the drawings of every fold, taken off the card's own style as the move steps
  await page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    window.__folds = [];
    window.__says = 0;
    window.__theatre.on?.('dialogue:say', () => (window.__says += 1));
    const px = () => parseFloat(getComputedStyle(cap).getPropertyValue('--fold')) || 0;
    const t0 = performance.now();
    new MutationObserver(() => {
      const v = px();
      const last = window.__folds[window.__folds.length - 1];
      if (!last || last.px !== v) window.__folds.push({ px: +v.toFixed(1), ms: Math.round(performance.now() - t0) });
    }).observe(cap, { attributes: true, attributeFilter: ['style'] });
  });
  return { context, page };
}

// WHAT THE CARD IS RIGHT NOW, measured off the live page: where it stands (the rect carries the
// fold, which is a transform), where its tab stands, what is on it, and whether the field is still
// there and still has the focus.
const card = (page) =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap');
    if (!cap || cap.hidden) return null;
    const r = cap.getBoundingClientRect();
    const t = cap.querySelector('.tab');
    const tb = t ? t.getBoundingClientRect() : null;
    const svg = t?.querySelector('svg');
    const arrow = cap.querySelector('.next');
    const input = cap.querySelector('.keys');
    const paths = svg ? [...svg.querySelectorAll('path')] : [];
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      fold: +(parseFloat(getComputedStyle(cap).getPropertyValue('--fold')) || 0).toFixed(1),
      folded: !!window.__theatre.pieces.dialogue.folded,
      head: cap.classList.contains('head'),
      take: (cap.querySelector('.well .sr')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      tab: tb
        ? {
            x: Math.round(tb.x), y: Math.round(tb.y), w: Math.round(tb.width), h: Math.round(tb.height),
            bottom: Math.round(tb.bottom),
            // the drawing inside it: one paper fill and three ink edges, and no text anywhere
            fills: paths.filter((p) => p.getAttribute('fill') !== 'none').map((p) => p.getAttribute('fill')),
            strokes: paths.filter((p) => p.getAttribute('stroke')).map((p) => p.getAttribute('stroke')),
            words: (t.textContent ?? '').trim(),
            label: t.getAttribute('aria-label'),
          }
        : null,
      arrow: !!(arrow && !arrow.hidden),
      arrowAt: arrow && !arrow.hidden ? { x: Math.round(arrow.getBoundingClientRect().x + arrow.getBoundingClientRect().width / 2), y: Math.round(arrow.getBoundingClientRect().y + arrow.getBoundingClientRect().height / 2) } : null,
      field: !!input,
      value: input?.value ?? null,
      focused: !!input && document.activeElement === input,
      caret: !!cap.querySelector('.caret'),
      says: window.__says,
    };
  });

// THE MOVE IS OVER when the card has stopped moving — and "stopped" has to be measured against the
// clock the card actually moves on, which is the film's stepped clock and not the wall. This
// machine carries several builders' browsers, and the 12 fps step has been observed running at
// about 1.5: two readings 70 ms apart are then the same reading, and a tool that trusted them
// clicked the tab again halfway through the fold. So: the same offset for a second and a half.
async function settled(page, ms = 200, need = 8) {
  let last = null, same = 0;
  for (let i = 0; i < 200; i++) {
    const v = await page.evaluate(() => {
      const cap = document.querySelector('#dialogue .cap');
      return cap ? +(parseFloat(getComputedStyle(cap).getPropertyValue('--fold')) || 0).toFixed(1) : 0;
    });
    same = v === last ? same + 1 : 0;
    last = v;
    if (same >= need) return v;
    await page.waitForTimeout(ms);
  }
  return last;
}
// A hand on the tab, WHEREVER THE TAB IS NOW. It moves with the card — to the frame's foot when the
// card folds, to the other edge when the card docks — so its place is read again before every click
// rather than remembered from the last one.
async function pullTab(page) {
  const c = await card(page);
  if (!c?.tab) return null;
  await page.mouse.click(c.tab.x + Math.round(c.tab.w / 2), c.tab.y + Math.round(c.tab.h / 2));
  return c;
}
const folds = async (page) => page.evaluate(() => window.__folds.splice(0, window.__folds.length));

// ---- THE PIXELS ---------------------------------------------------------------------------------
// The band the card stands in, photographed. Two frames of the film are never identical — every
// line in this room boils on the 12 fps clock — so a difference is only meaningful against that
// boil, which is measured here as the noise floor and printed with every number it judges.
const px = async (page, clip) => {
  const buf = await page.screenshot({ clip });
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  return { data, n: info.width * info.height, ch: info.channels };
};
function diff(a, b, tol = 24) {
  let n = 0;
  for (let i = 0; i < a.n; i++) {
    const p = i * a.ch, q = i * b.ch;
    if (Math.max(Math.abs(a.data[p] - b.data[q]), Math.abs(a.data[p + 1] - b.data[q + 1]), Math.abs(a.data[p + 2] - b.data[q + 2])) > tol) n++;
  }
  return n / a.n;
}
// How much of the strip is INK — a pen line, a lettered word, his green (all of them well under
// this) against the paper #f8f9f4, which is nowhere near it.
function inked(a, dark = 140) {
  let n = 0;
  for (let i = 0; i < a.n; i++) {
    const p = i * a.ch;
    if (Math.max(a.data[p], a.data[p + 1], a.data[p + 2]) < dark) n++;
  }
  return n / a.n;
}
const pct = (x) => `${(x * 100).toFixed(1)}%`;

const log = [];
const fails = [];
const check = (ok, line) => {
  log.push(`${ok ? 'PASS' : 'FAIL'}  ${line}`);
  if (!ok) fails.push(line);
  return ok;
};
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
// the steps, printed as they happen: this drives a live page on a shared machine and a run that
// stops has to say where it stopped
const step = (s) => process.stdout.write(`  · ${s}\n`);

async function pass(label, viewport) {
  step(`${label}: opening`);
  const { context, page } = await open(viewport);
  const H = viewport.height;

  // ---- 1. the tab, on the card's edge ------------------------------------------------------------
  step(`${label}: the tab`);
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    D.say(t, { hold: 1.2 });
    D.skip();
  }, SHORT);
  await page.waitForTimeout(700);
  const shown = await card(page);
  await shot(page, `${label}-a-card`);
  check(!!shown?.tab, `${label} the card carries a tab`);
  const T = shown.tab;
  check(
    Math.abs(T.bottom - shown.y) <= 2,
    `${label} the tab stands ON the card's top edge (tab foot ${T.bottom} px, card top ${shown.y} px) and outside its box, never over a word`,
  );
  check(
    T.x + T.w <= shown.x + shown.w && T.x + T.w > shown.x + shown.w - 0.1 * shown.w,
    `${label} it is at the card's right, on the mark's own margin (tab right ${T.x + T.w} px, card right ${shown.x + shown.w} px)`,
  );
  check(
    T.fills.length === 1 && T.fills[0] === '#f8f9f4' && T.strokes.filter((s) => s === '#0d0e0d').length === 3 && !T.words,
    `${label} it is DRAWN, not written: one paper fill and ${T.strokes.filter((s) => s === '#0d0e0d').length} hand-cut ink edges, ${T.words ? `and the word "${T.words}"` : 'and no word on it'} (tab ${T.w} x ${T.h} px)`,
  );

  // the band the card occupies, which is the strip the room has to get back
  const band = { x: shown.x, y: shown.y, width: shown.w, height: Math.min(shown.h, H - shown.y) };
  const before = await px(page, band);

  // ---- 2. a real click on the tab, and the card goes -----------------------------------------------
  step(`${label}: the fold`);
  await folds(page);
  await pullTab(page);
  await page.waitForTimeout(110);
  const mid = await card(page); // read FIRST: a screenshot takes long enough to miss the move
  await shot(page, `${label}-b-folding`); // ... caught partway out of the frame
  const at = await settled(page);
  const walk = await folds(page);
  const gone = await card(page);
  await shot(page, `${label}-c-hidden`);
  check(gone.folded && Math.abs(gone.fold - at) < 0.1, `${label} a click on the tab folds the card away (${at} px, the card's own height and its margin)`);
  check(
    gone.y >= H - 3,
    `${label} the card is out of the frame: its top edge is on the frame's foot (${gone.y} px of ${H})`,
  );
  check(
    gone.tab.y >= 0 && gone.tab.bottom <= H && gone.tab.bottom >= H - 4,
    `${label} ... and only the tab is left standing in the picture, at the frame's edge (${gone.tab.y}–${gone.tab.bottom} px)`,
  );
  // the move, drawing by drawing: four of them, each a step of the 12 fps clock. It is not judged
  // on wall time — this machine runs several builders' headless browsers at once — but on the fact
  // that the card walked there in whole drawings rather than jumping or fading.
  check(
    walk.length >= 3 && walk.length <= 5,
    `${label} it walks out in ${walk.length} drawings on the twelves — ${walk.map((f) => Math.round(f.px)).join(', ')} px at ${walk.map((f) => f.ms).join(', ')} ms`,
  );
  log.push(`      (the frame at 110 ms caught it ${mid && mid.fold > 0 && mid.fold < at ? `partway, ${mid.fold} px of ${at}` : `already home, ${mid?.fold} px`})`);

  // ---- 3. the room, in pixels ----------------------------------------------------------------------
  step(`${label}: the pixels`);
  const hidden = await px(page, band);
  const hidden2 = await px(page, band);
  const noise = diff(hidden, hidden2); // the film's own boil, in the same strip
  const covered = diff(before, hidden);
  await page.evaluate(() => window.__theatre.pieces.dialogue.clear());
  await page.waitForTimeout(500);
  const bare = await px(page, band);
  const left = diff(hidden, bare);
  // HOW MUCH DRAWING IS IN THE STRIP. The card is opaque paper and the room behind it is a drawing
  // on paper of the same colour, so "is the room back" is not a question about brightness: it is a
  // question about how much INK the strip carries. With the card up it carries the card's own two
  // or three lines and its frame; with the card folded away it carries the table, the cloth, the
  // deck and the boards — the room's own lines, which is the thing the visitor asked to look at.
  // ... and it is NOT a question about how much ink is in the strip, which was the first guess and
  // is measured here because it is the interesting wrong answer: the card carries about as much ink
  // as the room does. On a laptop the strip goes 9.2% inked with the card up to 10.1% with it gone,
  // and on a phone it goes DOWN, 8.9% to 6.4% — his lettering is heavier than the cloth and the
  // boards behind it. So the number is printed and nothing is judged on it.
  const inkUp = inked(before), inkGone = inked(hidden), inkBare = inked(bare);
  log.push(`      (ink in the strip: ${pct(inkUp)} with the card up, ${pct(inkGone)} folded away, ${pct(inkBare)} with no card at all)`);
  // WHAT IS JUDGED, in two halves. While the card stands the strip is the CARD: it differs from the
  // bare room by twice what the film's own boil does to it. Folded, the strip is the ROOM: it
  // differs from the bare room by the boil and by nothing else, which is as close as two frames of
  // this film ever get to each other.
  check(
    covered > 0.15 && covered > noise * 2,
    `${label} ${pct(covered)} of the pixels where the card stood change when it goes — against a boil of ${pct(noise)} in the same strip (${band.width} x ${band.height} px of frame)`,
  );
  check(
    left < Math.max(0.06, noise * 1.6),
    `${label} and what is left there is the ROOM: ${pct(left)} of it differs from the same strip with no card at all, against that same boil of ${pct(noise)}`,
  );

  // ---- 4. the tab brings it back, and so does his next line -----------------------------------------
  step(`${label}: back again`);
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.say(t, { hold: 1.2 });
    D.skip();
  }, SHORT);
  await page.waitForTimeout(600);
  const back0 = await card(page);
  await folds(page);
  await pullTab(page);
  await settled(page);
  await pullTab(page);
  const home = await settled(page);
  const backWalk = await folds(page);
  const back = await card(page);
  await shot(page, `${label}-d-back`);
  check(
    home === 0 && !back.folded && back.y === back0.y && back.h === back0.h && back.take === back0.take,
    `${label} a click on the tab brings it back to the line it left (top ${back.y} px, ${back.h} px tall, the same words on it)`,
  );
  check(backWalk.length >= 6, `${label} out and back is ${backWalk.length} drawings and no fade`);

  // HIS NEXT LINE, with no hand on it at all.
  await pullTab(page);
  await settled(page);
  const away = await card(page);
  const saysBefore = away.says;
  // said and NOT awaited: on a phone this line fills the card, and a card he has filled does not
  // settle until the visitor turns it (round 14). The round being proved here is what happens to
  // the folded card the moment his words land on it, which is long before that.
  await page.evaluate((t) => {
    window.__theatre.pieces.dialogue.say(t, { hold: 1.2 });
  }, NEXT);
  await settled(page);
  await page.waitForTimeout(400);
  const spoke = await card(page);
  check(
    away.folded && !spoke.folded && spoke.fold === 0 && spoke.y === back0.y,
    `${label} his next line brings the card back on its own, with no click (folded ${away.fold} px → ${spoke.fold} px, top ${spoke.y})`,
  );
  check(spoke.says === saysBefore + 1 && spoke.take.length > 0, `${label} ... and the line is on it when it arrives`);

  // ---- 5. the field goes with the card ---------------------------------------------------------------
  step(`${label}: the field`);
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    window.__answer = undefined;
    D.ask(t, {}).then((v) => (window.__answer = v));
  }, SHORT);
  // the prompt is shown whole and turned if this window made a full card of it (round 14's gate is
  // the visitor's, and here the tool is the visitor), then the field opens under it
  for (let i = 0; i < 80; i++) {
    if (await page.evaluate(() => !!document.querySelector('#dialogue .caret'))) break;
    await page.evaluate(() => window.__theatre.pieces.dialogue.skip());
    await page.waitForTimeout(120);
  }
  const asked = await card(page);
  await page.keyboard.type('the second card');
  await page.waitForTimeout(300);
  const typed = await card(page);
  await pullTab(page);
  await settled(page);
  const withField = await card(page);
  check(asked.field && typed.caret && typed.value === 'the second card', `${label} the field is open on the card with "${typed.value}" in it`);
  check(
    withField.folded && withField.field && !withField.focused && withField.value === 'the second card' && (await page.evaluate(() => window.__answer)) === undefined,
    `${label} folding takes the FIELD with the card: out of the frame, the focus dropped (a phone's keyboard with it), every character still in it, and the ask still waiting`,
  );
  await pullTab(page);
  await settled(page);
  const again = await card(page);
  check(
    again.field && again.caret && again.value === 'the second card' && again.focused,
    `${label} and it is all there when the tab brings the card back — the words, the caret, and the pen back in their hand`,
  );

  // ---- 6. round 14 s gate is not the tab s business ---------------------------------------------------
  step(`${label}: the gate`);
  await page.evaluate((t) => {
    const D = window.__theatre.pieces.dialogue;
    D.clear();
    window.__done = null;
    D.say(t, { hold: 1.2 }).then(() => (window.__done = true));
  }, LONG);
  const gotMark = await (async () => {
    for (let i = 0; i < 300; i++) {
      if (await page.evaluate(() => !!document.querySelector('#dialogue .next:not([hidden])'))) return true;
      await page.waitForTimeout(80);
    }
    return false;
  })();
  const full = await card(page);
  await shot(page, `${label}-e-full-mark`);
  check(gotMark && full.arrow, `${label} a take that fills the card stands with the mark up`);
  await pullTab(page);
  await settled(page);
  const foldedFull = await card(page);
  await pullTab(page);
  await settled(page);
  await page.waitForTimeout(300);
  const unfoldedFull = await card(page);
  check(
    foldedFull.folded && foldedFull.take === full.take && foldedFull.arrow && (await page.evaluate(() => window.__done)) === null,
    `${label} the tab's click is NOT the visitor's click: the take is unturned, the mark still up, the line still unsaid`,
  );
  check(
    unfoldedFull.take === full.take && unfoldedFull.arrow && !unfoldedFull.folded,
    `${label} and the same card comes back with the same mark on it`,
  );
  // ... and the card's own click still turns it, exactly as round 14 left it
  await page.mouse.click(unfoldedFull.x + Math.round(unfoldedFull.w / 2), unfoldedFull.y + Math.round(unfoldedFull.h * 0.35));
  await page.waitForTimeout(700);
  const turned = await card(page);
  check(turned.take !== full.take, `${label} a click on the CARD turns it, as it always did`);

  await context.close();
  return { shown, gone, walk, covered, left, noise, band, ink: { up: inkUp, gone: inkGone, bare: inkBare } };
}

// ---- 7. THE DOCK: the card at the head of the frame, and the tab under it -------------------------
// While the spread is out the card hangs from the head (and on a phone it hangs there for as long as
// the deck is laid out on the cloth). The tab changes edges with it — it is always on the edge the
// card folds towards — so here it is on the card's BOTTOM edge and the card goes UP.
async function dock(label, viewport) {
  const { context, page } = await open(viewport, `${BASE}/?view=flow&state=fan`);
  const H = viewport.height;
  let c = null;
  for (let i = 0; i < 80; i++) {
    c = await card(page);
    if (c && c.head && c.tab) break;
    await page.waitForTimeout(250);
  }
  if (!c?.head) {
    check(false, `${label} (docked) the card hangs from the head of the frame`);
    await context.close();
    return null;
  }
  await shot(page, `${label}-f-dock-card`);
  check(
    Math.abs(c.tab.y - c.bottom) <= 2,
    `${label} (docked) the tab has changed edges with the card: it stands on its BOTTOM edge (tab head ${c.tab.y} px, card foot ${c.bottom} px)`,
  );
  // he may say a line at any moment here — flow is running the evening — so the fold is judged only
  // if he kept quiet through it
  let ok = false, note = '';
  for (let k = 0; k < 3 && !ok; k++) {
    const t = await card(page);
    await pullTab(page);
    await settled(page);
    const g = await card(page);
    note = `card foot ${g.bottom} px, tab ${g.tab.y}–${g.tab.bottom} px of ${H}`;
    ok = g.folded && g.bottom <= 4 && g.tab.bottom > 0 && g.tab.bottom <= 40 && g.says === t.says;
    if (ok) await shot(page, `${label}-g-dock-hidden`);
    await pullTab(page);
    await settled(page);
  }
  check(ok, `${label} (docked) the card folds UP out of the head of the frame and leaves the tab on it (${note})`);
  await context.close();
  return c;
}

const laptop = { width: 1280, height: 800 }, phone = { width: 390, height: 844 };
const L = await pass('laptop', laptop);
const P = await pass('phone', phone);
const DL = await dock('laptop', laptop);
const DP = await dock('phone', phone);

console.log('=== the tab, and the move ===');
for (const [label, vp, r] of [['laptop', laptop, L], ['phone', phone, P]]) {
  console.log(
    `${label} ${vp.width}x${vp.height}  card ${r.shown.w} x ${r.shown.h} px at ${r.shown.x},${r.shown.y}   tab ${r.shown.tab.w} x ${r.shown.tab.h} px at ${r.shown.tab.x},${r.shown.tab.y}`,
  );
  console.log(`  folds ${r.walk.length} drawings, ${r.walk.map((f) => `${Math.round(f.px)}px@${f.ms}ms`).join('  ')}`);
  console.log(`  the band ${r.band.width} x ${r.band.height} px: ${pct(r.ink.up)} ink with the card up, ${pct(r.ink.gone)} with it folded away, ${pct(r.ink.bare)} with no card at all`);
  console.log(`    ${pct(r.covered)} of its pixels change when the card goes; ${pct(r.left)} differ from the bare room, against a boil of ${pct(r.noise)}`);
}
for (const [label, c] of [['laptop', DL], ['phone', DP]]) if (c) console.log(`${label} docked  card top ${c.y} px, foot ${c.bottom} px   tab ${c.tab.y}–${c.tab.bottom} px`);

console.log('\n=== what was watched ===');
for (const l of log) console.log(' ', l);

await browser.close();
console.log('');
console.log(errs.length ? `PAGE ERRORS\n  ${errs.join('\n  ')}` : 'no page errors');
console.log(`frames in ${OUT}`);
console.log(fails.length ? `FAIL — ${fails.length} of ${log.length}` : `PASS — ${log.length} checks`);
process.exit(fails.length || errs.length ? 1 : 0);
