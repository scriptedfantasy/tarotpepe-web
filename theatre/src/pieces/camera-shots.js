// The named shots, written as CONTENT rather than as lenses — see camera-frame.js for the solver.
//
// Round 5, from the user, looking at the running page in a 1200×1100 window: "we're showing a lot
// of ceiling rather than the lower part of the room … we pan lower, and place the text box under
// pepe's table". Three things follow, and they are the whole of this file:
//
//  1. THE FRAME HANGS FROM THE TOP AND FILLS DOWNWARDS. Every frontal shot names the highest thing
//     that must be in it (`tops`) and the lowest (`keep`); the field opens until both are in and
//     the frame is hung from the top anchor. In the parlour there are exactly two places a top edge
//     may fall without cutting something: under the pendant's bulbs (2.45 at the table's axis,
//     which lands at 2.70 on the back wall — between the TAROT board at 2.59 and the cornice at
//     2.98) and over its ceiling rose (3.10). Round 4 took the second one for the two frontal
//     shots, and the price was the whole lower half of the room: no floor, no rug, the table's foot
//     cut off. `home` now takes the FIRST — the pendant is out of the picture, there is no ceiling
//     in it at all, and the floor, the rug, the table and its foot are in. `wide` keeps the second,
//     because a film has to show the room it is set in once, and it is the only shot that does.
//
//  2. THE CAPTION IS A BAND AT THE FOOT OF THE PICTURE, in every shot (flow.js sets the anchors).
//     So every shot reserves `pad` of its height under the lowest thing that matters — the table's
//     foot, his hands, the near edge of the fan — and the drawn placard stands in that band, on the
//     floorboards or the bare cloth, the way a subtitle stands under the picture.
//
//  3. THE WINDOW IS NOT 16:9. A fixed vertical field of view means a narrow window keeps the top
//     and bottom edges and loses the sides — which is how a wide of a parlour became a keyhole at
//     1200×1100 and how the fan ran off both sides of a phone. Every shot is solved for the aspect
//     it is being shown at: the lens opens for a narrow window, the overheads rise before they open
//     (a longer lens over a table keystones less), and where opening up would run the bottom edge
//     out into bare floorboards the top anchor moves up instead and the pendant comes back in.
import { fit, place, tanHalf } from './camera-frame.js';

// ---- the parlour, measured (metres; the room piece and the props piece own these) ----------------
const WALL = -2.5; // the back wall
const CEIL = 3.1;
const ROSE = [0, CEIL + 0.08, 0]; // over the pendant's ceiling rose
// under the pendant, at the UPSTAGE edge of its silhouette (2.45 at the far bulb): the far side of
// a hanging lamp is the part that dips lowest into a frontal frame, so that is what the edge clears
const BULB = [0, 2.43, -0.24];
const PLASTER = [0, 2.76, -2.455]; // the frieze on the back wall: rail 2.60-2.64 → cornice 2.98
const CROWN = [0, 1.37, -0.82]; // the top of his head
const SHOULDER = 0.45; // his half-width across the shoulders
const CASE = 1.02; // the bookcases' outer edge on the back wall (and their height)
const RIM = 0.62; // the table's radius; its top is at 0.76
const FOOT = [0, 0, RIM]; // where the table meets the floor, nearest the visitor
const RUG = [0, 0, 1.1]; // the rug's near edge
const DOOR = { x: 1.5, x0: 1.05, x1: 1.95, head: 2.45, board: 2.41 };
const WIN = { x: -1.5, x0: -1.95, x1: -1.05, head: 2.45 };

