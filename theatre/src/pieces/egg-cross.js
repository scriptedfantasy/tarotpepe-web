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
// The door swings open in six drawings and the crossroads is standing in the opening. He says one
// line. Then the visitor chooses a path, and the room keeps the answer.
//
// ------------------------------------------------------------------------------------------------
// THE CHOICE IS NOT IN THE USER'S WORDS. It is this file's addition and it is said so plainly here:
// the user asked for the cross, the storm, the door and the line. What happens after the line was
// left open, and an open door with a picture in it that nothing can be done about is a joke with no
// second half. So the two paths in the doorway are switches. Take the LEFT and the storm clears
// over three seconds and the room is exactly as it was — the same pixels, and there is a proof that
// says so. Take the RIGHT and the thunder stays for the rest of the evening, a strike every thirty
// to ninety seconds, and the door shuts on the picture with the weather still in the room. Either
// way the room keeps it: `path` goes on the wire with every turn from then on (mind.js) and one
// sentence goes into the note the server writes him (server/pepe.mjs, `pathLine`, appended to
// `situation`) — "The visitor chose the dark path at the door…" — and what he does with that is his.
//
// Nothing announces any of it. The cursor over the cross is the whole affordance, and the cursor
// over each half of the picture is the whole of the second one. If sixty seconds pass with nothing
// chosen, the door shuts by itself and the storm clears: an offer nobody took.
// ------------------------------------------------------------------------------------------------
//
// WHY THE DOOR IS A DRAWING AND NOT THE DOOR. room.js builds the back-wall door as real joinery and
// then room-build.js merges every part of the set into one mesh per material. The leaf is inside
// the same buffer as the skirting; there is no object to turn, and giving it one means rebuilding
// the wall in a file another builder is standing in. So the swing is a SHEET — the same leaf,
// drawn (egg-cross-draw.js), standing a hand's width in front of the merged one — and the merged
// leaf is hidden behind the picture, which stands in the same slot.
//
// AND WHY THAT SLOT IS WHERE IT IS, WHICH IS A MEASUREMENT AND NOT A GUESS. The knob stands 90 mm
// off the face of the merged leaf and the key another 5 mm past that, so a plate laid on the leaf's
// own face would have a doorknob floating in the middle of the sky. The picture therefore stands
// 100 mm in front of it, INSIDE the room — and a plate 100 mm proud of a doorway 5 m from the lens
// projects 2% large and 21 mm to the side, which is 7 px of picture printed on the architrave. So
// the plate is not cut to the opening: its four corners are put ON THE RAYS from the home plate's
// own eye through the four corners of the opening, at the plate's own depth. It then registers with
// the doorway to the pixel from `home`, and — because every full-room shot in this film is between
// 5 and 6.3 m from that wall — to better than a pixel from `wide` and from `door` as well. That is
// what a matte plate in a doorway on a real set is: a flat drawing, hung where the camera says.
//
// WHAT THE STORM IS MADE OF, AND ALMOST ALL OF IT IS SOMEBODY ELSE'S:
//   THE RAIN is egg-rain.js, called by its own api. This file does not draw a drop.
//   THE LIGHT is two states injected into lighting.js's own table, `cross-storm` and `cross-flash`.
//     The storm sits between egg-rain's `rain` and `evening` — the key down to 0.85 and cooled, the
//     corners a notch deeper, the ink ramp opened two stops — and it is NOT evening: no lamp comes
//     on and `night` stays false, or lighting.js would draw a cross-hatched sheet over the very
//     glass the rain and the flash are behind. `pools` is held at −0.20 (the rain state's own
//     −0.18, and a whisker) because `pools` is what darkens the ground the table stands on, and
//     that ground is the rug, which the user has said is already right.
//   THE FLASH is one drawing. Four sheets of bare paper, one cut to each pane, snap on for a single
//     12 fps step: the rain on the glass vanishes, the panes go to white, and the whole room's tone
//     goes up a shade on the same drawing because the light cuts to `cross-flash` for that drawing
//     and back. A flash that lasted two drawings would be a lamp.
//   THE THUNDER is egg-cross-sound.js, on a fader of this piece's own hung on the sound context's
//     destination — egg-rain's arrangement, for egg-rain's reason (the sound piece publishes its
//     context and not its master), and the fader follows the visitor's mute key.
//   THE PENDANT is the room's own three-petal lamp, reparented into a pivot at the ceiling rose so
//     that `rotation.z` is a swing. Four degrees, on the 12 fps clock, damped out over ten seconds.
//
// api (published as props.cross):
//   phase        shut · storm (the strikes and the swing) · open (the choice is waiting) ·
//                closing · dark (the storm stays and the door is shut)
//   path         null · 'light' · 'dark' — what the visitor chose, and what the room tells him
//   click()      work the cross as a pointer does: cue, events and all
//   choose(p)    take a path as a click on it does
//   set(phase)   put it there for a still, with no cue and nothing to wait for. 'shut' · 'open'
//                (or 'storm', which is the same still: the door open mid-strike) · 'dark'
//   hitBox()     the cross's box on the glass, in px · tapBox() the box a thumb is given
//   pathBox(s)   'left' | 'right': that half of the picture on the glass
//   setState(n)  `cross-storm` is the door open mid-strike; `cross-dark` the standing storm
//   render(s)    the thunder through an OfflineAudioContext, for the proof
// events:
//   props:cross { phase, path }
import * as THREE from 'three';
import { INK, PAPER, canvasTexture } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { drawCross, drawLeaf, drawCrossroads } from './egg-cross-draw.js';
import { thunder, THUNDER } from './egg-cross-sound.js';

