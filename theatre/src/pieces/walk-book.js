// walk-book — TAROT BY PEPE IS A BOOK ON A TABLE AND IT OPENS.
//
// The user: "the book has to open on the table, like actually swing open, then each page has to turn
// upon clicking — the content has to have a book sign, so we can always switch back to it."
//
// For three rounds it was a SHEET: a spread struck onto one canvas and laid over the room, with the
// gutter, the block of leaves and a folded corner all drawn into the picture of a book. It is a book
// now. Boards, a text block, a sewn back and one leaf at a time in the visitor's hand, lying on the
// reading table stage right (src/pieces/props-table.js), read from the plan shot the visitor walked
// to, and turned by clicking the paper. Nothing stands in front of the room any more.
//
// ---- WHAT IS ON THE TABLE ----------------------------------------------------------------------
// The closed book is props-table.js's and is unchanged: 170 x 240 mm of board, 45 mm thick, lying
// face up and turned nine degrees off square the way a book somebody put down is. This file builds
// the SAME object open, so that at the first drawing of the swing the two are the same silhouette
// and the swap cannot be seen:
//
//   THE BOARDS      170 x 240 x 2.5 mm each, the closed book's own footprint. The front one carries
//                   the cover props-table letters — the same material instance, so there is one
//                   drawing of that cover in the film.
//   THE TEXT BLOCK  the same 170 x 240, 40 mm thick, flush with the boards. 45 = 2.5 + 40 + 2.5.
//   THE LEAVES      160 x 226 — ten millimetres inside the block at the fore-edge and seven at head
//                   and tail, and that is not a margin, see THE PAGE IS SMALLER THAN THE BLOCK. And
//                   there are THREE MESHES, whatever the book runs to: at rest two of them are the
//                   facing pages and the third is parked; during a turn they are the leaf going over,
//                   the leaf it uncovers and the leaf it is about to land on. Everything else is the
//                   two PILES — a box either side of the gutter whose height is the leaves that have
//                   been turned and the leaves that have not — so the mass of the book crosses the
//                   gutter as the visitor reads, which is the one thing a sheet could never show.
//   THE SEWN BACK   a 6 mm strip in the gutter, the room's dark edge, standing to the top of the
//                   shallower pile and tucked 8 mm inside the block at head and tail.
//   THE RIBBON      see THE BOOK SIGN.
//
// AND ALL OF IT TURNS ON ONE AXIS: the spine at the block's own mid-height, which is the joint of a
// case binding and is the reason the shut book and the open one are the same object rather than two
// arrangements somebody has to keep in step. See HINGE.
//
// AND IT SQUARES ITSELF UP AS IT OPENS. A book opened at its first leaf puts the front board on the
// table to the LEFT of the block and the whole spread then hangs off that side: measured, with the
// block left exactly where props-table lays it, the open spread runs x 1.995 .. 2.355 against a
// table that ends at 1.980 — fifteen millimetres of board, and a frame composed on the spread has
// 62 px of FLOORBOARD down its left edge at 1280x800 and none down its right. So the block slides
// 75 mm along its own long axis over the same eight drawings the board swings through, which puts
// the spine on the table's own centre line (2.250) with 90 mm of table either side of the spread.
// It is what a person does with the hand that is not holding the cover, and it slides back when the
// book shuts, so the closed book is where props-table put it to the millimetre.
//
// ---- THE PAGES PASS THE INK PASS VERBATIM ------------------------------------------------------
// Every leaf's two faces are canvases struck by src/pieces/walk-book-page.js and laid on the leaf as
// a texture flagged `verbatim` (ink.js, ink-shaders.js): the composite shows the bytes and does
// nothing else to them — no contour round the lettering, no hatch over it, no tone from the pendant,
// no second nib beside the first. It is the picture-of-the-room's own flag (egg-droste.js) and it is
// here for the same reason: a page of this book is already a finished drawing, and the one thing the
// pen must not do is draw it twice. The card plates are drawn INTO that canvas at the size the page
// gives them, so the supplied sheet reaches the glass through one resampling and no ink at all.
// The boards, the piles, the sewn back and the ribbon are geometry and are inked like any other
// drawn thing in this room.
//
// AND THE TWO FACING PAGES STILL BOIL. Each of them is struck TWICE — the nib re-rolled, nothing
// else changed — and the leaf is given one plate or the other on the twelve, which is the sheet's
// own arrangement and costs a texture bind a drawing. The leaf that is TURNING is struck once: a
// drawing that is moving is not re-struck, which is what an animator does and what every other
// moving thing in this film does.
//
// ---- WHAT A CLICK DOES -------------------------------------------------------------------------
//   the RIGHT page   turns over the spine onto the left, six drawings on the twelves, its back
//                    showing on the way over and the leaf under it uncovered
//   the LEFT page    the same, backwards
//   a CONTENTS LINE  a RIFFLE: the leaves between here and there go over in a run of two drawings
//                    each, capped at twenty-four so the longest jump in the book is under two
//                    seconds, landing on the page the line names. The line is found by raycasting
//                    the leaf and putting the uv through the boxes the page recorded when it was
//                    lettered — there is no second geometry for the list and no invisible button.
//   the RIBBON       riffles back to the contents
//   anything else    shuts the book; again, or Escape, and the visitor walks back to the chair
//
// ---- THE BOOK SIGN -----------------------------------------------------------------------------
// The user asked for one in so many words. It is a RIBBON sewn into the back — 8 mm of the room's
// own pen, hatched, with a swallowtail cut in the end — lying down the gutter and hanging 20 mm out
// past the head of the block, where it is in the picture from every page of the book. Clicking it
// riffles back to the contents, at the leaf of the list the visitor jumped from rather than the top
// of it. It replaces the folded corner the sheet used to carry, which was a mark a visitor had to
// find on the page they were on; a ribbon is a thing sticking out of a book.
//
// The 35 mm it hung out at first put its tip off the top of the frame at 1280x800 — the spread shot
// keeps 20 mm of table round the book and the tail was 15 mm longer than that — so it is 20 mm, and
// the whole of it is in the picture at every window.
//
// ---- HOW A PAGE IS BOUND TO A LEAF -------------------------------------------------------------
// The pagination pairs EVEN with ODD — page 2k and 2k+1 are one opening, and the printer's blank in
// front of a plate is there to keep that pairing (walk-book-page.js). A physical leaf has two faces,
// so the binding that gives those pairs is:
//
//     the FRONT of leaf i is page 2i-1        the BACK of leaf i is page 2i
//
// which puts page 0 — the title — on the back of the very first leaf, with a blank flyleaf in front
// of it and the front board's paste-down facing that. Opening k (k leaves turned) is then
// (page 2k-2 | page 2k-1), and the visitor starts at opening 1: the title facing the contents, which
// is the first opening the sheet used to show. 313 pages is 157 leaves on a 1280x800 laptop.
//
// ---- AND A PHONE READS ONE LEAF AT A TIME ------------------------------------------------------
// A spread of two 160 mm pages seen from a metre and a half above cannot be read on a 390 px screen.
// Measured: the leaf comes out 162 px across, and the sign hand's own floor of 13 px leaves a measure
// of 134 px inside the page's margins — nine characters to a line, which is a column of hyphens and
// not a book. So a window narrower than 1.05 frames ONE LEAF — 315 x 445 px of a 390 x 844 screen,
// still at the 13 px cap — and a click walks the LENS across the gutter before the leaf itself turns:
// from a verso the click only swings the camera to the recto beside it; from a recto it swings back
// to the verso and the leaf comes over and lands in front of it. Half the clicks in the book move the
// camera and half move paper, which is the honest answer to reading a spread through a letterbox and
// is the same call the reading shot already makes for the closed book.
//
// WHAT IT ALL MEASURES, with no browser in it (tools/_book-measure.mjs solves the shot and cuts the
// leaves; tools/_book-proof.mjs then measures the same things on a live page):
//   1280x800   the spread, an 11.4 deg lens; a leaf 425 x 601 px at a 13 px cap; 313 pages on 157
//              leaves of 0.255 mm — 78 plates, 6 of contents and 67 printer's blanks
//   1600x900   the spread; a leaf 478 x 676 px at 13 px; 190 pages on 96 leaves of 0.417 mm, 7 blanks
//   1200x1100  the spread; 485 x 685 px
//    390x844   ONE LEAF, a 16.2 deg lens; 315 x 445 px at 13 px; 346 pages on 174 leaves, 27 blanks
// The blanks are what a printer pays to keep a plate facing its own take: the smaller the page, the
// more his takes spill and the more often a card's leaf lands on the wrong parity and has to be
// pushed on by one. 67 of them at 1280x800 and 7 at 1600x900 is that arithmetic and nothing else.
//
// api (ctx.pieces.walk.books):
//   open(title) · close() · turn(+1|-1) · goLeaf(n, from) · back() · showing · title · leaf ·
//   leaves · cap · spread · card · sheetLeaves · index · indexAt · indexHits · ribbonBox · leafBox ·
//   headBox · swinging · turning · spines · tapBox · spineBoxes · text
import { INK, PAPER, inkLine, inkMaterial, canvasTexture, makeCanvas, hatch } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { reletter, materials } from './props-objects.js';
import { BOOKS, TAROT_BY_PEPE } from './book-tarot.js';
import { sheetOf, paginate, strikePage, plateBox, textOf, kindOf } from './walk-book-page.js';
import { place as framePlace } from './camera-frame.js';

