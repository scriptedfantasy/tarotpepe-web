// reveal-pick.js — THE WASH ON THE TABLE, AND THE VISITOR TAKES THREE OUT OF IT. Drawn on twos.
//
// ROUND 12, THE USER: "i see you did a swoosh shuffle, then pepe stacks the cards, then the users
// picks from the cleanly layed out set. what if the users picks directly from the swoosh, with all
// cards layed out messily?" They are right, and it is how a reading works: a reader washes the deck
// and has you take three out of the wash. So the mass IS the pick surface. This file replaces
// reveal-fan.js, and with it go the six nested bows, the eight-bow portrait nesting, the keystone
// laid last on the frame's axis, the handfuls cascading out of his palm and the neighbours stepping
// apart round the hovered card — all of that was the shape of an arc and there is no arc.
//
// WHAT SURVIVES, because it is the user's rule or the show's contract:
//   · ALL 78 CARDS, face down on the cloth. Never a sub-section.
//   · A CARD LIFTS UP THE FRAME on hover, never down: −z in these plan views, and it rides clear of
//     the whole heap so the whole of it is drawn over everything it was lying under. That raised
//     card is the tap target — a thumb cannot hit one of seventy-eight overlapping cards, and no
//     lens fixes that, so the pick is in two movements exactly as it was: the finger names a card
//     by WHERE IT IS ON THE CLOTH (reveal-wash.js → indexAt, the top card under the point), that
//     card stands up out of the mass, and THAT is what is tapped.
//   · SPEAKING STILL WORKS. `remaining()` is ordered left to right across the picture and the band
//     is laid with ranked, evened x's (reveal-wash.js → evenOut), so "the third from the left" is
//     the third card in from the left edge of the mass and `pickByOrdinal` is a subscript.
//   · Nothing passes through anything, and no corner past the rim: the band is confined to what the
//     cloth leaves (reveal-wash.js → confine). Measured over all three new takes with a real
//     collision sweep, tools/_rv12-clear.mjs: nearest approach to a prop 85 mm, and nothing on the
//     cloth further than 594 mm from the middle against a rim of 620.
//   · The three chosen cards land in the reading row and stay there, in `picks` with their meshes,
//     for the flow's tap-to-see-again raycast.
//
// The mass's cards are placeholders: the deck's own back and stock materials on a near-flat card
// with no front art. Each position is dealt a card from a shuffled deck (the visitor cannot know
// which); the real card, with its front, is made only when a placeholder is picked.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { cardGeometry } from './cards-geometry.js';
import { compose, dealTrack, handFrames, handSide, laidPose } from './reveal-takes.js';
import { deckStacks } from './reveal-shuffle.js';
import { WASH, bandFor, indexAt, nearBand, LIFT, DEEP, cardCorners } from './reveal-wash.js';

const PI = Math.PI;
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// where each arm is anchored, for pointing a hand away from its own shoulder (reveal-hand.js HAND)
const SHOULDER = [0.291, -0.82];
const yawR = (x, z) => Math.atan2(x - SHOULDER[0], z - SHOULDER[1]);
const yawL = (x, z) => -Math.atan2(x + SHOULDER[0], z - SHOULDER[1]);
// his two palms on the heap: posed by the MIDDLE OF THE PALM, not the fingertips, because a hand in
// a wash is not touching a card, it is lying on a heap of them and pushing (reveal-hand.js CONTACT)
const HR = (x, z, y, floor = 0, pose = 'splay') => ({ x, y, z, yaw: yawR(x, z), pose, side: 'R', floor, by: 'palm' });
const HL = (x, z, y, floor = 0, pose = 'splay') => ({ x, y, z, yaw: yawL(x, z), pose, side: 'L', floor, by: 'palm' });

// ── THE CARD IS TAKEN BY A CORNER (round 13) ──────────────────────────────────────────────────────
// THE USER, watching the hand come down on the card he had chosen: "review the picker hand as well,
// right now it picks the middle of the card, which makes no sense". It does not. A person takes a
// card by an edge or a CORNER — a palm laid flat on the face of one is how you hold a card DOWN, not
// how you lift it — and in this wash the middle of a card is usually under its neighbour, so the
// corner is the only part of it there is to take. (BRIEF.md carries it as a rule now.)
//
// WHICH CORNER, and why. Two rules, in this order:
//   · IT IS ONE OF THE TWO ON HIS SIDE OF THE CARD. Measured as DEPTH along his own reach — how far
//     past the card's middle a corner lies — and not as plain distance, because the two ends of a
//     near edge lying square across the reach are both a little FURTHER from the shoulder than the
//     middle is, and neither of them is beyond it. His arm comes in over the top edge of the frame
//     (reveal-hand.js: the drawing enters from his side and the sleeve runs back to his own wrist),
//     so a corner on his side is the first the hand meets and the arm never crosses the card's face
//     to reach it. It is the argument the turn was corrected by in round 9: "a hand that lies over
//     the card it is about to turn is a hand you cannot see".
//   · AND, OF THOSE TWO, ONE THE VISITOR COULD SEE. A corner that lay UNDER a higher card while the
//     mass was closed loses to one that was showing on the same card, so the fingers take the corner
//     they were looking at when they chose it. Often neither was showing — this wash buries three
//     corners or more on 55 of the 78 — and then it is simply the deeper of the two.
// The chosen corner is kept in the CARD'S OWN FRAME, so the fingers stay on that same corner while
// the card comes up out of the mass, travels and turns under them. Measured in tools/_rv13-grip.mjs:
// over the whole wash the nip is 120 mm out of the middle of its card and on his side of it, every
// time; it is the nearest corner of the four on 96 % of them and the exposure rule takes the rest.
const GRIP_IN = 0.011; // how far in along the card's diagonal the nip sits, so the two fingers straddle the corner

