// walk-book-page — THE PEN. What is set on ONE LEAF of TAROT BY PEPE, and nothing about where that
// leaf lies or how it turns: this file cuts the book into leaves for a page of a given size and
// strikes any one of them onto a canvas. src/pieces/walk-book.js lays those canvases on meshes.
//
// It is the old walk-book.js's own setting, taken off the sheet. For three rounds the book was a
// DOM sheet over the room — a spread struck onto one canvas, gutter, block of leaves, folded corner
// and all — and every one of those marks is now GEOMETRY on a table (walk-book.js). So what is left
// here is the thing that never was geometry: the paper's own furniture and the signwriter's hand.
//
//   THE PAGINATION IS UNCHANGED and is the reason this is a file and not a rewrite. One cap for the
//   whole book, the largest at which the longest entry still fits a single leaf, floored at the
//   13 px the film's rules put on lettering; every entry starts on a leaf of its own and spills only
//   if it must; a card's PLATE takes a leaf and his take faces it, with a printer's blank pushed in
//   front when the count is odd so the two halves land in one opening; the contents is cut before
//   the walk and lettered after it, off the folios the walk itself produced.
//
//   WHAT CHANGED IS THE PAGE'S SHAPE, and only that. The sheet used to choose its own proportions —
//   a spread of 1.44 on a laptop, one leaf of 1.55 on a phone. A leaf of this book is 160 x 226 mm
//   of paper lying on a table and it is that at every window, so the page is 1.4125 tall and the
//   window only decides how big it is on the glass (walk-book.js solves the shot and hands this file
//   the answer; tools/_book-measure.mjs prints the whole table with no browser in it):
//     1280x800   the spread fills the frame; a leaf is 425 x 601 px on the glass
//     1600x900   478 x 676
//      390x844   one leaf at a time; 315 x 445
//   which is why a phone still paginates to more leaves than a laptop: the same hand, less paper —
//   346 pages against 313 against 190.
//
//   AND THE PAGE IS SET IN GLASS PIXELS AND STRUCK IN TEXTURE PIXELS. `sheetOf` is given the leaf's
//   size ON SCREEN, so `cap` is the cap height a visitor's eye actually gets; `strikePage` is then
//   given a scale and draws the same layout that many times larger onto the canvas the leaf carries.
//   The two are the DOM sheet's own `S` and `dpr`, renamed for what they are here.
import { INK, PAPER, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signWidth, signFold } from './titles-sign.js';

const CAP_MAX = 17, CAP_MIN = 13; // the floor is the film's own rule for lettering
const TRACK = 0.16; // the body's tracking, the notice's own
const LEAD = 1.92; // …and its leading
// the contents is set on the body's own leading opened out by a seventh, which is what turns a
// 25 px row into a 29 px one a thumb can pick a line out of without the list running to twice the
// leaves. A contents line is one short line and never wraps, so the extra air costs nothing to read.
const INDEX_LEAD = 1.15;
// The supplied plates (public/cards/<slug>.webp) and nothing is ever cropped out of one.
const PLATE = { w: 1024, h: 1792 };

// a ruled line with the pen's overshoot at both ends (help-bill's own rule, cut again here so this
// file can be read on its own)
const rule = (g, x1, y1, x2, y2, width, rng, over = 4, alpha = 1) => {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  inkLine(g, x1 - ux * over * rng(), y1 - uy * over * rng(), x2 + ux * over * rng(), y2 + uy * over * rng(), { width, wobble: 0.85, rng, color: INK, alpha });
};

// Wrap one paragraph to a measure, in the hand it will be lettered in.
function wrap(text, capH, maxW) {
  const words = signFold(text).split(' ').filter(Boolean);
  const out = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && signWidth(next, { capH, tracking: TRACK }) > maxW) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// THE PAGE'S OWN SIZE AND MARGINS, in the pixels it will be seen at. `pw` x `ph` is the leaf as the
// reading shot projects it; everything else is a fraction of that, the sheet's own fractions kept.
export function sheetOf(pw, ph) {
  const padX = Math.max(14, pw * 0.085);
  const padY = Math.max(16, ph * 0.075);
  return { pw, ph, padX, padY, pen: Math.max(1.4, ph / 560) };
}

