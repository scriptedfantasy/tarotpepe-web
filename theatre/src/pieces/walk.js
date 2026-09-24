// PIECE: walk — THE VISITOR GETS UP AND CROSSES THE ROOM.
//
// The user: "I want to introduce more point and click like interactions. so for example, the user
// should be able to walk in front of the fireplace and watch the fire. or walk up to the door and
// open it. Also the user should be able to walk up to the bookshelf and open books."
//
// Until now the evening was watched from one chair. The room had switches in it — the radio, the
// cat, the grate, the bottle, the clock, the cross — and every one of them was worked from across
// the table, at whatever size it happened to measure on the glass. This piece gives the visitor
// three PLACES to stand instead, and nothing about it is announced: the cursor over the fireplace,
// over the door and over the tall case is a pointer, and that is the whole affordance. A visitor
// who never puts a pointer on the chimneypiece never learns they could have stood in front of it.
//
// ---- WHAT A PLACE IS ---------------------------------------------------------------------------
//
//   A HOTSPOT registered with the room's own pointer arbiter (props.js, THE SWITCHES). Not a
//   listener of its own: two controls with their own listeners are two controls that can answer the
//   same tap, and this room settled that argument once. The hotspot is the thing itself — the
//   chimney breast and its mantel, the door leaf and its architrave, the case's carcase — and NOT
//   the things standing on or in it. The grate, the radio, the bottle, the cat and the four spines
//   that open keep their own switches and keep taking their own clicks: the hotspot answers as a
//   DRAWING and every one of those is SUBTRACTED from it by name (`boxesOn`, `hitOf` below), so the
//   big thing takes only what is left over. That is measured rather than asserted —
//   tools/_walk-proof.mjs puts a pointer on the grate at the fireplace and on the cat, the bottle,
//   the radio and each of the spines at the case, and reports which switch the arbiter handed each
//   one to.
//
//   A NAMED SHOT (camera-shots.js: `fireplace`, `doorway`, `case`), solved for the window like
//   every other shot in the film. Square to the wall the thing stands on, framed by a rise of the
//   lens and not a tilt, a long lens pulled back.
//
//   A DOLLY, 1.5 s on the twelves — camera.move's own walk, the one the cross egg takes out through
//   the door — and the way back is the same walk reversed.
//
// ---- HOW THE VISITOR COMES BACK ----------------------------------------------------------------
// By clicking ANYTHING THAT IS NOT A SWITCH AND NOT THE PLACE'S OWN OBJECT, or by Escape. The
// arbiter stops a pointerdown that landed on a switch before it reaches the window, so what this
// piece's window listener sees is already "a click on nothing"; the place's own object is then
// subtracted here, from its own box, because standing at the fireplace and clicking the fireplace
// is not a request to leave. (For the door that click is not nothing at all — it opens the door.)
//
// ---- WHAT REFUSES A WALK -----------------------------------------------------------------------
// The same list the scroll-zoom refuses on (camera.js, `zoomAllowed`), for the same reason: four
// things in this room own the camera or the pointer while they are out, and a click during any of
// them was meant for that thing. Plus A READING IN PROGRESS — the fan armed, a pick running, cards
// standing in the row, or the flow on one of its reading beats. The visitor may talk to him from a
// place, and does; they may not walk off in the middle of having their cards read.
//
// ---- AND THE CAMERA IS HELD WHILE THEY STAND THERE ---------------------------------------------
// The conversation's own loop re-asserts its frame at the top of every turn (flow.js: `if
// (C?.current !== frame) cut(frame)`), which would pull the lens back to the chair a second after
// the visitor got to the fireplace. So the hold goes on BEFORE the first drawing of the walk
// (`{jump: false}`, or taking it would be a cut), it MOVES to `home` for the walk back — a hold on
// the shot being left would block the leaving — and it is given up on the drawing the camera comes
// to rest. This is the cross egg's own arrangement and it is written there at length.
//
// THE SCROLL IS DISARMED AT A PLACE AND NOTHING HAD TO BE WRITTEN FOR IT. camera.js arms the walk
// into the picture only when `api.current === resting`, and `resting` is `home` or `wide` and
// nothing else — a place is neither, so a wheel at the fireplace is refused at the listener. The
// proof asks for one anyway.
//
// WHAT A WINDOW CAN REACH FROM THE CHAIR, measured — tools/_walk-geom.mjs projects each hotspot's
// own eight corners through the resting plate, and tools/_walk-proof.mjs then asks the live arbiter
// at a 7 x 7 grid of points inside each box which switch it would give them to:
//     1280x800   fireplace 3.7 % of the frame (16 of 28 sampled points are the breast's; the rest
//                are the GRATE's, which is the snugger box winning the hole it is) · doorway 7.3 %
//                (49 of 49) · case 8.9 % (40 of 49; the other nine belong to the cat, the bottle
//                and two of the four spines that open)
//     1600x900   fireplace 5.6 % · doorway 6.5 % · case 8.1 %                    all three
//     1200x1100  doorway 10.7 % · case 13.1 % · fireplace OFF                    two of three
//     390x844    ALL THREE OFF THE FRAME
// The phone's numbers are worth writing down because they are so nearly misses: the case's box ends
// at x −14 and the doorway's begins at x +401 on a 390 px screen — eleven pixels off the left and
// eleven off the right, the two of them being the same frame mirrored (camera-shots.js, `shelf`).
// A phone watches the evening through the middle of the back wall and the whole of this piece is
// outside it. Nothing here invents a menu to fix that; what fixes it is the pan (camera.js, THE
// PAN), which lets a narrow window look round the room and then click what it has looked at.
// MEASURED, PANNED, on the live page (tools/_walk-proof.mjs, the PAN section): at 390x844 one tap
// on the left chevron puts the TALL CASE within reach at 102,107 and two put the FIREPLACE at
// 90,345, and a real click on either walks the visitor there. The door is the one place a narrow
// window was always going to reach most easily — it is eleven pixels off the right edge at rest and
// one tap of the right chevron brings it in.
//
// AND EACH PLACE ANSWERS AS A DRAWING, NOT AS A MARGIN. The arbiter refuses a margin box bigger
// than a quarter of the window, and panned round to it on a phone the case projects to
// 217 x 497 = 107849 px against a cap of 82290 — so as a margin it stopped answering at exactly the
// window that needs it most. It is a hit test now (`hitOf`), with the thumb's margin carried inside
// it and everything that STANDS on the place subtracted by name.
//
// api (ctx.pieces.walk):
//   at              which place the visitor is standing at, or null for the chair
//   walking         the move the camera is making, or null
//   places          the three names
//   go(name)        walk there as a click does; false if the room refuses
//   back()          walk home; false if there is nowhere to come back from
//   box(name)       that place's own object on the glass, in px (null if it is behind the lens)
//   tapBox(name)    …and the box a thumb is given
//   blocked         why a walk would be refused just now, as a word, or null
//   setState(name)  `fireplace` · `doorway` · `case` are a still AT that place; anything else is
//                   the chair. `?walk=<place>` does the same for a tool.
//   marks           the rings a phone gets on the floor: `shown`, `why`, `keys()`, `box(name)`,
//                   `ring(name)`, `tap(name)`, `stand(name)`, `radius` — see THE MARKS below and
//                   src/pieces/walk-marks.js
import { buildBooks } from './walk-book.js';
import { createCrossing } from './walk-crossing.js';
import { phoneMode } from '../core/phone.js';
import posthog from '../posthog.js';
import { mountMarks, markSize, floorRing, bboxOf, watchPointer, RING_R } from './walk-marks.js';

