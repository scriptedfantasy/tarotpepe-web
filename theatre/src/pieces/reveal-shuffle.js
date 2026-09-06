// reveal-shuffle.js — THE SMOOSH, drawn on twos; and the deck as temporary stacks.
//
// ROUND 11, AND IT IS THE USER'S NOTE: "as for the card shuffle, i think we should resort to a
// smooshing shuffle method". A smoosh — a wash — is what a reader actually does: the deck is spread
// face down over the cloth and BOTH hands swirl the cards round each other in slow circles until
// they are thoroughly mixed. What was here was a RIFFLE, which is a card-player's move: a cut, a
// bridge, a cascade, a snap. (Round 11 raked the wash back into a squared pile at the end of this
// file and dealt a fan out of it. Round 12 deleted that: the visitor picks out of the wash itself,
// so the beat now ENDS with the mass lying on the cloth — see the last block.)
//
// It fixes three things that were already on the list, and it is not a taste:
//   · THE BRIDGE'S SHADOW. The camera builder measured that the riffle's raised halves "cast a
//     heavy cross-hatched shadow that now falls on bare cloth instead of into the clutter". A
//     smoosh has nothing raised in it — every card stays flat on the cloth — so the shadow is gone
//     rather than tuned.
//   · THE PLATE. The tabletop shots are true plan views now. A riffle is the worst possible subject
//     for one: its whole shape is vertical, which is why it needed `riffle`, a 62° rake on a
//     0.34 m insert. A smoosh is ENTIRELY horizontal and is the best possible subject for a plan
//     view, so the beat is staged in the plan the whole tabletop uses (reveal.js → SHOT.shuffle).
//   · THE DECK. Seventy-eight cards are on the cloth, being mixed, in front of the visitor, which
//     is the point of shuffling in a reading. The riffle mixed a drawing of a deck; this mixes the
//     deck. It is measured, not asserted — tools/_rv11-mix.mjs.
//
// THE DRAWINGS (world metres on the cloth, the table top at y = layout.spread.y):
//   2  the squared deck, both hands coming down onto it from up-frame
//   6  THE WASH: the pile pushed over and splayed out under two palms into a raft of 78 cards, the
//      deck thinning card by card as they leave it — the top of the deck travels furthest
//  30  THE SWIRL: three revolutions, ten stepped drawings each. The hands describe slow circles in
//      OPPOSITE senses, mirrored across the frame's axis and half a turn apart, so one is always
//      up-frame of the other; every card inside a hand's reach is carried round with it and turned
//      with it, and the two counter-rotations shear the raft between them. Cards under a palm ride
//      up over their neighbours, so the top layer — which is all a plan view sees — is a different
//      set of cards every drawing.
//   4  his hands off the heap, up the frame, and out — AND THE WASH STAYS WHERE IT IS (round 12).
//      There is no rake here and no squared pile: the visitor picks out of this mass, so the deck
//      does not come back until the gather at the end of the reading (reveal-pick.js).
// Forty-two drawings + a two-frame hold: 3.67 s at 12 fps. Long enough that it reads as thorough —
// three whole revolutions of both hands — and short enough that nobody is waiting to choose.
// The hands are the user's own drawings, cut by tools/hand-cutout.mjs (reveal-hand.js → PLATES),
// and they are posed by the MIDDLE OF THE PALM here, not by the fingertips: `by: 'palm'`.
//
// The deck piece builds the deck as a few rigid blocks with a hairline per card on their cut
// sides. A wash needs the squared pile to thin as cards leave it and to grow again as they come
// back, and the gather needs a pile that grows as they are raked in again, so `deckStacks`
// borrows the deck's own block geometry and materials (the ink flags come with them) to make
// temporary stacks whose thickness is a y-scale and whose side texture window follows the number
// of cards in them. The real deck is hidden while they play and comes back, squared, at the end.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { cardGeometry } from './cards-geometry.js';
import { hold, compose, handFrames } from './reveal-takes.js';

const _v = new THREE.Vector3();

