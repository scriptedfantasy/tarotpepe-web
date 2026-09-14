// AN EGG, inside props: PEPE SILVIA. The framed picture on the STAGE-LEFT wall is a cabinet door,
// and the wall it hangs on is a conspiracy board.
//
// THE MEME. A man stands in front of a wall-sized board — pinned index cards, photographs,
// newspaper clippings, all of it joined by red string — explaining, at length and with total
// conviction, that a person called Pepe Silvia does not exist. The comedy is not the board. The
// comedy is that the board is EXCELLENT: it is ordered, it is lettered, it is strung, somebody has
// clearly worked on it for weeks, and the thing it proves is that a name on some mail is not a man.
//
// SO IT IS DRAWN AS GOOD WORK. Every card is ruled and lettered in the sign hand that letters the
// shop board and the placard (titles-sign.js); every photograph is a real little drawing; the
// clippings have a headline bar and ruled text under it; the string runs pin to pin and crosses
// over itself, which is the only thing on that wall that is not orderly and is exactly the thing
// that makes a board look mad. Nothing here winks. It is his handwriting on his wall.
//
// WHERE IT IS, AND WHY IT MOVED. The user: "lets put the pepe silvia painting and mechanism where
// the mirror currently is." The round frame on the stage-left wall — hung as a barometer, turned
// into a mirror of frogs for a round, and taken down with this change — stood at x -2.58, y 1.95,
// z 0.3, facing into the room. This picture takes that place: the same 0.4 x 0.46 frame the board
// hung in on the back wall, on cords to a nail on this wall, and the eighteen sheets go on the
// plaster round it instead of round the clock.
//
// EVERYTHING ELSE IN THIS FILE IS THE CONSEQUENCE OF ONE FACT: THAT WALL IS SEEN AT A RAKE. The
// home lens stands at (0, 1.62, 6.4) and the plaster is the plane x = -2.6, so the wall is about
// 67 degrees off the picture plane and every measurement on it comes in pairs. At the frame, on a
// 1600 x 900 plate, a metre ALONG the wall is 111 px and a metre UP it is 278 — 2.5 : 1, measured
// with tools/_egg-silvia-where.mjs, which is the tool that laid this egg out. It decides five
// things, and the file is mostly those five things.
//
//   1. WHICH WINDOWS SEE THE WALL AT ALL. It recedes to the LEFT EDGE of the frame as it comes
//      downstage, so what is in the picture is decided by the window's ASPECT and by nothing else:
//                    the wall is in frame   the frame, 0.4 x 0.46, lands   of the 18 sheets
//          1280 x 800    upstage of z -0.10   52 x 127 px at x -62: OUT       0 whole, 6 part, 12 out
//          1600 x 900    upstage of z  0.55   58 x 143 px at x  10: in        14 whole, 4 part, 0 out
//          1920 x 1080   upstage of z  0.55   70 x 172 px at x  12: in        14 whole, 4 part, 0 out
//          390 x 844     none of it           56 x 138 px at x -568: OUT      0 whole, 0 part, 18 out
//      So on a phone this egg is not in the picture and cannot be, and at 1280 x 800 the frame is
//      out of shot and the board is a 22 px sliver down the left edge. That is the framing's
//      business and not this egg's — it is the crop the mirror lived under before it — and the
//      board is laid out to put its words where the most windows keep them: at 1600 x 900 it runs
//      screen x 0 .. 105, at 1920 x 1080 x 0 .. 126, and at 1280 x 800 x 0 .. 22.
//
//   2. WHERE THE BOARD GOES. The clear plaster runs from the switchboard's downstage edge
//      (z -0.335, egg-switchboard.js) to the press door, above the dado (y 0.97) and below the
//      cable duct (room.js DUCT: y 2.30, 90 mm deep), with the frame in the middle of it. In this
//      file that band is written in the WALL'S OWN x, which runs UPSTAGE from the frame's centre —
//      egg-switchboard.js's convention on this same wall — so the band is x -0.25 .. +0.635 and
//      the frame is x -0.2 .. +0.2. Nothing is pinned upstage of 0.635: that is the switchboard.
//
//   3. HOW FAR THE DOOR OPENS, AND IT IS NOT THE WAY IT OPENED ON THE BACK WALL. A leaf standing
//      out from a raked wall stands IN FRONT OF THAT WALL, and covers far more of it than the hole
//      it leaves. Swept at the home plate, hinged at the DOWNSTAGE edge (1600 x 900; 1920 x 1080
//      agrees at every row):
//          shut      face  6810 px2   stands in front of the wall back to z  0.014
//          at  18    face 11370 px2   ...back to z -0.288     0.39 m of wall upstage of the frame
//          at  20    face 11825 px2   ...back to z -0.320     the last angle that clears the board
//          at  21    face 12047 px2   ...back to z -0.335     ON the switchboard
//          at  67    face 18114 px2   ...back to z -0.768     a quarter of it, two of its six jacks
//          at 140    face  5799 px2   ...back to z  0.098     its own rectangle, and 2 mm
//          at 145    face  4095 px2   ...back to z  0.197
//      The face is biggest at 67 degrees, square to the lens — and at 67 degrees the leaf lies over
//      the jack column at z -0.55, which would take two of the switchboard's six switches off the
//      pointer for as long as this board is up. Every angle from 21 to about 125 does some of that.
//      So the door goes RIGHT BACK, to 140, where it stands in front of the rectangle it hung on
//      AND NOTHING ELSE — z 0.098 against the frame's own upstage edge at z 0.100, two millimetres,
//      a fifth of a screen pixel — and the whole upstage column of the wall is left to the cards.
//      It was this room's own shutters' move when it was measured: the back wall's casement had two
//      louvred leaves and its downstage one folded flat onto the plaster the same way, its outer
//      edge standing at x -0.50. That window has since been taken out of the room and the move is
//      now the stage-right casement's, whose leaves fold back to world z -0.50 and z -2.50 on that
//      wall — the same hinge, the same 140 degrees, read along z instead of along x. The three
//      drawings in the middle of the swing do pass across the
//      switchboard, because a door swinging does; the rule is about where it comes to rest.
//
//   4. WHICH EDGE IT IS HINGED ON, WHICH IS THE SAME SWEEP READ THE OTHER WAY. Hinged at the
//      UPSTAGE edge the leaf turns its face AWAY as it opens: 6810 px2 shut, 1302 at 18 degrees,
//      edge-on at 22, and its BACK to the lens for the whole of the rest of the swing, where from
//      40 degrees on it also lies over the switchboard (at 140 it reaches back to z -1.15).
//      Hinged DOWNSTAGE the face is turned to the lens at every angle up to 157. There is no
//      reading of the measurement in which the upstage edge wins.
//
//   5. HOW BIG THE LETTERING HAS TO BE. A metre along the wall is 111 px, so a 0.4 m card is 44 px
//      on the glass and SILVIA on it is seven pixels a sort, under the eight the NAKAMOTO card in
//      the frame on the back wall is set at and needs. The five sheets that carry words are
//      therefore the BIG ones and they sit at the upstage end of the band, where every window that
//      sees this wall at all keeps them; the thirteen that carry pictures and clippings are small
//      and fill in round them. The measured figures are written against each card in SHEETS below.
//      And THE PEN IS HEAVIER ON THIS WALL THAN ON THE BACK ONE, for the same reason: see NIB_M.
//
// THE BOARD. Eighteen drawn sheets, pinned to the plaster round the frame, one every three
// drawings, each with a tack going in ('tap') panned to where that card is on the glass. Four and
// a half seconds of pinning; see CARD_EVERY for why it is four a second and not the three the
// brief asked for. Nothing may cover the switchboard, the wall shelf or its two jars, and nothing
// does: the sheets stop at x 0.635 and the shelf stands at x 2.30, a metre and a half upstage of
// the furthest tack. tools/_egg-silvia-proof.mjs measures both and raycasts the rest.
//
// HIS FACE IS NEVER COVERED AND CANNOT BE. Everything here is pinned to a wall two and a half
// metres to his left; he sits at x 0, facing the lens. The proof measures it anyway, because
// "never covered" is a claim and claims get measured.
//
// THE RED. The room's fourth colour, after his green and the fire's yellow and orange: #c8202e,
// the string's, and it is on the string and on nothing else. It is a cool crimson on purpose —
// held against the fire's #e0561d it has to read as a DIFFERENT colour and not as more fire, and
// held against the paper it has to be a line and not a stain. It survives the ink pass for the
// reason the Nakamoto card's green does: the sheet is `colorful`, so the pass shows it verbatim
// and re-states only its achromatic marks at the room's own nib (ink-shaders.js).
//
// THE STRING ITSELF is one sheet four millimetres in front of the cards, redrawn on every 12 fps
// step while the board is up — so it BOILS, which nothing else coloured in this room does.
// Thirty lengths, one a drawing, pin to pin, and the route is written to cross itself a dozen
// times. Each one SAGS, because a string pulled between two tacks does, and the sag is also how the
// take-down is drawn: swell it and the whole web goes slack in two drawings. The whole web is then
// PUNCHED THROUGH by every card's paper, with a collar left round each tack, because a length tied
// to a pin at the top of a card and running to something below it passes behind that card — and
// drawn the other way round the first thing the eye met was two red lines down the middle of the
// word SILVIA.
//
// A SECOND CLICK — on the frame, or on any card — takes it down: the string goes slack and falls in
// two drawings, the eighteen sheets come off in reverse order, and the leaf shuts. The wall is then
// the wall it was, to the pixel.
//
// WHAT HE SAYS. When the last segment is tied the room emits `props:silvia {open:true}` and flow.js
// takes it exactly where it takes the globe's country: the open field is cut short, his line goes up
// on the placard and the field opens again under it. The note is in server/pepe.mjs under `silvia`
// and it is a statement of what is true, not a script. HE DOES NOT TURN ROUND — no react(), no cut,
// no camera move — because the wall is beside him and a man who has built that board does not need
// to look at it. With no live voice he says nothing at all, which is the honest version.
//
// NOTHING ANNOUNCES ANY OF IT. No label, no glow, no tag. The cursor becomes a pointer over the
// frame and that is the whole affordance, as it is for the cat, the radio and the Nakamoto card.
//
// FOR THE TOOLS: `?silvia=<n>` holds the nth drawing of the opening and `?silvia=down<n>` the nth
// of the take-down, with the clock's hand off it; `?silvia=open` is the finished board; the `props`
// judging state `silvia-open` is the same thing. props.silvia.hold(n, closing) is the same call.
import * as THREE from 'three';
import { INK, PAPER, makeCanvas, canvasTexture, inkMaterial } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { signCaps, signFit } from './titles-sign.js';
import * as O from './props-objects.js';

