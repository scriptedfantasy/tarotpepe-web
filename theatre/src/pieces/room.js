// PIECE: room — the parlour set itself: floorboards, three papered walls with wainscot, dado,
// picture rail, frieze and cornice, a panelled door with a transom light stage right, two windows
// — a tall shuttered one on the stage-right wall and a wide three-light one on the stage left — a
// plain ceiling. Frontal, symmetrical, drawn with a pen: the geometry carries the
// drawing (real slats, real panels, real mouldings — the ink pass draws lines where there are
// edges), the textures carry only the PATTERN of what things are made of.
//
// THE BACK WALL HAS NO WINDOW. It had one, stage left, opposite the door: a casement in a reveal
// with two louvred leaves folded flat over the plaster to x -0.50. The user: "i'd also like to
// remove the window in the back left, we can then place the room drawing in the middle behind pepe
// and the clock off to the left." So that stretch is plain papered field now, the dado and the
// picture rail run through it as they do everywhere else on this wall, and the room's one window is
// the stage-right one. What went with it: the reveal, the architrave, the sill, the casement and
// its glass, the two shutter leaves, the telephone LEAD-IN through the head — and, in props.js, the
// curtains.
//
// AND THE RADIATOR HAS GONE TOO, ONE CHANGE LATER. It survived the window because it is furniture
// and not joinery, and it stood on that plaster under the tall case props.js put over it, between
// the case's four legs. The user, looking at that foot: "why is the bottom part of the book shelf
// black? it should be the same as above." The case now stands on the floor on a plinth, flush with
// the skirting — so there is no wall left in front of the iron and nothing to see of it — and 0.9 m
// of solid ink at the bottom of that corner was the fault being pointed at. `buildRadiator` has
// gone with it and Pepe no longer answers for one (mind-room.js). The room is heated by nothing,
// which is a thing this building would do.
//
// AND THE STAGE-LEFT WALL HAS A WINDOW NOW. It carried a switchboard and a framed diagram, both
// props' rather than the set's, and the user had the pair taken out: "then let's remove both of
// these, they don't make sense anymore. add a wide window instead." So there is a wide one — the
// same sill, head, reveal and joinery as the stage-right casement, three lights instead of two,
// and no shutters, because a window that takes its whole wall leaves nowhere to fold one. It is
// solved at the openings below under THE WIDE WINDOW ON THE STAGE-LEFT WALL.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { Parts, subtractRect, makeWarp } from './room-build.js';
// `ghostTexture` is still in room-textures.js and is deliberately not imported: see THE GHOST HAS GONE.
import { wallpaperTexture, wainscotTexture, floorTexture, grainTexture, plainTexture, enamelTexture, cardTexture } from './room-textures.js';

export const meta = {
  name: 'room',
  judge: { shot: 'wide', states: ['default'] },
  files: ['src/pieces/room.js', 'src/pieces/room-build.js', 'src/pieces/room-textures.js'],
};

// Heights of the wall bands (metres from the floor).
const BAND = {
  skirt: [0, 0.165],
  wainscot: [0.165, 0.905],
  dado: [0.905, 0.97],
  field: [0.97, 2.6],
  rail: [2.6, 2.64],
  frieze: [2.64, 2.98],
  cornice: [2.98, 3.1],
};

// THE GHOST HAS GONE, AND IT WENT WITH THE PICTURE THAT WAS HANGING OVER IT.
//
// What it was: the rectangle of wallpaper the tall multiple stood against until the automatic
// exchange came in and it was unbolted for scrap - 0.78 x 0.81 of unfaded paper at x +/-0.39,
// y 0.97..1.78, cut out of the papered field and laid back 0.6 mm proud so that nothing about the
// geometry said a rectangle was there. The rectangle itself was never the drawing. What the eye
// actually got of it was its HARDWARE: four bolt holes, each a filled disc with a burst of pulled
// plaster round it, and two cut cable ends at the top where the multiple's tails were sheared off
// flush (room-textures.js, `ghostTexture`).
//
// And that hardware was only ever ACCEPTABLE because a picture hung over it. This file said so
// itself, in the comment that used to stand here: "A rectangle any wider would push its own head
// out past the frame as two short stubs of tone with nothing to explain them." The user has now
// moved the picture off this wall onto a bookcase top - "the room image instead should be in a
// photo frame where the cat now stands" - and the head of the rectangle came out from behind it
// exactly as predicted: two cable stubs and two bolt-bursts, floating on bare plaster under the
// clock, at the one place on this wall the film wants nothing at all. Rendered and looked at, they
// read as scribble and not as history.
//
// The rectangle could have been shortened to hide its head behind Pepe instead, and that was tried
// on paper: his crown casts onto this plaster at 1.4001 from the `pepe` shot but only 1.2934 from
// `wide`, so a head low enough to hide at one plate stands clear of him at another, and the cable
// ends are drawn from the top edge and would have come down with it onto his own silhouette. There
// is no height that works at all three shapes. So it is out, and the wall behind him is what the
// film has always asked that wall to be: bare plaster, with one clock on it.
//
// `ghostTexture` stays in room-textures.js, unbuilt, the way `barCart`, `curtainSet`, `floorLamp`
// and `hatStand` stay in props-objects.js.

// The cable duct: a wooden trough along both side walls with an iron cleat every 0.9 m. 2.30 is
// its UNDERSIDE, which is the line the camera sees — it is always below it — and it is also what
// makes the run fit: the side doors' architrave caps top out at 2.261 and the picture rail starts
// at 2.6, so a 90 mm trough hung at 2.30 clears both without touching either.
const DUCT = { y: 2.3, h: 0.09, d: 0.06, cleat: 0.9 };

// The enamel plate on the door's middle rail, and his visiting card pinned to the fielded panel
// under it. Both are one-off sheets stretched over a named rectangle of the door (see
// `worldRectUV`), which is why their coordinates live up here: the material has to know where the
// part is going to stand before the part is made. The rail runs 1.156–1.256 and the panel's raised
// centre 0.851–1.071, so neither of them lands on a moulding.
const PLATE = { x0: 1.35, x1: 1.65, y0: 1.167, y1: 1.245 };
const CARD = { x0: 1.435, x1: 1.565, y0: 0.989, y1: 1.067 };

// Moulding profiles: stacked boxes [y0, y1, depth]. Kept to one or two steps each: every step
// is a pair of parallel lines in the drawing, and the film draws a cornice with two, not six.
const PROFILE = {
  skirt: [[0, 0.165, 0.026]],
  dado: [[0.905, 0.97, 0.036]],
  rail: [[2.6, 2.625, 0.018]], // a small bead: one line in the drawing, not a band
  cornice: [[2.98, 3.1, 0.07]], // one step: a line below, a line at the ceiling
};