// The deck's blocks as a set of temporary stacks. Temp meshes are named 'tmp:*' so a later call
// (the pick's, the shuffle's) never mistakes one for a real block.
export function deckStacks(deck, T) {
  const real = deck.children.filter((c) => c.isMesh && !c.name.startsWith('tmp:'));
  const blocks = real.filter((c) => c.geometry && Array.isArray(c.material) && c.material.length >= 3);
  if (!blocks.length) return null;
  // the template: the thickest block (its geometry is a slab centred on y = 0)
  const heightOf = (m) => {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox;
    return (b.max.y - b.min.y) * m.scale.y;
  };
  const template = blocks.reduce((a, b) => (heightOf(b) > heightOf(a) ? b : a));
  const hTemplate = heightOf(template) / template.scale.y;
  // cards per mesh from its thickness (a single bent card is thicker than T: count it as one)
  const counts = real.map((m) => (heightOf(m) < 4 * T ? 1 : Math.round(heightOf(m) / T)));
  const nTotal = counts.reduce((a, b) => a + b, 0);
  const nBase = Math.max(1, Math.round(heightOf(template) / T)); // the big bottom block
  if (!template.geometry.boundingBox) template.geometry.computeBoundingBox();
  const bb = template.geometry.boundingBox;
  const W = bb.max.x - bb.min.x, H = bb.max.z - bb.min.z;
  const side = template.material[2];

  // a temporary stack of n cards, drawn with the deck's own faces and its cut-side hairlines
  function stack(name) {
    const sideMat = side.clone();
    if (side.map) {
      sideMat.map = side.map.clone();
      sideMat.map.needsUpdate = true;
    }
    const m = new THREE.Mesh(template.geometry, [template.material[0], template.material[1], sideMat]);
    m.name = `tmp:${name}`;
    m.castShadow = true;
    m.receiveShadow = true;
    m.visible = false;
    m.userData.n = 1;
    deck.add(m);
    return m;
  }
  // show `n` cards of the strip starting at card `start` (0 = bottom of the deck)
  function cards(m, n, start) {
    m.visible = n > 0;
    m.scale.y = (Math.max(n, 0.5) * T) / hTemplate;
    const map = m.material[2].map;
    if (map) {
      map.repeat.y = Math.max(n, 0.5) / nTotal;
      map.offset.y = start / nTotal;
    }
    m.userData.n = n;
  }
  // place a stack so that its local point (px, py, pz) (py in units of the stack's own height:
  // -0.5 bottom, +0.5 top) sits at `target`, with the stack rotated by e
  function pivot(m, target, e, px, py, pz) {
    const h = (m.userData.n ?? 1) * T;
    m.rotation.copy(e);
    _v.set(px, py * h, pz).applyEuler(e);
    m.position.copy(target).sub(_v);
  }
  // flat on the table (or on top of something y0 high), squared to ry
  const flat = (m, x, z, ry, y0 = 0) => {
    const h = (m.userData.n ?? 1) * T;
    m.rotation.set(0, ry, 0);
    m.position.set(x, y0 + h / 2, z);
  };
  const showReal = (on) => {
    for (const r of real) r.visible = on;
  };
  const hide = (list) => {
    for (const t of list) t.visible = false;
  };
  const dispose = (list) => {
    for (const t of list) {
      t.material[2].map?.dispose?.();
      t.material[2].dispose?.();
      deck.remove(t);
    }
  };
  return { real, nTotal, nBase, W, H, T, hTemplate, stack, cards, pivot, flat, showReal, hide, dispose };
}

