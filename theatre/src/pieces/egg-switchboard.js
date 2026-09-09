// THE SWITCHBOARD ON THE LEFT-HAND WALL. The room's third switch, and the only one with a puzzle
// in it. Built by props.js and registered with its SWITCHES arbiter; nothing here owns a pointer.
//
// THE USER, HAVING WATCHED THE ROOM: "the switchboard is too hidden behind him. what if we placed
// the switchboard on the lefthand wall?" — and then, for what it should do: "tap a jack: a cord
// plugs in, the exchange's dial tone hums through the radio's speaker for a second. Plug the right
// two and a phone rings once and he answers with a line", with the standing rule that "pepe cant
// move, so he answers the phone without moving".
//
// WHICH OBJECT MOVED, AND WHY THAT ONE. The room holds two jack fields. The framed circuit diagram
// over his right shoulder is a PICTURE of one and stays a picture. The real one is the strip at the
// back of the operator's position — 0.98 x 0.12, at y 0.88, behind his shoulders, above the table's
// far rim — and that is what the user is looking at when they say hidden: in `home` it is 6 px of
// black either side of a frog, and in `pepe` his head is in front of it. So THAT is the switchboard
// and that is what has moved. props-objects.js still draws it (`operatorPosition`, which keeps its
// keyshelf, its two key ranks, its designation strip and its cord well — the position is still a
// position, and a vase of dried flowers still stands on it); this file takes the JACK FIELD off the
// back of it — `chest.userData.jackStrip.visible = false` — and hangs it on the wall the visitor can
// see, between the press door and the window, where a cord can be watched going into a hole.
//
// WHERE IT STANDS, AND WHY IT IS AS HIGH AS IT IS. The stage-left wall is seen at a grazing angle:
// at the home plate a metre of it is 72 px against 180 px for a metre of the back wall, so a small
// panel there is nothing. Two things set the rectangle:
//   · IN z, the wall is only in the picture upstage of z −0.15 (measured, tools/_egg-switchboard-
//     proof.mjs); the wall shelf's downstage end is at z −2.00. So the board runs z −1.95 .. −0.35,
//     1.60 m of wall — 137 px of the home frame — which puts 0.60 m between the columns of jacks
//     and 47 PX between them on the glass. That is more than a thumb's 44, which is the whole
//     reason there are six jacks on this board and not two hundred.
//   · IN y, THE PALM. It stands at (−2.36, −1.3) with fronds to y 1.624, and because the home lens
//     sits at y 1.62 its silhouette covers everything on that wall BELOW the horizon, from its own
//     depth all the way upstage into the corner. Measured on the frame: the left wall is bare
//     plaster above py 270 and palm below it. So the board hangs 1.52 .. 2.26 — its jacks at 1.87
//     and 2.11, well clear, and only the cord well at its foot behind a frond or two, which is what
//     a room looks like. The alternative was to move the palm across the room, which is a bigger
//     change to somebody else's composition than this egg is worth.
// The barometer moved, and the brief said it might have to: it hung at (−2.6, 1.95, −1.75), which
// is inside this rectangle. See below for where it went and why it went downstage rather than up.
//
// AND ON A PHONE IT IS NOT IN THE PICTURE AT ALL. At 390x844 the whole of this wall projects to
// x −477 and further left: the portrait plates crop the parlour to its middle two metres, exactly
// as they do the radio on the cart. That is the framing's business, not this control's, and no
// hidden hotspot at the edge of the glass would be an affordance. On a phone the room has a cat
// and a record; on a laptop it also has an exchange.
//
// WHAT IT DOES. Six jacks in two rows; two cords on their weights in the well at the foot. A tap on
// a free jack plugs the next free cord into it — one cut on the 12 fps clock, no travel, because a
// cord that slid would be the only continuous movement in the film — with the plug going home and
// then the exchange's dial tone, a continuous 440 for one second, THROUGH THE RADIO'S SPEAKER
// (sound.js `through: 'set'`, the same pair of filters the record is played through) whether or not
// the set is switched on: the panel and the radio are wired to the same building. A tap on a
// plugged jack pulls that cord out.
//
// AND ONE PAIR OF THEM IS THE PAIR. Fixed for the evening from the seed and the day, never shown,
// never hinted at: with both cords in and the two jacks the right two, a bell rings once — two
// seconds of an old exchange trembler — and he picks up without moving a muscle, because he cannot
// move: `pepeAnim.react()` and then a line from the mind on a beat of its own (`phone`, server/
// pepe.mjs), put up on the placard while the field stays open, exactly the way a story about an
// object goes up. There is no scripted line for it. With no key the beat is silent and the bell is
// the whole event, which is the right failure: a bell in an empty room is a better joke than a
// canned sentence. Afterwards the cords fall out of their own accord and the board is ready again.
//
// NOTHING ANNOUNCES ANY OF IT. No label, no glow, no tag. The cursor becomes a pointer over a jack
// and that is the entire affordance, as it is for the radio and for the cat.
import * as THREE from 'three';
import { INK, drawTexture, inkLine, inkMaterial } from '../core/strokes.js';
import { materials, box, cyl } from './props-objects.js';

