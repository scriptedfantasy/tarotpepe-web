// PIECE: dialogue — what Tarot Pepe says and how it appears.
//
// The writing lives in ./script.js (all data). This file is the presentation: a printed caption
// in the paper margin under the frame — a hand-ruled band of the same paper, the speaker's name
// in small tracked capitals, the line in Futura. Lines are typed on the 12fps clock (~28
// characters a second), held, then cut; nothing glides. The visitor's one text field is drawn
// the same way: an ink underline on the paper, nothing else.
//
// API (ctx.pieces.dialogue):
//   say(text, {hold, who, ref}) → Promise      types a line, resolves after it has been read
//   ask(prompt, {respond}) → Promise<string>   says the prompt, shows the field, resolves on Return
//   reply(answer) → string                     the line that folds the answer back, verbatim
//   read(slug, position) → Promise             says the card's two lines for that position
//   lineFor(slug, position) → string           both lines as one string (see script.js)
//   linesFor(slug, position) → [string, string]
//   clear()                                    removes the caption
//   script                                     the whole script (data)
//   setState(name)                             greeting | question | reading | farewell (+ any script key)
import { SCRIPT, lineFor, linesFor, reply as scriptReply, POSITIONS, positionKey } from './script.js';
import { bySlug } from '../core/deck.js';
import { inkLine, paper, makeCanvas, INK, PAPER } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const meta = {
  name: 'dialogue',
  judge: { shot: 'pepe', states: ['greeting', 'question', 'reading', 'farewell'], dom: true },
  files: ['src/pieces/dialogue.js', 'src/pieces/script.js'],
};

const CPS = 28; // characters per second, stepped on the 12fps clock

// --- pen work for the caption: a ruled band of paper, drawn once as data URLs -------------------
function ruleImage(w, h, lines, seed) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rng = mulberry32(seed);
  // a ruled pen line: a slow drift (few long segments) with a faint fast tremor over it
  for (const l of lines) {
    inkLine(g, -6, l.y, w + 6, l.y, { width: l.width, wobble: l.wobble, rng, alpha: l.alpha ?? 1, color: INK, segments: l.segments ?? Math.round(w / 90) });
    inkLine(g, -6, l.y, w + 6, l.y, { width: l.width * 0.55, wobble: l.wobble * 0.35, rng, alpha: (l.alpha ?? 1) * 0.5, color: INK, segments: Math.round(w / 14) });
  }
  return c.toDataURL('image/png');
}
function grainImage(seed) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  paper(g, 256, 256, PAPER, { grain: 0.05, seed });
  return c.toDataURL('image/png');
}
function tickImage(seed) {
  // a short pen stroke, used as the dashes either side of the speaker's name
  const c = makeCanvas(40, 8);
  const g = c.getContext('2d');
  inkLine(g, 2, 4, 38, 4, { width: 1.3, wobble: 0.5, rng: mulberry32(seed), alpha: 0.85 });
  return c.toDataURL('image/png');
}

