// PIECE FILE (camera): THE FREE WALK — a prototype, behind `?free=1`, and nothing in this file
// runs on a page that did not ask for it.
//
// The user, after an assessment of what it would take: "the room is already 3D; free walking is an
// input and camera problem, with Pepe flat as the one real obstacle. Start with a prototype of free
// walking in the engine we have."
//
// So this is not a new camera. camera.js still owns the pose, the shots, the dolly and the hold;
// what this file owns is a STATION ON THE FLOOR — an x, a z, a yaw and a pitch — which camera.js
// asks for once a drawing and strikes exactly as it strikes any other shot. Everything the film
// already does still happens: the places dolly out of wherever the visitor was standing and back to
// it, the reading's cuts take the camera and give it back, the arbiter takes clicks, the placard
// takes lines. The pan, the walk into the picture and the zoom are off, because all three are
// modifiers on the plate the evening is watched FROM and there is no such plate while the visitor
// is on their feet.
//
// ---- THE LENS ----------------------------------------------------------------------------------
// A shot in this film is composed: camera-shots.js says what must be IN the picture and solves the
// focal length for the window. A walking lens cannot be composed, because what is in front of it
// changes every drawing — so it is CHOSEN, and the thing chosen is the HORIZONTAL field, because
// what a walker uses a lens for is to see where they are going and what is to either side of them.
//
//   62 DEGREES ACROSS, and the vertical solved for the window from it (three.js's fov is the
//   vertical one), clamped to 36 .. 50 so a very tall or very wide window still gets a lens this
//   room could have drawn. Measured against the film's own frames at 1280x800, which is the window
//   every number in this file is quoted at:
//       home   27.96 deg vertical = 43.9 across   the chair: a proscenium, the room held whole
//       wide   34.37             = 53.3           the arrival, and the frame the talking is in
//       door   21.51             = 34.0           the long lens down the axis
//       free   41.24             = 62.0           this
//   So the walking lens is wider than every frame the film has, by ten degrees on the widest of
//   them — and it has to be: at `wide`, standing in the middle of the floor, the side walls are two
//   slivers and a visitor turning round sees nothing arrive until it is already past them. It is
//   NOT wider than that, because 62 across at this room's scale still puts the vertical at 41 and
//   the drawn verticals stay very nearly parallel; at 75 across the door's architrave bows.
//   On a phone (390x844, aspect 0.462) the vertical clamps at 50, which is 24.4 across — narrow,
//   but it is twice the 12.7 the resting frame gets there, which is the whole complaint the pan was
//   written to answer.
// THE HATCH FOLLOWS IT AND NOBODY HAD TO DO ANYTHING: ink.js sets uHatchK from the live camera's
// own fov every frame (`cssH / (1024 * tan(fov/2))`), so a wider lens lays the tone coarser on the
// glass in exactly the proportion the picture is wider. Measured in tools/_free-proof.mjs.
const H_FOV = 62;
const V_MIN = 36, V_MAX = 50;

// ---- THE EYE, THE PACE, THE TURN -----------------------------------------------------------------
// 1.55 m is the brief's, and it is the right number for this set: his crown is at 1.37 and the
// table top at 0.76, so a visitor on their feet looks DOWN on the reading, which is what somebody
// who has stood up does.
const EYE = 1.55;
const SPEED = 1.1; // m/s — a room pace, not a corridor pace
const TURN = 60; // deg/s
const PITCH_MAX = 25; // deg
// TWO OR THREE DRAWINGS OF EASE. Velocity closes 55 % of the gap to what the keys are asking for on
// every drawing, so a step is at 55 % of pace on the first, 80 % on the second and 91 % on the
// third, and stops over the same three. Anything crisper and a key-down is a jump cut in the
// position; anything softer and the room slides, which is the one thing a film drawn on twelves may
// never do.
const EASE = 0.55;
const SLOP = 12; // px before a drag is a drag — camera.js's own DRAG_SLOP, and the same gesture split

