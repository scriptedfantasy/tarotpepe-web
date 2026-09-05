// reveal-fan.js — THE WHOLE DECK ON THE TABLE, and the visitor's pick. Drawn on twos.
//
// ROUNDS 7 AND 8, and every rule here comes from the user.
//
//  1. "tarot is pulled from all 78 cards, not a sub section". So he no longer cuts a packet of
//     twenty-one off the top: the whole deck goes down. Where the seventy-eight lie is worked out
//     in reveal-spread.js and measured by tools/_rv7-geom.mjs — six nested bows concentric with
//     the round table (19 · 17 · 15 · 13 · 9 · 5), each bow shorter than the one outside it
//     because the row of three reading slots blocks the inside of the crescent. He lays them
//     innermost bow first, in gathered handfuls, so the outer bow comes down on top and shows
//     whole cards while the five behind it show 12 mm of their heads.
//  1b. "the card overlap on the top card not done nicely. the top card should obviously not have a
//     cut down the middle." Every bow now carries an ODD number of cards, so every bow has a
//     KEYSTONE on the frame's own axis; it is laid last, it lies flat (no roll), it rides a card's
//     thickness over both its neighbours, and it is the one card of the seventy-eight that shows
//     the whole of itself. See restPose below and reveal-spread.js → share().
//  2. "they should however pop up on hover". The card under the pointer slides UP THE FRAME — in
//     these plan-view plates that is −z, away from the visitor — and rides a hair proud, so the
//     whole of it is drawn over its neighbours. Its two neighbours step apart along their bow and
//     a gap opens where it stood.
//  3. Nothing passes through anything. The old hover slid a card DOWNSTAGE and took its corner
//     0.668 m from the table's centre — 4.8 cm off the edge of a 0.62 m table. Sliding up the
//     frame moves every card further INTO the cloth instead, and the spread's furthest corner now
//     sits at 0.5595, six centimetres inside the rim.
//
// AND A PHONE CANNOT TAP ONE OF SEVENTY-EIGHT. Even at round 8's wider pitch a card's own strip on
// a 390 px frame is under fifteen pixels, and no lens fixes that. So the pick is in TWO MOVEMENTS
// and neither of them asks a thumb to hit a card:
//   · the pointer is mapped to a card by WHERE IT IS ON THE CLOTH (reveal-spread.js → indexAt) —
//     the card actually DRAWN there, worked out on the CLOSED spread, so the mapping is a fixed
//     function of the finger and cannot chase the animation it causes;
//   · that card stands up out of the spread, whole and on top: at least 93 x 145 px on a phone and
//     202 x 353 at 1600. THAT is what is tapped to take it. On a mouse the hover has already stood
//     it up, so one click still takes a card; on a thumb the first touch stands one up and the
//     second takes it, and sliding the thumb walks the standing card along the bow.
// Speaking still works untouched: `remaining()` is ordered left to right across the picture, so
// "the third from the left" is the third card from the left of all seventy-eight.
//
// The spread's cards are placeholders: the deck's own back and stock materials on a near-flat card
// with no front art. Each position is dealt a card from a shuffled deck (the visitor cannot know
// which); the real card, with its front, is made only when a placeholder is picked.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { cardGeometry } from './cards-geometry.js';
import { compose, dealTrack, handFrames, handSide, laidPose } from './reveal-takes.js';
import { deckStacks } from './reveal-shuffle.js';
import { SPREAD, layoutFor, tierOf, angleAt, poseAt, indexAt, isKeystone, under, leftHalf, stackOrder } from './reveal-spread.js';

// kept for the pieces that ask how many are out
export const FAN = { get n() { return SPREAD.total; } };

const PI = Math.PI;
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// How steeply a card is RAKED by the ones it lies on: it tips about its own long axis until it has
// climbed five card thicknesses, and no further. (How high it rides is SPREAD.tierLift, over in
// reveal-spread.js, because the pointer needs the same number.)
const UNDER = 5;