const LABEL_PAPER = '#f9f6ee';

// ---- where it hangs (world metres; the room piece owns the wall) --------------------------------
export const BOARD = {
  wall: -2.6, // the stage-left wall's plane
  z: -1.15, // the middle of the board, along the wall
  w: 1.6, // how much wall it takes
  y0: 1.52,
  y1: 2.26,
  d: 0.095, // how far it stands off the plaster
  cols: [0.6, 0, -0.6], // the three columns, in the board's own x (which runs UPSTAGE)
  rows: [2.11, 1.87], // the two rows, in world y
  jack: 0.07, // the paper ring's radius
  wellY: 1.665, // where the two cords hang from their pulleys
};
// jack 0..5: row-major, upper row left-to-right as the frame reads it (downstage first)
export const JACKS = [];
for (const y of BOARD.rows) for (const x of [...BOARD.cols].reverse()) JACKS.push({ x, y });

const MIN_TAP = 44; // px: what a thumb needs, whatever the board measures on the glass
const HOVER_LIFT = 0.006; // how far a ring stands out under a pointer, in metres
const DIAL_S = 1.0; // how long the tone hums (sound-voices.js LENGTH.dialtone)
const RING_AT = 14; // frames after the pair lands before the bell — the tone finishes first
const BELL_F = 24; // the bell itself: two seconds on the 12 fps clock
const AFTER_F = 24; // ...and how long the cords stay in with nothing said after it

// ---- the two drawings on the board's face -------------------------------------------------------
// A JACK STRIP: solid ink with a paper rule top and bottom and a paper screw at each end — the same
// object the position carries at 0.12 m (props-objects.js `jackFieldTexture`), enlarged to the size
// this wall is seen at. Two of them, one a row. The jacks are NOT drawn here: they are geometry, a
// paper ring with an ink hole, because a pointer has to strike one and a cord has to end in one.
//
// WHY TWO STRIPS AND NOT ONE PLATE. The cords are solid ink and they have to be seen travelling
// from the well to a jack. Over one tall black plate a black cord is nothing at all; over two
// strips with the case's white iron between them, the whole of a cord's run reads except the last
// hand's breadth, where it is arriving at its hole and its plug carries it. It is also what a jack
// field actually looks like.
function jackStripTexture({ w = 512, h = 56, seed = 71 } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      g.fillStyle = INK;
      g.fillRect(0, 0, W, H);
      const pen = { width: 4, wobble: 0.9, rng, color: LABEL_PAPER };
      inkLine(g, 0, 4, W, 4, pen);
      inkLine(g, 0, H - 4, W, H - 4, pen);
      for (const x of [10, W - 10]) {
        inkLine(g, x - 5, H / 2, x + 5, H / 2, { ...pen, width: 3.4 });
        inkLine(g, x, H / 2 - 5, x, H / 2 + 5, { ...pen, width: 3.4 });
      }
    },
    { seed },
  );
}
// THE DESIGNATION STRIP between the rows: paper, a heavy rule top and bottom, one division a jack.
// No numerals — a figure on it measures under two pixels on this wall and the pen does not draw at
// two pixels. The divisions do the same job: it is a strip that was filled in, and it is ordered.
function designationTexture({ w = 512, h = 30, cells = 3, seed = 72 } = {}) {
  return drawTexture(
    w,
    h,
    (g, W, H, rng) => {
      g.fillStyle = LABEL_PAPER;
      g.fillRect(0, 0, W, H);
      inkLine(g, 0, 4, W, 4, { width: 5, wobble: 1, rng });
      inkLine(g, 0, H - 4, W, H - 4, { width: 5, wobble: 1, rng });
      for (let i = 1; i < cells; i++) inkLine(g, (W * i) / cells, 8, (W * i) / cells, H - 8, { width: 3.4, wobble: 0.8, rng });
    },
    { seed },
  );
}

