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
//                   drawing of that cover in the film — and it is a SLAB, an outer face, an inner
//                   face and a rim, because at ninety degrees to a lens looking straight down a
//                   sheet is a line and 2.5 mm of board is 6.6 px of edge.
//   THE TEXT BLOCK  the same 170 x 240, 40 mm thick, flush with the boards. 45 = 2.5 + 40 + 2.5.
//   THE LEAVES      160 x 226 — ten millimetres inside the block at the fore-edge and seven at head
//                   and tail, and that is not a margin, see THE PAGE IS SMALLER THAN THE BLOCK. Each
//                   is a grid of 18 spans by 5 RAILS, which is what lets a corner come up before the
//                   rest of it does. And there are FIVE MESHES, whatever the book runs to: at rest
//                   two of them are the facing pages and three are parked; during a turn they are the
//                   leaf going over, the leaf it uncovers and the leaf it is about to land on; during
//                   a riffle, one lying on the pile the run is filling and four in the air.
//                   Everything else is the
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
// table to one side of the block and the whole spread then sits over there: measured, with the
// block left exactly where props-table lays it and the book turned to face the chair, the spread
// runs z −0.575 .. −0.215 on a table running −0.620 .. 0.020 — 45 mm of table at the near edge and
// 235 mm at the far one, which is a book shoved up against the side somebody is sitting at. So the
// block slides 95 mm along its own long axis over the same twelve drawings the board swings through,
// and 95 is not taste: it is half of 235 − 45, and it puts 140 mm of table either side of the
// spread. It is what a person does with the hand that is not holding the cover, and it slides back
// when the book shuts, so the closed book is where props-table put it to the millimetre.
// (Before the quarter turn toward the chair this was 75 mm, and it was buying something else: the
// spread then hung 15 mm off the table's edge and the frame had 62 px of floorboard down one side.
// Turned, the spread has the table's own 640 mm to lie along and hangs off nothing at all.)
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
//   the RIGHT page   turns over the spine onto the left, TEN drawings on the twelves — the corner
//                    lifted first, the leaf bowing as it rises, its back showing on the way over, the
//                    leaf under it uncovered, and the landing settled over the last two
//   the LEFT page    the same, backwards
//   a CONTENTS LINE  a RIFFLE: the leaves between here and there go over in a run of two drawings
//                    each, capped at twenty-four so the longest jump in the book is under two
//                    seconds — EASED, so the thumb gets up to speed and comes off the block again,
//                    with four sheets fanning in the air whose own flipping follows that speed, and
//                    the ribbon riding up and down with it. It lands on the page the line names.
//                    The line is found by raycasting
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
// AND AT THE PAGE IT MARKS IT LIES ACROSS THAT PAGE. The user, on the first cut: "the ribbon should
// be over the index page obviously, otherwise it doesn't make sense." It is right and it was the
// thing that was wrong: a ribbon tucked under the top leaf marks nothing a visitor can see. So when
// a leaf of the contents is one of the two in front of them, the strip comes out of the head, turns
// down onto that leaf over the first 40 mm of it and runs the whole 240 mm to the foot, 7 mm off
// the gutter. Which side it lies on is which side the list is on, and the leaf the visitor is
// standing on wins if both are contents. On every other page it goes back under the top leaf and
// only the tail shows, exactly as before.
//
// IT COVERS NO LINE OF THE LIST. The strip is 8 mm wide laid 7 mm off the gutter, so it occupies
// 3 .. 11 mm of a page whose own inner margin is 8.5 % of 160 mm = 13.6 mm: it stops 2.6 mm short
// of the first letter of every line, and a click anywhere on the lettering still goes to the line
// under it. That is not only arithmetic — the arbiter asks the DRAWINGS before it asks anybody's
// box (props.js), and the ribbon lying on the leaf is the nearer drawing, so the strip takes the
// clicks that land on the strip and the leaf takes every other one.
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
//   headBox · swinging · turning · moving · drew · spines · tapBox · spineBoxes · text
import { INK, PAPER, inkLine, inkMaterial, canvasTexture, makeCanvas, hatch } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { snapEase } from '../core/clock.js';
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
const SLIDE = 0.095; // the squaring-up as it opens: half of 235 mm − 45 mm, see AND IT SQUARES ITSELF UP
const LIFT = 0.00014; // a leaf mesh stands this far off the pile it lies on
const SEGS = 18; // spans along a leaf, which is what makes the bow a curve and not a crease
// …AND RAILS ACROSS IT, which is this round's whole quarrel with the old leaf. A leaf built on TWO
// rails is a ruled surface: whatever it does, it does along its entire length at once, so the only
// page-turn it can draw is a stiff plate hinged at the gutter coming up all of a piece. Nobody turns
// a page like that. A page is picked up at its outer CORNER and peels: the corner comes up first,
// the fore-edge stops being parallel to the gutter and becomes a diagonal, and the far corner is
// still flat on the block when the near one is half a hand in the air. Five rails is what that costs
// — 90 vertices against 38, four bands of quads instead of one — and it buys the only drawing in
// this book a visitor would recognise as their own hand.
const RAILS = 5;
// THE SIGN: its width, its tail out past the head, how far into the gutter it goes when it is
// marking a page nobody is looking at, and how far ONTO the page it lies when they are — see THE
// BOOK SIGN. 6 mm from the gutter to the ribbon's own middle puts the 12 mm strip at 0 .. 12 mm off
// the gutter, and the page's inner margin is 8.5 % of 160 mm = 13.6 mm, so the strip fills that
// margin, stops 1.6 mm short of the first letter of every line, and covers no line's hit box at
// all. `foot` is the 12 mm it carries on past the foot of the block and droops over the edge, which
// is what makes a strip lying down a page read as a ribbon and not as a crease in the gutter.
const RIBBON = { w: 0.012, out: 0.02, in: 0.03, lay: 0.006, foot: 0.012 };
// THE ONE AXIS EVERYTHING IN THIS BOOK TURNS ON: the spine, at the block's own mid-height. It is not
// a convenience, it is the joint of a case binding, and it is the only hinge that makes the shut
// book and the open one the SAME object. A rotation of π about a horizontal axis at height hy sends
// y to 2·hy − y, so with hy at the middle of the text block the top of the closed stack lands on the
// table and the bottom of it lands on top of the left pile: the front board, which is over
// everything when the book is shut, is under everything when it is open, and every leaf that goes
// over lands exactly on the pile the leaves before it made. Nothing has to be interpolated, and that
// identity — 2·hy − y(right) = y(left) — is why a leaf never has to be told where it is going.
const HINGE = BOARD.t + BLOCK / 2;

// ---- THE DRAWINGS -------------------------------------------------------------------------------
// The user, having watched the first cut of the book work: "the book's animations are really not
// done with love, you should put a lot more work into that." They are right, and what was wrong with
// them was not their timing but their POVERTY: a board that was a plane hinged like a door, a leaf
// that was a stiff plate, a riffle that was one flip played over and over, a close that was the open
// read backwards. Everything below is counted on the twelve and every number is a POSE somebody
// decided, never an ease evaluated at runtime — which is this film's whole arrangement and is why
// there are tables here and not curves.
//
// AND EVERY POSE IS JUDGED FROM ONE SEAT. The book is watched from straight above (camera-shots.js,
// `reading`), and a plan view is cruel to animation: it shows ANGLE, because a thing turned by φ
// about a horizontal axis foreshortens as cos φ, and it shows nothing else. A 2 mm lift toward a
// lens 1.53 m up is a scale change of 0.13 %, which is one pixel in an 800-pixel frame; a leaf
// rising at its corner is invisible until the corner has real angle. So of everything a real book
// does, the drawings below keep what SURVIVES THE PLAN — foreshortening, separation between two
// things that were coincident, and travel in the plane of the table — and spend nothing on the rest.
// Where a beat had to be carried some other way it is said where it happens.
const deg = (d) => (d * Math.PI) / 180;

