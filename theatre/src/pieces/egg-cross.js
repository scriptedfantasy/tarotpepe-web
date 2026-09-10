// AN EGG, inside props: THE CROSS ON THE WALL, AND WHAT IS BEHIND THE DOOR.
//
// The user: "we need a cross on the wall somewhere -> when one clicks it a storm could break loose
// and the door swings open and an ink version of this meme perspectively appears in the doorframe
// and pepe says something like 'Choose your path, anon'". The meme is the crossroads picture: a
// child seen from behind at a fork in a path, a signpost with two arms, a bright castle on a hill
// under a sun on the left, a dark castle on a crag under lightning on the right.
//
// So: a small plain cross hangs on the frieze over the door. Click it and the weather comes in —
// four strikes of lightning over six seconds, thunder rolling after each, the rain starting behind
// the window on its own, the pendant swinging over the table, the room dropping a shade and a half.
// The door swings open in six drawings. He says one line. Then the visitor takes a road, and the
// room keeps the answer.
//
// ------------------------------------------------------------------------------------------------
// ROUND 2 — THE ROOM CUTS THROUGH THE DOOR, and this is the user's own fix. Round 1 did exactly
// what the sentence above says and stood the crossroads IN the doorframe. He looked at it once:
// "naw, this looks terrible - this doesn't work." He is right and the fault was never the drawing.
// The meme is a wide landscape; the doorway is a slot 0.81 m by 2.07, two and a half times taller
// than it is wide. Squashed into it the horizon becomes a stripe, the two castles are pushed in
// until they touch, and every figure is drawn at a quarter of the size the frame the film is
// actually shown in could carry.
//
// So the doorway holds NOTHING BUT WEATHER now — the outside gone over in the rain, egg-rain's own
// drops falling past the opening, and one drawing of bare paper when a strike lands — and two
// drawings after the leaf comes to rest THE ROOM CUTS: the camera steps into the opening, turns its
// back on the parlour and looks out, and a drawn plate 6.28 m beyond the wall fills the frame with
// the crossroads at the size the meme has. `crossroads` is a shot in the camera's own table
// (camera-shots.js), solved by a cover fit in egg-cross-plate.js so no edge of the sheet can appear
// at any window shape between a phone held upright and 16:9.
// ------------------------------------------------------------------------------------------------
//
// ------------------------------------------------------------------------------------------------
// ROUND 3 — THE ROOM WALKS, AND THE PICTURE IS THE ORIGINAL. Two corrections, both the user's, in
// one sentence: "naw it still doesnt work - rather than a hard cut it should be a consistent camera
// pan towards the outside, but the meme doesnt work if you redraw it, it only works as an original.
// maybe you can just trace the outlines of the actual meme with our ink rather than trying to
// redraw it?"
//
//   THE MOVE. There is no cut either way now. Two drawings after the leaf comes to rest the camera
//   LEAVES the home plate: forward across the parlour, onto the doorway's own centre line, out
//   through the opening with the architrave passing the lens, and to a stop at the eye of the
//   crossroads — two and a half seconds, thirty drawings, a new position on every one of them
//   (camera.js gained a dolly for it, `move(from, to, seconds, {via})`, and it is general: any
//   piece may ask for one). The weather standing in the opening is opaque, so the country is not
//   there until the lens is through it, and then it is the whole frame. The way back is the same
//   road in a second and a half, and the leaf shuts three drawings into it, as the lens clears the
//   opening. The camera's HOLD covers the whole excursion, both ways and the picture between them.
//
//   THE PICTURE. The landscape is not drawn any more. `tools/trace-plate.mjs` puts the user's own
//   copy of the meme through the same mill the card back and his hands went through — the outlines
//   found, the noise dropped, every line re-struck at the room's own nib with a hand's wobble, the
//   dark side hatched where the original is dark, the sun's disc filled in the fire's yellow — and
//   the plate loads that file (`public/reference/crossroads-ink.png`). Only the drawn WEATHER
//   survives, and it changes sides: over a traced picture the bank of cloud stands in FRONT of the
//   country rather than behind it, because a traced sheet is opaque and has no hole in its sky.
// ------------------------------------------------------------------------------------------------
//
// ------------------------------------------------------------------------------------------------
// THE CHOICE IS NOT IN THE USER'S WORDS. It is this file's addition and it is said so plainly here:
// the user asked for the cross, the storm, the door and the line. What happens after the line was
// left open, and an open door with a picture in it that nothing can be done about is a joke with no
// second half. So the two roads are switches — the left road's ground and the right road's, each
// half the frame from the horizon down. Take the LEFT and the storm CLEARS while the visitor is
// still looking out at the country: the bank of cloud breaks up and goes in three drawings over
// three seconds, and only then does the room cut back and the door shut, leaving it exactly as it
// was — the same pixels, and there is a proof that says so. Take the RIGHT and a strike answers on
// the drawing it is taken, the room cuts back in, the door shuts, and the thunder stays for the
// rest of the evening, a strike every thirty to ninety seconds. Either way the room keeps it:
// `path` goes on the wire with every turn from then on (mind.js) and one sentence goes into the
// note the server writes him (server/pepe.mjs, `pathLine`, appended to `situation`) — "The visitor
// chose the dark path at the door…" — and what he does with that is his.
//
// Nothing announces any of it. The cursor over the cross is the whole affordance, and the cursor
// over each half of the ground is the whole of the second one. If sixty seconds pass with nothing
// chosen, the room cuts back in, the door shuts by itself and the storm clears: an offer nobody
// took.
// ------------------------------------------------------------------------------------------------
//
// WHY THE DOOR IS A DRAWING AND NOT THE DOOR. room.js builds the back-wall door as real joinery and
// then room-build.js merges every part of the set into one mesh per material. The leaf is inside
// the same buffer as the skirting; there is no object to turn, and giving it one means rebuilding
// the wall in a file another builder is standing in. So the swing is a SHEET — the same leaf,
// drawn (egg-cross-draw.js), standing a hand's width in front of the merged one — and the merged
// leaf is hidden behind the sheet of weather, which stands in the same slot.
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
// WHAT THE STORM IS MADE OF, AND ALMOST ALL OF IT IS SOMEBODY ELSE'S:
//   THE RAIN AT THE WINDOW is egg-rain.js, called by its own api. The rain in the DOORWAY is that
//     file's drawing — its nib, its slant, its stratified deal, four throws re-struck on the
//     twelve — cut to the opening in egg-cross-draw.js, because there is no window to hang it on.
//   THE LIGHT is two states injected into lighting.js's own table, `cross-storm` and `cross-flash`.
//     The storm sits between egg-rain's `rain` and `evening` — the key down to 0.85 and cooled, the
//     corners a notch deeper, the ink ramp opened two stops — and it is NOT evening: no lamp comes
//     on and `night` stays false, or lighting.js would draw a cross-hatched sheet over the very
//     glass the rain and the flash are behind. `pools` is held at −0.20 (the rain state's own
//     −0.18, and a whisker) because `pools` is what darkens the ground the table stands on, and
//     that ground is the rug, which the user has said is already right.
//   THE FLASH is one drawing, on both sides of the wall. Four sheets of bare paper, one cut to each
//     pane, and a fifth cut to the doorway, snap on for a single 12 fps step: the rain vanishes,
//     the glass and the opening go to white, and the whole room's tone goes up a shade on the same
//     drawing because the light cuts to `cross-flash` for that drawing and back. Out at the
//     crossroads the same strike blanks the country to bare paper with a great fork of light down
//     the sky. A flash that lasted two drawings would be a lamp.
//   THE THUNDER is egg-cross-sound.js, on a fader of this piece's own hung on the sound context's
//     destination — egg-rain's arrangement, for egg-rain's reason (the sound piece publishes its
//     context and not its master), and the fader follows the visitor's mute key.
//   THE PENDANT is the room's own three-petal lamp, reparented into a pivot at the ceiling rose so
//     that `rotation.z` is a swing. Four degrees, on the 12 fps clock, damped out over ten seconds.
//
// api (published as props.cross):
//   phase        shut · storm (the strikes and the swing) · open (the room is out at the picture) ·
//                closing · dark (the storm stays and the door is shut)
//   path         null · 'light' · 'dark' — what the visitor chose, and what the room tells him
//   out          is the crossroads plate up (which is the same question as: is the camera at it)
//   sky          which drawing of the weather is on the plate: 0, 1, 2, or −1 for the sheet taken
//                off · striking  the one drawing a strike blanks the country for
//   click()      work the cross as a pointer does: cue, events and all
//   choose(p)    take a road as a click on it does
//   set(phase)   put it there for a still, with no cue and nothing to wait for. 'shut' · 'open'
//                (or 'storm': the door open on the weather, from the room) · 'out' (the crossroads
//                itself) · 'dark'
//   hitBox()     the cross's box on the glass, in px · tapBox() the box a thumb is given
//   pathBox(s)   'left' | 'right': that road's ground on the glass
//   doorBox()    the doorway on the glass · plateBox() the plate on it · at(u, v) any point of the
//                drawing, in px, so a tool can crop the child rather than a rectangle
//   plate/land   the sheet's own numbers and the picture's own geography, for the same reason
//   setState(n)  `cross-storm` is the door open on the weather; `cross-out` the crossroads plate
//                mid-storm; `cross-dark` the standing storm
//   render(s)    the thunder through an OfflineAudioContext, for the proof
// events:
//   props:cross { phase, path }
import * as THREE from 'three';
import { INK, PAPER, canvasTexture } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { drawCross, drawLeaf, drawOutside, drawRain, drawLandscape, drawSky, drawStrike, LAND } from './egg-cross-draw.js';
import { PLATE } from './egg-cross-plate.js';
// WHERE THINGS ARE IN THE TRACED PICTURE. tools/trace-plate.mjs measures the horizon and the fork
// off the original it traces and writes them here; until it has been run the file carries the drawn
// landscape's own numbers, so the two roads' boxes sit on the same fork either way. It is IMPORTED
// and not fetched, for BRIEF rule 4's reason: a piece that awaits a file wears four seconds. It is a
// .js and not a .json because node's own ESM loader refuses a bare JSON import without an attribute
// Vite does not need, and the tools in tools/ read the same file the page does.
import TRACE_LAND from './egg-cross-land.js';
import { thunder, THUNDER } from './egg-cross-sound.js';