// ---- THE RED -------------------------------------------------------------------------------------
// One red, and this is it. Said out loud here so nothing else in the room has to guess at it.
export const STRING_RED = '#c8202e';

// ---- the numbers ---------------------------------------------------------------------------------
// THE WALL'S OWN COORDINATES, and every position below is written in them. The egg hangs in a group
// turned a quarter turn onto the stage-left plaster — egg-switchboard.js's arrangement on this same
// wall — so in this file:
//     x runs UPSTAGE along the wall, from the frame's own centre line (world z = 0.3 - x)
//     y is height off the floor, as everywhere else in the room
//     z is how far a thing stands off the plaster, into the room
// The band the board is allowed is x -0.25 .. +0.635 and y 0.975 .. 2.29; see the head of the file.
const PPM = 660; // canvas px per metre of wall, for a sheet: about 3.6 texels to the screen pixel
const STR_PPM = 560; // …and for the string's own sheet, which is a metre wide and wants less
// THE PEN, AND IT IS HEAVIER THAN THE BACK WALL'S. The room's nib is 2.1 px on the glass, and
// 0.0115 m of THIS wall is 1.28 px, because a metre along it is 111 px against the back wall's 181.
// 0.017 m is 1.9 px at 1600 x 900 and 2.3 px at 1920 x 1080, and it is the same fifth of a cap
// height that 0.0115 m was of the back wall's lettering — so the letters are the room's own weight
// and only the wall has changed. A stroke drawn ACROSS the rake is still the thicker of the two, at
// 4.7 px, which is what a raked wall does to any drawing on it and is not something to correct:
// anamorphic lettering would read from the home plate and from nowhere else in the film.
const NIB_M = 0.017;
const STR_NIB_M = 0.015; // …and a string is thinner than a drawn line, as it was before
// HOW THE WALL IS STACKED, in millimetres off the plaster, and the order matters:
//   6.0 .. 8.6   the eighteen sheets, each one a sixth of a millimetre in front of the one pinned
//                before it. Cards on a board OVERLAP — nine pairs of these do — and two coplanar
//                cut-outs at the same depth is a seam that flickers as the camera breathes. The
//                stagger is also the order they went up in, which is the correct answer anyway.
//  10.5          the string, over every card
//  35.0          the frame on its cords
const OFF_CARD = 0.006;
const CARD_STEP = 0.00015;
const OFF_STRING = 0.0105;
const MIN_TAP = 44; // px: what a thumb needs, whatever the frame measures on the glass

// The swing, in degrees: over quickly, past itself, and back onto the catch. Six poses on twos is
// one second of door, which is egg-cross.js's shape in a smaller room. WHY IT ENDS AT A HUNDRED AND
// FORTY, with the sweep it was read off, is item 3 at the head of this file: at 67 degrees the
// leaf's face is biggest and it lies across a quarter of the switchboard; at 140 it stands in front
// of the rectangle it hung on and nothing else, and the column of wall it used to hide goes to the
// cards. The fifth pose overruns to 145, which also clears everything, and it settles back onto 140.
const SWING = [25, 62, 100, 128, 145, 140].map((d) => (d * Math.PI) / 180);
// …and shutting it is not that list backwards: backwards, the first drawing of the close is the
// overrun, which is a door pulling itself further open on its way to shut. Five poses, no overrun.
const CLOSE = [130, 100, 66, 30, 8].map((d) => (d * Math.PI) / 180);
const REST = SWING[SWING.length - 1];
const HOLD = 2; // a pose is held two drawings: the film's own twos
const OPEN_SWING = SWING.length * HOLD; // 12 drawings: the leaf is on its catch
const CARD0 = 4; // the first sheet goes up while the leaf is still moving
// FOUR A SECOND, AND THE BRIEF ASKED FOR TWO OR THREE. The brief also asked for a dozen sheets or
// more and for the wall to be up in about three seconds, and the three cannot all be had: eighteen
// sheets at three a second is six seconds of pinning, by the end of which the rush that makes the
// board funny has become a man tidying. Four a second is 4.6 seconds, which is as near three as
// eighteen sheets can be got, and the tack is PANNED to where the card is on the glass (see the
// cue below) — so eighteen pins on the right and the left of the wall stay eighteen separate
// sounds instead of one rattle, which is the thing the rate was protecting in the first place.
const CARD_EVERY = 3;
const STR_GAP = 3; // …and a breath between the last tack and the first length of string
const SEG_EVERY = 1; // a segment a drawing

// coming down: the string slack, then the sheets in reverse on twos, then the leaf
const SLACK_F = 2; // two drawings of slack string, and then it is on the floor
const DOWN_EVERY = 2;
const SHUT_GAP = 2;

