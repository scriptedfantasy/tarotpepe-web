// PIECE: room — the parlour set itself: floorboards, three papered walls with wainscot, dado,
// picture rail, frieze and cornice, a tall shuttered window stage left (and a second one on the
// stage-right wall), a panelled door with a transom light stage right, a column radiator under
// the window, a plain ceiling. Frontal, symmetrical, drawn with a pen: the geometry carries the
// drawing (real slats, real panels, real mouldings — the ink pass draws lines where there are
// edges), the textures carry only the PATTERN of what things are made of.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';
import { Parts, subtractRect } from './room-build.js';
import { wallpaperTexture, friezeTexture, wainscotTexture, floorTexture, grainTexture, plainTexture } from './room-textures.js';

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

// Moulding profiles: stacked boxes [y0, y1, depth].
const PROFILE = {
  skirt: [
    [0, 0.14, 0.018],
    [0.14, 0.165, 0.032],
  ],
  dado: [
    [0.905, 0.92, 0.022],
    [0.92, 0.97, 0.038],
  ],
  rail: [[2.6, 2.64, 0.03]],
  cornice: [
    [2.98, 3.02, 0.022],
    [3.02, 3.06, 0.05],
    [3.06, 3.1, 0.085],
  ],
};

export async function build(ctx) {
  const { width: W, depth: D, height: H } = ctx.layout.room;
  const hx = W / 2, zb = -D / 2; // half width, back wall z
  const overrun = 1.5; // side walls and floor run past the front of the room towards the camera
  const g = new THREE.Group();
  g.name = 'room';

  // ---- materials (paper white; the ink pass adds tone via userData.ink.hatch) ----
  const mat = (name, map, ink) => {
    const m = inkMaterial({ map, ...ink });
    m.name = name;
    m.userData.tile = map?.userData.tile ?? 1;
    return m;
  };
  const M = {
    paper: mat('wallpaper', wallpaperTexture(), { hatch: 0.3 }),
    frieze: mat('frieze', friezeTexture(), { hatch: 0.25 }),
    wainscot: mat('wainscot', wainscotTexture(), { hatch: 0.4 }),
    floor: mat('floor', floorTexture(), { hatch: 0.35 }),
    trim: mat('trim', plainTexture({ seed: 72 }), { hatch: 0.5, lineWeight: 1.15 }),
    wood: mat('wood', grainTexture(), { hatch: 0.55, lineWeight: 1.1 }),
    glass: mat('glass', plainTexture({ tint: '#fbf9f3', seed: 73 }), { hatch: 0.04, lineWeight: 0.8 }),
    ceiling: mat('ceiling', plainTexture({ seed: 74 }), { hatch: 0.08 }),
    metal: mat('metal', plainTexture({ seed: 75 }), { hatch: 0.85, lineWeight: 1.2 }),
    iron: mat('iron', plainTexture({ seed: 76 }), { hatch: 0.65, lineWeight: 1.1 }),
  };

  const P = new Parts();
  if (ctx.params?.has('roomdebug')) {
    M.glass.color.set('#ff0000');
    M.metal.color.set('#0000ff');
  }

  // ---- openings (in each wall's own plane: u along the wall, y up) ----
  const win = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.16 };
  const door = { x0: 1.05, x1: 1.95, y0: 0, y1: 2.45, top: 2.12, depth: 0.1 };
  // a second window on the stage-right wall; its u axis is world z (u = z)
  const sideWin = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.16 };

  // ---- floor and ceiling ----
  P.plane(W, D + overrun, 0, 0, overrun / 2, M.floor, { rx: -Math.PI / 2, receive: true });
  P.plane(W, D + overrun, 0, H, overrun / 2, M.ceiling, { rx: Math.PI / 2 });

  // ---- walls: bands per wall, cut around the openings ----
  const bands = [
    ['wainscot', M.wainscot],
    ['field', M.paper],
    ['frieze', M.frieze],
    ['skirt', M.trim], // wall behind the skirting (keeps the corners closed)
    ['dado', M.trim],
    ['rail', M.trim],
    ['cornice', M.trim],
  ];
  const walls = [
    // back wall: u = x, plane at z = zb facing +z
    { u0: -hx, u1: hx, holes: [win, door], place: (u, y, w, h, m) => P.plane(w, h, u, y, zb, m, { receive: true }) },
    // stage-left wall: u = z, plane at x = -hx facing +x
    { u0: zb, u1: zb + D + overrun, holes: [], place: (u, y, w, h, m) => P.plane(w, h, -hx, y, u, m, { ry: Math.PI / 2, receive: true }) },
    // stage-right wall: u = z, plane at x = +hx facing -x
    { u0: zb, u1: zb + D + overrun, holes: [sideWin], place: (u, y, w, h, m) => P.plane(w, h, hx, y, u, m, { ry: -Math.PI / 2, receive: true }) },
  ];
  for (const wall of walls) {
    for (const [band, m] of bands) {
      const [y0, y1] = BAND[band];
      let rects = [{ x0: wall.u0, x1: wall.u1, y0, y1 }];
      for (const h of wall.holes) rects = subtractRect(rects, h);
      for (const r of rects) wall.place((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.x1 - r.x0, r.y1 - r.y0, m);
    }
  }

  // ---- mouldings around three walls (no cast shadows: a long bar throws a band across the set) ----
  const backRun = (profile, x0, x1) => {
    for (const [y0, y1, d] of profile) P.boxFrom(x0, x1, y0, y1, zb, zb + d, M.trim, { receive: true });
  };
  const sideRun = (profile, side) => {
    for (const [y0, y1, d] of profile) {
      const x0 = side < 0 ? -hx : hx - d, x1 = side < 0 ? -hx + d : hx;
      P.boxFrom(x0, x1, y0, y1, zb + d, zb + D + overrun, M.trim, { receive: true });
    }
  };
  for (const key of ['skirt', 'dado', 'rail', 'cornice']) {
    const prof = PROFILE[key];
    if (key === 'skirt' || key === 'dado') {
      const a = 0.1; // interrupted by the door architrave
      backRun(prof, -hx, door.x0 - a);
      backRun(prof, door.x1 + a, hx);
    } else backRun(prof, -hx, hx);
    sideRun(prof, -1);
    sideRun(prof, 1);
  }

  // ---- the openings ----
  buildWindow(P, M, win, zb);
  buildRadiator(P, M, win, zb);
  buildDoor(P, M, door, zb);
  buildSwitch(P, M, door.x0 - 0.1 - 0.16, 1.22, zb);
  // the side window is the back-wall window rotated onto the stage-right wall: local +z → world −x
  const sideFrame = new THREE.Matrix4().makeTranslation(hx - Math.abs(zb), 0, 0).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
  P.withFrame(sideFrame, () => buildWindow(P, M, sideWin, zb));

  P.build(g, 'room');
  ctx.scene.add(g);
  return { group: g, window: win, sideWindow: sideWin, door, bands: BAND, setState() {} };
}

