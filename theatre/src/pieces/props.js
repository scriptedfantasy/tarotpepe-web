// PIECE: props — set dressing. A crowded, ordered parlour, but one that BREATHES: the film's rooms
// are dense along a low band and bare above it, and always keep one big empty area. So the back wall
// carries a low run of furniture — bookcase | chest | bookcase, none of it above waist height — with
// bare plaster over it and either side of Pepe's head, and ONE row of pictures round the clock under
// the rail. A cabinet of bottles beside the door (four boards, three bottles a board, one bay left to
// a single demijohn), a bar cart under the window with the radio and four big bottles, curtains, a
// floor lamp, a hat stand with a black overcoat, a potted palm, hand-lettered signs, a rug, a doormat,
// a cat on the right bookcase, the three-petal pendant of the kitchen frame.
// Every prop is paper-white geometry or a solid-ink mass with its pattern left in paper; the ink pass
// draws the lines. The rule the round-1 critic set: from across the room every prop must show ONE
// solid black area and ONE bare white area — a black plinth under a white case, a black grille beside
// a paper dial, a black bezel round a paper clock face, a black frond among paper ones.
// Composed frontal and symmetrical for the 'wide' and 'home' shots; nothing in front of Pepe or the
// table, and nothing at the height of his shoulders within a hand's width of them.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import * as O from './props-objects.js';

export const meta = {
  name: 'props',
  judge: { shot: 'wide', states: ['default'] },
  files: ['src/pieces/props.js', 'src/pieces/props-textures.js', 'src/pieces/props-objects.js'],
};

