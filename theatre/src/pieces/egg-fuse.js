// AN EGG, inside props: THE MAINS LEVER on the fuse box, and what the room does without it.
//
// The user: "The fuse box on the right wall. Pull the lever: the chandelier goes out, the room
// drops to night ink, and the cat lamp is the only light. Pull it again to restore."
//
// The box is already there. room.js's `buildTerminalBox` screwed a japanned cast box to the
// stage-right wall beside the way in — the one black mass on that wall, the fitting that says the
// room was WIRED — and nothing here moves it, lights it differently or draws over it. What this
// file adds is the one thing a box like that has and ours did not: a lever, and a consequence.
//
// HOW IT IS DRAWN. The box is solid ink, so a black lever on it would be a lever nobody can see.
// It gets a paper escutcheon, 3 mm proud of the lid — the box's one bare white area, which is the
// room's own rule for every prop — and the lever is solid ink standing on it. That is the radio's
// needle turned inside out: a silhouette against a plain field, not a line inside a drawing.
// Up is on. Down is out. There is no lettering, no glow and no tag: the cursor over it is the
// whole affordance, and a visitor who never finds it is not being kept from anything.
//
// HOW IT MOVES. One cut on the 12 fps clock. A lever with a spring in it does not travel — it is
// in one place and then it is in the other — so there is no in-between drawing, and the light in
// the room changes on the same frame the handle does. The clack goes out on the CLICK, because
// that is when the hand is on it.
//
// WHAT GOES DARK. The chandelier, and the day. `fuse-out` and `fuse-dark` are two lighting states
// injected into lighting.js's own table (it publishes `states`, so this costs that file nothing):
// the key gone, the pendant doused, the corners deeper and the ink ramp opened a stop further than
// `evening` — so a wall that carried a shower of rain-strokes carries a lattice. THE CONTOUR IS
// NOT TOUCHED. The pen never goes; only the tone does. One practical survives the mains, because
// it is not on the mains: the cat's lamp if the room has grown one, and the lamp on the operator's
// position if it has not. With it lit, it is the only light and the wall behind it is the only
// bare paper left; with it out, the room is dark and every line in it still reads.
import * as THREE from 'three';
import * as O from './props-objects.js';

// room.js's own numbers for the terminal box (buildTerminalBox, called with z = 0.12). The carcase
// runs x hx-0.11 → hx, y 1.22 → 1.58, z ± 0.17; its proud lid faces the room at x = hx - 0.124.
// These are read, never written: if that box ever moves, these move with it and nothing else does.
const BOX = { z: 0.12, y0: 1.22, y1: 1.58, depth: 0.11, lid: 0.014 };
// Where on the lid the lever is screwed, and it is NOT the middle of it. The lid runs z −0.03 to
// 0.27 and the home plate's right edge crosses the box: at the centre the lever's own box on the
// glass ran 1.6 px past the right of a 1280 x 800 frame. Seven centimetres upstage is 6 px left,
// which puts the whole of it inside every landscape window the film is judged at, and a lever set
// toward the hinge end of a lid is where a lever is anyway — the swing needs the other half.
const LEVER_Z = 0.055;
const TILT = 0.18; // the lever is never dead vertical; the quadrant it swings on shows
const MIN_TAP = 44; // px: what a thumb needs, whatever the box measures on the glass

// The room without its mains. `evening` gone one stop further: no key, no chandelier, deeper
// corners, and an ink ramp that turns the walls' rain into a lattice without filling the frame.
const NIGHT = {
  key: 0,
  keyColor: '#c8d2e4',
  fill: { sky: '#ffffff', ground: '#5b564c', intensity: 0.2 },
  bounce: 0.04,
  floorBounce: 0.03,
  corners: -1.15,
  pools: -0.3,
  pendant: 0,
  table: 0,
  floor: 0,
  night: true,
  ink: { tone: [0.0, 0.3, 1.02, 0.5], levels: [0.22, 0.44, 0.66, 1.0] },
};
// the same room with the surviving lamp out: one stop darker again, and nothing else changed
const DARK = { ...NIGHT, fill: { ...NIGHT.fill, intensity: 0.16 }, corners: -1.25, ink: { tone: [0.0, 0.26, 1.02, 0.5], levels: [0.2, 0.4, 0.62, 1.0] } };
// What the one lamp still burning is worth with everything else gone, and how far it reaches. Its
// own numbers are set for a room that also has a chandelier in it; alone, it has to carry a pool
// and a wall, so it is thrown up and out and put back exactly as it was on the way home.
const SURVIVOR = { intensity: 3.4, distance: 3.0 };