export async function build(ctx) {
  const { width: W, depth: D, height: H } = ctx.layout.room;
  const hx = W / 2, zb = -D / 2; // half width, back wall z
  // The side walls, the floor and the ceiling run well past the front of the room, past every
  // camera position on the rail (the furthest is z = 6.2), so no shot can ever see the end of the
  // set: the box always runs off the edge of the frame instead of stopping in blank paper.
  const overrun = 4.2;
  const g = new THREE.Group();
  g.name = 'room';

  // ---- materials (paper white; the ink pass adds tone via userData.ink.hatch) ----
  const mat = (name, map, ink) => {
    const m = inkMaterial({ map, ...ink });
    m.name = name;
    m.userData.tile = map?.userData.tile ?? 1;
    return m;
  };
  const grain = grainTexture();
  const M = {
    paper: mat('wallpaper', wallpaperTexture(), { hatch: 0.3 }),
    side: mat('sidewall', plainTexture(), { hatch: 0.34 }),
    // The frieze — the band between the picture rail and the cornice, all round the room — is bare
    // plaster: no pattern, no motif, the lightest hatch in the set. It is the room's one big rest,
    // the empty upper wall the drawings always keep (fd-anim-kitchen-table-cards-hires), and the
    // rail below it and the cornice above are its contour.
    plaster: mat('plaster', plainTexture(), { hatch: 0.12 }),
    // The wainscot band is the room's point of rest below the dado: broad boards, four seams to
    // the metre, and tone only in the corners the light cannot reach. It used to ask for 0.36 of
    // hatch on top of a picket-fence texture and it went to half ink.
    wainscot: mat('wainscot', wainscotTexture(), { hatch: 0.24 }),
    floor: mat('floor', floorTexture(), { hatch: 0.3 }),
    // The joinery — cornice, rails, skirting, architraves, sashes, shutters — is PAINTED WOOD and
    // the drawings leave it white: a cornice is two lines, a shutter is a white leaf with a dozen
    // strokes across it. These faces are narrow (a 60 mm soffit is ten screen pixels), so any hatch
    // they take lands as scribble rather than tone. Hence the low numbers: the line does the work.
    trim: mat('trim', plainTexture(), { hatch: 0.22, lineWeight: 1.15 }),
    // The inside faces of the openings carry tone — but only a little more than plain paper. At
    // 0.66 the standing bias put a jamb straight onto the ink pass's crowded level, and a lining
    // seen near edge-on (which is how a reveal is nearly always seen) came out as a wire brush
    // rather than as rain strokes. The pocket term does the rest where the set folds in on itself.
    reveal: mat('reveal', plainTexture(), { hatch: 0.55, lineWeight: 1.1 }),
    wood: mat('wood', grain, { hatch: 0.38, lineWeight: 1.1 }), // the door leaves
    shutter: mat('shutter', plainTexture(), { hatch: 0.24, lineWeight: 1.1 }), // painted: no grain drawn on a shutter
    glass: mat('glass', plainTexture({ tint: '#fbf9f3' }), { hatch: 0.04, lineWeight: 0.8 }),
    ceiling: mat('ceiling', plainTexture(), { hatch: 0.08 }),
    metal: mat('metal', plainTexture(), { hatch: 0.85, lineWeight: 1.2 }),
    iron: mat('iron', plainTexture(), { hatch: 0.42, lineWeight: 1.1 }),
    dark: mat('dark', plainTexture(), { hatch: 1, lineWeight: 1 }), // a hole: cross-hatched to black
  };
  // The unfaded rectangle of paper. Same hatch and the same line weight as the paper round it, so
  // the ink pass has no reason to draw a contour where one wall segment stops and the other starts:
  // the only thing that changes across that edge is how much print is left on the paper.
  // `lineWeight: 0` is the whole trick and it is not decoration. The ink pass draws a contour
  // wherever two OBJECTS meet, and the ghost is a second object let into the wall — so round 3's
  // first cut came out as a rectangle ruled round in pen, which is a stain or a panel and the exact
  // opposite of what a ghost is. 0 tells the pass to draw no line round this thing at all; the
  // sheet's own marks still come through the map, and the boundary is then a change of tone with
  // nothing drawn on it. The rectangle is stated by four bolt holes and by the paper, or not at all.
  // (the ghost's own sheet is not made any more: see THE GHOST HAS GONE at the head of this file)
  M.plate = mat('plate', enamelTexture({ w: PLATE.x1 - PLATE.x0, h: PLATE.y1 - PLATE.y0 }), { hatch: 0.35, lineWeight: 1 });
  M.plate.userData.uvRect = { u0: PLATE.x0, u1: PLATE.x1, v0: PLATE.y0, v1: PLATE.y1 };
  M.card = mat('card', cardTexture({ w: CARD.x1 - CARD.x0, h: CARD.y1 - CARD.y0 }), { hatch: 0.18, lineWeight: 1 });
  M.card.userData.uvRect = { u0: CARD.x0, u1: CARD.x1, v0: CARD.y0, v1: CARD.y1 };

  // every vertex goes through the hand's warp: no edge in the set is ruler-straight
  const P = new Parts({ warp: makeWarp({ amp: 0.02, hx, zb, H, seed: 3 }) });
  const jit = mulberry32(19); // the hand that sets the slats
  if (ctx.params?.has('roomdebug')) {
    M.glass.color.set('#ff0000');
    M.metal.color.set('#0000ff');
  }

  // ---- openings (in each wall's own plane: u along the wall, y up) ----
  // The back wall has ONE opening now: the door, stage right. Where the window was — x −1.95 to
  // −1.05, sill 1.04, head 2.45 — the bands below simply run through, because the hole is no longer
  // in `holes` and nothing else about that wall was ever special-cased for it.
  const door = { x0: 1.05, x1: 1.95, y0: 0, y1: 2.45, top: 2.12, depth: 0.1 };
  // The stage-right window; its u axis is world z (u = z). It carries the same joinery the back
  // wall's did, which is why `buildWindow` is still here and still general.
  const sideWin = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.21 };
  // ---- THE WIDE WINDOW ON THE STAGE-LEFT WALL ----------------------------------------------------
  // The user, given a crop of that wall with a switchboard on it and a framed diagram beside it:
  // "then let's remove both of these, they don't make sense anymore. add a wide window instead."
  // So there is one, and it is THE SAME WINDOW THE ROOM ALREADY HAS, laid down longer: the same
  // sill at 1.04, the same head at 2.45, the same 0.21 reveal, the same architrave, sill board,
  // apron, brackets, frame ring and glazing bars. Two windows in one house are one window twice.
  //
  // WHERE ITS TWO ENDS ARE, and both of them are somebody else's edge (tools/_left-wall-where.mjs
  // prints this wall and where every plate stops on it):
  //   z -2.500  THE BACK CORNER, and the hard stop upstage. The side wall starts at the back wall's
  //             own plane and there is nothing past it, so the widest thing on this window — the
  //             SILL BOARD, which oversails the architrave by a + 45 mm = 135 — may not reach it.
  //             At x0 -2.34 the sill ends at -2.475, 25 mm inside the angle.
  //   z -0.860  where it stops, and what stops it is the CHIMNEY BREAST that comes onto this wall
  //             downstage of it: the breast stands z -0.60 .. 0.50 and this window's cap moulding
  //             ends at -0.75, so there is 150 mm of plaster between the two.
  //   1.48 m    what is left in the clear, which is a wide window: the stage-right one is 0.90, and
  //             this one is 1.48 wide against its own 1.41 high — the first opening in this room
  //             that is broader than it is tall. It is 62 % of the 2.372 m of this wall a 1280x800
  //             `home` plate sees at all (that plate's left edge crosses this plane at z -0.128; a
  //             1600x900 reaches 0.524) and the chimney breast has the rest of it.
  //   3 lights  0.4547 m each in the clear. Two leaves at this width are 0.74 m apiece, which is a
  //             French door and not a casement; three are the proportion the stage-right pair has.
  //   NO SHUTTERS, and the reason is measured. A louvred leaf is 0.46 wide and folds onto the
  //             plaster OUTSIDE the architrave. There is 70 mm of wall upstage of this architrave
  //             and 150 downstage before the breast: there is nowhere for either leaf to go. The
  //             stage-right window keeps its pair; this one has none, which is also why Pepe
  //             answers for the two of them differently (mind-room.js).
  const sideWinL = { x0: -2.34, x1: -0.86, y0: 1.04, y1: 2.45, depth: 0.21 };
  // ---- THE FIREPLACE, on the same wall, downstage of the window ----------------------------------
  // The user: "Put a fireplace on the left wall — the fire easter egg should not originate from the
  // light behind Pepe, but from the fireplace." It is JOINERY AND IRON and it belongs to this file,
  // the way the door, the two windows and the radiator that used to stand here did; what WORKS it is
  // props' (src/pieces/egg-fine.js), and all that file is given is the numbers below.
  //
  //   z -0.60 .. 0.50   THE BREAST, 1.10 m of wall. Upstage it is stopped by the wide window's cap
  //             moulding at -0.75, which leaves 150 mm of plaster; downstage by the press door's
  //             architrave at 0.86, which leaves 360. Its downstage face is at z 0.50 and the
  //             1280x800 `home` plate, which stops at z -0.128 ON THE PLASTER, reaches z 0.427 on a
  //             surface standing 240 mm proud of it — so the whole of this breast but 73 mm of its
  //             downstage return is in the conversation shot on a laptop, and all of it at 1600x900.
  //   proj 0.24 THE FACE, at x -2.36. Deep enough for a firebox and its jambs, and 240 is also what
  //             makes the thing read as a breast and not a panel at the rake this wall is seen from.
  //   y 0 .. 2.98  floor to the cornice's own bottom line. A chimney breast goes up through a room;
  //             one that stopped at the picture rail would be a cupboard. The SKIRTING, the DADO
  //             RAIL, the PICTURE RAIL and the CORNICE all return round it — four horizontals that
  //             step out and back at the same two verticals, which is the most characteristic
  //             drawing a Victorian room has and exactly what a wall seen at 67 degrees wants.
  //   y 1.22    THE MANTEL. A 40 mm shelf oversailing the breast by 60 mm each way, with a frieze
  //             under it: the one strong horizontal on this wall, with a black hole below it.
  //   0.62 x 0.66  THE OPENING, centred on the breast at z -0.05, 0.20 to 0.86. It was drawn 0.80
  //             tall for one pass and at this rake a 0.62 x 0.80 hole is a SLOT — it read as a
  //             doorway with the door off, and the grate sat in the bottom third of it with a foot
  //             of black over its head. Squared up it reads as a fire opening and the grate fills
  //             half of it. It is the SOLID DARK this prop owes the round-1 critic and the breast
  //             and mantel are its bare white. The iron slip round it tops out at 0.915, INSIDE the
  //             dado band (0.905..0.970), so the dado rail's run across the face is broken and dies
  //             into the chimneypiece either side, which is what a dado rail does when it meets one.
  // AND NOTHING STANDS ON THE MANTEL. The room always keeps one big empty area and this wall has
  // just spent the rest of itself on a window; the plaster over this shelf is where that area went.
  const fire = { x0: -0.6, x1: 0.5, proj: 0.24, top: 2.98, mantel: 1.22, open: 0.62, sill: 0.2, head: 0.86, slab: 0.34, slip: 0.055 };
  // Downstage on each side wall, level with the visitor's shoulder, a second door: the way in from
  // the landing (stage right) and the door of a press (stage left). They sit in the stretch of side
  // wall that only the long door/window/track shots see — in those the lens is a metre from the
  // wall and it races across a third of the frame, so it has to carry drawing, not bare paper.
  // 0.98 m and 0.86 m in the clear: a door reads as a door at that proportion to its 2.12 m head.
  // (The right one was 1.12 m — a barn opening, which is part of why it looked like scenery.)
  const sideDoorR = { x0: 0.9, x1: 1.88, y0: 0, y1: 2.12, depth: 0.11 };
  const sideDoorL = { x0: 0.96, x1: 1.82, y0: 0, y1: 2.12, depth: 0.11 };

  // ---- floor and ceiling ----
  P.plane(W, D + overrun, 0, 0, overrun / 2, M.floor, { rx: -Math.PI / 2, receive: true });
  P.plane(W, D + overrun, 0, H, overrun / 2, M.ceiling, { rx: Math.PI / 2 });

  // ---- walls: bands per wall, cut around the openings ----
  // The back wall is the dressed flat (wainscot, dado, papered field, rail, frieze, cornice).
  // The side walls are plain paper between skirting and cornice, as in the film's interiors:
  // they recede in perspective and every horizontal on them converges hard, so they carry as
  // few lines as possible and let the ink pass hatch them toward the corners.
  const backBands = [
    ['wainscot', M.wainscot],
    ['field', M.paper],
    ['frieze', M.plaster],
    ['skirt', M.trim], // wall behind the skirting (keeps the corners closed)
    ['dado', M.trim],
    ['rail', M.trim],
    ['cornice', M.trim],
  ];
  // The side walls now carry the same dado as the back wall — skirting, boarded wainscot, dado
  // rail — and the same picture rail and plain frieze above. Frontally they are slivers and it
  // costs nothing; raked (the door shot) those four long horizontals converge across the frame and
  // the wall reads as a wall instead of as the end of the paper. The field between them stays plain
  // plaster: no wallpaper motif on a surface that steep, it would mip into noise.
  const sideBands = [
    ['skirt', M.trim],
    ['wainscot', M.wainscot],
    ['dado', M.trim],
    ['field', M.side],
    ['rail', M.trim],
    ['frieze', M.plaster],
    ['cornice', M.trim],
  ];
  const BANDS = { ...BAND };
  const uEnd = zb + D + overrun;
  const walls = [
    // back wall: u = x, plane at z = zb facing +z
    { u0: -hx, u1: hx, holes: [door], bands: backBands, place: (u, y, w, h, m, out = 0) => P.plane(w, h, u, y, zb + out, m, { receive: true }) },
    // stage-left wall: u = z, plane at x = -hx facing +x
    { u0: zb, u1: uEnd, holes: [sideWinL, sideDoorL], bands: sideBands, place: (u, y, w, h, m) => P.plane(w, h, -hx, y, u, m, { ry: Math.PI / 2, receive: true }) },
    // stage-right wall: u = z, plane at x = +hx facing -x
    { u0: zb, u1: uEnd, holes: [sideWin, sideDoorR], bands: sideBands, place: (u, y, w, h, m) => P.plane(w, h, hx, y, u, m, { ry: -Math.PI / 2, receive: true }) },
  ];
  for (const wall of walls) {
    for (const [band, m] of wall.bands) {
      const [y0, y1] = BANDS[band];
      let rects = [{ x0: wall.u0, x1: wall.u1, y0, y1 }];
      for (const h of wall.holes) rects = subtractRect(rects, h);
      // no wall carries a `ghost` any more; the mechanism is left because it is three lines and it
      // is how any let-in panel would be built on any of these walls
      if (wall.ghost && band === 'field') rects = subtractRect(rects, wall.ghost);
      for (const r of rects) wall.place((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.x1 - r.x0, r.y1 - r.y0, m);
    }
  }

  // ---- mouldings (no cast shadows: a long bar throws a band across the set) ----
  const backRun = (profile, x0, x1) => {
    for (const [y0, y1, d] of profile) P.boxFrom(x0, x1, y0, y1, zb, zb + d, M.trim, { receive: true });
  };
  // A run along a side wall, in z, optionally broken where a side door's architrave lands.
  // `gaps` is a list now and not one pair: the stage-left wall has TWO things that break a run —
  // the press door (the low mouldings only) and the chimney breast (all four of them, because a
  // breast is the full height of the wall and every horizontal on it steps round the thing).
  const sideRun = (profile, side, gaps = []) => {
    for (const [y0, y1, d] of profile) {
      const x0 = side < 0 ? -hx : hx - d, x1 = side < 0 ? -hx + d : hx;
      // runs into the back-wall moulding (same material, so the overlap is invisible and the
      // corner closes without an end face showing)
      let spans = [[zb, uEnd]];
      for (const [g0, g1] of gaps) {
        const next = [];
        for (const [z0, z1] of spans) {
          if (z0 < g0) next.push([z0, Math.min(z1, g0)]);
          if (z1 > g1) next.push([Math.max(z0, g1), z1]);
        }
        spans = next;
      }
      for (const [z0, z1] of spans) if (z1 > z0) P.boxFrom(x0, x1, y0, y1, z0, z1, M.trim, { receive: true });
    }
  };
  const a0 = 0.1; // the architraves interrupt the skirting and the dado rail
  for (const key of ['skirt', 'dado', 'rail', 'cornice']) {
    const prof = PROFILE[key];
    const low = key === 'skirt' || key === 'dado';
    if (low) {
      backRun(prof, -hx, door.x0 - a0);
      backRun(prof, door.x1 + a0, hx);
    } else backRun(prof, -hx, hx);
    // the breast interrupts EVERY run on the stage-left wall; the press door only the low pair
    const breast = [fire.x0 - PROFILE[key][0][2], fire.x1 + PROFILE[key][0][2]];
    sideRun(prof, -1, low ? [[sideDoorL.x0 - a0, sideDoorL.x1 + a0], breast] : [breast]);
    sideRun(prof, 1, low ? [[sideDoorR.x0 - a0, sideDoorR.x1 + a0]] : []);
  }

  // ---- what the PTT left on the side walls ----
  buildDuct(P, M, { hx, zb, uEnd, sideWin, sideWinL });
  buildTerminalBox(P, M, hx, 0.12);

  // ---- the openings ----
  buildDoor(P, M, door, zb);
  buildSwitch(P, M, door.x0 - 0.1 - 0.16, 1.22, zb);
  // a mouse hole in the skirting, stage right of the door: an arch of solid hatch
  P.add(new THREE.CircleGeometry(0.048, 14, 0, Math.PI), M.dark, { x: door.x1 + 0.1 + 0.42, y: 0.004, z: zb + PROFILE.skirt[0][2] + 0.002 });
  // the side window is the back-wall window rotated onto the stage-right wall: local +z → world −x
  // (local x → world +z, so a u range reads straight off as a z range)
  const rightFrame = new THREE.Matrix4().makeTranslation(hx - Math.abs(zb), 0, 0).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
  // stage left: local +z → world +x, local x → world −z (so u ranges are negated below)
  const leftFrame = new THREE.Matrix4().makeTranslation(-hx - zb, 0, 0).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  P.withFrame(rightFrame, () => {
    // THE LEAD-IN comes in HERE now, and it is better here than it was. It was driven through the
    // back wall's window head, which was the far side of the room from the wiring; the duct runs the
    // stage-right wall and stops at this window's shutters, and the terminal box stands beside the
    // way-in door on this same wall. So the pair now drops past the head of the only window there
    // is, twelve feet from the box it ends in, and the sentence reads in one direction.
    buildWindow(P, M, sideWin, zb, jit, { leadIn: true });
    buildSideDoor(P, M, sideDoorR, zb, { knob: 1 });
    buildSwitch(P, M, sideDoorR.x0 - 0.1 - 0.17, 1.22, zb); // the switch by the way in
  });
  P.withFrame(leftFrame, () => {
    // the left frame maps local x to world -z, so a u range on this wall is negated to be built
    // (the press door has done this for as long as there has been one)
    buildWindow(P, M, { ...sideWinL, x0: -sideWinL.x1, x1: -sideWinL.x0 }, zb, jit, { shutters: false, lights: 3 });
    buildFireplace(P, M, { ...fire, x0: -fire.x1, x1: -fire.x0 }, zb, BAND);
    buildSideDoor(P, M, { ...sideDoorL, x0: -sideDoorL.x1, x1: -sideDoorL.x0 }, zb, { knob: -1, press: true });
  });

  P.build(g, 'room');
  ctx.scene.add(g);
  // TWO WINDOWS, EACH IN ITS OWN WALL'S PLANE (u = world z, in both cases). `sideWindow` is the
  // tall shuttered casement on the stage-right wall and `leftWindow` the wide three-light one on
  // the stage left. `window` is NOT published and the absence is the point: there is no window on
  // the BACK wall to be asked about. Anything that still reads `room.window` gets undefined and
  // falls to its own fallback, which would put a drawing back on plaster — so the readers were
  // changed rather than left to fall: lighting.js, props.js, egg-rain.js, egg-cross.js.
  // …and `fireplace` in world metres, because the only thing that reads it is a pointer: `wall` is
  // the plaster, `face` the breast's front, `z0/z1` the breast along the wall, `opening` the black
  // rectangle a visitor clicks, and `grate` the middle of the firebox floor, which is where the
  // first tongue of egg-fine.js's fire now stands.
  const fireWorld = {
    wall: -hx,
    face: -hx + fire.proj,
    z0: fire.x0,
    z1: fire.x1,
    mantel: fire.mantel,
    opening: { z0: (fire.x0 + fire.x1) / 2 - fire.open / 2, z1: (fire.x0 + fire.x1) / 2 + fire.open / 2, y0: fire.sill, y1: fire.head },
    grate: { x: -hx + fire.proj - 0.1, y: fire.sill, z: (fire.x0 + fire.x1) / 2 },
  };
  return { group: g, sideWindow: sideWin, leftWindow: sideWinL, fireplace: fireWorld, door, bands: BAND, setState() {} };
}

