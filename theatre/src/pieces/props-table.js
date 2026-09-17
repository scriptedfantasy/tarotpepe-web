// props-table — THE READING TABLE, WHERE THE PALM STOOD.
//
// The user: "where we have the flower pot right now, we should have a little reading table with a
// chair and a book on the table. that book is TAROT by PEPE and the viewer basically moves to the
// table and looks down on the book and can look through it."
//
// So the potted palm and its stool come out of the room — they stood at (2.36, −0.30) against the
// stage-right plaster for three rounds — and what takes that stretch of floor is a small table with
// a chair pulled to it and his own book lying closed on top, face up.
//
// ---- WHERE IT STANDS, AND EVERY EDGE OF IT IS SOMEBODY ELSE'S ---------------------------------
// The stage-right wall runs x +2.60 with its skirting and dado 36 mm proud. This stretch of it is
// PLAIN PLASTER, which is the whole reason anything can stand here at all: the tall shuttered
// casement is upstage (z −1.95 .. −1.05, with its downstage shutter leaf folded flat to z −0.50)
// and the way-in door is downstage (z 0.90 .. 1.88).
//   z −0.50   THE SHUTTER LEAF's end, standing 36 mm proud of the plaster. The table's upstage edge
//             is at −0.62 … which is PAST it, so the table is set 0.14 m off the wall (x 2.42 at
//             its back) and its top passes in front of the leaf rather than into it. Measured: the
//             leaf reaches x 2.564 and the table's back edge is 2.42, 144 mm clear.
//   z  0.095  THE TERMINAL BOX's conduit, dropped down the wall at x 2.572 on three saddles. The
//             table's downstage edge is at 0.02, 75 mm short of it.
//   z  0.90   the way-in door's architrave, and the leaf that swings off it. Not close — 0.88 m —
//             and it is here because it is the next thing along the wall.
//   x  1.60   THE RUG's edge. The CHAIR is what comes nearest it: its front legs stand at 1.66,
//             60 mm of bare board short of the border, so nothing of this group is ever on the rug.
//   x  1.95   THE BACK DOOR's own leaf, hinged at the back wall and swinging into the room through
//             z −2.50 .. −1.60. The table is at z −0.62 .. 0.02, a metre downstage of the whole
//             sweep of it.
// So: a table top 0.54 deep by 0.64 along the wall at x 1.98 .. 2.52, z −0.62 .. 0.02, standing at
// 0.72 — which is 40 mm under the cloth on his own table, because this one is for reading at.
//
// ---- AND THE BOOK IS THE BOOK ------------------------------------------------------------------
// It is not a second copy of anything: clicking it opens the very sheet src/pieces/walk-book.js
// draws (TAROT BY PEPE, his own take with the deck's plates on the facing leaves), with the same
// turning and the same way out. What this file owns is WHERE it is opened from. The TAROT spine on
// the tall case stops being the trigger this round and goes back to being a book on a shelf.
import { signCaps, signWidth, signFold } from './titles-sign.js';
import { INK, PAPER, inkLine, inkMaterial, canvasTexture, makeCanvas } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const TABLE = {
  x0: 1.98,
  x1: 2.52,
  z0: -0.62,
  z1: 0.02,
  top: 0.72,
  thick: 0.028,
  chair: { x0: 1.66, x1: 2.06, z0: -0.52, z1: -0.08, seat: 0.45, back: 0.92 },
  // THE BOOK, LYING FACE UP IN THE MIDDLE OF THE TABLE AND TURNED TOWARD THE CHAIR. 0.17 x 0.24 of
  // cover and 45 mm of block, which is this book.
  //
  // AND THE QUARTER TURN IS THE WHOLE OF IT. The user, on seeing it open: "i think the book should
  // be oriented towards the chair, not the original position of the user." The chair stands at
  // x 1.66 .. 2.06 — off the table's SHORT end, on its own centre line — so somebody sitting in it
  // faces +x, and a book laid out for them has its foot toward them at −x and its head away at +x.
  // The book's own head is its local −z, so the turn is −90 degrees about y and the few degrees off
  // square go on top of that, the way a book somebody put down is. Everything else in this round
  // follows from this one number: walk-book.js reads the open book's pose off this mesh (`station`)
  // and slides the block along the book's own long axis, and camera-shots.js composes `reading`,
  // `book`, `book-recto` and `book-verso` on the book's own axes with `up` its head — so all four
  // frames turn with it and nothing had to be re-solved by hand.
  book: { w: 0.17, h: 0.24, t: 0.045, yaw: -Math.PI / 2 - 0.09 },
};
TABLE.cx = (TABLE.x0 + TABLE.x1) / 2;
TABLE.cz = (TABLE.z0 + TABLE.z1) / 2;