// ---- 1. THE BOARD GOING OVER, twelve drawings (1.00 s) --------------------------------------------
// A hardback's front board does not hinge like a door on a flat leaf, and the old eight drawings
// were exactly a door: 0, 28.8, 79.2 — the second drawing was already a sixth of the way over.
// What a board actually does, and what each phase is worth from a plan:
//   drawings 0-2   THE LIFT. The fore-edge breaks away first and the joint gives grudgingly, so the
//                  angle is small (7°, 22°) and the BOW is at its largest — the cover's paper arching
//                  so the fore-edge leads its own chord by 14 mm. From above this reads as the block
//                  appearing from under a moving edge, which is 2 px on drawing 1 and 61 px by
//                  drawing 3: the slowest, most legible part of the whole move.
//   drawings 3-6   THE SWING. 52, 90, 126, 152 — thirty-odd degrees a drawing, which strobes, which
//                  is what a board thrown over looks like at twelve a second.
//   drawings 7-8   THE FALL. It goes over the top on its own weight and meets the table.
//   drawings 9-11  THE BOUNCE AND THE SETTLE. 170.5, 178, 180 — a 9.5° rebound, which lifts the
//                  fore-edge 28 mm off the table.
// AND THE BOUNCE IS NOT WHAT THE VISITOR SEES, which is worth saying plainly because it decided the
// rest of this. A rebound about the joint moves the board's fore-edge 2.3 mm toward the joint by
// foreshortening and 3.1 mm away from it by perspective — they very nearly cancel, and a bounce that
// is honest in the object is under three pixels on the glass. What carries the landing from this
// seat is THE BLOCK: it overshoots its own squaring-up by 6 mm on the drawing the board lands and
// comes back over the two after it, which is 16 px of travel in the plane of the table. So the board
// bounces because a board bounces, and the block is what says so.
const SWING = [0, 7, 22, 52, 90, 126, 152, 172, 180, 170.5, 178, 180].map(deg);
// the cover's arch, as the total tangent sweep across the whole 170 mm of it: an arch of b lifts the
// fore-edge b·w/2 off its own chord, so 0.17 here is 14 mm of bowed board. Positive lifts the
// fore-edge in the board's own frame, which is UP while the board is shut and DOWN once it is over —
// hence the sign change at the landing, where the negative is the fore-edge springing off the table.
const SWING_BOW = [0, 0.17, 0.15, 0.11, 0.08, 0.06, 0.04, 0.02, 0, -0.11, -0.04, 0];
// THE ENDPAPER AND THE LEAVES ALREADY READ go over WITH the board and they TRAIL it, because paper
// is not board. Sixteen degrees behind it through the middle, which at 90° stands the leaf's own
// fore-edge 80 px clear of the board's — two strokes where there had been one, and the only way this
// beat can be seen at all from a plan. They land a drawing after the board and their own rebound is
// BIGGER than its (12° against 9.5°) and a drawing later, which is paper thrown up off a board that
// has stopped; smaller or earlier and the board passes through them, which is geometry and not taste.
const SWING_LEAF = [0, 6, 17, 41, 74, 110, 141, 165, 177, 168, 176.5, 180].map(deg);
// …and they BILLOW while they go, which is the same arch measured across 160 mm of leaf. It is back
// to nothing by the seventh drawing: past there the leaf is coming down onto the board and an arch
// in that frame points into it.
const SWING_BILLOW = [0, 0.06, 0.14, 0.19, 0.16, 0.10, 0.04, 0, 0, 0, 0, 0];
// THE SQUARING-UP, as a fraction of the 95 mm (see AND IT SQUARES ITSELF UP). It lags the board out
// of the first drawings — a hand cannot push and lift at the same instant — runs past its mark by
// six hundredths on the drawing the board lands, and settles back over the two after it.
const SWING_SLIDE = [0, 0.03, 0.10, 0.26, 0.48, 0.70, 0.86, 0.96, 1.06, 1.02, 0.99, 1];
// …and the block LIFTS, in millimetres. It is 2.3 mm at its most, which from this seat is one pixel
// of scale on an 800-pixel frame and will be seen by nobody. It is here because the book is an
// object before it is a picture, and because at any shot less than plumb it is the difference
// between a book being opened and a book being operated.
const SWING_RISE = [0, 0.6, 1.4, 2.1, 2.3, 1.9, 1.3, 0.6, 0, 0.9, 0.2, 0].map((mm) => mm / 1000);

// ---- 2. THE CLOSE, eleven drawings (0.92 s) -------------------------------------------------------
// And it is NOT that list read backwards, which is the lesson the door on the frieze learnt in its
// own file (egg-cross.js): backwards, the first drawing of a close is the rebound, so the book pulls
// itself further open on its way to shutting. A close has its own weight. It comes off the table
// slowly (9°, 19°), falls (34, 40, 36), and meets the block with a heavier thump than the open's,
// because a board landing on forty millimetres of paper is a board landing on something.
const SHUT = [180, 171, 152, 118, 78, 42, 15, 2, 0, 3.5, 0].map(deg);
// THE LEAVES SIGH SHUT A BEAT BEFORE IT. They are AHEAD of the board the whole way — twelve degrees
// at first and twenty in the middle — and they are flat and still by the seventh drawing while the
// board has fifteen degrees left to come. So the paper lands, and then the cover lands on the paper.
const SHUT_LEAF = [180, 166, 140, 100, 58, 24, 4, 0, 0, 0, 0].map(deg);
// the cover's arch on the way down: it hollows as it comes off the table (negative, which is the
// fore-edge hanging back) and then the fore-edge overtakes and slaps last — 0.16 is 13.6 mm of board
// still in the air on the drawing the joint is already home.
const SHUT_BOW = [0, -0.09, -0.12, -0.08, -0.03, 0.04, 0.12, 0.16, 0.05, 0.10, 0];
const SHUT_BILLOW = [0, 0.05, 0.09, 0.07, 0.04, 0.02, 0, 0, 0, 0, 0];
// the block RELAXES, and it lags: the boards come together first and the book is squared back after,
// which is the hand letting go rather than the hand putting it away. It goes a fiftieth past home
// and comes back, which is 2 mm.
const SHUT_SLIDE = [1, 1, 0.98, 0.9, 0.72, 0.5, 0.3, 0.14, 0.04, -0.02, 0];
const SHUT_RISE = [0, 0, 0.3, 0.8, 1.1, 0.9, 0.5, 0.2, 0, 0.5, 0].map((mm) => mm / 1000);

// ---- 3. ONE LEAF GOING OVER, ten drawings (0.83 s) ------------------------------------------------
// Six drawings was not enough paper for a page turn and the first of them was 32.4°, which is a
// third of the way over before the drawing has begun. Ten, and they are spaced in the FRAME and not
// in the angle, which is the one thing that had to be learnt twice this round.
//
// A LEAF TURNED ABOUT THE GUTTER AND WATCHED FROM ABOVE MOVES AS THE COSINE. Its fore-edge stands
// w·cos φ from the gutter, so degrees are not the measure of anything a visitor sees: a table spaced
// evenly in φ spends a third of its drawings between 130° and 180°, where the whole leaf travels 5 mm
// and four drawings running are the same picture. A first cut of this, at 9-28-62-100-134-158-173-
// 178.5-180, did exactly that — measured, the last four drawings moved the fore-edge 13, 11, 3 and 0
// pixels, which is a third of a page turn spent on nothing. So the COSINE is what is eased, from +1
// to −1, and the angles below are whatever that asks for:
//     cos φ   .98  .90  .70  .40  .04  −.34  −.66  −.87  −.97  −1
//     px      34   85   128  153  162  136   89    43    13        (the fore-edge, at 1280x800)
// which is a slow lift, a fast middle that strobes the way a page does at twelve a second, and a
// landing that settles over the last two drawings at 43 px and 13 — a page coming to rest instead of
// a page being switched off.
//
// The angle in this table is the TRAILING rail's, at the foot of the leaf; the head is that plus the
// lead, because a lead applied symmetrically sends the trailing corner below the block it is lying
// on and paper does not go through paper.
const TURN = [12, 26, 46, 66, 88, 110, 131, 150, 166, 180].map(deg);
// THE CURL, as the tangent sweep across the whole 160 mm of leaf, growing toward the middle of the
// turn and relaxing as it lands. 0.55 at its peak is 44 mm of arch, and the old comment's fear of a
// big curl is the wrong way round: a curled leaf leans its tip BACK over the gutter, so at 61° it
// reaches 36 mm from the gutter where a flat plate reaches 78, and the page underneath is uncovered
// SOONER and not later. Where it is worth everything is at 100°, where a flat plate is very nearly
// edge-on and vanishes: curled, the leaf stands 69 mm across the page it is landing on against the
// flat plate's 28 — 109 px of paper on the glass that a plane simply does not have.
//
// AND THE TAIL OF IT IS NOT TASTE, IT IS THE TABLE. A leaf at φ with a curl of b has its own
// tangent running from 0 to b along its width, and at an angle δ short of flat the height of a point
// s along it rises as sin(δ − θ(s)): so the moment b exceeds δ the far half of the leaf is BELOW the
// page it is landing on. Measured, with a first cut of this table that carried 0.26 into the 173°
// drawing: seven eighths of the leaf went through the left page and what was left in the picture was
// a triangle of it at one corner. The curl has to be gone by the time the angle is. Hence the tail
// — 0.28, 0.09, 0.018, 0 — and hence the clamp in `dress`, which is the same fact written as code
// for the backward turn, where the leaf is leaving the left pile at 171° and the room is nine
// degrees on the FIRST drawing rather than the last.
const TURN_BOW = [0.24, 0.38, 0.50, 0.55, 0.55, 0.48, 0.38, 0.24, 0.10, 0];
// THE LEAD: how many degrees further round the HEAD rail is than the foot one — the corner coming up
// first, and the whole reason for five rails. At 22° the fore-edge is a clear diagonal across the
// page instead of a line parallel to the gutter. It goes slightly negative at 158 and 173, which is
// the far corner arriving FIRST on the way down while the corner that led is still in the air: the
// flutter of the landing, and it is the last thing to go flat.
const TURN_LEAD = [24, 19, 13, 7, 2, -2, -5, -6, -3, 0].map(deg);
// …and the FLUTTER at the top of the arc: a second harmonic laid over the curl, so the leaf ripples
// through its own middle without its tip moving. Three drawings of it and no more — a leaf that
// ripples all the way over is a flag.
const TURN_WAVE = [0, 0.04, 0.09, 0.14, 0.10, 0.02, -0.06, -0.03, 0, 0];