export const meta = {
  name: 'walk',
  judge: { shot: 'home', states: ['home', 'fireplace', 'case', 'piano', 'table'] },
  files: ['src/pieces/walk.js', 'src/pieces/walk-marks.js', 'src/pieces/walk-book.js', 'src/pieces/walk-book-page.js', 'src/pieces/book-tarot.js', 'src/pieces/props-piano.js', 'src/pieces/piano-song.js', 'src/pieces/props-table.js'],
};

// 1.5 s, which at twelve a second is eighteen drawings. The cross egg's own walk out through the
// door is 2.5 s over 6 m; these are 5 to 7 m and quicker, because that walk is a departure from the
// room and these are somebody getting up and crossing it.
const SECONDS = 1.5;
const MIN_TAP = 44; // px: what a thumb needs, whatever the thing measures on the glass

// THE THREE PLACES, as boxes in world metres. Each is THE OBJECT, not the wall behind it:
//
//   fireplace  the chimneypiece — the breast from the plaster (x −2.60) to its face (−2.36), the
//              floor to the top of the mantel (1.26), and the mantel's own oversail either way
//              (z −0.66 .. 0.56). The plaster over the shelf is NOT in it: nothing stands there
//              and it is not what a visitor means when they point at a fireplace.
//   doorway    the leaf and its architrave: the opening x 1.05 .. 1.95, floor to head 2.45, and
//              the 100 mm of reveal behind it. The cross on the frieze hangs at 2.805 — 355 mm
//              clear over the top of this box — so the two never share a point.
//   case       the carcase: x −2.10 .. −1.06, the floor to the top board at 2.45, from the lining
//              at z −2.46 to the front of the boards at −2.20.
//   piano      the spinet's carcase — x −2.564 .. −1.994 (the case and the keys it carries), the
//              floor to its lid at 0.98, z −2.10 .. −0.72. NOT the stool, which stands 0.32 m out
//              in front of it and is furniture; and not the keys, which are their own switch and
//              are subtracted from this one (`boxesOn`).
const PLACES = {
  fireplace: { shot: 'fireplace', phoneHolds: false, x: [-2.6, -2.36], y: [0, 1.26], z: [-0.66, 0.56] },
  // THE DOORWAY IS NOT A PLACE ANY MORE (the owner, 2026-09-23: "remove the functionality at the
  // door, i dont want the door to the outside to open anymore"). It was the one place with nothing
  // to do but open the door onto the crossroads; with that gone there is nothing to walk to, so its
  // hotspot, its ring on the floor and the door-by-day hand-over below went with it. The door leaf,
  // the crossroads plate and egg-cross.js's `openByDay`/`shutByDay` are untouched and simply have
  // no caller; the camera's `doorway` shot stays for the tools.
  case: { shot: 'case', phoneHolds: false, x: [-2.1, -1.06], y: [0, 2.45], z: [-2.46, -2.2] },
  piano: { shot: 'piano', holds: false, x: [-2.564, -1.994], y: [0, 0.98], z: [-2.1, -0.72] },
  //   table      the reading table stage right, where the palm stood: the top x 1.98 .. 2.52 at
  //              z −0.62 .. 0.02, and the CHAIR pulled to it (x 1.66) taken into the same box, so a
  //              visitor who points at either walks to both. The BOOK on it is a switch of its own
  //              and is subtracted from this one.
  //              Its shot is a PLAN of it, so its own box is the whole frame and the own-object
  //              exemption lapses (see `holds`): the user's own sentence is the rule — "a click
  //              off the book, or Escape, walks them back" — and the book is a switch.
  //              The shot is called `reading` and not `table`: camera-shots.js already has a shot
  //              of that name, which is HIS table and the one the reading is played on.
  table: { shot: 'reading', holds: false, x: [1.66, 2.52], y: [0, 0.92], z: [-0.62, 0.02] },
};
const NAMES = Object.keys(PLACES);