// What fits on one leaf at a given hand, and where every line of it goes. `fits` is false when the
// entry does not — the caller walks the cap down and then gives up and lets it spill.
function setPage(entry, S, capH) {
  const measure = S.pw - 2 * S.padX;
  const lead = capH * LEAD;
  const headCap = capH * 1.22;
  const head = entry.head ? signFold(entry.head) : null;
  const top = S.padY + (head ? headCap * 2.3 : 0);
  const room = S.ph - top - S.padY;
  const rows = [];
  let y = 0;
  for (const para of entry.lines) {
    if (!para) {
      y += lead * 0.55;
      continue;
    }
    for (const ln of wrap(para, capH, measure)) {
      rows.push({ text: ln, y });
      y += lead;
    }
    y += lead * 0.5; // the space between paragraphs
  }
  return { head, headCap, top, lead, capH, rows, height: y, fits: y <= room, room };
}

// WHAT THE CONTENTS HOLDS, one line to an entry. Everything in the book except the title page and
// the contents itself is in it, in the order it is printed.
const inIndex = (e) => e.kind !== 'title' && e.kind !== 'index';
// how many lines of list one leaf holds at this hand
const indexRoom = (S, cap) => {
  const top = S.padY + cap * 1.22 * 2.3;
  return Math.max(1, Math.floor((S.ph - top - S.padY) / (cap * LEAD * INDEX_LEAD)));
};

// THE CARD'S PLATE on the page: the largest 4:7 rectangle the page's own margins leave, centred, with
// the caption struck in the bottom margin under it. Nothing is ever cropped out of a supplied sheet.
//   1280x800   292 x 510 px on a page 425 wide — the plate is bound by the page's HEIGHT
//   1600x900   328 x 574 on a page 478 wide
//    390x844   216 x 379 on a page 315 wide, bound by its height again
export function plateBox(S) {
  const availW = S.pw - 2 * S.padX, availH = S.ph - 2 * S.padY;
  const w = Math.max(40, Math.min(availW, (availH * PLATE.w) / PLATE.h));
  const h = (w * PLATE.h) / PLATE.w;
  return { x: (S.pw - w) / 2, y: (S.ph - h) / 2, w, h };
}

// THE WHOLE BOOK, CUT INTO LEAVES for this page size. One cap for all of it, and then every entry
// laid out at that hand, starting on a leaf of its own and spilling only if it must.
//
// EVEN IS A VERSO AND ODD IS A RECTO, which is the one thing a reader of this file has to hold on
// to: page 2k and page 2k+1 are ONE OPENING. Nothing here knows which physical leaf a page is on —
// that is walk-book.js's arithmetic — but the pairing is decided here, by the printer's blank, and
// the book is bound to match it.
export function paginate(book, S) {
  let cap = CAP_MAX;
  for (; cap > CAP_MIN; cap -= 0.5) {
    if (book.pages.every((e) => e.kind === 'index' || setPage(e, S, cap).fits)) break;
  }
  // …and the floor is the floor. With the cards in the book an entry's text gets ONE page of the
  // opening instead of two, so the longest of his takes does not fit a single leaf at any hand this
  // film will set: the loop walks all the way down to CAP_MIN and the long ones spill, which is the
  // same answer a printer gives and is why the leaf count is measured and not assumed.
  cap = Math.max(CAP_MIN, cap);
  const perLeaf = indexRoom(S, cap);
  const idxLead = cap * LEAD * INDEX_LEAD;
  const idxTop = S.padY + cap * 1.22 * 2.3;
  const listed = book.pages.filter(inIndex);
  const slots = Math.max(1, Math.ceil(listed.length / perLeaf));
  const firstLeaf = new Map(); // an entry, and the page a visitor has to be on to see it start
  let indexAt = 0;
  const leaves = [];
  for (const entry of book.pages) {
    if (entry.kind === 'index') {
      indexAt = leaves.length;
      for (let i = 0; i < slots; i++) {
        leaves.push({ entry, index: true, rows: [], head: signFold(entry.head), headCap: cap * 1.22, capH: cap, lead: idxLead, top: idxTop, part: i, parts: slots });
      }
      continue;
    }
    // where the entry BEGINS, which for a card is its plate and not the printer's blank in front of it
    firstLeaf.set(entry, leaves.length + (entry.slug && leaves.length % 2 === 1 ? 1 : 0));
    // A CARD GETS A LEAF OF ITS OWN AND HIS TAKE FACES IT, so the plate has to land on a VERSO or
    // the two halves of an entry would be in two different openings and the visitor would be
    // reading about a card they cannot see. A blank is pushed when the count is odd — which is what
    // a printer does with a plate, and the blanks are counted and reported rather than swept up.
    if (entry.slug) {
      if (leaves.length % 2 === 1) leaves.push({ entry, blank: true, rows: [], head: null, capH: cap, lead: cap * LEAD, top: 0, part: 0, parts: 1 });
      leaves.push({ entry, plate: entry.slug, rows: [], head: null, capH: cap, lead: cap * LEAD, top: 0, part: 0, parts: 1 });
    }
    const L = setPage(entry, S, cap);
    if (L.fits || L.rows.length === 0) {
      leaves.push({ entry, ...L, part: 0, parts: 1 });
      continue;
    }
    // it does not fit: break it at the last row that does, and carry the rest on to the next leaf
    const cut = [];
    let rows = L.rows;
    while (rows.length) {
      const take = [];
      const y0 = rows[0].y;
      for (const r of rows) {
        if (r.y - y0 + L.lead > L.room) break;
        take.push({ ...r, y: r.y - y0 });
      }
      if (!take.length) take.push({ ...rows[0], y: 0 });
      cut.push(take);
      rows = rows.slice(take.length);
    }
    cut.forEach((rows2, i) => leaves.push({ entry, ...L, rows: rows2, part: i, parts: cut.length }));
  }
  // …and now the list, lettered off the walk that has just happened
  const index = listed.map((e) => ({
    label: signFold(e.head),
    num: e.num ? signFold(e.num) : null,
    indent: !!e.minor,
    target: firstLeaf.get(e) ?? 0,
    folio: String((firstLeaf.get(e) ?? 0) + 1),
  }));
  index.forEach((ln, i) => {
    const leaf = leaves[indexAt + Math.floor(i / perLeaf)];
    if (leaf) leaf.rows.push({ ...ln, text: signFold(`${ln.num ? `${ln.num} · ` : ''}${ln.label}`), y: (i % perLeaf) * idxLead });
  });
  return { cap, leaves, index, indexAt };
}

