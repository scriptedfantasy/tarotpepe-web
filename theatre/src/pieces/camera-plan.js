// THE TABLE PLATE — the plan view of the cloth. Camera round 6.
//
// STYLE §2.3: "Tabletops are shot either dead top-down or straight-on at table height. Never a
// casual 3/4." Round 5's overheads were dead top-down in the arithmetic and read as a casual 3/4
// in the picture, and the reason is worth writing down because it is the whole of this file: the
// LENS pointed straight down but the FRAME was hung off the table by a rise of the lens, so the
// picture slid downstage until the table's near rim left the bottom of the frame, the rug's scroll
// border and the letterbox band took the lower third, and what was left of the tabletop read as a
// canted ellipse. A plan view that shows a third of a rug is not a plan view of a table.
//
// A plate is defined the other way round from a frontal shot:
//
//   · THE CAMERA STANDS ON THE ROOM'S AXIS OF SYMMETRY (x = 0 for every shot that has to be
//     symmetric) and there is NO lens rise at all. The point the camera looks at IS the centre of
//     the frame, so composing the shot is choosing that point, not shifting the picture off it.
//   · The frame's horizontal is the room's x and its vertical is (0, cos θ, −sin θ) for a rake of
//     θ above the cloth. That is true at every θ, so: the row of three slots is parallel to the
//     frame's top edge, every card lying square to the room is square to the frame, and the
//     table's rim projects to a circle (θ = 90°) or to an axis-aligned ellipse of ratio sin θ.
//     Nothing cants. A rake here is the drawn convention of §1.5 — "floors tilt up slightly so the
//     ground reads, walls stay flat" — and not a three-quarter, which is what you get when the
//     camera leaves the axis and the ellipse tips over.
//   · THE BOTTOM EDGE IS PINNED just past the table's near rim. Whatever height the window's shape
//     asks for beyond what the subject needs, the frame takes UPSTAGE — into bare cloth and the
//     squared deck — and never downstage into the floorboards and the rug. On a phone held upright
//     that is the difference between a picture of a reading and 45% floor.
//   · AND IT STOPS SHORT OF HIM (`axis`). Pepe is a flat cut-out standing upright in the room, so
//     from a lens over the table his drawing lies down in the picture and his face stops being a
//     face. That limit outranks the pin: a portrait window cannot have both, and of the two it is
//     the rim that gives way.
//
// The affine fact that decides the rest: a plane photographed square-on is an affine image of
// itself, so RAKING CHANGES NOTHING about the composition — the rim and the cards squash by the
// same sin θ and the frame simply covers 1/sin θ more cloth. The rake is therefore free to be
// whatever the objects STANDING on the cloth need (a card reared on its edge is a hairline from
// straight above), and it is chosen for them alone. The plan is in the axes, not in the angle.
//
// Everything below is closed-form except one loop that settles the frame's centre against the pin,
// because moving the centre changes the lens the subject needs and the lens moves the centre back.

const RAD = Math.PI / 180;
export const tanHalf = (fov) => Math.tan((fov * RAD) / 2);
export const fovOf = (t) => (2 * Math.atan(t)) / RAD;

// The frame's own axes for a rake of θ measured up from the cloth. forward = −(0, sin, cos);
// up = (0, cos, −sin) (perpendicular to forward at every θ, and (0,0,−1) at θ = 90°, which is the
// room's z — "up along the room's z"); right = forward × up = (1, 0, 0), always.
export function planAxes(deg) {
  const a = deg * RAD, s = Math.sin(a), c = Math.cos(a);
  return { f: [0, -s, -c], up: [0, c, -s], s, c };
}

// Where a world point lands in a plate: depth along the lens axis and the two tangents.
function seen(pos, ax, p) {
  const dx = p[0] - pos[0], dy = p[1] - pos[1], dz = p[2] - pos[2];
  const depth = dx * ax.f[0] + dy * ax.f[1] + dz * ax.f[2];
  if (depth <= 1e-4) return null;
  return { depth, a: (dx * ax.up[0] + dy * ax.up[1] + dz * ax.up[2]) / depth, b: dx / depth };
}

