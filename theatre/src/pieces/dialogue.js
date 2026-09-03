// PIECE: dialogue — what Tarot Pepe says and how it appears.
//
// The writing lives in ./script.js (all data). This file is the presentation, which follows the
// cast labels of the Aline sequence: a few short centred lines of typewriter serif, solid ink,
// sitting on the bare paper of the drawing next to the speaker. No box, no band, no rule, no
// grey. A caption cuts in, reveals itself a word at a time on the 12fps clock, holds, and cuts
// out in one frame. The speaker is named once per beat, in small tracked capitals above the
// first line, the way a credit names a person once. A card is announced by its own intertitle
// (numeral / name / position), held, then cut. The visitor's one text field is a single wobbly
// ink rule on the paper, nothing else.
//
// Placement: an anchor per camera shot (fraction of the frame) names the largest patch of bare
// paper beside the speaker's head. Shots without an anchor fall back to a plain Futura subtitle
// at the bottom centre of the frame (inside the letterbox bar if one is up).
//
// API (ctx.pieces.dialogue):
//   say(text, {hold, who, keep}) → Promise     reveals a caption, resolves after it has been read
//   ask(prompt, {respond}) → Promise<string>   says the prompt, shows the field, resolves on Return
//   reply(answer) → string                     the line that folds the answer back, verbatim
//   intertitle(slug, position, {hold})         the card's held title card
//   read(slug, position) → Promise             intertitle, then the card's lines (speaker named once)
//   lineFor(slug, position) → string           the card's lines for that position as one string
//   linesFor(slug, position) → [string, ...]
//   clear()                                    cuts whatever is up
//   script                                     the whole script (data)
//   anchors                                    {shot: {x, y, w}} — editable
//   setState(name)                             greeting | question | reading | farewell (+ any script key)
import { SCRIPT, lineFor, linesFor, reply as scriptReply, POSITIONS, positionKey } from './script.js';
import { bySlug } from '../core/deck.js';
import { inkLine, makeCanvas, INK } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const meta = {
  name: 'dialogue',
  judge: { shot: 'pepe', states: ['greeting', 'question', 'reading', 'farewell'], dom: true },
  files: ['src/pieces/dialogue.js', 'src/pieces/script.js'],
};

const CPS = 28; // characters per second; words appear whole, on the 12fps clock
const INTER_HOLD = 1.5; // seconds a card's intertitle is held
const TYPEWRITER = "'American Typewriter', 'Courier Prime', 'Prestige Elite Std', 'Courier New', Courier, serif";

// Where the caption sits, per camera shot: centre (x, y) and width, as fractions of the frame.
// Chosen by eye on the judging frames: the bare wall beside Pepe's head, off the props.
const ANCHORS = {
  pepe: { x: 0.185, y: 0.4, w: 0.3 },
  home: { x: 0.215, y: 0.36, w: 0.26 },
};

// The one pen stroke in this file: the rule the visitor writes on.
function ruleImage(w, seed) {
  const c = makeCanvas(w, 12);
  const g = c.getContext('2d');
  inkLine(g, 3, 6.5, w - 3, 6.5, { width: 1.9, wobble: 1.3, rng: mulberry32(seed), segments: 11 });
  return c.toDataURL('image/png');
}

function buildStyle() {
  const rule = ruleImage(640, 23);
  const style = document.createElement('style');
  style.textContent = `
    #dialogue { color: ${INK}; -webkit-font-smoothing: antialiased; }
    #dialogue .cap {
      position: absolute; left: 0; top: 0; transform: translate(-50%, -50%);
      width: 30%; box-sizing: border-box; text-align: center;
      font-family: ${TYPEWRITER}; font-weight: 400;
      font-size: clamp(14px, 1.32vw, 25px); line-height: 1.35; letter-spacing: 0.06em;
      color: ${INK};
    }
    #dialogue .cap .who {
      text-transform: uppercase; font-weight: 600; letter-spacing: 0.16em; text-indent: 0.16em;
      margin-bottom: 0.45em; white-space: nowrap;
    }
    #dialogue .cap .line { text-wrap: balance; }
    #dialogue .cap .line .w { white-space: nowrap; }
    #dialogue .cap .line .w.hid { visibility: hidden; }
    #dialogue .cap.inter .n { letter-spacing: 0.2em; text-indent: 0.2em; }
    #dialogue .cap.inter .name { text-transform: uppercase; font-weight: 600; letter-spacing: 0.16em; text-indent: 0.16em; margin: 0.25em 0; }
    #dialogue .cap.foot {
      left: 50%; top: auto; bottom: 2.6%; transform: translate(-50%, 0); width: 64%;
      font-family: var(--futura); font-weight: 500; letter-spacing: 0.02em; font-size: clamp(15px, 1.5vw, 27px); line-height: 1.3;
    }
    #dialogue .cap.foot.onbar { color: #f6f2ea; }
    #dialogue .cap.foot .who { letter-spacing: 0.3em; text-indent: 0.3em; font-weight: 500; }
    #dialogue .cap .field {
      pointer-events: auto; display: block; margin: 0.55em auto 0; width: 100%;
      border: 0; outline: 0; border-radius: 0; box-shadow: none; appearance: none;
      background: transparent url(${rule}) center bottom / 100% 12px no-repeat;
      font: inherit; letter-spacing: inherit; color: ${INK}; caret-color: ${INK};
      text-align: center; padding: 0 0.4em 0.35em;
    }
    #dialogue .cap.foot .field { width: 56%; }
  `;
  return style;
}

