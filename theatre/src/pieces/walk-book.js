// walk-book — FOUR SPINES ON THE TALL CASE COME OFF IT AND OPEN.
//
// The user: "Also the user should be able to walk up to the bookshelf and open books. One of the
// books in the bookshelf has to be entitled TAROT by PEPE. Users should be able to open it and read
// through pepe's take of the tarot."
//
// So ONE of the thirty-three spines standing in that case is a switch. Click it and the book comes
// off the shelf and stands open over the room as a spread: paper, a gutter, the block of leaves at
// each outer edge, drawn in the room's own pen, with the text lettered in the signwriter's hand —
// the same hand, the same nib and the same boil as the notice under the shop's sign, which is the
// model for anything in this film a visitor READS (src/pieces/help.js, help-bill.js) — and his own
// cards printed on the facing leaves.
//
// NOTHING ANNOUNCES IT. No gilding, no glow, no tag. One spine out of thirty-three answers a
// pointer and the other thirty-two are books on a shelf; a visitor who never runs a cursor along
// the row never finds out. Which one, and the measurement that chose it, is WHICH SPINES below.
//
// HOW IT IS WORKED. A click on a spine opens the book at its first opening. A click on the RIGHT
// page turns forward, on the LEFT page back, a click anywhere off the paper puts it down, and so
// does Escape — the notice's own manners exactly, and for the notice's own reason: there is nothing
// on this sheet to press, so the way out is the room.
//
// HOW IT IS SET. One cap height for the whole book, solved for the window: the largest hand at
// which the LONGEST entry still fits a single leaf, floored at the 13 px this film's rules put on
// lettering. An entry that will not fit even then spills onto the next leaf, which is what a book
// does — each entry still STARTS on a leaf of its own, so the trumps are one to a page whenever the
// window has room for them. What that comes out at, measured (tools/_book-proof.mjs prints it):
//   1280x800   a spread, 950 x 660, two pages of 436 across, set at a 13 px cap. 234 leaves — 117
//              openings — of which 78 are CARDS, 5 are the contents and 29 are printer's blanks
//              facing a plate.
//   390x844    ONE page, because two pages of 170 px is not a book, it is a column of hyphens. The
//              sheet is 374 x 580 and the spread is CROPPED to its recto: the gutter and the far
//              page's edge still run down the left, so what is on the phone is an open book seen
//              close, and turning goes one leaf at a time exactly as it does on a laptop. The same
//              eighty-seven entries come to 260 leaves there, 78 of them cards, 6 of them the
//              contents, and none of them blank — a single page needs no verso to face.
// Both counts are turned through, and every plate's own ink counted inside its box on the glass, by
// tools/_book-proof.mjs rather than asserted here.
//
// AND THE CARDS ARE THE ROOM'S OWN. The user: "the tarot by pepe book needs to actually contain his
// tarot cards!" So every card entry carries a `slug` and the leaf before its text is the PLATE —
// public/cards/<slug>.webp, 1024 x 1792, the same sheet the deck lays out on the cloth and the same
// one the ? card's third face puts up (help-cards.js). It is an `<img>` lying on the drawn page and
// nothing in this film's pen goes near it: no ink pass, no boil, no contour, no hatch. 320 x 560 px
// on a laptop and 282 x 493 on a phone, which is a card somebody can actually look at.
//
// AND IT HAS A CONTENTS, BECAUSE SEVENTY-EIGHT CARDS IS NOT A THING YOU READ FRONT TO BACK. The
// user: "the tarot pepe book actually needs an index page — so the user can jump straight where they
// want, and also jump back to the index page — we also need every single card explained, even in the
// 4 suits." So the leaf after the title is a LIST OF WHAT IS IN IT, set in the same hand: the two
// opening pages, the twenty-two trumps by numeral and name, then each suit and its fourteen cards
// indented under it, and the last page. Every line carries the folio it is on and clicking the line
// turns straight there.
//
// THE FOLIOS ARE MEASURED AND NOT WRITTEN DOWN. The book paginates per window, so the number beside
// a line on a phone is not the number beside it on a laptop. The index is built from the SAME walk
// that cuts the leaves (paginate, below): the walk records which leaf each entry started on and the
// list is lettered from that, so a line cannot disagree with the page it lands on.
//
// AND THE WAY BACK IS A FOLDED CORNER. Every leaf that is not the contents and not the title has its
// top outer corner turned down — a crease and four strokes of hatch in the book's own pen, nothing
// written on it, no tag and no label — and a click on it goes back to the contents, at the leaf of
// the list the visitor jumped from rather than the top of it. Turning by clicking the right page and
// the left page is untouched; the corner is tested first and it is 44 px to a thumb.
//
// api (ctx.pieces.walk.books):
//   open(title) · close() · turn(+1|-1) · goLeaf(n) · back() · showing · title · leaf · leaves
//   spines · card · sheetLeaves · index · indexAt · indexHits · foldBoxes
import { INK, PAPER, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signWidth, signFold } from './titles-sign.js';
import { reletter } from './props-objects.js';
import { BOOKS, TAROT_BY_PEPE } from './book-tarot.js';