// ---- the pen -------------------------------------------------------------------------------------
// Local, and for egg-nakamoto.js's reason: everything this file draws is drawn at the size of a
// postage stamp and wants a shorter step than props-textures' own stroke().
function pen(g, pts, { width = 2, wobble = 0.7, rng = Math.random, color = INK, alpha = 1, close = false } = {}) {
  if (pts.length < 2) return;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = width * (0.88 + rng() * 0.24);
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const w = i === 0 || i === pts.length - 1 ? wobble * 0.4 : wobble;
    const px = x + (rng() - 0.5) * w, py = y + (rng() - 0.5) * w;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  });
  if (close) g.closePath();
  g.stroke();
  g.restore();
}
const line = (g, x0, y0, x1, y1, o) => pen(g, [[x0, y0], [x1, y1]], o);
const rect = (g, x, y, w, h, o) => pen(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { ...o, close: true });
function fill(g, pts, color = INK, { rng = Math.random, wobble = 0.6 } = {}) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const px = x + (rng() - 0.5) * wobble, py = y + (rng() - 0.5) * wobble;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  });
  g.closePath();
  g.fill();
  g.restore();
}

// ---- THE SHEETS ----------------------------------------------------------------------------------
// Eighteen of them, in the WALL'S metres (x upstage from the frame's centre, y off the floor): where
// the centre is, how big it is, what is on it, and which tilt it was pinned at. Nothing is square to
// the wall — a card pinned by one tack hangs a degree or two off, and eighteen of them at eighteen
// angles is what tells the eye this was done by a hand and not printed.
//
// `pin` is where the tack goes, as a fraction of the sheet's own width and height from its centre:
// almost always the top middle, which is where you put one tack.
//
// WHAT SETS EVERY NUMBER HERE is the rake (items 1, 2 and 5 at the head of the file). The three
// rectangles of wall the board has are:
//     the UPSTAGE COLUMN   x 0.205 .. 0.630, y 1.72 .. 2.175   beside the frame, above the shelf of
//                                                              wall the open leaf leaves alone
//     the WIDE SHELF       x -0.25 .. 0.630, y 0.975 .. 1.700  under the frame, the whole band
//     the STRIP            x -0.25 .. 0.630, y 2.19 .. 2.29    between the frame's head and the duct
// and the five cards that carry words take the upstage end of the first two, because that is the
// part of this wall the narrow windows keep. The px-per-sort against each of them is measured on a
// 1600 x 900 home plate, with the 1920 x 1080 figure in brackets: it is the card's inner width on
// the glass divided by the sorts in its longest line, and eight is the figure the NAKAMOTO card in
// the frame on the back wall reads at.
const SHEETS = [
  // ---- THE FIVE THAT CARRY WORDS, and they are the whole reason the rest is laid out as it is.
  // Every one of them is as wide as the plaster it stands on allows, because on this wall width is
  // the scarce axis and a card's width is the only thing px-per-sort answers to. PEPE SILVIA gets
  // the one full-width band on the board — 0.52 m, which is a sheet of drawing paper and not an
  // index card, and which is what a man writes the name on when he is certain.
  //   px a sort at 1600 x 900 (1920 x 1080):  SILVIA 8.9 (10.7)   CAROL 7.6 (9.2)
  //                                           NO SUCH 7.1 (8.5)   WHO IS 6.4 (7.7)   MAIL FOR 6.5 (7.9)
  { id: 'silvia', x: 0.36, y: 1.545, w: 0.52, h: 0.31, tilt: -1.4, kind: 'card', lines: ['PEPE', 'SILVIA'], caps: [0.125, 0.125], rule: true, seed: 11 },
  { id: 'carol', x: 0.423, y: 2.065, w: 0.39, h: 0.21, tilt: 2.2, kind: 'card', lines: ['CAROL', 'IN HR'], caps: [0.105, 0.105], rule: true, seed: 19 },
  { id: 'who', x: 0.425, y: 1.845, w: 0.39, h: 0.21, tilt: -1.9, kind: 'card', lines: ['WHO IS', 'PEPE?'], caps: [0.1, 0.1], seed: 12 },
  { id: 'mail', x: 0.355, y: 1.275, w: 0.5, h: 0.19, tilt: 1.6, kind: 'card', lines: ['MAIL FOR', 'SILVIA'], caps: [0.092, 0.092], seed: 28 },
  { id: 'nosuch', x: 0.355, y: 1.075, w: 0.48, h: 0.18, tilt: -2.1, kind: 'card', lines: ['NO SUCH', 'NAME'], caps: [0.089, 0.089], rule: true, seed: 16 },

  // ---- THE STRIP between the frame's head (y 2.18) and the cable duct (y 2.30): a hundred
  // millimetres of plaster running the length of the wall, and four letterbox sheets along it. The
  // picture's own cords cross it, and they are 1.6 mm rods — a fifth of a screen pixel — so a card
  // behind one is a card with a cord over it and nothing is lost.
  { id: 'clip-a', x: 0.415, y: 2.242, w: 0.4, h: 0.095, tilt: -1.6, kind: 'clip', head: 'NO TRACE', seed: 13 },
  { id: 'nums', x: 0.13, y: 2.238, w: 0.17, h: 0.09, tilt: 2, kind: 'card', lines: ['0944'], caps: [0.05], seed: 23 },
  { id: 'board', x: -0.075, y: 2.244, w: 0.2, h: 0.095, tilt: -2.2, kind: 'photo', subject: 'switchboard', seed: 14 },
  { id: 'year', x: -0.235, y: 2.238, w: 0.15, h: 0.09, tilt: 2.6, kind: 'card', lines: ['1971'], caps: [0.05], seed: 18 },

  // ---- THE DOWNSTAGE HALF, which is the part of the wall the frame's own rectangle stands over
  // and the part a 1280 x 800 window has already cut off. Nine sheets, small and overlapping, which
  // is what a board looks like where nobody had to read anything. clip-d and clip-b run OFF the
  // left of the picture on purpose: a board that stops inside the frame is a board the size of the
  // frame, and this one is not.
  { id: 'board2', x: -0.055, y: 1.615, w: 0.19, h: 0.175, tilt: -2.2, kind: 'photo', subject: 'switchboard', seed: 26 },
  { id: 'clip-d', x: -0.215, y: 1.56, w: 0.14, h: 0.185, tilt: 1.4, kind: 'clip', head: 'DEPT 6', seed: 22 },
  { id: 'frog', x: -0.055, y: 1.43, w: 0.15, h: 0.175, tilt: -2.6, kind: 'photo', subject: 'frog', seed: 24 },
  { id: 'clip-b', x: -0.19, y: 1.34, w: 0.15, h: 0.175, tilt: 1.1, kind: 'clip', head: 'ADDRESSEE', seed: 15 },
  { id: 'door', x: -0.055, y: 1.235, w: 0.15, h: 0.185, tilt: 2.2, kind: 'photo', subject: 'door', seed: 20 },
  { id: 'clip-e', x: -0.195, y: 1.12, w: 0.15, h: 0.175, tilt: 2.4, kind: 'clip', head: 'NO ENTRY', seed: 27 },
  { id: 'clip-c', x: -0.06, y: 1.055, w: 0.16, h: 0.16, tilt: -2.4, kind: 'clip', head: 'MAIL ROOM', seed: 17 },
  { id: 'q-b', x: 0.055, y: 1.29, w: 0.09, h: 0.115, tilt: -4, kind: 'query', seed: 21 },
  { id: 'q-a', x: 0.055, y: 1.075, w: 0.09, h: 0.115, tilt: 4.2, kind: 'query', seed: 25 },
];
// THE ORDER THEY GO UP IN, AND THE WORDS GO UP LAST. It is the order a man actually builds one of
// these in — the clippings and the photographs are the work, the name written out is the
// conclusion — and it is also the only stacking that keeps the lettering clean: a sheet pinned
// later lies in FRONT of one pinned earlier (see CARD_STEP), so with PEPE SILVIA pinned eighteenth
// nothing on this wall can ever be over the word. Pinned first, a first cut of this board had two
// clippings and a number card lying across the middle of PEPE.
const ORDER = ['clip-d', 'clip-b', 'board2', 'door', 'clip-c', 'clip-e', 'frog', 'q-b', 'q-a', 'board', 'year', 'clip-a', 'nums', 'who', 'carol', 'nosuch', 'mail', 'silvia'];