// ---- the pen, and the sheets it is spent on -------------------------------------------------------
// The room's own contour on the back wall is 0.013 m — the width at which the ink pass stops
// throwing a mark away as a stray dark pixel. Every drawing in this egg is struck one notch under
// it, as the weather is (egg-rain.js).
const PEN_M = 0.0118;
const PPM_CROSS = 900; // the cross is 0.23 m tall: it needs the pixels per metre, not the pixels
const PPM_LEAF = 420;
const PPM_OUT = 560; // the two sheets that stand in the opening: the outside, and the rain on it
// …and 560 and not round 2's 320 because the lens now WALKS INTO these two. A sheet 0.81 m wide seen
// from the home plate is 190 px of a 1280 frame and 320 px/m was three times what it needed; seen
// from two thirds of a metre away — which is where the walk puts the lens for a drawing or two on its
// way through — it is 1100 px of the same frame, and at 320 every rain-stroke on it was four times
// magnified and went soft, which is the one thing a pen line in this film may not do.
// …AND THE PLATE'S OWN NIB, which is a different number for one reason: what has to match between
// two sheets at different depths is the width ON THE GLASS. At 1920x1080 the room's own contour on
// the back wall is 3.2 px (0.013 m at 244 px to the metre) and every drawing in this egg is struck
// one notch under it, at 2.9 px of glass.
//
// ROUND 3 MOVED THE PICTURE and this number with it. Round 2's sheet was 6.00 m wide and COVERED a
// 1920-wide frame, so it carried 325 px of glass to the metre and 2.9 px was 0.0098 m of plate. The
// picture is now 5.00 m wide and HELD INSIDE the frame — about 950 px of glass, which is 190 px to
// the metre — so the same 2.9 px of glass is 0.0153 m. It is what the strike sheet and the weather
// are struck at, and what the understudy landscape is struck at when there is no traced file; the
// traced plate has its own nib, measured the same way, in tools/trace-plate.mjs (4.83 sheet px).
const PEN_PLATE = 0.0153;
const PPM_SKY = 200; // the weather sheet: a bank of cloud is broad tone and needs no more
const PPM_STRIKE = 180; // …and the one drawing that blanks the country needs less again
const MIN_TAP = 44; // px: what a thumb needs, whatever the cross measures on the glass

// ---- THE CROSS, on the frieze over the door -------------------------------------------------------
// The frieze is the band between the picture rail and the cornice (room.js BAND: 2.64 to 2.98) and
// it is bare all the way round the room — the drawings' one big rest. One small cross is what a
// rented room over a post office puts in it, and it goes over the DOOR rather than over him, which
// keeps the rest where the rest matters. 0.13 by 0.20 m: 22 by 35 px at the home plate, which is a
// cross and not a crucifix. It stands 22 mm off the plaster, on its nail.
const CROSS = { w: 0.15, h: 0.23, cy: 2.805, off: 0.022 };

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

// ---- egg-rain.js's own numbers for the window, for the same reason ---------------------------------
const WIN = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.21 };
const J = { f: 0.05, s: 0.042, rt: 0.05, rb: 0.075, bar: 0.013, barAt: 0.34, meet: 0.004, zf0: 0.03, zf1: 0.08, leafIn: 0.008 };
const FLASH_OFF = 0.0125; // 2 mm outside the rain, and still under every stile and glazing bar

