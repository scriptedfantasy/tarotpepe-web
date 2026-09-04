// PIECE: reveal — the card choreography, drawn on twos: the shuffle (the deck cut, the halves
// riffled together in six drawings, the pile tapped square), the fan (a packet cut off the top and
// dealt face down in an arc across the near half of the cloth), the visitor's pick (a hover lifts
// a card in two drawings; a click carries it to its slot in four, the apex held), the gather (the
// rest swept back onto the deck), the deal (three cards flicked from the deck to their slots, for
// the flow that has no visitor), and the turn (the card lifted by the edge nearest the visitor,
// stood on edge for one held frame with its face to the visitor, dropped with a one-frame bounce).
// The other cards never move. Everything is a list of drawings indexed by the 12 fps frame, so a
// judging state with `?t=` shows a deterministic frame and a live take is the same list played.
//
// API (all Promises resolve when the motion has settled):
//   shuffle() → Promise
//   fan() → Promise<count>                 the packet dealt out; then the visitor may pick
//   awaitPick() → Promise<pick|null>       arms the pointer (hover lifts, click picks); resolves with
//                                          { index, ordinal, slug, slot, mesh } when a card has landed
//   pick(i) / pickByOrdinal(n) / pickRandom() → Promise<pick>   i 0-based, n 1-based, from the left
//   gather() → Promise                     the rest of the fan back onto the deck
//   turn(i) → Promise                      slot i turned face up; the others never move
//   deal(slugs) → Promise<meshes>          three cards from the deck to the slots, face down
//   picks (the picks so far), stop(), setState(name)
//   states: dealt · turning · revealed · fan (stills) · shuffle · fanning · pick · gather · deal · turn (motion)
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { FPS, compose, hold, dealTrack, turnTrack, turnPose, turnEdge, handFrames } from './reveal-takes.js';
import { buildShuffle } from './reveal-shuffle.js';
import { buildFan } from './reveal-fan.js';
import { buildHand } from './reveal-hand.js';

export const meta = {
  name: 'reveal',
  judge: { shot: 'table', states: ['dealt', 'turning', 'revealed', 'fan', 'shuffle', 'fanning', 'pick', 'gather', 'deal', 'turn'], motion: true },
  files: ['src/pieces/reveal.js', 'src/pieces/reveal-takes.js', 'src/pieces/reveal-shuffle.js', 'src/pieces/reveal-fan.js', 'src/pieces/reveal-hand.js'],
};

// The states shot from over the cloth, where his hand does the work: they are judged from the
// 'fan' shot, not the piece's default 'table'.
const OVERHEAD = new Set(['fan', 'fanning', 'pick', 'gather']);

const SLUGS = ['the-fool', 'the-star', 'the-house-of-god'];

