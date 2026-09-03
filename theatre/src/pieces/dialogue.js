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
//   ask(prompt, {respond}) → Promise<string>   says the prompt, shows the field, resolves on Return
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
    field = null;
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
  function makeField() {
    const box = document.createElement('div');
    box.className = 'fieldbox';
    const input = document.createElement('input');
    input.className = 'field';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.maxLength = 240;
    input.setAttribute('aria-label', 'Your answer');
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    box.appendChild(input);
    box.appendChild(svg);
    cap.appendChild(box);
    field = { input, svg, box };
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
        typing = { words, start: ctx.clock.t, hold, done: res, keep, chars: -1 };
        if (ctx.clock.frozen) reveal(words, Infinity);
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
    // text (trimmed) on Return. With respond:true it also says the reply before resolving.
    async ask(prompt = SCRIPT.question[0], { respond = false, who = null, hold = 0.2 } = {}) {
      await api.say(prompt, { hold, who, keep: true });
      const input = makeField();
      if (!ctx.shotMode) input.focus();
      const answer = await new Promise((res) => {
        input.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const v = input.value.trim().replace(/\s+/g, ' ');
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
      if (t >= typed + typing.hold) finish();
    },
  };
  ctx.on('resize', () => {
    if (cap.hidden) return;
    place();
    ink();
  });
  return api;
}
