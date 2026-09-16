// The named shots, written as CONTENT rather than as lenses. Two solvers behind them: camera-frame.js
// for the frontal shots (square to the back wall, framed by a rise of the lens) and camera-plan.js
// for the tabletop plates (square to the room's own axes, framed by where the camera stands).
//
// ROUND 9 — THE PLATE FOLLOWS THE BEAT, and the rug turns out to be 57 cm further away than this
// file thought. Three changes, and a measurement that says where each of them can possibly matter.
//
//  · THE FAN PLATE IS COMPOSED ON WHAT IS ACTUALLY ON THE CLOTH AT THAT MOMENT. Rounds 7 and 8 put
//    the three reading slots in the subject at every moment; the picked cards must be in frame, but
//    they are not in frame before they are picked, and until the first one lands that band is a
//    third of a phone screen reserved for nothing. The subject is now the spread, the occupied
//    slots join it as they fill (`also`), and the camera moves between them as each card lands
//    (camera.js). By the third the plate is byte-identical to round 8's.
//  · WITH A BAND AT THE TOP FOR THE CAPTION, which docks there for this beat and only this beat.
//    Without it the tight plate simply moves the fault: the placard would stand on the top bow of
//    the very cards it is asking the visitor to click. See CAP_BAND in camera-plan.js.
//  · AND THE RUG LINE IS THE MEASURED ONE, `props.rug.plainFrom` = 1.216, not the 0.642 derived in
//    round 6 from a rug that has since grown. That number is what forced round 8's compromise at
//    360x800 — the frame driven upstage past the `axis` line until his lap and the bench lay flat
//    across the top of a plan view. With the true line the two rules stop fighting.
//
// WHERE ANY OF IT SHOWS, swept (tools/_cam-r9-sweep.mjs). The spread is 0.634 m wide and 0.33 m
// deep — a landscape box — so in every window narrower than about 1.15:1 the plate is bound by the
// spread's WIDTH and its depth is whatever the window's shape makes of that: 1.36 m on a 390x760
// phone against a table 1.24 m across. In those windows the row costs the plate NOTHING, there is
// nothing for this round to buy, and every shot is byte-identical to round 8 (measured:
// tools/_cam-r9-vs.mjs, 390x760 and 1200x1100, at every stage). Past 1.15 the depth binds and the
// row costs up to 24 %: at 1600x900 the lens is 15.4° while the visitor is choosing against 20.3°
// with the row full, and the spread goes from 23 % of the frame's drawing to 41 %.
//
// ROUND 8 — three things, none of which needed a number in this file changed.
//
//  · THE SUBJECT SOLVES ITSELF NOW. The reveal piece published a tighter spread this round and
//    asked whether the camera followed: `tableSubject` derives |x| ≤ 0.3168, z 0.0203..0.5595 —
//    0.634 x 0.539 m — against the 0.634 x 0.540 they measured, to the millimetre, with no edit.
//    That is what round 7's move to reading the piece at runtime was for. (One disagreement, and
//    the camera is the conservative one: their reading row is |x| ≤ 0.290 and this file's is
//    0.3010, because it lays each card at ±YAW where they measured it square. A card really is
//    yawed on the cloth, so the wider box is the true one; it is 1.1 cm a side and the whole
//    subject is set by the spread anyway.)
//  · THE MARGIN IS THE ROUND'S ONE CHANGE, and it is in camera-plan.js: `mx`/`my` were fractions
//    of the half-frame in their own direction, which meant 6 px of cloth at the side of a phone
//    and 40 px at the side of a 16:9 frame. It is now MARGIN — 4.5 % of the SHORT AXIS, per side,
//    the same hand's breadth of table on every edge of every window.
//  · AND ?shot=1 DOES NOT DIVERGE. Reported this round as possibly solving a different plate from
//    the live app; measured with the same named shot at the same size with and without it, the
//    solved shots are byte-identical and the rendered frames differ by 0.00 % of their pixels at
//    390x760 and 1600x900, for fan, turn, home and wide. `shot=1` reaches this file through
//    nothing: the plates are a pure function of the layout, the aspect and the reveal piece, and
//    main.js's screenshot mode touches none of the three. What it does change is upstream of the
//    camera — no autoplay flow, so the entrance door never stands up and cuts the camera to its
//    landing pose, and reveal-fan.js seeds its shuffle from the clock instead of the seed. Two
//    different-LOOKING pictures on the same plate, which is what was seen.
//
// ROUND 7 — the user, on a very tall window: "on a very vertical screen format the cards are very
// much at the edge of the table and we're losing a lot of space on the table. maybe we can make
// them more central?" Two things were wrong and they compounded.
//
//  A. THE PLATES WERE SOLVED FROM A CONSTANT THAT NO LONGER DESCRIBED THE CLOTH. `ROW` said the
//     three slots straddled 0.85 m; the reveal piece lays them at 0.45 and publishes that as
//     `reveal.slots`. `RIBBON` described a ribbon of 21 cards; the spread is 78 in concentric bows.
//     The frame was a quarter wider than the business in it, so on a phone — where the plate is
//     width-bound — everything was a quarter smaller than it needed to be. The subject is now read
//     off the piece at runtime (`tableSubject`), so the frame follows the cards wherever they go.
//  B. AND THE SLACK WENT INTO THE FLOOR. A phone's frame is twice as tall as it is wide; the table
//     is round. Round 6 pinned the bottom edge inside the near rim and let the rest of that depth
//     run upstage, which put 18 % of the frame's height below the rim in RUG and another 9 % above
//     the far rim in bench. Now the disc takes the middle of the frame whenever the frame is deeper
//     than the table (camera-plan.js, rule 2b): at 390×760 the two rims cut the frame at the same
//     height, 1.3 % from each edge, and the table is 97 % of the frame's height with no floor in it
//     at all.
//
// ROUND 6 — the critic's two blockers, and what they cost.
//
//  A. EVERY TABLETOP SHOT WAS A CASUAL 3/4. It was not, in the arithmetic — the lens pointed
//     straight down — but the picture read as one, because the frame was hung off the table by a
//     rise of the lens until the near rim left the bottom, the rug's scroll border and the
//     letterbox band took the lower third, and what was left of the cloth read as a canted ellipse.
//     The plates are rebuilt in camera-plan.js: camera on the room's axis of symmetry, no lens rise
//     at all, the frame's own axes the room's, bottom edge pinned just inside the near rim. The row
//     of three is now parallel to the frame's top edge at every window shape, every card is square
//     to it, and what is left of the table is a symmetric arc of a true circle in the bottom
//     corners. The `turn` keeps a rake because a card reared on its edge is a hairline from
//     straight above — but a rake ABOUT THE ROOM'S X is the plan squashed, not a three-quarter.
//  B. `wide` AND `fan` DID NOT SURVIVE PORTRAIT. A frontal shot's field was solved on the vertical
//     alone, so a phone kept the whole height of the room and cropped 2.9 m off its width: the
//     parlour became a slice of bare plaster with a 40 px frog in it. Both frontal shots now have a
//     PORTRAIT COMPOSITION of their own (`tall` below): they give up the room's floor and its ends,
//     hang from the plaster or from the pendant, and let the table cut the bottom edge the way the
//     film's own kitchen table does. His head goes from a fortieth of the frame to an eighth.
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
//     cut off. (Round 6 found a third and better line for `home`: 2.63 on the table's axis, which
//     is just over the lamp's shades and lands on the top of the cornice at the wall — so the lamp
//     is in the picture and the ceiling still is not. `wide` keeps the rose, because a film has to
//     show the room it is set in once, and it is the only shot that does.)
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
import { plate, CAP_BAND } from './camera-plan.js';
// …and one shot this file does not compose: `crossroads`, where the camera stands IN the doorway
// with its back to the parlour and a drawn plate 6.28 m outside the wall fills the frame. It is
// solved by a COVER fit rather than by `fit` — the plate must never show an edge, so the lens opens
// until the sheet just covers the window instead of until the contents just fit inside it — and the
// sheet's own size is what that solver needs, so the numbers and the solver live together in
// src/pieces/egg-cross-plate.js, which holds nothing but constants and arithmetic.
import { crossroadsShot } from './egg-cross-plate.js';

