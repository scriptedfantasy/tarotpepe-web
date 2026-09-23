// dialogue-phone — THE CONVERSATION ON A PHONE (the owner's decision, 2026-09-23; see BRIEF.md).
//
// On a phone the placard is not used. His lines and the visitor's are a run of DRAWN BUBBLES laid
// straight over the room — no wash, no veil. WHERE THEY STAND depends on what the visitor is doing
// (the owner, 2026-09-23: "chat in the card selection flow from the middle and chat when in the
// room from the bottom"):
//   IN THE ROOM they start at the BOTTOM, like any messenger: newest standing on the reply row,
//   older ones climbing and fading out toward the top, scrollable.
//   IN THE CARD FLOW (shuffle, the pick, the lay-out, the reading and its lessons) they keep to the
//   wall at the top — newest at the foot of that band, just over him — so the cards the visitor is
//   choosing from and reading stay clear. At the bottom of the frame is one row: the chat button (bottom-left, hides and shows
// the conversation, never opens it by itself), the reply field with its send button inside it, and
// — only while the conversation is hidden — the gyroscope that turns the camera's tilt on.
//
// It is the SAME PIECE as far as anybody else can tell: dialogue.js hands build() over to this file
// when phoneMode() is true, and the api below keeps every promise dialogue.js makes — say() resolves
// when the line has been typed and held, ask() resolves with the visitor's words (trimmed) on send,
// '' on Escape, null on abort or timeout, `asking` says whether the field is theirs, band() says where
// the words stand — so flow and mind need no changes.
//
// THE HAND. Every word is lettered in the room's sign hand (titles-sign.js), one canvas per bubble,
// his in green and the visitor's in ink. A bubble is cut to its final size the moment it goes up and
// its words are inked into it as he says them, on the 12 fps clock, whole words at a time, exactly as
// the placard types. Only the newest two bubbles boil; everything older is a still strike, so a long
// evening costs one or two re-cuts a step and a blit for the rest.
import { signCaps, signFold, signWidth } from './titles-sign.js';
import { SVGNS, drawDots } from './dialogue-ink.js';
import { mulberry32 } from '../core/rng.js';
import { INK, PAPER } from '../core/strokes.js';

const PEPE_GREEN = '#3a7736';
const CPS = 28; // characters per second, the placard's pace
const CAP = 14; // the hand's floor (titles-sign.js): a phone letters at 14 px caps, never smaller
const TRACK = 0.14;
const LEAD = 1.3; // line box, in ems of the hand
const PAD_X = 14, PAD_Y = 9; // inside a bubble, px
const SIDE = 12; // screen gutter, px
const BTN = 50; // the two round corner buttons
const ROW_GAP = 10; // between the row's parts
const BOIL_KEEP = 2; // how many of the newest bubbles keep boiling
const THINK_WAIT = 0.25; // seconds a turn must be owed before the dots go up
const KB_MIN = 80; // px of covered frame under which it is a URL bar, not a keyboard
const SPREAD_SHOTS = ['fan', 'spread'];
const BARE_SHOTS = ['door', 'threshold']; // the evening's two frames of the door: no conversation on them
const FADE = 110; // px at the top of the stack over which the old lines fade into the wall

// ---- THE STYLESHEET ------------------------------------------------------------------------------
// Positions and sizes only. Every visible mark — the bubbles' edges, the letters, the icons — is
// drawn; nothing here sets a font on anything the visitor reads except the reply field itself,
// which is a real <input> so the phone's own keyboard, autocorrect and dictation all work (16 px,
// or iOS zooms the page on focus).
function buildStyle() {
  const s = document.createElement('style');
  s.id = 'dialogue-phone-style';
  s.textContent = `
  .pc { position: absolute; inset: 0; pointer-events: none; --kb: 0px; --vt: 0px; --log-h: 300px;
    --safe-b: max(14px, env(safe-area-inset-bottom)); }
  .pc-log { position: absolute; left: 0; right: 0; top: calc(var(--vt) + env(safe-area-inset-top)); height: var(--log-h);
    overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; pointer-events: none;
    display: flex; flex-direction: column; gap: 10px; padding: 18px ${SIDE}px 8px; box-sizing: border-box;
    scrollbar-width: none; -webkit-overflow-scrolling: touch;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 ${FADE}px); mask-image: linear-gradient(to bottom, transparent 0, #000 ${FADE}px); }
  .pc-log::-webkit-scrollbar { display: none; }
  .pc-log > :first-child { margin-top: auto; }
  .pc.foot .pc-log { top: auto; bottom: calc(var(--kb) + var(--safe-b) + ${BTN + ROW_GAP}px); }
  .pc.shut .pc-log, .pc.shut .pc-say { display: none; }
  .pc.away { display: none; }
  .pc-b { position: relative; flex: none; pointer-events: auto; max-width: 100%; }
  .pc-b.ghost { pointer-events: none; }
  .pc-b > svg.edge { position: absolute; left: -6px; top: -6px; overflow: visible; pointer-events: none; }
  .pc-b > canvas { position: relative; display: block; }
  .pc-b.him { align-self: flex-start; }
  .pc-b.me { align-self: flex-end; }
  .pc-b.title { align-self: flex-start; }
  .pc-b .sr, .pc .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .pc-b svg.dots { display: block; position: relative; width: 44px; height: 16px; margin: 3px 4px; }
  .pc-row, .pc-row * { touch-action: none; }
  .pc-row { position: absolute; left: 0; right: 0; bottom: calc(var(--kb) + var(--safe-b)); height: ${BTN}px; pointer-events: none; }
  .pc-btn { position: absolute; bottom: 0; width: ${BTN}px; height: ${BTN}px; padding: 0; margin: 0; border: 0; background: none;
    pointer-events: auto; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .pc-btn svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .pc-btn:focus-visible { outline: 2px solid var(--mustard, #e0a526); outline-offset: 3px; border-radius: 50%; }
  .pc-chat { left: ${SIDE}px; }
  .pc-tilt { right: ${SIDE}px; }
  .pc-tilt[hidden] { display: none; }
  .pc-chat .news { position: absolute; right: -1px; top: -1px; width: 14px; height: 14px; border-radius: 50%; box-sizing: border-box;
    background: ${PEPE_GREEN}; border: 2px solid ${PAPER}; box-shadow: 0 0 0 1.5px ${INK}; }
  .pc-chat .news[hidden] { display: none; }
  .pc-chat.asking .news { background: var(--mustard, #e0a526); }
  /* a question waiting: a stop-motion nudge, on twos, every three seconds */
  .pc-chat.asking { animation: pc-nudge 3s steps(1) infinite; }
  @keyframes pc-nudge { 0% { transform: rotate(0); } 2.8% { transform: rotate(-9deg); } 5.6% { transform: rotate(8deg); }
    8.4% { transform: rotate(-5deg); } 11.2%, 100% { transform: rotate(0); } }
  @media (prefers-reduced-motion: reduce) { .pc-chat.asking { animation: none; } }
  .pc-say { position: absolute; left: ${SIDE + BTN + ROW_GAP}px; right: ${SIDE}px; bottom: 0; height: ${BTN}px; margin: 0; pointer-events: auto; }
  .pc-say > svg.edge { position: absolute; left: -6px; top: -6px; overflow: visible; pointer-events: none; }
  .pc-say input { position: relative; box-sizing: border-box; width: 100%; height: 100%; margin: 0; border: 0; outline: none;
    background: transparent; color: transparent; caret-color: transparent; border-radius: ${BTN / 2}px;
    font: 500 16px/1.2 var(--futura); letter-spacing: 0.05em; padding: 0 ${BTN}px 0 18px; -webkit-appearance: none; appearance: none; }
  .pc-say input::placeholder { color: transparent; }
  .pc-say input::selection { background: transparent; }
  .pc-say canvas.pc-ink { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); pointer-events: none; }
  .pc-send { right: 7px; bottom: 7px; width: 36px; height: 36px; }
  .pc-send.wait { opacity: 0.55; }
  `;
  return s;
}