export async function build(ctx) {
  const { width: W, depth: D, height: H } = ctx.layout.room;
  const rng = mulberry32(4242);
  const g = new THREE.Group();
  g.name = 'props';
  const M = O.materials();

  // The room's openings (from the room piece when it is there; its numbers otherwise).
  const room = ctx.pieces.room ?? {};
  const win = room.window ?? { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45 };
  const door = room.door ?? { x0: 1.05, x1: 1.95, y0: 0, y1: 2.45, top: 2.12 };
  const railY = room.bands?.rail?.[0] ?? 2.6;

  const WALL = -D / 2; // back wall plane
  const FLUSH = WALL + 0.04; // furniture backs sit just in front of the skirting
  const HOOK_Y = railY - 0.02;

  // ---- floor ------------------------------------------------------------------------------------
  const rug = O.rug({ w: 3.2, d: 2.6 });
  rug.position.set(0, 0, -0.2);
  g.add(rug);

  // ---- the back wall's furniture row: a LOW band — bookcase | chest | bookcase --------------------
  // Round 3: the cases came down from 1.45 m to 1.02 m and moved outboard, so the wall beside
  // Pepe's shoulders and either side of his head is bare plaster, the way the film always keeps one
  // big empty area. Half as many books, twice the spine, black and pale alternating; and the lining
  // board hardly takes tone, so the spines read as silhouettes instead of strokes lost in hatch.
  const chestW = 1.04, caseW = 0.34, caseH = 1.02;
  const CASE_BOARDS = [0.15, 0.57];
  const chest = O.console_({ w: chestW, h: 0.82, d: 0.38 });
  chest.position.set(0, 0, FLUSH + 0.19);
  g.add(chest);
  {
    const top = 0.82;
    // the lamp and the vase sit at the ENDS of the chest, clear of Pepe's head
    const d = O.doily(0.13);
    d.position.set(-0.44, top + 0.002, chest.position.z + 0.02);
    g.add(d);
    const lamp = O.mushroomLamp();
    lamp.position.set(-0.44, top, chest.position.z + 0.02);
    g.add(lamp);
    let y = top;
    for (let i = 0; i < 2; i++) {
      const t = 0.03 - i * 0.005;
      const b = O.book({ w: 0.22 - i * 0.02, h: 0.28 - i * 0.03, t, flat: true, seed: 90 + i, title: ['GRAND ALBUM', 'LE TAROT'][i], dark: i === 1 });
      b.position.set(-0.2 + i * 0.012, y + t / 2, chest.position.z + 0.02);
      b.rotation.y = (i - 0.5) * 0.1;
      g.add(b);
      y += t;
    }
    const cs = O.candleStick();
    cs.position.set(0.2, top, chest.position.z + 0.06);
    g.add(cs);
    const v = O.vase({ rng, spread: 0.78 });
    v.position.set(0.45, top, chest.position.z + 0.02);
    g.add(v);
  }
  for (const side of [-1, 1]) {
    const bc = O.shelfUnit({ w: caseW, h: caseH, d: 0.28, boards: CASE_BOARDS, plinth: 0.07, back: true });
    bc.position.set(side * 0.85, 0, FLUSH + 0.14);
    g.add(bc);
    const { x0, x1, z0 } = bc.userData.inner;
    for (const y of CASE_BOARDS) bc.add(O.bookRow({ x0, x1, y, z: z0, rng, maxH: 0.3, depth: 0.25, chunky: true }));
    if (side < 0) {
      const gl = O.globe();
      gl.position.set(0, caseH, 0.02);
      bc.add(gl);
    } else {
      // the cat, asleep on top of the bookcase, facing the room
      const cat = O.cat();
      cat.position.set(0.0, caseH, 0.0);
      cat.rotation.y = -0.2;
      bc.add(cat);
    }
  }

  // ---- the window (stage left): curtains inside the architrave, the bar cart under it, the palm -----
  // narrower panels than round 2, and half the vertical hatch in the cloth: the curtains were a
  // wall of rain-strokes beside a window that is already all shutter-louvres
  g.add(O.curtainSet({ x0: win.x0 - 0.03, x1: win.x1 + 0.03, rodY: win.y1 + 0.05, panelW: 0.19, dropTo: win.y0 + 0.02, z: WALL + 0.06 }));
  {
    const cart = O.barCart({ w: 0.96, d: 0.42, h: 0.8 });
    cart.position.set((win.x0 + win.x1) / 2, 0, WALL + 0.48);
    cart.userData.noShadow = true; // its shadow would black out the wall behind it and swallow the bottles
    g.add(cart);
    const top = cart.userData.top;
    // the radio on the top board, right; four big bottles on the left
    const r = O.radio({ w: 0.42, h: 0.26, d: 0.18 });
    r.position.set(0.25, top, 0.0);
    cart.add(r);
    cart.add(
      O.row({
        x0: -0.48,
        x1: 0.02,
        y: top,
        z: -0.02,
        rng,
        gap: 0.01,
        items: [
          { kind: 'tall', name: 'VIN', dark: true, scale: 1.2, seed: 201, bodyH: 0.19, neckH: 0.1 },
          { kind: 'square', name: 'GIN', dark: true, scale: 1.25, seed: 202, bodyH: 0.17 },
          { kind: 'corked', name: 'MARC', dark: false, scale: 1.2, seed: 203, bodyH: 0.14, neckH: 0.06 },
          { kind: 'squat', name: 'RHUM', dark: true, scale: 1.2, seed: 204, bodyH: 0.13, neckH: 0.05 },
        ],
      }),
    );
    // the lower board: the newspapers and the soda siphon (the ice bucket went; three things under
    // there read as clutter behind the cart's own rails)
    const news = O.newspaperStack({ n: 4, rng });
    news.position.set(0.16, cart.userData.lower, 0.02);
    cart.add(news);
    const s = O.siphon();
    s.position.set(-0.28, cart.userData.lower, 0.0);
    cart.add(s);
  }
  {
    const stool = new THREE.Group();
    const seat = O.cyl(0.17, 0.17, 0.025, M.wood, 20);
    seat.position.y = 0.3;
    stool.add(seat);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      stool.add(O.rod([Math.cos(a) * 0.1, 0.29, Math.sin(a) * 0.1], [Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15], 0.012, M.solid));
    }
    // The palm is set far enough out and upstage that the home shot crops it away entirely and the
    // wide keeps it whole behind the floor lamp: standing level with the lamp the two of them were
    // one tangle of black spikes at the left edge, and a frond tip poking into the home frame is
    // scribble with no body to it.
    stool.position.set(-W / 2 + 0.24, 0, -1.3);
    g.add(stool);
    const p = O.plant({ rng, leaves: 8, kind: 'palm', scale: 1.15 });
    p.position.set(-W / 2 + 0.24, 0.31, -1.3);
    g.add(p);
  }

  // ---- the door (stage right): a lettered board in the transom light, the tall bottle cabinet beside it
  {
    const cx = (door.x0 + door.x1) / 2;
    const ty = ((door.top ?? 2.12) + 0.05 + door.y1) / 2;
    // hangs in the transom opening, in front of its glazing bars, on two cords from the head lining
    const sign = O.signBoard({ w: door.x1 - door.x0 - 0.14, h: 0.2, depth: 0.012, lines: ['VOYANTE'], border: 'single', texW: 768 });
    sign.position.set(cx, ty, WALL - 0.008);
    g.add(sign);
    for (const sx of [-1, 1]) g.add(O.rod([cx + sx * 0.3, ty + 0.1, WALL - 0.008], [cx + sx * 0.3, door.y1 - 0.02, WALL - 0.02], 0.003, M.cord, 5));
    // a doormat in front of the door, lettered
    const mat = O.doorMat({ w: 0.58, d: 0.34 });
    mat.position.set(cx, 0, WALL + 0.06 + 0.2);
    g.add(mat);

    // Round 3: the cabinet was a full-height wall of 24 bottles at 42-54% ink — the heaviest thing
    // in the frame. It is now four boards instead of six (stopping 0.7 m short of the rail, so the
    // plaster above it is bare), three bottles a shelf instead of four, each a size larger, and its
    // back is open so the shelves are not a black box behind the glass.
    const CAB = [0.12, 0.66, 1.2];
    const CABH = 1.5;
    const unit = O.shelfUnit({ w: 0.54, h: CABH, d: 0.24, boards: CAB, plinth: 0.07, back: true });
    unit.position.set(W / 2 - 0.04 - 0.27, 0, FLUSH + 0.12);
    g.add(unit);
    const { x0, x1, z0 } = unit.userData.inner;
    // on top of it, where the coat on the hat stand crosses: two flat books and a black jar, so the
    // run of shelving ends in a silhouette instead of a sawn-off edge
    {
      const b = O.book({ w: 0.24, h: 0.3, t: 0.05, flat: true, seed: 71, title: 'ALMANACH', dark: true });
      b.position.set(-0.09, CABH + 0.025, 0.01);
      b.rotation.y = 0.09;
      unit.add(b);
      const j = O.shelfItem({ kind: 'jar', name: 'MIEL', h: 0.13, scale: 1.3, seed: 72 }, rng);
      j.position.set(0.13, CABH, 0.0);
      unit.add(j);
    }
    // three bottles a shelf, silhouettes different, two thirds of them solid black
    const bays = [
      [
        { kind: 'square', name: 'GIN', dark: true, bodyH: 0.16 },
        { kind: 'tall', name: 'MARC', dark: true, bodyH: 0.22, neckH: 0.1 },
        { kind: 'flask', lines: ['POIRE'], dark: false, neck: 0.07 },
      ],
      [
        { kind: 'jar', name: 'THE', h: 0.15 },
        { kind: 'squat', name: 'ANIS', dark: true, bodyH: 0.16, neckH: 0.06 },
        { kind: 'corked', name: 'PRUNE', dark: false, bodyH: 0.15 },
      ],
      [
        { kind: 'tall', name: 'VIN', dark: true, bodyH: 0.21, neckH: 0.11 },
        { kind: 'square', name: 'FINE', dark: false, bodyH: 0.14 },
        { kind: 'tall', name: 'PORTO', dark: true, bodyH: 0.23, neckH: 0.08 },
      ],
    ];
    CAB.forEach((y, i) => {
      // the second bay up carries a single big demijohn and nothing else: the film gives every
      // packed run of objects one place where the eye is allowed to stop
      if (i === 1) {
        const dj = O.shelfItem({ kind: 'corked', name: 'PRUNE', dark: true, bodyH: 0.25, neckH: 0.1, scale: 1.8, seed: 391 }, rng);
        dj.position.set(x0 + 0.17, y, z0 + 0.14);
        unit.add(dj);
        return;
      }
      unit.add(O.row({ x0, x1, y, z: z0 + 0.13, rng, gap: 0.012, items: bays[i].map((s, k) => ({ ...s, scale: 1.3, seed: 300 + i * 10 + k })) }));
    });
  }

  // ---- the centre wall: a sign under the rail, pictures around the clock, a pinboard by the door ------
  {
    const sign = O.signBoard({ w: 1.0, h: 0.18, lines: ['TAROT — READINGS — 3 CARDS', 'BY APPOINTMENT · WALK-INS TOLERATED'], border: 'double', texW: 1536 });
    sign.position.set(0, railY - 0.1, WALL + 0.045);
    g.add(sign);
    for (const sx of [-1, 1]) {
      const hook = O.sphere(0.009, M.solid, 8, 6);
      hook.position.set(sx * 0.42, railY - 0.005, WALL + 0.02);
      g.add(hook);
    }

    // Round 3: ONE row of pictures, not two, and no cork board. The lower row of four small
    // subjects sat directly over Pepe's head and the pinboard's grid of notes was the densest
    // patch on the wall; between them they were most of the 35-45% the room measured here. What is
    // left is three larger, better-drawn things — a portrait, the clock, a hand — hung in a row
    // under the rail, with bare plaster above the furniture and either side of Pepe's head.
    const rowA = [
      [-0.46, 0.4, 0.46, 'portrait', true],
      [0.46, 0.4, 0.46, 'hand', true],
    ];
    let seed = 100;
    const hang = (list, y) => {
      for (const [x, w, h, kind, ornate] of list) {
        const f = O.pictureFrame({ w, h, kind, seed: seed++, ornate });
        f.position.set(x, y, WALL + 0.015);
        g.add(f);
        O.hangCords(g, x, y + h / 2, w / 2 - 0.02, HOOK_Y, WALL + 0.012);
      }
    };
    hang(rowA, 2.04);
    const clock = O.wallClock({ r: 0.185 });
    clock.position.set(0, 2.06, WALL + 0.03);
    g.add(clock);
    O.hangCords(g, 0, 2.06 + 0.185, 0.1, HOOK_Y, WALL + 0.012);
    g.userData.pendulum = clock.userData.pendulum;
  }

  // ---- the stage-left wall (no window there): one round picture and a small shelf of jars ------------
  {
    const x = -W / 2 + 0.02;
    const rot = Math.PI / 2;
    const rf = O.roundFrame({ r: 0.17, kind: 'zodiac', seed: 7 });
    rf.position.set(x, 1.95, -1.75);
    rf.rotation.y = rot;
    g.add(rf);
    const shelf = O.wallShelf({ w: 0.6, d: 0.16 });
    shelf.position.set(x, 1.3, -2.3);
    shelf.rotation.y = rot;
    g.add(shelf);
    shelf.add(
      O.row({
        x0: -0.26,
        x1: 0.26,
        y: 0.01,
        z: 0.08,
        rng,
        items: [
          { kind: 'jar', name: 'SUCRE', h: 0.12, scale: 1.15, seed: 401 },
          { kind: 'squat', name: 'ANIS', dark: true, bodyH: 0.13, scale: 1.15, seed: 402 },
        ],
      }),
    );
  }

  // ---- the stage-right wall: a small round picture, upstage of the second window ----------------------
  {
    const x = W / 2 - 0.02;
    const rot = -Math.PI / 2;
    const rf = O.roundFrame({ r: 0.14, kind: 'key', seed: 11 });
    rf.position.set(x, 1.95, -2.18);
    rf.rotation.y = rot;
    g.add(rf);
  }

  // ---- in front of the side walls: the floor lamp (left) and the hat stand (right) ---------------------
  // Both a hand's width in from the side walls, so the wide shot keeps them whole. Tried downstage
  // and tried swapping sides in round 3; both put a cropped black mass hard against a frame edge.
  // What separates the coat from the bottle cabinet behind it is the cabinet coming down to 1.5 m —
  // the top half of the coat now hangs against bare plaster.
  const lamp = O.floorLamp({ h: 1.62 });
  lamp.position.set(-W / 2 + 0.5, 0, -0.2);
  g.add(lamp);
  const stand = O.hatStand({ h: 1.85, rng });
  stand.position.set(W / 2 - 0.5, 0, -0.75);
  g.add(stand);

  // ---- overhead: the three-petal pendant over the table -------------------------------------------------
  // hangs at the height of the window heads, so it clears the sign on the wall behind it
  const pendant = O.pendantLamp({ ceilY: H, dropTo: 2.72 });
  g.add(pendant);

  // every prop casts the key's crisp shadow, except the groups flagged noShadow (a cast shadow
  // across the wall behind them would swallow their silhouettes; the film keeps such walls bare)
  const noShadow = [];
  g.traverse((o) => {
    if (o.userData.noShadow) noShadow.push(o);
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  for (const grp of noShadow) grp.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  // ?nodress=1 leaves the dressing out: how the props' own share of a frame's ink is measured
  // against the room and the figure (tools/_cover.mjs on the two shots, and subtract).
  if (!new URLSearchParams(location.search).has('nodress')) ctx.scene.add(g);

  return {
    group: g,
    // practicals, for the lighting piece: where the drawn lamps are
    lamps: {
      floor: lamp.position.clone().add(new THREE.Vector3(0, 1.45, 0)),
      table: new THREE.Vector3(-0.36, 0.82 + 0.2, chest.position.z + 0.02),
      pendant: new THREE.Vector3(0, 2.5, 0),
    },
    setState() {},
    update(ctx) {
      if (!ctx.clock.stepped) return;
      const p = g.userData.pendulum;
      if (p) p.rotation.z = 0.16 * Math.sin(ctx.clock.t * Math.PI);
    },
  };
}
