// The camera's framing arithmetic: what a shot must CONTAIN, solved for the window it is shown in.
//
// Round 5 changes what a shot is. Until now a shot was a lens: a position and a fixed vertical
// field of view, tuned by eye on a 16:9 window — so a squarer window (the user's is 1200×1100) or a
// phone held upright kept the same top and bottom edge and simply lost the sides, and a wide of a
// room became a keyhole. A shot is now a POSITION and a LIST OF THINGS THAT MUST BE IN THE PICTURE,
// and the lens follows from the window's aspect: the field opens until everything named is inside
// with a margin, and the frame is then hung from its top anchor.
//
// The two rules it enforces, which are the round's whole brief:
//
//  1. The LOWER half of the room is the picture. A frontal shot is hung from the TOP: the top edge
//     sits on the highest thing that must be in, and everything else the frame has room for is
//     floor. `floorZ` says how far towards the visitor the bottom edge may cut the floorboards; if
//     a narrow window opens the lens so wide that the bottom edge would run past that, the top
//     anchor moves UP to the next one it is given (in the parlour: from under the pendant's bulbs
//     to over its ceiling rose) rather than the frame growing downwards into bare floor.
//  2. Nothing is bisected by an edge. `keep` points are inside with a margin; `tops` are the two or
//     three places the top edge is allowed to fall (between objects, never through one).
//
// It is one solver for every kind of shot — frontal, straight down, raked — because it works in
// camera space: a point's tangents (a = up/forward, b = right/forward) are all the projection needs.
//   v = a / t + 2·shift   and   u = b / (t · aspect),  both in [-1, 1] inside the frame,
// where t = tan(fov/2) and `shift` is the lens rise/fall the camera piece applies as a view offset
// (+y drops the frame). Solve for t from the widest and tallest demand, then for shift from the
// anchor. No THREE.js: it is three dot products, and the tools can import it without a page.

const RAD = Math.PI / 180;
export const tanHalf = (fov) => Math.tan((fov * RAD) / 2);
export const fovOf = (t) => (2 * Math.atan(t)) / RAD;

// ---- camera space -------------------------------------------------------------------------------
// The basis a lookAt camera has: forward = normalize(look - pos) (the lens points along -z in
// camera space), right = forward × up, up' = right × forward.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function basis(pos, look, up = [0, 1, 0]) {
  const f = norm(sub(look, pos));
  const r = norm(cross(f, up));
  const u = cross(r, f);
  return { f, r, u };
}

// A world point as the frame sees it: depth along the lens axis, and the tangents that place it.
export function tangentsOf(pos, look, up, p) {
  const { f, r, u } = basis(pos, look, up);
  const d = sub(p, pos);
  const z = dot(d, f);
  const depth = Math.max(1e-4, z);
  return { d: depth, a: dot(d, u) / depth, b: dot(d, r) / depth };
}

