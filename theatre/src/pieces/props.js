// PIECE: props — set dressing. A crowded, ordered parlour, but one that BREATHES: the film's rooms
// are dense along a low band and bare above it, and always keep one big empty area. So the back wall
// carries a low run of furniture — bookcase | the operator's position | bookcase, none of it above
// waist height — with bare plaster over it and either side of Pepe's head, and ONE row of pictures
// round the clock under the rail. The PTT's spares press beside the door (four boards, three vessels
// a board, one bay left to a single carboy), the test table under the window with the radio, a
// headset and three bottles, curtains, a floor lamp, a hat stand with a black overcoat, a potted
// palm, hand-lettered signs, a rug, a doormat, a cat on the right bookcase, the three-petal pendant
// of the kitchen frame.
// TWO OF THESE WORK. The radio on the cart plays (round 8) and the cat is a lamp (round 9): click
// it and the black mass goes white. Both are at the foot of this file, under THE SWITCHES, THE
// RADIO and THE CAT. Neither announces itself — the cursor over the object is the whole affordance.
// ROUND 6 — THE ROOM IS THE TOWN'S OLD MANUAL TELEPHONE EXCHANGE (PROPS.md). It reads in three
// layers: the flat that was here (the paper, the cornice, the doily), the exchange (the position,
// the press, the jack field, the diagram), and his own nine or ten things (the rug, the table, the
// deck, the globe, the vase, the cat). Layer 3 is the smallest and it is scattered through the
// other two, which is the joke the set is built on: a vase of dried flowers on a dead switchboard.
// Every prop is paper-white geometry or a solid-ink mass with its pattern left in paper; the ink pass
// draws the lines. The rule the round-1 critic set: from across the room every prop must show ONE
// solid black area and ONE bare white area — a black plinth under a white case, a black grille beside
// a paper dial, a black bezel round a paper clock face, a black frond among paper ones.
// Composed frontal and symmetrical for the 'wide' and 'home' shots; nothing in front of Pepe or the
// table, and nothing at the height of his shoulders within a hand's width of them.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import * as O from './props-objects.js';
import { build as buildSwitchboard } from './egg-switchboard.js';
import { eggFuse } from './egg-fuse.js';
import { buildVortex } from './egg-vortex.js';
import { buildWine } from './egg-wine.js';
import { eggGlobe } from './egg-globe.js';
import { buildInsects, insectState } from './egg-insects.js';