// THE STRING'S ROUTE, pin to pin, by id. THIRTY lengths, and the shape of the list is the point.
// The first twenty are SHORT HOPS between neighbours — the string a man runs while he is still
// putting cards up, one to the next thing beside it — and the last ten are LONG RUNS clear across
// the wall, which is what he does at two in the morning when he has decided the whole thing joins
// up. Twenty short and ten long is a web; thirty of either on its own is a diagram.
//
// NOTHING LEAVES THE BAND. Every pin is inside x -0.29 .. 0.63 and every run between two of them
// stays there, because a run between two points inside a rectangle is inside it; the sag only ever
// takes a length DOWN, and the lowest pin is at y 1.13 with 0.16 m of clear plaster under it before
// the dado. tools/_egg-silvia-proof.mjs raycasts the switchboard and counts the red inside the
// shelf of jars, and the answer to both is none.
const ROUTE = [
  // the short hops
  ['clip-a', 'carol'],
  ['carol', 'who'],
  ['who', 'silvia'],
  ['silvia', 'mail'],
  ['mail', 'nosuch'],
  ['nosuch', 'q-a'],
  ['q-a', 'q-b'],
  ['q-b', 'door'],
  ['door', 'clip-c'],
  ['clip-c', 'clip-e'],
  ['clip-e', 'clip-b'],
  ['clip-b', 'frog'],
  ['frog', 'board2'],
  ['board2', 'clip-d'],
  ['clip-d', 'board'],
  ['board', 'year'],
  ['board', 'nums'],
  ['nums', 'clip-a'],
  ['frog', 'door'],
  ['clip-d', 'clip-b'],
  // and the long runs, which are the ones that cross
  ['silvia', 'carol'],
  ['silvia', 'clip-a'],
  ['silvia', 'clip-d'],
  ['silvia', 'q-b'],
  ['carol', 'nosuch'],
  ['who', 'mail'],
  ['nums', 'q-a'],
  ['board', 'clip-c'],
  ['year', 'clip-b'],
  ['frog', 'nosuch'],
];

// ---- one sheet, drawn ------------------------------------------------------------------------------
// The canvas is the sheet's own rectangle plus a margin for the tack, which stands a little above
// the paper's top edge. Everything is in canvas px; `M(m)` turns metres of wall into them.
const PAD = 10; // canvas px of clear margin round the paper, for the tack and for the torn edges

function sheetCanvas(S) {
  const w = Math.round(S.w * PPM) + PAD * 2;
  const h = Math.round(S.h * PPM) + PAD * 2;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rng = mulberry32(S.seed * 977 + 13);
  const M = (m) => m * PPM;
  const x0 = PAD, y0 = PAD, pw = w - PAD * 2, ph = h - PAD * 2;
  // THE PEN, AND IT IS THE ROOM'S AND NOT THIS CARD'S — but it is measured on THIS wall, which is
  // raked, so it is not the back wall's number. See NIB_M above: 0.017 m is 1.9 px across the rake
  // at 1600 x 900, which is the weight the entrance door is drawn at and the benchmark the ink pass
  // keeps. Everything inside a drawing (a photograph's panels, a clipping's ruled text) is 0.7 of
  // it and no finer.
  const nib = M(NIB_M);
  const fine = nib * 0.7;

  // THE PAPER. A card is a solid white shape and the drawing sits on it; the canvas outside it is
  // left transparent, so the sheet is a cut-out and there is no rectangle of paper round a torn
  // clipping. (alphaTest does the cutting; see the material below.)
  if (S.kind === 'clip') {
    // a clipping has been TORN out, so two of its edges are ragged and two are cut. The ragged
    // ones are the long ones — a man tears down a column and cuts across it.
    const pts = [];
    const steps = 7;
    for (let i = 0; i <= steps; i++) pts.push([x0 + (rng() - 0.4) * nib * 2.6, y0 + (ph * i) / steps]);
    for (let i = 0; i <= steps; i++) pts.push([x0 + pw + (rng() - 0.6) * nib * 2.6, y0 + ph - (ph * i) / steps]);
    fill(g, pts, PAPER, { rng, wobble: 0.4 });
  } else {
    fill(g, [[x0, y0], [x0 + pw, y0], [x0 + pw, y0 + ph], [x0, y0 + ph]], PAPER, { rng, wobble: 0.5 });
  }

  const o = { width: nib, wobble: nib * 0.34, rng };
  if (S.kind === 'card' || S.kind === 'query') {
    // an index card's rule: one border, and for the two cards that matter a second one inside it
    rect(g, x0 + nib * 0.7, y0 + nib * 0.7, pw - nib * 1.4, ph - nib * 1.4, { ...o, width: nib });
    if (S.rule) rect(g, x0 + nib * 2.4, y0 + nib * 2.4, pw - nib * 4.8, ph - nib * 4.8, { ...o, width: fine });
  }

  if (S.kind === 'card') {
    // THE LETTERING, in the sign hand, one line under another. Nothing is set at half weight to make
    // it fit: a line that will not go is set smaller — AND THE WHOLE CARD COMES DOWN WITH IT, which
    // is the one change this wall asked for. A man letters a card in one hand, so the size is the
    // size the LONGEST line will take and the short lines are simply shorter. Fitted line by line
    // instead, PEPE stood a third taller than SILVIA under it, which is a card printed and not
    // written. The cap is also held inside its own line's band, so a two-line card is two lines.
    const n = S.lines.length;
    const inner = pw - M(0.022) * 2;
    const band = (ph / n) * 0.92;
    const capH = Math.min(band, ...S.lines.map((ln, i) => signFit(ln, inner, { capH: M(S.caps[i]), tracking: 0.12, pen: nib })));
    for (let i = 0; i < n; i++) {
      const cy = y0 + ph * ((i + 0.5) / n) + (n > 1 ? (i - (n - 1) / 2) * M(0.004) : 0);
      signCaps(g, S.lines[i], x0 + pw / 2, cy, { capH, tracking: 0.12, pen: nib, rng, seed: S.seed * 7 + i });
    }
  } else if (S.kind === 'query') {
    // a card with one mark on it. The sign hand has a question mark and it is the only thing here
    // big enough to be read across the room, which is why two of these are on the wall.
    const capH = signFit('?', pw - M(0.02), { capH: ph * 0.62, tracking: 0, pen: nib * 1.6 });
    signCaps(g, '?', x0 + pw / 2, y0 + ph / 2, { capH, tracking: 0, pen: nib * 1.6, rng, seed: S.seed * 7 });
  } else if (S.kind === 'photo') {
    // a photograph: a white border, a drawn picture inside it, and the picture carries the black.
    const b = M(0.009);
    const ix = x0 + b, iy = y0 + b, iw = pw - b * 2, ih = ph - b * 2 - M(0.012);
    g.save();
    g.beginPath();
    g.rect(ix, iy, iw, ih);
    g.clip();
    drawPhoto(g, S.subject, ix, iy, iw, ih, rng, nib, fine);
    g.restore();
    rect(g, ix, iy, iw, ih, { ...o, width: nib });
  } else if (S.kind === 'clip') {
    // a clipping: one solid headline bar with the word cut out of it in paper, and ruled text under
    // it. The bar is the black area every prop in this room owes the frame; the ruled text is the
    // bare white one. At 30 px across, that pair is all a clipping is.
    const bx = x0 + nib * 2, bw = pw - nib * 4;
    const bh = M(0.026);
    fill(g, [[bx, y0 + nib * 2], [bx + bw, y0 + nib * 2], [bx + bw, y0 + nib * 2 + bh], [bx, y0 + nib * 2 + bh]], INK, { rng, wobble: 0.5 });
    {
      const capH = signFit(S.head, bw - M(0.008), { capH: bh * 0.62, tracking: 0.12, pen: nib * 0.8 });
      signCaps(g, S.head, bx + bw / 2, y0 + nib * 2 + bh / 2, { capH, tracking: 0.12, pen: nib * 0.8, rng, seed: S.seed * 7, color: PAPER });
    }
    // the ruled text: a line is a stroke, a paragraph is a run of them, and the last line of a
    // paragraph is short. Nothing here is lettering and nothing pretends to be.
    let ty = y0 + nib * 2 + bh + M(0.012);
    // FEWER RULES AND HEAVIER ONES. A clipping is thirty pixels across at the home plate: twelve
    // hairlines there are a smudge, six marks at the room's own pen are a column of text.
    const lead = Math.max(nib * 1.9, M(0.0165));
    let para = 2 + Math.floor(rng() * 3);
    while (ty < y0 + ph - nib * 3) {
      const short = para <= 0;
      const len = (bw - M(0.004)) * (short ? 0.3 + rng() * 0.3 : 0.86 + rng() * 0.14);
      line(g, bx + M(0.002), ty, bx + M(0.002) + len, ty, { width: fine, wobble: fine * 0.3, rng });
      ty += lead;
      if (short) {
        ty += lead * 0.55;
        para = 2 + Math.floor(rng() * 3);
      } else para--;
    }
  }

  // THE TACK, at the sheet's top middle, standing a little proud of the paper: a solid head with a
  // paper nick in it, because a black disc four pixels across with nothing inside it is a full stop.
  {
    const tx = x0 + pw / 2, ty = y0 + nib * 1.2;
    const r = Math.max(nib * 1.05, M(0.0058));
    fill(
      g,
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return [tx + Math.cos(a) * r, ty + Math.sin(a) * r * 0.92];
      }),
      INK,
      { rng, wobble: nib * 0.16 },
    );
    line(g, tx - r * 0.36, ty - r * 0.3, tx + r * 0.12, ty - r * 0.34, { width: fine * 0.8, wobble: fine * 0.2, rng, color: PAPER });
  }
  return { canvas: c, w, h };
}