// ---- the tabletop: WHAT IS ACTUALLY ON THE CLOTH (round 7) ----------------------------------------
// Round 6 wrote the business down as two constants — a row 0.85 m wide and a ribbon reaching 0.571 —
// and by the end of the round neither described anything. The reveal piece lays its row at 0.45 m
// (reveal-takes.js pulls the layout's 0.36 slots in to 0.225 and publishes the answer as
// `reveal.slots`), and its spread is 78 cards in four concentric bows, not a ribbon. A plate solved
// from the constants was 25 % wider than the cloth it was framing, which on a phone is the whole of
// the user's complaint: "the cards are very much at the edge of the table and we're losing a lot of
// space on the table."
//
// So the plates take their subject FROM THE PIECE, at runtime, every time the window changes shape:
//
//   reveal.slots                    the three reading slots, in world metres — the documented contract
//   reveal._fan.SPREAD.tiers        the bows the 78 cards lie on (r, phi, n) + SPREAD.card, .lift
//   reveal.tableBounds / .footprint / .spreadBounds / .bounds   an explicit box, if the piece ever
//                                   publishes one: {x, z0, z1} or a list of [x, z] on the cloth
//
// and fall back, in that order, to the layout's own slots and to a bow read off the card's size, so
// the camera still solves a sane frame with the reveal piece absent or half-built (the judging views
// build every piece, but ?view=camera is judged with reveal built too, and a throw here would take
// the whole page down). What each plate got is reported by `tableSubject(...).src`.
const YAW = 0.1; // the little turn a hand gives a card as it lays it (reveal-takes.js LAY_YAW ≤ 0.098)
// the four corners of a card lying at (x, z) turned by `ang`, in the cloth's own (x, z)
const cardCorners = (x, z, ang, w, h) => {
  const s = Math.sin(ang), c = Math.cos(ang), out = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) out.push([x + (a * h * s + b * w * c) / 2, z + (a * h * c - b * w * s) / 2]);
  return out;
};
// a list of points on the cloth → the box that holds them, and that box's four corners
const boxOf = (pts) => {
  const x = Math.max(...pts.map((p) => Math.abs(p[0])));
  const z0 = Math.min(...pts.map((p) => p[1])), z1 = Math.max(...pts.map((p) => p[1]));
  return { x, z0, z1, pts: [[-x, z0], [x, z0], [-x, z1], [x, z1]] };
};
const num = (v) => typeof v === 'number' && Number.isFinite(v);

export function tableSubject(L, reveal) {
  const C = L.spread.card;
  const src = [];
  // 1. THE ROW — where the three cards are actually laid.
  const slots = (Array.isArray(reveal?.slots) && reveal.slots.length && reveal.slots.every((s) => Array.isArray(s) && s.length >= 3 && s.every(num)))
    ? (src.push('reveal.slots'), reveal.slots)
    : (src.push('layout.slots'), L.spread.slots);
  // …slot by slot as well as all together, because a slot only belongs in the picture once there is
  // a card standing in it (round 9).
  const rows = slots.map(([x, , z]) => [...cardCorners(x, z, YAW, C.w, C.h), ...cardCorners(x, z, -YAW, C.w, C.h)]);
  const rowPts = rows.flat();
  // 2. THE SPREAD — the 78 cards, from whatever the piece is willing to say about them.
  let spreadPts = null;
  const stated = reveal?.tableBounds ?? reveal?.footprint ?? reveal?.spreadBounds ?? reveal?.bounds;
  if (Array.isArray(stated) && stated.length && stated.every((p) => Array.isArray(p) && p.length >= 2 && num(p[0]) && num(p[1]))) {
    spreadPts = stated.map((p) => [p[0], p[1]]);
    src.push('reveal box (points)');
  } else if (stated && num(stated.x) && num(stated.z0) && num(stated.z1)) {
    spreadPts = [[-stated.x, stated.z0], [stated.x, stated.z0], [-stated.x, stated.z1], [stated.x, stated.z1]];
    src.push('reveal box');
  } else {
    const S = reveal?._fan?.SPREAD;
    const tiers = Array.isArray(S?.tiers) ? S.tiers.filter((t) => num(t?.r) && num(t?.phi) && t.n >= 1) : [];
    if (tiers.length) {
      const card = num(S.card?.w) && num(S.card?.h) ? S.card : C;
      const lift = num(S.lift?.z) ? S.lift.z : 0;
      spreadPts = [];
      for (const t of tiers) {
        for (let j = 0; j < t.n; j++) {
          const a = t.n > 1 ? -t.phi + (j * 2 * t.phi) / (t.n - 1) : 0;
          const cs = cardCorners(t.r * Math.sin(a), t.r * Math.cos(a), a, card.w, card.h);
          // …and the same card lifted: the hover slides it UP the frame (the user's rule), so it
          // reaches `lift` further upstage than it rests, and the frame has to hold it there too.
          for (const c of cs) spreadPts.push(c, [c[0], c[1] - lift]);
        }
      }
      src.push(`reveal bows (${tiers.length}×, ${tiers.reduce((n, t) => n + t.n, 0)} cards)`);
    }
  }
  if (!spreadPts) {
    // no piece to ask: one bow of cards laid round the row, which is what the spread has always been
    const r = 0.452;
    spreadPts = [];
    for (const a of [-0.75, -0.375, 0, 0.375, 0.75]) spreadPts.push(...cardCorners(r * Math.sin(a), r * Math.cos(a), a, C.w, C.h));
    src.push('fallback bow');
  }
  const row = boxOf(rowPts), spread = boxOf(spreadPts);
  return { row, rows, spread, all: boxOf(rowPts.concat(spreadPts)), slots, src: src.join(' + ') };
}

