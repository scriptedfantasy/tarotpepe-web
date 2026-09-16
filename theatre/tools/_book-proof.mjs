#!/usr/bin/env node
// TAROT BY PEPE, OPENED LIKE A VISITOR AND READ RIGHT THROUGH (src/pieces/walk-book.js).
//
//   the TRIGGER   whatever the room actually registers for the book, found rather than assumed: the
//                 proof walks every place walk.js offers, asks the arbiter what is under the book's
//                 own tap box at each of them, and clicks the first one that answers `book-…`. It
//                 does not know or care whether that is a spine on the tall case or a book lying on
//                 a table, which is the point — the trigger is moving and the book is not.
//   the OTHERS    MARSEILLE, CHIROMANCIE and LE DESTIN are refused: books on a shelf, no tap box
//   the CONTENTS  the list at the front, line by line: 78 cards, the openings, the four suits and
//                 the last page, each line CLICKED on the glass and the leaf it lands on read back
//   the WAY BACK  the folded corner on a trump page, a pip page and a court page, clicked, each of
//                 them putting the visitor back on the leaf of the list they left from
//   the PAGES     every leaf turned through with the right page, the text read out of the piece in
//                 the hand's own folded case, and — on every leaf that carries one — THE CARD'S OWN
//                 INK COUNTED IN PIXELS inside the plate's box on the glass, so all seventy-eight
//                 are proved to be ON the page rather than merely asked for
//   the DRAWING   /tmp/book/*.png at 1280x800 and 390x844: the contents, a pip and a court card
//
//   BASE=http://127.0.0.1:8741 node tools/_book-proof.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { DECK } from '../src/core/deck.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/book';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800];
const PHONE = [390, 844];
// the three that used to open and no longer do: the proof asks the room for each by name
const SHUT = ['MARSEILLE', 'CHIROMANCIE', 'LE DESTIN'];
const CARDS = DECK.length; // seventy-eight, off the deck itself
// an entry's running head is its card's name, so the deck is also the list of heads to expect
const headOf = (slug) => slug.replace(/-/g, ' ').toUpperCase();
const slugOf = (head) => head.toLowerCase().replace(/ /g, '-');

const LAUNCH = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] };
const stub = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });
let bad = 0;
const claim = (b, text) => {
  if (!b) bad++;
  console.log(`   ${b ? '✓' : '✗'} ${text}`);
};
// A CLICK ON THE SHEET IS FINISHED WHEN IT RETURNS: the book turns, re-cuts and strikes its own
// opening inside the handler, so the piece can be read the moment the click comes back and nothing
// here waits on the room's own frame rate — which under software GL, with a 3D parlour still
// drawing behind the paper, is the difference between a proof of four minutes and one of forty.
// Frames are waited for in exactly two places: a screenshot, and a plate that has to finish loading.
const frames = (p, n = 2) => p.evaluate((k) => new Promise((res) => { let i = k; const go = () => (i-- <= 0 ? res() : requestAnimationFrame(go)); go(); }), n);
// AND THE ROOM IS STOPPED ONCE THE BOOK IS UP, WHICH IS NOT A CHEAT AND IS WORTH THE PARAGRAPH.
// The parlour behind the paper is a 3D scene with the film's whole ink pass over it, and in a
// headless browser on software GL it costs seconds a drawing — so every click and every read in
// this proof queues behind a frame, and a book of 234 leaves takes an hour to turn. The book does
// not need those frames: `turn`, `goLeaf` and `back` re-cut the sheet and strike it INSIDE the
// click handler, and `update()` only re-strikes it to boil the line. So after the trigger has been
// clicked — the one thing here that does need the room, because the walk to it runs on the twelves —
// the loop is stopped by taking requestAnimationFrame away, and what is under the pointer from then
// on is the same canvas a visitor is looking at, minus the boil. It is given back at the end.
const stopTheRoom = (p) => p.evaluate(() => {
  window.__raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
});
const startTheRoom = (p) => p.evaluate(() => {
  if (!window.__raf) return;
  window.requestAnimationFrame = window.__raf;
  window.__raf = null;
});
// A PLATE IS READY WHEN IT CAN BE PAINTED, not when it has arrived. `complete` goes true as soon as
// the bytes are in; the picture is drawable a beat later, and a screenshot taken in that beat counts
// an empty box and calls a card missing. `decode()` is the browser's own answer to the question.
const plateReady = async (p) => {
  await p.waitForFunction(() => {
    const i = document.querySelector('#book img.plate');
    return !i || !i.classList.contains('on') || (i.complete && i.naturalWidth > 0);
  }, null, { timeout: 30000, polling: 100 });
  await p.evaluate(async () => {
    const i = document.querySelector('#book img.plate');
    if (!i || !i.classList.contains('on')) return;
    try {
      await i.decode();
    } catch {}
    await new Promise((r) => setTimeout(r, 0));
  });
};
const settle = async (p) => {
  await p.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: 300000, polling: 250 });
  await frames(p, 2);
};
const state = (p) => p.evaluate(() => {
  const B = window.__theatre.pieces.walk.books;
  return { showing: B.showing, title: B.title, leaf: B.leaf, leaves: B.leaves, cap: B.cap, spread: B.spread, box: B.box, at: window.__theatre.pieces.walk.at, indexAt: B.indexAt, indexLeaves: B.indexLeaves };
});
// what the visitor is looking at, in ONE round trip: the leaf, its words, the plate's box and the
// sheet itself — so turning a book of two hundred and thirty-four leaves costs a click and a read
// rather than a click and three reads
const seeing = (p) => p.evaluate(() => {
  const B = window.__theatre.pieces.walk.books;
  return { leaf: B.leaf, leaves: B.leaves, box: B.box, text: B.text() ?? '', card: B.card, kind: B.sheetLeaves[B.leaf] ?? '?' };
});

