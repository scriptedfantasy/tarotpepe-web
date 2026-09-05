// The named shots, written as CONTENT rather than as lenses. Two solvers behind them: camera-frame.js
// for the frontal shots (square to the back wall, framed by a rise of the lens) and camera-plan.js
// for the tabletop plates (square to the room's own axes, framed by where the camera stands).
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
import { plate } from './camera-plan.js';

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
  const rowPts = [];
  for (const [x, , z] of slots) rowPts.push(...cardCorners(x, z, YAW, C.w, C.h), ...cardCorners(x, z, -YAW, C.w, C.h));
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
  return { row, spread, all: boxOf(rowPts.concat(spreadPts)), slots, src: src.join(' + ') };
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
// And the last line before the RUG. The rug is 3.2 x 2.6 centred at z = -0.2, so its near edge is
// at 1.1 and its border is drawn INTO it: 1024x800 px over 3.2x2.6 m, a solid band at 18 px, the
// scroll's ground from 38, a double rule at 128/140 — which lands the border's inner rule at
// z = 0.684 and the OUTER of the two at 0.645. So there are 2.5 cm of plain rug between the
// table's rim and anything printed on it, and a plate whose bottom edge stays inside 0.645 shows
// the rim curving away over bare ground and nothing else. Past it the frame takes a hard black
// double rule and a comb of fringe straight across its foot. (Camera round 6 filed this as a
// contract request against props — widen the rug's plain field — and it does not need one: the
// frame simply has to stop here, and now it does.)
const RUGLINE = 0.642;
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
export function buildShots(L, aspect, reveal = null) {
  const zb = -L.room.depth / 2;
  const spreadY = L.spread.y;
  const [, , sz0] = L.spread.slots[1];
  const deck = L.deck.pos;
  const DECK = deckBox(L);
  const SUB = tableSubject(L, reveal);
  const ROW = SUB.row.pts;
  const CLOTH = SUB.all.pts;
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
      floor: RUGLINE,
      axis: -0.78,
      dist: 1.28,
      distMax: 1.66, // the pendant's bulbs hang at 2.45; the lens stops a hair under them
      fov: 30,
      pad: 0.08,
    }, aspect),
    // the fan, and the row the picked cards go to: everything the visitor may click, whole and
    // symmetric about the frame's vertical axis, with the near rim of the table closing the two
    // bottom corners.
    //
    // What it leaves for the caption's placard, measured: 50 px at 1600×900, 66 at 1200×1100, 46 on
    // a phone — 6 % of the frame's height in every window, because the spread runs to within 5 cm
    // of the rim and the pin holds the edge just inside it. There is no lens that gives the placard
    // more: on a phone the frame is already as far downstage as the rug allows. The band the fan
    // beat really has for it is the bare cloth between the still life and the spread — y 392..535
    // of 760 — which is the row the picked cards land in.
    fan: plate({
      y: spreadY,
      subject: CLOTH,
      whole: [DECK.box],
      bottom: PIN,
      centre: 0,
      disc: RIM,
      axis: -0.78,
      dist: 1.36,
      distMax: 1.66,
      fov: 30,
      pad: 0.06,
      floor: RUGLINE,
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
      floor: RUGLINE,
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