// ---- THE PEN ---------------------------------------------------------------------------------------
const P1 = (v) => v.toFixed(1);
const pathOf = (pts, close = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${P1(p[0])} ${P1(p[1])}`).join('') + (close ? 'Z' : '');

// A rounded box's outline, walked clockwise from the top-left, `r` per corner [tl, tr, br, bl].
function roundBox(w, h, r) {
  const pts = [];
  const arc = (cx, cy, rad, a0, a1) => {
    const n = Math.max(2, Math.ceil(rad / 2.2));
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
  };
  const line = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 7));
    for (let i = 1; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const [tl, tr, br, bl] = r;
  const H = Math.PI / 2;
  arc(tl, tl, tl, 2 * H, 3 * H);
  line(tl, 0, w - tr, 0);
  arc(w - tr, tr, tr, 3 * H, 4 * H);
  line(w, tr, w, h - br);
  arc(w - br, h - br, br, 0, H);
  line(w - br, h, bl, h);
  arc(bl, h - bl, bl, H, 2 * H);
  line(0, h - bl, 0, tl);
  return pts;
}

// The hand's wander on a closed outline: a slow drift, not a jitter, and the pen runs a little past
// where it started so the ring is closed by an overlap, the way a drawn one is.
function wander(pts, rng, amp = 0.8) {
  const n = pts.length;
  const K = 7;
  const knots = Array.from({ length: K }, () => (rng() - 0.5) * 2 * amp);
  let cx = 0, cy = 0;
  for (const p of pts) (cx += p[0]), (cy += p[1]);
  cx /= n;
  cy /= n;
  const out = pts.map((p, i) => {
    const u = (i / n) * K;
    const k0 = Math.floor(u) % K, k1 = (k0 + 1) % K, f = u - Math.floor(u);
    const off = knots[k0] * (1 - f) + knots[k1] * f + (rng() - 0.5) * 0.25;
    const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / l) * off, p[1] + (dy / l) * off];
  });
  const run = Math.max(2, Math.round(n * 0.04));
  return out.concat(out.slice(1, run + 1));
}

// A bubble's paper and its ink rule, into `svg`, for a box of w × h px. `tail` is the corner the
// bubble is spoken from ('bl' his, 'br' the visitor's, '' a title): that corner is nearly square.
function drawBubble(svg, w, h, seed, tail = '', lw = 2) {
  const B = 6;
  svg.setAttribute('width', w + 2 * B);
  svg.setAttribute('height', h + 2 * B);
  svg.setAttribute('viewBox', `${-B} ${-B} ${w + 2 * B} ${h + 2 * B}`);
  const R = Math.min(16, h / 2);
  const r = [R, R, tail === 'br' ? 4 : R, tail === 'bl' ? 4 : R];
  const rng = mulberry32(seed >>> 0);
  const box = roundBox(w, h, r);
  const ink = wander(box, rng, 0.85);
  svg.innerHTML =
    `<path d="${pathOf(box, true)}" fill="${PAPER}" stroke="none"/>` +
    `<path d="${pathOf(ink)}" fill="none" stroke="${INK}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// A single stroke with the hand in it, for the icons.
function stroke(pts, rng, amp = 0.35) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
    for (let k = i ? 1 : 0; k <= n; k++) {
      const f = k / n;
      out.push([x0 + (x1 - x0) * f + (rng() - 0.5) * amp, y0 + (y1 - y0) * f + (rng() - 0.5) * amp]);
    }
  }
  return pathOf(out);
}
const ring = (cx, cy, rx, ry, rng, amp = 0.5, n = 28) => {
  const pts = [];
  const a0 = rng() * Math.PI * 2;
  for (let i = 0; i <= n + 2; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * (rx + (rng() - 0.5) * amp), cy + Math.sin(a) * (ry + (rng() - 0.5) * amp)]);
  }
  return pathOf(pts);
};

