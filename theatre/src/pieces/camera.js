// PIECE: camera — the staging. A view camera on a rail: every shot is square to the back wall
// (the lens axis at 90° to it, verticals vertical, the far wall a flat elevation) and framed by a
// rise or fall of the lens (`shift`) rather than a tilt, the way the drawn frames keep the wall
// flat while the floor and the tabletop read from above. Long lenses, pulled back, so the side
// walls are slivers and nothing converges hard. The camera cuts; when it moves it moves on a rail:
// a lateral track at constant speed, a straight push down the axis, or a whip — three frames of
// big displacement and a hard stop, no blur (stop-motion has no blur). Tracks and pushes run in
// ctx.clock.raw (the camera is not a puppet); the whip runs on the 12fps frame count.
//
// ROUND 5 — the shots are no longer written here as lenses. A shot is a position and a list of
// things that must be IN THE PICTURE, and the lens is solved for the window the film is being shown
// in: see camera-shots.js (what each frame must contain, and why) and camera-frame.js (the
// arithmetic). Two things follow that this file has to do: the table is rebuilt on every resize,
// and the camera goes back onto its current shot when it is, so a window dragged from 16:9 to a
// phone re-frames instead of cropping.
//
// ROUND 6 — the shots over the TABLE are solved by a second solver, camera-plan.js, which frames
// them the opposite way round: no lens rise at all, the camera standing on the room's axis of
// symmetry, and the point it looks at IS the centre of the frame. That is what makes a plan read
// as a plan — the row of three parallel to the frame's top edge, the cards square to it, the rim a
// true circle — rather than as the casual three-quarter a shifted lens over a table produces. This
// file does not care which solver made a shot: both return {pos, look, up, fov, shift}.
//
// ROUND 3 — THE CAMERA HAS A DOLLY. `move(from, to, seconds, {via})` walks the lens from one shot
// to another along a curve through as many waypoints as it is given, stepped on the 12 fps clock —
// a new position every DRAWING, never a smooth glide — and eased in and out by the same motor the
// rail's track uses. It is general: any piece may ask for one between any two shots. The egg over
// the door is the first customer (the room walks out through the doorway instead of cutting), and
// the entrance could take the same road: its arrival is hand-rolled today because there was no such
// call to make.
//
// TWO MODIFIERS ON THE PLATE THE EVENING IS WATCHED FROM, and they are never on together. THE
// SCROLL walks into the picture of this room hanging on the back wall (THE SCROLL, below). THE PAN
// turns the lens on its own station so a window too narrow to hold the room can look round it —
// added the round the visitor got up out of the chair, because a phone's frame holds 2.0 m of a
// 5.2 m wall and everything a visitor might walk to is outside it (THE PAN, below; the drawn
// control is src/pieces/camera-pan.js).
//
// API: shots (the named shots; every layout name is kept, others added), current, cut(shot),
//      hold(shot, {jump}) / release(shot) / holding — one shot nobody else may cut away from,
//      move(shot, {kind: 'cut'|'push'|'track'|'whip', duration})   — the rail, and
//      move(from, to, seconds, {via, ease})                        — the dolly (round 3),
//      moving (what a move is doing, for a tool), sequence([{shot, kind, duration, hold}]),
//      stop(), setState(name).
// A shot is {pos, look, fov, up?, shift?: [x, y]} — shift in fractions of the frame, +y = the frame
// drops (shows more floor) while the camera keeps looking straight ahead.
import * as THREE from 'three';
import { buildShots } from './camera-shots.js';
import { tanHalf } from './camera-frame.js';
import { mountChevrons } from './camera-pan.js';

export const meta = {
  name: 'camera',
  judge: { shot: 'home', states: ['home', 'wide', 'pepe', 'table', 'spread', 'fan', 'turn', 'riffle', 'card1', 'door', 'crossroads', 'fireplace', 'doorway', 'case', 'track', 'whip', 'zoom-half', 'zoom-deep', 'pan-left', 'pan-right'] },
  files: ['src/pieces/camera.js', 'src/pieces/camera-shots.js', 'src/pieces/camera-frame.js', 'src/pieces/camera-plan.js', 'src/pieces/camera-pan.js'],
};

// Motor speeds of the rail: a lateral track, a push. Metres per second.
const TRACK_SPEED = 0.62;
const PUSH_SPEED = 0.55;
// The whip: the fraction of the way travelled at each 12fps frame after the start frame, then a hard stop.
const WHIP_FRAMES = [0.34, 0.74, 1];
// THE REFRAME, when a card lands in the reading row and the plate opens to take it (round 9). A
// third of a second: four frames of the 12fps drawing, short enough to be over before flow cuts to
// his face for the reaction beat (it waits 0.35 s after the pick), long enough to be a move and not
// a jump. It leaves at once — the card landing is the cue and the camera answers it — and brakes
// through the last two thirds, so the picture arrives at rest.
const OPEN_S = 0.34;