// THE COVER, lettered in the signwriter's hand — the same case the notice, the book's own pages and
// the shop's board are set in. Boards, a blind rule inset from the edge, the title across the middle
// and his name under it, which is what the spine on the tall case says and what is on the title page.
function coverTexture(w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const nib = mulberry32(0x9a17b);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  // THE CLOTH OF THE BOARDS, and it is almost nothing on purpose. The first cut laid 260 strokes
  // across the cover at 0.16 of the ink to suggest a bookbinder's cloth; at the plan shot the cover
  // is 280 px tall and those strokes came back as a hatched mass with the title fighting through it.
  // Twenty-eight short marks at 0.08 is a tooth; anything more is a texture, and a texture on a
  // drawn object in this room is the one thing the pen never does.
  g.save();
  g.globalAlpha = 0.08;
  for (let i = 0; i < 28; i++) {
    const y = h * 0.12 + nib() * h * 0.76;
    const x = w * 0.16 + nib() * w * 0.5;
    inkLine(g, x, y, x + w * 0.1 + nib() * w * 0.12, y + (nib() - 0.5) * 2, { width: 1, wobble: 0.4, rng: nib, color: INK });
  }
  g.restore();
  const inset = Math.round(w * 0.1);
  const rule = (x1, y1, x2, y2) => inkLine(g, x1, y1, x2, y2, { width: Math.max(1.4, w / 150), wobble: 0.9, rng: nib, color: INK, alpha: 0.9 });
  rule(inset, inset, w - inset, inset);
  rule(w - inset, inset, w - inset, h - inset);
  rule(w - inset, h - inset, inset, h - inset);
  rule(inset, h - inset, inset, inset);
  const cap = Math.round(w * 0.17);
  signCaps(g, signFold('TAROT'), w / 2, h * 0.42, { capH: cap, tracking: 0.22, pen: Math.max(2, cap * 0.13), seed: 61 });
  const sub = Math.round(w * 0.085);
  signCaps(g, signFold('BY PEPE'), w / 2, h * 0.58, { capH: sub, tracking: 0.2, pen: Math.max(1.6, sub * 0.14), seed: 62 });
  void signWidth;
  return c;
}