export const meta = {
  name: 'props',
  judge: { shot: 'wide', states: ['default', 'cat-lit', 'switchboard-plugged', 'fuse-out', 'vortex-mid', 'wine-drunk', 'globe-spinning', 'insects-gathered'] },
  files: ['src/pieces/props.js', 'src/pieces/props-textures.js', 'src/pieces/props-objects.js', 'src/pieces/egg-switchboard.js'],
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

  let signMesh = null, signPivot = null; // the wall board over Pepe's head; published below
  let radioObj = null; // the set on the cart, and the cat on the right-hand bookcase: the two things
  let catObj = null; //  the visitor may work. Both are wired up at the foot of this file.
  let wineObj = null; // the VIN bottle on the cart; src/pieces/egg-wine.js does the rest
  let globeObj = null; // the globe on the left bookcase; egg-globe.js turns it

  const WALL = -D / 2; // back wall plane
  const FLUSH = WALL + 0.04; // furniture backs sit just in front of the skirting
  const HOOK_Y = railY - 0.02;

  // ---- floor ------------------------------------------------------------------------------------
  // ROUND 5, THE PLAIN FIELD. The rug's far edge, its width and every mark printed on it are where
  // round 4 left them; what changed is where it STOPS on the visitor's side. It used to end at
  // z = 1.1, which put its scroll border and fringe between the table's rim (0.62) and the line a
  // tabletop plate's bottom edge reaches on the FLOOR — measured at z 0.98 on a 390x760 phone,
  // 1.03 at 360x800, 1.07 at 320x800 — so the border printed across the bottom corners of every
  // plan view of the cloth. The near edge is now at 1.66 and the border rides out with it: the
  // first printed mark on the visitor's side is at z 1.222, which is 60 cm of plain ground outside
  // the rim and 15 cm of margin past the deepest plate any phone asks for.
  // What that costs the frontal shots: the `wide` (its bottom edge crosses the boards at z 2.24)
  // still holds the whole rug, fringe and a good stretch of floorboards under it. The `home` frame
  // crosses at 1.629 — in the rug's outer plain margin — so the conversation shot is closed at the
  // bottom by the rug's own solid band with nothing bisected but bare ground. Both measured, both
  // stable across every landscape window (camera-shots.js pins them with `floorZ`).
  const RUG = { w: 3.2, near: 1.66, far: -1.5 };
  const rug = O.rug({ w: RUG.w, d: RUG.near - RUG.far });
  rug.position.set(0, 0, (RUG.near + RUG.far) / 2);
  g.add(rug);

  // ---- the back wall's furniture row: a LOW band — bookcase | position | bookcase -----------------
  // Round 3: the cases came down from 1.45 m to 1.02 m and moved outboard, so the wall beside
  // Pepe's shoulders and either side of his head is bare plaster, the way the film always keeps one
  // big empty area. Half as many books, twice the spine, black and pale alternating; and the lining
  // board hardly takes tone, so the spines read as silhouettes instead of strokes lost in hatch.
  // Round 6: what stands between them is no longer a chest. This room is the town's old manual
  // telephone exchange and that is the operator's position, cut down to the chest's own volume —
  // 1.04 x 0.82 x 0.38, same place, same footprint, same top at 0.82. Not one thing standing on it
  // moved: the doily and the lamp at −0.44, the two flat books at −0.20, the candlestick at 0.20,
  // the vase at 0.45. That is the point of the move and not a saving: he uses a dead switchboard
  // as a sideboard, and `lamps.table` is published from the same numbers it always was.
  const chestW = 1.04, caseW = 0.34, caseH = 1.02;
  const CASE_BOARDS = [0.15, 0.57];
  const chest = O.operatorPosition({ w: chestW, h: 0.82, d: 0.38 });
  chest.position.set(0, 0, FLUSH + 0.19);
  g.add(chest);
  {
    const top = 0.82;
    // the lamp and the vase sit at the ENDS of the position, clear of Pepe's head
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
      globeObj = gl;
    } else {
      // the cat, asleep on top of the bookcase, facing the room. Round 9: it is a lamp, and the
      // switch is at the foot of this file under THE CAT. Nothing about where it stands changed.
      const cat = O.cat();
      cat.position.set(0.0, caseH, 0.0);
      cat.rotation.y = -0.2;
      cat.name = 'cat';
      bc.add(cat);
      catObj = cat;
    }
  }

  // ---- the window (stage left): curtains inside the architrave, the test table under it, the palm ---
  // narrower panels than round 2, and half the vertical hatch in the cloth: the curtains were a
  // wall of rain-strokes beside a window that is already all shutter-louvres
  g.add(O.curtainSet({ x0: win.x0 - 0.03, x1: win.x1 + 0.03, rodY: win.y1 + 0.05, panelW: 0.19, dropTo: win.y0 + 0.02, z: WALL + 0.06 }));
  {
    const cart = O.barCart({ w: 0.96, d: 0.42, h: 0.8 });
    cart.position.set((win.x0 + win.x1) / 2, 0, WALL + 0.48);
    cart.userData.noShadow = true; // its shadow would black out the wall behind it and swallow the bottles
    g.add(cart);
    const top = cart.userData.top;
    // the radio on the top board, right; four big bottles on the left. Round 8: it works, and the
    // whole of that is at the foot of this file, under THE RADIO.
    const r = O.radio({ w: 0.42, h: 0.26, d: 0.18 });
    r.position.set(0.25, top, 0.0);
    r.name = 'radio';
    cart.add(r);
    radioObj = r;
    cart.add(
      O.row({
        x0: -0.48,
        x1: 0.02,
        y: top,
        z: -0.02,
        rng,
        gap: 0.01,
        // one filled bottle in four, at the left where the row starts; the rest paper with a
        // black capsule, four different heights, four different shoulders.
        // Round 6: the cart is the test table now, so two of the four go. GIN is the headset,
        // standing on its earpieces with its cord running off the front edge of the board; RHUM is
        // a square battery jar. VIN (the solid one, which carries the row's black) and MARC stay,
        // because he does drink. Same four slots, same widths, same arithmetic.
        items: [
          { kind: 'tall', name: 'VIN', dark: true, scale: 1.2, seed: 201, bodyH: 0.19, neckH: 0.1 },
          { kind: 'headset' },
          { kind: 'corked', name: 'MARC', dark: false, scale: 1.2, seed: 203, bodyH: 0.15, neckH: 0.06 },
          { kind: 'square', name: 'PILE', dark: false, scale: 1.1, seed: 204, bodyH: 0.13, neckH: 0.035 },
        ],
      }),
    );
    // VIN, for egg-wine.js: the one bottle in the room that has a level in it
    cart.traverse((o) => {
      if (!wineObj && o.userData?.label?.recipe?.lines?.[0] === 'VIN') wineObj = o;
    });
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

  // ---- the door (stage right): the doormat, and the PTT's tall spares press beside it -------------
  {
    const cx = (door.x0 + door.x1) / 2;
    const ty = ((door.top ?? 2.12) + 0.05 + door.y1) / 2;
    // The transom is left as glass. A VOYANTE board hung here until the user took it off: the room
    // already says what it is on the wall board, and the door's own fanlight carries his name from
    // the street. Two signs over one door was one too many.
    // A doormat in front of the door. Round 4: the floor is raked about 6°, so the mat arrives as
    // a strip a dozen pixels deep whatever is drawn on it. Measured on the wide shot with the old
    // 0.58 x 0.34 mat: 91 px across by 10.8 px deep, and a 512 x 300 sheet on it — 27 texels of
    // drawing per screen pixel, which is nothing a pen can draw. It is now a real doormat's size
    // (92 x 56 cm) on a sheet cut to the shape it projects to: 149 x 17.9 px on the wide and 198 x
    // 21.7 on home, and 6.4 texels per pixel measured on the pass's own minification channel —
    // under the 9 at which the pen gives up. Everything drawn on it is drawn.
    const mat = O.doorMat({ w: 0.92, d: 0.56 });
    mat.position.set(cx, 0, WALL + 0.06 + 0.26);
    g.add(mat);

    // Round 3: the cabinet was a full-height wall of 24 bottles at 42-54% ink — the heaviest thing
    // in the frame. It is now four boards instead of six (stopping 0.7 m short of the rail, so the
    // plaster above it is bare), three bottles a shelf instead of four, each a size larger, and its
    // back is open so the shelves are not a black box behind the glass.
    // Round 4: the boards are evenly spaced (they were 0.12 / 0.66 / 1.2 under a top at 1.49, so
    // the top bay had 0.28 m of headroom and the bottles standing in it — 0.46 m of bottle — went
    // straight through the cabinet's own top board). Every bay now clears 0.44 m and nothing in
    // the cabinet is taller than 0.43.
    const CAB = [0.11, 0.575, 1.04];
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
      // named, because the insects gather round it and take their six landing places off its own
      // bounding box rather than off a written-down coordinate (egg-insects.js)
      j.name = 'miel-jar';
      unit.add(j);
    }
    // Three a shelf, no two the same silhouette or the same height, and exactly ONE of them
    // filled solid — the film's own arithmetic on the two shelves and the sideboard of
    // fd-anim-kitchen-table-cards-hires. Round 3 had two thirds of them black and at 13 px a
    // bottle that read as a picket of blots; the rest of them are paper now, each with a solid
    // capsule over its neck for its black area, and the one filled bottle in the row carries the
    // big label.
    // ROUND 6: NOT ONE BOTTLE IS CUT — they are re-lettered. Sixteen named liquor bottles said
    // "provincial café" and said nothing about him, but the shelves need those silhouettes and
    // bottles are the film's own furniture. So the cabinet is the PTT's spares press and its
    // contents are the exchange's: a battery jar, jack springs, battery acid, cord tips, fuses.
    // Same carcase, same three bays, same arithmetic, same silhouette at 13 px, completely
    // different room. MARC and FINE stay, because he keeps his drink in the stores cupboard.
    const bays = [
      [
        { kind: 'tall', name: 'PILE', dark: false, bodyH: 0.19, neckH: 0.1 },
        { kind: 'square', name: 'MARC', dark: true, bodyH: 0.15 },
        { kind: 'flask', lines: ['RESSORTS'], dark: false, neck: 0.075 },
      ],
      [],
      [
        // short-wide, block, tall-round: the top bay's three read apart at a glance, which the
        // two tall bottles it had before did not
        { kind: 'squat', name: 'FICHES', dark: false, bodyH: 0.14, neckH: 0.06 },
        { kind: 'tin', name: 'FINE', h: 0.13 },
        { kind: 'carafe', name: 'FUSIBLES', dark: false, bodyH: 0.12, neckH: 0.09 },
      ],
    ];
    CAB.forEach((y, i) => {
      // the second bay up carries a single big demijohn and nothing else: the film gives every
      // packed run of objects one place where the eye is allowed to stop. It is glass now, with a
      // black capsule and an oval label — a shape to rest on rather than the frame's biggest blot.
      if (i === 1) {
        // the demijohn is a carboy of battery acid now — same capsule, same oval label
        const dj = O.shelfItem({ kind: 'carafe', name: 'ACIDE', dark: false, bodyH: 0.14, neckH: 0.075, scale: 1.4, seed: 391, shape: 'oval' }, rng);
        dj.position.set(x0 + 0.16, y, z0 + 0.14);
        unit.add(dj);
        // one small thing at the far end so the bay is a resting place and not a hole: a tumbler,
        // a third of the demijohn's height and nothing like its shape
        const tu = O.shelfItem({ kind: 'tumbler', scale: 1.25, seed: 392 }, rng);
        tu.position.set(x1 - 0.09, y, z0 + 0.15);
        unit.add(tu);
        return;
      }
      unit.add(O.row({ x0, x1, y, z: z0 + 0.13, rng, gap: 0.008, items: bays[i].map((s, k) => ({ ...s, scale: 1.3, seed: 300 + i * 10 + k })) }));
    });
  }

  // ---- the centre wall: a sign under the rail, pictures around the clock, a pinboard by the door ------
  {
    // The shop's own board, in its own words. Round 4 cut this to TAROT / BIENVENUE because the
    // old copy measured out at a 5 px cap and arrived as grey scribble — but the user prefers the
    // longer lines, and the ink pass has since stopped drawing a minified mark as a grey: a mark is
    // full ink or bare paper now. So the copy is back, on the bigger board round 4 built for it,
    // which gives the first line a 43 px cap where it used to have 25.
    // `sizes` are in the sheet's own px — texW 1536 on a 4:1 board makes the sheet 1536 x 384.
    const sign = O.signBoard({
      w: 1.32,
      h: 0.33,
      lines: ['TAROT — READINGS — 3 CARDS', 'BY APPOINTMENT · WALK-INS TOLERATED'],
      sizes: [64, 40],
      border: 'double',
      texW: 1536,
    });
    // The board hangs from its hook line, not from its middle: a pivot at the top edge, so a piece
    // that wants to make it shiver on its cord (help.js, when the pointer is over it) tips it the
    // way a hung board tips — the hooks stay put and the bottom edge swings. The pivot is also what
    // the help piece hangs its own tag under, and the mesh is what it raycasts against.
    signPivot = new THREE.Group();
    signPivot.name = 'sign-board';
    signPivot.position.set(0, railY - 0.005, WALL + 0.045);
    sign.position.set(0, -0.165, 0);
    signPivot.add(sign);
    g.add(signPivot);
    signMesh = sign;
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
    // Round 6, the two plates. LEFT, where the generic portrait hung: a woman seated side-on at
    // this board, in a headband, photographed. He did not hang it and he has not taken it down.
    // RIGHT, where the palmistry hand hung: a framed circuit diagram — eight heavy verticals,
    // eight heavy horizontals, a dot at every crossing. It is a jack field on paper, it rhymes
    // with the position under it, and it reads at 78 px, which the hand never did. The persona
    // bans mysticism in his mouth; the set does not carry it either.
    const rowA = [
      [-0.46, 0.4, 0.46, 'operator', true],
      [0.46, 0.4, 0.46, 'diagram', true],
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
    g.userData.setClockTime = clock.userData.setTime;
    g.userData.wallClock = clock; // what a pointer is raycast against; see THE VORTEX below
  }

  // ---- the stage-left wall (no window there): one round picture and a small shelf of jars ------------
  {
    const x = -W / 2 + 0.02;
    const rot = Math.PI / 2;
    // the zodiac disc that hung here is a barometer: same frame, same r, same place. An
    // instrument that claims to tell you what is coming and is wrong about twice a month, on the
    // wall of a room where a man is paid to do the same thing.
    const rf = O.roundFrame({ r: 0.17, kind: 'barometer', seed: 7 });
    rf.name = 'barometer'; // egg-switchboard.js moves it downstage: the board hangs where it hung
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

  // ---- in front of the side walls: nothing, now -------------------------------------------------------
  // A floor lamp stood at the left and a hat stand with a black overcoat at the right, each a hand's
  // width in from its wall, and three rounds went into where they should stand. The user took both
  // out: "i'd like you to remove the lamp on the left side, and also the coat hanger on the right, i
  // dont feel they fit". They were the two tallest objects in the room and the only two standing
  // free of a wall, and both were largely black — between them they held the near corners of every
  // frontal shot. The corners are bare boards and wainscot now.
  //
  // If either is ever wanted back, `floorLamp` and `hatStand` are still in props-objects.js.

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

  // ---- the wall clock keeps the visitor's own time ----------------------------------------------
  // The user, round 7: "i'm also wondering if the clock over pepe could always display the actual
  // time of the user?" It used to be stopped at five to midnight. It now reads `new Date()` — the
  // browser's clock, so the visitor's own wall time, whatever zone they are in — and the hands are
  // moved only when the MINUTE turns over. That is one step a minute, on the stepped clock like
  // everything else in the room, and it is also exactly what the real clock on the visitor's wall
  // is doing while they watch. There is no seconds hand: at 60 px of dial in the wide shot a third
  // hand ticking every second is the only fast thing in a room built out of holds, and it reads as
  // a fault in the drawing rather than as time passing. The pendulum below carries the seconds.
  //   ?now=HH:MM pins the dial, so a screenshot of the room is reproducible.
  const pinned = new URLSearchParams(location.search).get('now');
  const pinnedAt = /^\d{1,2}:\d{2}$/.test(pinned ?? '') ? pinned.split(':').map(Number) : null;
  let shownMinute = -1;
  function tellTheTime() {
    const set = g.userData.setClockTime;
    if (!set) return;
    const d = new Date();
    if (pinnedAt) d.setHours(pinnedAt[0], pinnedAt[1], 0, 0);
    const minuteOfDay = d.getHours() * 60 + d.getMinutes();
    if (minuteOfDay === shownMinute) return; // the hands hold until the minute turns
    shownMinute = minuteOfDay;
    set(d);
  }
  tellTheTime();

  // ---- THE SWITCHES. What in this room answers a pointer, and which one answers it. -------------
  // Round 8 gave the visitor the radio. Round 9 gives them the cat, which turns out to be a lamp.
  // Both are worked the same way — a pointer on the object's own drawing, or inside a 44 px box
  // round it so a thumb has something to hit — so the pointer is handled ONCE, here, and not twice.
  //
  // WHY IT IS SHARED AND NOT COPIED. Two controls with their own listeners are two controls that
  // can both answer the same tap: the margins are grown boxes and boxes can overlap, and on a
  // phone they are grown a good deal. The rule is the room's own: whichever object the ray strikes
  // is the one the visitor pointed AT, and if the ray strikes neither (a thumb inside a margin,
  // which is the only way both can be true at once) the object NEARER THE CAMERA takes it — the
  // thing in front is the thing you meant to touch.
  //
  // AND IT COSTS ONE HIT TEST A FRAME. A pointermove fires far faster than the film draws, so a
  // move only parks the event; the test itself runs from update(), on the same 12 fps step the
  // knob turns and the boil re-strikes. A pointerdown is resolved on the spot — a click cannot
  // wait 83 ms for an answer — and that is one raycast per click, which is nothing.
  const SWITCHES = (() => {
    const glass = ctx.renderer?.domElement ?? null;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const at = new THREE.Vector3();
    const list = [];
    let hovered = null, cursorMine = false, pending = null;

    function pick(ev) {
      if (!glass || !list.length) return null;
      const r = glass.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const px = ev.clientX - r.left, py = ev.clientY - r.top;
      // the drawing first: a pointer actually on one of them, wherever it is on screen
      ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
      ray.setFromCamera(ndc, ctx.camera);
      let best = null, bestD = Infinity;
      for (const c of list) {
        if (c.enabled && !c.enabled()) continue; // a switch that is busy is not a switch just now
        const o = c.object();
        if (!o) continue;
        // a switch with a hit test of its own (the globe: a sphere, not a box) is asked directly
        if (c.hit) {
          if (!c.hit(px, py)) continue;
          const d = o.getWorldPosition(at).distanceTo(ctx.camera.position);
          if (d < bestD) {
            best = c;
            bestD = d;
          }
          continue;
        }
        const hit = ray.intersectObject(o, true)[0];
        if (hit && hit.distance < bestD) {
          best = c;
          bestD = hit.distance;
        }
      }
      if (best) return best;
      // then the margins, which are what make either of them reachable on a phone
      for (const c of list) {
        if (c.enabled && !c.enabled()) continue;
        if (c.hit) continue; // its own test already said no
        const b = c.tapBox();
        if (!b || px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) continue;
        const o = c.object();
        if (!o) continue;
        const d = o.getWorldPosition(at).distanceTo(ctx.camera.position);
        if (d < bestD) {
          best = c;
          bestD = d;
        }
      }
      return best;
    }

    function setHover(c) {
      if (hovered === c) return;
      hovered?.onHover?.(false);
      hovered = c;
      hovered?.onHover?.(true);
      if (!glass) return;
      if (c) {
        glass.style.cursor = c.cursor ?? 'pointer';
        cursorMine = true;
      } else if (cursorMine) {
        // only ever put back what this piece put there: reveal-fan.js and help.js share the cursor
        glass.style.cursor = '';
        cursorMine = false;
      }
    }

    glass?.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'touch') return;
      pending = ev; // parked; the hit test runs once a frame, from update()
    });
    glass?.addEventListener('pointerleave', (ev) => {
      if (ev.pointerType === 'touch') return;
      pending = null;
      setHover(null);
    });
    // A DRAG. A switch with `down/move/up` (the globe) owns the pointer from its pointerdown to the
    // pointerup, wherever that lands, and may ask for a `grab` cursor while it holds it.
    let held = null;
    const local = (ev) => {
      const r = glass?.getBoundingClientRect();
      return r ? [ev.clientX - r.left, ev.clientY - r.top] : [0, 0];
    };
    glass?.addEventListener('pointerdown', (ev) => {
      const c = pick(ev);
      if (!c) return;
      // flow.js reads any pointerdown on the window as the visitor skipping ahead through Pepe's
      // line, which a visitor reaching for a switch did not mean. So the event stops here — and
      // sound's own "first gesture" unlock, which lives on that same window, is called by hand.
      ctx.pieces.sound?.start?.();
      ev.stopPropagation();
      c.onDown?.(ev);
      if (c.down) {
        held = c;
        const [px, py] = local(ev);
        c.down(px, py, ev);
        if (c.grab && glass) {
          glass.style.cursor = c.grab;
          cursorMine = true;
        }
      }
    });
    window.addEventListener('pointermove', (ev) => {
      if (!held?.move) return;
      const [px, py] = local(ev);
      held.move(px, py, ev);
    });
    const release = (ev) => {
      if (!held) return;
      const c = held;
      held = null;
      const [px, py] = local(ev);
      c.up?.(px, py, ev);
      if (glass && cursorMine) glass.style.cursor = ev.pointerType === 'touch' ? '' : (c.cursor ?? 'pointer');
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    return {
      add(c) {
        list.push(c);
        return c;
      },
      // for the tools: which switch the pointer is on, by name
      get hovered() {
        return hovered?.name ?? null;
      },
      update() {
        if (!pending) return;
        const ev = pending;
        pending = null;
        setHover(pick(ev));
      },
    };
  })();

  // ---- THE RADIO. The one thing in this room the visitor is allowed to work. ---------------------
  // The user, round 8: "would be cool if we could turn the tune on and off and switch through them
  // via the radio receiver." And his own persona, about this very prop: "The radio on the cart. It
  // works and you do not switch it on." So the visitor does, and the set has to be honest about it.
  //
  // THE DEFAULT IS OFF, and that is a decision, not an oversight. sound.js starts tune `a` on the
  // first gesture; this piece switches it off before any gesture can happen, unless the URL asked
  // for a tune by name. Three reasons:
  //   1. The dial. If the music is playing while the needle is parked against its left-hand stop,
  //      the drawing is lying about the room. Either the needle would have to start on a station —
  //      and then the visitor never gets the moment of switching the set on, which is the thing the
  //      user asked for — or the radio is not the thing making the sound, and then it is a switch
  //      with nothing behind it.
  //   2. His line. The set says it is off. He says it is off. It is off.
  //   3. The first thing a visitor hears should be the door, the escapement and the room, which is
  //      what the sound piece spent four rounds building. Music over that is a menu screen.
  // CONSISTENT WITH ?tune=: `?tune=a|b|c` is an explicit switch-on — the tune plays and the needle
  // starts on that station, because a URL asking for a tune has done what the click does. `?tune=0`
  // and a bare URL are both OFF, with the needle at the stop. The `t` key still walks the three
  // tunes and silence, and the needle FOLLOWS it (see update): whoever changed the station, the
  // dial shows the station.
  const RADIO = (() => {
    // Stop 0 is off; stop 1 is THE RECORD (sound.js RECORD, its own name 'r'). Round 9: the three
    // written tunes came off the dial — the user: "rather than the generated melodies, i'd like it
    // to play a specific song" — and stay reachable by ear on the `t` key and `?tune=a|b|c`.
    const IDS = [null, 'r'];
    // The needle is thrown at its mark and comes back onto it: three drawings on twos, half a
    // second, the same 12 fps grid the pendulum and the boil are on. A needle that slid would be
    // the only continuous movement in the film.
    const THROW = [0.46, 1.1, 1.0];
    const NUDGE = 0.17; // how far the tuning knob turns under a pointer, in radians
    const MIN_TAP = 44; // px: what a thumb needs, whatever the radio measures on the glass
    // ?tune=a|b|c starts ON that station; ?tune=0/off/none/no and a bare URL are both the left
    // stop. A `?tune=` that names nothing keeps sound.js's own rule — it falls back to the default
    // tune rather than to silence, so a typo is audible instead of mysterious — and the needle goes
    // to the station that is actually playing.
    const OFFWORDS = ['0', 'off', 'none', 'no'];
    const param = (ctx.params ?? new URLSearchParams(location.search)).get('tune');
    const asked = (param ?? '').toLowerCase();
    let station = param == null || OFFWORDS.includes(asked) ? 0 : Math.max(1, IDS.indexOf(asked));
    let from = station, to = station, frame0 = -1e9;
    let hover = false, told = false;

    const sound = () => ctx.pieces.sound; // built after this piece: never cached
    const point = () => radioObj?.userData?.setStation?.(station);
    point();

    // the set's box on the glass, in px — the front face's own eight corners, projected
    function hitBox() {
      const face = radioObj?.userData?.face;
      if (!face) return null;
      face.updateMatrixWorld(true);
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      const xs = [], ys = [];
      const v = new THREE.Vector3();
      const { width: bw, height: bh, depth: bd } = radioObj.userData;
      for (const dx of [-bw / 2, bw / 2]) for (const dy of [-bh / 2, bh / 2]) for (const dz of [-bd / 2, bd / 2]) {
        v.set(dx, dy, dz);
        face.localToWorld(v).project(ctx.camera);
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    // WHAT A THUMB ACTUALLY HAS TO HIT: the set's own box, grown about its centre to at least 44 px
    // each way, the extra falling on bare cloth on the cart's top board. Nothing else in the room is
    // clickable within a foot of there, so the margin costs nothing and a miss costs the feature.
    //
    // MEASURED (tools/_props-r8-radio.mjs), and the news is not what anyone expected. The set is not
    // too SMALL on a phone. It is not in the picture at all:
    //     1600 x 900   home 95.9 x 59.3 px at x 483    wide 77.2 x 47.8 px at x 545
    //     390 x 760    home 92.6 x 57.3 px at x -111   wide 92.6 x 57.3 px at x -111
    //     360 x 800    home 85.5 x 52.9 px at x -102   wide 85.5 x 52.9 px at x -102
    // A portrait window crops the frame to the middle of the room — the window, the curtains and the
    // whole cart are outside it, and the radio's right-hand edge stops 18 px short of the left of
    // the glass. The margin below therefore never fires: at 93 px the set is twice the size a thumb
    // needs. What a phone lacks is not reach, it is the frame. That is the camera's call or the set
    // dressing's, not this control's, and no hidden hotspot at the edge of the picture will do —
    // an affordance nobody can see is not one. Until then the radio is a desktop control, and `t`
    // (sound.js) is the other way through the three tunes.
    function tapBox() {
      const b = hitBox();
      if (!b) return null;
      const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
      return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
    }

    // one stop on, and round again at the end: off → the record → off
    function turn(next = (station + 1) % IDS.length) {
      from = station;
      to = next;
      station = next;
      frame0 = ctx.clock.frame;
      sound()?.setTune?.(IDS[next]);
      // THE CRACKLE. Between two stations there is nothing on the air, and that is the sound of
      // the knob having done something. It is fired on the click and not on the arrival: the hand
      // is on the knob now, the needle catches up over the next half second.
      sound()?.play?.('static');
      ctx.emit?.('props:radio', { station: next, tune: IDS[next] });
    }
    // the pointer itself belongs to SWITCHES above, which is what keeps the set and the cat from
    // both answering one tap; all this control has to say is where it is and what to do about it
    SWITCHES.add({
      name: 'radio',
      object: () => radioObj,
      tapBox,
      onHover: (on) => {
        hover = on;
      },
      onDown: () => turn(),
    });

    return {
      get station() {
        return station;
      },
      get tune() {
        return IDS[station];
      },
      hitBox,
      tapBox,
      turn,
      // for the tools and for setState: put the needle on a stop with no throw and no crackle
      set(next) {
        station = from = to = Math.max(0, Math.min(IDS.length - 1, next | 0));
        frame0 = -1e9;
        point();
        sound()?.setTune?.(IDS[station]);
      },
      update(ctx2) {
        // The default, said once, as late as possible: this piece is built before sound.js, so
        // there is nothing to tell until the first frame. Nothing has been heard yet either — the
        // tune does not start until the visitor's first gesture — so switching it off here is
        // switching it off before it was ever on.
        if (!told && ctx.pieces.sound) {
          told = true;
          if (station === 0) ctx.pieces.sound.setTune?.(null);
        }
        // Whoever changed the station — the `t` key, another piece — the dial shows the station.
        // Only while the sound piece is actually RUNNING: before the visitor's first gesture there
        // is nothing playing to follow, and under ?shot=1 the piece is a stub whose `tune` is a
        // frozen snapshot of the default, which would drag the needle off any stop a still asked
        // for.
        const live = ctx.pieces.sound?.running;
        const id = live ? ctx.pieces.sound.tune?.id ?? null : IDS[station];
        if (told && IDS[station] !== id) {
          const i = IDS.indexOf(id);
          if (i >= 0) {
            from = station;
            to = i;
            station = i;
            frame0 = ctx2.clock.frame;
          }
        }
        const k = Math.floor((ctx2.clock.frame - frame0) / 2);
        const u = k >= 0 && k < THROW.length ? from + (to - from) * THROW[k] : to;
        radioObj?.userData?.setStation?.(u);
        // and the knob turns a little further under a pointer, which is the whole of the
        // affordance: no glow, no outline, a knob that can be seen to move
        const knob = radioObj?.userData?.knob;
        if (knob && hover) knob.rotation.z -= NUDGE;
      },
    };
  })();

  // ---- THE GLOBE. The one thing in this room that asks HIM a question. --------------------------
  // The user: "Spin it with a drag; where it stops, he tells a story about an affair he had during
  // a vacation in that specific country." All of it is in src/pieces/egg-globe.js — the drawn map,
  // the table of countries, the throw and the wait. Here it is only given the object off the left
  // bookcase and a place in the switchboard.
  const GLOBE = eggGlobe(ctx, { object: globeObj, switches: SWITCHES });

  // ---- THE CAT, WHICH IS A LAMP. The room's second switch. ---------------------------------------
  // The user, having been given the radio: "now lets make some other objects interactive - for
  // example the black cat on the right behind tarotpepe, it could be a lamp - when the user clicks
  // it, it could turn white."
  //
  // So it is a cat-shaped lamp — the kind a provincial household buys once, in 1954, and never
  // replaces — and switched OFF it is exactly the cat that has sat on that bookcase since round 3:
  // a solid ink mass with its eyes, whiskers, nose and the rule along its tail left in paper.
  // Switched ON it is bare paper inside the room's own contour and every one of those marks is
  // pen. Nothing is added and nothing moves. In a world with no grey that inversion is the whole
  // of what "lit" can mean, and it is the reason the object still reads as the same cat: it is the
  // same drawing with the ink on the other side of it.
  //
  // IT IS A CUT, NOT A FADE. The click is answered on the next 12 fps drawing and the change lands
  // whole — a light does not ramp, and a ramp here would be the only continuous thing in the film.
  // A short dry click from the mechanism goes with it ('switch', sound-voices.js), fired on the
  // pointer and not on the drawing, because the visitor's thumb is on the switch NOW.
  //
  // NOTHING ANNOUNCES IT. No label, no halo, no outline, no glow before it is touched. The cursor
  // becomes a pointer over it and that is the entire affordance, exactly as it is for the radio.
  // The room does not explain itself; it rewards a visitor who tries something.
  const CAT = (() => {
    const MIN_TAP = 44; // px: what a thumb needs, whatever the cat measures on the glass
    let lit = false, want = false;

    // the cat's box on the glass, in px: its own eight corners (taken off the geometry in
    // props-objects.js, so they cannot drift from the drawing), projected
    function hitBox() {
      const b = catObj?.userData?.box;
      if (!b) return null;
      catObj.updateMatrixWorld(true);
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      const xs = [], ys = [];
      const v = new THREE.Vector3();
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        v.set(x, y, z);
        catObj.localToWorld(v).project(ctx.camera);
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    // grown about its centre to at least a thumb's 44 px. The extra falls on the top board of the
    // bookcase and on bare plaster, where there is nothing else to hit — measured in
    // tools/_props-r9-cat.mjs, which also reports whether the cat is in the picture at all on a
    // phone (the radio is not, and that is a framing problem, not a control's).
    function tapBox() {
      const b = hitBox();
      if (!b) return null;
      const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
      return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
    }
    function paint() {
      catObj?.userData?.setLit?.(lit);
    }
    // the switch thrown: the sound and the news go now, the drawing changes on the next step
    function toggle(next = !want) {
      want = !!next;
      ctx.pieces.sound?.play?.('switch');
      ctx.emit?.('props:cat', { lit: want });
    }
    SWITCHES.add({
      name: 'cat',
      object: () => catObj,
      tapBox,
      onDown: () => toggle(),
    });

    return {
      get lit() {
        return lit;
      },
      hitBox,
      tapBox,
      toggle,
      // for the tools and for setState: throw it with no cue and no waiting for the clock
      set(on) {
        lit = want = !!on;
        paint();
      },
      update() {
        if (want === lit) return;
        lit = want;
        paint();
      },
    };
  })();

  // ---- THE SWITCHBOARD ON THE LEFT-HAND WALL. The room's third switch. -------------------------
  // The user: "the switchboard is too hidden behind him. what if we placed the switchboard on the
  // lefthand wall?" It is all in src/pieces/egg-switchboard.js — the board, its six jacks, its two
  // cords, the pair that rings — because it is a piece of business and not set dressing, and
  // because everything it needs from this file is the group to stand in and the arbiter above.
  const SWITCHBOARD = buildSwitchboard(ctx, {
    group: g,
    switches: SWITCHES,
    chest, // its jack strip came off the back of the position and is on the wall now
    barometer: g.getObjectByName('barometer'),
  });
  // While he is answering the phone the cords stay in: dialogue says how long each line of his is,
  // and the board holds them until the last one has been read.
  ctx.on?.('dialogue:say', ({ seconds }) => SWITCHBOARD.holdFor(seconds ?? 1.5));

  // ---- THE FUSE BOX'S LEVER, and the night the room drops to without it. ------------------
  // The room's fourth switch, all in src/pieces/egg-fuse.js; it registers with the arbiter above.
  const FUSE = eggFuse(ctx, { group: g, switches: SWITCHES });

  // ---- THE CLOCK, WHICH IS A VORTEX. The room's fifth switch (src/pieces/egg-vortex.js). ---
  const VORTEX = buildVortex(ctx, {
    clock: g.userData.wallClock,
    switches: SWITCHES,
    dial: 0.185,
    setTime: g.userData.setClockTime,
  });

  // ---- THE WINE on the cart. The room's sixth switch (src/pieces/egg-wine.js). -------------
  const WINE = buildWine(ctx, wineObj, { switches: SWITCHES });

  // ---- THE INSECTS on the back wall, and the honey jar they gather at (src/pieces/egg-insects.js). --
  const INSECTS = buildInsects(ctx, { group: g, switches: SWITCHES, jar: g.getObjectByName('miel-jar'), wallZ: WALL });

  return {
    group: g,
    // the arbiter itself, for the tools (`hovered`) and for any piece that wants a switch of its own
    switches: SWITCHES,
    // THE SWITCHBOARD, on the stage-left wall between the press door and the window. `plugged` is
    // which jacks have cords in them, `plug(i)` / `pull(i)` work one as a tap does, `set([i, j])`
    // puts them there for a still with no cue and no bell, and hitBox/tapBox take a jack's index
    // (or none, for the whole board).
    switchboard: SWITCHBOARD,
    // THE MAINS LEVER on the terminal box, stage right. `out` is true when the lever is down and
    // the room is on the one lamp that is not on the mains, `pull()` throws it as a click does (a
    // cut on the next 12 fps drawing, with the clack on the click), `set(out, lit)` throws it with
    // no cue for a still, and hitBox/tapBox are its box on the glass and the box a thumb is given.
    fuse: FUSE,
    // THE CLOCK: `start()` winds the room into it for ten seconds, `t`/`active` say where it is,
    // `?vortex=<t>` and the `vortex-mid` state hold a frame of it for the tools.
    vortex: VORTEX,
    // THE WINE BOTTLE on the cart. `fingers` is what is left of five, `pour()` takes one as a
    // click does, `drunk` is whether the room is currently under it, and hitBox/tapBox are the
    // bottle's box on the glass and the box a thumb is given.
    wine: WINE,
    // THE INSECTS. `state` is where each one is (wall, air, jar), `fly(i)` sends one off as a click
    // does, and hitBox(i)/tapBox(i) are a sheet's box on the glass and the box a thumb is given.
    insects: INSECTS,
    // THE RADIO on the cart, round 8. `station` is 0..1 (0 is off), `tune` the sound piece's own
    // name for it, `turn()` advances one stop as a click does, `set(i)` jumps there without the
    // throw or the crackle, and hitBox/tapBox are the set's box on the glass and the box a thumb
    // is actually given (which is bigger, on a phone).
    radio: RADIO,
    // THE CAT'S LAMP, round 9. `lit` is what is DRAWN (the cut lands on the next 12 fps step, so a
    // click and the drawing are one frame apart on purpose), `toggle()` throws the switch as a
    // click does — cue, event and all — `set(on)` puts it there for a still with neither, and
    // hitBox/tapBox are the cat's box on the glass and the box a thumb is actually given.
    cat: CAT,
    // THE GLOBE on the left bookcase. `spin(v, tilt)` throws it (v is -1..1, the sign the
    // direction; 0 is a tap's own throw), `country` is the last one it handed over, `spinning` says
    // whether it is still turning, and hitBox/tapBox are the sphere's box on the glass and the box
    // a thumb is actually given.
    globe: GLOBE,
    // the shop's board over Pepe's head. `mesh` is what a pointer is raycast against, `pivot` is
    // its hook line (rotate that and the board swings on its cord), and w/h are its size in metres.
    // help.js hangs its own tag under the pivot and tips it when the pointer is over the board.
    sign: { mesh: signMesh, pivot: signPivot, w: 1.32, h: 0.33 },
    // THE RUG, FOR THE CAMERA. `plainFrom` is the largest z at which the ground is still bare —
    // the first printed mark on the visitor's side is just past it (measured off the sheet itself
    // with tools/_props-r5-edge.mjs: 1.219, quoted here 3 mm inside that for the pen's own width).
    // A shot may cross the floor anywhere up to this line and find nothing drawn on it; `near` is
    // where the rug itself ends and `fringe` how far its comb hangs past that.
    rug: {
      w: RUG.w,
      near: RUG.near,
      far: RUG.far,
      border: rug.userData.rug.border,
      fringe: rug.userData.rug.fringe,
      plainFrom: RUG.near - rug.userData.rug.border - 0.006,
    },
    // Practicals, for the lighting piece: where the drawn lamps are. There are two now. The floor
    // lamp was the third and the user took it out of the room, so its light goes with it — a source
    // hanging in the air where an object used to be is exactly the kind of lighting this film does
    // not do. lighting.js reads `floor` as optional and douses that lamp when it is absent.
    lamps: {
      table: new THREE.Vector3(-0.36, 0.82 + 0.2, chest.position.z + 0.02),
      pendant: new THREE.Vector3(0, 2.5, 0),
      // The cat's lamp, round 9, and it is the only practical in the room with a switch on it. The
      // bulb is inside the cat, on the right-hand bookcase top (0.85, 1.02 + the cat's own body) —
      // put a hand's width behind its centre, in the 10 cm between its back and the plaster, so
      // what the light has to work with is the wall and not the room. lighting.js douses it with
      // the rest and follows `cat.lit`.
      cat: new THREE.Vector3(0.85, caseH + 0.14, FLUSH + 0.14 - 0.08),
    },
    // `radio-off` / `radio-a` / `radio-b` / `radio-c` put the needle on a stop for a still, and
    // `cat-lit` is the cat's lamp switched on. Every other name is the room as it stands — which
    // for the cat means OFF, because the room as it stands is a lamp nobody has touched.
    setState(name = 'default') {
      const m = /^radio-(off|a|b|c)$/.exec(name ?? '');
      if (m) RADIO.set(m[1] === 'off' ? 0 : 'abc'.indexOf(m[1]) + 1);
      CAT.set(name === 'cat-lit');
      // `switchboard-plugged` puts both cords in the pair, silently: the board at work, for a still.
      SWITCHBOARD.set(name === 'switchboard-plugged' ? SWITCHBOARD._pair : []);
      // `fuse-out` is the lever down with the one lamp that is not on the mains still burning;
      // `fuse-dark` is the same room with that lamp out. Every other name puts the mains back.
      FUSE.set(name === 'fuse-out' || name === 'fuse-dark', name !== 'fuse-dark');
      VORTEX.setState(name);
      WINE.setState(name); // `wine-drunk`; every other name puts the bottle back
      if (name === 'globe-spinning') GLOBE.showSpinning();
      else GLOBE.reset();
      // `insects-gathered` is the six of them round the jar; every other name is the wall, which
      // is where a reload always puts them
      insectState(INSECTS, name);
    },
    update(ctx) {
      if (!ctx.clock.stepped) return;
      const p = g.userData.pendulum;
      if (p) p.rotation.z = 0.16 * Math.sin(ctx.clock.t * Math.PI);
      tellTheTime();
      SWITCHES.update();
      RADIO.update(ctx);
      CAT.update();
      SWITCHBOARD.update();
      FUSE.update(ctx);
      VORTEX.update(ctx); // last: while it runs, the hands and the bob are its own
      WINE.update(ctx);
      GLOBE.update(ctx);
      INSECTS?.update(ctx);
    },
  };
}