// ── WHERE THE RAFT LIES, AND WHAT SHAPE IT IS ──────────────────────────────────────────────────
// The user sent a photograph of a real smoosh on a real table and BRIEF.md records it as five
// things to check. Three of them are about this block, and the first cut of it failed all three:
// it laid the seventy-eight on an even golden-angle fill of an ELLIPSE and held them there with a
// per-card radial re-spread, which is a recipe for the one thing he ruled out — "the outline of
// the whole mass is ragged, NOT A DISC and not an arc", "stacks of three or four and gaps of bare
// cloth". An even fill of an ellipse is a disc with no gaps in it by construction.
//
// So the raft is built the other way round:
//   · ITS BOUNDARY IS RAGGED. `EDGE` is a closed curve — a few harmonics with rolled phases — that
//     runs between about 0.54 and 1.0 of the nominal ellipse. Because it only ever eats INWARD the
//     frame margins below still hold exactly, and no two seeds give the same outline.
//   · ITS FILL IS CLUMPED. The cards are not spread over the region, they are dealt to `clumps`
//     knots of uneven size and scattered round those, so the mass comes out with knots three and
//     four deep and bare cloth between them, which is what a pile pushed about with two hands does.
//   · ITS FOOTPRINT IS HELD BY ONE NUMBER. See `hold` in the swirl: a similarity transform cannot
//     round off an outline or even out a density, and the per-card re-spread that was here did
//     both. (It did not even hold the footprint: measured, the raft went from 0.191 m² to 0.059 —
//     it collapsed to a third and the top layer fell from 61 cards to 49.)
//
// It is solved against the frame it is played in, exactly the way the band the mass is pushed out
// into is (reveal-wash.js → BANDS). The plan view over the cloth measures 0.798 x 0.449 m at 16:9 and 0.430 x 0.839 m
// on a 390x760 phone (tools/_rv10-frame.mjs, on the `fan` plate), two different pictures wanting
// two different rafts. A washed card lies ANY WAY UP — that is what makes a wash a wash and not a
// spread — so it reaches 0.131 m from its own centre in the worst direction, and the nominal
// ellipse of centres is the frame's window pulled in by that on every side, and by the rim again.
//   wide  |x| ≤ 0.150, z ∈ 0.294..0.417 → the mass 0.562 x 0.408 at its widest, which is four mean
//         cards by three: 118 mm inside the frame's side edge, 20 mm inside top and bottom.
//   tall  |x| ≤ 0.058, z ∈ 0.150..0.440 → 0.378 x 0.552, three mean cards by four, 26 mm inside a
//         phone's side edge.
// Seventy-eight cards are 2.31 m² of card, so a wash CANNOT be one card deep on a 1.21 m² cloth
// and no arrangement makes it one: the raft is a heap, which is what a smoosh looks like from
// above anyway — a churning mass with a changing top layer. `DEEP` is how proud of the cloth that
// heap rides; the hands are drawn on top of it (`floor`).
const TALL_BELOW = 1.25; // the shape at which the spread re-nests, and the raft with it
const RAFT = {
  //     the nominal ellipse of centres        the knots        where a palm orbits, and how far it reaches
  wide: { ax: 0.185, cz: 0.3555, az: 0.068, clumps: 12, sig: 0.032, voids: 3, hx: 0.104, rx: 0.048, rz: 0.062, reach: 0.132 },
  tall: { ax: 0.060, cz: 0.297, az: 0.146, clumps: 9, sig: 0.028, voids: 2, hx: 0.054, rx: 0.024, rz: 0.110, reach: 0.112 },
};
// The ragged outline: [harmonic, amplitude]. Two and three are the lobes that stop it being a
// disc, five is the nick out of the rim that stops the lobes being a flower.
const EDGE = [[2, 0.18], [3, 0.13], [5, 0.09]];
// Cards that lie off on their own, out at the rim, away from every knot — and past the ragged
// curve, out to the nominal ellipse, which is the frame's own limit. Twelve of seventy-eight, and
// they do most of the work of the word RAGGED: a mass whose every card is in the mass has a clean
// edge however lumpy you cut the curve it was laid to.
const STRAY = 12;
const DEEP = 0.016; // the raft's own thickness, drawn: 78 cards of 0.8 mm would be 62
const N = 78; // the deck, the user's rule
// Stepped drawings per revolution of a hand — 36 degrees a drawing, which is a circle you can
// see being described rather than a smear — and how many revolutions the wash gets. THREE, not two:
// two read as a stir and left five of the seventy-eight within three ranks of where they started.
const PER = 10;
const TURNS = 3;
const WASH = 6; // drawings the squared deck takes to open out into the raft
const RUN = 3; // how long one card takes to travel, in drawings, in the wash
// how hard a hand carries the cards under it, and how far it turns them with it
const DRAG = 0.92, SPIN = 0.85;
// where each arm is anchored, for pointing a hand away from its own shoulder (reveal-hand.js HAND)
const SHOULDER = [0.291, -0.82];

