// PIECE: titles — the typography layer: the opening title, the story card, the closing card.
//
// Three cards in the whole evening, not six, and every one of them full-bleed: the picture is never
// letterboxed, so a card never changes the shape of the frame — it just replaces it, cut in, held,
// cut out. Whatever is set large is CUT, letter by letter, in the masthead's hand: heavy slab caps
// with a line of bulbs walking every stroke, hung on a signwriter's rails (titles-draw.js). The
// small print — the section line, the gloss, the byline, the corner marks — is the same letter-
// spaced Futura caps on all three, so the family holds.
//
// API: title(opts), chapter(n | key, name?), closing(), hide(), letterbox(on), setState(name).
import { fit, starRule, border, manicule, cardRow, doorAjar, marquee, marqueeFit, zigzag, bracket } from './titles-draw.js';
import { vignette } from './titles-vignette.js';

export const meta = {
  name: 'titles',
  judge: { shot: 'home', states: ['title', 'chapter', 'closing', 'hidden'], dom: true },
  files: ['src/pieces/titles.js', 'src/pieces/titles-draw.js', 'src/pieces/titles-vignette.js'],
};

const INK = '#0d0e0d';
const CREAM = '#f3e7c9';
const MUSTARD = '#e0a526';
const OXBLOOD = '#7a2e2a';
const TEAL = '#7fbfb9';
const STEEL = '#697791';
const BULB = { onMustard: '#f7ecc2', onTeal: '#f6efdc', onInk: '#f6e6b4' };

// The evening is one story in one issue, so it gets one story card, between the masthead and the
// sign-off. flow still calls chapter(0..3) at its four hinges; the three marked `cut` show nothing
// — two typographic cards back to back (title→chapter, epilogue→closing) is not a film, it is a
// slideshow. See the round's contract note: flow should stop asking for them.
export const CHAPTERS = [
  { key: 'one', cut: true },
  {
    key: 'cards',
    kicker: 'Arcana &amp; Divination',
    name: 'The Cards',
    sub: 'in which three are drawn, and none returned',
    by: 'Tarot Pepe',
    pp: 'pp. 4&ndash;9',
    bg: TEAL,
    fg: INK,
    bulb: BULB.onTeal,
  },
  { key: 'three', cut: true },
  { key: 'epilogue', cut: true },
];