// ---- WHICH SPINES, AND WHERE THEY STAND ----------------------------------------------------------
// The titles in this case are dealt by its own pen (props.js, ITS OWN PEN), so nothing could be
// written down in advance about which board a title landed on; tools/_book-where.mjs prints the
// whole case and these four came off that list. Every one of them stands in the band the `case`
// shot holds (0.45 to 1.75 m) and every one is clear of the three switches already in the case:
//
//   TAROT / PEPE   world (−2.039, 0.97), re-lettered from the GRAMMAIRE that was dealt there — the
//                  leftmost spine on the bottle bay's board, 232 mm tall, an ink board with a paper
//                  label. Chest height for somebody standing at the case, which is what the brief
//                  asked for. Its nearest switch is the VIN bottle at (−1.16, 0.97): 879 mm away,
//                  which is 476 px on a 1280x800 frame and 316 on a 390x844 one against thumb boxes
//                  of 44. The radio is a bay up and 500 mm across; the cat is a bay down and 819.
//   MARSEILLE      (−1.957, 0.97), standing next to it — the town the deck is named after.
//   CHIROMANCIE    (−1.496, 0.97), the far end of the same board, 336 mm from the bottle.
//   LE DESTIN      (−1.969, 0.52), the cat's bay, 749 mm from the animal.
//
// THE TAROT IS RE-LETTERED AND NOT ADDED, and that is a fact about the pen and not about taste.
// `bookRow` deals a run off a shared stream, so a book INSERTED into one re-deals every title after
// it and the two bays at the foot of the case (and the cat's bay, which is dealt last) would come
// out drawn with different books. Re-lettering strikes one strip of paper and moves nothing: the
// board, its width, its lean and its place on the shelf are the ones the dice gave it.
//
// AND ONE OF THEM OPENS, NOT FOUR. The user, once the book had his cards in it: "the tarot by pepe
// book needs to actually contain his tarot cards! for now it should be the only clickable one,
// we'll think of other books as we go along." So MARSEILLE, CHIROMANCIE and LE DESTIN are books on
// a shelf again — they are not switches, they have no cursor, and nothing on the case says which of
// the thirty-three is the one that opens. The cursor over the TAROT spine is the whole affordance,
// which is the rule every other thing in this room is worked by. Their pages are still written and
// still in the data module, marked unused (src/pieces/book-tarot.js, OTHERS): the writing costs
// nothing to keep and the next round may want it.
// …AND NOW NO SPINE OPENS AT ALL. The user, once there was a reading table in the room: "that book
// is TAROT by PEPE and the viewer basically moves to the table and looks down on the book and can
// look through it." So the trigger left the shelf: the TAROT spine is re-lettered exactly as it was
// and is a book on a shelf like the other thirty-two, and what opens this sheet is the BOOK LYING ON
// THE READING TABLE (src/pieces/props-table.js, which registers that switch and calls `open`).
// Nothing else about this file changed: the spine is still cut, still found, still re-lettered, so
// putting `switch: true` back on the entry below is the whole of what it would take to have it open
// from the case again.
const SPINES = [{ key: 'TAROT', at: [-2.039, 0.97], letter: TAROT_BY_PEPE.spine, switch: false }];
const MIN_TAP = 44; // px: what a thumb needs, whatever a 45 mm spine measures on the glass

// ---- the sheet -----------------------------------------------------------------------------------
const BLEED = 26; // room on the plate for the pen's overshoot and the drop-hatch
const CAP_MAX = 17, CAP_MIN = 13; // the floor is the film's own rule for lettering
const TRACK = 0.16; // the body's tracking, the notice's own
const LEAD = 1.92; // …and its leading
const SPREAD_RATIO = 1.44; // two pages open: a shade wider than it is tall
// one page: taller than it is wide, as a leaf of a book is. 1.55 rather than a book's own 1.45
// because on a phone this sheet is bound by the WIDTH at every size — 374 px of a 390 px screen —
// and the difference is three more lines on every leaf of it for nothing.
const PAGE_RATIO = 1.55;
// the contents is set on the body's own leading opened out by a seventh, which is what turns a
// 25 px row into a 29 px one a thumb can pick a line out of without the list running to twice the
// leaves. A contents line is one short line and never wraps, so the extra air costs nothing to read.
const INDEX_LEAD = 1.15;

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

// THE SHEET'S OWN SIZE, and whether it is a spread or one leaf of one. A window narrower than it is
// tall gets the recto alone: two pages of 170 px is not a book.
function sheetOf(w, h) {
  const spread = w / h >= 1.0;
  let sw, sh;
  if (spread) {
    sh = Math.min(h * 0.86, 660);
    sw = Math.min(w * 0.92, sh * SPREAD_RATIO);
    sh = Math.min(sh, sw / SPREAD_RATIO);
  } else {
    sw = Math.min(w * 0.96, 480);
    sh = Math.min(h * 0.86, sw * PAGE_RATIO);
    sw = Math.min(sw, sh / PAGE_RATIO);
  }
  const edge = Math.max(7, sw * 0.016); // the block of leaves at the outer edge
  const gut = Math.max(16, sw * (spread ? 0.05 : 0.07)); // the gutter
  const pageW = spread ? (sw - gut - 2 * edge) / 2 : sw - gut - edge;
  const padX = Math.max(14, pageW * 0.085);
  const padY = Math.max(16, sh * 0.075);
  return { spread, sw: Math.round(sw), sh: Math.round(sh), edge, gut, pageW, padX, padY, pen: Math.max(1.4, sh / 560) };
}