// ---- WHICH SPINES, AND WHERE THEY STAND ----------------------------------------------------------
// Unchanged, and it is the whole of what is left of the tall case in this file. The TAROT spine on
// that case is re-lettered out of the GRAMMAIRE the case's own pen dealt there — re-lettered and not
// inserted, because `bookRow` deals a run off a shared stream and a book PUT INTO one re-deals every
// title after it. It is a book on a shelf: `switch: false`, no tap box, no cursor. What opens this
// book is the book lying on the reading table (props-table.js), which is what the user asked for
// when the table went in. Putting `switch: true` back is the whole of what it would take to have the
// case open it again.
const SPINES = [{ key: 'TAROT', at: [-2.039, 0.97], letter: TAROT_BY_PEPE.spine, switch: false }];
const MIN_TAP = 44; // px: what a thumb needs, whatever the thing measures on the glass

// ---- THE OBJECT ----------------------------------------------------------------------------------
const BOARD = { w: 0.17, h: 0.24, t: 0.0025 }; // the closed book's own footprint, and its two boards
// THE PAGE IS SMALLER THAN THE BLOCK, and that is not a margin, it is the reason the book has an
// edge at all. Seen from straight above, a leaf laid flush with the block hides it exactly — and a
// leaf passes the ink pass VERBATIM, so the contour the pen would have drawn round the block lands
// half on paper it is not allowed to mark and half on the table, and the first cut of this came back
// with no silhouette at all down the whole right-hand side of the open book.
//
// AND A PLAN VIEW WILL NOT SHOW A CUT EDGE, which is the second half of the same problem and is
// geometry, not taste: looking straight down at a 40 mm block, the only side face in the picture is
// the one facing the lens's own nadir — the block's GUTTER face, six pixels of it — and the
// fore-edge, the head and the tail are each one line where the top face meets the table. So the
// block of leaves is drawn where it CAN be seen: ten millimetres of the block's top is left standing
// proud of the leaf at the fore-edge and seven at head and tail (27 and 18 px at 1280x800), and the
// strokes stacked against the cut are struck into that band — which is the mark the sheet used to
// draw for the same reason, moved onto the object it describes.
const LEAF = { w: 0.16, h: 0.226 }; // the top sheet …
const PILE = { w: 0.17, h: 0.24 }; // … and the block under it, flush with the boards
const BLOCK = 0.04; // 45 mm closed, less the two boards
const SLIDE = 0.075; // the squaring-up as it opens: see AND IT SQUARES ITSELF UP
const LIFT = 0.00014; // a leaf mesh stands this far off the pile it lies on
const SEGS = 18; // spans along a leaf, which is what makes the bow a curve and not a crease
const BOW = 1.05; // radians of curl at the top of a turn; past 1.571 a leaf would fold under itself
const RIBBON = { w: 0.008, out: 0.02, in: 0.03 }; // the sign: its width, its tail, and how far into the gutter
// THE ONE AXIS EVERYTHING IN THIS BOOK TURNS ON: the spine, at the block's own mid-height. It is not
// a convenience, it is the joint of a case binding, and it is the only hinge that makes the shut
// book and the open one the SAME object. A rotation of π about a horizontal axis at height hy sends
// y to 2·hy − y, so with hy at the middle of the text block the top of the closed stack lands on the
// table and the bottom of it lands on top of the left pile: the front board, which is over
// everything when the book is shut, is under everything when it is open, and every leaf that goes
// over lands exactly on the pile the leaves before it made. Nothing has to be interpolated, and that
// identity — 2·hy − y(right) = y(left) — is why a leaf never has to be told where it is going.
const HINGE = BOARD.t + BLOCK / 2;

// THE DRAWINGS. Everything hand-animated in this film is on the twelve and these are counted, not
// eased: `SWING` is the front board going over — eight drawings, the last three of which are the
// board landing, lifting a hair and settling, which is the overshoot the user asked for — and `TURN`
// is one leaf, six drawings, flat to flat.
const SWING = [0, 0.16, 0.44, 0.74, 0.95, 1, 0.965, 1].map((u) => u * Math.PI);
const TURN = [0.18, 0.42, 0.66, 0.86, 0.97, 1].map((u) => u * Math.PI);
const RIFFLE_PER = 2; // drawings a leaf …
const RIFFLE_CAP = 24; // … and the cap: two seconds, whatever the jump

// THE RIBBON, in the room's own pen: a hatched band with a swallowtail cut in the end. The strip's
// v runs 0 at the TAIL to 1 into the gutter, which with a canvas texture's flip puts the tail at the
// FOOT of this drawing — so that is where the notch is cut. Everything the notch takes out is alpha
// 0 and the material's own alpha test throws it away, which is how the coat and the fringe on the
// lampshade are cut out of their sheets too.
function ribbonTexture() {
  const w = 40, h = 512;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = mulberry32(0x5b10c);
  g.clearRect(0, 0, w, h);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  const notch = 34; // the depth of the V, in the strip's own pixels
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(-1, h + 1);
  g.lineTo(-1, h - 1);
  g.lineTo(w / 2, h - notch);
  g.lineTo(w + 1, h - 1);
  g.lineTo(w + 1, h + 1);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';
  // the weave, close enough that the pass reads it as tone and not as a pattern
  hatch(g, 0, 0, w, h - 2, { angle: 1.05, spacing: 5, width: 1.3, wobble: 0.5, broken: 0.16, rng: r, alpha: 0.8 });
  // a line down each selvedge, and the two cut edges of the swallowtail
  inkLine(g, 2.5, 0, 2.5, h - 2, { width: 1.8, wobble: 0.7, rng: r, color: INK });
  inkLine(g, w - 2.5, 0, w - 2.5, h - 2, { width: 1.8, wobble: 0.7, rng: r, color: INK });
  inkLine(g, 2, h - 3, w / 2, h - notch + 2, { width: 1.8, wobble: 0.6, rng: r, color: INK });
  inkLine(g, w - 2, h - 3, w / 2, h - notch + 2, { width: 1.8, wobble: 0.6, rng: r, color: INK });
  return c;
}

// THE BLOCK OF LEAVES, struck on the top of the pile. Only the band the top sheet does not cover is
// ever in the picture — 6 % of the width at the fore-edge and 3 % of the length at head and tail —
// so that is where the strokes are, five to an edge, stacked against the cut and thinning inward.
// The middle of this drawing is never seen and is left as paper.
function blockTexture() {
  const w = 256, h = 361;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = mulberry32(0x3c41f);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  const band = (along, x0, y0, dx, dy, nx, ny, depth) => {
    for (let k = 1; k <= 5; k++) {
      const t = (depth * k) / 5.6;
      const a = [x0 + nx * t, y0 + ny * t];
      inkLine(g, a[0] - dx * 0.02, a[1] - dy * 0.02, a[0] + dx * 1.02, a[1] + dy * 1.02, { width: k === 5 ? 1.5 : 0.85, wobble: 0.8, rng: r, color: INK, alpha: 0.3 + 0.1 * k });
    }
    void along;
  };
  band('fore', w, 0, 0, h, -1, 0, w * 0.075);
  band('spine', 0, 0, 0, h, 1, 0, w * 0.075);
  band('head', 0, 0, w, 0, 0, 1, h * 0.04);
  band('tail', 0, h, w, 0, 0, -1, h * 0.04);
  return c;
}

// A SHEET OF NOTHING: the map a leaf carries before its page has been struck, and the one every leaf
// in a riffle carries the whole way over. PAPER and not white, because a verbatim material shows
// what it is given and white is not this film's paper — and with its own CUT EDGE printed on it,
// because a verbatim leaf has no contour of its own and a blank one without this is a sheet of paper
// that cannot be seen at all: the first cut of the riffle was an empty table with a sound over it.
function blankTexture() {
  const w = 128, h = 181;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = mulberry32(0x2f0a1);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  const e = (x1, y1, x2, y2) => inkLine(g, x1, y1, x2, y2, { width: 1.1, wobble: 0.5, rng: r, color: INK, alpha: 0.5 });
  e(1, 1, w - 1, 1);
  e(w - 1, 1, w - 1, h - 1);
  e(w - 1, h - 1, 1, h - 1);
  e(1, h - 1, 1, 1);
  return c;
}

