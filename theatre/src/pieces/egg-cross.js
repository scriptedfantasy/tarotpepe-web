// AN EGG, inside props: THE CROSS ON THE FRIEZE, AND WHAT IS UNDER THE FLOOR.
//
// ROUND 5 — THE CROSS TURNS ITSELF OVER AND THE FLOOR OPENS, and everything the first four rounds
// built for its click is gone. The user: "I'm not really happy with the animation of the door. When
// we click the cross over the door, going outside and choosing this meme, I don't think that's
// really fun. What would be more interesting: if you hit the cross, it falls down at the top, turns
// around, and switches into a Satanist's cross, and a floorboard opens and you see this kind of red
// stairway down into a basement."
//
// So a click on the cross now does two things and neither of them is weather. THE TOP FIXING LETS
// GO: the cross drops at the head, swings a half turn about the pin through its foot, and hangs
// INVERTED on the frieze — the same cross, upside down, the arm a third of the way UP it instead of
// a third of the way down. A BEAT LATER THE FLOOR OPENS: three boards in front of the visitor come
// up on a hinge and there is a stair going down into a red light (src/pieces/egg-cellar.js, which
// owns the hatch, the well, the flight, the one red and the hole in the floor's own mesh). He says
// what is down there. A second click on either the cross or the hatch puts it all back.
//
// WHAT WAS RETIRED WITH THE STORM, and it is most of what this file used to be: the four strikes of
// lightning and their flash state, the thunder (egg-cross-sound.js, deleted), the rain the cross
// used to turn on, the shade and a half the room went down by (`cross-storm` and `cross-flash`, both
// injected into lighting.js's table and both gone), the bank of cloud on the plate and the drawing
// of it lifting, the standing storm and its strike every thirty to ninety seconds, the sixty-second
// offer, and `Choose your path, anon.` The three judging states that held them — `cross-storm`,
// `cross-out`, `cross-dark` — are retired with them, and `cross-open` is what there is instead.
//
// WHAT DID NOT GO, AND THIS IS THE WHOLE REASON THE DOOR IS STILL HERE. The visitor can walk to the
// doorway and open the door by hand in the afternoon (walk.js hangs `openByDay` and `shutByDay` on
// this piece), the room still walks out through it to the crossroads, and the two castles are still
// the two roads. That route is untouched: the plate, the swing, the walk, `choose`, `path`, and the
// sentence `path` puts into the note the server writes him. What changed is only what the CROSS
// does when it is clicked.
//
// ------------------------------------------------------------------------------------------------
// THE CROSS'S TWO FIXINGS, which is a drawing decision and a physical one at the same time. A small
// wooden cross over a door hangs on a nail through a hole in its head; anything that has been there
// forty years also has a pin through its foot, because a nail on its own turns every time the door
// bangs. Both marks are on the cross's own sheet (egg-cross-draw.js, drawCross) and not on the
// plaster, because what is in the WALL is a hole, and a hole three pixels across on plaster at this
// distance is nothing. The head lets go, the foot pin does not, and the pin is at 0.09 of the
// cross's height up from its foot — so the inverted cross hangs 189 mm lower than it stood, which is
// where a cross that has come off its nail goes.
//
// AND IT TIPS FORWARD RATHER THAN SWINGING ROUND, which is the user's own correction to the first cut
// of this and the one thing about it that was simply wrong. Turned about the axis NORMAL to the
// plaster, a cross pivoting on its foot sweeps round in the plane of the wall like a clock hand: up
// over the frieze, onto the cornice, and down the far side — which is what he was shown and what he
// said "no bueno" to. Gravity is not in the plane of a wall. The axis is the HORIZONTAL LINE ALONG
// THE WALL through the foot nail; the head comes OUT into the room and down, through 90 degrees where
// the cross stands straight out of the plaster, and on to 180, flat against the frieze again and
// hanging under its own pin. IT NEVER RISES.
//
// AND IT FITS, which is arithmetic and not hope. The pin is at 2.7107 and the sheet hangs 94.3 mm
// each side of it, so inverted the cross occupies 2.5014 to 2.7314. Under it, the back-wall door's
// architrave cap tops out at 2.261 — room.js's own joinery, the same as the side doors' — which
// leaves 240 mm of bare plaster between the foot of the upside-down cross and the head of the door.
// Nothing had to be moved and nothing shrunk. It does cross the picture rail's bead at 2.60 to
// 2.625, and that is not a fault either: the bead stands 18 mm proud and the cross hangs at 22, so it
// passes in front of it with 4 mm in hand, which is what a thing hanging on a wall does to a
// moulding.
//
// THE FALL IS THIRTEEN DRAWINGS — NINE OF TURN AND FOUR OF SETTLE — AND ITS SHAPE IS THE PHYSICS'S. A rod pinned at one end and let go
// from the upright obeys theta'' = 3g sin(theta) / 2L, and integrated at L = 0.209 m it is over in
// 0.54 s — but it spends four of those six drawings between 5 and 18 degrees and then covers 140 in
// two, which is a half turn nobody can read. So the CURVE is the physics's and the SPACING is not:
// slow off the nail, thirty degrees a drawing through the middle, and then the pendulum it has
// become — 193, 174, 182, 180, a thirteen-degree overshoot damped by 0.45 a swing, which is a lath
// on a painted-over pin. A cue for the fixing (`nail`), and one for the wood rapping the plaster as
// it arrives (`rap`), with a fifth of one as it settles: walk-book.js's own arrangement for a leaf.
//
// AND RIGHTING IT IS NOT THAT LIST READ BACKWARDS, which is this file's own lesson twice over (the
// door's CLOSE, and the book's). Backwards, the first drawing of the righting is the overshoot — a
// cross swinging further DOWN on its way back up. Nothing in this room is falling upward: it is
// being put back, so it goes fast at the bottom where gravity is helping and slow at the top where
// it is not, and it arrives on its nail with no bounce at all.
//
// THE ROOM'S OWN BEAT. No storm, no lamp, and no state pushed into lighting.js: the pendant over the
// table swings, 2.4 degrees damped out over six seconds, on the drawing the fixing gives. Something
// heavy came off the wall and the room felt it, and that is the whole of what the light does.
//
// ------------------------------------------------------------------------------------------------
// WHY THE DOOR IS A DRAWING AND NOT THE DOOR. room.js builds the back-wall door as real joinery and
// then room-build.js merges every part of the set into one mesh per material. The leaf is inside
// the same buffer as the skirting; there is no object to turn, and giving it one means rebuilding
// the wall in a file another builder is standing in. So the swing is a SHEET — the same leaf,
// drawn (egg-cross-draw.js), standing a hand's width in front of the merged one — and the merged
// leaf is hidden behind a sheet of bare paper, which stands in the same slot.
//
// AND WHY THAT SLOT IS WHERE IT IS, WHICH IS A MEASUREMENT AND NOT A GUESS. The knob stands 90 mm
// off the face of the merged leaf and the key another 5 mm past that, so a sheet laid on the leaf's
// own face would have a doorknob floating in the middle of it. It therefore stands 135 mm in front,
// INSIDE the room — and a sheet 135 mm proud of a doorway 5 m from the lens projects 2% large and
// 21 mm to the side, which is 7 px of drawing printed on the architrave. So it is not cut to the
// opening: its four corners are put ON THE RAYS from the home plate's own eye through the four
// corners of the opening, at the sheet's own depth. It then registers with the doorway to the pixel
// from `home`, and — because every full-room shot in this film is between 5 and 6.3 m from that
// wall — to better than a pixel from `wide` and from `door` as well.
//
// WHAT STANDS IN THE OPENING WHILE THE LEAF IS OFF THE JAMB. The merged door is still shut behind
// the drawn one, so something opaque has to be in the slot or the visitor is looking at a shut door
// through an open one. By day it is a sheet of BARE PAPER, which is also simply what an open door
// onto a bright afternoon looks like from inside a room. That sheet used to have a storm's worth of
// company — the outside gone over in the rain, egg-rain's own drops re-struck on the twelve, and one
// drawing of white for a strike — and it is the only one of the four left.
//
// THE PENDANT is the room's own three-petal lamp, reparented into a pivot at the ceiling rose so
// that `rotation.z` is a swing. It used to take four degrees off a storm and ten seconds to lose
// them; it takes 2.4 off a cross coming away from a wall, and six.
//
// api (published as props.cross):
//   phase        shut · falling (the cross going over) · opening (the hatch lifting) · open (the
//                hatch open and the room looking down it) · closing · day · day-closing
//   open         is the hatch open — what flow.js's hook and the note the server writes him read
//   path         null · 'light' · 'dark' — the road taken at the doorway, by day, and nowhere else
//   out          is the crossroads plate up (which is the same question as: is the camera at it)
//   click()      work the cross as a pointer does: cue, events and all
//   choose(p)    take a road as a click on it does
//   set(phase)   put it there for a still, with no cue and nothing to wait for. 'shut' · 'open'
//                (the cross inverted and the hatch open) · 'day' · 'day-out'
//   hitBox()     the cross's box on the glass, in px · tapBox() the box a thumb is given
//   cellar       the hatch's own api (src/pieces/egg-cellar.js): its rectangle, its well, its one
//                red, the pose tables, its box on the glass, and `bottom` for the room nobody has
//                built down there yet
//   castleBox(s) 'light' | 'dark' (or the old 'left' | 'right'): that castle's box on the glass,
//                grown for a thumb — the switch the visitor takes a road with, by day
//   doorBox()    the doorway on the glass · plateBox() the whole sheet on it · pictureBox() the
//                traced original inside that · at(u, v) any point of the ORIGINAL, in px, so a tool
//                can crop the child rather than a rectangle
//   plate/land/castles   the sheet's own numbers, the picture's geography, and where each castle is
//                drawn — all of it measured off the file by tools/trace-plate.mjs
//   setState(n)  `cross-open` is the cross inverted with the hatch open and the room looking down
//                it; `cross-day` and `cross-day-out` are the afternoon
// events:
//   props:cross { phase, path, open }
import * as THREE from 'three';
import { INK, PAPER, canvasTexture } from '../core/strokes.js';
import { drawCross, drawLeaf, drawLandscape, LAND } from './egg-cross-draw.js';
import { eggCellar } from './egg-cellar.js';
import { PLATE } from './egg-cross-plate.js';
// WHERE THINGS ARE IN THE TRACED PICTURE. tools/trace-plate.mjs measures the horizon and the fork
// off the original it traces and writes them here; until it has been run the file carries the drawn
// landscape's own numbers, so the two roads' boxes sit on the same fork either way. It is IMPORTED
// and not fetched, for BRIEF rule 4's reason: a piece that awaits a file wears four seconds. It is a
// .js and not a .json because node's own ESM loader refuses a bare JSON import without an attribute
// Vite does not need, and the tools in tools/ read the same file the page does.
import TRACE_LAND from './egg-cross-land.js';

