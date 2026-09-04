// reveal-fan.js — the fan and the visitor's pick, drawn on twos.
//
// After the shuffle Pepe cuts a packet off the top of the deck and deals it face down in an arc
// across the near half of the cloth: twenty-one cards overlapping like a ribbon spread, each one
// resting on the one before it, the right end on top. The visitor points at a card and it lifts a
// finger's height in two drawings and holds; they click and it is carried to the next empty slot
// in four drawings of flight with the apex held, a landing a millimetre proud, a settle; the cards
// either side close the gap a little. Three picks, and the rest is swept together in five
// drawings and dropped back on the deck.
//
// The fan cards are placeholders: the deck's own back and stock materials on a near-flat card
// with no front art. Each position is dealt a card from a shuffled deck (the visitor cannot know
// which); the real card, with its front, is made only when a placeholder is picked and takes the
// placeholder's place in the slot.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { cardGeometry } from './cards-geometry.js';
import { compose, dealTrack, handFrames } from './reveal-takes.js';
import { deckStacks } from './reveal-shuffle.js';

// The arc: pivot at (0, zMid - R), radius R, half-angle A. Every corner stays on the cloth and
// clear of the deck's footprint and of the slot cards' near edge (searched in tools/_fan-geom.mjs).
// lift/slide: the hover pose. A card in a ribbon lies under the cards to its right, so a hover
// does not lift it through them: it slides it out of the fan toward the visitor, a finger's
// length, the way a card is offered from a fan; the pinch that lifts it is the pick's first drawing.
// under: how many cards lie under a card's left edge once the ribbon is established.
export const FAN = { n: 21, zMid: 0.44, R: 0.85, A: 0.32, lift: 0.0, slide: 0.04, under: 5 };

const PI = Math.PI;
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const _r = {};
const _v = new THREE.Vector3();
const _e = new THREE.Euler();