export async function build(ctx) {
  const cam = ctx.camera;
  const L = ctx.layout;
  const aspect = () => {
    const w = ctx.size?.w || window.innerWidth || 1600, h = ctx.size?.h || window.innerHeight || 900;
    return w / h;
  };

  // Every name from the layout survives (other pieces cut to them); the values are solved in
  // camera-shots.js for the window we are in, and solved again when it changes shape.
  //
  // ROUND 7 — and the plates take their SUBJECT from the reveal piece, not from a constant. The row
  // of three is where reveal lays it (`reveal.slots`) and the spread is the bows it actually built,
  // so the tabletop frames follow the cards instead of a number that stopped describing them two
  // rounds ago. Read fresh on every reframe: the piece is built before the camera, but it re-lays
  // the cloth between beats and a window dragged to another shape re-reads it.
  //
  // ROUND 9 — and one of them follows the BEAT as well as the window. The fan plate is composed on
  // the spread while the reading row is empty and opens to take each slot as a card lands in it
  // (camera-shots.js), so the camera has to know how many are down. `reveal.picks` is the contract
  // and covers the live evening; the judging states lay the row without ever going through a pick
  // (reveal's `deal` puts three real cards on the slots, `gather` fakes three out of the spread), so
  // the count is the largest of the three readings rather than the first one that answers. Read
  // fresh, never cached: a second reading resets it to none.
  const revealPiece = () => ctx.pieces?.reveal ?? null;
  const laidCount = () => {
    const R = revealPiece();
    const slots = R?.slots?.length ?? 3;
    const picks = R?.picks?.length ?? 0;
    if (picks >= slots) return slots;
    const drawn = ctx.pieces?.cards?.drawn?.children?.length ?? 0;
    let taken = 0;
    for (const e of R?._fan?.entries ?? []) if (e?.removed) taken++;
    return Math.min(slots, Math.max(picks, drawn, taken));
  };
  let laid = laidCount();
  const shots = buildShots(L, aspect(), revealPiece(), { laid, props: ctx.pieces?.props ?? null });
  const reframe = () => {
    laid = laidCount();
    const next = buildShots(L, aspect(), revealPiece(), { laid, props: ctx.pieces?.props ?? null });
    for (const k of Object.keys(shots)) delete shots[k];
    Object.assign(shots, next);
  };

  // ---- poses ----
  const _m = new THREE.Matrix4();
  const resolve = (s) => (typeof s === 'string' ? shots[s] : s) ?? shots.home;
  function poseOf(shot) {
    const pos = new THREE.Vector3().fromArray(shot.pos);
    const look = new THREE.Vector3().fromArray(shot.look);
    const up = new THREE.Vector3().fromArray(shot.up ?? [0, 1, 0]);
    _m.lookAt(pos, look, up);
    return { pos, q: new THREE.Quaternion().setFromRotationMatrix(_m), fov: shot.fov ?? 30, shift: [...(shot.shift ?? [0, 0])] };
  }
  const shift = [0, 0];
  function applyShift(x, y) {
    shift[0] = x;
    shift[1] = y;
    const w = ctx.size?.w || window.innerWidth || 1600, h = ctx.size?.h || window.innerHeight || 900;
    if (!x && !y) {
      if (cam.view?.enabled) cam.clearViewOffset();
      cam.aspect = w / h;
    } else cam.setViewOffset(w, h, x * w, y * h, w, h);
  }
  function applyPose(p) {
    cam.position.copy(p.pos);
    cam.quaternion.copy(p.q);
    cam.up.set(0, 1, 0).applyQuaternion(p.q);
    cam.fov = p.fov;
    applyShift(p.shift[0], p.shift[1]);
    cam.updateProjectionMatrix();
  }
  function currentPose() {
    return { pos: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov, shift: [...shift] };
  }

  // ---- THE SCROLL ---------------------------------------------------------------------------
  // The room has a picture of itself on the back wall (src/pieces/egg-droste.js) and the visitor can
  // scroll INTO it. The user: "basically have infinity scroll that always scrolls into the picture
  // which is the room which is the picture which is the room etc etc."
  //
  // IT IS A MODIFIER ON `home` AND NOTHING ELSE. `zoom` is an unbounded real; its fractional part
  // t is the pose. At t = 0 the camera is on the home plate, to the bit — there is a short-circuit
  // below that hands back the solved shot rather than a pose arithmetic happens to land on, because
  // the whole trick rests on those two frames being the same frame. As t runs to 1 the camera walks
  // up the picture's own normal until the picture EXACTLY fills the window, and because the picture
  // is a live frame of the home plate, the frame at t → 1 IS the frame at t = 0. Then t wraps to 0
  // and nothing has happened. Scrolling the other way wraps to t → 1, which is the room seen from
  // inside its own picture — it works in both directions for the same reason.
  //
  // THE GEOMETRY, and it is only as complicated as it is because of the lens rise. The back wall is
  // square to the home camera (every frontal shot in this file is), so the end of the walk is the
  // camera standing on the picture's normal through its centre, flat, with no rise at all, at the
  // distance D1 = halfH / tan(fov/2) where the sheet's height fills the vertical field. It fills the
  // width at the same moment because the sheet is cut to the window's aspect — that is what
  // egg-droste.js re-cuts it for on every resize.
  //   DISTANCE is exponential in t: D(t) = D0·(D1/D0)^t. That makes the picture's height on the
  //   glass grow as h0^(1-t) — a constant rate of zoom per unit of t, so a flick reads as one
  //   movement rather than as a lunge at the end.
  //   THE SCREEN CENTRE of the picture runs LINEARLY from where it sits at home to the middle of
  //   the window, and the lens rise runs linearly to zero with it. Those two, plus D(t), are enough
  //   to solve the camera's x and y at every t: put the picture's projected centre where it is
  //   supposed to be and read the camera's position off it.
  // Swept at t = k/20 (tools/_droste-proof.mjs): the projected rectangle grows monotonically in both
  // dimensions at every window shape, and every edge of it stays inside the window until it lands on
  // it at t = 1. It cannot do otherwise: with the centre at S·(1-t) and the half-extent at h0^(1-t),
  // the far edge is S·s + h0^s in s = 1-t, which is 1 at s = 0, less than 1 at s = 1, and convex.
  //
  // ON THE TWELVES. The dolly gets one new position per DRAWING and so does this: a smooth zoom
  // would be the only smooth thing in a stop-motion room. The visitor's wheel moves a TARGET; the
  // shown number closes 45 % of the gap on each stepped frame, so a flick drifts for four or five
  // drawings and settles. 45 % puts a flick within a twentieth of its mark in five drawings — under
  // half a second — which is a hand letting go of a wheel, not a tween.
  const ZOOM_CLOSE = 0.45; // of the gap to the target, per drawing
  const WHEEL_WRAP = 1200; // px of wheel for one whole wrap (the brief's number)
  // …and a trackpad PINCH arrives as ctrl+wheel in deltas an order of magnitude smaller than a
  // scroll's, so it gets its own gain. 300 px of pinch for a wrap is about one full spread of the
  // fingers on a Mac trackpad.
  const PINCH_WRAP = 300;
  const DRAG_WRAP = 700; // px of one-finger drag for a wrap: ~0.8 of a 844 px phone
  const DRAG_SLOP = 12; // px before a touch that started on nothing becomes a scroll
  let zoomTarget = 0, zoomShown = 0;
  let pendingZoom = null; // ?zoom=<t>, spent on the first update; see the foot of this file

  // ---- THE PAN --------------------------------------------------------------------------------
  // The room's SECOND modifier on the resting plate, and the first control this film has ever drawn.
  //
  // The user: "the phone should have a pan control, so the user can look around the room." A phone's
  // resting frame holds 2.00 m of a wall 5.20 m wide — the middle of the back wall and nothing else
  // — so the fireplace, the tall case, the door, both windows and the press are simply not in the
  // picture, and neither is anything a visitor might click on them (src/pieces/walk.js measures
  // exactly that: all three of its places are off a 390x844 frame).
  //
  // WHAT IT IS. A YAW ABOUT THE LENS'S OWN POSITION — the visitor turns their head; the camera does
  // not slide along the wall. The lens axis stays horizontal, so verticals stay vertical and the
  // lens rise is untouched: this room's whole grammar is that the frame is hung by a rise and never
  // by a tilt, and a yaw about a vertical axis leaves both of those alone. It is a modifier on the
  // resting plate exactly as the zoom is, which means it is the same three rules: it runs on the
  // TWELVES, it is REMEMBERED while the visitor stays at rest, and any cut, move or walk puts it
  // back to nought.
  //
  // HOW FAR, AND WHY NOT FURTHER. 20 degrees each way, which is measured against what is standing on
  // the two side walls rather than chosen. From the chair at (0, 1.62, 6.40):
  //   the FIREPLACE's breast (x −2.36, z −0.66 .. 0.56)      18.5° .. 22.0° left
  //   the TALL CASE (x −2.10 .. −1.06 at z −2.20)             6.9° .. 13.7° left
  //   the DOORWAY (x 1.05 .. 1.95 at z −2.50)                 6.7° .. 12.4° right
  //   the PALM on its stool (x 2.36, z −0.30)                19.4° right
  // A phone's frame is 12.7° across, so at a yaw of 20° the fireplace stands in the middle of it
  // with 2.9° of paper either side, and the palm and the side door do on the other. Past 20° the
  // frame comes off the furniture onto bare plaster and, at about 26°, onto the corner: the rule is
  // that a pan shows what is ON a side wall and then stops.
  // The control itself is drawn in src/pieces/camera-pan.js and mounted at the foot of this file;
  // the update loop and the resize handler both reach it, so the binding is made here.
  let CHEV = { update() {}, boxes: () => null, resize() {} };
  const PAN_MAX = (20 * Math.PI) / 180;
  const PAN_CLOSE = 0.42; // of the gap to the target per drawing: the zoom's own hand, a shade slower
  const PAN_WRAP = 620; // px of one-finger drag for the whole 20° — about 1.6 phone widths end to end
  const PAN_STEP = 0.5; // what one tap on a chevron is worth
  const PAN_WHEEL = 1400; // px of a horizontal wheel (a trackpad's two-finger swipe) for the whole range
  let panTarget = 0, panShown = 0;
  let pendingPan = null; // ?pan=<-1..1>, spent on the first update
  // IS THE WINDOW NARROWER THAN THE ROOM NEEDS. The one test, and it is the one the user's sentence
  // makes: does the resting frame hold the back wall from corner to corner. The frame's horizontal
  // half-width at the wall is t·aspect·d; the room's half-width is 2.60. Measured:
  //   1600x900  ±3.97 m · 1280x800 ±3.57 m   the room is in the picture — NO CHEVRONS, NO PAN
  //   1200x1100 ±2.43 m · 390x844 ±1.00 m    it is not — the pan is armed
  const ROOM_HALF = () => (ctx.layout?.room?.width ?? 5.2) / 2;
  function panNeeded() {
    const s = flatPlate(resting) ?? shots.home;
    if (!s) return false;
    const w = ctx.size?.w || window.innerWidth || 1600, h = ctx.size?.h || window.innerHeight || 900;
    const d = s.pos[2] - (-(ctx.layout?.room?.depth ?? 5) / 2); // the lens to the back wall
    return Math.tan(((s.fov ?? 30) * Math.PI) / 360) * (w / h) * d < ROOM_HALF();
  }
  // The resting plate, turned. `p` is −1 (looking hard left) to +1; the LOOK point is rotated about
  // the camera's own position, so nothing but the direction changes — not the station, not the lens,
  // not the rise.
  function panShot(p) {
    const s = flatPlate(resting) ?? shots.home;
    if (!s) return null;
    const th = -p * PAN_MAX;
    const dx = s.look[0] - s.pos[0], dz = s.look[2] - s.pos[2];
    const c = Math.cos(th), sn = Math.sin(th);
    return { ...s, look: [s.pos[0] + dx * c + dz * sn, s.look[1], s.pos[2] - dx * sn + dz * c] };
  }

  const drosteOf = () => ctx.pieces?.props?.droste ?? null;

  // ---- WHICH PLATE THE ROOM IS RESTING ON -----------------------------------------------------
  // The scroll is a modifier on the frame the evening is actually watched from, and that is NOT
  // `home` by name. entrance.js lands the visitor on `wide` (LANDS_ON — the user asked for the walk
  // to end where the evening is watched from), flow.js holds the first exchange there and settles
  // into `home` from his first reply, and a reading returns to `home`. A page opened by a tool sits
  // on `home` because that is what main.js cuts to. All three are the same thing to this file: the
  // plate the camera was last LEFT standing on.
  //
  // WHY THESE TWO AND NOT EVERY FLAT SHOT. Six of the shots in camera-shots.js are flat frontals on
  // the room's axis and the arithmetic below would solve any of them — `pepe`, `table`, `door` and
  // `threshold` included. The room does not REST on those. `pepe` is flow.js's own word for it,
  // "punctuation inside a turn": the camera cuts to his face for one sentence of a turn and back to
  // the frame the visitor answers in, a second and a half later. Adopting it as the plate would
  // re-draw the picture on the wall from his face and back again on every line he says — a picture
  // whose contents flicker with the cutting — and would arm the scroll for a second and a half at a
  // time. `table`, `door` and `threshold` are a judging frame and two frames of the arrival. So the
  // set is named here rather than derived, and the geometry is then CHECKED rather than assumed:
  // a plate this file will solve a zoom from has to look straight down -z from its own x and y,
  // with no lens roll and no sideways shift, or the end pose is not on the picture's normal.
  const RESTING = ['home', 'wide'];
  function flatPlate(name) {
    const s = typeof name === 'string' ? shots[name] : null;
    if (!s || !RESTING.includes(name)) return null;
    const up = s.up ?? [0, 1, 0];
    if (up[0] !== 0 || up[1] !== 1 || up[2] !== 0) return null;
    if (s.look[0] !== s.pos[0] || s.look[1] !== s.pos[1] || !(s.look[2] < s.pos[2])) return null;
    if ((s.shift?.[0] ?? 0) !== 0) return null;
    return s;
  }
  // …and it is remembered ACROSS the shots that are not plates, because the picture on the wall has
  // to be the frame the visitor will come back to. The camera going up on his face for a sentence
  // does not change what is hanging on the wall.
  let resting = 'home';
  const noteResting = () => {
    if (flatPlate(api.current)) resting = api.current;
  };

  // The picture as the resting plate sees it: D0 (camera to sheet), D1 (where it fills the window),
  // and the sheet's half-height on the glass there. Null while the frame has no size yet.
  function zoomSpan() {
    const d = drosteOf();
    const home = flatPlate(resting) ?? shots.home;
    if (!d || !home) return null;
    const gm = d.geometry;
    if (!(gm.halfH > 1e-6)) return null;
    const T0 = tanHalf(home.fov ?? 30);
    const D0 = home.pos[2] - gm.centre[2];
    const D1 = gm.halfH / T0;
    if (!(D0 > 0) || !(D1 > 0) || D1 >= D0) return null;
    return { gm, home, T0, D0, D1, h0: D1 / D0 };
  }

  // The pose at t, as a shot the rest of this file already knows how to apply.
  function zoomShot(t) {
    const s = zoomSpan();
    if (!s) return null;
    const { gm, home, T0, D0, D1 } = s;
    const A = aspect();
    const [px, py, pz] = gm.centre;
    const sx0 = home.shift?.[0] ?? 0, sy0 = home.shift?.[1] ?? 0;
    const D = D0 * Math.pow(D1 / D0, t);
    // where the sheet's centre sits on the glass at home, in NDC. The view offset enters u and v
    // with opposite signs: three.js moves the frustum's LEFT edge by +offsetX and its TOP edge by
    // -offsetY, which is why a rise (+y) lifts a point in v and a sideways shift lowers it in u.
    const u0 = (px - home.pos[0]) / (D0 * T0 * A) - 2 * sx0;
    const v0 = (py - home.pos[1]) / (D0 * T0) + 2 * sy0;
    const k = 1 - t;
    const sx = sx0 * k, sy = sy0 * k;
    return {
      pos: [px - (u0 * k + 2 * sx) * D * T0 * A, py - (v0 * k - 2 * sy) * D * T0, pz + D],
      look: [px - (u0 * k + 2 * sx) * D * T0 * A, py - (v0 * k - 2 * sy) * D * T0, pz],
      fov: home.fov ?? 30,
      shift: [sx, sy],
    };
  }

  // WHEN THE ROOM WILL TAKE A SCROLL AT ALL. It is the home plate's modifier, so: the camera has to
  // be on home, standing still, and nobody may be holding it. On top of that, four things in this
  // room own the camera or the pointer while they are out, and a wheel during any of them is a
  // wheel the visitor meant for that thing: the deck laid on the cloth, the crossroads outside the
  // door, the notice card, and a pick (the fan arms the pointer and the camera is on `fan` for it,
  // but the flag is asked anyway — it costs nothing and it is the honest test).
  // THE PRECONDITION BOTH MODIFIERS SHARE, hoisted out of zoomAllowed when the pan arrived: the
  // camera is standing still on the plate the evening is watched from, nobody is holding it, and
  // nothing in the room has the pointer. The list grew by one this round — a BOOK standing open
  // over the room (src/pieces/walk-book.js) owns the pointer exactly as the notice does.
  function modifiable() {
    if (held != null || move || api.current !== resting) return false;
    const P = ctx.pieces?.props;
    if (P?.deck?.out || P?.cross?.out) return false;
    if (ctx.pieces?.help?.showing) return false;
    if (ctx.pieces?.walk?.books?.showing) return false;
    // the fan's own flag, which lives on the piece that owns the pointer rather than on reveal's
    // front door (reveal-pick.js; camera-shots.js reads `_fan` the same way for the same reason)
    const F = ctx.pieces?.reveal?._fan;
    if (F?.armed || F?.picking) return false;
    return true;
  }
  // …AND THE TWO OF THEM ARE NEVER ON AT ONCE. The zoom is a walk INTO the picture on the back wall
  // and it is solved from the home plate's own normal; a yawed camera is not on that normal and the
  // arithmetic would be solving a picture the lens is looking at from the side. So a pan that is not
  // at nought disarms the scroll, and a wheel or a pinch arriving while the room is turned spends
  // itself easing the pan back to centre first (see THE WHEEL, below). At pan 0 every number, every
  // hand-over and every frame is what it was before this round.
  function zoomAllowed() {
    if (!modifiable()) return false;
    if (panShown !== 0 || panTarget !== 0) return false;
    return !!zoomSpan();
  }
  function panAllowed() {
    return modifiable() && panNeeded();
  }
  function applyPan() {
    // NOTHING IS APPLIED UNLESS THE CAMERA IS ACTUALLY STANDING ON THE PLATE THIS IS A MODIFIER ON.
    // `setPan(0, {hold: true})` from a tool is the case that needs it: without this guard it would
    // strike the home pose over whatever the camera was doing — a place, a plate, a walk — because
    // pan 0 IS the home pose.
    if (move || held != null || api.current !== resting) return;
    if (panShown === 0) {
      applyPose(poseOf(shots[resting] ?? shots.home));
      return;
    }
    const s = panShot(panShown);
    if (s) applyPose(poseOf(s));
  }
  function resetPan() {
    panTarget = 0;
    panShown = 0;
  }
  function holdPan(p) {
    panTarget = panShown = Math.max(-1, Math.min(1, p));
    applyPan();
  }

  const fract = (v) => v - Math.floor(v);
  function applyZoom() {
    const t = fract(zoomShown);
    // t = 0 is the resting plate itself and not an arithmetic approximation of it: the hand-over at
    // the top of a wrap is measured against that frame, so it has to be the same floats.
    if (t === 0) {
      applyPose(poseOf(shots[resting] ?? shots.home));
      return;
    }
    const s = zoomShot(t);
    if (s) applyPose(poseOf(s));
  }
  function resetZoom() {
    zoomTarget = 0;
    zoomShown = 0;
  }
  // …and the tools' way in: a held t, with no drift, on whatever the camera is doing now.
  function holdZoom(t) {
    zoomTarget = zoomShown = t;
    applyZoom();
  }

  // A new window shape is a new set of frames. Rebuild them, and put the camera back on the one it
  // is holding — unless it is mid-move, where the two poses it is blending were solved for the old
  // window and the move finishes in the shape it started in.
  ctx.on?.('resize', () => {
    reframe();
    if (!move && api.current && shots[api.current]) applyPose(poseOf(shots[api.current]));
    else {
      applyShift(shift[0], shift[1]);
      cam.updateProjectionMatrix();
    }
    // the sheet was re-cut for the new aspect a moment ago (props builds before this piece, so its
    // resize handler has already run); a held zoom is re-solved against the frame's new shape
    if (!move && api.current === resting && zoomShown !== 0) applyZoom();
    // …and a pan the same way — except that a window that has just become WIDE ENOUGH to hold the
    // room has no pan to re-apply and is put back square (panNeeded is the only thing that arms it)
    if (!move && api.current === resting && panShown !== 0) {
      if (panAllowed()) applyPan();
      else {
        resetPan();
        applyPose(poseOf(shots[resting] ?? shots.home));
      }
    }
    CHEV?.resize?.();
  });

  // ---- moves ----
  let move = null; // { from, to, kind, t0, f0, duration, done }
  let seq = 0; // token: a new cut/move/sequence cancels the running sequence
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion();
  const blend = (from, to, u) => {
    _p.lerpVectors(from.pos, to.pos, u);
    _q.slerpQuaternions(from.q, to.q, u);
    applyPose({ pos: _p, q: _q, fov: from.fov + (to.fov - from.fov) * u, shift: [from.shift[0] + (to.shift[0] - from.shift[0]) * u, from.shift[1] + (to.shift[1] - from.shift[1]) * u] });
  };
  // the motor: constant speed with a short ramp at each end (a dolly does not ease like a tween).
  // The two ramps are separate so a move that is ANSWERING something — the reframe as a card lands
  // in the reading row — can be off the mark at once and spend the whole of the rest braking, which
  // is what a camera operator's hand does when the cue is the action rather than the clock.
  const motor = (u, ramp, brake = ramp) => {
    if (ramp <= 0 && brake <= 0) return u;
    const v = 1 / (1 - (ramp + brake) / 2); // cruise speed so that the area is 1
    if (ramp > 0 && u < ramp) return (v * u * u) / (2 * ramp);
    if (brake > 0 && u > 1 - brake) return 1 - (v * (1 - u) * (1 - u)) / (2 * brake);
    return v * (u - ramp / 2);
  };
  const finish = () => {
    const m = move;
    move = null;
    m?.done?.();
  };

  // ---- THE DOLLY (round 3) ------------------------------------------------------------------
  // A walk from one shot to another, along a CURVE and not a chord, and ON THE TWELVES.
  //
  //   THE PATH is a Catmull-Rom through the two poses' positions and whatever waypoints it is
  //   given, sampled BY ARC LENGTH (`getPointAt`), so the speed is metres per second and not
  //   parameter per second — without that a waypoint near one end makes the camera bolt down the
  //   long leg and crawl the short one. A waypoint may be a shot's name, a solved pose, or a bare
  //   [x, y, z]: the caller is describing a route through the set, not a list of frames.
  //
  //   THE CLOCK IS THE PAPER'S. Everything hand-animated in this film moves on the twelve, and a
  //   camera walking through a doorway past a hand-drawn architrave has to be on the same grid as
  //   the architrave or it is the one smooth thing in the picture. So the move counts DRAWINGS IT
  //   HAS BEEN GIVEN — every tick where `clock.stepped` — rather than reading `clock.raw`. That is
  //   the same counter the eggs use (egg-cross.js says why at length) and it has the same second
  //   virtue: a frozen clock reports `stepped` on every tick, so a still being driven by a tool
  //   still walks, one drawing per rendered frame, instead of standing forever at u = 0.
  //
  //   THE EASE is camera.js's own motor with a ramp at each end: the dolly leaves, cruises and
  //   brakes, which is a hand on a wheel rather than a tween. `ease: [in, out]` overrides it.
  const CURVE_TENSION = 0.5;
  const pointOf = (v) => (Array.isArray(v) ? new THREE.Vector3().fromArray(v) : new THREE.Vector3().fromArray(resolve(v).pos));
  //   AND THE LENS CHANGES LAST. A camera operator walks with the lens they have and re-frame at the
  //   end; a focal length sliding all the way through a dolly is the one move this film does not
  //   make. So the fov (and the lens rise with it) is held at the shot we left and taken to the shot
  //   we are arriving at over the last stretch — `fovEase: [from, to]` as a fraction of the move.
  //   The egg over the door needs exactly this: the crossroads is framed wide enough to hold the
  //   whole picture, which on a phone is 66°, and 66° of PARLOUR halfway across the room would bow
  //   every line in it. Held to the last stride, the lens only opens once there is nothing in the
  //   frame but a flat sheet, where a wide lens shows nothing at all.
  function dolly(fromShot, toShot, seconds = 2, { via = [], ease = [0.25, 0.25], fovEase = [0.72, 1] } = {}) {
    finish();
    // A move away from home LEAVES FROM WHERE THE VISITOR SCROLLED TO — `currentPose()` is the live
    // camera and that is the zoomed one — and the number goes back to zero, so the way home is the
    // home plate. Zeroing it does not move anything: only applyZoom() does, and it is now blocked
    // by the move this call is about to start.
    resetZoom();
    resetPan(); // a walk leaves from where the visitor turned to, and the way back is the plate
    const from = fromShot == null ? currentPose() : poseOf(resolve(fromShot));
    const to = poseOf(resolve(toShot));
    api.current = typeof toShot === 'string' ? toShot : 'custom';
    noteResting();
    const ways = (Array.isArray(via) ? via : [via]).filter((v) => v != null).map(pointOf);
    const pts = [from.pos.clone(), ...ways, to.pos.clone()];
    // two identical ends (a move to where we already are) would make a zero-length curve, which
    // getPointAt cannot map: fall back to the straight blend, which is the same picture
    const curve = pts.length > 2 || pts[0].distanceTo(pts[1]) > 1e-4 ? new THREE.CatmullRomCurve3(pts, false, 'catmullrom', CURVE_TENSION) : null;
    const total = Math.max(1, Math.round(seconds * (ctx.clock?.fps || 12)));
    move = {
      from,
      to,
      kind: 'dolly',
      curve,
      k: 0,
      total,
      ease,
      fovEase,
      t0: ctx.clock.raw,
      f0: ctx.clock.frame,
      duration: seconds,
      fromName: typeof fromShot === 'string' ? fromShot : null,
      toName: typeof toShot === 'string' ? toShot : null,
    };
    // the first drawing of the move IS the pose it starts from, struck again: nothing jumps
    stepDolly(move);
    return new Promise((res) => (move.done = res));
  }
  const _dp = new THREE.Vector3();
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
    return t * t * (3 - 2 * t);
  };
  function stepDolly(m) {
    const raw = Math.min(1, m.k / m.total);
    const u = motor(raw, m.ease[0], m.ease[1]);
    const lens = smooth(m.fovEase[0], m.fovEase[1], raw);
    if (m.curve) {
      m.curve.getPointAt(Math.min(1, Math.max(0, u)), _dp);
      _q.slerpQuaternions(m.from.q, m.to.q, u);
      applyPose({
        pos: _dp,
        q: _q,
        fov: m.from.fov + (m.to.fov - m.from.fov) * lens,
        shift: [m.from.shift[0] + (m.to.shift[0] - m.from.shift[0]) * lens, m.from.shift[1] + (m.to.shift[1] - m.from.shift[1]) * lens],
      });
    } else blend(m.from, m.to, u);
    return u;
  }

  // internal: no token bookkeeping (sequences and loops own their token)
  function jump(shot) {
    finish();
    resetZoom(); // a cut is a cut: the room is at t = 0 wherever it lands, the resting plate included
    resetPan(); // …and square to the wall again, whatever the visitor had turned to look at
    api.current = typeof shot === 'string' ? shot : 'custom';
    noteResting();
    applyPose(poseOf(resolve(shot)));
  }
  function startMove(shot, kind, duration) {
    finish();
    resetZoom(); // …and the rail leaves from the zoomed pose; see dolly() above
    resetPan();
    const to = poseOf(resolve(shot));
    api.current = typeof shot === 'string' ? shot : 'custom';
    noteResting();
    if (kind === 'cut') {
      applyPose(to);
      return Promise.resolve();
    }
    const from = currentPose();
    const dist = from.pos.distanceTo(to.pos);
    if (duration == null) duration = kind === 'whip' ? WHIP_FRAMES.length / ctx.clock.fps : kind === 'open' ? OPEN_S : Math.max(0.4, dist / (kind === 'track' ? TRACK_SPEED : PUSH_SPEED));
    move = { from, to, kind, t0: ctx.clock.raw, f0: ctx.clock.frame, duration };
    return new Promise((res) => (move.done = res));
  }

  // ---- A HELD SHOT (round 2) ------------------------------------------------------------------
  // The one thing in this film that is not in the room: the cross over the door lets the weather
  // in, the leaf swings, and the room CUTS THROUGH THE DOOR and stands outside it looking at a
  // crossroads (src/pieces/egg-cross.js). For as long as it is out there, that frame IS the film —
  // and the conversation's own loop re-asserts its frame at the top of every turn (flow.js: `if
  // (C?.current !== frame) cut(frame)`), which would pull the camera back into the parlour a second
  // after the cut, for one drawing, until the egg cut out again. One drawing of the wrong room is a
  // flash-frame, and no amount of re-cutting from the other side fixes it.
  //
  // So the camera can be told to HOLD. While a hold is on, cut/move/sequence to anything else are
  // ignored — not queued, ignored — and the piece that took the hold is the piece that gives it
  // back. A judging state clears it, because a judge outranks the evening. Nothing else in the film
  // uses this, and nothing else should: it is for the one shot that is not a shot of the room.
  let held = null;
  const blocked = (shot) => held != null && shot !== held;

  const api = {
    shots,
    current: 'home',
    get holding() {
      return held;
    },
    // ---- the scroll, for the tools and for anything that wants to know ------------------------
    // `zoom` is the number the picture is actually AT (the shown one): a tool that measures a frame
    // measures this. `zoomTarget` is where the visitor's last flick pointed it. They differ for the
    // four or five drawings a flick takes to settle and are equal at rest.
    get zoom() {
      return zoomShown;
    },
    get zoomTarget() {
      return zoomTarget;
    },
    // the fractional part: the pose, in [0, 1)
    get zoomPhase() {
      return fract(zoomShown);
    },
    get zoomable() {
      return zoomAllowed();
    },
    // ---- THE PAN, for the tools and for anything that wants to know ---------------------------
    // `pan` is where the room is actually TURNED TO, −1 (hard left) to +1; `panTarget` is where the
    // visitor's last drag or tap pointed it. They differ for the four or five drawings a flick takes
    // to settle and are equal at rest. `panable` is whether the window is narrow enough to need one
    // at all — which is the only thing that puts the chevrons in the picture.
    get pan() {
      return panShown;
    },
    get panTarget() {
      return panTarget;
    },
    get panable() {
      return panAllowed();
    },
    get panNeeded() {
      return panNeeded();
    },
    get panDegrees() {
      return +(((-panShown * PAN_MAX * 180) / Math.PI).toFixed(2));
    },
    get panMax() {
      return +((PAN_MAX * 180) / Math.PI).toFixed(2);
    },
    // the chevrons' own boxes on the glass, or null when the window is wide enough not to have them
    get panBoxes() {
      return CHEV.boxes();
    },
    // set the TARGET; the shown number walks to it on the twelves. `{hold: true}` puts both there at
    // once, which is what ?pan= and the judging states want — a still does not drift.
    setPan(p, { hold = false } = {}) {
      if (!Number.isFinite(p)) return false;
      const q = Math.max(-1, Math.min(1, p));
      if (hold) {
        holdPan(q);
        return true;
      }
      panTarget = q;
      return true;
    },
    // the pose at any p, solved but not applied
    panShotAt: (p) => panShot(Math.max(-1, Math.min(1, p))),
    // set the TARGET; the shown number walks to it on the twelves. `{ hold: true }` puts both there
    // at once, which is what ?zoom= and the judging states want — a still does not drift.
    setZoom(t, { hold = false } = {}) {
      if (!Number.isFinite(t)) return false;
      if (hold) {
        holdZoom(t);
        return true;
      }
      zoomTarget = t;
      return true;
    },
    // what the walk is solved from, for a proof that wants to check the arithmetic without a page:
    // the two distances and the sheet's half-height on the glass at home.
    get zoomSpan() {
      const s = zoomSpan();
      return s ? { D0: s.D0, D1: s.D1, h0: s.h0, fov: s.home.fov, halfW: s.gm.halfW, halfH: s.gm.halfH, centre: [...s.gm.centre] } : null;
    },
    // the pose at any t, solved but not applied — the continuity table is taken off this
    zoomShotAt: (t) => zoomShot(fract(t)),
    // IS THE LIVE CAMERA STANDING ON THE RESTING PLATE, TO THE FLOAT? ink.js asks once a frame, and
    // a great deal hangs on the answer: when it is yes the frame about to be drawn IS the picture on
    // the back wall, so there is one scene pass and not two. Nothing is approximated here — the
    // pose the camera is holding was copied out of poseOf(shots[resting]) and is compared to it.
    get atRest() {
      if (move || api.current !== resting || fract(zoomShown) !== 0 || panShown !== 0) return false;
      const s = shots[resting];
      if (!s) return false;
      const p = poseOf(s);
      return cam.position.equals(p.pos) && cam.quaternion.equals(p.q) && cam.fov === p.fov && shift[0] === p.shift[0] && shift[1] === p.shift[1];
    },
    // the name of the plate the picture on the wall is drawn from, and the one a scroll walks into
    get restingShot() {
      return resting;
    },
    // the plates this file will solve a zoom from at all, for a tool that wants to assert the set
    get restingShots() {
      return [...RESTING];
    },
    // PUT ANOTHER CAMERA ON A NAMED SHOT, solved for this window. ink.js draws the picture on the
    // wall through one of these while the real camera is somewhere else entirely; it gets the same
    // pose, the same lens, the same rise and the same clipping planes, so what the sheet shows is
    // the home plate and not an approximation of it.
    // `aspect` widens (or narrows) the other camera WITHOUT touching the vertical field or the lens
    // rise. That is the whole of the phone's picture: three.js's fov is the VERTICAL one and a view
    // offset enters the vertical as +2·shift whatever the aspect is, so a plate drawn at 1.6 from a
    // 0.46 pose is the phone's own frame with more room either side of it — and the phone's frame
    // is exactly the centre crop of it, to the pixel, at the same vertical resolution.
    place(shot, other, aspect = null) {
      const p = poseOf(resolve(shot));
      other.position.copy(p.pos);
      other.quaternion.copy(p.q);
      other.up.set(0, 1, 0).applyQuaternion(p.q);
      other.fov = p.fov;
      other.near = cam.near;
      other.far = cam.far;
      const h = ctx.size?.h || window.innerHeight || 900;
      const A = aspect && aspect > 0 ? aspect : (ctx.size?.w || window.innerWidth || 1600) / h;
      const w = A * h;
      other.aspect = A;
      if (!p.shift[0] && !p.shift[1]) {
        if (other.view?.enabled) other.clearViewOffset();
      } else other.setViewOffset(w, h, p.shift[0] * w, p.shift[1] * h, w, h);
      other.updateProjectionMatrix();
      other.updateMatrixWorld();
      return other;
    },
    // `jump: false` takes the hold WITHOUT moving the camera — which is what a piece that is about
    // to WALK to the held shot needs. The hold has to be on before the first drawing of the move,
    // or the conversation's own `cut(frame)` at the top of the next turn would take the camera back
    // into the parlour halfway across the room; and the hold has to be MOVED to the shot being
    // walked back to, or the way home would be blocked by the very hold that is protecting it.
    hold(shot, { jump: doJump = true } = {}) {
      held = shot;
      seq++;
      if (doJump) jump(shot);
    },
    release(shot = null) {
      if (held == null || (shot != null && shot !== held)) return false;
      held = null;
      return true;
    },
    cut(shot) {
      if (blocked(shot)) return;
      seq++;
      jump(shot);
    },
    // TWO CALLS, ONE NAME, and which one is meant is read off the second argument.
    //   move(shot, {kind, duration})            the RAIL: 'cut' | 'push' (straight dolly down the
    //                                           axis) | 'track' (lateral) | 'whip' (3 frames, hard
    //                                           stop). Runs on clock.raw; the camera is not a puppet.
    //   move(from, to, seconds, {via, ease})    the DOLLY (round 3): a walk along a curve through
    //                                           `via`, stepped on the twelve. `from` may be null,
    //                                           which means "off whatever pose the camera is
    //                                           holding" — the way back from an excursion that was
    //                                           interrupted halfway out.
    // A second argument that is a name, a point or a solved pose means the dolly; an options bag
    // (or nothing) means the rail.
    move(a, b, seconds, opts) {
      const asDolly = typeof b === 'string' || Array.isArray(b) || (b && (Array.isArray(b.pos) || typeof b.fov === 'number'));
      if (asDolly) {
        if (blocked(b)) return Promise.resolve();
        seq++;
        return dolly(a, b, seconds, opts ?? {});
      }
      const { kind = 'push', duration = null } = b ?? {};
      if (blocked(a)) return Promise.resolve();
      seq++;
      return startMove(a, kind, duration);
    },
    // what a move is doing, for a tool that has to know whether the picture has arrived
    get moving() {
      if (!move) return null;
      const u = move.kind === 'dolly' ? Math.min(1, move.k / move.total) : null;
      return { kind: move.kind, from: move.fromName ?? null, to: move.toName ?? (typeof api.current === 'string' ? api.current : null), u, drawing: move.k ?? null, drawings: move.total ?? null };
    },
    // steps: [{shot, kind = 'cut', duration, hold = 0}] — plays in order; resolves true when the last hold ends,
    // false if another cut/move/sequence took the camera first
    async sequence(steps) {
      if (held != null) return false;
      const token = ++seq;
      for (const { shot, kind = 'cut', duration, hold = 0 } of steps) {
        if (token !== seq) return false;
        if (kind === 'cut') jump(shot);
        else await startMove(shot, kind, duration);
        if (hold > 0 && token === seq) await wait(ctx, hold);
      }
      return token === seq;
    },
    stop() {
      seq++;
      finish();
    },
    // judging states: the six stills, plus the two moves running from t=0. A judge outranks the
    // evening: whatever the room was holding, it gives it up for a named state.
    setState(name) {
      held = null;
      if (name === 'track') {
        // a lateral track across the back wall, shelf to door; loops so a contact sheet always
        // catches it moving. (The far end was the window, then the cart, and both have been taken
        // out of the room; `shelf` is the same plate under the name of what is standing in it now —
        // see camera-shots.js.)
        const token = ++seq;
        (async () => {
          while (token === seq) {
            jump('shelf');
            await startMove('door', 'track');
            if (token === seq) await wait(ctx, 1.2);
          }
        })();
      } else if (name === 'whip') {
        // a whip from Pepe to the spread and back: hold, three frames, hold
        const token = ++seq;
        jump('pepe');
        (async () => {
          while (token === seq) {
            await wait(ctx, 1.8);
            if (token !== seq) return;
            await startMove('spread', 'whip');
            await wait(ctx, 1.8);
            if (token !== seq) return;
            await startMove('pepe', 'whip');
          }
        })();
      } else if (name === 'zoom-half' || name === 'zoom-deep') {
      // the walk into the picture, held: half way, and one drawing short of the wrap. Both are cut
      // to home first, so the number is applied to the plate it is a modifier on.
      api.cut('home');
      holdZoom(name === 'zoom-deep' ? 0.95 : 0.5);
    } else if (name === 'pan-left' || name === 'pan-right') {
      // the room turned as far as it goes, held, on the plate the pan is a modifier on. It is CUT to
      // home first so the number is applied to the plate it belongs to, exactly as the zoom's states
      // are. A window wide enough to hold the room has no pan and the state is then simply `home`,
      // which is the honest still for it.
      api.cut('home');
      if (panNeeded()) holdPan(name === 'pan-left' ? -1 : 1);
    } else api.cut(name in shots ? name : 'home');
    },
    update(ctx) {
      // THE BEAT MOVES THE PLATE. A card landing in the reading row is what earns that slot its
      // place in the fan's frame, so the camera watches the cloth for it rather than being told:
      // nothing else has to know, and a visitor who picks by clicking, by typing "the third from
      // the left", or by letting Pepe choose gets the same move. It is a MOVE and not a re-solve
      // in place — the landing is the motivation and the opening is the answer — and it happens
      // only where the plate really differs, which is why a phone never sees one (there the frame
      // is bound by the spread's width and the row costs it nothing).
      const n = laidCount();
      if (n !== laid) {
        const onFan = api.current === 'fan';
        reframe();
        if (onFan && held == null) {
          // …and only where there is something to see. The three slots share one band of cloth, so
          // the first card pays for the whole of the row: at 1600x900 the lens goes 15.4° → 20.3°
          // as it lands and the second and third cost 0.03° and a millimetre between them. A move
          // that small is not a move, it is a shiver, so the camera simply re-solves and holds.
          const to = poseOf(shots.fan), from = move ? move.to : currentPose();
          if (from.pos.distanceTo(to.pos) > 0.004 || Math.abs(from.fov - to.fov) > 0.08) startMove('fan', 'open', OPEN_S);
        }
      }
      // THE PAN, one new position per DRAWING, and it is stepped BEFORE the scroll because a pan
      // that is not at nought disarms the scroll — the walk back to centre has to be able to reach
      // nought on a drawing where the scroll is still refusing to run.
      if (panAllowed()) {
        if (pendingPan != null) {
          holdPan(pendingPan);
          pendingPan = null;
        }
        if (panShown !== panTarget && ctx.clock.stepped) {
          const gap = panTarget - panShown;
          panShown = Math.abs(gap) < 1e-4 ? panTarget : panShown + gap * PAN_CLOSE;
          applyPan();
        }
      } else if (panShown !== 0 || panTarget !== 0) {
        // the room was turned and something took the camera (a walk, a book, a reading): it comes
        // back square, the same rule the zoom keeps
        resetPan();
        if (api.current === resting && !move && held == null) applyPose(poseOf(shots[resting] ?? shots.home));
      } else if (pendingPan != null && !panNeeded()) pendingPan = null;
      CHEV.update({
        show: panAllowed(),
        left: panTarget > -1 + 1e-3,
        right: panTarget < 1 - 1e-3,
        parity: ctx.clock.frame % 2,
      });
      // THE SCROLL, one new position per DRAWING. Nothing here runs on a tick the paper did not
      // turn over, and nothing runs at all unless the camera is standing on the home plate with
      // nobody else holding it — a wheel during a pick, a deck, a crossroads or the notice is a
      // wheel that was meant for one of those, and it has already been refused at the listener.
      if (zoomAllowed()) {
        if (pendingZoom != null) {
          holdZoom(pendingZoom);
          pendingZoom = null;
        }
        if (zoomShown !== zoomTarget && ctx.clock.stepped) {
          const gap = zoomTarget - zoomShown;
          zoomShown = Math.abs(gap) < 1e-4 ? zoomTarget : zoomShown + gap * ZOOM_CLOSE;
          applyZoom();
        }
      } else if (zoomShown !== 0 || zoomTarget !== 0) {
        // the camera went somewhere (or something took it) by a road that did not come through
        // jump/startMove/dolly — the entrance's hand-rolled arrival is one. Same rule: the room is
        // at t = 0 when it comes back.
        resetZoom();
      }
      if (!move) return;
      const m = move;
      let u;
      if (m.kind === 'dolly') {
        // ON THE TWELVES: one new position per DRAWING, and the drawings are the ones this piece
        // has actually been given. Nothing happens on a tick the paper did not turn over.
        if (!ctx.clock.stepped) return;
        m.k++;
        const done = stepDolly(m) >= 1 || m.k >= m.total;
        if (done) finish();
        return;
      }
      if (m.kind === 'whip') {
        // on the animation clock: one big step per frame, then it is simply there
        const k = ctx.clock.frame - m.f0;
        if (k <= 0) return;
        u = WHIP_FRAMES[Math.min(k, WHIP_FRAMES.length) - 1];
      } else {
        const raw = Math.min(1, (ctx.clock.raw - m.t0) / m.duration);
        u = m.kind === 'track' ? motor(raw, 0.06) : m.kind === 'open' ? motor(raw, 0.08, 0.62) : motor(raw, 0.22);
      }
      blend(m.from, m.to, u);
      if (u >= 1) finish();
    },
  };
  applyPose(poseOf(shots.home));

  // ---- WHAT THE VISITOR SCROLLS WITH ----------------------------------------------------------
  // Three ways in, and none of them announces itself. There is no cursor on the picture, no tag, no
  // hint: the scroll IS the discovery, and a visitor who never touches the wheel never learns that
  // the room has a picture of itself in it.
  //
  // Every one of them moves the TARGET and nothing else. The pose is stepped in update(), on the
  // twelves, so a flick of the wheel is four or five drawings of drift and then a stop — the same
  // arithmetic whether the flick came from a mouse, a trackpad or a thumb.
  const glass = ctx.renderer?.domElement ?? null;

  // THE WHEEL. deltaMode 1 is lines and 2 is pages; both are normalised to px so a Firefox line
  // scroll and a Chrome pixel scroll cover the same ground. DOWN zooms IN, which is the direction
  // the whole gesture reads in: the page you are looking at goes away from you and the picture in
  // it comes towards you.
  const wheelPx = (ev) => ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? (ctx.size?.h || 800) : 1);
  glass?.addEventListener(
    'wheel',
    (ev) => {
      // A TRACKPAD PINCH arrives here as ctrl+wheel, and the browser would answer it by zooming the
      // PAGE — the canvas and the placard and all — which is never what the visitor meant on a
      // full-window scene. It is refused whether or not the room will take the scroll.
      if (ev.ctrlKey) ev.preventDefault();
      // A TRACKPAD'S TWO-FINGER SWIPE SIDEWAYS IS A PAN. It arrives as deltaX and it is the same
      // gesture a thumb makes on the glass, so it drives the same number; a mouse with no
      // horizontal wheel simply never sends one.
      if (!ev.ctrlKey && panAllowed() && Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
        ev.preventDefault();
        panTarget = Math.max(-1, Math.min(1, panTarget - (ev.deltaX * (ev.deltaMode === 1 ? 16 : 1)) / PAN_WHEEL));
        return;
      }
      // …AND A WHEEL OR A PINCH ARRIVING WHILE THE ROOM IS TURNED SPENDS ITSELF SQUARING IT UP. The
      // scroll is a walk into the picture on the back wall and it is solved from that wall's own
      // normal; it cannot be asked for from an angle. So the first flick brings the room back to
      // centre and the second one is the scroll, which is also what the hand means by it.
      if ((panShown !== 0 || panTarget !== 0) && panAllowed()) {
        ev.preventDefault();
        panTarget = 0;
        return;
      }
      if (!zoomAllowed()) return;
      ev.preventDefault();
      // …and the pinch's sign is the other way round from the wheel's: spreading the fingers gives
      // a NEGATIVE deltaY and means bigger, which is the direction every other pinch on the machine
      // goes. Its deltas are an order of magnitude smaller, hence its own gain.
      zoomTarget += ev.ctrlKey ? -wheelPx(ev) / PINCH_WRAP : wheelPx(ev) / WHEEL_WRAP;
    },
    { passive: false }
  );

  // THE THUMB. Two fingers pinch; one finger drags. `touch-action: none` on the canvas (index.html)
  // is what stops the browser taking the gesture first.
  //
  // A PINCH IS A RATIO, not a distance: doubling the spread of the fingers doubles the picture on
  // the glass, wherever the zoom already was. The picture's height on the glass goes as h0^(1-t),
  // so a factor of `r` in size is ln(r) / ln(1/h0) of a wrap — 0.235 of one at 1280x800, where the
  // sheet is a nineteenth of the window's height at home.
  //
  // A ONE-FINGER DRAG only ever becomes a scroll if it began on NOTHING: not on a switch (the
  // arbiter is asked, so a thumb that landed on the cat is the cat's), not on a DOM layer (the
  // placard, the notice, the titles — the test is that the touch started on the canvas itself), and
  // not while the fan is armed for a pick. Then it has to travel 12 px before it counts, and the
  // 12 px are subtracted when it does, so nothing jumps at the moment it takes over. Under that it
  // is a tap and the tap belongs to whatever is under it.
  let pinch = null, drag = null, pinched = false;
  const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onNothing = (touch) => {
    if (!glass || touch.target !== glass) return false;
    if (ctx.pieces?.reveal?._fan?.armed) return false;
    return !ctx.pieces?.props?.switches?.at?.(touch.clientX, touch.clientY);
  };
  glass?.addEventListener(
    'touchstart',
    (ev) => {
      const t = ev.touches;
      if (t.length >= 2 && zoomAllowed()) {
        const s = zoomSpan();
        pinch = s ? { d0: Math.max(1, touchDist(t)), z0: zoomTarget, span: Math.log(1 / s.h0) } : null;
        pinched = !!pinch;
        drag = null;
      } else if (t.length === 1 && !pinched && (zoomAllowed() || panAllowed()) && onNothing(t[0])) {
        // UNCOMMITTED until it has travelled: which axis crosses the slop first owns the gesture.
        drag = { x0: t[0].clientX, y0: t[0].clientY, z0: zoomTarget, p0: panTarget, live: false, axis: null };
      }
    },
    { passive: true }
  );
  glass?.addEventListener(
    'touchmove',
    (ev) => {
      const t = ev.touches;
      if (pinch && t.length >= 2) {
        if (!zoomAllowed()) return;
        zoomTarget = pinch.z0 + Math.log(Math.max(1, touchDist(t)) / pinch.d0) / pinch.span;
        return;
      }
      if (!drag || t.length !== 1) return;
      const dy = drag.y0 - t[0].clientY; // up is positive: up = scroll down = in
      const dx = t[0].clientX - drag.x0; // right is positive: the hand drags the room to the right
      // WHICH GESTURE IT IS, decided once and never revisited. The vertical drag was the scroll
      // before this round and it still is; the horizontal one is the pan. The first of the two to
      // travel DRAG_SLOP (12 px) takes the whole of the rest of the drag, so a thumb that wanders
      // does not hand the room back and forth between two modifiers.
      if (!drag.live) {
        const ay = Math.abs(dy), ax = Math.abs(dx);
        if (ay < DRAG_SLOP && ax < DRAG_SLOP) return;
        drag.axis = ax > ay ? 'x' : 'y';
        drag.live = true;
        // THE SLOP IS SPENT, NOT BANKED, and it is taken off the START of the drag rather than off
        // where the finger has got to. Rebasing to the finger's current position throws away every
        // pixel it travelled before this handler ran, which on a touch that arrives as one big move
        // is the whole gesture: it went live and reported the 12 px of slop as the whole of it.
        if (drag.axis === 'y') drag.y0 -= Math.sign(dy) * DRAG_SLOP;
        else drag.x0 += Math.sign(dx) * DRAG_SLOP;
      }
      if (drag.axis === 'x') {
        if (!panAllowed()) {
          drag = null;
          return;
        }
        panTarget = Math.max(-1, Math.min(1, drag.p0 - (t[0].clientX - drag.x0) / PAN_WRAP));
        return;
      }
      if (!zoomAllowed()) {
        // the room is turned: the first vertical drag squares it up, as a wheel does
        if (panAllowed() && (panShown !== 0 || panTarget !== 0)) panTarget = 0;
        drag = null;
        return;
      }
      zoomTarget = drag.z0 + (drag.y0 - t[0].clientY) / DRAG_WRAP;
    },
    { passive: true }
  );
  const endTouch = (ev) => {
    if (ev.touches.length < 2) pinch = null;
    if (ev.touches.length === 0) {
      drag = null;
      pinched = false;
    }
  };
  glass?.addEventListener('touchend', endTouch, { passive: true });
  glass?.addEventListener('touchcancel', endTouch, { passive: true });

  // ?zoom=<t> holds the walk at t with no drift, for a still. It is NOT applied here: main.js cuts
  // the camera to a shot after every piece is built (the judged view's, or home in ?shot=1 mode),
  // and a cut is a cut — it would take the number straight back to zero. So it is parked and spent
  // on the first update, which is the first tick after that cut.
  const askedZoom = ctx.params?.get?.('zoom');
  pendingZoom = askedZoom != null && askedZoom !== '' && Number.isFinite(+askedZoom) ? +askedZoom : null;
  // ?pan=<-1..1> holds the room turned that far, with no drift, for a still. Parked and spent on the
  // first update for the reason ?zoom= is: main.js cuts the camera after every piece is built.
  const askedPan = ctx.params?.get?.('pan');
  pendingPan = askedPan != null && askedPan !== '' && Number.isFinite(+askedPan) ? +askedPan : null;

  // ---- AND THE ONE CONTROL THIS FILM DRAWS ------------------------------------------------------
  // A tap on a chevron is worth half the range, so two taps take the room from square to hard over
  // and the walk between them is the same eased one a drag gets. It moves the TARGET and nothing
  // else; the pose is stepped in update(), on the twelves.
  CHEV = mountChevrons(ctx, (dir) => {
    if (!panAllowed()) return;
    panTarget = Math.max(-1, Math.min(1, panTarget + dir * PAN_STEP));
  });

  return api;
}

const wait = (ctx, seconds) =>
  new Promise((res) => {
    const end = ctx.clock.raw + seconds;
    const tick = () => (ctx.clock.raw >= end ? res() : requestAnimationFrame(tick));
    tick();
  });