// The pin: how far downstage the bottom edge of a plate may reach ON THE CLOTH. The rim is at 0.62,
// so 0.596 stops the edge 2.4 cm SHORT of it: at the middle of the frame the picture is cloth all
// the way down, and the rim only comes in at the two bottom corners, where it reads as what it is —
// the near side of a round table curving away. A centimetre or two further and the rug's border
// follows it in, which is the band the critic saw cutting the lower third.
//
// Round 7: the pin holds wherever the frame is SHALLOWER than the table. Where it is deeper — a
// phone held upright, where the frame is twice as tall as it is wide — nothing keeps a frame that
// deep on the cloth, and honouring the pin spends the whole difference at the top of the picture
// (16 cm of bench upstage of the far rim) while the near rim still sits 18 % of the frame's height
// from the bottom edge. See `centre` in camera-plan.js: past that point the table's own disc takes
// the middle of the frame and the two rims cut it at the same height.
const PIN = 0.596;
// And the last line before anything is PRINTED ON THE RUG. A plate may show the rim curving away
// over bare ground; what it may not show is the rug's scroll border — a hard black double rule with
// a running scroll and a comb of fringe — coming across its foot, because at that moment the
// picture stops being a plan of a table and becomes a plan of a rug with a table on it.
//
// ROUND 9: props publishes the line, and it is 57 cm further from the table than this file thought.
// `props.rug.plainFrom` is measured off the drawn sheet itself (tools/_props-r5-edge.mjs) and quoted
// 3 mm inside it: 1.216 today, from a rug whose near edge is at 1.66 with a 0.438 border. The 0.642
// below was derived in round 6 from a rug that reached 1.1 and has been wrong ever since — and it
// was wrong in the expensive direction. It is what forced round 8's compromise on a 360x800 phone,
// where honouring it drove the top edge to z −0.86, past the `axis` line, and laid his lap and the
// bench flat across the top of a plan view. With the true line the two rules stop fighting: the
// frame keeps every printed mark out AND stops short of him. Kept only as the fallback for a props
// piece that failed to build.
const RUGLINE = 0.642;
const rugLineOf = (props) => (num(props?.rug?.plainFrom) ? props.rug.plainFrom : RUGLINE);
// The turn's rake: 68° above the cloth in a landscape window, steepening toward the plan as the
// window narrows (at 0.51 — a phone held upright — 78°, where the standing card still shows two
// fifths of its face). The reveal piece's hand withdraws below 37°, so every value here keeps it.
const TURN_RAKE = (aspect) => Math.min(78, 68 + Math.max(0, 1.2 - aspect) * 15);

// ---- the parlour, measured (metres; the room piece and the props piece own these) ----------------
const WALL = -2.5; // the back wall
const CEIL = 3.1;
const ROSE = [0, CEIL + 0.08, 0]; // over the pendant's ceiling rose
// under the pendant, at the UPSTAGE edge of its silhouette (2.45 at the far bulb): the far side of
// a hanging lamp is the part that dips lowest into a frontal frame, so that is what the edge clears
const BULB = [0, 2.43, -0.24];
// … and the line just OVER it: the petal shades bottom out at 2.47 and the arms at 2.56, so an edge
// at 2.60 on the table's axis has the whole lamp in the picture with its rod running out of the top.
// Carried back to the wall (1.38× the distance) it lands at 2.98 — the top of the cornice — so the
// same edge is clean at both depths and there is still no ceiling in the shot.
const LAMP = [0, 2.63, 0];
const PLASTER = [0, 2.76, -2.455]; // the frieze on the back wall: rail 2.60-2.64 → cornice 2.98
const CROWN = [0, 1.37, -0.82]; // the top of his head
const SHOULDER = 0.45; // his half-width across the shoulders
const CASE = 1.02; // the bookcases' outer edge on the back wall (and their height)
const RIM = 0.62; // the table's radius; its top is at 0.76
const FOOT = [0, 0, RIM]; // where the table meets the floor, nearest the visitor
const RUG = [0, 0, 1.1]; // the rug's near edge
const DOOR = { x: 1.5, x0: 1.05, x1: 1.95, head: 2.45, board: 2.41 };
// THE FIREPLACE on the stage-left wall, room.js's own numbers (it publishes them as
// `room.fireplace` and this file may not ask the room piece anything: it is handed the layout and
// the props piece and nothing else). The breast stands z −0.60 .. 0.50 with its face 240 mm proud
// of the plaster at x −2.36; the mantel is a 40 mm shelf at 1.22 oversailing 60 mm each way; the
// opening is 0.62 x 0.66 centred on the breast at z −0.05. Nothing stands on the mantel and the
// plaster over it is bare to the picture rail at 2.60, so a top edge may fall anywhere between.
const FIRE = { wall: -2.6, face: -2.36, z0: -0.6, z1: 0.5, mantel: 1.22, mid: -0.05, open: { z0: -0.36, z1: 0.26, y0: 0.2, y1: 0.86 } };
// THE TALL CASE on the back wall, props.js's own numbers (props.js CASE): the carcase stands
// x −2.10 .. −1.06 on a 70 mm plinth, 2.45 to the top board, 260 mm deep with its back flush with
// the skirting — so its front face is at z −2.20 and its lining at −2.46. The picture rail starts
// at 2.60 and there is 150 mm of papered field over the top board.
const TALL_CASE = { x0: -2.1, x1: -1.06, front: -2.2, top: 2.45, plinth: 0.07, boards: [0.52, 0.97, 1.442, 2.114] };
// THE SPINET under the wide window (src/pieces/props-piano.js PIANO): the case z −2.10 .. −0.72 at
// x −2.564 .. −2.144, 0.98 tall; the white keys at 0.66 reaching out to −1.994; the keyboard itself
// z −2.02 .. −0.80, which is the 1.22 m of it that has keys on it.
// THE READING TABLE, stage right where the palm stood (src/pieces/props-table.js TABLE): a top
// 0.54 by 0.64 at x 1.98 .. 2.52, z −0.62 .. 0.02, standing at 0.72, with the book lying face up in
// the middle of it — 0.17 across by 0.24 along, 45 mm thick.
const READING = { x0: 1.98, x1: 2.52, z0: -0.62, z1: 0.02, top: 0.72, bx: 0.17, bz: 0.24 };
READING.cx = (READING.x0 + READING.x1) / 2;
READING.cz = (READING.z0 + READING.z1) / 2;
const SPINET = { back: -2.564, front: -2.144, keysOut: -1.994, z0: -2.1, z1: -0.72, top: 0.98, keyY: 0.66, kz0: -2.02, kz1: -0.8 };

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