// ---- the storm, in drawings ------------------------------------------------------------------------
// Counted in DRAWINGS and converted at the room's own fps, because everything hand-animated in this
// film is a count of drawings on the twelve. Four strikes over the first six seconds, at beats that
// do not divide into each other; the door coming off the jamb at two thirds of a second; six poses
// of swing on twos, which is one second of door.
const F = {
  strike: [0, 15, 34, 65], //  0.00 · 1.25 · 2.83 · 5.42 s
  thunderAt: [5, 20, 39, 72], // the sound after the light, by a third to two thirds of a second
  near: [1, 0.35, 0.85, 1], // …and how close each one is: two overhead, one across the valley
  swingAt: 8, // the leaf comes off the jamb
  hold: 2, // a pose of the swing is held two drawings: the film's own twos
};
// The swing: over quickly, past itself, and back onto the stop. entrance-door.js's own shape, in
// six poses instead of eight, because this leaf has one second and that one had the whole first
// shot of the film.
//
// IT STOPS PAST THE PERPENDICULAR, at a hundred degrees, and that is the picture's number rather
// than the door's. This leaf hangs on the RIGHT jamb and the lens stands two metres to its left, so
// every degree short of ninety is a strip of the crossroads still covered — at seventy-four, which
// is where the swing first came to rest, the leaf hid the whole dark castle. Past ninety it leans
// back towards the wall, the doorway is clear, and the leaf opens out into a plane the eye can read
// as a door instead of the sliver an edge-on one becomes. A door pushed all the way back against
// the wall it opens onto is also simply what a door does.
const SWING = [10, 32, 62, 88, 104, 100].map((d) => (d * Math.PI) / 180);
// …and shutting it is NOT that list read backwards. Backwards, the first drawing of the close is
// the overrun — the leaf goes 100° to 104° before it starts coming back, which is a door pulling
// itself further open on its way to shutting. A close has its own five poses and no overrun: it
// comes off the wall, swings, and meets the stop.
const CLOSE = [94, 72, 46, 22, 6].map((d) => (d * Math.PI) / 180);
const OPEN_F = F.swingAt + SWING.length * F.hold; // 20 drawings: 1.67 s
const SHUT_F = CLOSE.length * F.hold; // and ten drawings to shut it again
const CHOICE_F = 720; // sixty seconds, and then the offer is withdrawn
const CLEAR_F = 36; // the light path: three seconds of the storm lifting, still looking out
const LIFT_AT = [0, 12, 24]; // …in three drawings of cloud: the bank, broken, a wisp, gone
const OUT_CUT = 2; // drawings after the leaf comes to rest before the camera leaves for the door
const DARK_F = 2; // the dark path: the strike, and then the walk back
// ---- THE WALK OUT, WHICH IS ROUND 3 AND IS THE USER'S OWN CORRECTION ------------------------------
// He looked at round 2's hard cut: "naw it still doesnt work - rather than a hard cut it should be a
// consistent camera pan towards the outside". So the room does not cut through the door any more; it
// WALKS. When the leaf has come to rest the camera leaves the home plate, crosses the parlour,
// comes onto the doorway's own centre line, goes out through the opening past the architrave and
// stops at the eye of the crossroads shot — and the weather standing in the opening becomes the
// country as it passes through. Two and a half seconds, thirty drawings, on the twelve like
// everything else: camera.move (round 3's dolly) is a new position every drawing.
//
// THE WAYPOINT is what makes it a walk and not a diagonal drift. Home stands on the room's axis of
// symmetry at x 0 and the doorway is at 1.5, so a straight chord crosses the parlour at an angle and
// meets the wall obliquely; through the waypoint the camera goes forward, comes onto the door's
// centre line while it is still well inside the room, and takes the last three metres square to the
// opening — which is the only way this film moves a camera (BRIEF: lateral tracks, straight pushes,
// square to the back wall). The lens never turns: `home` and `crossroads` both look straight down
// −z, so the door slides to the middle of the frame and grows, and the verticals stay vertical.
// z 0.75 is a hand's breadth downstage of the table's rim (0.62) and x 1.5 is a metre clear of the
// bookcases at 1.02, so nothing in the set is walked through.
const OUT_S = 2.5; // the walk out
const BACK_S = 1.5; // …and the shorter way home
const VIA_OUT = [PLATE.eye[0], 1.53, 0.75];
const SHUT_AT = 3; // drawings into the way back before the leaf starts to shut: the lens is clear
// how near the sheet of weather the lens has to be, in metres, for the opening to flash through as
// bare paper on its way past — measured in front of the sheet; see THE THRESHOLD FLASHES THROUGH
const THROUGH = 1.2;
const SWAY = { amp: (4.2 * Math.PI) / 180, period: 1.55, tau: 3.4 }; // the pendant, damped over ten seconds
const FAR = [360, 1080]; // the standing storm: a strike every 30 to 90 seconds