// A casement window in a reveal, an architrave, a sill, and (if there is wall for them) two louvred
// shutters folded back flat against it on either side — their slats are real: thin angled boxes.
//
// `lights` is HOW MANY LEAVES the casement is divided into and it is the only thing that is not the
// same for the room's two windows. At two it is exactly the drawing this function has always made:
// a pair meeting in the middle, 8 mm between their meeting stiles. At three — which is what the
// wide one on the stage-left wall asks for — it is the same leaf, the same stiles, the same glazing
// bar a third of the way down, laid three times across the opening, and the fastening goes on the
// MIDDLE meeting rather than the only one. The arithmetic is written so that `lights: 2` comes out
// at the same numbers to the millimetre: a leaf is (clear - 0.008 * (lights - 1)) / lights and the
// first one starts at x0 + f, which for two puts the meeting at (x0 + x1) / 2 ± 0.004 as before.
//
// `shutters` is whether there is anywhere to fold a leaf. See sideWinL, above: a window that takes
// the whole of its wall has no plaster either side of the architrave, and a louvred leaf nailed to
// nothing is worse than no shutter at all.
function buildWindow(P, M, w, zb, jit = Math.random, { leadIn = false, shutters = true, lights = 2 } = {}) {
  const { x0, x1, y0, y1, depth } = w;
  const zr = zb - depth; // the back of the reveal
  // reveal faces (jambs, head, sill-bed): they carry tone, like the door reveal in the film
  P.boxFrom(x0 - 0.01, x0, y0, y1, zr, zb, M.reveal, { receive: true });
  P.boxFrom(x1, x1 + 0.01, y0, y1, zr, zb, M.reveal, { receive: true });
  P.boxFrom(x0 - 0.01, x1 + 0.01, y1, y1 + 0.01, zr, zb, M.reveal, { receive: true });
  P.boxFrom(x0 - 0.01, x1 + 0.01, y0 - 0.01, y0, zr, zb, M.reveal, { receive: true });
  // back of the reveal: daylight (paper), behind the casement
  P.plane(x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, zr + 0.002, M.glass);
  // architrave on the wall face, with a bead on its inner edge (the same case as the doors)
  const a = 0.09, ad = 0.028;
  P.boxFrom(x0 - a, x0, y0 - 0.02, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x1, x1 + a, y0 - 0.02, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x0 - a, x1 + a, y1, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  const wb = 0.015;
  P.boxFrom(x0 - wb, x0, y0 - 0.02, y1 + wb, zb + ad, zb + ad + 0.011, M.trim, { cast: true });
  P.boxFrom(x1, x1 + wb, y0 - 0.02, y1 + wb, zb + ad, zb + ad + 0.011, M.trim, { cast: true });
  P.boxFrom(x0 - wb, x1 + wb, y1, y1 + wb, zb + ad, zb + ad + 0.011, M.trim, { cast: true, uvSwap: true });
  // a small cap moulding over the head
  P.boxFrom(x0 - a - 0.02, x1 + a + 0.02, y1 + a, y1 + a + 0.03, zb, zb + ad + 0.02, M.trim, { cast: true });
  // Sill: a board that oversails the architrave, with a moulded nose under it and an apron below.
  // It used to be one 40 mm slab whose whole drawing was a single line, and the bar cart that stood
  // in front of the back wall's window swallowed that line whole. Now it is three lines deep and it
  // projects 130 mm, so it reads over the top of anything props stand under it
  // (fd-anim-staircase-guitar-room's windows sit on exactly this: a board, a nose, an apron).
  P.boxFrom(x0 - a - 0.045, x1 + a + 0.045, y0 - 0.045, y0, zr + 0.02, zb + 0.13, M.trim, { cast: true, receive: true });
  P.boxFrom(x0 - a - 0.03, x1 + a + 0.03, y0 - 0.075, y0 - 0.045, zr + 0.02, zb + 0.1, M.trim, { cast: true });
  P.boxFrom(x0 - a + 0.01, x1 + a - 0.01, y0 - 0.14, y0 - 0.075, zb, zb + 0.032, M.trim, { cast: true });
  // two small brackets under the apron, at the ends
  for (const bx of [x0 - a + 0.06, x1 + a - 0.06]) P.box(0.03, 0.09, 0.06, bx, y0 - 0.105, zb + 0.05, M.trim, { cast: true });

  // casement: frame ring in the reveal, a centre mullion, two leaves each with a transom bar
  const zf0 = zr + 0.03, zf1 = zr + 0.08; // frame depth band
  const f = 0.05;
  P.boxFrom(x0, x0 + f, y0, y1, zf0, zf1, M.trim);
  P.boxFrom(x1 - f, x1, y0, y1, zf0, zf1, M.trim);
  P.boxFrom(x0, x1, y1 - f, y1, zf0, zf1, M.trim);
  P.boxFrom(x0, x1, y0, y0 + f, zf0, zf1, M.trim);
  // leaves: casements meeting stile to stile (no mullion — the film's windows are plain leaves
  // whose meeting stiles make one double line). Two of them, or three on the wide window.
  const zl0 = zf0 + 0.008, zl1 = zf1 - 0.008;
  const s = 0.042, rt = 0.05, rb = 0.075;
  const gap = 0.008; // between one leaf's shutting stile and the next one's
  const leafW = (x1 - f - (x0 + f) - gap * (lights - 1)) / lights;
  const leaves = [];
  for (let i = 0; i < lights; i++) {
    const lx0 = x0 + f + i * (leafW + gap);
    leaves.push([lx0, lx0 + leafW]);
  }
  for (const [lx0, lx1] of leaves) {
    P.boxFrom(lx0, lx0 + s, y0 + f, y1 - f, zl0, zl1, M.trim);
    P.boxFrom(lx1 - s, lx1, y0 + f, y1 - f, zl0, zl1, M.trim);
    P.boxFrom(lx0, lx1, y1 - f - rt, y1 - f, zl0, zl1, M.trim);
    P.boxFrom(lx0, lx1, y0 + f, y0 + f + rb, zl0, zl1, M.trim);
    // One glazing bar a third of the way down: it cuts a small upper light off each leaf, which is
    // exactly what the casements in fd-anim-staircase-guitar-room do. The bar is a BAR — 26 mm, so
    // the pen draws two lines close together, not a 7-pixel black stripe.
    const yt = y1 - f - (y1 - y0 - 2 * f) * 0.34;
    P.boxFrom(lx0, lx1, yt - 0.013, yt + 0.013, zl0, zl1, M.trim, { uvSwap: true });
    // glass: two panes, the small upper light and the tall one, each its own sheet so the bar has
    // glass on both sides of it and the daylight stays bare paper (it is never a fill: M.glass
    // asks the ink pass for almost no tone, so what is drawn here is the joinery and nothing else)
    const gx = (lx0 + lx1) / 2, gw = lx1 - lx0 - 2 * s;
    const gz = (zl0 + zl1) / 2;
    P.plane(gw, y1 - f - rt - (yt + 0.013), gx, (y1 - f - rt + yt + 0.013) / 2, gz, M.glass);
    P.plane(gw, yt - 0.013 - (y0 + f + rb), gx, (yt - 0.013 + y0 + f + rb) / 2, gz, M.glass);
  }
  // The fastening on the meeting stiles, drawn as an object: a slim backplate down the right
  // leaf's stile, a keeper on the left leaf that it shuts against, a rose and a lever that hangs
  // down at an angle. (It was a rod, two blocks and a long bar, and at the wide shot the whole
  // middle of the window went to one ragged black smear.)
  // …on the MIDDLE meeting: leaves[mid - 1] shuts against leaves[mid]. At two lights that is the
  // only meeting there is and the numbers are what they always were.
  const mid = Math.max(1, Math.round(lights / 2));
  {
    const [lx0] = leaves[mid];
    const rx = lx0 + s / 2, rz = zl1 + 0.008;
    const ly = (y0 + y1) / 2 - 0.04;
    P.box(0.024, 0.19, 0.005, rx, ly + 0.02, rz, M.metal, { cast: true });
    for (const y of [ly - 0.055, ly + 0.095]) P.cylinder(0.005, 0.005, 0.004, rx, y, rz + 0.004, M.metal, { rx: Math.PI / 2, segments: 8 });
    P.cylinder(0.017, 0.017, 0.007, rx, ly, rz + 0.005, M.metal, { rx: Math.PI / 2, segments: 12, cast: true });
    P.box(0.014, 0.085, 0.011, rx + 0.016, ly - 0.05, rz + 0.014, M.metal, { rz: -0.3, cast: true });
    P.sphere(0.012, rx + 0.03, ly - 0.09, rz + 0.014, M.metal, { cast: true });
    // the keeper the lever drops into, on the leaf it shuts against
    const [, klx1] = leaves[mid - 1];
    P.box(0.018, 0.026, 0.014, klx1 - s / 2, ly, zl1 + 0.006, M.metal, { cast: true });
  }
  // a casement stay on that same leaf: a perforated bar on a pivot
  {
    const [, lx1] = leaves[mid - 1];
    const sx = lx1 - s / 2, sy = (y0 + y1) / 2 - 0.12;
    P.cylinder(0.011, 0.011, 0.005, sx, sy, zl1 + 0.004, M.metal, { rx: Math.PI / 2, segments: 10 });
    P.box(0.012, 0.16, 0.006, sx - 0.01, sy - 0.08, zl1 + 0.008, M.metal, { rz: 0.12, cast: true });
  }

  // THE LEAD-IN. A porcelain tube driven through the window head, and the pair outside the glass
  // dropping past it out of the picture. It is two lines and it is the only thing in the room that
  // says the room was connected to somewhere else — the duct and the terminal box are the inside
  // of that sentence and this is where it comes from. The pair is drawn BEHIND the casements and
  // in front of the daylight, so the glazing bar crosses it: that is what puts it outside.
  if (leadIn) {
    // WHERE IT CAN BE DRAWN AT ALL. The daylight at the back of the reveal and the panes themselves
    // are opaque white sheets — that is how the set draws a window, and it is right — so nothing
    // behind the glass exists to be looked at. The only depth in which a thing can be OUTSIDE and
    // still be seen is the 17 mm between the pane and the front of the casement: draw a cable
    // there and the meeting stiles and the glazing bar pass in front of it, which is exactly what
    // puts it on the far side of the window. So the tube comes through under the head, over the
    // top light of the left leaf, and the pair drops from it across both panes to the sill.
    // (x0 + 0.25 and not less. That was set when this ran in the back wall's window, which props.js
    // dressed with a 0.19 m curtain panel from x0 − 0.03 — the first cut of it was drawn behind
    // cloth. This window has never had curtains, so the number now buys clearance it does not need;
    // it is kept because a quarter of a metre in from the jamb is also simply where a tube goes.)
    const lx = x0 + 0.25, ly = y1 - 0.12;
    const cz = zr + 0.062;
    P.cylinder(0.017, 0.017, 0.026, lx, ly, cz, M.trim, { rx: Math.PI / 2, segments: 12 });
    P.cylinder(0.028, 0.028, 0.009, lx, ly, cz + 0.006, M.trim, { rx: Math.PI / 2, segments: 16 });
    const drop = ly - (y0 + 0.03);
    for (const [dx, r, lean] of [
      [0, 0.0085, 0.02],
      [0.05, 0.0055, 0.038],
    ]) {
      P.cylinder(r, r, drop, lx + dx - (drop / 2) * Math.sin(lean), ly - (drop / 2) * Math.cos(lean), cz, M.dark, { rz: -lean, segments: 8 });
    }
  }

  // shutters: two leaves folded flat against the wall outside the architrave, where there is wall
  if (shutters) {
    const sw = 0.46, t = 0.036;
    for (const side of [-1, 1]) {
      const hingeX = side < 0 ? x0 - a : x1 + a; // the edge nearest the window
      const lx0 = side < 0 ? hingeX - sw : hingeX;
      buildShutterLeaf(P, M, lx0, lx0 + sw, y0, y1, zb, zb + t, side, jit);
    }
  }
}

// One louvred shutter leaf. The film draws a shutter as a WHITE panel with about a dozen bold
// horizontal strokes across it (fd-anim-stairs-exit-shutters, fd-anim-fountain-square-wide): the
// leaf is bare paper, the louvres are the drawing. So: a flat leaf, its field recessed inside
// stiles and rails, and six shallow ribs per field standing proud of it — twelve to a leaf, a
// hand's breadth apart. Each rib gives the ink pass one line and a sliver of shade; the paper
// between them is left alone. (Sixty fine slats over a dark backboard, which is what stood here,
// mip-blended into a grey scribble at every distance the shutter is ever seen from.)
function buildShutterLeaf(P, M, x0, x1, y0, y1, z0, z1, side, jit = Math.random) {
  const st = 0.055, rl = 0.085, mid = 0.07;
  const ym = (y0 + y1) / 2;
  const zf = z0 + (z1 - z0) * 0.45; // the recessed field's face
  P.boxFrom(x0, x0 + st, y0, y1, z0, z1, M.shutter, { cast: true, receive: true });
  P.boxFrom(x1 - st, x1, y0, y1, z0, z1, M.shutter, { cast: true, receive: true });
  P.boxFrom(x0 + st, x1 - st, y1 - rl, y1, z0, z1, M.shutter, { cast: true, receive: true });
  P.boxFrom(x0 + st, x1 - st, y0, y0 + rl, z0, z1, M.shutter, { cast: true, receive: true });
  P.boxFrom(x0 + st, x1 - st, ym - mid / 2, ym + mid / 2, z0, z1, M.shutter, { cast: true, receive: true });
  // the two fields, set back from the frame: bare paper between the louvres
  P.boxFrom(x0 + st, x1 - st, y0 + rl, y1 - rl, z0, zf, M.shutter, { receive: true });
  // Louvres: six broad boards to a field, laid almost edge to edge so that what the pen sees
  // between them is a narrow slot — one bold stroke, a hand's breadth of bare paper, the next
  // stroke. Set by hand: no two sit quite level or at quite the same pitch.
  const iw = x1 - x0 - 2 * st;
  const per = 6, slatT = 0.013, tilt = -0.3;
  for (const [ya, yb] of [
    [y0 + rl, ym - mid / 2],
    [ym + mid / 2, y1 - rl],
  ]) {
    const pitch = (yb - ya) / (per + 0.08);
    const slatH = (pitch * 0.85) / Math.cos(tilt);
    const start = ya + (yb - ya - (per - 1) * pitch) / 2;
    for (let i = 0; i < per; i++) {
      const y = start + i * pitch + (jit() - 0.5) * 0.008;
      P.box(iw, slatH, slatT, (x0 + x1) / 2, y, zf + slatT * 0.42, M.shutter, { rx: tilt + (jit() - 0.5) * 0.07, rz: (jit() - 0.5) * 0.01, cast: true, receive: true, uvSwap: true });
    }
  }
  // strap hinges: three flat bars across the hinge stile, a round knuckle at the wall edge
  const hingeX = side < 0 ? x1 : x0; // the window side
  const dir = side < 0 ? -1 : 1; // straps run away from the window
  for (const y of [y0 + rl / 2 + 0.01, ym, y1 - rl / 2 - 0.01]) {
    const len = 0.17;
    const cx = hingeX + (dir * len) / 2;
    P.box(len, 0.028, 0.008, cx, y, z1 + 0.004, M.metal, { cast: true });
    P.box(0.034, 0.034, 0.012, hingeX + dir * 0.012, y, z1 + 0.006, M.metal, { cast: true });
    P.box(0.012, 0.012, 0.01, hingeX + dir * (len - 0.03), y, z1 + 0.009, M.metal);
    P.box(0.012, 0.012, 0.01, hingeX + dir * (len * 0.5), y, z1 + 0.009, M.metal);
  }
  // a shutter dog holding the leaf open (small hook near the outer bottom corner)
  const dogX = side < 0 ? x0 + 0.05 : x1 - 0.05;
  P.box(0.05, 0.02, 0.05, dogX, y0 + 0.08, z1 + 0.02, M.metal, { cast: true });
}

// A CHIMNEY BREAST, A MANTEL, A HEARTH AND A GRATE WITH A FIRE LAID IN IT, on the stage-left wall.
// Everything about where it stands is at the openings above, under THE FIREPLACE; this is how it is
// made. It is drawn in the frame the press door and the wide window are drawn in — local x is minus
// world z, local z is how far a thing stands off the plaster, zb is the plaster itself.
//
// THE BREAST IS THE WALL, REPEATED 240 mm NEARER. It carries the side wall's own bands in the side
// wall's own materials — skirting behind the board, boarded wainscot, dado, plain field, rail,
// frieze — and because room-build maps every UV off world position in metres, the wainscot's boards
// and the plaster's grain run round the corner onto it without a seam or a number.
//
// THE OPENING IS CUT OUT OF THOSE BANDS AND NOT SUNK INTO THEM. A recess hollowed out of a solid
// box is a recess nothing can see: the ink pass reads depth and normals, and the hole has to be a
// real hole. So each band is subtracted around the opening exactly as the walls are subtracted
// around a door, and the box behind is lined in M.dark on all five faces — the one surface in this
// room that is cross-hatched to solid black, which is what a firebox is from four metres away.
function buildFireplace(P, M, f, zb, BANDS) {
  const { x0, x1, top, mantel, sill, head, slip } = f;
  const zf = zb + f.proj; // the breast's face
  const cx = (x0 + x1) / 2;
  const o0 = cx - f.open / 2, o1 = cx + f.open / 2;
  const open = { x0: o0, x1: o1, y0: sill, y1: head };

  // ---- the breast, in the side wall's own bands, cut round the opening ----
  const bands = [
    ['skirt', M.trim],
    ['wainscot', M.wainscot],
    ['dado', M.trim],
    ['field', M.side],
    ['rail', M.trim],
    ['frieze', M.plaster],
  ];
  for (const [band, m] of bands) {
    const [by0, by1] = BANDS[band];
    if (by0 >= top) continue;
    let rects = [{ x0, x1, y0: by0, y1: Math.min(by1, top) }];
    rects = subtractRect(rects, open);
    for (const r of rects) P.boxFrom(r.x0, r.x1, r.y0, r.y1, zb, zf, m, { cast: true, receive: true });
  }

  // ---- the mouldings, RETURNING round it: out along one side, across the face, back along the
  // other. Four horizontals that step out and step back at the same two verticals. A skirting and a
  // dado that simply STOPPED at a breast is what the first pass drew and it is what no room has
  // ever done; the return is the drawing this whole thing was worth putting on a raking wall for.
  for (const key of ['skirt', 'dado', 'rail', 'cornice']) {
    for (const [py0, py1, d] of PROFILE[key]) {
      P.boxFrom(x0 - d, x0, py0, py1, zb, zf + d, M.trim, { receive: true }); // the upstage return
      P.boxFrom(x1, x1 + d, py0, py1, zb, zf + d, M.trim, { receive: true }); // the downstage one
      // …and across the face, broken at the chimneypiece where the chimneypiece is in the way
      const spans = key === 'dado' ? [[x0 - d, o0 - slip], [o1 + slip, x1 + d]] : [[x0 - d, x1 + d]];
      for (const [a, b] of spans) if (b > a) P.boxFrom(a, b, py0, py1, zf, zf + d, M.trim, { receive: true });
    }
  }

  // ---- the firebox: five faces of solid hatch, and nothing else in it that is not iron ----
  const t = 0.008;
  P.boxFrom(o0, o1, sill, head, zb, zb + t, M.dark, { receive: true }); // the back
  P.boxFrom(o0, o0 + t, sill, head, zb, zf, M.dark, { receive: true }); // the two jambs
  P.boxFrom(o1 - t, o1, sill, head, zb, zf, M.dark, { receive: true });
  P.boxFrom(o0, o1, head - t, head, zb, zf, M.dark, { receive: true }); // the soffit
  P.boxFrom(o0, o1, sill, sill + t, zb, zf, M.dark, { receive: true }); // the firebox floor

  // ---- the surround: a slip of iron round the opening, standing 18 mm off the face. This is what
  // the dado rail dies into either side (see the runs above), and it is the line that says the hole
  // is a fireplace and not a cupboard with the door off.
  P.boxFrom(o0 - slip, o0, sill, head + slip, zf, zf + 0.018, M.iron, { cast: true, receive: true });
  P.boxFrom(o1, o1 + slip, sill, head + slip, zf, zf + 0.018, M.iron, { cast: true, receive: true });
  P.boxFrom(o0 - slip, o1 + slip, head, head + slip, zf, zf + 0.018, M.iron, { cast: true, receive: true, uvSwap: true });

  // ---- the mantel: a shelf with a frieze under it, oversailing the breast both ways ----
  P.boxFrom(x0 - 0.06, x1 + 0.06, mantel, mantel + 0.04, zb, zf + 0.06, M.trim, { cast: true, receive: true });
  P.boxFrom(x0 - 0.03, x1 + 0.03, mantel - 0.024, mantel, zb, zf + 0.03, M.trim, { cast: true });

  // ---- the hearth: a SLAB ON THE BOARDS and not a plinth. It was drawn from the floor up to the
  // opening's own sill at 0.20 for one pass and it came out as a bench 1.04 m long and 340 deep
  // standing in front of the fire; a hearth is a stone laid on a floor, 55 mm of it, and what is
  // under the opening is the breast's own wainscot, which is where it was already.
  P.boxFrom(x0 + 0.03, x1 - 0.03, 0, 0.055, zf, zf + f.slab, M.trim, { cast: true, receive: true });

  // ---- THE GRATE, and it is the only thing in the box that is not black: five bars and a fret,
  // in iron, standing in front of a cross-hatched hole. One dark area and one bare light is the
  // rule; here the hole is the dark and the bars are the light, which is why they are M.iron and
  // not M.dark and why there are five of them and not fifteen — at 66 px to the metre on this wall
  // a 30 mm bar is two pixels, and a bar every 90 mm is two pixels with three of paper between.
  const gz = zf - 0.03; // the bars stand just inside the face
  const bars = 5, span = f.open - 0.16;
  for (let i = 0; i < bars; i++) {
    const bx = cx - span / 2 + (span / (bars - 1)) * i;
    P.boxFrom(bx - 0.014, bx + 0.014, sill + 0.02, sill + 0.3, gz - 0.018, gz, M.iron, { cast: true });
  }
  P.boxFrom(o0 + 0.06, o1 - 0.06, sill + 0.28, sill + 0.32, gz - 0.022, gz, M.iron, { cast: true }); // the top rail
  P.boxFrom(o0 + 0.06, o1 - 0.06, sill + 0.01, sill + 0.045, gz - 0.026, gz + 0.004, M.iron, { cast: true }); // the fret

  // ---- THE FIRE LAID IN IT, unlit: three logs across the bars with kindling under them. It is
  // drawn so that the thing a visitor clicks already looks like a fire that has not been lit — the
  // affordance in this room is never a label, it is the object saying what it is for.
  // …AND THEY ARE PAPER, NOT INK. Drawn in M.dark they were three black logs inside a black hole
  // and the whole of the laid fire disappeared. The room's answer to a thing standing in a solid
  // mass is to turn it over — it is what the cat's lamp does when it is switched on — so the logs
  // and the kindling are the trim's own paper with the pen round them: white billets in a black
  // box, which is also what a fire looks like before it is lit.
  for (const [ly, lz, r, lean] of [
    [sill + 0.075, -0.012, 0.035, 0.07],
    [sill + 0.085, 0.028, 0.03, -0.11],
    [sill + 0.135, 0.004, 0.032, 0.05],
  ]) {
    P.cylinder(r, r, f.open - 0.24, cx + lz * 2, ly, gz - 0.075, M.trim, { rz: Math.PI / 2, ry: lean, segments: 9, cast: true });
  }
  for (const [kx, ky, kl] of [[-0.09, 0.028, 0.16], [0.02, 0.022, 0.19], [0.1, 0.03, 0.14]]) {
    P.cylinder(0.009, 0.009, kl, cx + kx, sill + ky, gz - 0.075, M.trim, { rz: Math.PI / 2 + 0.4, segments: 6 });
  }
}

// THE CABLE DUCT. The one thing the PTT screwed to the walls that was not worth taking away: a
// 90 × 60 mm wooden trough with a planted lid, run at 2.30 the length of both side walls, held by
// a flat iron cleat every 0.9 m. It is here because the side walls are the only surfaces in the
// set that admit they carry too few lines, and because a duct is the one drawing a raking wall
// actually wants: a horizontal that converges, with a rhythm of short verticals hung off it.
//
// The stage-right run stops at the side window. Those shutters fold back flat against the wall
// over two metres of it and stand 56 mm proud, and a duct does not pass through a shutter — so the
// trough is stopped and capped, which is what happens to a duct in a building that had windows in
// it before it had cables.
//
// AND THE STAGE-LEFT RUN NOW STOPS AT THE WIDE WINDOW, for the same reason read off a different
// piece of joinery. That window has no shutters, but its architrave stands 39 mm proud from y 1.02
// to 2.54 and the trough hangs at 2.30: the two occupy the same wall and the same height, and the
// architrave was there first. So the left-hand run starts downstage of that architrave's cap
// (z -0.84) and is capped there, exactly as the right-hand one is capped at its shutter.
function buildDuct(P, M, { hx, zb, uEnd, sideWin, sideWinL }) {
  const { y: yb, h, d, cleat } = DUCT;
  const yt = yb + h;
  const shutter = sideWin.x1 + 0.09 + 0.46 + 0.02; // the downstage edge of the folded leaf
  // …and on the left, the downstage edge of the wide window's cap moulding (architrave 0.09 + 0.02)
  const capL = sideWinL.x1 + 0.11;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -hx : hx - d; // the wall face
    const x1 = side < 0 ? -hx + d : hx; // ...and the front of the trough
    const front = side < 0 ? x1 : x0; // the face that looks into the room
    const out = side < 0 ? 1 : -1; // which way is "proud"
    const runs = side < 0 ? [[capL, uEnd]] : [[shutter, uEnd]];
    for (const [z0, z1] of runs) {
      if (z1 - z0 < 0.05) continue;
      // no cast: it is a nine-metre bar a hand's breadth off the wall, and the practicals would
      // throw its shadow the length of the room, which is the one thing the mouldings are careful
      // not to do either
      P.boxFrom(x0, x1, yb, yt, z0, z1, M.trim, { receive: true });
      // the lid: a board planted over the upper half of the face, so the pen sees three lines down
      // the run — the trough's top, the lid's bottom edge, the trough's underside — and not one bar
      const l0 = Math.min(front, front + out * 0.01), l1 = Math.max(front, front + out * 0.01);
      P.boxFrom(l0, l1, yt - 0.05, yt, z0, z1, M.trim, {});
      // a capped end where the run is stopped short of the corner: a plate across the section,
      // standing a little proud of it, so the stop reads as a stop and not as a sawn-off box
      const at = [];
      if (z0 > zb + 0.02) {
        const c0 = Math.min(x0, x1 + out * 0.012), c1 = Math.max(x1, x0 + out * 0.012);
        P.boxFrom(c0, c1, yb - 0.008, yt + 0.008, z0, z0 + 0.014, M.trim, { cast: true });
        at.push(z0 + 0.06);
      }
      // the cleats: a flat iron strap over the trough with a screw above and below it. The centres
      // are counted from the back wall rather than from the start of each run, so the cleats on the
      // two side walls line up across the room — which is the sort of thing this room is made of.
      for (let z = Math.ceil((z0 - zb) / cleat) * cleat + zb + 0.06; z < z1 - 0.06; z += cleat) at.push(z);
      const s0 = Math.min(x0, front + out * 0.014), s1 = Math.max(x1, front + out * 0.014);
      for (const z of at) {
        P.boxFrom(s0, s1, yb - 0.022, yt + 0.022, z - 0.011, z + 0.011, M.iron, { cast: true });
        for (const cy of [yb - 0.014, yt + 0.014]) P.cylinder(0.006, 0.006, 0.006, front + out * 0.017, cy, z, M.iron, { rz: Math.PI / 2, segments: 8 });
      }
    }
  }
}