// a box of points: the corners of a thing, for "wholly in or wholly out"
const box = (x0, x1, y0, y1, z0, z1) => {
  const out = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) out.push([x, y, z]);
  return out;
};
// him, as the frame sees him: the shoulders and head above the table
const PEPE_BOX = box(-SHOULDER, SHOULDER, 0.76, 1.4, -1.0, -0.7);
// The squared deck on the cloth, upstage of the row: its footprint, read off the layout, because
// the reveal piece moves it between rounds and a frame edge tuned to where it used to be is worse
// than no rule at all. The overheads take it either wholly in or wholly out — never sawn in half.
const deckBox = (L) => {
  const [x, , z] = L.deck.pos;
  const c = Math.abs(Math.cos(L.deck.rotY ?? 0)), s = Math.abs(Math.sin(L.deck.rotY ?? 0));
  const w = L.spread.card.w / 2, h = L.spread.card.h / 2;
  const dx = w * c + h * s, dz = h * c + w * s;
  return { box: box(x - dx, x + dx, L.spread.y, L.spread.y + 0.04, z - dz, z + dz), near: z + dz };
};
// … and the OTHER line an overhead's top edge may fall on: just downstage of his own hands, resting
// on the far side of the cloth, which takes the deck in whole. Past it are his wrists, his arms and
// the bench, and a frame does not cut a figure.
const OVER_HANDS = -0.55;
// Tried and rejected (round 5): the same "wholly in or wholly out" treatment for the two big
// silhouettes at the ends of the back wall — the bottle cabinet and the coat on the hat stand. In a
// 1200×1100 window the frame's side edge falls through them, and taking them in costs a 22% wider
// lens, which the top anchor then pays for at the bottom: two metres of bare floorboards in front
// of the rug, or the pendant back in and the ceiling with it. A side edge running through the
// furniture at the end of a wall is what a wall does at the edge of a picture; the rule that
// matters is the one about the TOP edge and about the figure.

// ---- fitting helpers ------------------------------------------------------------------------------
// A shot whose optional groups are either wholly in the frame or wholly out of it: fit it without
// them, and refit including any group the frame has cut in half. (The door shot and Pepe: at 16:9 he
// is comfortably inside it, at 1200×1100 the frame's left edge falls down his middle, and on a phone
// he is a metre outside it. Only the middle case has to pay for him.)
function fitEither(spec, aspect) {
  const { optional = [], ...base } = spec;
  let shot = fit(base, aspect);
  if (!optional.length) return shot;
  const keep = [...(base.keep ?? [])];
  let grew = false;
  for (const group of optional) {
    const seen = group.map((p) => place(shot, aspect, p));
    const inside = (q) => Math.abs(q.u) <= 1 && Math.abs(q.v) <= 1 && q.depth > 0;
    const n = seen.filter(inside).length;
    if (n > 0 && n < seen.length) {
      keep.push(...group);
      grew = true;
    }
  }
  return grew ? fit({ ...base, keep }, aspect) : shot;
}

// An overhead (or raked) shot rises before it opens: at a fixed lens the camera climbs until the
// cloth fits, and only when it has run out of headroom — the pendant's bulbs hang at 2.45 over the
// table — does the lens open instead. A long lens over a table keystones less, and these are the
// planimetric plates of the film.
function overhead(spec, aspect) {
  const { target, deg = 90, dist, distMax = dist, fov, ...rest } = spec;
  const a = (deg * Math.PI) / 180;
  const at = (d) => [target[0], target[1] + d * Math.sin(a), target[2] + d * Math.cos(a)];
  const t0 = tanHalf(fov);
  // How far back the lens must stand for every kept point to be inside at this aspect and this
  // lens. The frame's own up vector for a rake of `deg` is (0, cos, -sin), so a point's height in
  // the picture is dy·cos − dz·sin: straight down, only the cloth's depth counts; raked, a card
  // standing on its edge counts too. `pad` is the caption's band at the foot, which the subject
  // does not get to use.
  let need = dist;
  const [ca, sa] = [Math.cos(a), Math.sin(a)];
  const room = Math.max(0.3, 1 - (rest.pad ?? 0) - 0.02);
  for (const p of rest.keep ?? []) {
    const vert = Math.abs((p[1] - target[1]) * ca - (p[2] - target[2]) * sa);
    need = Math.max(need, Math.abs(p[0] - target[0]) / (t0 * aspect * 0.96), vert / (t0 * room));
  }
  const up = deg >= 89.9 ? [0, 0, -1] : [0, 1, 0];
  let d = Math.min(need, distMax);
  const solve = (dist) => fitEither({ ...rest, pos: at(dist), look: [...target], up, minT: t0 }, aspect);
  let shot = solve(d);
  // and then back it off: whatever the lens still had to open by, the camera makes up in distance
  // until it runs out of headroom. Two passes settle it to under a degree.
  for (let i = 0; i < 3 && d < distMax - 1e-3; i++) {
    const grew = tanHalf(shot.fov) / t0;
    if (grew < 1.01) break;
    d = Math.min(distMax, d * grew);
    shot = solve(d);
  }
  return shot;
}