// What fits on one leaf at a given hand, and where every line of it goes. Returns null when the
// entry does not fit — the caller walks the cap down and then gives up and lets it spill.
function setPage(entry, S, capH) {
  const measure = S.pageW - 2 * S.padX;
  const lead = capH * LEAD;
  const headCap = capH * 1.22;
  const head = entry.head ? signFold(entry.head) : null;
  const top = S.padY + (head ? headCap * 2.3 : 0);
  const room = S.sh - top - S.padY;
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
// the contents itself is in it, in the order it is printed: the two opening pages, the twenty-two
// trumps with their numeral, each suit, and each suit's fourteen cards indented under it.
const inIndex = (e) => e.kind !== 'title' && e.kind !== 'index';
// how many lines of list one leaf holds at this hand
const indexRoom = (S, cap) => {
  const top = S.padY + cap * 1.22 * 2.3;
  return Math.max(1, Math.floor((S.sh - top - S.padY) / (cap * LEAD * INDEX_LEAD)));
};

// THE WHOLE BOOK, CUT INTO LEAVES for this window. One cap for all of it — the largest at which the
// longest entry still fits a single leaf — and then every entry is laid out at that hand, starting
// on a leaf of its own and spilling only if it must.
function paginate(book, S) {
  let cap = CAP_MAX;
  for (; cap > CAP_MIN; cap -= 0.5) {
    if (book.pages.every((e) => e.kind === 'index' || setPage(e, S, cap).fits)) break;
  }
  // …and the floor is the floor. Once the cards went into the book an entry's text got ONE page of
  // the opening instead of two, so the longest of his takes no longer fits a single leaf at any
  // hand this film will set: the loop walks all the way down to CAP_MIN and the long ones spill,
  // which is the same answer a printer gives and is why the leaf count is measured and not assumed.
  cap = Math.max(CAP_MIN, cap);
  // THE CONTENTS IS CUT BEFORE THE WALK AND LETTERED AFTER IT. How many leaves the list needs is
  // known from the line count alone — one line to an entry, never wrapped — so the walk can lay that
  // many blank leaves of list where the contents stands and letter them once it knows what folio
  // everything landed on. No guess, no second pagination, and nothing about the numbers is written
  // down in the data: they are the walk's own count.
  const perLeaf = indexRoom(S, cap);
  const idxLead = cap * LEAD * INDEX_LEAD;
  const idxTop = S.padY + cap * 1.22 * 2.3;
  const listed = book.pages.filter(inIndex);
  const slots = Math.max(1, Math.ceil(listed.length / perLeaf));
  const firstLeaf = new Map(); // an entry, and the leaf a visitor has to be on to see it start
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
    firstLeaf.set(entry, leaves.length + (entry.slug && S.spread && leaves.length % 2 === 1 ? 1 : 0));
    // A CARD GETS A LEAF OF ITS OWN AND HIS TAKE FACES IT. On a spread that means the plate has to
    // land on a VERSO, or the two halves of an entry would be in two different openings and the
    // visitor would be reading about a card they cannot see. So a blank leaf is pushed when the
    // count is odd — which is what a printer does with a plate, and the blanks are counted and
    // reported rather than swept up.
    if (entry.slug) {
      if (S.spread && leaves.length % 2 === 1) leaves.push({ entry, blank: true, rows: [], head: null, capH: cap, lead: cap * LEAD, top: 0, part: 0, parts: 1 });
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

// ---- THE PEN -------------------------------------------------------------------------------------
// One opening, struck onto its own canvas. `parity` re-rolls the nib and nothing else: the same
// book, struck again, which is what makes the whole thing boil at six a second for one drawImage.
function strike(S, leaves, i, parity, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round((S.sw + 2 * BLEED) * dpr);
  c.height = Math.round((S.sh + 2 * BLEED) * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(BLEED, BLEED);
  const nib = mulberry32(parity ? 0x7b1c3 : 0x2e9d5);
  const put = mulberry32(0x51a07);
  const pen = S.pen;

  // 1. THE BAND OF STROKES OUTSIDE THE BOTTOM AND RIGHT EDGES — the marks an animator lays down
  //    where one sheet is lying on another. Not a shadow: a book is an opaque object in this room
  //    and the room does not own a soft edge.
  const band = Math.max(9, pen * 8);
  const stroke = (x0, y0, dx, dy) => inkLine(g, x0, y0, x0 + dx, y0 + dy, { width: pen * 0.55, wobble: 0.35, rng: put, alpha: 0.5 + put() * 0.35 });
  for (let k = 0, n = Math.round(S.sw / (pen * 1.1)); k < n; k++) {
    const x = put() * (S.sw + band * 0.6);
    if (put() < 0.3) continue;
    stroke(x, S.sh + 0.4, (put() - 0.5) * 1.3, band * (0.18 + 0.82 * put() ** 1.7));
  }
  for (let k = 0, n = Math.round(S.sh / (pen * 1.1)); k < n; k++) {
    const y = put() * (S.sh + band * 0.6);
    if (put() < 0.3) continue;
    stroke(S.sw + 0.4, y, band * (0.18 + 0.82 * put() ** 1.7), (put() - 0.5) * 1.3);
  }

  // 2. THE PAPER, and the two page shapes on it
  g.fillStyle = PAPER;
  g.fillRect(0, 0, S.sw, S.sh);
  const pages = pageBoxes(S);
  for (const p of pages) rule(g, p.x, 0, p.x, S.sh, pen * 0.5, nib, 2, 0);
  // the outer cut edge of the whole sheet
  rule(g, 0, 0, S.sw, 0, pen * 0.7, nib, 2);
  rule(g, S.sw, 0, S.sw, S.sh, pen * 0.7, nib, 2);
  rule(g, S.sw, S.sh, 0, S.sh, pen * 0.7, nib, 2);
  rule(g, 0, S.sh, 0, 0, pen * 0.7, nib, 2);

  // 3. THE BLOCK OF LEAVES at each outer edge: five or six short strokes stacked against the cut,
  //    which is the only mark in the drawing that says this is a book and not a card.
  const leafBlock = (x, dir) => {
    for (let k = 1; k <= 5; k++) {
      const u = x + dir * (S.edge * k) / 5.5;
      inkLine(g, u, S.padY * 0.5 + put() * 5, u, S.sh - S.padY * 0.5 - put() * 5, { width: pen * (k === 5 ? 0.75 : 0.42), wobble: 0.7, rng: nib, alpha: 0.35 + 0.1 * k });
    }
  };
  leafBlock(S.edge, -1);
  if (S.spread) leafBlock(S.sw - S.edge, 1);

  // 4. THE GUTTER: two lines a nib apart down the fold with a band of fine hatch between them, and
  //    the hatch is what makes the two pages read as one sheet folded rather than as two cards.
  const gx = S.spread ? S.sw / 2 : S.edge + S.gut * 0.62;
  const gw = S.gut * 0.34;
  rule(g, gx - gw / 2, 0, gx - gw / 2, S.sh, pen * 0.6, nib, 2, 0.8);
  rule(g, gx + gw / 2, 0, gx + gw / 2, S.sh, pen * 0.6, nib, 2, 0.8);
  for (let y = S.padY * 0.4; y < S.sh - S.padY * 0.3; y += Math.max(5, pen * 3.4)) {
    inkLine(g, gx - gw * 0.36, y, gx + gw * 0.36, y + pen * 1.6, { width: pen * 0.4, wobble: 0.5, rng: nib, alpha: 0.3 + put() * 0.25 });
  }

  // 5. THE TEXT. Every word of it is cut by the signwriter, exactly as the notice is.
  const boil = parity;
  pages.forEach((box, k) => {
    const L = leaves[i + k];
    if (!L) return;
    if (L.blank) return; // a printer's blank, facing a plate
    // the way back, on every leaf but the contents and the title page — there is nothing for either
    // of those to go back TO
    if (!L.index && L.entry.kind !== 'title') dogEar(g, S, box, k, nib, pen);
    if (L.index) {
      // THE CONTENTS. A running head, the rule under it, and then one line to an entry: the numeral
      // where the card has one, the name, a dotted lead across the measure and the folio out at the
      // fore-edge — which is the folio the walk actually put it on and not a number anybody typed.
      const x0 = box.x + S.padX;
      const right = box.x + box.w - S.padX;
      signCaps(g, L.head, x0, S.padY + L.headCap * 0.5, { capH: L.headCap, tracking: 0.22, pen: Math.max(1.45, L.headCap * 0.13), align: 'left', seed: 11 + i + k, boil });
      const ry = S.padY + L.headCap * 1.5;
      rule(g, x0, ry, right, ry, S.pen * 0.7, nib, 3, 0.85);
      for (const row of L.rows) {
        const x = x0 + (row.indent ? L.capH * 1.7 : 0);
        const base = L.top + row.y + L.capH * 0.5;
        signCaps(g, row.text, x, base, { capH: L.capH, tracking: TRACK, pen: Math.max(1.3, L.capH * 0.12), align: 'left', seed: 620 + (i + k) * 17 + Math.round(row.y), boil, alpha: row.indent ? 0.9 : 1 });
        signCaps(g, row.folio, right, base, { capH: L.capH, tracking: 0.18, pen: 1.3, align: 'right', seed: 640 + (i + k) * 17 + Math.round(row.y), boil, alpha: 0.8 });
        // the lead: points laid between the name and its folio, thin enough that the eye runs along
        // them and does not read them
        const from = x + signWidth(row.text, { capH: L.capH, tracking: TRACK }) + L.capH * 0.7;
        const to = right - signWidth(row.folio, { capH: L.capH, tracking: 0.18 }) - L.capH * 0.7;
        for (let dx = from; dx < to; dx += L.capH * 0.62) {
          inkLine(g, dx, base - L.capH * 0.06, dx + L.capH * 0.1, base - L.capH * 0.06, { width: S.pen * 0.5, wobble: 0.3, rng: put, alpha: 0.3 });
        }
      }
      const folio = String(i + k + 1);
      signCaps(g, folio, k === 0 && S.spread ? x0 : right, S.sh - S.padY * 0.45, { capH: L.capH * 0.82, tracking: 0.18, pen: 1.3, align: k === 0 && S.spread ? 'left' : 'right', seed: 90 + i + k, boil, alpha: 0.75 });
      return;
    }
    if (L.plate) {
      // THE CARD'S OWN PAGE, and the pen does almost nothing on it: the plate is an IMAGE lying on
      // the paper (the DOM puts it there, see `img` below) exactly as it lies on the ? card's third
      // face, with no ink pass over it, no contour round it and no hatch on it. What is struck here
      // is the bed it lies in — a tight band of strokes off its bottom and right edges, which is
      // the same mark the sheet itself uses to say one thing is lying on another — and the card's
      // name at the foot, because a plate in a book is captioned and a card on a table is not.
      const P = plateBox(S, box);
      const band = Math.max(4, S.pen * 4);
      for (let n = 0, m = Math.round(P.w / (S.pen * 1.3)); n < m; n++) {
        const x = P.x + put() * P.w;
        if (put() < 0.35) continue;
        inkLine(g, x, P.y + P.h + 0.4, x + (put() - 0.5) * 1.2, P.y + P.h + band * (0.2 + 0.8 * put()), { width: S.pen * 0.45, wobble: 0.3, rng: put, alpha: 0.5 });
      }
      for (let n = 0, m = Math.round(P.h / (S.pen * 1.3)); n < m; n++) {
        const y = P.y + put() * P.h;
        if (put() < 0.35) continue;
        inkLine(g, P.x + P.w + 0.4, y, P.x + P.w + band * (0.2 + 0.8 * put()), y + (put() - 0.5) * 1.2, { width: S.pen * 0.45, wobble: 0.3, rng: put, alpha: 0.5 });
      }
      const cap = L.capH * 0.86;
      const name = signFold(`${L.entry.head}${L.entry.num ? ` · ${L.entry.num}` : ''}`);
      signCaps(g, name, box.x + box.w / 2, P.y + P.h + band + cap * 1.2, { capH: cap, tracking: 0.2, pen: Math.max(1.3, cap * 0.12), seed: 700 + i + k, boil, alpha: 0.85 });
      const folio = String(i + k + 1);
      signCaps(g, folio, k === 0 && S.spread ? box.x + S.padX : box.x + box.w - S.padX, S.sh - S.padY * 0.45, { capH: L.capH * 0.82, tracking: 0.18, pen: 1.3, align: k === 0 && S.spread ? 'left' : 'right', seed: 90 + i + k, boil, alpha: 0.75 });
      return;
    }
    const x0 = box.x + S.padX;
    if (L.entry.kind === 'title') {
      // the title page: centred, no running head, and set at a bigger hand
      const mid = box.x + box.w / 2;
      let y = S.sh * 0.3;
      L.entry.lines.forEach((ln, n) => {
        if (!ln) {
          y += L.capH * 1.1;
          return;
        }
        const big = n < 2;
        const capH = big ? L.capH * (n === 0 ? 2.6 : 1.5) : L.capH;
        signCaps(g, signFold(ln), mid, y + capH * 0.5, { capH, tracking: big ? 0.24 : TRACK, pen: Math.max(1.5, capH * 0.13), seed: 200 + n, boil });
        y += capH * (big ? 1.9 : LEAD);
      });
      return;
    }
    let y = S.padY;
    if (L.head) {
      // the running head, and the numeral out at the fore-edge where a trump's number belongs
      signCaps(g, L.head, x0, y + L.headCap * 0.5, { capH: L.headCap, tracking: 0.22, pen: Math.max(1.45, L.headCap * 0.13), align: 'left', seed: 11 + i + k, boil });
      if (L.entry.num) {
        signCaps(g, signFold(L.entry.num), box.x + box.w - S.padX, y + L.headCap * 0.5, { capH: L.headCap, tracking: 0.22, pen: Math.max(1.4, L.headCap * 0.12), align: 'right', seed: 31 + i + k, boil });
      }
      const ry = y + L.headCap * 1.5;
      rule(g, x0, ry, box.x + box.w - S.padX, ry, S.pen * 0.7, nib, 3, 0.85);
    }
    y = L.top;
    for (const row of L.rows) {
      signCaps(g, row.text, x0, y + row.y + L.capH * 0.5, { capH: L.capH, tracking: TRACK, pen: Math.max(1.35, L.capH * 0.125), align: 'left', seed: 400 + (i + k) * 13 + Math.round(row.y), boil });
    }
    // the folio, at the foot of the page's own outer corner
    const folio = String(i + k + 1);
    signCaps(g, folio, k === 0 && S.spread ? x0 : box.x + box.w - S.padX, S.sh - S.padY * 0.45, { capH: L.capH * 0.82, tracking: 0.18, pen: 1.3, align: k === 0 && S.spread ? 'left' : 'right', seed: 90 + i + k, boil, alpha: 0.75 });
  });
  return c;
}

// THE CARD'S PLATE, on whichever page it is standing on. The supplied sheets are 1024 x 1792
// (help-cards.js, PLATE) and they are never cropped and never re-drawn: the box is the largest 4:7
// rectangle the page's own margins leave, centred in it. What that comes out at:
//   1280x800   320 x 560 px on a page 436 wide — the plate is bound by the page's HEIGHT
//   390x844    282 x 493 px on a page 342 wide, where it is bound by the width by 2 px
const PLATE = { w: 1024, h: 1792 };
function plateBox(S, box) {
  const availW = box.w - 2 * S.padX, availH = S.sh - 2 * S.padY;
  const w = Math.max(40, Math.min(availW, (availH * PLATE.w) / PLATE.h));
  const h = (w * PLATE.h) / PLATE.w;
  return { x: box.x + (box.w - w) / 2, y: (S.sh - h) / 2, w, h };
}

// ---- THE FOLDED CORNER ---------------------------------------------------------------------------
// The way back to the contents, and it is a mark rather than a control: the top OUTER corner of the
// leaf turned down, which is what a person does to a page they mean to come back to. No word on it,
// no box round it, no cursor of its own — the same rule as the spine that opens the book and the
// tab cut into the placard's edge. It stands at the fore-edge corner, clear of the running head's
// own margin (padX is 37 px on a laptop and 29 on a phone against a fold of 27 and 24), and clear of
// the plate, which is centred in a page that leaves 58 px of margin at the laptop and 30 at the phone.
const foldSize = (S) => Math.max(16, Math.min(30, S.sh * 0.042));
function foldBox(S, box, k) {
  const f = foldSize(S);
  const left = S.spread && k === 0; // the verso's outer edge is the left one
  return { x: left ? box.x : box.x + box.w - f, y: 0, w: f, h: f, left };
}
// …grown about its own corner to the 44 px a thumb needs, which it always does
function foldTap(S, box, k) {
  const b = foldBox(S, box, k);
  const s = Math.max(MIN_TAP, b.w);
  return { x: b.left ? b.x : b.x + b.w - s, y: 0, w: s, h: s, left: b.left };
}
function dogEar(g, S, box, k, nib, pen) {
  const b = foldBox(S, box, k);
  const corner = b.left ? b.x : b.x + b.w; // the corner of the page itself
  const dir = b.left ? 1 : -1;
  const f = b.w;
  rule(g, corner + dir * f, 0, corner, f, pen * 0.62, nib, 2, 0.9); // the crease
  // the flap lying on the page: hatch parallel to the crease, the room's own mark for one sheet on
  // another, and it thins as it goes into the corner
  for (let i = 1; i <= 4; i++) {
    const t = i / 5.2;
    inkLine(g, corner + dir * f * t, 0, corner, f * t, { width: pen * 0.34, wobble: 0.55, rng: nib, alpha: 0.34 - 0.05 * i });
  }
}

// the one or two page boxes on the sheet, in sheet coordinates
function pageBoxes(S) {
  if (!S.spread) return [{ x: S.edge + S.gut, w: S.pageW }];
  return [
    { x: S.edge, w: S.pageW },
    { x: S.edge + S.pageW + S.gut, w: S.pageW },
  ];
}

// ---------------------------------------------------------------------------------------------
export function buildBooks(ctx, { switches, place }) {
  const THREE = ctx.THREE;
  const glass = ctx.renderer?.domElement ?? null;
  const tall = () => ctx.pieces?.props?.tallCase ?? null;

  // ---- 1. THE FOUR SPINES ---------------------------------------------------------------------
  // Found by title, and among books of that title by the one nearest the place written down above —
  // so a re-deal of the case's pen moves the book rather than silently opening the wrong one. The
  // TAROT is the exception and is found by PLACE alone: whatever the dice put at (−2.039, 0.97) is
  // the book that gets his name struck on its back.
  const _v = new THREE.Vector3();
  const found = [];
  {
    const T = tall();
    const all = T ? T.books : [];
    const at = (m) => {
      m.getWorldPosition(_v);
      return [_v.x, _v.y, _v.z];
    };
    const taken = new Set();
    for (const s of SPINES) {
      const pool = all.filter((m) => !taken.has(m) && (s.letter || m.userData.title === s.key));
      if (!pool.length) continue;
      let best = null, bestD = Infinity;
      for (const m of pool) {
        const p = at(m);
        const d = Math.hypot(p[0] - s.at[0], p[1] - s.at[1]);
        if (d < bestD) {
          best = m;
          bestD = d;
        }
      }
      if (!best || bestD > 0.35) continue; // nothing of that name anywhere near where it was
      taken.add(best);
      if (s.letter) reletter(best, { title: s.letter.title, sub: s.letter.sub, seed: 907 });
      found.push({ key: s.key, mesh: best, was: best.userData.title, at: at(best), d: bestD, switch: s.switch !== false });
    }
  }

  // a spine's box on the glass: the eight corners of the board, projected. Grown to a thumb's 44,
  // which on this shot it always needs — a 45 mm spine is 24 px across at 1280x800 and 16 on a
  // phone (camera-shots.js, `case`).
  function boxOf(mesh) {
    if (!mesh || !ctx.camera) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const g = mesh.geometry;
    if (!g?.boundingBox) g?.computeBoundingBox?.();
    const bb = g?.boundingBox;
    if (!bb) return null;
    ctx.camera.updateMatrixWorld();
    mesh.updateWorldMatrix(true, false);
    const xs = [], ys = [];
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
      _v.set(x, y, z);
      mesh.localToWorld(_v);
      _v.applyMatrix4(ctx.camera.matrixWorldInverse);
      if (_v.z > -ctx.camera.near) return null;
      _v.set(x, y, z);
      mesh.localToWorld(_v).project(ctx.camera);
      xs.push(((_v.x + 1) / 2) * W);
      ys.push(((1 - _v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  function tapBoxOf(mesh) {
    const b = boxOf(mesh);
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }

  // ---- 2. THE SHEET -----------------------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
    #book { z-index: 3; display: none; pointer-events: none; }
    #book.up { display: block; pointer-events: auto; cursor: default; }
    #book > canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    /* THE CARD'S PLATE, lying on the page. It is an IMG and not a canvas for the reason the ? card's
       own third face is one (help-cards.js): the plate is a printed thing photographed, the browser
       scales it with its own filtering, and nothing in this film's pen is allowed anywhere near it —
       no ink pass, no boil, no contour, no hatch over the picture. It is hidden on every leaf that
       is not a plate. */
    #book > img.plate { position: absolute; display: none; }
    #book > img.plate.on { display: block; }
  `;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'book';
  const canvas = document.createElement('canvas');
  root.appendChild(canvas);
  const img = document.createElement('img');
  img.className = 'plate';
  img.alt = '';
  img.decoding = 'async';
  root.appendChild(img);
  ctx.dom.overlay.appendChild(root);
  const g2 = canvas.getContext('2d');
  // where the plate for THIS opening goes, or nothing. On a spread it is always the verso, because
  // paginate() puts it there; on a phone it is the one page there is.
  function layPlate(b) {
    const boxes = pageBoxes(b.S);
    let put = null;
    boxes.forEach((box, k) => {
      const L = b.leaves[b.page + k];
      if (L?.plate && !put) put = { slug: L.plate, at: plateBox(b.S, box) };
    });
    if (!put) {
      img.classList.remove('on');
      img.removeAttribute('src');
      return null;
    }
    const url = `/cards/${put.slug}.webp`;
    if (img.getAttribute('src') !== url) img.src = url;
    img.style.left = `${Math.round(b.box.x + put.at.x)}px`;
    img.style.top = `${Math.round(b.box.y + put.at.y)}px`;
    img.style.width = `${Math.round(put.at.w)}px`;
    img.style.height = `${Math.round(put.at.h)}px`;
    img.classList.add('on');
    return put;
  }

  let showing = null; // the title of the book that is up, or null
  let leaf = 0;
  let cut = null; // { key, S, book, cap, leaves, plates: [], box }
  let cutAt = '';
  let painted = '';

  function lay(key) {
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const want = `${key}|${Math.round(w)}x${Math.round(h)}@${dpr}|${leaf}`;
    if (want === cutAt && cut) return cut;
    const S = sheetOf(w, h);
    const book = BOOKS[key];
    if (!book) return null;
    const page = S.spread ? leaf - (leaf % 2) : leaf;
    const reuse = cut && cut.key === key && cut.S.sw === S.sw && cut.S.sh === S.sh;
    const { cap, leaves, index, indexAt } = reuse ? cut : paginate(book, S);
    cutAt = want;
    cut = {
      key, S, book, cap, leaves, index, indexAt, page,
      plates: [0, 1].map((parity) => strike(S, leaves, page, parity, dpr)),
      box: { x: Math.round((w - S.sw) / 2), y: Math.round((h - S.sh) / 2), w: S.sw, h: S.sh },
      dpr,
    };
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    cut.card = layPlate(cut);
    painted = '';
    return cut;
  }

  function paint(parity) {
    if (!showing) return;
    const b = lay(showing);
    if (!b) return;
    const key = `${cutAt}|${parity}`;
    if (key === painted) return;
    painted = key;
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    g2.setTransform(b.dpr, 0, 0, b.dpr, 0, 0);
    g2.clearRect(0, 0, w, h);
    g2.drawImage(b.plates[parity ? 1 : 0], b.box.x - BLEED, b.box.y - BLEED, b.S.sw + 2 * BLEED, b.S.sh + 2 * BLEED);
  }

  function open(key) {
    // …AND ONLY A BOOK THE ROOM ACTUALLY HAS. `BOOKS` is the list (book-tarot.js) and it is the
    // whole of the test now: the trigger moved off the shelf and onto the reading table this round,
    // so requiring a SPINE for it would refuse the very click that is meant to open it.
    if (!BOOKS[key]) return false;
    showing = key;
    leaf = 0;
    fromList = null;
    cutAt = '';
    root.classList.add('up');
    ctx.pieces.sound?.play?.('settle');
    ctx.emit?.('book', { title: key, leaf: 0 });
    paint(ctx.clock.frame % 2);
    return true;
  }
  function close() {
    if (!showing) return false;
    const was = showing;
    showing = null;
    root.classList.remove('up');
    img.classList.remove('on');
    ctx.emit?.('book', { title: null, from: was });
    return true;
  }
  function turn(d) {
    if (!showing || !cut) return false;
    const step = cut.S.spread ? 2 : 1;
    const next = Math.max(0, Math.min(cut.leaves.length - 1, leaf + d * step));
    if (next === leaf) return false;
    leaf = next;
    cutAt = '';
    ctx.pieces.sound?.play?.('card');
    ctx.emit?.('book', { title: showing, leaf });
    paint(ctx.clock.frame % 2);
    return true;
  }
  // STRAIGHT THERE, off a line of the contents or off the folded corner. The same act as a turn as
  // far as the book is concerned — one leaf is put in front of the visitor and the pen strikes it —
  // but it remembers WHICH LEAF OF THE LIST it was sent from, so the corner brings the visitor back
  // to the line they were reading rather than to the top of a list five leaves long.
  let fromList = null;
  function goLeaf(n, from = null) {
    if (!showing || !cut) return false;
    const next = Math.max(0, Math.min(cut.leaves.length - 1, Math.round(n)));
    if (from != null) fromList = from;
    if (next === leaf) return false;
    leaf = next;
    cutAt = '';
    ctx.pieces.sound?.play?.('card');
    ctx.emit?.('book', { title: showing, leaf });
    paint(ctx.clock.frame % 2);
    return true;
  }
  // back to the contents: the leaf of the list the visitor left from, or the head of it
  function back() {
    if (!showing || !cut) return false;
    const at = cut.indexAt ?? 0;
    const slots = cut.leaves.filter((L) => L.index).length;
    const want = fromList != null && fromList >= at && fromList < at + slots ? fromList : at;
    return goLeaf(want);
  }
  // what is under a click on the sheet, in the sheet's own coordinates: a folded corner, a line of
  // the contents, or nothing — in that order, because the corner sits inside the half of the page
  // that would otherwise turn it.
  function hitAt(x, y) {
    if (!cut) return null;
    const boxes = pageBoxes(cut.S);
    for (let k = 0; k < boxes.length; k++) {
      const L = cut.leaves[cut.page + k];
      if (!L || L.blank) continue;
      if (!L.index && L.entry.kind !== 'title') {
        const f = foldTap(cut.S, boxes[k], k);
        if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) return { kind: 'fold' };
      }
      if (!L.index) continue;
      for (const row of L.rows) {
        const top = L.top + row.y - L.lead * 0.2;
        if (y >= top && y <= top + L.lead && x >= boxes[k].x + cut.S.padX * 0.35 && x <= boxes[k].x + boxes[k].w - cut.S.padX * 0.35) {
          return { kind: 'line', target: row.target, label: row.text, from: cut.page + k };
        }
      }
    }
    return null;
  }

  // ---- 3. THE POINTER ---------------------------------------------------------------------------
  for (const f of found.filter((q) => q.switch)) {
    switches?.add?.({
      name: `book-${f.key}`,
      object: () => f.mesh,
      tapBox: () => tapBoxOf(f.mesh),
      // a spine only answers while the visitor is standing at the case, and only while there is no
      // book already up — the sheet in front of the room owns the pointer while it is there
      enabled: () => place() === 'case' && !showing,
      onDown: () => open(f.key),
    });
  }
  // the sheet's own manners: a click on the right page turns forward, on the left back, and one off
  // the paper puts the book down. The notice keeps exactly these and for the same reason.
  root.addEventListener('pointerdown', (e) => e.stopPropagation());
  root.addEventListener('click', (ev) => {
    if (!showing || !cut) return;
    const r = root.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const b = cut.box;
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) {
      close();
      return;
    }
    // the corner first, then a line of the contents, then the page itself
    const hit = hitAt(x - b.x, y - b.y);
    if (hit?.kind === 'fold') {
      back();
      return;
    }
    if (hit?.kind === 'line') {
      goLeaf(hit.target, hit.from);
      return;
    }
    turn(x - b.x > b.w / 2 ? 1 : -1);
  });
  window.addEventListener('keydown', (ev) => {
    const t = ev.target?.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return;
    if (!showing) return;
    if (ev.key === 'Escape') {
      ev.stopImmediatePropagation();
      close();
    } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.stopImmediatePropagation();
      turn(ev.key === 'ArrowRight' ? 1 : -1);
    }
  });
  ctx.on?.('resize', () => {
    cutAt = '';
    if (showing) paint(ctx.clock.frame % 2);
  });

  return {
    get showing() {
      return !!showing;
    },
    get title() {
      return showing;
    },
    get leaf() {
      return leaf;
    },
    get leaves() {
      return cut?.leaves?.length ?? 0;
    },
    get cap() {
      return cut?.cap ?? null;
    },
    get spread() {
      return cut?.S?.spread ?? null;
    },
    get box() {
      return showing && cut ? { ...cut.box } : null;
    },
    // WHAT CARD IS ON THE OPENING THAT IS UP, and where its plate is on the glass — which is what a
    // proof counts the card's own ink inside. Null on a leaf that carries no plate.
    get card() {
      if (!showing || !cut?.card) return null;
      const r = root.getBoundingClientRect();
      const b = cut.card.at;
      return { slug: cut.card.slug, x: Math.round(cut.box.x + b.x + r.left), y: Math.round(cut.box.y + b.y + r.top), w: Math.round(b.w), h: Math.round(b.h) };
    },
    // every leaf, as a word: 'title' · 'index' · 'plate:<slug>' · 'blank' · a running head. A proof
    // walks this instead of turning the book twice.
    get sheetLeaves() {
      return (cut?.leaves ?? []).map((L) => (L.plate ? `plate:${L.plate}` : L.blank ? 'blank' : L.index ? 'index' : L.entry.kind === 'title' ? 'title' : L.head ?? '?'));
    },
    // THE CONTENTS AS A LIST: every line, the folio lettered beside it and the leaf it turns to. A
    // proof reads this and then clicks each line on the glass to see whether the book agrees with
    // its own list.
    get index() {
      return (cut?.index ?? []).map((ln) => ({ label: ln.label, num: ln.num, indent: ln.indent, target: ln.target, folio: ln.folio }));
    },
    get indexAt() {
      return cut?.indexAt ?? 0;
    },
    get indexLeaves() {
      return (cut?.leaves ?? []).filter((L) => L.index).length;
    },
    // the lines of the contents that are on the opening in front of the visitor, as boxes on the
    // GLASS — what a proof clicks
    indexHits: () => {
      if (!showing || !cut) return [];
      const r = root.getBoundingClientRect();
      const out = [];
      pageBoxes(cut.S).forEach((box, k) => {
        const L = cut.leaves[cut.page + k];
        if (!L?.index) return;
        for (const row of L.rows) {
          out.push({
            label: row.label, // the name on its own, which is the entry's running head
            text: row.text, // …and the line as it is lettered, numeral and all
            folio: row.folio,
            target: row.target,
            leaf: cut.page + k,
            x: Math.round(cut.box.x + r.left + box.x + cut.S.padX * 0.35),
            y: Math.round(cut.box.y + r.top + L.top + row.y - L.lead * 0.2),
            w: Math.round(box.w - cut.S.padX * 0.7),
            h: Math.round(L.lead),
          });
        }
      });
      return out;
    },
    // the folded corners on the opening in front of the visitor, as boxes on the glass
    foldBoxes: () => {
      if (!showing || !cut) return [];
      const r = root.getBoundingClientRect();
      return pageBoxes(cut.S)
        .map((box, k) => {
          const L = cut.leaves[cut.page + k];
          if (!L || L.blank || L.index || L.entry.kind === 'title') return null;
          const f = foldTap(cut.S, box, k);
          return { x: Math.round(cut.box.x + r.left + f.x), y: Math.round(cut.box.y + r.top + f.y), w: Math.round(f.w), h: Math.round(f.h) };
        })
        .filter(Boolean);
    },
    // the four spines, as the room found them: what they read now, what they read before, and where
    // they stand. A proof reports this instead of taking the list above on trust.
    get spines() {
      return found.map((f) => ({ title: f.key, was: f.was, at: f.at.map((n) => +n.toFixed(3)), off: +f.d.toFixed(3) }));
    },
    tapBox: (key) => tapBoxOf(found.find((f) => f.key === key)?.mesh),
    // every spine's own thumb box, for the case's hotspot to subtract from itself (walk.js, `hitOf`)
    spineBoxes: () => found.map((f) => tapBoxOf(f.mesh)).filter(Boolean),
    // the text of the leaf that is up, in the hand's own folded case, for a proof that has to read
    // the page rather than look at it
    text: () => {
      if (!showing || !cut) return null;
      const boxes = pageBoxes(cut.S);
      return boxes
        .map((_, k) => cut.leaves[cut.page + k])
        .filter(Boolean)
        .map((L) => [L.head, ...L.rows.map((r) => r.text)].filter(Boolean).join(' '))
        .join(' || ');
    },
    open,
    close,
    turn,
    goLeaf,
    back,
    update() {
      if (!showing) return;
      paint(ctx.clock.frame % 2);
    },
  };
}
