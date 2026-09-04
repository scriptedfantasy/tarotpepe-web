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
import { fit, starRule, border, manicule, cardRow, doorAjar, marquee, marqueeFit, marqueeSize, zigzag, bracket } from './titles-draw.js';
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
    #titles .card .stack { position: absolute; left: var(--gut); right: var(--gut); top: 11.6vh; bottom: 14.6vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    #titles canvas { display: block; margin-left: auto; margin-right: auto; }
    #titles canvas.marquee { margin: 0.7vh auto 0.3vh auto; }
    #titles canvas.bracket { margin: 0 auto 0.4vh auto; }
    #titles canvas.rule { margin: 1.1vh auto; }
    #titles .corners { position: absolute; left: var(--gut); right: var(--gut); top: 8.2vh; display: flex; align-items: flex-start; justify-content: space-between; }
    #titles .corners.stacked { flex-direction: column; align-items: center; gap: 0.5vh; }
    #titles .foot { position: absolute; left: var(--gut); right: var(--gut); bottom: 6.4vh; }
    #titles .mark { display: flex; flex-direction: column; align-items: center; margin-top: 1.4vh; }
  `;
  document.head.appendChild(style);

  let showing = null; // the card currently up: { kind, draw(), signs() }
  let last = null; // how to set the card up again when the frame changes shape
  let boilN = -1; // which pair of frames the small lettering was last cut on
  bars.innerHTML = ''; // nothing is barred: the picture and the cards are the same shape

  const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const vh = (n) => Math.round((ctx.size.h * n) / 100);

  // ---- the measure ---------------------------------------------------------------------------
  // The card is a printed page, and a page has a measure: the column of paper inside the printed
  // border and clear of the zig-zag spine. NOTHING is laid out against the frame's width — every
  // rule, ornament and line of lettering is cut to `G.measure`, so a card set for a cinema screen
  // and a card set for a phone held upright are the same card at two sizes, not one card with its
  // edges sawn off. The border itself comes off the NARROW axis, so a portrait frame gets a
  // portrait's margin instead of a landscape's (which was wider than the type it framed).
  const MIN_CAP = 13; // the type floor: no letter on these cards is cut shorter than this
  let G = { w: 0, h: 0, inset: 0, band: 0, gut: 0, measure: 0, stacked: false };
  function gauge() {
    const w = ctx.size.w, h = ctx.size.h;
    const short = Math.min(w, h);
    const inset = Math.round(short * 0.045); // the printed border
    const band = Math.round(w * 0.03); // the zig-zag spine
    const air = Math.max(12, Math.round(short * 0.028)); // paper between the spine and the type
    const gut = inset + 12 + band + air;
    G = { w, h, inset, band, gut, measure: Math.max(140, w - gut * 2), stacked: w < 600 };
    return G;
  }
  // A cap height asked for in vh, floored: on a small frame the card gets smaller, its lettering
  // does not go under the floor — it wraps instead.
  const typeCap = (n) => Math.max(MIN_CAP, vh(n));
  // An ornament's width: the size the card wants, cut back to the measure it is printed in.
  const orn = (want, frac = 1) => Math.max(24, Math.round(Math.min(want, G.measure * frac)));
  gauge();

  // ---- the small hand ---------------------------------------------------------------------
  // One line of sign caps, cut on its own canvas. `runs` are set on a single baseline, so a line
  // can change weight or size inside itself (the byline's "by", the credits' role and name).
  const RUN = (t, cap, track = 0.24, extra = {}) => ({ t, cap, track, ...extra });

  const measureRuns = (rs, gap) =>
    rs.reduce((a, r) => a + signWidth(r.t, { capH: r.cap, tracking: r.track }), 0) +
    gap * Math.max(...rs.map((r) => r.cap)) * (rs.length - 1);

  const oneSign = (rs, gap, seed, cls, style) => {
    const capM = Math.max(...rs.map((r) => r.cap));
    const w = Math.ceil(measureRuns(rs, gap)) + 8;
    const h = Math.ceil(capM * (1 + SIGN_ASCENT + SIGN_DESCENT));
    return `<canvas class="sign ${cls}" data-draw="sign" data-w="${w}" data-h="${h}" data-cap="${capM}" data-gap="${gap}" data-seed="${seed}" data-runs="${attr(JSON.stringify(rs))}" style="${style}"></canvas>`;
  };

  // Where a signwriter breaks a line he cannot fit: at the printed separator if there is one (and
  // the separator goes away with the line end, the way it does on a shopfront), else between two
  // words, balanced so no line is a runt.
  const SEPS = [
    [' · ', ''],
    [' — ', ''],
    ['; ', ';'],
    [', ', ','],
  ];
  function breakLine(text, capH, tracking, maxW) {
    const W = (t, c = capH) => signWidth(t, { capH: c, tracking });
    const words = text.split(/\s+/).filter(Boolean);
    const start = Math.min(4, Math.max(2, Math.ceil(W(text) / maxW)));
    // As few lines as the board allows, and the fewest lines wins even if the cut has to come
    // down a little for it — two lines a shade smaller beat three lines at full size.
    for (let n = Math.min(2, start); n <= 4; n++) {
      let lines = null;
      if (n === 2) {
        for (const [sep, keep] of SEPS) {
          let best = -1;
          for (let i = text.indexOf(sep); i >= 0; i = text.indexOf(sep, i + 1)) {
            if (best < 0 || Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2)) best = i;
          }
          if (best < 0) continue;
          const a = text.slice(0, best) + keep, b = text.slice(best + sep.length);
          const wa = W(a), wb = W(b);
          if (Math.min(wa, wb) / Math.max(wa, wb) < 0.5) continue; // a runt half is not a break
          if (Math.max(wa, wb) <= maxW) return { lines: [a, b], capH };
          const fits = capH * (maxW / Math.max(wa, wb));
          if (fits >= MIN_CAP) return { lines: [a, b], capH: Math.floor(fits * 100) / 100 };
        }
      }
      if (!lines) {
        const target = W(text) / n;
        const acc = [];
        let cur = [];
        for (const word of words) {
          if (cur.length && acc.length < n - 1 && W([...cur, word].join(' ')) > target * 1.06) {
            acc.push(cur.join(' '));
            cur = [word];
          } else cur.push(word);
        }
        acc.push(cur.join(' '));
        lines = acc;
      }
      const widest = Math.max(...lines.map((l) => W(l)));
      if (widest <= maxW) return { lines, capH };
      const need = capH * (maxW / widest);
      if (need >= MIN_CAP) return { lines, capH: Math.floor(need * 100) / 100 };
    }
    const half = Math.ceil(words.length / 2);
    return { lines: words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [text], capH: MIN_CAP };
  }

  // One line of sign caps, cut on its own canvas and CUT TO THE MEASURE. `runs` are set on a
  // single baseline, so a line can change weight or size inside itself (the byline's "by", the
  // credits' role and name). Too wide for the measure, in this order: the letters are closed up a
  // little; then the cap comes down, but never under the floor; then the line is broken, and the
  // broken lines are set at one size, centred, as a signwriter sets a two-line board.
  function signLine(runs, { cls = '', style = '', gap = 0.55, seed = 11, max = null } = {}) {
    const rs = (Array.isArray(runs) ? runs : [runs]).map((r) => ({ ...r }));
    const maxW = Math.max(60, max ?? G.measure);
    if (measureRuns(rs, gap) <= maxW) return oneSign(rs, gap, seed, cls, style);

    // 1. close the letters up (a hand-cut line tightens before it shrinks)
    const tight = rs.map((r) => ({ ...r, track: Math.max(0.11, r.track * 0.6) }));
    if (measureRuns(tight, gap) <= maxW) return oneSign(tight, gap, seed, cls, style);

    // 2. cut the whole line smaller, together, down to the floor
    const k = maxW / measureRuns(tight, gap);
    const capMin = Math.min(...tight.map((r) => r.cap));
    if (capMin * k >= MIN_CAP) {
      const small = tight.map((r) => ({ ...r, cap: Math.floor(r.cap * k * 100) / 100 }));
      return oneSign(small, gap, seed, cls, style);
    }
    // 3. break it. Only a single run is ever broken — a mixed-weight line (a byline) is short.
    if (rs.length > 1) {
      const floored = tight.map((r) => ({ ...r, cap: Math.max(MIN_CAP, r.cap * k) }));
      return oneSign(floored, gap, seed, cls, style);
    }
    const r = tight[0];
    const { lines, capH } = breakLine(r.t, r.cap, r.track, maxW);
    const lead = Math.round(capH * 0.04); // the set leading, closed up a hair — not a paragraph
    return lines
      .map((t, i) =>
        oneSign([{ ...r, t, cap: capH }], gap, seed + i * 7, cls, `${style};${i ? `margin-top:-${lead}px` : ''}`),
      )
      .join('');
  }

  // ---- the card ---------------------------------------------------------------------------
  function show(kind, { bg, fg, html, frame = null, corner = null, foot = null }) {
    root.innerHTML = '';
    const card = document.createElement('div');
    card.className = `card ${kind}`;
    card.style.setProperty('--bg', bg);
    card.style.setProperty('--fg', fg);
    card.style.setProperty('--gut', `${G.gut}px`);
    card.innerHTML =
      `<canvas class="frame"></canvas>` +
      (corner
        ? `<div class="corners${G.stacked ? ' stacked' : ''}"><div class="corner tl">${corner[0]}</div><div class="corner tr">${corner[1]}</div></div>`
        : '') +
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
      border(g, w, h, G.inset, { color: fg, seed: 9 });
      if (frame) frame(g, w, h);
      card.querySelectorAll('canvas[data-draw]').forEach(drawOne);
    };
    draw();

    // The column between the issue line and the footer, measured off what those two actually
    // occupy — on a phone the issue line stacks into two rows and the column starts under them,
    // so nothing is ever set on top of anything else. If the column is still too tall for the
    // paper (a long sign-off on a short frame), the whole block comes down as one, from its
    // centre, which keeps the card symmetrical.
    const stack = card.querySelector('.stack');
    const cornersEl = card.querySelector('.corners');
    const footEl = card.querySelector('.foot');
    const airV = Math.round(ctx.size.h * 0.022);
    if (cornersEl) stack.style.top = `${cornersEl.offsetTop + cornersEl.offsetHeight + airV}px`;
    if (footEl) stack.style.bottom = `${ctx.size.h - footEl.offsetTop + airV}px`;
    const kids = [...stack.children];
    const marginsOf = (el) => {
      const cs = getComputedStyle(el);
      return (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
    };
    const heightOf = () => kids.reduce((a, el) => a + el.offsetHeight + marginsOf(el), 0);
    const box = stack.clientHeight;
    let content = heightOf();
    if (box > 0 && content > box) {
      // Too tall for the paper: the air between the lines closes up FIRST — a compositor tightens
      // the leading before he re-cuts the type — and only what is left over is taken as a scale.
      const air = kids.reduce((a, el) => a + marginsOf(el), 0);
      if (air > 0) {
        const f = Math.max(0.15, (air - (content - box)) / air);
        for (const el of kids) {
          const cs = getComputedStyle(el);
          el.style.marginTop = `${(parseFloat(cs.marginTop) || 0) * f}px`;
          el.style.marginBottom = `${(parseFloat(cs.marginBottom) || 0) * f}px`;
        }
        content = heightOf();
      }
    }
    if (box > 0 && content > box) {
      // ... and a scale never goes far enough to take a letter under the type floor: a card a
      // hair tall is better than a card nobody can read on a phone.
      const caps = [...stack.querySelectorAll('canvas[data-cap]')].map((c) => +c.dataset.cap).filter((n) => n > 0);
      const floor = caps.length ? Math.min(1, MIN_CAP / Math.min(...caps)) : 0.8;
      const k = Math.max(floor, box / content);
      stack.style.transform = `scale(${k.toFixed(4)})`;
    }
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
  function headline(word, { capVh, frac, ink, bulb, rail = '', lines = 2 }) {
    const cut = (ms, text) =>
      `<canvas class="marquee" data-draw="marquee" data-w="${ms.w}" data-h="${ms.h}" data-cap="${ms.capH}" data-text="${attr(text)}" data-ink="${ink}" data-bulb="${bulb}" data-rail="${rail}"></canvas>`;
    // How much of the frame a headline is allowed: on a wide card it holds itself in (a title with
    // air either side), on a narrow one it opens out to the whole measure, because a sign on a
    // narrow board is cut to the board.
    const narrow = Math.max(0, Math.min(1, (1.2 - ctx.size.w / ctx.size.h) / 1.2));
    const maxW = Math.min(ctx.size.w * (frac + (1 - frac) * narrow), G.measure);
    const want = vh(capVh);
    const one = marqueeFit(word.toUpperCase(), want, maxW);
    const words = lines > 1 ? word.trim().split(/\s+/) : [word];
    // A narrow board does not get a small sign. The signwriter cuts the words one under the other
    // and fills the board with each of them — which is how the film's own masthead is set — and
    // only a title that would come out under two-thirds the size it was cut for is broken up.
    if (words.length < 2 || one.capH >= want * 0.62) return cut(one, word.toUpperCase());
    // One cap height for every line of the title — the longest word sets it and the rest are
    // centred under it, so the two lines read as one name cut by one hand, not as two signs.
    const capH = Math.min(...words.map((w) => marqueeFit(w.toUpperCase(), Math.round(want * 1.12), maxW).capH));
    return words.map((w) => cut(marqueeSize(w.toUpperCase(), capH), w.toUpperCase())).join('');
  }

  // The zig-zag spine down the left edge — the cover's stripe. Every card carries it.
  const spine = (colors, ground) => (g, w, h) => {
    const i = G.inset + 7;
    zigzag(g, i + 5, i + 5, h - i - 5, G.band, { colors, ground, ink: INK, seed: 17 });
  };

  // The furniture every card carries, cut small: the issue line, the admission, the footer.
  const CAP = { corner: () => typeCap(2.05), foot: () => typeCap(2.1), kick: () => typeCap(2.4), gloss: () => typeCap(2.2), small: () => typeCap(2.0) };
  // The issue line and the admission share the top of the card side by side — unless the frame is
  // narrow, when they stack, and each gets the whole measure.
  const cornerMax = () => (G.stacked ? G.measure : (G.measure - G.measure * 0.06) / 2);

  const api = {
    CHAPTERS,
    title({ kicker = 'A READING, IN MINIATURE', title = 'Tarot Pepe', sub = 'IN THREE CARDS' } = {}) {
      gauge();
      last = () => api.title({ kicker, title, sub });
      const c = CAP.corner(), cm = cornerMax();
      const vig = orn(vh(56), 0.88);
      return show('title', {
        bg: MUSTARD,
        fg: INK,
        corner: [
          signLine(RUN('SÉRIE I — N° 1', c, 0.26), { seed: 21, max: cm }),
          signLine(RUN('ADMISSION: ONE QUESTION', c, 0.26), { seed: 22, max: cm }),
        ],
        foot: signLine(RUN('THE PARLOUR IS OPEN · PLEASE COME IN', CAP.foot(), 0.3), { seed: 23 }),
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          `<canvas class="bracket" data-draw="bracket" data-w="${orn(vh(34), 0.86)}" data-h="${vh(2.2)}"></canvas>` +
          signLine(RUN(kicker, CAP.kick(), 0.44), { seed: 24 }) +
          rule(orn(vh(30), 0.8), 18, 5) +
          headline(title, { capVh: 14.4, frac: 0.78, ink: INK, bulb: BULB.onMustard }) +
          rule(orn(vh(30), 0.8), 18, 6) +
          signLine(RUN(sub, typeCap(2.95), 0.3, { pen: 3.4 }), { seed: 25, style: 'margin-top:0.4vh' }) +
          `<div class="mark"><canvas data-draw="vignette" data-w="${vig}" data-h="${Math.round((vig * 240) / 560)}"></canvas>` +
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
      gauge();
      last = () => api.chapter(n, name);
      const c = CAP.corner(), cm = cornerMax();
      const man = orn(vh(18), 0.4), row = orn(vh(38), 0.8);
      return show('chapter', {
        bg: ch.bg,
        fg: ch.fg,
        corner: [
          signLine(RUN('SÉRIE I — N° 1', c, 0.26), { seed: 31, max: cm }),
          signLine(RUN(ch.pp, c, 0.26), { seed: 32, max: cm }),
        ],
        foot: signLine(RUN('SEVENTY-EIGHT CARDS · THREE WILL BE ENOUGH', CAP.foot(), 0.3), { seed: 33 }),
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          `<canvas class="orn" data-draw="manicule" data-w="${man}" data-h="${Math.round(man / 2)}" style="margin:0 auto 2.2vh auto"></canvas>` +
          signLine(RUN(ch.kicker, CAP.kick(), 0.44), { seed: 34 }) +
          rule(orn(vh(28), 0.78), 18, 7) +
          headline(name ?? ch.name, { capVh: 14, frac: 0.76, ink: ch.fg, bulb: ch.bulb }) +
          rule(orn(vh(28), 0.78), 18, 8) +
          signLine(RUN(ch.sub, CAP.gloss(), 0.17), { seed: 35, style: 'margin-top:0.4vh' }) +
          signLine([RUN('BY', CAP.small(), 0.2, { alpha: 0.82 }), RUN(ch.by, typeCap(2.35), 0.3, { pen: 2.8 })], { seed: 36, gap: 0.7, style: 'margin-top:1.2vh' }) +
          `<canvas class="orn" data-draw="cards" data-w="${row}" data-h="${Math.round((row * 13) / 38)}" style="margin-top:3.0vh"></canvas>`,
      });
    },
    closing() {
      gauge();
      last = () => api.closing();
      const c = CAP.corner(), cm = cornerMax();
      // The door is the tallest thing on this card, so it is measured against the column it
      // stands in, not against the frame — a short card gets a short door.
      const doorH = Math.min(vh(15.5), Math.round(ctx.size.h * (G.stacked ? 0.6 : 0.74) * 0.22));
      const door = Math.min(orn(vh(9.6), 0.28), Math.round((doorH * 9.6) / 15.5));
      return show('closing', {
        bg: INK,
        fg: CREAM,
        corner: [
          signLine(RUN('SÉRIE I — N° 1', c, 0.26), { seed: 41, max: cm }),
          signLine(RUN('FIN DE LA SÉANCE', c, 0.26), { seed: 42, max: cm }),
        ],
        foot: signLine(RUN('KNOCK, AND THE PARLOUR OPENS AGAIN', CAP.foot(), 0.3), { seed: 43 }),
        frame: spine([MUSTARD, CREAM, STEEL], OXBLOOD),
        html:
          signLine(RUN('TAROT PEPE THANKS YOU FOR YOUR VISIT', CAP.gloss(), 0.3), { seed: 44 }) +
          rule(orn(vh(30), 0.8), 18, 5) +
          // The sign-off stays on ONE line at any size: it is a small sign at the foot of an
          // evening, not a masthead, and this card already carries the credits under it.
          headline('The End', { capVh: 11.4, frac: 0.54, ink: MUSTARD, bulb: BULB.onInk, rail: '#6b5423', lines: 1 }) +
          rule(orn(vh(30), 0.8), 18, 6) +
          signLine(RUN('CARDS READ BY', CAP.small(), 0.34, { alpha: 0.85 }), { seed: 45, style: 'margin-top:1.2vh' }) +
          signLine(RUN('TAROT PEPE', typeCap(2.9), 0.32, { pen: 3.4 }), { seed: 46, style: 'margin-top:0.2vh' }) +
          signLine(RUN('THE VISITOR PLAYED BY', CAP.small(), 0.34, { alpha: 0.85 }), { seed: 47, style: 'margin-top:1.6vh' }) +
          signLine(RUN('YOURSELF', typeCap(2.9), 0.32, { pen: 3.4 }), { seed: 48, style: 'margin-top:0.2vh' }) +
          signLine(RUN('THE CARDS WERE DEALT AT RANDOM; THE READING WAS NOT', CAP.gloss(), 0.17), { seed: 49, style: 'margin-top:2.2vh' }) +
          `<canvas class="orn" data-draw="door" data-w="${door}" data-h="${Math.round((door * 15.5) / 9.6)}" style="margin-top:2.2vh"></canvas>`,
      });
    },
    hide() {
      root.innerHTML = '';
      showing = null;
      last = null;
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
  // A new frame is a new sheet of paper: the card is SET again, not merely redrawn, so the
  // measure, the wraps and the stacking are the ones this window deserves.
  ctx.on('resize', () => (last ? last() : showing?.draw()));
  return api;
}