// The z at which the frame's bottom (v = −1) and top (v = +1) edges cross the CLOTH plane, for a
// camera at height `dist` above a target on that plane. Closed form: for a cloth point at z the
// tangent is a = −s·(z − zc) / (dist − c·(z − zc)), so v = ∓1 gives
//   z − zc = ± t·dist / (s ± t·c).
// At θ = 90° that is the flat ±t·dist. Past a rake of atan(s/c·1/t) the top edge leaves the plane
// altogether (it is looking at the wall, not the cloth) and the top is reported as −Infinity.
const edgeZ = (zc, dist, t, ax, sign) => {
  const den = ax.s + sign * t * ax.c;
  if (den <= 1e-4) return sign > 0 ? Infinity : -Infinity;
  return zc + (sign * t * dist) / den;
};

// How far past the pin the bottom edge may go when that is what keeps the top edge off the deck.
// Four and a half centimetres of cloth: enough to buy a slightly tighter frame when the window is
// nearly square, not enough to bring the rug's scroll border up into the picture — which is the
// band the critic saw cutting the lower third. Past it the frame gives up and opens upstage
// instead, and the deck comes into the picture whole, which is only more of the tabletop.
const SLACK = 0.045;

// ---- the solver ----------------------------------------------------------------------------------
// spec:
//   y           the cloth's height
//   deg         the rake above the cloth; 90 = dead plan
//   x           the plate's axis in x (0 for every shot that must be symmetric)
//   subject     [[x, z] …]        points ON the cloth that must be in the picture
//   rise        [[x, y, z] …]     points ABOVE it that must be in (a card reared on its edge)
//   whole       [[[x,y,z] …] …]   groups taken wholly in or wholly out (the squared deck, him)
//   bottom      the largest z the frame's bottom edge may reach on the cloth. THE PIN.
//   dist, distMax, fov            the camera rises before the lens opens, as far as the pendant allows
//   pad         a band at the FOOT of the frame kept clear of the subject, as a fraction of the
//               frame's height: the caption's drawn placard stands there. On a plate it is small,
//               because the cloth between the near edge of the fan and the rim is only 8 cm wide
//               and every centimetre the frame takes past the rim is floor.
//   mx, my      margins at the side and the top, as a fraction of the half-frame
// → { pos, look, up, fov, shift:[0,0], t, dist, zTop, zBottom }
export function plate(spec, aspect) {
  const {
    y, deg = 90, x = 0,
    subject = [], rise = [], whole = [],
    bottom = null, top = null, axis = null,
    dist = 1.2, distMax = null, fov = 30,
    pad = 0.03, mx = 0.03, my = 0.05,
  } = spec;
  const A = Math.max(0.05, aspect);
  const ax = planAxes(deg);
  // THE CAMERA STANDS AS FAR OFF THE CLOTH AS THE ROOM ALLOWS (`distMax` — the pendant's shades
  // hang at 2.47 over the table, so 1.66 m above it is the ceiling of this shot) AND THE LENS IS
  // THEN EXACTLY WHAT THE SUBJECT NEEDS. Round 5 had it the other way about: a nominal lens the
  // shot could open but never close, so a frame solved for the widest window it might ever be in
  // stayed that size in every other one, and the row of three swam in a metre of cloth. Standing
  // back and closing down is also the right lens over a table — it keystones less, and these are
  // planimetric plates. `fov` is only where the search starts.
  const d = Math.max(0.05, distMax ?? dist);
  const Mx = A * (1 - mx), My = 1 - my, Mb = 1 - 2 * pad;

  let pts = subject.map(([px, pz]) => [px, y, pz]).concat(rise);
  const zOf = (p) => p[2];
  let zc = pts.length ? (Math.min(...pts.map(zOf)) + Math.max(...pts.map(zOf))) / 2 : 0;
  let t = tanHalf(fov);

  const posAt = (zz) => [x, y + d * ax.s, zz + d * ax.c];
  // Everything the frame has to hold, as the frame sees it from a centre at zz: the lens that just
  // contains it, and where its highest and lowest thing then sit in the picture.
  const read = (zz) => {
    const pos = posAt(zz);
    let want = 0.02, aMax = -Infinity, aMin = Infinity;
    for (const p of pts) {
      const q = seen(pos, ax, p);
      if (!q) continue;
      // The margin at the FOOT is thin — 2% against 5% at the top — because the pin already holds
      // the bottom edge for it, and a fat margin there fights the pin: every millimetre the lens
      // opens moves the pinned edge's centre upstage, which puts the near edge of the ribbon
      // proportionally CLOSER to the foot, which opens the lens again. That runaway is what took
      // the phone's fan to a 74° lens and two and a half metres of cloth.
      want = Math.max(want, Math.abs(q.b) / Mx, q.a > 0 ? q.a / My : -q.a / 0.98);
      aMax = Math.max(aMax, q.a);
      aMin = Math.min(aMin, q.a);
    }
    return { t: want, aMax, aMin };
  };
  // THE THREE RULES, IN ORDER OF PRECEDENCE, settled together because each moves the others.
  //
  //  1. everything named is inside, with its margins  — `read` returns the lens for that
  //  2. the frame's bottom edge is not past the pin   — the rim; slack goes upstage, never into floor
  //  3. the subject hangs at the FOOT of the frame, `pad` of the height clear beneath it for the
  //     placard — which is a preference, not a rule: on a phone the frame is three times deeper
  //     than the business on the cloth and hanging the ribbon a sixth of that above the rim would
  //     put the rim (and then the rug) back in the picture. Where 2 and 3 disagree, 2 wins and the
  //     placard stands over the near edge of the cloth instead of under it.
  const settle = (passes) => {
    for (let pass = 0; pass < passes; pass++) {
      const r = read(zc);
      t = r.t;
      // the centre that would put the bottom edge on a given line of the cloth
      const centreFor = (z) => zc - (edgeZ(zc, d, t, ax, +1) - z);
      // the band at the foot is a MINIMUM, not a mark to hang from: a frame three times deeper than
      // the business on the cloth already has room for the placard, and dragging the subject down
      // into the band would only throw the top edge further upstage for nothing.
      let want = zc;
      const vMin = r.aMin / t;
      if (vMin < -Mb) want = zc + (-Mb - vMin) * t * d;
      // never so far downstage that the bottom edge is past the rim …
      if (bottom != null) want = Math.min(want, centreFor(bottom));
      // … but a frame that has slack to spare should spend it downstage rather than open upstage
      // into the squared deck and swallow it, PROVIDED that only costs a hand's breadth of rim at
      // the foot. Where the slack is a whole table's worth — a phone held upright — it cannot, and
      // the frame opens upstage instead and takes the deck (and his hands past it) in whole.
      if (top != null) {
        const wantTop = zc + (top - edgeZ(zc, d, t, ax, -1));
        if (bottom == null || wantTop <= centreFor(bottom + SLACK)) want = Math.max(want, wantTop);
      }
      // AND IT STOPS SHORT OF HIM. Pepe is a flat cut-out standing upright in the room; from a lens
      // over the table his drawing lies down in the picture and a face seen from above stops being
      // a face. `axis` is the most upstage the TOP EDGE may reach, and it outranks the pin: a
      // window narrow enough that the frame is three times deeper than the business on the cloth
      // cannot both start at the near rim and stop short of him, and of the two the rim is the one
      // to give up. What the phone gets instead is the picture the critic asked for and the
      // geometry allows: the table a circle very nearly centred in the frame, closed top and
      // bottom by the boards, with the caption's placard standing on the near ones.
      if (axis != null) want = Math.max(want, zc + (axis - edgeZ(zc, d, t, ax, -1)));
      const step = want - zc;
      if (Math.abs(step) < 5e-4) break;
      zc += deg >= 89.9 ? step : step * 0.7;
    }
    t = read(zc).t;
  };
  settle(14);

  // Groups that are wholly in the picture or wholly out of it, never sawn in half: after the frame
  // has settled, any group the edges have cut is added to the subject and the frame solved again.
  // Upstage of the row that is the squared deck.
  if (whole.length) {
    const pos0 = posAt(zc);
    let grew = false;
    for (const group of whole) {
      // only the TOP and BOTTOM edges count here. A side edge clipping a corner off the deck is
      // what the end of a table does at the edge of a picture; a top edge sawing the deck in half
      // across its face is a mistake, and taking the whole deck in to avoid a 7 mm clip at the side
      // costs a tenth of the frame — which on a phone is enough to drag his cut-out head into a
      // plan view, where a flat drawing of a face seen from above is not a face at all.
      let inside = 0, n = 0;
      for (const p of group) {
        const q = seen(pos0, ax, p);
        if (!q) continue;
        n++;
        if (Math.abs(q.a) <= t) inside++;
      }
      if (n && inside > 0 && inside < n) {
        pts = pts.concat(group);
        grew = true;
      }
    }
    if (grew) settle(8);
  }

  return {
    pos: posAt(zc),
    look: [x, y, zc],
    up: [...ax.up],
    fov: fovOf(t),
    shift: [0, 0],
    t,
    dist: d,
    zBottom: edgeZ(zc, d, t, ax, +1),
    zTop: edgeZ(zc, d, t, ax, -1),
  };
}