// ---- THE STRIKE ----------------------------------------------------------------------------------
// One page onto one canvas, at `scale` times the size it was set at. Returns the canvas and WHERE
// THINGS LANDED on it, in the page's own pixels (0..pw, 0..ph): the running head's box, the plate's
// box, and every line of the contents. walk-book.js turns those into boxes on the glass by putting
// them through the leaf's own uv, which is how a click on a line of the list finds its page.
//
// `boil` re-rolls the nib and nothing else: the same page struck again, which is what lets the two
// facing leaves breathe at six a second for one texture bind.
//
// THE FORE-EDGE IS THE SIDE THE FOLIO STANDS ON, and it changes with the page's parity: a verso's
// outer edge is the left one and a recto's the right. Everything else on the page — the head, the
// measure, the plate — is square in the middle of it, as the sheet's own pages were.
export function strikePage(S, L, folio, { scale = 1, boil = 0, plate = null, seedBase = 0 } = {}) {
  const verso = folio % 2 === 1; // folio is 1-based; page 0 is a verso and is folio 1
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(S.pw * scale));
  c.height = Math.max(2, Math.round(S.ph * scale));
  const g = c.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const nib = mulberry32(boil ? 0x7b1c3 : 0x2e9d5);
  const put = mulberry32(0x51a07 + seedBase);
  const pen = S.pen;
  const out = { lines: [], head: null, plate: null, folio: null };

  // 1. THE PAPER, and a tooth on it. Twenty faint marks and no more: the cover next door learnt the
  //    same lesson (props-table.js) — anything denser is a TEXTURE, and a texture on a drawn thing
  //    in this room is the one mark the pen never makes. The leaf passes the ink pass verbatim
  //    (walk-book.js), so this is the only grain the paper will ever have.
  g.fillStyle = PAPER;
  g.fillRect(0, 0, S.pw, S.ph);
  // (the alpha goes ON THE STROKE and not on the context: inkLine sets globalAlpha itself, so a
  // save/globalAlpha round it is thrown away — which is how the first cut of this drew twenty
  // full-ink lines through his own lettering.)
  for (let i = 0; i < 22; i++) {
    const y = S.ph * 0.06 + put() * S.ph * 0.88;
    const x = S.pw * 0.08 + put() * S.pw * 0.72;
    inkLine(g, x, y, x + S.pw * 0.04 + put() * S.pw * 0.07, y + (put() - 0.5) * 2, { width: 0.9, wobble: 0.4, rng: put, color: INK, alpha: 0.05 });
  }

  // 2. THE LEAF'S OWN CUT EDGE, and it is here rather than in the geometry because a leaf passes the
  //    ink pass VERBATIM: the pen is not allowed to draw a contour round it, so the only outline it
  //    can ever have is one that is printed on it. Lying on its pile the block's own band is what
  //    reads and this is a whisper inside it; IN THE AIR, halfway over the gutter, it is the whole
  //    of the leaf's silhouette — without it a turning page and a riffle are invisible, which is
  //    exactly how the first cut of this came back.
  const cut = (x1, y1, x2, y2) => rule(g, x1, y1, x2, y2, pen * 0.6, nib, 1.5, 0.42);
  cut(1, 1, S.pw - 1, 1);
  cut(S.pw - 1, 1, S.pw - 1, S.ph - 1);
  cut(S.pw - 1, S.ph - 1, 1, S.ph - 1);
  cut(1, S.ph - 1, 1, 1);

  if (L.blank) return { canvas: c, ...out }; // a printer's blank, facing a plate

  const x0 = S.padX;
  const right = S.pw - S.padX;
  const foot = S.ph - S.padY * 0.45;
  const putFolio = (capH) => {
    const fx = verso ? x0 : right;
    signCaps(g, String(folio), fx, foot, { capH: capH * 0.82, tracking: 0.18, pen: 1.3, align: verso ? 'left' : 'right', seed: 90 + folio, boil, alpha: 0.75 });
    out.folio = { x: verso ? x0 : right - capH, y: foot - capH * 0.5, w: capH, h: capH };
  };

  // 3. THE CONTENTS. A running head, the rule under it, and then one line to an entry: the numeral
  //    where the card has one, the name, a dotted lead across the measure and the folio out at the
  //    fore-edge — the folio the walk actually put it on and not a number anybody typed.
  if (L.index) {
    signCaps(g, L.head, x0, S.padY + L.headCap * 0.5, { capH: L.headCap, tracking: 0.22, pen: Math.max(1.45, L.headCap * 0.13), align: 'left', seed: 11 + folio, boil });
    out.head = { x: x0, y: S.padY, w: right - x0, h: L.headCap * 1.4 };
    const ry = S.padY + L.headCap * 1.5;
    rule(g, x0, ry, right, ry, pen * 0.7, nib, 3, 0.85);
    for (const row of L.rows) {
      const x = x0 + (row.indent ? L.capH * 1.7 : 0);
      const base = L.top + row.y + L.capH * 0.5;
      signCaps(g, row.text, x, base, { capH: L.capH, tracking: TRACK, pen: Math.max(1.3, L.capH * 0.12), align: 'left', seed: 620 + folio * 17 + Math.round(row.y), boil, alpha: row.indent ? 0.9 : 1 });
      signCaps(g, row.folio, right, base, { capH: L.capH, tracking: 0.18, pen: 1.3, align: 'right', seed: 640 + folio * 17 + Math.round(row.y), boil, alpha: 0.8 });
      // the lead: points laid between the name and its folio, thin enough that the eye runs along
      // them and does not read them
      const from = x + signWidth(row.text, { capH: L.capH, tracking: TRACK }) + L.capH * 0.7;
      const to = right - signWidth(row.folio, { capH: L.capH, tracking: 0.18 }) - L.capH * 0.7;
      for (let dx = from; dx < to; dx += L.capH * 0.62) {
        inkLine(g, dx, base - L.capH * 0.06, dx + L.capH * 0.1, base - L.capH * 0.06, { width: pen * 0.5, wobble: 0.3, rng: put, alpha: 0.3 });
      }
      // …and the line's own box, which is what a click on it is tested against
      out.lines.push({
        label: row.label, text: row.text, folio: row.folio, target: row.target,
        x: x0 - S.padX * 0.35, y: L.top + row.y - L.lead * 0.2, w: S.pw - 2 * (x0 - S.padX * 0.35), h: L.lead,
      });
    }
    putFolio(L.capH);
    return { canvas: c, ...out };
  }

  // 4. THE CARD'S OWN PAGE. The plate is the supplied sheet drawn onto the paper and nothing in this
  //    film's pen goes near it: no boil, no contour, no hatch. What is struck here is the BED it
  //    lies in — a tight band of strokes off its bottom and right edges, the room's own mark for one
  //    thing lying on another — and the card's name at the foot, because a plate in a book is
  //    captioned and a card on a table is not.
  if (L.plate) {
    const P = plateBox(S);
    const band = Math.max(4, pen * 4);
    for (let n = 0, m = Math.round(P.w / (pen * 1.3)); n < m; n++) {
      const x = P.x + put() * P.w;
      if (put() < 0.35) continue;
      inkLine(g, x, P.y + P.h + 0.4, x + (put() - 0.5) * 1.2, P.y + P.h + band * (0.2 + 0.8 * put()), { width: pen * 0.45, wobble: 0.3, rng: put, alpha: 0.5 });
    }
    for (let n = 0, m = Math.round(P.h / (pen * 1.3)); n < m; n++) {
      const y = P.y + put() * P.h;
      if (put() < 0.35) continue;
      inkLine(g, P.x + P.w + 0.4, y, P.x + P.w + band * (0.2 + 0.8 * put()), y + (put() - 0.5) * 1.2, { width: pen * 0.45, wobble: 0.3, rng: put, alpha: 0.5 });
    }
    if (plate) {
      try {
        g.drawImage(plate, P.x, P.y, P.w, P.h);
      } catch {
        // a sheet that is not decodable yet: the bed is struck and the page is re-struck when it is
      }
    }
    const cap = L.capH * 0.86;
    const name = signFold(`${L.entry.head}${L.entry.num ? ` · ${L.entry.num}` : ''}`);
    signCaps(g, name, S.pw / 2, P.y + P.h + band + cap * 1.2, { capH: cap, tracking: 0.2, pen: Math.max(1.3, cap * 0.12), seed: 700 + folio, boil, alpha: 0.85 });
    out.plate = { slug: L.plate, ...P, ready: !!plate };
    putFolio(L.capH);
    return { canvas: c, ...out };
  }

  // 5. THE TITLE PAGE: centred, no running head, set at a bigger hand
  if (L.entry.kind === 'title') {
    const mid = S.pw / 2;
    let y = S.ph * 0.3;
    L.entry.lines.forEach((ln, n) => {
      if (!ln) {
        y += L.capH * 1.1;
        return;
      }
      const big = n < 2;
      const capH = big ? L.capH * (n === 0 ? 2.6 : 1.5) : L.capH;
      signCaps(g, signFold(ln), mid, y + capH * 0.5, { capH, tracking: big ? 0.24 : TRACK, pen: Math.max(1.5, capH * 0.13), seed: 200 + n, boil });
      if (n === 0) out.head = { x: S.padX, y, w: S.pw - 2 * S.padX, h: capH * 1.2 };
      y += capH * (big ? 1.9 : LEAD);
    });
    return { canvas: c, ...out };
  }

  // 6. A PAGE OF HIS TAKE: the running head, the numeral out at the fore-edge where a trump's number
  //    belongs, the rule, the body, and the folio at the foot of the page's own outer corner.
  let y = S.padY;
  if (L.head) {
    signCaps(g, L.head, x0, y + L.headCap * 0.5, { capH: L.headCap, tracking: 0.22, pen: Math.max(1.45, L.headCap * 0.13), align: 'left', seed: 11 + folio, boil });
    out.head = { x: x0, y, w: right - x0, h: L.headCap * 1.4 };
    if (L.entry.num) {
      signCaps(g, signFold(L.entry.num), right, y + L.headCap * 0.5, { capH: L.headCap, tracking: 0.22, pen: Math.max(1.4, L.headCap * 0.12), align: 'right', seed: 31 + folio, boil });
    }
    const ry = y + L.headCap * 1.5;
    rule(g, x0, ry, right, ry, pen * 0.7, nib, 3, 0.85);
  }
  y = L.top;
  for (const row of L.rows) {
    signCaps(g, row.text, x0, y + row.y + L.capH * 0.5, { capH: L.capH, tracking: TRACK, pen: Math.max(1.35, L.capH * 0.125), align: 'left', seed: 400 + folio * 13 + Math.round(row.y), boil });
  }
  putFolio(L.capH);
  return { canvas: c, ...out };
}

// The words on a leaf, in the hand's own folded case — for a proof that has to READ a page rather
// than look at it.
export const textOf = (L) => (L ? [L.head, ...(L.rows ?? []).map((r) => r.text)].filter(Boolean).join(' ') : '');

// What a leaf IS, as one word: 'title' · 'index' · 'plate:<slug>' · 'blank' · its running head.
export const kindOf = (L) => (!L ? '?' : L.plate ? `plate:${L.plate}` : L.blank ? 'blank' : L.index ? 'index' : L.entry?.kind === 'title' ? 'title' : L.head ?? '?');

export { CAP_MIN, CAP_MAX, TRACK, LEAD, PLATE };