// ---- the pen, and the sheets it is spent on -------------------------------------------------------
// The room's own contour on the back wall is 0.013 m — the width at which the ink pass stops
// throwing a mark away as a stray dark pixel. Every drawing in this egg is struck one notch under
// it, as the weather is (egg-rain.js).
const PEN_M = 0.0118;
const PPM_CROSS = 900; // the cross is 0.23 m tall: it needs the pixels per metre, not the pixels
const PPM_LEAF = 420;
const PPM_PIC = 560;
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
const CLEAR_F = 36; // the light path: three seconds from the choice to the room as it was
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

  // ---- 2. the picture in the opening -----------------------------------------------------------------
  const picMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    sheet(drawCrossroads({ w: PW, h: PH, ppm: PPM_PIC, penM: PEN_M }), 'cross-picture'),
  );
  picMesh.name = 'crossroads';
  picMesh.castShadow = picMesh.receiveShadow = false;
  picMesh.position.set((ox0 + ox1) / 2, (oy0 + oy1) / 2, PLATE_Z);
  picMesh.visible = false;
  root.add(picMesh);

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
  const hitBox = () => boxOf(crossMesh, CROSS.w / 2, CROSS.h / 2);
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w2 = Math.max(b.w, MIN_TAP), h2 = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w2 / 2, y: b.y + b.h / 2 - h2 / 2, w: w2, h: h2, grown: w2 > b.w || h2 > b.h };
  }
  // THE TWO PATHS. Each is its own half of the picture, split down the middle, and each is grown
  // OUTWARD from that split rather than about its own centre — so that on a phone, where the whole
  // doorway is a thumb wide, the two boxes still cannot overlap and a tap can only ever mean one of
  // them. They are asked directly (`hit`), the way the globe is, because the thing being pointed at
  // is half of a drawing and not an object.
  function pathBox(which) {
    const b = boxOf(picMesh, PW / 2, PH / 2);
    if (!b) return null;
    const mid = b.x + b.w / 2;
    const half = Math.max(b.w / 2, MIN_TAP);
    return which === 'left'
      ? { x: mid - half, y: b.y, w: half, h: b.h }
      : { x: mid, y: b.y, w: half, h: b.h };
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
    picMesh.visible = false;
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
  // on a wall again. The two paths answer only while the picture is in the doorway.
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
      object: () => picMesh,
      tapBox: () => pathBox(which),
      hit: (px, py) => phase === 'open' && inBox(pathBox(which), px, py),
      enabled: () => phase === 'open',
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
    // the two colours the doorway is allowed, for a proof that wants to name what it is looking at
    colours: { sun: '#f2b829', ink: INK, paper: PAPER },
    schedule: { strike: F.strike, thunder: F.thunderAt, swingAt: F.swingAt, open: OPEN_F, shut: SHUT_F, choice: CHOICE_F, clear: CLEAR_F, far: FAR },
    swing: SWING.map((r) => +((r * 180) / Math.PI).toFixed(1)),
    close: CLOSE.map((r) => +((r * 180) / Math.PI).toFixed(1)),
    click: () => start(),
    choose,
    hitBox,
    tapBox,
    pathBox,
    // where the picture is on the glass, for the proof's 2x crop
    doorBox: () => boxOf(picMesh, PW / 2, PH / 2),
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
      const R = rain();
      if (next === 'shut') {
        phase = 'shut';
        path = null;
        clear(false);
        return;
      }
      R?.set?.(true);
      if (next === 'storm' || next === 'open') {
        phase = 'open';
        from = drawn - OPEN_F;
        stormFrom = from;
        showLeaf(SWING[SWING.length - 1]);
        picMesh.visible = true;
        // `cross-storm` is the door open MID-STRIKE, so the still gets both: the panes white and
        // the room's tone up for this one drawing.
        flash.visible = true;
        lights('cross-flash');
        swayFrom = drawn - 4; // a third of a second in: the pendant caught at the top of its throw
        swayTo = 1;
        swing();
      } else if (next === 'dark') {
        phase = 'dark';
        path = 'dark';
        from = drawn;
        showLeaf(null);
        picMesh.visible = false;
        flash.visible = false;
        lights('cross-storm');
        if (sway) sway.rotation.z = 0;
        swayFrom = -1e9;
        nextFar = FAR[0];
      }
    },
    // `cross-storm` is the door open on the crossroads mid-strike; `cross-dark` is the standing
    // storm with the door shut on it. Every other name is a room nobody has touched the cross in.
    setState(name = 'default') {
      api.set(name === 'cross-storm' ? 'open' : name === 'cross-dark' ? 'dark' : 'shut');
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
      if (!ctx2.clock.stepped) return;
      if (phase === 'shut') return;
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
      }
      if (wantFlash !== flash.visible) {
        flash.visible = wantFlash;
        lights(wantFlash ? 'cross-flash' : 'cross-storm');
      } else if (!wantFlash && phase !== 'closing') lights('cross-storm');

      // the door
      if (phase === 'storm') {
        if (f < F.swingAt) showLeaf(null);
        else {
          const i = Math.min(SWING.length - 1, Math.floor((f - F.swingAt) / F.hold));
          picMesh.visible = true;
          showLeaf(SWING[i]);
        }
        if (f >= OPEN_F) {
          showLeaf(SWING[SWING.length - 1]);
          go('open');
        }
      } else if (phase === 'open') {
        if (f >= CHOICE_F) {
          // nobody chose. The door shuts on its own and the weather goes with it; `path` stays
          // null, because an offer nobody took is not an answer.
          lights(null);
          rain()?.toggle?.(false);
          swayTo = 0.35;
          go('closing');
        }
      } else if (phase === 'closing') {
        const i = Math.floor(Math.max(0, f - 1) / F.hold);
        if (i < CLOSE.length) showLeaf(CLOSE[i]);
        else {
          showLeaf(null);
          picMesh.visible = false;
        }
        const done = path === 'dark' ? f >= SHUT_F : f >= CLEAR_F;
        if (done) {
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