// ---- 4. THE RIFFLE --------------------------------------------------------------------------------
const RIFFLE_PER = 2; // drawings a leaf …
const RIFFLE_CAP = 24; // … and the cap: two seconds, whatever the jump
// A THUMB RUNNING A BLOCK accelerates and decelerates, and the old riffle did not: the leaf it was
// showing walked from here to there at a constant rate and the two sheets in the air flipped on a
// fixed count, so the longest jump in the book and the shortest were the same drawing repeated. The
// run is eased now — `snapEase` off the room's own clock, quantised by the drawing like everything
// else — and the leaves in the air take their phase from THE EASED POSITION rather than from the
// count, so they flip fast where the thumb is fast and hang where it is slowing. That one change is
// the difference between a riffle and a flicker.
const RIFFLE_FLY = 4; // sheets in the air at once: what makes it a fan and not a page
const RIFFLE_TURNS = 2.6; // drawings a sheet takes to go over, at the run's own average speed
// each flier is given its own lead and its own curl, or four leaves on the same numbers are one leaf
// drawn four times
const RIFFLE_LEAD = [26, 14, -8, 20].map(deg);
const RIFFLE_BOW = [0.52, 0.40, 0.58, 0.46];

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
  // A SWALLOWTAIL AT EACH END, because either end can be the one in the picture: the tail hanging
  // out past the head is what shows on every page of the book, and the far end is the one that
  // hangs over the FOOT when the strip is lying out across the page it marks.
  const notch = 34; // the depth of the V, in the strip's own pixels
  g.globalCompositeOperation = 'destination-out';
  for (const [y0, dir] of [[h, -1], [0, 1]]) {
    g.beginPath();
    g.moveTo(-1, y0 + dir);
    g.lineTo(-1, y0 - dir);
    g.lineTo(w / 2, y0 + dir * notch);
    g.lineTo(w + 1, y0 - dir);
    g.lineTo(w + 1, y0 + dir);
    g.closePath();
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // the weave, close enough that the pass reads it as tone and not as a pattern
  hatch(g, 0, 0, w, h - 2, { angle: 1.05, spacing: 5, width: 1.3, wobble: 0.5, broken: 0.16, rng: r, alpha: 0.8 });
  // a line down each selvedge, and the two cut edges of the swallowtail
  inkLine(g, 2.5, 2, 2.5, h - 2, { width: 1.8, wobble: 0.7, rng: r, color: INK });
  inkLine(g, w - 2.5, 2, w - 2.5, h - 2, { width: 1.8, wobble: 0.7, rng: r, color: INK });
  for (const [y0, dir] of [[h, -1], [0, 1]]) {
    inkLine(g, 2, y0 + dir * 3, w / 2, y0 + dir * (notch - 2), { width: 1.8, wobble: 0.6, rng: r, color: INK });
    inkLine(g, w - 2, y0 + dir * 3, w / 2, y0 + dir * (notch - 2), { width: 1.8, wobble: 0.6, rng: r, color: INK });
  }
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

// WHAT A LIFTED LEAF DOES TO THE PAGE UNDER IT. The rule in this book is that nothing in it casts a
// shadow, and the rule stands: what is forbidden (STYLE §1.1, and the note at `mkPile`) is a SOFT
// BLURRY SHADOW off a shadow map. §1.3 says in the same breath what this world puts there instead —
// "a small dense patch directly under an object" — and the cards on the cloth already have one
// (reveal-ground.js): four to seven short strokes struck at a shallow angle ACROSS the edge, ends
// staggered, each laid in one pass and stopping. A page held up over another page is the plainest
// case of that there is, and without it a turning leaf is a sheet floating in a vacuum.
//
// The strip is 34 mm of page by the leaf's own length, drawn with the tone gathered hard against its
// +x edge and thinning inward over five ranks. It is laid so that edge sits under the turning leaf's
// own fore-edge and travels with it, so the patch is the same patch the whole way across and the
// pen has drawn it once. The RAKE is the trick and it is reveal-ground's: strokes parallel to an
// edge and hard against it read as MORE OF THE EDGE — a page with three pages under it.
const TONE = { w: 0.034, px: 2400 };
function toneTexture() {
  const W = Math.round(TONE.w * TONE.px), H = 512;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const r = mulberry32(0x6d12b);
  g.clearRect(0, 0, W, H);
  const RAKE = 0.24; // ~14° off the edge, the cloth's own
  for (let k = 0; k < 5; k++) {
    const x = W - 3 - k * (W / 6.2) - r() * 3;
    const nib = 2.6 * (1 - k * 0.11);
    // …broken into three to five strokes down the length, ends staggered, so it is a cluster of
    // lines and never a band
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const y0 = (H * (i + 0.12 + r() * 0.2)) / n;
      const len = (H / n) * (0.52 + r() * 0.3);
      inkLine(g, x + len * RAKE * 0.5, y0, x - len * RAKE * 0.5, y0 + len, { width: nib, wobble: 0.55, rng: r, color: INK, alpha: 0.85 - k * 0.12 });
    }
  }
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
  // `fresh` re-measures the geometry before projecting it, and it is not an optimisation to skip:
  // a leaf and the front board are BENT on every drawing and three.js computes a bounding box once
  // and keeps it, so a box asked for while something is moving is the box of the pose it was in
  // when somebody first asked.
  function boxOf(mesh, fresh = false) {
    if (!mesh || !ctx.camera) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const g = mesh.geometry;
    if (fresh || !g?.boundingBox) g?.computeBoundingBox?.();
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
  const paper = new THREE.Group(); // everything a click on the BOOK may land on
  paper.name = 'tarot-book-paper';
  group.add(paper);
  // …and THE LEAVES ON THEIR OWN, because a click on a page has to find the PAGE. The leaf lying on
  // a pile stands a seventh of a millimetre off it, and a ray asked for the nearest thing in the
  // whole book will now and then answer the block instead of the sheet on top of it — measured, on
  // the contents at 1280x800: twenty of eighty-five lines went to `book-pile-left` and the click
  // fell through to «which side of the gutter is this» and turned the page back. So the leaves are
  // asked FIRST, by themselves, and the rest of the book only answers the question a page could not.
  const leafGroup = new THREE.Group();
  leafGroup.name = 'tarot-book-leaves';
  paper.add(leafGroup);
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
    const n = SEGS, r = RAILS;
    const pos = new Float32Array((n + 1) * r * 3);
    const uv = new Float32Array((n + 1) * r * 2);
    const idx = [];
    for (let j = 0; j < r; j++) {
      for (let i = 0; i <= n; i++) {
        const p = j * (n + 1) + i;
        uv[p * 2] = i / n;
        uv[p * 2 + 1] = 1 - j / (r - 1);
      }
    }
    // the winding is the old one's, band by band: rail j is the head side of the band it opens
    for (let j = 0; j < r - 1; j++) {
      const o0 = j * (n + 1), o1 = (j + 1) * (n + 1);
      for (let i = 0; i < n; i++) idx.push(o0 + i, o1 + i, o0 + i + 1, o0 + i + 1, o1 + i, o1 + i + 1);
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
    leafGroup.add(pivot);
    pivot.position.set(xs, HINGE, 0); // the joint of the binding: see HINGE
    const L = { pivot, geo, front, back, curl: NaN, off: NaN, lead: NaN, wave: NaN, tip: [0, 0], faces: [null, null] };
    bend(L, 0, 0);
    return L;
  }
  // THE WHOLE OF THE TURN'S DRAWING, and it is four numbers. The leaf is bent in its PIVOT's frame —
  // tangent angle θ(s) along its width — and the pivot is then turned about the gutter by the angle
  // of the drawing, so how far over it is and what shape it is are kept apart and neither can push
  // the paper through the table.
  //
  //   kappa  the CURL, 1/m: θ grows κ·s, which is a circular arc of total sweep κ·w
  //   off    the height it left, as an offset off the joint
  //   lead   the LEAD, in radians: the extra angle given to the HEAD rail over the foot one, spread
  //          linearly across the rails. This is the corner coming up first and it is the only thing
  //          five rails exist for. It is applied ONE-SIDED — rail j gets lead·j/(RAILS−1) counting
  //          from the FOOT — because a lead spread symmetrically sends the foot rail below the block
  //          the leaf is lying on, and 5.6 mm of paper through paper is what the first cut drew.
  //   wave   the FLUTTER: a second harmonic on the tangent, sin(2π s/w), which ripples the leaf
  //          through its own middle and leaves its tip exactly where the curl put it — one integral
  //          of sin over a whole period being nothing. So a leaf can flutter without going anywhere,
  //          which is what a flutter is.
  function bend(L, kappa, off, lead = 0, wave = 0) {
    if (Math.abs(kappa - L.curl) < 1e-6 && Math.abs(off - L.off) < 1e-7 && Math.abs(lead - L.lead) < 1e-6 && Math.abs(wave - L.wave) < 1e-6) return;
    L.curl = kappa;
    L.off = off;
    L.lead = lead;
    L.wave = wave;
    const n = SEGS, r = RAILS, ds = LEAF.w / n;
    const p = L.geo.attributes.position.array;
    let X = 0, Y = 0;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j < r; j++) {
        // rail 0 is the HEAD (z = −h/2, and the book's head is its local −z), so the lead is counted
        // from the FOOT rail up: rail r−1 gets nothing and rail 0 gets all of it. It turns about the
        // leaf's OWN GUTTER EDGE (0, off) and not about the joint: about the joint, a leaf lying
        // 20 mm off the hinge swings its bound edge 7.5 mm out of the gutter at 22° and the head of
        // the book opens a gap no binding has.
        const a = lead * (1 - j / (r - 1));
        const ca = Math.cos(a), sa = Math.sin(a);
        const x = X, y = Y;
        const o = (j * (n + 1) + i) * 3;
        p[o] = x * ca - y * sa;
        p[o + 1] = off + x * sa + y * ca;
        p[o + 2] = -LEAF.h / 2 + (LEAF.h * j) / (r - 1);
      }
      const s = i * ds + ds / 2;
      const th = kappa * s + wave * Math.sin((2 * Math.PI * s) / LEAF.w);
      X += ds * Math.cos(th);
      Y += ds * Math.sin(th);
    }
    L.tip = [X, off + Y]; // the fore-edge, in the pivot's own frame: what the tone under it follows
    L.geo.attributes.position.needsUpdate = true;
    // …and the normals with them. The composite shows a verbatim surface before it ever looks at a
    // normal, but the G-buffer writes one for every pixel in the frame and the contour pass reads
    // that buffer to find its edges — a geometry with no normal attribute at all hands it NaN and
    // the pen draws whatever that turns into round the leaf.
    L.geo.computeVertexNormals();
    L.geo.computeBoundingSphere();
  }
  // FIVE LEAF MESHES, whatever the book runs to, and the two extra are the riffle's. Three was the
  // number a TURN needs — the leaf in the air, the one it uncovers and the one it lands on — and a
  // riffle given three has one sheet lying on the pile it is filling and TWO in the air, which is
  // two pages flipping and not a thumb running a block. Four in the air overlap: at any drawing one
  // is coming up, one is over the gutter and two are going down, so the run reads as a fan of paper
  // rather than as one leaf drawn over and over. They cost nothing when nobody is riffling: an
  // invisible mesh is not raycast (`castAt` walks up the tree for the flag) and is not laid.
  const leaves3 = [makeLeaf('leaf-a'), makeLeaf('leaf-b'), makeLeaf('leaf-c'), makeLeaf('leaf-d'), makeLeaf('leaf-e')];

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

  // THE FRONT BOARD, AND IT IS A BOARD. It was a sheet: two meshes off one set of triangles, the
  // cover FrontSide and the paste-down BackSide, with no thickness between them at all — and at the
  // fifth drawing of its own swing, standing at ninety degrees to a lens that is looking straight
  // down at it, a sheet is a LINE. Two and a half millimetres of board is 6.6 px on the glass at
  // 1280x800, so the drawing where a board most needs to be a board is exactly the one where it had
  // nothing. It is a slab now: an outer face carrying props-table's own cover (one drawing of that
  // cover in the film, the material instance read off the closed book rather than struck again), an
  // inner face carrying the paste-down, and a RIM round the fore-edge, the head and the tail in the
  // room's dark edge — the cloth turned over the board, which is what the eye is given while it
  // passes vertical. The joint end is left open: it is inside the gutter at every angle.
  const BOARD_OFF = HINGE - BOARD.t / 2; // the board's own MID-plane, an offset off the joint
  const boardLeaf = (() => {
    const n = 10; // spans along the board: enough for the arch to be a curve, a board being stiff
    // k = 0 outer (the cover), 1 inner (the paste-down); j = 0 head, 1 tail. There are THREE copies
    // of every station — the faces', the head-and-tail rims' and the fore-edge's — because the rim
    // must not SHARE a normal with the face it meets. Sharing them, `computeVertexNormals` averages
    // the two and the contour pass, which finds its edges in the G-buffer's normals, is handed a
    // board whose corner is a slow curve: the thickness is in the geometry and nothing draws it.
    const F = 4 * (n + 1), R = 4 * (n + 1);
    const at = (i, j, k) => (k * 2 + j) * (n + 1) + i;
    const rimAt = (i, j, k) => F + (k * 2 + j) * (n + 1) + i;
    const feAt = (j, k) => F + R + k * 2 + j;
    const V = F + R + 4;
    const pos = new Float32Array(V * 3);
    const uv = new Float32Array(V * 2);
    // the cover's own uv is the sheet's, unchanged, so the lettering lands where it always did
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) for (let i = 0; i <= n; i++) {
      for (const p of [at(i, j, k), rimAt(i, j, k)]) {
        uv[p * 2] = i / n;
        uv[p * 2 + 1] = j === 0 ? 1 : 0;
      }
    }
    const outer = [], inner = [], rim = [];
    for (let i = 0; i < n; i++) {
      // the cover, wound as the old sheet was — its normal off the board …
      outer.push(at(i, 0, 0), at(i, 1, 0), at(i + 1, 0, 0), at(i + 1, 0, 0), at(i, 1, 0), at(i + 1, 1, 0));
      // … the paste-down, wound the other way, since it faces the other way
      inner.push(at(i, 1, 1), at(i, 0, 1), at(i + 1, 1, 1), at(i + 1, 1, 1), at(i, 0, 1), at(i + 1, 0, 1));
      // … and the head and tail rims, on their own vertices
      rim.push(rimAt(i, 0, 1), rimAt(i, 0, 0), rimAt(i + 1, 0, 1), rimAt(i + 1, 0, 1), rimAt(i, 0, 0), rimAt(i + 1, 0, 0));
      rim.push(rimAt(i, 1, 0), rimAt(i, 1, 1), rimAt(i + 1, 1, 0), rimAt(i + 1, 1, 0), rimAt(i, 1, 1), rimAt(i + 1, 1, 1));
    }
    // … and the fore-edge, which is the one the visitor is watching for most of the swing
    rim.push(feAt(0, 0), feAt(1, 0), feAt(0, 1), feAt(0, 1), feAt(1, 0), feAt(1, 1));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex([...outer, ...inner, ...rim]);
    geo.addGroup(0, outer.length, 0);
    geo.addGroup(outer.length, inner.length, 1);
    geo.addGroup(outer.length + inner.length, rim.length, 2);
    const pivot = new THREE.Object3D();
    pivot.name = 'book-front-board';
    pivot.position.set(xs, HINGE, 0);
    const inside = inkMaterial({ hatch: 0.12 }); // the paste-down, which is what an open board shows
    const cover = (() => {
      const m = table()?.mesh?.material;
      return Array.isArray(m) ? m[2] : null;
    })() ?? inkMaterial({ hatch: 0.04, lineWeight: 0 });
    // ONE MESH. A slab has a front and a back in its own winding and does not need a second pass
    // over the same triangles to find them, which is what the sheet needed and what cost it a draw.
    const slab = new THREE.Mesh(geo, [cover, inside, M.solid]);
    slab.name = 'book-front-board-slab';
    slab.castShadow = false;
    slab.receiveShadow = true;
    pivot.add(slab);
    paper.add(pivot);
    return { pivot, geo, n, at, rimAt, feAt, curl: NaN };
  })();
  // The arch, and the two faces of the slab held half a board apart along its own normal the whole
  // way: the tangent at s is (cos θ, sin θ) so the normal is (−sin θ, cos θ), and a slab bent that
  // way keeps its thickness through the bend instead of pinching at the arch.
  function bendBoard(kappa) {
    if (Math.abs(kappa - boardLeaf.curl) < 1e-6) return;
    boardLeaf.curl = kappa;
    const n = boardLeaf.n, ds = BOARD.w / n, half = BOARD.t / 2;
    const p = boardLeaf.geo.attributes.position.array;
    let X = 0, Y = 0;
    for (let i = 0; i <= n; i++) {
      const th = kappa * i * ds;
      const nx = -Math.sin(th) * half, ny = Math.cos(th) * half;
      for (let k = 0; k < 2; k++) {
        const sgn = k === 0 ? 1 : -1;
        for (let j = 0; j < 2; j++) {
          const z = j === 0 ? -BOARD.h / 2 : BOARD.h / 2;
          const copies = [boardLeaf.at(i, j, k), boardLeaf.rimAt(i, j, k)];
          if (i === n) copies.push(boardLeaf.feAt(j, k));
          for (const c of copies) {
            const o = c * 3;
            p[o] = X + nx * sgn;
            p[o + 1] = BOARD_OFF + Y + ny * sgn;
            p[o + 2] = z;
          }
        }
      }
      const mid = kappa * (i * ds + ds / 2);
      X += ds * Math.cos(mid);
      Y += ds * Math.sin(mid);
    }
    boardLeaf.geo.attributes.position.needsUpdate = true;
    boardLeaf.geo.computeVertexNormals();
    boardLeaf.geo.computeBoundingSphere();
  }
  bendBoard(0);

  // THE TONE A LIFTED LEAF LAYS ON THE PAGE UNDER IT (see `toneTexture`). One alpha-tested strip, the
  // leaf's own length by 34 mm, which travels with the turning leaf's fore-edge and is out of the
  // picture the rest of the time.
  const tone = (() => {
    const g = new THREE.PlaneGeometry(TONE.w, LEAF.h);
    g.rotateX(-Math.PI / 2);
    const m = inkMaterial({ map: canvasTexture(toneTexture()), hatch: 0, lineWeight: 0, colorful: false, side: THREE.DoubleSide });
    m.alphaTest = 0.5;
    m.transparent = false;
    const mesh = new THREE.Mesh(g, m);
    mesh.name = 'book-leaf-tone';
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = false;
    signGroup.add(mesh); // NOT in `paper`: it is tone, and a click must fall through it to the page
    return mesh;
  })();

  // THE RIBBON. A strip down the gutter with 35 mm of tail out past the head of the block, rebuilt
  // on every turn because the pile it lies on changes height as the visitor reads.
  const ribbonMat = (() => {
    const m = inkMaterial({ map: canvasTexture(ribbonTexture()), hatch: 0.5, lineWeight: 0.9, side: THREE.DoubleSide });
    m.alphaTest = 0.5;
    m.transparent = false;
    return m;
  })();
  const ribbon = (() => {
    // twelve spans, which is what the two jobs together need: four of them carry the 20 mm of tail
    // that bends over the head of the block, and the eight behind them run 240 mm down a page
    const n = 12;
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
  function layLeaf(L, phi, off, kappa = 0, lead = 0, wave = 0) {
    bend(L, kappa, off, lead, wave);
    L.pivot.rotation.z = phi;
    L.pivot.visible = true;
  }
  // the ribbon and the sewn back lie in the gutter, on the shallower of the two piles — and when the
  // page the ribbon MARKS is the page in front of the visitor, the ribbon lies out across it
  let laid = null; // what the strip is doing at this moment, for the box a thumb is given
  // `flick` is the one thing here that is not geometry: metres of LIFT given to the tail, spent over
  // the 20 mm it hangs out past the head. A ribbon in a book that is being riffled does not lie
  // still — it is the only part of the object the run touches that is not paper — and a ribbon
  // caught by a closing board flicks once and disappears. Both are that number, and nothing else.
  function layGutter(nUnder, over = null, flick = 0) {
    const y = pileTop(nUnder);
    const t = Math.max(0.0022, y);
    sewn.scale.y = t;
    sewn.position.set(xs, t / 2, 0);
    // AND A RIBBON AT ITS OWN PAGE LIES ON THAT PAGE. The user, seeing the first cut of this: "the
    // ribbon should be over the index page obviously, otherwise it doesn't make sense" — and they
    // are right, a ribbon that is not on the page it marks is not marking anything. So: with the
    // contents open the strip comes out of the head, turns down onto the leaf and runs the whole
    // 240 mm of it to the foot, 7 mm off the gutter where the page's own 13.6 mm margin is; on every
    // other page it goes back under the top leaf and what shows is the 20 mm of tail out past the
    // head, drooping onto the table over the block's own edge. Both are one strip and one function.
    const head = -PILE.h / 2, foot = PILE.h / 2;
    const z0 = head - RIBBON.out;
    const z1 = over ? foot + RIBBON.foot : head + RIBBON.in;
    const xc = over ? xs + over.side * RIBBON.lay : xs;
    const yIn = over ? over.y + 0.00006 : y + 0.00004;
    const p = ribbon.geo.attributes.position.array;
    // the tail is the part that BENDS, so it gets a third of the samples whatever the run behind it
    // is doing: four segments over 20 mm of droop and the rest along 240 mm of flat page
    const TAIL = 0.3;
    for (let i = 0; i <= ribbon.n; i++) {
      const u = i / ribbon.n;
      const z = u < TAIL ? z0 + ((head - z0) * u) / TAIL : head + ((z1 - head) * (u - TAIL)) / (1 - TAIL);
      // …and it goes down onto the TABLE at whichever end is hanging off the block
      const off = Math.max(
        Math.min(1, Math.max(0, (head - z) / (RIBBON.out * 0.8))),
        over ? Math.min(1, Math.max(0, (z - foot) / (RIBBON.foot * 0.8))) : 0,
      );
      // the tail droops onto the table; a flick takes that same end back UP, on the square of how
      // far out it is, so the strip curls from the head rather than lifting off it as a plank
      const yy = yIn * (1 - off) + 0.0006 * off + flick * off * off;
      // …and it slides onto the page over the first 40 mm of it rather than stepping across, which
      // is a ribbon coming out of a gutter and not a ruled line drawn beside one
      const x = xs + (xc - xs) * Math.min(1, Math.max(0, (z - head) / 0.04));
      for (let j = 0; j < 2; j++) {
        const o = (j * (ribbon.n + 1) + i) * 3;
        p[o] = x + (j === 0 ? -RIBBON.w / 2 : RIBBON.w / 2);
        p[o + 1] = yy;
        p[o + 2] = z;
      }
    }
    laid = { z0, z1, xc, yIn, over: !!over };
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

  // WHERE A RIFFLE IS, AND HOW FAST. `e` is the eased position along the run, `speed` is what that
  // easing is doing at this drawing normalised to one at its peak, and `flips` is how many times a
  // sheet in the air goes over across the whole run. snapEase is the room's own cubic (core/clock.js)
  // and its derivative peaks at three in the middle, which is where the three comes from.
  function riffleAt(m) {
    const t = m.k / m.drawings;
    const u = Math.min(1, Math.max(0, t));
    const d = u < 0.5 ? 12 * u * u : 3 * (2 - 2 * u) * (2 - 2 * u);
    return { e: snapEase(u), speed: Math.min(1, d / 3), flips: Math.max(1, m.drawings / RIFFLE_TURNS) };
  }
  // THE TONE A TURNING LEAF LAYS ON THE PAGE UNDER IT, laid at the leaf's own fore-edge and turned
  // to the DIAGONAL that edge is at: with the corner leading, the fore-edge is not parallel to the
  // gutter and a strip of tone that is parallel to it is a rule drawn beside a page rather than
  // something the page is doing. The strip narrows as the leaf comes down — a page 4 mm off its
  // neighbour has almost no tone under it — and it is out of the picture the moment the leaf lands.
  function layTone(L, phi, lead, nLeft, nRight) {
    const X = L.tip[0], Y = L.tip[1] - L.off, off = L.off;
    const c = Math.cos(phi), s = Math.sin(phi);
    // where the fore-edge lands at a given rail's extra lead: bent about the leaf's own gutter edge
    // first (which is what `bend` does), then round the joint
    const edge = (a) => {
      const ca = Math.cos(a), sa = Math.sin(a);
      const lx = X * ca - Y * sa, ly = off + X * sa + Y * ca;
      return [lx * c - ly * s, lx * s + ly * c];
    };
    const [fx, fy] = edge(0); // the foot corner …
    const [hx] = edge(lead); //  … and the head one, for the diagonal
    const mx = (fx + hx) / 2, right = mx >= 0;
    const pageY = right ? pileTop(nRight) + LIFT : pileTop(nLeft) + LIFT;
    const up = HINGE + (fy + (edge(lead)[1] - fy) / 2) - pageY;
    if (up < 0.008 || Math.abs(mx) > LEAF.w) {
      tone.visible = false;
      return;
    }
    const w = 0.45 + 0.55 * Math.min(1, up / 0.03); // how wide the tone stands off the edge
    // AND IT LIES ON THE SIDE OF THE FORE-EDGE THE LEAF IS NOT ON, which is the whole of where tone
    // under a lifted page can be: the leaf covers everything between the gutter and its own edge, so
    // a strip laid back toward the gutter is a drawing nobody will ever see. It goes OUTWARD, onto
    // the band the leaf has just uncovered, with the dense end of it hard against the edge.
    const sgn = right ? 1 : -1;
    tone.scale.set(-sgn * w, 1, 1);
    tone.position.set(xs + mx + sgn * TONE.w * w * 0.5, pageY + 0.00008, 0);
    tone.rotation.y = Math.asin(Math.max(-0.85, Math.min(0.85, (-2 * (hx - fx)) / LEAF.h)));
    tone.visible = true;
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
    // has been read stacked on top of it. One rotation about the joint is both — and the three
    // numbers that go with it are read off the same drawing of the same table, so the board's angle,
    // its arch and the block's own travel can never be a drawing out of step with one another.
    const kk0 = motion ? motion.k : 0;
    const pose = (tbl) => tbl[Math.min(tbl.length - 1, kk0)];
    let board = Math.PI, bow = 0, slide = 1, rise = 0;
    let leafPhi = Math.PI, billow = 0;
    if (motion?.kind === 'swing') {
      board = pose(SWING);
      bow = pose(SWING_BOW);
      slide = pose(SWING_SLIDE);
      rise = pose(SWING_RISE);
      leafPhi = pose(SWING_LEAF);
      billow = pose(SWING_BILLOW);
    } else if (motion?.kind === 'shut') {
      board = pose(SHUT);
      bow = pose(SHUT_BOW);
      slide = pose(SHUT_SLIDE);
      rise = pose(SHUT_RISE);
      leafPhi = pose(SHUT_LEAF);
      billow = pose(SHUT_BILLOW);
    }
    if (motion) {
      if (!drew || drew.kind !== motion.kind || drew.started !== motion) drew = { kind: motion.kind, started: motion, angles: [] };
      const a = motion.kind === 'turn' ? pose(TURN) : motion.kind === 'riffle' ? riffleAt(motion).e * Math.PI : board;
      if (drew.angles.length !== motion.k + 1) drew.angles[motion.k] = +((a * 180) / Math.PI).toFixed(1);
      else drew.angles.push(+((a * 180) / Math.PI).toFixed(1));
    }
    // AND THE BLOCK SQUARES ITSELF UP as the board goes over — 95 mm along its own long axis, on its
    // OWN table now rather than tied to the board's angle, because the two things a hand does to a
    // book it is opening do not happen on the same beat: it lags the lift, overshoots on the drawing
    // the board lands, and settles back over the two after it. See AND IT SQUARES ITSELF UP.
    group.position.copy(HOME).addScaledVector(slideVec, slide);
    group.position.y += rise;
    boardLeaf.pivot.rotation.z = board;
    bendBoard(bow / BOARD.w);
    boardLeaf.pivot.visible = true;

    if (swinging) {
      // THE BOARD DOES NOT GO OVER ALONE. Everything already read goes with it — the leaves on the
      // left and, on top of those, the leaf whose back is the page the visitor was on — so what the
      // board uncovers IS the opening they are going to be looking at. Shut the book at the
      // twenty-ninth leaf, open it again, and the twenty-ninth leaf is what is there.
      //
      // AND THEY DO NOT GO OVER AT THE BOARD'S OWN ANGLE. Paper is not board: the read pile and the
      // endpaper on top of it TRAIL the cover on the way open and LEAD it on the way shut, which is
      // `SWING_LEAF` and `SHUT_LEAF` and is the only part of either move that can be seen from a
      // plan at all. The pile takes the same angle as the leaf standing on it, or a rigid box of
      // paper would be lying at one attitude with its own top sheet at another.
      const [T, U] = leaves3;
      park();
      setPile(pileR, nL - k, false);
      setPile(pileL, k - 1, true, leafPhi);
      // …and NOT on the first drawing. At k = 0 the board is still flat over the whole block and
      // there is nothing of either page in the picture, so the two strikes those pages cost are
      // taken on the NEXT drawing — off the click, where a visitor would feel them, and onto a
      // drawing that has 83 ms to itself.
      const yet = motion.k >= 1;
      layLeaf(T, leafPhi, offLeft(pileTop(k) + LIFT), billow / LEAF.w);
      dressFace(T, 'front', yet ? vp - 1 : null);
      dressFace(T, 'back', yet ? vp : null);
      layLeaf(U, 0, offRight(pileTop(nL - k) + LIFT));
      dressFace(U, 'front', yet ? rp : null);
      dressFace(U, 'back', null);
      sewn.visible = false;
      tone.visible = false;
      // THE RIBBON IS CAUGHT BY THE CLOSING BOARD. On the way OPEN it has nothing to do — the block
      // is under a cover and the strip is under the block — but on the way shut the tail is the one
      // thing still sticking out of the book, and it flicks as the boards come together: 9 mm of
      // lift on the drawing the leaves land and gone by the drawing the board does. It is the last
      // of the book anybody sees before props-table's closed one takes its place.
      const catchAt = motion.kind === 'shut' ? [0, 0, 0, 0, 0.004, 0.008, 0.009, 0.004, 0, 0, 0][Math.min(10, motion.k)] : 0;
      ribbon.mesh.visible = motion.kind === 'shut' && motion.k <= 7;
      if (ribbon.mesh.visible) layGutter(Math.min(k, nL - k), null, catchAt);
      prune(new Set([vp - 1, vp, rp]));
      return;
    }
    sewn.visible = true;
    ribbon.mesh.visible = true;

    if (motion?.kind === 'turn') {
      const d = motion.dir;
      const a = pose(TURN);
      const phi = d > 0 ? a : Math.PI - a;
      const lead = pose(TURN_LEAD) * d; // the head corner leads whichever way the leaf is going
      // THE ROOM THE LEAF HAS LEFT, and the curl is not allowed to spend more of it than this. A
      // leaf whose own tangent sweeps further than the angle still between it and the page it is
      // landing on puts its far half UNDER that page — see the tail of TURN_BOW — and a BACKWARD
      // turn meets the same wall at the other end, leaving the left pile at 168° with twelve
      // degrees of room on its first drawing. So the shape is asked for and the geometry is given what it
      // can have, bow and flutter scaled together so the curve keeps its shape as it is trimmed.
      const room = Math.max(0, Math.PI - phi) * 0.8;
      const want = pose(TURN_BOW), swell = pose(TURN_WAVE);
      const fit = Math.min(1, room / (want + Math.abs(swell) + 1e-6));
      const kappa = (want * fit) / LEAF.w;
      const wave = swell * fit;
      const nLeft = d > 0 ? k : k - 1; // the piles while one leaf is off them
      const nRight = d > 0 ? nL - k - 1 : nL - k;
      const [T, U, O] = leaves3;
      park();
      // 1. THE LEAF GOING OVER — leaf k forward (front rp, back rp+1), leaf k−1 back (front vp−1,
      //    back vp).
      //
      //    AND ITS OFFSET IS WALKED FROM THE PILE IT LEAVES TO THE PILE IT JOINS, which is three
      //    tenths of a millimetre across the whole turn and is the difference between a leaf that
      //    lands on the page and a leaf that lands UNDER it. The joint's own identity — a leaf at
      //    right height y is that leaf at left height 2·HINGE − y — is exact for the BLOCK, and the
      //    two piles differ by the one leaf that is in the air: carried over unchanged, the offset
      //    that stood the sheet 0.28 mm clear of the right pile stands it 0.17 mm UNDER the left
      //    one, and the last drawing of every turn showed the page the leaf had just covered. So
      //    the two ends are computed separately and the drawings in between are the walk from one
      //    to the other.
      const offA = d > 0 ? offRight(pileTop(nRight) + LIFT * 2) : offLeft(pileTop(nLeft) + LIFT * 2);
      const offB = d > 0 ? offLeft(pileTop(nLeft) + LIFT * 2) : offRight(pileTop(nRight) + LIFT * 2);
      const off = offA + (offB - offA) * (motion.k / (TURN.length - 1));
      layLeaf(T, phi, off, kappa, lead, wave);
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
      layTone(T, phi, lead, nLeft, nRight);
      prune(new Set([vp - 2, vp - 1, vp, rp, rp + 1, rp + 2]));
      return;
    }

    if (motion?.kind === 'riffle') {
      // A RUN OF LEAVES GOING OVER, and not one of them is struck: the pages between here and there
      // are a blur of paper in anybody's hand, and setting eighty of them to show a visitor two
      // drawings apiece would be a second of somebody's afternoon spent on something nobody reads.
      const R = riffleAt(motion);
      const at = Math.round(motion.from + (motion.to - motion.from) * R.e);
      const kkk = Math.max(1, Math.min(nL - 1, openingOf(at)));
      const d = motion.to > motion.from ? 1 : -1;
      // one leaf lying on the pile the run is FILLING — a riffle covers that side over and over, so
      // there is always a sheet on it — and FOUR more in the air
      const [F, ...fly] = leaves3;
      park();
      layLeaf(F, d > 0 ? Math.PI : 0, d > 0 ? offLeft(pileTop(kkk) + LIFT) : offRight(pileTop(nL - kkk) + LIFT));
      dressFace(F, 'front', null);
      dressFace(F, 'back', null);
      // AND THEIR PHASE COMES OFF THE EASED POSITION AND NOT OFF THE COUNT, which is the whole of
      // this round's quarrel with the old riffle: a thumb that is accelerating flips the paper
      // faster, and one that is slowing lets it hang. They are a quarter cycle apart so that at any
      // drawing one is coming up, one is over the gutter and two are going down — a fan — and each
      // is given its own lead and its own curl, or four leaves on the same numbers are one leaf
      // drawn four times.
      fly.forEach((L, i) => {
        const ph = (R.e * R.flips + i / RIFFLE_FLY) % 1;
        const s = Math.sin(Math.PI * ph);
        const base = d > 0 ? offRight(pileTop(nL - kkk) + LIFT * (2 + i)) : offLeft(pileTop(kkk) + LIFT * (2 + i));
        layLeaf(L, Math.PI * (d > 0 ? ph : 1 - ph), base, (RIFFLE_BOW[i] * s) / LEAF.w, RIFFLE_LEAD[i] * s * d);
        dressFace(L, 'front', null);
        dressFace(L, 'back', null);
      });
      setPile(pileR, nL - kkk, false);
      setPile(pileL, kkk, true);
      // …and the ribbon rides the run: up to 7 mm of tail at the fastest of it and back down as the
      // thumb comes off the block
      layGutter(Math.min(kkk, nL - kkk), null, 0.007 * R.speed);
      tone.visible = false;
      return;
    }

    // AT REST: the two facing pages, and they are the two the pen goes back over on the twelve
    const [A, B] = leaves3;
    park();
    layLeaf(A, 0, offRight(pileTop(nL - k) + LIFT));
    dressFace(A, 'front', rp, true);
    dressFace(A, 'back', null);
    layLeaf(B, Math.PI, offLeft(pileTop(k) + LIFT));
    dressFace(B, 'back', vp, true);
    dressFace(B, 'front', null);
    tone.visible = false;
    setPile(pileR, nL - k, false);
    setPile(pileL, k, true);
    // THE RIBBON'S OWN PAGE, which is a page of the contents. If one of the two in front of the
    // visitor is a leaf of the list, the strip lies out across it; if both are, it takes the one the
    // visitor is standing on, which on a phone is the only one they can see anyway.
    const onR = !!b.leaves[rp]?.index, onV = !!b.leaves[vp]?.index;
    const side = page === vp && onV ? -1 : onR ? 1 : onV ? -1 : 0;
    layGutter(
      Math.min(k, nL - k),
      side > 0 ? { side: 1, y: pileTop(nL - k) + LIFT } : side < 0 ? { side: -1, y: pileTop(k) + LIFT } : null,
    );
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
    takeShot('reading', snap ? 0 : (SHUT.length - 1) / 12);
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
    sound('rustle', { gain: 0.5 }); // the lift; the landing gets its own, a fifth of it (`update`)
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
  // AND A DRAWING THAT IS NOT IN THE PICTURE IS NOT ASKED. three.js raycasts a mesh whether or not
  // it is visible — `intersectObject` walks the children and never looks at the flag — and this book
  // keeps a THIRD leaf parked (see THE LEAVES): at rest it is invisible and it is still lying
  // wherever the last turn left it, which is on top of the two that are being read. Measured, on the
  // contents at 1280x800: the first two lines of the second leaf of the list, TEMPERANCE and THE
  // DEVIL, were answered by that parked leaf; the page under it never heard the click, and the book
  // fell through to «which side of the gutter is this» and turned the page BACK to the title. So the
  // nearest hit is the nearest hit ON SOMETHING THAT IS DRAWN, and the parked leaf is skipped.
  function castAt(ev, target) {
    if (!glass || !ctx.camera) return null;
    const r = glass.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    for (const q of ray.intersectObject(target, true)) {
      let o = q.object, on = true;
      while (o && o !== target) {
        if (o.visible === false) {
          on = false;
          break;
        }
        o = o.parent;
      }
      if (on) return q;
    }
    return null;
  }
  // WHAT A POINT ON A LEAF IS, in the page's own pixels. A verso's texture is mirrored in u (see
  // `faceOf`), so the two are put back together here and nowhere else — and a click on a line of the
  // contents is then simply a point inside a box the page recorded when it was lettered.
  function pageHit(hit) {
    const b = cut;
    if (!b || !hit?.uv) return null;
    const L = leaves3.find((q) => q.pivot === hit.object.parent);
    if (!L || !L.pivot.visible) return null; // a leaf that is not in the picture cannot be clicked
    const isBack = hit.object.material === L.back;
    const p = L.faces[isBack ? 1 : 0];
    if (p == null) return null;
    const u = isBack ? 1 - hit.uv.x : hit.uv.x;
    return { page: p, x: u * b.S.pw, y: (1 - hit.uv.y) * b.S.ph };
  }
  function onPaper(ev) {
    if (!showing || motion) return;
    const leaf = castAt(ev, leafGroup);
    const at = pageHit(leaf);
    const hit = leaf ?? castAt(ev, paper); // a click that missed the paper still hit the book
    if (!hit) return;
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
    if (!showing || !ctx.camera || !laid) return null;
    const xsv = [], ysv = [];
    // …and the box is the box of the strip AS IT IS ACTUALLY LAID: the two ends of it, which is the
    // tip of the tail out over the table and either the foot of the page it is lying on or the head
    // of the block it goes under. Over the contents that is 8 x 260 mm of ribbon and the box round
    // it is a tall sliver, which is the honest target — and it costs the list nothing, because the
    // ribbon is a DRAWING and the arbiter asks the drawings before it ever asks a box: a click on
    // the paper beside the strip hits the leaf and goes to the line under it.
    for (const [ex, ey, ez] of [
      [xs, 0.0006, laid.z0],
      [laid.xc, laid.over ? laid.yIn : pileTop(ribbonUnder()) + 0.0008, laid.over ? laid.z1 : -PILE.h / 2],
    ]) {
      for (const dx of [-RIBBON.w / 2, RIBBON.w / 2]) {
        const q = toGlass(new THREE.Vector3(ex + dx, ey, ez));
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
      // EVERY CUE ON THE DRAWING THE THING HAPPENS, which is what it was not: one thud at drawing
      // five served the open and the close alike, and five is the middle of neither.
      //   the OPEN   the board meets the table on drawing 8 and the paper settles onto it on 9
      //   the CLOSE  the leaves sigh shut on 6 — a beat before the board, which is what they do —
      //              and the board comes down on 8, heavier, because it is landing on 40 mm of paper
      //              and not on a table
      //   a TURN     the leaf lands on 7 and flattens on 8: a whisper, a fifth of the lift's
      //   a RIFFLE   see `riffleAt`: a burst every six drawings at the gain the run's own speed
      //              asks for, so the sound follows the count instead of being fired once at a run
      //              that then goes on for another second and three quarters in silence
      if (motion.kind === 'swing' && motion.k === 8) sound('thud', { gain: 0.42 });
      if (motion.kind === 'swing' && motion.k === 9) sound('rustle', { gain: 0.2 });
      if (motion.kind === 'shut' && motion.k === 6) sound('rustle', { gain: 0.3 });
      if (motion.kind === 'shut' && motion.k === 8) sound('thud', { gain: 0.62 });
      if (motion.kind === 'turn' && motion.k === 7) sound('rustle', { gain: 0.16 });
      if (motion.kind === 'riffle' && motion.k < motion.drawings && motion.k % 6 === 0) {
        sound('riffle', { gain: 0.3 + 0.45 * riffleAt(motion).speed });
      }
      // …and the LAST of the twelve is drawn before the move is over, not handed to the rest state:
      // the settle is a drawing of the swing and is counted as one (`drew`).
      if (motion.kind === 'swing' && motion.k >= SWING.length) motion = null;
      else if (motion.kind === 'shut' && motion.k >= SHUT.length) return finishShut();
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
      if (motion?.kind !== 'swing' && motion?.kind !== 'shut') return null;
      const tbl = motion.kind === 'shut' ? SHUT : SWING;
      const a = tbl[Math.min(tbl.length - 1, motion.k)];
      return { kind: motion.kind, drawing: motion.k, drawings: tbl.length, angle: +((a * 180) / Math.PI).toFixed(1) };
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
    // WHAT IS MOVING ON THIS DRAWING, IN PIXELS. A pose table proves nothing about a picture: what a
    // proof has to be able to do is point at the glass and say «the leaf is HERE, and a flat plate at
    // the same angle would be THERE», and then go and look. So everything here is projected through
    // the very frame the screenshot is about to be taken in, and nothing is remembered from another.
    //   a TURN    the FOOT rail's fore-edge as the leaf actually is, and where the same corner would
    //             be if the leaf were a flat plate at the same angle — the bow, in px, and nothing
    //             else. The foot rail is used because it carries no lead, so the two differ by the
    //             CURL alone and the corner-first twist is not smuggled into the number.
    //   a SWING   the board's own box and the block's, which is what the landing is carried by from
    //             a plan: a rebound about the joint is under three pixels and the block's overshoot
    //             is sixteen.
    get moving() {
      if (!showing || !motion || !ctx.camera) return null;
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      const g = (pivot, x, y, z) => {
        ctx.camera.updateMatrixWorld();
        pivot.updateWorldMatrix(true, false);
        _v.set(x, y, z);
        pivot.localToWorld(_v).project(ctx.camera);
        return [+(((_v.x + 1) / 2) * W).toFixed(1), +(((1 - _v.y) / 2) * H).toFixed(1)];
      };
      const base = { kind: motion.kind, drawing: motion.k };
      if (motion.kind === 'turn') {
        const L = leaves3[0];
        const a = TURN[Math.min(TURN.length - 1, motion.k)];
        const bowed = g(L.pivot, L.tip[0], L.tip[1], LEAF.h / 2);
        const flat = g(L.pivot, LEAF.w, L.off, LEAF.h / 2);
        // …and the same two corners in the book's own metres, which is what the arithmetic in the
        // head of this file is about
        return {
          ...base,
          angle: +((a * 180) / Math.PI).toFixed(1),
          curl: +(L.curl * LEAF.w).toFixed(3), // what was DRAWN, after the room's own clamp
          lead: +((TURN_LEAD[Math.min(TURN_LEAD.length - 1, motion.k)] * 180) / Math.PI).toFixed(1),
          bowed,
          flat,
          px: +Math.hypot(bowed[0] - flat[0], bowed[1] - flat[1]).toFixed(1),
          leafBox: boxOf(L.pivot.children[0], true),
        };
      }
      if (motion.kind === 'swing' || motion.kind === 'shut') {
        const tbl = motion.kind === 'shut' ? SHUT : SWING;
        return {
          ...base,
          angle: +((tbl[Math.min(tbl.length - 1, motion.k)] * 180) / Math.PI).toFixed(1),
          board: boxOf(boardLeaf.pivot.children[0], true),
          block: boxOf(pileR),
        };
      }
      if (motion.kind === 'riffle') {
        const R = riffleAt(motion);
        return { ...base, drawings: motion.drawings, e: +R.e.toFixed(3), speed: +R.speed.toFixed(3), flips: +R.flips.toFixed(2) };
      }
      return base;
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
    // WHAT A CLICK AT A POINT WOULD FIND, without making one. For a proof that has to say why a
    // click on a line of the contents did what it did rather than guess: the leaf it lands on, the
    // page that leaf is carrying, the point in that page's own pixels, and the line it is inside.
    at: (px, py) => {
      const ev = { clientX: px, clientY: py };
      const leaf = castAt(ev, leafGroup);
      const on = leaf ? leaves3.findIndex((q) => q.pivot === leaf.object.parent) : -1;
      const p = pageHit(leaf);
      const line = p ? (faces.get(p.page)?.a?.lines ?? []).find((ln) => p.x >= ln.x && p.x <= ln.x + ln.w && p.y >= ln.y && p.y <= ln.y + ln.h) : null;
      return {
        leaf: on < 0 ? null : ['a', 'b', 'c', 'd', 'e'][on],
        visible: on < 0 ? null : leaves3[on].pivot.visible,
        faces: on < 0 ? null : leaves3[on].faces,
        page: p?.page ?? null,
        at: p ? [+p.x.toFixed(1), +p.y.toFixed(1)] : null,
        line: line ? { label: line.label, target: line.target, box: [line.x, line.y, line.w, line.h].map((n) => +n.toFixed(1)) } : null,
        lines: p ? (faces.get(p.page)?.a?.lines ?? []).length : 0,
      };
    },
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
