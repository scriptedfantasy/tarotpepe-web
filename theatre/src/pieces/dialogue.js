// PIECE: dialogue — what Tarot Pepe says and how it appears.
//
// The writing lives in ./script.js (all data). This file is the presentation.
//
// THE CARD. Every line Pepe says arrives on a drawn placard — a hand-cut card of the drawing's own
// paper, framed in one pen, like the sign the passenger holds up in the metro carriage of the Aline
// sequence (reference/fd-anim-metro-carriage.png). This is the user's decision and it is settled
// (BRIEF.md); a critic once had it removed in favour of free-floating type and the user asked for
// the card back. It is drawn in dialogue-ink.js: a deckled edge that bows and bites and four
// strokes that cross at every corner. Nothing is ruled inside it (the user's word: "the chatbox was
// also nicer when it was just plain text - without the dividers inside the text pannel").
//
// AND IT IS ONE OBJECT. One width for a given frame (46% of it, ~90% on a phone, never under
// 300 px), one height, one place, whatever is written on it. A line too long for its well does not
// stretch the card: it is cut into TAKES at its own clauses and the takes are played into the same
// card. See WELL_LINES, `measure`, `splitTakes`.
//
// TWO REGISTERS, BOTH ALWAYS THERE (round 6). The card is not his caption with the visitor tacked
// underneath; it is a conversation between two people and the drawing says so without a word of
// labelling. The upper register — two lines — is HIS. The lower register — two lines — is the
// VISITOR'S, and it is standing there, empty, before they have typed a character, so there is never
// a moment when it is unclear where their words will go. Nothing moves when the turn changes: the
// card is the same object, the same height, in the same place, all evening.
//
// AND NOBODY IS NAMED. Round 5 lettered TAROT PEPE over the first line of a beat and left it off
// the rest, which the user saw at once — "sometimes it says tarotpepe … it should say tarotpepe at
// all" — and then decided the other way: "we dont need tarotpepes name over every line - i prefer
// it actually without - we only need a distinction between what tarotpepe said and what the user
// says. maybe with a color?"
//
// ROUND 7: THE TYPE ITSELF CARRIES IT. Round 6 answered that with a speaker's dash at the head of
// each register — his laid in his green, the visitor's a single ink stroke — and kept both
// sentences in ink, because #69b964 on the paper measures 2.28:1 and a sentence cannot be set in
// it. The user looked at that and asked for the simpler thing: "rather then having the green and
// black line in the chatbox - just make pepes font green - and users font black, lines not
// needed". So the dashes are gone and:
//
//   · HIS WORDS ARE GREEN and the VISITOR'S ARE INK, and that is the whole of the distinction;
//   · the green is HIS green taken down until it can be read — PEPE_GREEN below, the same hue and
//     saturation as SKIN #69b964 with the lightness walked from 56% to 34%. It measures 5.13:1 on
//     the paper against #69b964's 2.28:1, so a 13 px capital on a phone is type and not a stain.
//     It is still the one colour in this film that means him: no third colour is introduced;
//   · both lines are set in one face at one weight: only the colour tells the two voices apart;
//   · the blinking caret is in the visitor's register and nowhere else: whoever the caret is with
//     has the pen. It is a pen stroke, not a dash, and it stayed.
//
// ONE VOICE OF TYPE, ONE HAND OF LETTERING, and nothing else on the card:
//   · the words — his line and the visitor's alike — are the typewriter serif, capitals, tracked,
//     the film's own face for labels beside a figure (STYLE.md §1.7, `fd-anim-cast-labels-van`);
//   · a card's NAME in an intertitle is LETTERED, in the small hand-cut alphabet of titles-sign.js,
//     drawn on a canvas. Nothing inside the drawing is set in a system font (the checklist's rule 7).
//
// Placement. `anchors` names a spot per camera shot — {shot: {x, y, w, floor}} — and every shot has
// the same one: centred at the foot of the frame, where a film puts its subtitles. See ANCHORS.
// ONE beat is excepted, by the user, and only one: while the spread is out and the visitor is
// choosing a card, the same card stands at the TOP of the frame instead. See THE DOCK, below.
//
// The visitor's answer is drawn, not typed into a form: the same face, in their own two-line
// register, with an ink dash for a caret that blinks on the 12 fps clock. Past two lines their
// register rolls — the head of their sentence rides out of it, a whole line at a time — and the
// card does not grow. A hidden input takes the real keystrokes and nothing else. Their words are
// theirs only while they are writing them: the register empties
// the moment they press Return (the user: "the user knows what they typed they only need to see it
// as they type, not after"), but it stays RESERVED, so the card never changes shape.
//
// ROUND 8: A LINE IS RESOLVED, AND SEPARATELY IT IS CLEARED — AND THEY ARE NO LONGER THE SAME
// EVENT. The user: "the chat box as it is now sometimes the text disappears too fast." Until this
// round a caption was cut by a stopwatch: `say` typed the line, held it `hold` seconds, and took it
// off the paper, so a sentence the visitor had not finished reading went while they were reading
// it. A subtitle card does not fade on a clock. (The user chose this over rolling the lines
// upward, so there is no scroll here and there is not going to be one.)
//
// The two halves are now separate:
//
//   RESOLVED — unchanged, to the millisecond. `say()`'s promise still settles at
//     start + length/CPS + hold, because
//     flow.js sequences the whole evening off those promises: `render` awaits one before it plays
//     the next sentence, `speak` counts them, the readings loop and `revisit` pace their cuts by
//     them. Nothing about the timing contract moved.
//   CLEARED — his line is not taken off the paper by that promise at all. It STANDS in his
//     register until something replaces it: his next sentence, a card's intertitle, the thinking
//     mark below, or `clear()`. `finish()` resolves; only `show()`, `intertitle()` and `cut()`
//     clear. That distinction is the whole round.
//
// So the card carries his last words through every silence in the evening: the wash (he says one
// line over his hands and works four seconds in silence — the line is still there), the pick
// prompts (the prompt stands over the whole pick, docked at the head of the frame), the beat
// between two of his sentences, the readings. `keep` is accepted and does nothing: everything
// keeps now.
//
// WHAT ENDS HIS LINE, EXACTLY. His next mark on the card, and nothing else — where "his next mark"
// includes the thinking dots. The visitor pressing RETURN does not clear it either: it un-holds it
// (their turn is over, his is beginning), and 250 ms later the dots take the register. So the
// question they answered is in front of them for the whole time they are answering it, which is
// what the two registers were built for. The visitor's FIRST KEYSTROKE was the other candidate and
// it is wrong: it would take the question away at the exact moment they start answering it. The
// field OPENING is wronger still — `ask` says the prompt and opens the field under it in the same
// breath, so that would erase the line as it arrived.
//
// AND A MARK WHILE HE WRITES (round 8, the user, on latency: "i think we can solve this latency
// problem by adding an animation to the chat box when Taro Pepe thinks"). Three dots in his
// register, struck one at a time on the 12 fps clock, drawn with the pen (dialogue-ink.js,
// drawDots) and laid in his green. They come up only when a turn is actually pending — flow is in
// a beat where the visitor is waiting on WORDS from him and his register is empty — and only after
// a quarter of a second of it, so an answer that arrives at once never flashes them. His first
// sentence takes the register back. See THE THINKING MARK.
//
// API (ctx.pieces.dialogue):
//   say(text, {hold, keep}) → Promise          reveals a caption, resolves after it has been read
//                                              (and leaves it standing until the next one). A line
//                                              that does not fit the well is cut into takes and the
//                                              promise settles on the LAST of them — so a line the
//                                              visitor is still turning through has not been said
//                                              yet, and nothing downstream of it happens early
//                                              (see THE ARROW; TAKE_WAIT is the backstop)
//   ask(prompt, {respond, signal, timeout, value, instant}) → Promise<string|null>
//                                              says the prompt, opens the visitor's block, resolves
//                                              with the text on Return ('' on Escape); null when
//                                              the signal aborts or `timeout` seconds pass; `instant` shows
//                                              the prompt at once (judging stills); `value` pre-fills it
//   skip()                                     the visitor's gesture: the take typed out in full,
//                                              then (again) the next take of the line — one at a time
//   asking                                     true while the visitor's block is up
//   reply(answer) → string                     the line that folds the answer back, verbatim
//   intertitle(slug, position, {hold})         the card's held title, on a card of its own
//   read(slug, position) → Promise             intertitle, then the card's lines
//   folio(beat)                                names the beat (greeting, question, ...) — it no
//                                              longer decides anything on the card; it is the
//                                              event other pieces listen for
//   lineFor/linesFor(slug, position)           the card's lines for that position
//   thinking(on)                               the three dots, asked for directly (see the contract note)
//   clear()                                    cuts whatever is up — the only thing that takes a
//                                              line off the card without putting another in its place
//   anchors                                    {shot: {x, y, w, floor}} — editable; flow.js sets the same
//   setState(name)                             greeting | question | reading | thinking | farewell (+ any script key)
import { SCRIPT, lineFor, linesFor, reply as scriptReply, POSITIONS, positionKey } from './script.js';
import { bySlug } from '../core/deck.js';
import { INK } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { SVGNS, drawCaret, drawDots, drawArrow, drawPlacard, drawName, CAN_LETTER, PLACARD_BLEED } from './dialogue-ink.js';