// ---------------------------------------------------------------------------------------------
export function buildBooks(ctx, { switches, place }) {
  const THREE = ctx.THREE;
  const M = materials();
  const tall = () => ctx.pieces?.props?.tallCase ?? null;
  const _v = new THREE.Vector3();

  // ---- 1. THE SPINE ON THE TALL CASE ------------------------------------------------------------
  // Found by PLACE: whatever the case's own dice put at (−2.039, 0.97) is the board his name is
  // struck on. It is not a switch (see SPINES) and the three books that used to open with it are
  // books on a shelf; `spines`, `tapBox` and `spineBoxes` are still here because walk.js subtracts
  // them from the case's own hotspot and the proofs ask for them by name.
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
      if (!best || bestD > 0.35) continue;
      taken.add(best);
      if (s.letter) reletter(best, { title: s.letter.title, sub: s.letter.sub, seed: 907 });
      found.push({ key: s.key, mesh: best, was: best.userData.title, at: at(best), d: bestD, switch: s.switch !== false });
    }
  }
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

  // ---- 2. THE BOOK, BUILT OPEN ------------------------------------------------------------------
  const table = () => ctx.pieces?.props?.table ?? null;
  const group = new THREE.Group();
  group.name = 'tarot-book';
  group.visible = false;
  ctx.scene.add(group);
  const paper = new THREE.Group(); // everything a click on the PAGE may land on
  paper.name = 'tarot-book-paper';
  group.add(paper);
  const signGroup = new THREE.Group(); // …and the ribbon, which is its own switch
  group.add(signGroup);

  const xs = -BOARD.w / 2; // the spine, in the book's own coordinates: the left edge of the closed book
  const blankTex = canvasTexture(blankTexture(), { srgb: false });
  const pageMat = (side) => {
    const m = inkMaterial({ color: '#ffffff', map: blankTex, hatch: 0, lineWeight: 0, side });
    m.userData.ink.verbatim = true;
    return m;
  };

  // A LEAF. One geometry, two meshes: the front face is drawn FrontSide and the back BackSide off
  // the same triangles, so the winding decides which of the two the visitor is looking at and a leaf
  // halfway over shows both at once along its curl — which is what a page does. The back's texture
  // is mirrored in u (repeat −1) because a verso is lettered with its gutter on the RIGHT and the
  // uv runs from the gutter out: turn the leaf over and the two agree.
  function makeLeaf(name) {
    const n = SEGS;
    const pos = new Float32Array((n + 1) * 2 * 3);
    const uv = new Float32Array((n + 1) * 2 * 2);
    const idx = [];
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i <= n; i++) {
        const p = j * (n + 1) + i;
        uv[p * 2] = i / n;
        uv[p * 2 + 1] = j === 0 ? 1 : 0;
      }
    }
    for (let i = 0; i < n; i++) {
      const a = i, b = i + 1, c = n + 1 + i, d = n + 2 + i;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const front = pageMat(THREE.FrontSide);
    const back = pageMat(THREE.BackSide);
    const pivot = new THREE.Object3D();
    pivot.name = name;
    const mf = new THREE.Mesh(geo, front);
    const mb = new THREE.Mesh(geo, back);
    for (const m of [mf, mb]) {
      m.castShadow = false; // a page that was lit when it was drawn does not take the lamp again
      m.receiveShadow = false;
      pivot.add(m);
    }
    paper.add(pivot);
    pivot.position.set(xs, HINGE, 0); // the joint of the binding: see HINGE
    const L = { pivot, geo, front, back, curl: NaN, off: NaN, faces: [null, null] };
    bend(L, 0, 0);
    return L;
  }
  // The curl, and the whole of the turn's drawing. The leaf is bent in its PIVOT's frame — tangent
  // angle κ·s along its length — and the pivot is then turned about the gutter by the angle of the
  // drawing. So the two are separate: one number says how far over the leaf is and the other how
  // much of an arc it is, and neither can push the paper through the table (κ ≤ BOW < π/2 keeps the
  // whole curve in the quadrant, and the pivot's own rotation takes it round).
  function bend(L, kappa, off) {
    if (Math.abs(kappa - L.curl) < 1e-6 && Math.abs(off - L.off) < 1e-7) return;
    L.curl = kappa;
    L.off = off;
    const n = SEGS, ds = LEAF.w / n;
    const p = L.geo.attributes.position.array;
    let X = 0, Y = 0;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j < 2; j++) {
        const o = (j * (n + 1) + i) * 3;
        p[o] = X;
        p[o + 1] = off + Y;
        p[o + 2] = j === 0 ? -LEAF.h / 2 : LEAF.h / 2;
      }
      const th = kappa * (i * ds + ds / 2);
      X += ds * Math.cos(th);
      Y += ds * Math.sin(th);
    }
    L.geo.attributes.position.needsUpdate = true;
    // …and the normals with them. The composite shows a verbatim surface before it ever looks at a
    // normal, but the G-buffer writes one for every pixel in the frame and the contour pass reads
    // that buffer to find its edges — a geometry with no normal attribute at all hands it NaN and
    // the pen draws whatever that turns into round the leaf.
    L.geo.computeVertexNormals();
    L.geo.computeBoundingSphere();
  }
  const leaves3 = [makeLeaf('leaf-a'), makeLeaf('leaf-b'), makeLeaf('leaf-c')];

  // THE TWO PILES. Unit boxes scaled in y, so the mass of the book crosses the gutter without a
  // geometry being rebuilt on every turn.
  const pileGeo = new THREE.BoxGeometry(PILE.w, 1, PILE.h);
  // the CUT EDGES are the paper's own striations and the TOP is plain: what shows of the top from
  // above is the three millimetres of it the leaf does not cover, which is the sheet under the sheet
  const blockTop = inkMaterial({ map: canvasTexture(blockTexture()), hatch: 0.12, lineWeight: 1 });
  const pileMats = [M.pages, M.pages, blockTop, M.paper, M.pages, M.pages];
  const mkPile = (name) => {
    const pivot = new THREE.Object3D();
    pivot.name = `${name}-pivot`;
    pivot.position.set(xs, HINGE, 0);
    paper.add(pivot);
    const m = new THREE.Mesh(pileGeo, pileMats);
    m.name = name;
    m.userData.pivot = pivot;
    // NOTHING IN THE OPEN BOOK CASTS A SHADOW, and that is this film's rule rather than a saving.
    // A 340 mm spread lit by the pendant throws 60 px of shadow map up and to the right of itself at
    // the very shot it is read from, which the frame then cuts in half — and BRIEF.md's own line is
    // that tone in this room is DRAWN and never a soft blurry shadow (the cards on the cloth are laid
    // the same way: reveal-ground.js draws their tone and they cast nothing). What says this book is
    // standing on a table is the pen's own contour round the block and the striations of its cut
    // edges. The CLOSED book on the table keeps the shadow props-table gave it.
    m.castShadow = false;
    m.receiveShadow = true;
    pivot.add(m);
    return m;
  };
  const pileR = mkPile('book-pile-right');
  const pileL = mkPile('book-pile-left');

  // THE BACK BOARD, flat under the block, and THE SEWN BACK in the gutter.
  const backBoard = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, BOARD.t, BOARD.h), [M.solid, M.solid, M.paper, M.solid, M.solid, M.solid]);
  backBoard.name = 'book-back-board';
  backBoard.castShadow = false;
  backBoard.receiveShadow = true;
  backBoard.position.set(xs + BOARD.w / 2, BOARD.t / 2, 0);
  paper.add(backBoard);
  // …tucked 8 mm inside the block at head and tail, or its own dark ends stand out past the paper as
  // two black blots in the gutter, which is what the first cut of this drew
  const sewn = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1, BOARD.h - 0.016), M.solid);
  sewn.name = 'book-sewn';
  sewn.castShadow = false;
  sewn.receiveShadow = true;
  paper.add(sewn);

  // THE FRONT BOARD. Built like a leaf so it can bow a little as it goes over — a board is stiffer
  // than paper, so a third of the curl — and carrying props-table's own cover on its outside. There
  // is one drawing of that cover in this film and this is it: the material instance is read off the
  // closed book rather than struck again.
  const boardLeaf = (() => {
    const n = 6;
    const pos = new Float32Array((n + 1) * 2 * 3);
    const uv = new Float32Array((n + 1) * 2 * 2);
    const idx = [];
    for (let j = 0; j < 2; j++) for (let i = 0; i <= n; i++) {
      const p = j * (n + 1) + i;
      uv[p * 2] = i / n;
      uv[p * 2 + 1] = j === 0 ? 1 : 0;
    }
    for (let i = 0; i < n; i++) idx.push(i, n + 1 + i, i + 1, i + 1, n + 1 + i, n + 2 + i);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const pivot = new THREE.Object3D();
    pivot.name = 'book-front-board';
    pivot.position.set(xs, HINGE, 0);
    const inside = inkMaterial({ hatch: 0.12 }); // the paste-down, which is what an open board shows
    const cover = (() => {
      const m = table()?.mesh?.material;
      return Array.isArray(m) ? m[2] : null;
    })() ?? inkMaterial({ hatch: 0.04, lineWeight: 0 });
    const mf = new THREE.Mesh(geo, cover);
    const mb = new THREE.Mesh(geo, inside);
    mb.material = inside;
    mb.material.side = THREE.BackSide;
    for (const m of [mf, mb]) {
      m.castShadow = false;
      m.receiveShadow = true;
      pivot.add(m);
    }
    paper.add(pivot);
    return { pivot, geo, n, curl: NaN };
  })();
  const BOARD_OFF = HINGE - BOARD.t / 2; // the board's own plane, an offset off the hinge
  function bendBoard(kappa) {
    if (Math.abs(kappa - boardLeaf.curl) < 1e-6) return;
    boardLeaf.curl = kappa;
    const n = boardLeaf.n, ds = BOARD.w / n;
    const p = boardLeaf.geo.attributes.position.array;
    let X = 0, Y = 0;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j < 2; j++) {
        const o = (j * (n + 1) + i) * 3;
        p[o] = X;
        p[o + 1] = BOARD_OFF + Y;
        p[o + 2] = j === 0 ? -BOARD.h / 2 : BOARD.h / 2;
      }
      const th = kappa * (i * ds + ds / 2);
      X += ds * Math.cos(th);
      Y += ds * Math.sin(th);
    }
    boardLeaf.geo.attributes.position.needsUpdate = true;
    boardLeaf.geo.computeVertexNormals();
    boardLeaf.geo.computeBoundingSphere();
  }
  bendBoard(0);

  // THE RIBBON. A strip down the gutter with 35 mm of tail out past the head of the block, rebuilt
  // on every turn because the pile it lies on changes height as the visitor reads.
  const ribbonMat = (() => {
    const m = inkMaterial({ map: canvasTexture(ribbonTexture()), hatch: 0.5, lineWeight: 0.9, side: THREE.DoubleSide });
    m.alphaTest = 0.5;
    m.transparent = false;
    return m;
  })();
  const ribbon = (() => {
    const n = 6;
    const pos = new Float32Array((n + 1) * 2 * 3);
    const uv = new Float32Array((n + 1) * 2 * 2);
    const idx = [];
    for (let j = 0; j < 2; j++) for (let i = 0; i <= n; i++) {
      const p = j * (n + 1) + i;
      uv[p * 2] = j;
      uv[p * 2 + 1] = i / n;
    }
    for (let i = 0; i < n; i++) idx.push(i, i + 1, n + 1 + i, i + 1, n + 2 + i, n + 1 + i);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const m = new THREE.Mesh(geo, ribbonMat);
    m.name = 'book-ribbon';
    m.castShadow = false;
    m.receiveShadow = true;
    signGroup.add(m);
    return { mesh: m, geo, n };
  })();
  // where the book stands, read off the closed one so the two can never disagree
  function station() {
    const m = table()?.mesh;
    if (!m) return false;
    m.updateWorldMatrix(true, false);
    m.getWorldPosition(_v);
    group.position.set(_v.x, _v.y - 0.045 / 2, _v.z);
    group.quaternion.copy(m.getWorldQuaternion(new THREE.Quaternion()));
    return true;
  }
  station();
  const HOME = group.position.clone();
  const slideVec = new THREE.Vector3(SLIDE, 0, 0).applyQuaternion(group.quaternion);

  // ---- 3. THE PAGES -----------------------------------------------------------------------------
  // The pagination, the striking and the plates. `cut` is the book set for THIS window; `faces` is
  // the handful of pages that have a canvas at this moment and NOTHING ELSE — four at rest and six
  // at the peak of a turn, whatever the book runs to. That is the whole answer to two hundred and
  // sixty leaves: a leaf that cannot be seen has no texture, and a face is thrown away the drawing
  // after it goes out of the picture.
  let cut = null; // { S, cap, leaves, index, indexAt, nLeaves, leafT, scale }
  let cutAt = '';
  const faces = new Map(); // page → { a, b } — the page struck, and struck again for the boil
  const plates = new Map(); // slug → HTMLImageElement | 'loading' | null
  let page = 0; // the page the visitor is ON: even is the verso of its opening, odd the recto
  let showing = null;
  let fromList = null;
  let boilOn = false;
  let motion = null; // { kind: 'swing'|'shut'|'turn'|'lens'|'riffle', k, … }
  // A TOOL'S FLAG AND NOTHING ELSE. `?book=snap`, or `snap(true)` from a proof, lands every motion on
  // the drawing it starts: the same click does the same thing through the same code, it simply does
  // not take eight drawings to do it. It exists because tools/_book-proof.mjs clicks all ninety-odd
  // lines of the contents and reaches all seventy-eight plates, and under software GL a riffle costs
  // a rendered frame a drawing — the sweep is twenty minutes with the drawings and two without them.
  // Nothing a visitor can do turns it on.
  let snap = ctx.params?.get?.('book') === 'snap';
  // WHAT THE LAST MOVE ACTUALLY DREW, kept because nothing outside this file can find out. A motion
  // here advances one drawing per drawn frame, and a tool asking «what drawing are you on?» over a
  // wire spends whole drawings waiting for the answer — tools/_book-proof.mjs counted three of the
  // board's eight that way and could not have counted more. So the piece keeps its own list of the
  // angles it put on the glass and the proof reads that: the witness is the drawing, not the poll.
  let drew = null;

  const wide = () => {
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    return w / h >= 1.05;
  };
  const openingOf = (p) => Math.floor(p / 2) + 1; // leaves turned to have page p in front of you
  const versoPage = (p) => p - (p % 2); // the even page of p's own opening …
  const rectoPage = (p) => versoPage(p) + 1; // … and the odd one facing it

  // THE LEAF ON THE GLASS, which is the measure the whole book is set in. It is not estimated: the
  // camera piece has already solved this window's `book` (or `book-recto`) shot and camera-frame's
  // own `place` says where a point in it lands, so the two corners of the recto are projected
  // through the very frame the visitor will read it in and the page is whatever that is. A window
  // with no camera yet falls back to the plan's own arithmetic, which is the same sum done by hand.
  const PLAN_D = 1.53 - 0.0225; // the lens over the leaves' plane: props-table's 1.53 over the top
  function leafPx() {
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    const A = w / h;
    const shot = C()?.shots?.[wide() ? 'book' : 'book-recto'];
    if (shot) {
      const y = BOARD.t + BLOCK / 2;
      const wp = (lx, lz) => {
        const v = new THREE.Vector3(lx, y, lz).applyQuaternion(group.quaternion).add(HOME).add(slideVec);
        return [v.x, v.y, v.z];
      };
      const a = framePlace(shot, A, wp(xs, -LEAF.h / 2));
      const b = framePlace(shot, A, wp(xs + LEAF.w, LEAF.h / 2));
      const pw = Math.abs(b.x - a.x) * w, ph = Math.abs(b.y - a.y) * h;
      if (pw > 80 && ph > 100) return { pw, ph };
    }
    const halfX = (wide() ? BOARD.w : BOARD.w / 2) + (wide() ? 0.02 : 0.01);
    const halfZ = BOARD.h / 2 + (wide() ? 0.02 : 0.01);
    const t = Math.max(halfX / (0.96 * A), halfZ / 0.85) / PLAN_D;
    const perM = h / (2 * PLAN_D * t);
    return { pw: Math.max(120, LEAF.w * perM), ph: Math.max(160, LEAF.h * perM) };
  }

  const dispose = (f) => {
    f?.a?.tex?.dispose?.();
    f?.b?.tex?.dispose?.();
  };
  function lay() {
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    const dpr = Math.min(2, ctx.size?.dpr || window.devicePixelRatio || 1);
    const want = `${Math.round(w)}x${Math.round(h)}@${dpr}|${wide() ? 's' : 'l'}`;
    if (want === cutAt && cut) return cut;
    const { pw, ph } = leafPx();
    const S = sheetOf(pw, ph);
    const { cap, leaves, index, indexAt } = paginate(BOOKS.TAROT, S);
    // THE TEXTURE IS THE PAGE AT THIS WINDOW'S OWN DEVICE PIXELS and no more: a leaf is seen at very
    // nearly 1:1 from the reading shot, so anything larger is memory nobody can see and anything
    // smaller is a blurred hand. Capped at 1100 across, which is what a 1600x900 window at dpr 2
    // asks for; past that the cap is the memory and not the eye.
    const scale = Math.min(1100 / S.pw, Math.max(1, dpr));
    const nLeaves = Math.ceil((leaves.length + 1) / 2);
    for (const f of faces.values()) dispose(f);
    faces.clear();
    cut = { S, cap, leaves, index, indexAt, nLeaves, leafT: BLOCK / nLeaves, scale };
    cutAt = want;
    if (page > leaves.length - 1) page = Math.max(0, leaves.length - 1);
    return cut;
  }

  // THE PLATE FOR A CARD LEAF. The page is struck without it the first time and struck AGAIN when the
  // sheet arrives, which is the only way a card can appear on a leaf that is already in front of
  // somebody. Nothing is loaded up front: the deck is seventy-eight sheets and this asks for the one
  // on the page, which is BRIEF.md's rule 4 kept.
  //
  // AND FOUR OF THEM ARE KEPT, NOT SEVENTY-EIGHT. A plate is 1024 x 1792, which is seven megabytes
  // of decoded picture; holding every one a reader walked past is half a gigabyte by the back of the
  // book. Once a plate has been drawn INTO a page's canvas the image itself has done its work, so
  // the four most recent stay (two card leaves can be in one opening, and a turn puts two more in
  // the air) and the rest are let go. Coming back to a card fetches it again out of the browser's
  // own cache and re-strikes the leaf, which is the same path as the first time.
  const PLATES_KEPT = 4;
  function plateFor(slug) {
    if (!slug) return null;
    const got = plates.get(slug);
    if (got instanceof Image) {
      plates.delete(slug); // …and put back, so the map's own order is least-recently-wanted first
      plates.set(slug, got);
      return got;
    }
    if (got === 'loading') return null;
    plates.set(slug, 'loading');
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      plates.set(slug, img);
      for (const [key, v] of [...plates]) {
        if (plates.size <= PLATES_KEPT) break;
        if (!(v instanceof Image) || key === slug) continue;
        plates.delete(key);
      }
      restrike(slug);
    };
    img.onerror = () => plates.set(slug, null);
    img.src = `/cards/${slug}.webp`;
    return null;
  }
  function restrike(slug) {
    if (!cut) return;
    for (const [p, f] of [...faces]) {
      if (cut.leaves[p]?.plate !== slug) continue;
      dispose(f);
      faces.delete(p);
    }
    if (showing) dress();
  }

  // ONE FACE, struck. An EVEN page is a verso and is always shown on the BACK of a leaf, whose uv
  // runs from the gutter out the wrong way round — so its texture is mirrored in u once, here, and
  // never touched again. An odd page is a recto and is not.
  function faceOf(p, boil) {
    const b = cut;
    if (!b || p == null || p < 0 || p >= b.leaves.length) return null;
    let f = faces.get(p);
    if (!f) {
      f = {};
      faces.set(p, f);
    }
    const strike = (which) => {
      const L = b.leaves[p];
      const r = strikePage(b.S, L, p + 1, { scale: b.scale, boil: which, plate: L.plate ? plateFor(L.plate) : null, seedBase: p * 13 });
      const tex = canvasTexture(r.canvas, { srgb: false });
      if (p % 2 === 0) {
        tex.repeat.set(-1, 1);
        tex.offset.set(1, 0);
      }
      return { canvas: r.canvas, tex, lines: r.lines, head: r.head, plate: r.plate };
    };
    if (!f.a) f.a = strike(0);
    if (boil && !f.b) f.b = strike(1);
    return f;
  }
  // put a page on one face of a leaf, or take the face out of the picture
  function dressFace(L, side, p, boil = false) {
    const mat = side === 'front' ? L.front : L.back;
    const f = faceOf(p, boil);
    const tex = (boil && boilOn && f?.b ? f.b : f?.a)?.tex ?? blankTex;
    if (mat.map !== tex) {
      mat.map = tex;
      mat.needsUpdate = true;
    }
    L.faces[side === 'front' ? 0 : 1] = f ? p : null;
  }

  // ---- 4. WHAT IS WHERE, ON EVERY DRAWING -------------------------------------------------------
  // One function decides the whole object — which leaf mesh stands where, at what angle, with which
  // page on which of its faces, how tall each pile is, where the ribbon lies and how far the block
  // has squared itself up. Every state the book can be in is a set of arguments to this, so there is
  // no second place where the book can be wrong about itself.
  const pileTop = (n) => BOARD.t + Math.max(0, n) * (cut?.leafT ?? 0);
  // A PILE. The RIGHT one is the part of the block nobody has touched: it sits on the back board and
  // it never moves, shut or open. The LEFT one is what has been read, and it goes over with the front
  // board — so it is laid in the SHUT pose, stacked under the board at the top of the block, and the
  // joint's own angle is what puts it down on the table. Two placements, one for each side, because
  // the two sides of an open book are two different things.
  function setPile(mesh, n, left, phi = left ? Math.PI : 0) {
    const t = Math.max(1e-5, n * (cut?.leafT ?? 0));
    mesh.scale.y = t;
    mesh.position.set(PILE.w / 2, left ? HINGE - BOARD.t - t / 2 : BOARD.t + t / 2 - HINGE, 0);
    mesh.userData.pivot.rotation.z = phi;
    mesh.visible = n > 0.01;
  }
  // …and a leaf, at an angle, with the height it rests at written as an offset off that same joint:
  // a leaf lying on the right at y is the SAME leaf lying on the left at 2·HINGE − y, so a turn is
  // one rotation of one number and nothing has to be carried from one end of it to the other.
  const offRight = (y) => y - HINGE;
  const offLeft = (y) => HINGE - y;
  function layLeaf(L, phi, off, kappa = 0) {
    bend(L, kappa, off);
    L.pivot.rotation.z = phi;
    L.pivot.visible = true;
  }
  // the ribbon and the sewn back lie in the gutter, on the shallower of the two piles
  function layGutter(nUnder) {
    const y = pileTop(nUnder);
    const t = Math.max(0.0022, y);
    sewn.scale.y = t;
    sewn.position.set(xs, t / 2, 0);
    // …and the ribbon lies UNDER the top leaf of that pile, which is where a ribbon in a book is:
    // what a visitor ever sees of it is the 20 mm of tail hanging out past the head of the block,
    // drooping onto the table over the block's own edge. That tail is the whole affordance.
    const p = ribbon.geo.attributes.position.array;
    const z0 = -PILE.h / 2 - RIBBON.out, z1 = -PILE.h / 2 + RIBBON.in;
    for (let i = 0; i <= ribbon.n; i++) {
      const z = z0 + ((z1 - z0) * i) / ribbon.n;
      const off = Math.min(1, Math.max(0, (-PILE.h / 2 - z) / (RIBBON.out * 0.8)));
      const yy = (y + 0.00004) * (1 - off) + 0.0006 * off;
      for (let j = 0; j < 2; j++) {
        const o = (j * (ribbon.n + 1) + i) * 3;
        p[o] = xs + (j === 0 ? -RIBBON.w / 2 : RIBBON.w / 2);
        p[o + 1] = yy;
        p[o + 2] = z;
      }
    }
    ribbon.geo.attributes.position.needsUpdate = true;
    ribbon.geo.computeVertexNormals();
    ribbon.geo.computeBoundingSphere();
  }
  const park = () => leaves3.forEach((L) => (L.pivot.visible = false));
  // …and a face that is no longer in the picture is a canvas nobody can see
  function prune(live) {
    for (const [pp, f] of [...faces]) {
      if (live.has(pp)) continue;
      dispose(f);
      faces.delete(pp);
    }
  }

  function dress() {
    const b = cut;
    if (!b || !showing) return;
    const nL = b.nLeaves;
    const held = motion?.kind === 'turn' ? motion.from : page;
    const k = openingOf(held); // leaves turned
    const vp = versoPage(held), rp = versoPage(held) + 1;
    const swinging = motion?.kind === 'swing' || motion?.kind === 'shut';
    // THE FRONT BOARD. Shut, it lies over the whole block; open, on the table with everything that
    // has been read stacked on top of it. One rotation about the joint is both.
    let board = Math.PI;
    if (swinging) {
      const a = SWING[Math.min(SWING.length - 1, motion.k)];
      board = motion.kind === 'shut' ? Math.PI - a : a;
    }
    const u = board / Math.PI;
    if (motion) {
      if (!drew || drew.kind !== motion.kind || drew.started !== motion) drew = { kind: motion.kind, started: motion, angles: [] };
      const a = motion.kind === 'turn' ? TURN[Math.min(TURN.length - 1, motion.k)] : motion.kind === 'riffle' ? (motion.k / motion.drawings) * Math.PI : board;
      if (drew.angles.length !== motion.k + 1) drew.angles[motion.k] = +((a * 180) / Math.PI).toFixed(1);
      else drew.angles.push(+((a * 180) / Math.PI).toFixed(1));
    }
    // AND THE BLOCK SQUARES ITSELF UP as the board goes over — 75 mm along its own long axis, tied to
    // the board's angle so the two land together. See AND IT SQUARES ITSELF UP, at the head.
    group.position.copy(HOME).addScaledVector(slideVec, u);
    boardLeaf.pivot.rotation.z = board;
    bendBoard(((BOW / 3) * Math.sin(board)) / BOARD.w);
    boardLeaf.pivot.visible = true;

    if (swinging) {
      // THE BOARD DOES NOT GO OVER ALONE. Everything already read goes with it — the leaves on the
      // left and, on top of those, the leaf whose back is the page the visitor was on — so what the
      // board uncovers IS the opening they are going to be looking at. Shut the book at the
      // twenty-ninth leaf, open it again, and the twenty-ninth leaf is what is there.
      const [T, U] = leaves3;
      park();
      setPile(pileR, nL - k, false);
      setPile(pileL, k - 1, true, board);
      // …and NOT on the first drawing. At k = 0 the board is still flat over the whole block and
      // there is nothing of either page in the picture, so the two strikes those pages cost are
      // taken on the NEXT drawing — off the click, where a visitor would feel them, and onto a
      // drawing that has 83 ms to itself.
      const yet = motion.k >= 1;
      layLeaf(T, board, offLeft(pileTop(k) + LIFT));
      dressFace(T, 'front', yet ? vp - 1 : null);
      dressFace(T, 'back', yet ? vp : null);
      layLeaf(U, 0, offRight(pileTop(nL - k) + LIFT));
      dressFace(U, 'front', yet ? rp : null);
      dressFace(U, 'back', null);
      sewn.visible = false;
      ribbon.mesh.visible = false;
      prune(new Set([vp - 1, vp, rp]));
      return;
    }
    sewn.visible = true;
    ribbon.mesh.visible = true;

    if (motion?.kind === 'turn') {
      const d = motion.dir;
      const a = TURN[Math.min(TURN.length - 1, motion.k)];
      const kappa = (BOW * Math.sin(a)) / LEAF.w;
      const nLeft = d > 0 ? k : k - 1; // the piles while one leaf is off them
      const nRight = d > 0 ? nL - k - 1 : nL - k;
      const [T, U, O] = leaves3;
      park();
      // 1. THE LEAF GOING OVER — leaf k forward (front rp, back rp+1), leaf k−1 back (front vp−1,
      //    back vp). Its offset off the joint is the height it LEFT, and the joint does the rest.
      const off = d > 0 ? offRight(pileTop(nRight) + LIFT * 2) : offLeft(pileTop(nLeft) + LIFT * 2);
      layLeaf(T, d > 0 ? a : Math.PI - a, off, kappa);
      dressFace(T, 'front', d > 0 ? rp : vp - 1);
      dressFace(T, 'back', d > 0 ? rp + 1 : vp);
      // 2. the leaf it uncovers, lying flat where it lay
      layLeaf(U, d > 0 ? 0 : Math.PI, d > 0 ? offRight(pileTop(nRight) + LIFT) : offLeft(pileTop(nLeft) + LIFT));
      dressFace(U, d > 0 ? 'front' : 'back', d > 0 ? rp + 2 : vp - 2);
      dressFace(U, d > 0 ? 'back' : 'front', null);
      // 3. …and the page on the far side, which the leaf in the air is about to land on top of
      layLeaf(O, d > 0 ? Math.PI : 0, d > 0 ? offLeft(pileTop(nLeft) + LIFT) : offRight(pileTop(nRight) + LIFT));
      dressFace(O, d > 0 ? 'back' : 'front', d > 0 ? vp : rp);
      dressFace(O, d > 0 ? 'front' : 'back', null);
      setPile(pileR, nRight, false);
      setPile(pileL, nLeft, true);
      layGutter(Math.min(nLeft, nRight));
      prune(new Set([vp - 2, vp - 1, vp, rp, rp + 1, rp + 2]));
      return;
    }

    if (motion?.kind === 'riffle') {
      // A RUN OF LEAVES GOING OVER, and not one of them is struck: the pages between here and there
      // are a blur of paper in anybody's hand, and setting eighty of them to show a visitor two
      // drawings apiece would be a second of somebody's afternoon spent on something nobody reads.
      const t = motion.k / motion.drawings;
      const at = Math.round(motion.from + (motion.to - motion.from) * t);
      const kk = Math.max(1, Math.min(nL - 1, openingOf(at)));
      const d = motion.to > motion.from ? 1 : -1;
      // one leaf lying on the pile the run is FILLING — a riffle covers that side over and over, so
      // there is always a sheet on it — and two more in the air, half a beat apart, which is what
      // reads as a run rather than as one page going round and round
      const [F, ...fly] = leaves3;
      park();
      layLeaf(F, d > 0 ? Math.PI : 0, d > 0 ? offLeft(pileTop(kk) + LIFT) : offRight(pileTop(nL - kk) + LIFT));
      dressFace(F, 'front', null);
      dressFace(F, 'back', null);
      // THREE DRAWINGS A LEAF and the two of them half a cycle apart — at a half-cycle step both
      // leaves spend every other drawing lying flat on the pile where nothing can be seen of them,
      // and a riffle came back as one page standing bolt upright, flickering.
      fly.forEach((L, i) => {
        const ph = ((motion.k + i * 1.5) / 3) % 1;
        const base = d > 0 ? offRight(pileTop(nL - kk) + LIFT * (2 + i)) : offLeft(pileTop(kk) + LIFT * (2 + i));
        layLeaf(L, Math.PI * (d > 0 ? ph : 1 - ph), base, (BOW * Math.sin(Math.PI * ph)) / LEAF.w);
        dressFace(L, 'front', null);
        dressFace(L, 'back', null);
      });
      setPile(pileR, nL - kk, false);
      setPile(pileL, kk, true);
      layGutter(Math.min(kk, nL - kk));
      return;
    }

    // AT REST: the two facing pages, and they are the two the pen goes back over on the twelve
    const [A, B, Cc] = leaves3;
    park();
    layLeaf(A, 0, offRight(pileTop(nL - k) + LIFT));
    dressFace(A, 'front', rp, true);
    dressFace(A, 'back', null);
    layLeaf(B, Math.PI, offLeft(pileTop(k) + LIFT));
    dressFace(B, 'back', vp, true);
    dressFace(B, 'front', null);
    Cc.pivot.visible = false;
    setPile(pileR, nL - k, false);
    setPile(pileL, k, true);
    layGutter(Math.min(k, nL - k));
    prune(new Set([vp, rp]));
  }

  // ---- 5. THE CAMERA ----------------------------------------------------------------------------
  // The book borrows the lens from walk.js, which is holding `reading` because the visitor is
  // standing at the table. The hold is MOVED rather than taken and given back — a hold on the shot
  // being left would block the leaving — and it goes back to `reading` the moment the boards shut,
  // so walk.js's own way home works exactly as it did.
  const C = () => ctx.pieces?.camera ?? null;
  const shotFor = (p = page) => (wide() ? 'book' : p % 2 === 0 ? 'book-verso' : 'book-recto');
  let heldShot = null;
  function takeShot(name, seconds) {
    const cam = C();
    if (!cam?.hold) return Promise.resolve();
    const from = heldShot;
    heldShot = name;
    cam.hold(name, { jump: false });
    if (!seconds) {
      cam.cut(name);
      return Promise.resolve();
    }
    return cam.move(from ?? 'reading', name, seconds);
  }

  // ---- 6. THE STATE -----------------------------------------------------------------------------
  const sound = (cue, opts) => ctx.pieces?.sound?.play?.(cue, opts);
  const dialogue = () => ctx.pieces?.dialogue ?? null;

  function open(key) {
    if (!BOOKS[key] || showing || motion) return false;
    if (!station()) return false;
    HOME.copy(group.position);
    slideVec.set(SLIDE, 0, 0).applyQuaternion(group.quaternion);
    showing = key;
    fromList = null;
    const b = lay();
    if (page > b.leaves.length - 1) page = 0;
    group.visible = true;
    const m = table()?.mesh;
    if (m) m.visible = false;
    motion = { kind: 'swing', k: 0 };
    dress();
    // THE CAPTION CARD IS FOLDED OUT OF THE FRAME while the book is open — the same fold the tab on
    // its own edge makes (dialogue.js) — because a placard standing in the bottom band of a plan
    // view stands on the page. A line of his brings it back, which is that piece's own rule and not
    // this one's to override.
    dialogue()?.fold?.(true);
    sound('rustle', { gain: 0.45 });
    takeShot(shotFor(), snap ? 0 : (SWING.length - 1) / 12);
    ctx.emit?.('book', { title: key, leaf: page });
    if (snap) snapNow();
    return true;
  }

  function close() {
    if (!showing || motion?.kind === 'shut') return false;
    motion = { kind: 'shut', k: 0 };
    dress();
    sound('rustle', { gain: 0.4 });
    takeShot('reading', snap ? 0 : (SWING.length - 1) / 12);
    dialogue()?.fold?.(false);
    if (snap) snapNow();
    return true;
  }
  // the last drawing of the shut: the open object goes away and props-table's closed book comes back
  function finishShut() {
    const was = showing;
    motion = null;
    showing = null;
    group.visible = false;
    group.position.copy(HOME);
    prune(new Set());
    const m = table()?.mesh;
    if (m) m.visible = true;
    // THE HOLD GOES BACK TO WHOEVER SHOULD HAVE IT. While the visitor is still at the table that is
    // walk.js, which holds `reading` for as long as they stand there; if they are NOT at the table
    // any more — a judging state, a tool — then holding a shot they are walking away from would
    // block the very walk that is taking them home, so it is given up instead.
    const cam = C();
    if (cam) {
      if (ctx.pieces?.walk?.at === 'table') cam.hold('reading', { jump: false });
      else if (heldShot != null) cam.release?.(heldShot);
    }
    heldShot = null;
    ctx.emit?.('book', { title: null, from: was });
  }

  // A TURN. On a wide window it is an OPENING — two pages, one leaf over the gutter. On a narrow one
  // the visitor is reading ONE leaf, so half the clicks in the book are the lens crossing the gutter
  // and half are the lens crossing it with a leaf following it over.
  function turn(d) {
    const b = lay();
    if (!showing || !b || motion) return false;
    if (wide()) {
      const next = Math.max(0, Math.min(b.leaves.length - 1, versoPage(page) + d * 2));
      if (versoPage(next) === versoPage(page)) return false;
      return startTurn(d, versoPage(next));
    }
    const next = Math.max(0, Math.min(b.leaves.length - 1, page + d));
    if (next === page) return false;
    if (versoPage(next) === versoPage(page)) {
      // the other half of the same opening: nothing turns, the lens crosses the gutter
      page = next;
      takeShot(shotFor(next), snap ? 0 : 3 / 12);
      dress();
      ctx.emit?.('book', { title: showing, leaf: page });
      return true;
    }
    // the page they want is on the other side of a leaf: the lens goes first and the paper follows
    if (snap) {
      takeShot(shotFor(next), 0);
      return startTurn(d, next);
    }
    motion = { kind: 'lens', dir: d, to: next };
    takeShot(shotFor(next), 3 / 12).then(() => {
      if (motion?.kind !== 'lens') return;
      motion = null;
      startTurn(d, next);
    });
    return true;
  }
  function startTurn(d, next) {
    motion = { kind: 'turn', dir: d, k: 0, from: page, to: next };
    sound('rustle', { gain: 0.62 });
    dress();
    if (snap) snapNow();
    return true;
  }
  function landTurn() {
    const to = motion.to;
    motion = null;
    page = to;
    dress();
    ctx.emit?.('book', { title: showing, leaf: page });
  }

  // STRAIGHT THERE, off a line of the contents or off the ribbon. The leaves between here and there
  // go over in a RUN: two drawings a leaf, capped at twenty-four, so the longest jump in the book is
  // two seconds and the shortest is still a run and not a cut.
  function goLeaf(n, from = null) {
    const b = lay();
    if (!showing || !b || motion) return false;
    const next = Math.max(0, Math.min(b.leaves.length - 1, Math.round(n)));
    if (from != null) fromList = from;
    if (wide() ? versoPage(next) === versoPage(page) : next === page) return false;
    const jump = Math.abs(openingOf(next) - openingOf(page));
    if (jump === 0) return turn(next > page ? 1 : -1);
    motion = { kind: 'riffle', from: page, to: wide() ? versoPage(next) : next, k: 0, drawings: Math.max(4, Math.min(RIFFLE_CAP, jump * RIFFLE_PER)) };
    sound('riffle', { gain: 0.7 });
    dress();
    if (snap) snapNow();
    return true;
  }
  function landRiffle() {
    const to = motion.to;
    motion = null;
    page = to;
    if (!wide()) takeShot(shotFor(page), 0);
    dress();
    ctx.emit?.('book', { title: showing, leaf: page });
  }

  // …and the tool's flag, applied: whatever is running ends on this drawing
  function snapNow() {
    for (let guard = 0; motion && guard < 8; guard++) {
      if (motion.kind === 'lens') return;
      if (motion.kind === 'swing') {
        motion = null;
        dress();
      } else if (motion.kind === 'shut') finishShut();
      else if (motion.kind === 'turn') landTurn();
      else if (motion.kind === 'riffle') landRiffle();
    }
  }

  // back to the contents: the leaf of the list the visitor left from, or the head of it
  function back() {
    const b = lay();
    if (!showing || !b) return false;
    const at = b.indexAt ?? 0;
    const slots = b.leaves.filter((L) => L.index).length;
    const want = fromList != null && fromList >= at && fromList < at + slots ? fromList : at;
    return goLeaf(want);
  }

  // ---- 7. THE POINTER ---------------------------------------------------------------------------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const glass = ctx.renderer?.domElement ?? null;
  function castAt(ev, target) {
    if (!glass || !ctx.camera) return null;
    const r = glass.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    return ray.intersectObject(target, true)[0] ?? null;
  }
  // WHAT A POINT ON A LEAF IS, in the page's own pixels. A verso's texture is mirrored in u (see
  // `faceOf`), so the two are put back together here and nowhere else — and a click on a line of the
  // contents is then simply a point inside a box the page recorded when it was lettered.
  function pageHit(hit) {
    const b = cut;
    if (!b || !hit?.uv) return null;
    const L = leaves3.find((q) => q.pivot === hit.object.parent);
    if (!L) return null;
    const isBack = hit.object.material === L.back;
    const p = L.faces[isBack ? 1 : 0];
    if (p == null) return null;
    const u = isBack ? 1 - hit.uv.x : hit.uv.x;
    return { page: p, x: u * b.S.pw, y: (1 - hit.uv.y) * b.S.ph };
  }
  function onPaper(ev) {
    if (!showing || motion) return;
    const hit = castAt(ev, paper);
    if (!hit) return;
    const at = pageHit(hit);
    if (at) {
      for (const ln of faces.get(at.page)?.a?.lines ?? []) {
        if (at.x >= ln.x && at.x <= ln.x + ln.w && at.y >= ln.y && at.y <= ln.y + ln.h) {
          goLeaf(ln.target, at.page);
          return;
        }
      }
    }
    // …and otherwise it is the paper itself. On a SPREAD the side of the gutter decides: the right
    // page turns forward and the left page back, which is what a book does. On a PHONE there is only
    // one leaf in the frame and no gutter to be on a side of, so the same grammar is applied to the
    // page in front of the visitor — its right half goes on, its left half goes back — which is the
    // only reading of a click that does not leave a phone with no way backwards at all.
    if (!wide() && at) {
      turn(at.x >= cut.S.pw / 2 ? 1 : -1);
      return;
    }
    group.worldToLocal(_v.copy(hit.point));
    turn(_v.x >= xs ? 1 : -1);
  }

  switches?.add?.({
    name: 'book-page',
    object: () => paper,
    // the paper answers as a DRAWING and never as a margin: the arbiter refuses a margin box bigger
    // than a quarter of the window and an open spread is nine tenths of one, which is the right
    // answer — a thumb that missed the book landed on the table, and the table shuts it.
    tapBox: () => (showing ? boxOf(pileR) : null),
    enabled: () => !!showing && !motion,
    onDown: (ev) => onPaper(ev),
  });
  switches?.add?.({
    name: 'book-ribbon',
    object: () => ribbon.mesh,
    tapBox: () => ribbonTap(),
    enabled: () => !!showing && !motion,
    onDown: () => back(),
  });
  // the spines, for a round that puts the switch back on the tall case
  for (const f of found.filter((q) => q.switch)) {
    switches?.add?.({
      name: `book-${f.key}`,
      object: () => f.mesh,
      tapBox: () => tapBoxOf(f.mesh),
      enabled: () => place() === 'case' && !showing,
      onDown: () => open(f.key),
    });
  }

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
    if (!showing) return;
    lay();
    dress();
    takeShot(shotFor(), 0);
  });
  // THE BOOK REMEMBERS ITS PAGE WHILE IT IS SHUT and forgets it when the visitor leaves the table —
  // which is the only way out of it, the room refusing a walk while the boards are open.
  ctx.on?.('walk', ({ at } = {}) => {
    if (at === 'table') return;
    page = 0;
    fromList = null;
    if (showing || motion) finishShut();
  });

  // ---- 8. THE GLASS, for the proofs -------------------------------------------------------------
  // Everything below turns the book's own geometry into boxes on the screen, so a proof clicks what
  // a visitor clicks and measures what a visitor reads. A page point becomes a point in the book's
  // frame first — the leaf is flat wherever any of this is asked — and is then projected.
  // A POINT ON A PAGE, in the book's own frame. The page's own x runs from the READING LEFT of it,
  // which for a recto is the gutter and for a VERSO is the fore-edge — the leaf's uv runs from the
  // gutter out and a verso's texture is mirrored in it (see `faceOf`), so a verso's page x has to be
  // turned round again here. Getting this wrong mirrors every contents line on a verso, which is
  // half the list on a phone and none of it on a laptop: exactly the fault a spread hides.
  function pageToLocal(p, px, py) {
    const b = cut;
    if (!b) return null;
    const k = openingOf(page);
    const recto = p % 2 === 1;
    const u = recto ? px / b.S.pw : 1 - px / b.S.pw;
    const y = pileTop(recto ? b.nLeaves - k : k) + LIFT;
    return new THREE.Vector3(xs + (recto ? 1 : -1) * u * LEAF.w, y, (py / b.S.ph - 0.5) * LEAF.h);
  }
  function toGlass(local) {
    if (!local || !ctx.camera) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    ctx.camera.updateMatrixWorld();
    group.updateWorldMatrix(true, false);
    _v.copy(local);
    group.localToWorld(_v);
    _v.project(ctx.camera);
    return [((_v.x + 1) / 2) * W, ((1 - _v.y) / 2) * H];
  }
  function rectOnGlass(p, r) {
    if (!r) return null;
    const pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]
      .map(([px, py]) => toGlass(pageToLocal(p, px, py)))
      .filter(Boolean);
    if (pts.length < 4) return null;
    const X = pts.map((q) => q[0]), Y = pts.map((q) => q[1]);
    return { x: Math.round(Math.min(...X)), y: Math.round(Math.min(...Y)), w: Math.round(Math.max(...X) - Math.min(...X)), h: Math.round(Math.max(...Y) - Math.min(...Y)) };
  }
  // THE RIBBON'S BOX IS THE TAIL'S and not the whole strip's. Most of the ribbon is down the gutter
  // under the top leaf where nobody can see it or reach it, and a box round all of it has its centre
  // twenty millimetres INSIDE the block — so a thumb aimed at the middle of that box lands on the
  // page and turns it, which is what the first cut of this did.
  function ribbonTap() {
    if (!showing || !ctx.camera) return null;
    const xsv = [], ysv = [];
    const y1 = pileTop(ribbonUnder()) + 0.0008;
    for (const dx of [-RIBBON.w / 2, RIBBON.w / 2]) {
      for (const [z, y] of [[-PILE.h / 2 - RIBBON.out, 0.0006], [-PILE.h / 2, y1]]) {
        const q = toGlass(new THREE.Vector3(xs + dx, y, z));
        if (!q) return null;
        xsv.push(q[0]);
        ysv.push(q[1]);
      }
    }
    const b = { x: Math.min(...xsv), y: Math.min(...ysv), w: Math.max(...xsv) - Math.min(...xsv), h: Math.max(...ysv) - Math.min(...ysv) };
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  // the pile the ribbon lies on, which is the shallower of the two
  function ribbonUnder() {
    const b = cut;
    if (!b) return 0;
    const k = openingOf(page);
    return Math.min(k, b.nLeaves - k);
  }

  // ---- 9. THE CLOCK -----------------------------------------------------------------------------
  function update() {
    if (!showing && !motion) return;
    if (!ctx.clock?.stepped) return;
    boilOn = (ctx.clock.frame & 1) === 1;
    if (motion?.kind === 'lens') return; // the camera owns this one; the paper has not moved yet
    if (motion) {
      motion.k++;
      // the board landing, on the drawing it lands — going over or coming back, a board on a table
      // makes the same sound
      if ((motion.kind === 'swing' || motion.kind === 'shut') && motion.k === 5) sound('thud', { gain: 0.45 });
      if (motion.kind === 'swing' && motion.k >= SWING.length - 1) motion = null;
      else if (motion.kind === 'shut' && motion.k >= SWING.length - 1) return finishShut();
      else if (motion.kind === 'turn' && motion.k >= TURN.length) return landTurn();
      else if (motion.kind === 'riffle' && motion.k >= motion.drawings) return landRiffle();
    }
    dress();
  }

  return {
    get showing() {
      return !!showing;
    },
    get title() {
      return showing;
    },
    get leaf() {
      return page;
    },
    get leaves() {
      return cut?.leaves?.length ?? 0;
    },
    get cap() {
      return cut?.cap ?? null;
    },
    // whether this window is reading the SPREAD or one leaf of it
    get spread() {
      return wide();
    },
    get shot() {
      return showing ? shotFor() : null;
    },
    get swinging() {
      return motion?.kind === 'swing' || motion?.kind === 'shut' ? { kind: motion.kind, drawing: motion.k, drawings: SWING.length, angle: +((SWING[Math.min(SWING.length - 1, motion.k)] * 180) / Math.PI).toFixed(1) } : null;
    },
    get turning() {
      if (motion?.kind === 'turn') return { dir: motion.dir, drawing: motion.k, drawings: TURN.length, from: motion.from, to: motion.to };
      if (motion?.kind === 'riffle') return { riffle: true, drawing: motion.k, drawings: motion.drawings, from: motion.from, to: motion.to };
      if (motion?.kind === 'lens') return { lens: true, to: motion.to };
      return null;
    },
    get busy() {
      return !!motion;
    },
    // the drawings the last move actually put on the glass, in degrees about the joint
    get drew() {
      return drew ? { kind: drew.kind, drawings: drew.angles.filter((q) => q != null).length, angles: drew.angles } : null;
    },
    // THE PHYSICAL BOOK: what it is bound in, how thick a leaf is, how big a page's texture is and
    // how many of them exist at this moment — which is the number that says the memory is sane.
    get bound() {
      if (!cut) return null;
      const tw = Math.round(cut.S.pw * cut.scale), th = Math.round(cut.S.ph * cut.scale);
      let canvases = 0;
      for (const f of faces.values()) canvases += (f.a ? 1 : 0) + (f.b ? 1 : 0);
      return {
        leaves: cut.nLeaves,
        pages: cut.leaves.length,
        leafMm: +(cut.leafT * 1000).toFixed(3),
        page: [Math.round(cut.S.pw), Math.round(cut.S.ph)],
        texture: [tw, th],
        faces: faces.size,
        canvases,
        // …and what those canvases weigh on the card, which is the number that says the memory is
        // sane: four of them at rest (two pages, each struck twice for the boil) and six at the peak
        // of a turn, whatever the book runs to.
        mb: +((canvases * tw * th * 4 * 1.34) / 1048576).toFixed(1),
        plates: plates.size,
      };
    },
    // THE LEAF ON THE GLASS: a page's own four corners, which is what the cap is measured against
    leafBox: (which = null) => {
      const p = which === 'recto' ? rectoPage(page) : which === 'verso' ? versoPage(page) : wide() ? rectoPage(page) : page;
      return rectOnGlass(p, { x: 0, y: 0, w: cut?.S?.pw ?? 0, h: cut?.S?.ph ?? 0 });
    },
    // …and the running head's box, so a proof can measure the cap in INK rather than take it on trust
    headBox: (p = null) => {
      const here = wide() ? rectoPage(page) : page;
      const q = p == null ? (faces.get(here)?.a?.head ? here : here === page ? page : versoPage(page)) : p;
      const f = faces.get(q);
      return f?.a?.head ? rectOnGlass(q, f.a.head) : null;
    },
    // WHAT CARD IS ON THE OPENING THAT IS UP, and where its plate is on the glass
    get card() {
      const b = cut;
      if (!showing || !b) return null;
      for (const p of wide() ? [versoPage(page), rectoPage(page)] : [page]) {
        const L = b.leaves[p];
        if (!L?.plate) continue;
        const box = rectOnGlass(p, plateBox(b.S));
        if (box) return { slug: L.plate, ...box, ready: plates.get(L.plate) instanceof Image };
      }
      return null;
    },
    get sheetLeaves() {
      return (cut?.leaves ?? []).map(kindOf);
    },
    get index() {
      return (cut?.index ?? []).map((ln) => ({ label: ln.label, num: ln.num, indent: ln.indent, target: ln.target, folio: ln.folio }));
    },
    get indexAt() {
      return cut?.indexAt ?? 0;
    },
    get indexLeaves() {
      return (cut?.leaves ?? []).filter((L) => L.index).length;
    },
    // the lines of the contents in front of the visitor, as boxes on the GLASS — what a proof clicks
    indexHits: () => {
      const b = cut;
      if (!showing || !b) return [];
      const out = [];
      for (const p of wide() ? [versoPage(page), rectoPage(page)] : [page]) {
        for (const ln of faces.get(p)?.a?.lines ?? []) {
          const box = rectOnGlass(p, ln);
          if (box) out.push({ label: ln.label, text: ln.text, folio: ln.folio, target: ln.target, leaf: p, ...box });
        }
      }
      return out;
    },
    // the ribbon's own box on the glass: the way back, and the only control the book has
    ribbonBox: () => ribbonTap(),
    get spines() {
      return found.map((f) => ({ title: f.key, was: f.was, at: f.at.map((n) => +n.toFixed(3)), off: +f.d.toFixed(3) }));
    },
    tapBox: (key) => tapBoxOf(found.find((f) => f.key === key)?.mesh),
    spineBoxes: () => found.map((f) => tapBoxOf(f.mesh)).filter(Boolean),
    text: () => {
      const b = cut;
      if (!showing || !b) return null;
      return (wide() ? [versoPage(page), rectoPage(page)] : [page]).map((p) => textOf(b.leaves[p])).filter(Boolean).join(' || ');
    },
    open,
    close,
    turn,
    goLeaf,
    back,
    // for tools only; see `snap` above
    snap: (on = true) => {
      snap = !!on;
      if (snap) snapNow();
      return snap;
    },
    update,
  };
}