// the four corners in the mesh's own frame — cards-geometry: the width runs along x and the art's
// top toward −z — as [x, z] pairs
const localCorners = (w, h) => [
  [-w / 2, -h / 2],
  [w / 2, -h / 2],
  [w / 2, h / 2],
  [-w / 2, h / 2],
];
// …and where one of them falls on the cloth for a face-DOWN card, centred at (x, z) with
// rotation.set(PI, ry, 0). Worked out from the Euler itself and not guessed: with x = PI the local
// x axis goes to (cos ry, 0, sin ry) and the local z axis to (sin ry, 0, −cos ry) — the flip
// reverses the second one, which is what turns a plain yaw into this pair of signs. (The first cut
// of this had the sines the other way round, which is a REFLECTION: it lands the same 131 mm from
// the middle of the card and is not a corner at all except when the card lies square. It is checked
// against the mesh's own matrix over all 78 cards in tools/_rv13-grip.mjs.)
function cornerAt(x, z, ry, lc) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x: x + lc[0] * c + lc[1] * s, z: z + lc[0] * s - lc[1] * c };
}
// Was this point on the cloth under a card lying HIGHER in the heap? Answered off the wash's own
// footprints and ranks, which is how the eye answers it (reveal-wash.js → indexAt does the same sum
// for the pointer), so "the visitor could see this corner" means the same thing to both.
const REACH = Math.hypot(WASH.card.w, WASH.card.h) / 2;
function coveredAt(x, z, rank) {
  for (const p of WASH.poses) {
    if (p.rank <= rank) continue; // lying under this card: it cannot bury anything of it
    if (Math.hypot(p.x - x, p.z - z) > REACH) continue;
    const q = cardCorners(p);
    let inside = false;
    for (let i = 0, k = q.length - 1; i < q.length; k = i++)
      if (q[i][1] > z !== q[k][1] > z && x < ((q[k][0] - q[i][0]) * (z - q[i][1])) / (q[k][1] - q[i][1]) + q[i][0]) inside = !inside;
    if (inside) return true;
  }
  return false;
}

