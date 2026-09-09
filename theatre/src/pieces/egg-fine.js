// AN EGG, inside props: THE ROOM CATCHES FIRE AND NOBODY MENTIONS IT.
//
// The user: "Hold the pointer on the mushroom lamp beside him for three seconds: small drawn flames
// start along the shelves, he does not react at all, and the placard says nothing. Move the pointer
// and they go out."
//
// It is the dog in the burning kitchen, played straight. Everything that would normally be the
// point of a fire is deliberately withheld:
//
//   THE LIGHT DOES NOT CHANGE. Not one lamp is added, moved or brightened. A fire that lit the room
//   would be a fire the room had noticed, and the whole joke is that the room has not. The flames
//   are DRAWN — paper cut-outs standing on the shade, on the shelf boards and on the cloth — and
//   drawing is all they are. This is also why they are ink only: the room has one green (Pepe) and
//   the card faces, and a fire in orange would be the second-loudest thing in the film.
//
//   PEPE DOES NOTHING WHATSOEVER. This file never touches pepe, pepeAnim, flow or dialogue. It does
//   not call `say`, it does not set a mood, it does not so much as read his state. The placard says
//   nothing because nothing has been said to it. tools/_egg-fine-proof.mjs pixel-compares his own
//   region across the fire going up and puts the number in the report.
//
//   NOTHING ANNOUNCES IT. No label, no glow, no outline, no tag. The cursor becomes a pointer over
//   the lamp and that is the entire affordance — the radio's manners, the cat's manners, the
//   lever's manners. A visitor who never holds still on the lamp never finds out.
//
// HOW IT IS WORKED. The lamp is a HOVER-AND-HOLD, which no other switch in this room is, and the
// difference is the point: you do not click a lamp into flames, you linger on it until something
// goes wrong. Three seconds of the pointer resting on the mushroom lamp; then one flame every half
// second until a dozen are burning, in the order a fire would actually take the room —
//
//   the lamp's own shade (three), because that is where the hand was;
//   the shelf boards either side of him (six, alternating left and right), because that is what is
//     nearest and it is full of paper;
//   the near edge of the table (three), which is the last thing between the fire and the lens.
//
// The moment the pointer leaves the lamp — or, on a phone, the moment the finger lifts or slides
// off it — every flame shrinks over half a second to a last wisp and is gone, and the cue stops.
//
// HOW A FLAME IS DRAWN. Two sheets each, and exactly one of them is shown at a time, swapped on
// every 12 fps step: that is the room's own boil doing the flickering, so a flame is alive for the
// same reason a held line is. Each sheet is a closed teardrop FILLED WITH PAPER — a flame in front
// of a bookcase hides the bookcase — with the contour struck round it at the room's nib and a solid
// ink lobe at its root. That is the round-1 critic's rule for every prop in this room (one solid
// black area, one bare white area) applied to a fire, and it is the reason a 24-pixel flame reads
// as one: black root, white body, one line round it. Three hands are cut, not one, and the twelve
// flames are dealt shapes and PHASES off a seeded table, so no two of them lick together.
//
// api (published as props.fine):
//   burning        true while anything is alight (the flag `props:fine` carries)
//   lit            how many of the twelve are alight just now
//   count          twelve
//   set(on)        for a still: all of them, or none, with no hold, no cue and nothing to wait for
//   hitBox()       the lamp's box on the glass, in px
//   tapBox()       the box a thumb is actually given (≥ 44 px, grown about the same centre)
//   held           how long the pointer has rested on the lamp, in seconds
//   setState(name) `fine-burning` is the dozen alight; every other name is a room that is fine
//   update(ctx)    called from props.update on the stepped clock
import * as THREE from 'three';
import { INK, PAPER, makeCanvas, canvasTexture, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

// ---- the numbers the fire is timed by, AND THEY ARE COUNTED IN DRAWINGS ------------------------
// Three seconds is thirty-six drawings, half a second is six, and it is the drawings that are the
// unit, not the seconds. That is not a convenience for the tools: everything hand-animated in this
// film is a count of drawings on the twelve — an insect's flight is 8 to 14 of them, the lever is
// one, the smoosh is twenty-four — and a beat measured in wall seconds would be the only thing in
// the room that ran on a different clock from the paper. On a machine that holds sixty frames a
// second the two are the same number; on one that does not, the fire takes as long as the rest of
// the drawing does, which is the correct answer and the one a stop-motion camera would give.
const HOLD_F = 36; // drawings of the pointer resting on the lamp before the first flame (3.0 s)
const EVERY_F = 6; // drawings between one flame and the next (0.5 s)
const OUT_F = 6; // drawings to shrink the lot to nothing (0.5 s)
const CRACKLE_EVERY = 4; // drawings between one firing of the cue and the next (see LENGTH.crackle)
const MIN_TAP = 44; // px: what a thumb needs, whatever the lamp measures on the glass

// ---- the drawing --------------------------------------------------------------------------------
// THE SHEET, AND WHY IT IS THIS SIZE. A flame stands about 0.12 m tall on the back wall, which is
// 181 px to the metre at the home plate: 22 screen pixels. The room's pen on that wall is 0.013 m,
// or 2.4 px. So the whole drawing is nine or ten pen widths tall and there is room in it for three
// marks and no more — a contour, the paper it encloses, and one black root. A first pass had an
// inner tongue line as well and at this size the tongue and the contour merged into a blot, which
// is the same lesson egg-insects.js learnt about outlining a wing.
const S = 80; // canvas px a side
const BASE_V = 0.93; // where the foot of the flame sits in the sheet, top-down
const TIP_V = 0.1; // …and the tip. The drawing is (BASE_V - TIP_V) of the sheet tall.
const TALL = BASE_V - TIP_V;

// a closed wobbly loop, filled and then stroked: the flame's own silhouette
function loop(g, pts, { width = 6, wobble = 0.5, rng = Math.random, fill = null }) {
  g.save();
  g.beginPath();
  const n = pts.length;
  for (let i = 0; i <= n; i++) {
    const [x, y] = pts[i % n];
    const [nx, ny] = pts[(i + 1) % n];
    const mx = (x + nx) / 2 + (rng() - 0.5) * wobble, my = (y + ny) / 2 + (rng() - 0.5) * wobble;
    if (i === 0) g.moveTo(mx, my);
    else g.quadraticCurveTo(x, y, mx, my);
  }
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (width > 0) {
    g.strokeStyle = INK;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
  g.restore();
}

// THE THREE HANDS. A flame is a base, a shoulder, a waist and a tip, and the only things that make
// one flame a different flame from the next are where the tip leans, how high it goes and how fat
// the shoulder is. `lean` is the tip's throw off centre as a fraction of the sheet; `pose` 1 is the
// same flame a twelfth of a second later, and it leans the OTHER way and stands a little shorter,
// so a pair alternating at 6 Hz reads as licking rather than as a wobble.
const HANDS = [
  { lean: [-0.07, 0.075], tip: [0.0, 0.055], base: 0.165, shoulder: 0.215, root: 0.6 },
  { lean: [0.055, -0.085], tip: [0.02, 0.075], base: 0.185, shoulder: 0.235, root: 0.56 },
  { lean: [-0.03, 0.045], tip: [0.045, 0.0], base: 0.15, shoulder: 0.2, root: 0.64 },
];

// One sheet. `hand` is which of the three, `pose` is 0 or 1, `pen` the nib in canvas px (the table's
// flames are nearer the lens than the wall's, so they are drawn with a finer one — see SEATS).
export function drawFlame(hand, pose, pen) {
  const H = HANDS[hand % HANDS.length];
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  const rng = mulberry32(hand * 7717 + pose * 613 + Math.round(pen * 100) * 31 + 5);
  const cx = S / 2;
  const by = BASE_V * S; // the foot
  const ty = (TIP_V + H.tip[pose]) * S; // …and the tip, which is lower on the second drawing
  const lean = H.lean[pose] * S;
  const bw = H.base * S * (0.94 + rng() * 0.12);
  const sw = H.shoulder * S * (0.94 + rng() * 0.12);
  const sy = by - (by - ty) * 0.28; // the shoulder: the widest part, low down
  const wy = by - (by - ty) * 0.62; // the waist, where it starts to gather to the tip

  // THE SILHOUETTE, filled with paper first. A flame in front of a bookcase hides the bookcase, so
  // this is a cut-out with a white body and not an outline you can read the spines through.
  const pts = [
    [cx - bw, by],
    [cx - sw, sy],
    [cx - sw * 0.42 + lean * 0.45, wy],
    [cx + lean, ty],
    [cx + sw * 0.34 + lean * 0.45, wy],
    [cx + sw * 0.92, sy],
    [cx + bw, by],
  ];
  loop(g, pts, { width: pen, wobble: pen * 0.22, rng, fill: PAPER });

  // THE ROOT: the solid black area the room asks every drawn thing for, and the one place in a
  // flame where a pen would really be dense. It stops well short of the contour on both sides, so
  // there is bare paper between the two and the flame does not close up into a blot.
  // THE ROOT IS MEASURED OFF THE PAPER LEFT INSIDE THE CONTOUR, not off the silhouette, and that is
  // the whole reason a 22-pixel flame on the lampshade reads the same as a 32-pixel one on the
  // cloth. The nib is solved per flame to come out at 2.4 px on the glass whatever the flame
  // measures, so a small flame carries a proportionally FATTER line and has less white inside it;
  // a root cut as a fraction of the outline swelled to fill that white and the three on the shade
  // came out as black triangles. Cut as a fraction of what is actually left — 45% of it — every
  // flame in the room has the same amount of paper between its root and its contour.
  const rh = (by - ty) * H.root * 0.46;
  const rw = (bw - pen * 0.5) * 0.45;
  const root = [
    [cx - rw, by - pen * 0.35],
    [cx - rw * 0.72, by - rh * 0.5],
    [cx + lean * 0.4, by - rh],
    [cx + rw * 0.72, by - rh * 0.5],
    [cx + rw, by - pen * 0.35],
  ];
  loop(g, root, { width: 0, wobble: pen * 0.18, rng, fill: INK });

  // and the foot: one stroke along the bottom, which is what the flame is standing on. It is the
  // mark that stops a cut-out floating a pixel above its board.
  inkLine(g, cx - bw * 0.92, by, cx + bw * 0.92, by, { width: pen * 0.8, wobble: pen * 0.16, rng, segments: 3 });
  return c;
}

// ---- where the twelve stand ---------------------------------------------------------------------
// THE ORDER IS THE FIRE'S OWN, and it starts under the hand. `at` says which thing it stands on,
// `p` is where in metres (the lamp's three are offsets from the lamp's own origin, so they follow
// the lamp; the rest are room coordinates), `h` how tall the flame is and `hand`/`phase` which of
// the three drawings it was dealt and which of the two it starts on.
//
// The shelf and table numbers are READ from the objects that carry them and never written:
//   · the cases. props.js: `O.shelfUnit({ w: 0.34, h: 1.02, d: 0.28, boards: [0.15, 0.57] })` at
//     x = ±0.85, z = FLUSH + 0.14 = -2.32. A board is `box(w - 2t, t, d - 0.01)` at y - t/2, so its
//     TOP is exactly 0.15 / 0.57; the case's own top board is 0.02 deeper and its face is at 1.02.
//     Front edges therefore at z = -2.185 (boards) and -2.16 (the top). The two on the top boards
//     stand OUTBOARD of the globe and the cat, which live on the middle of those same boards.
//   · the table. layout.js: top 0.76, radius 0.62, and table.js bends the cloth over the rim at
//     R - 0.012. All three sit inside 0.60 m of the axis, and the gap in the middle of them is
//     where the deck stands (layout `deck.pos` [0, 0.7625, 0.44]): a flame drawn on top of the
//     cards would be two drawings in one place.
const SEATS = [
  // THE LAMP'S OWN SHADE — offsets from the lamp's origin, standing on the dome's CROWN (a
  // hemisphere of r 0.115 about y 0.19) and not on its face. That is a measurement, not a
  // composition: the shade is 43 x 23 px at the home plate and a flame that reads at all is 22 px
  // tall, so three of them planted across the front of it erase the lamp altogether — the first
  // pass did, and the drawing came out as one white lump with three dark wicks in it. Put on the
  // crown and spread to ±0.092 m they stand ABOVE the shade's contour, which stays whole, and the
  // gap of bare dome between each pair is 7 px wide on the glass. Each foot is on the dome's own
  // PROFILE — y = 0.19 + sqrt(0.115² - x²) at z = 0, the highest the shade gets at that x — so the
  // flame stands tangent to the shade's contour instead of in front of it: the arc comes out
  // unbroken and the fire sits on it, which is how it would be drawn by hand. Upstage of that the
  // dome swallows the flames' feet and three of them come out as ears; downstage, the white bodies
  // eat the crown. Both were drawn and looked at; this is the one that is a lamp on fire.
  { at: 'lamp', p: [-0.088, 0.2636, 0.0], h: 0.1, hand: 0, phase: 0 },
  { at: 'lamp', p: [0.0, 0.3046, 0.0], h: 0.115, hand: 1, phase: 1 },
  { at: 'lamp', p: [0.088, 0.2636, 0.0], h: 0.095, hand: 2, phase: 0 },
  // THE SHELF BOARDS, left and right and left and right: a fire crosses a room, it does not finish
  // one bookcase before it starts the other. It starts on the top boards at the ends NEAREST the
  // lamp, works outboard past the globe and the cat, and only then drops to the middle board.
  //
  // THE TWO GAPS ON THE TOP BOARDS ARE MEASURED, not chosen. The board runs -1.035 to -0.665; the
  // globe's own box on it is -0.972 to -0.745 and the cat's is 0.762 to 0.970 (both read off the
  // objects with tools/_egg-fine-where.mjs). A flame is 56 mm across at its foot, so there is one
  // slot outboard of each and one inboard, and no third.
  //
  // AND NOTHING BELOW THE MIDDLE BOARD, which is the one measurement in this file that had to be
  // taken off a rendered frame rather than off the set. The bottom board at y 0.15 lands at 517 px
  // on the home plate; the tablecloth's own skirt, three metres nearer the lens, runs across that
  // band from 476 to 804 px, and two flames put there were behind it entirely — 21 and 35 changed
  // pixels against 150 for every other one, which is what a flame nobody can see is worth. The
  // middle board's inboard end is out too, for the same kind of reason at a tenth the scale: the
  // case's own stile stands at -0.702, a flame centred at -0.72 reaches -0.694, and eight
  // millimetres of it came out sliced off down a straight white edge.
  { at: 'room', p: [-0.705, 1.02, -2.17], h: 0.115, hand: 2, phase: 1 },
  { at: 'room', p: [0.71, 1.02, -2.17], h: 0.125, hand: 0, phase: 0 },
  { at: 'room', p: [-1.0, 1.02, -2.17], h: 0.13, hand: 0, phase: 1 },
  { at: 'room', p: [1.0, 1.02, -2.17], h: 0.115, hand: 1, phase: 0 },
  { at: 'room', p: [-0.94, 0.57, -2.19], h: 0.125, hand: 1, phase: 0 },
  { at: 'room', p: [0.94, 0.57, -2.19], h: 0.12, hand: 2, phase: 1 },
  // and the cloth's near edge, which is the last thing between the fire and the lens. Nearer the
  // camera, so smaller in metres and drawn with a finer nib, and the two come to the same width on
  // the glass: one pen for the whole room, which is the house rule.
  { at: 'table', p: [-0.4, 0.762, 0.42], h: 0.1, hand: 2, phase: 0, near: true },
  { at: 'table', p: [-0.13, 0.762, 0.575], h: 0.09, hand: 0, phase: 1, near: true },
  { at: 'table', p: [0.33, 0.762, 0.5], h: 0.105, hand: 1, phase: 0, near: true },
];

// The lamp's own box, in its own frame, off props-objects.js `mushroomLamp`: a lathed base under a
// hemisphere of radius 0.115 whose centre is at y 0.19, so the whole fitting is 0.23 across and
// 0.305 tall. Read, never written: if that lamp is ever redrawn these move with it.
const LAMP = { r: 0.115, top: 0.305 };

export function buildFine(ctx, { group, switches, lamp }) {
  const root = new THREE.Group();
  root.name = 'fine';
  root.userData.noShadow = true; // a drawn flame throws nothing: the light does not change

  // ONE PEN FOR THE WHOLE ROOM, WHICH IS TWO NIBS ON THE CANVAS. Every sheet is 80 px square
  // whatever it measures in metres, so a flame that is 0.095 m tall carries the same canvas as one
  // that is 0.13 m and would be drawn a quarter finer if the nib were shared. The nib is therefore
  // solved per flame from the width the mark has to come out at ON THE GLASS: 0.013 m of pen (the
  // room's own contour on the back wall, egg-insects.js's measurement) at 181 px to the metre is
  // 2.4 screen pixels, and the table's near edge runs 270 px to the metre, so a flame down there is
  // drawn with a nib scaled by 181/270 to arrive at the same 2.4. Rounded to a tenth of a canvas
  // pixel, twelve flames fall on five distinct nibs.
  const nibFor = (h, near) => (0.013 * (near ? 181 / 270 : 1) * S * TALL) / h;

  // three hands x two drawings x however many nibs the twelve seats ask for: ten canvases as the
  // table above stands. A sheet is a dozen strokes on an 80 px canvas, so the lot costs a handful
  // of milliseconds; there is nothing here worth baking and nothing worth building lazily.
  const geo = new THREE.PlaneGeometry(1, 1);
  const cache = new Map();
  const sheetMat = (hand, pose, nib) => {
    const key = `${hand}-${pose}-${nib.toFixed(1)}`;
    let m = cache.get(key);
    if (m) return m;
    // pepe.js's three numbers, for pepe.js's three reasons: `colorful` so the ink pass shows the
    // drawing verbatim and re-states its achromatic marks at the room's nib, `lineWeight` 0 so the
    // pass draws no second contour round a card, `hatch` 0.02 so a flat sheet facing the visitor
    // takes no wash. A flame is a cut-out exactly as he is.
    m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
    m.userData.ink = { hatch: 0.02, lineWeight: 0, colorful: true };
    m.alphaTest = 0.5;
    m.transparent = false;
    m.name = `flame-${key}`;
    const tex = canvasTexture(drawFlame(hand, pose, +nib.toFixed(1)));
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
    m.map = tex;
    cache.set(key, m);
    return m;
  };

  // WHERE THE LAMP IS. props.js stands it on the operator's position and never turns it, so its
  // own frame and the room's are the same frame; if it is not in the set at all (a stripped room)
  // the fire falls back to where that position has always been and nothing throws.
  lamp?.updateWorldMatrix(true, true);
  const lampAt = lamp ? lamp.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(-0.44, 0.82, -2.25);

  const flames = SEATS.map((s, i) => {
    const g = new THREE.Group();
    g.name = `flame-${i}`;
    const nib = nibFor(s.h, !!s.near);
    const sheets = [0, 1].map((pose) => {
      const m = new THREE.Mesh(geo, sheetMat(s.hand, pose, nib));
      m.castShadow = false;
      m.receiveShadow = false;
      m.visible = false;
      g.add(m);
      return m;
    });
    const foot = s.at === 'lamp' ? new THREE.Vector3(...s.p).add(lampAt) : new THREE.Vector3(...s.p);
    const sheet = s.h / TALL; // the sheet is taller than the flame: see BASE_V / TIP_V
    g.position.copy(foot);
    g.visible = false;
    root.add(g);
    return { i, group: g, sheets, foot, sheet, phase: s.phase, at: s.at, lit: false, from: 0 };
  });
  group.add(root);

  // ---- the fire ---------------------------------------------------------------------------------
  let want = false; // the pointer is resting on the lamp (or a finger is down on it)
  let hovering = false, pressing = false;
  let drawn = 0; // drawings this piece has been given, ever: what the flicker and the wisps run on
  let steps = 0; // …and how many of them the pointer has rested on the lamp for. Zero when it has not.
  let lit = 0; // how many are alight
  let outFrom = -1; // the drawing they started going out on, -1 while nothing is going out
  let burning = false;
  let crackleAt = -99;
  // LIT BY HAND, WHICH IS NOT THE SAME AS BURNING. `set(true)` is for a still — the `fine-burning`
  // judging state, a tool's control frame — and a still has to HOLD. Without this latch the very
  // next drawing sees that no pointer is on the lamp, starts the going-out and has the frame bare
  // six drawings later, which is exactly what ?view=props&state=fine-burning did until it was
  // caught. A real pointer arriving takes the fire off the hand and puts it back on the hold.
  let byHand = false;

  const setSize = (f, u) => {
    // scaled about its FOOT, not its middle: a flame shrinking to a wisp keeps standing on the
    // board it is standing on
    f.group.scale.set(f.sheet * u, f.sheet * u, 1);
    f.group.position.set(f.foot.x, f.foot.y + f.sheet * u * (BASE_V - 0.5), f.foot.z);
  };
  const show = (f, which) => {
    for (let s = 0; s < f.sheets.length; s++) f.sheets[s].visible = s === which;
  };
  const douse = () => {
    for (const f of flames) {
      f.lit = false;
      f.group.visible = false;
    }
    lit = 0;
    outFrom = -1;
  };
  function say(next) {
    if (next === burning) return;
    burning = next;
    ctx.emit?.('props:fine', { burning, n: lit });
  }
  // where the fire is on the glass, as a pan: the shelf on the right of the room crackles on the
  // right. Taken off the flames that are actually alight, so it walks across as the fire spreads.
  function pan() {
    const W = ctx.size?.w || window.innerWidth;
    if (!W) return 0;
    const v = new THREE.Vector3();
    let sum = 0, n = 0;
    for (const f of flames) {
      if (!f.lit) continue;
      v.copy(f.foot).project(ctx.camera);
      sum += v.x;
      n++;
    }
    return n ? Math.max(-1, Math.min(1, sum / n)) : 0;
  }

  // ---- the lamp on the glass ---------------------------------------------------------------------
  function hitBox() {
    if (!lamp) return null;
    lamp.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const x of [-LAMP.r, LAMP.r]) for (const y of [0, LAMP.top]) for (const z of [-LAMP.r, LAMP.r]) {
      v.set(x, y, z);
      lamp.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to a thumb's 44 px. The lamp stands at the far end of the operator's
  // position with the doily under it and bare plaster over it, and the nearest other switch (the
  // globe on the left bookcase) is 0.4 m away, so the margin costs nothing.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  const inside = (px, py) => {
    const b = tapBox();
    return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  };
  const arrive = () => {
    const next = hovering || pressing;
    if (next === want) return;
    want = next;
    byHand = false; // a hand on the glass takes the fire off a tool and puts it back on the hold
    if (want) steps = 0; // the hold starts counting on the next drawing, not on this pointer event
  };

  // THE ONLY HOVER-AND-HOLD IN THE ROOM, and it is registered like every other switch so the
  // arbiter can still say which object a thumb inside two margins meant. `onHover` is the mouse;
  // `down`/`move`/`up` are the finger, which has no hover to give — it presses, and it holds, and
  // sliding off the lamp is the finger leaving it just as much as lifting is.
  switches?.add?.({
    name: 'fine',
    object: () => lamp,
    tapBox,
    onHover: (on) => {
      hovering = !!on;
      arrive();
    },
    // no `onDown`: a CLICK on the lamp is not how this works, and the arbiter has already done the
    // two things a press has to do — stopped the event reaching flow.js, which would read it as the
    // visitor skipping Pepe's line, and opened the audio context by hand, which is the only reason
    // a phone hears the crackle at all
    down: (px, py, ev) => {
      if (ev?.pointerType !== 'touch') return;
      pressing = true;
      arrive();
    },
    move: (px, py, ev) => {
      if (ev?.pointerType !== 'touch' || !pressing) return;
      if (!inside(px, py)) {
        pressing = false;
        arrive();
      }
    },
    up: (px, py, ev) => {
      if (ev?.pointerType !== 'touch') return;
      pressing = false;
      arrive();
    },
  });

  const api = {
    count: flames.length,
    get burning() {
      return burning;
    },
    get lit() {
      return lit;
    },
    // how long the pointer has rested on the lamp — in drawings, and in the seconds those drawings
    // are worth at 12 fps. What a tool needs to say the hold is three seconds and not two or four.
    get steps() {
      return want ? steps : 0;
    },
    get held() {
      return (want ? steps : 0) / (ctx.clock.fps || 12);
    },
    // the drawing this piece is on, ever: a tool releasing one at a time counts with this
    get drawn() {
      return drawn;
    },
    // where each of the twelve stands, for the tools
    seats: flames.map((f) => f.foot.toArray().map((n) => +n.toFixed(3))),
    where: flames.map((f, i) => SEATS[i].at),
    hitBox,
    tapBox,
    // a flame's own box on the glass, so a proof can look at one at 2x instead of hunting for it
    flameBox(i) {
      const f = flames[i];
      if (!f || !f.lit) return null;
      f.group.updateMatrixWorld(true);
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      const xs = [], ys = [];
      const v = new THREE.Vector3();
      for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) {
        v.set(x, y, 0);
        f.group.localToWorld(v).project(ctx.camera);
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    },
    // for the tools and for setState: the whole dozen, or none of them, with no hold and no cue
    set(on = true) {
      hovering = pressing = want = false;
      steps = 0;
      outFrom = -1;
      crackleAt = -99;
      byHand = !!on;
      if (on) {
        lit = flames.length;
        for (const f of flames) {
          f.lit = true;
          f.from = -1e9; // lit long ago: no catching beat in a still
          f.group.visible = true;
          setSize(f, 1);
          show(f, (ctx.clock.frame + f.phase) % 2);
        }
      } else douse();
      burning = !!on;
    },
    // `fine-burning` is the dozen alight for a still; every other name is a room that is fine
    setState(name = 'default') {
      api.set(name === 'fine-burning');
    },
    // Called from props.update, which only calls anything on a stepped frame — so the flicker, the
    // catching, the going out and the crackle are all on the same 12 fps grid as the pendulum.
    update() {
      drawn++;
      if (want) {
        // came back before the last wisp had gone: it simply catches again where it was
        outFrom = -1;
        steps++;
        const n = steps < HOLD_F ? 0 : Math.min(flames.length, 1 + Math.floor((steps - HOLD_F) / EVERY_F));
        for (let i = lit; i < n; i++) {
          flames[i].lit = true;
          flames[i].from = drawn;
          flames[i].group.visible = true;
        }
        if (n > lit) lit = n;
        if (lit > 0) say(true);
      } else if (!byHand) {
        steps = 0;
        if (lit > 0) {
          if (outFrom < 0) outFrom = drawn;
          // …and gone on the sixth. Five drawings of wisp and a bare frame is half a second, and it
          // is counted so that the FIRST drawing after the pointer left is already smaller: a frame
          // that shows exactly what the last one showed is a frame in which nothing happened, and
          // the visitor has just taken their hand away and is looking for something to happen.
          if (drawn - outFrom >= OUT_F - 1) {
            douse();
            say(false);
            return;
          }
        }
      }
      if (!lit) return;
      // the going-out, as a row of drawings and not a tween: the sheet is a size, held for a
      // twelfth of a second, and the last one is a wisp
      const u = outFrom < 0 ? 1 : Math.max(0, 1 - (drawn - outFrom + 1) / OUT_F);
      for (const fl of flames) {
        if (!fl.lit) continue;
        // A FLAME CATCHES BEFORE IT BURNS. Its first drawing is two thirds the size, held one step,
        // then it is up. One drawing, not a ramp: a thing that grows smoothly is the only
        // continuous thing in the film and this is not going to be it.
        const caught = drawn - fl.from === 0 ? 0.64 : 1;
        setSize(fl, u * caught);
        // THE FLICKER IS ON THE ROOM'S OWN CLOCK, not on this piece's count of drawings, and the
        // difference matters in exactly one place: a frozen frame. `?t=2.5` holds clock.frame still
        // and calls every piece's update on every tick, so a private counter would flip the sheet
        // sixty times a second in a still that is supposed to be one drawing. On the room's frame
        // the boil, the pendulum and the fire are the same drawing, held, which is the point.
        show(fl, (ctx.clock.frame + fl.phase) % 2);
      }
      // THE CRACKLE, and it runs while anything is alight and not a drawing longer. Every fourth
      // drawing, which is one firing every third of a second against a cue that is audible for a
      // little over that — the buzz's own arithmetic (sound-voices.js, LENGTH.crackle). It grows
      // with the fire because twelve of them are more than one, and it stops on the frame the last
      // wisp goes, because that is when there is nothing burning.
      if (!byHand && outFrom < 0 && drawn - crackleAt >= CRACKLE_EVERY) {
        crackleAt = drawn;
        ctx.pieces.sound?.play?.('crackle', { gain: 0.55 + (0.45 * lit) / flames.length, pan: pan() });
      }
    },
  };
  return api;
}
