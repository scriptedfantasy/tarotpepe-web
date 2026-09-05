// PIECE: reveal — the card choreography, drawn on twos: the shuffle (the deck cut, the halves
// riffled together, the pile tapped square), the SPREAD (the WHOLE DECK — all 78, the user's rule
// — laid face down in four nested bows across the near half of the cloth, in gathered handfuls;
// see reveal-spread.js for where they lie and why), the visitor's pick (the card under the
// pointer stands UP the frame in two drawings and is taken by a tap on it; it is carried to its
// slot in four, the apex held), the gather (the rest swept back onto the deck), the deal (three
// cards flicked from the deck to their slots, for the flow that has no visitor), and the turn (the
// card lifted by the edge nearest the visitor, stood on edge for one held frame with its face to
// the visitor, dropped with a one-frame bounce).
// The other cards never move. Everything is a list of drawings indexed by the 12 fps frame, so a
// judging state with `?t=` shows a deterministic frame and a live take is the same list played.
//
// API (all Promises resolve when the motion has settled):
//   shuffle() → Promise
//   fan() → Promise<count>                 all 78 laid out; then the visitor may pick
//   awaitPick() → Promise<pick|null>       arms the pointer (it stands a card up; a tap on the
//                                          standing card takes it — 58 x 101 px on a phone); resolves with
//                                          { index, ordinal, slug, slot, mesh } when a card has landed
//   pick(i) / pickByOrdinal(n) / pickRandom() → Promise<pick>   i 0-based, n 1-based, from the left
//   gather() → Promise                     the rest of the spread back onto the deck
//   turn(i) → Promise                      slot i turned face up; the others never move
//   deal(slugs) → Promise<meshes>          three cards from the deck to the slots, face down
//   picks (the picks so far), stop(), setState(name)
//   states: dealt · turning · revealed · fan (stills) · shuffle · fanning · pick · gather · deal · turn (motion)
import { mulberry32 } from '../core/rng.js';
import { FPS, compose, hold, turnTrack, turnPose, turnEdge, handFrames, handSide, stagedRow, laidPose } from './reveal-takes.js';
import { buildShuffle } from './reveal-shuffle.js';
import { buildFan } from './reveal-fan.js';
import { buildHand } from './reveal-hand.js';
import { buildGround } from './reveal-ground.js';

export const meta = {
  name: 'reveal',
  judge: { shot: 'table', states: ['dealt', 'turning', 'revealed', 'fan', 'shuffle', 'fanning', 'pick', 'gather', 'deal', 'turn'], motion: true },
  files: ['src/pieces/reveal.js', 'src/pieces/reveal-takes.js', 'src/pieces/reveal-shuffle.js', 'src/pieces/reveal-fan.js', 'src/pieces/reveal-spread.js', 'src/pieces/reveal-hand.js', 'src/pieces/reveal-ground.js'],
};

// Where each judging state is shot from. His hand is a flat cut-out lying IN the cloth
// (reveal-hand.js) and only reads from a lens well above the table — it takes itself off the
// cloth from anywhere else — so every state in which it touches a card is staged from an overhead
// or a rake, never from `table`, whose lens is at the height of the cloth.
//
// All four are the camera piece's own NAMED shots now, so the judging views and the film are cut
// to the same frames (round 5). `fan` for everything that happens flat on the cloth; `turn` — the
// rake 46° above the cloth — for the turn, because a card stood on its edge at 78° is a hairline
// from straight down and that is the money drawing of the whole evening; `riffle` — 58° over the
// deck at 0.6 m — for the shuffle, because the deck in profile is the only place an interleave can
// be read from. The stills in which nothing touches anything (dealt, revealed) keep the piece's
// frontal 'table' frame.
const SHOT = { fan: 'fan', fanning: 'fan', pick: 'fan', gather: 'fan', deal: 'fan', turn: 'turn', turning: 'turn', shuffle: 'riffle' };

const SLUGS = ['the-fool', 'the-star', 'the-house-of-god'];

