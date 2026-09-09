// EGG: PEEP THE TOAD, the 2016 budget knock-off of Pepe, on the spares press stage right.
//
// The user: "a small figurine on the shelf by the honey jar, labelled PEEP. Click, it croaks a
// cheap synth croak; five clicks and it falls off the shelf and stays on the floor."
//
// WHAT HE IS. A moulded souvenir toad about a third the cat's size, standing on a blacked-in
// plinth with a paper label across its front. He is NOT PEPE and the drawing says so twice over:
//   · NO GREEN. The room has one green and it is Pepe's (BRIEF, selective colour). Peep is a
//     licensing accident and a licensing accident does not get the star's colour, so he is paper
//     and ink like every other object in the parlour. That is the whole joke: the cheap one is the
//     one drawn in the same pen as the furniture.
//   · A PLAIN FLAT FACE. Not a face drawn ON a dome — a flat disc let into the front of the head,
//     3 mm proud at the top and sunk into the mould at the bottom, the way a two-part mould with a
//     worn cavity comes out. Two dots and a straight line, no lids, no mouth corners, no lips. He
//     measures 20 px tall at the home plate and the room's pen is 2.4 px there, so three marks is
//     not a simplification, it is the budget: a fourth mark would be a smudge.
// He keeps the round-1 rule every prop in this room keeps: ONE solid black area (the plinth) and
// ONE bare white area (the body).
//
// WHERE HE STANDS, AND WHY IT IS NOT THE BOARD THE JAR IS ON. He is on the MIDDLE BAY of the same
// press — the second board up, 0.93 m under the honey jar — at the front lip, alone between the
// ACIDE carboy and the tumbler. The board the jar stands on is spoken for: egg-insects.js gives
// the six insects a ring of named landing places round that jar and they use the whole of it
// (world x 2.175 → 2.508 of a board that runs 2.005 → 2.575, both sides of the jar and the lid).
// The shelf immediately below is no better — FICHES, FINE and FUSIBLES leave 45 mm of clear board
// and this plinth is 98 mm. The middle bay is the one place on the press with a clear span wider
// than the figurine (142 mm, x 2.269 → 2.411, full depth, 0.44 m of headroom), and it is the bay
// the set deliberately leaves airy — "the film gives every packed run of objects one place where
// the eye is allowed to stop" (props.js). A knock-off souvenir standing on its own in the one
// empty bay is where a knock-off souvenir stands.
//   Nothing here is written down in world coordinates: the seat is an offset off the MIEL jar's
//   own bounding box, exactly as the insects' ring is, so if the press dressing ever moves, Peep
//   moves with it.
//
// WHAT A CLICK DOES. A cheap synth croak — two square-wave notes, falling, a toy's chip and
// nothing like the filtered noise the rest of this room is made of ('croak', sound-voices.js) —
// and the figurine ROCKS ONCE: four drawings on the 12 fps clock, tipped, tipped back, a hair
// over, upright. It pivots on the corner of its plinth and lifts the opposite corner off the
// board, because that is what a solid object on a flat foot does.
//
// AND THE FIFTH CLICK PUTS HIM ON THE FLOOR. Nine drawings, all on the same clock, nothing
// interpolated: two of him going over the front lip (pivoting on the edge, past the balance
// point), then seven of the fall — a parabola out and down with one full turn in it, the roll onto
// his side arriving in the last three. He lands on the bare boards in front of the press with a
// thud, on his left side, PEEP still facing the room, and he stays there. Clicking him on the
// floor croaks and does nothing else: he is not a switch, he is a toad who has already fallen.
// A reload puts him back on the shelf, because a reload puts everything back.
//
// NOTHING ANNOUNCES HIM. No label in the UI, no glow, no outline, no line of dialogue, nothing on
// the notice. The cursor over him becomes a pointer and that is the entire affordance — the same
// bargain the radio, the cat, the mains lever, the globe, the wine and the insects make.
//
// api (published as props.peep):
//   clicks        how many times he has been clicked, all told
//   fallen        whether he is on the floor
//   click()       a click, as a visitor's is — cue, take, event and all
//   set(fallen)   for a still: on the shelf or on the floor, with no take and no cue
//   hitBox()      his box on the glass, in px, wherever he is
//   tapBox()      the box a thumb is actually given (≥ 44 px, grown about the same centre)
//   update(ctx)   called from props.update on the stepped clock
import * as THREE from 'three';
import { makeCanvas, canvasTexture, inkMaterial, paper } from '../core/strokes.js';
import { signCaps, signFit } from './titles-sign.js';
import * as O from './props-objects.js';