// A tall casement window in a reveal, an architrave, a sill, and two louvred shutters folded
// back flat against the wall on either side (their slats are real: thin angled boxes).
function buildWindow(P, M, w, zb) {
  const { x0, x1, y0, y1, depth } = w;
  const zr = zb - depth; // the back of the reveal
  // reveal faces (jambs, head, sill-bed)
  P.boxFrom(x0 - 0.01, x0, y0, y1, zr, zb, M.trim, { receive: true });
  P.boxFrom(x1, x1 + 0.01, y0, y1, zr, zb, M.trim, { receive: true });
  P.boxFrom(x0 - 0.01, x1 + 0.01, y1, y1 + 0.01, zr, zb, M.trim, { receive: true });
  P.boxFrom(x0 - 0.01, x1 + 0.01, y0 - 0.01, y0, zr, zb, M.trim, { receive: true });
  // back of the reveal: daylight (paper), behind the casement
  P.plane(x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, zr + 0.002, M.glass);
  // architrave on the wall face
  const a = 0.09, ad = 0.028;
  P.boxFrom(x0 - a, x0, y0 - 0.02, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x1, x1 + a, y0 - 0.02, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  P.boxFrom(x0 - a, x1 + a, y1, y1 + a, zb, zb + ad, M.trim, { cast: true, receive: true });
  // a small cap moulding over the head
  P.boxFrom(x0 - a - 0.02, x1 + a + 0.02, y1 + a, y1 + a + 0.03, zb, zb + ad + 0.02, M.trim, { cast: true });
  // sill: a board proud of the wall, with an apron below
  P.boxFrom(x0 - a - 0.03, x1 + a + 0.03, y0 - 0.04, y0, zr + 0.02, zb + 0.07, M.trim, { cast: true, receive: true });
  P.boxFrom(x0 - a, x1 + a, y0 - 0.09, y0 - 0.04, zb, zb + 0.03, M.trim, { cast: true });

  // casement: frame ring in the reveal, a centre mullion, two leaves each with a transom bar
  const zf0 = zr + 0.03, zf1 = zr + 0.08; // frame depth band
  const f = 0.05;
  P.boxFrom(x0, x0 + f, y0, y1, zf0, zf1, M.trim);
  P.boxFrom(x1 - f, x1, y0, y1, zf0, zf1, M.trim);
  P.boxFrom(x0, x1, y1 - f, y1, zf0, zf1, M.trim);
  P.boxFrom(x0, x1, y0, y0 + f, zf0, zf1, M.trim);
  const xm = (x0 + x1) / 2;
  P.boxFrom(xm - 0.03, xm + 0.03, y0, y1, zf0 - 0.005, zf1 + 0.005, M.trim);
  // leaves
  const zl0 = zf0 + 0.008, zl1 = zf1 - 0.008;
  const s = 0.042, rt = 0.05, rb = 0.075;
  const leaves = [
    [x0 + f, xm - 0.03],
    [xm + 0.03, x1 - f],
  ];
  for (const [lx0, lx1] of leaves) {
    P.boxFrom(lx0, lx0 + s, y0 + f, y1 - f, zl0, zl1, M.trim);
    P.boxFrom(lx1 - s, lx1, y0 + f, y1 - f, zl0, zl1, M.trim);
    P.boxFrom(lx0, lx1, y1 - f - rt, y1 - f, zl0, zl1, M.trim);
    P.boxFrom(lx0, lx1, y0 + f, y0 + f + rb, zl0, zl1, M.trim);
    // transom bar a third of the way down, and a glazing bar splitting the lower light
    const yt = y1 - f - (y1 - y0 - 2 * f) * 0.34;
    P.boxFrom(lx0, lx1, yt - 0.018, yt + 0.018, zl0, zl1, M.trim);
    const xg = (lx0 + lx1) / 2;
    P.boxFrom(xg - 0.011, xg + 0.011, y0 + f + rb, yt - 0.018, zl0 + 0.004, zl1 - 0.004, M.trim);
    // glass, one pane behind the bars
    P.plane(lx1 - lx0 - 2 * s, y1 - y0 - 2 * f - rt - rb, (lx0 + lx1) / 2, (y0 + f + rb + y1 - f - rt) / 2, (zl0 + zl1) / 2, M.glass);
  }
  // espagnolette on the right leaf's meeting stile: a long rod, keepers, a lever hanging down
  {
    const [lx0] = leaves[1];
    const rx = lx0 + s / 2, rz = zl1 + 0.012;
    const ry0 = y0 + f + rb + 0.04, ry1 = y1 - f - rt - 0.04;
    P.cylinder(0.007, 0.007, ry1 - ry0, rx, (ry0 + ry1) / 2, rz, M.metal, { segments: 10 });
    for (const y of [ry0 + 0.02, (ry0 + ry1) / 2 + 0.16, ry1 - 0.02]) P.box(0.024, 0.03, 0.018, rx, y, rz - 0.003, M.metal);
    const ly = (y0 + y1) / 2 - 0.05;
    P.cylinder(0.014, 0.014, 0.03, rx, ly, rz + 0.01, M.metal, { rx: Math.PI / 2, segments: 10 });
    P.box(0.018, 0.13, 0.014, rx + 0.012, ly - 0.075, rz + 0.026, M.metal, { rz: -0.18, cast: true });
  }
  // a small stay on the left leaf
  {
    const [, lx1] = leaves[0];
    P.box(0.016, 0.07, 0.012, lx1 - s / 2, (y0 + y1) / 2 - 0.1, zl1 + 0.006, M.metal);
  }

  // shutters: two leaves folded flat against the wall outside the architrave
  const leafW = 0.46, t = 0.036;
  for (const side of [-1, 1]) {
    const hingeX = side < 0 ? x0 - a : x1 + a; // the edge nearest the window
    const lx0 = side < 0 ? hingeX - leafW : hingeX;
    const lx1 = lx0 + leafW;
    buildShutterLeaf(P, M, lx0, lx1, y0, y1, zb, zb + t, side);
  }
}

// One louvred shutter leaf: stiles, rails, a mid-rail, and two stacks of angled slats.
function buildShutterLeaf(P, M, x0, x1, y0, y1, z0, z1, side) {
  const st = 0.052, rl = 0.075, mid = 0.06;
  const ym = (y0 + y1) / 2;
  P.boxFrom(x0, x0 + st, y0, y1, z0, z1, M.wood, { cast: true, receive: true });
  P.boxFrom(x1 - st, x1, y0, y1, z0, z1, M.wood, { cast: true, receive: true });
  P.boxFrom(x0 + st, x1 - st, y1 - rl, y1, z0, z1, M.wood, { cast: true, receive: true });
  P.boxFrom(x0 + st, x1 - st, y0, y0 + rl, z0, z1, M.wood, { cast: true, receive: true });
  P.boxFrom(x0 + st, x1 - st, ym - mid / 2, ym + mid / 2, z0, z1, M.wood, { cast: true, receive: true });
  // a thin back board so daylight does not show between slats
  P.boxFrom(x0 + st - 0.004, x1 - st + 0.004, y0 + rl - 0.004, y1 - rl + 0.004, z0, z0 + 0.004, M.wood, { receive: true });
  // slats
  const iw = x1 - x0 - 2 * st;
  const pitch = 0.034, slatH = 0.04, slatT = 0.006, tilt = -0.65; // radians about x
  const zc = (z0 + z1) / 2 + 0.004;
  for (const [ya, yb] of [
    [y0 + rl, ym - mid / 2],
    [ym + mid / 2, y1 - rl],
  ]) {
    const n = Math.floor((yb - ya - 0.012) / pitch);
    const start = ya + (yb - ya - (n - 1) * pitch) / 2;
    for (let i = 0; i < n; i++) {
      P.box(iw + 0.006, slatH, slatT, (x0 + x1) / 2, start + i * pitch, zc, M.wood, { rx: tilt, cast: true, receive: true, uvSwap: true });
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
  const n = 14;
  const pitch = width / n;
  for (let i = 0; i < n; i++) {
    const x = cx - width / 2 + pitch * (i + 0.5);
    P.box(pitch * 0.56, y1 - y0 - 0.1, depth, x, (y0 + y1) / 2, z0 + depth / 2, M.iron, { receive: true });
    // a narrow web between the front and back tubes reads as the second line of each column
    P.box(pitch * 0.3, y1 - y0 - 0.1, depth * 0.55, x, (y0 + y1) / 2, z0 + depth / 2, M.iron);
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
  // reveal faces and the lining
  P.boxFrom(x0 - 0.01, x0, y0, y1, zr, zb, M.trim, { receive: true });
  P.boxFrom(x1, x1 + 0.01, y0, y1, zr, zb, M.trim, { receive: true });
  P.boxFrom(x0 - 0.01, x1 + 0.01, y1, y1 + 0.01, zr, zb, M.trim, { receive: true });
  const lin = 0.035;
  P.boxFrom(x0, x0 + lin, y0, y1, zr + 0.01, zb - 0.01, M.trim, { receive: true });
  P.boxFrom(x1 - lin, x1, y0, y1, zr + 0.01, zb - 0.01, M.trim, { receive: true });
  P.boxFrom(x0, x1, y1 - lin, y1, zr + 0.01, zb - 0.01, M.trim, { receive: true });
  // transom bar between the door and the light above it
  const tb = 0.05;
  P.boxFrom(x0, x1, top, top + tb, zr + 0.01, zb - 0.005, M.trim, { receive: true });
  // door stops
  P.boxFrom(x0 + lin, x0 + lin + 0.012, y0, top, zr + 0.035, zr + 0.06, M.trim);
  P.boxFrom(x1 - lin - 0.012, x1 - lin, y0, top, zr + 0.035, zr + 0.06, M.trim);
  // the transom light: a fixed frame with two bars, three panes
  {
    const tx0 = x0 + lin, tx1 = x1 - lin, ty0 = top + tb, ty1 = y1 - lin;
    const tz0 = zr + 0.03, tz1 = zr + 0.07, ff = 0.035;
    P.boxFrom(tx0, tx0 + ff, ty0, ty1, tz0, tz1, M.trim);
    P.boxFrom(tx1 - ff, tx1, ty0, ty1, tz0, tz1, M.trim);
    P.boxFrom(tx0, tx1, ty1 - ff, ty1, tz0, tz1, M.trim);
    P.boxFrom(tx0, tx1, ty0, ty0 + ff, tz0, tz1, M.trim);
    for (const k of [1, 2]) {
      const bx = tx0 + ((tx1 - tx0) * k) / 3;
      P.boxFrom(bx - 0.012, bx + 0.012, ty0 + ff, ty1 - ff, tz0 + 0.004, tz1 - 0.004, M.trim);
    }
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