// ---- THE WALKABLE REGION -------------------------------------------------------------------------
// A convex polygon on the floor plan, and every vertex of it is a measurement.
//
// THE RULE THAT DECIDES IT is the flat puppet. He is a stack of cut-out sheets facing +z (pepe.js)
// and he turns to face the camera up to 35 degrees; past that he is turning visibly and the paper
// starts to show. So the region is the set of stations from which he is never more than 35 degrees
// off his own front, measured from his seat at (0, -0.82):
//       |x| <= tan(35) * (z + 0.82) = 0.70021 * (z + 0.82)
// and it is cut off upstage by the line the brief names — 1.20 m in front of his table's near edge,
// which is the rim at z 0.62, so z >= 1.82. Those two meet at |x| 1.849.
//
// AND THE OTHER THREE RULES IN THE BRIEF TURN OUT TO BE INSIDE THIS ONE, which is worth writing
// down because it is the prototype's first finding:
//   the FURNITURE with a 0.35 m margin — there is none in the region. The nearest thing standing on
//     the boards is the reading table's chair at z -0.52 .. -0.08 and the rug's near fringe at
//     1.75; the region begins at 1.82, so every piece of furniture in this parlour is upstage of it
//     by at least 70 mm and the margins never bite.
//   the RUG'S FAR HALF — the rug is z -1.50 .. 1.66 with its fringe to 1.75. The whole rug is
//     upstage of the line, far half and near half alike.
//   the WALLS — at x +-2.60, less the 0.35 m margin: |x| <= 2.25. This one does bite, and it is the
//     only edge in the region a visitor can actually walk into except the wedge itself.
// The wedge reaches the wall margin at z = 2.25 / 0.70021 - 0.82 = 2.393.
//
// THE DOWNSTAGE EDGE, at z 6.05, and this is the one number the brief did not give. The chair is at
// z 6.40 — `home` and `wide` both stand there — which is 4 m DOWNSTAGE of the parlour's nominal
// front at z 2.50: this set is a proscenium and the floor, the ceiling and both side walls run on
// past it to z 6.71 so that the lens has somewhere to stand. There is NO FOURTH WALL. Cast +z from
// (0, 1.55, 6.40) and the ray leaves the film without striking anything. So the edge is put 0.35 m
// inside the chair's own line and 0.66 m inside the end of the floor, and a visitor entering free
// mode from either resting plate is clamped forward onto it by 0.35 m. What they see when they turn
// round is in the report, and it is the prototype's second finding.
const PEPE_Z = -0.82; // his seat, layout.pepe.pos
const FRONT = 35; // degrees off his front the region may reach
const TAN_FRONT = Math.tan((FRONT * Math.PI) / 180); // 0.700208
const TABLE_RIM = 0.62; // his table's near edge, layout.table.radius
const STOP = TABLE_RIM + 1.2; // 1.82 — the line the region stops on
const WALL = 2.6, MARGIN = 0.35;
const SIDE = WALL - MARGIN; // 2.25
const APEX = TAN_FRONT * (STOP - PEPE_Z); // 1.849 — the wedge's half width at the stop line
const FLARE = SIDE / TAN_FRONT + PEPE_Z; // 2.393 — where the wedge meets the wall margin
const BACK = 6.05; // the downstage edge: 0.35 m in front of the chair at 6.40

// Anticlockwise in plan (+x stage right, +z downstage). Six vertices, and the two on the stop line
// are the only pair a visitor can stand on and see him at the full 35.
export const REGION = [
  [-APEX, STOP],
  [APEX, STOP],
  [SIDE, FLARE],
  [SIDE, BACK],
  [-SIDE, BACK],
  [-SIDE, FLARE],
];