export const meta = {
  name: 'dialogue',
  judge: { shot: 'pepe', states: ['greeting', 'question', 'reading', 'thinking', 'farewell'], dom: true },
  files: ['src/pieces/dialogue.js', 'src/pieces/dialogue-ink.js', 'src/pieces/script.js'],
};

const CPS = 28; // characters per second; words appear whole, on the 12fps clock
const INTER_HOLD = 1.5; // seconds a card's intertitle is held
const BAR = 0.07; // the titles piece's letterbox bar, fraction of the frame
const BLINK = 6; // frames the caret is on, then off (12fps → half a second each)

// THE CARD IS ONE OBJECT, AND IT DOES NOT RESIZE. Round 3 shrink-wrapped it to each line — 700 px
// for one sentence, 560 for the next, 980 for the one after — so under a table that never moved the
// card grew and shrank like a browser element and re-cut itself mid-conversation. A film's
// lower-third is a physical card: one width, one height, and the type is SET INTO it. So:
//
//   · the measure is a fraction of the frame and nothing else (46% wide, ~90% on a phone);
//   · his words live in a WELL of exactly two lines, always two lines tall whether one word or
//     twenty-two are in it;
//   · the visitor's REGISTER under it is another two lines, reserved in exactly the same way and
//     standing there empty before they have typed anything — round 6's fault was that their turn
//     had no place of its own and took whatever his line had left over;
//   · a line too long for the well is not allowed to stretch the card. It is CUT INTO TAKES and
//     the takes are played into the same card, one after the other, the way a subtitle changes
//     while the card it is set in does not. (The alternative — hold the line and let the card
//     grow — is the fault we are fixing.) Each take FILLS the well — both lines of it, to the last
//     word that fits — and the visitor turns to the next one when they are ready: see splitTakes
//     and THE ARROW.
const WELL_LINES = 2; // his register, in lines of type. The whole point: it never changes.
const REPLY_LINES = 2; // the visitor's register. Reserved whether or not there is a word in it.
const REGISTER_GAP = 0.4; // the paper between the two registers, in ems. Not a rule: a gap.
const LINE_H = 1.5; // the leading, as a multiple of the type size (and the CSS line-height)
// ---- THE ARROW, AND THE END OF THE STOPWATCH -------------------------------------------------
// Round 9, the user: "he switches over a bit too fast ... at the end, when he has filled the second
// line, add a little arrow for the user to click next when he's ready." A take that is not the last
// of its line used to be replaced 0.55 s after its last word landed, whether it had been read or
// not. It is not replaced on a clock any more: when the take is typed out and there is more of the
// sentence behind it, a drawn arrow comes up at the corner of the card (dialogue-ink.js, drawArrow)
// and the next take waits for the visitor — the arrow, a click anywhere on the card, Space, Return.
//
// AND THE EVENING STILL CANNOT HANG. A visitor who never clicks is not a visitor who stops the
// show: the take takes itself off after TAKE_WAIT, which is eleven times the hold it replaces and
// about twice as long as an unhurried second reading of two lines of type. The arrow is an
// invitation to take your time, not a gate.
const TAKE_WAIT = 6; // seconds a full take waits for the visitor before it moves on by itself
// What the mouth is told, since the true length of a line is now the visitor's business: the typing
// plus an unhurried beat between one take and the next. He finishes the sentence at a human pace
// and then holds; he does not mouth along with somebody else's reading speed.
const TAKE_PACE = 1.1;
const PHONE = 700; // frames narrower than this are a phone: the card takes nearly the whole width
// The type floor (BRIEF.md: nothing lettered below 13 px). The caption face is clamped there.
const FONT_MIN = 13;

// ---- THE THINKING MARK -------------------------------------------------------------------------
// Three dots in his register while a turn of his is in flight. The numbers, all of them measured:
//
//   · a turn against the live model (openrouter / gpt-5.6-luna) takes 2.6–4.1 s from the visitor's
//     Return to his first sentence — flow awaits mind.turn(), which reads the WHOLE turn before it
//     hands anything back, so the wait is the turn and not its first token;
//   · a quarter of a second of it passes before the pen touches the card, so a script answer (which
//     arrives inside a frame) never flashes a mark nobody had time to read;
//   · a dot every three stepped frames, then four frames of the three of them standing, then the
//     paper is wiped and the hand starts again: 13 frames, 1.08 s, a cycle you can count.
const THINK_WAIT = 0.25; // seconds a turn must be pending before the first dot is struck
const THINK_STEP = 3; // stepped frames between one dot and the next (12 fps → 0.25 s each)
const THINK_REST = 4; // ... and the three of them held before the hand starts again
const THINK_CYCLE = 3 * THINK_STEP + THINK_REST;
// WHEN A TURN IS PENDING, and this is the honest part of it. `mind` has no flag of its own to read
// and dialogue may not reach into it, so the signal is flow's own published beat (flow.js: `beat`
// is in its API) — and there are exactly two beats in which the visitor is waiting on WORDS from
// him with nothing else happening on the screen:
//
//   reply     the visitor has said something and flow is inside `listen()`, awaiting mind.turn().
//             This is the 2.6–4.1 s the round is about. The beat holds while the turn is played,
//             so the mark's OTHER condition — his register is empty — is what ends it: his first
//             sentence takes the card back.
//   greeting  the first turn of the evening, where the card has never been up at all.
//
// Every other beat has the room doing something instead of him talking, and a mark there would be
// a lie: `shuffle` and `fan` are his hands in the cards (the user cut the scripted lines over the
// wash — a keyless evening plays it in silence, with nothing on the card at all), `reading` and
// `recall` stand under the card's own lettered intertitle, which is a better thing to look at than
// three dots. The contract note in the return value asks flow for an explicit `thinking()` instead.
const THINKING_BEATS = ['greeting', 'reply'];
// A plate with no room in it. The evening ends `cut('door')` → the closing card, and a line that is
// standing (rather than being said) has no business hanging over the drawn door.
const BARE_SHOTS = ['door', 'threshold'];

// HIS GREEN, AS TYPE. The user: "just make pepes font green - and users font black".
//
// Pepe's skin is SKIN #69b964 (pepe.js) — hsl(116 38% 56%) — and on the paper #f8f9f4 it measures
// 2.28:1. That is not a contrast a sentence can be set at: 4.5:1 is the floor for a 13 px caption
// and 3:1 the floor for a mark that is not even text. A colour nobody can read is not his colour,
// it is a stain, so the green is taken DOWN — the same hue, the same saturation, the lightness
// walked from 56% to 34% — until it holds:
//
//     #69b964  hsl(116 38% 56%)  2.28:1   his skin; unreadable as type
//     #3a7736  hsl(116 38% 34%)  5.13:1   the same green, in the shade. What is shipped.
//
// It is a darker shade of the one colour that already means him, not a second colour: BRIEF.md's
// selective-colour rule is intact (only Pepe and the card faces carry colour) and nothing else on
// the card is coloured. The visitor's words stay INK #0d0e0d, 18.28:1.
const PEPE_GREEN = '#3a7736';
// The SAME weight as the visitor's line. Round 7 cut his a step heavier (700 against 600) on the
// argument that a coloured glyph at 13 px carries less ink than a black one — true, but the user
// saw the difference immediately and read it as an inconsistency rather than as compensation: "the
// green is good but the font weight seems different then the users font?". Two people talking in
// one card are set in one face at one weight; only the colour tells them apart. The green is dark
// enough (#3a7736, 5.13:1) not to need the help.
const PEPE_WEIGHT = 600;

// ---- THE DOCK ---------------------------------------------------------------------------------
// The card is bottom-centred all evening — the user's settled decision — with ONE exception, also
// the user's: "attach the caption card to the top during the card picking process" (BRIEF.md,
// 2026-09-05). The reason is measured, not aesthetic: on a 390 px phone the card standing at the
// foot covered 83 of the 170 px the spread occupies — half the cards the visitor is being asked to
// choose between — and the camera cannot open a gap for it, because the plate is bound by
// disc-centring and the rug line and the spread runs to within 5 cm of the table's rim.
//
// So while the spread is out and the visitor is choosing, the SAME card — same measure, same two
// registers, same drawn edge, same type; only its anchor moves — stands at the top of the frame.
// The moment the third card is taken it is back at the foot.
//
// The line it hangs from: the same 5.5% margin the floor keeps at the bottom, and never inside a
// letterbox bar.
const HEAD = 0.055;
// How it moves. It is paper in a stop-motion film: it does not slide and it does not fade. When
// the camera cuts on the same step it is simply in its new place on the new frame — a cut hides a
// move, and every entry into and out of the picking frames IS a cut. When nothing else moved the
// frame (the third card landing in its slot, which is what ends the beat), the card is re-laid in
// three drawings on the twos, the way a hand would shift a card under a rostrum camera.
const DOCK_STEPS = 3;
// The frames the spread is actually in. `pepe` and `home` are cut to inside the picking stretch
// (the reaction beat between two picks) and the card belongs at the foot in those, because there
// is no spread in them to cover — the exception is for the shot, not for the stopwatch.
const SPREAD_SHOTS = ['fan', 'spread'];