// ---- the pen, and the sheets it is spent on -------------------------------------------------------
// The room's own contour on the back wall is 0.013 m — the width at which the ink pass stops
// throwing a mark away as a stray dark pixel. Every drawing in this egg is struck one notch under
// it, as the weather is (egg-rain.js).
const PEN_M = 0.0118;
const PPM_CROSS = 900; // the cross is 0.23 m tall: it needs the pixels per metre, not the pixels
const PPM_LEAF = 420;
// THE SHEET IN THE OPENING carries no px/m of its own any more. It was cut at 560 while it held a
// drawing — the outside gone over in rain, with egg-rain's own drops on a second sheet in front of
// it — and 560 rather than 320 because the lens WALKS INTO it: seen from two thirds of a metre away,
// which is where the walk puts it for a drawing or two on the way through, 0.81 m of sheet is
// 1100 px of a 1280 frame and at 320 every stroke on it went soft. It is bare paper now, and bare
// paper is the same at every magnification.
// …AND THE PLATE'S OWN NIB, which is a different number for one reason: what has to match between
// two sheets at different depths is the width ON THE GLASS. At 1920x1080 the room's own contour on
// the back wall is 3.2 px (0.013 m at 244 px to the metre) and every drawing in this egg is struck
// one notch under it, at 2.9 px of glass. The original is 5.00 m wide and held whole in the frame
// with a hold of 1.5 % — about 1050 px of glass at 1920 wide, which is 210 px to the metre — so the
// same 2.9 px of glass is 0.0138 m. It is what the understudy landscape is struck at while the
// traced file is on its way; the traced plate has its own nib, measured the same way, in
// tools/trace-plate.mjs (3.86 sheet px at 1440).
const PEN_PLATE = 0.0138;
const MIN_TAP = 44; // px: what a thumb needs, whatever the cross measures on the glass

// ---- THE CROSS, on the frieze over the door -------------------------------------------------------
// The frieze is the band between the picture rail and the cornice (room.js BAND: 2.64 to 2.98) and
// it is bare all the way round the room — the drawings' one big rest. One small cross is what a
// rented room over a post office puts in it, and it goes over the DOOR rather than over him, which
// keeps the rest where the rest matters. 0.15 by 0.23 m: 22 by 35 px at the home plate, which is a
// cross and not a crucifix. It stands 22 mm off the plaster, on its nail.
//
// `pin` is where the LOWER fixing is, as a fraction of the height up from the foot, and it is the
// number the whole of round 5 turns about: the cross swings on it and hangs under it. At 0.09 the
// pin is 21 mm above the foot — where a panel pin actually goes, clear of the end grain it would
// split — and the inverted cross therefore hangs with its centre 189 mm lower than it stood, at
// 2.616 m, so it crosses the picture rail's bead at 2.60. That is not an accident to be designed
// out: a cross that has come off its nail and turned over IS lower than it was, and one that ended
// up neatly back inside the frieze would be a cross somebody had re-hung.
const CROSS = { w: 0.15, h: 0.23, cy: 2.805, off: 0.022, pin: 0.09 };

// ---- room.js's own numbers for the back-wall door -------------------------------------------------
// READ, never written. If that joinery ever changes these change with it and nothing else here does.
const DOOR_FALLBACK = { x0: 1.05, x1: 1.95, y0: 0, y1: 2.45, top: 2.12, depth: 0.1 };
const LIN = 0.035; // the door lining
const SLAB = { in: 0.012, thick: 0.045 }; // the leaf sits 12 mm in front of the reveal and is 45 thick
// …and the picture stands this far in front of its face. MEASURED OFF THE IRONMONGERY, not chosen:
// the knob's sphere reaches 90 mm proud of the leaf and the bow of the key left in the lock reaches
// 106, and room-build.js then pushes every vertex of the set through a warp field of amplitude
// 14 mm. At 100 mm the key's bow stood through the sky of the picture and read as a small ring over
// the left-hand field, which is exactly what it is. 135 mm clears the lot with the warp on top.
const PROUD = 0.135;

// ---- THE FALL, AND WHAT FOLLOWS IT, IN DRAWINGS -----------------------------------------------
// Counted in DRAWINGS and converted at the room's own fps, because everything hand-animated in this
// film is a count of drawings on the twelve.
//
// THE CROSS GOES OVER IN THIRTEEN, one pose to a drawing and not on twos: a thing coming off a wall
// is violent and a pose held for two drawings at thirty degrees apart would strobe. The curve is the
// integrated one (see the head of this file); the spacing is not.
const FALL = [6, 14, 28, 48, 74, 104, 134, 160, 180, 193, 174, 182, 180];
const FALL_HIT = 8; // the drawing it arrives under the pin: the rap on the plaster
const FALL_SET = 11; // …and the drawing it settles on, which gets a fifth of the same cue
// …and being put back, which is the same twelve drawings run the other way round and NOT the same
// list reversed: fast at the bottom, slow at the top, and no overshoot at either end.
const RIGHT = [172, 156, 134, 110, 86, 62, 42, 26, 14, 6, 2, 0];
const HATCH_AT = 6; // drawings after the cross settles before the boards start to lift: half a second
const LEAN_AT = 2; // …and after THAT before the room leans in, so the lid is moving as the lens does
const LEAN_S = 1.4; // the lean itself, and the way back
const SIT_S = 1.2;
const SHUT_LAG = 3; // drawings into the sitting-back before the lid starts down: the lens is clear