// ---- the figurine, in metres, measured off its own foot ------------------------------------------
// The cat on the other bookcase is 0.306 m tall and 0.208 across (its own userData.box). Peep is
// 0.108 by 0.104: 0.35 of him by height, and the extra over a clean third is the LABEL — a plinth
// deep enough to letter four sorts on, rather than a toad with an illegible smudge under it.
// (tools/_egg-peep-proof.mjs measures both off the geometry and prints the ratio.)
const PLINTH = { w: 0.104, h: 0.046, d: 0.074 };
// THE HAUNCHES, turned on a lathe: a wide squat lump, wider than it is tall, which is the only
// thing that makes a piece of paper read as a toad at twenty pixels. y is from the top of the
// plinth up; x is the radius.
const BODY = [
  [0.0, 0.0],
  [0.0400, 0.0],
  [0.0435, 0.010],
  [0.0420, 0.022],
  [0.0370, 0.034],
  [0.0280, 0.045],
  [0.0140, 0.052],
  [0.0, 0.054],
];
// THE HEAD IS A DRUM LYING ON ITS SIDE, half sunk into the haunches, and its front cap is the face.
// A first pass hung a flat disc on the front of a dome and the disc floated: a dome falls away
// fast, so a facet big enough to letter a face on is inside the head at the bottom and three
// millimetres off it at the top, and the ink pass drew the rim of it hanging in the air. A drum
// cannot float — its wall is real geometry all the way round, the pass draws one clean circle, and
// the flat cap is flat because it is a cap and not a decal. It is also, exactly, how a two-part
// mould with one worn cavity comes out, which is what Peep is.
const HEAD = { r: 0.028, len: 0.034, y: 0.034, z: 0.030 };
// The paper strip across the plinth's front, and it takes nearly the whole of it. On the home plate
// the plinth is 20 px wide, so the label is 18 and PEEP has four and a half pixels a sort: every
// millimetre the plinth does not give it is a sort the sign hand cannot cut. A souvenir base is
// mostly label anyway — that is what a souvenir base is for.
const LABEL = { w: 0.094, h: 0.034, y: 0.023 };

// WHERE HE SITS, in metres off the MIEL jar's own base centre — x across, y up, z out of the wall —
// which is the same anchor egg-insects.js takes its ring off, and for the same reason: if the press
// dressing moves, this moves with it and nothing else has to be edited.
//   x  −0.080   the middle of the clear span between the ACIDE carboy and the tumbler
//   y  −0.925   the press top is 1.500 and the middle board is 0.575
//   z  +0.031   the board's front lip is 63 mm out of the jar's front face; the plinth is 74 mm
//               deep and stands 6 mm PROUD of the lip, so its centre is 31 mm out. Six millimetres
//               is somebody having nudged him forward, and it is why the fifth click is a fall and
//               not a shove.
const SEAT = { x: -0.080, y: -0.925, z: 0.031 };
const FALLBACK = { x: 2.420, y: 1.500, z: -2.288 }; // the jar's box, if the press is ever stripped

const CLICKS_TO_FALL = 5; // the user's number
const MIN_TAP = 44; // px: what a thumb needs, whatever he measures on the glass

