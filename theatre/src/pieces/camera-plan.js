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

// ---- THE MARGIN (round 8) ------------------------------------------------------------------------
// The reveal builder, measuring round 7's plate: "At 390x760 the current plate puts the spread's
// bbox at x 6…384 of 390 — 6 px of margin. Please leave 4–5% of the short axis as cloth outside the
// box." They are right, and the reason round 7 had six pixels is that `mx` and `my` were written as
// fractions of the HALF-FRAME in their own direction — so the same numbers meant 6 px at the side of
// a phone and 40 px at the side of a 16:9 frame, and whichever axis the subject happened to be up
// against is the one that got no margin at all. A margin is a quantity of PAPER, not a share of a
// direction: it should be the same width of cloth on every edge of every window shape.
//
// So it is quoted here once, as a fraction of the frame's SHORT AXIS per side, and converted into
// each direction's half-frame units where it is used. 4.5 % — the middle of what was asked — is
// 17.5 px on a 390 px phone, 40 px on a 900 px 16:9 frame, and 49 px in the user's 1200×1100
// window: the same hand's breadth of table outside the drawing in all three.
//
// What it costs is the whole of what the reveal piece just bought: the spread's box came in from
// 0.680 x 0.567 m to 0.634 x 0.540, so the lens can be 7 % tighter, and 3 % of the short axis on
// each side is very nearly that 7 %. The subject goes from 97 % of the short axis to 91 % and the
// cards on a phone stay the size round 7 made them — with cloth round them instead of the frame's
// edge cutting the outermost bow.
const MARGIN = 0.045;

// ---- THE CAPTION'S OWN BAND (round 9) --------------------------------------------------------------
// The caption card docks to the TOP of the frame for the picking beat and only that beat (the
// user's exception, BRIEF.md 2026-09-05; dialogue.js owns it). So during that beat the top of the
// picture is not the camera's to compose with: it is an opaque drawn placard. Measured on the page
// with the block in its asking state — the state the whole picking beat is in — its lower edge sits
// at 0.214 of the frame's height on a 390x760 phone, 0.206 at 360x800, 0.165 at 1200x1100 and 0.218
// at 1600x900. Quoted here as one number and not measured per frame, and it costs nothing to do
// so: the block's height does not depend on what is written in it. Measured at 1600x900 with a
// nine-character line, a sixty-character one and a hundred-and-fifty-character one, the placard's
// lower edge is 0.2172 of the frame in all three (tools/_cam-r9-cap3.mjs) — the reply well is a
// fixed number of lines and the sentence above it is set to the measure. A lens that re-solved
// itself every time a sentence got longer would breathe; this one does not have to.
//
// `capTop` is that band, and what it protects is the SPREAD — the 78 cards the visitor is being
// asked to click. Cards already taken (`also`) only have to be IN the frame; a card back under the
// placard is a tally, not a target.
export const CAP_BAND = 0.22;