// ---- the door's own swing, which is the AFTERNOON's now and nothing else's -----------------------
// The swing: over quickly, past itself, and back onto the stop. entrance-door.js's own shape, in
// six poses instead of eight.
//
// IT STOPS PAST THE PERPENDICULAR, at a hundred degrees, and that is the picture's number rather
// than the door's. This leaf hangs on the RIGHT jamb and the lens stands two metres to its left, so
// every degree short of ninety is a strip of the crossroads still covered — at seventy-four, which
// is where the swing first came to rest, the leaf hid the whole dark castle. Past ninety it leans
// back towards the wall, the doorway is clear, and the leaf opens out into a plane the eye can read
// as a door instead of the sliver an edge-on one becomes. A door pushed all the way back against
// the wall it opens onto is also simply what a door does.
const F = { hold: 2 }; // a pose of the swing is held two drawings: the film's own twos
const SWING = [10, 32, 62, 88, 104, 100].map((d) => (d * Math.PI) / 180);
// …and shutting it is NOT that list read backwards. Backwards, the first drawing of the close is
// the overrun — the leaf goes 100° to 104° before it starts coming back, which is a door pulling
// itself further open on its way to shutting. A close has its own five poses and no overrun: it
// comes off the wall, swings, and meets the stop.
const CLOSE = [94, 72, 46, 22, 6].map((d) => (d * Math.PI) / 180);
const SHUT_F = CLOSE.length * F.hold; // ten drawings to shut it again
const OUT_CUT = 2; // drawings after the leaf comes to rest before the camera leaves for the door
// ---- THE WALK OUT, WHICH IS THE AFTERNOON'S -----------------------------------------------------
// The user, on round 2's hard cut through the door: "naw it still doesnt work - rather than a hard
// cut it should be a consistent camera pan towards the outside". So when the leaf has come open the
// camera crosses the parlour, comes onto the doorway's own centre line, goes out through the opening
// past the architrave and stops at the eye of the crossroads shot. That was the STORM's walk once
// and it is the visitor's own now: nothing but the doorway place reaches it.
//
// THE WAYPOINT is what makes it a walk and not a diagonal drift. Home stands on the room's axis of
// symmetry at x 0 and the doorway is at 1.5, so a straight chord crosses the parlour at an angle and
// meets the wall obliquely; through the waypoint the camera goes forward, comes onto the door's
// centre line while it is still well inside the room, and takes the last three metres square to the
// opening — which is the only way this film moves a camera (BRIEF: lateral tracks, straight pushes,
// square to the back wall). z 0.75 is a hand's breadth downstage of the table's rim (0.62) and
// x 1.5 is a metre clear of the bookcases at 1.02, so nothing in the set is walked through.
// ---- THE DAY'S OWN TWO NUMBERS ------------------------------------------------------------------
// DAY_OUT is the drawing the camera leaves on: the leaf is at rest after SWING.length x F.hold = 12
// drawings and the lens waits OUT_CUT (2) more, which is the same sixth of a second of stillness a
// cutter leaves on a stop. The eight-drawing wait this used to have in front of it was the storm
// coming in, and there is no storm; the visitor pushed the door and it goes.
const DAY_OUT = 12 + OUT_CUT;
// …and the walk leaves from the DOORWAY and not from the chair, so it has 2.2 m less to cover than
// the 6.1 m the old one crossed, and 1.6 s is the same stride. OUT_S is that longer one, kept for
// the one case that can still ask for it: a `set('day-out')` answered while the camera is standing
// at `home`, which is a tool's still and not a visitor's walk.
const DAY_OUT_S = 1.6;
const OUT_S = 2.5;
const BACK_S = 1.5; // …and the shorter way home
const VIA_OUT = [PLATE.eye[0], 1.53, 0.75];
const SHUT_AT = 3; // drawings into the way back before the leaf starts to shut: the lens is clear
// how near the sheet in the opening the lens has to be, in metres, for it to be left standing there
// rather than hidden: see THE THRESHOLD, below
const THROUGH = 1.2;
// THE PENDANT, and it is the whole of what the room's light does about any of this. 2.4 degrees,
// damped out over six seconds. It used to be 4.2 over ten, which was a storm's worth of weather
// coming through a wall; this is a quarter-kilogram of wood letting go of a nail three metres away.
const SWAY = { amp: (2.4 * Math.PI) / 180, period: 1.55, tau: 2.1 };