// THE TRIGGER, FOUND RATHER THAN KNOWN. The book is opened by something in the room, and what that
// something is is not this proof's business: it was a spine on the tall case and it is moving to a
// reading table. So every place the room can walk to is tried, plus the chair, and at each one the
// BOOK's own thumb box is asked for and clicked on the glass — three points down it, because a
// 16 px spine grown to a 44 px box is mostly margin and the arbiter answers to the drawing first.
// What the arbiter calls the thing is reported where it answers and is not a condition: the claim
// is that a real click, at a place a visitor can stand, put the book up.
async function openTheBook(page, w, h) {
  const places = await page.evaluate(() => window.__theatre.pieces.walk.places ?? []);
  for (const place of [null, ...places]) {
    if (place) {
      // THE VISITOR IS PUT AT THE PLACE AND THE LENS IS CUT THERE, rather than walked. `go` is what
      // makes the room think somebody is standing at it — that is the thing a switch asks about —
      // and the dolly that follows is three seconds of drawing ON THE TWELVES, which in a headless
      // browser on software GL is minutes a place. The cut lands the lens on the same shot the walk
      // would have ended on, so what is clicked afterwards is the picture a visitor has in front of
      // them; only the travelling is skipped.
      const went = await page.evaluate((n) => {
        const W = window.__theatre.pieces.walk;
        W.go(n); // not awaited: the dolly is what is being skipped
        window.__theatre.pieces.camera?.cut?.(W.shots?.[n] ?? n);
        return W.at === n;
      }, place);
      if (!went) {
        console.log(`   …${place}: the room would not have the visitor there just now`);
        continue;
      }
      // the lens is already on the shot; this only lets whatever the cut started come to rest
      await page.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: 20000, polling: 250 }).catch(() => {});
      // AND TWO DRAWINGS ARE WAITED FOR, because a cut sets the shot and the camera lays the pose on
      // in its own update: read the glass before that and every box is projected off the lens's last
      // position, which is a box in the wrong half of the room.
      await frames(page, 2);
    }
    const box = await page.evaluate(() => {
      const B = window.__theatre.pieces.walk.books;
      return B.tapBox?.('TAROT') ?? (B.spineBoxes?.() ?? [])[0] ?? null;
    });
    // NOT ON THIS WINDOW'S GLASS. A projected box can be anywhere — behind the lens, off the left,
    // half a screen past the right — and a click outside the window is a click at nothing, so a box
    // that does not overlap the frame is passed over rather than poked at.
    const on = box && box.x + box.w > 0 && box.y + box.h > 0 && box.x < w && box.y < h;
    console.log(`   …${place ?? 'the chair'}: ${box ? `the book's box is ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.w)}x${Math.round(box.h)}${on ? '' : ' — off the glass'}` : 'no box for the book'}`);
    if (!on) continue;
    for (const at of [0.5, 0.3, 0.7]) {
      const x = box.x + box.w / 2, y = box.y + box.h * at;
      const who = await page.evaluate(([px, py]) => window.__theatre.pieces.props.switches.at(px, py), [x, y]);
      await page.mouse.click(x, y);
      const s = await state(page); // the book goes up inside the click; no frame is waited for
      console.log(`      a click at ${Math.round(x)},${Math.round(y)} — the arbiter says ${who ?? 'nothing'}, the book is ${s.showing ? 'UP' : 'down'}`);
      if (s.showing) return { place: place ?? 'the chair', who: who ?? 'nothing the arbiter names', box, at };
    }
  }
  return null;
}

