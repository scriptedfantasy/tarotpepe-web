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
// 300 px), one height, one place, whatever is written on it — the speaker's row and a well of
// exactly two lines, both reserved before a word is set. A line too long for the well does not
// stretch the card: it is cut into TAKES at its own clauses and the takes are played into the same
// card. See WELL_LINES, `measure`, `splitTakes`.
//
// ONE VOICE OF TYPE, ONE HAND OF LETTERING, and nothing else on the card:
//   · the words — his line and the visitor's alike — are the typewriter serif, capitals, tracked,
//     the film's own face for labels beside a figure (STYLE.md §1.7, `fd-anim-cast-labels-van`);
//   · the NAMES — the speaker over the rule, a card's name in an intertitle — are LETTERED, in the
//     small hand-cut alphabet of titles-sign.js, drawn on a canvas. Nothing inside the drawing is
//     set in a system font (the checklist's rule 7).
// The visitor's words carry no label at all: they set into the same well, under the last sentence
// of his question, and the ink caret blinks at the end of them. His name comes off the card while
// they hold the pen. The "YOU" that used to stand over an empty block was a form label in a film
// frame, and it is gone.
//
// Placement. `anchors` names a spot per camera shot — {shot: {x, y, w, floor}} — and every shot has
// the same one: centred at the foot of the frame, where a film puts its subtitles. See ANCHORS.
//
// The visitor's answer is drawn, not typed into a form: the same face, in the same two-line well,
// with an ink dash for a caret that blinks on the 12 fps clock. As they write past two lines the
// well rolls — his question, then the head of their own sentence, ride out of the top of the card,
// a whole line at a time — and the card does not grow. A hidden input takes the real keystrokes
// (and the speech recogniser's words) and nothing else.
//
// The microphone is a prop, not an icon: a pen-drawn carbon microphone on a stand that stands on
// the table beside the ashtray (its world position is projected into the frame, so it sits in the
// picture and takes the shot's perspective), ringed with ink while it is listening.
//
// API (ctx.pieces.dialogue):
//   say(text, {hold, who, keep}) → Promise     reveals a caption, resolves after it has been read
//   ask(prompt, {respond, signal, timeout, value, instant}) → Promise<string|null>
//                                              says the prompt, opens the visitor's block (+ the mic),
//                                              resolves with the text on Return ('' on Escape); null when
//                                              the signal aborts or `timeout` seconds pass; `instant` shows
//                                              the prompt at once (judging stills); `value` pre-fills it
//   skip()                                     the visitor's key: the line typed out in full, then (again) cut
//   asking                                     true while the visitor's block is up
//   voice                                      {on, canListen, canSpeak}; setVoice(on)
//   reply(answer) → string                     the line that folds the answer back, verbatim
//   intertitle(slug, position, {hold})         the card's held title, on a card of its own
//   read(slug, position) → Promise             intertitle, then the card's lines (speaker named once)
//   folio(beat)                                names the beat (greeting, question, ...)
//   lineFor/linesFor(slug, position)           the card's lines for that position
//   clear()                                    cuts whatever is up
//   anchors                                    {shot: {x, y, w, floor}} — editable; flow.js sets the same
//   setState(name)                             greeting | question | reading | farewell (+ any script key)
import { SCRIPT, lineFor, linesFor, reply as scriptReply, POSITIONS, positionKey } from './script.js';
import { bySlug } from '../core/deck.js';
import { INK } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { SVGNS, drawCaret, drawMic, drawPlacard, drawName, CAN_LETTER, PLACARD_BLEED, nameBoxHeight } from './dialogue-ink.js';

export const meta = {
  name: 'dialogue',
  judge: { shot: 'pepe', states: ['greeting', 'question', 'reading', 'farewell'], dom: true },
  files: ['src/pieces/dialogue.js', 'src/pieces/dialogue-ink.js', 'src/pieces/script.js'],
};