// THE WHOLE SHUFFLE — the smoosh. Forty-two drawings and a two-frame hold: 3.67 s at 12 fps.
// See the head of this file for what is in them. Both of his hands are on the cloth for every one
// of the forty-nine (reveal-hand.js → buildHands), which is what makes it a smoosh and not a wipe.
//
// `aspect` chooses the raft, and reveal.js passes the window's own shape and throws the take away
// when the window changes nesting, the same way the spread is re-laid.
export function buildShuffle(ctx, deck, T, { cues = {}, hand = null, aspect = 1.78 } = {}) {
  const S = deckStacks(deck, T);
  if (!S) return null;
  const { nTotal, W, H, cards, flat, showReal } = S;
  const card = ctx.layout.spread.card;
  const Y = ctx.layout.spread.y;
  const R = RAFT[aspect < TALL_BELOW ? 'tall' : 'wide'];
  // the squared deck's own square, in world metres, and how thick it is
  deck.updateMatrixWorld(true);
  const DX = deck.position.x, DZ = deck.position.z, DA = deck.rotation.y;
  const deckH = nTotal * T;
  // the deck's own units: 78 of the raft's cards are exactly the deck, and none of them are none
  const units = (n) => (n * nTotal) / N;

  const PILE = S.stack('wash'); // the squared pile, thinning as cards leave it
  const temps = [PILE];
  const hideTemps = () => S.hide(temps);

  // ── the seventy-eight, as placeholders ────────────────────────────────────────────────────────
  // The deck's own back and stock on a near-flat sheet, exactly as the spread's cards are made
  // (reveal-pick.js): no front art, because nothing in a shuffle is ever face up. Three sheets, each
  // bent a hair its own way, so a heap of them stacks without the cards passing through each other.
  const group = new THREE.Group();
  group.name = 'smoosh';
  ctx.scene.add(group);
  const deckTop = deck.getObjectByName?.('deck-top') ?? null;
  const block = deck.children.find((c) => c.isMesh && c.name.startsWith('deck-block')) ?? null;
  const mats = Array.isArray(deckTop?.material)
    ? deckTop.material
    : block && Array.isArray(block.material)
      ? [block.material[1], block.material[0], block.material[1]]
      : new THREE.MeshLambertMaterial({ color: '#efe8d7' });
  const geos = [];
  const geoFor = (k) => {
    const j = k % 3;
    if (!geos[j]) {
      const g = mulberry32(940 + j);
      geos[j] = cardGeometry({ w: card.w, h: card.h, t: T, r: 0.005, nx: 6, ny: 10, arcN: 6, curl: 0.0001 + g() * 0.00008, curlX: 0.00003, twist: (g() - 0.5) * 0.0001 });
    }
    return geos[j];
  };
  const meshes = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(geoFor(i), mats);
    m.name = `smoosh-card-${i}`;
    m.castShadow = true;
    m.receiveShadow = true;
    m.visible = false;
    group.add(m);
    meshes.push(m);
  }

  // ── THE WASH, SIMULATED ONCE, AND THEN PLAYED ─────────────────────────────────────────────────
  // Every drawing of this beat is a snapshot taken here, in order, so a frame of the take is a pure
  // lookup: deterministic under `?t=`, identical on every replay, and — the point — MEASURABLE.
  // tools/_rv11-mix.mjs drives the take and reads the same numbers the drawing reads.
  const rng = mulberry32(3100 + (ctx.seed | 0));
  const px = new Float64Array(N), pz = new Float64Array(N), pa = new Float64Array(N);
  // THE RAGGED BOUNDARY, in the ellipse's own units: how far out the raft goes at this bearing.
  // Normalised so its maximum is exactly 1 — the nominal ellipse is the frame's promise and the
  // raggedness is only ever allowed to eat inward from it.
  const edgePh = EDGE.map(() => rng() * 2 * Math.PI);
  const edgeSum = EDGE.reduce((s, e) => s + e[1], 0);
  const edgeAt = (th) => {
    let v = 1;
    for (let k = 0; k < EDGE.length; k++) v += EDGE[k][1] * Math.cos(EDGE[k][0] * th + edgePh[k]);
    return v / (1 + edgeSum);
  };
  // TWO BOUNDARIES, and they do different jobs. `clampRagged` is the ragged curve and it is used
  // to lay the wash out: a card that falls past the rim is folded back under it by a random last
  // few per cent, so nothing accumulates into a clean arc along the edge of the mass. `clampHard`
  // is the nominal ellipse — the frame's own promise, the line that keeps 78 cards off the edges
  // of the picture — and it is the only one the swirl is allowed to use. Folding to the RAGGED
  // curve every drawing was a ratchet: it trimmed the outermost cards a little each time while
  // the size correction pushed the inner ones out to compensate, and the raft quietly halved.
  const foldTo = (i, lim) => {
    const q = Math.hypot(px[i] / R.ax, (pz[i] - R.cz) / R.az);
    if (q < 1e-6 || q <= lim) return;
    const s = lim / q;
    px[i] *= s;
    pz[i] = R.cz + (pz[i] - R.cz) * s;
  };
  const clampRagged = (i) => foldTo(i, edgeAt(Math.atan2((pz[i] - R.cz) / R.az, px[i] / R.ax)) * (0.94 + rng() * 0.06));
  const clampHard = (i) => foldTo(i, 1);
  // WHERE THE SEVENTY-EIGHT LIE ONCE THE DECK IS WASHED OUT. Not a fill: a set of KNOTS of uneven
  // size, each card scattered round the one it was dealt to. Between the knots is bare cloth, in
  // the knots are three and four cards on top of each other, and the outline that comes out of it
  // is the ragged one above with lumps of its own — which is the photograph.
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const knot = [];
  for (let c = 0; c < R.clumps; c++) {
    const th = rng() * 2 * Math.PI, rr = Math.sqrt(rng()) * 0.86;
    const lim = edgeAt(th);
    knot.push({ x: R.ax * rr * lim * Math.cos(th), z: R.cz + R.az * rr * lim * Math.sin(th), w: 0.45 + rng() * rng() * 2.2 });
  }
  const wsum = knot.reduce((s, k) => s + k.w, 0);
  const slot = [];
  for (let i = 0; i < N - STRAY; i++) {
    let t = rng() * wsum, c = 0;
    while (c < knot.length - 1 && (t -= knot[c].w) > 0) c++;
    slot.push({ x: knot[c].x + gauss() * R.sig, z: knot[c].z + gauss() * R.sig * 0.78, a: (rng() - 0.5) * 2 * Math.PI });
  }
  // the strays: out at the rim, at bearings of their own, nowhere near a knot
  for (let i = 0; i < STRAY; i++) {
    const th = ((i + 0.25 + rng() * 0.7) / STRAY) * 2 * Math.PI;
    const rr = Math.min(1, (0.86 + rng() * 0.30) * edgeAt(th) + 0.10);
    slot.push({ x: R.ax * rr * Math.cos(th), z: R.cz + R.az * rr * Math.sin(th), a: (rng() - 0.5) * 2 * Math.PI, stray: true });
  }
  // AND THE HOLES. A heap pushed about by two hands has bare cloth showing through it — the
  // photograph does, plainly — and knots alone will not make one: twelve gaussians over an ellipse
  // this size overlap into a pavement. So a few discs of cloth are cleared: any card whose centre
  // falls inside one is pushed out to its rim, which opens the hole without moving anything else
  // and without changing the number of cards anywhere near it.
  for (let v = 0; v < R.voids; v++) {
    const th = rng() * 2 * Math.PI, rr = 0.28 + rng() * 0.52;
    const vx = R.ax * rr * Math.cos(th), vz = R.cz + R.az * rr * Math.sin(th) * 0.9;
    const vr = 0.030 + rng() * 0.022;
    for (const s of slot) {
      const d = Math.hypot(s.x - vx, (s.z - vz) * 1.35);
      if (d > vr || d < 1e-5) continue;
      const k = vr / d;
      s.x = vx + (s.x - vx) * k;
      s.z = vz + (s.z - vz) * k;
    }
  }
  // …and the whole scatter slid back onto the frame's axis. Knots of uneven weight in uneven
  // places do not average to nothing: this seed's came out 60 mm to the left, and a mass sitting
  // off to one side of two symmetrical hands is a composition fault, not a smoosh. A rigid
  // translation moves nothing relative to anything, so the raggedness and the gaps survive it.
  const mx = slot.reduce((a, s) => a + s.x, 0) / N, mz = slot.reduce((a, s) => a + s.z, 0) / N;
  for (let i = 0; i < N; i++) {
    px[i] = slot[i].x - mx;
    pz[i] = slot[i].z - mz + R.cz;
    if (slot[i].stray) clampHard(i);
    else clampRagged(i);
    slot[i].x = px[i];
    slot[i].z = pz[i];
  }
  // A PILE PUSHED OVER SPLAYS FROM THE TOP: the card on top slides furthest, the one on the cloth
  // hardly moves. So the deck's own order is mapped onto the raft by reach — card 0 (the bottom)
  // takes the nearest slot to the deck's square, card 77 the furthest — and the raft comes out
  // ORDERED. Spreading a deck does not shuffle it; it is the swirl that has to do that, and this
  // is what lets the measurement prove it did.
  const reachOf = (s) => Math.hypot(s.x - DX, s.z - DZ);
  const byReach = slot.map((_, k) => k).sort((a, b) => reachOf(slot[a]) - reachOf(slot[b]));
  const target = byReach; // deck card i → slot index target[i]
  // and the raft's own pile order, bottom to top: spread flat, a deck keeps the order it had
  let ord = Array.from({ length: N }, (_, i) => i);

  // one drawing: the pose of all seventy-eight, how many are in the squared pile, and both hands
  const ST = 5; // x, z, angle, y, visible
  const snaps = [];
  const rank = new Int32Array(N);
  function heights() {
    for (let r = 0; r < N; r++) rank[ord[r]] = r;
  }
  function snap(pile, vis, hl, hr, cue = null) {
    const p = new Float32Array(N * ST);
    heights();
    for (let i = 0; i < N; i++) {
      p[i * ST] = px[i];
      p[i * ST + 1] = pz[i];
      p[i * ST + 2] = pa[i];
      p[i * ST + 3] = Y + T / 2 + (rank[i] / N) * DEEP;
      p[i * ST + 4] = vis(i) ? 1 : 0;
    }
    snaps.push({ p, pile, hl, hr, cue });
  }
  // his hands, posed by their fingertips and pointed AWAY FROM HIS OWN SHOULDER, so neither arm
  // ever has to double back on itself to reach the cloth. `yaw` is always given as if for the
  // right hand and the left mirrors it, so the same number serves both when they are symmetric.
  // …and POSED BY THE PALM, not by the fingertips (reveal-hand.js → CONTACT). A hand in a smoosh
  // is not touching a card, it is lying on a heap of them and pushing: asked for by its fingertips
  // the drawing hangs 0.11 m down-frame of the spot, which put both palms off the near edge of the
  // raft with only the fingers in it — "both hands are IN it" is the fifth thing on the list.
  const yawR = (x, z) => Math.atan2(x - SHOULDER[0], z - SHOULDER[1]);
  const yawL = (x, z) => -Math.atan2(x + SHOULDER[0], z - SHOULDER[1]);
  const HR = (x, z, y, floor = 0, pose = 'splay') => ({ x, y, z, yaw: yawR(x, z), pose, side: 'R', floor, by: 'palm' });
  const HL = (x, z, y, floor = 0, pose = 'splay') => ({ x, y, z, yaw: yawL(x, z), pose, side: 'L', floor, by: 'palm' });
  const ALL = () => true;
  const NONE = () => false;

  // ---- 2 drawings: the squared deck, and both hands coming down onto it from up-frame ----------
  snap(N, NONE, HL(-R.hx - 0.03, DZ - 0.15, 0.078), HR(R.hx + 0.03, DZ - 0.15, 0.078));
  snap(N, NONE, HL(-0.052, DZ - 0.012, 0.010, deckH), HR(0.052, DZ - 0.012, 0.010, deckH));

  // ---- 6 drawings: THE WASH. The pile is pushed over and splayed out under two palms ------------
  // The top of the deck goes first and goes furthest; the pile under his hands thins card by card.
  const leaveAt = new Float64Array(N);
  for (let i = 0; i < N; i++) leaveAt[i] = ((N - 1 - i) / (N - 1)) * (WASH - RUN);
  const spill = []; // where each card starts: somewhere in the deck's own square
  // …and the scatter is ACROSS the deck's square, not along it. The deck stands 140 mm from the
  // near edge of the plan view and a card is 227 long, so a card jittered 45 mm down-frame of the
  // square puts its corner 19 mm off the bottom of the picture before the wash has even started.
  for (let i = 0; i < N; i++) spill.push({ x: DX + (rng() - 0.5) * card.w * 0.5, z: DZ + (rng() - 0.5) * card.h * 0.05, a: -DA + (rng() - 0.5) * 0.1 });
  for (let i = 0; i < N; i++) {
    px[i] = spill[i].x;
    pz[i] = spill[i].z;
    pa[i] = spill[i].a;
  }
  for (let k = 1; k <= WASH; k++) {
    let left = 0;
    for (let i = 0; i < N; i++) {
      const u = Math.min(1, Math.max(0, (k - leaveAt[i]) / RUN));
      if (u <= 0) left++;
      const s = slot[target[i]];
      px[i] = spill[i].x + (s.x - spill[i].x) * u;
      pz[i] = spill[i].z + (s.z - spill[i].z) * u;
      pa[i] = spill[i].a + (s.a - spill[i].a) * u;
    }
    // the palms travel out and up-frame with the cards they are pushing
    const u = k / WASH;
    const hxk = 0.052 + (R.hx + R.rx * 0.5 - 0.052) * u, hzk = DZ - 0.012 + (R.cz + R.rz * 0.4 - DZ + 0.012) * u;
    const vis = (i) => k > leaveAt[i];
    snap(left, vis, HL(-hxk, hzk, 0.003, DEEP), HR(hxk, hzk, 0.003, DEEP), k === 1 ? cues.wash : null);
  }
  const washed = snaps.length - 1; // the drawing the raft is complete on (the mixing probe's mark)

  // ---- 24 drawings: THE SWIRL ------------------------------------------------------------------
  // Two revolutions, twelve stepped drawings each — 30° of hand a drawing, which is a circle you
  // can see being described rather than a smear. The hands turn in OPPOSITE senses and start half
  // a turn apart, so one is always up-frame of the other and the raft between them is sheared, not
  // stirred: that is what actually mixes a deck, and the difference is measured.
  //
  // Every card inside a palm's reach is carried with it and turned about it, falling off as a
  // gaussian in `reach`; whatever the two hands together push past the raft's boundary is folded
  // back in, which is the other half of the mixing — the edge of a wash is where cards get buried.
  // The right hand's circle; the left is its MIRROR — same z, opposite x, turning the other way.
  // Symmetry about the frame's axis is the house rule and a plan view is where it is most visible,
  // and two hands circling in mirror image still shear the raft between them, because the sense of
  // each turn is opposite: they close on the middle together and open out together.
  const orbit = (k) => {
    const th = -Math.PI / 2 + (k / PER) * 2 * Math.PI;
    return { x: R.hx + R.rx * Math.cos(th), z: R.cz + R.rz * Math.sin(th) };
  };
  // THE LEFT HAND IS THE RIGHT ONE TURNED THROUGH HALF A CIRCLE, mirrored in x and half a turn
  // behind. It is worth saying why, because the house rule is symmetry about the frame's axis and
  // this is a rotational symmetry about the middle of the raft instead:
  //   · X IS MIRRORED, and that is the house rule doing its work: the two palms are the same
  //     distance from the frame's axis in every drawing, so the pair is balanced left and right
  //     whatever it is doing. Taking the whole circle half a turn round instead — which is what
  //     was here — put the SAME cos θ into both, and the pair slid bodily to the right of the
  //     picture and back twice a revolution, with the raft sitting still off to the left of them.
  //   · Z IS OPPOSITE. One hand is up-frame while the other is down, which (a) keeps two flat
  //     cut-outs 145 mm wide from lying through each other in one plane, and (b) is what MIXES:
  //     hands going round the same way carry the raft round with them, hands going opposite ways
  //     drag the middle of it against itself. That shear is what the measurement is for.
  const mirror = (k) => {
    const h = orbit(k);
    return { x: -h.x, z: 2 * R.cz - h.z };
  };
  let hR = orbit(0), hL = mirror(0);
  const carry = (h0, h1, w) => {
    const om = w; // the hand's own angular step this drawing, signed
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(px[i] - h1.x, pz[i] - h1.z);
      const g = Math.exp(-(d * d) / (R.reach * R.reach));
      px[i] += g * (h1.x - h0.x) * DRAG;
      pz[i] += g * (h1.z - h0.z) * DRAG;
      const a = g * om * SPIN, c = Math.cos(a), s = Math.sin(a);
      const ox = px[i] - h1.x, oz = pz[i] - h1.z;
      px[i] = h1.x + ox * c - oz * s;
      pz[i] = h1.z + ox * s + oz * c;
      pa[i] += a + (rng() - 0.5) * 0.06 * g;
    }
  };
  // A WASH KEEPS ITS AREA. Left to itself the flow above compacts the raft — the drag pulls cards
  // in toward the two orbits and nothing ever pushes them back out — and measured, the first cut
  // of this beat went from 0.191 m² to 0.059 over the swirl and its top layer fell from 61 cards
  // to 49: a heap collapsing, not a deck being washed.
  //
  // What was here to stop that nudged every card toward the radius its own rank would have in an
  // EVENLY FILLED ellipse. It did not hold the footprint, and worse, it was a machine for undoing
  // the two things the photograph is about: an even fill has no gaps in it and a filled ellipse
  // has no ragged edge. So the correction is ONE NUMBER — the whole raft scaled about its own
  // middle until the mean radius is what it was when the wash finished. A similarity transform
  // cannot round off an outline, cannot even out a density, cannot move one card relative to
  // another; it can only put back the size the drag took away.
  // It is measured on the raft's OUTER EDGE — the ninety-fifth of the 78 radii — not on their mean,
  // because the mean is the one number a clamp can hold still while the raft shrinks underneath
  // it: trim the outermost cards a little every drawing and push the inner ones out to compensate,
  // and the average never moves while the footprint ratchets away. That is exactly what happened.
  // ACROSS AND ALONG, SEPARATELY, and about the raft's own middle. Two hands do not compact a heap
  // evenly — they pull it up-frame and squeeze it across — so one radius put back about a fixed
  // point left the far edge of the raft ten centimetres short of where the wash had put it while
  // the near edge held. Three numbers a drawing: where the middle of the mass has got to, and how
  // wide and how deep it has become. Each of them is a rigid move or an axis scale, which is the
  // whole point: neither can move one card relative to another, round an outline off or fill a gap.
  const _q = new Float64Array(N);
  const spread = () => {
    let cx = 0, cz = 0;
    for (let i = 0; i < N; i++) { cx += px[i]; cz += pz[i]; }
    cx /= N;
    cz /= N;
    const q = (get) => {
      for (let i = 0; i < N; i++) _q[i] = Math.abs(get(i));
      const s = Array.from(_q).sort((a, b) => a - b);
      return s[Math.round(0.95 * (N - 1))];
    };
    return { cx, cz, wx: q((i) => px[i] - cx), wz: q((i) => pz[i] - cz) };
  };
  const holdSize = (w0, amt) => {
    const now = spread();
    if (now.wx < 1e-5 || now.wz < 1e-5) return;
    const sx = 1 + amt * (w0.wx / now.wx - 1), sz = 1 + amt * (w0.wz / now.wz - 1);
    for (let i = 0; i < N; i++) {
      px[i] = w0.cx + (px[i] - now.cx) * sx;
      pz[i] = w0.cz + (pz[i] - now.cz) * sz;
    }
  };
  const rideUp = (h, n) => {
    // the cards under a palm come up over their neighbours: the top layer of the raft — which is
    // all a plan view sees — is a different set of cards every drawing
    const near = ord.slice().sort((a, b) => Math.hypot(px[a] - h.x, pz[a] - h.z) - Math.hypot(px[b] - h.x, pz[b] - h.z)).slice(0, n);
    const set = new Set(near);
    ord = ord.filter((i) => !set.has(i)).concat(near);
  };
  const step = (2 * Math.PI) / PER;
  const q0 = spread(); // where and how big the wash left the raft: what the swirl has to give back
  for (let k = 1; k <= TURNS * PER; k++) {
    const nR = orbit(k), nL = mirror(k);
    carry(hR, nR, step);
    carry(hL, nL, -step);
    for (let i = 0; i < N; i++) clampHard(i);
    holdSize(q0, 1);
    // and again, because the size correction is what can push a card past the line: the nominal
    // ellipse is the frame's promise — nothing bisected by an edge — and it is checked last, on
    // every drawing, not only on the one the wash finishes on (tools/_rv11-win.mjs walks all 58).
    for (let i = 0; i < N; i++) clampHard(i);
    hR = nR;
    hL = nL;
    rideUp(hR, 3);
    rideUp(hL, 3);
    // The two palms are drawn 0.6 mm apart in height. They are flat cut-outs on one plane and they
    // do overlap at the top and the bottom of their circles — which is right, that is two hands in
    // one heap of cards — and two coplanar quads fight for the pixel where they cross.
    snap(0, ALL, HL(hL.x, hL.z, 0.003, DEEP), HR(hR.x, hR.z, 0.003, DEEP + 0.0006), k % 5 === 1 ? cues.smoosh : null);
  }
  const swirled = snaps.length - 1;

  // ---- 4 drawings: his hands come off the heap, AND THE WASH STAYS WHERE IT IS -------------------
  //
  // ROUND 12, AND IT IS THE USER'S NOTE: "what if the users picks directly from the swoosh, with all
  // cards layed out messily?" Round 11 raked the seventy-eight back into a squared pile here, and a
  // neat fan came out of that pile for the visitor to choose from. There is no fan. The mass IS the
  // pick surface: he presses it out into a band (reveal-pick.js → pushFrames) and the visitor takes
  // three straight out of it, so the rake belongs at the END of the reading now — it is what the
  // gather does (reveal-pick.js → gatherFrames), and the deck does not come back until then.
  // His hands simply lift off the heap, up the frame, and out of the picture.
  const off = (x, z, y, floor, cue = null) => snap(0, ALL, HL(-x, z, y, floor), HR(x, z, y, floor), cue);
  off(R.hx, R.cz - 0.03, 0.010, DEEP);
  off(R.hx + 0.02, R.cz - 0.16, 0.062, DEEP);
  off(R.hx + 0.04, R.cz - 0.30, 0.108, 0, cues.done);
  snap(0, ALL, null, null, null);
  // THE DECK'S NEW ORDER, bottom to top, as the gather will find it: the cards furthest from the
  // deck's square are raked first and end up at the bottom of the pile. Nothing here draws it — the
  // rake is reveal-pick's now — but the mixing probe (tools/_rv11-mix.mjs) measures the shuffle by
  // it, and a wash that is not measured is a wash nobody can defend.
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => Math.hypot(px[b] - DX, pz[b] - DZ) - Math.hypot(px[a] - DX, pz[a] - DZ));

  // ── the drawings ───────────────────────────────────────────────────────────────────────────────
  const frames = snaps.map((s, k) => () => {
    // The real deck is only ever drawn before the wash. Once it has been spilled it does not exist:
    // every card of it is on the cloth, and it comes back at the far end of the reading, when the
    // gather rakes the mass up (reveal-pick.js → gatherFrames).
    const real = k <= 1;
    showReal(real);
    if (real) hideTemps();
    else {
      const u = Math.round(units(s.pile));
      if (u > 0) {
        cards(PILE, u, 0);
        flat(PILE, 0, 0, 0);
      } else PILE.visible = false;
    }
    const p = s.p;
    for (let i = 0; i < N; i++) {
      const m = meshes[i];
      const on = p[i * ST + 4] > 0;
      m.visible = on;
      if (!on) continue;
      m.position.set(p[i * ST], p[i * ST + 3], p[i * ST + 1]);
      m.rotation.set(Math.PI, -p[i * ST + 2], 0);
    }
    s.cue?.();
  });
  hold(frames, 2);

  const api = {
    frames,
    temps,
    W,
    H,
    stacks: S,
    group,
    meshes,
    raft: R,
    // what the mixing probe needs: the drawing the raft is complete on, the drawing the swirl ends
    // on, and the deck's new order bottom-to-top in terms of where each card started
    marks: { washed, swirled, raked: snaps.length - 1 },
    order: () => order.slice(),
    // WHERE THE WASH LIES WHEN HIS HANDS COME OFF IT — the seventy-eight, in world metres on the
    // cloth, bottom of the heap first. This is the beat's whole output now: reveal-pick.js starts
    // its push-out from exactly these poses, so the mass the visitor sees opening is the mass he
    // just washed and not a second drawing of one.
    rest: () => {
      const s = snaps[snaps.length - 1].p;
      return Array.from({ length: N }, (_, i) => ({ x: s[i * ST], z: s[i * ST + 1], ang: s[i * ST + 2], rank: (s[i * ST + 3] - Y - T / 2) / DEEP }));
    },
    // the wash taken off the cloth in one drawing: the pick piece's own seventy-eight take over from
    // these at the same poses, so the swap is invisible
    hideCards() {
      for (const m of meshes) m.visible = false;
      PILE.visible = false;
    },
    dispose() {
      for (const m of meshes) group.remove(m);
      for (const g of geos) g?.dispose?.();
      geos.length = 0;
      meshes.length = 0;
      ctx.scene.remove(group);
      S.dispose(temps);
    },
  };
  if (!hand) return api;
  api.frames = compose([
    { offset: 0, frames },
    { offset: 0, frames: handFrames(hand, snaps.map((s) => s.hl ?? { off: true }).concat([null, null])) },
    { offset: 0, frames: handFrames(hand, snaps.map((s) => s.hr ?? { off: true }).concat([null, null])) },
  ]);
  return api;
}