// THE TERMINAL BOX. Where the duct goes: a japanned cast box beside the way-in door with the wall
// conduit dropping into the top of it and a tail leaving the bottom for the floor. It is the one
// black mass on the stage-right wall, and it is the object that says the room was WIRED — a duct
// on its own could be carrying anything.
//
// It stands upstage of the door, and how far upstage was measured in the frame rather than chosen:
// the light switch is at z 0.63 and the home plate's right edge falls at z 0.5, so at z 0.29 the
// box came within nine pixels of being cut by the frame, which is the one thing round 4's camera
// work went and fixed. At 0.12 it is clear of both, and it still reads as the fitting beside the
// way in — which is what it is, because that is where the line came into the room.
function buildTerminalBox(P, M, hx, z) {
  const { y: dy, d } = DUCT;
  const bz = 0.17, by0 = 1.22, by1 = 1.58; // 0.34 × 0.36, centred on 1.40
  const x0 = hx - 0.11;
  // the conduit down from the duct, on saddles. 26 mm, not 34: on the raking wall of the door shot
  // it runs the whole height of the frame, and at the wider gauge it stopped being a cable and
  // became a downpipe drawn across a third of the picture.
  P.cylinder(0.013, 0.013, dy - by1 + 0.02, hx - 0.028, (by1 + dy) / 2, z, M.dark, { cast: true, segments: 10 });
  for (const sy of [by1 + 0.13, dy - 0.16]) P.box(0.012, 0.028, 0.05, hx - 0.028, sy, z, M.iron, { cast: true });
  // the box: a carcase, a proud lid with a rim, four corner bosses
  P.boxFrom(x0, hx, by0, by1, z - bz, z + bz, M.dark, { cast: true, receive: true });
  P.boxFrom(x0 - 0.014, x0, by0 + 0.02, by1 - 0.02, z - bz + 0.02, z + bz - 0.02, M.dark, { cast: true });
  for (const cy of [by0 + 0.035, by1 - 0.035])
    for (const cz of [z - bz + 0.035, z + bz - 0.035]) P.cylinder(0.011, 0.011, 0.01, x0 - 0.016, cy, cz, M.iron, { rz: Math.PI / 2, segments: 8 });
  // the tail out of the bottom, down into the floor, on three saddles: a line with a rhythm in it
  // reads as a run of conduit, an unbroken one reads as a bar of ink
  P.cylinder(0.01, 0.01, by0, hx - 0.028, by0 / 2, z, M.dark, { cast: true, segments: 10 });
  for (const sy of [0.28, 0.62, 0.96]) P.box(0.012, 0.026, 0.046, hx - 0.028, sy, z, M.iron, { cast: true });
}