// player: { play(frames, opts) → Promise } — the piece's take player (reveal.js)
// hand: the reveal-hand api, or null. His hands push the mass out, take the card and rake it up.
// slots: the row reveal.js lays its three cards in (reveal-takes.js → stagedRow).
// restMass: () → the seventy-eight poses the smoosh left on the cloth, or null (reveal.js hands
//           this straight off the shuffle take, so the push-out starts where the swirl ended).
export function buildPick(ctx, cards, player, hand = null, slots = ctx.layout.spread.slots, restMass = () => null) {
  const { card, y: Y } = ctx.layout.spread;
  const W = card.w, H = card.h, T = card.t;
  const deck = cards?.deck ?? null;
  const sound = (name) => ctx.pieces.sound?.play?.(name);
  const pepe = () => ctx.pieces.pepeAnim;
  const N = WASH.total;

  const group = new THREE.Group();
  group.name = 'fan'; // the group the sweeps and the ink pass have always looked for
  ctx.scene.add(group);

  // ---- the placeholder card: the deck's materials on a near-flat sheet ---------------------------
  const deckTop = deck?.getObjectByName?.('deck-top') ?? null;
  const block = deck?.children.find((c) => c.isMesh && c.name.startsWith('deck-block')) ?? null;
  const mats = Array.isArray(deckTop?.material)
    ? deckTop.material
    : block && Array.isArray(block.material)
      ? [block.material[1], block.material[0], block.material[1]]
      : new THREE.MeshLambertMaterial({ color: '#efe8d7' });
  // three sheets, each bent a hair its own way, so a heap of them stacks without the cards passing
  // through one another
  const geos = [];
  function geoFor(k) {
    const j = k % 3;
    if (!geos[j]) {
      const rng = mulberry32(880 + j);
      geos[j] = cardGeometry({ w: W, h: H, t: T, r: 0.005, nx: 6, ny: 10, arcN: 6, curl: 0.0001 + rng() * 0.00008, curlX: 0.00003, twist: (rng() - 0.5) * 0.0001 });
    }
    return geos[j];
  }
  function disposeGeos() {
    for (const g of geos) g?.dispose?.();
    geos.length = 0;
  }

  // ---- the deck while the wash is out ------------------------------------------------------------
  // It is not there. Every card of it is on the cloth — that is what a wash IS — so the deck object
  // is hidden from the moment the smoosh spills it until the rake squares it again. `deckDrawing(0)`
  // is how that is said: the temporary stack with nothing in it, and the real blocks off.
  let S = null, REST = null, PACKET = null;
  function stacks() {
    if (!S && deck) {
      S = deckStacks(deck, T);
      if (S) {
        REST = S.stack('pick-rest');
        PACKET = S.stack('pick-packet');
      }
    }
    return S;
  }
  const units = (n) => (S ? (n * S.nTotal) / N : n);
  function deckDrawing(left) {
    const s = stacks();
    if (!s) return;
    s.showReal(false);
    const u = Math.round(units(left));
    if (u > 0) {
      s.cards(REST, u, 0);
      s.flat(REST, 0, 0, 0);
    } else REST.visible = false;
    PACKET.visible = false;
  }
  function deckReal() {
    if (!S) return;
    S.showReal(true);
    S.hide([REST, PACKET]);
  }
  // deck-local → world (the deck group is rotated a hair on the cloth)
  function deckToWorld(x, y, z) {
    const p = new THREE.Vector3(x, y, z);
    if (deck) {
      deck.updateMatrixWorld(true);
      deck.localToWorld(p);
    } else p.add(new THREE.Vector3(...ctx.layout.deck.pos));
    return p;
  }
  const deckYaw = () => (deck ? deck.rotation.y : ctx.layout.deck.rotY);

  // ---- the cards in the mass ---------------------------------------------------------------------
  // entry: { i (0 = the leftmost card of the seventy-eight), mesh, slug, lift 0|0.5|1 (the hover),
  //          flying (a take owns the mesh), removed }
  const entries = [];
  const picks = [];
  // judged frames are seeded; a visitor's evening is not
  const liveRng = () => (!ctx.shotMode && !ctx.clock.frozen && !ctx.params?.has?.('seed') ? ctx.rng.fork(((Date.now() / 1000) & 0xffff) + 1) : ctx.rng);
  function makeEntries() {
    clear();
    picks.length = 0;
    const list = cards?.DECK?.length ? cards.DECK : [{ slug: 'the-fool' }];
    const order = liveRng().shuffle(list);
    for (let i = 0; i < N; i++) {
      const mesh = new THREE.Mesh(geoFor(i), mats);
      mesh.name = `fan-card-${i}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.fan = i;
      mesh.rotation.x = PI;
      mesh.visible = false;
      group.add(mesh);
      entries.push({ i, mesh, slug: order[i % order.length].slug, lift: 0, liftTarget: 0, flying: false, removed: false });
    }
  }

  // WHERE A CARD LIES IN THE MASS — straight off reveal-wash.js, with no jitter in between. The
  // drawing and the pointer read the same numbers, so what stands up under a finger is always the
  // card that is drawn there (measured: 100 % on a 2 mm grid, tools/_rv12-band.mjs).
  //
  // The heap is 78 cards deep in places and rides `DEEP` proud of the cloth; a card's own height in
  // it is its rank. THE LIFTED CARD CLEARS THE WHOLE HEAP — not five thicknesses, as the shingled
  // fan needed, because on a scatter a card that rises five thicknesses is still buried under three
  // of its neighbours and the visitor is looking at somebody else's card.
  const _r = {};
  function restPose(e, out = _r) {
    const p = WASH.poses[e.i] ?? WASH.poses[0];
    out.x = p.x;
    out.z = p.z;
    out.ang = p.ang;
    out.y = Y + T / 2 + (p.rank / N) * DEEP;
    out.ry = -p.ang; // a card lying face DOWN is yawed the other way by the flip
    out.roll = 0; // flat on the cloth: the photograph's first check
    return out;
  }
  // WHICH CORNER OF THIS CARD HIS FINGERS TAKE — the argument is at the head of the file. Worked out
  // on the card's RESTING pose, where the wash's ranks say what was buried and what was showing, and
  // returned in the card's own frame, so it is the same corner however far the card has since been
  // stood up or carried.
  const LOCAL = localCorners(W, H);
  function gripCorner(e, side) {
    const r = restPose(e, {});
    const rank = WASH.poses[e.i]?.rank ?? 0;
    const sx = side === 'L' ? -SHOULDER[0] : SHOULDER[0], sz = SHOULDER[1];
    // How far INTO the card a corner is, measured along his own reach: negative is the near half,
    // the half his fingers can get to without lying on the card. Depth and not plain distance,
    // because the two corners of a near edge lying square across the reach are both a little
    // further from the shoulder than the card's middle is and neither is "beyond" it.
    const mid = Math.hypot(r.x - sx, r.z - sz) || 1;
    const ux = (r.x - sx) / mid, uz = (r.z - sz) / mid;
    const scored = LOCAL.map((lc) => {
      const c = cornerAt(r.x, r.z, r.ry, lc);
      return { lc, depth: (c.x - r.x) * ux + (c.z - r.z) * uz, covered: coveredAt(c.x, c.z, rank) };
    }).sort((a, b) => a.depth - b.depth);
    // the two on HIS SIDE of the middle, and never the far pair: a hand that reaches past the middle
    // of a card to take the far corner is lying on the card, which is the whole complaint
    const near = scored.filter((s) => s.depth < 0);
    const pick = near.length ? near : scored.slice(0, 1);
    return (pick.find((s) => !s.covered) ?? pick[0]).lc;
  }
  const liftedY = Y + T / 2 + DEEP + LIFT.y;
  function applyEntry(e) {
    if (e.flying || e.removed) return;
    const r = restPose(e);
    const k = e.lift;
    e.mesh.visible = true;
    e.mesh.position.set(r.x, lerp(r.y, liftedY, k), r.z - k * LIFT.z);
    e.mesh.rotation.set(PI, r.ry, 0);
  }
  // left to right across the picture: what "the third from the left" counts, and what pick(i) takes
  const remaining = () => entries.filter((e) => !e.removed && !e.flying).sort((a, b) => a.mesh.position.x - b.mesh.position.x);
  const alive = (i) => {
    const e = entries[i];
    return !!e && !e.removed && !e.flying;
  };

  // the mass laid out at once (a judging still)
  function lay() {
    makeEntries();
    stacks();
    deckDrawing(0);
    for (const e of entries) applyEntry(e);
  }
  function liftIndex(i) {
    const e = entries[i];
    if (!e) return;
    setHover(e);
    for (const o of entries) {
      o.lift = o.liftTarget;
      applyEntry(o);
    }
  }
  // for a judging still: these cards were already picked and sit face down in the slots
  function fakePicks(indices) {
    indices.forEach((i, k) => {
      const e = entries[i];
      if (!e) return;
      const s = slotPose(k);
      e.removed = true;
      e.mesh.visible = true;
      e.mesh.position.copy(s.p);
      e.mesh.rotation.set(PI, s.ry, 0);
    });
  }
  // the mass gone (the picks stay readable until the next one is dealt)
  function clear() {
    handOnCloth(true); // whatever the choosing beat asked for, it is over: the hand is free again
    hand?.clear();
    for (const e of entries) group.remove(e.mesh);
    entries.length = 0;
    hover = null;
    armed = false;
    picking = false;
    if (canvas) canvas.style.cursor = '';
    disposeGeos();
    deckReal();
  }

  // ---- THE HAND-OVER: this piece's seventy-eight take the wash's place -----------------------------
  //
  // ROUND 6, AND IT IS THE USER'S CUT: "lets remove: story card and push out." What stood here was
  // the PUSH-OUT — seventeen drawings in which both his palms came back down onto the churn the
  // smoosh had left and travelled out to the two ends of the cloth, the cards spilling from under
  // them left and right until the heap had become a band. It was a second piece of business after a
  // piece of business, and it existed for one reason that was not staging: a heap has no left-to-
  // right ranks, and "the third from the left" has to land on the card a person would point at.
  //
  // THAT ORDERING IS NOT LOST; IT MOVED. reveal-wash.js still lays the mass — sorted by x, with the
  // ranks pulled part-way to an even pitch by `evenOut`, every card confined clear of the reading
  // row and inside the rim — and the SMOOSH now settles onto that arrangement itself, under his
  // working hands, over the last twelve drawings of the swirl (reveal-shuffle.js → chooseRest). So
  // the mass his hands leave IS this mass, `remaining()` is still ordered across the picture and
  // `pickByOrdinal` is still a subscript.
  //
  // What is left to do here is a swap, not a move: the smoosh's placeholders go off the cloth and
  // this piece's own seventy-eight come on at the identical poses, in one drawing, with nothing
  // moving in it. `before` is the smoosh's `hideCards`. The second drawing is a held one, so a take
  // played at 12 fps has a frame to land on.
  function handoverFrames(before = null) {
    makeEntries();
    stacks();
    const settle = () => {
      before?.();
      deckDrawing(0);
      for (const e of entries) {
        e.flying = false;
        e.lift = e.liftTarget = 0;
        applyEntry(e);
      }
    };
    // THE SWAP IS ONLY INVISIBLE IF THE TWO ARRANGEMENTS ARE THE SAME ONE, and that is a contract
    // between two files rather than something either can see. It is worth a millimetre of checking
    // rather than a bug nobody can describe: if a smoosh has played and it did not land where the
    // wash says, the console says so and by how much.
    const check = () => {
      const from = restMass();
      if (!from || from.length !== N) return;
      let worst = 0;
      for (let i = 0; i < N; i++) {
        let d = Infinity;
        for (const p of WASH.poses) d = Math.min(d, Math.hypot(p.x - from[i].x, p.z - from[i].z));
        worst = Math.max(worst, d);
      }
      if (worst > 0.001) console.warn(`[reveal] the wash came to rest ${(1000 * worst).toFixed(1)} mm off the poses the visitor picks from; the hand-over will be visible`);
    };
    return [
      () => {
        check();
        settle();
        sound('settle');
      },
      settle,
    ];
  }

  // where a picked card lies in slot k: a millimetre off, a few degrees off, as a hand puts it.
  function slotPose(k) {
    const p = laidPose(slots, k, ctx.seed);
    return { p: new THREE.Vector3(p.x, p.y, p.z), ry: -p.ry }; // the card arrives face down
  }

  // The pick: the card carried from where it stands — up out of the mass, on top of everything — to
  // slot k, low and calm, in his fingers.
  function pickFrames(e, slot) {
    const from = { p: e.mesh.position.clone(), ry: e.mesh.rotation.y };
    const to = slotPose(slot);
    const side = handSide(from.p.x); // the hand nearest the card he is taking
    const fr = dealTrack(e.mesh, from, to, {
      spin: 0.12,
      apex: hand ? 0.026 : 0.05, // carried in his fingers, not flicked: it stays near the cloth
      bank: hand ? 0.06 : 0.1,
      cues: {
        lift: () => {
          sound('pick');
          pepe()?.deal?.(slot, side);
        },
        land: () => sound('settle'),
      },
    });
    const first = fr[0], last = fr[fr.length - 1];
    fr[0] = () => {
      e.flying = true;
      first();
    };
    fr[fr.length - 1] = () => {
      last();
      e.removed = true;
    };
    if (!hand) return fr;
    // HIS HAND TAKES THE CARD THE VISITOR CHOSE, BY A CORNER. Four drawings before the card moves,
    // and they are the whole of the grip: the open hand comes in over the top edge of the frame, it
    // comes down beside the corner still open, THE FINGERS CLOSE ON IT (the pinch plate, the user's
    // own drawing of a thumb and forefinger on a card's corner), and one drawing is held while the
    // grip takes. A hand that materialises already holding a card is not what this film does; four
    // drawings is a third of a second, and this beat plays three times a reading.
    const D = 4;
    const lc = gripCorner(e, side); // in the card's frame: the same corner all the way to the slot
    // The nip, for a card centred at (x, z) and yawed ry: the corner drawn a few millimetres in
    // along its own diagonal, so the two fingers straddle the corner instead of pinching thin air.
    const nip = (x, z, ry) => {
      const c = cornerAt(x, z, ry, lc);
      const dx = x - c.x, dz = z - c.z, L = Math.hypot(dx, dz) || 1;
      return { x: c.x + (dx / L) * GRIP_IN, z: c.z + (dz / L) * GRIP_IN };
    };
    // one drawing of the hand: the fingers at `g`, `back` metres up-frame of it (the approach), `y`
    // above whatever they are resting on and `floor` metres of card under them — a chosen card
    // stands 20 mm proud of the cloth and the hand must be drawn ON it, not under it
    const bearing = (x, z) => (side === 'L' ? yawL(x, z) : yawR(x, z));
    const spec = (g, { y = 0.005, back = 0, floor = 0, pose = 'pinch' } = {}) => {
      const x = g.x, z = g.z - back;
      return { x, y, z, yaw: bearing(x, z), side, pose, floor, by: 'tip' };
    };
    const g0 = nip(from.p.x, from.p.z, from.ry);
    const g1 = nip(to.p.x, to.p.z, to.ry);
    const stands = Math.max(0, from.p.y - Y); // how proud of the cloth the chosen card is standing
    // and the ride: the fingers hold that corner while the card is carried, so the card PIVOTS about
    // the point they hold — the flick dealTrack puts in the flight is a card turning between a
    // finger and a thumb. Taken off the mesh itself, so the bank and the spin are in it.
    //
    // IT IS PADDED AT THE FRONT WITH THE APPROACH'S OWN DRAWINGS, and that is not book-keeping.
    // `compose` draws EVERY track in every drawing, clamped to its first frame before it starts, so
    // a ride that begins at D is still drawing its first pose in drawings 0…D−1 — and since the
    // hand goes wherever the LAST claim of the drawing put it, the ride's pinch was overwriting the
    // open hand coming in and the approach could not be seen at all. Four dead drawings at its head
    // leave those to the approach.
    const _c = new THREE.Vector3();
    const ride = [];
    for (let k = 0; k < D; k++) ride.push(() => {}); // the fingers are still on their way in
    for (let k = 0; k < fr.length; k++)
      ride.push(() => {
        e.mesh.updateMatrixWorld(true);
        e.mesh.localToWorld(_c.set(lc[0], 0, lc[1]));
        const dx = e.mesh.position.x - _c.x, dz = e.mesh.position.z - _c.z, L = Math.hypot(dx, dz) || 1;
        const x = _c.x + (dx / L) * GRIP_IN, z = _c.z + (dz / L) * GRIP_IN;
        hand.at(x, 0.005, z, { yaw: bearing(x, z), side, pose: 'pinch', floor: Math.max(0, _c.y - Y), by: 'tip' });
      });
    ride.push(() => hand.off());
    return compose([
      { offset: D, frames: fr },
      {
        offset: 0,
        frames: handFrames(hand, [
          spec(g0, { y: 0.075, back: 0.2, pose: 'point' }), // in over the top edge of the frame, open
          spec(g0, { y: 0.03, back: 0.075, pose: 'point' }), // down beside the corner, still open
          spec(g0, { y: 0.005, floor: stands }), // the fingers close on the corner
          spec(g0, { y: 0.005, floor: stands }), // held one drawing: the grip takes
          { off: true },
        ]),
      },
      { offset: 0, frames: ride },
      {
        // …and it is put down by the same corner: the fingers stay on it as it lands, open, and go
        // back out the way they came
        offset: D + fr.length - 1,
        frames: handFrames(hand, [
          { off: true },
          spec(g1, { y: 0.004, floor: Math.max(0, to.p.y - Y) }),
          spec(g1, { y: 0.03, back: 0.13, pose: 'point' }),
          spec(g1, { y: 0.075, back: 0.3, pose: 'point' }),
          { off: true },
        ]),
      },
    ]);
  }

  // ---- THE RAKE: the mass swept back into a squared deck -----------------------------------------
  // The rake is where the deck comes back, and it is a two-handed sweep because a wash is: both
  // palms come in from the two ends of the band and drag it into a pile on the deck's own square,
  // the cards furthest out landing first and so ending at the BOTTOM of the new deck. Then the pile
  // is pressed square between the two palms — the plan view's answer to standing a packet on edge
  // and tapping it, which from straight above is a hairline — and the real deck is back.
  function gatherFrames() {
    stacks(); // `units` is in the deck's own blocks: without them the pile lands 78 cards tall
    const rem = entries.filter((e) => !e.removed);
    const dk = deckToWorld(0, 0, 0);
    const rests = new Map(rem.map((e) => [e, restPose(e, {})]));
    const far = rem.slice().sort((a, b) => {
      const ra = rests.get(a), rb = rests.get(b);
      return Math.hypot(rb.x - dk.x, rb.z - dk.z) - Math.hypot(ra.x - dk.x, ra.z - dk.z);
    });
    // the pile they land in is the deck's own drawing: seventy-eight cards are the deck's
    // forty-four blocks thick, so the gathered pile ends exactly the height the real deck comes
    // back at instead of jumping when it does
    const onDeck = (r) => {
      const p = deckToWorld(0.002, units(r) * T + T / 2, 0.002);
      return { x: p.x, y: p.y, z: p.z, ry: -(deckYaw() + 0.04) };
    };
    const set = (e, a, b, f) => {
      e.mesh.visible = true;
      e.mesh.position.set(lerp(a.x, b.x, f), lerp(a.y, b.y, f), lerp(a.z, b.z, f));
      e.mesh.rotation.set(PI, lerp(a.ry, b.ry, f), 0);
    };
    const frames = [];
    const F = (fn) => frames.push(fn);
    F(() => {
      deckDrawing(0);
      for (const e of rem) {
        e.flying = true;
        e.lift = e.liftTarget = 0;
        const r = restPose(e, {});
        rests.set(e, r);
        set(e, r, r, 0);
      }
    });
    const SWEEP = 12, RUN2 = 3;
    const start = new Map(far.map((e, k) => [e, ((SWEEP - RUN2) * k) / Math.max(1, far.length - 1)]));
    for (let k = 1; k <= SWEEP; k++) {
      F(() => {
        if (k === 1) sound('rake');
        if (k === 5 || k === 9) sound('rake');
        far.forEach((e, r) => {
          const a = rests.get(e);
          const f = clamp01((k - start.get(e)) / RUN2);
          set(e, a, onDeck(far.length - 1 - r), f);
          e.mesh.position.y += 0.02 * Math.sin(PI * f);
        });
      });
    }
    F(() => {
      far.forEach((e, r) => set(e, onDeck(far.length - 1 - r), onDeck(far.length - 1 - r), 1));
      sound('settle');
    });
    // squared between the two palms, twice
    for (let k = 0; k < 2; k++) F(() => sound('square'));
    F(() => {
      for (const e of rem) e.mesh.visible = false;
      deckReal();
    });
    if (!hand) return frames;
    const b = WASH.bounds, cz = (b.z0 + b.z1) / 2;
    const specs = [];
    specs.push([HL(-b.x * 0.8, cz - 0.20, 0.080), HR(b.x * 0.8, cz - 0.20, 0.080)]);
    for (let k = 0; k < SWEEP; k++) {
      const u = k / (SWEEP - 1);
      const x = lerp(b.x * 0.86, 0.062, u), z = lerp(cz, dk.z, u);
      specs.push([HL(-x, z, 0.004, DEEP * (1 - u)), HR(x, z, 0.004, DEEP * (1 - u))]);
    }
    specs.push([HL(-0.058, dk.z + 0.004, 0.006), HR(0.058, dk.z + 0.004, 0.006)]);
    // the press: the two hands turned to face each other across the pile
    const press = (dx) => [
      { x: -(0.045 + dx), y: 0.006, z: dk.z + 0.004, yaw: 1.12, pose: 'splay', side: 'L', floor: 0 },
      { x: 0.045 + dx, y: 0.006, z: dk.z + 0.004, yaw: -1.12, pose: 'splay', side: 'R', floor: 0 },
    ];
    specs.push(press(0.018), press(0), press(0.014), press(0));
    specs.push([HL(-0.09, dk.z - 0.14, 0.055, units(N) * T), HR(0.09, dk.z - 0.14, 0.055, units(N) * T)]);
    specs.push([{ off: true }, { off: true }]);
    return compose([
      { offset: 0, frames },
      { offset: 0, frames: handFrames(hand, specs.map((s) => s[0])) },
      { offset: 0, frames: handFrames(hand, specs.map((s) => s[1])) },
    ]);
  }

  // ---- the visitor's hand: the pointer stands a card up, a tap on it takes it ---------------------
  const canvas = ctx.renderer?.domElement ?? null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const _p = new THREE.Vector3(), _d = new THREE.Vector3();
  let armed = false, picking = false, hover = null, pending = null;
  // where the pointer is ON THE CLOTH, in metres
  function cloth(ev) {
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    _p.set(ndc.x, ndc.y, 0.5).unproject(ctx.camera);
    _d.copy(_p).sub(ctx.camera.position).normalize();
    if (Math.abs(_d.y) < 1e-5) return null;
    const t = (Y - ctx.camera.position.y) / _d.y;
    if (!(t > 0)) return null;
    return { x: ctx.camera.position.x + _d.x * t, z: ctx.camera.position.z + _d.z * t };
  }
  // the card the pointer is over: the top card under the point, on the CLOSED mass, so the mapping
  // is a fixed function of where the finger is and cannot chase the animation it causes. A pointer
  // that has wandered off the mass altogether — past the rim, or up among the reading slots —
  // chooses nothing.
  function at(ev) {
    if (!entries.length) return null;
    const p = cloth(ev);
    if (!p) return null;
    if (Math.hypot(p.x, p.z) > 0.63) return null;
    if (!nearBand(p.x, p.z, 0.03)) return null;
    const i = indexAt(p.x, p.z, alive);
    return i == null ? null : entries[i];
  }
  // the standing card itself, which is what a thumb aims at: a real raycast, so the whole of it
  // counts and not a nearest-cell guess
  function onRaised(ev) {
    if (!hover || !canvas || hover.lift <= 0) return false;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    return ray.intersectObject(hover.mesh, false).length > 0;
  }
  function setHover(e) {
    if (hover === e) return;
    if (hover) hover.liftTarget = 0;
    hover = e;
    if (e) e.liftTarget = 1;
    if (canvas) canvas.style.cursor = e ? 'pointer' : '';
  }
  canvas?.addEventListener('pointermove', (ev) => {
    if (!armed || picking) return;
    if (ev.pointerType === 'touch') return; // a thumb has no hover: it drags, below
    setHover(at(ev));
  });
  // a touch pointer fires pointerleave the moment the finger comes off the glass, which would put
  // the card the visitor just stood up straight back down before they could tap it
  canvas?.addEventListener('pointerleave', (ev) => {
    if (ev.pointerType !== 'touch') setHover(null);
  });
  canvas?.addEventListener('pointerdown', (ev) => {
    if (!armed || picking) return;
    // TAKE IT if the tap landed on the card already standing up (a mouse has hovered it there
    // already, so one click still takes a card); otherwise STAND ONE UP under the finger.
    if (onRaised(ev)) {
      doPick(hover);
      return;
    }
    const e = at(ev);
    if (!e) return;
    if (e === hover && hover.lift > 0) doPick(e);
    else setHover(e);
  });
  // a thumb dragged over the mass walks the standing card with it
  canvas?.addEventListener('pointermove', (ev) => {
    if (!armed || picking || ev.pointerType !== 'touch' || !ev.buttons) return;
    const e = at(ev);
    if (e) setHover(e);
  });

  // arm the pointer; resolves with the next completed pick ({index, ordinal, slug, slot, mesh}),
  // or null when the three slots are already filled
  function arm() {
    if (!entries.length || picks.length >= slots.length) return Promise.resolve(null);
    if (!pending) {
      let resolve;
      const promise = new Promise((r) => (resolve = r));
      pending = { promise, resolve };
    }
    armed = true;
    handOnCloth(false); // the cloth is theirs while they choose: see the note above `handOnCloth`
    return pending.promise;
  }
  async function doPick(e) {
    if (!e || e.removed || e.flying || picking || picks.length >= slots.length) return pending?.promise ?? null;
    picking = true;
    handOnCloth(true); // his hand comes back for it: it is what carries the card to its slot
    const slot = picks.length;
    const ordinal = remaining().indexOf(e) + 1;
    const keep = e;
    setHover(null);
    keep.lift = keep.liftTarget = 0;
    const real = Promise.resolve()
      .then(() => cards.makeCard(e.slug))
      .catch(() => null);
    await player.play(pickFrames(e, slot));
    let mesh = await real;
    if (mesh) {
      mesh.position.copy(e.mesh.position);
      mesh.rotation.copy(e.mesh.rotation);
    } else mesh = e.mesh; // no front to be had: the placeholder stays the card
    group.remove(e.mesh);
    cards.drawn.add(mesh);
    const result = { index: e.i, ordinal, slug: e.slug, slot, mesh };
    picks.push(result);
    picking = false;
    if (picks.length >= slots.length) {
      armed = false;
      setHover(null);
    }
    ctx.emit?.('reveal:pick', result);
    const p = pending;
    pending = null;
    p?.resolve(result);
    return result;
  }
  async function gather() {
    if (!entries.length) return;
    armed = false;
    setHover(null);
    handOnCloth(true); // his hands rake the rest up
    await player.play(gatherFrames());
    clear();
  }
  // HE TAKES HIS HANDS OFF THE TABLE WHILE THE VISITOR CHOOSES (round 10, and it holds).
  //
  // The camera builder measured what a waiting hand costs on a plate cut this tight: "the hand's
  // arm takes 9.8 % of a 390x760 frame at every stage, running from the top edge to 63 % of the
  // frame's height down the right side — 63 % as much ink area as all 78 cards put together". And
  // it cannot be parked: the hand is the near end of an arm anchored at his own shoulder, so the
  // drawing that has to leave the picture is the metre of sleeve behind it, and every spot on the
  // cloth further from the frame's top edge puts MORE of that sleeve in shot. There is no parking
  // space; there is only off. So he pushes the wash out, sits back, and the cloth belongs to the
  // visitor until they have chosen; his hand comes back the moment a card is taken, because his
  // hand is what carries it to its slot.
  let handOff = false;
  function handOnCloth(mine) {
    if (!hand || handOff === !mine) return;
    handOff = !mine;
    if (mine) hand.show();
    else hand.hide();
  }

  // the hover in-betweens, on the stepped clock: two drawings up, two down
  function step() {
    if (!entries.length) return;
    for (const e of entries) {
      const l0 = e.lift;
      if (e.lift !== e.liftTarget) e.lift = e.lift < e.liftTarget ? Math.min(e.liftTarget, e.lift + 0.5) : Math.max(e.liftTarget, e.lift - 0.5);
      if (e.lift !== l0 || !e.mesh.visible) applyEntry(e);
    }
  }
  // WHICH CORNER HIS FINGERS WOULD TAKE CARD i BY, for tools/_rv13-grip.mjs — the grip is measured
  // rather than eyeballed: the corner in the card's own frame, where it and the nip are on the cloth
  // now, where the corner lay while the mass was closed, and whether anything was lying over it
  // there.
  const _g = new THREE.Vector3();
  function gripOf(i, side = null) {
    const e = entries[i];
    if (!e) return null;
    const s = side ?? handSide(e.mesh.position.x);
    const lc = gripCorner(e, s);
    // off the MESH's own matrix and never off mesh.rotation.y: a take sets the card's quaternion,
    // and reading a Euler back out of one comes back on another branch (y is decomposed into
    // ±90°), which would put this corner on the opposite side of the card from the drawn one
    e.mesh.updateMatrixWorld(true);
    const cx = e.mesh.position.x, cz = e.mesh.position.z;
    const w0 = e.mesh.localToWorld(_g.set(lc[0], 0, lc[1])).clone();
    const c = { x: w0.x, z: w0.z };
    const L = Math.hypot(cx - c.x, cz - c.z) || 1;
    const r = restPose(e, {});
    const rest = cornerAt(r.x, r.z, r.ry, lc);
    return {
      side: s,
      lc,
      centre: [cx, cz],
      corner: [c.x, c.z],
      nip: [c.x + ((cx - c.x) / L) * GRIP_IN, c.z + ((cz - c.z) / L) * GRIP_IN],
      corners: LOCAL.map((q) => {
        const w = e.mesh.localToWorld(_g.set(q[0], 0, q[1]));
        return [w.x, w.z];
      }),
      rest: [rest.x, rest.z],
      covered: coveredAt(rest.x, rest.z, WASH.poses[e.i]?.rank ?? 0),
      buried: LOCAL.map((q) => {
        const w = cornerAt(r.x, r.z, r.ry, q);
        return coveredAt(w.x, w.z, WASH.poses[e.i]?.rank ?? 0);
      }),
    };
  }

  // where the cards are on screen (CSS px), left to right: for tests and for a caption that points
  // at "the third from the left"
  function screenPositions() {
    if (!canvas) return [];
    const r = canvas.getBoundingClientRect();
    return remaining().map((e) => {
      e.mesh.updateMatrixWorld(true);
      const v = e.mesh.getWorldPosition(new THREE.Vector3()).project(ctx.camera);
      return { index: e.i, slug: e.slug, x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    });
  }

  // The card the frame's own axis runs through, and the one lying on top there: what a judging
  // still stands up, and what a visitor's finger lands on first if they simply touch the middle of
  // the mass. (The fan had a keystone laid last on the axis; a wash has whatever the wash left.)
  const middleIndex = () => indexAt(0, (WASH.bounds.z0 + WASH.bounds.z1) / 2, alive) ?? 0;

  // THE WINDOW HAS CHANGED SHAPE. reveal.js calls this at build and on every resize, before the
  // camera re-solves its plates off `reveal.tableBounds`. The band is laid narrower and deeper on a
  // portrait window (reveal-wash.js → BANDS), so every card is somewhere else: each keeps its index
  // — and so its slug, and whether it has been taken — and is laid again where it now lies. Nothing
  // is animated; a window being dragged is not a beat.
  function reshape(aspect) {
    if (!bandFor(aspect, ctx.seed | 0)) return false;
    if (!entries.length) return true;
    hover = null;
    if (canvas) canvas.style.cursor = '';
    for (const e of entries) {
      e.lift = e.liftTarget = 0;
      if (!e.removed && !e.flying) applyEntry(e);
    }
    return true;
  }

  return {
    WASH,
    // kept: the camera and the tools ask the pick piece what is on the table
    get SPREAD() {
      return WASH;
    },
    reshape,
    get middleIndex() {
      return middleIndex();
    },
    get keystoneIndex() {
      return middleIndex(); // the fan's name for it, so an older probe still runs
    },
    group,
    entries,
    picks,
    remaining,
    lay,
    liftIndex,
    fakePicks,
    clear,
    handoverFrames,
    // the beat kept its names in flow and in reveal's judging states; there is no push and no fan
    pushFrames: handoverFrames,
    fanFrames: handoverFrames,
    pickFrames,
    gatherFrames,
    arm,
    doPick,
    gather,
    step,
    gripOf,
    screenPositions,
    get armed() {
      return armed;
    },
    get picking() {
      return picking;
    },
    get hover() {
      return hover;
    },
  };
}