// THE THREE MARKS OF THE FACE, AND THEY ARE GEOMETRY AND NOT A DRAWING. Two ink discs and one ink
// bar, half a millimetre proud of the flat cap — moulded in, the way a face is moulded into a
// figurine, and not printed on it. This was a face SHEET for two rounds and the sheet does not
// survive the distance: the cap is 10 px on the home plate and a 128 px drawing of a face minifies
// to a light grey there, which the ink pass reads as paper and throws away. (It was legible at the
// lens and gone at the plate, which is the worst of both: it looks finished to whoever drew it.)
// Solid ink geometry has no mip chain to lose it in — a black mesh is black at any distance the
// pass can still find its silhouette. And the sizes are the insects' rule, not life's: the mouth is
// 7.5 mm on a 56 mm face, which is a fat line for a mouth and 1.4 px on the plate, and 1.4 px is
// the least a mark can be here and still be a mark.
// …and they are set as far apart as the cap allows, which is also a measurement. Crowded — eyes
// 5.8 mm above the centre, mouth 8.8 below — the three marks close up into one black square at the
// plate and the face is a blot. Pushed to the rim there is a clear band of paper between the eyes
// and the mouth at every distance the pass can still find them.
const EYE = { r: 0.0060, x: 0.0104, y: 0.0080 }; // off the cap's centre
const MOUTH = { w: 0.030, h: 0.0070, y: -0.0112 };
const MARK_T = 0.0016; // how far each stands off the cap

// THE LABEL. A paper strip gummed across the front of the plinth, lettered in the sign hand — the
// same hand as the shop board over his head and the notice (titles-sign.js), because in this world
// there is one signwriter and he does the toads as well. PEEP set to the measure and nothing else
// on it: no rules, no border, no maker's mark. At eighteen screen pixels a ruled border is two of
// them and the word is left with fourteen, and the word is the whole point of the object.
function labelSheet(seed = 56) {
  const W = 188, H = 68;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  paper(g, W, H, '#f9f6ee', { grain: 0.05, seed });
  const capH = signFit('PEEP', W - 16, { capH: 46, tracking: 0.15 });
  signCaps(g, 'PEEP', W / 2, H / 2 + 1, { capH, pen: Math.max(3, capH * 0.15), tracking: 0.15, seed });
  return canvasTexture(c);
}

// ---- the takes: every pose is a DRAWING, and there is nothing between two of them ----------------
// THE ROCK. He pivots on the corner of his plinth, so the tilt lifts him: a solid object on a flat
// foot cannot lean without rising, and a figurine that leans while staying flat on the board is a
// sprite. Four drawings, a third of a second.
const ROCK = [0.115, -0.070, 0.028, 0];
const rockLift = (a) => Math.abs(Math.sin(a)) * (PLINTH.w / 2);

