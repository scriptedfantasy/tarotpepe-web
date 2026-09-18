#!/usr/bin/env node
// TAROT BY PEPE, OPENED ON THE TABLE LIKE A VISITOR AND READ RIGHT THROUGH (src/pieces/walk-book.js,
// walk-book-page.js). The book stopped being a sheet over the room this round and became an object
// on the reading table, so every claim below is about a thing in the scene: a board that swings, a
// leaf that turns, a ribbon sticking out of a block of paper.
//
//   the TRIGGER   whatever the room actually registers for the book, found rather than assumed: the
//                 proof walks every place walk.js offers, asks the arbiter what is under every box
//                 the room offers for this book, and clicks the first one that answers
//   the SWING     the board's own drawings, counted off the piece while it goes over, with a PNG of
//                 it halfway and the closed book beside it for the silhouette
//   the CAP       the leaf's four corners on the glass, and the running head's own INK measured in
//                 that box — the cap a visitor's eye gets, not the one the pagination asked for
//   the TURN      a right-page turn and a left-page turn by REAL CLICKS, with the leaf caught in the
//                 air (the loop is stopped on the drawing, so the PNG is that drawing)
//   the CONTENTS  every line of the list clicked on the glass and the leaf it lands on read back
//   the RIBBON    clicked from a trump, a pip and a court page, each putting the visitor back on the
//                 opening of the list they left from
//   the PLATES    all seventy-eight card leaves reached, each one's plate measured ON THE GLASS and
//                 its ink counted inside its own box
//   the WAY OUT   a click off the book shuts it and leaves the visitor at the table; a second one
//                 walks them back to the chair; and Escape does the same
//   the DRAWING   /tmp/book3d/*.png at 1280x800 and 390x844
//   the TIME      frame time at the reading shot with the book open, at 1600x900 and dpr 2, against
//                 the same shot with the book shut
//
//   BASE=http://127.0.0.1:8739 node tools/_book-proof.mjs
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
const OUT = args.out ?? '/tmp/book3d';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800];
const PHONE = [390, 844];
// HOW LONG A READING OFF THE GLASS IS GIVEN. Playwright's own default is thirty seconds, and on a
// software renderer under load a clipped capture has twice run past it and thrown — killing a run
// in which every claim had already held, once in the plate sweep and once on the last souvenir.
// These screenshots are MEASUREMENTS; the right answer to a slow one is to wait for it.
const SHOT_MS = 120000;
const SHUT = ['MARSEILLE', 'CHIROMANCIE', 'LE DESTIN'];
const CARDS = DECK.length;
const headOf = (slug) => slug.replace(/-/g, ' ').toUpperCase();
const slugOf = (head) => head.toLowerCase().replace(/ /g, '-');

const LAUNCH = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] };
const stub = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });
let bad = 0;
const claim = (b, text) => {
  if (!b) bad++;
  console.log(`   ${b ? '✓' : '✗'} ${text}`);
};
const frames = (p, n = 2) => p.evaluate((k) => new Promise((res) => { let i = k; const go = () => (i-- <= 0 ? res() : requestAnimationFrame(go)); go(); }), n);
// a point inside a box, kept on this window's glass — a box at the very edge of a narrow frame has
// a middle a mouse can still be asked for and a click outside the window is a click at nothing
const at = (box, w, h, fx = 0.5, fy = 0.5) => [
  Math.max(2, Math.min(w - 2, box.x + box.w * fx)),
  Math.max(2, Math.min(h - 2, box.y + box.h * fy)),
];
// THE LOOP IS HELD TO TAKE A PICTURE OF ONE DRAWING, and given back at once. A motion in this book
// advances one drawing per rendered frame (the clock is the paper's: `clock.stepped`) and a
// screenshot itself costs a frame, so a PNG of "the leaf halfway over" taken while the room is
// running is a PNG of two drawings later. Holding the loop freezes the canvas on the drawing that
// was last composited, which is the one the piece says it is on.
//
// AND THE CALLBACKS ARE QUEUED RATHER THAN THROWN AWAY, which is the whole of why this works. The
// room's loop re-books itself by calling requestAnimationFrame at the end of every frame; replace
// that with a function that returns 0 and the loop asks once, is refused, and is NEVER ASKED AGAIN —
// putting the real one back afterwards restores nothing, because there is nobody left to call it.
// Measured before the fix: the board drew four of its eight drawings and the camera stopped halfway
// through its dolly, so the leaf measured 292 px where it is 425. So the hold KEEPS every callback
// it was handed and hands them all back on the way out, and the room carries on from where it was.
const hold = (p) => p.evaluate(() => {
  window.__q = [];
  window.__raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => (window.__q.push(cb), 0);
});
// ONE DRAWING AT A TIME. With the loop held, a step is: run everything the room has queued (which is
// one turn of its loop, and the render with it) and then let the browser paint. So a PNG of "the leaf
// on drawing two" is drawing two and not two drawings later, which is what every earlier attempt at
// this got — the click, the read and the screenshot are three round trips and the room draws through
// all of them.
const step = (p, n = 1) => p.evaluate(async (k) => {
  for (let i = 0; i < k; i++) {
    const q = window.__q ?? [];
    window.__q = [];
    for (const cb of q) cb(performance.now());
    await new Promise((r) => window.__raf(r));
  }
}, n);
const letGo = (p) => p.evaluate(() => {
  if (!window.__raf) return;
  window.requestAnimationFrame = window.__raf;
  window.__raf = null;
  const q = window.__q ?? [];
  window.__q = null;
  for (const cb of q) window.requestAnimationFrame(cb);
});
const rest = (p) => p.waitForFunction(() => !window.__theatre.pieces.walk.books.busy && !window.__theatre.pieces.camera.moving, null, { timeout: 120000 }).catch(() => {});
const still = (p) => p.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: 120000 }).catch(() => {});
const state = (p) => p.evaluate(() => {
  const B = window.__theatre.pieces.walk.books;
  return { showing: B.showing, title: B.title, leaf: B.leaf, leaves: B.leaves, cap: B.cap, spread: B.spread, shot: B.shot, bound: B.bound, at: window.__theatre.pieces.walk.at, indexAt: B.indexAt, indexLeaves: B.indexLeaves, busy: B.busy };
});
const seeing = (p) => p.evaluate(() => {
  const B = window.__theatre.pieces.walk.books;
  return { leaf: B.leaf, kind: B.sheetLeaves[B.leaf] ?? '?', next: B.sheetLeaves[B.leaf + 1] ?? '?', text: B.text() ?? '', card: B.card };
});
// the darkest row and the lightest, inside a box on the glass: how tall the INK in it stands
async function inkRows(page, box, w, h) {
  const clip = { x: Math.max(0, Math.round(box.x)), y: Math.max(0, Math.round(box.y)), width: Math.min(Math.round(box.w), w - Math.round(box.x)), height: Math.min(Math.round(box.h), h - Math.round(box.y)) };
  if (clip.width < 2 || clip.height < 2) return null;
  const shot = await page.screenshot({ clip, timeout: SHOT_MS });
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  let top = -1, bot = -1, ink = 0;
  for (let y = 0; y < info.height; y++) {
    let row = 0;
    for (let x = 0; x < info.width; x++) {
      const q = (y * info.width + x) * info.channels;
      if (data[q] < 140 && data[q + 1] < 140 && data[q + 2] < 140) row++;
    }
    ink += row;
    if (row > 0) {
      if (top < 0) top = y;
      bot = y;
    }
  }
  return { top, bot, rows: bot - top + 1, ink, w: info.width, h: info.height };
}