// A round bakelite light switch beside the door.
function buildSwitch(P, M, x, y, zb) {
  P.cylinder(0.04, 0.04, 0.012, x, y, zb + 0.006, M.metal, { rx: Math.PI / 2, segments: 16 });
  P.cylinder(0.016, 0.02, 0.018, x, y, zb + 0.02, M.metal, { rx: Math.PI / 2, segments: 12 });
  P.box(0.008, 0.026, 0.01, x, y + 0.006, zb + 0.032, M.metal, { rx: 0.5 });
}

// A panelled door in a shallow reveal with a lining, a three-pane transom light over it, an
// architrave with a small cornice, three raised-and-fielded panels, strap hinges, a knob on a
// rose, an escutcheon with a big key left in the lock, a letter plate, a spyhole.
function buildDoor(P, M, d, zb) {
  const { x0, x1, y0, y1, top, depth } = d;
  const zr = zb - depth;
  // reveal faces and the lining (tone-carrying, like the film's door reveals)
  P.boxFrom(x0 - 0.01, x0, y0, y1, zr, zb, M.reveal, { receive: true });
  P.boxFrom(x1, x1 + 0.01, y0, y1, zr, zb, M.reveal, { receive: true });
  P.boxFrom(x0 - 0.01, x1 + 0.01, y1, y1 + 0.01, zr, zb, M.reveal, { receive: true });
  const lin = 0.035;
  P.boxFrom(x0, x0 + lin, y0, y1, zr + 0.01, zb - 0.01, M.reveal, { receive: true });
  P.boxFrom(x1 - lin, x1, y0, y1, zr + 0.01, zb - 0.01, M.reveal, { receive: true });
  P.boxFrom(x0, x1, y1 - lin, y1, zr + 0.01, zb - 0.01, M.reveal, { receive: true });
  // transom bar between the door and the light above it
  const tb = 0.05;
  P.boxFrom(x0, x1, top, top + tb, zr + 0.01, zb - 0.005, M.trim, { receive: true });
  // door stops
  P.boxFrom(x0 + lin, x0 + lin + 0.012, y0, top, zr + 0.035, zr + 0.06, M.trim);
  P.boxFrom(x1 - lin - 0.012, x1 - lin, y0, top, zr + 0.035, zr + 0.06, M.trim);
  // the transom light: a fixed frame around one pane (no glazing bars — the VOYANTE sign from the
  // props piece hangs in this light and owns the space)
  {
    const tx0 = x0 + lin, tx1 = x1 - lin, ty0 = top + tb, ty1 = y1 - lin;
    const tz0 = zr + 0.03, tz1 = zr + 0.07, ff = 0.035;
    P.boxFrom(tx0, tx0 + ff, ty0, ty1, tz0, tz1, M.trim);
    P.boxFrom(tx1 - ff, tx1, ty0, ty1, tz0, tz1, M.trim);
    P.boxFrom(tx0, tx1, ty1 - ff, ty1, tz0, tz1, M.trim);
    P.boxFrom(tx0, tx1, ty0, ty0 + ff, tz0, tz1, M.trim);
    P.plane(tx1 - tx0 - 2 * ff, ty1 - ty0 - 2 * ff, (tx0 + tx1) / 2, (ty0 + ty1) / 2, (tz0 + tz1) / 2, M.glass);
  }
  // architrave on the wall face, with plinth blocks at the foot and a cap over the head
  const a = 0.1, ad = 0.026;
  P.boxFrom(x0 - a, x0, y0 + 0.2, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x1, x1 + a, y0 + 0.2, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x0 - a, x1 + a, y1, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x0 - a - 0.012, x0, y0, y0 + 0.2, zb, zb + ad + 0.008, M.trim, { cast: true });
  P.boxFrom(x1, x1 + a + 0.012, y0, y0 + 0.2, zb, zb + ad + 0.008, M.trim, { cast: true });
  P.boxFrom(x0 - a - 0.02, x1 + a + 0.02, y1 + a, y1 + a + 0.035, zb, zb + ad + 0.024, M.trim, { cast: true });
  P.boxFrom(x0 - a - 0.006, x1 + a + 0.006, y1 + a - 0.03, y1 + a, zb, zb + ad + 0.012, M.trim, { cast: true });

  // the door slab: stiles and rails at full thickness, panels set back, bolection mouldings
  const dz0 = zr + 0.012, dz1 = dz0 + 0.045; // slab depth band
  const dx0 = x0 + lin + 0.004, dx1 = x1 - lin - 0.004;
  const dy0 = y0 + 0.006, dy1 = top - 0.004;
  const stile = 0.11;
  const rails = [
    [dy1 - 0.12, dy1], // top rail
    [dy1 - 0.12 - 0.74 - 0.1, dy1 - 0.12 - 0.74], // between top and middle panel
    [dy0 + 0.2 + 0.46, dy0 + 0.2 + 0.46 + 0.1], // between middle and bottom panel
    [dy0, dy0 + 0.2], // bottom rail
  ];
  P.boxFrom(dx0, dx0 + stile, dy0, dy1, dz0, dz1, M.wood, { cast: true, receive: true });
  P.boxFrom(dx1 - stile, dx1, dy0, dy1, dz0, dz1, M.wood, { cast: true, receive: true });
  for (const [ry0, ry1] of rails) P.boxFrom(dx0 + stile, dx1 - stile, ry0, ry1, dz0, dz1, M.wood, { cast: true, receive: true, uvSwap: true });
  // panels between the rails
  const px0 = dx0 + stile, px1 = dx1 - stile;
  const panels = [
    [rails[1][1], rails[0][0]],
    [rails[2][1], rails[1][0]],
    [rails[3][1], rails[2][0]],
  ];
  for (const [py0, py1] of panels) {
    // the field, set back 22 mm
    const fz = dz1 - 0.022;
    P.boxFrom(px0, px1, py0, py1, dz0, fz, M.wood, { receive: true });
    // bolection moulding inside the opening: two steps out from the field
    const b = 0.03, bd = 0.012;
    P.boxFrom(px0, px0 + b, py0, py1, fz, fz + bd, M.wood, { cast: true });
    P.boxFrom(px1 - b, px1, py0, py1, fz, fz + bd, M.wood, { cast: true });
    P.boxFrom(px0 + b, px1 - b, py1 - b, py1, fz, fz + bd, M.wood, { uvSwap: true, cast: true });
    P.boxFrom(px0 + b, px1 - b, py0, py0 + b, fz, fz + bd, M.wood, { uvSwap: true, cast: true });
    const b2 = 0.012;
    P.boxFrom(px0 + b, px0 + b + b2, py0 + b, py1 - b, fz, fz + bd * 0.5, M.wood);
    P.boxFrom(px1 - b - b2, px1 - b, py0 + b, py1 - b, fz, fz + bd * 0.5, M.wood);
    P.boxFrom(px0 + b + b2, px1 - b - b2, py1 - b - b2, py1 - b, fz, fz + bd * 0.5, M.wood, { uvSwap: true });
    P.boxFrom(px0 + b + b2, px1 - b - b2, py0 + b, py0 + b + b2, fz, fz + bd * 0.5, M.wood, { uvSwap: true });
    // a raised centre (the "fielded" part)
    const inset = 0.085;
    P.boxFrom(px0 + inset, px1 - inset, py0 + inset, py1 - inset, fz, fz + 0.009, M.wood, { receive: true, cast: true });
  }
  // ironmongery: knob and rose on the left, escutcheon and key under it, letter plate in the
  // lock rail, a spyhole, three strap hinges on the right (the door hangs from the wall side)
  const knobX = dx0 + stile / 2 + 0.01, knobY = 1.02;
  P.cylinder(0.036, 0.036, 0.008, knobX, knobY, dz1 + 0.004, M.metal, { rx: Math.PI / 2, cast: true });
  P.cylinder(0.012, 0.012, 0.05, knobX, knobY, dz1 + 0.03, M.metal, { rx: Math.PI / 2 });
  P.sphere(0.03, knobX, knobY, dz1 + 0.06, M.metal, { cast: true });
  P.box(0.03, 0.075, 0.006, knobX, knobY - 0.1, dz1 + 0.003, M.metal, { cast: true });
  // a big key left in the lock: shaft out of the escutcheon, a bit near the door, a bow at the end
  const keyY = knobY - 0.1, keyZ = dz1 + 0.006;
  P.cylinder(0.0065, 0.0065, 0.075, knobX, keyY, keyZ + 0.0375, M.metal, { rx: Math.PI / 2, cast: true });
  P.box(0.008, 0.026, 0.02, knobX, keyY - 0.012, keyZ + 0.02, M.metal, { cast: true });
  P.add(new THREE.TorusGeometry(0.02, 0.005, 8, 18), M.metal, { x: knobX, y: keyY, z: keyZ + 0.075 + 0.02, cast: true });
  const [lr0, lr1] = rails[2];
  P.box(0.24, 0.05, 0.007, (dx0 + dx1) / 2, (lr0 + lr1) / 2, dz1 + 0.0035, M.metal, { cast: true });
  P.box(0.2, 0.014, 0.004, (dx0 + dx1) / 2, (lr0 + lr1) / 2, dz1 + 0.009, M.metal);
  P.cylinder(0.014, 0.014, 0.01, (dx0 + dx1) / 2, dy1 - 0.4, dz1 + 0.005, M.metal, { rx: Math.PI / 2 });
  for (const y of [dy0 + 0.28, (dy0 + dy1) / 2, dy1 - 0.28]) {
    P.box(0.26, 0.046, 0.008, dx1 - 0.13, y, dz1 + 0.004, M.metal, { cast: true });
    P.cylinder(0.014, 0.014, 0.075, dx1 + 0.002, y, dz1 + 0.004, M.metal, { cast: true });
    P.box(0.014, 0.014, 0.008, dx1 - 0.24, y, dz1 + 0.009, M.metal);
    P.box(0.014, 0.014, 0.008, dx1 - 0.16, y, dz1 + 0.009, M.metal);
    P.box(0.014, 0.014, 0.008, dx1 - 0.08, y, dz1 + 0.009, M.metal);
  }
  // THE PLATE, AND THE CARD UNDER IT. A vitreous enamel notice screwed to the middle rail — the
  // PTT's, left where the PTT screwed it — and, pinned to the panel below, the visiting card of
  // the man who now rents the room, whose own board over his head says WALK-INS TOLERATED. Nobody
  // in the room remarks on this. The plate is the only object in the set drawn white-on-black,
  // which is what an enamel plate is and what makes it read as a plate from across the room.
  P.boxFrom(PLATE.x0, PLATE.x1, PLATE.y0, PLATE.y1, dz1, dz1 + 0.005, M.metal, { cast: true });
  P.plane(PLATE.x1 - PLATE.x0, PLATE.y1 - PLATE.y0, (PLATE.x0 + PLATE.x1) / 2, (PLATE.y0 + PLATE.y1) / 2, dz1 + 0.0056, M.plate);
  const cz = dz1 - 0.022 + 0.009; // the face of the panel's raised centre
  P.plane(CARD.x1 - CARD.x0, CARD.y1 - CARD.y0, (CARD.x0 + CARD.x1) / 2, (CARD.y0 + CARD.y1) / 2, cz + 0.0016, M.card);
  P.cylinder(0.005, 0.005, 0.006, (CARD.x0 + CARD.x1) / 2, CARD.y1 - 0.008, cz + 0.005, M.metal, { rx: Math.PI / 2, segments: 8, cast: true });

  // threshold
  P.boxFrom(x0 - 0.01, x1 + 0.01, y0, y0 + 0.018, zr, zb + 0.01, M.trim, { receive: true });
}