// THE TOPPLE AND THE FALL, built once and held: nine poses, in the group's own frame, as offsets
// off the seat. Two over the lip, then seven of the fall.
//   · the two go over the FRONT EDGE — the pivot is the lip, so he drops as he turns
//   · the seven are a parabola: y drops as u², which is what a fall is, and z runs out a little
//     faster than straight (u^0.8). The exponent on z is not a taste. Below him are two more bays of
//     bottles whose fronts stand within a millimetre of the carcase, and a straight line from the
//     lip to the floor takes his back edge through the ACIDE carboy on the way past. Front-loaded,
//     he is clear of every shelf and everything on one at every drawing of the fall — which
//     tools/_egg-peep-proof.mjs checks box by box rather than taking this comment's word for it.
//   · he turns ONCE in pitch (2π by the landing, so he is square again) and the ROLL onto his side
//     arrives in the last three drawings, which is where a falling thing meets the floor and goes
//     over. He lands on his left side with the label still facing the room.
// `drop` is how far he has to fall — the seat's own height above the floor, so the take is right
// wherever the press dressing puts him.
function buildTake(drop) {
  const out = [];
  // OVER THE EDGE, AND THE PIVOT IS THE LIP AND NOT HIS MIDDLE. A box tipped about its own centre
  // drives its leading corner straight down through whatever it is standing on; measured, drawing
  // one had 20 mm of plinth inside a 22 mm board. So the first drawing is a rotation about the
  // board's front edge — the local point (0, 0, LIP) held still, which is the group lifted by
  // LIP·sin θ and carried forward by LIP·(1 − cos θ) — plus 3 mm, which is what his own 6 mm of
  // overhang dips below the lip as he goes over. By the second he has passed the balance point and
  // the lip has let go of him: that one is free.
  const LIP = PLINTH.d / 2 - 0.006; // the plinth stands 6 mm proud of the board's edge
  const tip = (a) => ({ dy: LIP * Math.sin(a) + 0.003, dz: LIP * (1 - Math.cos(a)) });
  out.push({ dx: 0, ...tip(0.46), rx: 0.46, rz: 0, ry: 0.05 });
  out.push({ dx: 0.002, dy: 0.004, dz: 0.086, rx: 1.05, rz: -0.06, ry: 0.10 });
  const from = out[out.length - 1];
  const N = 7;
  // THE ROLL IS TO HIS LEFT AND THE SIGN OF IT IS NOT A TASTE. A rotation about +z takes his crown
  // to −x, which is TOWARD the camera: he ends up lying between the plate and his own plinth, and
  // what the frame gets is the toad. Rolled the other way the plinth is nearest and it hides all of
  // him — a black block on the boards with a white edge, and no toad in the picture at all.
  // AND HE IS THROWN 0.21 m TO THE RIGHT on the way down, which is not the roll: it is the lip. The
  // press's foot is blacked in (every case in the folios stands on a solid dark foot) and the floor
  // rakes about 6°, so twenty centimetres of board is a handful of pixels at the home plate — at
  // dx 0.02 he lay INSIDE that black band and all anyone could see of him was a white slot where
  // his label was. So the throw is linear in u, like anything leaving an edge, and the roll comes
  // at the end, when he meets the boards.
  const LAND = { dx: 0.21, dy: -drop, dz: 0.34, rx: Math.PI * 2, rz: Math.PI / 2 - 0.07, ry: 0.24 };
  for (let k = 1; k <= N; k++) {
    const u = k / N;
    const fall = from.dy + (LAND.dy - from.dy) * u * u;
    const outward = from.dz + (LAND.dz - from.dz) * Math.pow(u, 0.8);
    // nothing rolls in the air; it rolls when it meets the floor
    const over = Math.max(0, (u - 0.55) / 0.45) ** 1.4;
    out.push({
      dx: from.dx + (LAND.dx - from.dx) * u,
      dy: fall,
      dz: outward,
      rx: from.rx + (LAND.rx - from.rx) * u,
      rz: from.rz + (LAND.rz - from.rz) * over,
      ry: from.ry + (LAND.ry - from.ry) * u,
      thud: k === N,
    });
  }
  return out;
}