// player: { play(frames, opts) → Promise } — the piece's take player (reveal.js)
// hand: the reveal-hand api, or null. His hand does the laying, the taking and the sweeping.
// slots: the row reveal.js lays its cards in (reveal-takes.js → stagedRow).
export function buildFan(ctx, cards, player, hand = null, slots = ctx.layout.spread.slots) {
  const { card, y: Y } = ctx.layout.spread;
  const W = card.w, H = card.h, T = card.t;
  const deck = cards?.deck ?? null;
  const sound = (name) => ctx.pieces.sound?.play?.(name);
  const pepe = () => ctx.pieces.pepeAnim;
  const N = SPREAD.total;

  const group = new THREE.Group();
  group.name = 'fan';
  ctx.scene.add(group);

  // ---- the placeholder card: the deck's materials on a near-flat sheet ---------------------------
  const deckTop = deck?.getObjectByName?.('deck-top') ?? null;
  const block = deck?.children.find((c) => c.isMesh && c.name.startsWith('deck-block')) ?? null;
  const mats = Array.isArray(deckTop?.material)
    ? deckTop.material
    : block && Array.isArray(block.material)
      ? [block.material[1], block.material[0], block.material[1]]
      : new THREE.MeshLambertMaterial({ color: '#efe8d7' });
  // three sheets, each bent a hair its own way; near flat so the bows stack without the cards
  // passing through one another
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

  // ---- the deck while the spread is out ----------------------------------------------------------
  // The deck object is built as forty-four cards (cards.js), and seventy-eight leave it, so every
  // count here is carried in the DECK'S OWN UNITS: `units(n)` is how thick n of the spread's cards
  // are in the drawing of the deck. Seventy-eight of them are exactly the deck, and none of them
  // are none of it.
  let S = null, REST = null, PACKET = null;
  function stacks() {
    if (!S && deck) {
      S = deckStacks(deck, T);
      if (S) {
        REST = S.stack('fan-rest');
        PACKET = S.stack('fan-packet');
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

  // ---- the cards in the spread -------------------------------------------------------------------
  // entry: { i (0 = the left end of the outer bow), t (its bow), j (along it), mesh, slug,
  //          j* (a hand's jitter), lift 0|0.5|1 (the hover), push (the neighbours stepping apart),
  //          flying (a take owns the mesh), removed }
  const entries = [];
  const picks = [];
  const jit = mulberry32(5000 + ctx.seed);
  // judged frames are seeded; a visitor's evening is not
  const liveRng = () => (!ctx.shotMode && !ctx.clock.frozen && !ctx.params?.has?.('seed') ? ctx.rng.fork(((Date.now() / 1000) & 0xffff) + 1) : ctx.rng);
  function makeEntries() {
    clear();
    picks.length = 0;
    const list = cards?.DECK?.length ? cards.DECK : [{ slug: 'the-fool' }];
    const order = liveRng().shuffle(list);
    for (let i = 0; i < N; i++) {
      const { tier, j } = tierOf(i);
      const mesh = new THREE.Mesh(geoFor(i), mats);
      mesh.name = `fan-card-${i}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.fan = i;
      mesh.rotation.x = PI;
      mesh.visible = false;
      group.add(mesh);
      entries.push({
        i,
        t: tier,
        j,
        mesh,
        slug: order[i % order.length].slug,
        // the millimetre and a half a hand puts in each card, as a fraction of a bow's own step:
        // the amplitude is applied in restPose, because the step is the window's now (round 10) and
        // a card jittered by a sixth of the sliver it shows is a card the pointer cannot name
        jx: jit() - 0.5,
        jz: jit() - 0.5,
        ja: jit() - 0.5,
        lift: 0,
        liftTarget: 0,
        push: 0,
        pushTarget: 0,
        flying: false,
        removed: false,
      });
    }
  }
  // Where a card lies in the spread: on its bow, its covered edge up on the cards under it.
  //
  // THE OVERLAP RUNS INWARDS FROM BOTH ENDS. A ribbon spread laid in one sweep has its last card
  // on top, which puts a whole card at one end of the picture and slivers everywhere else — the
  // one thing this film never does with a frame. Laid from each end towards the middle, the bow's
  // MIDDLE card is the one on top: a whole card on the frame's own axis, the slivers tapering away
  // from it either side, and the six bows' keystones stacked one behind the other up the middle.
  // `under(e)` is how many cards a card rides on, which is how far it is from its end.
  //
  // THE KEYSTONE IS FLAT. Every other card in a bow is rolled a degree or two about its own long
  // axis, because it is lying with one edge up on its neighbours and the other on the cloth. The
  // keystone is not: it is lying on BOTH its neighbours, symmetrically, so it lies square. Round 7
  // gave it the right-hand roll — the parity of `leftHalf` put the exact middle card on the right
  // half of its own bow — which tipped the one card in the picture that the frame's axis runs
  // through, and the axis then read as a seam down it. (The user: "the top card should obviously
  // not have a cut down the middle".)
  //
  // The height a card rides at is `stackOrder` from reveal-spread.js, in half-thicknesses — the
  // same number the pointer uses to work out which card is drawn under a finger, so the two can
  // never drift. (It also gives the right half of a bow half a thickness over the left, so no two
  // cards of a bow are coplanar: without that, the mirror pair either side of a keystone close on
  // the axis the moment the keystone is TAKEN and fight for the pixel — the same seam, one pick
  // later.)
  const _r = {};
  function restPose(e, out = _r) {
    // a quarter of the step between bows, either way: 3 mm across a 12 mm sliver at the wide
    // nesting — round 8's own number — and 2.25 mm across a 9 mm one at the tall
    const J = SPREAD.step / 4;
    const p = poseAt(e.t, e.j, e.push, e.jx * J, e.jz * J, e.ja * J * 10);
    out.x = p.x;
    out.z = p.z;
    out.ang = p.ang;
    out.y = Y + T / 2 + stackOrder(e.t, e.j) * (T / 2);
    // a card lying face DOWN is yawed the other way by the flip
    out.ry = -p.ang;
    out.roll = isKeystone(e.t, e.j) ? 0 : (leftHalf(e.t, e.j) ? 1 : -1) * Math.asin(Math.min(1, (Math.min(under(e.t, e.j), UNDER) * T) / W));
    return out;
  }
  // the drawn pose: the rest pose, or — under the pointer — slid UP THE FRAME and riding proud, so
  // the whole card is drawn over the ones it was lying under (lift 0.5 is the in-between drawing)
  function applyEntry(e) {
    if (e.flying || e.removed) return;
    const r = restPose(e);
    const k = e.lift;
    e.mesh.visible = true;
    e.mesh.position.set(r.x, r.y + k * SPREAD.lift.y, r.z - k * SPREAD.lift.z);
    e.mesh.rotation.set(PI, r.ry, r.roll * (1 - k));
  }
  // left to right across the picture: what "the third from the left" counts, and what pick(i) takes
  const remaining = () => entries.filter((e) => !e.removed && !e.flying).sort((a, b) => a.mesh.position.x - b.mesh.position.x || b.t.r - a.t.r);
  const alive = (i) => {
    const e = entries[i];
    return !!e && !e.removed && !e.flying;
  };

  // the spread laid out at once (a judging still)
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
    for (const o of entries) o.lift = o.liftTarget;
    for (const o of entries) {
      o.push = o.pushTarget;
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
  // the spread gone (the picks stay readable until the next one is dealt)
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

  // ---- the takes -------------------------------------------------------------------------------
  // A card lies face DOWN — Euler x = π — so its Euler y is the negative of the way it points on
  // the cloth, while his hand is posed by the direction itself.
  const handYawFor = (ry) => -ry;

  // The packet in his hand: `held` cards squared to his own yaw, their underside `y` above the
  // cloth. The whole deck is 62 mm of card and his hand, a flat cut-out hinged at the wrist, is
  // 16 mm above the cloth at the knuckles: at true thickness the packet stands taller than the
  // hand holding it and draws over it. So it is drawn at two fifths, and still thins card by card.
  const DRAWN = 0.4;
  const _pw = new THREE.Vector3();
  function packetInHand(x, z, yaw, held, y) {
    const s = stacks();
    if (!s || held <= 0) {
      if (PACKET) PACKET.visible = false;
      return;
    }
    const u = Math.max(1, Math.round(units(held)));
    s.cards(PACKET, u, 0);
    PACKET.scale.y *= DRAWN;
    _pw.set(x, Y + y + (u * T * DRAWN) / 2, z);
    deck.updateMatrixWorld(true);
    deck.worldToLocal(_pw);
    PACKET.position.copy(_pw);
    PACKET.rotation.set(0, yaw - deckYaw(), 0);
  }

  // THE SPREAD LAID — and the cards come out of HIS HAND, in handfuls.
  //
  // Seventy-eight cards flown out one at a time is fifteen seconds of nothing happening, which is
  // unwatchable; a film lays a ribbon spread the way a hand does, in gathered runs of five or six
  // that cascade out from under the palm as it sweeps. So: his hand comes in over the squared
  // deck, takes the whole of it, carries it to the left end of the INNERMOST bow, and sweeps —
  // a handful spilling out under him every second drawing, bow by bow, working outwards, so each
  // bow comes down on top of the one behind it. Fifty drawings, four seconds, on twos.
  const GROUP = 5; // cards per handful
  function fanFrames() {
    makeEntries();
    stacks();
    const HOLD = 0.006; // the underside of the packet, above the cloth
    const dk = deckToWorld(0, 0, 0);

    const poses = [];
    const P = (x, z, yaw, held, py) =>
      poses.push({
        x, z, yaw, held, py,
        floor: py + Math.max(0, units(held)) * T * DRAWN,
        y: 0.003,
        // the packet sits 45 mm back along the hand's own axis from the fingertips — under the
        // knuckles, so its far end does not run out behind his wrist and over the cuff
        px: x - 0.045 * Math.sin(yaw),
        pz: z - 0.045 * Math.cos(yaw),
      });
    // which drawing each card leaves his hand on, and from where
    const leave = new Array(N).fill(0);
    // HE DRUMS HIS FINGERS ON THE SQUARED DECK, twice, before he takes it up. This is where the
    // waiting hand's drumming went (round 10): the cloth belongs to the visitor while they choose,
    // so the business that used to loop over bare cloth for half a minute happens once, here, on
    // the deck itself — which is the gesture a reader actually makes, dead centre of the plate, and
    // over in a third of a second. Four drawings, on twos.
    // The fingertips travel ALONG THE CLOTH as well as up off it: this plate is very nearly a plan
    // view, and a hand that only rises 25 mm off a deck a metre under the lens changes size by two
    // and a half per cent — which is no drawing at all. Fourteen millimetres of reach with it is
    // 13 px on a phone, and the tap reads.
    const deckH = units(N) * T; // the squared deck's own height: what his fingers land on
    const DRUM = 4;
    // …and 12 mm to the left of the deck's axis, because the drawing is posed by its FINGERTIPS and
    // its palm sits outboard of them: aimed at the deck's centre it hung its little finger off the
    // right-hand edge (measured on the 16:9 plate, where the deck is 280 px across)
    for (const [py, dz] of [[deckH + 0.026, 0.066], [deckH + 0.001, 0.052], [deckH + 0.026, 0.066], [deckH + 0.001, 0.052]]) P(dk.x - 0.012, dk.z + dz, -0.10, 0, py);
    // …and the whole deck lifted out from under them
    P(dk.x, dk.z, -0.10, N, HOLD + 0.012);
    let laid = 0;
    // the bows, innermost first: the one behind goes down before the one in front of it
    const order = SPREAD.tiers.slice().reverse();
    let base = 0;
    const firstOf = new Map();
    for (const t of SPREAD.tiers) {
      firstOf.set(t.k, base);
      base += t.n;
    }
    let last = null;
    for (const t of order) {
      const i0 = firstOf.get(t.k);
      const at = (j) => {
        const a = angleAt(t, Math.max(-2, Math.min(t.n + 1, j)));
        return { x: t.r * Math.sin(a), z: t.r * Math.cos(a), yaw: handYawFor(-a) };
      };
      const mid = Math.ceil(t.n / 2);
      // two passes, each running from an end of the bow to its middle, so the middle card is the
      // one that lands last and lies on top
      for (const pass of [{ j0: 0, j1: mid, d: 1 }, { j0: t.n - 1, j1: mid - 1, d: -1 }]) {
        if (pass.d > 0 ? pass.j0 >= pass.j1 : pass.j0 <= pass.j1) continue;
        const a0 = at(pass.j0 - 1.4 * pass.d);
        P(a0.x, a0.z - 0.035, a0.yaw, N - laid, HOLD + 0.038);
        for (let j = pass.j0; pass.d > 0 ? j < pass.j1 : j > pass.j1; ) {
          const run = [];
          for (let k = 0; k < GROUP && (pass.d > 0 ? j < pass.j1 : j > pass.j1); k++, j += pass.d) run.push(j);
          const a = at(j - 0.4 * pass.d);
          last = a;
          for (let d = 0; d < 2; d++) P(a.x, a.z - 0.035, a.yaw, N - laid - (d ? run.length : 0), HOLD + T);
          for (const jj of run) leave[i0 + jj] = poses.length - 2;
          laid += run.length;
        }
      }
    }
    // pressed flat where the last handful went down — the middle of the outer bow — then off the
    // top of the frame
    const aE = last ?? { x: 0, z: SPREAD.tiers[0].r, yaw: 0 };
    P(aE.x, aE.z - 0.03, aE.yaw, 0, 0.002);
    P(aE.x, aE.z - 0.03, aE.yaw, 0, 0.002);
    P(aE.x, aE.z - 0.16, aE.yaw, 0, 0.052);
    P(aE.x, aE.z - 0.34, aE.yaw, 0, 0.10);

    // the deck and the packet, one drawing per pose
    const tracks = [
      {
        offset: 0,
        frames: poses.map((p, k) => () => {
          if (k < DRUM) {
            // his fingers on the squared deck: it is still a deck, and nothing has left it
            deckReal();
            if (k === 0) {
              handOnCloth(true);
              for (const e of entries) {
                e.mesh.visible = false;
                e.flying = true;
              }
            }
            if (k === 1 || k === 3) sound('tap');
            return;
          }
          if (k === DRUM) {
            sound('deal');
            pepe()?.deal?.(0, 'R');
          }
          deckDrawing(0);
          packetInHand(p.px, p.pz, p.yaw, p.held, p.py);
        }),
      },
    ];

    // each card spills out from under his hand: hidden, half out, home. Three drawings, and the
    // whole handful moves together — which is what a handful does.
    entries.forEach((e, i) => {
      const k = leave[i];
      const p = poses[Math.min(k, poses.length - 1)];
      const from = { x: p.px, y: Y + HOLD + T / 2, z: p.pz, ry: -p.yaw };
      const r = restPose(e, {});
      const fr = [
        () => {
          e.flying = true;
          e.mesh.visible = false;
        },
      ];
      [0.45, 1].forEach((u, j) => {
        fr.push(() => {
          e.flying = true;
          e.mesh.visible = true;
          e.mesh.position.set(lerp(from.x, r.x, u), lerp(from.y, r.y, u) + 0.004 * Math.sin(PI * u), lerp(from.z, r.z, u));
          e.mesh.rotation.set(PI, lerp(from.ry, r.ry, u), r.roll * u);
          if (j === 0 && e.j % GROUP === 0) sound('deal');
        });
      });
      fr.push(() => {
        e.flying = false;
        e.lift = e.liftTarget = 0;
        e.push = e.pushTarget = 0;
        applyEntry(e);
      });
      tracks.push({ offset: Math.max(0, k - 1), frames: fr });
    });
    if (hand)
      tracks.push({
        offset: 0,
        frames: handFrames(
          hand,
          poses.map((p) => ({ x: p.x, y: p.y, z: p.z, yaw: p.yaw, floor: p.floor, pose: 'splay', side: 'R' })),
        ).concat([() => hand.off()]),
      });
    return compose(tracks);
  }

  // where a picked card lies in slot k: a millimetre off, a few degrees off, as a hand puts it.
  function slotPose(k) {
    const p = laidPose(slots, k, ctx.seed);
    return { p: new THREE.Vector3(p.x, p.y, p.z), ry: -p.ry }; // the card arrives face down
  }

  // The pick: the card carried from where it stands (up out of the spread, if the pointer had it)
  // to slot k, low and calm, while the gap it leaves closes behind it.
  function pickFrames(e, slot) {
    const from = { p: e.mesh.position.clone(), ry: e.mesh.rotation.y };
    const to = slotPose(slot);
    const side = handSide(from.p.x); // the hand nearest the card he is taking
    const sgn = side === 'L' ? -1 : 1;
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
    // the bow closes over the gap in three drawings
    const shifts = [];
    for (const o of entries) {
      if (o === e || o.removed || o.flying || o.t.k !== e.t.k) continue;
      const d = Math.abs(o.j - e.j);
      if (d > 3) continue;
      shifts.push({ o, p0: o.push, p1: [0, 0.45, 0.24, 0.1][d] * o.t.pitch * (o.j < e.j ? 1 : -1) });
    }
    const shiftFrames = [0, 0.5, 1].map((f) => () => {
      for (const s of shifts) {
        s.o.push = s.o.pushTarget = s.p0 + (s.p1 - s.p0) * f;
        applyEntry(s.o);
      }
    });
    if (!hand)
      return compose([
        { offset: 0, frames: fr },
        { offset: 2, frames: shiftFrames },
      ]);
    // His hand takes the card the visitor chose: in from the top of the frame, thumb and
    // forefinger down on the card, a two-frame hold, and only then does the card travel.
    const D = 4;
    const pinch = (p, ry, y) => ({ x: p.x, y: y ?? 0.006, z: p.z + 0.03, yaw: sgn * -ry * 0.6 - 0.12, side, pose: 'pinch' });
    const ride = [];
    for (let k = 0; k < fr.length; k++)
      ride.push(() => {
        e.mesh.updateMatrixWorld(true);
        hand.at(e.mesh.position.x, Math.max(0, e.mesh.position.y - Y) + 0.006, e.mesh.position.z + 0.03, { yaw: sgn * -e.mesh.rotation.y * 0.6 - 0.12, side, pose: 'pinch' });
      });
    ride.push(() => hand.off());
    return compose([
      { offset: D, frames: fr },
      { offset: D + 2, frames: shiftFrames },
      {
        offset: 0,
        frames: handFrames(hand, [{ ...pinch(from.p, from.ry, 0.07), z: from.p.z - 0.24 }, { ...pinch(from.p, from.ry, 0.03), z: from.p.z - 0.08 }, pinch(from.p, from.ry), pinch(from.p, from.ry), { off: true }]),
      },
      { offset: D, frames: ride },
      {
        offset: D + fr.length - 1,
        frames: handFrames(hand, [{ off: true }, pinch(to.p, to.ry), { ...pinch(to.p, to.ry, 0.04), z: to.p.z - 0.14 }, { ...pinch(to.p, to.ry, 0.08), z: to.p.z - 0.32 }, { off: true }]),
      },
    ]);
  }

  // The gather: the bows swept up from the outside in — the top layer first, the way a hand picks
  // a spread up — into a pile on the deck's own square, and then the real deck again.
  function gatherFrames() {
    const rem = entries.filter((e) => !e.removed);
    // the order they are swept in: the top layer first — the outermost bow — and along each bow in
    // the opposite direction to the one before it, so his hand runs a single serpentine over the
    // whole spread instead of jumping back to the left four times
    const dir = (e) => (e.t.k % 2 ? -1 : 1);
    const seq = rem.slice().sort((a, b) => b.t.r - a.t.r || dir(a) * (a.j - b.j));
    const rests = new Map(rem.map((e) => [e, restPose(e, {})]));
    // the pile they land in is the deck's own drawing: seventy-eight cards are the deck's
    // forty-four blocks thick, so the gathered pile ends exactly the height the real deck comes
    // back at instead of jumping 27 mm when it does
    const onDeck = (r) => {
      const p = deckToWorld(0.002, units(r) * T + T / 2, 0.002);
      return { x: p.x, y: p.y, z: p.z, ry: -(deckYaw() + 0.04) };
    };
    const set = (e, a, b, f, roll = 0) => {
      e.mesh.visible = true;
      e.mesh.position.set(lerp(a.x, b.x, f), lerp(a.y, b.y, f), lerp(a.z, b.z, f));
      e.mesh.rotation.set(PI, lerp(a.ry, b.ry, f), roll);
    };
    const frames = [];
    const F = (fn) => frames.push(fn);
    F(() => {
      deckDrawing(0);
      for (const e of rem) {
        e.flying = true;
        e.lift = e.liftTarget = 0;
        e.push = e.pushTarget = 0;
        const r = restPose(e, {});
        rests.set(e, r);
        set(e, r, r, 0, r.roll);
      }
    });
    // twelve drawings: each card starts moving when the sweep reaches it and takes three to arrive,
    // so the spread collapses behind his hand instead of all at once
    const SWEEP = 12, RUN = 3;
    const start = new Map(seq.map((e, k) => [e, ((SWEEP - RUN) * k) / Math.max(1, seq.length - 1)]));
    for (let k = 1; k <= SWEEP; k++) {
      F(() => {
        if (k === 1) sound('riffle');
        if (k === 5 || k === 9) sound('deal');
        seq.forEach((e, r) => {
          const a = rests.get(e);
          const f = clamp01((k - start.get(e)) / RUN);
          set(e, a, onDeck(seq.length - 1 - r), f, a.roll * (1 - f));
          e.mesh.position.y += 0.03 * Math.sin(PI * f);
        });
      });
    }
    F(() => {
      seq.forEach((e, r) => set(e, onDeck(seq.length - 1 - r), onDeck(seq.length - 1 - r), 1));
      sound('settle');
    });
    F(() => {
      for (const e of rem) e.mesh.visible = false;
      deckReal();
    });
    if (!hand) return frames;
    // his hand runs the sweep: along each bow in turn, from its right end to its left, and then
    // presses the pile square on the deck's square
    const dk = deckToWorld(0, 0, 0);
    const specs = [];
    const along = (e) => {
      const a = rests.get(e) ?? restPose(e, {});
      return { x: a.x, y: 0.006, z: a.z - 0.02, yaw: handYawFor(a.ry), pose: 'splay' };
    };
    specs.push({ ...along(seq[0]), y: 0.09, z: along(seq[0]).z - 0.28 });
    for (let k = 0; k < SWEEP; k++) {
      const e = seq[Math.min(seq.length - 1, Math.round((k / (SWEEP - 1)) * (seq.length - 1)))];
      specs.push(along(e));
    }
    specs.push({ x: dk.x, y: 0.014, z: dk.z + 0.02, yaw: handYawFor(-(deckYaw() + 0.04)), pose: 'splay' });
    specs.push({ x: dk.x, y: 0.05, z: dk.z - 0.16, yaw: handYawFor(-deckYaw()), pose: 'splay' });
    specs.push({ off: true });
    return compose([
      { offset: 0, frames },
      { offset: 0, frames: handFrames(hand, specs) },
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
  // the card the pointer is over: a nearest-cell lookup on the CLOSED spread. A pointer that has
  // wandered off the cloth altogether (past the rim, or up among the reading slots) chooses nothing.
  function at(ev) {
    if (!entries.length) return null;
    const p = cloth(ev);
    if (!p) return null;
    const r = Math.hypot(p.x, p.z);
    if (r > 0.63 || r < 0.24) return null;
    const i = indexAt(p.x, p.z, alive);
    if (i == null) return null;
    const e = entries[i];
    // …and only if the finger is somewhere near the spread: a bow's own band, plus a card's width
    const near = Math.abs(r - e.t.r) < H / 2 + 0.04 && Math.abs(Math.atan2(p.x, p.z)) < e.t.phi + 0.22;
    return near ? e : null;
  }
  // the standing card itself, which is what a thumb aims at: a real raycast, so the whole ninety-odd by hundred-and-forty
  // px of it counts and not a nearest-cell guess
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
    if (hover) {
      hover.liftTarget = 0;
      for (const o of entries) if (o.t.k === hover.t.k) o.pushTarget = 0;
    }
    hover = e;
    if (e) {
      e.liftTarget = 1;
      const F = SPREAD.open.fall;
      for (const o of entries) {
        if (o.t.k !== e.t.k || o === e) continue;
        const m = o.j - e.j, a = Math.abs(m);
        o.pushTarget = a < F.length ? Math.sign(m) * F[a] * SPREAD.open.amp : 0;
      }
    }
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
  // a thumb dragged along the spread walks the standing card with it
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
    handOnCloth(true); // his hand sweeps the rest up
    await player.play(gatherFrames());
    clear();
  }
  // HE TAKES HIS HAND OFF THE TABLE WHILE THE VISITOR CHOOSES (round 10).
  //
  // Rounds 8 and 9 had it wait on the bare cloth at his right, at (0.36, 0.16), drumming its
  // fingers once every two and a half seconds — business to fill a locked frame with half a minute
  // of nothing happening in it. The camera builder measured what that costs now the plate is cut to
  // the spread: "the hand's arm takes 9.8 % of a 390x760 frame at every stage, running from the top
  // edge to 63 % of the frame's height down the right side — 63 % as much ink area as all 78 cards
  // put together, and the largest single drawn object after the spread", with three green
  // fingertips standing alone in the top-right corner where the frame's edge cuts the wrist off.
  //
  // AND IT CANNOT BE PARKED. The ask was z ≥ 0.30, |x| ≥ 0.40 — outside the plate — but the hand is
  // the near end of an arm anchored at his own wrist (reveal-hand.js: 0.291, -0.82), so the drawing
  // that has to leave the picture is not the hand, it is the metre of sleeve behind it, and every
  // spot on the cloth that is further from the frame's top edge puts MORE of that sleeve in the
  // shot, not less. There is no parking space; there is only off.
  //
  // So he takes it off, which is what a reader does: he deals the spread, presses it flat and sits
  // back, and the cloth belongs to the visitor until they have chosen. The withdrawal is the hand's
  // own two drawings back along its arm (hand.hide), the same one it plays when the camera cuts
  // away, and it comes back the moment a card is taken — his hand is what carries it to its slot.
  //
  // THE DRUMMING IS NOT LOST, it is over the DECK instead of over bare cloth, and it happens once
  // instead of looping: the first four drawings of the fan take are his fingers tapping the squared
  // pile twice before he takes it up (`fanFrames`, DRUM). The tight plate has no bare cloth left to
  // drum on — it is cut to the spread, and the spread runs to within 19 mm of the frame's side —
  // but the deck stands dead centre of it, tapping a deck before you deal it is the gesture a
  // reader makes, and business that is over in a third of a second does not have to be filled.
  let handOff = false;
  function handOnCloth(mine) {
    if (!hand || handOff === !mine) return;
    handOff = !mine;
    if (mine) hand.show();
    else hand.hide();
  }

  // the hover in-betweens, on the stepped clock: two drawings up, two down, and the neighbours
  // stepping apart with it
  function step() {
    if (!entries.length) return;
    for (const e of entries) {
      const l0 = e.lift, p0 = e.push;
      if (e.lift !== e.liftTarget) e.lift = e.lift < e.liftTarget ? Math.min(e.liftTarget, e.lift + 0.5) : Math.max(e.liftTarget, e.lift - 0.5);
      if (e.push !== e.pushTarget) {
        const d = e.pushTarget - e.push;
        e.push = Math.abs(d) < 0.004 ? e.pushTarget : e.push + Math.sign(d) * 0.006;
      }
      if (e.lift !== l0 || e.push !== p0 || !e.mesh.visible) applyEntry(e);
    }
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

  // the outer bow's keystone: the one card of the seventy-eight that the frame's axis runs through
  // and that shows the whole of itself. What a judging still stands up, and what a visitor's finger
  // lands on first if they simply touch the middle of the spread. A getter, because the outer bow
  // carries a different number of cards under the two nestings (reveal-spread.js → layoutFor).
  const keystoneIndex = () => (SPREAD.tiers[0].n - 1) / 2;

  // THE WINDOW HAS CHANGED SHAPE. reveal.js calls this at build and on every resize, before the
  // camera re-solves its plates from `SPREAD.tiers`. If the nesting changed, every card on the
  // cloth belongs to a different bow now: each keeps its index (and so its slug, and whether it has
  // been taken) and is re-seated on the new bows and laid again where it lies. Nothing is animated —
  // a window being dragged is not a beat.
  function reshape(aspect) {
    if (!layoutFor(aspect)) return false;
    if (!entries.length) return true;
    hover = null;
    if (canvas) canvas.style.cursor = '';
    for (const e of entries) {
      const { tier, j } = tierOf(e.i);
      e.t = tier;
      e.j = j;
      e.lift = e.liftTarget = 0;
      e.push = e.pushTarget = 0;
      if (!e.removed && !e.flying) applyEntry(e);
    }
    return true;
  }

  return {
    FAN,
    SPREAD,
    reshape,
    get keystoneIndex() {
      return keystoneIndex();
    },
    group,
    entries,
    picks,
    remaining,
    lay,
    liftIndex,
    fakePicks,
    clear,
    fanFrames,
    pickFrames,
    gatherFrames,
    arm,
    doPick,
    gather,
    step,
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
