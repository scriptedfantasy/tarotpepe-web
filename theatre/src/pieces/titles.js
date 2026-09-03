// PIECE: titles — the typography layer: the opening title, chapter cards, the closing card.
// Futura, centred, generous tracking, set on a flat printed colour between black letterbox
// bars, with the rules and ornaments drawn by hand in ink (see titles-draw.js). Timing is
// stepped: a card cuts in, holds, cuts out; a title may type itself on the 12fps clock.
// API: title(opts), chapter(n | key, name?), closing(), hide(), letterbox(on), setState(name).
import { fit, starRule, border, frog, manicule, cardRow, marquee, marqueeSize, zigzag, bracket } from './titles-draw.js';

export const meta = {
  name: 'titles',
  judge: { shot: 'home', states: ['title', 'chapter', 'closing', 'hidden'], dom: true },
  files: ['src/pieces/titles.js', 'src/pieces/titles-draw.js'],
};

const INK = '#1c1a17';
const PAPER = '#f3e7c9';
const MUSTARD = '#e0a526';
const OXBLOOD = '#7a2e2a';
const TEAL = '#7fbfb9';
const PRUSSIAN = '#2c4a63';
const STEEL = '#697791';
const BAR = 0.07; // letterbox bar height, fraction of the frame

// The chapters, in order. `sub` is the deadpan gloss set in guillemets under the name.
export const CHAPTERS = [
  { key: 'one', label: 'Chapter One', name: 'The Question', sub: 'in which the visitor states what they came for', by: 'the visitor', pp: 'pp. 1&ndash;3', bg: TEAL, fg: INK },
  { key: 'two', label: 'Chapter Two', name: 'The Cards', sub: 'in which three are drawn, and none returned', by: 'the deck', pp: 'pp. 4&ndash;6', bg: OXBLOOD, fg: PAPER },
  { key: 'three', label: 'Chapter Three', name: 'The Reading', sub: 'in which everything is explained, briefly', by: 'Tarot Pepe', pp: 'pp. 7&ndash;9', bg: PRUSSIAN, fg: MUSTARD },
  { key: 'epilogue', label: 'Epilogue', name: 'The Door', sub: 'in which the visitor is shown out, politely', by: 'the management', pp: 'p. 10', bg: INK, fg: PAPER },
];