// ---- the solver ----------------------------------------------------------------------------------
// spec:
//   y           the cloth's height
//   deg         the rake above the cloth; 90 = dead plan
//   x           the plate's axis in x (0 for every shot that must be symmetric)
//   subject     [[x, z] …]        points ON the cloth that must be in the picture
//   also        [[x, z] …]        …and points that must be in it but are not what it is composed on:
//                                 they take the plain margins and never the caption's band
//   capTop      the band at the TOP of the frame the caption's docked placard stands in, as a
//                                 fraction of the frame's height. `subject` is hung clear of it and
//                                 centred in what is left; unset, the frame composes on the foot.
//   rise        [[x, y, z] …]     points ABOVE it that must be in (a card reared on its edge)
//   whole       [[[x,y,z] …] …]   groups taken wholly in or wholly out (the squared deck, him)
//   bottom      the largest z the frame's bottom edge may reach on the cloth. THE PIN.
//   centre, disc  the table's own centre and radius. WHERE THE FRAME IS DEEPER THAN THE TABLE the
//               pin cannot be honoured usefully and the disc takes the middle of the frame instead
//               (see rule 2b below).
//   dist, distMax, fov            the camera rises before the lens opens, as far as the pendant allows
//   pad         a band at the FOOT of the frame kept clear of the subject, as a fraction of the
//               frame's height: the caption's drawn placard stands there. On a plate it is small,
//               because the cloth between the near edge of the fan and the rim is only 8 cm wide
//               and every centimetre the frame takes past the rim is floor.
//   mx, my      margins at the side and the top, as a fraction of the half-frame in their own
//               direction. Left unset they are derived from MARGIN, which is a fraction of the
//               frame's SHORT AXIS and therefore the same number of pixels on every edge.
// → { pos, look, up, fov, shift:[0,0], t, dist, zTop, zBottom }
export function plate(spec, aspect) {
  const {
    y, deg = 90, x = 0,
    subject = [], also = [], rise = [], whole = [],
    bottom = null, top = null, axis = null, centre = null, disc = null, floor = null,
    dist = 1.2, distMax = null, fov = 30,
    pad = 0.03, capTop = null, mx = null, my = null,
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
  // the short axis as a fraction of the frame's width and of its height: a margin of MARGIN short
  // axes per side is 2·MARGIN·(short/W) of the half-width, and 2·MARGIN·(short/H) of the half-height
  const MX = mx ?? 2 * MARGIN * Math.min(1, 1 / A);
  const MY = my ?? 2 * MARGIN * Math.min(1, A);
  const Mx = A * (1 - MX), My = 1 - MY, Mb = 1 - 2 * pad;

  // Every point the frame has to hold, and the ceiling each one is held under: the SUBJECT is what
  // the plate is composed on and the only thing the caption's band is kept off; everything else
  // (`also` — cards already taken out of the spread — and the `whole` groups added below) simply
  // has to be inside the picture.
  const capV = capTop == null ? null : 1 - 2 * capTop;
  const top1 = capV == null ? My : Math.min(My, capV);
  // The 2 % margin at the foot below is thin because THE PIN holds the bottom edge for it. Where
  // the caption has docked to the top the pin is nowhere near the edge — the frame sits wholly on
  // the cloth, well inside the rim — and 2 % is 9 px on a 900 px frame, which put the outer bow's
  // corners on the frame's edge the first time this ran. With no pin under it the foot takes the
  // same hand's breadth of cloth as every other edge.
  const Mf = capV == null ? 0.98 : My;
  let pts = subject.map(([px, pz]) => ({ p: [px, y, pz], top: top1, sub: true }))
    .concat(rise.map((p) => ({ p, top: top1, sub: true })))
    .concat(also.map(([px, pz]) => ({ p: [px, y, pz], top: My, sub: false })));
  const zOf = (e) => e.p[2];
  let zc = pts.length ? (Math.min(...pts.map(zOf)) + Math.max(...pts.map(zOf))) / 2 : 0;
  let t = tanHalf(fov);

  const posAt = (zz) => [x, y + d * ax.s, zz + d * ax.c];
  // Everything the frame has to hold, as the frame sees it from a centre at zz: the lens that just
  // contains it, and where its highest and lowest thing then sit in the picture (`s*` counts the
  // subject alone, which is what the composition rules hang on).
  const read = (zz) => {
    const pos = posAt(zz);
    let want = 0.02, aMax = -Infinity, aMin = Infinity, sMax = -Infinity, sMin = Infinity;
    for (const e of pts) {
      const q = seen(pos, ax, e.p);
      if (!q) continue;
      // The margin at the FOOT is thin — 2% against 5% at the top — because the pin already holds
      // the bottom edge for it, and a fat margin there fights the pin: every millimetre the lens
      // opens moves the pinned edge's centre upstage, which puts the near edge of the ribbon
      // proportionally CLOSER to the foot, which opens the lens again. That runaway is what took
      // the phone's fan to a 74° lens and two and a half metres of cloth.
      want = Math.max(want, Math.abs(q.b) / Mx, q.a > 0 ? q.a / e.top : -q.a / Mf);
      aMax = Math.max(aMax, q.a);
      aMin = Math.min(aMin, q.a);
      if (e.sub) {
        sMax = Math.max(sMax, q.a);
        sMin = Math.min(sMin, q.a);
      }
    }
    if (sMax === -Infinity) {
      sMax = aMax;
      sMin = aMin;
    }
    return { t: want, aMax, aMin, sMax, sMin };
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
      // …but where the caption has DOCKED TO THE TOP there is a band at each end of the frame — the
      // placard above, the thin foot margin below — and the subject is centred in what is left of
      // the picture between them. That one IS a mark to hang from: the placard is opaque, the cards
      // under it are the ones being chosen, and a spread pushed to the foot of the frame with the
      // slack sitting behind the placard is the round-8 picture over again, upside down.
      if (capV != null) {
        const mid = (r.sMax + r.sMin) / (2 * t); // where the subject's middle sits now
        want = zc + ((capV - Mf) / 2 - mid) * t * d;
      }
      // never so far downstage that the bottom edge is past the rim …
      if (bottom != null) want = Math.min(want, centreFor(bottom));
      // 2b. … UNLESS THE FRAME IS DEEPER THAN THE TABLE, and then the pin stops being worth
      // honouring. On a phone held upright the frame is twice as tall as it is wide: 1.37 m of
      // cloth against a table 1.24 m across. Pinning the bottom edge inside the near rim then
      // spends the entire difference at the TOP of the picture — 15 cm of bench and floorboards
      // upstage of the far rim — while the near rim still sits a fifth of the frame's height above
      // the bottom edge with the rug under it. Both rims in the picture, both wrong.
      //   The picture that answers the brief in a window that shape is the one the table itself
      // makes: THE DISC CENTRED, its near and far rims cutting the frame at the same height, the
      // spread filling its lower half and the two rims closing the composition top and bottom. The
      // frame's centre IS the point the lens looks at (that is what makes a plate a plate), so
      // this is one line: put it on the table's centre. What is beyond the rim then is a shallow
      // symmetric crescent in the four corners — a round table on a rug, seen from above, which is
      // the drawing — instead of a band of rug across the foot.
      //   It only fires where it is true. Wherever the frame is shallower than the table — 16:9,
      // the user's 1200×1100 — the pin governs exactly as it did in round 6 and this is inert.
      if (centre != null && disc != null) {
        const depth = edgeZ(zc, d, t, ax, +1) - edgeZ(zc, d, t, ax, -1);
        if (depth > 2 * disc) want = centre;
      }
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
      // … AND NOT ONTO THE RUG, WHICH OUTRANKS EVEN THAT. `floor` is the last line of cloth and bare
      // boards before the rug's scroll border — a hard black double rule with a running scroll and a
      // comb of fringe under it, 2.5 cm outside the table's rim. A tabletop shot may show the rim
      // curving away and the bare board past it; the moment that band crosses the bottom of the
      // frame the picture stops being a plan of a table and becomes a plan of a rug with a table on
      // it, which is the fault the round-5 critic named and the one the user is still seeing.
      // Where the window is so tall that the frame cannot both clear the rug and stop short of him,
      // the rug wins and the excess goes upstage over his own hands on the cloth: a drawn hand at
      // the top edge of a tabletop plate is the beat; a printed border across the foot is a mistake.
      //
      // ROUND 8 — BUT ONLY BY SO MUCH. Giving the rug the whole of that overrun is what the round-8
      // margin exposed: the `turn` plate on a 390x760 phone went four centimetres over budget, and
      // because the rug took all four the top edge went from z −0.734 to −0.821 and a raycast down
      // the top eighth of the frame came back `pepeTorso` and `bench` at every pixel — his lap and
      // the bench he sits on, laid flat across the top of a plan view, which is the exact thing the
      // axis rule exists to prevent. What it bought at the other end was 2 cm of cloth. So the rug
      // still outranks the axis, but by SLACK and no further: four and a half centimetres, the same
      // hand's breadth the `top` rule is allowed above, after which the axis gives way as before.
      // At 390x760 that is the whole of the overrun and his drawing leaves the frame; at 360x800,
      // where the frame is a third deeper than the table, it is a quarter of it and the rest still
      // goes upstage — but a quarter is what there is.
      if (floor != null) want = Math.min(want, centreFor(axis != null && want > centreFor(floor) ? floor + SLACK : floor));
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
        // it joins the picture, not the composition: the plain margins, never the caption's band
        pts = pts.concat(group.map((p) => ({ p, top: My, sub: false })));
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