// The two side-wall doors. Round 3 built these as a genuine set extension but admitted they were
// cheap joinery, sound only at a raking angle. They are now built to the same specification as the
// front door, because the entrance piece may cut to one square-on and a flat rectangle with a knob
// on it would be found out in one frame:
//
//   · a moulded architrave — a flat board, a proud bead on its inner edge, plinth blocks at the
//     foot and a capped head — so the case is three lines, not one;
//   · a lining with a planted door stop, so the leaf sits in a rebate;
//   · two stiles, three rails, two panels, and each panel a full bolection: a step out of the
//     field, a second smaller step, and a raised fielded centre. Six lines round a panel is what
//     the pen sees on the doors of the Cadazio street and in the kitchen folio;
//   · ironmongery drawn as OBJECTS — a knob on a rose with a turned spindle, an escutcheon with a
//     keyhole actually cut through it, a finger plate above the knob, and three strap hinges with
//     a barrel, a pin and their screws.
//
// `press` gives the narrower stage-left leaf longer panels, a turn-button instead of a lock, and no
// threshold, so it reads as a cupboard rather than a way out.
function buildSideDoor(P, M, d, zb, { knob = 1, press = false } = {}) {
  const { x0, x1, y0, y1, depth } = d;
  const zr = zb - depth;
  // reveal and lining
  P.boxFrom(x0 - 0.01, x0, y0, y1, zr, zb, M.reveal, { receive: true });
  P.boxFrom(x1, x1 + 0.01, y0, y1, zr, zb, M.reveal, { receive: true });
  P.boxFrom(x0 - 0.01, x1 + 0.01, y1, y1 + 0.01, zr, zb, M.reveal, { receive: true });
  const lin = 0.032;
  P.boxFrom(x0, x0 + lin, y0, y1, zr + 0.008, zb - 0.008, M.reveal, { receive: true });
  P.boxFrom(x1 - lin, x1, y0, y1, zr + 0.008, zb - 0.008, M.reveal, { receive: true });
  P.boxFrom(x0, x1, y1 - lin, y1, zr + 0.008, zb - 0.008, M.reveal, { receive: true });
  // door stops planted on the lining: the leaf shuts into a rebate, so the reveal draws as two
  // lines and the gap round the leaf is not a slot straight through the wall
  const sz = zr + 0.066;
  P.boxFrom(x0 + lin, x0 + lin + 0.012, y0, y1 - lin, sz, sz + 0.02, M.trim);
  P.boxFrom(x1 - lin - 0.012, x1 - lin, y0, y1 - lin, sz, sz + 0.02, M.trim);
  P.boxFrom(x0 + lin, x1 - lin, y1 - lin - 0.012, y1 - lin, sz, sz + 0.02, M.trim, { uvSwap: true });
  // architrave: a flat board with a bead on its inner edge, plinth blocks, a capped head
  const a = 0.095, ad = 0.024;
  P.boxFrom(x0 - a, x0, y0 + 0.21, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x1, x1 + a, y0 + 0.21, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x0 - a, x1 + a, y1, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  // the bead: a narrow strip standing proud along the opening, mitred round the head
  const bw = 0.016, bz = zb + ad;
  P.boxFrom(x0 - bw, x0, y0 + 0.21, y1 + bw, bz, bz + 0.012, M.trim, { cast: true });
  P.boxFrom(x1, x1 + bw, y0 + 0.21, y1 + bw, bz, bz + 0.012, M.trim, { cast: true });
  P.boxFrom(x0 - bw, x1 + bw, y1, y1 + bw, bz, bz + 0.012, M.trim, { cast: true, uvSwap: true });
  // plinth blocks: wider and deeper than the architrave, stopping it at the foot
  P.boxFrom(x0 - a - 0.014, x0 + 0.004, y0, y0 + 0.21, zb, zb + ad + 0.012, M.trim, { cast: true });
  P.boxFrom(x1 - 0.004, x1 + a + 0.014, y0, y0 + 0.21, zb, zb + ad + 0.012, M.trim, { cast: true });
  // the head: a frieze board and a cap that oversails it
  P.boxFrom(x0 - a - 0.008, x1 + a + 0.008, y1 + a, y1 + a + 0.024, zb, zb + ad + 0.014, M.trim, { cast: true });
  P.boxFrom(x0 - a - 0.026, x1 + a + 0.026, y1 + a + 0.024, y1 + a + 0.046, zb, zb + ad + 0.03, M.trim, { cast: true });
  // the slab
  const dz0 = zr + 0.014, dz1 = dz0 + 0.044;
  const dx0 = x0 + lin + 0.004, dx1 = x1 - lin - 0.004;
  const dy0 = y0 + 0.006, dy1 = y1 - lin - 0.006;
  const stile = 0.105;
  const rails = press
    ? [[dy1 - 0.115, dy1], [dy0 + 0.9, dy0 + 1.0], [dy0, dy0 + 0.17]]
    : [[dy1 - 0.115, dy1], [dy0 + 0.86, dy0 + 0.97], [dy0, dy0 + 0.2]];
  P.boxFrom(dx0, dx0 + stile, dy0, dy1, dz0, dz1, M.wood, { cast: true, receive: true });
  P.boxFrom(dx1 - stile, dx1, dy0, dy1, dz0, dz1, M.wood, { cast: true, receive: true });
  for (const [ry0, ry1] of rails) P.boxFrom(dx0 + stile, dx1 - stile, ry0, ry1, dz0, dz1, M.wood, { cast: true, receive: true, uvSwap: true });
  const px0 = dx0 + stile, px1 = dx1 - stile;
  for (const [py0, py1] of [[rails[1][1], rails[0][0]], [rails[2][1], rails[1][0]]]) {
    // the field, set back; then two steps of bolection out of it; then a raised centre
    const fz = dz1 - 0.021;
    P.boxFrom(px0, px1, py0, py1, dz0, fz, M.wood, { receive: true });
    const b = 0.03, bd = 0.012;
    P.boxFrom(px0, px0 + b, py0, py1, fz, fz + bd, M.wood, { cast: true });
    P.boxFrom(px1 - b, px1, py0, py1, fz, fz + bd, M.wood, { cast: true });
    P.boxFrom(px0 + b, px1 - b, py1 - b, py1, fz, fz + bd, M.wood, { uvSwap: true, cast: true });
    P.boxFrom(px0 + b, px1 - b, py0, py0 + b, fz, fz + bd, M.wood, { uvSwap: true, cast: true });
    const b2 = 0.012;
    P.boxFrom(px0 + b, px0 + b + b2, py0 + b, py1 - b, fz, fz + bd * 0.5, M.wood);
    P.boxFrom(px1 - b - b2, px1 - b, py0 + b, py1 - b, fz, fz + bd * 0.5, M.wood);
    P.boxFrom(px0 + b + b2, px1 - b - b2, py1 - b - b2, py1 - b, fz, fz + bd * 0.5, M.wood, { uvSwap: true });
    P.boxFrom(px0 + b + b2, px1 - b - b2, py0 + b, py0 + b + b2, fz, fz + bd * 0.5, M.wood, { uvSwap: true });
    const inset = 0.078;
    P.boxFrom(px0 + inset, px1 - inset, py0 + inset, py1 - inset, fz, fz + 0.009, M.wood, { receive: true, cast: true });
  }
  // ---- ironmongery, drawn as objects ----
  const kx = knob > 0 ? dx1 - stile / 2 : dx0 + stile / 2;
  const ky = 1.02;
  // knob: a rose plate, a turned spindle with a collar, a ball
  P.cylinder(0.032, 0.032, 0.007, kx, ky, dz1 + 0.004, M.metal, { rx: Math.PI / 2, cast: true });
  P.cylinder(0.011, 0.011, 0.03, kx, ky, dz1 + 0.022, M.metal, { rx: Math.PI / 2 });
  P.cylinder(0.019, 0.019, 0.008, kx, ky, dz1 + 0.041, M.metal, { rx: Math.PI / 2, cast: true });
  P.sphere(0.027, kx, ky, dz1 + 0.066, M.metal, { cast: true });
  if (press) {
    // the cupboard has no lock: a turn-button on the stile above the knob, screwed through its middle
    P.cylinder(0.014, 0.014, 0.006, kx, ky + 0.13, dz1 + 0.003, M.metal, { rx: Math.PI / 2 });
    P.box(0.02, 0.085, 0.008, kx, ky + 0.13, dz1 + 0.008, M.metal, { rz: 0.42, cast: true });
  } else {
    // escutcheon: a plate with the keyhole actually cut through it (a round eye and a tapered
    // slot in M.dark — the ink pass draws a hole as solid), and a drop cover pivoted above it
    const ey = ky - 0.1;
    P.box(0.03, 0.072, 0.005, kx, ey, dz1 + 0.0025, M.metal, { cast: true });
    P.cylinder(0.007, 0.007, 0.004, kx, ey + 0.008, dz1 + 0.006, M.dark, { rx: Math.PI / 2 });
    P.box(0.006, 0.022, 0.004, kx, ey - 0.006, dz1 + 0.006, M.dark);
    P.cylinder(0.011, 0.011, 0.004, kx + 0.019, ey + 0.028, dz1 + 0.006, M.metal, { rx: Math.PI / 2 });
    // finger plate above the knob: a long thin plate with a screw at each end
    P.box(0.05, 0.2, 0.004, kx, ky + 0.24, dz1 + 0.002, M.metal, { cast: true });
    for (const y of [ky + 0.15, ky + 0.33]) P.cylinder(0.005, 0.005, 0.004, kx, y, dz1 + 0.005, M.metal, { rx: Math.PI / 2 });
  }
  // three strap hinges on the hanging stile: a barrel and pin at the jamb, a tapered strap across
  // the stile, three screws down it
  const hx2 = knob > 0 ? dx0 : dx1;
  const dir = knob > 0 ? 1 : -1;
  for (const y of [dy0 + 0.28, (dy0 + dy1) / 2, dy1 - 0.28]) {
    P.box(0.21, 0.042, 0.007, hx2 + dir * 0.105, y, dz1 + 0.0035, M.metal, { cast: true });
    P.cylinder(0.013, 0.013, 0.068, hx2 - dir * 0.002, y, dz1 + 0.0035, M.metal, { cast: true });
    P.cylinder(0.006, 0.006, 0.006, hx2 - dir * 0.002, y + 0.04, dz1 + 0.0035, M.metal); // the pin's head
    for (const t of [0.34, 0.6, 0.86]) P.box(0.012, 0.012, 0.007, hx2 + dir * 0.21 * t, y, dz1 + 0.0085, M.metal);
  }
  if (!press) P.boxFrom(x0 - 0.01, x1 + 0.01, y0, y0 + 0.016, zr, zb + 0.01, M.trim, { receive: true });
}
