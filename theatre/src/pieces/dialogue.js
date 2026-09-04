// PIECE: dialogue — what Tarot Pepe says and how it appears.
//
// The writing lives in ./script.js (all data). This file is the presentation, and it follows the
// bible's rule for text in the drawn world (STYLE.md §1.7, `fd-anim-cast-labels-van`): typewriter
// serif capitals, letter-spaced, solid ink, centred, standing on the bare paper of the drawing
// itself. No placard, no card, no band, no background, no rule. The speaker is named once per beat
// in smaller tracked capitals above the first line, the way a credit names a person once.
//
// Legibility without a box. Every caption is drawn twice: once wide in paper (`.layer.halo`,
// a paper stroke around each glyph) and once in ink over it. On bare paper the halo is invisible;
// where a hatch stroke would run into a letter it knocks the stroke out for a hair's breadth, which
// is exactly what an inker does — the hatching stops at the lettering. It never becomes an edge,
// because it has none: it is the shape of the words.
//
// Placement. `anchors` names a spot per camera shot — {shot: {x, y, w}}, the centre and the width
// of the block as fractions of the frame — chosen from the bare passage of paper in each shot
// (measured off the frame, not guessed). Shots with no entry fall back to the foot of the picture.
//
// The visitor's answer is drawn, not typed into a form: a block of the same hand that wraps to as
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
//   intertitle(slug, position, {hold})         the card's held title, on bare paper beside it
//   read(slug, position) → Promise             intertitle, then the card's lines (speaker named once)
//   folio(beat)                                names the beat (greeting, question, ...)
//   lineFor/linesFor(slug, position)           the card's lines for that position
//   clear()                                    cuts whatever is up
//   anchors                                    {shot: {x, y, w}} — editable
//   setState(name)                             greeting | question | reading | farewell (+ any script key)
import { SCRIPT, lineFor, linesFor, reply as scriptReply, POSITIONS, positionKey } from './script.js';
import { bySlug } from '../core/deck.js';
import { INK, PAPER } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { SVGNS, drawCaret, drawMic, drawPlacard, PLACARD_BLEED } from './dialogue-ink.js';

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

// Where the caption stands, per camera shot: the centre (x, y) and the width of the block, as
// fractions of the frame. Every one of these is a passage of bare paper in that shot, measured off
// the rendered frame (tools/_bare.mjs): the cloth in front of him in the mediums, the wall left of
// the deck in the wide, the empty corner of the cloth in the top-downs.
const ANCHORS = {
  home: { x: 0.5, y: 0.815, w: 0.28 },
  wide: { x: 0.5, y: 0.82, w: 0.26 },
  pepe: { x: 0.5, y: 0.845, w: 0.33 },
  table: { x: 0.5, y: 0.845, w: 0.36 },
  spread: { x: 0.5, y: 0.06, w: 0.34 },
  fan: { x: 0.5, y: 0.06, w: 0.34 },
  card0: { x: 0.78, y: 0.3, w: 0.3 },
  card1: { x: 0.78, y: 0.3, w: 0.3 },
  card2: { x: 0.78, y: 0.3, w: 0.3 },
  deck: { x: 0.5, y: 0.14, w: 0.3 },
  door: { x: 0.5, y: 0.78, w: 0.28 },
};

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
    /* the caption: type standing on the paper of the drawing. No box, no band, no rule. */
    #dialogue .cap {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, 0);
      width: max-content; max-width: 30%; box-sizing: border-box; text-align: center;
      padding: 0.85em 1.15em 0.9em;
      font-family: var(--typewriter);
      font-size: clamp(9px, 1vw, 20px); line-height: 1.48;
      letter-spacing: 0.085em; text-indent: 0.085em; text-transform: uppercase;
      font-weight: 600; color: ${INK};
    }
    #dialogue .cap.mid { transform: translate(-50%, -50%); }
    /* the two passes: paper under, ink over, the same words in the same places */
    #dialogue .cap .layer.halo {
      position: absolute; left: 0; top: 0; width: 100%; z-index: 0; pointer-events: none;
      color: ${PAPER}; -webkit-text-stroke: 0.38em ${PAPER};
    }
    #dialogue .cap .layer.ink { position: relative; z-index: 1; }
    /* the drawn card the words stand on (the user asked for it back; see BRIEF.md) */
    #dialogue .cap > svg.placard {
      position: absolute; left: -12px; top: -12px; z-index: 0;
      overflow: visible; display: block; pointer-events: none;
    }
    #dialogue .cap.bare > svg.placard { display: none; }
    #dialogue .cap .g { display: inline-block; }
    #dialogue .cap .w { white-space: nowrap; }
    #dialogue .cap .line .w.hid { visibility: hidden; }
    #dialogue .cap .who {
      font-size: 0.66em; font-weight: 700; letter-spacing: 0.36em; text-indent: 0.36em;
      margin-bottom: 0.5em; white-space: nowrap;
    }
    /* the card's title, held on bare paper beside the card */
    #dialogue .cap .n { font-size: 0.76em; letter-spacing: 0.42em; text-indent: 0.42em; font-weight: 500; }
    #dialogue .cap .name { font-size: 1.5em; font-weight: 700; letter-spacing: 0.2em; text-indent: 0.2em; line-height: 1.2; margin: 0.3em 0 0.34em; }
    #dialogue .cap .pos { font-size: 0.76em; letter-spacing: 0.32em; text-indent: 0.32em; font-weight: 500; }
    /* the visitor's own words: the same hand, upper and lower case, wrapping as far as it needs */
    #dialogue .cap .you {
      font-size: 0.66em; font-weight: 700; letter-spacing: 0.36em; text-indent: 0.36em;
      margin: 0.62em 0 0.34em; white-space: nowrap;
    }
    #dialogue .cap .answer {
      font-size: 1em; font-weight: 500; text-transform: none; letter-spacing: 0.045em; text-indent: 0;
      line-height: 1.5; word-break: break-word;
    }
    #dialogue .cap .caret { display: inline-block; width: 0.86em; height: 1.12em; vertical-align: baseline; margin-left: 0.06em; }
    #dialogue .cap .caret > svg { display: block; width: 100%; height: 100%; overflow: visible; }
    #dialogue .cap .caret.off { visibility: hidden; }
    #dialogue .cap .layer.halo .caret path:not(.u) { display: none; }
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
// space is ever shown waiting for words.
function wordMarkup(text) {
  const rng = mulberry32(17 + text.length * 7);
  return text
    .split(' ')
    .map((w) => `<span class="w hid">${letters(w, rng)}</span>`)
    .join(' ');
}

