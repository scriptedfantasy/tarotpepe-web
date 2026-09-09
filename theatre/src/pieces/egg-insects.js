// THE INSECTS ON THE BACK WALL, AND THE HONEY JAR THEY GO TO.
//
// The user, having been given the radio and then the cat: "Click one and it flies off and lands
// somewhere else; the honey jar is where they gather."
//
// WHAT WAS ACTUALLY ON THAT WALL, BECAUSE IT MATTERS AND IT WAS NOT INSECTS. The brief said to
// find the five or six small bugs drawn round and under the clock and take them out of the wall
// plate. They are not in any plate. What is there is the WALLPAPER: `eachSprig` lays a stem with
// four leaves and three berries on a 0.51 m lattice (room-textures.js), one motif in four is drawn
// faded, and the ink pass — which throws away any mark with no dark neighbour a nib away — breaks
// a faded sprig at this distance into three or four disconnected ticks. Under the clock, either
// side of the pendulum, that is a little dark speck with legs coming off it. It reads as a bug.
// It is a print of a plant with most of it missing.
//
// So nothing is subtracted here, and nothing could be: the sprigs live in one 1.02 m tile repeated
// over the whole wall, and removing six of them removes them everywhere in the room. The insects
// are DRAWN, new, as their own paper cut-outs, and they are hung on the clear plaster between
// those sprigs — where the eye already looked, without landing on top of the print. `?bugs=0`
// leaves them off, which is how the claim "the wall behind them is untouched" is checked: the two
// frames differ inside the six boxes and nowhere else (tools/_egg-insects-proof.mjs).
//
// HOW ONE MOVES. Exactly as Pepe does, and for the same reason (pepe.js): it is a paper cut-out
// with its contour cut into the sheet, `colorful` so the ink pass shows the drawing verbatim and
// re-states its achromatic marks at the room's own pen, `lineWeight` 0 so the pass draws no second
// line of its own round a card, `hatch` 0.02 so a flat card facing the visitor takes no wash. Four
// sheets are cut for each insect and exactly one of them is shown at a time:
//
//     rest a / rest b   wings folded along the body. The two are the SAME drawing struck twice,
//                       and they alternate on every 12 fps step: that is the boil, and it is why
//                       an insect sitting still on the wall is still alive.
//     wings up / down   the two drawings of the flight. They alternate on the step as well, so a
//                       flying insect beats its wings at 6 Hz and boils at the same time.
//
// A WHOLE FLIGHT IS 8 TO 14 DRAWINGS. Nothing interpolates: on each step the sheet is somewhere
// else, the way a puppet is somewhere else. The path is a seeded wander — out into the room and
// back to the wall plane — so no two insects fly the same line and the same insect flies the same
// line every time the page is loaded with the same seed.
//
// WHAT ANNOUNCES IT: nothing. No label, no glow, no outline. The cursor becomes a pointer over an
// insect, and that is the whole affordance, as it is for the radio and the cat.
//
// WHERE THEY GO: the MIEL jar on top of the spares press, stage right. Six landing places round
// it, one each, taken off the jar's own bounding box so they cannot drift from the drawing — two
// on the press top either side, two on the shoulder, two below. They gather round it; they do not
// stack on it. A landed insect that is clicked again takes a short loop and comes back to ITS OWN
// place, because a fly that has found honey does not leave it.
//
// WHEN THEY HAVE ALL GATHERED, NOTHING HAPPENS. There is no fanfare and no reward. A reload puts
// them back on the wall.
//
// api (published as props.insects):
//   state          → ['wall'|'air'|'jar', …] one per insect
//   count, at(i)   the same, one at a time
//   fly(i)         send insect i off as a click does — cue, event and all
//   hitBox(i)      its sheet's box on the glass, in px
//   tapBox(i)      the box a thumb is actually given (≥ 44 px, grown about the same centre)
//   set(where)     for a still: 'wall' | 'jar', with no flight, no cue and no waiting
//   update(ctx)    called from props.update on the stepped clock
import * as THREE from 'three';
import { INK, PAPER, makeCanvas, canvasTexture, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { inkFilter } from './pepe-mips.js';

// ---- the drawing -------------------------------------------------------------------------------
// THE ONE CONSTRAINT, AND EVERY DECISION BELOW COMES OUT OF IT. The back wall runs 181 px to the
// metre in the home frame at 1280x800. The room's own pen on that wall is 0.013 m — the figure
// room-textures.js measured for the ghost's sprigs, and the width at which the ink pass stops
// throwing a mark away as a stray dark pixel. So a stroke is 2.4 screen pixels and an insect that
// is going to read as an insect is about SIX STROKES WIDE and no more: wing, paper, body, paper,
// wing. There is room for two black lobes with a waist between them, one wing stroke a side, three
// legs a side and two antennae. There is not room for an eye, a segmented abdomen, a shaded wing or
// an outlined body — a first pass outlined the wings at this pen and every one of the sixteen
// drawings came out as a single ink blot, because an outline at 2.4 px has no paper left inside it.
//
// The sheet is 0.115 m square at 557 px to the metre, which is 64 px of canvas for 21 px of glass.
// That is a large insect — 0.09 m across the wings — and it is deliberate: a fly drawn at life size
// on this wall would be two pixels, which is a speck of dirt on the print and not a thing a visitor
// can be asked to click. The film draws a small thing at the size it has to be read at (the clock
// lost eight of its twelve numerals for the same reason) and this is that.
const SHEET = 0.115; // metres, square
const PPM = 557; // canvas px per metre
const S = Math.round(SHEET * PPM); // 64
const M = (m) => m * PPM; // metres → canvas px

// a closed wobbly loop, stroked (a wing) or filled (a body)
function loop(g, pts, { width = 6, wobble = 0.5, rng = Math.random, fill = null, close = true }) {
  g.save();
  g.beginPath();
  const n = pts.length;
  for (let i = 0; i <= n; i++) {
    const [x, y] = pts[i % n];
    const [nx, ny] = pts[(i + 1) % n];
    const mx = (x + nx) / 2 + (rng() - 0.5) * wobble, my = (y + ny) / 2 + (rng() - 0.5) * wobble;
    if (i === 0) g.moveTo(mx, my);
    else g.quadraticCurveTo(x, y, mx, my);
  }
  if (close) g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (width > 0) {
    g.strokeStyle = INK;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
  g.restore();
}

// a wobbly filled lobe: an ellipse struck by a hand, which is what the body of one of these is
function lobe(g, cx, cy, rx, ry, rng, wobble) {
  const pts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx + (rng() - 0.5) * wobble, cy + Math.sin(a) * ry + (rng() - 0.5) * wobble]);
  }
  loop(g, pts, { width: 0, wobble: wobble * 0.5, rng, fill: INK });
}

