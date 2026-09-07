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
//   6  THE SPLAY: the pile pushed over and opened out under two palms into a mass of 78 cards, the
//      deck thinning card by card as they leave it — the top of the deck travels furthest
//  30  THE SWIRL: three revolutions, ten stepped drawings each. The hands describe slow circles in
//      OPPOSITE senses, mirrored across the frame's axis and half a turn apart, so one is always
//      up-frame of the other; every card inside a hand's reach is carried round with it and turned
//      with it, and the two counter-rotations shear the mass between them. Cards under a palm ride
//      up over their neighbours, so the top layer — which is all a plan view sees — is a different
//      set of cards every drawing. THE LAST TWELVE OF THESE ARE THE SETTLE (round 6, the user:
//      "lets remove: story card and push out"): the cards come to rest, under his working hands, on
//      reveal-wash.js's own poses — the arrangement the pointer, the grip, the camera's plate and
//      the spoken ordinal are all measured against — so that nothing has to be pushed out into a
//      band afterwards. The seventeen drawings that used to do that are gone.
//   4  his hands off the heap, up the frame, and out — AND THE WASH IS ALREADY AT REST. There is no
//      rake here and no squared pile: the visitor picks out of this mass, so the deck does not come
//      back until the gather at the end of the reading (reveal-pick.js).
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
import { WASH, LIFT, confine, bandCfg } from './reveal-wash.js';

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