// The cord's line, from its pulley in the well to wherever its plug is: a curve with the little
// belly a weighted cord has, struck as a tube because a polyline at this rake is two coincident
// outlines and then nothing. The sag is a fraction of the RUN and it is clamped to the well's own
// floor: a cord that bellied out under the board would read as a rope thrown over it.
function cordTube(from, to, mat, { floor = 0, weight = 0.16 } = {}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().lerp(b, 0.5);
  mid.y = Math.max(floor, mid.y - weight * a.distanceTo(b));
  mid.z += 0.012;
  const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.55), mid, mid.clone().lerp(b, 0.55), b]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.0075, 6, false), mat);
  m.castShadow = false;
  return m;
}

// ---- the board ---------------------------------------------------------------------------------
// `ctx` is the theatre; `opts` is what props.js hands over: the group to stand in, the SWITCHES
// arbiter, and the operator's position (whose jack strip this board used to be).
export function build(ctx, { group, switches, chest = null, barometer = null } = {}) {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'switchboard';
  g.position.set(BOARD.wall, 0, BOARD.z);
  g.rotation.y = Math.PI / 2; // local +z → world +x (into the room); local +x → world −z (upstage)
  group.add(g);

  // The jack field came off the back of the operator's position: it is on this wall now, and a
  // room with two of them would say the move never happened. Everything else about the position
  // stays exactly where round 6 put it.
  if (chest?.userData?.jackStrip) chest.userData.jackStrip.visible = false;
  // ...and the barometer is out from under it. It hung at z −1.75, inside the board's rectangle,
  // and the brief allowed for exactly this. Same frame, same size, same height, 2.05 m DOWNSTAGE:
  // upstage of the board there is only the 35 px of wall between it and the corner, and a round
  // frame there stands with its rim in the board's own edge. Downstage it is on bare plaster
  // beside the press door — out of the `home` frame, which crops this wall at z −0.15, and whole
  // in `wide` and in `door`, which are the two shots that ever look down this wall.
  if (barometer) barometer.position.z = 0.3;

  const iron = M.metal;
  const WELL = { y0: BOARD.y0 + 0.03, y1: 1.7 }; // the cord well's mouth
  const faceZ = BOARD.d - 0.02; // where the case's own face stands

  // the carcase: an enamelled iron case a hand's breadth off the plaster, open at the foot for the
  // well — the back plate runs the whole height, the front only down to the well's head
  const back = box(BOARD.w, BOARD.y1 - BOARD.y0, 0.03, iron);
  back.position.set(0, (BOARD.y0 + BOARD.y1) / 2, 0.015);
  g.add(back);
  const front = box(BOARD.w, BOARD.y1 - WELL.y1, faceZ, iron);
  front.position.set(0, (WELL.y1 + BOARD.y1) / 2, faceZ / 2);
  g.add(front);
  // the well itself: a paper trough under the shelf, which is the board's one bare white area and
  // the only ground a solid-ink cord can be seen hanging against
  const trough = box(BOARD.w - 0.09, WELL.y1 - WELL.y0, 0.05, M.paper);
  trough.position.set(0, (WELL.y0 + WELL.y1) / 2, 0.025);
  g.add(trough);
  for (const sx of [-1, 1]) {
    const cheek = box(0.045, WELL.y1 - WELL.y0, faceZ, iron);
    cheek.position.set(sx * (BOARD.w / 2 - 0.0225), (WELL.y0 + WELL.y1) / 2, faceZ / 2);
    g.add(cheek);
  }
  // its two black rails, proud: the top cap and, at the foot, the cord shelf's edge — the solid
  // area every prop in this room owes the round-1 critic, and the line the board throws across the
  // wall from the other side of the room
  const cap = box(BOARD.w + 0.03, 0.04, BOARD.d + 0.015, M.solid);
  cap.position.set(0, BOARD.y1 - 0.02, (BOARD.d + 0.015) / 2);
  g.add(cap);
  const lip = box(BOARD.w + 0.03, 0.03, BOARD.d + 0.055, M.solid);
  lip.position.set(0, BOARD.y0 + 0.015, (BOARD.d + 0.055) / 2);
  g.add(lip);

  // the two jack strips, one behind each row, and the designation strip between them
  for (const y of BOARD.rows) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w - 0.1, 0.17, 0.022), [M.solid, M.solid, M.solid, M.solid, STRIP_MAT(), M.solid]);
    strip.position.set(0, y, faceZ + 0.011);
    g.add(strip);
  }
  const desig = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w - 0.1, 0.055, 0.016), [iron, iron, iron, iron, DESIG_MAT(), iron]);
  desig.position.set(0, (BOARD.rows[0] + BOARD.rows[1]) / 2, faceZ + 0.008);
  g.add(desig);

  // the six jacks. A paper ring with an ink hole in it, standing proud of its strip — the ring is
  // what the pointer strikes and what a plug goes into.
  const JACK_Z = faceZ + 0.022;
  const jacks = JACKS.map(({ x, y }, i) => {
    const j = new THREE.Group();
    j.name = `jack-${i}`;
    j.position.set(x, y, JACK_Z);
    const ring = cyl(BOARD.jack, BOARD.jack, 0.018, M.paper, 16);
    ring.rotation.x = Math.PI / 2;
    j.add(ring);
    const hole = cyl(BOARD.jack * 0.46, BOARD.jack * 0.46, 0.03, M.solid, 12);
    hole.rotation.x = Math.PI / 2;
    j.add(hole);
    // the ring's own box, written down rather than measured: `setFromObject` reads world matrices
    // that have not been built yet at this point in the build, and a jack whose box is one column
    // out is a jack that answers its neighbour's tap
    j.userData.box = new THREE.Box3(new THREE.Vector3(-BOARD.jack, -BOARD.jack, -0.015), new THREE.Vector3(BOARD.jack, BOARD.jack, 0.015));
    g.add(j);
    return j;
  });

  // the cords' pulleys, at the head of the well, and the hub each turns on
  const CORD_X = [0.56, -0.56]; // out at the ends of the well, so a cord's run to a jack is a diagonal
  for (const x of CORD_X) {
    const p = cyl(0.028, 0.028, 0.012, M.paper, 14);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, BOARD.wellY, 0.055);
    g.add(p);
    const hub = cyl(0.01, 0.01, 0.02, M.solid, 8);
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(p.position);
    g.add(hub);
  }

  // ---- the two cords ---------------------------------------------------------------------------
  // A cord is its line and its plug, made fresh whenever it moves: two of them, sixteen segments
  // each, so rebuilding one is nothing and there is no pose to interpolate through.
  const cords = CORD_X.map((x, i) => {
    const c = new THREE.Group();
    c.name = `cord-${i}`;
    g.add(c);
    return { group: c, x, into: null, line: null, plug: null };
  });
  function drawCord(c) {
    if (c.line) {
      c.group.remove(c.line);
      c.line.geometry.dispose();
      c.line = null;
    }
    if (c.plug) {
      c.group.remove(c.plug);
      c.plug = null;
    }
    const from = [c.x, BOARD.wellY, 0.062];
    const j = c.into == null ? null : JACKS[c.into];
    // the plug: a black sleeve with a paper collar behind it, standing in the jack's mouth, or
    // hanging nose-down on its weight in the well with the other one
    const plug = new THREE.Group();
    if (j) {
      const zz = JACK_Z + 0.03;
      c.line = cordTube(from, [j.x, j.y - 0.062, zz + 0.028], M.solid, { floor: WELL.y0 + 0.04 });
      c.group.add(c.line);
      const sleeve = cyl(0.028, 0.028, 0.075, M.solid, 12);
      sleeve.rotation.x = Math.PI / 2;
      sleeve.position.set(j.x, j.y, zz);
      plug.add(sleeve);
      const collar = cyl(0.031, 0.031, 0.016, M.paper, 12);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(j.x, j.y, zz + 0.026);
      plug.add(collar);
    } else {
      // hanging nose-down on its weight in the well. NO PAPER BAND ON THIS ONE: a collar at the
      // top of a shank makes a head, and two plugs in hats standing in a white trough are two
      // little men. Hanging, it is one tapered black shank and it reads as a plug.
      const rest = [c.x, WELL.y0 + 0.075, 0.07];
      c.line = cordTube(from, rest, M.solid, { floor: WELL.y0 + 0.05, weight: 0.05 });
      c.group.add(c.line);
      const shank = cyl(0.024, 0.011, 0.1, M.solid, 12);
      shank.position.set(rest[0], rest[1] - 0.05, rest[2]);
      plug.add(shank);
    }
    plug.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    c.plug = plug;
    c.group.add(plug);
  }

  // ---- THE PAIR --------------------------------------------------------------------------------
  // Two of the six, fixed for the evening and never shown. The seed and the calendar day, so a
  // visitor who comes back tomorrow has a different call to find and a screenshot taken twice in
  // one session finds the same one. `?pair=1,4` pins it, the way `?now=` pins the clock.
  const PAIR = (() => {
    const asked = (ctx.params ?? new URLSearchParams(location.search)).get('pair');
    const pinned = String(asked ?? '')
      .split(/[,\s]+/)
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < JACKS.length);
    if (pinned.length >= 2 && pinned[0] !== pinned[1]) return [pinned[0], pinned[1]].sort((a, b) => a - b);
    const evening = Math.floor(Date.now() / 86400000);
    let h = Math.imul((ctx.seed ?? 1) ^ evening, 2654435761) >>> 0;
    const next = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0), h / 4294967296);
    const a = Math.floor(next() * JACKS.length);
    let b = Math.floor(next() * (JACKS.length - 1));
    if (b >= a) b++;
    return [a, b].sort((x, y) => x - y);
  })();

  // ---- state -----------------------------------------------------------------------------------
  let hovered = -1, lifted = -1;
  let ringAt = 0, bellAt = 0, dropAt = 0; // frames on the 12 fps clock; 0 is "not armed"
  let ringing = false;
  const sound = () => ctx.pieces.sound;
  const plugged = () => cords.map((c) => c.into).filter((i) => i != null).sort((a, b) => a - b);
  const isPair = () => {
    const p = plugged();
    return p.length === 2 && p[0] === PAIR[0] && p[1] === PAIR[1];
  };
  function tell(rang = false) {
    ctx.emit?.('props:switchboard', { plugged: plugged(), rang: !!rang });
  }

  // The board's own box on the glass, in px, and a jack's: the eight corners of the thing,
  // projected. `hitBox()` is what is drawn; `tapBox()` is what a thumb is given.
  function projectBox(obj, local) {
    if (!obj) return null;
    obj.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, Hp = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const x of [local.min.x, local.max.x]) for (const y of [local.min.y, local.max.y]) for (const z of [local.min.z, local.max.z]) {
      v.set(x, y, z);
      obj.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * Hp);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  const BOARD_BOX = new THREE.Box3(
    new THREE.Vector3(-BOARD.w / 2, BOARD.y0, 0),
    new THREE.Vector3(BOARD.w / 2, BOARD.y1, BOARD.d),
  );
  function hitBox(i = null) {
    if (i == null) return projectBox(g, BOARD_BOX);
    const j = jacks[i];
    return j ? projectBox(j, j.userData.box) : null;
  }
  function tapBox(i = null) {
    const b = hitBox(i);
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }

  // ---- the switch ------------------------------------------------------------------------------
  // A cord goes in on a CUT: the drawing changes whole on the next 12 fps step, and the plug going
  // home is heard now, because the visitor's finger is on the jack now.
  function plug(i, { quiet = false } = {}) {
    if (!Number.isInteger(i) || i < 0 || i >= JACKS.length) return false;
    if (cords.some((c) => c.into === i)) return false;
    const free = cords.find((c) => c.into == null);
    if (!free) return false; // both cords are out on the board: there is nothing left to plug
    free.into = i;
    drawCord(free);
    if (!quiet) {
      sound()?.play?.('plug', { pan: -0.5 });
      // the exchange's tone, out of the radio's own loudspeaker whether or not the set is on
      sound()?.at?.(0.1, 'dialtone', { through: 'set', pan: -0.42 });
    }
    if (isPair() && !ringing && !quiet) {
      ringing = true;
      ringAt = ctx.clock.frame + RING_AT; // the tone finishes, and then the bell
    }
    tell();
    return true;
  }
  function pull(i, { quiet = false } = {}) {
    const c = cords.find((x) => x.into === i);
    if (!c) return false;
    c.into = null;
    drawCord(c);
    // pulled before it rang: the circuit is broken and nothing rings. Once the bell has actually
    // started it stands — he is already reaching for the receiver by then.
    if (ringAt && !isPair()) {
      ringAt = 0;
      ringing = false;
    }
    if (!quiet) sound()?.play?.('plug', { gain: 0.7, pan: -0.5 });
    tell();
    return true;
  }
  function tap(i) {
    if (cords.some((c) => c.into === i)) pull(i);
    else plug(i);
  }

  for (let i = 0; i < jacks.length; i++) {
    switches?.add({
      name: `jack-${i}`,
      object: () => jacks[i],
      tapBox: () => tapBox(i),
      onHover: (on) => {
        hovered = on ? i : hovered === i ? -1 : hovered;
      },
      onDown: () => tap(i),
    });
  }

  cords.forEach(drawCord);
  // no cast shadows: a plate a hand off the plaster would throw a black bar the length of the wall,
  // and this wall is the one big bare area the frame has left
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = true;
    }
  });

  const api = {
    // which jacks have cords in them, in board order
    get plugged() {
      return plugged();
    },
    // for the tools only: the pair is never shown in the room and nothing draws it
    get _pair() {
      return [...PAIR];
    },
    get ringing() {
      return ringing;
    },
    jacks: JACKS.map((j, i) => ({ i, ...j })),
    // the strip this board used to be, still on the back of the operator's position and switched
    // off. Kept reachable so a tool can put the room back the way it was for a before-frame.
    positionStrip: chest?.userData?.jackStrip ?? null,
    plug,
    pull,
    tap,
    hitBox,
    tapBox,
    // for a still and for the tools: put the cords where they are wanted with no cue and no bell
    set(list = []) {
      for (const c of cords) {
        c.into = null;
        drawCord(c);
      }
      ringing = false;
      ringAt = bellAt = dropAt = 0;
      for (const i of list) plug(i, { quiet: true });
      tell();
    },
    update() {
      const f = ctx.clock.frame;
      // the ring: two seconds of bell, and then he picks it up. He does not move to do it — there
      // is nothing on this board for him to reach and he never leaves the bench.
      if (ringAt && f >= ringAt) {
        ringAt = 0;
        bellAt = f;
        sound()?.play?.('bell', { pan: -0.4 });
      }
      if (bellAt && f >= bellAt + BELL_F) {
        bellAt = 0;
        dropAt = f + AFTER_F;
        ctx.pieces.pepeAnim?.react?.('surprise');
        tell(true); // flow.js hears this and asks the mind for the `phone` beat
      }
      // ...and afterwards the cords come out on their own. A line of his that is still being read
      // holds them in: dialogue's own cue pushes this out (see the listener in props.js's block).
      if (dropAt && f >= dropAt) {
        dropAt = 0;
        ringing = false;
        for (const c of cords) if (c.into != null) pull(c.into);
      }
      // the hover: the ring stands a little further out of the plate, which is the whole of the
      // affordance — no glow, no outline, a jack that can be seen to move
      if (hovered !== lifted) {
        if (lifted >= 0 && jacks[lifted]) jacks[lifted].position.z = JACK_Z;
        if (hovered >= 0 && jacks[hovered]) jacks[hovered].position.z = JACK_Z + HOVER_LIFT;
        lifted = hovered;
      }
    },
    // dialogue tells the room when he is talking; while he is answering the phone the cords stay in
    holdFor(seconds = 0) {
      if (!dropAt) return;
      dropAt = Math.max(dropAt, ctx.clock.frame + Math.ceil((seconds + 1) * 12));
    },
    DIAL_S,
  };
  return api;
}

// the board's two drawn faces, struck once for the piece. 0.15 is the appetite for tone the
// position's own jack strip asks for: the strip is solid ink already and hatching it would close
// the paper marks up into a blot.
let _stripMat = null, _desigMat = null;
function STRIP_MAT() {
  if (!_stripMat) _stripMat = inkMaterial({ map: jackStripTexture({}), hatch: 0.15 });
  return _stripMat;
}
function DESIG_MAT() {
  if (!_desigMat) _desigMat = inkMaterial({ map: designationTexture({}), hatch: 0.15 });
  return _desigMat;
}
