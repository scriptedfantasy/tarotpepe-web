// PIECE: titles — the typography layer: the opening title, the story card, the closing card.
//
// Three cards in the whole evening, not six, and every one of them full-bleed: the picture is never
// letterboxed, so a card never changes the shape of the frame — it just replaces it, cut in, held,
// cut out. Whatever is set large is CUT, letter by letter, in the masthead's hand: heavy slab caps
// with a line of bulbs walking every stroke, hung on a signwriter's truss (titles-draw.js).
//
// NOTHING on these cards is typeset. The small print — the section line, the gloss, the byline, the
// corner marks — is cut too, in the secondary alphabet of titles-sign.js (the hand the film letters
// a shopfront with: COIFFEUR, OPTIQUE), and re-cut every second frame of the 12 fps clock so the
// line shivers while the card holds. The page's font-family is only there for the input caret.
//
// API: title(opts), chapter(n | key, name?), closing(), hide(), letterbox(on), setState(name).
import { fit, starRule, border, manicule, cardRow, doorAjar, marquee, marqueeFit, zigzag, bracket } from './titles-draw.js';
import { signCaps, signWidth, SIGN_ASCENT, SIGN_DESCENT } from './titles-sign.js';
import { vignette } from './titles-vignette.js';

export const meta = {
  name: 'titles',
  judge: { shot: 'home', states: ['title', 'chapter', 'closing', 'hidden'], dom: true },
  files: ['src/pieces/titles.js', 'src/pieces/titles-draw.js', 'src/pieces/titles-sign.js', 'src/pieces/titles-vignette.js'],
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
    kicker: 'ARCANA & DIVINATION',
    name: 'The Cards',
    sub: 'IN WHICH THREE ARE DRAWN, AND NONE RETURNED',
    by: 'TAROT PEPE',
    pp: 'PP. 4–9',
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
  const style = document.createElement('style');
  style.textContent = `
    #letterbox { z-index: 3; }
    #titles { z-index: 2; }
    #titles .card { position: absolute; inset: 0; color: var(--fg); background-color: var(--bg); }
    #titles .card > .frame { position: absolute; left: 0; top: 0; }
    #titles .card .stack { position: absolute; left: 0; right: 0; top: 11.6vh; bottom: 14.6vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    #titles canvas { display: block; margin-left: auto; margin-right: auto; }
    #titles canvas.marquee { margin: 0.7vh auto 0.3vh auto; }
    #titles canvas.bracket { margin: 0 auto 0.4vh auto; }
    #titles canvas.rule { margin: 1.1vh auto; }
    #titles .corner { position: absolute; top: 8.2vh; }
    #titles .corner.tl { left: 9.6vw; }
    #titles .corner.tr { right: 9.6vw; }
    #titles .foot { position: absolute; left: 0; right: 0; bottom: 6.4vh; }
    #titles .mark { display: flex; flex-direction: column; align-items: center; margin-top: 1.4vh; }
  `;
  document.head.appendChild(style);

  let showing = null; // the card currently up: { kind, draw(), signs() }
  let boilN = -1; // which pair of frames the small lettering was last cut on
  bars.innerHTML = ''; // nothing is barred: the picture and the cards are the same shape

  const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const vh = (n) => Math.round((ctx.size.h * n) / 100);

  // ---- the small hand ---------------------------------------------------------------------
  // One line of sign caps, cut on its own canvas. `runs` are set on a single baseline, so a line
  // can change weight or size inside itself (the byline's "by", the credits' role and name).
  const RUN = (t, cap, track = 0.24, extra = {}) => ({ t, cap, track, ...extra });
  function signLine(runs, { cls = '', style = '', gap = 0.55, seed = 11 } = {}) {
    const rs = Array.isArray(runs) ? runs : [runs];
    const capM = Math.max(...rs.map((r) => r.cap));
    const total = rs.reduce((a, r) => a + signWidth(r.t, { capH: r.cap, tracking: r.track }), 0) + gap * capM * (rs.length - 1);
    const w = Math.ceil(total) + 8;
    const h = Math.ceil(capM * (1 + SIGN_ASCENT + SIGN_DESCENT));
    return `<canvas class="sign ${cls}" data-draw="sign" data-w="${w}" data-h="${h}" data-cap="${capM}" data-gap="${gap}" data-seed="${seed}" data-runs="${attr(JSON.stringify(rs))}" style="${style}"></canvas>`;
  }

  // ---- the card ---------------------------------------------------------------------------
  function show(kind, { bg, fg, html, frame = null, corner = null, foot = null }) {
    root.innerHTML = '';
    const card = document.createElement('div');
    card.className = `card ${kind}`;
    card.style.setProperty('--bg', bg);
    card.style.setProperty('--fg', fg);
    card.innerHTML =
      `<canvas class="frame"></canvas>` +
      (corner ? `<div class="corner tl">${corner[0]}</div><div class="corner tr">${corner[1]}</div>` : '') +
      `<div class="stack">${html}</div>` +
      (foot ? `<div class="foot">${foot}</div>` : '');
    root.appendChild(card);
    const drawOne = (c) => {
      const cw = +c.dataset.w, chh = +c.dataset.h;
      DRAW[c.dataset.draw]?.(fit(c, cw, chh), cw, chh, c.dataset, fg);
    };
    const signs = () => card.querySelectorAll('canvas[data-draw="sign"]').forEach(drawOne);
    const draw = () => {
      const w = ctx.size.w, h = ctx.size.h;
      const g = fit(card.querySelector('.frame'), w, h);
      border(g, w, h, Math.round(h * 0.045), { color: fg, seed: 9 });
      if (frame) frame(g, w, h);
      card.querySelectorAll('canvas[data-draw]').forEach(drawOne);
    };
    draw();
    showing = { kind, draw, signs };
    return card;
  }

  const DRAW = {
    sign: (g, w, h, d, fg) => {
      const rs = JSON.parse(d.runs);
      const capM = +d.cap, gap = +d.gap, seed = +d.seed;
      const widths = rs.map((r) => signWidth(r.t, { capH: r.cap, tracking: r.track }));
      const total = widths.reduce((a, b) => a + b, 0) + gap * capM * (rs.length - 1);
      const base = capM * SIGN_ASCENT + capM; // one baseline for every run on the line
      let x = (w - total) / 2;
      rs.forEach((r, i) => {
        signCaps(g, r.t, x, base, {
          capH: r.cap,
          tracking: r.track,
          color: r.color || fg,
          alpha: r.alpha ?? 1,
          weight: r.pen,
          align: 'left',
          baseline: 'alphabetic',
          seed: seed + i * 31,
          boil: Math.max(0, boilN),
        });
        x += widths[i] + gap * capM;
      });
    },
    marquee: (g, w, h, d) => marquee(g, w, h, d.text, { capH: +d.cap, ink: d.ink, bulb: d.bulb, rail: d.rail || null }),
    bracket: (g, w, h, d, fg) => bracket(g, w, h, { color: fg, seed: 13 }),
    rule: (g, w, h, d, fg) => starRule(g, w, h, { color: fg, seed: +(d.seed ?? 5), star: d.star !== '0' }),
    vignette: (g, w, h, d, fg) => vignette(g, w, h, { color: INK, seed: 51 }),
    manicule: (g, w, h, d, fg) => manicule(g, w, h, { color: fg }),
    door: (g, w, h, d, fg) => doorAjar(g, w, h, { color: fg }),
    cards: (g, w, h, d, fg) => cardRow(g, w, h, -1, { color: fg, back: true }),
  };
  const rule = (w, h, seed, star = true) => `<canvas class="rule" data-draw="rule" data-w="${w}" data-h="${h}" data-seed="${seed}" data-star="${star ? 1 : 0}"></canvas>`;

  // A headline, cut in the masthead's hand: the cap height comes down until the word fits `frac`
  // of the measure, so the same family sets a ten-letter title and a three-letter sign-off.
  function headline(word, { capVh, frac, ink, bulb, rail = '' }) {
    const ms = marqueeFit(word.toUpperCase(), vh(capVh), ctx.size.w * frac);
    return `<canvas class="marquee" data-draw="marquee" data-w="${ms.w}" data-h="${ms.h}" data-cap="${ms.capH}" data-text="${attr(word.toUpperCase())}" data-ink="${ink}" data-bulb="${bulb}" data-rail="${rail}"></canvas>`;
  }

  // The zig-zag spine down the left edge — the cover's stripe. Every card carries it.
  const spine = (colors, ground) => (g, w, h) => {
    const inset = Math.round(h * 0.045) + 7;
    zigzag(g, inset + 5, inset + 5, h - inset - 5, Math.round(w * 0.03), { colors, ground, ink: INK, seed: 17 });
  };

  // The furniture every card carries, cut small: the issue line, the admission, the footer.
  const CAP = { corner: () => vh(2.05), foot: () => vh(2.1), kick: () => vh(2.4), gloss: () => vh(2.2), small: () => vh(2.0) };

  const api = {
    CHAPTERS,
    title({ kicker = 'A READING, IN MINIATURE', title = 'Tarot Pepe', sub = 'IN THREE CARDS' } = {}) {
      const c = CAP.corner();
      return show('title', {
        bg: MUSTARD,
        fg: INK,
        corner: [signLine(RUN('SÉRIE I — N° 1', c, 0.26), { seed: 21 }), signLine(RUN('ADMISSION: ONE QUESTION', c, 0.26), { seed: 22 })],
        foot: signLine(RUN('THE PARLOUR IS OPEN · PLEASE COME IN', CAP.foot(), 0.3), { seed: 23 }),
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          `<canvas class="bracket" data-draw="bracket" data-w="${vh(34)}" data-h="${vh(2.2)}"></canvas>` +
          signLine(RUN(kicker, CAP.kick(), 0.44), { seed: 24 }) +
          rule(vh(30), 18, 5) +
          headline(title, { capVh: 14.4, frac: 0.78, ink: INK, bulb: BULB.onMustard }) +
          rule(vh(30), 18, 6) +
          signLine(RUN(sub, vh(2.95), 0.3, { pen: 3.4 }), { seed: 25, style: 'margin-top:0.4vh' }) +
          `<div class="mark"><canvas data-draw="vignette" data-w="${vh(56)}" data-h="${Math.round((vh(56) * 240) / 560)}"></canvas>` +
          signLine(RUN('TAROT PEPE, PROPRIETOR', CAP.small(), 0.32), { seed: 26, style: 'margin-top:1.1vh' }) +
          `</div>`,
      });
    },
    // The story card. `n` keeps flow's four hinges addressable; only the one story card is set.
    // Four lines to read — kicker, headline, gloss, byline — which is a three-and-a-half second
    // card, not a two-second one; flow holds it that long.
    chapter(n, name) {
      const ch = typeof n === 'number' ? CHAPTERS[n] : CHAPTERS.find((c) => c.key === String(n).toLowerCase());
      if (!ch || ch.cut) return null; // a hinge with no card: the picture simply carries on
      const c = CAP.corner();
      return show('chapter', {
        bg: ch.bg,
        fg: ch.fg,
        corner: [signLine(RUN('SÉRIE I — N° 1', c, 0.26), { seed: 31 }), signLine(RUN(ch.pp, c, 0.26), { seed: 32 })],
        foot: signLine(RUN('SEVENTY-EIGHT CARDS · THREE WILL BE ENOUGH', CAP.foot(), 0.3), { seed: 33 }),
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          `<canvas class="orn" data-draw="manicule" data-w="${vh(18)}" data-h="${vh(9)}" style="margin:0 auto 2.2vh auto"></canvas>` +
          signLine(RUN(ch.kicker, CAP.kick(), 0.44), { seed: 34 }) +
          rule(vh(28), 18, 7) +
          headline(name ?? ch.name, { capVh: 14, frac: 0.76, ink: ch.fg, bulb: ch.bulb }) +
          rule(vh(28), 18, 8) +
          signLine(RUN(ch.sub, CAP.gloss(), 0.17), { seed: 35, style: 'margin-top:0.4vh' }) +
          signLine([RUN('BY', CAP.small(), 0.2, { alpha: 0.82 }), RUN(ch.by, vh(2.35), 0.3, { pen: 2.8 })], { seed: 36, gap: 0.7, style: 'margin-top:1.2vh' }) +
          `<canvas class="orn" data-draw="cards" data-w="${vh(38)}" data-h="${vh(13)}" style="margin-top:3.0vh"></canvas>`,
      });
    },
    closing() {
      const c = CAP.corner();
      return show('closing', {
        bg: INK,
        fg: CREAM,
        corner: [signLine(RUN('SÉRIE I — N° 1', c, 0.26), { seed: 41 }), signLine(RUN('FIN DE LA SÉANCE', c, 0.26), { seed: 42 })],
        foot: signLine(RUN('KNOCK, AND THE PARLOUR OPENS AGAIN', CAP.foot(), 0.3), { seed: 43 }),
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          signLine(RUN('TAROT PEPE THANKS YOU FOR YOUR VISIT', CAP.gloss(), 0.3), { seed: 44 }) +
          rule(vh(30), 18, 5) +
          headline('The End', { capVh: 11.4, frac: 0.54, ink: MUSTARD, bulb: BULB.onInk, rail: '#6b5423' }) +
          rule(vh(30), 18, 6) +
          signLine(RUN('CARDS READ BY', CAP.small(), 0.34, { alpha: 0.85 }), { seed: 45, style: 'margin-top:1.2vh' }) +
          signLine(RUN('TAROT PEPE', vh(2.9), 0.32, { pen: 3.4 }), { seed: 46, style: 'margin-top:0.2vh' }) +
          signLine(RUN('THE VISITOR PLAYED BY', CAP.small(), 0.34, { alpha: 0.85 }), { seed: 47, style: 'margin-top:1.6vh' }) +
          signLine(RUN('YOURSELF', vh(2.9), 0.32, { pen: 3.4 }), { seed: 48, style: 'margin-top:0.2vh' }) +
          signLine(RUN('THE CARDS WERE DEALT AT RANDOM; THE READING WAS NOT', CAP.gloss(), 0.17), { seed: 49, style: 'margin-top:2.2vh' }) +
          `<canvas class="orn" data-draw="door" data-w="${vh(9.6)}" data-h="${vh(15.5)}" style="margin-top:2.2vh"></canvas>`,
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
    // The small lettering is re-cut on every second frame of the 12 fps clock: the word shivers
    // (line boil, STYLE.md §2.5) while the card itself holds dead still.
    update(c) {
      if (!showing || !c.clock.stepped) return;
      const b = Math.floor(c.clock.frame / 2);
      if (b === boilN) return;
      boilN = b;
      showing.signs();
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