const browser = await chromium.launch(LAUNCH);
for (const [w, h] of [PLATE, PHONE]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/?shot=1`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  console.log(`\n=== ${w}x${h}`);

  // ---- the three that do not open ---------------------------------------------------------------
  const closed = await page.evaluate((names) => {
    const B = window.__theatre.pieces.walk.books;
    return names.map((n) => ({ n, box: B.tapBox(n) ?? null, opens: B.open(n) }));
  }, SHUT);
  claim(closed.every((r) => !r.box && r.opens === false), `the three shut books are books on a shelf: ${closed.map((r) => `${r.n} ${r.box ? 'HAS A BOX' : 'no box'}/${r.opens}`).join(', ')}`);

  // ---- a real click on whatever opens it ---------------------------------------------------------
  const trigger = await openTheBook(page, w, h);
  claim(!!trigger, `a real click opens the book${trigger ? ` — ${trigger.who}, worked from ${trigger.place}, box ${Math.round(trigger.box.w)}x${Math.round(trigger.box.h)} px` : ': NOTHING IN THE ROOM OPENED IT — see the places above'}`);
  // AND THE BOOK IS PROVED EITHER WAY. The trigger is not this proof's work and it is being moved
  // from the tall case to a reading table while this is written; when the room has nothing that
  // opens the book the claim above goes red and stays red, and the sheet is put up through the
  // piece's own api so that everything below — the contents, the corner, all seventy-eight plates —
  // is still turned through and measured rather than skipped for want of a switch.
  if (!trigger) {
    const up = await page.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
    console.log(`   …so the sheet is put up through the piece itself (open() answers ${up}) and the rest is proved on it`);
    await frames(page, 2);
    if (!(await state(page)).showing) {
      await page.close();
      continue;
    }
  }
  const open = await state(page);
  claim(open.showing && open.title === 'TAROT', `…and what stands over the room is TAROT BY PEPE (${open.title})`);
  await stopTheRoom(page); // the walk is done; from here the paper is the only thing that moves
  console.log(`   the book is ${open.leaves} leaves, set at a ${open.cap} px cap, ${open.spread ? 'as a spread' : 'one page at a time'}; the sheet is ${open.box.w}x${open.box.h} px`);

  // ---- the contents ------------------------------------------------------------------------------
  const index = await page.evaluate(() => window.__theatre.pieces.walk.books.index);
  const sheet = await page.evaluate(() => window.__theatre.pieces.walk.books.sheetLeaves);
  console.log(`   the contents runs to ${open.indexLeaves} leaves at folio ${open.indexAt + 1}, ${index.length} lines`);
  const wantHeads = new Set(DECK.map((c) => headOf(c.slug)));
  const cards = index.filter((ln) => wantHeads.has(ln.label));
  claim(cards.length === CARDS, `every one of the ${CARDS} cards has a line in the contents (${cards.length})`);
  for (const want of ['WHAT THE CARDS ARE', 'A CARD IS A MIRROR', 'CUPS', 'PENTACLES', 'SWORDS', 'WANDS', 'THE LAST PAGE']) {
    claim(index.some((ln) => ln.label === want), `«${want}» is in the contents`);
  }
  claim(index.every((ln) => ln.folio === String(ln.target + 1)), 'and every folio lettered on the list is the leaf it points at');
  claim(sheet.filter((x) => String(x).startsWith('plate:')).length === CARDS, `the book's own list of leaves agrees: ${sheet.filter((x) => String(x).startsWith('plate:')).length} plates, ${sheet.filter((x) => x === 'index').length} leaves of contents, ${sheet.filter((x) => x === 'blank').length} printer's blanks`);
  // a plate is followed by its own text: the pair a visitor is meant to be looking at
  const orphans = sheet.map((x, i) => [x, i]).filter(([x]) => String(x).startsWith('plate:')).filter(([x, i]) => sheet[i + 1] !== headOf(String(x).slice(6)));
  claim(orphans.length === 0, `and every plate is faced by its own take (${orphans.map(([x, i]) => `${x}@${i}`).join(', ') || 'none out of place'})`);

  // ---- EVERY LINE OF THE CONTENTS, CLICKED ------------------------------------------------------
  // The visitor's own way in: turn to the list, click a line, see where it lands, click the folded
  // corner to come back. The corner is expected to return to the leaf of the LIST that was left
  // from, not to the top of it, so the next line is under the pointer where it was.
  const opening = (leaf) => (open.spread ? leaf - (leaf % 2) : leaf); // what a visitor is looking at
  const goIndex = async () => {
    await page.evaluate(() => window.__theatre.pieces.walk.books.goLeaf(window.__theatre.pieces.walk.books.indexAt));
  };
  await goIndex();
  let checked = 0, wrong = [];
  const backFrom = { trump: null, pip: null, court: null };
  let guard = 0;
  while (guard++ < 40) {
    const hits = await page.evaluate(() => window.__theatre.pieces.walk.books.indexHits());
    if (!hits.length) break;
    const was = (await state(page)).leaf;
    for (const hit of hits) {
      await page.mouse.click(hit.x + Math.min(40, hit.w / 2), hit.y + hit.h / 2);
      const saw = await seeing(page);
      // the leaf it landed on is either that card's own plate or a leaf whose running head is the line
      const isPlate = saw.kind === `plate:${slugOf(hit.label)}`;
      const isHead = saw.kind === hit.label || String(saw.text).includes(hit.label);
      if (!(isPlate || isHead)) wrong.push(`${hit.text} → ${saw.kind}`);
      checked++;
      // …AND THE WAY BACK, on one trump, one pip and one court card — which is what the corner has
      // to be proved on, and a click apiece rather than on all eighty-five, because every one of
      // those clicks is a second of somebody's afternoon. Everywhere else the proof puts itself
      // back on the list and carries on down it.
      const kind = /^(ACE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN) OF /.test(hit.label) ? 'pip'
        : /^(PAGE|KNIGHT|QUEEN|KING) OF /.test(hit.label) ? 'court'
          : wantHeads.has(hit.label) ? 'trump' : null;
      if (kind && !backFrom[kind]) {
        const folds = await page.evaluate(() => window.__theatre.pieces.walk.books.foldBoxes());
        if (!folds.length) {
          backFrom[kind] = { label: hit.label, to: -1, home: false };
          wrong.push(`${hit.text}: no folded corner on the leaf it landed on`);
        } else {
          await page.mouse.click(folds[0].x + folds[0].w / 2, folds[0].y + folds[0].h / 2);
          const b = await state(page);
          const home = sheet[b.leaf] === 'index' && opening(b.leaf) === opening(hit.leaf);
          backFrom[kind] = { label: hit.label, to: b.leaf, home, folds: folds.length };
          if (!home) wrong.push(`${hit.text}: the corner went to leaf ${b.leaf + 1}, not back to the list at ${hit.leaf + 1}`);
        }
      }
      await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), was);
    }
    // on to the next leaf of the list, by clicking the paper above the lines — inside the list the
    // lines answer first and the margins still turn the leaf
    const b = (await state(page)).box;
    await page.mouse.click(b.x + b.w * 0.75, b.y + 8);
    const now = await state(page);
    if (now.leaf === was || sheet[now.leaf] !== 'index') break;
  }
  claim(checked === index.length, `every one of the ${index.length} lines of the contents was clicked on the glass (${checked})`);
  claim(wrong.length === 0, `and every one of them landed on its own page (${wrong.slice(0, 4).join(', ') || 'no line missed'})`);
  for (const k of ['trump', 'pip', 'court']) {
    const r = backFrom[k];
    claim(!!r && r.home, `the folded corner on a ${k} page goes back to the list${r ? ` (${r.label}: to leaf ${r.to + 1}, the leaf of the list it was left from)` : ': NEVER TRIED'}`);
  }

  // ---- the contents, drawn ------------------------------------------------------------------------
  await goIndex();
  await page.screenshot({ path: `${OUT}/index-${w}x${h}.png` });

  // ---- every leaf turned through, and every plate counted -----------------------------------------
  await page.evaluate(() => window.__theatre.pieces.walk.books.goLeaf(0));
  const seen = new Set();
  const texts = [];
  const plates = [];
  let shotPip = false, shotCourt = false;
  guard = 0;
  const body = []; // …and the same words with the CONTENTS left out of them
  let saw = await seeing(page);
  while (guard++ < 400) {
    const s = saw;
    seen.add(s.leaf);
    texts.push(saw.text);
    // a card's name is lettered twice in this book — on its own leaf and in the list — so what is
    // read back off the leaves is kept apart from what is read back off the contents, or the list
    // would answer for a page nobody turned to
    if (!(sheet[s.leaf] === 'index' || sheet[s.leaf + 1] === 'index')) body.push(saw.text);
    // THE CARD, COUNTED IN PIXELS. `card` is the plate's box on the glass; the count is of pixels
    // inside it that are NOT the room's paper — the card's own ink and colour. A plate that failed
    // to load, or one the DOM put somewhere else, counts nothing and fails here rather than in a
    // screenshot somebody has to look at.
    const card = saw.card;
    if (card) {
      await plateReady(page);
      const shot = await page.screenshot({ clip: { x: Math.max(0, card.x), y: Math.max(0, card.y), width: Math.min(card.w, w - card.x), height: Math.min(card.h, h - card.y) } });
      const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
      let ink = 0;
      for (let q = 0; q < data.length; q += info.channels) {
        if (data[q] < 200 || data[q + 1] < 200 || data[q + 2] < 200) ink++;
      }
      plates.push({ slug: card.slug, leaf: s.leaf, w: card.w, h: card.h, frac: ink / (info.width * info.height) });
      if (!shotPip && card.slug === 'seven-of-pentacles') {
        shotPip = true;
        await page.screenshot({ path: `${OUT}/pip-${w}x${h}.png` });
      }
      if (!shotCourt && card.slug === 'queen-of-swords') {
        shotCourt = true;
        await page.screenshot({ path: `${OUT}/court-${w}x${h}.png` });
      }
    }
    // the right page: forward. INSIDE THE CONTENTS the middle of the page is a line of the list and
    // a click on it is a jump, which is the whole point of the list — so the leaf is turned from the
    // paper above the lines there, exactly as a reader would have to.
    const b = s.box;
    const onList = sheet[s.leaf] === 'index' || sheet[s.leaf + 1] === 'index';
    await page.mouse.click(b.x + b.w * 0.75, onList ? b.y + 8 : b.y + b.h * 0.5);
    saw = await seeing(page);
    if (saw.leaf === s.leaf) break; // the last leaf
  }
  const thin = plates.filter((q) => q.frac < 0.25);
  console.log(`   ${plates.length} plates were on the glass; the lightest carried ${(Math.min(...plates.map((q) => q.frac)) * 100).toFixed(1)}% ink, the heaviest ${(Math.max(...plates.map((q) => q.frac)) * 100).toFixed(1)}%, each ${plates[0]?.w}x${plates[0]?.h} px`);
  claim(plates.length === CARDS, `every one of the ${CARDS} cards was reached in turn with its plate on the page (${plates.length} seen)`);
  const missed = DECK.map((c) => c.slug).filter((s) => !plates.some((q) => q.slug === s));
  claim(missed.length === 0, `and the set is the deck's own (${missed.join(', ') || 'nothing missing'})`);
  claim(thin.length === 0, `every plate is actually drawn on the page — none under a quarter ink (${thin.map((q) => `${q.slug} ${(q.frac * 100).toFixed(1)}%`).join(', ') || 'none'})`);
  const all = texts.join(' ');
  const read = body.join(' ');
  const unread = DECK.map((c) => headOf(c.slug)).filter((head) => !read.includes(head));
  claim(unread.length === 0, `and every card's take was read off the leaf facing it, the contents not counted (${unread.join(', ') || 'all 78 read back'})`);
  const end = await state(page);
  claim(end.leaf === end.leaves - 1, `every leaf was turned through by clicking the right page: ${seen.size} stops, ending on leaf ${end.leaf + 1} of ${end.leaves}`);
  for (const want of ['JODOROWSKY', 'MARSEILLE', 'WHAT IS IN IT']) claim(all.includes(want), `«${want}» is printed in it`);
  claim(!/�/.test(all), 'and there is no sort in it the signwriter does not own');

  // ---- back the other way, then out ---------------------------------------------------------------
  await startTheRoom(page); // the room is given its frames back: putting the book down is the room's
  await frames(page, 2);
  const bb = (await state(page)).box;
  await page.mouse.click(bb.x + bb.w * 0.25, bb.y + bb.h * 0.5);
  await frames(page, 2);
  const back = await state(page);
  claim(back.leaf < end.leaf, `a click on the left page turns back (${end.leaf + 1} → ${back.leaf + 1})`);
  const was = await page.evaluate(() => window.__theatre.pieces.walk.at);
  await page.mouse.click(4, 4);
  await frames(page, 2);
  const shut = await state(page);
  claim(!shut.showing && shut.at === was, `a click off the paper puts the book down and leaves the visitor where they were (${shut.at})`);
  await page.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
  await frames(page, 3);
  await page.keyboard.press('Escape');
  await frames(page, 2);
  const esc = await state(page);
  claim(!esc.showing && esc.at === was, `Escape puts the book down and does NOT walk the visitor home (${esc.at})`);
  console.log(`   errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  if (errors.length) bad++;
  await page.close();
}
console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser.close();
process.exit(bad ? 1 : 0);