export function eggCross(ctx, { group, switches, pendant = null, door = null, rain: RAIN = null }) {
  const d = { ...DOOR_FALLBACK, ...(door ?? ctx.pieces.room?.door ?? DOOR_FALLBACK) };
  const zb = -ctx.layout.room.depth / 2;
  const zr = zb - d.depth;
  const dz1 = zr + SLAB.in + SLAB.thick; // the face of the merged leaf, knob and key excepted
  const PLATE_Z = dz1 + PROUD;

  // ---- where the picture hangs: on the rays from the home plate's eye ------------------------------
  // See the head of this file. `k` is how far along the ray to the opening's corner the plate's own
  // depth falls; multiply the corner by it about the camera and the plate projects onto the doorway
  // exactly, from the one eye the room is judged by.
  const eye = ctx.layout.shots?.home?.pos ?? [0, 1.2, 2.55];
  const k = (eye[2] - PLATE_Z) / (eye[2] - dz1);
  const onRay = (x, y) => [eye[0] + (x - eye[0]) * k, eye[1] + (y - eye[1]) * k];
  const [ox0, oy0] = onRay(d.x0 + LIN + 0.004, d.y0 + 0.006);
  const [ox1, oy1] = onRay(d.x1 - LIN - 0.004, d.top - 0.004);
  const PW = ox1 - ox0, PH = oy1 - oy0;

  const root = new THREE.Group();
  root.name = 'cross';
  root.userData.noShadow = true; // nothing in this egg throws a shadow: it is all drawing
  group.add(root);

  // a sheet's material: pepe.js's three numbers, for pepe.js's reasons. `colorful` so the ink pass
  // shows the drawing verbatim and re-states its achromatic marks at the room's own pen (which is
  // what keeps the sun yellow); `lineWeight` 0 so no second contour is drawn round a card; `hatch`
  // 0.02 so a flat sheet facing the visitor takes no wash.
  const sheet = (canvas, name, { side = THREE.FrontSide } = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0, side });
    m.userData.ink = { hatch: 0.02, lineWeight: 0, colorful: true };
    const tex = canvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
    m.map = tex;
    m.alphaTest = 0.5;
    m.transparent = false;
    m.name = name;
    return m;
  };

  // ---- 1. THE CROSS, ON ITS LOWER FIXING -------------------------------------------------------
  // The sheet hangs from a GROUP at the foot pin, so `rotation.z` is the half turn and the drawing
  // never moves relative to the wood. The pin is at 0.09 of the height up from the foot, so the
  // sheet's own centre stands (0.5 - 0.09) x h = 94.3 mm above it — and after a half turn it stands
  // the same 94.3 mm BELOW it, which is the whole gag, in one offset.
  const CROSS_UP = CROSS.h * (0.5 - CROSS.pin);
  const crossPin = new THREE.Group();
  crossPin.name = 'cross-pin';
  crossPin.position.set((d.x0 + d.x1) / 2, CROSS.cy - CROSS_UP, zb + CROSS.off);
  root.add(crossPin);
  const crossMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CROSS.w, CROSS.h),
    // …AND THE SHEET IS DOUBLE-SIDED, which the axis made necessary: turned a half turn about x, a
    // one-sided plane has its back to the room and the renderer throws it away. Seen from behind the
    // drawing is flipped top to bottom — which is the whole point — and mirrored left to right, which
    // on a cross whose upright leans a quarter of a nib is not a difference anybody can see.
    sheet(drawCross({ w: CROSS.w, h: CROSS.h, ppm: PPM_CROSS, penM: PEN_M, pin: CROSS.pin }), 'cross-sheet', { side: THREE.DoubleSide }),
  );
  crossMesh.name = 'cross-wall';
  crossMesh.castShadow = crossMesh.receiveShadow = false;
  crossMesh.position.set(0, CROSS_UP, 0);
  crossPin.add(crossMesh);

  // ---- 2. WHAT STANDS IN THE OPENING --------------------------------------------------------------
  // Round 1 hung the crossroads here and the user threw it out: "naw, this looks terrible - this
  // doesn't work." A landscape restaged inside a slot two and a half times taller than it is wide is
  // a stripe. So the opening carries ONE sheet and no picture, and the crossroads is a plate in the
  // open air that the room walks out to.
  //
  // That sheet is load-bearing and not only tone: room.js merges the real door leaf into the same
  // buffer as the skirting, so when the drawn leaf swings away something opaque has to be standing in
  // the opening or the visitor is looking at a shut door through an open one. Bare paper is also
  // simply what an open door onto a bright afternoon is, seen from inside a room. It used to have the
  // outside gone over in rain and egg-rain's own drops in front of that, and it was only ever white
  // for the single drawing of a strike; the storm is retired and the white is all there is now.
  const weather = new THREE.Group();
  weather.name = 'cross-weather';
  weather.userData.noShadow = true;
  weather.visible = false;
  root.add(weather);
  const outMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), (() => {
    const m = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, metalness: 0 });
    m.userData.ink = { hatch: 0, lineWeight: 0, colorful: true };
    m.name = 'cross-outside';
    return m;
  })());
  outMesh.name = 'cross-outside';
  outMesh.castShadow = outMesh.receiveShadow = false;
  outMesh.position.set((ox0 + ox1) / 2, (oy0 + oy1) / 2, PLATE_Z);
  weather.add(outMesh);

  // ---- 2b. THE CROSSROADS, ON A PLATE IN THE OPEN AIR ---------------------------------------------
  // 12.60 by 12.20 m of drawn country, standing on the lens axis 6.28 m outside the wall with the
  // traced original 5 by 5 in the middle of it, and it fills the frame at every window shape from a
  // phone held upright to 16:9 (the numbers, and the cover fit that solves the lens for them, are in
  // egg-cross-plate.js; the camera's `crossroads` shot IS that solver). It is reached by one road
  // now and not two: the visitor walks to the doorway and opens the door.
  //
  // It carried three sheets while there was a storm — the landscape with its sky left as a hole, a
  // bank of cloud behind it that lifted in three drawings when the light road was taken, and one
  // drawing of bare paper with a fork of light down it for a strike. Two of the three are retired
  // with the weather, and what is left is the country.
  const plate = new THREE.Group();
  plate.name = 'crossroads';
  plate.userData.noShadow = true;
  plate.visible = false;
  root.add(plate);
  // THE PAPER BEHIND IT. Round 3 stood the picture ON this and a good half of every frame was it;
  // round 4 carries the drawing out to the edges of the sheet instead (the user: "make this actually
  // full width"), and the lens is now solved to COVER that sheet at every window shape, so this quad
  // can no longer appear in any frame. It is kept, one quad, for the reason a stage keeps a back
  // wall: the cover fit is arithmetic on floating-point numbers and the day it is a pixel short the
  // thing behind the drawing should be the paper it is printed on and not the void.
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(PLATE.w * 1.6, PLATE.h * 1.6), (() => {
    const m = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, metalness: 0 });
    m.userData.ink = { hatch: 0, lineWeight: 0, colorful: true };
    m.name = 'cross-paper';
    return m;
  })());
  groundMesh.name = 'cross-paper';
  groundMesh.castShadow = groundMesh.receiveShadow = false;
  groundMesh.position.set(PLATE.centre[0], PLATE.centre[1], PLATE.centre[2] - 0.06);
  plate.add(groundMesh);
  // THE SHEET, which since round 4 is the whole landscape and not the original alone: 12.60 by 12.20
  // metres of it, the traced square standing 5 by 5 in the middle (egg-cross-plate.js, and
  // tools/extend-plate.mjs for what is drawn in the rest of it). One quad, one texture.
  const landMesh = new THREE.Mesh(new THREE.PlaneGeometry(PLATE.w, PLATE.h), (() => {
    const m = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, metalness: 0 });
    m.userData.ink = { hatch: 0.02, lineWeight: 0, colorful: true };
    m.name = 'cross-landscape';
    return m;
  })());
  landMesh.name = 'cross-landscape';
  landMesh.castShadow = landMesh.receiveShadow = false;
  landMesh.position.set(...PLATE.centre);
  plate.add(landMesh);
  // …AND THE UNDERSTUDY IS ITS OWN SHEET NOW. The drawn landscape (egg-cross-draw.js) stands in for
  // the traced original for the few hundred milliseconds before the file lands, and it is composed
  // to fill a square: stretched over a sheet two and a half times wider it would be a different
  // drawing. So it is hung at the ORIGINAL's own size in the middle of the plate and taken down the
  // moment the real one arrives. Its canvas is the picture's 1440 px and not the sheet's 3628, which
  // is also what keeps this build under BRIEF rule 4's ceiling.
  const standIn = new THREE.Mesh(
    new THREE.PlaneGeometry(PLATE.pic.w, PLATE.pic.h),
    sheet(drawLandscape({ w: PLATE.pic.w, h: PLATE.pic.h, ppm: PLATE.ppm, penM: PEN_PLATE }), 'cross-standin'),
  );
  standIn.name = 'cross-standin';
  standIn.castShadow = standIn.receiveShadow = false;
  standIn.position.set(PLATE.centre[0] + PLATE.pic.dx, PLATE.centre[1] + PLATE.pic.dy, PLATE.centre[2] + 0.01);
  plate.add(standIn);
  // ---- AND THE PICTURE IS THE ORIGINAL, TRACED (round 3) ------------------------------------------
  // The user: "the meme doesnt work if you redraw it, it only works as an original. maybe you can
  // just trace the outlines of the actual meme with our ink rather than trying to redraw it?" So the
  // landscape above is now only the UNDERSTUDY. `tools/trace-plate.mjs` puts his own copy of the
  // picture through the mill — the outlines found, the noise dropped, every line re-struck at this
  // plate's own nib about its own centre line, the dark side hatched, the sun's disc filled in the
  // fire's yellow — and what it writes is loaded here and hung on the sheet.
  //
  // IT IS NOT AWAITED. A piece that awaits a file wears the headless browser's first four seconds
  // (BRIEF rule 4), and this one has no need to: the texture is hung on the material when it
  // arrives, and until it does the sheet carries the drawing. The loader is tracked, so a
  // screenshot's `assets.settle()` still waits for it and no judge ever sees the understudy.
  //
  // AND THE WEATHER CHANGES SIDES WHEN IT ARRIVES. The drawn landscape leaves its sky as a HOLE so
  // the bank of cloud can stand behind the hills and be occluded by them; a traced photograph has
  // no hole in it and never will. So over a traced plate the bank stands in FRONT — a cut-out of
  // paper-filled cloud (drawSky paints no ground: its canvas is transparent outside the bank), laid
  // over the top four tenths of the picture, which is a storm rolling across a drawing rather than
  // one seen through it. It lifts in the same three drawings either way, so the left road's three
  // seconds are unchanged.
  const TRACED = '/reference/crossroads-ink.png';
  let traced = false;
  try {
    Promise.resolve(ctx.assets?.texture?.(TRACED))
      .then((t) => {
        if (!t?.image) return;
        landMesh.material.map?.dispose?.();
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        t.anisotropy = Math.max(t.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
        landMesh.material.map = t;
        landMesh.material.needsUpdate = true;
        standIn.visible = false; // the drawing has done its turn
        traced = true;
      })
      .catch((e) => console.warn('[cross] no traced plate; the drawing stands in:', e?.message ?? e));
  } catch (e) {
    console.warn('[cross] no traced plate; the drawing stands in:', e?.message ?? e);
  }
  // ---- 3. the leaf, on a pivot at the hanging edge -----------------------------------------------------
  // room.js hangs this door from the RIGHT jamb (its three strap hinges are on that stile), so the
  // pivot is the picture's right-hand edge and the free edge swings into the room. Past about 68°
  // the camera — which stands two metres to the left of this door — is looking at the leaf's OTHER
  // face, which is what a wide-open door does when you are standing to one side of it. So there are
  // two sheets back to back, each with its own drawing: the room side, with the enamel plate, the
  // visiting card and the knob, and the landing side, which has none of that on it. A double-sided
  // sheet with one drawing would have printed the PTT's notice on the outside of the door.
  const hinge = new THREE.Group();
  hinge.name = 'cross-door';
  hinge.position.set(ox1, (oy0 + oy1) / 2, PLATE_Z + 0.004);
  hinge.visible = false;
  root.add(hinge);
  for (const [face, side, dz] of [['room', THREE.FrontSide, 0.001], ['landing', THREE.BackSide, -0.001]]) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(PW, PH),
      sheet(drawLeaf({ w: PW, h: PH, ppm: PPM_LEAF, penM: PEN_M, back: face === 'landing' }), `cross-leaf-${face}`, { side }),
    );
    m.name = `cross-leaf-${face}`;
    m.castShadow = m.receiveShadow = false;
    m.position.set(-PW / 2, 0, dz);
    hinge.add(m);
  }

  // ---- 4. THE CELLAR (src/pieces/egg-cellar.js) --------------------------------------------------
  // The hatch, the well, the flight, the one red, the hole in the room's own floor mesh and the shot
  // the room looks down it from. It is a piece of its own because none of it is about a cross and
  // all of it is about a floor, and because the room the user said we could think about building
  // down there will want its own file next to this one and not a second thousand lines in this one.
  //
  // Section 4 used to be THE FLASH — a group of four sheets of bare paper, one to each pane of the
  // back wall's casement, that a strike whitened. The window came out of the room, then the panes
  // went, then the strike; the group stayed empty for a round because `flashing` was published off
  // it, and now it is gone too.
  const CELLAR = eggCellar(ctx, { group: root, switches });

  // ---- 5. the pendant, on a pivot at the ceiling rose ------------------------------------------------
  // props.js builds the three-petal lamp in the room's own coordinates and adds it flat, so there is
  // nothing to turn. It is lifted into a pivot at the rose and pushed back down by the same amount,
  // which leaves every vertex exactly where it was and gives `rotation.z` a hook to hang on.
  let sway = null;
  if (pendant && pendant.parent) {
    const ceil = ctx.layout.room.height;
    sway = new THREE.Group();
    sway.name = 'pendant-swing';
    sway.position.set(0, ceil, 0);
    pendant.parent.add(sway);
    sway.add(pendant);
    pendant.position.y -= ceil;
  }

  // ---- the cues -----------------------------------------------------------------------------------
  // Four of them, and they go through the sound piece's own front door — `play(name)` — and not on a
  // private fader of this piece's, which is what the thunder needed and needed for a reason: thunder
  // was scheduled straight onto the context because sound.js publishes its context and not its
  // master, so anything bypassing `play` has to mind the mute key itself. These four are ordinary
  // cues in sound-voices.js (`nail`, `rap`, `hatch`, `lid`), they go through the master, and they
  // obey the mute key for free.
  const cue = (name, gain = 1) => {
    try {
      ctx.pieces.sound?.play?.(name, { gain });
    } catch (e) {
      console.warn(`[cross] no ${name}:`, e?.message ?? e);
    }
  };

  // ---- boxes on the glass --------------------------------------------------------------------------
  const v = new THREE.Vector3();
  const v0 = new THREE.Vector3(); // …and a second, because api.at(u, v) has a `v` of its own
  function boxOf(mesh, w2, h2) {
    if (!mesh) return null;
    mesh.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    for (const dx of [-w2, w2])
      for (const dy of [-h2, h2]) {
        v.set(dx, dy, 0);
        mesh.localToWorld(v).project(ctx.camera);
        if (v.z > 1) return null; // behind the lens: there is nothing on this glass to point at
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // WHOSE GEOGRAPHY THE PICTURE HAS: the traced original's, measured off the file by the tool, once
  // the file is on the sheet; the drawing's own until then.
  // …and it is the traced file's numbers ALONE, not the drawing's with a few of them overwritten.
  // egg-cross-draw.js's LAND also says where the child, the sun and the two castles are IN THE
  // DRAWING, and none of those is a fact about somebody else's picture; a tool handed a merged
  // object would crop the child out of the wrong place and never know. What the trace measures is
  // what there is.
  const geography = () => (traced ? { ...TRACE_LAND.land } : LAND);
  // WHERE A POINT OF THE PICTURE LANDS ON THE GLASS, in px, and `u, v` are THE ORIGINAL'S own — 0,0
  // is the top-left corner of the meme and 1,1 the bottom-right of it, whatever else is on the sheet
  // round it. That is round 4's one change to this file's coordinates and it is the useful way
  // round: everything anybody asks this piece for is a fact about the picture (the fork, the child's
  // shoes, a castle), and where the picture sits on the sheet is one line of arithmetic, here.
  function at(u, v) {
    if (!plate.visible) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    landMesh.updateMatrixWorld(true);
    v0.set(PLATE.pic.dx + (u - 0.5) * PLATE.pic.w, PLATE.pic.dy + (0.5 - v) * PLATE.pic.h, 0);
    landMesh.localToWorld(v0).project(ctx.camera);
    if (v0.z > 1) return null; // behind the lens
    return { x: ((v0.x + 1) / 2) * W, y: ((1 - v0.y) / 2) * H };
  }
  // …and the two castles, in those same coordinates. The trace tool measures them off the original
  // it traces; the drawn understudy's own numbers stand in until the file is on the sheet, so the
  // switches are in the right place either way (egg-cross-draw.js LAND: `bright` and `dark` are the
  // two castles' centre lines and `hz` the horizon they stand above).
  const DRAWN_CASTLES = {
    light: { u0: LAND.bright - 0.1, v0: LAND.hz - 0.215, u1: LAND.bright + 0.1, v1: LAND.hz + 0.01 },
    dark: { u0: LAND.dark - 0.1, v0: LAND.hz - 0.2, u1: LAND.dark + 0.1, v1: LAND.hz + 0.01 },
  };
  const castles = () => (traced && TRACE_LAND?.castles?.light && TRACE_LAND?.castles?.dark ? TRACE_LAND.castles : DRAWN_CASTLES);
  const hitBox = () => boxOf(crossMesh, CROSS.w / 2, CROSS.h / 2);
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w2 = Math.max(b.w, MIN_TAP), h2 = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w2 / 2, y: b.y + b.h / 2 - h2 / 2, w: w2, h: h2, grown: w2 > b.w || h2 > b.h };
  }
  // ---- THE TWO CASTLES, WHICH ARE THE SWITCHES (round 4) -------------------------------------------
  // The user: "and can you make the castles the place where the user should click to decide what way
  // to go?" Rounds 3 and before gave each road half of the glass from the horizon down — an enormous
  // target, and a wrong one twice over: half the screen is not a thing anybody thinks they are
  // clicking, and the ROAD is not what the choice is about. The choice is about where it goes. So
  // the switch is the place: the bright castle with the sun over it for the light path, the dark one
  // on its crag for the other, and bare country everywhere else.
  //
  // WHERE THEY ARE IS MEASURED OFF THE PICTURE and not typed in here: tools/trace-plate.mjs finds
  // each castle in the original it traces — the bright one by the plate of colour the sun is keyed
  // in, which it stands inside; the dark one as the island of storm-half stone that stands upright —
  // and writes both into egg-cross-land.js in the PICTURE's own u,v. This function does nothing but
  // project that rectangle and make it big enough to hit.
  //
  // AND IT IS GROWN, twice over. A fifth of its own size each way, because a castle drawn on a hill
  // has a hill under it and a sky round it and a pointer near the spires should count; and then out
  // to a floor of 120 px on a laptop and 80 on a phone, which is what the dark castle needs on a
  // small frame (it measures 73 by 50 there). The two can grow until they touch and no further: the
  // gap between them is 272 px of a 1280 frame and 131 of a 390, and the code splits it rather than
  // letting a pointer in the middle of the picture be a choice.
  const MIN_CASTLE = 120; // px on a laptop…
  const MIN_CASTLE_PHONE = 80; // …and on a phone, where a thumb is bigger and the frame is not
  const castleBox = (which) => {
    const c = castles()?.[which === 'left' ? 'light' : which === 'right' ? 'dark' : which];
    if (!c || !plate.visible) return null;
    const a = at(c.u0, c.v0), b = at(c.u1, c.v1);
    if (!a || !b) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    let x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
    let y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    const min = Math.min(W, H) < 520 ? MIN_CASTLE_PHONE : MIN_CASTLE;
    const grow = (lo, hi, want) => {
      const mid = (lo + hi) / 2;
      const half = Math.max((hi - lo) * 0.61, want / 2, MIN_TAP / 2);
      return [mid - half, mid + half];
    };
    [x0, x1] = grow(x0, x1, min);
    [y0, y1] = grow(y0, y1, min);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  // …and neither may reach into the other. Asked for both at once so the split is the same split
  // whichever of them is being asked about.
  function pathBox(which) {
    const light = castleBox('light'), dark = castleBox('dark');
    if (!light || !dark) return which === 'light' || which === 'left' ? light : dark;
    const lr = light.x + light.w, dl = dark.x;
    if (lr > dl) {
      const mid = (lr + dl) / 2;
      light.w = Math.max(MIN_TAP, mid - light.x);
      dark.w = Math.max(MIN_TAP, dark.x + dark.w - mid);
      dark.x = mid;
    }
    return which === 'light' || which === 'left' ? light : dark;
  }
  const inBox = (b, px, py) => !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;

  // ---- THE STATE MACHINE, WHOLE, NOW THAT THERE ARE TWO WAYS IN -------------------------------
  //
  // IT IS COUNTED IN DRAWINGS THIS PIECE HAS BEEN GIVEN, and not in seconds off the clock, which is
  // a decision with two reasons and they pull the same way. The film's own: everything hand-animated
  // in this room is a count of drawings on the twelve, and a beat measured in wall seconds would be
  // the only thing here running on a different clock from the paper (egg-fine.js says the same at
  // greater length). And the machine's: `clock.frame` follows REAL time, so a browser drawing this
  // room in software at one frame a second advances it twelve at a time, and a pose due on drawing
  // nine would simply never be on the drawing anybody rendered. A counter that goes up by one every
  // time this piece is asked to draw cannot skip a pose, and it is also what lets a proof release
  // the whole thing one drawing at a time.
  //
  //          +---- click the CROSS ---> falling --13 dr--> opening --17 dr--> open
  //          |      (the frieze)        (it goes over)     (the boards)        |
  //   shut --+                                                     click the cross or the hatch
  //     ^    |                                                                 v
  //     |    +-- click the DOOR, standing at the doorway --> day             closing
  //     |        (walk.js)                                    |                |
  //     +-------- day-closing <-- choose a road, click off, Escape ------------+
  //
  // THE TWO ENTRIES CANNOT MEET, and that is by construction rather than by care: both are refused
  // unless the phase is `shut`, so whichever is taken first owns the room until it hands it back.
  //   - `start()` (the cross) refuses unless shut -- it always did.
  //   - `openByDay()` refuses unless shut, and the cross's own switch is `enabled` only while shut
  //     or open AND while the visitor is not standing at a place, so a hand cannot drop the cross
  //     from the doorway and take the floor out from under a walk that is holding the camera.
  //   - `choose()` answers in `day` alone now. The roads are the afternoon's, and the afternoon is
  //     the only thing that reaches the plate.
  //   - `set()` / `setState()` reach `shut` from ANY phase, so a judging state always lands
  //     somewhere legal whatever the room was doing.
  //
  // WHAT IS DIFFERENT ABOUT THE DAY, and it is all subtraction. No cross falling, no hatch, no
  // pendant swinging, and no line from him -- `props:cross` carries `day` with `open` false, and
  // flow.js only ever acts on the hatch being open, so he says nothing about a door the visitor
  // opened themselves. What is the SAME is the leaf (the same six poses on the same twos), the plate
  // (his own traced crossroads), the two castles, and `path`.
  let phase = 'shut';
  let path = null;
  let drawn = 0; // drawings this piece has been given, ever
  let from = 0; // ...and the one this phase began on
  let swayFrom = -1e9; // the drawing the pendant was set going on
  let byHand = false; // put here by set(), which must HOLD: see egg-fine.js's own latch
  const FPS = () => ctx.clock?.fps || 12;
  const frame = () => drawn - from;

  function emit() {
    ctx.emit?.('props:cross', { phase, path, open: phase === 'open' });
  }
  function go(next) {
    phase = next;
    from = drawn;
    emit();
  }
  function showLeaf(theta) {
    hinge.visible = theta != null;
    if (theta != null) hinge.rotation.y = theta;
  }
  // IT FALLS OUT OF THE WALL AND DOWN, ABOUT THE HORIZONTAL AXIS ALONG THE WALL, and that is the
  // user's own correction: the first cut turned it about `rotation.z`, the axis normal to the
  // plaster, so the cross swung round IN THE PLANE OF THE WALL like a clock hand — up over the
  // frieze, onto the cornice, and down the far side. He looked at it once: "no bueno". Gravity is not
  // in the plane of a wall. About x, the head comes OUT into the room and down.
  const setCross = (deg) => {
    crossPin.rotation.x = (deg * Math.PI) / 180;
  };
  // the pendant: a swing on the 12 fps clock, damped. Not a tween -- it is evaluated at the stepped
  // time, so it holds on a frozen frame like everything else in the room.
  function swing() {
    if (!sway) return;
    const s = (drawn - swayFrom) / FPS();
    if (s < 0 || s > 9) {
      sway.rotation.z = 0;
      return;
    }
    sway.rotation.z = SWAY.amp * Math.exp(-s / SWAY.tau) * Math.cos((2 * Math.PI * s) / SWAY.period);
  }
  // the weather, handed over by props.js rather than fetched off ctx.pieces, because a `?cross=`
  // answered while props is still building has no ctx.pieces.props to ask. Nothing in this file
  // turns it ON any more -- the storm is retired -- and it is still held so that a judging state can
  // put a room somebody else set raining back the way it found it.
  const rain = () => RAIN ?? ctx.pieces.props?.rain ?? null;

  // ---- THE EXCURSION: THE ROOM WALKS OUT THROUGH ITS OWN DOOR ---------------------------------
  // Round 2 CUT here, and the user threw the cut out. What happens now is one continuous move each
  // way, and everything below exists to keep the drawing straight while it is running.
  //
  // The camera is built AFTER props, so it is never cached: it is asked for by name each time, and
  // a room with no camera piece simply never leaves and keeps the door in the frame.
  const atPlate = () => ctx.pieces.camera?.current === 'crossroads';
  // WHETHER THE ROOM IS OUT is this piece's own fact and no longer the camera's, because for a
  // second and a half each way the answer is "on its way". `outside` is raised on the drawing the
  // walk out leaves and lowered on the drawing the walk home arrives, so the plate is standing in
  // the open air for the whole of both -- which is what makes the passage through the opening work:
  // the sheet in the doorway is opaque and hides the plate until the lens is past it, and the merged
  // leaf behind it hides it again on the way in.
  let outside = false;
  // THE PLATE IS UP WHEREVER THE ROOM IS OUT, and nowhere else. It stands 9.40 m beyond a wall the
  // parlour can only see through one doorway. It is called at the head of update AND on the far side
  // of every move, because a move begun inside one drawing must be true on that drawing: a proof
  // that releases exactly the drawing the walk leaves on would otherwise be handed a camera on its
  // way to a picture that is not there.
  function syncPlate() {
    const want = outside || atPlate();
    if (plate.visible !== want) plate.visible = want;
  }
  // The camera is built AFTER props, so a `?cross=day-out` answered during the build has nobody to
  // ask. It is parked and played on the first drawing there is a camera to play it with.
  let pending = null;
  // ...and the excursion is HELD, which is a thing the conversation made necessary. The talk loop
  // re-asserts its frame at the top of every turn (flow.js: `if (C?.current !== frame) cut(frame)`),
  // so an unheld camera was pulled back into the parlour a second and a half later, for one drawing
  // -- a flash-frame of the room in the middle of the picture. With a MOVE instead of a cut it would
  // be worse: the walk would simply be cancelled halfway across the room. So the hold goes on BEFORE
  // the first drawing of a walk (`{jump: false}`, or taking it would be the cut we are trying not to
  // make), it MOVES to the shot being walked back TO -- a hold on the shot we are leaving would
  // block the leaving -- and it is given up on the drawing the camera comes to rest.
  const camera = () => ctx.pieces.camera ?? null;
  function goOut({ at = false } = {}) {
    const C = camera();
    if (!C || !C.shots?.crossroads) {
      pending = at ? 'at' : 'out';
      return false;
    }
    pending = null;
    outside = true;
    syncPlate();
    if (at || !C.move) {
      // a still: the hold IS the jump (camera.hold puts the camera on the shot unless told not to)
      if (C.hold) C.hold('crossroads');
      else C.cut('crossroads');
      syncPlate();
      return true;
    }
    if (C.holding === 'crossroads' && !C.moving) return true;
    C.hold('crossroads', { jump: false });
    // the brake is SHORT: a dolly spends its drawings where it stops, and this one must not stop in
    // the doorway -- it crosses the threshold at cruise and brakes in the open air beyond it. AND IT
    // LEAVES FROM WHERE THE CAMERA IS: this walk starts at the DOORWAY, and naming `home` there
    // would have jumped the lens back across the room for one drawing before walking it out again.
    // `null` is camera.js's own word for "off whatever pose it is holding".
    const near = C.current !== 'home';
    C.move(near ? null : 'home', 'crossroads', near ? DAY_OUT_S : OUT_S, { via: [VIA_OUT], ease: [0.26, 0.2] });
    return true;
  }
  function goHome({ at = false } = {}) {
    const C = camera();
    if (!C) {
      pending = null;
      outside = false;
      return false;
    }
    pending = null;
    if (at || !C.move) {
      C.release?.(C.holding);
      if (C.current !== 'home') C.cut('home');
      outside = false;
      syncPlate();
      return true;
    }
    if (!outside && C.current === 'home' && !C.moving) return false;
    if (C.holding === 'home' && C.moving) return true; // already walking back
    C.hold('home', { jump: false });
    C.move(null, 'home', BACK_S, { via: [VIA_OUT] }).then(() => {
      outside = false;
      syncPlate();
      C.release?.('home');
    });
    return true;
  }
  // is the room out there and standing still -- which is what the roads may be pointed at
  const arrived = () => outside && atPlate() && !camera()?.moving;

  // ---- THE LEAN: THE ROOM LOOKS DOWN ITS OWN HATCH --------------------------------------------
  // The excursion's own three moves at a quarter of the distance and with no waypoint: the lens goes
  // from the chair to a pose 30 degrees over the hole and comes back. `cellar` is egg-cellar.js's
  // own shot, injected into camera.js's table -- see that file: camera.js empties and refills
  // `shots` on a resize, so it is re-injected on any drawing it is missing from.
  let leaning = false;
  function lean(on, { at = false } = {}) {
    const C = camera();
    if (!C) {
      leaning = on;
      return false;
    }
    CELLAR.injectShot();
    if (!C.shots?.cellar) return false;
    if (on) {
      leaning = true;
      if (at || !C.move) {
        if (C.hold) C.hold('cellar');
        else C.cut('cellar');
        return true;
      }
      if (C.holding === 'cellar' && !C.moving) return true;
      C.hold('cellar', { jump: false });
      C.move(null, 'cellar', LEAN_S, { ease: [0.28, 0.24] });
      return true;
    }
    if (!leaning) return false;
    if (at || !C.move) {
      C.release?.(C.holding);
      if (C.current !== 'home') C.cut('home');
      leaning = false;
      return true;
    }
    if (C.holding === 'home' && C.moving) return true;
    C.hold('home', { jump: false });
    C.move(null, 'home', SIT_S, {}).then(() => {
      leaning = false;
      C.release?.('home');
    });
    return true;
  }

  // ---- what the cross's click actually does ---------------------------------------------------
  function start() {
    if (phase !== 'shut') return false;
    byHand = false;
    swayFrom = drawn; // something heavy came off the wall and the room felt it
    setCross(FALL[0]);
    cue('nail');
    go('falling');
    return true;
  }
  // ...and the second click, from the cross or from the hatch, which puts the whole thing back.
  function put() {
    if (phase !== 'opening' && phase !== 'open') return false;
    byHand = false;
    go('closing');
    return true;
  }

  // ---- THE DAY. The visitor is standing at the doorway and pulls the door open. ----------------
  // The swing starts on the drawing of the click and the camera leaves for the country two drawings
  // after the leaf comes to rest, which is the cut's own beat (OUT_CUT). Nothing times out: a
  // visitor who walked over here and opened the door is looking at it, and the offer is withdrawn
  // when they say so and not when a clock does.
  function openByDay() {
    if (phase !== 'shut') return false;
    byHand = false;
    path = null;
    weather.visible = true;
    outMesh.visible = true;
    showLeaf(SWING[0]);
    go('day');
    return true;
  }
  // ...and shuts it again. Called by the visitor clicking anything that is not a castle, by Escape
  // (walk.js hangs both on this piece), and by `choose` once a road has been taken.
  function shutByDay() {
    if (phase !== 'day') return false;
    byHand = false;
    go('day-closing');
    return true;
  }
  // BY DAY A ROAD IS JUST A ROAD, and since round 5 there is no other kind. There is no storm to
  // clear and none to leave standing, so both roads shut the same door on the same afternoon and the
  // difference between them is the one that matters -- what `path` says, which is what mind.js reads
  // and what the visitor chose.
  function choose(which) {
    if (phase !== 'day' || (which !== 'light' && which !== 'dark')) return false;
    path = which;
    byHand = false;
    go('day-closing');
    return true;
  }

  function clear() {
    showLeaf(null);
    weather.visible = false;
    setCross(0);
    CELLAR.show(false);
    CELLAR.setLid(0);
    lean(false, { at: true });
    if (sway) sway.rotation.z = 0;
    swayFrom = -1e9;
  }

  // ---- the switches -----------------------------------------------------------------------------
  // The cross answers when the room is quiet and again when it is hanging upside down, and it does a
  // different thing each time: a switch that is enabled in two phases and means "start" in one and
  // "put it back" in the other is still one switch, and the cursor over it is the whole affordance
  // either way. While it is GOING OVER, and while the boards are lifting, it is a cross on a wall.
  // ...AND IT STANDS DOWN WHILE THE VISITOR IS AT A PLACE. It hangs on the frieze 355 mm over the
  // doorway's own head, so at the `doorway` shot it is in the picture and a hand reaching for the
  // door could take it instead -- and the cross would then drop the floor out from under a walk that
  // is holding the camera, from `home`'s pose, halfway across a room the visitor had already
  // crossed. While somebody is standing anywhere, the door is worked by the door.
  const atAPlace = () => !!ctx.pieces?.walk?.at;
  switches?.add?.({
    name: 'cross',
    object: () => crossMesh,
    tapBox,
    enabled: () => !atAPlace() && (phase === 'shut' || phase === 'open'),
    onDown: () => (phase === 'shut' ? start() : put()),
  });
  // ...and the hatch itself, which is the same second click from the other end of the room.
  CELLAR.switchOn(
    () => put(),
    () => phase === 'open' && !atAPlace(),
  );
  const offering = () => phase === 'day';
  for (const which of ['light', 'dark']) {
    switches?.add?.({
      name: `cross-${which}`,
      object: () => landMesh,
      tapBox: () => pathBox(which),
      // ...and only once the walk is OVER. While the camera is crossing the parlour the castles are
      // not a choice, they are scenery going past: neither is on the glass where pathBox says it is
      // until the picture has arrived.
      hit: (px, py) => offering() && arrived() && inBox(pathBox(which), px, py),
      enabled: () => offering() && arrived(),
      onDown: () => choose(which),
    });
  }

  const api = {
    get phase() {
      return phase;
    },
    get path() {
      return path;
    },
    // IS THE HATCH OPEN, which is the one fact about this egg anything downstream wants: flow.js's
    // hook, the note the server writes him, and -- when there is a room down there -- the walk into
    // it.
    get open() {
      return CELLAR.open && phase === 'open';
    },
    // the drawing this phase is on: what a tool counts with instead of counting wall seconds
    get frame() {
      return phase === 'shut' ? 0 : frame();
    },
    get drawn() {
      return drawn;
    },
    // where the picture is standing: what a proof reports instead of taking somebody's word for it
    get out() {
      return plate.visible;
    },
    // THE BANK OF CLOUD IS RETIRED and this answers what it always answered when there was none on
    // the country: -1, the sheet taken off. It is kept because tools/_walk-proof.mjs asks the
    // question, and the honest answer to "how much weather is on the plate" is still none.
    get sky() {
      return -1;
    },
    // THE SHEET's own numbers, and the ORIGINAL's inside it. `w`/`h` are the whole landscape, which
    // is what the mesh is cut to and what the lens covers; `pic` is the part somebody else drew.
    plate: {
      w: PLATE.w, h: PLATE.h, at: [...PLATE.centre], eye: [...PLATE.eye], ppm: PLATE.ppm,
      safe: { ...PLATE.safe }, pen: PEN_PLATE, hold: PLATE.hold,
      pic: { ...PLATE.pic },
      sheet: [...(TRACE_LAND?.size ?? [])],
    },
    // the one colour the picture is allowed, for a proof that wants to name what it is looking at
    colours: { sun: '#f2b829', ink: INK, paper: PAPER },
    schedule: {
      fall: [...FALL], hit: FALL_HIT, settle: FALL_SET, right: [...RIGHT],
      hatchAt: HATCH_AT, leanAt: LEAN_AT, lean: LEAN_S, sit: SIT_S, shutLag: SHUT_LAG,
      shut: SHUT_F, cut: OUT_CUT, out: DAY_OUT_S, back: BACK_S, shutAt: SHUT_AT, via: [...VIA_OUT],
    },
    // THE HATCH, THE WELL AND THE STAIR: egg-cellar.js's own api, passed straight through. `bottom`
    // is where a walk into the cellar would start, and there is nothing down there yet.
    cellar: CELLAR,
    // THE WALK, for a tool that has to know whether the picture has arrived or is still coming. It
    // is the camera piece's own answer, passed through: this file asks for the move and does not
    // own it.
    get walking() {
      return camera()?.moving ?? null;
    },
    get arrived() {
      return arrived();
    },
    get leaning() {
      return leaning;
    },
    swing: SWING.map((r) => +((r * 180) / Math.PI).toFixed(1)),
    close: CLOSE.map((r) => +((r * 180) / Math.PI).toFixed(1)),
    click: () => (phase === 'shut' ? start() : put()),
    // THE DOOR, OPENED BY HAND, BY DAY. walk.js calls these when the visitor is standing at the
    // doorway: `openByDay` on a click on the leaf or its architrave, `shutByDay` on a click that is
    // not a castle and on Escape. Both refuse from any phase but their own, so the cross and the
    // afternoon can never be in the doorway together.
    openByDay,
    shutByDay,
    get daylight() {
      return phase === 'day' || phase === 'day-closing';
    },
    choose,
    hitBox,
    tapBox,
    // THE TWO SWITCHES: 'light' | 'dark' (and 'left' | 'right' still answer, because the two roads
    // were called that for three rounds and props.js's own note still names them). Each is a box
    // round the castle that road leads to, grown for a thumb.
    castleBox: pathBox,
    pathBox,
    // the doorway on the glass, for a crop of what stands in it
    doorBox: () => boxOf(outMesh, PW / 2, PH / 2),
    // the whole SHEET on the glass, which at that shot is bigger than the glass at every window
    // shape -- that is what "full frame" means and a proof can weigh it
    plateBox: () => boxOf(landMesh, PLATE.w / 2, PLATE.h / 2),
    // ...and the ORIGINAL inside it, which must be WHOLLY on the glass: the four corners of the part
    // somebody else drew
    pictureBox: () => {
      const a = at(0, 0), b = at(1, 1);
      if (!a || !b) return null;
      return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    },
    // where a point of the drawing lands on the glass, in px -- in the ORIGINAL's own u,v
    at,
    // the picture's own geography, so a tool can ask for the child rather than for a rectangle --
    // the traced original's once it is on the sheet, the drawing's until then
    get land() {
      return geography();
    },
    get castles() {
      return { ...castles() };
    },
    get traced() {
      return traced ? { file: TRACED, source: TRACE_LAND.source, when: TRACE_LAND.when } : null;
    },
    get leaf() {
      return { shown: hinge.visible, degrees: +((hinge.rotation.y * 180) / Math.PI).toFixed(1) };
    },
    // THE CROSS ITSELF: how far over it is and which way up. `inverted` is the whole of what the user
    // asked for, in one boolean.
    get cross() {
      // …read off the SAME AXIS it is turned about (x, the horizontal line along the wall). It was
      // reading `.z` for a round, which is the axis the cross no longer moves on, so a cross hanging
      // upside down reported 0 degrees and `cross-open` judged itself upright.
      const deg = +((crossPin.rotation.x * 180) / Math.PI).toFixed(1);
      return {
        degrees: deg,
        inverted: Math.abs(deg) > 90,
        pin: crossPin.position.toArray().map((v) => +v.toFixed(4)),
        box: { w: CROSS.w, h: CROSS.h, at: CROSS.pin },
      };
    },
    get pendant() {
      return sway ? +sway.rotation.z.toFixed(5) : null;
    },
    // for the tools and for setState: a phase at once, with no cue and nothing to wait for. The
    // clock is BACK-DATED rather than skipped, egg-rain's way: put the start of the phase far enough
    // in the past that the next stepped frame agrees it is already there.
    set(next = 'shut') {
      byHand = next !== 'shut';
      pending = null;
      const R = rain();
      if (next === 'shut') {
        phase = 'shut';
        path = null;
        clear();
        goHome({ at: true });
        return;
      }
      // THE AFTERNOON, HELD. `day` is the leaf standing open on a white doorway, seen from the room;
      // `day-out` is the room standing out at the crossroads. Neither touches the rain or the light,
      // and neither touches the floor.
      if (next === 'day' || next === 'day-out') {
        phase = 'day';
        path = null;
        from = drawn - DAY_OUT;
        weather.visible = true;
        outMesh.visible = true;
        setCross(0);
        CELLAR.show(false);
        CELLAR.setLid(0);
        lean(false, { at: true });
        showLeaf(SWING[SWING.length - 1]);
        R?.set?.(false);
        if (sway) sway.rotation.z = 0;
        swayFrom = -1e9;
        if (next === 'day-out') goOut({ at: true });
        else goHome({ at: true });
        return;
      }
      // ...and the CROSS's own end state: inverted on the frieze, the hatch flat open on the boards,
      // the room looking down it. A STILL, so it jumps -- the lean is a thing to be watched and a
      // judge is looking at one frame.
      // A NAME NOBODY RECOGNISES IS `shut`, and it is worth the four lines: `setState` funnels every
      // unknown name to shut already, but `?cross=` hands this whatever is in the query string, and
      // a typo that opened the floor would be an egg answering to a word nobody meant.
      if (next !== 'open' && next !== 'falling' && next !== 'opening') {
        byHand = false;
        phase = 'shut';
        path = null;
        clear();
        goHome({ at: true });
        return;
      }
      phase = 'open';
      from = drawn;
      showLeaf(null);
      weather.visible = false;
      setCross(FALL[FALL.length - 1]);
      CELLAR.show(true);
      CELLAR.setLid(CELLAR.poses.open[CELLAR.poses.open.length - 1]);
      CELLAR.boil(0);
      goHome({ at: true });
      lean(true, { at: true });
      if (sway) sway.rotation.z = 0;
      swayFrom = -1e9;
      emit();
    },
    // `cross-open` is the cross upside down on the frieze with the floor open and the room looking
    // down it; `cross-day` and `cross-day-out` are the afternoon at the door. Every other name is a
    // room nobody has touched the cross in.
    setState(name = 'default') {
      api.set(
        name === 'cross-open' ? 'open'
          : name === 'cross-day' ? 'day'
            : name === 'cross-day-out' ? 'day-out'
              : 'shut',
      );
    },

    // Called from props.update, which only calls anything on a stepped frame -- so the fall, the
    // lid, the pendant and the cues are all on the same 12 fps grid as the boil.
    update(ctx2) {
      if (pending) goOut({ at: pending === 'at' });
      syncPlate();
      if (!ctx2.clock.stepped) return;
      CELLAR.injectShot();
      if (phase === 'shut') return;
      CELLAR.boil(ctx2.clock.frame); // the hatch and the stair, re-struck every drawing
      // A STILL RE-ASSERTS ITS OWN FRAME, for two reasons and they are the same reason twice. The
      // camera is built AFTER props, so a `?cross=open` answered during the build asked a camera
      // that was not there yet; and props.setState runs the eggs in order, so a judging state that
      // takes the lens can have it taken back by an egg further down the list. Both are cured by
      // asking again on every drawing the lens is not where this still put it — which costs one
      // string comparison, and only while a tool is holding a frame.
      if (byHand && phase === 'open' && ctx.pieces.camera && ctx.pieces.camera.current !== 'cellar') lean(true, { at: true });
      if (byHand) {
        // a still holds: without this the very next drawing decides the phase is over and the frame
        // the tool asked for is gone six drawings later (egg-fine.js paid for this lesson)
        swing();
        return;
      }
      const f = frame();

      // ---- THE DAY, which is its own two phases and shares nothing with the cross --------------
      if (phase === 'day' || phase === 'day-closing') {
        if (phase === 'day') {
          const i = Math.min(SWING.length - 1, Math.floor(f / F.hold));
          showLeaf(SWING[i]);
          if (f === DAY_OUT) goOut();
        } else {
          // the way back: the camera leaves at once and the leaf shuts as it clears the opening
          if (f === 0) goHome();
          const g2 = f - SHUT_AT;
          if (g2 >= 0) {
            const i = Math.floor(g2 / F.hold);
            if (i < CLOSE.length) showLeaf(CLOSE[i]);
            else {
              showLeaf(null);
              weather.visible = false;
            }
          }
          if (g2 >= SHUT_F) {
            clear();
            phase = 'shut';
            emit();
          }
        }
        // THE THRESHOLD. The sheet standing in the opening is the last thing between the lens and the
        // country, and the last half metre of the walk magnifies it -- but it is bare paper, so a
        // magnified blank rectangle is a blank rectangle and there is nothing to swap. The zone is
        // kept so the sheet is never left hidden behind the lens on the way back, and because the day
        // this doorway carries a drawing again it is where the swap goes.
        if (weather.visible && outside) {
          const cz = ctx.camera?.position?.z ?? 0;
          if (cz < PLATE_Z + THROUGH && cz > PLATE_Z - THROUGH * 0.29) outMesh.visible = true;
        }
        drawn++;
        return;
      }

      // ---- THE CROSS GOES OVER ------------------------------------------------------------------
      if (phase === 'falling') {
        setCross(FALL[Math.min(FALL.length - 1, f)]);
        if (f === FALL_HIT) cue('rap'); // the wood arriving under the pin, on the plaster
        if (f === FALL_SET) cue('rap', 0.2); // ...and a fifth of the same as it settles
        if (f >= FALL.length - 1 + HATCH_AT) {
          setCross(FALL[FALL.length - 1]);
          CELLAR.show(true);
          CELLAR.setLid(CELLAR.poses.open[0]);
          cue('hatch');
          go('opening');
        }
      } else if (phase === 'opening') {
        // the boards come up. The room leans in two drawings later, so the lid is still moving while
        // the lens is: a move that began after the lid had landed would read as the room being shown
        // a thing that had already happened.
        const T = CELLAR.poses.open;
        CELLAR.setLid(T[Math.min(T.length - 1, f)]);
        if (f === LEAN_AT) lean(true);
        if (f === CELLAR.poses.land) cue('lid'); // it meets the boards
        if (f === T.length - 1) cue('lid', 0.2); // ...and settles onto them
        if (f >= T.length - 1) {
          CELLAR.setLid(T[T.length - 1]);
          go('open'); // `props:cross { open: true }`, and he says what is down there
        }
      } else if (phase === 'closing') {
        // THE WAY BACK, in the order a room would do it: the lens sits up first, the lid follows it
        // down three drawings later (the same quarter-second the door is given as the camera clears
        // the opening), and the cross rights itself last, because the thing furthest from the
        // visitor is the thing they notice going.
        if (f === 0) {
          lean(false);
          cue('hatch', 0.7);
        }
        const T = CELLAR.poses.shut;
        const g2 = f - SHUT_LAG;
        if (g2 >= 0 && g2 < T.length) CELLAR.setLid(T[g2]);
        if (g2 === T.length - 1) cue('lid', 0.35); // it comes down into its own rebate
        const g3 = g2 - T.length;
        if (g3 === 0) {
          CELLAR.show(false);
          CELLAR.setLid(0);
          cue('nail', 0.5);
        }
        if (g3 >= 0) setCross(RIGHT[Math.min(RIGHT.length - 1, g3)]);
        if (g3 >= RIGHT.length - 1) {
          clear();
          phase = 'shut';
          emit();
        }
      }
      swing();
      // THE COUNTER GOES UP AT THE END, and that is not a detail. `start()` and `set()` are called
      // from a pointer or a tool, OUTSIDE this function, and they date the phase from `drawn` as it
      // stands; `go()` is called from INSIDE it and dates a phase from the drawing being drawn. Both
      // are only true if this drawing has not been counted yet when the work for it is done -- with
      // the increment at the top, the first drawing after the click came out as number one and the
      // first pose of the fall was never on any drawing at all.
      drawn++;
    },
  };

  // ?cross=open | day | day-out holds a phase for a still without a judging state
  const want = (ctx.params ?? new URLSearchParams(location.search)).get('cross');
  if (want) api.set(want);
  return api;
}
