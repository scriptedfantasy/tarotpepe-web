// walk-book — FOUR SPINES ON THE TALL CASE COME OFF IT AND OPEN.
//
// The user: "Also the user should be able to walk up to the bookshelf and open books. One of the
// books in the bookshelf has to be entitled TAROT by PEPE. Users should be able to open it and read
// through pepe's take of the tarot."
//
// So four of the thirty-three spines standing in that case are switches. Click one and the book
// comes off the shelf and stands open over the room as a spread: paper, a gutter, the block of
// leaves at each outer edge, drawn in the room's own pen, with the text lettered in the signwriter's
// hand — the same hand, the same nib and the same boil as the notice under the shop's sign, which
// is the model for anything in this film a visitor READS (src/pieces/help.js, help-bill.js).
//
// NOTHING ANNOUNCES THEM. No gilding, no glow, no tag. Four spines out of thirty-three answer a
// pointer and the other twenty-nine are books on a shelf; a visitor who never runs a cursor along
// the row never finds out. Which four, and the measurement that chose them, is WHICH SPINES below.
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
//   1280x800   a spread, 950 x 660, two pages of 436 — and the whole of TAROT BY PEPE in 30 leaves
//   390x844    ONE page, because two pages of 170 px is not a book, it is a column of hyphens. The
//              sheet is 374 x 524 and the spread is CROPPED to its recto: the gutter and the far
//              page's edge still run down the left, so what is on the phone is an open book seen
//              close, and turning goes one leaf at a time exactly as it does on a laptop.
//
// api (ctx.pieces.walk.books):
//   open(title) · close() · turn(+1|-1) · showing · title · leaf · leaves · spines
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
const SPINES = [
  { key: 'TAROT', at: [-2.039, 0.97], letter: TAROT_BY_PEPE.spine },
  { key: 'MARSEILLE', at: [-1.957, 0.97] },
  { key: 'CHIROMANCIE', at: [-1.496, 0.97] },
  { key: 'LE DESTIN', at: [-1.969, 0.52] },
];
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

// THE WHOLE BOOK, CUT INTO LEAVES for this window. One cap for all of it — the largest at which the
// longest entry still fits a single leaf — and then every entry is laid out at that hand, starting
// on a leaf of its own and spilling only if it must.
function paginate(book, S) {
  let cap = CAP_MAX;
  for (; cap > CAP_MIN; cap -= 0.5) {
    if (book.pages.every((e) => setPage(e, S, cap).fits)) break;
  }
  cap = Math.max(CAP_MIN, cap);
  const leaves = [];
  for (const entry of book.pages) {
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
  return { cap, leaves };
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
      found.push({ key: s.key, mesh: best, was: best.userData.title, at: at(best), d: bestD });
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
  `;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'book';
  const canvas = document.createElement('canvas');
  root.appendChild(canvas);
  ctx.dom.overlay.appendChild(root);
  const g2 = canvas.getContext('2d');

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
    const { cap, leaves } = reuse ? cut : paginate(book, S);
    cutAt = want;
    cut = {
      key, S, book, cap, leaves, page,
      plates: [0, 1].map((parity) => strike(S, leaves, page, parity, dpr)),
      box: { x: Math.round((w - S.sw) / 2), y: Math.round((h - S.sh) / 2), w: S.sw, h: S.sh },
      dpr,
    };
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
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
    if (!BOOKS[key]) return false;
    showing = key;
    leaf = 0;
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

  // ---- 3. THE POINTER ---------------------------------------------------------------------------
  for (const f of found) {
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
    // the four spines, as the room found them: what they read now, what they read before, and where
    // they stand. A proof reports this instead of taking the list above on trust.
    get spines() {
      return found.map((f) => ({ title: f.key, was: f.was, at: f.at.map((n) => +n.toFixed(3)), off: +f.d.toFixed(3) }));
    },
    tapBox: (key) => tapBoxOf(found.find((f) => f.key === key)?.mesh),
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
    update() {
      if (!showing) return;
      paint(ctx.clock.frame % 2);
    },
  };
}