// TWO PNGs OF THE SAME BOX, AND WHAT MOVED BETWEEN THEM. A pose table is a piece's word for what it
// meant to draw; this is the only way to ask the GLASS whether anything happened. Two clips of the
// same rectangle, compared channel by channel with a threshold that is well past the boil — the two
// facing pages are re-struck with a fresh nib every other drawing and that wobbles a stroke by a
// pixel, so anything under a two-fifths change on a single channel is the pen breathing and not the
// book moving. Returns how much of the box changed and the box the change itself sits in.
function moved(a, b, cut = 40) {
  const W = Math.min(a.info.width, b.info.width), H = Math.min(a.info.height, b.info.height);
  let n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = (y * a.info.width + x) * a.info.channels, q = (y * b.info.width + x) * b.info.channels;
      if (Math.abs(a.data[p] - b.data[q]) < cut && Math.abs(a.data[p + 1] - b.data[q + 1]) < cut && Math.abs(a.data[p + 2] - b.data[q + 2]) < cut) continue;
      n++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { px: n, pct: +((100 * n) / (W * H)).toFixed(1), w: n ? x1 - x0 + 1 : 0, h: n ? y1 - y0 + 1 : 0, box: [x0, y0, x1, y1] };
}
// …and a box is only a clip if it is ON THE GLASS. A projected box belongs to the frame it was
// projected in and a phone's frame holds ONE leaf of this book: the leaf a turn lands on is off the
// side of it, so the fore-edge the piece reports is at a negative x and a screenshot asked for that
// rectangle throws. Null means «not in the picture», and the caller says so instead of dying.
const clipOf = (box, w, h) => {
  if (!box) return null;
  const x = Math.max(0, Math.round(box.x)), y = Math.max(0, Math.round(box.y));
  const width = Math.min(Math.round(box.x + box.w) - x, w - x), height = Math.min(Math.round(box.y + box.h) - y, h - y);
  if (width < 2 || height < 2 || x >= w || y >= h) return null;
  return { x, y, width, height };
};
const raw = async (page, clip) => (clip ? sharp(await page.screenshot({ clip, timeout: SHOT_MS })).raw().toBuffer({ resolveWithObject: true }) : null);

// HIS GREEN IN A BOX. The one colour in this room outside the card faces is Pepe's skin (pepe.js
// SKIN #69b964, hsl(116 38% 56%)), so "is he on the cover" is a question a proof can answer by
// counting: a pixel is his if its green channel leads both the others by 14 and is not a dark line.
// Paper is neutral and ink is dark, so nothing else on that board can answer to it.
async function greenIn(page, box, w, h) {
  const clip = { x: Math.max(0, Math.round(box.x)), y: Math.max(0, Math.round(box.y)), width: Math.min(Math.round(box.w), w - Math.round(box.x)), height: Math.min(Math.round(box.h), h - Math.round(box.y)) };
  if (clip.width < 2 || clip.height < 2) return null;
  const { data, info } = await sharp(await page.screenshot({ clip, timeout: SHOT_MS })).raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < info.width * info.height; i++) {
    const q = i * info.channels;
    if (data[q + 1] > data[q] + 14 && data[q + 1] > data[q + 2] + 14 && data[q + 1] > 70) n++;
  }
  return { px: n, of: info.width * info.height, w: info.width, h: info.height };
}

// THE TRIGGER, FOUND RATHER THAN KNOWN — the old proof's own sweep, kept. The book is opened by
// something in the room and what that something is is not this proof's business.
async function openTheBook(page, w, h, reset) {
  const places = await page.evaluate(() => window.__theatre.pieces.walk.places ?? []);
  let first = true;
  for (const place of [null, ...places]) {
    if (!first) await reset();
    first = false;
    if (place) {
      const went = await page.evaluate((n) => {
        const W = window.__theatre.pieces.walk;
        W.go(n);
        window.__theatre.pieces.camera?.cut?.(W.shots?.[n] ?? n);
        return W.at === n;
      }, place);
      if (!went) {
        console.log(`   …${place}: the room would not have the visitor there just now`);
        continue;
      }
      await still(page);
      await frames(page, 2);
    }
    const candidates = await page.evaluate(() => {
      const B = window.__theatre.pieces.walk.books, P = window.__theatre.pieces.props;
      const all = [B.tapBox?.('TAROT') ?? null, ...(B.spineBoxes?.() ?? []), P?.table?.tapBox?.() ?? null].filter(Boolean);
      const seen = new Set();
      return all.filter((b) => {
        const k = `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.w)},${Math.round(b.h)}`;
        return seen.has(k) ? false : (seen.add(k), true);
      });
    });
    if (!candidates.length) console.log(`   …${place ?? 'the chair'}: no box for the book`);
    for (const box of candidates) {
      const on = box.x + box.w > 0 && box.y + box.h > 0 && box.x < w && box.y < h;
      console.log(`   …${place ?? 'the chair'}: the book's box is ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.w)}x${Math.round(box.h)}${on ? '' : ' — off the glass'}`);
      if (!on) continue;
      for (const at of [0.5, 0.3, 0.7]) {
        const x = box.x + box.w / 2, y = box.y + box.h * at;
        const who = await page.evaluate(([px, py]) => window.__theatre.pieces.props.switches.at(px, py), [x, y]);
        await page.mouse.click(x, y);
        const s = await state(page);
        console.log(`      a click at ${Math.round(x)},${Math.round(y)} — the arbiter says ${who ?? 'nothing'}, the book is ${s.showing ? 'UP' : 'down'}`);
        if (s.showing) return { place: place ?? 'the chair', who: who ?? 'nothing the arbiter names', box, at };
      }
    }
  }
  return null;
}