// the three photographs. Each is ONE MASS and one idea, because at fifteen pixels across a
// photograph is a silhouette with a light behind it and nothing else survives.
function drawPhoto(g, subject, x, y, w, h, rng, nib, fine = nib * 0.7) {
  const o = { width: fine, wobble: fine * 0.4, rng };
  if (subject === 'frog') {
    // A FROG SEEN FROM BEHIND: the back of a head and two shoulders, and no face, which is the
    // whole of why this photograph is on the board. Hatched, not filled: a photograph of a person
    // in this room is drawn in strokes, the way the Nakamoto card's grey hair is.
    const cx = x + w / 2, base = y + h;
    fill(g, [[cx - w * 0.42, base], [cx - w * 0.36, base - h * 0.42], [cx - w * 0.2, base - h * 0.56], [cx + w * 0.2, base - h * 0.56], [cx + w * 0.36, base - h * 0.42], [cx + w * 0.42, base]], INK, { rng, wobble: nib * 0.4 });
    // the head, in strokes over paper, and two ear-blobs where a frog's eyes sit on top of the skull
    const hy = base - h * 0.66;
    pen(
      g,
      Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return [cx + Math.cos(a) * w * 0.27, hy + Math.sin(a) * h * 0.2];
      }),
      { ...o, width: nib * 0.9, close: true },
    );
    for (let i = 0; i < 7; i++) {
      const u = -0.8 + (i / 6) * 1.6;
      line(g, cx + u * w * 0.24, hy - h * 0.17, cx + u * w * 0.2, hy + h * 0.16, { width: fine * 0.85, wobble: fine * 0.3, rng });
    }
    for (const s of [-1, 1]) {
      pen(
        g,
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return [cx + s * w * 0.2 + Math.cos(a) * w * 0.11, hy - h * 0.15 + Math.sin(a) * h * 0.09];
        }),
        { ...o, width: fine, close: true },
      );
    }
  } else if (subject === 'door') {
    // A DOOR, photographed square on: two stiles, three rails, two fielded panels, a knob. It is
    // the room's own door in miniature and it is deliberately a photograph of nothing happening.
    const ix = x + w * 0.2, iy = y + h * 0.1, iw = w * 0.6, ih = h * 0.86;
    fill(g, [[ix, iy], [ix + iw, iy], [ix + iw, iy + ih], [ix, iy + ih]], PAPER, { rng, wobble: 0.3 });
    rect(g, ix, iy, iw, ih, { ...o, width: nib * 0.85 });
    for (let p = 0; p < 2; p++) {
      const py = iy + ih * (0.1 + p * 0.45);
      rect(g, ix + iw * 0.18, py, iw * 0.64, ih * 0.34, { ...o, width: fine });
    }
    fill(
      g,
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return [ix + iw * 0.86 + Math.cos(a) * nib * 0.9, iy + ih * 0.5 + Math.sin(a) * nib * 0.9];
      }),
      INK,
      { rng, wobble: nib * 0.2 },
    );
    // the wall either side of it, in rain-strokes, so the door is not floating in white
    for (let i = 0; i < 9; i++) {
      const px = x + (i / 8) * w;
      if (px > ix - nib && px < ix + iw + nib) continue;
      line(g, px, y, px, y + h, { width: fine * 0.8, wobble: fine * 0.6, rng });
    }
  } else {
    // A SWITCHBOARD: a black plate with a grid of paper holes in it and a keyshelf under it. The
    // same object as the one he sits in front of, photographed by somebody, pinned to his wall.
    fill(g, [[x, y + h * 0.05], [x + w, y + h * 0.05], [x + w, y + h * 0.62], [x, y + h * 0.62]], INK, { rng, wobble: nib * 0.3 });
    const cols = 7, rows = 4;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const px = x + w * (0.09 + (c / (cols - 1)) * 0.82);
        const py = y + h * (0.13 + (r / (rows - 1)) * 0.4);
        fill(
          g,
          Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return [px + Math.cos(a) * nib * 0.62, py + Math.sin(a) * nib * 0.62];
          }),
          PAPER,
          { rng, wobble: nib * 0.12 },
        );
      }
    line(g, x, y + h * 0.68, x + w, y + h * 0.68, { ...o, width: nib * 0.9 });
    for (let k = 0; k < 6; k++) {
      const px = x + w * (0.1 + (k / 5) * 0.8);
      line(g, px, y + h * 0.72, px, y + h * 0.86, { width: nib * 0.7, wobble: fine * 0.3, rng });
    }
  }
}

