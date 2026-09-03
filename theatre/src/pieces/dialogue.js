// PIECE: dialogue — what Tarot Pepe says and how it appears.
//
// The writing lives in ./script.js (all data). This file is the presentation: a small paper
// placard that the line brings with it into the picture, like the protest sign held up in the
// metro carriage of the Aline sequence — a card of the same paper as the drawing, one wobbly
// ink rule around it, the words set in Futura capitals, solid ink. No band, no grey, no
// hairline, nothing at less than full ink. The placard cuts in, reveals its words one at a
// time on the 12fps clock, holds, and cuts out in one frame. The speaker is named once per
// beat, in small tracked capitals above the first line, the way a credit names a person once.
// A card is announced by its own placard (numeral / name / position), held, then cut. The
// visitor's one text field is a single wobbly ink rule on the placard, nothing else.
//
// Placement: bottom centre of the frame by default (above the letterbox bar when one is up),
// which is the table's bare cloth in every shot, so the picture is never cropped or pushed.
// `anchors` may name another spot per camera shot: {shot: {x, y, w}} as fractions of the frame.
//
// Everything here is DOM + inline SVG; there is no canvas and no toDataURL (a readback from the
// software canvas costs seconds in the judging browser), so the piece builds in a millisecond.
//
// API (ctx.pieces.dialogue):
//   say(text, {hold, who, keep}) → Promise     reveals a caption, resolves after it has been read
//   ask(prompt, {respond, signal, timeout, value, instant}) → Promise<string|null>
//                                              says the prompt, shows the field (+ the mic toggle), resolves
//                                              with the text on Return ('' on Escape); null when the signal
//                                              aborts or `timeout` seconds pass; `instant` shows the prompt
//                                              at once (judging stills); `value` pre-fills the field
//   skip()                                     the visitor's key: the line typed out in full, then (again) cut
//   asking                                     true while the field is up
//   voice                                      {on, canListen, canSpeak}; setVoice(on) — when on, the visitor
//                                              speaks (SpeechRecognition into the field) and Pepe is spoken
//                                              (speechSynthesis) as well as typed
//   reply(answer) → string                     the line that folds the answer back, verbatim
//   intertitle(slug, position, {hold})         the card's held title placard
//   read(slug, position) → Promise             intertitle, then the card's lines (speaker named once)
//   folio(beat)                                names the beat (greeting, question, ...); the speaker is re-named on its first line
//   lineFor(slug, position) → string           the card's lines for that position as one string
//   linesFor(slug, position) → [string, ...]
//   clear()                                    cuts whatever is up
//   script                                     the whole script (data)
//   anchors                                    {shot: {x, y, w}} — editable
//   setState(name)                             greeting | question | reading | farewell (+ any script key)
import { SCRIPT, lineFor, linesFor, reply as scriptReply, POSITIONS, positionKey } from './script.js';
import { bySlug } from '../core/deck.js';
import { INK, PAPER } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const meta = {
  name: 'dialogue',
  judge: { shot: 'pepe', states: ['greeting', 'question', 'reading', 'farewell'], dom: true },
  files: ['src/pieces/dialogue.js', 'src/pieces/script.js'],
};

const CPS = 28; // characters per second; words appear whole, on the 12fps clock
const INTER_HOLD = 1.5; // seconds a card's intertitle is held
const BAR = 0.07; // the titles piece's letterbox bar, fraction of the frame
const BLEED = 10; // px the rule's svg extends past the placard box, for overshoots

// Where the placard sits, per camera shot: centre (x, y) and width, fractions of the frame.
// Shots without an entry get the default: bottom centre.
const ANCHORS = {};

const SVG = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// One pen stroke from (x1,y1) to (x2,y2): points every ~14px, drifting off the straight line by
// a slow random walk (a hand, not a jitter), the ends a little past the corners.
function stroke(x1, y1, x2, y2, rng, { wobble = 1.7, overshoot = 4 } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
  const nx = -dy, ny = dx;
  const o1 = overshoot * (0.3 + rng()), o2 = overshoot * (0.3 + rng());
  const n = Math.max(3, Math.round(len / 14));
  const pts = [];
  let off = (rng() - 0.5) * wobble;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    off += (rng() - 0.5) * wobble;
    off = Math.max(-wobble * 1.6, Math.min(wobble * 1.6, off));
    const s = -o1 + (len + o1 + o2) * u;
    pts.push([x1 + dx * s + nx * off, y1 + dy * s + ny * off]);
  }
  return pts;
}
const d = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