function buildStyle() {
  const rule = ruleImage(2048, 18, [
    { y: 5, width: 2.4, wobble: 1.6 },
    { y: 11.5, width: 1.0, wobble: 1.1, alpha: 0.8 },
  ], 11);
  const under = ruleImage(1024, 12, [{ y: 6, width: 1.7, wobble: 1.2, segments: 9 }], 23);
  const grain = grainImage(5);
  const tick = tickImage(7);
  const style = document.createElement('style');
  style.textContent = `
    #dialogue { font-family: var(--futura); color: ${INK}; }
    #dialogue .caption {
      position: absolute; left: 0; right: 0; bottom: 0;
      min-height: clamp(128px, 16.5vh, 186px);
      box-sizing: border-box; padding: 26px 6% 20px;
      background-color: ${PAPER}; background-image: url(${grain});
      text-align: center; display: flex; flex-direction: column; align-items: center;
      -webkit-font-smoothing: antialiased;
    }
    #dialogue .caption .rule { position: absolute; left: 0; right: 0; top: -2px; height: 18px; background: url(${rule}) left top / 100% 18px no-repeat; pointer-events: none; }
    #dialogue .who {
      display: flex; align-items: center; gap: 14px;
      font-size: 11.5px; font-weight: 500; line-height: 1; letter-spacing: 0.38em; text-transform: uppercase;
      color: ${INK}; opacity: 0.82; margin-bottom: 11px; white-space: nowrap; padding-left: 0.38em;
    }
    #dialogue .who .dash { display: inline-block; width: 26px; height: 8px; background: url(${tick}) center / 100% 100% no-repeat; }
    #dialogue .who .ref { opacity: 0.66; }
    #dialogue .text {
      font-size: 25px; font-weight: 500; line-height: 1.36; letter-spacing: 0.004em;
      max-width: 60ch; color: ${INK}; text-wrap: balance;
    }
    #dialogue .text .w { white-space: nowrap; }
    #dialogue .text .c.hid { visibility: hidden; }
    #dialogue .folio {
      position: absolute; top: 24px; font-size: 10px; font-weight: 500; letter-spacing: 0.34em; text-transform: uppercase;
      opacity: 0.58; white-space: nowrap; line-height: 1;
    }
    #dialogue .folio.l { left: 3.2%; }
    #dialogue .folio.r { right: 3.2%; padding-left: 0; }
    #dialogue .fieldwrap { width: 100%; }
    #dialogue .field {
      pointer-events: auto; display: block; margin: 12px auto 0; width: min(64%, 660px);
      border: 0; outline: 0; border-radius: 0; box-shadow: none;
      background: transparent url(${under}) center bottom / 100% 12px no-repeat;
      font-family: var(--futura); font-size: 24px; font-weight: 500; line-height: 1.3; letter-spacing: 0.01em;
      color: ${INK}; caret-color: ${INK}; text-align: center; padding: 2px 10px 9px;
    }
    #dialogue .field::placeholder { color: ${INK}; opacity: 0.28; }
    #dialogue .hint { margin-top: 9px; font-size: 10px; font-weight: 500; letter-spacing: 0.36em; text-transform: uppercase; opacity: 0.5; padding-left: 0.36em; }
  `;
  return style;
}

// Split a line into word/char spans so it can be revealed one character at a time without the
// layout moving under it (every character is present from the start, hidden).
function layoutText(el, text) {
  el.innerHTML = '';
  const chars = [];
  const words = text.split(' ');
  words.forEach((w, i) => {
    const ws = document.createElement('span');
    ws.className = 'w';
    for (const ch of [...w]) {
      const s = document.createElement('span');
      s.className = 'c hid';
      s.textContent = ch;
      ws.appendChild(s);
      chars.push(s);
    }
    el.appendChild(ws);
    if (i < words.length - 1) {
      const sp = document.createElement('span');
      sp.className = 'c hid';
      sp.textContent = ' ';
      el.appendChild(sp);
      chars.push(sp);
    }
  });
  return chars;
}

function refFor(slug, position) {
  const card = bySlug[slug];
  if (!card) return '';
  const label = POSITIONS[['brought', 'going', 'do'].indexOf(positionKey(position))] ?? '';
  return `${card.numeral ? card.numeral + ' · ' : ''}${card.name} · ${label}`;
}