const CPS = 28; // characters per second; words appear whole, on the 12fps clock
const INTER_HOLD = 1.5; // seconds a card's intertitle is held
const BAR = 0.07; // the titles piece's letterbox bar, fraction of the frame
const BLINK = 6; // frames the caret is on, then off (12fps → half a second each)
const BLINK_LISTEN = 3; // ... while the microphone is listening: twice as quick

// THE CARD IS ONE OBJECT, AND IT DOES NOT RESIZE. Round 3 shrink-wrapped it to each line — 700 px
// for one sentence, 560 for the next, 980 for the one after — so under a table that never moved the
// card grew and shrank like a browser element and re-cut itself mid-conversation. A film's
// lower-third is a physical card: one width, one height, and the type is SET INTO it. So:
//
//   · the measure is a fraction of the frame and nothing else (46% wide, ~90% on a phone);
//   · the words live in a WELL of exactly two lines, always two lines tall whether one word or
//     twenty-two are in it;
//   · the speaker's row is reserved whether or not this line names him;
//   · a line too long for the well is not allowed to stretch the card. It is CUT INTO TAKES and
//     the takes are played into the same card, one after the other, the way a subtitle changes
//     while the card it is set in does not. (The alternative — hold the line and let the card
//     grow — is the fault we are fixing.)
const WELL_LINES = 2; // the well, in lines of type. The whole point: it never changes.
const LINE_H = 1.5; // the leading, as a multiple of the type size (and the CSS line-height)
const TAKE_HOLD = 0.55; // seconds a take that is not the last of its line is held before the cut
const PHONE = 700; // frames narrower than this are a phone: the card takes nearly the whole width
// The type floors (BRIEF.md: nothing lettered below 13 px, 10 px for a speaker's name). The caption
// face is clamped at 13 px and the speaker's lettering cut no smaller than a 10 px cap height.
const FONT_MIN = 13;
const SPEAKER_CAP_MIN = 10;

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

