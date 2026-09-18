// PIECE: props — set dressing. A crowded, ordered parlour, but one that BREATHES: the film's rooms
// are dense along a low band and bare above it, and always keep one big empty area. So the back wall
// carries a low run of furniture — bookcase | the operator's position | bookcase, none of it above
// waist height — with bare plaster over it and either side of Pepe's head, and ONE row of pictures
// round the clock under the rail. The PTT's spares press beside the door (four boards, three vessels
// a board, one bay left to a single carboy), the test table on the plaster stage left with a headset
// and three bottles on it, a potted palm, hand-lettered signs, a rug, a doormat, a cat on the right
// bookcase, the three-petal pendant of the kitchen frame.
// THE ONE THING ABOVE WAIST HEIGHT ON THE BACK WALL IS THE TALL CASE, stage left, and the user
// asked for it by name — "can we add a bookshelf instead of the bare wall". It runs the whole
// height of the stretch the window came out of, from a plinth on the boards to the head line of the
// room's openings, and it carries the books, the radio and the VIN bottle. It is what balances the
// door and the press at the other end; the plaster either side of Pepe's head is as bare as it ever
// was. It stood on four legs over the radiator for two rounds and the user, looking at that foot:
// "why is the bottom part of the book shelf black? it should be the same as above. and it should be
// filled with stuff." So the legs and the toe rail are gone, the radiator with them, and the case is
// a full-height piece of furniture with five bays in it — see THE TALL CASE below.
// TWO OF THESE WORK. The radio on the case plays (round 8) and the cat is a lamp (round 9): click
// it and the black mass goes white. Both are at the foot of this file, under THE SWITCHES, THE
// RADIO and THE CAT. Neither announces itself — the cursor over the object is the whole affordance.
// ROUND 6 — THE ROOM IS THE TOWN'S OLD MANUAL TELEPHONE EXCHANGE (PROPS.md). It reads in three
// layers: the flat that was here (the paper, the cornice, the doily), the exchange (the position,
// the press, the jack field, the diagram), and his own nine or ten things (the rug, the table, the
// deck, the globe, the vase, the cat). Layer 3 is the smallest and it is scattered through the
// other two, which is the joke the set is built on: a vase of dried flowers on a dead switchboard.
// Every prop is paper-white geometry or a solid-ink mass with its pattern left in paper; the ink pass
// draws the lines. The rule the round-1 critic set: from across the room every prop must show ONE
// solid black area and ONE bare white area — a black plinth under a white case, a black grille beside
// a paper dial, a black bezel round a paper clock face, a black frond among paper ones.
// Composed frontal and symmetrical for the 'wide' and 'home' shots; nothing in front of Pepe or the
// table, and nothing at the height of his shoulders within a hand's width of them.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import * as O from './props-objects.js';
import { eggFuse } from './egg-fuse.js';
import { buildVortex } from './egg-vortex.js';
import { buildWine } from './egg-wine.js';
import { eggGlobe } from './egg-globe.js';
import { eggVase } from './egg-vase.js';

import { eggRain, rainState } from './egg-rain.js';

import { buildFine } from './egg-fine.js';
import { eggDark } from './egg-dark.js';


import { eggDroste } from './egg-droste.js';
import { buildPiano } from './props-piano.js';
import { buildTable } from './props-table.js';

import { eggPeep } from './egg-peep.js';

import { buildKonami } from './egg-konami.js';
// THE DECK ITSELF, laid out face up on the cloth (src/pieces/egg-deck.js).
import { eggDeck } from './egg-deck.js';
// THE CROSS on the frieze over the door, and the cellar under the floor (src/pieces/egg-cross.js,
// src/pieces/egg-cellar.js).
import { eggCross } from './egg-cross.js';

export const meta = {
  name: 'props',
  judge: { shot: 'wide', states: ['default', 'cat-lit', 'fuse-out', 'vortex-mid', 'wine-drunk', 'globe-spinning', 'vase-empty', 'vase-leaf', 'rain', 'fine-burning', 'dark', 'peep-fallen', 'konami-house', 'deck-out', 'cross-open'] },
  files: ['src/pieces/props.js', 'src/pieces/props-textures.js', 'src/pieces/props-objects.js'],
};