export async function build(ctx) {
  const root = ctx.dom.titles;
  const bars = ctx.dom.letterbox;
  const font = ctx.params.get('font') === 'jost' ? "'Jost', sans-serif" : 'var(--futura)';
  const style = document.createElement('style');
  style.textContent = `
    #letterbox { z-index: 3; }
    #titles { z-index: 2; font-family: ${font}; }
    #titles .card { position: absolute; inset: 0; color: var(--fg); background-color: var(--bg); }
    #titles .card > .frame { position: absolute; left: 0; top: 0; }
    #titles .card .stack { position: absolute; left: 0; right: 0; top: 12.5vh; bottom: 12.5vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    #titles .card .stack > * { margin: 0; }
    #titles .caps { text-transform: uppercase; }
    #titles .kicker { font-size: 2.2vh; letter-spacing: 0.48em; text-indent: 0.48em; font-weight: 500; }
    #titles .sub { font-size: 2.4vh; letter-spacing: 0.36em; text-indent: 0.36em; font-weight: 500; }
    #titles .card.title .sub { font-size: 2.9vh; letter-spacing: 0.3em; text-indent: 0.3em; font-weight: 700; }
    #titles .gloss { font-size: 2.1vh; letter-spacing: 0.14em; font-weight: 400; margin-top: 2.2vh; }
    #titles .card.closing .gloss { margin-top: 4.4vh; opacity: 0.9; }
    #titles .gloss::before { content: '«\\00a0\\00a0'; }
    #titles .gloss::after { content: '\\00a0\\00a0»'; }
    #titles .rule { display: block; margin: 1.2vh 0; }
    #titles .byline { margin-top: 2.4vh; font-size: 1.9vh; letter-spacing: 0.1em; }
    #titles .byline .by { font-weight: 400; font-style: italic; letter-spacing: 0.04em; }
    #titles .byline .who { font-weight: 700; letter-spacing: 0.3em; margin-left: 0.6em; }
    #titles .orn { display: block; margin-top: 3vh; }
    #titles .mark { display: flex; flex-direction: column; align-items: center; margin-top: 2.4vh; }
    #titles .mark .label { font-size: 1.35vh; letter-spacing: 0.34em; text-indent: 0.34em; font-weight: 500; margin-top: 0.9vh; }
    #titles canvas.marquee { display: block; margin: 0.7vh 0 0.3vh 0; }
    #titles canvas.bracket { display: block; margin: 0 0 0.9vh 0; }
    #titles .corner { position: absolute; top: 8.6vh; font-size: 1.55vh; letter-spacing: 0.28em; font-weight: 500; }
    #titles .corner.tl { left: 9.6vw; text-align: left; }
    #titles .corner.tr { right: 9.6vw; text-align: right; }
    #titles .foot { position: absolute; left: 0; right: 0; bottom: 8.2vh; text-align: center; font-size: 1.55vh; letter-spacing: 0.3em; text-indent: 0.3em; font-weight: 500; }
    #titles .credits { display: flex; flex-direction: column; align-items: center; gap: 2.4vh; margin-top: 1.2vh; }
    #titles .credit .role { font-size: 1.5vh; letter-spacing: 0.3em; text-indent: 0.3em; font-weight: 400; opacity: 0.85; margin-bottom: 0.6vh; }
    #titles .credit .name { font-size: 2.6vh; letter-spacing: 0.32em; text-indent: 0.32em; font-weight: 700; }
  `;
  document.head.appendChild(style);

  let showing = null; // the card currently up: { kind, draw() }
  bars.innerHTML = ''; // nothing is barred: the picture and the cards are the same shape

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // Build a card and draw its pen work. `frame(g, w, h)` draws the full-frame layer; the small
  // inline canvases are drawn through the data-draw hooks below.
  function show(kind, { bg, fg, html, frame = null, corner = null, foot = null }) {
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
    const draw = () => {
      const w = ctx.size.w, h = ctx.size.h;
      const g = fit(card.querySelector('.frame'), w, h);
      border(g, w, h, Math.round(h * 0.045), { color: fg, seed: 9 });
      if (frame) frame(g, w, h);
      card.querySelectorAll('canvas[data-draw]').forEach((c) => {
        const cw = +c.dataset.w, chh = +c.dataset.h;
        DRAW[c.dataset.draw]?.(fit(c, cw, chh), cw, chh, c.dataset, fg);
      });
    };
    draw();
    showing = { kind, draw };
    return card;
  }

  const DRAW = {
    marquee: (g, w, h, d) => marquee(g, w, h, d.text, { capH: +d.cap, ink: d.ink, bulb: d.bulb, rail: d.rail || null }),
    bracket: (g, w, h, d, fg) => bracket(g, w, h, { color: fg, seed: 13 }),
    rule: (g, w, h, d, fg) => starRule(g, w, h, { color: fg, seed: +(d.seed ?? 5), star: d.star !== '0' }),
    vignette: (g, w, h, d, fg) => vignette(g, w, h, { color: INK, seed: 51 }),
    manicule: (g, w, h, d, fg) => manicule(g, w, h, { color: fg }),
    door: (g, w, h, d, fg) => doorAjar(g, w, h, { color: fg }),
    cards: (g, w, h, d, fg) => cardRow(g, w, h, -1, { color: fg, back: true }),
  };
  const rule = (w, h, seed, star = true) => `<canvas class="rule" data-draw="rule" data-w="${w}" data-h="${h}" data-seed="${seed}" data-star="${star ? 1 : 0}"></canvas>`;
  const vh = (n) => Math.round((ctx.size.h * n) / 100);

  // A headline, cut in the masthead's hand: the cap height comes down until the word fits `frac`
  // of the measure, so the same family sets a ten-letter title and a three-letter sign-off.
  function headline(word, { capVh, frac, ink, bulb, rail = '' }) {
    const ms = marqueeFit(word.toUpperCase(), vh(capVh), ctx.size.w * frac);
    return `<canvas class="marquee" data-draw="marquee" data-w="${ms.w}" data-h="${ms.h}" data-cap="${ms.capH}" data-text="${esc(word.toUpperCase())}" data-ink="${ink}" data-bulb="${bulb}" data-rail="${rail}"></canvas>`;
  }

  // The zig-zag spine down the left edge — the cover's stripe. Every card carries it.
  const spine = (colors, ground) => (g, w, h) => {
    const inset = Math.round(h * 0.045) + 7;
    zigzag(g, inset + 5, inset + 5, h - inset - 5, Math.round(w * 0.03), { colors, ground, ink: INK, seed: 17 });
  };

  const api = {
    CHAPTERS,
    title({ kicker = 'A reading, in miniature', title = 'Tarot Pepe', sub = 'in three cards' } = {}) {
      return show('title', {
        bg: MUSTARD,
        fg: INK,
        corner: ['Série I &mdash; N° 1', 'Admission: one question'],
        foot: 'The parlour is open &middot; please come in',
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          `<canvas class="bracket" data-draw="bracket" data-w="${vh(34)}" data-h="${vh(2.2)}"></canvas>` +
          `<div class="kicker caps">${esc(kicker)}</div>` +
          rule(vh(30), 18, 5) +
          headline(title, { capVh: 15.5, frac: 0.80, ink: INK, bulb: BULB.onMustard }) +
          rule(vh(30), 18, 6) +
          `<div class="sub caps">${esc(sub)}</div>` +
          `<div class="mark"><canvas data-draw="vignette" data-w="${vh(66)}" data-h="${Math.round((vh(66) * 240) / 560)}"></canvas><div class="label caps">Tarot Pepe, proprietor</div></div>`,
      });
    },
    // The story card. `n` keeps flow's four hinges addressable; only the one story card is set.
    chapter(n, name) {
      const ch = typeof n === 'number' ? CHAPTERS[n] : CHAPTERS.find((c) => c.key === String(n).toLowerCase());
      if (!ch || ch.cut) return null; // a hinge with no card: the picture simply carries on
      return show('chapter', {
        bg: ch.bg,
        fg: ch.fg,
        corner: ['Série I &mdash; N° 1', ch.pp],
        foot: 'Seventy-eight cards &middot; three will be enough',
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          `<canvas class="orn" data-draw="manicule" data-w="${vh(18)}" data-h="${vh(9)}" style="margin:0 0 2.4vh 0"></canvas>` +
          `<div class="kicker caps">${ch.kicker}</div>` +
          rule(vh(28), 18, 7) +
          headline(name ?? ch.name, { capVh: 14, frac: 0.76, ink: ch.fg, bulb: ch.bulb }) +
          rule(vh(28), 18, 8) +
          `<div class="gloss">${esc(ch.sub)}</div>` +
          `<div class="byline"><span class="by">by</span> <span class="caps who">${esc(ch.by)}</span></div>` +
          `<canvas class="orn" data-draw="cards" data-w="${vh(38)}" data-h="${vh(13)}" style="margin-top:3.4vh"></canvas>`,
      });
    },
    closing() {
      return show('closing', {
        bg: INK,
        fg: CREAM,
        corner: ['Série I &mdash; N° 1', 'Fin de la séance'],
        foot: 'Knock, and the parlour opens again',
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          `<div class="kicker caps">Tarot Pepe thanks you for your visit</div>` +
          rule(vh(30), 18, 5) +
          headline('The End', { capVh: 12.5, frac: 0.58, ink: MUSTARD, bulb: BULB.onInk, rail: '#6b5423' }) +
          rule(vh(30), 18, 6) +
          `<div class="credits">` +
          `<div class="credit"><div class="role caps">Cards read by</div><div class="name caps">Tarot Pepe</div></div>` +
          `<div class="credit"><div class="role caps">The visitor played by</div><div class="name caps">Yourself</div></div>` +
          `</div>` +
          `<div class="gloss">the cards were dealt at random; the reading was not</div>` +
          `<canvas class="orn" data-draw="door" data-w="${vh(13)}" data-h="${vh(21)}" style="margin-top:3.6vh"></canvas>`,
      });
    },
    hide() {
      root.innerHTML = '';
      showing = null;
    },
    // Nothing in this film is barred — the cards are the same shape as the picture, so a card
    // never changes the aspect. Kept so a caller asking for bars is answered, not broken.
    letterbox() {
      ctx.pieces.ink?.setLetterbox?.(null);
      bars.innerHTML = '';
    },
    setState(name) {
      if (name === 'title') api.title();
      else if (name === 'chapter') api.chapter(1);
      else if (name.startsWith('chapter-')) api.chapter(name.slice(8));
      else if (name === 'closing') api.closing();
      else api.hide();
    },
  };
  ctx.on('resize', () => showing?.draw());
  return api;
}