export async function build(ctx) {
  const root = ctx.dom.titles;
  const bars = ctx.dom.letterbox;
  const font = ctx.params.get('font') === 'jost' ? "'Jost', sans-serif" : 'var(--futura)';
  const style = document.createElement('style');
  style.textContent = `
    #letterbox { z-index: 3; }
    #letterbox .bar { position: absolute; left: 0; right: 0; height: ${BAR * 100}%; background: #0d0a08; }
    #letterbox .bar.top { top: 0; }
    #letterbox .bar.bottom { bottom: 0; }
    #titles { z-index: 2; font-family: ${font}; }
    #titles .card { position: absolute; inset: 0; color: var(--fg); background-color: var(--bg); }
    #titles .card > .frame { position: absolute; left: 0; top: 0; }
    #titles .card .stack { position: absolute; left: 0; right: 0; top: ${BAR * 100}%; bottom: ${BAR * 100}%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    #titles .card .stack > * { margin: 0; }
    #titles .caps { text-transform: uppercase; }
    #titles .kicker { font-size: 2.2vh; letter-spacing: 0.48em; text-indent: 0.48em; font-weight: 500; }
    #titles h1 { font-size: 16.5vh; line-height: 1; letter-spacing: 0.16em; text-indent: 0.16em; font-weight: 700; white-space: nowrap; margin: 2.2vh 0 1.4vh 0; }
    #titles h1.mid { font-size: 11.5vh; letter-spacing: 0.2em; text-indent: 0.2em; margin: 2.4vh 0 1.8vh 0; }
    #titles h1.end { font-size: 18vh; letter-spacing: 0.14em; text-indent: 0.14em; margin: 1.6vh 0 2vh 0; }
    #titles h1 .ch.off { visibility: hidden; }
    #titles .sub { font-size: 2.4vh; letter-spacing: 0.36em; text-indent: 0.36em; font-weight: 500; }
    #titles .gloss { font-size: 2.1vh; letter-spacing: 0.14em; font-weight: 400; margin-top: 2.2vh; }
    #titles .gloss::before { content: '«\\00a0\\00a0'; }
    #titles .gloss::after { content: '\\00a0\\00a0»'; }
    #titles .rule { display: block; margin: 1.2vh 0; }
    #titles .byline { margin-top: 2.4vh; font-size: 1.9vh; letter-spacing: 0.1em; }
    #titles .byline .by { font-weight: 400; font-style: italic; letter-spacing: 0.04em; }
    #titles .byline .who { font-weight: 700; letter-spacing: 0.3em; margin-left: 0.6em; }
    #titles .orn { display: block; margin-top: 3vh; }
    #titles .mark { display: flex; flex-direction: column; align-items: center; margin-top: 2.6vh; }
    #titles .mark .label { font-size: 1.35vh; letter-spacing: 0.34em; text-indent: 0.34em; font-weight: 500; margin-top: 0.4vh; }
    #titles canvas.marquee { display: block; margin: 0.6vh 0 0.2vh 0; }
    #titles canvas.bracket { display: block; margin: 0 0 0.9vh 0; }
    #titles .corner { position: absolute; top: calc(${BAR * 100}% + 4.6vh); font-size: 1.55vh; letter-spacing: 0.28em; font-weight: 500; }
    #titles .corner.tl { left: 7.6vw; text-align: left; }
    #titles .corner.tr { right: 7.6vw; text-align: right; }
    #titles .card.title .corner.tl { left: 11.4vw; }
    #titles .card.title .corner.tr { right: 8.2vw; }
    #titles .foot { position: absolute; left: 0; right: 0; bottom: calc(${BAR * 100}% + 4.4vh); text-align: center; font-size: 1.55vh; letter-spacing: 0.3em; text-indent: 0.3em; font-weight: 500; }
    #titles .credits { display: flex; flex-direction: column; align-items: center; gap: 2.6vh; margin-top: 1vh; }
    #titles .credit .role { font-size: 1.5vh; letter-spacing: 0.3em; text-indent: 0.3em; font-weight: 400; opacity: 0.85; margin-bottom: 0.6vh; }
    #titles .credit .name { font-size: 2.6vh; letter-spacing: 0.32em; text-indent: 0.32em; font-weight: 700; }
  `;
  document.head.appendChild(style);

  let showing = null; // the card currently up: { kind, draw() }
  let typing = null; // { spans, start, cps }
  let wantBars = false; // bars asked for by someone else (the scene), independent of cards
  const inkBars = () => !!ctx.pieces.ink?.params?.letterbox; // the ink piece is drawing its own bars → we do not

  function setBars(on) {
    bars.innerHTML = on && !inkBars() ? '<div class="bar top"></div><div class="bar bottom"></div>' : '';
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const spanify = (text, hidden) => [...text].map((c) => `<span class="ch${hidden && c !== ' ' ? ' off' : ''}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');

  // Build a card and draw its pen work. `draw(frameCtx, w, h)` draws the full-frame layer;
  // small inline canvases are drawn via data-draw hooks.
  function show(kind, { bg, fg, html, frame = null, corner = null, foot = null, type = null }) {
    root.innerHTML = '';
    const card = document.createElement('div');
    card.className = `card ${kind}`;
    card.style.setProperty('--bg', bg);
    card.style.setProperty('--fg', fg);
    card.innerHTML =
      `<canvas class="frame"></canvas>` +
      (corner ? `<div class="corner tl caps">${corner[0]}</div><div class="corner tr caps">${corner[1]}</div>` : '') +
      `<div class="stack">${html}</div>` +
      (foot ? `<div class="foot caps">${foot}</div>` : '');
    root.appendChild(card);
    setBars(true);
    const draw = () => {
      const w = ctx.size.w, h = ctx.size.h;
      const g = fit(card.querySelector('.frame'), w, h);
      const inset = Math.round(h * BAR) + Math.round(h * 0.03);
      border(g, w, h, inset, { color: fg, seed: 9 });
      if (frame) frame(g, w, h);
      card.querySelectorAll('canvas[data-draw]').forEach((c) => {
        const cw = +c.dataset.w, chh = +c.dataset.h;
        const gg = fit(c, cw, chh);
        const fn = DRAW[c.dataset.draw];
        fn?.(gg, cw, chh, c.dataset, fg);
      });
    };
    draw();
    showing = { kind, draw };
    if (type === 'marquee') {
      const c = card.querySelector('canvas.marquee');
      typing = { marquee: c, total: c.dataset.text.length, start: ctx.clock.t, cps: 10, n: -1 };
      redrawMarquee(c, 0);
    } else if (type) {
      const spans = [...card.querySelectorAll(`${type} .ch.off`)];
      typing = { spans, start: ctx.clock.t, cps: 14 };
    } else typing = null;
    return card;
  }

  function redrawMarquee(c, count) {
    const w = +c.dataset.w, h = +c.dataset.h;
    const g = fit(c, w, h);
    marquee(g, w, h, c.dataset.text, { capH: +c.dataset.cap, ink: c.dataset.ink, bulb: c.dataset.bulb, count });
  }
  const DRAW = {
    marquee: (g, w, h, d) => marquee(g, w, h, d.text, { capH: +d.cap, ink: d.ink, bulb: d.bulb, count: d.count != null ? +d.count : Infinity }),
    bracket: (g, w, h, d, fg) => bracket(g, w, h, { color: fg, seed: 13 }),
    rule: (g, w, h, d, fg) => starRule(g, w, h, { color: fg, seed: +(d.seed ?? 5), star: d.star !== '0' }),
    frog: (g, w, h, d, fg) => frog(g, w, h, { color: fg === INK ? INK : INK, seed: 21 }),
    manicule: (g, w, h, d, fg) => manicule(g, w, h, { color: fg }),
    cards: (g, w, h, d, fg) => cardRow(g, w, h, +(d.current ?? 0), { color: fg }),
  };
  const rule = (w, h, seed, star = true) => `<canvas class="rule" data-draw="rule" data-w="${w}" data-h="${h}" data-seed="${seed}" data-star="${star ? 1 : 0}"></canvas>`;
  const vh = (n) => Math.round((ctx.size.h * n) / 100);

  const api = {
    CHAPTERS,
    title({ kicker = 'A reading, in miniature', title = 'Tarot Pepe', sub = 'in three cards', type = false, palette = 'mustard' } = {}) {
      const pal = palette === 'oxblood' ? { bg: OXBLOOD, fg: MUSTARD } : { bg: MUSTARD, fg: INK };
      const word = title.toUpperCase();
      const capH = vh(15);
      const ms = marqueeSize(word, capH);
      return show('title', {
        ...pal,
        corner: ['Série I &mdash; N° 1', 'Admission: one question'],
        foot: 'The parlour is open &middot; please come in',
        type: type ? 'marquee' : null,
        frame: (g, w, h) => {
          // the zig-zag spine: one bold band down the left edge, just inside the double rule
          const inset = Math.round(h * BAR) + Math.round(h * 0.03) + 7;
          const bw = Math.round(w * 0.022);
          const y0 = inset + 5, y1 = h - inset - 5;
          const colors = palette === 'oxblood' ? [MUSTARD, STEEL, PAPER] : [OXBLOOD, STEEL, MUSTARD];
          zigzag(g, inset + 5, y0, y1, bw, { colors, ground: INK, ink: INK, seed: 17 });
        },
        html:
          `<canvas class="bracket" data-draw="bracket" data-w="${vh(34)}" data-h="${vh(2.2)}"></canvas>` +
          `<div class="kicker caps">${esc(kicker)}</div>` +
          rule(vh(30), 18, 5) +
          `<canvas class="marquee" data-draw="marquee" data-w="${ms.w}" data-h="${ms.h}" data-cap="${capH}" data-text="${esc(word)}" data-ink="${pal.fg}" data-bulb="${pal.bg}"${type ? ' data-count="0"' : ''}></canvas>` +
          rule(vh(30), 18, 6) +
          `<div class="sub caps">${esc(sub)}</div>` +
          `<div class="mark"><canvas data-draw="frog" data-w="${vh(19)}" data-h="${vh(14)}"></canvas><div class="label caps">Proprietor</div></div>`,
      });
    },
    chapter(n, name, { type = false } = {}) {
      const ch = typeof n === 'number' ? CHAPTERS[n] : CHAPTERS.find((c) => c.key === String(n).toLowerCase()) ?? CHAPTERS[0];
      const idx = CHAPTERS.indexOf(ch);
      const title = name ?? ch.name;
      return show('chapter', {
        bg: ch.bg,
        fg: ch.fg,
        corner: ['Série I &mdash; N° 1', ch.pp],
        type: type ? 'h1' : null,
        html:
          `<canvas class="orn" data-draw="manicule" data-w="${vh(16)}" data-h="${vh(8)}" style="margin:0 0 2vh 0"></canvas>` +
          `<div class="kicker caps">${esc(ch.label)}</div>` +
          rule(vh(24), 18, 7) +
          `<h1 class="mid caps">${spanify(title.toUpperCase(), !!type)}</h1>` +
          rule(vh(24), 18, 8) +
          `<div class="gloss">${esc(ch.sub)}</div>` +
          `<div class="byline"><span class="by">by</span> <span class="caps who">${esc(ch.by)}</span></div>` +
          (idx < 3 ? `<canvas class="orn" data-draw="cards" data-w="${vh(20)}" data-h="${vh(5)}" data-current="${idx}"></canvas>` : ''),
      });
    },
    closing() {
      return show('closing', {
        bg: INK,
        fg: PAPER,
        corner: ['Série I &mdash; N° 1', 'Fin de la séance'],
        foot: 'The parlour is now closed',
        html:
          `<div class="kicker caps">Tarot Pepe thanks you for your visit</div>` +
          rule(vh(30), 18, 5) +
          `<h1 class="end caps" style="color:${MUSTARD}">The End</h1>` +
          rule(vh(30), 18, 6) +
          `<div class="credits">` +
          `<div class="credit"><div class="role caps">Cards read by</div><div class="name caps">Tarot Pepe</div></div>` +
          `<div class="credit"><div class="role caps">The visitor played by</div><div class="name caps">Yourself</div></div>` +
          `<div class="credit"><div class="role caps">Drawn in ink on paper &middot; moved on twos</div></div>` +
          `</div>`,
      });
    },
    hide() {
      root.innerHTML = '';
      showing = null;
      typing = null;
      setBars(wantBars);
    },
    // Letterbox for the scene itself (no card up), at the same bar height as the cards. When the
    // ink piece can draw bars in the render (paper-white), it does; otherwise black DOM bars.
    letterbox(on) {
      wantBars = !!on;
      const ink = ctx.pieces.ink;
      if (ink?.setLetterbox) {
        ink.setLetterbox(on ? ctx.size.w / ctx.size.h / (1 - 2 * BAR) : null);
        wantBars = false;
      }
      if (!showing) setBars(wantBars);
    },
    setState(name) {
      if (name === 'title') api.title();
      else if (name === 'title-oxblood') api.title({ palette: 'oxblood' });
      else if (name === 'chapter') api.chapter(0);
      else if (name.startsWith('chapter-')) api.chapter(name.slice(8));
      else if (name === 'closing') api.closing();
      else if (name === 'typing') api.title({ type: true });
      else api.hide();
    },
    update(ctx) {
      if (!typing || !ctx.clock.stepped) return;
      if (typing.marquee) {
        const n = Math.min(typing.total, Math.floor((ctx.clock.t - typing.start) * typing.cps));
        if (n !== typing.n) {
          typing.n = n;
          typing.marquee.dataset.count = n;
          redrawMarquee(typing.marquee, n);
        }
        if (n >= typing.total) typing = null;
        return;
      }
      const n = Math.min(typing.spans.length, Math.floor((ctx.clock.t - typing.start) * typing.cps));
      for (let i = 0; i < n; i++) typing.spans[i].classList.remove('off');
      if (n >= typing.spans.length) typing = null;
    },
  };
  ctx.on('resize', () => showing?.draw());
  return api;
}