export async function build(ctx) {
  const root = ctx.dom.dialogue;
  document.head.appendChild(buildStyle());

  // the caption band, built once; hidden until there is something to say
  const cap = document.createElement('div');
  cap.className = 'caption';
  cap.hidden = true;
  cap.innerHTML = `<div class="rule"></div><div class="folio l"></div><div class="folio r"></div><div class="who"><span class="dash"></span><span class="name"></span><span class="dash"></span></div><div class="text"></div>`;
  root.appendChild(cap);
  const whoEl = cap.querySelector('.who');
  const nameEl = cap.querySelector('.name');
  const textEl = cap.querySelector('.text');
  const folioL = cap.querySelector('.folio.l');
  const folioR = cap.querySelector('.folio.r');
  const FOLIO = { greeting: 'I · The greeting', question: 'II · The question', shuffle: 'III · The shuffle', draw: 'III · The draw', reading: 'IV · The reading', farewell: 'V · The farewell' };

  let typing = null; // { chars, start, revealed, hold, done }
  let field = null;

  function show(text, { who = SCRIPT.speaker, ref = '' } = {}) {
    cap.hidden = false;
    removeField();
    nameEl.innerHTML = ref ? `${who}<span class="ref">&nbsp;&nbsp;·&nbsp;&nbsp;${ref}</span>` : who;
    whoEl.hidden = !who;
    return layoutText(textEl, text);
  }
  function reveal(chars, n) {
    for (let i = 0; i < n && i < chars.length; i++) chars[i].classList.remove('hid');
  }
  function removeField() {
    if (!field) return;
    field.wrap.remove();
    field = null;
  }
  function finish() {
    if (!typing) return;
    const d = typing.done;
    reveal(typing.chars, typing.chars.length);
    typing = null;
    d?.();
  }
  function makeField() {
    const wrap = document.createElement('div');
    wrap.className = 'fieldwrap';
    const input = document.createElement('input');
    input.className = 'field';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.maxLength = 240;
    input.setAttribute('aria-label', 'Your answer');
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'one sentence, then return';
    wrap.append(input, hint);
    cap.appendChild(wrap);
    return { wrap, input, hint };
  }

  const api = {
    script: SCRIPT,
    lineFor,
    linesFor,
    reply: scriptReply,
    positions: POSITIONS,

    // The marginalia printed at the two ends of the band: the place on the left, the beat on the
    // right. Pass a beat name (greeting, question, shuffle, draw, reading, farewell) or free text.
    folio(beat, left = 'The parlour · evening') {
      folioL.textContent = left ?? '';
      folioR.textContent = FOLIO[beat] ?? beat ?? '';
    },

    say(text, { hold = 1.2, who = SCRIPT.speaker, ref = '' } = {}) {
      finish(); // never leave an earlier promise hanging
      const chars = show(text, { who, ref });
      const seconds = chars.length / CPS;
      ctx.pieces.pepeAnim?.say?.(text, seconds + 0.2);
      ctx.emit?.('dialogue:say', { text, who, seconds });
      return new Promise((res) => {
        typing = { chars, start: ctx.clock.t, revealed: 0, hold, done: res };
        if (ctx.clock.frozen) reveal(chars, chars.length);
      });
    },

    // Says the prompt, then shows the field. Resolves with the visitor's text (trimmed) on Return.
    // With respond:true it also says the reply line before resolving.
    async ask(prompt = SCRIPT.question[0], { respond = false, who = SCRIPT.speaker } = {}) {
      await api.say(prompt, { hold: 0.15, who });
      field = makeField();
      if (!ctx.shotMode) field.input.focus();
      const answer = await new Promise((res) => {
        field.input.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const v = field.input.value.trim().replace(/\s+/g, ' ');
          removeField();
          res(v);
        });
      });
      ctx.emit?.('dialogue:answer', { answer });
      if (respond) await api.say(scriptReply(answer), { hold: 1.4 });
      return answer;
    },

    // The card's two lines for a position, one caption each.
    async read(slug, position, { hold = 1.3 } = {}) {
      const ref = refFor(slug, position);
      for (const line of linesFor(slug, position)) await api.say(line, { hold, ref });
    },

    clear() {
      finish();
      removeField();
      cap.hidden = true;
      textEl.innerHTML = '';
    },

    // Judging states. Deterministic: the line is shown in full, no typing.
    setState(name) {
      finish();
      const p = ctx.params;
      const i = +(p.get('line') ?? 0);
      api.folio(name in FOLIO ? name : 'greeting');
      if (name === 'reading') {
        const slug = p.get('card') ?? 'the-moon';
        const pos = p.get('pos') ?? 1;
        const lines = linesFor(slug, pos);
        reveal(show(lines[i] ?? lines[0], { ref: refFor(slug, pos) }), Infinity);
      } else if (name === 'question') {
        reveal(show(SCRIPT.question[i] ?? SCRIPT.question[0]), Infinity);
        field = makeField();
      } else if (name === 'answer') {
        reveal(show(scriptReply(p.get('answer') ?? 'my brother has not called since March')), Infinity);
      } else {
        const arr = Array.isArray(SCRIPT[name]) ? SCRIPT[name] : SCRIPT.greeting;
        reveal(show(arr[i] ?? arr[0]), Infinity);
      }
    },

    update(ctx) {
      if (!typing || !ctx.clock.stepped) return;
      const t = ctx.clock.t;
      const n = Math.min(typing.chars.length, Math.floor((t - typing.start) * CPS + 1e-6));
      if (n > typing.revealed) {
        reveal(typing.chars, n);
        typing.revealed = n;
      }
      if (n >= typing.chars.length && t >= typing.start + typing.chars.length / CPS + typing.hold) finish();
    },
  };
  return api;
}