// The placard: paper fill inside four separately drawn sides, corners crossing by a few px.
function drawPlacard(svg, w, h, seed, lw) {
  const rng = mulberry32(seed);
  const W = w + 2 * BLEED, H = h + 2 * BLEED;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  const x0 = BLEED, y0 = BLEED, x1 = BLEED + w, y1 = BLEED + h;
  const sides = [stroke(x0, y0, x1, y0, rng), stroke(x1, y0, x1, y1, rng), stroke(x1, y1, x0, y1, rng), stroke(x0, y1, x0, y0, rng)];
  // the fill follows the same wobble, trimmed of the overshoots, so no paper shows past the rule
  const inner = sides.map((pts) => pts.slice(1, -1)).flat();
  svg.innerHTML =
    `<path d="${d(inner)}Z" fill="${PAPER}" stroke="none"/>` +
    sides.map((pts) => `<path d="${d(pts)}" fill="none" stroke="${INK}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
}

// The one rule the visitor writes on.
function drawRule(svg, w, seed, lw) {
  const rng = mulberry32(seed);
  const H = 10;
  svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', H);
  svg.innerHTML = `<path d="${d(stroke(4, H / 2, w - 4, H / 2, rng, { wobble: 1.1, overshoot: 1.5 }))}" fill="none" stroke="${INK}" stroke-width="${lw}" stroke-linecap="round"/>`;
}

// The mic: a small hand-drawn microphone, the same pen. Capsule, a cradle under it, a stem, a foot;
// solid ink when the voice is on. Two short arcs beside it show while it is listening.
function drawMic(svg, seed, lw) {
  const rng = mulberry32(seed);
  svg.setAttribute('viewBox', '0 0 24 24');
  const j = () => (rng() - 0.5) * 0.35;
  const cx = 12;
  // the capsule: a stadium, its two half-circles drawn point by point with the pen's shake
  const r = 3.1, yT = 5.2, yB = 9.6;
  const capsule = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    capsule.push([cx + Math.cos(a) * r + j(), yT + Math.sin(a) * r + j()]);
  }
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    capsule.push([cx + Math.cos(a) * r + j(), yB + Math.sin(a) * r + j()]);
  }
  // the cradle under it, the stem, the foot
  const cradle = [];
  for (let i = 0; i <= 12; i++) {
    const a = (0.03 + (0.94 * i) / 12) * Math.PI;
    cradle.push([cx + Math.cos(a) * 5.3 + j(), yB + Math.sin(a) * 5.3 + j()]);
  }
  const stem = stroke(cx, yB + 5.4, cx, 19.8, rng, { wobble: 0.3, overshoot: 0.4 });
  const foot = stroke(cx - 3.8, 20.2, cx + 3.8, 20.2, rng, { wobble: 0.3, overshoot: 0.5 });
  // two short arcs either side: the ear, shown while it listens
  const ear = (s) => {
    const p = [];
    for (let i = 0; i <= 8; i++) {
      const a = (-0.36 + (0.72 * i) / 8) * Math.PI;
      p.push([cx + s * 8.4 + s * Math.cos(a) * 2.4 + j(), 7.4 + Math.sin(a) * 2.4 + j()]);
    }
    return p;
  };
  const sw = (lw * 0.55).toFixed(2);
  const pen = `fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  svg.innerHTML =
    `<path class="cap-fill" d="${d(capsule)}Z" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<path d="${d(cradle)}" ${pen}/>` +
    `<path d="${d(stem)}" ${pen}/>` +
    `<path d="${d(foot)}" ${pen}/>` +
    `<path class="ear" d="${d(ear(1))}" ${pen}/>` +
    `<path class="ear" d="${d(ear(-1))}" ${pen}/>`;
}

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
    #dialogue { color: ${INK}; -webkit-font-smoothing: antialiased; font-family: var(--futura); }
    #dialogue .cap {
      position: absolute; left: 50%; bottom: 4.4%; transform: translate(-50%, 0);
      width: max-content; max-width: 26%; box-sizing: border-box; text-align: center;
      padding: 0.9em 1.25em 0.95em;
      font-size: clamp(11px, 1.12vw, 22px); line-height: 1.45; letter-spacing: 0.1em; text-indent: 0.1em;
      font-weight: 500; text-transform: uppercase; color: ${INK};
    }
    #dialogue .cap .g { display: inline-block; }
    #dialogue .cap.at { bottom: auto; transform: translate(-50%, -50%); }
    #dialogue .cap > svg.placard { position: absolute; left: ${-BLEED}px; top: ${-BLEED}px; z-index: -1; overflow: visible; display: block; }
    #dialogue .cap .who { font-size: 0.74em; font-weight: 700; letter-spacing: 0.34em; text-indent: 0.34em; margin-bottom: 0.55em; white-space: nowrap; }
    #dialogue .cap .line { text-wrap: balance; }
    #dialogue .cap .w { white-space: nowrap; }
    #dialogue .cap .line .w.hid { visibility: hidden; }
    #dialogue .cap.inter { padding: 1.1em 2.2em 1.15em; max-width: 32%; }
    #dialogue .cap.inter .n { font-size: 0.8em; letter-spacing: 0.4em; text-indent: 0.4em; font-weight: 500; }
    #dialogue .cap.inter .name { font-size: 1.5em; font-weight: 700; letter-spacing: 0.22em; text-indent: 0.22em; line-height: 1.25; margin: 0.28em 0 0.3em; }
    #dialogue .cap.inter .pos { font-size: 0.8em; letter-spacing: 0.3em; text-indent: 0.3em; font-weight: 500; }
    #dialogue .cap .fieldbox { position: relative; display: block; margin: 0.6em auto 0; width: 100%; min-width: 16em; }
    #dialogue .cap .fieldbox > svg { position: absolute; left: 0; bottom: -2px; display: block; }
    #dialogue .cap .field {
      pointer-events: auto; display: block; width: 100%; box-sizing: border-box;
      border: 0; outline: 0; border-radius: 0; box-shadow: none; appearance: none; background: transparent;
      font: inherit; letter-spacing: inherit; text-transform: none; text-indent: 0;
      color: ${INK}; caret-color: ${INK}; text-align: center; padding: 0 0.4em 0.3em; margin: 0;
    }
    #dialogue .cap .fieldbox.has-mic .field { padding-right: 2.1em; padding-left: 2.1em; }
    #dialogue .cap .mic {
      pointer-events: auto; position: absolute; right: -0.2em; bottom: 0.05em; width: 1.7em; height: 1.7em;
      padding: 0; margin: 0; border: 0; background: transparent; cursor: pointer; appearance: none; outline: 0;
      display: block; color: ${INK};
    }
    #dialogue .cap .mic > svg { display: block; width: 100%; height: 100%; overflow: visible; }
    #dialogue .cap .mic .cap-fill { fill: none; }
    #dialogue .cap .mic.on .cap-fill { fill: ${INK}; }
    #dialogue .cap .mic .ear { visibility: hidden; }
    #dialogue .cap .mic.on.listening .ear { visibility: visible; }
  `;
  return style;
}

// Hand-set type: every glyph sits a hair off its baseline and a degree off upright, the way the
// signage in the drawing does (see strokes.letter). Deterministic per text.
function letters(word, rng) {
  return [...word].map((ch) => `<span class="g" style="transform:translateY(${((rng() - 0.5) * 1.1).toFixed(2)}px) rotate(${((rng() - 0.5) * 2.4).toFixed(2)}deg)">${esc(ch)}</span>`).join('');
}
// A whole string, its words kept unbreakable.
function glyphs(text, rng) {
  return text.split(' ').map((w) => `<span class="w">${letters(w, rng)}</span>`).join(' ');
}

// The line as word spans, all present from the start (hidden) so the rag never moves.
function layoutWords(el, text, rng) {
  el.innerHTML = '';
  const words = [];
  let count = 0;
  text.split(' ').forEach((w, i) => {
    if (i) el.appendChild(document.createTextNode(' '));
    const s = document.createElement('span');
    s.className = 'w hid';
    s.innerHTML = letters(w, rng);
    el.appendChild(s);
    count += w.length + 1;
    words.push({ el: s, at: count }); // characters typed by the time this word is complete
  });
  return words;
}

const ORDINAL = ['The first card', 'The second card', 'The third card'];

export async function build(ctx) {
  const root = ctx.dom.dialogue;
  document.head.appendChild(buildStyle());

  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.hidden = true;
  root.appendChild(cap);
  const placard = document.createElementNS(SVG, 'svg');
  placard.setAttribute('class', 'placard');
  placard.setAttribute('aria-hidden', 'true');

  let typing = null; // { words, start, hold, done, keep, chars }
  let inter = null; // { until, done }
  let field = null;
  let seed = 23; // the pen's seed for the placard up now (deterministic per text)
  let beat = 'idle';
  let named = false; // the speaker has been named in this beat
  let spoke = -Infinity; // clock time the last caption was cut; a long silence re-names the speaker

  // ---- the voice: the visitor's (SpeechRecognition into the field) and Pepe's (speechSynthesis) ----
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const canListen = !!Recognition;
  const canSpeak = !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function';
  let voiceOn = false;
  let recog = null; // the recognition session while a field is up and the voice is on
  let utterance = null;
  function hush() {
    if (!canSpeak) return;
    utterance = null;
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  // Speak a line; resolves when it has been said (or could not be), never later than its length allows.
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
    field?.mic?.classList.remove('listening');
  }
  // Listen into the field: interim words as they come, the final result submitted.
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
      if (final && text.trim()) submit();
    };
    r.onend = () => {
      if (recog !== r) return;
      recog = null;
      field?.mic?.classList.remove('listening');
      // the browser stops after a silence: keep the ear open while the field is up
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
      field.mic?.classList.add('listening');
    } catch {
      recog = null;
    }
  }
  function setVoice(on) {
    voiceOn = !!on && (canListen || canSpeak);
    field?.mic?.classList.toggle('on', voiceOn);
    ctx.emit?.('dialogue:voice', { on: voiceOn });
    if (!voiceOn) {
      stopListening();
      hush();
      if (typing) typing.speaking = false;
    } else if (field?.submit) listen(field.submit);
  }

  const shotName = () => ctx.pieces.camera?.current ?? 'home';
  const penWidth = () => Math.max(1.7, Math.min(3.2, ctx.size.w / 720));
  // How tall the letterbox bar is right now (fraction of the frame), from either piece that draws one.
  function barFrac() {
    const ratio = ctx.pieces.ink?.params?.letterbox;
    if (ratio) return Math.max(0, (1 - ctx.size.w / ctx.size.h / ratio) / 2);
    const bar = ctx.dom.letterbox?.querySelector?.('.bar.bottom');
    return bar && bar.offsetHeight > 0 ? BAR : 0;
  }
  // Put the placard on its anchor for the current shot, or at the foot of the frame.
  function place() {
    const a = ANCHORS[shotName()];
    cap.classList.toggle('at', !!a);
    if (a) {
      cap.style.left = `${a.x * 100}%`;
      cap.style.top = `${a.y * 100}%`;
      cap.style.maxWidth = `${a.w * 100}%`;
      cap.style.bottom = '';
    } else {
      cap.style.left = cap.style.top = cap.style.maxWidth = '';
      cap.style.bottom = `${(barFrac() + 0.044) * 100}%`;
    }
  }
  // Draw the rule around whatever the placard now holds (one layout read).
  function ink() {
    if (cap.hidden) return;
    const w = cap.offsetWidth, h = cap.offsetHeight;
    if (!placard.isConnected) cap.prepend(placard);
    drawPlacard(placard, w, h, seed, penWidth());
    if (field) drawRule(field.svg, field.box.offsetWidth, seed + 7, penWidth() * 0.95);
  }
  function cut() {
    cap.hidden = true;
    cap.classList.remove('inter');
    cap.innerHTML = '';
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
    seed = 23 + text.length * 7 + (who ? 3 : 0);
    const rng = mulberry32(seed + 1);
    cap.innerHTML = `${who ? `<div class="who">${glyphs(who, rng)}</div>` : ''}<div class="line"></div>`;
    cap.hidden = false;
    const words = layoutWords(cap.querySelector('.line'), text, rng);
    ink();
    return words;
  }
  function reveal(words, chars) {
    for (const w of words) if (w.at - 1 <= chars + 1e-6) w.el.classList.remove('hid');
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
  function makeField(value = '') {
    const box = document.createElement('div');
    box.className = 'fieldbox';
    const input = document.createElement('input');
    input.className = 'field';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.maxLength = 240;
    input.setAttribute('aria-label', 'Your answer');
    if (value) input.value = value;
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    box.appendChild(input);
    box.appendChild(svg);
    let mic = null;
    if (canListen || canSpeak) {
      box.classList.add('has-mic');
      mic = document.createElement('button');
      mic.type = 'button';
      mic.className = 'mic' + (voiceOn ? ' on' : '');
      mic.setAttribute('aria-label', 'Speak instead of typing');
      mic.title = 'Speak instead of typing';
      const g = document.createElementNS(SVG, 'svg');
      g.setAttribute('aria-hidden', 'true');
      drawMic(g, seed + 11, penWidth());
      mic.appendChild(g);
      mic.addEventListener('pointerdown', (e) => e.stopPropagation());
      mic.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setVoice(!voiceOn);
        input.focus();
      });
      box.appendChild(mic);
    }
    cap.appendChild(box);
    field = { input, svg, box, mic };
    ink();
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

    // The card's title placard: numeral (or ordinal), name, position. Held, then cut.
    intertitle(slug, position, { hold = INTER_HOLD } = {}) {
      finish();
      const [n, name, label] = interLines(slug, position);
      cut();
      place();
      seed = 101 + name.length * 5;
      const rng = mulberry32(seed + 1);
      cap.classList.add('inter');
      cap.innerHTML = `<div class="n">${glyphs(n, rng)}</div><div class="name">${glyphs(name, rng)}</div><div class="pos">${glyphs(label, rng)}</div>`;
      cap.hidden = false;
      ink();
      ctx.emit?.('dialogue:intertitle', { slug, position });
      return new Promise((res) => {
        inter = { until: ctx.clock.t + hold, done: res };
      });
    },

    // Says the prompt and keeps it up with the field under it. Resolves with the visitor's
    // text (trimmed) on Return, '' on Escape, null when `signal` aborts or `timeout` seconds
    // pass with no answer. With respond:true it also says the reply before resolving. With the
    // voice on the field also listens; a final recognition result submits.
    async ask(prompt = SCRIPT.question[0], { respond = false, who = null, hold = 0.2, signal = null, timeout = 0, value = '', instant = false } = {}) {
      if (signal?.aborted) return null;
      const said = api.say(prompt, { hold, who, keep: true });
      if (instant) finish();
      // an abort while the prompt is still typing: finish it so the await returns
      const onAbortSay = () => finish();
      signal?.addEventListener('abort', onAbortSay, { once: true });
      await said;
      signal?.removeEventListener('abort', onAbortSay);
      if (signal?.aborted || cap.hidden) {
        // aborted, or cut from outside while the prompt was typing: no field, no answer
        cut();
        return null;
      }
      const input = makeField(value);
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
    // whole (or a card's title placard) is cut.
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

    // A card, read: the intertitle, then its lines, the speaker named on the first.
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
    //   ?line=<n>  which line of the beat   ?card=<slug>&pos=<0..2>  the reading   ?inter=1  its intertitle
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
        still(SCRIPT.question[i] ?? SCRIPT.question[0], '');
        makeField();
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
    ink();
  });
  return api;
}
