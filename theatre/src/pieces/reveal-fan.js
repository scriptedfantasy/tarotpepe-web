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
import { compose, dealTrack } from './reveal-takes.js';
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
export function buildFan(ctx, cards, player) {
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
      spin: 0.14,
      apex: 0.05,
      bank: 0.1,
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
    return compose([
      { offset: 0, frames: fr },
      { offset: 2, frames: shiftFrames },
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
    for (let k = 1; k <= 5; k++) {
      F(() => {
        if (k === 1) sound('riffle');
        rem.forEach((e, r) => {
          const f = clamp01((k - (r * 2) / Math.max(1, R - 1)) / 3);
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
    return frames;
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
  // the hover in-betweens, on the stepped clock
  function step() {
    if (!entries.length) return;
    for (const e of entries) {
      if (e.lift !== e.liftTarget) e.lift = e.lift < e.liftTarget ? Math.min(e.liftTarget, e.lift + 0.5) : Math.max(e.liftTarget, e.lift - 0.5);
      applyEntry(e);
    }
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