// The four hands, in metres. TWO LOBES AND A WAIST is the whole idea: at eighteen screen pixels a
// single tapered blob is an ink blot and two blobs with a gap between them is unmistakably an
// insect, because nothing else in a drawn room is built that way. `head` is the front lobe, `body`
// the abdomen, `waist` the bare paper between them (never less than one pen width, or the two
// close up into the blot again), `wing` a wing's reach, `bands` the paper bars cut across the
// abdomen. No two silhouettes alike: the shelves' own rule, applied to vermin.
const KIND = {
  fly: { head: [0.014, 0.012], body: [0.017, 0.025], waist: 0.012, wing: 0.036, bands: 1, legs: 0.019, ant: 0.012 },
  bee: { head: [0.015, 0.013], body: [0.019, 0.023], waist: 0.011, wing: 0.032, bands: 2, legs: 0.017, ant: 0.010 },
  wasp: { head: [0.012, 0.011], body: [0.013, 0.030], waist: 0.016, wing: 0.038, bands: 1, legs: 0.018, ant: 0.015 },
  beetle: { head: [0.013, 0.010], body: [0.021, 0.026], waist: 0.010, wing: 0.026, bands: 0, legs: 0.021, ant: 0.008, shell: true },
};

// One sheet. `pose` is 'rest' | 'up' | 'down'; `strike` re-rolls the hand, which is the boil.
export function drawInsect(kind, pose, strike) {
  const K = KIND[kind];
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  const rng = mulberry32(strike * 7717 + kind.length * 131 + (pose === 'rest' ? 3 : pose === 'up' ? 11 : 19));
  const cx = S / 2, cy = S / 2;
  const pen = M(0.0128) * (0.92 + rng() * 0.16); // the room's own contour, at this distance
  const [hrx, hry] = K.head.map(M), [brx, bry] = K.body.map(M);
  const waist = M(K.waist), wl = M(K.wing);
  // the two lobes are hung either side of the waist, about the sheet's centre
  const hy = cy - waist / 2 - hry, by = cy + waist / 2 + bry;

  // WINGS FIRST, so the body's black closes over their roots. Each wing is ONE STROKE and not an
  // outline: an outline at this pen has no paper left inside it and comes out as a second blot.
  // At rest they lie back along the abdomen and reach past its point, which is what a fly sitting
  // on a wall actually looks like; on the up-beat they are a shallow V over the shoulders, and on
  // the down-beat they are out and a little low. The whole animal is six pen widths across —
  // wing, paper, body, paper, wing — and that arithmetic is why there are no more marks than this.
  const wing = (side, reach, sweep) => {
    const rx = cx + side * hrx * 0.5, ry = cy;
    const ex = rx + side * reach * Math.cos(sweep), ey = ry + reach * Math.sin(sweep);
    const mx = (rx + ex) / 2 - side * reach * 0.14, my = (ry + ey) / 2 - reach * 0.16;
    loop(g, [[rx, ry], [mx, my], [ex, ey]], { width: pen * 0.86, wobble: pen * 0.2, rng, close: false });
  };
  for (const side of [-1, 1]) {
    if (pose === 'rest') wing(side, wl * 1.06, 0.88); // back and down, clear of the abdomen's edge
    else if (pose === 'up') wing(side, wl, -0.78); // the up-beat
    else wing(side, wl * 1.06, 0.2); // the down-beat
  }

  // THE TWO LOBES: the solid black area every prop in this room owes the frame, in two pieces.
  lobe(g, cx, hy, hrx, hry, rng, pen * 0.2);
  lobe(g, cx, by, brx, bry, rng, pen * 0.2);

  // the paper bars across a bee's abdomen: the bare white area, cut with the pen, not painted
  for (let b = 0; b < K.bands; b++) {
    const y = by - bry * 0.35 + b * bry * 0.72;
    inkLine(g, cx - brx * 1.1, y, cx + brx * 1.1, y, { width: pen * 0.42, wobble: pen * 0.12, rng, color: PAPER });
  }
  // a beetle's wing case: one paper rule down the middle of the shell
  if (K.shell) inkLine(g, cx, by - bry * 0.8, cx, by + bry * 0.75, { width: pen * 0.38, wobble: pen * 0.14, rng, color: PAPER });

  // legs — three a side, the front pair reaching forward past the head — and two antennae. Drawn
  // last, over the black, so each one starts inside the body and comes out of it. At 1.3 screen
  // pixels these are the first marks the pass loses when the frame gets small, and that is the
  // right order to lose them in: an insect across a room is a body and two wings.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      // rooted on the body's own edge, not inside it: a leg that starts in the middle of the black
      // only makes the black bigger
      const y = cy - waist * 0.3 + i * (bry * 0.55);
      const a = side * (0.42 + i * 0.5) + (rng() - 0.5) * 0.16;
      const l = M(K.legs) * (0.7 + rng() * 0.34);
      const kx = cx + side * (i === 0 ? hrx : brx) * 0.85, ky = y;
      const ex = kx + Math.cos(a) * l, ey = ky + Math.sin(a) * l - (i === 0 ? l * 0.5 : 0);
      inkLine(g, kx, ky, ex, ey, { width: pen * 0.34, wobble: pen * 0.16, rng, segments: 2 });
    }
    const aa = -Math.PI / 2 + side * 0.66;
    inkLine(g, cx + side * hrx * 0.35, hy - hry * 0.4, cx + side * hrx * 0.35 + Math.cos(aa) * M(K.ant), hy - hry * 0.4 + Math.sin(aa) * M(K.ant), {
      width: pen * 0.42,
      wobble: pen * 0.12,
      rng,
      segments: 2,
    });
  }
  return c;
}