// ---- the solver ---------------------------------------------------------------------------------
// spec:
//   pos, look, up          the pose (look is a point; for a frontal shot it is straight ahead)
//   keep    [[x,y,z], …]   must be inside the frame, with the margins
//   tops    [[x,y,z], …]   candidate top anchors, LOWEST FIRST; the top edge sits on the first one
//                          that leaves the bottom edge inside `floorZ`. Omit → the keep set is
//                          centred vertically.
//   floorZ                 the largest z (nearest the visitor) at which the bottom edge may cross
//                          the floor plane. Only meaningful for a level frontal shot.
//   floorY                 the height of that floor plane (default 0)
//   minT / maxT            the lens's own limits (a shot that must not be tighter than its wider
//                          brother, or wider than a lens that would bend the room)
//   mx, my                 margins as a fraction of the half-frame (0.04 = 4% of the half-width)
//   pad                    the band at the FOOT of the frame kept clear of everything in `keep`, as
//                          a fraction of the whole frame height. This is where the caption's drawn
//                          placard stands (round 5: it is at the bottom centre in every shot), so
//                          it is measured under the lowest thing that matters — the table's foot,
//                          his hands on the cloth, the near edge of the fan.
// → { pos, look, up?, fov, shift, t, anchor }
export function fit(spec, aspect) {
  const { pos, look, up = [0, 1, 0], keep = [], tops = [], limits = [], floorZ = null, floorY = 0, minT = 0, maxT = 4, mx = 0.04, my = 0.04, pad = 0 } = spec;
  const A = Math.max(0.05, aspect);
  const pt = (p) => tangentsOf(pos, look, up, p);
  const Mx = 1 - mx, My = 1 - my;

  const ks = keep.map(pt);
  const ts = tops.map(pt);
  const all = ks.concat(ts);
  let t = minT;
  // the frame must be wide enough for every keep point …
  for (const k of ks) t = Math.max(t, Math.abs(k.b) / (Mx * A));
  // … and tall enough for the span between the highest thing named and the lowest. The highest is
  // the keep set and the FIRST top anchor only: the anchors above it are the fallbacks a narrow
  // window falls back to, not things the lens has to open up to include.
  if (all.length) {
    const aMin = Math.min(...(ks.length ? ks : all).map((k) => k.a));
    // the lowest kept thing at v = -1 + 2·pad, the caption's band under it; the top either on its
    // anchor (v = 1, no margin) or, with no anchor, at v = 1 - my
    const aKeep = ks.length ? Math.max(...ks.map((k) => k.a)) : -Infinity;
    t = Math.max(t, (aKeep - aMin) / Math.max(0.2, 2 - my - 2 * pad));
    if (ts.length) t = Math.max(t, (ts[0].a - aMin) / Math.max(0.2, 2 - 2 * pad));
  }
  t = Math.min(t, maxT);

  // Where the frame hangs. Two placements, and the frame takes whichever puts its top edge LOWER:
  //
  //  · centred — the kept things sit in the middle of what is left of the frame once the caption's
  //    band is taken off the foot. This is what an insert wants: a frame with slack in it should not
  //    pile all of the slack under the subject.
  //  · on an anchor — the top edge exactly ON it, with no margin, since an anchor is chosen as a
  //    clear line BETWEEN objects (under the pendant's bulbs, over its ceiling rose) and a margin
  //    either side of it would put the edge back through one. This is what the room wants: hang the
  //    picture from the highest thing that may be in it and let everything else be floor.
  //
  // With the lens at exactly the size the contents need the two agree. Where they differ it is
  // because the frame is bigger than the contents (a narrow window opened the lens), and then the
  // anchor is the lower of the two and wins — which is the round's rule: the slack goes downwards,
  // into the room, not upwards into plaster. Anchors are tried in turn: the first whose bottom edge
  // still crosses the floor short of `floorZ` takes it, and if opening the lens has run the floor
  // out past that, the next anchor up is where the frame hangs instead.
  let shift = 0, anchor = null;
  let centred = 0;
  if (ks.length) {
    // the span the frame is composed on: the kept things, and the anchor above them if there is one
    // (in a room the anchor is the top of the picture, not a limit on it)
    const aMax = Math.max(...ks.map((k) => k.a), ...ts.slice(0, 1).map((k) => k.a));
    const aMin = Math.min(...ks.map((k) => k.a));
    centred = (pad - my / 2) / 2 - (aMax + aMin) / (4 * t);
  }
  if (ts.length) {
    for (let i = 0; i < ts.length; i++) {
      shift = Math.max(centred, (1 - ts[i].a / t) / 2);
      anchor = i;
      if (floorZ == null) break;
      const aBot = -t * (1 + 2 * shift); // the tangent of the bottom edge
      if (aBot >= 0) break; // it never meets the floor: nothing to overshoot
      const hit = pos[2] - (pos[1] - floorY) / -aBot; // z where the bottom edge crosses the floor
      if (hit <= floorZ) break;
    }
  } else shift = centred;
  // `limits` are the other kind of top: not where the frame hangs but the highest its edge may go.
  // Over the cloth there are two such lines and they are the overheads' version of the parlour's two
  // anchors — the cloth just downstage of the squared deck (which keeps the deck out of the picture
  // altogether), and the cloth just downstage of his own hands on the far side of the table (which
  // takes the deck in whole and stops short of him). The nearer one is used until the frame has
  // grown so much that the band of bare cloth and floor under the subject is a wasteland — which is
  // what a phone held upright does to a top-down of a row of cards — and then the frame opens
  // upstage into the table instead of downstage into the floorboards.
  for (let i = 0; i < limits.length; i++) {
    const k = pt(limits[i]);
    shift = Math.max(shift, (1 - k.a / t) / 2);
    if (!ks.length) break;
    const vMin = Math.min(...ks.map((q) => q.a / t + 2 * shift));
    if ((vMin + 1) / 2 <= pad + 0.09) break; // the band under it is the caption's, not a wasteland
  }
  // Neither an anchor nor a limit wins against the shot's own contents: if either has pushed
  // something in `keep` out through the top of the frame, the highest of those becomes the edge.
  if (ks.length) {
    const over = Math.max(...ks.map((k) => k.a / t + 2 * shift)) - (1 - my);
    if (over > 0) shift -= over / 2;
  }
  return { pos: [...pos], look: [...look], ...(spec.up ? { up: [...up] } : {}), fov: fovOf(t), shift: [0, shift], t, anchor };
}

// Where a point lands in a frame that `fit` returned: [u, v] in NDC, and [x, y] as fractions of the
// frame from its top-left corner. The probe reads these; so does anything that wants to know
// whether an object is about to be cut.
export function place(shot, aspect, p) {
  const t = tanHalf(shot.fov);
  const k = tangentsOf(shot.pos, shot.look, shot.up ?? [0, 1, 0], p);
  const s = shot.shift?.[1] ?? 0;
  const v = k.a / t + 2 * s;
  const u = k.b / (t * aspect);
  return { u, v, x: (u + 1) / 2, y: (1 - v) / 2, depth: k.d };
}