// ---- the shots ------------------------------------------------------------------------------------
// L is ctx.layout; `reveal` is ctx.pieces.reveal, which the plates read their subject off (it is
// built before the camera, and the camera re-reads it on every reframe). Returns the whole table,
// solved for this window.
export function buildShots(L, aspect, reveal = null, opts = {}) {
  const zb = -L.room.depth / 2;
  const spreadY = L.spread.y;
  const [, , sz0] = L.spread.slots[1];
  const deck = L.deck.pos;
  const DECK = deckBox(L);
  const SUB = tableSubject(L, reveal);
  const ROW = SUB.row.pts;
  const CLOTH = SUB.all.pts;
  const RUGZ = rugLineOf(opts.props);
  // HOW MANY CARDS ARE STANDING IN THE READING ROW. The camera piece counts them (it can see the
  // cloth); this file only has to know, because the row is only part of the fan's picture once
  // there is something in it. Falls back to the piece's own contract — `reveal.picks` — so a probe
  // that imports this file with nothing but a reveal object still solves the frame the app does.
  const LAID = Math.max(0, Math.min(SUB.rows.length, Math.round(opts.laid ?? (reveal?.picks?.length ?? 0))));
  const PICKED = SUB.rows.slice(0, LAID).flat();
  const CHOOSING = LAID < SUB.rows.length;
  const ahead = (pos) => [pos[0], pos[1], zb];
  // a frontal shot: square to the back wall, the lens axis horizontal, framed by a rise or fall
  const flat = (pos, spec) => fitEither({ pos, look: ahead(pos), ...spec }, aspect);

  // THE CONVERSATION FRAME. Round 6 changes two things about it, both from the critic.
  //
  //  · THE LAMP IS IN IT. The pendant is the only drawn light source in the room and the film's
  //    kitchen frame hangs one dead centre over the table; round 5 put the top edge exactly on its
  //    bulbs, which is a hair's breadth from having it and not having it. The anchor is now LAMP —
  //    2.60 on the table's axis — which clears the petals (2.56) and, carried back to the wall at
  //    1.38 times the distance, lands on the top of the cornice at 2.98. So the edge falls on a
  //    clean line at both depths: the shades hang into the picture, the rod runs out of the top of
  //    it and there is still no ceiling in the shot.
  //  · AND THERE IS LESS BARE FLOOR UNDER IT. `pad` was a fifth of the frame's height reserved
  //    below the table's foot for the placard; a fifth of this frame is 60 cm of floorboards and
  //    the placard is an eighth of it. 0.12, and `floorZ` with it, so the bottom edge crosses the
  //    boards just in front of the rug instead of a metre in front of it.
  //
  // In a window narrower than it is tall none of that survives: the room cannot be shown at all
  // (a phone crops the wall to 2.3 m of its 5.2) and the shot's business is his face and the cloth,
  // so the frame gives up the room's floor and the bookcases, hangs from the plaster over the TAROT
  // board, and lets the table cut the bottom edge the way the film's own kitchen table does. His
  // head goes from a fortieth of the frame's height to an eighth.
  const tall = aspect < 1.05;
  const home = flat([0, 1.62, 6.4], tall
    ? {
      keep: [CROWN, [-RIM, 0.76, RIM], [RIM, 0.76, RIM], [-SHOULDER, 1.1, -0.82], [SHOULDER, 1.1, -0.82]],
      tops: [PLASTER],
      pad: 0.13,
    }
    : {
      keep: [FOOT, CROWN, [-RIM, 0.76, 0], [RIM, 0.76, 0], [-CASE, CASE, -2.4], [CASE, CASE, -2.4]],
      tops: [LAMP, ROSE],
      pad: 0.12,
      floorZ: 1.8,
    });

  const shots = {
    ...L.shots,
    // the parlour, whole, and the one shot that keeps the ceiling: the pendant, the cornice, both
    // walls, the coat stand, the tiles — and now the floor and the rug as well, because the frame
    // is hung from the rose and everything under it is picture rather than plaster.
    // … and in a window narrower than it is tall it stops pretending. A phone crops this wall to
    // 2.3 m of its 5.2, so the parlour is not in the picture whatever the lens does, and holding
    // the ceiling as well leaves the room a small rectangle with a hand's depth of blank plaster
    // over it and half a metre of blank floorboards under it. Portrait keeps the pendant — the one
    // thing that says "a room" — and gives up the floor: the table cuts the bottom edge.
    wide: flat([0, 1.72, 6.4], tall
      ? {
        keep: [[-RIM, 0.76, RIM], [RIM, 0.76, RIM], CROWN, [-SHOULDER, 1.1, -0.82], [SHOULDER, 1.1, -0.82]],
        tops: [LAMP, ROSE],
        pad: 0.06,
      }
      : {
        keep: [FOOT, [-RIM, 0.76, 0], [RIM, 0.76, 0], CROWN],
        tops: [ROSE],
        pad: 0.15,
        floorZ: 2.6,
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
      keep: [[0, 0.76, RIM], [0, 0.76, -RIM], [-SUB.row.x, spreadY, sz0], [SUB.row.x, spreadY, sz0]],
      tops: [[0, 1.45, -2.5]],
      pad: 0.14,
    }),
    // THE PLATES. Dead plan (or, where something stands up off the cloth, a rake about the room's
    // own x axis, which is the same picture squashed — see camera-plan.js), camera on the room's
    // axis of symmetry, no lens rise. Their subject is `SUB`, read off the reveal piece; their
    // bottom edge is pinned at the rim, and where the window is so tall that the frame is deeper
    // than the table itself, the table's disc takes the middle of the frame instead and the rug
    // line holds the foot (camera-plan.js, rules 2, 2b and `floor`).
    //
    // the spread: the row of three, and nothing but cloth around it. It holds the smallest subject
    // of the three plates (0.60 x 0.24 — the row alone), so it is also the one that stays inside
    // the rim longest: at 390×760 the whole frame is table, and only past an aspect of about 0.48
    // does the disc stop covering it.
    spread: plate({
      y: spreadY,
      subject: ROW,
      whole: [DECK.box],
      bottom: PIN,
      centre: 0,
      disc: RIM,
      floor: RUGZ,
      axis: -0.78,
      dist: 1.28,
      distMax: 1.66, // the pendant's bulbs hang at 2.45; the lens stops a hair under them
      fov: 30,
      pad: 0.08,
    }, aspect),
    // THE FAN, AND THE PLATE THAT FOLLOWS THE BEAT (round 9). Everything the visitor may click,
    // whole and symmetric about the frame's vertical axis, with the near rim of the table closing
    // the two bottom corners — but WHAT IS IN THE PICTURE CHANGES AS THE BEAT DOES, because the
    // three reading slots are a third of a phone's screen reserved for nothing until a card lands
    // in one.
    //
    // Rounds 7 and 8 put the reading row in the subject at every moment, and they were right to:
    // the reveal builder asked for it, and the three picked cards must be in frame. But they are
    // not in frame before they are picked. So the plate is composed on the SPREAD, the row's slots
    // join it one at a time as they fill (`also` — they have to be in the picture, they are not
    // what it is composed on), and by the third card the plate is what round 8 left. The camera
    // piece moves between them over a third of a second as each card lands: the landing is the
    // motivation and the move is the camera answering it.
    //
    // The other half of the same beat is the caption. It docks to the TOP while the visitor is
    // choosing (the user's exception) and comes back to the foot the moment the third card is
    // taken, so this plate moves its own reserved band with it: `capTop` above while choosing,
    // `pad` at the foot once the reading row is full. The placard is opaque and the spread is what
    // the visitor has to click; the band is what keeps the one off the other.
    //
    // What it is worth, measured: at 1600x900 the lens goes from 20.3° to 16.6° with the row empty
    // — the spread's box from 33 % of the frame's area to 51 % — and opens back to 20.3° over the
    // three picks. In any window narrower than about 1.15:1, INCLUDING EVERY PHONE, it changes
    // nothing at all and cannot: the spread is 0.634 m wide, so a 390x760 frame that holds it with
    // a margin is 1.36 m deep whatever else is in the shot, and the depth of the subject never
    // binds. On a phone the plate has one degree of freedom, where those 1.36 m sit on the cloth,
    // and the table's own disc has taken it since round 7.
    fan: plate({
      y: spreadY,
      subject: CHOOSING ? SUB.spread.pts : CLOTH,
      also: CHOOSING ? PICKED : [],
      capTop: CHOOSING ? CAP_BAND : null,
      whole: [DECK.box],
      bottom: PIN,
      centre: 0,
      disc: RIM,
      axis: -0.78,
      dist: 1.36,
      distMax: 1.66,
      fov: 30,
      pad: CHOOSING ? 0 : 0.06,
      floor: RUGZ,
    }, aspect),
    // THE TURN, and the round's one deliberate compromise. The critic's rule is plan or straight-on,
    // nothing between; the reveal builder's rule is that a card reared on its edge is a hairline
    // from straight above and his drawn hand leaves the cloth below a 37° rake. Both are right, and
    // what reconciles them is that a rake ABOUT THE ROOM'S X AXIS is not a three-quarter at all: it
    // is the same plan squashed. A plane photographed square-on is an affine image of itself, so at
    // 68° the row of three is still parallel to the frame's top edge, the cards are still square to
    // it, the table's rim is still an axis-aligned ellipse — 0.93 of a circle — and the picture is
    // the plan with its z compressed by a fourteenth. What a three-quarter does, and what round 5's
    // frames did, is leave the axis of symmetry: then the ellipse tips, the row runs diagonally and
    // the near rim wanders out of a corner. This one never leaves it.
    // The angle is the card's, not the frame's: at 68° a card held on its edge at 78° shows 0.59 of
    // its face, which is a card standing up rather than a hairline. It steepens on a narrow window,
    // where the frame is already three times deeper than the row and every degree off the plan
    // costs another hand's breadth of floorboards at the foot.
    turn: plate({
      y: spreadY,
      deg: TURN_RAKE(aspect),
      subject: ROW,
      // the standing card is the tallest thing in this frame and the reason it exists: a card held
      // on its edge at 78° reaches 22 cm off the cloth, and it is nearer the lens than the cloth.
      // One at every slot the piece actually lays a card in, so this follows the row too.
      rise: SUB.slots.flatMap(([sx, sy, sz]) => [
        [sx - L.spread.card.w / 2, sy + L.spread.card.h * Math.sin((78 * Math.PI) / 180), sz - 0.06],
        [sx + L.spread.card.w / 2, sy + L.spread.card.h * Math.sin((78 * Math.PI) / 180), sz - 0.06],
      ]),
      whole: [DECK.box],
      bottom: PIN,
      centre: 0,
      disc: RIM,
      floor: RUGZ,
      axis: -0.78,
      dist: 1.2,
      distMax: 1.9,
      fov: 30,
      pad: 0.08,
    }, aspect),
    // the riffle: the deck filling the frame while it is cut, parted and interleaved, raked 62° so
    // the halves read in profile.
    //
    // Round 6 stood this plate at x = 0.30, INBOARD of a deck that stood at x = 0.38, because a
    // frame centred on the deck itself ran off the table on the outboard side. The deck has since
    // come to the middle of the cloth (layout: [0, 0.44], the move that got it away from the wine
    // bottle) and the offset stayed behind — so the plate was aiming a third of a metre off its own
    // subject, and to hold it the lens opened to 29° at 16:9 and 109° on a phone, which is a
    // fisheye pointed at bare cloth. The axis follows the deck now, which also puts it back on the
    // room's axis of symmetry: an insert of a thing standing in the middle of a round table wants
    // to be exactly as symmetric as the fan does.
    riffle: plate({
      y: spreadY,
      x: deck[0],
      deg: 62,
      subject: [
        [deck[0] - 0.17, deck[2] - 0.15], [deck[0] + 0.17, deck[2] - 0.15],
        [deck[0] - 0.17, deck[2] + 0.15], [deck[0] + 0.17, deck[2] + 0.15],
      ],
      rise: [[deck[0], 0.95, deck[2]]],
      bottom: PIN,
      dist: 0.62,
      distMax: 1.2,
      fov: 30,
      pad: 0.06,
    }, aspect),
    // the deck at rest: the same insert, tighter, for the detail cuts between turns.
    deck: plate({
      y: spreadY,
      x: deck[0],
      deg: 62,
      subject: [
        [deck[0] - 0.13, deck[2] - 0.14], [deck[0] + 0.13, deck[2] - 0.14],
        [deck[0] - 0.13, deck[2] + 0.14], [deck[0] + 0.13, deck[2] + 0.14],
      ],
      bottom: PIN,
      dist: 0.46,
      distMax: 0.95,
      fov: 30,
      pad: 0.06,
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
    // THROUGH the door, which is the one shot in the film that is not in the room. The cross over
    // the door lets the weather in, the leaf swings, and two drawings later the room cuts here: the
    // camera standing in the opening at 1.45 m, looking straight out along its own centre line, and
    // a drawn plate 6.28 m away filling the frame with a crossroads. Solved for the window by a
    // cover fit (egg-cross-plate.js) — 29.7 deg at 16:9, 44.7 on a phone held upright — so the
    // sheet's edges cannot appear at any shape. Nothing of the parlour is in it: the lining stands
    // two centimetres behind the lens.
    crossroads: crossroadsShot(aspect),
    // THE SHELF END OF THE BACK WALL: the door's frame slid across it, MIRRORED rather than solved
    // again — the lateral track runs between the two, and two frames solved separately would differ
    // by a degree of lens, which a track would play as a slow zoom.
    // IT IS NAMED FOR WHAT IS IN IT AND HAS BEEN RENAMED TWICE FOR THAT REASON. It was `window`
    // until the user had the window taken out of the back wall, then `cart` for the test table that
    // stood there, and the cart has gone the same way ("remove the thing in front of the
    // bookshelf"). What the frame holds now is the TALL CASE — three bays of books with the radio
    // and the VIN bottle among them — the radiator under it and the clock on the plaster to its
    // right. Everything that names a shot names this one `shelf`: camera.js's track, flow.js and
    // dialogue.js's lists, and tools/_shelf-where.mjs.
    shelf: null,
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

    // ---- THE THREE PLACES THE VISITOR MAY WALK TO (src/pieces/walk.js) ------------------------
    // The user: "the user should be able to walk in front of the fireplace and watch the fire. or
    // walk up to the door and open it. Also the user should be able to walk up to the bookshelf and
    // open books." Three frames, and they keep this file's own grammar rather than inventing one:
    // the lens axis is HORIZONTAL and SQUARE to the wall the thing stands on (the back wall for two
    // of them, the stage-left wall for the fireplace — a side wall is a wall), the frame is hung by
    // a rise of the lens and never by a tilt, and every one of them is a LONG lens pulled back.
    //
    // WHY THE DOOR'S IS CALLED `doorway`. `door` is taken, by the frontal of the whole doorway from
    // 8.5 m back that the closing card cuts to and the lateral track runs to (dialogue.js and
    // flow.js name it, and its geometry may not move). This is a different frame of the same thing:
    // the visitor standing at it rather than looking across the room at it.
    //
    // WHAT THEY SOLVE TO, measured with tools/_walk-geom.mjs at four window shapes:
    //                 1280x800 · 1600x900 · 1200x1100      390x844
    //   fireplace     30.2 deg, rise 0.409                 28.5 deg, rise 0.403
    //   doorway       35.0 deg, rise 0.123                 35.0 deg, rise 0.123
    //   case          15.6 deg, rise 0.040                 24.5 deg, rise 0.040
    // Two of the three are the SAME LENS at every shape and that is not luck: the doorway holds an
    // opening 0.90 m wide against 2.45 high and the fireplace's portrait composition (below) gives up
    // the breast's two returns, so in both the HEIGHT binds however narrow the window gets. The case
    // is the one that changes, and it changes the other way about — a phone is bound by its 1.04 m
    // of WIDTH and opens to 24.5 deg, which is what puts nearly the whole carcase on a phone and
    // only three bays of it on a laptop.
    // Their positions are all clear of the table (radius 0.62 about the origin) and of him: the
    // nearest any of them stands to the cloth is the fireplace's 1.30 m of x.
    //
    // THE FIREPLACE, FROM ACROSS THE TABLE. There is nowhere to stand between the table and the
    // chimneypiece — at the breast's own centre line (z −0.05) the cloth reaches x −0.619, and a
    // camera in the 1.74 m left over is a 64 deg lens against a wall. So the frame is taken from
    // the OTHER side of the room on the same centre line, 3.66 m out, which is a long lens square to
    // the stage-left wall and the same manners every other shot in this file has.
    // THE EYE IS AT 1.62 AND THE REASON IS THE TABLE. The line from here to the firebox floor at
    // y 0.20 crosses the table's far rim (x −0.619, 52 % of the way) at y 0.876 — 116 mm over the
    // cloth. At 1.45 it clears by 34 mm and at 1.30 it does not clear at all: the table takes the
    // grate. The hearth slab (0 .. 0.055) is behind the table at every eye height, which is what a
    // table in front of a fire does, and the fire itself is wholly in the picture.
    fireplace: (() => {
      const P = [1.3, 1.62, FIRE.mid];
      const look = [FIRE.wall, 1.62, FIRE.mid];
      const O = FIRE.open;
      const chimney = [
        [FIRE.face, O.y0, O.z0], [FIRE.face, O.y0, O.z1],
        [FIRE.face, O.y1, O.z0], [FIRE.face, O.y1, O.z1],
        [FIRE.face, FIRE.mantel, O.z0 - 0.1], [FIRE.face, FIRE.mantel, O.z1 + 0.1],
      ];
      return fitEither({
        pos: P,
        look,
        // THE WHOLE BREAST IN A WINDOW THAT HAS ROOM FOR IT; THE CHIMNEYPIECE ALONE IN ONE THAT
        // HAS NOT. The breast is 1.22 m across its mantel and 3.66 m from the lens, so holding it
        // whole in a portrait frame costs 36.5 deg — the width binding on a frame a phone makes
        // 0.462 as wide as it is tall. Giving up the two returns and keeping the opening, the
        // mantel over it and a hand's breadth either side brings it back to 28.5, which is the
        // lens the landscape frame happens to want anyway. Either way the firebox is the business
        // and it is whole.
        keep: aspect < 1.05 ? chimney : [...chimney, [FIRE.face, 0.1, FIRE.z0 - 0.06], [FIRE.face, 0.1, FIRE.z1 + 0.06], [FIRE.face, FIRE.mantel + 0.04, FIRE.z0 - 0.06], [FIRE.face, FIRE.mantel + 0.04, FIRE.z1 + 0.06]],
        // over the mantel, in the bare plaster the user's own note keeps empty: the shelf tops out
        // at 1.26 and the picture rail starts at 2.60, so 1.80 is a clean line at this depth and
        // there is half a metre of paper over the mantel, which is what a mantel wants over it.
        tops: [[FIRE.face, 1.8, FIRE.mid]],
        pad: 0.14,
      }, aspect);
    })(),
    // THE DOORWAY, FROM THE THRESHOLD SIDE. 5.10 m back from the wall on the door's own centre
    // line: far enough that the leaf swinging 100 deg into the room stays in the frame, near enough
    // that the opening is four fifths of the picture's height. The top edge is the `door` shot's
    // own line — 2.66, over the rail and the VOYANTE board, under the cornice — so the two frames
    // of this door agree about where the wall stops.
    doorway: flat([DOOR.x, 1.45, 2.6], {
      keep: [[DOOR.x0, 0.06, -2.5], [DOOR.x1, 0.06, -2.5], [DOOR.x0, DOOR.head, -2.5], [DOOR.x1, DOOR.head, -2.5], [DOOR.x, 0, -2.16]],
      tops: [[DOOR.x, 2.66, -2.5]],
      pad: 0.14,
    }),
    // THE TALL CASE, SQUARE ON, AND IT HOLDS THE BAYS A HAND REACHES AND NOT THE WHOLE CARCASE.
    // 5.40 m back on the case's own centre line (x −1.58), which is clear of the table by 2.11 m and
    // of him by 1.58.
    //
    // WHY NOT THE WHOLE CASE, which is what this shot held first. A frame's width is 2·t·d·A and
    // its height 2·t·d, so an object 1.04 m wide and 2.38 m tall CANNOT fill a landscape frame in
    // both directions: holding all of it at 16:10 leaves the case 23 % of the picture's width with
    // two metres of parlour either side, and its spines 17 px across. The case's own height is the
    // thing to give up, because two of its five bays are out of a standing hand's reach anyway —
    // the jars' bay is at ankle height and the top bay is at 2.11. So the frame holds 0.45 to 1.75:
    // the cat's bay, the bottle bay and the foot of the set's bay, which is every bay a visitor
    // could take a book out of. It goes from 23 % of the width to 43 %, and a 60 mm spine from
    // 17 px to 32.
    //
    // WHAT A SPINE MEASURES HERE, which is the number the books are clickable by:
    //   1280x800   the frame holds 1.51 m → 529 px to the metre → a 60 mm spine is 32 px across
    //              and a 0.25 m book 132 px tall
    //   390x844    the WIDTH binds instead (1.04 m against a frame 0.462 as wide as it is tall),
    //              so the case fills the phone from side to side and the frame grows to 2.34 m of
    //              height — 360 px to the metre, a 22 px spine, and very nearly the whole case in
    //              the picture. A phone sees MORE of this case than a laptop does, which is the
    //              same trade every portrait composition in this file makes.
    // Both are under a thumb's 44 px, so the four spines that open are given the arbiter's own
    // grown box, and a pointer actually on one of them hits the drawing (props.js, THE SWITCHES).
    // THE READING TABLE, FROM STRAIGHT ABOVE IT. The user: "the viewer basically moves to the table
    // and looks down on the book and can look through it." So this is a PLAN — the one shot outside
    // the tabletop plates that is one — with the lens on the table's own axis, no rise at all, and
    // the frame's own axes the room's. `up` is the room's −z, which puts the book's long side down
    // the frame: a book on a table is read down the page, not across it.
    //
    // 1.53 m over the top, which at 16:10 is a 26 deg lens and on a phone a 41. What binds is not
    // the same thing at the two shapes and that is why the composition changes: a landscape frame is
    // bound by the table's 0.64 m ALONG the wall (the frame's vertical) and holds the whole piece of
    // furniture; a portrait one would be bound by its 0.54 m of depth in a frame 0.462 as wide as it
    // is tall, and holding the whole table there costs 55 deg of lens pointed at a tabletop. So a
    // narrow window composes on the BOOK and a hand's breadth of table round it instead, and the
    // book goes from a fifth of the frame's height to two thirds of it.
    //
    // AND IT IS CALLED `reading`, NOT `table`. There is already a shot called `table` in this file
    // (line 432): the frontal one of HIS table that the whole reading is played on, and reveal.js
    // judges eight of its ten states against it by name. The first cut of this round called this
    // one `table` too, and since both are keys of one object literal the later simply replaced the
    // earlier — every card shot in the room silently became a plan of a book on a side table. The
    // PLACE in walk.js keeps the name `table`, which is what a visitor would call the thing; the
    // shot is named for what the visitor does there.
    reading: (() => {
      const pos = [READING.cx, READING.top + 1.53, READING.cz];
      const look = [READING.cx, READING.top, READING.cz];
      const bx = READING.cx + 0.01, bz = READING.cz - 0.01;
      // THE FRAME IS COMPOSED ON THE BOOK and not on the table, at both shapes — the user asked to
      // LOOK DOWN ON THE BOOK, and a plan of the whole piece of furniture puts it at a tenth of the
      // picture with half a square metre of empty top round it (measured: 200 x 280 px of a
      // 1280 x 800 frame, 9 % of its area). What changes with the shape is only how much table is
      // left round it: a hand's breadth on a laptop, 30 mm on a phone, where the frame is
      // 0.462 as wide as it is tall and every millimetre of margin costs the book's own height.
      const m = aspect < 1.05 ? 0.03 : 0.105;
      const keep = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) keep.push([bx + sx * (READING.bx / 2 + m), READING.top, bz + sz * (READING.bz / 2 + m)]);
      return fitEither({ pos, look, up: [0, 0, -1], keep, pad: 0.05 }, aspect);
    })(),
    // THE PIANO, FROM OVER THE KEYBOARD, which is the shot the user asked for in so many words: "i
    // think it'd be funny if we see a piano from above and see pepe's hand play a song."
    //
    // It is the one shot in this film that is neither square to a wall nor a plan. The lens stands
    // 1.73 m out from the keys on their own centre line and looks DOWN at 46 degrees — steep enough
    // that the 88 keys read as 88 keys and not as a grey band, shallow enough that the fall behind
    // them and the music desk over that are still in the picture and the thing is legible as a
    // piano. A true plan would be the honest room grammar and it would also be a sliver: the
    // keyboard is 1.22 m long and 0.15 deep, so straight down it is a strip 8:1.
    //
    // AND THE FRAME TURNS ON ITS SIDE FOR A NARROW WINDOW, which is the one thing that makes this
    // shot work on a phone. The keyboard runs along the room's z; with the ordinary up that is the
    // frame's WIDTH, and 1.22 m of width at 1.73 m out is 39 degrees at 16:10 and 77 on a phone — a
    // fisheye pointed at a wall. So a portrait window gets `up` along the room's −z and the keyboard
    // runs DOWN the screen instead of across it: 27 degrees, the whole board, and the bass at the
    // foot where the left hand is. It is the same trick the portrait compositions in this file make
    // for the parlour, made with the frame's own axes instead of with its contents.
    piano: (() => {
      const mz = (SPINET.z0 + SPINET.z1) / 2;
      // 2.20 m out on the keys' own centre line, at 46 degrees above them — which puts the lens at
      // y 2.29, well under the 3.10 ceiling and 0.74 m clear of the pendant's own spread at x 0.
      // It was 1.73 m for one pass and a phone paid 51.5 degrees for it; at 2.20 the same frame is
      // 41.5, and a laptop's goes from 32.3 to 26.6, which is this film's kind of lens.
      const look = [-2.25, 0.7, mz];
      const pos = [look[0] + 1.524, look[1] + 1.587, mz];
      // the whole board, its far corner and the fall behind it: the four corners of the keys, the
      // two ends of the fall's top edge, and the music desk's own line over that
      const keep = [
        [SPINET.keysOut, SPINET.keyY, SPINET.kz0], [SPINET.keysOut, SPINET.keyY, SPINET.kz1],
        [SPINET.front, SPINET.keyY, SPINET.kz0], [SPINET.front, SPINET.keyY, SPINET.kz1],
        [SPINET.front + 0.03, SPINET.keyY + 0.22, SPINET.z0 + 0.02], [SPINET.front + 0.03, SPINET.keyY + 0.22, SPINET.z1 - 0.02],
      ];
      const tall = aspect < 1.05;
      return fitEither({ pos, look, ...(tall ? { up: [0, 0, -1] } : null), keep, pad: tall ? 0.06 : 0.1 }, aspect);
    })(),
    case: flat([(TALL_CASE.x0 + TALL_CASE.x1) / 2, 1.1, 3.2], {
      keep: [
        [TALL_CASE.x0, 0.45, TALL_CASE.front], [TALL_CASE.x1, 0.45, TALL_CASE.front],
        [TALL_CASE.x0, 1.75, TALL_CASE.front], [TALL_CASE.x1, 1.75, TALL_CASE.front],
      ],
      pad: 0.1,
    }),
  };
  // the shelf end is the door's own frame, mirrored about the room's axis
  {
    const d = shots.door;
    shots.shelf = { ...d, pos: [-d.pos[0], d.pos[1], d.pos[2]], look: [-d.look[0], d.look[1], d.look[2]] };
  }

  // the three card inserts: one card, hung from the top of the frame with the cloth under it for
  // the placard. A single card is very nearly the shape of a phone, so this is the one frame that
  // gets better as the window narrows.
  //
  // Round 7: aimed at `reveal.slots` — the row the piece LAYS — and not at the layout's, which
  // stands 36 cm apart where the piece lays 22.5. That closes the reveal piece's own contract note
  // (its `aimInserts` slid these three sideways after the fact and asked for exactly this); the
  // patch there is a no-op the moment a shot is already on the card, so the two agree with no edit
  // on that side.
  SUB.slots.forEach(([x, y, z], i) => {
    shots[`card${i}`] = plate({
      y,
      x,
      subject: [[x - 0.075, z - 0.125], [x + 0.075, z - 0.125], [x - 0.075, z + 0.125], [x + 0.075, z + 0.125]],
      bottom: PIN,
      dist: 0.52,
      distMax: 0.86,
      fov: 30,
      pad: 0.10,
    }, aspect);
  });
  return shots;
}