// The polygon as half-planes: n . p <= c, n pointing OUT. A point is clipped by projecting it back
// onto every plane it has crossed, three passes, which is what makes a corner a corner instead of a
// trap: the component of the motion ALONG an edge survives the projection, so a visitor pushing
// into a wall slides down it, and a visitor pushing into a corner lands on the vertex and can still
// walk out along either edge.
const EDGES = REGION.map(([x0, z0], i) => {
  const [x1, z1] = REGION[(i + 1) % REGION.length];
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dz / len, nz = -dx / len; // the outward normal of an anticlockwise ring
  return { nx, nz, c: nx * x0 + nz * z0 };
});
export function insideRegion(x, z, slack = 1e-6) {
  for (const e of EDGES) if (e.nx * x + e.nz * z - e.c > slack) return false;
  return true;
}
export function clipRegion(x, z) {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const e of EDGES) {
      const s = e.nx * x + e.nz * z - e.c;
      if (s > 1e-9) {
        x -= e.nx * s;
        z -= e.nz * s;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return [x, z];
}

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// The vertical field for this window, from the horizontal one.
export function freeFov(aspect) {
  const v = (2 * Math.atan(Math.tan((H_FOV / 2) * DEG) / Math.max(1e-3, aspect))) / DEG;
  return clamp(v, V_MIN, V_MAX);
}

// ---- THE PROTOTYPE ---------------------------------------------------------------------------
// `owns()` is camera.js's answer to "is the visitor on their feet just now": free mode is armed by
// the flag and OWNS the pose only while camera.js is standing on the free station with no move
// running and nobody holding it. Everything below is refused while it is false, which is how a
// place, a reading's cuts and the crossroads all take the camera without this file knowing they
// exist.
export function mountFree(ctx, { owns, aspect, blocked }) {
  const armed = ctx.params?.get?.('free') === '1';
  const THREE = ctx.THREE;
  const glass = ctx.renderer?.domElement ?? null;
  const st = { x: 0, z: BACK, yaw: 0, pitch: 0, seeded: false };
  const vel = { f: 0, s: 0, t: 0 }; // the eased forward / strafe / turn, in their own units
  // HOW MANY DRAWINGS THIS STATION HAS BEEN GIVEN, which is the only honest clock a proof can hold
  // this piece to. A tool cannot count them from outside: it talks to the page over a socket and the
  // page goes on rendering between one question and the next, so counting round trips counts the
  // MACHINE. Counting them here and checking the station against the closed form of the ease over
  // exactly that many is a claim with no seconds in it anywhere, which is the claim being made.
  let drawn = 0;
  const keys = new Set();
  let goal = null; // the phone's walk-to-a-tap: { x, z }
  let drag = null;

  // yaw 0 looks straight upstage at him, and yaw grows turning LEFT (anticlockwise from above):
  //   forward = (-sin yaw, 0, -cos yaw)      right = (cos yaw, 0, -sin yaw)
  const fwd = () => [-Math.sin(st.yaw), -Math.cos(st.yaw)];
  const rgt = () => [Math.cos(st.yaw), -Math.sin(st.yaw)];

  // The station as a shot, which is the only thing camera.js ever takes from this file.
  function shot() {
    const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const [fx, fz] = fwd();
    return {
      pos: [st.x, EYE, st.z],
      look: [st.x + fx * cp, EYE + sp, st.z + fz * cp],
      up: [0, 1, 0],
      fov: freeFov(aspect()),
      shift: [0, 0],
    };
  }

  // Seeded from the plate the visitor was watching from, which is the brief's "free mode starts
  // from wherever the camera is when the flag is on". `home` and `wide` both stand at (0, 6.40)
  // looking straight up the axis, so the seed is the room's own centre line at the region's
  // downstage edge, turned to him — and 0.35 m of the clamp is the only thing that moves.
  function seed(s) {
    if (!s) return;
    const dx = s.look[0] - s.pos[0], dz = s.look[2] - s.pos[2];
    st.yaw = Math.atan2(-dx, -dz);
    st.pitch = 0;
    [st.x, st.z] = clipRegion(s.pos[0], s.pos[2]);
    st.seeded = true;
    goal = null;
    vel.f = vel.s = vel.t = 0;
  }

  // ---- ONE DRAWING -----------------------------------------------------------------------------
  // Everything here happens on a stepped frame and nowhere else. The position and the yaw take one
  // new value per drawing, the same grid the puppet, the props and the dolly are on; a camera
  // gliding through a room drawn at twelve a second is the one smooth thing in the picture and the
  // eye finds it immediately.
  function step() {
    drawn++;
    const dt = 1 / (ctx.clock?.fps || 12);
    let wantF = 0, wantS = 0, wantT = 0;
    if (blocked()) goal = null; // a tap answered before the room got busy is not answered now
    if (!blocked()) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) wantF += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) wantF -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) wantS += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) wantS -= 1;
      if (keys.has('KeyQ')) wantT += 1;
      if (keys.has('KeyE')) wantT -= 1;
    }
    // A DIAGONAL IS NOT FASTER THAN A STRAIGHT LINE: the two axes are normalised together, so
    // forward-and-left is 1.1 m/s and not 1.56.
    const m = Math.hypot(wantF, wantS);
    if (m > 1) {
      wantF /= m;
      wantS /= m;
    }
    // …and a tap on the floor is the phone's way of asking for the same thing: the straight line to
    // the point, clipped to the region, walked at the same pace and abandoned the moment a key or a
    // drag says otherwise.
    if (goal && !wantF && !wantS) {
      const [fx, fz] = fwd(), [rx, rz] = rgt();
      const dx = goal.x - st.x, dz = goal.z - st.z;
      const d = Math.hypot(dx, dz);
      // the last drawing lands ON the point rather than past it: anything nearer than one drawing's
      // full stride is arrived at, because a walk that overshoots its goal and comes back is a
      // wobble, and a wobble on the twelves is two visible drawings of one
      if (d <= SPEED * dt) {
        st.x = goal.x;
        st.z = goal.z;
        goal = null;
      } else {
        // the walk is in the world and the motor is in the visitor's own axes, so the straight line
        // is resolved onto forward and strafe rather than added to the pose behind their back
        wantF = (dx * fx + dz * fz) / d;
        wantS = (dx * rx + dz * rz) / d;
      }
    } else if (goal) goal = null;

    vel.f += (wantF - vel.f) * EASE;
    vel.s += (wantS - vel.s) * EASE;
    vel.t += (wantT - vel.t) * EASE;
    if (Math.abs(vel.f) < 1e-3) vel.f = 0;
    if (Math.abs(vel.s) < 1e-3) vel.s = 0;
    if (Math.abs(vel.t) < 1e-3) vel.t = 0;

    st.yaw += vel.t * TURN * DEG * dt;
    const [fx, fz] = fwd(), [rx, rz] = rgt();
    const nx = st.x + (fx * vel.f + rx * vel.s) * SPEED * dt;
    const nz = st.z + (fz * vel.f + rz * vel.s) * SPEED * dt;
    [st.x, st.z] = clipRegion(nx, nz);
    // …and the velocity is NOT trimmed when the clip bites. It is the commanded pace, not a
    // momentum: a visitor leaning on a wall stands still and the moment they turn away they are
    // walking again at once, which is what a person does. Damping it here would make every wall in
    // the room slightly sticky for the three drawings after leaving it.
    // A walk-to-a-tap that has been clipped short of its goal would otherwise push at the edge for
    // ever, so it is given up when the station stops answering.
    if (goal && Math.abs(st.x - nx) > 1e-6) goal = null;
    if (goal && Math.abs(st.z - nz) > 1e-6) goal = null;
    return true;
  }

  // ---- THE PUPPET TURNS ------------------------------------------------------------------------
  // He is a stack of sheets facing +z and he is the reason the region is the shape it is. While the
  // visitor is on their feet his root group yaws to the bearing from his own seat to the lens,
  // limited to 35 degrees — which the region already guarantees, so the limit never fires and is
  // there to say what the region is FOR. It walks on the twelves, at the same 55 % close the walk
  // itself uses, and it goes back to square whenever anything else owns the camera: his own
  // composed frames (`pepe`, `fan`, the inserts) are drawn square to him and a puppet still turned
  // 30 degrees when the camera cuts to his face is a puppet with a crick in his neck.
  // The BENCH turns with him, because it hangs off the same root. That is a real thing to know and
  // it is measured in the report: from every station in the region his table stands between the lens
  // and the bench, and what shows of it is the two outer legs.
  let pepeYaw = 0;
  function turnPuppet(on) {
    const R = ctx.pieces?.pepe?.root;
    if (!R) return;
    let want = 0;
    if (on) {
      const dx = st.x - 0, dz = st.z - PEPE_Z;
      want = clamp(Math.atan2(dx, dz), -FRONT * DEG, FRONT * DEG);
    }
    pepeYaw += (want - pepeYaw) * EASE;
    if (Math.abs(want - pepeYaw) < 1e-4) pepeYaw = want;
    R.rotation.y = pepeYaw;
  }

  // ---- THE FLAT THINGS -------------------------------------------------------------------------
  // The fire's twelve tongues and the three in the hearth are sheets composed for the two frames
  // they are ever alight in, and one of them is composed ANAMORPHICALLY: egg-fine.js draws the
  // grate's tongue 2.6 times too wide so that the 67 degree rake from the chair squeezes it back,
  // and it switches to its honest aspect on `camera.current === 'fireplace'` — a SHOT NAME, not an
  // angle. A free camera is on neither shot, so every one of them would be shown from a lens they
  // were not drawn for, the grate's stretched. So while the visitor is on their feet the tongues
  // are simply not drawn. Nothing is switched OFF: the egg goes on burning, the sound goes on, and
  // the drawing comes back the instant a place or a cut owns the camera again.
  //
  // AND IT IS THE ROOT THAT IS HIDDEN, NOT THE TONGUES, which this round had to learn by measuring:
  // egg-fine.js writes `flame.group.visible = true` on the ONE DRAWING a tongue catches on and never
  // again, so a hand laid on those flags is a hand that has put the fire out for good — walked to
  // the fireplace with the fire lit and the hearth stayed dark. Its root group `fine` is written by
  // nobody, so setting that is a curtain across the whole egg and letting it up again restores
  // exactly the tongues that were burning, whichever they had become in the meantime.
  let curtain = false;
  const hideFlames = (on) => {
    if (on === curtain) return;
    const root = ctx.scene.getObjectByName('fine');
    if (!root) return;
    curtain = on;
    root.visible = !on;
  };

  // ---- WHAT THE VISITOR WORKS IT WITH ------------------------------------------------------------
  // KEYS. W/A/S/D and the four arrows move and strafe, Q and E turn. They are taken on the WINDOW
  // and not the canvas, because the canvas is not focusable and a visitor who has just typed a line
  // into the placard has the focus in a text field — so a key is ignored while the focus is in one,
  // which is the only way the placard and the walking can share a keyboard.
  //   AND THE PLACARD HOLDS THE KEYBOARD FOR AS LONG AS ITS FIELD IS OPEN, which is not a thing this
  //   file can argue with: dialogue.js cancels the default action of every mousedown anywhere on the
  //   page so that the focus cannot be taken off its field (THE FIELD, ON A PHONE, at length). So
  //   W/A/S/D are dead all the time a question is up — and the way out is the placard's OWN control,
  //   the fold tab, which carries the card out of the frame and blurs the field. Fold it away and
  //   walk; pull it back and write. Anything focused INSIDE the placard counts, not just the input,
  //   because the card's own arrow is a button and an arrow key belongs to whoever has the card.
  const typing = () => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    if (el.closest?.('#dialogue')) return true;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true;
  };
  const WATCHED = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  if (armed) {
    window.addEventListener('keydown', (ev) => {
      if (!WATCHED.has(ev.code) || typing() || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      keys.add(ev.code);
      goal = null;
      ev.preventDefault();
    });
    window.addEventListener('keyup', (ev) => {
      if (keys.delete(ev.code)) ev.preventDefault();
    });
    window.addEventListener('blur', () => keys.clear());
  }

  // A MOUSE DRAG ON THE GLASS TURNS, and a plain click stays a click.
  //
  // THE DRAG GRABS THE WORLD, which is what every map and every street view has taught every hand:
  // the room moves WITH the fingers, so a drag to the right carries the room to the right and the
  // lens therefore turns LEFT, and a drag downward carries the room down and the lens looks UP.
  // Only one of those two had to change. Measured on the live page against a fixed point on the
  // back wall, before anything was touched: a 160 px drag to the right moved that point from x 640
  // to x 1150.7 — with the hand, already right — and a 160 px drag downward moved it from y 392.9
  // to y 238.8, which is the room going UP while the hand goes down. So the yaw is as it was and
  // the PITCH is the inverted one; the sign below is a plus where it was a minus, and the proof
  // asserts where the room WENT rather than which way a number moved, because a sign can be read
  // two ways and a point on the glass cannot.
  //   A phone's sideways drag is the same rule and the same sign.
  const TURN_WRAP = 520; // px of drag for 90 degrees of yaw — a comfortable wrist
  const PITCH_WRAP = 900; // px for the whole 50 degrees of pitch
  //
  // AND A DRAG MAY BEGIN ON A SWITCH. The user: "it's confusing when the drag hits on the book table
  // or the piano" — a hand that set off over the reading table to look round the room arrived at the
  // reading table instead, because a switch in this room fires on the way DOWN. It cannot simply
  // fire later for everybody: a click that waits for the release is a click that feels late, and
  // eleven eggs are tuned to the press. So the arbiter holds a press only while this piece asks it
  // to (props.js, A PRESS THAT MIGHT TURN OUT TO BE A DRAG) — nothing fires on the way down, the
  // press is parked, and it goes off on the way up unless these twelve pixels have been travelled
  // first, at which point the drag cancels it and the switch never hears about the press at all.
  // The globe is the exception the arbiter itself makes: it has its own drag and keeps its pointer,
  // so `pending` is false for it and this file leaves that press alone.
  const SW = () => ctx.pieces?.props?.switches ?? null;
  const mayDrag = (x, y, target) => {
    if (!glass || target !== glass) return false;
    if (ctx.pieces?.reveal?._fan?.armed) return false;
    if (!SW()?.at?.(x, y)) return true; // bare room: nobody else wants this press
    return !!SW()?.pending; // a switch: only if the arbiter parked it for us
  };
  if (armed && glass) {
    // the arbiter asks this on every press that landed on a switch. It holds the press whenever the
    // visitor is on their feet — which is the whole time free mode owns the pose and no longer.
    SW()?.defer?.(() => owns() && !blocked());
    glass.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'touch' || ev.button !== 0) return;
      if (!owns() || blocked() || !mayDrag(ev.clientX, ev.clientY, ev.target)) return;
      drag = { x0: ev.clientX, y0: ev.clientY, yaw0: st.yaw, pitch0: st.pitch, live: false };
    });
    window.addEventListener('pointermove', (ev) => {
      if (!drag || ev.pointerType === 'touch') return;
      const dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
      if (!drag.live) {
        if (Math.hypot(dx, dy) < SLOP) return;
        drag.live = true;
        SW()?.cancelPending?.(); // whatever this press was going to be, it is a drag now
        drag.x0 += Math.sign(dx) * Math.min(Math.abs(dx), SLOP); // the slop is spent, not banked
        drag.y0 += Math.sign(dy) * Math.min(Math.abs(dy), SLOP);
        return;
      }
      if (!owns() || blocked()) {
        drag = null;
        return;
      }
      goal = null;
      st.yaw = drag.yaw0 + ((ev.clientX - drag.x0) / TURN_WRAP) * 90 * DEG;
      st.pitch = clamp(drag.pitch0 + ((ev.clientY - drag.y0) / PITCH_WRAP) * 2 * PITCH_MAX * DEG, -PITCH_MAX * DEG, PITCH_MAX * DEG);
    });
    const dropDrag = () => (drag = null);
    window.addEventListener('pointerup', dropDrag);
    window.addEventListener('pointercancel', dropDrag);

    // ---- AND WHAT THE CURSOR SAYS --------------------------------------------------------------
    // The user: "users need to understand where one can click and where there is free movement."
    // Nothing is drawn for it and nothing is labelled: the cursor is the whole affordance, which is
    // this room's own rule — a pointer over the cat is all the cat has ever said about itself.
    // So over the room it is the GRAB HAND, which every hand already reads as "take hold of this and
    // move it", and over a switch it stays the POINTER, so the two are told apart by the one thing
    // already under the visitor's hand. While a drag is actually live it is `grabbing`, and that
    // outranks a switch, because a hand that has taken hold of the room has not let go of it on
    // passing over the cat.
    // It is handed to the ARBITER rather than written here, so there is one writer on the glass and
    // the room's own careful rule about putting back only what it put there still holds; and both
    // functions answer null the moment free mode is not driving, which hands the cursor back to a
    // reading, to a place and to the notice exactly as they had it.
    SW()?.cursors?.({
      force: () => (drag?.live && owns() && !blocked() ? 'grabbing' : null),
      idle: () => (owns() && !blocked() ? 'grab' : null),
    });
  }

  // A TAP ON THE FLOOR WALKS THERE, which is the phone's whole vocabulary for moving and is the one
  // control in this prototype that had to be invented rather than borrowed. The ray goes at the
  // room's own floorboards — `room:floor`, which is a merged mesh carrying that material and nothing
  // else, so it is a clean target — and the point it strikes is clipped into the region, so a thumb
  // on the far side of the table walks the visitor to the nearest station that can see it rather
  // than refusing. The floor's vertices are warped by up to 7 mm (room-build.js), which is why the
  // hit is taken in x and z and the y thrown away.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function floorAt(px, py) {
    const r = glass?.getBoundingClientRect();
    if (!r?.width) return null;
    ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    const floor = ctx.scene.getObjectByName('room:floor');
    const hit = floor ? ray.intersectObject(floor, false)[0] : null;
    if (hit) return [hit.point.x, hit.point.z];
    // …and the analytic plane when the ray misses the drawn one, which is what a tap on the far
    // corner of a phone's frame does: the boards end at z 6.71 and a thumb can point past them.
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y >= -1e-4) return null;
    const t = o.y / -d.y;
    return [o.x + d.x * t, o.z + d.z * t];
  }
  function walkTo(px, py) {
    if (!owns() || blocked()) return null;
    const p = floorAt(px, py);
    if (!p) return null;
    const [x, z] = clipRegion(p[0], p[1]);
    goal = { x, z };
    return { x, z, raw: p };
  }

  // THE PHONE'S TWO GESTURES, and they are the pan's split, spelled out again because the pan
  // itself is off: a sideways one-finger drag turns, an up-and-down one does nothing, and a touch
  // that never travelled 12 px is a TAP. The sideways drag grabs the world exactly as the mouse's
  // does and needed no change of sign, because that axis was never the inverted one.
  //   A THUMB MAY ALSO SET OFF FROM A SWITCH, on the same terms the mouse does: the arbiter parks
  //   the press, twelve pixels turn it into a turn and cancel it, and a thumb that stays put lets
  //   it go off on the lift. What a thumb that began on a switch may NOT do is walk — the tap
  //   belongs to the thing it landed on — so the walk is only offered to a touch that began on the
  //   bare room, or the cat would light AND the visitor would set off across the floor.
  if (armed && glass) {
    let touch = null;
    glass.addEventListener(
      'touchstart',
      (ev) => {
        if (ev.touches.length !== 1) {
          touch = null;
          return;
        }
        const t = ev.touches[0];
        if (!owns() || blocked() || !mayDrag(t.clientX, t.clientY, t.target)) {
          touch = null;
          return;
        }
        touch = { x0: t.clientX, y0: t.clientY, yaw0: st.yaw, live: false, dead: false, onSwitch: !!SW()?.at?.(t.clientX, t.clientY) };
      },
      { passive: true }
    );
    glass.addEventListener(
      'touchmove',
      (ev) => {
        if (!touch || ev.touches.length !== 1) return;
        const t = ev.touches[0];
        const dx = t.clientX - touch.x0, dy = t.clientY - touch.y0;
        if (!touch.live) {
          const ax = Math.abs(dx), ay = Math.abs(dy);
          if (ax < SLOP && ay < SLOP) return;
          if (ax <= ay) {
            touch.dead = true; // up and down: nothing in this room answers one
            return;
          }
          touch.live = true;
          SW()?.cancelPending?.(); // whatever this touch was going to be, it is a turn now
          touch.x0 += Math.sign(dx) * SLOP;
          return;
        }
        if (!owns() || blocked()) {
          touch = null;
          return;
        }
        goal = null;
        st.yaw = touch.yaw0 + ((t.clientX - touch.x0) / TURN_WRAP) * 90 * DEG;
      },
      { passive: true }
    );
    const endTouch = (ev) => {
      if (touch && !touch.live && !touch.dead && !touch.onSwitch && ev.changedTouches?.length) {
        const t = ev.changedTouches[0];
        const r = glass.getBoundingClientRect();
        walkTo(t.clientX - r.left, t.clientY - r.top);
      }
      if (!ev.touches?.length) touch = null;
    };
    glass.addEventListener('touchend', endTouch, { passive: true });
    glass.addEventListener('touchcancel', () => (touch = null), { passive: true });
  }

  return {
    armed,
    get seeded() {
      return st.seeded;
    },
    seed,
    shot,
    step,
    // called once a drawing by camera.js, whether free owns the pose or not: the puppet has to be
    // put back square when it does not
    frame(on) {
      turnPuppet(on);
      hideFlames(on);
    },
    // ---- for the tools -----------------------------------------------------------------------
    get pose() {
      return { x: +st.x.toFixed(4), z: +st.z.toFixed(4), yaw: +((st.yaw * 180) / Math.PI).toFixed(3), pitch: +((st.pitch * 180) / Math.PI).toFixed(3), eye: EYE, fov: +freeFov(aspect()).toFixed(3) };
    },
    get walking() {
      return Math.abs(vel.f) > 1e-3 || Math.abs(vel.s) > 1e-3 || Math.abs(vel.t) > 1e-3 || !!goal;
    },
    get drawings() {
      return drawn;
    },
    get goal() {
      return goal ? { ...goal } : null;
    },
    get puppetYaw() {
      return +((pepeYaw * 180) / Math.PI).toFixed(3);
    },
    get region() {
      return REGION.map(([x, z]) => [+x.toFixed(4), +z.toFixed(4)]);
    },
    get limits() {
      return { eye: EYE, speed: SPEED, turn: TURN, pitchMax: PITCH_MAX, hFov: H_FOV, vMin: V_MIN, vMax: V_MAX, stop: STOP, apex: +APEX.toFixed(4), flare: +FLARE.toFixed(4), side: SIDE, back: BACK, front: FRONT };
    },
    inside: (x, z) => insideRegion(x, z),
    clip: (x, z) => clipRegion(x, z),
    walkTo,
    floorAt,
    // a tool's way of standing somewhere without a keyboard
    put(x, z, yawDeg = null, pitchDeg = null) {
      [st.x, st.z] = clipRegion(x, z);
      if (yawDeg != null) st.yaw = yawDeg * DEG;
      if (pitchDeg != null) st.pitch = clamp(pitchDeg, -PITCH_MAX, PITCH_MAX) * DEG;
      st.seeded = true;
      goal = null;
      vel.f = vel.s = vel.t = 0;
      return this.pose;
    },
    // …and a tool's way of holding a key down for a measured number of drawings
    key(code, down) {
      if (down) keys.add(code);
      else keys.delete(code);
      if (down) goal = null;
      return [...keys];
    },
  };
}
