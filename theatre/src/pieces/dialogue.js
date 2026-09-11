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
// card. See BODY_LINES, `measure`, `splitTakes`.
//
// TWO REGISTERS, BOTH ALWAYS THERE (round 6). The card is not his caption with the visitor tacked
// underneath; it is a conversation between two people and the drawing says so without a word of
// labelling. The upper register — two lines — is HIS. The lower register — two lines — is the
// VISITOR'S, and it is standing there, empty, before they have typed a character, so there is never
// a moment when it is unclear where their words will go. Nothing moves when the turn changes: the
// card is the same object, the same height, in the same place, all evening.
//
// ROUND 13: THE FOUR LINES ARE ONE BODY, AND HE MAY USE ALL OF THEM. The user, looking at his phone
// at a card carrying two lines of his and two lines of nothing: "I think Pepe should use all four
// lines in the chat box to speak because with only two lines the user has to click too often. The
// user's cursor can pop up on an empty chatbox after pepe spoke if the chatbox is full. if it isn't
// full the user can type into the line below pepe."
//
// So the two fixed compartments are gone and the card is FOUR LINES OF ONE GRID. Nothing else about
// it moved — same measure, same height at a given window, same place, his green and their ink:
//
//   · HIS TAKE IS UP TO FOUR LINES. Words are packed into it until the next one will not fit in
//     four, and only then does the arrow come up and the next take wait for the visitor. A sentence
//     that used to be three cards and two clicks on a phone is usually one card and none;
//   · THE FIELD OPENS ON THE LINE BELOW HIS WORDS. A two-line take leaves two lines, and their
//     caret stands at the head of the third — which is what the lower register always was, except
//     that it is now wherever his words ended rather than always the middle of the card;
//   · A TAKE THAT FILLS ALL FOUR LINES TAKES THE CARD WITH IT. There is no line below the fourth,
//     so when the field opens his words come OFF the paper and the caret has the whole card: an
//     empty sheet and a place to write, rather than a full one with the visitor squeezed into the
//     margin. Nothing is lost — every word of his is in the transcript (mind.history) and on the
//     sheet the visitor takes away (help-keep.js);
//   · AND THE MARK KEEPS ITS CORNER. A full take's last line is a full line, and the arrow stands
//     at the foot of the card: the line is wrapped a mark's width short so the two never touch.
//     See THE MARK'S OWN CORNER.
//
// WHAT IT IS WORTH, MEASURED (tools/_dlg-r13-proof.mjs, a six-sentence reply, the visitor turning
// each take when the mark comes up):
//
//                          arrows he asks for      cards the reply takes
//     1280x800  before            6                        12
//               after             0                         6
//     390x844   before           10                        16
//               after             1                         7
//
// AND flow's MAX_SENTENCES IS NOT PART OF THIS, which was checked rather than assumed. A turn is
// capped at three sentences there, and flow hands this card ONE sentence per `say` — so a sentence
// gets a card of its own however deep the card is, and four lines cannot pack three of them into
// one take. The cap is a rule about how long he talks, not about how much fits on the paper: three
// sentences cost about three cards now instead of about seven, and nothing about the four lines
// cuts a turn short. It is left at 3.
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
//     the paper against #69b964's 2.28:1, so a 14 px capital on a phone is a word and not a stain.
//     It is still the one colour in this film that means him: no third colour is introduced;
//   · both registers are cut by one hand with one nib: only the colour tells the two voices apart;
//   · the blinking caret is in the visitor's register and nowhere else: whoever the caret is with
//     has the pen. It is a pen stroke, not a dash, and it stayed.
//
// ROUND 12: ONE HAND, AND NO TYPE AT ALL. Rounds 3–11 set the words in the typewriter serif —
// capitals, tracked, the film's own face for labels beside a figure — and lettered only the card
// names. The user saw the notice on the wall, which is hand-lettered throughout (help-bill.js), and
// asked the obvious question: "i love this font - can you we use this in the chat box as well?"
//
// So the typewriter face is off this card altogether. Every word on the placard — his takes, the
// visitor's line as they type it, the prompts, an intertitle's numeral and position — is now CUT in
// the sign hand of titles-sign.js, on canvases inside the card's own registers, wrapped to the
// measure by signWidth exactly as the notice wraps its paragraphs, and re-struck on every second
// frame of the 12 fps clock so the words boil with the drawing they stand on. Nothing inside this
// picture is set in a font any more; the one remaining <input> is invisible and takes keystrokes.
//
// WHAT THAT COSTS, AND WHAT IT BUYS. The hand is cut for cap heights of 20–40 px and holds down to
// 14, where the typewriter face was legible at a 9 px cap — so the card's type had to grow, and the
// card with it (about a quarter taller). Everything else about it is untouched: one object, one
// measure, bottom-centred, docked to the head for the pick (and, on a phone, for the lay-out), his
// green and the visitor's ink, the
// two-line registers, the takes, the arrow, the drawn caret.
//
// GLYPHS OUTSIDE THE CASE. He answers in the visitor's language, so a line arrives with sorts no
// signwriter here ever cut. `signFold` (titles-sign.js) puts every string into the case before it
// is measured or set: caps, the marks the case holds kept and the rest flattened, quotes turned
// into « », and a short low dash — in the same pen — for anything still unknown. Never a blank,
// never a system font. Everything downstream counts the FOLDED string's characters.
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
//   band() → {at, top, bottom, h, w}           the strip of the frame the card stands in, in px,
//                                              whether or not a word is on it (help.js cuts the
//                                              card viewer's sheet to stand clear of it)
//   setState(name)                             greeting | question | reading | thinking | farewell (+ any script key)
import { SCRIPT, lineFor, linesFor, reply as scriptReply, POSITIONS, positionKey } from './script.js';
import { bySlug } from '../core/deck.js';
import { INK } from '../core/strokes.js';
import { SVGNS, drawCaret, drawDots, drawArrow, drawPlacard, drawName, drawBlock, PLACARD_BLEED } from './dialogue-ink.js';
import { signFold, signWidth } from './titles-sign.js';

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
//   · the card's body is exactly FOUR LINES of type, always four lines tall whether one word or
//     forty are on it (round 13; it was two of his over two of theirs, with a gap between them);
//   · his take takes as many of the four as it needs from the TOP, and what it leaves is where the
//     visitor writes — their caret on the line under his last word, in their own ink. A take that
//     fills all four leaves nothing, so the card is cleared for them (see openBlock);
//   · a line too long for the card is not allowed to stretch it. It is CUT INTO TAKES and
//     the takes are played into the same card, one after the other, the way a subtitle changes
//     while the card it is set in does not. (The alternative — hold the line and let the card
//     grow — is the fault we are fixing.) Each take FILLS the body — all four lines of it, to the
//     last word that fits — and the visitor turns to the next one when they are ready: see
//     splitTakes and THE ARROW.
const BODY_LINES = 4; // the card, in lines of type. The whole point: it never changes.
// The leading, as a multiple of the em. Round 12 took it from 1.5 to 1.25 because the em means
// something different now: the words are LETTERED, and a cap height of `em × 0.72` at 1.25 ems of
// leading gives a line pitch of 1.74 caps — the notice's own (help-bill: `lead = capBody × 1.92`),
// near enough that the two sheets read as one printer's work. At the old 1.5 the card would have
// grown half as tall again for nothing: there are no descenders in a case of caps.
const LINE_H = 1.25;
// The tracking the card's words are set at — a hair tighter than the notice's 0.16, because a
// caption is read once at a glance and a notice is studied. It is the hand's own default.
const TRACK = 0.14;
// ---- THE CAP HEIGHT --------------------------------------------------------------------------
// The notice sets its body at `min(19, sheetW × 0.032)` and never below 13. The card is cut to the
// same rule off its own measure, with the floor lifted to 14 — the hand's own floor, below which
// its counters close up (titles-sign.js) — and the ceiling brought down to 17, because a caption is
// not a headline and every cap on this card costs the card ten pixels of height.
//
// A phone lands on the floor exactly: 351 px of card × 0.026 is 9, so it letters at 14 and takes
// more turns of the take instead of a smaller hand. That is the same answer the notice gives a
// phone — the same words with more turns in them, never smaller words.
const CAP_MIN = 14, CAP_MAX = 17, CAP_OF_CARD = 0.026;
const capForCard = (w) => Math.max(CAP_MIN, Math.min(CAP_MAX, w * CAP_OF_CARD));
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
// The card's own margins, in ems, matching the padding in the stylesheet below. The measure the
// words are wrapped to is the card less these, less a hair for the pen's overshoot.
const PAD_X = 1.3, PAD_X_NARROW = 0.8;
// ---- THE MARK'S OWN CORNER (round 13) ----------------------------------------------------------
// A take that has another take behind it FILLS the card — that is what "fills" means: the cut is
// the last word that fits four lines, so the fourth line is a full line. The arrow stands at the
// foot of the card, inside its corner, and a full fourth line would be lettered straight through
// it. (It never could before: his register was the top two lines and the mark stood in the
// visitor's empty one.)
//
// So the letterer leaves the mark its corner. The LAST line of a take that is followed by another
// is wrapped short by the mark's own width — and only that line; the three above it keep the whole
// measure. The arrow's box is 2.4 em square at `right: 0.35em`, and the drawn stroke inside it is
// 2.1 em wide, so the mark reaches 2.6 em in from the card's right edge; the card's own margin
// gives back PAD_X of that, and a word space keeps the two apart.
const ARROW_REACH = 2.6, ARROW_GAP = 0.45; // ems, from the card's right edge

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
// AND ONE PEN FOR BOTH OF THEM. Round 7 cut his words a step heavier than the visitor's (700
// against 600) on the argument that a coloured glyph carries less ink than a black one — true, but
// the user saw the difference at once and read it as an inconsistency rather than as compensation:
// "the green is good but the font weight seems different then the users font?". So the two
// registers are lettered by one nib at one width (handMetrics `pen`), and the colour is the whole
// of the distinction. The green is dark enough (#3a7736, 5.13:1) not to need the help.

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
// AND THERE IS A SECOND BEAT WITH THE SAME PROBLEM, granted by the user on the same grounds: the
// EGG's lay-out, the whole deck face up on the cloth (egg-deck.js). "on mobile we'll need to move
// the chatbox to the top, as it currently covers some of the cards." Seventy-eight cards run to the
// rim of the table, so on a phone in portrait the bottom bows are under the placard exactly as the
// spread was; the card hangs from the head for as long as the rows are out and drops back to the
// foot when they are squared. A laptop's frame is wide enough that the placard clears the bows, so
// nothing about the dock changes there — the exception is for the phone, and only for the phone.
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
    #dialogue { color: ${INK}; }
    /* THE CARD. NOTHING ON IT IS SET IN A FONT (round 12). Every word is cut in the sign hand on a
       canvas inside one of the card's registers; the CSS here only reserves the compartments those
       canvases are drawn into, so the em below is a measuring unit and not a face. font-size is
       written on the element by place(): it is the cap height over 0.72, the same relation the
       hand itself uses, so every em in this sheet is 1.39 caps. */
    #dialogue .cap {
      position: absolute; left: 50%; transform: translate(-50%, 0);
      box-sizing: border-box; text-align: center;
      padding: 0.86em ${PAD_X}em 0.9em;
      font-size: 22px; line-height: ${LINE_H};
      color: ${INK};
    }
    #dialogue .cap.narrow { padding-left: ${PAD_X_NARROW}em; padding-right: ${PAD_X_NARROW}em; }
    #dialogue .cap.mid { top: 50%; transform: translate(-50%, -50%); }
    /* THE BODY — four lines of one grid (round 13). It is a FIXED height, reserved before a word is
       written, so the card is the same object on every line of the evening and nothing moves when
       the turn changes. What changes inside it is only how many of the four he has used: his take
       stands at the top and takes what it needs, the visitor's line follows on the next line down,
       and neither compartment has a height of its own. (Until round 13 they had: two lines of his
       over two of theirs, with a gap ruled in paper between them. The user asked for all four.) */
    #dialogue .cap .inner {
      height: calc(${BODY_LINES} * ${LINE_H}em);
      display: flex; flex-direction: column; justify-content: flex-start;
    }
    #dialogue .cap .well {
      flex: 0 0 auto; overflow: hidden;
      display: flex; flex-direction: column; justify-content: flex-start;
    }
    #dialogue .cap .reply {
      flex: 1 1 auto; min-height: 0; overflow: hidden;
      display: flex; flex-direction: column; justify-content: flex-start;
    }
    /* what is in a register keeps its own height and the register clips it — never squeezed */
    #dialogue .cap .well > *, #dialogue .cap .reply > * { flex: 0 0 auto; }
    /* an intertitle is not a conversation: its title takes the whole of the same inner block */
    #dialogue .cap .title {
      height: 100%; display: flex; flex-direction: column; justify-content: center;
    }
    /* the drawn card the words stand on (the user asked for it back; see BRIEF.md) */
    #dialogue .cap > svg.placard {
      position: absolute; left: -${PLACARD_BLEED}px; top: -${PLACARD_BLEED}px; z-index: 0;
      overflow: visible; display: block; pointer-events: none;
    }
    #dialogue .cap > * { position: relative; z-index: 1; }
    /* EVERY BLOCK OF WORDS IS A CANVAS. The pen draws a hair past the cap band (accents above, a
       comma below, the overshoot at the end of a stroke), so each canvas is cut taller than its
       line grid and gives the difference back with a negative margin: the block occupies exactly
       its lines, and nothing is clipped. */
    #dialogue .cap canvas.ink { display: block; width: 100%; }
    /* HIS LINE is the one green thing on the card and the VISITOR'S is ink; the colour is passed to
       the pen, not to the CSS, and it is the whole of the distinction between the two of them. */
    #dialogue .cap .line, #dialogue .cap .answer { position: relative; margin: 0; }
    /* the card's title: three lettered rows — the numeral, the card's name, the position */
    #dialogue .cap .row { display: block; line-height: 0; }
    #dialogue .cap .row > canvas { display: block; margin: 0 auto; }
    /* the words as TEXT, for a screen reader and for the tools that read the card: one pixel,
       clipped, out of the layout. What is SEEN is the drawing above; this is the same sentence. */
    #dialogue .cap .sr {
      position: absolute; width: 1px; height: 1px; overflow: hidden;
      clip-path: inset(50%); white-space: nowrap; pointer-events: none;
    }
    /* THE THINKING MARK: three dots on the line his words will be set on. It is one line of his
       register — the well is bottom-aligned, so the dots stand exactly where the last line of a
       sentence of his would — and it is drawn, not set: the svg is struck by drawDots on every
       stepped frame. */
    #dialogue .cap .think { height: ${LINE_H}em; }
    #dialogue .cap .think > svg { display: block; margin: 0 auto; width: 3.05em; height: ${LINE_H}em; overflow: visible; }
    /* THE CARET stands at the end of the last line the visitor has written. Their words are drawn
       rather than laid out now, so it is PLACED (placeCaret) rather than flowed: its box keeps
       drawCaret's own proportion, so the nib lands exactly on the baseline of the lettering
       whatever size the card is cut at. */
    #dialogue .cap .caret { position: absolute; left: 0; top: 0; }
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
    /* ... and while it is the VISITOR'S turn the card is the thing they put a thumb on. The hidden
       input already covers the padding box; this takes the drawn bleed at the edge with it, so a
       thumb that lands on the pen stroke rather than inside it still opens the keyboard. Every
       other moment the card is transparent to pointers and a tap on the picture reaches the fan. */
    #dialogue .cap.asking { pointer-events: auto; }
    /* the keystrokes land here and nowhere else; nothing of it is ever seen */
    #dialogue .cap .keys {
      position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 2;
      pointer-events: auto; opacity: 0; border: 0; padding: 0; margin: 0; background: transparent;
      font: 16px sans-serif; color: transparent; caret-color: transparent; appearance: none; outline: 0;
    }
  `;
  return style;
}

// ---- MEASURING THE HAND -------------------------------------------------------------------------
// Round 11 and everything before it measured the card by putting a hidden copy of it off the side
// of the paper and asking the browser how tall a sentence was (the `ruler`). Nothing is laid out by
// the browser any more, so the ruler is gone and the arithmetic is the hand's own: signWidth for a
// word, done once and remembered, and a word space taken from the case's own advance.
//
// A word's width is measured STANDING ALONE, which is a hair off what it measures in the middle of
// a line — the hand gives every sort its own width, and that width is keyed to the sort's place in
// the string. The error over a whole line is well under a percent, so the measure is taken a
// percent short and the rag is honest.
const SPACE_ADV = 34; // the case's own advance for a word space, in cap units (titles-sign GLYPHS)
const SAFE = 0.99; // the measure, a percent short: a word measured alone is a hair off in company
function handMetrics(capH, contentW, padX = PAD_X) {
  const em = capH / 0.72;
  const widths = new Map();
  const M = {
    capH,
    em,
    lead: LINE_H * em,
    // what the arrow's corner costs the last line of a take that has another behind it. It is
    // taken off the RIGHT of that line only — the line is then centred in what is left, so the
    // words walk away from the mark rather than sitting in it. See THE MARK'S OWN CORNER.
    reserve: Math.max(0, ARROW_REACH - padX + ARROW_GAP) * em,
    // the canvas is the whole of the card's inside; the words are wrapped a little short of it, so
    // the pen's overshoot at the end of a stroke stays on the paper
    contentW,
    measure: Math.max(40, contentW - capH * 0.3) * SAFE,
    // the paper above and below the line grid the pen is allowed to reach into
    bleed: Math.ceil(capH * 0.5),
    pen: Math.max(1.3, capH * 0.125),
    // a word space plus the tracking on either side of it: what joining two words costs
    gap: (SPACE_ADV * capH) / 100 + 2 * TRACK * em,
    width(word) {
      let w = widths.get(word);
      if (w === undefined) {
        w = signWidth(word, { capH, tracking: TRACK });
        widths.set(word, w);
      }
      return w;
    },
  };
  return M;
}

// A word wider than the whole measure — a visitor holding a key down, a URL — is broken by the
// hand rather than allowed off the card. Nothing else is hyphenated: this is a caption.
function breakLong(word, M) {
  if (M.width(word) <= M.measure) return [word];
  const out = [];
  let cur = '';
  for (const ch of word) {
    const next = cur + ch;
    if (cur && M.width(next) > M.measure) {
      out.push(cur);
      cur = ch;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}
// A string, folded into the case and cut into the words the card will set.
function foldWords(text, M) {
  const words = signFold(text).split(' ').filter(Boolean);
  return words.flatMap((w) => breakLong(w, M));
}

// Greedy wrap, the way help-bill wraps the notice. Returns [{ text, start }] where `start` is the
// character offset of the line's first sort inside `words.join(' ')` — which is the string the
// caption types itself out of, so the two always agree.
//
// `reserve` is the mark's corner: px taken off the measure of the LAST line the block is allowed
// (the fourth of a take that has another take behind it), and off no other line. Everything that
// wraps or counts words takes the same argument, so the fill, the cut and the strike agree on
// where the fourth line ends.
function wrapWords(words, M, maxLines = Infinity, reserve = 0) {
  const lines = [];
  let line = [];
  let w = 0;
  let start = 0;
  let at = 0;
  const last = Number.isFinite(maxLines) ? maxLines : 0;
  const room = () => M.measure - (reserve && lines.length + 1 === last ? reserve : 0);
  const flush = () => {
    lines.push({ text: line.join(' '), start });
    at += line.join(' ').length + 1;
    start = at;
    line = [];
    w = 0;
  };
  for (const word of words) {
    const ww = M.width(word);
    const cand = line.length ? w + M.gap + ww : ww;
    if (!line.length || cand <= room()) {
      line.push(word);
      w = cand;
      continue;
    }
    if (lines.length + 1 >= maxLines) break;
    flush();
    line.push(word);
    w = ww;
  }
  if (line.length) flush();
  return lines;
}
// How many words of `words`, starting at `i`, fill `maxLines` lines. Exclusive end index.
function fillTo(words, i, maxLines, M, reserve = 0) {
  let k = i, lines = 1, w = 0;
  while (k < words.length) {
    const ww = M.width(words[k]);
    const cand = w ? w + M.gap + ww : ww;
    if (!w || cand <= M.measure - (reserve && lines === maxLines ? reserve : 0)) {
      w = cand;
      k++;
      continue;
    }
    if (lines >= maxLines) break;
    lines++;
    w = ww;
    k++;
  }
  return Math.max(i + 1, k);
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
  // the visitor's next tap owes the field a keyboard — a field that opened with no gesture to
  // focus inside. One shot, dropped the moment it is spent or the field goes. See THE FIELD, ON A PHONE.
  let armed = false;
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
  // ---- ROUND 11: THE KEYBOARD, AND THE CARD UNDER IT ----------------------------------------------
  // A phone's on-screen keyboard does not change window.innerHeight. It covers the bottom of the
  // picture and leaves the layout viewport exactly where it was, so a card standing on the floor
  // line stands BEHIND it: measured on an iPhone 14, the card occupies 521–627 px of a 664 px
  // frame and the keyboard takes the bottom ~290. The visitor types and sees nothing appear, which
  // reads as the field not working at all.
  //
  // window.visualViewport is the thing a keyboard does move, so the card stands on the VISIBLE
  // floor while the field is open and drops back to the picture's own when it closes. Nothing else
  // about it changes — same measure, same centre, same drawn edge, same anchor — and on a desktop,
  // where nothing ever covers the frame, the inset is zero and this is not in the arithmetic at all.
  const KB_MIN = 80; // px of covered frame under which this is a URL bar shrinking, not a keyboard
  function kbInset() {
    const vv = window.visualViewport;
    if (!field || !vv) return 0;
    const h = ctx.size?.h || window.innerHeight || vv.height;
    const covered = Math.round(h - (vv.height + vv.offsetTop));
    return covered >= KB_MIN ? covered : 0;
  }
  let lastKb = 0;
  // Put the card on its anchor for the current shot. Its width is the anchor's measure and its
  // height follows from the row and the well — both fixed — so there is nothing here to measure and
  // nothing that a longer sentence can move. The anchor's `y` is the TOP of the block; a `y` below
  // the `floor` (which is every shot: 0.99 against 0.945) hangs the card by its BOTTOM edge on the
  // floor line instead, so the card stands on the same line of the picture all evening.
  let anchored = false; // true only on the rare top-anchored path, where fit() still has work
  let cardW = 0; // the card's width in px right now
  let hand = null; // the metrics everything on the card is measured and cut with (handMetrics)
  // The hand the card is written in RIGHT NOW: the cap height off the card's own measure, and the
  // em — which is the card's font-size, and so the unit every compartment in the stylesheet is
  // reserved in — at the same 0.72 the lettering itself uses. Rebuilt only when the card changes
  // size, because a new one throws away every measurement it had remembered.
  function setHand() {
    const capH = capForCard(cardW);
    const em = capH / 0.72;
    const pad = cap.classList.contains('narrow') ? PAD_X_NARROW : PAD_X;
    const padX = pad * em;
    const contentW = Math.max(60, cardW - 2 * padX);
    if (hand && Math.abs(hand.capH - capH) < 0.01 && Math.abs(hand.contentW - contentW) < 0.01) return false;
    hand = handMetrics(capH, contentW, pad);
    cap.style.fontSize = `${em.toFixed(3)}px`;
    return true;
  }
  function place() {
    const a = ANCHORS[shotName()];
    lastKb = kbInset(); // whatever branch this takes, the keyboard has been read for this drawing
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
    // the hand follows the measure; if it changed, everything lettered on the card is re-cut
    if (setHand()) recut();
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
      const line = ((1 - floor) * 100).toFixed(3);
      cap.style.bottom = lastKb ? `calc(${line}% + ${lastKb}px)` : `${line}%`;
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
  // A PHONE, HELD UP: narrower than the measure this piece already calls narrow, and taller than it
  // is wide. A laptop turned on its side is not one of these and neither is a tablet.
  function phonePortrait() {
    const W = ctx.size?.w || window.innerWidth || 1600;
    const H = ctx.size?.h || window.innerHeight || 900;
    return W <= PHONE && W < H;
  }
  function picking() {
    // A PHONE WITH THE DECK LAID OUT DOCKS TOO, and it is the same reason the pick docks. The user,
    // on the lay-out: "on mobile we'll need to move the chatbox to the top, as it currently covers
    // some of the cards." Seventy-eight cards fill the cloth to its rim and the bottom bows are
    // exactly where the placard stands, so on a phone in portrait the card hangs from the head for
    // as long as the rows are out — including the rake home, where they are still on the cloth —
    // and drops back to the foot the moment the deck is squared again. On a laptop the frame is
    // wide enough that the placard stands clear of the bows and nothing about the dock changes.
    // This is decided BEFORE the two tests below, because the card viewer and the lay-out are
    // exactly the case it is for: the sheet is cut to stand clear of the placard at whichever end
    // it is (help.js, bandRoom), so the plate simply gets the space under it. It keeps the pick's
    // own shot test for the pick's own reason — the camera may cut to him for an answer in the
    // middle of all this, and a frame with no cards in it has nothing for the card to cover.
    if (phonePortrait() && ctx.pieces.props?.deck?.out && SPREAD_SHOTS.includes(shotName())) return true;
    // …AND OTHERWISE NEVER WHILE A CARD IS UP ON THE ? CARD'S PAPER. The visitor has picked one out
    // of the lay-out to look at and he is teaching it (help-cards.js, flow.js), which means his
    // words are on this card while a sheet of paper fills the picture beside it. On a laptop that
    // sheet is cut for the placard AT THE FOOT — so the head is not on offer there, whatever the
    // camera is doing. (The lay-out is staged in `fan`, which is a spread shot with nothing picked
    // out of it, so without this the dock would take the card to the head and stand it on top of
    // the picture it is describing.)
    if (ctx.pieces.help?.cards?.showing) return false;
    // …nor while the EGG's lay-out is on the cloth (egg-deck.js): that is staged in `fan` too, and
    // reveal has nothing picked out of it, so this test would read it as the pick beat and take the
    // card to the head. Nobody is choosing three there — the seventy-eight are out to be looked at.
    if (ctx.pieces.props?.deck?.mode === 'open') return false;
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
  // The em the card is cut in right now, in px — the arrow and the thinking mark take their pen's
  // weight from it, and every compartment in the stylesheet is reserved in it.
  const fontPx = () => hand?.em ?? parseFloat(getComputedStyle(cap).fontSize) ?? 14;
  // The boil: the words are re-cut on every SECOND frame of the 12 fps clock, which is the tick
  // drawName has always shivered on and the one the notice's two plates alternate on.
  const boilTick = () => Math.floor((ctx.clock?.frame ?? 0) / 2);
  let placard = null;
  let placardSeed = 7;
  // WHAT IS LETTERED ON THE CARD RIGHT NOW. Three things, at most, and each of them a canvas:
  //   well   his take — wrapped whole, inked as far as `shown` characters (the typing)
  //   reply  the visitor's line as they write it, or nothing
  //   title  the three rows of a card's intertitle
  let wellInk = null; // { canvas, lines, text, shown }
  let replyInk = null; // { el, canvas, sr, lines }
  let titleInk = null; // [{ canvas, text, cap, track, seed }]

  // Cut everything that is standing again — after the card changed size, or on the boil. Each
  // canvas keeps the key it was drawn with, so a call that changes nothing costs one string.
  function recut() {
    paintWell();
    paintReply();
    paintTitle();
    placeCaret();
  }
  function paintWell() {
    if (!wellInk || !hand) return;
    drawBlock(wellInk.canvas, wellInk.lines, {
      width: hand.contentW, capH: hand.capH, lead: hand.lead, tracking: TRACK,
      pen: hand.pen, color: PEPE_GREEN, boil: boilTick(), seed: 3, shown: wellInk.shown, bleed: hand.bleed,
      inset: wellInk.inset,
    });
  }
  function paintReply() {
    if (!replyInk || !hand) return;
    drawBlock(replyInk.canvas, replyInk.lines, {
      width: hand.contentW, capH: hand.capH, lead: hand.lead, tracking: TRACK,
      pen: hand.pen, color: INK, boil: boilTick(), seed: 71, bleed: hand.bleed,
    });
  }
  function paintTitle() {
    if (!titleInk || !hand) return;
    for (const r of titleInk) {
      drawName(r.canvas, r.text, r.cap, {
        seed: placardSeed + r.seed, tracking: r.track, boil: boilTick(),
        pen: Math.max(1.3, r.cap * 0.125), maxW: hand.measure,
      });
    }
  }
  // Stand the card's inner block up. Everything on the card lives inside it and it is one fixed
  // height, so the card is the same object whatever is written on it.
  function frame(innerHTML) {
    wellInk = null;
    replyInk = null;
    titleInk = null;
    cap.innerHTML = `<div class="inner">${innerHTML}</div>`;
    placard = document.createElementNS(SVGNS, 'svg');
    placard.setAttribute('class', 'placard');
    placard.setAttribute('aria-hidden', 'true');
    cap.insertBefore(placard, cap.firstChild);
    cap.appendChild(arrow); // the same button, moved into the new block: never rebuilt
    drawCard();
  }
  // Set the card as a conversation: his register, then the visitor's. Both are always present,
  // whether or not there is anything to put in them.
  function render(replyText = '') {
    frame('<div class="well"></div><div class="reply"></div>');
    mountReply(replyText);
  }
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
  //
  // ROUND 12 measures with the hand instead of with the browser. The bisection is gone with the
  // ruler: a greedy fill is what the wrap itself does, so `fillTo` walks the words once and hands
  // back the last one that fits. Everything after that — the clause preference, the widow rule, the
  // numbers above — is untouched. ROUND 13 changed one number in it: the take is four lines deep
  // rather than two, which is the whole of what the user asked for.
  const BREAKS = [/[.?!…]["'”’)»]?$/, /[;:]$/, /,$/];
  const CLAUSE_REACH = 2; // words the cut may walk back to reach a clause ending, and no further
  function splitTakes(text, maxLines = BODY_LINES) {
    const M = hand;
    const words = foldWords(text, M);
    if (words.length < 2) return [words.join(' ') || signFold(text)];
    const takes = [];
    let i = 0;
    while (i < words.length) {
      // Filled with the arrow's corner left out of the last line — and then, if that turned out to
      // be the whole of the rest of the line, filled AGAIN without it: a take nothing follows shows
      // no arrow, so it has no mark to leave room for and keeps the whole measure.
      let max = fillTo(words, i, maxLines, M, M.reserve);
      if (max < words.length && fillTo(words, i, maxLines, M, 0) >= words.length) max = words.length;
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
    wellInk = null;
    replyInk = null;
    titleInk = null;
    standing = false;
    think = null;
    if (field) {
      const f = field;
      field = null;
      armed = false;
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
    armed = false;
    cap.classList.remove('asking');
    f.input?.remove();
    if (lastKb && !cap.hidden) place(); // the keyboard is going with it: the card back on the floor
    mountReply(lastAnswer);
    f.dispose?.(); // an ask() still waiting resolves null (its own settle() is re-entrant-safe)
  }
  // HIS WORDS OFF THE CARD, and the card left standing. One caller: the field opening under a take
  // that filled all four lines (round 13). It is not `cut()` — the placard keeps its place, its
  // measure and its seed, and the pen does not redraw it — and it is not `clear()`, which takes the
  // whole card off the paper.
  function clearWell() {
    const well = cap.querySelector('.well');
    if (well) well.innerHTML = '';
    wellInk = null;
    standing = false; // there is nothing of his on the card any more; the transcript has it
  }
  // Set one take into the well of a card that is already standing. The card itself is not touched:
  // same measure, same height, same seed — so the pen does not redraw and nothing flickers between
  // the takes of a long line.
  //
  // The take is wrapped WHOLE and its canvas is cut to the lines it occupies; it stands at the TOP
  // of the card's four (round 13 — it used to be bottom-aligned in a two-line well of its own), so
  // a one-line take is the first line of the card and the visitor's caret is on the second.
  // Returns the word marks the typing is counted against: `at` is the character offset just past a
  // word (and its space) inside the take, which is the same arithmetic the hidden word spans used
  // to carry.
  function setTake(text, more = false) {
    const well = cap.querySelector('.well');
    if (!well || !hand) return [];
    // the mark's corner is left out of the fourth line only, and only when a take follows this one
    const reserve = more ? hand.reserve : 0;
    const lines = wrapWords(text.split(' ').filter(Boolean), hand, BODY_LINES, reserve);
    well.innerHTML = '<div class="line"><canvas class="ink" aria-hidden="true"></canvas><span class="sr"></span></div>';
    const line = well.querySelector('.line');
    line.querySelector('.sr').textContent = text;
    const words = [];
    let count = 0;
    text.split(' ').forEach((w) => {
      count += w.length + 1;
      words.push({ at: count });
    });
    // THE FIRST WORD ARRIVES WITH THE CARD. A critic caught the card standing empty in two stills
    // out of twenty-four — not a hang, but the single frame between the card being drawn and the
    // clock's first tick — so the take is struck with its first word already down.
    wellInk = {
      canvas: line.querySelector('canvas'), lines, text,
      shown: words.length ? words[0].at - 1 : 0,
      // the corner the arrow will stand in, kept with the strike so the boil re-cuts it the same
      inset: reserve && lines.length >= BODY_LINES ? reserve : 0,
    };
    paintWell();
    // his take has decided how many lines are left; anything standing in theirs is re-rolled to fit
    if (replyInk) setReply(field ? field.input.value : lastAnswer);
    return words;
  }
  // THE VISITOR'S REGISTER. It is reserved whether or not there is a word in it, so the card holds
  // two lines of speech — one green, one black — and the place their words will go is a fixed
  // compartment rather than something they have to look for. In the running film there is only ever
  // what they are typing at that moment; it empties when they press Return.
  //
  // Their line ROLLS: past two lines the head of the sentence rides out of the top, a whole word at
  // a time, and the card does not grow by a pixel. The input holds every character regardless.
  function mountReply(text) {
    const reply = cap.querySelector('.reply');
    if (!reply) return;
    reply.innerHTML = '<div class="answer"><canvas class="ink" aria-hidden="true"></canvas><span class="sr"></span></div>';
    const el = reply.querySelector('.answer');
    replyInk = { el, canvas: el.querySelector('canvas'), sr: el.querySelector('.sr'), lines: [] };
    if (field) el.appendChild(field.caret[0]);
    setReply(text);
  }
  // How many of the card's four lines are left for them: what his take did not use. It is at least
  // one — a take that used all four has been taken off the card by the time the field opens (see
  // openBlock), and the dots are one line of his like any other.
  function freeLines() {
    const used = wellInk ? wellInk.lines.length : think ? 1 : 0;
    return Math.max(1, BODY_LINES - used);
  }
  function setReply(text) {
    if (!replyInk || !hand) return;
    const room = freeLines();
    let words = foldWords(text ?? '', hand);
    let lines = wrapWords(words, hand);
    while (lines.length > room && words.length > 1) {
      words = words.slice(1);
      lines = wrapWords(words, hand);
    }
    replyInk.lines = lines;
    replyInk.sr.textContent = lines.map((l) => l.text).join(' ');
    paintReply();
    placeCaret();
  }
  // THE CARET, PLACED. drawCaret's box is 12 x 26 with the nib standing from the baseline at 25.6
  // to 7, so the box's own baseline is at 0.985 of its height: put that on the lettering's baseline
  // and the nib stands on the line the next letter will go on, at any cap the card is cut at.
  function placeCaret() {
    if (!field || !replyInk || !hand) return;
    const c = field.caret[0];
    const L = replyInk.lines[replyInk.lines.length - 1] ?? { text: '' };
    const row = Math.max(0, replyInk.lines.length - 1);
    const w = L.text ? signWidth(L.text, { capH: hand.capH, tracking: TRACK }) : 0;
    const h = hand.capH * 1.44;
    c.style.height = `${h.toFixed(2)}px`;
    c.style.width = `${(h * (12 / 26)).toFixed(2)}px`;
    c.style.left = `${(hand.contentW / 2 + w / 2 + hand.capH * 0.16).toFixed(2)}px`;
    c.style.top = `${(row * hand.lead + (hand.lead - hand.capH) / 2 + hand.capH - h * (25.6 / 26)).toFixed(2)}px`;
  }
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
    render(lastAnswer);
    cap.hidden = false;
    const takes = splitTakes(text);
    const words = setTake(takes[0], takes.length > 1);
    standing = true;
    fit();
    drawCard();
    return { takes, words };
  }
  // How much of the take has been struck. The words appear whole, one at a time, as they always
  // have — a word is inked once the typing has reached its last character — but what carries it now
  // is a character count handed to the pen, so the line is measured and centred whole and only the
  // sorts up to that count are put down. The rag never moves.
  function reveal(words, chars) {
    if (!wellInk) return;
    let shown = 0;
    for (const w of words) if (w.at - 1 <= chars + 1e-6) shown = w.at - 1;
    if (shown === wellInk.shown) return;
    wellInk.shown = shown;
    paintWell();
  }
  // Move on to the next take of a line: the same card, a new set of words in its well.
  function nextTake(t) {
    setArrow(false); // the mark belongs to the take that has just gone
    t.ti += 1;
    t.words = setTake(t.takes[t.ti], t.ti < t.takes.length - 1);
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

  // ---- ROUND 11: THE FIELD, ON A PHONE ------------------------------------------------------------
  // The user, on a phone: "sometimes I can actually put something in, sometimes it doesn't really
  // work". Intermittent, and the reproduction (tools/_dlg-r11-touch.mjs — an iPhone 14 driven by
  // taps only, ten evenings) says why. A phone raises its on-screen keyboard for focus() only while
  // the gesture that asked for it is still in force, and `ask()` calls focus() in a PROMISE
  // CONTINUATION — after `await said`. So:
  //
  //   8 evenings in 10  the clock finished his last take, not the visitor. There is no gesture
  //                     anywhere near the focus() and no phone raises a keyboard for it. The caret
  //                     blinks in their register and the keys do nothing.
  //   2 evenings in 10  the visitor's own tap finished the take, the promise settled inside that
  //                     tap's task, and focus() DID land in the gesture — and then the same tap's
  //                     compatibility mousedown, 14 ms later, moved the focus to the body and put
  //                     the keyboard away again:
  //
  //     28.014  pointerdown  canvas      → flow.onPointer → skip() → finish() → the promise
  //     28.015  focus()      input.keys  → focusin, activeElement = input.keys
  //     28.029  mousedown    canvas      → focusout, activeElement = body
  //
  // Three things follow, and all three are here rather than in flow.js, because none of them is
  // flow's business: it is the card's own field.
  const FOCUSABLE = '#ui, button, a[href], input, textarea, select, [contenteditable], [tabindex]';
  // ONE. Whether we are inside a gesture right now, measured the way a browser measures it: a flag
  // raised in the capture phase of every gesture event and lowered on the next MACROtask. A promise
  // continuation of something the gesture resolved runs as a microtask and still sees it — which is
  // exactly the case a phone raises a keyboard for.
  let gesture = null;
  for (const g of ['pointerdown', 'pointerup', 'touchend', 'mousedown', 'click'])
    window.addEventListener(g, () => {
      gesture = g;
      setTimeout(() => {
        gesture = null;
      }, 0);
    }, true);
  // TWO. THE CARD IS THE TAP TARGET, and it focuses the field in the pointerdown itself — never a
  // frame later. The hidden input covers the card, so most taps focus it natively; this catches the
  // drawn bleed at the edge and any moment the input is not the top-most thing under the thumb.
  cap.addEventListener('pointerdown', (e) => {
    if (!field || e.target === field.input) return; // the input took it itself: let it, natively
    e.preventDefault(); // ... and nothing on the card may take the focus off it instead
    field.input.focus();
  });
  // THREE. A TAP SOMEWHERE ELSE MAY NOT TAKE THE FIELD AWAY. mousedown's DEFAULT ACTION is what
  // moves the focus, so cancelling it — and nothing else of the event; flow listens on pointerdown
  // and is untouched, and the click still fires — is the whole of the second fault above. Controls
  // that are meant to take the focus (the help bill in #ui, a button, another field) keep it.
  //
  // And the first fault: the field that opened with no gesture to focus inside cannot raise a
  // keyboard, so the visitor's NEXT tap is spent on it, once, wherever it lands. Not while a tap
  // already belongs to something else on the table — the spread being chosen from, a card lying
  // face up that a finger on it would bring back — where the card itself is the target and a
  // keyboard over the cloth would be an ambush. (`armed` itself is declared with the rest of the
  // field's state, up top, because cut() and closeField() drop it.)
  function tapIsOurs() {
    const f = ctx.pieces.flow;
    if (f && f.beat === 'fan') return false; // the spread is out: every tap belongs to the cards
    return (ctx.pieces.reveal?.picks?.length ?? 0) === 0; // cards are down and touchable
  }
  window.addEventListener('pointerdown', (e) => {
    if (!field || !armed || e.target === field.input || e.target?.closest?.('#dialogue')) return;
    if (!tapIsOurs()) return;
    armed = false;
    field.input.focus();
  }, true);
  window.addEventListener('mousedown', (e) => {
    if (!field || e.target === field.input || e.target?.closest?.(FOCUSABLE)) return;
    e.preventDefault();
    if (document.activeElement !== field.input) field.input.focus();
  }, true);

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
      render(lastAnswer);
      cap.hidden = false;
    }
    const well = cap.querySelector('.well');
    if (!well) return;
    well.innerHTML = '<div class="line think"><svg aria-hidden="true"></svg></div>';
    wellInk = null;
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
  //
  // ROUND 12: their words are LETTERED, in the same hand as his and in ink, with the drawn caret
  // standing at the end of the last line of them. Nothing about the register changed but the pen.
  function drawAnswer() {
    if (!field) return;
    setReply(field.input.value);
    fit();
  }
  function openBlock(value = '') {
    const reply = cap.querySelector('.reply');
    if (!reply) return null;
    // ROUND 13 — A FULL CARD IS CLEARED FOR THEM. The user: "The user's cursor can pop up on an
    // empty chatbox after pepe spoke if the chatbox is full. if it isn't full the user can type
    // into the line below pepe." A take that used all four lines has left no line to write on, and
    // the answer is not to squeeze them in beside him: his words come off the paper and the caret
    // has the whole card. Nothing of his is lost — the transcript keeps every sentence (mind.js,
    // history) and so does the sheet the visitor takes away (help-keep.js) — and the card does not
    // change shape, place or measure doing it. A take that left even one line is untouched: they
    // write under his last word, in their own ink, exactly as they always have.
    if (wellInk && wellInk.lines.length >= BODY_LINES) clearWell();
    cap.classList.add('asking');
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
    // WHAT THE PHONE'S OWN KEYBOARD IS TOLD. The face is 16 px (the .keys rule) because anything
    // smaller makes iOS zoom the whole picture the moment the field takes the focus. The rest:
    //   enterkeyhint  the Return key reads SEND, which is what it does — the visitor's turn ends
    //   autocapitalize  their words are set in capitals on the card either way; what goes to the
    //                   mind is a sentence, so it is sentence-cased like one
    //   autocorrect / spellcheck  off: a name off a tarot card is not a typo
    input.setAttribute('enterkeyhint', 'send');
    input.setAttribute('inputmode', 'text');
    input.setAttribute('autocapitalize', 'sentences');
    input.setAttribute('autocorrect', 'off');
    input.value = value;
    cap.appendChild(input);
    field = { input, caret: [c] };
    mountReply(value); // their register, re-cut with the caret standing in it
    input.addEventListener('input', drawAnswer);
    return input;
  }

  // A CARD NAMED OUT OF A READING. `position === false` says there is no position — the card was
  // not drawn for anybody, it is one of the seventy-eight lying face up on the cloth and the
  // visitor has touched it (egg-deck.js). script.js's `positionKey` falls back to 'brought' for
  // anything it does not recognise, which printed "What you brought" under a card nobody drew, so
  // the bare case is asked for explicitly and the bottom register is simply left empty. Every
  // caller in a reading passes a number and is untouched.
  function interLines(slug, position) {
    const card = bySlug[slug];
    const key = positionKey(position);
    const idx = position === false ? -1 : ['brought', 'going', 'do'].indexOf(key);
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

    // THE BAND THE CARD STANDS IN, whether or not there is a word on it: the strip of the frame the
    // placard occupies (or would occupy the moment he says anything), in px, bleed included.
    //
    // It is arithmetic and not a measurement, deliberately: the card's height is FIXED — four lines
    // of type and the two paddings, in ems of the hand this measure is cut in (round 13; it was two
    // lines of his over two of theirs with a gap between, which came to the same kind of number)
    // — so the answer is the same whether the card is up or the paper is bare, and a piece laying
    // itself out around the placard is not made to wait for him to speak first. `at` says which
    // edge it hangs from: 'foot' all evening, 'head' through the pick and, on a phone, for as long
    // as the deck is laid out (see THE DOCK).
    //
    // help.js asks: the card viewer's sheet is cut to end clear of this band — above `top` at the
    // foot, below `bottom` at the head — so his lesson about the card in the picture has somewhere
    // to stand, whichever end he is standing at.
    band() {
      const H = ctx.size?.h || window.innerHeight || 900;
      const em = hand?.em ?? capForCard(cardW || 300) / 0.72;
      const h = (BODY_LINES * LINE_H + 0.86 + 0.9) * em + 2 * PLACARD_BLEED;
      if (picking()) {
        const top = headFrac() * H - PLACARD_BLEED;
        return { at: 'head', top, bottom: top + h, h, w: cardW };
      }
      const a = ANCHORS[shotName()];
      const floor = Math.min(a?.floor ?? 0.945, 1 - barFrac() - 0.028);
      const bottom = floor * H - lastKb + PLACARD_BLEED; // the keyboard lifts it; place() does the same
      return { at: 'foot', top: bottom - h, bottom, h, w: cardW };
    },

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
      // ALL THREE ROWS ARE LETTERED (round 12). The card's own name has always been (STYLE.md
      // §2.6); the numeral over it and the position under it were the caption's set face and are
      // now cut by the same hand, smaller and tracked wider, so an intertitle is one printer's work
      // like everything else on the card. It is the SAME card as every caption's, the same measure
      // and the same height — but a title is not a conversation, so it stands across the whole
      // inner block rather than in the two registers.
      // A REGISTER WITH NOTHING IN IT IS NOT CUT. In a reading all three rows have words — the
      // numeral or the ordinal, the name, the position — but a card named on its own has no
      // position (egg-deck.js), and an empty row still took its own height and left a third of the
      // placard blank paper under the name. The row is only laid when there is something to print.
      const row = (cls, text) => (text ? `<div class="row ${cls}"><canvas aria-hidden="true"></canvas><span class="sr">${esc(text)}</span></div>` : '');
      frame(`<div class="title">` + row('n', n) + row('name', name) + row('pos', label) + `</div>`);
      // the name is half again the card's own cap; the numeral and the position are set back to a
      // small hand, and never under the 13 px the world's rules put on lettering
      const small = Math.max(13, hand.capH * 0.82);
      const q = (cls) => cap.querySelector(`.title .row.${cls} canvas`);
      titleInk = [
        { canvas: q('n'), text: n, cap: small, track: 0.34, seed: 1 },
        { canvas: q('name'), text: name, cap: hand.capH * 1.5, track: 0.2, seed: 2 + name.length },
        { canvas: q('pos'), text: label, cap: small, track: 0.22, seed: 3 },
      ].filter((r) => r.canvas && r.text);
      paintTitle();
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
      if (!ctx.shotMode) {
        input.focus();
        // ROUND 11. This focus() is in a promise continuation. If the visitor's own tap is what
        // finished his last take it is still inside that tap and a phone raises its keyboard for
        // it; if the clock finished the take there is no gesture here at all and no keyboard is
        // possible — so their next tap is armed to open it instead. See THE FIELD, ON A PHONE.
        armed = !gesture;
      }
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
          // A key confirming an IME candidate is not the end of a turn. Android soft keyboards
          // report every key of a composition as keyCode 229, and so does every CJK keyboard on a
          // laptop: the Return that closes the candidate list must not send the line.
          if (e.isComposing || e.keyCode === 229) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            settle('');
          }
        });
        // ... and the soft keyboards that deliver their Return as an EDIT rather than as a key.
        // enterkeyhint="send" gets most of them to send a keydown; this is the rest.
        input.addEventListener('beforeinput', (e) => {
          if (e.inputType !== 'insertLineBreak' && e.inputType !== 'insertParagraph') return;
          e.preventDefault();
          submit();
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
        // ... and the on-screen keyboard sliding up or away under it. visualViewport fires its own
        // resize, but a phone animates the keyboard over several frames and iOS is not reliable
        // about firing for every one of them, so the inset is also read on the stepped clock.
        if (!travel && (Math.abs(barFrac() - lastBar) > 0.001 || kbInset() !== lastKb)) place();
        drawCard();
        // THE BOIL. Every word on the card is re-cut on this frame if the tick moved — the same
        // second-frame shiver the notice's two plates alternate on, and the same one drawName has
        // always had. Each canvas remembers the key it was struck with, so a frame that changes
        // nothing costs three string comparisons and no drawing at all.
        paintWell();
        paintReply();
        paintTitle();
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
    // the lettering is cut at the display's own resolution, and to the card's own measure: throw
    // away every strike the card is carrying and cut them again
    for (const c of cap.querySelectorAll('canvas')) c.dataset.k = '';
    recut();
    fit();
    if (placard) placard.dataset.k = ''; // force the card to be re-cut at the new size
    drawCard();
  });
  // The keyboard opening and shutting, and the picture being pushed about under it. It is NOT the
  // window resize above: window.innerHeight does not move for a keyboard, so nothing else in the
  // film hears this at all — only the card, and only to stand above the visible floor.
  if (window.visualViewport) {
    const onKeyboard = () => {
      if (cap.hidden) return;
      place();
      fit();
      drawCard();
    };
    window.visualViewport.addEventListener('resize', onKeyboard);
    window.visualViewport.addEventListener('scroll', onKeyboard);
  }
  // The card's measure and the hand it is written in, before a word of it is asked for: splitTakes
  // is measured against them and it may be called before the card has ever stood up.
  place();
  return api;
}
