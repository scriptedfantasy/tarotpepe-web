// PIECE: reveal — the card choreography, drawn on twos: the shuffle (the deck cut, the halves
// riffled together in six drawings, the pile tapped square), the deal (three cards flicked from
// the deck to their slots one after another, four drawings of flight with the apex held, a landing
// a millimetre proud, a settle), and the turn (the card lifted by the edge nearest the visitor,
// stood on edge for one held frame with its face to the visitor, dropped with a one-frame bounce).
// The other cards never move. Everything is a list of drawings indexed by the 12 fps frame, so a
// judging state with `?t=` shows a deterministic frame and a live take is the same list played.
//
// API: shuffle() → Promise, deal(slugs) → Promise<meshes>, turn(i) → Promise, stop(),
//      setState(name): dealt · turning · revealed (still) · shuffle · deal · turn (looping motion)
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { FPS, compose, hold, dealTrack, turnTrack, turnPose } from './reveal-takes.js';
import { buildShuffle } from './reveal-shuffle.js';

export const meta = {
  name: 'reveal',
  judge: { shot: 'table', states: ['dealt', 'turning', 'revealed', 'shuffle', 'deal', 'turn'], motion: true },
  files: ['src/pieces/reveal.js', 'src/pieces/reveal-takes.js', 'src/pieces/reveal-shuffle.js'],
};

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
  }
  function tick(t) {
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
      for (let j = p.last + 1; j <= kk; j++) p.frames[j]();
      p.last = kk;
      if (!p.loop && k >= n - 1) {
        playing.splice(i, 1);
        p.resolve();
      }
    }
  }

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

  // the three cards stacked on the deck, then flicked to their slots one after another
  function dealFrames(meshes, gap = 4) {
    const tracks = meshes.map((m, i) => {
      const to = poseOf(m);
      const from = onDeck(i, meshes.length);
      const frames = dealTrack(m, from, to, {
        cues: {
          lift: () => {
            pepe()?.deal?.(i);
            if (deckTop && i === meshes.length - 1) deckTop.visible = true;
          },
          land: () => sound('snap'),
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
    return compose(tracks);
  }

  function turnFrames(m, i) {
    const slot = poseOf(m);
    slot.p.y = slots[Math.min(i, slots.length - 1)][1];
    const landed = landedPose(m, i);
    landed.p.y = slot.p.y;
    return turnTrack(m, slot, landed, H, {
      cues: {
        touch: () => pepe()?.turn?.(i),
        lift: () => sound('flip'),
        land: () => sound('snap'),
      },
    });
  }

  // ---- still poses for the judging states -------------------------------------------------------
  async function lay(slugs, faceUp) {
    stop();
    const meshes = await cards.place(slugs, faceUp);
    if (deckTop) deckTop.visible = true;
    return meshes;
  }
  function standOnEdge(m, i) {
    const slot = poseOf(m);
    const { rx, y, dz } = turnPose(90, H);
    m.position.set(slot.p.x, slots[Math.min(i, slots.length - 1)][1] + y, slot.p.z + dz);
    m.rotation.set(rx, slot.ry + 0.03, 0);
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
      return play(shuffleFrames());
    },
    // three cards from the top of the deck to the three slots, face down
    async deal(slugs) {
      stop();
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
    async setState(name) {
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
        const frames = shuffleFrames();
        play(hold(frames.slice(), 10), { t0: 0, loop: (frames.length + 12) / FPS });
      } else if (name === 'deal') {
        const meshes = await lay(SLUGS, false);
        const frames = dealFrames(meshes);
        play(hold(frames.slice(), 10), { t0: 0, loop: (frames.length + 14) / FPS });
      } else if (name === 'turn') {
        const meshes = await lay(SLUGS, false);
        const tracks = meshes.map((m, i) => ({ offset: 3 + i * 12, frames: turnFrames(m, i) }));
        const frames = compose(tracks);
        play(hold(frames.slice(), 10), { t0: 0, loop: (frames.length + 18) / FPS });
      } else await lay(SLUGS, false);
      // draw the first frame at once so a frozen clock shows the right drawing
      tick(ctx.clock.t);
    },
    update(ctx) {
      if (!ctx.clock.stepped || !playing.length) return;
      tick(ctx.clock.t);
    },
  };
  return api;
}