const browser = await chromium.launch(LAUNCH);
for (const [w, h] of [PLATE, PHONE]) {
  const tag = `${w}x${h}`;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  const load = async () => {
    await page.goto(`${BASE}/?shot=1`, { waitUntil: 'load', timeout: 300000 });
    await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  };
  await load();
  console.log(`\n=== ${tag}`);

  // ---- the three that do not open --------------------------------------------------------------
  const closed = await page.evaluate((names) => {
    const B = window.__theatre.pieces.walk.books;
    return names.map((n) => ({ n, box: B.tapBox(n) ?? null, opens: B.open(n) }));
  }, SHUT);
  claim(closed.every((r) => !r.box && r.opens === false), `the three shut books are books on a shelf: ${closed.map((r) => `${r.n} ${r.box ? 'HAS A BOX' : 'no box'}/${r.opens}`).join(', ')}`);

  // ---- AND HE IS ON THE COVER, before anybody opens it ------------------------------------------
  // The user: "tarot by pepe should have tarotpepe on the cover btw." The board carries a plate with
  // his own face in it (props-table.js), and his skin is the one colour in this room outside the
  // cards — so the claim is his GREEN, counted inside the plate's own box, and counted again in the
  // band above it where the title is and where there must be none. The page is loaded again
  // afterwards so that the sweep for the trigger still begins in a room nobody has touched.
  {
    await page.evaluate(() => window.__theatre.pieces.walk.go('table'));
    await page.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: 120000 }).catch(() => {});
    await frames(page, 3);
    const plate = await page.evaluate(() => window.__theatre.pieces.props.table.plateBox());
    const board = await page.evaluate(() => window.__theatre.pieces.props.table.hitBox());
    const g1 = plate ? await greenIn(page, plate, w, h) : null;
    claim(!!g1 && g1.px > 200, `he is on the cover of his own book: ${g1?.px} px of his green inside the plate's own ${Math.round(plate?.w)}x${Math.round(plate?.h)} px box, on a board ${Math.round(board?.w)}x${Math.round(board?.h)} px on the glass`);
    // …and the two bands the lettering sits in are lettering and nothing else. He fills nearly the
    // whole board now (the plate is square, because a man sitting cross-legged is), so the question
    // of whether TAROT and BY PEPE still have board of their own is a question about his green
    // being INSIDE the frame and nowhere else.
    const above = board && plate ? await greenIn(page, { x: board.x, y: board.y, w: board.w, h: Math.max(2, plate.y - board.y) }, w, h) : null;
    const below = board && plate ? await greenIn(page, { x: board.x, y: plate.y + plate.h, w: board.w, h: Math.max(2, board.y + board.h - plate.y - plate.h) }, w, h) : null;
    claim(!!above && above.px === 0 && !!below && below.px === 0, `and both bands of lettering are lettering: ${above?.px} px of green above the plate where TAROT is, ${below?.px} below it where BY PEPE is`);
    await page.screenshot({ path: `${OUT}/cover-${tag}.png` });
    // …and the board on its own at 3x, nearest-neighbour, so the plate can be looked at at the size
    // it was drawn rather than the size it is printed
    if (board) {
      const c = { x: Math.max(0, Math.round(board.x)), y: Math.max(0, Math.round(board.y)), width: Math.min(Math.round(board.w), w - Math.round(board.x)), height: Math.min(Math.round(board.h), h - Math.round(board.y)) };
      if (c.width > 2 && c.height > 2) {
        await sharp(await page.screenshot({ clip: c, timeout: SHOT_MS })).resize({ width: c.width * 3, kernel: 'nearest' }).toFile(`${OUT}/cover-crop-${tag}.png`);
      }
    }
    await load();
  }

  // ---- the closed book on the table, and the click that opens it --------------------------------
  const trigger = await openTheBook(page, w, h, load);
  claim(!!trigger, `a real click opens the book${trigger ? ` — ${trigger.who}, worked from ${trigger.place}, box ${Math.round(trigger.box.w)}x${Math.round(trigger.box.h)} px` : ': NOTHING IN THE ROOM OPENED IT'}`);
  if (!trigger) {
    const up = await page.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
    console.log(`   …so the book is put up through the piece itself (open() answers ${up}) and the rest is proved on it`);
  }

  // ---- THE SWING, counted ------------------------------------------------------------------------
  // The click above has already started it; the drawings are collected as they go past.
  // A DRAWING IS COUNTED BY THE PIECE AND NOT BY THIS PROOF. The book advances one drawing per drawn
  // frame, and an `evaluate` asking «what drawing are you on» spends whole drawings in flight: polled
  // from here, three of the board's eight is the most that can ever be seen. So the piece keeps the
  // angles it actually put on the glass (`drew`) and they are read back when it has stopped.
  await rest(page);
  const swing = await page.evaluate(() => window.__theatre.pieces.walk.books.drew);
  claim(swing?.kind === 'swing' && swing.drawings === 12, `the front board goes over in ${swing?.drawings} drawings on the twelves, at ${swing?.angles.join(', ')} degrees about the joint`);
  await frames(page, 3);
  const open = await state(page);
  claim(open.showing && open.title === 'TAROT', `…and what is lying open on the table is TAROT BY PEPE (${open.title}), at the ${open.shot} shot`);
  // …and the cover has gone face down on the table with him on it, so there is no green in the room
  {
    const g = await greenIn(page, { x: 0, y: 0, w, h }, w, h);
    claim(!!g && g.px === 0, `…and open, he is not in the picture at all: ${g?.px} px of green in the whole ${w}x${h} frame, the board being face down on the table`);
  }
  console.log(`   ${open.bound.pages} pages bound in ${open.bound.leaves} leaves of ${open.bound.leafMm} mm; the page is ${open.bound.page[0]}x${open.bound.page[1]} px on the glass, its texture ${open.bound.texture[0]}x${open.bound.texture[1]}, ${open.bound.faces} faces struck`);
  await page.screenshot({ path: `${OUT}/open-${tag}.png` });

  // …AND THE SAME CLICK AGAIN, ONE DRAWING AT A TIME, for a picture of the board in the air. The book
  // is shut and opened by a REAL CLICK on the same box, with the loop held from before the click, so
  // the frame that is caught is the drawing the piece says it is on.
  {
    await page.evaluate(() => window.__theatre.pieces.walk.books.close());
    await rest(page);
    await frames(page, 2);
    // …and the box is read AFTER the lens has walked back to the reading shot, not before it. A
    // projected box belongs to the frame it was projected in: taken while the camera was still over
    // the open book, the click went nowhere and the board never moved.
    const bb = await page.evaluate(() => window.__theatre.pieces.props.table.tapBox());
    await hold(page);
    await step(page, 1);
    await page.mouse.click(bb.x + bb.w / 2, bb.y + bb.h / 2);
    let shown = null;
    for (let k = 0; k <= 3; k++) {
      await step(page, 1);
      shown = await page.evaluate(() => window.__theatre.pieces.walk.books.swinging);
    }
    await page.screenshot({ path: `${OUT}/swing-${tag}.png` });
    claim(!!shown, `…and the board is caught in the air on drawing ${shown?.drawing} of ${shown?.drawings}, at ${shown?.angle} degrees`);

    // ---- AND IT LANDS WITH A BOUNCE, measured in the PNGs and not read off the table ------------
    // The board meets the table on drawing 8 and rebounds nine and a half degrees on drawing 9, and
    // from a plan view that rebound is worth almost nothing on its own: the fore-edge foreshortens
    // 2.3 mm toward the joint and perspective carries it 3.1 mm the other way, so the two very
    // nearly cancel and an honest bounce is under three pixels. What carries the landing at this
    // shot is the BLOCK — it runs six millimetres past its own squaring-up on the drawing the board
    // lands and comes back over the two after it. So the claim is measured on both: the pixels that
    // change inside the board's own box (the board is doing something) and the width of the change
    // across the whole book (the block is settling under it).
    let landed = null, bounced = null, wide2 = null, bookBox = null;
    // …and the loop is given more turns than there are drawings, because a HELD loop stalls: a
    // step that takes less than a twelfth of a second does not advance the clock and the same
    // drawing comes back twice. Drawings never skip, so the count is only ever a question of
    // patience.
    for (let k = 0; k < 30; k++) {
      await step(page, 1);
      const m = await page.evaluate(() => window.__theatre.pieces.walk.books.moving);
      if (!m) break;
      if (m.drawing === 8) {
        bookBox = m.block && m.board ? {
          x: Math.min(m.block.x, m.board.x) - 6, y: Math.min(m.block.y, m.board.y) - 6,
          w: Math.max(m.block.x + m.block.w, m.board.x + m.board.w) - Math.min(m.block.x, m.board.x) + 12,
          h: Math.max(m.block.y + m.block.h, m.board.y + m.board.h) - Math.min(m.block.y, m.board.y) + 12,
        } : null;
        landed = { m, board: await raw(page, clipOf(m.board, w, h)), all: bookBox ? await raw(page, clipOf(bookBox, w, h)) : null };
        const c0 = clipOf(bookBox ?? m.board, w, h);
        if (c0) await page.screenshot({ path: `${OUT}/land-${tag}.png`, clip: c0 });
      } else if (m.drawing === 9 && landed) {
        bounced = { m, board: await raw(page, clipOf(landed.m.board, w, h)), all: bookBox ? await raw(page, clipOf(bookBox, w, h)) : null };
        const c1 = clipOf(bookBox ?? m.board, w, h);
        if (c1) await page.screenshot({ path: `${OUT}/bounce-${tag}.png`, clip: c1 });
        break;
      }
    }
    if (landed && bounced && landed.board && bounced.board) {
      const onBoard = moved(landed.board, bounced.board);
      const onAll = landed.all && bounced.all ? moved(landed.all, bounced.all) : null;
      const slid = Math.round(Math.abs(bounced.m.block.x - landed.m.block.x) + Math.abs(bounced.m.block.y - landed.m.block.y));
      claim(onBoard.px > 300, `…and it LANDS WITH A BOUNCE: ${onBoard.px} px of the board's own ${Math.round(landed.m.board.w)}x${Math.round(landed.m.board.h)} px box change between the drawing it meets the table (${landed.m.angle}°) and the drawing after it (${bounced.m.angle}°) — ${onBoard.pct} % of it`);
      claim(!!onAll && onAll.w > 40, `…and the block settles under it: the change across the whole book runs ${onAll?.w} px wide, the block's own box moving ${slid} px as the 6 mm overshoot comes back`);
    } else claim(false, 'the board could not be caught on its landing and its bounce');
    await letGo(page);
    await rest(page);
    await frames(page, 2);
  }

  // ---- THE CAP, measured in ink on the glass -----------------------------------------------------
  const lb = await page.evaluate(() => window.__theatre.pieces.walk.books.leafBox());
  const hb = await page.evaluate(() => window.__theatre.pieces.walk.books.headBox());
  const headInk = hb ? await inkRows(page, hb, w, h) : null;
  claim(!!lb && lb.w > 100, `the leaf is ${lb?.w}x${lb?.h} px on the glass${open.spread ? ' (the whole spread is in the frame)' : ' (one leaf at a time)'}`);
  claim(open.cap >= 13, `the book is set at a ${open.cap} px cap, against the film's floor of 13`);
  claim(!!headInk && headInk.rows >= 12, `and the running head measures ${headInk?.rows} px of INK on the glass in a box ${hb?.w}x${hb?.h} — the cap a visitor's eye actually gets`);

  // ---- THE TURN, by real clicks, with the leaf caught in the air ---------------------------------
  // from a page of his take rather than from the contents, where the middle of the page is a line of
  // the list and a click on it is a jump
  const idx = await page.evaluate(() => window.__theatre.pieces.walk.books.index);
  const aTrump = idx.find((ln) => ln.label === 'THE POPE') ?? idx[3];
  await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), aTrump.target + 1);
  await rest(page);
  await frames(page, 3);
  const before = await seeing(page);
  const box = await page.evaluate(() => window.__theatre.pieces.walk.books.leafBox());
  // on a spread the right page turns forward; on one leaf it is the right HALF of the page in front
  await hold(page);
  await step(page, 1);
  await page.mouse.click(box.x + box.w * (open.spread ? 0.5 : 0.78), box.y + box.h * 0.55);
  let caught = null, bowAt = null, bowRaw = null, band = null;
  for (let k = 0; k < 26; k++) {
    await step(page, 1);
    const t = await page.evaluate(() => window.__theatre.pieces.walk.books.turning);
    if (t && !t.lens) caught = t;
    // AND THE DRAWING THE BOW IS WORTH MOST, caught as it goes past. The leaf is a curve and not a
    // plate, and the whole of what that is worth on the glass is the gap between where its fore-edge
    // IS and where a flat plate at the same angle would have put it: the piece projects both through
    // this very frame (`moving`), and the widest of them is the drawing to measure.
    const m = await page.evaluate(() => window.__theatre.pieces.walk.books.moving);
    if (m?.kind === 'turn' && m.px > (bowAt?.px ?? 0) && m.leafBox) {
      const lo = Math.min(m.bowed[0], m.flat[0]), hi = Math.max(m.bowed[0], m.flat[0]);
      const b = { x: lo + (hi - lo) * 0.3, y: m.leafBox.y + m.leafBox.h * 0.3, w: (hi - lo) * 0.6, h: m.leafBox.h * 0.4 };
      const c = b.w >= 12 && b.h >= 12 ? clipOf(b, w, h) : null;
      if (c && c.width >= 12 && c.height >= 12) {
        bowAt = m;
        band = c;
        bowRaw = await raw(page, c);
      }
    }
    if (!t) break;
  }
  await page.screenshot({ path: `${OUT}/turn-${tag}.png` });
  await letGo(page);
  await rest(page);
  await frames(page, 3);
  const drewTurn = await page.evaluate(() => window.__theatre.pieces.walk.books.drew);
  claim(!!caught, `a click on the right page turns a leaf over the gutter — caught in the air on drawing ${caught?.drawing}${caught ? `, ${before.leaf + 1} → ${caught.to + 1}` : ''}`);
  claim(drewTurn?.kind === 'turn' && drewTurn.drawings === 10, `and the leaf goes over in ${drewTurn?.drawings} drawings, at ${drewTurn?.angles.join(', ')} degrees about the gutter`);
  const after = await seeing(page);
  claim(after.leaf > before.leaf, `…and it lands on the next opening (${before.leaf + 1} → ${after.leaf + 1}: «${after.kind}»)`);
  // (`open` inside an evaluate is the browser's own window.open, not this proof's variable, so the
  // side has to be handed across rather than read in there — asking for it in the page returned the
  // RECTO's box and the click that was meant to turn back turned forward.)
  const box2 = await page.evaluate((which) => window.__theatre.pieces.walk.books.leafBox(which), open.spread ? 'verso' : null);
  await page.mouse.click(box2.x + box2.w * (open.spread ? 0.5 : 0.22), box2.y + box2.h * 0.55);
  await rest(page);
  await frames(page, 3);
  const backOne = await seeing(page);
  claim(backOne.leaf < after.leaf, `a click on the left page turns it back (${after.leaf + 1} → ${backOne.leaf + 1})`);

  // ---- AND THE LEAF BOWS MID-TURN, measured in the PNG ------------------------------------------
  // The book is back on the opening it started from, so the band measured above now holds whatever
  // lies there when nothing is moving — which is the page the turning leaf was seen ON TOP OF. The
  // band was cut between where a FLAT plate's fore-edge would have reached at that drawing and where
  // the leaf's actually did, so a plate at that angle cannot put a single pixel in it: if the
  // picture there changed, what changed it was the bow and nothing else.
  if (bowAt && bowRaw && band) {
    const now = await raw(page, band);
    const d = moved(now, bowRaw);
    claim(d.pct > 12, `the leaf BOWS mid-turn: on drawing ${bowAt.drawing} at ${bowAt.angle}° its fore-edge stands ${bowAt.px} px past where a flat plate at that angle puts it (curl ${bowAt.curl} across the leaf, lead ${bowAt.lead}°), and ${d.pct} % of the ${band.width}x${band.height} px band between the two is paper a plane could not reach`);
  } else claim(false, 'the leaf could not be caught at the drawing its bow is worth most');

  // ---- THE RIBBON, animated once, then the three pages it has to come back from ------------------
  const rib = await page.evaluate(() => window.__theatre.pieces.walk.books.ribbonBox());
  const ribWho = rib ? await page.evaluate((q) => window.__theatre.pieces.props.switches.at(q[0], q[1]), at(rib, w, h)) : null;
  claim(ribWho === 'book-ribbon', `the ribbon is a switch of its own: the arbiter gives the middle of its ${Math.round(rib?.w)}x${Math.round(rib?.h)} box to «${ribWho}»`);
  await page.screenshot({ path: `${OUT}/ribbon-${tag}.png` });

  // ---- AND AT ITS OWN PAGE IT LIES ACROSS THAT PAGE ----------------------------------------------
  // The user, on the first cut: "the ribbon should be over the index page obviously, otherwise it
  // doesn't make sense." Three things have to be true and none of them is the piece's own word for
  // it: with the contents open the strip runs the length of the leaf and there is INK of it there;
  // it covers no line of the list by more than its own width; and on a card page it is back to being
  // a tail at the head.
  await page.evaluate(() => window.__theatre.pieces.walk.books.goLeaf(window.__theatre.pieces.walk.books.indexAt));
  await rest(page);
  await frames(page, 2);
  const onList = await page.evaluate(() => {
    const K = window.__theatre.pieces.walk.books;
    return { rib: K.ribbonBox(), leaf: K.leafBox(), hits: K.indexHits(), leafNo: K.leaf };
  });
  const down = onList.rib && onList.leaf ? Math.max(0, Math.min(onList.rib.y + onList.rib.h, onList.leaf.y + onList.leaf.h) - Math.max(onList.rib.y, onList.leaf.y)) / onList.leaf.h : 0;
  claim(down > 0.9, `with the contents open the ribbon lies DOWN the page - a ${Math.round(onList.rib?.w)}x${Math.round(onList.rib?.h)} px strip covering ${Math.round(down * 100)} % of a ${Math.round(onList.leaf?.w)}x${Math.round(onList.leaf?.h)} px leaf`);
  const ribInk = onList.rib ? await inkRows(page, { x: onList.rib.x, y: onList.rib.y + onList.rib.h * 0.4, w: onList.rib.w, h: Math.max(6, onList.rib.h * 0.2) }, w, h) : null;
  claim(!!ribInk && ribInk.ink > 40, `...and it is DRAWN there and not merely placed: ${ribInk?.ink} px of ink in the middle fifth of the strip`);
  const worst = (onList.hits ?? []).reduce(
    (m, ln) => {
      const o = Math.max(0, Math.min(ln.x + ln.w, onList.rib.x + onList.rib.w) - Math.max(ln.x, onList.rib.x));
      return o > m.o ? { o, text: ln.text } : m;
    },
    { o: 0, text: null },
  );
  claim(!!onList.rib && worst.o <= onList.rib.w, `and it covers no line of the list by more than its own width (worst ${Math.round(worst.o)} px of ${Math.round(onList.rib?.w)}${worst.text ? `, on the line ${worst.text.slice(0, 18)}` : ''})`);
  const nearest = (onList.hits ?? []).slice().sort((a1, a2) => a1.x - a2.x)[0];
  if (nearest) {
    const cx = nearest.x + Math.min(40, nearest.w / 2), cy = nearest.y + nearest.h / 2;
    const who = await page.evaluate((q) => window.__theatre.pieces.props.switches.at(q[0], q[1]), [cx, cy]);
    await page.mouse.click(cx, cy);
    await rest(page);
    const land = await page.evaluate(() => window.__theatre.pieces.walk.books.leaf);
    claim(who === 'book-page' && Math.abs(land - nearest.target) <= 1, `and a line beside it still takes the click: ${nearest.text?.slice(0, 20)} went to «${who}» and landed on ${land + 1} (wanted ${nearest.target + 1})`);
  }
  {
    const t = idx.find((ln) => ln.label === 'THE FOOL') ?? idx[8];
    await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), t.target);
    await rest(page);
    await frames(page, 2);
    const onCard = await page.evaluate(() => {
      const K = window.__theatre.pieces.walk.books;
      return { rib: K.ribbonBox(), leaf: K.leafBox() };
    });
    const tail = onCard.rib && onCard.leaf ? onCard.rib.h / onCard.leaf.h : 1;
    claim(tail < 0.25, `and on a card page only the tail shows: ${Math.round(onCard.rib?.h)} px of ribbon against ${Math.round(onCard.leaf?.h)} px of leaf (${Math.round(tail * 100)} %)`);
  }
  await page.evaluate(() => window.__theatre.pieces.walk.books.goLeaf(window.__theatre.pieces.walk.books.indexAt));
  await rest(page);

  // ---- and from here the drawings are skipped ----------------------------------------------------
  // `snap` is a flag for tools: the same clicks through the same code, landing on the drawing they
  // start. Ninety lines of contents and seventy-eight plates are twenty minutes with the drawings.
  await page.evaluate(() => window.__theatre.pieces.walk.books.snap(true));
  const sheet = await page.evaluate(() => window.__theatre.pieces.walk.books.sheetLeaves);
  const wantHeads = new Set(DECK.map((c) => headOf(c.slug)));
  const cards = idx.filter((ln) => wantHeads.has(ln.label));
  console.log(`   the contents runs to ${open.indexLeaves} leaves at folio ${open.indexAt + 1}, ${idx.length} lines`);
  claim(cards.length === CARDS, `every one of the ${CARDS} cards has a line in the contents (${cards.length})`);
  for (const want of ['WHAT THE CARDS ARE', 'A CARD IS A MIRROR', 'CUPS', 'PENTACLES', 'SWORDS', 'WANDS', 'THE LAST PAGE']) {
    claim(idx.some((ln) => ln.label === want), `«${want}» is in the contents`);
  }
  claim(idx.every((ln) => ln.folio === String(ln.target + 1)), 'and every folio lettered on the list is the leaf it points at');
  claim(sheet.filter((x) => String(x).startsWith('plate:')).length === CARDS, `the book's own leaves agree: ${sheet.filter((x) => String(x).startsWith('plate:')).length} plates, ${sheet.filter((x) => x === 'index').length} leaves of contents, ${sheet.filter((x) => x === 'blank').length} printer's blanks`);
  const orphans = sheet.map((x, i) => [x, i]).filter(([x]) => String(x).startsWith('plate:')).filter(([x, i]) => sheet[i + 1] !== headOf(String(x).slice(6)));
  claim(orphans.length === 0, `and every plate is faced by its own take (${orphans.map(([x, i]) => `${x}@${i}`).join(', ') || 'none out of place'})`);

  // ---- EVERY LINE OF THE CONTENTS, CLICKED ON THE GLASS -------------------------------------------
  const goIndex = () => page.evaluate(() => window.__theatre.pieces.walk.books.goLeaf(window.__theatre.pieces.walk.books.indexAt));
  const opening = (leaf) => (open.spread ? leaf - (leaf % 2) : leaf);
  // EVERY LEAF OF THE LIST IN TURN, and the leaf is TURNED TO rather than clicked to. The lines are
  // still clicked on the glass — that is the claim — but walking from one leaf of the contents to the
  // next by clicking its margin is a second thing to get right and it is not what is being proved: on
  // a phone, where a click on the margin moves the LENS and not always the paper, that walk went round
  // the same eight leaves eight times and clicked six hundred and sixty lines.
  let checked = 0;
  const wrong = [];
  const backFrom = { trump: null, pip: null, court: null };
  const seenLine = new Set();
  for (let j = 0; j < open.indexLeaves; j++) {
    // AND THE BOOK IS LET SETTLE BEFORE ITS BOXES ARE READ. `snap` lands a riffle on the drawing it
    // starts, but the leaves are not re-laid and the faces are not struck until the next `dress` —
    // and `indexHits` is read off those faces. Without this wait the sweep read the boxes of the
    // leaf it had just LEFT and clicked them: measured, under load, two of the eighty-five lines
    // (TEMPERANCE and THE DEVIL, the first two of the second leaf of the list) went to a point that
    // was no longer on the paper, which shuts the book — and the claim reported them landing on the
    // title. One frame of patience, twice a leaf.
    await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), open.indexAt + j);
    await rest(page);
    const here = (await state(page)).leaf;
    const hits = await page.evaluate(() => window.__theatre.pieces.walk.books.indexHits());
    for (const want of hits) {
      if (seenLine.has(want.target)) continue;
      seenLine.add(want.target);
      // THE BOX IS RE-READ FOR EVERY LINE, not taken off the list this leaf began with. Between one
      // line and the next the book has been to a card and back, and a box is a PROJECTION: it belongs
      // to the frame it was measured in.
      const hit = (await page.evaluate(() => window.__theatre.pieces.walk.books.indexHits())).find((q) => q.target === want.target) ?? want;
      const cx = Math.max(2, Math.min(w - 2, hit.x + Math.min(40, hit.w / 2)));
      const cy = Math.max(2, Math.min(h - 2, hit.y + hit.h / 2));
      // WHAT IS UNDER THE POINT BEFORE THE CLICK, so that a line that misses says why it missed
      // rather than leaving the next reader to guess: the arbiter's own answer, and the book's.
      const who = await page.evaluate((q) => window.__theatre.pieces.props.switches.at(q[0], q[1]), [cx, cy]);
      const says = await page.evaluate((q) => window.__theatre.pieces.walk.books.at(q[0], q[1]), [cx, cy]);
      const from = (await state(page)).leaf;
      await page.mouse.click(cx, cy);
      const saw = await seeing(page);
      const landed = opening(saw.leaf) === opening(hit.target);
      const named = saw.kind === `plate:${slugOf(hit.label)}` || saw.next === `plate:${slugOf(hit.label)}` || saw.kind === hit.label || saw.next === hit.label || String(saw.text).includes(hit.label);
      if (!landed) wrong.push(`${hit.text} wanted leaf ${hit.target + 1}, landed on ${saw.leaf + 1} («${saw.kind}») — from leaf ${from + 1}, clicked ${Math.round(cx)},${Math.round(cy)} in a box ${Math.round(hit.x)},${Math.round(hit.y)} ${Math.round(hit.w)}x${Math.round(hit.h)} on page ${hit.leaf}; the arbiter said «${who}» and the book said ${JSON.stringify(says)}`);
      else if (!named) wrong.push(`${hit.text} landed on leaf ${saw.leaf + 1} but it reads «${saw.kind}»`);
      checked++;
      // THE WAY BACK, on one trump, one pip and one court: the RIBBON, clicked on the glass
      const kind = /^(ACE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN) OF /.test(hit.label) ? 'pip'
        : /^(PAGE|KNIGHT|QUEEN|KING) OF /.test(hit.label) ? 'court'
          : wantHeads.has(hit.label) ? 'trump' : null;
      if (kind && !backFrom[kind] && landed) {
        const r = await page.evaluate(() => window.__theatre.pieces.walk.books.ribbonBox());
        if (!r) {
          backFrom[kind] = { label: hit.label, to: -1, home: false };
          wrong.push(`${hit.text}: no ribbon in the picture on the leaf it landed on`);
        } else {
          await page.mouse.click(...at(r, w, h));
          const bk = await state(page);
          const home = sheet[bk.leaf] === 'index' || sheet[bk.leaf + 1] === 'index';
          backFrom[kind] = { label: hit.label, to: bk.leaf, home, same: opening(bk.leaf) === opening(hit.leaf) };
          if (!home) wrong.push(`${hit.text}: the ribbon went to leaf ${bk.leaf + 1}, which is not the list`);
        }
      }
      await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), here);
      await rest(page);
    }
  }
  claim(checked === idx.length, `every one of the ${idx.length} lines of the contents was clicked on the glass (${checked})`);
  claim(wrong.length === 0, `and every one of them landed on its own page (${wrong.slice(0, 4).join(', ') || 'no line missed'})`);
  for (const k of ['trump', 'pip', 'court']) {
    const r = backFrom[k];
    claim(!!r && r.home, `the ribbon on a ${k} page goes back to the contents${r ? ` (${r.label}: to leaf ${r.to + 1}${r.same ? ', the very leaf of the list it was left from' : ''})` : ': NEVER TRIED'}`);
  }

  // ---- ALL SEVENTY-EIGHT PLATES, ON THE GLASS ----------------------------------------------------
  const plates = [];
  let shotPip = false, shotCourt = false;
  for (const c of DECK) {
    const line = idx.find((ln) => ln.label === headOf(c.slug));
    if (!line) continue;
    await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), line.target);
    await page.waitForFunction(() => {
      const k = window.__theatre.pieces.walk.books.card;
      return !k || k.ready;
    }, null, { timeout: 30000, polling: 60 }).catch(() => {});
    await frames(page, 2);
    const card = await page.evaluate(() => window.__theatre.pieces.walk.books.card);
    if (!card) {
      plates.push({ slug: c.slug, frac: 0, missing: true });
      continue;
    }
    const r = await inkRows(page, card, w, h);
    plates.push({ slug: card.slug, w: card.w, h: card.h, frac: r ? r.ink / (r.w * r.h) : 0 });
    if (!shotPip && card.slug === 'seven-of-pentacles') {
      shotPip = true;
      await page.screenshot({ path: `${OUT}/card-${tag}.png` });
    }
    if (!shotCourt && card.slug === 'queen-of-swords') {
      shotCourt = true;
      await page.screenshot({ path: `${OUT}/court-${tag}.png` });
    }
  }
  const missed = DECK.map((c) => c.slug).filter((s) => !plates.some((q) => q.slug === s && !q.missing));
  const thin = plates.filter((q) => q.frac < 0.15);
  console.log(`   ${plates.length} plates reached, each ${plates[0]?.w}x${plates[0]?.h} px on the glass; the lightest carries ${(Math.min(...plates.map((q) => q.frac)) * 100).toFixed(1)}% ink and the heaviest ${(Math.max(...plates.map((q) => q.frac)) * 100).toFixed(1)}%`);
  claim(missed.length === 0, `every one of the ${CARDS} cards was reached with its plate on the leaf (${missed.join(', ') || 'nothing missing'})`);
  claim(thin.length === 0, `and every plate is actually drawn on the page — none under a sixth ink (${thin.map((q) => `${q.slug} ${(q.frac * 100).toFixed(1)}%`).join(', ') || 'none'})`);

  // ---- the contents, drawn, and the last page ----------------------------------------------------
  await goIndex();
  await frames(page, 3);
  await page.screenshot({ path: `${OUT}/contents-${tag}.png` });
  const last = idx[idx.length - 1];
  await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), last.target);
  await frames(page, 2);
  const end = await seeing(page);
  claim(String(end.text).includes('THAT IS THE BOOK') || String(end.text).includes('THE LAST PAGE'), `the last page is in it and reachable off the list («${String(end.text).slice(0, 44)}…»)`);

  // ---- THE WAY OUT -------------------------------------------------------------------------------
  await page.evaluate(() => window.__theatre.pieces.walk.books.snap(false));
  const wasAt = await page.evaluate(() => window.__theatre.pieces.walk.at);
  await page.mouse.click(6, h - 6);
  await rest(page);
  await frames(page, 3);
  const shut = await state(page);
  claim(!shut.showing && shut.at === wasAt, `a click off the book shuts it and leaves the visitor at the table (${shut.at})`);
  await page.screenshot({ path: `${OUT}/closed-${tag}.png` });
  claim(await page.evaluate(() => window.__theatre.pieces.camera.current === 'reading'), 'and the lens is back on the reading shot it arrived on');
  await page.mouse.click(6, h - 6);
  await still(page);
  await frames(page, 2);
  const home = await page.evaluate(() => ({ at: window.__theatre.pieces.walk.at, shot: window.__theatre.pieces.camera.current }));
  claim(home.at === null, `a second click walks them back to the chair (${home.shot})`);

  // …and Escape does the same two things
  await page.evaluate(() => {
    const W = window.__theatre.pieces.walk;
    W.go('table');
    window.__theatre.pieces.camera.cut('reading');
  });
  await still(page);
  await frames(page, 2);
  await page.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
  await rest(page);
  await frames(page, 2);
  await page.keyboard.press('Escape');
  await rest(page);
  await frames(page, 3);
  const esc = await state(page);
  claim(!esc.showing && esc.at === 'table', `Escape shuts the book and does NOT walk the visitor home (${esc.at})`);
  await page.keyboard.press('Escape');
  await still(page);
  const esc2 = await page.evaluate(() => window.__theatre.pieces.walk.at);
  claim(esc2 === null, `and Escape again walks them back (${esc2})`);
  // the book forgets its page once they have left the table
  await page.evaluate(() => {
    const W = window.__theatre.pieces.walk;
    W.go('table');
    window.__theatre.pieces.camera.cut('reading');
  });
  await still(page);
  await page.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
  await rest(page);
  claim((await state(page)).leaf === 0, 'and it opens at the title again, the page it remembered forgotten when they walked away');

  console.log(`   errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  if (errors.length) bad++;
  await page.close();
}

// ---- THE FRAME TIME, at 1600x900 and dpr 2 -------------------------------------------------------
// Under software GL, so the absolute number is swiftshader's and not a machine's. What it is here
// for is the DIFFERENCE: the same shot with the book shut and with it open, which is what the open
// book costs.
{
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/?shot=1`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  await page.evaluate(() => {
    const W = window.__theatre.pieces.walk;
    W.go('table');
    window.__theatre.pieces.camera.cut('reading');
  });
  await still(page);
  const time = (p, n) => p.evaluate((k) => new Promise((res) => {
    const ts = [];
    let last = performance.now();
    const go = () => {
      const now = performance.now();
      ts.push(now - last);
      last = now;
      if (ts.length >= k) return res(ts.slice(2).sort((a, b) => a - b));
      requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }), n);
  const shutMs = await time(page, 24);
  await page.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
  await rest(page);
  await frames(page, 4);
  const openMs = await time(page, 24);
  const med = (a) => a[Math.floor(a.length / 2)].toFixed(0);
  const st = await state(page);
  console.log(`\n=== 1600x900 dpr 2, at the reading shot`);
  console.log(`   the page is ${st.bound.page[0]}x${st.bound.page[1]} px on the glass, its texture ${st.bound.texture[0]}x${st.bound.texture[1]}, ${st.bound.faces} faces struck`);
  console.log(`   frame time, median of 22: book shut ${med(shutMs)} ms, book open ${med(openMs)} ms (software GL)`);
  // …and this one is given two minutes and allowed to fail. It is a 3200 x 1800 capture off a
  // software renderer taken at the end of everything: under load it has timed out at the default
  // thirty seconds and taken the whole run's verdict down with it, which is a picture costing a
  // proof. The claims are all in by here; what is left is a souvenir.
  await page
    .screenshot({ path: `${OUT}/open-1600x900.png`, timeout: 120000 })
    .catch((e) => console.log(`   (the 1600x900 souvenir did not come off the glass in two minutes: ${String(e).split('\n')[0]})`));
  await page.close();
}

console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser.close();
process.exit(bad ? 1 : 0);
