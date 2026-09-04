// PIECE: dialogue — what Tarot Pepe says and how it appears.
//
// The writing lives in ./script.js (all data). This file is the presentation.
//
// THE CARD. Every line Pepe says arrives on a drawn placard — a hand-cut card of the drawing's own
// paper, framed in one pen, like the sign the passenger holds up in the metro carriage of the Aline
// sequence (reference/fd-anim-metro-carriage.png). This is the user's decision and it is settled
// (BRIEF.md); a critic once had it removed in favour of free-floating type and the user asked for
// the card back. It is drawn in dialogue-ink.js: a deckled edge that bows and bites, four strokes
// that cross at every corner, and the wobbly ink rule that divides the name from the words.
//
// ONE VOICE OF TYPE, ONE HAND OF LETTERING, and nothing else on the card:
//   · the words — his line and the visitor's alike — are the typewriter serif, capitals, tracked,
//     the film's own face for labels beside a figure (STYLE.md §1.7, `fd-anim-cast-labels-van`);
//   · the NAMES — the speaker over the rule, a card's name in an intertitle — are LETTERED, in the
//     small hand-cut alphabet of titles-sign.js, drawn on a canvas. Nothing inside the drawing is
//     set in a system font (the checklist's rule 7).
// The visitor's words carry no label at all. A short ruled stroke divides them from his line, and
// the ink caret blinks under them; the "YOU" that used to stand over an empty block was a form
// label in a film frame, and it is gone.
//
// Placement. `anchors` names a spot per camera shot — {shot: {x, y, w, floor}} — and every shot has
// the same one: centred at the foot of the frame, where a film puts its subtitles. See ANCHORS.
//
// The visitor's answer is drawn, not typed into a form: a block of the same face that wraps to as
// many lines as it needs, with an ink dash for a caret that blinks on the 12 fps clock. A hidden
// input takes the real keystrokes (and the speech recogniser's words) and nothing else.
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
import { SVGNS, drawCaret, drawMic, drawPlacard, drawName, CAN_LETTER, PLACARD_BLEED } from './dialogue-ink.js';

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
// The measure, in characters rather than in fractions: the caption face is clamp(9px, 1vw, 20px),
// so below a 900 px window the type stops shrinking while the window does not, and a third of a
// phone's width would be four words a line. ~46 characters, plus the card's own margins, capped so
// the card never runs to the edges of the paper.
function measure(w) {
  const fs = Math.min(20, Math.max(9, w / 100));
  return Math.min(0.86, Math.max(0.3, (34.5 * fs) / Math.max(1, w)));
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
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, 0);
      width: max-content; max-width: 30%; box-sizing: border-box; text-align: center;
      padding: 0.9em 1.35em 0.95em;
      font-family: var(--typewriter);
      font-size: clamp(9px, 1vw, 20px); line-height: 1.5;
      letter-spacing: 0.085em; text-indent: 0.085em; text-transform: uppercase;
      font-weight: 600; color: ${INK};
    }
    #dialogue .cap.mid { transform: translate(-50%, -50%); }
    /* the drawn card the words stand on (the user asked for it back; see BRIEF.md) */
    #dialogue .cap > svg.placard {
      position: absolute; left: -${PLACARD_BLEED}px; top: -${PLACARD_BLEED}px; z-index: 0;
      overflow: visible; display: block; pointer-events: none;
    }
    #dialogue .cap > * { position: relative; z-index: 1; }
    #dialogue .cap .g { display: inline-block; }
    #dialogue .cap .w { white-space: nowrap; }
    #dialogue .cap .line .w.hid { visibility: hidden; }
    /* the speaker's name: lettered by hand above the rule, never set */
    #dialogue .cap .who { display: block; line-height: 0; margin: 0 auto 0.78em; }
    #dialogue .cap .who > canvas { display: block; margin: 0 auto; }
    /* the card's title: its name lettered, the numeral and the position set small */
    #dialogue .cap .n { font-size: 0.78em; letter-spacing: 0.42em; text-indent: 0.42em; font-weight: 600; }
    #dialogue .cap .name { display: block; line-height: 0; margin: 0.5em auto 0.46em; }
    #dialogue .cap .name > canvas { display: block; margin: 0 auto; }
    #dialogue .cap .pos { font-size: 0.78em; letter-spacing: 0.32em; text-indent: 0.32em; font-weight: 600; }
    /* the visitor's own words, under the divider: the same face, the same size, the same case */
    #dialogue .cap .answer {
      font-size: 1em; font-weight: 600; letter-spacing: 0.085em; text-indent: 0.085em;
      line-height: 1.5; word-break: break-word; margin: 0.86em 0 0;
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
  // Put the caption on its anchor for the current shot, or at the foot of the picture.
  // `y` is the TOP of the block (so a line of one sentence and a line of four begin on the same
  // line of the paper, and nothing moves when the visitor's words grow underneath); an anchor may
  // ask for `at: 'centre'` instead.
  let anchored = false;
  function place() {
    const a = ANCHORS[shotName()];
    anchored = !!a && a.at !== 'centre';
    cap.classList.toggle('mid', !!a && a.at === 'centre');
    if (a) {
      cap.style.left = `${a.x * 100}%`;
      cap.style.top = `${a.y * 100}%`;
      cap.style.bottom = '';
      cap.style.maxWidth = `${a.w * 100}%`;
    } else {
      cap.style.left = '50%';
      cap.style.top = 'auto';
      cap.style.maxWidth = '';
      cap.style.bottom = `${(barFrac() + 0.05) * 100}%`;
    }
  }
  // Keep a growing block inside the picture.
  // A card must never come down over the speaker. An anchor may set `floor`: the lowest line of
  // the frame its bottom edge may reach (a fraction, measured to just above Pepe's crown). When the
  // block grows — a longer sentence, the visitor's answer wrapping — it grows UP into the bare wall
  // instead of down onto his head.
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
  // speaker's a small one over the rule. Both are cut from the type size the card is set at, so
  // they follow the picture when the window changes.
  const nameCap = (big) => (big ? Math.max(14, fontPx() * 1.12) : Math.max(10, fontPx() * 0.72));
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
  function render(html) {
    cap.innerHTML = html;
    placard = document.createElementNS(SVGNS, 'svg');
    placard.setAttribute('class', 'placard');
    placard.setAttribute('aria-hidden', 'true');
    cap.insertBefore(placard, cap.firstChild);
    letterNames();
    drawCard();
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
  function show(text, who) {
    cut();
    place();
    placardSeed = 7 + (text.length % 23) * 3;
    render(`${who ? nameHTML(who, 'who') : ''}<div class="line">${wordMarkup(text)}</div>`);
    cap.hidden = false;
    const els = [...cap.querySelectorAll('.line .w')];
    const words = [];
    let count = 0;
    text.split(' ').forEach((w, i) => {
      count += w.length + 1;
      words.push({ els: [els[i]], at: count });
    });
    fit();
    drawCard();
    return words;
  }
  function reveal(words, chars) {
    for (const w of words)
      if (w.at - 1 <= chars + 1e-6) for (const el of w.els) el?.classList.remove('hid');
  }
  // Finish the caption up (typing or intertitle): resolve its promise; cut it unless asked to keep.
  function finish() {
    if (typing) {
      const t = typing;
      typing = null;
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
  // divided from his line by a short ruled stroke, not by a label. There is NO "YOU" over it: a
  // form label sitting empty in the frame while it waits was the one thing on this card that could
  // not be a drawing. The rule and the blinking ink caret say whose turn it is.
  function drawAnswer() {
    if (!field) return;
    const el = field.answer;
    el.innerHTML = stableGlyphs(field.input.value);
    el.appendChild(field.caret[0]);
    fit();
  }
  function openBlock(value = '') {
    cap.insertAdjacentHTML('beforeend', '<div class="answer"></div>');
    const answer = cap.querySelector('.answer');
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
    let h, left, top;
    if (!overhead && inFrame && tall > 12) {
      h = Math.max(26, Math.min(58, tall * (66 / 54))); // 54 of the 66 drawn units are the prop's body
      left = sx - (h * 56) / 66 / 2;
      top = sy - h * (56.5 / 66);
    } else {
      // no table under it in this shot: it stands at the near right corner of the picture
      h = Math.max(34, Math.min(56, H * 0.062));
      left = W * 0.93 - (h * 56) / 66 / 2;
      top = H * (1 - barFrac()) - h - H * 0.035;
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
      const words = show(text, name);
      const seconds = text.length / CPS;
      ctx.pieces.pepeAnim?.say?.(text, seconds + 0.2);
      ctx.emit?.('dialogue:say', { text, who: name, seconds });
      return new Promise((res) => {
        typing = { words, start: ctx.clock.t, hold, done: res, keep, chars: -1, speaking: false };
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
      // above it and the position under it are the caption's set face, small.
      render(
        `<div class="n">${glyphs(n, rng)}</div>` +
          nameHTML(name, 'name') +
          `<div class="pos">${glyphs(label, rng)}</div>`
      );
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
      const input = openBlock(value);
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

    // The visitor's key: a line still typing is shown whole and holds a moment; a line already
    // whole (or a card's title) is cut.
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
        } else finish();
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
      const still = (text, who) => reveal(show(text, who), Infinity);
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
      // the card grows with the block: a word typed in, a line of the visitor's answer wrapping
      if (!cap.hidden) drawCard();
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
      if (t >= typed + typing.hold && !typing.speaking) finish();
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