// ---- where they sit ----------------------------------------------------------------------------
// SIX PLACES ON THE BARE PLASTER UNDER THE CLOCK, in metres on the back wall (x from the room's
// axis, y off the floor). Every one of them was checked against three things and none of it is a
// guess:
//   · WHAT THE CAMERA CAN SEE OF THAT WALL. tools/_egg-clear.mjs fires a ray from the home plate
//     at every 50 mm of the band and prints what is in the way. The answer is narrower than it
//     looks: the window's shutter leaves fold back over the plaster as far in as x = -0.53 at
//     every height, the door architrave takes everything past x = +0.92, and the two hung plates
//     take y ≥ 1.81 between ±0.30 and ±0.66. What is left is one band, x -0.50 to +0.90 and
//     y 1.35 to 1.80, and all six live in it. (Round 1 put one at x = -0.78 and it spent its life
//     behind a shutter.)
//   · THE SPRIGS. The wallpaper's lattice puts a motif at x = ±0.255, ±0.765 on the row at
//     y = 1.785 (it stands 0.21 m tall, so it occupies 1.68–1.89) and at x = 0, ±0.51 on the row
//     at y = 1.275. Every sheet below clears every one of those rectangles: an insect drawn on top
//     of a printed plant is two drawings in one place.
//   · A THUMB, AND THE THUMB'S BOX IS A SQUARE. This is the constraint that decided the layout and
//     it is not the one it looks like. The box grown round a sheet is 44 px SQUARE and axis
//     aligned, so two of them miss each other only if their centres are 44 px apart ACROSS or 44 px
//     apart UP — a diagonal 53 px gap is not enough, and a first layout that spaced them by
//     straight-line distance had two boxes overlapping by 5 px. The wall runs 181 px to the metre
//     on the plate (the coarsest of the frames judged), so the rule is: every pair differs by at
//     least 0.25 m in x or by at least 0.25 m in y. Hence two ranks, 0.28 m apart in height, three
//     to a rank at half a metre: every pair in a rank clears on x, every pair across the ranks
//     clears on y, and the alternation is also why they read as scattered over the wall rather than
//     as a row of six.
const WALL_SPOTS = [
  [-0.42, 1.74],
  [-0.16, 1.46],
  [0.12, 1.76], // …and clear of the pendulum, which swings on the room's axis down to y 1.79
  [0.35, 1.46],
  [0.62, 1.73],
  [0.86, 1.44],
];
const KINDS = ['fly', 'bee', 'fly', 'wasp', 'beetle', 'bee'];
// THE RING ROUND THE JAR, in metres off the jar's own base centre (x across, y up) — which is why
// they gather round it and do not stack on it: six named places, one each, and the ring follows
// the jar if the press dressing ever moves it.
//   · NOTHING GOES BELOW THE JAR'S FOOT. That line is the top board of the press, and a cut-out
//     centred on it hangs half in the air under the shelf. (It did, for one round: two of them
//     floated below the board like a fault in the drawing.) The drawn insect's tail is 48 mm below
//     its sheet's centre, so a place on a surface is at least that far above it.
//   · IT LEANS LEFT. The jar stands 0.14 m from the end of the press and 0.18 m from the plaster,
//     so there is room for one on that side and four on the other.
//   · The last one stands on the ALMANACH, the flat black book beside the jar (its cover is at
//     1.55, which is what the +0.100 is).
// Two are on the shoulder, one on the lid, three on the board. The nearest pair are 85 mm apart —
// a body's width of bare paper between them.
const JAR_RING = [
  [-0.135, 0.052], // the board, left of the jar
  [0.088, 0.055], // the board, right of it, inside the end of the press
  [-0.075, 0.115], // the left shoulder, standing off it so the jar's own contour still reads
  [0.072, 0.125], // the right shoulder
  [0.005, 0.255], // on the lid: the jar's top is 0.207 above its foot, and the feet go on it
  [-0.245, 0.100], // on the ALMANACH
];