// THE CORNER BUTTONS. A round paper disc in one ring of ink (filled ink when the button is ON), and
// the drawing inside it: the chat button's speech bubble, with a stroke through it while the
// conversation is SHOWING — the button draws what a tap will do, a call to act and not a state
// (the owner, 2026-09-23), and the tilt button's GYROSCOPE (the owner's pick over the spirit level,
// 2026-09-23), whose gimbal rings are turned by `rollLevel()` with the phone.
// viewBox 0 0 44 44, as the mockup's.
function drawChat(svg, seed, struck) {
  const rng = mulberry32(seed);
  const fg = INK;
  const speech = [[22, 10], [30, 10.6], [36, 15], [36.6, 20], [35, 25.5], [29, 29.6], [22, 30.4], [17.5, 30], [11, 34.6], [12.4, 28.2], [8.4, 25], [7.2, 20], [8.6, 14.6], [14, 10.8], [22, 10], [26, 10.1]];
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.innerHTML =
    `<path d="${ring(22, 22, 20.2, 20.2, rng, 0.6, 36)}" fill="${PAPER}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="${stroke(speech, rng)}" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
    [15.6, 22, 28.4].map((x) => `<path d="${stroke([[x - 0.3, 20.3], [x + 0.4, 20.1]], rng, 0.2)}" stroke="${fg}" stroke-width="3.2" stroke-linecap="round"/>`).join('') +
    (struck ? `<path d="${stroke([[8, 37], [36.5, 7]], rng, 0.5)}" fill="none" stroke="${PAPER}" stroke-width="5" stroke-linecap="round"/><path d="${stroke([[8, 37], [36.5, 7]], rng, 0.5)}" fill="none" stroke="${fg}" stroke-width="2.1" stroke-linecap="round"/>` : '');
}
function drawLevel(svg, seed, on) {
  const rng = mulberry32(seed);
  const bg = on ? INK : PAPER, fg = on ? PAPER : INK;
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.innerHTML =
    `<path d="${ring(22, 22, 20.2, 20.2, rng, 0.6, 36)}" fill="${bg}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="${ring(22, 22, 11, 11, rng, 0.35, 28)}" fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>` +
    `<g class="gim"><path d="${ring(22, 22, 11, 4.2, rng, 0.25, 26)}" fill="none" stroke="${fg}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="${ring(22, 22, 4.2, 11, rng, 0.25, 26)}" fill="none" stroke="${fg}" stroke-width="1.2" stroke-linecap="round"/></g>` +
    `<circle cx="22" cy="22" r="2.2" fill="${fg}"/>`;
}
function drawSend(svg, seed) {
  const rng = mulberry32(seed);
  svg.setAttribute('viewBox', '0 0 36 36');
  svg.innerHTML =
    `<path d="${ring(18, 18, 16.6, 16.6, rng, 0.5, 30)}" fill="${INK}" stroke="${INK}" stroke-width="1.6"/>` +
    `<path d="${stroke([[18, 26.5], [18.2, 10]], rng, 0.4)}" fill="none" stroke="${PAPER}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="${stroke([[11.2, 16.4], [18.1, 9.4], [25, 16.2]], rng, 0.4)}" fill="none" stroke="${PAPER}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ---- THE HAND ON A BUBBLE --------------------------------------------------------------------------
const EM = CAP / 0.72;
const LINE = Math.round(LEAD * EM);
const NIB = Math.max(1.3, CAP * 0.125);
const SPACE = (34 * CAP) / 100 + 2 * TRACK * EM; // a word space and the tracking either side of it
const widths = new Map();
const wordW = (w) => {
  let v = widths.get(w);
  if (v === undefined) {
    v = signWidth(w, { capH: CAP, tracking: TRACK });
    if (widths.size > 4000) widths.clear();
    widths.set(w, v);
  }
  return v;
};
// A string folded into the case and wrapped to `measure` px. Returns the lines ({text, start, w}),
// where `start` is the offset of the line's first sort in the folded string, so a line can be inked
// a character at a time and never re-wrapped under the reader.
function wrap(text, measure) {
  const words = [];
  for (const raw of signFold(text).split(' ').filter(Boolean)) {
    if (wordW(raw) <= measure) {
      words.push(raw);
      continue;
    }
    let cur = '';
    for (const ch of raw) {
      if (cur && wordW(cur + ch) > measure) {
        words.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) words.push(cur);
  }
  const lines = [];
  let line = [], w = 0, start = 0;
  for (const word of words) {
    const ww = wordW(word);
    const cand = line.length ? w + SPACE + ww : ww;
    if (!line.length || cand <= measure) {
      line.push(word);
      w = cand;
      continue;
    }
    const t = line.join(' ');
    lines.push({ text: t, start, w });
    start += t.length + 1;
    line = [word];
    w = ww;
  }
  if (line.length) lines.push({ text: line.join(' '), start, w });
  return lines;
}
// Where the words of a wrapped block end, as character offsets: the typing shows whole words only.
function wordEnds(lines) {
  const ends = [];
  for (const L of lines) {
    let i = 0;
    for (const word of L.text.split(' ')) {
      i += word.length;
      ends.push(L.start + i);
      i += 1;
    }
  }
  return ends;
}
// Ink `lines` into `canvas`: `shown` characters of the block, the rest not there yet. Each row is
// set on its own line box; `rows` may carry their own cap (an intertitle's name is set larger).
function paint(canvas, rows, { width, color = INK, shown = Infinity, boil = 0, seed = 3, align = 'left' }) {
  const h = rows.reduce((a, r) => a + (r.lead ?? LINE), 0);
  const w = Math.max(1, Math.ceil(width));
  const key = `${w}|${h}|${shown}|${boil}|${color}`;
  if (canvas.dataset.k === key) return;
  canvas.dataset.k = key;
  const dpr = Math.min(3, Math.max(2, (window.devicePixelRatio || 1) * 1.5));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  let y = 0;
  rows.forEach((L, i) => {
    const lead = L.lead ?? LINE, capH = L.cap ?? CAP;
    const upto = shown === Infinity ? null : Math.max(0, Math.min(L.text.length, shown - L.start));
    if (L.text && upto !== 0) {
      const x = align === 'center' ? w / 2 : align === 'right' ? w : 0;
      signCaps(g, L.text, x, y + (lead - capH) / 2, {
        capH,
        tracking: L.track ?? TRACK,
        pen: Math.max(1.3, capH * 0.125),
        color,
        align,
        baseline: 'top',
        seed: seed + i * 17,
        boil,
        upto,
      });
    }
    y += lead;
  });
}

// ---- THE PIECE ---------------------------------------------------------------------------------------
// `deps` is what dialogue.js already holds and this file must not duplicate: the script and its
// helpers, and the card-title rows (interLines).
export function buildPhone(ctx, deps) {
  const { SCRIPT, lineFor, linesFor, scriptReply, POSITIONS, interLines } = deps;
  const root = ctx.dom.dialogue;
  document.head.appendChild(buildStyle());
  const ANCHORS = {}; // flow writes the placard's anchors here; a phone has no use for them

  const el = (tag, cls, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    parent?.appendChild(e);
    return e;
  };
  const svgEl = (cls, parent) => {
    const s = document.createElementNS(SVGNS, 'svg');
    if (cls) s.setAttribute('class', cls);
    s.setAttribute('aria-hidden', 'true');
    parent?.appendChild(s);
    return s;
  };

  const pc = el('div', 'pc', root);
  const log = el('div', 'pc-log', pc);
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-label', 'The conversation with Tarot Pepe');
  const row = el('div', 'pc-row', pc);

  const chatBtn = el('button', 'pc-btn pc-chat', row);
  chatBtn.type = 'button';
  const chatSvg = svgEl('', chatBtn);
  const news = el('i', 'news', chatBtn);
  news.hidden = true;

  const form = el('form', 'pc-say', row);
  form.setAttribute('autocomplete', 'off');
  const formEdge = svgEl('edge', form);
  const input = el('input', '', form);
  input.type = 'text';
  input.name = 'say';
  input.autocomplete = 'off';
  input.setAttribute('autocapitalize', 'sentences');
  input.setAttribute('enterkeyhint', 'send');
  input.setAttribute('aria-label', 'Say something to Pepe');
  input.maxLength = 400;
  input.placeholder = 'Say something to him';
  // the visitor's words as they type, lettered in the same hand and ink as their bubbles
  const fieldInk = el('canvas', 'pc-ink', form);
  fieldInk.setAttribute('aria-hidden', 'true');
  const send = el('button', 'pc-btn pc-send', form);
  send.type = 'submit';
  send.setAttribute('aria-label', 'Send');
  drawSend(svgEl('', send), 11);

  const tiltBtn = el('button', 'pc-btn pc-tilt', row);
  tiltBtn.type = 'button';
  tiltBtn.setAttribute('aria-label', 'Tilt the phone to look round the room');
  const tiltSvg = svgEl('', tiltBtn);
  tiltBtn.hidden = true;

  // ---- state
  // The conversation is showing. It opens only by the visitor's hand, and a visitor comes into the
  // room with it PUT AWAY — the room first, the two corner buttons and nothing else (the owner,
  // 2026-09-23); his greeting arrives as the green dot on the chat button. A judged still (?shot=1)
  // opens with it showing, because the stills are pictures of the conversation.
  let open = ctx.params?.get?.('shot') === '1';
  let bubbles = []; // every bubble, oldest first: { el, canvas, edge, rows, width, color, who, seed, ... }
  let typing = null; // { b, ends, start, hold, done, chars }
  let inter = null; // { until, done }
  let field = null; // { submit, dispose } while the visitor's turn is open
  let queued = ''; // what they sent while he was still talking: it goes the moment their turn opens
  let think = null; // the bubble of dots while he is writing
  let thinkForced = false;
  let owedAt = 0; // wall-clock seconds since he has owed them a line; 0 = he owes nothing
  let beat = 'idle';
  let steps = 0; // stepped frames seen, for the half-second jobs
  let stick = true; // the log follows its newest line unless the visitor has scrolled back
  const nowS = () => performance.now() / 1000;
  const shotName = () => ctx.pieces.camera?.current ?? 'home';
  const W = () => ctx.size?.w || window.innerWidth || 390;
  const H = () => ctx.size?.h || window.innerHeight || 844;

  // ---- WHERE THE BUBBLES STAND --------------------------------------------------------------------
  // The band of wall above his head: from the top of the frame down to a hand's width over the top
  // of his head, measured off the drawing itself (the head's box, projected), so a camera that has
  // moved or a phone of another shape still stops the stack above him. Clamped so a close shot
  // (his head high in the frame) still leaves room for a line or two, and a far one does not let
  // the stack run down onto the table.
  const HEAD_GAP = 10;
  let headTop = 0; // px, 0 = not measured yet
  const box3 = ctx.THREE ? new ctx.THREE.Box3() : null;
  const v3 = ctx.THREE ? new ctx.THREE.Vector3() : null;
  function measureHead() {
    const head = ctx.pieces.pepe?.head;
    const cam = ctx.camera;
    if (!head || !cam || !box3) return 0;
    try {
      box3.setFromObject(head);
      if (box3.isEmpty()) return 0;
      box3.getCenter(v3);
      v3.y = box3.max.y;
      v3.project(cam);
      if (v3.z > 1 || v3.x < -1.2 || v3.x > 1.2) return 0; // behind the lens or out of the frame
      const y = ((1 - v3.y) / 2) * H();
      return y > 0 && y < H() ? y : 0; // his head out of the frame: nothing to stop above
    } catch {
      return 0;
    }
  }
  // The card-pick and the lay-out: the cards run up the cloth, so the stack is held to the top of
  // the frame and never let down onto them. (It lives at the top already; this is the same rule the
  // placard's dock follows, so the two never disagree about when the cards are out.)
  function picking() {
    const P = ctx.pieces;
    if (P.props?.deck?.out && SPREAD_SHOTS.includes(shotName())) return true;
    if (P.help?.cards?.showing) return false;
    if (P.props?.deck?.mode === 'open') return false;
    if (!SPREAD_SHOTS.includes(shotName())) return false;
    return !!P.reveal && (P.reveal.picks?.length ?? 0) < 3;
  }
  const PICK_FRAC = 0.3; // of the frame, while the cards are out: they start below this
  // THE CARD FLOW: any beat with cards on the cloth or on the ? card's paper. There the stack keeps
  // to the wall at the top; everywhere else it stands on the reply row.
  const CARD_BEATS = ['shuffle', 'fan', 'dealt', 'reading', 'recall', 'lesson'];
  function cardFlow() {
    const P = ctx.pieces;
    if ((P.reveal?.picks?.length ?? 0) > 0) return true; // cards in the row, read or being read
    return picking() || !!P.help?.cards?.showing || !!P.props?.deck?.out || CARD_BEATS.includes(P.flow?.beat);
  }
  // the top of the reply row on the glass (it stands on the keyboard and the safe area); a row not
  // on the glass (at the door) is given the place it would have
  const rowTop = () => {
    const r = row.getBoundingClientRect();
    return r.height > 0 ? r.top : H() - kb - 14 - BTN;
  };
  const VIEWER_FRAC = 0.3; // ... and while a card is up on the ? card's paper, which is cut below it
  function regionBottom() {
    const h = H();
    let b = headTop > 0 ? headTop - HEAD_GAP : h * 0.37;
    b = Math.max(Math.min(170, h * 0.25), Math.min(h * 0.45, b));
    if (picking()) b = Math.min(b, h * PICK_FRAC);
    if (ctx.pieces.help?.cards?.showing) b = Math.min(b, h * VIEWER_FRAC);
    return Math.round(b);
  }

  // ---- THE KEYBOARD -----------------------------------------------------------------------------------
  // A phone's keyboard does not move window.innerHeight; it covers the bottom of the frame and moves
  // the VISUAL viewport. The row stands on the visible floor and the stack keeps above the row, and
  // the page itself is never allowed to scroll to make room (iOS tries, to show a focused field).
  let kb = 0, vt = 0;
  function readKeyboard() {
    const vv = window.visualViewport;
    if (!vv) return false;
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    const covered = Math.round(H() - (vv.height + vv.offsetTop));
    const k = document.activeElement === input && covered >= KB_MIN ? covered : 0;
    const t = k ? Math.max(0, Math.round(vv.offsetTop)) : 0;
    if (k === kb && t === vt) return false;
    kb = k;
    vt = t;
    return true;
  }
  let lastLogH = -1;
  function layout() {
    readKeyboard();
    pc.style.setProperty('--kb', `${kb}px`);
    pc.style.setProperty('--vt', `${vt}px`);
    const foot = !cardFlow();
    if (foot !== pc.classList.contains('foot')) {
      pc.classList.toggle('foot', foot);
      stick = true;
      lastLogH = -1;
    }
    let h;
    if (foot) {
      // in the room: the stack stands on the reply row and may climb to the top of the glass
      h = rowTop() - ROW_GAP - vt;
    } else {
      h = regionBottom() - vt;
      if (kb) h = Math.max(120, Math.min(h, rowTop() - 8 - vt));
    }
    h = Math.max(80, Math.round(h));
    if (h !== lastLogH) {
      lastLogH = h;
      pc.style.setProperty('--log-h', `${h}px`);
      if (stick) toBottom();
    }
  }
  const toBottom = () => {
    log.scrollTop = log.scrollHeight;
  };
  log.addEventListener('scroll', () => {
    stick = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  }, { passive: true });
  // SCROLLING BACK (the owner, 2026-09-23: "we can't scroll backwards in chat"). The log itself lets
  // every touch through to the room — it stands over the whole wall, and the room behind it must
  // still take a drag and a tap — so the browser never scrolls it: a finger laid on a BUBBLE scrolls
  // it by hand instead, and a flick coasts. The press is kept from the window, so holding a bubble to
  // read back is not also a tap that hurries him through his line.
  let hold = null, glide = 0;
  log.addEventListener('pointerdown', (e) => e.stopPropagation());
  log.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    cancelAnimationFrame(glide);
    const y = e.touches[0].clientY;
    hold = { y0: y, st0: log.scrollTop, y, t: performance.now(), v: 0 };
  }, { passive: true });
  log.addEventListener('touchmove', (e) => {
    if (!hold || e.touches.length !== 1) return;
    e.preventDefault();
    const y = e.touches[0].clientY, now = performance.now();
    log.scrollTop = hold.st0 - (y - hold.y0);
    hold.v = (hold.y - y) / Math.max(1, now - hold.t);
    hold.y = y;
    hold.t = now;
  }, { passive: false });
  const letGo = () => {
    if (!hold) return;
    let v = performance.now() - hold.t > 80 ? 0 : hold.v * 16;
    hold = null;
    const step = () => {
      if (Math.abs(v) < 0.4) return;
      log.scrollTop += v;
      v *= 0.94;
      glide = requestAnimationFrame(step);
    };
    glide = requestAnimationFrame(step);
  };
  log.addEventListener('touchend', letGo, { passive: true });
  log.addEventListener('touchcancel', letGo, { passive: true });
  // a mouse wheel over a bubble (a laptop looking at ?phone=1) scrolls it too
  log.addEventListener('wheel', (e) => {
    e.preventDefault();
    log.scrollTop += e.deltaY;
  }, { passive: false });

  // ---- THE TWO CORNER BUTTONS --------------------------------------------------------------------
  // The chat button hides and shows the conversation, and it is the ONLY thing that does: nothing
  // he says opens it. While it is hidden a green dot says he has said something since, and a
  // mustard one — with the button giving a small stop-motion shake every three seconds — says he
  // has asked and is waiting. Opening it clears both.
  const tilt = () => ctx.pieces.camera?.tilt;
  function paintButtons() {
    drawChat(chatSvg, 21, open);
    drawLevel(tiltSvg, 23, !!tilt()?.on);
    lastRoll = null; // a redrawn gyroscope starts square; the next roll puts its rings back
    tiltBtn.setAttribute('aria-pressed', String(!!tilt()?.on));
    chatBtn.setAttribute('aria-pressed', String(open));
    chatBtn.setAttribute('aria-label', open ? 'Hide the conversation' : 'Show the conversation');
  }
  function notify() {
    if (open) return;
    news.hidden = false;
    chatBtn.classList.toggle('asking', !!field);
  }
  let shutAt = 0; // when the conversation was last put away, wall-clock seconds
  const WAIT_NUDGE = 8; // put away while he is already waiting: the nudge starts this much later
  function setOpen(on) {
    open = !!on;
    shutAt = open ? 0 : nowS();
    pc.classList.toggle('shut', !open);
    news.hidden = true;
    chatBtn.classList.remove('asking');
    // the level is on the glass only while the conversation is not, and opening it puts tilt away
    if (open) tilt()?.disable?.();
    tiltBtn.hidden = open || tilt()?.available === false;
    if (!open && document.activeElement === input) input.blur();
    paintButtons();
    layout();
    if (open) {
      stick = true;
      requestAnimationFrame(toBottom);
    }
    ctx.emit?.('dialogue:open', { open });
  }
  chatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!open);
  });
  tiltBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const T = tilt();
    if (!T) return;
    // enable() asks iOS for motion; it must be called here, inside the tap, before anything awaits
    if (T.on) T.disable?.();
    else T.enable?.()?.then?.(() => paintButtons());
    paintButtons();
  });
  let unTilt = null;
  function hookTilt() {
    if (unTilt || !tilt()?.onChange) return;
    unTilt = tilt().onChange(() => paintButtons());
  }
  hookTilt();
  // the gyroscope's gimbal turns with the phone: three degrees of ring for every degree of tilt
  let lastRoll = null;
  function rollLevel() {
    const T = tilt();
    const g = T?.on ? Math.max(-30, Math.min(30, +T.gamma || 0)) : 0;
    const deg = (g * 3).toFixed(0);
    if (deg === lastRoll) return;
    lastRoll = deg;
    tiltSvg.querySelector('.gim')?.setAttribute('transform', `rotate(${deg} 22 22)`);
  }
  // the pointer never reaches the room through the row (flow reads a tap on the room as "skip")
  for (const n of [chatBtn, tiltBtn, form]) n.addEventListener('pointerdown', (e) => e.stopPropagation());

  // ---- THE FIELD -----------------------------------------------------------------------------------
  // A real input, always there while the conversation is open: the visitor may start typing
  // whenever they like. Their words GO when it is their turn — the send button (or Return) while he
  // is still talking hurries him through the line he is on and holds their words until his turn
  // ends, and then they are sent on their own.
  let formW = 0;
  function drawField() {
    const w = Math.round(form.getBoundingClientRect().width);
    if (!w || w === formW) return;
    formW = w;
    drawBubble(formEdge, w, BTN, 31, '', 2);
  }
  // THE WORDS IN THE FIELD are drawn, not set: the <input> underneath holds them (and the phone's
  // keyboard, autocorrect and dictation), but what the visitor sees is the sign hand, the size and
  // ink of their own bubbles, with an ink caret after the last letter while the field has them. A
  // line longer than the field shows its tail, which is where they are writing. The placeholder is
  // lettered the same way, half-inked.
  let inkKey = '';
  function inkField() {
    const w = Math.max(1, Math.round(form.getBoundingClientRect().width) - 18 - BTN);
    const val = input.value;
    const focused = document.activeElement === input;
    const blink = focused && Math.floor((ctx.clock?.raw ?? performance.now() / 1000) * 2) % 2 === 0;
    const boil = boilTick();
    let text = signFold(val ? val : input.placeholder).replace(/\s+/g, ' ');
    const caretW = 8;
    while (text.length > 1 && signWidth(text, { capH: CAP, tracking: TRACK }) > w - caretW) text = text.slice(1);
    const key = `${w}|${text}|${!!val}|${blink}|${boil}`;
    if (key === inkKey) return;
    inkKey = key;
    const h = LINE;
    const dpr = Math.min(3, Math.max(2, (window.devicePixelRatio || 1) * 1.5));
    fieldInk.style.width = `${w}px`;
    fieldInk.style.height = `${h}px`;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (fieldInk.width !== pw || fieldInk.height !== ph) {
      fieldInk.width = pw;
      fieldInk.height = ph;
    }
    const g = fieldInk.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const top = (h - CAP) / 2;
    if (text && !(focused && !val)) {
      signCaps(g, text, 0, top, { capH: CAP, tracking: TRACK, pen: NIB, color: INK, alpha: val ? 1 : 0.5, align: 'left', baseline: 'top', seed: 5, boil });
    }
    if (blink) {
      const x = val ? Math.min(w - 2, signWidth(text, { capH: CAP, tracking: TRACK }) + 3) : 1;
      g.strokeStyle = INK;
      g.lineWidth = NIB * 1.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x, top - 2);
      g.lineTo(x + 0.6, top + CAP + 2);
      g.stroke();
    }
  }
  input.addEventListener('input', inkField);
  input.addEventListener('focus', inkField);
  input.addEventListener('blur', inkField);

  // Keep the keyboard up across a send: a tap on the send button would otherwise take the focus
  // from the field and drop the keyboard between every line.
  send.addEventListener('pointerdown', (e) => {
    if (document.activeElement === input) e.preventDefault();
  });
  function sendNow() {
    const text = input.value.trim().replace(/\s+/g, ' ');
    if (!text) return;
    if (field) {
      input.value = '';
      field.submit(text);
      return;
    }
    // not their turn yet: he is hurried through his line, and their words wait for it to end
    queued = text;
    send.classList.add('wait');
    api.skip('send');
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendNow();
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // flow's Space/Return/Escape are for the room, not for the field
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      input.blur();
      if (field) field.submit('');
    }
  });
  input.addEventListener('input', () => {
    if (queued && input.value.trim() !== queued) {
      queued = '';
      send.classList.remove('wait');
    }
  });
  input.addEventListener('focus', () => {
    stick = true;
    setTimeout(() => {
      layout();
      toBottom();
    }, 60);
  });
  input.addEventListener('blur', () => setTimeout(layout, 60));

  // ---- THE BUBBLES ---------------------------------------------------------------------------------
  // NO PORTRAIT on his bubbles (the owner, 2026-09-23: "we don't need the Pepe circle around each
  // message"): his are the green ones on the left, and that is enough to say whose they are.
  let seedN = 1;
  const measureFor = (who) => {
    const w = W();
    if (who === 'him') return Math.max(140, Math.min(w * 0.8, w - 2 * SIDE - 10) - 2 * PAD_X);
    return Math.max(140, Math.min(w * 0.74, w - 2 * SIDE - 40) - 2 * PAD_X);
  };
  function makeBubble(who, rows, { width, align = 'left', label = '' }) {
    const b = { who, rows, width, align, seed: 7 + (seedN++ * 37) % 997, color: who === 'him' || who === 'title' ? PEPE_GREEN : INK };
    b.el = el('div', `pc-b ${who}`, null);
    b.edge = svgEl('edge', b.el);
    b.canvas = el('canvas', '', b.el);
    b.canvas.setAttribute('aria-hidden', 'true');
    b.el.style.padding = `${PAD_Y}px ${PAD_X}px`;
    if (label) {
      const sr = el('span', 'sr', b.el);
      sr.textContent = label;
    }
    b.h = rows.reduce((a, r) => a + (r.lead ?? LINE), 0);
    b.boxW = Math.ceil(width) + 2 * PAD_X;
    b.boxH = b.h + 2 * PAD_Y;
    drawBubble(b.edge, b.boxW, b.boxH, b.seed, who === 'him' || who === 'title' ? 'bl' : who === 'me' ? 'br' : '');
    b.shown = Infinity;
    return b;
  }
  function addBubble(b) {
    // a line going up takes the dots' place: they were only ever holding it
    if (think) dropThink();
    log.appendChild(b.el);
    bubbles.push(b);
    // an evening is long; a phone keeps the last sixty
    while (bubbles.length > 60) bubbles.shift().el.remove();
    strike(b, true);
    if (stick) toBottom();
    return b;
  }
  // (Re)cut a bubble's words: the typing one and the newest few boil, the rest hold still.
  const boilTick = () => Math.floor((ctx.clock?.frame ?? 0) / 2);
  function strike(b, force = false) {
    if (force) b.canvas.dataset.k = '';
    paint(b.canvas, b.rows, { width: b.width, color: b.color, shown: b.shown, boil: b.still ? 0 : boilTick(), seed: b.seed, align: b.align });
  }
  function lineBubble(who, text) {
    const measure = measureFor(who);
    const lines = wrap(text, measure);
    const width = Math.min(measure, Math.max(24, ...lines.map((l) => l.w))) + CAP * 0.3;
    const b = makeBubble(who, lines, { width, label: (who === 'him' ? 'Pepe: ' : 'You: ') + text });
    return b;
  }

  // THE THINKING MARK: his bubble with three dots struck one at a time, while a turn of his is owed.
  function standThink() {
    if (think) return;
    const b = { who: 'him', el: el('div', 'pc-b him think', null) };
    b.edge = svgEl('edge', b.el);
    b.el.style.padding = `${PAD_Y - 2}px ${PAD_X - 4}px`;
    b.dots = svgEl('dots', b.el);
    const f = el('span', 'face', b.el);
    el('i', '', f);
    drawBubble(b.edge, 44 + 8 + 2 * (PAD_X - 4), 16 + 6 + 2 * (PAD_Y - 2), 5, 'bl');
    drawDots(b.dots, 0, 0, { color: PEPE_GREEN, weight: 2.9 });
    b.at = ctx.clock?.frame ?? 0;
    think = b;
    log.appendChild(b.el);
    if (stick) toBottom();
    ctx.emit?.('dialogue:thinking', { on: true });
  }
  function dropThink() {
    if (!think) return;
    think.el.remove();
    think = null;
  }
  function tickThinking() {
    const owed = thinkForced || (owedAt && !typing && !inter && nowS() - owedAt >= THINK_WAIT);
    if (owed && !think) standThink();
    if (!owed && think && !thinkForced) {
      dropThink();
      ctx.emit?.('dialogue:thinking', { on: false });
    }
    if (think) {
      const f = (ctx.clock?.frame ?? 0) - think.at;
      const n = ctx.clock?.frozen ? 3 : Math.min(3, Math.floor((f % 13) / 3));
      drawDots(think.dots, n, ctx.clock?.frame ?? 0, { color: PEPE_GREEN, weight: 2.9 });
    }
  }

  // Finish whatever he is typing or titling, at once: the words shown whole, the promise kept.
  function finish() {
    if (typing) {
      const t = typing;
      typing = null;
      t.b.shown = Infinity;
      strike(t.b);
      t.done?.();
    }
    if (inter) {
      const i = inter;
      inter = null;
      i.done?.();
    }
  }
  function closeField() {
    if (!field) return;
    const f = field;
    field = null;
    f.dispose?.();
    chatBtn.classList.remove('asking');
  }

  function wipe() {
    finish();
    closeField();
    dropThink();
    for (const b of bubbles) b.el.remove();
    bubbles = [];
    stick = true;
  }

  function interRows(slug, position) {
    const [n, name, label] = interLines(slug, position);
    const measure = measureFor('him') - 8; // his own message's measure: a title is one of his lines
    const small = 13;
    const big = Math.min(21, CAP * 1.5);
    const rows = [];
    // a row is set smaller to fit, down to the 13 px floor; past that it is turned onto a second line
    const put = (text, capH, track) => {
      if (!text) return;
      const t = signFold(text);
      const wOf = (x, c) => signWidth(x, { capH: c, tracking: track });
      const w = wOf(t, capH);
      const fit = w > measure ? Math.max(13, capH * (measure / w)) : capH;
      const lead = Math.round((fit / 0.72) * 1.45);
      let line = '';
      for (const word of t.split(' ')) {
        const cand = line ? `${line} ${word}` : word;
        if (line && wOf(cand, fit) > measure) {
          rows.push({ text: line, start: 0, cap: fit, track, lead, w: wOf(line, fit) });
          line = word;
        } else line = cand;
      }
      if (line) rows.push({ text: line, start: 0, cap: fit, track, lead, w: Math.min(measure, wOf(line, fit)) });
    };
    put(n, small, 0.3);
    put(name, big, 0.2);
    put(label, small, 0.22);
    return { rows, width: Math.max(60, ...rows.map((r) => r.w)) + CAP * 0.4, label: [n, name, label].filter(Boolean).join(', ') };
  }

  // ---- THE API (dialogue.js's contract, kept) ------------------------------------------------------
  const api = {
    script: SCRIPT,
    lineFor,
    linesFor,
    reply: scriptReply,
    positions: POSITIONS,
    anchors: ANCHORS,
    phone: true,

    // The band the words stand in: at the HEAD in the card flow (the ? card's viewer then cuts its
    // sheet to start below it), at the FOOT in the room.
    band() {
      if (pc.classList.contains('foot')) {
        const bottom = rowTop() - ROW_GAP;
        const h = Math.min(lastLogH > 0 ? lastLogH : 200, H() * 0.3);
        return { at: 'foot', top: bottom - h, bottom, h, w: W() };
      }
      const top = vt;
      const bottom = top + (lastLogH > 0 ? lastLogH : regionBottom());
      return { at: 'head', top, bottom, h: bottom - top, w: W() };
    },

    folio(name) {
      if (name === 'greeting' && beat !== 'greeting') wipe();
      beat = name;
      ctx.emit?.('dialogue:folio', { beat });
    },

    // One sentence of his: a bubble cut to its final size, its words inked in as he says them. Resolves
    // when the last word has landed and been held for `hold` seconds.
    say(text, { hold = 1.2 } = {}) {
      finish();
      owedAt = 0;
      const b = lineBubble('him', String(text ?? ''));
      b.shown = 0;
      b.ends = wordEnds(b.rows);
      addBubble(b);
      notify();
      const total = b.ends[b.ends.length - 1] ?? 0;
      const seconds = total / CPS;
      ctx.pieces.pepeAnim?.say?.(text, seconds + 0.2);
      ctx.emit?.('dialogue:say', { text, seconds, takes: 1 });
      return new Promise((res) => {
        typing = { b, total, start: ctx.clock.t, hold, done: res, chars: -1 };
        if (ctx.clock.frozen) finish();
      });
    },

    // A card's title: numeral (or ordinal), name, position — one of HIS messages (the owner: "if
    // they stay in chat, they have to look like a message"), his face at its foot, set left.
    intertitle(slug, position, { hold = 1.5 } = {}) {
      finish();
      owedAt = 0;
      const { rows, width, label } = interRows(slug, position);
      const b = makeBubble('title', rows, { width, align: 'left', label });
      addBubble(b);
      notify();
      ctx.emit?.('dialogue:intertitle', { slug, position });
      return new Promise((res) => {
        inter = { until: ctx.clock.t + hold, done: res };
      });
    },

    async ask(prompt = SCRIPT.question[0], { respond = false, hold = 0.2, signal = null, timeout = 0, value = '', instant = false } = {}) {
      if (signal?.aborted) return null;
      const said = prompt ? api.say(prompt, { hold }) : Promise.resolve();
      if (instant) finish();
      const onAbortSay = () => finish();
      signal?.addEventListener('abort', onAbortSay, { once: true });
      await said;
      signal?.removeEventListener('abort', onAbortSay);
      if (signal?.aborted) return null;
      closeField();
      if (value && !input.value) input.value = value;
      const answer = await new Promise((res) => {
        let done = false, timer = null;
        const settle = (v) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          if (field === mine) field = null;
          chatBtn.classList.remove('asking');
          res(v);
        };
        const onAbort = () => settle(null);
        const mine = {
          submit(text) {
            if (typeof text === 'string' && text) {
              addBubble(lineBubble('me', text));
              owedAt = nowS(); // he owes them a line: the dots go up if he is slow about it
            }
            settle(text);
          },
          dispose: () => settle(null),
        };
        field = mine;
        signal?.addEventListener('abort', onAbort, { once: true });
        if (timeout > 0) timer = setTimeout(() => settle(null), timeout * 1000);
        notify();
        // their words were waiting for this: they go now
        if (queued) {
          const q = queued;
          queued = '';
          send.classList.remove('wait');
          if (input.value.trim() === q) input.value = '';
          mine.submit(q);
        }
      });
      if (answer) ctx.emit?.('dialogue:answer', { answer });
      if (respond && answer != null) await api.say(scriptReply(answer), { hold: 1.4 });
      return answer;
    },

    // The visitor's key: a line still being typed is shown whole (and held a moment less); a title
    // is let go. Space and Return reach this from flow, a tap on the room likewise.
    skip() {
      if (typing) {
        const t = typing;
        if (t.b.shown < t.total) {
          t.b.shown = Infinity;
          strike(t.b);
          t.start = ctx.clock.t - t.total / CPS;
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
    // the placard's fold has no meaning here; the chat button is the visitor's way to put it away
    fold(on = true) {
      setOpen(!on);
    },
    get folded() {
      return !open;
    },
    get open() {
      return open;
    },
    // for the tools: where the stack stops and why
    get region() {
      return { headTop: Math.round(headTop), live: Math.round(measureHead()), bottom: regionBottom(), logH: lastLogH, kb, vt, picking: picking() };
    },
    setOpen,

    async read(slug, position, { hold = 1.3 } = {}) {
      await api.intertitle(slug, position);
      const lines = linesFor(slug, position);
      for (let i = 0; i < lines.length; i++) await api.say(lines[i], { hold });
    },

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
      }
    },

    // What takes a line off the placard on a laptop (the first pick made, Escape, the walk out)
    // only ends what is in progress here: the conversation is a record and it stays. It is wiped
    // when a new evening's greeting begins (folio('greeting')) and by the judging stills.
    clear() {
      finish();
      closeField();
      dropThink();
      thinkForced = false;
      owedAt = 0;
    },
    wipe,

    // Judging stills, deterministic: the lines shown whole.
    setState(name) {
      wipe();
      thinkForced = false;
      owedAt = 0;
      const p = ctx.params;
      const i = +(p.get('line') ?? 0);
      const still = (text) => {
        const b = lineBubble('him', text);
        addBubble(b);
      };
      beat = name;
      if (name === 'reading') {
        const slug = p.get('card') ?? 'the-moon';
        const pos = +(p.get('pos') ?? 1);
        const { rows, width, label } = interRows(slug, pos);
        addBubble(makeBubble('title', rows, { width, align: 'left', label }));
        if (p.get('inter') !== '1') {
          const lines = linesFor(slug, pos);
          still(lines[i] ?? lines[0]);
        }
      } else if (name === 'question') {
        api.ask(SCRIPT.question[i] ?? SCRIPT.question[0], { instant: true, value: p.get('answer') ?? 'I keep starting things and not finishing them.' });
      } else if (name === 'thinking') {
        addBubble(lineBubble('me', p.get('answer') ?? 'I keep starting things and not finishing them.'));
        thinkForced = true;
        standThink();
      } else if (name === 'answer') {
        still(scriptReply(p.get('answer') ?? 'I keep starting things and not finishing them.'));
      } else if (name === 'greeting') {
        still(SCRIPT.greeting[i] ?? SCRIPT.greeting[0]);
      } else {
        const arr = Array.isArray(SCRIPT[name]) ? SCRIPT[name] : SCRIPT.farewell;
        still(arr[i] ?? arr[0]);
      }
      layout();
    },

    update(ctx) {
      rollLevel();
      if (!ctx.clock.stepped) return;
      const f = ctx.clock.frame;
      hookTilt();
      // at the door (the way in, and the way out) there is nobody to talk to: the row and the stack
      // are off the glass until the visitor is in the room
      const away = !!ctx.pieces.entrance?.showing || BARE_SHOTS.includes(shotName());
      if (away !== pc.classList.contains('away')) {
        pc.classList.toggle('away', away);
        if (away && document.activeElement === input) input.blur();
      }
      // the head is measured every half second: the camera moves on rails and cuts, and the stack
      // follows it to the next resting place rather than chasing every frame of a move
      if (++steps % 6 === 0 || !headTop) {
        const m = measureHead();
        if (!m) headTop = 0;
        else if (Math.abs(m - headTop) > 6) headTop = m;
      }
      layout();
      drawField();
      inkField();
      tickThinking();
      // put away in the middle of his question: he is still waiting, and after a while he says so
      if (!open && field && !chatBtn.classList.contains('asking') && shutAt && nowS() - shutAt > WAIT_NUDGE) notify();
      // while the cards are out the field says what the visitor can do there
      const ph = picking() ? 'Tap a card, or ask him' : 'Say something to him';
      if (input.placeholder !== ph) input.placeholder = ph;
      if (inter && ctx.clock.t >= inter.until) finish();
      if (typing) {
        const t = typing;
        const chars = Math.floor((ctx.clock.t - t.start) * CPS + 1e-6);
        if (chars !== t.chars) {
          t.chars = chars;
          // whole words only: the last word whose end the pen has reached
          let shown = 0;
          for (const e of t.b.ends) if (e <= chars) shown = e;
          if (shown !== t.b.shown && t.b.shown !== Infinity) {
            t.b.shown = shown;
            if (stick) toBottom();
          }
        }
        if (chars >= t.total && ctx.clock.t >= t.start + t.total / CPS + t.hold) finish();
      }
      // a bubble faded into the wall at the top of the stack lets a finger through to the room (the
      // ? card on the sign is up there); the ones that can be read can be held to scroll
      if (open) {
        const st = log.scrollTop;
        for (const b of bubbles) b.el.classList.toggle('ghost', b.el.offsetTop - st < FADE);
      }
      // THE BOIL: the newest bubbles are re-cut on every second frame, the rest hold still
      const from = Math.max(0, bubbles.length - BOIL_KEEP);
      for (let k = 0; k < bubbles.length; k++) {
        const b = bubbles[k];
        if (k < from) {
          if (!b.still) {
            b.still = true;
            strike(b);
          }
          continue;
        }
        strike(b);
        if (f % 2 === 0) drawBubble(b.edge, b.boxW, b.boxH, b.seed + boilTick() * 13, b.who === 'him' || b.who === 'title' ? 'bl' : b.who === 'me' ? 'br' : '');
      }
    },
  };

  // ---- THE WINDOW AND THE KEYBOARD ------------------------------------------------------------------
  function relayAll() {
    formW = 0;
    for (const b of bubbles) {
      if (b.who === 'title') continue; // a title is cut to its own measure, which a phone never outgrows
      const text = b.rows.map((r) => r.text).join(' ');
      const nb = lineBubble(b.who, text);
      Object.assign(b, { rows: nb.rows, width: nb.width, boxW: nb.boxW, boxH: nb.boxH, h: nb.h, ends: wordEnds(nb.rows) });
      nb.el.remove();
      strike(b, true);
      drawBubble(b.edge, b.boxW, b.boxH, b.seed, b.who === 'him' ? 'bl' : 'br');
    }
    layout();
    drawField();
  }
  ctx.on?.('resize', () => {
    headTop = 0;
    relayAll();
  });
  if (window.visualViewport) {
    const onVV = () => layout();
    window.visualViewport.addEventListener('resize', onVV);
    window.visualViewport.addEventListener('scroll', onVV);
  }
  // the page itself never scrolls (iOS scrolls it to show a focused field)
  window.addEventListener('scroll', () => {
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  }, { passive: true });

  pc.classList.toggle('shut', !open);
  tiltBtn.hidden = open || tilt()?.available === false;
  paintButtons();
  layout();
  requestAnimationFrame(drawField);
  return api;
}