export function eggFuse(ctx, { group, switches }) {
  const M = O.materials();
  const hx = ctx.layout.room.width / 2;
  const face = hx - BOX.depth - BOX.lid; // the lid's front, looking into the room
  const cy = (BOX.y0 + BOX.y1) / 2;

  const g = new THREE.Group();
  g.name = 'fuse-lever';
  // THE PATTRESS: the switch's own paper housing, a block 18 mm proud of the japanned lid, and the
  // box's one bare white area. And THE LEVER LIES FLUSH ON IT — 5 mm of blade, not a handle on a
  // stalk — which is a measurement and not a taste. This wall is raked about 75° away from every
  // frontal plate, so a millimetre OUT of it is very nearly a millimetre of screen-x while a
  // millimetre ALONG it is a quarter of one. The housing's front gives the lever 13 px of white to
  // stand on; at 12 mm proud the handle was thrown 4 px left, hard against that edge and into the
  // box's black, where a lever is a lump. Flush, it is 1 px off centre and it is a lever.
  const PF = face - 0.018; // the housing's front, which is what the lever is mounted on
  const plate = O.box(0.018, 0.2, 0.15, M.paper);
  plate.position.set(face - 0.009, cy, LEVER_Z);
  g.add(plate);
  // the boss it turns on, and the blade: one bar, one grip, both solid ink
  const boss = O.cyl(0.013, 0.013, 0.007, M.solid, 12);
  boss.rotation.z = Math.PI / 2;
  boss.position.set(PF - 0.0035, cy, LEVER_Z);
  g.add(boss);
  const arm = new THREE.Group();
  arm.position.set(PF - 0.0025, cy, LEVER_Z);
  const bar = O.box(0.005, 0.07, 0.032, M.solid);
  bar.position.set(0, 0.035, 0);
  arm.add(bar);
  // …and the grip stops inside the housing: past its edge the handle is black on black
  const grip = O.cyl(0.015, 0.015, 0.006, M.solid, 12);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(-0.001, 0.07, 0);
  arm.add(grip);
  g.add(arm);
  group.add(g);

  let out = false; // the mains are on
  let want = false;
  let was = null; // the lighting state the room was in before the lever went down
  let lampOn = true; // the surviving practical: lit unless a judging state says otherwise
  let survivorWas = null;

  const point = () => {
    arm.rotation.x = out ? Math.PI - TILT : -TILT;
  };
  point();

  // ---- the lights ------------------------------------------------------------------------------
  const survivor = () => {
    const p = ctx.pieces.lighting?.practicals;
    return p?.cat ?? p?.table ?? null;
  };
  function lights() {
    const L = ctx.pieces.lighting;
    if (!L?.states) return;
    if (!L.states['fuse-out']) Object.assign(L.states, { 'fuse-out': NIGHT, 'fuse-dark': DARK });
    const s = survivor();
    if (out) {
      if (was == null) {
        was = L.state ?? 'default';
        survivorWas = s ? { i: s.intensity, v: s.visible, d: s.distance } : null;
      }
      L.setState(lampOn ? 'fuse-out' : 'fuse-dark');
      // the one lamp that is not on the mains, set after the state so it survives it
      if (s) {
        s.intensity = lampOn ? SURVIVOR.intensity : 0;
        s.distance = SURVIVOR.distance;
        s.visible = lampOn;
      }
    } else {
      // never pulled: leave the lighting exactly as whoever set it left it (?light=, a judging
      // state, the flow's own evening). This piece only ever puts back what it took.
      if (was == null) return;
      L.setState(was);
      if (s && survivorWas) {
        s.intensity = survivorWas.i;
        s.distance = survivorWas.d;
        s.visible = survivorWas.v;
      }
      was = null;
      survivorWas = null;
    }
  }

  // ---- the box on the glass --------------------------------------------------------------------
  const glass = ctx.renderer?.domElement ?? null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const v = new THREE.Vector3();
  // The eight corners of the drawn thing — the housing, and the blade standing off its front — in
  // the housing's own frame, projected. Nothing else in the room lives inside that box.
  function hitBox() {
    plate.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    for (const dx of [-0.017, 0.01]) for (const dy of [-0.105, 0.105]) for (const dz of [-0.076, 0.076]) {
      v.set(dx, dy, dz);
      plate.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to 44 px each way, which is what a thumb has. The box is on a bare
  // stretch of wall with nothing else clickable within a metre, so the margin costs nothing.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  function over(px, py) {
    if (!glass) return false;
    const r = glass.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    if (ray.intersectObject(g, true).length) return true;
    const b = tapBox();
    return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  // ---- the pull ---------------------------------------------------------------------------------
  function pull(next = !want) {
    want = !!next;
    // the clack on the click, not on the arrival: the hand is on the lever now
    ctx.pieces.sound?.play?.('clack', { pan: 0.5 });
  }
  const api = {
    get out() {
      return out;
    },
    pull,
    // for the tools and for setState: throw it with no cue and no waiting for the clock
    set(next, lit = true) {
      lampOn = lit !== false;
      out = want = !!next;
      point();
      lights();
    },
    hitBox,
    tapBox,
    update(ctx2) {
      if (!ctx2.clock.stepped || want === out) return;
      out = want; // one cut: the handle and the room change on the same drawing
      point();
      lights();
      ctx.emit?.('props:fuse', { out });
    },
  };
  switches?.add?.({ name: 'fuse', over, pull: () => pull() });
  return api;
}