const WALL_Z = 0.012; // how far a sheet stands off the plaster
const MIN_TAP = 44; // px: what a thumb needs, whatever the insect measures on the glass

export function buildInsects(ctx, { group, switches, jar, wallZ }) {
  const params = ctx.params ?? new URLSearchParams(location.search);
  const off = params.get('bugs');
  // ?bugs=0 HIDES THEM; IT DOES NOT SKIP BUILDING THEM, and that distinction is the whole worth of
  // the control frame. three.js hands every object an id off one running counter, the ink pass
  // seeds its boundary contours off that id (`u.uId.value = object.id & 65535`, ink.js), and every
  // piece built after this one — the table, the cloth, the cards, the puppet — would be renumbered
  // if these twenty-four sheets were never made. Measured: not building them re-struck the
  // tablecloth's folds in 1345 pixels at the other end of the frame, which is a different drawing
  // of the same cloth and nothing to do with insects. Built and hidden, the two frames differ in
  // the six sheets and in nothing else at all.
  const hidden = off === '0' || off === 'off' || off === 'none';
  const SHARP = off === 'sharp'; // ?bugs=sharp: the pepe-mips chain, for the comparison below

  const rng0 = mulberry32(90210);
  const bugs = [];
  const root = new THREE.Group();
  root.name = 'insects';
  root.userData.noShadow = true;

  // WHERE THE JAR IS, off the jar's own geometry. If the press dressing ever moves it, the ring
  // moves with it; if it is not there at all (a stripped set), the ring falls back to where the
  // press top has always been and nothing throws.
  // …and its matrix has to be walked up to the props group first. This piece is built at the foot
  // of props.js, before the first render, so nothing above the jar has a world matrix yet and a
  // Box3 taken now would be the jar's own local box sitting at the middle of the room. (It was,
  // for one round: the six of them gathered in mid-air over the table.) The props group itself is
  // the identity, so its space and the room's are the same space.
  jar?.updateWorldMatrix(true, true);
  const jarBox = jar ? new THREE.Box3().setFromObject(jar) : null;
  const anchor = jarBox
    ? { x: (jarBox.min.x + jarBox.max.x) / 2, y: jarBox.min.y, z: jarBox.max.z }
    : { x: 2.42, y: 1.5, z: -2.29 };

  const geo = new THREE.PlaneGeometry(SHEET, SHEET);
  const POSES = [
    ['rest', 0],
    ['rest', 1],
    ['up', 0],
    ['down', 0],
  ];

  // FOUR SHEETS A HAND, NOT FOUR A HEAD. The six insects are four kinds, so there are sixteen
  // drawings in the room and not twenty-four — and the two flies really are the same fly, which is
  // what flies look like. Twenty-four meshes still stand on the wall; they share these sixteen
  // materials, and a mesh with a material is free where a drawing and a texture are not.
  const sheetCache = new Map();
  const sheetMat = (kind, pose, strike) => {
    const key = `${kind}-${pose}-${strike}`;
    let mat = sheetCache.get(key);
    if (mat) return mat;
    // colorful: the pass shows the drawing verbatim and restates its achromatic marks at the
    // room's pen. lineWeight 0: no second contour round a card. hatch 0.02: no wash on a flat
    // sheet facing the visitor. All three are pepe.js's numbers and all three are why he and
    // these are drawn by the same hand.
    mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
    mat.userData.ink = { hatch: 0.02, lineWeight: 0, colorful: true };
    mat.alphaTest = 0.5;
    mat.transparent = false;
    mat.name = `insect-${key}`;
    // PLAIN MIPS, AND PEPE'S CHAIN IS NOT USED HERE, WHICH IS A DECISION AND WAS MEASURED. He
    // needs pepe-mips.js because a `colorful` surface is shown VERBATIM and an averaging filter
    // turns his pen into a mid grey. These are colorful too — but they are black on paper with no
    // chroma anywhere, so the pass's colorful branch RE-STATES them: an achromatic mark with
    // contrast against its own field is redrawn at the room's nib whatever the filter handed over.
    // The sheet is 64 px for a thing that is 21 px on the glass, so it never minifies past three
    // to one and there is little for a filter to lose in the first place. Both were rendered and
    // compared at the home plate (?bugs=sharp is still the switch): the two frames are the same
    // drawing, and the chain cost 960 ms of props' 1500 ms build budget against 37 ms without it —
    // 112 canvases printed level by level in JS, in a browser where a canvas costs 30 ms.
    const tex = canvasTexture(drawInsect(kind, pose, strike));
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
    if (SHARP) inkFilter(tex, ctx.renderer);
    mat.map = tex;
    sheetCache.set(key, mat);
    return mat;
  };

  for (let i = 0; i < WALL_SPOTS.length; i++) {
    const kind = KINDS[i];
    const g = new THREE.Group();
    g.name = `insect-${i}`;
    const sheets = POSES.map(([pose, strike]) => {
      const m = new THREE.Mesh(geo, sheetMat(kind, pose, strike));
      m.castShadow = false;
      m.receiveShadow = false;
      m.visible = false;
      g.add(m);
      return m;
    });
    sheets[0].visible = true;

    const [wx, wy] = WALL_SPOTS[i];
    const home = new THREE.Vector3(wx, wy, wallZ + WALL_Z);
    const [jx, jy] = JAR_RING[i];
    // staggered a few millimetres in z by index, so when six sheets crowd one jar the pointer's
    // "whichever is nearer the camera" has something to be nearer about
    const seat = new THREE.Vector3(anchor.x + jx, anchor.y + jy, anchor.z + 0.014 + i * 0.004);
    g.position.copy(home);
    root.add(g);

    bugs.push({
      i,
      kind,
      group: g,
      sheets,
      home,
      seat,
      at: 'wall',
      path: null, // the drawings of the flight, while there is one
      k: 0, // which drawing we are on
      seed: Math.floor(rng0() * 1e6) + 17 * i,
      flights: 0,
    });
  }
  root.visible = !hidden;
  group.add(root);

  // ---- a flight ---------------------------------------------------------------------------------
  // 8 to 14 drawings, and every one of them is a PLACE, not a sample of a curve: the sheet is put
  // there and held for a twelfth of a second. The line from A to B is bowed out into the room (the
  // insect leaves the wall plane and comes back to it) and then wandered: each drawing is thrown
  // off the line by a seeded amount that swells in the middle of the flight and closes to nothing
  // at both ends, so it arrives exactly where it is going. The last two drawings drop the wander
  // altogether — a fly settles onto a rim, it does not skid onto it.
  function planPath(from, to, seed, { loopBack = false } = {}) {
    const rng = mulberry32(seed);
    const n = loopBack ? 8 + Math.floor(rng() * 3) : 8 + Math.floor(rng() * 7);
    const out = [];
    const bow = 0.16 + rng() * 0.22; // how far into the room it swings
    const rise = 0.05 + rng() * 0.16;
    // a loop back to the same place needs a detour to be a loop at all: one big sideways throw
    const side = (rng() < 0.5 ? -1 : 1) * (loopBack ? 0.20 + rng() * 0.14 : 0);
    for (let k = 1; k <= n; k++) {
      const u = k / n;
      const arc = Math.sin(u * Math.PI);
      const wander = arc * (loopBack ? 0.04 : 0.075);
      const x = from.x + (to.x - from.x) * u + side * arc + (rng() - 0.5) * 2 * wander;
      const y = from.y + (to.y - from.y) * u + rise * arc + (rng() - 0.5) * 2 * wander;
      const z = from.z + (to.z - from.z) * u + bow * arc + (rng() - 0.5) * wander;
      out.push({ p: new THREE.Vector3(x, y, z), tilt: 0 });
    }
    // the last two are the settle: straight onto the mark, no wander left in them
    for (let k = Math.max(0, n - 2); k < n; k++) {
      const u = (k + 1) / n;
      out[k].p.set(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u, from.z + (to.z - from.z) * u);
    }
    out[n - 1].p.copy(to);
    // THE LEAN, and it is small on purpose. A cut-out tips into the way it is going, but the tip is
    // a DIFFERENT tip on every drawing or it is not a tip at all — a constant angle held for twelve
    // frames is just an insect drawn crooked. (Round 1's was: the term saturated its own clamp on
    // every drawing of every flight and printed -0.55 eleven times in a row.) So: a base lean off
    // the step's direction, at about a fifth of a radian for a step this size, plus a seeded shake
    // of the same order, and level on the last drawing, because a thing landing puts itself square.
    for (let k = 0; k < n; k++) {
      const prev = k === 0 ? from : out[k - 1].p;
      const dx = out[k].p.x - prev.x, dy = out[k].p.y - prev.y;
      const lean = -dx * 1.1 + dy * 0.5 + (rng() - 0.5) * 0.3;
      out[k].tilt = k >= n - 1 ? 0 : Math.max(-0.45, Math.min(0.45, lean));
    }
    return out;
  }

  // ---- the glass --------------------------------------------------------------------------------
  function hitBox(i) {
    const b = bugs[i];
    if (!b) return null;
    b.group.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const dx of [-SHEET / 2, SHEET / 2])
      for (const dy of [-SHEET / 2, SHEET / 2]) {
        v.set(dx, dy, 0);
        b.group.localToWorld(v).project(ctx.camera);
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // AN INSECT IS THE SMALLEST THING IN THIS ROOM ANYBODY IS ASKED TO TOUCH: 15 px across at the
  // home plate and 19 on a phone. So the box a thumb is given is grown about the same centre to a
  // thumb's 44 px, which on the wall is 0.22 m of bare plaster with nothing else on it — the
  // spots above are spaced so that six grown boxes never become one.
  function tapBox(i) {
    const b = hitBox(i);
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  // where it is on the glass, as a pan: a buzz on the right of the room comes from the right
  function pan(i) {
    const b = hitBox(i);
    const W = ctx.size?.w || window.innerWidth;
    if (!b || !W) return 0;
    return Math.max(-1, Math.min(1, ((b.x + b.w / 2) / W) * 2 - 1));
  }

  const BUZZ_EVERY = 2; // drawings between one buzz and the next: see the cue's own length
  function fly(i) {
    const b = bugs[i];
    if (!b || b.at === 'air') return false;
    const from = b.group.position.clone();
    // it always ends at its own place at the jar: off the wall it is a crossing, off the jar it is
    // a loop out and back to the same mark, because a fly that has found honey does not leave it
    const back = b.at === 'jar';
    b.path = planPath(from, b.seat, b.seed + b.flights * 101, { loopBack: back });
    b.k = 0;
    b.at = 'air';
    b.flights++;
    b.buzzAt = -99;
    ctx.pieces.sound?.play?.('buzz', { gain: 0.9, pan: pan(i) });
    b.buzzAt = 0;
    ctx.emit?.('props:insect', { i, at: 'air' });
    return true;
  }

  // …and a hidden one is not a switch: nothing the visitor cannot see may answer a pointer
  if (!hidden)
    for (let i = 0; i < bugs.length; i++) {
      switches?.add({
        name: `insect-${i}`,
        object: () => bugs[i].group,
        tapBox: () => tapBox(i),
        onDown: () => fly(i),
      });
    }

  const api = {
    count: bugs.length,
    get state() {
      return bugs.map((b) => b.at);
    },
    at: (i) => bugs[i]?.at ?? null,
    // which drawing of a flight it is on, and how many there are: what a tool needs to prove the
    // flight is a row of separate drawings and not a tween
    progress: (i) => (bugs[i]?.path ? { k: bugs[i].k, n: bugs[i].path.length } : null),
    get gathered() {
      return bugs.every((b) => b.at === 'jar');
    },
    kinds: KINDS.slice(),
    spots: WALL_SPOTS.map(([x, y]) => [x, y]),
    seats: bugs.map((b) => b.seat.toArray()),
    fly,
    hitBox,
    tapBox,
    // for the tools and for setState: put them where they belong for a still, with no flight, no
    // cue and nothing to wait for
    set(where = 'wall') {
      for (const b of bugs) {
        b.path = null;
        b.k = 0;
        b.at = where === 'jar' ? 'jar' : 'wall';
        b.group.position.copy(where === 'jar' ? b.seat : b.home);
        b.group.rotation.z = 0;
        show(b, 0);
      }
    },
    update,
  };

  function show(b, which) {
    for (let s = 0; s < b.sheets.length; s++) b.sheets[s].visible = s === which;
  }

  // Called from props.update, which only calls anything on a stepped frame — so every line below
  // runs on the 12 fps grid the pendulum, the boil and the radio's needle are on.
  function update(ctx2) {
    const f = ctx2.clock.frame;
    for (const b of bugs) {
      if (b.at !== 'air') {
        // sitting still, and still alive: the two rest sheets are the same drawing struck twice
        show(b, f % 2);
        continue;
      }
      const step = b.path[b.k];
      b.group.position.copy(step.p);
      b.group.rotation.z = step.tilt;
      show(b, 2 + (b.k % 2)); // wings up, wings down, up, down
      // THE BUZZ RUNS THE LENGTH OF THE FLIGHT AND NOT A DRAWING LONGER. The cue is audible for
      // 0.257 s (measured, tools/_egg-insects-buzz.mjs) and it is re-fired every second drawing —
      // every 0.167 s — which is reveal-shuffle's own arithmetic for the smoosh: a cue longer than
      // the gap runs 90 ms into the next one and the ear hears one continuous sound instead of a
      // row of separate ones. It stops when the insect lands, because that is when the wings stop.
      if (b.k - b.buzzAt >= BUZZ_EVERY && b.k < b.path.length - 2) {
        b.buzzAt = b.k;
        ctx.pieces.sound?.play?.('buzz', { gain: 0.7, pan: pan(b.i) });
      }
      b.k++;
      if (b.k >= b.path.length) {
        b.path = null;
        b.k = 0;
        b.at = 'jar';
        b.group.position.copy(b.seat);
        b.group.rotation.z = 0;
        show(b, 0);
        ctx.emit?.('props:insect', { i: b.i, at: 'jar' });
      }
    }
  }

  return api;
}

// what the props piece's setState hands over: only the two names this egg answers to
export function insectState(api, name) {
  if (!api) return;
  if (name === 'insects-gathered') api.set('jar');
  else if (name === 'insects-wall' || name === 'default') api.set('wall');
}
