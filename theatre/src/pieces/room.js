// PIECE: room — the parlour set itself: floorboards, three papered walls with wainscot, dado,
// picture rail, frieze and cornice, a tall shuttered window stage left (and a second one on the
// stage-right wall), a panelled door with a transom light stage right, a column radiator under
// the window, a plain ceiling. Frontal, symmetrical, drawn with a pen: the geometry carries the
// drawing (real slats, real panels, real mouldings — the ink pass draws lines where there are
// edges), the textures carry only the PATTERN of what things are made of.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { Parts, subtractRect, makeWarp } from './room-build.js';
import { wallpaperTexture, wainscotTexture, floorTexture, grainTexture, plainTexture } from './room-textures.js';

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

  // every vertex goes through the hand's warp: no edge in the set is ruler-straight
  const P = new Parts({ warp: makeWarp({ amp: 0.02, hx, zb, H, seed: 3 }) });
  const jit = mulberry32(19); // the hand that sets the slats
  if (ctx.params?.has('roomdebug')) {
    M.glass.color.set('#ff0000');
    M.metal.color.set('#0000ff');
  }

  // ---- openings (in each wall's own plane: u along the wall, y up) ----
  const win = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.21 };
  const door = { x0: 1.05, x1: 1.95, y0: 0, y1: 2.45, top: 2.12, depth: 0.1 };
  // a second window on the stage-right wall; its u axis is world z (u = z)
  const sideWin = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.21 };
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
    { u0: -hx, u1: hx, holes: [win, door], bands: backBands, place: (u, y, w, h, m) => P.plane(w, h, u, y, zb, m, { receive: true }) },
    // stage-left wall: u = z, plane at x = -hx facing +x
    { u0: zb, u1: uEnd, holes: [sideDoorL], bands: sideBands, place: (u, y, w, h, m) => P.plane(w, h, -hx, y, u, m, { ry: Math.PI / 2, receive: true }) },
    // stage-right wall: u = z, plane at x = +hx facing -x
    { u0: zb, u1: uEnd, holes: [sideWin, sideDoorR], bands: sideBands, place: (u, y, w, h, m) => P.plane(w, h, hx, y, u, m, { ry: -Math.PI / 2, receive: true }) },
  ];
  for (const wall of walls) {
    for (const [band, m] of wall.bands) {
      const [y0, y1] = BANDS[band];
      let rects = [{ x0: wall.u0, x1: wall.u1, y0, y1 }];
      for (const h of wall.holes) rects = subtractRect(rects, h);
      for (const r of rects) wall.place((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.x1 - r.x0, r.y1 - r.y0, m);
    }
  }

  // ---- mouldings (no cast shadows: a long bar throws a band across the set) ----
  const backRun = (profile, x0, x1) => {
    for (const [y0, y1, d] of profile) P.boxFrom(x0, x1, y0, y1, zb, zb + d, M.trim, { receive: true });
  };
  // A run along a side wall, in z, optionally broken where a side door's architrave lands.
  const sideRun = (profile, side, gap = null) => {
    for (const [y0, y1, d] of profile) {
      const x0 = side < 0 ? -hx : hx - d, x1 = side < 0 ? -hx + d : hx;
      // runs into the back-wall moulding (same material, so the overlap is invisible and the
      // corner closes without an end face showing)
      const spans = gap ? [[zb, gap[0]], [gap[1], uEnd]] : [[zb, uEnd]];
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
    sideRun(prof, -1, low ? [sideDoorL.x0 - a0, sideDoorL.x1 + a0] : null);
    sideRun(prof, 1, low ? [sideDoorR.x0 - a0, sideDoorR.x1 + a0] : null);
  }

  // ---- the openings ----
  buildWindow(P, M, win, zb, jit);
  buildRadiator(P, M, win, zb);
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
    buildWindow(P, M, sideWin, zb, jit);
    buildSideDoor(P, M, sideDoorR, zb, { knob: 1 });
    buildSwitch(P, M, sideDoorR.x0 - 0.1 - 0.17, 1.22, zb); // the switch by the way in
  });
  P.withFrame(leftFrame, () => buildSideDoor(P, M, { ...sideDoorL, x0: -sideDoorL.x1, x1: -sideDoorL.x0 }, zb, { knob: -1, press: true }));

  P.build(g, 'room');
  ctx.scene.add(g);
  return { group: g, window: win, sideWindow: sideWin, door, bands: BAND, setState() {} };
}