// ── WHERE THE WASH LIES, AND WHOSE ARRANGEMENT IT IS ───────────────────────────────────────────
// The user sent a photograph of a real smoosh on a real table and BRIEF.md records it as five
// things to check: the cards lie FLAT; they are at EVERY angle; they overlap heavily and
// irregularly, with stacks of three and four, gaps of bare cloth and a ragged outline; the mass is
// several cards across each way; both hands are IN it while it is being pushed.
//
// ROUND 11 laid the mass here, on an ellipse of its own with a ragged boundary curve, twelve
// knots, three bays and twelve strays — and then round 12 pushed that mass out into a BAND for the
// visitor to pick along, because a heap has no left-to-right ranks and "the third from the left"
// has to mean something. ROUND 6 OF THE FLOW REMOVES THE PUSH-OUT (the user: "lets remove: story
// card and push out"), so the mass this beat leaves is the mass the visitor picks from, and it
// therefore has to satisfy everything a pick surface owes as well as everything the photograph
// asks: clear of the three reading slots, inside the frame and the rim, and ranked and evened
// across the picture.
//
// reveal-wash.js solves precisely that, and it is the arrangement the pointer, the grip, the
// camera's plate and the spoken ordinal are all measured against (tools/_rv12-band.mjs,
// _rv8-point.mjs, _rv13-grip.mjs). So there is no second arrangement here any more: this file
// SPLAYS the deck out into reveal-wash's poses, swirls the cards about under both palms, and
// settles them back onto those same poses before his hands come off. The photograph's five checks
// are met by that layout — measured, 88 % of the mass three or more cards deep, 8.5 % bare cloth
// inside its own outline, no two angles alike — and they are measured where they matter now, on
// the surface the visitor actually chooses from.
//
// What is left in this block is the HANDS: where a palm orbits, how wide the circle is, and how far
// a palm carries the cards under it. Two mirrored circles have to work the WHOLE mass — a hand that
// never reaches the ends of it leaves the cards there exactly as the deck spilled them, and the
// mixing probe (tools/_rv11-mix.mjs) reads that straight off the ranks.
const TALL_BELOW = 1.25; // the shape at which the mass re-lays, and the hands with it
// THE CIRCLE IS SMALL AND THE REACH IS LONG, and that is the whole of the tuning. A palm carries
// the cards under it (`DRAG`, 0.92 of its own travel), so a hand that TRAVELS across the mass does
// not mix it, it transports it: circles of 98 mm radius over this band pulled the seventy-eight out
// into two clumps with bare cloth between them, which is two piles being pushed apart and is the
// picture the user asked to be rid of. A palm working in a small circle with a long reach shears the
// cards round itself instead, which is what a wash is. The circle is sized to stay ON the mass — the
// band's centres run to about |x| 0.24 across and 37 mm deep, so 58 mm of x and 34 mm of z keeps
// both palms inside it — and the reach, not the travel, is what gets to the ends of it.
const RAFT = {
  //     where a palm orbits (x of its centre, and the circle's two radii), and how far it reaches
  wide: { hx: 0.125, rx: 0.058, rz: 0.034, reach: 0.145 },
  tall: { hx: 0.055, rx: 0.026, rz: 0.048, reach: 0.120 },
};
const DEEP = 0.016; // the raft's own thickness, drawn: 78 cards of 0.8 mm would be 62
const N = 78; // the deck, the user's rule
// Stepped drawings per revolution of a hand — 36 degrees a drawing, which is a circle you can
// see being described rather than a smear — and how many revolutions the wash gets. THREE, not two:
// two read as a stir and left five of the seventy-eight within three ranks of where they started.
const PER = 10;
const TURNS = 3;
const SPLAY = 6; // drawings the squared deck takes to open out into the wash
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

  // ── WHERE THE SEVENTY-EIGHT COME TO REST, AND IT IS NOT THIS FILE'S ARRANGEMENT (round 6) ──────
  //
  // THE USER: "lets remove: story card and push out." The push-out was the second half of this
  // beat — his palms came back down on the churn and travelled out to the ends of the cloth,
  // seventeen more drawings, and the mass opened into a band the visitor picked along. It is gone.
  // The visitor picks from the mass THIS take leaves, which means this take has to leave the mass
  // in the one place a pick surface is allowed to be:
  //   · clear of the three reading slots, because a chosen card lands in that bar and nothing may
  //     be lying under one;
  //   · inside the frame the choosing is composed on, and inside the table's rim;
  //   · and RANKED AND EVENED LEFT TO RIGHT, which is the whole of the ordinal. "The third from the
  //     left" is a subscript into reveal-wash.js's poses, and a heap has no ranks. That ordering
  //     used to be the push-out's one real job.
  // reveal-wash.js already solves exactly that (`layout` → knots, bays, every angle, `evenOut`,
  // `confine`), and its answer is what the pointer, the grip, the camera's plate and the ordinal
  // are all measured against. So the wash's poses are this beat's TARGET rather than a second
  // arrangement it has to be pushed into: the deck is splayed straight out into them, swirled about
  // under both palms, and settled back onto them before his hands come off. Nothing is pushed and
  // nothing is squared. What used to be a separate `fan` beat is one drawing of hand-over.
  const slot = WASH.poses.map((p) => ({ x: p.x, z: p.z, a: p.ang }));
  const B = WASH.bounds; // the box the mass occupies, corners and all
  const CZ = (B.z0 + B.z1) / 2 + LIFT.z / 2; // the middle of it down the frame (z0 carries the hover's travel)

  // The swirl's own boundary is the wash's, angle for angle: a card is held off the reading row and
  // inside the rim by the same solver that laid the poses, so nothing the hands do can push a card
  // somewhere the mass is not allowed to be. (It replaces an ellipse and a ragged closed curve of
  // this file's own, which knew about the frame but not about the reading row — it did not have to,
  // because the push-out came afterwards and corrected everything.)
  const cfg = bandCfg();
  const NOSLACK = { x: 0, z: 0, r: 0 };
  const _c = { x: 0, z: 0, ang: 0 };
  const clampHard = (i) => {
    _c.x = px[i];
    _c.z = pz[i];
    _c.ang = pa[i];
    confine(_c, cfg, NOSLACK);
    px[i] = _c.x;
    pz[i] = _c.z;
  };
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
  for (let i = 0; i < N; i++) leaveAt[i] = ((N - 1 - i) / (N - 1)) * (SPLAY - RUN);
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
  for (let k = 1; k <= SPLAY; k++) {
    let left = 0;
    for (let i = 0; i < N; i++) {
      const u = Math.min(1, Math.max(0, (k - leaveAt[i]) / RUN));
      if (u <= 0) left++;
      const s = slot[target[i]];
      px[i] = spill[i].x + (s.x - spill[i].x) * u;
      pz[i] = spill[i].z + (s.z - spill[i].z) * u;
      pa[i] = spill[i].a + (s.a - spill[i].a) * u;
      // …AND HELD INSIDE THE PICTURE ON THE WAY OUT. A card leaves the deck squared and lands at
      // any angle, and it is TURNING as it slides: at three-quarters of the way it can be pointing
      // straight down the frame, which is the attitude in which it reaches furthest, and measured
      // it put a corner 21 mm past where a card is allowed to come to rest and 2 mm off the near
      // edge of the plate. The mass's own boundary is applied with the card's travel, so a card
      // still lying in the deck's square is not dragged out of it and one that has arrived is
      // already where the wash confined it — the correction only bites in between.
      if (u > 0) {
        _c.x = px[i];
        _c.z = pz[i];
        _c.ang = pa[i];
        confine(_c, cfg, NOSLACK);
        px[i] += (_c.x - px[i]) * u;
        pz[i] += (_c.z - pz[i]) * u;
      }
    }
    // the palms travel out and up-frame with the cards they are pushing
    const u = k / SPLAY;
    const hxk = 0.052 + (R.hx + R.rx * 0.5 - 0.052) * u, hzk = DZ - 0.012 + (CZ + R.rz * 0.4 - DZ + 0.012) * u;
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
    return { x: R.hx + R.rx * Math.cos(th), z: CZ + R.rz * Math.sin(th) };
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
    return { x: -h.x, z: 2 * CZ - h.z };
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
  // ── THE SETTLE: the swirl ENDS ON THE WASH'S OWN POSES (round 6) ───────────────────────────────
  //
  // There is no push-out to correct anything afterwards, so the last third of the swirl is where
  // the mass comes to rest — under his hands, while they are still working it, which is where a
  // heap of cards settles in life. Each card is drawn onto a pose of reveal-wash's by an attractor
  // that reaches exactly 1 on the last drawing of the swirl, so the four drawings of his hands
  // lifting off play over a mass that has already stopped moving, and the pick piece's own
  // seventy-eight can take over at the identical poses one drawing later.
  //
  // WHICH CARD TAKES WHICH POSE is chosen to make the settle as small as it can be. The washed
  // cards are interchangeable — they are face-down placeholders, all alike — so the pairing is free:
  // rank by rank across the picture first (the shortest possible pairing in x on its own, and it is
  // the axis the ordinal is counted on), then improved by swapping pairs while a swap shortens the
  // two travels taken together, counting a turn of the card as well as a slide of it. Measured, that
  // leaves a settle of a few millimetres a drawing — less movement than the swirl the visitor has
  // been watching for two seconds.
  const SETTLE = 12;
  const SPIN_COST = 0.02; // a half-turn of a card counted as 63 mm of travel, in the pairing above
  let tx = null, tz = null, ta = null;
  const angNear = (a, t) => t + 2 * Math.PI * Math.round((a - t) / (2 * Math.PI));
  function chooseRest() {
    const P = WASH.poses; // already sorted left to right: pose k is the (k+1)-th from the left
    const to = new Int32Array(N);
    Array.from({ length: N }, (_, i) => i)
      .sort((a, b) => px[a] - px[b])
      .forEach((i, k) => (to[i] = k));
    const cost = (i, j) => {
      const p = P[j], da = angNear(pa[i], p.ang) - pa[i];
      return (px[i] - p.x) ** 2 + (pz[i] - p.z) ** 2 + (SPIN_COST * da) ** 2;
    };
    const rr = mulberry32(5150 + (ctx.seed | 0));
    for (let n = 0; n < 12000; n++) {
      const a = (rr() * N) | 0, b = (rr() * N) | 0;
      if (a === b) continue;
      const ja = to[a], jb = to[b];
      if (cost(a, ja) + cost(b, jb) > cost(a, jb) + cost(b, ja)) {
        to[a] = jb;
        to[b] = ja;
      }
    }
    tx = new Float64Array(N);
    tz = new Float64Array(N);
    ta = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const p = P[to[i]];
      tx[i] = p.x;
      tz[i] = p.z;
      ta[i] = angNear(pa[i], p.ang);
    }
    // …and the HEAP'S ORDER with it. A card has to end up lying as high in the mass as the pose it
    // takes says (reveal-wash's own rank), or the hand-over would restack all seventy-eight in one
    // drawing and the top layer — which is the whole of what a plan view sees — would change under
    // the visitor's eye. It is set once, here, and `rideUp` stops for the rest of the beat.
    const next = new Array(N);
    for (let i = 0; i < N; i++) next[P[to[i]].rank] = i;
    ord = next;
  }

  const step = (2 * Math.PI) / PER;
  const q0 = spread(); // where and how big the splay left the mass: what the swirl has to give back
  const TURNSTEPS = TURNS * PER;
  for (let k = 1; k <= TURNSTEPS; k++) {
    const nR = orbit(k), nL = mirror(k);
    carry(hR, nR, step);
    carry(hL, nL, -step);
    const m = k - (TURNSTEPS - SETTLE); // 1..SETTLE once the mass is coming to rest
    if (m <= 0) {
      for (let i = 0; i < N; i++) clampHard(i);
      holdSize(q0, 1);
      // and again, because the size correction is what can push a card past the line: the mass's
      // boundary is the frame's promise — nothing bisected by an edge, nothing over the reading
      // row — and it is checked last, on every drawing (tools/_rv11-win.mjs walks all 44).
      for (let i = 0; i < N; i++) clampHard(i);
    } else {
      if (!tx) chooseRest();
      const w = 1 / (SETTLE - m + 1); // reaches 1 on the last drawing: the mass lands exactly
      for (let i = 0; i < N; i++) {
        px[i] += (tx[i] - px[i]) * w;
        pz[i] += (tz[i] - pz[i]) * w;
        pa[i] += (ta[i] - pa[i]) * w;
      }
      // and the boundary still holds while it settles: his palms are still dragging cards about
      // (`carry`, above) and a drag is not bound by anything. Without this a card pushed outward
      // early in the settle is only pulled back in proportion to how far through the settle it is,
      // and measured, three of them crossed the near edge of the frame by 84 mm on the way. On the
      // last drawing the attractor has already landed the card on a pose the wash confined, so this
      // is a no-op there and the mass ends exactly where reveal-wash put it.
      for (let i = 0; i < N; i++) clampHard(i);
    }
    hR = nR;
    hL = nL;
    if (m <= 0) {
      rideUp(hR, 3);
      rideUp(hL, 3);
    }
    // The two palms are drawn 0.6 mm apart in height. They are flat cut-outs on one plane and they
    // do overlap at the top and the bottom of their circles — which is right, that is two hands in
    // one heap of cards — and two coplanar quads fight for the pixel where they cross.
    snap(0, ALL, HL(hL.x, hL.z, 0.003, DEEP), HR(hR.x, hR.z, 0.003, DEEP + 0.0006), k % 5 === 1 ? cues.smoosh : null);
  }
  const swirled = snaps.length - 1;

  // ---- 4 drawings: his hands come off the heap, AND THE WASH IS ALREADY AT REST -------------------
  //
  // ROUND 12 (the user: "what if the users picks directly from the swoosh, with all cards layed out
  // messily?") deleted the rake that used to be here and the neat fan that came out of it: the mass
  // IS the pick surface. ROUND 6 OF THE FLOW (the user: "lets remove … push out") deletes the other
  // half of that answer — the seventeen drawings in which he pressed the churn out into a band. The
  // settle above has already brought every card onto the pose it will be chosen from, so these four
  // drawings are exactly what they say: two hands lifting off a mass that is not moving, up the
  // frame and out of the picture. The rake is the GATHER's, at the far end of the reading
  // (reveal-pick.js → gatherFrames), and the deck does not come back until then.
  const off = (x, z, y, floor, cue = null) => snap(0, ALL, HL(-x, z, y, floor), HR(x, z, y, floor), cue);
  off(R.hx, CZ - 0.03, 0.010, DEEP);
  off(R.hx + 0.02, CZ - 0.16, 0.062, DEEP);
  off(R.hx + 0.04, CZ - 0.30, 0.108, 0, cues.done);
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
    // the hands' circles, and the box the mass lies in — what anything asking this take how big the
    // wash is wants (reveal.js → smooshBounds, tools/_rv11-win.mjs)
    raft: { ...R, ax: B.x, cz: CZ, az: (B.z1 - B.z0) / 2 },
    // what the mixing probe needs: the drawing the splay is complete on, the drawing the swirl ends
    // on, and the deck's new order bottom-to-top in terms of where each card started
    marks: { washed, swirled, raked: snaps.length - 1 },
    order: () => order.slice(),
    // WHERE THE WASH LIES WHEN HIS HANDS COME OFF IT — the seventy-eight, in world metres on the
    // cloth. Since round 6 this is reveal-wash's own arrangement, card for card: the settle lands
    // on it, so the pick piece lays its seventy-eight at the identical poses in the drawing this
    // beat's cards leave the cloth, and the hand-over cannot be seen. reveal-pick.js checks it.
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