const ORDINAL = ['The first card', 'The second card', 'The third card'];

export async function build(ctx) {
  const THREE = ctx.THREE;
  const root = ctx.dom.dialogue;
  document.head.appendChild(buildStyle());

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
  function fit() {
    if (!anchored || cap.hidden) return;
    const h = ctx.size.h || window.innerHeight;
    const lo = h * 0.035, hi = h * (1 - barFrac() - 0.028);
    const r = cap.getBoundingClientRect();
    let top = r.top;
    if (r.bottom > hi) top = Math.max(lo, top - (r.bottom - hi));
    if (top < lo) top = lo;
    if (Math.abs(top - r.top) > 0.5) cap.style.top = `${(top / h) * 100}%`;
  }

  // ---- the caption itself ------------------------------------------------------------------------
  let inkLayer = null, haloLayer = null;
  // Both passes carry the same markup; the paper one sits behind and knocks the hatching out.
  let placard = null;
  let placardSeed = 7;
  function render(html) {
    cap.innerHTML = `<div class="layer halo" aria-hidden="true">${html}</div><div class="layer ink">${html}</div>`;
    haloLayer = cap.querySelector('.layer.halo');
    inkLayer = cap.querySelector('.layer.ink');
    placard = document.createElementNS(SVGNS, 'svg');
    placard.setAttribute('class', 'placard');
    placard.setAttribute('aria-hidden', 'true');
    cap.insertBefore(placard, cap.firstChild);
    drawCard();
  }
  // The card is redrawn whenever the block changes size: the visitor's answer grows a line, the
  // window is resized, a longer sentence arrives. One pen, one seed per caption, so it does not
  // shiver while the words type in.
  function drawCard() {
    if (!placard || cap.hidden) return;
    const w = cap.offsetWidth, h = cap.offsetHeight;
    if (!w || !h) return;
    if (placard.dataset.w === String(w) && placard.dataset.h === String(h)) return;
    placard.dataset.w = String(w);
    placard.dataset.h = String(h);
    const lw = Math.max(1.6, Math.min(3.2, w * 0.006));
    drawPlacard(placard, w, h, placardSeed, lw);
  }
  function cut() {
    cap.hidden = true;
    cap.innerHTML = '';
    inkLayer = haloLayer = null;
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
    const rng = mulberry32(23 + text.length * 7 + (who ? 3 : 0));
    placardSeed = 7 + (text.length % 23) * 3;
    render(`${who ? `<div class="who">${glyphs(who, rng)}</div>` : ''}<div class="line">${wordMarkup(text)}</div>`);
    cap.hidden = false;
    const a = [...inkLayer.querySelectorAll('.line .w')];
    const b = [...haloLayer.querySelectorAll('.line .w')];
    const words = [];
    let count = 0;
    text.split(' ').forEach((w, i) => {
      count += w.length + 1;
      words.push({ els: [a[i], b[i]], at: count });
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
  function drawAnswer() {
    if (!field) return;
    const text = field.input.value;
    const html = stableGlyphs(text);
    for (const el of field.answer) {
      el.innerHTML = html;
      el.appendChild(el._caret);
    }
    fit();
  }
  function openBlock(value = '') {
    // the visitor's name and their words go into both passes, under the line Pepe just said
    const rng = mulberry32(91);
    const block = `<div class="you">${glyphs('You', rng)}</div><div class="answer"></div>`;
    for (const layer of [haloLayer, inkLayer]) layer.insertAdjacentHTML('beforeend', block);
    const answer = [inkLayer.querySelector('.answer'), haloLayer.querySelector('.answer')];
    for (const el of answer) {
      const c = document.createElement('span');
      c.className = 'caret';
      const s = document.createElementNS(SVGNS, 'svg');
      s.setAttribute('aria-hidden', 'true');
      drawCaret(s, 5);
      c.appendChild(s);
      el._caret = c;
    }
    const input = document.createElement('input');
    input.className = 'keys';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.maxLength = 240;
    input.setAttribute('aria-label', 'Your answer');
    input.value = value;
    cap.appendChild(input);
    field = { input, answer, caret: answer.map((el) => el._caret) };
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
      render(`<div class="n">${glyphs(n, rng)}</div><div class="name">${glyphs(name, rng)}</div><div class="pos">${glyphs(label, rng)}</div>`);
      cap.hidden = false;
      fit();
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
    if (cap.hidden) return;
    place();
    fit();
    if (placard) placard.dataset.w = ''; // force the card to be re-cut at the new size
    drawCard();
    place_mic();
  });
  return api;
}