// THE TOP ITSELF, DRAWN. The user, looking down at the open book: "i want to see some table texture
// on the background". They are looking at a plan from 1.53 m up composed on a 340 mm spread, and at
// 1280x800 that frame is table from edge to edge — every pixel behind the page was bare paper.
//
// So: four boards running the length of the table with the seams between them, a butt joint in two
// of them, and one broken stroke of grain here and there. It is the floor's own grammar one storey
// smaller (src/pieces/room-textures.js, floorTexture) and it is drawn at the SCALE THE READING SHOT
// GIVES IT rather than at the floor's:
//
//   the glass       the closed book is 0.17 m of cover measuring 325 px at 1280x800 and 295 at
//                   390x844 — 1912 px per metre and 1735 px per metre
//   so the canvas   1900 px per metre, which is 1026 x 1216 for a top 0.54 x 0.64, and a stroke
//                   drawn W px wide on it lands about W px on a laptop's glass and 0.91 W on a
//                   phone's
//   so the pen      2 px for a seam, 1.9 for a joint, 1.8 for grain — and those are not the numbers
//                   the arithmetic first gave, which were 2.4 and 2.2. What a stroke MEASURES on
//                   the glass is wider than what it was drawn at, because a wobbled line is laid
//                   down with an anti-aliased skirt either side of it and the pass darkens that
//                   skirt: at 2.4 the seams came back 2.69 px mean across 150 crossings of the
//                   table at 1280x800, which is over the 2 .. 2.4 px band every other drawn line in
//                   this room is held to. At 2 they measure 2.31 px mean at 1280x800 and 2.03 at
//                   390x844 — both inside it. The number that matters is the one off the glass.
//
// AND IT IS STRUCK ONCE. The wobble in these strokes is the pen's own and is baked into the map:
// the boil in this film is a thing the pen does to a drawing that is RE-struck on the twelve, and a
// table top is not re-struck any more than the floorboards or the wallpaper are. What moves over it
// is the hatch and the contour the ink pass puts on the object itself, which is where the room's
// own life comes from and is why a static map under it never reads as a photograph.
const TOP_PPM = 1900;
function topTexture() {
  const T = TABLE;
  const w = Math.round((T.x1 - T.x0) * TOP_PPM), h = Math.round((T.z1 - T.z0) * TOP_PPM);
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const nib = mulberry32(0x7ab1e);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  // FIVE BOARDS DOWN THE TABLE'S LENGTH, 108 mm each, no two seams quite where the arithmetic puts
  // them. A seam is one stroke that wanders a board's own thickness over the length of the table.
  // Five and not four because of what the reading shot sees: that frame is 280 mm ACROSS the boards,
  // so 135 mm boards put two seams in the picture and 108 mm ones put three — and two lines behind
  // an open book is a top somebody has cracked, where three is a top somebody has made.
  const boards = 5;
  const seams = [];
  for (let i = 1; i < boards; i++) seams.push((w * i) / boards + (nib() - 0.5) * w * 0.02);
  for (const x of seams) {
    const r = mulberry32(0x5ea0 + Math.round(x));
    inkLine(g, x, -6, x + (r() - 0.5) * 6, h + 6, { width: 2, wobble: 1.6, rng: r, color: INK, alpha: 0.55, segments: 24 });
  }
  // A JOINT OR TWO: a board is not the length of a room, so two of the four are made of two lengths
  // butted together, and the joint is a short stroke across that board and nothing else.
  const edges = [0, ...seams, w];
  for (const i of [0, 2]) {
    const x0 = edges[i], x1 = edges[i + 1];
    const y = h * (0.28 + nib() * 0.44);
    const r = mulberry32(0x10117 + i);
    inkLine(g, x0 + 2, y, x1 - 2, y + (r() - 0.5) * 5, { width: 1.9, wobble: 1.2, rng: r, color: INK, alpha: 0.5, segments: 6 });
  }
  // GRAIN: one broken stroke down part of a board, on rather more than half of them, at a tenth of
  // the ink. Any more than this and a top drawn in a room like this reads as a texture rather than
  // as a thing, which is the one thing the pen never does.
  for (let i = 0; i < boards; i++) {
    const x0 = edges[i], x1 = edges[i + 1];
    for (let k = 0; k < (nib() < 0.75 ? 2 : 1); k++) {
      const x = x0 + (0.22 + nib() * 0.56) * (x1 - x0);
      const y0 = h * nib() * 0.5, y1 = y0 + h * (0.3 + nib() * 0.45);
      const r = mulberry32(0x9a1e + i * 31 + k);
      inkLine(g, x, y0, x + (r() - 0.5) * 8, y1, { width: 1.8, wobble: 2, rng: r, color: INK, alpha: 0.12, segments: 10 });
    }
  }
  return c;
}