// THE WALK'S OWN PATH, and there is no waypoint on any of the three. Measured before it was left
// out: the chair is at (0, 1.62, 6.40) and every one of the three stations is at or above 1.30,
// so a straight line between them runs a clear half-metre over a table whose top is at 0.76 and
// over a seated frog whose crown is at 1.37 — the two things a `via` would have been for. In the
// floor plan the nearest any of the three chords passes to the table's axis is the fireplace's,
// at x 1.29 as it crosses z 0, which is 0.67 m outside a rim of 0.62. The cross egg's walk needs
// its waypoint because it goes THROUGH a 0.90 m opening; none of these leaves the room.
const VIA = { fireplace: [], case: [], piano: [], table: [] };

// the beats of a reading. A visitor may talk to him from the fireplace; they may not wander off in
// the middle of having their cards read. (flow.js keeps the same set for the fire's one remark.)
const READING = new Set(['shuffle', 'fan', 'dealt', 'reading', 'recall', 'flip']);

export async function build(ctx) {
  const THREE = ctx.THREE;
  const C = ctx.pieces.camera ?? null;
  const P = ctx.pieces.props ?? null;
  const glass = ctx.renderer?.domElement ?? null;

  // ---- WHERE EACH PLACE IS, FOR THE ARBITER --------------------------------------------------
  // The set is built as one merged mesh per material (room-build.js), so there is no breast object
  // and no door leaf to raycast — exactly the fire egg's position with the grate. An empty anchor
  // stands at the middle of each place's own face; the arbiter never hits it with a ray (it has no
  // geometry) and uses it only to break a tie between two margin boxes of the same size.
  const anchors = {};
  for (const [name, p] of Object.entries(PLACES)) {
    const a = new THREE.Object3D();
    a.name = `walk-${name}`;
    a.position.set(name === 'fireplace' ? p.x[1] : (p.x[0] + p.x[1]) / 2, (p.y[0] + p.y[1]) / 2, name === 'fireplace' ? (p.z[0] + p.z[1]) / 2 : p.z[1]);
    ctx.scene.add(a);
    anchors[name] = a;
  }

  // A place's eight corners on the glass. A BOX WITH THE LENS INSIDE IT IS NOT A BOX (props.js
  // learnt this when the squared deck measured 13912 x 33305 px and every egg in the room answered
  // `deck`): a corner behind the lens divides by a negative w and lands on the far side of the
  // frame. So every corner is taken into camera space first and the whole box is refused unless all
  // eight are in front of the glass. At a place the visitor is standing 3.7 to 5.4 m off the thing,
  // so this only ever refuses a box that had no business being one.
  const _v = new THREE.Vector3();
  function box(name) {
    const p = PLACES[name];
    if (!p || !ctx.camera) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    ctx.camera.updateMatrixWorld();
    for (const x of p.x) for (const y of p.y) for (const z of p.z) {
      _v.set(x, y, z).applyMatrix4(ctx.camera.matrixWorldInverse);
      if (_v.z > -ctx.camera.near) return null; // behind the lens: there is no box
      _v.set(x, y, z).project(ctx.camera);
      xs.push(((_v.x + 1) / 2) * W);
      ys.push(((1 - _v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to a thumb's 44 px. None of the three ever needs it on a laptop (the
  // smallest is the fireplace at 112 x 364) and none of them is on a phone's frame at all, so this
  // is the room's manners rather than a measurement: every switch in this room is given one.
  function tapBox(name) {
    const b = box(name);
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  const inside = (b, px, py) => !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;

  // ---- THE STATE ------------------------------------------------------------------------------
  let at = null; // which place the visitor is standing at, or null for the chair
  // HE GOES TO THE FIRE FIRST, AND NOBODY IS SEEN GOING (walk-crossing.js): the one place so far
  // where he goes too. From the chair to the fireplace his prints cross the room and the camera
  // follows them; from the fireplace home, the camera goes at once and the prints bring him back.
  const crossing = C ? createCrossing(ctx) : null;
  let mine = null; // the shot THIS piece is holding the camera on, so busy() knows its own hold
  let pending = null; // ?walk=<place>, spent on the first update
  let MARKS = null; // the drawn marks a window with no cursor gets (THE MARKS, at the foot)

  const fanOf = () => ctx.pieces?.reveal?._fan ?? null;
  const midReading = () => {
    const F = fanOf();
    if (F?.armed || F?.picking) return true;
    // a pick HALF MADE is still the reading; three taken and read are not. The three stay lying in the
    // row after he has read them, and counting them kept every place refused for the rest of the
    // evening (the owner, 2026-09-23: "after a drawing clicking on the fire place, piano or book
    // doesnt work anymore"); the reading's own beats below cover it while it is actually being read.
    const n = ctx.pieces?.reveal?.picks?.length ?? 0;
    if (n > 0 && n < 3) return true;
    return READING.has(ctx.pieces?.flow?.beat ?? '');
  };
  // Why a walk would be refused just now, as one word — so a proof can say WHICH rule answered
  // rather than only that something did.
  function blocked() {
    if (!C || !C.move) return 'no camera';
    if (C.moving) return 'moving';
    if (C.holding != null && C.holding !== mine) return 'held';
    const Pp = ctx.pieces?.props ?? null;
    if (Pp?.deck?.out) return 'deck';
    if (Pp?.cross?.out) return 'crossroads';
    // the storm owns the door and the camera while it runs; at the doorway the door is this
    // piece's own business and the day phases are entered from here (see egg-cross.js, THE DAY)
    if (Pp?.cross && Pp.cross.phase !== 'shut' && at !== 'doorway') return 'cross';
    if (ctx.pieces?.help?.showing) return 'notice';
    if (crossing?.busy) return 'crossing';
    if (midReading()) return 'reading';
    if (busy()) return 'book';
    return null;
  }

  // ---- THE WALK -------------------------------------------------------------------------------
  async function go(name) {
    const p = PLACES[name];
    if (!p || at === name || blocked()) return false;
    const from = at ? PLACES[at].shot : null; // null = off whatever pose the camera is holding
    const was = at;
    at = name;
    posthog?.capture('place_visited', { place: name });
    // the hold before the first drawing, and it is moved rather than re-taken: releasing the old
    // one first would leave one tick in which the conversation could cut the camera home
    mine = p.shot;
    C.hold(p.shot, { jump: false });
    ctx.emit?.('walk', { at, from: was, walking: true });
    if (name === 'fireplace' && !was && crossing) {
      // the camera holds while his prints cross (a phone turns to keep them in its narrow frame),
      // and follows them once the last one is down
      const legs = crossing.there();
      if (C.phonePan) {
        await legs.carry;
        if (at !== name) return true;
        const pan = crossing.panPose();
        mine = pan;
        C.hold(pan, { jump: false });
        C.move(null, pan, crossing.panSeconds);
      }
      await legs.landed;
      if (at !== name) return true;
      mine = p.shot;
      C.hold(p.shot, { jump: false });
      await C.move(null, p.shot, crossing.CROSS_SECONDS);
      crossing.settled();
      if (at === name) ctx.emit?.('walk', { at, from: was, walking: false });
      return true;
    }
    // walking on from the fire to somewhere else: his prints take him home on their own while the
    // camera goes where it was sent — never a pop back into his seat
    if (crossing?.away) {
      crossing.back();
      crossing.open();
    }
    await C.move(from, p.shot, SECONDS, { via: VIA[name] ?? [] });
    if (at === name) ctx.emit?.('walk', { at, from: was, walking: false });
    return true;
  }

  async function back() {
    if (!at) return false;
    if (crossing?.busy) return false; // his prints are still on their way
    if (C.holding != null && C.holding !== mine) return false;
    const was = at;
    at = null;
    mine = 'home';
    C.hold('home', { jump: false }); // the way home is what the hold protects now
    ctx.emit?.('walk', { at: null, from: was, walking: true });
    if (crossing?.away && C.phonePan && crossing.pan) {
      // he comes home on his own. A phone's narrow frame cannot hold his road from the chair, so it
      // turns to where it watched him go, watches the prints come back, and turns home as he forms
      const legs = crossing.back();
      mine = crossing.pan;
      C.hold(crossing.pan, { jump: false });
      await C.move(null, crossing.pan, crossing.backPanSeconds);
      await legs.turn;
      if (at !== null) { crossing.open(); return true; }
      mine = 'home';
      C.hold('home', { jump: false });
      await C.move(null, 'home', crossing.homeSeconds);
      crossing.open();
    } else {
      const coming = crossing?.away; // he comes home on his own, alongside the camera
      if (coming) crossing.back();
      await C.move(null, 'home', SECONDS, { via: VIA[was] ?? [] });
      if (coming) crossing.open();
    }
    if (at !== null) return true; // somebody walked somewhere else while this was running
    C.release?.('home');
    mine = null;
    // AND THE LAST DRAWING IS STRUCK AGAIN AS A CUT. A dolly's last position comes off
    // `getPointAt(1)`, which is the destination to within a float; `camera.atRest` compares the
    // live pose to `poseOf(shots.home)` with `Vector3.equals`, and ink.js hangs the picture on the
    // back wall off that answer (one scene pass when it is yes, two when it is no). A cut to the
    // shot the camera has just arrived at moves nothing the eye can see and makes the hand-over
    // exact, which is the whole of what it is for.
    if (C.current === 'home' && !C.moving) C.cut('home');
    ctx.emit?.('walk', { at: null, from: was, walking: false });
    return true;
  }

  // ---- THE POINTER ----------------------------------------------------------------------------
  // Three hotspots on the room's own arbiter. `enabled` takes each of them out of the room while the
  // visitor is standing at it — a switch that would do nothing is not a switch — and the window
  // listener below then reads a click on the thing you are standing at from its own box instead.
  //
  // WHAT STANDS ON EACH PLACE AND KEEPS ITS OWN CLICK. This list is the whole of the "two things on
  // one object" arrangement, written down rather than hoped for, and it is needed because the
  // hotspots answer as DRAWINGS and not as margins — see `hitOf` below.
  const boxesOn = (name) => {
    const Pp = ctx.pieces?.props ?? null;
    if (name === 'fireplace') return [Pp?.fine?.tapBox?.()];
    if (name === 'piano') return [Pp?.piano?.tapBox?.()];
    if (name === 'table') return [Pp?.table?.tapBox?.()];
    return [Pp?.cat?.tapBox?.(), Pp?.wine?.tapBox?.(), Pp?.radio?.tapBox?.(), ...(api.books?.openBoxes?.() ?? [])];
  };
  // A PLACE ANSWERS AS A DRAWING, AND THE THINGS ON IT ARE SUBTRACTED FROM IT.
  //
  // It was a margin for one round and the arbiter refused it where it mattered most: a margin box
  // bigger than a quarter of the window is not a margin (props.js measured that rule against the
  // squared deck's 13912 x 33305 px), and on a 390x844 phone panned round to it the TALL CASE
  // projects to 217 x 497 = 107849 px against a cap of 82290. The case simply stopped answering at
  // the one window that most needs it. (The fireplace's 194 x 395 = 76630 squeaks under; the grate
  // inside it did not, and egg-fine.js took the same medicine this round.)
  //
  // So the test is the place's own rectangle — every corner of which is checked to be IN FRONT of
  // the lens before it is a rectangle at all, which is the fault the cap was written against — plus
  // the thumb's margin round it while that is still a margin. And then everything that STANDS on it
  // is subtracted, because the first pass ranks by distance to the lens and this anchor sits at the
  // face of the thing: without the subtraction the breast would take the grate's own hole and the
  // case would take the cat off the shelf. Measured in tools/_walk-proof.mjs, at every place, for
  // every switch standing in it.
  const areaCap = () => (ctx.size?.w || window.innerWidth) * (ctx.size?.h || window.innerHeight) * 0.25;
  // DOES A CLICK ON THE PLACE'S OWN OBJECT MEAN «I AM LOOKING AT THIS» OR «I HAVE SEEN ENOUGH»?
  // Four of the five places say the first: you are standing in front of a thing that is IN a
  // picture, and clicking it is not a request to leave. THE READING TABLE CANNOT SAY IT, because
  // its shot is a plan of the table itself and the table is therefore the picture. Measured, its
  // own box on the glass:
  //     1280x800   90.1 % of the frame
  //     1600x900   86.1 %
  //      390x844  100.0 %  — there is no pixel of that frame which is not the table
  // So with the exemption on, a visitor at the table on a phone has nowhere at all to click to get
  // back to the chair and only Escape would do it. The user's own sentence is the rule — a click
  // off the book, or Escape, walks them back — so `table` carries `holds: false` and every click
  // that is not the book is the way out.
  //
  // IT IS A PROPERTY OF THE PLACE AND NOT A THRESHOLD ON THE AREA. The first cut of this made it a
  // rule — the exemption lapses past 60 % of the frame — and that is a tidier-looking thing that
  // quietly changes three places nobody asked about: the piano's carcase measures 95.8 / 100 / 99.4
  // at its own shot and the case 89.2 on a phone, and all of them would have stopped holding their
  // own click this round. Those are the same rooms they were yesterday. What the table needs is an
  // answer for the table.
  //
  // …AND THE PIANO TURNED OUT TO NEED THE SAME ANSWER, by the same measurement: at 844x390
  // landscape its carcase is 100 % of the frame, the rest being the keys and the next place's
  // hotspot, and a phone has no Escape — a touch visitor at the piano could not leave at all.
  // Clicking the carcase does nothing (the keys are their own switch), so `piano` carries
  // `holds: false` too: a tap that is not the keys, and not another place, walks them back.
  //
  // What is never the way out at any place is the SWITCH standing on the thing — the grate, the
  // keys, the book — because the arbiter takes that click before this listener ever sees it.
  //
  // …AND ON A PHONE HELD UPRIGHT THE TALL CASE NEEDS IT AS WELL (2026-09-23, measured at 390x844 and
  // 375x667): its shot is taller than the frame is wide, so the carcase is every pixel of the glass
  // that is not a switch standing on it (the radio, the wine, the cat) — 190 of 216 cells, and no
  // cell at all that walks the visitor back, with no Escape key to do it instead. Nothing on the
  // case's own boards answers a tap (the TAROT spine is a book on a shelf, see walk-book.js), so on
  // a phone `phoneHolds: false` lets a tap on the boards walk them back. A laptop keeps its hold.
  //
  // …AND THE FIREPLACE, 2026-09-24, for the same reason: held upright, its shot is the chimney
  // breast edge to edge, so a thumb had nowhere to go but the piano at the side — which walked the
  // visitor on to the piano and put Pepe back in his seat in one drawing, with none of his crossing
  // home (the owner: "on mobile we're still missing the black lines that port him back"). The grate
  // is a switch of its own and keeps its tap; the breast round it now walks the visitor back.
  const PHONE = phoneMode();
  const ownsClick = (name) => PLACES[name]?.holds !== false && !(PHONE && PLACES[name]?.phoneHolds === false);
  // THE PLACE ITSELF, WITHOUT ITS MARK — the drawing, the thumb's margin round it while that is
  // still a margin, and everything standing on it subtracted. This is what the mark is PLACED
  // against (walk-marks.js, `spotIn`), so it cannot be the test that already includes the mark.
  function hitBase(name, px, py) {
    if (!inside(box(name), px, py)) {
      const t = tapBox(name);
      if (!t || t.w * t.h > areaCap() || !inside(t, px, py)) return false;
    }
    for (const b of boxesOn(name)) if (inside(b, px, py)) return false;
    return true;
  }
  // …AND THE RING ON THE FLOOR IS PART OF THE TARGET. A visitor who can see the ring at the
  // fireplace and puts a thumb on it has asked to go and stand there — and the boards under that
  // ring are not the chimney breast, so without this the tap would land on nothing and walk them
  // HOME. It is carried as a SECOND box rather than folded into `tapBox`: the ring is on the floor
  // and the place is on the wall, sometimes a third of a frame apart, and a bounding box drawn round
  // the two of them would be most of the window — which the arbiter refuses as a margin anyway, and
  // would swallow every egg standing between them. Grown to 44 px, the same thumb every other switch
  // in this room is given, because a ring seen end-on can be nine pixels tall.
  function markTap(name) {
    const b = MARKS?.boxOf?.(name);
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
  }
  function hitOf(name, px, py) {
    if (hitBase(name, px, py)) return true;
    if (!inside(markTap(name), px, py)) return false;
    for (const b of boxesOn(name)) if (inside(b, px, py)) return false;
    return true;
  }
  for (const name of NAMES) {
    P?.switches?.add?.({
      name: `walk-${name}`,
      object: () => anchors[name],
      tapBox: () => tapBox(name),
      hit: (px, py) => hitOf(name, px, py),
      enabled: () => at !== name && !blocked(),
      onDown: () => go(name),
    });
  }

  // THE WAY BACK. A pointerdown that reached the window is one the arbiter did not give to a
  // switch, so it is already "a click on nothing" — all that is left to subtract is the place's own
  // object, because standing at the fireplace and clicking the fireplace is not a request to leave.
  // The target must be the GLASS: a tap on the placard, the notice or the titles belongs to them.
  window.addEventListener('pointerdown', (ev) => {
    if (!at || ev.target !== glass) return;
    if (C.moving) return; // the walk out is still running; let it finish
    const r = glass.getBoundingClientRect();
    const px = ev.clientX - r.left, py = ev.clientY - r.top;
    // THE PLACE'S OWN ANSWER FIRST. The door has one (step 3: it opens, and once it is open any
    // click that is not a castle shuts it again); the other two have none, and for them what is
    // left is the rule itself — a click on the thing you are standing at is not a request to leave.
    if (onOwn(at, px, py, ev) || (ownsClick(at) && inside(box(at), px, py))) {
      ev.stopImmediatePropagation();
      return;
    }
    // the audio context's first-gesture unlock lives on this same window and is about to be
    // stopped, so it is called by hand — the arbiter does exactly this for the same reason
    ctx.pieces.sound?.start?.();
    ev.stopImmediatePropagation(); // …and flow does not also read this as the visitor skipping his line
    back();
  });

  // What a click on the place's own object does while the visitor is standing at it. Nothing, for
  // two of the three; step 3 gives the door its own answer and hangs it here.
  let onOwn = () => false;

  // ESCAPE. It means one step back, and only that: this piece is built before help and before flow,
  // so it answers first — and it hands the key straight on when the notice is up (`blocked`) or
  // when there is nowhere to come back from.
  window.addEventListener('keydown', (ev) => {
    const t = ev.target?.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return; // he is being written to
    if (ev.key !== 'Escape' || !at) return;
    if (ctx.pieces?.help?.showing) return; // the notice is in front of the room: it gets the key
    if (busy()) return; // …and so does a book standing open on the sheet (walk-book.js)
    ev.stopImmediatePropagation();
    if (onEscape(at)) return; // step 3: the door shuts before the visitor walks away from it
    back();
  });
  let onEscape = () => false;
  let busy = () => false;

  const api = {
    get at() {
      return at;
    },
    get walking() {
      return C?.moving ?? null;
    },
    get blocked() {
      return blocked();
    },
    places: [...NAMES],
    shots: Object.fromEntries(NAMES.map((n) => [n, PLACES[n].shot])),
    bounds: (name) => (PLACES[name] ? { ...PLACES[name] } : null),
    // whether a click on this place's own object means «stay» just now — see `ownsClick`
    owns: (name) => ownsClick(name),
    box,
    tapBox,
    go,
    back,
    // steps 3 and 4 hang their own answers here rather than this file knowing about the door or the
    // books: `onOwn` is what a click on the place's own object does, `onEscape` what the key does
    // first, and `busy` is a piece of the place standing IN FRONT of the room — a book on the sheet
    // — which takes both the key and any walk until it is put down.
    hang(handlers = {}) {
      if (handlers.onOwn) onOwn = handlers.onOwn;
      if (handlers.onEscape) onEscape = handlers.onEscape;
      if (handlers.busy) busy = handlers.busy;
    },
    // A JUDGED FRAME IS A STILL: the camera JUMPS to the place, nothing walks and nothing is held.
    // `?view=walk&state=case` is somebody looking at one drawing, not watching a move.
    setState(name = 'home') {
      const p = PLACES[name];
      if (!p) {
        at = null;
        mine = null;
        C?.release?.(C?.holding);
        C?.cut?.('home');
        return;
      }
      at = name;
      mine = null;
      C?.release?.(C?.holding);
      C?.cut?.(p.shot);
    },
    afterRender() {
      crossing?.afterRender();
    },
    crossing,
    update() {
      api.books?.update?.();
      crossing?.update();
      // taken away from the fire by any other road (a judged state, a cut): he is simply back
      if (crossing?.away && !crossing.active && at !== 'fireplace') crossing.reset();
      drawMarks();
      // SELF-HEALING. If the camera left a place by a road that did not come through this piece —
      // a judging state, a tool putting the cross away, anything that cuts — then the visitor is
      // not standing there any more and this piece must stop saying they are. It cannot fire during
      // a walk (the camera is moving) or during the door's excursion (the cross egg is holding it).
      if (at && C && !C.moving && C.holding == null && C.current !== PLACES[at].shot) {
        at = null;
        mine = null;
      }
      // ?walk=<place> is parked and spent on the first update, for main.js's own reason: it cuts
      // the camera to a shot after every piece is built, and a cut is a cut.
      if (pending) {
        const name = pending;
        pending = null;
        if (PLACES[name]) api.setState(name);
      }
    },
  };

  // ---- STEP 3: THE DOOR, OPENED — RETIRED 2026-09-23 --------------------------------------------
  // The doorway is no longer a place (see PLACES), so nothing below is reached from the door now;
  // what follows is the table's own-object rule, which shared the hand-over.
  // The leaf, the plate outside it and the two castles all belong to the cross egg, and this piece
  // does not own one line of any of them: what it owns is WHERE THE VISITOR IS STANDING, which is
  // the only thing the egg could not know. So the two answers a door needs are handed over the
  // counter — egg-cross.js's `openByDay` and `shutByDay`, which refuse from any phase but their own.
  //
  //   a click on the leaf or its architrave, standing at the doorway, with the cross quiet → it
  //     opens by day, the camera walks out and the country is there;
  //   a click on anything that is not a castle, once it is open → it shuts and the visitor walks
  //     back to the chair. The camera is OUTSIDE by then, so the doorway has no box on the glass
  //     at all and the test cannot be "was it on the door" — while the afternoon is up, every
  //     click the arbiter did not give to a castle is the visitor saying they have seen enough;
  //   Escape, the same.
  api.hang({
    onOwn: (place, px, py) => {
      // AT THE TABLE, THE FIRST CLICK OFF THE BOOK SHUTS IT. The book is an object on the table now
      // and not a sheet in front of the room (walk-book.js), so a click that is not on the paper and
      // not on the ribbon reaches this listener like any other — and while the boards are open it
      // means «I have finished reading», not «I have finished at this table». The second one, or
      // Escape again, walks them back, which is the user's own sentence for this place.
      if (place === 'table') return BOOKS.showing ? BOOKS.close() : false;
      return false;
    },
    onEscape: () => false,
  });
  // AND THE VISITOR IS NO LONGER AT THE DOOR THE MOMENT IT STARTS SHUTTING. The egg walks the
  // camera home itself (its own hold, its own dolly, its own release), so this piece lets go of
  // both at `day-closing` rather than calling `back()` over the top of it — two walks home at once
  // is the one thing the hold exists to prevent.


  // ---- STEP 4: THE BOOKS ------------------------------------------------------------------------
  // Four of the spines on the tall case come off it and open over the room (src/pieces/walk-book.js
  // draws them, src/pieces/book-tarot.js is what is printed in them). They are switches on the same
  // arbiter as everything else and they answer only while the visitor is standing at the case.
  const BOOKS = buildBooks(ctx, { switches: P?.switches, place: () => at });
  api.books = BOOKS;
  const bookUp = () => BOOKS.showing;
  // …and while a book is up it owns the room. Escape closes the book before it walks anybody home,
  // and a click on the paper never reaches this piece at all (the sheet is a DOM layer over the
  // canvas, and the test at the head of the pointer handler is that the target IS the canvas).
  api.hang({ busy: bookUp });

  // ---- THE MARKS: A FLOOR PLAN, AND NOTHING ELSE -------------------------------------------------
  // The user: "choosing the fireplace, piano and book section on mobile is quite hard to do … it's
  // actually where to tap on the phone. I think a drawn mark would be good."
  // The user, on the first cut of it: "Only use marks in the room to specify where users can go,
  // preferably on the floor. The individual objects that can be clicked should not be marked because
  // users should discover them by themselves."
  //
  // The ring itself is drawn by src/pieces/walk-marks.js and that file argues what it looks like,
  // why it is projected rather than a sheet in the scene, and which windows get one. What lives HERE
  // is the only part this room's rules touch: WHERE the five rings lie, and WHEN they go away.
  //
  //   FIVE RINGS, ONE PER PLACE, ON THE FLOOR — at the spot a visitor would stand to be at that
  //   place, not on the thing itself. A ring in the frame is a place that can be walked to; a place
  //   whose spot is off the frame has none, and on a phone square to the back wall that is all five
  //   of them, so the rings come in one at a time as the visitor pans. That is the pan teaching
  //   itself, which is the only teaching this room does.
  //
  //   AND NOTHING AT ALL IS MARKED ON AN OBJECT. Not the grate, the keys, the book or the door leaf;
  //   not the cat, the radio, the bottle, the lamp, the photograph, the clock, the vase, the deck,
  //   the cross or the peep jar. The first cut marked the thing to act on at each place and the user
  //   took it off, rightly: what a visitor does when they get somewhere is theirs to find, exactly
  //   as it is on a laptop, where the whole affordance is the cursor changing over the radio. The
  //   walk back stays a tap on nothing, as it always was.
  //
  // WHERE A VISITOR STANDS, in world metres on the floor at y = 0, taken off each place's own box
  // rather than off its camera — the shots are long lenses pulled 3.7 to 5.4 m back and the lens is
  // nowhere near where a person's feet would be. Each is the open floor in FRONT of the thing:
  //   fireplace  0.86 m out from the breast's face (x −2.36), on the firebox's own centre line
  //   piano      0.67 m out past the stool (which itself stands 0.32 m out from x −1.994), at the
  //              FRONT end of the keyboard's run rather than its middle — see below
  //   case       0.58 m out from the front of the boards (z −2.20), at the RIGHT-HAND end of the
  //              carcase rather than its middle — see below
  //   table      0.35 m short of the chair that is pulled to the reading table (x 1.66)
  //   doorway    inside the room from the leaf (z −2.4), on the opening's centre line
  //
  // TWO OF THEM ARE DELIBERATELY OFF THEIR OBJECT'S CENTRE LINE, and the first cut of this was
  // wrong for want of it. The spinet runs along the stage-left wall and the tall case along the back
  // wall, and the two of them MEET AT THAT CORNER: standing squarely in front of the middle of each
  // puts the two spots 0.21 m apart, which at 390x844 is two rings drawn on top of one another and a
  // visitor with no way to tell which of them they are about to tap. So the piano's spot is taken to
  // the front end of its keyboard and the case's to the far end of its boards, which is still in
  // front of each and is 0.68 m apart — the closest pair of the five, against a ring 0.34 m across,
  // so there is a third of a metre of bare board between their edges. (Measured, all ten pairs: the
  // next closest is the fireplace and the piano at 0.92 m.)
  //
  // None of them is under anything: the nearest of the five to the round table's axis is the reading
  // table's at 1.34 m, against a rim of 0.62, which is what keeps a drawn ring — which has no depth
  // test — from lying over furniture it should be behind. See walk-marks.js, THE ONE THING A SHEET
  // WOULD HAVE DONE BETTER.
  //
  // AND THE ROOM TAKES THEM BACK whenever it is doing something rather than waiting. `blocked()` is
  // most of that list already — a walk running, somebody else holding the camera, the deck out, the
  // crossroads, the notice, a reading, a book standing open — and four more are added here: the pan
  // still drifting (the ring is struck at the live camera, so a moving camera means a stale ring for
  // the four or five drawings a flick takes to settle), the placard's field with the focus (his
  // paper is in front of the room and a phone's keyboard is up over it), the fire alight and the
  // lamp out. The last two are the room GIVEN OVER to something: a picture of a fire to watch, or a
  // dark room to sit in. A tap puts either of them back and the rings come back with it.
  //
  // THE WORD `blocked()` GIVES IS THE FIRST TRUE ONE AND NOT THE MOST INTERESTING ONE, which is
  // worth knowing before reading a proof's output: the book opening at the reading table reports
  // `held` rather than `book`, because walk-book.js takes the camera on its way up and `blocked()`
  // asks about the camera before it asks whether a book is standing open. Both answers hide the
  // rings.
  const STAND = {
    fireplace: [-1.5, -0.05],
    piano: [-1.32, -0.95],
    case: [-1.2, -1.62],
    table: [1.31, -0.3],
  };
  const FIELD = () => {
    const t = document.activeElement?.tagName;
    return t === 'INPUT' || t === 'TEXTAREA';
  };
  function marksOff() {
    const why = blocked();
    if (why) return why;
    if (C && C.pan !== C.panTarget) return 'panning';
    if (FIELD()) return 'field';
    const Pp = ctx.pieces?.props ?? null;
    if (Pp?.fine?.burning) return 'fire';
    if (Pp?.dark?.on) return 'dark';
    return null;
  }
  // THE FIVE RINGS THIS DRAWING. A place the visitor is already standing at is not a place to walk
  // to and keeps no ring. A ring whose spot is behind the lens, or off the frame, or so foreshortened
  // that it is a smudge rather than a mark, is not drawn — the place keeps its own hotspot on the
  // object either way, which is the affordance a laptop has always had.
  function ringsNow() {
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const { least } = markSize(H);
    const out = [];
    for (const name of NAMES) {
      if (at === name) continue;
      const s = STAND[name];
      if (!s) continue;
      const pts = floorRing(ctx, s[0], s[1], RING_R);
      if (!pts) continue;
      const b = bboxOf(pts);
      if (!b || b.w < least || b.h < 2) continue;
      // …and it has to be ON the frame. A ring half off the edge is still a ring; one wholly off it
      // is a tap target nobody can see, and the arbiter would be answering for a thing that is not
      // in the picture.
      const onX = Math.min(b.x + b.w, W) - Math.max(b.x, 0);
      const onY = Math.min(b.y + b.h, H) - Math.max(b.y, 0);
      if (onX <= 0 || onY <= 0) continue;
      out.push({ key: name, pts });
    }
    return out;
  }
  // `?marks=1` forces them on for a tool on any window; it overrides the POINTER test and nothing
  // else, because a mark drawn over a reading would be a picture of a different room. `?marks=0`
  // is the other way about and exists for one reason: every page tools/_walk-proof.mjs opens is
  // opened WITH TOUCH, so that proof now walks a marked room, and a claim that comes out differently
  // there than it did last round has to be askable which of the two it was. It is the room as a
  // laptop sees it, on any window.
  const asking = ctx.params?.get?.('marks');
  const forced = asking === '1';
  const refused = asking === '0';
  const cursorless = watchPointer(() => {});
  MARKS = mountMarks(ctx);
  ctx.on?.('resize', () => MARKS?.resize?.());
  let markWhy = 'cursor';
  let markAt = [];
  function drawMarks() {
    if (!MARKS) return;
    const why = refused ? 'refused' : !forced && !cursorless() ? 'cursor' : marksOff();
    markWhy = why;
    if (why) {
      if (!markAt.length) return;
      markAt = [];
      MARKS.update({ show: false, parity: 0, marks: [] });
      return;
    }
    // The rings are re-projected on every DRAWING and not on every frame: the camera does not move
    // between drawings in this film, and the boil is the twelves' own.
    if (ctx.clock.stepped || !markAt.length) markAt = ringsNow();
    MARKS.update({ show: true, parity: ctx.clock.frame % 2, marks: markAt });
  }
  api.marks = {
    // whether they are in the picture, and the one word for why they are not
    get shown() {
      return markWhy == null;
    },
    get why() {
      return markWhy;
    },
    // whether this window has no cursor in it, and whether ?marks= is overriding that either way
    get cursorless() {
      return cursorless();
    },
    get forced() {
      return forced;
    },
    get refused() {
      return refused;
    },
    // the ring's radius on the boards, in metres, and where each of the five is laid
    radius: RING_R,
    stand: (name) => (STAND[name] ? [...STAND[name]] : null),
    // the ring's own box on the glass, and the projected ring itself so a proof can measure its
    // axes against the floor's own foreshortening rather than trust a box
    box: (key) => MARKS?.boxOf?.(key) ?? null,
    ring: (key) => MARKS?.ringOf?.(key) ?? null,
    // the box a thumb is given for a place's ring — the ring's box grown to 44 px, carried on top
    // of the place's own target rather than folded into it
    tap: (name) => markTap(name),
    keys: () => MARKS?.keys?.() ?? [],
  };

  const asked = ctx.params?.get?.('walk');
  if (asked && PLACES[asked]) pending = asked;
  return api;
}