export async function build(ctx) {
  const { width: W, depth: D, height: H } = ctx.layout.room;
  const rng = mulberry32(4242);
  const g = new THREE.Group();
  g.name = 'props';
  const M = O.materials();

  // The room's openings (from the room piece when it is there; its numbers otherwise). The back
  // wall's window is gone — room.js no longer publishes one — so the only opening on this wall is
  // the door. The window's own rectangle does not survive here any more either: it survived one
  // round as CART, because the bar cart was centred on it, and the cart has since been taken out of
  // the room. What stands on that stretch now is the tall case, and the case is solved from the
  // floor, the corner and the clock rather than from a window nobody can see (see THE TALL CASE
  // below). The radiator that was under it has gone out of the room with the case's legs.
  const room = ctx.pieces.room ?? {};
  const door = room.door ?? { x0: 1.05, x1: 1.95, y0: 0, y1: 2.45, top: 2.12 };
  const railY = room.bands?.rail?.[0] ?? 2.6;

  let signMesh = null, signPivot = null; // the wall board over Pepe's head; published below
  let radioObj = null; // the set on the tall case, and the cat on the right-hand bookcase: the two
  let catObj = null; //  things the visitor may work. Both are wired up at the foot of this file.
  let wineObj = null; // the VIN bottle, on the case's bottom board; src/pieces/egg-wine.js pours it
  let globeObj = null; // the globe on the left bookcase; egg-globe.js turns it
  let vaseObj = null; //  the vase of dried stems on the operator's position; egg-vase.js wilts it

  const WALL = -D / 2; // back wall plane
  const FLUSH = WALL + 0.04; // furniture backs sit just in front of the skirting
  const HOOK_Y = railY - 0.02;

  // ---- THE BACK WALL, AND THE PICTURE HAS COME OFF IT ------------------------------------------
  // The user: "we should keep the clock centered on the wall over pepe - the room image instead
  // should be in a photo frame where the cat now stands. you can put the cat in the book shelf on
  // the left."
  //
  // So ONE thing hangs on this wall now and it is the CLOCK, dead centre over him, under the shop
  // board, where a clock in a room like this hangs. The PICTURE OF THIS ROOM is not a picture on a
  // wall any more: it is a small framed photograph STANDING on the top of the right-hand low
  // bookcase, on a strut, where the cat sat. And the cat has gone across the room into the tall
  // case (see THE CAT at the foot of this file).
  //
  // WHAT THAT COSTS AND WHAT IT BUYS. The picture was 0.805 x 0.519 on the plaster; on a bookcase
  // top it is 0.259 x 0.178, a third of the width, because a bookcase top is 0.37 m wide and a
  // photograph standing on one is the size of a photograph. The zoom is untouched by that - it is
  // solved from the sheet's own half-height (camera.js, zoomSpan) and simply ends nearer: the walk
  // used to stop 0.886 m off the wall and now stops 0.250 m off a photograph, which is a hand's
  // breadth. What it buys is the wall: the clock is where the user wants it and the plaster either
  // side of his head is as bare as the film asks for.
  //
  // ---- THE CLOCK -------------------------------------------------------------------------------
  //   x  0      dead centre, which is the room's own axis, the sign board's centre and the
  //             pendant's. It hung here for every round before the window came out and it is back.
  //   y  2.06   unchanged, and it is the number the dial's 0.185 radius was chosen against: the
  //             clock runs 1.875 to 2.245.
  //   NO CORDS, AND THAT IS A MEASUREMENT AND NOT A STYLE. Every other frame on this wall goes back
  //             to the picture rail on a pair of them and this clock did too while it hung out at
  //             x -0.705, clear of the shop board. The board is 1.32 m wide on a pivot at 2.595 and
  //             its sheet covers y 2.2649..2.5950 across x +/-0.66, so a cord from the dial's top at
  //             2.245 to the hook line at 2.58 is 20 mm of visible cord and 315 mm of cord BEHIND
  //             the board. That is not a drawing. It hangs on a nail nobody can see, which is what
  //             the picture of this room did on this same axis before it came off the wall.
  //
  // ---- THE PHOTOGRAPH, ON THE BOOKCASE TOP -----------------------------------------------------
  // It is UPRIGHT AND SQUARE TO THE BACK WALL, and that is not a preference: camera.js's zoom walks
  // up the sheet's own normal and its end pose assumes that normal is the room's +z (THE SCROLL).
  // Turn the frame five degrees for charm and the hand-over at the top of a wrap stops being exact.
  //
  // WHERE ITS FOUR EDGES ARE, and three of them are somebody else's (tools/_droste-where.mjs):
  //   x  0.680  THE BOOKCASE'S OWN LEFT SIDE. The case stands x 0.68..1.02 with a top board that
  //             oversails to 0.665..1.035; the frame's left edge is pinned to the carcase, so the
  //             thing stands ON the case and not over the edge of it.
  //   x  0.954  WHAT A PHONE CAN SEE. At 390x844 the resting plates stop at x 0.9944 on the wall
  //             plane and at 0.9743 at this frame's own depth - the frame is 140 mm nearer the lens
  //             than the plaster, and a nearer thing runs off the side of a picture sooner. The
  //             brief for this change is that a phone must see the frame WHOLE, so the right edge is
  //             that line less 20 mm. The case's own right side, at 1.02, is 46 mm outside a phone's
  //             frame and could never have held it.
  //   y  1.020  the bookcase's top board, which is the floor this thing stands on.
  //   z -2.360  the sheet's plane: 100 mm forward of the case's lining at -2.46 and 180 mm behind
  //             its front edge, which is where a photograph on a shelf stands - back from the edge,
  //             with its strut behind it.
  // 0.274 m of outer width is what is left between the two x lines, and the height follows the
  // sheet's aspect, which is the window's business exactly as it was on the wall.
  const ROW = {
    clockX: 0, // the user's own instruction: "keep the clock centered on the wall over pepe"
    clockY: 2.06,
    clockR: 0.185,
    // the right-hand low bookcase, which is where the cat sat
    shelfTop: 1.02, // its top board
    shelfZ: -2.36, // the sheet's plane, set back from the front edge
    shelfL: 0.68, // the carcase's left side: the frame's own left edge
    shelfR: 0.954, // …and a phone's frame at this depth, less 20 mm
    rim: 0.022,
    corner: 0.0077, // how far a corner block stands proud of the moulding's outer edge
    phoneRight: 0.9743, // where a 390x844 resting plate stops at z -2.36; measured, not assumed
    // THE SHAPE OF THE SHEET ON A PORTRAIT WINDOW, and it is not the window's. The user, when this
    // was still on the wall: "for mobile, i think the picture on the wall should use the same width
    // as desktop from afar, it can then just basically go to the mobile cutout as it zooms in
    // closer." Cut to a phone's own 0.46:1 the picture is a letterbox slot on its end. So upright
    // windows get a LANDSCAPE picture at this ratio, which is 1280x800: the reference plate the
    // rest of this file's numbers were measured on, and the shape a photograph actually is.
    // What it SHOWS is still the phone's own frame - the picture's plate is drawn from the resting
    // camera's pose at the same vertical field and the same lens rise, just wider, so the phone's
    // live frame is the centre crop of it. ink.js and camera.js carry that.
    landscape: 1.6,
  };
  // The photograph, solved for one window. Where it stands is fixed; what this returns is its SIZE,
  // which is still the window's business, and the clock's x, which no longer depends on it at all.
  function layRow(aspect, buf = null) {
    const A = Math.max(0.05, aspect);
    // AN UPRIGHT WINDOW GETS A LANDSCAPE PICTURE; a landscape one gets its own shape. The break is
    // at square, which is where a picture cut to the window stops being a picture and starts being
    // a slot - see `landscape` above.
    //
    // …AND ITS SHAPE IS SNAPPED TO THE DRAWING BUFFER'S OWN GRID, which is the difference between a
    // seamless wrap and a blurred one. The phone's frame is the CENTRE CROP of the picture's plate,
    // so at the top of a zoom the canvas reads a window of the plate's texels - and it only reads
    // them whole if the plate is a whole number of texels wide AND the margin either side is a
    // whole number too. A flat 1.6 gives neither. So the ratio is 1.6 rounded to the buffer and
    // nudged by one more texel when that would leave an odd margin. It is 1.6 to four decimal
    // places; what it buys is measured in tools/_droste-proof.mjs.
    let picA = A >= 1 ? A : ROW.landscape;
    if (A < 1 && buf && buf.w > 0 && buf.h > 0) {
      let n = Math.round(buf.h * ROW.landscape);
      if ((n - Math.round(buf.w)) % 2 !== 0) n += 1;
      picA = n / buf.h;
    }
    const pad = ROW.corner * 2;
    // THE WIDTH IS THE BINDING DIMENSION HERE, which is the other way round from the wall. On the
    // plaster the picture hung between the shop board and Pepe's own shadow and its HEIGHT was what
    // ran out first; on a bookcase top there is a metre and a half of bare plaster above it and
    // 0.274 m of shelf, so the width is the number and the height follows the aspect.
    const outerW = ROW.shelfR - ROW.shelfL;
    const sheetW = outerW - ROW.rim * 2 - pad;
    const sheetH = sheetW / picA;
    const outerH = sheetH + ROW.rim * 2 + pad;
    const x = (ROW.shelfL + ROW.shelfR) / 2;
    return {
      clockX: ROW.clockX,
      gap: 0, // nothing hangs beside the clock any more
      phoneMargin: ROW.phoneRight - ROW.shelfR, // what is left outside the frame on a phone
      frame: {
        x,
        y: ROW.shelfTop + outerH / 2, // it STANDS on the board: the foot is the board
        w: sheetW + ROW.rim * 2,
        h: sheetH + ROW.rim * 2,
      },
      sheet: { w: sheetW, h: sheetH },
      picAspect: picA,
      outer: outerW,
      outerH,
      foot: ROW.shelfTop,
    };
  }
  // the drawing buffer, in device pixels, which is what the picture's shape is snapped to
  const rowBuffer = () => {
    const v = new THREE.Vector2();
    ctx.renderer?.getDrawingBufferSize?.(v);
    if (v.x > 0 && v.y > 0) return { w: v.x, h: v.y };
    const dpr = ctx.renderer?.getPixelRatio?.() ?? 1;
    return { w: (ctx.size?.w || window.innerWidth || 1600) * dpr, h: (ctx.size?.h || window.innerHeight || 900) * dpr };
  };
  const rowAspect = () => {
    const b = rowBuffer();
    return b.w / b.h;
  };
  let clockObj = null, clockCords = null;

  // ---- floor ------------------------------------------------------------------------------------
  // ROUND 5, THE PLAIN FIELD. The rug's far edge, its width and every mark printed on it are where
  // round 4 left them; what changed is where it STOPS on the visitor's side. It used to end at
  // z = 1.1, which put its scroll border and fringe between the table's rim (0.62) and the line a
  // tabletop plate's bottom edge reaches on the FLOOR — measured at z 0.98 on a 390x760 phone,
  // 1.03 at 360x800, 1.07 at 320x800 — so the border printed across the bottom corners of every
  // plan view of the cloth. The near edge is now at 1.66 and the border rides out with it: the
  // first printed mark on the visitor's side is at z 1.222, which is 60 cm of plain ground outside
  // the rim and 15 cm of margin past the deepest plate any phone asks for.
  // What that costs the frontal shots: the `wide` (its bottom edge crosses the boards at z 2.24)
  // still holds the whole rug, fringe and a good stretch of floorboards under it. The `home` frame
  // crosses at 1.629 — in the rug's outer plain margin — so the conversation shot is closed at the
  // bottom by the rug's own solid band with nothing bisected but bare ground. Both measured, both
  // stable across every landscape window (camera-shots.js pins them with `floorZ`).
  const RUG = { w: 3.2, near: 1.66, far: -1.5 };
  const rug = O.rug({ w: RUG.w, d: RUG.near - RUG.far });
  rug.position.set(0, 0, (RUG.near + RUG.far) / 2);
  g.add(rug);

  // ---- the back wall's furniture row: a LOW band — bookcase | position | bookcase -----------------
  // Round 3: the cases came down from 1.45 m to 1.02 m and moved outboard, so the wall beside
  // Pepe's shoulders and either side of his head is bare plaster, the way the film always keeps one
  // big empty area. Half as many books, twice the spine, black and pale alternating; and the lining
  // board hardly takes tone, so the spines read as silhouettes instead of strokes lost in hatch.
  // Round 6: what stands between them is no longer a chest. This room is the town's old manual
  // telephone exchange and that is the operator's position, cut down to the chest's own volume —
  // 1.04 x 0.82 x 0.38, same place, same footprint, same top at 0.82. Not one thing standing on it
  // moved: the doily and the lamp at −0.44, the two flat books at −0.20, the candlestick at 0.20,
  // the vase at 0.45. That is the point of the move and not a saving: he uses a dead switchboard
  // as a sideboard, and `lamps.table` is published from the same numbers it always was.
  const chestW = 1.04, caseW = 0.34, caseH = 1.02;
  const CASE_BOARDS = [0.15, 0.57];
  const chest = O.operatorPosition({ w: chestW, h: 0.82, d: 0.38 });
  chest.position.set(0, 0, FLUSH + 0.19);
  g.add(chest);
  {
    const top = 0.82;
    // the lamp and the vase sit at the ENDS of the position, clear of Pepe's head
    const d = O.doily(0.13);
    d.position.set(-0.44, top + 0.002, chest.position.z + 0.02);
    g.add(d);
    const lamp = O.mushroomLamp();
    lamp.name = 'mushroom-lamp'; // the fire hung off it for two rounds and the dark hangs off it now
    lamp.position.set(-0.44, top, chest.position.z + 0.02);
    g.add(lamp);
    let y = top;
    for (let i = 0; i < 2; i++) {
      const t = 0.03 - i * 0.005;
      const b = O.book({ w: 0.22 - i * 0.02, h: 0.28 - i * 0.03, t, flat: true, seed: 90 + i, title: ['GRAND ALBUM', 'LE TAROT'][i], dark: i === 1 });
      b.position.set(-0.2 + i * 0.012, y + t / 2, chest.position.z + 0.02);
      b.rotation.y = (i - 0.5) * 0.1;
      g.add(b);
      y += t;
    }
    const cs = O.candleStick();
    cs.position.set(0.2, top, chest.position.z + 0.06);
    g.add(cs);
    const v = O.vase({ rng, spread: 0.78 });
    v.position.set(0.45, top, chest.position.z + 0.02);
    v.name = 'vase';
    g.add(v);
    vaseObj = v; // egg-vase.js reads its seven stems back off this drawing
  }
  for (const side of [-1, 1]) {
    const bc = O.shelfUnit({ w: caseW, h: caseH, d: 0.28, boards: CASE_BOARDS, plinth: 0.07, back: true });
    bc.position.set(side * 0.85, 0, FLUSH + 0.14);
    g.add(bc);
    const { x0, x1, z0 } = bc.userData.inner;
    for (const y of CASE_BOARDS) bc.add(O.bookRow({ x0, x1, y, z: z0, rng, maxH: 0.3, depth: 0.25, chunky: true }));
    if (side < 0) {
      const gl = O.globe();
      gl.position.set(0, caseH, 0.02);
      bc.add(gl);
      globeObj = gl;
    }
    // …AND THE RIGHT-HAND CASE'S TOP IS EMPTY OF ANIMALS. The cat sat on it for every round since
    // round 9 and the user has moved it: "the room image instead should be in a photo frame where
    // the cat now stands. you can put the cat in the book shelf on the left." So what stands on this
    // board now is the PHOTOGRAPH (the slot at the foot of this file), and the cat is in the tall
    // case on the stage-left wall, in the bay at 0.520 — see THE CAT'S BAY there.
  }

  // ---- stage left on the back wall: the tall case, and nothing in front of it --------------------
  // THE CURTAINS ARE GONE. Two 0.19 m panels hung inside the architrave from a rod at 2.50 and
  // dropped to the sill at 1.06; there is no architrave, no rod and no sill, so there is nothing for
  // cloth to hang on and it would have been a pair of drapes nailed to bare plaster. (`curtainSet`
  // and `curtainPanel` are still in props-objects.js, and the stage-right window has never had any.)
  //
  // AND THE BAR CART IS GONE TOO. The user, one round after the case went up behind it: "its a bit
  // empty the bookshelf, fill it, and also remove the thing in front of the bookshelf. you can place
  // the items on it in it." So the trolley is off the floor and everything that stood on it — the
  // headset, MARC, the PILE jar, the soda siphon, the four newspapers — is on the case's boards
  // among the books, with the VIN bottle and the radio that went up there first. `barCart` stays in
  // props-objects.js, unbuilt, the way `curtainSet`, `floorLamp` and `hatStand` do.
  //
  // AND THE RADIATOR IS GONE, WITH THE LEGS THAT STOOD OVER IT. For two rounds the case stood on
  // four 40 mm posts from the dado to the floor with a toe rail between the front pair, and the
  // iron — nine fat columns at y 0.164..0.814 (room.js) — stood under it between them. The user,
  // looking at that foot: "why is the bottom part of the book shelf black? it should be the same as
  // above. and it should be filled with stuff." They are right about what it was. Two black posts, a
  // black rail and a black radiator between them is 0.9 m of solid ink under 1.5 m of drawing, and
  // from the home plate it read as a plinth the height of a man rather than as a case standing over
  // a heater. So the legs and the rail have come out and the carcase has come DOWN TO THE FLOOR on
  // the 70 mm plinth every other case in this room stands on, and the radiator has come out of the
  // room with them: there is no wall left for it (the case's back is flush with the skirting) and a
  // radiator drawn behind a lined case back is a radiator nobody sees. room.js no longer builds one
  // and Pepe no longer answers for one (mind-room.js).
  //
  // WHAT IS ON THIS STRETCH NOW: the case, floor to head line, and the clock on the plaster to the
  // right of it.

  // ---- THE TALL CASE, on the plaster the window left ---------------------------------------------
  // The user, looking at the stretch the window came out of: "can we add a bookshelf instead of the
  // bare wall. you can place the radio and the bottle of wine in the shelf." So there is a case on
  // it now, and the two things a visitor can work in this corner stand IN it instead of on the cart.
  //
  // WHERE IT MAY STAND, and every edge of it is something else's edge (tools/_shelf-where.mjs
  // prints the whole stretch; these are its numbers):
  //   x -1.035  THE LEFT LOW BOOKCASE's own top board. That is the hard edge on the right: the case
  //             stops at -1.06, which leaves 25 mm of daylight between two runs of shelving. Any
  //             further right and the two of them read as one long fitment across the whole wall,
  //             which is the thing this room has never done.
  //   x -2.42   THE CORNER. The stage-left wall is at -2.6 and its skirting and dado stand 36 mm
  //             proud of it; the case stops at -2.10, which leaves half a metre of floor and
  //             wainscot in the angle. It kept that air when a wall shelf hung over the corner and
  //             it keeps it now the shelf has gone.
  //   y  0      THE BOARDS. The carcase stands on the floor on a 70 mm plinth — `shelfUnit`'s own
  //             default foot, which is what the two low cases and the press stand on — so the one
  //             solid-ink area at the bottom of this case is a plinth a hand deep, and not the
  //             0.9 m of legs, toe rail and radiator it used to be. It started on the dado at 0.905
  //             for one reason only: a radiator was in the way. There is no radiator now.
  //   y  2.45   THE HEAD LINE of every opening in this room (the door's y1 and the old window's
  //             head, both 2.45). The picture rail starts at 2.6, so there is 150 mm of papered
  //             field over the top board and the case is under the rail, not into it.
  //   x -0.89   THE CLOCK's box, which is the one thing on this wall a thumb has to land on (it is
  //             the vortex's switch). The case's right side stands 170 mm off it — half as much
  //             again as the 110 mm this wall hangs its pictures at — and the clock's whole dial,
  //             1.875 to 2.245, hangs below the case's top board. They read as a case and a clock
  //             on one wall, not as a clock wedged into a gap.
  //   z -2.20   THE DEPTH. 260 mm off the skirting line, which is between the two cases the room
  //             already has (the low pair are 280, the press is 240) and is what a 180 mm book and a
  //             180 mm wireless want. It was also what the bar cart's back lip left when the cart
  //             stood in front of this case; the cart has gone and the number has stayed, because it
  //             was never the cart's number.
  // WHAT A PHONE SEES OF IT, and it is the closest thing in this room to a near miss. At 390x844 the
  // case projects to a box 231 x 319 px whose RIGHT EDGE LANDS AT x -11 on both resting plates: it
  // is off the left of the picture by eleven pixels, `home` and `wide` alike. (The resting plates
  // stop at x -0.9944 on the wall plane and the case's top board reaches -1.045.) Eleven pixels is
  // a nudge, and the nudge was not taken: 54 mm to the right is what it would cost, which is the
  // clock's 170 mm of air cut to 116 and the low bookcase's 25 mm of daylight cut to nothing, in
  // exchange for a sliver of the case's own side board at the edge of a phone. The `shelf` plate is
  // where a phone sees it — 296 x 427 px, whole, at x 3 — and that is the plate the lateral track
  // runs to, and the plate that is named for this case (camera-shots.js; it was `window`, then
  // `cart`, and both of those have been taken out of the room). The radio and the bottle were
  // outside a phone's resting frame on the cart too, so nothing a phone can reach has changed.
  // the case itself, published for the piece that opens its books (src/pieces/walk-book.js)
  let tallCase = null;
  const CASE = {
    x0: -2.1,
    x1: -1.06,
    foot: 0, // the floorboards: the carcase stands on them, on the plinth below
    plinth: 0.07, // `shelfUnit`'s own foot, and the two low cases' and the press's
    top: 2.45,
    d: 0.26,
    thick: 0.022,
    // THE BOARDS ARE UNEVEN AND THEY ARE UNEVEN FOR A REASON: what stands in each bay decided its
    // height. 2.298 m of clear case now, five boards' worth of it taken by the boards themselves:
    //   0.082 → 0.498   0.416  the jars' bay, and the big spines. The toe rail over the plinth is
    //                          what things stand on down here, at 0.082.
    //   0.520 → 0.948   0.428  folios, and the tin. The two lowest bays are the two the case grew
    //                          when it came off its legs (see THE FOURTH BAY, AND THE FIFTH below).
    //   0.970 → 1.420   0.450  the bottle bay. VIN is 0.398 tall (the tallest thing that has ever
    //                          stood on the cart this case replaced), so this is a bottle and a hand.
    //   1.442 → 2.092   0.650  the set's bay. The radio measures 0.42 x 0.26 x 0.18 and its aerial
    //                          rises 0.622 off the board it stands on and leans 0.41 to the right,
    //                          so this is the only bay in the room a wireless fits in standing up.
    //   2.114 → 2.428   0.314  books, and nothing else: a run of spines under the top board.
    //
    // THE FOURTH BAY, AND THE FIFTH. The brief for this change asked for one bay under the bottle
    // bay and it has to be two, and the reason is a measurement. Off the legs the case gains
    // 0.905 m of height and the plinth and its toe rail take 82 mm of that, so ONE bay there is
    // 0.866 m in the clear — nearly twice the tallest bay above it (0.650) and two and a half times
    // the shortest. Nothing in this room fills it: `bookRow`'s chunky spines top out at 0.30
    // (props-objects.js), so a single bay would have been a third full with half a metre of paper
    // over the books, which is the fault the user was pointing at turned upside down. Two boards
    // give 0.416 and 0.428, which are the two bays the case already had either side of the bottle
    // bay's 0.450 — so the bottom of this case is now the same case, repeated, which is what "it
    // should be the same as above" asks for.
    boards: [0.52, 0.97, 1.442, 2.114],
  };
  {
    const w = CASE.x1 - CASE.x0;
    const cx = (CASE.x0 + CASE.x1) / 2;
    const cz = FLUSH + CASE.d / 2; // back flush with the skirting, like the two low cases
    // ITS OWN PEN. Every other row of books in this room is dealt off the props piece's shared rng,
    // and a case added in the middle of the file would have shifted that stream for everything built
    // after it — different titles on the low cases, a different palm, different stems in the vase.
    // A seed of its own costs one line and leaves the rest of the room drawn exactly as it was.
    const shelfRng = mulberry32(8123);
    const unit = O.shelfUnit({
      w,
      h: CASE.top - CASE.foot,
      d: CASE.d,
      thick: CASE.thick,
      boards: CASE.boards.map((y) => y - CASE.foot),
      // THE PLINTH IS THE ONE BLACK AREA AT THE FOOT OF THIS CASE, and 70 mm is the whole of it.
      // The round-1 critic asks every prop in this room for one solid dark and one bare light; a
      // case standing on the floor has its dark at the floor, in a band a hand deep, with a 12 mm
      // toe rail struck over it. That is what the two low cases and the press have always done and
      // it is what the legs and the rail were standing in for.
      plinth: CASE.plinth,
      back: true,
    });
    unit.position.set(cx, CASE.foot, cz);
    unit.name = 'tall-case';
    g.add(unit);

    // WHAT IS IN IT, and the whole of this block is the user's second note: "its a bit empty the
    // bookshelf, fill it… you can place the items on it in it." So every bay now carries a RUN OF
    // SPINES from one side, the cart's own things stand among them, and what is left between is a
    // hand's air and not a half-empty board. The room's shelf rule is unchanged and is the reason
    // the runs are runs: books read as one mass of alternating black and paper at four metres, and
    // objects read as silhouettes against it. Nine standing things across five bays: the six the
    // case already carried, and the three the two new bays took in (see THE TWO BAYS AT THE FOOT,
    // below the bottle bay). Much past that it stops being a bookcase and starts being a cabinet.
    //
    // THE LAYOUT, in the unit's own x (-0.498 to 0.498 is the clear width between the sides):
    //   bottle  books -0.498..-0.31 | siphon -0.255 | MARC -0.15 | PILE -0.045 | books 0.04..0.30 |
    //           VIN 0.42.  The three vessels are three silhouettes on purpose — a tall thin cylinder
    //           with a black head, a corked bottle, a square jar — and the 83 mm of air before VIN
    //           is what keeps the one bottle a visitor can work standing on its own.
    //   middle  books -0.498..-0.298 | headset -0.27 | radio 0.04 | books 0.278..0.498. The headset
    //           is 138 mm across and sits 31 mm off the set: an operator's headset beside a wireless
    //           is where a headset lives, and it is the black mass this bay was missing. Its cord
    //           runs off the front of the board and hangs, which is what the cord did on the cart.
    //   top     books -0.498..0.19 | the four newspapers lying flat at 0.33. A stack 300 x 220 on a
    //           board 230 deep, 60 mm tall under a bay 314 clear: it fits lying down, which is what
    //           a newspaper does, and it closes the run with a horizontal.
    const { x0, x1, z0 } = unit.userData.inner; // -0.498 … 0.498 local, the lining at z -0.12
    // the toe rail's own top, which is the floor of the lowest bay: `shelfUnit` sets the plinth
    // 0..0.07 and strikes a 12 mm rail over it, so a jar down here stands at 0.082
    const bTOE = CASE.plinth + 0.012;
    const [bJ, b0, b1, b2] = CASE.boards.map((y) => y - CASE.foot);
    // `extras` is bookRow's licence to put a flat stack or a jar in among the spines, and two runs
    // here are refused it. A run of 200 mm or less: at that width the dice can spend the whole run
    // on one jar, which is what the first draw of the set's right-hand run did — a 220 mm board with
    // a single 85 mm pot on it and nothing else. And the TOP bay, whatever its width: it is the run
    // that says "bookcase" from the door, the one bay no object of any kind stands in, and the dice
    // gave its first third to a flat stack. Its horizontal is the newspapers at the far end and it
    // does not need a second one. Everything else keeps its stacks.
    const shelfBooks = (a, b, y, maxH, extras = b - a > 0.2) =>
      unit.add(O.bookRow({ x0: a, x1: b, y, z: z0, rng: shelfRng, maxH, depth: 0.23, chunky: true, extras }));
    // the bottom bay: books, then the drink and the siphon, then books, then the bottle
    shelfBooks(x0, x0 + 0.188, b0, 0.42);
    shelfBooks(x0 + 0.538, x0 + 0.798, b0, 0.42);
    // the set's bay: a run at the left, the headset, the set, a run under the aerial at the right.
    // The right-hand run is there because of the AERIAL: it leaves the set at 1.700 and climbs to
    // 2.064 at x -1.124, and with a bare board under it that stroke was a 250 mm diagonal alone in
    // an empty bay — a crack in the plaster, not a wire. Over a row of spines it is a wire. The
    // books top out at 1.742 and the aerial is at 1.804 where it crosses them, so it passes clear.
    shelfBooks(x0, x0 + 0.20, b1, 0.3);
    shelfBooks(x1 - 0.22, x1, b1, 0.3);
    // the top bay: spines most of the way across, which is what a case reads as from the door
    shelfBooks(x0, x0 + 0.688, b2, 0.28, false);

    // THE CART'S OWN THINGS, in the order they stood on it. Same objects, same seeds, same labels:
    // MARC and the PILE jar are the two that were left in its top row, the siphon and the four
    // newspapers were on its lower board, and the headset stood between the bottles with its cord
    // over the edge. The cord still hangs — off a board 632 mm higher, which is the only thing about
    // the headset that is different.
    const siphon = O.siphon();
    siphon.position.set(-0.255, b0, 0.0);
    unit.add(siphon);
    for (const [lx, spec] of [
      [-0.15, { kind: 'corked', name: 'MARC', dark: false, scale: 1.2, seed: 203, bodyH: 0.15, neckH: 0.06 }],
      [-0.045, { kind: 'square', name: 'PILE', dark: false, scale: 1.1, seed: 204, bodyH: 0.13, neckH: 0.035 }],
    ]) {
      const o = O.shelfItem(spec, shelfRng);
      o.position.set(lx, b0, 0.01);
      o.rotation.y = (shelfRng() - 0.5) * 0.4;
      unit.add(o);
    }
    const head = O.shelfItem({ kind: 'headset' }, shelfRng);
    head.position.set(-0.27, b1, 0.02);
    head.rotation.y = 0.22;
    unit.add(head);
    const news = O.newspaperStack({ n: 4, rng: shelfRng });
    news.position.set(0.33, b2, 0.0);
    unit.add(news);

    // THE RADIO, on the middle board and turned a couple of degrees into the room. It stands at
    // local x 0.04 — world -1.54, so the set runs -1.75 to -1.33 and the aerial's tip lands at
    // -1.13, 48 mm inside the case's right side — and at local z 0, which leaves its face 40 mm
    // behind the board's front edge. Everything it does is at the foot of this file under THE
    // RADIO; filling the bay round it moved nothing about it.
    const r = O.radio({ w: 0.42, h: 0.26, d: 0.18 });
    r.position.set(0.04, b1, 0.0);
    r.rotation.y = -0.05;
    r.name = 'radio';
    unit.add(r);
    radioObj = r;
    // THE VIN BOTTLE, on the bottom board at its right end — world x -1.16. It was made in the
    // cart's own row for two rounds and is made here now, with the same recipe, the same seed and
    // the same five fingers in it: egg-wine.js re-strikes THIS object's label on every pour, so the
    // bottle a visitor empties is the bottle that has always been drawn. It stood at x -1.934 on the
    // cart's board at 0.811 and stands at -1.16 on this one at 0.97.
    wineObj = O.shelfItem({ kind: 'tall', name: 'VIN', dark: true, scale: 1.2, seed: 201, bodyH: 0.19, neckH: 0.1 }, shelfRng);
    wineObj.position.set(0.42, b0, 0.03);
    wineObj.rotation.y = 0.11;
    wineObj.name = 'vin-bottle';
    unit.add(wineObj);

    // ---- THE TWO BAYS AT THE FOOT, and they are dealt LAST on purpose -------------------------
    // Every book above this line was dealt off `shelfRng` in the order it is written, so two new
    // rows put in at the top of the block would have re-dealt the bottle bay, the set's bay and the
    // top bay — different titles, different blacks, a different aerial crossing a different run.
    // They are dealt here instead and the three bays the case already had are the three bays it
    // already had, to the spine. (It is the same rule the case's own seed was given for: see ITS
    // OWN PEN above.)
    //
    //   0.082  books -0.498..-0.198 | SUCRE -0.14 | ANIS -0.03 | books 0.05..0.498
    //          The two jars came off the wall shelf on the stage-left wall, which goes with the
    //          window in the next change. Same two objects, same labels, same seeds — a paper jar
    //          lettered SUCRE and a black squat one lettered ANIS — so what has happened to them is
    //          that they have been carried across the room and put in a bookcase, which is what
    //          happens to jars. They stand at the bottom because that is where the deep things go
    //          and because a black jar is the dark this bay wants at floor level.
    //   0.520  books -0.498..-0.078 | THÉ 0.02 | books 0.10..0.498
    //          One tin, and it is the only thing in this case that is not out of the exchange or
    //          off the cart. A 0.428 bay wants one silhouette and not three: the run either side of
    //          it is 420 and 398 mm of spines, which is the longest unbroken run in the case and
    //          the thing that makes the foot of it read as books from the door.
    const jars = [
      [-0.14, { kind: 'jar', name: 'SUCRE', h: 0.12, scale: 1.15, seed: 401 }],
      [-0.03, { kind: 'squat', name: 'ANIS', dark: true, bodyH: 0.13, scale: 1.15, seed: 402 }],
    ];
    shelfBooks(x0, x0 + 0.30, bTOE, 0.42);
    shelfBooks(x0 + 0.548, x1, bTOE, 0.42);
    for (const [lx, spec] of jars) {
      const o = O.shelfItem(spec, shelfRng);
      o.position.set(lx, bTOE, 0.01);
      o.rotation.y = (shelfRng() - 0.5) * 0.4;
      unit.add(o);
    }
    // ---- THE CAT'S BAY, and it is this one because it is the only one with the room ------------
    // The user: "you can put the cat in the book shelf on the left." The case has five bays and
    // four of them are spoken for by the measurement:
    //     0.082 .. 0.498  0.416  the jars' bay. A cat here sits on the plinth's own rail with its
    //                            ears at 0.34, under a board, at ANKLE HEIGHT — a thumb has to
    //                            reach it and this is the one bay a hand does not go to.
    //     0.520 .. 0.948  0.428  THIS ONE. 0.428 clear against a cat 0.259 tall, so it sits with a
    //                            hand's air over its ears; its head lands at 0.78, which is the
    //                            height of the table it is across the room from. The only other
    //                            thing in the bay is the THÉ tin, and a tin is not a switch.
    //     0.970 .. 1.420  0.450  the bottle bay: the VIN bottle is a switch and stands at local
    //                            0.42. Two switches in one bay is two tap boxes a hand's width
    //                            apart and the arbiter having to choose between them.
    //     1.442 .. 2.092  0.650  the set's bay: the RADIO is a switch and fills it.
    //     2.114 .. 2.428  0.314  under the top board, and too shallow for a cat that sits up.
    // So the cat sits at local x 0.36 — world -1.22 — at the right-hand end of the folio bay, with
    // the tin and a run of spines to its left and 138 mm of board to its right. It faces a quarter
    // turn into the room, which is what it did on the bookcase top.
    shelfBooks(x0, x0 + 0.34, bJ, 0.36);
    const tin = O.shelfItem({ kind: 'tin', name: 'THÉ', h: 0.13, scale: 1.2, seed: 403 }, shelfRng);
    tin.position.set(-0.09, bJ, 0.01);
    tin.rotation.y = (shelfRng() - 0.5) * 0.3;
    unit.add(tin);
    shelfBooks(x0 + 0.58, x0 + 0.80, bJ, 0.36);
    const cat = O.cat();
    cat.position.set(0.36, bJ, 0.04);
    cat.rotation.y = 0.25;
    cat.name = 'cat';
    unit.add(cat);
    catObj = cat;

    // WHAT IS ON THIS CASE, BY THE TITLE ON ITS BACK. walk-book.js opens four of these spines and
    // has to find them by name: the run they stand in is dealt by the dice, so nothing upstream can
    // say in advance which board CHIROMANCIE landed on. The list is taken fresh each time it is
    // asked for (a re-lettering changes a title under it) and it holds only the books STANDING on a
    // board — a flat stack is a stack, not a spine, and its title faces the ceiling.
    tallCase = {
      unit,
      boards: CASE.boards.slice(),
      bounds: { x0: CASE.x0, x1: CASE.x1, top: CASE.top, front: cz + CASE.d / 2 },
      get books() {
        const out = [];
        unit.traverse((o) => {
          if (o.isMesh && o.userData?.title && !o.userData.flat) out.push(o);
        });
        return out;
      },
    };
  }
  // ---- THE READING TABLE, WHERE THE PALM STOOD (src/pieces/props-table.js) --------------------
  // The user: "where we have the flower pot right now, we should have a little reading table with a
  // chair and a book on the table." So the potted palm and its stool go out of the room — they had
  // that stretch of stage-right plaster for three rounds, between the side window's downstage
  // shutter leaf at z −0.50 and the terminal box's conduit at 0.095 — and a table, a chair and his
  // own book take it. Everything about where it may stand is measured in that file.
  //
  // THE PALM IS NOT MOVED ANYWHERE. There is nowhere else on this wall for it (the mirror of its
  // old place is dead in front of the casement's sill board) and the room already keeps one big
  // empty area per wall. A visitor who asks after it is answered by ABSENT (mind-room.js).

  // ---- the door (stage right): the doormat, and the PTT's tall spares press beside it -------------
  {
    const cx = (door.x0 + door.x1) / 2;
    const ty = ((door.top ?? 2.12) + 0.05 + door.y1) / 2;
    // The transom is left as glass. A VOYANTE board hung here until the user took it off: the room
    // already says what it is on the wall board, and the door's own fanlight carries his name from
    // the street. Two signs over one door was one too many.
    // A doormat in front of the door. Round 4: the floor is raked about 6°, so the mat arrives as
    // a strip a dozen pixels deep whatever is drawn on it. Measured on the wide shot with the old
    // 0.58 x 0.34 mat: 91 px across by 10.8 px deep, and a 512 x 300 sheet on it — 27 texels of
    // drawing per screen pixel, which is nothing a pen can draw. It is now a real doormat's size
    // (92 x 56 cm) on a sheet cut to the shape it projects to: 149 x 17.9 px on the wide and 198 x
    // 21.7 on home, and 6.4 texels per pixel measured on the pass's own minification channel —
    // under the 9 at which the pen gives up. Everything drawn on it is drawn.
    const mat = O.doorMat({ w: 0.92, d: 0.56 });
    mat.position.set(cx, 0, WALL + 0.06 + 0.26);
    g.add(mat);

    // Round 3: the cabinet was a full-height wall of 24 bottles at 42-54% ink — the heaviest thing
    // in the frame. It is now four boards instead of six (stopping 0.7 m short of the rail, so the
    // plaster above it is bare), three bottles a shelf instead of four, each a size larger, and its
    // back is open so the shelves are not a black box behind the glass.
    // Round 4: the boards are evenly spaced (they were 0.12 / 0.66 / 1.2 under a top at 1.49, so
    // the top bay had 0.28 m of headroom and the bottles standing in it — 0.46 m of bottle — went
    // straight through the cabinet's own top board). Every bay now clears 0.44 m and nothing in
    // the cabinet is taller than 0.43.
    const CAB = [0.11, 0.575, 1.04];
    const CABH = 1.5;
    const unit = O.shelfUnit({ w: 0.54, h: CABH, d: 0.24, boards: CAB, plinth: 0.07, back: true });
    unit.position.set(W / 2 - 0.04 - 0.27, 0, FLUSH + 0.12);
    g.add(unit);
    const { x0, x1, z0 } = unit.userData.inner;
    // on top of it, where the coat on the hat stand crosses: two flat books and a black jar, so the
    // run of shelving ends in a silhouette instead of a sawn-off edge
    {
      const b = O.book({ w: 0.24, h: 0.3, t: 0.05, flat: true, seed: 71, title: 'ALMANACH', dark: true });
      b.position.set(-0.09, CABH + 0.025, 0.01);
      b.rotation.y = 0.09;
      unit.add(b);
      const j = O.shelfItem({ kind: 'jar', name: 'MIEL', h: 0.13, scale: 1.3, seed: 72 }, rng);
      j.position.set(0.13, CABH, 0.0);
      // named, because egg-peep.js takes its landing place off this jar's own bounding box rather
      // than off a written-down coordinate, so the toad follows it if the press dressing moves
      j.name = 'miel-jar';
      unit.add(j);
    }
    // Three a shelf, no two the same silhouette or the same height, and exactly ONE of them
    // filled solid — the film's own arithmetic on the two shelves and the sideboard of
    // fd-anim-kitchen-table-cards-hires. Round 3 had two thirds of them black and at 13 px a
    // bottle that read as a picket of blots; the rest of them are paper now, each with a solid
    // capsule over its neck for its black area, and the one filled bottle in the row carries the
    // big label.
    // ROUND 6: NOT ONE BOTTLE IS CUT — they are re-lettered. Sixteen named liquor bottles said
    // "provincial café" and said nothing about him, but the shelves need those silhouettes and
    // bottles are the film's own furniture. So the cabinet is the PTT's spares press and its
    // contents are the exchange's: a battery jar, jack springs, battery acid, cord tips, fuses.
    // Same carcase, same three bays, same arithmetic, same silhouette at 13 px, completely
    // different room. MARC and FINE stay, because he keeps his drink in the stores cupboard.
    const bays = [
      [
        { kind: 'tall', name: 'PILE', dark: false, bodyH: 0.19, neckH: 0.1 },
        { kind: 'square', name: 'MARC', dark: true, bodyH: 0.15 },
        { kind: 'flask', lines: ['RESSORTS'], dark: false, neck: 0.075 },
      ],
      [],
      [
        // short-wide, block, tall-round: the top bay's three read apart at a glance, which the
        // two tall bottles it had before did not
        { kind: 'squat', name: 'FICHES', dark: false, bodyH: 0.14, neckH: 0.06 },
        { kind: 'tin', name: 'FINE', h: 0.13 },
        { kind: 'carafe', name: 'FUSIBLES', dark: false, bodyH: 0.12, neckH: 0.09 },
      ],
    ];
    CAB.forEach((y, i) => {
      // the second bay up carries a single big demijohn and nothing else: the film gives every
      // packed run of objects one place where the eye is allowed to stop. It is glass now, with a
      // black capsule and an oval label — a shape to rest on rather than the frame's biggest blot.
      if (i === 1) {
        // the demijohn is a carboy of battery acid now — same capsule, same oval label
        const dj = O.shelfItem({ kind: 'carafe', name: 'ACIDE', dark: false, bodyH: 0.14, neckH: 0.075, scale: 1.4, seed: 391, shape: 'oval' }, rng);
        dj.position.set(x0 + 0.16, y, z0 + 0.14);
        unit.add(dj);
        // one small thing at the far end so the bay is a resting place and not a hole: a tumbler,
        // a third of the demijohn's height and nothing like its shape
        const tu = O.shelfItem({ kind: 'tumbler', scale: 1.25, seed: 392 }, rng);
        tu.position.set(x1 - 0.09, y, z0 + 0.15);
        unit.add(tu);
        return;
      }
      unit.add(O.row({ x0, x1, y, z: z0 + 0.13, rng, gap: 0.008, items: bays[i].map((s, k) => ({ ...s, scale: 1.3, seed: 300 + i * 10 + k })) }));
    });
  }

  // ---- the centre wall: a sign under the rail, pictures around the clock, a pinboard by the door ------
  {
    // The shop's own board, in its own words. Round 4 cut this to TAROT / BIENVENUE because the
    // old copy measured out at a 5 px cap and arrived as grey scribble — but the user prefers the
    // longer lines, and the ink pass has since stopped drawing a minified mark as a grey: a mark is
    // full ink or bare paper now. So the copy is back, on the bigger board round 4 built for it,
    // which gives the first line a 43 px cap where it used to have 25.
    // `sizes` are in the sheet's own px — texW 1536 on a 4:1 board makes the sheet 1536 x 384.
    const sign = O.signBoard({
      w: 1.32,
      h: 0.33,
      lines: ['TAROT — READINGS — 3 CARDS', 'BY APPOINTMENT · WALK-INS TOLERATED'],
      sizes: [64, 40],
      border: 'double',
      texW: 1536,
    });
    // The board hangs from its hook line, not from its middle: a pivot at the top edge, so a piece
    // that wants to make it shiver on its cord (help.js, when the pointer is over it) tips it the
    // way a hung board tips — the hooks stay put and the bottom edge swings. The pivot is also what
    // the help piece hangs its own tag under, and the mesh is what it raycasts against.
    signPivot = new THREE.Group();
    signPivot.name = 'sign-board';
    signPivot.position.set(0, railY - 0.005, WALL + 0.045);
    sign.position.set(0, -0.165, 0);
    signPivot.add(sign);
    g.add(signPivot);
    signMesh = sign;
    for (const sx of [-1, 1]) {
      const hook = O.sphere(0.009, M.solid, 8, 6);
      hook.position.set(sx * 0.42, railY - 0.005, WALL + 0.02);
      g.add(hook);
    }

    // Round 3: ONE row of pictures, not two, and no cork board. The lower row of four small
    // subjects sat directly over Pepe's head and the pinboard's grid of notes was the densest
    // patch on the wall; between them they were most of the 35-45% the room measured here. What is
    // left is three larger, better-drawn things — a portrait, the clock, a hand — hung in a row
    // under the rail, with bare plaster above the furniture and either side of Pepe's head.
    // Round 6 hung two plates beside it and both have since left: the Nakamoto card, which the user
    // has now taken off the wall for good, and the circuit diagram, which went to the stage-left
    // wall and has since gone out of the room with it. What is left is the CLOCK and
    // THE PICTURE OF THIS ROOM (src/pieces/egg-droste.js). They no longer share a band: the picture
    // is nailed in the middle of the wall, behind him, and the clock hangs out to the left on the
    // plaster the window used to take — see THE ROW at the head of this build.
    // The picture is hung at the foot of this file, by its egg, because ink.js and camera.js both
    // need the object; the clock is built here and `layRow` puts both of them where they go.
    const clock = O.wallClock({ r: ROW.clockR });
    clock.position.set(ROW.clockX, ROW.clockY, WALL + 0.03);
    g.add(clock);
    clockObj = clock;
    clockCords = new THREE.Group();
    g.add(clockCords);
    g.userData.pendulum = clock.userData.pendulum;
    g.userData.setClockTime = clock.userData.setTime;
    g.userData.wallClock = clock; // what a pointer is raycast against; see THE VORTEX below
  }

  // ---- the stage-left wall: NOTHING OF PROPS' IS ON IT ANY MORE -----------------------------------
  // It carried three things and it carries none. Upstage, a cut-down telephone switchboard on the
  // plaster with six jacks and two cords in it; under it, a 0.6 m wall shelf on two brackets with
  // a SUCRE jar and an ANIS jar standing on it; downstage at z 0.3, a framed circuit diagram that
  // was a cabinet door with a conspiracy board pinned behind it. The user, looking at a crop of
  // that wall: "then let's remove both of these, they don't make sense anymore. add a wide window
  // instead" — and, of the third: "pepe silvia doesnt work on the side, so you can remove it."
  //
  // So the wall is room.js's now, and what is on it is JOINERY: a wide three-light casement upstage
  // (room.js, `sideWinL`) where the board and the shelf were. The jars went into the tall case's
  // bottom bay one change earlier; the board, its bell, the phone beat and the whole of
  // egg-switchboard.js are out of the repository, as are egg-silvia.js and its two tools. Nothing
  // of this piece's stands against that plaster upstage of the press door, and that is the point:
  // a window wants the wall.

  // ---- the stage-right wall: a small round picture, upstage of the window ---------------------------
  {
    const x = W / 2 - 0.02;
    const rot = -Math.PI / 2;
    const rf = O.roundFrame({ r: 0.14, kind: 'key', seed: 11 });
    rf.position.set(x, 1.95, -2.18);
    rf.rotation.y = rot;
    g.add(rf);
  }

  // ---- in front of the side walls: nothing, now -------------------------------------------------------
  // A floor lamp stood at the left and a hat stand with a black overcoat at the right, each a hand's
  // width in from its wall, and three rounds went into where they should stand. The user took both
  // out: "i'd like you to remove the lamp on the left side, and also the coat hanger on the right, i
  // dont feel they fit". They were the two tallest objects in the room and the only two standing
  // free of a wall, and both were largely black — between them they held the near corners of every
  // frontal shot. The corners are bare boards and wainscot now.
  //
  // If either is ever wanted back, `floorLamp` and `hatStand` are still in props-objects.js.

  // ---- overhead: the three-petal pendant over the table -------------------------------------------------
  // hangs at the height of the window heads, so it clears the sign on the wall behind it
  const pendant = O.pendantLamp({ ceilY: H, dropTo: 2.72 });
  g.add(pendant);

  // every prop casts the key's crisp shadow, except the groups flagged noShadow (a cast shadow
  // across the wall behind them would swallow their silhouettes; the film keeps such walls bare)
  const noShadow = [];
  g.traverse((o) => {
    if (o.userData.noShadow) noShadow.push(o);
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  for (const grp of noShadow) grp.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  // ?nodress=1 leaves the dressing out: how the props' own share of a frame's ink is measured
  // against the room and the figure (tools/_cover.mjs on the two shots, and subtract).
  if (!new URLSearchParams(location.search).has('nodress')) ctx.scene.add(g);

  // ---- the wall clock keeps the visitor's own time ----------------------------------------------
  // The user, round 7: "i'm also wondering if the clock over pepe could always display the actual
  // time of the user?" It used to be stopped at five to midnight. It now reads `new Date()` — the
  // browser's clock, so the visitor's own wall time, whatever zone they are in — and the hands are
  // moved only when the MINUTE turns over. That is one step a minute, on the stepped clock like
  // everything else in the room, and it is also exactly what the real clock on the visitor's wall
  // is doing while they watch. There is no seconds hand: at 60 px of dial in the wide shot a third
  // hand ticking every second is the only fast thing in a room built out of holds, and it reads as
  // a fault in the drawing rather than as time passing. The pendulum below carries the seconds.
  //   ?now=HH:MM pins the dial, so a screenshot of the room is reproducible.
  const pinned = new URLSearchParams(location.search).get('now');
  const pinnedAt = /^\d{1,2}:\d{2}$/.test(pinned ?? '') ? pinned.split(':').map(Number) : null;
  let shownMinute = -1;
  function tellTheTime() {
    const set = g.userData.setClockTime;
    if (!set) return;
    const d = new Date();
    if (pinnedAt) d.setHours(pinnedAt[0], pinnedAt[1], 0, 0);
    const minuteOfDay = d.getHours() * 60 + d.getMinutes();
    if (minuteOfDay === shownMinute) return; // the hands hold until the minute turns
    shownMinute = minuteOfDay;
    set(d);
  }
  tellTheTime();

  // ---- THE SWITCHES. What in this room answers a pointer, and which one answers it. -------------
  // Round 8 gave the visitor the radio. Round 9 gives them the cat, which turns out to be a lamp.
  // Both are worked the same way — a pointer on the object's own drawing, or inside a 44 px box
  // round it so a thumb has something to hit — so the pointer is handled ONCE, here, and not twice.
  //
  // WHY IT IS SHARED AND NOT COPIED. Two controls with their own listeners are two controls that
  // can both answer the same tap: the margins are grown boxes and boxes can overlap, and on a
  // phone they are grown a good deal. The rule is the room's own: whichever object the ray strikes
  // is the one the visitor pointed AT, and if the ray strikes neither (a thumb inside a margin,
  // which is the only way both can be true at once) the object NEARER THE CAMERA takes it — the
  // thing in front is the thing you meant to touch.
  //
  // AND IT COSTS ONE HIT TEST A FRAME. A pointermove fires far faster than the film draws, so a
  // move only parks the event; the test itself runs from update(), on the same 12 fps step the
  // knob turns and the boil re-strikes. A pointerdown is resolved on the spot — a click cannot
  // wait 83 ms for an answer — and that is one raycast per click, which is nothing.
  const SWITCHES = (() => {
    const glass = ctx.renderer?.domElement ?? null;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const at = new THREE.Vector3();
    const list = [];
    let hovered = null, cursorMine = false, pending = null;

    function pick(ev) {
      if (!glass || !list.length) return null;
      const r = glass.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const px = ev.clientX - r.left, py = ev.clientY - r.top;
      // the drawing first: a pointer actually on one of them, wherever it is on screen
      ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
      ray.setFromCamera(ndc, ctx.camera);
      let best = null, bestD = Infinity;
      for (const c of list) {
        if (c.enabled && !c.enabled()) continue; // a switch that is busy is not a switch just now
        const o = c.object();
        if (!o) continue;
        // a switch with a hit test of its own (the globe: a sphere, not a box) is asked directly
        if (c.hit) {
          if (!c.hit(px, py)) continue;
          const d = o.getWorldPosition(at).distanceTo(ctx.camera.position);
          if (d < bestD) {
            best = c;
            bestD = d;
          }
          continue;
        }
        const hit = ray.intersectObject(o, true)[0];
        if (hit && hit.distance < bestD) {
          best = c;
          bestD = hit.distance;
        }
      }
      if (best) return best;
      // THEN THE MARGINS, which are what make a small thing reachable on a phone — and they are
      // MARGINS, not hit areas. Two rules, and the room learnt both the hard way when the visitor
      // could scroll INTO the picture on the back wall and the camera started walking through the
      // furniture (src/pieces/camera.js, THE SCROLL).
      //
      //  · A BOX WITH THE LENS INSIDE IT IS NOT A BOX. Every one of these is the projection of an
      //    object's eight corners, and `project()` on a corner BEHIND the camera divides by a
      //    negative w and lands it on the far side of the frame. Once the camera is level with the
      //    table the squared deck has corners on both sides of the lens and its box measures
      //    13912 x 33305 px — the whole window and then some. Measured, at t = 0.5 on a 1280x800
      //    window: every egg in the room answered `deck`, which is exactly the fault the user
      //    reported ("when not at the perfect scroll position the easter egg clicks dont work
      //    well, it often clicks to a wrong place"). So a margin has to be the size of a margin: a
      //    box bigger than a quarter of the window is not one, and is refused.
      //  · AND THE SNUGGEST BOX WINS, not the nearest object. Ranking by distance to the lens is
      //    what let a near, sprawling box take a point that sat inside a far, tight one; it is also
      //    the wrong question. The margin is there to catch a thumb that missed by a few pixels, so
      //    the thing it missed is the thing whose box fits it closest. Distance is kept only to
      //    break a tie between two boxes of the same size.
      const vw = glass.clientWidth || 1, vh = glass.clientHeight || 1;
      const areaCap = vw * vh * 0.25;
      let bestArea = Infinity;
      bestD = Infinity;
      for (const c of list) {
        if (c.enabled && !c.enabled()) continue;
        if (c.hit) continue; // its own test already said no
        const b = c.tapBox();
        if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.w) || !Number.isFinite(b.h)) continue;
        if (b.w <= 0 || b.h <= 0 || b.w * b.h > areaCap) continue;
        if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) continue;
        const o = c.object();
        if (!o) continue;
        const area = b.w * b.h;
        const d = o.getWorldPosition(at).distanceTo(ctx.camera.position);
        if (area < bestArea - 0.5 || (area <= bestArea + 0.5 && d < bestD)) {
          best = c;
          bestArea = area;
          bestD = d;
        }
      }
      return best;
    }

    function setHover(c) {
      if (hovered === c) return;
      hovered?.onHover?.(false);
      hovered = c;
      hovered?.onHover?.(true);
      if (!glass) return;
      if (c) {
        glass.style.cursor = c.cursor ?? 'pointer';
        cursorMine = true;
      } else if (cursorMine) {
        // only ever put back what this piece put there: reveal-fan.js and help.js share the cursor
        glass.style.cursor = '';
        cursorMine = false;
      }
    }

    glass?.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'touch') return;
      pending = ev; // parked; the hit test runs once a frame, from update()
    });
    glass?.addEventListener('pointerleave', (ev) => {
      if (ev.pointerType === 'touch') return;
      pending = null;
      setHover(null);
    });
    // A DRAG. A switch with `down/move/up` (the globe) owns the pointer from its pointerdown to the
    // pointerup, wherever that lands, and may ask for a `grab` cursor while it holds it.
    let held = null;
    const local = (ev) => {
      const r = glass?.getBoundingClientRect();
      return r ? [ev.clientX - r.left, ev.clientY - r.top] : [0, 0];
    };
    glass?.addEventListener('pointerdown', (ev) => {
      const c = pick(ev);
      if (!c) return;
      // flow.js reads any pointerdown on the window as the visitor skipping ahead through Pepe's
      // line, which a visitor reaching for a switch did not mean. So the event stops here — and
      // sound's own "first gesture" unlock, which lives on that same window, is called by hand.
      ctx.pieces.sound?.start?.();
      ev.stopPropagation();
      c.onDown?.(ev);
      if (c.down) {
        held = c;
        const [px, py] = local(ev);
        c.down(px, py, ev);
        if (c.grab && glass) {
          glass.style.cursor = c.grab;
          cursorMine = true;
        }
      }
    });
    window.addEventListener('pointermove', (ev) => {
      if (!held?.move) return;
      const [px, py] = local(ev);
      held.move(px, py, ev);
    });
    const release = (ev) => {
      if (!held) return;
      const c = held;
      held = null;
      const [px, py] = local(ev);
      c.up?.(px, py, ev);
      if (glass && cursorMine) glass.style.cursor = ev.pointerType === 'touch' ? '' : (c.cursor ?? 'pointer');
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    return {
      add(c) {
        list.push(c);
        return c;
      },
      // for the tools: which switch the pointer is on, by name
      get hovered() {
        return hovered?.name ?? null;
      },
      // IS THERE A SWITCH UNDER THIS POINT? The same test a pointerdown gets — the drawing first,
      // then the thumb margins — asked without an event and without touching the hover. camera.js
      // asks it before it lets a one-finger drag become a scroll: a thumb that landed on the cat
      // is the cat's, and the room does not get to take it off the animal.
      at(clientX, clientY) {
        return pick({ clientX, clientY })?.name ?? null;
      },
      update() {
        if (!pending) return;
        const ev = pending;
        pending = null;
        setHover(pick(ev));
      },
    };
  })();

  // ---- THE RADIO. The one thing in this room the visitor is allowed to work. ---------------------
  // The user, round 8: "would be cool if we could turn the tune on and off and switch through them
  // via the radio receiver." And his own persona, about this very prop: "The radio. It works and
  // you do not switch it on." So the visitor does, and the set has to be honest about it. (It stood
  // on the cart for that round and stands in the case behind it now; nothing below reads its place.)
  //
  // THE DEFAULT IS OFF, and that is a decision, not an oversight. sound.js starts tune `a` on the
  // first gesture; this piece switches it off before any gesture can happen, unless the URL asked
  // for a tune by name. Three reasons:
  //   1. The dial. If the music is playing while the needle is parked against its left-hand stop,
  //      the drawing is lying about the room. Either the needle would have to start on a station —
  //      and then the visitor never gets the moment of switching the set on, which is the thing the
  //      user asked for — or the radio is not the thing making the sound, and then it is a switch
  //      with nothing behind it.
  //   2. His line. The set says it is off. He says it is off. It is off.
  //   3. The first thing a visitor hears should be the door, the escapement and the room, which is
  //      what the sound piece spent four rounds building. Music over that is a menu screen.
  // CONSISTENT WITH ?tune=: `?tune=a|b|c` is an explicit switch-on — the tune plays and the needle
  // starts on that station, because a URL asking for a tune has done what the click does. `?tune=0`
  // and a bare URL are both OFF, with the needle at the stop. The `t` key still walks the three
  // tunes and silence, and the needle FOLLOWS it (see update): whoever changed the station, the
  // dial shows the station.
  const RADIO = (() => {
    // Stop 0 is off; stop 1 is THE RECORD (sound.js RECORD, its own name 'r'). Round 9: the three
    // written tunes came off the dial — the user: "rather than the generated melodies, i'd like it
    // to play a specific song" — and stay reachable by ear on the `t` key and `?tune=a|b|c`.
    const IDS = [null, 'r'];
    // The needle is thrown at its mark and comes back onto it: three drawings on twos, half a
    // second, the same 12 fps grid the pendulum and the boil are on. A needle that slid would be
    // the only continuous movement in the film.
    const THROW = [0.46, 1.1, 1.0];
    const NUDGE = 0.17; // how far the tuning knob turns under a pointer, in radians
    const MIN_TAP = 44; // px: what a thumb needs, whatever the radio measures on the glass
    // ?tune=a|b|c starts ON that station; ?tune=0/off/none/no and a bare URL are both the left
    // stop. A `?tune=` that names nothing keeps sound.js's own rule — it falls back to the default
    // tune rather than to silence, so a typo is audible instead of mysterious — and the needle goes
    // to the station that is actually playing.
    const OFFWORDS = ['0', 'off', 'none', 'no'];
    const param = (ctx.params ?? new URLSearchParams(location.search)).get('tune');
    const asked = (param ?? '').toLowerCase();
    let station = param == null || OFFWORDS.includes(asked) ? 0 : Math.max(1, IDS.indexOf(asked));
    let from = station, to = station, frame0 = -1e9;
    let hover = false, told = false;

    const sound = () => ctx.pieces.sound; // built after this piece: never cached
    const point = () => radioObj?.userData?.setStation?.(station);
    point();

    // the set's box on the glass, in px — the front face's own eight corners, projected
    function hitBox() {
      const face = radioObj?.userData?.face;
      if (!face) return null;
      face.updateMatrixWorld(true);
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      const xs = [], ys = [];
      const v = new THREE.Vector3();
      const { width: bw, height: bh, depth: bd } = radioObj.userData;
      for (const dx of [-bw / 2, bw / 2]) for (const dy of [-bh / 2, bh / 2]) for (const dz of [-bd / 2, bd / 2]) {
        v.set(dx, dy, dz);
        face.localToWorld(v).project(ctx.camera);
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    // WHAT A THUMB ACTUALLY HAS TO HIT: the set's own box, grown about its centre to at least 44 px
    // each way, the extra falling on the case's own board and on the books either side of it.
    // Nothing else in the room is clickable within a foot of there, so the margin costs nothing and
    // a miss costs the feature.
    //
    // MEASURED (BASE=… node tools/_props-r8-radio.mjs), and the news is not what anyone expected.
    // The set is not too SMALL on a phone. It is not in the picture at all:
    //     1600 x 900   home 94.5 x 54.5 px at x 433    wide 76.1 x 43.8 px at x 505
    //     390 x 760    home 91.3 x 52.6 px at x -159   wide 91.3 x 52.6 px at x -159
    //     360 x 800    home 84.2 x 48.5 px at x -147   wide 84.2 x 48.5 px at x -147
    // A portrait window crops the frame to the middle of the room — the whole of this end of the
    // wall is outside it, and the set's right-hand edge now stops 68 px short of the left of the
    // picture. (It was 18 px when it stood on the cart. Going up into the case took it 0.29 m
    // further from the room's axis and 0.63 m up, which is 50 px further out of a phone's frame and
    // 2 px off its size: a phone was never going to see it either way.) The margin below therefore
    // never fires at any window that shows it at all: at 91 px the set is twice the size a thumb
    // needs. What a phone lacks is not reach, it is the frame. That is the camera's call or the set
    // dressing's, not this control's, and no hidden hotspot at the edge of the picture will do —
    // an affordance nobody can see is not one. Until then the radio is a desktop control, and `t`
    // (sound.js) is the other way through the three tunes.
    function tapBox() {
      const b = hitBox();
      if (!b) return null;
      const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
      return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
    }

    // one stop on, and round again at the end: off → the record → off
    function turn(next = (station + 1) % IDS.length) {
      from = station;
      to = next;
      station = next;
      frame0 = ctx.clock.frame;
      sound()?.setTune?.(IDS[next]);
      // THE CRACKLE. Between two stations there is nothing on the air, and that is the sound of
      // the knob having done something. It is fired on the click and not on the arrival: the hand
      // is on the knob now, the needle catches up over the next half second.
      sound()?.play?.('static');
      ctx.emit?.('props:radio', { station: next, tune: IDS[next] });
    }
    // the pointer itself belongs to SWITCHES above, which is what keeps the set and the cat from
    // both answering one tap; all this control has to say is where it is and what to do about it
    SWITCHES.add({
      name: 'radio',
      object: () => radioObj,
      tapBox,
      onHover: (on) => {
        hover = on;
      },
      onDown: () => turn(),
    });

    return {
      get station() {
        return station;
      },
      get tune() {
        return IDS[station];
      },
      hitBox,
      tapBox,
      turn,
      // for the tools and for setState: put the needle on a stop with no throw and no crackle
      set(next) {
        station = from = to = Math.max(0, Math.min(IDS.length - 1, next | 0));
        frame0 = -1e9;
        point();
        sound()?.setTune?.(IDS[station]);
      },
      update(ctx2) {
        // The default, said once, as late as possible: this piece is built before sound.js, so
        // there is nothing to tell until the first frame. Nothing has been heard yet either — the
        // tune does not start until the visitor's first gesture — so switching it off here is
        // switching it off before it was ever on.
        if (!told && ctx.pieces.sound) {
          told = true;
          if (station === 0) ctx.pieces.sound.setTune?.(null);
        }
        // Whoever changed the station — the `t` key, another piece — the dial shows the station.
        // Only while the sound piece is actually RUNNING: before the visitor's first gesture there
        // is nothing playing to follow, and under ?shot=1 the piece is a stub whose `tune` is a
        // frozen snapshot of the default, which would drag the needle off any stop a still asked
        // for.
        const live = ctx.pieces.sound?.running;
        const id = live ? ctx.pieces.sound.tune?.id ?? null : IDS[station];
        if (told && IDS[station] !== id) {
          const i = IDS.indexOf(id);
          if (i >= 0) {
            from = station;
            to = i;
            station = i;
            frame0 = ctx2.clock.frame;
          }
        }
        const k = Math.floor((ctx2.clock.frame - frame0) / 2);
        const u = k >= 0 && k < THROW.length ? from + (to - from) * THROW[k] : to;
        radioObj?.userData?.setStation?.(u);
        // and the knob turns a little further under a pointer, which is the whole of the
        // affordance: no glow, no outline, a knob that can be seen to move
        const knob = radioObj?.userData?.knob;
        if (knob && hover) knob.rotation.z -= NUDGE;
      },
    };
  })();

  // ---- THE GLOBE. The one thing in this room that asks HIM a question. --------------------------
  // The user: "Spin it with a drag; where it stops, he tells a story about an affair he had during
  // a vacation in that specific country." All of it is in src/pieces/egg-globe.js — the drawn map,
  // the table of countries, the throw and the wait. Here it is only given the object off the left
  // bookcase and a place in the switchboard.
  const GLOBE = eggGlobe(ctx, { object: globeObj, switches: SWITCHES });

  // ---- THE CAT, WHICH IS A LAMP. The room's second switch. ---------------------------------------
  // The user, having been given the radio: "now lets make some other objects interactive - for
  // example the black cat on the right behind tarotpepe, it could be a lamp - when the user clicks
  // it, it could turn white."
  //
  // So it is a cat-shaped lamp — the kind a provincial household buys once, in 1954, and never
  // replaces — and switched OFF it is exactly the cat that has sat on that bookcase since round 3:
  // a solid ink mass with its eyes, whiskers, nose and the rule along its tail left in paper.
  // Switched ON it is bare paper inside the room's own contour and every one of those marks is
  // pen. Nothing is added and nothing moves. In a world with no grey that inversion is the whole
  // of what "lit" can mean, and it is the reason the object still reads as the same cat: it is the
  // same drawing with the ink on the other side of it.
  //
  // IT IS A CUT, NOT A FADE. The click is answered on the next 12 fps drawing and the change lands
  // whole — a light does not ramp, and a ramp here would be the only continuous thing in the film.
  // A short dry click from the mechanism goes with it ('switch', sound-voices.js), fired on the
  // pointer and not on the drawing, because the visitor's thumb is on the switch NOW.
  //
  // NOTHING ANNOUNCES IT. No label, no halo, no outline, no glow before it is touched. The cursor
  // becomes a pointer over it and that is the entire affordance, exactly as it is for the radio.
  // The room does not explain itself; it rewards a visitor who tries something.
  const CAT = (() => {
    const MIN_TAP = 44; // px: what a thumb needs, whatever the cat measures on the glass
    let lit = false, want = false;

    // the cat's box on the glass, in px: its own eight corners (taken off the geometry in
    // props-objects.js, so they cannot drift from the drawing), projected
    function hitBox() {
      const b = catObj?.userData?.box;
      if (!b) return null;
      catObj.updateMatrixWorld(true);
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      const xs = [], ys = [];
      const v = new THREE.Vector3();
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        v.set(x, y, z);
        catObj.localToWorld(v).project(ctx.camera);
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    // grown about its centre to at least a thumb's 44 px. The extra falls on the top board of the
    // bookcase and on bare plaster, where there is nothing else to hit — measured in
    // tools/_props-r9-cat.mjs, which also reports whether the cat is in the picture at all on a
    // phone (the radio is not, and that is a framing problem, not a control's).
    function tapBox() {
      const b = hitBox();
      if (!b) return null;
      const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
      return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
    }
    function paint() {
      catObj?.userData?.setLit?.(lit);
    }
    // the switch thrown: the sound and the news go now, the drawing changes on the next step
    function toggle(next = !want) {
      want = !!next;
      ctx.pieces.sound?.play?.('switch');
      ctx.emit?.('props:cat', { lit: want });
    }
    SWITCHES.add({
      name: 'cat',
      object: () => catObj,
      tapBox,
      onDown: () => toggle(),
    });

    return {
      get lit() {
        return lit;
      },
      hitBox,
      tapBox,
      toggle,
      // for the tools and for setState: throw it with no cue and no waiting for the clock
      set(on) {
        lit = want = !!on;
        paint();
      },
      update() {
        if (want === lit) return;
        lit = want;
        paint();
      },
    };
  })();

  // ---- THE FUSE BOX'S LEVER, and the night the room drops to without it. ------------------
  // The room's fourth switch, all in src/pieces/egg-fuse.js; it registers with the arbiter above.
  const FUSE = eggFuse(ctx, { group: g, switches: SWITCHES });

  // ---- THE CLOCK, WHICH IS A VORTEX. The room's fifth switch (src/pieces/egg-vortex.js). ---
  const VORTEX = buildVortex(ctx, {
    clock: g.userData.wallClock,
    switches: SWITCHES,
    dial: 0.185,
    setTime: g.userData.setClockTime,
  });

  // ---- THE WINE, on the tall case's bottom board. The sixth switch (src/pieces/egg-wine.js). ----
  const WINE = buildWine(ctx, wineObj, { switches: SWITCHES });


  // ---- THE VASE OF DRIED STEMS on the operator's position (src/pieces/egg-vase.js). ---------
  // The room's eighth switch, and the only one that puts colour anywhere but on Pepe and the cards.
  const VASE = eggVase(ctx, { object: vaseObj, switches: SWITCHES });
  // ---- THE WEATHER. Not a switch any more (src/pieces/egg-rain.js). ---------------------------
  // It was the room's eighth: click the window's panes and it rained behind them. There is no window
  // on the back wall now, so there are no panes to draw on and nothing to click, and this egg is
  // down to the two parts of itself that never needed glass — the shade the room drops by and the
  // sound of rain. egg-cross.js still calls it by its api during the storm, which is what it is for
  // now. It takes no `window` and it registers no switch.
  const RAIN = eggRain(ctx, { group: g });
  // ---- THE FIRE, AND IT IS THE FIREPLACE THAT WORKS IT NOW ---------------------------------------
  // The user: "the fire easter egg should not originate from the light behind Pepe, but from the
  // fireplace." It was the mushroom lamp on the operator's position for two rounds — first a hover,
  // then a click — and the lamp is released by this change (something else is given it: see THE
  // DARK). Click the grate and the fire lights IN it and spreads from there into the eleven other
  // places it has always taken; click again and it goes out. Nothing in the room reacts to any of
  // it — not the light, not Pepe, not the placard — which is the whole of the joke, and none of
  // that has changed. src/pieces/egg-fine.js says so at length.
  //
  // room.js owns the fireplace and publishes it in world metres (`room.fireplace`). What this egg
  // needs from it is two things: a rectangle on the glass for a pointer — the OPENING, the black
  // hole a visitor would actually aim at — and a point in the room for the first tongue to stand
  // on, which is the middle of the firebox floor. The set is one merged mesh per material, so
  // there is no grate OBJECT to raycast; the anchor below is what the arbiter sorts by depth, and
  // the box is what it hit-tests. If room.js is not in the set at all (a stripped page) the
  // fallback is where the fireplace has always been and nothing throws.
  const FP = room.fireplace ?? {
    face: -W / 2 + 0.24,
    opening: { z0: -0.36, z1: 0.26, y0: 0.2, y1: 0.86 },
    grate: { x: -W / 2 + 0.14, y: 0.2, z: -0.05 },
  };
  const grateAt = new THREE.Object3D();
  grateAt.name = 'grate';
  grateAt.position.set(FP.grate.x, FP.grate.y, FP.grate.z);
  g.add(grateAt);
  const FINE = buildFine(ctx, { group: g, switches: SWITCHES, grate: grateAt, opening: FP.opening, face: FP.face });
  // ---- THE DARK, and the lamp behind him is its switch now ---------------------------------------
  // The user, in the same breath as moving the fire off it: "clicking the light behind Pepe should
  // lead to the whole room turning black - the only thing the user should see is Pepe's eyes and
  // his mouth." So the mushroom lamp keeps exactly one switch, as it always had; what it does is
  // different. It is all in src/pieces/egg-dark.js, and what it needs from this file is the lamp to
  // point at and the arbiter above - the room going out is the INK PASS's own branch and not a
  // thing this piece could do by hiding anything.
  const DARK = eggDark(ctx, { switches: SWITCHES, lamp: g.getObjectByName('mushroom-lamp') });
  // ---- THE PICTURE OF THIS ROOM in the right frame (src/pieces/egg-droste.js). ----------------
  // The sheet inside it is cut to the window's own aspect (landscape on a laptop, upright on a
  // phone) and the moulding is put round that; what is in it is this room, live, drawn by the same
  // pen, and in it the same picture again. See THE SCROLL in src/pieces/camera.js.
  //
  // HOW BIG AND WHERE are THE ROW's, at the head of this build. The nail is x 0 at every shape —
  // the user put it there — and what the window's aspect still decides is the picture's height, and
  // through the height the clock's x. What it comes to, measured (tools/_droste-where.mjs):
  //     window      sheet            frame            standing at      top     phone margin
  //     1280x800    0.215 x 0.134    0.259 x 0.178    0.817, 1.117    1.2135    0.0203
  //     1600x900    0.215 x 0.121    0.259 x 0.165    0.817, 1.110    1.2005    0.0203
  //     390x844     0.215 x 0.134    0.259 x 0.178    0.817, 1.117    1.2135    0.0203
  // The phone's frame is the 1280x800 frame to the millimetre, because upright windows are given a
  // landscape picture: the same photograph whatever the visitor is holding.
  //
  // `z` IS TAKEN ONCE AND CANNOT BE RELAID. egg-droste.js destructures it at build (`const { z } =
  // slot`) and `setSlot` takes x, y, w and h and nothing else — which is right, because the depth of
  // a thing standing on a shelf is not a function of the window. It is passed here and only here.
  const DROSTE = eggDroste(ctx, { group: g, switches: SWITCHES, slot: { ...layRow(rowAspect(), rowBuffer()).frame, z: ROW.shelfZ, stand: ROW.shelfTop } });
  // …and the row is laid now and again on every resize, because the picture's width IS the window's
  // aspect: a wall that was even at 16:9 is not even on a phone unless the clock moves with it. The
  // clock is moved, never rebuilt, so egg-vortex.js's reference to it stays the reference it took.
  // THE CLOCK DOES NOT MOVE ANY MORE. It hung off the picture's own outer corner while the two of
  // them shared this wall, so a resize that re-cut the picture also slid the clock; the picture is
  // on a bookcase now and the clock is on the room's axis, which is a number no window shape can
  // change. What still relays is the PHOTOGRAPH, because its width is still the window's aspect.
  // `clockCords` is kept as an empty group so nothing that reached for it has to learn that it has
  // gone — see THE CLOCK at the head of this build for why there are no cords in it.
  function relay() {
    const row = layRow(rowAspect(), rowBuffer());
    DROSTE?.setSlot?.(row.frame);
    return row;
  }
  relay();
  ctx.on?.('resize', () => relay());
  // ---- PEEP THE TOAD on the press's middle bay, and the floor he ends up on (src/pieces/egg-peep.js). --
  const PEEP = eggPeep(ctx, { group: g, switches: SWITCHES, jar: g.getObjectByName('miel-jar') });
  // ---- THE HOUSE OF CARDS. The room's seventh switch, and it has no object: ↑↑↓↓←→←→BA on the
  // keyboard, in six seconds, with the room idle (src/pieces/egg-konami.js). ------------------
  const KONAMI = buildKonami(ctx);
  // ---- THE DECK, LAID OUT. The room's switch that IS an object of the film's own: the squared
  // deck on the cloth. The user: "something should also happen to the cards if the user clicks on
  // the full stack on the table. that may be a good place to reveal all the tarot cards." Click it
  // with the room idle and the seventy-eight come off the pile face up into five bows; a tap on one
  // brings it to the lens; a tap anywhere else rakes them home. src/pieces/egg-deck.js.
  const DECK_OUT = eggDeck(ctx, { switches: SWITCHES, konami: KONAMI });
  // ---- THE CROSS over the door, and the floor it opens (src/pieces/egg-cross.js). --------------
  // Click it and the top fixing lets go: the cross turns over and hangs upside down on the frieze,
  // and a hatch in the boards in front of the visitor lifts on a red stair going down
  // (src/pieces/egg-cellar.js, which that file builds for itself). It is given the pendant — which
  // it lifts into a pivot at the rose so that it can swing when something comes off a wall — and the
  // room's own door rectangle, because the DOOR is still its own: the visitor can walk over and open
  // it by hand, and the crossroads is still what is behind it. The rain and the sound it asks for by
  // their own apis. It used to be handed a storm as well and there is no storm any more.
  const CROSS = eggCross(ctx, { group: g, switches: SWITCHES, pendant, door: room.door, rain: RAIN });
  // ---- THE SPINET under the wide window (src/pieces/props-piano.js) -----------------------------
  // The user: "can we squeeze a piano between the fireplace and the wall under the window?" It is
  // joinery like the tall case and it is the room's TENTH switch — the keys, which start and stop
  // the song. The case itself is a PLACE (walk.js), not a switch, the way the chimney breast is.
  const PIANO_ = buildPiano(ctx, { group: g, switches: SWITCHES, O, M });
  // ---- THE READING TABLE, stage right (src/pieces/props-table.js) -------------------------------
  // It is built HERE and not up where the palm it replaced stood, for one reason: the book on it is
  // a switch, and SWITCHES is not made until the foot of this file. (The palm needed nothing and
  // could be built with the furniture; the first cut of this was, and the page came up with
  // «Cannot access 'SWITCHES' before initialization» and no props at all.)
  const TABLE_ = buildTable(ctx, { group: g, switches: SWITCHES, O, M });

  return {
    group: g,
    // the arbiter itself, for the tools (`hovered`) and for any piece that wants a switch of its own
    switches: SWITCHES,
    // THE MAINS LEVER on the terminal box, stage right. `out` is true when the lever is down and
    // the room is on the one lamp that is not on the mains, `pull()` throws it as a click does (a
    // cut on the next 12 fps drawing, with the clack on the click), `set(out, lit)` throws it with
    // no cue for a still, and hitBox/tapBox are its box on the glass and the box a thumb is given.
    fuse: FUSE,
    // THE CLOCK: `start()` winds the room into it for ten seconds, `t`/`active` say where it is,
    // `?vortex=<t>` and the `vortex-mid` state hold a frame of it for the tools.
    vortex: VORTEX,
    // THE WINE BOTTLE, on the case's bottom board. `fingers` is what is left of five, `pour()` takes one as a
    // click does, `drunk` is whether the room is currently under it, and hitBox/tapBox are the
    // bottle's box on the glass and the box a thumb is given.
    wine: WINE,
    vase: VASE,
    // THE WEATHER. `on` is whether it is raining, `toggle()` starts or stops it (cue, event and all)
    // and `set(on)` puts full rain or none there for a still. There is no hitBox and no tapBox any
    // more and no click: the rain was drawn on the back wall's window and that window has been taken
    // out of the room, so what is left is the sound of it and the shade the room goes down by. See
    // the head of src/pieces/egg-rain.js. Pepe is not touched by any of it, as he never was.
    rain: RAIN,
    // THE FIRE ON THE SHELVES. `burning` is whether anything is alight, `lit` how many of the
    // twelve, `set(on)` lights or douses the lot for a still with no hold and no cue, `held` how
    // long the pointer has rested on the lamp, and hitBox/tapBox are the LAMP's box on the glass
    // and the box a thumb is given — the lamp is the switch; the flames are not touchable.
    fine: FINE,
    // THE DARK, on the lamp behind him. `on` is whether the room is out, `toggle()` works the lamp
    // as a click does (the cut on the next 12 fps drawing, with the click on the click), `set(on)`
    // puts it there for a still with neither, `held` how long it has been out, `box` and `grow` are
    // the mask his face is kept by, and hitBox/tapBox are the lamp's box on the glass and the box
    // a thumb is given. `?dark=1` and the `dark` state hold it for the tools.
    dark: DARK,
    // PEEP THE TOAD, the knock-off on the press's middle bay. `clicks` is how many times he has
    // been pressed, `fallen` whether he is on the floor, `click()` presses him as a visitor does
    // (croak, rock, and on the fifth the fall), `set(fallen)` puts him on the shelf or the floor
    // for a still with no take and no cue, and hitBox/tapBox are his box on the glass and the box
    // a thumb is given — both of which follow him down.
    peep: PEEP,
    // THE HOUSE OF CARDS, on the keyboard. `start()` runs the eight seconds as the code does (and
    // returns false if the room is busy), `active` says whether it is running, `idle` whether it
    // would be allowed to, and `?konami=<t>` / the `konami-house` state hold a frame of it.
    konami: KONAMI,
    // THE DECK LAID OUT FACE UP. `out` is whether it is (the lay-out, the hold or the rake),
    // `open()` lays it as a click on the stack does — returns false if the room is busy — `close()`
    // rakes it home, `show(slug)` brings that card to the lens with its name on the placard and
    // `hide()` puts it back, `poses` is where the seventy-eight lie in world metres, `?deck=<t>`
    // and the `deck-out` state hold a frame of it, and hitBox/tapBox are the squared deck's box on
    // the glass and the box a thumb is given.
    deck: DECK_OUT,
    // THE CROSS on the frieze over the door, and the cellar under the floor. `phase` is shut /
    // falling / opening / open / closing (and day / day-closing for the door by hand), `open` says
    // whether the hatch is open — which is the one fact flow.js and the note the server writes him
    // read — `click()` works the cross as a pointer does and puts it all back on a second one,
    // `set(phase)` holds a phase for a still with no cue, and hitBox/tapBox are the cross's box on
    // the glass and the box a thumb is given. `cellar` is the hatch's own api: its rectangle, its
    // well, the one red, the pose tables, and `bottom` for the room nobody has built down there yet.
    // THE DOOR IS STILL ITS OWN and is reached only from the doorway place (walk.js): `openByDay` /
    // `shutByDay` work it, the room then WALKS OUT to the camera's `crossroads` shot where a drawn
    // sheet outside the wall fills the frame at every window shape, `out` says whether it is up,
    // `castleBox('light'|'dark')` is that castle's box on the glass — the two castles are the
    // switches — `choose('light'|'dark')` takes a road as a click on it does, `path` is what was
    // chosen, and `at(u, v)` is any point of the traced original, in pixels.
    cross: CROSS,
    // THE TALL CASE, for the piece that opens its books. `unit` is the carcase, `books` the spines
    // standing on its boards (each mesh carries `userData.title`), `boards` their heights and
    // `bounds` the carcase in world metres. src/pieces/walk-book.js finds four of them by title.
    tallCase,
    // THE READING TABLE, stage right where the palm stood. `box` is the table in world metres,
    // `chair` the chair pulled to it, `book` the closed book lying on it and where, `hitBox()` and
    // `tapBox()` its box on the glass and the box a thumb is given, and `open()` opens it — which is
    // the very sheet walk-book.js draws, not a second copy of anything.
    table: TABLE_,
    // THE SPINET under the window. `box` is its own carcase in world metres, `keyboard` where the 88
    // are and how far they run, `keyZ(m)` where one key stands, `playing` whether the song is on,
    // `start()`/`stop()`/`toggle()` work the keys as a click does, `beat` where in the piece it is,
    // `down` which keys are pressed in this drawing and `struck` every note the drawing has put a
    // key down for, `hands` what his two rigs are doing, `hold(beat)` freezes a bar of it for a
    // still and `piano-playing` is that as a judging state.
    piano: PIANO_,
    // THE RADIO on the case's middle board, round 8. `station` is 0..1 (0 is off), `tune` the sound piece's own
    // name for it, `turn()` advances one stop as a click does, `set(i)` jumps there without the
    // throw or the crackle, and hitBox/tapBox are the set's box on the glass and the box a thumb
    // is actually given (which is bigger, on a phone).
    radio: RADIO,
    // THE CAT'S LAMP, round 9. `lit` is what is DRAWN (the cut lands on the next 12 fps step, so a
    // click and the drawing are one frame apart on purpose), `toggle()` throws the switch as a
    // click does — cue, event and all — `set(on)` puts it there for a still with neither, and
    // hitBox/tapBox are the cat's box on the glass and the box a thumb is actually given.
    cat: CAT,
    // THE GLOBE on the left bookcase. `spin(v, tilt)` throws it (v is -1..1, the sign the
    // direction; 0 is a tap's own throw), `country` is the last one it handed over, `spinning` says
    // whether it is still turning, and hitBox/tapBox are the sphere's box on the glass and the box
    // a thumb is actually given.
    globe: GLOBE,
    // THE PICTURE OF THIS ROOM, in the frame beside the clock. `geometry` is where the sheet is in
    // world metres (centre, half-extents) — which is what camera.js solves the dive from — `frame`
    // is the whole moulding's size for this window's aspect, `material` is the surface ink.js binds
    // its finished buffer to, hitBox()/tapBox() are the moulding's box on the glass from the live
    // camera and the box a thumb is given, and `click()` works it as a pointer does: the room walks
    // the whole way into the picture and comes back out of it three seconds later. It is the room's
    // ninth switch and the round the scroll came out made it one.
    droste: DROSTE,
    // THE ROW, solved for the window in front of it. The picture's nail is fixed at x 0; what moves
    // with the window's shape is the picture's SIZE and, from that, the clock's x. `gap` is what
    // stands between the clock and the picture's corner blocks and `phoneMargin` what is left
    // outside the clock before a 390x844 plate runs out of wall. A proof measures both off this.
    // THE ROW, solved for the window in front of it. It is not a row on a wall any more: the clock
    // is on the room's axis and the picture is a photograph standing on a bookcase, so what this
    // returns is the photograph's size (which is still the window's business), the shelf it stands
    // on, and the clock's fixed place. A tool reads it; nothing at runtime does.
    get row() {
      return {
        ...layRow(rowAspect(), rowBuffer()),
        shelf: [ROW.shelfL, ROW.shelfR, ROW.shelfTop, ROW.shelfZ],
        phoneRight: ROW.phoneRight,
        clockR: ROW.clockR,
        clockY: ROW.clockY,
        buffer: rowBuffer(),
      };
    },
    // the shop's board over Pepe's head. `mesh` is what a pointer is raycast against, `pivot` is
    // its hook line (rotate that and the board swings on its cord), and w/h are its size in metres.
    // help.js hangs its own tag under the pivot and tips it when the pointer is over the board.
    sign: { mesh: signMesh, pivot: signPivot, w: 1.32, h: 0.33 },
    // THE RUG, FOR THE CAMERA. `plainFrom` is the largest z at which the ground is still bare —
    // the first printed mark on the visitor's side is just past it (measured off the sheet itself
    // with tools/_props-r5-edge.mjs: 1.219, quoted here 3 mm inside that for the pen's own width).
    // A shot may cross the floor anywhere up to this line and find nothing drawn on it; `near` is
    // where the rug itself ends and `fringe` how far its comb hangs past that.
    rug: {
      w: RUG.w,
      near: RUG.near,
      far: RUG.far,
      border: rug.userData.rug.border,
      fringe: rug.userData.rug.fringe,
      plainFrom: RUG.near - rug.userData.rug.border - 0.006,
    },
    // Practicals, for the lighting piece: where the drawn lamps are. There are two now. The floor
    // lamp was the third and the user took it out of the room, so its light goes with it — a source
    // hanging in the air where an object used to be is exactly the kind of lighting this film does
    // not do. lighting.js reads `floor` as optional and douses that lamp when it is absent.
    lamps: {
      table: new THREE.Vector3(-0.36, 0.82 + 0.2, chest.position.z + 0.02),
      pendant: new THREE.Vector3(0, 2.5, 0),
      // The cat's lamp, round 9, and it is the only practical in the room with a switch on it. It
      // sat on the right-hand bookcase top for four rounds and the user has moved the animal into
      // the tall case on the stage-left wall, so the bulb has gone with it: inside the cat, on the
      // case's folio board at world (-1.22, 0.52), a hand's width up into its body and set BACK
      // towards the lining. What the light has to work with in there is the case's own lining and
      // the spines either side of it rather than a wall — which is the same bargain it had on the
      // bookcase top (the plaster behind it) made in a smaller box, and it is why the range on the
      // light in lighting.js is 0.55 m and not a room's worth. lighting.js douses it with the rest
      // and follows `cat.lit`; it carries its own copy of this vector as a fallback and that copy
      // has been moved too.
      cat: new THREE.Vector3(-1.22, 0.52 + 0.14, -2.33 + 0.04 - 0.06),
    },
    // `radio-off` / `radio-a` / `radio-b` / `radio-c` put the needle on a stop for a still, and
    // `cat-lit` is the cat's lamp switched on. Every other name is the room as it stands — which
    // for the cat means OFF, because the room as it stands is a lamp nobody has touched.
    setState(name = 'default') {
      const m = /^radio-(off|a|b|c)$/.exec(name ?? '');
      if (m) RADIO.set(m[1] === 'off' ? 0 : 'abc'.indexOf(m[1]) + 1);
      CAT.set(name === 'cat-lit');
      // `fuse-out` is the lever down with the one lamp that is not on the mains still burning;
      // `fuse-dark` is the same room with that lamp out. Every other name puts the mains back.
      FUSE.set(name === 'fuse-out' || name === 'fuse-dark', name !== 'fuse-dark');
      VORTEX.setState(name);
      WINE.setState(name); // `wine-drunk`; every other name puts the bottle back
      if (name === 'globe-spinning') GLOBE.showSpinning();
      else GLOBE.reset();
      VASE?.setState(name);
      // `rain` is full rain behind the panes with the room one shade down; every other name is a dry
      // afternoon, which is where a reload always puts it
      rainState(RAIN, name);
      // `fine-burning` is the dozen flames alight; every other name is a room that is fine
      FINE.setState(name);
      // `dark` is the room painted out with his eyes and his mouth left on it; every other name is
      // a room with the lights on, which is where a reload always puts it
      DARK.setState(name);
      // `peep-fallen` is the toad on the boards in front of the press; every other name has him
      // standing on the shelf, which is where a reload always puts him
      PEEP.setState(name);
      // `konami-house` is the house of cards standing on the cloth; every other name puts the deck
      // back exactly as it was
      KONAMI.setState(name);
      // `cross-open` is the cross hanging upside down on the frieze with the floor open under a red
      // stair and the room leaning in to look down it. Every other name is a cross on a wall nobody
      // has touched and a floor with no hole in it. (`cross-storm`, `cross-out` and `cross-dark`
      // were the storm's three and went out with it.)
      CROSS.setState(name);
      // `deck-out` is the whole deck laid face up on the cloth, seen from the plan view; every
      // other name puts the deck back exactly as it was standing. LAST of the eggs, because it is
      // the only one besides the cross that takes the camera, and the cross's own `shut` sends the
      // lens home — a state that cut the plate before it would be shown from the parlour.
      DECK_OUT.setState(name);
      // `piano-playing` is a bar of the Gymnopédie held with the keys down and his hands on them
      PIANO_.setState(name);
    },
    update(ctx) {
      if (!ctx.clock.stepped) return;
      const p = g.userData.pendulum;
      if (p) p.rotation.z = 0.16 * Math.sin(ctx.clock.t * Math.PI);
      tellTheTime();
      SWITCHES.update();
      RADIO.update(ctx);
      CAT.update();
      FUSE.update(ctx);
      VORTEX.update(ctx); // last: while it runs, the hands and the bob are its own
      WINE.update(ctx);
      GLOBE.update(ctx);
      VASE?.update(ctx);
      RAIN?.update(ctx);
      FINE.update(ctx);
      DARK.update(ctx);
      PEEP.update(ctx);
      KONAMI.update(ctx);
      DECK_OUT.update(ctx);
      CROSS.update(ctx); // after RAIN: the weather sets its own light and the storm sits over it
      PIANO_.update(ctx);
    },
  };
}