// player: { play(frames, opts) → Promise } — the piece's take player (reveal.js)
// hand: the reveal-hand api, or null. His hand does the laying, the taking and the sweeping: it
// enters from the top of the overhead frame, and every card in this file moves because it moved.
export function buildFan(ctx, cards, player, hand = null) {
  const { card, slots, y: Y } = ctx.layout.spread;
  const W = card.w, H = card.h, T = card.t;
  const deck = cards?.deck ?? null;
  const sound = (name) => ctx.pieces.sound?.play?.(name);
  const pepe = () => ctx.pieces.pepeAnim;
  const zp = FAN.zMid - FAN.R;

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
  // three sheets, each bent a hair its own way; near flat so the ribbon stacks without the
  // cards passing through one another
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

  // ---- the deck while the fan is out: the rest of the deck squared, the cut packet on top -------
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
  const nRest = () => (S ? Math.max(1, S.nTotal - FAN.n) : 57);
  // the packet sits crooked on the rest, the way a cut is set down
  const PK = { x: 0.011, z: -0.007, ry: 0.12 };
  function deckDrawing(packet) {
    const s = stacks();
    if (!s) return;
    s.showReal(false);
    s.cards(REST, nRest(), 0);
    s.flat(REST, 0, 0, 0);
    if (packet > 0) {
      s.cards(PACKET, packet, nRest());
      s.flat(PACKET, PK.x, PK.z, PK.ry, nRest() * T);
    } else PACKET.visible = false;
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
  // world pose of the top card of the packet while it holds n cards (face-down Euler y)
  function packetTop(n) {
    return { p: deckToWorld(PK.x, nRest() * T + (n - 1) * T + T / 2, PK.z), ry: -(deckYaw() + PK.ry) };
  }

  // ---- the cards in the fan --------------------------------------------------------------------
  // entry: { i (position, 0 = left), mesh, slug, u (-1..1 along the arc), j* (a hand's jitter),
  //          lift 0|0.5|1 (the hover), liftTarget, flying (a take owns the mesh), removed }
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
    for (let i = 0; i < FAN.n; i++) {
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
        mesh,
        slug: order[i % order.length].slug,
        u: -1 + (2 * i) / (FAN.n - 1),
        jx: (jit() - 0.5) * 0.003,
        jz: (jit() - 0.5) * 0.003,
        jr: (jit() - 0.5) * 0.02,
        lift: 0,
        liftTarget: 0,
        flying: false,
        removed: false,
      });
    }
  }
  // where a card lies in the ribbon: on the arc, its left edge up on the cards under it (so it
  // tilts a degree or two about its length), a hair off where a hand would put it
  function restPose(e, out = {}) {
    const th = FAN.A * e.u;
    const h = Math.min(e.i, FAN.under) * T;
    out.th = th;
    out.x = FAN.R * Math.sin(th) + e.jx;
    out.z = zp + FAN.R * Math.cos(th) + e.jz;
    out.y = Y + T / 2 + h / 2;
    out.ry = -th + e.jr;
    out.roll = Math.asin(Math.min(1, h / W));
    return out;
  }
  // the drawn pose: the rest pose, or lifted a finger's height and slid a centimetre out of the
  // fan toward the visitor when hovered (lift 0.5 is the in-between drawing)
  function applyEntry(e) {
    if (e.flying || e.removed) return;
    const r = restPose(e, _r);
    const k = e.lift;
    e.mesh.visible = true;
    e.mesh.position.set(r.x + k * FAN.slide * Math.sin(r.th), r.y + k * FAN.lift, r.z + k * FAN.slide * Math.cos(r.th));
    // the roll stays: the card is still lying on the cards to its left, under those to its right
    e.mesh.rotation.set(PI, r.ry, r.roll);
  }
  const remaining = () => entries.filter((e) => !e.removed && !e.flying).sort((a, b) => a.u - b.u);

  // the fan laid out at once (a judging still)
  function lay() {
    makeEntries();
    stacks();
    deckDrawing(0);
    for (const e of entries) applyEntry(e);
  }
  function liftIndex(i) {
    const e = entries[i];
    if (!e) return;
    e.lift = e.liftTarget = 1;
    applyEntry(e);
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
  // the fan gone (the picks stay readable until the next fan is dealt)
  function clear() {
    hand?.hide();
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
  // The fan dealt: the deck as it is · the packet cut off the top, lifted · set down crooked on the
  // rest · a hold · then a card every second frame flicked from the packet to its place, four
  // drawings of flight with the apex held, a landing, a settle; the packet thins as they leave.
  function fanFrames() {
    makeEntries();
    const s = stacks();
    const n = FAN.n;
    const start = 4, every = 2;
    const lifted = (k) => Math.min(n, Math.max(0, Math.floor((k - start - 1) / every) + 1));
    const len = start + every * (n - 1) + 7;
    const deckTrack = [];
    for (let k = 0; k < len; k++) {
      if (k === 0)
        deckTrack.push(() => {
          deckReal();
          for (const e of entries) {
            e.mesh.visible = false;
            e.flying = true;
          }
        });
      else if (k === 1)
        deckTrack.push(() => {
          deckDrawing(0);
          if (s) {
            s.cards(PACKET, n, nRest());
            s.pivot(PACKET, _v.set(-0.02, nRest() * T + 0.028, 0.006), _e.set(0, 0.1, 0.16), -s.W / 2, -0.5, 0);
          }
          sound('deal');
          pepe()?.deal?.(0);
        });
      else if (k === 2)
        deckTrack.push(() => {
          deckDrawing(n);
          sound('settle');
        });
      else deckTrack.push(() => deckDrawing(n - lifted(k)));
    }
    const tracks = [{ offset: 0, frames: deckTrack }];
    entries.forEach((e, i) => {
      const from = packetTop(n - i);
      const r = restPose(e, {});
      const to = { p: new THREE.Vector3(r.x, r.y, r.z), ry: r.ry };
      const fr = dealTrack(e.mesh, from, to, {
        cues: {
          lift: () => {
            sound('deal');
            if (i % 7 === 3) pepe()?.deal?.(i);
          },
          land: () => sound('settle'),
        },
      });
      fr[0] = () => {
        e.flying = true;
        e.mesh.visible = false;
      };
      fr[fr.length - 1] = () => {
        e.flying = false;
        e.lift = e.liftTarget = 0;
        applyEntry(e);
      };
      tracks.push({ offset: start + every * i, frames: fr });
    });
    // His hand: in from the top of the frame, a hold on the cut packet while the first cards come
    // out from under it, then a sweep left to right along the arc, laying a card every second
    // frame under the heel of the hand, and away. Card i settles at frame start + 2i + 6.
    if (hand) {
      // the heel of the hand on the near half of the card just laid, so the next one arrives from
      // upstage and slides in under his fingers instead of landing on top of them
      const land = (i) => {
        const r = restPose(entries[i], {});
        return { x: r.x, y: 0.006, z: r.z + 0.05, yaw: r.ry, pose: 'splay' };
      };
      const pk = deckToWorld(PK.x - 0.01, 0, PK.z);
      const specs = [
        { x: pk.x, y: 0.09, z: pk.z - 0.26, yaw: -0.16, pose: 'splay' },
        { x: pk.x, y: (nRest() + n) * T + 0.004, z: pk.z, yaw: -0.16, pose: 'splay', n: 4 }, // the hold on the packet
      ];
      for (let i = 0; i < n; i++) specs.push({ ...land(i), n: 2 });
      const last = land(n - 1);
      specs.push({ ...last, y: 0.05, z: last.z - 0.16, n: 2 }, { ...last, y: 0.09, z: last.z - 0.34 }, { off: true });
      // card i settles at frame start + 2i + 6, so the hand is over its place as it lands
      tracks.push({ offset: 4, frames: handFrames(hand, specs) });
    }
    return compose(tracks);
  }

  // where a picked card lies in slot k: a millimetre off, a degree off, as a hand puts it
  function slotPose(k) {
    const rng = mulberry32(1013 + ctx.seed + k * 7);
    const s = slots[Math.min(k, slots.length - 1)];
    return { p: new THREE.Vector3(s[0] + (rng() - 0.5) * 0.003, s[1], s[2] + (rng() - 0.5) * 0.003), ry: (rng() - 0.5) * 0.03 };
  }

  // The pick: the card carried from where it lies (lifted, if the pointer had it) to slot k, low
  // and calm, while its neighbours close the gap a little in two drawings.
  function pickFrames(e, slot) {
    const from = { p: e.mesh.position.clone(), ry: e.mesh.rotation.y };
    const to = slotPose(slot);
    const fr = dealTrack(e.mesh, from, to, {
      spin: 0.12,
      apex: hand ? 0.026 : 0.05, // carried in his fingers, not flicked: it stays near the cloth
      bank: hand ? 0.06 : 0.1,
      cues: {
        lift: () => {
          sound('pick');
          pepe()?.deal?.(slot);
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
    const du = 2 / (FAN.n - 1);
    const shifts = [];
    for (const o of entries) {
      if (o === e || o.removed || o.flying) continue;
      const d = Math.abs(o.i - e.i);
      if (d > 3) continue;
      shifts.push({ o, u0: o.u, u1: o.u + [0, 0.4, 0.2, 0.1][d] * du * (o.u < e.u ? 1 : -1) });
    }
    const shiftFrames = [0, 0.5, 1].map((f) => () => {
      for (const s of shifts) s.o.u = s.u0 + (s.u1 - s.u0) * f;
    });
    if (!hand)
      return compose([
        { offset: 0, frames: fr },
        { offset: 2, frames: shiftFrames },
      ]);
    // His hand takes the card the visitor chose: in from the top of the frame, thumb and
    // forefinger down on the card, a two-frame hold, and only then does the card travel — under
    // his fingers the whole way — to its slot, where he presses it flat and lets go.
    const D = 4; // the card waits while the hand comes in and holds
    const side = from.p.x < -0.08 ? 'L' : 'R'; // the hand nearest the card he is taking
    const sgn = side === 'L' ? -1 : 1;
    const pinch = (p, ry, y) => ({ x: p.x, y: y ?? 0.006, z: p.z + 0.03, yaw: sgn * -ry * 0.6 - 0.12, side, pose: 'pinch' });
    // his fingers stay on the card for every drawing of the flight; `compose` holds a track's last
    // drawing for ever, so each of the three hand tracks ends by letting the hand go
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
        offset: 0, // in from the top of the frame, down on the card, and a two-frame hold
        frames: handFrames(hand, [{ ...pinch(from.p, from.ry, 0.07), z: from.p.z - 0.24 }, { ...pinch(from.p, from.ry, 0.03), z: from.p.z - 0.08 }, pinch(from.p, from.ry), pinch(from.p, from.ry), { off: true }]),
      },
      { offset: D, frames: ride },
      {
        offset: D + fr.length - 1, // pressed flat in its slot, then away
        frames: handFrames(hand, [{ off: true }, pinch(to.p, to.ry), { ...pinch(to.p, to.ry, 0.04), z: to.p.z - 0.14 }, { ...pinch(to.p, to.ry, 0.08), z: to.p.z - 0.32 }, { off: true }]),
      },
    ]);
  }

  // The gather: the ribbon swept together from the left in five drawings into a packet at the
  // right end, a hold, the packet lifted and tipped toward the deck, dropped on it; the real deck.
  function gatherFrames() {
    const rem = entries.filter((e) => !e.removed).sort((a, b) => a.u - b.u);
    const R = rem.length;
    const rests = rem.map((e) => restPose(e, {}));
    const closed = (r) => ({ x: FAN.R * Math.sin(FAN.A) + 0.004, y: Y + T / 2 + r * T, z: zp + FAN.R * Math.cos(FAN.A), ry: -FAN.A });
    const onDeck = (r) => {
      const p = deckToWorld(0.003, nRest() * T + r * T + T / 2, 0.002);
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
      rem.forEach((e, r) => {
        e.flying = true;
        e.lift = e.liftTarget = 0;
        set(e, rests[r], rests[r], 0, rests[r].roll);
      });
    });
    // eight drawings, each card closing three frames after his hand has passed over it, so the
    // ribbon collapses behind the sweep instead of all at once
    const SWEEP = 8;
    for (let k = 1; k <= SWEEP; k++) {
      F(() => {
        if (k === 1) sound('riffle');
        rem.forEach((e, r) => {
          const f = clamp01((k - (r * 5) / Math.max(1, R - 1)) / 3);
          set(e, rests[r], closed(r), f, rests[r].roll * (1 - f));
        });
      });
    }
    F(() => rem.forEach((e, r) => set(e, closed(r), closed(r), 1)));
    F(() => {
      rem.forEach((e, r) => {
        set(e, closed(r), onDeck(r), 0.45, -0.3);
        e.mesh.position.y += 0.03;
      });
      sound('deal');
      pepe()?.deal?.(3);
    });
    F(() => {
      rem.forEach((e, r) => set(e, onDeck(r), onDeck(r), 1));
      sound('settle');
    });
    F(() => {
      for (const e of rem) e.mesh.visible = false;
      deckReal();
    });
    if (!hand) return frames;
    // His hand sweeps the ribbon in: it lands at the left end, pushes right along the arc with the
    // cards closing under it, presses the packet square, carries it to the deck and goes.
    const dk = deckToWorld(0.003, 0, 0.002);
    const sweep = (f) => {
      const th = FAN.A * (2 * f - 1);
      return { x: FAN.R * Math.sin(th), y: 0.004 + f * 0.008, z: zp + FAN.R * Math.cos(th), yaw: -th, pose: 'splay' };
    };
    const packet = { x: closed(0).x, y: R * T + 0.004, z: closed(0).z, yaw: -FAN.A, pose: 'splay' };
    const specs = [{ ...sweep(0), y: 0.09, z: sweep(0).z - 0.3 }];
    for (let k = 0; k < SWEEP; k++) specs.push(sweep(k / (SWEEP - 1)));
    specs.push(packet, { ...packet, y: 0.05, z: packet.z - 0.05, pose: 'pinch' }, { x: dk.x, y: nRest() * T + R * T + 0.004, z: dk.z, yaw: -0.16, pose: 'pinch' }, { x: dk.x, y: 0.1, z: dk.z - 0.3, yaw: -0.16, pose: 'pinch' }, { off: true });
    return compose([
      { offset: 0, frames },
      { offset: 0, frames: handFrames(hand, specs) },
    ]);
  }

  // ---- the visitor's hand: hover lifts, click picks ----------------------------------------------
  const canvas = ctx.renderer?.domElement ?? null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let armed = false, picking = false, hover = null, pending = null;
  function hit(ev) {
    if (!canvas || !entries.length) return null;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    const list = [];
    for (const e of entries) if (!e.removed && !e.flying) list.push(e.mesh);
    const hits = ray.intersectObjects(list, false);
    return hits.length ? entries[hits[0].object.userData.fan] : null;
  }
  function setHover(e) {
    if (hover === e) return;
    if (hover) hover.liftTarget = 0;
    hover = e;
    if (e) e.liftTarget = 1;
    if (canvas) canvas.style.cursor = e ? 'pointer' : '';
  }
  canvas?.addEventListener('pointermove', (ev) => {
    if (!armed) return;
    setHover(hit(ev));
  });
  canvas?.addEventListener('pointerleave', () => setHover(null));
  canvas?.addEventListener('pointerdown', (ev) => {
    if (!armed || picking) return;
    const e = hit(ev);
    if (e) doPick(e);
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
    return pending.promise;
  }
  async function doPick(e) {
    if (!e || e.removed || e.flying || picking || picks.length >= slots.length) return pending?.promise ?? null;
    picking = true;
    const slot = picks.length;
    const ordinal = remaining().indexOf(e) + 1;
    setHover(null);
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
    await player.play(gatherFrames());
    clear();
  }
  // While the ribbon is out and the visitor is choosing — half a minute, in a locked frame with
  // nothing else in it — his hand waits on the deck at the top of the picture with its fingers on
  // the cloth, and drums them once every two and a half seconds. A held pose, on twos: he is in
  // the shot the whole time the visitor is deciding.
  // It waits to the right of the spread, clear of the slots and just below the deck, far enough
  // into the picture that the whole drawing is in frame.
  const WAIT = { x: 0.395, z: 0.225, yaw: -0.26 };
  function waiting() {
    if (!hand) return;
    const k = ctx.clock.frame % 30;
    const up = k === 24 || k === 27 ? 0.012 : k === 25 || k === 26 ? 0.024 : 0;
    hand.at(WAIT.x, 0.004 + up, WAIT.z + up * 0.5, { yaw: WAIT.yaw, pose: 'splay' });
  }

  // the hover in-betweens, on the stepped clock
  function step() {
    if (!entries.length) return;
    for (const e of entries) {
      if (e.lift !== e.liftTarget) e.lift = e.lift < e.liftTarget ? Math.min(e.liftTarget, e.lift + 0.5) : Math.max(e.liftTarget, e.lift - 0.5);
      applyEntry(e);
    }
    if (armed && !picking) waiting();
  }
  // where the cards are on screen (CSS px): the visible strip of each, for tests and for a
  // caption that points at "the third from the left"
  function screenPositions() {
    if (!canvas) return [];
    const r = canvas.getBoundingClientRect();
    return remaining().map((e) => {
      e.mesh.updateMatrixWorld(true);
      const v = e.mesh.localToWorld(new THREE.Vector3(-0.05, 0, 0)).project(ctx.camera);
      return { index: e.i, slug: e.slug, x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    });
  }

  return {
    FAN,
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