// ---- the shots ------------------------------------------------------------------------------------
// L is ctx.layout. Returns the whole table, solved for this window.
export function buildShots(L, aspect) {
  const zb = -L.room.depth / 2;
  const spreadY = L.spread.y;
  const [, , sz0] = L.spread.slots[1];
  const deck = L.deck.pos;
  const DECK = deckBox(L);
  const overDeck = [0, spreadY, DECK.near + 0.03]; // the top edge just downstage of the deck
  const ahead = (pos) => [pos[0], pos[1], zb];
  // a frontal shot: square to the back wall, the lens axis horizontal, framed by a rise or fall
  const flat = (pos, spec) => fitEither({ pos, look: ahead(pos), ...spec }, aspect);

  // the conversation frame, and the one the round is about. Top edge under the pendant's bulbs, so
  // there is no ceiling in it; his crown a third of the way down; the table WHOLE, its foot on the
  // floorboards at four fifths; the rug and the floor under that, where the placard stands.
  const home = flat([0, 1.62, 6.4], {
    keep: [FOOT, CROWN, [-RIM, 0.76, 0], [RIM, 0.76, 0], [-CASE, CASE, -2.4], [CASE, CASE, -2.4]],
    tops: [BULB, ROSE],
    pad: 0.2,
    floorZ: 2.15,
  });

  const shots = {
    ...L.shots,
    // the parlour, whole, and the one shot that keeps the ceiling: the pendant, the cornice, both
    // walls, the coat stand, the tiles — and now the floor and the rug as well, because the frame
    // is hung from the rose and everything under it is picture rather than plaster.
    wide: flat([0, 1.72, 6.4], {
      keep: [FOOT, [-RIM, 0.76, 0], [RIM, 0.76, 0], CROWN],
      tops: [ROSE],
      pad: 0.19,
      floorZ: 3.0,
      maxT: tanHalf(42),
    }),
    home,
    // him: head, shoulders, the open hands on the cloth, the whole of the wall he sits against.
    // The top edge in the bare plaster over the TAROT board; his hands at four fifths, and the
    // placard under them on the table's near edge.
    pepe: flat([0, 1.3, 2.9], {
      keep: [[0, 0.72, -0.4], [-0.34, 0.75, -0.45], [0.34, 0.75, -0.45], CROWN, [-SHOULDER, 1.1, -0.82], [SHOULDER, 1.1, -0.82]],
      tops: [PLASTER],
      pad: 0.17,
    }),
    // the table, frontal, the lens dropped so the cloth reads from above: the piece's own judging
    // frame. Its top edge crosses the back wall between the bookcases and the row of pictures.
    table: flat([0, 1.86, 2.55], {
      keep: [[0, 0.76, RIM], [0, 0.76, -RIM], [-0.45, spreadY, sz0], [0.45, spreadY, sz0]],
      tops: [[0, 1.45, -2.5]],
      pad: 0.14,
    }),
    // the spread: 90° down on the row of three, an even hand's breadth of cloth either side and the
    // caption's band under it.
    spread: overhead({
      target: [0, spreadY, sz0],
      dist: 1.3575,
      distMax: 1.66, // the pendant's bulbs are at 2.45; the lens stops a hair under them
      fov: 30,
      keep: [[-0.425, spreadY, 0.026], [0.425, spreadY, 0.026], [-0.425, spreadY, 0.254], [0.425, spreadY, 0.254]],
      limits: [overDeck, [0, spreadY, OVER_HANDS]],
      optional: [DECK.box],
      pad: 0.2,
    }, aspect),
    // the fan, and the row the picked cards go to: everything the visitor may click, whole, with a
    // clear band at the foot for the placard — the pick prompt stands there while they choose, and
    // a card under a caption cannot be picked.
    fan: overhead({
      target: [0, spreadY, 0.28],
      dist: 1.5575,
      distMax: 1.66,
      fov: 33,
      keep: [[-0.45, spreadY, -0.05], [0.45, spreadY, -0.05], [-0.45, spreadY, 0.64], [0.45, spreadY, 0.64]],
      limits: [overDeck, [0, spreadY, OVER_HANDS]],
      optional: [DECK.box],
      pad: 0.2,
    }, aspect),
    // the turn: the cloth from 46°, because a card standing on its edge is a hairline from straight
    // down and that is the money frame of the evening. The reveal piece's drawn hand withdraws below
    // 37°, so this angle keeps the hand in the picture too.
    turn: overhead({
      target: [0, spreadY, sz0],
      deg: 50,
      dist: 1.15,
      distMax: 2.2,
      fov: 32,
      // the standing card is the tallest thing in this frame and the reason it exists: a card held
      // on its edge at 78° reaches 22 cm off the cloth, and it is nearer the lens than the cloth line
      // the top edge is limited to, so it needs saying
      keep: [[-0.425, spreadY, 0.026], [0.425, spreadY, 0.026], [-0.425, spreadY, 0.254], [0.425, spreadY, 0.254], [0, 0.985, 0.08]],
      limits: [overDeck, [0, spreadY, OVER_HANDS]],
      optional: [DECK.box],
      pad: 0.2,
    }, aspect),
    // the riffle: the deck filling the frame while it is cut, parted and interleaved, from 58° above
    // the cloth — squared onto the deck's axis so the halves read in profile.
    riffle: overhead({
      target: [...deck],
      deg: 58,
      dist: 0.6,
      distMax: 1.15,
      fov: 32,
      keep: [
        [deck[0] - 0.2, spreadY, deck[2] - 0.17], [deck[0] + 0.2, spreadY, deck[2] - 0.17],
        [deck[0] - 0.2, spreadY, deck[2] + 0.17], [deck[0] + 0.2, spreadY, deck[2] + 0.17],
        [deck[0], 0.99, deck[2]],
      ],
      limits: [[deck[0], 0.76, -0.66]],
      pad: 0.24,
    }, aspect),
    // the deck: an insert, raked off the cloth rather than square to the wall — a level lens this
    // close to the table puts the top edge through the chest, the bookcases and him.
    deck: overhead({
      target: [...deck],
      deg: 52,
      dist: 0.44,
      distMax: 0.9,
      fov: 30,
      keep: [
        [deck[0] - 0.15, spreadY, deck[2] - 0.15], [deck[0] + 0.15, spreadY, deck[2] - 0.15],
        [deck[0] - 0.15, spreadY, deck[2] + 0.15], [deck[0] + 0.15, spreadY, deck[2] + 0.15],
      ],
      limits: [[deck[0], spreadY, deck[2] - 0.19]],
      pad: 0.22,
    }, aspect),
    // the door, on its own axis: the doormat to the VOYANTE board. He is either wholly in this
    // frame (16:9, and squarer, where the frame opens to take him) or wholly outside it (a phone,
    // where he is a metre beyond the left edge) — never cut down the middle by it.
    door: flat([DOOR.x - 0.08, 1.45, 6.0], {
      keep: [[DOOR.x, DOOR.head, -2.5], [DOOR.x0, 0.1, -2.5], [DOOR.x1, 0.1, -2.5], [DOOR.x, 0, -2.2]],
      // over the rail and the TAROT board, under the cornice: the board hangs in the middle of the
      // wall and a top edge on the door's own head would cut it in half
      tops: [[DOOR.x, 2.66, -2.5]],
      optional: [PEPE_BOX],
      pad: 0.16,
    }),
    // the window: the door's frame slid across the back wall, MIRRORED rather than solved again —
    // the lateral track runs between the two, and two frames solved separately would differ by a
    // degree of lens, which a track would play as a slow zoom.
    window: null,
    // From the threshold: the visitor's first look in, and it is `home` seen from a STANDING eye
    // height — 1.70 rather than 1.62 — because that is the difference the shot is for. The visitor
    // comes in on their feet, looks at the room, and the cut to `home` is them sitting down at the
    // table. (Round 4 made it a tighter lens from the same height instead; a tighter lens cannot
    // hold this room's top and bottom at once, so the frame's own contents pushed the top edge down
    // through the TAROT board.)
    threshold: flat([0, 1.7, 6.2], {
      keep: [FOOT, CROWN, [-RIM, 0.76, 0], [RIM, 0.76, 0]],
      tops: [BULB, ROSE],
      pad: 0.19,
      floorZ: 2.15,
    }),
  };
  // the window is the door's own frame, mirrored about the room's axis
  {
    const d = shots.door;
    shots.window = { ...d, pos: [-d.pos[0], d.pos[1], d.pos[2]], look: [-d.look[0], d.look[1], d.look[2]] };
  }

  // the three card inserts: one card, hung from the top of the frame with the cloth under it for
  // the placard. A single card is very nearly the shape of a phone, so this is the one frame that
  // gets better as the window narrows.
  L.spread.slots.forEach(([x, y, z], i) => {
    shots[`card${i}`] = overhead({
      target: [x, y, z],
      dist: 0.5575,
      distMax: 0.78,
      fov: 30,
      keep: [[x - 0.075, y, z - 0.125], [x + 0.075, y, z - 0.125], [x - 0.075, y, z + 0.125], [x + 0.075, y, z + 0.125]],
      limits: [[x, y, z - 0.15]],
      pad: 0.2,
    }, aspect);
  });
  return shots;
}