export async function build(ctx) {
  const cards = ctx.pieces.cards;
  const { card, slots } = ctx.layout.spread;
  const T = card.t, H = card.h;
  const sound = (name) => ctx.pieces.sound?.play?.(name);
  const pepe = () => ctx.pieces.pepeAnim;

  // ---- the player: takes are lists of drawings; one drawing per stepped frame -------------------
  const playing = [];
  function play(frames, { t0 = ctx.clock.t + 1 / FPS, loop = 0 } = {}) {
    return new Promise((resolve) => {
      playing.push({ frames, t0, loop, last: -1, resolve });
    });
  }
  function stop() {
    for (const p of playing) p.resolve?.();
    playing.length = 0;
    hand?.hide();
  }
  function tick(t) {
    if (!playing.length) return; // a still state has posed the hand itself: leave it alone
    for (let i = playing.length - 1; i >= 0; i--) {
      const p = playing[i];
      let k = Math.round((t - p.t0) * FPS);
      if (k < 0) continue;
      const n = p.frames.length;
      if (p.loop) {
        const period = Math.round(p.loop * FPS);
        k = ((k % period) + period) % period;
        if (k < p.last) p.last = -1; // wrapped: redraw from the first drawing
      }
      const kk = Math.min(k, n - 1);
      // every drawing is bracketed: the hand belongs to whichever composed track claimed it in
      // THIS drawing, and leaves the cloth in a drawing where none did
      for (let j = p.last + 1; j <= kk; j++) {
        hand.begin();
        p.frames[j]();
        hand.end();
      }
      p.last = kk;
      if (!p.loop && k >= n - 1) {
        playing.splice(i, 1);
        p.resolve();
      }
    }
  }
  const loopPlay = (frames, pad = 12) => play(hold(frames.slice(), pad), { t0: 0, loop: (frames.length + pad + 2) / FPS });

  // ---- where things are -------------------------------------------------------------------------
  const deck = cards?.deck;
  const deckTop = deck?.getObjectByName?.('deck-top') ?? null;
  // the top surface of the deck's blocks (where the loose top card lies), deck-local
  const blocksTop = () => {
    if (deckTop) return deckTop.position.y - T / 2 - 0.0012;
    return (deck?.userData?.height ?? 0.036) - T - 0.0012;
  };
  // world pose of a card lying j-th from the top of a stack of `n` on the deck (deck-top hidden)
  function onDeck(j, n) {
    deck.updateMatrixWorld(true);
    const rng = mulberry32(400 + j);
    const p = new THREE.Vector3(0.0028 + (rng() - 0.5) * 0.002, blocksTop() + T / 2 + (n - 1 - j) * T + 0.0004 * (n - 1 - j), 0.0015 + (rng() - 0.5) * 0.002);
    deck.localToWorld(p);
    return { p, ry: (deck.rotation.y ?? 0) + 0.05 + (rng() - 0.5) * 0.03 };
  }
  const poseOf = (m) => ({ p: m.position.clone(), ry: m.rotation.y });
  // where a card ends up after a hand has turned it: a millimetre or two off where it lay
  function landedPose(m, i) {
    const rng = mulberry32(700 + i * 13 + ctx.seed);
    const p = m.position.clone();
    p.x += (rng() - 0.5) * 0.004;
    p.z += (rng() - 0.5) * 0.003;
    return { p, ry: -m.rotation.y + (rng() - 0.5) * 0.04 };
  }
  const clearDrawn = () => {
    if (!cards?.drawn) return;
    for (const m of cards.drawn.children) m.geometry?.dispose?.();
    cards.drawn.clear();
  };

  // ---- his hand, for the beats shot over the cloth ------------------------------------------------
  const hand = buildHand(ctx);

  // ---- the fan and the visitor's pick ------------------------------------------------------------
  const fan = buildFan(ctx, cards, { play, stop }, hand);

  // ---- the takes --------------------------------------------------------------------------------
  let shuffleTake = null;
  function shuffleFrames() {
    if (!shuffleTake && deck) {
      shuffleTake = buildShuffle(ctx, deck, T, {
        cues: {
          cut: () => pepe()?.shuffle?.(),
          riffle: () => sound('riffle'),
          tap: () => sound('tap'),
        },
      });
    }
    return shuffleTake?.frames ?? [() => {}];
  }

  // His hand resting on the deck while the cards leave it: it comes in from the top of the frame,
  // presses on the stack, and the card slides out from under it; between cards it breathes up a
  // centimetre and comes back down. `at` are the master frames at which a card leaves.
  function deckHandFrames(at, gap) {
    const d = ctx.layout.deck.pos;
    const top = (deck?.userData?.height ?? 0.036) + 0.002;
    const on = (y, dz = 0, pose = 'splay') => ({ x: d[0] - 0.012, y, z: d[2] + dz, yaw: -0.16, pose });
    const specs = [{ x: d[0] - 0.012, y: 0.07, z: d[2] - 0.3, yaw: -0.16, pose: 'splay' }];
    at.forEach((k, i) => {
      const prev = i ? at[i - 1] + 5 : 1; // where the last card's hold ended
      if (k > prev) specs.push({ ...on(top + 0.02, -0.02), n: k - prev }); // lifted between cards
      specs.push(on(top)); // the press: the card slides out
      specs.push({ ...on(top), n: 4 }); // held four frames
    });
    specs.push({ ...on(top + 0.03, -0.05), n: 2 }, { x: d[0] - 0.012, y: 0.07, z: d[2] - 0.3, yaw: -0.16, pose: 'splay' }, { off: true });
    return handFrames(hand, specs);
  }

  // the three cards stacked on the deck, then flicked to their slots one after another
  function dealFrames(meshes, gap = 4) {
    const tracks = meshes.map((m, i) => {
      const to = poseOf(m);
      const from = onDeck(i, meshes.length);
      const frames = dealTrack(m, from, to, {
        cues: {
          lift: () => {
            sound('deal');
            pepe()?.deal?.(i);
            if (deckTop && i === meshes.length - 1) deckTop.visible = true;
          },
          land: () => sound('settle'),
        },
      });
      if (deckTop) {
        const first = frames[0];
        frames[0] = () => {
          first();
          deckTop.visible = false;
        };
      }
      return { offset: i * (frames.length + gap), frames };
    });
    // the hand presses on the deck one frame before each card leaves (dealTrack's lift is its
    // second drawing), holds four, and lets the next one come
    const leaves = tracks.map((t) => t.offset + 1);
    tracks.push({ offset: 0, frames: deckHandFrames(leaves, gap) });
    return compose(tracks);
  }

  function turnFrames(m, i) {
    const slot = poseOf(m);
    slot.p.y = slots[Math.min(i, slots.length - 1)][1];
    const landed = landedPose(m, i);
    landed.p.y = slot.p.y;
    return turnTrack(m, slot, landed, H, {
      hand,
      cues: {
        touch: () => pepe()?.turn?.(i),
        lift: () => sound('flip'),
        land: () => sound('settle'),
      },
    });
  }

  // ---- still poses for the judging states -------------------------------------------------------
  async function lay(slugs, faceUp) {
    stop();
    fan.clear();
    const meshes = await cards.place(slugs, faceUp);
    if (deckTop) deckTop.visible = true;
    return meshes;
  }
  function standOnEdge(m, i) {
    const slot = poseOf(m);
    const { rx, y, dz } = turnPose(90, H);
    m.position.set(slot.p.x, slots[Math.min(i, slots.length - 1)][1] + y, slot.p.z + dz);
    m.rotation.set(rx, slot.ry + 0.03, 0);
    // and his fingers still on the edge that reared it up
    const e = turnEdge(90, H);
    const side = slot.p.x < -0.08 ? 'L' : 'R';
    hand.at(slot.p.x + (side === 'L' ? -0.02 : 0.02), Math.min(e.y, 0.9 * hand.HAND.reach) + 0.002, slot.p.z + e.z, { yaw: -0.3, side, pose: 'point' });
  }
  function faceUpAsTurned(m, i) {
    const landed = landedPose(m, i);
    m.position.copy(landed.p);
    m.rotation.set(0, landed.ry, 0);
  }

  const api = {
    // the deck cut and riffled together, tapped square
    shuffle() {
      if (!deck) return Promise.resolve();
      stop();
      fan.clear();
      return play(shuffleFrames());
    },
    // a packet cut off the deck and dealt face down in an arc; resolves with the number of cards
    async fan() {
      stop();
      fan.clear();
      clearDrawn();
      await play(fan.fanFrames());
      return fan.remaining().length;
    },
    // the visitor's pointer: hover lifts a fan card, click carries it to the next slot
    awaitPick() {
      return fan.arm();
    },
    // the i-th card from the left of what is left in the fan (0-based)
    pick(i) {
      const e = fan.remaining()[i];
      if (!e) return Promise.resolve(null);
      fan.arm();
      return fan.doPick(e);
    },
    // "the third from the left" (1-based)
    pickByOrdinal(n) {
      return api.pick(Math.max(0, Math.round(n) - 1));
    },
    // for a visitor who will not choose
    pickRandom() {
      const rem = fan.remaining();
      if (!rem.length) return Promise.resolve(null);
      fan.arm();
      return fan.doPick(ctx.rng.pick(rem));
    },
    // the rest of the fan swept together and dropped back on the deck
    gather() {
      return fan.gather();
    },
    get picks() {
      return fan.picks;
    },
    get fanCount() {
      return fan.remaining().length;
    },
    // three cards from the top of the deck to the three slots, face down (the flow without a visitor)
    async deal(slugs) {
      stop();
      fan.clear();
      const meshes = await cards.place(slugs, false);
      const frames = dealFrames(meshes);
      frames[0]();
      await play(frames);
      return meshes;
    },
    // card i lifted, stood on edge, laid face up; the others never move
    turn(i, delay = 0) {
      const m = cards.drawn.children[i];
      if (!m) return Promise.resolve();
      return play(turnFrames(m, i), { t0: ctx.clock.t + 1 / FPS + delay });
    },
    stop,
    // where the fan's cards are on screen (CSS px), left to right — for tests and captions
    fanScreenPositions: () => fan.screenPositions(),
    _fan: fan,
    async setState(name) {
      // the beats over the cloth are judged from the overhead 'fan' shot, the rest from 'table'
      ctx.pieces.camera?.cut?.(OVERHEAD.has(name) ? 'fan' : 'table');
      if (name === 'dealt' || name === 'default') await lay(SLUGS, false);
      else if (name === 'turning') {
        const meshes = await lay(SLUGS, false);
        faceUpAsTurned(meshes[0], 0);
        standOnEdge(meshes[1], 1);
      } else if (name === 'revealed') {
        const meshes = await lay(SLUGS, false);
        meshes.forEach((m, i) => faceUpAsTurned(m, i));
      } else if (name === 'shuffle') {
        await lay([], false);
        loopPlay(shuffleFrames(), 10);
      } else if (name === 'deal') {
        const meshes = await lay(SLUGS, false);
        loopPlay(dealFrames(meshes), 10);
      } else if (name === 'turn') {
        const meshes = await lay(SLUGS, false);
        const tracks = meshes.map((m, i) => ({ offset: 2 + i * 15, frames: turnFrames(m, i) }));
        loopPlay(compose(tracks), 14);
      } else if (name === 'fan') {
        // the fan laid out, one card lifted as if under the pointer; live, the visitor may pick
        // here: three picks and the rest is gathered
        await lay([], false);
        fan.lay();
        fan.liftIndex(13);
        (async () => {
          for (let k = 0; k < slots.length; k++) if (!(await api.awaitPick())) return;
          await api.gather();
        })();
      } else if (name === 'fanning') {
        await lay([], false);
        loopPlay(fan.fanFrames(), 14);
      } else if (name === 'pick') {
        // one card carried from the fan to slot 0, its neighbours closing the gap
        await lay([], false);
        fan.lay();
        loopPlay(fan.pickFrames(fan.entries[8], 0), 12);
      } else if (name === 'gather') {
        await lay([], false);
        fan.lay();
        fan.fakePicks([5, 10, 16]);
        loopPlay(fan.gatherFrames(), 12);
      } else await lay(SLUGS, false);
      // draw the first frame at once so a frozen clock shows the right drawing
      tick(ctx.clock.t);
      fan.step();
    },
    update(ctx) {
      if (!ctx.clock.stepped) return;
      if (playing.length) tick(ctx.clock.t);
      fan.step();
    },
  };
  return api;
}