export function buildTable(ctx, { group, switches, O, M }) {
  const THREE = ctx.THREE;
  const T = TABLE;
  const root = new THREE.Group();
  root.name = 'reading-table';
  group.add(root);
  const box = (w, h, d, mat, x, y, z, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    if (name) m.name = name;
    root.add(m);
    return m;
  };

  // ---- 1. THE TABLE. A top, an apron under it and four square legs ------------------------------
  // The top's UPPER FACE is the drawn one and the other five are the paper they always were: a
  // BoxGeometry's groups run [+x, −x, +y, −y, +z, −z], so the boards go on index 2 and the 28 mm
  // edge the visitor sees from the chair keeps the plain tone it had. Same hatch as M.paper on all
  // six, so nothing under the book changes tone — what changes is that there is something there.
  const tw = T.x1 - T.x0, td = T.z1 - T.z0;
  const topFaces = (() => {
    const plain = M.paper;
    const drawn = inkMaterial({ map: canvasTexture(topTexture()), hatch: 0.4 });
    return [plain, plain, drawn, plain, plain, plain];
  })();
  box(tw, T.thick, td, topFaces, T.cx, T.top - T.thick / 2, T.cz, 'table-top');
  box(tw - 0.08, 0.05, td - 0.08, M.wood, T.cx, T.top - T.thick - 0.025, T.cz, 'table-apron');
  for (const ox of [-1, 1]) for (const oz of [-1, 1]) {
    const lx = T.cx + ox * (tw / 2 - 0.05), lz = T.cz + oz * (td / 2 - 0.05);
    box(0.034, T.top - T.thick - 0.05, 0.034, M.solid, lx, (T.top - T.thick - 0.05) / 2, lz, 'table-leg');
  }

  // ---- 2. THE CHAIR, pulled to it. A seat, four legs and a plain ladder back ---------------------
  const C = T.chair;
  const cw = C.x1 - C.x0, cd = C.z1 - C.z0, ccx = (C.x0 + C.x1) / 2, ccz = (C.z0 + C.z1) / 2;
  box(cw, 0.026, cd, M.paper, ccx, C.seat - 0.013, ccz, 'chair-seat');
  for (const ox of [-1, 1]) for (const oz of [-1, 1]) {
    const lx = ccx + ox * (cw / 2 - 0.03), lz = ccz + oz * (cd / 2 - 0.03);
    box(0.028, C.seat - 0.026, 0.028, M.solid, lx, (C.seat - 0.026) / 2, lz, 'chair-leg');
  }
  // the two back stiles and three rails, standing off the seat's own FRONT edge — which is the edge
  // away from the table, so the chair reads as pulled up to it rather than pushed under it
  for (const oz of [-1, 1]) {
    box(0.028, C.back - C.seat, 0.028, M.solid, C.x0 + 0.014, (C.seat + C.back) / 2, ccz + oz * (cd / 2 - 0.03), 'chair-stile');
  }
  for (const y of [C.seat + 0.13, C.seat + 0.28, C.back - 0.03]) {
    box(0.022, 0.035, cd - 0.05, M.paper, C.x0 + 0.014, y, ccz, 'chair-rail');
  }

  // ---- 3. THE BOOK, lying closed and face up ----------------------------------------------------
  const B = T.book;
  // THE COVER TAKES NO WASH AND NO SECOND CONTOUR. It is drawn already — the boards' tooth, the
  // blind rule and the lettering are all in the map — and the plan shot looks straight DOWN at it,
  // away from the pendant, which is the worst case the ink pass has: at hatch 0.25 the first cut of
  // this came back as a black slab with TAROT just legible through it. hatch 0.04 is the notice's
  // own answer to the same question (help.js's ? card) and lineWeight 0 stops the pass drawing a
  // second edge a hair beside the one in the drawing.
  const cover = inkMaterial({ map: canvasTexture(coverTexture(320, 452)), hatch: 0.04, lineWeight: 0 });
  const bookMesh = new THREE.Mesh(
    new THREE.BoxGeometry(B.w, B.t, B.h),
    // +y is the cover; the block of leaves is the pages' own paper; the spine is the dark edge
    [M.pages, M.pages, cover, M.solid, M.solid, M.pages],
  );
  bookMesh.name = 'table-book';
  bookMesh.castShadow = true;
  bookMesh.receiveShadow = true;
  bookMesh.position.set(T.cx + 0.01, T.top + B.t / 2, T.cz - 0.01);
  bookMesh.rotation.y = B.yaw;
  root.add(bookMesh);

  // ---- 4. THE SWITCH, and it is the BOOK ---------------------------------------------------------
  // The table itself is a PLACE (walk.js) and the book on it is a switch, which is the fireplace's
  // own arrangement: the big thing walks you there, the small thing on it does its own work. The
  // book's box is subtracted from the table's in walk.js so the two never both answer a point.
  function bookBox() {
    if (!ctx.camera) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const v = new THREE.Vector3();
    const xs = [], ys = [];
    ctx.camera.updateMatrixWorld();
    bookMesh.updateWorldMatrix(true, false);
    for (const x of [-B.w / 2, B.w / 2]) for (const y of [-B.t / 2, B.t / 2]) for (const z of [-B.h / 2, B.h / 2]) {
      v.set(x, y, z);
      bookMesh.localToWorld(v);
      v.applyMatrix4(ctx.camera.matrixWorldInverse);
      if (v.z > -ctx.camera.near) return null;
      v.set(x, y, z);
      bookMesh.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  function tapBox() {
    const b = bookBox();
    if (!b) return null;
    const w = Math.max(b.w, 44), h = Math.max(b.h, 44);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  const atTable = () => ctx.pieces?.walk?.at === 'table';
  const books = () => ctx.pieces?.walk?.books ?? null;
  switches?.add?.({
    name: 'table-book',
    object: () => bookMesh,
    tapBox,
    // it answers only from the table's own shot and only while nothing is already open. From the
    // chair across the room it is 20 px of paper on a table by a window, and a book opened from
    // over there would stand over a room the visitor is not in.
    hit: (px, py) => {
      const b = tapBox();
      return !!b && atTable() && !books()?.showing && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
    },
    enabled: () => atTable() && !books()?.showing,
    onDown: () => books()?.open?.('TAROT'),
  });

  return {
    group: root,
    box: { x0: T.x0, x1: T.x1, y0: 0, y1: T.top, z0: T.z0, z1: T.z1 },
    chair: { ...C },
    book: { ...B, at: [bookMesh.position.x, bookMesh.position.y, bookMesh.position.z] },
    mesh: bookMesh,
    hitBox: bookBox,
    tapBox,
    open: () => books()?.open?.('TAROT') ?? false,
    setState() {},
  };
}