export async function build(ctx) {
  const cards = ctx.pieces.cards;
  const { card } = ctx.layout.spread;
  // The row this piece lays the cards in — not the layout's, which is 36 cm wide and empties every
  // insert of everything but one card (reveal-takes.js → stagedRow). Published as `api.slots`.
  const slots = stagedRow(ctx.layout);
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
    hand?.clear();
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

  // THE DECK COMES OFF THE STILL LIFE. The user: "when the cards are mixed they collide with the
  // wine bottle". Measured (tools/_rv7-probe.mjs): the layout stands the deck at (0.38, −0.25) and
  // the candle-in-a-bottle at (0.44, −0.34) with a body 37 mm across — so the deck's own upstage
  // corner sits 22.8 mm from the bottle's axis, fourteen millimetres INSIDE it, before anything
  // moves; and the riffle parts its halves 95 mm either side, straight through it. The far band of
  // the cloth is a still life (bottle, glass, letter, watch, four coins) with no clear patch of
  // 0.33 x 0.25 anywhere in it, so there is no shuffle that can be staged there.
  //
  // So the prop that moves is OURS. The deck stands on the bare working cloth in front of him,
  // dead centre, where table.js says it belongs ("the whole near half is clear for the three card
  // slots and the deck") and where a reader's deck actually sits. At (0, 0.44) it is 0.50 m from
  // the bottle, 66 mm downstage of the reading row, 10 mm clear of the card inserts' frames and
  // wholly inside the fan plate at both window shapes.
  //
  // TEMPORARY, and it wants `ctx.layout.deck.pos` to say this instead — see the contract note in
  // the return value. Until it does, the camera's two deck plates are slid onto it the way the
  // card inserts already are (aimInserts): their solved distance, rake and lens are left exactly
  // as the camera made them and only the aim is moved, and both stand aside the moment the camera
  // aims them anywhere but at the layout's idea of where the deck is.
  const DECK_HOME = [0, ctx.layout.spread.y, 0.44];
  // where each plate is aimed. `riffle` is a hand's breadth upstage of the deck itself because the
  // frame is 0.35 m deep and, centred any further downstage, its two bottom corners leave the
  // 0.62 m rim: at 0.386 they come to 0.616.
  const DECK_AIM = { riffle: 0.386, deck: 0.42 };
  if (deck) deck.position.set(...DECK_HOME);
  const deckPos = () => (deck ? [deck.position.x, deck.position.y, deck.position.z] : ctx.layout.deck.pos);
  function aimDeckShots() {
    const shots = ctx.pieces.camera?.shots;
    if (!shots || !deck) return;
    for (const name in DECK_AIM) {
      const s = shots[name];
      if (!s?.look || !s?.pos) continue;
      if (Math.abs(s.look[2] - ctx.layout.deck.pos[2]) > 0.12) continue; // the camera has taken it over
      const dx = -s.look[0], dz = DECK_AIM[name] - s.look[2];
      s.look[0] += dx;
      s.look[2] += dz;
      s.pos[0] += dx;
      s.pos[2] += dz;
    }
  }
  const poseOf = (m) => ({ p: m.position.clone(), ry: m.rotation.y });
  // where a card ends up after a hand has turned it: a millimetre or two off where it lay, and one
  // card-thickness proud of the two beside it — it was picked up and put back down, so it goes down
  // on top. At the row's spacing that thickness is the difference between three cards in a line and
  // three cards in a heap.
  function landedPose(m, i) {
    const rng = mulberry32(700 + i * 13 + ctx.seed);
    const p = m.position.clone();
    p.x += (rng() - 0.5) * 0.004;
    p.z += (rng() - 0.5) * 0.003;
    p.y += T;
    return { p, ry: -m.rotation.y + (rng() - 0.5) * 0.04 };
  }
  const clearDrawn = () => {
    if (!cards?.drawn) return;
    for (const m of cards.drawn.children) m.geometry?.dispose?.();
    cards.drawn.clear();
  };

  // ---- his hand, for the beats shot over the cloth ------------------------------------------------
  const hand = buildHand(ctx);

  // ---- the tone a card puts on the cloth (reveal-ground.js): a drawn patch, never a soft shadow --
  const CLOTH_Y = ctx.layout.table.top + 0.0004; // a hair over the cloth's own disc
  const ground = buildGround(ctx, { w: card.w, h: card.h });
  if (cards?.drawn) ground.follow(cards.drawn, CLOTH_Y); // every card laid in the row wears one

  // ---- the fan and the visitor's pick ------------------------------------------------------------
  const fan = buildFan(ctx, cards, { play, stop }, hand, slots);

  // ---- the takes --------------------------------------------------------------------------------
  let shuffleTake = null;
  function shuffleFrames() {
    if (!shuffleTake && deck) {
      shuffleTake = buildShuffle(ctx, deck, T, {
        hand,
        cues: {
          cut: () => pepe()?.shuffle?.(),
          riffle: () => sound('riffle'),
          tap: () => sound('tap'),
        },
      });
    }
    return shuffleTake?.frames ?? [() => {}];
  }

  const DECK_SIDE = 'R'; // the deck stands at his right, so the hand that works it is that one

  // THE THREE CARDS LAID, and they come in with HIS HAND. The deck stands upstage-right of the
  // frame the cards are read in since the layout moved it (round 5), so a card thrown from it
  // crosses the top edge and is cut by it for most of its flight; he brings the three in instead,
  // in a little packet under his fingers, and lays them left to right — each one sliding out from
  // under his hand into its slot. Nothing but his own hand crosses an edge of the frame.
  function dealFrames(meshes) {
    const n = meshes.length;
    const HOLD = 0.006; // the underside of the packet, above the cloth
    const d = deckPos();
    // one pose per drawing: his fingertips, the packet under them, and how many cards it still has
    const poses = [];
    const P = (x, z, yaw, held, py) =>
      poses.push({ x, z, yaw, held, py, floor: py + Math.max(0, held) * T, y: 0.003, px: x - 0.045 * Math.sin(yaw), pz: z - 0.045 * Math.cos(yaw) });
    const lay = []; // the drawing on which each card leaves his hand
    // in from the top of the frame, from the deck's side of the table
    P(d[0] - 0.10, d[2] + 0.16, -0.16, n, HOLD + 0.075);
    P(d[0] - 0.16, d[2] + 0.30, -0.20, n, HOLD + 0.055);
    for (let i = 0; i < n; i++) {
      const s = slots[Math.min(i, slots.length - 1)];
      // He carries each card level with its slot, never upstage of it: the frame's top edge falls
      // only nine centimetres above the row, so a card held any further back is cut by it.
      const yaw = -0.22, over = { x: s[0] + 0.085, z: s[2] + 0.02 };
      P(over.x, over.z, yaw, n - i, HOLD + 0.042); // carried over the slot
      P(over.x, over.z, yaw, n - i, HOLD + 0.012); // and down onto it
      lay.push(poses.length); // the card slides out from under his hand on this drawing
      P(s[0] + 0.052, s[2] + 0.045, yaw, n - i - 1, HOLD);
      P(s[0] + 0.052, s[2] + 0.045, yaw, n - i - 1, HOLD); // pressed flat, held
      P(s[0] + 0.052, s[2] - 0.010, yaw, n - i - 1, HOLD + 0.028); // lifted off it
    }
    P(d[0] - 0.16, d[2] + 0.30, -0.20, 0, HOLD + 0.06);
    P(d[0] - 0.10, d[2] + 0.14, -0.16, 0, HOLD + 0.10);

    const laidBy = (k) => lay.reduce((c, L) => c + (L <= k ? 1 : 0), 0);
    const tracks = [
      {
        offset: 0,
        frames: poses.map((p, k) => () => {
          if (deckTop) deckTop.visible = k >= poses.length - 2;
        }),
      },
    ];
    meshes.forEach((m, i) => {
      const to = poseOf(m);
      const k0 = lay[i];
      const frames = [];
      // carried in his hand, at its place in the little packet
      for (let k = 0; k < k0; k++) {
        const p = poses[k], j = i - laidBy(k);
        frames.push(() => {
          m.visible = true;
          m.position.set(p.px, slots[0][1] + p.py + j * T + T / 2, p.pz);
          m.rotation.set(Math.PI, -p.yaw, 0);
        });
      }
      // and slid out from under his fingers into its slot, four drawings
      const p0 = poses[k0 - 1];
      const from = { x: p0.px, y: slots[0][1] + p0.py + T / 2, z: p0.pz, ry: -p0.yaw };
      [0.3, 0.68, 0.9, 1].forEach((u, j) => {
        frames.push(() => {
          m.visible = true;
          m.position.set(from.x + (to.p.x - from.x) * u, from.y + (to.p.y - from.y) * u + 0.005 * Math.sin(Math.PI * u), from.z + (to.p.z - from.z) * u);
          m.rotation.set(Math.PI, from.ry + (to.ry - from.ry) * u, 0);
          if (j === 0) {
            sound('deal');
            pepe()?.deal?.(i, handSide(to.p.x));
          } else if (j === 2) sound('settle');
        });
      });
      tracks.push({ offset: 0, frames });
    });
    tracks.push({
      offset: 0,
      frames: handFrames(
        hand,
        poses.map((p) => ({ x: p.x, y: p.y, z: p.z, yaw: p.yaw, floor: p.floor, pose: 'splay', side: DECK_SIDE })),
      ).concat([() => hand.off()]),
    });
    return compose(tracks);
  }

  function turnFrames(m, i) {
    const slot = poseOf(m);
    slot.p.y = slots[Math.min(i, slots.length - 1)][1];
    const landed = landedPose(m, i);
    landed.p.y = slot.p.y + T; // it comes down on top of the row, not back into it
    return turnTrack(m, slot, landed, H, {
      hand,
      cues: {
        // the hand nearest the card turns it (turnTrack draws that one), so his puppet body is
        // told which shoulder is doing it and the other stays at rest
        touch: () => pepe()?.turn?.(i, handSide(slot.p.x)),
        lift: () => sound('flip'),
        land: () => sound('settle'),
      },
    });
  }

  // ---- still poses for the judging states -------------------------------------------------------
  // cards.place() puts its cards on the LAYOUT's slots; the row is this piece's (stagedRow), so
  // every card that comes back is set down again on it, turned the little turn a hand gives it.
  // A card that has been turned rides one thickness proud of its neighbours, because that is what
  // happens: it was picked up, turned over and put back down, and it goes down on top.
  function settle(meshes, faceUp) {
    meshes.forEach((m, i) => {
      const p = laidPose(slots, i, ctx.seed);
      m.position.set(p.x, p.y + (faceUp ? T : 0), p.z);
      // a card turned face down is yawed the other way by the flip: the ROOM's yaw is what the row
      // is drawn in, so the Euler follows from it rather than the other way round
      m.rotation.set(faceUp ? 0 : Math.PI, faceUp ? p.ry : -p.ry, 0);
    });
    ground.step();
    return meshes;
  }
  async function lay(slugs, faceUp) {
    stop();
    fan.clear();
    const meshes = await cards.place(slugs, faceUp);
    if (deckTop) deckTop.visible = true;
    return settle(meshes, faceUp);
  }
  function standOnEdge(m, i) {
    const slot = poseOf(m);
    const { rx, y, dz } = turnPose(78, H);
    m.position.set(slot.p.x, slots[Math.min(i, slots.length - 1)][1] + y, slot.p.z + dz);
    m.rotation.set(rx, slot.ry + 0.03, 0);
    // …and his fingers still at the foot of the card they reared up. They stay ON THE CLOTH: a
    // flat cut-out tilted up to follow a card standing on its edge turns edge-on to the overhead
    // lens and lies in the picture as a green blade, which is exactly what it used to do.
    const e = turnEdge(78, H);
    const side = handSide(slot.p.x);
    hand.at(slot.p.x + (side === 'L' ? -0.03 : 0.03), 0.006, slot.p.z + e.z + 0.024, { yaw: -0.24, side, pose: 'point' });
  }
  // ---- the three inserts, aimed at the cards ------------------------------------------------------
  // TEMPORARY, and it wants to be deleted. camera-shots.js builds card0/card1/card2 by pointing a
  // lens straight down at ctx.layout.spread.slots — the layout's row, not the one this piece lays
  // (stagedRow) — so card0 and card2 would frame 13.5 cm of empty cloth with the card jammed into
  // the frame's edge. Until the camera derives those three from `ctx.pieces.reveal.slots`, reveal
  // slides each of them sideways onto its own card: their solved distance, lens and shift — all the
  // window-fitting work — are left exactly as the camera made them, only the x is moved. It is a
  // no-op the moment the shot is already on the card, and it stands aside entirely for a shot the
  // camera has aimed anywhere but at its layout slot. See the contract note in the return value.
  function aimInserts() {
    const shots = ctx.pieces.camera?.shots;
    if (!shots) return;
    for (let i = 0; i < slots.length; i++) {
      const s = shots[`card${i}`];
      if (!s?.look || !s?.pos) continue;
      const lx = ctx.layout.spread.slots[Math.min(i, ctx.layout.spread.slots.length - 1)][0];
      if (Math.abs(s.look[0] - lx) > 0.001) continue; // the camera has taken this one over
      const dx = slots[i][0] - s.look[0];
      if (!dx) continue;
      s.look[0] += dx;
      s.pos[0] += dx;
    }
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
      ground.step(); // the cards those patches belonged to have just been disposed
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
      const meshes = settle(await cards.place(slugs, false), false);
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
    // THE ROW, in world metres: where this piece actually lays the three cards. It is the layout's
    // row pulled in to 19 cm (reveal-takes.js → stagedRow); the camera's three inserts should be
    // aimed at these, not at ctx.layout.spread.slots, or they will centre on empty cloth.
    slots,
    // where the fan's cards are on screen (CSS px), left to right — for tests and captions
    fanScreenPositions: () => fan.screenPositions(),
    // His drawn hand on the cloth. It takes itself off whenever the camera is not overhead (see
    // reveal-hand.js), so a cut to `pepe` or `home` needs no call; `hand.hide()` / `hand.show()`
    // are there for a piece that wants the cloth to itself while the camera stays where it is.
    hand,
    _fan: fan,
    async setState(name) {
      // the beats over the cloth are judged from above, the rest from the frontal 'table'
      aimInserts();
      aimDeckShots();
      const s = SHOT[name] ?? 'table';
      ctx.pieces.camera?.cut?.(s);
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
        fan.liftIndex(40);
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
        loopPlay(fan.pickFrames(fan.entries[13], 0), 12);
      } else if (name === 'gather') {
        await lay([], false);
        fan.lay();
        fan.fakePicks([5, 34, 60]);
        loopPlay(fan.gatherFrames(), 5);
      } else await lay(SLUGS, false);
      // draw the first frame at once so a frozen clock shows the right drawing: the hand answers
      // the camera first (the state has just cut it), then the take draws with that answer
      hand.step();
      tick(ctx.clock.t);
      fan.step();
      hand.step();
      ground.step();
    },
    update(ctx) {
      if (!ctx.clock.stepped) return;
      aimInserts(); // the camera rebuilds every shot when the window changes shape
      aimDeckShots();
      if (playing.length) tick(ctx.clock.t);
      fan.step();
      hand.step(); // the withdrawal, one drawing a frame, when the camera is not overhead
      ground.step(); // the tone under each card follows the card that casts it
    },
  };
  return api;
}