// The line as word spans, all present from the start (hidden) so the rag never moves.
function layoutWords(el, text) {
  el.innerHTML = '';
  const words = [];
  let count = 0;
  text.split(' ').forEach((w, i) => {
    if (i) el.appendChild(document.createTextNode(' '));
    const s = document.createElement('span');
    s.className = 'w hid';
    s.textContent = w;
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

  let typing = null; // { words, start, hold, done, keep }
  let inter = null; // { until, done }
  let field = null;
  let spoke = -Infinity; // clock time the last caption was cut; a long silence re-names the speaker

  const shotName = () => ctx.pieces.camera?.current ?? 'home';
  function barUp() {
    const bar = ctx.dom.letterbox?.querySelector?.('.bar.bottom');
    return !!(bar && bar.offsetHeight > 0);
  }
  // Put the block on its anchor for the current shot, or at the foot of the frame.
  function place() {
    const a = ANCHORS[shotName()];
    cap.classList.toggle('foot', !a);
    cap.classList.toggle('onbar', !a && barUp());
    if (a) {
      cap.style.left = `${a.x * 100}%`;
      cap.style.top = `${a.y * 100}%`;
      cap.style.width = `${a.w * 100}%`;
    } else {
      cap.style.left = cap.style.top = cap.style.width = '';
    }
  }
  function cut() {
    cap.hidden = true;
    cap.classList.remove('inter');
    cap.innerHTML = '';
    removeField();
  }
  function show(text, who) {
    cut();
    place();
    cap.innerHTML = `${who ? `<div class="who">${who}</div>` : ''}<div class="line"></div>`;
    cap.hidden = false;
    return layoutWords(cap.querySelector('.line'), text);
  }
  function reveal(words, chars) {
    for (const w of words) if (w.at - 1 <= chars + 1e-6) w.el.classList.remove('hid');
  }
  function removeField() {
    if (!field) return;
    field.remove();
    field = null;
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
  function makeField() {
    const input = document.createElement('input');
    input.className = 'field';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.maxLength = 240;
    input.setAttribute('aria-label', 'Your answer');
    cap.appendChild(input);
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

    // Reveal one caption. `who` names the speaker above it (once per beat; it is also added
    // automatically after a long silence). `keep` leaves the caption up after it resolves.
    say(text, { hold = 1.2, who = null, keep = false } = {}) {
      finish();
      const name = who === true || (who == null && ctx.clock.t - spoke > 6) ? SCRIPT.speaker : who || '';
      const words = show(text, name);
      const seconds = text.length / CPS;
      ctx.pieces.pepeAnim?.say?.(text, seconds + 0.2);
      ctx.emit?.('dialogue:say', { text, who: name, seconds });
      return new Promise((res) => {
        typing = { words, start: ctx.clock.t, hold, done: res, keep, chars: -1 };
        if (ctx.clock.frozen) reveal(words, Infinity);
      });
    },

    // The card's title card: numeral (or ordinal), name, position. Held, then cut.
    intertitle(slug, position, { hold = INTER_HOLD } = {}) {
      finish();
      const [n, name, label] = interLines(slug, position);
      cut();
      place();
      cap.classList.add('inter');
      cap.innerHTML = `<div class="n">${n}</div><div class="name">${name}</div><div class="pos">${label}</div>`;
      cap.hidden = false;
      ctx.emit?.('dialogue:intertitle', { slug, position });
      return new Promise((res) => {
        inter = { until: ctx.clock.t + hold, done: res };
      });
    },

    // Says the prompt and keeps it up with the field under it. Resolves with the visitor's
    // text (trimmed) on Return. With respond:true it also says the reply before resolving.
    async ask(prompt = SCRIPT.question[0], { respond = false, who = null, hold = 0.2 } = {}) {
      await api.say(prompt, { hold, who, keep: true });
      field = makeField();
      if (!ctx.shotMode) field.focus();
      const answer = await new Promise((res) => {
        field.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const v = field.value.trim().replace(/\s+/g, ' ');
          cut();
          res(v);
        });
      });
      ctx.emit?.('dialogue:answer', { answer });
      if (respond) await api.say(scriptReply(answer), { hold: 1.4, who: '' });
      return answer;
    },

    // A card, read: the intertitle, then its lines, the speaker named on the first.
    async read(slug, position, { hold = 1.3 } = {}) {
      await api.intertitle(slug, position);
      const lines = linesFor(slug, position);
      for (let i = 0; i < lines.length; i++) await api.say(lines[i], { hold, who: i === 0 ? true : '' });
    },

    clear() {
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
        field = makeField();
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
      if (t >= typed + typing.hold) finish();
    },
  };
  return api;
}