// The microphone's place on the table: beside the ashtray (table-objects PLACES.ashtray is
// [-0.15, -0.13]), a little towards the visitor. Metres, table space; y is the cloth.
const MIC_SPOT = [-0.435, 0.14];
const MIC_TALL = 0.078; // how tall the prop stands in the world; its size in frame follows the shot

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Pepe's spoken voice: a calm English one, a little slow, a little low.
let chosenVoice = null;
function pickVoice() {
  if (chosenVoice) return chosenVoice;
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en/i.test(v.lang));
  const prefer = ['Daniel', 'Google UK English Male', 'Microsoft George', 'Oliver', 'Arthur', 'Google US English', 'Alex', 'Samantha'];
  chosenVoice =
    prefer.map((name) => en.find((v) => v.name === name || v.name.startsWith(name))).find(Boolean) ??
    en.find((v) => /GB/i.test(v.lang)) ??
    en[0] ??
    voices[0];
  return chosenVoice;
}
window.speechSynthesis?.addEventListener?.('voiceschanged', () => (chosenVoice = null));

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
    /* THE ROW and THE WELL — the two fixed compartments the type is set into. Both are reserved
       before a word is written, so the card is the same object on every line of the evening. */
    #dialogue .cap .row {
      height: var(--row, 1.2em); display: flex; align-items: flex-end; justify-content: center;
      margin: 0 0 0.6em;
    }
    #dialogue .cap .well {
      height: calc(${WELL_LINES} * ${LINE_H}em); overflow: hidden;
      display: flex; flex-direction: column; justify-content: center;
    }
    /* what is in the well keeps its own height and the well clips it — it is never squeezed */
    #dialogue .cap .well > * { flex: 0 0 auto; }
    /* while the visitor writes, the well fills from the bottom: his question rides up out of the
       card as their answer takes the room, the way a two-line subtitle rolls */
    #dialogue .cap.asking .well { justify-content: flex-end; }
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
    /* the speaker's name: lettered by hand, standing in the reserved row */
    #dialogue .cap .who { display: block; line-height: 0; margin: 0 auto; }
    #dialogue .cap .who > canvas { display: block; margin: 0 auto; }
    /* the card's title: its name lettered, the numeral and the position set small */
    #dialogue .cap .n { font-size: 0.72em; letter-spacing: 0.42em; text-indent: 0.42em; font-weight: 600; line-height: 1.5; }
    #dialogue .cap .name { display: block; line-height: 0; margin: 0 auto; }
    #dialogue .cap .name > canvas { display: block; margin: 0 auto; }
    #dialogue .cap .pos { font-size: 0.72em; letter-spacing: 0.32em; text-indent: 0.32em; font-weight: 600; line-height: 1.5; }
    /* the line he is saying now, and the tail of the one he said before it */
    #dialogue .cap .line, #dialogue .cap .said { margin: 0; }
    /* the visitor's own words: the same face, the same size, the same case, on the same line grid */
    #dialogue .cap .answer {
      font-size: 1em; font-weight: 600; letter-spacing: 0.085em; text-indent: 0.085em;
      line-height: 1.5; word-break: break-word; margin: 0;
    }
    #dialogue .cap .caret { display: inline-block; width: 0.86em; height: 1.12em; vertical-align: baseline; margin-left: 0.06em; }
    #dialogue .cap .caret > svg { display: block; width: 100%; height: 100%; overflow: visible; }
    #dialogue .cap .caret.off { visibility: hidden; }
    /* the keystrokes land here and nowhere else; nothing of it is ever seen */
    #dialogue .cap .keys {
      position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 2;
      pointer-events: auto; opacity: 0; border: 0; padding: 0; margin: 0; background: transparent;
      font: 16px var(--typewriter); color: transparent; caret-color: transparent; appearance: none; outline: 0;
    }
    /* the microphone: a prop standing on the table */
    #dialogue .mic {
      position: absolute; pointer-events: auto; cursor: pointer; padding: 0; margin: 0; border: 0;
      background: transparent; appearance: none; outline: 0; display: block; color: ${INK};
    }
    #dialogue .mic[hidden] { display: none; }
    #dialogue .mic > svg { display: block; width: 100%; height: 100%; overflow: visible; }
    #dialogue .mic .ball { fill: none; }
    #dialogue .mic.on .ball { fill: ${INK}; }
    #dialogue .mic.on .grille { display: none; }
    #dialogue .mic .ring { visibility: hidden; }
    #dialogue .mic.listening .ring { visibility: visible; }
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
  const THREE = ctx.THREE;
  const root = ctx.dom.dialogue;
  document.head.appendChild(buildStyle());
  setAnchors(ctx.size?.w || window.innerWidth || 1600);

  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.hidden = true;
  root.appendChild(cap);

  // the microphone stands in the picture whether or not a caption is up
  const mic = document.createElement('button');
  mic.type = 'button';
  mic.className = 'mic';
  mic.hidden = true;
  mic.setAttribute('aria-label', 'Speak instead of typing');
  mic.title = 'Speak instead of typing';
  const micSvg = document.createElementNS(SVGNS, 'svg');
  micSvg.setAttribute('aria-hidden', 'true');
  drawMic(micSvg, 31);
  mic.appendChild(micSvg);
  root.appendChild(mic);

  let typing = null; // { words, start, hold, done, keep, chars }
  let inter = null; // { until, done }
  let field = null; // { input, answer:[el,el], caret:[el,el], submit, dispose }
  let beat = 'idle';
  let named = false; // the speaker has been named in this beat
  let spoke = -Infinity; // clock time the last caption was cut; a long silence re-names the speaker

  // ---- the voice: the visitor's (SpeechRecognition) and Pepe's (speechSynthesis) ----
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const canListen = !!Recognition;
  const canSpeak = !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function';
  let voiceOn = false;
  let recog = null;
  let utterance = null;
  function hush() {
    if (!canSpeak) return;
    utterance = null;
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  function speak(text) {
    if (!canSpeak || !voiceOn || ctx.shotMode) return Promise.resolve();
    hush();
    return new Promise((res) => {
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        if (utterance === u) utterance = null;
        res();
      };
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 0.9;
      u.pitch = 0.85;
      u.onend = end;
      u.onerror = end;
      utterance = u;
      setTimeout(end, 1500 + (text.length / 9) * 1000); // a stuck synthesiser never holds the show
      try {
        window.speechSynthesis.speak(u);
      } catch {
        end();
      }
    });
  }
  function stopListening() {
    if (!recog) return;
    const r = recog;
    recog = null;
    try {
      r.onend = null;
      r.onresult = null;
      r.onerror = null;
      r.abort();
    } catch {}
    mic.classList.remove('listening');
  }
  // Listen into the visitor's block: interim words as they come, the final result submitted.
  function listen(submit) {
    if (!canListen || !voiceOn || !field || ctx.shotMode) return;
    stopListening();
    let r;
    try {
      r = new Recognition();
    } catch {
      return;
    }
    recog = r;
    r.lang = navigator.language || 'en-GB';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (ev) => {
      let text = '', final = false;
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final = true;
      }
      if (!field) return;
      field.input.value = text.trim();
      drawAnswer();
      if (final && text.trim()) submit();
    };
    r.onend = () => {
      if (recog !== r) return;
      recog = null;
      mic.classList.remove('listening');
      // the browser stops after a silence: keep the ear open while the block is up
      if (voiceOn && field) setTimeout(() => field && voiceOn && !recog && listen(submit), 250);
    };
    r.onerror = (ev) => {
      if (recog !== r) return;
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        recog = null;
        setVoice(false);
      }
    };
    try {
      r.start();
      mic.classList.add('listening');
    } catch {
      recog = null;
    }
  }
  function setVoice(on) {
    voiceOn = !!on && (canListen || canSpeak);
    mic.classList.toggle('on', voiceOn);
    ctx.emit?.('dialogue:voice', { on: voiceOn });
    if (!voiceOn) {
      stopListening();
      hush();
      if (typing) typing.speaking = false;
    } else if (field?.submit) listen(field.submit);
  }
  mic.addEventListener('pointerdown', (e) => e.stopPropagation());
  mic.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVoice(!voiceOn);
    field?.input?.focus();
  });

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
    sizeRows();
    if (mid) {
      anchored = false;
      cap.style.top = '';
      cap.style.bottom = '';
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
    if (!anchored || cap.hidden) return;
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
  // The cap height a name is cut at: the card's own name is the big line of an intertitle, the
  // speaker's the small one in the row above the well. Both are cut from the type size the card is
  // set at, so they follow the picture when the window changes — with a floor under the speaker's
  // (10 px of cap, BRIEF.md) so the hand still reads as a hand on a phone.
  const nameCap = (big) => (big ? Math.max(FONT_MIN, fontPx() * 0.95) : Math.max(SPEAKER_CAP_MIN, fontPx() * 0.72));
  // Reserve the speaker's row before anything is lettered into it. This is what makes a line that
  // names him and a line that does not the same card, exactly as tall, in exactly the same place.
  function sizeRows() {
    cap.style.setProperty('--row', `${nameBoxHeight(nameCap(false))}px`);
  }
  function letterNames() {
    for (const holder of cap.querySelectorAll('[data-t]')) {
      const canvas = holder.querySelector('canvas');
      if (!canvas) continue;
      const big = holder.classList.contains('name');
      const capH = nameCap(big);
      drawName(canvas, holder.dataset.t.toUpperCase(), capH, {
        seed: placardSeed + holder.dataset.t.length,
        tracking: big ? 0.2 : 0.34,
        pen: Math.max(1.35, capH * (big ? 0.13 : 0.185)),
      });
      holder.setAttribute('aria-label', holder.dataset.t);
    }
  }
  // Set the card: the reserved row, then the well. Both compartments are always present, whether
  // or not there is anything to put in them.
  function render(rowHTML, wellHTML) {
    cap.innerHTML = `<div class="row">${rowHTML}</div><div class="well">${wellHTML}</div>`;
    placard = document.createElementNS(SVGNS, 'svg');
    placard.setAttribute('class', 'placard');
    placard.setAttribute('aria-hidden', 'true');
    cap.insertBefore(placard, cap.firstChild);
    letterNames();
    drawCard();
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
  const lineHTML = (t) => `<div class="line">${wordMarkup(t)}</div>`;
  // Cut a line into takes, each of which fits the well. The most words that fit is found by
  // bisection (a dozen measurements for a long sentence rather than one per word) — and then the
  // cut is walked BACK to the last clause that ends inside it, the way a subtitler breaks a line:
  // a full stop first, then a semicolon or colon, then a comma. A take that ends on "made for a"
  // and hands "frog." to the next one is the mark of a machine, not of a hand.
  const BREAKS = [/[.?!…]["'”’)]?$/, /[;:]$/, /,$/];
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
        // do not walk back past a bit over half the take, or the card starts holding scraps
        const least = i + Math.max(1, Math.ceil((max - i) * 0.55));
        for (const re of BREAKS) {
          for (let j = max; j >= least; j--)
            if (re.test(words[j - 1])) {
              cut = j;
              break;
            }
          if (cut !== max) break;
        }
        // and never leave a widow: a last take of one or two words takes a few back with it
        const left = words.length - cut;
        if (left > 0 && left < 3 && cut - i > 3 && fits(cut, words.length)) cut -= 3 - left;
      }
      takes.push(words.slice(i, cut).join(' '));
      i = cut;
    }
    return takes;
  }
  // What of his question stands over the visitor's answer: its LAST SENTENCE, if that sets on one
  // line, and otherwise nothing. Cutting it by the line instead — the last rendered line of the
  // last take — left an orphan on the card ("TONIGHT?" over their answer, at 1600), which is worse
  // than a card that simply hands the well over.
  function askTail(text) {
    const parts = String(text)
      .split(/(?<=[.?!…])\s+/)
      .filter(Boolean);
    const last = (parts[parts.length - 1] ?? '').trim();
    return last && linesOf(lineHTML(last)) <= 1 ? last : '';
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
  function cut() {
    cap.hidden = true;
    cap.classList.remove('asking');
    cap.innerHTML = '';
    placard = null;
    mic.hidden = true;
    if (field) {
      const f = field;
      field = null;
      stopListening();
      f.dispose?.(); // an ask() still waiting resolves null
    }
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
  // Stand a fresh card up with the speaker's row set, and cut the line into takes that fit its
  // well. Returns the takes and the word spans of the first of them.
  function show(text, who) {
    cut();
    place();
    placardSeed = 7 + (String(text).length % 23) * 3;
    render(who ? nameHTML(who, 'who') : '', '');
    cap.hidden = false;
    const takes = splitTakes(text);
    const words = setTake(takes[0]);
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
    t.ti += 1;
    t.words = setTake(t.takes[t.ti]);
    t.chars = -1;
    t.start = ctx.clock.t;
    if (ctx.clock.frozen) reveal(t.words, Infinity);
  }
  // Finish the caption up (typing or intertitle): resolve its promise; cut it unless asked to keep.
  // A line still in its takes is finished on its LAST take, whole — never half-said.
  function finish() {
    if (typing) {
      const t = typing;
      typing = null;
      while (t.ti < t.takes.length - 1) nextTake(t);
      reveal(t.words, Infinity);
      if (!t.keep) cut();
      spoke = ctx.clock.t;
      t.done?.();
    }
    if (inter) {
      const i = inter;
      inter = null;
      cut();
      i.done?.();
    }
  }

  // ---- the visitor's block ------------------------------------------------------------------------
  // Their words are set exactly as his are — the same face, the same size, the same capitals — and
  // they are set into the SAME two-line well, under the last line of his question. There is NO
  // "YOU" over it: a form label sitting empty in the frame while it waits was the one thing on this
  // card that could not be a drawing. The blinking ink caret says whose turn it is.
  //
  // The well is two lines and stays two lines. So as their answer grows past one line, his question
  // rides up out of the top of the card and is gone, and past two the head of their own answer goes
  // with it — a rolling two-line subtitle. The card does not grow by a pixel.
  function drawAnswer() {
    if (!field) return;
    const el = field.answer;
    el.innerHTML = stableGlyphs(field.input.value);
    el.appendChild(field.caret[0]);
    fit();
  }
  function openBlock(value = '', tail = '') {
    const well = cap.querySelector('.well');
    if (!well) return null;
    cap.classList.add('asking');
    // his name comes off the card when the pen changes hands. The row stays reserved (so the card
    // does not move a pixel), but a card whose top line said TAROT PEPE over the visitor's own
    // sentence — which is what is left once his question has rolled out of the well — would be
    // labelling their words with his name.
    const row = cap.querySelector('.row');
    if (row) row.innerHTML = '';
    well.innerHTML = (tail ? `<div class="said">${glyphs(tail, mulberry32(17 + tail.length * 7))}</div>` : '') + '<div class="answer"></div>';
    const answer = well.querySelector('.answer');
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
    mic.hidden = !(canListen || canSpeak); // no ear, no prop: a dead object on the table is worse
    place_mic();
    input.addEventListener('input', drawAnswer);
    return input;
  }

  // ---- the microphone, standing on the table -------------------------------------------------------
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), fwd = new THREE.Vector3();
  function place_mic() {
    if (mic.hidden) return;
    const W = ctx.size.w || window.innerWidth, H = ctx.size.h || window.innerHeight;
    const y = ctx.layout.table.top + 0.0025;
    pA.set(MIC_SPOT[0], y, MIC_SPOT[1]).project(ctx.camera);
    pB.set(MIC_SPOT[0], y + MIC_TALL, MIC_SPOT[1]).project(ctx.camera);
    ctx.camera.getWorldDirection(fwd);
    const overhead = -fwd.y > 0.86; // a plan view: a standing prop would read as a mistake
    const sx = (pA.x * 0.5 + 0.5) * W, sy = (-pA.y * 0.5 + 0.5) * H;
    const tall = Math.abs((-pB.y * 0.5 + 0.5) * H - sy);
    const inFrame = pA.z < 1 && sx > W * 0.04 && sx < W * 0.96 && sy > H * 0.1 && sy < H * 0.99;
    // the card is an opaque object standing in the front of the picture: a prop that would fall
    // behind it is not on the table any more, so it goes to the corner of the frame instead
    const box = cap.hidden ? null : cap.getBoundingClientRect();
    let h, left, top;
    if (!overhead && inFrame && tall > 12 && !(box && sx > box.left - 34 && sx < box.right + 34 && sy > box.top - 8)) {
      h = Math.max(26, Math.min(58, tall * (66 / 54))); // 54 of the 66 drawn units are the prop's body
      left = sx - (h * 56) / 66 / 2;
      top = sy - h * (56.5 / 66);
    } else {
      // no table under it in this shot, or the card is over the table: it stands at the near right
      // corner of the picture, and never lower than the top edge of the card
      h = Math.max(34, Math.min(56, H * 0.062));
      left = W * 0.93 - (h * 56) / 66 / 2;
      top = H * (1 - barFrac()) - h - H * 0.035;
      if (box) top = Math.min(top, box.top - h - 6);
    }
    mic.style.width = `${((h * 56) / 66).toFixed(1)}px`;
    mic.style.height = `${h.toFixed(1)}px`;
    mic.style.left = `${left.toFixed(1)}px`;
    mic.style.top = `${top.toFixed(1)}px`;
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
  // Whether this caption names the speaker: asked for, first of a beat, or after a long silence.
  function nameFor(who) {
    if (who === true) return SCRIPT.speaker;
    if (who) return who;
    if (who === '') return '';
    if (!named || ctx.clock.t - spoke > 6) {
      named = true;
      return SCRIPT.speaker;
    }
    return '';
  }

  const api = {
    script: SCRIPT,
    lineFor,
    linesFor,
    reply: scriptReply,
    positions: POSITIONS,
    anchors: ANCHORS,

    // Name the beat of the evening. The first line said in a new beat names the speaker.
    folio(name) {
      if (name !== beat) named = false;
      beat = name;
      ctx.emit?.('dialogue:folio', { beat });
    },

    // Reveal one caption. `who` names the speaker above it (true forces the name, '' suppresses
    // it; by default it is added once per beat and after a long silence). `keep` leaves the
    // caption up after it resolves.
    say(text, { hold = 1.2, who = null, keep = false } = {}) {
      finish();
      const name = nameFor(who);
      const { takes, words } = show(text, name);
      // how long the line takes to say: the typing, plus a cut between each take and the next
      const seconds = text.length / CPS + (takes.length - 1) * TAKE_HOLD;
      ctx.pieces.pepeAnim?.say?.(text, seconds + 0.2);
      ctx.emit?.('dialogue:say', { text, who: name, seconds, takes: takes.length });
      return new Promise((res) => {
        typing = { words, takes, ti: 0, start: ctx.clock.t, hold, done: res, keep, chars: -1, speaking: false };
        if (ctx.clock.frozen) reveal(words, Infinity);
        // with the voice on the caption also waits for the line to be said
        if (voiceOn && canSpeak) {
          const t = typing;
          t.speaking = true;
          speak(text).then(() => {
            if (typing === t) t.speaking = false;
          });
        }
      });
    },

    // The card's title: numeral (or ordinal), name, position, on the bare paper beside the card.
    intertitle(slug, position, { hold = INTER_HOLD } = {}) {
      finish();
      const [n, name, label] = interLines(slug, position);
      cut();
      place();
      const rng = mulberry32(101 + name.length * 5);
      placardSeed = 13 + (name.length % 19) * 5;
      // The card's own name is hand-lettered, as it is on the card (STYLE.md §2.6); the numeral
      // above it and the position under it are the caption's set face, small. It is the SAME card
      // as every caption's: the numeral takes the speaker's reserved row, the name and the position
      // set into the two-line well.
      render(`<div class="n">${glyphs(n, rng)}</div>`, nameHTML(name, 'name') + `<div class="pos">${glyphs(label, rng)}</div>`);
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
    // no answer. With respond:true it also says the reply before resolving. With the voice on the
    // block also listens; a final recognition result submits.
    async ask(prompt = SCRIPT.question[0], { respond = false, who = null, hold = 0.2, signal = null, timeout = 0, value = '', instant = false } = {}) {
      if (signal?.aborted) return null;
      const said = api.say(prompt, { hold, who, keep: true });
      if (instant) finish();
      const onAbortSay = () => finish();
      signal?.addEventListener('abort', onAbortSay, { once: true });
      await said;
      signal?.removeEventListener('abort', onAbortSay);
      if (signal?.aborted || cap.hidden) {
        cut();
        return null;
      }
      // the last sentence of his question stands over their answer, and rides out of the top of the
      // card, a whole line at a time, as they write past it
      const input = openBlock(value, askTail(prompt));
      if (!input) return null;
      if (!ctx.shotMode) input.focus();
      const answer = await new Promise((res) => {
        let done = false;
        let timer = null;
        const settle = (v) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          window.removeEventListener('keydown', refocus, true);
          signal?.removeEventListener('abort', onAbort);
          cut();
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
          if (voiceOn) listen(submit);
        }
      });
      if (answer != null) ctx.emit?.('dialogue:answer', { answer });
      if (respond && answer != null) await api.say(scriptReply(answer), { hold: 1.4, who: '' });
      return answer;
    },

    // The visitor's key: a take still typing is shown whole and holds a moment; a take already
    // whole cuts to the next take of the line, or ends the line (or a card's title).
    skip() {
      if (typing) {
        const t = typing;
        const last = t.words[t.words.length - 1];
        const total = last ? last.at - 1 : 0;
        const whole = t.chars >= total;
        if (t.speaking) {
          hush();
          t.speaking = false;
        }
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
    get voice() {
      return { on: voiceOn, canListen, canSpeak };
    },
    setVoice,

    // A card, read: the title, then its lines, the speaker named on the first.
    async read(slug, position, { hold = 1.3 } = {}) {
      await api.intertitle(slug, position);
      const lines = linesFor(slug, position);
      for (let i = 0; i < lines.length; i++) await api.say(lines[i], { hold, who: i === 0 ? true : '' });
    },

    clear() {
      hush();
      if (typing) typing.speaking = false;
      finish();
      cut();
    },

    // Judging states. Deterministic: the caption is shown in full, no typing.
    //   ?line=<n>  which line of the beat   ?card=<slug>&pos=<0..2>  the reading   ?inter=1  its title
    //   ?answer=<text>  what the visitor has written so far
    setState(name) {
      finish();
      cut();
      const p = ctx.params;
      const i = +(p.get('line') ?? 0);
      const still = (text, who) => reveal(show(text, who).words, Infinity);
      api.folio(name);
      if (name === 'reading') {
        const slug = p.get('card') ?? 'the-moon';
        const pos = +(p.get('pos') ?? 1);
        if (p.get('inter') === '1') {
          api.intertitle(slug, pos, { hold: Infinity });
          return;
        }
        const lines = linesFor(slug, pos);
        still(lines[i] ?? lines[0], i === 0 ? SCRIPT.speaker : '');
      } else if (name === 'question') {
        api.ask(SCRIPT.question[i] ?? SCRIPT.question[0], {
          instant: true,
          value: p.get('answer') ?? 'I keep starting things and not finishing them.',
        });
      } else if (name === 'answer') {
        still(scriptReply(p.get('answer') ?? 'my brother has not called since March'), '');
      } else if (name === 'greeting') {
        still(SCRIPT.greeting[i] ?? SCRIPT.greeting[0], i === 0 ? SCRIPT.speaker : '');
      } else {
        const arr = Array.isArray(SCRIPT[name]) ? SCRIPT[name] : SCRIPT.farewell;
        still(arr[i] ?? arr[0], '');
      }
    },

    update(ctx) {
      if (!ctx.clock.stepped) return;
      const t = ctx.clock.t;
      // the card is one size and one place — the only thing that can move it is the letterbox bar
      // opening or closing under it, so watch for that and nothing else
      if (!cap.hidden) {
        if (Math.abs(barFrac() - lastBar) > 0.001) place();
        drawCard();
      }
      // the caret: an ink dash, on and off on the 12fps clock; quicker while the ear is open
      if (field) {
        const period = mic.classList.contains('listening') ? BLINK_LISTEN : BLINK;
        const off = !ctx.shotMode && Math.floor(ctx.clock.frame / period) % 2 === 1;
        for (const c of field.caret) c.classList.toggle('off', off);
        place_mic();
      }
      if (inter && t >= inter.until) finish();
      if (!typing) return;
      const chars = Math.floor((t - typing.start) * CPS + 1e-6);
      if (chars !== typing.chars) {
        reveal(typing.words, chars);
        typing.chars = chars;
      }
      const last = typing.words[typing.words.length - 1];
      const typed = typing.start + (last ? last.at - 1 : 0) / CPS;
      const more = typing.ti < typing.takes.length - 1;
      // a take that is not the last of its line cuts to the next one in the same card; the last
      // take of a line waits out its hold (and the spoken voice, if it is on) and ends the line
      if (more) {
        if (t >= typed + TAKE_HOLD) nextTake(typing);
      } else if (t >= typed + typing.hold && !typing.speaking) finish();
    },
  };
  ctx.on('resize', () => {
    setAnchors(ctx.size?.w || window.innerWidth || 1600);
    if (cap.hidden) return;
    place();
    letterNames(); // the lettering is cut at the display's resolution: re-cut it
    fit();
    if (placard) placard.dataset.k = ''; // force the card to be re-cut at the new size
    drawCard();
    place_mic();
  });
  return api;
}