// WHERE THE CARD STANDS. Centred at the foot of the frame, in every shot, the way a film puts its
// subtitles — the user's own decision, and the whole of it:
//
//   "if the text box were always centered at the bottom, that may look more logical - its where
//    movies have their captions too for example"
//
// So this table has one anchor in it, wearing every shot's name. It reverses the earlier rounds
// that measured the barest passage of paper in each shot and stood the words there (on the plaster
// over his head in the mediums, on the cloth in the top-downs): a card that lands somewhere else in
// every shot is a card that jumps about the screen all evening, and an opaque card needs no bare
// paper under it anyway. flow.js sets the same anchor at runtime; the two tables agree.
//
// The contract: `x` is the centre, `y` the TOP of the block and `floor` the lowest line its bottom
// edge may reach, all fractions of the frame. A `y` BELOW the floor hangs the block by its BOTTOM
// edge instead — every caption, of one line or of five, stands on the same line of the picture and
// grows upwards. `w` is the measure, recomputed for the window's width (see `measure`).
const CAPTION = { x: 0.5, y: 0.99, floor: 0.945 };
const SHOTS = ['home', 'wide', 'pepe', 'table', 'spread', 'fan', 'turn', 'riffle', 'deck', 'card0', 'card1', 'card2', 'door', 'window', 'threshold'];
const ANCHORS = {};
// The measure: a fraction of the frame, and NOT a function of what is written on the card. 46% of
// a cinema frame (never under 300 px of paper), nine tenths of a phone's — where 46% of 390 px
// would be nine characters a line. Nothing else feeds it: the same window gives the same card
// however long the sentence.
function measure(w) {
  if (w <= PHONE) return 0.9;
  return Math.max(0.46, Math.min(0.7, 300 / Math.max(1, w)));
}
function setAnchors(w) {
  const a = { ...CAPTION, w: measure(w) };
  for (const shot of SHOTS) ANCHORS[shot] = { ...a };
}
setAnchors(typeof window === 'undefined' ? 1600 : window.innerWidth || 1600);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function buildStyle() {
  const style = document.createElement('style');
  style.textContent = `
    #dialogue {
      color: ${INK}; -webkit-font-smoothing: antialiased;
      --typewriter: 'American Typewriter', 'Rockwell', 'Courier New', 'Georgia', serif;
    }
    /* THE CARD. One voice of type on it and one only: the typewriter serif, capitals, tracked —
       his line and the visitor's own words are set exactly alike, as a film's subtitles are. The
       only other lettering on the card is DRAWN (the sign hand, on a canvas), never set. */
    #dialogue .cap {
      position: absolute; left: 50%; transform: translate(-50%, 0);
      box-sizing: border-box; text-align: center;
      padding: 0.86em 1.3em 0.9em;
      font-family: var(--typewriter);
      font-size: clamp(${FONT_MIN}px, 1vw, 20px); line-height: 1.5;
      letter-spacing: 0.085em; text-indent: 0.085em; text-transform: uppercase;
      font-weight: 600; color: ${INK};
    }
    #dialogue .cap.narrow { padding-left: 0.8em; padding-right: 0.8em; }
    #dialogue .cap.mid { top: 50%; transform: translate(-50%, -50%); }
    /* THE TWO REGISTERS — the fixed compartments the type is set into: his above, the visitor's
       below, both reserved before a word is written, so the card is the same object on every line
       of the evening and nothing moves when the turn changes. */
    #dialogue .cap .inner {
      height: calc(${(WELL_LINES + REPLY_LINES) * LINE_H + REGISTER_GAP}em);
      display: flex; flex-direction: column;
    }
    #dialogue .cap .well {
      height: calc(${WELL_LINES} * ${LINE_H}em); overflow: hidden;
      display: flex; flex-direction: column; justify-content: flex-end;
    }
    #dialogue .cap .reply {
      height: calc(${REPLY_LINES} * ${LINE_H}em); overflow: hidden; margin-top: ${REGISTER_GAP}em;
      display: flex; flex-direction: column; justify-content: flex-start;
    }
    /* what is in a register keeps its own height and the register clips it — never squeezed */
    #dialogue .cap .well > *, #dialogue .cap .reply > * { flex: 0 0 auto; }
    /* an intertitle is not a conversation: its title takes the whole of the same inner block */
    #dialogue .cap .title {
      height: 100%; display: flex; flex-direction: column; justify-content: center;
    }
    /* the measuring block: the same card, the same measure, the same face, off the paper */
    #dialogue .cap.ruler {
      left: -30000px; top: 0; bottom: auto; transform: none;
      visibility: hidden; pointer-events: none; height: auto;
    }
    /* the drawn card the words stand on (the user asked for it back; see BRIEF.md) */
    #dialogue .cap > svg.placard {
      position: absolute; left: -${PLACARD_BLEED}px; top: -${PLACARD_BLEED}px; z-index: 0;
      overflow: visible; display: block; pointer-events: none;
    }
    #dialogue .cap > * { position: relative; z-index: 1; }
    #dialogue .cap .g { display: inline-block; }
    #dialogue .cap .w { white-space: nowrap; }
    #dialogue .cap .line .w.hid { visibility: hidden; }
    /* the card's title: its name lettered, the numeral and the position set small */
    #dialogue .cap .n { font-size: 0.72em; letter-spacing: 0.42em; text-indent: 0.42em; font-weight: 600; line-height: 1.5; }
    #dialogue .cap .name { display: block; line-height: 0; margin: 0 auto; }
    #dialogue .cap .name > canvas { display: block; margin: 0 auto; }
    #dialogue .cap .pos { font-size: 0.72em; letter-spacing: 0.32em; text-indent: 0.32em; font-weight: 600; line-height: 1.5; }
    /* HIS LINE — the one green thing on the card, and the only thing that says the words are his.
       The colour is on the .line itself, which is also what the ruler measures, so the heavier cut
       is counted before a take is set into the well and a green line never overruns its register. */
    #dialogue .cap .line { margin: 0; color: ${PEPE_GREEN}; font-weight: ${PEPE_WEIGHT}; }
    /* the visitor's own words: the same face, the same size, the same case, on the same line grid —
       and INK, because they are the one person in this room who is not drawn and not coloured */
    #dialogue .cap .answer {
      font-size: 1em; font-weight: 600; letter-spacing: 0.085em; text-indent: 0.085em;
      line-height: 1.5; word-break: break-word; margin: 0; color: ${INK};
    }
    /* THE THINKING MARK: three dots on the line his words will be set on. It is one line of his
       register — the well is bottom-aligned, so the dots stand exactly where the last line of a
       sentence of his would — and it is drawn, not set: the svg is struck by drawDots on every
       stepped frame. */
    #dialogue .cap .think { height: ${LINE_H}em; }
    #dialogue .cap .think > svg { display: block; margin: 0 auto; width: 3.05em; height: ${LINE_H}em; overflow: visible; }
    /* the caret stands on the line; its box keeps drawCaret's own proportion so the nib lands
       exactly on the baseline whatever size the card is set at */
    #dialogue .cap .caret { display: inline-block; width: 0.53em; height: 1.15em; vertical-align: baseline; margin-left: 0.12em; }
    #dialogue .cap .caret > svg { display: block; width: 100%; height: 100%; overflow: visible; }
    #dialogue .cap .caret.off { visibility: hidden; }
    /* THE ARROW: the mark at the card's bottom-right corner while the rest of a sentence waits.
       It is a hand-drawn stroke on a transparent button, and the BUTTON is bigger than the mark —
       38 px on a laptop, never under 34 on a phone — so a thumb has something to land on. It sits
       inside the card's own corner, below the visitor's register and clear of the caret (which
       cannot be up at the same time: a take never waits while the field is open). */
    #dialogue .cap .next {
      position: absolute; right: 0.35em; bottom: 0.15em; z-index: 3;
      /* a button carries the browser's own 13.3 px font unless it is told not to, and every
         measurement on this card is an em of the card's type: take the card's face */
      font: inherit; letter-spacing: normal;
      width: max(34px, 2.4em); height: max(34px, 2.4em);
      display: flex; align-items: center; justify-content: center;
      padding: 0; margin: 0; border: 0; background: transparent; appearance: none; outline: 0;
      pointer-events: auto; cursor: pointer;
    }
    #dialogue .cap .next[hidden] { display: none; }
    #dialogue .cap .next > svg { display: block; width: 2.1em; height: 1.45em; overflow: visible; }
    /* while the arrow is up the card itself takes the clicks, so a tap ANYWHERE on it advances */
    #dialogue .cap.waiting { pointer-events: auto; cursor: pointer; }
    /* the keystrokes land here and nowhere else; nothing of it is ever seen */
    #dialogue .cap .keys {
      position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 2;
      pointer-events: auto; opacity: 0; border: 0; padding: 0; margin: 0; background: transparent;
      font: 16px var(--typewriter); color: transparent; caret-color: transparent; appearance: none; outline: 0;
    }
  `;
  return style;
}