// A tall casement window in a reveal, an architrave, a sill, and two louvred shutters folded
// back flat against the wall on either side (their slats are real: thin angled boxes).
function buildWindow(P, M, w, zb, jit = Math.random) {
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
  // It used to be one 40 mm slab whose whole drawing was a single line, and the bar cart in front
  // of it swallowed that line whole. Now it is three lines deep and it projects 130 mm, so it
  // reads over the top of anything props stand under it (fd-anim-staircase-guitar-room's windows
  // sit on exactly this: a board, a nose, an apron).
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
  const xm = (x0 + x1) / 2;
  // leaves: two casements meeting in the middle (no mullion — the film's windows are a pair of
  // plain leaves whose meeting stiles make one double line)
  const zl0 = zf0 + 0.008, zl1 = zf1 - 0.008;
  const s = 0.042, rt = 0.05, rb = 0.075;
  const leaves = [
    [x0 + f, xm - 0.004],
    [xm + 0.004, x1 - f],
  ];
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
  {
    const [lx0] = leaves[1];
    const rx = lx0 + s / 2, rz = zl1 + 0.008;
    const ly = (y0 + y1) / 2 - 0.04;
    P.box(0.024, 0.19, 0.005, rx, ly + 0.02, rz, M.metal, { cast: true });
    for (const y of [ly - 0.055, ly + 0.095]) P.cylinder(0.005, 0.005, 0.004, rx, y, rz + 0.004, M.metal, { rx: Math.PI / 2, segments: 8 });
    P.cylinder(0.017, 0.017, 0.007, rx, ly, rz + 0.005, M.metal, { rx: Math.PI / 2, segments: 12, cast: true });
    P.box(0.014, 0.085, 0.011, rx + 0.016, ly - 0.05, rz + 0.014, M.metal, { rz: -0.3, cast: true });
    P.sphere(0.012, rx + 0.03, ly - 0.09, rz + 0.014, M.metal, { cast: true });
    // the keeper the lever drops into, on the left leaf
    const [, klx1] = leaves[0];
    P.box(0.018, 0.026, 0.014, klx1 - s / 2, ly, zl1 + 0.006, M.metal, { cast: true });
  }
  // a casement stay on the left leaf: a perforated bar on a pivot
  {
    const [, lx1] = leaves[0];
    const sx = lx1 - s / 2, sy = (y0 + y1) / 2 - 0.12;
    P.cylinder(0.011, 0.011, 0.005, sx, sy, zl1 + 0.004, M.metal, { rx: Math.PI / 2, segments: 10 });
    P.box(0.012, 0.16, 0.006, sx - 0.01, sy - 0.08, zl1 + 0.008, M.metal, { rz: 0.12, cast: true });
  }

  // shutters: two leaves folded flat against the wall outside the architrave
  const leafW = 0.46, t = 0.036;
  for (const side of [-1, 1]) {
    const hingeX = side < 0 ? x0 - a : x1 + a; // the edge nearest the window
    const lx0 = side < 0 ? hingeX - leafW : hingeX;
    const lx1 = lx0 + leafW;
    buildShutterLeaf(P, M, lx0, lx1, y0, y1, zb, zb + t, side, jit);
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

// A cast-iron column radiator under the window: two manifolds, a row of columns, feet, a valve
// with a wheel, and a pipe down into the floor.
function buildRadiator(P, M, w, zb) {
  const { x0, x1 } = w;
  const cx = (x0 + x1) / 2;
  const width = x1 - x0 - 0.16, y0 = 0.17, y1 = 0.8;
  const z0 = zb + 0.05, depth = 0.13;
  // nine fat columns, not fourteen thin ones: at the wide shot a 53 mm pitch fell to a dozen screen
  // pixels and the stack turned into a barcode. Wider columns, wider gaps, one line each.
  const n = 9;
  const pitch = width / n;
  for (let i = 0; i < n; i++) {
    const x = cx - width / 2 + pitch * (i + 0.5);
    P.box(pitch * 0.62, y1 - y0 - 0.1, depth, x, (y0 + y1) / 2, z0 + depth / 2, M.iron, { receive: true });
  }
  // manifolds top and bottom
  P.box(width + 0.02, 0.05, depth + 0.01, cx, y1 - 0.025, z0 + depth / 2, M.iron, { receive: true });
  P.box(width + 0.02, 0.05, depth + 0.01, cx, y0 + 0.025, z0 + depth / 2, M.iron, { receive: true });
  // feet
  for (const x of [cx - width / 2 + 0.08, cx + width / 2 - 0.08]) {
    P.box(0.04, y0, 0.08, x, y0 / 2, z0 + depth / 2, M.iron);
    P.box(0.08, 0.018, 0.14, x, 0.009, z0 + depth / 2, M.iron);
  }
  // valve with a wheel on the left, a pipe into the floor on the right
  const vx = cx - width / 2 - 0.04, vy = y0 + 0.025;
  P.cylinder(0.014, 0.014, 0.09, vx, vy, z0 + depth / 2, M.iron, { rz: Math.PI / 2, segments: 10 });
  P.cylinder(0.034, 0.034, 0.014, vx - 0.03, vy, z0 + depth / 2, M.iron, { rz: Math.PI / 2, segments: 12 });
  P.cylinder(0.011, 0.011, vy, vx - 0.03, vy / 2, z0 + depth / 2, M.iron, { segments: 10 });
  const px = cx + width / 2 + 0.03;
  P.cylinder(0.011, 0.011, vy, px, vy / 2, z0 + depth / 2, M.iron, { segments: 10 });
  P.cylinder(0.014, 0.014, 0.06, px - 0.02, vy, z0 + depth / 2, M.iron, { rz: Math.PI / 2, segments: 10 });
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