// ---- the light. Two states, injected into lighting.js's own table (it publishes `states`). ---------
// `cross-storm` is between egg-rain's `rain` and `evening`, and it is still the afternoon: no lamp,
// no solid panes. `cross-flash` is the same room for ONE drawing with the sky in it.
const STORM_LIGHT = {
  key: 0.85,
  keyColor: '#dfe6f2',
  fill: { sky: '#ffffff', ground: '#544f45', intensity: 0.42 },
  bounce: 0.1,
  floorBounce: 0.08,
  corners: -1.12,
  pools: -0.2, // the rain state's own −0.18 and a whisker: the rug is not this egg's to darken
  pendant: 0,
  table: 0,
  floor: 0,
  catLamp: 1.4,
  night: false, // or the panes go solid and there is nothing for the rain or the flash to be behind
  ink: { tone: [0.01, 0.5, 1.0, 0.36], levels: [0.4, 0.66, 0.86, 0.4] },
};
const FLASH_LIGHT = {
  ...STORM_LIGHT,
  key: 3.9,
  keyColor: '#eef4ff',
  fill: { sky: '#ffffff', ground: '#4c4740', intensity: 0.52 },
  corners: -0.5,
  pools: -0.1,
  ink: { tone: [0.06, 0.8, 1.12, 0.1], levels: [0.66, 0.9, 1.02, 0.06] },
};

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

  // ---- 1. the cross ---------------------------------------------------------------------------------
  const crossMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CROSS.w, CROSS.h),
    sheet(drawCross({ w: CROSS.w, h: CROSS.h, ppm: PPM_CROSS, penM: PEN_M }), 'cross-sheet'),
  );
  crossMesh.name = 'cross-wall';
  crossMesh.castShadow = crossMesh.receiveShadow = false;
  crossMesh.position.set((d.x0 + d.x1) / 2, CROSS.cy, zb + CROSS.off);
  root.add(crossMesh);

  // ---- 2. WHAT IS THROUGH THE DOOR: WEATHER, AND NOTHING ELSE -------------------------------------
  // Round 1 hung the crossroads here and the user threw it out: "naw, this looks terrible - this
  // doesn't work." A landscape restaged inside a slot two and a half times taller than it is wide
  // is a stripe. So the opening carries three sheets and no picture — the outside gone over in the
  // rain, the rain itself, and one drawing of bare paper for a strike — and the crossroads is a
  // plate in the open air that the room CUTS to two drawings after the leaf comes to rest.
  //
  // The outside sheet is also load-bearing and not only tone: room.js merges the real door leaf
  // into the same buffer as the skirting, so when the drawn leaf swings away something opaque has
  // to be standing in the opening or the visitor is looking at a shut door through an open one.
  const weather = new THREE.Group();
  weather.name = 'cross-weather';
  weather.userData.noShadow = true;
  weather.visible = false;
  root.add(weather);
  const outMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    sheet(drawOutside({ w: PW, h: PH, ppm: PPM_OUT, penM: PEN_M }), 'cross-outside'),
  );
  outMesh.name = 'cross-outside';
  outMesh.castShadow = outMesh.receiveShadow = false;
  outMesh.position.set((ox0 + ox1) / 2, (oy0 + oy1) / 2, PLATE_Z);
  weather.add(outMesh);
  // the rain: egg-rain's drawing, four throws in one atlas, re-struck on every 12 fps drawing
  const RAIN_COLS = 4;
  const rainGeo = new THREE.PlaneGeometry(PW - 0.004, PH - 0.004);
  const rainMesh = new THREE.Mesh(rainGeo, sheet(drawRain({ w: PW, h: PH, ppm: PPM_OUT, penM: PEN_M, cols: RAIN_COLS }), 'cross-doorrain'));
  rainMesh.name = 'cross-doorrain';
  rainMesh.castShadow = rainMesh.receiveShadow = false;
  rainMesh.position.set((ox0 + ox1) / 2, (oy0 + oy1) / 2, PLATE_Z + 0.0015);
  weather.add(rainMesh);
  // …and the flash: bare paper, cut to the same opening, on for ONE drawing with the rain off it
  const doorFlash = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), (() => {
    const m = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, metalness: 0 });
    m.userData.ink = { hatch: 0, lineWeight: 0, colorful: true };
    m.name = 'cross-doorflash';
    return m;
  })());
  doorFlash.name = 'cross-doorflash';
  doorFlash.castShadow = doorFlash.receiveShadow = false;
  doorFlash.position.set((ox0 + ox1) / 2, (oy0 + oy1) / 2, PLATE_Z + 0.0028);
  doorFlash.visible = false;
  weather.add(doorFlash);
  const atlas = (geo, col, cols) => {
    const a = geo.attributes.uv.array;
    const u0 = col / cols, u1 = (col + 1) / cols;
    a[0] = u0; a[1] = 1;
    a[2] = u1; a[3] = 1;
    a[4] = u0; a[5] = 0;
    a[6] = u1; a[7] = 0;
    geo.attributes.uv.needsUpdate = true;
  };
  const rainAt = (frame) => atlas(rainGeo, ((frame % RAIN_COLS) + RAIN_COLS) % RAIN_COLS, RAIN_COLS);
  rainAt(0);

  // ---- 2b. THE CROSSROADS, ON A PLATE IN THE OPEN AIR ---------------------------------------------
  // 6.00 by 5.22 m, standing on the lens axis 6.28 m outside the wall, and it fills the frame at
  // every window shape from a phone held upright to 16:9 (the numbers, and the cover fit that solves
  // the lens for them, are in egg-cross-plate.js; the camera's `crossroads` shot is that solver).
  // THREE SHEETS, and the middle one is the reason there are three:
  //
  //   THE LANDSCAPE, with its sky left as a HOLE, because the weather has to be able to lift off it.
  //   THE WEATHER, standing BEHIND the landscape so the hills and the castles occlude the cloud: a
  //     bank and a bolt in three drawings — whole, broken, a last pair of wisps — which is what the
  //     left-hand road buys, three seconds of the storm clearing while the visitor is still looking
  //     out at the country.
  //   THE STRIKE, standing in FRONT of both: one drawing of bare paper with a great fork of light
  //     down the middle of it, so a strike blanks the picture out here exactly as it whitens the
  //     four panes of the casement in the room behind.
  const plate = new THREE.Group();
  plate.name = 'crossroads';
  plate.userData.noShadow = true;
  plate.visible = false;
  root.add(plate);
  // THE PAPER THE PICTURE STANDS ON (round 3). The lens now holds the whole of the original rather
  // than being covered by it — a square picture cropped to a 16:9 window loses both castles, the sun
  // and the child's feet, which is the whole meme — so whatever the picture does not fill has to be
  // something, and in this film that is paper. One quad, 20 by 24 m, standing a hand behind the
  // picture: bare, no tone, no contour, the same sheet the drawing is printed on, continued.
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(PLATE.ground[0], PLATE.ground[1]), (() => {
    const m = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, metalness: 0 });
    m.userData.ink = { hatch: 0, lineWeight: 0, colorful: true };
    m.name = 'cross-paper';
    return m;
  })());
  groundMesh.name = 'cross-paper';
  groundMesh.castShadow = groundMesh.receiveShadow = false;
  groundMesh.position.set(PLATE.centre[0], PLATE.centre[1], PLATE.centre[2] - 0.06);
  plate.add(groundMesh);
  const landMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PLATE.w, PLATE.h),
    sheet(drawLandscape({ w: PLATE.w, h: PLATE.h, ppm: PLATE.ppm, penM: PEN_PLATE }), 'cross-landscape'),
  );
  landMesh.name = 'cross-landscape';
  landMesh.castShadow = landMesh.receiveShadow = false;
  landMesh.position.set(...PLATE.centre);
  plate.add(landMesh);
  const SKY_COLS = 3;
  // how far down the picture the weather reaches. The trace tool measures the traced original's own
  // skyline and writes it; the drawing's own number stands in if it has never been run.
  const SKY_V = Number.isFinite(TRACE_LAND?.land?.skyV) ? TRACE_LAND.land.skyV : LAND.skyV;
  const skyH = PLATE.h * SKY_V;
  // …AND WHICH SIDE OF THE PICTURE THE WEATHER STANDS ON, which the land file settles before a
  // texture has loaded: `source` is written only by the trace tool, so its presence is the standing
  // answer to "is there a traced original on this sheet". BEHIND a drawn landscape, whose sky is a
  // hole, filled with paper so the alpha test cannot eat its strokes on a phone. IN FRONT of a
  // traced one, which is opaque and has weather of its own, drawn on nothing — a bank of cloud laid
  // over the picture that lifts off it in the same three drawings.
  const OVER = TRACE_LAND?.source != null;
  const skyGeo = new THREE.PlaneGeometry(PLATE.w, skyH);
  const skyMesh = new THREE.Mesh(skyGeo, sheet(drawSky({ w: PLATE.w, h: skyH, ppm: PPM_SKY, penM: PEN_PLATE, cols: SKY_COLS, solid: !OVER, skyV: SKY_V }), 'cross-sky'));
  skyMesh.name = 'cross-sky';
  skyMesh.castShadow = skyMesh.receiveShadow = false;
  skyMesh.position.set(PLATE.centre[0], PLATE.centre[1] + PLATE.h / 2 - skyH / 2, PLATE.centre[2] + (OVER ? 0.02 : -0.02));
  // …AND OVER A TRACED ORIGINAL IT IS NOT HUNG AT ALL, which is the round's one deliberate loss and
  // it is worth naming. Behind the drawn landscape this bank was the left road's whole payoff: the
  // storm visibly breaking up over the country while the visitor was still standing out in it. A
  // traced picture is opaque and has weather of its own, so the bank can only go IN FRONT — and in
  // front it is OUR cloud drawn over HIS picture, which is the exact thing he threw round 2 out for
  // ("the meme doesnt work if you redraw it"). Tried and looked at: unfilled it alpha-tests down to
  // a stipple against the hatch already there, and filled it lays a paper slab over the best corner
  // of the meme. So the three seconds after the left road are the room's own clearing — the light
  // handed back, the rain stopped, the pendant coming down — watched from out here, and the picture
  // is left alone. The sheet is still BUILT and still stepped, so `sky` reports what it always did
  // and nothing downstream changes; it simply is not in the scene.
  if (!OVER) plate.add(skyMesh);
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
        landMesh.material.map = t;
        landMesh.material.needsUpdate = true;
        traced = true;
      })
      .catch((e) => console.warn('[cross] no traced plate; the drawing stands in:', e?.message ?? e));
  } catch (e) {
    console.warn('[cross] no traced plate; the drawing stands in:', e?.message ?? e);
  }
  const strikeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PLATE.w, PLATE.h),
    sheet(drawStrike({ w: PLATE.w, h: PLATE.h, ppm: PPM_STRIKE, penM: PEN_PLATE }), 'cross-strike'),
  );
  strikeMesh.name = 'cross-strike';
  strikeMesh.castShadow = strikeMesh.receiveShadow = false;
  strikeMesh.position.set(PLATE.centre[0], PLATE.centre[1], PLATE.centre[2] + 0.03);
  strikeMesh.visible = false;
  plate.add(strikeMesh);
  let skyCol = 0;
  function skyAt(col) {
    skyCol = col;
    skyMesh.visible = col >= 0;
    if (col >= 0) atlas(skyGeo, Math.min(col, SKY_COLS - 1), SKY_COLS);
  }
  skyAt(0);

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

  // ---- 4. the flash: one sheet of bare paper cut to each pane -------------------------------------
  // egg-rain.js's arithmetic for the casement, and its rule: a sheet is cut to ONE PANE, so the
  // drawing is bounded by the glass itself and there is no frame, no camera and no aspect at which
  // it can land on a shutter or on the architrave.
  const flash = new THREE.Group();
  flash.name = 'cross-flash';
  flash.visible = false;
  flash.userData.noShadow = true;
  root.add(flash);
  {
    const w = { ...WIN, ...(ctx.pieces.room?.window ?? WIN) };
    if (!Number.isFinite(w.depth)) w.depth = WIN.depth;
    const wzr = zb - w.depth;
    const zl1 = wzr + J.zf1 - J.leafIn;
    const gz = (wzr + J.zf0 + J.leafIn + zl1) / 2;
    const xm = (w.x0 + w.x1) / 2;
    const yt = w.y1 - J.f - (w.y1 - w.y0 - 2 * J.f) * J.barAt;
    const FY0 = w.y0 + J.f + J.rb, FY1 = w.y1 - J.f - J.rt;
    const leaves = [[w.x0 + J.f, xm - J.meet], [xm + J.meet, w.x1 - J.f]].map(([a, b]) => [a + J.s, b - J.s]);
    const lights = [[yt + J.bar, FY1], [FY0, yt - J.bar]];
    const pane = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, metalness: 0 });
    // hatch 0 and colorful: the pass shows this sheet exactly as painted, which is bare paper. That
    // is the whole of the lightning — the tone of the room does the rest.
    pane.userData.ink = { hatch: 0, lineWeight: 0, colorful: true };
    pane.name = 'cross-pane';
    for (const [lx0, lx1] of leaves)
      for (const [ly0, ly1] of lights) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(lx1 - lx0 - 0.004, ly1 - ly0 - 0.004), pane);
        m.castShadow = m.receiveShadow = false;
        m.position.set((lx0 + lx1) / 2, (ly0 + ly1) / 2, gz + FLASH_OFF);
        flash.add(m);
      }
  }

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

  // ---- the light -------------------------------------------------------------------------------------
  let was = null; // the lighting state the room was in before the weather came in
  let litAs = null; // …and which of ours is on it now
  function lights(name) {
    const L = ctx.pieces.lighting;
    if (!L?.states) return;
    if (!L.states['cross-storm']) L.states['cross-storm'] = STORM_LIGHT;
    if (!L.states['cross-flash']) L.states['cross-flash'] = FLASH_LIGHT;
    if (name) {
      if (was == null) was = L.state ?? 'default';
      if (litAs !== name) L.setState((litAs = name));
    } else {
      // never stormed: leave the lighting exactly as whoever set it left it. This piece only ever
      // puts back what it took — and what it took, in a storm, is egg-rain's own `rain`.
      litAs = null;
      if (was == null) return;
      L.setState(was);
      was = null;
    }
  }

  // ---- the thunder -----------------------------------------------------------------------------------
  // egg-rain.js's arrangement: the sound piece publishes its context but not its master, so the cue
  // hangs on the destination through a fader of this piece's own, and that fader follows the
  // visitor's mute key. A muted room still gets its thunder, held at zero, so unmuting mid-storm
  // does not bring back everything except the weather.
  let fader = null;
  function bus() {
    const S = ctx.pieces.sound;
    const ac = S?.context ?? null;
    if (!ac) return null;
    if (!fader) {
      try {
        fader = ac.createGain();
        fader.gain.value = S?.muted ? 0 : 1;
        fader.connect(ac.destination);
      } catch (e) {
        console.warn('[cross] the storm is silent:', e?.message ?? e);
        return null;
      }
    }
    return { ac, dest: fader };
  }
  function roll(near, seed) {
    const b = bus();
    if (!b) return;
    try {
      thunder(b.ac, b.dest, b.ac.currentTime + 0.02, { near, seed });
    } catch (e) {
      console.warn('[cross] no thunder:', e?.message ?? e);
    }
  }
  function mindTheMute() {
    if (!fader) return;
    const want = ctx.pieces.sound?.muted ? 0 : 1;
    if (fader.gain.value !== want) fader.gain.value = want;
  }

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
  const hitBox = () => boxOf(crossMesh, CROSS.w / 2, CROSS.h / 2);
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w2 = Math.max(b.w, MIN_TAP), h2 = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w2 / 2, y: b.y + b.h / 2 - h2 / 2, w: w2, h: h2, grown: w2 > b.w || h2 > b.h };
  }
  // THE TWO ROADS, AND WHAT THE VISITOR POINTS AT IS THE GROUND. Each is half the picture from the
  // horizon down to the foot of the frame: the sky is not a road, and a tap on a cloud is not a
  // choice. The split is the plate's own centre line, which projects to the middle of the frame
  // because the camera stands on that line — so the left road's ground is the left half of the
  // glass and the right road's is the right half, and the two can never overlap however generous
  // they are. On a 390-wide phone that is 195 by about 470 px each, which is not a target, it is a
  // side of the screen. They are asked directly (`hit`), the way the globe is, because the thing
  // being pointed at is half of a drawing and not an object.
  function pathBox(which) {
    if (!plate.visible) return null;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const G = geography();
    landMesh.updateMatrixWorld(true);
    // THE SPLIT IS THE FORK'S OWN COLUMN, and not the middle of the sheet. In the drawing the two
    // were the same number and the split could be the plate's centre line; a traced photograph puts
    // its fork wherever the photograph puts it, and the tool measures that (egg-cross-land.js).
    // The boxes are still the two halves of the GLASS either side of it, so they are as generous as
    // a side of the screen and cannot overlap however wide the window is.
    v.set((G.fork - 0.5) * PLATE.w, 0, 0);
    landMesh.localToWorld(v).project(ctx.camera);
    if (v.z > 1) return null; // the plate is behind the lens: there is no road on this glass
    const mid = ((v.x + 1) / 2) * W;
    v.set(0, (0.5 - G.hz) * PLATE.h, 0);
    landMesh.localToWorld(v).project(ctx.camera);
    const top = Math.max(0, Math.min(H - MIN_TAP, ((1 - v.y) / 2) * H));
    const x0 = which === 'left' ? 0 : Math.max(0, Math.min(W, mid));
    const x1 = which === 'left' ? Math.max(0, Math.min(W, mid)) : W;
    return { x: x0, y: top, w: Math.max(MIN_TAP, x1 - x0), h: Math.max(MIN_TAP, H - top) };
  }
  const inBox = (b, px, py) => !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;

  // ---- the weather ------------------------------------------------------------------------------------
  // THE STORM IS COUNTED IN DRAWINGS THIS PIECE HAS BEEN GIVEN, and not in seconds off the clock,
  // which is a decision with two reasons and they pull the same way. The film's own: everything
  // hand-animated in this room is a count of drawings on the twelve, and a beat measured in wall
  // seconds would be the only thing here running on a different clock from the paper (egg-fine.js
  // says the same at greater length). And the machine's: `clock.frame` follows REAL time, so a
  // browser drawing this room in software at one frame a second advances it twelve at a time — and
  // a strike that is due on drawing 15 would simply never be on the drawing anybody rendered. A
  // counter that goes up by one every time this piece is asked to draw cannot skip a strike, and it
  // is also what lets a proof release the storm one drawing at a time.
  const rng = mulberry32(20260910);
  let phase = 'shut';
  let path = null;
  let drawn = 0; // drawings this piece has been given, ever
  let from = 0; // …and the one this phase began on
  // The strikes are counted from the CLICK and not from the phase, because the door comes open in
  // the middle of them: the second strike lands on the swing and the third and fourth after it, and
  // a schedule restarted at each phase would have fired the first one three times over.
  let stormFrom = 0;
  let fired = -1; // the last strike index whose cue has gone
  let flashF = -Infinity; // the drawing the panes went white on (the standing storm)
  let swayFrom = -1e9; // the drawing the pendant was set going on
  let swayTo = 1; // …and what its amplitude is scaled by (the clearing takes it to nothing)
  let nextFar = 0; // the standing storm: the drawing the next strike is due on
  let byHand = false; // put here by set(), which must HOLD: see egg-fine.js's own latch
  const FPS = () => ctx.clock?.fps || 12;
  const frame = () => drawn - from;

  function emit() {
    ctx.emit?.('props:cross', { phase, path });
  }
  function go(next, { keepPath = true } = {}) {
    if (!keepPath) path = null;
    phase = next;
    from = drawn;
    emit();
  }
  function showLeaf(theta) {
    hinge.visible = theta != null;
    if (theta != null) hinge.rotation.y = theta;
  }
  // the pendant: a swing on the 12 fps clock, damped. Not a tween — it is evaluated at the stepped
  // time, so it holds on a frozen frame like everything else in the room.
  function swing() {
    if (!sway) return;
    const s = (drawn - swayFrom) / FPS();
    if (s < 0 || s > 14) {
      sway.rotation.z = 0;
      return;
    }
    sway.rotation.z = SWAY.amp * swayTo * Math.exp(-s / SWAY.tau) * Math.cos((2 * Math.PI * s) / SWAY.period);
  }

  // the weather, handed over by props.js rather than fetched off ctx.pieces: `?cross=dark` is
  // answered while props is still building, and ctx.pieces.props does not exist until it has
  // finished — which is how the first storm came out with a dry window.
  const rain = () => RAIN ?? ctx.pieces.props?.rain ?? null;

  // ---- THE EXCURSION: THE ROOM WALKS OUT THROUGH ITS OWN DOOR ---------------------------------
  // Round 2 CUT here, and the user threw the cut out. What happens now is one continuous move each
  // way, and everything below exists to keep the drawing straight while it is running.
  //
  // The camera is built AFTER props, so it is never cached: it is asked for by name each time, and
  // a room with no camera piece simply never leaves and keeps the door in the frame.
  const atPlate = () => ctx.pieces.camera?.current === 'crossroads';
  // WHETHER THE ROOM IS OUT is this piece's own fact and no longer the camera's, because for two and
  // a half seconds each way the answer is "on its way". `outside` is raised on the drawing the walk
  // out leaves and lowered on the drawing the walk home arrives, so the plate is standing in the
  // open air for the whole of both — which is what makes the passage through the opening work: the
  // weather sheet in the doorway is opaque and hides the plate until the lens is past it, and the
  // merged leaf behind it hides it again on the way in.
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
  // The camera is built AFTER props, so a `?cross=out` answered during the build has nobody to ask.
  // It is parked and played on the first drawing there is a camera to play it with.
  let pending = null;
  // …and the excursion is HELD, which is a thing the conversation made necessary. The talk loop
  // re-asserts its frame at the top of every turn (flow.js: `if (C?.current !== frame) cut(frame)`),
  // so an unheld camera was pulled back into the parlour a second and a half later, for one drawing
  // — a flash-frame of the room in the middle of the picture. With a MOVE instead of a cut it would
  // be worse: the walk would simply be cancelled halfway across the room. So the hold goes on BEFORE
  // the first drawing of the walk out (`{jump: false}`, or taking it would be the cut we are trying
  // not to make), it MOVES to `home` for the walk back — the hold has to protect the way home too,
  // and a hold on the shot we are leaving would block the leaving — and it is given up on the
  // drawing the camera comes to rest. It covers the whole excursion, both ways and the picture
  // between them.
  const camera = () => ctx.pieces.camera ?? null;
  // …and the walk itself, either way. `set()` asks for it with `at: true`, which is a still and
  // jumps: a judging state is a frame somebody is looking at, not a move somebody is watching.
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
    // the doorway — it crosses the threshold at cruise and brakes in the open air beyond it
    C.move('home', 'crossroads', OUT_S, { via: [VIA_OUT], ease: [0.26, 0.2] });
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
    // the hold is carried over to the shot being walked back to, and only then is the move asked
    // for: `home` is now the one frame nobody else may cut away from, which is where we are going.
    C.hold('home', { jump: false });
    C.move(null, 'home', BACK_S, { via: [VIA_OUT] }).then(() => {
      outside = false;
      syncPlate();
      C.release?.('home');
    });
    return true;
  }
  // is the room out there and standing still — which is what the roads may be pointed at
  const arrived = () => outside && atPlate() && !camera()?.moving;

  function start() {
    if (phase !== 'shut') return false;
    byHand = false;
    swayFrom = drawn;
    stormFrom = drawn;
    fired = -1;
    swayTo = 1;
    go('storm');
    rain()?.toggle?.(true); // the weather is egg-rain's; this file does not draw a drop
    return true;
  }

  function choose(which) {
    if (phase !== 'open' || (which !== 'light' && which !== 'dark')) return false;
    path = which;
    byHand = false;
    go('closing');
    if (which === 'light') {
      // the storm clears: the light comes back a shade at once (this piece puts back what it took,
      // which is egg-rain's own state), the rain thins out over its own second, and the door shuts
      lights(null);
      rain()?.toggle?.(false);
      swayTo = 0.35; // …and the pendant is taken the rest of the way down over the three seconds
    }
    return true;
  }

  function clear(keep) {
    showLeaf(null);
    weather.visible = false;
    doorFlash.visible = false;
    rainMesh.visible = true;
    strikeMesh.visible = false;
    skyAt(0);
    flash.visible = false;
    flashF = -Infinity;
    if (!keep) {
      lights(null);
      rain()?.set?.(false);
      if (sway) sway.rotation.z = 0;
      swayFrom = -1e9;
    }
  }

  // ---- the switches -----------------------------------------------------------------------------------
  // The cross answers only when the room is quiet: while the storm is on, or standing, it is a cross
  // on a wall again. The two roads answer only while the room is standing out at the crossroads.
  switches?.add?.({
    name: 'cross',
    object: () => crossMesh,
    tapBox,
    enabled: () => phase === 'shut',
    onDown: () => start(),
  });
  for (const which of ['left', 'right']) {
    switches?.add?.({
      name: `cross-${which}`,
      object: () => landMesh,
      tapBox: () => pathBox(which),
      // …and only once the walk is OVER. While the camera is crossing the parlour the two roads are
      // not a choice, they are scenery going past: the fork is not on the glass where pathBox says
      // it is until the picture has arrived.
      hit: (px, py) => phase === 'open' && arrived() && inBox(pathBox(which), px, py),
      enabled: () => phase === 'open' && arrived(),
      onDown: () => choose(which === 'left' ? 'light' : 'dark'),
    });
  }

  const api = {
    get phase() {
      return phase;
    },
    get path() {
      return path;
    },
    // the drawing this phase is on, and the drawing the whole storm is on: what a tool counts with
    // instead of counting wall seconds
    get frame() {
      return phase === 'shut' ? 0 : frame();
    },
    get stormFrame() {
      return phase === 'shut' ? 0 : drawn - stormFrom;
    },
    get drawn() {
      return drawn;
    },
    get flashing() {
      return flash.visible;
    },
    // the standing storm's next strike, as a drawing of this phase: null unless the dark path was
    // taken. A tool that wants to see one should not have to release a thousand drawings one at a
    // time hoping to catch a flash that lasts for one of them.
    get nextStrike() {
      return phase === 'dark' ? nextFar : null;
    },
    // where the picture is standing, and which sheets of it are up: what a proof reports instead of
    // taking somebody's word for it
    get out() {
      return plate.visible;
    },
    get sky() {
      return skyMesh.visible ? skyCol : -1;
    },
    get striking() {
      return strikeMesh.visible;
    },
    plate: { w: PLATE.w, h: PLATE.h, at: [...PLATE.centre], eye: [...PLATE.eye], ppm: PLATE.ppm, safe: { ...PLATE.safe }, pen: PEN_PLATE, margin: PLATE.margin, bleed: PLATE.bleed, ground: [...PLATE.ground] },
    // the two colours the picture is allowed, for a proof that wants to name what it is looking at
    colours: { sun: '#f2b829', ink: INK, paper: PAPER },
    schedule: { strike: F.strike, thunder: F.thunderAt, swingAt: F.swingAt, open: OPEN_F, shut: SHUT_F, choice: CHOICE_F, clear: CLEAR_F, far: FAR, cut: OUT_CUT, dark: DARK_F, lift: LIFT_AT, out: OUT_S, back: BACK_S, shutAt: SHUT_AT, via: [...VIA_OUT] },
    // THE WALK, for a tool that has to know whether the picture has arrived or is still coming. It
    // is the camera piece's own answer, passed through: this file asks for the move and does not
    // own it.
    get walking() {
      return camera()?.moving ?? null;
    },
    get arrived() {
      return arrived();
    },
    swing: SWING.map((r) => +((r * 180) / Math.PI).toFixed(1)),
    close: CLOSE.map((r) => +((r * 180) / Math.PI).toFixed(1)),
    click: () => start(),
    choose,
    hitBox,
    tapBox,
    pathBox,
    // the doorway on the glass, for the proof's 2x crop of the weather in it
    doorBox: () => boxOf(outMesh, PW / 2, PH / 2),
    // …and the plate on the glass, which at the crossroads shot is bigger than the glass
    plateBox: () => boxOf(landMesh, PLATE.w / 2, PLATE.h / 2),
    // where a point of the drawing lands on the glass, in px: what the proof crops the child and
    // the signpost out of, without either of us guessing where they are
    at(u, v) {
      if (!plate.visible) return null;
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      landMesh.updateMatrixWorld(true);
      v0.set((u - 0.5) * PLATE.w, (0.5 - v) * PLATE.h, 0);
      landMesh.localToWorld(v0).project(ctx.camera);
      return { x: ((v0.x + 1) / 2) * W, y: ((1 - v0.y) / 2) * H };
    },
    // the picture's own geography, so a tool can ask for the child rather than for a rectangle —
    // the traced original's once it is on the sheet, the drawing's until then
    get land() {
      return geography();
    },
    // …and WHICH of the two is on it, so a proof can label its own crops honestly
    get traced() {
      return traced ? { file: TRACED, source: TRACE_LAND.source, when: TRACE_LAND.when } : null;
    },
    get leaf() {
      return { shown: hinge.visible, degrees: +((hinge.rotation.y * 180) / Math.PI).toFixed(1) };
    },
    get pendant() {
      return sway ? +sway.rotation.z.toFixed(5) : null;
    },
    get audible() {
      return { fader: !!fader, muted: !!ctx.pieces.sound?.muted, gain: fader ? fader.gain.value : 0 };
    },
    // for the tools and for setState: a phase at once, with no cue and nothing to wait for. The
    // clock is BACK-DATED rather than skipped, egg-rain's way: put the start of the phase far
    // enough in the past that the next stepped frame agrees it is already there.
    set(next = 'shut') {
      byHand = next !== 'shut';
      pending = null;
      const R = rain();
      if (next === 'shut') {
        phase = 'shut';
        path = null;
        clear(false);
        goHome({ at: true });
        return;
      }
      R?.set?.(true);
      if (next === 'storm' || next === 'open' || next === 'out') {
        phase = 'open';
        from = drawn - OPEN_F;
        stormFrom = from;
        showLeaf(SWING[SWING.length - 1]);
        weather.visible = true;
        skyAt(0);
        swayFrom = drawn - 4; // a third of a second in: the pendant caught at the top of its throw
        swayTo = 1;
        if (next === 'out') {
          // `cross-out` is the room standing OUT at the crossroads with the storm on it — and NOT
          // on a strike, because a strike blanks the country to bare paper and the whole of what
          // this state exists for is the picture. A STILL, so it jumps: the walk is a thing to be
          // watched, and a judge is looking at one frame.
          goOut({ at: true });
          flash.visible = false;
          doorFlash.visible = false;
          rainMesh.visible = true;
          strikeMesh.visible = false;
          lights('cross-storm');
        } else {
          // `cross-storm` is the door open on the WEATHER, seen from the room. Round 1 made this
          // still a strike, with the panes and the opening white; that was the right still when the
          // doorway held a picture and there was nothing else to see in it. Now the doorway IS the
          // weather, and a state that whites it out shows nothing of the thing it is named for. The
          // strike is proved where it belongs — driven, one drawing at a time, in the proof.
          goHome({ at: true });
          flash.visible = false;
          doorFlash.visible = false;
          rainMesh.visible = true;
          strikeMesh.visible = false;
          lights('cross-storm');
        }
        swing();
      } else if (next === 'dark') {
        phase = 'dark';
        path = 'dark';
        from = drawn;
        showLeaf(null);
        weather.visible = false;
        flash.visible = false;
        strikeMesh.visible = false;
        skyAt(0);
        goHome({ at: true });
        lights('cross-storm');
        if (sway) sway.rotation.z = 0;
        swayFrom = -1e9;
        nextFar = FAR[0];
      }
    },
    // `cross-storm` is the door open on the weather, from the room; `cross-out` is the crossroads
    // itself, the room having cut through the door; `cross-dark` is the standing storm with the
    // door shut on it. Every other name is a room nobody has touched the cross in.
    setState(name = 'default') {
      api.set(name === 'cross-storm' ? 'open' : name === 'cross-out' ? 'out' : name === 'cross-dark' ? 'dark' : 'shut');
    },
    // the thunder rendered through an OfflineAudioContext by the very code the page runs — what the
    // proof measures its peak from (sound.js's `render` walks a list of named cues and this is not
    // on it, for the reason at the head of egg-cross-sound.js)
    async render(seconds = THUNDER.length + 0.5, sampleRate = 22050) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OC) return null;
      const oc = new OC(2, Math.max(64, Math.ceil(seconds * sampleRate)), sampleRate);
      const g = oc.createGain();
      g.gain.value = 1;
      g.connect(oc.destination);
      thunder(oc, g, 0, { near: 1, seed: 7 });
      const buf = await oc.startRendering();
      return { sampleRate: buf.sampleRate, l: Array.from(buf.getChannelData(0)), level: THUNDER.level, length: THUNDER.length };
    },

    // Called from props.update, which only calls anything on a stepped frame — so the strikes, the
    // swing, the pendant and the thunder are all on the same 12 fps grid as the boil.
    update(ctx2) {
      mindTheMute();
      if (pending) goOut({ at: pending === 'at' });
      syncPlate();
      if (!ctx2.clock.stepped) return;
      if (phase === 'shut') return;
      if (weather.visible) rainAt(ctx2.clock.frame); // the boil: a new throw of rain every drawing
      if (byHand) {
        // a still holds: without this the very next drawing decides the phase is over and the
        // frame the tool asked for is gone six drawings later (egg-fine.js paid for this lesson)
        swing();
        return;
      }
      const f = frame();
      const sf = drawn - stormFrom; // …and the same count from the click, for the strikes

      // the flash is ONE drawing, and the light cuts with it: the room's tone is up on the same
      // drawing the panes go white, and back on the next. Nothing here fades.
      // …and the schedule stops the moment a path is taken. A visitor who chooses at drawing 30 is
      // three drawings inside the last strike's own beat, and a strike landing during the clearing
      // would re-take the light this piece has just handed back — the room would go dark again on
      // its way to being exactly as it was, which is the one thing the light path promises.
      let wantFlash = false;
      if (phase === 'storm' || phase === 'open') {
        for (let i = 0; i < F.strike.length; i++) {
          if (sf === F.strike[i]) wantFlash = true;
          if (sf === F.thunderAt[i] && fired < i) {
            fired = i;
            roll(F.near[i], 7 + i * 31);
          }
        }
      } else if (phase === 'dark') {
        // the standing storm. A strike every thirty to ninety seconds, and the thunder five
        // drawings behind it, for the rest of the evening. The sound is NOT fired on the flash's
        // own drawing: light travels and sound does not, and this room has already said so four
        // times over in the first six seconds.
        if (f >= nextFar) {
          wantFlash = true;
          flashF = f;
          nextFar = f + Math.round(FAR[0] + rng() * (FAR[1] - FAR[0]));
        } else if (f === flashF + 5) {
          roll(0.3 + rng() * 0.55, 11 + (f % 97));
        }
      } else if (phase === 'closing' && path === 'dark') {
        // THE DARK ROAD IS ANSWERED BY ONE MORE STRIKE, on the drawing the visitor takes it, with
        // the country blown to bare paper — and then the room cuts back through the door on the
        // drawing after. The thunder follows it two drawings later, into a room that has already
        // shut the door on the weather, which is the joke.
        wantFlash = f === 0;
        if (f === DARK_F + 2) roll(1, 53);
      }
      // …and the light path's clearing NEVER re-takes the room's tone: `lights(null)` handed it back
      // on the drawing the road was chosen, and a strike landing during the clearing would darken a
      // room on its way to being exactly as it was, which is the one thing that road promises.
      const holding = !(phase === 'closing' && path !== 'dark');
      if (wantFlash !== flash.visible) {
        flash.visible = wantFlash;
        if (holding) lights(wantFlash ? 'cross-flash' : 'cross-storm');
      } else if (!wantFlash && holding) lights('cross-storm');
      // the two sheets a strike shows, one on each side of the wall: the doorway goes white, and so
      // does the country, if the room happens to be standing out in it
      doorFlash.visible = wantFlash;
      rainMesh.visible = !wantFlash;
      strikeMesh.visible = wantFlash;
      // AND THE THRESHOLD FLASHES THROUGH. The last thing between the lens and the country is the
      // sheet of weather standing in the doorway, and the last half metre of the walk magnifies its
      // drawing four times and then twenty: a rain-stroke the width of the frame, which is a smear
      // and not a drawing. So for the one or two drawings the lens is inside arm's reach of it, the
      // opening is BARE PAPER — the same sheet a strike whitens it with — and the picture is on the
      // far side of it. That is a flash-through and this film has one already; what it is not is a
      // cut, because nothing about the camera changes on that drawing. It works both ways round: the
      // walk home crosses the same half metre and gets the same drawing.
      // (The sheet cannot simply be HIDDEN there: room.js's merged leaf is standing shut a hand's
      // width behind it and would be the thing magnified instead.)
      // …AND THE ZONE IS A DRAWING WIDE ON THE NEAR SIDE, which is a fact about the order main.js
      // builds pieces in. The camera is built AFTER props, so props.update runs first and the
      // position it reads is the one the camera held on the PREVIOUS drawing — and at cruise this
      // walk covers 0.46 m a drawing. The far edge is therefore set half a metre further out than
      // the distance that actually matters, so the flash lands on the drawings that are rendered
      // close to the sheet rather than on the drawings that were.
      if (outside) {
        const cz = ctx.camera?.position?.z ?? 0;
        if (cz < PLATE_Z + THROUGH && cz > PLATE_Z - THROUGH * 0.29) {
          doorFlash.visible = true;
          rainMesh.visible = false;
        }
      }

      // the door, and the cut through it
      if (phase === 'storm') {
        if (f < F.swingAt) showLeaf(null);
        else {
          const i = Math.min(SWING.length - 1, Math.floor((f - F.swingAt) / F.hold));
          weather.visible = true;
          showLeaf(SWING[i]);
        }
        if (f >= OPEN_F) {
          showLeaf(SWING[SWING.length - 1]);
          go('open');
        }
      } else if (phase === 'open') {
        // TWO DRAWINGS AFTER THE LEAF COMES TO REST, THE ROOM LEAVES: the camera crosses the
        // parlour, comes onto the doorway's centre line, goes out through the opening past the
        // architrave, and stops at the eye of the crossroads. Two drawings, and not none, because a
        // move that starts on the drawing the leaf stops on reads as the leaf pushing the lens; two
        // is the sixth of a second a cutter leaves on a stop, and it is a beat of stillness with
        // the door open before anything else happens.
        if (f === OUT_CUT) goOut();
        if (f >= CHOICE_F) {
          // nobody chose. The room cuts back at once, the door shuts on its own and the weather
          // goes with it; `path` stays null, because an offer nobody took is not an answer.
          lights(null);
          rain()?.toggle?.(false);
          swayTo = 0.35;
          go('closing');
        }
      } else if (phase === 'closing') {
        // HOW LONG THE ROOM STAYS OUT THERE, which is the whole difference between the two roads.
        //   the LIGHT road   three seconds, and the visitor watches the storm lift off the country
        //                    in three drawings of cloud (LIFT_AT) before the room cuts back.
        //   the DARK road    two drawings: the strike above, and then the cut.
        //   nobody           none: the offer is withdrawn and the frame goes with it.
        const back = path === 'dark' ? DARK_F : path === 'light' ? CLEAR_F : 0;
        if (path === 'light') {
          const k = LIFT_AT.indexOf(f);
          if (k >= 0) skyAt(k + 1 < SKY_COLS ? k + 1 : -1);
        }
        // …and it is `>=` and not `===`, which is the difference between a room that comes back in
        // and one that is left standing in the rain for the rest of the evening. A road TAKEN is
        // taken by a pointer, outside this function, so the first drawing of the closing is f = 0.
        // A minute running out happens INSIDE it — `go('closing')` is called from the branch above
        // and the counter has already been advanced by the time the next drawing arrives — so that
        // closing's first drawing is f = 1, and an equality test on 0 never fired. `goHome` is
        // idempotent (it asks where the camera is and whether it is already walking), so this simply
        // leaves on the first drawing at or after the mark, whichever way the phase was entered.
        if (f >= back) goHome();
        // AND THE DOOR SHUTS AS THE CAMERA CLEARS IT, three drawings into the way back — a quarter
        // of a second, which at this speed is the lens through the opening and a stride inside it.
        // Sooner and the leaf swings across a lens that is still outside; later and the room arrives
        // at `home` with its own door standing open behind the walk. The five poses are ten drawings
        // and the walk is eighteen, so the leaf is on the stop with a third of the move still to run
        // and the last thing the visitor sees is the parlour, shut, settling into its frame.
        const g2 = f - back - SHUT_AT;
        if (g2 >= 0) {
          const i = Math.floor(g2 / F.hold);
          if (i < CLOSE.length) showLeaf(CLOSE[i]);
          else {
            showLeaf(null);
            weather.visible = false;
          }
        }
        if (g2 >= SHUT_F) {
          if (path === 'dark') {
            clear(true);
            lights('cross-storm');
            phase = 'dark';
            from = drawn;
            nextFar = Math.round(FAR[0] + rng() * (FAR[1] - FAR[0]));
            emit();
          } else {
            clear(false);
            phase = 'shut';
            emit();
          }
        }
      }
      swing();
      // THE COUNTER GOES UP AT THE END, and that is not a detail. `start()` and `set()` are called
      // from a pointer or a tool, OUTSIDE this function, and they date the storm from `drawn` as it
      // stands; `go()` is called from INSIDE it and dates a phase from the drawing being drawn. Both
      // are only true if this drawing has not been counted yet when the work for it is done — with
      // the increment at the top, the first drawing after the click came out as number one and the
      // opening strike was never on any drawing at all.
      drawn++;
    },
  };

  // ?cross=storm | open | dark holds a phase for a still without a judging state
  const want = (ctx.params ?? new URLSearchParams(location.search)).get('cross');
  if (want) api.set(want);
  return api;
}