// Hand-set type: every glyph sits a hair off its baseline and a fraction of a degree off upright,
// the way a line of hand-set slugs does. Small — the film's labels are set type, not lettering.
const jitter = (dy, rot) => `transform:translateY(${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
function letters(word, rng) {
  return [...word].map((ch) => `<span class="g" style="${jitter((rng() - 0.5) * 0.7, (rng() - 0.5) * 1.1)}">${esc(ch)}</span>`).join('');
}
function glyphs(text, rng) {
  return text
    .split(' ')
    .map((w) => `<span class="w">${letters(w, rng)}</span>`)
    .join(' ');
}
// The same, but keyed to each character's place in the string, so the jitter of a letter never
// changes as the visitor types more after it.
function stableGlyphs(text) {
  let i = 0;
  return text
    .split(' ')
    .map((w) => {
      const inner = [...w]
        .map((ch) => {
          const h = Math.sin((i++ + 1) * 12.9898 + ch.charCodeAt(0) * 0.317) * 43758.5453;
          const f = h - Math.floor(h);
          return `<span class="g" style="${jitter((f - 0.5) * 0.7, (f * 7919) % 1 > 0.5 ? 0.45 : -0.45)}">${esc(ch)}</span>`;
        })
        .join('');
      i++;
      return `<span class="w">${inner}</span>`;
    })
    .join(' ');
}

// The line as word spans, all present from the start (hidden) so the rag never moves and no empty
// space is ever shown waiting for words — EXCEPT the first word, which is inked from the start.
// A critic caught the card standing empty in two stills out of twenty-four: not a hang (a 1000-
// sample probe found no blank stretch over 0.1 s) but the single frame between the card being
// drawn and the clock's first tick. The card and its first word now arrive together.
function wordMarkup(text) {
  const rng = mulberry32(17 + text.length * 7);
  return text
    .split(' ')
    .map((w, i) => `<span class="w${i ? ' hid' : ''}">${letters(w, rng)}</span>`)
    .join(' ');
}

const ORDINAL = ['The first card', 'The second card', 'The third card'];

export async function build(ctx) {
  const root = ctx.dom.dialogue;
  document.head.appendChild(buildStyle());
  setAnchors(ctx.size?.w || window.innerWidth || 1600);

  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.hidden = true;
  root.appendChild(cap);

  // THE ARROW. One element for the whole evening — it is moved into each fresh inner block rather
  // than rebuilt, so the mark keeps its identity and a tap that lands as the card is re-set still
  // lands on the same button. It is a real button (a thumb, a Tab, a screen reader) wrapped round a
  // drawn stroke; the stroke is what is seen.
  const arrow = document.createElement('button');
  arrow.type = 'button';
  arrow.className = 'next';
  arrow.hidden = true;
  arrow.setAttribute('aria-label', 'Read on');
  arrow.title = 'Read on';
  const arrowSvg = document.createElementNS(SVGNS, 'svg');
  arrowSvg.setAttribute('aria-hidden', 'true');
  arrow.appendChild(arrowSvg);

  let typing = null; // { words, start, hold, done, keep, chars }
  let inter = null; // { until, done }
  let field = null; // { input, answer, caret:[el], submit, dispose }
  let beat = 'idle';
  // ROUND 8. `standing` is the whole of the new state: there are words of HIS on the card — being
  // typed, or long since read and simply still there. It is set the moment a line is put into the
  // well and unset by the three things that take his words off it: a cut, the visitor sending a
  // line of their own (their Return ends his turn on the card, not their first keystroke), and the
  // thinking mark taking the register.
  let standing = false;
  let think = null; // { svg, at } the thinking mark, while it is up
  let thinkForced = false; // the judging still asks for it directly
  // when he began owing the visitor a line; 0 = he owes nothing. It is kept on the WALL clock and
  // not on `ctx.clock.raw`, which is only sampled once a rendered frame: the arming happens inside a
  // keydown, and on a machine drawing at four frames a second a stale `raw` would let the quarter
  // second elapse instantly and flash the mark at an answer that was about to arrive anyway.
  let owedAt = 0;
  let wasPending = false;
  const nowS = () => performance.now() / 1000;
  // What is standing in the VISITOR's register. In the running film this is only ever what they are
  // typing at that moment: it is cleared when they press Return, and the reserved empty register is
  // what the card shows while he answers.
  let lastAnswer = '';

  // ---- placing the block ------------------------------------------------------------------------
  const shotName = () => ctx.pieces.camera?.current ?? 'home';
  // How tall the letterbox bar is right now (fraction of the frame), from either piece that draws one.
  function barFrac() {
    const ratio = ctx.pieces.ink?.params?.letterbox;
    if (ratio) return Math.max(0, (1 - ctx.size.w / ctx.size.h / ratio) / 2);
    const bar = ctx.dom.letterbox?.querySelector?.('.bar.bottom');
    return bar && bar.offsetHeight > 0 ? BAR : 0;
  }
  // Put the card on its anchor for the current shot. Its width is the anchor's measure and its
  // height follows from the row and the well — both fixed — so there is nothing here to measure and
  // nothing that a longer sentence can move. The anchor's `y` is the TOP of the block; a `y` below
  // the `floor` (which is every shot: 0.99 against 0.945) hangs the card by its BOTTOM edge on the
  // floor line instead, so the card stands on the same line of the picture all evening.
  let anchored = false; // true only on the rare top-anchored path, where fit() still has work
  let cardW = 0; // the card's width in px right now — the ruler is cut to the same measure
  function place() {
    const a = ANCHORS[shotName()];
    const W = ctx.size?.w || root.clientWidth || window.innerWidth || 1600;
    const mid = !!a && a.at === 'centre';
    cap.classList.toggle('mid', mid);
    cap.classList.toggle('narrow', W <= PHONE);
    // The MEASURE is this piece's own — it is typography, not staging — and an anchor may only ask
    // for a WIDER card, never a narrower one. flow.js keeps a copy of the old character-counting
    // measure and sets `w` from it at runtime; it lands under this floor at every size, so it no
    // longer decides anything. (Contract note in the return value: that copy should go.)
    // ... and never narrower than 300 px of paper, whatever the window does
    cardW = Math.round(Math.max(Math.max(measure(W), a?.w ?? 0) * W, Math.min(W - 16, 300)));
    cap.style.width = `${cardW}px`;
    cap.style.maxWidth = 'none';
    cap.style.left = `${(a?.x ?? 0.5) * 100}%`;
    if (mid) {
      anchored = false;
      cap.style.top = '';
      cap.style.bottom = '';
      return;
    }
    // THE DOCK. The one beat the card does not stand at the foot: the spread is out and the visitor
    // is choosing, so the same card hangs from the head of the frame instead, by its TOP edge, on
    // the same margin the floor keeps at the bottom. Nothing else about it changes.
    if (docked) {
      anchored = true;
      lastBar = barFrac();
      cap.style.bottom = '';
      cap.style.top = `${(headFrac() * 100).toFixed(3)}%`;
      return;
    }
    const floor = Math.min(a?.floor ?? 0.945, 1 - barFrac() - 0.028);
    lastBar = barFrac();
    if (!a || a.y > floor) {
      anchored = false; // hung by the bottom edge: nothing left to fit
      cap.style.top = 'auto';
      cap.style.bottom = `${((1 - floor) * 100).toFixed(3)}%`;
    } else {
      anchored = true;
      cap.style.bottom = '';
      cap.style.top = `${a.y * 100}%`;
    }
  }
  let lastBar = -1;
  // The only case left for fitting: an anchor that hangs the card by its TOP edge and would push
  // it past the floor. The bottom-hung anchor every shot uses cannot, so this is a no-op there.
  function fit() {
    if (!anchored || cap.hidden || docked) return; // docked: place() put it on the head line
    const h = ctx.size.h || window.innerHeight;
    const a = ANCHORS[shotName()];
    const lo = h * 0.035;
    const hi = h * Math.min(a?.floor ?? 1, 1 - barFrac() - 0.028);
    const r = cap.getBoundingClientRect();
    let top = r.top;
    if (r.bottom > hi) top = Math.max(lo, top - (r.bottom - hi));
    if (top < lo) top = lo;
    if (Math.abs(top - r.top) > 0.5) cap.style.top = `${(top / h) * 100}%`;
  }

  // ---- the dock: the one beat the card does not stand at the foot -------------------------------
  //
  // WHICH BEAT, exactly. The camera is in a frame the spread is IN — `fan`, which is the shot every
  // one of reveal's spread states resolves to (reveal.js SHOT: fan · fanning · pick · gather ·
  // deal), or `spread` — and fewer than three cards have been taken. That is the whole of flow's
  // `pickThree`, which is the stretch that awaits `reveal.awaitPick()`: the fan coming out, each
  // pick prompt, a re-ask after an answer that named no card, and Pepe choosing for a visitor who
  // will not choose.
  //
  // HOW THE END IS DETECTED: `reveal.picks.length` reaching three. That is the frame the third card
  // lands in its slot — before the gather, before the cut to `turn` — and from it the card is back
  // at the foot for the readings and everything after them. The other way out is the camera leaving
  // the spread: flow cuts to `pepe` for a held reaction between two picks, and the card goes to the
  // foot for that, because a frame with no spread in it has nothing for the card to cover. (The
  // caption is cut and re-stood across that reaction anyway, so nothing is seen to move.)
  //
  // The picks are reset by reveal's own `fan.clear()` at the head of every shuffle, so a second
  // reading docks again exactly as the first did.
  let docked = false;
  let travel = 0; // drawings left in a re-lay; 0 while the card is standing still
  let travelFrom = 0, travelTo = 0;
  let lastShot = null;
  const headFrac = () => Math.max(HEAD, barFrac() + 0.028);
  function picking() {
    if (!SPREAD_SHOTS.includes(shotName())) return false;
    const R = ctx.pieces.reveal;
    return !!R && (R.picks?.length ?? 0) < 3;
  }
  // A card that is being stood up fresh simply arrives where it belongs — there is no move to see,
  // because there was nothing on the paper a moment ago. show() and intertitle() call this before
  // they place, so a still is never caught at the foot on a frame the spread is out in.
  function syncDock() {
    docked = picking();
    travel = 0;
    lastShot = shotName();
  }
  // Re-lay a card that is ALREADY standing. It is paper in a stop-motion film, so it neither slides
  // nor fades: if the camera cut on this same step it is simply in its new place on the new frame
  // (a cut hides a move, and every entry into and out of the picking frames is a cut), and
  // otherwise it walks there in DOCK_STEPS drawings on the twos — a quarter of a second, three
  // positions, the way a hand shifts a card under a rostrum camera.
  function relay(next, onCut) {
    const before = cap.hidden ? null : cap.getBoundingClientRect().top;
    docked = next;
    travel = 0;
    place();
    if (cap.hidden || before == null || onCut) return; // nothing on the paper, or a cut over it
    const after = cap.getBoundingClientRect().top;
    if (Math.abs(after - before) < 2) return;
    travelFrom = before;
    travelTo = after;
    travel = DOCK_STEPS;
    stepTravel();
  }
  function stepTravel() {
    if (!travel) return;
    const H = ctx.size.h || window.innerHeight || 900;
    const k = (DOCK_STEPS - travel + 1) / DOCK_STEPS;
    travel -= 1;
    if (!travel) {
      place(); // the last drawing IS the anchor: no rounding is left behind
      return;
    }
    cap.style.bottom = 'auto';
    cap.style.top = `${(((travelFrom + (travelTo - travelFrom) * k) / H) * 100).toFixed(3)}%`;
  }
  // Called on every stepped frame: has the beat changed under a card that is already up?
  function tickDock() {
    const shot = shotName();
    const cutNow = shot !== lastShot;
    lastShot = shot;
    const want = picking();
    if (want !== docked) relay(want, cutNow);
    else if (travel) stepTravel();
  }

  // ---- the caption itself ------------------------------------------------------------------------
  // The type size the card is set at right now, in px: the rules and the lettering are cut from it.
  const fontPx = () => parseFloat(getComputedStyle(cap).fontSize) || 14;
  let placard = null;
  let placardSeed = 7;
  // A name on the card is LETTERED, in the hand titles-sign.js cut for it — never set in a font.
  // Falls back to the set face only for a string the case does not hold (an accented card name
  // outside its sorts), which is better than a hole where a word should be.
  function nameHTML(text, cls) {
    if (!CAN_LETTER(text)) return `<div class="${cls} set">${glyphs(String(text).toUpperCase(), mulberry32(41 + text.length))}</div>`;
    return `<div class="${cls}" data-t="${esc(text)}"><canvas aria-hidden="true"></canvas></div>`;
  }
  // The cap height a card's own name is cut at in an intertitle: taken from the type size the card
  // is set at, so the lettering follows the picture when the window changes.
  const nameCap = () => Math.max(FONT_MIN, fontPx() * 0.95);
  function letterNames() {
    for (const holder of cap.querySelectorAll('[data-t]')) {
      const canvas = holder.querySelector('canvas');
      if (!canvas) continue;
      const capH = nameCap();
      drawName(canvas, holder.dataset.t.toUpperCase(), capH, {
        seed: placardSeed + holder.dataset.t.length,
        tracking: 0.2,
        pen: Math.max(1.35, capH * 0.13),
      });
      holder.setAttribute('aria-label', holder.dataset.t);
    }
  }
  // Stand the card's inner block up. Everything on the card lives inside it and it is one fixed
  // height, so the card is the same object whatever is written on it.
  function frame(innerHTML) {
    cap.innerHTML = `<div class="inner">${innerHTML}</div>`;
    placard = document.createElementNS(SVGNS, 'svg');
    placard.setAttribute('class', 'placard');
    placard.setAttribute('aria-hidden', 'true');
    cap.insertBefore(placard, cap.firstChild);
    cap.appendChild(arrow); // the same button, moved into the new block: never rebuilt
    letterNames();
    drawCard();
  }
  // Set the card as a conversation: his register, then the visitor's. Both are always present,
  // whether or not there is anything to put in them.
  function render(wellHTML, replyHTML) {
    frame(`<div class="well">${wellHTML}</div><div class="reply">${replyHTML}</div>`);
  }

  // ---- the ruler: how many lines a string takes in the well -----------------------------------
  // A hidden card of exactly the same measure, the same padding and the same face, standing off the
  // paper. Nothing is ever set into the well without being counted here first, which is how a line
  // is cut into takes that fit rather than allowed to stretch the card.
  const ruler = document.createElement('div');
  ruler.className = 'cap ruler';
  ruler.setAttribute('aria-hidden', 'true');
  const rulerWell = document.createElement('div');
  ruler.appendChild(rulerWell);
  root.appendChild(ruler);
  const lineHeightPx = () => fontPx() * LINE_H;
  function linesOf(html) {
    ruler.style.width = `${cardW || 600}px`;
    ruler.classList.toggle('narrow', cap.classList.contains('narrow'));
    rulerWell.innerHTML = html;
    const h = rulerWell.offsetHeight;
    return Math.max(1, Math.round(h / Math.max(1, lineHeightPx())));
  }
  // His line. Nothing opens it: round 6's green dash is gone and the colour of the type says whose
  // words these are (the user: "lines not needed"). `.line` carries the green and the heavier cut,
  // and the ruler sets the same class, so what is measured is what is set.
  const lineHTML = (t) => `<div class="line">${wordMarkup(t)}</div>`;
  // Cut a line into takes, each of which fits the well. The most words that fit is found by
  // bisection (a dozen measurements for a long sentence rather than one per word).
  //
  // AND THEN IT KEEPS THEM. Round 9, the user: "I wonder whether you could actually use the full
  // width of the second line because, as far as I can tell, you're not using the full width of the
  // second line." They were right, and it was this function's fault. It used to walk the cut BACK
  // from the greedy fit to the last clause that ended inside it — a full stop, then a semicolon or
  // colon, then a comma — and it was allowed to walk back as far as 45% of the take to find one. A
  // semicolon a third of the way along line two therefore sent everything after it to the next
  // take, and the card cut away from a half-empty second line.
  //
  // MEASURED, on 21 real lines off the live model (91–392 characters), fill of line two averaged
  // over every take that has another take behind it (tools/_dlg-r9-fill.mjs):
  //
  //                                    1600x900 (736 px card)   390x760 (351 px card)
  //     walk back to 55% (round 8)            57.8%                    70.9%
  //     walk back 2 words (shipped)           88.4%                    85.8%
  //     no clause break at all                92.6%                    88.0%
  //
  // So: the cut is the last word that FITS, and the clause break is only preferred when it is
  // within the last CLAUSE_REACH words of it — near enough that keeping it costs a word or two of
  // paper rather than a third of a line. That is worth 4 points of fill against breaking anywhere
  // (the last two columns) and it still stops a take ending on "made for a" whenever a full stop
  // happens to land in reach.
  //
  // The widow rule is kept only where it matters: a take of ONE word, alone on the card, is a
  // scrap, so the take before it hands one word back. Round 8 also pulled words back from a
  // two-word ending; that is a legible take and it costs a line of paper to avoid.
  const BREAKS = [/[.?!…]["'”’)]?$/, /[;:]$/, /,$/];
  const CLAUSE_REACH = 2; // words the cut may walk back to reach a clause ending, and no further
  function splitTakes(text, maxLines = WELL_LINES) {
    const words = String(text).split(/\s+/).filter(Boolean);
    if (words.length < 2) return [String(text)];
    const fits = (a, b) => linesOf(lineHTML(words.slice(a, b).join(' '))) <= maxLines;
    if (fits(0, words.length)) return [words.join(' ')];
    const takes = [];
    let i = 0;
    while (i < words.length) {
      let lo = i + 1, hi = words.length, max = i + 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (fits(i, mid)) {
          max = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      let cut = max;
      if (max < words.length) {
        // the clause break is a preference, not a rule: it is taken only if it is right there
        const least = Math.max(i + 1, max - CLAUSE_REACH);
        for (const re of BREAKS) {
          for (let j = max; j >= least; j--)
            if (re.test(words[j - 1])) {
              cut = j;
              break;
            }
          if (cut !== max) break;
        }
        // never a single word alone on a take: the one before it hands a word back
        if (words.length - cut === 1 && cut - i > 2) cut -= 1;
      }
      takes.push(words.slice(i, cut).join(' '));
      i = cut;
    }
    return takes;
  }
  // Nothing is ruled inside the card. It carried two — under the speaker's name, and between his
  // line and the visitor's — and the user asked for them out: "the chatbox was also nicer when it
  // was just plain text - without the dividers inside the text pannel." The card's own drawn edge
  // is the only line on it; the name's smaller lettering and the space beneath it do the dividing,
  // and at the field the blinking caret says whose turn it is. drawPlacard still takes rules, so
  // this is one function away from coming back if it is ever wanted.
  function ruleLines() {
    return [];
  }
  // The card is redrawn whenever the block changes size: the visitor's answer grows a line, the
  // window is resized, a longer sentence arrives. One pen, one seed per caption, so it does not
  // shiver while the words type in.
  function drawCard() {
    if (!placard || cap.hidden) return;
    const w = cap.offsetWidth, h = cap.offsetHeight;
    if (!w || !h) return;
    const rules = ruleLines();
    const key = `${w}x${h}:${rules.map((r) => Math.round(r.y)).join(',')}`;
    if (placard.dataset.k === key) return;
    placard.dataset.k = key;
    const lw = Math.max(1.8, Math.min(3.6, w * 0.0064));
    drawPlacard(placard, w, h, placardSeed, lw, rules);
  }
  // The card off the paper altogether. This is now a rare event — the evening's captions replace
  // one another inside a card that stands — and it is kept for the four cases that mean it: a new
  // caption standing up where there was nothing (via show), `clear()`, a beat that ends with
  // nothing to say, and the door.
  function cut() {
    arrowStill = false;
    setArrow(false);
    cap.hidden = true;
    cap.classList.remove('asking');
    cap.innerHTML = '';
    placard = null;
    standing = false;
    think = null;
    if (field) {
      const f = field;
      field = null;
      f.dispose?.(); // an ask() still waiting resolves null
    }
  }
  // The FIELD goes and the card stays: the visitor's register is emptied (their words are theirs
  // only while they are writing them — the user's rule) and reserved again, his line is untouched,
  // and the drawn card is not re-cut. This is what the end of the visitor's turn looks like now;
  // before this round it was a `cut()`, which is why the card went blank the moment they pressed
  // Return and stayed blank for the whole of his turn.
  function closeField() {
    if (!field) return;
    const f = field;
    field = null;
    cap.classList.remove('asking');
    f.input?.remove();
    const reply = cap.querySelector('.reply');
    if (reply) reply.innerHTML = visitorLine();
    f.dispose?.(); // an ask() still waiting resolves null (its own settle() is re-entrant-safe)
  }
  // Set one take into the well of a card that is already standing. The card itself is not touched:
  // same measure, same height, same seed — so the pen does not redraw and nothing flickers between
  // the takes of a long line.
  function setTake(text) {
    const well = cap.querySelector('.well');
    if (!well) return [];
    well.innerHTML = lineHTML(text);
    const els = [...well.querySelectorAll('.line .w')];
    const words = [];
    let count = 0;
    text.split(' ').forEach((w, i) => {
      count += w.length + 1;
      words.push({ els: [els[i]], at: count });
    });
    return words;
  }
  // What stands in the visitor's register while it is not their turn: the last thing they said, in
  // ink. The register itself is reserved whether or not there is a word in it, so the card holds
  // two lines of speech — one green, one black — and the place their words will go is a fixed
  // compartment of the card rather than something they have to look for. When it becomes their turn
  // the caret starts blinking on that same line and nothing else moves.
  const visitorLine = () => `<div class="answer">${lastAnswer ? stableGlyphs(lastAnswer) : ''}</div>`;
  // Stand a fresh card up and cut the line into takes that fit his register. Returns the takes and
  // the word spans of the first of them.
  // ROUND 8: a caption no longer tears the card down and builds another one. If a card is already
  // standing — which, now that a line holds until it is replaced, is nearly always — the SAME sheet
  // keeps its place, its measure and its seed, and only the words in the well change. That is what
  // "one object" has meant on paper since round 3 and what the takes of a long line already did;
  // the seed is what makes it literal. A fresh sheet is cut only when there was nothing on the
  // paper a moment ago.
  function show(text) {
    arrowStill = false;
    const fresh = cap.hidden;
    closeField(); // an ask still waiting resolves null; the visitor's register is emptied
    dropThink(); // he has written: the dots go
    owedAt = 0;
    if (fresh) {
      syncDock();
      place();
      placardSeed = 7 + (String(text).length % 23) * 3;
    }
    render('', visitorLine());
    cap.hidden = false;
    const takes = splitTakes(text);
    const words = setTake(takes[0]);
    standing = true;
    fit();
    drawCard();
    return { takes, words };
  }
  function reveal(words, chars) {
    for (const w of words)
      if (w.at - 1 <= chars + 1e-6) for (const el of w.els) el?.classList.remove('hid');
  }
  // Move on to the next take of a line: the same card, a new set of words in its well.
  function nextTake(t) {
    setArrow(false); // the mark belongs to the take that has just gone
    t.ti += 1;
    t.words = setTake(t.takes[t.ti]);
    t.chars = -1;
    t.start = ctx.clock.t;
    if (ctx.clock.frozen) reveal(t.words, Infinity);
  }
  // Finish the caption up (typing or intertitle): RESOLVE its promise, and leave it standing.
  //
  // This is the round's hinge. It used to `cut()` here — the promise settling and the card being
  // taken off the paper were one event — so a sentence went the instant flow stopped waiting for
  // it, which is what the user saw: "the chat box as it is now sometimes the text disappears too
  // fast". They are separate now. The promise still settles at exactly the same millisecond (see
  // update(): typed + hold), so flow's sequencing of the whole evening
  // is untouched; the words stay on the card until something replaces them.
  //
  // A line still in its takes is finished on its LAST take, whole — never half-said — and that last
  // take is the one that stands.
  function finish() {
    setArrow(false);
    if (typing) {
      const t = typing;
      typing = null;
      while (t.ti < t.takes.length - 1) nextTake(t);
      reveal(t.words, Infinity);
      standing = true;
      t.done?.();
    }
    if (inter) {
      const i = inter;
      inter = null;
      standing = true;
      i.done?.();
    }
  }

  // ---- the arrow: there is more of this sentence, and it is waiting for you ---------------------
  // Up only when a take of HIS is standing whole and another take is behind it. Never while the
  // visitor's field is open (a take cannot wait there — `ask` says its prompt to the end before the
  // field is opened) and never on the last take of a line, where there is nothing to go on to.
  let arrowUp = false;
  // A judging still has no clock running under it, so nothing would put the mark up or keep it
  // there. This says the still asked for it: see setState's `still`.
  let arrowStill = false;
  function drawTheArrow() {
    if (!arrowUp) return;
    // The nib's own weight. The mark is drawn in a 26-unit box laid out at 2.1em, so a unit is
    // about 1.3 px on a laptop and 1.05 on a phone: 2.0 units lands at ~2.6 px against the 3.6 px
    // pen that framed the card, and ~2.0 px against the 2.25 px frame of a phone's. The mark is a
    // hair lighter than the sheet it is drawn on, which is the right way round.
    drawArrow(arrowSvg, ctx.clock.frame, { color: PEPE_GREEN, weight: Math.max(1.9, fontPx() * 0.125) });
  }
  function setArrow(on) {
    const want = !!on && !field && !cap.hidden;
    if (want === arrowUp) return;
    arrowUp = want;
    arrow.hidden = !want;
    cap.classList.toggle('waiting', want);
    if (want) drawTheArrow();
    else if (document.activeElement === arrow) arrow.blur();
  }
  // Advance one take. The mark goes down before the take is turned, so the pointerdown and the
  // click that follows it cannot both count as a gesture.
  function onArrow(e) {
    if (!arrowUp || field) return;
    e.preventDefault(); // ... and the button does not take the focus off a pointer
    e.stopPropagation();
    setArrow(false);
    api.skip();
  }
  // A tap anywhere on the card, while the card is waiting. `.cap.waiting` is the only state in
  // which the card takes pointer events at all — every other moment it is transparent to them, so
  // a click on the picture still reaches the flow (and the cards) exactly as it did.
  cap.addEventListener('pointerdown', onArrow);
  arrow.addEventListener('click', onArrow); // Return / Space on a button reached by Tab

  // ---- the thinking mark ------------------------------------------------------------------------
  // Three dots struck one at a time while a turn of his is in flight, and nothing else: the puppet
  // does the thinking (pepeAnim.consider, fired by flow at exactly the same moment) and this is the
  // card's half of it, so it is a mark and not a performance.
  //
  // It stands only when his register is EMPTY. A line of his that is already up holds instead —
  // between two sentences of a turn, over the wash, under an open field — because a card with his
  // last sentence on it is a better answer to "is this thing working" than a card with dots on it.
  const bareCard = () => !typing && !inter && !field && !think && !standing;
  function dropThink() {
    if (!think) return;
    think = null;
    const well = cap.querySelector('.well');
    if (well) well.innerHTML = '';
  }
  // Strike the dots for this frame. The count walks 1 · 2 · 3 and rests, and the marks are re-drawn
  // on every step from a seed keyed to the frame, so they boil like every other line in the film.
  // A FROZEN clock counts from the frame itself rather than from the mark standing up (a still has
  // no history), so `?t=` walks the cycle deterministically and a contact sheet of it is honest.
  function drawThink() {
    if (!think?.svg) return;
    const since = ctx.clock.frozen ? ctx.clock.frame : ctx.clock.frame - think.at;
    const k = ((since % THINK_CYCLE) + THINK_CYCLE) % THINK_CYCLE;
    const n = k < THINK_STEP ? 1 : k < 2 * THINK_STEP ? 2 : 3;
    // the nib's own weight, cut from the type size the card is set at — and never so light that a
    // 13 px phone caption gets a mark thinner than the type standing beside it
    drawDots(think.svg, n, ctx.clock.frame, { color: PEPE_GREEN, weight: Math.max(2.8, fontPx() * 0.2) });
  }
  function standThink() {
    if (think) return;
    if (cap.hidden) {
      syncDock();
      place();
      placardSeed = 7 + (ctx.clock.frame % 23) * 3;
      render('', visitorLine());
      cap.hidden = false;
    }
    const well = cap.querySelector('.well');
    if (!well) return;
    well.innerHTML = '<div class="line think"><svg aria-hidden="true"></svg></div>';
    think = { svg: well.querySelector('svg'), at: ctx.clock.frame };
    standing = false; // the dots are not words: the next line replaces them without ceremony
    drawThink();
    fit();
    drawCard();
    ctx.emit?.('dialogue:thinking', { on: true });
  }
  // Is a turn of his actually in flight? flow's own beat says so (see THINKING_BEATS), and the
  // judging state asks for it directly.
  function turnPending() {
    if (thinkForced) return true;
    const f = ctx.pieces.flow;
    return !!f && THINKING_BEATS.includes(f.beat);
  }
  // Called on every stepped frame. Arms on the beat he starts owing a line in, waits out
  // THINK_WAIT, stands the dots up, and takes them down the moment the beat moves on — which is how
  // the wash stays silent when he wrote nothing over it.
  function tickThinking() {
    const want = turnPending();
    if (want && !wasPending && !owedAt) owedAt = nowS();
    wasPending = want;
    if (!want) {
      owedAt = 0;
      if (think) {
        dropThink();
        ctx.emit?.('dialogue:thinking', { on: false });
        if (bareCard()) cut(); // nothing said, nothing asked: the card has no business standing
      }
      return;
    }
    if (!think && !standing && !typing && !inter && owedAt && nowS() - owedAt >= THINK_WAIT) standThink();
    else if (think) drawThink();
  }

  // ---- the visitor's register ----------------------------------------------------------------------
  // ROUND 6, AND THIS IS THE FAULT BEING FIXED. Their words used to be set into HIS well, under the
  // last line of his question, with the caret crammed into whatever space his sentence had left —
  // the user's word for it: "the users blinking cursor is quashed under pepes text which doesnt
  // feel natural". It did not read as a place to type because it was not one: it was the room left
  // over.
  //
  // So they have a register of their own. It is two lines, exactly as his is; it is reserved before
  // the evening starts and it never moves; his question STAYS in his own register above it while
  // they write, so the card holds both halves of the exchange at once. Their words are set exactly
  // as his are — the same face, the same size, the same capitals — opened by their own ink dash,
  // with the ink caret blinking at the end of them. Nothing else is added and nothing is labelled.
  //
  // Their register is two lines and stays two lines: past that the head of their sentence rides out
  // of the top of it, a whole line at a time, the way a rolling subtitle does. The input holds every
  // character they typed whatever the card shows. The card does not grow by a pixel.
  function drawAnswer() {
    if (!field) return;
    const el = field.answer;
    let words = field.input.value.split(' ');
    // roll: drop whole words off the head until what is left sets inside their register
    for (;;) {
      el.innerHTML = stableGlyphs(words.join(' '));
      el.appendChild(field.caret[0]);
      if (words.length <= 1 || linesOf(`<div class="answer">${el.innerHTML}</div>`) <= REPLY_LINES) break;
      words = words.slice(1);
    }
    fit();
  }
  function openBlock(value = '') {
    const reply = cap.querySelector('.reply');
    if (!reply) return null;
    cap.classList.add('asking');
    reply.innerHTML = '<div class="answer"></div>';
    const answer = reply.querySelector('.answer');
    const c = document.createElement('span');
    c.className = 'caret';
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('aria-hidden', 'true');
    drawCaret(s, 5);
    c.appendChild(s);
    const input = document.createElement('input');
    input.className = 'keys';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.maxLength = 240;
    input.setAttribute('aria-label', 'Your answer');
    input.value = value;
    cap.appendChild(input);
    field = { input, answer, caret: [c] };
    drawAnswer();
    input.addEventListener('input', drawAnswer);
    return input;
  }

  function interLines(slug, position) {
    const card = bySlug[slug];
    const key = positionKey(position);
    const idx = ['brought', 'going', 'do'].indexOf(key);
    const label = POSITIONS[idx] ?? '';
    const name = card?.name ?? slug;
    const head = card?.numeral ?? ORDINAL[idx] ?? '';
    return [head, name, label];
  }
  const api = {
    script: SCRIPT,
    lineFor,
    linesFor,
    reply: scriptReply,
    positions: POSITIONS,
    anchors: ANCHORS,

    // Name the beat of the evening. It used to decide whether the next line was labelled with his
    // name; nothing on the card is labelled any more, so this is now only the event other pieces
    // listen for and the name of the beat the piece thinks it is in.
    folio(name) {
      beat = name;
      ctx.emit?.('dialogue:folio', { beat });
    },

    // Reveal one caption in HIS register. It resolves after the line has been read — the typing
    // plus `hold`, unchanged — and then STANDS there until his next line replaces it (round 8).
    // (`keep` and `who` are accepted and do nothing: every line keeps now, and round 6 took the
    // speaker's name off the card altogether.)
    say(text, { hold = 1.2, keep = false } = {}) {
      finish();
      const { takes, words } = show(text);
      // How long he is TALKING, which since round 9 is no longer how long the line is up: a line in
      // more than one take waits for the visitor between them, and how long they take over it is
      // their business and not his mouth's. So the puppet (and the sound piece's typing) is given
      // the typing plus an unhurried beat per cut, which is the pace he would say it at.
      const seconds = text.length / CPS + (takes.length - 1) * TAKE_PACE;
      ctx.pieces.pepeAnim?.say?.(text, seconds + 0.2);
      ctx.emit?.('dialogue:say', { text, seconds, takes: takes.length });
      return new Promise((res) => {
        typing = { words, takes, ti: 0, start: ctx.clock.t, hold, done: res, keep, chars: -1 };
        if (ctx.clock.frozen) reveal(words, Infinity);
      });
    },

    // The card's title: numeral (or ordinal), name, position, on the bare paper beside the card.
    intertitle(slug, position, { hold = INTER_HOLD } = {}) {
      finish();
      const [n, name, label] = interLines(slug, position);
      const fresh = cap.hidden;
      closeField();
      dropThink();
      owedAt = 0;
      if (fresh) {
        syncDock();
        place();
        placardSeed = 13 + (name.length % 19) * 5;
      }
      const rng = mulberry32(101 + name.length * 5);
      // The card's own name is hand-lettered, as it is on the card (STYLE.md §2.6); the numeral
      // above it and the position under it are the caption's set face, small. It is the SAME card
      // as every caption's, the same measure and the same height — but a title is not a
      // conversation, so it is set across the whole inner block rather than into the two registers.
      frame(`<div class="title"><div class="n">${glyphs(n, rng)}</div>${nameHTML(name, 'name')}<div class="pos">${glyphs(label, rng)}</div></div>`);
      cap.hidden = false;
      fit();
      drawCard(); // the card and its title arrive on the same frame, as a caption's do
      ctx.emit?.('dialogue:intertitle', { slug, position });
      return new Promise((res) => {
        inter = { until: ctx.clock.t + hold, done: res };
      });
    },

    // Says the prompt and keeps it up with the visitor's block under it. Resolves with the text
    // (trimmed) on Return, '' on Escape, null when `signal` aborts or `timeout` seconds pass with
    // no answer. With respond:true it also says the reply before resolving.
    async ask(prompt = SCRIPT.question[0], { respond = false, hold = 0.2, signal = null, timeout = 0, value = '', instant = false } = {}) {
      if (signal?.aborted) return null;
      // A FALSY PROMPT OPENS THE FIELD AND SAYS NOTHING. He has already spoken and his line is
      // standing (round 8), so a caller that wants another answer to the same sentence — the second
      // and third card of a reading, where the user asked for one line and not three — hands no
      // prompt and the card is left exactly as it is.
      const said = prompt ? api.say(prompt, { hold, keep: true }) : Promise.resolve();
      if (instant) finish();
      const onAbortSay = () => finish();
      signal?.addEventListener('abort', onAbortSay, { once: true });
      await said;
      signal?.removeEventListener('abort', onAbortSay);
      // The ask was called off before the field could open — a card taken at the fan, a tap on a
      // card lying on the table. His prompt is left standing (round 8): it is the last thing he
      // said and nothing has replaced it yet.
      if (signal?.aborted || cap.hidden) {
        closeField();
        return null;
      }
      // his question stays where it is, in his own register, and the field opens in theirs
      const input = openBlock(value);
      if (!input) return null;
      if (!ctx.shotMode) input.focus();
      const answer = await new Promise((res) => {
        let done = false;
        let timer = null;
        // THE END OF THE VISITOR'S TURN — and, since round 8, the end of HIS line's tenure and not
        // of the card. It used to `cut()`: the whole placard came off the paper the instant they
        // pressed Return, and stayed off for the two-and-a-half to four seconds the mind took to
        // answer. Now the field closes, their register empties (their words are theirs only while
        // they are writing them), his question stays exactly where it is — and `standing` is
        // dropped, which is what lets the thinking mark take his register a quarter of a second
        // later if he has not answered by then. If he answers first, his sentence replaces the
        // question directly and the card is never blank at all.
        const settle = (v) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          window.removeEventListener('keydown', refocus, true);
          signal?.removeEventListener('abort', onAbort);
          closeField();
          if (typeof v === 'string' && v) {
            standing = false; // they have spoken: his line holds only until he answers
            if (!owedAt) owedAt = nowS();
          }
          res(v);
        };
        const submit = () => settle(input.value.trim().replace(/\s+/g, ' '));
        const onAbort = () => settle(null);
        // a click on the picture takes the focus; the next typed character brings it back
        const refocus = (e) => {
          if (!field || e.target === input || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
          input.focus();
        };
        input.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            settle('');
          }
        });
        window.addEventListener('keydown', refocus, true);
        signal?.addEventListener('abort', onAbort, { once: true });
        if (timeout > 0) timer = setTimeout(() => settle(null), timeout * 1000);
        if (field) {
          field.submit = submit;
          field.dispose = () => settle(null); // cut from outside (clear, the next say): no answer
        }
      });
      // Their words go the moment they are said. Round 6 left the last thing they typed standing in
      // their register while he answered it, on the argument that the card then held both halves of
      // the exchange — but the user watched it through several of his sentences and it is simply
      // clutter: "the user knows what they typed they only need to see it as they type, not after".
      // The register stays RESERVED and empty, so the card does not change shape and the place their
      // next words will go is still a fixed compartment rather than something they have to look for.
      if (answer != null) {
        lastAnswer = '';
        ctx.emit?.('dialogue:answer', { answer });
      }
      if (respond && answer != null) await api.say(scriptReply(answer), { hold: 1.4 });
      return answer;
    },

    // THE VISITOR'S KEY, and since round 9 the visitor's ONLY way through a long line. One gesture
    // moves one take and no more: a take still typing is shown whole and stops there — with the
    // arrow up, because there is more behind it — and the NEXT gesture turns to the next take. It
    // has never dumped a whole line and it does not now; `finish()` is reached only on the last
    // take, where there is nothing left to turn to. Space and Return arrive here from flow's own
    // key handler, a click on the picture from its pointer handler, and a tap on the card or on the
    // arrow from the card itself.
    skip() {
      if (typing) {
        const t = typing;
        const last = t.words[t.words.length - 1];
        const total = last ? last.at - 1 : 0;
        const whole = t.chars >= total;
        if (!whole) {
          reveal(t.words, Infinity);
          t.chars = total;
          t.start = ctx.clock.t - total / CPS;
          t.hold = Math.min(t.hold, 0.7);
        } else if (t.ti < t.takes.length - 1) nextTake(t);
        else finish();
        return true;
      }
      if (inter) {
        finish();
        return true;
      }
      return false;
    },

    get asking() {
      return !!field;
    },
    // A card, read: the title, then its lines.
    async read(slug, position, { hold = 1.3 } = {}) {
      await api.intertitle(slug, position);
      const lines = linesFor(slug, position);
      for (let i = 0; i < lines.length; i++) await api.say(lines[i], { hold });
    },

    // THE MARK, ASKED FOR DIRECTLY. Nothing calls this yet: the mark is inferred from the beat flow
    // publishes (THINKING_BEATS), because dialogue may not reach into `mind` and `mind` has no flag
    // of its own. It is the door for the contract change this round asks for — flow saying
    // `D.thinking(true)` on the line before `mind.turn(said)` and `D.thinking(false)` on the line
    // after it, which would put the mark on the actual call rather than on a beat that stands for
    // it. `thinking(false)` takes the dots down and, if there is nothing else on the card, the card
    // with them.
    thinking(on = true) {
      thinkForced = !!on;
      if (thinkForced) {
        if (!owedAt) owedAt = nowS();
        return;
      }
      owedAt = 0;
      if (think) {
        dropThink();
        ctx.emit?.('dialogue:thinking', { on: false });
        if (bareCard()) cut();
      }
    },

    // The one thing that takes a line off the paper without putting another in its place: a new
    // evening, the visitor's Escape, the walk back out through the door.
    clear() {
      finish();
      cut();
      thinkForced = false;
      owedAt = 0;
      wasPending = false;
      lastAnswer = ''; // a new evening: neither of them has said anything yet
    },

    // Judging states. Deterministic: the caption is shown in full, no typing.
    //   ?line=<n>  which line of the beat   ?card=<slug>&pos=<0..2>  the reading   ?inter=1  its title
    //   ?answer=<text>  what the visitor has written so far
    setState(name) {
      finish();
      cut();
      thinkForced = false;
      owedAt = 0;
      wasPending = false;
      const p = ctx.params;
      const i = +(p.get('line') ?? 0);
      // A still of a line too long for the well shows the card as it actually stands at that
      // moment: the first take, whole, with the arrow waiting at the corner for the visitor.
      const still = (text) => {
        const { takes, words } = show(text);
        reveal(words, Infinity);
        if (takes.length > 1) {
          arrowStill = true;
          setArrow(true);
        }
      };
      api.folio(name);
      // The visitor's register is bare unless a still is deliberately asking for words in it. In the
      // running film it only ever holds what they are typing AT THAT MOMENT, so a judging frame with
      // a sentence sitting in it would be a frame of a state that never happens; `?answer=…` puts one
      // there for the rare still that wants to show the typing. Bare paper that reads as a place to
      // write is the state worth judging.
      lastAnswer = name !== 'greeting' && p.has('answer') ? p.get('answer') : '';
      if (name === 'reading') {
        const slug = p.get('card') ?? 'the-moon';
        const pos = +(p.get('pos') ?? 1);
        if (p.get('inter') === '1') {
          api.intertitle(slug, pos, { hold: Infinity });
          return;
        }
        const lines = linesFor(slug, pos);
        still(lines[i] ?? lines[0]);
      } else if (name === 'question') {
        lastAnswer = '';
        api.ask(SCRIPT.question[i] ?? SCRIPT.question[0], {
          instant: true,
          value: p.get('answer') ?? 'I keep starting things and not finishing them.',
        });
      } else if (name === 'thinking') {
        // THE CARD WHILE HE IS WRITING. The state the whole of round 8's second half is about: the
        // visitor has said their line, their register is empty and reserved, his is empty too, and
        // the pen is striking the three dots. A frozen clock shows all three of them.
        thinkForced = true;
        lastAnswer = '';
        standThink();
      } else if (name === 'answer') {
        still(scriptReply(p.get('answer') ?? 'I keep starting things and not finishing them.'));
      } else if (name === 'greeting') {
        still(SCRIPT.greeting[i] ?? SCRIPT.greeting[0]);
      } else {
        const arr = Array.isArray(SCRIPT[name]) ? SCRIPT[name] : SCRIPT.farewell;
        still(arr[i] ?? arr[0]);
      }
    },

    update(ctx) {
      if (!ctx.clock.stepped) return;
      const t = ctx.clock.t;
      // The card is one size and one place. Two things can move it: the letterbox bar opening or
      // closing against the edge it hangs from, and the picking beat starting or ending, which
      // takes it to the head of the frame and back (see THE DOCK). Nothing else.
      tickDock();
      // A line that is only STANDING (said, read, and waiting to be replaced) comes off at the
      // door: the evening ends on the drawn door and the sign-off card, and neither of them is a
      // frame his last sentence belongs in. A line still being said is left alone.
      if (standing && !typing && !inter && !field && BARE_SHOTS.includes(shotName())) cut();
      // the thinking mark: struck while a turn of his is in flight, gone the moment he writes
      tickThinking();
      if (!cap.hidden) {
        if (!travel && Math.abs(barFrac() - lastBar) > 0.001) place();
        drawCard();
      }
      // the caret: an ink dash, on and off on the 12fps clock
      if (field) {
        const off = !ctx.shotMode && Math.floor(ctx.clock.frame / BLINK) % 2 === 1;
        for (const c of field.caret) c.classList.toggle('off', off);
      }
      if (inter && t >= inter.until) finish();
      // the arrow boils like every other line on the card, on the same 12 fps step
      if (arrowUp) drawTheArrow();
      if (!typing) {
        if (!inter && !arrowStill) setArrow(false);
        return;
      }
      const chars = Math.floor((t - typing.start) * CPS + 1e-6);
      if (chars !== typing.chars) {
        reveal(typing.words, chars);
        typing.chars = chars;
      }
      const last = typing.words[typing.words.length - 1];
      const typed = typing.start + (last ? last.at - 1 : 0) / CPS;
      const more = typing.ti < typing.takes.length - 1;
      // A take that is not the last of its line puts the arrow up the moment its last word has
      // landed and then WAITS — for the visitor, or, if they do nothing at all, for TAKE_WAIT. The
      // last take of a line waits out its hold and ends the line.
      if (more) {
        const whole = t >= typed;
        setArrow(whole);
        if (whole && t >= typed + TAKE_WAIT) nextTake(typing);
      } else {
        setArrow(false);
        if (t >= typed + typing.hold) finish();
      }
    },
  };
  ctx.on('resize', () => {
    setAnchors(ctx.size?.w || window.innerWidth || 1600);
    if (cap.hidden) return;
    travel = 0; // a window changing shape ends any re-lay in progress: place() is the truth
    place();
    letterNames(); // the lettering is cut at the display's resolution: re-cut it
    fit();
    if (placard) placard.dataset.k = ''; // force the card to be re-cut at the new size
    drawCard();
  });
  return api;
}