// ---- THE BUILD -------------------------------------------------------------------------------------
export function eggSilvia(ctx, { group, switches, slot }) {
  const { wall, z: frameZ, y, w, h, off, hookY } = slot;

  // ---- 0. the wall's own group ----------------------------------------------------------------------
  // A quarter turn onto the stage-left plaster, with the origin on the frame's own centre line, so
  // that everything below is written in the wall's coordinates and not in the room's: local +x runs
  // UPSTAGE (world z = frameZ - x), local +z stands off the plaster into the room. It is
  // egg-switchboard.js's arrangement on this same wall, and it is what lets the sheets, the string
  // and the leaf be laid out as a flat drawing instead of as three-dimensional bookkeeping.
  const wallG = new THREE.Group();
  wallG.name = 'silvia-wall';
  wallG.position.set(wall, 0, frameZ);
  wallG.rotation.y = Math.PI / 2;
  group.add(wallG);

  // ---- 1. the frame, on a hinge at its DOWNSTAGE edge ------------------------------------------------
  // The picture is props.js's own `diagram` plate, built by the same call with the same seed the
  // back wall's right-hand frame was hung with: the egg changed walls and took its picture with it.
  // The hinge is the leaf's downstage edge (local x -w/2) and a positive swing is a NEGATIVE
  // rotation about the wall's own y, so the free edge comes forward into the room and downstage and
  // the front of the leaf stays turned towards the lens. Which edge, and why, is item 4 at the head
  // of this file; how far it goes round is item 3.
  const hinge = new THREE.Group();
  hinge.name = 'silvia-frame';
  hinge.position.set(-w / 2, y, off);
  const leaf = O.pictureFrame({ w, h, kind: 'diagram', seed: 100, ornate: true });
  leaf.position.set(w / 2, 0, 0);
  hinge.add(leaf);
  wallG.add(hinge);
  // the cords stay on the nail. A picture that is also a cabinet door is a picture with cords on it;
  // taking them off when it opens would be the drawing explaining the joke. The nail is driven under
  // the cable duct and not at the picture rail: room.js runs a 90 mm trough along this wall at
  // y 2.30, and a cord to the rail at 2.58 would be threaded through it.
  O.hangCords(wallG, 0, y + h / 2, w / 2 - 0.02, hookY, off - 0.003);

  // ---- 2. the eighteen sheets ----------------------------------------------------------------------
  const board = new THREE.Group();
  board.name = 'silvia-board';
  board.userData.noShadow = true;
  wallG.add(board);

  const byId = Object.create(null);
  const sheets = [];
  // …and they are built in the order they GO UP in, not in the order they are written down, because
  // that is the order they have to stack in: a card pinned later lies over one pinned earlier.
  const upOrder = ORDER.map((id) => SHEETS.find((s) => s.id === id)).filter(Boolean);
  upOrder.forEach((S, k) => {
    const { canvas, w: cw, h: ch } = sheetCanvas(S);
    const tex = canvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
    // colorful: the pass shows the drawing verbatim and re-states its achromatic marks at the room's
    // own nib. lineWeight 0: no second contour drawn round a flat card. hatch 0.02: a sheet pinned
    // flat to a wall takes no wash. Those three — colorful true, lineWeight 0, hatch 0.02 — are
    // pepe.js's own numbers for a paper cut-out, and they are why he and these are drawn by one hand.
    const mat = inkMaterial({ color: '#ffffff', map: tex, hatch: 0.02, lineWeight: 0, colorful: true });
    mat.alphaTest = 0.5;
    mat.transparent = false;
    mat.name = `silvia-${S.id}`;
    const m = O.plane((cw / PPM), (ch / PPM), mat);
    m.name = `silvia-sheet-${S.id}`;
    m.castShadow = false;
    m.receiveShadow = false;
    m.position.set(S.x, S.y, OFF_CARD + k * CARD_STEP);
    m.rotation.z = (S.tilt * Math.PI) / 180;
    m.visible = false;
    board.add(m);
    // where the tack is, on the wall, in metres: the top middle of the paper, turned with the card.
    const py = S.h / 2 - 0.004;
    const a = (S.tilt * Math.PI) / 180;
    const rec = { id: S.id, mesh: m, S, pin: [S.x + Math.sin(a) * py, S.y + Math.cos(a) * py] };
    byId[S.id] = rec;
    sheets.push(rec);
  });
  const order = ORDER.map((id) => byId[id]).filter(Boolean);

  // ---- 3. the string, on one sheet of its own -------------------------------------------------------
  // It spans everything the board reaches and a hand's width past it, so a length of string that
  // sags below a pin has somewhere to sag to, and it is in the wall's coordinates like everything
  // else here: x -0.34 .. 0.70 upstage, y 0.90 .. 2.34 off the floor.
  const SX0 = -0.34, SX1 = 0.62, SY0 = 0.9, SY1 = 2.34;
  const SW = Math.round((SX1 - SX0) * STR_PPM), SH = Math.round((SY1 - SY0) * STR_PPM);
  const strCanvas = makeCanvas(SW, SH);
  const str2d = strCanvas.getContext('2d');
  const strTex = new THREE.CanvasTexture(strCanvas);
  strTex.colorSpace = THREE.SRGBColorSpace;
  strTex.generateMipmaps = false;
  strTex.minFilter = THREE.LinearFilter;
  strTex.magFilter = THREE.LinearFilter;
  strTex.wrapS = strTex.wrapT = THREE.ClampToEdgeWrapping;
  strTex.anisotropy = Math.max(1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
  const strMat = inkMaterial({ color: '#ffffff', map: strTex, hatch: 0, lineWeight: 0, colorful: true });
  strMat.alphaTest = 0.5;
  strMat.transparent = false;
  const string = O.plane(SX1 - SX0, SY1 - SY0, strMat);
  string.name = 'silvia-string';
  string.castShadow = false;
  string.receiveShadow = false;
  string.position.set((SX0 + SX1) / 2, (SY0 + SY1) / 2, OFF_STRING);
  string.visible = false;
  board.add(string);

  // wall metres → the string sheet's own px
  const sx = (mx) => ((mx - SX0) / (SX1 - SX0)) * SW;
  const sy = (my) => ((SY1 - my) / (SY1 - SY0)) * SH;
  const NIB = Math.max(3, STR_NIB_M * STR_PPM); // 15 mm of string: 1.7 px across the rake at the home plate

  // ONE LENGTH OF STRING. It is not a straight line: it is pulled between two tacks and it sags,
  // and a hand's wobble rides on the sag. `slack` swells the sag — that is the whole of what
  // "the string goes slack" is drawn as, and it is why the take-down needs no new geometry.
  function span(g, a, b, seed, slack = 0) {
    const rng = mulberry32(seed);
    const ax = sx(a[0]), ay = sy(a[1]), bx = sx(b[0]), by = sy(b[1]);
    const len = Math.hypot(bx - ax, by - ay);
    // A LENGTH OF STRING BETWEEN TWO TACKS IS A CATENARY AND NOT A RULED LINE, and at this scale
    // that is the whole of what makes it string. Six per cent of its own length, plus a seeded
    // quarter of that again so no two hang alike; `slack` swells it to five times that, which is
    // what the take-down is drawn with and is why it needs no new geometry.
    const sag = len * (0.06 + rng() * 0.03 + slack * 0.34) + slack * SH * 0.08;
    const n = 9;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const bow = Math.sin(u * Math.PI);
      pts.push([ax + (bx - ax) * u + (rng() - 0.5) * NIB * 0.5, ay + (by - ay) * u + bow * sag + (rng() - 0.5) * NIB * 0.5]);
    }
    pen(g, pts, { width: NIB, wobble: NIB * 0.45, rng, color: STRING_RED });
  }

  // THE KNOT: the first twelve millimetres of a run, leaving its own tack. It is struck after the
  // cards have been punched out of the web, so every length is seen to be TIED to a pin rather than
  // to stop dead at the edge of a piece of paper.
  const KNOT = 0.011 * STR_PPM;
  function knot(g, from, to, seed) {
    // …and only UPWARD or sideways. A tack is at the top of its card, so a run that leaves it going
    // DOWN goes behind the card and comes out at its foot, which is what the punch-out already
    // draws; a knot there is eleven millimetres of red laid over the card's own lettering for no
    // gain. Measured on NO SUCH NAME: twenty-seven red pixels inside the words, all of them this.
    if (to[1] < from[1] - 0.008) return;
    const rng = mulberry32(seed);
    const ax = sx(from[0]), ay = sy(from[1]), bx = sx(to[0]), by = sy(to[1]);
    const d = Math.hypot(bx - ax, by - ay) || 1;
    const u = Math.min(1, KNOT / d);
    pen(g, [[ax, ay], [ax + (bx - ax) * u, ay + (by - ay) * u + KNOT * 0.2]], { width: NIB, wobble: NIB * 0.3, rng, color: STRING_RED });
  }

  // THE WHOLE WEB, re-struck from nothing. Called on every 12 fps step while any of it is up, which
  // is why the string boils exactly as the room's black lines do — a held length of string is never
  // the same length of string twice.
  let shownSegs = -1, shownSlack = -1, shownStrike = -1;
  function drawString(segs, slack, strike) {
    if (segs === shownSegs && slack === shownSlack && strike === shownStrike) return;
    shownSegs = segs;
    shownSlack = slack;
    shownStrike = strike;
    str2d.clearRect(0, 0, SW, SH);
    for (let i = 0; i < segs && i < ROUTE.length; i++) {
      const a = byId[ROUTE[i][0]], b = byId[ROUTE[i][1]];
      if (!a || !b) continue;
      span(str2d, a.pin, b.pin, 4001 + i * 131 + strike * 7717, slack);
    }
    // AND THEN THE CARDS ARE CUT OUT OF IT, WHICH IS WHERE THE STRING ACTUALLY IS. A tack goes
    // through the string AND the card, so a length tied to a pin at the top of a card and running
    // to something below it passes BEHIND that card and comes out at its foot. Drawn the other way
    // round — the whole web in front — the first thing the eye met was two red lines straight down
    // the middle of the word SILVIA, which is the one word on this wall that has to be read.
    // So: strike the web, then punch every card's paper out of it, leaving a collar of a centimetre
    // round each tack so the string is visibly TIED and not merely stopped.
    if (segs > 0) {
      str2d.save();
      str2d.globalCompositeOperation = 'destination-out';
      for (const rec of sheets) {
        if (!rec.mesh.visible) continue;
        const S = rec.S;
        const a = (S.tilt * Math.PI) / 180;
        const cx = sx(S.x), cy = sy(S.y);
        const hw = (S.w / 2 - 0.002) * STR_PPM, hh = (S.h / 2 - 0.002) * STR_PPM;
        str2d.save();
        str2d.translate(cx, cy);
        // …and the sign is NEGATED, which is not a detail. A sheet's tilt is `mesh.rotation.z`, which
        // turns anti-clockwise about a +y-up axis; a canvas turns clockwise because its y runs down.
        // Rotated the same way round, each hole is twice its card's tilt out of true and a red
        // sliver is left along two of its corners — which, on a card lettered CAROL IN HR, arrives
        // as a line through the middle of the words.
        str2d.rotate(-a);
        str2d.beginPath();
        str2d.rect(-hw, -hh, hw * 2, hh * 2);
        str2d.fill();
        str2d.restore();
      }
      str2d.restore();
      // …and the knots, struck again over the holes so every length ends ON its pin
      for (let i = 0; i < segs && i < ROUTE.length; i++) {
        const a = byId[ROUTE[i][0]], b = byId[ROUTE[i][1]];
        if (!a || !b) continue;
        knot(str2d, a.pin, b.pin, 4001 + i * 131 + strike * 7717);
        knot(str2d, b.pin, a.pin, 4002 + i * 131 + strike * 7717);
      }
    }
    strTex.needsUpdate = true;
    string.visible = segs > 0;
  }

  // ---- 4. the leaf's angle --------------------------------------------------------------------------
  // Hinged at the leaf's DOWNSTAGE edge, so a positive swing is a NEGATIVE rotation about the wall's
  // own y: the free edge comes forward into the room and downstage, and the face of the leaf stays
  // turned towards the lens the whole way round. Item 4 at the head of this file is the measurement.
  const setAngle = (theta) => {
    hinge.rotation.y = -theta;
  };
  setAngle(0);

  // ---- 5. the run -----------------------------------------------------------------------------------
  // Counted in the ROOM'S OWN DRAWINGS, never in milliseconds: `frame0` is the 12 fps frame the
  // pointer landed on and everything below is `clock.frame - frame0`. Three seconds is three seconds
  // on a laptop at sixty and on a software renderer at four; the board simply skips drawings when
  // frames are dropped, which is what a film projected at twelve does.
  const CARD_LAST = CARD0 + (order.length - 1) * CARD_EVERY;
  const SEG0 = CARD_LAST + STR_GAP;
  const UP_F = SEG0 + ROUTE.length * SEG_EVERY; // the last length is tied
  const DOWN0 = SLACK_F + 1;
  const DOWN_LAST = DOWN0 + (order.length - 1) * DOWN_EVERY;
  const SHUT0 = DOWN_LAST + SHUT_GAP;
  const SHUT_F = SHUT0 + CLOSE.length * HOLD;

  let phase = 'shut'; // shut · opening · up · closing
  let frame0 = -1e9;
  let cards = 0; // how many sheets are on the wall
  // A HELD DRAWING. `?silvia=<n>` and `?silvia=down<n>` pose the run at its nth drawing and stop the
  // clock's hand on it, which is the only way a tool can photograph the middle of a move that a
  // software renderer walks through four drawings at a time. Every other egg in this room has the
  // same hatch (`?vortex=`, `?cross=`, `?deck=`, `?konami=`) and for the same reason.
  let held = false;

  function showCards(n) {
    if (n === cards) return;
    cards = n;
    for (let i = 0; i < order.length; i++) order[i].mesh.visible = i < n;
  }

  // THE SCHEDULE, AND IT IS WRITTEN DOWN ONCE. Both of these take a drawing number and put the wall
  // where that drawing has it — no cues, no events, no state. update() calls them on the clock and
  // hangs the sound and the news off the DIFFERENCE they make; the tools call them directly to hold
  // a still. A schedule expressed twice is a schedule that drifts.
  function poseOpen(f, strike = 0) {
    const i = Math.floor(f / HOLD);
    setAngle(i < SWING.length ? SWING[i] : REST);
    showCards(f >= CARD0 ? Math.min(order.length, Math.floor((f - CARD0) / CARD_EVERY) + 1) : 0);
    drawString(f >= SEG0 ? Math.min(ROUTE.length, Math.floor((f - SEG0) / SEG_EVERY) + 1) : 0, 0, strike);
  }
  function poseClose(f, strike = 0) {
    // the string first: two drawings of slack, and then it is on the floor
    if (f < SLACK_F) drawString(ROUTE.length, (f + 1) / (SLACK_F + 1), strike);
    else drawString(0, 0, 0);
    const gone = f >= DOWN0 ? Math.floor((f - DOWN0) / DOWN_EVERY) + 1 : 0;
    showCards(Math.max(0, order.length - gone));
    if (f >= SHUT_F) setAngle(0);
    else if (f >= SHUT0) {
      const i = Math.floor((f - SHUT0) / HOLD);
      setAngle(i < CLOSE.length ? CLOSE[i] : 0);
    } else setAngle(REST);
  }

  function click() {
    if (phase === 'opening' || phase === 'closing') return false; // a run is a run; a second press is not a second one
    held = false;
    frame0 = ctx.clock.frame;
    if (phase === 'shut') {
      phase = 'opening';
      // the catch letting go, on the POINTER and not on the arrival: the hand is on the frame now
      ctx.pieces.sound?.play?.('latch');
    } else {
      phase = 'closing';
      ctx.pieces.sound?.play?.('rustle');
    }
    return true;
  }

  // for the tools and for setState: put the wall where it belongs with no cue and nothing to wait for
  function set(open) {
    phase = open ? 'up' : 'shut';
    frame0 = -1e9;
    held = false;
    setAngle(open ? REST : 0);
    showCards(open ? order.length : 0);
    drawString(open ? ROUTE.length : 0, 0, 0);
  }

  // …and one drawing of the run, held. `closing` counts from a board that is fully up.
  function hold(f, closing = false) {
    held = true;
    frame0 = -1e9;
    const k = Math.max(0, Math.round(f));
    if (closing) {
      poseClose(k);
      phase = k >= SHUT_F ? 'shut' : 'closing';
    } else {
      poseOpen(k);
      phase = k >= UP_F ? 'up' : 'opening';
    }
    return { f: k, closing, phase };
  }

  // ---- 6. the box on the glass -----------------------------------------------------------------------
  function boxOf(obj, half) {
    if (!obj) return null;
    obj.updateMatrixWorld(true);
    // …and the CAMERA's, which is not a formality: camera.cut() poses the camera and leaves the
    // render loop to fold that into matrixWorldInverse on the next frame, so a tool that cuts and
    // asks for a box in the same breath is otherwise told where this was BEFORE the cut.
    ctx.camera.updateMatrixWorld();
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const dx of [-half[0], half[0]]) for (const dy of [-half[1], half[1]]) for (const dz of [-half[2], half[2]]) {
      v.set(dx, dy, dz);
      obj.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // the LEAF's own box, which moves as it swings: the frame's rectangle taken in the leaf's space.
  const hitBox = () => boxOf(leaf, [w / 2, h / 2, 0.028 / 2]);
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const bw = Math.max(b.w, MIN_TAP), bh = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - bw / 2, y: b.y + b.h / 2 - bh / 2, w: bw, h: bh, grown: bw > b.w || bh > b.h };
  }
  // where a card is on the glass, as a pan: a tack on the right of the wall comes from the right
  function panOf(rec) {
    const b = rec ? boxOf(rec.mesh, [rec.mesh.geometry.parameters.width / 2, rec.mesh.geometry.parameters.height / 2, 0]) : null;
    const W = ctx.size?.w || window.innerWidth;
    if (!b || !W) return 0;
    return Math.max(-1, Math.min(1, ((b.x + b.w / 2) / W) * 2 - 1));
  }
  const sheetBox = (id) => {
    const rec = byId[id];
    if (!rec) return null;
    return boxOf(rec.mesh, [rec.mesh.geometry.parameters.width / 2, rec.mesh.geometry.parameters.height / 2, 0]);
  };

  // ---- 6b. ?silvia=<n> | ?silvia=down<n> -------------------------------------------------------------
  // A drawing of the run, held, for a tool that wants a still of the middle of it. Read once, at
  // build, so a reload of the same URL gives the same frame.
  {
    const asked = (ctx.params ?? new URLSearchParams(location.search)).get('silvia');
    if (asked != null && asked !== '') {
      const m = /^(down)?(\d+)$/i.exec(asked.trim());
      if (m) hold(+m[2], !!m[1]);
      else if (/^open$/i.test(asked.trim())) set(true);
    }
  }

  // ---- 7. the switches --------------------------------------------------------------------------------
  // The frame itself, always; and every sheet on the wall, but only while it is up — a card that is
  // not pinned to anything is not a switch, and nothing the visitor cannot see may answer a pointer.
  switches?.add?.({
    name: 'silvia',
    object: () => leaf,
    tapBox,
    enabled: () => phase === 'shut' || phase === 'up',
    onDown: () => click(),
  });
  for (const rec of sheets) {
    switches?.add?.({
      name: `silvia-${rec.id}`,
      object: () => rec.mesh,
      tapBox: () => sheetBox(rec.id),
      enabled: () => phase === 'up' && rec.mesh.visible,
      onDown: () => click(),
    });
  }

  return {
    get open() {
      return phase === 'up';
    },
    get phase() {
      return phase;
    },
    // how much of it is up, for the tools: which drawing of the swing, how many sheets, how many
    // lengths of string
    get progress() {
      return { phase, cards, segments: shownSegs < 0 ? 0 : shownSegs, degrees: +((-hinge.rotation.y * 180) / Math.PI).toFixed(1) };
    },
    red: STRING_RED,
    sheets: SHEETS.map((s) => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, kind: s.kind })),
    route: ROUTE.map((r) => [...r]),
    schedule: { swing: OPEN_SWING, card0: CARD0, cardEvery: CARD_EVERY, cardLast: CARD_LAST, seg0: SEG0, up: UP_F, slack: SLACK_F, down0: DOWN0, downLast: DOWN_LAST, shut0: SHUT0, shut: SHUT_F },
    toggle: click,
    click,
    set,
    // one drawing of the run, held with the clock's hand off it: `hold(12)` is the swing at its
    // sixth pose, `hold(6, true)` is the take-down six drawings in. What `?silvia=` does.
    hold,
    get held() {
      return held;
    },
    hitBox,
    tapBox,
    sheetBox,
    // `silvia-open` is the board complete: the leaf on its catch, eighteen sheets up, every length
    // of string tied. Every other name is a picture on a wall that nobody has touched, which is what
    // a reload always finds.
    setState(name = 'default') {
      set(name === 'silvia-open');
    },
    update(ctx2) {
      if (held || !ctx2.clock.stepped) return;
      const f = ctx2.clock.frame - frame0;
      if (phase === 'opening') {
        const was = cards;
        poseOpen(f, ctx2.clock.frame % 2);
        // one tack, one sheet. The cue is fired here and not on the pointer because THIS is when the
        // pin goes in; the pointer's own sound was the catch, a second earlier. And it is PANNED to
        // where that card is on the glass, by the room's own rule for a cue made by a thing the
        // visitor can see: project the object's box, take the centre of it across the frame as −1 to
        // +1 (panOf, above), so a pin driven on the right of the picture arrives from the right.
        // That is what keeps eighteen pins at four a second from arriving as one rattle.
        for (let k = was; k < cards; k++) ctx.pieces.sound?.play?.('tap', { gain: 0.5, pan: panOf(order[k]) });
        if (f >= UP_F) {
          phase = 'up';
          // the wall is finished, and this is the only thing it ever says. flow.js takes it where it
          // takes the globe's country: his line over the open field, and the field back under it.
          ctx.emit?.('props:silvia', { open: true });
        }
        return;
      }
      if (phase === 'up') {
        // nothing is happening and the string is still alive: re-struck on the step, like every
        // other held line in this film
        drawString(ROUTE.length, 0, ctx2.clock.frame % 2);
        return;
      }
      if (phase !== 'closing') return;
      const was = cards;
      poseClose(f, ctx2.clock.frame % 2);
      // a sheet coming off the wall is paper, not a pin: the cue is the rustle, and it is fired
      // every fourth one, because eighteen of them in three seconds is one long noise. It is hung
      // on CROSSING a multiple of four and not on landing on one: a software renderer walks through
      // three drawings between two frames and a test for equality simply steps over the cue.
      if (cards < was && Math.floor(cards / 4) !== Math.floor(was / 4)) ctx.pieces.sound?.play?.('rustle', { gain: 0.5 });
      if (f >= SHUT_F) {
        phase = 'shut';
        frame0 = -1e9;
        ctx.pieces.sound?.play?.('latch', { gain: 0.7 });
        ctx.emit?.('props:silvia', { open: false });
      }
    },
  };
}