export function eggPeep(ctx, { group, switches, jar }) {
  const M = O.materials();

  // ---- where he stands, off the jar's own box ----------------------------------------------------
  jar?.updateWorldMatrix(true, true);
  const jb = jar ? new THREE.Box3().setFromObject(jar) : null;
  const anchor = jb && isFinite(jb.min.x) ? { x: (jb.min.x + jb.max.x) / 2, y: jb.min.y, z: jb.max.z } : FALLBACK;
  const seat = new THREE.Vector3(anchor.x + SEAT.x, anchor.y + SEAT.y, anchor.z + SEAT.z);

  // ---- the drawing --------------------------------------------------------------------------------
  const g = new THREE.Group();
  g.name = 'peep';
  g.position.copy(seat);
  g.userData.noShadow = true; // the cat's rule: a 100 mm object does not get to cast a mass

  // THE PLINTH: solid ink, and his one black area. Square, unmoulded, four sawn edges — the base a
  // souvenir gets when the money went on the mould.
  const plinth = O.box(PLINTH.w, PLINTH.h, PLINTH.d, M.solid);
  plinth.position.set(0, PLINTH.h / 2, 0);
  g.add(plinth);

  // THE LABEL, half a millimetre proud of the plinth's front so it is a gummed strip and not a
  // printed panel. hatch 0.14 and not the 0.5 a face wants: this is the bottles' own number
  // (props-objects.js bottleMaterial), and it is what keeps a small paper label PAPER. At 0.5 the
  // ink pass reads a strip this size as a surface in shadow and fills it, and a filled label is a
  // black tick on a black plinth.
  const labelMat = inkMaterial({ map: labelSheet(), hatch: 0.14, lineWeight: 1 });
  const label = O.plane(LABEL.w, LABEL.h, labelMat);
  label.position.set(0, LABEL.y, PLINTH.d / 2 + 0.0006);
  g.add(label);

  // THE BODY: bare paper inside the room's own contour, and almost no tone in it — a small white
  // thing on a shelf is read by its outline, and a squat lathe filled with strokes is a stone.
  const bodyMat = inkMaterial({ hatch: 0.18, lineWeight: 1.1 });
  const body = O.lathe(BODY, bodyMat, 20);
  body.position.set(0, PLINTH.h, 0);
  g.add(body);

  // THE HEAD: the drum, all of it in the body's own paper. Nothing is printed on it — the face is
  // three ink marks moulded into the cap, below.
  const head = O.cyl(HEAD.r, HEAD.r, HEAD.len, bodyMat, 22);
  head.rotation.x = Math.PI / 2; // the +y cap comes round to face +z, which is the room
  head.position.set(0, PLINTH.h + HEAD.y, HEAD.z);
  g.add(head);

  // THE FACE. Two eyes, dead level, and one straight mouth that does not turn up at the ends: a
  // mould does not do expression. The face of the room's most expensive object (Pepe, half-lidded,
  // red-lipped, hand-drawn) and the face of its cheapest, side by side on the same set.
  const faceZ = HEAD.z + HEAD.len / 2;
  const faceY = PLINTH.h + HEAD.y;
  for (const s of [-1, 1]) {
    const eye = O.cyl(EYE.r, EYE.r, MARK_T, M.solid, 12);
    eye.rotation.x = Math.PI / 2;
    eye.position.set(s * EYE.x, faceY + EYE.y, faceZ + MARK_T / 2 - 0.0002);
    g.add(eye);
  }
  const mouth = O.box(MOUTH.w, MOUTH.h, MARK_T, M.solid);
  mouth.position.set(0, faceY + MOUTH.y, faceZ + MARK_T / 2 - 0.0002);
  g.add(mouth);

  // THE BROW: two low paper swellings on top of the drum, where a toad's eyes bulge. They carry NO
  // pupil and no mark of any kind — they are the bone under the eyes, and the eyes are on the face
  // where a face's eyes are. A first pass gave each one an ink dot AND put eyes on the face below
  // it, and at twenty-two pixels the head came out as a scribble: four dark marks and three
  // contours inside nine pixels of paper.
  for (const s of [-1, 1]) {
    const brow = O.sphere(0.0125, bodyMat, 12, 9);
    brow.scale.set(1.5, 0.52, 1.2); // wide and low: a ridge, not an ear
    brow.position.set(s * 0.0155, PLINTH.h + HEAD.y + 0.0215, HEAD.z - 0.006);
    g.add(brow);
  }

  // TWO FRONT FEET on the plinth's top, which is the last thing that says toad rather than egg
  for (const s of [-1, 1]) {
    const foot = O.sphere(0.0105, bodyMat, 10, 8);
    foot.scale.set(1.35, 0.5, 1.6);
    foot.position.set(s * 0.0255, PLINTH.h + 0.002, 0.028);
    g.add(foot);
  }
  group.add(g);

  // his own box, in his own frame, taken off the geometry so it cannot drift from the drawing
  g.updateMatrixWorld(true);
  const BOX = new THREE.Box3().setFromObject(g).translate(seat.clone().negate());

  // ---- state ---------------------------------------------------------------------------------------
  let clicks = 0;
  let fallen = false;
  let take = null; // the drawings still to come
  let k = 0;
  const v = new THREE.Vector3();

  function pose(p) {
    if (!p) {
      g.position.copy(seat);
      g.rotation.set(0, 0, 0);
      return;
    }
    g.position.set(seat.x + (p.dx ?? 0), seat.y + (p.dy ?? 0), seat.z + (p.dz ?? 0));
    g.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
  }

  // THE TAKE, and the last drawing of it SAT DOWN ON THE BOARDS. A landed pose is a rotation and
  // three numbers, and the corner of a plinth rolled 84° is not where arithmetic on paper says it
  // is — the first cut had him leaning on air with one edge 9 mm off the floor, which on a raked
  // floorboard reads as a figurine hovering. So the pose is struck, his lowest vertex is measured,
  // and he is dropped by exactly that. The floor is y = 0 and this is the only thing in the file
  // that knows it.
  const TAKE = buildTake(seat.y);
  const LANDED = TAKE[TAKE.length - 1];
  pose(LANDED);
  g.updateMatrixWorld(true);
  LANDED.dy -= new THREE.Box3().setFromObject(g).min.y;
  pose(null);
  const rock = (a) => {
    g.position.set(seat.x, seat.y + rockLift(a), seat.z);
    g.rotation.set(0, 0, a);
  };

  // ---- the boxes on the glass ------------------------------------------------------------------------
  // His own eight corners through whatever matrix he is standing (or lying) in, so the box follows
  // him down and is right on the floor as well as on the shelf.
  function hitBox() {
    g.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    for (const x of [BOX.min.x, BOX.max.x]) for (const y of [BOX.min.y, BOX.max.y]) for (const z of [BOX.min.z, BOX.max.z]) {
      v.set(x, y, z);
      g.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to a thumb's 44 px. He is 24 x 22 px at the home plate, so the growth
  // is real: it falls on the bare board either side of him and on the carboy's and the tumbler's
  // own paper. That costs nothing, because the arbiter in props.js raycasts the DRAWINGS first and
  // only then falls back to the margins — a grown box never takes a tap that landed on something
  // drawn. Measured at every window in tools/_egg-peep-proof.mjs, which also reports the fact this
  // control cannot do anything about: on a phone the whole press is off the right of every named
  // plate, the way the radio is off the left. That is the camera's call, not a switch's.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }

  // ---- a click ---------------------------------------------------------------------------------------
  // The croak goes out NOW and not on the next drawing: the visitor's pointer is on him at this
  // moment, and every other switch in this room fires its cue on the pointer for the same reason.
  function click() {
    if (take) return false; // he is in the air; a click at a toad in the air is not a click
    clicks++;
    ctx.pieces.sound?.play?.('croak', { pan: 0.42 }); // the press stands stage right
    if (!fallen && clicks >= CLICKS_TO_FALL) {
      fallen = true;
      take = TAKE;
      k = 0;
    } else if (!fallen) {
      take = ROCK.map((a) => ({ rock: a }));
      k = 0;
    }
    ctx.emit?.('props:peep', { clicks, fallen });
    return true;
  }

  const api = {
    get clicks() {
      return clicks;
    },
    get fallen() {
      return fallen;
    },
    // for the tools: is a take running, and which drawing is on
    get taking() {
      return !!take;
    },
    get frame() {
      return take ? k : -1;
    },
    click,
    hitBox,
    tapBox,
    // for a still and for setState: put him where he goes with no take, no cue and no waiting
    set(next) {
      fallen = !!next;
      take = null;
      k = 0;
      clicks = fallen ? CLICKS_TO_FALL : 0;
      pose(fallen ? LANDED : null);
    },
    setState(name) {
      api.set(name === 'peep-fallen');
    },
    // FOR THE TOOLS ONLY: hold drawing `i` of the fall, with no cue and no clock behind it, so the
    // whole take can be photographed one drawing at a time. A screenshot takes seconds and the take
    // takes three quarters of one, so a strip shot by waiting on the clock is a strip with six of
    // its nine drawings missing. `count` is how many there are.
    get drawings() {
      return TAKE.length;
    },
    drawing(i) {
      take = null;
      fallen = true;
      clicks = CLICKS_TO_FALL;
      pose(TAKE[Math.max(0, Math.min(TAKE.length - 1, i | 0))]);
    },
    // one drawing a step, and nothing in between: the film's own grammar, and the reason a fall
    // that lasts three quarters of a second reads as nine held drawings rather than a tween
    update(c) {
      if (!take || !c.clock.stepped) return;
      const p = take[k++];
      if (p.rock != null) rock(p.rock);
      else pose(p);
      if (p.thud) ctx.pieces.sound?.play?.('thud', { pan: 0.42 });
      if (k >= take.length) {
        take = null;
        if (fallen) pose(LANDED);
      }
    },
  };

  // The pointer belongs to the arbiter in props.js: it raycasts the drawing first, falls back to
  // the thumb's box, stops the event so flow.js does not read it as the visitor skipping a line,
  // and owns the cursor. A toad in the air says no to it; a toad on the floor says yes, and croaks.
  switches?.add?.({
    name: 'peep',
    object: () => g,
    tapBox,
    enabled: () => !take,
    onDown: () => click(),
  });

  return api;
}
